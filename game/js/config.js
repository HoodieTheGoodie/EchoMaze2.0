// config.js - Level configs, seeds, and persistence

export const LEVEL_COUNT = 10;

// Fixed seeds per level for deterministic mazes
export const LEVEL_SEEDS = [
    0,
    87364519, // 1
    21987643, // 2
    55667788, // 3 (placeholder)
    99887766, // 4
    11223344, // 5
    33445566, // 6
    77778888, // 7
    12344321, // 8
    98761234, // 9
    24682468  // 10
];

export function getDefaultLevelConfig(level) {
    // Base config shared across levels
    const base = {
        generatorCount: 3,
        enemyEnabled: true,
        flyingPig: false,
        mortar: false,
        seed: LEVEL_SEEDS[level] || 1,
    };
    
    if (level === 1) {
        return { ...base, generatorCount: 3, enemyEnabled: false };
    }
    if (level === 2) {
        // Chaser only
        return { ...base, generatorCount: 3, enemyEnabled: true, flyingPig: false };
    }
    if (level === 3) {
        // Level 3 showcases the new Flying_Pig exclusively
        return { ...base, enemyEnabled: false, flyingPig: true };
    }
    if (level === 4) {
        // Both AIs enabled
        return { ...base, enemyEnabled: true, flyingPig: true };
    }
    // Level 5: Chaser and Seeker (no Pig, no Batter)
    if (level === 5) {
        return { ...base, enemyEnabled: true, flyingPig: false, seeker: true };
    }
    // Level 6: Chaser, Flying Pig, and Seeker
    if (level === 6) {
        return { ...base, enemyEnabled: true, flyingPig: true, seeker: true };
    }
    // Level 7: Chaser, Seeker, Batter (no Pig, no Mortar)
    if (level === 7) {
        return { ...base, enemyEnabled: true, flyingPig: false, seeker: true, batter: true, mortar: false };
    }
    // Level 8: Chaser, Seeker, Batter, Flying Pig (no Mortar)
    if (level === 8) {
        return { ...base, enemyEnabled: true, flyingPig: true, seeker: true, batter: true, mortar: false };
    }
    // Levels 9-10: include all (Chaser + Pig + Seeker + Batter + Mortar)
    if (level >= 9) {
        return { ...base, enemyEnabled: true, flyingPig: true, seeker: true, batter: true, mortar: true };
    }
    // Placeholder for levels 4-10 (use base defaults for now)
    return { ...base };
}

// Persistence keys
const KEY_UNLOCKED = 'smg_unlockedLevel';
const KEY_GODMODE = 'smg_godMode';
const KEY_DEVUNLOCK = 'smg_devUnlocked';

export function getUnlockedLevel() {
    const n = parseInt(localStorage.getItem(KEY_UNLOCKED) || '1', 10);
    return Number.isFinite(n) ? Math.max(1, Math.min(LEVEL_COUNT, n)) : 1;
}

export function setUnlockedLevel(level) {
    const v = Math.max(1, Math.min(LEVEL_COUNT, level));
    localStorage.setItem(KEY_UNLOCKED, String(v));
}

export function resetProgress() {
    localStorage.setItem(KEY_UNLOCKED, '1');
}

export function isGodMode() {
    return localStorage.getItem(KEY_GODMODE) === '1';
}

export function setGodMode(enabled) {
    localStorage.setItem(KEY_GODMODE, enabled ? '1' : '0');
}

export function isDevUnlocked() {
    return localStorage.getItem(KEY_DEVUNLOCK) === '1';
}

export function setDevUnlocked(enabled) {
    localStorage.setItem(KEY_DEVUNLOCK, enabled ? '1' : '0');
}

// --- Endless defaults persistence ---
const KEY_ENDLESS = 'smg_endless_defaults_v1';
const KEY_SETTINGS = 'smg_settings_v1';

export function getEndlessDefaults() {
    try {
        const raw = localStorage.getItem(KEY_ENDLESS);
        if (!raw) return { chaser: false, pig: false, seeker: false, batter: false, mortar: false, difficulty: 'normal', generatorCount: 3 };
        const obj = JSON.parse(raw);
        return {
            chaser: !!obj.chaser,
            pig: !!obj.pig,
            seeker: !!obj.seeker,
            batter: !!obj.batter,
            mortar: !!obj.mortar,
            difficulty: obj.difficulty === 'super' ? 'super' : 'normal',
            generatorCount: obj.generatorCount === 5 ? 5 : 3
        };
    } catch {
        return { chaser: false, pig: false, seeker: false, batter: false, mortar: false, difficulty: 'normal', generatorCount: 3 };
    }
}

export function setEndlessDefaults(cfg) {
    const norm = {
        chaser: !!cfg.chaser,
        pig: !!cfg.pig,
        seeker: !!cfg.seeker,
        batter: !!cfg.batter,
        mortar: !!cfg.mortar,
        difficulty: cfg.difficulty === 'super' ? 'super' : 'normal',
        generatorCount: cfg.generatorCount === 5 ? 5 : 3
    };
    try { localStorage.setItem(KEY_ENDLESS, JSON.stringify(norm)); } catch {}
}

// --- Settings persistence (movement audio, auto-movement) ---
export function getSettings() {
    try {
        const raw = localStorage.getItem(KEY_SETTINGS);
        if (!raw) return { movementAudio: true, autoMovement: true };
        const obj = JSON.parse(raw);
        return {
            movementAudio: obj && obj.movementAudio !== false,
            autoMovement: obj && obj.autoMovement !== false,
        };
    } catch {
        return { movementAudio: true, autoMovement: true };
    }
}

export function setSettings(settings) {
    const s = {
        movementAudio: settings && settings.movementAudio !== false,
        autoMovement: settings && settings.autoMovement !== false,
    };
    try { localStorage.setItem(KEY_SETTINGS, JSON.stringify(s)); } catch {}
}
