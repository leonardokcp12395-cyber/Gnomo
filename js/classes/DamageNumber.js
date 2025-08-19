import Entity from './Entity.js';
import { releaseToPool } from '../utils.js';
import { camera } from '../state.js';

export default class DamageNumber extends Entity {
    constructor() {
        super();
    }
    init(x, y, amount, color = '#FFF') {
        super.reset();
        this.x = x;
        this.y = y;
        this.amount = typeof amount === 'number' ? Math.round(amount) : amount;
        this.color = color;
        this.alpha = 1;
        this.velocityY = -2;
        this.life = 60;
    }

    update() {
        this.y += this.velocityY;
        this.alpha -= 0.015;
        this.life--;
        if (this.life <= 0) {
            this.isDead = true;
            releaseToPool(this);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.font = 'bold 20px "Courier New", Courier, monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 2;
        ctx.fillText(this.amount, 0, 0);
        ctx.restore();
    }

    reset() {
        super.reset();
        this.amount = 0;
    }
}
