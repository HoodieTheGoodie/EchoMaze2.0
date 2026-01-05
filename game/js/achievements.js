// achievements.js - Achievement tracking and unlock system

import { isGodMode } from './config.js';

const ACHIEVEMENTS_KEY = 'smg_achievements';
const ACHIEVEMENT_STATS_KEY = 'smg_achievementStats';

// Achievement definitions - SORTED BY DIFFICULTY (Bronze → Silver → Gold → Platinum → Diamond)
export const ACHIEVEMENTS = [
    // === BRONZE (Easy/Early Game) ===
    { id: 'level1_clear', name: 'First Steps', desc: 'Complete Level 1', tier: 'bronze', secret: false, unlockSkin: null },
    { id: 'pet_pig', name: 'Gentle Soul', desc: 'Show compassion to a fallen enemy', tier: 'bronze', secret: true, unlockSkin: null, devDesc: '[DEV] Stand still near a fallen pig enemy for 5 seconds without moving' },
    { id: 'hub_dance', name: 'Victory Dance', desc: 'Take a moment to celebrate in the hub', tier: 'bronze', secret: true, unlockSkin: null, devDesc: '[DEV] Press D key 10 times in a row in the hub' },
    { id: 'endless_wave_10', name: 'Endurance I', desc: 'Reach wave 10 in Endless Mode', tier: 'bronze', secret: false, unlockSkin: null },
    { id: 'first_death', name: 'Learning Process', desc: 'Die for the first time', tier: 'bronze', secret: false, unlockSkin: null },
    { id: 'wall_hugger', name: 'Wall Hugger', desc: 'Stay against a wall for way too long', tier: 'bronze', secret: true, unlockSkin: null, devDesc: '[DEV] Stay touching the same wall for 30 consecutive seconds in any level' },
    { id: 'spin_cycle', name: 'Spin Cycle', desc: 'Make yourself dizzy', tier: 'bronze', secret: true, unlockSkin: null, devDesc: '[DEV] Rotate 360 degrees 5 times in under 10 seconds (WASD movement only, not mouse)' },
    
    // === SILVER (Medium/Mid Game) ===
    { id: 'level5_clear', name: 'Halfway There', desc: 'Complete Level 5', tier: 'silver', secret: false, unlockSkin: 'rookie' },
    { id: 'speedrun_level_60s', name: 'Lightning Fast', desc: 'Complete any level in under 60 seconds', tier: 'silver', secret: false, unlockSkin: 'blitz' },
    { id: 'no_abilities_level', name: 'Purist', desc: 'Complete any level without using sprint, block, or jump', tier: 'silver', secret: false, unlockSkin: null },
    { id: 'deathless_3_levels', name: 'Survivor', desc: 'Complete 3 consecutive levels without dying', tier: 'silver', secret: false, unlockSkin: null },
    { id: 'generator_perfect_3', name: 'Mechanic', desc: 'Complete 3 generator skill checks with perfect timing', tier: 'silver', secret: false, unlockSkin: null },
    { id: 'boss_mount_3_pigs', name: 'Pig Rider', desc: 'Mount 3 different pigs during the boss fight', tier: 'silver', secret: false, unlockSkin: null },
    { id: 'endless_wave_20', name: 'Endurance II', desc: 'Reach wave 20 in Endless Mode', tier: 'silver', secret: false, unlockSkin: null },
    { id: 'secret_note', name: 'Curious Explorer', desc: 'Find the hidden note in the hub', tier: 'silver', secret: true, unlockSkin: null },
    { id: 'trap_master', name: 'Trap Master', desc: 'Catch 25 enemies in traps', tier: 'silver', secret: false, unlockSkin: null },
    { id: 'endless_combo_5', name: 'Combo Master', desc: 'Defeat 5 enemies in a row without missing in Endless Mode', tier: 'silver', secret: false, unlockSkin: null },
    { id: 'level2_backwards', name: 'Reverse Engineer', desc: 'Complete Level 2 while mostly moving backwards', tier: 'silver', secret: true, unlockSkin: null, devDesc: '[DEV] Complete Level 2 with at least 70% of movements being backwards (S key)' },
    { id: 'corner_dweller', name: 'Corner Dweller', desc: 'Find comfort in the corners', tier: 'silver', secret: true, unlockSkin: null, devDesc: '[DEV] Visit all 4 corners of the maze in Level 1 within 20 seconds' },
    
    // === GOLD (Hard/Late Game) ===
    { id: 'level10_clear', name: 'Boss Defeated', desc: 'Defeat the Core and complete Level 10', tier: 'gold', secret: false, unlockSkin: 'veteran' },
    { id: 'ending_good', name: 'Hope Restored', desc: 'Reach the Good Ending', tier: 'gold', secret: false, unlockSkin: 'guardian' },
    { id: 'ending_bad', name: 'Shadows Remain', desc: 'Reach the Bad Ending', tier: 'gold', secret: false, unlockSkin: 'shadow' },
    { id: 'ending_virus', name: 'Corrupted Legacy', desc: 'Reach the Virus Ending', tier: 'gold', secret: false, unlockSkin: 'corrupted' },
    { id: 'perfect_shield_10', name: 'Shield Master', desc: 'Reflect 10 projectiles with your shield in a single run', tier: 'gold', secret: false, unlockSkin: 'defender' },
    { id: 'speedrun_level3_30s', name: 'Pig Pilot', desc: 'Complete Level 3 in under 30 seconds', tier: 'gold', secret: false, unlockSkin: null },
    { id: 'no_abilities_3_consecutive', name: 'Ascetic Path', desc: 'Complete 3 consecutive levels without using any abilities', tier: 'gold', secret: false, unlockSkin: null },
    { id: 'generator_perfect_10', name: 'Master Mechanic', desc: 'Complete 10 generator skill checks with perfect timing', tier: 'gold', secret: false, unlockSkin: 'technician' },
    { id: 'boss_ammo_efficient', name: 'Ammunition Discipline', desc: 'Defeat the Core with no more than 6 reloads at ammo stations', tier: 'gold', secret: false, unlockSkin: null },
    { id: 'endless_wave_30', name: 'Endurance III', desc: 'Reach wave 30 in Endless Mode', tier: 'gold', secret: false, unlockSkin: 'infinite' },
    { id: 'endless_perfect_wave', name: 'Untouched', desc: 'Complete a wave in Endless Mode without taking damage', tier: 'gold', secret: false, unlockSkin: null },
    { id: 'endless_no_abilities_10', name: 'Endless Purist', desc: 'Complete 10 waves in Endless Mode without using any abilities', tier: 'gold', secret: false, unlockSkin: null },
    { id: 'secret_level11_power', name: 'System Override', desc: 'Discover the power supply in Level 11', tier: 'gold', secret: true, unlockSkin: 'glitch' },
    { id: 'secret_code_alpha', name: 'Code Breaker', desc: 'Enter a secret code', tier: 'gold', secret: true, unlockSkin: 'void' },
    { id: 'bazooka_mode_unlock', name: 'Weapon System Online', desc: 'Unlock Bazooka Mode', tier: 'gold', secret: true, unlockSkin: null, devDesc: '[DEV] Enter code ECHOMAZE in the skins menu secret code area' },
    { id: 'level4_no_sprint', name: 'Patience is a Virtue', desc: 'Complete Level 4 without sprinting once', tier: 'gold', secret: true, unlockSkin: null, devDesc: '[DEV] Complete Level 4 without pressing Shift at all' },
    { id: 'bazooka_wall_breaker', name: 'Demolition Expert', desc: 'Destroy 50 walls with the bazooka', tier: 'gold', secret: false, unlockSkin: null, devDesc: '[DEV] Requires Bazooka Mode enabled - destroy 50 inner maze walls with bazooka shots' },
    { id: 'shield_reflect_consecutive', name: 'Perfect Parry', desc: 'Reflect 5 projectiles in a row without moving (easier with Defender)', tier: 'gold', secret: false, unlockSkin: null, devDesc: '[DEV] Block 5 projectiles consecutively - Defender skin recommended' },
    { id: 'level5_speed_challenge', name: 'Swift Escape', desc: 'Complete Level 5 in under 50 seconds (easier with Ghost/Blitz)', tier: 'gold', secret: false, unlockSkin: null, devDesc: '[DEV] Speed run Level 5 - recommend Ghost or Blitz skin' },
    { id: 'glitch_teleport_escape', name: 'Blinking Master', desc: 'Escape damage 10 times using Glitch teleport in one level', tier: 'gold', secret: false, unlockSkin: null, devDesc: '[DEV] Play as Glitch, dodge damage 10+ times with teleport in one level' },
    { id: 'chrono_stamina_spree', name: 'Infinite Sprint', desc: 'Use stamina abilities 50+ times in one level (Chrono recommended)', tier: 'gold', secret: false, unlockSkin: null, devDesc: '[DEV] Use sprint/dash 50+ times in single level - Chrono best choice' },
    
    // === PLATINUM (Very Hard/Expert) ===
    { id: 'game_complete', name: 'System Reboot', desc: 'Complete the entire game', tier: 'platinum', secret: false, unlockSkin: 'engineer' },
    { id: 'speedrun_game_25m', name: 'Speedrunner', desc: 'Complete the entire game in under 25 minutes', tier: 'platinum', secret: false, unlockSkin: 'chrono' },
    { id: 'deathless_game', name: 'Untouchable', desc: 'Complete the entire game without dying once', tier: 'platinum', secret: false, unlockSkin: 'ghost' },
    { id: 'speedrun_game_20m', name: 'Time Lord', desc: 'Complete the entire game in under 20 minutes', tier: 'platinum', secret: false, unlockSkin: 'time_lord' },
    { id: 'endless_wave_50', name: 'Infinite Warrior', desc: 'Reach wave 50 in Endless Mode', tier: 'platinum', secret: false, unlockSkin: null },
    { id: 'endless_wave_75', name: 'Beyond Infinity', desc: 'Reach wave 75 in Endless Mode', tier: 'platinum', secret: false, unlockSkin: null },
    { id: 'endless_flawless_10', name: 'Flawless Endurance', desc: 'Complete 10 consecutive waves in Endless Mode without taking damage', tier: 'platinum', secret: false, unlockSkin: null },
    { id: 'total_deaths_100', name: 'Phoenix Rising', desc: 'Die 100 times total (across all runs)', tier: 'platinum', secret: true, unlockSkin: 'phoenix' },
    { id: 'bazooka_boss_victory', name: 'Armed and Dangerous', desc: 'Defeat the boss with Bazooka Mode enabled', tier: 'platinum', secret: false, unlockSkin: null, devDesc: '[DEV] Beat Level 10 boss with Bazooka Mode enabled (available from start)' },
    { id: 'level7_only_jumps', name: 'Kangaroo Mode', desc: 'Complete Level 7 using only jumping for movement', tier: 'platinum', secret: true, unlockSkin: null, devDesc: '[DEV] Complete Level 7 without pressing WASD - only use Space to jump for movement' },
    { id: 'level10_survival_5min', name: 'Ironclad Defender', desc: 'Survive on Level 10 (boss area) for 5 minutes without losing a life', tier: 'platinum', secret: false, unlockSkin: null, devDesc: '[DEV] Stay alive in Level 10 boss arena for 5 continuous minutes' },
    { id: 'endless_survival_10min', name: 'Eternal Guardian', desc: 'Survive 10 minutes in Endless Mode without dying', tier: 'platinum', secret: false, unlockSkin: null, devDesc: '[DEV] Last 10 full minutes (600s) in Endless without any deaths' },
    { id: 'perfect_generator_run', name: 'Technician Supreme', desc: 'Complete an entire level with perfect generator timing on all 5 generators', tier: 'platinum', secret: false, unlockSkin: null, devDesc: '[DEV] Perfect timing on EVERY generator in one level (need 5+ generators)' },
    { id: 'shield_perfect_level', name: 'Invincible', desc: 'Complete a level without taking ANY damage and reflect 10+ projectiles', tier: 'platinum', secret: false, unlockSkin: null, devDesc: '[DEV] Perfect run (0 damage) + reflect 10 projectiles minimum in one level' },
    
    // === DIAMOND / RGB (Extreme/Mastery) ===
    { id: 'all_endings', name: 'Story Master', desc: 'Unlock all three endings', tier: 'diamond', secret: false, unlockSkin: null },
    { id: 'endless_wave_100', name: 'Eternal', desc: 'Reach wave 100 in Endless Mode', tier: 'diamond', secret: false, unlockSkin: null },
    { id: '100_percent', name: '◆ 100% ◆', desc: 'Unlock ALL achievements (100% completion)', tier: 'diamond', secret: false, unlockSkin: 'hundred_percent', isRGB: true, displayTier: 'RGB' },
    { id: 'the_first_10', name: '◆ THE FIRST 10 ◆', desc: 'Be among the first 10 to achieve 100% completion', tier: 'diamond', secret: true, unlockSkin: null, isRGB: true, displayTier: 'RGB', codeLimited: true, codeLimit: 10, devDesc: '[DEV] Secret code only - limited to first 10 codes distributed. After 10 codes are used, this achievement becomes permanently unavailable.' },
    { id: 'world_record', name: '◆ WORLD RECORD ◆', desc: 'Hold a verified world record speedrun time', tier: 'diamond', secret: true, unlockSkin: null, isRGB: true, displayTier: 'RGB', devDesc: '[DEV] Secret code only - unlimited codes available for WR holders' },
];

