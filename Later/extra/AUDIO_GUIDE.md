# 🎵 Audio Implementation Guide

## Overview
This guide explains where to add real audio files to enhance the game's sound experience.

## Required Audio Files

Create a new folder: `/workspaces/EchoMaze2.0/game/audio/` and add these files:

### 1. **Music Tracks** (MP3 or OGG format recommended)

- **`menu-music.mp3`** - Main menu background music (looping, relaxing)
- **`level-music.mp3`** - Playing levels background music (looping, tense/mysterious)
- **`boss-music.mp3`** - Boss fight music (looping, intense/epic)
- **`pre-boss-music.mp3`** - Pre-boss room music (looping, building tension)
- **`virus-scary-music.mp3`** - Virus dialogue music (ominous/scary, ~30 seconds)
- **`victory-music.mp3`** - Level complete/boss defeated (short, triumphant)

### 2. **Sound Effects** (MP3, OGG, or WAV format)

- **`core-scream.mp3`** - Core taking damage / screaming
- **`core-death.mp3`** - Core defeat final scream
- **`mortar-launch.mp3`** - Mortar enemy firing sound
- **`explosion.mp3`** - Explosion sound (currently using beep)
- **`rocket-fire.mp3`** - Bazooka firing sound
- **`rocket-explosion.mp3`** - Rocket explosion sound
- **`shield-reflect.mp3`** - Shield blocking projectile
- **`shield-break.mp3`** - Shield shattering
- **`wall-jump.mp3`** - Electric dash/jump sound
- **`generator-complete.mp3`** - Generator completion sound
- **`pickup.mp3`** - Item pickup sound

---

## Implementation Steps

### Step 1: Add Audio Files to HTML

Open `/workspaces/EchoMaze2.0/game/index.html` and add before the closing `</body>` tag:

```html
<!-- Audio Elements -->
<audio id="menuMusic" src="audio/menu-music.mp3" loop></audio>
<audio id="levelMusic" src="audio/level-music.mp3" loop></audio>
<audio id="bossMusicAudio" src="audio/boss-music.mp3" loop></audio>
<audio id="preBossMusic" src="audio/pre-boss-music.mp3" loop></audio>
<audio id="virusMusic" src="audio/virus-scary-music.mp3"></audio>
<audio id="victoryMusic" src="audio/victory-music.mp3"></audio>

<audio id="coreScreamSound" src="audio/core-scream.mp3"></audio>
<audio id="coreDeathSound" src="audio/core-death.mp3"></audio>
<audio id="mortarLaunchSound" src="audio/mortar-launch.mp3"></audio>
<audio id="explosionSound" src="audio/explosion.mp3"></audio>
<audio id="rocketFireSound" src="audio/rocket-fire.mp3"></audio>
<audio id="rocketExplosionSound" src="audio/rocket-explosion.mp3"></audio>
<audio id="shieldReflectSound" src="audio/shield-reflect.mp3"></audio>
<audio id="shieldBreakSound" src="audio/shield-break.mp3"></audio>
<audio id="wallJumpSound" src="audio/wall-jump.mp3"></audio>
<audio id="generatorCompleteSound" src="audio/generator-complete.mp3"></audio>
<audio id="pickupSound" src="audio/pickup.mp3"></audio>
```

### Step 2: Update audio.js

Open `/workspaces/EchoMaze2.0/game/js/audio.js` and add these functions:

