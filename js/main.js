let player;
let platforms = [];
let enemies = [];
let activeVortexes = [];
let powerUps = [];
let activeStaticFields = [];
let activeSanctuaryZones = [];
let activeLightningBolts = [];
let activeDamageNumbers = [];
let activeChests = [];
let ambientParticles = [];

let particleManager;
let projectilePool;
let enemyProjectilePool;
let xpOrbPool;
let damageNumberPool;
let meteorWarningPool;
let qtree;

let lastFrameTime = 0;

let canvas;
let ctx;
let gameContainer;

let waveNumber = 0;
let waveEnemiesRemaining = 0;
let waveCooldownTimer = 0;
let currentWaveConfig = {};

let playerGems = 0;
let playerUpgrades = {};
let playerAchievements = {};

function loadPermanentData() {
    try {
        playerGems = parseInt(localStorage.getItem('playerGems') || '0');
        const loadedUpgrades = JSON.parse(localStorage.getItem('playerUpgrades') || '{}');
        playerUpgrades = loadedUpgrades;
        const loadedAchievements = JSON.parse(localStorage.getItem('playerAchievements') || '{"unlocked":{},"stats":{"totalKills":0}}');
        playerAchievements = loadedAchievements;
    } catch (e) {
        console.error("Error loading data from localStorage. Resetting to default.", e);
        playerGems = 0;
        playerUpgrades = {};
        playerAchievements = {"unlocked":{},"stats":{"totalKills":0}};
        localStorage.removeItem('playerUpgrades');
        localStorage.removeItem('playerAchievements');
        localStorage.removeItem('playerGems');
    }

    for(const key in PERMANENT_UPGRADES) {
        const upgradeData = PERMANENT_UPGRADES[key];
        if (playerUpgrades[key] === undefined || playerUpgrades[key] === null || typeof playerUpgrades[key] !== 'number' || playerUpgrades[key] < 0 || playerUpgrades[key] > upgradeData.levels.length) {
            playerUpgrades[key] = 0;
        }
    }
}

function savePermanentData() {
    localStorage.setItem('playerGems', playerGems);
    localStorage.setItem('playerUpgrades', JSON.stringify(playerUpgrades));
    localStorage.setItem('playerAchievements', JSON.stringify(playerAchievements));
}

window.onload = () => {
    const debugStatus = document.getElementById('debug-status');
    if (debugStatus) debugStatus.textContent = "JS Iniciado.";

    try {
        canvas = document.getElementById('gameCanvas');
        ctx = canvas.getContext('2d');
        gameContainer = document.getElementById('game-container');

        if (!canvas || !ctx || !gameContainer) {
            console.error("Crítico: Canvas ou container do jogo não encontrados!");
            if (debugStatus) {
                debugStatus.style.color = 'red';
                debugStatus.textContent = 'Erro Crítico: Elementos do jogo não encontrados! Verifique a consola.';
            }
            return;
        }

        loadPermanentData();
        setupEventListeners();
        assets.load(() => {
            setGameState('menu');
            let initialTime = performance.now();
            lastFrameTime = initialTime;
            requestAnimationFrame(gameLoop);
            if (debugStatus) debugStatus.textContent = "Jogo Carregado. Clique para jogar!";
        });

    } catch (initializationError) {
        console.error("Erro Crítico na Inicialização:", initializationError);
        const debugStatus = document.getElementById('debug-status');
        if (debugStatus) {
            debugStatus.style.color = 'red';
            debugStatus.textContent = 'Erro Crítico na Inicialização! Verifique a consola.';
        }
    }
};

