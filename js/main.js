console.log("main.js loaded");
import { CONFIG } from './constants.js';
import { PERMANENT_UPGRADES, SKILL_DATABASE, CHARACTER_DATABASE, ACHIEVEMENT_DATABASE, EVOLUTION_DATABASE, WAVE_CONFIGS, EVENTS } from './database.js';
import * as state from './state.js';
import { ui, setupEventListeners, setGameState, updateHUD, populateCharacterSelectScreen, populateLevelUpOptions, populateAchievementsScreen, populateUpgradesMenu, showRank } from './ui.js';
import { createPool, getFromPool, releaseToPool, formatTime, showTemporaryMessage, createLightningBolt } from './utils.js';
import Player from './classes/Player.js';
import Enemy from './classes/Enemy.js';
import BossEnemy from './classes/BossEnemy.js';
import Projectile from './classes/Projectile.js';
import EnemyProjectile from './classes/EnemyProjectile.js';
import XPOrb from './classes/XPOrb.js';
import ParticleManager from './classes/ParticleManager.js';
import PowerUp from './classes/PowerUp.js';
import Vortex from './classes/Vortex.js';
import StaticField from './classes/StaticField.js';
import SanctuaryZone from './classes/SanctuaryZone.js';
import MeteorWarningIndicator from './classes/MeteorWarningIndicator.js';
import Quadtree, { Rectangle } from './classes/Quadtree.js';
import DemoPlayer from './classes/DemoPlayer.js';
import { savePermanentData } from './data.js';

const DEBUG_MODE = true;

window.onload = () => {
    try {
        const debugStatus = document.getElementById('debug-status');
        if (debugStatus) debugStatus.textContent = "JS Iniciado.";

        state.setCanvas(document.getElementById('gameCanvas'));
        state.setCtx(state.canvas.getContext('2d'));
        state.setGameContainer(document.getElementById('game-container'));

        if (!state.canvas || !state.ctx || !state.gameContainer) {
            console.error("Crítico: Canvas ou container do jogo não encontrados!");
            if (debugStatus) {
                debugStatus.style.color = 'red';
                debugStatus.textContent = 'Erro Crítico: Elementos do jogo não encontrados! Verifique a consola.';
            }
            return;
        }

        loadPermanentData();

        setupEventListeners(initGame);
        setGameState('menu', initGame);

        let initialTime = performance.now();
        state.setLastFrameTime(initialTime);
        requestAnimationFrame(gameLoop);


        if (debugStatus) debugStatus.textContent = "Jogo Carregado. Clique para jogar!";

    } catch (initializationError) {
        console.error("Erro Crítico na Inicialização:", initializationError);
        const debugStatus = document.getElementById('debug-status');
        if (debugStatus) {
            debugStatus.style.color = 'red';
            debugStatus.textContent = 'Erro Crítico na Inicialização! Verifique a consola.';
        }
    }
};

function loadPermanentData() {
    // ...
}

function initGame(characterId = 'SERAPH') {
    // ...
}

// ... all other functions

function gameLoop(currentTime) {
    // ...
}
