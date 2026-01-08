// level11.js - Level 11: "Redeem Yourself"

import { gameState, MAZE_WIDTH, MAZE_HEIGHT, fadeToBlack, fadeFromBlack, setStatusMessage } from './state.js';
import { CELL } from './maze.js';
import { CELL_SIZE } from './renderer.js';

// Level 11 state - persists across room changes
export const level11State = {
    active: false,
    currentRoom: 'spawn', // 'spawn', 'hub', 'puzzle', 'maze', 'finale'
    inventory: {
        greenKey: false,
        yellowKey: false,
        flashlight: false,
        flashlightOn: false
    },
    flashlightAngle: 0, // Angle the flashlight is pointing (radians)
    flashlightBeamX: 0, // Mouse X position for flashlight beam tracking
    flashlightBeamY: 0, // Mouse Y position for flashlight beam tracking
    rooms: {
        puzzle: {
            visited: false,
            tiles: Array(9).fill(false), // 3x3 grid (false = red/unpressed, true = green/pressed)
            solved: false,
            greenKeyTaken: false,
            flashlightTaken: false, // Flashlight is now in puzzle room with green key
            loreRead: false
        },
        maze: {
            visited: false,
            yellowKeyTaken: false,
            yellowKeyPos: null, // {x, y} - random spawn
            enemies: [], // [{fx, fy, targetX, targetY, nextMoveTime, exposureTime, gridX, gridY}]
            brightness: 0 // 0% brightness = pitch black
        },
        hub: {
            visited: false,
            notePickedUp: false
        }
    },
    doorTransitioning: false,
    transitionTarget: null,
    cutsceneActive: false,
    cutsceneStep: 0,
    cutsceneStartTime: 0,
    noteOverlay: null, // {text, visible}
    goodEndingNote: false, // True after player disables power supply
    powerDecisionMade: false, // True after player makes power decision
    powerSystemPos: null, // Position of power system in finale room
    powerSystemDestroyed: false // True if power system destroyed by bazooka
};

// Puzzle solution pattern (matches paper note)
export const PUZZLE_SOLUTION = [
    true, false, true,
    false, true, false,
    true, false, true
];

/**
 * Initialize Level 11 - called when clicking [Redeem Yourself]
 */
export function initLevel11() {
    console.log('[Level 11] Initializing...');
    
    // Reset Level 11 state (fresh start)
    level11State.active = true;
    level11State.currentRoom = 'spawn';
    level11State.inventory = {
        greenKey: false,
        yellowKey: false,
        flashlight: false,
        flashlightOn: false
    };
    level11State.flashlightAngle = 0;
    level11State.rooms.puzzle = {
        visited: false,
        tiles: Array(9).fill(false),
        solved: false,
        greenKeyTaken: false,
        flashlightTaken: false, // Flashlight spawns with green key
        loreRead: false
    };
    
    // Yellow key positions in the dark maze (will be randomly chosen when entering maze)
    // These positions are spread throughout the fixed maze in maze.js
    const yellowKeyPositions = [
        { x: 4, y: 9 },    // Top-left corner area
        { x: 4, y: 19 },   // Bottom-left corner area
        { x: 16, y: 9 },   // Top-right area
        { x: 16, y: 19 },  // Bottom-right area
        { x: 9, y: 14 },   // Center-left
        { x: 12, y: 11 },  // Upper-center
        { x: 6, y: 17 },   // Lower-left
        { x: 15, y: 17 }   // Lower-right
    ];
    const randomPos = yellowKeyPositions[Math.floor(Math.random() * yellowKeyPositions.length)];
    
    level11State.rooms.maze = {
        visited: false,
        yellowKeyTaken: false,
        yellowKeyPos: randomPos,
        brightness: 0, // 0% brightness = pitch black
        // Bat enemies with grid-based movement
        enemies: [
            { fx: 6, fy: 9, gridX: 6, gridY: 9, targetX: 6, targetY: 9, nextMoveTime: 0, exposureTime: 0, id: 0 },
            { fx: 10, fy: 15, gridX: 10, gridY: 15, targetX: 10, targetY: 15, nextMoveTime: 0, exposureTime: 0, id: 1 },
            { fx: 14, fy: 12, gridX: 14, gridY: 12, targetX: 14, targetY: 12, nextMoveTime: 0, exposureTime: 0, id: 2 },
            { fx: 5, fy: 18, gridX: 5, gridY: 18, targetX: 5, targetY: 18, nextMoveTime: 0, exposureTime: 0, id: 3 }
        ]
    };
    level11State.rooms.hub = {
        visited: false,
        notePickedUp: false
    };
    level11State.cutsceneActive = false;
    level11State.cutsceneStep = 0;
    level11State.noteOverlay = null;
    level11State.goodEndingNote = false;
    level11State.powerDecisionMade = false;
    
    // Set game mode
    gameState.mode = 'level11';
    gameState.currentLevel = 11;
    gameState.isLevel11 = true;
    gameState.isPaused = false;
    gameState.gameStatus = 'playing';
    
    // CRITICAL: Clear all Level 10 boss state to stop lava/collapse/freeze
    gameState.boss = null;
    gameState.bazookaPickup = null;
    gameState.projectiles = [];
    gameState.enemies = [];
    gameState.enemiesFrozenUntil = 0;
    gameState.playerInvincibleUntil = 0;
    gameState.inputLocked = false;
    // CRITICAL: Clear old level11 bat system to prevent dual bat systems
    gameState.level11 = null;
    gameState.bossVictory = false;
    
    // Initialize bazooka ONLY if bazooka mode is active
    import('./config.js').then(cfg => {
        if (cfg.isBazookaMode && cfg.isBazookaMode()) {
            gameState.bazooka = { has: true, ammo: 15, maxAmmo: 15 };
            console.log('[Level 11] Bazooka mode active - Energy Blaster enabled (15/15 ammo, auto-regen)');
        } else {
            gameState.bazooka = { has: false, ammo: 0, maxAmmo: 0 };
            console.log('[Level 11] Bazooka mode not active - no Energy Blaster');
        }
    }).catch(() => {
        gameState.bazooka = { has: false, ammo: 0, maxAmmo: 0 };
    });
    
    // Initialize level11 state in gameState for bat logic
    gameState.level11 = { flashlightOn: false };
    
    // Disable abilities for Level 11
    gameState.lives = 0; // No lives system
    gameState.stamina = 0; // No stamina
    gameState.zapTraps = 0; // No traps
    gameState.isSprinting = false;
    gameState.isJumpCharging = false;
    gameState.blockActive = false;
    
    // Build spawn room (vertical hallway) - this sets player position
    buildSpawnRoom();
    
    // Fade in from black
    fadeFromBlack(1.0);
    
    console.log('[Level 11] Initialized in spawn room at', gameState.player);
}

