// ui-panels.js - UI logic for Achievements and Skins panels

import { ACHIEVEMENTS, getUnlockedAchievements, getAchievementProgress } from './achievements.js';
import { SKINS, getSkins, getEquippedSkin, equipSkin, redeemCode, isSkinUnlocked } from './skins.js';
import { isGodMode } from './config.js';

// Open achievements panel
export function openAchievementsPanel() {
    const overlay = document.getElementById('achievementsOverlay');
    if (!overlay) return;
    
    renderAchievements();
    overlay.style.display = 'flex';
}

// Close achievements panel
export function closeAchievementsPanel() {
    const overlay = document.getElementById('achievementsOverlay');
    if (overlay) overlay.style.display = 'none';
}

// Render achievements list
function renderAchievements() {
    const container = document.getElementById('achievementsList');
    if (!container) return;
    
    const unlocked = getUnlockedAchievements();
    const unlockedIds = new Set(unlocked.map(a => a.id));
    const devMode = isGodMode(); // Dev can see all achievements
    
    container.innerHTML = '';
    
    ACHIEVEMENTS.forEach(achievement => {
        const isUnlocked = unlockedIds.has(achievement.id);
        const isSecret = achievement.secret && !isUnlocked;
        
        // Hide secret achievements unless unlocked or in dev mode
        if (isSecret && !devMode) {
            const card = createSecretAchievementCard();
            container.appendChild(card);
            return;
        }
        
        const card = createAchievementCard(achievement, isUnlocked, devMode);
        container.appendChild(card);
    });
}

