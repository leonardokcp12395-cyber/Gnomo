class Enemy extends Entity {
    constructor(x, y, type = 'chaser', isElite = false) {
        super(x, y, 10);
        this.type = type;
        this.isElite = isElite;
        this.facingRight = true;
        this.hitTimer = 0;
        this.hitBy = new Set();
        this.animationFrame = 0;
        this.attackTimer = 0;
        this.knockbackVelocity = { x: 0, y: 0 };
        this.orbHitCooldown = 0;
        this.slowedTimer = 0;
        this.explodesOnDeath = false;

        switch(type) {
            case 'reaper':
                this.speed = Math.min(6.0, 4.0 + (gameTime / 180) + (waveNumber * 0.015));
                this.radius = 10; this.health = 15 + Math.floor(gameTime / 20) * 2 + waveNumber; this.color = '#7DF9FF';
                this.shape = 'diamond'; this.damage = 30; this.xpValue = 15; this.explodesOnDeath = true;
                break;
            case 'tank':
                this.speed = Math.min(2.0, 1.2 + (gameTime / 200) + (waveNumber * 0.004));
                this.radius = 18; this.health = 70 + Math.floor(gameTime / 10) * 7 + (waveNumber * 3); this.color = '#FFA500';
                this.shape = 'square'; this.damage = 12; this.xpValue = 40;
                break;
            case 'speeder':
                this.speed = Math.min(5.5, 3.5 + (gameTime / 100) + (waveNumber * 0.012));
                this.radius = 8; this.health = 12 + Math.floor(gameTime / 15) * 2 + waveNumber; this.color = '#FFFF00';
                this.shape = 'triangle'; this.damage = 7; this.xpValue = 12;
                break;
            case 'bomber':
                this.speed = Math.min(2.5, 1.5 + (gameTime / 220) + (waveNumber * 0.006));
                this.radius = 12; this.health = 45 + Math.floor(gameTime / 10) * 4 + (waveNumber * 2); this.color = '#9400D3';
                this.shape = 'pentagon'; this.damage = 9; this.xpValue = 25; this.explodesOnDeath = true;
                break;
            case 'shooter':
                this.speed = Math.min(1.5, 0.8 + (gameTime / 280) + (waveNumber * 0.003));
                this.radius = 15; this.health = 35 + Math.floor(gameTime / 10) * 4 + (waveNumber * 2); this.color = '#FF00FF';
                this.shape = 'star'; this.damage = 4; this.xpValue = 35; this.attackCooldown = 150;
                this.attackTimer = this.attackCooldown; this.projectileSpeed = 3.5; this.projectileDamage = 8;
                break;
            case 'healer':
                this.speed = Math.min(1.2, 0.7 + (gameTime / 300) + (waveNumber * 0.002));
                this.radius = 14; this.health = 60 + Math.floor(gameTime / 10) * 6 + (waveNumber * 3); this.color = '#00FF00';
                this.shape = 'cross'; this.damage = 0; this.xpValue = 50; this.healCooldown = 180;
                this.healTimer = this.healCooldown; this.healAmount = 5 + Math.floor(gameTime / 20); this.healRadius = 100;
                break;
            case 'summoner':
                this.speed = Math.min(1.0, 0.6 + (gameTime / 350) + (waveNumber * 0.001));
                this.radius = 20; this.health = 80 + Math.floor(gameTime / 10) * 8 + (waveNumber * 4); this.color = '#8B4513';
                this.shape = 'pyramid'; this.damage = 0; this.xpValue = 70; this.summonCooldown = 240;
                this.summonTimer = this.summonCooldown;
                break;
            case 'charger':
                this.speed = Math.min(3.0, 2.0 + (gameTime / 160) + (waveNumber * 0.007));
                this.radius = 14; this.health = 50 + Math.floor(gameTime / 10) * 5 + (waveNumber * 2.5); this.color = '#FF69B4';
                this.shape = 'hexagon'; this.damage = 25; this.xpValue = 30;
                this.state = 'chasing';
                this.telegraphTimer = 0;
                this.chargeTarget = null;
                this.chargeDuration = 0;
                break;
            default: // chaser
                this.speed = Math.min(4.0, 2.2 + (gameTime / 150) + (waveNumber * 0.008));
                this.radius = 12; this.health = 25 + Math.floor(gameTime / 10) * 3 + (waveNumber * 1.5); this.color = '#FF4D4D';
                this.shape = 'circle'; this.damage = 8; this.xpValue = 20;
                break;
        }
        if (this.isElite) {
            this.radius *= 1.5;
            this.health *= 2.5;
            this.damage *= 1.5;
            this.xpValue *= 2;
            this.color = 'gold';
        }
        this.maxHealth = this.health;

        if (this.type === 'speeder') this.sprite = assets.loadedImages.enemySpeeder;
        else if (this.type === 'shooter') this.sprite = assets.loadedImages.enemyShooter;
        else if (this.type === 'summoner') this.sprite = assets.loadedImages.enemySummoner;
        else if (this.type === 'bomber') this.sprite = assets.loadedImages.enemyBomber;
        else if (this.type === 'charger') this.sprite = assets.loadedImages.enemyCharger;
        else if (this.type === 'healer') this.sprite = assets.loadedImages.enemyHealer;
        else if (this.type === 'tank') this.sprite = assets.loadedImages.enemyTank;
        else if (this.type === 'reaper') this.sprite = assets.loadedImages.enemyReaper;
        else this.sprite = assets.loadedImages.enemyChaser;
    }

    draw(ctx) {
        const screenLeft = camera.x;
        const screenRight = camera.x + canvas.width;
        const screenTop = camera.y;
        const screenBottom = camera.y + canvas.height;
        if (this.x + this.radius < screenLeft || this.x - this.radius > screenRight ||
            this.y + this.radius < screenTop || this.y - this.radius > screenBottom) {
            return;
        }

        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);

        if (!this.facingRight) {
            ctx.scale(-1, 1);
        }

        const img = this.sprite;
        let drawWidth, drawHeight;
        const desiredHeight = this.radius * 2.5;
        if (img && img.naturalHeight > 0) {
            const aspectRatio = img.naturalWidth / img.naturalHeight;
            drawHeight = desiredHeight;
            drawWidth = drawHeight * aspectRatio;
        } else {
            drawWidth = this.radius * 2;
            drawHeight = this.radius * 2;
        }

        if (this.hitTimer > 0) {
            ctx.filter = 'brightness(1.5) contrast(1.5)';
            this.hitTimer--;
        }

        ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        ctx.filter = 'none';

        this.animationFrame++;

        if (this.isElite) {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 1.2, 0, Math.PI * 2);
            ctx.strokeStyle = 'gold';
            ctx.lineWidth = 3;
            ctx.stroke();

            const healthBarWidth = this.radius * 2;
            const healthPercentage = this.health / this.maxHealth;
            ctx.fillStyle = '#333';
            ctx.fillRect(-healthBarWidth / 2, this.radius + 10, healthBarWidth, 5);
            ctx.fillStyle = 'red';
            ctx.fillRect(-healthBarWidth / 2, this.radius + 10, healthBarWidth * healthPercentage, 5);
        }

        ctx.restore();
    }

    update() {
        if (this.slowedTimer > 0) this.slowedTimer--;

        this.x += this.knockbackVelocity.x;
        this.y += this.knockbackVelocity.y;
        this.knockbackVelocity.x *= 0.9;
        this.knockbackVelocity.y *= 0.9;
        if (Math.hypot(this.knockbackVelocity.x, this.knockbackVelocity.y) < 0.1) {
            this.knockbackVelocity.x = 0;
            this.knockbackVelocity.y = 0;
        }

        if (this.orbHitCooldown > 0) {
            this.orbHitCooldown--;
        }

        if (this.type === 'reaper' && Math.hypot(player.x - this.x, player.y - this.y) < this.radius + 40) {
            this.health = 0;
            this.takeDamage(1);
            return;
        }

        if (this.type === 'charger') {
            const dist = Math.hypot(player.x - this.x, player.y - this.y);
            switch (this.state) {
                case 'chasing':
                    if (dist < 150) {
                        this.state = 'telegraphing';
                        this.telegraphTimer = 60;
                        this.chargeTarget = { x: player.x, y: player.y };
                    }
                    break;
                case 'telegraphing':
                    this.telegraphTimer--;
                    this.color = frameCount % 10 < 5 ? '#FFFFFF' : '#FF69B4';
                    if (this.telegraphTimer <= 0) {
                        this.state = 'charging';
                        this.chargeDuration = 30;
                    }
                    break;
                case 'charging':
                    const chargeAngle = Math.atan2(this.chargeTarget.y - this.y, this.chargeTarget.x - this.x);
                    this.x += Math.cos(chargeAngle) * this.speed * 3;
                    this.y += Math.sin(chargeAngle) * this.speed * 3;
                    this.chargeDuration--;
                    if (this.chargeDuration <= 0 || Math.hypot(this.chargeTarget.x - this.x, this.chargeTarget.y - this.y) < 20) {
                        this.state = 'chasing';
                    }
                    break;
            }
            if (this.state !== 'chasing') {
                return;
            }
        }

        if (Math.hypot(this.knockbackVelocity.x, this.knockbackVelocity.y) < 5) {
            let angle = Math.atan2(player.y - this.y, player.x - this.x);
            let currentSpeed = this.speed;

            if (this.type === 'shooter') {
                const dist = Math.hypot(player.x - this.x, player.y - this.y);
                if (dist < CONFIG.SHOOTER_MIN_DISTANCE) {
                    angle += Math.PI;
                } else if (dist > CONFIG.SHOOTER_MIN_DISTANCE + 50) {
                } else {
                    currentSpeed = 0;
                }
            }

            let finalSlowFactor = 0;
            if (this.slowedTimer > 0) {
                finalSlowFactor = Math.max(finalSlowFactor, 0.5);
            }
            for (const field of activeStaticFields) {
                if (Math.hypot(field.x - this.x, field.y - this.y) < field.radius) {
                    finalSlowFactor = Math.max(finalSlowFactor, field.slowFactor);
                    break;
                }
            }
            currentSpeed *= (1 - finalSlowFactor);

            const vx = Math.cos(angle) * currentSpeed;
            if (vx > 0.1) this.facingRight = true;
            else if (vx < -0.1) this.facingRight = false;

            this.x += vx;
            this.y += Math.sin(angle) * currentSpeed;
        }

        if (this.type === 'shooter') {
            this.attackTimer--;
            if (this.attackTimer <= 0) {
                const angle = Math.atan2(player.y - this.y, player.x - this.x);
                getFromPool(enemyProjectilePool, this.x, this.y, angle, this.projectileSpeed, this.projectileDamage);
                this.attackTimer = this.attackCooldown;
            }
        }
        if (this.type === 'healer') {
            this.healTimer--;
            if (this.healTimer <= 0) {
                enemies.forEach(otherEnemy => {
                    if (otherEnemy !== this && Math.hypot(this.x - otherEnemy.x, this.y - otherEnemy.y) < this.healRadius) {
                        otherEnemy.health = Math.min(otherEnemy.maxHealth, otherEnemy.health + this.healAmount);
                        for (let i = 0; i < 3; i++) { particleManager.createParticle(otherEnemy.x, otherEnemy.y, 'lime', 1); }
                    }
                });
                this.healTimer = this.healCooldown;
            }
        }
        if (this.type === 'summoner') {
            this.summonTimer--;
            if (this.summonTimer <= 0) {
                const summonedType = Math.random() < 0.5 ? 'chaser' : 'speeder';
                enemies.push(new Enemy(this.x + (Math.random()-0.5)*50, this.y + (Math.random()-0.5)*50, summonedType));
                for (let i = 0; i < 5; i++) { particleManager.createParticle(this.x, this.y, 'brown', 2); }
                this.summonTimer = this.summonCooldown;
            }
        }

        const halfWorldWidth = CONFIG.WORLD_BOUNDS.width / 2;
        const halfWorldHeight = CONFIG.WORLD_BOUNDS.height / 2;
        this.x = Math.max(-halfWorldWidth + this.radius, Math.min(this.x, halfWorldWidth - this.radius));
        this.y = Math.max(-halfWorldHeight + this.radius, Math.min(this.y, halfWorldHeight - this.radius));
    }

    takeDamage(amount) {
        if(this.isDead) return;
        this.health -= amount;
        this.hitTimer = 5;

        activeDamageNumbers.push(getFromPool(damageNumberPool, this.x, this.y, amount));

        for (let i = 0; i < 5; i++) {
            particleManager.createParticle(this.x, this.y, this.color, 1.8);
        }
        if (this.health <= 0) {
            this.isDead = true;
            getFromPool(xpOrbPool, this.x, this.y, this.xpValue);
            score.kills++;

            if(playerAchievements.stats) {
                playerAchievements.stats.totalKills = (playerAchievements.stats.totalKills || 0) + 1;
                checkAchievements('totalKills');
            }

            for (let i = 0; i < 10; i++) {
                particleManager.createParticle(this.x, this.y, this.color, 3);
            }

            if(this.explodesOnDeath) {
                const explosionRadius = this.type === 'reaper' ? 70 : 90;
                activeVortexes.push(new Vortex(this.x, this.y, {radius: explosionRadius, duration: 30, damage: this.damage, isExplosion:true, force: 0}));
                for (let i = 0; i < 20; i++) { particleManager.createParticle(this.x, this.y, this.color, 4); }
            }

            if(Math.random() < player.powerupDropChance){
                powerUps.push(new PowerUp(this.x, this.y, 'nuke'));
                showTemporaryMessage("NUKE!", "yellow");
            }

            if (isGoldenFrenzyActive) {
                const gemChance = 0.1;
                if (Math.random() < gemChance) {
                    playerGems++;
                    showTemporaryMessage("+1 Gema!", 'violet');
                    savePermanentData();
                }
            }

            if (this.isElite) {
                const gemsDropped = Math.floor(Math.random() * 3) + 1;
                playerGems += gemsDropped;
                const gemText = `+${gemsDropped} Gemas!`;
                activeDamageNumbers.push(getFromPool(damageNumberPool, this.x, this.y - 15, gemText, '#DA70D6'));
                savePermanentData();
            }

            if (player.skills['celestial_pact']) {
                const levelData = SKILL_DATABASE['celestial_pact'].levels[player.skills['celestial_pact'].level - 1];
                if (levelData.gemBonus && Math.random() < levelData.gemBonus) {
                    playerGems++;
                    showTemporaryMessage("+1 Gema (Pacto)!", 'violet');
                    savePermanentData();
                }
            }

            waveEnemiesRemaining--;
        }
    }

    applyKnockback(sourceX, sourceY, force) {
        const angle = Math.atan2(this.y - sourceY, this.x - sourceX);
        this.knockbackVelocity.x = Math.cos(angle) * force;
        this.knockbackVelocity.y = Math.sin(angle) * force;
    }

    applySlow(duration) {
        this.slowedTimer = Math.max(this.slowedTimer, duration);
    }
}

