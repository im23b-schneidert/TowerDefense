import grassTileUrl from "./tiles/grass.svg";
import pathTileUrl from "./tiles/path.svg";
import waterTileUrl from "./tiles/water.svg";
import mountainTileUrl from "./tiles/mountain.svg";
import basicTowerUrl from "./towers/basic.svg";
import machineGunTowerUrl from "./towers/machineGun.svg";
import sniperTowerUrl from "./towers/sniper.svg";
import cannonTowerUrl from "./towers/cannon.svg";
import basicEnemyUrl from "./enemies/basic.svg";
import fastEnemyUrl from "./enemies/fast.svg";
import tankEnemyUrl from "./enemies/tank.svg";
import boltProjectileUrl from "./projectiles/bolt.svg";
import shotProjectileUrl from "./projectiles/shot.svg";
import crystalProjectileUrl from "./projectiles/crystal.svg";
import cannonballProjectileUrl from "./projectiles/cannonball.svg";

const SPRITE_URLS = Object.freeze({
  tiles: Object.freeze({
    grass: grassTileUrl,
    path: pathTileUrl,
    water: waterTileUrl,
    mountain: mountainTileUrl,
  }),
  towers: Object.freeze({
    basic: basicTowerUrl,
    machineGun: machineGunTowerUrl,
    sniper: sniperTowerUrl,
    cannon: cannonTowerUrl,
  }),
  enemies: Object.freeze({
    basic: basicEnemyUrl,
    fast: fastEnemyUrl,
    tank: tankEnemyUrl,
  }),
  projectiles: Object.freeze({
    bolt: boltProjectileUrl,
    shot: shotProjectileUrl,
    crystal: crystalProjectileUrl,
    cannonball: cannonballProjectileUrl,
  }),
});

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
    image.src = url;
  });
}

async function loadCategory(categoryUrls) {
  const entries = Object.entries(categoryUrls);
  const loadedEntries = await Promise.all(
    entries.map(async ([key, url]) => {
      try {
        const image = await loadImage(url);
        return [key, image];
      } catch {
        return [key, null];
      }
    }),
  );
  return Object.fromEntries(loadedEntries);
}

export async function loadSpriteCatalog() {
  const [tiles, towers, enemies, projectiles] = await Promise.all([
    loadCategory(SPRITE_URLS.tiles),
    loadCategory(SPRITE_URLS.towers),
    loadCategory(SPRITE_URLS.enemies),
    loadCategory(SPRITE_URLS.projectiles),
  ]);

  return Object.freeze({
    tiles: Object.freeze(tiles),
    towers: Object.freeze(towers),
    enemies: Object.freeze(enemies),
    projectiles: Object.freeze(projectiles),
  });
}
