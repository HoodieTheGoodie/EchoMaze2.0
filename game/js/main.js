// main.js - Game loop and initialization

import { initGame as initializeGameState, gameState, updateStaminaCooldown, updateBazookaAmmo, updateBlock, updateGeneratorProgress, updateSkillCheck, updateEnemies, closeGeneratorInterface, updateTeleportPads, updateCollisionShield, triggerEnemiesThaw, getBestTimeMs, startBossTransition } from './state.js';
import { playLose } from './audio.js';
import { LEVEL_COUNT, getUnlockedLevel, setUnlockedLevel, resetProgress, isGodMode, setGodMode, isDevUnlocked, setDevUnlocked, getEndlessDefaults, setEndlessDefaults, getSettings, setSettings, isSkipPreBossEnabled, setSkipPreBossEnabled, isSecretUnlocked, setSecretUnlocked, isBazookaMode, setBazookaMode } from './config.js';
import { render } from './renderer.js';
import { setupInputHandlers, processMovement, setupMobileInput } from './input.js';

// Expose gameState to window for background renderer
window.gameState = gameState;

// Custom bottom alert function
function showBottomAlert(message, duration = 3000) {
    let alertBox = document.getElementById('bottomAlertBox');
    if (!alertBox) {
        alertBox = document.createElement('div');
        alertBox.id = 'bottomAlertBox';
        alertBox.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.95);
            color: #00f6ff;
            padding: 16px 32px;
            border-radius: 12px;
            border: 2px solid #00f6ff;
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            z-index: 9999;
            box-shadow: 0 0 30px rgba(0, 246, 255, 0.6), 0 0 60px rgba(0, 246, 255, 0.3);
            max-width: 80%;
            pointer-events: auto;
            animation: slideUp 0.3s ease-out;
        `;
        document.body.appendChild(alertBox);
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideUp {
                from { bottom: -100px; opacity: 0; }
                to { bottom: 30px; opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    alertBox.textContent = message;
    alertBox.style.display = 'block';
    
    if (alertBox._timeout) clearTimeout(alertBox._timeout);
    alertBox._timeout = setTimeout(() => {
        alertBox.style.display = 'none';
    }, duration);
}

// Apply UI styling based on simplified UI setting
function applyUIStyle() {
    const settings = getSettings();
    const uiPanel = document.getElementById('ui-panel');
    const titleEl = document.getElementById('echo-maze-title');
    const gameContainer = document.getElementById('game-container');
    const instructionsEl = document.getElementById('instructions');
    
    if (!uiPanel || !gameContainer) return;
    
    // Always hide title and instructions during gameplay
    if (titleEl) titleEl.style.display = 'none';
    if (instructionsEl) instructionsEl.style.display = 'none';
    
    if (settings.simplifiedUI) {
        // Simplified UI: Center canvas with panels on left and right
        gameContainer.style.display = 'flex';
        gameContainer.style.flexDirection = 'row';
        gameContainer.style.alignItems = 'center';
        gameContainer.style.justifyContent = 'center';
        gameContainer.style.gap = '30px';
        
        // Style right panel (main ui-panel)
        uiPanel.style.display = 'flex';
        uiPanel.style.flexDirection = 'column';
        uiPanel.style.order = '2';
        uiPanel.style.width = '180px';
        uiPanel.style.padding = '16px';
        uiPanel.style.gap = '14px';
        uiPanel.style.fontSize = '0.95rem';
        uiPanel.style.background = 'rgba(5, 7, 13, 0.9)';
        uiPanel.style.backdropFilter = 'blur(6px)';
        uiPanel.style.border = '2px solid #00f6ff';
        uiPanel.style.borderRadius = '10px';
        uiPanel.style.boxShadow = '0 0 25px rgba(0, 246, 255, 0.45), 0 0 50px rgba(0, 246, 255, 0.2) inset';
        
        // Create left side panel if it doesn't exist
        let leftPanel = document.getElementById('ui-left-panel');
        if (!leftPanel) {
            leftPanel = document.createElement('div');
            leftPanel.id = 'ui-left-panel';
            leftPanel.style.cssText = `
                order: 0;
                width: 180px;
                padding: 16px;
                background: rgba(5, 7, 13, 0.9);
                backdrop-filter: blur(6px);
                border: 2px solid #00f6ff;
                border-radius: 10px;
                box-shadow: 0 0 25px rgba(0, 246, 255, 0.45), 0 0 50px rgba(0, 246, 255, 0.2) inset;
                display: flex;
                flex-direction: column;
                gap: 14px;
                font-size: 0.95rem;
            `;
            
            // Create health display in left panel
            const healthDiv = document.createElement('div');
            healthDiv.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 8px; padding: 8px; background: rgba(0, 246, 255, 0.05); border-radius: 4px;">
                    <span style="font-weight: bold; color: #00f6ff; text-shadow: 0 0 8px rgba(0, 246, 255, 0.6);">Health:</span>
                    <span id="health-simple" style="font-size:1.3em; filter: drop-shadow(0 0 6px rgba(255,100,150,0.8));">❤️❤️❤️</span>
                </div>
            `;
            leftPanel.appendChild(healthDiv);
            
            // Create stamina display in left panel (percentage only)
            const staminaDiv = document.createElement('div');
            staminaDiv.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 8px; padding: 8px; background: rgba(0, 246, 255, 0.05); border-radius: 4px;">
                    <span style="font-weight: bold; color: #00f6ff; text-shadow: 0 0 8px rgba(0, 246, 255, 0.6);">Stamina:</span>
                    <span id="stamina-simple" style="font-weight:bold; text-shadow: 0 0 8px currentColor;">100%</span>
                </div>
            `;
            leftPanel.appendChild(staminaDiv);
            
            // Create shield display in left panel
            const shieldDiv = document.createElement('div');
            shieldDiv.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 8px; padding: 8px; background: rgba(0, 246, 255, 0.05); border-radius: 4px;">
                    <span style="font-weight: bold; color: #00f6ff; text-shadow: 0 0 8px rgba(0, 246, 255, 0.6);">Shield:</span>
                    <span id="shield-simple" style="font-weight:bold; color:#ff77aa; text-shadow: 0 0 8px currentColor;">🛡️ Ready</span>
                </div>
            `;
            leftPanel.appendChild(shieldDiv);
            
            gameContainer.insertBefore(leftPanel, gameContainer.firstChild);
        }
        
        // Make canvas order 1 (middle)
        const canvas = document.getElementById('canvas');
        if (canvas) {
            canvas.style.order = '1';
        }
        
        // Hide health and stamina from right panel in simplified mode
        const sections = uiPanel.querySelectorAll('.ui-section');
        sections.forEach((section, index) => {
            if (index === 0 || index === 1) { // Health and Stamina sections
                section.style.display = 'none';
            }
        });
    } else {
        // Default UI: restore original styling completely
        gameContainer.style.display = 'flex';
        gameContainer.style.flexDirection = 'column';
        gameContainer.style.alignItems = 'center';
        gameContainer.style.justifyContent = '';
        gameContainer.style.gap = '20px';
        
        // Reset ui-panel to original CSS styling (remove inline styles)
        uiPanel.style.display = '';
        uiPanel.style.flexDirection = '';
        uiPanel.style.order = '';
        uiPanel.style.width = '';
        uiPanel.style.padding = '';
        uiPanel.style.gap = '';
        uiPanel.style.fontSize = '';
        uiPanel.style.background = '';
        uiPanel.style.backdropFilter = '';
        uiPanel.style.border = '';
        uiPanel.style.borderRadius = '';
        uiPanel.style.boxShadow = '';
        
        // Remove left panel if it exists
        const leftPanel = document.getElementById('ui-left-panel');
        if (leftPanel) {
            leftPanel.remove();
        }
        
        // Show all sections in main panel
        const sections = uiPanel.querySelectorAll('.ui-section');
        sections.forEach(section => {
            section.style.display = '';
        });
        
        const canvas = document.getElementById('canvas');
        if (canvas) {
            canvas.style.order = '';
        }
    }
}


