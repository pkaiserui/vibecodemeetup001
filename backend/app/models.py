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
    location_zip: Optional[str] = None  # Preferred zip for event discovery sorting
    role: Role = Role.attendee
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class Event(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    title: str
    description: str
    location_type: LocationType
    location_name: Optional[str] = None
    address: Optional[str] = None
    zip_code: Optional[str] = None  # For distance sorting (e.g. US 5-digit)
    meeting_url: Optional[str] = None
    starts_at: datetime = Field(index=True)  # index: ORDER BY starts_at in list queries
    ends_at: datetime
    capacity: int
    organizer_id: str = Field(foreign_key="profile.id", index=True)  # index: join/filter by organizer
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class RSVP(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    event_id: str = Field(foreign_key="event.id", index=True)    # index: count/filter by event
    user_id: str = Field(foreign_key="profile.id", index=True)   # index: lookup user RSVPs
    status: RSVPStatus
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class Review(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    event_id: str = Field(foreign_key="event.id", index=True)    # index: list reviews by event
    user_id: str = Field(foreign_key="profile.id", index=True)   # index: lookup user reviews
    rating: int
    comment: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class Project(SQLModel, table=True):
    """Vibe Coded project: link (GitHub/website) with optional title, description, and tools used."""

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    event_id: str = Field(foreign_key="event.id", index=True)    # index: list projects by event
    user_id: str = Field(foreign_key="profile.id", index=True)   # index: lookup user projects
    link: str
    title: Optional[str] = None
    description: Optional[str] = None
    tools_used: Optional[str] = None  # JSON array of tool names, e.g. ["Vercel", "Cursor"]
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
