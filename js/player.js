class Player extends Entity {
    constructor(characterId = 'SERAPH') {
        super(0, 0, 22);

        this.spriteRight = assets.loadedImages.playerRight;
        this.spriteLeft = assets.loadedImages.playerLeft;

        const characterData = CHARACTER_DATABASE[characterId];

        const healthUpgradeLevel = playerUpgrades.max_health;
        const damageUpgradeLevel = playerUpgrades.damage_boost;
        const xpUpgradeLevel = playerUpgrades.xp_gain;

        this.baseHealth = characterData.baseHealth + (healthUpgradeLevel > 0 ? PERMANENT_UPGRADES.max_health.levels[healthUpgradeLevel - 1].effect : 0);
        this.damageModifier = 1 + (damageUpgradeLevel > 0 ? PERMANENT_UPGRADES.damage_boost.levels[damageUpgradeLevel - 1].effect : 0);
        this.xpModifier = 1;

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
        this.jumpsAvailable = 1;
        this.isDashing = false;
        this.dashTimer = 0;
        this.dashCooldown = 0;
        this.lastMoveDirection = { x: 1, y: 0 };
        this.squashStretchTimer = 0;
        this.x = canvas.width / 2;
        this.y = canvas.height * (1 - CONFIG.GROUND_HEIGHT_PERCENT) - this.radius;
        this.onGround = true;
        this.shielded = false;
        this.shieldTimer = 0;
        this.invincibilityTimer = 0;
        this.knockbackVelocity = { x: 0, y: 0 };
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
    }

    draw(ctx) {
        if (this.invincibilityTimer > 0 && frameCount % 8 < 4) {
            this.animationFrame++;
            return;
        }

        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);

        const currentSprite = this.facingRight ? this.spriteRight : this.spriteLeft;

        let drawWidth, drawHeight;
        const desiredHeight = this.radius * 2.5;
        if (currentSprite && currentSprite.naturalHeight > 0) {
            const aspectRatio = currentSprite.naturalWidth / currentSprite.naturalHeight;
            drawHeight = desiredHeight;
            drawWidth = drawHeight * aspectRatio;
        } else {
            drawWidth = this.radius * 2;
            drawHeight = this.radius * 2;
        }

        if (this.hitTimer > 0) {
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.fillRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
            ctx.globalCompositeOperation = 'source-over';
            this.hitTimer--;
        }

        ctx.drawImage(
            currentSprite,
            -drawWidth / 2,
            -drawHeight / 2,
            drawWidth,
            drawHeight
        );

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
        if (this.invincibilityTimer > 0) this.invincibilityTimer--;
        if (this.coyoteTimer > 0) this.coyoteTimer--;
        if (this.jumpBufferTimer > 0) this.jumpBufferTimer--;

        this.handleMovement();
        this.applyGravity();
        this.updateSkills();

        if (platforms.length > 0) {
            const groundPlatform = platforms[0];
            const groundTopY = groundPlatform.y;
            if (this.y > groundTopY + 400) {
                this.takeDamage(9999);
            }
        }

        if (this.skills['health_regen']) {
            const regenLevelData = SKILL_DATABASE['health_regen'].levels[this.skills['health_regen'].level - 1];
            this.health = Math.min(this.maxHealth, this.health + regenLevelData.regenPerSecond / 60);
        }

        camera.targetX = this.x - canvas.width / 2;
        camera.targetY = this.y - canvas.height / 2;

        const halfWorldWidth = CONFIG.WORLD_BOUNDS.width / 2;
        this.x = Math.max(-halfWorldWidth + this.radius, Math.min(this.x, halfWorldWidth - this.radius));
    }

    handleMovement() {
        this.moveAndCollide(this.knockbackVelocity.x, this.knockbackVelocity.y);
        this.knockbackVelocity.x *= 0.9;
        this.knockbackVelocity.y *= 0.9;

        if (this.isDashing) {
            this.moveAndCollide(this.dashDirection.x * CONFIG.PLAYER_DASH_FORCE, this.dashDirection.y * CONFIG.PLAYER_DASH_FORCE);
            this.dashTimer--;
            if (this.dashTimer <= 0) {
                this.isDashing = false;
            }
            return;
        }

        let dx = 0;
        let dy_input = 0;
        if (isMobile) {
            dx = movementVector.x;
            dy_input = movementVector.y;
        } else {
            dx = (keys['d'] || keys['ArrowRight']) ? 1 : ((keys['a'] || keys['ArrowLeft']) ? -1 : 0);
            dy_input = (keys['s'] || keys['ArrowDown']) ? 1 : ((keys['w'] || keys['ArrowUp']) ? -1 : 0);
        }

        if (dx !== 0 || dy_input !== 0) {
            const magnitude = Math.hypot(dx, dy_input);
            this.lastMoveDirection = { x: dx / magnitude, y: dy_input / magnitude };
        }
        if (dx !== 0) {
            this.facingRight = dx > 0;
        }
        this.moveAndCollide(dx * this.speed, 0);

        const jumpPressed = isMobile ? (movementVector.y < -0.5) : (keys['w'] || keys['ArrowUp'] || keys[' ']);
        if (jumpPressed) {
            if (this.jumpsAvailable > 0 && (this.onGround || this.coyoteTimer > 0)) {
                this.velocityY = CONFIG.PLAYER_JUMP_FORCE;
                this.jumpsAvailable--;
                this.onGround = false;
                this.coyoteTimer = 0;
                this.jumpBufferTimer = 0;
                if (!isMobile) keys['w'] = keys['ArrowUp'] = keys[' '] = false;
            } else if (this.jumpsAvailable > 0 && !this.onGround && this.skills['double_jump']) {
                this.velocityY = CONFIG.PLAYER_DOUBLE_JUMP_FORCE;
                this.jumpsAvailable--;
            } else {
                this.jumpBufferTimer = 10;
            }
        }

        if (!isMobile && keys['shift']) {
            this.dash();
            keys['shift'] = false;
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

            this.y += stepY;
            let collided = false;
            for (const p of platforms) {
                if (this.x + this.radius > p.x && this.x - this.radius < p.x + p.width && this.y + this.radius > p.y && this.y - this.radius < p.y + p.height) {
                    if (stepY > 0 && (this.y - stepY) + this.radius <= p.y) {
                        this.y = p.y - this.radius;
                        this.velocityY = 0;
                        this.onGround = true;
                        if (!wasOnGround) {
                            this.jumpsAvailable = (this.skills['double_jump'] ? 2 : 1);
                            this.squashStretchTimer = CONFIG.PLAYER_LANDING_SQUASH_DURATION;
                        }
                    }
                    collided = true;
                    break;
                }
            }
            if (!collided) this.onGround = false;
        }
    }

    applyGravity() {
        const wasOnGround = this.onGround;
        this.velocityY += CONFIG.GRAVITY;

        const oldY = this.y;
        let newY = this.y + this.velocityY;

        this.onGround = false;
        let collided = false;

        for (const p of platforms) {
            if (this.x + this.radius > p.x && this.x - this.radius < p.x + p.width &&
                oldY + this.radius <= p.y &&
                newY + this.radius >= p.y) {

                newY = p.y - this.radius;
                this.velocityY = 0;
                this.onGround = true;
                collided = true;

                if (!wasOnGround) {
                    this.jumpsAvailable = (this.skills['double_jump'] ? SKILL_DATABASE['double_jump'].levels[0].jumps : 1);
                    this.squashStretchTimer = CONFIG.PLAYER_LANDING_SQUASH_DURATION;

                    if (this.jumpBufferTimer > 0) {
                        this.velocityY = CONFIG.PLAYER_JUMP_FORCE;
                        this.jumpsAvailable--;
                        this.onGround = false;
                        this.coyoteTimer = 0;
                        this.jumpBufferTimer = 0;
                    }
                }
                break;
            }
        }

        this.y = newY;

        if (wasOnGround && !this.onGround) {
            this.coyoteTimer = 10;
        }

        if (platforms.length > 0) {
            const groundPlatform = platforms[0];
            const groundTopY = groundPlatform.y;
            if (this.y > groundTopY + 200) {
                this.takeDamage(9999);
            }
        }
    }

    dash() {
        if (this.dashCooldown > 0 || this.isDashing) return;

        this.isDashing = true;
        this.dashTimer = CONFIG.PLAYER_DASH_DURATION;
        this.dashCooldown = CONFIG.PLAYER_DASH_COOLDOWN;

        this.dashDirection = { x: this.lastMoveDirection.x, y: this.lastMoveDirection.y };

        if (this.onGround && this.dashDirection.y > 0) {
            this.dashDirection.y = 0;
        }

        if (this.dashDirection.x === 0 && this.dashDirection.y === 0) {
            this.dashDirection.x = this.facingRight ? 1 : -1;
        }

        if (this.skills['scorched_earth']) {
            const damage = SKILL_DATABASE['scorched_earth'].levels[0].damagePerFrame;
            activeVortexes.push(new Vortex(this.x, this.y, { radius: 20, duration: 60, damage: damage, isExplosion: true, force: 0 }));
            for (let i = 0; i < 5; i++) {
                particleManager.createParticle(this.x, this.y, 'orange', 2.5);
            }
        }
    }

    takeDamage(amount, source = null) {
        if (this.isDashing || this.invincibilityTimer > 0) {
            return;
        }

        if (this.shielded) {
            this.shielded = false;
            for(let i=0; i<20; i++) particleManager.createParticle(this.x, this.y, 'cyan', 3);
            return;
        }

        hitStopTimer = 5;
        this.health -= amount;
        this.hitTimer = 30;
        screenShake = { intensity: 5, duration: 15 };
        this.invincibilityTimer = 36;

        if (source) {
            const knockbackForce = 8;
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
        this.xp += amount * this.xpModifier;
        for (let i = 0; i < 4; i++) {
            particleManager.createParticle(this.x, this.y, 'cyan', 2);
        }

        while (this.xp >= this.xpToNextLevel) {
            this.level++;
            this.xp -= this.xpToNextLevel;
            this.xpToNextLevel = Math.floor(this.xpToNextLevel * CONFIG.XP_TO_NEXT_LEVEL_MULTIPLIER);

            const shockwaveParticles = 15;
            for (let i = 0; i < shockwaveParticles; i++) {
                const angle = (i / shockwaveParticles) * Math.PI * 2;
                const particle = getFromPool(particleManager.pool);
                if (particle) {
                    particle.init(this.x, this.y, '#FFD700', 1.5);
                    const speed = 2.5;
                    particle.velocity.x = Math.cos(angle) * speed;
                    particle.velocity.y = Math.sin(angle) * speed;
                    particleManager.activeParticles.push(particle);
                }
            }
            setGameState('levelUp');
        }
    }

    addSkill(skillId) {
        const skillData = SKILL_DATABASE[skillId];
        if (skillData.type === 'utility' && skillData.instant) {
            if (skillId === 'heal') this.health = Math.min(this.maxHealth, this.health + this.maxHealth * 0.25);
            if (skillId === 'black_hole') {
                screenShake = { intensity: 15, duration: 30 };
                enemies.forEach(e => {
                    e.takeDamage(SKILL_DATABASE['black_hole'].levels[0].damage * this.damageModifier);
                    e.applyKnockback(this.x, this.y, CONFIG.ENEMY_KNOCKBACK_FORCE * 5);
                });
                showTemporaryMessage("BURACO NEGRO!", "gold");
            }
            return;
        }

        if (!this.skills[skillId]) {
            this.skills[skillId] = { level: 1, timer: 0, hudElement: null };
            if (skillData.type === 'orbital') {
                this.skills[skillId].orbs = Array.from({ length: skillData.levels[0].count }, (_, i) => ({ angle: (Math.PI * 2 / skillData.levels[0].count) * i, lastHitFrame: 0 }));
            }

            if (skillData.type !== 'passive') {
                const container = document.getElementById('skills-hud');
                const div = document.createElement('div');
                div.className = 'skill-hud-icon';
                div.id = `hud-skill-${skillId}`;
                div.innerHTML = `${skillData.icon}<sub>1</sub>`;
                container.appendChild(div);
                this.skills[skillId].hudElement = div;
            }

        } else {
            this.skills[skillId].level++;
            if (this.skills[skillId].hudElement) {
                this.skills[skillId].hudElement.querySelector('sub').textContent = this.skills[skillId].level;
            }
        }

        if (skillData.type === 'passive') {
            if(skillId === 'magnet') {
                const levelData = skillData.levels[this.skills[skillId].level - 1];
                this.collectRadius = CONFIG.XP_ORB_ATTRACTION_RADIUS * (1 + levelData.collectRadiusBonus);
            }
            if(skillId === 'double_jump') {
                this.jumpsAvailable = SKILL_DATABASE['double_jump'].levels[0].jumps;
            }
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

            if (skillData.type !== 'passive' && skillData.type !== 'orbital') {
                skillState.timer--;
                if(skillState.timer > 0) continue;
            }

            if (skillData.type === 'projectile') {
                if (skillId === 'divine_lance') {
                    const targetEnemy = this.findNearestEnemy();
                    if(targetEnemy) {
                        let angle = Math.atan2(targetEnemy.y - this.y, targetEnemy.x - this.x);
                        for (let i = 0; i < levelData.count; i++) {
                            const spreadAngle = (i - (levelData.count - 1) / 2) * 0.1;
                            const projectileDamage = levelData.damage * this.damageModifier;
                            getFromPool(projectilePool, this.x, this.y, angle + spreadAngle, { ...levelData, damage: projectileDamage }, skillId);
                        }
                        skillState.timer = skillData.cooldown;
                    } else {
                        skillState.timer = 10;
                    }
                } else if (skillId === 'celestial_ray') {
                    const rayAngle = Math.atan2(this.lastMoveDirection.y, this.lastMoveDirection.x);
                    const rayDamage = levelData.damage * this.damageModifier;
                    getFromPool(projectilePool, this.x, this.y, rayAngle, { ...levelData, damage: rayDamage }, skillId);
                    skillState.timer = skillData.cooldown;
                } else if (skillId === 'chain_lightning') {
                    const targetEnemy = this.findNearestEnemy();
                    if (targetEnemy) {
                        chainLightningEffect(this, targetEnemy, levelData);
                        skillState.timer = skillData.cooldown;
                    } else {
                        skillState.timer = 10;
                    }
                } else if (skillId === 'celestial_beam') {
                    const beamAngle = Math.atan2(this.lastMoveDirection.y, this.lastMoveDirection.x);
                    const beamDamage = levelData.damage * this.damageModifier;
                    getFromPool(projectilePool, this.x, this.y, beamAngle, { ...levelData, damage: beamDamage }, skillId);
                    skillState.timer = skillData.cooldown;
                }
            } else if (skillData.type === 'aura' && skillId === 'vortex') {
                const vortexDamage = levelData.damage * this.damageModifier;
                activeVortexes.push(new Vortex(this.x, this.y, { ...levelData, damage: vortexDamage }));
                skillState.timer = skillData.cooldown;
            } else if (skillData.type === 'aura' && skillId === 'particle_burst') {
                enemies.forEach(enemy => {
                    if (Math.hypot(this.x - enemy.x, this.y - enemy.y) < levelData.radius) {
                        enemy.takeDamage(levelData.damage * this.damageModifier);
                        enemy.applyKnockback(this.x, this.y, CONFIG.ENEMY_KNOCKBACK_FORCE * 1.5);
                    }
                });
                for (let i = 0; i < Math.floor(levelData.particleCount / 2); i++) {
                    particleManager.createParticle(this.x, this.y, 'magenta', 3);
                }
                skillState.timer = skillData.cooldown;
            } else if (skillData.type === 'aura' && skillId === 'static_field') {
                activeStaticFields.push(new StaticField(this.x, this.y, levelData));
                skillState.timer = skillData.cooldown;
            } else if (skillId === 'aegis_shield') {
                if (skillState.timer <= 0) {
                    this.shielded = true;
                    this.shieldTimer = levelData.duration;
                    skillState.timer = skillData.cooldown;
                }
                if (this.shieldTimer > 0) {
                    this.shieldTimer--;
                } else {
                    this.shielded = false;
                }
            } else if (skillData.type === 'area' && skillId === 'spectral_blades') {
                const enemiesToHit = [];
                const playerAngle = Math.atan2(this.lastMoveDirection.y, this.lastMoveDirection.x);

                for (const enemy of enemies) {
                    if (enemy.isDead) continue;
                    const dist = Math.hypot(this.x - enemy.x, this.y - enemy.y);
                    if (dist < levelData.range) {
                        const angleToEnemy = Math.atan2(enemy.y - this.y, enemy.x - this.x);
                        let angleDiff = playerAngle - angleToEnemy;
                        while (angleDiff <= -Math.PI) angleDiff += 2 * Math.PI;
                        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                        if (Math.abs(angleDiff) < levelData.arc / 2) {
                            enemiesToHit.push(enemy);
                        }
                    }
                }

                enemiesToHit.sort((a, b) => Math.hypot(this.x - a.x, this.y - a.y) - Math.hypot(this.x - b.x, this.y - b.y));

                let piercedCount = 0;
                for (const enemy of enemiesToHit) {
                    if (piercedCount >= levelData.pierce) break;
                    enemy.takeDamage(levelData.damage * this.damageModifier);
                    enemy.applyKnockback(this.x, this.y, CONFIG.ENEMY_KNOCKBACK_FORCE * 0.5);

                    if (skillState.evolved) {
                        const CHANCE_TO_DROP_HEAL = 0.05;
                        if (Math.random() < CHANCE_TO_DROP_HEAL) {
                            powerUps.push(new PowerUp(enemy.x, enemy.y, 'heal_orb'));
                        }
                    }
                    piercedCount++;
                }

                if (enemiesToHit.length > 0) {
                    createSlashEffect(this.x, this.y, playerAngle, levelData.range, levelData.arc);
                    if (skillData.causesHitStop) {
                        hitStopTimer = 4;
                    }
                }

                skillState.timer = skillData.cooldown;
            } else if (skillId === 'sanctuary') {
                activeSanctuaryZones.push(new SanctuaryZone(this.x, this.y, { ...levelData, evolved: skillState.evolved }));
                skillState.timer = skillData.cooldown;
            }
        }

        Object.keys(this.skills).forEach(skillId => {
            const skillData = SKILL_DATABASE[skillId];
            if (skillData.type === 'orbital') {
                const skillState = this.skills[skillId];
                const levelData = skillData.levels[skillState.level - 1];

                if (!skillState.orbs) {
                     skillState.orbs = [];
                }

                if (skillState.orbs.length !== levelData.count) {
                    skillState.orbs = Array.from({ length: levelData.count }, (_, i) => ({
                        angle: (Math.PI * 2 / levelData.count) * i,
                        lastHitFrame: 0,
                        piercedEnemies: new Set()
                    }));
                }

                skillState.orbs.forEach(orb => {
                    orb.angle += levelData.speed;
                    const orbX = this.x + Math.cos(orb.angle) * levelData.radius;
                    const orbY = this.y + Math.sin(orb.angle) * levelData.radius;

                    const orbSearchRadius = 15 + 20;
                    const orbSearchArea = new Rectangle(orbX - orbSearchRadius, orbY - orbSearchRadius, orbSearchRadius * 2, orbSearchRadius * 2);
                    const nearbyEnemiesForOrb = qtree.query(orbSearchArea);

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
                                }

                                if (skillState.evolved) {
                                    if (skillId === 'orbital_shield') {
                                        enemy.applySlow(120);
                                    } else if (skillId === 'celestial_hammer') {
                                        const explosionData = {
                                            radius: 40,
                                            duration: 20,
                                            damage: levelData.damage * 0.25,
                                            isExplosion: true,
                                            force: 0
                                        };
                                        activeVortexes.push(new Vortex(enemy.x, enemy.y, explosionData));
                                    }
                                }
                            }
                        }
                    });
                    if (hitThisFrame && skillData.causesHitStop) {
                        hitStopTimer = 2;
                    }
                });
            }
        });
    }

    findNearestEnemy() {
        let nearest = null;
        let nearestDistSq = Infinity;

        const searchRadius = 2000;
        const searchArea = new Rectangle(
            this.x - searchRadius,
            this.y - searchRadius,
            searchRadius * 2,
            searchRadius * 2
        );

        const candidates = qtree.query(searchArea);

        for (const enemy of candidates) {
            const dx = this.x - enemy.x;
            const dy = this.y - enemy.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < nearestDistSq) {
                nearestDistSq = distSq;
                nearest = enemy;
            }
        }
        return nearest;
    }

    recalculateStatModifiers() {
        const xpUpgradeLevel = playerUpgrades.xp_gain;
        this.xpModifier = 1 + (xpUpgradeLevel > 0 ? PERMANENT_UPGRADES.xp_gain.levels[xpUpgradeLevel - 1].effect : 0);

        if (this.skills['celestial_pact']) {
            const level = this.skills['celestial_pact'].level;
            const levelData = SKILL_DATABASE['celestial_pact'].levels[level - 1];
            this.xpModifier += levelData.xpBonus;
        }
    }
}
