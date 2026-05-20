import { Enemy } from "./Enemy.js";

export const BASIC_ENEMY_TEMPLATE = Object.freeze({
  type: "Basic Enemy",
  hp: 70,
  speed: 75,
  damage: 10,
  gold: 20,
  color: "#bb7a66",
  radius: 12,
  shape: "circle",
  spriteKey: "basic",
});

export const FAST_ENEMY_TEMPLATE = Object.freeze({
  type: "Fast Enemy",
  hp: 50,
  speed: BASIC_ENEMY_TEMPLATE.speed * 2,
  damage: 6,
  gold: 10,
  color: "#8fb67f",
  radius: 10,
  shape: "diamond",
  spriteKey: "fast",
});

export const TANK_ENEMY_TEMPLATE = Object.freeze({
  type: "Tank Enemy",
  hp: 300,
  speed: BASIC_ENEMY_TEMPLATE.speed * 0.5,
  damage: 20,
  gold: 45,
  color: "#7a4a41",
  radius: 15,
  shape: "square",
  spriteKey: "tank",
});

export const ENEMY_TEMPLATES = Object.freeze({
  basic: BASIC_ENEMY_TEMPLATE,
  fast: FAST_ENEMY_TEMPLATE,
  tank: TANK_ENEMY_TEMPLATE,
});

export class EnemyManager {
  constructor(pathWaypoints, player, spriteStore = null) {
    this.pathWaypoints = pathWaypoints;
    this.player = player;
    this.enemies = [];
    this.spriteStore = spriteStore;
  }

  setSpriteStore(spriteStore) {
    this.spriteStore = spriteStore;
  }

  spawnEnemy(enemyTemplate) {
    if (this.pathWaypoints.length === 0) return null;

    const enemy = new Enemy({
      ...enemyTemplate,
      pathWaypoints: this.pathWaypoints,
      spriteStore: this.spriteStore,
    });

    this.enemies.push(enemy);
    return enemy;
  }

  update(deltaMs) {
    for (const enemy of this.enemies) {
      enemy.update(deltaMs);
    }

    const survivors = [];
    for (const enemy of this.enemies) {
      if (enemy.hasReachedGoal) {
        this.player.hp = Math.max(0, this.player.hp - enemy.currentStats.damage);
        console.log(
          `${enemy.type} reached goal, player loses ${enemy.currentStats.damage} HP`,
        );
        continue;
      }

      if (enemy.isDead) {
        this.player.gold += enemy.currentStats.gold;
        console.log(
          `${enemy.type} defeated, player gains ${enemy.currentStats.gold} gold`,
        );
        continue;
      }

      survivors.push(enemy);
    }

    this.enemies = survivors;
  }

  draw(ctx) {
    for (const enemy of this.enemies) {
      enemy.draw(ctx);
    }
  }
}