// Create achievement card
function createAchievementCard(achievement, isUnlocked, devMode) {
    const card = document.createElement('div');
    
    // Special RGB styling for elite achievements
    let cardBackground, cardBorder, cardGlow;
    if (achievement.isRGB && isUnlocked) {
        // Rainbow gradient background
        cardBackground = 'linear-gradient(135deg, rgba(255, 0, 0, 0.1), rgba(255, 127, 0, 0.1), rgba(0, 255, 0, 0.1), rgba(0, 0, 255, 0.1), rgba(75, 0, 130, 0.1), rgba(148, 0, 211, 0.1))';
        cardBorder = '2px solid transparent';
        cardGlow = '0 0 30px rgba(255, 0, 255, 0.6), 0 0 60px rgba(0, 255, 255, 0.3)';
    } else {
        cardBackground = isUnlocked ? 'linear-gradient(135deg, rgba(0, 246, 255, 0.15), rgba(0, 246, 255, 0.05))' : 'rgba(20, 20, 30, 0.5)';
        cardBorder = `2px solid ${isUnlocked ? getTierColor(achievement.tier) : 'rgba(100, 100, 100, 0.4)'}`;
        cardGlow = isUnlocked ? `0 0 20px ${getTierGlow(achievement.tier)}` : '0 0 10px rgba(0,0,0,0.3)';
    }
    
    card.style.cssText = `
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 14px;
        margin-bottom: 10px;
        background: ${cardBackground};
        border: ${cardBorder};
        border-radius: 10px;
        box-shadow: ${cardGlow};
        opacity: ${isUnlocked ? '1' : '0.6'};
        position: relative;
    `;
    
    // Add rainbow animation style for RGB achievements
    if (achievement.isRGB && isUnlocked) {
        const style = document.createElement('style');
        const keyframes = `
            @keyframes rgb-shift {
                0% { border-color: #ff0000; }
                16% { border-color: #ff7f00; }
                33% { border-color: #00ff00; }
                50% { border-color: #0000ff; }
                66% { border-color: #4b0082; }
                83% { border-color: #9400d3; }
                100% { border-color: #ff0000; }
            }
        `;
        if (!document.querySelector('style[data-rgb-anim]')) {
            style.setAttribute('data-rgb-anim', 'true');
            style.textContent = keyframes;
            document.head.appendChild(style);
        }
        card.style.animation = 'rgb-shift 3s infinite';
        card.style.borderColor = '#ff0000';
    }
    
    // Icon
    const icon = document.createElement('div');
    icon.style.cssText = `
        flex-shrink: 0;
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.5rem;
        border-radius: 50%;
        background: ${isUnlocked ? `radial-gradient(circle, ${getTierColor(achievement.tier)}, transparent)` : 'rgba(50, 50, 50, 0.3)'};
        border: 2px solid ${isUnlocked ? getTierColor(achievement.tier) : 'rgba(100, 100, 100, 0.4)'};
    `;
    icon.textContent = isUnlocked ? '🏆' : '🔒';
    card.appendChild(icon);
    
    // Text content
    const textContainer = document.createElement('div');
    textContainer.style.cssText = 'flex: 1; color: white;';
    
    const title = document.createElement('div');
    let titleColor = isUnlocked ? '#fff' : '#aaa';
    let titleStyle = '';
    // RGB rainbow text effect for elite achievements
    if (achievement.isRGB && isUnlocked) {
        titleStyle = 'background: linear-gradient(90deg, #ff0000, #ff7f00, #00ff00, #0000ff, #4b0082, #9400d3, #ff0000); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;';
    }
    title.style.cssText = `
        font-size: 1.1rem;
        font-weight: bold;
        color: ${titleColor};
        margin-bottom: 4px;
        ${titleStyle}
    `;
    title.textContent = achievement.name;
    textContainer.appendChild(title);
    
    const desc = document.createElement('div');
    desc.style.cssText = `
        font-size: 0.9rem;
        color: ${isUnlocked ? '#ccc' : '#888'};
        margin-bottom: 4px;
    `;
    desc.textContent = achievement.desc;
    textContainer.appendChild(desc);
    
    // Dev mode: Show achievement info (unlock method and reward)
    if (window.__showAchievementInfo) {
        const unlockInfo = document.createElement('div');
        unlockInfo.style.cssText = `
            font-size: 0.8rem;
            color: #00d9ff;
            margin-top: 6px;
            padding: 6px;
            background: rgba(0, 217, 255, 0.1);
            border-radius: 4px;
            border-left: 3px solid #00d9ff;
        `;
        
        let infoText = '';
        if (achievement.secret) {
            infoText = '🔐 SECRET ACHIEVEMENT';
        }
        if (achievement.unlockSkin) {
            infoText += (infoText ? ' • ' : '') + `🎨 Unlocks: ${achievement.unlockSkin} skin`;
        }
        // Show dev description if available
        if (achievement.devDesc) {
            infoText += (infoText ? '<br>' : '') + achievement.devDesc;
        }
        
        if (infoText) {
            unlockInfo.innerHTML = infoText;
            textContainer.appendChild(unlockInfo);
        }
    }
    
    // Progress bar (if applicable)
    const progress = getAchievementProgress(achievement.id);
    if (progress && !isUnlocked) {
        const progressBar = document.createElement('div');
        progressBar.style.cssText = `
            width: 100%;
            height: 8px;
            background: rgba(50, 50, 50, 0.5);
            border-radius: 4px;
            overflow: hidden;
            margin-top: 6px;
        `;
        
        const progressFill = document.createElement('div');
        const percent = Math.min(100, (progress.current / progress.target) * 100);
        progressFill.style.cssText = `
            height: 100%;
            width: ${percent}%;
            background: linear-gradient(90deg, #00f6ff, #61dafb);
            transition: width 0.3s ease;
        `;
        progressBar.appendChild(progressFill);
        
        const progressText = document.createElement('div');
        progressText.style.cssText = `
            font-size: 0.8rem;
            color: #aaa;
            margin-top: 4px;
        `;
        progressText.textContent = `Progress: ${progress.current}/${progress.target}`;
        
        textContainer.appendChild(progressBar);
        textContainer.appendChild(progressText);
    }
    
    // Tier badge
    const tierBadge = document.createElement('div');
    tierBadge.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        padding: 4px 10px;
        background: ${isUnlocked ? getTierColor(achievement.tier) : 'rgba(100, 100, 100, 0.4)'};
        color: ${isUnlocked ? '#000' : '#666'};
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: bold;
        text-transform: uppercase;
    `;
    // Use displayTier if available (for RGB achievements), otherwise use tier
    tierBadge.textContent = achievement.displayTier || achievement.tier;
    card.appendChild(tierBadge);
    
    card.appendChild(textContainer);
    
    // Dev mode indicator
    if (devMode && !isUnlocked) {
        const devLabel = document.createElement('div');
        devLabel.style.cssText = `
            position: absolute;
            bottom: 8px;
            right: 8px;
            padding: 3px 8px;
            background: rgba(255, 0, 255, 0.3);
            color: #ff00ff;
            border-radius: 6px;
            font-size: 0.7rem;
            font-weight: bold;
        `;
        devLabel.textContent = 'DEV VIEW';
        card.appendChild(devLabel);
    }
    
    return card;
}

// Create secret achievement card (placeholder)
function createSecretAchievementCard() {
    const card = document.createElement('div');
    card.style.cssText = `
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 14px;
        margin-bottom: 10px;
        background: rgba(20, 20, 30, 0.3);
        border: 2px dashed rgba(100, 100, 100, 0.4);
        border-radius: 10px;
        opacity: 0.5;
    `;
    
    const icon = document.createElement('div');
    icon.style.cssText = `
        flex-shrink: 0;
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.5rem;
    `;
    icon.textContent = '❓';
    card.appendChild(icon);
    
    const text = document.createElement('div');
    text.style.cssText = 'flex: 1; color: #888;';
    text.innerHTML = `
        <div style="font-size: 1.1rem; font-weight: bold; margin-bottom: 4px;">???</div>
        <div style="font-size: 0.9rem;">Secret Achievement - Locked</div>
    `;
    card.appendChild(text);
    
    return card;
}

// Get tier color
function getTierColor(tier) {
    const colors = {
        bronze: '#CD7F32',
        silver: '#C0C0C0',
        gold: '#FFD700',
        platinum: '#E5E4E2',
        diamond: '#00D9FF'
    };
    return colors[tier] || colors.bronze;
}

// Get tier glow
function getTierGlow(tier) {
    const glows = {
        bronze: 'rgba(205, 127, 50, 0.4)',
        silver: 'rgba(192, 192, 192, 0.4)',
        gold: 'rgba(255, 215, 0, 0.5)',
        platinum: 'rgba(229, 228, 226, 0.5)',
        diamond: 'rgba(0, 217, 255, 0.8)'
    };
    return glows[tier] || glows.bronze;
}

// Open skins panel
export function openSkinsPanel() {
    const overlay = document.getElementById('skinsOverlay');
    if (!overlay) return;
    
    renderSkins();
    overlay.style.display = 'flex';
}

// Close skins panel
export function closeSkinsPanel() {
    const overlay = document.getElementById('skinsOverlay');
    if (overlay) overlay.style.display = 'none';
    
    // Clear code input and status
    const input = document.getElementById('skinCodeInput');
    const status = document.getElementById('skinCodeStatus');
    if (input) input.value = '';
    if (status) status.textContent = '';
}

// Render skins list
function renderSkins() {
    const container = document.getElementById('skinsList');
    if (!container) return;
    
    const skins = getSkins();
    const unlockedIds = new Set(skins.filter(s => s.unlocked).map(s => s.id));
    const equipped = getEquippedSkin();
    
    container.innerHTML = '';
    
    // Create grid layout
    const grid = document.createElement('div');
    grid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 14px;
    `;
    
    SKINS.forEach(skinDef => {
        const isUnlocked = unlockedIds.has(skinDef.id);
        const isEquipped = equipped === skinDef.id;
        
        const card = createSkinCard(skinDef, isUnlocked, isEquipped);
        grid.appendChild(card);
    });
    
    container.appendChild(grid);
}

