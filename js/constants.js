export const CONFIG = {
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
    WORLD_BOUNDS: { width: 2400, height: 1600 } // Arena Fechada
};
