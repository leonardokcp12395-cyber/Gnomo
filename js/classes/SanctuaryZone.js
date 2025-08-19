import Entity from './Entity.js';
import { SKILL_DATABASE } from '../database.js';
import * as state from '../state.js';

export default class SanctuaryZone extends Entity {
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

        if (Math.hypot(this.x - state.player.x, this.y - state.player.y) < this.radius) {
            const baseRegen = state.player.skills['health_regen'] ? SKILL_DATABASE['health_regen'].levels[state.player.skills['health_regen'].level - 1].regenPerSecond : 0;
            const totalRegen = (baseRegen + this.regenBoost) / 60;
            state.player.health = Math.min(state.player.maxHealth, state.player.health + totalRegen);
        }

        state.enemies.forEach(enemy => {
            if (Math.hypot(this.x - enemy.x, this.y - enemy.y) < this.radius) {
                enemy.applySlow(60);

                if (this.evolved && state.frameCount % 60 === 0) {
                    enemy.takeDamage(this.dotDamage * state.player.damageModifier);
                    state.particleManager.createParticle(enemy.x, enemy.y, 'yellow', 1);
                }
            }
        });

        this.animationFrame++;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x - state.camera.x, this.y - state.camera.y);

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
