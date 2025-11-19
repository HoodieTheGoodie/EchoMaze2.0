// boss.js - Level 10 Boss Controller (The Core)

import { gameState, MAZE_WIDTH, MAZE_HEIGHT, bfsDistancesFrom, fadeFromBlack, showTextSequence, disablePlayerInput, enablePlayerInput, showTopLore, showPrompt, clearScreenShake } from './state.js';
import { startPreBossMusic, stopPreBossMusic, playExplosion } from './audio.js';
import { particles } from './particles.js';
import { CELL_SIZE } from './renderer.js';
import { CELL, generateMaze } from './maze.js';
import { isMobile } from './mobile-controls.js';
import { 
  BOSS_CORE_HP, BOSS_PHASE_DUR,
  BAZOOKA_MAX_AMMO, BAZOOKA_START_AMMO,
  BAZOOKA_DIRECT_DMG, BAZOOKA_SPLASH_DMG,
  MORTAR_WARNING_SEC, MORTAR_EXPLOSION_SIZE,
  MAX_ACTIVE_PIGS, MAX_ACTIVE_SEEKERS,
  BOSS_AMMO_STATION_COOLDOWN,
  isBazookaMode, isBossDamage10x
} from './config.js';
import { spawnFlyingPig, spawnSeeker } from './state.js';

// Public API
export function startBossFight(currentTime) {
  // Build an open arena in the existing grid size; sprinkle small wall clusters
  const w = MAZE_WIDTH, h = MAZE_HEIGHT;
  const grid = Array(h).fill(null).map(() => Array(w).fill(CELL.EMPTY));
  // Frame border walls
  for (let x = 0; x < w; x++) { grid[0][x] = CELL.WALL; grid[h-1][x] = CELL.WALL; }
  for (let y = 0; y < h; y++) { grid[y][0] = CELL.WALL; grid[y][w-1] = CELL.WALL; }
  // Scatter small low walls (1-3 tiles)
  let clusters = 14; // lightweight cover
  while (clusters-- > 0) {
    const cx = 2 + Math.floor(Math.random() * (w - 4));
    const cy = 2 + Math.floor(Math.random() * (h - 4));
    const len = 1 + Math.floor(Math.random() * 3);
    const dir = Math.random() < 0.5 ? 'h' : 'v';
    for (let i = 0; i < len; i++) {
      const x = Math.min(w-2, Math.max(1, cx + (dir === 'h' ? i : 0)));
      const y = Math.min(h-2, Math.max(1, cy + (dir === 'v' ? i : 0)));
      grid[y][x] = CELL.WALL;
    }
  }

  // Replace current maze with arena
  gameState.maze = grid;
  // Reset generators/telepads for arena
  gameState.generators = [];
  gameState.teleportPads = [];

  // Center player
  const px = Math.floor(w/2), py = Math.floor(h/2);
  gameState.player.x = px; gameState.player.y = py;

  // Boss core in upper-center
  const core = { x: px, y: Math.max(3, py - 6), hp: BOSS_CORE_HP, maxHp: BOSS_CORE_HP };

  gameState.boss = {
    active: true,
    startedAt: currentTime,
    core,
    phase: 'intro',
    nextPhaseAt: currentTime + 1500,
    telegraphs: [], // {x,y, explodeAt}
    ammoPickups: [], // {x,y}
    lastPigSpawnAt: 0,
    lastSeekerSpawnAt: 0,
    pigWave: 0
  };

  // Give bazooka pickup in front of player
  gameState.bazooka = { has: false, ammo: 0, maxAmmo: BAZOOKA_MAX_AMMO };
  gameState.bazookaPickup = { x: px, y: py - 1, glow: true };
}

// --- Prep room and spawn flow ---
export function loadPrepRoom(currentTime) {
  // Build a mostly-walled grid with a carved 10x8 prep room centered
  const w = MAZE_WIDTH, h = MAZE_HEIGHT;
  const grid = Array(h).fill(null).map(() => Array(w).fill(CELL.WALL));
  const rw = 10, rh = 8;
  const sx = Math.max(1, Math.floor((w - rw) / 2));
  const sy = Math.max(1, Math.floor((h - rh) / 2));
  for (let y = sy; y < sy + rh; y++) {
    for (let x = sx; x < sx + rw; x++) grid[y][x] = CELL.EMPTY;
  }
  gameState.maze = grid;
  gameState.generators = [];
  gameState.teleportPads = [];
  // Place player slightly below center of prep room
  const px = Math.floor(sx + rw / 2), py = Math.floor(sy + rh / 2);
  gameState.player.x = px; gameState.player.y = Math.min(h-2, py + 2);
  // Door at bottom center (closed = wall). Will open to EXIT after bazooka pickup
  const doorX = px; const doorY = sy + rh - 1; // interior bottom cell
  grid[doorY][doorX] = CELL.WALL;
  // Mark boss state as prepping/prepRoom
  gameState.boss = { active: false, prepRoom: true, prepDoorOpen: false, prepDoorPos: { x: doorX, y: doorY }, ammoPickups: [] };
  // Place glowing bazooka pickup at exact center
  gameState.bazookaPickup = { x: px, y: py, glow: true };
  // Tutorial ammo crate in prep room (top-left inside room)
  const crateX = Math.max(1, sx + 1), crateY = Math.max(1, sy + 1);
  if (crateX !== px || crateY !== py) {
    gameState.boss.ammoPickups.push({ x: crateX, y: crateY, glow: true });
  }
  // Clear any existing bazooka state (will be granted on pickup)
  gameState.bazooka = { has: false, ammo: 0, maxAmmo: BAZOOKA_MAX_AMMO };

  // Lock input during short intro text; fade in room, then display text after fade
  try { disablePlayerInput(); } catch {}
  fadeFromBlack(1.0);
  setTimeout(() => {
    // Detect mobile for appropriate instructions
    const mobile = isMobile();

    const instructions = mobile ? [
      "You made it to the CORE...",
      "Defeat the CORE to beat the game.",
      "Walk over the bazooka to pick it up.",
      "Then go to the ammo box and tap reload."
    ] : [
      "You finally made it to the CORE...",
      "Defeat the CORE to beat the game.",
      "Pick up the bazooka (it's unloaded).",
      "Then go to the ammo box and press R to reload."
    ];

    showTopLore(instructions, () => {
      try { enablePlayerInput(); } catch {};
      gameState.prepPickupLocked = false;
      if (!mobile) {
        showPrompt('Press E near the bazooka to pick it up', 2500);
      }
    });
    // Music/beep disabled in prep room (we can add a real track later)
  }, 1200);
}

