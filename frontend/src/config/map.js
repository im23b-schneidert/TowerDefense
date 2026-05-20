export const TILE_TYPES = Object.freeze({
  GRASS: 0,
  PATH: 1,
  WATER: 2,
  MOUNTAIN: 3,
  // Legacy alias so older references do not break.
  HILL: 3,
});

export const TILE_CONFIG = Object.freeze({
  [TILE_TYPES.GRASS]: {
    name: "Grass",
    color: "#4a6a3d",
    spriteKey: "grass",
    placeable: true,
    enemyWalkable: false,
    blocksProjectiles: false,
  },
  [TILE_TYPES.PATH]: {
    name: "Path",
    color: "#96724d",
    spriteKey: "path",
    placeable: false,
    enemyWalkable: true,
    blocksProjectiles: false,
  },
  [TILE_TYPES.WATER]: {
    name: "Water",
    color: "#2e6674",
    spriteKey: "water",
    placeable: false,
    enemyWalkable: false,
    blocksProjectiles: false,
  },
  [TILE_TYPES.MOUNTAIN]: {
    name: "Mountain",
    color: "#56615d",
    spriteKey: "mountain",
    placeable: true,
    enemyWalkable: false,
    blocksProjectiles: true,
  },
});

// Change this 2D array to quickly reshape your level.
export const MAP_LAYOUT = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 1, 0, 2, 2, 0, 3, 0],
  [0, 0, 0, 0, 0, 1, 0, 2, 2, 0, 3, 0],
  [3, 3, 0, 2, 0, 1, 2, 0, 0, 0, 3, 0],
  [0, 0, 0, 2, 0, 1, 1, 1, 1, 0, 0, 0],
  [0, 2, 2, 2, 0, 3, 3, 0, 1, 0, 2, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 2, 0],
  [0, 3, 3, 0, 0, 0, 0, 0, 1, 1, 1, 1],
];
