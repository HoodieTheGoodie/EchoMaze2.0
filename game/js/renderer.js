// renderer.js - Canvas rendering

import { gameState, SKILL_CHECK_ROTATION_TIME, MAZE_WIDTH, MAZE_HEIGHT, TELEPORT_CHARGE_TIME, COLLISION_SHIELD_RECHARGE_TIME, COLLISION_SHIELD_BREAK_FLASH, getRunClock } from './state.js';
import { CELL } from './maze.js';
import { particles } from './particles.js';
import { getLevelColor, isBazookaMode } from './config.js';
import { getSprite } from './sprites.js';
import { isMobile } from './mobile-controls.js';
import { getPlayerVisuals } from './skins.js';
import { level11State } from './level11.js';

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
    currentRooms: document.getElementById('currentRooms'),
    roomsSection: document.getElementById('roomsSection'),
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
    let neonColor;
    if (gameState.currentLevel === 100 || gameState.endlessMode) {
        neonColor = '#b300ff'; // Purple for endless mode
    } else {
        const level = gameState.currentLevel || 1;
        const color = getLevelColor(level);
        neonColor = color.css;
    }
    
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
            } else if (cellType === CELL.GLITCH) {
                // Glitching wall tile (use noisy stripes)
                bctx.fillStyle = '#120012';
                bctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
                const grad = bctx.createLinearGradient(px, py, px + CELL_SIZE, py + CELL_SIZE);
                grad.addColorStop(0, 'rgba(255,0,255,0.45)');
                grad.addColorStop(0.5, 'rgba(0,255,255,0.35)');
                grad.addColorStop(1, 'rgba(255,255,0,0.35)');
                bctx.fillStyle = grad;
                bctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
                bctx.strokeStyle = 'rgba(255,255,255,0.35)';
                bctx.lineWidth = 1;
                bctx.beginPath();
                bctx.moveTo(px, py + CELL_SIZE * 0.25);
                bctx.lineTo(px + CELL_SIZE, py + CELL_SIZE * 0.35);
                bctx.moveTo(px, py + CELL_SIZE * 0.65);
                bctx.lineTo(px + CELL_SIZE, py + CELL_SIZE * 0.55);
                bctx.stroke();
            } else if (cellType === CELL.TERMINAL) {
                // Terminal console pad
                bctx.fillStyle = '#0f0f18';
                bctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
                bctx.fillStyle = '#00f6ff';
                bctx.fillRect(px + CELL_SIZE * 0.25, py + CELL_SIZE * 0.25, CELL_SIZE * 0.5, CELL_SIZE * 0.5);
                bctx.fillStyle = '#00151a';
                bctx.fillRect(px + CELL_SIZE * 0.3, py + CELL_SIZE * 0.3, CELL_SIZE * 0.4, CELL_SIZE * 0.4);
            } else {
                bctx.fillStyle = FLOOR_COLOR;
                bctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
            }
        }
    }
    mazeBaseDirty = false;
}