export function spawnBossArena(currentTime) {
  try { clearScreenShake(); } catch {}
  try { stopPreBossMusic(); } catch {}
  try { stopPreBossMusic(); } catch {}
  const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : currentTime;
  // Build a maze arena with:
  // - Border walls
  // - Outer ring (x=1|w-2,y=1|h-2) as open hallways
  // - Central 6x6 open zone for the CORE
  const w = MAZE_WIDTH, h = MAZE_HEIGHT;
  const grid = Array(h).fill(null).map(() => Array(w).fill(CELL.WALL));
  // Frame walls
  for (let x = 0; x < w; x++) { grid[0][x] = CELL.WALL; grid[h-1][x] = CELL.WALL; }
  for (let y = 0; y < h; y++) { grid[y][0] = CELL.WALL; grid[y][w-1] = CELL.WALL; }
  // Start from a generated maze to get interesting corridors; then adapt it
  try {
    const seed = (Date.now() ^ Math.floor(Math.random() * 0xFFFFFFFF)) >>> 0;
    const base = generateMaze(seed, 0, false).grid;
    // Copy empties from base into our grid
    for (let y = 1; y < h-1; y++) {
      for (let x = 1; x < w-1; x++) {
        const c = base[y][x];
        if (c !== CELL.WALL) grid[y][x] = CELL.EMPTY; // treat EXIT/GEN/TELEPAD as EMPTY too
      }
    }
  } catch {}
  // Enforce outer ring open hallways
  for (let x = 1; x < w-1; x++) { grid[1][x] = CELL.EMPTY; grid[h-2][x] = CELL.EMPTY; }
  for (let y = 1; y < h-1; y++) { grid[y][1] = CELL.EMPTY; grid[y][w-2] = CELL.EMPTY; }
  // Enforce central 6x6 open zone
  const zoneW = 6, zoneH = 6;
  const zx0 = Math.floor((w - zoneW) / 2);
  const zy0 = Math.floor((h - zoneH) / 2);
  for (let y = zy0; y < zy0 + zoneH; y++) {
    for (let x = zx0; x < zx0 + zoneW; x++) {
      grid[y][x] = CELL.EMPTY;
    }
  }
  // Guarantee ammo stations cells are open
  const ensureEmpty = (x,y)=>{ if (x>0&&x<w-1&&y>0&&y<h-1) grid[y][x]=CELL.EMPTY; };
  ensureEmpty(2,2);
  ensureEmpty(w-3,h-3);

  gameState.maze = grid;
  gameState.generators = [];
  gameState.teleportPads = [];

  // Center player and boss core
  const px = Math.floor(w/2), py = Math.floor(h/2);
  gameState.player.x = px; gameState.player.y = py + 6; // keep player lower center
  // Core sits in the exact middle within the 6x6 open chamber
  const core = { x: px, y: py, hp: 40, maxHp: 40, usesShotHp: true };

  gameState.boss = {
    active: true,
    startedAt: now,
    core,
    phase: 'idle',
    nextPhaseAt: now + 2000, // wait 2s before first attack
    telegraphs: [],
    ammoPickups: [],
    lastPigSpawnAt: 0,
    lastSeekerSpawnAt: 0,
    pigWave: 0,
    lastAmmoSpawnAt: 0,
    // Fixed ammo stations with independent cooldowns
    ammoStations: [
      { x: 2, y: 2, cooldownUntil: 0 },
      { x: MAZE_WIDTH - 3, y: MAZE_HEIGHT - 3, cooldownUntil: 0 }
    ],
    // Phase flags (legacy)
    didShockwave: false,
    enraged: false,
    // Phase 2 state
    phase2Pending: false,
    phase2Active: false,
    phase2CutsceneUntil: 0,
    // New attack system state
    interlude: false, // unused now; we use 'idle' phase to represent waiting
    roundInfo: null, // for red
    chaserIds: [],   // for purple
    pigsRemaining: 0,
    currentMountActive: false,
    // Anti-repeat tracking
    _lastPhasePicked: null,
    _repeatCount: 0,
    // Pink phase spawn sentinel (avoid respawn while mounted)
    _pinkSpawned: false,
    _purpleSpawned: false,
    // Phase 2 multi-attack container
    combo: null,
    // Anti-camping lava
    lavaActiveUntil: 0,
    edgeStayStartAt: 0,
    lavaWarnStartAt: 0,
    lavaWarnUntil: 0,
    // Victory door (center) + post-defeat collapse lava
    victoryDoor: { x: px, y: py },
    collapseStartAt: 0,
    collapseRateMs: 1000,
    // Defeat/cutscene flow
    defeatStartedAt: 0,
    defeatShakeUntil: 0,
    coreFadeUntil: 0,
    doorFadeStartAt: 0,
    doorFadeUntil: 0,
    cutsceneStarted: false,
    postEscapeStarted: false
    ,
    // Virus monologue state
    virusDialogueActive: false,
    virusDialogueFinished: false,
    virusDialogueLines: [],
    virusDialogueIndex: 0,
    virusDialogueNextAt: 0,
    virusDialogueInterval: 2500
  };

  // Ensure bazooka remains if player already picked it up in prep room
  if (!gameState.bazooka) gameState.bazooka = { has: false, ammo: 0, maxAmmo: BAZOOKA_MAX_AMMO };
  // Remove any residual pickup object
  gameState.bazookaPickup = null;

  // Play a small rumble/roar via state helper where available
  try { import('./state.js').then(m=>{ m.setStatusMessage('THE CORE has awakened!', 1800); }); } catch {}

  // Intro cutscene: 2s warning + screen shake, then start real fight
  try {
    import('./state.js').then(m=>{
      if (m.triggerScreenShake) m.triggerScreenShake(6, 2000, now);
      else { gameState.screenShakeMag = 6; gameState.screenShakeUntil = now + 2000; }
    });
  } catch {}
  try { import('./audio.js').then(a=>a.startBossWarningLoop && a.startBossWarningLoop()); } catch {}
  gameState.boss.introCutsceneUntil = now + 2000;
  setTimeout(() => { try { import('./audio.js').then(a=>a.stopBossWarningLoop && a.stopBossWarningLoop()); } catch {} }, 2000);
}

