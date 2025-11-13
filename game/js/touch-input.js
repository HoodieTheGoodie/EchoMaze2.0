/**
 * TOUCH INPUT HANDLER
 * Translates touch events to keyboard events for mobile
 * Separate module - doesn't modify core input.js
 */

import { setSprintActive } from './mobile-controls.js';

// Track active touches for each button
const activeTouches = new Map();

// Debounce map to prevent duplicate rapid events on same button
const lastEventTime = new Map();

/**
 * Initialize touch event handlers for mobile controls
 * @param {Object} controls - Control elements from mobile-controls.js
 * @param {Function} keyDownHandler - Existing keydown handler from input.js
 * @param {Function} keyUpHandler - Existing keyup handler from input.js
 */
export function initTouchInput(controls, keyDownHandler, keyUpHandler) {
    if (!controls) return;

    // Setup D-Pad buttons
    setupTouchButton(controls.dpad.up, 'ArrowUp', keyDownHandler, keyUpHandler);
    setupTouchButton(controls.dpad.down, 'ArrowDown', keyDownHandler, keyUpHandler);
    setupTouchButton(controls.dpad.left, 'ArrowLeft', keyDownHandler, keyUpHandler);
    setupTouchButton(controls.dpad.right, 'ArrowRight', keyDownHandler, keyUpHandler);

    // Setup Action buttons
    setupTouchButton(controls.actions.shield, ' ', keyDownHandler, keyUpHandler); // Space
    setupTouchButton(controls.actions.sprint, 'Shift', keyDownHandler, keyUpHandler);
    setupTouchButton(controls.actions.interact, 'e', keyDownHandler, keyUpHandler);
    setupTouchButton(controls.actions.trap, 'f', keyDownHandler, keyUpHandler);

    // Special handling for sprint button visual feedback (using pointer events)
    controls.actions.sprint.addEventListener('pointerdown', () => setSprintActive(true), { passive: false });
    controls.actions.sprint.addEventListener('pointerup', () => setSprintActive(false), { passive: false });
    controls.actions.sprint.addEventListener('pointercancel', () => setSprintActive(false), { passive: false });
    controls.actions.sprint.addEventListener('pointerleave', () => setSprintActive(false), { passive: false });
}

/**
 * Setup touch events for a single button
 * @param {HTMLElement} button - The button element
 * @param {string} key - The keyboard key to simulate
 * @param {Function} keyDownHandler - Handler for key down
 * @param {Function} keyUpHandler - Handler for key up
 */
function setupTouchButton(button, key, keyDownHandler, keyUpHandler) {
    if (!button) return;

    // Ensure button can receive pointer events
    button.style.pointerEvents = 'auto';
    button.style.cursor = 'pointer';
    button.style.touchAction = 'none'; // Prevent default touch behaviors

    // Use pointer events which work for both mouse and touch
    button.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();

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
        'f': 'KeyF'
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
    setSprintActive(false);
}
