import { hasLineOfSight } from "../combat/lineOfSight.js";
import { FANTASY_THEME } from "../theme/fantasyTheme.js";

export class Tower {
  constructor(config) {
    this.id = config.id ?? crypto.randomUUID();
    this.type = config.type ?? "Tower";
    this.row = config.row;
    this.col = config.col;
    this.x = config.x;
    this.y = config.y;

    this.baseStats = {
      damage: config.damage,
      attackSpeed: config.attackSpeed,
      range: config.range,
      cost: config.cost,
      projectilesPerShot: config.projectilesPerShot ?? 1,
      splashRadius: config.splashRadius ?? 0,
      splashDamageMultiplier: config.splashDamageMultiplier ?? 0,
      critChance: config.critChance ?? 0,
      critMultiplier: config.critMultiplier ?? 1.5,
      executeThreshold: config.executeThreshold ?? 0,
    };

    // Current stats are mutable for future upgrades/buffs.
    this.currentStats = { ...this.baseStats };

    this.cooldownMs = 1000 / this.currentStats.attackSpeed;
    this.timeUntilNextShotMs = 0;
    this.size = config.size ?? 18;
    this.color = config.color ?? "#d1d5db";
    this.elevation = config.elevation ?? "ground";
    this.spriteKey = config.spriteKey ?? null;
    this.projectileSpriteKey = config.projectileSpriteKey ?? null;
    this.spriteStore = config.spriteStore ?? null;
    this.upgradePaths = config.upgradePaths ?? { pathA: [], pathB: [] };
    this.maxUpgradeLevel = 5;
    this.upgradeState = {
      chosenPath: null,
      pathA: 0,
      pathB: 0,
    };
    this.projectiles = [];
    this.projectileSpeed = config.projectileSpeed ?? 620;
    this.combatTexts = [];
  }

  setSpriteStore(spriteStore) {
    this.spriteStore = spriteStore ?? null;
  }

  setStat(statName, value) {
    this.currentStats[statName] = value;

    if (statName === "attackSpeed") {
      this.cooldownMs = 1000 / this.currentStats.attackSpeed;
    }
  }

  containsPoint(x, y) {
    const dx = x - this.x;
    const dy = y - this.y;
    return dx * dx + dy * dy <= this.size * this.size;
  }

  getEffectiveRange() {
    return this.currentStats.range;
  }

  getPathLevel(pathKey) {
    return this.upgradeState[pathKey] ?? 0;
  }

  isPathLocked(pathKey) {
    return (
      this.upgradeState.chosenPath !== null &&
      this.upgradeState.chosenPath !== pathKey
    );
  }

  getNextUpgrade(pathKey) {
    if (this.isPathLocked(pathKey)) return null;
    const path = this.upgradePaths[pathKey] ?? [];
    const currentLevel = this.getPathLevel(pathKey);
    if (currentLevel >= this.maxUpgradeLevel || currentLevel >= path.length) return null;
    return path[currentLevel];
  }

  applyUpgrade(pathKey) {
    const upgrade = this.getNextUpgrade(pathKey);
    if (!upgrade) return null;

    if (upgrade.damageBonus) {
      this.currentStats.damage += upgrade.damageBonus;
    }

    if (upgrade.rangeBonus) {
      this.currentStats.range += upgrade.rangeBonus;
    }

    if (upgrade.attackSpeedBonus) {
      this.setStat("attackSpeed", this.currentStats.attackSpeed + upgrade.attackSpeedBonus);
    }

    if (upgrade.projectilesPerShotBonus) {
      this.currentStats.projectilesPerShot = Math.max(
        1,
        this.currentStats.projectilesPerShot + upgrade.projectilesPerShotBonus,
      );
    }

    if (upgrade.splashRadiusBonus) {
      this.currentStats.splashRadius += upgrade.splashRadiusBonus;
    }

    if (upgrade.splashDamageMultiplierBonus) {
      this.currentStats.splashDamageMultiplier += upgrade.splashDamageMultiplierBonus;
    }

    if (upgrade.critChanceBonus) {
      this.currentStats.critChance = Math.min(
        0.85,
        this.currentStats.critChance + upgrade.critChanceBonus,
      );
    }

    if (upgrade.critMultiplierBonus) {
      this.currentStats.critMultiplier += upgrade.critMultiplierBonus;
    }

    if (upgrade.executeThresholdBonus) {
      this.currentStats.executeThreshold = Math.min(
        0.6,
        this.currentStats.executeThreshold + upgrade.executeThresholdBonus,
      );
    }

    this.upgradeState[pathKey] += 1;
    if (!this.upgradeState.chosenPath) {
      this.upgradeState.chosenPath = pathKey;
    }

    return upgrade;
  }

