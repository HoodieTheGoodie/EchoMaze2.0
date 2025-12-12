# Endless Mode Progression System - Implementation Status

## ✅ Completed Components

### 1. Data Structures (`endless-progression.js`)
- **endlessProgression** object with:
  - `availablePoints`: Points to spend on upgrades
  - `lifetimeStats`: { bestRun, totalRooms, totalRuns }
  - `currentRun`: { active, roomNumber, points, activeAbilities, livesGained }
  - `permanentUpgrades`: 7 upgrade types with levels
  - `upgradesEnabled`: Toggle for challenge runs

- **8 Temporary Abilities** (TEMP_ABILITIES):
  - Room 5: Double Jump
  - Room 10: Reduced Stamina (50% less)
  - Room 15: Shield Durability (5 hits)
  - Room 20: Infinite Projectiles
  - Room 25: Extra Life (+1 life, one time)
  - Room 30: Speed Boost (+30%)
  - Room 35: Fast Repair (2x generator speed)
  - Room 40: Extended Jump (super charge)

- **7 Permanent Upgrades** (UPGRADE_CATALOG):
  1. Extra Lives: +1 life per level (max 3) - 50 points/level
  2. Stamina Boost: +20% per level (max 5) - 40 points/level
  3. Generator Speed: -10% time per level (max 5) - 60 points/level
  4. Movement Speed: +5% per level (max 4) - 45 points/level
  5. Jump Charge: -10% time per level (max 3) - 35 points/level
  6. Start with Double Jump: One-time unlock - 100 points
  7. Start with Shield: One-time unlock - 80 points

### 2. Core Functions
- `startEndlessRun(upgradesEnabled)`: Initialize new run
- `completeEndlessRoom()`: Award points, check for ability unlocks
- `endEndlessRun(won)`: Save stats, award points
- `purchaseUpgrade(upgradeKey)`: Buy permanent upgrades
- `resetUpgrades()`: Refund all upgrade points
- `hasAbility(abilityKey)`: Check if player has ability in current run
- `applyPermanentUpgrades()`: Apply bonuses to gameState
- `getRoomDifficulty(roomNumber)`: Calculate generators/enemies for room
- `calculateRoomPoints(roomNumber)`: Formula: 10 + (roomNumber * 2)
- `saveEndlessProgress()` / `loadEndlessProgress()`: localStorage persistence

### 3. UI Components
**HTML Menu** (`index.html` - inline, z-index 2400):
- Header with title and tagline
- Stats bar showing: Best Run, Total Rooms, Available Points, Total Runs
- Left panel: Upgrade shop with buy buttons
  - Shows current level, next cost, and benefit
  - Grayed out when can't afford
  - Shows MAX when fully upgraded
- Right panel:
  - Start Run button with upgrade toggle checkbox
  - Ability unlock schedule
  - Classic Endless Mode button
  - Back to Main Menu button

**JavaScript Functions** (`main.js`):
- `showNewEndlessMenu()`: Display endless menu, hide main menu
- `hideNewEndlessMenu()`: Hide endless menu
- `showClassicEndless()`: Show old endless overlay
- `updateEndlessMenuStats()`: Refresh stats display
- `populateUpgradesList()`: Build upgrade shop UI with buy buttons
- `populateAbilitySchedule()`: Show ability unlock timeline

### 4. Integration Points
- Main menu "Endless Mode" button calls `showNewEndlessMenu()`
- Endless menu buttons wired in `wireMenuUi()`:
  - Start Run → `startEndlessRun()` + `startLevel('endless')`
  - Reset Upgrades → `resetUpgrades()` + refresh UI
  - Classic Mode → `showClassicEndless()`
  - Back → `hideNewEndlessMenu()` + `showMenu()`
- Global exports: `window.loadEndlessProgression`, `window.saveEndlessProgression`, etc.
- Imported in main.js from `endless-progression.js`

## 🚧 To Be Implemented

### 1. Apply Abilities During Gameplay
**Location**: `state.js`, `input.js`, various game logic files
- Check `hasAbility('doubleJump')` in jump logic
- Check `hasAbility('reducedStamina')` in stamina drain
- Check `hasAbility('shieldDurability')` for 5-hit shields
- Check `hasAbility('infiniteShieldProjectiles')` for ammo
- Check `hasAbility('extraLife')` when giving the life
- Apply `hasAbility('speedBoost')` to movement speed
- Apply `hasAbility('fastRepair')` to generator completion time
- Apply `hasAbility('extendedJump')` to jump charge rate

