// skins.js - Player and enemy skin system

const SKINS_KEY = 'smg_skins';
const EQUIPPED_SKIN_KEY = 'smg_equippedSkin';

// Skin color palettes and visual effects
// Ordered by difficulty to unlock - easiest to hardest!
export const SKINS = [
    // === TIER 1: START (Always Unlocked) ===
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
    
    // === TIER 2: EARLY GAME (Complete Level 5) ===
    { 
        id: 'rookie', 
        name: 'Rookie', 
        desc: 'Green trainee - pulsing with potential', 
        unlocked: false, 
        unlockMethod: 'Complete Level 5',
        color: { r: 34, g: 139, b: 34 }, 
        sprintColor: { r: 50, g: 205, b: 50 },
        glow: true,
        particle: 'spark',
        pulseEffect: true
    },
    
    // === TIER 3: MID GAME (Defeat Core) ===
    { 
        id: 'veteran', 
        name: 'Veteran', 
        desc: 'Battle-hardened crimson with aura', 
        unlocked: false, 
        unlockMethod: 'Defeat the Core',
        color: { r: 139, g: 0, b: 0 }, 
        sprintColor: { r: 255, g: 0, b: 0 },
        glow: true,
        particle: 'explosion',
        metallicEffect: true
    },
    
    // === TIER 4: SKILLFUL (Reflect 10 Projectiles) ===
    { 
        id: 'defender', 
        name: 'Defender', 
        desc: 'Shield master - shimmering steel', 
        unlocked: false, 
        unlockMethod: 'Reflect 10 projectiles',
        color: { r: 192, g: 192, b: 192 }, 
        sprintColor: { r: 211, g: 211, b: 211 },
        glow: true,
        particle: 'spark',
        metallicEffect: true,
        ability: 'bonus_trap',
        abilityDesc: '+1 trap capacity for each generator completed'
    },
    
    // === TIER 5: GAME COMPLETION (Complete the Game) ===
    { 
        id: 'engineer', 
        name: 'Engineer', 
        desc: 'Golden specialist - radiating brilliance', 
        unlocked: false, 
        unlockMethod: 'Complete the game',
        color: { r: 184, g: 134, b: 11 }, 
        sprintColor: { r: 255, g: 215, b: 0 },
        glow: true,
        particle: 'spark',
        metallicEffect: true,
        pulseEffect: true
    },
    
    // === TIER 6: SPEED CHALLENGE (Complete Level Under 60s) ===
    { 
        id: 'blitz', 
        name: 'Blitz', 
        desc: 'Lightning-fast yellow streak - electrified', 
        unlocked: false, 
        unlockMethod: 'Complete any level under 60s',
        color: { r: 255, g: 255, b: 0 }, 
        sprintColor: { r: 255, g: 215, b: 0 },
        glow: true,
        particle: 'wallHit'
    },
    
    // === TIER 7: PERFECT SKILLS (10 Perfect Skill Checks) ===
    { 
        id: 'technician', 
        name: 'Technician', 
        desc: 'Master mechanic - glowing circuits', 
        unlocked: false, 
        unlockMethod: '10 perfect skill checks',
        color: { r: 30, g: 144, b: 255 }, 
        sprintColor: { r: 0, g: 191, b: 255 },
        glow: true,
        particle: 'generator',
        pulseEffect: true,
        ability: 'fast_repair',
        abilityDesc: 'Only need 2 skill checks to complete generators (instead of 3)'
    },
    
    // === TIER 8: ENDING ROUTES (Reach Good/Bad/Virus Ending) ===
    { 
        id: 'shadow', 
        name: 'Shadow', 
        desc: 'Lurker in darkness - ethereal mist', 
        unlocked: false, 
        unlockMethod: 'Reach the Bad Ending',
        color: { r: 75, g: 0, b: 130 }, 
        sprintColor: { r: 138, g: 43, b: 226 },
        glow: true,
        particle: 'damage',
        pulseEffect: true
    },
    { 
        id: 'guardian', 
        name: 'Guardian', 
        desc: 'Protector - radiant celestial light', 
        unlocked: false, 
        unlockMethod: 'Reach the Good Ending',
        color: { r: 240, g: 248, b: 255 }, 
        sprintColor: { r: 255, g: 250, b: 205 },
        glow: true,
        particle: 'generator',
        pulseEffect: true
    },
    { 
        id: 'corrupted', 
        name: 'Corrupted', 
        desc: 'Virus-infected - glitching reality', 
        unlocked: false, 
        unlockMethod: 'Reach the Virus Ending',
        color: { r: 0, g: 100, b: 0 }, 
        sprintColor: { r: 0, g: 255, b: 0 },
        glow: true,
        particle: 'wallHit',
        glitchEffect: true
    },
    
    // === TIER 9: PERFECT RUN (Complete Game Without Dying) ===
    { 
        id: 'ghost', 
        name: 'Ghost', 
        desc: 'Untouchable phantom - translucent spectral', 
        unlocked: false, 
        unlockMethod: 'Complete game without dying',
        color: { r: 255, g: 255, b: 255 }, 
        sprintColor: { r: 240, g: 255, b: 255 },
        glow: true,
        particle: 'generator',
        opacity: 0.7,
        pulseEffect: true,
        ability: 'phase_through',
        abilityDesc: '50% chance to phase through enemy damage'
    },
    
    // === TIER 10: SPEED RUN MASTER (Complete Game Under 25 Minutes) ===
    { 
        id: 'chrono', 
        name: 'Chrono', 
        desc: 'Master of time - warping reality', 
        unlocked: false, 
        unlockMethod: 'Complete game under 25 minutes',
        color: { r: 0, g: 191, b: 255 }, 
        sprintColor: { r: 64, g: 224, b: 208 },
        glow: true,
        particle: 'generator',
        pulseEffect: true,
        ability: 'stamina_regen',
        abilityDesc: 'Stamina regenerates 50% faster'
    },
    
    // === TIER 11: ENDLESS MODE (Wave 30) ===
    { 
        id: 'infinite', 
        name: 'Infinite', 
        desc: 'Endless survivor - shifting rainbow reality', 
        unlocked: false, 
        unlockMethod: 'Reach wave 30 in Endless',
        color: { r: 255, g: 0, b: 255 }, 
        sprintColor: { r: 0, g: 255, b: 255 },
        glow: true,
        particle: 'generator',
        rainbowEffect: true,
        pulseEffect: true,
        ability: 'extra_life',
        abilityDesc: 'Start each level with +1 extra life'
    },
    
    // === TIER 12: SECRETS (Secret Achievements) ===
    { 
        id: 'glitch', 
        name: 'Glitch', 
        desc: 'Reality fracture - unstable magenta', 
        unlocked: false, 
        unlockMethod: 'Secret Achievement',
        color: { r: 255, g: 0, b: 255 }, 
        sprintColor: { r: 255, g: 20, b: 147 },
        glow: true,
        particle: 'wallHit',
        glitchEffect: true,
        pulseEffect: true,
        ability: 'glitch_teleport',
        abilityDesc: 'Randomly teleport back 2-4 tiles when hit, gain 7s invincibility'
    },
    { 
        id: 'phoenix', 
        name: 'Phoenix', 
        desc: 'Rise from ashes - rebirth flame', 
        unlocked: false, 
        unlockMethod: 'Die 100 times total',
        color: { r: 255, g: 69, b: 0 }, 
        sprintColor: { r: 255, g: 140, b: 0 },
        glow: true,
        particle: 'explosion',
        pulseEffect: true,
        ability: 'phoenix_shield',
        abilityDesc: 'On reaching 1 HP: gain orange shield. First hit breaks shield, +1 life, 7s invincibility.'
    },
    { 
        id: 'time_lord', 
        name: 'Time Lord', 
        desc: 'Master of causality - time manipulation', 
        unlocked: false, 
        unlockMethod: 'Complete game in under 20 minutes',
        color: { r: 138, g: 43, b: 226 }, 
        sprintColor: { r: 186, g: 85, b: 211 },
        glow: true,
        particle: 'generator',
        pulseEffect: true,
        ability: 'time_slow',
        abilityDesc: 'Enemies move 25% slower'
    },
    
    // === TIER 13: ULTIMATE SECRET (Void Code) ===
    { 
        id: 'void', 
        name: 'Void', 
        desc: 'Emptiness incarnate - consuming all light', 
        unlocked: false, 
        unlockMethod: 'Enter secret code',
        color: { r: 0, g: 0, b: 0 }, 
        sprintColor: { r: 25, g: 25, b: 25 },
        glow: true,
        particle: 'damage',
        voidEffect: true,
        pulseEffect: true,
        ability: 'projectile_absorb',
        abilityDesc: 'Absorb all projectiles - they heal you instead of damaging'
    },
    
    // === TIER 14: 100% COMPLETION - THE ULTIMATE SKIN ===
    { 
        id: 'hundred_percent', 
        name: '100%MAN', 
        desc: 'PERFECTION ACHIEVED - Reality bends to your will', 
        unlocked: false, 
        unlockMethod: 'Unlock all achievements (100% completion)',
        color: { r: 255, g: 215, b: 0 }, 
        sprintColor: { r: 255, g: 255, b: 255 },
        glow: true,
        particle: 'generator',
        rainbowEffect: true,
        pulseEffect: true,
        metallicEffect: true,
        voidEffect: false,
        ability: 'god_mode',
        abilityDesc: '3 lives + projectile immunity + double speed + instant generators + no stamina cost'
    },
];

