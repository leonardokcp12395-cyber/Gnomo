class Platform extends Entity {
    constructor(x, y, width, height) {
        super(x, y, 0);
        this.width = width;
        this.height = height;
        this.pattern = ctx.createPattern(assets.loadedImages.ground, 'repeat');
    }

    draw(ctx) {
        const screenLeft = camera.x;
        const screenRight = camera.x + canvas.width;
        if (this.x + this.width < screenLeft || this.x > screenRight) {
            return;
        }

        ctx.save();
        ctx.translate(-camera.x, -camera.y);

        ctx.fillStyle = this.pattern;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        ctx.restore();
    }
}

class XPOrb extends Entity {
    constructor() {
        super();
    }
    init(x, y, value) {
        super.reset();
        this.x = x;
        this.y = y;
        this.radius = 5;
        this.value = value;
    }
    draw(ctx) {
        const screenLeft = camera.x;
        const screenRight = camera.x + canvas.width;
        if (this.x + this.radius < screenLeft || this.x - this.radius > screenRight) {
            return;
        }

        ctx.save();
        ctx.translate(-camera.x, -camera.y);
        ctx.fillStyle = 'cyan';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    update() {
        if (!this.active) return;

        const dist = Math.hypot(player.x - this.x, player.y - this.y);

        if (dist < player.collectRadius) {
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            this.x += Math.cos(angle) * 8;
            this.y += Math.sin(angle) * 8;
        }
        if (dist < player.radius + this.radius) {
            player.addXp(this.value);
            this.isDead = true;
            releaseToPool(this);
        }
    }
    reset() {
        super.reset();
        this.value = 0;
    }
}

class PowerUp extends Entity {
    constructor(x, y, type) {
        super(x, y, 10);
        this.type = type;
        this.animationFrame = 0;
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);

        if (this.type === 'heal_orb') {
            ctx.fillStyle = `rgba(255, 0, 0, ${0.7 + Math.sin(this.animationFrame * 0.1) * 0.3})`;
            ctx.beginPath();
            ctx.moveTo(0, -this.radius * 0.4);
            ctx.bezierCurveTo(-this.radius, -this.radius, -this.radius, 0, 0, this.radius * 0.6);
            ctx.bezierCurveTo(this.radius, 0, this.radius, -this.radius, 0, -this.radius * 0.4);
            ctx.fill();
        } else {
            ctx.rotate(this.animationFrame * 0.05);
            ctx.fillStyle = 'yellow';
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = i * (Math.PI * 2 / 5) - Math.PI / 2;
                ctx.lineTo(Math.cos(angle) * this.radius, Math.sin(angle) * this.radius);
                const innerAngle = angle + Math.PI / 5;
                ctx.lineTo(Math.cos(innerAngle) * (this.radius / 2), Math.sin(innerAngle) * (this.radius / 2));
            }
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
        this.animationFrame++;
    }
    update() {
        if (Math.hypot(player.x - this.x, player.y - this.y) < player.radius + this.radius) {
            this.applyEffect();
            this.isDead = true;
        }
    }
    applyEffect() {
        if (this.type === 'nuke') {
            enemies.forEach(e => {
                e.takeDamage(10000);
                e.applyKnockback(this.x, this.y, CONFIG.ENEMY_KNOCKBACK_FORCE * 5);
            });
            screenShake = { intensity: 15, duration: 30 };
        } else if (this.type === 'heal_orb') {
            player.health = Math.min(player.maxHealth, player.health + player.maxHealth * 0.10);
            for (let i = 0; i < 10; i++) {
                particleManager.createParticle(this.x, this.y, 'red', 1.5);
            }
        }
    }
}

class DamageNumber extends Entity {
    constructor() {
        super();
    }
    init(x, y, amount, color = '#FFF') {
        super.reset();
        this.x = x;
        this.y = y;
        this.amount = typeof amount === 'number' ? Math.round(amount) : amount;
        this.color = color;
        this.alpha = 1;
        this.velocityY = -2;
        this.life = 60;
    }

    update() {
        this.y += this.velocityY;
        this.alpha -= 0.015;
        this.life--;
        if (this.life <= 0) {
            this.isDead = true;
            releaseToPool(this);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.font = 'bold 20px "Courier New", Courier, monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 2;
        ctx.fillText(this.amount, 0, 0);
        ctx.restore();
    }

    reset() {
        super.reset();
        this.amount = 0;
    }
}

class MeteorWarningIndicator extends Entity {
    constructor() {
        super();
    }
    init(x, y, life = 60) {
        super.reset();
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.life = life;
        this.initialLife = life;
    }
    update() {
        this.life--;
        if (this.life <= 0) {
            this.isDead = true;
            const meteorStartX = this.x;
            const meteorStartY = camera.y - 50;
            getFromPool(enemyProjectilePool, meteorStartX, meteorStartY, Math.PI / 2, 8, 20);
        }
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);
        const progress = this.life / this.initialLife;
        const alpha = 1 - progress;
        const radius = this.radius * (1 - progress);
        ctx.strokeStyle = `rgba(255, 100, 0, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}