// Achievement stats tracking (cumulative across runs)
export function getAchievementStats() {
    try {
        const raw = localStorage.getItem(ACHIEVEMENT_STATS_KEY);
        if (!raw) return getDefaultStats();
        const stats = JSON.parse(raw);
        return { ...getDefaultStats(), ...stats };
    } catch {
        return getDefaultStats();
    }
}

function getDefaultStats() {
    return {
        levelsCleared: [],
        endingsReached: [],
        bestLevelTimes: {}, // { levelNum: ms }
        totalGameTimeMs: 0,
        totalDeaths: 0,
        currentDeathlessStreak: 0,
        maxDeathlessStreak: 0,
        currentNoAbilityStreak: 0,
        maxNoAbilityStreak: 0,
        shieldReflects: 0,
        shieldReflectsThisRun: 0,
        pigsMountedThisRun: 0,
        bazookaReloadsThisRun: 0,
        endlessMaxWave: 0,
        generatorPerfectCount: 0,
        trapsCaught: 0,
        secretsFound: []
    };
}

export function saveAchievementStats(stats) {
    try {
        localStorage.setItem(ACHIEVEMENT_STATS_KEY, JSON.stringify(stats));
    } catch (e) {
        console.warn('[achievements] Failed to save stats:', e);
    }
}

