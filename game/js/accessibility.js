/**
 * Accessibility Manager
 * Handles accessibility options like reduced motion, high contrast, colorblind modes, etc.
 */

const SETTINGS_KEY = 'smg_accessibility_settings';

const defaultSettings = {
    reducedMotion: false,
    highContrast: false,
    textSize: 'normal', // 'small', 'normal', 'large'
    colorblindMode: 'none', // 'none', 'protanopia', 'deuteranopia', 'tritanopia'
    screenReaderHints: false
};

let currentSettings = { ...defaultSettings };

// Load settings from localStorage
export function loadAccessibilitySettings() {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY);
        if (saved) {
            currentSettings = { ...defaultSettings, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.warn('Failed to load accessibility settings:', e);
    }
    
    applyAccessibilitySettings();
    return currentSettings;
}

// Save settings to localStorage
export function saveAccessibilitySettings(settings) {
    currentSettings = { ...currentSettings, ...settings };
    
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings));
    } catch (e) {
        console.warn('Failed to save accessibility settings:', e);
    }
    
    applyAccessibilitySettings();
}

// Apply accessibility settings to the page
function applyAccessibilitySettings() {
    const root = document.documentElement;
    const body = document.body;
    
    // Reduced Motion
    if (currentSettings.reducedMotion) {
        body.classList.add('reduced-motion');
        root.style.setProperty('--animation-speed', '0.01s');
        
        // Disable theme effects
        if (window.THEME && window.THEME.set) {
            const current = window.THEME.current();
            // Temporarily disable effects by stopping animations
            if (window.themeAnimationFrame) {
                cancelAnimationFrame(window.themeAnimationFrame);
                window.themeAnimationFrame = null;
            }
        }
    } else {
        body.classList.remove('reduced-motion');
        root.style.setProperty('--animation-speed', '1s');
    }
    
    // High Contrast
    if (currentSettings.highContrast) {
        body.classList.add('high-contrast');
        root.style.setProperty('--contrast-boost', '1.5');
    } else {
        body.classList.remove('high-contrast');
        root.style.setProperty('--contrast-boost', '1');
    }
    
    // Text Size
    body.classList.remove('text-small', 'text-normal', 'text-large');
    body.classList.add(`text-${currentSettings.textSize}`);
    
    const textSizes = {
        small: '0.9rem',
        normal: '1rem',
        large: '1.15rem'
    };
    root.style.setProperty('--ui-text-size', textSizes[currentSettings.textSize] || '1rem');
    
    // Colorblind Mode
    body.classList.remove('colorblind-protanopia', 'colorblind-deuteranopia', 'colorblind-tritanopia');
    if (currentSettings.colorblindMode !== 'none') {
        body.classList.add(`colorblind-${currentSettings.colorblindMode}`);
        applyColorblindFilter(currentSettings.colorblindMode);
    } else {
        root.style.removeProperty('--colorblind-filter');
    }
    
    // Screen Reader Hints
    if (currentSettings.screenReaderHints) {
        body.setAttribute('aria-live', 'polite');
    } else {
        body.removeAttribute('aria-live');
    }
}

// Apply colorblind filter
function applyColorblindFilter(mode) {
    const root = document.documentElement;
    
    // CSS filters approximating colorblind vision
    const filters = {
        protanopia: 'hue-rotate(20deg) saturate(0.7)', // Red-blind
        deuteranopia: 'hue-rotate(-20deg) saturate(0.7)', // Green-blind
        tritanopia: 'hue-rotate(180deg) saturate(0.6)' // Blue-blind
    };
    
    if (filters[mode]) {
        root.style.setProperty('--colorblind-filter', filters[mode]);
    }
}

// Get current settings
export function getAccessibilitySettings() {
    return { ...currentSettings };
}

// Individual setters
export function setReducedMotion(enabled) {
    saveAccessibilitySettings({ reducedMotion: enabled });
}

export function setHighContrast(enabled) {
    saveAccessibilitySettings({ highContrast: enabled });
}

export function setTextSize(size) {
    if (['small', 'normal', 'large'].includes(size)) {
        saveAccessibilitySettings({ textSize: size });
    }
}

export function setColorblindMode(mode) {
    if (['none', 'protanopia', 'deuteranopia', 'tritanopia'].includes(mode)) {
        saveAccessibilitySettings({ colorblindMode: mode });
    }
}

export function setScreenReaderHints(enabled) {
    saveAccessibilitySettings({ screenReaderHints: enabled });
}

// Initialize accessibility CSS
function injectAccessibilityCSS() {
    const style = document.createElement('style');
    style.id = 'accessibilityStyles';
    style.textContent = `
        /* Reduced Motion */
        .reduced-motion * {
            animation-duration: 0.01s !important;
            transition-duration: 0.01s !important;
        }
        
        /* High Contrast */
        .high-contrast {
            filter: contrast(var(--contrast-boost, 1));
        }
        
        .high-contrast button,
        .high-contrast .menu-btn,
        .high-contrast .level-btn {
            border-width: 3px !important;
        }
        
        /* Text Sizes */
        .text-small { font-size: 0.9rem; }
        .text-normal { font-size: 1rem; }
        .text-large { font-size: 1.15rem; }
        
        /* Colorblind Modes */
        .colorblind-protanopia .gameCanvas,
        .colorblind-deuteranopia .gameCanvas,
        .colorblind-tritanopia .gameCanvas {
            filter: var(--colorblind-filter);
        }
        
        /* Screen Reader Only */
        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border-width: 0;
        }
    `;
    document.head.appendChild(style);
}

// Auto-initialize
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        injectAccessibilityCSS();
        loadAccessibilitySettings();
    });
    
    // Expose to window
    window.ACCESSIBILITY = {
        load: loadAccessibilitySettings,
        save: saveAccessibilitySettings,
        get: getAccessibilitySettings,
        setReducedMotion,
        setHighContrast,
        setTextSize,
        setColorblindMode,
        setScreenReaderHints
    };
}