  getTotalUpgradeLevel() {
    return this.getPathLevel("pathA") + this.getPathLevel("pathB");
  }

  getUpgradeVisualStyle() {
    const totalLevel = this.getTotalUpgradeLevel();
    const path = this.upgradeState.chosenPath;

    if (path === "pathA") {
      return {
        auraColor: "rgba(214, 124, 66, 0.24)",
        accentColor: "#f0b36e",
        coreColor: "#f2dfbd",
        ringColor: "rgba(214, 124, 66, 0.9)",
        extraRadius: Math.min(6, totalLevel * 0.7),
      };
    }

    if (path === "pathB") {
      return {
        auraColor: "rgba(116, 196, 186, 0.26)",
        accentColor: "#94dcd2",
        coreColor: "#d7f4ef",
        ringColor: "rgba(116, 196, 186, 0.94)",
        extraRadius: Math.min(6, totalLevel * 0.7),
      };
    }

    return {
      auraColor: "rgba(239, 226, 196, 0.12)",
      accentColor: "#d6c59d",
      coreColor: this.color,
      ringColor: "rgba(239, 226, 196, 0.45)",
      extraRadius: 0,
    };
  }

  findTargets(enemies, mapManager, maxTargets = 1) {
    const rangeSquared = this.getEffectiveRange() * this.getEffectiveRange();
    const candidates = [];

    for (const enemy of enemies) {
      if (enemy.isDead || enemy.hasReachedGoal) continue;
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      if (
        dx * dx + dy * dy <= rangeSquared &&
        hasLineOfSight(this, enemy, mapManager)
      ) {
        candidates.push({
          enemy,
          distanceSquared: dx * dx + dy * dy,
          pathProgress: this.getEnemyPathProgress(enemy),
        });
      }
    }

    const family = this.getTowerVisualFamily();
    candidates.sort((a, b) => this.compareTargetCandidates(a, b, family));
    return candidates.slice(0, maxTargets).map((candidate) => candidate.enemy);
  }

  getEnemyPathProgress(enemy) {
    const currentWaypoint = enemy.pathWaypoints?.[enemy.waypointIndex] ?? null;
    const nextWaypoint = enemy.pathWaypoints?.[enemy.waypointIndex + 1] ?? null;
    if (!currentWaypoint || !nextWaypoint) return enemy.waypointIndex ?? 0;

    const segmentLength = Math.hypot(
      nextWaypoint.x - currentWaypoint.x,
      nextWaypoint.y - currentWaypoint.y,
    );
    if (segmentLength <= 0.0001) return enemy.waypointIndex;

    const remainingOnSegment = Math.hypot(nextWaypoint.x - enemy.x, nextWaypoint.y - enemy.y);
    const progressOnSegment = Math.max(0, Math.min(1, 1 - remainingOnSegment / segmentLength));
    return enemy.waypointIndex + progressOnSegment;
  }

  compareTargetCandidates(a, b, family) {
    if (family === "sniper") {
      const hpDiff = b.enemy.currentHp - a.enemy.currentHp;
      if (hpDiff !== 0) return hpDiff;
      return a.distanceSquared - b.distanceSquared;
    }

    if (family === "cannon") {
      return a.distanceSquared - b.distanceSquared;
    }

    // Basic + machine gun focus the enemy closest to the track end.
    const progressDiff = b.pathProgress - a.pathProgress;
    if (progressDiff !== 0) return progressDiff;
    return a.distanceSquared - b.distanceSquared;
  }

  getDamageAgainstTarget(target) {
    const executeThresholdHp = target.currentStats.hp * this.currentStats.executeThreshold;

    let damage = this.currentStats.damage;
    let isCrit = false;
    if (this.currentStats.critChance > 0 && Math.random() < this.currentStats.critChance) {
      damage *= this.currentStats.critMultiplier;
      isCrit = true;
    }

    const hpAfterNormalHit = target.currentHp - damage;
    const shouldExecute =
      this.currentStats.executeThreshold > 0 &&
      (target.currentHp <= executeThresholdHp || hpAfterNormalHit <= executeThresholdHp);
    if (shouldExecute) {
      return {
        damage: target.currentHp,
        isCrit: false,
        isExecute: true,
      };
    }

    return {
      damage,
      isCrit,
      isExecute: false,
    };
  }

