// endless-progression.js - New Endless Mode Progression System

// Note: Avoid importing gameState to prevent circular init. Use window.gameState.

// Endless progression state (persisted in localStorage)
export const endlessProgression = {
    // Points and lifetime stats
    availablePoints: 0,
    lifetimeStats: {
        bestRun: 0,
        totalRooms: 0,
        totalRuns: 0
    },
    
    // Current run state
    currentRun: {
        active: false,
        roomNumber: 0,
        points: 0,
        activeAbilities: [], // Temporary abilities earned during run
        livesGained: 0
    },
    
    // Permanent upgrades (purchased with points)
    permanentUpgrades: {
        extraStartingLives: 0,      // +1 life per level (max 3)
        baseStaminaBoost: 0,        // +20 stamina per level (max 5)
        generatorSpeedBoost: 0,     // -10% repair time per level (max 5)
        movementSpeed: 0,           // +5% speed per level (max 4)
        jumpChargeSpeed: 0,         // -10% charge time per level (max 3)
        startWithDoubleJump: false, // 100 points
        startWithShieldBoost: false // 100 points (3 hits before break)
    },
    
    upgradesEnabled: true // Toggle for challenge runs
};

// Ability definitions (earned during runs)
export const TEMP_ABILITIES = {
    doubleJump: {
        name: 'Double Jump',
        description: 'Press jump again in mid-air',
        icon: '⬆️⬆️',
        earnedAt: 3 // Room number
    },
    reducedStamina: {
        name: 'Efficient Movement',
        description: '50% stamina drain',
        icon: '⚡',
        earnedAt: 5
    },
    shieldDurability: {
        name: 'Reinforced Shield',
        description: '3 hits before breaking',
        icon: '🛡️',
        earnedAt: 7
    },
    infiniteShieldProjectiles: {
        name: 'Infinite Shield Shots',
        description: 'Unlimited shield projectiles',
        icon: '∞',
        earnedAt: 10
    },
    extraLife: {
        name: 'Extra Life',
        description: '+1 life',
        icon: '❤️',
        earnedAt: 12
    },
    speedBoost: {
        name: 'Speed Boost',
        description: '+30% movement speed',
        icon: '💨',
        earnedAt: 15
    },
    fastRepair: {
        name: 'Rapid Repair',
        description: '50% faster generators',
        icon: '⚙️',
        earnedAt: 18
    },
    extendedJump: {
        name: 'Super Jump',
        description: '+50% jump range',
        icon: '🚀',
        earnedAt: 20
    }
};

// Permanent upgrade costs and effects
export const UPGRADE_CATALOG = {
    extraStartingLives: {
        name: 'Extra Starting Life',
        description: '+1 starting life',
        maxLevel: 3,
        costPerLevel: 50,
        getCost: (level) => 50 + (level * 25)
    },
    baseStaminaBoost: {
        name: 'Stamina Boost',
        description: '+20 max stamina',
        maxLevel: 5,
        costPerLevel: 30,
        getCost: (level) => 30 + (level * 15)
    },
    generatorSpeedBoost: {
        name: 'Repair Expert',
        description: '-10% generator repair time',
        maxLevel: 5,
        costPerLevel: 40,
        getCost: (level) => 40 + (level * 20)
    },
    movementSpeed: {
        name: 'Swift Runner',
        description: '+5% movement speed',
        maxLevel: 4,
        costPerLevel: 35,
        getCost: (level) => 35 + (level * 20)
    },
    jumpChargeSpeed: {
        name: 'Quick Charge',
        description: '-10% jump charge time',
        maxLevel: 3,
        costPerLevel: 45,
        getCost: (level) => 45 + (level * 25)
    },
    startWithDoubleJump: {
        name: 'Start with Double Jump',
        description: 'Begin runs with double jump unlocked',
        maxLevel: 1,
        costPerLevel: 100,
        getCost: () => 100
    },
    startWithShieldBoost: {
        name: 'Start with Reinforced Shield',
        description: 'Begin with 3-hit shield durability',
        maxLevel: 1,
        costPerLevel: 100,
        getCost: () => 100
    }
};

/**
 * Calculate difficulty scaling for room number
 */
export function getRoomDifficulty(roomNumber) {
    const difficulty = {
        generatorCount: 3,
        enemies: []
    };
    
    // Increase generators every 10 rooms (max 5)
    if (roomNumber >= 30) difficulty.generatorCount = 5;
    else if (roomNumber >= 20) difficulty.generatorCount = 4;
    
    // Add enemies based on progression
    if (roomNumber >= 1) difficulty.enemies.push('chaser');
    if (roomNumber >= 3) difficulty.enemies.push('pig');
    if (roomNumber >= 5) difficulty.enemies.push('seeker');
    if (roomNumber >= 8) difficulty.enemies.push('batter');
    if (roomNumber >= 12) difficulty.enemies.push('mortar');
    
    // Add duplicates at higher rooms
    if (roomNumber >= 15) difficulty.enemies.push('chaser'); // 2nd chaser
    if (roomNumber >= 18) difficulty.enemies.push('pig'); // 2nd pig
    if (roomNumber >= 22) difficulty.enemies.push('seeker'); // 2nd seeker
    if (roomNumber >= 25) difficulty.enemies.push('batter'); // 2nd batter
    
    // Randomize enemy order
    difficulty.enemies.sort(() => Math.random() - 0.5);
    
    return difficulty;
}

