// audio.js - Simple Web Audio cues for skill checks

let ctx = null;
let preBossLoopId = null;

// Master volume control (0.0 to 1.0)
let masterVolume = 1.0;

// Get master volume from settings
export function getMasterVolume() {
  if (typeof window !== 'undefined' && window.gameState && window.gameState.settings) {
    return window.gameState.settings.masterVolume !== undefined ? window.gameState.settings.masterVolume : 1.0;
  }
  return masterVolume;
}

// Set master volume (0.0 to 1.0)
export function setMasterVolume(volume) {
  masterVolume = Math.max(0, Math.min(1, volume));
  if (typeof window !== 'undefined' && window.gameState && window.gameState.settings) {
    window.gameState.settings.masterVolume = masterVolume;
  }
}

function getCtx() {
  if (!ctx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    ctx = new AudioContext();
  }
  return ctx;
}

function playTone({ freq = 440, duration = 0.12, type = 'sine', gain = 0.06, attack = 0.005, release = 0.05 } = {}) {
  const audio = getCtx();
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  
  // Apply master volume
  const adjustedGain = gain * getMasterVolume();
  amp.gain.value = 0.0;
  osc.connect(amp);
  amp.connect(audio.destination);

  const now = audio.currentTime;
  const end = now + duration + release;
  amp.gain.setValueAtTime(0, now);
  amp.gain.linearRampToValueAtTime(adjustedGain, now + attack);
  amp.gain.setValueAtTime(adjustedGain, now + duration);
  amp.gain.linearRampToValueAtTime(0.0001, end);

  osc.start(now);
  osc.stop(end);
}

export function playSkillSpawn() {
  // Subtle cue when a skill check begins
  playTone({ freq: 880, duration: 0.08, type: 'triangle', gain: 0.05 });
}

export function playSkillSuccess() {
  // Up-chirp style success
  playTone({ freq: 900, duration: 0.07, type: 'sine', gain: 0.06 });
  setTimeout(() => playTone({ freq: 1200, duration: 0.09, type: 'sine', gain: 0.06 }), 60);
}

export function playSkillFail() {
  // Short buzz on fail
  playTone({ freq: 220, duration: 0.12, type: 'square', gain: 0.05, attack: 0.002, release: 0.08 });
}

// --- New cues for Flying Pig and Shield ---
export function playPigTelegraph() {
  // Quick alternating ping to signal an incoming dash
  playTone({ freq: 700, duration: 0.07, type: 'triangle', gain: 0.06 });
  setTimeout(() => playTone({ freq: 980, duration: 0.07, type: 'triangle', gain: 0.06 }), 70);
}

export function playPigDash() {
  // Brief whoosh-like downward blip
  playTone({ freq: 520, duration: 0.06, type: 'sawtooth', gain: 0.07 });
}

export function playShieldUp() {
  // Subtle shimmer
  playTone({ freq: 1200, duration: 0.05, type: 'sine', gain: 0.05 });
}

export function playShieldReflect() {
  // Metallic clink
  playTone({ freq: 1500, duration: 0.05, type: 'square', gain: 0.06, attack: 0.001, release: 0.05 });
}

export function playShieldBreak() {
  // Crack/shatter: quick downward double-chirp
  playTone({ freq: 900, duration: 0.05, type: 'square', gain: 0.07, attack: 0.001, release: 0.05 });
  setTimeout(() => playTone({ freq: 500, duration: 0.07, type: 'triangle', gain: 0.06 }), 40);
}

export function playShieldRecharge() {
  // Soft rising chime to indicate shield ready
  playTone({ freq: 650, duration: 0.05, type: 'sine', gain: 0.05 });
  setTimeout(() => playTone({ freq: 980, duration: 0.06, type: 'sine', gain: 0.05 }), 60);
}

export function playPigHit() {
  // Heavier thunk to indicate pig took a hit
  playTone({ freq: 260, duration: 0.08, type: 'square', gain: 0.08, attack: 0.001, release: 0.06 });
  setTimeout(() => playTone({ freq: 520, duration: 0.06, type: 'triangle', gain: 0.06 }), 40);
}

// Subtle hum when shield is active
export function playShieldHum() {
  playTone({ freq: 320, duration: 0.12, type: 'sine', gain: 0.025 });
}

// Stronger shatter on shield break (vs wall shield break cue)
export function playShieldShatter() {
  playTone({ freq: 1100, duration: 0.06, type: 'square', gain: 0.07, attack: 0.001, release: 0.04 });
  setTimeout(() => playTone({ freq: 700, duration: 0.06, type: 'triangle', gain: 0.06 }), 50);
  setTimeout(() => playTone({ freq: 420, duration: 0.08, type: 'sine', gain: 0.05 }), 110);
}

