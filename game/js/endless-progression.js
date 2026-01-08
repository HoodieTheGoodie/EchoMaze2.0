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
        livesGained: 0,
        difficultyMode: 'easy' // 'easy' or 'hard'
    },
    
    // Permanent upgrades (purchased with points)
    permanentUpgrades: {
        extraStartingLives: 0,           // +1 life per level (max 3)
        generatorSkillReduction: 0,      // Reduce skill checks needed (max 3)
        staminaRechargeSpeed: 0,         // Faster recharge between jumps (max 3)
        maxStaminaBoost: 0,              // Increase max stamina (max 4)
        enemyDamageReduction: 0,         // Take less enemy damage (max 3)
        generatorFailureProtection: 0,   // Reduce failure penalties (max 2)
        jumpChargeSpeed: 0,              // Faster jump charging (max 3)
        startWithExtraLife: false,       // 150 points - start with extra life ability
        startWithShield: false,          // 120 points - start with shield
        pointMultiplier: 0               // Earn more points (max 3)
    },
    
    upgradesEnabled: true // Toggle for challenge runs
};

// Ability definitions (earned during runs)
export const TEMP_ABILITIES = {
    extraLife: {
        name: 'Extra Life',
        description: 'Take one extra hit before dying',
        icon: '❤️',
        earnedAt: 3,
        type: 'protection'
    },
    enemySlow: {
        name: 'Temporal Slow',
        description: 'Enemies move 50% slower for 30s',
        icon: '🐢',
        earnedAt: 5,
        type: 'timed',
        duration: 30000
    },
    staminaryReduction: {
        name: 'Efficient Movement',
        description: 'Jumps cost 50% less stamina',
        icon: '⚡',
        earnedAt: 7,
        type: 'passive'
    },
    wallPhase: {
        name: 'Wall Phase',
        description: 'Walk through walls for 10s',
        icon: '👻',
        earnedAt: 10,
        type: 'timed',
        duration: 10000
    },
    shieldBoost: {
        name: 'Reinforced Shield',
        description: 'Absorb 3 hits before taking damage',
        icon: '🛡️',
        earnedAt: 12,
        type: 'protection'
    },
    invincibility: {
        name: 'Invincibility Burst',
        description: '5 seconds of complete protection',
        icon: '✨',
        earnedAt: 15,
        type: 'timed',
        duration: 5000
    }
};

// Permanent upgrade costs and effects
export const UPGRADE_CATALOG = {
    extraStartingLives: {
        name: 'Extra Starting Life',
        description: 'Start with +1 additional life',
        maxLevel: 3,
        costPerLevel: 60,
        getCost: (level) => 60 + (level * 30)
    },
    generatorSkillReduction: {
        name: 'Generator Expert',
        description: 'Reduce skill checks needed to complete generators',
        maxLevel: 3,
        costPerLevel: 80,
        getCost: (level) => 80 + (level * 40),
        effect: {
            '1': 'Generators need 1 less skill check',
            '2': 'Generators need 2 less skill checks',
            '3': 'Generators complete instantly!'
        }
    },
    staminaRechargeSpeed: {
        name: 'Stamina Recovery',
        description: 'Stamina recharges faster between jumps',
        maxLevel: 3,
        costPerLevel: 70,
        getCost: (level) => 70 + (level * 35),
        effect: {
            '1': '-25% recharge time',
            '2': '-50% recharge time',
            '3': '-75% recharge time'
        }
    },
    maxStaminaBoost: {
        name: 'Stamina Tank',
        description: 'Increase maximum stamina pool',
        maxLevel: 4,
        costPerLevel: 50,
        getCost: (level) => 50 + (level * 25)
    },
    enemyDamageReduction: {
        name: 'Tough Hide',
        description: 'Take reduced damage from enemies',
        maxLevel: 3,
        costPerLevel: 90,
        getCost: (level) => 90 + (level * 45),
        effect: {
            '1': '-25% enemy damage',
            '2': '-50% enemy damage',
            '3': '-75% enemy damage'
        }
    },
    generatorFailureProtection: {
        name: 'Generator Insurance',
        description: 'Reduce penalties for generator failures',
        maxLevel: 2,
        costPerLevel: 100,
        getCost: (level) => 100 + (level * 50),
        effect: {
            '1': 'Only lose 1 life instead of 2 on second failure',
            '2': 'Generator stays usable after failure'
        }
    },
    jumpChargeSpeed: {
        name: 'Quick Charge',
        description: 'Charge jumps faster',
        maxLevel: 3,
        costPerLevel: 65,
        getCost: (level) => 65 + (level * 30)
    },
    startWithExtraLife: {
        name: 'Life Insurance',
        description: 'Start each run with an extra life ability',
        maxLevel: 1,
        costPerLevel: 150,
        getCost: () => 150
    },
    startWithShield: {
        name: 'Starter Shield',
        description: 'Begin runs with 3-hit shield protection',
        maxLevel: 1,
        costPerLevel: 120,
        getCost: () => 120
    },
    pointMultiplier: {
        name: 'Wealth Accumulation',
        description: 'Earn more points per room completed',
        maxLevel: 3,
        costPerLevel: 200,
        getCost: (level) => 200 + (level * 100),
        effect: {
            '1': '+25% points per room',
            '2': '+50% points per room',
            '3': '+100% points per room'
        }
    }
};

