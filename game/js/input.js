// input.js - Keyboard input handling (+ Mobile integration)

import { gameState, movePlayer, startBlock, stopBlock, setBlockAim, attemptGeneratorInteraction, attemptSkillCheck, closeGeneratorInterface, placeZapTrap } from './state.js';
import { initGame } from './main.js';
import { isBazookaMode } from './config.js';

// Key state: store lowercased keys for consistency (e.g., 'a', 'arrowleft')
const keys = {};
// Press-latch for single-step movement when auto-movement is OFF
const keysPressed = {};

// Movement throttling so a tap only moves one tile
const MOVE_DELAY = 120; // ms
let lastMoveAt = 0;

// Mobile: touch input integration (initialized from main.js)
let touchInputInitialized = false;
let isMobileDevice = false;

export function setupInputHandlers() {
    document.addEventListener('keydown', handleKeyDown, { passive: false });
    document.addEventListener('keyup', handleKeyUp, { passive: false });
    document.addEventListener('mousedown', handleMouseDown, { passive: false });

    // Track mouse position for bazooka aiming (store in gameState to avoid circular dependency)
    const canvas = document.getElementById('canvas');
    if (canvas) {
        canvas.addEventListener('mousemove', handleMouseMove, { passive: true });
        canvas.addEventListener('mouseenter', () => { 
            if (gameState.mousePosition) gameState.mousePosition.inCanvas = true; 
        });
        canvas.addEventListener('mouseleave', () => { 
            if (gameState.mousePosition) gameState.mousePosition.inCanvas = false; 
        });
        canvas.addEventListener('pointerdown', handleCanvasPointer, { passive: false });
    }
    
    // Initialize mouse position in gameState
    if (!gameState.mousePosition) {
        gameState.mousePosition = { x: 0, y: 0, inCanvas: false };
    }
}

// Handle mouse movement for bazooka aiming
function handleMouseMove(e) {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!gameState.mousePosition) {
        gameState.mousePosition = { x: 0, y: 0, inCanvas: false };
    }
    gameState.mousePosition.x = e.clientX - rect.left;
    gameState.mousePosition.y = e.clientY - rect.top;
}

// Mobile: Initialize touch handlers (called from main.js)
export function setupMobileInput(controls) {
    if (touchInputInitialized || !controls) return;

    // Mark as mobile device to disable keyboard input
    isMobileDevice = true;

    // Dynamically import touch-input module
    import('./touch-input.js').then(module => {
        module.initTouchInput(controls, handleKeyDown, handleKeyUp);
        touchInputInitialized = true;
        console.log('Mobile touch input initialized - keyboard input disabled');
    }).catch(err => {
        console.warn('Touch input not available:', err);
    });
}

// Mobile: Export handlers for touch events to use
export { handleKeyDown, handleKeyUp };

