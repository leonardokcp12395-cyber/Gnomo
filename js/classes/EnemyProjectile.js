import Entity from './Entity.js';
import * as state from '../state.js';
import { releaseToPool } from '../utils.js';

export default class EnemyProjectile extends Entity {
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
        const screenLeft = state.camera.x;
        const screenRight = state.camera.x + state.canvas.width;
        if (this.x + this.radius < screenLeft || this.x - this.radius > screenRight) {
            return;
        }

        ctx.save();
        ctx.translate(-state.camera.x, -state.camera.y);

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        if (state.frameCount % 3 === 0) {
            const trailColor = `rgba(255, 0, 0, 0.5)`;
            const trailRadius = this.radius * (Math.random() * 0.3 + 0.2);
            state.particleManager.createTrailParticle(this.x, this.y, trailColor, trailRadius);
        }

        if (this.x < state.camera.x - 100 || this.x > state.camera.x + state.canvas.width + 100 || this.y < state.camera.y - 100 || this.y > state.camera.y + state.canvas.height + 100) {
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
