import { MAP_LAYOUT } from "./config/map.js";
import { MapManager } from "./MapManager.js";
import {
  ENEMY_TEMPLATES,
  EnemyManager,
} from "./enemies/EnemyManager.js";
import { Player } from "./state/Player.js";
import { TOWER_TEMPLATES, TowerManager } from "./towers/TowerManager.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const shopButtons = Array.from(document.querySelectorAll(".shop-button"));
const restartButton = document.getElementById("restartButton");

const mapManager = new MapManager(MAP_LAYOUT, 64);
const towerManager = new TowerManager(mapManager);
const pathWaypoints = mapManager.getPathWaypoints();
const enemyManager = new EnemyManager(pathWaypoints, Player);
canvas.width = mapManager.getWidthPx();
canvas.height = mapManager.getHeightPx();

let hoveredTowerId = null;
let hoveredGrid = null;
let enemySpawnTimerMs = 0;
const ENEMY_SPAWN_INTERVAL_MS = 2200;
let selectedTowerType = null;
let isGameOver = false;

let lastFrameTime = performance.now();
const enemySpawnPool = Object.values(ENEMY_TEMPLATES);

function getSelectedTowerTemplate() {
  if (!selectedTowerType) return null;
  return TOWER_TEMPLATES[selectedTowerType] ?? null;
}

function setSelectedTowerType(type) {
  selectedTowerType = type;
  for (const button of shopButtons) {
    const isSelected = button.dataset.towerType === selectedTowerType;
    button.classList.toggle("selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  }
}

function getRandomEnemyTemplate() {
  const index = Math.floor(Math.random() * enemySpawnPool.length);
  return enemySpawnPool[index];
}

function gameLoop(now) {
  if (isGameOver) {
    renderGameOver();
    return;
  }

  const deltaMs = now - lastFrameTime;
  lastFrameTime = now;

  enemySpawnTimerMs -= deltaMs;
  if (enemySpawnTimerMs <= 0) {
    enemyManager.spawnEnemy(getRandomEnemyTemplate());
    enemySpawnTimerMs = ENEMY_SPAWN_INTERVAL_MS;
  }

  towerManager.update(deltaMs, enemyManager.enemies);
  enemyManager.update(deltaMs);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  mapManager.draw(ctx);
  drawGhostPreview();
  enemyManager.draw(ctx);
  towerManager.draw(ctx, hoveredTowerId);
  drawHud();

  if (Player.hp <= 0) {
    isGameOver = true;
    restartButton.hidden = false;
    renderGameOver();
    return;
  }

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
  ctx.fillRect(8, 8, 260, 88);

  ctx.fillStyle = "#f3f4f6";
  ctx.font = "16px Arial";
  ctx.fillText(`HP: ${Player.hp}`, 16, 28);
  ctx.fillText(`Gold: ${Player.gold}`, 16, 48);
  ctx.font = "13px Arial";
  ctx.fillText(
    `Build Cost: ${getSelectedTowerTemplate()?.cost ?? "-"} (select in menu)`,
    16,
    66,
  );
  ctx.fillText(
    `Selected: ${getSelectedTowerTemplate()?.type ?? "None (Esc/Right Click)"}`,
    16,
    84,
  );
  ctx.restore();
}

function drawGhostPreview() {
  const selectedTemplate = getSelectedTowerTemplate();
  if (!selectedTemplate || !hoveredGrid) return;

  if (!mapManager.isInsideGrid(hoveredGrid.row, hoveredGrid.col)) return;

  const canPlace =
    towerManager.canPlaceTower(hoveredGrid.row, hoveredGrid.col) &&
    Player.gold >= selectedTemplate.cost;

  const center = mapManager.gridToWorldCenter(hoveredGrid.row, hoveredGrid.col);
  const towerColor = canPlace ? "rgba(249, 250, 251, 0.45)" : "rgba(248, 113, 113, 0.50)";
  const rangeColor = canPlace ? "rgba(255, 255, 255, 0.18)" : "rgba(248, 113, 113, 0.15)";

  ctx.save();
  ctx.fillStyle = rangeColor;
  ctx.beginPath();
  ctx.arc(center.x, center.y, selectedTemplate.range, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = towerColor;
  ctx.beginPath();
  ctx.arc(center.x, center.y, selectedTemplate.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderGameOver() {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "bold 52px Arial";
  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = "20px Arial";
  ctx.fillText("Press Restart to play again", canvas.width / 2, canvas.height / 2 + 20);
  ctx.restore();
}

canvas.addEventListener("mousemove", (event) => {
  const { x, y } = getMousePositionOnCanvas(event);
  hoveredGrid = mapManager.worldToGrid(x, y);
  const hoveredTower = towerManager.getTowerAtWorldPosition(x, y);
  hoveredTowerId = hoveredTower?.id ?? null;
});

canvas.addEventListener("mouseleave", () => {
  hoveredTowerId = null;
  hoveredGrid = null;
});

canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  setSelectedTowerType(null);
});

canvas.addEventListener("click", (event) => {
  if (isGameOver) return;

  const { x, y } = getMousePositionOnCanvas(event);
  const { row, col } = mapManager.worldToGrid(x, y);
  const selectedTemplate = getSelectedTowerTemplate();

  if (!selectedTemplate) {
    console.log("Select a tower in the build menu first.");
    return;
  }

  if (!mapManager.isInsideGrid(row, col)) return;

  if (!towerManager.canPlaceTower(row, col)) {
    console.log(`Cannot place tower at [${row}, ${col}]`);
    return;
  }

  const cost = selectedTemplate.cost;
  if (Player.gold < cost) {
    console.log("Not enough currency to place selected tower");
    return;
  }

  const tower = towerManager.placeTower(row, col, selectedTemplate);
  if (!tower) return;

  Player.gold -= cost;
  console.log(
    `Placed ${tower.type} at [${row}, ${col}] | Remaining gold: ${Player.gold}`,
  );
});

for (const button of shopButtons) {
  const type = button.dataset.towerType;
  const template = TOWER_TEMPLATES[type];

  if (template) {
    button.title = `Damage: ${template.damage} | Speed: ${template.attackSpeed}/s | Range: ${template.range} | Cost: ${template.cost}`;
  }

  button.addEventListener("click", () => {
    setSelectedTowerType(selectedTowerType === type ? null : type);
  });
}

restartButton.addEventListener("click", () => {
  window.location.reload();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setSelectedTowerType(null);
  }
});

requestAnimationFrame(gameLoop);
