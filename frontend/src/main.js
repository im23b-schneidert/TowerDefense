import { MAP_LAYOUT } from "./config/map.js";
import { MapManager } from "./MapManager.js";
import { BASIC_TOWER_TEMPLATE, TowerManager } from "./towers/TowerManager.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const mapManager = new MapManager(MAP_LAYOUT, 64);
const towerManager = new TowerManager(mapManager);
canvas.width = mapManager.getWidthPx();
canvas.height = mapManager.getHeightPx();

let currency = 150;
let hoveredTowerId = null;

// Placeholder enemy list so targeting method can be exercised.
const enemies = [
  { id: "debug-enemy-1", x: 300, y: 180 },
  { id: "debug-enemy-2", x: 560, y: 420 },
];

let lastFrameTime = performance.now();

function gameLoop(now) {
  const deltaMs = now - lastFrameTime;
  lastFrameTime = now;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  mapManager.draw(ctx);
  towerManager.update(deltaMs, enemies);
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
  ctx.fillRect(8, 8, 188, 52);

  ctx.fillStyle = "#f3f4f6";
  ctx.font = "16px Arial";
  ctx.fillText(`Gold: ${currency}`, 16, 30);
  ctx.font = "13px Arial";
  ctx.fillText(`Basic Tower Cost: ${BASIC_TOWER_TEMPLATE.cost}`, 16, 48);
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
  if (currency < cost) {
    console.log("Not enough currency to place Basic Tower");
    return;
  }

  const tower = towerManager.placeTower(row, col, BASIC_TOWER_TEMPLATE);
  if (!tower) return;

  currency -= cost;
  console.log(
    `Placed ${tower.type} at [${row}, ${col}] | Remaining gold: ${currency}`,
  );
});

requestAnimationFrame(gameLoop);
