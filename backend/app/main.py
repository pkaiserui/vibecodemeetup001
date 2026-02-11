from __future__ import annotations

import json
import os
from collections import Counter
from datetime import datetime
from typing import Any, List, Optional

import requests
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import case
from sqlmodel import Session, func, select

from .auth import _avatar_url_for_user, get_current_user
from .db import get_session, init_db
from .geo import distance_km
from .models import Event, LocationType, Profile, Project, Review, Role, RSVP, RSVPStatus
from .schemas import (
    EventCreate,
    EventRead,
    EventUpdate,
    ProfileRead,
    ProfileUpdate,
    ProjectCreate,
    ProjectRead,
    ReviewCreate,
    ReviewRead,
    RoleUpdate,
    RSVPRead,
    RSVPWithEventRead,
    ToolCountRead,
)

app = FastAPI(title="Vibe Coding Meetup API", version="0.1.0")


@app.on_event("startup")
def on_startup() -> None:
    init_db()


def _get_origins() -> List[str]:
    import os

    origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    return [origin.strip() for origin in origins.split(",") if origin.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_origins(),
    allow_credentials=True,
    allow_methods=["*"] ,
    allow_headers=["*"] ,
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "time": datetime.utcnow().isoformat()}


@app.get("/config")
def get_config() -> dict[str, Any]:
    """Public config for the frontend (e.g. Google Places API key for address autocomplete)."""
    return {
        "googlePlacesApiKey": os.getenv("GOOGLE_PLACE_API_KEY") or None,
    }


