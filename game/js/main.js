// main.js - Game loop and initialization

import { initGame as initializeGameState, gameState, updateStaminaCooldown, updateBlock, updateGeneratorProgress, updateSkillCheck, updateEnemies, closeGeneratorInterface, updateTeleportPads, updateCollisionShield, triggerEnemiesThaw, getBestTimeMs } from './state.js';
import { playLose } from './audio.js';
import { LEVEL_COUNT, getUnlockedLevel, setUnlockedLevel, resetProgress, isGodMode, setGodMode, isDevUnlocked, setDevUnlocked, getEndlessDefaults, setEndlessDefaults, getSettings, setSettings } from './config.js';
import { render } from './renderer.js';
import { setupInputHandlers, processMovement, setupMobileInput } from './input.js';

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
    
    // Hide overlay on restart
    const overlayEl = document.getElementById('overlay');
    if (overlayEl) overlayEl.style.display = 'none';
    const statusEl = document.getElementById('status');
    if (statusEl) statusEl.style.display = 'none';
    const pauseOverlay = document.getElementById('pauseOverlay');
    if (pauseOverlay) pauseOverlay.style.display = 'none';
    gameState.isPaused = false;
    
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
    if (menu) menu.style.display = 'flex';
    if (gameContainer) gameContainer.style.display = 'none';
    buildMenu();
    // Sync dev panel state
    const devPanel = document.getElementById('devPanel');
        // Stop any running level/game loop to avoid background updates and sounds
        stopGameLoop();
        gameState.isPaused = true;
    const godChk = document.getElementById('godModeChk');
    if (isDevUnlocked()) {
        if (devPanel) devPanel.style.display = 'block';
        if (godChk) godChk.checked = isGodMode();
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
                if (pwd === 'Spooky') {
                    setDevUnlocked(true);
                    if (devPanel) devPanel.style.display = 'block';
                    const godChk = document.getElementById('godModeChk');
                    if (godChk) godChk.checked = isGodMode();
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
    if (godChk && !godChk._wired) {
        godChk.addEventListener('change', () => {
            setGodMode(godChk.checked);
        });
        godChk._wired = true;
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
    const settingsBackBtn = document.getElementById('settingsBackBtn');
    if (settingsBtn && !settingsBtn._wired) {
        settingsBtn.addEventListener('click', () => {
            const s = getSettings();
            if (movementAudioChk) movementAudioChk.checked = !!s.movementAudio;
            if (autoMovementChk) autoMovementChk.checked = !!s.autoMovement;
            if (autoMovementLabel) autoMovementLabel.textContent = `Auto-Movement: ${s.autoMovement ? 'ON' : 'OFF'}`;
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
