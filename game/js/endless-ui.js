// Endless Mode UI Management

// Import endless progression (assuming it's loaded before this)
// const { endlessProgression, TEMP_ABILITIES, UPGRADE_CATALOG, ... } from './endless-progression.js';

function showEndlessMenu() {
    const menu = document.getElementById('endlessMenu');
    if (!menu) return;
    
    menu.style.display = 'block';
    updateEndlessMenuStats();
    populateUpgradesList();
    populateAbilitySchedule();
}

function hideEndlessMenu() {
    const menu = document.getElementById('endlessMenu');
    if (menu) {
        menu.style.display = 'none';
    }
}

function updateEndlessMenuStats() {
    // Update stats display
    const stats = (typeof getEndlessProgression === 'function') ? getEndlessProgression() : (window.getEndlessProgression ? window.getEndlessProgression() : null);
    if (!stats || !stats.lifetimeStats) return;
    const el1 = document.getElementById('statBestRun');
    const el2 = document.getElementById('statTotalRooms');
    const el3 = document.getElementById('statAvailablePoints');
    const el4 = document.getElementById('statTotalRuns');
    if (el1) el1.textContent = stats.lifetimeStats.bestRun || 0;
    if (el2) el2.textContent = stats.lifetimeStats.totalRooms || 0;
    if (el3) el3.textContent = stats.availablePoints || 0;
    if (el4) el4.textContent = stats.lifetimeStats.totalRuns || 0;
}

function populateUpgradesList() {
    const upgradesList = document.getElementById('upgradesList');
    if (!upgradesList) return;
    
    const stats = (typeof getEndlessProgression === 'function') ? getEndlessProgression() : (window.getEndlessProgression ? window.getEndlessProgression() : null);
    if (!stats) return;
    upgradesList.innerHTML = '';
    
    // For each upgrade in catalog
    const upgrades = [
        {
            id: 'startingLives',
            name: 'Extra Lives',
            description: 'Start with additional lives',
            icon: '❤️',
            baseCost: 50,
            maxLevel: 3,
            valueFormatter: (level) => `+${level} lives`
        },
        {
            id: 'staminaBoost',
            name: 'Stamina Boost',
            description: 'Increase maximum stamina',
            icon: '⚡',
            baseCost: 40,
            maxLevel: 5,
            valueFormatter: (level) => `+${level * 20}%`
        },
        {
            id: 'generatorSpeedUp',
            name: 'Fast Generators',
            description: 'Generators start with progress',
            icon: '⚙️',
            baseCost: 60,
            maxLevel: 4,
            valueFormatter: (level) => `${level * 25}% start`
        },
        {
            id: 'movementSpeed',
            name: 'Movement Speed',
            description: 'Move faster permanently',
            icon: '🏃',
            baseCost: 45,
            maxLevel: 3,
            valueFormatter: (level) => `+${level * 10}%`
        },
        {
            id: 'jumpChargeSpeed',
            name: 'Quick Jump',
            description: 'Charge jumps faster',
            icon: '🦘',
            baseCost: 35,
            maxLevel: 5,
            valueFormatter: (level) => `+${level * 20}%`
        },
        {
            id: 'startWithDoubleJump',
            name: 'Start with Double Jump',
            description: 'Begin runs with double jump ability',
            icon: '⬆️',
            baseCost: 100,
            maxLevel: 1,
            valueFormatter: () => 'Unlocked'
        },
        {
            id: 'startWithShield',
            name: 'Start with Shield',
            description: 'Begin runs with wall shield',
            icon: '🛡️',
            baseCost: 80,
            maxLevel: 1,
            valueFormatter: () => 'Unlocked'
        }
    ];
    
    upgrades.forEach(upgrade => {
        const currentLevel = stats.permanentUpgrades[upgrade.id] || 0;
        const isMaxed = currentLevel >= upgrade.maxLevel;
        const nextCost = isMaxed ? 0 : upgrade.baseCost * (currentLevel + 1);
        const canAfford = stats.availablePoints >= nextCost && !isMaxed;
        
        const upgradeDiv = document.createElement('div');
        upgradeDiv.style.cssText = `
            background: ${isMaxed ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
            border: 2px solid ${isMaxed ? '#00ff88' : '#444'};
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 15px;
        `;
        
        upgradeDiv.innerHTML = `
            <div style="font-size: 32px;">${upgrade.icon}</div>
            <div style="flex: 1;">
                <div style="font-size: 18px; font-weight: bold; color: #fff;">
                    ${upgrade.name}
                    <span style="color: #00ff88; font-size: 16px;">
                        ${currentLevel > 0 ? `[${upgrade.valueFormatter(currentLevel)}]` : ''}
                    </span>
                </div>
                <div style="font-size: 14px; color: #aaa; margin-top: 4px;">
                    ${upgrade.description}
                </div>
                <div style="font-size: 14px; color: #88ffaa; margin-top: 8px;">
                    Level: ${currentLevel} / ${upgrade.maxLevel}
                    ${!isMaxed ? `• Next: ${nextCost} points` : '• MAX'}
                </div>
            </div>
            <button 
                id="upgrade_${upgrade.id}" 
                ${isMaxed ? 'disabled' : ''}
                style="
                    padding: 12px 24px;
                    background: ${canAfford ? '#00ff88' : '#444'};
                    color: ${canAfford ? '#000' : '#666'};
                    border: none;
                    border-radius: 6px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: ${canAfford ? 'pointer' : 'not-allowed'};
                    font-family: 'Courier New', monospace;
                    ${isMaxed ? 'display: none;' : ''}
                "
            >${canAfford ? 'BUY' : 'LOCKED'}</button>
        `;
        
        const button = upgradeDiv.querySelector(`#upgrade_${upgrade.id}`);
        if (button && canAfford) {
            button.addEventListener('click', () => {
                if (purchaseUpgrade(upgrade.id)) {
                    updateEndlessMenuStats();
                    populateUpgradesList();
                }
            });
        }
        
        upgradesList.appendChild(upgradeDiv);
    });
}