const eventManager = {
    timeUntilNextEvent: 120 * 60,
    currentEvent: null,
    eventTimer: 0,

    update() {
        if (this.currentEvent) {
            this.eventTimer--;
            if (EVENTS[this.currentEvent]?.update) {
                EVENTS[this.currentEvent].update();
            }

            if (this.eventTimer <= 0) {
                const endedEventName = EVENTS[this.currentEvent]?.name || 'Evento';
                if (EVENTS[this.currentEvent]?.end) {
                    EVENTS[this.currentEvent].end();
                }
                this.currentEvent = null;
                this.timeUntilNextEvent = (Math.random() * 60 + 120) * 60;
                showTemporaryMessage(`${endedEventName} terminou!`, 'white');
            }
        } else {
            this.timeUntilNextEvent--;
            if (this.timeUntilNextEvent <= 0) {
                const eventNames = Object.keys(EVENTS);
                const nextEvent = eventNames[Math.floor(Math.random() * eventNames.length)];
                this.currentEvent = nextEvent;
                this.eventTimer = EVENTS[nextEvent].duration;
                if (EVENTS[nextEvent]?.start) {
                    EVENTS[nextEvent].start();
                }
                showTemporaryMessage(EVENTS[nextEvent].name, 'gold');
            }
        }
    }
};

let gameState = 'menu';
let activeMeteorWarnings = [];
let keys = {};
let gameTime = 0;
let frameCount = 0;
let score = { kills: 0, time: 0 };
let screenShake = { intensity: 0, duration: 0 };
let hitStopTimer = 0;
let isGoldenFrenzyActive = false;
const isMobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
let activeTouches = new Map();
let movementVector = { x: 0, y: 0 };

let camera = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    update() {
        this.x += (this.targetX - this.x) * CONFIG.CAMERA_LERP_FACTOR;
        this.y += (this.targetY - this.y) * CONFIG.CAMERA_LERP_FACTOR;
    }
};

function unlockAchievement(id) {
    if (playerAchievements.unlocked[id]) return;

    playerAchievements.unlocked[id] = true;
    const achievement = ACHIEVEMENT_DATABASE[id];

    if (achievement.reward) {
        if (achievement.reward.type === 'gems') {
            playerGems += achievement.reward.amount;
        }
    }

    savePermanentData();
    showTemporaryMessage(`Conquista: ${achievement.name}`, 'gold');
}

function checkAchievements(eventType, value = 0) {
    for (const id in ACHIEVEMENT_DATABASE) {
        if (!playerAchievements.unlocked[id]) {
            const achievement = ACHIEVEMENT_DATABASE[id];
            if (achievement.condition.type === eventType) {
                let conditionMet = false;
                if (eventType === 'totalKills' && playerAchievements.stats.totalKills >= achievement.condition.value) {
                    conditionMet = true;
                } else if (eventType === 'survivalTime' && value >= achievement.condition.value) {
                    conditionMet = true;
                }

                if (conditionMet) {
                    unlockAchievement(id);
                }
            }
        }
    }
}

