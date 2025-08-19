import Entity from './Entity.js';
import { SKILL_DATABASE } from '../database.js';
import { CONFIG } from '../constants.js';
import * as state from '../state.js';
import { releaseToPool } from '../utils.js';

export default class Projectile extends Entity {
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
        const screenLeft = state.camera.x;
        const screenRight = state.camera.x + state.canvas.width;
        const screenTop = state.camera.y;
        const screenBottom = state.camera.y + state.canvas.height;
        const largerDimension = this.length || this.radius;
        if (this.x + largerDimension < screenLeft || this.x - largerDimension > screenRight ||
            this.y + largerDimension < screenTop || this.y - largerDimension > screenBottom) {
            return;
        }

        ctx.save();
        ctx.translate(this.x - state.camera.x, this.y - state.camera.y);

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
            this.x = state.player.x;
            this.y = state.player.y;
            this.angle = Math.atan2(state.player.lastMoveDirection.y, state.player.lastMoveDirection.x);
            if (this.duration <= 0) {
                this.isDead = true;
                releaseToPool(this);
            }
        } else {
            this.x += this.velocity.x;
            this.y += this.velocity.y;
        }

        if (state.frameCount % 3 === 0) {
            const trailColor = `rgba(255, 255, ${Math.floor(Math.random() * 255)}, 0.5)`;
            const trailRadius = this.radius * (Math.random() * 0.3 + 0.2);
            state.particleManager.createTrailParticle(this.x, this.y, trailColor, trailRadius);
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