@app.get("/location/from-ip")
def location_from_ip(
    request: Request,
    x_forwarded_for: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    """Get approximate location (zip) from client IP. Uses ip-api.com (no auth)."""
    client_ip = (
        x_forwarded_for.split(",")[0].strip() if x_forwarded_for else request.client.host
    )
    if client_ip in ("127.0.0.1", "::1", "localhost"):
        return {"zip": None, "error": "Cannot geolocate localhost"}
    try:
        r = requests.get(
            f"http://ip-api.com/json/{client_ip}?fields=zip,country,lat,lon,status",
            timeout=3,
        )
        data = r.json()
        if data.get("status") != "success":
            return {"zip": None, "error": "Geolocation failed"}
        zip_val = data.get("zip")
        if zip_val and isinstance(zip_val, str):
            zip_val = zip_val[:10]  # US zips can be 5 or 9
        return {"zip": zip_val, "country": data.get("country")}
    except Exception as e:
        return {"zip": None, "error": str(e)}


def _event_counts(session: Session, event_id: str) -> tuple[int, int]:
    going_statement = select(func.count()).where(
        RSVP.event_id == event_id,
        RSVP.status.in_([RSVPStatus.going, RSVPStatus.checked_in]),
    )
    waitlist_statement = select(func.count()).where(
        RSVP.event_id == event_id,
        RSVP.status == RSVPStatus.waitlist,
    )
    going_count = session.exec(going_statement).one()
    waitlist_count = session.exec(waitlist_statement).one()
    return int(going_count), int(waitlist_count)


def _event_to_read(session: Session, event: Event) -> EventRead:
    going_count, waitlist_count = _event_counts(session, event.id)
    organizer = session.get(Profile, event.organizer_id)
    organizer_display_name = organizer.display_name if organizer else None
    return EventRead(
        id=event.id,
        title=event.title,
        description=event.description,
        location_type=event.location_type,
        location_name=event.location_name,
        address=event.address,
        zip_code=event.zip_code,
        meeting_url=event.meeting_url,
        starts_at=event.starts_at,
        ends_at=event.ends_at,
        capacity=event.capacity,
        organizer_id=event.organizer_id,
        organizer_display_name=organizer_display_name,
        created_at=event.created_at,
        going_count=going_count,
        waitlist_count=waitlist_count,
    )


def _require_role(profile: Profile, allowed: list[Role]) -> None:
    if profile.role not in allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")


def _sort_events_near(events: list[Event], near_zip: str, session: Session) -> list[EventRead]:
    """Sort: virtual first, then by distance from near_zip, then by starts_at (soonest first)."""
    results: list[tuple[float, float, float, EventRead]] = []
    virtual_first = 0.0
    no_zip_penalty = 1e9
    for event in events:
        er = _event_to_read(session, event)
        if event.location_type == LocationType.online:
            primary, distance = virtual_first, 0.0
        elif event.zip_code:
            d = distance_km(near_zip, event.zip_code)
            primary, distance = 1.0, d if d is not None else no_zip_penalty
        else:
            primary, distance = 2.0, no_zip_penalty
        ts = event.starts_at.timestamp() if event.starts_at else 0.0
        results.append((primary, distance, ts, er))
    results.sort(key=lambda x: (x[0], x[1], x[2]))
    return [er for _, _, _, er in results]


@app.get("/events", response_model=List[EventRead])
def list_events(
    session: Session = Depends(get_session),
    q: Optional[str] = Query(default=None),
    location_type: Optional[LocationType] = Query(default=None),
    near: Optional[str] = Query(default=None, description="Zip code for distance sorting"),
) -> List[EventRead]:
    statement = select(Event)
    if q:
        like = f"%{q.lower()}%"
        statement = statement.where(
            func.lower(Event.title).like(like) | func.lower(Event.description).like(like)
        )
    if location_type:
        statement = statement.where(Event.location_type == location_type)
    # Future events first (soonest first), then past events
    statement = statement.order_by(
        case((Event.starts_at >= datetime.utcnow(), 0), else_=1),
        Event.starts_at,
    )

    events = list(session.exec(statement).all())

    if near and near.strip():
        near_zip = str(near).strip()[:5]
        if len(near_zip) >= 5:
            try:
                return _sort_events_near(events, near_zip, session)
            except Exception:
                # Fallback: distance sort failed (e.g. pgeocode on serverless); return default order
                pass

    return [_event_to_read(session, event) for event in events]


@app.post("/events", response_model=EventRead)
def create_event(
    payload: EventCreate,
    session: Session = Depends(get_session),
    profile: Profile = Depends(get_current_user),
) -> EventRead:
    if payload.capacity < 1:
        raise HTTPException(status_code=400, detail="Capacity must be at least 1")
    if payload.ends_at <= payload.starts_at:
        raise HTTPException(status_code=400, detail="End time must be after start time")

    event = Event(
        title=payload.title,
        description=payload.description,
        location_type=payload.location_type,
        location_name=payload.location_name,
        address=payload.address,
        zip_code=payload.zip_code.strip() if payload.zip_code else None,
        meeting_url=payload.meeting_url,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        capacity=payload.capacity,
        organizer_id=profile.id,
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    return _event_to_read(session, event)


@app.get("/events/{event_id}", response_model=EventRead)
def get_event(event_id: str, session: Session = Depends(get_session)) -> EventRead:
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return _event_to_read(session, event)


@app.put("/events/{event_id}", response_model=EventRead)
def update_event(
    event_id: str,
    payload: EventUpdate,
    session: Session = Depends(get_session),
    profile: Profile = Depends(get_current_user),
) -> EventRead:
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != profile.id:
        raise HTTPException(status_code=403, detail="Only the host can edit this event")
    if payload.title is not None:
        event.title = payload.title
    if payload.description is not None:
        event.description = payload.description
    if payload.location_type is not None:
        event.location_type = payload.location_type
    if payload.location_name is not None:
        event.location_name = payload.location_name
    if payload.address is not None:
        event.address = payload.address
    if payload.zip_code is not None:
        event.zip_code = payload.zip_code.strip() or None
    if payload.meeting_url is not None:
        event.meeting_url = payload.meeting_url
    if payload.starts_at is not None:
        event.starts_at = payload.starts_at
    if payload.ends_at is not None:
        event.ends_at = payload.ends_at
    if payload.capacity is not None:
        if payload.capacity < 1:
            raise HTTPException(status_code=400, detail="Capacity must be at least 1")
        event.capacity = payload.capacity
    starts = payload.starts_at if payload.starts_at is not None else event.starts_at
    ends = payload.ends_at if payload.ends_at is not None else event.ends_at
    if ends <= starts:
        raise HTTPException(status_code=400, detail="End time must be after start time")
    session.add(event)
    session.commit()
    session.refresh(event)
    return _event_to_read(session, event)


@app.get("/events/{event_id}/rsvp", response_model=RSVPRead)
def get_rsvp(
    event_id: str,
    session: Session = Depends(get_session),
    profile: Profile = Depends(get_current_user),
) -> RSVPRead:
    statement = select(RSVP).where(RSVP.event_id == event_id, RSVP.user_id == profile.id)
    rsvp = session.exec(statement).first()
    if not rsvp or rsvp.status == RSVPStatus.canceled:
        raise HTTPException(status_code=404, detail="RSVP not found")
    return RSVPRead(
        id=rsvp.id,
        event_id=rsvp.event_id,
        user_id=rsvp.user_id,
        status=rsvp.status,
        created_at=rsvp.created_at,
    )


@app.post("/events/{event_id}/rsvp", response_model=RSVPRead)
def create_rsvp(
    event_id: str,
    session: Session = Depends(get_session),
    profile: Profile = Depends(get_current_user),
) -> RSVPRead:
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    existing = session.exec(
        select(RSVP).where(RSVP.event_id == event_id, RSVP.user_id == profile.id)
    ).first()
    if existing and existing.status != RSVPStatus.canceled:
        return RSVPRead(
            id=existing.id,
            event_id=existing.event_id,
            user_id=existing.user_id,
            status=existing.status,
            created_at=existing.created_at,
        )
    if existing and existing.status == RSVPStatus.canceled:
        session.delete(existing)
        session.commit()

    going_count, _ = _event_counts(session, event_id)
    status_value = RSVPStatus.going if going_count < event.capacity else RSVPStatus.waitlist

    rsvp = RSVP(event_id=event_id, user_id=profile.id, status=status_value)
    session.add(rsvp)
    session.commit()
    session.refresh(rsvp)

    return RSVPRead(
        id=rsvp.id,
        event_id=rsvp.event_id,
        user_id=rsvp.user_id,
        status=rsvp.status,
        created_at=rsvp.created_at,
    )


@app.delete("/events/{event_id}/rsvp", response_model=RSVPRead)
def cancel_rsvp(
    event_id: str,
    session: Session = Depends(get_session),
    profile: Profile = Depends(get_current_user),
) -> RSVPRead:
    statement = select(RSVP).where(RSVP.event_id == event_id, RSVP.user_id == profile.id)
    rsvp = session.exec(statement).first()
    if not rsvp or rsvp.status == RSVPStatus.canceled:
        raise HTTPException(status_code=404, detail="RSVP not found")

    was_going = rsvp.status in [RSVPStatus.going, RSVPStatus.checked_in]
    rsvp.status = RSVPStatus.canceled
    session.add(rsvp)
    session.commit()

    if was_going:
        next_waitlist = session.exec(
            select(RSVP)
            .where(RSVP.event_id == event_id, RSVP.status == RSVPStatus.waitlist)
            .order_by(RSVP.created_at)
        ).first()
        if next_waitlist:
            next_waitlist.status = RSVPStatus.going
            session.add(next_waitlist)
            session.commit()

    return RSVPRead(
        id=rsvp.id,
        event_id=rsvp.event_id,
        user_id=rsvp.user_id,
        status=rsvp.status,
        created_at=rsvp.created_at,
    )


@app.post("/events/{event_id}/checkin", response_model=RSVPRead)
def check_in(
    event_id: str,
    session: Session = Depends(get_session),
    profile: Profile = Depends(get_current_user),
    user_id: Optional[str] = Query(default=None),
) -> RSVPRead:
    target_user_id = profile.id
    if user_id and profile.role in [Role.organizer, Role.admin]:
        target_user_id = user_id

    rsvp = session.exec(
        select(RSVP).where(RSVP.event_id == event_id, RSVP.user_id == target_user_id)
    ).first()
    if not rsvp or rsvp.status not in [RSVPStatus.going, RSVPStatus.checked_in]:
        raise HTTPException(status_code=404, detail="RSVP not found")

    rsvp.status = RSVPStatus.checked_in
    session.add(rsvp)
    session.commit()

    return RSVPRead(
        id=rsvp.id,
        event_id=rsvp.event_id,
        user_id=rsvp.user_id,
        status=rsvp.status,
        created_at=rsvp.created_at,
    )


@app.get("/events/{event_id}/reviews", response_model=List[ReviewRead])
def list_reviews(event_id: str, session: Session = Depends(get_session)) -> List[ReviewRead]:
    statement = select(Review).where(Review.event_id == event_id).order_by(Review.created_at.desc())
    reviews = session.exec(statement).all()
    return [
        ReviewRead(
            id=review.id,
            event_id=review.event_id,
            user_id=review.user_id,
            rating=review.rating,
            comment=review.comment,
            created_at=review.created_at,
        )
        for review in reviews
    ]


@app.post("/events/{event_id}/reviews", response_model=ReviewRead)
def create_review(
    event_id: str,
    payload: ReviewCreate,
    session: Session = Depends(get_session),
    profile: Profile = Depends(get_current_user),
) -> ReviewRead:
    if payload.rating < 1 or payload.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    rsvp = session.exec(
        select(RSVP).where(
            RSVP.event_id == event_id,
            RSVP.user_id == profile.id,
            RSVP.status.in_([RSVPStatus.going, RSVPStatus.checked_in]),
        )
    ).first()
    if not rsvp:
        raise HTTPException(status_code=403, detail="You must RSVP before reviewing")

    existing = session.exec(
        select(Review).where(Review.event_id == event_id, Review.user_id == profile.id)
    ).first()
    if existing:
        existing.rating = payload.rating
        existing.comment = payload.comment or ""
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return ReviewRead(
            id=existing.id,
            event_id=existing.event_id,
            user_id=existing.user_id,
            rating=existing.rating,
            comment=existing.comment,
            created_at=existing.created_at,
        )

    review = Review(
        event_id=event_id,
        user_id=profile.id,
        rating=payload.rating,
        comment=payload.comment or "",
    )
    session.add(review)
    session.commit()
    session.refresh(review)

    return ReviewRead(
        id=review.id,
        event_id=review.event_id,
        user_id=review.user_id,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at,
    )


def _can_add_project(session: Session, event_id: str, profile: Profile) -> bool:
    rsvp = session.exec(
        select(RSVP).where(
            RSVP.event_id == event_id,
            RSVP.user_id == profile.id,
            RSVP.status == RSVPStatus.checked_in,
        )
    ).first()
    return rsvp is not None


@app.get("/events/{event_id}/projects", response_model=List[ProjectRead])
def list_projects(event_id: str, session: Session = Depends(get_session)) -> List[ProjectRead]:
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    statement = (
        select(Project, Profile)
        .join(Profile, Project.user_id == Profile.id)
        .where(Project.event_id == event_id)
        .order_by(Project.created_at)
    )
    rows = session.exec(statement).all()
    result = []
    for p, creator in rows:
        tools_used = None
        if p.tools_used:
            try:
                tools_used = json.loads(p.tools_used)
            except (json.JSONDecodeError, TypeError):
                pass
        result.append(
            ProjectRead(
                id=p.id,
                event_id=p.event_id,
                user_id=p.user_id,
                link=p.link,
                title=p.title,
                description=p.description,
                tools_used=tools_used,
                created_at=p.created_at,
                display_name=creator.display_name,
            )
        )
    return result


@app.get("/events/{event_id}/tool-counts", response_model=List[ToolCountRead])
def list_event_tool_counts(event_id: str, session: Session = Depends(get_session)) -> List[ToolCountRead]:
    """Aggregated counts of tools used across all projects for this event."""
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    statement = select(Project.tools_used).where(Project.event_id == event_id)
    rows = session.exec(statement).all()
    counter: Counter[str] = Counter()
    for (tools_used,) in rows:
        if not tools_used:
            continue
        try:
            names = json.loads(tools_used)
            if isinstance(names, list):
                for t in names:
                    if isinstance(t, str) and t.strip():
                        counter[t.strip()] += 1
        except (json.JSONDecodeError, TypeError):
            pass
    return [ToolCountRead(name=name, count=count) for name, count in counter.most_common()]


@app.post("/events/{event_id}/projects", response_model=ProjectRead)
def create_project(
    event_id: str,
    payload: ProjectCreate,
    session: Session = Depends(get_session),
    profile: Profile = Depends(get_current_user),
) -> ProjectRead:
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if not payload.link or not payload.link.strip():
        raise HTTPException(status_code=400, detail="Link is required")
    if not _can_add_project(session, event_id, profile):
        raise HTTPException(
            status_code=403,
            detail="You must be checked in to add a Vibe Coded project",
        )
    tools_used_json = None
    if payload.tools_used:
        names = [str(t).strip() for t in payload.tools_used if t and str(t).strip()]
        if names:
            tools_used_json = json.dumps(names)

    project = Project(
        event_id=event_id,
        user_id=profile.id,
        link=payload.link.strip(),
        title=payload.title.strip() if payload.title else None,
        description=payload.description.strip() if payload.description else None,
        tools_used=tools_used_json,
    )
    session.add(project)
    session.commit()
    session.refresh(project)

    tools_used = None
    if project.tools_used:
        try:
            tools_used = json.loads(project.tools_used)
        except (json.JSONDecodeError, TypeError):
            pass
    return ProjectRead(
        id=project.id,
        event_id=project.event_id,
        user_id=project.user_id,
        link=project.link,
        title=project.title,
        description=project.description,
        tools_used=tools_used,
        created_at=project.created_at,
    )


@app.get("/profiles/me/rsvps", response_model=List[RSVPWithEventRead])
def get_my_rsvps(
    session: Session = Depends(get_session),
    profile: Profile = Depends(get_current_user),
) -> List[RSVPWithEventRead]:
    """Return current user's RSVPs (non-canceled) with full event details."""
    statement = (
        select(RSVP, Event)
        .join(Event, RSVP.event_id == Event.id)
        .where(
            RSVP.user_id == profile.id,
            RSVP.status != RSVPStatus.canceled,
        )
        .order_by(Event.starts_at.desc())
    )
    rows = session.exec(statement).all()
    result = []
    for rsvp, event in rows:
        event_read = _event_to_read(session, event)
        result.append(
            RSVPWithEventRead(
                rsvp_id=rsvp.id,
                rsvp_status=rsvp.status,
                rsvp_created_at=rsvp.created_at,
                event=event_read,
            )
        )
    return result


@app.post("/profiles/ensure", response_model=ProfileRead)
def ensure_profile(profile: Profile = Depends(get_current_user)) -> ProfileRead:
    """Ensure a profile row exists for the authenticated user. Creates one if missing."""
    return ProfileRead(
        id=profile.id,
        display_name=profile.display_name,
        bio=profile.bio,
        avatar_url=profile.avatar_url,
        location_zip=profile.location_zip,
        role=profile.role,
        created_at=profile.created_at,
    )


@app.get("/profiles/me", response_model=ProfileRead)
def get_profile(
    session: Session = Depends(get_session),
    profile: Profile = Depends(get_current_user),
) -> ProfileRead:
    # Lazy-fill avatar for existing profiles that never had one
    if not profile.avatar_url:
        profile.avatar_url = _avatar_url_for_user(profile.id)
        session.add(profile)
        session.commit()
        session.refresh(profile)
    return ProfileRead(
        id=profile.id,
        display_name=profile.display_name,
        bio=profile.bio,
        avatar_url=profile.avatar_url,
        location_zip=profile.location_zip,
        role=profile.role,
        created_at=profile.created_at,
    )


@app.put("/profiles/me", response_model=ProfileRead)
def update_profile(
    payload: ProfileUpdate,
    session: Session = Depends(get_session),
    profile: Profile = Depends(get_current_user),
) -> ProfileRead:
    if payload.display_name is not None:
        profile.display_name = payload.display_name
    if payload.bio is not None:
        profile.bio = payload.bio
    if payload.avatar_url is not None:
        profile.avatar_url = payload.avatar_url
    if payload.location_zip is not None:
        z = (payload.location_zip or "").strip()[:5]
        profile.location_zip = z if len(z) >= 5 else None
    if payload.role is not None:
        if profile.role != Role.admin:
            raise HTTPException(status_code=403, detail="Only admins can change roles")
        profile.role = payload.role

    session.add(profile)
    session.commit()
    session.refresh(profile)
    return ProfileRead(
        id=profile.id,
        display_name=profile.display_name,
        bio=profile.bio,
        avatar_url=profile.avatar_url,
        location_zip=profile.location_zip,
        role=profile.role,
        created_at=profile.created_at,
    )


@app.post("/admin/roles", response_model=ProfileRead)
def set_role(
    payload: RoleUpdate,
    session: Session = Depends(get_session),
    profile: Profile = Depends(get_current_user),
) -> ProfileRead:
    _require_role(profile, [Role.admin])

    target = session.get(Profile, payload.user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    target.role = payload.role
    session.add(target)
    session.commit()
    session.refresh(target)

    return ProfileRead(
        id=target.id,
        display_name=target.display_name,
        bio=target.bio,
        avatar_url=target.avatar_url,
        location_zip=target.location_zip,
        role=target.role,
        created_at=target.created_at,
    )
