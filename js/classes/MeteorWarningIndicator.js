import Entity from './Entity.js';
import * as state from '../state.js';
import { getFromPool } from '../utils.js';

export default class MeteorWarningIndicator extends Entity {
    constructor() {
        super();
    }
    init(x, y, life = 60) {
        super.reset();
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.life = life;
        this.initialLife = life;
    }
    update() {
        this.life--;
        if (this.life <= 0) {
            this.isDead = true;
            const meteorStartX = this.x;
            const meteorStartY = state.camera.y - 50;
            getFromPool(state.enemyProjectilePool, meteorStartX, meteorStartY, Math.PI / 2, 8, 20);
        }
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x - state.camera.x, this.y - state.camera.y);
        const progress = this.life / this.initialLife;
        const alpha = 1 - progress;
        const radius = this.radius * (1 - progress);
        ctx.strokeStyle = `rgba(255, 100, 0, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}
