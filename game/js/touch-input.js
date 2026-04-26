/**
 * TOUCH INPUT HANDLER
 * Translates touch events to keyboard events for mobile
 * Separate module - doesn't modify core input.js
 */

import { setSprintActive } from './mobile-controls.js';
import { gameState, movePlayer } from './state.js';

// Track active touches for each button
const activeTouches = new Map();

// Debounce map to prevent duplicate rapid events on same button
const lastEventTime = new Map();

// Sprint auto-release timer for mobile (tap to activate sprint for brief period)
let sprintAutoReleaseTimer = null;
let sprintKeyUpHandler = null;

const MOVEMENT_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const MOVE_TAP_INTERVAL_MS = 125;
const MAX_QUEUED_MOVES = 5;
const movementTapQueue = [];
let movementTapTimer = null;
let lastQueuedMoveAt = 0;

/**
 * Initialize touch event handlers for mobile controls
 * @param {Object} controls - Control elements from mobile-controls.js
 * @param {Function} keyDownHandler - Existing keydown handler from input.js
 * @param {Function} keyUpHandler - Existing keyup handler from input.js
 */
export function initTouchInput(controls, keyDownHandler, keyUpHandler) {
    if (!controls) return;

    // Store keyUpHandler for sprint auto-release
    sprintKeyUpHandler = keyUpHandler;

    // Setup D-Pad buttons (use tap mode for single-step movement)
    setupTouchButton(controls.dpad.up, 'ArrowUp', keyDownHandler, keyUpHandler, true);
    setupTouchButton(controls.dpad.down, 'ArrowDown', keyDownHandler, keyUpHandler, true);
    setupTouchButton(controls.dpad.left, 'ArrowLeft', keyDownHandler, keyUpHandler, true);
    setupTouchButton(controls.dpad.right, 'ArrowRight', keyDownHandler, keyUpHandler, true);

    // Setup Action buttons
    setupTouchButton(controls.actions.shield, ' ', keyDownHandler, keyUpHandler); // Space
    // Sprint uses special mobile-friendly tap-to-activate mode
    setupSprintButton(controls.actions.sprint, keyDownHandler, keyUpHandler);
    setupTouchButton(controls.actions.interact, 'e', keyDownHandler, keyUpHandler);
    setupTouchButton(controls.actions.trap, 'f', keyDownHandler, keyUpHandler);
    setupTouchButton(controls.actions.reload, 'r', keyDownHandler, keyUpHandler);

    setupCanvasTapMovement(keyDownHandler, keyUpHandler);
}

function setupCanvasTapMovement(keyDownHandler, keyUpHandler) {
    const canvas = document.getElementById('canvas');
    if (!canvas || canvas.dataset.mobileTapMoveBound === 'true') return;
    canvas.dataset.mobileTapMoveBound = 'true';

    canvas.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse') return;
        if (!gameState || gameState.gameStatus !== 'playing' || gameState.isPaused || gameState.isGeneratorUIOpen) return;

        // Let the existing canvas handler own blaster shots.
        if (gameState.bazooka && gameState.bazooka.has && gameState.bazooka.ammo > 0) return;

        const rect = canvas.getBoundingClientRect();
        const tapX = e.clientX - rect.left;
        const tapY = e.clientY - rect.top;
        const cellSize = rect.width / 28;
        const playerX = (gameState.player.x - 1 + 0.5) * cellSize;
        const playerY = (gameState.player.y - 1 + 0.5) * cellSize;
        const dx = tapX - playerX;
        const dy = tapY - playerY;

        if (Math.hypot(dx, dy) < cellSize * 0.65) return;

        const key = Math.abs(dx) > Math.abs(dy)
            ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft')
            : (dy > 0 ? 'ArrowDown' : 'ArrowUp');

        e.preventDefault();
        e.stopPropagation();

        queueMovementTap(key, keyDownHandler, keyUpHandler);
    }, { passive: false });
}

function queueMovementTap(key, keyDownHandler, keyUpHandler) {
    if (!MOVEMENT_KEYS.has(key)) return;

    if (movementTapQueue.length >= MAX_QUEUED_MOVES) {
        movementTapQueue.shift();
    }

    movementTapQueue.push(key);
    processMovementTapQueue(keyDownHandler, keyUpHandler);
}