// Secret codes for skin unlocks and RGB achievements
const SECRET_CODES = {
    'ECHO': 'void',
    'MAZE': 'glitch',
    'SYSTEM': 'corrupted',
    'ECHOMAZE': 'BAZOOKA_MODE',
    'UPUPDOWNDOWNLEFTRIGHTLEFTRIGHTABSTART': 'UNLOCK_ALL_LEVELS',
    
    // RGB ACHIEVEMENT CODES - EDIT TO ADD ACTUAL CODES
    // First 10 codes (100% completion winners) - LIMITED TO 10 TOTAL
    // Format: 'UNIQUE_CODE_HERE': 'the_first_10'
    // These must be unique and will be locked after 10 are redeemed
    // Example:
    // 'FIRST10_WINNER001': 'the_first_10',
    // 'FIRST10_WINNER002': 'the_first_10',
    // ... (up to 10 total)
    
    // World Record codes - UNLIMITED
    // Format: 'WR_CODE_HERE': 'world_record'
    // Unlimited codes can be generated and distributed
    // Example:
    // 'WORLDRECORD_PLAYER001': 'world_record',
    // 'WORLDRECORD_PLAYER002': 'world_record',
    // ... (as many as needed)
};

// Get all skins data
export function getSkins() {
    try {
        const raw = localStorage.getItem(SKINS_KEY);
        let data = [];
        
        if (!raw) {
            // Initialize with default skin unlocked
            data = SKINS.map(s => ({ 
                id: s.id, 
                unlocked: s.id === 'default' 
            }));
        } else {
            data = JSON.parse(raw);
            if (!Array.isArray(data)) {
                data = [];
            }
        }
        
        // Ensure all skins from SKINS array are present (handles new additions)
        const existingIds = new Set(data.map(s => s.id));
        SKINS.forEach(skinDef => {
            if (!existingIds.has(skinDef.id)) {
                data.push({ id: skinDef.id, unlocked: skinDef.id === 'default' });
            }
        });
        
        // Save updated data if new skins were added
        if (data.length !== existingIds.size) {
            localStorage.setItem(SKINS_KEY, JSON.stringify(data));
        }
        
        return data;
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
export async function redeemCode(code) {
    const upperCode = code.toUpperCase().trim();
    const target = SECRET_CODES[upperCode];
    
    if (!target) {
        return { success: false, message: 'Invalid code' };
    }
    
    // Special handling for UNLOCK_ALL_LEVELS (Konami code)
    if (target === 'UNLOCK_ALL_LEVELS') {
        try {
            const configMod = await import('./config.js');
            // Unlock all levels 1-11
            configMod.setUnlockedLevel(11);
            configMod.setLevel11Unlocked(true);
            // Hide game container to prevent custom level showing in background
            const gameContainer = document.getElementById('game-container');
            if (gameContainer) gameContainer.style.display = 'none';
            const mainMenu = document.getElementById('mainMenu');
            // Keep menu centered: must be flex, not block
            if (mainMenu) mainMenu.style.display = 'flex';
            // Refresh menu UI immediately
            if (typeof window !== 'undefined' && window.buildMenu) {
                try { window.buildMenu(); } catch {}
            }
            if (typeof window !== 'undefined' && window.__refreshLevel11UI) {
                try { window.__refreshLevel11UI(); } catch {}
            }
        } catch (e) {
            console.warn('[skins] Failed to unlock all levels:', e);
            return { success: false, message: 'Error unlocking levels' };
        }
        
        return { 
            success: true, 
            message: '🎮 ALL LEVELS UNLOCKED!',
            skinId: null
        };
    }
    
    // Special handling for BAZOOKA_MODE unlock
    if (target === 'BAZOOKA_MODE') {
        try {
            const configMod = await import('./config.js');
            if (configMod.setBazookaModeUnlocked) {
                configMod.setBazookaModeUnlocked(true);
            }
            if (configMod.setBazookaMode) {
                configMod.setBazookaMode(true); // auto-enable once unlocked
            }
            if (typeof window !== 'undefined' && window.__refreshEnergyBlasterUI) {
                try { window.__refreshEnergyBlasterUI(); } catch {}
            }
        } catch (e) {
            console.warn('[skins] Failed to import config for bazooka mode:', e);
        }
        
        try {
            const achievementsMod = await import('./achievements.js');
            if (achievementsMod.checkAchievements) {
                achievementsMod.checkAchievements('secret_found', { secretId: 'bazooka_mode_unlock' });
            }
        } catch (e) {
            console.warn('[skins] Failed to unlock bazooka secret achievement:', e);
        }
        
        return { 
            success: true, 
            message: '🚀 ENERGY BLASTER MODE UNLOCKED! Check Settings to enable it.',
            skinId: null,
            bazookaModeUnlocked: true
        };
    }
    
    // Special handling for "The First 10" limited achievement
    if (target === 'the_first_10') {
        try {
            const configMod = await import('./config.js');
            
            // Check if already at limit BEFORE unlocking
            if (configMod.isFirst10Locked && configMod.isFirst10Locked()) {
                return { success: false, message: 'The First 10 achievement has been locked - all 10 codes have been redeemed!' };
            }
            
            // Increment the counter
            if (configMod.incrementFirst10CodesUsed) {
                configMod.incrementFirst10CodesUsed();
            }
        } catch (e) {
            console.warn('[skins] Failed to check first 10 limit:', e);
            return { success: false, message: 'Error processing code' };
        }
        
        try {
            const achievementsMod = await import('./achievements.js');
            if (achievementsMod.unlockAchievement) {
                achievementsMod.unlockAchievement(target);
            }
        } catch (e) {
            console.warn('[skins] Failed to unlock the_first_10 achievement:', e);
        }
        
        return {
            success: true,
            message: '◆ THE FIRST 10 ◆\nCongratulations! You are among the first 10 to achieve 100% completion!',
            isRGBAchievement: true,
            achievementId: target
        };
    }
    
    // Special handling for World Record (unlimited) RGB achievement
    if (target === 'world_record') {
        try {
            const achievementsMod = await import('./achievements.js');
            if (achievementsMod.unlockAchievement) {
                achievementsMod.unlockAchievement(target);
            }
        } catch (e) {
            console.warn('[skins] Failed to unlock world_record achievement:', e);
        }
        
        return {
            success: true,
            message: '◆ WORLD RECORD ◆\nYou hold a verified world record speedrun!',
            isRGBAchievement: true,
            achievementId: target
        };
    }
    
    // Regular skin unlock
    if (isSkinUnlocked(target)) {
        return { success: false, message: 'Code already redeemed' };
    }
    
    unlockSkin(target, `Code: ${upperCode}`);
    
    try {
        const achievementsMod = await import('./achievements.js');
        if (achievementsMod.checkAchievements) {
            achievementsMod.checkAchievements('secret_found', { secretId: 'code_alpha' });
        }
    } catch (e) {
        console.warn('[skins] Failed to unlock code redemption achievement:', e);
    }
    
    const skin = getSkinById(target);
    return { 
        success: true, 
        message: `Unlocked: ${skin.name}!`,
        skinId: target,
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

// Get current skin's ability
export function getSkinAbility() {
    const skin = getCurrentSkin();
    return skin.ability || null;
}

// Check if current skin has a specific ability
export function hasSkinAbility(abilityName) {
    return getSkinAbility() === abilityName;
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
        voidEffect: skin.voidEffect || false,
        ability: skin.ability || null,
        abilityDesc: skin.abilityDesc || null
    };
}

// Initialize skins system
export function initSkins() {
    // Pre-load skins data to initialize system
    getSkins();
    getEquippedSkin();
    console.log('[skins] Skins system initialized');
}
