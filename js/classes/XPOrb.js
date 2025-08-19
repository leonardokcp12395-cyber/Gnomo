import Entity from './Entity.js';
import * as state from '../state.js';
import { releaseToPool } from '../utils.js';

export default class XPOrb extends Entity {
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
        const screenLeft = state.camera.x;
        const screenRight = state.camera.x + state.canvas.width;
        if (this.x + this.radius < screenLeft || this.x - this.radius > screenRight) {
            return;
        }

        ctx.save();
        ctx.translate(-state.camera.x, -state.camera.y);
        ctx.fillStyle = 'cyan';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    update() {
        if (!this.active) return;

        const dist = Math.hypot(state.player.x - this.x, state.player.y - this.y);

        if (dist < state.player.collectRadius) {
            const angle = Math.atan2(state.player.y - this.y, state.player.x - this.x);
            this.x += Math.cos(angle) * 8;
            this.y += Math.sin(angle) * 8;
        }
        if (dist < state.player.radius + this.radius) {
            state.player.addXp(this.value);
            this.isDead = true;
            releaseToPool(this);
        }
    }
    reset() {
        super.reset();
        this.value = 0;
    }
}
