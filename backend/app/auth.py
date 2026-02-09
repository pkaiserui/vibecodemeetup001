import os
from typing import Optional

import jwt
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from .db import get_session
from .models import Profile, Role

security = HTTPBearer(auto_error=False)

AUTH_DISABLED = os.getenv("AUTH_DISABLED", "false").lower() == "true"
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
ADMIN_EMAILS = {
    email.strip().lower()
    for email in os.getenv("ADMIN_EMAILS", "").split(",")
    if email.strip()
}
DEFAULT_ROLE = os.getenv("DEFAULT_ROLE", "attendee")


def _ensure_profile(session: Session, user_id: str, email: Optional[str]) -> Profile:
    profile = session.get(Profile, user_id)
    if profile:
        return profile

    display_name = "New Member"
    if email and "@" in email:
        display_name = email.split("@", 1)[0].replace(".", " ").title()

    role = Role.attendee
    if AUTH_DISABLED:
        try:
            role = Role(DEFAULT_ROLE)
        except ValueError:
            role = Role.attendee
    if email and email.lower() in ADMIN_EMAILS:
        role = Role.admin

    profile = Profile(id=user_id, display_name=display_name, role=role)
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile


def get_current_user(
    session: Session = Depends(get_session),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
    x_user_email: Optional[str] = Header(default=None, alias="X-User-Email"),
) -> Profile:
    if AUTH_DISABLED:
        user_id = x_user_id or "dev-user"
        email = x_user_email or "dev@local"
        return _ensure_profile(session, user_id, email)

    if not SUPABASE_JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_JWT_SECRET is not configured",
        )

    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")

    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    email = payload.get("email")
    return _ensure_profile(session, user_id, email)


def get_optional_user(
    session: Session = Depends(get_session),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[Profile]:
    if AUTH_DISABLED:
        return None

    if not SUPABASE_JWT_SECRET:
        return None

    if not credentials:
        return None

    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except jwt.PyJWTError:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    email = payload.get("email")
    return _ensure_profile(session, user_id, email)
