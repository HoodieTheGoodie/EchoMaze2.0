/**
 * SUPER ENHANCED Theme Manager
 * Premium visual themes with TONS of particle effects, animations, and screen FX
 */

const THEME_KEY = 'smg_active_theme';
const UNLOCK_KEY = 'smg_unlocked_themes';

const THEMES = {
    default: {
        name: 'Default',
        primaryColor: '#00f6ff',
        accentColor: '#00d9ff',
        dangerColor: '#ff4455',
        successColor: '#00ff88',
        textGlow: '0 0 12px rgba(0, 246, 255, 1), 0 0 25px rgba(0, 246, 255, 0.6)',
        boxShadow: '0 0 35px rgba(0, 246, 255, 0.5), 0 0 70px rgba(0, 246, 255, 0.3)',
        borderGlow: '0 0 12px rgba(0, 246, 255, 0.7)',
        filter: 'none',
        particleColor: '#00f6ff',
        scanlineColor: 'rgba(0, 246, 255, 0.04)',
        locked: false
    },
    hero: {
        name: 'Hero Mode',
        primaryColor: '#00ff88',
        accentColor: '#00dd77',
        dangerColor: '#ff4455',
        successColor: '#00ffaa',
        textGlow: '0 0 25px rgba(0, 255, 136, 1), 0 0 50px rgba(0, 255, 136, 0.9), 0 0 75px rgba(0, 255, 136, 0.6), 0 0 100px rgba(0, 255, 136, 0.4)',
        boxShadow: '0 0 60px rgba(0, 255, 136, 1), 0 0 120px rgba(0, 255, 136, 0.6), inset 0 0 50px rgba(0, 255, 136, 0.25)',
        borderGlow: '0 0 25px rgba(0, 255, 136, 1), 0 0 50px rgba(0, 255, 136, 0.7)',
        filter: 'brightness(1.25) contrast(1.2) saturate(1.35)',
        particleColor: '#00ff88',
        scanlineColor: 'rgba(0, 255, 136, 0.07)',
        pulseAnimation: true,
        vignette: 'radial-gradient(ellipse at center, transparent 0%, rgba(0, 255, 136, 0.2) 100%)',
        locked: true
    },
    virus: {
        name: 'Virus Mode',
        primaryColor: '#ff4455',
        accentColor: '#ff2244',
        dangerColor: '#aa0033',
        successColor: '#ff6677',
        textGlow: '0 0 25px rgba(255, 68, 85, 1), 0 0 50px rgba(255, 68, 85, 0.9), 0 0 75px rgba(255, 68, 85, 0.6), 0 0 100px rgba(255, 68, 85, 0.4)',
        boxShadow: '0 0 60px rgba(255, 68, 85, 1), 0 0 120px rgba(255, 68, 85, 0.6), inset 0 0 50px rgba(255, 68, 85, 0.25)',
        borderGlow: '0 0 25px rgba(255, 68, 85, 1), 0 0 50px rgba(255, 68, 85, 0.7)',
        filter: 'brightness(1.2) contrast(1.25) saturate(1.45) hue-rotate(-10deg)',
        particleColor: '#ff4455',
        scanlineColor: 'rgba(255, 68, 85, 0.07)',
        glitchEffect: true,
        vignette: 'radial-gradient(ellipse at center, transparent 0%, rgba(255, 68, 85, 0.25) 100%)',
        locked: true
    }
};

export function getCurrentTheme() {
    try {
        const saved = localStorage.getItem(THEME_KEY);
        return saved && THEMES[saved] ? saved : 'default';
    } catch {
        return 'default';
    }
}

export function isThemeUnlocked(themeName) {
    if (themeName === 'default') return true;
    
    try {
        const unlocked = localStorage.getItem(UNLOCK_KEY);
        if (unlocked) {
            const themes = JSON.parse(unlocked);
            return themes.includes(themeName);
        }
    } catch {}
    return false;
}

export function unlockTheme(themeName) {
    if (themeName === 'default') return true;
    
    try {
        let unlocked = [];
        const existing = localStorage.getItem(UNLOCK_KEY);
        if (existing) {
            unlocked = JSON.parse(existing);
        }
        
        if (!unlocked.includes(themeName)) {
            unlocked.push(themeName);
            localStorage.setItem(UNLOCK_KEY, JSON.stringify(unlocked));
            console.log(`🔓 Theme unlocked: ${THEMES[themeName]?.name || themeName}`);
            return true;
        }
    } catch (e) {
        console.warn('Failed to unlock theme:', e);
    }
    return false;
}