// Mobile: Lazy load mobile controls (only load if needed)
let mobileControlsModule = null;
async function loadMobileControls() {
    if (!mobileControlsModule) {
        try {
            mobileControlsModule = await import('./mobile-controls.js');
        } catch (err) {
            console.log('Mobile controls not available');
            mobileControlsModule = {
                initMobileControls: () => null,
                showMobileControls: () => {},
                hideMobileControls: () => {}
            };
        }
    }
    return mobileControlsModule;
}

let gameRunning = false;
let lastFrameTime = 0;
let animationFrameId = null;

export function initGame() {
    console.log('Initializing game...');
    initializeGameState();
    console.log('Game state initialized:', gameState.maze ? 'Maze created' : 'No maze!', 'Generators:', gameState.generators.length);
    // Ensure runtime settings are applied to gameState immediately
    try { gameState.settings = { ...getSettings() }; } catch {}
    
    // Apply UI style based on settings
    applyUIStyle();
    
    // Hide overlay on restart
    const overlayEl = document.getElementById('overlay');
    if (overlayEl) overlayEl.style.display = 'none';
    const statusEl = document.getElementById('status');
    if (statusEl) statusEl.style.display = 'none';
    const pauseOverlay = document.getElementById('pauseOverlay');
    if (pauseOverlay) pauseOverlay.style.display = 'none';
    gameState.isPaused = false;
    
    // Clean up boss health bar if it exists
    const bossHpBar = document.getElementById('bossHealthBar');
    if (bossHpBar) bossHpBar.remove();
    
    // Setup input handlers (only once)
    if (!animationFrameId) {
        setupInputHandlers();
        // Wire overlay cancel button (if present)
        const cancelBtn = document.querySelector('#overlay .cancel');
        if (cancelBtn && !cancelBtn._wired) {
            cancelBtn.addEventListener('click', () => {
                if (gameState.isGeneratorUIOpen) {
                    closeGeneratorInterface();
                    document.getElementById('overlay').style.display = 'none';
                }
            });
            cancelBtn._wired = true;
        }

        // Wire mobile skill check button
        const mobileSkillBtn = document.getElementById('mobileSkillCheckBtn');
        if (mobileSkillBtn && !mobileSkillBtn._wired) {
            mobileSkillBtn.addEventListener('click', async () => {
                if (gameState.isGeneratorUIOpen && gameState.skillCheckState) {
                    const { attemptSkillCheck } = await import('./state.js');
                    attemptSkillCheck();
                }
            });
            mobileSkillBtn._wired = true;
        }

        // Wire Pause button and pause overlay controls
        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn && !pauseBtn._wired) {
            pauseBtn.addEventListener('click', () => {
                // Close generator UI if open to avoid conflicts
                if (gameState.isGeneratorUIOpen) {
                    closeGeneratorInterface();
                    document.getElementById('overlay').style.display = 'none';
                }
                gameState.isPaused = true;
                const po = document.getElementById('pauseOverlay');
                if (po) po.style.display = 'flex';
            });
            pauseBtn._wired = true;
        }

        const unpauseBtn = document.getElementById('unpauseBtn');
        if (unpauseBtn && !unpauseBtn._wired) {
            unpauseBtn.addEventListener('click', () => {
                gameState.isPaused = false;
                const po = document.getElementById('pauseOverlay');
                if (po) po.style.display = 'none';
                // Ease enemies back to life over 2s after unpausing
                triggerEnemiesThaw(performance.now());
            });
            unpauseBtn._wired = true;
        }

        const retryBtn = document.getElementById('retryBtn');
        if (retryBtn && !retryBtn._wired) {
            retryBtn.addEventListener('click', () => {
                const po = document.getElementById('pauseOverlay');
                if (po) po.style.display = 'none';
                gameState.isPaused = false;
                // Act like a death/retry: start a fresh level
                initGame();
                // Thaw is set in initGame, but reinforce here for clarity
                triggerEnemiesThaw(performance.now());
            });
            retryBtn._wired = true;
        }

        const returnMenuBtn = document.getElementById('returnMenuBtn');
        if (returnMenuBtn && !returnMenuBtn._wired) {
            returnMenuBtn.addEventListener('click', () => {
                const po = document.getElementById('pauseOverlay');
                if (po) po.style.display = 'none';
                gameState.isPaused = false;
                showMenu();
            });
            returnMenuBtn._wired = true;
        }

        // Lose overlay buttons
        const loseRestart = document.getElementById('loseRestartBtn');
        if (loseRestart && !loseRestart._wired) {
            loseRestart.addEventListener('click', () => {
                const lo = document.getElementById('loseOverlay');
                if (lo) lo.style.display = 'none';
                gameState.isPaused = false;
                initGame();
                triggerEnemiesThaw(performance.now());
            });
            loseRestart._wired = true;
        }
        const loseMenu = document.getElementById('loseMenuBtn');
        if (loseMenu && !loseMenu._wired) {
            loseMenu.addEventListener('click', () => {
                const lo = document.getElementById('loseOverlay');
                if (lo) lo.style.display = 'none';
                gameState.isPaused = false;
                showMenu();
            });
            loseMenu._wired = true;
        }
    }
    
    // Start game loop
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    gameLoop(performance.now());
}