/**
 * Build the initial spawn hallway
 */
function buildSpawnRoom() {
    const grid = Array(MAZE_HEIGHT).fill(null).map(() => Array(MAZE_WIDTH).fill(CELL.WALL));
    
    // Create vertical hallway 3 tiles wide
    const cx = Math.floor(MAZE_WIDTH / 2);
    const hallwayHeight = 20;
    const startY = Math.floor((MAZE_HEIGHT - hallwayHeight) / 2);
    
    // Build hallway from bottom to top
    for (let y = startY + 1; y < startY + hallwayHeight - 1; y++) {
        grid[y][cx - 1] = CELL.EMPTY;
        grid[y][cx] = CELL.EMPTY;
        grid[y][cx + 1] = CELL.EMPTY;
    }
    
    // Yellow door at top of hallway
    const doorY = startY + 1;
    grid[doorY][cx] = CELL.EXIT;
    
    // Player spawns at bottom of hallway
    const spawnY = startY + hallwayHeight - 3;
    gameState.player.x = cx;
    gameState.player.y = spawnY;
    
    gameState.maze = grid;
    gameState.generators = [];
    gameState.teleportPads = [];
}

/**
 * Build the central hub room
 */
function buildHubRoom() {
    console.log('[Level 11] Building hub room. Puzzle solved:', level11State.rooms.puzzle.solved);
    const grid = Array(MAZE_HEIGHT).fill(null).map(() => Array(MAZE_WIDTH).fill(CELL.WALL));
    
    const cx = Math.floor(MAZE_WIDTH / 2);
    const cy = Math.floor(MAZE_HEIGHT / 2);
    const roomSize = 8;
    
    // Open central area
    for (let y = cy - roomSize; y <= cy + roomSize; y++) {
        for (let x = cx - roomSize; x <= cx + roomSize; x++) {
            if (x > 0 && x < MAZE_WIDTH - 1 && y > 0 && y < MAZE_HEIGHT - 1) {
                grid[y][x] = CELL.EMPTY;
            }
        }
    }
    
    // Player spawns in center
    gameState.player.x = cx;
    gameState.player.y = cy;
    
    // Top door (locked until yellow key) - use GENERATOR as locked marker
    grid[cy - roomSize][cx] = level11State.inventory.yellowKey ? CELL.EXIT : CELL.GENERATOR;
    
    // Right door (puzzle room) - always open
    grid[cy][cx + roomSize] = CELL.EXIT;
    
    // Left door (dark maze) - locked until green key
    grid[cy][cx - roomSize] = level11State.inventory.greenKey ? CELL.EXIT : CELL.GENERATOR;
    
    gameState.maze = grid;
}

/**
 * Build puzzle room
 */
function buildPuzzleRoom() {
    const grid = Array(MAZE_HEIGHT).fill(null).map(() => Array(MAZE_WIDTH).fill(CELL.WALL));
    
    const cx = Math.floor(MAZE_WIDTH / 2);
    const cy = Math.floor(MAZE_HEIGHT / 2);
    const roomSize = 7;
    
    // Open top half (accessible puzzle area)
    for (let y = cy - roomSize; y <= cy; y++) {
        for (let x = cx - roomSize; x <= cx + roomSize; x++) {
            if (x > 0 && x < MAZE_WIDTH - 1 && y > 0 && y < MAZE_HEIGHT - 1) {
                grid[y][x] = CELL.EMPTY;
            }
        }
    }
    
    // Player spawns near left edge (came from hub)
    gameState.player.x = cx - roomSize + 2;
    gameState.player.y = cy - 1;
    
    // Back door to hub (left side)
    grid[cy][cx - roomSize] = CELL.EXIT;
    
    // Red barrier wall blocking bottom half (use GENERATOR for impassable red doors)
    if (!level11State.rooms.puzzle.solved) {
        for (let x = cx - roomSize; x <= cx + roomSize; x++) {
            if (x > 0 && x < MAZE_WIDTH - 1) {
                grid[cy + 1][x] = CELL.GENERATOR; // Red impassable barrier
            }
        }
    } else {
        // Puzzle solved: open bottom area with green key and flashlight
        for (let y = cy + 1; y <= cy + roomSize; y++) {
            for (let x = cx - roomSize; x <= cx + roomSize; x++) {
                if (x > 0 && x < MAZE_WIDTH - 1 && y > 0 && y < MAZE_HEIGHT - 1) {
                    grid[y][x] = CELL.EMPTY;
                }
            }
        }
        
        // Spawn green key and flashlight together in bottom area
        level11State.rooms.puzzle.greenKeyPos = { x: cx - 1, y: cy + 4 };
        level11State.rooms.puzzle.flashlightPos = { x: cx + 1, y: cy + 4 };
    }
    
    gameState.maze = grid;
    level11State.rooms.puzzle.visited = true;
}

/**
 * Build dark maze room - Proper medium-sized maze with 0% brightness
 * Player uses flashlight to navigate, but shining on bats for 0.5s kills you
 */
