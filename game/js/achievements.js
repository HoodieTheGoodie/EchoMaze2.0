/**
 * ACHIEVEMENTS SYSTEM v2 - Complete Rebuild
 * 
 * Clean, event-driven architecture with:
 * - Clear event mapping
 * - Full game integration
 * - Proper unlocking system
 * - Debug/testing mode
 * - Beautiful notifications
 */

import { isGodMode } from './config.js';
import { getConditionMapForAchievements } from './achievement-conditions.js';

// Storage keys
const ACHIEVEMENTS_KEY = 'smg_achievements';
const ACHIEVEMENT_STATS_KEY = 'smg_achievementStats';
const ACHIEVEMENT_DEBUG_MODE = 'smg_achievementDebugMode';
const TRACKED_ACHIEVEMENT_KEY = 'smg_trackedAchievement';

// ============================================================================
// ACHIEVEMENT DEFINITIONS - 56 achievements across all difficulties
// ============================================================================

export const ACHIEVEMENTS = [
    // BRONZE (Easy/Early)
    { id: 'level1_clear', tier: 'bronze', name: 'First Steps', desc: 'Complete Level 1', unlockSkin: null, secret: false },
    { id: 'first_death', tier: 'bronze', name: 'Learning Process', desc: 'Die for the first time', unlockSkin: null, secret: false },
    { id: 'endless_wave_5', tier: 'bronze', name: 'Endurance I', desc: 'Reach wave 5 in Endless', unlockSkin: null, secret: false },
    
    // SILVER (Medium)
    { id: 'level5_clear', tier: 'silver', name: 'Halfway There', desc: 'Complete Level 5', unlockSkin: 'rookie', secret: false },
    { id: 'speedrun_level_60s', tier: 'silver', name: 'Lightning Fast', desc: 'Complete level in under 60s', unlockSkin: 'blitz', secret: false },
    { id: 'no_abilities_level', tier: 'silver', name: 'Purist', desc: 'Level without shield or jump', unlockSkin: null, secret: false },
    { id: 'deathless_3_levels', tier: 'silver', name: 'Survivor', desc: '3 consecutive perfect levels', unlockSkin: null, secret: false },
    { id: 'generator_perfect_3', tier: 'silver', name: 'Mechanic', desc: 'Perfect generator checks x3', unlockSkin: null, secret: false },
    { id: 'boss_mount_3_pigs', tier: 'silver', name: 'Pig Rider', desc: 'Mount 3 pigs in boss fight', unlockSkin: null, secret: false },
    { id: 'endless_wave_10', tier: 'silver', name: 'Endurance II', desc: 'Reach wave 10 in Endless', unlockSkin: null, secret: false },
    { id: 'trap_master', tier: 'silver', name: 'Trap Master', desc: 'Catch 25 enemies in traps', unlockSkin: null, secret: false },
    
    // GOLD (Hard)
    { id: 'level10_clear', tier: 'gold', name: 'Boss Defeated', desc: 'Defeat the Core', unlockSkin: 'veteran', secret: false },
    { id: 'ending_good', tier: 'gold', name: 'Hope Restored', desc: 'Reach the Good Ending', unlockSkin: 'guardian', secret: false },
    { id: 'ending_bad', tier: 'gold', name: 'Shadows Remain', desc: 'Reach the Bad Ending', unlockSkin: 'shadow', secret: false },
    { id: 'ending_normal', tier: 'gold', name: 'System Restarted', desc: 'Reach the Normal Ending', unlockSkin: null, secret: false },
    { id: 'perfect_shield_10', tier: 'gold', name: 'Shield Master', desc: 'Reflect 10 projectiles', unlockSkin: 'defender', secret: false },
    { id: 'speedrun_level3_30s', tier: 'gold', name: 'Pig Pilot', desc: 'Complete Level 3 in under 30s', unlockSkin: null, secret: false },
    { id: 'no_abilities_3_consecutive', tier: 'gold', name: 'Ascetic Path', desc: '3 levels without abilities', unlockSkin: null, secret: false },
    { id: 'generator_perfect_10', tier: 'gold', name: 'Master Mechanic', desc: 'Perfect checks x10', unlockSkin: 'technician', secret: false },
    { id: 'boss_ammo_efficient', tier: 'gold', name: 'Ammo Discipline', desc: 'Defeat boss with ≤6 reloads', unlockSkin: null, secret: false },
    { id: 'endless_wave_15', tier: 'gold', name: 'Endurance III', desc: 'Reach wave 15 in Endless', unlockSkin: 'infinite', secret: false },
    { id: 'endless_perfect_wave', tier: 'gold', name: 'Untouched', desc: 'Perfect wave (no damage)', unlockSkin: null, secret: false },
    { id: 'endless_no_abilities_10', tier: 'gold', name: 'Endless Purist', desc: '10 waves without abilities', unlockSkin: null, secret: false },
    { id: 'secret_level11_power', tier: 'gold', name: 'System Override', desc: 'Discover power supply in L11', unlockSkin: 'glitch', secret: true },
    { id: 'secret_code_alpha', tier: 'gold', name: 'Code Breaker', desc: 'Enter a secret code', unlockSkin: 'void', secret: true },
    { id: 'bazooka_mode_unlock', tier: 'gold', name: 'Weapon Online', desc: 'Unlock Blaster Mode', unlockSkin: null, secret: true },
    { id: 'glitch_teleport_escape', tier: 'gold', name: 'Blinking Master', desc: 'Dodge damage 5+ times', unlockSkin: null, secret: false },
    
    // PLATINUM (Very Hard)
    { id: 'game_complete', tier: 'platinum', name: 'System Reboot', desc: 'Complete the game', unlockSkin: 'engineer', secret: false },
    { id: 'speedrun_game_20m', tier: 'platinum', name: 'Speedrunner', desc: 'Complete game in <20 min', unlockSkin: 'chrono', secret: false },
    { id: 'endless_wave_25', tier: 'platinum', name: 'Infinite Warrior', desc: 'Reach wave 25', unlockSkin: null, secret: false },
    { id: 'endless_wave_35', tier: 'platinum', name: 'Beyond Infinity', desc: 'Reach wave 35', unlockSkin: null, secret: false },
    { id: 'level11_unlock', tier: 'platinum', name: 'Hidden Realm Discovered', desc: 'Unlock the secret Level 11', unlockSkin: null, secret: true },
    { id: 'total_deaths_100', tier: 'platinum', name: 'Phoenix Rising', desc: 'Die 100 times total', unlockSkin: 'phoenix', secret: true },
    { id: 'bazooka_boss_victory', tier: 'platinum', name: 'Armed & Dangerous', desc: 'Defeat boss w/ Blaster', unlockSkin: null, secret: false },
    { id: 'level10_survival_5min', tier: 'platinum', name: 'Ironclad Defender', desc: 'Survive 5 min on L10', unlockSkin: null, secret: false },
    { id: 'perfect_generator_run', tier: 'platinum', name: 'Tech Supreme', desc: 'Perfect all generators', unlockSkin: null, secret: false },
    { id: 'shield_perfect_level', tier: 'platinum', name: 'Invincible', desc: 'No damage + 10 reflects', unlockSkin: null, secret: false },
    
    // DIAMOND (Extreme)
    { id: 'why_destroy_power', tier: 'diamond', name: 'Why??', desc: 'Destroy power supply w/ bazooka', unlockSkin: null, secret: true },
    { id: 'all_endings', tier: 'diamond', name: 'Story Master', desc: 'Unlock all endings', unlockSkin: null, secret: false },
    { id: 'endless_wave_45', tier: 'diamond', name: 'Eternal', desc: 'Reach wave 45', unlockSkin: null, secret: false },
    { id: 'deathless_game', tier: 'diamond', name: 'Untouchable', desc: 'Complete game deathless', unlockSkin: 'ghost', secret: false },
    { id: 'speedrun_game_10m', tier: 'diamond', name: 'Time Lord', desc: 'Complete game in <10 min', unlockSkin: 'time_lord', secret: false },
    
    // RGB (Ultra-Rare / Exclusive)
    { id: '100_percent', tier: 'rgb', name: '◆ 100% ◆', desc: 'All achievements', unlockSkin: 'hundred_percent', secret: false, isRGB: true },
    { id: 'the_first_10', tier: 'rgb', name: '◆ FIRST 10 ◆', desc: 'Top 10 100% achievers', unlockSkin: null, secret: true, isRGB: true, codeLimited: true, codeLimit: 10 },
    { id: 'world_record', tier: 'rgb', name: '◆ WORLD RECORD ◆', desc: 'Verified speedrun record', unlockSkin: null, secret: true, isRGB: true },
];