```javascript
// Music Control
export function playMenuMusic() {
    const audio = document.getElementById('menuMusic');
    if (audio) {
        audio.currentTime = 0;
        audio.volume = 0.3;
        audio.play().catch(e => console.log('Menu music autoplay blocked:', e));
    }
}

export function stopMenuMusic() {
    const audio = document.getElementById('menuMusic');
    if (audio) audio.pause();
}

export function playLevelMusic() {
    const audio = document.getElementById('levelMusic');
    if (audio) {
        audio.currentTime = 0;
        audio.volume = 0.25;
        audio.play().catch(e => console.log('Level music autoplay blocked:', e));
    }
}

export function stopLevelMusic() {
    const audio = document.getElementById('levelMusic');
    if (audio) audio.pause();
}

export function playBossMusic() {
    const audio = document.getElementById('bossMusicAudio');
    if (audio) {
        audio.currentTime = 0;
        audio.volume = 0.4;
        audio.play().catch(e => console.log('Boss music autoplay blocked:', e));
    }
}

export function stopBossMusic() {
    const audio = document.getElementById('bossMusicAudio');
    if (audio) audio.pause();
}

export function playPreBossMusicReal() {
    const audio = document.getElementById('preBossMusic');
    if (audio) {
        audio.currentTime = 0;
        audio.volume = 0.3;
        audio.play().catch(e => console.log('Pre-boss music autoplay blocked:', e));
    }
}

export function stopPreBossMusicReal() {
    const audio = document.getElementById('preBossMusic');
    if (audio) audio.pause();
}

export function playVirusMusic() {
    const audio = document.getElementById('virusMusic');
    if (audio) {
        audio.currentTime = 0;
        audio.volume = 0.5;
        audio.play().catch(e => console.log('Virus music autoplay blocked:', e));
    }
}

export function playVictoryMusic() {
    const audio = document.getElementById('victoryMusic');
    if (audio) {
        audio.currentTime = 0;
        audio.volume = 0.4;
        audio.play().catch(e => console.log('Victory music autoplay blocked:', e));
    }
}

// Sound Effects
export function playCoreScream() {
    const audio = document.getElementById('coreScreamSound');
    if (audio) {
        audio.currentTime = 0;
        audio.volume = 0.6;
        audio.play().catch(() => {});
    }
}

export function playCoreDeathScream() {
    const audio = document.getElementById('coreDeathSound');
    if (audio) {
        audio.currentTime = 0;
        audio.volume = 0.7;
        audio.play().catch(() => {});
    }
}

export function playMortarLaunch() {
    const audio = document.getElementById('mortarLaunchSound');
    if (audio) {
        audio.currentTime = 0;
        audio.volume = 0.5;
        audio.play().catch(() => {});
    }
}

export function playExplosionReal() {
    const audio = document.getElementById('explosionSound');
    if (audio) {
        audio.currentTime = 0;
        audio.volume = 0.5;
        audio.play().catch(() => {});
    }
}

export function playGeneratorComplete() {
    const audio = document.getElementById('generatorCompleteSound');
    if (audio) {
        audio.currentTime = 0;
        audio.volume = 0.6;
        audio.play().catch(() => {});
    }
}

export function playPickup() {
    const audio = document.getElementById('pickupSound');
    if (audio) {
        audio.currentTime = 0;
        audio.volume = 0.5;
        audio.play().catch(() => {});
    }
}
```

### Step 3: Hook Up Audio Events

**In boss.js** - Add core scream when taking damage:
```javascript
// In damageCoreAt function
export function damageCoreAt(x, y, isDirect) {
    // ... existing code ...
    
    // Add after damage is applied:
    try {
        import('./audio.js').then(a => a.playCoreScream && a.playCoreScream());
    } catch {}
}

// When core is defeated:
if (b.core.hp <= 0) {
    if (!b.defeated) {
        // ... existing code ...
        
        try {
            import('./audio.js').then(a => a.playCoreDeathScream && a.playCoreDeathScream());
        } catch {}
    }
}
```

**In main.js** - Add menu and level music:
```javascript
// In showMenu function:
function showMenu() {
    // ... existing code ...
    
    // Stop all music
    try {
        stopLevelMusic();
        stopBossMusic();
        stopPreBossMusicReal();
    } catch {}
    
    // Start menu music
    try {
        playMenuMusic();
    } catch {}
}

// In startLevel function:
function startLevel(level) {
    // ... existing code ...
    
    // Stop menu music, start level music
    try {
        stopMenuMusic();
        playLevelMusic();
    } catch {}
}
```

**In boss.js** - Add boss and pre-boss music:
```javascript
// In loadPrepRoom function:
export function loadPrepRoom(currentTime) {
    // ... existing code ...
    
    try {
        import('./audio.js').then(a => a.playPreBossMusicReal && a.playPreBossMusicReal());
    } catch {}
}

// In spawnBossArena function:
export function spawnBossArena(currentTime) {
    // ... existing code ...
    
    try {
        import('./audio.js').then(a => {
            a.stopPreBossMusicReal && a.stopPreBossMusicReal();
            a.playBossMusic && a.playBossMusic();
        });
    } catch {}
}

// In virus dialogue section (already added above):
// When virus starts talking:
try {
    import('./audio.js').then(a => {
        a.stopBossMusic && a.stopBossMusic();
        a.playVirusMusic && a.playVirusMusic();
    });
} catch {}
```

---

## Free Music & Sound Resources

### Music Sources:
- **OpenGameArt.org** - Free game music
- **FreeMusicArchive.com** - Creative Commons music
- **Incompetech.com** - Royalty-free music by Kevin MacLeod
- **Purple Planet Music** - Free music for games

### Sound Effect Sources:
- **Freesound.org** - Community uploaded sounds
- **Zapsplat.com** - Free sound effects
- **Sonniss.com** - Free game audio GDC packs
- **OpenGameArt.org** - Sound effects section

---

## Quick Start (No Real Audio Yet)

If you don't have audio files ready, the game will continue to work with the existing beep sounds. The audio system is designed to fail gracefully with `.catch(() => {})` handlers.

To test with placeholder:
1. Create empty MP3 files or use any audio file
2. Rename them to match the filenames above
3. Place in `/workspaces/EchoMaze2.0/game/audio/`

---

## Volume Recommendations

- **Menu Music**: 0.3 (30%)
- **Level Music**: 0.25 (25%)
- **Boss Music**: 0.4 (40%)
- **Virus Music**: 0.5 (50%)
- **Sound Effects**: 0.5-0.7 (50-70%)

Adjust these in the code based on your actual audio file volumes!
