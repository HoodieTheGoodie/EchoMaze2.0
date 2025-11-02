// audio.js - Simple Web Audio cues for skill checks

let ctx = null;

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
  amp.gain.value = 0.0;
  osc.connect(amp);
  amp.connect(audio.destination);

  const now = audio.currentTime;
  const end = now + duration + release;
  amp.gain.setValueAtTime(0, now);
  amp.gain.linearRampToValueAtTime(gain, now + attack);
  amp.gain.setValueAtTime(gain, now + duration);
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
