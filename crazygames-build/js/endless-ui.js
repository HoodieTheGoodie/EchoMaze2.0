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
            id: 'extraStartingLives',
            name: 'Extra Starting Life',
            description: 'Start with +1 additional life',
            icon: '❤️',
            baseCost: 60,
            maxLevel: 3,
            valueFormatter: (level) => `+${level} ${level === 1 ? 'life' : 'lives'}`
        },
        {
            id: 'generatorSkillReduction',
            name: 'Generator Expert',
            description: 'Reduce skill checks needed to complete generators',
            icon: '⚙️',
            baseCost: 80,
            maxLevel: 3,
            valueFormatter: (level) => {
                if (level === 3) return 'Instant complete!';
                return `-${level} skill check${level > 1 ? 's' : ''}`;
            }
        },
        {
            id: 'staminaRechargeSpeed',
            name: 'Stamina Recovery',
            description: 'Stamina recharges faster between jumps',
            icon: '⚡',
            baseCost: 70,
            maxLevel: 3,
            valueFormatter: (level) => `-${level * 25}% recharge time`
        },
        {
            id: 'maxStaminaBoost',
            name: 'Stamina Tank',
            description: 'Increase maximum stamina pool',
            icon: '📊',
            baseCost: 50,
            maxLevel: 4,
            valueFormatter: (level) => `+${level * 25}% max stamina`
        },
        {
            id: 'enemyDamageReduction',
            name: 'Tough Hide',
            description: 'Take reduced damage from enemies',
            icon: '🛡️',
            baseCost: 90,
            maxLevel: 3,
            valueFormatter: (level) => `-${level * 25}% damage`
        },
        {
            id: 'generatorFailureProtection',
            name: 'Generator Insurance',
            description: 'Reduce penalties for generator failures',
            icon: '🔧',
            baseCost: 100,
            maxLevel: 2,
            valueFormatter: (level) => level === 1 ? '-1 life penalty' : 'Generator recovers'
        },
        {
            id: 'jumpChargeSpeed',
            name: 'Quick Charge',
            description: 'Charge jumps faster',
            icon: '⬆️',
            baseCost: 65,
            maxLevel: 3,
            valueFormatter: (level) => `-${level * 25}% charge time`
        },
        {
            id: 'startWithExtraLife',
            name: 'Life Insurance',
            description: 'Start with extra life ability',
            icon: '💚',
            baseCost: 150,
            maxLevel: 1,
            valueFormatter: () => 'Unlocked'
        },
        {
            id: 'startWithShield',
            name: 'Starter Shield',
            description: 'Begin with 3-hit shield protection',
            icon: '🔰',
            baseCost: 120,
            maxLevel: 1,
            valueFormatter: () => 'Unlocked'
        },
        {
            id: 'pointMultiplier',
            name: 'Wealth Accumulation',
            description: 'Earn more points per room',
            icon: '💰',
            baseCost: 200,
            maxLevel: 3,
            valueFormatter: (level) => `+${level * 25}% points`
        }
    ];
    
    upgrades.forEach(upgrade => {
        const catalogEntry = (typeof UPGRADE_CATALOG !== 'undefined' && UPGRADE_CATALOG[upgrade.id]) ? UPGRADE_CATALOG[upgrade.id] : null;
        const rawLevel = stats.permanentUpgrades[upgrade.id];
        const isSinglePurchase = typeof rawLevel === 'boolean';
        const currentLevel = isSinglePurchase ? (rawLevel ? 1 : 0) : (rawLevel || 0);
        const isMaxed = isSinglePurchase ? !!rawLevel : currentLevel >= upgrade.maxLevel;
        const nextCost = isMaxed ? 0 : (catalogEntry && typeof catalogEntry.getCost === 'function'
            ? (isSinglePurchase ? catalogEntry.getCost() : catalogEntry.getCost(currentLevel))
            : upgrade.baseCost * (currentLevel + 1));
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
                    ${isSinglePurchase ? (rawLevel ? 'Owned' : 'Not owned') : `Level: ${currentLevel} / ${upgrade.maxLevel}`}
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
                const result = purchaseUpgrade(upgrade.id);
                if (result?.success) {
                    updateEndlessMenuStats();
                    populateUpgradesList();
                } else if (result?.reason) {
                    alert(result.reason);
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
        { room: 3, name: 'Extra Life', icon: '❤️', description: 'Take one extra hit' },
        { room: 5, name: 'Temporal Slow', icon: '🐢', description: 'Enemies 50% slower (30s)' },
        { room: 7, name: 'Efficient Movement', icon: '⚡', description: 'Jumps cost 50% stamina' },
        { room: 10, name: 'Wall Phase', icon: '👻', description: 'Walk through walls (10s)' },
        { room: 12, name: 'Reinforced Shield', icon: '🛡️', description: 'Absorb 3 hits' },
        { room: 15, name: 'Invincibility Burst', icon: '✨', description: 'Complete protection (5s)' }
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
        // Difficulty Mode Toggle
        let selectedDifficulty = 'easy';
        const easyBtn = document.getElementById('difficultyEasyBtn');
        const hardBtn = document.getElementById('difficultyHardBtn');
        const diffDesc = document.getElementById('difficultyDescription');
        
        function updateDifficultyUI(mode) {
            selectedDifficulty = mode;
            if (mode === 'easy') {
                easyBtn.style.background = 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)';
                easyBtn.style.color = '#000';
                easyBtn.style.border = 'none';
                hardBtn.style.background = 'rgba(100, 100, 100, 0.3)';
                hardBtn.style.color = '#999';
                hardBtn.style.border = '2px solid #666';
                diffDesc.innerHTML = 'Easy: Progressive AI spawns (1→5 unique)<br/>Points: Standard rewards';
            } else {
                hardBtn.style.background = 'linear-gradient(135deg, #ff4444 0%, #cc2222 100%)';
                hardBtn.style.color = '#fff';
                hardBtn.style.border = 'none';
                easyBtn.style.background = 'rgba(100, 100, 100, 0.3)';
                easyBtn.style.color = '#999';
                easyBtn.style.border = '2px solid #666';
                diffDesc.innerHTML = 'Hard: Multiple AI duplicates (up to 10+)<br/>Points: <span style="color:#ffd700">2x rewards</span>';
            }
        }
        
        if (easyBtn) {
            easyBtn.addEventListener('click', () => updateDifficultyUI('easy'));
        }
        if (hardBtn) {
            hardBtn.addEventListener('click', () => updateDifficultyUI('hard'));
        }
        
        // Unlock Dev Tools Button
        const unlockDevToolsBtn = document.getElementById('endlessDevToolsBtn');
        if (unlockDevToolsBtn) {
            unlockDevToolsBtn.addEventListener('click', () => {
                if (typeof window.toggleDevTools === 'function') {
                    window.toggleDevTools();
                }
            });
        }
        
        // Start Run Button
        const startRunBtn = document.getElementById('startRunBtn');
        if (startRunBtn) {
            startRunBtn.addEventListener('click', () => {
                const upgradesEnabled = document.getElementById('upgradesToggle')?.checked ?? true;
                hideEndlessMenu();
                if (typeof startProgressionRun === 'function') {
                    startProgressionRun(selectedDifficulty);
                } else if (typeof window !== 'undefined' && typeof window.startProgressionRun === 'function') {
                    window.startProgressionRun(selectedDifficulty);
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

// Make functions globally available
window.showEndlessMenu = showEndlessMenu;
window.hideEndlessMenu = hideEndlessMenu;
window.updateEndlessMenuStats = updateEndlessMenuStats;
window.populateUpgradesList = populateUpgradesList;
window.populateAbilitySchedule = populateAbilitySchedule;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { showEndlessMenu, hideEndlessMenu, updateEndlessMenuStats, populateUpgradesList, populateAbilitySchedule };
}
