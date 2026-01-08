// main.js - Game loop and initialization
// Game belongs to Hoodie and Scott Efiel, no one else.

import { initGame as initializeGameState, gameState, updateStaminaCooldown, updateBazookaAmmo, updateBlock, updateGeneratorProgress, updateSkillCheck, updateEnemies, closeGeneratorInterface, updateTeleportPads, updateCollisionShield, triggerEnemiesThaw, getBestTimeMs, startBossTransition, exitTerminalRoom, updateLevel11EndingDialog } from './state.js';
import { completeGenerator } from './state.js';
import { playLose, playExplosion } from './audio.js';
import { LEVEL_COUNT, getUnlockedLevel, setUnlockedLevel, resetProgress, resetLevelsOnly, getEndlessDefaults, setEndlessDefaults, getSettings, setSettings, isSecretUnlocked, setSecretUnlocked, isBazookaMode, isBazookaModeUnlocked, setBazookaMode, getLevelColor, isLevel11Unlocked, setLevel11Unlocked, getUnlockedTerminals, unlockTerminal, isTerminalUnlocked, hasTerminalAccess, unlockTerminalAccess } from './config.js';
import { render } from './renderer.js';
import { setupInputHandlers, processMovement, setupMobileInput } from './input.js';
import { loadSprites } from './sprites.js';
import { initAchievements, checkAchievements, resetAchievements } from './achievements.js';
import { initSkins, resetSkins } from './skins.js';
import { initNotifications } from './ui-notifications.js';
import { initAchievementsSkinsUI } from './ui-panels.js';
import { updateLevel11, initLevel11 } from './level11.js';
import { loadEndlessProgress, saveEndlessProgress, getEndlessProgression, startEndlessRun as startProgressionRun, completeEndlessRoom, endEndlessRun, purchaseUpgrade, resetUpgrades, hasAbility, applyPermanentUpgrades } from './endless-progression.js';
import { generateMaze, GENERATOR_COUNT } from './maze.js';

// Make endless functions available globally for endless-ui.js
window.loadEndlessProgression = loadEndlessProgress;
window.saveEndlessProgression = saveEndlessProgress;
window.saveEndlessProgress = saveEndlessProgress; // legacy alias for dev tools
window.getEndlessProgression = getEndlessProgression;
window.startProgressionRun = startProgressionRun;
window.completeEndlessRoom = completeEndlessRoom;
window.endEndlessRun = endEndlessRun;
window.purchaseUpgrade = purchaseUpgrade;
window.resetUpgrades = resetUpgrades;
window.hasAbility = hasAbility;
window.applyPermanentUpgrades = applyPermanentUpgrades;

// Terminal progression/puzzle definitions for glitch-wall access codes
const TERMINAL_UNLOCK_LEVELS = [1, 3, 5, 8];
const terminalPuzzles = [
    {
        id: 1,
        unlockLevel: 1,
        title: 'Terminal 1 — Broken Binary',
        prompt: 'Binary stream captured from the walls: 01000111 01001100 01001001 01010100 01000011 01001000. Decode to ASCII and enter the code.',
        hint: '8-bit ASCII → uppercase letters.',
        answer: 'glitch',
        reward: 'Password #1 = GLITCH',
        how: 'Each 8-bit group is an ASCII character; together they spell GLITCH.'
    },
    {
        id: 2,
        unlockLevel: 3,
        title: 'Terminal 2 — Encoded Pulse',
        prompt: 'Data fragment: VmlydXM=. Decode it, then enter the resulting code.',
        hint: 'Looks like Base64. Lowercase letters.',
        answer: 'virus',
        reward: 'Password #2 = VIRUS',
        how: 'Base64 decode the fragment to reveal VIRUS.'
    },
    {
        id: 3,
        unlockLevel: 5,
        title: 'Terminal 3 — Shifted Key',
        prompt: 'Ciphertext on the monitor: GSCAHG. Undo the shift to recover the code.',
        hint: 'Caesar shift backward by 2 letters. Lowercase output.',
        answer: 'escape',
        reward: 'Password #3 = ESCAPE',
        how: 'Shift each letter two steps backward (G→E, S→Q... wait, try ROT24). The result is ESCAPE.'
    },
    {
        id: 4,
        unlockLevel: 8,
        title: 'Terminal 4 — Hex Dump',
        prompt: 'Wall core outputs: 65 63 68 6F 6D 61 7A 65. Translate the hex to text and enter it. ⚠️ SAVE THIS CODE — it may be useful later...',
        hint: 'Hex bytes → ASCII. Lowercase letters. You know this one.',
        answer: 'echomaze',
        reward: 'Password #4 = ECHOMAZE',
        how: 'Each hex pair is an ASCII character; combined they read ECHOMAZE.'
    }
];

// Expose gameState to window for background renderer
window.gameState = gameState;

