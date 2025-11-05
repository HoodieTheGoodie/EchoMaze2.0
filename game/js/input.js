// input.js - Keyboard input handling

import { gameState, movePlayer, startBlock, stopBlock, setBlockAim, attemptGeneratorInteraction, attemptSkillCheck, closeGeneratorInterface, placeZapTrap } from './state.js';
import { initGame } from './main.js';

// Key state: store lowercased keys for consistency (e.g., 'a', 'arrowleft')
const keys = {};
// Press-latch for single-step movement when auto-movement is OFF
const keysPressed = {};

// Movement throttling so a tap only moves one tile
const MOVE_DELAY = 120; // ms
let lastMoveAt = 0;

export function setupInputHandlers() {
    document.addEventListener('keydown', handleKeyDown, { passive: false });
    document.addEventListener('keyup', handleKeyUp, { passive: false });
}

function handleKeyDown(e) {
    const key = (e.key || '').toLowerCase();
    // Prevent page scroll for arrow keys and space universally while game is focused
    if (key === 'arrowup' || key === 'arrowdown' || key === 'arrowleft' || key === 'arrowright' || key === ' ' || e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
    }
    keys[key] = true;

    // Restart game (R)
    if (e.code === 'KeyR' || key === 'r') {
        if (gameState.gameStatus !== 'playing') {
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

    // Generator interaction (E)
    if (e.code === 'KeyE' || key === 'e') {
        if (gameState.gameStatus === 'playing' && !gameState.isGeneratorUIOpen) {
            if (gameState.isPaused) return; // ignore while paused
            attemptGeneratorInteraction(performance.now());
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
    if (e.code === 'Space') {
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

    // Toggle Seeker debug overlay (H)
    if (e.code === 'KeyH' || key === 'h') {
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

function handleKeyUp(e) {
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
    if (gameState.gameStatus !== 'playing' || gameState.isGeneratorUIOpen || gameState.isPaused) {
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
