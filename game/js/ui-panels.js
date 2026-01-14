// ui-panels.js - UI logic for Achievements and Skins panels

import { ACHIEVEMENTS, getUnlockedAchievements, getAchievementProgress, getIndividualAchievementProgress, trackAchievement, getTrackedAchievement } from './achievements.js';
import { SKINS, getSkins, getEquippedSkin, equipSkin, redeemCode, isSkinUnlocked } from './skins.js';
import { isGodMode } from './config.js';

// Open achievements panel
export function openAchievementsPanel() {
    const overlay = document.getElementById('achievementsOverlay');
    if (!overlay) return;
    
    // Always refresh achievements when opening panel to show latest unlocks
    renderAchievements();
    overlay.style.display = 'flex';
    
    // Trigger a refresh to ensure unlocked achievements show up immediately
    setTimeout(() => {
        renderAchievements();
    }, 50);
}

// Close achievements panel
export function closeAchievementsPanel() {
    const overlay = document.getElementById('achievementsOverlay');
    if (overlay) overlay.style.display = 'none';
}

// Render achievements list with fancy display
function renderAchievements() {
    const container = document.getElementById('achievementsList');
    if (!container) return;
    
    const unlocked = getUnlockedAchievements();
    const unlockedIds = new Set(unlocked.map(a => a.id));
    const progress = getAchievementProgress();
    const devMode = isGodMode();
    
    container.innerHTML = '';
    
    // Add challenge mode section
    const challengeSection = createChallengeSection();
    container.appendChild(challengeSection);
    
    // Add progress header
    const progressSection = createProgressHeader(progress);
    container.appendChild(progressSection);
    
    // Group achievements by tier
    const tiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'rgb'];
    const tierAchievements = {};
    
    tiers.forEach(tier => {
        tierAchievements[tier] = ACHIEVEMENTS.filter(a => a.tier === tier);
    });
    
    // Render each tier section
    tiers.forEach(tier => {
        const achievements = tierAchievements[tier];
        if (achievements.length === 0) return;
        
        const tierSection = createTierSection(tier, achievements, unlockedIds, devMode);
        container.appendChild(tierSection);
    });
}

// Create challenge mode section
function createChallengeSection() {
    const section = document.createElement('div');
    section.style.cssText = `
        padding: 16px;
        margin-bottom: 16px;
        background: linear-gradient(135deg, rgba(128, 0, 255, 0.15), rgba(255, 0, 128, 0.15));
        border: 2px solid rgba(255, 0, 255, 0.4);
        border-radius: 12px;
    `;
    
    const title = document.createElement('div');
    title.style.cssText = `
        font-size: 1.2rem;
        font-weight: bold;
        color: #FF00FF;
        margin-bottom: 12px;
        text-align: center;
        text-shadow: 0 0 10px rgba(255, 0, 255, 0.5);
    `;
    title.textContent = '⚔️ Challenge Mode';
    section.appendChild(title);
    
    // Challenge status display
    const statusDiv = document.createElement('div');
    statusDiv.id = 'challengeStatusMain';
    statusDiv.style.cssText = `
        text-align: center;
        margin-bottom: 12px;
        color: rgba(255, 255, 255, 0.9);
        font-size: 0.9rem;
        min-height: 20px;
    `;
    section.appendChild(statusDiv);
    
    // Button container
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = `
        display: flex;
        gap: 12px;
        justify-content: center;
        flex-wrap: wrap;
    `;
    
    // Deathless button
    const deathlessBtn = document.createElement('button');
    deathlessBtn.textContent = '🏆 Deathless Challenge';
    deathlessBtn.style.cssText = `
        padding: 10px 20px;
        background: linear-gradient(135deg, #FFD700, #FFA500);
        border: 2px solid #FFD700;
        border-radius: 8px;
        color: #000;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 0.95rem;
    `;
    deathlessBtn.onmouseover = () => {
        deathlessBtn.style.transform = 'scale(1.05)';
        deathlessBtn.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.6)';
    };
    deathlessBtn.onmouseout = () => {
        deathlessBtn.style.transform = 'scale(1)';
        deathlessBtn.style.boxShadow = 'none';
    };
    deathlessBtn.onclick = () => startChallengeFromUI('deathless');
    btnContainer.appendChild(deathlessBtn);
    
    // Speedrun button
    const speedrunBtn = document.createElement('button');
    speedrunBtn.textContent = '⏱️ Speedrun Challenge';
    speedrunBtn.style.cssText = `
        padding: 10px 20px;
        background: linear-gradient(135deg, #00FFFF, #0080FF);
        border: 2px solid #00FFFF;
        border-radius: 8px;
        color: #000;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 0.95rem;
    `;
    speedrunBtn.onmouseover = () => {
        speedrunBtn.style.transform = 'scale(1.05)';
        speedrunBtn.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.6)';
    };
    speedrunBtn.onmouseout = () => {
        speedrunBtn.style.transform = 'scale(1)';
        speedrunBtn.style.boxShadow = 'none';
    };
    speedrunBtn.onclick = () => startChallengeFromUI('speedrun10');
    btnContainer.appendChild(speedrunBtn);
    
    // Abort button (only show when challenge active)
    const abortBtn = document.createElement('button');
    abortBtn.textContent = '❌ Abort Challenge';
    abortBtn.id = 'abortChallengeBtn';
    abortBtn.style.cssText = `
        padding: 10px 20px;
        background: linear-gradient(135deg, #FF4444, #CC0000);
        border: 2px solid #FF4444;
        border-radius: 8px;
        color: #FFF;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 0.95rem;
        display: none;
    `;
    abortBtn.onmouseover = () => {
        abortBtn.style.transform = 'scale(1.05)';
        abortBtn.style.boxShadow = '0 0 15px rgba(255, 68, 68, 0.6)';
    };
    abortBtn.onmouseout = () => {
        abortBtn.style.transform = 'scale(1)';
        abortBtn.style.boxShadow = 'none';
    };
    abortBtn.onclick = () => abortChallengeFromUI();
    btnContainer.appendChild(abortBtn);
    
    section.appendChild(btnContainer);
    
    // Update status initially
    updateChallengeStatusMain();
    
    return section;
}

