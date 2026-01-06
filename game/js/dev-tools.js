// dev-tools.js - Development tools for testing endless mode

let devPanelVisible = false;
let devToolsUnlocked = false;

function setEndlessButtonLabel(text) {
    const btn = document.getElementById('endlessDevToolsBtn');
    if (btn) btn.textContent = text;
}

export function initDevTools() {
    console.log('Dev Tools Initialized');
    
    // Dev tools in endless mode always start locked - require password for access
    devToolsUnlocked = false;
    setEndlessButtonLabel('🔐 Dev Tools');
}

// Unlock from main menu
function unlockDevToolsAccess() {
    devToolsUnlocked = true;
    localStorage.setItem('devToolsUnlocked', 'true');
    console.log('✓ Dev tools access granted! You can now use dev tools in endless mode.');
    alert('Dev Tools Unlocked! You can now access dev tools in endless mode.');
}

// Check if unlocked - prompt for password in endless mode
function checkDevAccess() {
    if (!devToolsUnlocked) {
        // Prompt for password
        const pwd = prompt('Enter dev tools password:');
        const devPassword = String.fromCharCode(50,55,49,48,48,48,115,107,105,98); // "271000skib"
        if (pwd === devPassword) {
            devToolsUnlocked = true;
            return true;
        } else {
            alert('Incorrect password');
            return false;
        }
    }
    return devToolsUnlocked;
}

// Expose toggle function for unlock button
window.toggleDevTools = function() {
    if (!checkDevAccess()) {
        return; // checkDevAccess shows the password prompt
    }
    
    const panel = document.getElementById('endlessDevPanel');
    
    if (!panel) {
        createDevPanelInMenu();
        setEndlessButtonLabel('▼ Dev Tools');
    } else {
        devPanelVisible = !devPanelVisible;
        panel.style.display = devPanelVisible ? 'block' : 'none';
        console.log(`Dev panel toggled: ${devPanelVisible ? 'OPEN' : 'CLOSED'}`);
        setEndlessButtonLabel(devPanelVisible ? '▼ Dev Tools' : '▶ Dev Tools');
        if (devPanelVisible) {
            updateDevDisplay();
        }
    }
};

