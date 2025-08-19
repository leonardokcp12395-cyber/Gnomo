import Entity from './Entity.js';
import * as state from '../state.js';
import { CONFIG } from '../constants.js';

export default class Vortex extends Entity {
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

        state.enemies.forEach(enemy => {
            const dist = Math.hypot(this.x - enemy.x, this.y - enemy.y);
            if(dist < this.maxRadius){
                if(this.isExplosion){
                    if(!enemy.hitBy.has(this)){
                        enemy.takeDamage(this.damage * state.player.damageModifier);
                        enemy.applyKnockback(this.x, this.y, CONFIG.ENEMY_KNOCKBACK_FORCE * 2);
                        enemy.hitBy.add(this);
                        this.enemiesHitByExplosion.add(enemy);
                    }
                } else {
                    const angle = Math.atan2(this.y - enemy.y, this.x - enemy.x);
                    enemy.x += Math.cos(angle) * this.force;
                    enemy.y += Math.sin(angle) * this.force;
                    if(state.frameCount % 60 === 0) enemy.takeDamage(this.damage * state.player.damageModifier);
                }
            }
        });
        this.animationFrame++;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x - state.camera.x, this.y - state.camera.y);

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
