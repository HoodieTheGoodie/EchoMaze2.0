# Dev Panel v2 - Complete Guide

## Overview
The new dev panel is a professional debugging interface overlaid on top of the game. It's completely draggable, can be enabled/disabled, and provides comprehensive tools for testing and debugging EchoMaze 2.0.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+D` | Toggle Dev Panel Visibility (must be enabled) |
| `Ctrl+Shift+E` | Enable/Disable Dev Panel (completely hides when disabled) |

## Panel Features

### 🏆 Achievements Tab
Complete achievement system debugging and testing.

**Features:**
- **Unlock Specific Achievement** - Enter achievement ID and click "Unlock"
  - Example IDs: `first_blood`, `deathless_level`, `speedrun_5min`, etc.
- **Unlock All (56)** - Instantly unlock all 56 achievements
- **Clear All** - Reset all achievement unlocks
- **Stats Display** - Shows current progress (X/56 and percentage)
- **Recent Unlocks** - Displays last unlocked achievement

**Achievement Testing Workflow:**
1. Enter achievement ID in input field
2. Click "Unlock" to test that achievement
3. Monitor "STATS" section to see real-time progress
4. Use "Clear All" to reset and test again

### 🎮 Game Debug Tab
In-game debugging features and testing utilities.

**Features:**

#### God Mode (ON/OFF Toggle)
- **Purpose**: Player becomes invincible
- **Implementation**: Uses `config.isGodMode()` / `config.setGodMode()`
- **Wired To**: state.js `applyPlayerDamage()` checks
- **Use Case**: Test level design without dying
- **Status**: OFF (red) / ON (green)

#### Instant Generator (ON/OFF Toggle)
- **Purpose**: Instantly completes generator repairs (skip skill checks)
- **Implementation**: Uses `window.__instaGenEnabled` flag
- **Wired To**: main.js gameLoop checks in generator UI section
- **Use Case**: Test level completion without generator grind
- **Status**: OFF (orange) / ON (red)
- **Note**: Works when generator UI is open

#### No Keys Needed (ON/OFF Toggle)
- **Purpose**: Bypass Level 11 key locks
- **Implementation**: Uses `window.DEV_NO_KEYS` flag
- **Wired To**: state.js door unlock checks
- **Use Case**: Test Level 11 puzzles without collecting keys
- **Status**: OFF (orange) / ON (red)

#### 10x Boss Damage (ON/OFF Toggle)
- **Purpose**: Boss takes 10x damage from bazooka shots
- **Implementation**: Uses `config.isBossDamage10x()` / `config.setBossDamage10x()`
- **Wired To**: boss.js damage calculation
- **Use Case**: Quickly test boss arena without long fights
- **Status**: OFF (red) / ON (green)

#### Skip to Pre-Boss
- **Purpose**: Set player to Level 10 (pre-boss)
- **Implementation**: Calls `config.setUnlockedLevel(10)`
- **Use Case**: Jump directly to Level 10 for boss testing
- **Note**: Clears all level 1-9 progress

#### Level 10 Actions Section
Test-specific tools for the boss level.

### 🗺️ Levels Tab
Level and progression unlocking tools.

**Features:**

#### Unlock All Levels (1-11)
- Sets unlocked level to 11
- Grants access to all regular levels and Level 11
- Calls `config.setUnlockedLevel(11)`

#### Unlock Level 11
- Specifically unlocks Level 11 only
- Calls `config.setLevel11Unlocked(true)`
- Use Case: Test Level 11 content

#### Unlock All Skins
- Calls `skins.unlockAllSkins()`
- Grants access to all character skins
- Updates skin selection menu

#### Unlock Bazooka Mode
- Calls `config.setBazookaMode(true)`
- Enables bazooka weapon system
- Affects Level 10+ gameplay

#### Save Progress to LocalStorage
- Manually saves game state
- Logs timestamp in console
- Use Case: Ensure test changes are persisted

### 📺 Console Tab
Real-time error monitoring and logging.

**Features:**
- **Displays Errors** - All JavaScript errors appear here
- **Logs Actions** - Dev panel actions logged automatically
- **Error Messages** - Full error text with timestamps
- **Clear Console** - Reset console output
- **Timestamp** - Each log entry shows exact time

**Log Format:**
```
[HH:MM:SS] ✓/✗ Action description
[HH:MM:SS] 🔴 ERROR: Error message
[HH:MM:SS] 🔴 REJECTION: Promise rejection message
```

## Enable/Disable System

