// dev-panel.js - Always-on developer console
// Provides menu/in-game controls, achievement inspector, and live event log

import { ACHIEVEMENTS, getUnlockedAchievements, getAchievementConditions } from './achievements.js';
import { gameState } from './state.js';
import { 
    setGodMode,
    isGodMode,
    setBossDamage10x,
    isBossDamage10x,
    setUnlockedLevel,
    setLevel11Unlocked,
    setBazookaMode,
    setBazookaModeUnlocked,
} from './config.js';

const DEV_PANEL_WIDTH = 420;
const DEV_PANEL_HEIGHT = 620;

const storedDevPanel = localStorage.getItem('devPanelEnabled');
// DEV BUTTON DISABLED - Set to false to disable dev panel completely
// To re-enable for development, change false to true
let devPanelEnabled = false; // storedDevPanel === null ? true : storedDevPanel === 'true';
let devPanelCollapsed = localStorage.getItem('devPanelCollapsed') === 'true';
let devPanelVisible = devPanelEnabled && !devPanelCollapsed;
let panelElement = null;
let handleElement = null;
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let eventLog = [];
let runtimeTick = null;
let devPanelBuilt = false;
let devPanelWired = false;

export function initDevPanel() {
    // DEV BUTTON DISABLED - If dev is off, don't create button or panel
    if (!devPanelEnabled) {
        return;
    }
    
    // Initialize dev flags from localStorage
    window.devLevel11IgnoreLocks = localStorage.getItem('devLevel11IgnoreLocks') === 'true';
    
    // If panel already exists, reuse it instead of creating duplicates
    if (!document.getElementById('devPanelStyles')) {
        injectStyles();
    }

    // Clean up stray duplicates from prior inits
    const panels = document.querySelectorAll('#advancedDevPanel');
    panels.forEach((p, idx) => { if (idx > 0) p.remove(); });
    const handles = document.querySelectorAll('#devPanelHandle');
    handles.forEach((h, idx) => { if (idx > 0) h.remove(); });

    panelElement = document.getElementById('advancedDevPanel');
    handleElement = document.getElementById('devPanelHandle');

    if (!panelElement) {
        createPanel();
        devPanelBuilt = true;
    }

    if (!handleElement) {
        createHandle();
    }

    updatePanelVisibility();
    window.DEV_EVENT_LOGGER = logEvent;
}

export function wireUpDevPanel() {
    // Dev panel shortcuts disabled - DEV MODE IS OFF
    // Shortcuts are disabled to prevent accidental access
    // To re-enable, uncomment the code below:
    /*
    if (!window.__DEV_PANEL_SHORTCUTS_BOUND) {
        window.addEventListener('keydown', (e) => {
            // F1 key to toggle dev panel
            if (e.key === 'F1') {
                e.preventDefault();
                toggleDevPanel();
            }
            // Ctrl+Shift+D as backup
            if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') {
                e.preventDefault();
                toggleDevPanel();
            }
            // Ctrl+Shift+E to toggle access
            if (e.ctrlKey && e.shiftKey && e.code === 'KeyE') {
                e.preventDefault();
                toggleDevPanelAccess();
            }
        });
        window.__DEV_PANEL_SHORTCUTS_BOUND = true;
    }
    */

    if (!devPanelEnabled) {
        updatePanelVisibility();
        return;
    }

    // Wire once but refresh UI every call
    if (!devPanelWired) {
        wireTabs();
        wireInGameControls();
        wireMenuControls();
        wireAchievementInspector();
        wireConsole();
        wireThemeButtons();
        setupErrorConsole();
        devPanelWired = true;
    } else {
        refreshToggleStates();
        refreshAchievementInspector();
    }

    // Keep runtime effects alive
    clearInterval(runtimeTick);
    runtimeTick = setInterval(applyRuntimeEffects, 400);
}

// Helper function to check if Level 11 door locks should be ignored
export function isLevel11DoorLocksIgnored() {
    return localStorage.getItem('devLevel11IgnoreLocks') === 'true' || window.devLevel11IgnoreLocks === true;
}

function injectStyles() {
    const style = document.createElement('style');
    style.id = 'devPanelStyles';
    style.textContent = `
        #advancedDevPanel {
            position: fixed;
            top: 20px;
            right: 20px;
            width: ${DEV_PANEL_WIDTH}px;
            max-height: ${DEV_PANEL_HEIGHT}px;
            background: linear-gradient(135deg, #1a1a2e, #0f172a);
            color: #d9f9ff;
            font-family: 'Courier New', monospace;
            border-radius: 12px;
            box-shadow: 0 0 30px rgba(0, 217, 255, 0.3), 0 0 60px rgba(0,0,0,0.7) inset;
            display: ${devPanelVisible ? 'flex' : 'none'};
            flex-direction: column;
            overflow: hidden;
            z-index: 99999;
            user-select: none;
        }
        #advancedDevPanel .title-bar {
            background: linear-gradient(90deg, #00d9ff, #00a0d9);
            color: #000;
            padding: 10px 14px;
            font-weight: bold;
            font-size: 14px;
            cursor: move;
            border-bottom: 2px solid #00ff00;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        #advancedDevPanel .tab-bar {
            display: flex;
            border-bottom: 2px solid #00d9ff;
        }
        #advancedDevPanel .tab-bar button {
            flex: 1;
            padding: 10px;
            background: transparent;
            color: #00ff00;
            border: none;
            border-bottom: 3px solid transparent;
            cursor: pointer;
            font-weight: bold;
        }
        #advancedDevPanel .tab-bar button.active {
            border-bottom: 3px solid #00ff00;
            background: rgba(0, 0, 0, 0.2);
        }
        #advancedDevPanel .tab-content { flex: 1; overflow-y: auto; padding: 12px; display: none; }
        #advancedDevPanel .section { margin-bottom: 12px; padding: 10px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(0,217,255,0.15); }
        #advancedDevPanel .section-title { font-weight: bold; color: #00ff00; margin-bottom: 6px; }
        #advancedDevPanel .toggle-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 12px; }
        #advancedDevPanel .hint { color: #8ad7ff; font-size: 11px; margin-left: 6px; }
        #advancedDevPanel .button-row { display: flex; flex-wrap: wrap; gap: 8px; }
        #advancedDevPanel .btn { background: #00d9ff; color: #000; border: none; padding: 8px 10px; border-radius: 6px; cursor: pointer; font-weight: bold; }
        #advancedDevPanel .console-log { background: #000; color: #0f0; font-family: monospace; height: 220px; overflow-y: auto; border-radius: 8px; padding: 8px; box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.8); }
        #advancedDevPanel .command-row { display: flex; gap: 8px; margin-top: 8px; }
        #advancedDevPanel .command-row input { flex: 1; padding: 8px; border-radius: 6px; border: none; outline: none; background: rgba(255,255,255,0.08); color: #fff; }
        #advancedDevPanel .ach-list { max-height: 260px; overflow-y: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        #advancedDevPanel .ach-item { padding: 6px; border-radius: 6px; background: rgba(0,0,0,0.2); border: 1px solid rgba(0,217,255,0.15); font-size: 12px; }
        #advancedDevPanel .ach-details { background: rgba(255,255,255,0.06); border-radius: 8px; padding: 10px; line-height: 1.4; margin-top: 6px; font-size: 12px; }
        #advancedDevPanel select { width: 100%; padding: 6px; border-radius: 6px; border: none; background: rgba(255,255,255,0.08); color: #fff; }
        #devPanelHandle { position: fixed; top: 20px; right: ${devPanelCollapsed ? '20px' : `${DEV_PANEL_WIDTH + 30}px`}; background: linear-gradient(90deg, #00d9ff, #00a0d9); color: #000; padding: 8px 12px; font-weight: bold; font-size: 12px; border-radius: 8px; box-shadow: 0 0 16px rgba(0, 217, 255, 0.4); cursor: pointer; z-index: 100000; user-select: none; }
    `;
    document.head.appendChild(style);
}

