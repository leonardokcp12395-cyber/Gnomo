import Particle from './Particle.js';
import { createPool, getFromPool, releaseToPool } from '../utils.js';

export default class ParticleManager {
    constructor(maxParticles = 500) {
        this.maxParticles = maxParticles;
        this.pool = createPool(Particle, maxParticles);
        this.activeParticles = [];
    }

    createParticle(x, y, color = 'white', scale = 1) {
        if (this.activeParticles.length >= this.maxParticles) {
            const oldestParticle = this.activeParticles.shift();
            releaseToPool(oldestParticle);
        }
        const p = getFromPool(this.pool, x, y, color, scale);
        this.activeParticles.push(p);
    }

    createTrailParticle(x, y, color, radius) {
        if (this.activeParticles.length >= this.maxParticles) {
            const oldestParticle = this.activeParticles.shift();
            releaseToPool(oldestParticle);
        }
        const p = getFromPool(this.pool, x, y, color, 1);
        p.velocity = { x: 0, y: 0 };
        p.radius = radius;
        this.activeParticles.push(p);
    }

    update() {
        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            const p = this.activeParticles[i];
            p.update();
            if (p.isDead) {
                this.activeParticles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        this.activeParticles.forEach(p => p.draw(ctx));
    }
}
