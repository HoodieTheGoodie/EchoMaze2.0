// abilities.js - Manage active temporary abilities and their effects during endless mode runs

// Note: Avoid circular imports by not importing gameState directly
// Use window.gameState instead

// Track active ability timers and effects
export const abilityState = {
    // Timed abilities (end after duration)
    enemySlowUntil: 0,           // Timestamp when enemy slow ends
    wallPhaseUntil: 0,           // Timestamp when wall phase ends
    invincibilityUntil: 0,       // Timestamp when invincibility ends
    shieldBoostHits: 0,          // Remaining hits on shield boost
    
    // Static modifiers for current run
    extraLivesActive: 0,         // Number of extra lives gained this run
    staminarReductionActive: false, // If true, jumps cost less stamina
    
    // UI state
    statusEffects: []            // For displaying active effects on screen
};

/**
 * Initialize abilities for a new endless run
 * @param {Array} activeAbilities - Array of ability IDs from endless-progression
 */
export function initializeRunAbilities(activeAbilities = []) {
    // Reset timers
    abilityState.enemySlowUntil = 0;
    abilityState.wallPhaseUntil = 0;
    abilityState.invincibilityUntil = 0;
    abilityState.shieldBoostHits = 0;
    abilityState.extraLivesActive = 0;
    abilityState.staminarReductionActive = false;
    abilityState.statusEffects = [];
    
    // Apply static abilities
    if (activeAbilities.includes('extraLife')) {
        abilityState.extraLivesActive = 1;
    }
    if (activeAbilities.includes('reducedStamina')) {
        abilityState.staminarReductionActive = true;
    }
    if (activeAbilities.includes('shieldDurability') || activeAbilities.includes('shieldBoost')) {
        abilityState.shieldBoostHits = 3;
    }
}

/**
 * Check if player has a specific ability active
 */
export function hasAbility(abilityId) {
    const progression = (typeof window.getEndlessProgression === 'function') ? window.getEndlessProgression() : null;
    const runAbilities = progression?.currentRun?.activeAbilities;
    if (Array.isArray(runAbilities)) return runAbilities.includes(abilityId);
    const gs = window.gameState;
    const fallback = gs && gs.currentRun && Array.isArray(gs.currentRun.activeAbilities) ? gs.currentRun.activeAbilities : [];
    return fallback.includes(abilityId);
}

/**
 * Activate a timed ability
 */
export function activateTimedAbility(abilityId, duration = 30000) {
    const now = Date.now();
    
    switch(abilityId) {
        case 'enemySlow':
            abilityState.enemySlowUntil = now + duration;
            abilityState.statusEffects.push({ id: 'enemySlow', endTime: now + duration, icon: '🐢', label: 'Enemy Slow' });
            break;
        case 'wallPhase':
            abilityState.wallPhaseUntil = now + duration;
            abilityState.statusEffects.push({ id: 'wallPhase', endTime: now + duration, icon: '👻', label: 'Wall Phase' });
            break;
        case 'invincibility':
            abilityState.invincibilityUntil = now + duration;
            abilityState.statusEffects.push({ id: 'invincibility', endTime: now + duration, icon: '✨', label: 'Invincible' });
            break;
    }
}

/**
 * Check if a timed ability is currently active
 */
export function isAbilityActive(abilityId) {
    const now = Date.now();
    
    switch(abilityId) {
        case 'enemySlow':
            return abilityState.enemySlowUntil > now;
        case 'wallPhase':
            return abilityState.wallPhaseUntil > now;
        case 'invincibility':
            return abilityState.invincibilityUntil > now;
        default:
            return false;
    }
}

/**
 * Get remaining duration of a timed ability (in ms)
 */
export function getAbilityDuration(abilityId) {
    const now = Date.now();
    
    switch(abilityId) {
        case 'enemySlow':
            return Math.max(0, abilityState.enemySlowUntil - now);
        case 'wallPhase':
            return Math.max(0, abilityState.wallPhaseUntil - now);
        case 'invincibility':
            return Math.max(0, abilityState.invincibilityUntil - now);
        default:
            return 0;
    }
}

