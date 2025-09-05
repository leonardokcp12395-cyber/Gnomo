function setGameState(newState) {
    if (newState === 'paused' && gameState === 'paused') {
        return;
    }

    if (['menu', 'paused', 'levelUp', 'gameOver', 'guide', 'rank', 'upgrades', 'characterSelect'].includes(newState) && newState !== gameState) {
    }

    if (newState === 'playing' && demoPlayer) {
        demoPlayer = null;
    }

    gameState = newState;

    const debugStatus = document.getElementById('debug-status');
    if (newState === 'playing' && debugStatus) {
        debugStatus.style.display = 'none';
    } else if (debugStatus) {
        debugStatus.style.display = 'block';
    }

    const ui = {
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
        loadingScreen: document.getElementById('loading-screen'),
        hud: document.getElementById('hud'),
        temporaryMessage: document.getElementById('temporary-message'),
        dashButtonMobile: document.getElementById('dash-button-mobile')
    };

    const isMenuState = ['menu', 'levelUp', 'gameOver', 'guide', 'rank', 'upgrades', 'paused', 'characterSelect', 'achievements', 'loading'].includes(newState);

    ui.layer.style.backgroundColor = (newState === 'menu') ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.7)';
    ui.layer.classList.toggle('active-menu', isMenuState);

    const showHud = (newState === 'playing' || newState === 'paused');
    ui.hud.classList.toggle('hidden', !showHud);
    ui.dashButtonMobile.classList.toggle('hidden', !isMobile || !showHud);

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
        const finalTimeInSeconds = Math.floor(gameTime);
        document.getElementById('final-time').innerText = formatTime(finalTimeInSeconds);
        document.getElementById('final-kills').innerText = score.kills;
        checkAchievements('survivalTime', finalTimeInSeconds);
        ui.gameOverScreen.classList.remove('hidden');
        saveScore();
    } else if (newState === 'levelUp') {
        const flash = document.getElementById('flash-overlay');
        if (flash) {
            flash.style.transition = 'opacity 0.1s ease-out';
            flash.style.opacity = 0.7;
            setTimeout(() => {
                flash.style.opacity = 0;
            }, 100);
        }

        populateLevelUpOptions();
        ui.levelUpScreen.classList.remove('hidden');
        ui.temporaryMessage.classList.remove('show'); // Hide temporary message
    } else if (newState === 'guide') {
        ui.guideScreen.classList.remove('hidden');
    } else if (newState === 'rank') {
        showRank();
        ui.rankScreen.classList.remove('hidden');
    } else if (newState === 'upgrades') {
        populateUpgradesMenu();
        ui.upgradesMenu.classList.remove('hidden');
    } else if (newState === 'characterSelect') {
        populateCharacterSelectScreen();
        ui.characterSelectScreen.classList.remove('hidden');
    } else if (newState === 'achievements') {
        populateAchievementsScreen();
        ui.achievementsScreen.classList.remove('hidden');
    } else if (newState === 'loading') {
        ui.loadingScreen.classList.remove('hidden');
    }
}
window.setGameState = setGameState;

let lastEventName = '';
let lastEventTime = -1;

function updateEventHUD() {
    const eventDisplay = document.getElementById('event-display');
    const currentEventName = eventManager.currentEvent ? EVENTS[eventManager.currentEvent].name : '';

    if (currentEventName !== lastEventName) {
        if (currentEventName) {
            document.getElementById('event-name').textContent = currentEventName;
            eventDisplay.classList.remove('hidden');
        } else {
            eventDisplay.classList.add('hidden');
        }
        lastEventName = currentEventName;
    }

    if (eventManager.currentEvent) {
        const remainingSeconds = Math.ceil(eventManager.eventTimer / 60);
        if (remainingSeconds !== lastEventTime) {
            document.getElementById('event-timer').textContent = `${remainingSeconds}s`;
            lastEventTime = remainingSeconds;
        }
    }
}

function updateHUD() {
    if (player) {
        document.getElementById('health-bar').style.width = `${(player.health / player.maxHealth) * 100}%`;
        document.getElementById('xp-bar').style.width = `${(player.xp / player.xpToNextLevel) * 100}%`;

        const ui = { dashButtonMobile: document.getElementById('dash-button-mobile') };
        if (isMobile) {
            ui.dashButtonMobile.classList.toggle('on-cooldown', player.dashCooldown > 0);
        }
    }
    document.getElementById('timer').innerText = formatTime(Math.floor(gameTime));

    updateEventHUD();
    updateSkillsHUD();
}