function createDevPanelInMenu() {
    if (document.getElementById('endlessDevPanel')) return;
    
    const unlockBtn = document.getElementById('endlessDevToolsBtn');
    if (!unlockBtn) {
        console.error('Unlock button not found');
        return;
    }
    
    const panel = document.createElement('div');
    panel.id = 'endlessDevPanel';
    panel.style.cssText = `
        width: 100%;
        background: rgba(255, 255, 0, 0.1);
        border: 2px solid #ffff00;
        border-radius: 8px;
        padding: 15px;
        margin-top: 10px;
        color: #fff;
        font-family: 'Courier New', monospace;
        font-size: 12px;
    `;
    
    panel.innerHTML = `
        <div style="margin-bottom: 10px; text-align: center; font-weight: bold; color: #ffff00;">
            🛠️ DEV TOOLS PANEL 🛠️
        </div>
        
        <div style="margin-bottom: 10px; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 5px;">
            <div style="margin-bottom: 8px;">
                <label><strong>Points:</strong> <span id="devPoints">0</span></label>
            </div>
            <div style="display: flex; gap: 5px; margin-bottom: 8px;">
                <input type="number" id="devPointsInput" placeholder="Amount" value="100" style="flex: 1; padding: 5px; border-radius: 3px; background: rgba(0,0,0,0.5); color: #fff; border: 1px solid #ffff00;">
                <button onclick="window.addDevPoints()" style="padding: 5px 10px; background: #00ff00; color: #000; border: none; border-radius: 3px; cursor: pointer; font-weight: bold;">Add</button>
                <button onclick="window.removeDevPoints()" style="padding: 5px 10px; background: #ff4400; color: #fff; border: none; border-radius: 3px; cursor: pointer; font-weight: bold;">Remove</button>
            </div>
            <button onclick="window.resetDevPoints()" style="width: 100%; padding: 5px; background: #ff0000; color: #fff; border: none; border-radius: 3px; cursor: pointer;">Reset Points</button>
        </div>
        
        <div style="margin-bottom: 10px; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 5px;">
            <div style="margin-bottom: 8px;">
                <label><strong>Current Room:</strong> <span id="devRoom">0</span></label>
            </div>
            <div style="display: flex; gap: 5px;">
                <input type="number" id="devRoomInput" placeholder="Room #" value="1" style="flex: 1; padding: 5px; border-radius: 3px; background: rgba(0,0,0,0.5); color: #fff; border: 1px solid #ffff00;">
                <button onclick="window.setDevRoom()" style="padding: 5px 10px; background: #00ffff; color: #000; border: none; border-radius: 3px; cursor: pointer; font-weight: bold;">Set</button>
            </div>
        </div>
        
        <div style="margin-bottom: 10px; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 5px;">
            <div style="margin-bottom: 8px;">
                <label><strong>Lives:</strong> <span id="devLives">3</span></label>
            </div>
            <div style="display: flex; gap: 5px;">
                <button onclick="window.addDevLife()" style="flex: 1; padding: 5px; background: #00ff00; color: #000; border: none; border-radius: 3px; cursor: pointer; font-weight: bold;">+1 Life</button>
                <button onclick="window.removeDevLife()" style="flex: 1; padding: 5px; background: #ff0000; color: #fff; border: none; border-radius: 3px; cursor: pointer; font-weight: bold;">-1 Life</button>
            </div>
        </div>
        
        <div style="margin-bottom: 10px; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 5px;">
            <div style="margin-bottom: 8px;"><strong>Permanent Upgrades</strong></div>
            <div style="display: flex; gap: 6px; margin-bottom: 6px; align-items: center;">
                <select id="devUpgradeSelect" style="flex: 1; padding: 5px; background: rgba(0,0,0,0.5); color: #fff; border: 1px solid #ffff00; border-radius: 3px;"></select>
                <input type="number" id="devUpgradeLevel" value="1" min="0" style="width: 70px; padding: 5px; background: rgba(0,0,0,0.5); color: #fff; border: 1px solid #ffff00; border-radius: 3px;">
            </div>
            <div style="display: flex; gap: 6px;">
                <button onclick="window.setDevUpgradeLevel()" style="flex: 1; padding: 6px; background: #00ffaa; color: #000; border: none; border-radius: 3px; font-weight: bold; cursor: pointer;">Set Level</button>
                <button onclick="window.maxDevUpgrades()" style="flex: 1; padding: 6px; background: #ffaa00; color: #000; border: none; border-radius: 3px; font-weight: bold; cursor: pointer;">Max All</button>
            </div>
        </div>
        
        <div style="margin-bottom: 10px; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 5px;">
            <div style="margin-bottom: 8px;"><strong>Abilities</strong></div>
            <div style="display: flex; gap: 6px;">
                <select id="devAbilitySelect" style="flex: 1; padding: 5px; background: rgba(0,0,0,0.5); color: #fff; border: 1px solid #ffff00; border-radius: 3px;"></select>
                <button onclick="window.addDevAbility()" style="padding: 6px 10px; background: #88ff88; color: #000; border: none; border-radius: 3px; font-weight: bold; cursor: pointer;">Give</button>
            </div>
        </div>
        
        <div style="margin-bottom: 10px; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 5px;">
            <div style="margin-bottom: 8px;">
                <label><strong>Upgrades:</strong> <span id="devUpgradesStatus">Enabled</span></label>
            </div>
            <button onclick="window.toggleDevUpgrades()" style="width: 100%; padding: 5px; background: #88ff88; color: #000; border: none; border-radius: 3px; cursor: pointer; font-weight: bold;" id="devUpgradesBtn">Toggle Upgrades</button>
        </div>
        
        <div style="margin-bottom: 10px; padding: 8px; background: rgba(255,150,0,0.2); border-radius: 5px;">
            <button onclick="window.nextDevRoom()" style="width: 100%; padding: 8px; background: #ffaa00; color: #000; border: none; border-radius: 3px; cursor: pointer; font-weight: bold;">⏭️ Skip to Next Room</button>
        </div>
        
        <div style="padding: 8px; background: rgba(0,0,0,0.3); border-radius: 5px;">
            <button onclick="window.toggleDevTools()" style="width: 100%; padding: 8px; background: #666; color: #fff; border: none; border-radius: 3px; cursor: pointer;">Hide Panel</button>
        </div>
    `;
    
    unlockBtn.parentNode.insertBefore(panel, unlockBtn.nextSibling);
    devPanelVisible = true;
    panel.style.display = 'block';
    console.log('✓ Dev panel created in menu');
    buildDevDropdowns();
    updateDevDisplay();
}

