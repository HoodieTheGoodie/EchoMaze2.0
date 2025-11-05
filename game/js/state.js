// state.js - Game state management

import { generateMaze, CELL } from './maze.js';
import { getDefaultLevelConfig, isGodMode } from './config.js';
import { playSkillSpawn, playSkillSuccess, playSkillFail, playPigTelegraph, playPigDash, playShieldUp, playShieldReflect, playShieldBreak, playShieldRecharge, playPigHit, playChaserTelegraph, playChaserJump, playStep, playSeekerAlert, playSeekerBeep, playZapPlace, playZapTrigger, playZapExpire, playBatterRage, playBatterFlee, playShieldHum, playShieldShatter } from './audio.js';

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

// Enemy thaw-in duration after pauses/generator UI (ms)
export const ENEMY_THAW_TIME = 2000;

// Teleport pad timings (ms)
export const TELEPORT_CHARGE_TIME = 1000;
export const TELEPORT_COOLDOWN_TIME = 1800;

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
    let seed = 1;
    let genCount = 3;
    if (gameState.mode === 'endless') {
        // Build a config from endless settings; use a fresh random seed each run
        const cfg = gameState.endlessConfig || { chaser: false, pig: false, seeker: false, batter: false, difficulty: 'normal', generatorCount: 3 };
        gameState.difficulty = cfg.difficulty === 'super' ? 'super' : 'normal';
        genCount = cfg.generatorCount === 5 ? 5 : 3;
        seed = (Date.now() ^ Math.floor(Math.random() * 0xFFFFFFFF)) >>> 0;
        gameState.levelConfig = { generatorCount: genCount, enemyEnabled: !!cfg.chaser, flyingPig: !!cfg.pig, seeker: !!cfg.seeker, batter: !!cfg.batter, seed };
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
    // Player stun state
    gameState.playerStunned = false;
    gameState.playerStunUntil = 0;
    // Apply a brief thaw period on level start
    gameState.enemiesThawUntil = performance.now() + ENEMY_THAW_TIME;
}

