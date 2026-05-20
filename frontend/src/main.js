import { MAP_LAYOUT } from "./config/map.js";
import { hasLineOfSight } from "./combat/lineOfSight.js";
import { MapManager } from "./MapManager.js";
import { loadSpriteCatalog } from "./assets/sprites/spriteCatalog.js";
import {
  ENEMY_TEMPLATES,
  EnemyManager,
} from "./enemies/EnemyManager.js";
import { Player } from "./state/Player.js";
import { FANTASY_THEME } from "./theme/fantasyTheme.js";
import {
  MOUNTAIN_RANGE_MULTIPLIER,
  TOWER_TEMPLATES,
  TowerManager,
} from "./towers/TowerManager.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const shopButtons = Array.from(document.querySelectorAll(".shop-button"));
const gameOverPanel = document.getElementById("gameOverPanel");
const replayButton = document.getElementById("replayButton");
const backToMenuButton = document.getElementById("backToMenuButton");
const gameOverWaveValue = document.getElementById("gameOverWaveValue");
const gameOverDifficultyValue = document.getElementById("gameOverDifficultyValue");
const gameOverHighScoreValue = document.getElementById("gameOverHighScoreValue");
const playButton = document.getElementById("playButton");
const howToPlayButton = document.getElementById("howToPlayButton");
const startScreen = document.getElementById("startScreen");
const startHelp = document.getElementById("startHelp");
const difficultyButtons = Array.from(document.querySelectorAll(".difficulty-option"));
const hpValue = document.getElementById("hpValue");
const goldValue = document.getElementById("goldValue");
const waveValue = document.getElementById("waveValue");
const buildCostValue = document.getElementById("buildCostValue");
const difficultyValue = document.getElementById("difficultyValue");
const waveStatusValue = document.getElementById("waveStatusValue");
const waveStartButton = document.getElementById("waveStartButton");
const autoStartRoundsToggle = document.getElementById("autoStartRoundsToggle");
const selectionValue = document.getElementById("selectionValue");
const upgradeTowerLabel = document.getElementById("upgradeTowerLabel");
const upgradePathAButton = document.getElementById("upgradePathAButton");
const upgradePathBButton = document.getElementById("upgradePathBButton");

const mapManager = new MapManager(MAP_LAYOUT, 64);
const towerManager = new TowerManager(mapManager);
const pathWaypoints = mapManager.getPathWaypoints();
const enemyManager = new EnemyManager(pathWaypoints, Player);
canvas.width = mapManager.getWidthPx();
canvas.height = mapManager.getHeightPx();

