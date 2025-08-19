import Entity from './Entity.js';
import { releaseToPool } from '../utils.js';
import { camera } from '../state.js';

export default class Particle extends Entity {
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
        this.alpha -= 0.02;
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
