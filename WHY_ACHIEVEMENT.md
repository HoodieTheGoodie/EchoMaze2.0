# Secret Achievement: "Why??" 🗑️

## Overview
A secret Diamond-tier achievement unlocked by destroying the power supply in Level 11 using the Energy Blaster (Bazooka Mode).

## How to Unlock
1. **Unlock Bazooka Mode** - Enter a secret code in Skins to unlock "Weapon Online"
2. **Enable Bazooka Mode** - Activate it in Settings
3. **Play Level 11** - Enter the secret level (unlocked by Level 10 boss victory)
4. **Reach the Finale Room** - Navigate to the final room with the power supply
5. **Destroy the Power Supply** - Shoot it with bazooka projectiles
6. **Watch the Cutscene** - Trigger special virus dialogue

## Technical Details

### Achievement Definition
- **ID**: `why_destroy_power`
- **Name**: "Why??"
- **Tier**: Diamond (highest rarity)
- **Description**: "Destroy power supply w/ bazooka"
- **Secret**: Yes (hidden from achievement list)

### Implementation Files

#### achievements.js
- Added achievement definition to ACHIEVEMENTS array
- Diamond tier, secret flag set to true

#### state.js  
- **Player Collision** (line ~1388): Power supply now blocks player movement (acts as wall)
  - Only if power supply exists and not destroyed
  - Check added in movePlayer() collision logic

- **Projectile Collision** (line ~3033): When bazooka projectile hits power supply:
  - Sets `powerSystemDestroyed = true`
  - Sets cutsceneStep to 8 (special dialogue)
  - Starts cutsceneStartTime for timing
  - Awards "why_destroy_power" achievement if bazooka mode active
  - Plays explosion effect

#### level11.js
- **Cutscene Step 8-9** (line ~1221): Special "Why??" dialogue cutscene
  - Shows 4 lines of virus dialogue over ~9.5 seconds
  - Monologue lines:
    1. "Why...?"
    2. "Why would you blow up the power supply, you idiot?!"
    3. "Now we BOTH lose."
    4. "I can't even believe your stupidity."
  - Fades to black after dialogue
  - Transitions to credits

### Power Supply Behavior

#### Normal (Power Supply Intact)
- Can interact via prompt to disable it (Good Ending path)
- Blocking player movement (acts as wall)
- Shows "Disable Power Supply?" prompt in finale room

#### Destroyed by Bazooka
- Triggers cutscene with virus dialogue
- Awards "Why??" diamond achievement (if bazooka mode active)
- Transitions to credits (different from normal ending paths)
- Creates explosion effect

## Achievement Logic

The achievement ONLY unlocks if:
1. ✅ Bazooka Mode is actively enabled (checked via `config.isBazookaMode()`)
2. ✅ Power supply is destroyed by a bazooka projectile (not by normal interaction)
3. ✅ Player reached Level 11 finale room
4. ✅ This is the player's first destruction (flag prevents re-unlock)

## Cutscene Flow

```
cutsceneStep 8 starts
  ↓
Shows virus monologue (4 lines, ~9.5s total)
  ↓
Fades to black at 9.5s
  ↓
cutsceneStep 9 triggered
  ↓
Transitions to credits (exitLevel11ToCredits)
```

## Notes

- This is a completely secret achievement - not shown in the normal achievement list
- Only rewards for the "reckless" choice of destroying the power supply
- Contrasts with the two normal endings (Good/Bad) which use prompts
- Bazooka mode requirement adds extra challenge (must unlock this first)
- Diamond tier makes it one of the rarest achievements in the game

## Testing

To test locally:
1. Enable Dev Mode in console: `ACHIEVEMENT.enableDebugMode()`
2. Enable Bazooka Mode: `window.CONFIG.setBazookaMode(true)`
3. Load Level 11
4. Navigate to finale room
5. Shoot power supply with bazooka
6. Should see virus dialogue and achievement unlock notification
