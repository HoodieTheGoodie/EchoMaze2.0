# Loading Screens & Accessibility Features

## Overview
Added comprehensive loading screens and accessibility options to improve user experience and make the game more inclusive.

## ✅ Features Implemented

### 1. Loading Screens
- **Visual Feedback**: Shows a loading overlay with animated spinner during level transitions
- **Custom Messages**: Different messages for each mode:
  - Normal levels: "Loading Level X - Generating maze..."
  - Level 11: "Loading Level 11 - The final challenge awaits..."
  - Endless Mode: "Endless Mode - Preparing infinite rooms..."
  - Custom Levels: "Custom Level - Loading your creation..."
- **Smooth Transitions**: Fade-in/out animations (0.3s duration)
- **API**: Global `window.LOADING` with methods:
  - `show(message, subtext)` - Display loading screen
  - `hide()` - Hide loading screen
  - `update(message, subtext)` - Update text while showing

### 2. Accessibility Settings

#### **Reduce Motion**
- Disables particle effects and animations for users sensitive to motion
- Automatically stops theme particle systems (Hero/Virus themes)
- Reduces animation speeds to near-instant

#### **High Contrast**
- Increases contrast by 50% for better visibility
- Adds thicker borders (3px) to buttons and interactive elements
- Helps users with visual impairments

#### **UI Text Size**
- Three size options: Small (0.9rem), Normal (1rem), Large (1.15rem)
- Scales all UI text proportionally
- Visual feedback with button opacity changes

#### **Colorblind Modes**
- **None**: Standard colors
- **Protanopia**: Red-blind filter (hue-rotate + desaturation)
- **Deuteranopia**: Green-blind filter
- **Tritanopia**: Blue-blind filter
- Applied to game canvas for better enemy/wall distinction

#### **Screen Reader Hints**
- Adds descriptive `aria-labels` to interactive elements
- Sets `aria-live="polite"` on body for status updates
- Improves navigation for users with screen readers

## 📁 New Files

### `/game/js/loading-screen.js` (50 lines)
```javascript
// Core functions:
export function showLoadingScreen(message, subtext)
export function hideLoadingScreen()
export function updateLoadingProgress(message, subtext)
```

### `/game/js/accessibility.js` (228 lines)
```javascript
// Settings management:
export function loadAccessibilitySettings()
export function saveAccessibilitySettings(settings)
export function getAccessibilitySettings()

// Individual setters:
export function setReducedMotion(enabled)
export function setHighContrast(enabled)
export function setTextSize(size)
export function setColorblindMode(mode)
export function setScreenReaderHints(enabled)
```

## 🔧 Modified Files

### `/game/index.html`
- **Lines 518-540**: Added loading screen HTML overlay with spinner animation
- **Lines 658-705**: Added accessibility settings section to settings menu
- **Line 1108**: Imported `loading-screen.js?ver=v20250112a`
- **Line 1109**: Imported `accessibility.js?ver=v20250112a`
- **Line 1110**: Updated main.js to `?ver=v20250112f`

### `/game/js/main.js` (v20250112f)
- **Lines 1109-1121**: Added loading screen display at start of `startLevel()`
- **Lines 1634-1711**: Added event handlers for all accessibility settings
  - Reduce Motion checkbox
  - High Contrast checkbox
  - Text Size buttons (Small/Normal/Large)
  - Colorblind Mode dropdown
  - Screen Reader Hints checkbox
- **Multiple locations**: Added `window.LOADING.hide()` after level initialization
  - Custom levels (line 1167)
  - Endless mode (line 1239)
  - Normal levels (line 1281)

### `/game/js/theme-manager.js` (v20250112d)
- **Lines 162-171**: Added reduced motion check in `startThemeEffects()`
- Skips all particle effects if `ACCESSIBILITY.reducedMotion` is enabled
- Keeps color changes but disables animations

## 🎮 User Experience

### Loading Screen Flow
1. User clicks level button
2. Loading screen appears immediately with appropriate message
3. Game initializes (maze generation, sprite loading, etc.)
4. Loading screen fades out after 500ms
5. Game is ready to play

### Accessibility Flow
1. User opens Settings menu
2. Scrolls to new "Accessibility" section
3. Toggles desired options
4. Settings are applied immediately
5. Settings persist in localStorage (key: `smg_accessibility_settings`)

## 🔒 Storage Keys
- `smg_accessibility_settings` - Accessibility preferences (JSON)
- Saved/loaded automatically on page load and settings change

## 🧪 Testing Checklist
- [x] Loading screens appear on level start
- [x] Loading screens hide after initialization
- [x] Reduce Motion disables theme particles
- [x] High Contrast increases visual clarity
- [x] Text Size scales UI properly
- [x] Colorblind filters apply correctly
- [x] Settings persist after refresh
- [x] No JavaScript errors in console

## 🎨 CSS Classes Added
- `.reduced-motion` - Disables animations
- `.high-contrast` - Boosts contrast
- `.text-small`, `.text-normal`, `.text-large` - Text size variants
- `.colorblind-protanopia/deuteranopia/tritanopia` - Colorblind filters
- `.sr-only` - Screen reader only elements

## 🚀 Future Enhancements
- Add loading progress bar for large levels
- Add more colorblind modes (monochrome, custom filters)
- Add dyslexic-friendly font option
- Add sound effect volume controls per category
- Add keyboard-only mode optimization
- Add closed captions for sound effects
