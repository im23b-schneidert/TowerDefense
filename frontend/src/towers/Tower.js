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
    };

    // Current stats are mutable for future upgrades/buffs.
    this.currentStats = { ...this.baseStats };

    this.cooldownMs = 1000 / this.currentStats.attackSpeed;
    this.timeUntilNextShotMs = 0;
    this.size = config.size ?? 18;
    this.color = config.color ?? "#d1d5db";
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

  findTarget(enemies) {
    const rangeSquared = this.currentStats.range * this.currentStats.range;

    for (const enemy of enemies) {
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      if (dx * dx + dy * dy <= rangeSquared) {
        return enemy;
      }
    }

    return null;
  }

  update(deltaMs, enemies) {
    this.timeUntilNextShotMs -= deltaMs;

    if (this.timeUntilNextShotMs > 0) return;

    const target = this.findTarget(enemies);
    if (target) {
      console.log(`[${this.type}] target acquired:`, target);
      this.timeUntilNextShotMs = this.cooldownMs;
    }
  }

  draw(ctx, isHovered = false) {
    if (isHovered) {
      ctx.save();
      ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.currentStats.range, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#111827";
    ctx.stroke();
    ctx.restore();
  }
}
