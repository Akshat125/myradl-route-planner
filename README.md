# MyRadl Free-Guarantee Planner

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Web + API app that answers:

- Can I finish the bike leg within the 30-minute benefit window?
- Is there a free dock near the destination right now?
- What is the backup station if the first destination station fills up?

The frontend is a Vite React app. The backend is FastAPI.

## Architecture

- **Frontend** (`frontend/`): Vite + React + TypeScript + Tailwind + react-leaflet
- **Backend** (`backend/`): FastAPI + httpx + APScheduler
- **Data source**: Nextbike GBFS (`nextbike_ml`) for MyRadl
- **Routing/geocoding**: OpenRouteService (`ORS_API_KEY` required for `/plan`)

## Implemented Endpoints

- `GET /health` - health check
- `GET /geocode/autocomplete?text=&focus_lat=&focus_lng=` - debounced address suggestions
  (used by destination + start-location autocomplete; optional focus point biases results)
- `GET /stations` - merged station snapshot:
  - `station_information`
  - `station_status`
  - `vehicle_types`
  - freshness metadata (`last_updated`, `data_age_seconds`, `stale`)
- `POST /plan` - computes:
  - origin + destination station candidates
  - one ORS Matrix call for station-pair durations
  - chosen best pair with 30-min logic
  - one ORS Directions call for geometry
  - cost/status (`FREE`/`REDUCED`/`OVER`)
  - backup destination station

## Freshness Strategy

- Fast cadence: `station_status` every ~60s
- Slow cadence: `station_information`, `vehicle_types`, `system_pricing_plans` every ~6h
- APScheduler warms cache in background
- Stale-while-revalidate fallback if refresh fails

## Local Setup

### 1) Backend

```bash
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Set a real ORS key in `backend/.env`:

```env
ORS_API_KEY=...
```

Run backend:

```bash
cd backend
. .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2) Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Using `backend/.venv` keeps Python deps scoped to the backend service and avoids mixing frontend and backend tooling in one environment.

Frontend runs on `http://localhost:5173` and calls backend at `http://localhost:8000`.

## Build Checks Run

- Backend smoke test:
  - `GET /health` returned `200`
  - `GET /stations` returned `200` and station data
- Frontend build:
  - `npm run build` succeeds

## Deployment (Railway backend + Vercel frontend)

Both platforms deploy continuously from `main`: every merge auto-rebuilds the
live services. Deploy the backend first so you have its URL when configuring the
frontend.

### 1) Backend on Railway

- New project -> Deploy from this GitHub repo.
- Set the service **Root Directory** to `backend`.
- Railway uses Nixpacks (auto-detects `requirements.txt`); the start command
  comes from [`backend/Procfile`](backend/Procfile):

  ```
  web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
  ```

- Python is pinned via [`backend/.python-version`](backend/.python-version).
- Set the health check path to `/health`.
- Environment variables:

  ```env
  ORS_API_KEY=<your_openrouteservice_key>
  APP_ENV=production
  FRONTEND_ORIGIN=<your_vercel_url>   # set after the frontend is deployed
  ```

### 2) Frontend on Vercel

- New project -> import this GitHub repo.
- Set the **Root Directory** to `frontend` (framework preset auto-detects Vite:
  build `npm run build`, output `dist`).
- Environment variable:

  ```env
  VITE_API_BASE_URL=https://<your-railway-backend-domain>
  ```

### 3) Wire them together

After the frontend is live, set `FRONTEND_ORIGIN` on Railway to the Vercel URL
and redeploy the backend. CORS already allows `*.vercel.app` preview deploys.

## Releases & versioning

This project follows [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`)
and uses [Conventional Commits](https://www.conventionalcommits.org/) so releases
can be automated with [release-please](https://github.com/googleapis/release-please):

- `fix: ...` -> patch bump (e.g. `0.1.0` -> `0.1.1`)
- `feat: ...` -> minor bump (e.g. `0.1.0` -> `0.2.0`)
- `feat!: ...` or a `BREAKING CHANGE:` footer -> major bump

release-please keeps an open "Release PR" that accumulates merged changes; merging
that PR tags the version, updates [`CHANGELOG.md`](CHANGELOG.md), bumps the version
in `frontend/package.json` and `backend/pyproject.toml`, and publishes a GitHub
Release. Deployment is independent: the live site already tracks `main`, so a
release is a versioned marker/announcement, not a deploy trigger.

## License

[MIT](LICENSE)

## Notes

- The app does **not** reserve bikes/docks (no public booking API).
- v1 is stateless (no DB). `backend/app/data.py` is a seam for v1.5+ persistence/logger work.
- Multi-leg chaining remains v2 scope.