// Get unlocked achievements
export function getUnlockedAchievements() {
    try {
        const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
        if (!raw) return [];
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

// Unlock an achievement (only if not already unlocked)
export function unlockAchievement(achievementId, skipNotification = false) {
    // God mode doesn't earn achievements (except secrets and dev viewing)
    if (isGodMode() && !achievementId.startsWith('secret_')) {
        console.log('[achievements] God mode active - achievement not earned:', achievementId);
        return false;
    }

    const unlocked = getUnlockedAchievements();
    if (unlocked.some(a => a.id === achievementId)) {
        return false; // Already unlocked
    }

    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) {
        console.warn('[achievements] Unknown achievement:', achievementId);
        return false;
    }

    const entry = {
        id: achievementId,
        unlockedAt: Date.now()
    };
    unlocked.push(entry);

    try {
        localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(unlocked));
    } catch (e) {
        console.warn('[achievements] Failed to save:', e);
        return false;
    }

    console.log('[achievements] Unlocked:', achievement.name);

    // Trigger notification (handled by UI module)
    if (!skipNotification) {
        import('./ui-notifications.js').then(mod => {
            if (mod.showAchievementUnlocked) {
                mod.showAchievementUnlocked(achievement);
            }
        }).catch(() => {});
    }

    // Auto-unlock skin if defined
    if (achievement.unlockSkin) {
        import('./skins.js').then(mod => {
            if (mod.unlockSkin) {
                mod.unlockSkin(achievement.unlockSkin, `Achievement: ${achievement.name}`);
            }
        }).catch(() => {});
    }

    return true;
}