export function setTheme(themeName) {
    if (!THEMES[themeName]) {
        console.warn(`[THEME] Unknown theme: ${themeName}`);
        return false;
    }
    
    // Check if theme is unlocked
    if (!isThemeUnlocked(themeName)) {
        console.warn(`[THEME] Theme locked: ${THEMES[themeName].name}`);
        return false;
    }
    
    try {
        localStorage.setItem(THEME_KEY, themeName);
        applyTheme(themeName);
        console.log(`✨ [THEME] Applied: ${THEMES[themeName].name}`);
        return true;
    } catch (e) {
        console.warn('[THEME] Failed to save theme:', e);
        return false;
    }
}

export function resetTheme() {
    return setTheme('default');
}

export function applyTheme(themeName = null) {
    const theme = THEMES[themeName || getCurrentTheme()];
    if (!theme) return;
    
    const root = document.documentElement;
    
    // Apply CSS variables
    root.style.setProperty('--theme-primary', theme.primaryColor);
    root.style.setProperty('--theme-accent', theme.accentColor);
    root.style.setProperty('--theme-danger', theme.dangerColor);
    root.style.setProperty('--theme-success', theme.successColor);
    root.style.setProperty('--theme-text-glow', theme.textGlow);
    root.style.setProperty('--theme-box-shadow', theme.boxShadow);
    root.style.setProperty('--theme-border-glow', theme.borderGlow);
    root.style.setProperty('--theme-particle-color', theme.particleColor);
    root.style.setProperty('--theme-scanline-color', theme.scanlineColor);

    // Apply filters
    const gameCanvas = document.getElementById('gameCanvas');
    const menuHub = document.getElementById('menuHub');
    if (gameCanvas) gameCanvas.style.filter = theme.filter || 'none';
    if (menuHub) menuHub.style.filter = theme.filter || 'none';

    // Update body class
    document.body.classList.remove('theme-default', 'theme-hero', 'theme-virus');
    document.body.classList.add(`theme-${themeName || getCurrentTheme()}`);

    // Start visual effects
    startThemeEffects(themeName || getCurrentTheme(), theme);
}

function startThemeEffects(themeName, theme) {
        // Check for reduced motion accessibility setting
        if (window.ACCESSIBILITY) {
            const settings = window.ACCESSIBILITY.get();
            if (settings && settings.reducedMotion) {
                console.log('[THEME] Reduced motion enabled, skipping particle effects');
                stopThemeEffects();
                return;
            }
        }

    stopThemeEffects();

    if (themeName === 'hero' && theme.pulseAnimation) {
        startHeroPulse();
        startHeroParticles();
    } else if (themeName === 'virus' && theme.glitchEffect) {
        startVirusGlitch();
        startVirusParticles();
    } else {
        startDefaultScanlines();
    }
}

function stopThemeEffects() {
    const overlay = document.getElementById('themeEffectOverlay');
    if (overlay) overlay.remove();

    const heroStyles = document.getElementById('heroThemeStyles');
    const virusStyles = document.getElementById('virusThemeStyles');
    if (heroStyles) heroStyles.remove();
    if (virusStyles) virusStyles.remove();

    if (window.themeEffectInterval) {
        clearInterval(window.themeEffectInterval);
        window.themeEffectInterval = null;
    }
    if (window.themeAnimationFrame) {
        cancelAnimationFrame(window.themeAnimationFrame);
        window.themeAnimationFrame = null;
    }
}

// ============ HERO THEME - ULTIMATE VICTORY EFFECTS ============
function startHeroPulse() {
    const style = document.createElement('style');
    style.id = 'heroThemeStyles';
    style.textContent = `
        @keyframes heroPulse {
            0%, 100% { 
                filter: drop-shadow(0 0 20px rgba(0, 255, 136, 1)) 
                        drop-shadow(0 0 40px rgba(0, 255, 136, 0.7)); 
            }
            50% { 
                filter: drop-shadow(0 0 45px rgba(0, 255, 136, 1)) 
                        drop-shadow(0 0 80px rgba(0, 255, 136, 0.9)); 
            }
        }
        @keyframes heroShimmer {
            0%, 100% { opacity: 0.85; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.03); }
        }
        @keyframes heroGlowWave {
            0% { box-shadow: 0 0 25px rgba(0, 255, 136, 0.5), inset 0 0 25px rgba(0, 255, 136, 0.25); }
            50% { box-shadow: 0 0 55px rgba(0, 255, 136, 0.9), inset 0 0 40px rgba(0, 255, 136, 0.5); }
            100% { box-shadow: 0 0 25px rgba(0, 255, 136, 0.5), inset 0 0 25px rgba(0, 255, 136, 0.25); }
        }
        @keyframes heroFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
        }
        .theme-hero #menuHub .menu-container,
        .theme-hero #pauseMenu,
        .theme-hero #gameOverMenu,
        .theme-hero #levelCompleteMenu {
            animation: heroPulse 2s ease-in-out infinite, heroGlowWave 2.5s ease-in-out infinite;
        }
        .theme-hero .ui-stat {
            text-shadow: 0 0 25px rgba(0, 255, 136, 1), 
                         0 0 50px rgba(0, 255, 136, 0.9), 
                         0 0 75px rgba(0, 255, 136, 0.6) !important;
            animation: heroShimmer 1.8s ease-in-out infinite;
        }
        .theme-hero button:hover {
            box-shadow: 0 0 40px rgba(0, 255, 136, 1), 
                        inset 0 0 25px rgba(0, 255, 136, 0.4) !important;
            transform: scale(1.08);
            animation: heroFloat 1s ease-in-out infinite;
        }
    `;
    document.head.appendChild(style);
}

