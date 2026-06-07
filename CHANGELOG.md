# Changelog

All notable changes to this project are documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html),
and the changelog is maintained automatically by
[release-please](https://github.com/googleapis/release-please) from
[Conventional Commits](https://www.conventionalcommits.org/).

## 0.1.0

Initial public release.

- Free-ride bike-share trip planner for Munich's MyRadl (Nextbike) network.
- FastAPI backend: `/health`, `/stations`, `/geocode/autocomplete`, `/plan`.
- Vite + React frontend with map, start/destination autocomplete, and verdict card.
- GBFS data refresh (status every 60s, static every 6h) via APScheduler.