class DemoPlayer extends Entity {
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

function initGame(characterId = 'SERAPH') {
    platforms = [];
    const groundLevel = canvas.height * (1 - CONFIG.GROUND_HEIGHT_PERCENT);

    const groundPlatform = new Platform(
        -CONFIG.WORLD_BOUNDS.width / 2,
        groundLevel,
        CONFIG.WORLD_BOUNDS.width,
        CONFIG.WORLD_BOUNDS.height
    );
    groundPlatform.isGround = true;
    platforms.push(groundPlatform);

    const platformCount = 12;
    const minGapX = 50;
    const minGapY = 40;
    let attempts = 0;

    for (let i = 0; i < platformCount && attempts < 1000; i++) {
        const pWidth = Math.random() * 150 + 100;
        const pHeight = 20;
        const pX = (Math.random() - 0.5) * (CONFIG.WORLD_BOUNDS.width - pWidth);
        const pY = groundLevel - (Math.random() * 400 + 80);

        let overlaps = false;
        for (const existingPlatform of platforms) {
            if (pX < existingPlatform.x + existingPlatform.width + minGapX &&
                pX + pWidth > existingPlatform.x - minGapX &&
                pY < existingPlatform.y + existingPlatform.height + minGapY &&
                pY + pHeight > existingPlatform.y - minGapY) {
                overlaps = true;
                break;
            }
        }

        if (!overlaps) {
            platforms.push(new Platform(pX, pY, pWidth, pHeight));
        } else {
            i--;
        }
        attempts++;
    }

    ambientParticles = [];
    for(let i=0; i < 100; i++) {
        ambientParticles.push({
            x: Math.random() * CONFIG.WORLD_BOUNDS.width - (CONFIG.WORLD_BOUNDS.width/2),
            y: Math.random() * CONFIG.WORLD_BOUNDS.height,
            radius: Math.random() * 1.5,
            vx: (Math.random() - 0.5) * 0.1,
            vy: (Math.random() - 0.5) * 0.1,
            alpha: Math.random() * 0.5 + 0.1
        });
    }

    player = new Player(characterId);

    particleManager = new ParticleManager(500);
    projectilePool = createPool(Projectile, 50);
    enemyProjectilePool = createPool(EnemyProjectile, 50);
    xpOrbPool = createPool(XPOrb, 100);
    damageNumberPool = createPool(DamageNumber, 50);
    meteorWarningPool = createPool(MeteorWarningIndicator, 20);

    player.addSkill(CHARACTER_DATABASE[characterId].initialSkill);

    enemies = [];
    activeVortexes = [];
    powerUps = [];
    activeStaticFields = [];
    activeDamageNumbers = [];
    activeMeteorWarnings = [];

    document.getElementById('skills-hud').innerHTML = '';

    if (playerUpgrades.unlock_powerful_skill > 0) {
        SKILL_DATABASE['celestial_beam'].unlocked = true;
    } else {
         SKILL_DATABASE['celestial_beam'].unlocked = false;
    }

    projectilePool.forEach(p => releaseToPool(p));
    enemyProjectilePool.forEach(p => releaseToPool(p));
    xpOrbPool.forEach(o => releaseToPool(o));
    damageNumberPool.forEach(dn => releaseToPool(dn));
    meteorWarningPool.forEach(p => releaseToPool(p));

    gameTime = 0; frameCount = 0;
    score = { kills: 0, time: 0 };
    screenShake = { intensity: 0, duration: 0 };

    waveNumber = 0;
    waveEnemiesRemaining = 0;
    waveCooldownTimer = 0;
    startNextWave();

    eventManager.currentEvent = null;
    eventManager.timeUntilNextEvent = 120 * 60;

    setGameState('playing');
}

function startNextWave() {
    waveNumber++;
    console.log(`--- Iniciando Onda ${waveNumber} ---`);

    if (waveNumber > 0 && waveNumber % 5 === 0) {
        showTemporaryMessage(`BOSS - ONDA ${waveNumber}`, "red");
        enemies.push(new BossEnemy(player.x + canvas.width / 2 + 100, player.y - 100));
        waveEnemiesRemaining = 1;
        currentWaveConfig = { enemies: [], eliteChance: 0 };
        return;
    }

    if (waveNumber <= WAVE_CONFIGS.length) {
        const waveIndex = waveNumber - 1;
        currentWaveConfig = JSON.parse(JSON.stringify(WAVE_CONFIGS[waveIndex]));
    } else {
        showTemporaryMessage(`ONDA ${waveNumber}! (Infinita)`, "cyan");
        const enemyTypes = ['chaser', 'speeder', 'tank', 'shooter', 'bomber', 'healer', 'summoner', 'reaper'];
        const typesInThisWave = Math.min(2 + Math.floor(waveNumber / 7), 5);

        currentWaveConfig = { enemies: [], eliteChance: Math.min(0.05 + (waveNumber - WAVE_CONFIGS.length) * 0.01, 0.25) };

        let typesAdded = new Set();
        for(let i = 0; i < typesInThisWave; i++) {
            let enemyType;
            do {
               enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
            } while (typesAdded.has(enemyType));
            typesAdded.add(enemyType);

            const baseCount = 5;
            let enemyCount = baseCount + Math.floor(waveNumber * 0.8);

            if (player.skills['celestial_pact']) {
                const levelData = SKILL_DATABASE['celestial_pact'].levels[player.skills['celestial_pact'].level - 1];
                enemyCount *= (1 + levelData.enemyBonus);
            }

            currentWaveConfig.enemies.push({
                type: enemyType,
                count: Math.floor(enemyCount),
                spawnInterval: Math.max(20, 100 - waveNumber * 2)
            });
        }
    }

    waveEnemiesRemaining = 0;
    currentWaveConfig.enemies.forEach(enemyType => {
        waveEnemiesRemaining += enemyType.count;
        enemyType.spawnTimer = Math.random() * enemyType.spawnInterval;
    });

    if (waveNumber <= WAVE_CONFIGS.length) {
        showTemporaryMessage(`ONDA ${waveNumber}!`, "gold");
    }
    if (DEBUG_MODE) console.log(`Iniciando Onda ${waveNumber}. Total de inimigos: ${waveEnemiesRemaining}`);
}

function spawnEnemies() {
    if (waveEnemiesRemaining <= 0 && enemies.length === 0) {
        if (waveCooldownTimer <= 0) {
            waveCooldownTimer = 180;
            showTemporaryMessage("PAUSA ENTRE ONDAS", "white");
        } else {
            waveCooldownTimer--;
            if (waveCooldownTimer <= 0) {
                startNextWave();
            }
        }
        return;
    }

    if (!currentWaveConfig.enemies) return;

    currentWaveConfig.enemies.forEach(enemyConfig => {
        if (enemyConfig.count > 0) {
            enemyConfig.spawnTimer--;
            if (enemyConfig.spawnTimer <= 0) {
                let x, y;
                const spawnSide = Math.floor(Math.random() * 4);
                const spawnMargin = 50;
                const camX = camera.x, camY = camera.y, camW = canvas.width, camH = canvas.height;

                if (spawnSide === 0) { x = camX - spawnMargin; y = camY + Math.random() * camH; }
                else if (spawnSide === 1) { x = camX + camW + spawnMargin; y = camY + Math.random() * camH; }
                else if (spawnSide === 2) { x = camX + Math.random() * camW; y = camY - spawnMargin; }
                else { x = camX + Math.random() * camW; y = camY + camH + spawnMargin; }

                const halfWorldWidth = CONFIG.WORLD_BOUNDS.width / 2;
                const halfWorldHeight = CONFIG.WORLD_BOUNDS.height / 2;
                x = Math.max(-halfWorldWidth, Math.min(x, halfWorldWidth));
                y = Math.max(-halfWorldHeight, Math.min(y, halfWorldHeight));

                const isElite = Math.random() < currentWaveConfig.eliteChance;
                enemies.push(new Enemy(x, y, enemyConfig.type, isElite));

                enemyConfig.count--;
                enemyConfig.spawnTimer = enemyConfig.spawnInterval;
            }
        }
    });
}

function handleCollisions() {
    handlePlayerProjectiles(qtree);
    handlePlayerCollisions(qtree);
    handleEnemyProjectiles();
}

function handlePlayerProjectiles(qtree) {
    if (!projectilePool) return;

    for (const proj of projectilePool) {
        if (!proj.active) continue;

        let searchRadius = proj.radius + 30;
        let range = new Rectangle(proj.x - searchRadius, proj.y - searchRadius, searchRadius * 2, searchRadius * 2);
        let nearbyEnemies = qtree.query(range);

        for (let enemy of nearbyEnemies) {
            if (proj.isDead || proj.piercedEnemies.has(enemy)) continue;

            if (Math.hypot(proj.x - enemy.x, proj.y - enemy.y) < proj.radius + enemy.radius) {
                enemy.takeDamage(proj.damage);
                enemy.applyKnockback(proj.x, proj.y, CONFIG.ENEMY_KNOCKBACK_FORCE);

                if (proj.skillId && SKILL_DATABASE[proj.skillId]?.causesHitStop) {
                    hitStopTimer = 4;
                }

                const skillState = player.skills[proj.skillId];
                if (skillState && skillState.evolved) {
                    const lifestealAmount = proj.damage * 0.05;
                    player.health = Math.min(player.maxHealth, player.health + lifestealAmount);
                }

                proj.piercedEnemies.add(enemy);
                if (proj.piercedEnemies.size >= proj.pierce + 1) {
                    proj.isDead = true;
                    releaseToPool(proj);
                    break;
                }
            }
        }
    }
}

function handlePlayerCollisions(qtree) {
    if (!player) return;

    let searchRadius = player.radius + 50;
    let range = new Rectangle(player.x - searchRadius, player.y - searchRadius, searchRadius * 2, searchRadius * 2);
    let nearbyEnemies = qtree.query(range);

    for (let enemy of nearbyEnemies) {
        if (enemy.isDead) continue;
        if (Math.hypot(player.x - enemy.x, player.y - enemy.y) < player.radius + enemy.radius) {
            player.takeDamage(enemy.damage, enemy);
            const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
            enemy.x += Math.cos(angle) * 5;
            enemy.y += Math.sin(angle) * 5;
        }
    }
}

function handleEnemyProjectiles() {
    if (!enemyProjectilePool || !player) return;

    for (const eProj of enemyProjectilePool) {
        if (!eProj.active) continue;
        if (Math.hypot(player.x - eProj.x, player.y - eProj.y) < player.radius + eProj.radius) {
            player.takeDamage(eProj.damage, eProj);
            for (let i = 0; i < 10; i++) {
                if (particleManager) particleManager.createParticle(eProj.x, eProj.y, 'orange', 1.5);
            }
            eProj.isDead = true;
            releaseToPool(eProj);
        }
    }
}

let demoPlayer;

function removeDeadEntities(array) {
    for (let i = array.length - 1; i >= 0; i--) {
        if (array[i].isDead) {
            array.splice(i, 1);
        }
    }
}

function updateGame(deltaTime) {
    console.time('updateGame');
    if (hitStopTimer > 0) {
        hitStopTimer--;
        return;
    }

    gameTime += deltaTime;
    frameCount++;

    console.time('eventManager.update');
    eventManager.update();
    console.timeEnd('eventManager.update');

    console.time('quadtree.build');
    const worldBounds = new Rectangle(-CONFIG.WORLD_BOUNDS.width, -CONFIG.WORLD_BOUNDS.height, CONFIG.WORLD_BOUNDS.width * 2, CONFIG.WORLD_BOUNDS.height * 2);
    qtree = new Quadtree(worldBounds, 4);
    for (const enemy of enemies) {
        if (!enemy.isDead) {
            qtree.insert(enemy);
        }
    }
    console.timeEnd('quadtree.build');

    console.time('entity.updates');
    if (player) player.update();
    if (camera) camera.update();

    enemies.forEach(e => e.update());
    for (const p of projectilePool) { if (p.active) p.update(); }
    for (const p of enemyProjectilePool) { if (p.active) p.update(); }
    for (const o of xpOrbPool) { if (o.active) o.update(); }
    particleManager.update();
    activeDamageNumbers.forEach(dn => dn.update());

    powerUps.forEach(p => p.update());
    activeVortexes.forEach(v => v.update());
    activeStaticFields.forEach(sf => sf.update());
    activeSanctuaryZones.forEach(s => s.update());
    activeMeteorWarnings.forEach(w => w.update());
    console.timeEnd('entity.updates');

    console.time('lightning.update');
    for (let i = activeLightningBolts.length - 1; i >= 0; i--) {
        const bolt = activeLightningBolts[i];
        bolt.life--;
        if (bolt.life <= 0) {
            activeLightningBolts.splice(i, 1);
        }
    }
    console.timeEnd('lightning.update');

    console.time('spawnEnemies');
    spawnEnemies();
    console.timeEnd('spawnEnemies');

    console.time('handleCollisions');
    handleCollisions();
    console.timeEnd('handleCollisions');

    console.time('removeDeadEntities');
    removeDeadEntities(enemies);
    removeDeadEntities(powerUps);
    removeDeadEntities(activeVortexes);
    removeDeadEntities(activeStaticFields);
    removeDeadEntities(activeSanctuaryZones);
    removeDeadEntities(activeDamageNumbers);
    removeDeadEntities(activeMeteorWarnings);
    console.timeEnd('removeDeadEntities');

    if (screenShake.duration > 0) {
        screenShake.duration--;
        if (screenShake.duration <= 0) screenShake.intensity = 0;
    }
    console.timeEnd('updateGame');
}

function drawGame() {
    console.time('drawGame');

    console.time('draw.background');
    if (player) {
        const parallaxX1 = -camera.x * 0.02;
        const parallaxY1 = -camera.y * 0.02;
        const parallaxX2 = -camera.x * 0.05;
        const parallaxY2 = -camera.y * 0.05;
        const parallaxX3 = -camera.x * 0.1;
        const parallaxY3 = -camera.y * 0.1;

        gameContainer.style.backgroundPosition =
            `${parallaxX1}px ${parallaxY1}px, ` +
            `${parallaxX2}px ${parallaxY2}px, ` +
            `${parallaxX3}px ${parallaxY3}px, ` +
            `${parallaxX3 * 1.5}px ${parallaxY3 * 1.5}px`;
    }
    console.timeEnd('draw.background');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    if (screenShake.intensity > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake.intensity, (Math.random() - 0.5) * screenShake.intensity);
    }

