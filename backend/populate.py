#!/usr/bin/env python3

import os
from datetime import datetime, timedelta
from uuid import uuid4

from dotenv import load_dotenv
from sqlmodel import Session, create_engine

from app.models import Event, LocationType, Profile, Review, Role, RSVP, RSVPStatus

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)

def populate_dummy_data():
    with Session(engine) as session:
        # Create dummy profiles
        profiles = [
            Profile(
                id="user1",
                display_name="Alice Johnson",
                bio="Tech enthusiast and community builder",
                role=Role.admin,
                created_at=datetime.utcnow() - timedelta(days=30)
            ),
            Profile(
                id="user2",
                display_name="Bob Smith",
                bio="Full-stack developer interested in AI",
                role=Role.organizer,
                created_at=datetime.utcnow() - timedelta(days=20)
            ),
            Profile(
                id="user3",
                display_name="Charlie Brown",
                bio="Designer and UX advocate",
                role=Role.attendee,
                created_at=datetime.utcnow() - timedelta(days=15)
            ),
            Profile(
                id="user4",
                display_name="Diana Prince",
                bio="Product manager with a passion for events",
                role=Role.organizer,
                created_at=datetime.utcnow() - timedelta(days=10)
            ),
            Profile(
                id="user5",
                display_name="Eve Wilson",
                bio="Data scientist exploring new technologies",
                role=Role.attendee,
                created_at=datetime.utcnow() - timedelta(days=5)
            ),
        ]

        for profile in profiles:
            session.add(profile)

        # Create dummy events
        now = datetime.utcnow()
        events = [
            Event(
                id=str(uuid4()),
                title="Intro to Machine Learning",
                description="A beginner-friendly workshop on machine learning concepts and practical applications.",
                location_type=LocationType.online,
                meeting_url="https://zoom.us/j/example1",
                starts_at=now + timedelta(days=7),
                ends_at=now + timedelta(days=7, hours=2),
                capacity=50,
                organizer_id="user2",
                created_at=now - timedelta(days=3)
            ),
            Event(
                id=str(uuid4()),
                title="React & TypeScript Hack Night",
                description="Join us for an evening of coding, collaboration, and building cool stuff with React and TypeScript.",
                location_type=LocationType.in_person,
                location_name="Tech Hub Downtown",
                address="123 Main St, City, State",
                starts_at=now + timedelta(days=14),
                ends_at=now + timedelta(days=14, hours=4),
                capacity=30,
                organizer_id="user4",
                created_at=now - timedelta(days=2)
            ),
            Event(
                id=str(uuid4()),
                title="Design Systems Workshop",
                description="Learn how to create and maintain scalable design systems for modern web applications.",
                location_type=LocationType.hybrid,
                location_name="Creative Space",
                address="456 Creative Ave, City, State",
                meeting_url="https://meet.google.com/abc-defg-hij",
                starts_at=now + timedelta(days=21),
                ends_at=now + timedelta(days=21, hours=3),
                capacity=25,
                organizer_id="user2",
                created_at=now - timedelta(days=1)
            ),
            Event(
                id=str(uuid4()),
                title="AI Ethics Discussion",
                description="An open forum to discuss the ethical implications of artificial intelligence in society.",
                location_type=LocationType.online,
                meeting_url="https://discord.gg/example",
                starts_at=now + timedelta(days=28),
                ends_at=now + timedelta(days=28, hours=1.5),
                capacity=100,
                organizer_id="user1",
                created_at=now
            ),
            Event(
                id=str(uuid4()),
                title="Past Event: Python Web Scraping",
                description="This event already happened. Learn about web scraping techniques with Python.",
                location_type=LocationType.online,
                meeting_url="https://zoom.us/j/example2",
                starts_at=now - timedelta(days=7),
                ends_at=now - timedelta(days=7, hours=2),
                capacity=40,
                organizer_id="user4",
                created_at=now - timedelta(days=14)
            ),
        ]

        for event in events:
            session.add(event)

        # Create dummy RSVPs
        rsvps = [
            RSVP(
                id=str(uuid4()),
                event_id=events[0].id,
                user_id="user1",
                status=RSVPStatus.going,
                created_at=now - timedelta(days=2)
            ),
            RSVP(
                id=str(uuid4()),
                event_id=events[0].id,
                user_id="user3",
                status=RSVPStatus.going,
                created_at=now - timedelta(days=1)
            ),
            RSVP(
                id=str(uuid4()),
                event_id=events[1].id,
                user_id="user2",
                status=RSVPStatus.going,
                created_at=now - timedelta(days=1)
            ),
            RSVP(
                id=str(uuid4()),
                event_id=events[1].id,
                user_id="user5",
                status=RSVPStatus.waitlist,
                created_at=now
            ),
            RSVP(
                id=str(uuid4()),
                event_id=events[2].id,
                user_id="user3",
                status=RSVPStatus.going,
                created_at=now - timedelta(hours=12)
            ),
            RSVP(
                id=str(uuid4()),
                event_id=events[4].id,  # Past event
                user_id="user1",
                status=RSVPStatus.checked_in,
                created_at=now - timedelta(days=10)
            ),
            RSVP(
                id=str(uuid4()),
                event_id=events[4].id,
                user_id="user2",
                status=RSVPStatus.checked_in,
                created_at=now - timedelta(days=9)
            ),
        ]

        for rsvp in rsvps:
            session.add(rsvp)

        # Create dummy reviews
        reviews = [
            Review(
                id=str(uuid4()),
                event_id=events[4].id,  # Past event
                user_id="user1",
                rating=5,
                comment="Excellent workshop! Learned a lot about web scraping.",
                created_at=now - timedelta(days=6)
            ),
            Review(
                id=str(uuid4()),
                event_id=events[4].id,
                user_id="user2",
                rating=4,
                comment="Great content, but could use more hands-on examples.",
                created_at=now - timedelta(days=5)
            ),
        ]

        for review in reviews:
            session.add(review)

        session.commit()
        print("Dummy data populated successfully!")

if __name__ == "__main__":
    populate_dummy_data()