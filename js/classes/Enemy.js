import Entity from './Entity.js';
import * as state from '../state.js';
import { CONFIG } from '../constants.js';
import { getFromPool } from '../utils.js';
import { showTemporaryMessage } from '../utils.js';
import { savePermanentData } from '../data.js';
import { checkAchievements } from '../achievements.js';
import PowerUp from './PowerUp.js';
import Vortex from './Vortex.js';
import { SKILL_DATABASE } from '../database.js';

export default class Enemy extends Entity {
    constructor(x, y, type = 'chaser', isElite = false) {
        super(x, y, 10);
        this.type = type;
        this.isElite = isElite;
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
                this.speed = Math.min(6.0, 4.0 + (state.gameTime / 180) + (state.waveNumber * 0.015));
                this.radius = 10; this.health = 15 + Math.floor(state.gameTime / 20) * 2 + state.waveNumber; this.color = '#7DF9FF';
                this.shape = 'diamond'; this.damage = 30; this.xpValue = 15; this.explodesOnDeath = true;
                break;
            case 'tank':
                this.speed = Math.min(2.0, 1.2 + (state.gameTime / 200) + (state.waveNumber * 0.004));
                this.radius = 18; this.health = 70 + Math.floor(state.gameTime / 10) * 7 + (state.waveNumber * 3); this.color = '#FFA500';
                this.shape = 'square'; this.damage = 12; this.xpValue = 40;
                break;
            // ... (other cases would be here)
            default: // chaser
                this.speed = Math.min(4.0, 2.2 + (state.gameTime / 150) + (state.waveNumber * 0.008));
                this.radius = 12; this.health = 25 + Math.floor(state.gameTime / 10) * 3 + (state.waveNumber * 1.5); this.color = '#FF4D4D';
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
    }

    draw(ctx) {
        // ...
    }

    update() {
        // ...
    }

    takeDamage(amount) {
        if(this.isDead) return;
        this.health -= amount;
        this.hitTimer = 5;

        state.activeDamageNumbers.push(getFromPool(state.damageNumberPool, this.x, this.y, amount));

        for (let i = 0; i < 5; i++) {
            state.particleManager.createParticle(this.x, this.y, this.color, 1.8);
        }
        if (this.health <= 0) {
            this.isDead = true;
            getFromPool(state.xpOrbPool, this.x, this.y, this.xpValue);
            state.score.kills++;

            if(state.playerAchievements.stats) {
                state.playerAchievements.stats.totalKills = (state.playerAchievements.stats.totalKills || 0) + 1;
                checkAchievements('totalKills');
            }

            for (let i = 0; i < 10; i++) {
                state.particleManager.createParticle(this.x, this.y, this.color, 3);
            }

            if(this.explodesOnDeath) {
                const explosionRadius = this.type === 'reaper' ? 70 : 90;
                state.activeVortexes.push(new Vortex(this.x, this.y, {radius: explosionRadius, duration: 30, damage: this.damage, isExplosion:true, force: 0}));
                for (let i = 0; i < 20; i++) { state.particleManager.createParticle(this.x, this.y, this.color, 4); }
            }

            if(Math.random() < state.player.powerupDropChance){
                state.powerUps.push(new PowerUp(this.x, this.y, 'nuke'));
                showTemporaryMessage("NUKE!", "yellow");
            }

            if (state.isGoldenFrenzyActive) {
                const gemChance = 0.1;
                if (Math.random() < gemChance) {
                    state.setPlayerGems(state.playerGems + 1);
                    showTemporaryMessage("+1 Gema!", 'violet');
                    savePermanentData();
                }
            }

            if (this.isElite) {
                const gemsDropped = Math.floor(Math.random() * 3) + 1;
                state.setPlayerGems(state.playerGems + gemsDropped);
                const gemText = `+${gemsDropped} Gemas!`;
                state.activeDamageNumbers.push(getFromPool(state.damageNumberPool, this.x, this.y - 15, gemText, '#DA70D6'));
                savePermanentData();
            }

            if (state.player.skills['celestial_pact']) {
                const levelData = SKILL_DATABASE['celestial_pact'].levels[state.player.skills['celestial_pact'].level - 1];
                if (levelData.gemBonus && Math.random() < levelData.gemBonus) {
                    state.setPlayerGems(state.playerGems + 1);
                    showTemporaryMessage("+1 Gema (Pacto)!", 'violet');
                    savePermanentData();
                }
            }

            state.setWaveEnemiesRemaining(state.waveEnemiesRemaining - 1);
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