/**
 * Calculate difficulty scaling for room number
 */
export function getRoomDifficulty(roomNumber, mode = 'easy') {
    const difficulty = {
        generatorCount: 3,
        enemies: []
    };
    
    // Increase generators every 10 rooms (max 5)
    if (roomNumber >= 30) difficulty.generatorCount = 5;
    else if (roomNumber >= 20) difficulty.generatorCount = 4;
    
    // Base AI pool
    const baseAI = ['chaser', 'mortar', 'pig', 'seeker', 'batter'];
    
    if (mode === 'easy') {
        // EASY MODE: Progressive AI spawns (1→5 unique)
        // Early rooms: random subset that grows to 5 unique
        if (roomNumber <= 5) {
            const count = Math.max(1, Math.min(roomNumber, baseAI.length));
            const pool = [...baseAI];
            for (let i = 0; i < count; i++) {
                const idx = Math.floor(Math.random() * pool.length);
                difficulty.enemies.push(pool.splice(idx, 1)[0]);
            }
        } else {
            // Rooms 6+: all five base AIs, no duplicates
            difficulty.enemies.push(...baseAI);
        }
    } else {
        // HARD MODE: Immediately hard - all 5 AIs from room 1 with duplicates
        // Always spawn all five base AIs
        difficulty.enemies.push(...baseAI);
        
        // Add duplicates scaling with room number
        const extraCount = Math.min(2 + Math.floor(roomNumber / 2), 10);
        for (let i = 0; i < extraCount; i++) {
            const pick = baseAI[Math.floor(Math.random() * baseAI.length)];
            difficulty.enemies.push(pick);
        }
    }
    
    // Randomize enemy order
    difficulty.enemies.sort(() => Math.random() - 0.5);
    
    return difficulty;
}

/**
 * Calculate points earned for completing a room
 */
export function calculateRoomPoints(roomNumber, mode = 'easy') {
    const basePoints = Math.floor(10 + (roomNumber * 2));
    const hardAdjusted = mode === 'hard' ? basePoints * 2 : basePoints;
    // Apply permanent point multiplier upgrade
    const multiplier = 1 + ((endlessProgression.permanentUpgrades?.pointMultiplier || 0) * 0.25);
    return Math.floor(hardAdjusted * multiplier);
}

/**
 * Start a new endless run
 */
export function startEndlessRun(difficultyMode = 'easy') {
    const gs = (typeof window !== 'undefined' && window.gameState) ? window.gameState : null;
    if (gs) {
        gs.mode = 'endless-progression';
    }
    
    endlessProgression.currentRun = {
        active: true,
        roomNumber: 0,
        points: 0,
        activeAbilities: [],
        difficultyMode: difficultyMode,
        livesGained: 0,
        startTime: performance.now() // Track start time for survival achievement
    };
    
    // Apply starting upgrades if enabled
    if (endlessProgression.upgradesEnabled) {
        if (endlessProgression.permanentUpgrades.startWithExtraLife) {
            if (!endlessProgression.currentRun.activeAbilities.includes('extraLife')) {
                endlessProgression.currentRun.activeAbilities.push('extraLife');
            }
        }
        if (endlessProgression.permanentUpgrades.startWithShield) {
            if (!endlessProgression.currentRun.activeAbilities.includes('shieldBoost')) {
                endlessProgression.currentRun.activeAbilities.push('shieldBoost');
            }
        }
    }
    
    saveEndlessProgress();
}

/**
 * Complete current room and advance
 */