// ============================================================================
// ACHIEVEMENT UNLOCK REGISTRY - Maps events to achievements
// ============================================================================

export const ACHIEVEMENT_EVENTS = {
    // Level completions
    'level_complete': (level, stats) => {
        if (level === 1) return 'level1_clear';
        if (level === 5) return 'level5_clear';
        if (level === 10) return 'level10_clear';
        return null;
    },
    
    // Deaths
    'first_death': () => 'first_death',
    
    // Endings
    'ending_good': () => 'ending_good',
    'ending_bad': () => 'ending_bad',
    'ending_normal': () => 'ending_normal',
    
    // Endless waves
    'endless_wave_5': () => 'endless_wave_5',
    'endless_wave_10': () => 'endless_wave_10',
    'endless_wave_15': () => 'endless_wave_15',
    'endless_wave_25': () => 'endless_wave_25',
    'endless_wave_35': () => 'endless_wave_35',
    'endless_wave_45': () => 'endless_wave_45',
    
    // Game completion
    'game_complete': () => 'game_complete',
    
    // Secret/niche achievements
    'rotation': (level, stats, data = {}) => {
        if (data.rotations >= 5) return 'spin_cycle';
        return null;
    },
    'secret_found': (level, stats, data = {}) => {
        if (data.secretId === 'hub_dance') return 'hub_dance';
        if (data.secretId === 'pet_pig') return 'pet_pig';
        return null;
    },
};