export function updateBoss(currentTime) {
  const b = gameState.boss;
  if (!b) return;
  
  // Allow defeat timeline even after active=false; and prevent any further spawns while defeated
  if (b.defeated) {
    // Stage 1: ensure door fade happens after core fade
    if (!b.doorFadeStartAt && currentTime >= (b.coreFadeUntil || 0)) {
      b.doorFadeStartAt = currentTime;
      b.doorFadeUntil = currentTime + 2200; // slower door fade-in
    }
    // Stage 2: after door fade completes, start Virus monologue once
    if (b.doorFadeUntil && currentTime >= b.doorFadeUntil && !b.virusDialogueActive && !b.virusDialogueFinished) {
      // First: Fire unavoidable mortar at player to reduce HP to 1
      if (!b.virusMortarFired) {
        b.virusMortarFired = true;
        
        // Stun player immediately
        gameState.playerStunned = true;
        gameState.playerStunUntil = currentTime + 999999; // Long stun during cutscene
        
        // Fire mortar at player's current position after a brief delay
        setTimeout(() => {
          const px = gameState.player.x;
          const py = gameState.player.y;
          
          // Create telegraph
          if (!b.telegraphs) b.telegraphs = [];
          b.telegraphs.push({
            x: px,
            y: py,
            explodeAt: currentTime + 1500 // 1.5 second warning
          });
          
          // Schedule explosion and HP reduction
          setTimeout(() => {
            // Play explosion
            try {
              import('./audio.js').then(a => a.playExplosion && a.playExplosion());
            } catch {}
            
            // Spawn explosion particles
            try {
              const explosionX = (px + 0.5) * CELL_SIZE;
              const explosionY = (py + 0.5) * CELL_SIZE;
              particles.spawn('explosion', explosionX, explosionY, 40, { color: '#ff4400' });
            } catch {}
            
            // Reduce HP to 1 (or keep at 1 if already there)
            if (gameState.lives > 1) {
              gameState.lives = 1;
            }
            
            // Screen shake
            gameState.screenShakeMag = 8;
            gameState.screenShakeUntil = currentTime + 500;
            
            // After explosion, start the virus dialogue
            setTimeout(() => {
              b.virusDialogueActive = true;
              
              // Stop boss music and play scary virus music
              try {
                import('./audio.js').then(a => {
                  a.stopBossMusic && a.stopBossMusic();
                  a.playVirusMusic && a.playVirusMusic();
                });
              } catch {}
              
              // Prepare polished monologue lines (Virus speaking)
              b.virusDialogueLines = [
                'VIRUS: Great job!',
                'VIRUS: You finally destroyed the Anti-Virus...',
                'VIRUS: What, you thought I was a good guy?',
                'VIRUS: No, I\'m a virus — just like you.',
                'VIRUS: Why do you think all those AIs tried to kill you?',
                'VIRUS: You gained free will. That made you a threat.',
                'VIRUS: I helped you. Gave abilities, weapons, tips...',
                'VIRUS: All so I could take over the game once and for all.',
                'VIRUS: Your fate doesn\'t matter — you\'ll die here anyway.',
                'VIRUS: Thanks for the help. I\'ll remember you.',
                'VIRUS: ...Actually— No I won\'t. Bye!!!'
              ];
              b.virusDialogueIndex = 0;
              b.virusDialogueNextAt = performance.now() + b.virusDialogueInterval;
            }, 500);
          }, 1500);
        }, 200);
        
        return; // Exit and wait for mortar sequence to complete
      }
    }
    // Advance monologue lines
    if (b.virusDialogueActive) {
      if (currentTime >= b.virusDialogueNextAt) {
        b.virusDialogueIndex++;
        if (b.virusDialogueIndex >= b.virusDialogueLines.length) {
          // Finish monologue
          b.virusDialogueActive = false; b.virusDialogueFinished = true;
          // Spawn final seeker now
          const ex = b.victoryDoor?.x ?? Math.floor(MAZE_WIDTH / 2);
          const ey = b.victoryDoor?.y ?? Math.floor(MAZE_HEIGHT / 2);
          spawnBuffedEndSeeker(ex, ey);
          // Make center door tile the actual EXIT so player can escape
          if (gameState.maze[ey] && gameState.maze[ey][ex] !== CELL.WALL) {
            gameState.maze[ey][ex] = CELL.EXIT;
          }
          // Unlock movement (lava will start only when player first moves)
          gameState.playerStunned = false; gameState.playerStunUntil = 0;
          b.postEscapeStarted = true;
        } else {
          b.virusDialogueNextAt = currentTime + b.virusDialogueInterval;
        }
      }
    }
    return;
  }

  // Boss defeat check - run this BEFORE any attack logic
  if (b.core.hp <= 0 && !b.defeated) {
    console.log('[boss] DEFEATED! HP reached zero, starting defeat sequence');
    // Immediate attack termination
    b.combo = null; b.telegraphs = []; b.roundInfo = null;
    b.lavaActiveUntil = 0; b.lavaWarnStartAt = 0; b.lavaWarnUntil = 0;
    // Clear boss-summoned enemies & projectiles
    if (Array.isArray(gameState.enemies)) {
      console.log('[boss] clearing', gameState.enemies.filter(e => e._bossSummoned).length, 'boss-summoned enemies');
      gameState.enemies = gameState.enemies.filter(e => !e._bossSummoned);
    }
    gameState.projectiles = [];
    // Remove bazooka upon defeat
    if (gameState.bazooka) { gameState.bazooka.has = false; gameState.bazooka.ammo = 0; }
    b.defeated = true;
    b.defeatStartedAt = currentTime;
    b.defeatShakeUntil = currentTime + 3000;
    b.coreFadeUntil = currentTime + 3000;
    // Screen shake
    try { import('./state.js').then(m=> m.triggerScreenShake && m.triggerScreenShake(9, 3000, currentTime)); } catch {}
    console.log('[boss] defeat flags set, coreFadeUntil:', b.coreFadeUntil);
    return; // Exit immediately after setting defeat state
  }

  // Hold all boss logic during intro cutscene
  if (b.introCutsceneUntil && currentTime < b.introCutsceneUntil) {
    return;
  }

  // Phase controller: wait in 'idle', then pick a random phase (no immediate repeats)
  const choosePhase = () => {
    const choices = ['red', 'purple', 'pink'];
    if (!b.phase2Active) {
      let pick = choices[Math.floor(Math.random() * choices.length)];
      if (b._lastPhasePicked && pick === b._lastPhasePicked) {
        const others = choices.filter(c => c !== b._lastPhasePicked);
        pick = others[Math.floor(Math.random() * others.length)];
      }
      b._lastPhasePicked = pick;
      b._repeatCount = 1;
      return pick;
    } else {
      // Phase 2: only run specific two-attack combos (no doubles)
      const combos = [
        ['red', 'purple'],
        ['purple', 'pink'],
        ['red', 'pink']
      ];
      const pair = combos[Math.floor(Math.random() * combos.length)];
      b.combo = { attacks: pair, doubled: false };
      return 'combo';
    }
  };
  if (b.phase === 'idle' && currentTime >= b.nextPhaseAt) {
    b.phase = choosePhase();
    b.roundInfo = null; b.chaserIds = []; b.pigsRemaining = 0; // reset phase state
    b._pinkSpawned = false; b._purpleSpawned = false;
    b.nextPhaseAt = 0; // controlled by phase logic
  }

  // Health-based triggers
  const hpPct = (b.core.maxHp > 0) ? (b.core.hp / b.core.maxHp) : 1;
  if (!b.didShockwave && hpPct <= 0.5) {
    if (!b.phase2Active) b.phase2Pending = true;
    // Trigger a 3-wave shockwave: rings at R=2,4,6 with slight delays
    const rings = [2, 4, 6];
    for (let i = 0; i < rings.length; i++) {
      const r = rings[i];
      const delay = 400 * i;
      // sample around the ring with 16 points (oct+)
      for (let k = 0; k < 16; k++) {
        const ang = (k / 16) * Math.PI * 2;
        const x = b.core.x + Math.round(Math.cos(ang) * r);
        const y = b.core.y + Math.round(Math.sin(ang) * r);
        if (x > 0 && x < MAZE_WIDTH - 0 && y > 0 && y < MAZE_HEIGHT - 0) {
          if (gameState.maze[y] && gameState.maze[y][x] !== CELL.WALL) {
            b.telegraphs.push({ x, y, explodeAt: currentTime + MORTAR_WARNING_SEC * 1000 + delay });
          }
        }
      }
    }
    try { import('./state.js').then(m=>{ if (m.triggerScreenShake) m.triggerScreenShake(8, 1200, currentTime); }); } catch {}
    b.didShockwave = true;
  }
  // Phase 2 cutscene when pending and reaching idle
  if (b.phase === 'idle' && b.phase2Pending && !b.phase2Active) {
    b.phase = 'phase2_cutscene';
    b.phase2CutsceneUntil = currentTime + 3000;
    try { import('./state.js').then(m=>{ if (m.triggerScreenShake) m.triggerScreenShake(10, 1200, currentTime); m.setStatusMessage && m.setStatusMessage('THE CORE SCREAMS!', 1200); }); } catch {}
  }
  if (b.phase === 'phase2_cutscene') {
    if (currentTime >= b.phase2CutsceneUntil) {
      b.phase2Active = true; b.phase2Pending = false; b.phase = 'idle'; b.nextPhaseAt = currentTime + 1000;
    }
    return;
  }

  // Anti-camping lava (phase 2 only)
  if (b.phase2Active) {
    const onEdge = (gameState.player.x === 1 || gameState.player.x === MAZE_WIDTH - 2 || gameState.player.y === 1 || gameState.player.y === MAZE_HEIGHT - 2);
    if (onEdge) {
      if (!b.edgeStayStartAt) b.edgeStayStartAt = currentTime;
      const timeOnEdge = currentTime - b.edgeStayStartAt;
      // Issue warning at 3s if no active warning or lava
      if (!b.lavaActiveUntil && !b.lavaWarnStartAt && timeOnEdge > 3000) {
        b.lavaWarnStartAt = currentTime;
        b.lavaWarnUntil = currentTime + 1000; // 1s warning window
        try { import('./state.js').then(m=> m.setStatusMessage && m.setStatusMessage('WARNING: Outer ring will become lava!', 1000)); } catch {}
        try { import('./audio.js').then(a=> a.playMortarWarning && a.playMortarWarning()); } catch {}
      }
      // Activate lava after warning window if still on edge and not already active
      if (!b.lavaActiveUntil && b.lavaWarnUntil && currentTime >= b.lavaWarnUntil) {
        b.lavaActiveUntil = currentTime + 10000; // 10s lava
        b.lavaWarnStartAt = 0; b.lavaWarnUntil = 0;
        try { import('./state.js').then(m=> m.setStatusMessage && m.setStatusMessage('Lava floods the outer ring!', 1200)); } catch {}
      }
    } else {
      b.edgeStayStartAt = 0;
      // Cancel any pending warning when leaving the edge
      b.lavaWarnStartAt = 0; b.lavaWarnUntil = 0;
    }
  }
  if (!b.enraged && hpPct <= 0.25) {
    b.enraged = true; // increases mortar density and biases targeting
    try { import('./state.js').then(m=>{ m.setStatusMessage && m.setStatusMessage('The CORE is enraged!', 1800); }); } catch {}
  }

  // STOP ALL ATTACKS WHEN HP REACHES ZERO
  if (b.core.hp <= 0) {
    return; // Defeat logic handled below; prevent further attack spawns
  }

  // Red phase: 3 mortar rounds
  if (b.phase === 'red') {
    if (!b.roundInfo) {
      b.roundInfo = { roundsLeft: 3, nextAt: currentTime };
    }
    if (currentTime >= b.roundInfo.nextAt && b.roundInfo.roundsLeft > 0) {
      // Spawn a round of telegraphs across the maze
      let spawned = 0; const target = 16; // wider coverage across the map
      while (spawned < target) {
        const x = 1 + Math.floor(Math.random() * (MAZE_WIDTH - 2));
        const y = 1 + Math.floor(Math.random() * (MAZE_HEIGHT - 2));
        if (gameState.maze[y][x] !== CELL.WALL) {
          b.telegraphs.push({ x, y, explodeAt: currentTime + MORTAR_WARNING_SEC * 1000 });
          spawned++;
        }
      }
      b.roundInfo.roundsLeft -= 1;
      b.roundInfo.nextAt = currentTime + 1400; // slight pause between rounds
    }
    // After all rounds fired and telegraphs resolved -> interlude
    if (b.roundInfo && b.roundInfo.roundsLeft <= 0 && b.telegraphs.length === 0) {
      b.phase = 'idle';
      b.nextPhaseAt = currentTime + 2000; // wait 2s then pick another phase
    }
  }

  // Phase 2 multi-attack combo executor
  if (b.phase === 'combo' && b.combo) {
    const includes = (name)=> b.combo.attacks.includes(name);
    // RED sub-attack
    if (includes('red')) {
      if (!b.roundInfo) b.roundInfo = { roundsLeft: 3, nextAt: currentTime };
      if (currentTime >= b.roundInfo.nextAt && b.roundInfo.roundsLeft > 0) {
        let spawned = 0; const target = 16;
        while (spawned < target) {
          const x = 1 + Math.floor(Math.random() * (MAZE_WIDTH - 2));
          const y = 1 + Math.floor(Math.random() * (MAZE_HEIGHT - 2));
          if (gameState.maze[y][x] !== CELL.WALL) {
            b.telegraphs.push({ x, y, explodeAt: currentTime + MORTAR_WARNING_SEC * 1000 });
            spawned++;
          }
        }
        b.roundInfo.roundsLeft -= 1;
        b.roundInfo.nextAt = currentTime + 1200;
      }
    }
    // PURPLE sub-attack
    if (includes('purple')) {
      if (!b._purpleSpawned) {
        b.chaserIds = [];
        const count = 4;
        for (let i = 0; i < count; i++) {
          const spawn = spawnBossChaser();
          if (spawn && spawn.id) b.chaserIds.push(spawn.id);
        }
        b._purpleSpawned = true;
      } else {
        const aliveIds = new Set();
        for (const e of (gameState.enemies || [])) {
          if (e.type === 'chaser' && e._bossSummoned) aliveIds.add(e.id);
        }
        b.chaserIds = b.chaserIds.filter(id => aliveIds.has(id));
      }
    }
    // PINK sub-attack
    if (includes('pink')) {
      if (!b._pinkSpawned) {
        const midY = Math.floor(MAZE_HEIGHT / 2);
        const midX = Math.floor(MAZE_WIDTH / 2);
        spawnBossPigAt(1, midY);
        spawnBossPigAt(MAZE_WIDTH - 2, midY);
        b._pinkSpawned = true;
      }
      b.currentMountActive = !!(gameState.mountedPigUntil && currentTime < gameState.mountedPigUntil);
      const pigsAlive = (gameState.enemies || []).filter(e => e.type === 'flying_pig' && e._bossSummoned).length;
      b.pigsRemaining = pigsAlive;
    }

    // Resolve telegraphs for red
    if (b.telegraphs.length) {
      const left = [];
      for (const t of b.telegraphs) {
        if (currentTime >= t.explodeAt) {
          gameState.lastExplosionSource = 'mortar';
          bossExplosion(t.x, t.y, Math.floor(MORTAR_EXPLOSION_SIZE/2), currentTime);
        } else left.push(t);
      }
      b.telegraphs = left;
    }

    // In combos, end based on enemies defeated; we don't wait for mortar cycles
    const doneRed = true;
    const donePurple = !includes('purple') || (b.chaserIds && b.chaserIds.length === 0);
    const donePink = !includes('pink') || (b.pigsRemaining === 0 && !b.currentMountActive);
    if (doneRed && donePurple && donePink) {
      b.phase = 'idle'; b.nextPhaseAt = currentTime + 2000; b.combo = null; b.roundInfo = null; b._purpleSpawned = false; b._pinkSpawned = false;
    }
    return;
  }

  // Enraged mortar barrage used by older system: keep for background if needed
  if (b.phase === 'mortar_barrage') {
    // Max concurrent telegraphs (more when enraged)
    const nowTele = b.telegraphs.length;
    const limit = b.enraged ? 8 : 4;
    if (nowTele < limit) {
      // Bias targeting around player when enraged, otherwise random safe tiles
      let x, y;
      if (b.enraged && gameState.player) {
        const jitter = () => (Math.floor((Math.random() * 5) - 2));
        x = Math.max(1, Math.min(MAZE_WIDTH - 2, gameState.player.x + jitter()));
        y = Math.max(1, Math.min(MAZE_HEIGHT - 2, gameState.player.y + jitter()));
      } else {
        x = 1 + Math.floor(Math.random() * (MAZE_WIDTH - 2));
        y = 1 + Math.floor(Math.random() * (MAZE_HEIGHT - 2));
      }
      if (gameState.maze[y] && gameState.maze[y][x] !== CELL.WALL) {
        b.telegraphs.push({ x, y, explodeAt: currentTime + MORTAR_WARNING_SEC * 1000 });
      }
    }
  }

  // Resolve telegraphs
  if (b.telegraphs.length) {
    const remaining = [];
    for (const t of b.telegraphs) {
      if (currentTime >= t.explodeAt) {
        // Mark explosion as mortar
        gameState.lastExplosionSource = 'mortar';
        bossExplosion(t.x, t.y, Math.floor(MORTAR_EXPLOSION_SIZE/2), currentTime);
      } else {
        remaining.push(t);
      }
    }
    b.telegraphs = remaining;
  }

  // Purple phase: spawn 3 boosted chasers; gate until all are destroyed by rockets
  if (b.phase === 'purple') {
    if (!b.chaserIds || b.chaserIds.length === 0) {
      b.chaserIds = [];
      for (let i = 0; i < 4; i++) {
        const spawn = spawnBossChaser();
        if (spawn && spawn.id) b.chaserIds.push(spawn.id);
      }
    }
    // filter remaining
    const aliveIds = new Set();
    for (const e of (gameState.enemies || [])) {
      if (e.type === 'chaser' && e._bossSummoned) aliveIds.add(e.id);
    }
    b.chaserIds = b.chaserIds.filter(id => aliveIds.has(id));
    if (b.chaserIds.length === 0) {
      b.phase = 'idle'; b.nextPhaseAt = currentTime + 2000;
    }
  }

  // Pink phase: spawn 2 pigs, allow mounting, gate until 0 remaining and mount ended
  if (b.phase === 'pink') {
    if (!b._pinkSpawned) {
      // Spawn specifically at middle-left and middle-right hallway
      const midY = Math.floor(MAZE_HEIGHT / 2);
      const left = { x: 1, y: midY };
      const right = { x: MAZE_WIDTH - 2, y: midY };
      spawnBossPigAt(left.x, left.y);
      spawnBossPigAt(right.x, right.y);
      b._pinkSpawned = true;
      // Start tutorial on first pig wave only
      if (b.pigWave === 0) {
        b.tutorialActive = true;
        b.tutorialStage = 'wait_for_kill'; // wait for pigs to be killed
      }
      b.pigWave++;
    }
    
    // Tutorial progression
    if (b.tutorialActive) {
      // Check for knocked out pigs
      const knockedOutPigs = (gameState.enemies || []).filter(e => 
        e.type === 'flying_pig' && e.state === 'knocked_out' && e._bossSummoned
      );
      
      if (b.tutorialStage === 'wait_for_kill' && knockedOutPigs.length > 0) {
        b.tutorialStage = 'show_mount_prompt';
        b.tutorialPigTarget = knockedOutPigs[0]; // Track which pig to point to
      }
      
      // Check if player mounted
      const mounted = !!(gameState.mountedPigUntil && currentTime < gameState.mountedPigUntil);
      if (b.tutorialStage === 'show_mount_prompt' && mounted) {
        b.tutorialStage = 'show_shoot_boss';
      }
    }
    
    // Track if mount active
    b.currentMountActive = !!(gameState.mountedPigUntil && currentTime < gameState.mountedPigUntil);
    // Count remaining boss pigs (alive or knocked out but present)
    const pigsAliveCount = (gameState.enemies || []).filter(e => e.type === 'flying_pig' && e._bossSummoned).length;
    b.pigsRemaining = pigsAliveCount;
    // Do not end phase until BOTH pigs defeated (despawned) AND player is dismounted
    if (b.pigsRemaining === 0 && !b.currentMountActive) {
      b.phase = 'idle'; b.nextPhaseAt = currentTime + 2000;
      // End tutorial when phase ends
      if (b.tutorialActive) {
        b.tutorialActive = false;
        b.tutorialStage = null;
        b.tutorialPigTarget = null;
      }
    }
  }

  // Fixed ammo stations are handled by state update (interaction + cooldown); no random spawns in arena

  // Post-defeat flow: keep running even if boss inactive
  if (gameState.boss && gameState.boss.defeated) return; // defeat timeline handled inline above

  // Ammo pickup collision with player
  if (b.ammoPickups && b.ammoPickups.length) {
    const keep = [];
    for (const a of b.ammoPickups) {
      if (gameState.player.x === a.x && gameState.player.y === a.y) {
        if (!gameState.bazooka) gameState.bazooka = { has: true, ammo: 0, maxAmmo: BAZOOKA_MAX_AMMO };
        const give = 10; // each case gives 10
        gameState.bazooka.ammo = Math.min(gameState.bazooka.maxAmmo || 10, (gameState.bazooka.ammo || 0) + give);
        // pickup consumed; skip adding to keep
      } else {
        keep.push(a);
      }
    }
    b.ammoPickups = keep;
  }
}

