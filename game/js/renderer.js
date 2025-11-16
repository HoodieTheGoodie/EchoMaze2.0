// renderer.js - Canvas rendering

import { gameState, SKILL_CHECK_ROTATION_TIME, MAZE_WIDTH, MAZE_HEIGHT, TELEPORT_CHARGE_TIME, COLLISION_SHIELD_RECHARGE_TIME, COLLISION_SHIELD_BREAK_FLASH, getRunClock } from './state.js';
import { CELL } from './maze.js';
import { particles } from './particles.js';
import { getLevelColor, isBazookaMode } from './config.js';

// Export CELL_SIZE so other modules can convert tile to pixel coordinates
export let CELL_SIZE = 20; // Changed to let for responsive scaling
const canvas = document.getElementById('canvas');
const ctx = canvas ? canvas.getContext('2d') : null;

// Offscreen cached background for static maze (walls/floor)
let mazeBaseCanvas = null;
let mazeBaseDirty = true;
let lastMazeRef = null;

// Mobile: Responsive canvas scaling
let canvasScale = 1;
export function updateCanvasSize() {
    if (!canvas) return;

    // Check if mobile (screen width < 768px)
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        // Portrait mode: fit canvas to screen
        const maxSize = Math.min(
            window.innerWidth - 20,  // Leave 10px margin on each side
            window.innerHeight - 400 // Leave room for title + UI + controls
        );
        const targetSize = Math.min(maxSize, 500); // Cap at 500px

        // Update canvas size
        canvas.width = targetSize;
        canvas.height = targetSize;

        // Recalculate cell size to fit
        CELL_SIZE = Math.floor(targetSize / 30); // 30x30 maze
        canvasScale = targetSize / 600;

        // Mark maze as dirty to rebuild with new cell size
        mazeBaseDirty = true;
    } else {
        // Desktop: standard size
        canvas.width = 600;
        canvas.height = 600;
        CELL_SIZE = 20;
        canvasScale = 1;
        mazeBaseDirty = true;
    }
}

// Call on load and resize
if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateCanvasSize);
    updateCanvasSize(); // Initial call
}
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
const FLOOR_COLOR = '#2a2a2a'; // dark gray floor for cyberpunk aesthetic
// Improve text rendering for timer
ctx && (ctx.font = '14px Arial');

console.log('Renderer loaded - Canvas:', canvas, 'Context:', ctx);

