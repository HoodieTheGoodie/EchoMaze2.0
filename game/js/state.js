// state.js - Game state management

import { generateMaze, CELL } from './maze.js';
import { getDefaultLevelConfig, isGodMode, BOSS_AMMO_STATION_COOLDOWN, isBazookaMode } from './config.js';
import { updateBoss, pickBazooka, bossExplosion, fireRocketAt, damageCoreAt, loadPrepRoom, spawnBossArena } from './boss.js';
import { stopPreBossMusic } from './audio.js';
import { playSkillSpawn, playSkillSuccess, playSkillFail, playPigTelegraph, playPigDash, playShieldUp, playShieldReflect, playShieldBreak, playShieldRecharge, playPigHit, playChaserTelegraph, playChaserJump, playStep, playSeekerAlert, playSeekerBeep, playZapPlace, playZapTrigger, playZapExpire, playBatterRage, playBatterFlee, playShieldHum, playShieldShatter, playMortarWarning, playMortarFire, playMortarExplosion, playMortarSelfDestruct, playEnemyHit, playWallHit, playExplosion } from './audio.js';
import { particles } from './particles.js';
import { CELL_SIZE } from './renderer.js';

export const MAZE_WIDTH = 30;
export const MAZE_HEIGHT = 30;

function canSeePlayerFromEntity(e) {
    // Determine facing direction: prefer current target direction, then roamDir, otherwise none
    let fx = 0, fy = 0;
    if (e.target) {
        fx = e.target.x - Math.floor(e.fx + 0.5);
        fy = e.target.y - Math.floor(e.fy + 0.5);
    } else if (e.roamDir) {
        fx = e.roamDir.dx; fy = e.roamDir.dy;
    } else {
        return false;
    }
    // Normalize to axis direction
    if (Math.abs(fx) > Math.abs(fy)) { fx = fx > 0 ? 1 : -1; fy = 0; }
    else if (Math.abs(fy) > Math.abs(fx)) { fy = fy > 0 ? 1 : -1; fx = 0; }
    else if (fx === 0 && fy === 0) return false;

    const sx = Math.floor(e.fx);
    const sy = Math.floor(e.fy);
    let tx = sx + fx;
    let ty = sy + fy;
    const maxRange = e.detectRange || 7;
    let steps = 0;
    while (tx > 0 && tx < MAZE_WIDTH - 1 && ty > 0 && ty < MAZE_HEIGHT - 1) {
        if (gameState.maze[ty][tx] === CELL.WALL) return false;
        if (tx === gameState.player.x && ty === gameState.player.y) return true;
        steps++;
        if (steps >= maxRange) return false;
        tx += fx; ty += fy;
    }
    return false;
}

// Global mutable game state container
export const gameState = {
    mode: 'level',
    currentLevel: 1,
    difficulty: 'normal',
    player: { x: 1, y: 1 },
    lives: 3,
    stamina: 100,
    statusMessage: '',
    isPaused: false
};

// Screen fade helper used for transitions (fade overlay alpha ramp)
gameState.screenFade = null; // { from, to, startAt, duration }
gameState.inputLocked = false; // used for brief cutscenes
gameState.prepPickupLocked = false; // prevent bazooka pickup before lore completes

/**
 * Disable or destroy all active enemies from the current level.
 */
export function disableAllEnemies() {
    try {
        if (gameState.enemies && gameState.enemies.length) {
            for (const e of gameState.enemies) {
                try { if (typeof e.destroy === 'function') e.destroy(); } catch {}
                e.active = false;
            }
        }
        // Remove all enemies entirely to avoid leftover AI ticks
        gameState.enemies = [];
        // Clear projectiles to avoid old rockets/minions lingering
        gameState.projectiles = [];
    } catch (err) {
        console.error('disableAllEnemies error', err);
    }
}

// Fade helpers
export function fadeToBlack(seconds = 1.0) {
    const now = performance.now();
    gameState.screenFade = { from: 0, to: 1, startAt: now, duration: Math.max(1, seconds * 1000) };
}
export function fadeFromBlack(seconds = 1.0) {
    const now = performance.now();
    gameState.screenFade = { from: 1, to: 0, startAt: now, duration: Math.max(1, seconds * 1000) };
}

// Simple dialogue helper that sequences status messages
export function showTextSequence(lines, callback, intervalMs = 2500) {
    if (!Array.isArray(lines) || !lines.length) { if (callback) callback(); return; }
    let idx = 0; setStatusMessage(String(lines[0]), intervalMs);
    const id = setInterval(() => {
        idx++;
        if (idx < lines.length) {
            setStatusMessage(String(lines[idx]), intervalMs);
        } else {
            clearInterval(id);
            gameState.textSequenceIntervalId = null;
            setStatusMessage('', 1);
            if (typeof callback === 'function') callback();
        }
    }, intervalMs);
    gameState.textSequenceIntervalId = id;
    gameState.textSequenceCallback = callback;
}

export function skipTextSequence() {
    if (gameState.textSequenceIntervalId) {
        clearInterval(gameState.textSequenceIntervalId);
        gameState.textSequenceIntervalId = null;
        setStatusMessage('', 1);
        if (typeof gameState.textSequenceCallback === 'function') {
            gameState.textSequenceCallback();
            gameState.textSequenceCallback = null;
        }
    }
}

export function disablePlayerInput() { gameState.inputLocked = true; }
export function enablePlayerInput() { gameState.inputLocked = false; }

// Enemy thaw-in duration after pauses/generator UI (ms)
export const ENEMY_THAW_TIME = 2000;

// Teleport pad timings (ms)
export const TELEPORT_CHARGE_TIME = 1000;
export const TELEPORT_COOLDOWN_TIME = 1800;
// Enemy-controlled teleports (Mortar) use a longer cooldown to avoid spam
export const ENEMY_TELEPORT_COOLDOWN_TIME = 15000;

// Skill check sequence configuration
export const SKILL_CHECKS = [
    { time: 5000, windowSize: 60, rotationTime: 2000 },
    { time: 11000, windowSize: 40, rotationTime: 1600 },
    { time: 17000, windowSize: 25, rotationTime: 1300 }
];

export const GENERATOR_TOTAL_TIME = 20000;
// Default rotation time (kept for compatibility; each check now carries its own)
export const SKILL_CHECK_ROTATION_TIME = 2000;
export const STAMINA_COOLDOWN_TIME = 10000;
export const COLLISION_SHIELD_RECHARGE_TIME = 15000; // ms
export const COLLISION_SHIELD_BREAK_FLASH = 220; // ms
// Ensure skill window never starts in the first N degrees and never wraps across 0°
export const SKILL_WINDOW_MIN_START = 90; // degrees

export function initGame() {
    // Level/meta
    gameState.godMode = isGodMode();
    // Clear any boss/bazooka-specific carryover when starting a fresh level
    gameState.boss = null;
    gameState.bazooka = null;
    gameState.bazookaPickup = null;
    gameState.reloadPressedAt = 0;
    gameState.interactPressedAt = 0;
    gameState.mountedPigUntil = 0;
    gameState.mountedPigId = null;
    
    // Clear any active dialog sequences (fixes prep room dialog carryover bug)
    if (gameState.textSequenceIntervalId) {
        clearInterval(gameState.textSequenceIntervalId);
        gameState.textSequenceIntervalId = null;
        gameState.textSequenceCallback = null;
    }
    gameState.prepPickupLocked = false;
    let seed = 1;
    let genCount = 3;
    if (gameState.mode === 'endless') {
        // Build a config from endless settings; use a fresh random seed each run
    const cfg = gameState.endlessConfig || { chaser: false, pig: false, seeker: false, batter: false, mortar: false, difficulty: 'normal', generatorCount: 3 };
        gameState.difficulty = cfg.difficulty === 'super' ? 'super' : 'normal';
        genCount = cfg.generatorCount === 5 ? 5 : 3;
        seed = (Date.now() ^ Math.floor(Math.random() * 0xFFFFFFFF)) >>> 0;
    gameState.levelConfig = { generatorCount: genCount, enemyEnabled: !!cfg.chaser, flyingPig: !!cfg.pig, seeker: !!cfg.seeker, batter: !!cfg.batter, mortar: !!cfg.mortar, seed };
    } else {
        if (!gameState.currentLevel) gameState.currentLevel = 1;
        gameState.levelConfig = getDefaultLevelConfig(gameState.currentLevel);
        seed = gameState.levelConfig.seed || 1;
        genCount = gameState.levelConfig.generatorCount || 3;
        gameState.difficulty = 'normal';
    }
    const includeTelepads = (gameState.mode === 'endless') || (gameState.currentLevel >= 5);
    const mazeData = generateMaze(seed, genCount, includeTelepads);
    gameState.maze = mazeData.grid;
    gameState.generators = mazeData.generators;
    gameState.teleportPads = (mazeData.telepads || []).map((p, idx) => ({ ...p, id: idx, pair: idx === 0 ? 1 : 0 }));
    // Zap traps reset
    gameState.zapTraps = 0;
    gameState.traps = [];
    gameState.player = { x: 1, y: 1 };
    gameState.lives = 3;
    gameState.stamina = 100;
    gameState.gameStatus = 'playing';
    gameState.isSprinting = false;
    gameState.isJumpCharging = false;
    gameState.jumpCountdown = 0;
    gameState.isStaminaCoolingDown = false;
    gameState.isGeneratorUIOpen = false;
    gameState.activeGeneratorIndex = null;
    gameState.statusMessage = '';
    gameState.completedSkillChecks = [];
    gameState.triggeredSkillChecks = [];
    gameState.skillCheckState = null;
    gameState.skillCheckFlash = null;
    gameState.isPaused = false;
    // Projectiles reset
    gameState.projectiles = [];
    // Collision Shield state
    gameState.collisionShieldState = 'active'; // 'active' | 'recharging'
    gameState.collisionShieldRechargeEnd = 0;
    gameState.collisionShieldBrokenUntil = 0;
    gameState.collisionShieldHoldStart = 0;
    // Shield (blocking) rework state
    gameState.shieldBrokenLock = false; // cannot re-activate until stamina is full after a break
    gameState.shieldParticles = [];
    gameState.screenShakeUntil = 0;
    gameState.screenShakeMag = 0;
    // Movement lock is now implicit: player cannot move while shield is active
    // Reset speedrun timer per fresh level
    gameState.runActive = false;
    gameState.runStartAt = 0;
    gameState.runTimeMs = 0;
    // Enemies
    gameState.enemies = [];
    gameState.enemiesFrozenUntil = 0;
    gameState.playerInvincibleUntil = 0;
    
    if (gameState.levelConfig.enemyEnabled) {
        spawnInitialEnemy();
    }
    if (gameState.levelConfig.flyingPig) {
        spawnFlyingPig();
    }
    if (gameState.levelConfig.seeker) {
        spawnSeeker();
    }
    if (gameState.levelConfig.batter) {
        spawnBatter();
    }
    if (gameState.levelConfig.mortar) {
        spawnMortar();
    }
    // Player stun state
    gameState.playerStunned = false;
    gameState.playerStunUntil = 0;
    // Apply a brief thaw period on level start
    gameState.enemiesThawUntil = performance.now() + ENEMY_THAW_TIME;

    // SECRET: Bazooka Mode (regenerating ammo cheat)
    if (isBazookaMode()) {
        gameState.bazooka = { 
            has: true, 
            ammo: 15, 
            maxAmmo: 15,
            lastRegenTime: performance.now()
        };
        // Track wall health for bazooka mode
        gameState.wallHealth = {};
    }
}

export function triggerEnemiesThaw(currentTime) {
    gameState.enemiesThawUntil = currentTime + ENEMY_THAW_TIME;
}

// Utility: clamp to maze interior
function clampToMaze(x, y) {
    return {
        x: Math.max(1, Math.min(MAZE_WIDTH - 2, x)),
        y: Math.max(1, Math.min(MAZE_HEIGHT - 2, y))
    };
}

// --- Zap Trap placement ---
export function placeZapTrap(currentTime) {
    // Only available in level 2+ or Endless
    if (gameState.mode !== 'endless' && (!gameState.currentLevel || gameState.currentLevel < 2)) {
        setStatusMessage('Zap Traps unlock starting at Level 2.');
        return false;
    }
    if (gameState.gameStatus !== 'playing' || gameState.isPaused || gameState.isGeneratorUIOpen) return false;
    if (!gameState.zapTraps || gameState.zapTraps <= 0) {
        setStatusMessage('No Zap Traps available. Complete generators to earn more.');
        return false;
    }
    const x = gameState.player.x;
    const y = gameState.player.y;
    const cell = gameState.maze[y][x];
    // Place only on EMPTY tiles (not walls/generators/telepads). Allow EXIT to keep simple? We'll stick to EMPTY.
    if (cell !== CELL.EMPTY) {
        setStatusMessage('You can only place a trap on empty ground.');
        return false;
    }
    // One trap per tile at a time
    if (gameState.traps.some(t => !t.triggered && t.x === x && t.y === y)) {
        setStatusMessage('There is already a trap here.');
        return false;
    }
    // Place trap
    const trap = { x, y, placedAt: currentTime, expiresAt: currentTime + 10000, triggered: false, flashUntil: 0 };
    gameState.traps.push(trap);
    gameState.zapTraps -= 1;
    try { playZapPlace(); } catch {}
    setStatusMessage('Zap Trap placed (10s).');
    return true;
}

export function updateTeleportPads(currentTime) {
    if (!gameState.teleportPads || gameState.teleportPads.length < 2) return;
    if (gameState.gameStatus !== 'playing' || gameState.isGeneratorUIOpen) return;
    const pads = gameState.teleportPads;
    // Find if player is on a pad
    for (let i = 0; i < pads.length; i++) {
        const pad = pads[i];
        const onPad = (gameState.player.x === pad.x && gameState.player.y === pad.y);
        // Reset charge if not standing on it
        if (!onPad) {
            pad.chargeStartAt = 0;
            continue;
        }
        // If cooling down, cannot charge
        if (currentTime < pad.cooldownUntil) {
            pad.chargeStartAt = 0;
            continue;
        }
        // Start or continue charge
        if (!pad.chargeStartAt) pad.chargeStartAt = currentTime;
        const elapsed = currentTime - pad.chargeStartAt;
        if (elapsed >= TELEPORT_CHARGE_TIME) {
            // Teleport to the paired pad
            const dest = pads[pad.pair] || null;
            if (dest) {
                gameState.player.x = dest.x;
                gameState.player.y = dest.y;
                // Put both pads on cooldown to avoid instant bounce
                pad.cooldownUntil = currentTime + TELEPORT_COOLDOWN_TIME;
                dest.cooldownUntil = currentTime + TELEPORT_COOLDOWN_TIME;
                // Reset charges
                pad.chargeStartAt = 0;
                dest.chargeStartAt = 0;
                // Small freeze for feedback (optional): none for now
            }
        }
    }
}

export function setStatusMessage(message, duration = 4000) {
    gameState.statusMessage = message;
    
    if (gameState.statusMessageTimeout) {
        clearTimeout(gameState.statusMessageTimeout);
    }
    
    gameState.statusMessageTimeout = setTimeout(() => {
        gameState.statusMessage = '';
    }, duration);
}

// --- Collision Shield: automatic wall-collision protection with recharge ---
export function updateCollisionShield(currentTime) {
    // Pause recharge timer while not actively playing or in UI/paused
    let paused = gameState.isPaused || gameState.isGeneratorUIOpen || gameState.gameStatus !== 'playing';
    // Also pause while teleport is charging on a pad the player is standing on
    if (!paused && Array.isArray(gameState.teleportPads) && gameState.teleportPads.length) {
        for (const pad of gameState.teleportPads) {
            if (pad.x === gameState.player.x && pad.y === gameState.player.y && pad.chargeStartAt) {
                paused = true; break;
            }
        }
    }
    if (gameState.collisionShieldState === 'recharging') {
        if (paused) {
            if (!gameState.collisionShieldHoldStart) gameState.collisionShieldHoldStart = currentTime;
        } else if (gameState.collisionShieldHoldStart) {
            const delta = currentTime - gameState.collisionShieldHoldStart;
            gameState.collisionShieldHoldStart = 0;
            gameState.collisionShieldRechargeEnd += delta; // push end into future to pause
        }
        if (!paused && currentTime >= gameState.collisionShieldRechargeEnd) {
            gameState.collisionShieldState = 'active';
            gameState.collisionShieldBrokenUntil = 0;
            gameState.collisionShieldHoldStart = 0;
            try { playShieldRecharge(); } catch {}
        }
    }
}

// --- Seeker alert system ---
function addSeekerAlert(x, y, currentTime, duration = 5000) {
    if (!gameState.enemies) return;
    for (const e of gameState.enemies) {
        if (e.type === 'seeker') {
            e.alertTarget = { x, y };
            e.alertUntil = Math.max(e.alertUntil || 0, currentTime + duration);
            e._alertDist = null; // force recompute
        }
    }
}

// Loud noise event: cause Batter to immediately enter rage regardless of distance
function addBatterNoiseRage(currentTime, duration = 3000) {
    if (!gameState.enemies) return;
    for (const e of gameState.enemies) {
        if (e.type === 'batter') {
            if (e._zapStunUntil && currentTime < e._zapStunUntil) continue; // ignore while zapped
            e.state = 'rage';
            e.rageStartAt = currentTime;
            e.rageUntil = currentTime + duration;
            e.target = null;
            e.lastPathAt = 0;
            try { playBatterRage(); } catch {}
        }
    }
}