function buildMazeRoom() {
    console.log('[Level 11] Building dark maze room (pitch black, proper maze)');
    // Ensure flashlight is OFF when entering maze
    level11State.inventory.flashlightOn = false;
    level11State.mazeRoomLoadTime = performance.now();
    level11State.flashlightActivatedInMaze = false;  // Track if flashlight has been used in THIS maze
    const grid = Array(MAZE_HEIGHT).fill(null).map(() => Array(MAZE_WIDTH).fill(CELL.WALL));
    
    // Create a medium-sized maze area (16x16 from x:4-19, y:7-22)
    const mazeLeft = 4;
    const mazeRight = 19;
    const mazeTop = 7;
    const mazeBottom = 22;
    
    // Simple seeded random for consistent maze
    let seed = 12345;
    const random = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
    };
    
    // Recursive backtracking maze generation
    const carve = (x, y) => {
        grid[y][x] = CELL.EMPTY;
        
        const dirs = [
            { dx: 0, dy: -2 },
            { dx: 2, dy: 0 },
            { dx: 0, dy: 2 },
            { dx: -2, dy: 0 }
        ];
        
        // Shuffle directions
        for (let i = dirs.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
        }
        
        for (const dir of dirs) {
            const nx = x + dir.dx;
            const ny = y + dir.dy;
            
            if (nx >= mazeLeft && nx <= mazeRight && 
                ny >= mazeTop && ny <= mazeBottom && 
                grid[ny][nx] === CELL.WALL) {
                // Carve wall between current and next
                grid[y + dir.dy / 2][x + dir.dx / 2] = CELL.EMPTY;
                carve(nx, ny);
            }
        }
    };
    
    // Start carving from top-left of maze area (odd coordinates)
    const startX = mazeLeft + 1;
    const startY = mazeTop + 1;
    carve(startX, startY);
    
    // Door on right side connecting back to hub (at center-right)
    const doorX = mazeRight + 1;
    const doorY = Math.floor((mazeTop + mazeBottom) / 2);
    grid[doorY][doorX] = CELL.EXIT;
    grid[doorY][doorX - 1] = CELL.EMPTY; // Clear path to door
    grid[doorY][mazeRight] = CELL.EMPTY;
    
    // Player spawns near the door
    gameState.player.x = doorX - 1;
    gameState.player.y = doorY;
    
    // Define 8 possible yellow key locations (all reachable empty cells)
    const possibleKeyPositions = [
        { x: mazeLeft + 1, y: mazeTop + 1 },      // Top-left
        { x: mazeLeft + 1, y: mazeBottom - 1 },   // Bottom-left
        { x: mazeRight - 1, y: mazeTop + 1 },     // Top-right
        { x: mazeRight - 1, y: mazeBottom - 1 },  // Bottom-right
        { x: Math.floor((mazeLeft + mazeRight) / 2), y: mazeTop + 3 },  // Top-center
        { x: Math.floor((mazeLeft + mazeRight) / 2), y: mazeBottom - 3 }, // Bottom-center
        { x: mazeLeft + 3, y: Math.floor((mazeTop + mazeBottom) / 2) },  // Left-center
        { x: mazeRight - 3, y: Math.floor((mazeTop + mazeBottom) / 2) }  // Right-center
    ];
    
    // Make sure key positions are valid empty cells (carve if needed)
    for (const pos of possibleKeyPositions) {
        if (grid[pos.y] && grid[pos.y][pos.x] === CELL.WALL) {
            grid[pos.y][pos.x] = CELL.EMPTY;
            // Connect to adjacent empty cell
            const neighbors = [
                { x: pos.x - 1, y: pos.y },
                { x: pos.x + 1, y: pos.y },
                { x: pos.x, y: pos.y - 1 },
                { x: pos.x, y: pos.y + 1 }
            ];
            for (const n of neighbors) {
                if (grid[n.y] && grid[n.y][n.x] === CELL.EMPTY) break;
                if (grid[n.y] && grid[n.y][n.x] === CELL.WALL) {
                    grid[n.y][n.x] = CELL.EMPTY;
                    break;
                }
            }
        }
    }
    
    // Randomly select yellow key position
    const keyIndex = Math.floor(random() * possibleKeyPositions.length);
    level11State.rooms.maze.yellowKeyPos = possibleKeyPositions[keyIndex];
    
    gameState.maze = grid;
    level11State.rooms.maze.visited = true;
    
    // Find valid spawn positions for player (start) and bats (opposite side)
    // Player always spawns at (1,1), so bats should spawn near bottom-right
    const batSpawns = [
        { x: mazeRight - 3, y: mazeBottom - 3 },
        { x: mazeRight - 3, y: mazeBottom - 5 }
    ];
    
    // ENSURE bats never spawn on player
    for (const spawn of batSpawns) {
        if (spawn.x === gameState.player.x && spawn.y === gameState.player.y) {
            console.warn('[WARNING] Bat spawn position overlaps player! Adjusting...');
            spawn.x = mazeRight - 5;
            spawn.y = mazeBottom - 5;
        }
    }
    
    // Make sure bat spawns are on empty cells
    for (const spawn of batSpawns) {
        if (grid[spawn.y] && grid[spawn.y][spawn.x] === CELL.WALL) {
            grid[spawn.y][spawn.x] = CELL.EMPTY;
        }
    }
    
    level11State.rooms.maze.enemies = batSpawns.map((spawn, idx) => ({
        fx: spawn.x,
        fy: spawn.y,
        gridX: spawn.x,
        gridY: spawn.y,
        targetX: spawn.x,
        targetY: spawn.y,
        moving: false,
        nextMoveTime: performance.now() + 1000 + idx * 300,
        exposureTime: 0,
        aggro: false,
        exposureStartTime: null,  // Track when exposure started
        frozen: true,  // NEW: Bats start FROZEN until flashlight is activated
        id: idx,
        shieldHealth: 0
    }));
    
    console.log('[Level 11] Dark maze built with', level11State.rooms.maze.enemies.length, 'bats, key at', level11State.rooms.maze.yellowKeyPos);
    console.log('[Level 11] Player spawned at:', gameState.player.x, gameState.player.y);
    console.log('[Level 11] Bat positions:', level11State.rooms.maze.enemies.map(b => ({ x: b.gridX, y: b.gridY })));
}

