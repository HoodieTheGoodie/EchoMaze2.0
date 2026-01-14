# Achievement Testing & Reorganization Checklist

## 🎯 Testing Instructions

1. **Open Dev Panel**: Press **F1** in game
2. **Go to Achievements Tab**: Click "Achievements"
3. **For each achievement**:
   - Click the 🔓 **Unlock** button
   - Watch for notification (should appear top-right)
   - Check if skin unlocks (if applicable)
   - Mark ✅ if works, ❌ if fails

## 📊 Current Achievement Distribution (46 Total)

### 🥉 BRONZE (3 achievements)
- [✅] `level1_clear` - First Steps - Complete Level 1
- [✅] `first_death` - Learning Process - Die for the first time
- [ ] `endless_wave_10` - Endurance I - Reach wave 10 in Endless

### 🥈 SILVER (8 achievements)
- [ ] `level5_clear` - Halfway There - Complete Level 5 [🎨 rookie skin]
- [ ] `speedrun_level_60s` - Lightning Fast - Complete level in under 60s [🎨 blitz skin]
- [ ] `no_abilities_level` - Purist - Level without shield/jump
- [ ] `deathless_3_levels` - Survivor - 3 consecutive perfect levels
- [ ] `generator_perfect_3` - Mechanic - Perfect generator checks x3
- [ ] `boss_mount_3_pigs` - Pig Rider - Mount 3 pigs in boss fight
- [ ] `endless_wave_20` - Endurance II - Reach wave 20 in Endless
- [ ] `trap_master` - Trap Master - Catch 25 enemies in traps

### 🥇 GOLD (15 achievements)
- [✅] `level10_clear` - Boss Defeated - Defeat the Core [🎨 veteran skin]
- [✅] `ending_good` - Hope Restored - Reach the Good Ending [🎨 guardian skin]
- [✅] `ending_bad` - Shadows Remain - Reach the Bad Ending [🎨 shadow skin]
- [ ] `ending_normal` - System Restarted - Reach the Normal Ending
- [ ] `perfect_shield_10` - Shield Master - Reflect 10 projectiles [🎨 defender skin]
- [ ] `speedrun_level3_30s` - Pig Pilot - Complete Level 3 in under 30s
- [ ] `no_abilities_3_consecutive` - Ascetic Path - 3 levels without abilities
- [ ] `generator_perfect_10` - Master Mechanic - Perfect checks x10 [🎨 technician skin]
- [ ] `boss_ammo_efficient` - Ammo Discipline - Defeat boss with ≤6 reloads
- [ ] `endless_wave_30` - Endurance III - Reach wave 30 in Endless [🎨 infinite skin]
- [ ] `endless_perfect_wave` - Untouched - Perfect wave (no damage)
- [ ] `endless_no_abilities_10` - Endless Purist - 10 waves without abilities
- [ ] `secret_level11_power` - System Override - Discover power supply in L11 [🎨 glitch skin]
- [ ] `secret_code_alpha` - Code Breaker - Enter a secret code [🎨 void skin]
- [ ] `bazooka_mode_unlock` - Weapon Online - Unlock Blaster Mode (SECRET)
- [ ] `glitch_teleport_escape` - Blinking Master - Dodge damage 5+ times

### 💎 PLATINUM (12 achievements)
- [ ] `game_complete` - System Reboot - Complete the game [🎨 engineer skin]
- [ ] `speedrun_game_20m` - Speedrunner - Complete game in <20 min [🎨 chrono skin]
- [ ] `deathless_game` - Untouchable - Complete game deathless [🎨 ghost skin]
- [ ] `speedrun_game_10m` - Time Lord - Complete game in <10 min [🎨 time_lord skin]
- [ ] `endless_wave_40` - Infinite Warrior - Reach wave 40
- [ ] `endless_wave_50` - Beyond Infinity - Reach wave 50
- [ ] `level11_unlock` - Hidden Realm Discovered - Unlock the secret Level 11 (SECRET)
- [ ] `total_deaths_100` - Phoenix Rising - Die 100 times total [🎨 phoenix skin] (SECRET)
- [ ] `bazooka_boss_victory` - Armed & Dangerous - Defeat boss w/ Blaster
- [ ] `level10_survival_5min` - Ironclad Defender - Survive 5 min on L10
- [ ] `perfect_generator_run` - Tech Supreme - Perfect all generators
- [ ] `shield_perfect_level` - Invincible - No damage + 10 reflects

### 💠 DIAMOND (5 achievements)
- [ ] `why_destroy_power` - Why?? - Destroy power supply w/ bazooka (SECRET)
- [ ] `all_endings` - Story Master - Unlock all endings
- [ ] `endless_wave_60` - Eternal - Reach wave 60
- [ ] `100_percent` - ◆ 100% ◆ - All achievements [🎨 hundred_percent skin] (RGB)
- [ ] `the_first_10` - ◆ FIRST 10 ◆ - Top 10 100% achievers (SECRET, RGB, CODE LIMITED)
- [ ] `world_record` - ◆ WORLD RECORD ◆ - Verified speedrun record (SECRET, RGB)

---

## 📝 Testing Notes

### Failures Found:
(Fill in as you test)

| Achievement ID | Name | Issue | Fix |
|---|---|---|---|
| | | | |

---

## 🔄 Achievements to Move

Use this section to track which achievements you want to move to different tiers.

**Moves to make:**
(Fill in as you decide)

Format: `achievement_id` (Bronze → Silver)

---

## 🛠️ How to Move Achievements

When you've decided which achievements to move between tiers:

### Step 1: Open `/workspaces/EchoMaze2.0/game/js/achievements.js`

### Step 2: Find the `ACHIEVEMENTS` array (around line 28)

### Step 3: Move the achievement definition to the desired tier section

### Step 4: Update tier property:
```javascript
// Before
{ id: 'achievement_id', tier: 'bronze', ...}

// After
{ id: 'achievement_id', tier: 'silver', ...}
```

### Step 5: Refresh browser to test changes

---

## 📊 Tier Difficulty Suggestions

If you want to rebalance:

- **BRONZE**: Entry-level, first 5 minutes (3 total)
- **SILVER**: Early-mid game, first playthrough (8 total)
- **GOLD**: Mid-late game, multiple playthroughs (15 total)
- **PLATINUM**: Mastery, expert play (12 total)
- **DIAMOND**: 100% completion, extreme (5 total)

---

## 🎯 Quick Actions in Dev Panel

**In-Game Tab:**
- ✅ Enable God Mode (survive anything)
- ✅ Instant Generator (instant charge)
- ✅ Unlock All Levels (skip to any level)
- ✅ Skip To Boss (go straight to boss)

**Menu Tab:**
- ✅ Unlock All Levels
- ✅ Unlock Level 11
- ✅ Unlock All Skins
- ✅ Enable Blaster

**Achievements Tab:**
- ✅ Click 🔓 to unlock individual achievement
- ✅ Click "Unlock All" to test all at once
- ✅ See progress bars and failure reasons
- ✅ Filter by Locked/Unlocked/Tracking

---

## ✅ Testing Best Practices

1. **Test in order**: Start with Bronze, work up to Diamond
2. **Clear between tests**: Click "Clear All" if retesting
3. **Check notifications**: Should see green toast at top-right
4. **Check skins**: Look at skins menu to verify unlock
5. **Note failures**: Mark ❌ and describe the issue
6. **Screenshot bugs**: Helps with fixing later

---

Good luck with testing! 🚀
