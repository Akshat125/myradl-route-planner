# Changelog

All notable changes to this project are documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html),
and the changelog is maintained automatically by
[release-please](https://github.com/googleapis/release-please) from
[Conventional Commits](https://www.conventionalcommits.org/).

## [0.3.0](https://github.com/Akshat125/myradl-route-planner/compare/v0.2.0...v0.3.0) (2026-06-17)


### Features

* implement user feedback submission via GitHub issues without login ([b1b304b](https://github.com/Akshat125/myradl-route-planner/commit/b1b304b47212ac496a9bd63153a5260c31f65b7d))
* migrate geocoding engine to photon ([f4a0c8e](https://github.com/Akshat125/myradl-route-planner/commit/f4a0c8eede9ee9a3cb4c00a9bfbb1d81c56343ba))
* setup vercel analytics ([47163e7](https://github.com/Akshat125/myradl-route-planner/commit/47163e75cd4e25dd8ee2898a40f70cc92da4a702))


### Bug Fixes

* update geocode bounding box and increase station walk radius for improved geocoding accuracy ([a870152](https://github.com/Akshat125/myradl-route-planner/commit/a870152c7ade91c5e6d7430437b44acd81e796e0))
* use || fallback for VITE_API_BASE_URL to handle empty string env var ([ae8e7f0](https://github.com/Akshat125/myradl-route-planner/commit/ae8e7f071f7133f9c21db2b7cf7e1a7ac5ea586c))

## [0.2.0](https://github.com/Akshat125/myradl-route-planner/compare/v0.1.0...v0.2.0) (2026-06-09)


### Features

* add the option to report an issue with the recommended route ([271c96c](https://github.com/Akshat125/myradl-route-planner/commit/271c96c378bf8ac5e19e6f8f674144739b7d183d))
* redesign UI and cleanup stale code ([3d9e0f6](https://github.com/Akshat125/myradl-route-planner/commit/3d9e0f654eb873b24e1a4d5e4680c762d1b66d22))


### Bug Fixes

* add vercel.json for monorepo deployment from frontend/ subdirectory ([bbcbaaa](https://github.com/Akshat125/myradl-route-planner/commit/bbcbaaa5ecb9c29ec64c31f42b71d971caeb4b67))
* pass dummy ORS_API_KEY in CI smoke check ([1780859](https://github.com/Akshat125/myradl-route-planner/commit/1780859174919e02186afa8220c6fd65a2540bbd))

## 0.1.0

Initial public release.

- Free-ride bike-share trip planner for Munich's MyRadl (Nextbike) network.
- FastAPI backend: `/health`, `/stations`, `/geocode/autocomplete`, `/plan`.
- Vite + React frontend with map, start/destination autocomplete, and verdict card.
- GBFS data refresh (status every 60s, static every 6h) via APScheduler.