function processMovementTapQueue(keyDownHandler, keyUpHandler) {
    if (movementTapTimer || movementTapQueue.length === 0) return;

    const now = performance.now();
    const wait = Math.max(0, MOVE_TAP_INTERVAL_MS - (now - lastQueuedMoveAt));

    movementTapTimer = setTimeout(() => {
        movementTapTimer = null;
        const key = movementTapQueue.shift();
        if (!key) return;

        performMovementTap(key, keyDownHandler, keyUpHandler);
        lastQueuedMoveAt = performance.now();
        processMovementTapQueue(keyDownHandler, keyUpHandler);
    }, wait);
}

function performMovementTap(key, keyDownHandler, keyUpHandler) {
    if (gameState.blockActive) {
        const fakeDownEvent = createKeyboardEvent('keydown', key);
        keyDownHandler(fakeDownEvent);
        const fakeUpEvent = createKeyboardEvent('keyup', key);
        keyUpHandler(fakeUpEvent);
        return;
    }

    if (gameState.gameStatus !== 'playing' || gameState.isPaused || gameState.isGeneratorUIOpen) return;

    let dx = 0;
    let dy = 0;
    if (key === 'ArrowLeft') dx = -1;
    else if (key === 'ArrowRight') dx = 1;
    else if (key === 'ArrowUp') dy = -1;
    else if (key === 'ArrowDown') dy = 1;
    if (dx === 0 && dy === 0) return;

    if (gameState.currentLevel === 7) {
        gameState.level7HasWASDMovement = true;
    }

    movePlayer(dx, dy, performance.now());
}

/**
 * Special setup for sprint button with mobile-friendly tap-to-activate mode
 * Tapping sprint activates it for 1.5 seconds, giving time to tap a direction
 * @param {HTMLElement} button - The sprint button element
 * @param {Function} keyDownHandler - Handler for key down
 * @param {Function} keyUpHandler - Handler for key up
 */
function setupSprintButton(button, keyDownHandler, keyUpHandler) {
    if (!button) return;

    button.style.pointerEvents = 'auto';
    button.style.cursor = 'pointer';
    button.style.touchAction = 'none';

    button.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Debounce
        const now = performance.now();
        const lastTime = lastEventTime.get(button) || 0;
        if (now - lastTime < 100) {
            return;
        }
        lastEventTime.set(button, now);

        // Clear any existing auto-release timer
        if (sprintAutoReleaseTimer) {
            clearTimeout(sprintAutoReleaseTimer);
            sprintAutoReleaseTimer = null;
        }

        // Activate sprint
        const fakeEvent = createKeyboardEvent('keydown', 'Shift');
        keyDownHandler(fakeEvent);

        // Visual feedback
        setSprintActive(true);
        button.dataset.sprintActive = 'true';

        // Auto-release sprint after 1.5 seconds (enough time to tap a direction)
        sprintAutoReleaseTimer = setTimeout(() => {
            if (button.dataset.sprintActive === 'true') {
                const fakeUpEvent = createKeyboardEvent('keyup', 'Shift');
                keyUpHandler(fakeUpEvent);
                setSprintActive(false);
                button.dataset.sprintActive = 'false';
            }
            sprintAutoReleaseTimer = null;
        }, 1500); // 1.5 second window to use sprint
    });

    // Prevent context menu
    button.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
}

/**
 * Setup touch events for a single button
 * @param {HTMLElement} button - The button element
 * @param {string} key - The keyboard key to simulate
 * @param {Function} keyDownHandler - Handler for key down
 * @param {Function} keyUpHandler - Handler for key up
 * @param {boolean} tapMode - If true, sends keyup immediately after keydown (for single-tap actions like movement)
 */