function createPanel() {
    if (document.getElementById('advancedDevPanel')) {
        panelElement = document.getElementById('advancedDevPanel');
        return;
    }
    const panel = document.createElement('div');
    panel.id = 'advancedDevPanel';
    panel.innerHTML = `
        <div class="title-bar">
            <span>⚙️ DEV PANEL</span>
            <span style="font-size: 12px; opacity: 0.8;">F1 to toggle • Drag to move</span>
        </div>
        <div class="tab-bar">
            <button data-tab="In-Game" class="active">In-Game</button>
            <button data-tab="Menu">Menu</button>
            <button data-tab="Achievements">Achievements</button>
            <button data-tab="Secret Codes">Secret Codes</button>
            <button data-tab="Console">Console</button>
        </div>
        <div id="tab-In-Game" class="tab-content" style="display: block;"></div>
        <div id="tab-Menu" class="tab-content"></div>
        <div id="tab-Achievements" class="tab-content"></div>
        <div id="tab-Secret Codes" class="tab-content"></div>
        <div id="tab-Console" class="tab-content"></div>
    `;
    document.body.appendChild(panel);
    panelElement = panel;
    setupDragging(panel.querySelector('.title-bar'));

    document.getElementById('tab-In-Game').innerHTML = createInGameTab();
    document.getElementById('tab-Menu').innerHTML = createMenuTab();
    document.getElementById('tab-Achievements').innerHTML = createAchievementTab();
    document.getElementById('tab-Secret Codes').innerHTML = createSecretCodesTab();
    document.getElementById('tab-Console').innerHTML = createConsoleTab();
}

function createHandle() {
    if (document.getElementById('devPanelHandle')) {
        handleElement = document.getElementById('devPanelHandle');
        return;
    }
    const handle = document.createElement('div');
    handle.id = 'devPanelHandle';
    handle.textContent = devPanelCollapsed ? 'DEV ▼' : 'DEV ▲';
    handle.addEventListener('click', () => toggleDevPanel());
    document.body.appendChild(handle);
    handleElement = handle;
}

function createInGameTab() {
    return `
        <div class="section">
            <div class="section-title">Live Toggles</div>
            <div class="toggle-row"><label><input type="checkbox" id="toggleGodMode"> God Mode</label><span class="hint">Immortal</span></div>
            <div class="toggle-row"><label><input type="checkbox" id="toggleInstantGen"> Instant Generator</label><span class="hint">Fast charge</span></div>
            <div class="toggle-row"><label><input type="checkbox" id="toggleNoKeys"> No Keys Needed</label><span class="hint">Doors free</span></div>
            <div class="toggle-row"><label><input type="checkbox" id="toggleBossDamage"> 10x Boss Damage</label><span class="hint">Boss melts</span></div>
            <div class="toggle-row"><label><input type="checkbox" id="toggleInfStamina"> Infinite Stamina</label><span class="hint">Never drains</span></div>
            <div class="toggle-row"><label><input type="checkbox" id="toggleInfTraps"> Infinite Zap Traps</label><span class="hint">Always max</span></div>
        </div>
        <div class="section">
            <div class="section-title">Live Actions</div>
            <div class="button-row">
                <button id="addKeyButton" class="btn">Give Key</button>
                <button id="skipToBossButton" class="btn">Skip To Boss</button>
                <button id="refillZapTraps" class="btn">Max Zap Traps</button>
                <button id="giveLifeButton" class="btn">Give Life</button>
            </div>
        </div>
        <div class="section">
            <div class="section-title">Power Supply Debug</div>
            <div id="powerSupplyDebug" style="font-size: 11px; line-height: 1.6; color: #aaa; font-family: monospace; background: #222; padding: 8px; border-radius: 4px;"></div>
        </div>
    `;
}

function createMenuTab() {
    return `
        <div class="section">
            <div class="section-title">Unlocks</div>
            <div class="button-row">
                <button id="unlockAllLevels" class="btn">Unlock All Levels</button>
                <button id="unlockLevel11" class="btn">Unlock Level 11</button>
            </div>
            <div class="button-row" style="margin-top:6px;">
                <button id="unlockSkins" class="btn">Unlock All Skins</button>
                <button id="enableBazooka" class="btn">Enable Blaster</button>
            </div>
            <div class="button-row" style="margin-top:6px;">
                <button id="unlockAllAchievementsMenu" class="btn">Unlock All Achievements</button>
                <button id="clearAchievementsMenu" class="btn">Clear Achievements</button>
            </div>
        </div>
        <div class="section">
            <div class="section-title">Level 11 Testing</div>
            <div class="button-row">
                <button id="giveGreenKey" class="btn">Give Green Key</button>
                <button id="giveYellowKey" class="btn">Give Yellow Key</button>
            </div>
        </div>
        <div class="section">
            <div class="section-title">Persistence</div>
            <div class="button-row">
                <button id="saveDevSettings" class="btn">Save Dev Settings</button>
                <button id="resetDevSettings" class="btn">Reset Dev Settings</button>
            </div>
        </div>
    `;
}

