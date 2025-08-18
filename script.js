// Variável de depuração global
const DEBUG_MODE = false; // Altere para true para ver logs no console

// Contexto do canvas e container do jogo
let canvas;
let ctx;
let gameContainer;

// --- ESTADO CENTRALIZADO DO JOGO ---
const game = {
    player: null,
    platforms: [],
    enemies: [],
    activeVortexes: [],
    powerUps: [],
    activeStaticFields: [],
    activeSanctuaryZones: [],
    activeLightningBolts: [],
    activeDamageNumbers: [],
    activeChests: [],
    ambientParticles: [],
    particleManager: null,
    projectilePool: null,
    enemyProjectilePool: null,
    xpOrbPool: null,
    damageNumberPool: null,
    meteorWarningPool: null,
    qtree: null,
    lastFrameTime: 0,
    waveNumber: 0,
    waveEnemiesRemaining: 0,
    waveCooldownTimer: 0,
    currentWaveConfig: {},
    state: 'menu',
    activeMeteorWarnings: [],
    keys: {},
    time: 0,
    frameCount: 0,
    score: { kills: 0, time: 0 },
    screenShake: { intensity: 0, duration: 0 },
    hitStopTimer: 0,
    isGoldenFrenzyActive: false,
    camera: {
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
        update() {
            // Suaviza o movimento da câmara em direção ao jogador
            this.x += (this.targetX - this.x) * CONFIG.CAMERA_LERP_FACTOR;
            this.y += (this.targetY - this.y) * CONFIG.CAMERA_LERP_FACTOR;
        }
    },
    activeTouches: new Map(),
    movementVector: { x: 0, y: 0 }
};

// --- MELHORIAS PERMANENTES (permanecem globais) ---
const PERMANENT_UPGRADES = {
    'max_health': { name: "Vitalidade", icon: "❤️", levels: [
        { cost: 10, effect: 10 }, { cost: 25, effect: 20 }, { cost: 50, effect: 30 }
    ], desc: (val) => `+${val} Vida Máxima`},
    'damage_boost': { name: "Poder", icon: "💥", levels: [
        { cost: 20, effect: 0.05 }, { cost: 50, effect: 0.10 }, { cost: 100, effect: 0.15 }
    ], desc: (val) => `+${Math.round(val*100)}% Dano`},
    'xp_gain': { name: "Sabedoria", icon: "⭐", levels: [
        { cost: 15, effect: 0.1 }, { cost: 40, effect: 0.2 }, { cost: 80, effect: 0.3 }
    ], desc: (val) => `+${Math.round(val*100)}% Ganho de XP`},
    'initial_luck': { name: "Sorte Inicial", icon: "🍀", levels: [
        { cost: 50, effect: 0.1 }, { cost: 120, effect: 0.2 }, { cost: 250, effect: 0.3 }
    ], desc: (val) => `+${Math.round(val*100)}% Chance de Power-up`},
    'ancient_knowledge': { name: "Conhecimento Ancestral", icon: "🧠", levels: [
        { cost: 100, effect: 1 }
    ], desc: (val) => `+${val} Rerrol de Habilidade no início`},
    'unlock_powerful_skill': { name: "Desbloquear Habilidade", icon: "🔑", levels: [
        { cost: 500, effect: 1 }
    ], desc: (val) => `Desbloqueia uma nova habilidade poderosa`}
};
let playerGems = 0;
let playerUpgrades = {};
let playerAchievements = {};

