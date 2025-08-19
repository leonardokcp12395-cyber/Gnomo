import Entity from './Entity.js';
import { SKILL_DATABASE } from '../database.js';
import { camera } from '../state.js';

export default class StaticField extends Entity {
    constructor(x, y, levelData) {
        super(x, y, levelData.radius);
        this.duration = levelData.duration;
        this.slowFactor = levelData.slowFactor;
        this.animationFrame = 0;
    }

    update() {
        this.duration--;
        if (this.duration <= 0) this.isDead = true;
        this.animationFrame++;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);

        const lifeRatio = this.duration / SKILL_DATABASE['static_field'].levels[0].duration;
        const currentRadius = this.radius * (0.5 + 0.5 * (1 - lifeRatio));

        ctx.strokeStyle = `rgba(0, 255, 255, ${lifeRatio * 0.5})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(0, 255, 255, ${lifeRatio * 0.2})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius * 0.8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }
}