// Check for achievement triggers based on game events
export function checkAchievements(event, data = {}) {
    const stats = getAchievementStats();

    switch (event) {
        case 'level_complete':
            handleLevelComplete(stats, data);
            break;
        case 'ending_reached':
            handleEndingReached(stats, data);
            break;
        case 'death':
            handleDeath(stats);
            break;
        case 'shield_reflect':
            handleShieldReflect(stats);
            break;
        case 'pig_mounted':
            handlePigMounted(stats);
            break;
        case 'bazooka_reload':
            handleBazookaReload(stats);
            break;
        case 'endless_wave':
            handleEndlessWave(stats, data);
            break;
        case 'generator_perfect':
            handleGeneratorPerfect(stats);
            break;
        case 'secret_found':
            handleSecretFound(stats, data);
            break;
        case 'run_start':
            handleRunStart(stats);
            break;
        case 'ability_used':
            handleAbilityUsed(stats);
            break;
        case 'trap_catch':
            handleTrapCatch(stats);
            break;
        case 'check_100_percent':
            checkHundredPercent();
            break;
        default:
            break;
    }

    saveAchievementStats(stats);
}

function handleLevelComplete(stats, { level, timeMs, deathless, noAbilities }) {
    if (!stats.levelsCleared.includes(level)) {
        stats.levelsCleared.push(level);
    }

    // Best time tracking
    if (!stats.bestLevelTimes[level] || timeMs < stats.bestLevelTimes[level]) {
        stats.bestLevelTimes[level] = timeMs;
    }

    // Level clear achievements
    if (level === 1) unlockAchievement('level1_clear');
    if (level === 5) unlockAchievement('level5_clear');
    if (level === 10) unlockAchievement('level10_clear');

    // Check if game complete (levels 1-10 all cleared)
    const allLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    if (allLevels.every(l => stats.levelsCleared.includes(l))) {
        unlockAchievement('game_complete');
        
        // Check total game time for speedrun achievements
        const totalTime = Object.values(stats.bestLevelTimes).reduce((sum, t) => sum + t, 0);
        if (totalTime < 25 * 60 * 1000) { // Under 25 minutes
            unlockAchievement('speedrun_game_25m');
        }
        if (totalTime < 20 * 60 * 1000) { // Under 20 minutes
            unlockAchievement('speedrun_game_20m');
        }
    }

    // Speed run checks
    if (timeMs < 60000) { // Under 60s
        unlockAchievement('speedrun_level_60s');
    }
    if (level === 3 && timeMs < 30000) { // Level 3 under 30s
        unlockAchievement('speedrun_level3_30s');
    }

    // Deathless streak tracking
    if (deathless) {
        stats.currentDeathlessStreak++;
        if (stats.currentDeathlessStreak > stats.maxDeathlessStreak) {
            stats.maxDeathlessStreak = stats.currentDeathlessStreak;
        }
        if (stats.currentDeathlessStreak >= 3) {
            unlockAchievement('deathless_3_levels');
        }
        if (stats.currentDeathlessStreak >= 10) {
            unlockAchievement('deathless_game');
        }
    } else {
        stats.currentDeathlessStreak = 0;
    }

    // No abilities streak tracking
    if (noAbilities) {
        stats.currentNoAbilityStreak++;
        unlockAchievement('no_abilities_level');
        if (stats.currentNoAbilityStreak >= 3) {
            unlockAchievement('no_abilities_3_consecutive');
        }
    } else {
        stats.currentNoAbilityStreak = 0;
    }

    // Boss-specific achievements
    if (level === 10) {
        if (stats.pigsMountedThisRun >= 3) {
            unlockAchievement('boss_mount_3_pigs');
        }
        if (stats.bazookaReloadsThisRun <= 6) {
            unlockAchievement('boss_ammo_efficient');
        }
    }
}

