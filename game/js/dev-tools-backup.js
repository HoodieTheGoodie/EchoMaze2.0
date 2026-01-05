// dev-tools.js - Development tools for testing endless mode

let devPanelVisible = false;

export function initDevTools() {
    console.log('Dev Tools Initialized');
    // Panel will be created in endless menu, not as floating panel
}

// Expose toggle function for unlock button
window.toggleDevTools = function() {
    const panel = document.getElementById('devPanel');
    if (!panel) {
        createDevPanelInMenu();
    } else {
        devPanelVisible = !devPanelVisible;
        panel.style.display = devPanelVisible ? 'block' : 'none';
        console.log(`Dev panel toggled: ${devPanelVisible ? 'OPEN' : 'CLOSED'}`);
        if (devPanelVisible) {
            updateDevDisplay();
        }
    }
};

function createDevPanelInMenu() {
    if (document.getElementById('devPanel')) return; // Already exists
    
    // Find the unlock button's parent container
    const unlockBtn = document.getElementById('unlockDevToolsBtn');
    if (!unlockBtn) {
        console.error('Unlock button not found');
        return;
    }
    
    const panel = document.createElement('div');
    panel.id = 'devPanel';
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
        display: none;
    `;
        <div style="margin-bottom: 10px; text-align: center; font-weight: bold; color: #ffff00;">
            DEV TOOLS (Press T)
        </div>
        
        <div style="margin-bottom: 10px; padding: 8px; background: rgba(255,255,0,0.1); border-radius: 5px;">
            <div style="margin-bottom: 8px;">
                <label>Points: <span id="devPoints">0</span></label>
            </div>
            <div style="display: flex; gap: 5px; margin-bottom: 8px;">
                <input type="number" id="devPointsInput" placeholder="Amount" value="100" style="flex: 1; padding: 5px; border-radius: 3px;">
                <button onclick="window.addDevPoints()" style="padding: 5px 10px; background: #00ff00; color: #000; border: none; border-radius: 3px; cursor: pointer; font-weight: bold;">Add</button>
                <button onclick="window.removeDevPoints()" style="padding: 5px 10px; background: #ff4400; color: #fff; border: none; border-radius: 3px; cursor: pointer; font-weight: bold;">Remove</button>
            </div>
            <button onclick="window.resetDevPoints()" style="width: 100%; padding: 5px; background: #ff0000; color: #fff; border: none; border-radius: 3px; cursor: pointer; margin-bottom: 8px;">Reset Points</button>
        </div>
        
        <div style="margin-bottom: 10px; padding: 8px; background: rgba(0,255,255,0.1); border-radius: 5px;">
            <div style="margin-bottom: 8px;">
                <label>Current Room: <span id="devRoom">0</span></label>
            </div>
            <div style="display: flex; gap: 5px;">
                <input type="number" id="devRoomInput" placeholder="Room #" value="1" style="flex: 1; padding: 5px; border-radius: 3px;">
                <button onclick="window.setDevRoom()" style="padding: 5px 10px; background: #00ffff; color: #000; border: none; border-radius: 3px; cursor: pointer; font-weight: bold;">Set</button>
            </div>
        </div>
        
        <div style="margin-bottom: 10px; padding: 8px; background: rgba(255,0,255,0.1); border-radius: 5px;">
            <div style="margin-bottom: 8px;">
                <label>Lives: <span id="devLives">3</span></label>
            </div>
            <div style="display: flex; gap: 5px;">
                <button onclick="window.addDevLife()" style="flex: 1; padding: 5px; background: #00ff00; color: #000; border: none; border-radius: 3px; cursor: pointer;">+1 Life</button>
                <button onclick="window.removeDevLife()" style="flex: 1; padding: 5px; background: #ff0000; color: #fff; border: none; border-radius: 3px; cursor: pointer;">-1 Life</button>
            </div>
        </div>
        
        <div style="margin-bottom: 10px; padding: 8px; background: rgba(100,100,255,0.1); border-radius: 5px;">
            <div style="margin-bottom: 8px;">
                <label style="color: #88ff88;">Upgrades Toggle:</label>
            </div>
            <div style="display: flex; gap: 5px;">
                <button onclick="window.toggleDevUpgrades()" style="flex: 1; padding: 5px; background: #88ff88; color: #000; border: none; border-radius: 3px; cursor: pointer; font-weight: bold;" id="devUpgradesBtn">Enable</button>
            </div>
        </div>
        
        <div style="padding: 8px; background: rgba(255,150,0,0.1); border-radius: 5px;">
            <button onclick="window.nextDevRoom()" style="width: 100%; padding: 8px; background: #ffaa00; color: #000; border: none; border-radius: 3px; cursor: pointer; font-weight: bold; margin-bottom: 5px;">Next Room</button>
            <button onclick="window.toggleDevPanel()" style="width: 100%; padding: 8px; background: #666; color: #fff; border: none; border-radius: 3px; cursor: pointer;">Close</button>
        </div>
    `;
        
        if (document.body) {
            document.body.appendChild(panel);
            console.log('✓ Dev panel added to DOM');
        } else {
            console.error('Body not ready, retrying...');
            setTimeout(addPanelToDOM, 100);
        }
    };
    
    if (document.body) {
        addPanelToDOM();
    } else {
        document.addEventListener('DOMContentLoaded', addPanelToDOM);
    }
}