let hoveredTowerId = null;
let selectedTowerId = null;
let hoveredGrid = null;
let enemySpawnTimerMs = 0;
const DIFFICULTY_CONFIG = Object.freeze({
  easy: Object.freeze({
    label: "Easy",
    baseEnemiesPerWave: 6,
    enemiesPerWaveGrowth: 2,
    spawnBaseMs: 2200,
    spawnReductionPerWaveMs: 120,
    minSpawnMs: 700,
    hpGrowthPerWave: 0.18,
    speedGrowthPerWave: 0.03,
    speedCapMultiplier: 2.1,
    damageGrowthPerWave: 0.12,
    goldGrowthPerWave: 0.08,
    basicWeightStart: 58,
    basicWeightDropPerWave: 2,
    basicWeightMin: 16,
    fastWeightStart: 22,
    fastWeightRisePerWave: 2,
    fastWeightMax: 42,
    tankWeightUnlockOffset: 2,
    tankWeightRisePerWave: 4,
  }),
  medium: Object.freeze({
    label: "Medium",
    baseEnemiesPerWave: 8,
    enemiesPerWaveGrowth: 3,
    spawnBaseMs: 1900,
    spawnReductionPerWaveMs: 140,
    minSpawnMs: 550,
    hpGrowthPerWave: 0.26,
    speedGrowthPerWave: 0.045,
    speedCapMultiplier: 2.45,
    damageGrowthPerWave: 0.17,
    goldGrowthPerWave: 0.1,
    basicWeightStart: 52,
    basicWeightDropPerWave: 2.5,
    basicWeightMin: 8,
    fastWeightStart: 28,
    fastWeightRisePerWave: 2.2,
    fastWeightMax: 48,
    tankWeightUnlockOffset: 1,
    tankWeightRisePerWave: 6,
  }),
  hard: Object.freeze({
    label: "Hard",
    baseEnemiesPerWave: 10,
    enemiesPerWaveGrowth: 4,
    spawnBaseMs: 1650,
    spawnReductionPerWaveMs: 170,
    minSpawnMs: 420,
    hpGrowthPerWave: 0.34,
    speedGrowthPerWave: 0.06,
    speedCapMultiplier: 2.8,
    damageGrowthPerWave: 0.22,
    goldGrowthPerWave: 0.12,
    basicWeightStart: 46,
    basicWeightDropPerWave: 3,
    basicWeightMin: 4,
    fastWeightStart: 32,
    fastWeightRisePerWave: 2.6,
    fastWeightMax: 52,
    tankWeightUnlockOffset: 0,
    tankWeightRisePerWave: 8,
  }),
});
let selectedTowerType = null;
const GAME_STATE = Object.freeze({
  MENU: "menu",
  PLAYING: "playing",
  GAME_OVER: "game-over",
});
const HIGHSCORE_STORAGE_KEY = "towerDefenseHighestWaveByDifficulty";
const AUTO_START_ROUNDS_STORAGE_KEY = "towerDefenseAutoStartRounds";
const DIFFICULTY = Object.freeze({
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
});
const BASE_PLAYER_STATS = Object.freeze({ hp: 100, gold: 200 });
let gameState = GAME_STATE.MENU;
let animationFrameId = null;
let currentWave = 0;
let pendingWave = 1;
let enemiesToSpawnThisWave = 0;
let enemiesSpawnedThisWave = 0;
let isWaveInProgress = false;
let selectedDifficulty = DIFFICULTY.EASY;
let bestWavesByDifficulty = loadBestWavesByDifficulty();
let autoStartRoundsEnabled = loadAutoStartRoundsEnabled();

let lastFrameTime = performance.now();

function loadBestWavesByDifficulty() {
  const defaults = {
    [DIFFICULTY.EASY]: 0,
    [DIFFICULTY.MEDIUM]: 0,
    [DIFFICULTY.HARD]: 0,
  };

  try {
    const raw = localStorage.getItem(HIGHSCORE_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      [DIFFICULTY.EASY]: Number.isFinite(parsed?.[DIFFICULTY.EASY])
        ? Math.max(0, Math.floor(parsed[DIFFICULTY.EASY]))
        : 0,
      [DIFFICULTY.MEDIUM]: Number.isFinite(parsed?.[DIFFICULTY.MEDIUM])
        ? Math.max(0, Math.floor(parsed[DIFFICULTY.MEDIUM]))
        : 0,
      [DIFFICULTY.HARD]: Number.isFinite(parsed?.[DIFFICULTY.HARD])
        ? Math.max(0, Math.floor(parsed[DIFFICULTY.HARD]))
        : 0,
    };
  } catch {
    return defaults;
  }
}

function saveBestWavesByDifficulty() {
  localStorage.setItem(HIGHSCORE_STORAGE_KEY, JSON.stringify(bestWavesByDifficulty));
}

