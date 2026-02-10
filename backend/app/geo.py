"""Zip code distance utilities using pgeocode (US data). Install: pip install pgeocode"""

from __future__ import annotations

import math
from typing import Optional

_nom = None


def _get_nom():
    global _nom
    if _nom is None:
        try:
            import pgeocode
            _nom = pgeocode.Nominatim("us")
        except ImportError:
            _nom = False  # Mark as tried-but-unavailable
    return _nom if _nom else None


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371  # Earth radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def distance_km(from_zip: str, to_zip: str) -> Optional[float]:
    """Return distance in km between two US zip codes, or None if either is invalid."""
    nom = _get_nom()
    if not nom:
        return None
    from_zip = str(from_zip).strip()[:5]
    to_zip = str(to_zip).strip()[:5]
    if not from_zip or not to_zip or len(from_zip) < 5 or len(to_zip) < 5:
        return None
    try:
        loc1 = nom.query_postal_code(from_zip)
        loc2 = nom.query_postal_code(to_zip)
        if loc1 is None or loc2 is None or math.isnan(loc1.latitude) or math.isnan(loc2.latitude):
            return None
        return _haversine_km(loc1.latitude, loc1.longitude, loc2.latitude, loc2.longitude)
    except Exception:
        return None