/**
 * Calculate points earned for completing a room
 */
export function calculateRoomPoints(roomNumber) {
    return Math.floor(10 + (roomNumber * 2));
}

/**
 * Start a new endless run
 */
export function startEndlessRun() {
    const gs = (typeof window !== 'undefined' && window.gameState) ? window.gameState : null;
    if (gs) {
        gs.mode = 'endless-progression';
    }
    
    endlessProgression.currentRun = {
        active: true,
        roomNumber: 0,
        points: 0,
        activeAbilities: [],
        livesGained: 0
    };
    
    // Apply starting upgrades if enabled
    if (endlessProgression.upgradesEnabled) {
        if (endlessProgression.permanentUpgrades.startWithDoubleJump) {
            endlessProgression.currentRun.activeAbilities.push('doubleJump');
        }
        if (endlessProgression.permanentUpgrades.startWithShieldBoost) {
            endlessProgression.currentRun.activeAbilities.push('shieldDurability');
        }
    }
    
    saveEndlessProgress();
}

/**
 * Complete current room and advance
 */
export function completeEndlessRoom() {
    if (!endlessProgression.currentRun.active) return;
    
    endlessProgression.currentRun.roomNumber++;
    const roomNum = endlessProgression.currentRun.roomNumber;
    
    // Award points
    const points = calculateRoomPoints(roomNum);
    endlessProgression.currentRun.points += points;
    
    // Check for new abilities earned
    for (const [key, ability] of Object.entries(TEMP_ABILITIES)) {
        if (ability.earnedAt === roomNum && !endlessProgression.currentRun.activeAbilities.includes(key)) {
            endlessProgression.currentRun.activeAbilities.push(key);
            showAbilityUnlockNotification(ability);
        }
    }
    
    saveEndlessProgress();
}

/**
 * End current run (death or quit)
 */
export function endEndlessRun(won = false) {
    if (!endlessProgression.currentRun.active) return;
    
    const roomsCleared = endlessProgression.currentRun.roomNumber;
    const pointsEarned = endlessProgression.currentRun.points;
    
    // Update lifetime stats
    endlessProgression.availablePoints += pointsEarned;
    endlessProgression.lifetimeStats.totalRooms += roomsCleared;
    endlessProgression.lifetimeStats.totalRuns++;
    if (roomsCleared > endlessProgression.lifetimeStats.bestRun) {
        endlessProgression.lifetimeStats.bestRun = roomsCleared;
    }
    
    // Clear run state
    endlessProgression.currentRun = {
        active: false,
        roomNumber: 0,
        points: 0,
        activeAbilities: [],
        livesGained: 0
    };
    
    saveEndlessProgress();
    return { roomsCleared, pointsEarned };
}

/**
 * Purchase a permanent upgrade
 */
export function purchaseUpgrade(upgradeKey) {
    const upgrade = UPGRADE_CATALOG[upgradeKey];
    const currentLevel = endlessProgression.permanentUpgrades[upgradeKey];
    
    if (typeof currentLevel === 'boolean') {
        // Single-purchase upgrade
        if (currentLevel) return { success: false, reason: 'Already owned' };
        const cost = upgrade.getCost();
        if (endlessProgression.availablePoints < cost) return { success: false, reason: 'Not enough points' };
        
        endlessProgression.availablePoints -= cost;
        endlessProgression.permanentUpgrades[upgradeKey] = true;
    } else {
        // Level-based upgrade
        if (currentLevel >= upgrade.maxLevel) return { success: false, reason: 'Max level reached' };
        const cost = upgrade.getCost(currentLevel);
        if (endlessProgression.availablePoints < cost) return { success: false, reason: 'Not enough points' };
        
        endlessProgression.availablePoints -= cost;
        endlessProgression.permanentUpgrades[upgradeKey]++;
    }
    
    saveEndlessProgress();
    return { success: true };
}

/**
 * Reset all upgrades and refund points
 */
