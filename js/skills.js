class Projectile extends Entity {
    constructor() {
        super();
        this.piercedEnemies = new Set();
        this.skillId = null;
    }

    init(x, y, angle, levelData, skillId = null) {
        super.reset();
        this.x = x;
        this.y = y;
        this.skillId = skillId;
        this.angle = angle;
        this.damage = levelData.damage;
        this.pierce = levelData.pierce;

        this.isBeam = (this.skillId === 'celestial_beam');
        if (this.isBeam) {
            this.duration = levelData.duration;
            this.width = levelData.width;
            this.length = 1000;
            this.velocity = { x: 0, y: 0 };
        } else if (this.skillId === 'celestial_ray') {
            this.radius = levelData.width / 2;
            this.length = levelData.length;
            this.velocity = { x: Math.cos(angle) * levelData.speed, y: Math.sin(angle) * levelData.speed };
        } else {
            this.radius = 5;
            this.velocity = { x: Math.cos(angle) * levelData.speed, y: Math.sin(angle) * levelData.speed };
        }

        this.piercedEnemies.clear();
        this.active = true;
        this.isDead = false;
    }

    draw(ctx) {
        const screenLeft = camera.x;
        const screenRight = camera.x + canvas.width;
        const screenTop = camera.y;
        const screenBottom = camera.y + canvas.height;
        const largerDimension = this.length || this.radius;
        if (this.x + largerDimension < screenLeft || this.x - largerDimension > screenRight ||
            this.y + largerDimension < screenTop || this.y - largerDimension > screenBottom) {
            return;
        }

        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);

        if (this.isBeam) {
            ctx.save();
            const lifeRatio = this.duration / SKILL_DATABASE[this.skillId].levels[0].duration;
            ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + (1-lifeRatio) * 0.5})`;
            ctx.strokeStyle = `rgba(255, 255, 0, ${0.5 + (1-lifeRatio) * 0.5})`;
            ctx.lineWidth = 2;
            ctx.rotate(this.angle);
            ctx.fillRect(0, -this.width / 2, this.length, this.width);
            ctx.strokeRect(0, -this.width / 2, this.length, this.width);
            ctx.restore();
        } else if (this.skillId === 'celestial_ray') {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
            ctx.rotate(this.angle);
            ctx.fillRect(-this.length / 2, -this.radius, this.length, this.radius * 2);
            ctx.restore();
        } else {
            ctx.fillStyle = 'yellow';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    update() {
        if (!this.active) {
            return;
        }

        if (this.isBeam) {
            this.duration--;
            this.x = player.x;
            this.y = player.y;
            this.angle = Math.atan2(player.lastMoveDirection.y, player.lastMoveDirection.x);
            if (this.duration <= 0) {
                this.isDead = true;
                releaseToPool(this);
            }
        } else {
            this.x += this.velocity.x;
            this.y += this.velocity.y;
        }

        if (frameCount % 3 === 0) {
            const trailColor = `rgba(255, 255, ${Math.floor(Math.random() * 255)}, 0.5)`;
            const trailRadius = this.radius * (Math.random() * 0.3 + 0.2);
            particleManager.createTrailParticle(this.x, this.y, trailColor, trailRadius);
        }

        const worldEdge = CONFIG.WORLD_BOUNDS.width / 2 + 200;
        if (this.x < -worldEdge || this.x > worldEdge || this.y < -worldEdge || this.y > worldEdge) {
            this.isDead = true;
            releaseToPool(this);
        }
    }

    reset() {
        super.reset();
        this.velocity = { x: 0, y: 0 };
        this.damage = 0;
        this.pierce = 0;
        this.piercedEnemies.clear();
        this.type = 'normal';
        this.length = 0;
        this.angle = 0;
    }
}

class EnemyProjectile extends Entity {
    constructor() {
        super();
        this.color = 'red';
    }

    init(x, y, angle, speed, damage) {
        super.reset();
        this.x = x;
        this.y = y;
        this.radius = 7;
        this.velocity = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
        this.damage = damage;
        this.color = 'red';
    }

    draw(ctx) {
        const screenLeft = camera.x;
        const screenRight = camera.x + canvas.width;
        if (this.x + this.radius < screenLeft || this.x - this.radius > screenRight) {
            return;
        }

        ctx.save();
        ctx.translate(-camera.x, -camera.y);

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        if (frameCount % 3 === 0) {
            const trailColor = `rgba(255, 0, 0, 0.5)`;
            const trailRadius = this.radius * (Math.random() * 0.3 + 0.2);
            particleManager.createTrailParticle(this.x, this.y, trailColor, trailRadius);
        }

        if (this.x < camera.x - 100 || this.x > camera.x + canvas.width + 100 || this.y < camera.y - 100 || this.y > camera.y + canvas.height + 100) {
            this.isDead = true;
            releaseToPool(this);
        }
    }

    reset() {
        super.reset();
        this.velocity = { x: 0, y: 0 };
        this.damage = 0;
        this.color = 'red';
    }
}

class Vortex extends Entity {
    constructor(x, y, levelData) {
        super(x, y, 10);
        this.duration = levelData.duration;
        this.initialDuration = levelData.duration;
        this.force = levelData.force;
        this.damage = levelData.damage;
        this.maxRadius = levelData.radius;
        this.isExplosion = levelData.isExplosion || false;
        this.animationFrame = 0;
        this.enemiesHitByExplosion = new Set();
    }

    update() {
        this.duration--;
        if (this.duration <= 0) {
            this.isDead = true;
            this.enemiesHitByExplosion.forEach(enemy => {
                 if(enemy.hitBy) enemy.hitBy.delete(this);
            });
            return;
        }

        enemies.forEach(enemy => {
            const dist = Math.hypot(this.x - enemy.x, this.y - enemy.y);
            if(dist < this.maxRadius){
                if(this.isExplosion){
                    if(!enemy.hitBy.has(this)){
                        enemy.takeDamage(this.damage * player.damageModifier);
                        enemy.applyKnockback(this.x, this.y, CONFIG.ENEMY_KNOCKBACK_FORCE * 2);
                        enemy.hitBy.add(this);
                        this.enemiesHitByExplosion.add(enemy);
                    }
                } else {
                    const angle = Math.atan2(this.y - enemy.y, this.x - enemy.x);
                    enemy.x += Math.cos(angle) * this.force;
                    enemy.y += Math.sin(angle) * this.force;
                    if(frameCount % 60 === 0) enemy.takeDamage(this.damage * player.damageModifier);
                }
            }
        });
        this.animationFrame++;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);

        const lifeRatio = this.duration / this.initialDuration;
        const currentRadius = this.maxRadius * (this.isExplosion ? (1-lifeRatio) : 1);

        ctx.rotate(this.animationFrame * 0.05);

        ctx.fillStyle = `rgba(150, 0, 255, ${this.isExplosion ? lifeRatio * 0.8 : 0.2})`;
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(100, 0, 200, ${this.isExplosion ? lifeRatio * 0.6 : 0.1})`;
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius * 0.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