export function triggerEnemiesThaw(currentTime) {
    gameState.enemiesThawUntil = currentTime + ENEMY_THAW_TIME;
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
        
        if (cellType === CELL.GENERATOR) {
            collision = true;
            hitGenerator = true;
            break;
        }
        
        if (cellType === CELL.WALL && !sprintActive) {
            collision = true;
            break;
        }
        
        if (cellType === CELL.WALL && sprintActive) {
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
            finishRun(currentTime);
            gameState.gameStatus = 'won';
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
            } else {
                // Life penalty unless in god mode, throttle by 500ms
                if (currentTime - (gameState.lastCollisionTime || 0) > 500) {
                    gameState.lastCollisionTime = currentTime;
                    if (!gameState.godMode) {
                        gameState.lives--;
                        if (gameState.lives <= 0) {
                            gameState.deathCause = 'wall';
                            gameState.gameStatus = 'lost';
                        }
                    }
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

export function performJump(dx, dy, currentTime) {
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
        finishRun(currentTime);
        gameState.gameStatus = 'won';
    }
    
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
    gameState.blockUntil = currentTime + dur;
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
    gameState.blockAngle = Math.atan2(dy, dx);
}

export function updateBlock(currentTime) {
    if (gameState.blockActive && currentTime >= gameState.blockUntil) {
        gameState.blockActive = false;
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
    // Ensure stamina remains at 0 and cooldown is running
    gameState.stamina = 0;
    gameState.isStaminaCoolingDown = true;
    gameState.staminaCooldownEnd = currentTime + STAMINA_COOLDOWN_TIME;
}

export function updateStaminaCooldown(currentTime) {
    if (gameState.isStaminaCoolingDown) {
        // Show progressive regen over the 15s cooldown
        const total = STAMINA_COOLDOWN_TIME;
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

function bfsDistancesFrom(maze, startX, startY) {
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

function updateFlyingPig(e, currentTime, px, py) {
    // Handle timers for weakened/knocked states
    if (e.state !== 'flying' && currentTime >= e.stateUntil) {
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
        } else if (e.telegraphUntil && currentTime >= e.telegraphUntil && e.dashInfo) {
            // Fire once from current position, then wait until projectile resolves
            const ang = Math.atan2((ty - e.fy), (tx - e.fx));
            const proj = fireHalfArcProjectile(e, ang, currentTime);
            e.dashInfo.projectile = proj;
            e.dashInfo.halted = true; // use halted as 'waiting'
            e.dashInfo.haltUntil = currentTime + 4000; // safety timeout
            e.dashInfo.fired = true;
            e.telegraphUntil = 0;
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
            const step = e.circleSpeed * dt * thawMult;
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
        lastUpdate: currentTime
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
    if (!gameState.enemies || gameState.enemies.length === 0) return;

    // Do NOT globally freeze during generator UI; we'll skip collision hits while UI is open

    // Freeze effect: pause enemies
    if (currentTime < gameState.enemiesFrozenUntil) return;

    // Compute thaw multiplier (0..1) for gradual unfreeze after pause/generator
    let thawMult = 1;
    if (currentTime < gameState.enemiesThawUntil) {
        const remain = Math.max(0, gameState.enemiesThawUntil - currentTime);
        thawMult = 1 - Math.min(1, remain / ENEMY_THAW_TIME);
    }

    const px = gameState.player.x;
    const py = gameState.player.y;

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
        if (e.type === 'flying_pig') {
            updateFlyingPig(e, currentTime, px, py);
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
                    const step = e.speedRage * dt * localThaw; // flee as fast as possible
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
                    const step = speedRoam * dt * localThaw;
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
                // Player not stunned anymore; fall back to roam next tick
                e.state = 'roam';
                e.roamGoal = null; e.target = null; e.proximityStartTime = 0;
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
                    const step = speedRage * dt * localThaw;
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

            // Collision check - stun player instead of damage (skip while generator UI is open)
            const pdx = (gameState.player.x + 0.5) - e.fx;
            const pdy = (gameState.player.y + 0.5) - e.fy;
            const pDist = Math.hypot(pdx, pdy);
            if (pDist < 0.5 && !gameState.isGeneratorUIOpen) {
                handleBatterHit(currentTime);
            }
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
                    // Apply slow if active
                    let speedRoam = e.speedRoam;
                    if (e._zapSlowUntil && currentTime < e._zapSlowUntil) speedRoam *= 0.5;
                    const step = speedRoam * dt * localThaw;
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
                    // Apply slow if active
                    let speedRage = e.speedRage;
                    if (e._zapSlowUntil && currentTime < e._zapSlowUntil) speedRage *= 0.5;
                    const step = speedRage * dt * localThaw;
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
            const speed = (e.speedBase + e.speedPerGen * completed); // tiles/sec
            const last = e.lastUpdateAt || currentTime;
            const dt = Math.max(0, (currentTime - last) / 1000);
            // Apply slow if active
            let sMul = 1;
            if (e._zapSlowUntil && currentTime < e._zapSlowUntil) sMul = 0.5;
            const step = speed * dt * thawMult * sMul;
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

    // Update projectiles (e.g., Flying_Pig half-arc)
    if (gameState.projectiles && gameState.projectiles.length) {
        const now = currentTime;
        for (const p of gameState.projectiles) {
            if (p.resolved) continue;
            // Move projectile
            const dt = Math.max(0, (now - (p.lastUpdate || now)) / 1000);
            p.lastUpdate = now;
            p.x += (p.vx || 0) * dt;
            p.y += (p.vy || 0) * dt;
            // Off-screen cleanup
            if (p.x < -1 || p.x > MAZE_WIDTH + 1 || p.y < -1 || p.y > MAZE_HEIGHT + 1) {
                p.resolved = true;
                continue;
            }

            // Collision with player
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
                        const bx = Math.cos(gameState.blockAngle), by = Math.sin(gameState.blockAngle);
                        const towardPlayer = -((p.vx * bx) + (p.vy * by));
                        if (towardPlayer > 0) {
                            // Strong projectile damage (may break shield)
                            // Pig projectile should be reflectable by the shield (no instant break)
                            const result = onShieldHit('projectile', 0.6, now);
                            if (result === 'break') {
                                // Absorb projectile on break
                                p.resolved = true;
                            } else {
                                // reflect: reverse velocity and angle, mark reflected
                                p.vx = -p.vx; p.vy = -p.vy; p.angle = (p.angle + Math.PI) % (Math.PI * 2);
                                p.reflected = true;
                                p.sourceId = null;
                                // Nudge out to avoid immediate re-collide
                                p.x += p.vx * 0.02; p.y += p.vy * 0.02;
                                try { playShieldReflect(); } catch {}
                            }
                        }
                    }
                    // If not reflected, instant kill
                    if (!p.reflected && gameState.gameStatus === 'playing' && !gameState.godMode) {
                        gameState.lives = 0;
                        gameState.deathCause = 'pig_projectile';
                        gameState.gameStatus = 'lost';
                        setStatusMessage('You were hit by a projectile!');
                        p.resolved = true;
                        continue;
                    }
                }
            }

            // Collision with Flying_Pig when reflected
            if (p.reflected) {
                const pig = gameState.enemies.find(e => e.type === 'flying_pig' && e.state === 'flying');
                if (pig) {
                    const vx = pig.fx - p.x;
                    const vy = pig.fy - p.y;
                    const d = Math.hypot(vx, vy);
                    if (d <= (p.radius + 0.4)) {
                        // Ensure pig is in front half of projectile direction
                        const fx = Math.cos(p.angle), fy = Math.sin(p.angle);
                        const dot2 = (vx * fx + vy * fy) / (d || 1);
                        if (dot2 >= 0) {
                            // Enter weakened state: stop moving and allow 10s to tag for knock-out
                            pig.state = 'weakened';
                            pig.stateUntil = now + 10000;
                            pig._stateStartAt = now;
                            pig.telegraphUntil = 0;
                            pig.dashInfo = null;
                            pig._dashActive = false;
                            // Drop pig onto reachable tile
                            const distField2 = bfsDistancesFrom(gameState.maze, gameState.player.x, gameState.player.y);
                            const drop = findReachableDropTile(distField2, pig.fx, pig.fy);
                            pig.x = drop.x; pig.y = drop.y;
                            pig.fx = drop.x + 0.5; pig.fy = drop.y + 0.5;
                            pig.lastUpdateAt = now;
                            pig._hitFlashUntil = now + 180;
                            try { playPigHit(); } catch {}
                            p.resolved = true;
                        }
                    }
                }
            }
        }
        // Remove resolved ones
        gameState.projectiles = gameState.projectiles.filter(p => !p.resolved);
    }
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
    gameState.enemiesFrozenUntil = currentTime + 2000;
    gameState.playerInvincibleUntil = currentTime + 2000;
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
        gameState.zapTraps = (gameState.zapTraps || 0) + 1;
        setStatusMessage('Zap Trap +1');
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
    // On closing the generator UI, ease enemies back in over 2s
    gameState.enemiesThawUntil = performance.now() + ENEMY_THAW_TIME;
}
