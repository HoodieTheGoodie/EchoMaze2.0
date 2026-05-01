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
                    <span class="action-btn-icon">🛡️</span>
                    <span class="action-btn-label">SHIELD</span>
                </div>
                <div class="action-btn action-sprint" data-key="Shift">
                    <span class="action-btn-icon">🏃</span>
                    <span class="action-btn-label">SPRINT</span>
                </div>
                <div class="action-btn action-interact" data-key="e">
                    <span class="action-btn-icon">⚙️</span>
                    <span class="action-btn-label">REPAIR</span>
                </div>
                <div class="action-btn action-trap" data-key="f">
                    <span class="action-btn-icon">⚠</span>
                    <span class="action-btn-label">TRAP</span>
                </div>
                <div class="action-btn action-reload" data-key="r">
                    <span class="action-btn-icon">↻</span>
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

    try {
        setupMobileBanner();
        setupMobileHud();
    } catch (err) {
        console.warn('Mobile HUD setup skipped:', err);
    }

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

function setupMobileBanner() {
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer || document.getElementById('mobileGameBanner')) return;

    const banner = document.createElement('div');
    banner.id = 'mobileGameBanner';
    banner.setAttribute('aria-label', 'Echo Maze');
    banner.innerHTML = `
        <img src="favicon.png?v=3" alt="" aria-hidden="true">
        <span>ECHO MAZE</span>
    `;

    gameContainer.insertBefore(banner, gameContainer.firstChild);
}

function setupMobileHud() {
    const uiPanel = document.getElementById('ui-panel');
    if (!uiPanel || uiPanel.dataset.mobileHudReady === 'true') return;

    const health = document.getElementById('health');
    const stamina = document.getElementById('stamina');
    const shield = document.getElementById('shieldStatus');
    const generators = document.getElementById('generators');
    const traps = document.getElementById('traps');
    const timer = document.getElementById('timer');
    const pauseBtn = document.getElementById('pauseBtn');

    tagHudSection(health, 'mobile-health-stat', 'Health', '');
    tagHudSection(stamina, 'mobile-stamina-stat', 'Stamina', '🏃');
    tagHudSection(generators, 'mobile-generator-stat', 'Generators', '⚙️');
    tagHudSection(traps, 'mobile-trap-stat', 'Traps', '⚠');
    tagHudSection(timer, 'mobile-time-stat', 'Time', '⏱');

    const healthSection = health ? health.closest('.ui-section') : null;
    const timerSection = timer ? timer.closest('.ui-section') : null;
    if (healthSection && timerSection) {
        healthSection.insertAdjacentElement('afterend', timerSection);
    }

    const staminaSection = stamina ? stamina.closest('.ui-section') : null;
    if (shield && staminaSection) {
        let shieldSection = document.getElementById('mobileShieldSection');
        if (!shieldSection) {
            shieldSection = document.createElement('div');
            shieldSection.id = 'mobileShieldSection';
            shieldSection.className = 'ui-section mobile-shield-stat';
            shieldSection.setAttribute('aria-label', 'Shield');
            shieldSection.innerHTML = '<span class="mobile-stat-icon" aria-hidden="true">🛡️</span><span class="ui-label">Shield:</span>';
            staminaSection.insertAdjacentElement('afterend', shieldSection);
        }
        shieldSection.appendChild(shield);
        sanitizeShieldText(shield);
        observeShieldText(shield);
    }

    ['roomsSection', 'streakSection', 'bazookaAmmoSection'].forEach((id) => {
        const section = document.getElementById(id);
        if (section) section.classList.add('mobile-hidden-stat');
    });

    if (pauseBtn) {
        pauseBtn.setAttribute('aria-label', 'Pause');
        pauseBtn.classList.add('mobile-pause-btn');
        pauseBtn.innerHTML = '<span class="pause-text">Pause</span><span class="pause-icon" aria-hidden="true"><span></span><span></span></span>';
    }

    setupActionChargeStates(stamina, shield);

    uiPanel.dataset.mobileHudReady = 'true';
}

function tagHudSection(valueEl, className, label, icon) {
    const section = valueEl ? valueEl.closest('.ui-section') : null;
    if (!section) return;
    section.classList.add(className);
    section.setAttribute('aria-label', label);

    if (icon && !Array.from(section.children).some((child) => child.classList.contains('mobile-stat-icon'))) {
        const iconEl = document.createElement('span');
        iconEl.className = 'mobile-stat-icon';
        iconEl.setAttribute('aria-hidden', 'true');
        iconEl.textContent = icon;
        section.insertBefore(iconEl, section.firstChild);
    }
}

function sanitizeShieldText(shieldEl) {
    if (!shieldEl) return;
    const clean = shieldEl.textContent.replace(/^🛡️\s*/, '').trim();
    const nextText = clean || 'Ready';
    if (shieldEl.textContent !== nextText) {
        shieldEl.textContent = nextText;
    }
}

function observeShieldText(shieldEl) {
    if (!shieldEl || shieldEl.dataset.mobileShieldObserved === 'true') return;
    shieldEl.dataset.mobileShieldObserved = 'true';

    const observer = new MutationObserver(() => sanitizeShieldText(shieldEl));
    observer.observe(shieldEl, { childList: true, characterData: true, subtree: true });
}

function setupActionChargeStates(staminaEl, shieldEl) {
    const shieldBtn = document.querySelector('.action-shield');
    const sprintBtn = document.querySelector('.action-sprint');

    const update = () => {
        if (shieldBtn && shieldEl) {
            setChargeClass(shieldBtn, /Ready$/i.test(shieldEl.textContent.trim()));
        }

        if (sprintBtn && staminaEl) {
            const staminaValue = parseInt(staminaEl.textContent, 10);
            setChargeClass(sprintBtn, Number.isFinite(staminaValue) && staminaValue >= 100);
        }
    };

    observeText(staminaEl, update, 'mobileStaminaChargeObserved');
    observeText(shieldEl, update, 'mobileShieldChargeObserved');
    update();
}

function setChargeClass(button, isReady) {
    button.classList.toggle('is-ready', isReady);
    button.classList.toggle('is-charging', !isReady);
}

function observeText(el, callback, flagName) {
    if (!el || el.dataset[flagName] === 'true') return;
    el.dataset[flagName] = 'true';

    const observer = new MutationObserver(callback);
    observer.observe(el, { childList: true, characterData: true, subtree: true });
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
    document.body.classList.remove('game-active');

    const controls = document.getElementById('mobile-controls');
    if (controls) {
        controls.style.display = 'none';
    }
}

export function showMobileControls() {
    document.body.classList.add('game-active');

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
