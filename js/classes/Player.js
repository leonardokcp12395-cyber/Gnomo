import Entity from './Entity.js';
import { CHARACTER_DATABASE, PERMANENT_UPGRADES, SKILL_DATABASE } from '../database.js';
import { CONFIG } from '../constants.js';
import * as state from '../state.js';
import { setGameState } from '../ui.js';
import { getFromPool } from '../utils.js';
import { showTemporaryMessage } from '../utils.js';
import Vortex from './Vortex.js';
import StaticField from './StaticField.js';
import { chainLightningEffect, createSlashEffect } from '../effects.js';

export default class Player extends Entity {
    constructor(characterId = 'SERAPH') {
        super(0, 0, 15);
        const characterData = CHARACTER_DATABASE[characterId];

        const healthUpgradeLevel = state.playerUpgrades.max_health || 0;
        const damageUpgradeLevel = state.playerUpgrades.damage_boost || 0;
        const xpUpgradeLevel = state.playerUpgrades.xp_gain || 0;
        const luckUpgradeLevel = state.playerUpgrades.initial_luck || 0;
        const knowledgeUpgradeLevel = state.playerUpgrades.ancient_knowledge || 0;

        this.baseHealth = characterData.baseHealth + (healthUpgradeLevel > 0 ? PERMANENT_UPGRADES.max_health.levels[healthUpgradeLevel - 1].effect : 0);
        this.damageModifier = 1 + (damageUpgradeLevel > 0 ? PERMANENT_UPGRADES.damage_boost.levels[damageUpgradeLevel - 1].effect : 0);
        this.xpModifier = 1;
        this.powerupDropChance = CONFIG.POWERUP_DROP_CHANCE * (1 + (luckUpgradeLevel > 0 ? PERMANENT_UPGRADES.initial_luck.levels[luckUpgradeLevel - 1].effect : 0));
        this.freeRerolls = (knowledgeUpgradeLevel > 0 ? PERMANENT_UPGRADES.ancient_knowledge.levels[knowledgeUpgradeLevel - 1].effect : 0);

        this.maxHealth = this.baseHealth;
        this.health = this.maxHealth;
        this.speed = characterData.speed;
        this.xp = 0;
        this.level = 1;
        this.xpToNextLevel = CONFIG.XP_TO_NEXT_LEVEL_BASE;
        this.skills = {};
        this.recalculateStatModifiers();
        this.collectRadius = CONFIG.XP_ORB_ATTRACTION_RADIUS;
        this.facingRight = true;
        this.hitTimer = 0;
        this.animationFrame = 0;
        this.velocityY = 0;
        this.onGround = false;
        this.jumpsAvailable = 1;
        this.isDashing = false;
        this.dashTimer = 0;
        this.dashCooldown = 0;
        this.lastMoveDirection = { x: 1, y: 0 };
        this.squashStretchTimer = 0;
        this.x = state.canvas.width / 2;
        this.y = state.canvas.height * (1 - CONFIG.GROUND_HEIGHT_PERCENT) - this.radius;
        this.onGround = true;
        this.shielded = false;
        this.shieldTimer = 0;
        this.invincibilityTimer = 0;
        this.knockbackVelocity = { x: 0, y: 0 };
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
    }