class StaticField extends Entity {
    constructor(x, y, levelData) {
        super(x, y, levelData.radius);
        this.duration = levelData.duration;
        this.slowFactor = levelData.slowFactor;
        this.animationFrame = 0;
    }

    update() {
        this.duration--;
        if (this.duration <= 0) this.isDead = true;
        this.animationFrame++;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);

        const lifeRatio = this.duration / SKILL_DATABASE['static_field'].levels[0].duration;
        const currentRadius = this.radius * (0.5 + 0.5 * (1 - lifeRatio));

        ctx.strokeStyle = `rgba(0, 255, 255, ${lifeRatio * 0.5})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(0, 255, 255, ${lifeRatio * 0.2})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius * 0.8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }
}

class SanctuaryZone extends Entity {
    constructor(x, y, levelData) {
        super(x, y, levelData.radius);
        this.duration = levelData.duration;
        this.slowFactor = levelData.slowFactor;
        this.regenBoost = levelData.regenBoost;
        this.animationFrame = 0;

        this.evolved = levelData.evolved || false;
        if (this.evolved) {
            this.dotDamage = 10;
        }
    }

    update() {
        this.duration--;
        if (this.duration <= 0) {
            this.isDead = true;
            return;
        }

        if (Math.hypot(this.x - player.x, this.y - player.y) < this.radius) {
            const baseRegen = player.skills['health_regen'] ? SKILL_DATABASE['health_regen'].levels[player.skills['health_regen'].level - 1].regenPerSecond : 0;
            const totalRegen = (baseRegen + this.regenBoost) / 60;
            player.health = Math.min(player.maxHealth, player.health + totalRegen);
        }

        enemies.forEach(enemy => {
            if (Math.hypot(this.x - enemy.x, this.y - enemy.y) < this.radius) {
                enemy.applySlow(60);
                if (this.evolved && frameCount % 60 === 0) {
                    enemy.takeDamage(this.dotDamage * player.damageModifier);
                    particleManager.createParticle(enemy.x, enemy.y, 'yellow', 1);
                }
            }
        });

        this.animationFrame++;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);

        const lifeRatio = this.duration / SKILL_DATABASE['sanctuary'].levels[0].duration;
        const pulse = 0.95 + Math.sin(this.animationFrame * 0.05) * 0.05;

        ctx.fillStyle = `rgba(255, 255, 150, ${lifeRatio * 0.15})`;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 255, 200, ${lifeRatio * 0.1})`;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.8 * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

function chainLightningEffect(source, initialTarget, levelData) {
    if (SKILL_DATABASE['chain_lightning'].causesHitStop) {
        hitStopTimer = 4;
    }

    let currentTarget = initialTarget;
    let targetsHit = new Set([currentTarget]);
    let lastPosition = { x: source.x, y: source.y };

    for (let i = 0; i < levelData.chains; i++) {
        if (!currentTarget) break;

        currentTarget.takeDamage(levelData.damage * player.damageModifier);
        createLightningBolt(lastPosition, currentTarget);

        lastPosition = { x: currentTarget.x, y: currentTarget.y };
        let nextTarget = null;
        let nearestDistSq = Infinity;

        for (const enemy of enemies) {
            if (!targetsHit.has(enemy) && !enemy.isDead) {
                const distSq = Math.hypot(currentTarget.x - enemy.x, currentTarget.y - enemy.y);
                if (distSq < levelData.chainRadius * levelData.chainRadius && distSq < nearestDistSq) {
                    nearestDistSq = distSq;
                    nextTarget = enemy;
                }
            }
        }

        currentTarget = nextTarget;
        if(currentTarget) targetsHit.add(currentTarget);
    }
}

function createLightningBolt(startPos, endPos) {
    const bolt = {
        points: [],
        life: 15
    };

    const dx = endPos.x - startPos.x;
    const dy = endPos.y - startPos.y;
    const distance = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    bolt.points.push({ x: startPos.x, y: startPos.y });

    const segmentCount = Math.floor(distance / 15);
    for (let i = 1; i < segmentCount; i++) {
        const progress = i / segmentCount;
        const x = startPos.x + progress * dx;
        const y = startPos.y + progress * dy;
        const offset = (Math.random() - 0.5) * 20;
        bolt.points.push({
            x: x + offset * Math.cos(angle + Math.PI / 2),
            y: y + offset * Math.sin(angle + Math.PI / 2)
        });
    }

    bolt.points.push({ x: endPos.x, y: endPos.y });
    activeLightningBolts.push(bolt);
}

function createSlashEffect(x, y, angle, range, arc) {
    const numParticles = 15;
    for (let i = 0; i < numParticles; i++) {
        const particleAngle = angle + (i / (numParticles - 1) - 0.5) * arc;
        const particleRange = range * 0.6 + Math.random() * (range * 0.4);

        const pX = x + Math.cos(particleAngle) * particleRange;
        const pY = y + Math.sin(particleAngle) * particleRange;

        const particle = getFromPool(particleManager.pool);
        if (particle) {
            particle.init(pX, pY, 'white', 1.5);
            const speed = 1.5;
            particle.velocity.x = Math.cos(particleAngle) * speed;
            particle.velocity.y = Math.sin(particleAngle) * speed;
            particleManager.activeParticles.push(particle);
        }
    }
}