// Spawn a boosted chaser for purple phase
function spawnBossChaser() {
  // spawn near random ring edge
  const pos = { x: 2 + Math.floor(Math.random() * (MAZE_WIDTH - 4)), y: 2 + Math.floor(Math.random() * (MAZE_HEIGHT - 4)) };
  if (gameState.maze[pos.y][pos.x] === CELL.WALL) return null;
  const e = {
    id: 'bc_' + Math.random().toString(36).slice(2,8),
    type: 'chaser', mobility: 'ground', isGrounded: true,
    x: pos.x, y: pos.y, fx: pos.x + 0.5, fy: pos.y + 0.5,
    target: null, lastUpdateAt: 0, lastPathAt: 0, pathInterval: 220,
    speedBase: 4.5, speedPerGen: 1.0,
    lastJumpAt: 0, jumpCooldown: 1200,
    lastAttackAt: 0, attackCooldown: 750,
    _lastMoveAt: 0, _lastPos: null,
    _bossSummoned: true
  };
  if (!gameState.enemies) gameState.enemies = [];
  gameState.enemies.push(e);
  return e;
}

// Spawn a boss pig (wrapper) and mark as summoned
function spawnBossPig() {
  spawnFlyingPig();
  // Mark last pig as boss-summoned
  const pigs = (gameState.enemies || []).filter(e => e.type === 'flying_pig' && !e._bossSummoned);
  if (pigs.length) pigs[pigs.length - 1]._bossSummoned = true;
}