function handleEndingReached(stats, { ending }) {
    if (!stats.endingsReached.includes(ending)) {
        stats.endingsReached.push(ending);
    }

    if (ending === 'good') unlockAchievement('ending_good');
    if (ending === 'bad') unlockAchievement('ending_bad');
    if (ending === 'virus') unlockAchievement('ending_virus');
    
    // Check if all endings unlocked
    if (stats.endingsReached.includes('good') && 
        stats.endingsReached.includes('bad') && 
        stats.endingsReached.includes('virus')) {
        unlockAchievement('all_endings');
    }
}

function handleDeath(stats) {
    stats.totalDeaths++;
    stats.currentDeathlessStreak = 0;
    
    // First death achievement
    if (stats.totalDeaths === 1) {
        unlockAchievement('first_death');
    }
    
    // Phoenix skin unlock (100 total deaths)
    if (stats.totalDeaths >= 100) {
        unlockAchievement('total_deaths_100');
    }
}

function handleShieldReflect(stats) {
    stats.shieldReflects++;
    stats.shieldReflectsThisRun++;
    if (stats.shieldReflectsThisRun >= 10) {
        unlockAchievement('perfect_shield_10');
    }
}

function handlePigMounted(stats) {
    stats.pigsMountedThisRun++;
}

function handleBazookaReload(stats) {
    stats.bazookaReloadsThisRun++;
}

