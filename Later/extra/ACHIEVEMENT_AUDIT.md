# Complete Achievement Audit

## BRONZE TIER

### ✅ level1_clear - "First Steps"
- **Trigger**: Complete Level 1  
- **Status**: WORKING - Fired in state.js line 1469 as `level_complete` event with level=1
- **Handler**: handleLevelComplete checks `if (level === 1) unlockAchievement('level1_clear')`

### ⚠️ pet_pig - "Gentle Soul" (SECRET)
- **Trigger**: Stand still near a fallen pig enemy for 5 seconds without moving
- **Status**: MISSING EVENT FIRING - Handler exists (handleSecretFound), but no code fires `secret_found` with `secretId: 'pet_pig'`
- **Fix Needed**: Need to add event in state.js when player stands still near fallen pig for 5 seconds

### ⚠️ hub_dance - "Victory Dance" (SECRET)
- **Trigger**: Press D key 10 times in a row in the hub
- **Status**: MISSING EVENT FIRING - Handler exists (handleSecretFound), but no code fires `secret_found` with `secretId: 'hub_dance'`
- **Fix Needed**: Need to add event in main.js or appropriate input handler when D key pressed 10 times

### ✅ endless_wave_10 - "Endurance I"
- **Trigger**: Reach wave 10 in Endless Mode
- **Status**: WORKING - Fired in state.js as `endless_wave` event
- **Handler**: handleEndlessWave checks `if (wave >= 10) unlockAchievement('endless_wave_10')`

### ✅ first_death - "Learning Process"
- **Trigger**: Die for the first time
- **Status**: WORKING - Fired in main.js line 2323 as `death` event
- **Handler**: handleDeath checks `if (stats.totalDeaths === 1) unlockAchievement('first_death')`

### ⚠️ wall_hugger - "Wall Hugger" (SECRET)
- **Trigger**: Stay touching the same wall for 30 consecutive seconds
- **Status**: PARTIAL - Handler exists (handleWallTouch), but EVENT NOT FIRED
- **Fix Needed**: Need to fire `wall_touch` event in state.js when player touches wall

### ⚠️ spin_cycle - "Spin Cycle" (SECRET)
- **Trigger**: Rotate 360 degrees 5 times in under 10 seconds
- **Status**: PARTIAL - Handler exists (handleRotation), but EVENT NOT FIRED
- **Fix Needed**: Need to fire `rotation` event in state.js when player rotates

---

## SILVER TIER

### ✅ level5_clear - "Halfway There"
- **Trigger**: Complete Level 5
- **Status**: WORKING - Fired as `level_complete` event with level=5
- **Handler**: handleLevelComplete checks `if (level === 5) unlockAchievement('level5_clear')`

### ✅ speedrun_level_60s - "Lightning Fast"
- **Trigger**: Complete any level in under 60 seconds
- **Status**: WORKING - Fired as `level_complete` event with timeMs
- **Handler**: handleLevelComplete checks `if (timeMs < 60000) unlockAchievement('speedrun_level_60s')`

### ✅ no_abilities_level - "Purist"
- **Trigger**: Complete any level without using sprint, block, or jump
- **Status**: WORKING - Fired as `level_complete` event with noAbilities flag
- **Handler**: handleLevelComplete checks `if (noAbilities) unlockAchievement('no_abilities_level')`

### ✅ deathless_3_levels - "Survivor"
- **Trigger**: Complete 3 consecutive levels without dying
- **Status**: WORKING - Fired as `level_complete` event with deathless flag
- **Handler**: handleLevelComplete tracks deathless streak, checks >= 3

### ✅ generator_perfect_3 - "Mechanic"
- **Trigger**: Complete 3 generator skill checks with perfect timing
- **Status**: WORKING - Fired in state.js line 4990 as `generator_perfect` event
- **Handler**: handleGeneratorPerfect tracks count, checks >= 3

### ✅ boss_mount_3_pigs - "Pig Rider"
- **Trigger**: Mount 3 different pigs during the boss fight
- **Status**: WORKING - Fired as `pig_mounted` event, tracked in stats
- **Handler**: handleLevelComplete checks `if (stats.pigsMountedThisRun >= 3)`

### ✅ endless_wave_20 - "Endurance II"
- **Trigger**: Reach wave 20 in Endless Mode
- **Status**: WORKING - Fired as `endless_wave` event
- **Handler**: handleEndlessWave checks `if (wave >= 20)`

### ⚠️ secret_note - "Curious Explorer" (SECRET)
- **Trigger**: Find the hidden note in the hub
- **Status**: MISSING EVENT FIRING - Handler exists (handleSecretFound), but no event fires with `secretId: 'hidden_note'`
- **Fix Needed**: Need to add event when player picks up note in hub