function startChallengeFromUI(type) {
    window.__CHALLENGE = {
        active: true,
        type,
        startedAt: performance.now(),
        levelsCompleted: 0,
        failed: false,
    };
    updateChallengeStatusMain();
    
    // Close achievements panel and start Level 1
    closeAchievementsPanel();
    if (window.__START_LEVEL) {
        window.__START_LEVEL(1);
    } else {
        alert('Challenge armed. Start Level 1 to begin.');
    }
}

function abortChallengeFromUI() {
    if (window.__CHALLENGE && window.__CHALLENGE.active) {
        window.__CHALLENGE.active = false;
        window.__CHALLENGE.failed = true;
        updateChallengeStatusMain();
        
        // Return to menu
        if (window.showMenu) {
            window.showMenu();
        }
    }
}

function updateChallengeStatusMain() {
    const statusDiv = document.getElementById('challengeStatusMain');
    const abortBtn = document.getElementById('abortChallengeBtn');
    
    if (!statusDiv) return;
    
    const ch = window.__CHALLENGE;
    if (!ch || !ch.active || ch.failed) {
        statusDiv.textContent = 'No active challenge';
        if (abortBtn) abortBtn.style.display = 'none';
        return;
    }
    
    const elapsed = performance.now() - ch.startedAt;
    const mins = String(Math.floor(elapsed / 60000)).padStart(2, '0');
    const secs = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0');
    const name = ch.type === 'deathless' ? 'Deathless 10' : 'Speedrun 10m';
    
    statusDiv.innerHTML = `
        <strong>Active:</strong> ${name} 
        <span style="color: #FFD700;">• Level ${ch.levelsCompleted + 1}/10</span> 
        <span style="color: #00FFFF;">• ⏱️ ${mins}:${secs}</span>
    `;
    
    if (abortBtn) abortBtn.style.display = 'inline-block';
    
    // Continue updating if challenge is active
    if (ch.active && !ch.failed) {
        setTimeout(updateChallengeStatusMain, 1000);
    }
}

// Create progress header
function createProgressHeader(progress) {
    const header = document.createElement('div');
    const percent = progress.percentage || 0;
    const unlocked = progress.unlocked || 0;
    const total = progress.total || 56;
    
    header.style.cssText = `
        padding: 16px;
        margin-bottom: 16px;
        background: linear-gradient(135deg, rgba(0, 246, 255, 0.15), rgba(0, 246, 255, 0.05));
        border: 2px solid rgba(0, 246, 255, 0.3);
        border-radius: 12px;
        text-align: center;
    `;
    
    const title = document.createElement('div');
    title.style.cssText = `
        font-size: 1.2rem;
        font-weight: bold;
        color: #FFD700;
        margin-bottom: 8px;
        text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
    `;
    title.textContent = `🏆 Achievement Progress: ${unlocked}/${total}`;
    header.appendChild(title);
    
    // Progress bar
    const progressBarContainer = document.createElement('div');
    progressBarContainer.style.cssText = `
        width: 100%;
        height: 24px;
        background: rgba(0, 0, 0, 0.5);
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid rgba(0, 246, 255, 0.2);
        margin-bottom: 8px;
    `;
    
    const progressBarFill = document.createElement('div');
    progressBarFill.style.cssText = `
        height: 100%;
        width: ${percent}%;
        background: linear-gradient(90deg, #00f6ff, #61dafb, #00f6ff);
        transition: width 0.5s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
        font-weight: bold;
        color: #000;
    `;
    progressBarFill.textContent = `${percent}%`;
    progressBarContainer.appendChild(progressBarFill);
    header.appendChild(progressBarContainer);
    
    // Stats
    const stats = document.createElement('div');
    stats.style.cssText = `
        font-size: 0.95rem;
        color: #00d9ff;
        font-weight: bold;
    `;
    stats.textContent = `${unlocked} unlocked • ${total - unlocked} remaining`;
    header.appendChild(stats);
    
    return header;
}