    console.time('draw.environment');
    ctx.save();
    ctx.translate(-camera.x * 0.5, -camera.y * 0.5);
    ambientParticles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.fill();
    });
    ctx.restore();
    platforms.forEach(p => p.draw(ctx));
    console.timeEnd('draw.environment');

    console.time('draw.pickups');
    for (const o of xpOrbPool) { if (o.active) o.draw(ctx); }
    powerUps.forEach(p => p.draw(ctx));
    console.timeEnd('draw.pickups');

    console.time('draw.effects');
    activeVortexes.forEach(v => v.draw(ctx));
    activeStaticFields.forEach(sf => sf.draw(ctx));
    activeSanctuaryZones.forEach(s => s.draw(ctx));
    activeMeteorWarnings.forEach(w => w.draw(ctx));
    particleManager.draw(ctx);
    activeDamageNumbers.forEach(dn => dn.draw(ctx));
    console.timeEnd('draw.effects');

    console.time('draw.projectiles');
    for (const p of projectilePool) { if (p.active) p.draw(ctx); }
    for (const p of enemyProjectilePool) { if (p.active) p.draw(ctx); }
    console.timeEnd('draw.projectiles');

    console.time('draw.characters');
    enemies.forEach(e => e.draw(ctx));
    if (player) player.draw(ctx);
    console.timeEnd('draw.characters');

    console.time('draw.orbitals');
    if (player && player.skills) {
        Object.keys(player.skills).forEach(skillId => {
            const skillData = SKILL_DATABASE[skillId];
            if (skillData.type === 'orbital' && player.skills[skillId].orbs) {
                const skillState = player.skills[skillId];
                const levelData = skillData.levels[skillState.level - 1];
                skillState.orbs.forEach(orb => {
                    const orbX = player.x + Math.cos(orb.angle) * levelData.radius;
                    const orbY = player.y + Math.sin(orb.angle) * levelData.radius;
                    const screenLeft = camera.x;
                    const screenRight = camera.x + canvas.width;

                    if (orbX + 20 < screenLeft || orbX - 20 > screenRight) return;

                    ctx.save();
                    ctx.translate(orbX - camera.x, orbY - camera.y);
                    ctx.rotate(orb.angle + Math.PI / 2);

                    if (skillId === 'orbital_shield') {
                        ctx.beginPath();
                        ctx.arc(0, 0, 10, 0, Math.PI * 2);
                        ctx.fillStyle = 'lightblue';
                        ctx.fill();
                        ctx.strokeStyle = 'white';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    } else if (skillId === 'celestial_hammer') {
                        ctx.fillStyle = '#C0C0C0';
                        ctx.strokeStyle = '#A9A9A9';
                        ctx.lineWidth = 2;
                        ctx.fillRect(-12, -20, 24, 15);
                        ctx.strokeRect(-12, -20, 24, 15);
                        ctx.fillStyle = '#8B4513';
                        ctx.fillRect(-4, -5, 8, 20);
                        ctx.strokeRect(-4, -5, 8, 20);
                    }
                    ctx.restore();
                });
            }
        });
    }
    console.timeEnd('draw.orbitals');

    ctx.restore();

    console.time('draw.vignette');
    const vignetteOuterRadius = canvas.width * 0.7;
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.width / 4,
        canvas.width / 2, canvas.height / 2, vignetteOuterRadius
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    console.timeEnd('draw.vignette');

    console.time('draw.hud');
    updateHUD();
    console.timeEnd('draw.hud');

    console.timeEnd('drawGame');
}