function handleKeyDown(e) {
    // Ignore keyboard input on mobile devices (touch controls only)
    // Exception: allow touch-generated events (marked with isTouchEvent property)
    if (isMobileDevice && !e.isTouchEvent) {
        return;
    }

    const key = (e.key || '').toLowerCase();

    // Allow H key to skip dialog even when input is locked (prep room)
    if ((e.code === 'KeyH' || key === 'h') && gameState.boss && gameState.boss.prepRoom && gameState.inputLocked) {
        import('./state.js').then(m => {
            if (m.skipTextSequence) m.skipTextSequence();
        });
        e.preventDefault();
        return;
    }
    
    if (gameState.inputLocked) {
        // While input is locked (cutscenes), ignore gameplay inputs entirely
        e.preventDefault();
        e.stopPropagation();
        return;
    }
    // Prevent page scroll for arrow keys and space universally while game is focused
    if (key === 'arrowup' || key === 'arrowdown' || key === 'arrowleft' || key === 'arrowright' || key === ' ' || e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
    }
    keys[key] = true;

    // R key: reload at ammo box during gameplay, restart otherwise
    if (e.code === 'KeyR' || key === 'r') {
        if (gameState.gameStatus === 'playing' && !gameState.isPaused) {
            // Mark a reload attempt for state logic to process (prep or arena)
            gameState.reloadPressedAt = performance.now();
        } else if (gameState.gameStatus !== 'playing') {
            initGame();
        }
        return;
    }

    // Escape: cancel generator UI if open; otherwise toggle Pause
    if (e.key === 'Escape') {
        if (gameState.isGeneratorUIOpen) {
            closeGeneratorInterface();
            const overlay = document.getElementById('overlay');
            if (overlay) overlay.style.display = 'none';
        } else {
            const po = document.getElementById('pauseOverlay');
            if (gameState.isPaused) {
                gameState.isPaused = false;
                if (po) po.style.display = 'none';
            } else if (gameState.gameStatus === 'playing') {
                gameState.isPaused = true;
                if (po) po.style.display = 'flex';
            }
        }
        return;
    }

    // Generator interaction (E) or boss interactions (pickup/mount)
    if (e.code === 'KeyE' || key === 'e') {
        if (gameState.gameStatus === 'playing' && !gameState.isGeneratorUIOpen) {
            if (gameState.isPaused) return; // ignore while paused
            const now = performance.now();
            if (gameState.boss && (gameState.boss.active || gameState.boss.prepRoom)) {
                // Try mount pig first
                import('./boss.js').then(mod => { try { mod.tryMountPig(now); } catch {} });
                // Then bazooka pickup if present
                if (gameState.bazookaPickup) {
                    gameState.interactPressedAt = now;
                    import('./boss.js').then(mod => { try { mod.pickBazooka(now); } catch {} });
                }
            } else {
                attemptGeneratorInteraction(now);
            }
        }
        return;
    }

    // Place Zap Trap (F)
    if (e.code === 'KeyF' || key === 'f') {
        if (gameState.gameStatus === 'playing' && !gameState.isGeneratorUIOpen && !gameState.isPaused) {
            placeZapTrap(performance.now());
        }
        return;
    }

    // Space: skill check while repairing OR start blocking otherwise
    if (e.code === 'Space' || key === ' ') {
        if (gameState.isGeneratorUIOpen && gameState.skillCheckState) {
            e.preventDefault();
            e.stopPropagation();
            attemptSkillCheck();
        } else if (!gameState.isGeneratorUIOpen && !gameState.isPaused) {
            e.preventDefault();
            // Toggle shield on Space: if active, cancel; otherwise activate
            if (gameState.blockActive) {
                stopBlock();
            } else {
                startBlock(performance.now());
            }
        }
        return;
    }

    // Sprint (Shift)
    if (e.key === 'Shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        if (!gameState.isGeneratorUIOpen && gameState.stamina >= 100 && !gameState.isStaminaCoolingDown) {
            if (gameState.isPaused) return;
            gameState.isSprinting = true;
        }
        return;
    }

    // Toggle Seeker debug overlay (H) / Skip dialog in prep room
    if (e.code === 'KeyH' || key === 'h') {
        // Skip dialog in prep room
        if (gameState.boss && gameState.boss.prepRoom) {
            import('./state.js').then(m => {
                if (m.skipTextSequence) m.skipTextSequence();
            });
        }
        // Toggle debug overlay
        if (!gameState.isGeneratorUIOpen) {
            gameState.debugSeeker = !gameState.debugSeeker;
        }
        return;
    }

    // Aim shield while blocking (WASD/Arrows)
    if (gameState.blockActive) {
        let adx = 0, ady = 0;
        if (key === 'arrowleft' || key === 'a') adx = -1;
        else if (key === 'arrowright' || key === 'd') adx = 1;
        else if (key === 'arrowup' || key === 'w') ady = -1;
        else if (key === 'arrowdown' || key === 's') ady = 1;
        if (adx !== 0 || ady !== 0) {
            setBlockAim(adx, ady);
        }
        return;
    }

    // Single-step movement when Auto-Movement is OFF
    if (gameState.gameStatus === 'playing' && !gameState.isGeneratorUIOpen && !gameState.isPaused) {
        const auto = !gameState.settings || gameState.settings.autoMovement !== false;
        if (!auto) {
            let mdx = 0, mdy = 0;
            if (key === 'arrowleft' || key === 'a') mdx = -1;
            else if (key === 'arrowright' || key === 'd') mdx = 1;
            else if (key === 'arrowup' || key === 'w') mdy = -1;
            else if (key === 'arrowdown' || key === 's') mdy = 1;
            if (mdx !== 0 || mdy !== 0) {
                // Only move once per physical key press; ignore holds until keyup
                if (!keysPressed[key]) {
                    keysPressed[key] = true;
                    const now = performance.now();
                    if (now - lastMoveAt >= MOVE_DELAY) {
                        movePlayer(mdx, mdy, now);
                        lastMoveAt = now;
                    }
                }
                return;
            }
        }
    }
}

