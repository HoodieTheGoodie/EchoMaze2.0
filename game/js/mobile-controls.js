/**
 * MOBILE CONTROLS
 * Creates virtual movement and action buttons for touch devices.
 * This stays separate from the desktop keyboard/mouse path.
 */

export function initMobileControls() {
    if (!isTouchDevice()) {
        return null;
    }

    const controlsHTML = `
        <div id="mobile-controls">
            <div class="mobile-dpad" aria-label="Movement controls">
                <div class="dpad-center">MOVE</div>
                <div class="dpad-btn dpad-up" data-key="ArrowUp"><span>^</span></div>
                <div class="dpad-btn dpad-down" data-key="ArrowDown"><span>v</span></div>
                <div class="dpad-btn dpad-left" data-key="ArrowLeft"><span>&lt;</span></div>
                <div class="dpad-btn dpad-right" data-key="ArrowRight"><span>&gt;</span></div>
            </div>

            <div class="mobile-actions" aria-label="Action controls">
                <div class="action-btn action-shield" data-key=" ">
                    <span>SH</span>
                    <span class="action-btn-label">SHIELD</span>
                </div>
                <div class="action-btn action-sprint" data-key="Shift">
                    <span>SP</span>
                    <span class="action-btn-label">SPRINT</span>
                </div>
                <div class="action-btn action-interact" data-key="e">
                    <span>E</span>
                    <span class="action-btn-label">REPAIR</span>
                </div>
                <div class="action-btn action-trap" data-key="f">
                    <span>F</span>
                    <span class="action-btn-label">TRAP</span>
                </div>
                <div class="action-btn action-reload" data-key="r">
                    <span>R</span>
                    <span class="action-btn-label">RELOAD</span>
                </div>
            </div>
        </div>

        <div id="landscape-warning">
            <div class="rotate-icon">[]</div>
            <h2>Please Rotate Your Device</h2>
            <p>This game is designed for portrait mode</p>
        </div>
    `;

    if (!document.getElementById('mobile-controls')) {
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.insertAdjacentHTML('beforeend', controlsHTML);
        } else {
            document.body.insertAdjacentHTML('beforeend', controlsHTML);
        }
    }

    document.body.classList.add('game-active');

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
            trap: document.querySelector('.action-trap'),
            reload: document.querySelector('.action-reload')
        },
        container: document.getElementById('mobile-controls')
    };
}

export function isTouchDevice() {
    const hasTouch = (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
    );

    const isMobileScreen = window.innerWidth <= 768;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    return hasTouch && (isMobileScreen || isMobileUA);
}

export function isMobile() {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function hideMobileControls() {
    const controls = document.getElementById('mobile-controls');
    if (controls) {
        controls.style.display = 'none';
    }
}

export function showMobileControls() {
    const controls = document.getElementById('mobile-controls');
    if (controls && isTouchDevice()) {
        controls.style.display = '';
    }
}

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

export function showMobileSkillCheckButton(show) {
    const btn = document.getElementById('mobileSkillCheckBtn');
    if (btn) {
        btn.style.display = show ? 'block' : 'none';
    }
}

export function setReloadButtonVisible(visible) {
    const btn = document.querySelector('.action-reload');
    if (btn) {
        btn.style.display = visible ? 'flex' : 'none';
    }
}
