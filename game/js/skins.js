// skins.js - Player and enemy skin system

const SKINS_KEY = 'smg_skins';
const EQUIPPED_SKIN_KEY = 'smg_equippedSkin';

// Skin color palettes and visual effects
export const SKINS = [
    // === Default ===
    { 
        id: 'default', 
        name: 'Default', 
        desc: 'Classic blue sphere', 
        unlocked: true, 
        color: { r: 65, g: 105, b: 225 }, 
        sprintColor: { r: 0, g: 255, b: 255 },
        glow: false,
        particle: null
    },
    
    // === Progression Unlocks ===
    { 
        id: 'rookie', 
        name: 'Rookie', 
        desc: 'Green trainee colors', 
        unlocked: false, 
        unlockMethod: 'Complete Level 5',
        color: { r: 34, g: 139, b: 34 }, 
        sprintColor: { r: 50, g: 205, b: 50 },
        glow: false,
        particle: null
    },
    { 
        id: 'veteran', 
        name: 'Veteran', 
        desc: 'Battle-hardened crimson', 
        unlocked: false, 
        unlockMethod: 'Defeat the Core',
        color: { r: 139, g: 0, b: 0 }, 
        sprintColor: { r: 255, g: 0, b: 0 },
        glow: false,
        particle: null
    },
    { 
        id: 'engineer', 
        name: 'Engineer', 
        desc: 'Golden repair specialist', 
        unlocked: false, 
        unlockMethod: 'Complete the game',
        color: { r: 184, g: 134, b: 11 }, 
        sprintColor: { r: 255, g: 215, b: 0 },
        glow: true,
        particle: null
    },
    
    // === Ending Unlocks ===
    { 
        id: 'guardian', 
        name: 'Guardian', 
        desc: 'Protector of hope - radiant white', 
        unlocked: false, 
        unlockMethod: 'Reach the Good Ending',
        color: { r: 240, g: 248, b: 255 }, 
        sprintColor: { r: 255, g: 250, b: 205 },
        glow: true,
        particle: 'sparkle'
    },
    { 
        id: 'shadow', 
        name: 'Shadow', 
        desc: 'Lurker in darkness - deep purple', 
        unlocked: false, 
        unlockMethod: 'Reach the Bad Ending',
        color: { r: 75, g: 0, b: 130 }, 
        sprintColor: { r: 138, g: 43, b: 226 },
        glow: false,
        particle: 'smoke'
    },
    { 
        id: 'corrupted', 
        name: 'Corrupted', 
        desc: 'Infected by the virus - glitching green', 
        unlocked: false, 
        unlockMethod: 'Reach the Virus Ending',
        color: { r: 0, g: 100, b: 0 }, 
        sprintColor: { r: 0, g: 255, b: 0 },
        glow: true,
        particle: 'glitch',
        glitchEffect: true
    },
    
    // === Speed Run Unlocks ===
    { 
        id: 'blitz', 
        name: 'Blitz', 
        desc: 'Lightning-fast yellow streak', 
        unlocked: false, 
        unlockMethod: 'Complete any level under 60s',
        color: { r: 255, g: 255, b: 0 }, 
        sprintColor: { r: 255, g: 215, b: 0 },
        glow: false,
        particle: 'lightning'
    },
    { 
        id: 'chrono', 
        name: 'Chrono', 
        desc: 'Master of time - cyan pulse', 
        unlocked: false, 
        unlockMethod: 'Complete game under 25 minutes',
        color: { r: 0, g: 191, b: 255 }, 
        sprintColor: { r: 64, g: 224, b: 208 },
        glow: true,
        particle: 'clock',
        pulseEffect: true
    },
    
    // === Challenge Unlocks ===
    { 
        id: 'minimal', 
        name: 'Minimal', 
        desc: 'Stripped down - gray silhouette', 
        unlocked: false, 
        unlockMethod: 'Complete 3 levels without abilities',
        color: { r: 128, g: 128, b: 128 }, 
        sprintColor: { r: 169, g: 169, b: 169 },
        glow: false,
        particle: null
    },
    { 
        id: 'ghost', 
        name: 'Ghost', 
        desc: 'Untouchable phantom - translucent white', 
        unlocked: false, 
        unlockMethod: 'Complete game without dying',
        color: { r: 255, g: 255, b: 255 }, 
        sprintColor: { r: 240, g: 255, b: 255 },
        glow: true,
        particle: 'spirit',
        opacity: 0.7
    },
    { 
        id: 'defender', 
        name: 'Defender', 
        desc: 'Shield master - fortified steel', 
        unlocked: false, 
        unlockMethod: 'Reflect 10 projectiles',
        color: { r: 192, g: 192, b: 192 }, 
        sprintColor: { r: 211, g: 211, b: 211 },
        glow: false,
        particle: null,
        metallicEffect: true
    },
    
    // === Boss Unlocks ===
    { 
        id: 'marksman', 
        name: 'Marksman', 
        desc: 'One-clip wonder - orange blaze', 
        unlocked: false, 
        unlockMethod: 'Secret Achievement',
        color: { r: 255, g: 140, b: 0 }, 
        sprintColor: { r: 255, g: 165, b: 0 },
        glow: false,
        particle: 'fire'
    },
    
    // === Endless Unlocks ===
    { 
        id: 'infinite', 
        name: 'Infinite', 
        desc: 'Endless survivor - shifting rainbow', 
        unlocked: false, 
        unlockMethod: 'Reach wave 30 in Endless',
        color: { r: 255, g: 0, b: 255 }, 
        sprintColor: { r: 0, g: 255, b: 255 },
        glow: true,
        particle: 'rainbow',
        rainbowEffect: true
    },
    
    // === Skill Unlocks ===
    { 
        id: 'technician', 
        name: 'Technician', 
        desc: 'Master mechanic - electric blue', 
        unlocked: false, 
        unlockMethod: '10 perfect skill checks',
        color: { r: 30, g: 144, b: 255 }, 
        sprintColor: { r: 0, g: 191, b: 255 },
        glow: true,
        particle: 'spark'
    },
    
    // === Secret Unlocks ===
    { 
        id: 'glitch', 
        name: 'Glitch', 
        desc: 'Reality fracture - unstable magenta', 
        unlocked: false, 
        unlockMethod: 'Secret Achievement',
        color: { r: 255, g: 0, b: 255 }, 
        sprintColor: { r: 255, g: 20, b: 147 },
        glow: true,
        particle: 'glitch',
        glitchEffect: true
    },
    { 
        id: 'void', 
        name: 'Void', 
        desc: 'Emptiness incarnate - pure black', 
        unlocked: false, 
        unlockMethod: 'Enter secret code',
        color: { r: 0, g: 0, b: 0 }, 
        sprintColor: { r: 25, g: 25, b: 25 },
        glow: false,
        particle: 'void',
        voidEffect: true
    },
];

