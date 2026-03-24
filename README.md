[![Build Frontend](https://github.com/im23b-schneidert/TowerDefense/actions/workflows/frontend_job.yml/badge.svg)](https://github.com/im23b-schneidert/TowerDefense/actions/workflows/frontend_job.yml)

## Tower Defense starter

This repository now includes a vanilla JavaScript + HTML5 Canvas starter in `frontend/` with a configurable, grid-based map system.

### Run locally

1. Open a terminal in `frontend/`
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev`
4. Open the printed local URL in your browser

### Map editing

- Tile layout is defined in `frontend/src/config/map.js` via `MAP_LAYOUT`
- Change tile numbers to reshape the map:
  - `0`: Grass (tower placeable)
  - `1`: Path (enemy walkable)
  - `2`: Water (not placeable, does not block projectiles)
  - `3`: Hill (not placeable, blocks projectiles)

### Key code

- `frontend/src/MapManager.js`
  - Reads and renders map array
  - `isTilePlaceable(row, col)`
  - `doesTileBlockProjectiles(row, col)`
- `frontend/src/main.js`
  - Canvas setup
  - Game loop
  - Click-to-test tile behavior in the browser console
