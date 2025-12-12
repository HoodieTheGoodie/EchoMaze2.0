// ui-notifications.js - Flashy popup notifications for achievements and skin unlocks

let notificationQueue = [];
let isShowingNotification = false;

// Show achievement unlocked notification
export function showAchievementUnlocked(achievement) {
    notificationQueue.push({ type: 'achievement', data: achievement });
    processQueue();
}

// Show skin unlocked notification
export function showSkinUnlocked(skin) {
    notificationQueue.push({ type: 'skin', data: skin });
    processQueue();
}

// Process notification queue (one at a time)
function processQueue() {
    if (isShowingNotification || notificationQueue.length === 0) return;
    
    const notification = notificationQueue.shift();
    isShowingNotification = true;
    
    if (notification.type === 'achievement') {
        displayAchievementNotification(notification.data);
    } else if (notification.type === 'skin') {
        displaySkinNotification(notification.data);
    }
}

// Display achievement notification with fancy animation
function displayAchievementNotification(achievement) {
    const container = createNotificationContainer();
    
    // Tier colors
    const tierColors = {
        bronze: { primary: '#CD7F32', glow: 'rgba(205, 127, 50, 0.6)' },
        silver: { primary: '#C0C0C0', glow: 'rgba(192, 192, 192, 0.6)' },
        gold: { primary: '#FFD700', glow: 'rgba(255, 215, 0, 0.6)' },
        platinum: { primary: '#E5E4E2', glow: 'rgba(229, 228, 226, 0.6)' }
    };
    
    const colors = tierColors[achievement.tier] || tierColors.bronze;
    
    container.innerHTML = `
        <div class="notification-content achievement-notification">
            <div class="notification-icon achievement-icon">
                <div class="trophy-icon" style="color: ${colors.primary}; text-shadow: 0 0 20px ${colors.glow};">
                    🏆
                </div>
            </div>
            <div class="notification-text">
                <div class="notification-title">Achievement Unlocked!</div>
                <div class="notification-subtitle">${achievement.name}</div>
                <div class="notification-desc">${achievement.desc}</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(container);
    
    // Play sound effect
    playNotificationSound('achievement');
    
    // Animate in
    requestAnimationFrame(() => {
        container.classList.add('show');
    });
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
        container.classList.remove('show');
        container.classList.add('hide');
        setTimeout(() => {
            container.remove();
            isShowingNotification = false;
            processQueue();
        }, 500);
    }, 4000);
    
    // Click to dismiss
    container.addEventListener('click', () => {
        container.classList.remove('show');
        container.classList.add('hide');
        setTimeout(() => {
            container.remove();
            isShowingNotification = false;
            processQueue();
        }, 500);
    });
}

// Display skin unlocked notification
function displaySkinNotification(skin) {
    const container = createNotificationContainer();
    
    const rgb = `rgb(${skin.color.r}, ${skin.color.g}, ${skin.color.b})`;
    const glow = `rgba(${skin.color.r}, ${skin.color.g}, ${skin.color.b}, 0.6)`;
    
    container.innerHTML = `
        <div class="notification-content skin-notification">
            <div class="notification-icon skin-icon">
                <div class="skin-preview" style="background: ${rgb}; box-shadow: 0 0 20px ${glow}, 0 0 40px ${glow} inset;">
                </div>
            </div>
            <div class="notification-text">
                <div class="notification-title">New Skin Unlocked!</div>
                <div class="notification-subtitle">${skin.name}</div>
                <div class="notification-desc">${skin.desc}</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(container);
    
    // Play sound effect
    playNotificationSound('skin');
    
    // Animate in
    requestAnimationFrame(() => {
        container.classList.add('show');
    });
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
        container.classList.remove('show');
        container.classList.add('hide');
        setTimeout(() => {
            container.remove();
            isShowingNotification = false;
            processQueue();
        }, 500);
    }, 4000);
    
    // Click to dismiss
    container.addEventListener('click', () => {
        container.classList.remove('show');
        container.classList.add('hide');
        setTimeout(() => {
            container.remove();
            isShowingNotification = false;
            processQueue();
        }, 500);
    });
}

