from __future__ import annotations

from typing import Any

import httpx

from .config import Settings


def _street_line(props: dict[str, Any]) -> str:
    street = (props.get("street") or "").strip()
    housenumber = (props.get("housenumber") or "").strip()
    if street and housenumber:
        return f"{street} {housenumber}"
    return street or housenumber


def _city_line(props: dict[str, Any]) -> str:
    return (props.get("city") or props.get("locality") or "").strip()


def compose_suggestion_labels(props: dict[str, Any]) -> tuple[str, str | None] | None:
    name = (props.get("name") or "").strip()
    street = _street_line(props)
    city = _city_line(props)
    district = (props.get("district") or "").strip()

    if name:
        primary = name
        context_parts = [part for part in [street, district, city] if part]
        secondary = ", ".join(dict.fromkeys(context_parts)) or None
    elif street:
        primary = ", ".join(part for part in [street, city] if part)
        secondary = district if district and district not in primary else None
    elif city:
        primary = city
        secondary = None
    else:
        return None

    if secondary and secondary.casefold() == primary.casefold():
        secondary = None
    return primary, secondary


class GeocodingService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client = httpx.AsyncClient(
            timeout=15.0,
            headers={"User-Agent": settings.geocode_user_agent},
        )

    async def close(self) -> None:
        await self.client.aclose()

    def _params(
        self,
        query: str,
        focus_lat: float | None = None,
        focus_lon: float | None = None,
    ) -> dict[str, Any]:
        lat = focus_lat if focus_lat is not None else self.settings.geocode_focus_lat
        lon = focus_lon if focus_lon is not None else self.settings.geocode_focus_lon
        params: dict[str, Any] = {
            "q": query,
            "lat": lat,
            "lon": lon,
            "lang": self.settings.geocode_lang,
            "limit": self.settings.geocode_limit,
        }
        if self.settings.geocode_bbox:
            params["bbox"] = self.settings.geocode_bbox
        return params

    async def _fetch_features(
        self,
        query: str,
        focus_lat: float | None = None,
        focus_lon: float | None = None,
    ) -> list[dict[str, Any]]:
        url = f"{self.settings.photon_base_url}/api/"
        response = await self.client.get(url, params=self._params(query, focus_lat, focus_lon))
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise ValueError(
                f"Photon geocoding failed ({exc.response.status_code}). Try again in a moment."
            ) from exc
        return response.json().get("features", [])

    def _feature_to_suggestion(self, feature: dict[str, Any]) -> dict[str, Any] | None:
        coords = feature.get("geometry", {}).get("coordinates")
        props = feature.get("properties", {})
        if not coords or len(coords) < 2:
            return None
        composed = compose_suggestion_labels(props)
        if not composed:
            return None
        primary, secondary = composed
        suggestion: dict[str, Any] = {
            "label": primary,
            "lat": float(coords[1]),
            "lng": float(coords[0]),
        }
        if secondary:
            suggestion["secondary"] = secondary
        return suggestion

    async def geocode(
        self,
        query: str,
        focus_lat: float | None = None,
        focus_lon: float | None = None,
    ) -> tuple[float, float]:
        features = await self._fetch_features(query.strip(), focus_lat, focus_lon)
        if not features:
            raise ValueError("No geocoding result found for destination.")
        suggestion = self._feature_to_suggestion(features[0])
        if not suggestion:
            raise ValueError("No geocoding result found for destination.")
        return suggestion["lat"], suggestion["lng"]

    async def autocomplete(
        self,
        text: str,
        focus_lat: float | None = None,
        focus_lon: float | None = None,
    ) -> list[dict[str, Any]]:
        features = await self._fetch_features(text.strip(), focus_lat, focus_lon)
        suggestions: list[dict[str, Any]] = []
        for feature in features:
            suggestion = self._feature_to_suggestion(feature)
            if suggestion:
                suggestions.append(suggestion)
        return suggestions
