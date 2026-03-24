export const TILE_TYPES = Object.freeze({
  GRASS: 0,
  PATH: 1,
  WATER: 2,
  HILL: 3,
});

export const TILE_CONFIG = Object.freeze({
  [TILE_TYPES.GRASS]: {
    name: "Grass",
    color: "#5ea95e",
    placeable: true,
    enemyWalkable: false,
    blocksProjectiles: false,
  },
  [TILE_TYPES.PATH]: {
    name: "Path",
    color: "#b08968",
    placeable: false,
    enemyWalkable: true,
    blocksProjectiles: false,
  },
  [TILE_TYPES.WATER]: {
    name: "Water",
    color: "#2f6aa1",
    placeable: false,
    enemyWalkable: false,
    blocksProjectiles: false,
  },
  [TILE_TYPES.HILL]: {
    name: "Hill",
    color: "#656565",
    placeable: false,
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
