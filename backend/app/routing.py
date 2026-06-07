from __future__ import annotations

from typing import Any

import httpx

from .config import Settings


PROFILE_MAP = {"classic": "cycling-regular", "ebike": "cycling-electric"}


class RoutingService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client = httpx.AsyncClient(timeout=30.0)

    async def close(self) -> None:
        await self.client.aclose()

    def _headers(self) -> dict[str, str]:
        if not self.settings.ors_api_key:
            raise ValueError("ORS_API_KEY is not configured.")
        return {"Authorization": self.settings.ors_api_key}

    async def geocode(self, query: str) -> tuple[float, float]:
        if not self.settings.ors_api_key:
            raise ValueError("ORS_API_KEY is missing. Set it in backend .env before planning routes.")
        url = f"{self.settings.ors_geocode_url}/search"
        params = {"api_key": self.settings.ors_api_key, "text": query, "size": self.settings.geocode_limit}
        response = await self.client.get(url, params=params)
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise ValueError(
                f"ORS geocoding failed ({exc.response.status_code}). Check ORS_API_KEY and quota."
            ) from exc
        features = response.json().get("features", [])
        if not features:
            raise ValueError("No geocoding result found for destination.")
        lon, lat = features[0]["geometry"]["coordinates"]
        return float(lat), float(lon)

    async def autocomplete(
        self,
        text: str,
        focus_lat: float | None = None,
        focus_lon: float | None = None,
    ) -> list[dict[str, Any]]:
        if not self.settings.ors_api_key:
            raise ValueError("ORS_API_KEY is missing. Set it in backend .env before searching addresses.")
        url = f"{self.settings.ors_geocode_url}/autocomplete"
        params: dict[str, Any] = {
            "api_key": self.settings.ors_api_key,
            "text": text,
            "size": self.settings.geocode_limit,
        }
        if focus_lat is not None and focus_lon is not None:
            params["focus.point.lat"] = focus_lat
            params["focus.point.lon"] = focus_lon
        response = await self.client.get(url, params=params)
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise ValueError(
                f"ORS autocomplete failed ({exc.response.status_code}). Check ORS_API_KEY and quota."
            ) from exc
        features = response.json().get("features", [])
        suggestions: list[dict[str, Any]] = []
        for feature in features:
            coords = feature.get("geometry", {}).get("coordinates")
            props = feature.get("properties", {})
            if not coords or len(coords) < 2:
                continue
            label = props.get("label") or props.get("name")
            if not label:
                continue
            suggestions.append({"label": label, "lat": float(coords[1]), "lng": float(coords[0])})
        return suggestions

    async def bike_matrix_seconds(
        self,
        bike_type: str,
        origins: list[tuple[float, float]],
        destinations: list[tuple[float, float]],
    ) -> list[list[float]]:
        profile = PROFILE_MAP.get(bike_type, "cycling-regular")
        url = f"{self.settings.ors_base_url}/v2/matrix/{profile}"
        locations = [[lon, lat] for lat, lon in origins + destinations]
        source_idx = list(range(len(origins)))
        dest_idx = list(range(len(origins), len(origins) + len(destinations)))

        payload = {"locations": locations, "sources": source_idx, "destinations": dest_idx, "metrics": ["duration"]}
        response = await self.client.post(url, json=payload, headers=self._headers())
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise ValueError(
                f"ORS matrix request failed ({exc.response.status_code}). Check ORS_API_KEY and quota."
            ) from exc
        durations = response.json().get("durations", [])
        return [[float(v) for v in row] for row in durations]

    async def bike_directions(
        self, bike_type: str, origin: tuple[float, float], destination: tuple[float, float]
    ) -> dict[str, Any]:
        profile = PROFILE_MAP.get(bike_type, "cycling-regular")
        return await self._directions(profile, origin, destination)

    async def walk_directions(
        self, origin: tuple[float, float], destination: tuple[float, float]
    ) -> dict[str, Any]:
        return await self._directions("foot-walking", origin, destination)

    async def _directions(
        self, profile: str, origin: tuple[float, float], destination: tuple[float, float]
    ) -> dict[str, Any]:
        url = f"{self.settings.ors_base_url}/v2/directions/{profile}/geojson"
        payload = {"coordinates": [[origin[1], origin[0]], [destination[1], destination[0]]]}
        response = await self.client.post(url, json=payload, headers=self._headers())
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise ValueError(
                f"ORS directions request failed ({exc.response.status_code}). Check ORS_API_KEY and quota."
            ) from exc
        body = response.json()
        features = body.get("features", [])
        if not features:
            raise ValueError("No route returned by ORS directions.")
        feature = features[0]
        summary = feature.get("properties", {}).get("summary", {})
        return {
            "duration_s": float(summary.get("duration", 0)),
            "distance_m": float(summary.get("distance", 0)),
            "geometry": feature.get("geometry"),
        }

