import Entity from './Entity.js';

export default class DemoPlayer extends Entity {
    constructor(x, y) {
        super(x, y, 25);
        this.animationFrame = 0;
        this.angle = 0;
    }
    update() {
        this.animationFrame++;
        this.y += Math.sin(this.animationFrame * 0.02) * 0.5;
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'cyan';
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(0, -this.radius * 1.5);
        ctx.lineTo(this.radius * 1.2, this.radius * 0.8);
        ctx.lineTo(-this.radius * 1.2, this.radius * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}
