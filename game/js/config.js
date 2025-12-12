// config.js - Level configs, seeds, and persistence

export const LEVEL_COUNT = 11;

// Get color for current level (blue at level 1 -> red at level 10)
export function getLevelColor(level) {
    // Clamp level to 1-10
    const l = Math.max(1, Math.min(LEVEL_COUNT, level));
    
    // Level 1 = blue (0, 246, 255), Level 10 = red (255, 0, 0)
    const t = (l - 1) / (LEVEL_COUNT - 1); // 0.0 at level 1, 1.0 at level 10
    
    const r = Math.round(0 + t * 255);
    const g = Math.round(246 - t * 246);
    const b = Math.round(255 - t * 255);
    
    return { r, g, b, css: `rgb(${r}, ${g}, ${b})`, rgba: (alpha) => `rgba(${r}, ${g}, ${b}, ${alpha})` };
}

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
    24682468, // 10
    13579246  // 11
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
    // Levels 9-11: include all (Chaser + Pig + Seeker + Batter + Mortar)
    if (level >= 9 && level <= 11) {
        return { ...base, enemyEnabled: true, flyingPig: true, seeker: true, batter: true, mortar: true };
    }
    // Placeholder for levels 4-10 (use base defaults for now)
    return { ...base };
}

// --- Level Intro Tips (with subtle evil narrator hints) ---
export function getLevelTip(level) {
    const tips = {
        1: "Welcome. Fix the generators. Leave. Simple, isn't it?",
        2: "Ah, a Chaser appears. It wanders... until it sees you. Then it *leaps*. How thrilling.",
        3: "Flying Pigs telegraph their dash with a pulse. Predictable creatures... for now.",
        4: "Two enemy types. The maze grows... *crowded*. Stay alert. Or don't. I'll be watching either way.",
        5: "Seekers patrol methodically. When they spot you, they *enrage*. Fast. Relentless. Delightful.",
        6: "Three enemy types. The system is functioning as intended. You're doing so well... keep going.",
        7: "Batters charge when close. Reflect their attack to stagger them. Very clever of you... if you survive.",
        8: "Four threats now. The protocols are... escalating. Don't worry, it's all part of the *design*.",
        9: "Mortars. They fire explosive projectiles. Dodge them. Or embrace the chaos. I'm not here to judge... yet.",
        10: "Final level. The Core awaits. Everything has led to this moment. I wonder... will you escape?",
        11: "You found the secret. This maze is yours to conquer. Show me what you've learned."
    };
    return tips[level] || "The maze shifts. Adapt or fail.";
}

// --- Boss (Level 10) tuning constants ---
export const BOSS_CORE_HP = 1000;
export const BOSS_PHASE_DUR = 20000; // ms
export const BAZOOKA_MAX_AMMO = 10;
export const BAZOOKA_START_AMMO = 10;
export const BAZOOKA_DIRECT_DMG = 120;
export const BAZOOKA_SPLASH_DMG = 40;
export const PIG_MOUNT_TIME = 6000; // ms
export const MORTAR_WARNING_SEC = 2; // seconds
export const MORTAR_EXPLOSION_SIZE = 5; // tiles (5x5)
export const MORTAR_PLAYER_STUN = 5; // seconds
export const EXPLOSION_FREEZE_ENEMY = 10000; // ms
export const MAX_ACTIVE_PIGS = 6;
export const MAX_ACTIVE_SEEKERS = 3;
export const BOSS_AMMO_STATION_COOLDOWN = 30000; // ms

// Persistence keys
const KEY_UNLOCKED = 'smg_unlockedLevel';
const KEY_LEVEL11_UNLOCKED = 'smg_level11Unlocked';
const KEY_TERMINALS_UNLOCKED = 'smg_terminalsUnlocked';
const KEY_TERMINAL_ACCESS = 'smg_terminalAccess';
const KEY_GODMODE = 'smg_godMode';
const KEY_DEVUNLOCK = 'smg_devUnlocked';
const KEY_SKIP_PREBOSS = 'smg_skip_preboss';
const KEY_BAZOOKA_MODE = 'smg_bazookaMode';

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
    localStorage.setItem(KEY_LEVEL11_UNLOCKED, '0');
    localStorage.setItem(KEY_TERMINALS_UNLOCKED, JSON.stringify([]));
    localStorage.setItem(KEY_TERMINAL_ACCESS, JSON.stringify([]));
    // Clear all best times (1-10)
    for (let i = 1; i <= LEVEL_COUNT; i++) {
        try {
            localStorage.removeItem(`smg_bestTime_L${i}`);
        } catch {}
    }
}

