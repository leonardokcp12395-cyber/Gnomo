import { SKILL_DATABASE } from './database.js';
import * as state from './state.js';
import { getFromPool, createLightningBolt } from './utils.js';

export function chainLightningEffect(source, initialTarget, levelData) {
    if (SKILL_DATABASE['chain_lightning'].causesHitStop) {
        state.setHitStopTimer(4);
    }

    let currentTarget = initialTarget;
    let targetsHit = new Set([currentTarget]);
    let lastPosition = { x: source.x, y: source.y };

    for (let i = 0; i <= levelData.chains; i++) {
        if (!currentTarget) break;

        currentTarget.takeDamage(levelData.damage * state.player.damageModifier);
        createLightningBolt(lastPosition, currentTarget);

        lastPosition = { x: currentTarget.x, y: currentTarget.y };
        let nextTarget = null;
        let nearestDistSq = Infinity;

        for (const enemy of state.enemies) {
            if (!targetsHit.has(enemy) && !enemy.isDead) {
                const distSq = Math.hypot(currentTarget.x - enemy.x, currentTarget.y - enemy.y);
                if (distSq < levelData.chainRadius * levelData.chainRadius && distSq < nearestDistSq) {
                    nearestDistSq = distSq;
                    nextTarget = enemy;
                }
            }
        }

        currentTarget = nextTarget;
        if(currentTarget) targetsHit.add(currentTarget);
    }
}

export function createSlashEffect(x, y, angle, range, arc) {
    if (!state.particleManager) return;
    const numParticles = 15;
    for (let i = 0; i < numParticles; i++) {
        const particleAngle = angle + (i / (numParticles - 1) - 0.5) * arc;
        const particleRange = range * 0.6 + Math.random() * (range * 0.4);

        const pX = x + Math.cos(particleAngle) * particleRange;
        const pY = y + Math.sin(particleAngle) * particleRange;

        const particle = getFromPool(state.particleManager.pool);
        if (particle) {
            particle.init(pX, pY, 'white', 1.5);
            const speed = 1.5;
            particle.velocity.x = Math.cos(particleAngle) * speed;
            particle.velocity.y = Math.sin(particleAngle) * speed;
            state.particleManager.activeParticles.push(particle);
        }
    }
}
