# Achievement Fixes Needed

## Issue 1: Count-based achievements don't unlock at goal (e.g., 9/3)

**Location**: `/workspaces/EchoMaze2.0/game/js/achievements.js` line 453

**Current code**:
```javascript
export function incrementAchievementProgress(key, amount = 1) {
    const stats = getAchievementStats();
    stats[key] = (stats[key] || 0) + amount;
    try {
        localStorage.setItem(ACHIEVEMENT_STATS_KEY, JSON.stringify(stats));
    } catch (e) {
        console.warn('[ACHIEVEMENT] Failed to save progress:', e);
    }
    
    // Check if this progress update is for a tracked achievement
    const tracked = getTrackedAchievement();
    if (tracked) {
        showTrackedAchievementProgress(tracked, key, stats[key]);
    }
    
    return stats[key];
}
```

**Fix - Add BEFORE `return stats[key];`**:
```javascript
    // Auto-unlock achievements when count goals are reached
    const currentValue = stats[key];
    if (key === 'perfectGenerators') {
        if (currentValue >= 3) unlockAchievement('generator_perfect_3');
        if (currentValue >= 10) unlockAchievement('generator_perfect_10');
    }
    if (key === 'totalDeaths' && currentValue >= 100) {
        unlockAchievement('total_deaths_100');
    }
    if (key === 'reflectedProjectiles' && currentValue >= 10) {
        unlockAchievement('perfect_shield_10');
    }
    if (key === 'trappedEnemies' && currentValue >= 25) {
        unlockAchievement('trap_master');
    }
```

---

## Issue 2: Can still track unlocked achievements

**Location**: `/workspaces/EchoMaze2.0/game/js/achievements.js` line 192

**Current code**:
```javascript
    if (debugMode) console.log(`[ACHIEVEMENT] UNLOCKED: ${achievement.name}`);
    devLog('achievement_unlocked', { id: achievementId });

    // Show notification
    showAchievementNotification(achievement);
```

**Fix - Add BETWEEN devLog and showAchievementNotification**:
```javascript
    // Clear tracking if this achievement was being tracked
    const tracked = getTrackedAchievement();
    if (tracked && tracked.id === achievementId) {
        localStorage.removeItem(TRACKED_ACHIEVEMENT_KEY);
        if (debugMode) console.log(`[ACHIEVEMENT] Stopped tracking: ${achievement.name}`);
    }
```

---

## Issue 3: Menu glitch after code redemption

**Location**: `/workspaces/EchoMaze2.0/game/js/ui-panels.js` line 608

**Current code**:
```javascript
export function closeSkinsPanel() {
    const overlay = document.getElementById('skinsOverlay');
    if (overlay) overlay.style.display = 'none';
    
    // Clear code input and status
    const input = document.getElementById('skinCodeInput');
    const status = document.getElementById('skinCodeStatus');
    if (input) input.value = '';
    if (status) status.textContent = '';
}
```

**Fix - Add at END before closing brace**:
```javascript
    // Ensure game state is properly set if we're not in a level
    import('./state.js').then(mod => {
        if (mod.gameState && mod.gameState.gameStatus !== 'playing') {
            mod.gameState.gameStatus = 'menu';
        }
    }).catch(() => {});
```

---

## Cache Version Updates

**Location**: `/workspaces/EchoMaze2.0/game/index.html`

Update these lines:
- `achievements.js?ver=v20250109h` → `achievements.js?ver=v20250109i`
- `ui-panels.js?ver=v20250109f` → `ui-panels.js?ver=v20250109i`
