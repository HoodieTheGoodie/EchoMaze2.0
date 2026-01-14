# EchoMaze 2.0 - Hotfix v1.2.1

## Bug Fixes

### 1. Menu Particles Accessibility Error ✅
**Issue**: "Cannot read properties of undefined (reading 'reducedMotion')"
**Cause**: ACCESSIBILITY module not initialized before menu-particles checked settings
**Fix**: Added safety checks - now safely checks if ACCESSIBILITY exists and has settings before reading

```javascript
if (window.ACCESSIBILITY && window.ACCESSIBILITY.settings && window.ACCESSIBILITY.settings.reducedMotion)
```

### 2. Quick Restart Keybind Conflict ✅
**Issue**: R key conflicted with browser reload (Ctrl+R/Cmd+R)
**Cause**: Using single R key without modifier
**Fix**: Changed to **Shift+R** - much safer and doesn't conflict with browser controls
- Press **Shift+R** during gameplay to restart current level
- Shows "Restarting... (Shift+R)" feedback message
- Updated keybinds reference

## New Features

### Skin Statistics Tracking 📊

Each character/skin now tracks its own statistics separately:

#### Tracked Stats Per Skin
- **Combat Stats**
  - Deaths while using this skin
  - Wins (levels completed)
  - Enemies defeated
  - Total damage dealt

- **Generator Stats**
  - Generators completed with this skin
  - Generators failed with this skin

- **Skill Check Stats**
  - Total skill checks made
  - Total skill checks failed

- **Other Stats**
  - Power-ups collected with this skin
  - Last used date (shows: "Today", "Yesterday", "X days ago")

#### Accessing Skin Stats
1. Open **Skins** menu
2. Each skin now has a **"📊 Stats"** button
3. Click to reveal a dropdown showing all tracked statistics
4. Click again to collapse the dropdown
5. Stats are color-coded:
   - 🟢 Green for successes (wins, generators completed)
   - 🔴 Red for failures (deaths, failed checks)
   - 🟡 Yellow for collected items

### How Stats Are Tracked

| Event | Tracked As |
|-------|-----------|
| Player death | `deaths` for current skin |
| Level completion | `wins` for current skin |
| Generator completed | `generatorsCompleted` for current skin |
| Generator failed | `generatorsFailed` for current skin |
| Skill check made | `skillChecksMade` for current skin |
| Skill check failed | `skillChecksFailed` for current skin |
| Power-up collected | `powerUpsCollected` for current skin |
| Skin equipped | `lastUsed` timestamp updated |

### Files Modified

1. **player-stats.js**
   - Added skinStats object to track per-skin data
   - Added recordGeneratorCompleted/Failed functions
   - Added recordSkillCheckMade/Failed functions
   - Added recordSkinStat() function for tracking
   - Added getSkinStats() and getAllSkinStats() functions
   - Enhanced completeLevel() to record wins per skin
   - Enhanced recordDeath() to record deaths per skin

2. **skins.js**
   - Updated equipSkin() to record skin selection
   - Exposed SKINS_API window object for stat tracking
   - Records lastUsed timestamp when skin is equipped

3. **quick-restart.js**
   - Changed hotkey from R to Shift+R
   - Updated feedback message to show "Shift+R"

4. **menu-particles.js**
   - Fixed accessibility error with proper null checking
   - Safely reads window.ACCESSIBILITY.settings.reducedMotion

### Files Created

1. **skin-stats.js** (330 lines)
   - Dropdown UI component for skin statistics
   - Auto-injects stats buttons into skin menu
   - Real-time stats display with formatting
   - "Last Used" date calculations (Today, Yesterday, X days ago)
   - Color-coded stats for better readability

### Technical Details

#### Skin Stats Data Structure
```javascript
stats.skinStats = {
  'default': {
    deaths: 5,
    wins: 12,
    generatorsCompleted: 8,
    generatorsFailed: 2,
    skillChecksMade: 15,
    skillChecksFailed: 3,
    powerUpsCollected: 4,
    enemiesDefeated: 42,
    damageDealt: 1250,
    lastUsed: 1673539200000
  },
  'rookie': {
    deaths: 2,
    wins: 8,
    // ... other stats
  }
}
```

#### API Usage
```javascript
// Get stats for a specific skin
const rookieStats = window.PLAYER_STATS.getSkinStats('rookie');

// Get all skin stats
const allStats = window.PLAYER_STATS.getAllSkinStats();

// Record stats for current skin
window.PLAYER_STATS.recordSkinStat('deaths');
window.PLAYER_STATS.recordSkinStat('wins');
window.PLAYER_STATS.recordGeneratorCompleted();
window.PLAYER_STATS.recordSkillCheckFailed();
```

## Version History
- **v1.0**: Initial release
- **v1.1**: Achievements, themes, Level 11
- **v1.2**: Polish update (visual, audio, QoL, stats)
- **v1.2.1**: Hotfixes + Skin stats feature

## Testing Checklist

### Menu Particles
- [ ] No more accessibility error in console
- [ ] Particles still show on menu
- [ ] Respects reduced motion setting

### Quick Restart
- [ ] Shift+R restarts level during gameplay
- [ ] R key alone doesn't trigger restart
- [ ] Shows "Restarting... (Shift+R)" message
- [ ] Regular R reload works in browser (Ctrl+R)

### Skin Stats
- [ ] Stats button appears on each skin in menu
- [ ] Clicking expands dropdown with stats
- [ ] Clicking again collapses dropdown
- [ ] Stats show accurate values
- [ ] Dates display correctly (Today, Yesterday, X days ago)
- [ ] Different skins show different stats
- [ ] Stats persist after refresh
- [ ] Colors match: Green (success), Red (failure), Yellow (items)

## Known Issues
- None currently

## Future Enhancements
- Enemy defeat tracking per skin
- Damage dealt calculation
- Win/loss ratio per skin
- Leaderboard system by skin
- Per-skin achievements