export function movePlayer(dx, dy, currentTime) {
    if (gameState.gameStatus !== 'playing' || gameState.isGeneratorUIOpen) {
        return false;
    }

    // While shield is active, player cannot move; movement re-enables when the shield ends or breaks
    if (gameState.blockActive) return false;

    // Check if stun has expired
    if (gameState.playerStunned && currentTime >= gameState.playerStunUntil) {
        gameState.playerStunned = false;
        setStatusMessage('Stun wore off!');
    }

    // Block movement while stunned
    if (gameState.playerStunned) {
        return false;
    }
    
    const sprintActive = gameState.isSprinting && !gameState.isStaminaCoolingDown && gameState.stamina >= 100;
    // If boss finale: start lava collapse only on first movement after monologue finished and before collapseStartAt set
    if (gameState.boss && gameState.boss.defeated && gameState.boss.virusDialogueFinished && !gameState.boss.collapseStartAt) {
        gameState.boss.collapseStartAt = currentTime; // start collapse now
        gameState.boss.collapseRateMs = 2000; // 2s per ring per request
    }
    const mountedActive = !!(gameState.mountedPigUntil && currentTime < gameState.mountedPigUntil);
    const steps = sprintActive ? 2 : 1;
    
    let targetX = gameState.player.x;
    let targetY = gameState.player.y;
    let collision = false;
    let hitGenerator = false;
    let exitBlocked = false;
    
    for (let step = 1; step <= steps; step++) {
        const nextX = gameState.player.x + dx * step;
        const nextY = gameState.player.y + dy * step;
        
        if (nextX < 0 || nextX >= MAZE_WIDTH || nextY < 0 || nextY >= MAZE_HEIGHT) {
            collision = true;
            break;
        }
        
        const cellType = gameState.maze[nextY][nextX];
        // Lava hazard on outer ring during boss phase 2 anti-camping
        if (gameState.boss && gameState.boss.lavaActiveUntil && currentTime < gameState.boss.lavaActiveUntil) {
            const onEdgeNext = (nextX === 1 || nextX === MAZE_WIDTH - 2 || nextY === 1 || nextY === MAZE_HEIGHT - 2);
            if (onEdgeNext) {
                // Block movement and apply brief damage throttle similar to wall
                if (currentTime - (gameState.lastLavaHitTime || 0) > 600) {
                    gameState.lastLavaHitTime = currentTime;
                    if (!gameState.godMode) {
                        gameState.lives--;
                        gameState.playerInvincibleUntil = currentTime + 1200;
                        setStatusMessage('LAVA! Stay away from the outer ring!', 1000);
                        if (gameState.lives <= 0) { gameState.deathCause = 'lava'; gameState.gameStatus = 'lost'; }
                    }
                }
                return false;
            }
        }
        // Post-defeat collapsing lava hazard: rings from edges inward
        if (gameState.boss && gameState.boss.defeated && gameState.boss.collapseStartAt) {
            const rate = Math.max(50, gameState.boss.collapseRateMs || 400);
            const elapsed = currentTime - gameState.boss.collapseStartAt;
            const ringsCovered = Math.max(0, Math.floor(elapsed / rate));
            if (ringsCovered > 0) {
                const ring = Math.min(nextX, MAZE_WIDTH - 1 - nextX, nextY, MAZE_HEIGHT - 1 - nextY);
                if (ring <= ringsCovered) {
                    if (currentTime - (gameState.lastLavaHitTime || 0) > 600) {
                        gameState.lastLavaHitTime = currentTime;
                        if (!gameState.godMode) {
                            gameState.lives--;
                            gameState.playerInvincibleUntil = currentTime + 1200;
                            setStatusMessage('LAVA IS CLOSING IN!', 1000);
                            if (gameState.lives <= 0) { gameState.deathCause = 'lava'; gameState.gameStatus = 'lost'; }
                        }
                    }
                    return false;
                }
            }
        }
        
        if (cellType === CELL.GENERATOR) {
            collision = true;
            hitGenerator = true;
            break;
        }
        
        // While mounted, ignore walls entirely
        if (cellType === CELL.WALL && !sprintActive && !mountedActive) {
            collision = true;
            break;
        }
        if (cellType === CELL.WALL && (sprintActive && !mountedActive)) {
            continue;
        }
        
        targetX = nextX;
        targetY = nextY;
        
        if (cellType === CELL.EXIT) {
            const incomplete = gameState.generators.some(g => !g.completed);
            if (incomplete) {
                collision = true;
                exitBlocked = true;
                break;
            }
            
            // Freeze all enemies when touching exit (but not during boss fight)
            if (gameState.currentLevel !== 10) {
                gameState.enemiesFrozenUntil = Infinity;
            }
            
            // Level 10 boss override
            if (gameState.currentLevel === 10) {
                // If in prep room and stepping through door -> fade out then spawn arena
                if (gameState.boss && gameState.boss.prepRoom) {
                    fadeToBlack(1.0);
                    setTimeout(() => { try { stopPreBossMusic(); } catch {};
                        try { spawnBossArena(Date.now()); } catch {}
                        try { fadeFromBlack(1.0); } catch {}
                    }, 1000);
                    return true;
                }
                // If boss has been defeated, this is the victory exit - special boss victory sequence
                if (gameState.boss && gameState.boss.defeated) {
                    // Freeze everything
                    gameState.enemiesFrozenUntil = Infinity;
                    gameState.runActive = false; // Stop timer
                    
                    // Mark as boss victory for special handling
                    gameState.bossVictory = true;
                    
                    // Fade to black over 2 seconds
                    fadeToBlack(2.0);
                    
                    // After fade completes, trigger boss victory overlay
                    setTimeout(() => {
                        try { finishRun(performance.now()); } catch {}
                        gameState.gameStatus = 'won';
                    }, 2000);
                    return true;
                }
                // Otherwise, reaching exit in L10 starts the pre-boss flow
                if (!gameState.boss?.active) {
                    startBossTransition(currentTime);
                    return true;
                }
            }
            
            // Add fade to black transition before win screen
            finishRun(currentTime);
            fadeToBlack(1.0);
            setTimeout(() => {
                gameState.gameStatus = 'won';
            }, 1000);
            return true;
        }
    }
    
    if (collision || (targetX === gameState.player.x && targetY === gameState.player.y)) {
        if (!sprintActive && !hitGenerator && !exitBlocked) {
            // Alert Seeker to player's general area on wall bonk
            addSeekerAlert(gameState.player.x, gameState.player.y, currentTime, 4000);
            // Collision Shield: absorb first wall hit if active
            if (gameState.collisionShieldState === 'active') {
                gameState.collisionShieldState = 'recharging';
                gameState.collisionShieldBrokenUntil = currentTime + COLLISION_SHIELD_BREAK_FLASH;
                gameState.collisionShieldRechargeEnd = currentTime + COLLISION_SHIELD_RECHARGE_TIME;
                gameState.collisionShieldHoldStart = 0;
                try { playShieldBreak(); } catch {}
                // VISUAL POLISH: Shield shatter particles
                const px = (gameState.player.x + 0.5) * CELL_SIZE;
                const py = (gameState.player.y + 0.5) * CELL_SIZE;
                particles.spawnShieldShatter(px, py);
            } else {
                // Life penalty unless in god mode, throttle by 500ms
                if (currentTime - (gameState.lastCollisionTime || 0) > 500) {
                    gameState.lastCollisionTime = currentTime;
                    if (!gameState.godMode) {
                        if (gameState.lives > 1) {
                            // More than 1 life: normal wall collision damage
                            gameState.lives--;
                        } else if (gameState.lives === 1) {
                            // At 1 life: First wall hit stuns for 3s (insurance)
                            if (!gameState.wallStunInsuranceUsed) {
                                gameState.playerStunned = true;
                                gameState.playerStunUntil = currentTime + 3000;
                                gameState.playerStunStart = currentTime;
                                gameState.wallStunInsuranceUsed = true;
                                setStatusMessage('STUNNED for 3s! Last chance!', 3000);
                            } else {
                                // Insurance already used: die on next wall hit
                                gameState.lives = 0;
                                gameState.deathCause = 'wall';
                                gameState.gameStatus = 'lost';
                            }
                        }
                    }
                    // Play wall hit sound and spawn dust particles
                    try { playWallHit(); } catch {}
                    const px = (gameState.player.x + 0.5) * CELL_SIZE;
                    const py = (gameState.player.y + 0.5) * CELL_SIZE;
                    particles.spawn('wallHit', px, py, 8);
                }
            }
        }
        
        if (exitBlocked) {
            setStatusMessage('Exit locked! Repair all generators first.');
        } else if (hitGenerator) {
            setStatusMessage('Press E next to a generator to repair it.');
        }
        
        return false;
    }
    
    // Start timer on first successful movement
    if (!gameState.runActive) {
        gameState.runActive = true;
        gameState.runStartAt = currentTime;
    }
    gameState.player.x = targetX;
    gameState.player.y = targetY;
    // Throttled step sound for movement feedback (respect movementAudio setting)
    if (!gameState._lastStepAt || currentTime - gameState._lastStepAt > 120) {
        if (!gameState.settings || gameState.settings.movementAudio !== false) {
            try { playStep(); } catch {}
        }
        gameState._lastStepAt = currentTime;
    }
    
    if (sprintActive) {
        triggerStaminaCooldown(currentTime);
        gameState.isSprinting = false;
    }
    
    return true;
}

export async function performJump(dx, dy, currentTime) {
    if (!gameState.isJumpCharging) return false;
    
    const landingX = gameState.player.x + dx * 2;
    const landingY = gameState.player.y + dy * 2;
    
    if (landingX < 0 || landingX >= MAZE_WIDTH || landingY < 0 || landingY >= MAZE_HEIGHT) {
        cancelJumpCharge();
        return false;
    }
    
    const landingCell = gameState.maze[landingY][landingX];
    
    if (landingCell === CELL.WALL || landingCell === CELL.GENERATOR) {
        cancelJumpCharge();
        return false;
    }
    
    // Start timer on first successful jump landing
    if (!gameState.runActive) {
        gameState.runActive = true;
        gameState.runStartAt = currentTime;
    }

    if (landingCell === CELL.EXIT) {
        const incomplete = gameState.generators.some(g => !g.completed);
        if (incomplete) {
            setStatusMessage('Exit locked! Repair all generators first.');
            cancelJumpCharge();
            return false;
        }
        
        // Freeze all enemies when touching exit (but not during boss fight)
        if (gameState.currentLevel !== 10) {
            gameState.enemiesFrozenUntil = Infinity;
        }
        
        if (gameState.currentLevel === 10) {
            cancelJumpCharge();
            if (gameState.boss && gameState.boss.prepRoom) {
                fadeToBlack(1.0);
                setTimeout(() => { try { stopPreBossMusic(); } catch {}; try { spawnBossArena(Date.now()); } catch {}; try { fadeFromBlack(1.0); } catch {} }, 1000);
                return true;
            }
            if (!gameState.boss?.active) {
                startBossTransition(currentTime);
                return true;
            }
        }
        
        // Add fade to black transition before win screen
        finishRun(currentTime);
        fadeToBlack(1.0);
        setTimeout(() => {
            gameState.gameStatus = 'won';
        }, 1000);
        cancelJumpCharge();
        return true;
    }
    
    // Store jump animation data BEFORE changing position
    gameState.jumpAnimation = {
        active: true,
        startX: gameState.player.x,
        startY: gameState.player.y,
        endX: landingX,
        endY: landingY,
        startTime: currentTime,
        duration: 200 // 200ms animation (fast but visible)
    };
    
    // Create lightning particles for wall jump effect
    const { addElectricParticles } = await import('./particles.js');
    addElectricParticles(gameState.player.x, gameState.player.y, landingX, landingY);
    
    // VISUAL POLISH: Dash afterimages along the path
    const startPx = (gameState.player.x + 0.5) * CELL_SIZE;
    const startPy = (gameState.player.y + 0.5) * CELL_SIZE;
    particles.spawnDashAfterimage(startPx, startPy, { dx, dy });
    
    // VISUAL POLISH: Landing shockwave at destination
    const landPx = (landingX + 0.5) * CELL_SIZE;
    const landPy = (landingY + 0.5) * CELL_SIZE;
    setTimeout(() => {
        particles.spawnLandingShockwave(landPx, landPy);
    }, 200); // Spawn when landing completes
    
    // Play electric zap sound
    try {
        const { playWallJump } = await import('./audio.js');
        playWallJump();
    } catch {}
    
    gameState.player.x = landingX;
    gameState.player.y = landingY;
    
    cancelJumpCharge();
    if (!gameState.isStaminaCoolingDown) {
        triggerStaminaCooldown(currentTime);
    }
    
    return true;
}

export function startJumpCharge(currentTime) {
    if (gameState.gameStatus !== 'playing' ||
        gameState.isJumpCharging ||
        gameState.stamina < 100 ||
        gameState.isStaminaCoolingDown ||
        gameState.isGeneratorUIOpen ||
        gameState.playerStunned) {
        return;
    }
    
    gameState.isJumpCharging = true;
    gameState.jumpCountdown = 2;
    gameState.jumpChargeStartTime = currentTime;
    gameState.isSprinting = false;
}

export function cancelJumpCharge() {
    gameState.isJumpCharging = false;
    gameState.jumpCountdown = 0;
}

/**
 * Begin the boss transition: clear enemies, fade to black, then load the prep room.
 */
export function startBossTransition(currentTime) {
    // Disable any existing enemies/projectiles immediately
    disableAllEnemies();
    // Start a 1s fade to black (renderer will draw overlay when gameState.screenFade present)
    gameState.screenFade = { from: 0, to: 1, startAt: currentTime, duration: 1000 };
    // After fade completes, load the prep room (use real time scheduling)
    setTimeout(() => {
        try {
            // ensure boss module provides loadPrepRoom
            if (typeof loadPrepRoom === 'function') {
                loadPrepRoom(Date.now());
            }
        } catch (err) { console.error('loadPrepRoom failed', err); }
    }, 1000);
}

// Camera shake helpers
export function triggerScreenShake(mag = 4, durationMs = 150, now = performance.now()) {
    gameState.screenShakeMag = mag;
    gameState.screenShakeUntil = now + durationMs;
}
export function clearScreenShake() {
    gameState.screenShakeMag = 0;
    gameState.screenShakeUntil = 0;
}

// Top-bar lore and prompt helpers
export function showTopLore(lines, done) {
    console.log('[lore] showing', lines);
    gameState.prepPickupLocked = true;
    showTextSequence(lines, () => {
        console.log('[lore] finished');
        if (typeof done === 'function') done();
    });
}
export function showPrompt(text = 'Press E to pick up', duration = 2500) {
    console.log('[prompt]', text);
    setStatusMessage(text, duration);
}

export function updateJumpCharge(currentTime) {
    if (!gameState.isJumpCharging) return;
    
    const elapsed = currentTime - gameState.jumpChargeStartTime;
    gameState.jumpCountdown = Math.max(0, 2 - elapsed / 1000);
    
    if (gameState.jumpCountdown <= 0) {
        cancelJumpCharge();
    }
}

export function triggerStaminaCooldown(currentTime) {
    gameState.stamina = 0;
    gameState.isStaminaCoolingDown = true;
    gameState.staminaCooldownEnd = currentTime + STAMINA_COOLDOWN_TIME;
    // Open a brief dodge window for special attacks
    gameState.dodgeWindowUntil = Math.max(gameState.dodgeWindowUntil, currentTime + 400);
}

// --- Blocking (Space): 3s directional shield, aimable with WASD/Arrows ---
// --- Shield (Blocking) rework ---
export const BLOCK_MAX_DURATION_MS = 2000; // full stamina lasts 2s
export const BLOCK_DURABILITY = 1.0; // simple durability threshold

export function startBlock(currentTime) {
    if (gameState.gameStatus !== 'playing' || gameState.isGeneratorUIOpen || gameState.playerStunned) return;
    if (gameState.shieldBrokenLock && (gameState.stamina < 100)) return; // lock after break until full
    const staminaPct = Math.max(0, Math.min(100, gameState.stamina));
    if (staminaPct <= 0) return;
    const dur = (staminaPct / 100) * BLOCK_MAX_DURATION_MS;
    gameState.blockActive = true;
    gameState.blockStartTime = currentTime; // For pull-out animation
    gameState.blockUntil = currentTime + dur;
    // Movement lock is based on shield activity; no timer needed
    // consume all current stamina and trigger cooldown
    gameState.stamina = 0;
    if (!gameState.isStaminaCoolingDown) {
        triggerStaminaCooldown(currentTime);
    } else {
        // restart cooldown from now to give consistent regen window
        gameState.staminaCooldownEnd = currentTime + STAMINA_COOLDOWN_TIME;
    }
    try { playShieldUp(); } catch {}
    try { playShieldHum(); } catch {}
}

export function stopBlock() {
    gameState.blockActive = false;
    gameState.blockUntil = 0;
}

export function setBlockAim(dx, dy) {
    if (dx === 0 && dy === 0) return;
    const targetAngle = Math.atan2(dy, dx);
    
    // Store target angle for smooth animation
    if (!gameState.blockTargetAngle) {
        gameState.blockTargetAngle = targetAngle;
        gameState.blockAngle = targetAngle;
    } else {
        gameState.blockTargetAngle = targetAngle;
    }
}

export function updateBlock(currentTime) {
    if (gameState.blockActive && currentTime >= gameState.blockUntil) {
        gameState.blockActive = false;
    }
    
    // Smoothly rotate shield towards target angle
    if (gameState.blockActive && gameState.blockTargetAngle !== undefined) {
        const current = gameState.blockAngle;
        const target = gameState.blockTargetAngle;
        
        // Calculate shortest rotation direction
        let diff = target - current;
        
        // Normalize to -PI to PI range
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        
        // Smooth rotation speed (radians per frame at 60fps)
        const rotationSpeed = 0.25; // Adjust this for faster/slower rotation
        
        if (Math.abs(diff) < 0.01) {
            gameState.blockAngle = target;
        } else {
            gameState.blockAngle += Math.sign(diff) * Math.min(Math.abs(diff), rotationSpeed);
        }
    }
}

// Event-driven shield hooks for future expansion
function onShieldHit(source, damage, currentTime) {
    // If damage exceeds durability, break the shield
    if (damage >= BLOCK_DURABILITY) {
        onShieldBreak(currentTime);
        return 'break';
    }
    return 'ok';
}

function onShieldBreak(currentTime) {
    // Visuals/feedback
    try { playShieldShatter(); } catch {}
    // Screen shake
    gameState.screenShakeMag = 4;
    gameState.screenShakeUntil = currentTime + 220;
    // Particles
    const cx = (gameState.player.x + 0.5);
    const cy = (gameState.player.y + 0.5);
    for (let i = 0; i < 24; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 3 + Math.random() * 3;
        gameState.shieldParticles.push({
            x: cx, y: cy,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            life: 450 + Math.random() * 300,
            born: currentTime,
            col: i % 2 ? 'rgba(255,255,255,0.9)' : 'rgba(255,215,0,0.9)'
        });
    }
    // End block state, lock until full stamina
    stopBlock();
    gameState.shieldBrokenLock = true;
    // Movement resumes because shield ends on break
    // Ensure stamina remains at 0 and cooldown is running
    gameState.stamina = 0;
    gameState.isStaminaCoolingDown = true;
    gameState.staminaCooldownEnd = currentTime + STAMINA_COOLDOWN_TIME;
}

export function updateStaminaCooldown(currentTime) {
    if (gameState.isStaminaCoolingDown) {
        // Calculate regen speed multiplier for endless mode
        let regenMultiplier = 1.0;
        if (gameState.mode === 'endless' && gameState.endlessConfig) {
            const streak = gameState.endlessConfig.streak || 0;
            // Faster stamina regen at higher streaks (up to 2x speed at 20+ streak)
            if (streak >= 20) regenMultiplier = 2.0;
            else if (streak >= 15) regenMultiplier = 1.75;
            else if (streak >= 10) regenMultiplier = 1.5;
            else if (streak >= 5) regenMultiplier = 1.25;
        }
        
        // Show progressive regen over the 15s cooldown (adjusted by multiplier)
        const total = STAMINA_COOLDOWN_TIME / regenMultiplier;
        const remaining = Math.max(0, gameState.staminaCooldownEnd - currentTime);
        const elapsed = Math.max(0, Math.min(total, total - remaining));
        const ratio = total > 0 ? (elapsed / total) : 1;
        gameState.stamina = Math.floor(100 * ratio);
        if (currentTime >= gameState.staminaCooldownEnd) {
            gameState.stamina = 100;
            gameState.isStaminaCoolingDown = false;
            // Unlock shield after a break once fully charged
            if (gameState.shieldBrokenLock) gameState.shieldBrokenLock = false;
        }
    } else if (!gameState.isSprinting && gameState.stamina < 100 && gameState.gameStatus === 'playing') {
        // Small trickle regen when not on cooldown (safety)
        gameState.stamina = Math.min(100, gameState.stamina + 0.5);
        if (gameState.stamina >= 100 && gameState.shieldBrokenLock) gameState.shieldBrokenLock = false;
    }
}