  addCombatText(x, y, label, color) {
    this.combatTexts.push({
      x,
      y,
      label,
      color,
      lifeMs: 650,
      maxLifeMs: 650,
    });
  }

  updateCombatTexts(deltaMs) {
    const survivors = [];
    for (const text of this.combatTexts) {
      text.lifeMs -= deltaMs;
      if (text.lifeMs <= 0) continue;
      text.y -= 0.05 * deltaMs;
      survivors.push(text);
    }
    this.combatTexts = survivors;
  }

  drawCombatTexts(ctx) {
    if (this.combatTexts.length === 0) return;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = FANTASY_THEME.typography.combatText;
    for (const text of this.combatTexts) {
      const alpha = Math.max(0, text.lifeMs / text.maxLifeMs);
      ctx.fillStyle = text.color.replace("__ALPHA__", alpha.toFixed(3));
      ctx.fillText(text.label, text.x, text.y);
    }
    ctx.restore();
  }

  applySplashDamage(primaryTarget, dealtDamage, enemies) {
    if (this.currentStats.splashRadius <= 0 || this.currentStats.splashDamageMultiplier <= 0) {
      return;
    }

    const splashDamage = dealtDamage * this.currentStats.splashDamageMultiplier;
    const splashRadiusSquared = this.currentStats.splashRadius * this.currentStats.splashRadius;

    for (const enemy of enemies) {
      if (enemy.id === primaryTarget.id || enemy.isDead || enemy.hasReachedGoal) continue;
      const dx = enemy.x - primaryTarget.x;
      const dy = enemy.y - primaryTarget.y;
      if (dx * dx + dy * dy <= splashRadiusSquared) {
        enemy.takeDamage(splashDamage);
      }
    }
  }

  spawnProjectile(target) {
    this.projectiles.push({
      x: this.x,
      y: this.y,
      targetId: target.id,
      damageScale: 1,
      ttlMs: 2200,
      speed: this.projectileSpeed,
      size: Math.max(3, this.size * 0.28),
      color: this.color,
      spriteKey: this.projectileSpriteKey,
    });
  }

  resolveProjectileHit(projectile, target, enemies) {
    const outcome = this.getDamageAgainstTarget(target);
    const dealtDamage = outcome.damage * projectile.damageScale;
    target.takeDamage(dealtDamage);
    this.applySplashDamage(target, dealtDamage, enemies);

    if (outcome.isExecute) {
      this.addCombatText(target.x, target.y - target.radius - 12, "EXECUTE!", "rgba(239, 68, 68, __ALPHA__)");
    } else if (outcome.isCrit) {
      this.addCombatText(target.x, target.y - target.radius - 10, "CRIT!", "rgba(250, 204, 21, __ALPHA__)");
    }
  }

  updateProjectiles(deltaMs, enemies) {
    const survivors = [];
    for (const projectile of this.projectiles) {
      projectile.ttlMs -= deltaMs;
      if (projectile.ttlMs <= 0) continue;

      const target = enemies.find(
        (enemy) =>
          enemy.id === projectile.targetId && !enemy.isDead && !enemy.hasReachedGoal,
      );
      if (!target) continue;

      const dx = target.x - projectile.x;
      const dy = target.y - projectile.y;
      const distance = Math.hypot(dx, dy);
      const step = (projectile.speed * deltaMs) / 1000;

      if (distance <= Math.max(step, target.radius * 0.9)) {
        this.resolveProjectileHit(projectile, target, enemies);
        continue;
      }

      projectile.x += (dx / distance) * step;
      projectile.y += (dy / distance) * step;
      survivors.push(projectile);
    }

    this.projectiles = survivors;
  }