function createAchievementTab() {
    return `
        <div class="section">
            <div class="section-title">Achievement Quick Tools</div>
            <div class="button-row">
                <button id="unlockAllAchievements" class="btn">Unlock All</button>
                <button id="clearAchievements" class="btn">Clear All</button>
                <button id="recheckAchievements" class="btn">🔄 Recheck</button>
            </div>
            <div id="achievementStats" style="margin-top: 8px; font-size: 13px; color: #0ff; font-weight: bold;"></div>
            <div id="challengeStatus" style="margin-top: 6px; font-size: 12px; color: #ffa500; font-weight: bold;"></div>
        </div>

        <div class="section">
            <div class="section-title">⚡ Challenges (One-Click)</div>
            <div style="font-size: 11px; color: #8ad7ff; margin-bottom: 6px;">Auto-starts from Level 1, chains 10 levels with full hearts each level.</div>
            <div class="button-row" style="gap:6px;">
                <button id="startDeathlessChallenge" class="btn" style="background:#ff5f6d; color:#000;">Start Deathless 10</button>
                <button id="startSpeedrunChallenge" class="btn" style="background:#7dffb3; color:#000;">Start 10m Speedrun</button>
                <button id="abortChallenge" class="btn" style="background:#555; color:#fff;">Abort</button>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">🔍 Real-Time Achievement Tracker</div>
            <div style="margin-bottom: 8px; font-size: 11px; color: #888;">
                Live tracking of all achievements with progress, conditions, and failure detection.
            </div>
            <div style="display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
                <button class="btn" id="filterAll" style="background: #00d9ff; font-size: 11px; padding: 6px 10px;">All (46)</button>
                <button class="btn" id="filterLocked" style="background: #666; font-size: 11px; padding: 6px 10px;">Locked</button>
                <button class="btn" id="filterUnlocked" style="background: #0a0; font-size: 11px; padding: 6px 10px;">Unlocked</button>
                <button class="btn" id="filterTracking" style="background: #f80; font-size: 11px; padding: 6px 10px;">Tracking</button>
            </div>
            <div id="achievementTrackerList" style="max-height: 380px; overflow-y: auto; background: rgba(0,0,0,0.3); border-radius: 6px; padding: 8px;"></div>
        </div>
    `;
}

function createSecretCodesTab() {
    return `
        <div class="section">
            <div class="section-title">Secret Codes</div>
            <div style="font-size: 12px; line-height: 1.8; color: #aaa;">
                <div style="margin-bottom: 12px;">
                    <strong style="color: #00ff88;">ECHOMAZE</strong><br>
                    Unlock the secret Level 11 (from main menu)
                </div>
                <div style="margin-bottom: 12px;">
                    <strong style="color: #00ff88;">ECHO-HERO</strong><br>
                    Good Ending - Unlocks Hero Theme (green glow & particles)
                </div>
                <div style="margin-bottom: 12px;">
                    <strong style="color: #ff4455;">ECHO-VIRUS</strong><br>
                    Bad Ending - Unlocks Virus Theme (red glitch & corruption)
                </div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">Visual Themes</div>
            <div style="font-size: 12px; line-height: 1.8; color: #aaa; margin-bottom: 8px;">
                Change the game's visual appearance with special effects:
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button id="themeDefault" class="dev-action-btn" style="flex: 1; min-width: 100px; background: #00f6ff20; border: 1px solid #00f6ff;">
                    Default
                </button>
                <button id="themeHero" class="dev-action-btn" style="flex: 1; min-width: 100px; background: #00ff8820; border: 1px solid #00ff88;">
                    Hero
                </button>
                <button id="themeVirus" class="dev-action-btn" style="flex: 1; min-width: 100px; background: #ff445520; border: 1px solid #ff4455;">
                    Virus
                </button>
            </div>
        </div>
    `;
}

function createConsoleTab() {
    return `
        <div class="section">
            <div class="section-title">Console & Commands</div>
            <div id="consoleLog" class="console-log"></div>
            <div class="command-row">
                <input type="text" id="consoleCommand" placeholder="Type command (help)">
                <button id="runConsoleCommand" class="btn">Run</button>
            </div>
        </div>
    `;
}

function setupDragging(titleBar) {
    titleBar.addEventListener('mousedown', (e) => {
        isDragging = true;
        const rect = panelElement.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
    });
    document.addEventListener('mousemove', (e) => {
        if (!isDragging || !panelElement) return;
        const newLeft = e.clientX - dragOffsetX;
        const newTop = e.clientY - dragOffsetY;
        panelElement.style.left = `${newLeft}px`;
        panelElement.style.right = 'auto';
        panelElement.style.top = `${newTop}px`;
    });
    document.addEventListener('mouseup', () => { isDragging = false; });
}

function wireTabs() {
    const buttons = panelElement.querySelectorAll('.tab-bar button');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tabName = btn.getAttribute('data-tab');
            panelElement.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
            const target = document.getElementById(`tab-${tabName}`);
            if (target) target.style.display = 'block';
            if (tabName === 'Achievements') refreshAchievementInspector();
            if (tabName === 'In-Game') refreshToggleStates();
        });
    });
}

function wireInGameControls() {
    refreshToggleStates();

    const bindToggle = (id, handler) => {
        const el = document.getElementById(id);
        if (el && !el.dataset.wired) {
            el.addEventListener('change', (e) => handler(e.target.checked));
            el.dataset.wired = 'true';
        }
    };

    bindToggle('toggleGodMode', (checked) => { setGodMode(checked); logEvent('godMode', { enabled: checked }); });
    bindToggle('toggleBossDamage', (checked) => { setBossDamage10x(checked); window.DEV_10X_BOSS_DAMAGE = checked; logEvent('bossDamage10x', { enabled: checked }); });
    bindToggle('toggleInstantGen', (checked) => { localStorage.setItem('devInstantGen', checked ? 'true' : 'false'); window.DEV_INSTANT_GEN = checked; window.__instaGenEnabled = checked; logEvent('instantGen', { enabled: checked }); });
    bindToggle('toggleNoKeys', (checked) => { localStorage.setItem('devNoKeys', checked ? 'true' : 'false'); window.DEV_NO_KEYS = checked; logEvent('noKeys', { enabled: checked }); });
    bindToggle('toggleInfStamina', (checked) => { localStorage.setItem('devInfStamina', checked ? 'true' : 'false'); logEvent('infStamina', { enabled: checked }); });
    bindToggle('toggleInfTraps', (checked) => { localStorage.setItem('devInfTraps', checked ? 'true' : 'false'); logEvent('infTraps', { enabled: checked }); });

    const bindClick = (id, fn) => { const el = document.getElementById(id); if (el && !el.dataset.wired) { el.addEventListener('click', fn); el.dataset.wired = 'true'; } };
    bindClick('addKeyButton', () => { if (window.gameState) { window.gameState.keys = (window.gameState.keys || 0) + 1; logEvent('giveKey'); } });
    bindClick('skipToBossButton', () => { setUnlockedLevel(10); logEvent('skipBoss'); });
    bindClick('refillZapTraps', () => { if (window.gameState) { window.gameState.zapTraps = 9; logEvent('trapsRefill'); } });
    bindClick('giveLifeButton', () => { if (window.gameState) { window.gameState.lives = Math.max(1, (window.gameState.lives || 0) + 1); logEvent('lifeGiven', { lives: window.gameState.lives }); } });
}

