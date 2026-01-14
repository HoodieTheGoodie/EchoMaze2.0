/**
 * UI Sound Effects Module
 * Handles menu interactions, notifications, and feedback sounds
 */

(function() {
    'use strict';

    const sounds = {
        menuHover: null,
        menuClick: null,
        notification: null,
        powerUp: null,
        death: null
    };

    let soundsEnabled = true;
    let uiVolume = 0.3;

    /**
     * Initialize UI sound effects
     */
    function initUISounds() {
        // Load UI volume from settings
        const savedVolume = localStorage.getItem('ui-volume');
        if (savedVolume !== null) {
            uiVolume = parseFloat(savedVolume);
        }

        const savedEnabled = localStorage.getItem('ui-sounds-enabled');
        if (savedEnabled !== null) {
            soundsEnabled = savedEnabled === 'true';
        }

        // Create audio context for UI sounds
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Generate menu hover sound (subtle beep)
            sounds.menuHover = createTone(audioContext, 600, 0.05, 0.1);
            
            // Generate menu click sound (higher pitch confirmation)
            sounds.menuClick = createTone(audioContext, 800, 0.1, 0.15);
            
            // Generate notification sound (pleasant ding)
            sounds.notification = createTone(audioContext, 1000, 0.15, 0.2);
            
            // Generate power-up sound (ascending tones)
            sounds.powerUp = createChord(audioContext, [600, 800, 1000], 0.2, 0.2);
            
            // Generate death sound (descending tone)
            sounds.death = createTone(audioContext, 200, 0.3, 0.3, 'sawtooth');
            
        } catch (e) {
            console.warn('UI sounds not available:', e);
        }

        // Add hover listeners to all buttons
        addButtonHoverSounds();
        addButtonClickSounds();
    }

    /**
     * Create a simple tone
     */
    function createTone(audioContext, frequency, duration, volume, type = 'sine') {
        return () => {
            if (!soundsEnabled) return;
            
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = type;
            oscillator.frequency.value = frequency;
            
            gainNode.gain.setValueAtTime(volume * uiVolume, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        };
    }

    /**
     * Create a chord (multiple tones)
     */
    function createChord(audioContext, frequencies, duration, volume) {
        return () => {
            if (!soundsEnabled) return;
            
            frequencies.forEach((freq, index) => {
                setTimeout(() => {
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    
                    oscillator.frequency.value = freq;
                    
                    gainNode.gain.setValueAtTime(volume * uiVolume, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
                    
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + duration);
                }, index * 50);
            });
        };
    }

    /**
     * Add hover sounds to all buttons
     */
    function addButtonHoverSounds() {
        const addHoverSound = (element) => {
            element.addEventListener('mouseenter', () => {
                if (!element.disabled && sounds.menuHover) {
                    sounds.menuHover();
                }
            });
        };

        // Add to existing buttons
        document.querySelectorAll('button, .level-btn, .terminal-btn').forEach(addHoverSound);

        // Watch for new buttons being added
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        if (node.matches('button, .level-btn, .terminal-btn')) {
                            addHoverSound(node);
                        }
                        node.querySelectorAll('button, .level-btn, .terminal-btn').forEach(addHoverSound);
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    /**
     * Add click sounds to all buttons
     */
    function addButtonClickSounds() {
        document.addEventListener('click', (e) => {
            const button = e.target.closest('button, .level-btn, .terminal-btn');
            if (button && !button.disabled && sounds.menuClick) {
                sounds.menuClick();
            }
        });
    }

    /**
     * Play notification sound
     */
    function playNotificationSound() {
        if (sounds.notification) {
            sounds.notification();
        }
    }

    /**
     * Play power-up collected sound
     */
    function playPowerUpSound() {
        if (sounds.powerUp) {
            sounds.powerUp();
        }
    }

    /**
     * Play death sound
     */
    function playDeathSound() {
        if (sounds.death) {
            sounds.death();
        }
    }

    /**
     * Toggle UI sounds on/off
     */
    function toggleUISounds(enabled) {
        soundsEnabled = enabled;
        localStorage.setItem('ui-sounds-enabled', enabled);
    }

    /**
     * Set UI volume (0.0 to 1.0)
     */
    function setUIVolume(volume) {
        uiVolume = Math.max(0, Math.min(1, volume));
        localStorage.setItem('ui-volume', uiVolume);
    }

    // Export API
    window.UI_SOUNDS = {
        init: initUISounds,
        playNotification: playNotificationSound,
        playPowerUp: playPowerUpSound,
        playDeath: playDeathSound,
        toggleSounds: toggleUISounds,
        setVolume: setUIVolume,
        get enabled() { return soundsEnabled; },
        get volume() { return uiVolume; }
    };

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUISounds);
    } else {
        initUISounds();
    }

})();
