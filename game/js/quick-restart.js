/**
 * Quick Restart Module
 * Provides instant level restart functionality with R key
 */

(function() {
    'use strict';

    let isEnabled = true;
    let currentLevel = null;
    let isInGame = false;

    /**
     * Initialize quick restart listener
     */
    function init() {
        document.addEventListener('keydown', handleKeyPress);
        
        // Load enabled state from localStorage
        const saved = localStorage.getItem('quick-restart-enabled');
        if (saved !== null) {
            isEnabled = saved === 'true';
        }
    }

    /**
     * Handle keypress events
     */
    function handleKeyPress(e) {
        // Check if Shift+R is pressed
        if (e.key.toLowerCase() === 'r' && e.shiftKey && isEnabled && isInGame) {
            // Don't restart if typing in an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            // Don't restart if an overlay is showing (except lose overlay)
            const settingsOverlay = document.getElementById('settings-overlay');
            const helpOverlay = document.getElementById('help-overlay');
            const winOverlay = document.getElementById('win-overlay');
            
            if (settingsOverlay?.style.display === 'flex' || 
                helpOverlay?.style.display === 'flex' ||
                winOverlay?.style.display === 'flex') {
                return;
            }
            
            // Perform restart
            restart();
            e.preventDefault();
        }
    }

    /**
     * Restart the current level
     */
    function restart() {
        if (!currentLevel) return;
        
        console.log('[Quick Restart] Restarting level:', currentLevel);
        
        // Call the global startLevel function if available
        if (typeof window.startLevel === 'function') {
            window.startLevel(currentLevel);
            
            // Show brief feedback
            showRestartFeedback();
        }
    }

    /**
     * Show visual feedback for restart
     */
    function showRestartFeedback() {
        const feedback = document.createElement('div');
        feedback.style.position = 'fixed';
        feedback.style.top = '50%';
        feedback.style.left = '50%';
        feedback.style.transform = 'translate(-50%, -50%)';
        feedback.style.color = '#00f6ff';
        feedback.style.fontSize = '24px';
        feedback.style.fontWeight = 'bold';
        feedback.style.textShadow = '0 0 10px rgba(0, 246, 255, 0.8)';
        feedback.style.pointerEvents = 'none';
        feedback.style.zIndex = '10000';
        feedback.style.animation = 'fadeOut 0.8s ease';
        feedback.textContent = 'Restarting... (Shift+R)';
        
        document.body.appendChild(feedback);
        
        setTimeout(() => feedback.remove(), 800);
    }

    /**
     * Set the current level being played
     */
    function setCurrentLevel(level) {
        currentLevel = level;
        isInGame = level !== null;
    }

    /**
     * Set whether player is in game
     */
    function setInGame(inGame) {
        isInGame = inGame;
    }

    /**
     * Enable/disable quick restart
     */
    function setEnabled(enabled) {
        isEnabled = enabled;
        localStorage.setItem('quick-restart-enabled', enabled);
    }

    /**
     * Get current enabled state
     */
    function getEnabled() {
        return isEnabled;
    }

    // Export API
    window.QUICK_RESTART = {
        init,
        setCurrentLevel,
        setInGame,
        setEnabled,
        getEnabled,
        restart,
        get enabled() { return isEnabled; },
        get currentLevel() { return currentLevel; }
    };

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