/**
 * Update status effects (remove expired ones)
 */
export function updateStatusEffects() {
    const now = Date.now();
    abilityState.statusEffects = abilityState.statusEffects.filter(
        effect => effect.endTime > now
    );
}

/**
 * Check if player should take damage (accounting for invincibility and shields)
 * Returns: { shouldTakeDamage: boolean, shielded: boolean }
 */
export function checkDamageProtection() {
    // Invincibility provides complete protection
    if (isAbilityActive('invincibility')) {
        return { shouldTakeDamage: false, shielded: true, reason: 'invincibility' };
    }
    
    // Shield boost provides 3 hits of protection
    if (abilityState.shieldBoostHits > 0) {
        abilityState.shieldBoostHits--;
        return { shouldTakeDamage: abilityState.shieldBoostHits <= 0, shielded: true, reason: 'shield', remainingHits: abilityState.shieldBoostHits };
    }
    
    // Normal damage
    return { shouldTakeDamage: true, shielded: false };
}

/**
 * Get stamina multiplier based on abilities
 * Returns 0.5 if reducedStamina is active, otherwise 1.0
 */
export function getStaminaMultiplier() {
    return abilityState.staminarReductionActive ? 0.5 : 1.0;
}

/**
 * Get enemy speed multiplier based on active abilities
 * Returns 0.5 if enemySlow is active, otherwise 1.0
 */
export function getEnemySpeedMultiplier() {
    return isAbilityActive('enemySlow') ? 0.5 : 1.0;
}

/**
 * Check if player can walk through walls
 */
export function canPhaseWalls() {
    return isAbilityActive('wallPhase');
}

/**
 * Get extra lives from this run's abilities
 */
export function getExtraLives() {
    return abilityState.extraLivesActive;
}

/**
 * Reduce extra lives when taking damage
 */
export function consumeExtraLife() {
    if (abilityState.extraLivesActive > 0) {
        abilityState.extraLivesActive--;
        return true;
    }
    return false;
}

/**
 * Get all active ability info for UI display
 */
export function getActiveAbilityInfo() {
    const info = [];
    const now = Date.now();
    
    // Timed abilities
    if (isAbilityActive('enemySlow')) {
        const remaining = Math.ceil((abilityState.enemySlowUntil - now) / 1000);
        info.push({ icon: '🐢', name: 'Enemy Slow', duration: remaining });
    }
    if (isAbilityActive('wallPhase')) {
        const remaining = Math.ceil((abilityState.wallPhaseUntil - now) / 1000);
        info.push({ icon: '👻', name: 'Wall Phase', duration: remaining });
    }
    if (isAbilityActive('invincibility')) {
        const remaining = Math.ceil((abilityState.invincibilityUntil - now) / 1000);
        info.push({ icon: '✨', name: 'Invincible', duration: remaining });
    }
    
    // Static abilities
    if (abilityState.extraLivesActive > 0) {
        info.push({ icon: '❤️', name: 'Extra Lives', value: abilityState.extraLivesActive });
    }
    if (abilityState.staminarReductionActive) {
        info.push({ icon: '⚡', name: 'Stamina Reduction', value: '-50%' });
    }
    if (abilityState.shieldBoostHits > 0) {
        info.push({ icon: '🛡️', name: 'Shield Boost', value: `${abilityState.shieldBoostHits} hits` });
    }
    
    return info;
}

/**
 * Debug: Print current ability state
 */
export function debugAbilityState() {
    console.log('[abilities] Current state:', {
        enemySlowActive: isAbilityActive('enemySlow'),
        wallPhaseActive: isAbilityActive('wallPhase'),
        invincibilityActive: isAbilityActive('invincibility'),
        extraLives: abilityState.extraLivesActive,
        staminarReduction: abilityState.staminarReductionActive,
        shieldHits: abilityState.shieldBoostHits
    });
}