  update(deltaMs, enemies, mapManager) {
    this.updateCombatTexts(deltaMs);
    this.updateProjectiles(deltaMs, enemies);
    this.timeUntilNextShotMs -= deltaMs;

    if (this.timeUntilNextShotMs > 0) return;

    const targets = this.findTargets(enemies, mapManager, this.currentStats.projectilesPerShot);
    if (targets.length > 0) {
      for (const target of targets) {
        if (target.isDead || target.hasReachedGoal) continue;
        this.spawnProjectile(target);
      }

      this.timeUntilNextShotMs = this.cooldownMs;
    }
  }

  drawProjectiles(ctx) {
    if (this.projectiles.length === 0) return;
    ctx.save();
    for (const projectile of this.projectiles) {
      const projectileSprite = this.spriteStore?.projectiles?.[projectile.spriteKey] ?? null;
      if (projectileSprite) {
        const size = projectile.size * 2.8;
        ctx.drawImage(projectileSprite, projectile.x - size / 2, projectile.y - size / 2, size, size);
      } else {
        ctx.fillStyle = projectile.color;
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, projectile.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.beginPath();
        ctx.arc(
          projectile.x - projectile.size * 0.25,
          projectile.y - projectile.size * 0.25,
          Math.max(1.1, projectile.size * 0.35),
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
    ctx.restore();
  }

  drawUpgradeLevelPips(ctx, radius, totalLevel, accentColor) {
    if (totalLevel <= 0) return;
    const pipCount = Math.min(5, totalLevel);
    const pipOrbit = radius + 12;
    const family = this.getTowerVisualFamily();
    const path = this.upgradeState.chosenPath;

    ctx.save();
    ctx.fillStyle = accentColor;

    if (family === "machineGun") {
      const rowY = this.y + radius + 10;
      for (let i = 0; i < pipCount; i += 1) {
        const px = this.x + (i - (pipCount - 1) / 2) * 5.8;
        ctx.fillRect(px - 1.7, rowY - 3.6, 3.4, 7.2);
      }
      ctx.restore();
      return;
    }

    if (family === "sniper") {
      const rowX = this.x - radius - 11;
      for (let i = 0; i < pipCount; i += 1) {
        const py = this.y + (i - (pipCount - 1) / 2) * 5.4;
        ctx.beginPath();
        ctx.moveTo(rowX - 2.8, py);
        ctx.lineTo(rowX + 2.8, py - 2.4);
        ctx.lineTo(rowX + 2.8, py + 2.4);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    if (family === "cannon") {
      const rowY = this.y + radius + 11;
      for (let i = 0; i < pipCount; i += 1) {
        const px = this.x + (i - (pipCount - 1) / 2) * 6.4;
        ctx.beginPath();
        ctx.arc(px, rowY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    for (let i = 0; i < pipCount; i += 1) {
      const angle = (path === "pathA" ? -Math.PI / 2 : Math.PI / 2) + (i - (pipCount - 1) / 2) * 0.34;
      const px = this.x + Math.cos(angle) * pipOrbit;
      const py = this.y + Math.sin(angle) * pipOrbit;
      ctx.beginPath();
      ctx.arc(px, py, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  getTowerVisualFamily() {
    const key = (this.spriteKey ?? "").toLowerCase();
    if (key.includes("machine")) return "machineGun";
    if (key.includes("sniper")) return "sniper";
    if (key.includes("cannon")) return "cannon";
    return "basic";
  }

  drawDiamondCrystal(ctx, x, y, size, fillColor, rotation = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.8, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawRegularPolygon(ctx, x, y, sides, radius, rotation = 0) {
    if (sides < 3) return;
    ctx.beginPath();
    for (let i = 0; i < sides; i += 1) {
      const angle = (i / sides) * Math.PI * 2 + rotation;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
  }

  drawPathAUpgradeOverlay(ctx, radius, totalLevel, visual) {
    const family = this.getTowerVisualFamily();
    const rotation = performance.now() * 0.0013;

    if (family === "machineGun") {
      const toothCount = Math.min(16, 8 + totalLevel * 2);
      const gearRadius = radius + 8 + totalLevel;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(rotation);
      ctx.strokeStyle = visual.accentColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, gearRadius, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < toothCount; i += 1) {
        const angle = (i / toothCount) * Math.PI * 2;
        ctx.save();
        ctx.rotate(angle);
        ctx.fillStyle = "#ecd7af";
        ctx.fillRect(gearRadius - 1, -1.5, 6 + totalLevel * 0.5, 3);
        ctx.restore();
      }
      ctx.restore();

      const muzzleCount = Math.min(5, 2 + Math.floor(totalLevel / 2));
      ctx.save();
      for (let i = 0; i < muzzleCount; i += 1) {
        const angle = rotation * 1.9 + i * ((Math.PI * 2) / muzzleCount);
        const px = this.x + Math.cos(angle) * (radius + 16 + totalLevel);
        const py = this.y + Math.sin(angle) * (radius + 16 + totalLevel);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(angle);
        ctx.fillStyle = "#ffe7b8";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(7 + totalLevel, -2.7);
        ctx.lineTo(7 + totalLevel, 2.7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      return;
    }

    if (family === "sniper") {
      ctx.save();
      ctx.strokeStyle = visual.accentColor;
      ctx.lineWidth = 2.6;
      for (let i = 0; i < 2; i += 1) {
        const angle = rotation * 0.38 + i * Math.PI;
        const reach = radius + 24 + totalLevel * 1.7;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + Math.cos(angle) * reach, this.y + Math.sin(angle) * reach);
        ctx.stroke();
      }

      const crossRadius = radius + 10 + totalLevel;
      ctx.strokeStyle = "#ffe9be";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(this.x, this.y, crossRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(this.x - crossRadius - 6, this.y);
      ctx.lineTo(this.x + crossRadius + 6, this.y);
      ctx.moveTo(this.x, this.y - crossRadius - 6);
      ctx.lineTo(this.x, this.y + crossRadius + 6);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (family === "cannon") {
      const plateCount = Math.min(8, 3 + totalLevel);
      ctx.save();
      for (let i = 0; i < plateCount; i += 1) {
        const angle = (i / plateCount) * Math.PI * 2 + rotation * 0.8;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);
        ctx.fillStyle = "#f4dab3";
        ctx.fillRect(radius + 1, -4, 11 + totalLevel * 1.2, 8);
        ctx.restore();
      }
      ctx.strokeStyle = "#ffe8b9";
      ctx.lineWidth = 2.2;
      this.drawRegularPolygon(ctx, this.x, this.y, 4, radius + 12 + totalLevel, rotation * 0.7);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Basic tower path A: heraldic blades and pennant crown.
    const flareCount = Math.min(9, 4 + totalLevel);
    const flareInner = radius + 1;
    const flareOuter = radius + 10 + totalLevel * 0.8;

    ctx.save();
    ctx.strokeStyle = visual.accentColor;
    ctx.lineWidth = 2.5;
    for (let i = 0; i < flareCount; i += 1) {
      const angle = (i / flareCount) * Math.PI * 2 + rotation;
      ctx.beginPath();
      ctx.moveTo(
        this.x + Math.cos(angle) * flareInner,
        this.y + Math.sin(angle) * flareInner,
      );
      ctx.lineTo(
        this.x + Math.cos(angle) * flareOuter,
        this.y + Math.sin(angle) * flareOuter,
      );
      ctx.stroke();
    }

    const pennantCount = Math.min(5, 2 + Math.floor(totalLevel / 2));
    ctx.fillStyle = "#f7e8cb";
    for (let i = 0; i < pennantCount; i += 1) {
      const angle = (i / pennantCount) * Math.PI * 2 + rotation * 0.5;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(radius + 1, -3);
      ctx.lineTo(radius + 10 + totalLevel, 0);
      ctx.lineTo(radius + 1, 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  drawPathBUpgradeOverlay(ctx, radius, totalLevel, visual) {
    const family = this.getTowerVisualFamily();
    const ringRadius = radius + 10 + totalLevel * 0.9;
    const orbit = performance.now() * 0.0009;

    ctx.save();
    ctx.strokeStyle = visual.ringColor;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(this.x, this.y, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    if (family === "machineGun") {
      const runeCount = Math.min(12, 6 + totalLevel);
      ctx.save();
      for (let i = 0; i < runeCount; i += 1) {
        const angle = (i / runeCount) * Math.PI * 2 - orbit * 1.4;
        const px = this.x + Math.cos(angle) * ringRadius;
        const py = this.y + Math.sin(angle) * ringRadius;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(angle);
        ctx.fillStyle = "#d8f5ef";
        ctx.fillRect(-1.5, -4.5, 3, 9);
        ctx.restore();
      }
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = "#bdf1e8";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(this.x, this.y, ringRadius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (family === "sniper") {
      const crystalCount = Math.min(4, 2 + Math.floor(totalLevel / 2));
      for (let i = 0; i < crystalCount; i += 1) {
        const angle = (i / crystalCount) * Math.PI * 2 - orbit * 0.5;
        const px = this.x + Math.cos(angle) * (ringRadius + 4);
        const py = this.y + Math.sin(angle) * (ringRadius + 4);
        const size = 4 + (totalLevel >= 4 ? 1 : 0);
        this.drawDiamondCrystal(ctx, px, py, size, "#ddfaf4", angle);
      }

      ctx.save();
      ctx.strokeStyle = "#d5faf5";
      ctx.lineWidth = 1.8;
      const triRadius = ringRadius + 7;
      this.drawRegularPolygon(ctx, this.x, this.y, 3, triRadius, -orbit);
      ctx.stroke();
      this.drawRegularPolygon(ctx, this.x, this.y, 3, triRadius - 7, Math.PI - orbit);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (family === "cannon") {
      const stoneCount = Math.min(8, 3 + totalLevel);
      for (let i = 0; i < stoneCount; i += 1) {
        const angle = (i / stoneCount) * Math.PI * 2 - orbit;
        const px = this.x + Math.cos(angle) * ringRadius;
        const py = this.y + Math.sin(angle) * ringRadius;
        const size = 4 + (totalLevel >= 3 ? 1.4 : 0);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(angle + Math.PI / 4);
        ctx.fillStyle = "#d6f4ee";
        ctx.fillRect(-size * 0.7, -size * 0.7, size * 1.4, size * 1.4);
        ctx.restore();
      }

      ctx.save();
      ctx.strokeStyle = "#c9eee6";
      ctx.lineWidth = 1.9;
      this.drawRegularPolygon(ctx, this.x, this.y, 6, ringRadius + 4, orbit * 0.65);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Basic tower path B: floating ward stones.
    const crystalCount = Math.min(8, 3 + totalLevel);
    for (let i = 0; i < crystalCount; i += 1) {
      const angle = (i / crystalCount) * Math.PI * 2 - orbit;
      const px = this.x + Math.cos(angle) * ringRadius;
      const py = this.y + Math.sin(angle) * ringRadius;
      const crystalRadius = 3 + (totalLevel >= 4 ? 1 : 0);
      this.drawDiamondCrystal(ctx, px, py, crystalRadius, "#ddfaf4", angle);
    }
  }

  drawUpgradeOverlay(ctx, radius, totalLevel, visual) {
    if (totalLevel <= 0 || !this.upgradeState.chosenPath) return;
    if (this.upgradeState.chosenPath === "pathA") {
      this.drawPathAUpgradeOverlay(ctx, radius, totalLevel, visual);
    } else if (this.upgradeState.chosenPath === "pathB") {
      this.drawPathBUpgradeOverlay(ctx, radius, totalLevel, visual);
    }
    this.drawUpgradeLevelPips(ctx, radius, totalLevel, visual.accentColor);
  }

  draw(ctx, isHovered = false) {
    const totalLevel = this.getTotalUpgradeLevel();
    const visual = this.getUpgradeVisualStyle();
    const radius = this.size + visual.extraRadius;

    ctx.save();
    if (totalLevel > 0) {
      ctx.fillStyle = visual.auraColor;
      ctx.beginPath();
      ctx.arc(this.x, this.y, radius + 10 + totalLevel, 0, Math.PI * 2);
      ctx.fill();
    }

    const towerSprite = this.spriteStore?.towers?.[this.spriteKey] ?? null;
    if (towerSprite) {
      const spriteSize = (radius + 7) * 2;
      ctx.drawImage(
        towerSprite,
        this.x - spriteSize / 2,
        this.y - spriteSize / 2,
        spriteSize,
        spriteSize,
      );
    } else {
      ctx.fillStyle = visual.coreColor;
      ctx.beginPath();
      ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.lineWidth = 2;
    ctx.strokeStyle = totalLevel > 0 ? visual.ringColor : "#2f2418";
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    this.drawUpgradeOverlay(ctx, radius, totalLevel, visual);

    if (isHovered) {
      ctx.strokeStyle = FANTASY_THEME.overlays.towerHover;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, radius + 12, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
    this.drawProjectiles(ctx);
    this.drawCombatTexts(ctx);
  }
}