### 2. Apply Permanent Upgrades
**Location**: `startEndlessRun()` in `endless-progression.js`
```javascript
// After calling applyPermanentUpgrades(), modify:
gameState.playerHealth += upgrades.extraStartingLives;
gameState.baseStamina *= (1 + upgrades.baseStaminaBoost * 0.2);
// etc. for all upgrades
```

### 3. Generate Scaled Rooms
**Location**: Endless mode level generation
- Use `getRoomDifficulty(roomNumber)` to get generator/enemy count
- Generate random maze each room
- Place enemies based on difficulty
- Place generators based on difficulty

### 4. Room Completion Logic
**Location**: `state.js` when player reaches exit
```javascript
if (gameState.mode === 'endless-progression') {
    completeEndlessRoom(); // Awards points, checks abilities
    // Generate next room
    generateNextEndlessRoom();
}
```

### 5. Death Screen with Stats
**Location**: Lose overlay modifications
- Check if `gameState.mode === 'endless-progression'`
- Show: Rooms Cleared, Points Earned, Abilities Unlocked
- Call `endEndlessRun(false)` to save stats
- Button: "Try Again" (back to endless menu), "Main Menu"

### 6. Active Abilities Display (In-Game UI)
**Location**: During gameplay, in UI panel
- Show icons for currently active abilities
- Highlight next ability milestone
- Display current room number and total points

### 7. Integration with State Management
- Add `gameState.mode = 'endless-progression'` when starting new run
- Modify endless mode generation to check for progression mode
- Apply scaling based on room number
- Track rooms completed in run

## 📊 Difficulty Scaling Formula

```javascript
function getRoomDifficulty(roomNumber) {
    // Generators: Start at 3, +1 every 10 rooms (cap at 7)
    const generators = Math.min(3 + Math.floor(roomNumber / 10), 7);
    
    // Enemies: Progressive addition
    let enemies = [];
    if (roomNumber >= 1) enemies.push('chaser');
    if (roomNumber >= 5) enemies.push('pig');
    if (roomNumber >= 10) enemies.push('seeker');
    if (roomNumber >= 15) enemies.push('batter');
    if (roomNumber >= 20) enemies.push('mortar');
    
    // Duplicates: At high rooms, add duplicates
    if (roomNumber >= 25) enemies = enemies.concat(['chaser']);
    if (roomNumber >= 30) enemies = enemies.concat(['pig', 'seeker']);
    if (roomNumber >= 35) enemies = enemies.concat(['batter']);
    if (roomNumber >= 40) enemies = enemies.concat(['mortar', 'chaser', 'pig']);
    
    return { generators, enemies, roomNumber };
}
```

## 💾 localStorage Schema

```json
{
  "echoMaze_endlessProgress": {
    "availablePoints": 0,
    "lifetimeStats": {
      "bestRun": 0,
      "totalRooms": 0,
      "totalRuns": 0
    },
    "currentRun": {
      "active": false,
      "roomNumber": 0,
      "points": 0,
      "activeAbilities": [],
      "livesGained": 0
    },
    "permanentUpgrades": {
      "startingLives": 0,
      "staminaBoost": 0,
      "generatorSpeedUp": 0,
      "movementSpeed": 0,
      "jumpChargeSpeed": 0,
      "startWithDoubleJump": false,
      "startWithShield": false
    },
    "upgradesEnabled": true
  }
}
```

## 🎯 User Flow

1. Player clicks "Endless Mode" in main menu
2. New endless menu appears with stats and upgrades
3. Player spends points on permanent upgrades
4. Player clicks "Start Run" (with upgrades enabled/disabled)
5. Game starts first room with scaled difficulty
6. Player completes room → `completeEndlessRoom()` → next room
7. Abilities unlock at milestones (rooms 5, 10, 15, etc.)
8. Player dies → `endEndlessRun()` → death screen with stats
9. Points awarded → back to endless menu to spend
10. Repeat for meta-progression loop

## 🔧 Quick Integration Checklist

- [ ] Modify endless level generation to use `getRoomDifficulty()`
- [ ] Add ability checks in game logic (jump, stamina, shield, etc.)
- [ ] Call `completeEndlessRoom()` when room cleared
- [ ] Call `endEndlessRun()` on death
- [ ] Display active abilities UI during run
- [ ] Show death screen with endless stats
- [ ] Test upgrade purchases and point refunds
- [ ] Test ability unlocks and notifications
- [ ] Test localStorage persistence across sessions
- [ ] Add achievements for endless mode milestones