// --- Chaser movement/jump cues ---
export function playChaserTelegraph() {
  // Short rising blip
  playTone({ freq: 600, duration: 0.05, type: 'triangle', gain: 0.06 });
  setTimeout(() => playTone({ freq: 820, duration: 0.05, type: 'triangle', gain: 0.06 }), 50);
}

export function playChaserJump() {
  // Whoosh for jump over wall
  playTone({ freq: 420, duration: 0.07, type: 'sawtooth', gain: 0.07 });
}

export function playStep() {
  // Quiet step click
  playTone({ freq: 260, duration: 0.02, type: 'square', gain: 0.03, attack: 0.001, release: 0.03 });
}

// --- Seeker cues ---
export function playSeekerAlert() {
  // Quick two-tone when Seeker acquires target
  playTone({ freq: 680, duration: 0.05, type: 'triangle', gain: 0.06 });
  setTimeout(() => playTone({ freq: 920, duration: 0.05, type: 'triangle', gain: 0.06 }), 60);
}

export function playSeekerBeep() {
  // Subtle periodic beep while chasing
  playTone({ freq: 750, duration: 0.03, type: 'square', gain: 0.04, attack: 0.001, release: 0.03 });
}

// --- Zap Trap cues ---
export function playZapPlace() {
  // Soft electric arming
  playTone({ freq: 640, duration: 0.05, type: 'triangle', gain: 0.05 });
}
export function playZapTrigger() {
  // Crackle zap burst
  playTone({ freq: 1200, duration: 0.04, type: 'square', gain: 0.08, attack: 0.001, release: 0.04 });
  setTimeout(() => playTone({ freq: 900, duration: 0.05, type: 'triangle', gain: 0.06 }), 40);
}
export function playZapExpire() {
  // Gentle power-down
  playTone({ freq: 480, duration: 0.06, type: 'sine', gain: 0.04 });
}

// --- Wall Jump cue ---
export function playWallJump() {
  // Electric zap sound for wall jumping
  playTone({ freq: 1800, duration: 0.06, type: 'sawtooth', gain: 0.08, attack: 0.001, release: 0.05 });
  setTimeout(() => playTone({ freq: 1400, duration: 0.04, type: 'triangle', gain: 0.06 }), 30);
  setTimeout(() => playTone({ freq: 1000, duration: 0.03, type: 'sine', gain: 0.04 }), 55);
}

// --- Lose cue ---
export function playLose() {
  // Small descending chime to indicate defeat
  playTone({ freq: 620, duration: 0.06, type: 'triangle', gain: 0.06 });
  setTimeout(() => playTone({ freq: 420, duration: 0.08, type: 'triangle', gain: 0.06 }), 60);
  setTimeout(() => playTone({ freq: 280, duration: 0.10, type: 'sine', gain: 0.05 }), 140);
}

// --- Batter cues ---
export function playBatterRage() {
  // Low thump + short chirp to indicate aggressive state
  playTone({ freq: 180, duration: 0.08, type: 'square', gain: 0.07, attack: 0.002, release: 0.04 });
  setTimeout(() => playTone({ freq: 420, duration: 0.06, type: 'triangle', gain: 0.06 }), 70);
}

export function playBatterFlee() {
  // Light quick chirp for fleeing pitter-patter; can be played periodically
  playTone({ freq: 780, duration: 0.04, type: 'square', gain: 0.04, attack: 0.001, release: 0.03 });
}

// --- Mortar cues ---
export function playMortarWarning() {
  // Beep-beep lock tone
  playTone({ freq: 740, duration: 0.05, type: 'triangle', gain: 0.06 });
  setTimeout(() => playTone({ freq: 740, duration: 0.05, type: 'triangle', gain: 0.06 }), 200);
}
export function playMortarFire() {
  // Low thunk launch
  playTone({ freq: 220, duration: 0.08, type: 'sawtooth', gain: 0.07, attack: 0.002, release: 0.06 });
}
export function playMortarExplosion() {
  // Heavy explosion: layered tones
  playTone({ freq: 160, duration: 0.12, type: 'square', gain: 0.09, attack: 0.001, release: 0.08 });
  setTimeout(() => playTone({ freq: 90, duration: 0.14, type: 'sine', gain: 0.07 }), 60);
}
export function playMortarSelfDestruct() {
  // Distorted, lower pitched boom for self-hit
  playTone({ freq: 120, duration: 0.14, type: 'square', gain: 0.09, attack: 0.001, release: 0.1 });
  setTimeout(() => playTone({ freq: 70, duration: 0.18, type: 'sine', gain: 0.07 }), 80);
}

