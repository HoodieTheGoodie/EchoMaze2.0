/**
 * Player Statistics Tracking Module
 * Tracks deaths, playtime, level completions, and other stats
 */

'use strict';

const STATS_KEY = 'echomaze-player-stats';

    let stats = {
        totalDeaths: 0,
        totalPlaytime: 0, // in seconds
        levelsCompleted: {},
        bestTimes: {},
        endlessBestWave: 0,
        endlessTotalKills: 0,
        powerUpsCollected: 0,
        bossesDefeated: 0,
        achievementsUnlocked: 0,
        generatorsCompleted: 0,
        generatorsFailed: 0,
        skillChecksMade: 0,
        skillChecksFailed: 0,
        sessionStartTime: Date.now(),
        lastPlayed: Date.now(),
        // Per-skin statistics
        skinStats: {} // { skinName: { deaths, wins, generators, skillChecks, etc. } }
    };

    let currentLevelStartTime = null;
    let playtimeInterval = null;

    /**
     * Load stats from localStorage
     */
    function loadStats() {
        const saved = localStorage.getItem(STATS_KEY);
        if (saved) {
            try {
                const loaded = JSON.parse(saved);
                stats = { ...stats, ...loaded };
                stats.sessionStartTime = Date.now();
            } catch (e) {
                console.warn('Failed to load stats:', e);
            }
        }
        
        // Start playtime tracking
        startPlaytimeTracking();
    }

    /**
     * Save stats to localStorage
     */
    function saveStats() {
        stats.lastPlayed = Date.now();
        localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    }

    /**
     * Start tracking total playtime
     */
    function startPlaytimeTracking() {
        if (playtimeInterval) return;
        
        playtimeInterval = setInterval(() => {
            stats.totalPlaytime += 1;
            // Save every 30 seconds to avoid data loss
            if (stats.totalPlaytime % 30 === 0) {
                saveStats();
            }
        }, 1000);
    }

    /**
     * Stop playtime tracking
     */
    function stopPlaytimeTracking() {
        if (playtimeInterval) {
            clearInterval(playtimeInterval);
            playtimeInterval = null;
            saveStats();
        }
    }

    /**
     * Record a death
     */
    function recordDeath() {
        stats.totalDeaths++;
        recordSkinStat('deaths');
        saveStats();
        
        // Show death stat if enabled
        if (window.DEV_PANEL && window.DEV_PANEL.isStatsOverlayEnabled) {
            updateStatsOverlay();
        }
    }
    
    /**
     * Record generator completion
     */
    function recordGeneratorCompleted() {
        stats.generatorsCompleted++;
        recordSkinStat('generatorsCompleted');
        saveStats();
    }
    
    /**
     * Record generator failure
     */
    function recordGeneratorFailed() {
        stats.generatorsFailed++;
        recordSkinStat('generatorsFailed');
        saveStats();
    }
    
    /**
     * Record skill check
     */
    function recordSkillCheckMade() {
        stats.skillChecksMade++;
        recordSkinStat('skillChecksMade');
        saveStats();
    }
    
    /**
     * Record skill check failure
     */
    function recordSkillCheckFailed() {
        stats.skillChecksFailed++;
        recordSkinStat('skillChecksFailed');
        saveStats();
    }

    /**
     * Start level timer
     */
    function startLevel(levelNumber) {
        currentLevelStartTime = Date.now();
    }

    /**
     * Record level completion
     */
    function completeLevel(levelNumber) {
        if (!stats.levelsCompleted[levelNumber]) {
            stats.levelsCompleted[levelNumber] = 0;
        }
        stats.levelsCompleted[levelNumber]++;
        
        // Record win for current skin
        recordSkinStat('wins');
        
        // Record best time if we have a start time
        if (currentLevelStartTime) {
            const time = (Date.now() - currentLevelStartTime) / 1000; // Convert to seconds
            if (!stats.bestTimes[levelNumber] || time < stats.bestTimes[levelNumber]) {
                stats.bestTimes[levelNumber] = time;
            }
            currentLevelStartTime = null;
        }
        
        saveStats();
    }

    /**
     * Record endless mode stats
     */
    function recordEndlessWave(wave) {
        if (wave > stats.endlessBestWave) {
            stats.endlessBestWave = wave;
            saveStats();
        }
    }

    /**
     * Record endless kill
     */
    function recordEndlessKill() {
        stats.endlessTotalKills++;
        if (stats.endlessTotalKills % 10 === 0) {
            saveStats();
        }
    }

    /**
     * Record power-up collection
     */
    function recordPowerUp() {
        stats.powerUpsCollected++;
        saveStats();
    }

    /**
     * Record boss defeat
     */
    function recordBossDefeat() {
        stats.bossesDefeated++;
        saveStats();
    }

    /**
     * Record achievement unlock
     */
    function recordAchievement() {
        stats.achievementsUnlocked++;
        saveStats();
    }
    
    /**
     * Get current active skin (if available)
     */
    function getCurrentSkin() {
        try {
            // Try to get skin from skins module
            if (typeof window.SKINS_API !== 'undefined' && window.SKINS_API.getEquippedSkin) {
                return window.SKINS_API.getEquippedSkin();
            }
            // Fallback to localStorage
            const equippedSkin = localStorage.getItem('smg_equippedSkin');
            return equippedSkin || 'default';
        } catch (e) {}
        return 'default';
    }
    
    /**
     * Record a stat for the current skin
     */
    function recordSkinStat(statName, value = 1) {
        const skinName = getCurrentSkin();
        
        // Initialize skin stats if not exists
        if (!stats.skinStats[skinName]) {
            stats.skinStats[skinName] = {
                deaths: 0,
                wins: 0,
                generatorsCompleted: 0,
                generatorsFailed: 0,
                skillChecksMade: 0,
                skillChecksFailed: 0,
                powerUpsCollected: 0,
                enemiesDefeated: 0,
                damageDealt: 0,
                lastUsed: Date.now()
            };
        }
        
        // Increment the stat
        if (stats.skinStats[skinName].hasOwnProperty(statName)) {
            stats.skinStats[skinName][statName] += value;
        }
        
        stats.skinStats[skinName].lastUsed = Date.now();
    }
    
    /**
     * Get stats for a specific skin
     */
    function getSkinStats(skinName) {
        if (!stats.skinStats[skinName]) {
            return {
                deaths: 0,
                wins: 0,
                generatorsCompleted: 0,
                generatorsFailed: 0,
                skillChecksMade: 0,
                skillChecksFailed: 0,
                powerUpsCollected: 0,
                enemiesDefeated: 0,
                damageDealt: 0,
                lastUsed: Date.now()
            };
        }
        return stats.skinStats[skinName];
    }
    
    /**
     * Get all skin stats
     */
    function getAllSkinStats() {
        return stats.skinStats;
    }

    /**
     * Get formatted playtime string
     */
    function getFormattedPlaytime() {
        const hours = Math.floor(stats.totalPlaytime / 3600);
        const minutes = Math.floor((stats.totalPlaytime % 3600) / 60);
        const seconds = stats.totalPlaytime % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Get formatted best time for a level
     */
    function getFormattedBestTime(levelNumber) {
        const time = stats.bestTimes[levelNumber];
        if (!time) return 'N/A';
        
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        const ms = Math.floor((time % 1) * 100);
        
        if (minutes > 0) {
            return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
        } else {
            return `${seconds}.${ms.toString().padStart(2, '0')}s`;
        }
    }

    /**
     * Get stats summary object
     */
    function getStats() {
        return {
            ...stats,
            formattedPlaytime: getFormattedPlaytime(),
            sessionTime: Math.floor((Date.now() - stats.sessionStartTime) / 1000)
        };
    }

    /**
     * Reset all stats
     */
    function resetStats() {
        if (confirm('Are you sure you want to reset all statistics? This cannot be undone!')) {
            stats = {
                totalDeaths: 0,
                totalPlaytime: 0,
                levelsCompleted: {},
                bestTimes: {},
                endlessBestWave: 0,
                endlessTotalKills: 0,
                powerUpsCollected: 0,
                bossesDefeated: 0,
                achievementsUnlocked: 0,
                sessionStartTime: Date.now(),
                lastPlayed: Date.now()
            };
            saveStats();
            return true;
        }
        return false;
    }

    /**
     * Update stats overlay (if dev panel has it enabled)
     */
    function updateStatsOverlay() {
        const overlay = document.getElementById('stats-overlay');
        if (!overlay) return;
        
        overlay.innerHTML = `
            <div style="font-size: 12px; color: #0ff; background: rgba(0,0,0,0.7); padding: 8px; border-radius: 4px;">
                Deaths: ${stats.totalDeaths} | Playtime: ${getFormattedPlaytime()}
            </div>
        `;
    }

    /**
     * Export stats as JSON
     */
    function exportStats() {
        const data = JSON.stringify(stats, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `echomaze-stats-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Import stats from JSON
     */
    function importStats() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const imported = JSON.parse(event.target.result);
                    if (confirm('This will overwrite your current stats. Continue?')) {
                        stats = { ...stats, ...imported };
                        stats.sessionStartTime = Date.now();
                        saveStats();
                        alert('Stats imported successfully!');
                    }
                } catch (e) {
                    alert('Failed to import stats: Invalid file format');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    // Export API
    window.PLAYER_STATS = {
        load: loadStats,
        save: saveStats,
        recordDeath,
        startLevel,
        completeLevel,
        recordEndlessWave,
        recordEndlessKill,
        recordPowerUp,
        recordBossDefeat,
        recordAchievement,
        recordGeneratorCompleted,
        recordGeneratorFailed,
        recordSkillCheckMade,
        recordSkillCheckFailed,
        recordSkinStat,
        getCurrentSkin,
        getSkinStats,
        getAllSkinStats,
        getStats,
        getFormattedPlaytime,
        getFormattedBestTime,
        reset: resetStats,
        export: exportStats,
        import: importStats,
        get stats() { return getStats(); }
    };

    // Auto-load stats
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadStats);
    } else {
        loadStats();
    }

    // Save stats before page unload
    window.addEventListener('beforeunload', () => {
        stopPlaytimeTracking();
        saveStats();
    });

    // Also export as module
    export {
        loadStats,
        saveStats,
        recordDeath,
        startLevel,
        completeLevel,
        recordEndlessWave,
        recordEndlessKill,
        recordPowerUp,
        recordBossDefeat,
        recordAchievement,
        recordGeneratorCompleted,
        recordGeneratorFailed,
        recordSkillCheckMade,
        recordSkillCheckFailed,
        recordSkinStat,
        getCurrentSkin,
        getSkinStats,
        getAllSkinStats,
        getStats,
        getFormattedPlaytime,
        getFormattedBestTime,
        resetStats,
        exportStats,
        importStats
    };
