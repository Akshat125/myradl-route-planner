from __future__ import annotations

from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .data import DataAccess
from .feedback import FeedbackRequest, FeedbackService
from .gbfs import GBFSService
from .geocoding import GeocodingService
from .routing import RoutingService
from .verdict import PlanRequest, VerdictService

settings = get_settings()
data_access = DataAccess()
gbfs_service = GBFSService(settings)
routing_service = RoutingService(settings)
geocoding_service = GeocodingService(settings)
verdict_service = VerdictService(settings, routing_service, geocoding_service)
feedback_service = FeedbackService(settings)
scheduler = AsyncIOScheduler(timezone="UTC")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        await gbfs_service.refresh_static_feeds()
    except Exception:
        pass
    try:
        await gbfs_service.refresh_status_feeds()
    except Exception:
        pass

    scheduler.add_job(
        gbfs_service.refresh_status_feeds,
        "interval",
        seconds=settings.status_refresh_seconds,
        id="refresh_status",
        replace_existing=True,
    )
    scheduler.add_job(
        gbfs_service.refresh_static_feeds,
        "interval",
        seconds=settings.static_refresh_seconds,
        id="refresh_static",
        replace_existing=True,
    )
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)
    await gbfs_service.close()
    await routing_service.close()
    await geocoding_service.close()
    await feedback_service.close()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    # Vite dev server hops ports (5173, 5174, ...), so allow any localhost port in dev.
    # Also allow Vercel preview deploys (*.vercel.app), which get a fresh URL per build.
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https://[a-z0-9-]+\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    return {"ok": True, "env": settings.app_env}


@app.get("/stations")
async def stations() -> dict:
    try:
        snapshot = await gbfs_service.get_station_snapshot()
        await data_access.log_snapshot(snapshot)
        return snapshot
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unable to fetch station data: {exc}") from exc


@app.get("/geocode/autocomplete")
async def geocode_autocomplete(
    text: str,
    focus_lat: float | None = None,
    focus_lng: float | None = None,
) -> dict:
    query = text.strip()
    if len(query) < 3:
        return {"suggestions": []}
    try:
        suggestions = await geocoding_service.autocomplete(query, focus_lat, focus_lng)
        return {"suggestions": suggestions}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unable to fetch suggestions: {exc}") from exc


@app.post("/plan")
async def plan(payload: PlanRequest) -> dict:
    try:
        snapshot = await gbfs_service.get_station_snapshot()
        return await verdict_service.build_plan(payload, snapshot)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unable to compute plan: {exc}") from exc


@app.post("/feedback")
async def feedback(payload: FeedbackRequest, request: Request) -> dict:
    try:
        result = await feedback_service.submit(payload, request)
        return result.model_dump()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to submit feedback right now.") from exc

