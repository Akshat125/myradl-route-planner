from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "MyRadl Free-Guarantee Planner API"
    app_env: str = "development"
    frontend_origin: str = "http://localhost:5173"

    gbfs_network_id: str = "ml"
    gbfs_discovery_url: str = "https://maps.nextbike.net/maps/nextbike-live.json?list_cities=1"
    gbfs_base_template: str = "https://gbfs.nextbike.net/maps/gbfs/v2/nextbike_{network_id}/gbfs.json"
    status_refresh_seconds: int = 60
    static_refresh_seconds: int = 21600

    ors_api_key: str = ""
    ors_base_url: str = "https://api.heigit.org/openrouteservice"
    ors_geocode_url: str = "https://api.heigit.org/pelias/v1"
    geocode_limit: int = 5

    max_origin_candidates: int = 8
    max_dest_candidates: int = 8
    station_walk_radius_m: float = 450.0
    enforce_destination_docks: bool = False
    walk_speed_mps: float = 1.4
    walk_detour_factor: float = 1.3
    classic_lower_bound_speed_mps: float = 4.5
    ebike_lower_bound_speed_mps: float = 6.5

    github_feedback_token: str = ""
    feedback_repo: str = "Akshat125/myradl-route-planner"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