export function resetUpgrades() {
    // Calculate total points spent
    let totalSpent = 0;
    for (const [key, level] of Object.entries(endlessProgression.permanentUpgrades)) {
        const upgrade = UPGRADE_CATALOG[key];
        if (typeof level === 'boolean' && level) {
            totalSpent += upgrade.getCost();
        } else if (typeof level === 'number' && level > 0) {
            for (let i = 0; i < level; i++) {
                totalSpent += upgrade.getCost(i);
            }
        }
    }
    
    // Reset upgrades
    endlessProgression.permanentUpgrades = {
        extraStartingLives: 0,
        baseStaminaBoost: 0,
        generatorSpeedBoost: 0,
        movementSpeed: 0,
        jumpChargeSpeed: 0,
        startWithDoubleJump: false,
        startWithShieldBoost: false
    };
    
    // Refund points
    endlessProgression.availablePoints += totalSpent;
    saveEndlessProgress();
    
    return totalSpent;
}

/**
 * Apply permanent upgrades to game state
 */
export function applyPermanentUpgrades() {
    if (!endlessProgression.upgradesEnabled) return;
    
    const upgrades = endlessProgression.permanentUpgrades;
    
    // Extra starting lives
    const gs = (typeof window !== 'undefined' && window.gameState) ? window.gameState : null;
    if (!gs) return;
    gs.lives += upgrades.extraStartingLives;
    
    // Base stamina boost
    gs.stamina = 100 + (upgrades.baseStaminaBoost * 20);
    gs.maxStamina = gs.stamina;
    
    // Store upgrade levels in gameState for other systems to use
    gs.endlessUpgrades = {
        generatorSpeedMultiplier: 1 - (upgrades.generatorSpeedBoost * 0.1),
        movementSpeedMultiplier: 1 + (upgrades.movementSpeed * 0.05),
        jumpChargeMultiplier: 1 - (upgrades.jumpChargeSpeed * 0.1)
    };
}

/**
 * Check if player has a temporary ability active
 */
export function hasAbility(abilityKey) {
    return endlessProgression.currentRun.activeAbilities.includes(abilityKey);
}

/**
 * Save progression to localStorage
 */
export function saveEndlessProgress() {
    try {
        localStorage.setItem('echoMaze_endlessProgress', JSON.stringify(endlessProgression));
    } catch (e) {
        console.warn('Failed to save endless progress:', e);
    }
}

/**
 * Load progression from localStorage
 */
export function loadEndlessProgress() {
    try {
        const saved = localStorage.getItem('echoMaze_endlessProgress');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Migrate/normalize schema
            if (!parsed.lifetimeStats) {
                parsed.lifetimeStats = {
                    bestRun: parsed.bestRun || 0,
                    totalRooms: parsed.totalRoomsCleared || 0,
                    totalRuns: parsed.totalRuns || 0
                };
                delete parsed.bestRun;
                delete parsed.totalRoomsCleared;
                delete parsed.totalRuns;
            }
            if (typeof parsed.availablePoints !== 'number') parsed.availablePoints = 0;
            if (!parsed.currentRun) {
                parsed.currentRun = { active: false, roomNumber: 0, points: 0, activeAbilities: [], livesGained: 0 };
            } else {
                parsed.currentRun.activeAbilities = parsed.currentRun.activeAbilities || [];
                parsed.currentRun.roomNumber = parsed.currentRun.roomNumber || 0;
                parsed.currentRun.points = parsed.currentRun.points || 0;
                parsed.currentRun.livesGained = parsed.currentRun.livesGained || 0;
            }
            if (!parsed.permanentUpgrades) {
                parsed.permanentUpgrades = {
                    extraStartingLives: 0,
                    baseStaminaBoost: 0,
                    generatorSpeedBoost: 0,
                    movementSpeed: 0,
                    jumpChargeSpeed: 0,
                    startWithDoubleJump: false,
                    startWithShieldBoost: false
                };
            }
            if (typeof parsed.upgradesEnabled !== 'boolean') parsed.upgradesEnabled = true;
            Object.assign(endlessProgression, parsed);
            
            // Reset active run if it was left in bad state
            const gs = (typeof window !== 'undefined' && window.gameState) ? window.gameState : null;
            if (endlessProgression.currentRun.active && gs && !gs.gameStatus) {
                endlessProgression.currentRun.active = false;
            }
        }
    } catch (e) {
        console.warn('Failed to load endless progress:', e);
    }
}

/**
 * Accessor for current progression state
 */
export function getEndlessProgression() {
    return endlessProgression;
}

/**
 * Show ability unlock notification
 */
function showAbilityUnlockNotification(ability) {
    // Create popup notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.95);
        border: 3px solid #00ff88;
        box-shadow: 0 0 30px rgba(0, 255, 136, 0.6);
        padding: 30px 40px;
        border-radius: 15px;
        z-index: 10000;
        text-align: center;
        font-family: 'Courier New', monospace;
        color: #00ff88;
        animation: popIn 0.3s ease-out;
    `;
    
    notification.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 10px;">${ability.icon}</div>
        <div style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">ABILITY UNLOCKED!</div>
        <div style="font-size: 18px; margin-bottom: 5px;">${ability.name}</div>
        <div style="font-size: 14px; color: #88ffaa;">${ability.description}</div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.5s ease-out';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// Load progress on module load
loadEndlessProgress();