function updateDevDisplay() {
    const gs = window.gameState;
    const progression = (typeof window.getEndlessProgression === 'function') ? window.getEndlessProgression() : null;
    
    // Update points
    const devPointsEl = document.getElementById('devPoints');
    if (devPointsEl && progression) {
        devPointsEl.textContent = progression.availablePoints || 0;
    }
    
    // Update room
    const devRoomEl = document.getElementById('devRoom');
    if (devRoomEl && progression) {
        devRoomEl.textContent = progression.currentRun?.roomNumber || 0;
    }
    
    // Update lives
    const devLivesEl = document.getElementById('devLives');
    if (devLivesEl && gs) {
        devLivesEl.textContent = gs.lives || 3;
    }
    
    // Update upgrades status
    const upgradesEnabled = progression?.upgradesEnabled ?? true;
    const statusEl = document.getElementById('devUpgradesStatus');
    if (statusEl) {
        statusEl.textContent = upgradesEnabled ? 'Enabled' : 'Disabled';
        statusEl.style.color = upgradesEnabled ? '#00ff00' : '#ff0000';
    }
    const btn = document.getElementById('devUpgradesBtn');
    if (btn) {
        btn.style.background = upgradesEnabled ? '#88ff88' : '#ff8888';
        btn.style.color = upgradesEnabled ? '#000' : '#fff';
    }
}

function buildDevDropdowns() {
    const upgradeSelect = document.getElementById('devUpgradeSelect');
    if (upgradeSelect && typeof UPGRADE_CATALOG !== 'undefined') {
        upgradeSelect.innerHTML = '';
        Object.entries(UPGRADE_CATALOG).forEach(([key, value]) => {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = `${value.name}`;
            upgradeSelect.appendChild(opt);
        });
    }
    const abilitySelect = document.getElementById('devAbilitySelect');
    if (abilitySelect && typeof TEMP_ABILITIES !== 'undefined') {
        abilitySelect.innerHTML = '';
        Object.entries(TEMP_ABILITIES).forEach(([key, value]) => {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = `${value.icon || ''} ${value.name}`.trim();
            abilitySelect.appendChild(opt);
        });
    }
}

// Global functions for buttons
window.addDevPoints = function() {
    const amount = parseInt(document.getElementById('devPointsInput')?.value || 100);
    const progression = (typeof window.getEndlessProgression === 'function') ? window.getEndlessProgression() : null;
    if (progression) {
        progression.availablePoints = (progression.availablePoints || 0) + amount;
        console.log(`Added ${amount} points. Total: ${progression.availablePoints}`);
        if (typeof window.saveEndlessProgress === 'function') {
            window.saveEndlessProgress();
        }
        updateDevDisplay();
    }
};

window.removeDevPoints = function() {
    const amount = parseInt(document.getElementById('devPointsInput')?.value || 100);
    const progression = (typeof window.getEndlessProgression === 'function') ? window.getEndlessProgression() : null;
    if (progression) {
        progression.availablePoints = Math.max(0, (progression.availablePoints || 0) - amount);
        console.log(`Removed ${amount} points. Total: ${progression.availablePoints}`);
        if (typeof window.saveEndlessProgress === 'function') {
            window.saveEndlessProgress();
        }
        updateDevDisplay();
    }
};

window.resetDevPoints = function() {
    const progression = (typeof window.getEndlessProgression === 'function') ? window.getEndlessProgression() : null;
    if (progression) {
        progression.availablePoints = 0;
        console.log('Points reset to 0');
        if (typeof window.saveEndlessProgress === 'function') {
            window.saveEndlessProgress();
        }
        updateDevDisplay();
    }
};

window.setDevRoom = function() {
    const roomNum = parseInt(document.getElementById('devRoomInput')?.value || 1);
    const progression = (typeof window.getEndlessProgression === 'function') ? window.getEndlessProgression() : null;
    if (progression && progression.currentRun) {
        progression.currentRun.roomNumber = Math.max(0, roomNum);
        console.log(`Set room to ${roomNum}`);
        if (typeof window.saveEndlessProgress === 'function') {
            window.saveEndlessProgress();
        }
        updateDevDisplay();
    }
};

