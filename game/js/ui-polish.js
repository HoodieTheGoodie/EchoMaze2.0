/**
 * UI Polish Module
 * Handles visual enhancements like button animations, hover effects, and transitions
 */

(function() {
    'use strict';

    // Add CSS animations for menu buttons
    const style = document.createElement('style');
    style.textContent = `
        /* Menu Button Hover Animations */
        .level-btn, .terminal-btn, button {
            transition: all 0.2s ease;
            position: relative;
        }
        
        .level-btn:hover:not([disabled]), 
        .terminal-btn:hover:not([disabled]),
        button:hover:not([disabled]) {
            transform: translateY(-2px);
            filter: brightness(1.15) !important;
        }
        
        .level-btn:active:not([disabled]),
        .terminal-btn:active:not([disabled]),
        button:active:not([disabled]) {
            transform: translateY(0px) scale(0.98);
        }
        
        /* Glow pulse animation for important buttons */
        @keyframes glow-pulse {
            0%, 100% { box-shadow: 0 0 10px rgba(0, 246, 255, 0.3); }
            50% { box-shadow: 0 0 20px rgba(0, 246, 255, 0.6); }
        }
        
        .endless:not(:hover) {
            animation: glow-pulse 2s ease-in-out infinite;
        }
        
        /* Smooth transitions for overlays */
        .overlay {
            transition: opacity 0.3s ease, visibility 0.3s ease;
        }
        
        .overlay.showing {
            animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        
        /* Settings card hover effect */
        .setting-card {
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .setting-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 6px 20px rgba(0, 246, 255, 0.3) !important;
        }
        
        /* Notification slide-in animation */
        .notification {
            animation: slideInRight 0.4s ease;
        }
        
        @keyframes slideInRight {
            from { 
                transform: translateX(400px);
                opacity: 0;
            }
            to { 
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        /* Power-up collection feedback */
        @keyframes collectPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.2); filter: brightness(1.5); }
            100% { transform: scale(1); }
        }
        
        .power-collected {
            animation: collectPulse 0.3s ease;
        }
        
        /* Death screen shake */
        @keyframes screenShake {
            0%, 100% { transform: translate(0, 0); }
            10%, 30%, 50%, 70%, 90% { transform: translate(-2px, 2px); }
            20%, 40%, 60%, 80% { transform: translate(2px, -2px); }
        }
        
        .screen-shake {
            animation: screenShake 0.5s ease;
        }
    `;
    document.head.appendChild(style);

    /**
     * Add overlay fade-in animation when showing
     */
    function enhanceOverlays() {
        const overlays = document.querySelectorAll('.overlay');
        overlays.forEach(overlay => {
            const originalDisplay = overlay.style.display;
            
            // Intercept display changes
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'style') {
                        const display = overlay.style.display;
                        if (display === 'flex' || display === 'block') {
                            overlay.classList.add('showing');
                            setTimeout(() => overlay.classList.remove('showing'), 300);
                        }
                    }
                });
            });
            
            observer.observe(overlay, { attributes: true, attributeFilter: ['style'] });
        });
    }

    /**
     * Add screen shake effect on death
     */
    function addDeathShake() {
        const canvas = document.getElementById('gameCanvas');
        if (canvas && canvas.parentElement) {
            canvas.parentElement.classList.add('screen-shake');
            setTimeout(() => {
                canvas.parentElement.classList.remove('screen-shake');
            }, 500);
        }
    }

    /**
     * Add visual feedback for power-up collection
     */
    function showPowerUpCollectFeedback(x, y, color) {
        const feedback = document.createElement('div');
        feedback.style.position = 'absolute';
        feedback.style.left = x + 'px';
        feedback.style.top = y + 'px';
        feedback.style.color = color || '#00f6ff';
        feedback.style.fontSize = '24px';
        feedback.style.fontWeight = 'bold';
        feedback.style.pointerEvents = 'none';
        feedback.style.zIndex = '9999';
        feedback.textContent = '+';
        feedback.classList.add('power-collected');
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.style.transition = 'all 0.5s ease';
            feedback.style.transform = 'translateY(-50px)';
            feedback.style.opacity = '0';
            setTimeout(() => feedback.remove(), 500);
        }, 300);
    }

    // Export functions
    window.UI_POLISH = {
        enhanceOverlays,
        addDeathShake,
        showPowerUpCollectFeedback
    };

    // Initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enhanceOverlays);
    } else {
        enhanceOverlays();
    }

})();
