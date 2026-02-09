from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import uuid4

from sqlmodel import Field, SQLModel


class Role(str, Enum):
    attendee = "attendee"
    organizer = "organizer"
    admin = "admin"


class LocationType(str, Enum):
    in_person = "in_person"
    online = "online"
    hybrid = "hybrid"


class RSVPStatus(str, Enum):
    going = "going"
    waitlist = "waitlist"
    canceled = "canceled"
    checked_in = "checked_in"


class Profile(SQLModel, table=True):
    id: str = Field(primary_key=True)
    display_name: str
    bio: str = ""
    avatar_url: Optional[str] = None
    role: Role = Role.attendee
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class Event(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    title: str
    description: str
    location_type: LocationType
    location_name: Optional[str] = None
    address: Optional[str] = None
    meeting_url: Optional[str] = None
    starts_at: datetime
    ends_at: datetime
    capacity: int
    organizer_id: str = Field(foreign_key="profile.id")
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class RSVP(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    event_id: str = Field(foreign_key="event.id")
    user_id: str = Field(foreign_key="profile.id")
    status: RSVPStatus
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class Review(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    event_id: str = Field(foreign_key="event.id")
    user_id: str = Field(foreign_key="profile.id")
    rating: int
    comment: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