// Create tier section with collapsible design
function createTierSection(tier, achievements, unlockedIds, devMode) {
    const section = document.createElement('div');
    section.style.cssText = `
        margin-bottom: 24px;
        border-radius: 10px;
        overflow: visible;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(0, 246, 255, 0.1);
    `;
    
    // Tier header
    const header = document.createElement('div');
    const tierColor = getTierColor(tier);
    const unlockedCount = achievements.filter(a => unlockedIds.has(a.id)).length;
    const totalCount = achievements.length;
    
    // Special animation for RGB tier
    const isRGB = tier === 'rgb';
    const rgbAnimation = isRGB ? `
        @keyframes rgbShift {
            0% { 
                border-color: rgba(255, 0, 255, 0.8);
                box-shadow: 0 0 20px rgba(255, 0, 255, 0.5);
            }
            33% { 
                border-color: rgba(0, 255, 255, 0.8);
                box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
            }
            66% { 
                border-color: rgba(255, 255, 0, 0.8);
                box-shadow: 0 0 20px rgba(255, 255, 0, 0.5);
            }
            100% { 
                border-color: rgba(255, 0, 255, 0.8);
                box-shadow: 0 0 20px rgba(255, 0, 255, 0.5);
            }
        }
    ` : '';
    
    if (isRGB && !document.getElementById('rgbShiftStyle')) {
        const style = document.createElement('style');
        style.id = 'rgbShiftStyle';
        style.textContent = rgbAnimation;
        document.head.appendChild(style);
    }
    
    header.style.cssText = `
        padding: 12px 16px;
        background: linear-gradient(135deg, ${tierColor}20, ${tierColor}10);
        border-bottom: 2px solid ${tierColor};
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        user-select: none;
        transition: all 0.3s ease;
        ${isRGB ? 'animation: rgbShift 3s ease-in-out infinite;' : ''}
    `;
    
    const headerLeft = document.createElement('div');
    headerLeft.style.cssText = 'display: flex; align-items: center; gap: 12px; flex: 1;';
    
    const tierIcon = document.createElement('div');
    tierIcon.style.cssText = `
        font-size: 1.3rem;
        width: 28px;
        text-align: center;
    `;
    tierIcon.textContent = getTierEmoji(tier);
    headerLeft.appendChild(tierIcon);
    
    const tierName = document.createElement('div');
    tierName.style.cssText = `
        font-size: 1.1rem;
        font-weight: bold;
        color: ${tierColor};
        text-transform: uppercase;
        letter-spacing: 1px;
        ${isRGB ? `
            background: linear-gradient(90deg, #FF00FF, #00FFFF, #FFFF00, #FF00FF);
            background-size: 200% auto;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: rgbTextShift 3s linear infinite;
        ` : ''}
    `;
    
    // Add text animation for RGB tier
    if (isRGB && !document.getElementById('rgbTextShiftStyle')) {
        const textStyle = document.createElement('style');
        textStyle.id = 'rgbTextShiftStyle';
        textStyle.textContent = `
            @keyframes rgbTextShift {
                0% { background-position: 0% center; }
                100% { background-position: 200% center; }
            }
        `;
        document.head.appendChild(textStyle);
    }
    
    tierName.textContent = tier;
    headerLeft.appendChild(tierName);
    
    const tierStats = document.createElement('div');
    tierStats.style.cssText = `
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.7);
        margin-left: auto;
    `;
    tierStats.textContent = `${unlockedCount}/${totalCount}`;
    headerLeft.appendChild(tierStats);
    
    header.appendChild(headerLeft);
    
    const toggleIcon = document.createElement('div');
    toggleIcon.style.cssText = `
        font-size: 1rem;
        color: ${tierColor};
        transition: transform 0.3s ease;
    `;
    toggleIcon.textContent = '▼';
    header.appendChild(toggleIcon);
    
    section.appendChild(header);
    
    // Achievement cards container
    const cardsContainer = document.createElement('div');
    cardsContainer.style.cssText = `
        padding: 12px 8px 16px;
        max-height: 2000px;
        overflow: visible;
        transition: max-height 0.3s ease;
    `;
    
    achievements.forEach(achievement => {
        const isUnlocked = unlockedIds.has(achievement.id);
        const isSecret = achievement.secret && !isUnlocked;
        
        // Hide secret achievements unless unlocked or in dev mode
        if (isSecret && !devMode) {
            const card = createSecretAchievementCard();
            cardsContainer.appendChild(card);
        } else {
            const card = createAchievementCard(achievement, isUnlocked, devMode);
            cardsContainer.appendChild(card);
        }
    });
    
    section.appendChild(cardsContainer);
    
    // Toggle functionality
    let isOpen = true;
    header.addEventListener('click', () => {
        isOpen = !isOpen;
        cardsContainer.style.maxHeight = isOpen ? '2000px' : '0px';
        toggleIcon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(-90deg)';
    });
    
    return section;
}

// Get tier emoji
function getTierEmoji(tier) {
    const emojis = {
        bronze: '🥉',
        silver: '🥈',
        gold: '🥇',
        platinum: '💎',
        diamond: '✨'
    };
    return emojis[tier] || '🏆';
}
// Create achievement card with fancy styling
function createAchievementCard(achievement, isUnlocked, devMode) {
    const card = document.createElement('div');
    const tierColor = getTierColor(achievement.tier);
    
    card.style.cssText = `
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 12px;
        margin-bottom: 8px;
        background: ${isUnlocked ? `linear-gradient(135deg, ${tierColor}15, ${tierColor}05)` : 'rgba(20, 20, 30, 0.5)'};
        border: 2px solid ${isUnlocked ? tierColor : 'rgba(100, 100, 100, 0.3)'};
        border-radius: 8px;
        box-shadow: ${isUnlocked ? `0 0 15px ${tierColor}40` : '0 0 5px rgba(0,0,0,0.3)'};
        opacity: ${isUnlocked ? '1' : '0.7'};
        position: relative;
        transition: all 0.3s ease;
    `;
    
    // Hover effect
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-2px)';
        card.style.boxShadow = isUnlocked ? `0 0 25px ${tierColor}60, 0 4px 12px rgba(0,0,0,0.5)` : '0 4px 12px rgba(0,0,0,0.5)';
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = isUnlocked ? `0 0 15px ${tierColor}40` : '0 0 5px rgba(0,0,0,0.3)';
    });
    
    // Icon with glow
    const iconContainer = document.createElement('div');
    iconContainer.style.cssText = `
        flex-shrink: 0;
        width: 56px;
        height: 56px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
        border-radius: 50%;
        background: ${isUnlocked ? `radial-gradient(circle, ${tierColor}30, ${tierColor}10)` : 'rgba(50, 50, 50, 0.3)'};
        border: 2px solid ${isUnlocked ? tierColor : 'rgba(100, 100, 100, 0.3)'};
        box-shadow: ${isUnlocked ? `inset 0 0 12px ${tierColor}40, 0 0 12px ${tierColor}40` : 'inset 0 0 8px rgba(0,0,0,0.5)'};
    `;
    iconContainer.textContent = isUnlocked ? '🏆' : '🔒';
    card.appendChild(iconContainer);
    
    // Text content
    const textContainer = document.createElement('div');
    textContainer.style.cssText = 'flex: 1; color: white; min-width: 0;';
    
    // Title with tier indicator
    const titleRow = document.createElement('div');
    titleRow.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 4px;';
    
    const title = document.createElement('div');
    title.style.cssText = `
        font-size: 1rem;
        font-weight: bold;
        color: ${isUnlocked ? '#fff' : '#999'};
    `;
    title.textContent = achievement.name;
    titleRow.appendChild(title);
    
    // Secret badge
    if (achievement.secret && isUnlocked) {
        const secretBadge = document.createElement('div');
        secretBadge.style.cssText = `
            font-size: 0.7rem;
            padding: 2px 6px;
            background: #FFD700;
            color: #000;
            border-radius: 4px;
            font-weight: bold;
        `;
        secretBadge.textContent = '🔐 SECRET';
        titleRow.appendChild(secretBadge);
    }
    
    textContainer.appendChild(titleRow);
    
    // Description
    const desc = document.createElement('div');
    desc.style.cssText = `
        font-size: 0.85rem;
        color: ${isUnlocked ? '#d0d0d0' : '#888'};
        margin-bottom: 6px;
        line-height: 1.3;
    `;
    desc.textContent = achievement.desc;
    textContainer.appendChild(desc);
    
    // Additional clarification for confusing achievements
    const clarifications = {
        'no_abilities_level': 'Don\'t use Shield (Space) or Jump (Shift). Movement and weapon are OK. Skins don\'t affect this.',
        'no_abilities_3_consecutive': 'Complete 3 levels in a row without Shield (Space) or Jump (Shift). Skins are allowed.',
        'endless_no_abilities_10': 'Survive 10 waves without using Shield (Space) or Jump (Shift) abilities.',
        'purist': 'Complete one level using only movement - no Shield (Space) or Jump (Shift).',
        'deathless_3_levels': 'Complete 3 levels in a row without dying (keep all 3 hearts).',
        'generator_perfect_3': 'Succeed at 3 generator skill checks in a row without missing.',
        'generator_perfect_10': 'Succeed at 10 generator skill checks total without missing.',
        'trap_master': 'Lure 25 enemies into wall traps across all your runs.',
        'perfect_shield_10': 'Reflect 10 enemy projectiles using the Block ability (Space).',
        'boss_mount_3_pigs': 'During the boss fight, mount (ride) 3 different pigs.',
        'glitch_teleport_escape': 'Use the glitch teleport to dodge damage 5 times.',
        'total_deaths_100': 'Die 100 times across all your playthroughs.',
    };
    
    if (clarifications[achievement.id] && !isUnlocked) {
        const hint = document.createElement('div');
        hint.style.cssText = `
            font-size: 0.75rem;
            color: #FFD700;
            margin-top: 6px;
            padding: 4px 8px;
            background: rgba(255, 215, 0, 0.1);
            border-left: 2px solid #FFD700;
            border-radius: 4px;
            font-style: italic;
        `;
        hint.innerHTML = `💡 <strong>Tip:</strong> ${clarifications[achievement.id]}`;
        textContainer.appendChild(hint);
    }
    
    // Progress bar for count-based achievements (if not unlocked)
    if (!isUnlocked) {
        const progress = getIndividualAchievementProgress(achievement.id);
        if (progress && progress.max > 0) {
            const progressContainer = document.createElement('div');
            progressContainer.style.cssText = `
                margin-top: 8px;
                margin-bottom: 4px;
            `;
            
            const progressLabel = document.createElement('div');
            progressLabel.style.cssText = `
                font-size: 0.75rem;
                color: ${tierColor};
                margin-bottom: 4px;
                font-weight: bold;
            `;
            progressLabel.textContent = `Progress: ${progress.current} / ${progress.max}`;
            progressContainer.appendChild(progressLabel);
            
            const progressBarBg = document.createElement('div');
            progressBarBg.style.cssText = `
                width: 100%;
                height: 8px;
                background: rgba(0, 0, 0, 0.5);
                border-radius: 4px;
                overflow: hidden;
                border: 1px solid rgba(255, 255, 255, 0.2);
            `;
            
            const progressBarFill = document.createElement('div');
            const progressPercent = Math.min(100, (progress.current / progress.max) * 100);
            progressBarFill.style.cssText = `
                width: ${progressPercent}%;
                height: 100%;
                background: linear-gradient(90deg, ${tierColor}, ${tierColor}aa);
                transition: width 0.3s ease;
                box-shadow: 0 0 8px ${tierColor}60;
            `;
            progressBarBg.appendChild(progressBarFill);
            progressContainer.appendChild(progressBarBg);
            
            textContainer.appendChild(progressContainer);
        }
    }
    
    // Unlock reward display
    if (isUnlocked && achievement.unlockSkin) {
        const reward = document.createElement('div');
        reward.style.cssText = `
            font-size: 0.8rem;
            color: #FF69B4;
            padding: 4px 6px;
            background: rgba(255, 105, 180, 0.15);
            border-left: 3px solid #FF69B4;
            border-radius: 4px;
            margin-top: 4px;
        `;
        reward.innerHTML = `🎨 Unlocked Skin: <strong>${achievement.unlockSkin}</strong>`;
        textContainer.appendChild(reward);
    }
    
    card.appendChild(textContainer);
    
    // Tier badge - styled nicely
    const tierBadge = document.createElement('div');
    tierBadge.style.cssText = `
        flex-shrink: 0;
        padding: 6px 12px;
        background: ${isUnlocked ? `linear-gradient(135deg, ${tierColor}, ${tierColor}dd)` : 'rgba(100, 100, 100, 0.3)'};
        color: ${isUnlocked ? '#000' : '#666'};
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        box-shadow: ${isUnlocked ? `0 0 10px ${tierColor}40` : 'none'};
    `;
    tierBadge.textContent = `${getTierEmoji(achievement.tier)} ${achievement.tier}`;
    // tierBadge appended via right-side column below
    
    // Right-side column for actions
    const rightSide = document.createElement('div');
    rightSide.style.cssText = 'display:flex; flex-direction:column; align-items:flex-end; gap:6px; flex-shrink:0;';

    // Track button (locked + trackable)
    if (!isUnlocked) {
        const trackableAchievements = [
            'no_abilities_level', 'no_abilities_3_consecutive', 'endless_no_abilities_10',
            'deathless_3_levels', 'deathless_game',
            'generator_perfect_3', 'generator_perfect_10', 'perfect_generator_run'
        ];
        if (trackableAchievements.includes(achievement.id)) {
            const trackedAchievement = getTrackedAchievement();
            const isTracked = trackedAchievement && trackedAchievement.id === achievement.id;
            const trackButton = document.createElement('button');
            trackButton.style.cssText = `
                padding: 6px 10px;
                background: ${isTracked ? '#00ff88' : 'rgba(0, 246, 255, 0.15)'};
                color: ${isTracked ? '#000' : '#00f6ff'};
                border: 1px solid ${isTracked ? '#00ff88' : '#00f6ff'};
                border-radius: 6px;
                font-size: 0.72rem;
                font-weight: 800;
                letter-spacing: 0.3px;
                cursor: pointer;
                transition: all 0.2s ease;
            `;
            trackButton.textContent = isTracked ? '📍 TRACKING' : 'TRACK';
            trackButton.title = isTracked ? 'Click to stop tracking' : 'Track this achievement - get notified if you fail!';
            trackButton.addEventListener('click', (e) => {
                e.stopPropagation();
                if (isTracked) { trackAchievement(null); } else { trackAchievement(achievement.id); }
                renderAchievements();
            });
            trackButton.addEventListener('mouseenter', () => {
                trackButton.style.transform = 'translateY(-1px)';
                trackButton.style.boxShadow = `0 0 10px ${isTracked ? '#00ff88' : '#00f6ff'}`;
            });
            trackButton.addEventListener('mouseleave', () => {
                trackButton.style.transform = 'none';
                trackButton.style.boxShadow = 'none';
            });
            rightSide.appendChild(trackButton);
        }
    }

    // Tier badge appended here for consistent alignment
    rightSide.appendChild(tierBadge);
    card.appendChild(rightSide);
    
    // Unlocked checkmark
    if (isUnlocked) {
        const checkmark = document.createElement('div');
        checkmark.style.cssText = `
            position: absolute;
            top: 4px;
            right: 4px;
            width: 24px;
            height: 24px;
            background: ${tierColor};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #000;
            font-size: 1rem;
            font-weight: bold;
        `;
        checkmark.textContent = '✓';
        card.appendChild(checkmark);
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
        // Toned down platinum so borders aren’t bright white
        platinum: '#9FA6B2',
        diamond: '#00D9FF',
        rgb: '#FF00FF' // Base magenta, will be animated
    };
    return colors[tier] || colors.bronze;
}

