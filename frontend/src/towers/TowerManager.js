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

export const MACHINE_GUN_TOWER_TEMPLATE = Object.freeze({
  type: "Machine Gun Tower",
  damage: 6,
  attackSpeed: 5.5,
  range: 105,
  cost: 40,
  color: "#ef4444",
  size: 16,
});

export const SNIPER_TOWER_TEMPLATE = Object.freeze({
  type: "Sniper Tower",
  damage: 95,
  attackSpeed: 0.45,
  range: 260,
  cost: 120,
  color: "#4338ca",
  size: 17,
});

export const CANNON_TOWER_TEMPLATE = Object.freeze({
  type: "Cannon Tower",
  damage: 48,
  attackSpeed: 1.3,
  range: 155,
  cost: 75,
  color: "#f97316",
  size: 20,
});

export const TOWER_TEMPLATES = Object.freeze({
  basic: BASIC_TOWER_TEMPLATE,
  machineGun: MACHINE_GUN_TOWER_TEMPLATE,
  sniper: SNIPER_TOWER_TEMPLATE,
  cannon: CANNON_TOWER_TEMPLATE,
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