function buildMazeBase() {
    if (!canvas || !gameState.maze) return;
    mazeBaseCanvas = document.createElement('canvas');
    mazeBaseCanvas.width = canvas.width;
    mazeBaseCanvas.height = canvas.height;
    const bctx = mazeBaseCanvas.getContext('2d');
    
    // Get level color for neon walls
    const level = gameState.currentLevel || 1;
    const color = getLevelColor(level);
    const neonColor = color.css;
    
    // Draw static walls/floor only (no exit/generators)
    for (let y = 0; y < MAZE_HEIGHT; y++) {
        for (let x = 0; x < MAZE_WIDTH; x++) {
            const cellType = gameState.maze[y][x];
            const px = x * CELL_SIZE;
            const py = y * CELL_SIZE;
            if (cellType === CELL.WALL) {
                // Dark base
                bctx.fillStyle = '#0a0a0a';
                bctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
                
                // Check each side - only draw neon if adjacent cell is NOT a wall
                bctx.save();
                bctx.shadowBlur = 6;
                bctx.shadowColor = neonColor;
                bctx.strokeStyle = neonColor;
                bctx.lineWidth = 2;
                
                // Top edge
                if (y > 0 && gameState.maze[y - 1][x] !== CELL.WALL) {
                    bctx.beginPath();
                    bctx.moveTo(px, py);
                    bctx.lineTo(px + CELL_SIZE, py);
                    bctx.stroke();
                }
                
                // Bottom edge
                if (y < MAZE_HEIGHT - 1 && gameState.maze[y + 1][x] !== CELL.WALL) {
                    bctx.beginPath();
                    bctx.moveTo(px, py + CELL_SIZE);
                    bctx.lineTo(px + CELL_SIZE, py + CELL_SIZE);
                    bctx.stroke();
                }
                
                // Left edge
                if (x > 0 && gameState.maze[y][x - 1] !== CELL.WALL) {
                    bctx.beginPath();
                    bctx.moveTo(px, py);
                    bctx.lineTo(px, py + CELL_SIZE);
                    bctx.stroke();
                }
                
                // Right edge
                if (x < MAZE_WIDTH - 1 && gameState.maze[y][x + 1] !== CELL.WALL) {
                    bctx.beginPath();
                    bctx.moveTo(px + CELL_SIZE, py);
                    bctx.lineTo(px + CELL_SIZE, py + CELL_SIZE);
                    bctx.stroke();
                }
                
                bctx.restore();
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
    // Screen shake if active
    const shaking = currentTime < (gameState.screenShakeUntil || 0);
    const sx = shaking ? (Math.random() - 0.5) * 2 * (gameState.screenShakeMag || 3) : 0;
    const sy = shaking ? (Math.random() - 0.5) * 2 * (gameState.screenShakeMag || 3) : 0;
    if (shaking) ctx.save();
    if (shaking) ctx.translate(sx, sy);

    // Screen effect during enemy freeze (on hit)
    if (currentTime < gameState.enemiesFrozenUntil) {
        canvas.style.filter = 'grayscale(100%) contrast(110%)';
        canvas.style.transform = 'none';
    } else {
        canvas.style.filter = 'none';
        canvas.style.transform = 'none';
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
    if (gameState.boss && (gameState.boss.active || gameState.boss.prepRoom)) {
        drawBossArena(currentTime);
    }
    drawShieldParticles(currentTime);
    drawPlayer();
    drawUI();
    
    if (gameState.isGeneratorUIOpen) {
        drawGeneratorOverlay(currentTime);
    } else {
        // Ensure overlay is hidden when not in generator UI
        if (ui.overlay) ui.overlay.style.display = 'none';
    }
    
    // Render status message if present
    if (gameState.statusMessage) {
        drawStatusMessage();
    } else {
        // Hide status message box when cleared
        const messageBox = document.getElementById('statusMessageBox');
        if (messageBox) messageBox.style.display = 'none';
        if (ui.status) ui.status.style.display = 'none';
    }
    
    // Draw boss tutorial prompts (arrow and "Press E")
    if (gameState.boss && gameState.boss.tutorialActive) {
        const stage = gameState.boss.tutorialStage;
        
        if (stage === 'show_mount_prompt' && gameState.boss.tutorialPigTarget) {
            const pig = gameState.boss.tutorialPigTarget;
            const pigX = (pig.fx) * CELL_SIZE;
            const pigY = (pig.fy) * CELL_SIZE;
            
            // Draw bouncing arrow above the knocked out pig
            const bounce = Math.sin(currentTime / 200) * 8;
            ctx.save();
            ctx.fillStyle = '#FFD700';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.font = 'bold 32px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.strokeText('↓', pigX, pigY - 40 - bounce);
            ctx.fillText('↓', pigX, pigY - 40 - bounce);
            ctx.restore();
            
            // Check if player is near the pig
            const px = gameState.player.x;
            const py = gameState.player.y;
            const dist = Math.hypot(pig.x - px, pig.y - py);
            
            if (dist <= 1.5) {
                // Show "Press E" prompt
                ctx.save();
                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.fillRect(pigX - 60, pigY + 30, 120, 40);
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 2;
                ctx.strokeRect(pigX - 60, pigY + 30, 120, 40);
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 18px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('Press E', pigX, pigY + 50);
                ctx.restore();
            }
        }
    }
    
    if (gameState.gameStatus === 'lost') {
        drawGameOver();
    }
    
    // Update and render particle system
    if (particles) {
        const deltaTime = 16; // Approximate frame time
        particles.update(deltaTime);
        particles.render(ctx, currentTime);
    }
    
    // Screen fade overlay for transitions
    if (gameState.screenFade) {
        const f = gameState.screenFade;
        const t = Math.min(1, Math.max(0, (currentTime - (f.startAt || 0)) / (f.duration || 1)));
        const alpha = (f.from || 0) + ((f.to || 0) - (f.from || 0)) * t;
        ctx.save(); ctx.fillStyle = `rgba(0,0,0,${Math.max(0, Math.min(1, alpha))})`; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.restore();
        if (t >= 1) gameState.screenFade = null;
    }
    if (shaking) ctx.restore();
}

function drawEnemies(currentTime) {
    if (!gameState.enemies) return;
    // Helpers for smooth facing and FOV rays
    const angleLerp = (a, b, t) => {
        // shortest-path lerp
        let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
        if (d < -Math.PI) d += Math.PI * 2;
        return a + d * Math.max(0, Math.min(1, t));
    };
    const computeDesiredAngle = (e) => {
        // Prefer motion toward current target, then roamDir
        let vx = 0, vy = 0;
        if (e.target) {
            // direction from current pos to next target center
            const tx = (e.target.x + 0.5) - e.fx;
            const ty = (e.target.y + 0.5) - e.fy;
            vx = tx; vy = ty;
        } else if (e.roamDir) {
            vx = e.roamDir.dx; vy = e.roamDir.dy;
        }
        if (vx === 0 && vy === 0) return e._vizAngle ?? 0;
        return Math.atan2(vy, vx);
    };
    const updateFacing = (e) => {
        const now = currentTime;
        const desired = computeDesiredAngle(e);
        const lastAt = e._vizAt || now;
        const dt = Math.max(0, Math.min(100, now - lastAt));
        // smoothing factor ~ 12 Hz response
        const t = dt / 120; // smaller = smoother
        e._vizAngle = (typeof e._vizAngle === 'number') ? angleLerp(e._vizAngle, desired, t) : desired;
        e._vizAt = now;
        return e._vizAngle;
    };
    const castVisionCone = (ex, ey, angle, maxRangeTiles, halfAngleRad, stepDeg = 3) => {
        const pts = [];
        const maxR = Math.max(1, maxRangeTiles) * CELL_SIZE; // in pixels
        const start = angle - halfAngleRad;
        const end = angle + halfAngleRad;
        for (let a = start; a <= end + 1e-6; a += (stepDeg * Math.PI / 180)) {
            const dx = Math.cos(a);
            const dy = Math.sin(a);
            // march in small increments in world units (pixels)
            const step = Math.max(2, CELL_SIZE * 0.15);
            let dist = 0;
            let hitX = ex, hitY = ey;
            while (dist <= maxR) {
                const sx = ex + dx * dist;
                const sy = ey + dy * dist;
                const gx = Math.floor(sx / CELL_SIZE);
                const gy = Math.floor(sy / CELL_SIZE);
                if (gx < 0 || gx >= MAZE_WIDTH || gy < 0 || gy >= MAZE_HEIGHT) { hitX = sx; hitY = sy; break; }
                if (gameState.maze[gy][gx] === CELL.WALL) { break; }
                hitX = sx; hitY = sy;
                dist += step;
            }
            pts.push({ x: hitX, y: hitY });
        }
        return pts;
    };
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
                ctx.beginPath();
                ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r);
                ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r);
                ctx.stroke();
            }
        } else if (e.type === 'seeker') {
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
            // Smooth facing angle from movement intent
            const ang = updateFacing(e);

            // Vision/FOV: only draw in rage mode, using raycasted cone that respects walls
            if (enraged) {
                const rangeTiles = (e.detectRange || 7);
                const coneAngle = Math.PI * 2 / 3; // 120° total
                const half = coneAngle / 2;
                const rays = castVisionCone(cx, cy, ang, rangeTiles, half, 3);
                if (rays.length >= 2) {
                    ctx.save();
                    ctx.globalAlpha = 0.28;
                    ctx.fillStyle = 'rgba(255, 68, 68, 0.28)';
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    for (const p of rays) ctx.lineTo(p.x, p.y);
                    ctx.closePath();
                    ctx.fill();
                    // Soft edges
                    ctx.globalAlpha = 0.45;
                    ctx.strokeStyle = 'rgba(255, 68, 68, 0.35)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    for (let i = 0; i < rays.length; i += Math.max(1, Math.floor(rays.length / 16))) {
                        const p = rays[i];
                        ctx.moveTo(cx, cy);
                        ctx.lineTo(p.x, p.y);
                    }
                    ctx.stroke();
                    ctx.restore();
                }
            }

            ctx.fillStyle = baseCol;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
            // Directional arrow to show facing (ROAM-only) — embedded in the green body
            if (!enraged) {
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(ang);
                // Arrow style: black head inset into the circle with a short stem
                const headLen = Math.max(6, r * 0.5);        // length of the head along facing
                const headWidth = Math.max(6, r * 0.45);     // width of the head base
                const stemLen = Math.max(6, r * 0.35);       // stem length inside the body
                const stemWidth = Math.max(3, r * 0.18);

                // Tip sits slightly inside the rim
                const tip = r - 3;
                const base = tip - headLen;

                ctx.fillStyle = '#111';
                ctx.beginPath();
                // Triangle head (centered on forward axis)
                ctx.moveTo(tip, 0);
                ctx.lineTo(base, -headWidth * 0.5);
                ctx.lineTo(base, headWidth * 0.5);
                ctx.closePath();
                ctx.fill();

                // Stem as a small rectangle extending from head base inward
                ctx.fillRect(base - stemLen, -stemWidth * 0.5, stemLen, stemWidth);

                ctx.restore();
            }
            // Removed the central eye dot to avoid interfering with the on-body arrow
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
    } else if (e.type === 'batter') {
            // Batter visuals: orange, pulsates red/white when enraged
            const enraged = e.state === 'rage';
            let baseCol = '#FF8C00'; // dark orange

            // Pulsate between red and white when enraged (faster)
            if (enraged) {
                const pulse = Math.sin(currentTime / 100) * 0.5 + 0.5; // oscillate 0-1, faster
                const r = Math.round(255);
                const g = Math.round(pulse * 255); // 0->255
                const b = Math.round(pulse * 255); // 0->255
                baseCol = `rgb(${r},${g},${b})`; // pulsates from pure red (#FF0000) to white (#FFFFFF)
            }

            // Body
            ctx.fillStyle = baseCol;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();

            // Eyes (angry looking)
            ctx.fillStyle = enraged ? '#000000' : '#8B0000'; // black eyes when raging, dark red normally
            ctx.beginPath();
            ctx.arc(cx - 3, cy - 2, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + 3, cy - 2, 2, 0, Math.PI * 2);
            ctx.fill();

            // Smooth facing and rage-only arrow + FOV cone
            const ang = updateFacing(e);
            if (enraged) {
                // Vision cone (respect walls)
                const rangeTiles = 6; // batter awareness
                const coneAngle = Math.PI * 2 / 3; // 120°
                const half = coneAngle / 2;
                const rays = castVisionCone(cx, cy, ang, rangeTiles, half, 3);
                if (rays.length >= 2) {
                    ctx.save();
                    ctx.globalAlpha = 0.25;
                    ctx.fillStyle = 'rgba(255, 68, 68, 0.25)';
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    for (const p of rays) ctx.lineTo(p.x, p.y);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
                // Direction arrow
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(ang);
                ctx.fillStyle = '#b30b0b';
                ctx.beginPath();
                ctx.moveTo(r - 2, 0);
                ctx.lineTo(r - 10, -5);
                ctx.lineTo(r - 10, 5);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        } else if (e.type === 'mortar') {
            // Mortar visuals: teal body; gray when disabled; light blue tint when frozen
            const isDisabledVisual = (e.state === 'disabled') || !!e._disabledOverlay; // overlay shows while ability finishes
            // Fade from gray (#555) to teal (#2bb3c0) as disabled timer approaches end
            let baseCol = '#2bb3c0';
            if (isDisabledVisual) {
                const gray = { r: 85, g: 85, b: 85 };
                const teal = { r: 43, g: 179, b: 192 };
                const start = e._disabledStartAt || (currentTime - 1);
                const total = Math.max(1, (e.disabledUntil || (start + 30000)) - start);
                const remain = Math.max(0, (e.disabledUntil || (start + 30000)) - currentTime);
                const t = 1 - Math.min(1, remain / total); // 0=>gray, 1=>teal
                const rr = Math.round(gray.r + (teal.r - gray.r) * t);
                const gg = Math.round(gray.g + (teal.g - gray.g) * t);
                const bb = Math.round(gray.b + (teal.b - gray.b) * t);
                baseCol = `rgb(${rr},${gg},${bb})`;
            }
            // body
            ctx.fillStyle = baseCol;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
            // Aim-phase telegraph: flash red/blue on body and draw growing area glow on target
            if (e.state === 'aim') {
                // Flash body overlay
                const blink = Math.floor(currentTime / 120) % 2 === 0;
                ctx.save();
                ctx.globalAlpha = 0.35;
                ctx.fillStyle = blink ? '#ff4444' : '#3aa3ff';
                ctx.beginPath(); ctx.arc(cx, cy, r + 1, 0, Math.PI * 2); ctx.fill();
                // Pulsing ring
                ctx.globalAlpha = 0.6;
                ctx.strokeStyle = blink ? 'rgba(255,68,68,0.85)' : 'rgba(58,163,255,0.85)';
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(cx, cy, r + 5 + (blink ? 1 : -1), 0, Math.PI * 2); ctx.stroke();
                ctx.restore();

                // Impact area glow for impending explosions (5x5 Chebyshev radius 2)
                if (e.aimTarget && e.aimUntil) {
                    const remain = Math.max(0, e.aimUntil - currentTime);
                    const total = 2000; // aim duration from logic
                    const t = 1 - Math.min(1, remain / total);
                    const alpha = 0.12 + 0.45 * Math.pow(t, 1.4);
                    const cxg = e.aimTarget.x, cyg = e.aimTarget.y;
                    ctx.save();
                    for (let yy = cyg - 2; yy <= cyg + 2; yy++) {
                        for (let xx = cxg - 2; xx <= cxg + 2; xx++) {
                            if (xx <= 0 || xx >= MAZE_WIDTH - 1 || yy <= 0 || yy >= MAZE_HEIGHT - 1) continue;
                            if (Math.max(Math.abs(xx - cxg), Math.abs(yy - cyg)) <= 2) {
                                ctx.fillStyle = `rgba(255, 64, 64, ${alpha.toFixed(3)})`;
                                ctx.fillRect(xx * CELL_SIZE, yy * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                            }
                        }
                    }
                    ctx.restore();
                }
                // Second-shot glow while pending
                if (e._didFirstExplosion && e._secondTarget && e._secondAt && currentTime < e._secondAt) {
                    const remain2 = Math.max(0, e._secondAt - currentTime);
                    const total2 = Math.max(1, e._secondLeadTime || 350);
                    const t2 = 1 - Math.min(1, remain2 / total2);
                    const alpha2 = 0.12 + 0.55 * Math.pow(t2, 1.2);
                    const cxg2 = e._secondTarget.x, cyg2 = e._secondTarget.y;
                    ctx.save();
                    for (let yy = cyg2 - 2; yy <= cyg2 + 2; yy++) {
                        for (let xx = cxg2 - 2; xx <= cxg2 + 2; xx++) {
                            if (xx <= 0 || xx >= MAZE_WIDTH - 1 || yy <= 0 || yy >= MAZE_HEIGHT - 1) continue;
                            if (Math.max(Math.abs(xx - cxg2), Math.abs(yy - cyg2)) <= 2) {
                                ctx.fillStyle = `rgba(255, 64, 64, ${alpha2.toFixed(3)})`;
                                ctx.fillRect(xx * CELL_SIZE, yy * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                            }
                        }
                    }
                    ctx.restore();
                }

                // aiming stance shadow / crosshairs
                // Crosshair for the first aimed shot (if present)
                if (e.aimTarget) {
                    const gx = e.aimTarget.x * CELL_SIZE;
                    const gy = e.aimTarget.y * CELL_SIZE;
                    ctx.save();
                    ctx.strokeStyle = 'rgba(255,80,80,0.9)';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(gx + 4, gy + 4, CELL_SIZE - 8, CELL_SIZE - 8);
                    ctx.beginPath();
                    ctx.moveTo(gx + CELL_SIZE/2, gy + 6); ctx.lineTo(gx + CELL_SIZE/2, gy + CELL_SIZE - 6);
                    ctx.moveTo(gx + 6, gy + CELL_SIZE/2); ctx.lineTo(gx + CELL_SIZE - 6, gy + CELL_SIZE/2);
                    ctx.stroke();
                    ctx.restore();
                }
                // Crosshair for the pending second shot (between first explosion and resolve)
                if (e._didFirstExplosion && e._secondTarget && e._secondAt && currentTime < e._secondAt) {
                    const gx2 = e._secondTarget.x * CELL_SIZE;
                    const gy2 = e._secondTarget.y * CELL_SIZE;
                    ctx.save();
                    // Slightly different tint to differentiate the follow-up shot
                    ctx.strokeStyle = 'rgba(255,140,0,0.95)'; // orange
                    ctx.lineWidth = 2;
                    ctx.strokeRect(gx2 + 4, gy2 + 4, CELL_SIZE - 8, CELL_SIZE - 8);
                    ctx.beginPath();
                    ctx.moveTo(gx2 + CELL_SIZE/2, gy2 + 6); ctx.lineTo(gx2 + CELL_SIZE/2, gy2 + CELL_SIZE - 6);
                    ctx.moveTo(gx2 + 6, gy2 + CELL_SIZE/2); ctx.lineTo(gx2 + CELL_SIZE - 6, gy2 + CELL_SIZE/2);
                    ctx.stroke();
                    ctx.restore();
                }
            }
            // explosion shockwave (brief)
            if (e._lastExplosionAt && currentTime - e._lastExplosionAt < 220 && e._lastExplosionCenter) {
                const t = (currentTime - e._lastExplosionAt) / 220;
                const alpha = 1 - t;
                const c = e._lastExplosionCenter;
                const cx2 = (c.x + 0.5) * CELL_SIZE;
                const cy2 = (c.y + 0.5) * CELL_SIZE;
                ctx.save();
                ctx.strokeStyle = `rgba(255, 240, 220, ${alpha.toFixed(3)})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(cx2, cy2, CELL_SIZE * (1 + 2 * t), 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
            // Frozen overlay
            if (e._frozenUntil && currentTime < e._frozenUntil) {
                // BAZOOKA MODE: Gray out with color fade-in effect
                if (isBazookaMode() && e._stunStartTime) {
                    const totalDuration = (e._frozenUntil - e._stunStartTime);
                    const remaining = (e._frozenUntil - currentTime);
                    const progress = 1 - (remaining / totalDuration); // 0 = just stunned, 1 = stun ending
                    
                    ctx.save();
                    // Desaturate and darken the enemy
                    const grayAmount = 1 - progress; // 1 = fully gray, 0 = full color
                    ctx.globalAlpha = 0.3 + (grayAmount * 0.5); // More opaque when grayed
                    ctx.fillStyle = `rgba(128, 128, 128, ${grayAmount})`;
                    ctx.beginPath(); 
                    ctx.arc(cx, cy, r + 3, 0, Math.PI * 2); 
                    ctx.fill();
                    ctx.restore();
                } else {
                    // Default frozen effect (non-bazooka mode)
                    ctx.save();
                    ctx.globalAlpha = 0.35;
                    ctx.fillStyle = '#9be7ff';
                    ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, Math.PI * 2); ctx.fill();
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
        } else if (p.type === 'rocket') {
            const cx = p.x * CELL_SIZE;
            const cy = p.y * CELL_SIZE;

            // Draw smoke trail if present (older first so newer draws on top)
            if (Array.isArray(p.smoke) && p.smoke.length) {
                ctx.save();
                for (let i = 0; i < p.smoke.length; i++) {
                    const node = p.smoke[i];
                    const ageMs = Math.max(0, currentTime - (node.at || 0));
                    // Alpha fades with age and along the trail index
                    const ageFade = Math.max(0, 1 - ageMs / 600);
                    const idxFade = (i + 1) / p.smoke.length; // older => smaller
                    const alpha = Math.max(0, Math.min(0.5, 0.08 + 0.5 * ageFade * idxFade));
                    if (alpha <= 0.01) continue;
                    const sx = node.x * CELL_SIZE;
                    const sy = node.y * CELL_SIZE;
                    const r = 3 + 6 * (1 - idxFade) + 4 * (1 - ageFade);
                    ctx.beginPath();
                    ctx.fillStyle = `rgba(160,160,160,${alpha})`;
                    ctx.arc(sx, sy, r, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }

            // Rocket body
            ctx.save();
            ctx.fillStyle = 'rgba(255, 230, 120, 0.95)';
            ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
            // Tiny bright trail directly opposite velocity
            ctx.globalAlpha = 0.7;
            ctx.strokeStyle = 'rgba(255,200,80,0.75)';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(cx, cy);
            ctx.lineTo(cx - (p.vx || 0) * 1.6, cy - (p.vy || 0) * 1.6);
            ctx.stroke();
            ctx.restore();
        }
    }
}

function drawBossArena(currentTime) {
    // Draw Core
    const b = gameState.boss; if (!b) return;
    if (b.core) {
        const cx = (b.core.x + 0.5) * CELL_SIZE;
        const cy = (b.core.y + 0.5) * CELL_SIZE;
        const r = CELL_SIZE * 0.9;
        // Core body color by phase
        ctx.save();
        // Defeat fade-out
        if (b.defeated && b.coreFadeUntil) {
            const total = Math.max(1, (b.coreFadeUntil - (b.defeatStartedAt || (currentTime - 1))));
            const remain = Math.max(0, b.coreFadeUntil - currentTime);
            const alpha = Math.max(0, Math.min(1, remain / total));
            ctx.globalAlpha = alpha;
        }
        const colMap = { red: '#ff4444', purple: '#b455ff', pink: '#ff69b4' };
        if (b.phase === 'phase2_cutscene') {
            // Flashing red
            const pulse = (Math.sin(currentTime / 120) * 0.5 + 0.5);
            ctx.fillStyle = `rgba(255,68,68,${0.6 + 0.4 * pulse})`;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        } else if (b.phase === 'combo' && b.combo) {
            const attacks = b.combo.attacks;
            if (attacks.length === 2) {
                // Split core: left/right hemispheres with two colors
                ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI/2, -Math.PI/2, true); ctx.closePath();
                ctx.fillStyle = colMap[attacks[0]] || '#7fffd4'; ctx.fill();
                ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI/2, Math.PI/2, true); ctx.closePath();
                ctx.fillStyle = colMap[attacks[1]] || '#7fffd4'; ctx.fill();
            } else {
                // Doubled single attack: full color
                const c = colMap[attacks[0]] || '#7fffd4';
                ctx.fillStyle = c;
                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
            }
        } else {
            let col = '#7fffd4';
            if (b.phase === 'red') col = colMap.red;
            else if (b.phase === 'purple') col = colMap.purple;
            else if (b.phase === 'pink') col = colMap.pink;
            ctx.fillStyle = col;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        }
        if (!b.defeated || (b.defeated && currentTime < (b.coreFadeUntil || 0))) {
            ctx.strokeStyle = '#0aa'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
    }

    // Boss telegraphs (red rings)
    if (b.telegraphs && b.telegraphs.length) {
        for (const t of b.telegraphs) {
            const gx = (t.x + 0.5) * CELL_SIZE;
            const gy = (t.y + 0.5) * CELL_SIZE;
            const remain = Math.max(0, t.explodeAt - currentTime);
            const total = Math.max(1, t.explodeAt - (t.spawnAt || (t.explodeAt - 2000)));
            const prog = 1 - Math.min(1, remain / total);
            ctx.save();
            ctx.globalAlpha = 0.35 + 0.45 * prog;
            ctx.strokeStyle = 'rgba(255,60,60,0.9)';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(gx, gy, CELL_SIZE * (0.6 + prog * 1.2), 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }
    }

    // Bazooka pickup
    if (gameState.bazookaPickup) {
        const px = (gameState.bazookaPickup.x + 0.5) * CELL_SIZE;
        const py = (gameState.bazookaPickup.y + 0.5) * CELL_SIZE;
        ctx.save();
        ctx.fillStyle = '#ffd700';
        ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();

        // Show E-prompt if player is nearby during prep
        if (gameState.boss && gameState.boss.prepRoom) {
            const dx = Math.abs(gameState.player.x - gameState.bazookaPickup.x);
            const dy = Math.abs(gameState.player.y - gameState.bazookaPickup.y);
            if (Math.max(dx, dy) <= 1) {
                const tx = (gameState.player.x + 0.5) * CELL_SIZE;
                const ty = (gameState.player.y - 0.7) * CELL_SIZE;
                ctx.save();
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                const text = 'Press E to pick up';
                ctx.font = 'bold 12px Arial';
                const tw = ctx.measureText(text).width + 10;
                ctx.fillRect(tx - tw/2, ty - 14, tw, 18);
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(text, tx, ty - 4);
                ctx.restore();
            }
        }
    }

    // Ammo pickups (Level 10 boss prep room only)
    if ((gameState.currentLevel === 10) && b.ammoPickups && b.ammoPickups.length) {
        for (const a of b.ammoPickups) {
            const ax = (a.x + 0.5) * CELL_SIZE; const ay = (a.y + 0.5) * CELL_SIZE;
            ctx.save();
            ctx.fillStyle = '#ffcc00'; ctx.fillRect(ax-6, ay-6, 12, 12);
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(ax-8, ay-8, 16, 16);
            // Reload prompt when near in prep room
            if (gameState.boss && gameState.boss.prepRoom) {
                const dx = Math.abs(gameState.player.x - a.x);
                const dy = Math.abs(gameState.player.y - a.y);
                if (Math.max(dx, dy) <= 1) {
                    const text = 'Press R to reload';
                    ctx.font = 'bold 12px Arial';
                    const tw = ctx.measureText(text).width + 10;
                    const tx = ax; const ty = ay - 18;
                    ctx.fillStyle = 'rgba(0,0,0,0.6)';
                    ctx.fillRect(tx - tw/2, ty - 12, tw, 16);
                    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText(text, tx, ty - 4);
                }
            }
            ctx.restore();
        }
    }

    // Arena ammo stations with cooldown (Level 10 only)
    if ((gameState.currentLevel === 10) && b.ammoStations && b.ammoStations.length && !b.prepRoom) {
        for (const s of b.ammoStations) {
            const sx = (s.x + 0.5) * CELL_SIZE;
            const sy = (s.y + 0.5) * CELL_SIZE;
            ctx.save();
            // Base station tile
            ctx.fillStyle = '#ffaa00';
            ctx.fillRect(sx - 7, sy - 7, 14, 14);
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(sx - 9, sy - 9, 18, 18);

            // Cooldown ring overlay
            const now = performance.now();
            const remain = Math.max(0, (s.cooldownUntil || 0) - now);
            if (remain > 0) {
                // Draw a pie showing cooldown progress
                const r = 12;
                const total = Math.max(1, (s.cooldownTotal || 30000));
                const pct = Math.min(1, remain / total);
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.fillStyle = 'rgba(0,0,0,0.35)';
                ctx.arc(sx, sy, r, -Math.PI/2, -Math.PI/2 + Math.PI * 2 * pct, false);
                ctx.closePath();
                ctx.fill();
            } else {
                // Ready pulse
                const pulse = (Math.sin(now / 180) * 0.5 + 0.5) * 0.4 + 0.2;
                ctx.strokeStyle = `rgba(255,255,255,${pulse.toFixed(2)})`;
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(sx, sy, 14, 0, Math.PI * 2); ctx.stroke();
                // Near prompt
                const dx = Math.abs(gameState.player.x - s.x);
                const dy = Math.abs(gameState.player.y - s.y);
                if (Math.max(dx, dy) <= 1) {
                    const text = 'Press R to reload';
                    ctx.font = 'bold 12px Arial';
                    const tw = ctx.measureText(text).width + 10;
                    const tx = sx; const ty = sy - 20;
                    ctx.fillStyle = 'rgba(0,0,0,0.6)';
                    ctx.fillRect(tx - tw/2, ty - 12, tw, 16);
                    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText(text, tx, ty - 4);
                }
            }
            ctx.restore();
        }
    }

    // Boss HP bar (updated externally outside canvas for fancy styling)
    if (b.core && !b.defeated && gameState.gameStatus === 'playing') {
        const container = document.getElementById('bossHealthBarContainer');
        const fill = document.getElementById('bossHealthBarFill');
        const text = document.getElementById('bossHealthBarText');
        
        if (container && fill && text) {
            container.style.display = 'block';
            const pct = Math.max(0, Math.min(1, (b.core.hp || 0) / (b.core.maxHp || 1)));
            fill.style.width = (pct * 100) + '%';
            text.textContent = `${Math.ceil(b.core.hp || 0)} / ${b.core.maxHp || 0}`;
        }
    } else {
        // Hide boss health bar when defeated, not active, or game not playing
        const container = document.getElementById('bossHealthBarContainer');
        if (container) container.style.display = 'none';
    }
    
    // Draw IMMUNE effects when shooting core without being mounted
    if (gameState.immuneEffects && gameState.immuneEffects.length > 0) {
        const keep = [];
        for (const effect of gameState.immuneEffects) {
            const age = currentTime - effect.startTime;
            if (age < effect.duration) {
                const alpha = Math.max(0, 1 - (age / effect.duration));
                const rise = age * 0.03; // Rise up slowly
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#ff3355';
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 3;
                ctx.font = 'bold 28px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const px = (effect.x + 0.5) * CELL_SIZE;
                const py = (effect.y + 0.5) * CELL_SIZE - rise;
                ctx.strokeText('IMMUNE', px, py);
                ctx.fillText('IMMUNE', px, py);
                ctx.restore();
                keep.push(effect);
            }
        }
        gameState.immuneEffects = keep;
    }

    // Virus monologue overlay bar (appears after door fade; replaces boss HP region)
    if (b.defeated && (b.virusDialogueActive || b.virusDialogueFinished) && b.virusDialogueLines) {
        const barW = canvas.width * 0.75; const barH = 32; const bx = (canvas.width - barW)/2; const by = 12;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(bx - 6, by - 6, barW + 12, barH + 12);
        ctx.strokeStyle = '#ffdd33'; ctx.lineWidth = 3; ctx.strokeRect(bx - 6, by - 6, barW + 12, barH + 12);
        const idx = Math.min(b.virusDialogueIndex, b.virusDialogueLines.length - 1);
        const line = b.virusDialogueActive ? b.virusDialogueLines[idx] : (b.virusDialogueFinished ? 'ESCAPE!' : '');
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#ffdd33';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(line, bx + barW/2, by + barH/2);
        ctx.restore();
    }

    // Ammo HUD (top-right) — only Level 10 and after bazooka is picked up
    // Ammo counter removed - now shown in main UI only

    // Top-bar lore/status (only in Level 10 prep room): draw over canvas top for visibility
    if ((gameState.currentLevel === 10) && gameState.boss && gameState.boss.prepRoom && gameState.statusMessage) {
        const text = String(gameState.statusMessage);
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, canvas.width, 28);
        ctx.fillStyle = '#ffd166'; // high-contrast warm yellow
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width/2, 14);
        ctx.restore();
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
            
            // ONLY show damaged/destroyed walls when bazooka mode is active
            if (isBazookaMode()) {
                // Show damaged walls (walls that have taken 1 hit)
                if (cellType === CELL.WALL && gameState.wallHealth) {
                    const wallKey = `${x},${y}`;
                    const health = gameState.wallHealth[wallKey];
                    if (health === 1) {
                        // Wall has 1 hit - show cracked/damaged appearance
                        ctx.save();
                        ctx.fillStyle = 'rgba(255, 100, 0, 0.3)'; // Orange tint
                        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                        // Draw cracks
                        ctx.strokeStyle = 'rgba(255, 150, 0, 0.8)';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(x * CELL_SIZE + 5, y * CELL_SIZE + 2);
                        ctx.lineTo(x * CELL_SIZE + 15, y * CELL_SIZE + 18);
                        ctx.moveTo(x * CELL_SIZE + 10, y * CELL_SIZE);
                        ctx.lineTo(x * CELL_SIZE + 8, y * CELL_SIZE + CELL_SIZE);
                        ctx.stroke();
                        ctx.restore();
                    }
                }
                
                // Show destroyed wall tiles (now empty but tracked with health=0)
                if (cellType === CELL.EMPTY && gameState.wallHealth) {
                    const wallKey = `${x},${y}`;
                    const health = gameState.wallHealth[wallKey];
                    // Check if this empty cell was a destroyed wall (health === 0)
                    if (health === 0) {
                        // Draw destroyed wall appearance
                        ctx.save();
                        ctx.fillStyle = 'rgba(100, 100, 100, 0.4)'; // Dark gray rubble
                        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                        // Draw debris/rubble pattern
                        ctx.fillStyle = 'rgba(80, 80, 80, 0.6)';
                        ctx.fillRect(x * CELL_SIZE + 2, y * CELL_SIZE + 3, 6, 6);
                        ctx.fillRect(x * CELL_SIZE + 12, y * CELL_SIZE + 8, 5, 5);
                        ctx.fillRect(x * CELL_SIZE + 5, y * CELL_SIZE + 14, 7, 4);
                        ctx.restore();
                    }
                }
            }
        }
    }

    // Lava/door overlays (boss-related)
    const b = gameState.boss;
    const now = performance.now();
    // Boss victory door overlay (red door while blocked)
    // Victory door draw logic (center): visible pre-defeat; fades in post-core-fade
    if (b && b.victoryDoor) {
        const vx = b.victoryDoor.x * CELL_SIZE;
        const vy = b.victoryDoor.y * CELL_SIZE;
        let showDoor = false;
        let alpha = 1.0;
        if (!b.defeated) { showDoor = true; alpha = 1.0; }
        else if (b.defeated && b.doorFadeStartAt) {
            const now = performance.now();
            if (now >= b.doorFadeStartAt) {
                showDoor = true;
                const total = Math.max(1, (b.doorFadeUntil || (b.doorFadeStartAt + 1)) - b.doorFadeStartAt);
                const remain = Math.max(0, (b.doorFadeUntil || 0) - now);
                alpha = 1 - Math.min(1, remain / total);
            }
        }
        if (showDoor) {
            ctx.save();
            ctx.globalAlpha = alpha;
            const accessible = b.defeated && b.postEscapeStarted; // after monologue + seeker spawn
            ctx.fillStyle = accessible ? '#00b84a' : 'rgba(200,0,0,0.95)';
            ctx.fillRect(vx, vy, CELL_SIZE, CELL_SIZE);
            ctx.strokeStyle = accessible ? '#003d19' : '#330000';
            ctx.lineWidth = 2;
            ctx.strokeRect(vx + 1, vy + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            if (accessible) {
                ctx.font = 'bold 12px Arial';
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('EXIT', vx + CELL_SIZE/2, vy + CELL_SIZE/2);
            }
            ctx.restore();
        }
    }

    // Lava overlay on outer ring during boss phase 2 anti-camping
    if (b && b.lavaWarnUntil && now < b.lavaWarnUntil && !(b.lavaActiveUntil && now < b.lavaActiveUntil)) {
        // Warning overlay: yellow/orange pulsing
        ctx.save();
        const pulse = Math.sin(now / 120) * 0.25 + 0.75;
        const warnCol = `rgba(255, 180, 0, ${0.35 + 0.25 * pulse})`;
        for (let x = 1; x < MAZE_WIDTH - 1; x++) {
            ctx.fillStyle = warnCol;
            ctx.fillRect(x * CELL_SIZE, 1 * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            ctx.fillRect(x * CELL_SIZE, (MAZE_HEIGHT - 2) * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
        for (let y = 1; y < MAZE_HEIGHT - 1; y++) {
            ctx.fillStyle = warnCol;
            ctx.fillRect(1 * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            ctx.fillRect((MAZE_WIDTH - 2) * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
        ctx.restore();
    }
    if (b && b.lavaActiveUntil && now < b.lavaActiveUntil) {
        ctx.save();
        const lavaCol = 'rgba(255, 80, 0, 0.65)';
        for (let x = 1; x < MAZE_WIDTH - 1; x++) {
            ctx.fillStyle = lavaCol;
            ctx.fillRect(x * CELL_SIZE, 1 * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            ctx.fillRect(x * CELL_SIZE, (MAZE_HEIGHT - 2) * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
        for (let y = 1; y < MAZE_HEIGHT - 1; y++) {
            ctx.fillStyle = lavaCol;
            ctx.fillRect(1 * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            ctx.fillRect((MAZE_WIDTH - 2) * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
        ctx.restore();
    }
    // Post-defeat collapsing lava from edges inward
    if (b && b.defeated && b.collapseStartAt) {
        const rate = Math.max(50, b.collapseRateMs || 400);
        const elapsed = now - b.collapseStartAt;
        const ringsCovered = Math.max(0, Math.floor(elapsed / rate));
        if (ringsCovered > 0) {
            ctx.save();
            const lavaCol = 'rgba(255, 60, 0, 0.55)';
            for (let y = 1; y < MAZE_HEIGHT - 1; y++) {
                for (let x = 1; x < MAZE_WIDTH - 1; x++) {
                    const ring = Math.min(x, MAZE_WIDTH - 1 - x, y, MAZE_HEIGHT - 1 - y);
                    if (ring <= ringsCovered) {
                        ctx.fillStyle = lavaCol;
                        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                    }
                }
            }
            ctx.restore();
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
    // Calculate player position with jump animation
    let playerX = gameState.player.x;
    let playerY = gameState.player.y;
    let jumpProgress = 0;
    let isJumping = false;
    
    // Check for active jump animation
    if (gameState.jumpAnimation && gameState.jumpAnimation.active) {
        const now = performance.now();
        const elapsed = now - gameState.jumpAnimation.startTime;
        const progress = Math.min(1, elapsed / gameState.jumpAnimation.duration);
        
        if (progress < 1) {
            // Interpolate between start and end positions
            playerX = gameState.jumpAnimation.startX + 
                     (gameState.jumpAnimation.endX - gameState.jumpAnimation.startX) * progress;
            playerY = gameState.jumpAnimation.startY + 
                     (gameState.jumpAnimation.endY - gameState.jumpAnimation.startY) * progress;
            jumpProgress = progress;
            isJumping = true;
        } else {
            // Animation complete
            gameState.jumpAnimation.active = false;
        }
    }
    
    const centerX = playerX * CELL_SIZE + CELL_SIZE / 2;
    const centerY = playerY * CELL_SIZE + CELL_SIZE / 2;
    const radius = CELL_SIZE / 2 - 2;

    // Add jump arc effect (parabolic motion effect) - MUCH MORE VISIBLE
    let jumpOffset = 0;
    if (isJumping) {
        // Create a bigger arc: peaks at 50% progress
        jumpOffset = -Math.sin(jumpProgress * Math.PI) * CELL_SIZE * 1.5; // Increased from 0.8 to 1.5
    }

    // Draw motion blur trail during jump - MORE VISIBLE
    if (isJumping) {
        const trailSteps = 8; // Increased from 5 to 8
        for (let i = 0; i < trailSteps; i++) {
            const t = jumpProgress - (i * 0.08); // Tighter spacing
            if (t > 0 && t < 1) {
                const tx = (gameState.jumpAnimation.startX + 
                           (gameState.jumpAnimation.endX - gameState.jumpAnimation.startX) * t) * CELL_SIZE + CELL_SIZE / 2;
                const ty = (gameState.jumpAnimation.startY + 
                           (gameState.jumpAnimation.endY - gameState.jumpAnimation.startY) * t) * CELL_SIZE + CELL_SIZE / 2;
                const tOffset = -Math.sin(t * Math.PI) * CELL_SIZE * 1.5;
                const alpha = 0.3 - (i * 0.035); // More opaque trails
                
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#00BFFF'; // Brighter cyan
                ctx.beginPath();
                ctx.arc(tx, ty + tOffset, radius * 0.9, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
        
        // Add speed lines during jump
        ctx.save();
        const angle = Math.atan2(
            gameState.jumpAnimation.endY - gameState.jumpAnimation.startY,
            gameState.jumpAnimation.endX - gameState.jumpAnimation.startX
        );
        ctx.translate(centerX, centerY + jumpOffset);
        ctx.rotate(angle);
        ctx.strokeStyle = `rgba(0, 191, 255, ${0.4 * (1 - jumpProgress)})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            const offset = (i - 1.5) * 6;
            ctx.beginPath();
            ctx.moveTo(-radius * 2, offset);
            ctx.lineTo(-radius * 1.2, offset);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Base color (sprinting = cyan, else royal blue). During stun, fade brightness back to full by stun end.
    const baseRGB = gameState.isSprinting ? { r: 0, g: 255, b: 255 } : { r: 65, g: 105, b: 225 };
    let r = baseRGB.r, g = baseRGB.g, b = baseRGB.b;
    if (gameState.playerStunned) {
        const start = gameState.playerStunStart || (performance.now() - 1);
        const total = Math.max(1, (gameState.playerStunUntil || (start + 4000)) - start);
        const now = performance.now();
        const t = Math.min(1, Math.max(0, (now - start) / total));
        const f = 0.6 + 0.4 * t; // 60% brightness at start -> 100% at end
        r = Math.round(baseRGB.r * f);
        g = Math.round(baseRGB.g * f);
        b = Math.round(baseRGB.b * f);
    }

    // Draw player with jump offset
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.beginPath();
    ctx.arc(centerX, centerY + jumpOffset, radius, 0, Math.PI * 2);
    ctx.fill();

    // Wings + timer ring while mounted (flight mode)
    const nowT = performance.now();
    if (gameState.mountedPigUntil && nowT < gameState.mountedPigUntil) {
        const mountCenterY = centerY + jumpOffset;
        // Soft white wings on both sides, with a gentle flap
        const flap = Math.sin(nowT / 180) * 4; // +/-4px
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        // Left wing
        ctx.beginPath();
        ctx.moveTo(centerX - radius - 3, mountCenterY);
        ctx.lineTo(centerX - radius - 10, mountCenterY - 8 - flap);
        ctx.lineTo(centerX - radius - 10, mountCenterY + 8 + flap);
        ctx.closePath(); ctx.fill();
        // Right wing
        ctx.beginPath();
        ctx.moveTo(centerX + radius + 3, mountCenterY);
        ctx.lineTo(centerX + radius + 10, mountCenterY - 8 - flap);
        ctx.lineTo(centerX + radius + 10, mountCenterY + 8 + flap);
        ctx.closePath(); ctx.fill();
        ctx.restore();

        // Yellow countdown ring showing remaining flight time
        const start = gameState.mountedPigStart || (gameState.mountedPigUntil - 4000);
        const total = Math.max(1, gameState.mountedPigUntil - start);
        const remain = Math.max(0, gameState.mountedPigUntil - nowT);
        const t = 1 - Math.min(1, remain / total); // 0->1 progress
        const R = radius + 8;
        // Faint base ring
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.25)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(centerX, mountCenterY, R, 0, Math.PI * 2); ctx.stroke();
        // Progress arc from top, clockwise
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.9)';
        ctx.lineWidth = 3;
        const startAng = -Math.PI / 2;
        ctx.beginPath(); ctx.arc(centerX, mountCenterY, R, startAng, startAng + t * Math.PI * 2); ctx.stroke();
        ctx.restore();
    }

    // Wings visual while mounted (flight mode)
    const mountedActive = !!(gameState.mountedPigUntil && performance.now() < gameState.mountedPigUntil);
    if (mountedActive) {
        ctx.save();
        ctx.translate(centerX, centerY + jumpOffset);
        // Gentle flap animation
        const t = performance.now() / 200;
        const flap = Math.sin(t) * 0.2;
        ctx.rotate(flap);
        ctx.fillStyle = 'rgba(255, 240, 255, 0.85)';
        ctx.strokeStyle = 'rgba(220, 180, 255, 0.9)';
        ctx.lineWidth = 1.5;
        // Left wing
        ctx.beginPath();
        ctx.moveTo(-radius * 0.2, -radius * 0.4);
        ctx.quadraticCurveTo(-radius * 1.8, -radius * 0.2, -radius * 1.9, 0);
        ctx.quadraticCurveTo(-radius * 1.4, radius * 0.3, -radius * 0.3, radius * 0.1);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        // Right wing
        ctx.beginPath();
        ctx.moveTo(radius * 0.2, -radius * 0.4);
        ctx.quadraticCurveTo(radius * 1.8, -radius * 0.2, radius * 1.9, 0);
        ctx.quadraticCurveTo(radius * 1.4, radius * 0.3, radius * 0.3, radius * 0.1);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
    }

    // Draw stun effect - electric chains; the number of chains equals remaining seconds (4..1)
    if (gameState.playerStunned) {
        const now = performance.now();
        const remainMs = Math.max(0, (gameState.playerStunUntil || now) - now);
        const chains = Math.max(1, Math.min(4, Math.ceil(remainMs / 1000)));
        const stunCenterY = centerY + jumpOffset;
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,0,0.7)';
        ctx.lineWidth = 2;
        for (let i = 0; i < chains; i++) {
            // Distribute evenly around the circle; keep a subtle spin for life
            const angle = (i * (2 * Math.PI / chains)) + (now / 200);
            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = stunCenterY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + 8);
            const y2 = stunCenterY + Math.sin(angle) * (radius + 8);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        ctx.restore();
    }
    
    if (gameState.isJumpCharging) {
        const chargeCenterY = centerY + jumpOffset;
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX, chargeCenterY, radius + 5, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Draw blocking shield when active (with aura/glow)
    if (gameState.blockActive) {
        const shieldCenterY = centerY + jumpOffset;
        const r = Math.max(CELL_SIZE, radius + 10);
        // Aura
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = 'rgba(255, 240, 120, 0.25)';
        ctx.beginPath(); ctx.arc(centerX, shieldCenterY, r + 6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        // Directional shield wedge
        ctx.save();
        ctx.translate(centerX, shieldCenterY);
        ctx.rotate(gameState.blockAngle);
        ctx.fillStyle = 'rgba(255, 213, 0, 0.28)';
        ctx.strokeStyle = 'rgba(255, 213, 0, 0.95)';
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
    const collisionCenterY = centerY + jumpOffset;
    if (gameState.collisionShieldState === 'active') {
        // Pink outline with subtle pulse
        const pulse = Math.sin(now / 180) * 0.25 + 0.75;
        ctx.save();
        ctx.strokeStyle = `rgba(255, 119, 170, ${0.6 * pulse})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(centerX, collisionCenterY, radius + 4, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    } else if (gameState.collisionShieldState === 'recharging' && gameState.collisionShieldRechargeEnd) {
        // Faint ring plus progress arc from top, clockwise
        const remain = Math.max(0, gameState.collisionShieldRechargeEnd - now);
        const t = 1 - Math.min(1, remain / COLLISION_SHIELD_RECHARGE_TIME);
        ctx.save();
        // Base faint ring
        ctx.strokeStyle = 'rgba(255, 119, 170, 0.18)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(centerX, collisionCenterY, radius + 4, 0, Math.PI * 2); ctx.stroke();
        // Progress arc
        ctx.strokeStyle = 'rgba(255, 119, 170, 0.55)';
        ctx.lineWidth = 3;
        const start = -Math.PI / 2;
        ctx.beginPath(); ctx.arc(centerX, collisionCenterY, radius + 4, start, start + t * Math.PI * 2); ctx.stroke();
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

// Shield particles
function drawShieldParticles(currentTime) {
    const arr = gameState.shieldParticles || [];
    if (!arr.length) return;
    const dtScale = 1 / 1000;
    const keep = [];
    for (const p of arr) {
        const age = currentTime - p.born;
        if (age > p.life) continue;
        // integrate
        const dt = Math.min(32, Math.max(0, currentTime - (p._last || currentTime))) * dtScale;
        p._last = currentTime;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        // fade
        const t = Math.max(0, 1 - (age / p.life));
        const px = p.x * CELL_SIZE;
        const py = p.y * CELL_SIZE;
        ctx.save();
        ctx.globalAlpha = t;
        ctx.fillStyle = p.col || 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(px, py, 2 + (1 - t) * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        keep.push(p);
    }
    gameState.shieldParticles = keep;
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
    
    // Update main health display
    const healthText = gameState.fakeZeroHp ? '0' : '❤️'.repeat(gameState.lives);
    if (healthEl) healthEl.textContent = healthText;
    
    // Also update simplified UI health if it exists
    const healthSimple = document.getElementById('health-simple');
    if (healthSimple) healthSimple.textContent = healthText;
    
    const staminaPct = Math.floor(gameState.stamina);
    const staminaText = `${staminaPct}%`;
    const staminaColor = gameState.stamina < 100 ? '#888' : '#0ff';
    
    // Update main stamina display
    if (staminaEl) {
        staminaEl.textContent = staminaText;
        staminaEl.style.color = staminaColor;
    }
    
    // Update simplified UI stamina if it exists
    const staminaSimple = document.getElementById('stamina-simple');
    if (staminaSimple) {
        staminaSimple.textContent = staminaText;
        staminaSimple.style.color = staminaColor;
    }
    
    // Update stamina bar
    if (staminaFill) {
        staminaFill.style.width = `${staminaPct}%`;
        staminaFill.style.background = gameState.stamina < 100
            ? 'linear-gradient(90deg, #3aa3a3, #4dbbd6)'
            : 'linear-gradient(90deg, #0ff, #61dafb)';
    }
    
    // Shield HUD
    const now = performance.now();
    let shieldText = '🛡️';
    let shieldColor = '#888';
    if (gameState.collisionShieldState === 'active') {
        shieldText = '🛡️ Ready';
        shieldColor = '#ff77aa';
    } else if (gameState.collisionShieldState === 'recharging' && gameState.collisionShieldRechargeEnd) {
        const remain = Math.max(0, gameState.collisionShieldRechargeEnd - now);
        const secs = (remain / 1000).toFixed(1);
        shieldText = `🛡️ ${secs}s`;
        shieldColor = '#888';
    }
    
    // Update main shield display
    if (shieldEl) {
        shieldEl.textContent = shieldText;
        shieldEl.style.color = shieldColor;
    }
    
    // Update simplified UI shield if it exists
    const shieldSimple = document.getElementById('shield-simple');
    if (shieldSimple) {
        shieldSimple.textContent = shieldText;
        shieldSimple.style.color = shieldColor;
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
    
    // Bazooka ammo display (only show when bazooka is active)
    const bazookaSection = document.getElementById('bazookaAmmoSection');
    const bazookaAmmoEl = document.getElementById('bazookaAmmo');
    if (bazookaSection && bazookaAmmoEl) {
        const hasBazooka = gameState.bazooka && gameState.bazooka.has;
        if (hasBazooka) {
            const ammo = gameState.bazooka.ammo || 0;
            const maxAmmo = gameState.bazooka.maxAmmo || 10;
            bazookaAmmoEl.textContent = `${ammo}/${maxAmmo}`;
            bazookaSection.style.display = 'flex';
        } else {
            bazookaSection.style.display = 'none';
        }
    }
}

function drawGeneratorThreatIndicators(currentTime) {
    if (!gameState.isGeneratorUIOpen) return;
    
    const px = gameState.player.x;
    const py = gameState.player.y;
    
    // Find Mortar and Batter enemies
    const mortar = gameState.enemies.find(e => e.type === 'mortar');
    const batter = gameState.enemies.find(e => e.type === 'batter');
    
    // Get or create indicator elements
    let mortarIndicator = document.getElementById('mortarThreatIndicator');
    let batterIndicator = document.getElementById('batterThreatIndicator');
    
    if (!mortarIndicator) {
        mortarIndicator = document.createElement('div');
        mortarIndicator.id = 'mortarThreatIndicator';
        mortarIndicator.style.cssText = `
            position: fixed;
            right: calc(50% - 350px);
            top: 50%;
            transform: translateY(-50%);
            width: 120px;
            height: 120px;
            border-radius: 50%;
            border: 4px solid;
            display: none;
            z-index: 1001;
            pointer-events: none;
            transition: opacity 0.15s;
        `;
        document.body.appendChild(mortarIndicator);
    }
    
    if (!batterIndicator) {
        batterIndicator = document.createElement('div');
        batterIndicator.id = 'batterThreatIndicator';
        batterIndicator.style.cssText = `
            position: fixed;
            left: calc(50% - 350px);
            top: 50%;
            transform: translateY(-50%);
            width: 120px;
            height: 120px;
            border-radius: 50%;
            border: 4px solid;
            display: none;
            z-index: 1001;
            pointer-events: none;
            transition: opacity 0.15s;
        `;
        document.body.appendChild(batterIndicator);
    }
    
    // Update Mortar indicator
    if (mortar) {
        mortarIndicator.style.display = 'block';
        
        // Check if Mortar is aiming at player
        if (mortar.state === 'aim' && mortar.aimTarget) {
            const targetX = mortar.aimTarget.x;
            const targetY = mortar.aimTarget.y;
            const radius = 2; // Mortar explosion radius
            
            // Check if player is in the target area
            const inDanger = Math.max(Math.abs(targetX - px), Math.abs(targetY - py)) <= radius;
            
            if (inDanger) {
                // Flash RED when targeted
                const flashSpeed = 200;
                const flash = Math.sin(currentTime / flashSpeed) * 0.5 + 0.5;
                mortarIndicator.style.borderColor = '#ff0000';
                mortarIndicator.style.backgroundColor = `rgba(255, 0, 0, ${0.2 + flash * 0.3})`;
                mortarIndicator.style.boxShadow = `0 0 ${20 + flash * 20}px rgba(255, 0, 0, 0.8)`;
            } else {
                // Blue when Mortar is active but not targeting player
                mortarIndicator.style.borderColor = '#00aaff';
                mortarIndicator.style.backgroundColor = 'rgba(0, 170, 255, 0.2)';
                mortarIndicator.style.boxShadow = '0 0 20px rgba(0, 170, 255, 0.6)';
            }
        } else {
            // Blue idle state
            mortarIndicator.style.borderColor = '#00aaff';
            mortarIndicator.style.backgroundColor = 'rgba(0, 170, 255, 0.2)';
            mortarIndicator.style.boxShadow = '0 0 20px rgba(0, 170, 255, 0.6)';
        }
    } else {
        mortarIndicator.style.display = 'none';
    }
    
    // Update Batter indicator
    if (batter) {
        batterIndicator.style.display = 'block';
        
        const bx = Math.floor(batter.fx);
        const by = Math.floor(batter.fy);
        const distance = Math.hypot(bx - px, by - py);
        
        // Check if in rage mode
        const inRage = batter.state === 'rage' || batter.state === 'chase';
        
        if (inRage) {
            // Flash RED rapidly when in rage mode
            const flashSpeed = 150;
            const flash = Math.sin(currentTime / flashSpeed) * 0.5 + 0.5;
            batterIndicator.style.borderColor = '#ff0000';
            batterIndicator.style.backgroundColor = `rgba(255, 0, 0, ${0.2 + flash * 0.3})`;
            batterIndicator.style.boxShadow = `0 0 ${20 + flash * 30}px rgba(255, 0, 0, 0.9)`;
        } else if (distance <= 15) {
            // Brown/orange pulsing - speed increases with proximity
            const maxDistance = 15;
            const proximityRatio = 1 - Math.min(1, distance / maxDistance);
            
            // Flash speed increases as Batter gets closer (300ms at far, 100ms at close)
            const flashSpeed = 300 - (proximityRatio * 200);
            const flash = Math.sin(currentTime / flashSpeed) * 0.5 + 0.5;
            
            const brownColor = '#8B4513'; // Brown
            batterIndicator.style.borderColor = brownColor;
            batterIndicator.style.backgroundColor = `rgba(139, 69, 19, ${0.1 + flash * (0.2 + proximityRatio * 0.3)})`;
            batterIndicator.style.boxShadow = `0 0 ${10 + flash * (10 + proximityRatio * 20)}px rgba(139, 69, 19, ${0.5 + proximityRatio * 0.4})`;
        } else {
            // Too far - hide indicator
            batterIndicator.style.display = 'none';
        }
    } else {
        batterIndicator.style.display = 'none';
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
    
    // Draw threat indicators for Mortar and Batter
    drawGeneratorThreatIndicators(currentTime);
    
    if (gameState.skillCheckState) {
        // Show mobile button on touch devices, otherwise show keyboard instruction
        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (isMobile) {
            instruction.textContent = 'Tap the button when pointer is in yellow zone!';
            const mobileBtn = document.getElementById('mobileSkillCheckBtn');
            if (mobileBtn) mobileBtn.style.display = 'block';
        } else {
            instruction.textContent = 'Press SPACE when the pointer is in the yellow zone!';
        }
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
        // Hide mobile button when not in skill check
        const mobileBtn = document.getElementById('mobileSkillCheckBtn');
        if (mobileBtn) mobileBtn.style.display = 'none';
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
    // Draw status message centered below the canvas instead of using DOM element that shifts layout
    if (!gameState.statusMessage) return;
    
    // Don't show status message if game container is hidden (main menu)
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer || gameContainer.style.display === 'none') return;
    
    // Create a fixed position overlay below canvas
    const messageBox = document.getElementById('statusMessageBox') || createStatusMessageBox();
    messageBox.textContent = gameState.statusMessage;
    messageBox.style.display = 'block';
    
    // Adjust position if boss bar is visible
    const bossBar = document.getElementById('bossHealthBarContainer');
    const bossBarVisible = bossBar && bossBar.style.display !== 'none';
    messageBox.style.top = bossBarVisible ? 'calc(50% + 200px)' : 'calc(50% + 320px)';
    
    // Update colors dynamically based on current level
    const levelColor = getLevelColor(gameState.currentLevel || 1);
    const borderColor = levelColor.css;
    const glowColor = levelColor.rgba(0.4);
    messageBox.style.borderColor = borderColor;
    messageBox.style.boxShadow = `0 0 20px ${glowColor}`;
}

function createStatusMessageBox() {
    const box = document.createElement('div');
    box.id = 'statusMessageBox';
    
    // Check if boss health bar is visible to adjust position
    const bossBar = document.getElementById('bossHealthBarContainer');
    const bossBarVisible = bossBar && bossBar.style.display !== 'none';
    const topPosition = bossBarVisible ? 'calc(50% + 200px)' : 'calc(50% + 320px)';
    
    // Get current level color for dynamic theming
    const levelColor = getLevelColor(gameState.currentLevel || 1);
    const borderColor = levelColor.css;
    const glowColor = levelColor.rgba(0.4);
    
    box.style.cssText = `
        position: fixed;
        left: 50%;
        top: ${topPosition};
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.85);
        color: #ffd166;
        padding: 12px 24px;
        border-radius: 8px;
        border: 2px solid ${borderColor};
        font-size: 16px;
        font-weight: bold;
        text-align: center;
        z-index: 500;
        box-shadow: 0 0 20px ${glowColor};
        max-width: 80%;
        pointer-events: none;
    `;
    document.body.appendChild(box);
    return box;
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