class BossEnemy extends Entity {
    constructor(x, y) {
        super(x, y, 40);
        this.maxHealth = 1000 + (waveNumber * 150);
        this.health = this.maxHealth;
        this.speed = 1.2 + (waveNumber * 0.02);
        this.damage = 25;
        this.xpValue = 500;
        this.color = '#8A2BE2';
        this.animationFrame = 0;
        this.phase = 1;
        this.attackPatternTimer = 0;
        this.currentAttack = 'chase';
        this.hitTimer = 0;
        this.orbHitCooldown = 0;
        this.knockbackVelocity = { x: 0, y: 0 };
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);

        const color = this.hitTimer > 0 ? 'white' : this.color;
        ctx.fillStyle = color;

        ctx.rotate(this.animationFrame * 0.01);
        ctx.beginPath();
        for(let i=0; i<6; i++) {
            const angle = i * Math.PI / 3;
            ctx.lineTo(Math.cos(angle) * this.radius, Math.sin(angle) * this.radius);
        }
        ctx.closePath();
        ctx.fill();

        const pulse = Math.sin(this.animationFrame * 0.05) * 5 + (this.radius / 2);
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(0, 0, pulse, 0, Math.PI * 2);
        ctx.fill();

        const healthBarWidth = this.radius * 3;
        const healthPercentage = this.health / this.maxHealth;
        ctx.fillStyle = '#333';
        ctx.fillRect(-healthBarWidth / 2, this.radius + 15, healthBarWidth, 10);
        ctx.fillStyle = '#FF00FF';
        ctx.fillRect(-healthBarWidth / 2, this.radius + 15, healthBarWidth * healthPercentage, 10);

