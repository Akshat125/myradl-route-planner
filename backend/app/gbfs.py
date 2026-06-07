from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass
from typing import Any

import httpx

from .config import Settings


STATIC_FEEDS = ["station_information", "vehicle_types", "system_pricing_plans"]
STATUS_FEEDS = ["station_status"]


@dataclass
class CacheEntry:
    value: dict[str, Any] | None
    expires_at: float
    fetched_at: float
    last_updated: int | None = None
    stale: bool = False


class GBFSService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client = httpx.AsyncClient(timeout=20.0)
        self._discovery_cache: CacheEntry | None = None
        self._feed_cache: dict[str, CacheEntry] = {}
        self._lock = asyncio.Lock()

    async def close(self) -> None:
        await self.client.aclose()

    async def _fetch_json(self, url: str) -> dict[str, Any]:
        response = await self.client.get(url)
        response.raise_for_status()
        return response.json()

    async def _resolve_feed_urls(self) -> dict[str, str]:
        async with self._lock:
            now = time.time()
            if self._discovery_cache and self._discovery_cache.expires_at > now:
                return self._discovery_cache.value or {}

            discovery_url = self.settings.gbfs_base_template.format(
                network_id=self.settings.gbfs_network_id
            )
            payload = await self._fetch_json(discovery_url)
            feeds: dict[str, str] = {}
            data = payload.get("data", {})
            for lang in data.values():
                for feed in lang.get("feeds", []):
                    feeds[feed["name"]] = feed["url"]
            ttl = int(payload.get("ttl", 300))
            self._discovery_cache = CacheEntry(
                value=feeds,
                expires_at=now + ttl,
                fetched_at=now,
                last_updated=payload.get("last_updated"),
                stale=False,
            )
            return feeds

    async def _get_feed(self, feed_name: str, force_refresh: bool = False) -> CacheEntry:
        now = time.time()
        entry = self._feed_cache.get(feed_name)
        if entry and entry.expires_at > now and not force_refresh:
            return entry

        feed_urls = await self._resolve_feed_urls()
        url = feed_urls.get(feed_name)
        if not url:
            if entry:
                entry.stale = True
                return entry
            raise ValueError(f"Feed not found in discovery: {feed_name}")

        try:
            payload = await self._fetch_json(url)
            ttl = int(payload.get("ttl", 60))
            new_entry = CacheEntry(
                value=payload,
                expires_at=now + ttl,
                fetched_at=now,
                last_updated=payload.get("last_updated"),
                stale=False,
            )
            self._feed_cache[feed_name] = new_entry
            return new_entry
        except Exception:
            if entry:
                entry.stale = True
                return entry
            raise

    async def refresh_status_feeds(self) -> None:
        for feed in STATUS_FEEDS:
            await self._get_feed(feed, force_refresh=True)

    async def refresh_static_feeds(self) -> None:
        for feed in STATIC_FEEDS:
            await self._get_feed(feed, force_refresh=True)

    async def get_station_snapshot(self) -> dict[str, Any]:
        station_info_entry = await self._get_feed("station_information")
        station_status_entry = await self._get_feed("station_status")
        vehicle_types_entry = await self._get_feed("vehicle_types")

        station_info_payload = station_info_entry.value or {}
        station_status_payload = station_status_entry.value or {}
        vehicle_types_payload = vehicle_types_entry.value or {}

        vehicle_map: dict[str, str] = {}
        for vehicle in vehicle_types_payload.get("data", {}).get("vehicle_types", []):
            vehicle_type_id = str(vehicle.get("vehicle_type_id"))
            propulsion = (vehicle.get("propulsion_type") or "").lower()
            form_factor = (vehicle.get("form_factor") or "").lower()
            is_ebike = "electric" in propulsion or "pedelec" in form_factor
            vehicle_map[vehicle_type_id] = "ebike" if is_ebike else "classic"

        status_by_id: dict[str, dict] = {}
        for row in station_status_payload.get("data", {}).get("stations", []):
            status_by_id[str(row.get("station_id"))] = row

        stations: list[dict[str, Any]] = []
        for row in station_info_payload.get("data", {}).get("stations", []):
            station_id = str(row.get("station_id"))
            status = status_by_id.get(station_id, {})

            bikes_by_type = {"classic": 0, "ebike": 0}
            for item in status.get("vehicle_types_available", []):
                vt = str(item.get("vehicle_type_id"))
                count = int(item.get("count", 0))
                label = vehicle_map.get(vt, "classic")
                bikes_by_type[label] += count

            # Fallback for feeds without per-type availability.
            if bikes_by_type["classic"] + bikes_by_type["ebike"] == 0:
                bikes_by_type["classic"] = int(status.get("num_bikes_available", 0))

            stations.append(
                {
                    "id": station_id,
                    "name": row.get("name", f"Station {station_id}"),
                    "lat": float(row.get("lat")),
                    "lon": float(row.get("lon")),
                    "capacity": int(row.get("capacity", 0)),
                    "bikes_by_type": bikes_by_type,
                    "docks_available": int(status.get("num_docks_available", 0)),
                    "is_renting": bool(status.get("is_renting", 1)),
                    "is_returning": bool(status.get("is_returning", 1)),
                    "distance_m": 0.0,
                }
            )

        newest_update = max(
            v
            for v in [
                station_info_entry.last_updated or 0,
                station_status_entry.last_updated or 0,
                vehicle_types_entry.last_updated or 0,
            ]
        )
        data_age_seconds = int(time.time()) - int(newest_update) if newest_update else None
        stale = (
            station_info_entry.stale or station_status_entry.stale or vehicle_types_entry.stale
        )

        return {
            "network_id": self.settings.gbfs_network_id,
            "stations": stations,
            "last_updated": newest_update,
            "data_age_seconds": data_age_seconds,
            "stale": stale,
        }

