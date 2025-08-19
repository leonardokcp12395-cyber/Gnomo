import Entity from './Entity.js';
import * as state from '../state.js';
import { CONFIG } from '../constants.js';
import SoundManager from '../sound.js';

export default class PowerUp extends Entity {
    constructor(x, y, type) {
        super(x, y, 10);
        this.type = type;
        this.animationFrame = 0;
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x - state.camera.x, this.y - state.camera.y);

        if (this.type === 'heal_orb') {
            ctx.fillStyle = `rgba(255, 0, 0, ${0.7 + Math.sin(this.animationFrame * 0.1) * 0.3})`;
            ctx.beginPath();
            ctx.moveTo(0, -this.radius * 0.4);
            ctx.bezierCurveTo(-this.radius, -this.radius, -this.radius, 0, 0, this.radius * 0.6);
            ctx.bezierCurveTo(this.radius, 0, this.radius, -this.radius, 0, -this.radius * 0.4);
            ctx.fill();
        } else { // Nuke
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
        if (Math.hypot(state.player.x - this.x, state.player.y - this.y) < state.player.radius + this.radius) {
            this.applyEffect();
            this.isDead = true;
        }
    }
    applyEffect() {
        if (this.type === 'nuke') {
            state.enemies.forEach(e => {
                e.takeDamage(10000);
                e.applyKnockback(this.x, this.y, CONFIG.ENEMY_KNOCKBACK_FORCE * 5);
            });
            SoundManager.play('nuke', '8n');
            state.setScreenShake({ intensity: 15, duration: 30 });
        } else if (this.type === 'heal_orb') {
            state.player.health = Math.min(state.player.maxHealth, state.player.health + state.player.maxHealth * 0.10);
            SoundManager.play('xp', 'A5');
            for (let i = 0; i < 10; i++) {
                state.particleManager.createParticle(this.x, this.y, 'red', 1.5);
            }
        }
    }
}
