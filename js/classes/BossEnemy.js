import Entity from './Entity.js';
import * as state from '../state.js';
import { getFromPool } from '../utils.js';
import { showTemporaryMessage } from '../utils.js';
import { savePermanentData } from '../data.js';
import Enemy from './Enemy.js';
import { CONFIG } from '../constants.js';

export default class BossEnemy extends Entity {
    constructor(x, y) {
        super(x, y, 40);
        this.maxHealth = 1000 + (state.waveNumber * 150);
        this.health = this.maxHealth;
        this.speed = 1.2 + (state.waveNumber * 0.02);
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
        ctx.translate(this.x - state.camera.x, this.y - state.camera.y);

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
        const angleToPlayer = Math.atan2(state.player.y - this.y, state.player.x - this.x);

        if (this.currentAttack === 'chase') {
            this.x += Math.cos(angleToPlayer) * this.speed;
            this.y += Math.sin(angleToPlayer) * this.speed;
        } else if (this.currentAttack === 'shoot_ring' && state.frameCount % 30 === 0) {
            for(let i=0; i<8; i++) {
                const angle = i * Math.PI / 4;
                getFromPool(state.enemyProjectilePool, this.x, this.y, angle, 3, 10);
            }
        } else if (this.currentAttack === 'barrage' && state.frameCount % 10 === 0) {
            getFromPool(state.enemyProjectilePool, this.x, this.y, angleToPlayer + (Math.random() - 0.5) * 0.5, 5, 15);
        } else if (this.currentAttack === 'summon' && this.attackPatternTimer === 100) {
            state.enemies.push(new Enemy(this.x + (Math.random()-0.5)*50, this.y + (Math.random()-0.5)*50, 'speeder', true));
            state.enemies.push(new Enemy(this.x + (Math.random()-0.5)*50, this.y + (Math.random()-0.5)*50, 'chaser', true));
        }
    }

    takeDamage(amount) {
        if(this.isDead) return;
        this.health -= amount;
        this.hitTimer = 5;

        state.activeDamageNumbers.push(getFromPool(state.damageNumberPool, this.x, this.y, amount));

        for (let i = 0; i < 10; i++) {
            state.particleManager.createParticle(this.x, this.y, this.color, 2.5);
        }
        if (this.health <= 0) {
            this.isDead = true;
            getFromPool(state.xpOrbPool, this.x, this.y, this.xpValue);
            state.score.kills++;
            state.setWaveEnemiesRemaining(state.waveEnemiesRemaining - 1);
            showTemporaryMessage("BOSS DERROTADO!", "gold");
            state.setScreenShake({ intensity: 20, duration: 60 });
            for (let i = 0; i < 50; i++) {
                state.particleManager.createParticle(this.x, this.y, this.color, 5);
            }
            const gemsDropped = Math.floor(Math.random() * 10) + 5;
            state.setPlayerGems(state.playerGems + gemsDropped);
            showTemporaryMessage(`+${gemsDropped} Gemas!`, 'violet');
            savePermanentData();
        }
    }

    applyKnockback(sourceX, sourceY, force) {
        // Bosses are immune to knockback.
    }
}