// ============================================================================
// STATE & TRACKING
// ============================================================================

let debugMode = false;
let achievementStats = getAchievementStats();

function devLog(event, data = {}) {
    try {
        if (window.DEV_EVENT_LOGGER) {
            window.DEV_EVENT_LOGGER(event, data);
        }
    } catch {}
}

export function enableDebugMode() {
    debugMode = true;
    localStorage.setItem(ACHIEVEMENT_DEBUG_MODE, 'true');
    console.log('✓ Achievement Debug Mode ENABLED');
}

export function disableDebugMode() {
    debugMode = false;
    localStorage.removeItem(ACHIEVEMENT_DEBUG_MODE);
    console.log('✗ Achievement Debug Mode DISABLED');
}

export function isDebugModeEnabled() {
    return debugMode || localStorage.getItem(ACHIEVEMENT_DEBUG_MODE) === 'true';
}

// ============================================================================
// MAIN API
// ============================================================================

/**
 * Unlock an achievement by ID
 */
export function unlockAchievement(achievementId) {
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) {
        console.warn(`[ACHIEVEMENT] Unknown achievement: ${achievementId}`);
        return false;
    }

    // Check if already unlocked
    const unlocked = getUnlockedAchievements();
    if (unlocked.some(a => a.id === achievementId)) {
        if (debugMode) console.log(`[ACHIEVEMENT] Already unlocked: ${achievementId}`);
        return false;
    }

    // Save unlock
    const entry = {
        id: achievementId,
        unlockedAt: Date.now()
    };
    unlocked.push(entry);

    try {
        localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(unlocked));
    } catch (e) {
        console.warn('[ACHIEVEMENT] Save failed:', e);
        return false;
    }

    if (debugMode) console.log(`[ACHIEVEMENT] UNLOCKED: ${achievement.name}`);
    devLog('achievement_unlocked', { id: achievementId });

    // Show notification
    showAchievementNotification(achievement);

    // Play sound
    playAchievementSound();

    // Unlock skin if applicable
    if (achievement.unlockSkin) {
        import('./skins.js').then(mod => {
            if (mod.unlockSkin) {
                mod.unlockSkin(achievement.unlockSkin);
            }
        }).catch(() => {});
    }

    // Check for ending combinations (Story Master)
    if (achievementId === 'ending_good' || achievementId === 'ending_bad' || achievementId === 'ending_normal') {
        checkAllEndingsUnlocked();
    }

    // Check for 100%
    checkHundredPercent();

    return true;
}

/**
 * Fire an achievement event - handles complex logic
 */
export function fireAchievementEvent(eventId, data = {}) {
    if (!eventId) return;

    if (debugMode) console.log(`[ACHIEVEMENT EVENT] ${eventId}`, data);
    devLog('achievement_event', { eventId, data });

    // Check if tracked achievement was failed
    checkTrackedAchievementFailure(eventId, data);

    // Handle event-based unlocks
    const handler = ACHIEVEMENT_EVENTS[eventId];
    if (handler) {
        const achievementId = handler(data.level, achievementStats, data);
        if (achievementId) {
            unlockAchievement(achievementId);
        }
    }

    // Handle complex multi-condition achievements
    handleComplexAchievements(eventId, data);
}

/**
 * Complex achievement checking (multi-condition)
 */
function handleComplexAchievements(eventId, data) {
    // Level speedruns
    if (eventId === 'level_complete') {
        const { level, timeMs, noAbilities } = data;
        if (debugMode) {
            console.log(`[ACHIEVEMENT] Level ${level} completed in ${timeMs}ms (${(timeMs/1000).toFixed(2)}s), noAbilities: ${noAbilities}`);
        }
        
        // No Abilities achievement - complete any level without using abilities
        if (noAbilities === true) {
            if (debugMode) {
                console.log(`[ACHIEVEMENT] Level ${level} completed without abilities! Unlocking Purist...`);
            }
            unlockAchievement('no_abilities_level');
        }
        
        // Level 3 speedrun - under 30 seconds
        if (level === 3 && timeMs < 30000) {
            if (debugMode) {
                console.log(`[ACHIEVEMENT] Level 3 speedrun qualified! ${timeMs}ms < 30000ms`);
            }
            unlockAchievement('speedrun_level3_30s');
        }
        
        // Level 60s speedrun - any level under 60 seconds
        if (timeMs < 60000) {
            unlockAchievement('speedrun_level_60s');
        }
    }
    
    // Check if all endings have been unlocked
    if (eventId === 'ending_good' || eventId === 'ending_bad' || eventId === 'ending_normal') {
        const unlocked = getUnlockedAchievements();
        const hasGood = unlocked.some(a => a.id === 'ending_good');
        const hasBad = unlocked.some(a => a.id === 'ending_bad');
        const hasNormal = unlocked.some(a => a.id === 'ending_normal');
        
        if (debugMode) {
            console.log(`[ACHIEVEMENT] Endings check - Good: ${hasGood}, Bad: ${hasBad}, Normal: ${hasNormal}`);
        }
        
        if (hasGood && hasBad && hasNormal) {
            if (debugMode) {
                console.log(`[ACHIEVEMENT] All endings unlocked! Unlocking Story Master...`);
            }
            unlockAchievement('all_endings');
        }
    }
}