function handleMouseDown(e) {
    if (e.button !== 0) return; // left click only
    if (gameState.gameStatus !== 'playing' || gameState.isPaused) return;
    // Allow bazooka firing in bazooka mode on any level, or during boss fight
    const canFireBazooka = (isBazookaMode() && gameState.bazooka && gameState.bazooka.has) || (gameState.boss && gameState.boss.active);
    if (!canFireBazooka) return;
    if (!(gameState.bazooka && gameState.bazooka.has && gameState.bazooka.ammo > 0)) return;
    // Map click to grid tile
    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / 20); // CELL_SIZE=20
    const y = Math.floor((e.clientY - rect.top) / 20);
    // Fire rocket toward clicked tile using state helper
    import('./boss.js').then(mod => {
        mod.fireRocketAt(x, y, performance.now());
    });
}

function handleCanvasPointer(e) {
    // Only handle touch/pen events, not mouse (mousedown handles that)
    if (e.pointerType === 'mouse') return;

    if (gameState.gameStatus !== 'playing' || gameState.isPaused) return;

    // Allow bazooka firing in bazooka mode on any level, or during boss fight
    const canFireBazooka = (isBazookaMode() && gameState.bazooka && gameState.bazooka.has) || (gameState.boss && gameState.boss.active);
    if (!canFireBazooka) return;
    if (!(gameState.bazooka && gameState.bazooka.has && gameState.bazooka.ammo > 0)) return;

    e.preventDefault();
    e.stopPropagation();

    // Map touch/pointer to grid tile
    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / 20); // CELL_SIZE=20
    const y = Math.floor((e.clientY - rect.top) / 20);

    // Fire rocket toward tapped tile
    import('./boss.js').then(mod => {
        mod.fireRocketAt(x, y, performance.now());
    });
}

function handleKeyUp(e) {
    // Ignore keyboard input on mobile devices (touch controls only)
    // Exception: allow touch-generated events (marked with isTouchEvent property)
    if (isMobileDevice && !e.isTouchEvent) {
        return;
    }

    const key = (e.key || '').toLowerCase();
    keys[key] = false;
    keysPressed[key] = false;

    // Prevent Space keyup from triggering focused button clicks in overlays
    if ((e.code === 'Space' || key === ' ') && (gameState.isGeneratorUIOpen || gameState.isPaused)) {
        e.preventDefault();
        e.stopPropagation();
    }

    if (e.key === 'Shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        gameState.isSprinting = false;
    }

    // Reset move throttle when no movement keys held
    if (!keys['arrowleft'] && !keys['arrowright'] && !keys['arrowup'] && !keys['arrowdown'] &&
        !keys['a'] && !keys['d'] && !keys['w'] && !keys['s']) {
        lastMoveAt = 0;
    }
}

export function processMovement(currentTime) {
    if (gameState.inputLocked || gameState.gameStatus !== 'playing' || gameState.isGeneratorUIOpen || gameState.isPaused) {
        return;
    }

    // While blocking, the player cannot move; movement resumes when shield ends/breaks

    // Auto-Movement OFF: no continuous movement here; handled on keydown
    if (gameState.settings && gameState.settings.autoMovement === false) {
        return;
    }

    let dx = 0, dy = 0;

    // Arrow keys
    if (keys['arrowleft']) dx = -1;
    else if (keys['arrowright']) dx = 1;
    if (keys['arrowup']) dy = -1;
    else if (keys['arrowdown']) dy = 1;

    // WASD
    if (keys['a']) dx = -1;
    else if (keys['d']) dx = 1;
    if (keys['w']) dy = -1;
    else if (keys['s']) dy = 1;

    // Prevent diagonal movement (prefer horizontal when both pressed)
    if (dx !== 0 && dy !== 0) {
        dy = 0;
    }

    if (dx === 0 && dy === 0) return;

    if (currentTime - lastMoveAt < MOVE_DELAY) return;

    const moved = movePlayer(dx, dy, currentTime);
    lastMoveAt = currentTime;
    return moved;
}
