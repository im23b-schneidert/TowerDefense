import { TILE_CONFIG, TILE_TYPES } from "./config/map.js";
import { FANTASY_THEME } from "./theme/fantasyTheme.js";

export class MapManager {
  constructor(layout, tileSize = 64) {
    this.layout = layout;
    this.tileSize = tileSize;
    this.rows = layout.length;
    this.cols = layout[0]?.length ?? 0;

    if (this.rows === 0 || this.cols === 0) {
      throw new Error("Map layout must contain at least one row and one column.");
    }

    this.sprites = null;
  }

  setSpriteStore(spriteStore) {
    this.sprites = spriteStore ?? null;
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

  isMountainTile(row, col) {
    return this.getTileType(row, col) === TILE_TYPES.MOUNTAIN;
  }

  worldToGrid(x, y) {
    return {
      row: Math.floor(y / this.tileSize),
      col: Math.floor(x / this.tileSize),
    };
  }

  gridToWorldCenter(row, col) {
    return {
      x: col * this.tileSize + this.tileSize / 2,
      y: row * this.tileSize + this.tileSize / 2,
    };
  }

  getPathWaypoints() {
    const pathTiles = [];
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        if (this.layout[row][col] === TILE_TYPES.PATH) {
          pathTiles.push({ row, col });
        }
      }
    }

    if (pathTiles.length === 0) return [];

    const pathSet = new Set(pathTiles.map((tile) => `${tile.row},${tile.col}`));
    const getNeighbors = (row, col) => {
      const candidates = [
        { row: row - 1, col },
        { row: row + 1, col },
        { row, col: col - 1 },
        { row, col: col + 1 },
      ];

      return candidates.filter((tile) => pathSet.has(`${tile.row},${tile.col}`));
    };

    const endpoints = pathTiles.filter(
      (tile) => getNeighbors(tile.row, tile.col).length === 1,
    );

    const startTile = endpoints[0] ?? pathTiles[0];
    const orderedTiles = [startTile];
    const visited = new Set([`${startTile.row},${startTile.col}`]);

    while (orderedTiles.length < pathTiles.length) {
      const current = orderedTiles[orderedTiles.length - 1];
      const next = getNeighbors(current.row, current.col).find(
        (tile) => !visited.has(`${tile.row},${tile.col}`),
      );

      if (!next) break;

      orderedTiles.push(next);
      visited.add(`${next.row},${next.col}`);
    }

    return orderedTiles.map((tile) => ({
      row: tile.row,
      col: tile.col,
      ...this.gridToWorldCenter(tile.row, tile.col),
    }));
  }

  draw(ctx) {
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        const tileType = this.layout[row][col];
        const tileData = TILE_CONFIG[tileType] ?? TILE_CONFIG[TILE_TYPES.GRASS];
        const spriteKey =
          tileData.spriteKey ??
          (tileType === TILE_TYPES.PATH
            ? "path"
            : tileType === TILE_TYPES.WATER
              ? "water"
              : tileType === TILE_TYPES.MOUNTAIN
                ? "mountain"
                : "grass");
        const tileSprite = this.sprites?.tiles?.[spriteKey] ?? null;

        const x = col * this.tileSize;
        const y = row * this.tileSize;

        if (tileSprite) {
          ctx.drawImage(tileSprite, x, y, this.tileSize, this.tileSize);
        } else {
          ctx.fillStyle = tileData.color;
          ctx.fillRect(x, y, this.tileSize, this.tileSize);
        }

        if (!tileSprite && tileType === TILE_TYPES.WATER) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
          ctx.fillRect(x + 8, y + 8, this.tileSize - 16, 4);
          ctx.fillRect(x + 12, y + 18, this.tileSize - 24, 4);
        }

        if (!tileSprite && tileType === TILE_TYPES.MOUNTAIN) {
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
    ctx.strokeStyle = "rgba(27, 18, 12, 0.34)";
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

    ctx.strokeStyle = FANTASY_THEME.overlays.rangeStroke;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(0.7, 0.7, this.getWidthPx() - 1.4, this.getHeightPx() - 1.4);
  }
}