// Custom bottom alert function
function showBottomAlert(message, duration = 3000) {
    // Get current level color for dynamic theming
    const levelColor = getLevelColor(gameState.currentLevel || 1);
    const borderColor = levelColor.css;
    const glowColor = levelColor.rgba(0.6);
    const glowColor2 = levelColor.rgba(0.3);
    
    let alertBox = document.getElementById('bottomAlertBox');
    if (!alertBox) {
        alertBox = document.createElement('div');
        alertBox.id = 'bottomAlertBox';
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
    
    // Update colors dynamically
    alertBox.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.95);
        color: ${borderColor};
        padding: 16px 32px;
        border-radius: 12px;
        border: 2px solid ${borderColor};
        font-size: 16px;
        font-weight: bold;
        text-align: center;
        z-index: 9999;
        box-shadow: 0 0 30px ${glowColor}, 0 0 60px ${glowColor2};
        max-width: 80%;
        pointer-events: auto;
        animation: slideUp 0.3s ease-out;
    `;
    
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
    const staminaSection = document.getElementById('stamina') ? document.getElementById('stamina').parentElement : null;
    
    if (!uiPanel || !gameContainer) return;
    
    // Always hide title and instructions during gameplay
    if (titleEl) titleEl.style.display = 'none';
    if (instructionsEl) instructionsEl.style.display = 'none';
    
    // Get current level color for dynamic UI theming
    const levelColor = getLevelColor(gameState.currentLevel || 1);
    const borderColor = levelColor.css;
    const glowColor = levelColor.rgba(0.45);
    const insetGlow = levelColor.rgba(0.2);
    const accentColor = levelColor.rgba(0.05);
    const textGlow = levelColor.rgba(0.6);
    
    if (settings.simplifiedUI) {
        // Simplified UI: Center canvas with panels on left and right
        gameContainer.style.display = 'flex';
        gameContainer.style.flexDirection = 'row';
        gameContainer.style.alignItems = 'center';
        gameContainer.style.justifyContent = 'center';
        gameContainer.style.gap = '30px';
        
        // Style right panel (main ui-panel) with level-based colors
        uiPanel.style.display = 'flex';
        uiPanel.style.flexDirection = 'column';
        uiPanel.style.order = '2';
        uiPanel.style.width = '180px';
        uiPanel.style.padding = '16px';
        uiPanel.style.gap = '14px';
        uiPanel.style.fontSize = '0.95rem';
        uiPanel.style.background = 'rgba(5, 7, 13, 0.9)';
        uiPanel.style.backdropFilter = 'blur(6px)';
        uiPanel.style.border = `2px solid ${borderColor}`;
        uiPanel.style.borderRadius = '10px';
        uiPanel.style.boxShadow = `0 0 25px ${glowColor}, 0 0 50px ${insetGlow} inset`;
        
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
                border: 2px solid ${borderColor};
                border-radius: 10px;
                box-shadow: 0 0 25px ${glowColor}, 0 0 50px ${insetGlow} inset;
                display: flex;
                flex-direction: column;
                gap: 14px;
                font-size: 0.95rem;
            `;
            
            // Create health display in left panel
            const healthDiv = document.createElement('div');
            healthDiv.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 8px; padding: 8px; background: ${accentColor}; border-radius: 4px;">
                    <span style="font-weight: bold; color: ${borderColor}; text-shadow: 0 0 8px ${textGlow};">Health:</span>
                    <span id="health-simple" style="font-size:1.3em; filter: drop-shadow(0 0 6px rgba(255,100,150,0.8));">❤️❤️❤️</span>
                </div>
            `;
            leftPanel.appendChild(healthDiv);
            
            // Create stamina display in left panel (percentage only)
            const staminaDiv = document.createElement('div');
            staminaDiv.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 8px; padding: 8px; background: ${accentColor}; border-radius: 4px;">
                    <span style="font-weight: bold; color: ${borderColor}; text-shadow: 0 0 8px ${textGlow};">Stamina:</span>
                    <span id="stamina-simple" style="font-weight:bold; text-shadow: 0 0 8px currentColor;">100%</span>
                </div>
            `;
            leftPanel.appendChild(staminaDiv);
            
            // Create shield display in left panel
            const shieldDiv = document.createElement('div');
            shieldDiv.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 8px; padding: 8px; background: ${accentColor}; border-radius: 4px;">
                    <span style="font-weight: bold; color: ${borderColor}; text-shadow: 0 0 8px ${textGlow};">Shield:</span>
                    <span id="shield-simple" style="font-weight:bold; color:#ff77aa; text-shadow: 0 0 8px currentColor;">🛡️ Ready</span>
                </div>
            `;
            leftPanel.appendChild(shieldDiv);
            
            gameContainer.insertBefore(leftPanel, gameContainer.firstChild);
        } else {
            // Update existing left panel colors
            leftPanel.style.border = `2px solid ${borderColor}`;
            leftPanel.style.boxShadow = `0 0 25px ${glowColor}, 0 0 50px ${insetGlow} inset`;
            
            // Update section backgrounds and text colors
            const sections = leftPanel.querySelectorAll('div > div');
            sections.forEach(section => {
                section.style.background = accentColor;
                const label = section.querySelector('span:first-child');
                if (label) {
                    label.style.color = borderColor;
                    label.style.textShadow = `0 0 8px ${textGlow}`;
                }
            });
        }
        
        // Make canvas order 1 (middle)
        const canvas = document.getElementById('canvas');
        if (canvas) {
            canvas.style.order = '1';
        }

        // Hide redundant stamina/shield block on the right when simplified UI is active
        if (staminaSection) staminaSection.style.display = 'none';
    } else {
        // Default UI: restore original styling
        gameContainer.style.display = 'flex';
        gameContainer.style.flexDirection = 'column';
        gameContainer.style.alignItems = 'center';
        gameContainer.style.justifyContent = '';
        gameContainer.style.gap = '20px';
        
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

        // Restore stamina/shield section visibility
        if (staminaSection) staminaSection.style.display = '';
        
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

// --- Terminal overlay helpers ---
let activeTerminalId = null;
let terminalOverlayContext = { lockedToSingle: false, fromRoom: false };

function normalizeAnswer(ans) {
    return (ans || '').trim().toLowerCase();
}

function getTerminalById(id) {
    return terminalPuzzles.find(t => t.id === id) || null;
}

function isTerminalAccessible(terminal) {
    if (terminalOverlayContext.lockedToSingle) return true;
    const unlocked = getUnlockedLevel();
    return unlocked >= terminal.unlockLevel;
}

function isTerminalSolved(id) {
    return getUnlockedTerminals().includes(id);
}

function renderTerminalList(targetId = null) {
    const list = document.getElementById('terminalList');
    const pills = document.getElementById('terminalPills');
    const solved = getUnlockedTerminals();
    const unlockedLevel = getUnlockedLevel();
    if (!list || !pills) return;
    list.innerHTML = '';
    pills.innerHTML = '';

    const entries = terminalOverlayContext.lockedToSingle && targetId ? terminalPuzzles.filter(t => t.id === targetId) : terminalPuzzles;

    entries.forEach(term => {
        const accessible = unlockedLevel >= term.unlockLevel;
        const solvedState = solved.includes(term.id);
        const btn = document.createElement('button');
        btn.className = 'terminal-btn';
        btn.textContent = term.title;
        const enabled = terminalOverlayContext.lockedToSingle ? term.id === targetId : accessible;
        btn.disabled = !enabled;
        btn.style.opacity = enabled ? '1' : '0.4';
        if (enabled) {
            btn.addEventListener('click', () => setActiveTerminal(term.id));
        } else if (!terminalOverlayContext.lockedToSingle) {
            btn.title = `Unlocks after Level ${term.unlockLevel}`;
        }
        if (term.id === targetId) btn.classList.add('terminal-btn-active');
        list.appendChild(btn);

        const pill = document.createElement('div');
        pill.className = 'terminal-pill';
        pill.textContent = `P${term.id}`;
        pill.dataset.state = solvedState ? 'solved' : (accessible ? 'open' : 'locked');
        pills.appendChild(pill);
    });

    // Hide the sidebar when locked to a single terminal for in-level use
    const sidebar = list.parentElement;
    if (sidebar && sidebar.style) {
        sidebar.style.display = terminalOverlayContext.lockedToSingle ? 'none' : 'block';
    }
}

function setActiveTerminal(id) {
    const terminal = getTerminalById(id);
    const title = document.getElementById('terminalTitle');
    const prompt = document.getElementById('terminalPrompt');
    const hint = document.getElementById('terminalHint');
    const answerInput = document.getElementById('terminalAnswer');
    const submitBtn = document.getElementById('terminalSubmit');
    const status = document.getElementById('terminalStatus');
    if (!terminal || !title || !prompt || !hint || !answerInput || !submitBtn || !status) return;

    activeTerminalId = id;
    const accessible = isTerminalAccessible(terminal);
    const solved = isTerminalSolved(id);
    const needsAccess = terminal.id > 1 && !hasTerminalAccess(terminal.id);

    title.textContent = terminal.title;
    prompt.textContent = needsAccess ? 'Access required. Enter the previous password to unlock this terminal.' : terminal.prompt;
    hint.textContent = needsAccess ? `Lock: Password from Terminal ${terminal.id - 1}.` : `Hint: ${terminal.hint}`;
    status.textContent = solved ? `${terminal.reward}. ${terminal.how}` : (needsAccess ? 'Locked — enter previous password to proceed.' : '');
    status.style.color = solved ? '#61dafb' : (needsAccess ? '#ffcc66' : '#ffd166');

    answerInput.value = '';
    answerInput.disabled = !accessible;
    submitBtn.disabled = !accessible;
    submitBtn.textContent = solved ? 'Solved' : (needsAccess ? 'Unlock' : 'Submit');
    submitBtn.style.opacity = solved ? '0.7' : '1';

    renderTerminalList(id);
}

function checkTerminalAnswer() {
    const answerInput = document.getElementById('terminalAnswer');
    if (!answerInput || activeTerminalId === null) return;
    const terminal = getTerminalById(activeTerminalId);
    if (!terminal) return;
    if (!isTerminalAccessible(terminal)) return;

    const guess = normalizeAnswer(answerInput.value);
    const expected = normalizeAnswer(terminal.answer);
    const status = document.getElementById('terminalStatus');
    const needsAccess = terminal.id > 1 && !hasTerminalAccess(terminal.id);

    if (needsAccess) {
        const prev = getTerminalById(terminal.id - 1);
        const expectedGate = normalizeAnswer(prev?.answer || '');
        if (guess === expectedGate) {
            unlockTerminalAccess(terminal.id);
            if (status) {
                status.textContent = 'Access granted. Terminal unlocked.';
                status.style.color = '#61dafb';
            }
            showBottomAlert(`🔓 Terminal ${terminal.id} unlocked.`);
            setActiveTerminal(terminal.id);
        } else if (status) {
            status.textContent = 'Wrong password. Use the previous terminal code.';
            status.style.color = '#ff6666';
        }
        return;
    }

    if (guess === expected) {
        unlockTerminal(terminal.id);
        unlockTerminalAccess(terminal.id + 1);
        if (status) {
            status.textContent = `${terminal.reward}. ${terminal.how}`;
            status.style.color = '#61dafb';
        }
        showBottomAlert(`✅ Terminal ${terminal.id} solved: ${terminal.reward}`);
        if (terminal.id === 4) {
            if (status) {
                status.textContent = 'Access code accepted. You might need this later...';
                status.style.color = '#ffd166';
            }
            showBottomAlert('Code stored. You might need it later...', 4500);
        }
        setActiveTerminal(terminal.id);
    } else {
        if (status) {
            status.textContent = 'Incorrect. Try again.';
            status.style.color = '#ff6666';
        }
    }
}

function showTerminalOverlay(targetId = null, options = {}) {
    terminalOverlayContext = { lockedToSingle: !!options.lockedToSingle, fromRoom: !!options.fromRoom };
    const ov = document.getElementById('terminalOverlay');
    if (!ov) return;
    ov.style.display = 'flex';
    renderTerminalList(targetId || activeTerminalId);
    const unlocked = getUnlockedLevel();
    const firstAvailable = targetId ? getTerminalById(targetId) : (terminalPuzzles.find(t => unlocked >= t.unlockLevel) || terminalPuzzles[0]);
    if (firstAvailable) {
        setActiveTerminal(firstAvailable.id);
    }
}

function hideTerminalOverlay() {
    const ov = document.getElementById('terminalOverlay');
    if (ov) ov.style.display = 'none';
}

// Expose for in-level access without menu buttons
if (typeof window !== 'undefined') {
    window.showTerminalOverlay = showTerminalOverlay;
    window.hideTerminalOverlay = hideTerminalOverlay;
    window.setActiveTerminal = setActiveTerminal;
    window.checkTerminalAnswer = checkTerminalAnswer;
}

// Update canvas border color to match level theme
function updateCanvasBorderColor() {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    
    // Use purple for endless progression mode, otherwise use level color
    let levelColor;
    if (gameState.mode === 'endless-progression') {
        // Purple color for endless mode
        levelColor = {
            css: '#9945ff',
            rgba: (alpha) => `rgba(153, 69, 255, ${alpha})`
        };
    } else {
        levelColor = getLevelColor(gameState.currentLevel || 1);
    }
    
    const borderColor = levelColor.css;
    const glowColor = levelColor.rgba(0.4);
    const glowColor2 = levelColor.rgba(0.2);
    const glowColor3 = levelColor.rgba(0.6);
    const glowColor4 = levelColor.rgba(0.3);
    
    canvas.style.borderColor = borderColor;
    // Only glow on outer edge, not inset
    canvas.style.boxShadow = `0 0 20px ${glowColor}, 0 0 40px ${glowColor2}`;
    
    // Update hover effect by adding a style element
    let styleEl = document.getElementById('canvas-hover-style');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'canvas-hover-style';
        document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
        #canvas:hover {
            box-shadow: 0 0 30px ${glowColor3}, 0 0 50px ${glowColor4} !important;
        }
    `;
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
    
    // Apply master volume setting on game init
    try {
        import('./audio.js').then(audio => {
            if (audio.setMasterVolume && gameState.settings && typeof gameState.settings.masterVolume === 'number') {
                audio.setMasterVolume(gameState.settings.masterVolume);
            }
        }).catch(() => {});
    } catch {}
    
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
            // Track when generator UI opens to prevent immediate skill check
            let wasOpen = false;
            setInterval(() => {
                const isOpen = gameState.isGeneratorUIOpen;
                if (isOpen && !wasOpen) {
                    // UI just opened - disable button completely
                    mobileSkillBtn.style.pointerEvents = 'none';
                    mobileSkillBtn.style.opacity = '0.5';

                    // Re-enable after 150ms
                    setTimeout(() => {
                        mobileSkillBtn.style.pointerEvents = 'auto';
                        mobileSkillBtn.style.opacity = '1';
                    }, 150);
                }
                wasOpen = isOpen;
            }, 16);

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
                gameState.customLevelActive = false;
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
                gameState.customLevelActive = false;
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

    // Check for crash explosion sound trigger from renderer
    if (gameState.pigCrashAnimation?.playExplosion) {
        try { playExplosion(); } catch {}
        gameState.pigCrashAnimation.playExplosion = false;
    }

    // Update game state (throttle movement to ~60fps)
    if (deltaTime >= 16) {
        // Collision shield should update regardless of pause state (it self-pauses internally)
        updateCollisionShield(currentTime);
        // Level 11 update - runs even when paused to handle flashlight and enemies
        if (gameState.isLevel11) {
            updateLevel11(currentTime);
            updateLevel11EndingDialog(currentTime);
        }
        if (!gameState.isPaused) {
            updateStaminaCooldown(currentTime);
            updateBazookaAmmo(currentTime); // Regenerate bazooka ammo in bazooka mode
            updateBlock(currentTime);
            updateSkillCheck(currentTime);
            // Enemies (paused if generator UI open by state logic)
            updateEnemies(currentTime);

            if (gameState.isGeneratorUIOpen) {
                // Dev: Instant generator completion
                const instaGen = typeof window !== 'undefined' && window.__instaGenEnabled;
                if (instaGen && gameState.activeGeneratorIndex !== null) {
                    completeGenerator();
                } else {
                    updateGeneratorProgress(currentTime);
                }
            } else {
                processMovement(currentTime);
            }
            // Teleport pads charge/teleport logic
            updateTeleportPads(currentTime);
        }

        // Update mobile reload button visibility (only check every frame when state changes)
        updateMobileReloadButton();

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

// Track previous state to avoid unnecessary updates
let lastReloadButtonState = false;

function updateMobileReloadButton() {
    // Check if bazooka is available (either in bazooka mode or during boss fight)
    const hasBazooka = (isBazookaMode() && gameState.bazooka?.has) || (gameState.boss?.active || gameState.boss?.prepRoom);

    // Only update if state changed
    if (hasBazooka !== lastReloadButtonState) {
        lastReloadButtonState = hasBazooka;
        import('./mobile-controls.js').then(mod => {
            if (mod.setReloadButtonVisible) {
                mod.setReloadButtonVisible(hasBazooka);
            }
        }).catch(() => {});
    }
}

// --- Main Menu & Levels ---
function buildMenu() {
    const grid = document.getElementById('levelsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const unlocked = getUnlockedLevel();
    for (let i = 1; i <= LEVEL_COUNT; i++) {
        // Level 11 should not appear in the main menu grid (access via Settings only)
        if (i === 11) continue;
        const btn = document.createElement('button');
        btn.className = 'level-btn';
        btn.textContent = `Level ${i}`;
        btn.dataset.level = String(i);
        const lockedByProgress = i > unlocked;
        const lockedBySecret = (i === 11 && !isLevel11Unlocked());
        if (lockedByProgress || lockedBySecret) {
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
    
    // Update endless mode button visibility and text
    const endlessBtn = document.querySelector("button[data-level='endless']");
    if (endlessBtn) {
        if (unlocked >= 2) {
            // Unlocked at level 2 - show endless mode
            endlessBtn.style.display = 'block';
            endlessBtn.disabled = false;
            endlessBtn.style.opacity = '1';
            endlessBtn.innerHTML = '∞ Endless Mode';
            // Center it by adding grid-column span
            endlessBtn.style.gridColumn = 'span 2';
            endlessBtn.style.justifySelf = 'center';
        } else {
            // Not unlocked yet
            endlessBtn.style.display = 'block';
            endlessBtn.disabled = true;
            endlessBtn.style.opacity = '0.5';
            endlessBtn.style.cursor = 'not-allowed';
            endlessBtn.innerHTML = '∞ Endless Mode<br><span style="font-size:0.7em;color:#ff6666;">Reach Level 2 to unlock</span>';
            endlessBtn.style.gridColumn = 'span 2';
            endlessBtn.style.justifySelf = 'center';
        }
    }
    
    // Update challenge mode button visibility
    const challengeBtn = document.querySelector("button[data-level='challenge']");
    if (challengeBtn) {
        if (unlocked >= LEVEL_COUNT) {
            // Game completed - unlock challenge mode
            challengeBtn.style.display = 'block';
            challengeBtn.disabled = false;
            challengeBtn.style.opacity = '1';
            challengeBtn.style.cursor = 'pointer';
            challengeBtn.innerHTML = '⚔️ Challenge Mode';
            challengeBtn.style.gridColumn = 'span 2';
            challengeBtn.style.justifySelf = 'center';
        } else {
            // Not unlocked yet
            challengeBtn.style.display = 'block';
            challengeBtn.disabled = true;
            challengeBtn.style.opacity = '0.5';
            challengeBtn.style.cursor = 'not-allowed';
            challengeBtn.innerHTML = '⚔️ Challenge Mode<br><span style="font-size:0.7em;color:#ff9966;">Defeat the Final Boss to unlock</span>';
            challengeBtn.style.gridColumn = 'span 2';
            challengeBtn.style.justifySelf = 'center';
        }
    }
}

function showMenu() {
    console.log('[showMenu] Showing main menu, customLevelActive=', gameState.customLevelActive);
    
    // If a custom level is active AND the game is still playing, don't show the menu
    if (gameState.customLevelActive && gameState.gameStatus === 'playing') {
        console.log('[showMenu] Aborted: custom level is still active');
        return;
    }
    
    // Clear custom level flag when returning to menu
    gameState.customLevelActive = false;
    
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
    gameState.customLevelActive = false;
    gameState.customLevel = null;
    // If in endless progression and not dead, do not award points on menu exit
    if (gameState.mode === 'endless-progression') {
        // Ensure run remains active without awarding points
        // No call to endEndlessRun here; player only earns points on win
    }
    // CRITICAL: Reset mode to prevent endless mode from carrying over to regular levels
    gameState.mode = 'level';
    gameState.gameStatus = 'menu';
    gameState.isPaused = true;
    gameState.playerStunned = false;
    gameState.playerStunUntil = 0;
    
    // Clear all endless mode state flags
    gameState.endlessMode = false;
    gameState.mazeDirty = false;
    if (gameState.currentLevel === 100 || gameState.currentLevel === 'endless') {
        gameState.currentLevel = 1;
    }
    
    // Clear any active dialog sequences (fixes prep room dialog carryover bug)
    if (gameState.textSequenceIntervalId) {
        clearInterval(gameState.textSequenceIntervalId);
        gameState.textSequenceIntervalId = null;
        gameState.textSequenceCallback = null;
    }
    gameState.prepPickupLocked = false;
    
    // CRITICAL: Unlock player input when returning to menu
    gameState.inputLocked = false;
    
    // Hide status message box if visible
    const statusBox = document.getElementById('statusMessageBox');
    if (statusBox) statusBox.style.display = 'none';
    gameState.statusMessage = '';
    
    // Hide all overlays (win, lose, credits, etc.)
    const winOverlay = document.getElementById('winOverlay');
    const loseOverlay = document.getElementById('loseOverlay');
    const creditsOverlay = document.getElementById('creditsOverlay');
    const bossHealthBar = document.getElementById('bossHealthBarContainer');
    if (winOverlay) winOverlay.style.display = 'none';
    if (loseOverlay) loseOverlay.style.display = 'none';
    if (creditsOverlay) creditsOverlay.style.display = 'none';
    if (bossHealthBar) bossHealthBar.style.display = 'none';
    
    // Remove any leftover dialogs/overlays (featured levels, power prompts, etc.)
    const powerPrompt = document.getElementById('power-prompt-overlay');
    if (powerPrompt) powerPrompt.remove();
    // Remove any featured levels or other dynamic backdrops
    document.querySelectorAll('body > div').forEach(el => {
        const style = el.getAttribute('style') || '';
        if (style.includes('position: fixed') && style.includes('z-index: 10000') && el !== menu) {
            el.remove();
        }
    });
    
    // Reset win message to default
    const winMsg = document.getElementById('winMsg');
    if (winMsg) winMsg.textContent = 'Nice work—generators repaired and exit reached.';
    
    if (menu) menu.style.display = 'flex';
    if (gameContainer) gameContainer.style.display = 'none';
    buildMenu();

    // Clear any screen fade back to visible when in menu
    gameState.screenFade = { from: 0, to: 0, startAt: performance.now(), duration: 1 };
    
    // Clear boss victory flag
    if (gameState) gameState.bossVictory = false;
    
    // Stop any running level/game loop to avoid background updates and sounds
    stopGameLoop();

    // Ensure Reset button is visible on menu
    const resetBtn = document.getElementById('resetProgressBtn');
    if (resetBtn) resetBtn.style.display = 'inline-block';

    // Mobile: Hide controls when in menu
    loadMobileControls().then(m => m.hideMobileControls());
}

// Make showMenu available globally for endless UI
window.showMainMenu = showMenu;
window.showClassicEndless = showClassicEndless;

// Continue endless progression run - regenerate maze for next room
async function continueEndlessRoom() {
    if (!gameState || gameState.mode !== 'endless-progression') {
        console.warn('continueEndlessRoom called but not in endless-progression mode');
        return;
    }

    // Force reload of progression to get latest state after completeEndlessRoom()
    if (typeof window.loadEndlessProgress === 'function') {
        window.loadEndlessProgress();
    }

    const progression = getEndlessProgression();
    if (!progression || !progression.currentRun) {
        console.warn('No active endless run');
        return;
    }

    if (typeof applyPermanentUpgrades === 'function') {
        applyPermanentUpgrades();
    }

    const roomNum = progression.currentRun.roomNumber || 1;
    const difficultyMode = progression.currentRun.difficultyMode || 'easy';
    console.log('Continuing endless room, current room number:', roomNum, 'difficulty:', difficultyMode);
    
    // Save current health and stamina
    const savedHealth = gameState.health || 3;
    const savedStamina = gameState.stamina || 100;
    
    // Use getRoomDifficulty to properly scale enemies based on mode
    const { getRoomDifficulty } = await import('./endless-progression.js');
    const difficulty = getRoomDifficulty(roomNum, difficultyMode);
    
    // Build enemy config from difficulty calculation
    const enemyConfig = {
        chaser: difficulty.enemies.includes('chaser'),
        pig: difficulty.enemies.includes('pig'),
        seeker: difficulty.enemies.includes('seeker'),
        batter: difficulty.enemies.includes('batter'),
        mortar: difficulty.enemies.includes('mortar')
    };
    
    // Count duplicates for spawning
    const enemyCounts = {
        chaser: difficulty.enemies.filter(e => e === 'chaser').length,
        pig: difficulty.enemies.filter(e => e === 'pig').length,
        seeker: difficulty.enemies.filter(e => e === 'seeker').length,
        batter: difficulty.enemies.filter(e => e === 'batter').length,
        mortar: difficulty.enemies.filter(e => e === 'mortar').length
    };
    
    console.log('Enemy counts for room', roomNum, ':', enemyCounts);
    
    // Set the difficulty config BEFORE calling initGame
    gameState.endlessConfig = {
        ...enemyConfig,
        difficulty: roomNum > 10 ? 'super' : 'normal',
        generatorCount: 3
    };
    
    // Set endless mode flags
    gameState.mode = 'endless-progression';
    gameState.endlessMode = true;
    gameState.currentLevel = 100;
    gameState.mazeDirty = true; // Force maze rebuild with purple neon walls
    
    // Reinitialize the game with new room (will use endlessConfig)
    gameState._useCustomLevel11 = false;
    initGame();
    
    // Restore health and stamina from previous room
    gameState.health = savedHealth;
    gameState.stamina = savedStamina;
    
    // Generate random maze (no seed = different maze each time)
    const mazeData = generateMaze(Math.floor(Math.random() * 0xFFFFFFFF), GENERATOR_COUNT, false);
    gameState.maze = mazeData.grid;
    gameState.generators = mazeData.generators || [];
    gameState.mazeDirty = true; // Force rebuild again after maze generation
        // Spawn enemies based on difficulty counts (for duplicates in hard mode)
        // Import spawn functions
        const { spawnInitialEnemy, spawnFlyingPig, spawnSeeker, spawnBatter, spawnMortar } = await import('./state.js');
    
        // Clear any existing enemies first
        gameState.enemies = [];
    
        // Spawn enemies according to counts
        for (let i = 0; i < enemyCounts.chaser; i++) {
            spawnInitialEnemy();
        }
        for (let i = 0; i < enemyCounts.pig; i++) {
            spawnFlyingPig();
        }
        for (let i = 0; i < enemyCounts.seeker; i++) {
            spawnSeeker();
        }
        for (let i = 0; i < enemyCounts.batter; i++) {
            spawnBatter();
        }
        for (let i = 0; i < enemyCounts.mortar; i++) {
            spawnMortar();
        }
    
        console.log('Spawned', gameState.enemies.length, 'total enemies for hard mode');
    
    
    // Reset room-level game state but keep run state
    gameState.gameStatus = 'playing';
    gameState.isPaused = false;
    gameState.bossHealth = undefined;
    gameState.bossVictory = false;
    gameState.pigCrashAnimation = null;
    gameState.isGeneratorUIOpen = false;
    gameState.skillCheckState = null;
    
    // Reset player position to start
    gameState.playerX = 1;
    gameState.playerY = 1;
    
    // Keep health and stamina from run, reset shields/items
    gameState.shieldHealth = 0;
    gameState.collisionShieldActive = false;
    gameState.projectiles = [];
    gameState.items = [];
    gameState.generators.forEach(g => g.progress = 0);
    
    console.log('Room regenerated successfully with difficulty scaling:', enemyConfig);
    
    // Update UI to show new room
    if (window.__renderEndlessAbilities) {
        try { window.__renderEndlessAbilities(); } catch {}
    }
}

function startLevel(level) {
    if (level === 11 && !isLevel11Unlocked()) {
        alert('Level 11 is locked. Enter the password in Settings to unlock.');
        return;
    }

    // Custom level (builder) entry point
    if (level === 'custom') {
        console.log('[startLevel] Starting custom level mode');
        let customLevel = gameState.customLevel;
        if (!customLevel) {
            console.log('[startLevel] gameState.customLevel not set, trying localStorage');
            try {
                const stored = localStorage.getItem('customLevel');
                if (stored) customLevel = JSON.parse(stored);
            } catch (e) {
                console.error('Failed to parse stored custom level:', e);
            }
        }
        if (!customLevel) {
            console.error('[startLevel] No custom level found!');
            alert('No custom level loaded. Build or import a level first.');
            return;
        }

        console.log('[startLevel] Custom level loaded:', customLevel.name || 'Untitled');
        gameState.customLevel = customLevel;
        gameState.customLevelActive = true;
        gameState.currentLevel = 1; // Use level 1 palette by default
        gameState.mode = 'custom';

        const menu = document.getElementById('mainMenu');
        const gameContainer = document.getElementById('game-container');
        if (menu) menu.style.display = 'none';
        if (gameContainer) gameContainer.style.display = 'flex';

        const winOverlay = document.getElementById('winOverlay');
        const loseOverlay = document.getElementById('loseOverlay');
        const creditsOverlay = document.getElementById('creditsOverlay');
        if (winOverlay) winOverlay.style.display = 'none';
        if (loseOverlay) loseOverlay.style.display = 'none';
        if (creditsOverlay) creditsOverlay.style.display = 'none';

        console.log('[startLevel] UI elements hidden/shown, loading mobile controls');
        loadMobileControls().then(m => m.showMobileControls());

        gameState._useCustomLevel11 = false;
        console.log('[startLevel] Calling initGame()');
        initGame();
        console.log('[startLevel] initGame() completed');
        applyUIStyle();
        console.log('[startLevel] applyUIStyle() completed');
        updateCanvasBorderColor();
        console.log('[startLevel] Custom level started successfully!');
        return;
    }
    
    // Handle endless progression mode
    if (level === 'endless') {
        gameState.currentLevel = 'endless';
        gameState.mode = 'endless-progression';
        
        // Show game UI, hide menu
        const menu = document.getElementById('mainMenu');
        const gameContainer = document.getElementById('game-container');
        if (menu) menu.style.display = 'none';
        if (gameContainer) gameContainer.style.display = 'flex';
        
        // Hide all overlays
        const winOverlay = document.getElementById('winOverlay');
        const loseOverlay = document.getElementById('loseOverlay');
        const creditsOverlay = document.getElementById('creditsOverlay');
        if (winOverlay) winOverlay.style.display = 'none';
        if (loseOverlay) loseOverlay.style.display = 'none';
        if (creditsOverlay) creditsOverlay.style.display = 'none';

        // Mobile: Show controls when game starts
        loadMobileControls().then(m => m.showMobileControls());

        // Check if this is a fresh run (room 0) or continuing (room > 0)
        const progression = getEndlessProgression();
        if (progression && progression.currentRun && progression.currentRun.roomNumber > 0) {
            // Continuing a run: just regenerate the room
            continueEndlessRoom();
        } else {
            // Fresh run: initialize game with first room
            // Set config for room 1 (mortar AI)
            gameState.endlessConfig = {
                chaser: true,
                pig: false,
                seeker: false,
                batter: false,
                mortar: true,
                difficulty: 'normal',
                generatorCount: 3
            };
            
            // Set endless mode flags for purple walls
            gameState.mode = 'endless-progression';
            gameState.endlessMode = true;
            gameState.currentLevel = 100;
            gameState.mazeDirty = true;
            
            gameState._useCustomLevel11 = false;
            initGame();
        }
        
        // Apply permanent upgrades to current game state
        if (typeof applyPermanentUpgrades === 'function') {
            applyPermanentUpgrades();
        }
        
        // Apply UI style based on settings
        applyUIStyle();
        
        // Update canvas border color to purple
        updateCanvasBorderColor();
        
        return;
    }
    
    gameState.currentLevel = level;
    gameState.mode = 'level';
    
    // Reset Level 7 jump-only tracking
    if (level === 7) {
        gameState.level7HasWASDMovement = false;
    }
    
    // Show game UI, hide menu
    const menu = document.getElementById('mainMenu');
    const gameContainer = document.getElementById('game-container');
    if (menu) menu.style.display = 'none';
    if (gameContainer) gameContainer.style.display = 'flex';
    
    // Hide all overlays when starting a new level
    const winOverlay = document.getElementById('winOverlay');
    const loseOverlay = document.getElementById('loseOverlay');
    const creditsOverlay = document.getElementById('creditsOverlay');
    if (winOverlay) winOverlay.style.display = 'none';
    if (loseOverlay) loseOverlay.style.display = 'none';
    if (creditsOverlay) creditsOverlay.style.display = 'none';

    // Mobile: Show controls when game starts
    loadMobileControls().then(m => m.showMobileControls());

    // Run core init only; legacy Level 11 flow handles its own rooms
    gameState._useCustomLevel11 = false;
    initGame();
    
    // Apply UI style based on settings
    applyUIStyle();
    
    // Update canvas border color to match level
    updateCanvasBorderColor();
    
}



function wireMenuUi() {
    const resetBtn = document.getElementById('resetProgressBtn');
    if (resetBtn && !resetBtn._wired) {
        resetBtn.addEventListener('click', () => {
            // Show confirmation dialog
            const confirmed = confirm('⚠️ WARNING: This will reset ALL progress and erase ALL best times. Are you sure?');
            if (confirmed) {
                resetProgress();
                showMenu();
                alert('✅ Progress and times have been reset!');
            }
        });
        resetBtn._wired = true;
    }

    const trophyBtn = document.getElementById('trophyBtn');
    // Endless button
    const endlessBtn = document.querySelector("button[data-level='endless']");
    if (endlessBtn && !endlessBtn._wired) {
        endlessBtn.addEventListener('click', () => {
            const unlocked = getUnlockedLevel();
            if (unlocked >= 2) {
                showNewEndlessMenu();
            } else {
                showBottomAlert('🔒 Reach Level 2 to unlock Endless Mode!', 3000);
            }
        });
        endlessBtn._wired = true;
    }
    
    // Builder Mode button
    const builderBtn = document.querySelector("button[data-level='builder']");
    if (builderBtn && !builderBtn._wired) {
        builderBtn.addEventListener('click', () => {
            const unlocked = getUnlockedLevel();
            if (unlocked >= 11) {
                window.location.href = 'level-builder.html';
            } else {
                showBottomAlert('🔒 Complete Level 10 to unlock Builder Mode!', 3000);
            }
        });
        builderBtn._wired = true;
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

    // Credits button handler
    const creditsBtn = document.getElementById('creditsBtn');
    const creditsOverlay = document.getElementById('creditsOverlay');
    const creditsCloseBtn = document.getElementById('creditsCloseBtn');

    if (creditsBtn && !creditsBtn._wired) {
        creditsBtn.addEventListener('click', () => {
            if (creditsOverlay) creditsOverlay.style.display = 'flex';
        });
        creditsBtn._wired = true;
    }
    if (creditsCloseBtn && !creditsCloseBtn._wired) {
        creditsCloseBtn.addEventListener('click', () => {
            if (creditsOverlay) creditsOverlay.style.display = 'none';
        });
        creditsCloseBtn._wired = true;
    }

    // Settings overlay wiring
    const helpBtn = document.getElementById('helpBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsOverlay = document.getElementById('settingsOverlay');
    const movementAudioChk = document.getElementById('movementAudioChk');
    const autoMovementChk = document.getElementById('autoMovementChk');
    const autoMovementLabel = document.getElementById('autoMovementLabel');
    const simplifiedUIChk = document.getElementById('simplifiedUIChk');
    const masterVolumeSlider = document.getElementById('masterVolumeSlider');
    const masterVolumeLabel = document.getElementById('masterVolumeLabel');
    const settingsBackBtn = document.getElementById('settingsBackBtn');
    const energyBlasterSection = document.getElementById('energyBlasterSection');
    const energyBlasterStatus = document.getElementById('energyBlasterStatus');
    const energyBlasterChk = document.getElementById('energyBlasterChk');
    const level11Section = document.getElementById('level11Section');
    const level11Status = document.getElementById('level11Status');
    const level11PlayBtn = document.getElementById('level11PlayBtn');

    const refreshLevel11UI = () => {
        const unlocked = isLevel11Unlocked();
        if (level11Section) level11Section.style.display = unlocked ? 'block' : 'none';
        if (level11Status && unlocked) level11Status.textContent = 'Unlocked — Play whenever you are ready.';
        if (level11PlayBtn) level11PlayBtn.disabled = !unlocked;
    };
    const refreshEnergyBlasterUI = () => {
        const unlocked = isBazookaModeUnlocked();
        if (energyBlasterSection) energyBlasterSection.style.display = 'block';
        if (energyBlasterStatus) energyBlasterStatus.textContent = unlocked
            ? 'Unlocked — toggle to enable Energy Blaster Mode.'
            : 'Locked — redeem the secret code in Skins.';
        if (energyBlasterChk) {
            energyBlasterChk.disabled = !unlocked;
            energyBlasterChk.checked = unlocked && isBazookaMode();
        }
    };
    // Make accessible to other handlers in this module
    window.__refreshLevel11UI = refreshLevel11UI;
    window.__refreshEnergyBlasterUI = refreshEnergyBlasterUI;
    window.buildMenu = buildMenu;
    
    // Help button handler
    if (helpBtn && !helpBtn._wired) {
        helpBtn.addEventListener('click', () => {
            window.location.href = 'help.html';
        });
        helpBtn._wired = true;
    }
    
    if (settingsBtn && !settingsBtn._wired) {
        settingsBtn.addEventListener('click', () => {
            const s = getSettings();
            if (movementAudioChk) movementAudioChk.checked = !!s.movementAudio;
            if (autoMovementChk) autoMovementChk.checked = !!s.autoMovement;
            if (autoMovementLabel) autoMovementLabel.textContent = `Auto-Movement: ${s.autoMovement ? 'ON' : 'OFF'}`;
            if (simplifiedUIChk) simplifiedUIChk.checked = !!s.simplifiedUI;
            // Set volume slider to saved value (default 100%)
            if (masterVolumeSlider) {
                const volume = (s.masterVolume !== undefined ? s.masterVolume : 1.0) * 100;
                masterVolumeSlider.value = volume;
                if (masterVolumeLabel) masterVolumeLabel.textContent = Math.round(volume) + '%';
            }
            refreshEnergyBlasterUI();
            // Reveal credits button if unlocked (after beating the game)
            const creditsBtn = document.getElementById('viewCreditsBtn');
            if (creditsBtn) creditsBtn.style.display = isSecretUnlocked() ? 'inline-block' : 'none';
            if (settingsOverlay) settingsOverlay.style.display = 'flex';
        });
        settingsBtn._wired = true;
    }
    
    // Wire up volume slider
    if (masterVolumeSlider && !masterVolumeSlider._wired) {
        masterVolumeSlider.addEventListener('input', (e) => {
            const volume = parseFloat(e.target.value) / 100;
            if (masterVolumeLabel) masterVolumeLabel.textContent = Math.round(e.target.value) + '%';
            // Save to settings and apply
            const s = getSettings();
            s.masterVolume = volume;
            setSettings(s);
            // Update gameState settings as well
            if (gameState && gameState.settings) {
                gameState.settings.masterVolume = volume;
            }
            // Update audio system
            import('./audio.js').then(mod => {
                if (mod.setMasterVolume) mod.setMasterVolume(volume);
            }).catch(() => {});
        });
        masterVolumeSlider._wired = true;
    }
    
    // Wire terminal submit button
    const terminalSubmit = document.getElementById('terminalSubmit');
    if (terminalSubmit && !terminalSubmit._wired) {
        terminalSubmit.addEventListener('click', () => {
            checkTerminalAnswer();
        });
        terminalSubmit._wired = true;
    }
    
    // Wire terminal close button
    const terminalCloseBtn = document.getElementById('terminalCloseBtn');
    if (terminalCloseBtn && !terminalCloseBtn._wired) {
        terminalCloseBtn.addEventListener('click', () => {
            hideTerminalOverlay();
            if (gameState.inTerminalRoom) {
                exitTerminalRoom();
            }
        });
        terminalCloseBtn._wired = true;
    }
    
    // Allow Enter key in terminal answer field
    const terminalAnswer = document.getElementById('terminalAnswer');
    if (terminalAnswer && !terminalAnswer._wired) {
        terminalAnswer.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') checkTerminalAnswer();
        });
        terminalAnswer._wired = true;
    }
    
    if (settingsBackBtn && !settingsBackBtn._wired) {
        settingsBackBtn.addEventListener('click', () => {
            if (settingsOverlay) settingsOverlay.style.display = 'none';
        });
        settingsBackBtn._wired = true;
    }
    
    // Reset Achievements button
    const resetAchievementsBtn = document.getElementById('resetAchievementsBtn');
    if (resetAchievementsBtn && !resetAchievementsBtn._wired) {
        resetAchievementsBtn.addEventListener('click', () => {
            if (confirm('Reset all achievements? This cannot be undone!')) {
                try {
                    resetAchievements(); // Call the proper reset function from achievements.js
                    initAchievements(); // Reinitialize achievements
                    showBottomAlert('✅ All achievements reset!', 3000);
                } catch (e) {
                    console.error('Error resetting achievements:', e);
                    showBottomAlert('❌ Error resetting achievements', 3000);
                }
            }
        });
        resetAchievementsBtn._wired = true;
    }
    
    // Reset Skins button
    const resetSkinsBtn = document.getElementById('resetSkinsBtn');
    if (resetSkinsBtn && !resetSkinsBtn._wired) {
        resetSkinsBtn.addEventListener('click', () => {
            if (confirm('Reset all skins? This cannot be undone!')) {
                try {
                    resetSkins(); // Call the proper reset function from skins.js
                    initSkins(); // Reinitialize skins
                    showBottomAlert('✅ All skins reset!', 3000);
                } catch (e) {
                    console.error('Error resetting skins:', e);
                    showBottomAlert('❌ Error resetting skins', 3000);
                }
            }
        });
        resetSkinsBtn._wired = true;
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

    if (energyBlasterChk && !energyBlasterChk._wired) {
        energyBlasterChk.addEventListener('change', () => {
            if (!isBazookaModeUnlocked()) {
                energyBlasterChk.checked = false;
                if (energyBlasterStatus) energyBlasterStatus.textContent = 'Locked — redeem the secret code in Skins.';
                return;
            }
            const enable = !!energyBlasterChk.checked;
            if (!confirm(`${enable ? 'Enable' : 'Disable'} Energy Blaster Mode? This will reset your level progress.`)) {
                energyBlasterChk.checked = !enable;
                return;
            }
            setBazookaMode(enable);
            resetLevelsOnly();
            buildMenu(); // Refresh level UI to show reset state
            if (energyBlasterStatus) {
                energyBlasterStatus.textContent = enable ? 'Enabled — Energy Blaster Mode is active.' : 'Unlocked — toggle to enable Energy Blaster Mode.';
            }
            showBottomAlert(enable ? '⚡ Energy Blaster Mode enabled. Levels reset.' : 'Energy Blaster Mode disabled. Levels reset.', 2200);
        });
        energyBlasterChk._wired = true;
    }

    if (level11PlayBtn && !level11PlayBtn._wired) {
        level11PlayBtn.addEventListener('click', () => {
            if (settingsOverlay) settingsOverlay.style.display = 'none';
            startLevel(11);
        });
        level11PlayBtn._wired = true;
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
    
    // Endless Menu Button Handlers
    const startRunBtn = document.getElementById('startRunBtn');
    if (startRunBtn && !startRunBtn._wired) {
        startRunBtn.addEventListener('click', () => {
            const upgradesEnabled = document.getElementById('upgradesToggle')?.checked ?? true;
            hideNewEndlessMenu();
            startProgressionRun(upgradesEnabled);
            // Start the first room of endless mode
            startLevel('endless');
        });
        startRunBtn._wired = true;
    }
    
    const resetUpgradesBtn = document.getElementById('resetUpgradesBtn');
    if (resetUpgradesBtn && !resetUpgradesBtn._wired) {
        resetUpgradesBtn.addEventListener('click', () => {
            if (confirm('Reset all upgrades and refund all points? This cannot be undone!')) {
                resetUpgrades();
                updateEndlessMenuStats();
                populateUpgradesList();
                showBottomAlert('✅ All upgrades reset and points refunded!', 3000);
            }
        });
        resetUpgradesBtn._wired = true;
    }
    
    const classicEndlessBtn = document.getElementById('classicEndlessBtn');
    if (classicEndlessBtn && !classicEndlessBtn._wired) {
        classicEndlessBtn.addEventListener('click', () => {
            showClassicEndless();
        });
        classicEndlessBtn._wired = true;
    }
    
    const endlessBackBtn = document.getElementById('endlessBackBtn');
    if (endlessBackBtn && !endlessBackBtn._wired) {
        endlessBackBtn.addEventListener('click', () => {
            hideNewEndlessMenu();
            showMenu();
        });
        endlessBackBtn._wired = true;
    }
}

// Dialog Bar logic
function setDialogBar(text, color = '#ff4455', border = '#ff4455') {
    const bar = document.getElementById('dialogBar');
    if (!bar) return;
    if (text) {
        bar.innerHTML = text;
        bar.style.display = '';
        bar.style.color = color;
        bar.style.borderColor = border;
    } else {
        bar.innerHTML = '';
        bar.style.display = 'none';
    }
}
window.setDialogBar = setDialogBar;

function formatMs(ms) {
    const totalMs = Math.max(0, Math.floor(ms));
    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const millis = totalMs % 1000;
    return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}.${String(millis).padStart(3,'0')}`;
}

// New Endless Menu (with progression system)
function showNewEndlessMenu() {
    const menu = document.getElementById('mainMenu');
    const endlessMenu = document.getElementById('endlessMenu');
    if (menu) menu.style.display = 'none';
    if (endlessMenu) {
        endlessMenu.style.display = 'block';
        updateEndlessMenuStats();
        populateUpgradesList();
        populateAbilitySchedule();
    }
}

function hideNewEndlessMenu() {
    const endlessMenu = document.getElementById('endlessMenu');
    if (endlessMenu) endlessMenu.style.display = 'none';
}

function showClassicEndless() {
    hideNewEndlessMenu();
    showEndlessOverlay();
}

// Endless Menu UI Functions
function updateEndlessMenuStats() {
    const stats = (typeof window !== 'undefined' && window.getEndlessProgression) ? window.getEndlessProgression() : null;
    if (!stats || !stats.lifetimeStats) return;
    const $ = (id) => document.getElementById(id);
    if ($('statBestRun')) $('statBestRun').textContent = stats.lifetimeStats.bestRun || 0;
    if ($('statTotalRooms')) $('statTotalRooms').textContent = stats.lifetimeStats.totalRooms || 0;
    if ($('statAvailablePoints')) $('statAvailablePoints').textContent = stats.availablePoints || 0;
    if ($('statTotalRuns')) $('statTotalRuns').textContent = stats.lifetimeStats.totalRuns || 0;
}



function showEndlessOverlay() {
    const ov = document.getElementById('endlessOverlay');
    if (!ov) return;
    // Prefill from stored defaults
    const def = getEndlessDefaults();
    const $ = (id) => document.getElementById(id);
    const unlocked = getUnlockedLevel();
    
    // Enemy unlock progression: chaser(2), pig(3), seeker(5), batter(7), mortar(9)
    const chaserUnlocked = unlocked >= 2;
    const pigUnlocked = unlocked >= 3;
    const seekerUnlocked = unlocked >= 5;
    const batterUnlocked = unlocked >= 7;
    const mortarUnlocked = unlocked >= 9;
    
    // Chaser (unlocked at level 2)
    if ($('endlessChaser')) {
        $('endlessChaser').checked = chaserUnlocked && !!def.chaser;
        $('endlessChaser').disabled = !chaserUnlocked;
        const chaserLabel = $('endlessChaser').parentElement;
        if (chaserLabel) chaserLabel.style.opacity = chaserUnlocked ? '1' : '0.5';
        if (!chaserUnlocked && chaserLabel) chaserLabel.title = 'Unlock at Level 2';
    }
    
    // Pig (unlocked at level 3)
    if ($('endlessPig')) {
        $('endlessPig').checked = pigUnlocked && !!def.pig;
        $('endlessPig').disabled = !pigUnlocked;
        const pigLabel = $('endlessPig').parentElement;
        if (pigLabel) pigLabel.style.opacity = pigUnlocked ? '1' : '0.5';
        if (!pigUnlocked && pigLabel) pigLabel.title = 'Unlock at Level 3';
    }
    
    // Seeker (unlocked at level 5)
    if ($('endlessSeeker')) {
        $('endlessSeeker').checked = seekerUnlocked && !!def.seeker;
        $('endlessSeeker').disabled = !seekerUnlocked;
        const seekerLabel = $('endlessSeeker').parentElement;
        if (seekerLabel) seekerLabel.style.opacity = seekerUnlocked ? '1' : '0.5';
        if (!seekerUnlocked && seekerLabel) seekerLabel.title = 'Unlock at Level 5';
    }
    
    // Batter (unlocked at level 7)
    if ($('endlessBatter')) {
        $('endlessBatter').checked = batterUnlocked && !!def.batter;
        $('endlessBatter').disabled = !batterUnlocked;
        const batterLabel = $('endlessBatter').parentElement;
        if (batterLabel) batterLabel.style.opacity = batterUnlocked ? '1' : '0.5';
        if (!batterUnlocked && batterLabel) batterLabel.title = 'Unlock at Level 7';
    }
    
    // Mortar (unlocked at level 9)
    if ($('endlessMortar')) {
        $('endlessMortar').checked = mortarUnlocked && !!def.mortar;
        $('endlessMortar').disabled = !mortarUnlocked;
        const mortarLabel = $('endlessMortar').parentElement;
        if (mortarLabel) mortarLabel.style.opacity = mortarUnlocked ? '1' : '0.5';
        if (!mortarUnlocked && mortarLabel) mortarLabel.title = 'Unlock at Level 9';
    }
    
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
    gameState.endlessMode = true; // Flag for endless mode (used by renderer for cyan walls)
    gameState.currentLevel = 100; // Endless mode uses level 100 as identifier
    gameState.endlessConfig = { ...cfg, streak: (gameState.endlessConfig && gameState.endlessConfig.streak) || 0 };
    gameState.mazeDirty = true; // Force maze rebuild with endless colors

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
    // Check for Level 7 jump-only achievement (no WASD movement used)
    if (gameState.currentLevel === 7 && !gameState.level7HasWASDMovement) {
        try {
            import('./achievements.js').then(mod => {
                if (mod.checkAchievements) {
                    mod.checkAchievements('achievement_event', { eventType: 'level7_only_jumps' });
                }
            }).catch(() => {});
        } catch {}
    }
    
    // Special handling for boss victory - show win overlay with Secret?/Credits instead of auto-credits
    if (gameState.currentLevel === 10 && gameState.bossVictory) {
        const win = document.getElementById('winOverlay');
        const winMsg = document.getElementById('winMsg');
        const nextBtn = document.getElementById('nextLevelBtn');
        const menuBtn = document.getElementById('winReturnMenuBtn');
        const winSecretBtn = document.getElementById('winSecretBtn');
        const creditsBtn = document.getElementById('creditsBtn');
        const creditsMenuBtn = document.getElementById('creditsMenuBtn');
        const closeAndMenu = () => {
            stopConfetti();
            if (win) win.style.display = 'none';
            gameState.customLevelActive = false;
            showMenu();
        };

        setSecretUnlocked(true);
        if (win) win.style.display = 'flex';
        if (winMsg) winMsg.textContent = 'You survived the final collapse!';
        if (nextBtn) nextBtn.style.display = 'none';
        if (menuBtn) menuBtn.style.display = '';
        if (creditsBtn) creditsBtn.style.display = 'inline-block';
        if (winSecretBtn) winSecretBtn.style.display = 'inline-block';

        if (menuBtn && !menuBtn._wired) {
            menuBtn.addEventListener('click', () => {
                closeAndMenu();
            });
            menuBtn._wired = true;
        }

        if (creditsBtn && !creditsBtn._wired) {
            creditsBtn.addEventListener('click', () => {
                const c = document.getElementById('creditsOverlay');
                if (c) c.style.display = 'block';
            });
            creditsBtn._wired = true;
        }
        if (creditsMenuBtn && !creditsMenuBtn._wired) {
            creditsMenuBtn.addEventListener('click', () => {
                const c = document.getElementById('creditsOverlay');
                if (c) c.style.display = 'none';
                closeAndMenu();
            });
            creditsMenuBtn._wired = true;
        }

        if (winSecretBtn && !winSecretBtn._wired) {
            winSecretBtn.addEventListener('click', () => {
                const pwd = prompt('Enter secret password:');
                if (!pwd) {
                    closeAndMenu();
                    return;
                }
                if (pwd.trim().toLowerCase() === 'echomaze') {
                    setLevel11Unlocked(true);
                    setUnlockedLevel(Math.max(getUnlockedLevel(), 11));
                    alert('Password accepted! Check Settings to play Level 11.');
                    if (window.__refreshLevel11UI) window.__refreshLevel11UI();
                    closeAndMenu();
                } else {
                    alert('Incorrect password. Returning to menu.');
                    closeAndMenu();
                }
            });
            winSecretBtn._wired = true;
        }

        launchConfetti();
        return;
    }
    
    // Endless progression: customize win UI
    if (gameState.mode === 'endless-progression') {
        const win = document.getElementById('winOverlay');
        const nextBtn = document.getElementById('nextLevelBtn');
        const menuBtn = document.getElementById('winReturnMenuBtn');
        const winMsg = document.getElementById('winMsg');
        if (win) win.style.display = 'flex';
        if (winMsg) winMsg.textContent = 'Room complete!';
        // Hide Main Menu, only allow Next Room
        if (menuBtn) menuBtn.style.display = 'none';
        if (nextBtn) {
            nextBtn.textContent = 'Next Room';
            nextBtn.disabled = false;
            nextBtn.style.opacity = '';
            nextBtn.style.display = '';
            if (!nextBtn._endlessProgressionWired) {
                nextBtn.addEventListener('click', () => {
                    stopConfetti();
                    if (win) win.style.display = 'none';
                    // Award points and advance room
                    if (typeof window.completeEndlessRoom === 'function') window.completeEndlessRoom();
                    // Start next endless room
                    startLevel('endless');
                });
                nextBtn._endlessProgressionWired = true;
            }
        }
        launchConfetti();
        return;
    }

    // Normal win screen for regular levels
    const curUnlocked = getUnlockedLevel();
    if (gameState.currentLevel >= curUnlocked) {
        const maxNext = (gameState.currentLevel === 10 && !isLevel11Unlocked()) ? 10 : LEVEL_COUNT;
        setUnlockedLevel(Math.min(maxNext, gameState.currentLevel + 1));
    }
    const win = document.getElementById('winOverlay');
    if (win) win.style.display = 'flex';
    
    // Hide credits/secret buttons for non-level 10
    const creditsBtn = document.getElementById('creditsBtn');
    const winSecretBtn = document.getElementById('winSecretBtn');
    if (creditsBtn && gameState.currentLevel !== 10) creditsBtn.style.display = 'none';
    if (winSecretBtn && gameState.currentLevel !== 10) winSecretBtn.style.display = 'none';
    
    // Disable Next Level at last level
    const nextBtn = document.getElementById('nextLevelBtn');
    if (nextBtn) {
        nextBtn.style.display = '';
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
            const streak = gameState.endlessConfig.streak;
            
            // Fire endless_wave achievement event
            try {
                checkAchievements('endless_wave', { wave: streak, perfectWave: false });
            } catch (e) {
                console.error('Achievement endless_wave event error:', e);
            }
            
            // Bonus rewards at milestone streaks
            let bonusMsg = '';
            if (streak % 10 === 0) {
                bonusMsg = ' 🔥 MILESTONE! +1 Extra Life!';
                gameState.lives = Math.min(gameState.lives + 1, 5); // Cap at 5 lives
            } else if (streak % 5 === 0) {
                bonusMsg = ' ⚡ Difficulty increased!';
            }
            
            // Brief message then restart
            gameState.statusMessage = `Escaped! Streak: ${streak}${bonusMsg}`;
            setTimeout(() => {
                if (gameState.mode === 'endless') initGame();
            }, bonusMsg ? 1500 : 600);
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
        
        // Fire death achievement event
        try {
            checkAchievements('death', { deathCause: gameState.deathCause, gameState });
        } catch (e) {
            console.error('Achievement event error:', e);
        }
        
        const lo = document.getElementById('loseOverlay');
        const tip = document.getElementById('loseTip');
        if (tip) {
            // In Level 11, don't show tips (lore-appropriate darkness)
            if (gameState.currentLevel === 11) {
                tip.style.display = 'none';
            } else {
                tip.style.display = 'block';
                // 5% chance to show secret hint
                const showSecretHint = Math.random() < 0.05;
                
                if (showSecretHint) {
                    tip.textContent = 'That code in the credits is pretty weird... maybe try putting it into the secret code area in the settings..?';
                } else {
                    const cause = gameState.deathCause || 'enemy';
                    let msg = 'Tip: Stay aware of enemy behaviors and use your tools.';
                    if (cause === 'wall') msg = 'Tip: Don\'t run into walls unless sprinting through with full stamina!';
                    else if (cause === 'chaser') msg = 'Tip: Watch for chaser telegraphs, and sidestep or block its jumps.';
                    else if (cause === 'seeker') msg = 'Tip: Stay out of the Seeker\'s vision cone—break line of sight behind walls.';
                    else if (cause === 'pig_projectile') msg = 'Tip: Reflect pink arcs with your shield—aim the shield toward the incoming arc!';
                    else if (cause === 'generator_fail') msg = 'Tip: Nail those skill checks—missing twice blocks the generator and costs a life.';
                    tip.textContent = msg;
                }
            }

            // Endless progression death handling
            if (gameState.mode === 'endless-progression') {
                if (gameState.gameStatus === 'lost') {
                    // End run and award points accrued so far
                    if (typeof window.endEndlessRun === 'function') {
                        window.endEndlessRun(false);
                    }
                    // Hide restart button for endless mode
                    const restartBtn = document.getElementById('loseRestartBtn');
                    if (restartBtn) restartBtn.style.display = 'none';
                }
            }
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

    // Load sprites first
    console.log('Loading game sprites...');
    await loadSprites();
    console.log('Sprites loaded successfully!');

    // Initialize achievements, skins, and notifications systems
    initAchievements();
    initSkins();
    initNotifications();
    initAchievementsSkinsUI();

    // Mobile: Initialize virtual controls if on touch device
    const mobile = await loadMobileControls();
    const mobileControls = mobile.initMobileControls();
    if (mobileControls) {
        setupMobileInput(mobileControls);
        console.log('Mobile controls ready');
    }

    // Builder playtest support: load custom level and jump straight into play
    const params = new URLSearchParams(window.location.search);
    let customLevelLoaded = false;
    if (params.get('custom') === '1') {
        console.log('[startApp] Detected ?custom=1 parameter, attempting to load custom level...');
        try {
            const customLevelJson = localStorage.getItem('customLevel');
            console.log('[startApp] customLevelJson exists:', !!customLevelJson);
            if (customLevelJson) {
                const customLevel = JSON.parse(customLevelJson);
                console.log('[startApp] Parsed custom level:', customLevel.name || 'Untitled');
                gameState.customLevel = customLevel;
                console.log('[startApp] Set gameState.customLevel');
                wireMenuUi();
                console.log('[startApp] wired UI');
                
                // Clear the URL parameter so refresh doesn't auto-load again
                window.history.replaceState({}, '', window.location.pathname);
                console.log('[startApp] Cleared URL parameter, calling startLevel("custom")');
                
                // Start the custom level using startLevel() which properly initializes everything
                startLevel('custom');
                console.log('[startApp] startLevel("custom") returned');
                customLevelLoaded = true;
                return;
            } else {
                console.warn('[startApp] No customLevel in localStorage');
            }
        } catch (e) {
            console.error('Failed to load custom level:', e);
        }
    }

    // Only show menu if we didn't just load a custom level
    if (!customLevelLoaded) {
        wireMenuUi();
        showMenu();
    }
}
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', startApp);
} else {
    startApp();
}
