from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, func, select

from .auth import get_current_user
from .db import get_session, init_db
from .models import Event, LocationType, Profile, Review, Role, RSVP, RSVPStatus
from .schemas import (
    EventCreate,
    EventRead,
    ProfileRead,
    ProfileUpdate,
    ReviewCreate,
    ReviewRead,
    RoleUpdate,
    RSVPRead,
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
    return EventRead(
        id=event.id,
        title=event.title,
        description=event.description,
        location_type=event.location_type,
        location_name=event.location_name,
        address=event.address,
        meeting_url=event.meeting_url,
        starts_at=event.starts_at,
        ends_at=event.ends_at,
        capacity=event.capacity,
        organizer_id=event.organizer_id,
        created_at=event.created_at,
        going_count=going_count,
        waitlist_count=waitlist_count,
    )


def _require_role(profile: Profile, allowed: list[Role]) -> None:
    if profile.role not in allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")


@app.get("/events", response_model=List[EventRead])
def list_events(
    session: Session = Depends(get_session),
    q: Optional[str] = Query(default=None),
    location_type: Optional[LocationType] = Query(default=None),
) -> List[EventRead]:
    statement = select(Event)
    if q:
        like = f"%{q.lower()}%"
        statement = statement.where(
            func.lower(Event.title).like(like) | func.lower(Event.description).like(like)
        )
    if location_type:
        statement = statement.where(Event.location_type == location_type)
    statement = statement.order_by(Event.starts_at)

    events = session.exec(statement).all()
    return [_event_to_read(session, event) for event in events]


@app.post("/events", response_model=EventRead)
def create_event(
    payload: EventCreate,
    session: Session = Depends(get_session),
    profile: Profile = Depends(get_current_user),
) -> EventRead:
    _require_role(profile, [Role.organizer, Role.admin])

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


@app.get("/profiles/me", response_model=ProfileRead)
def get_profile(profile: Profile = Depends(get_current_user)) -> ProfileRead:
    return ProfileRead(
        id=profile.id,
        display_name=profile.display_name,
        bio=profile.bio,
        avatar_url=profile.avatar_url,
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
        role=target.role,
        created_at=target.created_at,
    )
