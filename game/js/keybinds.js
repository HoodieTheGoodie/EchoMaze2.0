/**
 * Keybind Customization Module
 * Allows players to customize control keys
 */

(function() {
    'use strict';

    const KEYBINDS_KEY = 'echomaze-keybinds';

    // Default keybinds
    const defaultKeybinds = {
        moveUp: 'ArrowUp',
        moveDown: 'ArrowDown',
        moveLeft: 'ArrowLeft',
        moveRight: 'ArrowRight',
        moveUpAlt: 'w',
        moveDownAlt: 's',
        moveLeftAlt: 'a',
        moveRightAlt: 'd',
        pause: 'Escape',
        restart: 'r',
        interact: ' ', // Space
        dash: 'Shift',
        reload: 'r', // Reload Bazooka
        shield: ' ', // Shield (same as interact/space)
        quickRestart: null, // Unbound by default
        reloadLevel: null // Unbound by default
    };

    let currentKeybinds = { ...defaultKeybinds };
    let isRecording = false;
    let recordingKey = null;

    /**
     * Load keybinds from localStorage
     */
    function loadKeybinds() {
        const saved = localStorage.getItem(KEYBINDS_KEY);
        if (saved) {
            try {
                currentKeybinds = { ...defaultKeybinds, ...JSON.parse(saved) };
            } catch (e) {
                console.warn('Failed to load keybinds:', e);
            }
        }
    }

    /**
     * Save keybinds to localStorage
     */
    function saveKeybinds() {
        localStorage.setItem(KEYBINDS_KEY, JSON.stringify(currentKeybinds));
    }

    /**
     * Get current keybind for an action
     */
    function getKey(action) {
        return currentKeybinds[action] || defaultKeybinds[action];
    }

    /**
     * Set keybind for an action
     */
    function setKey(action, key) {
        if (!defaultKeybinds.hasOwnProperty(action)) {
            console.warn('Unknown action:', action);
            return false;
        }
        
        currentKeybinds[action] = key;
        saveKeybinds();
        return true;
    }

    /**
     * Check if a key matches any movement action
     */
    function isMovementKey(key) {
        return key === getKey('moveUp') ||
               key === getKey('moveDown') ||
               key === getKey('moveLeft') ||
               key === getKey('moveRight') ||
               key === getKey('moveUpAlt') ||
               key === getKey('moveDownAlt') ||
               key === getKey('moveLeftAlt') ||
               key === getKey('moveRightAlt');
    }

    /**
     * Get movement direction from key
     */
    function getMovementDirection(key) {
        if (key === getKey('moveUp') || key === getKey('moveUpAlt')) return 'up';
        if (key === getKey('moveDown') || key === getKey('moveDownAlt')) return 'down';
        if (key === getKey('moveLeft') || key === getKey('moveLeftAlt')) return 'left';
        if (key === getKey('moveRight') || key === getKey('moveRightAlt')) return 'right';
        return null;
    }

    /**
     * Reset all keybinds to default
     */
    function resetToDefaults() {
        currentKeybinds = { ...defaultKeybinds };
        saveKeybinds();
    }

    /**
     * Get friendly name for a key
     */
    function getKeyDisplayName(key) {
        if (key === null || key === undefined) return 'Not Bound';
        
        const keyNames = {
            ' ': 'Space',
            'ArrowUp': '↑',
            'ArrowDown': '↓',
            'ArrowLeft': '←',
            'ArrowRight': '→',
            'Escape': 'Esc',
            'Control': 'Ctrl',
            'Shift': 'Shift',
            'Alt': 'Alt',
            'Enter': 'Enter',
            'Backspace': 'Backspace',
            'Tab': 'Tab'
        };
        
        return keyNames[key] || key.toUpperCase();
    }

    /**
     * Start recording a new keybind
     */
    function startRecording(action, callback) {
        if (!defaultKeybinds.hasOwnProperty(action)) {
            console.warn('Unknown action:', action);
            return false;
        }
        
        isRecording = true;
        recordingKey = action;
        
        const handler = (e) => {
            e.preventDefault();
            
            // Don't allow some special keys
            if (e.key === 'Escape') {
                isRecording = false;
                recordingKey = null;
                document.removeEventListener('keydown', handler);
                if (callback) callback(null);
                return;
            }
            
            // Check if key is already in use
            const existingAction = Object.keys(currentKeybinds).find(
                a => a !== action && currentKeybinds[a] === e.key
            );
            
            if (existingAction) {
                if (!confirm(`${getKeyDisplayName(e.key)} is already bound to ${existingAction}. Reassign?`)) {
                    isRecording = false;
                    recordingKey = null;
                    document.removeEventListener('keydown', handler);
                    if (callback) callback(null);
                    return;
                }
            }
            
            // Set the new keybind
            setKey(action, e.key);
            isRecording = false;
            recordingKey = null;
            document.removeEventListener('keydown', handler);
            
            if (callback) callback(e.key);
        };
        
        document.addEventListener('keydown', handler);
        return true;
    }

    /**
     * Create keybind settings UI
     */
    function createKeybindUI() {
        const container = document.createElement('div');
        container.style.cssText = `
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 10px;
            max-height: 400px;
            overflow-y: auto;
            padding: 10px;
        `;
        
        const actions = [
            { key: 'moveUp', name: 'Move Up' },
            { key: 'moveDown', name: 'Move Down' },
            { key: 'moveLeft', name: 'Move Left' },
            { key: 'moveRight', name: 'Move Right' },
            { key: 'moveUpAlt', name: 'Move Up (Alt)' },
            { key: 'moveDownAlt', name: 'Move Down (Alt)' },
            { key: 'moveLeftAlt', name: 'Move Left (Alt)' },
            { key: 'moveRightAlt', name: 'Move Right (Alt)' },
            { key: 'dash', name: 'Dash' },
            { key: 'shield', name: 'Shield' },
            { key: 'interact', name: 'Interact' },
            { key: 'reload', name: 'Reload Bazooka' },
            { key: 'pause', name: 'Pause' },
            { key: 'quickRestart', name: 'Quick Restart (Unbound)' },
            { key: 'reloadLevel', name: 'Reload Level (Unbound)' }
        ];
        
        actions.forEach(({ key, name }) => {
            const label = document.createElement('div');
            label.textContent = name;
            label.style.cssText = 'color: #fff; padding: 8px 0;';
            
            const button = document.createElement('button');
            button.textContent = getKeyDisplayName(getKey(key));
            button.style.cssText = `
                background: #1a2428;
                border: 2px solid #00f6ff;
                color: #00f6ff;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                min-width: 80px;
                font-weight: bold;
            `;
            
            button.addEventListener('click', () => {
                button.textContent = 'Press key...';
                button.style.background = '#00f6ff';
                button.style.color = '#000';
                
                startRecording(key, (newKey) => {
                    if (newKey) {
                        button.textContent = getKeyDisplayName(newKey);
                    } else {
                        button.textContent = getKeyDisplayName(getKey(key));
                    }
                    button.style.background = '#1a2428';
                    button.style.color = '#00f6ff';
                });
            });
            
            container.appendChild(label);
            container.appendChild(button);
        });
        
        // Add reset button
        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Reset to Defaults';
        resetBtn.style.cssText = `
            grid-column: 1 / -1;
            background: #ff4444;
            border: 2px solid #ff6666;
            color: #fff;
            padding: 8px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            margin-top: 10px;
        `;
        resetBtn.addEventListener('click', () => {
            if (confirm('Reset all keybinds to defaults?')) {
                resetToDefaults();
                // Refresh UI
                container.remove();
                const newUI = createKeybindUI();
                container.parentNode?.replaceChild(newUI, container);
            }
        });
        container.appendChild(resetBtn);
        
        return container;
    }

    // Export API
    window.KEYBINDS = {
        load: loadKeybinds,
        save: saveKeybinds,
        getKey,
        setKey,
        isMovementKey,
        getMovementDirection,
        resetToDefaults,
        getKeyDisplayName,
        startRecording,
        createUI: createKeybindUI,
        get current() { return { ...currentKeybinds }; },
        get defaults() { return { ...defaultKeybinds }; }
    };

    // Auto-load keybinds
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadKeybinds);
    } else {
        loadKeybinds();
    }

})();