function startHeroParticles() {
    createEffectOverlay('hero');
    
    let particles = [];
    let sparkles = [];
    let waves = [];
    let trails = [];
    const canvas = document.getElementById('themeParticleCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let time = 0;
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        time += 0.016;
        
        // TONS of rising victory particles
        if (Math.random() < 0.7) {
            particles.push({
                x: Math.random() * canvas.width,
                y: canvas.height + 30,
                vy: -3 - Math.random() * 4,
                vx: (Math.random() - 0.5) * 1.5,
                size: 2 + Math.random() * 5,
                alpha: 0.7 + Math.random() * 0.3,
                life: 1,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.15
            });
        }
        
        // Sparkles everywhere
        if (Math.random() < 0.5) {
            sparkles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: 2 + Math.random() * 4,
                alpha: 1,
                life: 1,
                pulsePhase: Math.random() * Math.PI * 2
            });
        }
        
        // Expanding wave effects
        if (Math.random() < 0.04) {
            waves.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: 10,
                maxRadius: 150 + Math.random() * 150,
                alpha: 0.9,
                speed: 3 + Math.random() * 3
            });
        }
        
        // Trail effects
        if (Math.random() < 0.3) {
            trails.push({
                x: Math.random() * canvas.width,
                y: -10,
                vy: 2 + Math.random() * 3,
                length: 20 + Math.random() * 40,
                alpha: 0.6,
                life: 1
            });
        }
        
        // Draw trails
        trails = trails.filter(t => {
            t.y += t.vy;
            t.alpha *= 0.98;
            t.life -= 0.01;
            
            if (t.y > canvas.height + 50 || t.life <= 0) return false;
            
            const gradient = ctx.createLinearGradient(t.x, t.y - t.length, t.x, t.y);
            gradient.addColorStop(0, 'rgba(0, 255, 136, 0)');
            gradient.addColorStop(1, `rgba(0, 255, 136, ${t.alpha * 0.5})`);
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(t.x, t.y - t.length);
            ctx.lineTo(t.x, t.y);
            ctx.stroke();
            
            return true;
        });
        
        // Draw waves
        waves = waves.filter(w => {
            w.radius += w.speed;
            w.alpha *= 0.95;
            
            if (w.radius >= w.maxRadius || w.alpha <= 0.01) return false;
            
            ctx.strokeStyle = `rgba(0, 255, 136, ${w.alpha * 0.6})`;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#00ff88';
            ctx.beginPath();
            ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
            ctx.stroke();
            
            return true;
        });
        
        // Draw particles
        particles = particles.filter(p => {
            p.y += p.vy;
            p.x += p.vx;
            p.alpha *= 0.987;
            p.life -= 0.003;
            p.rotation += p.rotSpeed;
            
            if (p.life <= 0 || p.alpha <= 0.01 || p.y < -50) return false;
            
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
            gradient.addColorStop(0, `rgba(0, 255, 136, ${p.alpha})`);
            gradient.addColorStop(0.6, `rgba(0, 255, 136, ${p.alpha * 0.5})`);
            gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
            
            ctx.fillStyle = gradient;
            ctx.shadowBlur = 25;
            ctx.shadowColor = '#00ff88';
            ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
            
            ctx.restore();
            
            return true;
        });
        
        // Draw sparkles
        sparkles = sparkles.filter(s => {
            s.life -= 0.015;
            s.alpha = Math.sin(s.pulsePhase) * 0.6 + 0.4;
            s.pulsePhase += 0.25;
            
            if (s.life <= 0) return false;
            
            ctx.fillStyle = `rgba(0, 255, 136, ${s.alpha * s.life})`;
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#00ff88';
            
            // 4-pointed star
            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                const angle = (Math.PI / 2) * i;
                const x = Math.cos(angle) * s.size * 2.5;
                const y = Math.sin(angle) * s.size * 2.5;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            
            return true;
        });
        
        // Vignette
        const vignetteGradient = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, canvas.width * 0.65
        );
        vignetteGradient.addColorStop(0, 'rgba(0, 255, 136, 0)');
        vignetteGradient.addColorStop(1, 'rgba(0, 255, 136, 0.15)');
        ctx.fillStyle = vignetteGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        window.themeAnimationFrame = requestAnimationFrame(animate);
    }
    
    animate();
}