/**
 * Check if 100% completion achieved
 */
function checkHundredPercent() {
    const unlocked = getUnlockedAchievements();
    if (unlocked.length === ACHIEVEMENTS.length) {
        unlockAchievement('100_percent');
    }
}

/**
 * Check if all endings have been unlocked
 */
function checkAllEndingsUnlocked() {
    const unlocked = getUnlockedAchievements();
    const hasGood = unlocked.some(a => a.id === 'ending_good');
    const hasBad = unlocked.some(a => a.id === 'ending_bad');
    const hasNormal = unlocked.some(a => a.id === 'ending_normal');
    const hasStoryMaster = unlocked.some(a => a.id === 'all_endings');
    
    if (debugMode) {
        console.log(`[ACHIEVEMENT] Endings check - Good: ${hasGood}, Bad: ${hasBad}, Normal: ${hasNormal}`);
    }
    
    if (hasGood && hasBad && hasNormal && !hasStoryMaster) {
        if (debugMode) {
            console.log(`[ACHIEVEMENT] All endings unlocked! Unlocking Story Master...`);
        }
        // Use setTimeout to avoid recursion during the same call stack
        setTimeout(() => {
            const achievement = ACHIEVEMENTS.find(a => a.id === 'all_endings');
            if (!achievement) return;
            
            const currentUnlocked = getUnlockedAchievements();
            if (currentUnlocked.some(a => a.id === 'all_endings')) return;
            
            const entry = { id: 'all_endings', unlockedAt: Date.now() };
            currentUnlocked.push(entry);
            
            try {
                localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(currentUnlocked));
                showAchievementNotification(achievement);
                playAchievementSound();
                if (achievement.unlockSkin) {
                    import('./skins.js').then(mod => {
                        if (mod.unlockSkin) mod.unlockSkin(achievement.unlockSkin);
                    }).catch(() => {});
                }
            } catch (e) {
                console.warn('[ACHIEVEMENT] Failed to unlock Story Master:', e);
            }
        }, 100);
    }
}

// ============================================================================
// NOTIFICATIONS & AUDIO
// ============================================================================

function showAchievementNotification(achievement) {
    import('./ui-notifications.js')
        .then(mod => {
            if (mod.showAchievementUnlocked) {
                mod.showAchievementUnlocked(achievement);
            }
        })
        .catch(() => {});
}

function playAchievementSound() {
    import('./audio.js')
        .then(mod => {
            if (mod.playAchievementUnlock) {
                mod.playAchievementUnlock();
            }
        })
        .catch(() => {});
}

// ============================================================================
// GETTERS & UTILITIES
// ============================================================================

