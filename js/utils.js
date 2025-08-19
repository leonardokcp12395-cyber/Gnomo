import { CONFIG } from './constants.js';
import { activeLightningBolts, particleManager } from './state.js';

export const createPool = (ClassRef, initialSize = 100) => {
    const pool = [];
    for (let i = 0; i < initialSize; i++) {
        const obj = new ClassRef();
        obj.active = false;
        pool.push(obj);
    }
    return pool;
};

export const getFromPool = (pool, ...args) => {
    for (let i = 0; i < pool.length; i++) {
        if (!pool[i].active) {
            pool[i].active = true;
            if (pool[i].init) pool[i].init(...args);
            return pool[i];
        }
    }
    const newObj = new pool[0].constructor();
    newObj.active = true;
    if (newObj.init) newObj.init(...args);
    pool.push(newObj);
    return newObj;
};

export const releaseToPool = (obj) => {
    obj.active = false;
    if (obj.reset) obj.reset();
};

export function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function showTemporaryMessage(message, color = "white") {
    const tempMsg = document.getElementById('temporary-message');
    if (tempMsg) {
        tempMsg.textContent = message;
        tempMsg.style.color = color;
        tempMsg.classList.add('show');
        setTimeout(() => {
            tempMsg.classList.remove('show');
        }, CONFIG.TEMPORARY_MESSAGE_DURATION / 60 * 1000);
    }
}

export function createLightningBolt(startPos, endPos) {
    const bolt = {
        points: [],
        life: 5
    };

    const dx = endPos.x - startPos.x;
    const dy = endPos.y - startPos.y;
    const distance = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    const segmentLength = 15;
    const numSegments = Math.ceil(distance / segmentLength);

    bolt.points.push({x: startPos.x, y: start_pos.y});

    for (let i = 1; i < numSegments; i++) {
        const t = i / numSegments;
        const x = startPos.x + dx * t;
        const y = startPos.y + dy * t;

        const jitter = (Math.random() - 0.5) * 15;
        const jitterX = x + Math.cos(angle + Math.PI / 2) * jitter;
        const jitterY = y + Math.sin(angle + Math.PI / 2) * jitter;

        bolt.points.push({x: jitterX, y: jitterY});
    }

    bolt.points.push({x: endPos.x, y: endPos.y});

    activeLightningBolts.push(bolt);
}
