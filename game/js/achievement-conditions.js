/**
 * Achievement Conditions Database
 * Maps each achievement to its specific requirements and progress tracking
 */

import { isAchievementUnlocked, getUnlockedAchievements, ACHIEVEMENTS } from './achievements.js';

export function getConditionMapForAchievements(stats) {
    return {
        // BRONZE - Easy/Early
        'level1_clear': {
            conditions: [{ label: 'Complete Level 1', met: false, current: 0, max: 1 }],
            category: 'Level Completion',
            hint: 'Just play through the first level!'
        },
        'first_death': {
            conditions: [{ label: 'Die once', met: (stats.totalDeaths || 0) >= 1, current: stats.totalDeaths || 0, max: 1 }],
            category: 'Milestone',
            hint: 'Get hit by an enemy. Progress: ' + (stats.totalDeaths || 0) + '/1'
        },
        'endless_wave_10': {
            conditions: [{ label: 'Reach wave 10 in Endless', met: false, current: 0, max: 10 }],
            category: 'Endless Mode',
            hint: 'Play Endless mode and survive to wave 10'
        },
        
        // SILVER - Medium
        'level5_clear': {
            conditions: [{ label: 'Complete Level 5', met: false, current: 0, max: 1 }],
            category: 'Level Completion',
            hint: 'Progress through to Level 5 and complete it'
        },
        'speedrun_level_60s': {
            conditions: [{ label: 'Complete any level in under 60 seconds', met: false, current: 0, max: 1 }],
            category: 'Speedrun',
            hint: 'Complete any level as fast as possible (under 1 minute)'
        },
        'no_abilities_level': {
            conditions: [{ label: 'Complete a level without using Shield or Jump', met: false, current: 0, max: 1 }],
            category: 'Challenge',
            hint: 'Complete a level without pressing Space (shield) or Shift (jump)'
        },
        'deathless_3_levels': {
            conditions: [{ label: 'Complete 3 consecutive levels without dying', met: (stats.consecutiveDeathlessLevels || 0) >= 3, current: stats.consecutiveDeathlessLevels || 0, max: 3 }],
            category: 'Challenge',
            hint: 'Survive 3 levels in a row without death. Progress: ' + (stats.consecutiveDeathlessLevels || 0) + '/3'
        },
        'generator_perfect_3': {
            conditions: [{ label: 'Hit perfect timing on 3 generator checks', met: (stats.perfectGenerators || 0) >= 3, current: stats.perfectGenerators || 0, max: 3 }],
            category: 'Skill',
            hint: 'Press E exactly when the indicator is in the green zone. Progress: ' + (stats.perfectGenerators || 0) + '/3'
        },
        'boss_mount_3_pigs': {
            conditions: [{ label: 'Mount 3 different pigs during boss fight', met: (stats.pigsMounted || 0) >= 3, current: stats.pigsMounted || 0, max: 3 }],
            category: 'Boss',
            hint: 'Ride flying pigs in Level 10 boss fight. Progress: ' + (stats.pigsMounted || 0) + '/3'
        },
        'endless_wave_20': {
            conditions: [{ label: 'Reach wave 20 in Endless', met: false, current: 0, max: 20 }],
            category: 'Endless Mode',
            hint: 'Play Endless mode and survive to wave 20'
        },
        'trap_master': {
            conditions: [{ label: 'Catch 25 enemies in zap traps', met: (stats.trappedEnemies || 0) >= 25, current: stats.trappedEnemies || 0, max: 25 }],
            category: 'Skill',
            hint: 'Use zap traps (T key) to catch enemies. Progress: ' + (stats.trappedEnemies || 0) + '/25'
        },
        
        // GOLD - Hard
        'level10_clear': {
            conditions: [{ label: 'Defeat the Core (Complete Level 10)', met: false, current: 0, max: 1 }],
            category: 'Level Completion',
            hint: 'Beat the boss at the end of Level 10'
        },
        'ending_good': {
            conditions: [
                { label: '1. Complete Level 11', met: false, current: 0, max: 1 },
                { label: '2. Choose "Yes" at the power supply', met: false, current: 0, max: 1 },
                { label: '3. Pick up the note in the hub', met: false, current: 0, max: 1 }
            ],
            category: 'Ending',
            hint: 'Unlock Level 11, press E, choose Yes, then return to hub and get the note'
        },
        'ending_bad': {
            conditions: [
                { label: '1. Complete Level 11', met: false, current: 0, max: 1 },
                { label: '2. Choose "No" at the power supply', met: false, current: 0, max: 1 }
            ],
            category: 'Ending',
            hint: 'Unlock Level 11, press E, choose No'
        },
        'ending_normal': {
            conditions: [
                { label: '1. Collect all 3 glitch orbs during gameplay', met: false, current: 0, max: 3 },
                { label: '2. Complete Level 10 normally', met: false, current: 0, max: 1 }
            ],
            category: 'Ending',
            hint: 'Collect all glitch orbs (appear after perfect generators) and beat Level 10'
        },
        'perfect_shield_10': {
            conditions: [{ label: 'Reflect 10 projectiles with perfect blocks', met: (stats.reflectedProjectiles || 0) >= 10, current: stats.reflectedProjectiles || 0, max: 10 }],
            category: 'Skill',
            hint: 'Block projectiles with perfect timing (Space). Progress: ' + (stats.reflectedProjectiles || 0) + '/10'
        },
        'speedrun_level3_30s': {
            conditions: [{ label: 'Complete Level 3 in under 30 seconds', met: false, current: 0, max: 1 }],
            category: 'Speedrun',
            hint: 'Speed through Level 3 in under 30 seconds'
        },
        'no_abilities_3_consecutive': {
            conditions: [{ label: 'Complete 3 consecutive levels without abilities', met: (stats.consecutiveNoAbilityLevels || 0) >= 3, current: stats.consecutiveNoAbilityLevels || 0, max: 3 }],
            category: 'Challenge',
            hint: 'Complete 3 levels in a row without Shield or Jump. Progress: ' + (stats.consecutiveNoAbilityLevels || 0) + '/3'
        },
        'generator_perfect_10': {
            conditions: [{ label: 'Hit perfect timing on 10 generator checks total', met: (stats.perfectGenerators || 0) >= 10, current: stats.perfectGenerators || 0, max: 10 }],
            category: 'Skill',
            hint: 'Perfect generator checks across all playthroughs. Progress: ' + (stats.perfectGenerators || 0) + '/10'
        },
        'boss_ammo_efficient': {
            conditions: [{ label: 'Defeat boss with 6 or fewer ammo reloads', met: false, current: 0, max: 1 }],
            category: 'Boss',
            hint: 'Beat Level 10 boss, picking up ammo 6 times or less'
        },
        'endless_wave_30': {
            conditions: [{ label: 'Reach wave 30 in Endless', met: false, current: 0, max: 30 }],
            category: 'Endless Mode',
            hint: 'Survive to wave 30 in Endless mode'
        },
        'endless_perfect_wave': {
            conditions: [{ label: 'Complete any endless wave without damage', met: false, current: 0, max: 1 }],
            category: 'Endless Mode',
            hint: 'Beat one wave in Endless without getting hit once'
        },
        'endless_no_abilities_10': {
            conditions: [{ label: 'Survive 10 waves without using abilities', met: (stats.endlessNoAbilityWaves || 0) >= 10, current: stats.endlessNoAbilityWaves || 0, max: 10 }],
            category: 'Endless Mode',
            hint: 'Play 10 Endless waves without Shield/Jump. Progress: ' + (stats.endlessNoAbilityWaves || 0) + '/10'
        },
        'secret_level11_power': {
            conditions: [{ label: 'Discover the power supply room in Level 11', met: false, current: 0, max: 1 }],
            category: 'Secret',
            hint: 'Unlock Level 11 and find the finale room with power supply'
        },
        'secret_code_alpha': {
            conditions: [{ label: 'Enter a secret code in the terminal', met: false, current: 0, max: 1 }],
            category: 'Secret',
            hint: 'Find and enter a secret code (hint: check the endings)'
        },
        'bazooka_mode_unlock': {
            conditions: [{ label: 'Unlock Blaster Mode (code: ECHO-VIRUS or ECHO-HERO)', met: false, current: 0, max: 1 }],
            category: 'Secret',
            hint: 'Enter ECHO-VIRUS or ECHO-HERO in the terminal'
        },
        'glitch_teleport_escape': {
            conditions: [{ label: 'Dodge damage using teleport 5+ times', met: (stats.glitchTeleportEscapes || 0) >= 5, current: stats.glitchTeleportEscapes || 0, max: 5 }],
            category: 'Skill',
            hint: 'Use teleport (when unlocked) to dodge hits. Progress: ' + (stats.glitchTeleportEscapes || 0) + '/5'
        },
        
        // PLATINUM - Very Hard
        'game_complete': {
            conditions: [{ label: 'Beat the game (any ending)', met: false, current: 0, max: 1 }],
            category: 'Completion',
            hint: 'Complete the game and reach any ending'
        },
        'speedrun_game_20m': {
            conditions: [{ label: 'Complete game in under 20 minutes', met: false, current: 0, max: 1 }],
            category: 'Speedrun',
            hint: 'Beat the entire game in under 20 minutes'
        },
        'deathless_game': {
            conditions: [{ label: 'Complete entire game without dying', met: false, current: 0, max: 1 }],
            category: 'Challenge',
            hint: 'Beat the game without dying once'
        },
        'speedrun_game_10m': {
            conditions: [{ label: 'Complete game in under 10 minutes', met: false, current: 0, max: 1 }],
            category: 'Speedrun',
            hint: 'Beat the entire game in under 10 minutes'
        },
        'endless_wave_40': {
            conditions: [{ label: 'Reach wave 40 in Endless', met: false, current: 0, max: 40 }],
            category: 'Endless Mode',
            hint: 'Survive to wave 40 in Endless mode'
        },
        'endless_wave_50': {
            conditions: [{ label: 'Reach wave 50 in Endless', met: false, current: 0, max: 50 }],
            category: 'Endless Mode',
            hint: 'Survive to wave 50 in Endless mode'
        },
        'level11_unlock': {
            conditions: [
                { label: '1. Collect all 3 glitch orbs', met: false, current: 0, max: 3 },
                { label: '2. Complete Level 10', met: false, current: 0, max: 1 }
            ],
            category: 'Secret',
            hint: 'Get all 3 glitch orbs (spawn after perfect generators) then beat Level 10'
        },
        'total_deaths_100': {
            conditions: [{ label: 'Die 100 times total', met: (stats.totalDeaths || 0) >= 100, current: stats.totalDeaths || 0, max: 100 }],
            category: 'Milestone',
            hint: 'Keep dying... Progress: ' + (stats.totalDeaths || 0) + '/100'
        },
        'bazooka_boss_victory': {
            conditions: [
                { label: '1. Unlock Blaster Mode first', met: false, current: 0, max: 1 },
                { label: '2. Activate Blaster in Level 10', met: false, current: 0, max: 1 },
                { label: '3. Defeat boss with Blaster active', met: false, current: 0, max: 1 }
            ],
            category: 'Boss',
            hint: 'Unlock Blaster (ECHO codes), activate it (B key), beat boss'
        },
        'level10_survival_5min': {
            conditions: [{ label: 'Survive 5 minutes on Level 10', met: false, current: 0, max: 1 }],
            category: 'Challenge',
            hint: 'Stay alive in Level 10 for 5 full minutes'
        },
        'perfect_generator_run': {
            conditions: [{ label: 'Perfect all generator checks in single run', met: false, current: 0, max: 1 }],
            category: 'Challenge',
            hint: 'Hit perfect timing on every generator in one playthrough'
        },
        'shield_perfect_level': {
            conditions: [
                { label: '1. Take no damage in a level', met: false, current: 0, max: 1 },
                { label: '2. Reflect 10 projectiles in same level', met: false, current: 0, max: 10 }
            ],
            category: 'Challenge',
            hint: 'Complete a level flawlessly while reflecting 10+ projectiles'
        },
        
        // DIAMOND - Extreme
        'why_destroy_power': {
            conditions: [
                { label: '1. Unlock Blaster Mode', met: false, current: 0, max: 1 },
                { label: '2. Reach Level 11 power supply room', met: false, current: 0, max: 1 },
                { label: '3. Activate Blaster Mode (B key)', met: false, current: 0, max: 1 },
                { label: '4. Shoot the power supply', met: false, current: 0, max: 1 }
            ],
            category: 'Secret',
            hint: 'Get Blaster, reach L11 finale, press B, shoot power supply with projectiles'
        },
        'all_endings': {
            conditions: [
                { label: 'Unlock Good Ending', met: isAchievementUnlocked('ending_good'), current: isAchievementUnlocked('ending_good') ? 1 : 0, max: 1 },
                { label: 'Unlock Bad Ending', met: isAchievementUnlocked('ending_bad'), current: isAchievementUnlocked('ending_bad') ? 1 : 0, max: 1 },
                { label: 'Unlock Normal Ending', met: isAchievementUnlocked('ending_normal'), current: isAchievementUnlocked('ending_normal') ? 1 : 0, max: 1 }
            ],
            category: 'Completion',
            hint: 'Get all three ending achievements'
        },
        'endless_wave_60': {
            conditions: [{ label: 'Reach wave 60 in Endless', met: false, current: 0, max: 60 }],
            category: 'Endless Mode',
            hint: 'Survive to wave 60 in Endless mode'
        },
        '100_percent': {
            conditions: [{ label: 'Unlock all other achievements', met: getUnlockedAchievements().length >= ACHIEVEMENTS.length - 1, current: getUnlockedAchievements().length, max: ACHIEVEMENTS.length }],
            category: 'Completion',
            hint: 'Get every single achievement. Progress: ' + getUnlockedAchievements().length + '/' + ACHIEVEMENTS.length
        },
        'the_first_10': {
            conditions: [
                { label: '1. Unlock 100% achievement', met: isAchievementUnlocked('100_percent'), current: isAchievementUnlocked('100_percent') ? 1 : 0, max: 1 },
                { label: '2. Be among first 10 to submit code', met: false, current: 0, max: 1 }
            ],
            category: 'Special',
            hint: 'Get 100%, then be one of first 10 to claim the special code'
        },
        'world_record': {
            conditions: [{ label: 'Achieve verified speedrun world record', met: false, current: 0, max: 1 }],
            category: 'Special',
            hint: 'Submit the fastest verified speedrun time'
        },
    };
}
