import logging
import os
import urllib.parse
from typing import Optional

import jwt
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from sqlmodel import Session

from .db import get_session
from .models import Profile, Role

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

AUTH_DISABLED = os.getenv("AUTH_DISABLED", "false").lower() == "true"
SUPABASE_JWKS_URL = os.getenv("SUPABASE_JWKS_URL", "").strip()
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "").strip()
_jwks_client: Optional[PyJWKClient] = None

if SUPABASE_JWKS_URL:
    _jwks_client = PyJWKClient(SUPABASE_JWKS_URL, cache_keys=True)

ADMIN_EMAILS = {
    email.strip().lower()
    for email in os.getenv("ADMIN_EMAILS", "").split(",")
    if email.strip()
}
DEFAULT_ROLE = os.getenv("DEFAULT_ROLE", "attendee")

# DiceBear 9.x: deterministic fun avatars (lorelei = friendly illustrated)
AVATAR_BASE = "https://api.dicebear.com/9.x/lorelei/svg"


def _avatar_url_for_user(user_id: str) -> str:
    """Generate a deterministic DiceBear avatar URL for the user."""
    return f"{AVATAR_BASE}?seed={urllib.parse.quote(user_id, safe='')}"


def _ensure_profile(session: Session, user_id: str, email: Optional[str]) -> Profile:
    profile = session.get(Profile, user_id)
    if profile:
        logger.debug("Profile found for user %s", user_id)
        return profile

    logger.info("Creating new profile for user %s (email=%s)", user_id, email)

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

    avatar_url = _avatar_url_for_user(user_id)
    profile = Profile(id=user_id, display_name=display_name, role=role, avatar_url=avatar_url)
    session.add(profile)
    session.commit()
    session.refresh(profile)
    logger.info("Profile created for user %s with role %s", user_id, role.value)
    return profile


def _decode_jwt(token: str) -> dict:
    """Decode and verify Supabase JWT using JWKS (ES256) or legacy secret (HS256)."""
    if _jwks_client:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            options={"verify_aud": False},
        )
    if SUPABASE_JWT_SECRET:
        return jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    raise ValueError("Neither SUPABASE_JWKS_URL nor SUPABASE_JWT_SECRET is configured")


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

    if not _jwks_client and not SUPABASE_JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Set SUPABASE_JWKS_URL or SUPABASE_JWT_SECRET in .env",
        )

    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")

    token = credentials.credentials
    try:
        payload = _decode_jwt(token)
    except (jwt.PyJWTError, ValueError):
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

    if not _jwks_client and not SUPABASE_JWT_SECRET:
        return None

    if not credentials:
        return None

    token = credentials.credentials
    try:
        payload = _decode_jwt(token)
    except (jwt.PyJWTError, ValueError):
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    email = payload.get("email")
    return _ensure_profile(session, user_id, email)