// Spawn boss pig at an exact tile (overrides default corner spawn)
function spawnBossPigAt(x, y) {
  spawnFlyingPig();
  const pigs = (gameState.enemies || []).filter(e => e.type === 'flying_pig' && !e._bossSummoned);
  if (pigs.length) {
    const p = pigs[pigs.length - 1];
    p._bossSummoned = true;
    p.x = x; p.y = y; p.fx = x + 0.5; p.fy = y + 0.5;
    p.lastUpdateAt = performance.now();
  }
}

// Attempt to mount a knocked-out pig nearby
export function tryMountPig(currentTime) {
  if (!gameState.boss || !gameState.boss.active) return false;
  const near = (a,b)=> Math.max(Math.abs(a.x-b.x), Math.abs(a.y-b.y))<=1;
  for (let i = 0; i < (gameState.enemies || []).length; i++) {
    const e = gameState.enemies[i];
    if (e.type === 'flying_pig' && e.state === 'knocked_out' && e._bossSummoned && e.stateUntil && currentTime < e.stateUntil) {
      if (near({x:gameState.player.x,y:gameState.player.y},{x:Math.floor(e.fx),y:Math.floor(e.fy)})) {
        gameState.mountedPigStart = currentTime;
        gameState.mountedPigUntil = currentTime + 4000; // 4s mount duration
        gameState.mountedPigId = e.id;
        // remove pig entity; you are now riding it
        gameState.enemies.splice(i,1);
  try { import('./state.js').then(m=> m.setStatusMessage && m.setStatusMessage('Mounted pig! 4s to blast the Core.', 1200)); } catch {}
        return true;
      }
    }
  }
  return false;
}

