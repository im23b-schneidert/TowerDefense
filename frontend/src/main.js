import { MAP_LAYOUT } from "./config/map.js";
import { MapManager } from "./MapManager.js";
import { BASIC_ENEMY_TEMPLATE, EnemyManager } from "./enemies/EnemyManager.js";
import { Player } from "./state/Player.js";
import { BASIC_TOWER_TEMPLATE, TowerManager } from "./towers/TowerManager.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const mapManager = new MapManager(MAP_LAYOUT, 64);
const towerManager = new TowerManager(mapManager);
const pathWaypoints = mapManager.getPathWaypoints();
const enemyManager = new EnemyManager(pathWaypoints, Player);
canvas.width = mapManager.getWidthPx();
canvas.height = mapManager.getHeightPx();

let hoveredTowerId = null;
let enemySpawnTimerMs = 0;
const ENEMY_SPAWN_INTERVAL_MS = 2200;

let lastFrameTime = performance.now();

function gameLoop(now) {
  const deltaMs = now - lastFrameTime;
  lastFrameTime = now;

  enemySpawnTimerMs -= deltaMs;
  if (enemySpawnTimerMs <= 0) {
    enemyManager.spawnEnemy(BASIC_ENEMY_TEMPLATE);
    enemySpawnTimerMs = ENEMY_SPAWN_INTERVAL_MS;
  }

  towerManager.update(deltaMs, enemyManager.enemies);
  enemyManager.update(deltaMs);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  mapManager.draw(ctx);
  enemyManager.draw(ctx);
  towerManager.draw(ctx, hoveredTowerId);
  drawHud();
  requestAnimationFrame(gameLoop);
}

function getMousePositionOnCanvas(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function drawHud() {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(8, 8, 220, 72);

  ctx.fillStyle = "#f3f4f6";
  ctx.font = "16px Arial";
  ctx.fillText(`HP: ${Player.hp}`, 16, 28);
  ctx.fillText(`Gold: ${Player.gold}`, 16, 48);
  ctx.font = "13px Arial";
  ctx.fillText(`Basic Tower Cost: ${BASIC_TOWER_TEMPLATE.cost}`, 16, 66);
  ctx.restore();
}

canvas.addEventListener("mousemove", (event) => {
  const { x, y } = getMousePositionOnCanvas(event);
  const hoveredTower = towerManager.getTowerAtWorldPosition(x, y);
  hoveredTowerId = hoveredTower?.id ?? null;
});

canvas.addEventListener("mouseleave", () => {
  hoveredTowerId = null;
});

canvas.addEventListener("click", (event) => {
  const { x, y } = getMousePositionOnCanvas(event);
  const { row, col } = mapManager.worldToGrid(x, y);

  if (!mapManager.isInsideGrid(row, col)) return;

  if (!towerManager.canPlaceTower(row, col)) {
    console.log(`Cannot place tower at [${row}, ${col}]`);
    return;
  }

  const cost = BASIC_TOWER_TEMPLATE.cost;
  if (Player.gold < cost) {
    console.log("Not enough currency to place Basic Tower");
    return;
  }

  const tower = towerManager.placeTower(row, col, BASIC_TOWER_TEMPLATE);
  if (!tower) return;

  Player.gold -= cost;
  console.log(
    `Placed ${tower.type} at [${row}, ${col}] | Remaining gold: ${Player.gold}`,
  );
});

requestAnimationFrame(gameLoop);
