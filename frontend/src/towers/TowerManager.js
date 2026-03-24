import { Tower } from "./Tower.js";

export const BASIC_TOWER_TEMPLATE = Object.freeze({
  type: "Basic Tower",
  damage: 15,
  attackSpeed: 1,
  range: 140,
  cost: 50,
  color: "#f9fafb",
  size: 18,
});

export class TowerManager {
  constructor(mapManager) {
    this.mapManager = mapManager;
    this.towers = [];
  }

  hasTowerAt(row, col) {
    return this.towers.some((tower) => tower.row === row && tower.col === col);
  }

  canPlaceTower(row, col) {
    return this.mapManager.isTilePlaceable(row, col) && !this.hasTowerAt(row, col);
  }

  placeTower(row, col, towerTemplate) {
    if (!this.canPlaceTower(row, col)) return null;

    const tileSize = this.mapManager.tileSize;
    const x = col * tileSize + tileSize / 2;
    const y = row * tileSize + tileSize / 2;

    const tower = new Tower({
      ...towerTemplate,
      row,
      col,
      x,
      y,
    });

    this.towers.push(tower);
    return tower;
  }

  getTowerAtWorldPosition(x, y) {
    return this.towers.find((tower) => tower.containsPoint(x, y)) ?? null;
  }

  update(deltaMs, enemies) {
    for (const tower of this.towers) {
      tower.update(deltaMs, enemies);
    }
  }

  draw(ctx, hoveredTowerId = null) {
    for (const tower of this.towers) {
      tower.draw(ctx, tower.id === hoveredTowerId);
    }
  }
}
