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
    role: Role
    created_at: datetime


class ProfileUpdate(SQLModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Optional[Role] = None


class EventCreate(SQLModel):
    title: str
    description: str
    location_type: LocationType
    location_name: Optional[str] = None
    address: Optional[str] = None
    meeting_url: Optional[str] = None
    starts_at: datetime
    ends_at: datetime
    capacity: int


class EventRead(SQLModel):
    id: str
    title: str
    description: str
    location_type: LocationType
    location_name: Optional[str]
    address: Optional[str]
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