// Level 11 unlock persistence
export function isLevel11Unlocked() {
    return localStorage.getItem(KEY_LEVEL11_UNLOCKED) === '1';
}

export function setLevel11Unlocked(enabled) {
    localStorage.setItem(KEY_LEVEL11_UNLOCKED, enabled ? '1' : '0');
}

// Terminal puzzle solves (supports up to 4 "glitch" terminals)
export function getUnlockedTerminals() {
    try {
        const raw = localStorage.getItem(KEY_TERMINALS_UNLOCKED);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

export function unlockTerminal(terminalId) {
    try {
        const unlocked = getUnlockedTerminals();
        if (!unlocked.includes(terminalId)) {
            unlocked.push(terminalId);
            localStorage.setItem(KEY_TERMINALS_UNLOCKED, JSON.stringify(unlocked));
        }
    } catch {}
}

export function isTerminalUnlocked(terminalId) {
    return getUnlockedTerminals().includes(terminalId);
}

export function resetTerminals() {
    try {
        localStorage.setItem(KEY_TERMINALS_UNLOCKED, JSON.stringify([]));
        localStorage.setItem(KEY_TERMINAL_ACCESS, JSON.stringify([]));
    } catch {}
}

// Terminal access gating (enter password from previous puzzle to view next)
export function getTerminalAccess() {
    try {
        const raw = localStorage.getItem(KEY_TERMINAL_ACCESS);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

export function unlockTerminalAccess(id) {
    try {
        const unlocked = getTerminalAccess();
        if (!unlocked.includes(id)) {
            unlocked.push(id);
            localStorage.setItem(KEY_TERMINAL_ACCESS, JSON.stringify(unlocked));
        }
    } catch {}
}

export function hasTerminalAccess(id) {
    return getTerminalAccess().includes(id);
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

// Dev convenience: Skip directly to pre-boss area on Level 10
export function isSkipPreBossEnabled() {
    return localStorage.getItem(KEY_SKIP_PREBOSS) === '1';
}
export function setSkipPreBossEnabled(enabled) {
    localStorage.setItem(KEY_SKIP_PREBOSS, enabled ? '1' : '0');
}

// Dev convenience: 10x boss damage
const KEY_BOSS_DMG_10X = 'smg_boss_dmg_10x';
export function isBossDamage10x() {
    return localStorage.getItem(KEY_BOSS_DMG_10X) === '1';
}
export function setBossDamage10x(enabled) {
    localStorage.setItem(KEY_BOSS_DMG_10X, enabled ? '1' : '0');
}

// --- Endless defaults persistence ---
const KEY_ENDLESS = 'smg_endless_defaults_v1';
const KEY_SETTINGS = 'smg_settings_v1';
const KEY_SECRET_UNLOCK = 'smg_secret_unlocked_v1';

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
        if (!raw) return { movementAudio: true, autoMovement: true, simplifiedUI: true };
        const obj = JSON.parse(raw);
        return {
            movementAudio: obj && obj.movementAudio !== false,
            autoMovement: obj && obj.autoMovement !== false,
            simplifiedUI: true, // force simplified UI as default and only mode
        };
    } catch {
        return { movementAudio: true, autoMovement: true, simplifiedUI: true };
    }
}

export function setSettings(settings) {
    const s = {
        movementAudio: settings && settings.movementAudio !== false,
        autoMovement: settings && settings.autoMovement !== false,
        simplifiedUI: true, // locked on
    };
    try { localStorage.setItem(KEY_SETTINGS, JSON.stringify(s)); } catch {}
}

// --- Secret unlock (after beating the game) ---
export function isSecretUnlocked() {
    try { return localStorage.getItem(KEY_SECRET_UNLOCK) === '1'; } catch { return false; }
}
export function setSecretUnlocked(enabled) {
    try { localStorage.setItem(KEY_SECRET_UNLOCK, enabled ? '1' : '0'); } catch {}
}

// --- Bazooka Mode (secret cheat) ---
export function isBazookaMode() {
    try { return localStorage.getItem(KEY_BAZOOKA_MODE) === '1'; } catch { return false; }
}
export function setBazookaMode(enabled) {
    try { localStorage.setItem(KEY_BAZOOKA_MODE, enabled ? '1' : '0'); } catch {}
}