export function completeEndlessRoom() {
    if (!endlessProgression.currentRun.active) return;
    
    // Check 10-minute survival achievement
    const survivalTime = performance.now() - endlessProgression.currentRun.startTime;
    if (survivalTime >= 600000 && !endlessProgression.currentRun.survivalAchievementFired) {
        endlessProgression.currentRun.survivalAchievementFired = true;
        try {
            import('./achievements.js').then(mod => {
                if (mod.checkAchievements) {
                    mod.checkAchievements('achievement_event', { eventType: 'endless_survival_10min' });
                }
            }).catch(() => {});
        } catch {}
    }
    
    endlessProgression.currentRun.roomNumber++;
    const roomNum = endlessProgression.currentRun.roomNumber;
    const mode = endlessProgression.currentRun.difficultyMode || 'easy';
    
    // Award points (2x for hard mode)
    const points = calculateRoomPoints(roomNum, mode);
    endlessProgression.currentRun.points += points;
    
    // Fire endless_wave achievement event for endless-progression mode
    try {
        import('./achievements.js').then(mod => {
            if (mod.checkAchievements) {
                mod.checkAchievements('endless_wave', { wave: roomNum, perfectWave: false });
            }
        });
    } catch (e) {
        console.error('Achievement endless_wave event error:', e);
    }
    
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
        if (!upgrade) continue;
        if (typeof level === 'boolean') {
            if (level) totalSpent += upgrade.getCost();
        } else if (typeof level === 'number' && level > 0) {
            for (let i = 0; i < level; i++) {
                totalSpent += upgrade.getCost(i);
            }
        }
    }
    
    // Reset upgrades to default schema
    endlessProgression.permanentUpgrades = {
        extraStartingLives: 0,
        generatorSkillReduction: 0,
        staminaRechargeSpeed: 0,
        maxStaminaBoost: 0,
        enemyDamageReduction: 0,
        generatorFailureProtection: 0,
        jumpChargeSpeed: 0,
        startWithExtraLife: false,
        startWithShield: false,
        pointMultiplier: 0
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
    
    const gs = (typeof window !== 'undefined' && window.gameState) ? window.gameState : null;
    if (!gs) return;
    
    // Extra starting lives
    gs.lives += upgrades.extraStartingLives;
    
    // Max stamina boost (base 100, +25 per level)
    const boostedMaxStamina = 100 + (upgrades.maxStaminaBoost * 25);
    gs.maxStamina = boostedMaxStamina;
    gs.stamina = Math.min(gs.stamina || boostedMaxStamina, boostedMaxStamina);
    
    // Store upgrade levels in gameState for other systems to use
    gs.endlessUpgrades = {
        generatorSkillReduction: upgrades.generatorSkillReduction,
        staminaRegenMultiplier: 1 + (upgrades.staminaRechargeSpeed * 0.25),
        enemyDamageReduction: upgrades.enemyDamageReduction * 0.25, // 25/50/75% mitigation chance
        generatorFailureProtection: upgrades.generatorFailureProtection,
        jumpChargeMultiplier: 1 - (upgrades.jumpChargeSpeed * 0.15),
        pointMultiplier: 1 + (upgrades.pointMultiplier * 0.25),
        startWithExtraLife: upgrades.startWithExtraLife,
        startWithShield: upgrades.startWithShield
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
                    generatorSkillReduction: 0,
                    staminaRechargeSpeed: 0,
                    maxStaminaBoost: 0,
                    enemyDamageReduction: 0,
                    generatorFailureProtection: 0,
                    jumpChargeSpeed: 0,
                    startWithExtraLife: false,
                    startWithShield: false,
                    pointMultiplier: 0
                };
            } else {
                // Normalize missing keys if migrating from an older schema
                parsed.permanentUpgrades = {
                    extraStartingLives: parsed.permanentUpgrades.extraStartingLives || 0,
                    generatorSkillReduction: parsed.permanentUpgrades.generatorSkillReduction || 0,
                    staminaRechargeSpeed: parsed.permanentUpgrades.staminaRechargeSpeed || 0,
                    maxStaminaBoost: parsed.permanentUpgrades.maxStaminaBoost || 0,
                    enemyDamageReduction: parsed.permanentUpgrades.enemyDamageReduction || 0,
                    generatorFailureProtection: parsed.permanentUpgrades.generatorFailureProtection || 0,
                    jumpChargeSpeed: parsed.permanentUpgrades.jumpChargeSpeed || 0,
                    startWithExtraLife: !!parsed.permanentUpgrades.startWithExtraLife,
                    startWithShield: !!parsed.permanentUpgrades.startWithShield,
                    pointMultiplier: parsed.permanentUpgrades.pointMultiplier || 0
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