function wireMenuControls() {
    const bindClick = (id, fn) => { const el = document.getElementById(id); if (el && !el.dataset.wired) { el.addEventListener('click', fn); el.dataset.wired = 'true'; } };
    bindClick('unlockAllLevels', () => { setUnlockedLevel(11); setLevel11Unlocked(true); logEvent('unlockLevels'); });
    bindClick('unlockLevel11', () => { setLevel11Unlocked(true); logEvent('unlockLevel11'); });
    bindClick('unlockSkins', () => { import('./skins.js').then(mod => mod.unlockAllSkins?.()); logEvent('unlockSkins'); });
    bindClick('enableBazooka', () => { setBazookaModeUnlocked(true); setBazookaMode(true); logEvent('bazooka'); });
    bindClick('unlockAllAchievementsMenu', () => unlockAllAchievements());
    bindClick('clearAchievementsMenu', () => clearAchievements());
    bindClick('saveDevSettings', () => { localStorage.setItem('devPanelEnabled', devPanelEnabled ? 'true' : 'false'); logEvent('saveSettings'); });
    bindClick('resetDevSettings', () => { localStorage.clear(); logEvent('resetSettings'); });
    
    // Level 11 key buttons
    bindClick('giveGreenKey', () => {
        import('./level11.js').then(mod => {
            if (mod.devGiveGreenKey) {
                mod.devGiveGreenKey();
                logEvent('giveGreenKey');
            }
        }).catch(() => {});
    });
    bindClick('giveYellowKey', () => {
        import('./level11.js').then(mod => {
            if (mod.devGiveYellowKey) {
                mod.devGiveYellowKey();
                logEvent('giveYellowKey');
            }
        }).catch(() => {});
    });
}

function refreshToggleStates() {
    const setChecked = (id, value) => { const el = document.getElementById(id); if (el) el.checked = value; };
    setChecked('toggleGodMode', isGodMode());
    setChecked('toggleBossDamage', isBossDamage10x());
    setChecked('toggleInstantGen', localStorage.getItem('devInstantGen') === 'true');
    setChecked('toggleNoKeys', localStorage.getItem('devNoKeys') === 'true');
    setChecked('toggleInfStamina', localStorage.getItem('devInfStamina') === 'true');
    setChecked('toggleInfTraps', localStorage.getItem('devInfTraps') === 'true');
}

function wireAchievementInspector() {
    // Set up achievement stats display
    updateAchievementStats();
    
    // Set up filter buttons
    const filterAll = document.getElementById('filterAll');
    const filterLocked = document.getElementById('filterLocked');
    const filterUnlocked = document.getElementById('filterUnlocked');
    const filterTracking = document.getElementById('filterTracking');
    
    let currentFilter = 'all';
    
    if (filterAll && !filterAll.dataset.wired) {
        filterAll.addEventListener('click', () => { currentFilter = 'all'; renderAchievementTracker(); updateFilterButtons(); });
        filterAll.dataset.wired = 'true';
    }
    if (filterLocked && !filterLocked.dataset.wired) {
        filterLocked.addEventListener('click', () => { currentFilter = 'locked'; renderAchievementTracker(); updateFilterButtons(); });
        filterLocked.dataset.wired = 'true';
    }
    if (filterUnlocked && !filterUnlocked.dataset.wired) {
        filterUnlocked.addEventListener('click', () => { currentFilter = 'unlocked'; renderAchievementTracker(); updateFilterButtons(); });
        filterUnlocked.dataset.wired = 'true';
    }
    if (filterTracking && !filterTracking.dataset.wired) {
        filterTracking.addEventListener('click', () => { currentFilter = 'tracking'; renderAchievementTracker(); updateFilterButtons(); });
        filterTracking.dataset.wired = 'true';
    }
    
    function updateFilterButtons() {
        [filterAll, filterLocked, filterUnlocked, filterTracking].forEach(btn => {
            if (btn) btn.style.background = '#666';
        });
        if (currentFilter === 'all' && filterAll) filterAll.style.background = '#00d9ff';
        if (currentFilter === 'locked' && filterLocked) filterLocked.style.background = '#00d9ff';
        if (currentFilter === 'unlocked' && filterUnlocked) filterUnlocked.style.background = '#00d9ff';
        if (currentFilter === 'tracking' && filterTracking) filterTracking.style.background = '#00d9ff';
    }
    
    // Initial render
    renderAchievementTracker();
    updateFilterButtons();
    
    // Start real-time updates
    if (window.__ACHIEVEMENT_TRACKER_INTERVAL) {
        clearInterval(window.__ACHIEVEMENT_TRACKER_INTERVAL);
    }
    window.__ACHIEVEMENT_TRACKER_INTERVAL = setInterval(() => {
        if (devPanelVisible && !devPanelCollapsed) {
            renderAchievementTracker();
            updateAchievementStats();
        }
    }, 500); // Update twice per second
    
    bindAchievementButtons();
}

function bindAchievementButtons() {
    const bindClick = (id, fn) => { const el = document.getElementById(id); if (el && !el.dataset.wired) { el.addEventListener('click', fn); el.dataset.wired = 'true'; } };
    
    bindClick('unlockAllAchievements', unlockAllAchievements);
    bindClick('clearAchievements', clearAchievements);
    bindClick('recheckAchievements', () => {
        if (window.ACHIEVEMENT && window.ACHIEVEMENT.recheck) {
            const count = window.ACHIEVEMENT.recheck();
            logEvent('achRecheck', { unlocked: count });
            renderAchievementTracker();
            updateAchievementStats();
            alert(`Recheck complete! ${count} achievement(s) unlocked.`);
        }
    });

    bindClick('startDeathlessChallenge', () => startChallenge('deathless'));
    bindClick('startSpeedrunChallenge', () => startChallenge('speedrun10'));
    bindClick('abortChallenge', () => {
        window.__CHALLENGE = { active: false, aborted: true };
        updateChallengeStatus();
        alert('Challenge aborted.');
    });
}

function updateAchievementStats() {
    const statsEl = document.getElementById('achievementStats');
    if (!statsEl) return;
    
    const unlocked = getUnlockedAchievements() || [];
    const total = ACHIEVEMENTS.length;
    const percentage = total > 0 ? Math.floor((unlocked.length / total) * 100) : 0;
    
    statsEl.innerHTML = `Progress: ${unlocked.length}/${total} (${percentage}%) unlocked`;
    updateChallengeStatus();
}

function updateChallengeStatus() {
    const el = document.getElementById('challengeStatus');
    if (!el) return;
    const ch = window.__CHALLENGE;
    if (!ch || !ch.active) {
        el.textContent = 'No active challenge';
        el.style.color = '#888';
        return;
    }
    const elapsed = ch.startedAt ? Math.floor((performance.now() - ch.startedAt) / 1000) : 0;
    const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const secs = (elapsed % 60).toString().padStart(2, '0');
    el.style.color = '#ffa500';
    const name = ch.type === 'deathless' ? 'Deathless 10' : 'Speedrun 10m';
    el.textContent = `Challenge: ${name} • Level ${ch.levelsCompleted + 1}/10 • Time ${mins}:${secs} ${ch.failed ? '(FAILED)' : ''}`;
}

