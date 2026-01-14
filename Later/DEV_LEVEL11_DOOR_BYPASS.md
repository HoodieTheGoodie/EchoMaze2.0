# Level 11 Door Lock Bypass Feature

## Overview
Added a dev panel toggle that lets you ignore door locks on Level 11 for quick testing of endings without collecting keys.

## Implementation Details

### Dev Panel Changes (`game/js/dev-panel.js`)

**New Toggle in Menu Tab:**
- Added "Ignore Door Locks" checkbox under new "Level 11 Testing" section
- Toggled state persists in localStorage as `devLevel11IgnoreLocks`
- Also sets `window.devLevel11IgnoreLocks` for quick runtime checks

**New Functions:**
- `isLevel11DoorLocksIgnored()` - Exported helper to check if locks are bypassed
- Updated `wireMenuControls()` to wire the new toggle
- Updated `refreshToggleStates()` to load saved toggle state

### Level 11 Integration (`game/js/level11.js`)

**Door Lock Bypass Logic (lines ~670-690):**
- Top door (yellow key): Added check for `window.devLevel11IgnoreLocks` 
  - If enabled, bypasses to 'finale' room without key
- Left door (green key): Added check for `window.devLevel11IgnoreLocks`
  - If enabled, bypasses to 'maze' room without key

## How to Use

1. **Open Dev Panel** (Ctrl+Shift+D)
2. **Click "Menu" tab**
3. **Check "Ignore Door Locks"** under "Level 11 Testing" section
4. **Start Level 11** from main menu
5. **Walk through locked doors freely** - no yellow/green key required
6. **Test endings quickly** without collecting keys

## Storage
- Setting persists in localStorage (key: `devLevel11IgnoreLocks`)
- Survives page reload
- Automatically loaded when panel initializes

## Notes
- This is for dev testing only; setting doesn't affect normal gameplay
- You can still collect keys normally if desired
- Other Level 11 mechanics (enemies, abilities, puzzles) work as usual