// ============ VIRUS THEME - EXTREME CORRUPTION EFFECTS ============
function startVirusGlitch() {
    const style = document.createElement('style');
    style.id = 'virusThemeStyles';
    style.textContent = `
        @keyframes virusGlitch {
            0%, 85%, 100% { transform: translate(0); }
            86% { transform: translate(-3px, 2px) skewX(2deg); }
            87% { transform: translate(3px, -2px) skewX(-2deg); }
            88% { transform: translate(-2px, 3px) skewX(1deg); }
            89% { transform: translate(2px, -3px) skewX(-1deg); }
        }
        @keyframes virusFlicker {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.92; }
        }
        @keyframes virusShake {
            0%, 100% { transform: translateX(0); }
            10% { transform: translateX(-2px); }
            20% { transform: translateX(2px); }
            30% { transform: translateX(-2px); }
            40% { transform: translateX(2px); }
            50% { transform: translateX(0); }
        }
        @keyframes virusCorrupt {
            0% { filter: hue-rotate(0deg); }
            25% { filter: hue-rotate(5deg); }
            50% { filter: hue-rotate(0deg); }
            75% { filter: hue-rotate(-5deg); }
            100% { filter: hue-rotate(0deg); }
        }
        .theme-virus #menuHub .menu-container,
        .theme-virus #pauseMenu,
        .theme-virus #gameOverMenu,
        .theme-virus #levelCompleteMenu {
            animation: virusGlitch 0.4s infinite, virusFlicker 0.12s infinite, virusCorrupt 3s ease-in-out infinite;
        }
        .theme-virus .ui-stat {
            text-shadow: 0 0 25px rgba(255, 68, 85, 1), 
                         0 0 50px rgba(255, 68, 85, 0.9), 
                         0 0 75px rgba(255, 68, 85, 0.6) !important;
            animation: virusFlicker 0.15s infinite, virusShake 0.5s infinite;
        }
        .theme-virus button:hover {
            box-shadow: 0 0 40px rgba(255, 68, 85, 1), 
                        inset 0 0 25px rgba(255, 68, 85, 0.4) !important;
            animation: virusGlitch 0.2s infinite;
        }
    `;
    document.head.appendChild(style);
}