function gameLoop(currentTime) {
    const deltaTime = currentTime - lastFrameTime;
        gameRunning = true;
    
    // Update game state (throttle movement to ~60fps)
    if (deltaTime >= 16) {
        // Collision shield should update regardless of pause state (it self-pauses internally)
        updateCollisionShield(currentTime);
        if (!gameState.isPaused) {
            updateStaminaCooldown(currentTime);
            updateBazookaAmmo(currentTime); // Regenerate bazooka ammo in bazooka mode
            updateBlock(currentTime);
            updateSkillCheck(currentTime);
            // Enemies (paused if generator UI open by state logic)
            updateEnemies(currentTime);
            
            if (gameState.isGeneratorUIOpen) {
                updateGeneratorProgress(currentTime);
            } else {
                processMovement(currentTime);
            }
            // Teleport pads charge/teleport logic
            updateTeleportPads(currentTime);
        }
        lastFrameTime = currentTime;
    }
    
    // Render
    render(currentTime);
    // Post-frame checks (win handling)
    postFrameChecks(currentTime);
    
    // Continue loop
    animationFrameId = requestAnimationFrame(gameLoop);
}

function stopGameLoop() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    gameRunning = false;
}

// --- Main Menu & Levels ---
function buildMenu() {
    const grid = document.getElementById('levelsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const unlocked = getUnlockedLevel();
    for (let i = 1; i <= LEVEL_COUNT; i++) {
        const btn = document.createElement('button');
        btn.className = 'level-btn';
        btn.textContent = `Level ${i}`;
        btn.dataset.level = String(i);
        if (i > unlocked) {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            const lock = document.createElement('span');
            lock.className = 'lock';
            lock.textContent = '🔒';
            btn.appendChild(lock);
        }
        btn.addEventListener('click', () => startLevel(i));
        grid.appendChild(btn);
    }
}

function showMenu() {
    const menu = document.getElementById('mainMenu');
    const gameContainer = document.getElementById('game-container');
    
    // CRITICAL: Reset all game state to prevent carryover bugs
    // Clear boss state completely (prevents text/cutscene carryover)
    gameState.boss = null;
    gameState.bazooka = null;
    gameState.bazookaPickup = null;
    gameState.projectiles = [];
    gameState.enemies = [];
    gameState.statusMessage = '';
    gameState.gameStatus = 'menu';
    gameState.isPaused = true;
    gameState.playerStunned = false;
    gameState.playerStunUntil = 0;
    
    if (menu) menu.style.display = 'flex';
    if (gameContainer) gameContainer.style.display = 'none';
    buildMenu();
    
    // Sync dev panel state
    const devPanel = document.getElementById('devPanel');
    // Stop any running level/game loop to avoid background updates and sounds
    stopGameLoop();
    
    const godChk = document.getElementById('godModeChk');
    const skipPreBossChk = document.getElementById('skipPreBossChk');
    if (isDevUnlocked()) {
        if (devPanel) devPanel.style.display = 'block';
        if (godChk) godChk.checked = isGodMode();
        if (skipPreBossChk) skipPreBossChk.checked = isSkipPreBossEnabled();
    } else if (devPanel) {
        devPanel.style.display = 'none';
    }
    // Ensure Reset/Dev buttons are visible on menu
    const resetBtn = document.getElementById('resetProgressBtn');
    const devBtn = document.getElementById('devToggleBtn');
    if (resetBtn) resetBtn.style.display = 'inline-block';
    if (devBtn) devBtn.style.display = 'inline-block';

    // Mobile: Hide controls when in menu
    loadMobileControls().then(m => m.hideMobileControls());
}

function startLevel(level) {
    gameState.currentLevel = level;
    gameState.mode = 'level';
    // Show game UI, hide menu
    const menu = document.getElementById('mainMenu');
    const gameContainer = document.getElementById('game-container');
    if (menu) menu.style.display = 'none';
    if (gameContainer) gameContainer.style.display = 'flex';

    // Mobile: Show controls when game starts
    loadMobileControls().then(m => m.showMobileControls());

    initGame();
    
    // Apply UI style based on settings
    applyUIStyle();
    
    // Dev convenience: if Level 10 and skip toggle is ON, jump straight to pre-boss transition
    if (level === 10 && isSkipPreBossEnabled()) {
        try { startBossTransition(performance.now()); } catch {}
    }
}

function wireMenuUi() {
    const resetBtn = document.getElementById('resetProgressBtn');
    if (resetBtn && !resetBtn._wired) {
        resetBtn.addEventListener('click', () => {
            resetProgress();
            showMenu();
        });
        resetBtn._wired = true;
    }

    const devBtn = document.getElementById('devToggleBtn');
    const trophyBtn = document.getElementById('trophyBtn');
    const devPanel = document.getElementById('devPanel');
    if (devBtn && !devBtn._wired) {
        devBtn.addEventListener('click', () => {
            if (isDevUnlocked()) {
                if (devPanel) devPanel.style.display = devPanel.style.display === 'none' ? 'block' : 'none';
            } else {
                const pwd = prompt('Enter dev password:');
                if (pwd === '271000skib') {
                    setDevUnlocked(true);
                    if (devPanel) devPanel.style.display = 'block';
                    const godChk = document.getElementById('godModeChk');
                    if (godChk) godChk.checked = isGodMode();
                } else if (pwd === '8G9M15O17J22D10T24Q22D25B19Y26H13F5K24Q15O21Z12L7W15O21Z12L1X13F24Q15O7W24Q10T9M16P22D9M13F22D9M13F15O12L13F9M15O24Q15O12L13F9M18S13F25B1X13F12L9M') {
                    // Secret bazooka mode unlocked
                    setSecretUnlocked(true);
                    showBottomAlert('🚀 Secret Unlocked: Bazooka Mode available in Settings!', 4000);
                }
            }
        });
        devBtn._wired = true;
    }

    const devClose = document.getElementById('devCloseBtn');
    if (devClose && !devClose._wired) {
        devClose.addEventListener('click', () => {
            if (devPanel) devPanel.style.display = 'none';
        });
        devClose._wired = true;
    }

    const godChk = document.getElementById('godModeChk');
    const skipPreBossChk = document.getElementById('skipPreBossChk');
    if (godChk && !godChk._wired) {
        godChk.addEventListener('change', () => {
            setGodMode(godChk.checked);
        });
        godChk._wired = true;
    }
    if (skipPreBossChk && !skipPreBossChk._wired) {
        skipPreBossChk.addEventListener('change', () => {
            setSkipPreBossEnabled(!!skipPreBossChk.checked);
        });
        skipPreBossChk._wired = true;
    }

    const unlockAllBtn = document.getElementById('unlockAllBtn');
    if (unlockAllBtn && !unlockAllBtn._wired) {
        unlockAllBtn.addEventListener('click', () => {
            setUnlockedLevel(LEVEL_COUNT);
            buildMenu();
        });
        unlockAllBtn._wired = true;
    }
    // Endless button
    const endlessBtn = document.querySelector("button[data-level='endless']");
    if (endlessBtn && !endlessBtn._wired) {
        endlessBtn.addEventListener('click', () => {
            showEndlessOverlay();
        });
        endlessBtn._wired = true;
    }

    // Endless overlay controls
    const endlessStart = document.getElementById('endlessStartBtn');
    const endlessCancel = document.getElementById('endlessCancelBtn');
    if (endlessStart && !endlessStart._wired) {
        endlessStart.addEventListener('click', () => startEndlessFromOverlay());
        endlessStart._wired = true;
    }
    if (endlessCancel && !endlessCancel._wired) {
        endlessCancel.addEventListener('click', () => hideEndlessOverlay());
        endlessCancel._wired = true;
    }
    // Trophy (Best Times)
    const scoresOverlay = document.getElementById('scoresOverlay');
    const scoresList = document.getElementById('scoresList');
    const scoresCloseBtn = document.getElementById('scoresCloseBtn');
    if (trophyBtn && !trophyBtn._wired) {
        trophyBtn.addEventListener('click', () => {
            if (!scoresOverlay || !scoresList) return;
            let html = '<div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">';
            for (let i = 1; i <= LEVEL_COUNT; i++) {
                const ms = getBestTimeMs(i);
                const text = ms ? formatMs(ms) : '—';
                html += `<div>Level ${i}</div><div style="text-align:right; color:#ffd166; font-weight:bold;">${text}</div>`;
            }
            html += '</div>';
            scoresList.innerHTML = html;
            scoresOverlay.style.display = 'flex';
        });
        trophyBtn._wired = true;
    }
    if (scoresCloseBtn && !scoresCloseBtn._wired) {
        scoresCloseBtn.addEventListener('click', () => {
            if (scoresOverlay) scoresOverlay.style.display = 'none';
        });
        scoresCloseBtn._wired = true;
    }

    // Settings overlay wiring
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsOverlay = document.getElementById('settingsOverlay');
    const movementAudioChk = document.getElementById('movementAudioChk');
    const autoMovementChk = document.getElementById('autoMovementChk');
    const autoMovementLabel = document.getElementById('autoMovementLabel');
    const simplifiedUIChk = document.getElementById('simplifiedUIChk');
    const bazookaModeChk = document.getElementById('bazookaModeChk');
    const bazookaModeSection = document.getElementById('bazookaModeSection');
    const bazookaModeDesc = document.getElementById('bazookaModeDesc');
    const settingsBackBtn = document.getElementById('settingsBackBtn');
    if (settingsBtn && !settingsBtn._wired) {
        settingsBtn.addEventListener('click', () => {
            const s = getSettings();
            if (movementAudioChk) movementAudioChk.checked = !!s.movementAudio;
            if (autoMovementChk) autoMovementChk.checked = !!s.autoMovement;
            if (autoMovementLabel) autoMovementLabel.textContent = `Auto-Movement: ${s.autoMovement ? 'ON' : 'OFF'}`;
            if (simplifiedUIChk) simplifiedUIChk.checked = !!s.simplifiedUI;
            // Reveal credits button if unlocked (after beating the game)
            const creditsBtn = document.getElementById('viewCreditsBtn');
            if (creditsBtn) creditsBtn.style.display = isSecretUnlocked() ? 'inline-block' : 'none';
            // Reveal bazooka mode if secret unlocked
            const secretButtonContainer = document.getElementById('secretButtonContainer');
            if (isSecretUnlocked()) {
                if (bazookaModeSection) bazookaModeSection.style.display = 'block';
                if (bazookaModeChk) bazookaModeChk.checked = isBazookaMode();
                if (secretButtonContainer) secretButtonContainer.style.display = 'none';
            } else {
                if (bazookaModeSection) bazookaModeSection.style.display = 'none';
                if (secretButtonContainer) secretButtonContainer.style.display = 'flex';
            }
            if (settingsOverlay) settingsOverlay.style.display = 'flex';
        });
        settingsBtn._wired = true;
    }
    if (settingsBackBtn && !settingsBackBtn._wired) {
        settingsBackBtn.addEventListener('click', () => {
            if (settingsOverlay) settingsOverlay.style.display = 'none';
        });
        settingsBackBtn._wired = true;
    }
    if (movementAudioChk && !movementAudioChk._wired) {
        movementAudioChk.addEventListener('change', () => {
            const cur = getSettings();
            const next = { ...cur, movementAudio: !!movementAudioChk.checked };
            setSettings(next);
            gameState.settings = { ...next };
        });
        movementAudioChk._wired = true;
    }
    if (autoMovementChk && !autoMovementChk._wired) {
        autoMovementChk.addEventListener('change', () => {
            const cur = getSettings();
            const next = { ...cur, autoMovement: !!autoMovementChk.checked };
            setSettings(next);
            gameState.settings = { ...next };
            if (autoMovementLabel) autoMovementLabel.textContent = `Auto-Movement: ${next.autoMovement ? 'ON' : 'OFF'}`;
        });
        autoMovementChk._wired = true;
    }
    // Wire simplified UI checkbox
    if (simplifiedUIChk && !simplifiedUIChk._wired) {
        simplifiedUIChk.addEventListener('change', () => {
            const cur = getSettings();
            const next = { ...cur, simplifiedUI: !!simplifiedUIChk.checked };
            setSettings(next);
            gameState.settings = { ...next };
            // Apply UI style immediately only if game is running
            const gameContainer = document.getElementById('game-container');
            if (gameContainer && gameContainer.style.display !== 'none') {
                applyUIStyle();
            }
        });
        simplifiedUIChk._wired = true;
    }
    // Wire bazooka mode checkbox
    if (bazookaModeChk && !bazookaModeChk._wired) {
        bazookaModeChk.addEventListener('change', () => {
            setBazookaMode(!!bazookaModeChk.checked);
        });
        bazookaModeChk._wired = true;
    }
    
    // Wire secret button (3 attempts to unlock bazooka mode)
    const secretBtn = document.getElementById('secretBtn');
    const secretButtonContainer = document.getElementById('secretButtonContainer');
    if (secretBtn && !secretBtn._wired) {
        let attempts = 0;
        const maxAttempts = 3;
        
        secretBtn.addEventListener('click', () => {
            if (isSecretUnlocked()) {
                showBottomAlert('🚀 Bazooka Mode already unlocked!');
                return;
            }
            
            const password = prompt('Enter the secret code:');
            if (password === '271000skib') {
                setSecretUnlocked(true);
                if (bazookaModeSection) bazookaModeSection.style.display = 'block';
                if (bazookaModeChk) bazookaModeChk.checked = isBazookaMode();
                if (secretButtonContainer) secretButtonContainer.style.display = 'none';
                showBottomAlert('🚀 SECRET UNLOCKED: Bazooka Mode is now available!', 4000);
            } else {
                attempts++;
                const remaining = maxAttempts - attempts;
                if (remaining > 0) {
                    showBottomAlert(`❌ Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`, 3000);
                } else {
                    showBottomAlert('🔒 No more attempts! The secret button has disappeared forever...', 4000);
                    if (secretButtonContainer) secretButtonContainer.style.display = 'none';
                }
            }
        });
        secretBtn._wired = true;
    }
    
    // Settings: View Credits button opens the Credits overlay
    const viewCreditsBtn = document.getElementById('viewCreditsBtn');
    if (viewCreditsBtn && !viewCreditsBtn._wired) {
        viewCreditsBtn.addEventListener('click', () => {
            const c = document.getElementById('creditsOverlay');
            if (c) c.style.display = 'block';
        });
        viewCreditsBtn._wired = true;
    }
    // Credits overlay: Main Menu button should always close credits and show the menu
    const creditsMenuBtnGlobal = document.getElementById('creditsMenuBtn');
    if (creditsMenuBtnGlobal && !creditsMenuBtnGlobal._globalWired) {
        creditsMenuBtnGlobal.addEventListener('click', () => {
            const c = document.getElementById('creditsOverlay');
            if (c) c.style.display = 'none';
            showMenu();
        });
        creditsMenuBtnGlobal._globalWired = true;
    }
}

function formatMs(ms) {
    const totalMs = Math.max(0, Math.floor(ms));
    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const millis = totalMs % 1000;
    return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}.${String(millis).padStart(3,'0')}`;
}

function showEndlessOverlay() {
    const ov = document.getElementById('endlessOverlay');
    if (!ov) return;
    // Prefill from stored defaults
    const def = getEndlessDefaults();
    const $ = (id) => document.getElementById(id);
    if ($('endlessChaser')) $('endlessChaser').checked = !!def.chaser;
    if ($('endlessPig')) $('endlessPig').checked = !!def.pig;
    if ($('endlessSeeker')) $('endlessSeeker').checked = !!def.seeker;
    if ($('endlessBatter')) $('endlessBatter').checked = !!def.batter;
    if ($('endlessMortar')) $('endlessMortar').checked = !!def.mortar;
    if ($('endlessDiffNormal')) $('endlessDiffNormal').checked = def.difficulty !== 'super';
    if ($('endlessDiffSuper')) $('endlessDiffSuper').checked = def.difficulty === 'super';
    if ($('endlessGen3')) $('endlessGen3').checked = def.generatorCount !== 5;
    if ($('endlessGen5')) $('endlessGen5').checked = def.generatorCount === 5;
    ov.style.display = 'flex';
}

function hideEndlessOverlay() {
    const ov = document.getElementById('endlessOverlay');
    if (ov) ov.style.display = 'none';
}

function readEndlessOverlayConfig() {
    const $ = (id) => document.getElementById(id);
    return {
        chaser: !!($('endlessChaser') && $('endlessChaser').checked),
        pig: !!($('endlessPig') && $('endlessPig').checked),
        seeker: !!($('endlessSeeker') && $('endlessSeeker').checked),
        batter: !!($('endlessBatter') && $('endlessBatter').checked),
        mortar: !!($('endlessMortar') && $('endlessMortar').checked),
        difficulty: ($('endlessDiffSuper') && $('endlessDiffSuper').checked) ? 'super' : 'normal',
        generatorCount: ($('endlessGen5') && $('endlessGen5').checked) ? 5 : 3
    };
}

function startEndlessFromOverlay() {
    const cfg = readEndlessOverlayConfig();
    setEndlessDefaults(cfg);
    hideEndlessOverlay();
    startEndlessRun(cfg);
}

function startEndlessRun(cfg) {
    // Hide menu, show game, set mode and config
    const menu = document.getElementById('mainMenu');
    const gameContainer = document.getElementById('game-container');
    if (menu) menu.style.display = 'none';
    if (gameContainer) gameContainer.style.display = 'flex';
    gameState.mode = 'endless';
    gameState.endlessConfig = { ...cfg, streak: (gameState.endlessConfig && gameState.endlessConfig.streak) || 0 };

    // Mobile: Show controls when game starts
    loadMobileControls().then(m => m.showMobileControls());

    initGame();
}

// Track win to unlock next level and return to menu
let handledWin = false;
let confettiAnimId = 0;

function launchConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const colors = ['#ff4757', '#ffa502', '#2ed573', '#1e90ff', '#b97cff', '#ffd166'];
    const pieces = Array.from({ length: 120 }, () => ({
        x: Math.random() * W,
        y: -10 - Math.random() * H,
        r: 3 + Math.random() * 4,
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 10,
        vy: 1 + Math.random() * 2.5,
        vx: -1 + Math.random() * 2,
        rot: Math.random() * Math.PI,
        vr: (-0.2 + Math.random() * 0.4),
        c: colors[Math.floor(Math.random() * colors.length)]
    }));
    function step() {
        ctx.clearRect(0, 0, W, H);
        for (const p of pieces) {
            p.x += p.vx; p.y += p.vy; p.rot += p.vr;
            if (p.y > H + 20) {
                p.y = -20; p.x = Math.random() * W;
            }
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.c;
            ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
            ctx.restore();
        }
        confettiAnimId = requestAnimationFrame(step);
    }
    cancelAnimationFrame(confettiAnimId);
    step();
}

function stopConfetti() { cancelAnimationFrame(confettiAnimId); confettiAnimId = 0; }

function showWinOverlay() {
    const curUnlocked = getUnlockedLevel();
    if (gameState.currentLevel >= curUnlocked) {
        setUnlockedLevel(Math.min(LEVEL_COUNT, gameState.currentLevel + 1));
    }
    const win = document.getElementById('winOverlay');
    if (win) win.style.display = 'flex';
    // Disable Next Level at last level
    const nextBtn = document.getElementById('nextLevelBtn');
    if (nextBtn) {
        if (gameState.currentLevel >= LEVEL_COUNT) {
            nextBtn.disabled = true;
            nextBtn.style.opacity = '0.6';
        } else {
            nextBtn.disabled = false;
            nextBtn.style.opacity = '';
        }
    }
    if (nextBtn && !nextBtn._wired) {
        nextBtn.addEventListener('click', () => {
            stopConfetti();
            if (win) win.style.display = 'none';
            startLevel(Math.min(LEVEL_COUNT, gameState.currentLevel + 1));
        });
        nextBtn._wired = true;
    }
    const menuBtn = document.getElementById('winReturnMenuBtn');
    if (menuBtn && !menuBtn._wired) {
        menuBtn.addEventListener('click', () => {
            stopConfetti();
            if (win) win.style.display = 'none';
            showMenu();
        });
        menuBtn._wired = true;
    }
    launchConfetti();

    // Wire credits button for final escape scenario
    const creditsBtn = document.getElementById('creditsBtn');
    if (creditsBtn && !creditsBtn._wired) {
        creditsBtn.addEventListener('click', () => {
            const c = document.getElementById('creditsOverlay');
            if (c) c.style.display = 'block';
        });
        creditsBtn._wired = true;
    }
    const creditsMenuBtn = document.getElementById('creditsMenuBtn');
    if (creditsMenuBtn && !creditsMenuBtn._wired) {
        creditsMenuBtn.addEventListener('click', () => {
            const c = document.getElementById('creditsOverlay');
            if (c) c.style.display = 'none';
            stopConfetti();
            showMenu();
        });
        creditsMenuBtn._wired = true;
    }
    // If this was Level 10 escape (boss defeated), alter messaging
    if (gameState.currentLevel === 10 && gameState.boss && gameState.boss.postEscapeStarted) {
        const winMsg = document.getElementById('winMsg');
        if (winMsg) winMsg.textContent = 'You survived the final collapse!';
        if (creditsBtn) creditsBtn.style.display = 'inline-block';
        // Hide next level button
        const nextBtn2 = document.getElementById('nextLevelBtn');
        if (nextBtn2) { nextBtn2.style.display = 'none'; }
        // Hide main menu here to force Credits first
        const menuBtn2 = document.getElementById('winReturnMenuBtn');
        if (menuBtn2) { menuBtn2.style.display = 'none'; }
    // Unlock secret/credits persistence
    setSecretUnlocked(true);
    }
}

function postFrameChecks(currentTime) {
    if (gameState.mode === 'endless') {
        if (gameState.gameStatus === 'won') {
            // Increment streak and immediately start a fresh run with new seed
            gameState.endlessConfig = gameState.endlessConfig || { streak: 0 };
            gameState.endlessConfig.streak = (gameState.endlessConfig.streak || 0) + 1;
            // Brief message then restart
            gameState.statusMessage = `Escaped! Streak: ${gameState.endlessConfig.streak}`;
            setTimeout(() => {
                if (gameState.mode === 'endless') initGame();
            }, 600);
        } else if (gameState.gameStatus === 'lost') {
            // Reset streak and return to menu after a short delay
            const last = (gameState.endlessConfig && gameState.endlessConfig.streak) || 0;
            gameState.statusMessage = `You died. Streak reset (last: ${last}).`;
            if (gameState.endlessConfig) gameState.endlessConfig.streak = 0;
            setTimeout(() => {
                showMenu();
            }, 1000);
        }
        return;
    }
    // Level mode
    if (gameState.gameStatus === 'won' && !handledWin) {
        handledWin = true;
        showWinOverlay();
    }
    // Show lose overlay once when you die (level mode only)
    if (gameState.gameStatus === 'lost' && !postFrameChecks._handledLose) {
        postFrameChecks._handledLose = true;
        const lo = document.getElementById('loseOverlay');
        const tip = document.getElementById('loseTip');
        if (tip) {
            const cause = gameState.deathCause || 'enemy';
            let msg = 'Tip: Stay aware of enemy behaviors and use your tools.';
            if (cause === 'wall') msg = 'Tip: Don\'t run into walls unless sprinting through with full stamina!';
            else if (cause === 'chaser') msg = 'Tip: Watch for chaser telegraphs, and sidestep or block its jumps.';
            else if (cause === 'seeker') msg = 'Tip: Stay out of the Seeker\'s vision cone—break line of sight behind walls.';
            else if (cause === 'pig_projectile') msg = 'Tip: Reflect pink arcs with your shield—aim the shield toward the incoming arc!';
            else if (cause === 'generator_fail') msg = 'Tip: Nail those skill checks—missing twice blocks the generator and costs a life.';
            tip.textContent = msg;
        }
        if (lo) lo.style.display = 'flex';
        try { playLose(); } catch {}
    }
    if (gameState.gameStatus === 'playing') {
        handledWin = false; // reset after next run starts
        postFrameChecks._handledLose = false;
    }
}

// Start app (robust to being loaded after DOM is ready)
async function startApp() {
    // Signal that modules loaded successfully
    window.__SMG_LOADED__ = true;

    // Mobile: Initialize virtual controls if on touch device
    const mobile = await loadMobileControls();
    const mobileControls = mobile.initMobileControls();
    if (mobileControls) {
        setupMobileInput(mobileControls);
        console.log('Mobile controls ready');
    }

    wireMenuUi();
    showMenu();
}
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', startApp);
} else {
    startApp();
}
