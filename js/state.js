// This file will hold the mutable state of the game.
// Other modules can import these variables and setter functions.

export let player = null;
export let platforms = [];
export let enemies = [];
export let activeVortexes = [];
export let powerUps = [];
export let activeStaticFields = [];
export let activeSanctuaryZones = [];
export let activeLightningBolts = [];
export let activeDamageNumbers = [];
export let activeChests = [];
export let ambientParticles = [];

export let particleManager = null;
export let projectilePool = null;
export let enemyProjectilePool = null;
export let xpOrbPool = null;
export let damageNumberPool = null;
export let meteorWarningPool = null;
export let qtree = null;

export let lastFrameTime = 0;
export let canvas = null;
export let ctx = null;
export let gameContainer = null;

export let waveNumber = 0;
export let waveEnemiesRemaining = 0;
export let waveCooldownTimer = 0;
export let currentWaveConfig = {};

export let playerGems = 0;
export let playerUpgrades = {};
export let playerAchievements = {};

export let gameState = 'menu';
export let activeMeteorWarnings = [];
export let keys = {};
export let gameTime = 0;
export let frameCount = 0;
export let score = { kills: 0, time: 0 };
export let screenShake = { intensity: 0, duration: 0 };
export let hitStopTimer = 0;
export let isGoldenFrenzyActive = false;
export const isMobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
export let activeTouches = new Map();
export let movementVector = { x: 0, y: 0 };
export let camera = { x: 0, y: 0, targetX: 0, targetY: 0, update: () => {} };
export let demoPlayer = null;

// --- SETTER FUNCTIONS ---

export function setPlayer(p) { player = p; }
export function setPlatforms(p) { platforms = p; }
export function setEnemies(e) { enemies = e; }
export function setActiveVortexes(v) { activeVortexes = v; }
export function setPowerUps(p) { powerUps = p; }
export function setActiveStaticFields(f) { activeStaticFields = f; }
export function setActiveSanctuaryZones(z) { activeSanctuaryZones = z; }
export function setActiveLightningBolts(b) { activeLightningBolts = b; }
export function setActiveDamageNumbers(d) { activeDamageNumbers = d; }
export function setActiveChests(c) { activeChests = c; }
export function setAmbientParticles(p) { ambientParticles = p; }
export function setParticleManager(pm) { particleManager = pm; }
export function setProjectilePool(p) { projectilePool = p; }
export function setEnemyProjectilePool(p) { enemyProjectilePool = p; }
export function setXpOrbPool(p) { xpOrbPool = p; }
export function setDamageNumberPool(p) { damageNumberPool = p; }
export function setMeteorWarningPool(p) { meteorWarningPool = p; }
export function setQtree(q) { qtree = q; }
export function setLastFrameTime(t) { lastFrameTime = t; }
export function setCanvas(c) { canvas = c; }
export function setCtx(c) { ctx = c; }
export function setGameContainer(gc) { gameContainer = gc; }
export function setWaveNumber(wn) { waveNumber = wn; }
export function setWaveEnemiesRemaining(wer) { waveEnemiesRemaining = wer; }
export function setWaveCooldownTimer(wct) { waveCooldownTimer = wct; }
export function setCurrentWaveConfig(cwc) { currentWaveConfig = cwc; }
export function setPlayerGems(g) { playerGems = g; }
export function setPlayerUpgrades(u) { playerUpgrades = u; }
export function setPlayerAchievements(a) { playerAchievements = a; }
export function setGameState(gs) { gameState = gs; }
export function setActiveMeteorWarnings(w) { activeMeteorWarnings = w; }
export function setKeys(k) { keys = k; }
export function setGameTime(t) { gameTime = t; }
export function setFrameCount(fc) { frameCount = fc; }
export function setScore(s) { score = s; }
export function setScreenShake(ss) { screenShake = ss; }
export function setHitStopTimer(hst) { hitStopTimer = hst; }
export function setIsGoldenFrenzyActive(gf) { isGoldenFrenzyActive = gf; }
export function setActiveTouches(t) { activeTouches = t; }
export function setMovementVector(v) { movementVector = v; }
export function setCamera(c) { camera = c; }
export function setDemoPlayer(dp) { demoPlayer = dp; }
