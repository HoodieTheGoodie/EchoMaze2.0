# 🎮 Dev Panel v2 - Quick Reference

## What You Got

A professional draggable dev panel overlay with comprehensive debugging tools for EchoMaze 2.0.

## How to Use It

### Open/Close Panel
**Press:** `Ctrl+Shift+D`
- Panel appears in top-right corner
- Drag by the blue title bar to move anywhere
- Click tabs to switch sections

### Enable/Disable Entire Panel
**Press:** `Ctrl+Shift+E`
- First press: Enables panel completely
- Second press: Disables panel and hides it completely
- No visual trace when disabled

## What It Can Do

### Achievements Testing
1. Open panel with `Ctrl+Shift+D`
2. Click "Achievements" tab
3. Type achievement ID (e.g., `first_blood`)
4. Click "Unlock"
5. Watch progress update

### God Mode
1. Click "Game" tab
2. Click "God Mode: OFF" button
3. Play a level - you don't take damage
4. Button turns red and shows "ON"

### Quick Boss Testing
1. Go to "Levels" tab
2. Click "Unlock All Levels (1-11)"
3. Play to Level 10
4. Click "Game" tab
5. Click "10x Boss Damage: OFF" button (turns to green "ON")
6. Boss takes massive damage

### Instant Generator
1. Click "Game" tab
2. Click "Instant Generator: OFF" (turns red "ON")
3. Open a generator
4. Generator instantly completes (no skill checks needed)

### Test Achievements Quickly
1. Click "Achievements" tab
2. Click "Unlock All (56)"
3. All achievements unlock at once
4. Stats show 56/56 and 100%
5. Use "Clear All" to reset

### Check Errors
1. Click "Console" tab
2. Any errors that happen appear here
3. Timestamp shows when error occurred
4. Click "Clear Console" to reset

## Features List

| Feature | Tab | What It Does |
|---------|-----|--------------|
| Unlock Achievement | Achievements | Unlock one by ID |
| Unlock All (56) | Achievements | Unlock every achievement |
| Clear All | Achievements | Reset all achievements |
| God Mode | Game | Infinite health (ON/OFF) |
| Instant Generator | Game | Skip skill checks (ON/OFF) |
| No Keys Needed | Game | Bypass Level 11 locks (ON/OFF) |
| 10x Boss Damage | Game | Boss takes 10x damage (ON/OFF) |
| Skip to Pre-Boss | Game | Jump to Level 10 |
| Unlock All Levels | Levels | Access levels 1-11 |
| Unlock Level 11 | Levels | Access Level 11 only |
| Unlock All Skins | Levels | Get all character skins |
| Unlock Bazooka Mode | Levels | Enable bazooka weapon |
| Save Progress | Levels | Manual save to storage |
| Error Console | Console | See JavaScript errors |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+D` | Open/Close Panel |
| `Ctrl+Shift+E` | Enable/Disable Panel |

## File Locations

- **Panel Code:** `/game/js/dev-panel.js` (703 lines)
- **Documentation:** See other DEV_PANEL_*.md files in repo root
- **Synced Copy:** `/crazygames-build/js/dev-panel.js`

## Important Notes

- **Draggable:** Click and drag the blue title bar
- **Always On Top:** Panel sits above all game content
- **Completely Hidden:** When disabled with Ctrl+Shift+E, no trace is visible
- **All Features Work:** Every button actually does what it says
- **Persistent:** Settings saved in browser storage

## Common Tasks

### I want to test a specific achievement
1. Ctrl+Shift+D → Achievements tab
2. Type achievement ID
3. Click Unlock

### I want to skip to Level 10
1. Ctrl+Shift+D → Levels tab
2. Click "Unlock All Levels"
3. Game levels 1-11 now accessible
4. OR click "Skip to Pre-Boss" to go directly

### I want to play without dying
1. Ctrl+Shift+D → Game tab
2. Click "God Mode: OFF"
3. God Mode turns ON (red button)
4. You're invincible now

### I want to check for errors
1. Ctrl+Shift+D → Console tab
2. Any JavaScript errors show here
3. Click "Clear Console" to reset

### I want to disable the panel
1. Press Ctrl+Shift+E
2. Panel disappears completely
3. No visual trace remains
4. Press Ctrl+Shift+E again to re-enable

## Support

- **User Guide:** Read `DEV_PANEL_GUIDE.md`
- **Test Checklist:** Read `DEV_PANEL_TEST_CHECKLIST.md`
- **Technical Docs:** Read `DEV_PANEL_IMPLEMENTATION.md`

---

**Status:** ✅ Ready to use  
**Stability:** Production-ready  
**Last Updated:** Today  