function setupTouchButton(button, key, keyDownHandler, keyUpHandler, tapMode = false) {
    if (!button) return;

    // Ensure button can receive pointer events
    button.style.pointerEvents = 'auto';
    button.style.cursor = 'pointer';
    button.style.touchAction = 'none'; // Prevent default touch behaviors

    // Use pointer events which work for both mouse and touch
    button.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (tapMode && MOVEMENT_KEYS.has(key)) {
            if (gameState.blockActive) {
                const fakeEvent = createKeyboardEvent('keydown', key);
                keyDownHandler(fakeEvent);
                const fakeUpEvent = createKeyboardEvent('keyup', key);
                keyUpHandler(fakeUpEvent);
                return;
            }

            queueMovementTap(key, keyDownHandler, keyUpHandler);
            button.style.opacity = '1';
            button.dataset.pointerActive = 'queued';
            setTimeout(() => {
                if (button.dataset.pointerActive === 'queued') {
                    button.style.opacity = '';
                    button.dataset.pointerActive = 'false';
                }
            }, 80);
            return;
        }

        // Debounce: prevent duplicate events within 100ms
        const now = performance.now();
        const lastTime = lastEventTime.get(button) || 0;
        if (now - lastTime < 100) {
            return;
        }
        lastEventTime.set(button, now);

        // Track this pointer
        activeTouches.set(e.pointerId, { button, key });

        // Simulate keyboard event
        const fakeEvent = createKeyboardEvent('keydown', key);
        keyDownHandler(fakeEvent);

        // For tap mode (movement keys), immediately send keyup to prevent continuous movement
        if (tapMode) {
            setTimeout(() => {
                const fakeUpEvent = createKeyboardEvent('keyup', key);
                keyUpHandler(fakeUpEvent);
            }, 10); // Small delay to ensure keydown is processed first
        }

        // Visual feedback
        button.style.opacity = '1';
        button.dataset.pointerActive = 'true';
    });

    button.addEventListener('pointerup', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (button.dataset.pointerActive === 'true') {
            // Simulate keyboard event
            const fakeEvent = createKeyboardEvent('keyup', key);
            keyUpHandler(fakeEvent);

            button.style.opacity = '';
            button.dataset.pointerActive = 'false';
            activeTouches.delete(e.pointerId);
        }
    });

    button.addEventListener('pointerleave', (e) => {
        if (button.dataset.pointerActive === 'true') {
            // Simulate keyboard event
            const fakeEvent = createKeyboardEvent('keyup', key);
            keyUpHandler(fakeEvent);

            button.style.opacity = '';
            button.dataset.pointerActive = 'false';
            activeTouches.delete(e.pointerId);
        }
    });

    button.addEventListener('pointercancel', (e) => {
        if (button.dataset.pointerActive === 'true') {
            // Simulate keyboard event
            const fakeEvent = createKeyboardEvent('keyup', key);
            keyUpHandler(fakeEvent);

            button.style.opacity = '';
            button.dataset.pointerActive = 'false';
            activeTouches.delete(e.pointerId);
        }
    });

    // Prevent context menu on long press
    button.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
}

/**
 * Create a fake keyboard event for touch input
 * @param {string} type - 'keydown' or 'keyup'
 * @param {string} key - The key value
 * @returns {KeyboardEvent} Synthetic keyboard event
 */
function createKeyboardEvent(type, key) {
    // Create a synthetic keyboard event
    const event = new KeyboardEvent(type, {
        key: key,
        code: getKeyCode(key),
        bubbles: true,
        cancelable: true,
        composed: true
    });

    // Add a marker so we can identify touch-generated events if needed
    Object.defineProperty(event, 'isTouchEvent', {
        value: true,
        writable: false
    });

    return event;
}

/**
 * Get the code property for a key
 * @param {string} key - The key value
 * @returns {string} The key code
 */
function getKeyCode(key) {
    const keyCodeMap = {
        'ArrowUp': 'ArrowUp',
        'ArrowDown': 'ArrowDown',
        'ArrowLeft': 'ArrowLeft',
        'ArrowRight': 'ArrowRight',
        ' ': 'Space',
        'Shift': 'ShiftLeft',
        'e': 'KeyE',
        'f': 'KeyF',
        'r': 'KeyR'
    };
    return keyCodeMap[key] || key;
}

/**
 * Cleanup all active touches (useful when game pauses or ends)
 */
export function releaseAllTouches(keyUpHandler) {
    activeTouches.forEach((touchData, touchId) => {
        const fakeEvent = createKeyboardEvent('keyup', touchData.key);
        keyUpHandler(fakeEvent);
    });
    activeTouches.clear();
    movementTapQueue.length = 0;

    if (movementTapTimer) {
        clearTimeout(movementTapTimer);
        movementTapTimer = null;
    }

    // Clear sprint auto-release timer
    if (sprintAutoReleaseTimer) {
        clearTimeout(sprintAutoReleaseTimer);
        sprintAutoReleaseTimer = null;
    }

    // Release sprint if active
    const sprintBtn = document.querySelector('.action-sprint');
    if (sprintBtn && sprintBtn.dataset.sprintActive === 'true') {
        const fakeEvent = createKeyboardEvent('keyup', 'Shift');
        keyUpHandler(fakeEvent);
        sprintBtn.dataset.sprintActive = 'false';
    }

    setSprintActive(false);
}