function startVirusParticles() {
    createEffectOverlay('virus');
    
    let glitchSquares = [];
    let corruptionLines = [];
    let staticNoise = [];
    let scanlines = [];
    const canvas = document.getElementById('themeParticleCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let time = 0;
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        time += 0.016;
        
        // TONS of glitch squares
        if (Math.random() < 0.25) {
            glitchSquares.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                width: 15 + Math.random() * 80,
                height: 3 + Math.random() * 15,
                alpha: 0.5 + Math.random() * 0.5,
                life: 1,
                vx: (Math.random() - 0.5) * 8
            });
        }
        
        // Corruption lines
        if (Math.random() < 0.15) {
            corruptionLines.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                length: 50 + Math.random() * 200,
                angle: Math.random() * Math.PI * 2,
                alpha: 0.6 + Math.random() * 0.4,
                life: 1,
                thickness: 1 + Math.random() * 3
            });
        }
        
        // Static noise particles
        if (Math.random() < 0.6) {
            staticNoise.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: 1 + Math.random() * 2,
                alpha: 0.4 + Math.random() * 0.6,
                life: 0.3
            });
        }
        
        // Moving scanline interference
        if (Math.random() < 0.08) {
            scanlines.push({
                y: Math.random() * canvas.height,
                height: 2 + Math.random() * 5,
                alpha: 0.7,
                speed: 2 + Math.random() * 4,
                life: 1
            });
        }
        
        // Draw scanlines
        scanlines = scanlines.filter(s => {
            s.y += s.speed;
            s.alpha *= 0.95;
            s.life -= 0.02;
            
            if (s.y > canvas.height || s.life <= 0) return false;
            
            ctx.fillStyle = `rgba(255, 68, 85, ${s.alpha * 0.4})`;
            ctx.fillRect(0, s.y, canvas.width, s.height);
            
            return true;
        });
        
        // Draw static noise
        staticNoise = staticNoise.filter(n => {
            n.life -= 0.1;
            
            if (n.life <= 0) return false;
            
            ctx.fillStyle = `rgba(255, 68, 85, ${n.alpha * n.life})`;
            ctx.fillRect(n.x, n.y, n.size, n.size);
            
            return true;
        });
        
        // Draw corruption lines
        corruptionLines = corruptionLines.filter(line => {
            line.life -= 0.03;
            line.alpha *= 0.96;
            
            if (line.life <= 0 || line.alpha <= 0.01) return false;
            
            ctx.save();
            ctx.translate(line.x, line.y);
            ctx.rotate(line.angle);
            
            const gradient = ctx.createLinearGradient(0, 0, line.length, 0);
            gradient.addColorStop(0, 'rgba(255, 68, 85, 0)');
            gradient.addColorStop(0.5, `rgba(255, 68, 85, ${line.alpha})`);
            gradient.addColorStop(1, 'rgba(255, 68, 85, 0)');
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = line.thickness;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff4455';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(line.length, 0);
            ctx.stroke();
            
            ctx.restore();
            
            return true;
        });
        
        // Draw glitch squares
        glitchSquares = glitchSquares.filter(g => {
            g.life -= 0.04;
            g.alpha = g.life * 0.8;
            g.x += g.vx;
            
            if (g.life <= 0 || g.x < -g.width || g.x > canvas.width + g.width) return false;
            
            ctx.fillStyle = `rgba(255, 68, 85, ${g.alpha})`;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff4455';
            ctx.fillRect(g.x, g.y, g.width, g.height);
            
            // Random chromatic aberration
            if (Math.random() < 0.3) {
                ctx.fillStyle = `rgba(255, 0, 0, ${g.alpha * 0.3})`;
                ctx.fillRect(g.x - 2, g.y, g.width, g.height);
                ctx.fillStyle = `rgba(0, 255, 255, ${g.alpha * 0.3})`;
                ctx.fillRect(g.x + 2, g.y, g.width, g.height);
            }
            
            return true;
        });
        
        // Full screen interference occasionally
        if (Math.random() < 0.02) {
            ctx.fillStyle = `rgba(255, 68, 85, ${0.05 + Math.random() * 0.1})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // Vignette
        const vignetteGradient = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, canvas.width * 0.65
        );
        vignetteGradient.addColorStop(0, 'rgba(255, 68, 85, 0)');
        vignetteGradient.addColorStop(1, 'rgba(255, 68, 85, 0.2)');
        ctx.fillStyle = vignetteGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        window.themeAnimationFrame = requestAnimationFrame(animate);
    }
    
    animate();
}

// ============ DEFAULT THEME - ENHANCED SCANLINES ============
function startDefaultScanlines() {
    createEffectOverlay('default');
    
    const canvas = document.getElementById('themeParticleCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let offset = 0;
    let time = 0;
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        time += 0.016;
        
        // Subtle moving scanlines only - no flicker
        ctx.fillStyle = 'rgba(0, 246, 255, 0.03)';
        for (let y = offset; y < canvas.height; y += 4) {
            const alpha = 0.025 + Math.sin(time * 2 + y * 0.01) * 0.01;
            ctx.fillStyle = `rgba(0, 246, 255, ${alpha})`;
            ctx.fillRect(0, y, canvas.width, 2);
        }
        
        offset = (offset + 0.7) % 4;
        
        window.themeAnimationFrame = requestAnimationFrame(animate);
    }
    
    animate();
}

// ============ HELPER FUNCTIONS ============
function createEffectOverlay(themeName) {
    const existing = document.getElementById('themeEffectOverlay');
    if (existing) existing.remove();
    
    const overlay = document.createElement('div');
    overlay.id = 'themeEffectOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9998;
        opacity: 0.9;
    `;
    
    const canvas = document.createElement('canvas');
    canvas.id = 'themeParticleCanvas';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    
    overlay.appendChild(canvas);
    document.body.appendChild(overlay);
    
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

export function getAvailableThemes() {
    return Object.keys(THEMES).map(key => ({
        id: key,
        name: THEMES[key].name,
        active: getCurrentTheme() === key,
        locked: !isThemeUnlocked(key)
    }));
}

// Auto-apply on load
if (typeof window !== 'undefined') {
    applyTheme();
    
    window.THEME = {
        set: setTheme,
        reset: resetTheme,
        current: getCurrentTheme,
        list: getAvailableThemes,
        unlock: unlockTheme,
        isUnlocked: isThemeUnlocked
    };
}