function updateGemDisplay() {
    document.getElementById('gem-counter').textContent = playerGems;
}

function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function showTemporaryMessage(message, color = "white") {
    const tempMsg = document.getElementById('temporary-message');
    tempMsg.textContent = message;
    tempMsg.style.color = color;
    tempMsg.classList.add('show');
    setTimeout(() => {
        tempMsg.classList.remove('show');
    }, CONFIG.TEMPORARY_MESSAGE_DURATION / 60 * 1000);
}

function populateLevelUpOptions() {
    const container = document.getElementById('skill-options');
    container.innerHTML = '';
    let options = [];
    let evolutionOptions = [];

    for (const evoId in EVOLUTION_DATABASE) {
        const evo = EVOLUTION_DATABASE[evoId];
        const baseSkillState = player.skills[evo.baseSkill];
        const passiveSkillState = player.skills[evo.passiveReq];

        if (baseSkillState && baseSkillState.level === SKILL_DATABASE[evo.baseSkill].levels.length && passiveSkillState && !baseSkillState.evolved) {
            evolutionOptions.push({ ...evo, id: evoId, type: 'evolution' });
        }
    }

    evolutionOptions.forEach(evo => {
        const card = document.createElement('div');
        card.className = 'skill-card';
        card.style.borderColor = 'gold';
        card.innerHTML = `<h3>EVOLUÇÃO: ${evo.name}</h3><p>${evo.description}</p>`;
        card.onclick = (event) => {
            event.stopPropagation();
            const baseSkill = player.skills[evo.baseSkill];
            baseSkill.evolved = true;
            if (baseSkill.hudElement) {
                baseSkill.hudElement.style.borderColor = 'gold';
                baseSkill.hudElement.style.boxShadow = '0 0 15px gold';
            }
            showTemporaryMessage(`Evoluiu: ${evo.name}!`, 'gold');
            setGameState('playing');
            lastFrameTime = performance.now();
        };
        container.appendChild(card);
    });

    const optionsToDisplay = 3 - evolutionOptions.length;
    if (optionsToDisplay > 0) {
        for(const skillId in player.skills){
            const skillData = SKILL_DATABASE[skillId];
            const canEvolve = Object.values(EVOLUTION_DATABASE).some(e => e.baseSkill === skillId);
            if(player.skills[skillId].level < skillData.levels.length && !canEvolve) {
                options.push(skillId);
            }
        }
        for(const skillId in SKILL_DATABASE){
            const skillData = SKILL_DATABASE[skillId];
            if(!player.skills[skillId] && skillData.type !== 'utility' && (skillData.unlocked !== false) && !options.includes(skillId)) {
                options.push(skillId);
            }
        }
        options.sort(() => 0.5 - Math.random());
        if (options.length > 0 && options.length < optionsToDisplay && !options.includes('heal')) {
            options.push('heal');
        }

        options.slice(0, optionsToDisplay).forEach(skillId => {
            const skill = SKILL_DATABASE[skillId];
            const card = document.createElement('div');
            card.className = 'skill-card';
            const currentLevel = player.skills[skillId]?.level || 0;
            const nextLevel = currentLevel;

            let levelText = skill.type !== 'utility' || (skill.levels && skill.levels.length > 1) ? ` (Nível ${currentLevel + 1})` : '';
            let descText = skill.desc || (skill.levels && skill.levels[nextLevel] ? skill.levels[nextLevel].desc : '');

            let statsHTML = '<div class="skill-stats">';
            if (skill.levels && skill.levels[nextLevel]) {
                const levelData = skill.levels[nextLevel];
                if (levelData.damage) statsHTML += `<span><strong>Dano:</strong> ${levelData.damage}</span>`;
                if (levelData.count) statsHTML += `<span><strong>Projéteis:</strong> ${levelData.count}</span>`;
                if (levelData.pierce) statsHTML += `<span><strong>Perfuração:</strong> ${levelData.pierce}</span>`;
                if (levelData.radius) statsHTML += `<span><strong>Raio:</strong> ${levelData.radius}</span>`;
                if (levelData.duration) statsHTML += `<span><strong>Duração:</strong> ${(levelData.duration / 60).toFixed(1)}s</span>`;
                if (levelData.cooldown) statsHTML += `<span><strong>Cooldown:</strong> ${(skill.cooldown / 60).toFixed(1)}s</span>`;
                if (levelData.chains) statsHTML += `<span><strong>Saltos:</strong> ${levelData.chains}</span>`;
                if (levelData.regenPerSecond) statsHTML += `<span><strong>Regen:</strong> ${levelData.regenPerSecond}/s</span>`;
            }
            statsHTML += '</div>';

            card.innerHTML = `<h3>${skill.name}${levelText}</h3><p>${descText}</p>${statsHTML}`;
            card.onclick = (event) => {
                event.stopPropagation();
                player.addSkill(skillId);
                setGameState('playing');
                lastFrameTime = performance.now();
            };
            container.appendChild(card);
        });
    }

    if (player.freeRerolls > 0) {
        const rerollButton = document.createElement('button');
        rerollButton.className = 'ui-button reroll-button';
        rerollButton.textContent = `Rerolar Opções (${player.freeRerolls})`;
        rerollButton.onclick = (event) => {
            event.stopPropagation();
            if (player.freeRerolls > 0) {
                player.freeRerolls--;
                populateLevelUpOptions();
            }
        };
        container.appendChild(rerollButton);
    }
}