// SECRET: Bazooka Mode - Regenerate ammo (1 per second up to max 15)
export function updateBazookaAmmo(currentTime) {
    if (!isBazookaMode() || !gameState.bazooka || !gameState.bazooka.has) return;
    
    const maxAmmo = 15;
    if (gameState.bazooka.ammo < maxAmmo) {
        const timeSinceLastRegen = currentTime - (gameState.bazooka.lastRegenTime || currentTime);
        if (timeSinceLastRegen >= 1000) { // 1 second = 1 ammo
            const regenCount = Math.floor(timeSinceLastRegen / 1000);
            gameState.bazooka.ammo = Math.min(maxAmmo, gameState.bazooka.ammo + regenCount);
            gameState.bazooka.lastRegenTime = currentTime;
        }
    } else {
        gameState.bazooka.lastRegenTime = currentTime;
    }
}
// --- Speedrun timing helpers ---
function msToClock(ms) {
    const totalMs = Math.max(0, Math.floor(ms));
    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const millis = totalMs % 1000;
    return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}.${String(millis).padStart(3,'0')}`;
}

export function getRunClock(currentTime) {
    if (gameState.runActive && gameState.runStartAt) {
        const ms = currentTime - gameState.runStartAt;
        return msToClock(ms);
    }
    if (gameState.runTimeMs) return msToClock(gameState.runTimeMs);
    return '00:00.000';
}

function bestKeyForLevel(level) { return `smg_bestTime_L${level}`; }
export function getBestTimeMs(level) {
    try { const v = localStorage.getItem(bestKeyForLevel(level)); return v ? parseInt(v, 10) : 0; } catch { return 0; }
}
export function setBestTimeMs(level, ms) {
    try { localStorage.setItem(bestKeyForLevel(level), String(ms)); } catch {}
}

function finishRun(currentTime) {
    if (!gameState.runActive || !gameState.runStartAt) return;
    const ms = Math.max(0, Math.floor(currentTime - gameState.runStartAt));
    gameState.runActive = false;
    gameState.runTimeMs = ms;
    // Persist best per level
    const lvl = gameState.currentLevel || 0;
    if (lvl) {
        const best = getBestTimeMs(lvl);
        if (!best || ms < best) setBestTimeMs(lvl, ms);
    }
}

// --- Enemy AI (basic chaser) ---
function isPassableForEnemy(cell) {
    // Enemy can walk on EMPTY, EXIT, and TELEPAD; treats GENERATOR and WALL as blocked
    return cell === CELL.EMPTY || cell === CELL.EXIT || cell === CELL.TELEPAD;
}

export function bfsDistancesFrom(maze, startX, startY) {
    const w = MAZE_WIDTH, h = MAZE_HEIGHT;
    const dist = Array(h).fill(null).map(() => Array(w).fill(Infinity));
    const q = new Array(w * h);
    let head = 0, tail = 0;
    dist[startY][startX] = 0;
    q[tail++] = { x: startX, y: startY };
    const steps = [
        { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
    ];
    while (head < tail) {
        const { x, y } = q[head++];
        const d = dist[y][x] + 1;
        for (const s of steps) {
            const nx = x + s.dx, ny = y + s.dy;
            if (nx <= 0 || nx >= w - 1 || ny <= 0 || ny >= h - 1) continue;
            if (!isPassableForEnemy(maze[ny][nx])) continue;
            if (d >= dist[ny][nx]) continue;
            dist[ny][nx] = d;
            q[tail++] = { x: nx, y: ny };
        }
    }
    return dist;
}

// --- Simple A* pathfinding for Seeker ---
function aStarPath(maze, sx, sy, gx, gy) {
    const W = MAZE_WIDTH, H = MAZE_HEIGHT;
    const key = (x,y)=> (y*W + x);
    const open = new MinHeap((a,b)=> a.f - b.f);
    const gScore = new Map();
    const came = new Map();
    function h(x,y){ return Math.abs(x-gx)+Math.abs(y-gy); }
    const start = {x:sx,y:sy,g:0,f:h(sx,sy)};
    open.push(start);
    gScore.set(key(sx,sy),0);
    const steps = [ {dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1} ];
    while (!open.isEmpty()){
        const cur = open.pop();
        if (cur.x===gx && cur.y===gy){
            // reconstruct
            const path = [];
            let k = key(cur.x,cur.y);
            while (came.has(k)){
                path.push({x: cur.x, y: cur.y});
                const prev = came.get(k);
                cur.x = prev.x; cur.y = prev.y;
                k = key(cur.x,cur.y);
            }
            path.reverse();
            return path;
        }
        for (const s of steps){
            const nx = cur.x + s.dx, ny = cur.y + s.dy;
            if (nx<=0||nx>=W-1||ny<=0||ny>=H-1) continue;
            if (!isPassableForEnemy(maze[ny][nx])) continue;
            const tentative = cur.g + 1;
            const nk = key(nx,ny);
            const best = gScore.has(nk)? gScore.get(nk): Infinity;
            if (tentative < best){
                gScore.set(nk, tentative);
                came.set(nk, { x: cur.x, y: cur.y });
                open.push({ x:nx, y:ny, g: tentative, f: tentative + h(nx,ny) });
            }
        }
    }
    return null;
}

// minimal binary heap for A*
class MinHeap {
    constructor(cmp){ this.a=[]; this.cmp=cmp; }
    isEmpty(){ return this.a.length===0; }
    push(v){ this.a.push(v); this._siftUp(this.a.length-1); }
    pop(){ const a=this.a; const top=a[0]; const last=a.pop(); if (a.length){ a[0]=last; this._siftDown(0);} return top; }
    _siftUp(i){ const a=this.a; while(i>0){ const p=(i-1>>1); if (this.cmp(a[i],a[p])<0){ [a[i],a[p]]=[a[p],a[i]]; i=p; } else break; } }
    _siftDown(i){ const a=this.a; for(;;){ let l=i*2+1, r=l+1, m=i; if(l<a.length && this.cmp(a[l],a[m])<0) m=l; if(r<a.length && this.cmp(a[r],a[m])<0) m=r; if(m===i) break; [a[i],a[m]]=[a[m],a[i]]; i=m; } }
}

// Spawn the primary ground chaser enemy at a far, valid location
export function spawnInitialEnemy() {
    // Spawn Chaser near bottom-right corner; find nearest passable tile
    const target = { x: MAZE_WIDTH - 3, y: MAZE_HEIGHT - 3 };
    let spawn = null;
    for (let r = 0; r < Math.max(MAZE_WIDTH, MAZE_HEIGHT); r++) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                const x = Math.max(1, Math.min(MAZE_WIDTH - 2, target.x + dx));
                const y = Math.max(1, Math.min(MAZE_HEIGHT - 2, target.y + dy));
                if (isPassableForEnemy(gameState.maze[y][x])) { spawn = { x, y }; break; }
            }
            if (spawn) break;
        }
        if (spawn) break;
    }
    if (!spawn) return;
    const e = {
        type: 'chaser',
        mobility: 'ground',
        isGrounded: true,
        x: spawn.x, y: spawn.y,
        fx: spawn.x + 0.5, fy: spawn.y + 0.5,
        target: null,
        lastUpdateAt: 0,
        lastPathAt: 0,
        pathInterval: 260,
        speedBase: 2.2,
        speedPerGen: 0.5,
        lastJumpAt: 0,
        jumpCooldown: 2600,
        lastAttackAt: 0,
        attackCooldown: 1200,
        _lastMoveAt: 0,
        _lastPos: null
    };
    if (gameState.mode === 'endless' && gameState.difficulty === 'super') {
        e.pathInterval = 150;
        e.speedBase = 4.2;
        e.speedPerGen = 0.9;
        e.jumpCooldown = 1400;
        e.attackCooldown = 950;
    }
    gameState.enemies.push(e);
}

// --- Flying_Pig enemy ---
export function spawnFlyingPig() {
    // Spawn in one of 3 corners (not top-left): bottom-right, top-right, bottom-left
    const corners = [
        { x: MAZE_WIDTH - 3, y: MAZE_HEIGHT - 3 }, // bottom-right
        { x: MAZE_WIDTH - 3, y: 2 },               // top-right
        { x: 2, y: MAZE_HEIGHT - 3 }               // bottom-left
    ];
    const pick = corners[Math.floor(Math.random() * corners.length)];
    const start = { x: pick.x, y: pick.y };
    const pig = {
        type: 'flying_pig',
        mobility: 'air',
        isGrounded: false,
        x: start.x, y: start.y,
        fx: start.x + 0.5, fy: start.y + 0.5,
        state: 'flying', // 'flying' | 'weakened' | 'knocked_out'
        stateUntil: 0,
        speed: 3.0, // general movement
        circleSpeed: 3.8, // tuned for larger orbit
        dashSpeed: 9.0, // very fast dash
        lastShotAt: 0,
        shotCooldown: 3000,
        range: 5.0,
        id: 'fp_' + Math.random().toString(36).slice(2, 8),
        // circling/dashing phase
        phase: 'circle',
        nextDashAt: 0,
        telegraphUntil: 0,
        dashInfo: null, // { dirX, dirY, totalDist, movedDist, halted, haltUntil, fired }
        _dashActive: false,
        orbitAngle: 0,
        orbitRadius: 7.5 + Math.random() * 1.5, // circle from way further out
        _stateStartAt: 0
    };
    if (gameState.mode === 'endless' && gameState.difficulty === 'super') {
        pig.circleSpeed = 5.0;
        pig.dashSpeed = 12.0;
        pig.shotCooldown = 2000;
        pig.orbitRadius = 8.5 + Math.random() * 1.5;
    }
    gameState.enemies.push(pig);
}

export function spawnSeeker() {
    if (!gameState.maze) return;
    const midX = Math.floor(MAZE_WIDTH / 2);
    const midY = Math.floor(MAZE_HEIGHT / 2);
    let found = null;
    for (let r = 0; r < Math.max(MAZE_WIDTH, MAZE_HEIGHT); r++) {
        for (let y = Math.max(1, midY - r); y <= Math.min(MAZE_HEIGHT - 2, midY + r); y++) {
            for (let x = Math.max(1, midX - r); x <= Math.min(MAZE_WIDTH - 2, midX + r); x++) {
                if (isPassableForEnemy(gameState.maze[y][x])) {
                    found = { x, y }; break;
                }
            }
            if (found) break;
        }
        if (found) break;
    }
    if (!found) return;
    const s = {
        type: 'seeker',
        mobility: 'ground',
        isGrounded: true,
        x: found.x, y: found.y,
        fx: found.x + 0.5, fy: found.y + 0.5,
        state: 'roam', // 'roam' | 'rage'
        roamDir: null, // {dx,dy}
        speedRoam: 4.2,
        speedRage: 6.0,
        rageUntil: 0,
        rageStartAt: 0,
        lastUpdateAt: 0,
        target: null,
        lastPathAt: 0,
        pathInterval: 160,
        flashUntil: 0,
        detectRange: 7,
        chaseBeepAt: 0,
        roamStepsLeft: 0,
        roamGoal: null,
        _roamGoalSetAt: 0,
        path: null,
        pathIndex: 0,
        pathCooldownUntil: 0,
        nextGoalAt: 0,
        recent: [],
        alertTarget: null,
        alertUntil: 0,
        _alertDist: null,
        _lastMoveAt: 0,
        _lastPos: { x: found.x + 0.5, y: found.y + 0.5 },
        visitLog: [], // {x,y,t}
        avoidCenter: null,
        avoidUntil: 0
    };
    gameState.enemies.push(s);
}

export function spawnBatter() {
    if (!gameState.maze) return;
    // Spawn Batter in a different corner from player (not top-left)
    const corners = [
        { x: MAZE_WIDTH - 3, y: MAZE_HEIGHT - 3 }, // bottom-right
        { x: MAZE_WIDTH - 3, y: 2 },               // top-right
        { x: 2, y: MAZE_HEIGHT - 3 }               // bottom-left
    ];
    const pick = corners[Math.floor(Math.random() * corners.length)];
    let found = null;
    for (let r = 0; r < 10; r++) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                const x = Math.max(1, Math.min(MAZE_WIDTH - 2, pick.x + dx));
                const y = Math.max(1, Math.min(MAZE_HEIGHT - 2, pick.y + dy));
                if (isPassableForEnemy(gameState.maze[y][x])) {
                    found = { x, y }; break;
                }
            }
            if (found) break;
        }
        if (found) break;
    }
    if (!found) return;

    const b = {
        type: 'batter',
        mobility: 'ground',
        isGrounded: true,
        x: found.x, y: found.y,
        fx: found.x + 0.5, fy: found.y + 0.5,
        state: 'roam', // 'roam' | 'rage' | 'cooldown'
        roamDir: null, // {dx,dy}
        speedRoam: 5.2, // faster than others when roaming
        speedRage: 7.5, // easily catches the player in rage
        rageUntil: 0,
        cooldownUntil: 0, // after stunning player, back off for a while
        lastUpdateAt: 0,
        target: null,
        lastPathAt: 0,
        pathInterval: 120,
        proximityStartTime: 0, // tracks when player entered 3x3 radius
        roamStepsLeft: 0,
        roamGoal: null,
        _roamGoalSetAt: 0,
        _lastMoveAt: 0,
        _lastPos: { x: found.x + 0.5, y: found.y + 0.5 },
        visitLog: [],
        avoidCenter: null,
        avoidUntil: 0,
        _visCheckAt: 0
    };
    if (gameState.mode === 'endless' && gameState.difficulty === 'super') {
        b.speedRoam = 6.0;
        b.speedRage = 8.5;
        b.pathInterval = 100;
    }
    gameState.enemies.push(b);
}

// --- Mortar AI ---
export function spawnMortar() {
    if (!gameState.maze) return;
    // Spawn away from player: pick far corner
    const corners = [
        { x: MAZE_WIDTH - 3, y: MAZE_HEIGHT - 3 },
        { x: MAZE_WIDTH - 3, y: 2 },
        { x: 2, y: MAZE_HEIGHT - 3 }
    ];
    const pick = corners[Math.floor(Math.random() * corners.length)];
    let found = null;
    for (let r = 0; r < 14; r++) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                const x = Math.max(1, Math.min(MAZE_WIDTH - 2, pick.x + dx));
                const y = Math.max(1, Math.min(MAZE_HEIGHT - 2, pick.y + dy));
                if (isPassableForEnemy(gameState.maze[y][x])) { found = { x, y }; break; }
            }
            if (found) break;
        }
        if (found) break;
    }
    if (!found) return;
    const m = {
        type: 'mortar',
        mobility: 'ground',
        isGrounded: true,
        x: found.x, y: found.y,
        fx: found.x + 0.5, fy: found.y + 0.5,
        state: 'roam', // 'roam' | 'aim' | 'cooldown' | 'flee' | 'disabled'
        speedRoam: 2.6, // ~60% of seeker roam
        speedFlee: 3.9, // 150% of roam
        lastUpdateAt: 0,
        target: null,
        lastPathAt: 0,
        pathInterval: 200,
        roamGoal: null,
        _roamGoalSetAt: 0,
        nextStopAt: performance.now() + (5000 + Math.random() * 5000),
        aimTarget: null,
        aimUntil: 0,
        cooldownUntil: 0,
        fleeUntil: 0,
        disabledUntil: 0,
        _lastExplosionAt: 0,
        _lastExplosionCenter: null,
        _frozenUntil: 0
    };
    gameState.enemies.push(m);
}

function updateFlyingPig(e, currentTime, px, py, bazookaSpeedMult = 1.0) {
    // Handle timers for weakened/knocked states
    if (e.state !== 'flying' && currentTime >= e.stateUntil) {
        if (e.state === 'knocked_out' && e._bossSummoned) {
            // Despawn after ride window if not mounted
            e._despawn = true;
            return;
        }
        e.state = 'flying';
        // Reset motion timers to avoid massive dt teleport
        e.lastUpdateAt = currentTime;
        // Reset attack cadence and phase
        if (!e.orbitRadius) e.orbitRadius = 3.6;
        e.phase = 'circle';
        e.nextDashAt = currentTime + (1000 + Math.random() * 9000);
        e.telegraphUntil = 0;
        e.dashInfo = null;
        e._dashActive = false;
        e.lastShotAt = currentTime;
    }

    if (e.state === 'flying') {
        const tx = px + 0.5, ty = py + 0.5;
        const dx = tx - e.fx, dy = ty - e.fy;
        const dist = Math.hypot(dx, dy);
        const dt = Math.max(0, (currentTime - (e.lastUpdateAt || currentTime)) / 1000);

        // Initialize shot timer if needed
        if (!e.nextDashAt) e.nextDashAt = currentTime + (1000 + Math.random() * 9000);

        // Telegraphing state: stand still, flash, and cue sound
        if (e.telegraphUntil && currentTime < e.telegraphUntil) {
            e._dashActive = false; // not used, but keep for visuals
            // Track charging progress for visual effects (0 to 1)
            const total = 1000; // telegraph duration
            const elapsed = 1000 - (e.telegraphUntil - currentTime);
            e._chargeProgress = Math.min(1, elapsed / total);
        } else if (e.telegraphUntil && currentTime >= e.telegraphUntil && e.dashInfo) {
            // Fire once from current position, then wait until projectile resolves
            const ang = Math.atan2((ty - e.fy), (tx - e.fx));
            const proj = fireHalfArcProjectile(e, ang, currentTime);
            e.dashInfo.projectile = proj;
            e.dashInfo.halted = true; // use halted as 'waiting'
            e.dashInfo.haltUntil = currentTime + 4000; // safety timeout
            e.dashInfo.fired = true;
            e.telegraphUntil = 0;
            e._chargeProgress = 0;
            // Spawn launch particles at pig position
            const launchX = e.fx * CELL_SIZE;
            const launchY = e.fy * CELL_SIZE;
            particles.spawn('magic', launchX, launchY, 25, { color: '#ff69b4' });
        } else if (e.dashInfo && e.dashInfo.halted) {
            // Waiting until projectile resolves
            const projResolved = !e.dashInfo.projectile || e.dashInfo.projectile.resolved;
            if (projResolved || currentTime >= e.dashInfo.haltUntil) {
                e.dashInfo = null;
                e._dashActive = false;
                e.phase = 'circle';
                e.nextDashAt = currentTime + (1000 + Math.random() * 9000);
            }
        } else {
            // Circling behavior around the player
            e.orbitAngle += 3.6 * dt;
            const desiredR = e.orbitRadius;
            const txc = tx + desiredR * Math.cos(e.orbitAngle);
            const tyc = ty + desiredR * Math.sin(e.orbitAngle);
            const cdx = txc - e.fx, cdy = tyc - e.fy;
            const cdist = Math.hypot(cdx, cdy);
            // Apply thaw multiplier to movement during thaw window
            let thawMult = 1;
            if (currentTime < gameState.enemiesThawUntil) {
                const remain = Math.max(0, gameState.enemiesThawUntil - currentTime);
                thawMult = 1 - Math.min(1, remain / ENEMY_THAW_TIME);
            }
            const step = e.circleSpeed * dt * thawMult * bazookaSpeedMult;
            if (cdist > 0.001) {
                const m = Math.min(step, cdist);
                e.fx += (cdx / cdist) * m;
                e.fy += (cdy / cdist) * m;
            }
            // Trigger shot sequence between 1-10 seconds randomly
            if (currentTime >= e.nextDashAt) {
                e.telegraphUntil = currentTime + 1000;
                try { playPigTelegraph(); } catch {}
                e.dashInfo = { projectile: null, halted: false, haltUntil: 0, fired: false };
            }
        }
        e.x = Math.max(1, Math.min(MAZE_WIDTH - 2, Math.floor(e.fx)));
        e.y = Math.max(1, Math.min(MAZE_HEIGHT - 2, Math.floor(e.fy)));
        e.lastUpdateAt = currentTime;
        // No extra shots outside telegraphed sequence
    } else if (e.state === 'crashing') {
        // Crash animation: spin and fall toward crash target
        const crashProgress = Math.min(1, (currentTime - e.crashStartTime) / e.crashDuration);
        e.crashRotation = crashProgress * Math.PI * 4; // 2 full spins
        
        // Move toward crash target with arc motion
        if (e.crashTargetX !== undefined && e.crashTargetY !== undefined) {
            const targetFX = e.crashTargetX + 0.5;
            const targetFY = e.crashTargetY + 0.5;
            e.fx = e.crashStartX + (targetFX - e.crashStartX) * crashProgress;
            e.fy = e.crashStartY + (targetFY - e.crashStartY) * crashProgress;
            e.x = Math.floor(e.fx);
            e.y = Math.floor(e.fy);
        }
        
        // Spawn smoke trail during crash
        if (Math.random() < 0.3) {
            const crashX = e.fx * CELL_SIZE;
            const crashY = e.fy * CELL_SIZE;
            particles.spawn('smoke', crashX, crashY, 3, { color: '#888' });
        }
        
        if (crashProgress >= 1) {
            // Crash landing - create explosion
            e.state = 'weakened';
            const landX = e.fx * CELL_SIZE;
            const landY = e.fy * CELL_SIZE;
            particles.spawn('explosion', landX, landY, 25, { color: '#FFD700' });
            particles.spawn('smoke', landX, landY, 15, { color: '#666' });
            gameState.screenShakeMag = 5;
            gameState.screenShakeUntil = currentTime + 200;
            try { playExplosion(); } catch {}
        }
    } else if (e.state === 'weakened') {
        // If player touches within 10s, knock out for 45s
        const pdx = (px + 0.5) - e.fx;
        const pdy = (py + 0.5) - e.fy;
        const pDist = Math.hypot(pdx, pdy);
        if (pDist < 0.6) {
            e.state = 'knocked_out';
            e.stateUntil = currentTime + 45000;
            e._stateStartAt = currentTime;
        }
    } else if (e.state === 'knocked_out') {
        // No movement; wait timer
    }
}

function fireHalfArcProjectile(source, angleRad, currentTime) {
    const speed = 7.0; // tiles/sec
    const p = {
        type: 'half_arc',
        sourceId: source.id,
        x: source.fx, y: source.fy,
        angle: angleRad, // radians, forward direction
        vx: Math.cos(angleRad) * speed,
        vy: Math.sin(angleRad) * speed,
        radius: 2.5, // tiles
        reflected: false,
        resolved: false,
        lastUpdate: currentTime,
        spawnTime: currentTime,
        trail: [] // for particle trail
    };
    gameState.projectiles.push(p);
    return p;
}

// Find the nearest empty, reachable tile to drop the flying enemy onto
function findReachableDropTile(distField, fx, fy) {
    const cx = Math.max(1, Math.min(MAZE_WIDTH - 2, Math.floor(fx)));
    const cy = Math.max(1, Math.min(MAZE_HEIGHT - 2, Math.floor(fy)));
    let best = null, bestD = Infinity;
    for (let r = 0; r <= 6; r++) {
        for (let y = cy - r; y <= cy + r; y++) {
            for (let x = cx - r; x <= cx + r; x++) {
                if (x <= 0 || x >= MAZE_WIDTH - 1 || y <= 0 || y >= MAZE_HEIGHT - 1) continue;
                if (gameState.maze[y][x] !== CELL.EMPTY && gameState.maze[y][x] !== CELL.EXIT) continue;
                if (!Number.isFinite(distField[y][x])) continue; // unreachable from player
                const dd = (x + 0.5 - fx) ** 2 + (y + 0.5 - fy) ** 2;
                if (dd < bestD) { bestD = dd; best = { x, y }; }
            }
        }
        if (best) break;
    }
    if (best) return best;
    // Broaden search across full grid as a safety fallback
    for (let y = 1; y < MAZE_HEIGHT - 1; y++) {
        for (let x = 1; x < MAZE_WIDTH - 1; x++) {
            if ((gameState.maze[y][x] === CELL.EMPTY || gameState.maze[y][x] === CELL.EXIT) && Number.isFinite(distField[y][x])) {
                const dd = (x + 0.5 - fx) ** 2 + (y + 0.5 - fy) ** 2;
                if (dd < bestD) { bestD = dd; best = { x, y }; }
            }
        }
    }
    // Final fallback: use player's cell to guarantee reachability
    return best || { x: gameState.player.x, y: gameState.player.y };
}

export function updateEnemies(currentTime) {
    if (!gameState.maze || gameState.gameStatus !== 'playing') return;

    // BAZOOKA MODE: Speed multiplier for all enemies (makes them faster and more aggressive)
    const bazookaSpeedMult = isBazookaMode() ? 1.4 : 1.0; // 40% faster in bazooka mode

    // Handle mount state transitions and safe landing
    const wasMounted = !!(gameState._mountedWasActive);
    const isMounted = !!(gameState.mountedPigUntil && currentTime < gameState.mountedPigUntil);
    if (wasMounted && !isMounted) {
        // Mount just ended - trigger uncontrolled crash animation to random nearby tile
        const cx = Math.max(0, Math.min(MAZE_WIDTH - 1, gameState.player.x));
        const cy = Math.max(0, Math.min(MAZE_HEIGHT - 1, gameState.player.y));
        
        // Find random nearby accessible tile (within 3-5 tiles)
        const candidates = [];
        for (let dy = -5; dy <= 5; dy++) {
            for (let dx = -5; dx <= 5; dx++) {
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx <= 0 || nx >= MAZE_WIDTH - 1 || ny <= 0 || ny >= MAZE_HEIGHT - 1) continue;
                const cell = gameState.maze[ny]?.[nx];
                if (cell !== CELL.EMPTY && cell !== CELL.EXIT) continue;
                const dist = Math.abs(dx) + Math.abs(dy);
                if (dist >= 2 && dist <= 5) {
                    candidates.push({ x: nx, y: ny });
                }
            }
        }
        // Fallback: any nearby empty tile
        if (candidates.length === 0) {
            for (let dy = -3; dy <= 3; dy++) {
                for (let dx = -3; dx <= 3; dx++) {
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (nx <= 0 || nx >= MAZE_WIDTH - 1 || ny <= 0 || ny >= MAZE_HEIGHT - 1) continue;
                    const cell = gameState.maze[ny]?.[nx];
                    if (cell === CELL.EMPTY || cell === CELL.EXIT) {
                        candidates.push({ x: nx, y: ny });
                    }
                }
            }
        }
        
        const crashTarget = candidates.length > 0 
            ? candidates[Math.floor(Math.random() * candidates.length)]
            : { x: cx, y: cy };
        
        gameState.pigCrashAnimation = {
            active: true,
            startTime: currentTime,
            duration: 1200, // 1.2 seconds for dramatic crash
            rotation: 0,
            startX: gameState.player.x,
            startY: gameState.player.y,
            targetX: crashTarget.x,
            targetY: crashTarget.y
        };
        
        // Player will be moved to target during the crash animation
    }
    gameState._mountedWasActive = isMounted;

    // Always update projectiles, even if there are no enemies; freeze only during generator UI
    if (!gameState.isGeneratorUIOpen && gameState.projectiles && gameState.projectiles.length) {
        const now = currentTime;
        for (const p of gameState.projectiles) {
            if (p.resolved) continue;
            // Move projectile
            const dt = Math.max(0, (now - (p.lastUpdate || now)) / 1000);
            p.lastUpdate = now;
            p.x += (p.vx || 0) * dt;
            p.y += (p.vy || 0) * dt;
            // Smoke trail for rockets
            if (p.type === 'rocket') {
                if (!Array.isArray(p.smoke)) p.smoke = [];
                p.smoke.push({ x: p.x, y: p.y, at: now });
                if (p.smoke.length > 18) p.smoke.shift();
            }
            // Energy trail for pig projectiles
            if (p.type === 'half_arc') {
                if (!Array.isArray(p.trail)) p.trail = [];
                p.trail.push({ x: p.x, y: p.y, at: now });
                if (p.trail.length > 12) p.trail.shift();
            }
            // Off-screen cleanup
            if (p.x < -1 || p.x > MAZE_WIDTH + 1 || p.y < -1 || p.y > MAZE_HEIGHT + 1) {
                p.resolved = true;
                continue;
            }

            // Rocket projectile handling
            if (p.type === 'rocket') {
                const bx = gameState.boss && gameState.boss.core ? (gameState.boss.core.x + 0.5) : -999;
                const by = gameState.boss && gameState.boss.core ? (gameState.boss.core.y + 0.5) : -999;
                const dc = Math.hypot((bx - p.x), (by - p.y));
                // Direct hit on core
                if (dc < 0.6 && gameState.boss && gameState.boss.active) {
                    const mounted = !!(gameState.mountedPigUntil && now < gameState.mountedPigUntil);
                    if (!mounted) {
                        // Show IMMUNE effect when not mounted
                        if (!gameState.immuneEffects) gameState.immuneEffects = [];
                        gameState.immuneEffects.push({
                            x: gameState.boss.core.x,
                            y: gameState.boss.core.y,
                            startTime: now,
                            duration: 1500
                        });
                        console.log('[bazooka] core is IMMUNE (not mounted)');
                    } else {
                        damageCoreAt(gameState.boss.core.x, gameState.boss.core.y, true);
                        console.log('[bazooka] direct hit on core');
                    }
                    // Small explosion splash
                    gameState.lastExplosionSource = 'rocket';
                    bossExplosion(gameState.boss.core.x, gameState.boss.core.y, 1, now);
                    try { import('./audio.js').then(a=>a.playRocketExplosion && a.playRocketExplosion()); } catch {}
                    p.resolved = true;
                    continue;
                }
                // Collision with enemies: blow up near Chasers/Pigs
                if (gameState.enemies && gameState.enemies.length) {
                    let hitIdx = -1;
                    for (let i = 0; i < gameState.enemies.length; i++) {
                        const e = gameState.enemies[i];
                        if (e.type !== 'chaser' && e.type !== 'flying_pig') continue;
                        const ex = (e.fx ?? (e.x + 0.5));
                        const ey = (e.fy ?? (e.y + 0.5));
                        const de = Math.hypot((ex - p.x), (ey - p.y));
                        if (de < 0.6) { hitIdx = i; break; }
                    }
                    if (hitIdx >= 0) {
                        const e = gameState.enemies[hitIdx];
                        const gx = Math.floor((e.fx ?? (e.x + 0.5)));
                        const gy = Math.floor((e.fy ?? (e.y + 0.5)));
                        gameState.lastExplosionSource = 'rocket';
                        bossExplosion(gx, gy, 1, now);
                        try { import('./audio.js').then(a=>a.playRocketExplosion && a.playRocketExplosion()); } catch {}
                        p.resolved = true;
                        continue;
                    }
                }
                // Tile collision into wall -> explode
                const gx = Math.floor(p.x), gy = Math.floor(p.y);
                const mountedActive = !!(gameState.mountedPigUntil && now < gameState.mountedPigUntil);
                if (!mountedActive && gx>0 && gx<MAZE_WIDTH-1 && gy>0 && gy<MAZE_HEIGHT-1 && gameState.maze[gy][gx] === CELL.WALL) {
                    // SECRET: Bazooka Mode allows destroying inner walls (not outer ring, generators, or exit)
                    const isOuterRing = (gx === 0 || gx === MAZE_WIDTH-1 || gy === 0 || gy === MAZE_HEIGHT-1);
                    const isGenerator = gameState.generators && gameState.generators.some(g => g.x === gx && g.y === gy);
                    const isExit = gameState.maze[gy][gx] === CELL.EXIT;
                    if (isBazookaMode() && !isOuterRing && !isGenerator && !isExit) {
                        // Track wall health (2 hits to destroy)
                        if (!gameState.wallHealth) gameState.wallHealth = {};
                        const wallKey = `${gx},${gy}`;
                        const currentHealth = gameState.wallHealth[wallKey] || 2;
                        gameState.wallHealth[wallKey] = currentHealth - 1;
                        
                        if (gameState.wallHealth[wallKey] <= 0) {
                            // Wall destroyed after 2 hits - keep in wallHealth with 0 value for rendering
                            gameState.maze[gy][gx] = CELL.EMPTY;
                            gameState.wallHealth[wallKey] = 0; // Keep track of destroyed walls
                            console.log('[bazooka mode] destroyed inner wall at', gx, gy);
                        } else {
                            console.log('[bazooka mode] damaged wall at', gx, gy, '- health:', gameState.wallHealth[wallKey]);
                        }
                    }
                    // Splash damage around impact tile
                    // Damage core if within 3 tiles (splash)
                    if (gameState.boss && gameState.boss.active) {
                        const mc = Math.abs(gameState.boss.core.x - gx) + Math.abs(gameState.boss.core.y - gy);
                        if (mc <= 3) damageCoreAt(gameState.boss.core.x, gameState.boss.core.y, false);
                    }
                    gameState.lastExplosionSource = 'rocket';
                    bossExplosion(gx, gy, 1, now);
                    try { import('./audio.js').then(a=>a.playRocketExplosion && a.playRocketExplosion()); } catch {}
                    console.log('[bazooka] rocket exploded at', gx, gy);
                    p.resolved = true;
                    continue;
                }
            }

            // Collision with player (legacy pig projectile support)
            const pvx = (gameState.player.x + 0.5) - p.x;
            const pvy = (gameState.player.y + 0.5) - p.y;
            const pd = Math.hypot(pvx, pvy);
            if (pd <= (p.radius + 0.45)) {
                // Front half-plane relative to projectile direction
                const fx = Math.cos(p.angle), fy = Math.sin(p.angle);
                const dot = (pvx * fx + pvy * fy) / (pd || 1);
                if (dot >= 0) {
                    // If shield active and roughly facing, process hit
                    if (gameState.blockActive) {
                        const bx2 = Math.cos(gameState.blockAngle), by2 = Math.sin(gameState.blockAngle);
                        const towardPlayer = -((p.vx * bx2) + (p.vy * by2));
                        if (towardPlayer > 0) {
                            const result = onShieldHit('projectile', 0.6, now);
                            if (result === 'break') {
                                // Shield broke from damage - destroy projectile without reflection
                                p.resolved = true;
                            } else {
                                // Shield blocks and reflects projectile back at pig
                                p.vx = -p.vx; p.vy = -p.vy; p.angle = (p.angle + Math.PI) % (Math.PI * 2);
                                p.reflected = true;
                                p.sourceId = null;
                                p.x += p.vx * 0.02; p.y += p.vy * 0.02;
                                p.trail = []; // Clear trail on reflection
                                p.spawnTime = now; // Reset for fresh glow
                                try { playShieldReflect(); } catch {}
                                // Spectacular reflection burst
                                const reflectX = (gameState.player.x + 0.5) * CELL_SIZE;
                                const reflectY = (gameState.player.y + 0.5) * CELL_SIZE;
                                particles.spawn('explosion', reflectX, reflectY, 30, { color: '#FFD700' });
                                particles.spawn('magic', reflectX, reflectY, 20, { color: '#ffffff' });
                                gameState.screenShakeMag = 3;
                                gameState.screenShakeUntil = now + 120;
                                // Shield breaks after successfully reflecting (with particles and effects)
                                onShieldBreak(now);
                            }
                        }
                    }
                    if (!p.reflected && gameState.gameStatus === 'playing' && !gameState.godMode) {
                        gameState.lives = 0;
                        gameState.deathCause = 'pig_projectile';
                        gameState.gameStatus = 'lost';
                        setStatusMessage('You were hit by a projectile!');
                        // Play hit sound and spawn damage particles at player position
                        try { playEnemyHit(); } catch {}
                        const px = (gameState.player.x + 0.5) * CELL_SIZE;
                        const py = (gameState.player.y + 0.5) * CELL_SIZE;
                        particles.spawn('damage', px, py, 20);
                        p.resolved = true;
                        continue;
                    }
                }
            }

            // Collision with Flying_Pig when reflected
            if (p.reflected) {
                const pig = gameState.enemies && gameState.enemies.find(e => e.type === 'flying_pig' && e.state === 'flying');
                if (pig) {
                    const vx = pig.fx - p.x;
                    const vy = pig.fy - p.y;
                    const d = Math.hypot(vx, vy);
                    if (d <= (p.radius + 0.4)) {
                        const fx = Math.cos(p.angle), fy = Math.sin(p.angle);
                        const dot2 = (vx * fx + vy * fy) / (d || 1);
                        if (dot2 >= 0) {
                            // During the boss fight, reflected pig projectiles should knock out boss pigs (rideable)
                            if (gameState.boss && gameState.boss.active && pig._bossSummoned) {
                                // Start spinning crash animation for boss pig
                                pig.state = 'crashing';
                                pig.crashStartTime = now;
                                pig.crashDuration = 1200;
                                pig.stateUntil = now + pig.crashDuration + 10000; // Crash + knocked out time
                                pig._stateStartAt = now;
                                pig.crashRotation = 0;
                                pig.crashStartX = pig.fx;
                                pig.crashStartY = pig.fy;
                                pig._rideableUntil = pig.stateUntil;
                                
                                // Find random nearby accessible tile
                                const distField2 = bfsDistancesFrom(gameState.maze, Math.floor(pig.fx), Math.floor(pig.fy));
                                const candidates = [];
                                for (let dy = -5; dy <= 5; dy++) {
                                    for (let dx = -5; dx <= 5; dx++) {
                                        const nx = Math.floor(pig.fx) + dx;
                                        const ny = Math.floor(pig.fy) + dy;
                                        if (nx <= 0 || nx >= MAZE_WIDTH - 1 || ny <= 0 || ny >= MAZE_HEIGHT - 1) continue;
                                        if (!isPassableForEnemy(gameState.maze[ny][nx])) continue;
                                        const dist = Math.abs(dx) + Math.abs(dy);
                                        if (dist >= 3 && dist <= 5 && Number.isFinite(distField2[ny][nx])) {
                                            candidates.push({ x: nx, y: ny });
                                        }
                                    }
                                }
                                if (candidates.length === 0) {
                                    for (let dy = -3; dy <= 3; dy++) {
                                        for (let dx = -3; dx <= 3; dx++) {
                                            const nx = Math.floor(pig.fx) + dx;
                                            const ny = Math.floor(pig.fy) + dy;
                                            if (nx <= 0 || nx >= MAZE_WIDTH - 1 || ny <= 0 || ny >= MAZE_HEIGHT - 1) continue;
                                            if (isPassableForEnemy(gameState.maze[ny][nx])) {
                                                candidates.push({ x: nx, y: ny });
                                            }
                                        }
                                    }
                                }
                                const crashTarget = candidates.length > 0 
                                    ? candidates[Math.floor(Math.random() * candidates.length)]
                                    : { x: Math.floor(pig.fx), y: Math.floor(pig.fy) };
                                pig.crashTargetX = crashTarget.x;
                                pig.crashTargetY = crashTarget.y;
                                
                                pig.telegraphUntil = 0;
                                pig.dashInfo = null;
                                pig._dashActive = false;
                                pig.lastUpdateAt = now;
                                pig._hitFlashUntil = now + 180;
                                try { playPigHit(); } catch {}
                                // Knockout impact effects
                                const hitX = pig.fx * CELL_SIZE;
                                const hitY = pig.fy * CELL_SIZE;
                                particles.spawn('explosion', hitX, hitY, 25, { color: '#FFD700' });
                                particles.spawn('damage', hitX, hitY, 15);
                                gameState.screenShakeMag = 4;
                                gameState.screenShakeUntil = now + 150;
                                p.resolved = true;
                            } else {
                                // Hit by shield - start spinning crash animation
                                pig.state = 'crashing';
                                pig.crashStartTime = now;
                                pig.crashDuration = 1200; // 1.2 seconds crash animation
                                pig.stateUntil = now + pig.crashDuration + 10000; // Crash + weakened time
                                pig._stateStartAt = now;
                                pig.crashRotation = 0;
                                pig.crashStartX = pig.fx;
                                pig.crashStartY = pig.fy;
                                
                                // Find random nearby accessible tile (within 3-5 tiles)
                                const distField2 = bfsDistancesFrom(gameState.maze, Math.floor(pig.fx), Math.floor(pig.fy));
                                const candidates = [];
                                for (let dy = -5; dy <= 5; dy++) {
                                    for (let dx = -5; dx <= 5; dx++) {
                                        const nx = Math.floor(pig.fx) + dx;
                                        const ny = Math.floor(pig.fy) + dy;
                                        if (nx <= 0 || nx >= MAZE_WIDTH - 1 || ny <= 0 || ny >= MAZE_HEIGHT - 1) continue;
                                        if (!isPassableForEnemy(gameState.maze[ny][nx])) continue;
                                        const dist = Math.abs(dx) + Math.abs(dy);
                                        if (dist >= 3 && dist <= 5 && Number.isFinite(distField2[ny][nx])) {
                                            candidates.push({ x: nx, y: ny });
                                        }
                                    }
                                }
                                if (candidates.length === 0) {
                                    // Fallback: any nearby accessible tile
                                    for (let dy = -3; dy <= 3; dy++) {
                                        for (let dx = -3; dx <= 3; dx++) {
                                            const nx = Math.floor(pig.fx) + dx;
                                            const ny = Math.floor(pig.fy) + dy;
                                            if (nx <= 0 || nx >= MAZE_WIDTH - 1 || ny <= 0 || ny >= MAZE_HEIGHT - 1) continue;
                                            if (!isPassableForEnemy(gameState.maze[ny][nx])) {
                                                candidates.push({ x: nx, y: ny });
                                            }
                                        }
                                    }
                                }
                                const crashTarget = candidates.length > 0 
                                    ? candidates[Math.floor(Math.random() * candidates.length)]
                                    : { x: Math.floor(pig.fx), y: Math.floor(pig.fy) };
                                pig.crashTargetX = crashTarget.x;
                                pig.crashTargetY = crashTarget.y;
                                
                                pig.telegraphUntil = 0;
                                pig.dashInfo = null;
                                pig._dashActive = false;
                                pig.lastUpdateAt = now;
                                pig._hitFlashUntil = now + 180;
                                try { playPigHit(); } catch {}
                                // Hit effects
                                const hitX2 = pig.fx * CELL_SIZE;
                                const hitY2 = pig.fy * CELL_SIZE;
                                particles.spawn('explosion', hitX2, hitY2, 20, { color: '#ff69b4' });
                                particles.spawn('damage', hitX2, hitY2, 12);
                                gameState.screenShakeMag = 3;
                                gameState.screenShakeUntil = now + 120;
                                p.resolved = true;
                            }
                        }
                    }
                }
            }
        }
        // Remove resolved ones
        gameState.projectiles = gameState.projectiles.filter(p => !p.resolved);
    }

    // Prep room logic must run even when there are no enemies
    if (gameState.boss && gameState.boss.prepRoom) {
        if (gameState.bazookaPickup && !gameState.prepPickupLocked) pickBazooka(currentTime);
        const b = gameState.boss;
        if (b && b.ammoPickups && b.ammoPickups.length) {
            const pressedAt = gameState.reloadPressedAt || 0;
            const pressed = pressedAt && (currentTime - pressedAt) < 450;
            for (const a of b.ammoPickups) {
                const dx = Math.abs(gameState.player.x - a.x);
                const dy = Math.abs(gameState.player.y - a.y);
                const near = Math.max(dx, dy) <= 1;
                if (pressed && near) {
                    if (!gameState.bazooka) gameState.bazooka = { has: false, ammo: 0, maxAmmo: 10 };
                    const max = gameState.bazooka.maxAmmo || 10;
                    gameState.bazooka.ammo = max;
                    try { import('./audio.js').then(a=>a.playReload && a.playReload()); } catch {}
                    console.log('[prep] Reloaded to max. Ammo=', gameState.bazooka.ammo);
                    gameState.reloadPressedAt = 0;
                }
            }
            if (!b.prepDoorOpen && gameState.bazooka && gameState.bazooka.has && (gameState.bazooka.ammo || 0) > 0) {
                const pos = b.prepDoorPos;
                if (pos) {
                    const newGrid = gameState.maze.map(row => row.slice());
                    newGrid[pos.y][pos.x] = CELL.EXIT;
                    gameState.maze = newGrid;
                    b.prepDoorOpen = true;
                    setStatusMessage('Door opened. Step through to the arena.', 1800);
                }
            }
        }
        return;
    }

    // Boss arena update should run even if there are no regular enemies
    if (gameState.boss && gameState.boss.active) {
        // Allow picking bazooka if a pickup is present (unlikely in arena but safe)
        if (gameState.bazookaPickup) pickBazooka(currentTime);

        // Arena reload at fixed ammo stations
        const pressedAt = gameState.reloadPressedAt || 0;
        const pressed = pressedAt && (currentTime - pressedAt) < 450;
        const b = gameState.boss;
        if (b && Array.isArray(b.ammoStations)) {
            for (const s of b.ammoStations) {
                const dx = Math.abs(gameState.player.x - s.x);
                const dy = Math.abs(gameState.player.y - s.y);
                const near = Math.max(dx, dy) <= 1;
                const ready = !s.cooldownUntil || currentTime >= s.cooldownUntil;
                if (pressed && near && ready) {
                    if (!gameState.bazooka) gameState.bazooka = { has: false, ammo: 0, maxAmmo: 10 };
                    const max = gameState.bazooka.maxAmmo || 10;
                    gameState.bazooka.ammo = max;
                    s.cooldownUntil = currentTime + (BOSS_AMMO_STATION_COOLDOWN || 30000);
                    s.cooldownTotal = (BOSS_AMMO_STATION_COOLDOWN || 30000);
                    try { import('./audio.js').then(a=>a.playReload && a.playReload()); } catch {}
                    console.log('[arena] Reloaded at station. Ammo=', gameState.bazooka.ammo);
                    gameState.reloadPressedAt = 0;
                }
            }
        }

        // Run boss phase/timer logic regardless of enemies present
        updateBoss(currentTime);
    }

    if (!gameState.enemies || gameState.enemies.length === 0) return;

    // During generator UI: ONLY Mortar and Batter remain active. Others freeze completely.

    // Freeze effect: pause enemies and clear targets to prevent weird behavior
    if (currentTime < gameState.enemiesFrozenUntil) {
        // Clear movement data while frozen
        for (const e of gameState.enemies) {
            if (e.target) e.target = null;
            if (e.path) e.path = [];
        }
        return;
    }

    // Compute thaw multiplier (0..1) for gradual unfreeze after pause/generator
    let thawMult = 1;
    if (currentTime < gameState.enemiesThawUntil) {
        const remain = Math.max(0, gameState.enemiesThawUntil - currentTime);
        thawMult = 1 - Math.min(1, remain / ENEMY_THAW_TIME);
    }

    const px = gameState.player.x;
    const py = gameState.player.y;

    // (boss arena logic already executed above even if no enemies)

    // (prep-room logic handled earlier even when no enemies)

    // Handle trap expiration and flashing
    if (gameState.traps && gameState.traps.length) {
        const before = gameState.traps.length;
        const now = currentTime;
        for (const t of gameState.traps) {
                if (!t.triggered && now >= t.expiresAt) {
                t.triggered = true; // mark consumed
                t.flashUntil = now + 120; // brief expire flash
                try { playZapExpire(); } catch {}
            }
        }
        // Remove traps after flash completes
        gameState.traps = gameState.traps.filter(t => (t.flashUntil && now < t.flashUntil) || !t.triggered);
    }
    const completed = gameState.generators.filter(g => g.completed).length;
    // Cache BFS distances from player to reduce per-frame cost
    if (!gameState._bfsCache || gameState._bfsCache.x !== px || gameState._bfsCache.y !== py) {
        gameState._bfsCache = {
            x: px,
            y: py,
            dist: bfsDistancesFrom(gameState.maze, px, py),
            at: currentTime
        };
    }
    const distField = gameState._bfsCache.dist;
    const steps = [
        { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
    ];

    // Shared zap trigger: apply chaser-style zap effects to any ground enemy standing on an armed trap
    const triggerZapIfOnTile = (e) => {
        if (!gameState.traps || !gameState.traps.length) return false;
        if (!(e.mobility === 'ground' || e.isGrounded)) return false;
        const ex = Math.max(1, Math.min(MAZE_WIDTH - 2, Math.floor(e.fx)));
        const ey = Math.max(1, Math.min(MAZE_HEIGHT - 2, Math.floor(e.fy)));
            const tIdx = gameState.traps.findIndex(t => !t.triggered && t.x === ex && t.y === ey);
        if (tIdx === -1) return false;
        const trap = gameState.traps[tIdx];
        trap.triggered = true;
        trap.flashUntil = currentTime + 200;
        try { playZapTrigger(); } catch {}
        // Non-stacking: only set timers if not already within an active stun window
        if (!(e._zapStunUntil && currentTime < e._zapStunUntil)) {
            e._zapStunUntil = currentTime + 2000;
            e._zapSlowUntil = currentTime + 3000;
            e._zapFXUntil = currentTime + 500;
            // If enraged, force exit and lock re-entry until stun ends
            if (e.state === 'rage' || e.state === 'flee' || e.state === 'cooldown') {
                e.state = 'roam';
                if (typeof e.rageStartAt !== 'undefined') e.rageStartAt = 0;
                if (typeof e.rageUntil !== 'undefined') e.rageUntil = 0;
                e.target = null;
            }
            e._zapRageLockUntil = e._zapStunUntil;
        } else {
            // Already stunned: refresh brief FX flash only
            e._zapFXUntil = Math.max(e._zapFXUntil || 0, currentTime + 200);
        }
        return true;
    };

    for (const e of gameState.enemies) {
        // Freeze non-allowed AIs while generator UI is open
        if (gameState.isGeneratorUIOpen && !(e.type === 'mortar' || e.type === 'batter')) {
            e.lastUpdateAt = currentTime;
            continue;
        }
        if (e.type === 'flying_pig') {
            updateFlyingPig(e, currentTime, px, py, bazookaSpeedMult);
            if (e._despawn) continue; // will be removed in cleanup below
            continue;
        }
        // Skip per-enemy freeze (explosion freeze) but allow renderer to show them
        if (e._frozenUntil && currentTime < e._frozenUntil) {
            e.lastUpdateAt = currentTime;
            continue;
        }
        // During a coordinated stun, force other enemies to aggro toward player (unless zapped)
        if (gameState.playerStunned && (!e._zapStunUntil || currentTime >= e._zapStunUntil)) {
            if (e.type === 'seeker') {
                if (e.state !== 'rage') {
                    e.state = 'rage';
                    e.rageStartAt = currentTime;
                }
                e.rageUntil = Math.max(e.rageUntil || 0, gameState.playerStunUntil || currentTime + 1);
                e.target = null; e.lastPathAt = 0;
            }
            // Chaser already paths to player; no change needed
        }
        // Zap Trap stun/slow handling for ground enemies
        if (e.mobility === 'ground' || e.isGrounded) {
            if (e._zapStunUntil && currentTime < e._zapStunUntil) {
                e.lastUpdateAt = currentTime;
                // Remain in place while stunned
                continue;
            }
        }
    if (e.type === 'batter') {
            // Batter behavior: roaming, proximity detection, rage chase, and stun on contact
            const cx = Math.max(1, Math.min(MAZE_WIDTH - 2, Math.floor(e.fx)));
            const cy = Math.max(1, Math.min(MAZE_HEIGHT - 2, Math.floor(e.fy)));
            const last = e.lastUpdateAt || currentTime;
            const dt = Math.max(0, (currentTime - last) / 1000);

            // Thaw multiplier
            let localThaw = 1;
            if (currentTime < gameState.enemiesThawUntil) {
                const remain = Math.max(0, gameState.enemiesThawUntil - currentTime);
                localThaw = 1 - Math.min(1, remain / ENEMY_THAW_TIME);
            }
            
            // Generator slow multiplier (Batter moves at 50% speed while player is in generator)
            const genSlowMult = gameState.isGeneratorUIOpen ? 0.5 : 1.0;

            // Check if player is within 3x3 radius (3 tiles in each direction = 7x7 grid)
            const distX = Math.abs(cx - px);
            const distY = Math.abs(cy - py);
            const inProximity = (distX <= 3 && distY <= 3); // 7x7 grid with batter at center

            // Check if cooldown expired
            if (e.state === 'cooldown' && currentTime >= e.cooldownUntil) {
                e.state = 'roam';
                e.roamGoal = null;
                e.target = null;
            }

            // While the player is stunned, Batter must flee and never move closer to the player
            if (gameState.playerStunned) {
                if (e.state !== 'flee') {
                    e.state = 'flee';
                    e.proximityStartTime = 0;
                    e.target = null;
                    e.roamGoal = null;
                }
                // Greedy step away from the player: choose a neighbor that does NOT decrease distance
                const curDist = Math.hypot(cx - px, cy - py);
                const neigh = [
                    { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
                ].map(s => ({ x: cx + s.dx, y: cy + s.dy }))
                 .filter(p => p.x>0 && p.x<MAZE_WIDTH-1 && p.y>0 && p.y<MAZE_HEIGHT-1 && isPassableForEnemy(gameState.maze[p.y][p.x]));
                // Filter to neighbors that keep or increase distance
                const scored = neigh.map(p => ({ ...p, d: Math.hypot(p.x - px, p.y - py) }))
                                     .filter(p => p.d >= curDist - 1e-6);
                if (scored.length) {
                    scored.sort((a,b)=> b.d - a.d);
                    const best = scored[0];
                    e.target = { x: best.x, y: best.y };
                } else {
                    // No non-decreasing option: stay put (do not move toward the player)
                    e.target = null;
                }
                if (e.target) {
                    const tx = e.target.x + 0.5, ty = e.target.y + 0.5;
                    const dx = tx - e.fx, dy = ty - e.fy;
                    const dist = Math.hypot(dx, dy);
                    const step = e.speedRage * dt * localThaw * bazookaSpeedMult * genSlowMult; // flee as fast as possible
                    if (dist <= step || dist < 0.0001) {
                        e.fx = tx; e.fy = ty; e.x = e.target.x; e.y = e.target.y; e.target = null;
                        e._lastMoveAt = currentTime;
                        e._lastPos = { x: e.fx, y: e.fy };
                    } else {
                        e.fx += (dx / dist) * step; e.fy += (dy / dist) * step;
                        const moved = Math.hypot(e.fx - (e._lastPos?.x || 0), e.fy - (e._lastPos?.y || 0));
                        if (moved > 0.08) { e._lastMoveAt = currentTime; e._lastPos = { x: e.fx, y: e.fy }; }
                    }
                    // Periodic flee chirp
                    if (!e._nextFleeChirpAt || currentTime >= e._nextFleeChirpAt) {
                        try { playBatterFlee(); } catch {}
                        e._nextFleeChirpAt = currentTime + 250;
                    }
                }
                // Leave flee when player stun ends
                if (currentTime >= (gameState.playerStunUntil || 0)) {
                    e.state = 'roam';
                    e.roamGoal = null; e.target = null; e.proximityStartTime = 0;
                }
            } else if (e.state === 'roam') {
                if (inProximity) {
                    // Start proximity timer if not already started
                    if (!e.proximityStartTime) {
                        e.proximityStartTime = currentTime;
                    }
                    // Check if player has been in proximity for 0.5 seconds
                    if (currentTime - e.proximityStartTime >= 500 && !(e._zapRageLockUntil && currentTime < e._zapRageLockUntil)) {
                        // Activate rage mode
                        e.state = 'rage';
                        e.rageUntil = currentTime + 999999; // rage until contact
                        e.target = null; // force pathing recalculation
                        e.lastPathAt = 0;
                        try { playBatterRage(); } catch {}
                    }
                } else {
                    // Reset proximity timer if player leaves
                    e.proximityStartTime = 0;
                }

                // Periodic loop detection: if staying within a small area, bias away
                if (!e._visCheckAt || currentTime >= e._visCheckAt) {
                    e._visCheckAt = currentTime + 800;
                    const vx = Math.max(1, Math.min(MAZE_WIDTH - 2, Math.floor(e.fx)));
                    const vy = Math.max(1, Math.min(MAZE_HEIGHT - 2, Math.floor(e.fy)));
                    e.visitLog.push({ x: vx, y: vy, t: currentTime });
                    while (e.visitLog.length > 60) e.visitLog.shift();
                    const windowMs = 12000;
                    const recent = e.visitLog.filter(v => currentTime - v.t <= windowMs);
                    if (recent.length >= 16) {
                        const uniq = new Set(recent.map(v => (v.x + 999 * v.y)));
                        if (uniq.size < 9) {
                            let sx = 0, sy = 0;
                            for (const v of recent) { sx += v.x; sy += v.y; }
                            const cx2 = Math.round(sx / recent.length), cy2 = Math.round(sy / recent.length);
                            e.avoidCenter = { x: cx2, y: cy2 };
                            e.avoidUntil = currentTime + 5000;
                            e.roamGoal = null; e.target = null;
                        }
                    }
                }

                // Roam behavior - similar to seeker's roam but simpler
                const needNew = !e.roamGoal || (e.x === e.roamGoal.x && e.y === e.roamGoal.y) || (currentTime - (e._roamGoalSetAt || 0) > 8000);
                const stuck = (currentTime - (e._lastMoveAt || 0) > 1600);
                if (needNew || stuck) {
                    const cand = [];
                    for (let i = 0; i < 60; i++) {
                        const rx = 1 + Math.floor(Math.random() * (MAZE_WIDTH - 2));
                        const ry = 1 + Math.floor(Math.random() * (MAZE_HEIGHT - 2));
                        if (!isPassableForEnemy(gameState.maze[ry][rx])) continue;
                        const md = Math.abs(rx - cx) + Math.abs(ry - cy);
                        if (md < 5) continue;
                        let score = md;
                        if (e.avoidUntil && currentTime < e.avoidUntil && e.avoidCenter) {
                            score += Math.abs(rx - e.avoidCenter.x) + Math.abs(ry - e.avoidCenter.y);
                        }
                        cand.push({ x: rx, y: ry, score });
                    }
                    if (cand.length) {
                        cand.sort((a, b) => b.score - a.score);
                        const top = Math.max(1, Math.floor(cand.length * 0.4));
                        const pick = cand[Math.floor(Math.random() * top)];
                        e.roamGoal = { x: pick.x, y: pick.y };
                        e._roamGoalSetAt = currentTime;
                    }
                    e.target = null;
                }

                if (!e.target && e.roamGoal) {
                    const steps = [
                        { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
                    ];
                    let next = { x: cx, y: cy };
                    let bestDist = Math.abs(cx - e.roamGoal.x) + Math.abs(cy - e.roamGoal.y);
                    for (const s of steps) {
                        const nx = cx + s.dx, ny = cy + s.dy;
                        if (!isPassableForEnemy(gameState.maze[ny][nx])) continue;
                        const candDist = Math.abs(nx - e.roamGoal.x) + Math.abs(ny - e.roamGoal.y);
                        if (candDist < bestDist) {
                            bestDist = candDist;
                            next = { x: nx, y: ny };
                        }
                    }
                    if (next.x !== cx || next.y !== cy) {
                        e.target = next;
                        e.roamDir = { dx: next.x - cx, dy: next.y - cy };
                    }
                }

                // Always-moving fallback to avoid idle freezes and oscillations
                if (!e.target) {
                    let neighbors = [
                        { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
                    ].filter(s => isPassableForEnemy(gameState.maze[cy + s.dy][cx + s.dx]));
                    if (e.roamDir) {
                        const rev = { dx: -e.roamDir.dx, dy: -e.roamDir.dy };
                        const filtered = neighbors.filter(n => !(n.dx === rev.dx && n.dy === rev.dy));
                        if (filtered.length) neighbors = filtered;
                    }
                    if (neighbors.length) {
                        const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
                        e.target = { x: cx + pick.dx, y: cy + pick.dy };
                        e.roamDir = { dx: pick.dx, dy: pick.dy };
                    }
                }

                if (e.target) {
                    const tx = e.target.x + 0.5, ty = e.target.y + 0.5;
                    const dx = tx - e.fx, dy = ty - e.fy;
                    const dist = Math.hypot(dx, dy);
                    let speedRoam = e.speedRoam;
                    if (e._zapSlowUntil && currentTime < e._zapSlowUntil) speedRoam *= 0.5;
                    const step = speedRoam * dt * localThaw * bazookaSpeedMult * genSlowMult;
                    if (dist <= step || dist < 0.0001) {
                        e.fx = tx; e.fy = ty; e.x = e.target.x; e.y = e.target.y; e.target = null;
                        e._lastMoveAt = currentTime;
                        e._lastPos = { x: e.fx, y: e.fy };
                    } else {
                        e.fx += (dx / dist) * step; e.fy += (dy / dist) * step;
                        const moved = Math.hypot(e.fx - (e._lastPos?.x || 0), e.fy - (e._lastPos?.y || 0));
                        if (moved > 0.08) { e._lastMoveAt = currentTime; e._lastPos = { x: e.fx, y: e.fy }; }
                    }
                }

                // Always-moving fallback in roam: pick a valid neighbor, avoid backtracking when possible
                if (!e.target) {
                    let neighbors = [
                        { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
                    ].filter(s => isPassableForEnemy(gameState.maze[cy + s.dy][cx + s.dx]));
                    if (e.roamDir) {
                        const rev = { dx: -e.roamDir.dx, dy: -e.roamDir.dy };
                        const filtered = neighbors.filter(n => !(n.dx === rev.dx && n.dy === rev.dy));
                        if (filtered.length) neighbors = filtered;
                    }
                    if (neighbors.length) {
                        const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
                        e.target = { x: cx + pick.dx, y: cy + pick.dy };
                        e.roamDir = { dx: pick.dx, dy: pick.dy };
                    }
                }
            } else if (e.state === 'flee') {
                // Flee from stunned player - must stay outside 12x12 area (6 tiles from player)
                const needNew = !e.roamGoal || (e.x === e.roamGoal.x && e.y === e.roamGoal.y) || (currentTime - (e._roamGoalSetAt || 0) > 6000);
                const stuck = (currentTime - (e._lastMoveAt || 0) > 1600);
                
                if (needNew || stuck) {
                    const cand = [];
                    for (let i = 0; i < 80; i++) {
                        const rx = 1 + Math.floor(Math.random() * (MAZE_WIDTH - 2));
                        const ry = 1 + Math.floor(Math.random() * (MAZE_HEIGHT - 2));
                        if (!isPassableForEnemy(gameState.maze[ry][rx])) continue;
                        
                        // Must be far from player (outside 12x12 = 6 tiles in each direction using Chebyshev distance)
                        const distToPlayer = Math.max(Math.abs(rx - px), Math.abs(ry - py));
                        if (distToPlayer < 6) continue; // Skip if within 12x12 area
                        
                        const md = Math.abs(rx - cx) + Math.abs(ry - cy);
                        if (md < 5) continue;
                        
                        // Score: heavily favor distance from player
                        let score = distToPlayer * 3 + md;
                        cand.push({ x: rx, y: ry, score });
                    }
                    
                    if (cand.length) {
                        cand.sort((a, b) => b.score - a.score);
                        const top = Math.max(1, Math.floor(cand.length * 0.3));
                        const pick = cand[Math.floor(Math.random() * top)];
                        e.roamGoal = { x: pick.x, y: pick.y };
                        e._roamGoalSetAt = currentTime;
                    }
                    e.target = null;
                }

                // Navigate to flee goal
                if (!e.target && e.roamGoal) {
                    const steps = [
                        { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
                    ];
                    let next = { x: cx, y: cy };
                    let bestDist = Math.abs(cx - e.roamGoal.x) + Math.abs(cy - e.roamGoal.y);
                    for (const s of steps) {
                        const nx = cx + s.dx, ny = cy + s.dy;
                        if (!isPassableForEnemy(gameState.maze[ny][nx])) continue;
                        const candDist = Math.abs(nx - e.roamGoal.x) + Math.abs(ny - e.roamGoal.y);
                        if (candDist < bestDist) {
                            bestDist = candDist;
                            next = { x: nx, y: ny };
                        }
                    }
                    if (next.x !== cx || next.y !== cy) {
                        e.target = next;
                    }
                }
                
                // Move toward target
                if (e.target) {
                    const tx = e.target.x + 0.5, ty = e.target.y + 0.5;
                    const dx = tx - e.fx, dy = ty - e.fy;
                    const dist = Math.hypot(dx, dy);
                    let speedFlee = e.speedRage; // Use rage speed for fleeing
                    if (e._zapSlowUntil && currentTime < e._zapSlowUntil) speedFlee *= 0.5;
                    const step = speedFlee * dt * localThaw * bazookaSpeedMult * genSlowMult;
                    if (dist <= step || dist < 0.0001) {
                        e.fx = tx; e.fy = ty; e.x = e.target.x; e.y = e.target.y; e.target = null;
                        e._lastMoveAt = currentTime;
                    } else {
                        e.fx += (dx / dist) * step; e.fy += (dy / dist) * step;
                        e._lastMoveAt = currentTime;
                    }
                }
                
                // Player not stunned anymore; fall back to roam
                if (!gameState.playerStunned || currentTime >= gameState.playerStunUntil) {
                    e.state = 'roam';
                    e.roamGoal = null;
                    e.target = null;
                    e.proximityStartTime = 0;
                }
            } else if (e.state === 'rage') {
                // Exit rage immediately if under zap rage-lock
                if (e._zapRageLockUntil && currentTime < e._zapRageLockUntil) {
                    e.state = 'roam';
                    e.rageUntil = 0;
                    e.target = null;
                }
                // Rage mode: chase player at same speed as player walks
                if (currentTime - e.lastPathAt >= e.pathInterval || !e.target) {
                    e.lastPathAt = currentTime;
                    const cx2 = Math.max(1, Math.min(MAZE_WIDTH - 2, Math.floor(e.fx)));
                    const cy2 = Math.max(1, Math.min(MAZE_HEIGHT - 2, Math.floor(e.fy)));
                    e.x = cx2; e.y = cy2;
                    let best = { x: cx2, y: cy2, d: distField[cy2][cx2] };
                    const steps = [
                        { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
                    ];
                    for (const s of steps) {
                        const nx = cx2 + s.dx, ny = cy2 + s.dy;
                        if (!isPassableForEnemy(gameState.maze[ny][nx])) continue;
                        const nd = distField[ny][nx];
                        if (nd < best.d) best = { x: nx, y: ny, d: nd };
                    }
                    if (!Number.isFinite(best.d)) {
                        for (const s of steps) {
                            const nx = cx2 + s.dx, ny = cy2 + s.dy;
                            const nd = distField[ny][nx];
                            if (Number.isFinite(nd) && isPassableForEnemy(gameState.maze[ny][nx])) { best = { x: nx, y: ny, d: nd }; break; }
                        }
                    }
                    e.target = { x: best.x, y: best.y };
                }

                // Move toward target
                if (e.target) {
                    const tx = e.target.x + 0.5, ty = e.target.y + 0.5;
                    const dx = tx - e.fx, dy = ty - e.fy;
                    const dist = Math.hypot(dx, dy);
                    let speedRage = e.speedRage;
                    if (e._zapSlowUntil && currentTime < e._zapSlowUntil) speedRage *= 0.5;
                    const step = speedRage * dt * localThaw * bazookaSpeedMult;
                    if (dist <= step || dist < 0.0001) {
                        e.fx = tx; e.fy = ty; e.x = e.target.x; e.y = e.target.y; e.target = null;
                    } else {
                        e.fx += (dx / dist) * step; e.fy += (dy / dist) * step;
                    }
                }
            }

            e.lastUpdateAt = currentTime;

            // Zap trap trigger (exactly like chaser)
            triggerZapIfOnTile(e);

            // Bat swing animation trigger (at 1.2 tiles distance during rage)
            if (e.state === 'rage') {
                const pdx = (gameState.player.x + 0.5) - e.fx;
                const pdy = (gameState.player.y + 0.5) - e.fy;
                const pDist = Math.hypot(pdx, pdy);
                
                // Trigger swing at 1.2 tiles to make it visible
                if (pDist < 1.2 && (!e.swingStartTime || currentTime - e.swingStartTime > 300)) {
                    e.swingStartTime = currentTime;
                    e.swingDirection = Math.atan2(pdy, pdx);
                }
                
                // Clear swing animation after 300ms
                if (e.swingStartTime && currentTime - e.swingStartTime > 300) {
                    e.swingStartTime = null;
                    e.swingDirection = null;
                }
            }

            // Collision check - stun player immediately (even in generator UI)
            const pdx = (gameState.player.x + 0.5) - e.fx;
            const pdy = (gameState.player.y + 0.5) - e.fy;
            const pDist = Math.hypot(pdx, pdy);
            if (pDist < 0.5) {
                handleBatterHit(currentTime);
                // Transition to flee state immediately after hit
                e.state = 'flee';
                e.proximityStartTime = 0;
                e.target = null;
                e.roamGoal = null;
            }
            continue;
        }
    if (e.type === 'mortar') {
            // Mortar behavior
            const cx = Math.max(1, Math.min(MAZE_WIDTH - 2, Math.floor(e.fx)));
            const cy = Math.max(1, Math.min(MAZE_HEIGHT - 2, Math.floor(e.fy)));
            const last = e.lastUpdateAt || currentTime;
            const dt = Math.max(0, (currentTime - last) / 1000);

            // Tackle: Check collision FIRST, before any state logic (unless already disabled)
            const pdx = (px + 0.5) - e.fx;
            const pdy = (py + 0.5) - e.fy;
            if (Math.hypot(pdx, pdy) < 0.5 && e.state !== 'disabled') {
                // Apply stun immediately regardless of current state
                e.state = 'disabled';
                e._disabledOverlay = false;
                e._disabledStartAt = currentTime;
                e.disabledUntil = currentTime + 30000;
                // Clear any active aim state
                e.aimTarget = null;
                e.aimUntil = 0;
                e._didFirstExplosion = false;
                e._secondAt = 0;
                e._secondTarget = null;
                setStatusMessage('Mortar disabled for 30s!');
                e.lastUpdateAt = currentTime;
                continue; // Skip rest of mortar logic this frame
            }

            // Sensing uses path distance (cannot sense through walls)
            const distToPlayer = distField[cy][cx];
            const sensesPlayer = Number.isFinite(distToPlayer) && distToPlayer <= 8;
            // Flee trigger if within 8 tiles via reachable path and not busy
            if ((e.state === 'roam' || e.state === 'flee') && sensesPlayer) {
                e.state = 'flee';
                e.fleeUntil = currentTime + 3000; // refresh while close
            } else if (e.state === 'flee' && (!sensesPlayer) && currentTime >= e.fleeUntil) {
                e.state = 'roam';
                e.target = null; e.roamGoal = null;
            }

            if (e.state === 'disabled') {
                // Permanently or temporarily disabled
                if (e.disabledUntil && currentTime >= e.disabledUntil) {
                    e.state = 'roam';
                    e.nextStopAt = currentTime + (4000 + Math.random() * 4000);
                }
                e.lastUpdateAt = currentTime;
                // Tackle/self-destruct already handled via state entry
                continue;
            }

            if (e.state === 'cooldown') {
                if (currentTime >= e.cooldownUntil) {
                    e.state = 'roam';
                    e.target = null; e.roamGoal = null;
                    e.nextStopAt = currentTime + (5000 + Math.random() * 5000);
                }
                e.lastUpdateAt = currentTime;
                continue;
            }

            if (e.state === 'aim') {
                // Play fire sound if shell was fired (set by renderer)
                if (e._playFireSound) {
                    try { playMortarFire(); } catch {}
                    e._playFireSound = false;
                }
                
                // Two-phase aim/shot handling. First resolves at aimUntil; optional second resolves at _secondAt.
                if (!e._didFirstExplosion && currentTime >= e.aimUntil) {
                    // First explosion at aimTarget
                    const center = e.aimTarget || { x: cx, y: cy };
                    const radius = 2; // 5x5 square => Chebyshev radius 2
                    try { playMortarExplosion(); } catch {}
                    try { playExplosion(); } catch {}
                    const explosionX = (center.x + 0.5) * CELL_SIZE;
                    const explosionY = (center.y + 0.5) * CELL_SIZE;
                    particles.spawn('explosion', explosionX, explosionY, 30, { color: '#ff6600' });
                    gameState.screenShakeMag = 5;
                    gameState.screenShakeUntil = currentTime + 180;
                    e._lastExplosionAt = currentTime;
                    e._lastExplosionCenter = { ...center };

                    // Player damage and stun (5s)
                    if (Math.max(Math.abs(center.x - px), Math.abs(center.y - py)) <= radius) {
                        if (!gameState.godMode && gameState.gameStatus === 'playing') {
                            gameState.lives = Math.max(0, (gameState.lives || 0) - 1);
                            gameState.playerStunned = true;
                            gameState.playerStunUntil = currentTime + 5000;
                            setStatusMessage('Mortar blast! STUNNED for 5s.');
                            // Play hit sound and spawn damage particles at player position
                            try { playEnemyHit(); } catch {}
                            const playerX = (gameState.player.x + 0.5) * CELL_SIZE;
                            const playerY = (gameState.player.y + 0.5) * CELL_SIZE;
                            particles.spawn('damage', playerX, playerY, 20);
                            if (gameState.lives <= 0) {
                                gameState.deathCause = 'mortar_explosion';
                                gameState.gameStatus = 'lost';
                            }
                        }
                    }
                    // Freeze other enemies in radius (10s)
                    for (const o of gameState.enemies) {
                        if (o === e) continue;
                        const ox = Math.max(1, Math.min(MAZE_WIDTH - 2, Math.floor(o.fx)));
                        const oy = Math.max(1, Math.min(MAZE_HEIGHT - 2, Math.floor(o.fy)));
                        if (Math.max(Math.abs(center.x - ox), Math.abs(center.y - oy)) <= radius) {
                            o._frozenUntil = currentTime + 10000;
                        }
                    }
                    // Self-hit: if mortar within radius, perma-disable
                    if (Math.max(Math.abs(center.x - cx), Math.abs(center.y - cy)) <= radius) {
                        e.state = 'disabled';
                        e._disabledOverlay = false;
                        e.disabledUntil = 0; // remainder of round
                        try { playMortarSelfDestruct(); } catch {}
                        // Clear aim state
                        e.aimTarget = null; e.aimUntil = 0;
                        e._didFirstExplosion = false; e._secondAt = 0; e._secondTarget = null;
                    } else if (e.aimBursts === 2) {
                        // Schedule a second shot just outside the first radius, toward player's direction
                        const pvx = px - center.x;
                        const pvy = py - center.y;
                        let dir = { dx: 1, dy: 0 };
                        if (Math.abs(pvx) > Math.abs(pvy)) dir = { dx: pvx > 0 ? 1 : -1, dy: 0 };
                        else if (Math.abs(pvy) > Math.abs(pvx)) dir = { dx: 0, dy: pvy > 0 ? 1 : -1 };
                        const cand = { x: center.x + dir.dx * 3, y: center.y + dir.dy * 3 };
                        const clamped = clampToMaze(cand.x, cand.y);
                        // Ensure passable; if not, try orthogonal fallbacks
                        let sec = clamped;
                        if (!isPassableForEnemy(gameState.maze[sec.y][sec.x])) {
                            const alt1 = clampToMaze(center.x + 3, center.y);
                            const alt2 = clampToMaze(center.x - 3, center.y);
                            const alt3 = clampToMaze(center.x, center.y + 3);
                            const alt4 = clampToMaze(center.x, center.y - 3);
                            const alts = [alt1, alt2, alt3, alt4].filter(a => isPassableForEnemy(gameState.maze[a.y][a.x]));
                            if (alts.length) sec = alts[Math.floor(Math.random() * alts.length)];
                        }
                        e._secondTarget = sec;
                        e._secondLeadTime = 350;
                        e._secondAt = currentTime + e._secondLeadTime;
                        e._didFirstExplosion = true;
                        // Keep state in aim; clear the initial aim lock
                        e.aimTarget = null; e.aimUntil = 0;
                    } else {
                        // Single-shot path: transition either to queued disabled or cooldown
                        if (e._disabledOverlay) {
                            e.state = 'disabled';
                            // keep disabledUntil as set when queued
                        } else {
                            e.state = 'cooldown';
                            e.cooldownUntil = currentTime + 1500;
                        }
                        e.aimTarget = null; e.aimUntil = 0;
                        e._didFirstExplosion = false;
                        e._secondAt = 0; e._secondTarget = null;
                    }
                } else if (e._didFirstExplosion && e._secondAt && currentTime >= e._secondAt) {
                    // Resolve second shot
                    const center = e._secondTarget;
                    const radius = 2;
                    try { playMortarExplosion(); } catch {}
                    try { playExplosion(); } catch {}
                    const explosionX = (center.x + 0.5) * CELL_SIZE;
                    const explosionY = (center.y + 0.5) * CELL_SIZE;
                    particles.spawn('explosion', explosionX, explosionY, 30, { color: '#ff6600' });
                    gameState.screenShakeMag = 5;
                    gameState.screenShakeUntil = currentTime + 180;
                    e._lastExplosionAt = currentTime;
                    e._lastExplosionCenter = { ...center };
                    // Player damage/stun
                    if (Math.max(Math.abs(center.x - px), Math.abs(center.y - py)) <= radius) {
                        if (!gameState.godMode && gameState.gameStatus === 'playing') {
                            gameState.lives = Math.max(0, (gameState.lives || 0) - 1);
                            gameState.playerStunned = true;
                            gameState.playerStunUntil = currentTime + 5000;
                            setStatusMessage('Mortar blast! STUNNED for 5s.');
                            // Play hit sound and spawn damage particles at player position
                            try { playEnemyHit(); } catch {}
                            const playerX = (gameState.player.x + 0.5) * CELL_SIZE;
                            const playerY = (gameState.player.y + 0.5) * CELL_SIZE;
                            particles.spawn('damage', playerX, playerY, 20);
                            if (gameState.lives <= 0) { gameState.deathCause = 'mortar_explosion'; gameState.gameStatus = 'lost'; }
                        }
                    }
                    // Freeze other enemies
                    for (const o of gameState.enemies) {
                        if (o === e) continue;
                        const ox = Math.max(1, Math.min(MAZE_WIDTH - 2, Math.floor(o.fx)));
                        const oy = Math.max(1, Math.min(MAZE_HEIGHT - 2, Math.floor(o.fy)));
                        if (Math.max(Math.abs(center.x - ox), Math.abs(center.y - oy)) <= radius) {
                            o._frozenUntil = currentTime + 10000;
                        }
                    }
                    // Self-hit second shot
                    if (Math.max(Math.abs(center.x - cx), Math.abs(center.y - cy)) <= radius) {
                        e.state = 'disabled';
                        e.disabledUntil = 0;
                        try { playMortarSelfDestruct(); } catch {}
                    } else {
                        // After second shot: go disabled if queued, else cooldown
                        if (e._disabledOverlay) {
                            e.state = 'disabled';
                            // keep disabledUntil
                        } else {
                            e.state = 'cooldown';
                            e.cooldownUntil = currentTime + 1500;
                        }
                    }
                    // Clear aim and second shot bookkeeping
                    e.aimTarget = null; e.aimUntil = 0; e._secondAt = 0; e._secondTarget = null; e._didFirstExplosion = false;
                }
                e.lastUpdateAt = currentTime;
                continue;
            }

            // Movement: ROAM or FLEE (roam like seeker/batter, but slower)
            // Choose or refresh roamGoal
            const needNewGoal = (!e.roamGoal) || (currentTime - (e._roamGoalSetAt || 0) > 7000) || (currentTime - (e._lastMoveAt || 0) > 1600);
            if (e.state === 'roam' && needNewGoal) {
                let pick = null;
                const cx2 = cx, cy2 = cy;
                for (let i = 0; i < 80; i++) {
                    const rx = 1 + Math.floor(Math.random() * (MAZE_WIDTH - 2));
                    const ry = 1 + Math.floor(Math.random() * (MAZE_HEIGHT - 2));
                    if (!isPassableForEnemy(gameState.maze[ry][rx])) continue;
                    const md = Math.abs(rx - cx2) + Math.abs(ry - cy2);
                    if (md < 6) continue; // avoid tiny goals
                    pick = { x: rx, y: ry }; break;
                }
                if (pick) {
                    e.roamGoal = pick;
                    e._roamGoalSetAt = currentTime;
                    e._roamDist = bfsDistancesFrom(gameState.maze, e.roamGoal.x, e.roamGoal.y);
                }
            }
            // In flee, pick far goal from player or target a teleport pad to escape
            if (e.state === 'flee' && (!e.roamGoal || currentTime - (e._roamGoalSetAt || 0) > 2500)) {
                let pickedGoal = null;
                // Prefer teleport pad whose destination is far from the player and is reachable, if available
                if (Array.isArray(gameState.teleportPads) && gameState.teleportPads.length >= 2) {
                    let bestPad = null;
                    let bestScore = -Infinity;
                    for (const pad of gameState.teleportPads) {
                        // Respect pad cooldown; Mortar won't attempt to use cooling pads
                        if (currentTime < (pad.cooldownUntil || 0)) continue;
                        const distFromPad = bfsDistancesFrom(gameState.maze, pad.x, pad.y);
                        const reach = distFromPad[cy][cx];
                        if (!Number.isFinite(reach)) continue; // can't reach origin pad
                        const dest = gameState.teleportPads[pad.pair];
                        const farScore = distField[dest.y][dest.x]; // farther from player is better
                        const score = (Number.isFinite(farScore) ? farScore : -9999) - reach * 0.1; // slight bias to nearer origin
                        if (score > bestScore) { bestScore = score; bestPad = pad; }
                    }
                    if (bestPad) {
                        pickedGoal = { x: bestPad.x, y: bestPad.y };
                    }
                }
                if (!pickedGoal) {
                    // Fallback: far random cell away from player
                    let best = { x: cx, y: cy, score: -Infinity };
                    for (let i = 0; i < 60; i++) {
                        const rx = 1 + Math.floor(Math.random() * (MAZE_WIDTH - 2));
                        const ry = 1 + Math.floor(Math.random() * (MAZE_HEIGHT - 2));
                        if (!isPassableForEnemy(gameState.maze[ry][rx])) continue;
                        const d = distField[ry][rx];
                        const score = Number.isFinite(d) ? d : -9999;
                        if (score > best.score) best = { x: rx, y: ry, score };
                    }
                    pickedGoal = { x: best.x, y: best.y };
                }
                e.roamGoal = pickedGoal;
                e._roamGoalSetAt = currentTime;
                e._roamDist = bfsDistancesFrom(gameState.maze, e.roamGoal.x, e.roamGoal.y);
            }

            // Opportunistic teleport while fleeing: if standing on a pad and it's ready, use it instantly
            if (e.state === 'flee' && Array.isArray(gameState.teleportPads) && gameState.teleportPads.length >= 2) {
                const pad = gameState.teleportPads.find(p => p.x === cx && p.y === cy);
                if (pad && currentTime >= (pad.cooldownUntil || 0)) {
                    const dest = gameState.teleportPads[pad.pair];
                    if (dest) {
                        e.fx = dest.x + 0.5; e.fy = dest.y + 0.5; e.x = dest.x; e.y = dest.y;
                        e.target = null; e.roamGoal = null;
                        e._lastMoveAt = currentTime;
                        // Put both pads on a longer enemy-driven cooldown to avoid spam
                        pad.cooldownUntil = currentTime + ENEMY_TELEPORT_COOLDOWN_TIME;
                        dest.cooldownUntil = currentTime + ENEMY_TELEPORT_COOLDOWN_TIME;
                    }
                }
            }

            // Plan immediate step toward roamGoal using BFS gradient
            if (!e.target && e.roamGoal && e._roamDist) {
                let here = e._roamDist[cy][cx];
                if (!Number.isFinite(here)) {
                    // recompute if out of bounds
                    e._roamDist = bfsDistancesFrom(gameState.maze, e.roamGoal.x, e.roamGoal.y);
                    here = e._roamDist[cy][cx];
                }
                let best = { x: cx, y: cy, d: here };
                for (const s of steps) {
                    const nx = cx + s.dx, ny = cy + s.dy;
                    if (nx<=0||nx>=MAZE_WIDTH-1||ny<=0||ny>=MAZE_HEIGHT-1) continue;
                    if (!isPassableForEnemy(gameState.maze[ny][nx])) continue;
                    const nd = e._roamDist[ny][nx];
                    if (nd < best.d) best = { x: nx, y: ny, d: nd };
                }
                if (best.x !== cx || best.y !== cy) e.target = { x: best.x, y: best.y };
            }
            // Move toward target if any (MORTAR)
            if (e.target) {
                const gx = e.target.x + 0.5, gy = e.target.y + 0.5;
                const dx = gx - e.fx, dy = gy - e.fy;
                const dist = Math.hypot(dx, dy);
                const speed = (e.state === 'flee') ? e.speedFlee : e.speedRoam;
                const step = speed * dt * thawMult * bazookaSpeedMult;
                if (dist <= step || dist < 0.0001) {
                    e.fx = gx; e.fy = gy; e.x = e.target.x; e.y = e.target.y; e.target = null;
                    e._lastMoveAt = currentTime;
                } else {
                    e.fx += (dx / dist) * step; e.fy += (dy / dist) * step;
                    const moved = Math.hypot(e.fx - (e._lastPos?.x || 0), e.fy - (e._lastPos?.y || 0));
                    if (moved > 0.08) { e._lastMoveAt = currentTime; e._lastPos = { x: e.fx, y: e.fy }; }
                }
            }

            // Random stop to aim (5–10s cadence)
            if (e.state === 'roam' && currentTime >= (e.nextStopAt || 0)) {
                e.state = 'aim';
                e.aimTarget = { x: px, y: py }; // lock onto current tile
                e.aimUntil = currentTime + 2000; // aim+travel 2s total
                e._aimStartTime = currentTime; // Track aim start for animation
                e._didFirstExplosion = false;
                e._secondAt = 0; e._secondTarget = null;
                e._shellFired = false; // Reset shell animation
                e.aimBursts = (completed >= 2) ? 2 : 1;
                try { playMortarWarning(); } catch {}
                // Don't play fire sound yet - wait until shell is actually fired
            }

            e.lastUpdateAt = currentTime;
            continue;
        }
        if (e.type === 'seeker') {
            // Seeker behavior: roaming with LOS-based rage
            const cx = Math.max(1, Math.min(MAZE_WIDTH - 2, Math.floor(e.fx)));
            const cy = Math.max(1, Math.min(MAZE_HEIGHT - 2, Math.floor(e.fy)));
            const last = e.lastUpdateAt || currentTime;
            const dt = Math.max(0, (currentTime - last) / 1000);

            // Thaw multiplier applied to movement
            let localThaw = 1;
            if (currentTime < gameState.enemiesThawUntil) {
                const remain = Math.max(0, gameState.enemiesThawUntil - currentTime);
                localThaw = 1 - Math.min(1, remain / ENEMY_THAW_TIME);
            }

            if (e.state === 'roam') {
                // 1) Alert steering
                if (e.alertUntil && currentTime < e.alertUntil && e.alertTarget) {
                    if (!e._alertDist) {
                        e._alertDist = bfsDistancesFrom(gameState.maze, e.alertTarget.x, e.alertTarget.y);
                    }
                    let best = { x: cx, y: cy, d: e._alertDist[cy][cx] };
                    for (const s of steps) {
                        const nx = cx + s.dx, ny = cy + s.dy;
                        if (!isPassableForEnemy(gameState.maze[ny][nx])) continue;
                        const nd = e._alertDist[ny][nx];
                        if (nd < best.d) best = { x: nx, y: ny, d: nd };
                    }
                    if (best.x !== cx || best.y !== cy) {
                        e.target = { x: best.x, y: best.y };
                        e.roamDir = { dx: best.x - cx, dy: best.y - cy };
                    }
                    const md2 = Math.abs(cx - e.alertTarget.x) + Math.abs(cy - e.alertTarget.y);
                    if (md2 <= 1) {
                        // Arrived—clear alert
                        e.alertUntil = 0; e.alertTarget = null; e._alertDist = null;
                        e.roamGoal = null; e.target = null;
                    }
                } else {
                    // 2) Anti-stuck and repetitive-region detection
                    if (!e._visCheckAt || currentTime >= e._visCheckAt) {
                        e._visCheckAt = currentTime + 800;
                        const vx = Math.max(1, Math.min(MAZE_WIDTH - 2, Math.floor(e.fx)));
                        const vy = Math.max(1, Math.min(MAZE_HEIGHT - 2, Math.floor(e.fy)));
                        e.visitLog.push({ x: vx, y: vy, t: currentTime });
                        while (e.visitLog.length > 60) e.visitLog.shift();
                        const windowMs = 12000;
                        const recent = e.visitLog.filter(v => currentTime - v.t <= windowMs);
                        if (recent.length >= 18) {
                            const uniqKey = new Set(recent.map(v => (v.x + 999 * v.y)));
                            if (uniqKey.size < 10) {
                                let sx=0, sy=0; for (const v of recent){ sx += v.x; sy += v.y; }
                                const cx2 = Math.round(sx / recent.length), cy2 = Math.round(sy / recent.length);
                                e.avoidCenter = { x: cx2, y: cy2 };
                                e.avoidUntil = currentTime + 5000;
                                e.roamGoal = null; e.target = null;
                            }
                        }
                    }

                    const needNew = !e.roamGoal || (e.x === e.roamGoal.x && e.y === e.roamGoal.y) || (currentTime - (e._roamGoalSetAt || 0) > 6000);
                    const stuck = (currentTime - (e._lastMoveAt || 0) > 1600);
                    if (needNew || stuck) {
                        const cand = [];
                        for (let i = 0; i < 80; i++) {
                            const rx = 1 + Math.floor(Math.random() * (MAZE_WIDTH - 2));
                            const ry = 1 + Math.floor(Math.random() * (MAZE_HEIGHT - 2));
                            if (!isPassableForEnemy(gameState.maze[ry][rx])) continue;
                            const md = Math.abs(rx - cx) + Math.abs(ry - cy);
                            if (md < 6) continue;
                            if (e.recent && e.recent.some(v => v.x === rx && v.y === ry)) continue;
                            let score = md;
                            if (e.avoidUntil && currentTime < e.avoidUntil && e.avoidCenter) {
                                score += Math.abs(rx - e.avoidCenter.x) + Math.abs(ry - e.avoidCenter.y);
                            }
                            cand.push({ x: rx, y: ry, score });
                        }
                        if (cand.length) {
                            cand.sort((a,b)=> b.score - a.score);
                            const top = Math.max(1, Math.floor(cand.length * 0.5));
                            const pick = cand[Math.floor(Math.random() * top)];
                            e.roamGoal = { x: pick.x, y: pick.y };
                            e._roamGoalSetAt = currentTime;
                            e.path = null; e.pathIndex = 0;
                        } else {
                            e.roamGoal = null;
                        }
                        e.target = null;
                    }

                    if (!e.target && e.roamGoal) {
                        const distFS = bfsDistancesFrom(gameState.maze, cx, cy);
                        let next = { x: cx, y: cy, d: distFS[cy][cx] };
                        for (const s of steps) {
                            const nx = cx + s.dx, ny = cy + s.dy;
                            if (!isPassableForEnemy(gameState.maze[ny][nx])) continue;
                            const nd = distFS[ny][nx];
                            const curG = Math.abs(next.x - e.roamGoal.x) + Math.abs(next.y - e.roamGoal.y);
                            const candG = Math.abs(nx - e.roamGoal.x) + Math.abs(ny - e.roamGoal.y);
                            if (candG < curG || nd < next.d) {
                                next = { x: nx, y: ny, d: nd };
                            }
                        }
                        if (next.x !== cx || next.y !== cy) {
                            e.target = { x: next.x, y: next.y };
                            e.roamDir = { dx: next.x - cx, dy: next.y - cy };
                        }
                    }
                }

                if (e.target) {
                    const tx = e.target.x + 0.5, ty = e.target.y + 0.5;
                    const dx = tx - e.fx, dy = ty - e.fy;
                    const dist = Math.hypot(dx, dy);
                    // Update roamDir to reflect current movement direction for consistent vision
                    const tdx = e.target.x - cx;
                    const tdy = e.target.y - cy;
                    if (tdx !== 0 || tdy !== 0) {
                        e.roamDir = { dx: tdx, dy: tdy };
                    }
                    // Apply slow if active (BATTER)
                    let speedRoam = e.speedRoam;
                    if (e._zapSlowUntil && currentTime < e._zapSlowUntil) speedRoam *= 0.5;
                    const step = speedRoam * dt * localThaw * bazookaSpeedMult;
                    if (dist <= step || dist < 0.0001) {
                        e.fx = tx; e.fy = ty; e.x = e.target.x; e.y = e.target.y; e.target = null;
                        if (e.roamStepsLeft > 0) e.roamStepsLeft--;
                        // Track movement for stuck detection and recent memory
                        e._lastMoveAt = currentTime;
                        e._lastPos = { x: e.fx, y: e.fy };
                        e.recent = e.recent || [];
                        e.recent.push({ x: e.x, y: e.y });
                        if (e.recent.length > 10) e.recent.shift();
                    } else {
                        e.fx += (dx / dist) * step; e.fy += (dy / dist) * step;
                        const moved = Math.hypot(e.fx - (e._lastPos?.x || 0), e.fy - (e._lastPos?.y || 0));
                        if (moved > 0.08) { e._lastMoveAt = currentTime; e._lastPos = { x: e.fx, y: e.fy }; }
                    }
                }

                // Always-moving fallback to keep Seeker from idling in roam
                if (!e.target) {
                    const neighbors = [
                        { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
                    ].filter(s => isPassableForEnemy(gameState.maze[cy + s.dy][cx + s.dx]));
                    if (e.roamDir) {
                        const rev = { dx: -e.roamDir.dx, dy: -e.roamDir.dy };
                        const filtered = neighbors.filter(n => !(n.dx === rev.dx && n.dy === rev.dy));
                        if (filtered.length) neighbors.splice(0, neighbors.length, ...filtered);
                    }
                    if (neighbors.length) {
                        const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
                        e.target = { x: cx + pick.dx, y: cy + pick.dy };
                        e.roamDir = { dx: pick.dx, dy: pick.dy };
                    }
                }

                // Check LOS along facing direction (based on roamDir/target)
                if (canSeePlayerFromEntity(e) && !(e._zapRageLockUntil && currentTime < e._zapRageLockUntil)) {
                    e.state = 'rage';
                    e.rageStartAt = currentTime;
                    e.rageUntil = currentTime + 3000;
                    e.target = null; // force pathing
                    e.lastPathAt = 0;
                    e.flashUntil = currentTime + 300;
                    e.chaseBeepAt = currentTime;
                    try { playSeekerAlert(); } catch {}
                }
            } else if (e.state === 'rage') {
                // If zap rage-lock is active, drop rage immediately
                if (e._zapRageLockUntil && currentTime < e._zapRageLockUntil) {
                    e.state = 'roam';
                    e.rageStartAt = 0;
                    e.rageUntil = 0;
                    e.target = null;
                }
                // Refresh rage timer if LOS is present; do not end early if LOS breaks
                if (canSeePlayerFromEntity(e)) {
                    e.rageUntil = currentTime + 3000;
                    if (!e.rageStartAt) e.rageStartAt = currentTime;
                }
                // Rage pathing: move toward player quickly for up to rageUntil
                if (currentTime - e.lastPathAt >= e.pathInterval || !e.target) {
                    e.lastPathAt = currentTime;
                    const cx2 = Math.max(1, Math.min(MAZE_WIDTH - 2, Math.floor(e.fx)));
                    const cy2 = Math.max(1, Math.min(MAZE_HEIGHT - 2, Math.floor(e.fy)));
                    e.x = cx2; e.y = cy2;
                    let best = { x: cx2, y: cy2, d: distField[cy2][cx2] };
                    for (const s of steps) {
                        const nx = cx2 + s.dx, ny = cy2 + s.dy;
                        if (!isPassableForEnemy(gameState.maze[ny][nx])) continue;
                        const nd = distField[ny][nx];
                        if (nd < best.d) best = { x: nx, y: ny, d: nd };
                    }
                    if (!Number.isFinite(best.d)) {
                        for (const s of steps) {
                            const nx = cx2 + s.dx, ny = cy2 + s.dy;
                            const nd = distField[ny][nx];
                            if (Number.isFinite(nd) && isPassableForEnemy(gameState.maze[ny][nx])) { best = { x: nx, y: ny, d: nd }; break; }
                        }
                    }
                    e.target = { x: best.x, y: best.y };
                }

                // Move toward target
                if (e.target) {
                    const tx = e.target.x + 0.5, ty = e.target.y + 0.5;
                    const dx = tx - e.fx, dy = ty - e.fy;
                    const dist = Math.hypot(dx, dy);
                    let speedRage = e.speedRage;
                    if (e._zapSlowUntil && currentTime < e._zapSlowUntil) speedRage *= 0.5;
                    const step = speedRage * dt * localThaw * bazookaSpeedMult;
                    if (dist <= step || dist < 0.0001) {
                        e.fx = tx; e.fy = ty; e.x = e.target.x; e.y = e.target.y; e.target = null;
                    } else {
                        e.fx += (dx / dist) * step; e.fy += (dy / dist) * step;
                    }
                }

                // Beep periodically while in rage
                if (currentTime >= (e.chaseBeepAt || 0)) {
                    try { playSeekerBeep(); } catch {}
                    e.chaseBeepAt = currentTime + 400;
                }

                // End rage after timer
                if (currentTime >= e.rageUntil && !canSeePlayerFromEntity(e)) {
                    e.state = 'roam';
                    e.target = null;
                    e.rageStartAt = 0;
                }
            }

            e.lastUpdateAt = currentTime;

            // Zap trap trigger (exactly like chaser)
            triggerZapIfOnTile(e);

            // Collision check (skip while generator UI is open)
            const pdx = (gameState.player.x + 0.5) - e.fx;
            const pdy = (gameState.player.y + 0.5) - e.fy;
            const pDist = Math.hypot(pdx, pdy);
            if (pDist < 0.5 && !gameState.isGeneratorUIOpen) { gameState._lastHitType = 'seeker'; handleEnemyHit(currentTime); }
            // After movement updates below, we'll also check for traps to trigger
            // Skip other logic while stunned
            continue;
        }
        // Recompute immediate target periodically using gradient descent on distField
        if (currentTime - e.lastPathAt >= e.pathInterval || !e.target) {
            e.lastPathAt = currentTime;
            const cx = Math.max(1, Math.min(MAZE_WIDTH - 2, Math.floor(e.fx)));
            const cy = Math.max(1, Math.min(MAZE_HEIGHT - 2, Math.floor(e.fy)));
            e.x = cx; e.y = cy; // sync grid cell
            let best = { x: cx, y: cy, d: distField[cy][cx] };
            for (const s of steps) {
                const nx = cx + s.dx, ny = cy + s.dy;
                if (!isPassableForEnemy(gameState.maze[ny][nx])) continue;
                const nd = distField[ny][nx];
                if (nd < best.d) best = { x: nx, y: ny, d: nd };
            }
            // If current position has Infinity (unreachable), pick any finite neighbor to rejoin
            if (!Number.isFinite(best.d)) {
                for (const s of steps) {
                    const nx = cx + s.dx, ny = cy + s.dy;
                    const nd = distField[ny][nx];
                    if (Number.isFinite(nd) && isPassableForEnemy(gameState.maze[ny][nx])) { best = { x: nx, y: ny, d: nd }; break; }
                }
            }
            e.target = { x: best.x, y: best.y };

            // Consider a jump across one wall if off cooldown and beneficial
            // Telegraph the jump for 1s before executing to give the player time to react
            if (e.telegraphUntil && currentTime >= e.telegraphUntil && e.pendingJump) {
                // Execute pending jump now
                const fromFx = e.fx, fromFy = e.fy;
                const j = e.pendingJump;
                e.fx = j.x + 0.5;
                e.fy = j.y + 0.5;
                e.x = j.x; e.y = j.y;
                e.target = null;
                e.pendingJump = null;
                e.telegraphUntil = 0;
                e.lastJumpAt = currentTime;
                e.lastJumpFrom = { fx: fromFx, fy: fromFy };
                e.jumpFlashUntil = currentTime + 220;
                try { playChaserJump(); } catch {}
            } else if (!e.telegraphUntil && currentTime - e.lastJumpAt >= e.jumpCooldown) {
                // Evaluate all 4 jump directions and choose the most beneficial
                let bestJump = null;
                let bestGain = -Infinity;
                const curD = distField[cy][cx];
                let neighborBest = curD;
                for (const s of steps) {
                    const nx = cx + s.dx, ny = cy + s.dy;
                    if (isPassableForEnemy(gameState.maze[ny][nx])) {
                        const nd = distField[ny][nx];
                        if (Number.isFinite(nd)) neighborBest = Math.min(neighborBest, nd);
                    }
                }
                for (const s of steps) {
                    const wx = cx + s.dx, wy = cy + s.dy; // wall cell
                    const jx = cx + 2 * s.dx, jy = cy + 2 * s.dy; // landing cell
                    if (wx <= 0 || wx >= MAZE_WIDTH - 1 || wy <= 0 || wy >= MAZE_HEIGHT - 1) continue;
                    if (jx <= 0 || jx >= MAZE_WIDTH - 1 || jy <= 0 || jy >= MAZE_HEIGHT - 1) continue;
                    if (gameState.maze[wy][wx] !== CELL.WALL) continue; // must be a wall to jump over
                    if (!isPassableForEnemy(gameState.maze[jy][jx])) continue;
                    const landD = distField[jy][jx];
                    if (!Number.isFinite(landD)) continue;
                    // Gain compared to best walking option this tick
                    const gain = Math.min(curD, neighborBest) - (landD + 1);
                    if (gain > bestGain) {
                        bestGain = gain;
                        bestJump = { x: jx, y: jy };
                    }
                }
                // Only jump if it meaningfully shortens the path (threshold)
                const threshold = 2;
                if (bestJump && bestGain >= threshold) {
                    e.pendingJump = bestJump;
                    e.telegraphUntil = currentTime + 200; // brief telegraph
                    e.target = null;
                    try { playChaserTelegraph(); } catch {}
                }
            }
        }

        // Smoothly move towards target cell center
        if (e.target && !(e.telegraphUntil && currentTime < e.telegraphUntil)) {
            const tx = e.target.x + 0.5;
            const ty = e.target.y + 0.5;
            const dx = tx - e.fx;
            const dy = ty - e.fy;
            const dist = Math.hypot(dx, dy);
            const speed = (e.speedBase + e.speedPerGen * completed); // tiles/sec (CHASER)
            const last = e.lastUpdateAt || currentTime;
            const dt = Math.max(0, (currentTime - last) / 1000);
            // Apply slow if active
            let sMul = 1;
            if (e._zapSlowUntil && currentTime < e._zapSlowUntil) sMul = 0.5;
            const step = speed * dt * thawMult * sMul * bazookaSpeedMult;
            if (dist <= step || dist < 0.0001) {
                e.fx = tx; e.fy = ty;
                e.x = e.target.x; e.y = e.target.y;
                e.target = null; // will choose next on next path tick
                // update movement tracking for failsafe
                e._lastMoveAt = currentTime; e._lastPos = { x: e.fx, y: e.fy };
            } else {
                e.fx += (dx / dist) * step;
                e.fy += (dy / dist) * step;
                const moved = Math.hypot(e.fx - (e._lastPos?.x || 0), e.fy - (e._lastPos?.y || 0));
                if (moved > 0.08) { e._lastMoveAt = currentTime; e._lastPos = { x: e.fx, y: e.fy }; }
            }
            e.lastUpdateAt = currentTime;
        } else {
            e.lastUpdateAt = currentTime;
        }

        // Failsafe: if chaser hasn't moved for 2s, pick a random valid neighbor to unstick
        if ((e._lastMoveAt || 0) && (currentTime - e._lastMoveAt > 2000)) {
            const cx = Math.max(1, Math.min(MAZE_WIDTH - 2, Math.floor(e.fx)));
            const cy = Math.max(1, Math.min(MAZE_HEIGHT - 2, Math.floor(e.fy)));
            const neigh = [];
            for (const s of steps) {
                const nx = cx + s.dx, ny = cy + s.dy;
                if (isPassableForEnemy(gameState.maze[ny][nx])) neigh.push({ x: nx, y: ny });
            }
            if (neigh.length) {
                const pick = neigh[Math.floor(Math.random() * neigh.length)];
                e.target = pick;
            }
            e._lastMoveAt = currentTime;
        }

        // Zap trap trigger (exactly like chaser)
        triggerZapIfOnTile(e);

        // Collision with player (use proximity and invincibility window); skip during generator UI
        const pdx = (gameState.player.x + 0.5) - e.fx;
        const pdy = (gameState.player.y + 0.5) - e.fy;
        const pDist = Math.hypot(pdx, pdy);
        if (pDist < 0.5 && !gameState.isGeneratorUIOpen) { gameState._lastHitType = 'chaser'; handleEnemyHit(currentTime); }
    }
    // Cleanup despawned boss pigs
    gameState.enemies = gameState.enemies.filter(e => !e._despawn);

    // (projectile updates moved to the top of this function)
}

function handleEnemyHit(currentTime) {
    if (currentTime < gameState.playerInvincibleUntil) return;
    if (gameState.godMode) return;
    // Check if player is stunned - any enemy contact while stunned is instakill
    if (gameState.playerStunned) {
        gameState.lives = 0;
        gameState.deathCause = gameState._lastHitType || 'enemy';
        gameState.gameStatus = 'lost';
        setStatusMessage('Instakill! You were hit while stunned!');
        return;
    }
    gameState.lives--;
    setStatusMessage('Hit! You are invincible for 2s');
    // During the boss fight, do not apply the grayscale freeze/pause effect
    if (!(gameState.boss && gameState.boss.active)) {
        gameState.enemiesFrozenUntil = currentTime + 2000;
    }
    gameState.playerInvincibleUntil = currentTime + 2000;
    
    // Play hit sound and spawn damage particles at player position
    try { playEnemyHit(); } catch {}
    const px = (gameState.player.x + 0.5) * CELL_SIZE;
    const py = (gameState.player.y + 0.5) * CELL_SIZE;
    particles.spawn('damage', px, py, 15);
    
    if (gameState.lives <= 0) {
        gameState.deathCause = gameState._lastHitType || 'enemy';
        gameState.gameStatus = 'lost';
        // Reset current run timer on death
        gameState.runActive = false;
        gameState.runStartAt = 0;
        gameState.runTimeMs = 0;
    }
}

function handleBatterHit(currentTime) {
    // Batter hit stuns player for 4 seconds and Batter flees until stun ends
    if (currentTime < gameState.playerInvincibleUntil) return;
    if (gameState.godMode) return;

    gameState.playerStunned = true;
    gameState.playerStunUntil = currentTime + 4000;
    gameState.playerStunStart = currentTime;
    setStatusMessage('STUNNED for 4 seconds!');
    // Coordinate other enemies: aggro until stun ends
    gameState.coordinatedAggroUntil = gameState.playerStunUntil;
    
    // Play hit sound and spawn damage particles at player position
    try { playEnemyHit(); } catch {}
    const px = (gameState.player.x + 0.5) * CELL_SIZE;
    const py = (gameState.player.y + 0.5) * CELL_SIZE;
    particles.spawn('damage', px, py, 15);

    // Put batter into flee mode - move away until stun ends
    const batter = gameState.enemies.find(e => e.type === 'batter');
    if (batter) {
        batter.state = 'flee';
        batter.proximityStartTime = 0;
        batter.target = null;
        batter.roamGoal = null; // will pick new goal away from player
        try { playBatterFlee(); } catch {}
    }
}

export function attemptGeneratorInteraction(currentTime) {
    if (gameState.isGeneratorUIOpen || gameState.gameStatus !== 'playing' || gameState.playerStunned) return;
    
    const index = gameState.generators.findIndex(gen => {
        if (gen.completed) return false;
        const distance = Math.abs(gen.x - gameState.player.x) + Math.abs(gen.y - gameState.player.y);
        return distance === 1;
    });
    
    if (index !== -1) {
        const gen = gameState.generators[index];
        if (gen.blockedUntil && currentTime < gen.blockedUntil) {
            const remaining = Math.ceil((gen.blockedUntil - currentTime) / 1000);
            setStatusMessage(`This generator is blocked for ${remaining}s!`);
            return;
        }
        beginGeneratorSession(index, currentTime);
    } else {
        setStatusMessage('You need to be next to a generator to repair it.');
    }
}

export function beginGeneratorSession(index, currentTime) {
    gameState.isGeneratorUIOpen = true;
    gameState.activeGeneratorIndex = index;
    gameState.generatorStartTime = currentTime;
    gameState.generatorProgress = 0;
    gameState.completedSkillChecks = [];
    gameState.triggeredSkillChecks = [];
    gameState.skillCheckState = null;
    gameState.isJumpCharging = false;
    gameState.isSprinting = false;
    gameState.statusMessage = '';

    // Start first skill check immediately (sequential flow)
    startSkillCheck(0, currentTime);
}

export function updateGeneratorProgress(currentTime) {
    if (!gameState.isGeneratorUIOpen) return;

    // Progress is based on completed skill checks (sequential 3 checks)
    const target = Math.floor((gameState.completedSkillChecks.length / SKILL_CHECKS.length) * 100);
    // Smoothly approach target for a nicer UI fill
    if (gameState.generatorProgress < target) {
        gameState.generatorProgress = Math.min(target, gameState.generatorProgress + 2);
    }
}

export function startSkillCheck(index, currentTime) {
    const config = SKILL_CHECKS[index];
    // Pick start angle so it does NOT occupy the first 90° and does NOT wrap across 0°.
    // This guarantees the pointer (which starts at 0°) always has reaction time before reaching the zone.
    const minStart = SKILL_WINDOW_MIN_START;
    const maxStart = 360 - config.windowSize; // prevent wrapping over 0°
    const span = Math.max(0, maxStart - minStart);
    const windowStart = minStart + Math.random() * span;
    const rotationTime = config.rotationTime || SKILL_CHECK_ROTATION_TIME;
    
    gameState.skillCheckState = {
        index,
        windowStart,
        windowSize: config.windowSize,
        pointerAngle: 0,
        rotationTime,
        hasAttempted: false,
        failedAfterWindow: false,
        enteredWindow: false
    };
    
    gameState.skillCheckStartTime = currentTime;
    gameState.triggeredSkillChecks.push(index);
    gameState.skillCheckFlash = null;
    playSkillSpawn();
}

export function updateSkillCheck(currentTime) {
    if (!gameState.skillCheckState) return;
    
    const sc = gameState.skillCheckState;
    const elapsed = currentTime - gameState.skillCheckStartTime;
    const rotationTime = sc.rotationTime || SKILL_CHECK_ROTATION_TIME;
    const progress = (elapsed % rotationTime) / rotationTime;
    sc.pointerAngle = progress * 360;

    // If pointer has passed beyond the end of the success window without an attempt, fail immediately
    if (!sc.hasAttempted && !sc.failedAfterWindow) {
        const normalizedPointer = ((sc.pointerAngle % 360) + 360) % 360;
        const normalizedStart = ((sc.windowStart % 360) + 360) % 360;
        const relative = (normalizedPointer - normalizedStart + 360) % 360;
        // Mark when pointer enters the success window once
        if (relative <= sc.windowSize) {
            sc.enteredWindow = true;
        } else if (sc.enteredWindow && relative > sc.windowSize) {
            // Only fail after we've actually entered and then left the window
            sc.failedAfterWindow = true;
            playSkillFail();
            gameState.skillCheckFlash = { type: 'fail', until: performance.now() + 200 };
            setTimeout(() => failGenerator('You missed the skill check!'), 180);
        }
    }
}

export function attemptSkillCheck() {
    if (!gameState.skillCheckState) return false;
    
    const sc = gameState.skillCheckState;
    sc.hasAttempted = true;
    const { pointerAngle, windowStart, windowSize } = sc;
    
    // Calculate relative position of pointer from window start
    const normalizedPointer = ((pointerAngle % 360) + 360) % 360;
    const normalizedStart = ((windowStart % 360) + 360) % 360;
    
    // Calculate how far the pointer is from the start of the window (clockwise)
    let relativeAngle = (normalizedPointer - normalizedStart + 360) % 360;
    
    // Success if pointer is within the window size
    const success = relativeAngle <= windowSize;
    
    if (success) {
        gameState.completedSkillChecks.push(gameState.skillCheckState.index);
        setStatusMessage('Skill check success!', 1500);
        playSkillSuccess();
        gameState.skillCheckFlash = { type: 'success', until: performance.now() + 220 };
        gameState.skillCheckState = null;
        if (gameState.skillCheckTimeout) {
            clearTimeout(gameState.skillCheckTimeout);
            gameState.skillCheckTimeout = null;
        }
        // Start next check immediately (with slight delay to show flash) or complete generator
        const nextIndex = gameState.completedSkillChecks.length;
        if (nextIndex >= SKILL_CHECKS.length) {
            // Fill bar to 100 and complete
            gameState.generatorProgress = 100;
            setTimeout(() => completeGenerator(), 180);
        } else {
            setTimeout(() => startSkillCheck(nextIndex, performance.now()), 300);
        }
        return true;
    } else {
        playSkillFail();
        gameState.skillCheckFlash = { type: 'fail', until: performance.now() + 200 };
        setTimeout(() => failGenerator('You missed the skill check!'), 180);
        return false;
    }
}

export function completeGenerator() {
    if (gameState.activeGeneratorIndex === null) return;
    
    const gen = gameState.generators[gameState.activeGeneratorIndex];
    gen.completed = true;
    gen.progress = 100;
    
    gameState.maze[gen.y][gen.x] = CELL.EMPTY;
    
    const completedCount = gameState.generators.filter(g => g.completed).length;
    setStatusMessage(`Generator repaired (${completedCount}/${gameState.generators.length})`);

    // Reward: grant one Zap Trap from Level 2 onward (and in Endless)
    if (gameState.mode === 'endless' || (gameState.currentLevel && gameState.currentLevel >= 2)) {
        let zapReward = 1;
        // Bonus zap traps in endless mode at higher streaks
        if (gameState.mode === 'endless' && gameState.endlessConfig) {
            const streak = gameState.endlessConfig.streak || 0;
            if (streak >= 20) zapReward = 3; // 3 traps at 20+ streak
            else if (streak >= 10) zapReward = 2; // 2 traps at 10+ streak
        }
        gameState.zapTraps = (gameState.zapTraps || 0) + zapReward;
        setStatusMessage(`Zap Trap +${zapReward}`);
    }
    
    closeGeneratorInterface();
    
    if (completedCount === gameState.generators.length) {
        setTimeout(() => {
            setStatusMessage('All generators repaired! The exit is unlocked.', 5000);
        }, 1000);
    }
}

export function failGenerator(message) {
    if (gameState.activeGeneratorIndex !== null) {
        const gen = gameState.generators[gameState.activeGeneratorIndex];
        gen.progress = 0;
        gen.failCount = (gen.failCount || 0) + 1;
        // Alert Seeker to the generator area on any fail
        addSeekerAlert(gen.x, gen.y, performance.now(), 6000);

        if (gen.failCount >= 2) {
            // Penalize player and block generator for 10s
            gen.failCount = 0; // reset after penalty
            gen.blockedUntil = performance.now() + 10000;
            // Only on the second fail, enrage the Batter
            addBatterNoiseRage(performance.now(), 3500);
            if (!gameState.godMode) {
                gameState.lives--;
            }
            if (gameState.lives <= 0) {
                gameState.deathCause = 'generator_fail';
                gameState.gameStatus = 'lost';
            }
            setStatusMessage('You botched it twice! -1 life. Generator blocked 10s.');
        } else {
            setStatusMessage(message);
        }
    } else {
        setStatusMessage(message);
    }

    closeGeneratorInterface();
}

export function closeGeneratorInterface() {
    gameState.isGeneratorUIOpen = false;
    gameState.activeGeneratorIndex = null;
    gameState.generatorStartTime = null;
    gameState.generatorProgress = 0;
    gameState.skillCheckState = null;
    gameState.completedSkillChecks = [];
    gameState.triggeredSkillChecks = [];
    gameState.skillCheckFlash = null;
    
    if (gameState.skillCheckTimeout) {
        clearTimeout(gameState.skillCheckTimeout);
        gameState.skillCheckTimeout = null;
    }
    
    // Hide threat indicators
    const mortarIndicator = document.getElementById('mortarThreatIndicator');
    const batterIndicator = document.getElementById('batterThreatIndicator');
    if (mortarIndicator) mortarIndicator.style.display = 'none';
    if (batterIndicator) batterIndicator.style.display = 'none';
    
    // On closing the generator UI, ease enemies back in over 2s
    gameState.enemiesThawUntil = performance.now() + ENEMY_THAW_TIME;
}