/**
 * Build finale cutscene room
 */
function buildFinaleRoom() {
    const grid = Array(MAZE_HEIGHT).fill(null).map(() => Array(MAZE_WIDTH).fill(CELL.EMPTY));
    
    // Add border walls
    for (let x = 0; x < MAZE_WIDTH; x++) {
        grid[0][x] = CELL.WALL;
        grid[MAZE_HEIGHT - 1][x] = CELL.WALL;
    }
    for (let y = 0; y < MAZE_HEIGHT; y++) {
        grid[y][0] = CELL.WALL;
        grid[y][MAZE_WIDTH - 1] = CELL.WALL;
    }
    
    // Player spawns near bottom center
    const cx = Math.floor(MAZE_WIDTH / 2);
    gameState.player.x = cx;
    gameState.player.y = MAZE_HEIGHT - 5;
    
    // Power system at top center (can be shot with bazooka)
    level11State.powerSystemPos = { x: cx, y: 3 };
    level11State.powerSystemDestroyed = false;
    
    // Sync to gameState for projectile collision in state.js
    gameState.powerSystemPos = level11State.powerSystemPos;
    gameState.powerSystemDestroyed = false;
    
    gameState.maze = grid;
    
    // Start cutscene
    level11State.cutsceneActive = true;
    level11State.cutsceneStep = 0;
    level11State.cutsceneStartTime = 0;
    level11State.powerDecisionMade = false;
    gameState.inputLocked = true;
}

/**
 * Show power supply disable prompt
 */