// Create notification container
function createNotificationContainer() {
    const container = document.createElement('div');
    container.className = 'unlock-notification';
    return container;
}

// Play notification sound (placeholder - can be enhanced with actual audio)
function playNotificationSound(type) {
    try {
        // Web Audio API chime
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        if (type === 'achievement') {
            // Rising chime
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
            oscillator.frequency.exponentialRampToValueAtTime(783.99, audioContext.currentTime + 0.1); // G5
            oscillator.frequency.exponentialRampToValueAtTime(1046.50, audioContext.currentTime + 0.2); // C6
        } else {
            // Sparkle chime
            oscillator.frequency.setValueAtTime(1046.50, audioContext.currentTime); // C6
            oscillator.frequency.exponentialRampToValueAtTime(1318.51, audioContext.currentTime + 0.1); // E6
        }
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
        // Silently fail if Web Audio API not available
    }
}

// Inject notification styles into document
function injectNotificationStyles() {
    if (document.getElementById('notification-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        .unlock-notification {
            position: fixed;
            top: 80px;
            right: -400px;
            width: 380px;
            z-index: 9999;
            transition: right 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            cursor: pointer;
        }
        
        .unlock-notification.show {
            right: 20px;
        }
        
        .unlock-notification.hide {
            right: -400px;
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            gap: 20px;
            background: linear-gradient(135deg, rgba(10, 10, 20, 0.98), rgba(30, 10, 40, 0.98));
            backdrop-filter: blur(12px);
            border: 3px solid #00f6ff;
            border-radius: 15px;
            padding: 20px;
            box-shadow: 
                0 0 40px rgba(0, 246, 255, 0.5),
                0 0 80px rgba(0, 246, 255, 0.3),
                inset 0 0 40px rgba(0, 246, 255, 0.1);
            animation: notification-pulse 2s ease-in-out infinite;
        }
        
        @keyframes notification-pulse {
            0%, 100% {
                box-shadow: 
                    0 0 40px rgba(0, 246, 255, 0.5),
                    0 0 80px rgba(0, 246, 255, 0.3),
                    inset 0 0 40px rgba(0, 246, 255, 0.1);
            }
            50% {
                box-shadow: 
                    0 0 60px rgba(0, 246, 255, 0.7),
                    0 0 120px rgba(0, 246, 255, 0.5),
                    inset 0 0 60px rgba(0, 246, 255, 0.2);
            }
        }
        
        .notification-icon {
            flex-shrink: 0;
            width: 80px;
            height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .trophy-icon {
            font-size: 3.5rem;
            animation: trophy-bounce 1s ease-in-out infinite;
        }
        
        @keyframes trophy-bounce {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-10px) scale(1.1); }
        }
        
        .skin-preview {
            width: 70px;
            height: 70px;
            border-radius: 50%;
            border: 3px solid #00f6ff;
            animation: skin-spin 3s linear infinite;
        }
        
        @keyframes skin-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        .notification-text {
            flex: 1;
            color: white;
        }
        
        .notification-title {
            font-size: 1.4rem;
            font-weight: bold;
            color: #00f6ff;
            text-shadow: 0 0 10px rgba(0, 246, 255, 0.8);
            margin-bottom: 5px;
        }
        
        .notification-subtitle {
            font-size: 1.2rem;
            font-weight: bold;
            color: #fff;
            margin-bottom: 5px;
        }
        
        .notification-desc {
            font-size: 0.95rem;
            color: #aaa;
            line-height: 1.3;
        }
        
        @media (max-width: 768px) {
            .unlock-notification {
                width: calc(100% - 40px);
                right: -100%;
            }
            
            .unlock-notification.show {
                right: 20px;
            }
            
            .unlock-notification.hide {
                right: -100%;
            }
        }
    `;
    
    document.head.appendChild(style);
}

// Initialize notifications system
export function initNotifications() {
    injectNotificationStyles();
    console.log('[ui-notifications] Notification system initialized');
}

// Initialize on module load
injectNotificationStyles();
