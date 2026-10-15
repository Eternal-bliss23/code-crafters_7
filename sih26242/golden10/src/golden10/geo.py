"""Geodesy helpers: local ENU frame <-> WGS84 lat/lon, bearing, swath geometry.

Pure stdlib. The mission runs entirely in a local metric frame (metres east/north
of the launch zone) because that is what an onboard INS/GNSS produces anyway.
"""

from __future__ import annotations

import math

from .types import Vec2

EARTH_RADIUS_M = 6_371_008.8


def bearing_deg(a: Vec2, b: Vec2) -> float:
    """Compass bearing a->b, degrees clockwise from North (+y)."""
    dx = b.x - a.x
    dy = b.y - a.y
    return (math.degrees(math.atan2(dx, dy)) + 360.0) % 360.0


def swath_width_m(altitude_agl_m: float, hfov_deg: float) -> float:
    """Ground footprint width of a nadir-looking sensor."""
    half = math.radians(hfov_deg) / 2.0
    return max(1.0, 2.0 * altitude_agl_m * math.tan(half))


def ground_resolution_m(altitude_agl_m: float, hfov_deg: float, px: int) -> float:
    """Ground-sampled distance per pixel at nadir."""
    return swath_width_m(altitude_agl_m, hfov_deg) / max(1, px)


def enu_to_latlon(
    origin_lat: float,
    origin_lon: float,
    p: Vec2,
    altitude_m: float = 0.0,
) -> tuple[float, float, float]:
    """Local ENU metres -> (lat, lon, alt_m). Simple tangent-plane approximation,
    accurate to well under a metre over the <1 km scenario spans used here."""
    lat = origin_lat + math.degrees(p.y / EARTH_RADIUS_M)
    denom = EARTH_RADIUS_M * math.cos(math.radians(origin_lat))
    lon = origin_lon + math.degrees(p.x / denom)
    return lat, lon, altitude_m


def haversine_m(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lon1 = math.radians(a[0]), math.radians(a[1])
    lat2, lon2 = math.radians(b[0]), math.radians(b[1])
    h = (
        math.sin((lat2 - lat1) / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    )
    return 2 * EARTH_RADIUS_M * math.asin(min(1.0, math.sqrt(h)))


def wrap_180(deg: float) -> float:
    return (deg + 180.0) % 360.0 - 180.0


def angle_delta(a: float, b: float) -> float:
    return abs(wrap_180(a - b))