        ctx.restore();
        if (this.hitTimer > 0) this.hitTimer--;
    }

    update() {
        this.animationFrame++;
        this.attackPatternTimer--;

        this.x += this.knockbackVelocity.x;
        this.y += this.knockbackVelocity.y;
        this.knockbackVelocity.x *= 0.95;
        this.knockbackVelocity.y *= 0.95;

        if (this.health < this.maxHealth / 2 && this.phase === 1) {
            this.phase = 2;
            this.speed *= 1.5;
            this.currentAttack = 'barrage';
            this.attackPatternTimer = 0;
            showTemporaryMessage("FÚRIA DO BOSS!", "red");
        }

        if (this.attackPatternTimer <= 0) {
            this.chooseNextAttack();
        }
        this.executeAttack();

        if (this.orbHitCooldown > 0) {
            this.orbHitCooldown--;
        }

        const halfWorldWidth = CONFIG.WORLD_BOUNDS.width / 2;
        const halfWorldHeight = CONFIG.WORLD_BOUNDS.height / 2;
        this.x = Math.max(-halfWorldWidth + this.radius, Math.min(this.x, halfWorldWidth - this.radius));
        this.y = Math.max(-halfWorldHeight + this.radius, Math.min(this.y, halfWorldHeight - this.radius));
    }

    chooseNextAttack() {
        const attacks = (this.phase === 1) ? ['chase', 'shoot_ring'] : ['chase', 'barrage', 'summon'];
        this.currentAttack = attacks[Math.floor(Math.random() * attacks.length)];
        this.attackPatternTimer = 180;
    }

    executeAttack() {
        const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);

        if (this.currentAttack === 'chase') {
            this.x += Math.cos(angleToPlayer) * this.speed;
            this.y += Math.sin(angleToPlayer) * this.speed;
        } else if (this.currentAttack === 'shoot_ring' && frameCount % 30 === 0) {
            for(let i=0; i<8; i++) {
                const angle = i * Math.PI / 4;
                getFromPool(enemyProjectilePool, this.x, this.y, angle, 3, 10);
            }
        } else if (this.currentAttack === 'barrage' && frameCount % 10 === 0) {
            getFromPool(enemyProjectilePool, this.x, this.y, angleToPlayer + (Math.random() - 0.5) * 0.5, 5, 15);
        } else if (this.currentAttack === 'summon' && this.attackPatternTimer === 100) {
            enemies.push(new Enemy(this.x + (Math.random()-0.5)*50, this.y + (Math.random()-0.5)*50, 'speeder', true));
            enemies.push(new Enemy(this.x + (Math.random()-0.5)*50, this.y + (Math.random()-0.5)*50, 'chaser', true));
        }
    }

    takeDamage(amount) {
        if(this.isDead) return;
        this.health -= amount;
        this.hitTimer = 5;

        activeDamageNumbers.push(getFromPool(damageNumberPool, this.x, this.y, amount));

        for (let i = 0; i < 10; i++) {
            particleManager.createParticle(this.x, this.y, this.color, 2.5);
        }
        if (this.health <= 0) {
            this.isDead = true;
            getFromPool(xpOrbPool, this.x, this.y, this.xpValue);
            score.kills++;
            waveEnemiesRemaining--;
            showTemporaryMessage("BOSS DERROTADO!", "gold");
            screenShake = { intensity: 20, duration: 60 };
            for (let i = 0; i < 50; i++) {
                particleManager.createParticle(this.x, this.y, this.color, 5);
            }
            const gemsDropped = Math.floor(Math.random() * 10) + 5;
            playerGems += gemsDropped;
            showTemporaryMessage(`+${gemsDropped} Gemas!`, 'violet');
            savePermanentData();
        }
    }

    applyKnockback(sourceX, sourceY, force) {
        // Bosses are immune to knockback.
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

class ParticleManager {
    constructor(maxParticles = 500) {
        this.maxParticles = maxParticles;
        this.pool = createPool(Particle, maxParticles);
        this.activeParticles = [];
    }

    createParticle(x, y, color = 'white', scale = 1) {
        if (this.activeParticles.length >= this.maxParticles) {
            const oldestParticle = this.activeParticles.shift();
            releaseToPool(oldestParticle);
        }
        const p = getFromPool(this.pool, x, y, color, scale);
        this.activeParticles.push(p);
    }

    createTrailParticle(x, y, color, radius) {
        if (this.activeParticles.length >= this.maxParticles) {
            const oldestParticle = this.activeParticles.shift();
            releaseToPool(oldestParticle);
        }
        const p = getFromPool(this.pool, x, y, color, 1);
        p.velocity = { x: 0, y: 0 };
        p.radius = radius;
        this.activeParticles.push(p);
    }

    update() {
        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            const p = this.activeParticles[i];
            p.update();
            if (p.isDead) {
                this.activeParticles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        this.activeParticles.forEach(p => p.draw(ctx));
    }
}

class Particle extends Entity {
    constructor() {
        super();
    }
    init(x, y, color = 'white', scale = 1) {
        super.reset();
        this.x = x;
        this.y = y;
        this.radius = (Math.random() * 3 + 1) * scale;
        this.velocity = { x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 6 };
        this.alpha = 1;
        this.friction = 0.95;
        this.color = color;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(-camera.x, -camera.y);
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }

    update() {
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.alpha -= 0.04;
        if (this.alpha <= 0) {
            this.isDead = true;
            releaseToPool(this);
        }
    }
    reset() {
        super.reset();
        this.velocity = { x: 0, y: 0 };
        this.alpha = 1;
        this.friction = 0.95;
        this.color = 'white';
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
