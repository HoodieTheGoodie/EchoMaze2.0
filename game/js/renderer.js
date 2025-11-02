// renderer.js - Canvas rendering

import { gameState, SKILL_CHECK_ROTATION_TIME, MAZE_WIDTH, MAZE_HEIGHT, TELEPORT_CHARGE_TIME, COLLISION_SHIELD_RECHARGE_TIME, COLLISION_SHIELD_BREAK_FLASH, getRunClock } from './state.js';
import { CELL } from './maze.js';

const CELL_SIZE = 20;
const canvas = document.getElementById('canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
// Cache UI elements to reduce per-frame query costs
const ui = {
    overlay: document.getElementById('overlay'),
    status: document.getElementById('status'),
    health: document.getElementById('health'),
    stamina: document.getElementById('stamina'),
    staminaFill: document.getElementById('staminaFill'),
    shield: document.getElementById('shieldStatus'),
    generators: document.getElementById('generators'),
    jumpIndicator: document.getElementById('jumpIndicator'),
    streak: document.getElementById('streak'),
    streakSection: document.getElementById('streakSection'),
    skill: null
};
const FLOOR_COLOR = '#6b3f1d'; // darker orange floor for contrast
// Improve text rendering for timer
ctx && (ctx.font = '14px Arial');

console.log('Renderer loaded - Canvas:', canvas, 'Context:', ctx);

// Offscreen cached background for static maze (walls/floor)
let mazeBaseCanvas = null;
let mazeBaseDirty = true;
let lastMazeRef = null;

function buildMazeBase() {
    if (!canvas || !gameState.maze) return;
    mazeBaseCanvas = document.createElement('canvas');
    mazeBaseCanvas.width = canvas.width;
    mazeBaseCanvas.height = canvas.height;
    const bctx = mazeBaseCanvas.getContext('2d');
    // Draw static walls/floor only (no exit/generators)
    for (let y = 0; y < MAZE_HEIGHT; y++) {
        for (let x = 0; x < MAZE_WIDTH; x++) {
            const cellType = gameState.maze[y][x];
            const px = x * CELL_SIZE;
            const py = y * CELL_SIZE;
            if (cellType === CELL.WALL) {
                bctx.fillStyle = '#333';
                bctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
            } else {
                bctx.fillStyle = FLOOR_COLOR;
                bctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
            }
        }
    }
    mazeBaseDirty = false;
}

export function render(currentTime) {
    // Safety check
    if (!canvas || !ctx || !gameState.maze) return;
    if (lastMazeRef !== gameState.maze) { mazeBaseDirty = true; lastMazeRef = gameState.maze; }
    if (!mazeBaseCanvas || mazeBaseDirty) buildMazeBase();
    
    // Screen effect during enemy freeze (on hit)
    if (currentTime < gameState.enemiesFrozenUntil) {
        canvas.style.filter = 'grayscale(100%) contrast(110%)';
    } else {
        canvas.style.filter = 'none';
    }

    // Clear and draw static background in one blit
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (mazeBaseCanvas) ctx.drawImage(mazeBaseCanvas, 0, 0);
    // Overlay dynamic exit color and generators, entities, etc.
    drawDynamicMazeOverlays();
    drawTraps(currentTime);
    drawGenerators(currentTime);
    drawEnemies(currentTime);
    drawProjectiles(currentTime);
    drawPlayer();
    drawUI();
    
    if (gameState.isGeneratorUIOpen) {
        drawGeneratorOverlay(currentTime);
    } else {
        // Ensure overlay is hidden when not in generator UI
        if (ui.overlay) ui.overlay.style.display = 'none';
    }
    
    if (gameState.statusMessage) {
        drawStatusMessage();
    } else {
        if (ui.status) ui.status.style.display = 'none';
    }
    
    if (gameState.gameStatus === 'lost') {
        drawGameOver();
    }
}

function drawEnemies(currentTime) {
    if (!gameState.enemies) return;
    for (const e of gameState.enemies) {
        const cx = e.fx * CELL_SIZE;
        const cy = e.fy * CELL_SIZE;
        const r = CELL_SIZE / 2 - 3;
        if (e.type === 'flying_pig') {
            // Flying_Pig visuals
            let baseCol = '#ff69b4'; // default pink
            // Telegraph flash (alternate yellow/pink)
            if (e.telegraphUntil && currentTime < e.telegraphUntil) {
                const blink = Math.floor(currentTime / 100) % 2 === 0;
                baseCol = blink ? '#FFD700' : '#ff69b4';
            } else if (e.state === 'weakened' || e.state === 'knocked_out') {
                // Fade from dark gray toward pink while recovering (both states)
                const gray = { r: 68, g: 68, b: 68 };
                const pink = { r: 255, g: 105, b: 180 };
                const total = Math.max(1, (e.stateUntil || currentTime) - (e._stateStartAt || currentTime));
                const remain = Math.max(0, (e.stateUntil || currentTime) - currentTime);
                const t = 1 - Math.min(1, remain / total);
                const rr = Math.round(gray.r + (pink.r - gray.r) * t);
                const gg = Math.round(gray.g + (pink.g - gray.g) * t);
                const bb = Math.round(gray.b + (pink.b - gray.b) * t);
                baseCol = `rgb(${rr},${gg},${bb})`;
            }
            ctx.fillStyle = baseCol;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
            // eyes
            ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(cx-3, cy-2, 2, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(cx+3, cy-2, 2, 0, Math.PI*2); ctx.fill();
            if (e.state === 'flying') {
                // Wings (triangles) left/right
                ctx.fillStyle = '#ffd1ec';
                ctx.beginPath(); ctx.moveTo(cx - r - 2, cy); ctx.lineTo(cx - r - 10, cy - 8); ctx.lineTo(cx - r - 10, cy + 8); ctx.closePath(); ctx.fill();
                ctx.beginPath(); ctx.moveTo(cx + r + 2, cy); ctx.lineTo(cx + r + 10, cy - 8); ctx.lineTo(cx + r + 10, cy + 8); ctx.closePath(); ctx.fill();
                // Dash aura
                if (e._dashActive) {
                    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
                    ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2); ctx.stroke();
                }
                // Hit flash overlay
                if (e._hitFlashUntil && currentTime < e._hitFlashUntil) {
                    const t = (e._hitFlashUntil - currentTime) / 180;
                    ctx.save();
                    ctx.globalAlpha = Math.max(0, Math.min(1, t));
                    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
                    ctx.lineWidth = 3;
                    ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, Math.PI * 2); ctx.stroke();
                    ctx.restore();
                }
            } else if (e.state === 'knocked_out') {
                // Red X overlay when knocked out
                ctx.strokeStyle = '#ff4444';
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r); ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r); ctx.stroke();
            }
        } else if (e.type === 'seeker') {
            // Seeker visuals: green normally. In rage, flash and fade toward green as timer runs out.
            const enraged = e.state === 'rage';
            let baseCol = '#32cd32'; // lime green
            if (enraged) {
                const start = e.rageStartAt || (currentTime - 1);
                const total = Math.max(1, (e.rageUntil || currentTime) - start);
                const remain = Math.max(0, (e.rageUntil || currentTime) - currentTime);
                const t = Math.min(1, Math.max(0, 1 - (remain / total))); // 0 at start (red) -> 1 at end (green)
                // Mix red->green
                const rCol = { r: 255, g: 68, b: 68 };
                const gCol = { r: 50, g: 205, b: 50 };
                const rr = Math.round(rCol.r + (gCol.r - rCol.r) * t);
                const gg = Math.round(rCol.g + (gCol.g - rCol.g) * t);
                const bb = Math.round(rCol.b + (gCol.b - rCol.b) * t);
                baseCol = `rgb(${rr},${gg},${bb})`;
                // Blink overlay for urgency
                if (Math.floor(currentTime / 150) % 2 === 0) {
                    ctx.save(); ctx.globalAlpha = 0.15; ctx.fillStyle = '#ff0000';
                    ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
                }
            }
            ctx.fillStyle = baseCol;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
            // Directional arrow to show facing
            let adx = 0, ady = 0;
            if (e.target) { adx = (e.target.x - e.x); ady = (e.target.y - e.y); }
            else if (e.roamDir) { adx = e.roamDir.dx; ady = e.roamDir.dy; }
            if (Math.abs(adx) > Math.abs(ady)) { adx = adx > 0 ? 1 : -1; ady = 0; }
            else if (Math.abs(ady) > Math.abs(adx)) { ady = ady > 0 ? 1 : -1; adx = 0; }
            if (adx !== 0 || ady !== 0) {
                const ang = Math.atan2(ady, adx);
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(ang);
                ctx.fillStyle = '#0b3';
                ctx.beginPath();
                ctx.moveTo(r - 2, 0);
                ctx.lineTo(r - 10, -5);
                ctx.lineTo(r - 10, 5);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
            // small eye
            ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(cx, cy - 3, 2, 0, Math.PI * 2); ctx.fill();
            // rage aura
            if (enraged) {
                ctx.save(); ctx.strokeStyle = 'rgba(255,0,0,0.35)'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
            }

            // Zap electric effect overlay (brief flash when trap triggers)
            if (e._zapFXUntil && currentTime < e._zapFXUntil) {
                const alpha = Math.max(0.15, Math.min(0.6, (e._zapFXUntil - currentTime) / 500));
                ctx.save();
                ctx.strokeStyle = `rgba(80,200,255,${alpha})`;
                ctx.lineWidth = 2;
                for (let i = 0; i < 3; i++) {
                    const ang = (i * 2 * Math.PI) / 3 + (currentTime % 200) / 200 * Math.PI;
                    const rr = r + 3 + (i % 2) * 3;
                    ctx.beginPath(); ctx.arc(cx, cy, rr, ang, ang + Math.PI / 3); ctx.stroke();
                }
                ctx.restore();
            }

            // Debug overlay for Seeker path/goal/recent
            if (gameState.debugSeeker) {
                // Recent tiles
                if (Array.isArray(e.recent)) {
                    ctx.save();
                    ctx.fillStyle = 'rgba(0, 255, 0, 0.15)';
                    for (const v of e.recent) {
                        ctx.fillRect(v.x * CELL_SIZE + 6, v.y * CELL_SIZE + 6, CELL_SIZE - 12, CELL_SIZE - 12);
                    }
                    ctx.restore();
                }
                // Planned path nodes
                if (Array.isArray(e.path) && e.path.length) {
                    ctx.save();
                    ctx.strokeStyle = 'rgba(0, 200, 0, 0.5)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    let started = false;
                    for (let i = Math.max(0, e.pathIndex - 1); i < e.path.length; i++) {
                        const n = e.path[i];
                        const px = (n.x + 0.5) * CELL_SIZE;
                        const py = (n.y + 0.5) * CELL_SIZE;
                        if (!started) { ctx.moveTo(cx, cy); started = true; }
                        ctx.lineTo(px, py);
                        // node dot
                        ctx.fillStyle = 'rgba(0,200,0,0.6)';
                        ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
                    }
                    ctx.stroke();
                    ctx.restore();
                }
                // Roam goal marker
                if (e.roamGoal) {
                    const gx = e.roamGoal.x * CELL_SIZE;
                    const gy = e.roamGoal.y * CELL_SIZE;
                    ctx.save();
                    ctx.strokeStyle = 'rgba(0,255,0,0.8)';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(gx + 3, gy + 3, CELL_SIZE - 6, CELL_SIZE - 6);
                    ctx.restore();
                }
            }
        } else {
            const isTelegraph = e.telegraphUntil && currentTime < e.telegraphUntil;
            ctx.fillStyle = isTelegraph ? '#ffa500' : '#8a2be2';
            // Jump streak if a jump just occurred
            if (e.jumpFlashUntil && currentTime < e.jumpFlashUntil && e.lastJumpFrom) {
                ctx.save();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(e.lastJumpFrom.fx * CELL_SIZE, e.lastJumpFrom.fy * CELL_SIZE);
                ctx.lineTo(cx, cy);
                ctx.stroke();
                ctx.restore();
            }
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
        }
    }
}

