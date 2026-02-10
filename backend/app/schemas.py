from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel

from .models import LocationType, Role, RSVPStatus


class ProfileRead(SQLModel):
    id: str
    display_name: str
    bio: str
    avatar_url: Optional[str]
    location_zip: Optional[str]
    role: Role
    created_at: datetime


class ProfileUpdate(SQLModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    location_zip: Optional[str] = None
    role: Optional[Role] = None


class EventCreate(SQLModel):
    title: str
    description: str
    location_type: LocationType
    location_name: Optional[str] = None
    address: Optional[str] = None
    zip_code: Optional[str] = None
    meeting_url: Optional[str] = None
    starts_at: datetime
    ends_at: datetime
    capacity: int


class EventUpdate(SQLModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location_type: Optional[LocationType] = None
    location_name: Optional[str] = None
    address: Optional[str] = None
    zip_code: Optional[str] = None
    meeting_url: Optional[str] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    capacity: Optional[int] = None


class EventRead(SQLModel):
    id: str
    title: str
    description: str
    location_type: LocationType
    location_name: Optional[str]
    address: Optional[str]
    zip_code: Optional[str]
    meeting_url: Optional[str]
    starts_at: datetime
    ends_at: datetime
    capacity: int
    organizer_id: str
    created_at: datetime
    going_count: int
    waitlist_count: int


class RSVPRead(SQLModel):
    id: str
    event_id: str
    user_id: str
    status: RSVPStatus
    created_at: datetime


class ReviewCreate(SQLModel):
    rating: int
    comment: Optional[str] = ""


class ReviewRead(SQLModel):
    id: str
    event_id: str
    user_id: str
    rating: int
    comment: str
    created_at: datetime


class RoleUpdate(SQLModel):
    user_id: str
    role: Role


class ProjectCreate(SQLModel):
    link: str
    title: Optional[str] = None
    description: Optional[str] = None


class ProjectRead(SQLModel):
    id: str
    event_id: str
    user_id: str
    link: str
    title: Optional[str]
    description: Optional[str]
    created_at: datetime
    display_name: Optional[str] = None


class RSVPWithEventRead(SQLModel):
    """RSVP with embedded event for profile/my-events listing."""

    rsvp_id: str
    rsvp_status: RSVPStatus
    rsvp_created_at: datetime
    event: EventRead