function populateAbilitySchedule() {
    const schedule = document.getElementById('abilitySchedule');
    if (!schedule) return;
    
    const abilities = [
        { room: 5, name: 'Double Jump', icon: '⬆️', description: 'Jump twice in mid-air' },
        { room: 10, name: 'Reduced Stamina', icon: '⚡', description: '50% less stamina usage' },
        { room: 15, name: 'Shield Durability', icon: '🛡️', description: 'Shield takes 5 hits' },
        { room: 20, name: 'Infinite Projectiles', icon: '🔫', description: 'Unlimited shield ammo' },
        { room: 25, name: 'Extra Life', icon: '❤️', description: '+1 life (one time)' },
        { room: 30, name: 'Speed Boost', icon: '🏃', description: '30% faster movement' },
        { room: 35, name: 'Fast Repair', icon: '⚙️', description: 'Generators 2x speed' },
        { room: 40, name: 'Extended Jump', icon: '🦘', description: 'Super jump charge' }
    ];
    
    schedule.innerHTML = abilities.map(ability => `
        <div style="
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 6px;
            margin-bottom: 8px;
        ">
            <div style="font-size: 24px;">${ability.icon}</div>
            <div style="flex: 1;">
                <div style="font-weight: bold; color: #00ff88;">
                    Room ${ability.room}: ${ability.name}
                </div>
                <div style="font-size: 12px; color: #aaa;">
                    ${ability.description}
                </div>
            </div>
        </div>
    `).join('');
}

// Event Listeners
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // Start Run Button
        const startRunBtn = document.getElementById('startRunBtn');
        if (startRunBtn) {
            startRunBtn.addEventListener('click', () => {
                const upgradesEnabled = document.getElementById('upgradesToggle')?.checked ?? true;
                hideEndlessMenu();
                if (typeof startProgressionRun === 'function') {
                    startProgressionRun(upgradesEnabled);
                } else if (typeof window !== 'undefined' && typeof window.startProgressionRun === 'function') {
                    window.startProgressionRun(upgradesEnabled);
                }
                // Transition to game (handled by main game code)
            });
        }
        
        // Reset Upgrades Button
        const resetBtn = document.getElementById('resetUpgradesBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Reset all upgrades and refund all points? This cannot be undone!')) {
                    resetUpgrades();
                    updateEndlessMenuStats();
                    populateUpgradesList();
                }
            });
        }
        
        // Classic Endless Button
        const classicBtn = document.getElementById('classicEndlessBtn');
        if (classicBtn) {
            classicBtn.addEventListener('click', () => {
                hideEndlessMenu();
                // Show classic endless mode (handled by main game code)
                if (typeof showClassicEndless === 'function') {
                    showClassicEndless();
                }
            });
        }
        
        // Back Button
        const backBtn = document.getElementById('endlessBackBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                hideEndlessMenu();
                // Return to main menu (handled by main game code)
                if (typeof showMainMenu === 'function') {
                    showMainMenu();
                }
            });
        }
    });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { showEndlessMenu, hideEndlessMenu, updateEndlessMenuStats };
}