### ✅ trap_master - "Trap Master"
- **Trigger**: Catch 25 enemies in traps
- **Status**: WORKING - Fired in state.js line 3389 as `trap_catch` event
- **Handler**: handleTrapCatch tracks trapsCaught, checks >= 25

### ✅ endless_combo_5 - "Combo Master"
- **Trigger**: Defeat 5 enemies in a row without missing in Endless Mode
- **Status**: WORKING - Fired as `enemy_combo` event
- **Handler**: handleEnemyCombo checks `if (count >= 5)`

### ✅ level2_backwards - "Reverse Engineer" (SECRET)
- **Trigger**: Complete Level 2 with >= 70% backwards movement
- **Status**: WORKING - Fired as `level_complete` event with backwardsPercent
- **Handler**: handleLevelComplete checks `if (level === 2 && backwardsPercent >= 70)`

### ⚠️ corner_dweller - "Corner Dweller" (SECRET)
- **Trigger**: Visit all 4 corners of Level 1 within 20 seconds
- **Status**: MISSING EVENT FIRING - Handler exists (handleSecretFound), but no event fires with `secretId: 'corner_dweller'`
- **Fix Needed**: Need to add event when player visits all 4 corners in Level 1

---

## GOLD TIER

### ✅ level10_clear - "Boss Defeated"
- **Trigger**: Complete Level 10
- **Status**: WORKING - Fired as `level_complete` event with level=10
- **Handler**: handleLevelComplete checks `if (level === 10)`

### ✅ ending_good - "Hope Restored"
- **Trigger**: Reach the Good Ending
- **Status**: WORKING - Fired in level11.js as `ending_reached` with ending='good'
- **Handler**: handleEndingReached checks `if (ending === 'good')`

### ✅ ending_bad - "Shadows Remain"
- **Trigger**: Reach the Bad Ending
- **Status**: WORKING - Fired in level11.js as `ending_reached` with ending='bad'
- **Handler**: handleEndingReached checks `if (ending === 'bad')`

### ✅ ending_virus - "Corrupted Legacy"
- **Trigger**: Reach the Virus Ending
- **Status**: WORKING - Bad ending also triggers virus achievement
- **Handler**: handleEndingReached maps bad→virus

### ✅ perfect_shield_10 - "Shield Master"
- **Trigger**: Reflect 10 projectiles with shield in a single run
- **Status**: WORKING - Fired in state.js line 3067 as `shield_reflect` event
- **Handler**: handleShieldReflect tracks shieldReflectsThisRun, checks >= 10

### ✅ speedrun_level3_30s - "Pig Pilot"
- **Trigger**: Complete Level 3 in under 30 seconds
- **Status**: WORKING - Fired as `level_complete` event with timeMs
- **Handler**: handleLevelComplete checks `if (level === 3 && timeMs < 30000)`

### ✅ no_abilities_3_consecutive - "Ascetic Path"
- **Trigger**: Complete 3 consecutive levels without using any abilities
- **Status**: WORKING - Fired as `level_complete` event with noAbilities flag
- **Handler**: handleLevelComplete tracks currentNoAbilityStreak, checks >= 3

### ✅ generator_perfect_10 - "Master Mechanic"
- **Trigger**: Complete 10 generator skill checks with perfect timing
- **Status**: WORKING - Fired as `generator_perfect` event
- **Handler**: handleGeneratorPerfect checks `if (stats.generatorPerfectCount >= 10)`

### ✅ boss_ammo_efficient - "Ammunition Discipline"
- **Trigger**: Defeat boss with ≤6 reloads
- **Status**: WORKING - Fired as `bazooka_reload` event
- **Handler**: handleLevelComplete checks `if (stats.bazookaReloadsThisRun <= 6)` for level 10

### ✅ endless_wave_30 - "Endurance III"
- **Trigger**: Reach wave 30 in Endless Mode
- **Status**: WORKING - Fired as `endless_wave` event
- **Handler**: handleEndlessWave checks `if (wave >= 30)`

### ✅ endless_perfect_wave - "Untouched"
- **Trigger**: Complete wave in Endless without taking damage
- **Status**: WORKING - Fired as `endless_damage_free_wave` event with perfectWave flag
- **Handler**: handleEndlessWave checks `if (perfectWave)`

### ✅ endless_no_abilities_10 - "Endless Purist"
- **Trigger**: Complete 10 waves without using abilities
- **Status**: WORKING - Fired as `level_complete` event with noAbilities
- **Handler**: Tracked via currentNoAbilityStreak for endless mode

### ✅ secret_level11_power - "System Override" (SECRET)
- **Trigger**: Discover the power supply in Level 11
- **Status**: WORKING - Fired in state.js line 404/421 as `power_supply_discovered`
- **Handler**: handlePowerSupplyDiscovered unlocks immediately