// --- DADOS CONSTANTES (permanecem globais) ---
const isMobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);


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

    // Validate loaded data
    for(const key in PERMANENT_UPGRADES) {
        const upgradeData = PERMANENT_UPGRADES[key];
        if (playerUpgrades[key] === undefined || playerUpgrades[key] === null || typeof playerUpgrades[key] !== 'number' || playerUpgrades[key] < 0 || playerUpgrades[key] > upgradeData.levels.length) {
            playerUpgrades[key] = 0; // Reset to level 0 if data is invalid
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
    if (debugStatus) debugStatus.textContent = "JS Iniciado."; // Primeiro registo visível no ecrã

    try {
        canvas = document.getElementById('gameCanvas');
        ctx = canvas.getContext('2d');
        gameContainer = document.getElementById('game-container');

        // Verificação básica para o canvas e o container
        if (!canvas || !ctx || !gameContainer) {
            console.error("Crítico: Canvas ou container do jogo não encontrados!");
            if (debugStatus) {
                debugStatus.style.color = 'red';
                debugStatus.textContent = 'Erro Crítico: Elementos do jogo não encontrados! Verifique a consola.';
            }
            return; // Parar a execução
        }

        // Carrega os dados permanentes do localStorage
        loadPermanentData();

        // --- CONFIGURAÇÕES GLOBAIS DO JOGO ---
        const CONFIG = {
            PLAYER_HEALTH: 120, // Aumentado para diminuir a dificuldade
            PLAYER_SPEED: 3,
            PLAYER_JUMP_FORCE: -10, // Força do salto (negativo para subir)
            PLAYER_DASH_FORCE: 15, // Força do dash
            PLAYER_DASH_DURATION: 10, // Duração do dash em frames
            PLAYER_DASH_COOLDOWN: 60, // Cooldown do dash em frames (1 segundo)
            PLAYER_DOUBLE_JUMP_FORCE: -8, // Força do segundo salto
            GRAVITY: 0.5, // Gravidade reintroduzida para o jogador
            GROUND_HEIGHT_PERCENT: 0.2, // 20% da altura do ecrã para o chão
            XP_TO_NEXT_LEVEL_BASE: 80, // Diminuído para acelerar o leveling
            XP_TO_NEXT_LEVEL_MULTIPLIER: 1.15, // Diminuído para acelerar o leveling
            XP_ORB_ATTRACTION_RADIUS: 120,
            POWERUP_DROP_CHANCE: 0.02, // 2% de chance
            JOYSTICK_RADIUS: 60, // Raio da base do joystick
            JOYSTICK_DEAD_ZONE: 10, // Zona morta para o punho
            CAMERA_LERP_FACTOR: 0.05, // Suavidade da câmara
            ENEMY_KNOCKBACK_FORCE: 20, // Força do recuo do inimigo ao ser atingido
            PLAYER_LANDING_SQUASH_DURATION: 10, // Duração do efeito de squash ao aterrar
            ORB_HIT_COOLDOWN_FRAMES: 12, // Cooldown para orbes atingirem o mesmo inimigo
            TEMPORARY_MESSAGE_DURATION: 120, // Duração das mensagens temporárias em frames (2 segundos)
            SHOOTER_MIN_DISTANCE: 250, // Distância mínima que os atiradores tentam manter
            // ALTERAÇÃO 1: Mundo Expandido
                WORLD_BOUNDS: { width: 2400, height: 1600 } // Arena Fechada
        };

        // --- BASE DE DADOS DE HABILIDADES ---
        const SKILL_DATABASE = {
            'chain_lightning': { name: "Relâmpago em Cadeia", icon: "↯", type: 'projectile', cooldown: 120, causesHitStop: true, levels: [
                { desc: "Lança um raio que salta para 2 inimigos.", damage: 25, chains: 2, chainRadius: 150 },
                { desc: "O raio salta para 3 inimigos.", damage: 30, chains: 3, chainRadius: 160 },
                { desc: "Aumenta o dano e o número de saltos.", damage: 35, chains: 4, chainRadius: 170 },
                { desc: "Aumenta ainda mais o dano e os saltos.", damage: 40, chains: 5, chainRadius: 180 },
                { desc: "O raio é devastador e salta massivamente.", damage: 50, chains: 6, chainRadius: 200 }
            ]},
            'divine_lance': { name: "Lança Divina", icon: "↑", type: 'projectile', cooldown: 50, levels: [
                { desc: "Dispara uma lança perfurante.", count: 1, damage: 10, pierce: 2, speed: 7 },
                { desc: "Dispara duas lanças.", count: 2, damage: 12, pierce: 2, speed: 7 },
                { desc: "Aumenta o dano e a perfuração.", count: 2, damage: 15, pierce: 3, speed: 8 },
                { desc: "Dispara três lanças.", count: 3, damage: 15, pierce: 3, speed: 8 },
                { desc: "Lanças mais rápidas e fortes.", count: 3, damage: 20, pierce: 4, speed: 9 }
            ]},
            'orbital_shield': { name: "Escudo Orbital", icon: "O", type: 'orbital', cooldown: 0, levels: [
                { desc: "Um orbe sagrado gira ao seu redor.", count: 1, damage: 5, radius: 70, speed: 0.05 },
                { desc: "Adiciona um segundo orbe.", count: 2, damage: 8, radius: 75, speed: 0.05 },
                { desc: "Aumenta o dano dos orbes.", count: 2, damage: 15, radius: 80, speed: 0.05 },
                { desc: "Adiciona um terceiro orbe.", count: 3, damage: 15, radius: 85, speed: 0.06 },
                { desc: "Orbes mais rápidos e fortes.", count: 3, damage: 20, radius: 90, speed: 0.07 }
            ]},
            'vortex': { name: "Vórtice Sagrado", icon: "V", type: 'aura', cooldown: 400, levels: [
                { desc: "Cria um vórtice que puxa inimigos.", radius: 150, duration: 120, force: 1.5, damage: 1 },
                { desc: "Aumenta a força de atração.", radius: 160, duration: 120, force: 2.0, damage: 1 },
                { desc: "Aumenta o raio do vórtice.", radius: 200, duration: 150, force: 2.0, damage: 2 },
                { desc: "Vórtice mais duradouro e forte.", radius: 220, duration: 180, force: 2.5, damage: 2 },
            ]},
            'magnet': { name: "Íman Divino", icon: "M", type: 'passive', levels: [
                { desc: "Aumenta o raio de recolha de XP em 25%.", collectRadiusBonus: 0.25 },
                { desc: "Aumenta o raio de recolha de XP em 50%.", collectRadiusBonus: 0.50 },
                { desc: "Aumenta o raio de recolha de XP em 75%.", collectRadiusBonus: 0.75 },
            ]},
            'heal': { name: "Cura Divina", icon: "+", type: 'utility', desc: "Restaura 25% da sua vida máxima.", instant: true },
            'health_regen': { name: "Regeneração Divina", icon: "♥", type: 'passive', levels: [
                { desc: "Regenera 0.5 de vida por segundo.", regenPerSecond: 0.5 },
                { desc: "Regenera 1 de vida por segundo.", regenPerSecond: 1 },
                { desc: "Regenera 1.5 de vida por segundo.", regenPerSecond: 1.5 },
                { desc: "Regenera 2 de vida por segundo.", regenPerSecond: 2 },
            ]},
            'particle_burst': { name: "Explosão de Partículas", icon: "✹", type: 'aura', cooldown: 240, levels: [
                { desc: "Liberta uma explosão de partículas que causa 10 de dano.", radius: 80, damage: 10, particleCount: 30 },
                { desc: "Aumenta o raio e o dano da explosão.", radius: 100, damage: 15, particleCount: 40 },
                { desc: "Aumenta ainda mais o dano e as partículas.", radius: 120, damage: 25, particleCount: 50 },
            ]},
            'dash': { name: "Carga Astral", icon: "»", type: 'utility', cooldown: CONFIG.PLAYER_DASH_COOLDOWN, levels: [
                { desc: `Realiza uma esquiva rápida na direção do movimento (cooldown: ${CONFIG.PLAYER_DASH_COOLDOWN/60}s).`, duration: CONFIG.PLAYER_DASH_DURATION, force: CONFIG.PLAYER_DASH_FORCE }
            ]},
            'double_jump': { name: "Salto Duplo", icon: "▲", type: 'passive', levels: [
                { desc: "Permite um segundo salto no ar.", jumps: 2 }
            ]},
            // ALTERAÇÃO 2: Nova Habilidade - Raio Celestial
            'celestial_ray': { name: "Raio Celestial", icon: "→", type: 'projectile', cooldown: 90, causesHitStop: true, levels: [
                { desc: "Dispara um raio poderoso na última direção de movimento.", damage: 30, speed: 10, width: 10, length: 150, pierce: 5 }
            ]},
            'static_field': { name: "Campo Estático", icon: "⚡", type: 'aura', cooldown: 300, levels: [
                { desc: "Cria um campo que abranda inimigos em 50%.", radius: 100, duration: 180, slowFactor: 0.5 }
            ]},
            'black_hole': { name: "Buraco Negro", icon: "⚫", type: 'utility', cooldown: 900, levels: [ // 15 segundos de cooldown
                { desc: "Invoca um buraco negro que destrói todos os inimigos no ecrã.", damage: 99999 }
            ]},
            'aegis_shield': { name: "Égide Divina", icon: "🛡️", type: 'utility', cooldown: 600, levels: [ // 10s cooldown
                { desc: "Cria um escudo temporário que absorve um golpe.", duration: 300 } // 5 segundos de duração
            ]},
            'scorched_earth': { name: "Rastro Ardente", icon: "🔥", type: 'passive', levels: [
                { desc: "Deixa um rasto de chamas enquanto dá um dash, causando dano.", damagePerFrame: 0.5 }
                ]},
                'spectral_blades': {
                    name: "Lâminas Espectrais",
                    icon: "⚔️",
                    type: 'area', // Um novo tipo para identificar ataques de curto alcance
                    category: 'active',
                    cooldown: 70, // Cooldown rápido
                    causesHitStop: true,
                    levels: [
                        { desc: "Ataca rapidamente à sua frente, trespassando 3 inimigos.", damage: 20, pierce: 3, arc: Math.PI / 2, range: 80 },
                        { desc: "Aumenta o dano e a área do ataque.", damage: 25, pierce: 4, arc: Math.PI / 2, range: 90 },
                        { desc: "Aumenta drasticamente o dano.", damage: 40, pierce: 4, arc: Math.PI / 1.8, range: 100 },
                        { desc: "As lâminas atacam com fúria celestial, aumentando a perfuração.", damage: 50, pierce: 6, arc: Math.PI / 1.8, range: 110 },
                        { desc: "Um golpe devastador que acerta múltiplos inimigos.", damage: 70, pierce: 8, arc: Math.PI / 1.5, range: 120 }
                    ]
                },
                'celestial_pact': {
                    name: "Pacto Celestial",
                    icon: "✨",
                    type: 'passive',
                    category: 'passive',
                    levels: [
                        { desc: "Aumenta o spawn de inimigos em 10%, mas aumenta o ganho de XP em 8%.", enemyBonus: 0.10, xpBonus: 0.08 },
                        { desc: "Aumenta o spawn de inimigos em 20%, mas aumenta o ganho de XP em 16%.", enemyBonus: 0.20, xpBonus: 0.16 },
                        { desc: "Aumenta o spawn de inimigos em 30%, mas aumenta o ganho de XP em 24% e a chance de encontrar gemas.", enemyBonus: 0.30, xpBonus: 0.24, gemBonus: 0.01 }
                    ]
                },
                'sanctuary': {
                    name: "Santuário",
                    icon: "🏠",
                    type: 'aura',
                    category: 'active',
                    cooldown: 600, // Cooldown longo
                    levels: [
                        { desc: "Cria uma zona segura que aumenta a sua regeneração e abranda inimigos.", radius: 180, duration: 300, slowFactor: 0.3, regenBoost: 2.0 },
                        { desc: "Aumenta a duração e o efeito de abrandamento.", radius: 190, duration: 360, slowFactor: 0.4, regenBoost: 2.5 },
                        { desc: "Aumenta significativamente o raio e a regeneração.", radius: 220, duration: 420, slowFactor: 0.5, regenBoost: 3.5 }
                    ]
                },
                'celestial_hammer': {
                    name: "Martelo Celestial",
                    icon: "🔨",
                    type: 'orbital',
                    category: 'active',
                    cooldown: 0,
                    causesHitStop: true,
                    levels: [
                        { desc: "Um martelo lento e pesado orbita, esmagando inimigos.", count: 1, damage: 40, radius: 110, speed: 0.03, pierce: 3 },
                        { desc: "Aumenta o dano do martelo.", count: 1, damage: 60, radius: 115, speed: 0.03, pierce: 4 },
                        { desc: "Aumenta o raio da órbita.", count: 1, damage: 60, radius: 130, speed: 0.03, pierce: 4 },
                        { desc: "Aumenta drasticamente o dano.", count: 1, damage: 100, radius: 130, speed: 0.035, pierce: 5 },
                        { desc: "O martelo torna-se uma força imparável da natureza.", count: 1, damage: 150, radius: 140, speed: 0.04, pierce: 7 }
                    ]
                },
                'vortex_lances_skill': {
                    name: "Lanças do Vórtice",
                    icon: "💫",
                    type: 'aura',
                    category: 'active',
                    cooldown: 400, // Mesmo cooldown do Vórtice
                    levels: [
                        { desc: "Um vórtice que dispara Lanças Divinas em todas as direções.",
                          radius: 220, duration: 180, force: 2.5, damage: 2, // Stats do Vórtice nível máx.
                          lance_count: 8, lance_damage: 20, lance_pierce: 4, lance_cooldown: 90 // Stats das Lanças
                        }
                    ]
                },
                'celestial_beam': {
                    name: "Feixe Celestial",
                    icon: "🛰️",
                    type: 'projectile',
                    category: 'active',
                    cooldown: 200,
                    unlocked: false, // Habilidade bloqueada por padrão
                    causesHitStop: true,
                    levels: [
                        { desc: "Dispara um feixe contínuo que causa dano massivo.", damage: 25, pierce: 999, speed: 0, width: 20, duration: 120 },
                        { desc: "Aumenta a largura e o dano do feixe.", damage: 35, pierce: 999, speed: 0, width: 30, duration: 120 },
                        { desc: "O feixe dura mais tempo.", damage: 40, pierce: 999, speed: 0, width: 30, duration: 180 }
                    ]
                }
        };

        // --- BASE DE DADOS DE PERSONAGENS ---
        const CHARACTER_DATABASE = {
            'SERAPH': {
                name: "Seraph",
                description: "Um anjo guerreiro equilibrado, mestre da lança.",
                baseHealth: CONFIG.PLAYER_HEALTH,
                speed: CONFIG.PLAYER_SPEED,
                initialSkill: 'divine_lance'
            },
            'CHERUB': {
                name: "Cherub",
                description: "Rápido e ágil, mas mais frágil. Protegido por orbes sagrados.",
                baseHealth: CONFIG.PLAYER_HEALTH * 0.8,
                speed: CONFIG.PLAYER_SPEED * 1.2,
                initialSkill: 'orbital_shield'
            },
            'ARCANGEL': {
                name: "Arcanjo",
                description: "Um ser poderoso que sacrifica velocidade por poder destrutivo em área.",
                baseHealth: CONFIG.PLAYER_HEALTH * 1.2, // Mais vida
                speed: CONFIG.PLAYER_SPEED * 0.85,    // Mais lento
                initialSkill: 'vortex' // Começa com o Vórtice
            }
        };

        // --- BASE DE DADOS DE CONQUISTAS ---
        const ACHIEVEMENT_DATABASE = {
            'TOTAL_KILLS_100': {
                name: "Caçador de Iniciantes",
                description: "Derrote 100 inimigos no total.",
                condition: { type: 'totalKills', value: 100 },
                reward: { type: 'gems', amount: 50 }
            },
            'TOTAL_KILLS_1000': {
                name: "Matador de Legiões",
                description: "Derrote 1.000 inimigos no total.",
                condition: { type: 'totalKills', value: 1000 },
                reward: { type: 'gems', amount: 200 }
            },
            'SURVIVE_15_MINUTES': {
                name: "Sobrevivente Tenaz",
                description: "Sobreviva por 15 minutos em uma única partida.",
                condition: { type: 'survivalTime', value: 15 * 60 }, // em segundos
                reward: { type: 'gems', amount: 150 }
            }
        };

        // --- BASE DE DADOS DE EVOLUÇÕES DE HABILIDADES ---
        const EVOLUTION_DATABASE = {
            'firmament_lances': {
                name: "Lanças do Firmamento",
                baseSkill: 'divine_lance',
                passiveReq: 'health_regen',
                description: "As lanças agora curam o jogador numa pequena percentagem do dano causado."
            },
            'stasis_aura': {
                name: "Aura da Stasis",
                baseSkill: 'orbital_shield',
                passiveReq: 'static_field',
                description: "Os orbes agora abrandam inimigos que tocam."
                },
                'sanguine_blades': {
                    name: "Lâminas Sanguinárias",
                    baseSkill: 'spectral_blades',
                    passiveReq: 'health_regen',
                    description: "Os acertos com as lâminas agora têm uma pequena chance de gerar orbes de vida."
                },
                'consecrated_sanctuary': {
                    name: "Santuário Consagrado",
                    baseSkill: 'sanctuary',
                    passiveReq: 'static_field',
                    description: "O santuário agora também causa dano de luz contínuo aos inimigos."
                },
                'thunder_hammer': {
                    name: "Martelo Trovejante",
                    baseSkill: 'celestial_hammer',
                    passiveReq: 'particle_burst',
                    description: "O martelo agora cria uma explosão de partículas em cada inimigo que atinge."
                }
        };

        // --- BASE DE DADOS DE FUSÕES DE HABILIDADES (NOVA) ---
        const FUSION_DATABASE = {
            'vortex_lances': {
                name: "Lanças do Vórtice",
                skillA: 'divine_lance',
                skillB: 'vortex',
                description: "Combina Lança e Vórtice. O Vórtice agora dispara Lanças perfurantes.",
                newSkill: 'vortex_lances_skill' // ID de uma nova habilidade a ser criada na SKILL_DATABASE
            }
        };

        // --- CONFIGURAÇÃO DE ONDAS ---
        const WAVE_CONFIGS = [
            // Wave 1: Início suave
            { duration: 30, enemies: [{ type: 'chaser', count: 5, spawnInterval: 60 }], eliteChance: 0 },
            // Wave 2: Mais chasers e speeders
            { duration: 45, enemies: [{ type: 'chaser', count: 8, spawnInterval: 50 }, { type: 'speeder', count: 4, spawnInterval: 70 }], eliteChance: 0.01 },
            // Wave 3: Tanques e Chargers introduzidos
            { duration: 60, enemies: [{ type: 'chaser', count: 10, spawnInterval: 45 }, { type: 'speeder', count: 6, spawnInterval: 60 }, { type: 'tank', count: 3, spawnInterval: 100 }, { type: 'charger', count: 2, spawnInterval: 180 }], eliteChance: 0.02 },
            // Wave 4: Atiradores introduzidos
            { duration: 75, enemies: [{ type: 'chaser', count: 12, spawnInterval: 40 }, { type: 'speeder', count: 8, spawnInterval: 50 }, { type: 'tank', count: 4, spawnInterval: 90 }, { type: 'shooter', count: 2, spawnInterval: 120 }], eliteChance: 0.03 },
            // Wave 5: Bombardeiros introduzidos (pre-boss)
            { duration: 90, enemies: [{ type: 'chaser', count: 15, spawnInterval: 35 }, { type: 'speeder', count: 10, spawnInterval: 45 }, { type: 'tank', count: 5, spawnInterval: 80 }, { type: 'shooter', count: 3, spawnInterval: 100 }, { type: 'bomber', count: 2, spawnInterval: 150 }], eliteChance: 0.04 },
            // Wave 6: Curandeiros introduzidos
            { duration: 100, enemies: [{ type: 'chaser', count: 15, spawnInterval: 30 }, { type: 'healer', count: 1, spawnInterval: 200 }, { type: 'tank', count: 5, spawnInterval: 90 }], eliteChance: 0.05 },
            // Wave 7: Invocadores introduzidos
            { duration: 110, enemies: [{ type: 'speeder', count: 15, spawnInterval: 30 }, { type: 'summoner', count: 1, spawnInterval: 250 }, { type: 'shooter', count: 4, spawnInterval: 100 }], eliteChance: 0.06 },
        ];

        // --- GERENCIADOR DE EVENTOS GLOBAIS ---
        const EVENTS = {
            'meteor_shower': {
                name: "Chuva de Meteoros",
                duration: 30 * 60,
                start: () => {},
                update: () => {
                    // Spawna um novo aviso de meteoro a cada 20 frames
                    if (game.frameCount % 20 === 0) {
                        // Tenta encontrar uma plataforma de chão. Se não, usa uma posição padrão.
                        const groundPlatform = game.platforms.find(p => p.height > 100) || { y: canvas.height * 0.8 };
                        const groundY = groundPlatform.y;

                        // Spawna o aviso perto do jogador
                        const spawnX = game.player.x + (Math.random() - 0.5) * canvas.width;
                        game.activeMeteorWarnings.push(getFromPool(game.meteorWarningPool, spawnX, groundY));
                    }
                },
                end: () => {}
            },
            'golden_frenzy': {
                name: "Frenesi Dourado",
                duration: 30 * 60, // 30 segundos
                start: () => { game.isGoldenFrenzyActive = true; },
                update: () => {},
                end: () => { game.isGoldenFrenzyActive = false; }
            },
            'distortion_zone': {
                name: "Zona de Distorção",
                duration: 60 * 60, // 1 minuto
                start: () => {
                    CONFIG.GRAVITY /= 2;
                    showTemporaryMessage("Gravidade Reduzida!", "magenta");
                },
                update: () => {},
                end: () => {
                    CONFIG.GRAVITY = 0.5; // Restaura para o valor padrão
                }
            }
        };

        const eventManager = {
            timeUntilNextEvent: 120 * 60, // 2 minutos para o primeiro evento
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
                        this.timeUntilNextEvent = (Math.random() * 60 + 120) * 60; // Próximo evento em 2 a 3 minutos
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

        // --- GESTOR DE SOM (VERSÃO MELHORADA) ---
        const SoundManager = {
            initialized: false,
            sfx: {},
            bgm: { main: null, boss: null, bass: null }, // Objeto para armazenar loops de BGM
            bgmNotes: ["C3", "E3", "G3"], // Notas iniciais

            init() {
                if (this.initialized) return;
                this.initialized = true;

                const masterVolume = new Tone.Volume(-10).toDestination();
                const sfxVolume = new Tone.Volume(-5).connect(masterVolume);
                const bgmVolumeNode = new Tone.Volume(-20).connect(masterVolume);

                // SFX...
                this.sfx.xp = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sine" }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.2 }, volume: -12 }).connect(sfxVolume);
                this.sfx.levelUp = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.02, decay: 0.2, sustain: 0.1, release: 0.3 }, volume: -8 }).connect(sfxVolume);
                this.sfx.damage = new Tone.NoiseSynth({ noise: { type: "brown" }, envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 }, volume: -3 }).connect(sfxVolume);
                this.sfx.lance = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 8, envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.4 }, volume: -15 }).connect(sfxVolume);
                this.sfx.nuke = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.01, decay: 0.8, sustain: 0, release: 1 }, volume: 0 }).connect(sfxVolume);
                this.sfx.enemyShot = new Tone.Synth({ oscillator: { type: "square" }, envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 }, volume: -10 }).connect(sfxVolume);
                this.sfx.particleBurst = new Tone.NoiseSynth({ noise: { type: "pink" }, envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.3 }, volume: -5 }).connect(sfxVolume);
                this.sfx.uiClick = new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.1 }, volume: -20 }).connect(sfxVolume);
                this.sfx.land = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }, volume: -15 }).connect(sfxVolume);

                // BGM Principal
                const mainSynth = new Tone.Synth({ oscillator: { type: 'sine' } }).connect(bgmVolumeNode);
                this.bgm.main = new Tone.Loop(time => {
                    mainSynth.triggerAttackRelease(this.bgmNotes[Math.floor(Math.random() * this.bgmNotes.length)], "2n", time);
                }, "2n");

                // Linha de Baixo (para evolução)
                const bassSynth = new Tone.Synth({ oscillator: { type: 'triangle' }, volume: -10 }).connect(bgmVolumeNode);
                this.bgm.bass = new Tone.Loop(time => {
                    bassSynth.triggerAttackRelease("C2", "1n", time);
                }, "1n");

                // BGM do Chefe
                const bossSynth = new Tone.FMSynth({ harmonicity: 3, modulationIndex: 10, envelope: { attack: 0.01, decay: 0.2 }, modulationEnvelope: { attack: 0.01, decay: 0.2 } }).connect(bgmVolumeNode);
                this.bgm.boss = new Tone.Loop(time => {
                    const notes = ["C2", "G2", "C2", "Ab2"];
                    bossSynth.triggerAttackRelease(notes[Math.floor(Math.random() * notes.length)], "8n", time);
                }, "4n");

                Tone.Transport.pause();
            },

            updateBGM(waveNumber) {
                if (waveNumber >= 5 && waveNumber < 10) {
                    this.bgmNotes = ["C3", "E3", "G3", "A3", "B3"];
                } else if (waveNumber >= 10) {
                    this.bgmNotes = ["C3", "E3", "G3", "A3", "B3", "D4", "F4"];
                    if (this.bgm.bass.state !== 'started') {
                        this.bgm.bass.start(0);
                    }
                }
            },

            playMainBGM() {
                this.startAudioContext();
                if (this.bgm.boss.state === 'started') this.bgm.boss.stop();
                if (this.bgm.main.state !== 'started') this.bgm.main.start(0);
            },

            playBossBGM() {
                this.startAudioContext();
                if (this.bgm.main.state === 'started') this.bgm.main.stop();
                if (this.bgm.bass && this.bgm.bass.state === 'started') this.bgm.bass.stop();
                if (this.bgm.boss.state !== 'started') this.bgm.boss.start(0);
            },

            async startAudioContext() {
                if (Tone.context.state !== 'running') {
                    try {
                        await Tone.start();
                        Tone.Transport.start();
                    } catch (e) {
                        if (DEBUG_MODE) console.error("Falha ao iniciar/resumir o contexto de áudio:", e);
                    }
                }
            },

            play(effectName, noteOrDuration = null) {
                this.startAudioContext();
                const sfx = this.sfx[effectName];
                if (sfx) {
                    try {
                        if (sfx instanceof Tone.NoiseSynth) {
                            sfx.triggerAttackRelease(noteOrDuration || "8n");
                        } else if (sfx instanceof Tone.MembraneSynth) {
                            sfx.triggerAttackRelease(noteOrDuration || "C4", "8n");
                        } else {
                            sfx.triggerAttackRelease(noteOrDuration || "C5", "8n");
                        }
                    } catch (e) {
                        if (DEBUG_MODE) console.error(`Erro ao reproduzir o efeito sonoro '${effectName}':`, e);
                    }
                }
            }
        };

        // Inicializa os instrumentos assim que o script corre
        SoundManager.init();

        // --- AGRUPAMENTO DE OBJETOS ---
        // Funções genéricas para gerir agrupamentos de objetos
        const createPool = (ClassRef, initialSize = 100) => {
            const pool = [];
            for (let i = 0; i < initialSize; i++) {
                const obj = new ClassRef();
                obj.active = false;
                pool.push(obj);
            }
            return pool;
        };

        const getFromPool = (pool, ...args) => {
            for (let i = 0; i < pool.length; i++) {
                if (!pool[i].active) {
                    pool[i].active = true;
                    if (pool[i].init) pool[i].init(...args); // Chamar init se disponível
                    return pool[i];
                }
            }
            // Se nenhum objeto inativo, criar um novo (e adicionar ao agrupamento para reutilização futura)
            const newObj = new pool[0].constructor(); // Assume que o construtor está disponível a partir do primeiro elemento
            newObj.active = true;
            if (newObj.init) newObj.init(...args);
            pool.push(newObj);
            return newObj;
        };

        const releaseToPool = (obj) => {
            obj.active = false;
            // Reiniciar qualquer estado que possa interferir com a reutilização futura
            if (obj.reset) obj.reset();
        };

        // --- CLASSES DO JOGO ---
        class Entity {
            constructor(x = 0, y = 0, radius = 0) { // Valores predefinidos para agrupamento
                this.x = x;
                this.y = y;
                this.radius = radius;
                this.isDead = false; // Usado para filtragem, ativo para agrupamento
                this.active = true; // Para agrupamento de objetos
            }
            draw(ctx) {}
            update() {}
            // Método de reinicialização para agrupamento
            reset() {
                this.x = 0;
                this.y = 0;
                this.radius = 0;
                this.isDead = false;
            }
        }

        function unlockAchievement(id) {
            if (playerAchievements.unlocked[id]) return; // Segurança extra

            playerAchievements.unlocked[id] = true;
            const achievement = ACHIEVEMENT_DATABASE[id];

            // Concede a recompensa
            if (achievement.reward) {
                if (achievement.reward.type === 'gems') {
                    playerGems += achievement.reward.amount;
                }
            }

            savePermanentData();

            // Notifica o jogador
            showTemporaryMessage(`Conquista: ${achievement.name}`, 'gold');
        }

        function checkAchievements(eventType, value = 0) {
            for (const id in ACHIEVEMENT_DATABASE) {
                if (!playerAchievements.unlocked[id]) { // Verifica se já não está desbloqueada
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

        class DamageNumber extends Entity {
            constructor() {
                super();
            }
            init(x, y, amount, color = '#FFF') { // Adicionado parâmetro de cor
                super.reset();
                this.x = x;
                this.y = y;
                // Modificado para aceitar texto ou número
                this.amount = typeof amount === 'number' ? Math.round(amount) : amount;
                this.color = color;
                this.alpha = 1;
                this.velocityY = -2; // Movimento para cima
                this.life = 60; // Duração em frames (1 segundo)
            }

            update() {
                this.y += this.velocityY;
                this.alpha -= 0.015;
                this.life--;
                if (this.life <= 0) {
                    this.isDead = true;
                    releaseToPool(this);
                }
            }

            draw(ctx) {
                ctx.save();
                ctx.translate(this.x - game.camera.x, this.y - game.camera.y);
                ctx.globalAlpha = this.alpha;
                ctx.fillStyle = this.color; // Usa a cor da instância
                ctx.font = 'bold 20px "Courier New", Courier, monospace';
                ctx.textAlign = 'center';
                // Adiciona uma sombra sutil para legibilidade
                ctx.shadowColor = 'black';
                ctx.shadowBlur = 2;
                ctx.fillText(this.amount, 0, 0);
                ctx.restore();
            }

            reset() {
                super.reset();
                this.amount = 0;
            }
        }

        class Platform extends Entity {
            constructor(x, y, width, height, color = '#2E8B57') {
                super(x, y, 0); // Raio 0 pois é um retângulo
                this.width = width;
                this.height = height;
                this.color = color;
            }

            draw(ctx) {
                // Otimização: Só desenha a plataforma se ela estiver visível na tela
                const screenLeft = game.camera.x;
                const screenRight = game.camera.x + canvas.width;
                if (this.x + this.width < screenLeft || this.x > screenRight) {
                    return; // Fora da tela, não desenha
                }

                ctx.save();
                ctx.translate(-game.camera.x, -game.camera.y); // Aplica o deslocamento da câmara

                const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
                gradient.addColorStop(0, '#3CB371');
                gradient.addColorStop(0.5, this.color);
                gradient.addColorStop(1, '#1E593F');
                ctx.fillStyle = gradient;
                ctx.fillRect(this.x, this.y, this.width, this.height);

                // OTIMIZAÇÃO: shadowBlur removido para desempenho
                // ctx.shadowColor = 'rgba(0, 255, 0, 0.5)';
                // ctx.shadowBlur = 10;
                ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x + this.width, this.y);
                ctx.stroke();

                ctx.restore();
            }
        }

        class Player extends Entity {
            constructor(characterId = 'SERAPH') {
                super(0, 0, 15);
                const characterData = CHARACTER_DATABASE[characterId];

                // Aplica melhorias permanentes
                const healthUpgradeLevel = playerUpgrades.max_health;
                const damageUpgradeLevel = playerUpgrades.damage_boost;
                const xpUpgradeLevel = playerUpgrades.xp_gain;

                this.baseHealth = characterData.baseHealth + (healthUpgradeLevel > 0 ? PERMANENT_UPGRADES.max_health.levels[healthUpgradeLevel - 1].effect : 0);
                this.damageModifier = 1 + (damageUpgradeLevel > 0 ? PERMANENT_UPGRADES.damage_boost.levels[damageUpgradeLevel - 1].effect : 0);
                    this.xpModifier = 1; // Will be calculated by recalculateStatModifiers

                const luckUpgradeLevel = playerUpgrades.initial_luck;
                this.powerupDropChance = CONFIG.POWERUP_DROP_CHANCE * (1 + (luckUpgradeLevel > 0 ? PERMANENT_UPGRADES.initial_luck.levels[luckUpgradeLevel - 1].effect : 0));

                const knowledgeUpgradeLevel = playerUpgrades.ancient_knowledge;
                this.freeRerolls = (knowledgeUpgradeLevel > 0 ? PERMANENT_UPGRADES.ancient_knowledge.levels[knowledgeUpgradeLevel - 1].effect : 0);

                this.maxHealth = this.baseHealth;
                this.health = this.maxHealth;
                this.speed = characterData.speed;
                this.xp = 0;
                this.level = 1;
                this.xpToNextLevel = CONFIG.XP_TO_NEXT_LEVEL_BASE;
                this.skills = {};
                    this.recalculateStatModifiers();
                this.collectRadius = CONFIG.XP_ORB_ATTRACTION_RADIUS;
                this.facingRight = true;
                this.hitTimer = 0;
                this.animationFrame = 0;
                this.velocityY = 0;
                this.onGround = false;
                this.jumpsAvailable = 1; // Para salto duplo
                this.isDashing = false;
                this.dashTimer = 0;
                this.dashCooldown = 0;
                this.lastMoveDirection = { x: 1, y: 0 }; // Para Raio Celestial
                this.squashStretchTimer = 0; // Para animação de squash
                this.x = canvas.width / 2;
                this.y = canvas.height * (1 - CONFIG.GROUND_HEIGHT_PERCENT) - this.radius;
                this.onGround = true;
                this.shielded = false; // Para a habilidade Égide Divina
                this.shieldTimer = 0; // Duração do escudo
                this.invincibilityTimer = 0; // Para I-Frames
                this.knockbackVelocity = { x: 0, y: 0 }; // Para knockback
                this.coyoteTimer = 0; // Para "Coyote Time"
                this.jumpBufferTimer = 0; // Para "Jump Buffering"
            }

            draw(ctx) {
                // Adiciona efeito de piscar para I-Frames
                if (this.invincibilityTimer > 0 && game.frameCount % 8 < 4) {
                    this.animationFrame++;
                    return; // Pula o desenho, criando o efeito de piscar
                }

                ctx.save();
                ctx.translate(this.x - game.camera.x, this.y - game.camera.y);

                // Squash and Stretch
                let scaleX = 1;
                let scaleY = 1;
                if (this.squashStretchTimer > 0) {
                    const progress = this.squashStretchTimer / CONFIG.PLAYER_LANDING_SQUASH_DURATION;
                    scaleY = 1 - (0.3 * Math.sin(Math.PI * progress));
                    scaleX = 1 + (0.3 * Math.sin(Math.PI * progress));
                    this.squashStretchTimer--;
                }
                ctx.scale(this.facingRight ? scaleX : -scaleX, scaleY);

                // --- LÓGICA DE DESENHO ORIGINAL ---
                if (this.hitTimer > 0) {
                    ctx.fillStyle = 'red';
                    this.hitTimer--;
                } else {
                    ctx.fillStyle = 'white';
                }

                // Corpo principal
                ctx.beginPath();
                ctx.moveTo(0, -this.radius * 1.5);
                ctx.lineTo(this.radius * 1.2, this.radius * 0.8);
                ctx.lineTo(-this.radius * 1.2, this.radius * 0.8);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = 'cyan';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Detalhe "cockpit"
                ctx.fillStyle = '#00FFFF';
                ctx.beginPath();
                ctx.moveTo(0, -this.radius * 0.5);
                ctx.lineTo(this.radius * 0.4, this.radius * 0.2);
                ctx.lineTo(-this.radius * 0.4, this.radius * 0.2);
                ctx.closePath();
                ctx.fill();

                // Asas
                ctx.beginPath();
                ctx.moveTo(this.radius * 0.8, -this.radius * 0.5);
                ctx.quadraticCurveTo(this.radius * 2, -this.radius * 1.5, this.radius * 1.5, this.radius * 0.5);
                ctx.lineTo(this.radius * 0.8, this.radius * 0.8);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(-this.radius * 0.8, -this.radius * 0.5);
                ctx.quadraticCurveTo(-this.radius * 2, -this.radius * 1.5, -this.radius * 1.5, this.radius * 0.5);
                ctx.lineTo(-this.radius * 0.8, this.radius * 0.8);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Escudo
                if (this.shielded) {
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius * 1.5, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(0, 255, 255, ${0.5 + 0.5 * Math.sin(this.animationFrame * 0.1)})`;
                    ctx.lineWidth = 3;
                    ctx.stroke();
                }

                ctx.restore();
                this.animationFrame++;
            }

            update() {
                // Decrementa o temporizador de invencibilidade
                if (this.invincibilityTimer > 0) {
                    this.invincibilityTimer--;
                }
                // Decrementa o Coyote Timer
                if (this.coyoteTimer > 0) {
                    this.coyoteTimer--;
                }
                // Decrementa o Jump Buffer Timer
                if (this.jumpBufferTimer > 0) {
                    this.jumpBufferTimer--;
                }

                this.handleMovement();
                this.applyGravity(); // Aplica gravidade ao jogador
                this.updateSkills();

                // Garante que o jogador morre se cair muito para fora do mundo
                if (game.platforms.length > 0) {
                    const groundPlatform = game.platforms[0]; // Assume que a primeira plataforma é sempre o chão principal.
                    const groundTopY = groundPlatform.y;
                    if (this.y > groundTopY + 400) { // Aumenta a margem de queda
                        this.takeDamage(9999);
                    }
                }

                // Aplica regeneração de vida se a habilidade estiver ativa
                if (this.skills['health_regen']) {
                    const regenLevelData = SKILL_DATABASE['health_regen'].levels[this.skills['health_regen'].level - 1];
                    this.health = Math.min(this.maxHealth, this.health + regenLevelData.regenPerSecond / 60); // Regeneração por frame
                }

                // Atualiza o alvo da câmara para a posição do jogador
                game.camera.targetX = this.x - canvas.width / 2;
                game.camera.targetY = this.y - canvas.height / 2;

                    // Garante que o jogador permaneça dentro dos limites do mundo (Arena Fechada)
                    const halfWorldWidth = CONFIG.WORLD_BOUNDS.width / 2;
                    this.x = Math.max(-halfWorldWidth + this.radius, Math.min(this.x, halfWorldWidth - this.radius));
            }

            handleMovement() {
                // 1. Aplica forças externas (knockback)
                this.moveAndCollide(this.knockbackVelocity.x, this.knockbackVelocity.y);
                this.knockbackVelocity.x *= 0.9;
                this.knockbackVelocity.y *= 0.9;

                // 2. Lida com o dash
                if (this.isDashing) {
                    this.moveAndCollide(this.dashDirection.x * CONFIG.PLAYER_DASH_FORCE, this.dashDirection.y * CONFIG.PLAYER_DASH_FORCE);
                    this.dashTimer--;
                    if (this.dashTimer <= 0) {
                        this.isDashing = false;
                    }
                    return; // Dash sobrepõe-se a outros movimentos
                }

                // 3. Lida com o input do jogador
                let dx = 0;
                let dy_input = 0;
                if (isMobile) {
                    dx = game.movementVector.x;
                    dy_input = game.movementVector.y;
                } else {
                    dx = (game.keys['d'] || game.keys['ArrowRight']) ? 1 : ((game.keys['a'] || game.keys['ArrowLeft']) ? -1 : 0);
                    dy_input = (game.keys['s'] || game.keys['ArrowDown']) ? 1 : ((game.keys['w'] || game.keys['ArrowUp']) ? -1 : 0);
                }

                if (dx !== 0 || dy_input !== 0) {
                    const magnitude = Math.hypot(dx, dy_input);
                    this.lastMoveDirection = { x: dx / magnitude, y: dy_input / magnitude };
                }
                if (dx !== 0) {
                    this.facingRight = dx > 0;
                }
                this.moveAndCollide(dx * this.speed, 0);

                // 4. Lida com saltos e ativação de dash
                const jumpPressed = isMobile ? (game.movementVector.y < -0.5) : (game.keys['w'] || game.keys['ArrowUp'] || game.keys[' ']);
                if (jumpPressed) {
                    if (this.jumpsAvailable > 0 && (this.onGround || this.coyoteTimer > 0)) {
                        this.velocityY = CONFIG.PLAYER_JUMP_FORCE;
                        this.jumpsAvailable--;
                        this.onGround = false;
                        this.coyoteTimer = 0; // Consome o coyote time
                        this.jumpBufferTimer = 0; // Consome o buffer também
                        if (!isMobile) game.keys['w'] = game.keys['ArrowUp'] = game.keys[' '] = false;
                    } else if (this.jumpsAvailable > 0 && !this.onGround && this.skills['double_jump']) {
                        this.velocityY = CONFIG.PLAYER_DOUBLE_JUMP_FORCE;
                        this.jumpsAvailable--;
                    } else {
                        // Se não pode pular agora, guarda a intenção no buffer
                        this.jumpBufferTimer = 10; // 10 frames de buffer
                    }
                }


                if (!isMobile && game.keys['shift']) {
                    this.dash();
                    game.keys['shift'] = false;
                }

                if (this.dashCooldown > 0) {
                    this.dashCooldown--;
                }
            }

            moveAndCollide(dx, dy) {
                const wasOnGround = this.onGround;
                const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)));
                if (steps === 0) return;

                const stepX = dx / steps;
                const stepY = dy / steps;

                for (let i = 0; i < steps; i++) {
                    this.x += stepX;
                    // (Colisão horizontal com paredes iria aqui)

                    this.y += stepY;
                    let collided = false;
                    for (const p of game.platforms) {
                        if (this.x + this.radius > p.x && this.x - this.radius < p.x + p.width && this.y + this.radius > p.y && this.y - this.radius < p.y + p.height) {
                            if (stepY > 0 && (this.y - stepY) + this.radius <= p.y) {
                                this.y = p.y - this.radius;
                                this.velocityY = 0;
                                this.onGround = true;
                                if (!wasOnGround) {
                                    this.jumpsAvailable = (this.skills['double_jump'] ? 2 : 1);
                                    this.squashStretchTimer = CONFIG.PLAYER_LANDING_SQUASH_DURATION;
                                    SoundManager.play('land', '16n');
                                }
                            }
                            collided = true;
                            break;
                        }
                    }
                    if (!collided) this.onGround = false;
                }
            }

            dash() {
                if (this.dashCooldown > 0 || this.isDashing) return;

                this.isDashing = true;
                this.dashTimer = CONFIG.PLAYER_DASH_DURATION;
                this.dashCooldown = CONFIG.PLAYER_DASH_COOLDOWN;

                // A direção já foi guardada em handleMovement, por isso basta usá-la
                this.dashDirection = { x: this.lastMoveDirection.x, y: this.lastMoveDirection.y };

                // CORREÇÃO: Impede o dash para baixo se estiver no chão
                if (this.onGround && this.dashDirection.y > 0) {
                    this.dashDirection.y = 0;
                }

                // Fallback: se por alguma razão não houver direção, usa a que está virado
                if (this.dashDirection.x === 0 && this.dashDirection.y === 0) {
                    this.dashDirection.x = this.facingRight ? 1 : -1;
                }

                SoundManager.play('uiClick', 'F5');

                // Lógica para Rastro Ardente
                if (this.skills['scorched_earth']) {
                    const damage = SKILL_DATABASE['scorched_earth'].levels[0].damagePerFrame;
                    // Cria a área de dano
                    game.activeVortexes.push(new Vortex(this.x, this.y, { radius: 20, duration: 60, damage: damage, isExplosion: true, force: 0 }));
                    // ADICIONE: Cria partículas visuais de fogo
                    for (let i = 0; i < 5; i++) {
                        game.particleManager.createParticle(this.x, this.y, 'orange', 2.5);
                    }
                }
            }

            applyGravity() {
                const wasOnGround = this.onGround;
                this.velocityY += CONFIG.GRAVITY;

                const oldY = this.y;
                let newY = this.y + this.velocityY;

                this.onGround = false; // Assume que está no ar por padrão
                let collided = false;

                // Itera sobre todas as plataformas para verificar colisão
                for (const p of game.platforms) {
                    // Verifica se a trajetória do jogador intercepta a plataforma (varredura vertical)
                    if (this.x + this.radius > p.x && this.x - this.radius < p.x + p.width && // Dentro dos limites X da plataforma
                        oldY + this.radius <= p.y && // No frame anterior, a base do jogador estava ACIMA do topo da plataforma
                        newY + this.radius >= p.y) { // Neste frame, a base do jogador está ABAIXO do topo da plataforma

                        // Colisão detectada!
                        newY = p.y - this.radius; // Corrige a posição para ficar exatamente sobre a plataforma
                        this.velocityY = 0;
                        this.onGround = true;
                        collided = true;

                        if (!wasOnGround) { // Acabou de aterrar
                            this.jumpsAvailable = (this.skills['double_jump'] ? SKILL_DATABASE['double_jump'].levels[0].jumps : 1);
                            this.squashStretchTimer = CONFIG.PLAYER_LANDING_SQUASH_DURATION;
                            SoundManager.play('land', '16n');

                            // Lógica do Jump Buffering: se há um pulo no buffer, executa-o
                            if (this.jumpBufferTimer > 0) {
                                this.velocityY = CONFIG.PLAYER_JUMP_FORCE;
                                this.jumpsAvailable--;
                                this.onGround = false;
                                this.coyoteTimer = 0;
                                this.jumpBufferTimer = 0;
                            }
                        }
                        break; // Encontrou uma plataforma, não precisa de verificar as outras
                    }
                }

                this.y = newY; // Aplica a posição final (corrigida ou não)

                // Lógica do Coyote Time: se estava no chão e agora não está, ativa o temporizador
                if (wasOnGround && !this.onGround) {
                    this.coyoteTimer = 10; // Concede 10 frames de tempo de coyote
                }

                // --- SEÇÃO DE SEGURANÇA (Safety Net) ---
                // Garante que o jogador morre se cair muito para fora do mundo
                if (game.platforms.length > 0) {
                    const groundPlatform = game.platforms[0]; // Assume que a primeira plataforma é sempre o chão principal.
                    const groundTopY = groundPlatform.y;
                    if (this.y > groundTopY + 200) {
                        this.takeDamage(9999);
                    }
                }
            }

            takeDamage(amount, source = null) {
                // Se estiver em dash ou invencível (I-Frames), ignora o dano
                if (this.isDashing || this.invincibilityTimer > 0) {
                    return;
                }

                if (this.shielded) {
                    this.shielded = false;
                    for(let i=0; i<20; i++) game.particleManager.createParticle(this.x, this.y, 'cyan', 3);
                    return;
                }

                this.health -= amount;
                this.hitTimer = 30;
                SoundManager.play('damage', '8n');
                game.screenShake = { intensity: 5, duration: 15 };

                // Ativa I-Frames
                this.invincibilityTimer = 36; // 0.6 segundos de invencibilidade

                // Aplica knockback se uma fonte for fornecida
                if (source) {
                    const knockbackForce = 8; // Força do knockback
                    const angle = Math.atan2(this.y - source.y, this.x - source.x);
                    this.knockbackVelocity.x = Math.cos(angle) * knockbackForce;
                    this.knockbackVelocity.y = Math.sin(angle) * knockbackForce;
                }

                if (this.health <= 0) {
                    this.health = 0;
                    this.isDead = true;
                    setGameState('gameOver');
                }
            }

            addXp(amount) {
                this.xp += amount * this.xpModifier; // Aplica o bónus de XP
                SoundManager.play('xp', 'C5'); // Som de XP
                // Partículas de XP ao recolher
                for (let i = 0; i < 4; i++) {
                    game.particleManager.createParticle(this.x, this.y, 'cyan', 2);
                }

                while (this.xp >= this.xpToNextLevel) {
                    this.level++;
                    this.xp -= this.xpToNextLevel;
                    this.xpToNextLevel = Math.floor(this.xpToNextLevel * CONFIG.XP_TO_NEXT_LEVEL_MULTIPLIER);
                    SoundManager.play('levelUp', ['C6', 'E6', 'G6']); // Som de Subir de Nível
                    setGameState('levelUp');
                }
            }

            addSkill(skillId) {
                const skillData = SKILL_DATABASE[skillId];
                if (skillData.type === 'utility' && skillData.instant) {
                    if (skillId === 'heal') this.health = Math.min(this.maxHealth, this.health + this.maxHealth * 0.25);
                    if (skillId === 'black_hole') { // Habilidade Buraco Negro
                        SoundManager.play('nuke', '8n'); // Som de nuke para o buraco negro
                        game.screenShake = { intensity: 15, duration: 30 };
                        game.enemies.forEach(e => {
                            e.takeDamage(SKILL_DATABASE['black_hole'].levels[0].damage * this.damageModifier); // Aplica modificador de dano
                            e.applyKnockback(this.x, this.y, CONFIG.ENEMY_KNOCKBACK_FORCE * 5); // Forte knockback
                        });
                        showTemporaryMessage("BURACO NEGRO!", "gold");
                    }
                    return;
                }

                if (!this.skills[skillId]) { // Adquirindo pela primeira vez
                    this.skills[skillId] = { level: 1, timer: 0, hudElement: null }; // OTIMIZAÇÃO HUD: Adicionado hudElement
                    if (skillData.type === 'orbital') {
                        this.skills[skillId].orbs = Array.from({ length: skillData.levels[0].count }, (_, i) => ({ angle: (Math.PI * 2 / skillData.levels[0].count) * i, lastHitFrame: 0 }));
                    }

                    // OTIMIZAÇÃO HUD: Criar o ícone no HUD
                    if (skillData.type !== 'passive') {
                        const container = document.getElementById('skills-hud');
                        const div = document.createElement('div');
                        div.className = 'skill-hud-icon';
                        div.id = `hud-skill-${skillId}`;
                        div.innerHTML = `${skillData.icon}<sub>1</sub>`;
                        container.appendChild(div);
                        this.skills[skillId].hudElement = div; // Guarda a referência
                    }

                } else { // Subindo de nível
                    this.skills[skillId].level++;
                    // OTIMIZAÇÃO HUD: Apenas atualizar o texto do nível
                    if (this.skills[skillId].hudElement) {
                        this.skills[skillId].hudElement.querySelector('sub').textContent = this.skills[skillId].level;
                    }
                }

                // Aplicar passivas
                if (skillData.type === 'passive') {
                    if(skillId === 'magnet') {
                        const levelData = skillData.levels[this.skills[skillId].level - 1];
                        this.collectRadius = CONFIG.XP_ORB_ATTRACTION_RADIUS * (1 + levelData.collectRadiusBonus);
                    }
                    if(skillId === 'double_jump') {
                        this.jumpsAvailable = SKILL_DATABASE['double_jump'].levels[0].jumps;
                    }
                        // Recalcula os modificadores de estatísticas para passivas que os afetam
                        if (skillId === 'celestial_pact') {
                            this.recalculateStatModifiers();
                        }
                }
            }

            updateSkills() {
                for (const skillId in this.skills) {
                    const skillState = this.skills[skillId];
                    const skillData = SKILL_DATABASE[skillId];
                    const levelData = skillData.levels[skillState.level - 1];

                    // Cooldowns para habilidades ativas/projéteis
                    if (skillData.type !== 'passive' && skillData.type !== 'orbital') {
                        skillState.timer--;
                        if(skillState.timer > 0) continue;
                    }

                    if (skillData.type === 'projectile') {
                        if (skillId === 'divine_lance') {
                            const targetEnemy = this.findNearestEnemy(); // Sempre procura o inimigo mais próximo

                            if(targetEnemy) {
                                let angle = Math.atan2(targetEnemy.y - this.y, targetEnemy.x - this.x);
                                for (let i = 0; i < levelData.count; i++) {
                                    const spreadAngle = (i - (levelData.count - 1) / 2) * 0.1;
                                    const projectileDamage = levelData.damage * this.damageModifier;
                                    // Passa o skillId para o projétil
                                    getFromPool(game.projectilePool, this.x, this.y, angle + spreadAngle, { ...levelData, damage: projectileDamage }, skillId);
                                }
                                SoundManager.play('lance', 'C4'); // Som de lança
                                skillState.timer = skillData.cooldown;
                            } else {
                                skillState.timer = 10; // Tenta a cada 10 frames
                            }
                        } else if (skillId === 'celestial_ray') {
                            const rayAngle = Math.atan2(this.lastMoveDirection.y, this.lastMoveDirection.x);
                            const rayDamage = levelData.damage * this.damageModifier;
                            // Passa o skillId para o projétil
                            getFromPool(game.projectilePool, this.x, this.y, rayAngle, { ...levelData, damage: rayDamage }, skillId);
                            SoundManager.play('lance', 'E5'); // Som diferente para o raio
                            skillState.timer = skillData.cooldown;
                        } else if (skillId === 'chain_lightning') { // NOVA HABILIDADE
                            const targetEnemy = this.findNearestEnemy();
                            if (targetEnemy) {
                                SoundManager.play('lance', 'A5'); // Som agudo
                                chainLightningEffect(this, targetEnemy, levelData);
                                skillState.timer = skillData.cooldown;
                            } else {
                                skillState.timer = 10;
                            }
                        } else if (skillId === 'celestial_beam') {
                            const beamAngle = Math.atan2(this.lastMoveDirection.y, this.lastMoveDirection.x);
                            const beamDamage = levelData.damage * this.damageModifier;
                            // O "projétil" do feixe é estático, então a posição é relativa ao jogador
                            getFromPool(game.projectilePool, this.x, this.y, beamAngle, { ...levelData, damage: beamDamage }, skillId);
                            // Som?
                            skillState.timer = skillData.cooldown;
                        }
                    } else if (skillData.type === 'aura' && (skillId === 'vortex' || skillId === 'vortex_lances_skill')) {
                        const vortexDamage = levelData.damage * game.player.damageModifier;
                        const isFused = skillId === 'vortex_lances_skill';
                        game.activeVortexes.push(new Vortex(this.x, this.y, { ...levelData, damage: vortexDamage, isFused: isFused }));
                        skillState.timer = skillData.cooldown;
                    } else if (skillData.type === 'aura' && skillId === 'particle_burst') { // Nova habilidade
                        SoundManager.play('particleBurst', '8n'); // Passa uma duração para o NoiseSynth
                        game.enemies.forEach(enemy => {
                            if (Math.hypot(this.x - enemy.x, this.y - enemy.y) < levelData.radius) {
                                enemy.takeDamage(levelData.damage * this.damageModifier); // Aplica modificador de dano
                                enemy.applyKnockback(this.x, this.y, CONFIG.ENEMY_KNOCKBACK_FORCE * 1.5); // Mais knockback
                            }
                        });
                        // Partículas da explosão
                        for (let i = 0; i < Math.floor(levelData.particleCount / 2); i++) {
                            game.particleManager.createParticle(this.x, this.y, 'magenta', 3);
                        }
                        skillState.timer = skillData.cooldown;
                    } else if (skillData.type === 'aura' && skillId === 'static_field') { // Campo Estático
                        game.activeStaticFields.push(new StaticField(this.x, this.y, levelData));
                        skillState.timer = skillData.cooldown;
                    } else if (skillId === 'aegis_shield') { // Égide Divina
                        if (skillState.timer <= 0) { // Se o cooldown acabou
                            this.shielded = true;
                            this.shieldTimer = levelData.duration;
                            skillState.timer = skillData.cooldown; // Reinicia o cooldown da habilidade
                        }
                        if (this.shieldTimer > 0) {
                            this.shieldTimer--;
                        } else {
                            this.shielded = false; // Desativa o escudo se o tempo acabar
                        }
                        } else if (skillData.type === 'area' && skillId === 'spectral_blades') {
                            const enemiesToHit = [];
                            const playerAngle = Math.atan2(this.lastMoveDirection.y, this.lastMoveDirection.x);

                            // Find all enemies in range and in the arc
                            for (const enemy of game.enemies) {
                                if (enemy.isDead) continue;

                                const dist = Math.hypot(this.x - enemy.x, this.y - enemy.y);
                                if (dist < levelData.range) {
                                    const angleToEnemy = Math.atan2(enemy.y - this.y, enemy.x - this.x);
                                    let angleDiff = playerAngle - angleToEnemy;

                                    // Normalize the angle difference to be between -PI and PI
                                    while (angleDiff <= -Math.PI) angleDiff += 2 * Math.PI;
                                    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;

                                    if (Math.abs(angleDiff) < levelData.arc / 2) {
                                        enemiesToHit.push(enemy);
                                    }
                                }
                            }

                            // Sort by distance to apply pierce correctly
                            enemiesToHit.sort((a, b) => Math.hypot(this.x - a.x, this.y - a.y) - Math.hypot(this.x - b.x, this.y - b.y));

                            let piercedCount = 0;
                            for (const enemy of enemiesToHit) {
                                if (piercedCount >= levelData.pierce) break;
                                enemy.takeDamage(levelData.damage * this.damageModifier);
                                enemy.applyKnockback(this.x, this.y, CONFIG.ENEMY_KNOCKBACK_FORCE * 0.5);

                                // Lógica da evolução Lâminas Sanguinárias
                                if (skillState.evolved) {
                                    const CHANCE_TO_DROP_HEAL = 0.05; // 5% de chance
                                    if (Math.random() < CHANCE_TO_DROP_HEAL) {
                                        game.powerUps.push(new PowerUp(enemy.x, enemy.y, 'heal_orb'));
                                    }
                                }

                                piercedCount++;
                            }

                            // Visual effect
                            if (enemiesToHit.length > 0) {
                                createSlashEffect(this.x, this.y, playerAngle, levelData.range, levelData.arc);
                                if (skillData.causesHitStop) {
                                    game.hitStopTimer = 4;
                                }
                            }

                            skillState.timer = skillData.cooldown;
                        } else if (skillId === 'sanctuary') {
                            game.activeSanctuaryZones.push(new SanctuaryZone(this.x, this.y, { ...levelData, evolved: skillState.evolved }));
                            skillState.timer = skillData.cooldown;
                    }
                }
                // --- INÍCIO DA REATORAÇÃO: Lógica genérica para habilidades orbitais ---
                Object.keys(this.skills).forEach(skillId => {
                    const skillData = SKILL_DATABASE[skillId];
                    if (skillData.type === 'orbital') {
                        const skillState = this.skills[skillId];
                        const levelData = skillData.levels[skillState.level - 1];

                        // Garante que a propriedade 'orbs' existe
                        if (!skillState.orbs) {
                             skillState.orbs = [];
                        }

                        // Se o número de orbitais mudou, recria-os
                        if (skillState.orbs.length !== levelData.count) {
                            skillState.orbs = Array.from({ length: levelData.count }, (_, i) => ({
                                angle: (Math.PI * 2 / levelData.count) * i,
                                lastHitFrame: 0,
                                piercedEnemies: new Set() // Para a perfuração do martelo
                            }));
                        }

                        skillState.orbs.forEach(orb => {
                            orb.angle += levelData.speed;
                            const orbX = this.x + Math.cos(orb.angle) * levelData.radius;
                            const orbY = this.y + Math.sin(orb.angle) * levelData.radius;

                            const orbSearchRadius = 15 + 20; // Raio do orbital + margem
                            const orbSearchArea = new Rectangle(orbX - orbSearchRadius, orbY - orbSearchRadius, orbSearchRadius * 2, orbSearchRadius * 2);
                            const nearbyEnemiesForOrb = game.qtree.query(orbSearchArea);

                            // Limpa os inimigos perfurados a cada rotação completa para permitir novos acertos
                            if(orb.angle > Math.PI * 2) {
                                orb.angle -= Math.PI * 2;
                                orb.piercedEnemies.clear();
                            }

                            let hitThisFrame = false;
                            nearbyEnemiesForOrb.forEach(enemy => {
                                if (Math.hypot(orbX - enemy.x, orbY - enemy.y) < 15 + enemy.radius) {
                                    const canHit = !orb.piercedEnemies.has(enemy);

                                    if (canHit) {
                                        enemy.takeDamage(levelData.damage * this.damageModifier);
                                        enemy.applyKnockback(orbX, orbY, CONFIG.ENEMY_KNOCKBACK_FORCE * 0.5);
                                        hitThisFrame = true;

                                        if (levelData.pierce) {
                                            orb.piercedEnemies.add(enemy);
                                            if (orb.piercedEnemies.size >= levelData.pierce) {
                                                // Se atingiu o limite de perfuração, tecnicamente o projétil "morreria",
                                                // mas para orbitais, apenas limpamos para a próxima rotação.
                                            }
                                        }

                                        // Lógica de Evolução
                                        if (skillState.evolved) {
                                            if (skillId === 'orbital_shield') { // Aura da Stasis
                                                enemy.applySlow(120);
                                            } else if (skillId === 'celestial_hammer') { // Martelo Trovejante
                                                // Cria uma pequena explosão no local do inimigo
                                                const explosionData = {
                                                    radius: 40,
                                                    duration: 20,
                                                    damage: levelData.damage * 0.25, // Explosão causa 25% do dano do martelo
                                                    isExplosion: true,
                                                    force: 0
                                                };
                                                game.activeVortexes.push(new Vortex(enemy.x, enemy.y, explosionData));
                                            }
                                        }
                                    }
                                }
                            });
                            if (hitThisFrame && skillData.causesHitStop) {
                                game.hitStopTimer = 2; // Hit stop mais curto para orbitais
                            }
                        });
                    }
                });
                // --- FIM DA REATORAÇÃO ---
            }

            findNearestEnemy() {
                let nearest = null;
                let nearestDistSq = Infinity; // Usar distância ao quadrado é mais rápido (evita raiz quadrada)

                // Define uma área de busca grande e fixa em volta do jogador
                const searchRadius = 2000; // Raio de busca aumentado para um mundo maior
                const searchArea = new Rectangle(
                    this.x - searchRadius,
                    this.y - searchRadius,
                    searchRadius * 2,
                    searchRadius * 2
                );

                // Pede ao Quadtree GLOBAL apenas os inimigos que estão nesta área
                const candidates = game.qtree.query(searchArea);

                // Agora, só precisamos de verificar a distância para os candidatos
                for (const enemy of candidates) {
                    const dx = this.x - enemy.x;
                    const dy = this.y - enemy.y;
                    const distSq = dx * dx + dy * dy; // Distância ao quadrado

                    if (distSq < nearestDistSq) {
                        nearestDistSq = distSq;
                        nearest = enemy;
                    }
                }
                return nearest;
            }

                recalculateStatModifiers() {
                    // Reset modifiers to base (including permanent upgrades)
                    const xpUpgradeLevel = playerUpgrades.xp_gain;
                    this.xpModifier = 1 + (xpUpgradeLevel > 0 ? PERMANENT_UPGRADES.xp_gain.levels[xpUpgradeLevel - 1].effect : 0);

                    // Apply Celestial Pact bonus
                    if (this.skills['celestial_pact']) {
                        const level = this.skills['celestial_pact'].level;
                        const levelData = SKILL_DATABASE['celestial_pact'].levels[level - 1];
                        this.xpModifier += levelData.xpBonus;
                    }
                    // NOTE: In the future, other stat-modifying passives would be applied here.
                }
        }

        class Enemy extends Entity {
            constructor(x, y, type = 'chaser', isElite = false) { // Adicionado isElite
                super(x, y, 10);
                this.type = type;
                this.isElite = isElite; // Propriedade para inimigos de elite
                this.hitTimer = 0;
                this.hitBy = new Set(); // Para dano por tick
                this.animationFrame = 0; // Para animações de pulso
                this.attackTimer = 0; // Para inimigos atiradores
                this.knockbackVelocity = { x: 0, y: 0 }; // Para efeito de recuo
                this.orbHitCooldown = 0; // Cooldown para ser atingido por orbes
                this.slowedTimer = 0; // Para efeito de lentidão
                this.explodesOnDeath = false; // Propriedade para Ceifador/Bomber

                switch(type) {
                    case 'reaper':
                            this.speed = Math.min(6.0, 4.0 + (game.time / 180) + (game.waveNumber * 0.015));
                            this.radius = 10; this.health = 15 + Math.floor(game.time / 20) * 2 + game.waveNumber; this.color = '#7DF9FF';
                            this.shape = 'diamond'; this.damage = 30; this.xpValue = 15; this.explodesOnDeath = true;
                        break;
                    case 'tank':
                            this.speed = Math.min(2.0, 1.2 + (game.time / 200) + (game.waveNumber * 0.004));
                            this.radius = 18; this.health = 70 + Math.floor(game.time / 10) * 7 + (game.waveNumber * 3); this.color = '#FFA500';
                        this.shape = 'square'; this.damage = 12; this.xpValue = 40;
                        break;
                    case 'speeder':
                            this.speed = Math.min(5.5, 3.5 + (game.time / 100) + (game.waveNumber * 0.012));
                            this.radius = 8; this.health = 12 + Math.floor(game.time / 15) * 2 + game.waveNumber; this.color = '#FFFF00';
                        this.shape = 'triangle'; this.damage = 7; this.xpValue = 12;
                        break;
                    case 'bomber':
                            this.speed = Math.min(2.5, 1.5 + (game.time / 220) + (game.waveNumber * 0.006));
                            this.radius = 12; this.health = 45 + Math.floor(game.time / 10) * 4 + (game.waveNumber * 2); this.color = '#9400D3';
                            this.shape = 'pentagon'; this.damage = 9; this.xpValue = 25; this.explodesOnDeath = true;
                        break;
                    case 'shooter':
                            this.speed = Math.min(1.5, 0.8 + (game.time / 280) + (game.waveNumber * 0.003));
                            this.radius = 15; this.health = 35 + Math.floor(game.time / 10) * 4 + (game.waveNumber * 2); this.color = '#FF00FF';
                            this.shape = 'star'; this.damage = 4; this.xpValue = 35; this.attackCooldown = 150;
                            this.attackTimer = this.attackCooldown; this.projectileSpeed = 3.5; this.projectileDamage = 8;
                        break;
                    case 'healer':
                            this.speed = Math.min(1.2, 0.7 + (game.time / 300) + (game.waveNumber * 0.002));
                            this.radius = 14; this.health = 60 + Math.floor(game.time / 10) * 6 + (game.waveNumber * 3); this.color = '#00FF00';
                            this.shape = 'cross'; this.damage = 0; this.xpValue = 50; this.healCooldown = 180;
                            this.healTimer = this.healCooldown; this.healAmount = 5 + Math.floor(game.time / 20); this.healRadius = 100;
                        break;
                    case 'summoner':
                            this.speed = Math.min(1.0, 0.6 + (game.time / 350) + (game.waveNumber * 0.001));
                            this.radius = 20; this.health = 80 + Math.floor(game.time / 10) * 8 + (game.waveNumber * 4); this.color = '#8B4513';
                            this.shape = 'pyramid'; this.damage = 0; this.xpValue = 70; this.summonCooldown = 240;
                        this.summonTimer = this.summonCooldown;
                        break;
                    case 'charger': // NOVO INIMIGO
                        this.speed = Math.min(3.0, 2.0 + (game.time / 160) + (game.waveNumber * 0.007));
                        this.radius = 14; this.health = 50 + Math.floor(game.time / 10) * 5 + (game.waveNumber * 2.5); this.color = '#FF69B4'; // Rosa choque
                        this.shape = 'hexagon'; this.damage = 25; this.xpValue = 30;
                        this.state = 'chasing'; // Estados: chasing, telegraphing, charging
                        this.telegraphTimer = 0;
                        this.chargeTarget = null;
                        this.chargeDuration = 0;
                        break;
                    default: // chaser
                            this.speed = Math.min(4.0, 2.2 + (game.time / 150) + (game.waveNumber * 0.008));
                            this.radius = 12; this.health = 25 + Math.floor(game.time / 10) * 3 + (game.waveNumber * 1.5); this.color = '#FF4D4D';
                        this.shape = 'circle'; this.damage = 8; this.xpValue = 20;
                        break;
                }
                if (this.isElite) { // Ajustes para inimigos de elite
                    this.radius *= 1.5;
                    this.health *= 2.5;
                    this.damage *= 1.5;
                    this.xpValue *= 2;
                    this.color = 'gold'; // Cor de elite
                }
                this.maxHealth = this.health;
            }

            draw(ctx) {
                // Otimização: Só desenha se estiver na tela
                const screenLeft = game.camera.x;
                const screenRight = game.camera.x + canvas.width;
                const screenTop = game.camera.y;
                const screenBottom = game.camera.y + canvas.height;
                if (this.x + this.radius < screenLeft || this.x - this.radius > screenRight ||
                    this.y + this.radius < screenTop || this.y - this.radius > screenBottom) {
                    return;
                }

                ctx.save();
                ctx.translate(this.x - game.camera.x, this.y - game.camera.y); // Aplica o deslocamento da câmara

                const color = this.hitTimer > 0 ? 'white' : this.color;
                ctx.fillStyle = color;

                ctx.beginPath();
                if (this.shape === 'square') { // Tanque
                    ctx.rect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
                } else if (this.shape === 'diamond') {
                    ctx.moveTo(0, -this.radius);
                    ctx.lineTo(this.radius * 0.7, 0);
                    ctx.lineTo(0, this.radius);
                    ctx.lineTo(-this.radius * 0.7, 0);
                    ctx.closePath();
                } else if (this.shape === 'triangle') {
                    // Triângulo aponta para o jogador (relativo ao inimigo)
                    const angle = Math.atan2(game.player.y - this.y, game.player.x - this.x);
                    ctx.moveTo(Math.cos(angle) * this.radius, Math.sin(angle) * this.radius);
                    ctx.lineTo(Math.cos(angle + 2*Math.PI/3) * this.radius, Math.sin(angle + 2*Math.PI/3) * this.radius);
                    ctx.lineTo(Math.cos(angle + 4*Math.PI/3) * this.radius, Math.sin(angle + 4*Math.PI/3) * this.radius);
                } else if (this.shape === 'pentagon') {
                    for(let i=0; i<5; i++) ctx.lineTo(Math.cos(i*2*Math.PI/5) * this.radius, Math.sin(i*2*Math.PI/5) * this.radius);
                } else if (this.shape === 'hexagon') { // Para o Charger
                    for(let i=0; i<6; i++) ctx.lineTo(Math.cos(i*Math.PI/3) * this.radius, Math.sin(i*Math.PI/3) * this.radius);
                } else if (this.shape === 'star') { // Desenha uma estrela para o atirador
                    const numPoints = 5;
                    const outerRadius = this.radius;
                    const innerRadius = this.radius / 2;
                    ctx.rotate(this.animationFrame * 0.02);
                    for (let i = 0; i < numPoints * 2; i++) {
                        const radius = i % 2 === 0 ? outerRadius : innerRadius;
                        const angle = Math.PI / numPoints * i - Math.PI/2;
                        ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
                    }
                } else if (this.shape === 'cross') { // Curandeiro
                    ctx.rect(-this.radius / 3, -this.radius, this.radius * 2 / 3, this.radius * 2);
                    ctx.rect(-this.radius, -this.radius / 3, this.radius * 2, this.radius * 2 / 3);
                } else if (this.shape === 'pyramid') { // Invocador
                    ctx.moveTo(0, -this.radius);
                    ctx.lineTo(this.radius, this.radius);
                    ctx.lineTo(-this.radius, this.radius);
                    ctx.closePath();
                } else { // Círculo (Chaser)
                    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                }
                ctx.closePath();
                ctx.fill();

                if (this.hitTimer > 0) this.hitTimer--;
                this.animationFrame++;

                // Desenha aura de elite
                if (this.isElite) {
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius * 1.2, 0, Math.PI * 2);
                    ctx.strokeStyle = 'gold';
                    ctx.lineWidth = 3;
                    ctx.stroke();

                    // Adiciona a barra de vida para elites
                    const healthBarWidth = this.radius * 2;
                    const healthPercentage = this.health / this.maxHealth;
                    ctx.fillStyle = '#333';
                    ctx.fillRect(-healthBarWidth / 2, this.radius + 10, healthBarWidth, 5);
                    ctx.fillStyle = 'red';
                    ctx.fillRect(-healthBarWidth / 2, this.radius + 10, healthBarWidth * healthPercentage, 5);
                }

                ctx.restore();
            }

            update() {
                if (this.slowedTimer > 0) this.slowedTimer--;

                // Aplica knockback primeiro
                this.x += this.knockbackVelocity.x;
                this.y += this.knockbackVelocity.y;
                this.knockbackVelocity.x *= 0.9; // Reduz o knockback
                this.knockbackVelocity.y *= 0.9;
                if (Math.hypot(this.knockbackVelocity.x, this.knockbackVelocity.y) < 0.1) {
                    this.knockbackVelocity.x = 0;
                    this.knockbackVelocity.y = 0;
                }

                // Decrementa o cooldown de acerto por orbe
                if (this.orbHitCooldown > 0) {
                    this.orbHitCooldown--;
                }

                // ALTERAÇÃO 3: Lógica de explosão para o Ceifador
                if (this.type === 'reaper' && Math.hypot(game.player.x - this.x, game.player.y - this.y) < this.radius + 40) {
                    this.health = 0; // Força a morte, que aciona a explosão
                    this.takeDamage(1); // Aciona a lógica de morte
                    return; // Para de se mover
                }

                // Lógica do Charger State Machine
                if (this.type === 'charger') {
                    const dist = Math.hypot(game.player.x - this.x, game.player.y - this.y);
                    switch (this.state) {
                        case 'chasing':
                            if (dist < 150) { // Distância para iniciar o ataque
                                this.state = 'telegraphing';
                                this.telegraphTimer = 60; // 1 segundo de aviso
                                this.chargeTarget = { x: game.player.x, y: game.player.y }; // Trava no alvo
                            }
                            break;
                        case 'telegraphing':
                            this.telegraphTimer--;
                            // Efeito visual de "carregando"
                            this.color = game.frameCount % 10 < 5 ? '#FFFFFF' : '#FF69B4';
                            if (this.telegraphTimer <= 0) {
                                this.state = 'charging';
                                this.chargeDuration = 30; // Carga dura 0.5 segundos
                            }
                            break;
                        case 'charging':
                            const chargeAngle = Math.atan2(this.chargeTarget.y - this.y, this.chargeTarget.x - this.x);
                            this.x += Math.cos(chargeAngle) * this.speed * 3; // Carga 3x mais rápida
                            this.y += Math.sin(chargeAngle) * this.speed * 3;
                            this.chargeDuration--;
                            if (this.chargeDuration <= 0 || Math.hypot(this.chargeTarget.x - this.x, this.chargeTarget.y - this.y) < 20) {
                                this.state = 'chasing';
                            }
                            break;
                    }
                    // Se estiver carregando ou telegrafando, não executa o movimento normal abaixo.
                    if (this.state !== 'chasing') {
                        return;
                    }
                }

                // Inimigos voadores movem-se em direção ao jogador em X e Y, a menos que estejam em knockback forte
                if (Math.hypot(this.knockbackVelocity.x, this.knockbackVelocity.y) < 5) { // Só se move se o knockback for pequeno
                    let angle = Math.atan2(game.player.y - this.y, game.player.x - this.x);
                    let currentSpeed = this.speed;

                    // Lógica específica para o 'shooter'
                    if (this.type === 'shooter') {
                        const dist = Math.hypot(game.player.x - this.x, game.player.y - this.y);
                        if (dist < CONFIG.SHOOTER_MIN_DISTANCE) {
                            // Se estiver muito perto, inverte o ângulo para fugir
                            angle += Math.PI;
                        } else if (dist > CONFIG.SHOOTER_MIN_DISTANCE + 50) {
                            // Persegue normalmente se estiver longe
                        } else {
                            // Se estiver na distância ideal, para de se mover
                            currentSpeed = 0;
                        }
                    }

                    // Nova lógica de lentidão: aplica apenas o efeito mais forte
                    let finalSlowFactor = 0;
                    if (this.slowedTimer > 0) {
                        finalSlowFactor = Math.max(finalSlowFactor, 0.5); // Aura da Stasis aplica 50% de lentidão
                    }
                    for (const field of game.activeStaticFields) {
                        if (Math.hypot(field.x - this.x, field.y - this.y) < field.radius) {
                            finalSlowFactor = Math.max(finalSlowFactor, field.slowFactor);
                            break; // Assume que o inimigo só pode estar em um campo por vez
                        }
                    }
                    currentSpeed *= (1 - finalSlowFactor);

                    this.x += Math.cos(angle) * currentSpeed;
                    this.y += Math.sin(angle) * currentSpeed;
                }

                // Lógica de ataque para atiradores
                if (this.type === 'shooter') {
                    this.attackTimer--;
                    if (this.attackTimer <= 0) {
                        const angle = Math.atan2(game.player.y - this.y, game.player.x - this.x);
                        getFromPool(game.enemyProjectilePool, this.x, this.y, angle, this.projectileSpeed, this.projectileDamage); // Usa o agrupamento
                        SoundManager.play('enemyShot', 'D4'); // Som de disparo do inimigo
                        this.attackTimer = this.attackCooldown;
                    }
                }
                // Lógica de cura para curandeiros
                if (this.type === 'healer') {
                    this.healTimer--;
                    if (this.healTimer <= 0) {
                        // --- INÍCIO DA OTIMIZAÇÃO ---
                        // 1. Definir a área de busca para o Quadtree
                        const healArea = new Rectangle(this.x - this.healRadius, this.y - this.healRadius, this.healRadius * 2, this.healRadius * 2);

                        // 2. Pedir ao Quadtree apenas os inimigos próximos
                        const nearbyEnemies = game.qtree.query(healArea);

                        // 3. Iterar apenas sobre os inimigos próximos
                        nearbyEnemies.forEach(otherEnemy => {
                            // A verificação de distância ainda é necessária para ter a certeza (o Quadtree devolve um quadrado)
                            if (otherEnemy !== this && Math.hypot(this.x - otherEnemy.x, this.y - otherEnemy.y) < this.healRadius) {
                                otherEnemy.health = Math.min(otherEnemy.maxHealth, otherEnemy.health + this.healAmount);
                                // Partículas de cura
                                for (let i = 0; i < 3; i++) { game.particleManager.createParticle(otherEnemy.x, otherEnemy.y, 'lime', 1); }
                            }
                        });
                        // --- FIM DA OTIMIZAÇÃO ---

                        this.healTimer = this.healCooldown;
                    }
                }
                // Lógica de invocação para invocadores
                if (this.type === 'summoner') {
                    this.summonTimer--;
                    if (this.summonTimer <= 0) {
                        // Invoca um chaser ou speeder pequeno
                        const summonedType = Math.random() < 0.5 ? 'chaser' : 'speeder';
                        game.enemies.push(new Enemy(this.x + (Math.random()-0.5)*50, this.y + (Math.random()-0.5)*50, summonedType));
                        for (let i = 0; i < 5; i++) { game.particleManager.createParticle(this.x, this.y, 'brown', 2); }
                        this.summonTimer = this.summonCooldown;
                    }
                }

                    // Garante que os inimigos permaneçam dentro dos limites do mundo (Arena Fechada)
                    const halfWorldWidth = CONFIG.WORLD_BOUNDS.width / 2;
                    const halfWorldHeight = CONFIG.WORLD_BOUNDS.height / 2;
                    this.x = Math.max(-halfWorldWidth + this.radius, Math.min(this.x, halfWorldWidth - this.radius));
                    this.y = Math.max(-halfWorldHeight + this.radius, Math.min(this.y, halfWorldHeight - this.radius));
            }

            takeDamage(amount) {
                if(this.isDead) return;
                this.health -= amount;
                this.hitTimer = 5;

                // Gera o número de dano
                game.activeDamageNumbers.push(getFromPool(game.damageNumberPool, this.x, this.y, amount));

                // Partículas de dano
                for (let i = 0; i < 5; i++) {
                    game.particleManager.createParticle(this.x, this.y, this.color, 1.8);
                }
                if (this.health <= 0) {
                    this.isDead = true;
                    // Garante que o XP Orb é criado e adicionado ao pool
                    getFromPool(game.xpOrbPool, this.x, this.y, this.xpValue);
                    game.score.kills++; // Contabiliza a morte para a pontuação da partida

                    // Lógica de Conquistas
                    if (playerAchievements && playerAchievements.stats) {
                        playerAchievements.stats.totalKills = (playerAchievements.stats.totalKills || 0) + 1;
                        checkAchievements('totalKills');
                    }

                    // Partículas de morte do inimigo
                    for (let i = 0; i < 10; i++) {
                        game.particleManager.createParticle(this.x, this.y, this.color, 3);
                    }

                    // ALTERAÇÃO 3: Efeito de explosão para inimigos explosivos
                    if(this.explodesOnDeath) {
                        const explosionRadius = this.type === 'reaper' ? 70 : 90;
                        game.activeVortexes.push(new Vortex(this.x, this.y, {radius: explosionRadius, duration: 30, damage: this.damage, isExplosion:true, force: 0}));
                        // Efeito visual maior para a explosão
                        for (let i = 0; i < 20; i++) { game.particleManager.createParticle(this.x, this.y, this.color, 4); }
                    }

                    if(Math.random() < game.player.powerupDropChance){
                        game.powerUps.push(new PowerUp(this.x, this.y, 'nuke'));
                        showTemporaryMessage("NUKE!", "yellow"); // Feedback para power-up
                    }

                // Lógica para o evento Frenesi Dourado
                if (game.isGoldenFrenzyActive) {
                    const gemChance = 0.1; // 10% de chance
                    if (Math.random() < gemChance) {
                        playerGems++;
                        showTemporaryMessage("+1 Gema!", 'violet');
                        savePermanentData();
                    }
                }

                    if (this.isElite) { // Larga gemas se for inimigo de elite
                        const gemsDropped = Math.floor(Math.random() * 3) + 1; // 1 a 3 gemas
                        playerGems += gemsDropped;
                        const gemText = `+${gemsDropped} Gemas!`;
                        game.activeDamageNumbers.push(getFromPool(game.damageNumberPool, this.x, this.y - 15, gemText, '#DA70D6')); // Cor violeta
                        savePermanentData(); // Salva os dados permanentes
                    }

                        // Lógica do Pacto Celestial para chance de gema extra
                        if (game.player.skills['celestial_pact']) {
                            const levelData = SKILL_DATABASE['celestial_pact'].levels[game.player.skills['celestial_pact'].level - 1];
                            if (levelData.gemBonus && Math.random() < levelData.gemBonus) {
                                playerGems++;
                                showTemporaryMessage("+1 Gema (Pacto)!", 'violet');
                                savePermanentData();
                            }
                        }

                    game.waveEnemiesRemaining--; // Decrementa inimigos da onda
                }
            }

            applyKnockback(sourceX, sourceY, force) {
                const angle = Math.atan2(this.y - sourceY, this.x - sourceX);
                this.knockbackVelocity.x = Math.cos(angle) * force;
                this.knockbackVelocity.y = Math.sin(angle) * force;
            }

            applySlow(duration) {
                this.slowedTimer = Math.max(this.slowedTimer, duration);
            }
        }

        class BossEnemy extends Entity {
            constructor(x, y) {
                super(x, y, 40); // Raio grande
                this.maxHealth = 1000 + (game.waveNumber * 150);
                this.health = this.maxHealth;
                    this.speed = 1.2 + (game.waveNumber * 0.02); // Aumentada a velocidade base
                this.damage = 25;
                this.xpValue = 500;
                this.color = '#8A2BE2'; // Roxo azulado
                this.animationFrame = 0;
                this.phase = 1;
                this.attackPatternTimer = 0;
                this.currentAttack = 'chase';
                this.hitTimer = 0; // Para feedback visual de dano
                this.orbHitCooldown = 0; // Para orbes orbitais
                this.knockbackVelocity = { x: 0, y: 0 };
            }

            draw(ctx) {
                ctx.save();
                ctx.translate(this.x - game.camera.x, this.y - game.camera.y);

                const color = this.hitTimer > 0 ? 'white' : this.color;
                ctx.fillStyle = color;

                // Corpo principal rotativo
                ctx.rotate(this.animationFrame * 0.01);
                ctx.beginPath();
                for(let i=0; i<6; i++) {
                    const angle = i * Math.PI / 3;
                    ctx.lineTo(Math.cos(angle) * this.radius, Math.sin(angle) * this.radius);
                }
                ctx.closePath();
                ctx.fill();

                // Núcleo pulsante
                const pulse = Math.sin(this.animationFrame * 0.05) * 5 + (this.radius / 2);
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(0, 0, pulse, 0, Math.PI * 2);
                ctx.fill();

                // Adiciona a barra de vida para o Boss
                const healthBarWidth = this.radius * 3;
                const healthPercentage = this.health / this.maxHealth;
                ctx.fillStyle = '#333';
                ctx.fillRect(-healthBarWidth / 2, this.radius + 15, healthBarWidth, 10);
                ctx.fillStyle = '#FF00FF'; // Cor magenta para a vida do boss
                ctx.fillRect(-healthBarWidth / 2, this.radius + 15, healthBarWidth * healthPercentage, 10);

                ctx.restore();
                if (this.hitTimer > 0) this.hitTimer--;
            }

            update() {
                this.animationFrame++;
                this.attackPatternTimer--;

                // Aplica knockback
                this.x += this.knockbackVelocity.x;
                this.y += this.knockbackVelocity.y;
                this.knockbackVelocity.x *= 0.95;
                this.knockbackVelocity.y *= 0.95;

                if (this.health < this.maxHealth / 2 && this.phase === 1) {
                    this.phase = 2;
                    this.speed *= 1.5; // Fica mais rápido na segunda fase
                    this.currentAttack = 'barrage'; // Muda para um ataque mais agressivo
                    this.attackPatternTimer = 0;
                    showTemporaryMessage("FÚRIA DO BOSS!", "red");
                }

                if (this.attackPatternTimer <= 0) {
                    this.chooseNextAttack();
                }
                this.executeAttack();

                // Decrementa o cooldown de acerto por orbe
                if (this.orbHitCooldown > 0) {
                    this.orbHitCooldown--;
                }

                // Garante que o boss permaneça dentro dos limites do mundo (Arena Fechada)
                const halfWorldWidth = CONFIG.WORLD_BOUNDS.width / 2;
                const halfWorldHeight = CONFIG.WORLD_BOUNDS.height / 2;
                this.x = Math.max(-halfWorldWidth + this.radius, Math.min(this.x, halfWorldWidth - this.radius));
                this.y = Math.max(-halfWorldHeight + this.radius, Math.min(this.y, halfWorldHeight - this.radius));
            }

            chooseNextAttack() {
                const attacks = (this.phase === 1) ? ['chase', 'shoot_ring'] : ['chase', 'barrage', 'summon'];
                this.currentAttack = attacks[Math.floor(Math.random() * attacks.length)];
                this.attackPatternTimer = 180; // Duração do padrão de ataque (3 segundos)
            }

            executeAttack() {
                const angleToPlayer = Math.atan2(game.player.y - this.y, game.player.x - this.x);

                if (this.currentAttack === 'chase') {
                    this.x += Math.cos(angleToPlayer) * this.speed;
                    this.y += Math.sin(angleToPlayer) * this.speed;
                } else if (this.currentAttack === 'shoot_ring' && game.frameCount % 30 === 0) {
                    for(let i=0; i<8; i++) {
                        const angle = i * Math.PI / 4;
                        getFromPool(game.enemyProjectilePool, this.x, this.y, angle, 3, 10);
                    }
                } else if (this.currentAttack === 'barrage' && game.frameCount % 10 === 0) {
                    getFromPool(game.enemyProjectilePool, this.x, this.y, angleToPlayer + (Math.random() - 0.5) * 0.5, 5, 15);
                } else if (this.currentAttack === 'summon' && this.attackPatternTimer === 100) {
                    game.enemies.push(new Enemy(this.x + (Math.random()-0.5)*50, this.y + (Math.random()-0.5)*50, 'speeder', true));
                    game.enemies.push(new Enemy(this.x + (Math.random()-0.5)*50, this.y + (Math.random()-0.5)*50, 'chaser', true));
                }
            }

            takeDamage(amount) {
                if(this.isDead) return;
                this.health -= amount;
                this.hitTimer = 5; // Feedback visual de dano

                // Gera o número de dano
                game.activeDamageNumbers.push(getFromPool(game.damageNumberPool, this.x, this.y, amount));

                // Partículas de dano
                for (let i = 0; i < 10; i++) {
                    game.particleManager.createParticle(this.x, this.y, this.color, 2.5);
                }
                if (this.health <= 0) {
                    console.log("--- BOSS DERROTADO ---"); // DEBUG
                    this.isDead = true;
                    getFromPool(game.xpOrbPool, this.x, this.y, this.xpValue);
                    game.score.kills++;
                    game.waveEnemiesRemaining--; // Conta o boss como 1 inimigo para a onda
                    console.log(`Boss morreu. waveEnemiesRemaining é agora ${game.waveEnemiesRemaining}`); // DEBUG
                    showTemporaryMessage("BOSS DERROTADO!", "gold");
                    game.screenShake = { intensity: 20, duration: 60 };
                    // Partículas de morte do boss
                    for (let i = 0; i < 50; i++) {
                        game.particleManager.createParticle(this.x, this.y, this.color, 5);
                    }
                    // Bosses largam mais gemas
                    const gemsDropped = Math.floor(Math.random() * 10) + 5; // 5 a 14 gemas
                    playerGems += gemsDropped;
                    showTemporaryMessage(`+${gemsDropped} Gemas!`, 'violet');
                    savePermanentData(); // Salva os dados permanentes
                }
            }

            applyKnockback(sourceX, sourceY, force) {
                    // Os Bosses são imunes a knockback.
            }
        }

        class Projectile extends Entity {
            constructor() {
                super();
                this.piercedEnemies = new Set();
                this.skillId = null; // ID da habilidade que o criou
            }

            // método init para agrupamento
            init(x, y, angle, levelData, skillId = null) {
                super.reset();
                this.x = x;
                this.y = y;
                this.skillId = skillId;
                this.angle = angle;
                this.damage = levelData.damage;
                this.pierce = levelData.pierce;

                // Propriedades específicas da habilidade
                this.isBeam = (this.skillId === 'celestial_beam');
                if (this.isBeam) {
                    this.duration = levelData.duration;
                    this.width = levelData.width;
                    this.length = 1000; // Um comprimento longo para simular um feixe
                    this.velocity = { x: 0, y: 0 };
                } else if (this.skillId === 'celestial_ray') {
                    this.radius = levelData.width / 2;
                    this.length = levelData.length;
                    this.velocity = { x: Math.cos(angle) * levelData.speed, y: Math.sin(angle) * levelData.speed };
                } else { // Projétil padrão
                    this.radius = 5;
                    this.velocity = { x: Math.cos(angle) * levelData.speed, y: Math.sin(angle) * levelData.speed };
                }

                this.piercedEnemies.clear();
                this.active = true;
                this.isDead = false;
            }

            draw(ctx) {
                // Otimização: Só desenha se estiver na tela
                const screenLeft = game.camera.x;
                const screenRight = game.camera.x + canvas.width;
                const screenTop = game.camera.y;
                const screenBottom = game.camera.y + canvas.height;
                const largerDimension = this.length || this.radius;
                if (this.x + largerDimension < screenLeft || this.x - largerDimension > screenRight ||
                    this.y + largerDimension < screenTop || this.y - largerDimension > screenBottom) {
                    return;
                }

                ctx.save();
                ctx.translate(this.x - game.camera.x, this.y - game.camera.y);

                // Desenha o projétil principal
                if (this.isBeam) {
                    ctx.save();
                    const lifeRatio = this.duration / SKILL_DATABASE[this.skillId].levels[0].duration;
                    ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + (1-lifeRatio) * 0.5})`;
                    ctx.strokeStyle = `rgba(255, 255, 0, ${0.5 + (1-lifeRatio) * 0.5})`;
                    ctx.lineWidth = 2;
                    ctx.rotate(this.angle);
                    ctx.fillRect(0, -this.width / 2, this.length, this.width);
                    ctx.strokeRect(0, -this.width / 2, this.length, this.width);
                    ctx.restore();
                } else if (this.skillId === 'celestial_ray') {
                    ctx.save();
                    ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
                    ctx.rotate(this.angle);
                    ctx.fillRect(-this.length / 2, -this.radius, this.length, this.radius * 2);
                    ctx.restore();
                } else { // Projétil normal (Lança Divina)
                    ctx.fillStyle = 'yellow';
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
            }

            update() {
                if (!this.active) {
                    return;
                }

                if (this.isBeam) {
                    this.duration--;
                    this.x = game.player.x; // Segue o jogador
                    this.y = game.player.y;
                    this.angle = Math.atan2(game.player.lastMoveDirection.y, game.player.lastMoveDirection.x);
                    if (this.duration <= 0) {
                        this.isDead = true;
                        releaseToPool(this);
                    }
                } else {
                    this.x += this.velocity.x;
                    this.y += this.velocity.y;
                }

                if (game.frameCount % 3 === 0) {
                    const trailColor = `rgba(255, 255, ${Math.floor(Math.random() * 255)}, 0.5)`;
                    const trailRadius = this.radius * (Math.random() * 0.3 + 0.2);
                    game.particleManager.createTrailParticle(this.x, this.y, trailColor, trailRadius);
                }

                const worldEdge = CONFIG.WORLD_BOUNDS.width / 2 + 200;
                if (this.x < -worldEdge || this.x > worldEdge || this.y < -worldEdge || this.y > worldEdge) {
                    this.isDead = true;
                    releaseToPool(this);
                }
            }

            reset() { // Método de reinicialização para agrupamento
                super.reset();
                this.velocity = { x: 0, y: 0 };
                this.damage = 0;
                this.pierce = 0;
                this.piercedEnemies.clear();
                this.type = 'normal';
                this.length = 0;
                this.angle = 0;
            }
        }

        class EnemyProjectile extends Entity {
            constructor() {
                super();
                this.color = 'red';
            }

            init(x, y, angle, speed, damage) {
                super.reset();
                this.x = x;
                this.y = y;
                this.radius = 7; // Raio do projétil inimigo
                this.velocity = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
                this.damage = damage;
                this.color = 'red';
            }

            draw(ctx) {
                // Otimização: Só desenha se estiver na tela
                const screenLeft = game.camera.x;
                const screenRight = game.camera.x + canvas.width;
                if (this.x + this.radius < screenLeft || this.x - this.radius > screenRight) {
                    return;
                }

                ctx.save();
                ctx.translate(-game.camera.x, -game.camera.y);
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            update() {
                this.x += this.velocity.x;
                this.y += this.velocity.y;

                if (game.frameCount % 3 === 0) {
                    const trailColor = `rgba(255, 0, 0, 0.5)`;
                    const trailRadius = this.radius * (Math.random() * 0.3 + 0.2);
                    game.particleManager.createTrailParticle(this.x, this.y, trailColor, trailRadius);
                }

                // Verifica se o projétil saiu da tela
                if (this.x < game.camera.x - 100 || this.x > game.camera.x + canvas.width + 100 || this.y < game.camera.y - 100 || this.y > game.camera.y + canvas.height + 100) {
                    this.isDead = true;
                    releaseToPool(this);
                }
            }

            reset() { // Método de reinicialização para agrupamento
                super.reset();
                this.velocity = { x: 0, y: 0 };
                this.damage = 0;
                this.color = 'red'; // Cor predefinida
            }
        }

        class XPOrb extends Entity {
            constructor() {
                super();
            }
            init(x, y, value) {
                super.reset();
                this.x = x;
                this.y = y;
                this.radius = 5; // Raio fixo para XPOrb
                this.value = value;
            }
            draw(ctx) {
                // Otimização: Só desenha se estiver na tela
                const screenLeft = game.camera.x;
                const screenRight = game.camera.x + canvas.width;
                if (this.x + this.radius < screenLeft || this.x - this.radius > screenRight) {
                    return;
                }

                ctx.save();
                ctx.translate(-game.camera.x, -game.camera.y); // Aplica o deslocamento da câmara
                ctx.fillStyle = 'cyan';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            update() {
                if (!this.active) return; // Garante que apenas orbes ativos são atualizados

                const dist = Math.hypot(game.player.x - this.x, game.player.y - this.y);

                if (dist < game.player.collectRadius) {
                    const angle = Math.atan2(game.player.y - this.y, game.player.x - this.x);
                    this.x += Math.cos(angle) * 8; // Velocidade de atração
                    this.y += Math.sin(angle) * 8;
                }
                if (dist < game.player.radius + this.radius) { // Verificar colisão real para recolha
                    game.player.addXp(this.value);
                    this.isDead = true; // Marcar para remoção
                    releaseToPool(this);
                }
            }
            reset() { // Método de reinicialização para agrupamento
                super.reset();
                this.value = 0;
            }
        }

        class ParticleManager {
            constructor(maxParticles = 500) {
                this.maxParticles = maxParticles;
                this.pool = createPool(Particle, maxParticles);
                this.activeParticles = [];
            }

            createParticle(x, y, color = 'white', scale = 1) {
                // Se a lista de partículas ativas estiver cheia, recicla a mais antiga
                if (this.activeParticles.length >= this.maxParticles) {
                    const oldestParticle = this.activeParticles.shift(); // Remove a mais antiga
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
                const p = getFromPool(this.pool, x, y, color, 1); // scale 1
                p.velocity = { x: 0, y: 0 }; // Rastro não tem velocidade própria
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

        class Particle extends Entity {
            constructor() {
                super();
            }
            init(x, y, color = 'white', scale = 1) { // Adicionado um fator de escala
                super.reset();
                this.x = x;
                this.y = y;
                this.radius = (Math.random() * 3 + 1) * scale;
                this.velocity = { x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 6 }; // Velocidade inicial maior
                this.alpha = 1;
                this.friction = 0.95;
                this.color = color; // Cor da partícula
            }

            draw(ctx) {
                ctx.save();
                ctx.translate(-game.camera.x, -game.camera.y); // Aplica o deslocamento da câmara
                ctx.globalAlpha = this.alpha;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
                ctx.restore();
            }

            update() {
                this.velocity.x *= this.friction;
                this.velocity.y *= this.friction;
                this.x += this.velocity.x;
                this.y += this.velocity.y;
                this.alpha -= 0.02; // Desaparece mais lentamente para ser visível
                if (this.alpha <= 0) {
                    this.isDead = true;
                    releaseToPool(this); // Libertar para o agrupamento
                }
            }
            reset() { // Método de reinicialização para agrupamento
                super.reset();
                this.velocity = { x: 0, y: 0 };
                this.alpha = 1;
                this.friction = 0.95;
                this.color = 'white';
            }
        }

        class PowerUp extends Entity {
            constructor(x, y, type) {
                super(x, y, 10);
                this.type = type;
                    this.animationFrame = 0;
            }
            draw(ctx) {
                ctx.save();
                    ctx.translate(this.x - game.camera.x, this.y - game.camera.y);

                    if (this.type === 'heal_orb') {
                        ctx.fillStyle = `rgba(255, 0, 0, ${0.7 + Math.sin(this.animationFrame * 0.1) * 0.3})`;
                        ctx.beginPath();
                        ctx.moveTo(0, -this.radius * 0.4);
                        ctx.bezierCurveTo(-this.radius, -this.radius, -this.radius, 0, 0, this.radius * 0.6);
                        ctx.bezierCurveTo(this.radius, 0, this.radius, -this.radius, 0, -this.radius * 0.4);
                        ctx.fill();
                    } else { // Nuke
                        ctx.rotate(this.animationFrame * 0.05);
                        ctx.fillStyle = 'yellow';
                        ctx.beginPath();
                        for (let i = 0; i < 5; i++) {
                            const angle = i * (Math.PI * 2 / 5) - Math.PI / 2;
                            ctx.lineTo(Math.cos(angle) * this.radius, Math.sin(angle) * this.radius);
                            const innerAngle = angle + Math.PI / 5;
                            ctx.lineTo(Math.cos(innerAngle) * (this.radius / 2), Math.sin(innerAngle) * (this.radius / 2));
                        }
                        ctx.closePath();
                        ctx.fill();
                }
                ctx.restore();
                    this.animationFrame++;
            }
            update() {
                if (Math.hypot(game.player.x - this.x, game.player.y - this.y) < game.player.radius + this.radius) {
                    this.applyEffect();
                    this.isDead = true;
                }
            }
            applyEffect() {
                    if (this.type === 'nuke') {
                    game.enemies.forEach(e => {
                            e.takeDamage(10000);
                            e.applyKnockback(this.x, this.y, CONFIG.ENEMY_KNOCKBACK_FORCE * 5);
                    });
                        SoundManager.play('nuke', '8n');
                        game.screenShake = { intensity: 15, duration: 30 };
                    } else if (this.type === 'heal_orb') {
                        game.player.health = Math.min(game.player.maxHealth, game.player.health + game.player.maxHealth * 0.10); // Cura 10%
                        SoundManager.play('xp', 'A5'); // Som de recolha
                        for (let i = 0; i < 10; i++) {
                            game.particleManager.createParticle(this.x, this.y, 'red', 1.5);
                        }
                }
            }
        }

        class Vortex extends Entity {
            constructor(x, y, levelData) {
                super(x, y, 10);
                this.duration = levelData.duration;
                this.initialDuration = levelData.duration;
                this.force = levelData.force;
                this.damage = levelData.damage;
                this.maxRadius = levelData.radius;
                this.isExplosion = levelData.isExplosion || false;
                this.animationFrame = 0;
                this.enemiesHitByExplosion = new Set();

                this.isFused = levelData.isFused || false;
                if (this.isFused) {
                    this.lanceCooldown = levelData.lance_cooldown;
                    this.lanceTimer = 0;
                    this.lanceData = {
                        count: levelData.lance_count,
                        damage: levelData.lance_damage,
                        pierce: levelData.lance_pierce
                    };
                }
            }

            update() {
                this.duration--;
                if (this.duration <= 0) {
                    this.isDead = true;
                    this.enemiesHitByExplosion.forEach(enemy => {
                         if(enemy.hitBy) enemy.hitBy.delete(this);
                    });
                    return;
                }

                game.enemies.forEach(enemy => {
                    const dist = Math.hypot(this.x - enemy.x, this.y - enemy.y);
                    if(dist < this.maxRadius){
                        if(this.isExplosion){
                            if(!enemy.hitBy.has(this)){
                                enemy.takeDamage(this.damage * game.player.damageModifier);
                                enemy.applyKnockback(this.x, this.y, CONFIG.ENEMY_KNOCKBACK_FORCE * 2);
                                enemy.hitBy.add(this);
                                this.enemiesHitByExplosion.add(enemy);
                            }
                        } else {
                            const angle = Math.atan2(this.y - enemy.y, this.x - enemy.x);
                            enemy.x += Math.cos(angle) * this.force;
                            enemy.y += Math.sin(angle) * this.force;
                            if(game.frameCount % 60 === 0) enemy.takeDamage(this.damage * game.player.damageModifier);
                        }
                    }
                });

                if (this.isFused) {
                    this.lanceTimer--;
                    if (this.lanceTimer <= 0) {
                        this.lanceTimer = this.lanceCooldown;
                        SoundManager.play('lance', 'A4');

                        const lanceCount = this.lanceData.count;
                        for (let i = 0; i < lanceCount; i++) {
                            const angle = (i / lanceCount) * Math.PI * 2;
                            const lanceDamage = this.lanceData.damage * game.player.damageModifier;
                            const lanceLevelData = {
                                damage: lanceDamage,
                                pierce: this.lanceData.pierce,
                                speed: 7
                            };
                            getFromPool(game.projectilePool, this.x, this.y, angle, lanceLevelData, 'divine_lance');
                        }
                    }
                }

                this.animationFrame++;
            }

            draw(ctx) {
                ctx.save();
                ctx.translate(this.x - game.camera.x, this.y - game.camera.y);

                const lifeRatio = this.duration / this.initialDuration;
                const currentRadius = this.maxRadius * (this.isExplosion ? (1-lifeRatio) : 1);

                ctx.rotate(this.animationFrame * 0.05);

                ctx.fillStyle = `rgba(150, 0, 255, ${this.isExplosion ? lifeRatio * 0.8 : 0.2})`;
                ctx.beginPath();
                ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = `rgba(100, 0, 200, ${this.isExplosion ? lifeRatio * 0.6 : 0.1})`;
                ctx.beginPath();
                ctx.arc(0, 0, currentRadius * 0.8, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }
        }

        class StaticField extends Entity {
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
                ctx.translate(this.x - game.camera.x, this.y - game.camera.y);

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

            class SanctuaryZone extends Entity {
                constructor(x, y, levelData) {
                    super(x, y, levelData.radius);
                    this.duration = levelData.duration;
                    this.slowFactor = levelData.slowFactor;
                    this.regenBoost = levelData.regenBoost;
                    this.animationFrame = 0;

                    this.evolved = levelData.evolved || false;
                    if (this.evolved) {
                        this.dotDamage = 10;
                    }
                }

                update() {
                    this.duration--;
                    if (this.duration <= 0) {
                        this.isDead = true;
                        return;
                    }

                    if (Math.hypot(this.x - game.player.x, this.y - game.player.y) < this.radius) {
                        const baseRegen = game.player.skills['health_regen'] ? SKILL_DATABASE['health_regen'].levels[game.player.skills['health_regen'].level - 1].regenPerSecond : 0;
                        const totalRegen = (baseRegen + this.regenBoost) / 60;
                        game.player.health = Math.min(game.player.maxHealth, game.player.health + totalRegen);
                    }

                    game.enemies.forEach(enemy => {
                        if (Math.hypot(this.x - enemy.x, this.y - enemy.y) < this.radius) {
                            enemy.applySlow(60);

                            if (this.evolved && game.frameCount % 60 === 0) {
                                enemy.takeDamage(this.dotDamage * game.player.damageModifier);
                                game.particleManager.createParticle(enemy.x, enemy.y, 'yellow', 1);
                            }
                        }
                    });

                    this.animationFrame++;
                }

                draw(ctx) {
                    ctx.save();
                    ctx.translate(this.x - game.camera.x, this.y - game.camera.y);

                    const lifeRatio = this.duration / SKILL_DATABASE['sanctuary'].levels[0].duration;
                    const pulse = 0.95 + Math.sin(this.animationFrame * 0.05) * 0.05;

                    ctx.fillStyle = `rgba(255, 255, 150, ${lifeRatio * 0.15})`;
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius * pulse, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = `rgba(255, 255, 200, ${lifeRatio * 0.1})`;
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius * 0.8 * pulse, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.restore();
                }
        }

        class MeteorWarningIndicator extends Entity {
            constructor() {
                super();
            }
            init(x, y, life = 60) {
                super.reset();
                this.x = x;
                this.y = y;
                this.radius = 20;
                this.life = life;
                this.initialLife = life;
            }
            update() {
                this.life--;
                if (this.life <= 0) {
                    this.isDead = true;
                    const meteorStartX = this.x;
                    const meteorStartY = game.camera.y - 50;
                    getFromPool(game.enemyProjectilePool, meteorStartX, meteorStartY, Math.PI / 2, 8, 20);
                }
            }
            draw(ctx) {
                ctx.save();
                ctx.translate(this.x - game.camera.x, this.y - game.camera.y);
                const progress = this.life / this.initialLife;
                const alpha = 1 - progress;
                const radius = this.radius * (1 - progress);
                ctx.strokeStyle = `rgba(255, 100, 0, ${alpha})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
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

        class Quadtree {
            constructor(bounds, capacity = 4) {
                this.bounds = bounds;
                this.capacity = capacity;
                this.points = [];
                this.divided = false;
            }

            subdivide() {
                let { x, y, width, height } = this.bounds;
                let w2 = width / 2;
                let h2 = height / 2;

                let ne = new Quadtree(new Rectangle(x + w2, y, w2, h2), this.capacity);
                let nw = new Quadtree(new Rectangle(x, y, w2, h2), this.capacity);
                let se = new Quadtree(new Rectangle(x + w2, y + h2, w2, h2), this.capacity);
                let sw = new Quadtree(new Rectangle(x, y + h2, w2, h2), this.capacity);

                this.northeast = ne;
                this.northwest = nw;
                this.southeast = se;
                this.southwest = sw;

                this.divided = true;
            }

            insert(point) {
                if (!this.bounds.contains(point)) {
                    return false;
                }

                if (this.points.length < this.capacity) {
                    this.points.push(point);
                    return true;
                }

                if (!this.divided) {
                    this.subdivide();
                }

                if (this.northeast.insert(point) ||
                    this.northwest.insert(point) ||
                    this.southeast.insert(point) ||
                    this.southwest.insert(point)) {
                    return true;
                }
                return false;
            }

            query(range, found = []) {
                if (!this.bounds.intersects(range)) {
                    return found;
                }

                for (let p of this.points) {
                    if (range.contains(p)) {
                        found.push(p);
                    }
                }

                if (this.divided) {
                    this.northwest.query(range, found);
                    this.northeast.query(range, found);
                    this.southwest.query(range, found);
                    this.southeast.query(range, found);
                }

                return found;
            }
        }

        function Rectangle(x, y, w, h) {
            this.x = x;
            this.y = y;
            this.width = w;
            this.height = h;
        }

        Rectangle.prototype.contains = function(point) {
            return (point.x >= this.x &&
                    point.x < this.x + this.width &&
                    point.y >= this.y &&
                    point.y < this.y + this.height);
        };

        Rectangle.prototype.intersects = function(range) {
            return !(range.x > this.x + this.width ||
                     range.x + range.width < this.x ||
                     range.y > this.y + this.height ||
                     range.y + range.height < this.y);
        };

        function initGame(characterId = 'SERAPH') {
            game.platforms = [];
            const groundLevel = canvas.height * (1 - CONFIG.GROUND_HEIGHT_PERCENT);

            game.platforms.push(new Platform(
                    -CONFIG.WORLD_BOUNDS.width / 2,
                groundLevel,
                    CONFIG.WORLD_BOUNDS.width,
                CONFIG.WORLD_BOUNDS.height
            ));

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
                for (const existingPlatform of game.platforms) {
                    if (pX < existingPlatform.x + existingPlatform.width + minGapX &&
                        pX + pWidth > existingPlatform.x - minGapX &&
                        pY < existingPlatform.y + existingPlatform.height + minGapY &&
                        pY + pHeight > existingPlatform.y - minGapY) {
                        overlaps = true;
                        break;
                    }
                }

                if (!overlaps) {
                    game.platforms.push(new Platform(pX, pY, pWidth, pHeight));
                } else {
                    i--;
                }
                attempts++;
            }

            game.ambientParticles = [];
            for(let i=0; i < 100; i++) {
                game.ambientParticles.push({
                    x: Math.random() * CONFIG.WORLD_BOUNDS.width - (CONFIG.WORLD_BOUNDS.width/2),
                    y: Math.random() * CONFIG.WORLD_BOUNDS.height,
                    radius: Math.random() * 1.5,
                    vx: (Math.random() - 0.5) * 0.1,
                    vy: (Math.random() - 0.5) * 0.1,
                    alpha: Math.random() * 0.5 + 0.1
                });
            }


            game.player = new Player(characterId);

            game.particleManager = new ParticleManager(500);
            game.projectilePool = createPool(Projectile, 50);
            game.enemyProjectilePool = createPool(EnemyProjectile, 50);
            game.xpOrbPool = createPool(XPOrb, 100);
            game.damageNumberPool = createPool(DamageNumber, 50);
            game.meteorWarningPool = createPool(MeteorWarningIndicator, 20);

            game.player.addSkill(CHARACTER_DATABASE[characterId].initialSkill);

            game.enemies = [];
            game.activeVortexes = [];
            game.powerUps = [];
            game.activeStaticFields = [];
            game.activeDamageNumbers = [];
            game.activeMeteorWarnings = [];

            document.getElementById('skills-hud').innerHTML = '';

            if (playerUpgrades.unlock_powerful_skill > 0) {
                SKILL_DATABASE['celestial_beam'].unlocked = true;
            } else {
                 SKILL_DATABASE['celestial_beam'].unlocked = false;
            }

            game.projectilePool.forEach(p => releaseToPool(p));
            game.enemyProjectilePool.forEach(p => releaseToPool(p));
            game.xpOrbPool.forEach(o => releaseToPool(o));
            game.damageNumberPool.forEach(dn => releaseToPool(dn));
            game.meteorWarningPool.forEach(p => releaseToPool(p));

            game.time = 0;
            game.frameCount = 0;
            game.score = { kills: 0, time: 0 };
            game.screenShake = { intensity: 0, duration: 0 };

            game.waveNumber = 0;
            game.waveEnemiesRemaining = 0;
            game.waveCooldownTimer = 0;
            startNextWave();

            eventManager.currentEvent = null;
            eventManager.timeUntilNextEvent = 120 * 60;

            setGameState('playing');
        }

        function startNextWave() {
            game.waveNumber++;
            console.log(`--- Iniciando Onda ${game.waveNumber} ---`);

            if (game.waveNumber > 0 && game.waveNumber % 5 === 0) {
                SoundManager.playBossBGM();
                showTemporaryMessage(`BOSS - ONDA ${game.waveNumber}`, "red");
                game.enemies.push(new BossEnemy(game.player.x + canvas.width / 2 + 100, game.player.y - 100));
                game.waveEnemiesRemaining = 1;
                game.currentWaveConfig = { enemies: [], eliteChance: 0 };
                return;
            }

            SoundManager.playMainBGM();
            SoundManager.updateBGM(game.waveNumber);

            if (game.waveNumber <= WAVE_CONFIGS.length) {
                const waveIndex = game.waveNumber - 1;
                game.currentWaveConfig = JSON.parse(JSON.stringify(WAVE_CONFIGS[waveIndex]));
            } else {
                showTemporaryMessage(`ONDA ${game.waveNumber}! (Infinita)`, "cyan");
                const enemyTypes = ['chaser', 'speeder', 'tank', 'shooter', 'bomber', 'healer', 'summoner', 'reaper'];
                const typesInThisWave = Math.min(2 + Math.floor(game.waveNumber / 7), 5);

                game.currentWaveConfig = { enemies: [], eliteChance: Math.min(0.05 + (game.waveNumber - WAVE_CONFIGS.length) * 0.01, 0.25) };

                let typesAdded = new Set();
                for(let i = 0; i < typesInThisWave; i++) {
                    let enemyType;
                    do {
                       enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
                    } while (typesAdded.has(enemyType));
                    typesAdded.add(enemyType);

                    const baseCount = 5;
                        let enemyCount = baseCount + Math.floor(game.waveNumber * 0.8);

                        if (game.player.skills['celestial_pact']) {
                            const levelData = SKILL_DATABASE['celestial_pact'].levels[game.player.skills['celestial_pact'].level - 1];
                            enemyCount *= (1 + levelData.enemyBonus);
                        }

                    game.currentWaveConfig.enemies.push({
                        type: enemyType,
                            count: Math.floor(enemyCount),
                        spawnInterval: Math.max(20, 100 - game.waveNumber * 2)
                    });
                }
            }

            game.waveEnemiesRemaining = 0;
            game.currentWaveConfig.enemies.forEach(enemyType => {
                game.waveEnemiesRemaining += enemyType.count;
                enemyType.spawnTimer = Math.random() * enemyType.spawnInterval;
            });


            if (game.waveNumber <= WAVE_CONFIGS.length) {
                showTemporaryMessage(`ONDA ${game.waveNumber}!`, "gold");
            }
            if (DEBUG_MODE) console.log(`Iniciando Onda ${game.waveNumber}. Total de inimigos: ${game.waveEnemiesRemaining}`);
        }

        function spawnEnemies() {
            if (game.waveEnemiesRemaining <= 0 && game.enemies.length === 0) {
                if (game.waveCooldownTimer <= 0) {
                    game.waveCooldownTimer = 180;
                    showTemporaryMessage("PAUSA ENTRE ONDAS", "white");
                    console.log("Iniciando cooldown entre ondas.");
                } else {
                    game.waveCooldownTimer--;
                    if (game.waveCooldownTimer <= 0) {
                        console.log("Cooldown finalizado. Chamando startNextWave.");
                        startNextWave();
                    }
                }
                return;
            }

            if (!game.currentWaveConfig.enemies) return;

            game.currentWaveConfig.enemies.forEach(enemyConfig => {
                if (enemyConfig.count > 0) {
                    enemyConfig.spawnTimer--;

                    if (enemyConfig.spawnTimer <= 0) {
                        let x, y;
                        const spawnSide = Math.floor(Math.random() * 4);
                        const spawnMargin = 50;
                        const camX = game.camera.x, camY = game.camera.y, camW = canvas.width, camH = canvas.height;

                        if (spawnSide === 0) { x = camX - spawnMargin; y = camY + Math.random() * camH; }
                        else if (spawnSide === 1) { x = camX + camW + spawnMargin; y = camY + Math.random() * camH; }
                        else if (spawnSide === 2) { x = camX + Math.random() * camW; y = camY - spawnMargin; }
                        else { x = camX + Math.random() * camW; y = camY + camH + spawnMargin; }

                            const halfWorldWidth = CONFIG.WORLD_BOUNDS.width / 2;
                            const halfWorldHeight = CONFIG.WORLD_BOUNDS.height / 2;
                            x = Math.max(-halfWorldWidth, Math.min(x, halfWorldWidth));
                            y = Math.max(-halfWorldHeight, Math.min(y, halfWorldHeight));

                        const isElite = Math.random() < game.currentWaveConfig.eliteChance;
                        game.enemies.push(new Enemy(x, y, enemyConfig.type, isElite));

                        enemyConfig.count--;
                        enemyConfig.spawnTimer = enemyConfig.spawnInterval;
                    }
                }
            });
        }

        function chainLightningEffect(source, initialTarget, levelData) {
            if (SKILL_DATABASE['chain_lightning'].causesHitStop) {
                game.hitStopTimer = 4;
            }

            let currentTarget = initialTarget;
            let targetsHit = new Set([currentTarget]);
            let lastPosition = { x: source.x, y: source.y };

            for (let i = 0; i <= levelData.chains; i++) {
                if (!currentTarget) break;

                currentTarget.takeDamage(levelData.damage * game.player.damageModifier);
                createLightningBolt(lastPosition, currentTarget);

                lastPosition = { x: currentTarget.x, y: currentTarget.y };
                let nextTarget = null;
                let nearestDistSq = Infinity;

                const searchRadius = levelData.chainRadius;
                const searchArea = new Rectangle(currentTarget.x - searchRadius, currentTarget.y - searchRadius, searchRadius * 2, searchRadius * 2);

                const candidates = game.qtree.query(searchArea);

                for (const enemy of candidates) {
                    if (!targetsHit.has(enemy) && !enemy.isDead) {
                        const distSq = Math.hypot(currentTarget.x - enemy.x, currentTarget.y - enemy.y);
                        if (distSq < searchRadius * searchRadius && distSq < nearestDistSq) {
                            nearestDistSq = distSq;
                            nextTarget = enemy;
                        }
                    }
                }

                currentTarget = nextTarget;
                if (currentTarget) targetsHit.add(currentTarget);
            }
        }

        function createLightningBolt(startPos, endPos) {
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

                bolt.points.push({x: startPos.x, y: startPos.y});

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
                game.activeLightningBolts.push(bolt);
        }

            function createSlashEffect(x, y, angle, range, arc) {
                const numParticles = 15;
                for (let i = 0; i < numParticles; i++) {
                    const particleAngle = angle + (i / (numParticles - 1) - 0.5) * arc;
                    const particleRange = range * 0.6 + Math.random() * (range * 0.4);

                    const pX = x + Math.cos(particleAngle) * particleRange;
                    const pY = y + Math.sin(particleAngle) * particleRange;

                    const particle = getFromPool(game.particleManager.pool);
                    if (particle) {
                        particle.init(pX, pY, 'white', 1.5);
                        const speed = 1.5;
                        particle.velocity.x = Math.cos(particleAngle) * speed;
                        particle.velocity.y = Math.sin(particleAngle) * speed;
                        game.particleManager.activeParticles.push(particle);
                    }
                }
            }

        function handleCollisions() {
            handlePlayerProjectiles(game.qtree);
            handlePlayerCollisions(game.qtree);
            handleEnemyProjectiles();
        }

        function handlePlayerProjectiles(qtree) {
            if (!game.projectilePool) return;

            for (const proj of game.projectilePool) {
                if (!proj.active) continue;

                let searchRadius = (proj.length || proj.radius) + 30;
                let range = new Rectangle(proj.x - searchRadius, proj.y - searchRadius, searchRadius * 2, searchRadius * 2);
                let nearbyEnemies = qtree.query(range);

                for (let enemy of nearbyEnemies) {
                    if (proj.isDead || proj.piercedEnemies.has(enemy)) continue;

                    let hit = false;
                    if (proj.skillId === 'celestial_ray' || proj.skillId === 'celestial_beam') {
                        const segments = 5;
                        for (let i = 0; i <= segments; i++) {
                            const checkX = proj.x + (i / segments - 0.5) * proj.length * Math.cos(proj.angle);
                            const checkY = proj.y + (i / segments - 0.5) * proj.length * Math.sin(proj.angle);
                            if (Math.hypot(checkX - enemy.x, checkY - enemy.y) < (proj.width/2 || proj.radius) + enemy.radius) {
                                hit = true;
                                break;
                            }
                        }
                    } else {
                        if (Math.hypot(proj.x - enemy.x, proj.y - enemy.y) < proj.radius + enemy.radius) {
                            hit = true;
                        }
                    }

                    if (hit) {
                        enemy.takeDamage(proj.damage);
                        enemy.applyKnockback(proj.x, proj.y, CONFIG.ENEMY_KNOCKBACK_FORCE);

                        if (proj.skillId && SKILL_DATABASE[proj.skillId]?.causesHitStop) {
                            game.hitStopTimer = 4;
                        }

                        const skillState = game.player.skills[proj.skillId];
                        if (skillState && skillState.evolved) {
                            const lifestealAmount = proj.damage * 0.05;
                            game.player.health = Math.min(game.player.maxHealth, game.player.health + lifestealAmount);
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
            if (!game.player) return;

            let searchRadius = game.player.radius + 50;
            let range = new Rectangle(game.player.x - searchRadius, game.player.y - searchRadius, searchRadius * 2, searchRadius * 2);
            let nearbyEnemies = qtree.query(range);

            for (let enemy of nearbyEnemies) {
                if (enemy.isDead) continue;
                if (Math.hypot(game.player.x - enemy.x, game.player.y - enemy.y) < game.player.radius + enemy.radius) {
                    game.player.takeDamage(enemy.damage, enemy);
                    const angle = Math.atan2(enemy.y - game.player.y, enemy.x - game.player.x);
                    enemy.x += Math.cos(angle) * 5;
                    enemy.y += Math.sin(angle) * 5;
                }
            }
        }

        function handleEnemyProjectiles() {
            if (!game.enemyProjectilePool || !game.player) return;

            for (const eProj of game.enemyProjectilePool) {
                if (!eProj.active) continue;
                if (Math.hypot(game.player.x - eProj.x, game.player.y - eProj.y) < game.player.radius + eProj.radius) {
                    game.player.takeDamage(eProj.damage, eProj);
                    for (let i = 0; i < 10; i++) {
                        if (game.particleManager) game.particleManager.createParticle(eProj.x, eProj.y, 'orange', 1.5);
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

        function updateGame(deltaTime) {
            if (game.hitStopTimer > 0) {
                game.hitStopTimer--;
                return;
            }

            game.time += deltaTime;
            game.frameCount++;

            eventManager.update();

            const worldBounds = new Rectangle(-CONFIG.WORLD_BOUNDS.width, -CONFIG.WORLD_BOUNDS.height, CONFIG.WORLD_BOUNDS.width * 2, CONFIG.WORLD_BOUNDS.height * 2);
            game.qtree = new Quadtree(worldBounds, 4);

            for (const enemy of game.enemies) {
                if (!enemy.isDead) {
                    game.qtree.insert(enemy);
                }
            }

            if (game.player) game.player.update();
            if (game.camera) game.camera.update();

            game.enemies.forEach(e => e.update());
            for (const p of game.projectilePool) { if (p.active) p.update(); }
            for (const p of game.enemyProjectilePool) { if (p.active) p.update(); }
            for (const o of game.xpOrbPool) { if (o.active) o.update(); }
            game.particleManager.update();
            game.activeDamageNumbers.forEach(dn => dn.update());

            game.powerUps.forEach(p => p.update());
            game.activeVortexes.forEach(v => v.update());
            game.activeStaticFields.forEach(sf => sf.update());
            game.activeSanctuaryZones.forEach(s => s.update());
            game.activeMeteorWarnings.forEach(w => w.update());

            for (let i = game.activeLightningBolts.length - 1; i >= 0; i--) {
                const bolt = game.activeLightningBolts[i];
                bolt.life--;
                if (bolt.life <= 0) {
                    game.activeLightningBolts.splice(i, 1);
                }
            }

            spawnEnemies();
            handleCollisions();

            removeDeadEntities(game.enemies);
            removeDeadEntities(game.powerUps);
            removeDeadEntities(game.activeVortexes);
            removeDeadEntities(game.activeStaticFields);
            removeDeadEntities(game.activeSanctuaryZones);
            removeDeadEntities(game.activeDamageNumbers);
            removeDeadEntities(game.activeMeteorWarnings);

            if (game.screenShake.duration > 0) {
                game.screenShake.duration--;
                if (game.screenShake.duration <= 0) game.screenShake.intensity = 0;
            }
        }

        function drawGame() {
            if (game.player) {
                const parallaxX1 = -game.camera.x * 0.02;
                const parallaxY1 = -game.camera.y * 0.02;

                const parallaxX2 = -game.camera.x * 0.05;
                const parallaxY2 = -game.camera.y * 0.05;

                const parallaxX3 = -game.camera.x * 0.1;
                const parallaxY3 = -game.camera.y * 0.1;

                gameContainer.style.backgroundPosition =
                    `${parallaxX1}px ${parallaxY1}px, ` +
                    `${parallaxX2}px ${parallaxY2}px, ` +
                    `${parallaxX3}px ${parallaxY3}px, ` +
                    `${parallaxX3 * 1.5}px ${parallaxY3 * 1.5}px`;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();

            ctx.save();
            ctx.translate(-game.camera.x * 0.5, -game.camera.y * 0.5);
            game.ambientParticles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
                ctx.fill();
            });
            ctx.restore();


            if (game.screenShake.intensity > 0) {
                ctx.translate((Math.random() - 0.5) * game.screenShake.intensity, (Math.random() - 0.5) * game.screenShake.intensity);
            }

            game.platforms.forEach(p => p.draw(ctx));

            for (const o of game.xpOrbPool) { if (o.active) o.draw(ctx); }
            game.powerUps.forEach(p => p.draw(ctx));
            game.activeVortexes.forEach(v => v.draw(ctx));
            game.activeStaticFields.forEach(sf => sf.draw(ctx));
            game.activeSanctuaryZones.forEach(s => s.draw(ctx));
            game.activeMeteorWarnings.forEach(w => w.draw(ctx));

            ctx.save();
            ctx.translate(-game.camera.x, -game.camera.y);
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#00FFFF';
            ctx.shadowBlur = 10;
            game.activeLightningBolts.forEach(bolt => {
                ctx.globalAlpha = bolt.life / 5.0;
                ctx.beginPath();
                ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
                for (let i = 1; i < bolt.points.length; i++) {
                    ctx.lineTo(bolt.points[i].x, bolt.points[i].y);
                }
                ctx.stroke();
            });
            ctx.restore();

            game.enemies.forEach(e => e.draw(ctx));
            for (const p of game.projectilePool) { if (p.active) p.draw(ctx); }
            for (const p of game.enemyProjectilePool) { if (p.active) p.draw(ctx); }
            game.particleManager.draw(ctx);

            game.activeDamageNumbers.forEach(dn => dn.draw(ctx));

            if (game.player) game.player.draw(ctx);

            if (game.player && game.player.skills) {
                Object.keys(game.player.skills).forEach(skillId => {
                    const skillData = SKILL_DATABASE[skillId];
                    if (skillData.type === 'orbital' && game.player.skills[skillId].orbs) {
                        const skillState = game.player.skills[skillId];
                        const levelData = skillData.levels[skillState.level - 1];
                        skillState.orbs.forEach(orb => {
                            const orbX = game.player.x + Math.cos(orb.angle) * levelData.radius;
                            const orbY = game.player.y + Math.sin(orb.angle) * levelData.radius;
                            const screenLeft = game.camera.x;
                            const screenRight = game.camera.x + canvas.width;

                            if (orbX + 20 < screenLeft || orbX - 20 > screenRight) return;

                            ctx.save();
                            ctx.translate(orbX - game.camera.x, orbY - game.camera.y);
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

            ctx.restore();
            updateHUD();
        }

        function gameLoop(currentTime) {
            requestAnimationFrame(gameLoop);

            if (!game.lastFrameTime) game.lastFrameTime = currentTime;
            const deltaTime = (currentTime - game.lastFrameTime) / 1000.0;
            game.lastFrameTime = currentTime;

            if (game.state === 'menu') {
                if (!demoPlayer) {
                    demoPlayer = new DemoPlayer(canvas.width / 2, canvas.height / 2);
                }
                demoPlayer.update();

                const parallaxX = Math.cos(game.frameCount * 0.002) * 20;
                const parallaxY = Math.sin(game.frameCount * 0.002) * 10;
                 gameContainer.style.backgroundPosition = `${parallaxX}px ${parallaxY}px, ${parallaxX*2}px ${parallaxY*2}px, ${parallaxX*3}px ${parallaxY*3}px, ${parallaxX*4}px ${parallaxY*4}px`;

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                demoPlayer.draw(ctx);
            }

            if (game.state === 'playing') {
                try {
                    updateGame(deltaTime);
                } catch (error) {
                    if (DEBUG_MODE) console.error("Erro em updateGame:", error);
                    setGameState('paused');
                }
            }

            if (game.state !== 'menu') {
                 try {
                    drawGame();
                } catch (error) {
                    if (DEBUG_MODE) console.error("Erro em drawGame:", error);
                }
            }
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
            hud: document.getElementById('hud'),
            temporaryMessage: document.getElementById('temporary-message'),
            dashButtonMobile: document.getElementById('dash-button-mobile')
        };

        for (const key in ui) {
            if (!ui[key]) {
                console.error(`Crítico: Elemento da UI '${key}' não encontrado!`);
                if (debugStatus) {
                    debugStatus.style.color = 'red';
                    debugStatus.textContent = `Erro Crítico: Elementos do jogo '${key}' não encontrado! Verifique a consola.`;
                }
                return;
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
                    game.lastFrameTime = 0;
                };
            });
        }

        function setGameState(newState) {
            if (['menu', 'paused', 'levelUp', 'gameOver', 'guide', 'rank', 'upgrades', 'characterSelect'].includes(newState) && newState !== game.state) {
                SoundManager.play('uiClick', 'C6');
            }

            if (newState === 'playing' && demoPlayer) {
                demoPlayer = null;
            }

            game.state = newState;

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
                const finalTimeInSeconds = Math.floor(game.time);
                document.getElementById('final-time').innerText = formatTime(finalTimeInSeconds);
                document.getElementById('final-kills').innerText = game.score.kills;
                checkAchievements('survivalTime', finalTimeInSeconds);
                ui.gameOverScreen.classList.remove('hidden');
                saveScore();
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
                populateCharacterSelectScreen();
                ui.characterSelectScreen.classList.remove('hidden');
            } else if (newState === 'achievements') {
                populateAchievementsScreen();
                ui.achievementsScreen.classList.remove('hidden');
            }
        }

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
            if (game.player) {
                document.getElementById('health-bar').style.width = `${(game.player.health / game.player.maxHealth) * 100}%`;
                document.getElementById('xp-bar').style.width = `${(game.player.xp / game.player.xpToNextLevel) * 100}%`;

                const healthPercentage = game.player.health / game.player.maxHealth;
                const vignette = document.getElementById('vignette-overlay');
                if (vignette) {
                    if (healthPercentage < 0.35) {
                        vignette.style.opacity = (1 - (healthPercentage / 0.35)) * 0.8;
                    } else {
                        vignette.style.opacity = 0;
                    }
                }
                if (isMobile) {
                    ui.dashButtonMobile.classList.toggle('on-cooldown', game.player.dashCooldown > 0);
                }
            }
            document.getElementById('timer').innerText = formatTime(Math.floor(game.time));

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
            const tempMsg = ui.temporaryMessage;
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
                const baseSkillState = game.player.skills[evo.baseSkill];
                const passiveSkillState = game.player.skills[evo.passiveReq];

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
                    const baseSkill = game.player.skills[evo.baseSkill];
                    baseSkill.evolved = true;
                    if (baseSkill.hudElement) {
                        baseSkill.hudElement.style.borderColor = 'gold';
                        baseSkill.hudElement.style.boxShadow = '0 0 15px gold';
                    }
                    showTemporaryMessage(`Evoluiu: ${evo.name}!`, 'gold');
                    setGameState('playing');
                    game.lastFrameTime = 0;
                };
                container.appendChild(card);
            });

            let fusionOptions = [];
            for (const fusionId in FUSION_DATABASE) {
                const fusion = FUSION_DATABASE[fusionId];
                const skillAState = game.player.skills[fusion.skillA];
                const skillBState = game.player.skills[fusion.skillB];

                if (skillAState && skillAState.level === SKILL_DATABASE[fusion.skillA].levels.length &&
                    skillBState && skillBState.level === SKILL_DATABASE[fusion.skillB].levels.length &&
                    !game.player.skills[fusion.newSkill]) {
                    fusionOptions.push({ ...fusion, id: fusionId, type: 'fusion' });
                }
            }

            fusionOptions.forEach(fusion => {
                const card = document.createElement('div');
                card.className = 'skill-card';
                card.style.borderColor = 'fuchsia';
                card.style.boxShadow = '0 0 15px fuchsia';
                card.innerHTML = `<h3>FUSÃO: ${fusion.name}</h3><p>${fusion.description}</p>`;
                card.onclick = (event) => {
                    event.stopPropagation();
                    delete game.player.skills[fusion.skillA];
                    delete game.player.skills[fusion.skillB];

                    const hudA = document.getElementById(`hud-skill-${fusion.skillA}`);
                    if (hudA) hudA.remove();
                    const hudB = document.getElementById(`hud-skill-${fusion.skillB}`);
                    if (hudB) hudB.remove();
                    
                    game.player.addSkill(fusion.newSkill);
                    
                    showTemporaryMessage(`Fusão: ${fusion.name}!`, 'fuchsia');
                    setGameState('playing');
                    game.lastFrameTime = 0;
                };
                container.appendChild(card);
            });

            const optionsToDisplay = 3 - evolutionOptions.length - fusionOptions.length;
            if (optionsToDisplay > 0) {
                for(const skillId in game.player.skills){
                    const skillData = SKILL_DATABASE[skillId];
                    const canEvolve = Object.values(EVOLUTION_DATABASE).some(e => e.baseSkill === skillId);
                    if(game.player.skills[skillId].level < skillData.levels.length && !canEvolve) {
                        options.push(skillId);
                    }
                }
                for(const skillId in SKILL_DATABASE){
                    const skillData = SKILL_DATABASE[skillId];
                    if(!game.player.skills[skillId] && skillData.type !== 'utility' && (skillData.unlocked !== false) && !options.includes(skillId)) {
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
                    const currentLevel = game.player.skills[skillId]?.level || 0;
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
                        game.player.addSkill(skillId);
                        setGameState('playing');
                        game.lastFrameTime = 0;
                    };
                    container.appendChild(card);
                });
            }

            if (game.player.freeRerolls > 0) {
                const rerollButton = document.createElement('button');
                rerollButton.className = 'ui-button reroll-button';
                rerollButton.textContent = `Rerolar Opções (${game.player.freeRerolls})`;
                rerollButton.onclick = (event) => {
                    event.stopPropagation();
                    if (game.player.freeRerolls > 0) {
                        game.player.freeRerolls--;
                        SoundManager.play('uiClick', 'E5');
                        populateLevelUpOptions();
                    }
                };
                container.appendChild(rerollButton);
            }
        }

        function updateSkillsHUD() {
            if (!game.player || !game.player.skills) return;

            for (const skillId in game.player.skills) {
                const skillState = game.player.skills[skillId];
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
            const currentTimeInSeconds = Math.floor(game.time / (1000.0 / 60.0));
            const bestTime = parseInt(localStorage.getItem('bestTime') || '0');
            const totalKills = parseInt(localStorage.getItem('totalKills') || '0');

            if (currentTimeInSeconds > bestTime) {
                localStorage.setItem('bestTime', currentTimeInSeconds);
            }
            localStorage.setItem('totalKills', totalKills + game.score.kills);
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
                            SoundManager.play('levelUp', ['C5', 'G5']);
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

        function handleMobileInput() {
            const existingJoysticks = gameContainer.querySelectorAll('.joystick-base');
            existingJoysticks.forEach(joy => joy.remove());
            game.activeTouches.clear();

            gameContainer.addEventListener('touchstart', (e) => {
                if (e.target.classList.contains('ui-button')) {
                    return;
                }
                if (game.state !== 'playing') return;
                e.preventDefault();

                Array.from(e.changedTouches).forEach(touch => {
                    const joystickType = 'move';

                    let existingJoystick = false;
                    for (let [id, joy] of game.activeTouches) {
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

                    game.activeTouches.set(touch.identifier, {
                        joystickType: joystickType,
                        startX: touch.clientX,
                        startY: touch.clientY,
                        baseElement: base,
                        handleElement: handle,
                    });
                });
            }, { passive: false });

            gameContainer.addEventListener('touchmove', (e) => {
                if (game.state !== 'playing') return;
                e.preventDefault();

                Array.from(e.touches).forEach(touch => {
                    const joy = game.activeTouches.get(touch.identifier);
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

                    game.movementVector = { x: normalizedDx, y: normalizedDy };
                });
            }, { passive: false });

            gameContainer.addEventListener('touchend', (e) => {
                Array.from(e.changedTouches).forEach(touch => {
                    const joy = game.activeTouches.get(touch.identifier);
                    if (joy) {
                        joy.baseElement.remove();
                        game.activeTouches.delete(touch.identifier);
                        game.movementVector = { x: 0, y: 0 };
                    }
                });
            });
            gameContainer.addEventListener('touchcancel', (e) => {
                Array.from(e.changedTouches).forEach(touch => {
                    const joy = game.activeTouches.get(touch.identifier);
                    if (joy) {
                        joy.baseElement.remove();
                        game.activeTouches.delete(touch.identifier);
                        game.movementVector = { x: 0, y: 0 };
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
                    } else if (elem.mozRequestFullScreen) { /* Firefox */
                        elem.mozRequestFullScreen();
                    } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari e Opera */
                        elem.webkitRequestFullscreen();
                    } else if (elem.msRequestFullscreen) { /* IE/Edge */
                        elem.msRequestFullscreen();
                    }
                } else {
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                    } else if (document.mozCancelFullScreen) { /* Firefox */
                        document.mozCancelFullScreen();
                    } else if (document.webkitExitFullscreen) { /* Chrome, Safari e Opera */
                        document.webkitExitFullscreen();
                    } else if (document.msExitFullscreen) { /* IE/Edge */
                        document.msExitFullscreen();
                    }
                }
            } catch (e) {
                if (DEBUG_MODE) console.error("Erro ao tentar alternar ecrã inteiro:", e);
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
                ui.dashButtonMobile.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    if (game.state === 'playing' && game.player) {
                        game.player.dash();
                    }
                });
            } else {
                window.addEventListener('keydown', (e) => {
                    const key = e.key.toLowerCase();
                    game.keys[key] = true;
                    if(key === 'shift') game.keys['shift'] = true;

                    if (e.key === 'Escape' && game.state === 'playing') {
                        setGameState('paused');
                    } else if (e.key === 'Escape' && game.state === 'paused') {
                        game.lastFrameTime = 0;
                        setGameState('playing');
                    }
                });
                window.addEventListener('keyup', (e) => {
                    const key = e.key.toLowerCase();
                    game.keys[key] = false;
                    if(key === 'shift') game.keys['shift'] = false;
                });
            }
            window.addEventListener('blur', () => {
                if(game.state === 'playing') setGameState('paused');
            });

            document.getElementById('play-button').onclick = () => setGameState('characterSelect');

            document.getElementById('restart-button-pause').onclick = () => initGame();
            document.getElementById('restart-button-gameover').onclick = () => initGame();

            document.getElementById('resume-button').onclick = () => {
                game.lastFrameTime = 0;
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
            document.getElementById('pause-button').onclick = () => { if(game.state === 'playing') setGameState('paused'); };
            document.getElementById('fullscreen-button').onclick = toggleFullscreen;

            document.getElementById('upgrades-button').onclick = () => {
                populateUpgradesMenu();
                setGameState('upgrades');
            };
            document.getElementById('back-from-upgrades-button').onclick = () => setGameState('menu');
        }

        setupEventListeners();
        setGameState('menu');

        let initialTime = performance.now();
        game.lastFrameTime = initialTime;
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
