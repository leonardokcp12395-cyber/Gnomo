console.log("ui.js loaded");
import * as state from './state.js';
import { formatTime, showTemporaryMessage } from './utils.js';
import { SKILL_DATABASE, EVOLUTION_DATABASE, ACHIEVEMENT_DATABASE, CHARACTER_DATABASE, PERMANENT_UPGRADES } from './database.js';
import { checkAchievements } from './achievements.js';

export const ui = {
    layer: document.getElementById('ui-layer'),
    mainMenu: document.getElementById('main-menu'),
    pauseMenu: document.getElementById('pause-menu'),
    gameOverScreen: document.getElementById('game-over-screen'),
    levelUpScreen: document.getElementById('level-up-screen'),
    guideScreen: document.getElementById('guide-screen'),
    rankScreen: document.getElementById('rank-screen'),
    upgradesMenu: document.getElementById('upgrades-menu'),
    characterSelectScreen: document.getElementById('character-select-screen'),
    achievementsScreen: document.getElementById('achievements-screen'),
    hud: document.getElementById('hud'),
    temporaryMessage: document.getElementById('temporary-message'),
    dashButtonMobile: document.getElementById('dash-button-mobile')
};

export function populateCharacterSelectScreen(initGame) {
    const container = document.getElementById('character-options');
    container.innerHTML = '';

    for (const characterId in CHARACTER_DATABASE) {
        const char = CHARACTER_DATABASE[characterId];
        const card = document.createElement('div');
        card.className = 'character-card';

        card.innerHTML = `
            <h3>${char.name}</h3>
            <p>${char.description}</p>
            <button class="ui-button select-button" data-character-id="${characterId}">Selecionar</button>
        `;
        container.appendChild(card);
    }

    container.querySelectorAll('.select-button').forEach(button => {
        button.onclick = () => {
            const charId = button.getAttribute('data-character-id');
            initGame(charId);
            state.setLastFrameTime(0);
        };
    });
}

export function setGameState(newState, initGame) {
    if (newState === 'playing' && state.demoPlayer) {
        state.setDemoPlayer(null);
    }

    state.setGameState(newState);

    const debugStatus = document.getElementById('debug-status');
    if (newState === 'playing' && debugStatus) {
        debugStatus.style.display = 'none';
    } else if (debugStatus) {
        debugStatus.style.display = 'block';
    }

    const isMenuState = ['menu', 'levelUp', 'gameOver', 'guide', 'rank', 'upgrades', 'paused', 'characterSelect', 'achievements'].includes(newState);

    ui.layer.style.backgroundColor = (newState === 'menu') ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.7)';
    ui.layer.classList.toggle('active-menu', isMenuState);

    const showHud = (newState === 'playing' || newState === 'paused');
    ui.hud.classList.toggle('hidden', !showHud);
    ui.dashButtonMobile.classList.toggle('hidden', !state.isMobile || !showHud);

    for (const panelKey in ui) {
        if (ui[panelKey] && ui[panelKey].classList && panelKey !== 'layer' && panelKey !== 'hud' && panelKey !== 'temporaryMessage' && panelKey !== 'dashButtonMobile') {
            ui[panelKey].classList.add('hidden');
        }
    }

    if (newState === 'menu') {
        ui.mainMenu.classList.remove('hidden');
        updateGemDisplay();
    } else if (newState === 'paused') {
        ui.pauseMenu.classList.remove('hidden');
    } else if (newState === 'gameOver') {
        const finalTimeInSeconds = Math.floor(state.gameTime);
        document.getElementById('final-time').innerText = formatTime(finalTimeInSeconds);
        document.getElementById('final-kills').innerText = state.score.kills;
        checkAchievements('survivalTime', finalTimeInSeconds);
        ui.gameOverScreen.classList.remove('hidden');
    } else if (newState === 'levelUp') {
        populateLevelUpOptions();
        ui.levelUpScreen.classList.remove('hidden');
    } else if (newState === 'guide') {
        ui.guideScreen.classList.remove('hidden');
    } else if (newState === 'rank') {
        showRank();
        ui.rankScreen.classList.remove('hidden');
    } else if (newState === 'upgrades') {
        populateUpgradesMenu();
        ui.upgradesMenu.classList.remove('hidden');
    } else if (newState === 'characterSelect') {
        populateCharacterSelectScreen(initGame);
        ui.characterSelectScreen.classList.remove('hidden');
    } else if (newState === 'achievements') {
        populateAchievementsScreen();
        ui.achievementsScreen.classList.remove('hidden');
    }
}

export function setupEventListeners(initGame) {
    window.addEventListener('resize', () => {
        state.canvas.width = window.innerWidth;
        state.canvas.height = window.innerHeight;
    });
    window.dispatchEvent(new Event('resize'));

    document.getElementById('play-button').onclick = () => setGameState('characterSelect', initGame);
    document.getElementById('restart-button-pause').onclick = () => initGame();
    document.getElementById('restart-button-gameover').onclick = () => initGame();
    document.getElementById('resume-button').onclick = () => {
        state.setLastFrameTime(0);
        setGameState('playing', initGame);
    };
    document.getElementById('back-to-menu-button-pause').onclick = () => setGameState('menu', initGame);
    document.getElementById('back-to-menu-button-gameover').onclick = () => setGameState('menu', initGame);
    document.getElementById('guide-button').onclick = () => setGameState('guide', initGame);
    document.getElementById('back-from-guide-button').onclick = () => setGameState('menu', initGame);
    document.getElementById('rank-button').onclick = () => {
        showRank();
        setGameState('rank', initGame);
    };
    document.getElementById('back-from-rank-button').onclick = () => setGameState('menu', initGame);
    document.getElementById('back-to-menu-from-select-button').onclick = () => setGameState('menu', initGame);
    document.getElementById('achievements-button').onclick = () => setGameState('achievements', initGame);
    document.getElementById('back-from-achievements-button').onclick = () => setGameState('menu', initGame);
    document.getElementById('pause-button').onclick = () => { if(state.gameState === 'playing') setGameState('paused', initGame); };
    document.getElementById('upgrades-button').onclick = () => {
        populateUpgradesMenu();
        setGameState('upgrades', initGame);
    };
    document.getElementById('back-from-upgrades-button').onclick = () => setGameState('menu', initGame);
}

function updateGemDisplay() {
    document.getElementById('gem-counter').textContent = state.playerGems;
}

function populateLevelUpOptions() {
    // ...
}

function showRank() {
    // ...
}

function populateUpgradesMenu() {
    // ...
}

function populateAchievementsScreen() {
    // ...
}