### ✅ secret_code_alpha - "Code Breaker" (SECRET)
- **Trigger**: Enter a secret code
- **Status**: WORKING - Fired in skins.js as `secret_found` with `secretId: 'code_alpha'`
- **Handler**: handleSecretFound checks `if (secretId === 'code_alpha')`

### ✅ bazooka_mode_unlock - "Weapon System Online" (SECRET)
- **Trigger**: Enter code ECHOMAZE
- **Status**: WORKING - Fired in skins.js as `secret_found` with `secretId: 'bazooka_mode_unlock'`
- **Handler**: handleSecretFound checks `if (secretId === 'bazooka_mode_unlock')`

### ⚠️ bazooka_power_destroy - "why???" (SECRET)
- **Trigger**: Destroy power system in Level 11 finale with Energy Blaster
- **Status**: MISSING EVENT FIRING - Need to check if this event is fired in level11.js
- **Fix Needed**: Verify event firing when power system destroyed

### ✅ flashlight_blaster - "Flashlight Blaster" (SECRET)
- **Trigger**: Pick up flashlight in Level 11 while holding Energy Blaster
- **Status**: LIKELY WORKING - level11.js line 720 checks and unlocks

### ✅ level4_no_sprint - "Patience is a Virtue" (SECRET)
- **Trigger**: Complete Level 4 without sprinting
- **Status**: WORKING - Fired as `level_complete` event with sprintUsed flag
- **Handler**: handleLevelComplete checks `if (level === 4 && !sprintUsed)`

### ✅ bazooka_wall_breaker - "Demolition Expert"
- **Trigger**: Destroy 50 walls with Energy Blaster
- **Status**: WORKING - Fired in state.js line 2975 as `bazooka_wall_destroyed`
- **Handler**: handleBazookaWallDestroyed tracks count, checks >= 50

### ✅ shield_reflect_consecutive - "Perfect Parry"
- **Trigger**: Reflect 5 projectiles in a row without moving
- **Status**: PARTIAL - Handler exists (handleShieldReflectBlock), but CHECK IF EVENT FIRED
- **Fix Needed**: Verify `shield_reflect_block` event is fired in state.js

### ✅ level5_speed_challenge - "Swift Escape"
- **Trigger**: Complete Level 5 in under 50 seconds
- **Status**: WORKING - Fired as `level_complete` event with level=5 and timeMs
- **Handler**: handleLevelComplete checks `if (level === 5 && timeMs < 50000)`

### ✅ glitch_teleport_escape - "Blinking Master"
- **Trigger**: Escape damage 10 times using Glitch teleport in one level
- **Status**: WORKING - Fired as `glitch_dodged` event
- **Handler**: handleGlitchDodged tracks dodges, checks >= 10

### ✅ chrono_stamina_spree - "Infinite Sprint"
- **Trigger**: Use stamina abilities 50+ times in one level
- **Status**: WORKING - Fired in state.js line 1823 as `stamina_used`
- **Handler**: handleStaminaUsed tracks uses, checks >= 50

---

## PLATINUM TIER

### ✅ game_complete - "System Reboot"
- **Trigger**: Complete the entire game (all levels 1-10)
- **Status**: WORKING - Fired as `level_complete` event
- **Handler**: handleLevelComplete checks all levels cleared

### ✅ speedrun_game_25m - "Speedrunner"
- **Trigger**: Complete entire game in under 25 minutes
- **Status**: WORKING - Fired as `level_complete` event
- **Handler**: handleLevelComplete checks total time < 25 minutes

### ✅ deathless_game - "Untouchable"
- **Trigger**: Complete entire game without dying once
- **Status**: WORKING - Tracked via currentDeathlessStreak in handleLevelComplete
- **Handler**: Checks >= 10 levels deathless

### ✅ speedrun_game_20m - "Time Lord"
- **Trigger**: Complete entire game in under 20 minutes
- **Status**: WORKING - Fired as `level_complete` event
- **Handler**: handleLevelComplete checks total time < 20 minutes

### ✅ endless_wave_50 - "Infinite Warrior"
- **Trigger**: Reach wave 50 in Endless Mode
- **Status**: WORKING - Fired as `endless_wave` event
- **Handler**: handleEndlessWave checks `if (wave >= 50)`

### ✅ endless_wave_75 - "Beyond Infinity"
- **Trigger**: Reach wave 75 in Endless Mode
- **Status**: WORKING - Fired as `endless_wave` event
- **Handler**: handleEndlessWave checks `if (wave >= 75)`

### ✅ endless_flawless_10 - "Flawless Endurance"
- **Trigger**: Complete 10 consecutive waves without taking damage
- **Status**: WORKING - Fired as `endless_damage_free_wave` event
- **Handler**: handleEndlessDamageFreeWave tracks flawlessWaves, checks >= 10