function updateSkillsHUD() {
    if (!player || !player.skills) return;

    for (const skillId in player.skills) {
        const skillState = player.skills[skillId];
        const skillData = SKILL_DATABASE[skillId];

        if (!skillState.hudElement) continue;

        if (skillData.type !== 'passive' && skillData.type !== 'orbital' && skillState.timer > 0) {
            skillState.hudElement.classList.add('on-cooldown');
        } else {
            skillState.hudElement.classList.remove('on-cooldown');
        }
    }
}

function saveScore() {
    const currentTimeInSeconds = Math.floor(gameTime / (1000.0 / 60.0));
    const bestTime = parseInt(localStorage.getItem('bestTime') || '0');
    const totalKills = parseInt(localStorage.getItem('totalKills') || '0');

    if (currentTimeInSeconds > bestTime) {
        localStorage.setItem('bestTime', currentTimeInSeconds);
    }
    localStorage.setItem('totalKills', totalKills + score.kills);
}

function showRank() {
    document.getElementById('rank-time').innerText = formatTime(parseInt(localStorage.getItem('bestTime') || '0'));
    document.getElementById('rank-total-kills').innerText = parseInt(localStorage.getItem('totalKills') || '0');
}

function populateUpgradesMenu() {
    const container = document.getElementById('upgrades-options');
    container.innerHTML = '';
    document.getElementById('gem-counter-upgrades').textContent = playerGems;

    for (const key in PERMANENT_UPGRADES) {
        const upgrade = PERMANENT_UPGRADES[key];
        const currentLevel = playerUpgrades[key] || 0;
        const maxLevel = upgrade.levels.length;

        const card = document.createElement('div');
        card.className = 'skill-card';

        if (currentLevel < maxLevel) {
            const nextLevelData = upgrade.levels[currentLevel];
            card.innerHTML = `<h3>${upgrade.name} (Nível ${currentLevel}/${maxLevel})</h3>
                              <p>${upgrade.desc(nextLevelData.effect)}</p>
                              <p>Custo: <strong>${nextLevelData.cost} Gemas</strong></p>`;
            if (playerGems >= nextLevelData.cost) {
                card.style.cursor = 'pointer';
                card.onclick = () => {
                    playerGems -= nextLevelData.cost;
                    playerUpgrades[key]++;
                    savePermanentData();
                    populateUpgradesMenu();
                    updateGemDisplay();
                };
            } else {
                card.style.opacity = 0.5;
                card.style.cursor = 'not-allowed';
            }
        } else {
            card.innerHTML = `<h3>${upgrade.name} (Nível MÁXIMO)</h3>`;
            card.style.opacity = 0.7;
            card.style.cursor = 'default';
        }
        container.appendChild(card);
    }
}

function populateCharacterSelectScreen() {
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
            lastFrameTime = performance.now();
        };
    });
}