// Secret codes for skin unlocks
const SECRET_CODES = {
    'ECHO': 'void',
    'MAZE': 'glitch',
    'SYSTEM': 'corrupted'
};

// Get all skins data
export function getSkins() {
    try {
        const raw = localStorage.getItem(SKINS_KEY);
        if (!raw) {
            // Initialize with default skin unlocked
            const initial = SKINS.map(s => ({ 
                id: s.id, 
                unlocked: s.id === 'default' 
            }));
            localStorage.setItem(SKINS_KEY, JSON.stringify(initial));
            return initial;
        }
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch {
        return SKINS.map(s => ({ id: s.id, unlocked: s.id === 'default' }));
    }
}

// Save skins data
function saveSkins(skins) {
    try {
        localStorage.setItem(SKINS_KEY, JSON.stringify(skins));
    } catch (e) {
        console.warn('[skins] Failed to save:', e);
    }
}

// Unlock a skin
export function unlockSkin(skinId, reason = '') {
    const skins = getSkins();
    const skin = skins.find(s => s.id === skinId);
    
    if (!skin) {
        console.warn('[skins] Unknown skin:', skinId);
        return false;
    }
    
    if (skin.unlocked) {
        return false; // Already unlocked
    }
    
    skin.unlocked = true;
    saveSkins(skins);
    
    const skinDef = SKINS.find(s => s.id === skinId);
    console.log('[skins] Unlocked:', skinDef?.name || skinId, reason ? `(${reason})` : '');
    
    // Show notification
    import('./ui-notifications.js').then(mod => {
        if (mod.showSkinUnlocked) {
            mod.showSkinUnlocked(skinDef);
        }
    }).catch(() => {});
    
    return true;
}

// Check if a skin is unlocked
export function isSkinUnlocked(skinId) {
    const skins = getSkins();
    const skin = skins.find(s => s.id === skinId);
    return skin ? skin.unlocked : false;
}

// Get equipped skin
export function getEquippedSkin() {
    try {
        const skinId = localStorage.getItem(EQUIPPED_SKIN_KEY);
        if (!skinId || !isSkinUnlocked(skinId)) {
            return 'default';
        }
        return skinId;
    } catch {
        return 'default';
    }
}

// Equip a skin
export function equipSkin(skinId) {
    if (!isSkinUnlocked(skinId)) {
        console.warn('[skins] Cannot equip locked skin:', skinId);
        return false;
    }
    
    try {
        localStorage.setItem(EQUIPPED_SKIN_KEY, skinId);
        console.log('[skins] Equipped:', skinId);
        return true;
    } catch (e) {
        console.warn('[skins] Failed to equip:', e);
        return false;
    }
}

// Get skin definition by ID
export function getSkinById(skinId) {
    return SKINS.find(s => s.id === skinId) || SKINS[0];
}

// Get current equipped skin definition
export function getCurrentSkin() {
    return getSkinById(getEquippedSkin());
}

// Try to redeem a secret code
export function redeemCode(code) {
    const upperCode = code.toUpperCase().trim();
    const skinId = SECRET_CODES[upperCode];
    
    if (!skinId) {
        return { success: false, message: 'Invalid code' };
    }
    
    if (isSkinUnlocked(skinId)) {
        return { success: false, message: 'Code already redeemed' };
    }
    
    unlockSkin(skinId, `Code: ${upperCode}`);
    
    // Unlock secret achievement for code redemption
    import('./achievements.js').then(mod => {
        if (mod.checkAchievements) {
            mod.checkAchievements('secret_found', { secretId: 'code_alpha' });
        }
    }).catch(() => {});
    
    const skin = getSkinById(skinId);
    return { 
        success: true, 
        message: `Unlocked: ${skin.name}!`,
        skinId,
        skin
    };
}

// Dev: Unlock all skins
export function unlockAllSkins() {
    const skins = getSkins();
    skins.forEach(s => s.unlocked = true);
    saveSkins(skins);
    console.log('[skins] All skins unlocked (dev)');
}

// Dev: Reset skins
export function resetSkins() {
    try {
        localStorage.removeItem(SKINS_KEY);
        localStorage.removeItem(EQUIPPED_SKIN_KEY);
        console.log('[skins] All skins reset');
    } catch (e) {
        console.warn('[skins] Failed to reset:', e);
    }
}

// Get player visual properties based on equipped skin
export function getPlayerVisuals() {
    const skin = getCurrentSkin();
    return {
        color: skin.color,
        sprintColor: skin.sprintColor,
        glow: skin.glow || false,
        opacity: skin.opacity || 1.0,
        particle: skin.particle || null,
        glitchEffect: skin.glitchEffect || false,
        pulseEffect: skin.pulseEffect || false,
        rainbowEffect: skin.rainbowEffect || false,
        metallicEffect: skin.metallicEffect || false,
        voidEffect: skin.voidEffect || false
    };
}

// Initialize skins system
export function initSkins() {
    // Pre-load skins data to initialize system
    getSkins();
    getEquippedSkin();
    console.log('[skins] Skins system initialized');
}