function toggleDevPanel() {
    devPanelVisible = !devPanelVisible;
    const panel = document.getElementById('devPanel');
    console.log(`Dev panel toggled: ${devPanelVisible ? 'OPEN' : 'CLOSED'}`);
    if (panel) {
        panel.style.display = devPanelVisible ? 'block' : 'none';
        if (devPanelVisible) {
            console.log('Updating dev display...');
            updateDevDisplay();
        }
    } else {
        console.error('Dev panel element not found!');
    }
}

function updateDevDisplay() {
    const gs = window.gameState;
    if (!gs) return;
    
    const progression = (typeof window.getEndlessProgression === 'function') ? window.getEndlessProgression() : null;
    
    // Safely update points
    const devPointsEl = document.getElementById('devPoints');
    if (devPointsEl) {
        devPointsEl.textContent = progression?.availablePoints || 0;
    }
    
    // Safely update room
    const devRoomEl = document.getElementById('devRoom');
    if (devRoomEl) {
        devRoomEl.textContent = progression?.currentRun?.roomNumber || 0;
    }
    
    // Safely update lives
    const devLivesEl = document.getElementById('devLives');
    if (devLivesEl) {
        devLivesEl.textContent = gs.lives || 3;
    }
    
    // Safely update upgrades button
    const upgradesEnabled = progression?.upgradesEnabled ?? true;
    const btn = document.getElementById('devUpgradesBtn');
    if (btn) {
        btn.textContent = upgradesEnabled ? 'Enabled' : 'Disabled';
        btn.style.background = upgradesEnabled ? '#88ff88' : '#ff8888';
        btn.style.color = upgradesEnabled ? '#000' : '#fff';
    }
}

// Helper to check if dev panel is open and tools are unlocked
function isDevPanelOpen() {
    if (!devToolsUnlocked) {
        console.warn('Dev tools locked. Unlock on main menu first.');
        return false;
    }
    if (!devPanelVisible) {
        console.warn('Dev tools only accessible when dev panel is open (Press T)');
        return false;
    }
    return true;
}

// Global functions for buttons
window.addDevPoints = function() {
    if (!isDevPanelOpen()) return;
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
    if (!isDevPanelOpen()) return;
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
    if (!isDevPanelOpen()) return;
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
    if (!isDevPanelOpen()) return;
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
    if (!isDevPanelOpen()) return;
    const gs = window.gameState;
    if (gs) {
        gs.lives = (gs.lives || 3) + 1;
        console.log(`Added life. Total: ${gs.lives}`);
        updateDevDisplay();
    }
};

window.removeDevLife = function() {
    if (!isDevPanelOpen()) return;
    const gs = window.gameState;
    if (gs) {
        gs.lives = Math.max(1, (gs.lives || 3) - 1);
        console.log(`Removed life. Total: ${gs.lives}`);
        updateDevDisplay();
    }
};

window.toggleDevUpgrades = function() {
    if (!isDevPanelOpen()) return;
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

window.nextDevRoom = function() {
    if (!isDevPanelOpen()) return;
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

window.toggleDevPanel = toggleDevPanel;
