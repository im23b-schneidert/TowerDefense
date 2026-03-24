import { TILE_CONFIG, TILE_TYPES } from "./config/map.js";

export class MapManager {
  constructor(layout, tileSize = 64) {
    this.layout = layout;
    this.tileSize = tileSize;
    this.rows = layout.length;
    this.cols = layout[0]?.length ?? 0;

    if (this.rows === 0 || this.cols === 0) {
      throw new Error("Map layout must contain at least one row and one column.");
    }
  }

  getWidthPx() {
    return this.cols * this.tileSize;
  }

  getHeightPx() {
    return this.rows * this.tileSize;
  }

  isInsideGrid(row, col) {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
  }

  getTileType(row, col) {
    if (!this.isInsideGrid(row, col)) return null;
    return this.layout[row][col];
  }

  getTileData(row, col) {
    const tileType = this.getTileType(row, col);
    if (tileType === null) return null;
    return TILE_CONFIG[tileType] ?? TILE_CONFIG[TILE_TYPES.GRASS];
  }

  isTilePlaceable(row, col) {
    const tileData = this.getTileData(row, col);
    return tileData?.placeable ?? false;
  }

  doesTileBlockProjectiles(row, col) {
    const tileData = this.getTileData(row, col);
    return tileData?.blocksProjectiles ?? true;
  }

  worldToGrid(x, y) {
    return {
      row: Math.floor(y / this.tileSize),
      col: Math.floor(x / this.tileSize),
    };
  }

  draw(ctx) {
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        const tileType = this.layout[row][col];
        const tileData = TILE_CONFIG[tileType] ?? TILE_CONFIG[TILE_TYPES.GRASS];

        const x = col * this.tileSize;
        const y = row * this.tileSize;

        ctx.fillStyle = tileData.color;
        ctx.fillRect(x, y, this.tileSize, this.tileSize);

        // Subtle inner pattern so tile differences read clearly.
        if (tileType === TILE_TYPES.WATER) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
          ctx.fillRect(x + 8, y + 8, this.tileSize - 16, 4);
          ctx.fillRect(x + 12, y + 18, this.tileSize - 24, 4);
        }

        if (tileType === TILE_TYPES.HILL) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
          ctx.beginPath();
          ctx.moveTo(x + 8, y + this.tileSize - 8);
          ctx.lineTo(x + this.tileSize / 2, y + 10);
          ctx.lineTo(x + this.tileSize - 8, y + this.tileSize - 8);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    this.drawGridLines(ctx);
  }

  drawGridLines(ctx) {
    ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
    ctx.lineWidth = 1;

    for (let row = 0; row <= this.rows; row += 1) {
      const y = row * this.tileSize + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.getWidthPx(), y);
      ctx.stroke();
    }

    for (let col = 0; col <= this.cols; col += 1) {
      const x = col * this.tileSize + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.getHeightPx());
      ctx.stroke();
    }
  }
}