// Create skin card
function createSkinCard(skin, isUnlocked, isEquipped) {
    const card = document.createElement('div');
    const rgb = `rgb(${skin.color.r}, ${skin.color.g}, ${skin.color.b})`;
    const glow = `rgba(${skin.color.r}, ${skin.color.g}, ${skin.color.b}, 0.5)`;
    
    card.style.cssText = `
        padding: 14px;
        background: ${isUnlocked ? 'rgba(30, 30, 40, 0.8)' : 'rgba(20, 20, 30, 0.5)'};
        border: 3px solid ${isUnlocked ? rgb : 'rgba(100, 100, 100, 0.4)'};
        border-radius: 12px;
        text-align: center;
        cursor: ${isUnlocked ? 'pointer' : 'not-allowed'};
        opacity: ${isUnlocked ? '1' : '0.5'};
        transition: all 0.3s ease;
        position: relative;
        box-shadow: ${isEquipped ? `0 0 25px ${glow}, 0 0 50px ${glow}` : (isUnlocked ? `0 0 10px ${glow}` : '0 0 5px rgba(0,0,0,0.3)')};
    `;
    
    if (isUnlocked) {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-4px)';
            card.style.boxShadow = `0 0 30px ${glow}, 0 0 60px ${glow}`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = isEquipped ? `0 0 25px ${glow}, 0 0 50px ${glow}` : `0 0 10px ${glow}`;
        });
        
        card.addEventListener('click', () => {
            if (equipSkin(skin.id)) {
                renderSkins(); // Re-render to show new equipped state
            }
        });
    }
    
    // Skin preview circle
    const preview = document.createElement('div');
    preview.style.cssText = `
        width: 80px;
        height: 80px;
        margin: 0 auto 12px;
        border-radius: 50%;
        background: ${rgb};
        border: 3px solid ${isUnlocked ? rgb : 'rgba(100, 100, 100, 0.4)'};
        box-shadow: ${isUnlocked ? `0 0 15px ${glow}, inset 0 0 15px rgba(255,255,255,0.2)` : '0 0 5px rgba(0,0,0,0.3)'};
        position: relative;
    `;
    
    if (skin.glow && isUnlocked) {
        preview.style.boxShadow = `0 0 25px ${glow}, inset 0 0 20px rgba(255,255,255,0.3)`;
    }
    
    if (!isUnlocked) {
        const lock = document.createElement('div');
        lock.style.cssText = `
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
        `;
        lock.textContent = '🔒';
        preview.appendChild(lock);
    }
    
    card.appendChild(preview);
    
    // Name
    const name = document.createElement('div');
    name.style.cssText = `
        font-size: 1rem;
        font-weight: bold;
        color: ${isUnlocked ? '#fff' : '#888'};
        margin-bottom: 6px;
    `;
    name.textContent = skin.name;
    card.appendChild(name);
    
    // Description
    const desc = document.createElement('div');
    desc.style.cssText = `
        font-size: 0.8rem;
        color: ${isUnlocked ? '#ccc' : '#666'};
        margin-bottom: 8px;
        line-height: 1.3;
    `;
    desc.textContent = skin.desc;
    card.appendChild(desc);
    
    // Unlock method (if locked)
    if (!isUnlocked) {
        const unlock = document.createElement('div');
        unlock.style.cssText = `
            font-size: 0.75rem;
            color: #aaa;
            font-style: italic;
            margin-top: 8px;
        `;
        unlock.textContent = skin.unlockMethod || 'Complete achievement';
        card.appendChild(unlock);
    }
    
    // Dev mode: Show skin ability info
    if (window.__showSkinAbilities && skin.ability) {
        const abilityInfo = document.createElement('div');
        abilityInfo.style.cssText = `
            margin-top: 10px;
            padding: 8px;
            background: rgba(0, 217, 255, 0.15);
            border-radius: 6px;
            border: 2px solid rgba(0, 217, 255, 0.4);
            font-size: 0.7rem;
            text-align: left;
        `;
        
        const abilityTitle = document.createElement('div');
        abilityTitle.style.cssText = `
            color: #00d9ff;
            font-weight: bold;
            margin-bottom: 4px;
        `;
        abilityTitle.textContent = `⚡ ${skin.ability}`;
        abilityInfo.appendChild(abilityTitle);
        
        const abilityDesc = document.createElement('div');
        abilityDesc.style.cssText = `
            color: #aaa;
            line-height: 1.3;
        `;
        abilityDesc.textContent = skin.abilityDesc || 'No description';
        abilityInfo.appendChild(abilityDesc);
        
        card.appendChild(abilityInfo);
    }
    
    // Equipped badge
    if (isEquipped) {
        const badge = document.createElement('div');
        badge.style.cssText = `
            position: absolute;
            top: -8px;
            right: -8px;
            padding: 6px 12px;
            background: linear-gradient(135deg, #00f6ff, #61dafb);
            color: #000;
            border-radius: 16px;
            font-size: 0.7rem;
            font-weight: bold;
            text-transform: uppercase;
            box-shadow: 0 0 15px rgba(0, 246, 255, 0.6);
        `;
        badge.textContent = 'Equipped';
        card.appendChild(badge);
    }
    
    return card;
}