    draw(ctx) {
        if (this.invincibilityTimer > 0 && state.frameCount % 8 < 4) {
            this.animationFrame++;
            return;
        }

        ctx.save();
        ctx.translate(this.x - state.camera.x, this.y - state.camera.y);

        let scaleX = 1;
        let scaleY = 1;
        if (this.squashStretchTimer > 0) {
            const progress = this.squashStretchTimer / CONFIG.PLAYER_LANDING_SQUASH_DURATION;
            scaleY = 1 - (0.3 * Math.sin(Math.PI * progress));
            scaleX = 1 + (0.3 * Math.sin(Math.PI * progress));
            this.squashStretchTimer--;
        }
        ctx.scale(this.facingRight ? scaleX : -scaleX, scaleY);

        if (this.hitTimer > 0) {
            ctx.fillStyle = 'red';
            this.hitTimer--;
        } else {
            ctx.fillStyle = 'white';
        }

        ctx.beginPath();
        ctx.moveTo(0, -this.radius * 1.5);
        ctx.lineTo(this.radius * 1.2, this.radius * 0.8);
        ctx.lineTo(-this.radius * 1.2, this.radius * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'cyan';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#00FFFF';
        ctx.beginPath();
        ctx.moveTo(0, -this.radius * 0.5);
        ctx.lineTo(this.radius * 0.4, this.radius * 0.2);
        ctx.lineTo(-this.radius * 0.4, this.radius * 0.2);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(this.radius * 0.8, -this.radius * 0.5);
        ctx.quadraticCurveTo(this.radius * 2, -this.radius * 1.5, this.radius * 1.5, this.radius * 0.5);
        ctx.lineTo(this.radius * 0.8, this.radius * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-this.radius * 0.8, -this.radius * 0.5);
        ctx.quadraticCurveTo(-this.radius * 2, -this.radius * 1.5, -this.radius * 1.5, this.radius * 0.5);
        ctx.lineTo(-this.radius * 0.8, this.radius * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (this.shielded) {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 1.5, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 255, 255, ${0.5 + 0.5 * Math.sin(this.animationFrame * 0.1)})`;
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        ctx.restore();
        this.animationFrame++;
    }

    update() {
        if (this.invincibilityTimer > 0) this.invincibilityTimer--;
        if (this.coyoteTimer > 0) this.coyoteTimer--;
        if (this.jumpBufferTimer > 0) this.jumpBufferTimer--;

        this.handleMovement();
        this.applyGravity();
        this.updateSkills();

        if (state.platforms.length > 0) {
            const groundPlatform = state.platforms[0];
            const groundTopY = groundPlatform.y;
            if (this.y > groundTopY + 400) {
                this.takeDamage(9999);
            }
        }

        if (this.skills['health_regen']) {
            const regenLevelData = SKILL_DATABASE['health_regen'].levels[this.skills['health_regen'].level - 1];
            this.health = Math.min(this.maxHealth, this.health + regenLevelData.regenPerSecond / 60);
        }

        state.camera.targetX = this.x - state.canvas.width / 2;
        state.camera.targetY = this.y - state.canvas.height / 2;

        const halfWorldWidth = CONFIG.WORLD_BOUNDS.width / 2;
        this.x = Math.max(-halfWorldWidth + this.radius, Math.min(this.x, halfWorldWidth - this.radius));
    }

    handleMovement() {
        // ...
    }

    moveAndCollide(dx, dy) {
        // ...
    }

    applyGravity() {
        // ...
    }

    dash() {
        // ...
    }

    takeDamage(amount, source = null) {
        if (this.isDashing || this.invincibilityTimer > 0) {
            return;
        }

        if (this.shielded) {
            this.shielded = false;
            for(let i=0; i<20; i++) state.particleManager.createParticle(this.x, this.y, 'cyan', 3);
            return;
        }

        this.health -= amount;
        this.hitTimer = 30;
        state.setScreenShake({ intensity: 5, duration: 15 });

        this.invincibilityTimer = 36;

        if (source) {
            const knockbackForce = 8;
            const angle = Math.atan2(this.y - source.y, this.x - source.x);
            this.knockbackVelocity.x = Math.cos(angle) * knockbackForce;
            this.knockbackVelocity.y = Math.sin(angle) * knockbackForce;
        }

        if (this.health <= 0) {
            this.health = 0;
            this.isDead = true;
            setGameState('gameOver');
        }
    }

    addXp(amount) {
        this.xp += amount * this.xpModifier;
        for (let i = 0; i < 4; i++) {
            state.particleManager.createParticle(this.x, this.y, 'cyan', 2);
        }

        while (this.xp >= this.xpToNextLevel) {
            this.level++;
            this.xp -= this.xpToNextLevel;
            this.xpToNextLevel = Math.floor(this.xpToNextLevel * CONFIG.XP_TO_NEXT_LEVEL_MULTIPLIER);
            setGameState('levelUp');
        }
    }

    addSkill(skillId) {
        // ...
    }

    updateSkills() {
        // ...
    }

    findNearestEnemy() {
        // ...
    }

    recalculateStatModifiers() {
        // ...
    }
}