function drawLevel11Items() {
    // Draw Level 11 items (flashlight, keys, notes, enemies)
    if (!gameState || (gameState.mode !== 'level11' && !gameState.isLevel11)) return;
    if (!canvas || !ctx) return;
    
    const currentRoom = level11State.currentRoom;
    
    // Draw green key in puzzle room (after puzzle solved)
    if (currentRoom === 'puzzle' && level11State.rooms.puzzle.solved && !level11State.rooms.puzzle.greenKeyTaken && level11State.rooms.puzzle.greenKeyPos) {
        const keyPos = level11State.rooms.puzzle.greenKeyPos;
        const sprite = getSprite('greenKey');
        const px = (keyPos.x + 0.5) * CELL_SIZE;
        const py = (keyPos.y + 0.5) * CELL_SIZE;
        
        // Glow effect
        ctx.save();
        const grad = ctx.createRadialGradient(px, py, 0, px, py, CELL_SIZE * 0.6);
        grad.addColorStop(0, 'rgba(0, 255, 0, 0.9)');
        grad.addColorStop(0.6, 'rgba(0, 255, 0, 0.3)');
        grad.addColorStop(1, 'rgba(0, 255, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, CELL_SIZE * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // Draw sprite if available, otherwise fallback
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00ff00';
            ctx.drawImage(sprite, px - CELL_SIZE * 0.4, py - CELL_SIZE * 0.4, CELL_SIZE * 0.8, CELL_SIZE * 0.8);
            ctx.restore();
        } else {
            // Fallback: simple key shape
            ctx.save();
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(px - CELL_SIZE * 0.25, py - CELL_SIZE * 0.1, CELL_SIZE * 0.5, CELL_SIZE * 0.2);
            ctx.beginPath();
            ctx.arc(px - CELL_SIZE * 0.3, py, CELL_SIZE * 0.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
    
    // Draw flashlight in puzzle room (after puzzle solved, if not yet taken)
    if (currentRoom === 'puzzle' && level11State.rooms.puzzle.solved && !level11State.rooms.puzzle.flashlightTaken && level11State.rooms.puzzle.flashlightPos) {
        const flashPos = level11State.rooms.puzzle.flashlightPos;
        const sprite = getSprite('flashlight');
        const px = (flashPos.x + 0.5) * CELL_SIZE;
        const py = (flashPos.y + 0.5) * CELL_SIZE;
        
        // Glow effect
        ctx.save();
        const grad = ctx.createRadialGradient(px, py, 0, px, py, CELL_SIZE * 0.6);
        grad.addColorStop(0, 'rgba(255, 255, 100, 0.8)');
        grad.addColorStop(0.5, 'rgba(255, 255, 100, 0.4)');
        grad.addColorStop(1, 'rgba(255, 255, 100, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, CELL_SIZE * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // Draw sprite if available, otherwise fallback
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ffff00';
            ctx.drawImage(sprite, px - CELL_SIZE * 0.4, py - CELL_SIZE * 0.4, CELL_SIZE * 0.8, CELL_SIZE * 0.8);
            ctx.restore();
        } else {
            // Fallback: simple flashlight shape
            ctx.save();
            ctx.fillStyle = '#888888';
            ctx.fillRect(px - CELL_SIZE * 0.25, py - CELL_SIZE * 0.35, CELL_SIZE * 0.5, CELL_SIZE * 0.7);
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(px, py + CELL_SIZE * 0.25, CELL_SIZE * 0.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
    
    // MAZE ROOM ITEMS (legacy Level 11 dark room)
    if (currentRoom === 'maze' || (gameState.isLevel11 && gameState.level11 && gameState.level11.currentRoom === 'dark')) {
        // Draw enemies (bats) with exposure highlighting
        const enemies = (gameState.isLevel11 && gameState.level11) 
            ? (gameState.level11.bats || [])
            : (level11State.rooms.maze.enemies || []);
        const currentTime = performance.now();
        
        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            if (!enemy || !enemy.alive) continue;
            const ex = enemy.fx * CELL_SIZE;
            const ey = enemy.fy * CELL_SIZE;
            
            ctx.save();
            
            // NEW: Draw light glow around AGGROED bats only
            // Aggroed bats are visible in darkness with a bright yellow/white light aura
            if (enemy.aggro) {
                // Large light glow for aggroed bats - visible in complete darkness
                const lightGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, CELL_SIZE * 2);
                lightGrad.addColorStop(0, 'rgba(255, 255, 150, 0.8)');  // Bright yellow core
                lightGrad.addColorStop(0.4, 'rgba(255, 200, 0, 0.4)');  // Orange middle
                lightGrad.addColorStop(1, 'rgba(255, 150, 0, 0)');       // Fade out
                ctx.fillStyle = lightGrad;
                ctx.beginPath();
                ctx.arc(ex, ey, CELL_SIZE * 2, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Determine bat color: GRAY normally, RED when exposed to flashlight
            const exposureTime = enemy.exposureTime || 0;
            const isExposed = exposureTime > 0;
            
            if (isExposed) {
                // Red bat when exposed to flashlight
                const exposurePercent = Math.min(1, exposureTime / 3000); // 0-1 as exposure goes from 0-3000ms
                const redAmount = Math.floor(200 * exposurePercent);
                ctx.fillStyle = `rgb(${150 + redAmount}, 70, 70)`;
            } else {
                // Gray bat (barely visible in darkness without flashlight)
                ctx.fillStyle = '#606060';
            }
            
            // Bat shape: main body (circle)
            ctx.beginPath();
            ctx.arc(ex, ey, CELL_SIZE * 0.35, 0, Math.PI * 2);
            ctx.fill();
            
            // Bat wings (animated slightly based on movement)
            const wingFlap = Math.sin(currentTime / 150 + i) * 0.1;
            ctx.fillRect(ex - CELL_SIZE * 0.5, ey - CELL_SIZE * (0.2 + wingFlap), CELL_SIZE * 0.25, CELL_SIZE * 0.35);
            ctx.fillRect(ex + CELL_SIZE * 0.25, ey - CELL_SIZE * (0.2 - wingFlap), CELL_SIZE * 0.25, CELL_SIZE * 0.35);
            
            // Bat eyes (small glowing dots)
            ctx.fillStyle = isExposed ? '#ff0000' : '#aaaaaa';
            ctx.beginPath();
            ctx.arc(ex - CELL_SIZE * 0.1, ey - CELL_SIZE * 0.05, CELL_SIZE * 0.05, 0, Math.PI * 2);
            ctx.arc(ex + CELL_SIZE * 0.1, ey - CELL_SIZE * 0.05, CELL_SIZE * 0.05, 0, Math.PI * 2);
            ctx.fill();
            
            // Red outline when in RAGE MODE (aggroed)
            if (enemy.aggro) {
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(ex, ey, CELL_SIZE * 0.6, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            
            ctx.restore();
        }
        
        // Draw yellow key if not picked up (legacy Level 11)
        if (gameState.isLevel11 && gameState.level11 && gameState.level11.currentRoom === 'dark' && !gameState.level11.hasYellowKey && gameState.level11.yellowKeyPos) {
            const pos = gameState.level11.yellowKeyPos;
            const sprite = getSprite('yellowKey');
            const px = (pos.x + 0.5) * CELL_SIZE;
            const py = (pos.y + 0.5) * CELL_SIZE;
            
            // Key glow (yellow)
            ctx.save();
            const grad = ctx.createRadialGradient(px, py, 0, px, py, CELL_SIZE * 0.6);
            grad.addColorStop(0, 'rgba(255, 255, 0, 0.9)');
            grad.addColorStop(0.6, 'rgba(255, 255, 0, 0.3)');
            grad.addColorStop(1, 'rgba(255, 255, 0, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(px, py, CELL_SIZE * 0.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            
            // Draw sprite if available, otherwise fallback
            if (sprite && sprite.complete && sprite.naturalWidth > 0) {
                ctx.save();
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#ffff00';
                ctx.drawImage(sprite, px - CELL_SIZE * 0.4, py - CELL_SIZE * 0.4, CELL_SIZE * 0.8, CELL_SIZE * 0.8);
                ctx.restore();
            } else {
                // Fallback: simple key shape
                ctx.save();
                ctx.fillStyle = '#ffff00';
                ctx.fillRect(px - CELL_SIZE * 0.25, py - CELL_SIZE * 0.1, CELL_SIZE * 0.5, CELL_SIZE * 0.2);
                ctx.beginPath();
                ctx.arc(px - CELL_SIZE * 0.3, py, CELL_SIZE * 0.15, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
    }
    
    // Draw flashlight on player when equipped (legacy Level 11)
    if (gameState.isLevel11 && gameState.level11 && gameState.level11.flashlightFound && gameState.player) {
        const sprite = getSprite('flashlight');
        const px = (gameState.player.x + 0.5) * CELL_SIZE;
        const py = (gameState.player.y + 0.5) * CELL_SIZE;
        const mouseX = gameState.mousePosition?.x || px;
        const mouseY = gameState.mousePosition?.y || py;
        const angle = Math.atan2(mouseY - py, mouseX - px);
        const flashlightDist = CELL_SIZE * 0.6;
        const fx = px + Math.cos(angle) * flashlightDist;
        const fy = py + Math.sin(angle) * flashlightDist;
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(angle);
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            const size = CELL_SIZE * 0.7;
            ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
        } else {
            ctx.fillStyle = '#888888';
            ctx.fillRect(-CELL_SIZE * 0.3, -CELL_SIZE * 0.15, CELL_SIZE * 0.6, CELL_SIZE * 0.3);
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(CELL_SIZE * 0.3, 0, CELL_SIZE * 0.1, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

function drawLevel11Darkness() {
    // Only draw darkness in dark room
    if (!gameState || !gameState.isLevel11 || !gameState.level11) return;
    if (!canvas || !ctx) return;
    
    // Only apply darkness to dark room (0% brightness)
    if (gameState.level11.currentRoom !== 'dark') return;
    
    // If night vision mode is enabled (dev mode), don't draw darkness at all
    // Check both gameState.settings and ensure nightVisionMode is true
    if (gameState.settings && gameState.settings.nightVisionMode === true) {
        console.log('[renderer] Night vision mode enabled - skipping darkness overlay');
        return; // Full visibility in night vision mode
    }
    
    // Create darkness overlay layer
    const darkCanvas = document.createElement('canvas');
    darkCanvas.width = canvas.width;
    darkCanvas.height = canvas.height;
    const darkCtx = darkCanvas.getContext('2d');
    
    // Fill with pitch black (0% brightness - complete darkness)
    darkCtx.fillStyle = 'rgba(0,0,0,1.0)';
    darkCtx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Use destination-out to "cut holes" in the darkness for visibility
    darkCtx.globalCompositeOperation = 'destination-out';
    
    const px = (gameState.player.x + 0.5) * CELL_SIZE;
    const py = (gameState.player.y + 0.5) * CELL_SIZE;

    // Faint aura around the player when flashlight is on (so you can see yourself)
    if (gameState.level11.flashlightOn) {
        const baseR = CELL_SIZE * 0.5; // Small 0.5 tile radius
        const aura = darkCtx.createRadialGradient(px, py, 0, px, py, baseR);
        aura.addColorStop(0, 'rgba(0,0,0,0.8)'); // Faint at center
        aura.addColorStop(0.7, 'rgba(0,0,0,0.4)');
        aura.addColorStop(1, 'rgba(0,0,0,0)');
        darkCtx.fillStyle = aura;
        darkCtx.beginPath();
        darkCtx.arc(px, py, baseR, 0, Math.PI * 2);
        darkCtx.fill();
    }
    
    // Draw flashlight beam if flashlight is on (100% brightness cone, 2.5 tile radius)
    if (gameState.level11.flashlightOn && gameState.level11.flashlightFound) {
        // Get mouse position in canvas pixels
        const mousePixelX = gameState.mousePosition?.x || px;
        const mousePixelY = gameState.mousePosition?.y || py;
        
        // Calculate beam direction
        const dx = mousePixelX - px;
        const dy = mousePixelY - py;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 1) {
            // Beam properties - 2.5 tile radius (100% brightness)
            const beamRange = CELL_SIZE * 2.5;
            const beamWidth = CELL_SIZE * 1.8; // Width at the end
            const beamAngle = Math.atan2(dy, dx);
            
            // Draw beam as a cone/trapezoid shape
            darkCtx.save();
            darkCtx.translate(px, py);
            darkCtx.rotate(beamAngle);
            
            // Create cone shape with gradient (100% brightness core, soft falloff)
            const beamGrad = darkCtx.createLinearGradient(0, 0, beamRange, 0);
            beamGrad.addColorStop(0, 'rgba(0,0,0,1)'); // Full cut at player
            beamGrad.addColorStop(0.15, 'rgba(0,0,0,1)'); // 100% brightness core
            beamGrad.addColorStop(0.85, 'rgba(0,0,0,0.95)'); // Still very bright
            beamGrad.addColorStop(1, 'rgba(0,0,0,0.5)'); // Soft falloff at edge
            
            // Draw cone (narrow at player, wider at end)
            const startWidth = CELL_SIZE * 0.25;
            const endWidth = beamWidth;
            
            darkCtx.beginPath();
            darkCtx.moveTo(0, -startWidth); // Player position (narrow)
            darkCtx.lineTo(beamRange, -endWidth); // End (wider) - top edge
            darkCtx.lineTo(beamRange, endWidth); // End (wider) - bottom edge
            darkCtx.lineTo(0, startWidth); // Back to player
            darkCtx.closePath();
            darkCtx.fillStyle = beamGrad;
            darkCtx.fill();
            
            // Add circular bright spotlight at the end of beam (100% brightness center)
            const spotGrad = darkCtx.createRadialGradient(beamRange, 0, 0, beamRange, 0, endWidth * 0.9);
            spotGrad.addColorStop(0, 'rgba(0,0,0,1)'); // 100% brightness center
            spotGrad.addColorStop(0.5, 'rgba(0,0,0,0.9)');
            spotGrad.addColorStop(0.8, 'rgba(0,0,0,0.6)');
            spotGrad.addColorStop(1, 'rgba(0,0,0,0)'); // Soft outer edge
            darkCtx.fillStyle = spotGrad;
            darkCtx.beginPath();
            darkCtx.arc(beamRange, 0, endWidth * 0.9, 0, Math.PI * 2);
            darkCtx.fill();
            
            darkCtx.restore();
        }
    }

    // Draw the darkness layer on top of the main canvas
    ctx.drawImage(darkCanvas, 0, 0);
}

/**
 * Draw difficulty-based border for endless mode
 * Colors change based on current room difficulty
 */
function drawEndlessDifficultyBorder() {
    if (!canvas || !ctx) return;
    
    const ep = window.endlessProgression;
    if (!ep || !ep.currentRun) return;
    
    const roomNumber = ep.currentRun.roomNumber || 1;
    
    // Calculate difficulty based on room number
    let borderColor = '#00ccff'; // Easy (cyan) - rooms 1-5
    let borderWidth = 4;
    
    if (roomNumber >= 15) {
        borderColor = '#ff0088'; // Insane (magenta) - room 15+
        borderWidth = 6;
    } else if (roomNumber >= 10) {
        borderColor = '#ff4400'; // Hard (red-orange) - rooms 10-14
        borderWidth = 5;
    } else if (roomNumber >= 6) {
        borderColor = '#ffaa00'; // Medium (orange) - rooms 6-9
        borderWidth = 4;
    }
    
    // Draw glowing border
    ctx.save();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.shadowBlur = 15;
    ctx.shadowColor = borderColor;
    
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    
    // Draw room number indicator in top-right
    ctx.fillStyle = borderColor;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.shadowBlur = 10;
    ctx.shadowColor = borderColor;
    ctx.fillText(`Room ${roomNumber}`, canvas.width - 8, 8);
    
    ctx.restore();
}

export function render(currentTime) {
    // Safety check
    if (!canvas || !ctx || !gameState.maze) return;
    if (gameState.mazeDirty) { mazeBaseDirty = true; gameState.mazeDirty = false; }
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
    drawLevel11Items();
    drawLevel11Darkness();
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
    
    // Draw difficulty-based border for endless mode
    if (gameState.currentLevel === 100 && gameState.endlessMode) {
        drawEndlessDifficultyBorder();
    }
    
    if (shaking) ctx.restore();
}

function drawEnemies(currentTime) {
    if (gameState.isLevel11 && gameState.level11) {
        const bats = gameState.level11.bats || [];
        ctx.save();
        bats.forEach(b => {
            const px = b.fx * CELL_SIZE;
            const py = b.fy * CELL_SIZE;
            ctx.fillStyle = '#ffdd55';
            ctx.beginPath();
            ctx.arc(px, py, CELL_SIZE * 0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#221700';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
        ctx.restore();
        return;
    }

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
            // Telegraph flash (alternate yellow/pink) with charging effect
            if (e.telegraphUntil && currentTime < e.telegraphUntil) {
                const blink = Math.floor(currentTime / 100) % 2 === 0;
                baseCol = blink ? '#FFD700' : '#ff69b4';
                
                // Charging energy orb that grows from center
                const chargeProgress = e._chargeProgress || 0;
                const maxChargeRadius = r * 1.5;
                const chargeRadius = maxChargeRadius * chargeProgress;
                
                // Pulsing aura around pig
                ctx.save();
                ctx.globalAlpha = 0.3 + 0.2 * Math.sin(currentTime / 80);
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.arc(cx, cy, r + 8 + 4 * Math.sin(currentTime / 100), 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                
                // Energy orb building up
                if (chargeProgress > 0.1) {
                    ctx.save();
                    // Outer glow
                    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, chargeRadius * 1.5);
                    gradient.addColorStop(0, 'rgba(255, 215, 0, 0.6)');
                    gradient.addColorStop(0.5, 'rgba(255, 105, 180, 0.4)');
                    gradient.addColorStop(1, 'rgba(255, 105, 180, 0)');
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(cx, cy, chargeRadius * 1.5, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Core energy ball
                    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(currentTime / 60);
                    ctx.fillStyle = '#FFFFE0';
                    ctx.beginPath();
                    ctx.arc(cx, cy, chargeRadius * 0.6, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Energy sparks
                    const sparkCount = Math.floor(chargeProgress * 8);
                    for (let i = 0; i < sparkCount; i++) {
                        const angle = (i / sparkCount) * Math.PI * 2 + currentTime / 200;
                        const sparkDist = r + 12 + 8 * chargeProgress;
                        const sx = cx + Math.cos(angle) * sparkDist;
                        const sy = cy + Math.sin(angle) * sparkDist;
                        ctx.fillStyle = i % 2 === 0 ? '#FFD700' : '#FF69B4';
                        ctx.beginPath();
                        ctx.arc(sx, sy, 2 + chargeProgress * 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.restore();
                }
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
                // Magical aura when flying (subtle glow)
                if (!e.telegraphUntil || currentTime >= e.telegraphUntil) {
                    ctx.save();
                    ctx.globalAlpha = 0.15 + 0.1 * Math.sin(currentTime / 300);
                    ctx.fillStyle = '#FFB6D9';
                    ctx.beginPath();
                    ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
                
                // More natural wing flapping - smoother sine wave motion
                const flapSpeed = currentTime / 150; // Slightly slower
                const flapAngle = Math.sin(flapSpeed) * 0.4; // Angle in radians (+/- ~23 degrees)
                const wingLength = 10;
                const wingWidth = 8;
                
                ctx.fillStyle = '#ffd1ec';
                ctx.strokeStyle = '#ffb3d9';
                ctx.lineWidth = 1;
                
                // Left wing with natural flapping motion
                ctx.save();
                ctx.translate(cx - r - 2, cy);
                ctx.rotate(flapAngle); // Rotate the wing
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(-wingLength, -wingWidth / 2);
                ctx.lineTo(-wingLength, wingWidth / 2);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
                
                // Right wing with natural flapping motion (opposite angle)
                ctx.save();
                ctx.translate(cx + r + 2, cy);
                ctx.rotate(-flapAngle); // Opposite rotation
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(wingLength, -wingWidth / 2);
                ctx.lineTo(wingLength, wingWidth / 2);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
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
            } else if (e.state === 'crashing') {
                // Crash animation: spinning and falling like a plane
                const crashProgress = Math.min(1, (currentTime - e.crashStartTime) / e.crashDuration);
                
                // Rotation effect
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(e.crashRotation || 0);
                
                // Fade to gray as crashing
                const grayAmount = crashProgress;
                const r_val = Math.round(255 * (1 - grayAmount) + 100 * grayAmount);
                const g_val = Math.round(105 * (1 - grayAmount) + 100 * grayAmount);
                const b_val = Math.round(180 * (1 - grayAmount) + 100 * grayAmount);
                ctx.fillStyle = `rgb(${r_val},${g_val},${b_val})`;
                
                // Draw spinning pig
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.fill();
                
                // Eyes (spinning with pig)
                ctx.fillStyle = '#111';
                ctx.beginPath(); ctx.arc(-3, -2, 2, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(3, -2, 2, 0, Math.PI*2); ctx.fill();
                
                // Dizzy wings (not flapping, just there)
                ctx.fillStyle = '#ffd1ec';
                ctx.strokeStyle = '#ffb3d9';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-r - 2, 0);
                ctx.lineTo(-r - 10, -4);
                ctx.lineTo(-r - 10, 4);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(r + 2, 0);
                ctx.lineTo(r + 10, -4);
                ctx.lineTo(r + 10, 4);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                
                ctx.restore();
                
                // Smoke trail during crash
                if (crashProgress < 0.9) {
                    ctx.save();
                    ctx.globalAlpha = 0.3 * (1 - crashProgress);
                    ctx.fillStyle = '#666';
                    for (let i = 0; i < 3; i++) {
                        const trailY = cy - i * 8 - crashProgress * 10;
                        const trailSize = 3 + i * 2;
                        ctx.beginPath();
                        ctx.arc(cx, trailY, trailSize, 0, Math.PI * 2);
                        ctx.fill();
                    }
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

            // Bat swing animation (300ms duration)
            if (e.swingStartTime && currentTime - e.swingStartTime < 300) {
                const swingProgress = (currentTime - e.swingStartTime) / 300;
                const swingAngle = e.swingDirection || 0;
                
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(swingAngle + swingProgress * Math.PI * 1.2);
                
                // Brown bat with gold glow trail
                const batLength = 20;
                const batWidth = 4;
                
                // Motion trail (gold)
                for (let i = 0; i < 3; i++) {
                    ctx.globalAlpha = 0.3 - i * 0.1;
                    ctx.translate(-3, 0);
                    ctx.fillStyle = '#FFD700';
                    ctx.fillRect(r + 2, -batWidth / 2, batLength, batWidth);
                    ctx.translate(3, 0);
                }
                
                // Main bat (brown)
                ctx.globalAlpha = 1;
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(r + 2, -batWidth / 2, batLength, batWidth);
                
                // Bat handle (darker brown)
                ctx.fillStyle = '#654321';
                ctx.fillRect(r + 2, -2, 6, 4);
                
                ctx.restore();
                
                // Impact particles at end of swing
                if (swingProgress > 0.8) {
                    const impactX = cx + Math.cos(swingAngle + swingProgress * Math.PI * 1.2) * (r + 22);
                    const impactY = cy + Math.sin(swingAngle + swingProgress * Math.PI * 1.2) * (r + 22);
                    ctx.save();
                    ctx.globalAlpha = (1 - swingProgress) * 2;
                    ctx.fillStyle = '#FFD700';
                    for (let i = 0; i < 4; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const dist = 5 + Math.random() * 8;
                        ctx.beginPath();
                        ctx.arc(impactX + Math.cos(angle) * dist, impactY + Math.sin(angle) * dist, 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.restore();
                }
            }

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
            
            // Weapon tube animation
            if (e.state === 'aim' && e.aimTarget) {
                // Calculate angle toward target
                const targetX = (e.aimTarget.x + 0.5) * CELL_SIZE;
                const targetY = (e.aimTarget.y + 0.5) * CELL_SIZE;
                const tubeAngle = Math.atan2(targetY - cy, targetX - cx);
                
                // Draw mortar tube
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(tubeAngle);
                
                // Tube body (dark gray)
                ctx.fillStyle = '#444';
                ctx.fillRect(0, -4, 18, 8);
                
                // Tube tip (lighter gray)
                ctx.fillStyle = '#666';
                ctx.fillRect(16, -3, 4, 6);
                
                ctx.restore();
                
                // Check if we're halfway into the aim phase to fire shell
                const aimProgress = (currentTime - (e._aimStartTime || currentTime)) / (e.aimUntil - (e._aimStartTime || currentTime));
                if (aimProgress >= 0.5 && !e._shellFired) {
                    // Fire shell animation
                    e._shellFired = true;
                    e._shellStartTime = currentTime;
                    e._shellStartX = e.fx;
                    e._shellStartY = e.fy;
                    e._playFireSound = true; // Signal to play fire sound
                }
                
                // Draw flying shell with parabolic arc
                if (e._shellFired && e._shellStartTime) {
                    const shellDuration = 500; // 500ms flight time
                    const shellProgress = Math.min(1, (currentTime - e._shellStartTime) / shellDuration);
                    
                    if (shellProgress < 1) {
                        // Calculate shell position with arc
                        const shellX = cx + (targetX - cx) * shellProgress;
                        const shellY = cy + (targetY - cy) * shellProgress - Math.sin(shellProgress * Math.PI) * CELL_SIZE * 2;
                        
                        // Shell body
                        ctx.save();
                        ctx.fillStyle = '#333';
                        ctx.beginPath();
                        ctx.arc(shellX, shellY, 4, 0, Math.PI * 2);
                        ctx.fill();
                        
                        // Shell glow
                        ctx.globalAlpha = 0.4;
                        ctx.fillStyle = '#ff6600';
                        ctx.beginPath();
                        ctx.arc(shellX, shellY, 6, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                        
                        // Smoke trail
                        for (let i = 0; i < 5; i++) {
                            const trailProgress = shellProgress - (i * 0.08);
                            if (trailProgress > 0 && trailProgress < 1) {
                                const tx = cx + (targetX - cx) * trailProgress;
                                const ty = cy + (targetY - cy) * trailProgress - Math.sin(trailProgress * Math.PI) * CELL_SIZE * 2;
                                const alpha = 0.3 - (i * 0.05);
                                ctx.save();
                                ctx.globalAlpha = alpha;
                                ctx.fillStyle = '#888';
                                ctx.beginPath();
                                ctx.arc(tx, ty, 3, 0, Math.PI * 2);
                                ctx.fill();
                                ctx.restore();
                            }
                        }
                    } else {
                        // Clear shell animation after completion
                        e._shellFired = false;
                        e._shellStartTime = null;
                    }
                }
            }
            
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
            // No black center on mobile for better purple visibility, small black center on desktop
            const mobile = isMobile();
            if (!mobile) {
                ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
            }
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
            
            // Draw energy trail with fade
            if (Array.isArray(p.trail) && p.trail.length) {
                ctx.save();
                for (let i = 0; i < p.trail.length; i++) {
                    const node = p.trail[i];
                    const ageMs = Math.max(0, currentTime - (node.at || 0));
                    const ageFade = Math.max(0, 1 - ageMs / 400);
                    const idxFade = (i + 1) / p.trail.length;
                    const alpha = Math.max(0, Math.min(0.6, 0.15 + 0.5 * ageFade * idxFade));
                    if (alpha <= 0.01) continue;
                    const sx = node.x * CELL_SIZE;
                    const sy = node.y * CELL_SIZE;
                    const trailRadius = radius * 0.6 * idxFade;
                    
                    // Glowing trail particles
                    const trailColor = p.reflected ? '#FFD700' : '#FF69B4';
                    const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, trailRadius);
                    gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.8})`);
                    gradient.addColorStop(0.5, p.reflected ? `rgba(255, 215, 0, ${alpha})` : `rgba(255, 105, 180, ${alpha})`);
                    gradient.addColorStop(1, `rgba(255, 105, 180, 0)`);
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(sx, sy, trailRadius * 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
            
            // Age-based pulsing glow
            const age = currentTime - (p.spawnTime || currentTime);
            const pulse = 0.8 + 0.2 * Math.sin(age / 50);
            
            // Outer glow aura
            ctx.save();
            const outerGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.8);
            const glowColor = p.reflected ? 'rgba(255, 215, 0, 0.4)' : 'rgba(255, 105, 180, 0.35)';
            outerGradient.addColorStop(0, p.reflected ? 'rgba(255, 255, 220, 0.6)' : 'rgba(255, 200, 220, 0.5)');
            outerGradient.addColorStop(0.5, glowColor);
            outerGradient.addColorStop(1, 'rgba(255, 105, 180, 0)');
            ctx.fillStyle = outerGradient;
            ctx.beginPath();
            ctx.arc(cx, cy, radius * 1.8 * pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(a);
            
            // Draw semicircle facing +X direction after rotation
            const fill = p.reflected ? 'rgba(255, 240, 100, 0.5)' : 'rgba(255, 140, 200, 0.45)';
            const stroke = p.reflected ? 'rgba(255, 215, 0, 0.9)' : 'rgba(255, 105, 180, 0.85)';
            
            // Inner bright core
            const coreGradient = ctx.createRadialGradient(radius * 0.3, 0, 0, radius * 0.3, 0, radius * 0.8);
            coreGradient.addColorStop(0, p.reflected ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 230, 240, 0.85)');
            coreGradient.addColorStop(0.5, fill);
            coreGradient.addColorStop(1, p.reflected ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 105, 180, 0.25)');
            ctx.fillStyle = coreGradient;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, Math.max(6, radius), -Math.PI/2, Math.PI/2, false);
            ctx.closePath();
            ctx.fill();
            
            // Outer edge with glow
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 15;
            ctx.shadowColor = p.reflected ? '#FFD700' : '#FF69B4';
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(6, radius), -Math.PI/2, Math.PI/2, false);
            ctx.stroke();
            
            // Energy sparks around the edge
            ctx.shadowBlur = 0;
            const sparkCount = p.reflected ? 6 : 4;
            for (let i = 0; i < sparkCount; i++) {
                const sparkAngle = -Math.PI/2 + (i / (sparkCount - 1)) * Math.PI;
                const sparkX = Math.cos(sparkAngle) * radius;
                const sparkY = Math.sin(sparkAngle) * radius;
                ctx.fillStyle = p.reflected ? '#FFFFE0' : '#FFB6D9';
                ctx.beginPath();
                ctx.arc(sparkX, sparkY, 2 * pulse, 0, Math.PI * 2);
                ctx.fill();
            }
            
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
    const b = gameState.boss;
    if (!b) return;
    if (b.core) {
        const cx = (b.core.x + 0.5) * CELL_SIZE;
        const cy = (b.core.y + 0.5) * CELL_SIZE;
        const r = CELL_SIZE * 0.9;
        
        ctx.save();
        
        // Defeat fade-out
        if (b.defeated && b.coreFadeUntil) {
            const total = Math.max(1, (b.coreFadeUntil - (b.defeatStartedAt || (currentTime - 1))));
            const remain = Math.max(0, b.coreFadeUntil - currentTime);
            const alpha = Math.max(0, Math.min(1, remain / total));
            ctx.globalAlpha = alpha;
        }
        
        const colMap = { red: '#ff4444', purple: '#b455ff', pink: '#ff69b4' };
        let coreColor = '#7fffd4';
        
        // Determine core color based on phase
        if (b.phase === 'phase2_cutscene') {
            const pulse = (Math.sin(currentTime / 120) * 0.5 + 0.5);
            coreColor = `rgba(255,68,68,${0.6 + 0.4 * pulse})`;
        } else if (b.phase === 'red') {
            coreColor = colMap.red;
        } else if (b.phase === 'purple') {
            coreColor = colMap.purple;
        } else if (b.phase === 'pink') {
            coreColor = colMap.pink;
        }
        
        // Outer energy shield/aura (pulsing)
        const pulse = Math.sin(currentTime / 300) * 0.3 + 0.7;
        const auradient = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.5);
        auradient.addColorStop(0, 'rgba(0, 200, 255, 0.2)');
        auradient.addColorStop(0.6, 'rgba(0, 170, 204, 0.15)');
        auradient.addColorStop(1, 'rgba(0, 170, 204, 0)');
        ctx.globalAlpha *= pulse;
        ctx.fillStyle = auradient;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = b.defeated && b.coreFadeUntil ? Math.max(0, Math.min(1, (b.coreFadeUntil - currentTime) / Math.max(1, (b.coreFadeUntil - (b.defeatStartedAt || (currentTime - 1)))))) : 1;
        
        // Rotating energy rings around core
        const ringCount = 3;
        for (let i = 0; i < ringCount; i++) {
            const ringRotation = (currentTime / 800) + (i * Math.PI * 2 / ringCount);
            const ringRadius = r + 8 + i * 4;
            const ringAlpha = 0.3 - i * 0.08;
            
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(ringRotation);
            ctx.strokeStyle = `rgba(0, 200, 255, ${ringAlpha * pulse})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }
        
        // Main core body - metallic sphere with segments
        if (b.phase === 'combo' && b.combo) {
            const attacks = b.combo.attacks;
            if (attacks.length === 2) {
                // Split core: left/right hemispheres with two colors
                ctx.beginPath();
                ctx.arc(cx, cy, r, Math.PI / 2, -Math.PI / 2, true);
                ctx.closePath();
                ctx.fillStyle = colMap[attacks[0]] || '#7fffd4';
                ctx.fill();
                ctx.beginPath();
                ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, true);
                ctx.closePath();
                ctx.fillStyle = colMap[attacks[1]] || '#7fffd4';
                ctx.fill();
            } else {
                // Doubled single attack: full color
                const c = colMap[attacks[0]] || '#7fffd4';
                ctx.fillStyle = c;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // Single color core
            ctx.fillStyle = coreColor;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Inner core glow
        const innerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.7);
        innerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
        innerGlow.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
        innerGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
        ctx.fill();
        
        // Mechanical segments/panels on core surface
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 1.5;
        const segmentCount = 8;
        for (let i = 0; i < segmentCount; i++) {
            const angle = (i / segmentCount) * Math.PI * 2;
            const x1 = cx + Math.cos(angle) * (r * 0.3);
            const y1 = cy + Math.sin(angle) * (r * 0.3);
            const x2 = cx + Math.cos(angle) * r;
            const y2 = cy + Math.sin(angle) * r;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        
        // Health indicator dots around perimeter
        const maxHp = b.core.maxHp || 100;
        const currentHp = b.core.hp || maxHp;
        const hpRatio = currentHp / maxHp;
        const dotCount = 12;
        const activeDots = Math.ceil(hpRatio * dotCount);
        
        for (let i = 0; i < dotCount; i++) {
            const dotAngle = (i / dotCount) * Math.PI * 2 - Math.PI / 2;
            const dotRadius = r + 6;
            const dx = cx + Math.cos(dotAngle) * dotRadius;
            const dy = cy + Math.sin(dotAngle) * dotRadius;
            
            ctx.fillStyle = i < activeDots ? '#00ff00' : '#333';
            ctx.beginPath();
            ctx.arc(dx, dy, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Outer ring (shield boundary)
        if (!b.defeated || (b.defeated && currentTime < (b.coreFadeUntil || 0))) {
            ctx.strokeStyle = '#0aa';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#0aa';
            ctx.beginPath();
            ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
            ctx.stroke();
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
        const sprite = getSprite('bazooka');
        
        ctx.save();
        // Draw bazooka sprite or fallback - MUCH LARGER
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            const size = CELL_SIZE * 2.5; // MUCH larger - 2.5x cell size
            // Subtle float animation
            const float = Math.sin(currentTime / 400) * 4;
            ctx.drawImage(sprite, px - size / 2, py - size / 2 + float, size, size);
            
            // Bright glow effect to make it stand out
            ctx.globalAlpha = 0.5 + 0.4 * Math.sin(currentTime / 300);
            ctx.shadowBlur = 25;
            ctx.shadowColor = '#ff4400';
            ctx.fillStyle = 'rgba(255, 68, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(px, py + float, size * 0.5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Fallback to golden circle (sprite not loaded or failed)
            if (!sprite) {
                console.warn('Bazooka sprite not found!');
            } else if (!sprite.complete) {
                console.warn('Bazooka sprite not complete yet');
            } else if (sprite.naturalWidth === 0) {
                console.warn('Bazooka sprite failed to load - naturalWidth is 0');
            }
            ctx.fillStyle = '#ffd700';
            ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();

        // Tooltip removed - instructions shown at top of screen instead
    }

    // Ammo pickups (Level 10 boss prep room only)
    if ((gameState.currentLevel === 10) && b.ammoPickups && b.ammoPickups.length) {
        for (const a of b.ammoPickups) {
            const ax = (a.x + 0.5) * CELL_SIZE;
            const ay = (a.y + 0.5) * CELL_SIZE;
            
            ctx.save();
            
            // Ammo crate base (wooden/metallic box look)
            // Main crate body - brown/tan color
            ctx.fillStyle = '#8b6f47';
            ctx.fillRect(ax - 8, ay - 8, 16, 16);
            
            // Top panel (lighter, like a lid)
            ctx.fillStyle = '#a0875f';
            ctx.fillRect(ax - 8, ay - 8, 16, 4);
            
            // Side panel highlighting
            ctx.fillStyle = '#6b5436';
            ctx.fillRect(ax - 8, ay - 4, 3, 12);
            
            // Metal straps/bands (industrial look)
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 1.5;
            // Horizontal straps
            ctx.beginPath();
            ctx.moveTo(ax - 8, ay - 3);
            ctx.lineTo(ax + 8, ay - 3);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(ax - 8, ay + 3);
            ctx.lineTo(ax + 8, ay + 3);
            ctx.stroke();
            
            // Vertical strap
            ctx.beginPath();
            ctx.moveTo(ax, ay - 8);
            ctx.lineTo(ax, ay + 8);
            ctx.stroke();
            
            // Ammo symbol - bullet/rocket icon in center
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            // Simple rocket/bullet shape
            ctx.moveTo(ax - 2, ay + 2);
            ctx.lineTo(ax - 2, ay - 4);
            ctx.lineTo(ax, ay - 6);
            ctx.lineTo(ax + 2, ay - 4);
            ctx.lineTo(ax + 2, ay + 2);
            ctx.closePath();
            ctx.fill();
            
            // Add small "AMMO" text or bullets indicator
            ctx.fillStyle = '#ffcc00';
            ctx.font = 'bold 6px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('AMMO', ax, ay + 5);
            
            // Pulsing glow around crate
            const pulse = Math.sin(currentTime / 400) * 0.3 + 0.7;
            ctx.globalAlpha = pulse * 0.4;
            ctx.strokeStyle = '#ffcc00';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#ffcc00';
            ctx.strokeRect(ax - 10, ay - 10, 20, 20);
            
            // Tooltip removed - instructions shown at top of screen instead
            ctx.restore();
        }
    }

    // Arena ammo stations with cooldown (Level 10 only)
    if ((gameState.currentLevel === 10) && b.ammoStations && b.ammoStations.length && !b.prepRoom) {
        for (const s of b.ammoStations) {
            const sx = (s.x + 0.5) * CELL_SIZE;
            const sy = (s.y + 0.5) * CELL_SIZE;
            
            ctx.save();
            
            // Ammo crate base (wooden/metallic box look) - SAME AS PRE-BOSS
            // Main crate body - brown/tan color
            ctx.fillStyle = '#8b6f47';
            ctx.fillRect(sx - 8, sy - 8, 16, 16);
            
            // Top panel (lighter, like a lid)
            ctx.fillStyle = '#a0875f';
            ctx.fillRect(sx - 8, sy - 8, 16, 4);
            
            // Side panel highlighting
            ctx.fillStyle = '#6b5436';
            ctx.fillRect(sx - 8, sy - 4, 3, 12);
            
            // Metal straps/bands (industrial look)
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 1.5;
            // Horizontal straps
            ctx.beginPath();
            ctx.moveTo(sx - 8, sy - 3);
            ctx.lineTo(sx + 8, sy - 3);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(sx - 8, sy + 3);
            ctx.lineTo(sx + 8, sy + 3);
            ctx.stroke();
            
            // Vertical strap
            ctx.beginPath();
            ctx.moveTo(sx, sy - 8);
            ctx.lineTo(sx, sy + 8);
            ctx.stroke();
            
            // Ammo symbol - bullet/rocket icon in center
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            // Simple rocket/bullet shape
            ctx.moveTo(sx - 2, sy + 2);
            ctx.lineTo(sx - 2, sy - 4);
            ctx.lineTo(sx, sy - 6);
            ctx.lineTo(sx + 2, sy - 4);
            ctx.lineTo(sx + 2, sy + 2);
            ctx.closePath();
            ctx.fill();
            
            // Add small "AMMO" text or bullets indicator
            ctx.fillStyle = '#ffcc00';
            ctx.font = 'bold 6px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('AMMO', sx, sy + 5);
            
            // Cooldown ring overlay
            const now = performance.now();
            const remain = Math.max(0, (s.cooldownUntil || 0) - now);
            if (remain > 0) {
                // Draw a pie showing cooldown progress (darker overlay)
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
                // Ready pulse (glow around crate when available)
                const pulse = Math.sin(currentTime / 400) * 0.3 + 0.7;
                ctx.globalAlpha = pulse * 0.4;
                ctx.strokeStyle = '#ffcc00';
                ctx.lineWidth = 2;
                ctx.shadowBlur = 8;
                ctx.shadowColor = '#ffcc00';
                ctx.strokeRect(sx - 10, sy - 10, 20, 20);
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


    // Virus and system dialog is now rendered in the DOM dialog bar above the canvas.


    // Level 11 ending dialog is now rendered in the DOM dialog bar above the canvas.

    // Ammo HUD (top-right) — only Level 10 and after bazooka is picked up
    // Ammo counter removed - now shown in main UI only

    // Top-bar lore/status (only in Level 10 prep room): draw over canvas top for visibility
    if ((gameState.currentLevel === 10) && gameState.boss && gameState.boss.prepRoom && gameState.statusMessage) {
        const text = String(gameState.statusMessage);
        ctx.save();

        // Adjust font size for mobile to prevent text overflow
        const mobile = isMobile();
        const fontSize = mobile ? 11 : 14;
        const barHeight = mobile ? 24 : 28;

        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, canvas.width, barHeight);
        ctx.fillStyle = '#ffd166'; // high-contrast warm yellow
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width/2, barHeight/2);
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

    // Level 11 overlays (keys, locks, pickups)
    if (gameState.isLevel11 && gameState.level11 && gameState.level11.data?.rooms) {
        const l11 = gameState.level11;
        const room = l11.data.rooms[l11.currentRoom];
        ctx.save();
        // Door visibility + lock hints
        if (room && Array.isArray(room.doors)) {
            room.doors.forEach(d => {
                ctx.fillStyle = 'rgba(80,150,255,0.35)';
                ctx.strokeStyle = 'rgba(20,90,200,0.8)';
                ctx.lineWidth = 2;
                ctx.fillRect(d.pos.x * CELL_SIZE, d.pos.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                ctx.strokeRect(d.pos.x * CELL_SIZE + 1, d.pos.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
                if (d.lock) {
                    ctx.fillStyle = d.lock === 'green' ? 'rgba(0,255,120,0.55)' : 'rgba(255,255,0,0.55)';
                    const pad = CELL_SIZE * 0.18;
                    ctx.fillRect(d.pos.x * CELL_SIZE + pad, d.pos.y * CELL_SIZE + pad, CELL_SIZE - pad * 2, CELL_SIZE - pad * 2);
                }
            });
        }
        // Hub green key drop
        if (l11.currentRoom === 'hub') {
            const drop = room?.greenKeyDrop;
            if (l11.greenKeyAvailable && !l11.hasGreenKey && drop) {
                const sprite = getSprite('greenKey');
                const px = (drop.x + 0.5) * CELL_SIZE;
                const py = (drop.y + 0.5) * CELL_SIZE;
                
                // Glow effect
                ctx.save();
                const grad = ctx.createRadialGradient(px, py, 0, px, py, CELL_SIZE * 0.6);
                grad.addColorStop(0, 'rgba(0, 255, 120, 0.9)');
                grad.addColorStop(0.6, 'rgba(0, 255, 120, 0.3)');
                grad.addColorStop(1, 'rgba(0, 255, 120, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(px, py, CELL_SIZE * 0.6, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                
                // Draw sprite
                if (sprite && sprite.complete && sprite.naturalWidth > 0) {
                    ctx.save();
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = '#00ff00';
                    ctx.drawImage(sprite, px - CELL_SIZE * 0.4, py - CELL_SIZE * 0.4, CELL_SIZE * 0.8, CELL_SIZE * 0.8);
                    ctx.restore();
                } else {
                    // Fallback cube
                    ctx.fillStyle = 'rgba(0,255,120,0.9)';
                    ctx.fillRect(drop.x * CELL_SIZE, drop.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                }
            }
        }
        // Puzzle note + tiles
        if (l11.currentRoom === 'puzzle' && room?.puzzle) {
            const tiles = room.puzzle.tiles || [];
            tiles.forEach(t => {
                const lit = l11.puzzleState?.[t.index];
                ctx.fillStyle = lit ? 'rgba(0,200,90,0.9)' : 'rgba(200,60,60,0.85)';
                const pad = CELL_SIZE * 0.12;
                ctx.fillRect(t.x * CELL_SIZE + pad, t.y * CELL_SIZE + pad, CELL_SIZE - pad * 2, CELL_SIZE - pad * 2);
                ctx.strokeStyle = lit ? '#0f3d1f' : '#3d0f0f';
                ctx.lineWidth = 2;
                ctx.strokeRect(t.x * CELL_SIZE + pad, t.y * CELL_SIZE + pad, CELL_SIZE - pad * 2, CELL_SIZE - pad * 2);
            });
            if (room.puzzle.note) {
                ctx.fillStyle = 'rgba(240,230,120,0.9)';
                ctx.fillRect(room.puzzle.note.x * CELL_SIZE, room.puzzle.note.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                ctx.strokeStyle = 'rgba(90,80,30,0.9)';
                ctx.strokeRect(room.puzzle.note.x * CELL_SIZE + 1, room.puzzle.note.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            }
        }
        // Entry hallway flashlight spawn after prompt
        if (l11.currentRoom === 'entry') {
            if (l11.flashlightSpawned && !l11.flashlightFound && l11.entryFlashlightPos) {
                const sprite = getSprite('flashlight');
                const px = (l11.entryFlashlightPos.x + 0.5) * CELL_SIZE;
                const py = (l11.entryFlashlightPos.y + 0.5) * CELL_SIZE;
                
                // Glow effect
                ctx.save();
                const grad = ctx.createRadialGradient(px, py, 0, px, py, CELL_SIZE * 0.6);
                grad.addColorStop(0, 'rgba(255, 255, 100, 0.8)');
                grad.addColorStop(0.5, 'rgba(255, 255, 100, 0.4)');
                grad.addColorStop(1, 'rgba(255, 255, 100, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(px, py, CELL_SIZE * 0.6, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                
                // Draw sprite
                if (sprite && sprite.complete && sprite.naturalWidth > 0) {
                    ctx.save();
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = '#ffff00';
                    ctx.drawImage(sprite, px - CELL_SIZE * 0.4, py - CELL_SIZE * 0.4, CELL_SIZE * 0.8, CELL_SIZE * 0.8);
                    ctx.restore();
                } else {
                    // Fallback cube
                    ctx.fillStyle = 'rgba(160,160,160,0.95)';
                    ctx.fillRect(l11.entryFlashlightPos.x * CELL_SIZE, l11.entryFlashlightPos.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                }
            }
        }
        // Dark room pickups
        if (l11.currentRoom === 'dark') {
            if (!l11.hasYellowKey && l11.yellowKeyPos) {
                const sprite = getSprite('yellowKey');
                const px = (l11.yellowKeyPos.x + 0.5) * CELL_SIZE;
                const py = (l11.yellowKeyPos.y + 0.5) * CELL_SIZE;
                
                // Glow effect
                ctx.save();
                const grad = ctx.createRadialGradient(px, py, 0, px, py, CELL_SIZE * 0.6);
                grad.addColorStop(0, 'rgba(255, 255, 0, 0.9)');
                grad.addColorStop(0.6, 'rgba(255, 255, 0, 0.3)');
                grad.addColorStop(1, 'rgba(255, 255, 0, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(px, py, CELL_SIZE * 0.6, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                
                // Draw sprite
                if (sprite && sprite.complete && sprite.naturalWidth > 0) {
                    ctx.save();
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = '#ffff00';
                    ctx.drawImage(sprite, px - CELL_SIZE * 0.4, py - CELL_SIZE * 0.4, CELL_SIZE * 0.8, CELL_SIZE * 0.8);
                    ctx.restore();
                } else {
                    // Fallback cube
                    ctx.fillStyle = 'rgba(255,255,0,0.9)';
                    ctx.fillRect(l11.yellowKeyPos.x * CELL_SIZE, l11.yellowKeyPos.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                }
            }
        }
        ctx.restore();
    }
    // Finale power supply
    if (gameState.isLevel11 && gameState.level11 && gameState.level11.currentRoom === 'finale') {
        const room = gameState.level11.data?.rooms?.finale;
        if (room?.powerSupply && !gameState.level11.powerDecisionMade) {
            const ps = room.powerSupply;
            ctx.save();
            // Battery pack with lever - yellow/orange colors
            ctx.fillStyle = 'rgba(255,200,50,0.9)';
            ctx.fillRect(ps.x * CELL_SIZE, ps.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            ctx.strokeStyle = 'rgba(180,100,20,0.9)';
            ctx.lineWidth = 2;
            ctx.strokeRect(ps.x * CELL_SIZE + 1, ps.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            // Draw battery terminals at top
            ctx.fillStyle = '#333';
            ctx.fillRect(ps.x * CELL_SIZE + 4, ps.y * CELL_SIZE + 2, 4, 6);
            ctx.fillRect(ps.x * CELL_SIZE + CELL_SIZE - 8, ps.y * CELL_SIZE + 2, 4, 6);
            // Draw lever
            ctx.strokeStyle = '#cc0000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(ps.x * CELL_SIZE + CELL_SIZE / 2, ps.y * CELL_SIZE + CELL_SIZE * 0.6);
            ctx.lineTo(ps.x * CELL_SIZE + CELL_SIZE / 2 + 6, ps.y * CELL_SIZE + CELL_SIZE * 0.35);
            ctx.stroke();
            ctx.restore();
        }
    }
    // Good ending note in hub (legacy Level 11 rendering)
    if (gameState.isLevel11 && gameState.level11 && gameState.level11.currentRoom === 'hub' && gameState.level11.goodEndingNote) {
        const notePos = gameState.level11.data?.rooms?.hubNotePos;
        if (notePos) {
            ctx.save();
            ctx.fillStyle = 'rgba(230,255,79,0.95)';
            ctx.fillRect(notePos.x * CELL_SIZE, notePos.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            ctx.strokeStyle = 'rgba(90,100,30,0.9)';
            ctx.lineWidth = 2;
            ctx.strokeRect(notePos.x * CELL_SIZE + 1, notePos.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            ctx.restore();
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
        const gx = gen.x * CELL_SIZE;
        const gy = gen.y * CELL_SIZE;
        
        if (gen.completed) {
            // Draw dark green tile to indicate completed generator
            ctx.fillStyle = '#0f4d1a';
            ctx.fillRect(gx, gy, CELL_SIZE, CELL_SIZE);
            
            // Powered-down generator look - darker metallic
            ctx.fillStyle = '#1a4d2e';
            ctx.fillRect(gx + 2, gy + 2, CELL_SIZE - 4, CELL_SIZE - 8);
            
            // Green checkmark with glow
            ctx.save();
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#00ff66';
            ctx.fillStyle = '#00ff66';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('✓', gx + CELL_SIZE / 2, gy + CELL_SIZE / 2);
            ctx.restore();
        } else {
            // Generator base - metallic gray with industrial look
            ctx.fillStyle = '#555';
            ctx.fillRect(gx, gy, CELL_SIZE, CELL_SIZE);
            
            // Generator body - darker center
            ctx.fillStyle = '#3a3a3a';
            ctx.fillRect(gx + 2, gy + 3, CELL_SIZE - 4, CELL_SIZE - 6);
            
            // Top and bottom panels (industrial ridges)
            ctx.fillStyle = '#666';
            ctx.fillRect(gx + 1, gy + 1, CELL_SIZE - 2, 3);
            ctx.fillRect(gx + 1, gy + CELL_SIZE - 4, CELL_SIZE - 2, 3);
            
            // Side vents (vertical lines)
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                const vx = gx + 4 + i * 4;
                ctx.beginPath();
                ctx.moveTo(vx, gy + 5);
                ctx.lineTo(vx, gy + CELL_SIZE - 5);
                ctx.stroke();
            }
            
            // Pulsing energy indicator lights (yellow/orange)
            const pulse = Math.sin(currentTime / 500) * 0.5 + 0.5;
            const lightY = gy + CELL_SIZE / 2;
            const lightX = gx + CELL_SIZE - 5;
            
            // Warning lights glow
            ctx.save();
            ctx.shadowBlur = 8 * pulse;
            ctx.shadowColor = '#FFD700';
            ctx.fillStyle = `rgba(255, 215, 0, ${0.7 + 0.3 * pulse})`;
            ctx.beginPath();
            ctx.arc(lightX, lightY - 3, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(255, 140, 0, ${0.7 + 0.3 * pulse})`;
            ctx.beginPath();
            ctx.arc(lightX, lightY + 3, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            
            // Pulsing outer glow/aura for attention
            ctx.save();
            ctx.globalAlpha = pulse * 0.3;
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#FFD700';
            ctx.strokeRect(gx - 1, gy - 1, CELL_SIZE + 2, CELL_SIZE + 2);
            ctx.restore();

            // If blocked, overlay a red X
            if (gen.blockedUntil && currentTime < gen.blockedUntil) {
                ctx.save();
                ctx.strokeStyle = '#ff4444';
                ctx.lineWidth = 3;
                ctx.shadowBlur = 6;
                ctx.shadowColor = '#ff4444';
                ctx.beginPath();
                ctx.moveTo(gx + 3, gy + 3);
                ctx.lineTo(gx + CELL_SIZE - 3, gy + CELL_SIZE - 3);
                ctx.moveTo(gx + CELL_SIZE - 3, gy + 3);
                ctx.lineTo(gx + 3, gy + CELL_SIZE - 3);
                ctx.stroke();
                ctx.restore();
            }
        }
    });
}

function drawPlayer() {
    // Skip drawing player circle if bazooka is active - only show the weapon
    const bazookaActive = isBazookaMode() && gameState.bazooka && gameState.bazooka.has;
    
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

    // Base color: check for active skin first, otherwise use sprint/normal colors
    let baseRGB = { r: 65, g: 105, b: 225 }; // Default royal blue
    let skinEffects = null;
    
    // Get skin visuals if available
    const skinVisuals = getPlayerVisuals();
    if (skinVisuals) {
        baseRGB = skinVisuals.color;
        skinEffects = skinVisuals;
    } else if (gameState.isSprinting) {
        // Only use sprint cyan if no skin override
        baseRGB = { r: 0, g: 255, b: 255 };
    }
    
    // Apply sprint brightness boost on top of skin color
    let r = baseRGB.r, g = baseRGB.g, b = baseRGB.b;
    if (gameState.isSprinting && skinVisuals) {
        // Brighten skin color when sprinting (increase lightness)
        const brighten = 1.3;
        r = Math.min(255, Math.round(baseRGB.r * brighten));
        g = Math.min(255, Math.round(baseRGB.g * brighten));
        b = Math.min(255, Math.round(baseRGB.b * brighten));
    }
    
    if (gameState.playerStunned) {
        const start = gameState.playerStunStart || (performance.now() - 1);
        const total = Math.max(1, (gameState.playerStunUntil || (start + 4000)) - start);
        const now = performance.now();
        const t = Math.min(1, Math.max(0, (now - start) / total));
        const f = 0.6 + 0.4 * t; // 60% brightness at start -> 100% at end
        r = Math.round(r * f);
        g = Math.round(g * f);
        b = Math.round(b * f);
    }

    // Draw player circle with jump offset
    const now = performance.now();
    
    // Handle pig crash animation overlay with movement to target
    let crashRotation = 0;
    let crashAlpha = 1;
    let crashOffsetX = 0;
    let crashOffsetY = 0;
    if (gameState.pigCrashAnimation && gameState.pigCrashAnimation.active) {
        const crashProgress = Math.min(1, (now - gameState.pigCrashAnimation.startTime) / gameState.pigCrashAnimation.duration);
        crashRotation = crashProgress * Math.PI * 4; // 2 full spins
        crashAlpha = 1 - crashProgress * 0.3; // Fade slightly
        
        // Move from start position to target position
        if (gameState.pigCrashAnimation.targetX !== undefined && gameState.pigCrashAnimation.targetY !== undefined) {
            const startScreenX = (gameState.pigCrashAnimation.startX + 0.5) * CELL_SIZE;
            const startScreenY = (gameState.pigCrashAnimation.startY + 0.5) * CELL_SIZE;
            const targetScreenX = (gameState.pigCrashAnimation.targetX + 0.5) * CELL_SIZE;
            const targetScreenY = (gameState.pigCrashAnimation.targetY + 0.5) * CELL_SIZE;
            
            const currentScreenX = startScreenX + (targetScreenX - startScreenX) * crashProgress;
            const currentScreenY = startScreenY + (targetScreenY - startScreenY) * crashProgress;
            
            crashOffsetX = currentScreenX - centerX;
            crashOffsetY = currentScreenY - (centerY + jumpOffset);
            
            // Update player grid position at end of crash
            if (crashProgress >= 1) {
                gameState.player.x = gameState.pigCrashAnimation.targetX;
                gameState.player.y = gameState.pigCrashAnimation.targetY;
                gameState.pigCrashAnimation.active = false;
                gameState.pigCrashAnimation.playExplosion = true; // Signal to play explosion
                
                // Crash landing explosion
                particles.spawn('explosion', targetScreenX, targetScreenY, 25, { color: '#FFD700' });
                particles.spawn('smoke', targetScreenX, targetScreenY, 15, { color: '#666' });
                gameState.screenShakeMag = 5;
                gameState.screenShakeUntil = now + 200;
            }
        } else if (crashProgress >= 1) {
            gameState.pigCrashAnimation.active = false;
        }
        
        // Spawn smoke trail during crash
        if (crashProgress < 1 && Math.random() < 0.3) {
            particles.spawn('smoke', centerX + crashOffsetX, centerY + jumpOffset + crashOffsetY, 3, { color: '#888' });
        }
        
        // Apply rotation and offset
        ctx.save();
        ctx.translate(centerX + crashOffsetX, centerY + jumpOffset + crashOffsetY);
        ctx.rotate(crashRotation);
        ctx.globalAlpha = crashAlpha;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // Add dizzy stars during crash
        if (crashProgress < 0.9) {
            for (let i = 0; i < 3; i++) {
                const starAngle = (crashProgress * Math.PI * 2) + (i * Math.PI * 2 / 3);
                const starDist = radius + 8 + Math.sin(crashProgress * Math.PI * 4) * 4;
                const sx = centerX + crashOffsetX + Math.cos(starAngle) * starDist;
                const sy = centerY + jumpOffset + crashOffsetY + Math.sin(starAngle) * starDist;
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 12px Arial';
                ctx.fillText('★', sx - 6, sy + 4);
            }
        }
    } else {
        // Normal player rendering
        
        // Check if rainbow skin - shift the entire player through rainbow colors
        if (skinEffects && (skinEffects.rainbowEffect || skinEffects.rainbow)) {
            const now = performance.now();
            const hue = (now / 30) % 360; // Cycle through hue over time (faster rainbow)
            ctx.fillStyle = `hsl(${hue}, 100%, 45%)`;
        } else {
            ctx.fillStyle = `rgb(${r},${g},${b})`;
        }
        
        ctx.beginPath();
        ctx.arc(centerX, centerY + jumpOffset, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Apply skin effects if available
        if (skinEffects) {
            const now = performance.now();
            
            // Glow effect
            if (skinEffects.glow) {
                ctx.save();
                ctx.strokeStyle = `rgba(${r},${g},${b},0.6)`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(centerX, centerY + jumpOffset, radius + 4, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
            
            // Pulse effect (breathing glow)
            if (skinEffects.pulseEffect) {
                ctx.save();
                const pulse = 0.3 + 0.7 * Math.sin(now / 400);
                ctx.strokeStyle = `rgba(${r},${g},${b},${pulse * 0.5})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(centerX, centerY + jumpOffset, radius + 6 + pulse * 3, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
            
            // Metallic effect (shiny reflection)
            if (skinEffects.metallicEffect) {
                ctx.save();
                const shimmer = 0.4 + 0.6 * Math.sin(now / 600 + Math.PI / 2);
                const gradient = ctx.createLinearGradient(centerX - radius, centerY + jumpOffset, centerX + radius, centerY + jumpOffset);
                gradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
                gradient.addColorStop(0.5, `rgba(255, 255, 255, ${shimmer * 0.4})`);
                gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(centerX, centerY + jumpOffset, radius * 0.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            
            // Void effect (dark aura consuming light)
            if (skinEffects.voidEffect) {
                ctx.save();
                const voidPulse = 0.5 + 0.5 * Math.sin(now / 300);
                const voidGradient = ctx.createRadialGradient(centerX, centerY + jumpOffset, radius, centerX, centerY + jumpOffset, radius + 15);
                voidGradient.addColorStop(0, `rgba(0, 0, 0, 0.2)`);
                voidGradient.addColorStop(1, `rgba(0, 0, 0, 0)`);
                ctx.fillStyle = voidGradient;
                ctx.beginPath();
                ctx.arc(centerX, centerY + jumpOffset, radius + 15 * voidPulse, 0, Math.PI * 2);
                ctx.fill();
                
                // Dark wisps around void
                for (let i = 0; i < 3; i++) {
                    const angle = (now / 500) + (i * Math.PI * 2 / 3);
                    const x = centerX + Math.cos(angle) * (radius + 8);
                    const y = centerY + jumpOffset + Math.sin(angle) * (radius + 8);
                    ctx.strokeStyle = `rgba(20, 0, 40, ${0.5 * voidPulse})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(centerX, centerY + jumpOffset);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                }
                ctx.restore();
            }
            
            // Sprint/Dash Particle Effects - ONLY when sprinting and stamina is available
            if (gameState.isSprinting && gameState.stamina === 100) {
                const skinId = gameState.equippedSkin || 'default';
                
                if (Math.random() < 0.4) {
                    let particleType = 'move';
                    let particleColor = `rgba(${r},${g},${b},0.7)`;
                    let spawnCount = 1;
                    
                    // Custom sprint effects per skin
                    switch(skinId) {
                        case 'default':
                            // Blue energy trails
                            particleType = 'move';
                            particleColor = 'rgba(0, 150, 255, 0.8)';
                            break;
                        case 'rookie':
                            // Green training sparks
                            particleType = 'wallHit';
                            particleColor = 'rgba(50, 205, 50, 0.9)';
                            spawnCount = 2;
                            break;
                        case 'veteran':
                            // Red combat aura
                            particleType = 'explosion';
                            particleColor = 'rgba(255, 0, 0, 0.8)';
                            break;
                        case 'engineer':
                            // Golden tool sparks
                            particleType = 'wallHit';
                            particleColor = 'rgba(255, 215, 0, 0.9)';
                            spawnCount = 2;
                            break;
                        case 'guardian':
                            // Holy light particles
                            particleType = 'generator';
                            particleColor = 'rgba(255, 250, 205, 0.9)';
                            spawnCount = 2;
                            break;
                        case 'shadow':
                            // Dark purple smoke
                            particleType = 'damage';
                            particleColor = 'rgba(138, 43, 226, 0.7)';
                            break;
                        case 'corrupted':
                            // Red/black corruption wisps
                            particleType = 'wallHit';
                            particleColor = 'rgba(0, 255, 0, 0.8)';
                            spawnCount = 2;
                            break;
                        case 'blitz':
                            // White lightning bolts
                            particleType = 'explosion';
                            particleColor = 'rgba(255, 255, 255, 0.95)';
                            spawnCount = 2;
                            break;
                        case 'chrono':
                            // Time warp distortion (cyan trails)
                            particleType = 'generator';
                            particleColor = 'rgba(64, 224, 208, 0.85)';
                            break;
                        case 'minimal':
                            // Simple geometric traces (gray)
                            particleType = 'move';
                            particleColor = 'rgba(169, 169, 169, 0.7)';
                            break;
                        case 'ghost':
                            // Transparent afterimages (white trails)
                            particleType = 'generator';
                            particleColor = 'rgba(240, 255, 255, 0.6)';
                            spawnCount = 2;
                            break;
                        case 'defender':
                            // Shield barrier particles (silver)
                            particleType = 'wallHit';
                            particleColor = 'rgba(211, 211, 211, 0.85)';
                            break;
                        case 'marksman':
                            // Focused trajectory lines (orange fire)
                            particleType = 'explosion';
                            particleColor = 'rgba(255, 165, 0, 0.9)';
                            spawnCount = 2;
                            break;
                        case 'infinite':
                            // Rainbow spiral vortex
                            const hue = (now / 20) % 360;
                            particleColor = `hsl(${hue}, 100%, 50%)`;
                            particleType = 'generator';
                            spawnCount = 2;
                            break;
                        case 'technician':
                            // Technical circuit particles (bright blue)
                            particleType = 'wallHit';
                            particleColor = 'rgba(0, 191, 255, 0.9)';
                            spawnCount = 2;
                            break;
                        case 'glitch':
                            // Glitch displacement particles (magenta)
                            particleType = 'wallHit';
                            particleColor = 'rgba(255, 0, 127, 0.8)';
                            spawnCount = 2;
                            break;
                        case 'void':
                            // Void particle absorption (deep black)
                            particleType = 'damage';
                            particleColor = 'rgba(10, 0, 20, 0.9)';
                            break;
                    }
                    
                    // Spawn particles in circular pattern around player
                    for (let i = 0; i < spawnCount; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const dist = radius + 5;
                        const px = centerX + Math.cos(angle) * dist;
                        const py = centerY + jumpOffset + Math.sin(angle) * dist;
                        
                        particles.spawn(particleType, px, py, 1, { color: particleColor });
                    }
                }
            }
            
            // Glow effect for rainbow skin
            if (skinEffects && (skinEffects.rainbowEffect || skinEffects.rainbow) && skinEffects.glow) {
                ctx.save();
                const now = performance.now();
                const hue = (now / 50) % 360;
                ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.arc(centerX, centerY + jumpOffset, radius + 4, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }
    }

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
    
    // === GLITCH EFFECT (for Glitch skin) ===
    if (skinEffects && skinEffects.glitchEffect) {
        const glitchCenterY = centerY + jumpOffset;
        ctx.save();
        const now = performance.now();
        
        // Random glitch offset (creates the "broken" look)
        const glitchIntensity = 0.3 + 0.2 * Math.sin(now / 100);
        
        // Draw a second displaced copy with offset (cyan/green tint)
        ctx.globalAlpha = glitchIntensity * 0.6;
        const offsetX = (Math.random() - 0.5) * radius * 0.3;
        const offsetY = (Math.random() - 0.5) * radius * 0.3;
        
        ctx.fillStyle = 'rgba(0, 255, 100, 0.5)'; // Cyan-green glitch color
        ctx.beginPath();
        ctx.arc(centerX + offsetX, glitchCenterY + offsetY, radius * 0.95, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw a third copy with red offset
        ctx.fillStyle = 'rgba(255, 0, 100, 0.4)'; // Magenta-red glitch color
        const offsetX2 = (Math.random() - 0.5) * radius * 0.2;
        const offsetY2 = (Math.random() - 0.5) * radius * 0.2;
        ctx.beginPath();
        ctx.arc(centerX + offsetX2, glitchCenterY + offsetY2, radius * 0.9, 0, Math.PI * 2);
        ctx.fill();
        
        // Scanline effect overlay (horizontal lines)
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.15)';
        ctx.lineWidth = 1;
        for (let i = -radius; i < radius; i += 3) {
            ctx.beginPath();
            ctx.moveTo(centerX - radius, glitchCenterY + i);
            ctx.lineTo(centerX + radius, glitchCenterY + i);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    // === DASH ABILITY INDICATOR (Electric aura around player) ===
    // Show when speedBoost ability is equipped and active
    if (hasAbility && hasAbility('speedBoost')) {
        const dashCenterY = centerY + jumpOffset;
        const now = performance.now();
        
        // Pulsing electric aura
        const pulse = 0.5 + 0.5 * Math.sin(now / 150);
        
        ctx.save();
        
        // Outer electric ring (animated and glowing)
        ctx.strokeStyle = `rgba(0, 200, 255, ${0.6 * pulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, dashCenterY, radius + 6 + pulse * 3, 0, Math.PI * 2);
        ctx.stroke();
        
        // Electric bolts/branches around the player
        const boltCount = 6;
        for (let i = 0; i < boltCount; i++) {
            const angle = (i / boltCount) * Math.PI * 2 + (now / 300);
            const boltLength = radius + 10 + pulse * 4;
            
            // Draw jagged bolt
            ctx.strokeStyle = `rgba(100, 200, 255, ${0.7 * pulse})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            const startX = centerX + Math.cos(angle) * (radius + 2);
            const startY = dashCenterY + Math.sin(angle) * (radius + 2);
            ctx.moveTo(startX, startY);
            
            // Create jagged effect
            const segments = 3;
            for (let s = 0; s < segments; s++) {
                const t = (s + 1) / segments;
                const x = centerX + Math.cos(angle) * (radius + 2 + (boltLength - radius - 2) * t);
                const y = dashCenterY + Math.sin(angle) * (radius + 2 + (boltLength - radius - 2) * t);
                const jag = (Math.random() - 0.5) * 3;
                ctx.lineTo(x + jag, y + jag);
            }
            ctx.stroke();
        }
        
        // Inner glow core
        const glowGrad = ctx.createRadialGradient(centerX, dashCenterY, radius * 0.3, centerX, dashCenterY, radius);
        glowGrad.addColorStop(0, `rgba(100, 200, 255, ${0.4 * pulse})`);
        glowGrad.addColorStop(1, 'rgba(100, 200, 255, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(centerX, dashCenterY, radius, 0, Math.PI * 2);
        ctx.fill();
        
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

    // Draw blocking shield when active (with aura/glow and pull-out animation)
    if (gameState.blockActive) {
        const now = performance.now(); // Define now at the start
        const shieldCenterY = centerY + jumpOffset;
        const r = Math.max(CELL_SIZE, radius + 10);
        
        // Get skin color for shield
        let blockShieldColor = 'rgba(255, 213, 0, 0.95)'; // Default yellow
        let blockShieldFill = 'rgba(255, 213, 0, 0.28)'; // Default yellow fill
        let blockShieldAura = 'rgba(255, 240, 120, 0.25)'; // Default yellow aura
        
        if (skinVisuals && skinVisuals.color) {
            const { r: sr, g: sg, b: sb } = skinVisuals.color;
            blockShieldColor = `rgba(${sr}, ${sg}, ${sb}, 0.95)`;
            blockShieldFill = `rgba(${sr}, ${sg}, ${sb}, 0.28)`;
            blockShieldAura = `rgba(${sr}, ${sg}, ${sb}, 0.25)`;
        }
        
        // Pull-out animation (300ms)
        const pullOutDuration = 300;
        const timeSinceStart = now - (gameState.blockStartTime || now);
        const pullOutProgress = Math.min(1, timeSinceStart / pullOutDuration);
        const easeOut = 1 - Math.pow(1 - pullOutProgress, 3); // Ease out cubic
        
        // Scale and alpha based on animation progress
        const shieldScale = easeOut;
        const shieldAlpha = easeOut;
        
        // Aura (subtle glow around the wedge)
        ctx.save();
        ctx.globalAlpha = 0.15 * shieldAlpha;
        ctx.fillStyle = blockShieldAura;
        ctx.beginPath(); ctx.arc(centerX, shieldCenterY, (r + 6) * shieldScale, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        
        // Directional shield wedge
        ctx.save();
        ctx.globalAlpha = shieldAlpha;
        ctx.translate(centerX, shieldCenterY);
        ctx.rotate(gameState.blockAngle);
        ctx.fillStyle = blockShieldFill;
        ctx.strokeStyle = blockShieldColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r * shieldScale, -Math.PI/2, Math.PI/2, false);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, r * shieldScale, -Math.PI/2, Math.PI/2, false);
        ctx.stroke();
        ctx.restore();
    }

    // Collision Shield visuals (don't show when blocking shield is active)
    if (!gameState.blockActive) {
        const collisionCenterY = centerY + jumpOffset;

        // Phoenix one-time shield ring (orange)
        if (gameState.phoenixShieldActive) {
            ctx.save();
            ctx.globalAlpha = 0.85;
            ctx.strokeStyle = 'rgba(255, 140, 0, 0.95)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(centerX, collisionCenterY, radius + 10, 0, Math.PI * 2);
            ctx.stroke();
            // Soft aura
            ctx.globalAlpha = 0.25;
            ctx.strokeStyle = 'rgba(255, 140, 0, 0.35)';
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.arc(centerX, collisionCenterY, radius + 12, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
        // Get shield color from skin if available, otherwise use default pink
        let shieldColor = '#ff77aa';
        let shieldColorRGB = { r: 255, g: 119, b: 170 };
        if (skinVisuals && skinVisuals.color) {
            // Use skin color for shield
            shieldColorRGB = skinVisuals.color;
            shieldColor = `rgb(${shieldColorRGB.r}, ${shieldColorRGB.g}, ${shieldColorRGB.b})`;
        }
        
        if (gameState.collisionShieldState === 'active') {
            // Enhanced active shield with fixed particle positions (not spinning off)
            const pulse = Math.sin(now / 180) * 0.25 + 0.75;
            
            // Apply pulse effect to shield if skin has it
            let shieldPulse = pulse;
        if (skinEffects && skinEffects.pulseEffect) {
            shieldPulse = 0.3 + 0.7 * Math.sin(now / 400);
        }
        
        // Outer glow aura
        ctx.save();
        ctx.globalAlpha = 0.15 * shieldPulse;
        const gradient = ctx.createRadialGradient(centerX, collisionCenterY, radius, centerX, collisionCenterY, radius + 12);
        gradient.addColorStop(0, `rgba(${shieldColorRGB.r}, ${shieldColorRGB.g}, ${shieldColorRGB.b}, 0.4)`);
        gradient.addColorStop(1, `rgba(${shieldColorRGB.r}, ${shieldColorRGB.g}, ${shieldColorRGB.b}, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, collisionCenterY, radius + 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // === GLITCH EFFECT ON SHIELD ===
        if (skinEffects && skinEffects.glitchEffect) {
            ctx.save();
            const glitchIntensity = 0.4 + 0.2 * Math.sin(now / 80);
            ctx.globalAlpha = glitchIntensity * 0.5;
            
            // Cyan displaced ring
            ctx.strokeStyle = 'rgba(0, 255, 100, 0.6)';
            ctx.lineWidth = 2;
            const offsetX = (Math.random() - 0.5) * 2;
            const offsetY = (Math.random() - 0.5) * 2;
            ctx.beginPath();
            ctx.arc(centerX + offsetX, collisionCenterY + offsetY, radius + 6, 0, Math.PI * 2);
            ctx.stroke();
            
            // Magenta displaced ring
            ctx.strokeStyle = 'rgba(255, 0, 100, 0.5)';
            const offsetX2 = (Math.random() - 0.5) * 1.5;
            const offsetY2 = (Math.random() - 0.5) * 1.5;
            ctx.beginPath();
            ctx.arc(centerX + offsetX2, collisionCenterY + offsetY2, radius + 4, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.restore();
        }
        
        // === RAINBOW EFFECT ON SHIELD ===
        if (skinEffects && skinEffects.rainbowEffect) {
            ctx.save();
            const hue = (now / 30) % 360;
            const rainbowPulse = 0.5 + 0.5 * Math.sin(now / 200);
            
            for (let i = 0; i < 2; i++) {
                const ringHue = (hue + (i * 180)) % 360;
                ctx.strokeStyle = `hsl(${ringHue}, 100%, ${50 + 10 * rainbowPulse}%)`;
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = 0.4 - (i * 0.15);
                ctx.beginPath();
                ctx.arc(centerX, collisionCenterY, (radius + 4 + (i * 3)) * rainbowPulse, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
        }
        
        // === METALLIC EFFECT ON SHIELD ===
        if (skinEffects && skinEffects.metallicEffect) {
            ctx.save();
            const shimmer = 0.4 + 0.6 * Math.sin(now / 600 + Math.PI / 2);
            const shieldGradient = ctx.createLinearGradient(centerX - radius, collisionCenterY, centerX + radius, collisionCenterY);
            shieldGradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
            shieldGradient.addColorStop(0.5, `rgba(255, 255, 255, ${shimmer * 0.3})`);
            shieldGradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
            ctx.fillStyle = shieldGradient;
            ctx.beginPath();
            ctx.arc(centerX, collisionCenterY, radius + 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        
        // === VOID EFFECT ON SHIELD ===
        if (skinEffects && skinEffects.voidEffect) {
            ctx.save();
            const voidPulse = 0.5 + 0.5 * Math.sin(now / 300);
            const voidGradient = ctx.createRadialGradient(centerX, collisionCenterY, radius, centerX, collisionCenterY, radius + 15);
            voidGradient.addColorStop(0, `rgba(0, 0, 0, 0.2)`);
            voidGradient.addColorStop(1, `rgba(0, 0, 0, 0)`);
            ctx.fillStyle = voidGradient;
            ctx.beginPath();
            ctx.arc(centerX, collisionCenterY, radius + 15 * voidPulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        
        // Fixed energy particles on shield perimeter (not spinning off)
        const particleCount = 8;
        const rotationSpeed = now / 600;
        const shieldRadius = radius + 4; // Fixed radius matching the shield ring
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2 + rotationSpeed;
            const px = centerX + Math.cos(angle) * shieldRadius;
            const py = collisionCenterY + Math.sin(angle) * shieldRadius;
            
            ctx.save();
            ctx.globalAlpha = 0.7 + 0.3 * Math.sin(now / 150 + i);
            ctx.fillStyle = shieldColor;
            ctx.shadowBlur = 8;
            ctx.shadowColor = shieldColor;
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        
        // Main shield ring with enhanced glow
        ctx.save();
        ctx.strokeStyle = `rgba(${shieldColorRGB.r}, ${shieldColorRGB.g}, ${shieldColorRGB.b}, ${0.8 * pulse})`;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 12;
        ctx.shadowColor = shieldColor;
        ctx.beginPath();
        ctx.arc(centerX, collisionCenterY, shieldRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        
        // Inner highlight ring
        ctx.save();
        ctx.strokeStyle = `rgba(${Math.min(255, shieldColorRGB.r + 30)}, ${Math.min(255, shieldColorRGB.g + 30)}, ${Math.min(255, shieldColorRGB.b + 30)}, ${0.5 * pulse})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(centerX, collisionCenterY, radius + 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        
    } else if (gameState.collisionShieldState === 'recharging' && gameState.collisionShieldRechargeEnd) {
        // Recharge animation - subtle progress arc with gentle pulse
        const remain = Math.max(0, gameState.collisionShieldRechargeEnd - now);
        const t = 1 - Math.min(1, remain / COLLISION_SHIELD_RECHARGE_TIME);
        
        // Use skin color for recharge animation (match active shield color)
        let rechargeColorRGB = { r: 255, g: 119, b: 170 }; // default pink
        if (skinVisuals && skinVisuals.color) {
            rechargeColorRGB = skinVisuals.color;
        }
        const rechargeColor = `rgb(${rechargeColorRGB.r}, ${rechargeColorRGB.g}, ${rechargeColorRGB.b})`;
        
        // Subtle pulse effect
        const pulse = 0.5 + 0.3 * Math.sin(now / 400);
        
        ctx.save();
        // Base faint ring
        ctx.strokeStyle = `rgba(${rechargeColorRGB.r}, ${rechargeColorRGB.g}, ${rechargeColorRGB.b}, 0.12)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, collisionCenterY, radius + 4, 0, Math.PI * 2);
        ctx.stroke();
        
        // Progress arc - subtle with gentle glow
        const opacity = 0.3 + 0.15 * pulse;
        ctx.strokeStyle = `rgba(${rechargeColorRGB.r}, ${rechargeColorRGB.g}, ${rechargeColorRGB.b}, ${opacity})`;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 4;
        ctx.shadowColor = `rgba(${rechargeColorRGB.r}, ${rechargeColorRGB.g}, ${rechargeColorRGB.b}, 0.5)`;
        const start = -Math.PI / 2;
        ctx.beginPath();
        ctx.arc(centerX, collisionCenterY, radius + 4, start, start + t * Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
    } // End collision shield section (don't show when blocking)

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
    
    // Draw bazooka weapon when player has it - RENDERS ON TOP OF SHIELD
    if (gameState.bazooka && gameState.bazooka.has) {
        const sprite = getSprite('bazooka'); // Use bazooka.png sprite
        const weaponCenterY = centerY + jumpOffset;
        
        // Get mouse position for aiming
        let mousePos = { x: centerX + 20, y: weaponCenterY, inCanvas: false }; // default to right
        if (gameState.mousePosition) {
            mousePos = gameState.mousePosition;
        }
        
        // Calculate angle to mouse cursor (default to pointing right if mouse not in canvas)
        let aimAngle = 0; // 0 = right, π/2 = down, -π/2 = up
        if (mousePos.inCanvas) {
            const dx = mousePos.x - centerX;
            const dy = mousePos.y - weaponCenterY;
            aimAngle = Math.atan2(dy, dx);
        }
        
        // Recoil animation (15px for 150ms after firing) - more noticeable
        let recoilOffset = 0;
        let recoilShake = 0;
        if (gameState.bazookaFireTime) {
            const timeSinceFire = now - gameState.bazookaFireTime;
            if (timeSinceFire < 150) {
                const progress = timeSinceFire / 150;
                recoilOffset = 15 * (1 - progress); // Kickback
                recoilShake = Math.sin(progress * Math.PI * 4) * 2 * (1 - progress); // Vibration
            }
        }
        
        // Position weapon relative to player with offset based on aim direction
        const weaponDistance = radius + 15 - recoilOffset; // Increased distance
        const weaponX = centerX + Math.cos(aimAngle) * weaponDistance + recoilShake * Math.cos(aimAngle + Math.PI/2);
        const weaponY = weaponCenterY + Math.sin(aimAngle) * weaponDistance + recoilShake * Math.sin(aimAngle + Math.PI/2);
        const weaponSize = 35; // MUCH LARGER - 35px so it's very visible
        
        // Draw weapon sprite rotated to aim at cursor
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            ctx.save();
            ctx.translate(weaponX, weaponY);
            ctx.rotate(aimAngle); // Rotate to face mouse
            // Add drop shadow for depth
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.drawImage(sprite, -weaponSize / 2, -weaponSize / 2, weaponSize, weaponSize);
            ctx.restore();
        } else {
            // Fallback rendering with rotation - larger
            ctx.save();
            ctx.translate(weaponX, weaponY);
            ctx.rotate(aimAngle);
            ctx.fillStyle = '#555';
            ctx.fillRect(-15, -5, 30, 10);
            ctx.fillStyle = '#777';
            ctx.fillRect(12, -4, 6, 8);
            ctx.restore();
        }
        
        // Muzzle flash effect (first 100ms after firing) - enhanced
        if (gameState.bazookaFireTime) {
            const timeSinceFire = now - gameState.bazookaFireTime;
            if (timeSinceFire < 100) {
                const flashAlpha = 1 - (timeSinceFire / 100);
                ctx.save();
                ctx.globalAlpha = flashAlpha;
                
                // Flash appears at the tip of the weapon in aim direction
                const flashDistance = weaponDistance + weaponSize / 2 + 8;
                const flashX = centerX + Math.cos(aimAngle) * flashDistance;
                const flashY = weaponCenterY + Math.sin(aimAngle) * flashDistance;
                
                // Bright flash core
                const gradient = ctx.createRadialGradient(flashX, flashY, 0, flashX, flashY, 15);
                gradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
                gradient.addColorStop(0.5, 'rgba(255, 200, 100, 0.6)');
                gradient.addColorStop(1, 'rgba(255, 150, 50, 0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(flashX, flashY, 15, 0, Math.PI * 2);
                ctx.fill();
                
                // Flash rays oriented with weapon
                ctx.strokeStyle = 'rgba(255, 220, 100, 0.8)';
                ctx.lineWidth = 2;
                for (let i = 0; i < 6; i++) {
                    const angle = aimAngle + (i / 6) * Math.PI * 2 + (timeSinceFire / 20);
                    const rayLength = 12 + Math.random() * 8;
                    ctx.beginPath();
                    ctx.moveTo(flashX, flashY);
                    ctx.lineTo(flashX + Math.cos(angle) * rayLength, flashY + Math.sin(angle) * rayLength);
                    ctx.stroke();
                }
                
                ctx.restore();
            }
        }
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
    
    // Level 11: Show ERROR text in all UI elements instead of real stats
    if (gameState.isLevel11) {
        if (healthEl) healthEl.textContent = '[ERROR]';
        if (staminaEl) staminaEl.textContent = '[ERROR]';
        if (staminaFill) staminaFill.style.width = '0%';
        if (shieldEl) shieldEl.textContent = '[ERROR]';
        if (generatorsEl) generatorsEl.textContent = '[ERROR]';
        if (trapsEl) trapsEl.textContent = '[ERROR]';
        if (timerEl) timerEl.textContent = '[ERROR]';
        
        // Also update simplified UI error text
        const healthSimple = document.getElementById('health-simple');
        const staminaSimple = document.getElementById('stamina-simple');
        const shieldSimple = document.getElementById('shield-simple');
        if (healthSimple) healthSimple.textContent = '[ERROR]';
        if (staminaSimple) staminaSimple.textContent = '[ERROR]';
        if (shieldSimple) shieldSimple.textContent = '[ERROR]';
        
        return; // Skip normal UI updates
    }
    
    // Update main health display
    const healthText = gameState.fakeZeroHp ? '0' : '❤️'.repeat(gameState.lives);
    if (healthEl) healthEl.textContent = healthText;
    
    // Also update simplified UI health if it exists
    const healthSimple = document.getElementById('health-simple');
    if (healthSimple) healthSimple.textContent = healthText;
    
    // Clamp stamina to 0-100 range to prevent display of negative or >100 values
    const staminaPct = Math.floor(Math.max(0, Math.min(100, gameState.stamina)));
    const staminaText = `${staminaPct}%`;
    const staminaColor = staminaPct < 100 ? '#888' : '#0ff';
    
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
    
    // Update stamina bar to match displayed value
    if (staminaFill) {
        staminaFill.style.width = `${staminaPct}%`;
        staminaFill.style.background = staminaPct < 100
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
    
    // Endless rooms UI
    if (ui.roomsSection) {
        if (gameState.mode === 'endless-progression') {
            ui.roomsSection.style.display = 'flex';
            const progression = gameState.endlessProgression;
            const currentRoom = progression && progression.currentRun ? progression.currentRun.roomNumber : 0;
            if (ui.currentRooms) ui.currentRooms.textContent = String(currentRoom);
        } else {
            ui.roomsSection.style.display = 'none';
        }
    }
    
    // Energy Blaster ammo display (only show when bazooka is active)
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

    // Don't show bottom message box in prep room - text is shown at top of canvas instead
    if (gameState.currentLevel === 10 && gameState.boss && gameState.boss.prepRoom) {
        const messageBox = document.getElementById('statusMessageBox');
        if (messageBox) messageBox.style.display = 'none';
        return;
    }

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