function handleEndlessWave(stats, { wave, perfectWave }) {
    if (wave > stats.endlessMaxWave) {
        stats.endlessMaxWave = wave;
    }

    if (wave >= 10) unlockAchievement('endless_wave_10');
    if (wave >= 20) unlockAchievement('endless_wave_20');
    if (wave >= 30) unlockAchievement('endless_wave_30');
    if (wave >= 50) unlockAchievement('endless_wave_50');

    if (perfectWave) {
        unlockAchievement('endless_perfect_wave');
    }
}

function handleGeneratorPerfect(stats) {
    stats.generatorPerfectCount++;
    if (stats.generatorPerfectCount >= 3) {
        unlockAchievement('generator_perfect_3');
    }
    if (stats.generatorPerfectCount >= 10) {
        unlockAchievement('generator_perfect_10');
    }
}

function handleSecretFound(stats, { secretId }) {
    if (!stats.secretsFound.includes(secretId)) {
        stats.secretsFound.push(secretId);
    }

    if (secretId === 'hidden_note') unlockAchievement('secret_note');
    if (secretId === 'level11_power') unlockAchievement('secret_level11_power');
    if (secretId === 'code_alpha') unlockAchievement('secret_code_alpha');
    if (secretId === 'pet_pig') unlockAchievement('pet_pig');
    if (secretId === 'hub_dance') unlockAchievement('hub_dance');
}

function handleRunStart(stats) {
    // Reset per-run counters
    stats.shieldReflectsThisRun = 0;
    stats.pigsMountedThisRun = 0;
    stats.bazookaReloadsThisRun = 0;
}

function handleAbilityUsed(stats) {
    stats.currentNoAbilityStreak = 0;
}

function handleTrapCatch(stats) {
    stats.trapsCaught = (stats.trapsCaught || 0) + 1;
    if (stats.trapsCaught >= 25) {
        unlockAchievement('trap_master');
    }
}

function checkHundredPercent() {
    const unlocked = getUnlockedAchievements();
    // Count all non-100% achievements
    const totalAchievements = ACHIEVEMENTS.filter(a => a.id !== 'all_achievements').length;
    if (unlocked.length >= totalAchievements) {
        unlockAchievement('all_achievements');
    }
}

// Get achievement progress (for UI display)
export function getAchievementProgress(achievementId) {
    const stats = getAchievementStats();
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) return null;

    // Return progress info for display
    switch (achievementId) {
        case 'shield_reflect_10':
            return { current: stats.shieldReflectsThisRun, target: 10 };
        case 'generator_perfect_3':
            return { current: stats.generatorPerfectCount, target: 3 };
        case 'generator_perfect_10':
            return { current: stats.generatorPerfectCount, target: 10 };
        case 'endless_wave_10':
            return { current: stats.endlessMaxWave, target: 10 };
        case 'endless_wave_20':
            return { current: stats.endlessMaxWave, target: 20 };
        case 'endless_wave_30':
            return { current: stats.endlessMaxWave, target: 30 };
        case 'deathless_3_levels':
            return { current: stats.currentDeathlessStreak, target: 3 };
        case 'no_abilities_3_consecutive':
            return { current: stats.currentNoAbilityStreak, target: 3 };
        default:
            return null;
    }
}

// Dev: Reset all achievements
export function resetAchievements() {
    try {
        localStorage.removeItem(ACHIEVEMENTS_KEY);
        localStorage.removeItem(ACHIEVEMENT_STATS_KEY);
        console.log('[achievements] All achievements reset');
    } catch (e) {
        console.warn('[achievements] Failed to reset:', e);
    }
}

// Initialize achievements system
export function initAchievements() {
    // Pre-load stats to initialize system
    getAchievementStats();
    getUnlockedAchievements();
    console.log('[achievements] Achievements system initialized');
}