// --- Simple pre-boss background loop ---
export function startPreBossMusic() {
  if (preBossLoopId) return;
  const pattern = () => {
    // Low ominous pulse + airy overtones
    playTone({ freq: 140, duration: 0.35, type: 'sine', gain: 0.05 });
    setTimeout(() => playTone({ freq: 210, duration: 0.28, type: 'triangle', gain: 0.045 }), 160);
    setTimeout(() => playTone({ freq: 420, duration: 0.22, type: 'sawtooth', gain: 0.03 }), 320);
    setTimeout(() => playTone({ freq: 280, duration: 0.25, type: 'sine', gain: 0.035 }), 560);
  };
  pattern();
  preBossLoopId = setInterval(pattern, 1200);
}

export function stopPreBossMusic() {
  if (preBossLoopId) {
    clearInterval(preBossLoopId);
    preBossLoopId = null;
  }
}

// --- Rocket SFX ---
export function playRocketFire() {
  // Quick whoosh on fire
  playTone({ freq: 360, duration: 0.08, type: 'sawtooth', gain: 0.07, attack: 0.002, release: 0.06 });
}
export function playRocketExplosion() {
  // Punchy layered boom
  playTone({ freq: 200, duration: 0.12, type: 'square', gain: 0.09, attack: 0.001, release: 0.08 });
  setTimeout(() => playTone({ freq: 120, duration: 0.14, type: 'sine', gain: 0.07 }), 50);
}

// --- Reload SFX ---
export function playReload() {
  // A quick mechanical click + chirp
  playTone({ freq: 420, duration: 0.05, type: 'square', gain: 0.06, attack: 0.001, release: 0.04 });
  setTimeout(() => playTone({ freq: 820, duration: 0.06, type: 'triangle', gain: 0.05 }), 40);
}

// --- Boss Warning SFX (intro cutscene loop) ---
let _warnInterval = null;
export function startBossWarningLoop() {
  stopBossWarningLoop();
  const playBeep = () => {
    playTone({ freq: 520, duration: 0.18, type: 'sawtooth', gain: 0.22, attack: 0.002, release: 0.04 });
  };
  playBeep();
  _warnInterval = setInterval(playBeep, 400);
}
export function stopBossWarningLoop() {
  if (_warnInterval) {
    clearInterval(_warnInterval);
    _warnInterval = null;
  }
}

// --- Enemy Hit SFX ---
export function playEnemyHit() {
  // Harsh descending impact sound when player is hit by enemy
  playTone({ freq: 420, duration: 0.08, type: 'square', gain: 0.09, attack: 0.001, release: 0.05 });
  setTimeout(() => playTone({ freq: 200, duration: 0.10, type: 'sawtooth', gain: 0.08 }), 60);
}

// --- Wall Collision SFX ---
export function playWallHit() {
  // Short thud sound when hitting a wall
  playTone({ freq: 180, duration: 0.06, type: 'square', gain: 0.07, attack: 0.001, release: 0.04 });
}

// --- Explosion SFX ---
let lastExplosionTime = 0;
const EXPLOSION_THROTTLE = 50; // Minimum ms between explosions to prevent stacking

export function playExplosion() {
  // Throttle explosions to prevent overwhelming audio stacking
  const now = performance.now();
  if (now - lastExplosionTime < EXPLOSION_THROTTLE) return;
  lastExplosionTime = now;
  
  // Deep explosive boom with rumble (reduced gain to prevent overwhelming volume)
  playTone({ freq: 80, duration: 0.15, type: 'square', gain: 0.08, attack: 0.001, release: 0.1 });
  setTimeout(() => playTone({ freq: 50, duration: 0.20, type: 'sine', gain: 0.06 }), 40);
  setTimeout(() => playTone({ freq: 120, duration: 0.12, type: 'sawtooth', gain: 0.05 }), 80);
}

// --- Achievement Unlock SFX ---
export function playAchievementUnlock() {
  // Triumphant rising chime sequence
  playTone({ freq: 523, duration: 0.08, type: 'sine', gain: 0.07 }); // C
  setTimeout(() => playTone({ freq: 659, duration: 0.08, type: 'sine', gain: 0.07 }), 80); // E
  setTimeout(() => playTone({ freq: 784, duration: 0.08, type: 'sine', gain: 0.07 }), 160); // G
  setTimeout(() => playTone({ freq: 1047, duration: 0.15, type: 'sine', gain: 0.09 }), 240); // C high
}
