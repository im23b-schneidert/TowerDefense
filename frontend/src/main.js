import { MAP_LAYOUT } from "./config/map.js";
import { MapManager } from "./MapManager.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const mapManager = new MapManager(MAP_LAYOUT, 64);
canvas.width = mapManager.getWidthPx();
canvas.height = mapManager.getHeightPx();

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  mapManager.draw(ctx);
  requestAnimationFrame(gameLoop);
}

canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  const { row, col } = mapManager.worldToGrid(mouseX, mouseY);

  if (!mapManager.isInsideGrid(row, col)) return;

  const placeable = mapManager.isTilePlaceable(row, col);
  const blocksProjectiles = mapManager.doesTileBlockProjectiles(row, col);

  console.log(
    `Tile [${row}, ${col}] -> placeable=${placeable}, blocksProjectiles=${blocksProjectiles}`,
  );
});

gameLoop();