function loadAutoStartRoundsEnabled() {
  try {
    return localStorage.getItem(AUTO_START_ROUNDS_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function saveAutoStartRoundsEnabled(value) {
  autoStartRoundsEnabled = value;
  autoStartRoundsToggle.checked = value;
  try {
    localStorage.setItem(AUTO_START_ROUNDS_STORAGE_KEY, value ? "true" : "false");
  } catch {
    // Ignore persistence errors; runtime toggle still works.
  }
}

function getBestWaveForDifficulty(difficulty) {
  return bestWavesByDifficulty[difficulty] ?? 0;
}

function setBestWaveForDifficulty(difficulty, wave) {
  const previous = getBestWaveForDifficulty(difficulty);
  const bestWave = Math.max(previous, Math.max(0, Math.floor(wave)));
  if (bestWave === previous) return;
  bestWavesByDifficulty[difficulty] = bestWave;
  saveBestWavesByDifficulty();
}

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

function getSelectedTowerForUpgrade() {
  if (!selectedTowerId) return null;
  return towerManager.towers.find((tower) => tower.id === selectedTowerId) ?? null;
}

function getDifficultyConfig() {
  return DIFFICULTY_CONFIG[selectedDifficulty] ?? DIFFICULTY_CONFIG.easy;
}

function setSelectedDifficulty(difficulty) {
  if (!DIFFICULTY_CONFIG[difficulty]) return;
  selectedDifficulty = difficulty;
  for (const button of difficultyButtons) {
    const isSelected = button.dataset.difficulty === difficulty;
    button.classList.toggle("selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  }
}

function getSpawnIntervalForWave(wave) {
  const config = getDifficultyConfig();
  return Math.max(
    config.minSpawnMs,
    config.spawnBaseMs - (wave - 1) * config.spawnReductionPerWaveMs,
  );
}

function getEnemyCountForWave(wave) {
  const config = getDifficultyConfig();
  return config.baseEnemiesPerWave + (wave - 1) * config.enemiesPerWaveGrowth;
}

function pickWeightedEnemyTemplate(wave) {
  const config = getDifficultyConfig();
  const weightedEntries = [
    {
      template: ENEMY_TEMPLATES.basic,
      weight: Math.max(
        config.basicWeightMin,
        config.basicWeightStart - wave * config.basicWeightDropPerWave,
      ),
    },
    {
      template: ENEMY_TEMPLATES.fast,
      weight: Math.min(
        config.fastWeightMax,
        config.fastWeightStart + wave * config.fastWeightRisePerWave,
      ),
    },
    {
      template: ENEMY_TEMPLATES.tank,
      weight: Math.max(0, (wave - config.tankWeightUnlockOffset) * config.tankWeightRisePerWave),
    },
  ];

  const totalWeight = weightedEntries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const entry of weightedEntries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.template;
  }

  return ENEMY_TEMPLATES.basic;
}

function getScaledEnemyTemplate(baseTemplate, wave) {
  const config = getDifficultyConfig();
  const waveOffset = wave - 1;
  const hpMultiplier = 1 + waveOffset * config.hpGrowthPerWave;
  const speedMultiplier = Math.min(
    config.speedCapMultiplier,
    1 + waveOffset * config.speedGrowthPerWave,
  );
  const damageMultiplier = 1 + waveOffset * config.damageGrowthPerWave;
  const goldMultiplier = 1 + waveOffset * config.goldGrowthPerWave;

  return {
    ...baseTemplate,
    hp: Math.round(baseTemplate.hp * hpMultiplier),
    speed: baseTemplate.speed * speedMultiplier,
    damage: Math.max(1, Math.round(baseTemplate.damage * damageMultiplier)),
    gold: Math.max(1, Math.round(baseTemplate.gold * goldMultiplier)),
  };
}

function beginWave(wave) {
  currentWave = wave;
  pendingWave = wave;
  enemiesToSpawnThisWave = getEnemyCountForWave(wave);
  enemiesSpawnedThisWave = 0;
  enemySpawnTimerMs = 400;
  isWaveInProgress = true;
}

function prepareNextWave(wave) {
  pendingWave = wave;
  enemiesToSpawnThisWave = getEnemyCountForWave(wave);
  enemiesSpawnedThisWave = 0;
  enemySpawnTimerMs = getSpawnIntervalForWave(wave);
  isWaveInProgress = false;
  if (autoStartRoundsEnabled && gameState === GAME_STATE.PLAYING) {
    startPreparedWave();
  }
}

function startPreparedWave() {
  if (gameState !== GAME_STATE.PLAYING || isWaveInProgress) return;
  beginWave(pendingWave);
}

async function initializeSprites() {
  const spriteStore = await loadSpriteCatalog();
  mapManager.setSpriteStore(spriteStore);
  towerManager.setSpriteStore(spriteStore);
  enemyManager.setSpriteStore(spriteStore);
}

function showGameOverPanel() {
  const waveReached = Math.max(0, currentWave);
  setBestWaveForDifficulty(selectedDifficulty, waveReached);
  gameOverWaveValue.textContent = String(waveReached);
  gameOverDifficultyValue.textContent = getDifficultyConfig().label;
  gameOverHighScoreValue.textContent = String(getBestWaveForDifficulty(selectedDifficulty));
  gameOverPanel.hidden = false;
}

function hideGameOverPanel() {
  gameOverPanel.hidden = true;
}

function returnToMainMenu() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  gameState = GAME_STATE.MENU;
  resetGameState();
  startHelp.hidden = true;
  howToPlayButton.setAttribute("aria-expanded", "false");
  startScreen.classList.remove("hidden");
  renderScene();
}

function gameLoop(now) {
  animationFrameId = null;
  if (gameState !== GAME_STATE.PLAYING) return;

  const deltaMs = now - lastFrameTime;
  lastFrameTime = now;

  if (isWaveInProgress) {
    enemySpawnTimerMs -= deltaMs;
    const hasEnemyLeftToSpawn = enemiesSpawnedThisWave < enemiesToSpawnThisWave;

    if (hasEnemyLeftToSpawn && enemySpawnTimerMs <= 0) {
      const baseTemplate = pickWeightedEnemyTemplate(currentWave);
      const scaledTemplate = getScaledEnemyTemplate(baseTemplate, currentWave);
      enemyManager.spawnEnemy(scaledTemplate);
      enemiesSpawnedThisWave += 1;
      enemySpawnTimerMs = getSpawnIntervalForWave(currentWave);
    }
  }

  towerManager.update(deltaMs, enemyManager.enemies);
  enemyManager.update(deltaMs);

  const waveSpawnFinished = enemiesSpawnedThisWave >= enemiesToSpawnThisWave;
  const waveEnemiesCleared = enemyManager.enemies.length === 0;
  if (isWaveInProgress && waveSpawnFinished && waveEnemiesCleared) {
    prepareNextWave(currentWave + 1);
  }

  renderScene({ includeGhostPreview: true });

  if (Player.hp <= 0) {
    gameState = GAME_STATE.GAME_OVER;
    renderGameOver();
    showGameOverPanel();
    return;
  }

  animationFrameId = requestAnimationFrame(gameLoop);
}

function getMousePositionOnCanvas(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function updateHudPanel() {
  const selectedTower = getSelectedTowerTemplate();
  const activeWave = isWaveInProgress ? currentWave : pendingWave;
  const enemiesLeftToSpawn = Math.max(0, enemiesToSpawnThisWave - enemiesSpawnedThisWave);
  const enemiesRemainingThisWave = enemiesLeftToSpawn + enemyManager.enemies.length;
  hpValue.textContent = String(Player.hp);
  goldValue.textContent = String(Player.gold);
  waveValue.textContent = String(activeWave);
  buildCostValue.textContent = selectedTower?.cost?.toString() ?? "-";
  difficultyValue.textContent = getDifficultyConfig().label;
  if (gameState === GAME_STATE.MENU) {
    waveStatusValue.textContent = "Press Play to begin.";
    waveStartButton.disabled = true;
    waveStartButton.textContent = "Start Wave 1";
  } else if (gameState === GAME_STATE.GAME_OVER) {
    const bestWave = getBestWaveForDifficulty(selectedDifficulty);
    waveStatusValue.textContent = `Defenses breached. Best (${getDifficultyConfig().label}): Wave ${bestWave}.`;
    waveStartButton.disabled = true;
    waveStartButton.textContent = "Start Wave";
  } else {
    if (isWaveInProgress) {
      waveStatusValue.textContent = `Enemies left this wave: ${enemiesRemainingThisWave}`;
      waveStartButton.disabled = true;
      waveStartButton.textContent = `Wave ${currentWave} in progress`;
    } else {
      if (autoStartRoundsEnabled) {
        waveStatusValue.textContent = `Auto-start enabled. Wave ${pendingWave} launches automatically.`;
        waveStartButton.disabled = true;
        waveStartButton.textContent = `Auto Wave ${pendingWave}`;
      } else {
        waveStatusValue.textContent = `Ready for Wave ${pendingWave}. Build before starting.`;
        waveStartButton.disabled = false;
        waveStartButton.textContent = `Start Wave ${pendingWave}`;
      }
    }
  }
  selectionValue.textContent = `Selected: ${selectedTower?.type ?? "None"}`;
}

function formatUpgradeButtonLabel(pathLabel, level, nextUpgrade) {
  if (!nextUpgrade) {
    return `${pathLabel} (Maxed)`;
  }
  return `${pathLabel} L${level + 1}/5 - ${nextUpgrade.name} (${nextUpgrade.cost}g)`;
}

function formatUpgradeEffectText(upgrade) {
  if (!upgrade) return "";
  const effects = [];
  if (upgrade.damageBonus) effects.push(`+${upgrade.damageBonus} damage`);
  if (upgrade.rangeBonus) effects.push(`+${upgrade.rangeBonus} range`);
  if (upgrade.attackSpeedBonus) effects.push(`+${upgrade.attackSpeedBonus.toFixed(2)} atk/s`);
  if (upgrade.projectilesPerShotBonus) {
    effects.push(`+${upgrade.projectilesPerShotBonus} projectile(s)`);
  }
  if (upgrade.splashRadiusBonus) effects.push(`+${upgrade.splashRadiusBonus} splash radius`);
  if (upgrade.splashDamageMultiplierBonus) {
    effects.push(`+${Math.round(upgrade.splashDamageMultiplierBonus * 100)}% splash dmg`);
  }
  if (upgrade.critChanceBonus) {
    effects.push(`+${Math.round(upgrade.critChanceBonus * 100)}% crit chance`);
  }
  if (upgrade.critMultiplierBonus) {
    effects.push(`+${upgrade.critMultiplierBonus.toFixed(2)}x crit multiplier`);
  }
  if (upgrade.executeThresholdBonus) {
    effects.push(`+${Math.round(upgrade.executeThresholdBonus * 100)}% execute threshold`);
  }
  return effects.join(", ");
}

function updateUpgradePanel() {
  const tower = getSelectedTowerForUpgrade();
  if (!tower) {
    upgradeTowerLabel.textContent = "Click a placed tower to upgrade it.";
    upgradePathAButton.textContent = "Path A";
    upgradePathBButton.textContent = "Path B";
    upgradePathAButton.disabled = true;
    upgradePathBButton.disabled = true;
    upgradePathAButton.classList.remove("locked");
    upgradePathBButton.classList.remove("locked");
    upgradePathAButton.title = "Select a placed tower first.";
    upgradePathBButton.title = "Select a placed tower first.";
    return;
  }

  const pathALevel = tower.getPathLevel("pathA");
  const pathBLevel = tower.getPathLevel("pathB");
  const nextPathA = tower.getNextUpgrade("pathA");
  const nextPathB = tower.getNextUpgrade("pathB");
  const pathALocked = tower.isPathLocked("pathA");
  const pathBLocked = tower.isPathLocked("pathB");

  upgradeTowerLabel.textContent = `${tower.type} selected. Choose one path only.`;

  upgradePathAButton.textContent = pathALocked
    ? "Path A Locked (other path chosen)"
    : formatUpgradeButtonLabel("Path A", pathALevel, nextPathA);
  upgradePathBButton.textContent = pathBLocked
    ? "Path B Locked (other path chosen)"
    : formatUpgradeButtonLabel("Path B", pathBLevel, nextPathB);

  upgradePathAButton.title = pathALocked
    ? "Locked because Path B was already chosen."
    : nextPathA
      ? `${nextPathA.name}: ${formatUpgradeEffectText(nextPathA)}`
      : "Path A is fully upgraded.";
  upgradePathBButton.title = pathBLocked
    ? "Locked because Path A was already chosen."
    : nextPathB
      ? `${nextPathB.name}: ${formatUpgradeEffectText(nextPathB)}`
      : "Path B is fully upgraded.";

  upgradePathAButton.classList.toggle("locked", pathALocked);
  upgradePathBButton.classList.toggle("locked", pathBLocked);

  upgradePathAButton.disabled = pathALocked || !nextPathA || Player.gold < nextPathA.cost;
  upgradePathBButton.disabled = pathBLocked || !nextPathB || Player.gold < nextPathB.cost;
}

function tryUpgradeTower(pathKey) {
  if (gameState !== GAME_STATE.PLAYING) return;
  const tower = getSelectedTowerForUpgrade();
  if (!tower) return;

  const nextUpgrade = tower.getNextUpgrade(pathKey);
  if (!nextUpgrade) return;
  if (Player.gold < nextUpgrade.cost) return;

  const appliedUpgrade = tower.applyUpgrade(pathKey);
  if (!appliedUpgrade) return;

  Player.gold -= nextUpgrade.cost;
  console.log(
    `${tower.type} upgraded via ${pathKey} to level ${tower.getPathLevel(pathKey)} (${appliedUpgrade.name})`,
  );
}

function drawGhostPreview() {
  const selectedTemplate = getSelectedTowerTemplate();
  if (!selectedTemplate || !hoveredGrid) return;

  if (!mapManager.isInsideGrid(hoveredGrid.row, hoveredGrid.col)) return;

  const canPlace =
    towerManager.canPlaceTower(hoveredGrid.row, hoveredGrid.col) &&
    Player.gold >= selectedTemplate.cost;
  const isMountainTile = mapManager.isMountainTile(hoveredGrid.row, hoveredGrid.col);
  const previewRange = selectedTemplate.range * (isMountainTile ? MOUNTAIN_RANGE_MULTIPLIER : 1);
  const towerElevation = isMountainTile ? "mountain" : "ground";

  const center = mapManager.gridToWorldCenter(hoveredGrid.row, hoveredGrid.col);
  const towerColor = canPlace
    ? FANTASY_THEME.overlays.ghostTowerValid
    : FANTASY_THEME.overlays.ghostTowerInvalid;
  const rangeFillColor = canPlace
    ? FANTASY_THEME.overlays.ghostRangeValid
    : FANTASY_THEME.overlays.ghostRangeInvalid;
  const rangeStrokeColor = canPlace
    ? FANTASY_THEME.overlays.rangeStroke
    : FANTASY_THEME.overlays.blockedStroke;

  ctx.save();
  drawRangeIndicatorWithBlockedArcs(
    {
      x: center.x,
      y: center.y,
      row: hoveredGrid.row,
      col: hoveredGrid.col,
      elevation: towerElevation,
    },
    previewRange,
    {
      fillColor: rangeFillColor,
      strokeColor: rangeStrokeColor,
    },
  );

  ctx.fillStyle = towerColor;
  ctx.beginPath();
  ctx.arc(center.x, center.y, selectedTemplate.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function getBlockedAngleMask(towerLike, rangePx, samples = 220) {
  const blocked = [];
  for (let i = 0; i < samples; i += 1) {
    const angle = (i / samples) * Math.PI * 2;
    const target = {
      x: towerLike.x + Math.cos(angle) * rangePx,
      y: towerLike.y + Math.sin(angle) * rangePx,
    };
    blocked.push(!hasLineOfSight(towerLike, target, mapManager));
  }
  return blocked;
}

function drawRangeIndicatorWithBlockedArcs(towerLike, rangePx, options = {}) {
  const fillColor = options.fillColor ?? FANTASY_THEME.overlays.rangeFill;
  const strokeColor = options.strokeColor ?? FANTASY_THEME.overlays.rangeStroke;
  const blockedColor = options.blockedColor ?? FANTASY_THEME.overlays.blockedStroke;
  const ringThickness = options.ringThickness ?? 8;
  const sampleCount = options.sampleCount ?? 220;

  ctx.save();
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.arc(towerLike.x, towerLike.y, rangePx, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(towerLike.x, towerLike.y, rangePx, 0, Math.PI * 2);
  ctx.stroke();

  const blockedMask = getBlockedAngleMask(towerLike, rangePx, sampleCount);
  if (blockedMask.every((isBlocked) => !isBlocked)) {
    ctx.restore();
    return;
  }

  ctx.strokeStyle = blockedColor;
  ctx.lineWidth = ringThickness;
  ctx.lineCap = "butt";
  const angleStep = (Math.PI * 2) / sampleCount;

  if (blockedMask.every((isBlocked) => isBlocked)) {
    ctx.beginPath();
    ctx.arc(towerLike.x, towerLike.y, rangePx, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const firstUnblockedIndex = blockedMask.findIndex((isBlocked) => !isBlocked);
  const baseAngle = firstUnblockedIndex * angleStep;
  let segmentStart = -1;

  for (let i = 0; i <= sampleCount; i += 1) {
    const circularIndex = (firstUnblockedIndex + i) % sampleCount;
    const isBlocked = i < sampleCount ? blockedMask[circularIndex] : false;

    if (isBlocked && segmentStart === -1) {
      segmentStart = i;
      continue;
    }

    if (!isBlocked && segmentStart !== -1) {
      const startAngle = baseAngle + segmentStart * angleStep;
      const endAngle = baseAngle + i * angleStep;
      ctx.beginPath();
      ctx.arc(towerLike.x, towerLike.y, rangePx, startAngle, endAngle);
      ctx.stroke();
      segmentStart = -1;
    }
  }

  ctx.restore();
}

function drawHoveredTowerBlockedRange() {
  if (!hoveredTowerId) return;
  const hoveredTower = towerManager.towers.find((tower) => tower.id === hoveredTowerId);
  if (!hoveredTower) return;
  drawRangeIndicatorWithBlockedArcs(hoveredTower, hoveredTower.getEffectiveRange(), {
    fillColor: FANTASY_THEME.overlays.hoverTowerRangeFill,
    strokeColor: FANTASY_THEME.overlays.hoverTowerRangeStroke,
  });
}

function renderScene({ includeGhostPreview = false } = {}) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  mapManager.draw(ctx);
  drawHoveredTowerBlockedRange();
  if (includeGhostPreview) drawGhostPreview();
  enemyManager.draw(ctx);
  towerManager.draw(ctx, hoveredTowerId);
  updateHudPanel();
  updateUpgradePanel();
}

function renderGameOver() {
  ctx.save();
  ctx.fillStyle = FANTASY_THEME.overlays.gameOverScrim;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
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
  if (gameState !== GAME_STATE.PLAYING) return;

  const { x, y } = getMousePositionOnCanvas(event);
  const clickedTower = towerManager.getTowerAtWorldPosition(x, y);
  if (clickedTower) {
    selectedTowerId = clickedTower.id;
    return;
  }

  const { row, col } = mapManager.worldToGrid(x, y);
  const selectedTemplate = getSelectedTowerTemplate();
  selectedTowerId = null;

  if (!selectedTemplate) {
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
  selectedTowerId = tower.id;
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

replayButton.addEventListener("click", () => {
  startNewGame();
});

backToMenuButton.addEventListener("click", () => {
  returnToMainMenu();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setSelectedTowerType(null);
  }
});

function resetGameState() {
  Player.hp = BASE_PLAYER_STATS.hp;
  Player.gold = BASE_PLAYER_STATS.gold;
  towerManager.towers = [];
  enemyManager.enemies = [];
  hoveredTowerId = null;
  selectedTowerId = null;
  hoveredGrid = null;
  currentWave = 0;
  pendingWave = 1;
  enemiesToSpawnThisWave = 0;
  enemiesSpawnedThisWave = 0;
  isWaveInProgress = false;
  enemySpawnTimerMs = getSpawnIntervalForWave(pendingWave);
  setSelectedTowerType(null);
  hideGameOverPanel();
  autoStartRoundsToggle.checked = autoStartRoundsEnabled;
}

function startNewGame() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  resetGameState();
  prepareNextWave(1);
  gameState = GAME_STATE.PLAYING;
  startHelp.hidden = true;
  howToPlayButton.setAttribute("aria-expanded", "false");
  startScreen.classList.add("hidden");
  if (autoStartRoundsEnabled) {
    startPreparedWave();
  }
  lastFrameTime = performance.now();
  animationFrameId = requestAnimationFrame(gameLoop);
}

playButton.addEventListener("click", () => {
  startNewGame();
});

for (const button of difficultyButtons) {
  button.addEventListener("click", () => {
    if (gameState !== GAME_STATE.MENU) return;
    setSelectedDifficulty(button.dataset.difficulty);
  });
}

howToPlayButton.addEventListener("click", () => {
  const isHidden = startHelp.hidden;
  startHelp.hidden = !isHidden;
  howToPlayButton.setAttribute("aria-expanded", String(isHidden));
});

waveStartButton.addEventListener("click", () => {
  startPreparedWave();
});

autoStartRoundsToggle.addEventListener("change", () => {
  saveAutoStartRoundsEnabled(autoStartRoundsToggle.checked);
  if (autoStartRoundsEnabled && gameState === GAME_STATE.PLAYING && !isWaveInProgress) {
    startPreparedWave();
  }
});

upgradePathAButton.addEventListener("click", () => {
  tryUpgradeTower("pathA");
});

upgradePathBButton.addEventListener("click", () => {
  tryUpgradeTower("pathB");
});

resetGameState();
setSelectedDifficulty(DIFFICULTY.EASY);
renderScene();
autoStartRoundsToggle.checked = autoStartRoundsEnabled;
initializeSprites().catch(() => {
  // Sprites are optional; rendering falls back to procedural shapes.
});