function startChallenge(type) {
    window.__CHALLENGE = {
        active: true,
        type,
        startedAt: performance.now(),
        levelsCompleted: 0,
        failed: false,
    };
    updateChallengeStatus();
    // Auto-jump into Level 1 chain if possible
    if (window.__START_LEVEL) {
        window.__START_LEVEL(1);
    } else {
        alert('Challenge armed. Start Level 1 to begin.');
    }
}

function renderAchievementTracker() {
    const container = document.getElementById('achievementTrackerList');
    if (!container) return;
    
    const unlockedSet = new Set((getUnlockedAchievements() || []).map(a => a.id));
    const filterButtons = document.querySelectorAll('[id^="filter"]');
    let currentFilter = 'all';
    filterButtons.forEach(btn => {
        if (btn.style.background === 'rgb(0, 217, 255)') {
            currentFilter = btn.id.replace('filter', '').toLowerCase();
        }
    });
    
    // Filter achievements
    let filteredAchs = ACHIEVEMENTS;
    if (currentFilter === 'locked') {
        filteredAchs = ACHIEVEMENTS.filter(a => !unlockedSet.has(a.id));
    } else if (currentFilter === 'unlocked') {
        filteredAchs = ACHIEVEMENTS.filter(a => unlockedSet.has(a.id));
    } else if (currentFilter === 'tracking') {
        // Show achievements with trackable progress
        filteredAchs = ACHIEVEMENTS.filter(a => !unlockedSet.has(a.id) && hasTrackableProgress(a));
    }
    
    container.innerHTML = filteredAchs.map(ach => renderAchievementCard(ach, unlockedSet.has(ach.id))).join('');
    
    // Wire up unlock buttons
    container.querySelectorAll('[data-unlock-ach]').forEach(btn => {
        btn.addEventListener('click', () => {
            const achId = btn.dataset.unlockAch;
            if (window.ACHIEVEMENT) {
                if (window.ACHIEVEMENT.enable) window.ACHIEVEMENT.enable();
                if (window.ACHIEVEMENT.unlock) window.ACHIEVEMENT.unlock(achId);
                logEvent('achUnlock', { id: achId });
                setTimeout(() => renderAchievementTracker(), 100);
                updateAchievementStats();
            }
        });
    });
}

function hasTrackableProgress(ach) {
    // Achievements with progress tracking
    const trackable = [
        'first_death', 'generator_perfect_3', 'generator_perfect_10', 'perfect_shield_10',
        'boss_mount_3_pigs', 'trap_master', 'deathless_3_levels', 'no_abilities_3_consecutive',
        'total_deaths_100', 'endless_no_abilities_10'
    ];
    return trackable.includes(ach.id);
}

function renderAchievementCard(ach, unlocked) {
    const tierColors = {
        bronze: '#CD7F32',
        silver: '#C0C0C0',
        gold: '#FFD700',
        platinum: '#E5E4E2',
        diamond: '#00CED1',
        rgb: '#ff66ff'
    };
    
    const color = tierColors[ach.tier] || '#888';
    const bgColor = ach.tier === 'rgb'
        ? (unlocked ? 'linear-gradient(135deg, #1f0033, #330066, #6600cc)' : 'linear-gradient(135deg, #0f001a, #1a0033, #2a004d)')
        : (unlocked ? 'rgba(0, 255, 0, 0.1)' : 'rgba(0, 0, 0, 0.2)');
    const borderColor = ach.tier === 'rgb'
        ? 'rgba(255,102,255,0.6)'
        : (unlocked ? 'rgba(0, 255, 0, 0.3)' : color + '40');
    
    // Get progress info
    const progress = getAchievementProgress(ach);
    const conditions = getAchievementConditionsText(ach);
    const failureStatus = getAchievementFailureStatus(ach);
    
    let progressBar = '';
    if (progress.current !== undefined && progress.max > 0 && !unlocked) {
        const percent = Math.min(100, (progress.current / progress.max) * 100);
        progressBar = `
            <div style="margin-top: 4px;">
                <div style="background: rgba(0,0,0,0.3); border-radius: 4px; height: 12px; overflow: hidden;">
                    <div style="background: linear-gradient(90deg, #0ff, #0a0); height: 100%; width: ${percent}%; transition: width 0.3s;"></div>
                </div>
                <div style="font-size: 10px; color: #0ff; margin-top: 2px;">${progress.current}/${progress.max} ${progress.label || ''}</div>
            </div>
        `;
    }
    
    let failureIndicator = '';
    if (failureStatus.failed) {
        failureIndicator = `<div style="color: #f44; font-size: 10px; margin-top: 4px;">❌ ${failureStatus.reason}</div>`;
    } else if (failureStatus.tracking) {
        failureIndicator = `<div style="color: #f80; font-size: 10px; margin-top: 4px;">👁️ Tracking...</div>`;
    }
    
    const unlockBtn = unlocked ? '' : `<button data-unlock-ach="${ach.id}" style="background: #00d9ff; color: #000; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 10px; margin-top: 4px;">🔓 Unlock</button>`;
    
    return `
        <div style="background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 8px; padding: 8px; margin-bottom: 6px; box-shadow: ${ach.tier === 'rgb' ? '0 0 12px rgba(255,102,255,0.35)' : 'none'};">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <div style="font-weight: bold; color: ${color}; font-size: 12px;">
                        ${unlocked ? '✅ ' : ''}${ach.name}
                        ${ach.secret ? ' 🔒' : ''}
                        ${ach.isRGB ? ' 🌈' : ''}
                    </div>
                    <div style="font-size: 10px; color: #888; margin-top: 2px;">${ach.tier.toUpperCase()} • ${ach.desc}</div>
                    ${ach.unlockSkin ? `<div style="font-size: 10px; color: #0ff; margin-top: 2px;">🎨 Unlocks: ${ach.unlockSkin} skin</div>` : ''}
                </div>
            </div>
            ${conditions}
            ${progressBar}
            ${failureIndicator}
            ${unlockBtn}
        </div>
    `;
}

function getAchievementProgress(ach) {
    const stats = window.PLAYER_STATS ? window.PLAYER_STATS.stats : {};
    const state = window.gameState || gameState;
    
    const progressMap = {
        first_death: { current: stats.totalDeaths || 0, max: 1, label: 'deaths' },
        generator_perfect_3: { current: stats.perfectGenerators || 0, max: 3, label: 'perfect generators' },
        generator_perfect_10: { current: stats.perfectGenerators || 0, max: 10, label: 'perfect generators' },
        perfect_shield_10: { current: stats.reflectedProjectiles || 0, max: 10, label: 'reflects' },
        boss_mount_3_pigs: { current: stats.pigsMounted || 0, max: 3, label: 'pigs mounted' },
        trap_master: { current: stats.trappedEnemies || 0, max: 25, label: 'enemies trapped' },
        deathless_3_levels: { current: stats.consecutiveDeathlessLevels || 0, max: 3, label: 'deathless levels' },
        no_abilities_3_consecutive: { current: stats.consecutiveNoAbilityLevels || 0, max: 3, label: 'no-ability levels' },
        total_deaths_100: { current: stats.totalDeaths || 0, max: 100, label: 'deaths' },
        endless_no_abilities_10: { current: stats.endlessNoAbilityWaves || 0, max: 10, label: 'waves' },
    };
    
    return progressMap[ach.id] || { current: undefined, max: 0 };
}

