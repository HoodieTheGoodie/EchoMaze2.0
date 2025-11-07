/**
 * MOBILE CONTROLS
 * Creates virtual D-pad and action buttons for touch devices
 * Separate module - doesn't modify core game code
 */

export function initMobileControls() {
    // Only create controls if we're on a touch device
    if (!isTouchDevice()) {
        return null;
    }

    // Create controls container
    const controlsHTML = `
        <!-- Mobile Controls Container -->
        <div id="mobile-controls">
            <!-- Virtual D-Pad (Movement) -->
            <div class="mobile-dpad">
                <div class="dpad-center"></div>
                <div class="dpad-btn dpad-up" data-key="ArrowUp">
                    <span>▲</span>
                </div>
                <div class="dpad-btn dpad-down" data-key="ArrowDown">
                    <span>▼</span>
                </div>
                <div class="dpad-btn dpad-left" data-key="ArrowLeft">
                    <span>◀</span>
                </div>
                <div class="dpad-btn dpad-right" data-key="ArrowRight">
                    <span>▶</span>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="mobile-actions">
                <div class="action-btn action-shield" data-key=" ">
                    <span>🛡️</span>
                    <span class="action-btn-label">SHIELD</span>
                </div>
                <div class="action-btn action-sprint" data-key="Shift">
                    <span>⚡</span>
                    <span class="action-btn-label">SPRINT</span>
                </div>
                <div class="action-btn action-interact" data-key="e">
                    <span>🔧</span>
                    <span class="action-btn-label">REPAIR</span>
                </div>
                <div class="action-btn action-trap" data-key="f">
                    <span>⚠️</span>
                    <span class="action-btn-label">TRAP</span>
                </div>
            </div>
        </div>

        <!-- Landscape Warning Overlay -->
        <div id="landscape-warning">
            <div class="rotate-icon">📱</div>
            <h2>Please Rotate Your Device</h2>
            <p>This game is designed for portrait mode</p>
        </div>
    `;

    // Check if controls already exist (prevent duplicates)
    if (!document.getElementById('mobile-controls')) {
        // Insert controls into game container (not body)
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.insertAdjacentHTML('beforeend', controlsHTML);
        } else {
            // Fallback if game-container doesn't exist
            document.body.insertAdjacentHTML('beforeend', controlsHTML);
        }
    }

    // Add game-active class when game starts (for CSS to show controls)
    document.body.classList.add('game-active');

    // Return control elements for event binding
    return {
        dpad: {
            up: document.querySelector('.dpad-up'),
            down: document.querySelector('.dpad-down'),
            left: document.querySelector('.dpad-left'),
            right: document.querySelector('.dpad-right')
        },
        actions: {
            shield: document.querySelector('.action-shield'),
            sprint: document.querySelector('.action-sprint'),
            interact: document.querySelector('.action-interact'),
            trap: document.querySelector('.action-trap')
        },
        container: document.getElementById('mobile-controls')
    };
}

/**
 * Detect if device supports touch
 */
export function isTouchDevice() {
    return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
    );
}

/**
 * Hide mobile controls (when in menu, for example)
 */
export function hideMobileControls() {
    const controls = document.getElementById('mobile-controls');
    if (controls) {
        controls.style.display = 'none';
    }
}

/**
 * Show mobile controls (when game is active)
 */
export function showMobileControls() {
    const controls = document.getElementById('mobile-controls');
    if (controls && isTouchDevice()) {
        controls.style.display = 'block';
    }
}

/**
 * Update sprint button visual state (for hold indication)
 */
export function setSprintActive(isActive) {
    const sprintBtn = document.querySelector('.action-sprint');
    if (sprintBtn) {
        if (isActive) {
            sprintBtn.classList.add('holding');
        } else {
            sprintBtn.classList.remove('holding');
        }
    }
}

/**
 * Show mobile skill check button during generator repair
 */
export function showMobileSkillCheckButton(show) {
    const btn = document.getElementById('mobileSkillCheckBtn');
    if (btn) {
        btn.style.display = show ? 'block' : 'none';
    }
}