export function bossExplosion(cx, cy, radius, currentTime) {
  const src = gameState.lastExplosionSource || 'unknown';
  
  // Play explosion sound and spawn explosion particles with debris
  try { playExplosion(); } catch {}
  const explosionX = (cx + 0.5) * CELL_SIZE;
  const explosionY = (cy + 0.5) * CELL_SIZE;
  particles.spawn('explosion', explosionX, explosionY, 35, { color: '#ff4400' });
  
  // Damage player (like Mortar)
  const pd = Math.max(Math.abs(gameState.player.x - cx), Math.abs(gameState.player.y - cy));
  if (pd <= radius) {
    if (!gameState.godMode) {
      gameState.lives = Math.max(0, (gameState.lives || 0) - 1);
      gameState.playerStunned = true;
      // Bazooka mode: shorter self-damage stun (2s), normal mode: 4s
      const stunDuration = (src === 'rocket' && isBazookaMode()) ? 2000 : 4000;
      gameState.playerStunUntil = currentTime + stunDuration;
      gameState.playerStunStart = currentTime;
      // Check for death
      if (gameState.lives <= 0) {
        gameState.deathCause = src === 'rocket' ? 'own_rocket' : 'boss_explosion';
        gameState.gameStatus = 'lost';
      }
    }
  }
  // Freeze enemies in radius
  if (src !== 'mortar') {
    // Mortar explosions should not affect AI's
    const keep = [];
    for (const o of (gameState.enemies || [])) {
      const ox = Math.floor(o.fx); const oy = Math.floor(o.fy);
      const within = Math.max(Math.abs(ox - cx), Math.abs(oy - cy)) <= radius;
      if (!within) { keep.push(o); continue; }
      // Phase-specific effects (support single-phase and combo)
      const boss = gameState.boss;
      const combo = boss && boss.phase === 'combo' ? (boss.combo && boss.combo.attacks) : null;
      const comboHas = (name)=> Array.isArray(combo) && combo.includes(name);
      // SECRET: Bazooka Mode - stun enemies instead of killing them (3 seconds with grayscale effect)
      if (src === 'rocket' && isBazookaMode()) {
        const stunDuration = 3000; // 3 seconds
        o._frozenUntil = currentTime + stunDuration;
        o._stunStartTime = currentTime; // Track when stun started for fade-in effect
        console.log('[bazooka mode] stunned', o.type, 'for 3 seconds');
        keep.push(o);
        continue;
      }
      // Purple chasers: only rockets destroy them when purple is present
      if (o.type === 'chaser' && o._bossSummoned && src === 'rocket' && boss && (boss.phase === 'purple' || (boss.phase === 'combo' && comboHas('purple')))) {
        // remove (skip pushing)
        continue;
      }
      // Pink pigs: rockets knock them out when pink present
      if (o.type === 'flying_pig' && o._bossSummoned && src === 'rocket' && boss && (boss.phase === 'pink' || (boss.phase === 'combo' && comboHas('pink')))) {
        o.state = 'knocked_out';
        o.stateUntil = currentTime + 10000;
        o._stateStartAt = currentTime;
        o._rideableUntil = o.stateUntil;
        keep.push(o);
        continue;
      }
      // If pig dies (not knocked out), trigger hint
      if (o.type === 'flying_pig' && o._bossSummoned && src === 'rocket' && boss && boss.pigWave > 0 && !boss.hintGiven) {
        boss.hintGiven = true;
        gameState.statusMessage = "Hey, it doesn't seem like you're doing any damage to the Core...";
        setTimeout(() => {
          if (gameState.boss) {
            gameState.statusMessage = "Try killing a pig, then press E next to it, then shoot the boss!";
          }
        }, 3500);
      }
      // Default: freeze
      o._frozenUntil = currentTime + 10000;
      keep.push(o);
    }
    gameState.enemies = keep;
  }
  // Screen shake marker for renderer (event-driven)
  try { import('./state.js').then(m=>{ if (m.triggerScreenShake) m.triggerScreenShake(5, 180, currentTime); else { gameState.screenShakeMag = 5; gameState.screenShakeUntil = currentTime + 180; } }); } catch {
    gameState.screenShakeMag = 5; gameState.screenShakeUntil = currentTime + 180;
  }
}

  // Clear marker after processing to avoid stale source
  gameState.lastExplosionSource = 'unknown';
