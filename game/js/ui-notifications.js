/**
 * Achievement Notifications - Beautiful, polished UI
 * 
 * Features:
 * - Smooth animations
 * - Color-coded by tier
 * - Custom achievement sound
 * - Responsive design
 */

const TIER_COLORS = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    // Match toned down platinum used in panels
    platinum: '#9FA6B2',
    diamond: '#00CED1'
};

const TIER_GRADIENTS = {
    bronze: 'linear-gradient(135deg, #8B4513, #CD7F32)',
    silver: 'linear-gradient(135deg, #808080, #C0C0C0)',
    gold: 'linear-gradient(135deg, #FFD700, #FFA500)',
    platinum: 'linear-gradient(135deg, #9FA6B2, #7C8796)',
    diamond: 'linear-gradient(135deg, #00CED1, #00BFFF)'
};

/**
 * Show achievement unlock notification - ULTRA COOL VERSION
 */
export function showAchievementUnlocked(achievement) {
    const container = document.getElementById('achievementNotificationContainer');
    if (!container) createNotificationContainer();

    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    const tierColor = TIER_COLORS[achievement.tier] || '#CD7F32';
    
    notification.innerHTML = `
        <div class="achievement-pop">
            <div class="achievement-icon-circle">🏆</div>
            <div class="achievement-content">
                <div class="achievement-unlock-label">★ ACHIEVEMENT UNLOCKED ★</div>
                <div class="achievement-title">${achievement.name}</div>
                <div class="achievement-description">${achievement.desc}</div>
                ${achievement.unlockSkin ? `<div class="achievement-skin">🎨 +${formatSkinName(achievement.unlockSkin)} Skin</div>` : ''}
            </div>
            <div class="achievement-tier-badge" data-tier="${achievement.tier}">
                <div>${achievement.tier.toUpperCase()}</div>
            </div>
        </div>
    `;

    // Apply tier styling with glow effects
    notification.style.background = TIER_GRADIENTS[achievement.tier];
    notification.style.borderColor = tierColor;
    notification.style.boxShadow = `0 0 30px ${tierColor}60, 0 0 60px ${tierColor}30, inset 0 0 20px rgba(255,255,255,0.1)`;

    // Add to container
    const notificationContainer = document.getElementById('achievementNotificationContainer');
    notificationContainer.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });

    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 400);
    }, 4700);
}

function createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'achievementNotificationContainer';
    container.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 12px;
        pointer-events: none;
        font-family: 'Courier New', monospace;
    `;
    document.body.appendChild(container);
}

// Inject styles
function injectAchievementStyles() {
    const styleId = 'achievement-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .achievement-notification {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px 20px;
            border-radius: 12px;
            border: 3px solid;
            box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4), 0 0 40px rgba(255, 255, 255, 0.1) inset;
            min-width: 320px;
            max-width: 420px;
            backdrop-filter: blur(10px);
            opacity: 0;
            transform: translateX(450px) translateY(-20px) scale(0.8);
            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            pointer-events: auto;
            color: #FFF;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6), 0 0 8px rgba(0, 0, 0, 0.3);
            position: relative;
            overflow: hidden;
        }

        .achievement-notification::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 50%);
            pointer-events: none;
        }

        .achievement-notification.show {
            opacity: 1;
            transform: translateX(0) translateY(0) scale(1);
        }

        .achievement-pop {
            display: flex;
            align-items: center;
            gap: 16px;
            width: 100%;
            position: relative;
            z-index: 1;
        }

        .achievement-icon-circle {
            font-size: 48px;
            animation: achievementPop 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            flex-shrink: 0;
            filter: drop-shadow(0 0 12px rgba(255, 215, 0, 0.6));
        }

        .achievement-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .achievement-unlock-label {
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 2px;
            opacity: 0.85;
            text-transform: uppercase;
            color: rgba(255, 255, 255, 0.8);
        }

        .achievement-title {
            font-size: 18px;
            font-weight: 900;
            letter-spacing: 1.5px;
            line-height: 1.2;
            text-transform: uppercase;
        }

        .achievement-description {
            font-size: 13px;
            opacity: 0.85;
            font-weight: 500;
            line-height: 1.3;
        }

        .achievement-skin {
            font-size: 12px;
            opacity: 0.9;
            color: #FF69B4;
            font-weight: bold;
            margin-top: 4px;
            padding: 4px 8px;
            background: rgba(255, 105, 180, 0.15);
            border-radius: 4px;
            width: fit-content;
        }

        .achievement-tier-badge {
            flex-shrink: 0;
            padding: 8px 14px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 1px;
            background: rgba(0, 0, 0, 0.3);
            text-transform: uppercase;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 70px;
            box-shadow: 0 0 12px rgba(0, 0, 0, 0.4) inset;
        }

        @keyframes achievementPop {
            0% {
                transform: scale(0) rotate(-180deg);
                opacity: 0;
            }
            60% {
                transform: scale(1.25) rotate(10deg);
            }
            100% {
                transform: scale(1) rotate(0);
            }
        }

        /* Mobile responsive */
        @media (max-width: 480px) {
            .achievement-notification {
                min-width: 280px;
                max-width: 320px;
                padding: 14px 16px;
                gap: 12px;
            }

            .achievement-icon-circle {
                font-size: 40px;
            }

            .achievement-title {
                font-size: 16px;
            }

            .achievement-description {
                font-size: 12px;
            }

            .achievement-tier-badge {
                font-size: 10px;
                padding: 6px 10px;
                min-width: 60px;
            }
        }
    `;
    document.head.appendChild(style);
}

// Call on import
injectAchievementStyles();

function formatSkinName(skinId) {
    return skinId
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

/**
 * Initialize notifications system (no-op, system initializes on import)
 */
export function initNotifications() {
    // Styles are already injected on import
    // This is kept for backward compatibility
    console.log('[NOTIFICATIONS] System initialized');
}
