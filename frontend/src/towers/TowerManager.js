import { Tower } from "./Tower.js";
import { TILE_TYPES } from "../config/map.js";

export const MOUNTAIN_RANGE_MULTIPLIER = 1.5;

export const BASIC_TOWER_TEMPLATE = Object.freeze({
  type: "Basic Tower",
  damage: 15,
  attackSpeed: 1,
  range: 140,
  cost: 50,
  color: "#d5c095",
  size: 18,
  spriteKey: "basic",
  projectileSpriteKey: "bolt",
  upgradePaths: {
    pathA: [
      { name: "Twin Launcher", cost: 35, projectilesPerShotBonus: 1 },
      { name: "Honed Bolts", cost: 50, damageBonus: 5 },
      { name: "Tri-Shot Frame", cost: 70, projectilesPerShotBonus: 1 },
      { name: "Firing Rhythm", cost: 95, attackSpeedBonus: 0.16 },
      { name: "Ballistic Drill", cost: 125, damageBonus: 9 },
    ],
    pathB: [
      {
        name: "Blast Tip I",
        cost: 35,
        splashRadiusBonus: 30,
        splashDamageMultiplierBonus: 0.18,
      },
      { name: "Arc Sight", cost: 50, rangeBonus: 12 },
      {
        name: "Blast Tip II",
        cost: 70,
        splashRadiusBonus: 22,
        splashDamageMultiplierBonus: 0.12,
      },
      { name: "Payload Charge", cost: 95, damageBonus: 8 },
      {
        name: "Blast Tip III",
        cost: 125,
        splashRadiusBonus: 27,
        splashDamageMultiplierBonus: 0.14,
      },
    ],
  },
});

export const MACHINE_GUN_TOWER_TEMPLATE = Object.freeze({
  type: "Machine Gun Tower",
  damage: 6,
  attackSpeed: 5.5,
  range: 105,
  cost: 40,
  color: "#b38a5f",
  size: 16,
  spriteKey: "machineGun",
  projectileSpriteKey: "shot",
  upgradePaths: {
    pathA: [
      { name: "Predator Sight", cost: 30, critChanceBonus: 0.06 },
      { name: "Dense Core", cost: 45, damageBonus: 2 },
      { name: "Critical Feed", cost: 65, critChanceBonus: 0.08 },
      { name: "Lethal Casing", cost: 90, critMultiplierBonus: 0.35 },
      { name: "Hunter Rounds", cost: 120, critChanceBonus: 0.1, damageBonus: 3 },
    ],
    pathB: [
      { name: "Spray Nozzle", cost: 35, projectilesPerShotBonus: 1 },
      { name: "Cooling Belt", cost: 50, attackSpeedBonus: 0.34 },
      { name: "Spray Nozzle II", cost: 70, projectilesPerShotBonus: 1 },
      { name: "Pressure Feed", cost: 95, attackSpeedBonus: 0.46 },
      { name: "Suppressive Core", cost: 130, damageBonus: 4, attackSpeedBonus: 0.22 },
    ],
  },
});

export const SNIPER_TOWER_TEMPLATE = Object.freeze({
  type: "Sniper Tower",
  damage: 95,
  attackSpeed: 0.45,
  range: 260,
  cost: 120,
  color: "#6ba9bb",
  size: 17,
  spriteKey: "sniper",
  projectileSpriteKey: "crystal",
  upgradePaths: {
    pathA: [
      { name: "Execution Mark I", cost: 70, executeThresholdBonus: 0.07 },
      { name: "Caliber Boost", cost: 95, damageBonus: 34 },
      { name: "Execution Mark II", cost: 125, executeThresholdBonus: 0.08 },
      { name: "Killshot Chamber", cost: 165, executeThresholdBonus: 0.1, damageBonus: 20 },
      { name: "Execution Mark III", cost: 220, executeThresholdBonus: 0.1, damageBonus: 45 },
    ],
    pathB: [
      { name: "Deadeye Scope I", cost: 75, rangeBonus: 34 },
      { name: "Charged Lens", cost: 100, critChanceBonus: 0.08 },
      { name: "Deadeye Scope II", cost: 135, rangeBonus: 48 },
      { name: "Split Rail", cost: 180, projectilesPerShotBonus: 1 },
      { name: "Deadeye Scope III", cost: 240, rangeBonus: 68, critChanceBonus: 0.08 },
    ],
  },
});

export const CANNON_TOWER_TEMPLATE = Object.freeze({
  type: "Cannon Tower",
  damage: 48,
  attackSpeed: 1.3,
  range: 155,
  cost: 75,
  color: "#cf8655",
  size: 20,
  spriteKey: "cannon",
  projectileSpriteKey: "cannonball",
  upgradePaths: {
    pathA: [
      {
        name: "Explosive Shell I",
        cost: 50,
        splashRadiusBonus: 40,
        splashDamageMultiplierBonus: 0.18,
      },
      { name: "Payload Compression", cost: 70, damageBonus: 14 },
      {
        name: "Explosive Shell II",
        cost: 95,
        splashRadiusBonus: 46,
        splashDamageMultiplierBonus: 0.2,
      },
      { name: "Blast Reactor", cost: 125, splashDamageMultiplierBonus: 0.16 },
      {
        name: "Explosive Shell III",
        cost: 165,
        splashRadiusBonus: 52,
        splashDamageMultiplierBonus: 0.22,
      },
    ],
    pathB: [
      { name: "Cluster Chamber", cost: 55, projectilesPerShotBonus: 1 },
      { name: "Quick Fuse", cost: 75, attackSpeedBonus: 0.22 },
      { name: "Cluster Chamber II", cost: 100, projectilesPerShotBonus: 1 },
      { name: "Shock Fragments", cost: 135, splashRadiusBonus: 24, splashDamageMultiplierBonus: 0.1 },
      { name: "Quick Fuse II", cost: 175, attackSpeedBonus: 0.3, damageBonus: 12 },
    ],
  },
});

export const TOWER_TEMPLATES = Object.freeze({
  basic: BASIC_TOWER_TEMPLATE,
  machineGun: MACHINE_GUN_TOWER_TEMPLATE,
  sniper: SNIPER_TOWER_TEMPLATE,
  cannon: CANNON_TOWER_TEMPLATE,
});

export class TowerManager {
  constructor(mapManager, spriteStore = null) {
    this.mapManager = mapManager;
    this.towers = [];
    this.spriteStore = spriteStore;
  }

  setSpriteStore(spriteStore) {
    this.spriteStore = spriteStore;
    for (const tower of this.towers) {
      tower.setSpriteStore(spriteStore);
    }
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

    const towerElevation =
      this.mapManager.getTileType(row, col) === TILE_TYPES.MOUNTAIN
        ? "mountain"
        : "ground";
    const rangeMultiplier =
      towerElevation === "mountain" ? MOUNTAIN_RANGE_MULTIPLIER : 1;

    const tower = new Tower({
      ...towerTemplate,
      row,
      col,
      x,
      y,
      elevation: towerElevation,
      range: towerTemplate.range * rangeMultiplier,
      spriteStore: this.spriteStore,
    });

    this.towers.push(tower);
    return tower;
  }

  getTowerAtWorldPosition(x, y) {
    return this.towers.find((tower) => tower.containsPoint(x, y)) ?? null;
  }

  update(deltaMs, enemies) {
    for (const tower of this.towers) {
      tower.update(deltaMs, enemies, this.mapManager);
    }
  }

  draw(ctx, hoveredTowerId = null) {
    for (const tower of this.towers) {
      tower.draw(ctx, tower.id === hoveredTowerId);
    }
  }
}