export function getUnlockedAchievements() {
    try {
        const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function getAchievementStats() {
    try {
        const raw = localStorage.getItem(ACHIEVEMENT_STATS_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

export function isAchievementUnlocked(achievementId) {
    return getUnlockedAchievements().some(a => a.id === achievementId);
}

export function getAchievementProgress() {
    return {
        unlocked: getUnlockedAchievements().length,
        total: ACHIEVEMENTS.length,
        percentage: Math.round((getUnlockedAchievements().length / ACHIEVEMENTS.length) * 100)
    };
}

/**
 * Get individual achievement progress for count-based achievements
 * Returns object like: { total_deaths_100: {current: 45, max: 100}, ... }
 */
export function getIndividualAchievementProgress(achievementId) {
    const stats = getAchievementStats();
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    
    if (!achievement) return null;
    
    // Map achievement IDs to their progress tracking
    const progressMap = {
        'total_deaths_100': { current: stats.totalDeaths || 0, max: 100 },
        'deathless_3_levels': { current: stats.consecutiveDeathlessLevels || 0, max: 3 },
        'generator_perfect_3': { current: stats.perfectGenerators || 0, max: 3 },
        'generator_perfect_10': { current: stats.perfectGenerators || 0, max: 10 },
        'boss_mount_3_pigs': { current: stats.pigsMounted || 0, max: 3 },
        'trap_master': { current: stats.trappedEnemies || 0, max: 25 },
        'perfect_shield_10': { current: stats.reflectedProjectiles || 0, max: 10 },
        'no_abilities_3_consecutive': { current: stats.consecutiveNoAbilityLevels || 0, max: 3 },
        'endless_no_abilities_10': { current: stats.endlessNoAbilityWaves || 0, max: 10 },
        'glitch_teleport_escape': { current: stats.glitchTeleportEscapes || 0, max: 5 },
    };
    
    return progressMap[achievementId] || null;
}

/**
 * Get detailed condition information for any achievement
 * Returns: { conditions: [...], progress: {...}, met: boolean, category: string }
 */
export function getAchievementConditions(achievementId) {
    const stats = getAchievementStats();
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    
    if (!achievement) return null;
    
    const conditionMap = getConditionMapForAchievements(stats);
    const info = conditionMap[achievementId];
    
    if (!info) {
        return {
            conditions: [{ label: 'Complete the achievement objective', met: false, current: 0, max: 1 }],
            category: 'Unknown',
            allMet: false
        };
    }
    
    const allMet = info.conditions.every(c => c.met);
    
    return {
        ...info,
        allMet
    };
}

/**
 * Update achievement progress stats
 */
export function updateAchievementProgress(key, value) {
    const stats = getAchievementStats();
    stats[key] = value;
    try {
        localStorage.setItem(ACHIEVEMENT_STATS_KEY, JSON.stringify(stats));
    } catch (e) {
        console.warn('[ACHIEVEMENT] Failed to save progress:', e);
    }
}

/**
 * Increment achievement progress
 */
export function incrementAchievementProgress(key, amount = 1) {
    const stats = getAchievementStats();
    stats[key] = (stats[key] || 0) + amount;
    try {
        localStorage.setItem(ACHIEVEMENT_STATS_KEY, JSON.stringify(stats));
    } catch (e) {
        console.warn('[ACHIEVEMENT] Failed to save progress:', e);
    }
    
    // Check if this progress update is for a tracked achievement
    const tracked = getTrackedAchievement();
    if (tracked) {
        showTrackedAchievementProgress(tracked, key, stats[key]);
    }
    
    // Auto-check for achievements that should unlock based on this stat
    checkProgressBasedAchievements(key, stats[key]);
    
    return stats[key];
}

/**
 * Check and auto-unlock achievements based on stat thresholds
 */
function checkProgressBasedAchievements(statKey, currentValue) {
    // Map stat keys to achievements they should unlock
    const statToAchievementMap = {
        'totalDeaths': [
            { threshold: 1, achievement: 'first_death' },
            { threshold: 100, achievement: 'total_deaths_100' }
        ],
        'trappedEnemies': [
            { threshold: 25, achievement: 'trap_master' }
        ],
        'reflectedProjectiles': [
            { threshold: 10, achievement: 'perfect_shield_10' }
        ],
        'glitchTeleportEscapes': [
            { threshold: 5, achievement: 'glitch_teleport_escape' }
        ],
        'pigsMounted': [
            { threshold: 3, achievement: 'boss_mount_3_pigs' }
        ],
        'perfectGenerators': [
            { threshold: 3, achievement: 'generator_perfect_3' },
            { threshold: 10, achievement: 'generator_perfect_10' }
        ],
        'consecutiveDeathlessLevels': [
            { threshold: 3, achievement: 'deathless_3_levels' }
        ],
        'consecutiveNoAbilityLevels': [
            { threshold: 3, achievement: 'no_abilities_3_consecutive' }
        ],
        'endlessNoAbilityWaves': [
            { threshold: 10, achievement: 'endless_no_abilities_10' }
        ]
    };
    
    const achievementsToCheck = statToAchievementMap[statKey];
    if (!achievementsToCheck) return;
    
    // Check each threshold
    achievementsToCheck.forEach(({ threshold, achievement }) => {
        if (currentValue >= threshold && !isAchievementUnlocked(achievement)) {
            if (debugMode) {
                console.log(`[ACHIEVEMENT] Auto-unlocking ${achievement} - ${statKey} reached ${currentValue}/${threshold}`);
            }
            unlockAchievement(achievement);
        }
    });
}

/**
 * Manually check all stat-based achievements and unlock any that meet criteria
 * Call this to fix achievements that should have unlocked but didn't
 */
export function recheckAllProgressAchievements() {
    const stats = getAchievementStats();
    
    // Check all stat-based achievements
    const checks = [
        { stat: 'totalDeaths', value: stats.totalDeaths || 0, achievements: [
            { threshold: 1, id: 'first_death' },
            { threshold: 100, id: 'total_deaths_100' }
        ]},
        { stat: 'trappedEnemies', value: stats.trappedEnemies || 0, achievements: [
            { threshold: 25, id: 'trap_master' }
        ]},
        { stat: 'reflectedProjectiles', value: stats.reflectedProjectiles || 0, achievements: [
            { threshold: 10, id: 'perfect_shield_10' }
        ]},
        { stat: 'glitchTeleportEscapes', value: stats.glitchTeleportEscapes || 0, achievements: [
            { threshold: 5, id: 'glitch_teleport_escape' }
        ]},
        { stat: 'pigsMounted', value: stats.pigsMounted || 0, achievements: [
            { threshold: 3, id: 'boss_mount_3_pigs' }
        ]},
        { stat: 'perfectGenerators', value: stats.perfectGenerators || 0, achievements: [
            { threshold: 3, id: 'generator_perfect_3' },
            { threshold: 10, id: 'generator_perfect_10' }
        ]},
        { stat: 'consecutiveDeathlessLevels', value: stats.consecutiveDeathlessLevels || 0, achievements: [
            { threshold: 3, id: 'deathless_3_levels' }
        ]},
        { stat: 'consecutiveNoAbilityLevels', value: stats.consecutiveNoAbilityLevels || 0, achievements: [
            { threshold: 3, id: 'no_abilities_3_consecutive' }
        ]},
        { stat: 'endlessNoAbilityWaves', value: stats.endlessNoAbilityWaves || 0, achievements: [
            { threshold: 10, id: 'endless_no_abilities_10' }
        ]}
    ];
    
    let unlockedCount = 0;
    
    checks.forEach(({ stat, value, achievements }) => {
        achievements.forEach(({ threshold, id }) => {
            if (value >= threshold && !isAchievementUnlocked(id)) {
                console.log(`[ACHIEVEMENT] Unlocking ${id} - ${stat} is ${value}/${threshold}`);
                unlockAchievement(id);
                unlockedCount++;
            }
        });
    });
    
    if (unlockedCount > 0) {
        console.log(`[ACHIEVEMENT] Recheck complete: ${unlockedCount} achievement(s) unlocked!`);
    } else {
        console.log('[ACHIEVEMENT] Recheck complete: All progress achievements up to date.');
    }
    
    return unlockedCount;
}

// ============================================================================
// DEBUG/TESTING MODE
// ============================================================================

/**
 * Debug: Unlock a specific achievement
 */
export function debugUnlock(achievementId) {
    if (!isDebugModeEnabled()) {
        console.warn('[ACHIEVEMENT] Debug mode not enabled');
        return;
    }
    unlockAchievement(achievementId);
    console.log(`[DEBUG] Unlocked: ${achievementId}`);
}

/**
 * Debug: Unlock all achievements
 */
export function debugUnlockAll() {
    if (!isDebugModeEnabled()) {
        console.warn('[ACHIEVEMENT] Debug mode not enabled');
        return;
    }
    ACHIEVEMENTS.forEach(a => {
        if (!isAchievementUnlocked(a.id)) {
            unlockAchievement(a.id);
        }
    });
    console.log('[DEBUG] All achievements unlocked!');
}

/**
 * Debug: Clear all achievements
 */
export function debugClearAll() {
    if (!isDebugModeEnabled()) {
        console.warn('[ACHIEVEMENT] Debug mode not enabled');
        return;
    }
    localStorage.removeItem(ACHIEVEMENTS_KEY);
    console.log('[DEBUG] All achievements cleared!');
}

/**
 * Debug: Show all achievements
 */
export function debugListAll() {
    console.log('=== ALL ACHIEVEMENTS ===');
    ACHIEVEMENTS.forEach(a => {
        const unlocked = isAchievementUnlocked(a.id) ? '✓' : '○';
        console.log(`${unlocked} [${a.tier.toUpperCase()}] ${a.name} (${a.id})`);
    });
    console.log(`\nProgress: ${getAchievementProgress().percentage}%`);
}

/**
 * Debug: Show test commands
 */
export function debugShowCommands() {
    console.log(`
=== ACHIEVEMENT DEBUG COMMANDS ===
window.ACHIEVEMENT.enable()                    - Enable debug mode
window.ACHIEVEMENT.disable()                   - Disable debug mode
window.ACHIEVEMENT.unlock('id')                - Unlock specific achievement
window.ACHIEVEMENT.unlockAll()                 - Unlock all achievements
window.ACHIEVEMENT.clear()                     - Clear all achievements
window.ACHIEVEMENT.list()                      - List all achievements
window.ACHIEVEMENT.recheck()                   - Recheck and auto-unlock progress achievements
window.ACHIEVEMENT.progress()                  - Get progress stats
window.ACHIEVEMENT.isUnlocked('id')            - Check if achievement is unlocked
    `);
}

/**
 * Backward compatibility wrapper for old checkAchievements function
 * This allows existing code that calls checkAchievements() to still work
 */
export function checkAchievements(eventType, data = {}) {
    // Map old event names to new ones if needed, otherwise just fire the event
    return fireAchievementEvent(eventType, data);
}

/**
 * Initialize achievements system (no-op, system initializes on import)
 */
export function initAchievements() {
    // System loads achievements from localStorage on import
    // This is kept for backward compatibility
    console.log('[ACHIEVEMENT] System initialized');
}
// ============================================================================
// ACHIEVEMENT TRACKING SYSTEM
// ============================================================================

/**
 * Set currently tracked achievement
 */
export function trackAchievement(achievementId) {
    if (achievementId === null) {
        localStorage.removeItem(TRACKED_ACHIEVEMENT_KEY);
        console.log('[ACHIEVEMENT] Tracking cleared');
        return;
    }
    
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) {
        console.warn(`[ACHIEVEMENT] Unknown achievement: ${achievementId}`);
        return;
    }
    
    localStorage.setItem(TRACKED_ACHIEVEMENT_KEY, achievementId);
    console.log(`[ACHIEVEMENT] Now tracking: ${achievement.name}`);
    
    // Show notification
    showTrackingNotification(achievement);
}

/**
 * Get currently tracked achievement
 */
export function getTrackedAchievement() {
    const id = localStorage.getItem(TRACKED_ACHIEVEMENT_KEY);
    if (!id) return null;
    return ACHIEVEMENTS.find(a => a.id === id) || null;
}

/**
 * Check if tracked achievement was failed (only show notification if tracking)
 */
export function checkTrackedAchievementFailure(eventType, data = {}) {
    const tracked = getTrackedAchievement();
    if (!tracked) return; // Only show notifications for actively tracked achievements
    
    // Check for ability usage failures
    if (eventType === 'ability_used') {
        if (tracked.id === 'no_abilities_level' || 
            tracked.id === 'no_abilities_3_consecutive' || 
            tracked.id === 'endless_no_abilities_10') {
            showAchievementFailedNotification(tracked, 'Used an ability!');
        }
    }
    
    // Check for death failures
    if (eventType === 'player_death') {
        if (tracked.id === 'deathless_3_levels' || 
            tracked.id === 'deathless_game') {
            showAchievementFailedNotification(tracked, 'Died!');
        }
    }
    
    // Check for generator failures
    if (eventType === 'generator_failed') {
        if (tracked.id === 'generator_perfect_3' || 
            tracked.id === 'generator_perfect_10' ||
            tracked.id === 'perfect_generator_run') {
            showAchievementFailedNotification(tracked, 'Missed generator check!');
        }
    }
}

/**
 * Show tracking started notification
 */
function showTrackingNotification(achievement) {
    const container = getOrCreateNotificationContainer();
    const notification = document.createElement('div');
    notification.className = 'achievement-notification tracking';
    
    notification.innerHTML = `
        <div class="achievement-pop" style="background: linear-gradient(135deg, #00f6ff, #0099cc); border: 2px solid #00f6ff;">
            <div class="achievement-icon-circle" style="background: rgba(0, 246, 255, 0.2);">📍</div>
            <div class="achievement-content">
                <div class="achievement-unlock-label" style="color: #000;">TRACKING ACHIEVEMENT</div>
                <div class="achievement-title" style="color: #000;">${achievement.name}</div>
                <div class="achievement-description" style="color: #333;">${achievement.desc}</div>
            </div>
        </div>
    `;
    
    container.appendChild(notification);
    
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 400);
    }, 3000);
}

/**
 * Show achievement failed notification
 */
function showAchievementFailedNotification(achievement, reason) {
    const container = getOrCreateNotificationContainer();
    const notification = document.createElement('div');
    notification.className = 'achievement-notification failed';
    
    notification.innerHTML = `
        <div class="achievement-pop" style="background: linear-gradient(135deg, #ff4444, #cc0000); border: 2px solid #ff4444;">
            <div class="achievement-icon-circle" style="background: rgba(255, 68, 68, 0.2);">❌</div>
            <div class="achievement-content">
                <div class="achievement-unlock-label" style="color: #fff;">ACHIEVEMENT FAILED!</div>
                <div class="achievement-title" style="color: #fff;">${achievement.name}</div>
                <div class="achievement-description" style="color: #ffcccc;">${reason} Try again!</div>
            </div>
        </div>
    `;
    
    container.appendChild(notification);
    
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });
    
    // Play error sound
    try {
        import('./audio.js').then(mod => {
            if (mod.playError) mod.playError();
        }).catch(() => {});
    } catch {}
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 400);
    }, 4000);
    
    // Clear tracking
    trackAchievement(null);
}

