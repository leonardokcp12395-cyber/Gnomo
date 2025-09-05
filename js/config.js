// Variável de depuração global
const DEBUG_MODE = false; // Altere para true para ver logs no console

// --- Gestor de Recursos e Pré-carregamento ---
const assets = {
    images: {
        playerRight: 'assets/mago_direita.png',
        playerLeft: 'assets/mago_esquerda.png',
        enemyChaser: 'assets/chaser_esquerda.png',
        enemySpeeder: 'assets/speeder_direita.png',
        enemyShooter: 'assets/shooter.png',
        enemySummoner: 'assets/summoner.png',
        enemyBomber: 'assets/bomber.png',
        enemyCharger: 'assets/charger.png',
        enemyHealer: 'assets/healer.png',
        enemyTank: 'assets/bomber.png',
        enemyReaper: 'assets/summoner.png',
        chainLightning: 'assets/skillrelampago_em_cadeia_vertical.gif',
        ground: 'assets/Chãoblocoretangulo.png'
    },
    loadedImages: {},
    load(callback) {
        const totalImages = Object.keys(this.images).length;
        let loadedImagesCount = 0;

        const checkDone = () => {
            if (loadedImagesCount === totalImages) {
                console.log("Recursos visuais carregados! Iniciando o jogo...");
                callback();
            }
        };

        if (totalImages === 0) {
            checkDone();
            return;
        }

        for (const key in this.images) {
            const img = new Image();
            img.src = this.images[key];
            this.loadedImages[key] = img;
            img.onload = () => {
                loadedImagesCount++;
                checkDone();
            };
            img.onerror = () => {
                console.error(`Erro ao carregar o recurso: ${this.images[key]}`);
                loadedImagesCount++;
                checkDone();
            };
        }
    }
};

// --- MELHORIAS PERMANENTES ---
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