function drawProjectiles(currentTime) {
    if (!gameState.projectiles) return;
    for (const p of gameState.projectiles) {
        if (p.type === 'half_arc') {
            const radius = (p.radius || 0) * CELL_SIZE;
            const cx = p.x * CELL_SIZE;
            const cy = p.y * CELL_SIZE;
            const a = p.angle; // radians
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(a);
            // Draw semicircle facing +X direction after rotation
            const fill = p.reflected ? 'rgba(255, 220, 0, 0.25)' : 'rgba(255,105,180,0.25)';
            const stroke = p.reflected ? 'rgba(255, 220, 0, 0.65)' : 'rgba(255,105,180,0.6)';
            ctx.fillStyle = fill;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, Math.max(6, radius), -Math.PI/2, Math.PI/2, false);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 2; ctx.beginPath();
            ctx.arc(0, 0, Math.max(6, radius), -Math.PI/2, Math.PI/2, false);
            ctx.stroke();
            ctx.restore();
        }
    }
}

function drawDynamicMazeOverlays() {
    // Only draw the EXIT tile color dynamically (base already drew floor/walls)
    for (let y = 0; y < MAZE_HEIGHT; y++) {
        for (let x = 0; x < MAZE_WIDTH; x++) {
            const cellType = gameState.maze[y][x];
            if (cellType === CELL.EXIT) {
                const incomplete = gameState.generators.some(g => !g.completed);
                ctx.fillStyle = incomplete ? '#8B0000' : '#00ff00';
                ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        }
    }
    
    // Teleport pads
    if (gameState.teleportPads && gameState.teleportPads.length) {
        for (const pad of gameState.teleportPads) {
            const x = pad.x * CELL_SIZE;
            const y = pad.y * CELL_SIZE;
            const now = performance.now();
            const cooling = now < (pad.cooldownUntil || 0);
            const charging = (pad.chargeStartAt || 0) > 0 && !cooling;

            // Base pad
            ctx.save();
            // Greyed when cooling, white otherwise
            ctx.fillStyle = cooling ? 'rgba(180,180,180,0.9)' : 'rgba(255,255,255,0.9)';
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            const padInset = Math.floor(CELL_SIZE * 0.15);
            ctx.fillRect(x + padInset, y + padInset, CELL_SIZE - padInset * 2, CELL_SIZE - padInset * 2);
            ctx.strokeRect(x + padInset, y + padInset, CELL_SIZE - padInset * 2, CELL_SIZE - padInset * 2);

            // Blue glow when about to teleport (charging)
            if (charging) {
                const t = (now - pad.chargeStartAt) / TELEPORT_CHARGE_TIME;
                const glow = Math.min(1, Math.max(0, t));
                const radius = CELL_SIZE * (0.5 + 0.3 * glow);
                ctx.beginPath();
                ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(80,160,255,${0.35 + 0.35 * glow})`;
                ctx.fill();
            }
            ctx.restore();
        }
    }
}

function drawTraps(currentTime) {
    if (!gameState.traps || !gameState.traps.length) return;
    for (const t of gameState.traps) {
        const x = t.x * CELL_SIZE;
        const y = t.y * CELL_SIZE;
        // Base tile overlay: electric blue pad
        const inset = Math.floor(CELL_SIZE * 0.2);
        const pulse = Math.sin(currentTime / 120) * 0.2 + 0.8;
        ctx.save();
        ctx.fillStyle = `rgba(80,180,255,${0.6 * pulse})`;
        ctx.strokeStyle = '#0af';
        ctx.lineWidth = 2;
        ctx.fillRect(x + inset, y + inset, CELL_SIZE - inset * 2, CELL_SIZE - inset * 2);
        ctx.strokeRect(x + inset, y + inset, CELL_SIZE - inset * 2, CELL_SIZE - inset * 2);
        // Animated arcs to suggest electricity
        ctx.translate(x + CELL_SIZE / 2, y + CELL_SIZE / 2);
        ctx.strokeStyle = `rgba(0,200,255,${0.7 * pulse})`;
        ctx.beginPath();
        ctx.arc(0, 0, CELL_SIZE * 0.32, 0, Math.PI * 2);
        ctx.stroke();
        // Flash on trigger/expire
        if (t.flashUntil && currentTime < t.flashUntil) {
            const alpha = Math.max(0, (t.flashUntil - currentTime) / 200);
            ctx.beginPath();
            ctx.arc(0, 0, CELL_SIZE * 0.45, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            ctx.fill();
        }
        ctx.restore();
    }
}

function drawGenerators(currentTime) {
    gameState.generators.forEach((gen) => {
        if (gen.completed) {
            // Draw dark green tile to indicate completed generator and a subtle checkmark
            ctx.fillStyle = '#0f4d1a';
            ctx.fillRect(gen.x * CELL_SIZE, gen.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            ctx.fillStyle = '#00ff66';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('✓', gen.x * CELL_SIZE + CELL_SIZE / 2, gen.y * CELL_SIZE + CELL_SIZE / 2);
        } else {
            // Draw yellow wall
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(gen.x * CELL_SIZE, gen.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            
            // Pulsing glow
            const pulse = Math.sin(currentTime / 500) * 0.3 + 0.7;
            ctx.globalAlpha = pulse * 0.4;
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(gen.x * CELL_SIZE - 2, gen.y * CELL_SIZE - 2, CELL_SIZE + 4, CELL_SIZE + 4);
            ctx.globalAlpha = 1.0;

            // If blocked, overlay a red X
            if (gen.blockedUntil && currentTime < gen.blockedUntil) {
                ctx.strokeStyle = '#ff4444';
                ctx.lineWidth = 3;
                const x = gen.x * CELL_SIZE;
                const y = gen.y * CELL_SIZE;
                ctx.beginPath();
                ctx.moveTo(x + 3, y + 3);
                ctx.lineTo(x + CELL_SIZE - 3, y + CELL_SIZE - 3);
                ctx.moveTo(x + CELL_SIZE - 3, y + 3);
                ctx.lineTo(x + 3, y + CELL_SIZE - 3);
                ctx.stroke();
            }
        }
    });
}

function drawPlayer() {
    const centerX = gameState.player.x * CELL_SIZE + CELL_SIZE / 2;
    const centerY = gameState.player.y * CELL_SIZE + CELL_SIZE / 2;
    const radius = CELL_SIZE / 2 - 2;
    
    ctx.fillStyle = gameState.isSprinting ? '#00ffff' : '#4169E1';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    if (gameState.isJumpCharging) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + 5, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Draw blocking shield when active
    if (gameState.blockActive) {
        const r = Math.max(CELL_SIZE, radius + 10);
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(gameState.blockAngle);
        ctx.fillStyle = 'rgba(255, 213, 0, 0.25)';
        ctx.strokeStyle = 'rgba(255, 213, 0, 0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r, -Math.PI/2, Math.PI/2, false);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI/2, Math.PI/2, false);
        ctx.stroke();
        ctx.restore();
    }

    // Collision Shield visuals
    const now = performance.now();
    if (gameState.collisionShieldState === 'active') {
        // Pink outline with subtle pulse
        const pulse = Math.sin(now / 180) * 0.25 + 0.75;
        ctx.save();
        ctx.strokeStyle = `rgba(255, 119, 170, ${0.6 * pulse})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(centerX, centerY, radius + 4, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    } else if (gameState.collisionShieldState === 'recharging' && gameState.collisionShieldRechargeEnd) {
        // Faint ring plus progress arc from top, clockwise
        const remain = Math.max(0, gameState.collisionShieldRechargeEnd - now);
        const t = 1 - Math.min(1, remain / COLLISION_SHIELD_RECHARGE_TIME);
        ctx.save();
        // Base faint ring
        ctx.strokeStyle = 'rgba(255, 119, 170, 0.18)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(centerX, centerY, radius + 4, 0, Math.PI * 2); ctx.stroke();
        // Progress arc
        ctx.strokeStyle = 'rgba(255, 119, 170, 0.55)';
        ctx.lineWidth = 3;
        const start = -Math.PI / 2;
        ctx.beginPath(); ctx.arc(centerX, centerY, radius + 4, start, start + t * Math.PI * 2); ctx.stroke();
        ctx.restore();
    }

    // Brief break flash when shield pops
    if (gameState.collisionShieldBrokenUntil && now < gameState.collisionShieldBrokenUntil) {
        const k = Math.max(0, (gameState.collisionShieldBrokenUntil - now) / COLLISION_SHIELD_BREAK_FLASH);
        ctx.save();
        ctx.globalAlpha = 0.6 * k;
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(centerX, centerY, radius + 7, 0, Math.PI * 2); ctx.stroke();
        // Shard lines
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
            const ang = (i * Math.PI * 2) / 6;
            const x1 = centerX + Math.cos(ang) * (radius + 2);
            const y1 = centerY + Math.sin(ang) * (radius + 2);
            const x2 = centerX + Math.cos(ang) * (radius + 10 + 6 * (1 - k));
            const y2 = centerY + Math.sin(ang) * (radius + 10 + 6 * (1 - k));
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
        ctx.restore();
    }
}

function drawUI() {
    const healthEl = ui.health;
    const staminaEl = ui.stamina;
    const staminaFill = ui.staminaFill;
    const shieldEl = ui.shield;
    const generatorsEl = ui.generators;
    const trapsEl = document.getElementById('traps');
    const timerEl = document.getElementById('timer');
    const jumpEl = ui.jumpIndicator;
    const streakEl = ui.streak;
    const streakSection = ui.streakSection;
    
    healthEl.textContent = '❤️'.repeat(gameState.lives);
    
    const staminaPct = Math.floor(gameState.stamina);
    staminaEl.textContent = `${staminaPct}%`;
    staminaEl.style.color = gameState.stamina < 100 ? '#888' : '#0ff';
    if (staminaFill) {
        staminaFill.style.width = `${staminaPct}%`;
        staminaFill.style.background = gameState.stamina < 100
            ? 'linear-gradient(90deg, #3aa3a3, #4dbbd6)'
            : 'linear-gradient(90deg, #0ff, #61dafb)';
    }
    // Shield HUD
    if (shieldEl) {
        const now = performance.now();
        if (gameState.collisionShieldState === 'active') {
            shieldEl.textContent = '🛡️ Ready';
            shieldEl.style.color = '#ff77aa';
        } else if (gameState.collisionShieldState === 'recharging' && gameState.collisionShieldRechargeEnd) {
            const remain = Math.max(0, gameState.collisionShieldRechargeEnd - now);
            const secs = (remain / 1000).toFixed(1);
            shieldEl.textContent = `🛡️ ${secs}s`;
            shieldEl.style.color = '#888';
        } else {
            shieldEl.textContent = '🛡️';
            shieldEl.style.color = '#888';
        }
    }
    
    const completed = gameState.generators.filter(g => g.completed).length;
    generatorsEl.textContent = `${completed}/${gameState.generators.length}`;
    if (trapsEl) trapsEl.textContent = String(gameState.zapTraps || 0);

    // Speedrun timer
    if (timerEl) {
        timerEl.textContent = getRunClock(performance.now());
    }
    
    if (gameState.isJumpCharging) {
        jumpEl.textContent = `Jump: ${gameState.jumpCountdown.toFixed(1)}s`;
        jumpEl.style.display = 'block';
    } else {
        jumpEl.style.display = 'none';
    }

    // Endless streak UI
    if (streakSection) {
        if (gameState.mode === 'endless') {
            streakSection.style.display = 'flex';
            if (streakEl) streakEl.textContent = String((gameState.endlessConfig && gameState.endlessConfig.streak) || 0);
        } else {
            streakSection.style.display = 'none';
        }
    }
}

function drawGeneratorOverlay(currentTime) {
    const overlay = ui.overlay;
    overlay.style.display = 'flex';
    
    const title = overlay.querySelector('h2');
    const progressBar = overlay.querySelector('.progress-fill');
    const instruction = overlay.querySelector('.instruction');
    const skillCheckContainer = overlay.querySelector('.skill-check');
    const circle = skillCheckContainer.querySelector('.skill-check-circle');
    
    title.textContent = 'Repairing Generator';
    progressBar.style.width = `${gameState.generatorProgress}%`;
    
    if (gameState.skillCheckState) {
        instruction.textContent = 'Press SPACE when the pointer is in the yellow zone!';
        skillCheckContainer.style.display = 'block';
        
        const pointer = skillCheckContainer.querySelector('.pointer');
        const successZone = skillCheckContainer.querySelector('.success-zone');
        
        const angle = gameState.skillCheckState.pointerAngle;
        // Position pointer from center upwards, then rotate clockwise around its base
        pointer.style.transform = `translate(-50%, -100%) rotate(${angle}deg)`;
        
        const windowStart = gameState.skillCheckState.windowStart;
        const windowSize = gameState.skillCheckState.windowSize;
        // Draw the success arc with explicit starting angle so it matches game logic exactly
        // Using 'from <angle>deg' ensures the wedge begins at the same 0=top, clockwise system as pointerAngle
        successZone.style.transform = 'none';
        successZone.style.background = `conic-gradient(from ${windowStart}deg,
            transparent 0deg,
            #FFD700 ${windowSize}deg,
            transparent ${windowSize}deg
        )`;
    } else {
        instruction.textContent = 'Hold steady...';
        skillCheckContainer.style.display = 'none';
    }

    // Subtle flash feedback on success/fail
    const flash = gameState.skillCheckFlash;
    if (flash && currentTime < flash.until) {
        if (flash.type === 'success') {
            circle.style.borderColor = '#00ff88';
            circle.style.boxShadow = '0 0 18px rgba(0,255,136,0.6)';
        } else if (flash.type === 'fail') {
            circle.style.borderColor = '#ff4444';
            circle.style.boxShadow = '0 0 18px rgba(255,68,68,0.6)';
        }
    } else {
        circle.style.borderColor = '#61dafb';
        circle.style.boxShadow = 'none';
    }
}

function drawStatusMessage() {
    const statusEl = ui.status;
    statusEl.textContent = gameState.statusMessage;
    statusEl.style.display = 'block';
}

function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = gameState.gameStatus === 'won' ? '#00ff00' : '#ff0000';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
        gameState.gameStatus === 'won' ? 'YOU WIN!' : 'GAME OVER',
        canvas.width / 2,
        canvas.height / 2 - 40
    );
    
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.fillText('Press R to restart', canvas.width / 2, canvas.height / 2 + 20);
}