function getAchievementConditionsText(ach) {
    const conditionsMap = {
        level1_clear: 'Complete Level 1',
        level5_clear: 'Complete Level 5',
        level10_clear: 'Defeat the boss in Level 10',
        ending_good: 'Unlock L11 → Press E at power → Choose YES → Get note',
        ending_bad: 'Unlock L11 → Press E at power → Choose NO',
        ending_normal: 'Collect 3 glitch orbs → Beat L10',
        speedrun_level_60s: 'Complete any level in under 60 seconds',
        speedrun_level3_30s: 'Complete Level 3 in under 30 seconds',
        no_abilities_level: 'Complete a level without using Space/Shift',
        endless_wave_5: 'Reach wave 5 in Endless mode',
        endless_wave_10: 'Reach wave 10 in Endless mode',
        endless_wave_15: 'Reach wave 15 in Endless mode',
        endless_wave_25: 'Reach wave 25 in Endless mode',
        endless_wave_35: 'Reach wave 35 in Endless mode',
        endless_wave_45: 'Reach wave 45 in Endless mode',
        all_endings: 'Unlock all 3 endings (auto-unlocks)',
        game_complete: 'Beat the entire game',
        speedrun_game_20m: 'Beat game in under 20 minutes',
        speedrun_game_10m: 'Beat game in under 10 minutes',
        deathless_game: 'Beat game without dying',
        level11_unlock: 'Enter code ECHOMAZE in main menu',
        secret_level11_power: 'Discover power supply in Level 11',
        secret_code_alpha: 'Enter a secret terminal code',
        bazooka_mode_unlock: 'Unlock the Blaster weapon',
        bazooka_boss_victory: 'Defeat boss with Blaster equipped',
        why_destroy_power: 'Destroy power supply with Blaster',
        '100_percent': 'Unlock all other achievements',
    };
    
    const text = conditionsMap[ach.id] || ach.desc;
    return `<div style="font-size: 10px; color: #aaa; margin-top: 4px; line-height: 1.4;">📋 ${text}</div>`;
}

function getAchievementFailureStatus(ach) {
    const state = window.gameState || gameState;
    
    // Check if currently in a run that could fail this achievement
    if (!state || !state.gameStatus) {
        return { failed: false, tracking: false };
    }
    
    // Example: Track if abilities were used (fails no_abilities achievements)
    if (ach.id === 'no_abilities_level' || ach.id === 'no_abilities_3_consecutive') {
        if (state.abilitiesUsed === true && state.gameStatus === 'running') {
            return { failed: true, reason: 'Used abilities this level', tracking: false };
        }
        if (state.gameStatus === 'running') {
            return { failed: false, tracking: true };
        }
    }
    
    // Track deathless runs
    if (ach.id === 'deathless_3_levels' || ach.id === 'deathless_game') {
        const stats = window.PLAYER_STATS ? window.PLAYER_STATS.stats : {};
        if (stats.sessionDeaths > 0) {
            return { failed: true, reason: 'Died this session', tracking: false };
        }
        if (state.gameStatus === 'running') {
            return { failed: false, tracking: true };
        }
    }
    
    return { failed: false, tracking: false };
}

function unlockAllAchievements() {
    if (window.ACHIEVEMENT) {
        if (window.ACHIEVEMENT.enable) window.ACHIEVEMENT.enable();
        if (window.ACHIEVEMENT.unlockAll) window.ACHIEVEMENT.unlockAll();
        logEvent('achUnlockAll');
        renderAchievementTracker();
        updateAchievementStats();
    }
}

function clearAchievements() {
    if (window.ACHIEVEMENT) {
        if (window.ACHIEVEMENT.enable) window.ACHIEVEMENT.enable();
        if (window.ACHIEVEMENT.clear) window.ACHIEVEMENT.clear();
        logEvent('achClear');
        renderAchievementTracker();
        updateAchievementStats();
    }
}

function wireConsole() {
    const logBox = document.getElementById('consoleLog');
    if (logBox && logBox.children.length === 0) {
        logBox.innerHTML = '<div>[console ready]</div>';
    }
    const input = document.getElementById('consoleCommand');
    const runBtn = document.getElementById('runConsoleCommand');
    if (runBtn && input) {
        runBtn.addEventListener('click', () => runCommand(input.value.trim()));
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') runCommand(input.value.trim()); });
    }
}

function wireThemeButtons() {
    const bindTheme = (id, themeName) => {
        const btn = document.getElementById(id);
        if (btn && !btn.dataset.wired) {
            btn.addEventListener('click', () => {
                if (window.THEME && window.THEME.set) {
                    window.THEME.set(themeName);
                    logEvent('themeChange', { theme: themeName });
                }
            });
            btn.dataset.wired = 'true';
        }
    };
    
    bindTheme('themeDefault', 'default');
    bindTheme('themeHero', 'hero');
    bindTheme('themeVirus', 'virus');
}

function runCommand(cmd) {
    if (!cmd) return;
    const parts = cmd.split(/\s+/);
    const base = parts[0].toLowerCase();
    const arg = parts[1];
    switch (base) {
        case 'help':
            logEvent('cmd', { msg: 'Commands: help, god on/off, stamina on/off, traps on/off, life, key, clear' });
            break;
        case 'god':
            setGodMode(arg === 'on');
            logEvent('cmd', { msg: `God mode ${arg}` });
            break;
        case 'stamina':
            localStorage.setItem('devInfStamina', arg === 'on' ? 'true' : 'false');
            logEvent('cmd', { msg: `Infinite stamina ${arg}` });
            break;
        case 'traps':
            localStorage.setItem('devInfTraps', arg === 'on' ? 'true' : 'false');
            logEvent('cmd', { msg: `Infinite traps ${arg}` });
            break;
        case 'life':
            if (window.gameState) { window.gameState.lives = Math.max(1, (window.gameState.lives || 0) + 1); logEvent('cmd', { msg: 'Life given' }); }
            break;
        case 'key':
            if (window.gameState) { window.gameState.keys = (window.gameState.keys || 0) + 1; logEvent('cmd', { msg: 'Key added' }); }
            break;
        case 'clear':
            const logBox = document.getElementById('consoleLog');
            if (logBox) logBox.innerHTML = '<div>[cleared]</div>';
            eventLog = [];
            break;
        default:
            logEvent('cmd', { msg: `Unknown: ${cmd}` });
    }
}