function gameLoop(currentTime) {
    requestAnimationFrame(gameLoop);

    if (!lastFrameTime) lastFrameTime = currentTime;
    const deltaTime = (currentTime - lastFrameTime) / 1000.0;
    lastFrameTime = currentTime;

    if (gameState === 'menu') {
        if (!demoPlayer) {
            demoPlayer = new DemoPlayer(canvas.width / 2, canvas.height / 2);
        }
        demoPlayer.update();

        const parallaxX = Math.cos(frameCount * 0.002) * 20;
        const parallaxY = Math.sin(frameCount * 0.002) * 10;
         gameContainer.style.backgroundPosition = `${parallaxX}px ${parallaxY}px, ${parallaxX*2}px ${parallaxY*2}px, ${parallaxX*3}px ${parallaxY*3}px, ${parallaxX*4}px ${parallaxY*4}px`;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        demoPlayer.draw(ctx);
    } else if (gameState === 'loading') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (gameState === 'playing') {
        try {
            updateGame(deltaTime);
        } catch (error) {
    console.error("Um erro ocorreu durante a atualização do jogo. Erro:", error);
    // O jogo não será mais pausado em caso de erro, para atender ao pedido do utilizador.
        }
    }

    if (gameState !== 'menu') {
         try {
            drawGame();
        } catch (error) {
            if (DEBUG_MODE) console.error("Erro em drawGame:", error);
        }
    }
}

