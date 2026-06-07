from __future__ import annotations

import math
from typing import Iterable


EARTH_RADIUS_M = 6_371_000


def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return great-circle distance in meters."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    return 2 * EARTH_RADIUS_M * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def walk_seconds_from_straight_line(
    distance_m: float, walk_speed_mps: float, detour_factor: float
) -> float:
    return (distance_m * detour_factor) / walk_speed_mps


def nearest_within_radius(
    stations: Iterable[dict],
    lat: float,
    lon: float,
    radius_m: float,
    limit: int,
) -> list[dict]:
    scored: list[dict] = []
    for station in stations:
        dist = haversine_meters(lat, lon, station["lat"], station["lon"])
        if dist <= radius_m:
            row = dict(station)
            row["distance_m"] = dist
            scored.append(row)
    scored.sort(key=lambda s: s["distance_m"])
    return scored[:limit]


def lower_bound_bike_seconds(distance_m: float, optimistic_speed_mps: float) -> float:
    return distance_m / optimistic_speed_mps