function showPowerPrompt() {
    const overlay = document.createElement('div');
    overlay.id = 'power-prompt-overlay';
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.88);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        color: #fff;
        font-family: 'Courier New', monospace;
    `;

    const panel = document.createElement('div');
    panel.style.cssText = `
        background: rgba(18, 18, 28, 0.96);
        border: 3px solid #ff4455;
        box-shadow: 0 0 32px rgba(255,68,85,0.5);
        padding: 22px 26px;
        border-radius: 14px;
        min-width: 320px;
        text-align: center;
    `;

    const title = document.createElement('div');
    title.textContent = 'Disable Power Supply?';
    title.style.cssText = 'font-weight: bold; font-size: 18px; letter-spacing: 1.2px; margin-bottom: 18px; color: #ff4455;';
    panel.appendChild(title);

    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'display: flex; gap: 14px; justify-content: center;';

    const yesBtn = document.createElement('button');
    yesBtn.innerHTML = '✓ YES';
    yesBtn.style.cssText = `
        padding: 12px 24px;
        background: #00cc66;
        color: #000;
        border: none;
        border-radius: 8px;
        font-weight: bold;
        font-size: 16px;
        cursor: pointer;
        font-family: 'Courier New', monospace;
    `;
    yesBtn.addEventListener('click', () => {
        overlay.remove();
        level11State.powerDecisionMade = true;
        level11State.goodEndingNote = true;
        level11State.cutsceneStep = 3; // Good ending path
    });

    const noBtn = document.createElement('button');
    noBtn.innerHTML = '✗ NO';
    noBtn.style.cssText = `
        padding: 12px 24px;
        background: #ff4455;
        color: #fff;
        border: none;
        border-radius: 8px;
        font-weight: bold;
        font-size: 16px;
        cursor: pointer;
        font-family: 'Courier New', monospace;
    `;
    noBtn.addEventListener('click', () => {
        overlay.remove();
        level11State.powerDecisionMade = true;
        level11State.goodEndingNote = false;
        level11State.cutsceneStep = 4; // Bad ending path
    });

    btnContainer.appendChild(yesBtn);
    btnContainer.appendChild(noBtn);
    panel.appendChild(btnContainer);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
}

/**
 * Transition to a new room
 */
export function transitionToRoom(targetRoom) {
    if (level11State.doorTransitioning) return;
    
    level11State.doorTransitioning = true;
    level11State.transitionTarget = targetRoom;
    
    // Fade to black
    fadeToBlack(0.5);
    
    // After fade completes, load new room
    setTimeout(() => {
        level11State.currentRoom = targetRoom;
        
        switch (targetRoom) {
            case 'hub':
                buildHubRoom();
                break;
            case 'puzzle':
                buildPuzzleRoom();
                break;
            case 'maze':
                buildMazeRoom();
                break;
            case 'finale':
                buildFinaleRoom();
                break;
        }
        
        // Fade in
        fadeFromBlack(0.5);
        
        setTimeout(() => {
            level11State.doorTransitioning = false;
        }, 500);
    }, 500);
}

/**
 * Handle Level 11 interactions (E key)
 */
export function handleLevel11Interact() {
    // Close puzzle clue if it's open
    if (level11State.puzzleClueVisible) {
        level11State.puzzleClueVisible = false;
        return;
    }
    
    const px = gameState.player.x;
    const py = gameState.player.y;
    
    // Check for doors (EXIT tiles) in adjacent cells or current cell
    const checkCell = (x, y) => {
        if (x < 0 || x >= MAZE_WIDTH || y < 0 || y >= MAZE_HEIGHT) return false;
        return gameState.maze[y] && gameState.maze[y][x] === CELL.EXIT;
    };
    
    const onDoor = checkCell(px, py) || checkCell(px + 1, py) || checkCell(px - 1, py) || 
                   checkCell(px, py + 1) || checkCell(px, py - 1);
    
    if (onDoor) {
        // Determine which room transition
        if (level11State.currentRoom === 'spawn') {
            transitionToRoom('hub');
        } else if (level11State.currentRoom === 'hub') {
            const cx = Math.floor(MAZE_WIDTH / 2);
            const cy = Math.floor(MAZE_HEIGHT / 2);
            const roomSize = 8;
            
            if (px === cx && py === cy - roomSize) {
                // Top door
                if (level11State.inventory.yellowKey) {
                    transitionToRoom('finale');
                } else {
                    setStatusMessage('This door is locked. Need yellow key.');
                }
            } else if (px === cx + roomSize && py === cy) {
                // Right door
                transitionToRoom('puzzle');
            } else if (px === cx - roomSize && py === cy) {
                // Left door
                if (level11State.inventory.greenKey) {
                    transitionToRoom('maze');
                } else {
                    setStatusMessage('This door is locked. Need green key.');
                }
            }
        } else if (level11State.currentRoom === 'puzzle') {
            const cx = Math.floor(MAZE_WIDTH / 2);
            const cy = Math.floor(MAZE_HEIGHT / 2);
            const roomSize = 7;
            
            if (px === cx - roomSize && py === cy) {
                // Back to hub
                transitionToRoom('hub');
            } else if (px === cx && py === cy + roomSize) {
                // Bottom door (green key room)
                if (!level11State.rooms.puzzle.greenKeyTaken) {
                    level11State.inventory.greenKey = true;
                    level11State.rooms.puzzle.greenKeyTaken = true;
                    setStatusMessage('Got green key!');
                }
            }
        } else if (level11State.currentRoom === 'maze') {
            // Back to hub
            transitionToRoom('hub');
        }
    }
    
    // Check for green key and flashlight pickup in puzzle room (after solving puzzle)
    if (level11State.currentRoom === 'puzzle' && level11State.rooms.puzzle.solved) {
        const cx = Math.floor(MAZE_WIDTH / 2);
        const cy = Math.floor(MAZE_HEIGHT / 2);
        
        // Check for green key pickup
        if (!level11State.rooms.puzzle.greenKeyTaken && level11State.rooms.puzzle.greenKeyPos) {
            const greenPos = level11State.rooms.puzzle.greenKeyPos;
            if (Math.abs(px - greenPos.x) <= 1 && Math.abs(py - greenPos.y) <= 1) {
                level11State.inventory.greenKey = true;
                level11State.rooms.puzzle.greenKeyTaken = true;
                setStatusMessage('Got green key!');
                return;
            }
        }
        
        // Check for flashlight pickup
        if (!level11State.inventory.flashlight && !level11State.rooms.puzzle.flashlightTaken && level11State.rooms.puzzle.flashlightPos) {
            const flashPos = level11State.rooms.puzzle.flashlightPos;
            if (Math.abs(px - flashPos.x) <= 1 && Math.abs(py - flashPos.y) <= 1) {
                level11State.inventory.flashlight = true;
                level11State.rooms.puzzle.flashlightTaken = true;
                setStatusMessage('Got flashlight! Press F to toggle. Be careful with the bats!');
                
                // Achievement: Flashlight Blaster (pick up flashlight while bazooka mode active)
                import('./config.js').then(cfg => {
                    const bazookaModeActive = cfg.isBazookaMode();
                    console.log('[Level 11] Flashlight picked up. Bazooka mode active:', bazookaModeActive);
                    
                    if (bazookaModeActive) {
                        console.log('[Level 11] Unlocking Flashlight Blaster achievement!');
                        return import('./achievements.js');
                    }
                }).then(achieveMod => {
                    if (achieveMod && achieveMod.unlockAchievement) {
                        achieveMod.unlockAchievement('flashlight_blaster');
                    }
                }).catch(err => {
                    console.error('[Level 11] Achievement check failed:', err);
                });
                return;
            }
        }
    }
    
    // Check for good ending note pickup in hub (after disabling power supply)
    if (level11State.currentRoom === 'hub' && level11State.goodEndingNote && !level11State.rooms.hub.notePickedUp) {
        const cx = Math.floor(MAZE_WIDTH / 2);
        const cy = Math.floor(MAZE_HEIGHT / 2);
        const noteX = cx + 2;
        const noteY = cy - 3;
        
        if (Math.abs(px - noteX) <= 1 && Math.abs(py - noteY) <= 1) {
            level11State.rooms.hub.notePickedUp = true;
            setStatusMessage('Found a note... You won.');
            // Trigger the secret found achievement and show ending
            import('./achievements.js').then(mod => {
                if (mod.checkAchievements) {
                    mod.checkAchievements('secret_found', { secretId: 'good_ending_note' });
                }
            }).catch(() => {});
            // Trigger the good ending
            setTimeout(() => {
                showGoodEndingCredits();
            }, 2000);
        }
    }
    
    // Check for yellow key pickup in maze
    if (level11State.currentRoom === 'maze' && !level11State.rooms.maze.yellowKeyTaken) {
        const keyPos = level11State.rooms.maze.yellowKeyPos;
        if (Math.abs(px - keyPos.x) <= 1 && Math.abs(py - keyPos.y) <= 1) {
            level11State.inventory.yellowKey = true;
            level11State.rooms.maze.yellowKeyTaken = true;
            setStatusMessage('Got yellow key!');
        }
    }
    
    // Puzzle room interactions
    if (level11State.currentRoom === 'puzzle') {
        const cx = Math.floor(MAZE_WIDTH / 2);
        const cy = Math.floor(MAZE_HEIGHT / 2);
        
        // Check for paper clue (top wall center)
        const paperX = cx;
        const paperY = 3;
        if (Math.abs(px - paperX) <= 1 && Math.abs(py - paperY) <= 1) {
            showPuzzleClue();
            return;
        }
        
        // Check for reset button (bottom center)
        if (!level11State.rooms.puzzle.solved) {
            const resetX = cx;
            const resetY = MAZE_HEIGHT - 3;
            if (Math.abs(px - resetX) <= 1 && Math.abs(py - resetY) <= 1) {
                resetPuzzle();
                return;
            }
        }
        
        // Toggle puzzle tiles (3x3 grid centered)
        if (!level11State.rooms.puzzle.solved) {
            const gridStartX = cx - 1;
            const gridStartY = cy - 1;
            
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    const tileX = gridStartX + j;
                    const tileY = gridStartY + i;
                    
                    if (Math.abs(px - tileX) <= 0 && Math.abs(py - tileY) <= 0) {
                        const index = i * 3 + j;
                        level11State.rooms.puzzle.tiles[index] = !level11State.rooms.puzzle.tiles[index];
                        checkPuzzleSolution();
                        return;
                    }
                }
            }
        }
    }
}

/**
 * Check puzzle solution
 */
function checkPuzzleSolution() {
    const tiles = level11State.rooms.puzzle.tiles;
    const match = tiles.every((val, idx) => val === PUZZLE_SOLUTION[idx]);
    
    if (match && !level11State.rooms.puzzle.solved) {
        level11State.rooms.puzzle.solved = true;
        setStatusMessage('Puzzle solved! Door opened.');
        // Rebuild room to show opened door
        buildPuzzleRoom();
    }
}

/**
 * Toggle flashlight
 */
export function toggleFlashlight() {
    if (level11State.inventory.flashlight) {
        level11State.inventory.flashlightOn = !level11State.inventory.flashlightOn;
        // Sync to gameState for bat logic in state.js
        if (gameState.level11) {
            gameState.level11.flashlightOn = level11State.inventory.flashlightOn;
        }
        setStatusMessage(level11State.inventory.flashlightOn ? 'Flashlight ON' : 'Flashlight OFF');
    }
}

/**
 * Update Level 11 systems
 */
export function updateLevel11(currentTime) {
    if (!level11State.active) return;
    
    // Update flashlight beam position to track mouse (for maze room)
    if (level11State.currentRoom === 'maze' && gameState.mousePosition) {
        level11State.flashlightBeamX = gameState.mousePosition.x;
        level11State.flashlightBeamY = gameState.mousePosition.y;
    }
    
    // Check for bazooka projectile hitting power system in finale room
    if (level11State.currentRoom === 'finale' && level11State.powerSystemPos && !level11State.powerSystemDestroyed) {
        if (gameState.projectiles && gameState.projectiles.length > 0) {
            for (const proj of gameState.projectiles) {
                const projX = Math.round(proj.x);
                const projY = Math.round(proj.y);
                const powerX = Math.round(level11State.powerSystemPos.x);
                const powerY = Math.round(level11State.powerSystemPos.y);
                
                // Check if projectile hit power system
                if (Math.abs(projX - powerX) <= 1 && Math.abs(projY - powerY) <= 1) {
                    level11State.powerSystemDestroyed = true;
                    level11State.powerDecisionMade = true;
                    level11State.goodEndingNote = true;
                    level11State.cutsceneStep = 3; // Good ending path
                    
                    // Remove the prompt if it's showing
                    const promptOverlay = document.getElementById('power-prompt-overlay');
                    if (promptOverlay) promptOverlay.remove();
                    
                    // Achievement: why??? (destroy power system with bazooka mode)
                    import('./config.js').then(cfg => {
                        const bazookaModeActive = cfg.isBazookaMode();
                        console.log('[Level 11] Power system hit. Bazooka mode active:', bazookaModeActive);
                        
                        if (bazookaModeActive) {
                            import('./achievements.js').then(m => {
                                m.unlockAchievement('bazooka_power_destroy');
                                console.log('[Level 11] why??? achievement unlocked!');
                            });
                        }
                    }).catch(() => {});
                    
                    // Remove projectile
                    const idx = gameState.projectiles.indexOf(proj);
                    if (idx >= 0) gameState.projectiles.splice(idx, 1);
                    
                    break;
                }
            }
        }
    }
    
    // Update cutscene
    if (level11State.cutsceneActive) {
        updateCutscene(currentTime);
    }
    
    // Update maze enemies
    if (level11State.currentRoom === 'maze') {
        updateMazeEnemies(currentTime);
    }
}

/**
 * Update maze enemies with flashlight exposure mechanics
 * Bats: Grid-locked movement, frozen until flashlight is activated
 * Then only stalk when aggroed (3s flashlight exposure)
 * Aggroed bats have light aura around them so you can see them in darkness
 * Bats must actually catch the player to kill (not instant on exposure)
 */
function updateMazeEnemies(currentTime) {
    const enemies = level11State.rooms.maze.enemies;
    if (!enemies || enemies.length === 0) return;
    
    const px = Math.round(gameState.player.x);
    const py = Math.round(gameState.player.y);
    // Flashlight must be both ON and player must HAVE the flashlight item
    const flashlightOn = level11State.inventory.flashlightOn && level11State.inventory.flashlight;
    
    // DETECT FIRST FLASHLIGHT ACTIVATION IN THIS MAZE
    if (flashlightOn && !level11State.flashlightActivatedInMaze) {
        level11State.flashlightActivatedInMaze = true;
        console.log('[maze] FLASHLIGHT ACTIVATED FOR FIRST TIME - Unfreezing bats!');
        // Unfreeze all bats
        for (const enemy of enemies) {
            enemy.frozen = false;
        }
    }
    
    // DEBUG: Log if flashlight state seems wrong
    if (enemies[0] && !enemies[0]._flashlightChecked) {
        console.log('[maze] Flashlight state - ON:', level11State.inventory.flashlightOn, ', HAS:', level11State.inventory.flashlight, ', Combined:', flashlightOn);
        console.log('[maze] Bats frozen:', enemies.map(e => ({ id: e.id, frozen: e.frozen, aggro: e.aggro, x: e.gridX, y: e.gridY })));
        console.log('[maze] Player at:', px, py);
        enemies[0]._flashlightChecked = true;
    }
    
    const MOVE_INTERVAL = 600; // ms between moves - slower grid-locked movement
    
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        
        // === Check if enemy is exposed by flashlight beam ===
        // CRITICAL: Only check beam if flashlight is ON and player HAS flashlight
        let isExposedByBeam = false;
        if (flashlightOn && level11State.inventory.flashlight && level11State.inventory.flashlightOn) {
            const beamStartX = gameState.player.x + 0.5;
            const beamStartY = gameState.player.y + 0.5;
            
            // Mouse position in canvas pixels - convert to tile coordinates
            const mousePixelX = gameState.mousePosition?.x || 0;
            const mousePixelY = gameState.mousePosition?.y || 0;
            const mouseTileX = mousePixelX / CELL_SIZE;
            const mouseTileY = mousePixelY / CELL_SIZE;
            
            // Calculate beam direction
            const bdx = mouseTileX - beamStartX;
            const bdy = mouseTileY - beamStartY;
            const beamDist = Math.sqrt(bdx * bdx + bdy * bdy);
            
            if (beamDist > 0.1) {
                const normDx = bdx / beamDist;
                const normDy = bdy / beamDist;
                
                // Vector from player to enemy center
                const enemyCenterX = enemy.gridX + 0.5;
                const enemyCenterY = enemy.gridY + 0.5;
                const toEnemyX = enemyCenterX - beamStartX;
                const toEnemyY = enemyCenterY - beamStartY;
                const distToEnemy = Math.sqrt(toEnemyX * toEnemyX + toEnemyY * toEnemyY);
                
                // Flashlight beam range: 8 tiles
                if (distToEnemy > 0 && distToEnemy <= 8) {
                    // Dot product to check if enemy is in beam direction
                    const dotProduct = (toEnemyX * normDx + toEnemyY * normDy);
                    // Perpendicular distance from enemy to beam line
                    const perpDist = Math.abs(toEnemyX * normDy - toEnemyY * normDx);
                    
                    // If in forward cone and within beam width
                    if (dotProduct > 0 && perpDist < 1.8) {
                        isExposedByBeam = true;
                    }
                }
            }
        }
        
        // === Update exposure time ===
        if (isExposedByBeam) {
            // Mark when exposure started if not already tracking
            if (!enemy.exposureStartTime) {
                enemy.exposureStartTime = currentTime;
                console.log('[bat exposure] Bat', enemy.id, 'exposure started');
            }
            // Calculate real elapsed time since exposure started
            enemy.exposureTime = currentTime - enemy.exposureStartTime;
        } else {
            enemy.exposureTime = 0;
            enemy.exposureStartTime = null;
            // If flashlight is OFF, de-aggro the bat
            if (!flashlightOn) {
                enemy.aggro = false;
            }
        }
        
        // === Aggro bat if exposed for ~3s (3000ms) ===
        if (enemy.exposureTime >= 3000) {
            if (!enemy.aggro) {
                enemy.aggro = true;
                console.log('[bat aggro] Bat', enemy.id, 'entering RAGE MODE! Exposure time:', enemy.exposureTime);
            }
        }
        
        // === STRICTLY Grid-based movement (no interpolation) ===
        // Bats snap directly to grid positions
        enemy.fx = enemy.gridX;
        enemy.fy = enemy.gridY;
        
        // === Move to new grid position when timer expires (ONLY IF NOT FROZEN) ===
        // Frozen bats don't move until flashlight is activated
        if (!enemy.frozen && currentTime >= enemy.nextMoveTime) {
            // Only stalk player if aggroed (exposed to flashlight for 3+ seconds)
            // Non-aggroed bats NEVER stalk, only wander randomly
            const stalkPlayer = enemy.aggro && Math.random() < 0.95;
            
            let bestDir = null;
            let bestDist = Infinity;
            
            const dirs = [
                { dx: 0, dy: -1 },
                { dx: 0, dy: 1 },
                { dx: -1, dy: 0 },
                { dx: 1, dy: 0 }
            ];
            
            if (stalkPlayer) {
                // Find direction that gets closest to player
                for (const dir of dirs) {
                    const testX = enemy.gridX + dir.dx;
                    const testY = enemy.gridY + dir.dy;
                    
                    // Check if valid move
                    if (testX > 0 && testX < MAZE_WIDTH - 1 &&
                        testY > 0 && testY < MAZE_HEIGHT - 1 &&
                        gameState.maze[testY] && gameState.maze[testY][testX] !== CELL.WALL) {
                        
                        const distToPlayer = Math.abs(testX - px) + Math.abs(testY - py);
                        if (distToPlayer < bestDist) {
                            bestDist = distToPlayer;
                            bestDir = dir;
                        }
                    }
                }
            }
            
            // If no stalking direction found or random move, pick random valid direction
            if (!bestDir) {
                // Shuffle directions
                for (let j = dirs.length - 1; j > 0; j--) {
                    const k = Math.floor(Math.random() * (j + 1));
                    [dirs[j], dirs[k]] = [dirs[k], dirs[j]];
                }
                for (const dir of dirs) {
                    const testX = enemy.gridX + dir.dx;
                    const testY = enemy.gridY + dir.dy;
                    if (testX > 0 && testX < MAZE_WIDTH - 1 &&
                        testY > 0 && testY < MAZE_HEIGHT - 1 &&
                        gameState.maze[testY] && gameState.maze[testY][testX] !== CELL.WALL) {
                        bestDir = dir;
                        break;
                    }
                }
            }
            
            // Apply movement
            if (bestDir) {
                enemy.gridX += bestDir.dx;
                enemy.gridY += bestDir.dy;
                enemy.fx = enemy.gridX;
                enemy.fy = enemy.gridY;
            }
            
            // Schedule next move
            enemy.nextMoveTime = currentTime + MOVE_INTERVAL + Math.random() * 200;
        }
        
        // === Check collision with player (only deadly in rage mode - when aggroed) ===
        // SAFEGUARD: Don't allow collision in first 5 SECONDS of room load (player setup time)
        const roomAgeMs = currentTime - level11State.mazeRoomLoadTime;
        
        // ONLY check collision if bat is unfrozen AND aggroed
        // This is a DOUBLE SAFEGUARD
        if (enemy.gridX === px && enemy.gridY === py && roomAgeMs > 5000) {
            console.log('===== BAT COLLISION CHECK =====');
            console.log('[bat collision] Bat', enemy.id, 'at', enemy.gridX, enemy.gridY, 'Hit player at', px, py);
            console.log('[bat state] frozen:', enemy.frozen, ' aggro:', enemy.aggro, 'exposureTime:', enemy.exposureTime);
            console.log('roomAgeMs:', roomAgeMs, 'flashlightOn:', flashlightOn);
            
            // SAFEGUARD 1: If bat is frozen, NEVER kill
            if (enemy.frozen) {
                console.log('[collision] ❌ FROZEN BAT - NO DAMAGE');
                setStatusMessage('You bumped a frozen bat!');
                return;
            }
            
            // SAFEGUARD 2: If bat is not aggroed, NEVER kill
            if (!enemy.aggro) {
                console.log('[collision] ❌ CALM BAT - NO DAMAGE');
                setStatusMessage('A calm bat bumped you.');
                return;
            }
            
            // SAFEGUARD 3: Only kill if BOTH frozen=false AND aggro=true
            if (enemy.frozen === false && enemy.aggro === true) {
                console.log('[collision] ✓ AGGROED + UNFROZEN - DEADLY HIT!');
                setStatusMessage('A raging bat caught you!');
                setTimeout(() => {
                    transitionToRoom('hub');
                }, 800);
                return;
            }
            
            // FINAL SAFEGUARD: Anything else = safe
            console.log('[collision] ❌ OTHER STATE - NO DAMAGE (frozen=' + enemy.frozen + ', aggro=' + enemy.aggro + ')');
        }
    }
}

/**
 * Update finale cutscene
 */
function updateCutscene(currentTime) {
    if (!level11State.cutsceneStartTime) {
        level11State.cutsceneStartTime = currentTime;
    }
    
    const elapsed = currentTime - level11State.cutsceneStartTime;
    
    // Step 0: Auto-walk player upward toward power supply
    if (level11State.cutsceneStep === 0) {
        if (gameState.player.y > 5) {
            gameState.player.y -= 0.03;
        }
        
        // After player reaches top, show power prompt
        if (elapsed > 3000 && !level11State.powerDecisionMade) {
            level11State.cutsceneStep = 1;
            showPowerPrompt();
        }
    }
    
    // Step 1: Waiting for power decision (prompt is showing)
    // The prompt buttons will set cutsceneStep to 3 (good) or 4 (bad)
    
    // Step 3: Good ending - player disabled power supply
    if (level11State.cutsceneStep === 3) {
        level11State.noteOverlay = {
            text: 'Power Supply disabled!\nData Transfer interrupted!',
            visible: true
        };
        // Trigger good ending achievement
        import('./achievements.js').then(mod => {
            if (mod.checkAchievements) {
                mod.checkAchievements('ending_reached', { ending: 'good' });
            }
        }).catch(() => {});
        
        // After showing message, go back to hub with note spawned
        level11State.cutsceneStartTime = currentTime; // Reset timer
        level11State.cutsceneStep = 5; // Go to hub transition step
    }
    
    // Step 4: Bad ending - player refused
    if (level11State.cutsceneStep === 4) {
        level11State.noteOverlay = {
            text: 'Warning!\nTransfer complete...',
            visible: true
        };
        // Trigger bad ending achievement
        import('./achievements.js').then(mod => {
            if (mod.checkAchievements) {
                mod.checkAchievements('ending_reached', { ending: 'bad' });
            }
        }).catch(() => {});
        
        level11State.cutsceneStartTime = currentTime;
        level11State.cutsceneStep = 6; // Go to bad credits step
    }
    
    // Step 5: Good ending - wait then go to hub for note pickup
    if (level11State.cutsceneStep === 5 && elapsed > 3000) {
        level11State.noteOverlay = null;
        level11State.cutsceneActive = false;
        gameState.inputLocked = false;
        transitionToRoom('hub');
    }
    
    // Step 6: Bad ending - wait then go to credits
    if (level11State.cutsceneStep === 6 && elapsed > 3000) {
        fadeToBlack(2.0);
        level11State.cutsceneStep = 7;
    }
    
    if (level11State.cutsceneStep === 7 && elapsed > 5000) {
        exitLevel11ToCredits();
    }
}

/**
 * Exit Level 11 and show credits
 */
/**
 * Exit Level 11 when Escape is pressed
 */
export function exitLevel11() {
    console.log('[Level 11] Exiting to normal game...');
    level11State.active = false;
    level11State.cutsceneActive = false;
    
    // Return to normal mode
    gameState.mode = 'level';
    gameState.currentLevel = 10;
    gameState.isLevel11 = false;
    gameState.gameStatus = 'playing';
    gameState.isPaused = false;
    gameState.inputLocked = false;
    
    // Restore abilities
    gameState.lives = 3;
    gameState.stamina = 100;
    gameState.zapTraps = 3;
    
    // Rebuild Level 10 or return to menu
    // For now, just fade back to Level 10
    import('./maze.js').then(mod => {
        if (mod.generateMaze) mod.generateMaze(10);
    }).catch(() => {});
}

function exitLevel11ToCredits() {
    console.log('[Level 11] Exiting to credits...');
    level11State.active = false;
    level11State.cutsceneActive = false;
    
    // Return to normal mode
    gameState.mode = 'level';
    gameState.currentLevel = 10;
    gameState.isPaused = true;
    gameState.inputLocked = false;
    
    // Restore abilities
    gameState.lives = 3;
    gameState.stamina = 100;
    
    // Show credits overlay
    const creditsOverlay = document.getElementById('creditsOverlay');
    if (creditsOverlay) {
        creditsOverlay.style.display = 'block';
        creditsOverlay.style.opacity = '0';
        setTimeout(() => {
            creditsOverlay.style.transition = 'opacity 2s ease';
            creditsOverlay.style.opacity = '1';
        }, 50);
    }
    
    // Mark secret as unlocked
    import('./config.js').then(mod => {
        if (mod.setSecretUnlocked) mod.setSecretUnlocked(true);
    }).catch(() => {});
}
