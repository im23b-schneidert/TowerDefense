export class Enemy {
  constructor(config) {
    this.id = config.id ?? crypto.randomUUID();
    this.type = config.type ?? "Enemy";
    this.pathWaypoints = config.pathWaypoints ?? [];

    this.baseStats = {
      hp: config.hp,
      speed: config.speed,
      damage: config.damage,
      gold: config.gold,
    };

    // Mutable snapshot for upgrades/debuffs later.
    this.currentStats = { ...this.baseStats };
    this.currentHp = this.currentStats.hp;

    this.radius = config.radius ?? 14;
    this.color = config.color ?? "#ef4444";
    this.shape = config.shape ?? "circle";
    this.isDead = false;
    this.hasReachedGoal = false;

    this.waypointIndex = 0;
    const start = this.pathWaypoints[0] ?? { x: 0, y: 0 };
    this.x = start.x;
    this.y = start.y;
  }

  takeDamage(amount) {
    if (this.isDead || this.hasReachedGoal) return;
    this.currentHp -= amount;
    if (this.currentHp <= 0) {
      this.currentHp = 0;
      this.isDead = true;
    }
  }

  update(deltaMs) {
    if (this.isDead || this.hasReachedGoal || this.pathWaypoints.length < 2) return;

    const nextIndex = this.waypointIndex + 1;
    const nextWaypoint = this.pathWaypoints[nextIndex];
    if (!nextWaypoint) {
      this.hasReachedGoal = true;
      return;
    }

    const dx = nextWaypoint.x - this.x;
    const dy = nextWaypoint.y - this.y;
    const distance = Math.hypot(dx, dy);
    const step = (this.currentStats.speed * deltaMs) / 1000;

    if (distance <= step) {
      this.x = nextWaypoint.x;
      this.y = nextWaypoint.y;
      this.waypointIndex = nextIndex;

      if (this.waypointIndex >= this.pathWaypoints.length - 1) {
        this.hasReachedGoal = true;
      }
      return;
    }

    this.x += (dx / distance) * step;
    this.y += (dy / distance) * step;
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = this.color;
    if (this.shape === "diamond") {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - this.radius);
      ctx.lineTo(this.x + this.radius, this.y);
      ctx.lineTo(this.x, this.y + this.radius);
      ctx.lineTo(this.x - this.radius, this.y);
      ctx.closePath();
      ctx.fill();
    } else if (this.shape === "square") {
      const size = this.radius * 2;
      ctx.fillRect(this.x - this.radius, this.y - this.radius, size, size);
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    const hpRatio = this.currentHp / this.currentStats.hp;
    const barWidth = this.radius * 2;
    const barX = this.x - this.radius;
    const barY = this.y - this.radius - 10;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(barX, barY, barWidth, 4);
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(barX, barY, barWidth * Math.max(hpRatio, 0), 4);
    ctx.restore();
  }
}