// Handle code redemption
export async function handleCodeRedemption() {
    const input = document.getElementById('skinCodeInput');
    const status = document.getElementById('skinCodeStatus');
    
    if (!input || !status) return;
    
    const code = input.value.trim();
    if (!code) {
        status.textContent = 'Please enter a code';
        status.style.color = '#ff6666';
        return;
    }
    
    const result = await redeemCode(code);
    
    if (result.success) {
        status.textContent = result.message;
        status.style.color = '#66ff66';
        input.value = '';
        
        // Special handling for bazooka mode unlock
        if (result.bazookaModeUnlocked) {
            // Show alert and redirect to settings
            setTimeout(() => {
                alert('🚀 BAZOOKA MODE unlocked! Head to Settings to enable it.');
                status.textContent = '';
                // Close skins panel
                closeSkinsPanel();
            }, 2000);
        } else if (result.isRGBAchievement) {
            // Special handling for RGB achievements
            setTimeout(() => {
                alert(result.message);
                status.textContent = '';
                closeSkinsPanel();
                // Open achievements to show the new RGB achievement
                openAchievementsPanel();
            }, 2000);
        } else {
            // Re-render skins to show newly unlocked
            setTimeout(() => {
                renderSkins();
                status.textContent = '';
            }, 2000);
        }
    } else {
        status.textContent = result.message;
        status.style.color = '#ff6666';
        
        setTimeout(() => {
            status.textContent = '';
        }, 2000);
    }
}