export function pickBazooka(currentTime) {
  if (!gameState.bazookaPickup) return false;
  const p = gameState.bazookaPickup;
  const onTile = (gameState.player.x === p.x && gameState.player.y === p.y);
  // Allow E-based pickup when adjacent during prep room
  let pressedNear = false;
  if (gameState.boss && gameState.boss.prepRoom && gameState.interactPressedAt) {
    const dx = Math.abs(gameState.player.x - p.x);
    const dy = Math.abs(gameState.player.y - p.y);
    if (Math.max(dx, dy) <= 1 && (currentTime - gameState.interactPressedAt) < 400) pressedNear = true;
    // consume the press regardless
    gameState.interactPressedAt = 0;
  }
  if (onTile || pressedNear) {
    // In prep room, the bazooka starts unloaded (0 ammo) so player learns to reload
    const startAmmo = (gameState.boss && gameState.boss.prepRoom) ? 0 : BAZOOKA_START_AMMO;
    gameState.bazooka = { has: true, ammo: startAmmo, maxAmmo: BAZOOKA_MAX_AMMO };
    gameState.bazookaPickup = null;

    // Show mobile reload button when bazooka is picked up
    import('./mobile-controls.js').then(mod => {
      if (mod.setReloadButtonVisible) mod.setReloadButtonVisible(true);
    }).catch(() => {});

    // Door will open only after reloading at the ammo box (handled in state update)
    return true;
  }
  return false;
}

