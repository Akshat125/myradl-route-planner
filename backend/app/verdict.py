from __future__ import annotations

import math
from typing import Any

from pydantic import BaseModel, Field, model_validator

from .config import Settings
from .geo import (
    haversine_meters,
    lower_bound_bike_seconds,
    nearest_within_radius,
    walk_seconds_from_straight_line,
)
from .geocoding import GeocodingService
from .routing import RoutingService


class PlanRequest(BaseModel):
    start_lat: float
    start_lng: float
    bike_type: str = Field(pattern="^(classic|ebike)$")
    destination_query: str | None = None
    destination_lat: float | None = None
    destination_lng: float | None = None

    @model_validator(mode="after")
    def validate_destination(self) -> "PlanRequest":
        has_coords = self.destination_lat is not None and self.destination_lng is not None
        has_query = bool(self.destination_query and self.destination_query.strip())
        if not has_coords and not has_query:
            raise ValueError("Provide either destination_query or destination_lat/destination_lng.")
        return self


def _cost_and_status(bike_type: str, bike_duration_s: float) -> tuple[str, float]:
    first_window_s = 30 * 60
    if bike_duration_s <= first_window_s:
        return ("FREE", 0.0) if bike_type == "classic" else ("REDUCED", 1.5)

    extra_halves = math.ceil((bike_duration_s - first_window_s) / first_window_s)
    if bike_type == "classic":
        return ("OVER", float(extra_halves))
    return ("OVER", float(1.5 + (extra_halves * 3.0)))


class VerdictService:
    def __init__(self, settings: Settings, routing: RoutingService, geocoding: GeocodingService) -> None:
        self.settings = settings
        self.routing = routing
        self.geocoding = geocoding

    async def build_plan(self, req: PlanRequest, snapshot: dict[str, Any]) -> dict[str, Any]:
        stations = snapshot["stations"]
        destination_lat = req.destination_lat
        destination_lng = req.destination_lng
        if destination_lat is None or destination_lng is None:
            destination_lat, destination_lng = await self.geocoding.geocode(
                req.destination_query or "",
                req.start_lat,
                req.start_lng,
            )

        eligible_origins = [
            s
            for s in stations
            if s["is_renting"] and s["bikes_by_type"].get(req.bike_type, 0) > 0
        ]

        # MyRadl returns are effectively zone-based in practice, so by default we rely on
        # is_returning instead of dock counts. Keep dock enforcement configurable for
        # strict dock-based systems.
        if self.settings.enforce_destination_docks:
            eligible_dests = [s for s in stations if s["is_returning"] and s["docks_available"] > 0]
        else:
            eligible_dests = [s for s in stations if s["is_returning"]]

        origins = nearest_within_radius(
            eligible_origins,
            req.start_lat,
            req.start_lng,
            self.settings.station_walk_radius_m,
            self.settings.max_origin_candidates,
        )
        dests = nearest_within_radius(
            eligible_dests,
            destination_lat,
            destination_lng,
            self.settings.station_walk_radius_m,
            self.settings.max_dest_candidates,
        )

        if not origins:
            raise ValueError("No nearby station has an available bike of the selected type.")
        if not dests:
            if self.settings.enforce_destination_docks:
                raise ValueError("No nearby destination station currently has a free dock.")
            raise ValueError("No nearby destination station is currently returnable.")

        speed = (
            self.settings.classic_lower_bound_speed_mps
            if req.bike_type == "classic"
            else self.settings.ebike_lower_bound_speed_mps
        )
        pairs: list[tuple[int, int]] = []
        for oi, origin in enumerate(origins):
            for di, dest in enumerate(dests):
                straight = haversine_meters(origin["lat"], origin["lon"], dest["lat"], dest["lon"])
                if lower_bound_bike_seconds(straight, speed) <= (30 * 60 * 1.5):
                    pairs.append((oi, di))
        if not pairs:
            pairs = [(oi, di) for oi in range(len(origins)) for di in range(len(dests))]

        matrix = await self.routing.bike_matrix_seconds(
            req.bike_type,
            [(o["lat"], o["lon"]) for o in origins],
            [(d["lat"], d["lon"]) for d in dests],
        )

        best = None
        best_any = None
        for oi, origin in enumerate(origins):
            walk_to_start_s = walk_seconds_from_straight_line(
                origin["distance_m"], self.settings.walk_speed_mps, self.settings.walk_detour_factor
            )
            for di, dest in enumerate(dests):
                if (oi, di) not in pairs:
                    continue
                bike_s = matrix[oi][di]
                walk_to_end_s = walk_seconds_from_straight_line(
                    dest["distance_m"], self.settings.walk_speed_mps, self.settings.walk_detour_factor
                )
                total_s = walk_to_start_s + bike_s + walk_to_end_s
                row = (total_s, bike_s, oi, di, walk_to_start_s, walk_to_end_s)
                if best_any is None or total_s < best_any[0]:
                    best_any = row
                if bike_s <= 1800 and (best is None or total_s < best[0]):
                    best = row

        chosen = best if best is not None else best_any
        if chosen is None:
            raise ValueError("Unable to build a valid route from current station snapshot.")
        _, bike_s, oi, di, walk_start_s, walk_end_s = chosen
        origin = origins[oi]
        dest = dests[di]

        route = await self.routing.bike_directions(
            req.bike_type, (origin["lat"], origin["lon"]), (dest["lat"], dest["lon"])
        )

        # Refine the two chosen walk legs with real routed times/paths. The haversine
        # estimate above is only used to rank candidates cheaply; here we upgrade the
        # legs we'll actually report. Fall back to the estimate if ORS walking fails.
        walk_start_geometry = None
        walk_end_geometry = None
        try:
            walk_start_route = await self.routing.walk_directions(
                (req.start_lat, req.start_lng), (origin["lat"], origin["lon"])
            )
            walk_start_s = walk_start_route["duration_s"]
            walk_start_geometry = walk_start_route["geometry"]
        except Exception:
            pass
        try:
            walk_end_route = await self.routing.walk_directions(
                (dest["lat"], dest["lon"]), (destination_lat, destination_lng)
            )
            walk_end_s = walk_end_route["duration_s"]
            walk_end_geometry = walk_end_route["geometry"]
        except Exception:
            pass

        status, cost_eur = _cost_and_status(req.bike_type, bike_s)
        backup = next((d for idx, d in enumerate(dests) if idx != di), None)

        return {
            "status": status,
            "bike_type": req.bike_type,
            "cost_eur": round(cost_eur, 2),
            "bike_duration_s": int(bike_s),
            "bike_distance_m": int(route["distance_m"]),
            "walk_to_start_s": int(walk_start_s),
            "walk_to_end_s": int(walk_end_s),
            "total_duration_s": int(walk_start_s + bike_s + walk_end_s),
            "origin_station": origin,
            "destination_station": dest,
            "backup_destination_station": backup,
            "route_geometry": route["geometry"],
            "walk_to_start_geometry": walk_start_geometry,
            "walk_to_end_geometry": walk_end_geometry,
            "destination": {"lat": destination_lat, "lng": destination_lng},
            "snapshot": {
                "last_updated": snapshot.get("last_updated"),
                "data_age_seconds": snapshot.get("data_age_seconds"),
                "stale": snapshot.get("stale", False),
                "network_id": snapshot.get("network_id"),
            },
            "chaining_hint": status == "OVER",
            "note": (
                "Bike duration exceeds free window; v2 chaining can optimize multi-leg swaps."
                if status == "OVER"
                else "Bike duration is within current 30-minute benefit window."
            ),
        }

