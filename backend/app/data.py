from dataclasses import dataclass
from typing import Any


@dataclass
class DataAccess:
    """Thin seam for future persistence integration (v1.5+)."""

    async def log_snapshot(self, _payload: dict[str, Any]) -> None:
        # No-op in v1 by design.
        return None