// Get tier glow
function getTierGlow(tier) {
    const glows = {
        bronze: 'rgba(205, 127, 50, 0.4)',
        silver: 'rgba(192, 192, 192, 0.4)',
        gold: 'rgba(255, 215, 0, 0.5)',
        platinum: 'rgba(159, 166, 178, 0.5)',
        diamond: 'rgba(0, 217, 255, 0.8)',
        rgb: 'rgba(255, 102, 255, 0.8)'
    };
    return glows[tier] || glows.bronze;
}

// Render theme selector
function renderThemeSelector() {
    const container = document.getElementById('themeSelector');
    if (!container) return;
    
    // Dynamically import theme manager
    import('./theme-manager.js').then(mod => {
        const themes = mod.getAvailableThemes();
        const currentTheme = mod.getCurrentTheme();
        
        container.innerHTML = '';
        
        themes.forEach(theme => {
            const isActive = theme.id === currentTheme;
            const isLocked = theme.locked;
            
            const btn = document.createElement('button');
            btn.className = 'theme-selector-btn';
            btn.disabled = isLocked;
            
            // Compact button styling
            let icon = '🔷';
            let color = '#00f6ff';
            if (theme.id === 'hero') {
                icon = '🏆';
                color = '#00ff88';
            } else if (theme.id === 'virus') {
                icon = '🦠';
                color = '#ff4455';
            }
            
            btn.style.cssText = `
                padding: 8px 16px;
                background: ${isActive ? 'rgba(0, 246, 255, 0.2)' : 'rgba(0, 0, 0, 0.4)'};
                border: 2px solid ${isActive ? color : (isLocked ? '#555' : '#888')};
                border-radius: 6px;
                color: ${isLocked ? '#666' : '#fff'};
                cursor: ${isLocked ? 'not-allowed' : 'pointer'};
                transition: all 0.2s;
                font-size: 0.9rem;
                display: flex;
                align-items: center;
                gap: 6px;
                ${isActive ? `box-shadow: 0 0 15px ${color}80;` : ''}
            `;
            
            btn.innerHTML = `
                <span style="font-size: 1.2rem;">${icon}</span>
                <span style="color: ${isLocked ? '#666' : color}; font-weight: ${isActive ? 'bold' : 'normal'};">${theme.name}</span>
                ${isActive ? '<span style="color: #00f6ff; font-size: 0.8rem;">✓</span>' : ''}
                ${isLocked ? '<span style="color: #999; font-size: 0.8rem;">🔒</span>' : ''}
            `;
            
            if (!isLocked) {
                btn.addEventListener('mouseenter', () => {
                    if (!isActive) {
                        btn.style.background = 'rgba(0, 246, 255, 0.15)';
                        btn.style.borderColor = color;
                        btn.style.transform = 'translateY(-2px)';
                    }
                });
                
                btn.addEventListener('mouseleave', () => {
                    if (!isActive) {
                        btn.style.background = 'rgba(0, 0, 0, 0.4)';
                        btn.style.borderColor = '#888';
                        btn.style.transform = 'translateY(0)';
                    }
                });
                
                btn.addEventListener('click', () => {
                    if (mod.setTheme(theme.id)) {
                        renderThemeSelector(); // Refresh to show new active state
                        
                        // Show notification
                        const status = document.getElementById('skinCodeStatus');
                        if (status) {
                            status.textContent = `✨ ${theme.name} activated!`;
                            status.style.color = color;
                            setTimeout(() => {
                                status.textContent = '';
                            }, 2000);
                        }
                    }
                });
            }
            
            container.appendChild(btn);
        });
    }).catch(err => {
        console.warn('Failed to load themes:', err);
    });
}