function setupEventListeners() {
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
    window.dispatchEvent(new Event('resize'));

    if (isMobile) {
        handleMobileInput();
        document.getElementById('dash-button-mobile').addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (gameState === 'playing' && player) {
                player.dash();
            }
        });
    } else {
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            keys[key] = true;
            if(key === 'shift') keys['shift'] = true;

            if (e.key === 'Escape' && gameState === 'playing') {
                setGameState('paused');
            } else if (e.key === 'Escape' && gameState === 'paused') {
                lastFrameTime = performance.now();
                setGameState('playing');
            }
        });
        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            keys[key] = false;
            if(key === 'shift') keys['shift'] = false;
        });
    }

    document.getElementById('play-button').onclick = () => setGameState('characterSelect');
    document.getElementById('restart-button-pause').onclick = () => initGame();
    document.getElementById('restart-button-gameover').onclick = () => initGame();
    document.getElementById('resume-button').onclick = () => {
        lastFrameTime = performance.now();
        setGameState('playing');
    };
    document.getElementById('back-to-menu-button-pause').onclick = () => setGameState('menu');
    document.getElementById('back-to-menu-button-gameover').onclick = () => setGameState('menu');
    document.getElementById('guide-button').onclick = () => setGameState('guide');
    document.getElementById('back-from-guide-button').onclick = () => setGameState('menu');
    document.getElementById('rank-button').onclick = () => {
        showRank();
        setGameState('rank');
    };
    document.getElementById('back-from-rank-button').onclick = () => setGameState('menu');
    document.getElementById('back-to-menu-from-select-button').onclick = () => setGameState('menu');
    document.getElementById('achievements-button').onclick = () => setGameState('achievements');
    document.getElementById('back-from-achievements-button').onclick = () => setGameState('menu');
    document.getElementById('pause-button').onclick = () => { if(gameState === 'playing') setGameState('paused'); };
    document.getElementById('fullscreen-button').onclick = toggleFullscreen;
    document.getElementById('upgrades-button').onclick = () => {
        populateUpgradesMenu();
        setGameState('upgrades');
    };
    document.getElementById('back-from-upgrades-button').onclick = () => setGameState('menu');
}
