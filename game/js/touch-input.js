/**
 * TOUCH INPUT HANDLER
 * Translates touch events to keyboard events for mobile
 * Separate module - doesn't modify core input.js
 */

import { setSprintActive } from './mobile-controls.js';

// Track active touches for each button
const activeTouches = new Map();

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

    // Special handling for sprint button visual feedback
    controls.actions.sprint.addEventListener('touchstart', () => setSprintActive(true), { passive: false });
    controls.actions.sprint.addEventListener('touchend', () => setSprintActive(false), { passive: false });
    controls.actions.sprint.addEventListener('touchcancel', () => setSprintActive(false), { passive: false });
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

    // Touch start - simulate key down
    button.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();

        console.log('[TOUCH] Button touched:', key);

        // Track this touch
        const touch = e.changedTouches[0];
        activeTouches.set(touch.identifier, { button, key });

        // Simulate keyboard event
        const fakeEvent = createKeyboardEvent('keydown', key);
        console.log('[TOUCH] Sending keydown:', key, fakeEvent);
        keyDownHandler(fakeEvent);

        // Visual feedback
        button.style.opacity = '1';
    }, { passive: false });

    // Touch end - simulate key up
    button.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const touch = e.changedTouches[0];
        const touchData = activeTouches.get(touch.identifier);

        if (touchData && touchData.button === button) {
            // Simulate keyboard event
            const fakeEvent = createKeyboardEvent('keyup', key);
            keyUpHandler(fakeEvent);

            // Remove from active touches
            activeTouches.delete(touch.identifier);
        }

        // Visual feedback
        button.style.opacity = '';
    }, { passive: false });

    // Touch cancel - treat like touch end
    button.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const touch = e.changedTouches[0];
        const touchData = activeTouches.get(touch.identifier);

        if (touchData && touchData.button === button) {
            // Simulate keyboard event
            const fakeEvent = createKeyboardEvent('keyup', key);
            keyUpHandler(fakeEvent);

            // Remove from active touches
            activeTouches.delete(touch.identifier);
        }

        // Visual feedback
        button.style.opacity = '';
    }, { passive: false });

    // Prevent context menu on long press
    button.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    // Touch move - detect if finger moved off button
    button.addEventListener('touchmove', (e) => {
        e.preventDefault();

        const touch = e.changedTouches[0];
        const touchData = activeTouches.get(touch.identifier);

        if (!touchData || touchData.button !== button) return;

        // Check if touch is still over the button
        const rect = button.getBoundingClientRect();
        const isOver = (
            touch.clientX >= rect.left &&
            touch.clientX <= rect.right &&
            touch.clientY >= rect.top &&
            touch.clientY <= rect.bottom
        );

        // If finger moved off button, release the key
        if (!isOver) {
            const fakeEvent = createKeyboardEvent('keyup', key);
            keyUpHandler(fakeEvent);
            activeTouches.delete(touch.identifier);
            button.style.opacity = '';
        }
    }, { passive: false });
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