// Wire up event listeners
export function initAchievementsSkinsUI() {
    // Achievements button
    const achievementsBtn = document.getElementById('achievementsBtn');
    if (achievementsBtn) {
        achievementsBtn.addEventListener('click', openAchievementsPanel);
    }
    
    // Achievements close button
    const achievementsCloseBtn = document.getElementById('achievementsCloseBtn');
    if (achievementsCloseBtn) {
        achievementsCloseBtn.addEventListener('click', closeAchievementsPanel);
    }
    
    // Skins button
    const skinsBtn = document.getElementById('skinsBtn');
    if (skinsBtn) {
        skinsBtn.addEventListener('click', openSkinsPanel);
    }
    
    // Skins close button
    const skinsCloseBtn = document.getElementById('skinsCloseBtn');
    if (skinsCloseBtn) {
        skinsCloseBtn.addEventListener('click', closeSkinsPanel);
    }
    
    // Code submit button
    const codeSubmit = document.getElementById('skinCodeSubmit');
    if (codeSubmit) {
        codeSubmit.addEventListener('click', handleCodeRedemption);
    }
    
    // Code input enter key
    const codeInput = document.getElementById('skinCodeInput');
    if (codeInput) {
        codeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleCodeRedemption();
            }
        });
    }
    
    console.log('[ui-panels] Achievements and Skins UI initialized');

        // Endless progression: active abilities display
        const uiPanelEl = document.getElementById('ui-panel');
        if (uiPanelEl) {
            const abilitiesElId = 'endlessAbilities';
            let abilitiesEl = document.getElementById(abilitiesElId);
            if (!abilitiesEl) {
                abilitiesEl = document.createElement('div');
                abilitiesEl.id = abilitiesElId;
                abilitiesEl.style.cssText = 'display:none; gap:8px; align-items:center;';
                uiPanelEl.appendChild(abilitiesEl);
            }

            function renderAbilities() {
                if (!window.getEndlessProgression) return;
                const prog = window.getEndlessProgression();
                const active = prog?.currentRun?.activeAbilities || [];
                const gs = (typeof window !== 'undefined' && window.gameState) ? window.gameState : null;
                if (gs && gs.mode === 'endless-progression' && active.length) {
                    abilitiesEl.style.display = 'flex';
                    abilitiesEl.innerHTML = active.map(key => {
                        const iconMap = { doubleJump: '⬆️', reducedStamina: '⚡', shieldDurability: '🛡️', infiniteShieldProjectiles: '🔫', extraLife: '❤️', speedBoost: '🏃', fastRepair: '⚙️', extendedJump: '🦘' };
                        return `<span title="${key}" style="font-weight:bold;">${iconMap[key] || '★'}</span>`;
                    }).join(' ');
                } else {
                    abilitiesEl.style.display = 'none';
                    abilitiesEl.innerHTML = '';
                }
            }

            // Expose for renderer tick or state updates
            window.__renderEndlessAbilities = renderAbilities;
        } else {
            // Panel not present yet; expose a no-op to avoid errors
            window.__renderEndlessAbilities = function noop() {};
        }
}