window.addDevLife = function() {
    const gs = window.gameState;
    if (gs) {
        gs.lives = (gs.lives || 3) + 1;
        console.log(`Added life. Total: ${gs.lives}`);
        updateDevDisplay();
    }
};

window.removeDevLife = function() {
    const gs = window.gameState;
    if (gs) {
        gs.lives = Math.max(1, (gs.lives || 3) - 1);
        console.log(`Removed life. Total: ${gs.lives}`);
        updateDevDisplay();
    }
};

window.toggleDevUpgrades = function() {
    const progression = (typeof window.getEndlessProgression === 'function') ? window.getEndlessProgression() : null;
    if (progression) {
        progression.upgradesEnabled = !progression.upgradesEnabled;
        console.log(`Upgrades ${progression.upgradesEnabled ? 'enabled' : 'disabled'}`);
        if (typeof window.saveEndlessProgress === 'function') {
            window.saveEndlessProgress();
        }
        updateDevDisplay();
    }
};

window.setDevUpgradeLevel = function() {
    const progression = (typeof window.getEndlessProgression === 'function') ? window.getEndlessProgression() : null;
    const select = document.getElementById('devUpgradeSelect');
    const levelInput = document.getElementById('devUpgradeLevel');
    if (!progression || !select || !levelInput || typeof UPGRADE_CATALOG === 'undefined') return;
    const key = select.value;
    const upgrade = UPGRADE_CATALOG[key];
    if (!upgrade) return;
    const desired = parseInt(levelInput.value || '0', 10);
    if (typeof progression.permanentUpgrades[key] === 'boolean') {
        progression.permanentUpgrades[key] = desired > 0;
    } else {
        const clamped = Math.max(0, Math.min(upgrade.maxLevel, desired));
        progression.permanentUpgrades[key] = clamped;
    }
    if (typeof window.saveEndlessProgress === 'function') {
        window.saveEndlessProgress();
    }
    if (typeof window.applyPermanentUpgrades === 'function') {
        window.applyPermanentUpgrades();
    }
    console.log(`Set upgrade ${key} to ${progression.permanentUpgrades[key]}`);
    updateDevDisplay();
};

window.maxDevUpgrades = function() {
    const progression = (typeof window.getEndlessProgression === 'function') ? window.getEndlessProgression() : null;
    if (!progression || typeof UPGRADE_CATALOG === 'undefined') return;
    Object.entries(UPGRADE_CATALOG).forEach(([key, value]) => {
        if (typeof progression.permanentUpgrades[key] === 'boolean') {
            progression.permanentUpgrades[key] = true;
        } else {
            progression.permanentUpgrades[key] = value.maxLevel || 1;
        }
    });
    if (typeof window.saveEndlessProgress === 'function') {
        window.saveEndlessProgress();
    }
    if (typeof window.applyPermanentUpgrades === 'function') {
        window.applyPermanentUpgrades();
    }
    console.log('All upgrades maxed for testing');
    updateDevDisplay();
};

window.addDevAbility = function() {
    const progression = (typeof window.getEndlessProgression === 'function') ? window.getEndlessProgression() : null;
    const select = document.getElementById('devAbilitySelect');
    if (!progression || !progression.currentRun || !select) return;
    const key = select.value;
    if (!progression.currentRun.activeAbilities.includes(key)) {
        progression.currentRun.activeAbilities.push(key);
    }
    if (typeof window.initializeRunAbilities === 'function') {
        window.initializeRunAbilities(progression.currentRun.activeAbilities);
    }
    if (typeof window.saveEndlessProgress === 'function') {
        window.saveEndlessProgress();
    }
    console.log(`Granted ability: ${key}`);
    updateDevDisplay();
};

window.nextDevRoom = function() {
    const progression = (typeof window.getEndlessProgression === 'function') ? window.getEndlessProgression() : null;
    if (progression && progression.currentRun) {
        progression.currentRun.roomNumber++;
        if (typeof window.completeEndlessRoom === 'function') {
            window.completeEndlessRoom();
        }
        if (typeof window.saveEndlessProgress === 'function') {
            window.saveEndlessProgress();
        }
        console.log(`Advanced to room ${progression.currentRun.roomNumber}`);
        
        // Trigger room regeneration
        const continueEndlessRoom = window.continueEndlessRoom;
        if (typeof continueEndlessRoom === 'function') {
            continueEndlessRoom();
        }
        updateDevDisplay();
    }
};