/**
 * Get or create notification container
 */
function getOrCreateNotificationContainer() {
    let container = document.getElementById('achievementNotificationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'achievementNotificationContainer';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 12px;
            pointer-events: none;
            font-family: 'Courier New', monospace;
        `;
        document.body.appendChild(container);
    }
    return container;
}

/**
 * Show tracked achievement progress notification
 */
function showTrackedAchievementProgress(achievement, statKey, currentValue) {
    // Map stat keys to their progress limits
    const progressMap = {
        'perfectGenerators': { max: 10, label: 'Generator Checks' },
        'totalDeaths': { max: 100, label: 'Deaths' },
        'trappedEnemies': { max: 25, label: 'Trapped Enemies' },
        'reflectedProjectiles': { max: 10, label: 'Projectiles Reflected' },
        'glitchTeleportEscapes': { max: 5, label: 'Teleport Escapes' },
        'pigsMounted': { max: 3, label: 'Pigs Mounted' },
        'consecutiveDeathlessLevels': { max: 3, label: 'Deathless Levels' },
        'consecutiveNoAbilityLevels': { max: 3, label: 'No Ability Levels' },
        'endlessNoAbilityWaves': { max: 10, label: 'No Ability Waves' },
    };
    
    const limit = progressMap[statKey];
    if (!limit) return; // Not a tracked progress stat
    
    const container = getOrCreateNotificationContainer();
    const notification = document.createElement('div');
    notification.className = 'achievement-notification progress';
    
    const percent = Math.min(100, (currentValue / limit.max) * 100);
    const tierColor = getTierColor(achievement.tier);
    
    notification.innerHTML = `
        <div class="achievement-pop" style="background: linear-gradient(135deg, ${tierColor}40, ${tierColor}20); border: 2px solid ${tierColor};">
            <div class="achievement-icon-circle" style="background: rgba(0, 246, 255, 0.2);">📈</div>
            <div class="achievement-content">
                <div class="achievement-unlock-label" style="color: #fff;">PROGRESS UPDATE</div>
                <div class="achievement-title" style="color: #fff;">${achievement.name}</div>
                <div class="achievement-description" style="color: ${tierColor}; margin-bottom: 6px;">${limit.label}: ${currentValue}/${limit.max}</div>
                <div style="
                    width: 100%;
                    height: 6px;
                    background: rgba(0, 0, 0, 0.5);
                    border-radius: 3px;
                    overflow: hidden;
                    border: 1px solid ${tierColor};
                ">
                    <div style="
                        width: ${percent}%;
                        height: 100%;
                        background: linear-gradient(90deg, ${tierColor}, ${tierColor}aa);
                        transition: width 0.3s ease;
                    "></div>
                </div>
            </div>
        </div>
    `;
    
    container.appendChild(notification);
    
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 400);
    }, 2500);
}

/**
 * Reset all achievements
 */
export function resetAchievements() {
    localStorage.removeItem(ACHIEVEMENTS_KEY);
    localStorage.removeItem(ACHIEVEMENT_STATS_KEY);
    console.log('[ACHIEVEMENT] All achievements reset');
    location.reload(); // Reload to reinitialize
}

// Initialize debug mode from storage and expose to window
if (typeof window !== 'undefined') {
    debugMode = localStorage.getItem(ACHIEVEMENT_DEBUG_MODE) === 'true';
    if (debugMode) {
        console.log('%c[ACHIEVEMENT] Debug mode active on startup', 'color: #FFD700; font-weight: bold;');
    }

    // Expose achievement API to window for easy testing
    window.ACHIEVEMENT = {
        enable: enableDebugMode,
        disable: disableDebugMode,
        unlock: debugUnlock,
        unlockAll: debugUnlockAll,
        clear: debugClearAll,
        list: debugListAll,
        help: debugShowCommands,
        progress: getAchievementProgress,
        unlocked: getUnlockedAchievements,
        fire: fireAchievementEvent,
        isUnlocked: isAchievementUnlocked,
        recheck: recheckAllProgressAchievements
    };

    // Show help on first load if debug mode enabled
    if (debugMode && localStorage.getItem('ACHIEVEMENT_DEBUG_SHOWN') !== 'true') {
        localStorage.setItem('ACHIEVEMENT_DEBUG_SHOWN', 'true');
        console.log('%c=== ACHIEVEMENT DEBUG MODE ENABLED ===\nType: window.ACHIEVEMENT.help()\nOr press Ctrl+Shift+A to toggle debug mode', 'color: #00FF00; font-weight: bold; font-size: 12px;');
    }
}

// Keyboard shortcut to toggle debug mode
if (typeof window !== 'undefined') {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'A') {
            if (isDebugModeEnabled()) {
                disableDebugMode();
                console.log('%c[ACHIEVEMENT] Debug mode DISABLED', 'color: #FF0000;');
            } else {
                enableDebugMode();
                console.log('%c[ACHIEVEMENT] Debug mode ENABLED - Type: window.ACHIEVEMENT.help()', 'color: #FFD700; font-weight: bold;');
            }
        }
    });
}