function populateAchievementsScreen() {
    const container = document.getElementById('achievements-list');
    container.innerHTML = '';

    for (const id in ACHIEVEMENT_DATABASE) {
        const ach = ACHIEVEMENT_DATABASE[id];
        const isUnlocked = playerAchievements.unlocked[id];

        const card = document.createElement('div');
        card.className = isUnlocked ? 'achievement-card unlocked' : 'achievement-card';

        let progressHTML = '';
        if (!isUnlocked && ach.condition.type === 'totalKills') {
            const current = playerAchievements.stats.totalKills || 0;
            const target = ach.condition.value;
            progressHTML = `<p>Progresso: ${current} / ${target}</p>`;
        }

        card.innerHTML = `
            <h3>${ach.name}</h3>
            <p>${ach.description}</p>
            ${progressHTML}
        `;
        container.appendChild(card);
    }
}

function handleMobileInput() {
    const gameContainer = document.getElementById('game-container');
    const existingJoysticks = gameContainer.querySelectorAll('.joystick-base');
    existingJoysticks.forEach(joy => joy.remove());
    activeTouches.clear();

    gameContainer.addEventListener('touchstart', (e) => {
        if (e.target.classList.contains('ui-button')) {
            return;
        }
        if (gameState !== 'playing') return;
        e.preventDefault();

        Array.from(e.changedTouches).forEach(touch => {
            const joystickType = 'move';

            let existingJoystick = false;
            for (let [id, joy] of activeTouches) {
                if (joy.joystickType === joystickType) {
                    existingJoystick = true;
                    break;
                }
            }
            if (existingJoystick) {
                return;
            }

            const base = document.createElement('div');
            base.className = 'joystick-base';
            const handle = document.createElement('div');
            handle.className = 'joystick-handle';
            base.appendChild(handle);

            base.style.left = `${touch.clientX - CONFIG.JOYSTICK_RADIUS}px`;
            base.style.top = `${touch.clientY - CONFIG.JOYSTICK_RADIUS}px`;
            gameContainer.appendChild(base);

            activeTouches.set(touch.identifier, {
                joystickType: joystickType,
                startX: touch.clientX,
                startY: touch.clientY,
                baseElement: base,
                handleElement: handle,
            });
        });
    }, { passive: false });

    gameContainer.addEventListener('touchmove', (e) => {
        if (gameState !== 'playing') return;
        e.preventDefault();

        Array.from(e.touches).forEach(touch => {
            const joy = activeTouches.get(touch.identifier);
            if (!joy) return;

            const dx = touch.clientX - joy.startX;
            const dy = touch.clientY - joy.startY;
            const dist = Math.hypot(dx, dy);
            const angle = Math.atan2(dy, dx);

            const limitedDist = Math.min(dist, CONFIG.JOYSTICK_RADIUS);
            const handleX = Math.cos(angle) * limitedDist;
            const handleY = Math.sin(angle) * limitedDist;

            joy.handleElement.style.transform = `translate(${handleX}px, ${handleY}px)`;

            const normalizedDx = limitedDist > CONFIG.JOYSTICK_DEAD_ZONE ? dx / CONFIG.JOYSTICK_RADIUS : 0;
            const normalizedDy = limitedDist > CONFIG.JOYSTICK_DEAD_ZONE ? dy / CONFIG.JOYSTICK_RADIUS : 0;

            movementVector = { x: normalizedDx, y: normalizedDy };
        });
    }, { passive: false });

    gameContainer.addEventListener('touchend', (e) => {
        Array.from(e.changedTouches).forEach(touch => {
            const joy = activeTouches.get(touch.identifier);
            if (joy) {
                joy.baseElement.remove();
                activeTouches.delete(touch.identifier);
                movementVector = { x: 0, y: 0 };
            }
        });
    });
    gameContainer.addEventListener('touchcancel', (e) => {
        Array.from(e.changedTouches).forEach(touch => {
            const joy = activeTouches.get(touch.identifier);
            if (joy) {
                joy.baseElement.remove();
                activeTouches.delete(touch.identifier);
                movementVector = { x: 0, y: 0 };
            }
        });
    });
}

function toggleFullscreen() {
    const elem = document.documentElement;
    try {
        if (!document.fullscreenElement) {
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                elem.mozRequestFullScreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
                elem.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    } catch (e) {
        if (DEBUG_MODE) console.error("Erro ao tentar alternar ecrã inteiro:", e);
    }
}