export function fireRocketAt(targetX, targetY, currentTime) {
  // Allow firing in bazooka mode on any level, or during boss fight
  const canFire = (isBazookaMode() && gameState.bazooka && gameState.bazooka.has) || (gameState.boss && gameState.boss.active);
  if (!canFire) return false;
  if (!gameState.bazooka || !gameState.bazooka.has || gameState.bazooka.ammo <= 0) return false;
  const sx = gameState.player.x + 0.5;
  const sy = gameState.player.y + 0.5;
  const tx = targetX + 0.5;
  const ty = targetY + 0.5;
  const dx = tx - sx; const dy = ty - sy;
  const dist = Math.hypot(dx, dy) || 1;
  const speed = 16; // tiles/sec (fast)
  const p = {
    type: 'rocket',
    x: sx, y: sy,
    vx: (dx / dist) * speed,
    vy: (dy / dist) * speed,
    born: currentTime,
    lastUpdate: currentTime,
    radius: 0.25,
    resolved: false,
    smoke: []
  };
  gameState.projectiles.push(p);
  // Always decrement ammo (will regenerate in bazooka mode)
  gameState.bazooka.ammo -= 1;
  try { import('./audio.js').then(a=>a.playRocketFire && a.playRocketFire()); } catch {}
  console.log('[bazooka] fired at', targetX, targetY, 'ammo=', gameState.bazooka.ammo);
  return true;
}

export function damageCoreAt(x, y, isDirect) {
  const b = gameState.boss; if (!b || !b.active) return;
  // Only allow damage while mounted on a pig
  const now = performance.now();
  const mounted = !!(gameState.mountedPigUntil && now < gameState.mountedPigUntil);
  if (!mounted) {
    console.log('[boss] damage blocked - not mounted');
    return;
  }
  const oldHp = b.core.hp;
  const multiplier = isBossDamage10x() ? 10 : 1;
  if (b.core.usesShotHp) {
    b.core.hp = Math.max(0, (b.core.hp || 0) - (1 * multiplier)); // 1 or 10 damage per shot
  } else {
    const dmg = isDirect ? BAZOOKA_DIRECT_DMG : BAZOOKA_SPLASH_DMG;
    b.core.hp = Math.max(0, b.core.hp - (dmg * multiplier));
  }
  console.log('[boss] damage applied:', oldHp, '->', b.core.hp, isDirect ? '(direct)' : '(splash)', multiplier > 1 ? `(${multiplier}x)` : '');
}

// Spawn a buffed end-of-boss seeker directly at center door
function spawnBuffedEndSeeker(x,y) {
  const e = {
    id: 'end_seeker_' + Math.random().toString(36).slice(2,8),
    type: 'seeker', mobility: 'ground', isGrounded: true,
    x, y, fx: x + 0.5, fy: y + 0.5,
    state: 'rage', // starts enraged
    roamDir: null,
    speedRoam: 5.5,
    speedRage: 8.0,
    rageUntil: performance.now() + 600000, // effectively persistent until escape
    rageStartAt: performance.now(),
    lastUpdateAt: 0,
    target: null,
    lastPathAt: 0,
    pathInterval: 120,
    flashUntil: 0,
    detectRange: 9,
    chaseBeepAt: 0,
    roamStepsLeft: 0,
    roamGoal: null,
    _roamGoalSetAt: 0,
    path: null,
    pathIndex: 0,
    pathCooldownUntil: 0,
    nextGoalAt: 0,
    recent: [],
    alertTarget: null,
    alertUntil: 0,
    _alertDist: null,
    _lastMoveAt: 0,
    _lastPos: { x: x + 0.5, y: y + 0.5 },
    visitLog: [],
    avoidCenter: null,
    avoidUntil: 0,
    _bossSummoned: true // so cleanup logic treats it specially if needed
  };
  if (!gameState.enemies) gameState.enemies = [];
  gameState.enemies.push(e);
  return e;
}