// --- CONFIGURAÇÕES GLOBAIS DO JOGO ---
const CONFIG = {
    PLAYER_HEALTH: 120,
    PLAYER_SPEED: 3,
    PLAYER_JUMP_FORCE: -10,
    PLAYER_DASH_FORCE: 15,
    PLAYER_DASH_DURATION: 10,
    PLAYER_DASH_COOLDOWN: 60,
    PLAYER_DOUBLE_JUMP_FORCE: -8,
    GRAVITY: 0.5,
    GROUND_HEIGHT_PERCENT: 0.2,
    XP_TO_NEXT_LEVEL_BASE: 80,
    XP_TO_NEXT_LEVEL_MULTIPLIER: 1.15,
    XP_ORB_ATTRACTION_RADIUS: 120,
    POWERUP_DROP_CHANCE: 0.02,
    JOYSTICK_RADIUS: 60,
    JOYSTICK_DEAD_ZONE: 10,
    CAMERA_LERP_FACTOR: 0.05,
    ENEMY_KNOCKBACK_FORCE: 20,
    PLAYER_LANDING_SQUASH_DURATION: 10,
    ORB_HIT_COOLDOWN_FRAMES: 12,
    TEMPORARY_MESSAGE_DURATION: 120,
    SHOOTER_MIN_DISTANCE: 250,
    WORLD_BOUNDS: { width: 2400, height: 1600 }
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
        { desc: "Um orbe sagrado gira ao seu redor.", count: 1, damage: 10, radius: 70, speed: 0.05 },
        { desc: "Adiciona um segundo orbe.", count: 2, damage: 8, radius: 75, speed: 0.05 },
        { desc: "Aumenta o dano dos orbes.", count: 2, damage: 15, radius: 80, speed: 0.05 },
        { desc: "Adiciona um terceiro orbe.", count: 3, damage: 15, radius: 85, speed: 0.06 },
        { desc: "Orbes mais rápidos e fortes.", count: 3, damage: 20, radius: 90, speed: 0.07 }
    ]},
    'vortex': { name: "Vórtice Sagrado", icon: "V", type: 'aura', cooldown: 300, levels: [
        { desc: "Cria um vórtice que puxa inimigos.", radius: 150, duration: 120, force: 1.5, damage: 5 },
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
    'dash': { name: "Carga Astral", icon: "»", type: 'utility', cooldown: 60, levels: [
        { desc: `Realiza uma esquiva rápida na direção do movimento (cooldown: 1s).`, duration: 10, force: 15 }
    ]},
    'double_jump': { name: "Salto Duplo", icon: "▲", type: 'passive', levels: [
        { desc: "Permite um segundo salto no ar.", jumps: 2 }
    ]},
    'celestial_ray': { name: "Raio Celestial", icon: "→", type: 'projectile', cooldown: 90, causesHitStop: true, levels: [
        { desc: "Dispara um raio poderoso na última direção de movimento.", damage: 30, speed: 10, width: 10, length: 150, pierce: 5 }
    ]},
    'static_field': { name: "Campo Estático", icon: "⚡", type: 'aura', cooldown: 300, levels: [
        { desc: "Cria um campo que abranda inimigos em 50%.", radius: 100, duration: 180, slowFactor: 0.5 }
    ]},
    'black_hole': { name: "Buraco Negro", icon: "⚫", type: 'utility', cooldown: 900, levels: [
        { desc: "Invoca um buraco negro que destrói todos os inimigos no ecrã.", damage: 99999 }
    ]},
    'aegis_shield': { name: "Égide Divina", icon: "🛡️", type: 'utility', cooldown: 600, levels: [
        { desc: "Cria um escudo temporário que absorve um golpe.", duration: 300 }
    ]},
    'scorched_earth': { name: "Rastro Ardente", icon: "🔥", type: 'passive', levels: [
        { desc: "Deixa um rasto de chamas enquanto dá um dash, causando dano.", damagePerFrame: 0.5 }
    ]},
    'spectral_blades': {
        name: "Lâminas Espectrais",
        icon: "⚔️",
        type: 'area',
        cooldown: 70,
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
        cooldown: 600,
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
    'celestial_beam': {
        name: "Feixe Celestial",
        icon: "🛰️",
        type: 'projectile',
        cooldown: 200,
        unlocked: false,
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
        baseHealth: 120, // Corrigido para usar CONFIG.PLAYER_HEALTH
        speed: 3, // Corrigido para usar CONFIG.PLAYER_SPEED
        initialSkill: 'divine_lance'
    },
    'CHERUB': {
        name: "Cherub",
        description: "Rápido e ágil, mas mais frágil. Protegido por orbes sagrados.",
        baseHealth: 120 * 0.9,
        speed: 3 * 1.2,
        initialSkill: 'orbital_shield'
    },
    'ARCANGEL': {
        name: "Arcanjo",
        description: "Um ser poderoso que sacrifica velocidade por poder destrutivo em área.",
        baseHealth: 120 * 1.2,
        speed: 3 * 0.85,
        initialSkill: 'vortex'
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
        condition: { type: 'survivalTime', value: 15 * 60 },
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

// --- CONFIGURAÇÃO DE ONDAS ---
const WAVE_CONFIGS = [
    { duration: 30, enemies: [{ type: 'chaser', count: 5, spawnInterval: 60 }], eliteChance: 0 },
    { duration: 45, enemies: [{ type: 'chaser', count: 8, spawnInterval: 50 }, { type: 'speeder', count: 4, spawnInterval: 70 }], eliteChance: 0.01 },
    { duration: 60, enemies: [{ type: 'chaser', count: 10, spawnInterval: 45 }, { type: 'speeder', count: 6, spawnInterval: 60 }, { type: 'tank', count: 3, spawnInterval: 100 }, { type: 'charger', count: 2, spawnInterval: 180 }], eliteChance: 0.02 },
    { duration: 75, enemies: [{ type: 'chaser', count: 12, spawnInterval: 40 }, { type: 'speeder', count: 8, spawnInterval: 50 }, { type: 'tank', count: 4, spawnInterval: 90 }, { type: 'shooter', count: 2, spawnInterval: 120 }], eliteChance: 0.03 },
    { duration: 90, enemies: [{ type: 'chaser', count: 15, spawnInterval: 35 }, { type: 'speeder', count: 10, spawnInterval: 45 }, { type: 'tank', count: 5, spawnInterval: 80 }, { type: 'shooter', count: 3, spawnInterval: 100 }, { type: 'bomber', count: 2, spawnInterval: 150 }], eliteChance: 0.04 },
    { duration: 100, enemies: [{ type: 'chaser', count: 15, spawnInterval: 30 }, { type: 'healer', count: 1, spawnInterval: 200 }, { type: 'tank', count: 5, spawnInterval: 90 }], eliteChance: 0.05 },
    { duration: 110, enemies: [{ type: 'speeder', count: 15, spawnInterval: 30 }, { type: 'summoner', count: 1, spawnInterval: 250 }, { type: 'shooter', count: 4, spawnInterval: 100 }], eliteChance: 0.06 },
];

// --- GERENCIADOR DE EVENTOS GLOBAIS ---
const EVENTS = {
    'meteor_shower': {
        name: "Chuva de Meteoros",
        duration: 30 * 60,
        start: () => {},
        update: () => {
            if (frameCount % 20 === 0) {
                const groundPlatform = platforms.find(p => p.height > 100) || { y: canvas.height * 0.8 };
                const groundY = groundPlatform.y;
                const spawnX = player.x + (Math.random() - 0.5) * canvas.width;
                activeMeteorWarnings.push(getFromPool(meteorWarningPool, spawnX, groundY));
            }
        },
        end: () => {}
    },
    'golden_frenzy': {
        name: "Frenesi Dourado",
        duration: 30 * 60,
        start: () => { isGoldenFrenzyActive = true; },
        update: () => {},
        end: () => { isGoldenFrenzyActive = false; }
    },
    'distortion_zone': {
        name: "Zona de Distorção",
        duration: 60 * 60,
        start: () => {
            CONFIG.GRAVITY /= 2;
            showTemporaryMessage("Gravidade Reduzida!", "magenta");
        },
        update: () => {},
        end: () => {
            CONFIG.GRAVITY = 0.5;
        }
    }
};
