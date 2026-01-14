# Achievement Debug Menu Guide

## Overview
The achievement debug menu shows you **exactly** what conditions you need to meet for any achievement, whether those conditions are currently being met, and your progress toward completion.

## How to Access

### Open Dev Panel
- Press **Ctrl+Shift+D** to toggle the dev panel
- Or press **Ctrl+Shift+E** to enable/disable dev panel access

### Navigate to Achievements Tab
1. Open the dev panel
2. Click the **"Achievements"** tab at the top

## Features

### Achievement Inspector

#### Select Any Achievement
- Use the dropdown to select any achievement from the list
- Achievements are labeled with their tier (BRONZE, SILVER, GOLD, PLATINUM, DIAMOND)

#### View Detailed Information
For each achievement, you'll see:

1. **Basic Info**
   - Achievement name and tier
   - Description
   - Unlockable skin (if any)
   - Secret status
   - Current unlock status (✓ UNLOCKED or ○ LOCKED)

2. **Category**
   - What type of achievement it is (Level Completion, Speedrun, Challenge, etc.)

3. **Hint**
   - A helpful hint explaining how to unlock it
   - Shows specific codes or strategies where applicable

4. **Requirements (The New Feature!)**
   - Each condition is listed separately
   - **Status Icon**: ✓ (met) or ○ (not met)
   - **Progress Bar**: Visual representation of your progress
   - **Current/Max Values**: Shows exactly how much you've done (e.g., "5/25 enemies trapped")
   - **Percentage**: Your progress as a percentage

5. **Real-Time Updates**
   - Progress bars update automatically every 400ms while the panel is open
   - Watch your progress increase in real-time as you play!

### Example: "Trap Master" Achievement

When you select this achievement, you'll see:
```
○ Catch 25 enemies in zap traps
Progress: 12/25 (48%)
[=========>           ] (progress bar)
```

As you trap more enemies, the bar fills up and the numbers update automatically!

### Example: "Why??" Achievement

This complex achievement shows multiple steps:
```
✓ 1. Unlock Blaster Mode
○ 2. Reach Level 11 power supply room
○ 3. Activate Blaster Mode (B key)
○ 4. Shoot the power supply
```

Each step shows whether it's complete (✓) or pending (○).

## Progress-Tracked Achievements

These achievements have live progress tracking:
- **Trap Master**: 25 trapped enemies
- **Total Deaths**: 100 deaths
- **Deathless Streak**: 3 consecutive levels
- **Generator Perfect**: 3 or 10 perfect checks
- **Boss Pigs**: 3 pigs mounted
- **Shield Master**: 10 reflected projectiles
- **No Abilities**: 3 or 10 consecutive levels/waves
- **Teleport Escapes**: 5 dodges
- **All Endings**: Track which endings unlocked

## Debug Tools

The panel also includes quick unlock tools:
- **Unlock Selected**: Unlock the currently selected achievement
- **Unlock All**: Unlock all achievements (debug mode)
- **Clear All**: Reset all achievements (debug mode)

## Tips

1. **Watch Progress Live**: Keep the panel open while playing to see progress update in real-time
2. **Check Requirements Before Attempts**: Select an achievement before starting a run to see exactly what you need to do
3. **Track Multi-Step Achievements**: Use the checklist-style view for complex achievements like endings
4. **Verify Conditions**: If an achievement isn't unlocking, check if all conditions show as met (✓)

## Keyboard Shortcuts

- **Ctrl+Shift+D**: Toggle dev panel visibility
- **Ctrl+Shift+E**: Enable/disable dev panel access
- **Ctrl+Shift+A**: Toggle achievement debug mode (console)

## Console Commands

Open the browser console (F12) and use:
```javascript
window.ACHIEVEMENT.help()      // Show all commands
window.ACHIEVEMENT.list()      // List all achievements
window.ACHIEVEMENT.progress()  // Show overall progress
```

## Notes

- The debug menu uses the same tracking systems as the actual achievement system
- Progress shown is from your actual save data (localStorage)
- Unlocking via debug tools will trigger the normal unlock notifications
- Some achievements check conditions on specific events and may not update until those events fire

Enjoy tracking your achievement progress! 🎮