function setupErrorConsole() {
    if (window.__DEV_PANEL_ERRORS_WIRED) return;
    
    // Intercept console.log to show in dev panel
    const originalLog = console.log;
    console.log = function(...args) {
        // Call original console.log
        originalLog.apply(console, args);
        // Also log to dev panel
        const msg = args.map(arg => {
            if (typeof arg === 'object') return JSON.stringify(arg);
            return String(arg);
        }).join(' ');
        logEvent('log', { msg });
    };
    
    window.addEventListener('error', (e) => {
        logEvent('error', { msg: e.message });
    });
    window.addEventListener('unhandledrejection', (e) => {
        logEvent('unhandledrejection', { msg: e.reason?.message || e.reason });
    });
    window.__DEV_PANEL_ERRORS_WIRED = true;
}

function evaluateAchievementStatus(id) {
    const state = window.gameState || gameState;
    if (!state) return { met: false, message: 'Game state unavailable' };
    switch (id) {
        case 'level1_clear': return { met: state.level >= 1, message: state.level >= 1 ? 'Level ≥1 reached' : 'Play Level 1' };
        case 'level5_clear': return { met: state.level >= 5, message: state.level >= 5 ? 'Level ≥5 reached' : 'Reach Level 5' };
        case 'level10_clear': return { met: state.level >= 10, message: state.level >= 10 ? 'Level ≥10 reached' : 'Reach Level 10' };
        case 'first_death': return { met: (state.totalDeaths || 0) > 0, message: state.totalDeaths > 0 ? 'Already died once' : 'Die once' };
        default: return { met: false, message: 'Live check not tracked here; use unlock tools.' };
    }
}

function getAchievementHint(ach) {
    const hints = {
        level1_clear: 'Play and complete Level 1.',
        level5_clear: 'Play and complete Level 5.',
        level10_clear: 'Defeat the boss at the end of Level 10.',
        first_death: 'Get hit once by an enemy to die.',
        pet_pig: 'Find a fallen/stunned pig and don\'t attack it (just walk near it gently).',
        hub_dance: 'In the menu hub, press movement keys rhythmically to dance.',
        endless_wave_10: 'Survive 10 waves in Endless mode.',
        endless_wave_5: 'Survive 5 waves in Endless mode.',
        endless_wave_10: 'Survive 10 waves in Endless mode.',
        endless_wave_15: 'Survive 15 waves in Endless mode.',
        endless_wave_25: 'Survive 25 waves in Endless mode.',
        endless_wave_35: 'Survive 35 waves in Endless mode.',
        endless_wave_45: 'Survive 45 waves in Endless mode.',
        wall_hugger: 'Stand touching the same wall for 30 continuous seconds.',
        spin_cycle: 'Rapidly spin in circles 5 times (hold a direction and press Space to rotate).',
        ending_good: 'Beat the game with the good ending.',
        ending_bad: 'Beat the game with the bad ending.',
        ending_normal: 'Beat the game with the normal ending. Hint: Have you ever noticed those glitches after you complete all the generators? I\'ve seen them on quite a few levels.',
        boss_mount_3_pigs: 'Ride 3 different flying pigs during the boss fight.',
        boss_ammo_efficient: 'Beat the boss using 6 or fewer ammo reloads.',
        trap_master: 'Catch 25 total enemies with zap traps.',
        generator_perfect_3: 'Hit skill checks on all 3 generators in one run.',
        generator_perfect_10: 'Hit skill checks on 10 generators total.',
        speedrun_level_60s: 'Complete any level in under 60 seconds.',
        speedrun_level3_30s: 'Complete Level 3 in under 30 seconds.',
        speedrun_game_20m: 'Beat the entire game in under 20 minutes.',
        speedrun_game_10m: 'Beat the entire game in under 10 minutes.',
        deathless_3_levels: 'Complete 3 consecutive levels without dying.',
        deathless_game: 'Beat the entire game without dying once.',
        endless_no_abilities_10: 'Survive 10 endless waves without using abilities.',
        no_abilities_level: 'Complete a level without sprint/block/jump.',
        no_abilities_3_consecutive: 'Complete 3 levels without using any abilities.',
        perfect_generator_run: 'Perfect all generator checks in a single run.',
        shield_perfect_level: 'Take no damage AND reflect 10 projectiles in one level.',
        perfect_shield_10: 'Reflect 10 projectiles with perfect blocks.',
        secret_note: 'Find the hidden note in a level.',
        corner_dweller: 'Visit all 4 map corners before time expires.',
        endless_perfect_wave: 'Complete an endless wave without taking any damage.',
        all_endings: 'Unlock all three ending paths.',
        game_complete: 'Beat the game.',
        '100_percent': 'Unlock all 56 achievements.',
        secret_level11_power: 'Discover the power supply in Level 11.',
        secret_code_alpha: 'Enter a secret terminal code.',
        bazooka_mode_unlock: 'Unlock the Blaster weapon.',
        level4_no_sprint: 'Complete Level 4 without sprinting (no Shift key).',
        glitch_teleport_escape: 'Dodge damage using teleport 5+ times.',
    };
    return hints[ach.id] || ach.desc || 'Play and explore to unlock.';
}

