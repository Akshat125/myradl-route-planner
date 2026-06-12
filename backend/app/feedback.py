from __future__ import annotations

import logging
import re
import time
from collections import defaultdict
from typing import Literal

import httpx
from fastapi import HTTPException, Request
from pydantic import BaseModel, Field, field_validator

from .config import Settings

logger = logging.getLogger(__name__)

FeedbackType = Literal["bug", "feature", "other"]

TYPE_LABELS: dict[FeedbackType, str] = {
    "bug": "bug",
    "feature": "enhancement",
    "other": "question",
}

MENTION_RE = re.compile(r"@\w+")


class FeedbackRequest(BaseModel):
    type: FeedbackType = "other"
    message: str = Field(..., min_length=1, max_length=4000)
    email: str | None = None
    context: str | None = Field(default=None, max_length=4000)
    website: str = ""

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        if not trimmed:
            return None
        if "@" not in trimmed or len(trimmed) > 254:
            raise ValueError("Invalid email address")
        return trimmed


class FeedbackResponse(BaseModel):
    ok: bool = True
    issue_url: str


class RateLimiter:
    def __init__(self, per_minute: int = 5, per_hour: int = 20) -> None:
        self.per_minute = per_minute
        self.per_hour = per_hour
        self._events: dict[str, list[float]] = defaultdict(list)

    def check(self, key: str) -> None:
        now = time.monotonic()
        events = self._events[key]
        events[:] = [t for t in events if now - t < 3600]

        recent_minute = sum(1 for t in events if now - t < 60)
        if recent_minute >= self.per_minute:
            raise HTTPException(status_code=429, detail="Too many submissions. Please try again later.")

        if len(events) >= self.per_hour:
            raise HTTPException(status_code=429, detail="Too many submissions. Please try again later.")

        events.append(now)


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def sanitize_user_text(text: str) -> str:
    return MENTION_RE.sub("", text).strip()


def build_issue_title(feedback_type: FeedbackType, message: str) -> str:
    preview = sanitize_user_text(message).replace("\n", " ")[:60]
    return f"[Feedback:{feedback_type}] {preview}"


def build_issue_body(
    feedback_type: FeedbackType,
    message: str,
    email: str | None,
    context: str | None,
) -> str:
    safe_message = sanitize_user_text(message)
    lines = [
        f"**Type:** {feedback_type}",
        "",
        "**Message:**",
        "```",
        safe_message,
        "```",
    ]
    if email:
        lines.extend(["", f"**Contact email:** {email}"])
    if context:
        safe_context = sanitize_user_text(context)
        lines.extend(["", "**Route context:**", "```", safe_context, "```"])
    return "\n".join(lines)


class FeedbackService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._limiter = RateLimiter()
        self._client = httpx.AsyncClient(timeout=15.0)

    async def close(self) -> None:
        await self._client.aclose()

    async def submit(self, payload: FeedbackRequest, request: Request) -> FeedbackResponse:
        if payload.website.strip():
            return FeedbackResponse(ok=True, issue_url="")

        self._limiter.check(client_ip(request))

        token = self.settings.github_feedback_token.strip()
        if not token:
            logger.error("GITHUB_FEEDBACK_TOKEN is not configured")
            raise HTTPException(status_code=500, detail="Feedback is temporarily unavailable.")

        repo = self.settings.feedback_repo.strip()
        if "/" not in repo:
            logger.error("FEEDBACK_REPO is invalid: %s", repo)
            raise HTTPException(status_code=500, detail="Feedback is temporarily unavailable.")

        title = build_issue_title(payload.type, payload.message)
        body = build_issue_body(payload.type, payload.message, payload.email, payload.context)
        label = TYPE_LABELS[payload.type]

        try:
            response = await self._client.post(
                f"https://api.github.com/repos/{repo}/issues",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/vnd.github+json",
                    "X-GitHub-Api-Version": "2022-11-28",
                },
                json={"title": title, "body": body, "labels": [label]},
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.exception("GitHub issue creation failed: %s", exc.response.status_code)
            raise HTTPException(status_code=500, detail="Unable to submit feedback right now.") from exc
        except httpx.HTTPError as exc:
            logger.exception("GitHub issue creation request failed")
            raise HTTPException(status_code=500, detail="Unable to submit feedback right now.") from exc

        data = response.json()
        issue_url = data.get("html_url", "")
        if not issue_url:
            logger.error("GitHub response missing html_url")
            raise HTTPException(status_code=500, detail="Unable to submit feedback right now.")

        return FeedbackResponse(ok=True, issue_url=issue_url)