// Open skins panel
export function openSkinsPanel() {
    const overlay = document.getElementById('skinsOverlay');
    if (!overlay) return;
    
    renderSkins();
    renderThemeSelector();
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
    
    // Create grid layout - ultra-compact horizontal
    const grid = document.createElement('div');
    grid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
        gap: 4px;
        width: 100%;
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
    card.setAttribute('data-skin-name', skin.id);
    const rgb = `rgb(${skin.color.r}, ${skin.color.g}, ${skin.color.b})`;
    const glow = `rgba(${skin.color.r}, ${skin.color.g}, ${skin.color.b}, 0.5)`;
    
    card.style.cssText = `
        padding: 4px;
        background: ${isUnlocked ? 'rgba(30, 30, 40, 0.8)' : 'rgba(20, 20, 30, 0.5)'};
        border: 1px solid ${isUnlocked ? rgb : 'rgba(100, 100, 100, 0.4)'};
        border-radius: 4px;
        text-align: center;
        cursor: ${isUnlocked ? 'pointer' : 'not-allowed'};
        opacity: ${isUnlocked ? '1' : '0.5'};
        transition: all 0.3s ease;
        position: relative;
        box-shadow: ${isEquipped ? `0 0 20px ${glow}` : (isUnlocked ? `0 0 8px ${glow}` : '0 0 3px rgba(0,0,0,0.3)')};
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
        width: 40px;
        height: 40px;
        margin: 0 auto 3px;
        border-radius: 50%;
        background: ${rgb};
        border: 2px solid ${isUnlocked ? rgb : 'rgba(100, 100, 100, 0.4)'};
        box-shadow: ${isUnlocked ? `0 0 12px ${glow}, inset 0 0 12px rgba(255,255,255,0.15)` : '0 0 3px rgba(0,0,0,0.3)'};
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
        font-size: 0.8rem;
        font-weight: bold;
        color: ${isUnlocked ? '#fff' : '#888'};
        margin-bottom: 1px;
    `;
    name.textContent = skin.name;
    card.appendChild(name);
    
    // Description
    const desc = document.createElement('div');
    desc.style.cssText = `
        font-size: 0.6rem;
        color: ${isUnlocked ? '#bbb' : '#666'};
        margin-bottom: 2px;
        line-height: 1;
        min-height: 16px;
    `;
    desc.textContent = skin.desc;
    card.appendChild(desc);
    
    // Unlock method (if locked)
    if (!isUnlocked) {
        const unlock = document.createElement('div');
        unlock.style.cssText = `
            font-size: 0.65rem;
            color: #999;
            font-style: italic;
            margin-top: 4px;
        `;
        unlock.textContent = skin.unlockMethod || 'Complete achievement';
        card.appendChild(unlock);
    }
    
    // Stats button for unlocked skins (deferred in case PLAYER_STATS not loaded yet)
    if (isUnlocked) {
        const addStatsButton = () => {
            // Check if stats button already exists
            if (card.querySelector('[data-skin-stats-btn]')) return;
            
            if (!window.PLAYER_STATS) {
                // Retry in 100ms if PLAYER_STATS not available yet
                setTimeout(addStatsButton, 100);
                return;
            }
            
            const statsBtn = document.createElement('button');
            statsBtn.innerHTML = '📊 Stats';
            statsBtn.setAttribute('data-skin-stats-btn', skin.id);
            statsBtn.setAttribute('title', 'View stats');
            statsBtn.style.cssText = `
                background: rgba(0, 246, 255, 0.15);
                border: 1px solid rgba(0, 246, 255, 0.4);
                color: #00f6ff;
                padding: 3px 4px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 0.7rem;
                width: 100%;
                margin-top: 3px;
                transition: all 0.2s ease;
                font-weight: bold;
            `;
            
            let statsPanel = null;
            const showStats = () => {
                if (!statsPanel) {
                    statsPanel = createSkinStatsPanel(skin.id);
                    // Insert panel right after button
                    statsBtn.parentNode.insertBefore(statsPanel, statsBtn.nextSibling);
                }
                const isShowing = statsPanel.style.display !== 'none';
                statsPanel.style.display = isShowing ? 'none' : 'block';
            };
            
            statsBtn.addEventListener('mouseenter', () => {
                statsBtn.style.background = 'rgba(0, 246, 255, 0.2)';
                statsBtn.style.boxShadow = '0 0 6px rgba(0, 246, 255, 0.3)';
            });
            statsBtn.addEventListener('mouseleave', () => {
                statsBtn.style.background = 'rgba(0, 246, 255, 0.1)';
                statsBtn.style.boxShadow = 'none';
            });
            statsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showStats();
            });
            
            card.appendChild(statsBtn);
        };
        
        // Add immediately if PLAYER_STATS is already available, otherwise defer
        if (window.PLAYER_STATS) {
            addStatsButton();
        } else {
            setTimeout(addStatsButton, 100);
        }
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
        
        // Special handling for theme unlocks
        if (result.isTheme) {
            // Refresh theme selector to show unlocked theme
            setTimeout(() => {
                renderThemeSelector();
                status.textContent = '';
            }, 3000);
        } 
        // Special handling for bazooka mode unlock
        else if (result.bazookaModeUnlocked) {
            // Show alert and redirect to settings
            setTimeout(() => {
                alert('🚀 ENERGY BLASTER MODE unlocked! Head to Settings to enable it.');
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

/**
 * Create stats panel for a skin
 */
function createSkinStatsPanel(skinId) {
    const panel = document.createElement('div');
    panel.setAttribute('data-skin-stats-panel', skinId);
    panel.style.cssText = `
        background: rgba(0, 0, 0, 0.9);
        border: 1px solid rgba(0, 246, 255, 0.4);
        border-radius: 3px;
        padding: 6px;
        margin-top: 2px;
        font-size: 0.6rem;
        color: #fff;
        max-height: 180px;
        overflow-y: auto;
        line-height: 1.4;
    `;
    
    // Update content
    updateSkinStatsPanel(panel, skinId);
    
    return panel;
}

/**
 * Update stats panel content
 */
function updateSkinStatsPanel(panel, skinId) {
    if (!window.PLAYER_STATS) return;
    
    const skinStats = window.PLAYER_STATS.getSkinStats(skinId);
    
    // Format last used date
    let lastUsedStr = 'Never';
    if (skinStats.lastUsed) {
        const lastUsed = new Date(skinStats.lastUsed);
        const now = new Date();
        const diff = now - lastUsed;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) {
            lastUsedStr = 'Today';
        } else if (days === 1) {
            lastUsedStr = 'Yesterday';
        } else if (days < 7) {
            lastUsedStr = `${days}d ago`;
        } else {
            lastUsedStr = lastUsed.toLocaleDateString();
        }
    }
    
    panel.innerHTML = `
        <div style="color:#00f6ff; font-weight:bold; margin-bottom:4px;">Combat</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; margin-bottom:6px; font-size:0.6rem;">
            <div>Deaths: <span style="color:#ff6b6b;">${skinStats.deaths || 0}</span></div>
            <div>Wins: <span style="color:#51cf66;">${skinStats.wins || 0}</span></div>
        </div>
        
        <div style="color:#00f6ff; font-weight:bold; margin-bottom:4px;">Generators</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; margin-bottom:6px; font-size:0.6rem;">
            <div>✓ <span style="color:#51cf66;">${skinStats.generatorsCompleted || 0}</span></div>
            <div>✗ <span style="color:#ff6b6b;">${skinStats.generatorsFailed || 0}</span></div>
        </div>
        
        <div style="color:#00f6ff; font-weight:bold; margin-bottom:4px;">Skill Checks</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; margin-bottom:6px; font-size:0.6rem;">
            <div>Made: <span style="color:#9cdcff;">${skinStats.skillChecksMade || 0}</span></div>
            <div>Failed: <span style="color:#ff6b6b;">${skinStats.skillChecksFailed || 0}</span></div>
        </div>
        
        <div style="border-top:1px solid rgba(0,246,255,0.15); padding-top:4px; margin-top:4px;">
            <div style="font-size:0.6rem;">
                Power-ups: <span style="color:#ffd700;">${skinStats.powerUpsCollected || 0}</span> | 
                Last: ${lastUsedStr}
            </div>
        </div>
    `;
}