### ✅ total_deaths_100 - "Phoenix Rising" (SECRET)
- **Trigger**: Die 100 times total across all runs
- **Status**: WORKING - Fired as `death` event
- **Handler**: handleDeath checks `if (stats.totalDeaths >= 100)`

### ✅ bazooka_boss_victory - "Armed and Dangerous"
- **Trigger**: Defeat Level 10 boss with Energy Blaster enabled
- **Status**: CHECK NEEDED - Need to verify event fired when boss defeated with bazooka enabled
- **Fix Needed**: May need to add check in state.js for boss defeat with bazooka enabled

### ⚠️ level7_only_jumps - "Kangaroo Mode" (SECRET)
- **Trigger**: Complete Level 7 using only jumping
- **Status**: MISSING EVENT FIRING - Need to verify if onlyJumps flag is tracked
- **Fix Needed**: Need to add event when level 7 completed with onlyJumps flag

### ⚠️ level10_survival_5min - "Ironclad Defender"
- **Trigger**: Survive on Level 10 for 5 minutes without dying
- **Status**: MISSING EVENT FIRING - Need special timer check
- **Fix Needed**: Need to add timer and event when 5 minutes survived on level 10

### ⚠️ endless_survival_10min - "Eternal Guardian"
- **Trigger**: Survive 10 minutes in Endless without dying
- **Status**: MISSING EVENT FIRING - Need special timer check
- **Fix Needed**: Need to add timer and event when 10 minutes survived

### ⚠️ perfect_generator_run - "Technician Supreme"
- **Trigger**: Perfect timing on ALL generators (5+) in one level
- **Status**: MISSING EVENT FIRING - Handler exists but event may not fire correctly
- **Fix Needed**: Need to verify perfect timing count resets per level properly

### ⚠️ shield_perfect_level - "Invincible"
- **Trigger**: Complete level with 0 damage AND reflect 10+ projectiles
- **Status**: MISSING EVENT FIRING - Need to combine two conditions
- **Fix Needed**: Need to add special check at level complete

---

## DIAMOND/RGB TIER

### ✅ all_endings - "Story Master"
- **Trigger**: Unlock all three endings
- **Status**: WORKING - Fired as `ending_reached` events
- **Handler**: handleEndingReached checks all three endings reached

### ✅ endless_wave_100 - "Eternal"
- **Trigger**: Reach wave 100 in Endless Mode
- **Status**: WORKING - Fired as `endless_wave` event
- **Handler**: handleEndlessWave checks `if (wave >= 100)`

### ✅ 100_percent - "◆ 100% ◆" (RGB)
- **Trigger**: Unlock ALL achievements
- **Status**: WORKING - Fired as `check_100_percent` event
- **Handler**: checkHundredPercent counts unlocked achievements

### ⚠️ the_first_10 - "◆ THE FIRST 10 ◆" (RGB SECRET)
- **Trigger**: Secret code only for first 10 achievers
- **Status**: WORKING - Handled via skins.js code redemption
- **Handler**: Direct unlock via code in skins.js

### ⚠️ world_record - "◆ WORLD RECORD ◆" (RGB SECRET)
- **Trigger**: Secret code only for WR holders
- **Status**: WORKING - Handled via skins.js code redemption
- **Handler**: Direct unlock via code in skins.js

---

## SUMMARY OF ISSUES

### CRITICAL - MISSING EVENT FIRING (10 achievements):
1. **pet_pig** - No event fired
2. **hub_dance** - No event fired
3. **wall_hugger** - Handler exists but event NOT fired
4. **spin_cycle** - Handler exists but event NOT fired
5. **secret_note** - No event fired
6. **corner_dweller** - No event fired
7. **bazooka_power_destroy** - Unclear if event fired
8. **level7_only_jumps** - No event fired
9. **level10_survival_5min** - No event fired
10. **endless_survival_10min** - No event fired

### NEEDS VERIFICATION (4 achievements):
1. **shield_reflect_consecutive** - Handler exists but verify event firing in state.js
2. **perfect_generator_run** - Verify per-level reset logic
3. **shield_perfect_level** - Need combined condition check
4. **bazooka_boss_victory** - Need to verify bazooka-enabled check at boss defeat

---

## PRIORITY FIXES NEEDED

**HIGH PRIORITY** (Events handlers exist, just need to fire events):
- wall_hugger
- spin_cycle
- shield_reflect_consecutive

**MEDIUM PRIORITY** (Handlers exist, events need implementation):
- pet_pig
- hub_dance
- secret_note
- corner_dweller

**COMPLEX** (Need special logic):
- bazooka_power_destroy
- level7_only_jumps
- level10_survival_5min
- endless_survival_10min
- perfect_generator_run
- shield_perfect_level
- bazooka_boss_victory
