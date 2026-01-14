# EchoMaze Theme System

## Overview
The theme system provides stunning visual effects that transform the entire game's appearance. Themes are unlocked by completing Level 11 endings, giving players a real reward for experiencing the story.

## Available Themes

### 🔷 Default Theme (Cyan)
- **Color**: Classic cyan/blue (#00f6ff)
- **Effects**: Subtle moving scanlines for retro CRT feel
- **When**: Default theme, always available

### 🏆 Hero Theme (Green)
- **Unlock**: Complete the GOOD ending in Level 11
- **Secret Code**: ECHO-HERO
- **Color**: Vibrant green (#00ff88)
- **Visual Effects**:
  - Rising success particles from bottom of screen
  - Pulsing green glow on all UI elements (3s cycle)
  - Enhanced text shadows with triple-layer glow
  - Screen brightness boost (+15%)
  - Increased contrast and saturation
  - Particle trail effects in green

### 🦠 Virus Theme (Red)
- **Unlock**: Complete the BAD ending in Level 11
- **Secret Code**: ECHO-VIRUS
- **Color**: Corrupted red (#ff4455)
- **Visual Effects**:
  - Random glitch squares appearing across screen
  - Scanline interference effects
  - UI elements shake/glitch animation
  - Flickering opacity effect (0.15s cycle)
  - Screen corruption with hue shift
  - Glitch particles and static overlays

## Technical Implementation

### CSS Variables
Themes dynamically update these CSS custom properties:
- `--theme-primary`: Main UI color
- `--theme-accent`: Highlight color
- `--theme-danger`: Warning/error color
- `--theme-success`: Success/positive color
- `--theme-text-glow`: Text shadow effects
- `--theme-box-shadow`: Container glow effects
- `--theme-border-glow`: Border effects
- `--theme-particle-color`: Particle system color
- `--theme-scanline-color`: Scanline overlay color

### Visual Effects
- **Particle System**: Full-screen canvas overlay (z-index: 9998)
- **CSS Animations**: Keyframe-based pulsing and glitching
- **CSS Filters**: Brightness, contrast, saturation, hue adjustments
- **Real-time Rendering**: RequestAnimationFrame for smooth 60fps effects

### Files
- `theme-manager.js`: Core theme engine (397 lines)
  - Theme definitions with colors and effect properties
  - Particle animation system
  - CSS injection for dynamic effects
  - localStorage persistence
  - Window API exposure

### Window API
Access themes programmatically via console or scripts:
```javascript
window.THEME.set('hero');      // Activate hero theme
window.THEME.set('virus');     // Activate virus theme
window.THEME.reset();          // Reset to default
window.THEME.current();        // Get current theme name
window.THEME.list();           // List all available themes
```

## Dev Panel Integration
The Secret Codes tab now includes a Visual Themes section with buttons to instantly switch between all themes for testing/preview purposes.

## Auto-Activation
Themes automatically activate when players complete Level 11:
- Good ending → Hero theme activates with console message
- Bad ending → Virus theme activates with console message
- Theme persists across sessions via localStorage

## Performance
- Particle systems use requestAnimationFrame for optimal performance
- Canvas is pointer-events: none to avoid input blocking
- Effects automatically resize with window
- Cleanup functions prevent memory leaks when switching themes

## Future Enhancements
Potential additions:
- More themes unlocked by other achievements
- Theme-specific sound effects
- Color customization options
- Theme intensity slider
- Additional particle patterns