### Master Toggle
- **Shortcut**: `Ctrl+Shift+E`
- **Effect**: Completely hides entire panel when disabled
- **UI Removal**: No visual trace when disabled
- **Feature Lock**: All dev features are disabled when panel is off
- **Persistence**: Stored in localStorage as `devPanelEnabled`

### When Disabled:
- Panel not visible at all
- Dev features cannot be used
- Flags not checked in game code
- Keyboard shortcut (Ctrl+Shift+D) shows alert to enable first

## Technical Integration

### Config.js Functions (NEW)
```javascript
// God Mode
isGodMode()                    // Check if god mode active
setGodMode(enabled)            // Enable/disable god mode

// Boss Damage
isBossDamage10x()             // Check if 10x damage active
setBossDamage10x(enabled)     // Enable/disable 10x damage

// Boss Unlock
setBazookaMode(enabled)       // Enable/disable bazooka mode
setGodMode(enabled)            // Enable god mode (Defender)
```

### State.js Integration
- `applyPlayerDamage()` checks `config.isGodMode()` to prevent damage
- `beginGeneratorSession()` and `completeGenerator()` work with instant gen
- Door unlocking checks `window.DEV_NO_KEYS` for Level 11

### Main.js Integration
- `gameLoop()` checks `window.__instaGenEnabled` during generator UI
- Dev panel initialized and wired in `initGame()`

### Achievements.js Integration
- `window.ACHIEVEMENT.debugUnlock(id)` - Unlock specific achievement
- `window.ACHIEVEMENT.debugUnlockAll()` - Unlock all achievements
- `window.ACHIEVEMENT.clear()` - Clear all achievements
- `window.ACHIEVEMENT.progress()` - Get progress stats

## LocalStorage Keys

| Key | Purpose | Value |
|-----|---------|-------|
| `devPanelEnabled` | Master enable/disable toggle | 'true'/'false' |
| `devGodMode` | God mode state | 'true'/'false' |
| `devInstantGen` | Instant generator state | 'true'/'false' |
| `devNoKeys` | No keys needed state | 'true'/'false' |
| `devBossDamage` | 10x boss damage state | 'true'/'false' |
| `smg_godMode` | Game-level god mode flag | '0'/'1' |
| `smg_boss_dmg_10x` | Game-level boss damage flag | '0'/'1' |
| `devSaveTime` | Last save timestamp | ISO string |

## File Structure

### Core Files Modified
- `/game/js/dev-panel.js` - Main dev panel implementation (NEW)
- `/game/js/main.js` - Updated imports and init
- `/game/js/config.js` - Fixed god mode and boss damage functions
- `/crazygames-build/js/` - Mirrors of above

### Old Files Removed
- `/game/js/dev-tools.js` - Replaced with dev-panel.js
- `/crazygames-build/js/dev-tools.js` - Removed

## Usage Examples

### Test Achievement System
1. Press `Ctrl+Shift+D` to open panel
2. Go to **Achievements** tab
3. Enter `first_blood` in achievement ID field
4. Click "Unlock"
5. Watch stats update to 1/56
6. View "RECENT UNLOCKS" section
7. Use "Clear All" to reset

### Test Boss Arena
1. Press `Ctrl+Shift+D` to open panel
2. Go to **Levels** tab
3. Click "Unlock All Levels (1-11)"
4. Close panel and navigate to Level 10
5. Go to **Game** tab
6. Click "10x Boss Damage: ON"
7. Fight boss (deals 10x damage)

### Test God Mode
1. Press `Ctrl+Shift+D` to open panel
2. Go to **Game** tab
3. Click "God Mode: ON"
4. Play level - take no damage
5. Click "God Mode: OFF" to disable

### Debug Errors
1. Press `Ctrl+Shift+D` to open panel
2. Go to **Console** tab
3. Any JavaScript errors appear automatically
4. Scroll through to find error messages
5. Use browser DevTools (F12) for more detail

## Design Philosophy

The dev panel is designed to be:
- **Professional**: Looks polished and modern
- **Comprehensive**: Covers all major testing needs
- **Intuitive**: Clear labels and logical organization
- **Non-Intrusive**: Draggable and can be hidden
- **Reliable**: All features actually work and are wired

## Future Enhancement Ideas

- [ ] Pre-set test configurations (speedrun, deathless, etc.)
- [ ] Custom skin tester (apply any skin instantly)
- [ ] Level editor integration
- [ ] FPS counter and performance metrics
- [ ] Save/load game states
- [ ] Network traffic monitoring
- [ ] Audio debug (toggle specific sounds)
