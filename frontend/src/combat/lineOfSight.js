import { TILE_TYPES } from "../config/map.js";

function isBlockingTileForTower(tileType, towerElevation) {
  if (towerElevation === "mountain") return false;
  return tileType === TILE_TYPES.MOUNTAIN || tileType === TILE_TYPES.HILL;
}

export function hasLineOfSight(tower, target, mapManager) {
  const dx = target.x - tower.x;
  const dy = target.y - tower.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return true;

  const stepSize = mapManager.tileSize / 4;
  const steps = Math.max(1, Math.ceil(distance / stepSize));

  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const sampleX = tower.x + dx * t;
    const sampleY = tower.y + dy * t;
    const { row, col } = mapManager.worldToGrid(sampleX, sampleY);

    if (!mapManager.isInsideGrid(row, col)) continue;
    if (row === tower.row && col === tower.col) continue;

    const tileType = mapManager.getTileType(row, col);
    if (isBlockingTileForTower(tileType, tower.elevation)) {
      return false;
    }
  }

  return true;
}

export function getRangeTileVisibility(towerLike, mapManager, rangePx) {
  const visibleTiles = [];
  const blockedTiles = [];
  const effectiveRange = rangePx;
  const rangeSquared = effectiveRange * effectiveRange;

  for (let row = 0; row < mapManager.rows; row += 1) {
    for (let col = 0; col < mapManager.cols; col += 1) {
      const center = mapManager.gridToWorldCenter(row, col);
      const dx = center.x - towerLike.x;
      const dy = center.y - towerLike.y;
      if (dx * dx + dy * dy > rangeSquared) continue;

      const visible = hasLineOfSight(
        towerLike,
        { x: center.x, y: center.y },
        mapManager,
      );

      if (visible) {
        visibleTiles.push({ row, col });
      } else {
        blockedTiles.push({ row, col });
      }
    }
  }

  return { visibleTiles, blockedTiles };
}