function renderAchievementDetails(id) {
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    const box = document.getElementById('achievementDetails');
    if (!ach || !box) return;
    
    const unlockedSet = new Set((getUnlockedAchievements() || []).map(a => a.id));
    const unlocked = unlockedSet.has(id);
    
    // Get detailed conditions
    const conditionInfo = getAchievementConditions(id);
    
    let html = `
        <div style="margin-bottom: 8px;">
            <strong style="font-size: 14px; color: #00f6ff;">${ach.name}</strong> 
            <span style="color: #${unlocked ? '00ff00' : 'ffaa00'};">[${ach.tier.toUpperCase()}]</span>
        </div>
        <div style="margin-bottom: 6px; color: #d0d0d0;">${ach.desc}</div>
        <div style="margin-bottom: 4px; color: #aaa;">Unlocks: ${ach.unlockSkin || '—'}</div>
        <div style="margin-bottom: 8px; color: #aaa;">Secret: ${ach.secret ? 'Yes' : 'No'}</div>
        <div style="margin-bottom: 10px; padding: 6px; background: rgba(0,0,0,0.3); border-radius: 4px;">
            <strong style="color: ${unlocked ? '#00ff00' : '#ffcc00'};">
                Status: ${unlocked ? '✓ UNLOCKED' : '○ LOCKED'}
            </strong>
        </div>
    `;
    
    if (conditionInfo) {
        html += `
            <div style="margin-bottom: 8px;">
                <strong style="color: #00d9ff;">Category:</strong> 
                <span style="color: #fff;">${conditionInfo.category}</span>
            </div>
        `;
        
        if (conditionInfo.hint) {
            html += `
                <div style="margin-bottom: 10px; padding: 6px; background: rgba(0,217,255,0.1); border-left: 3px solid #00d9ff; color: #8ad7ff;">
                    💡 ${conditionInfo.hint}
                </div>
            `;
        }
        
        html += `
            <div style="margin-top: 12px; margin-bottom: 8px;">
                <strong style="color: #00ff00;">Requirements:</strong>
            </div>
        `;
        
        conditionInfo.conditions.forEach((cond, idx) => {
            const percentage = cond.max > 0 ? Math.min(100, (cond.current / cond.max) * 100) : 0;
            const statusColor = cond.met ? '#00ff00' : '#ffaa00';
            const statusIcon = cond.met ? '✓' : '○';
            
            html += `
                <div style="margin-bottom: 8px; padding: 6px; background: rgba(0,0,0,0.2); border-radius: 4px;">
                    <div style="margin-bottom: 4px; color: ${statusColor};">
                        ${statusIcon} ${cond.label}
                    </div>
            `;
            
            // Show progress bar if there's a max value
            if (cond.max > 1 || !cond.met) {
                html += `
                    <div style="margin-top: 4px; font-size: 11px; color: #aaa;">
                        Progress: ${cond.current}/${cond.max} (${percentage.toFixed(0)}%)
                    </div>
                    <div style="
                        width: 100%;
                        height: 8px;
                        background: rgba(0, 0, 0, 0.5);
                        border-radius: 4px;
                        overflow: hidden;
                        border: 1px solid ${statusColor};
                        margin-top: 4px;
                    ">
                        <div style="
                            width: ${percentage}%;
                            height: 100%;
                            background: linear-gradient(90deg, ${statusColor}, ${statusColor}aa);
                            transition: width 0.3s ease;
                        "></div>
                    </div>
                `;
            }
            
            html += `</div>`;
        });
        
        // Overall status
        const allMet = conditionInfo.allMet;
        html += `
            <div style="margin-top: 12px; padding: 8px; background: rgba(${allMet ? '0,255,0' : '255,170,0'},0.1); border: 2px solid ${allMet ? '#00ff00' : '#ffaa00'}; border-radius: 4px; text-align: center;">
                <strong style="color: ${allMet ? '#00ff00' : '#ffaa00'}; font-size: 13px;">
                    ${allMet ? (unlocked ? '✓ ACHIEVEMENT UNLOCKED!' : '⚠ CONDITIONS MET - Should unlock on next check') : '○ Working on it...'}
                </strong>
            </div>
        `;
    }
    
    box.innerHTML = html;
}

function refreshAchievementInspector() {
    // Legacy function - now redirects to new tracker
    renderAchievementTracker();
    updateAchievementStats();
}

function applyRuntimeEffects() {
    const state = window.gameState || gameState;
    if (!state) return;
    if (localStorage.getItem('devInfStamina') === 'true') {
        state.stamina = 100;
        state.isStaminaCoolingDown = false;
    }
    if (localStorage.getItem('devInfTraps') === 'true') {
        state.zapTraps = 9;
    }
    if (localStorage.getItem('devNoKeys') === 'true') {
        state.keys = Math.max(state.keys || 0, 1);
    }
    if (isGodMode()) {
        state.lives = Math.max(state.lives || 1, 3);
    }

    // Update power supply debug info
    const debugBox = document.getElementById('powerSupplyDebug');
    if (debugBox) {
        const ps = state.powerSystemPos;
        const psDestroyed = state.powerSystemDestroyed;
        const projCount = (state.projectiles || []).length;
        
        let debugText = `Level 11: ${state.isLevel11 ? 'YES' : 'NO'}<br>`;
        debugText += `Power Supply: ${ps ? `(${ps.x},${ps.y})` : 'null'}<br>`;
        debugText += `Destroyed: ${psDestroyed ? 'YES' : 'NO'}<br>`;
        debugText += `Projectiles: ${projCount}<br>`;
        
        if (ps && projCount > 0) {
            // Show closest projectile distance to power supply
            const projectiles = state.projectiles || [];
            let minDist = Infinity;
            projectiles.forEach(p => {
                const dx = Math.abs(p.x - (ps.x + 0.5));
                const dy = Math.abs(p.y - (ps.y + 0.5));
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minDist) minDist = dist;
            });
            debugText += `Closest proj: ${minDist.toFixed(2)} tiles<br>`;
            debugText += `<span style="color: ${minDist <= 1.5 ? '#00ff00' : '#ffaa00'}">Hit radius: 1.5 tiles</span>`;
        }
        
        debugBox.innerHTML = debugText;
    }
    
    // Update achievement details in real-time if visible
    const select = document.getElementById('achievementSelect');
    const detailsBox = document.getElementById('achievementDetails');
    if (select && detailsBox && select.value) {
        // Only update if the Achievements tab is visible
        const achTab = document.querySelector('[data-tab="achievements"]');
        if (achTab && achTab.classList.contains('active')) {
            renderAchievementDetails(select.value);
        }
    }
}

function logEvent(event, payload = {}) {
    const time = new Date().toLocaleTimeString();
    const line = `[${time}] ${event}${Object.keys(payload).length ? ' ' + JSON.stringify(payload) : ''}`;
    eventLog.push(line);
    if (eventLog.length > 150) eventLog.shift();
    const logBox = document.getElementById('consoleLog');
    if (logBox) {
        const div = document.createElement('div');
        div.textContent = line;
        logBox.appendChild(div);
        logBox.scrollTop = logBox.scrollHeight;
    }
}

function toggleDevPanel() {
    if (!devPanelEnabled) {
        alert('Dev Panel disabled. Press Ctrl+Shift+E to enable.');
        return;
    }
    devPanelCollapsed = !devPanelCollapsed;
    localStorage.setItem('devPanelCollapsed', devPanelCollapsed ? 'true' : 'false');
    devPanelVisible = !devPanelCollapsed;
    updatePanelVisibility();
}

function toggleDevPanelAccess() {
    devPanelEnabled = !devPanelEnabled;
    localStorage.setItem('devPanelEnabled', devPanelEnabled ? 'true' : 'false');
    devPanelVisible = devPanelEnabled && !devPanelCollapsed;
    if (!devPanelEnabled && runtimeTick) {
        clearInterval(runtimeTick);
        runtimeTick = null;
    }
    updatePanelVisibility();
}

function updatePanelVisibility() {
    if (panelElement) {
        panelElement.style.display = devPanelVisible ? 'flex' : 'none';
    }
    if (handleElement) {
        handleElement.textContent = devPanelEnabled ? (devPanelCollapsed ? 'DEV ▼' : 'DEV ▲') : 'DEV OFF';
        handleElement.style.right = devPanelCollapsed ? '20px' : `${DEV_PANEL_WIDTH + 30}px`;
    }
}

// Expose for debugging
window.toggleDevPanel = toggleDevPanel;
window.toggleDevPanelAccess = toggleDevPanelAccess;
window.logDevEvent = logEvent;

// Auto-init once so the panel exists in menus too
if (!window.__DEV_PANEL_AUTO_INIT) {
    window.__DEV_PANEL_AUTO_INIT = true;
    const boot = () => { initDevPanel(); wireUpDevPanel(); };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
}
