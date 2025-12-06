// level11.js - Level 11: "Redeem Yourself"

import { gameState, MAZE_WIDTH, MAZE_HEIGHT, fadeToBlack, fadeFromBlack, finishRun, setStatusMessage } from './state.js';
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
    rooms: {
        puzzle: {
            visited: false,
            tiles: Array(9).fill(false), // 3x3 grid (false = red/unpressed, true = green/pressed)
            solved: false,
            greenKeyTaken: false,
            loreRead: false
        },
        maze: {
            visited: false,
            yellowKeyTaken: false,
            yellowKeyPos: null, // {x, y}
            enemies: [], // [{fx, fy, vx, vy, nextMoveTime, shineStartTime}]
            flashlightPickedUp: false
        }
    },
    doorTransitioning: false,
    transitionTarget: null,
    cutsceneActive: false,
    cutsceneStep: 0,
    cutsceneStartTime: 0,
    noteOverlay: null // {text, visible}
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
    level11State.rooms.puzzle = {
        visited: false,
        tiles: Array(9).fill(false),
        solved: false,
        greenKeyTaken: false,
        loreRead: false
    };
    
    // Yellow key spawns at one of several designated locations
    const yellowKeyPositions = [
        { x: 5, y: 5 }, { x: 24, y: 5 }, { x: 5, y: 24 }, { x: 24, y: 24 },
        { x: 15, y: 10 }, { x: 10, y: 15 }, { x: 20, y: 20 }
    ];
    const randomPos = yellowKeyPositions[Math.floor(Math.random() * yellowKeyPositions.length)];
    
    level11State.rooms.maze = {
        visited: false,
        yellowKeyTaken: false,
        yellowKeyPos: randomPos,
        enemies: [
            { fx: 10.5, fy: 10.5, vx: 0, vy: 1, nextMoveTime: 0, shineStartTime: 0 },
            { fx: 20.5, fy: 20.5, vx: 1, vy: 0, nextMoveTime: 0, shineStartTime: 0 }
        ],
        flashlightPickedUp: false
    };
    level11State.cutsceneActive = false;
    level11State.cutsceneStep = 0;
    level11State.noteOverlay = null;
    
    // Set game mode
    gameState.mode = 'level11';
    gameState.currentLevel = 11;
    gameState.isPaused = false;
    gameState.gameStatus = 'playing';
    
    // CRITICAL: Clear all Level 10 boss state to stop lava/collapse/freeze
    gameState.boss = null;
    gameState.bazooka = null;
    gameState.bazookaPickup = null;
    gameState.projectiles = [];
    gameState.enemies = [];
    gameState.enemiesFrozenUntil = 0;
    gameState.playerInvincibleUntil = 0;
    gameState.inputLocked = false;
    gameState.bossVictory = false;
    
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
        // Puzzle solved: open bottom area with green key
        for (let y = cy + 1; y <= cy + roomSize; y++) {
            for (let x = cx - roomSize; x <= cx + roomSize; x++) {
                if (x > 0 && x < MAZE_WIDTH - 1 && y > 0 && y < MAZE_HEIGHT - 1) {
                    grid[y][x] = CELL.EMPTY;
                }
            }
        }
    }
    
    gameState.maze = grid;
    level11State.rooms.puzzle.visited = true;
}

/**
 * Build dark maze room
 */
function buildMazeRoom() {
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
    
    // Add random walls for maze structure
    for (let i = 0; i < 50; i++) {
        const x = 2 + Math.floor(Math.random() * (MAZE_WIDTH - 4));
        const y = 2 + Math.floor(Math.random() * (MAZE_HEIGHT - 4));
        const len = 2 + Math.floor(Math.random() * 4);
        const dir = Math.random() < 0.5;
        
        for (let j = 0; j < len; j++) {
            const wx = dir ? x + j : x;
            const wy = dir ? y : y + j;
            if (wx > 0 && wx < MAZE_WIDTH - 1 && wy > 0 && wy < MAZE_HEIGHT - 1) {
                grid[wy][wx] = CELL.WALL;
            }
        }
    }
    
    const cx = Math.floor(MAZE_WIDTH / 2);
    const cy = Math.floor(MAZE_HEIGHT / 2);
    
    // Player spawns near center-left (came from hub)
    gameState.player.x = cx - 8;
    gameState.player.y = cy;
    
    // Back door to hub (left side)
    grid[cy][1] = CELL.EXIT;
    
    // Ensure spawn area is clear
    for (let y = cy - 1; y <= cy + 1; y++) {
        for (let x = cx - 9; x <= cx - 7; x++) {
            if (x > 0 && x < MAZE_WIDTH - 1 && y > 0 && y < MAZE_HEIGHT - 1) {
                grid[y][x] = CELL.EMPTY;
            }
        }
    }
    
    gameState.maze = grid;
    level11State.rooms.maze.visited = true;
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
    
    gameState.maze = grid;
    
    // Start cutscene
    level11State.cutsceneActive = true;
    level11State.cutsceneStep = 0;
    level11State.cutsceneStartTime = 0;
    gameState.inputLocked = true;
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
    
    // Check for flashlight pickup in maze
    if (level11State.currentRoom === 'maze' && !level11State.rooms.maze.flashlightPickedUp) {
        const cx = Math.floor(MAZE_WIDTH / 2);
        const cy = Math.floor(MAZE_HEIGHT / 2);
        const flashlightX = cx - 6;
        const flashlightY = cy;
        
        if (Math.abs(px - flashlightX) <= 1 && Math.abs(py - flashlightY) <= 1) {
            level11State.inventory.flashlight = true;
            level11State.rooms.maze.flashlightPickedUp = true;
            setStatusMessage('Got flashlight! Press F to toggle.');
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
        
        // Check for green key pickup (center bottom, after puzzle solved)
        if (level11State.rooms.puzzle.solved && !level11State.rooms.puzzle.greenKeyTaken) {
            const keyX = cx;
            const keyY = cy + 4; // In bottom area after barrier opens
            if (Math.abs(px - keyX) <= 1 && Math.abs(py - keyY) <= 1) {
                level11State.inventory.greenKey = true;
                level11State.rooms.puzzle.greenKeyTaken = true;
                setStatusMessage('Got green key!');
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
 * Show puzzle clue
 */
function showPuzzleClue() {
    // Show overlay with puzzle solution
    level11State.puzzleClueVisible = true;
}

/**
 * Reset puzzle
 */
function resetPuzzle() {
    level11State.rooms.puzzle.tiles = [false, false, false, false, false, false, false, false, false];
    setStatusMessage('Puzzle reset!');
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
        setStatusMessage(level11State.inventory.flashlightOn ? 'Flashlight ON' : 'Flashlight OFF');
    }
}

/**
 * Update Level 11 systems
 */
export function updateLevel11(currentTime) {
    if (!level11State.active) return;
    
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
 * Update maze enemies (random wander + flashlight death)
 * Optimized to reduce unnecessary calculations
 */
function updateMazeEnemies(currentTime) {
    const enemies = level11State.rooms.maze.enemies;
    const px = gameState.player.x;
    const py = gameState.player.y;
    const flashlightOn = level11State.inventory.flashlightOn;
    
    // Cache maze dimensions
    const maxX = MAZE_WIDTH - 1;
    const maxY = MAZE_HEIGHT - 1;
    
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        
        // Move enemy (only when it's time)
        if (currentTime > enemy.nextMoveTime) {
            const newFx = enemy.fx + enemy.vx * 0.5;
            const newFy = enemy.fy + enemy.vy * 0.5;
            
            const newX = Math.floor(newFx);
            const newY = Math.floor(newFy);
            
            // Check if can move (bounds check and wall check)
            if (newX > 0 && newX < maxX && newY > 0 && newY < maxY &&
                gameState.maze[newY][newX] !== CELL.WALL) {
                enemy.fx = newFx;
                enemy.fy = newFy;
            } else {
                // Change direction randomly (reuse direction arrays)
                const rand = Math.floor(Math.random() * 4);
                if (rand === 0) { enemy.vx = 0; enemy.vy = 1; }
                else if (rand === 1) { enemy.vx = 0; enemy.vy = -1; }
                else if (rand === 2) { enemy.vx = 1; enemy.vy = 0; }
                else { enemy.vx = -1; enemy.vy = 0; }
            }
            
            enemy.nextMoveTime = currentTime + 300 + Math.random() * 400;
        }
        
        // Check flashlight death (only if flashlight is on)
        if (flashlightOn) {
            const dx = enemy.fx - px;
            const dy = enemy.fy - py;
            const distSq = dx * dx + dy * dy; // Use squared distance to avoid sqrt
            
            // Simple cone check: if enemy is within 5 tiles (25 squared)
            if (distSq < 25) {
                // Start tracking shine time
                if (enemy.shineStartTime === 0) {
                    enemy.shineStartTime = currentTime;
                } else if (currentTime - enemy.shineStartTime > 1000) {
                    // Been shining for 1+ second - kill player
                    setStatusMessage('Enemy caught you! Respawning...');
                    transitionToRoom('hub');
                    
                    // Reset enemy positions
                    enemies[0].fx = 10.5;
                    enemies[0].fy = 10.5;
                    enemies[1].fx = 20.5;
                    enemies[1].fy = 20.5;
                    return;
                }
            } else {
                enemy.shineStartTime = 0;
            }
        } else {
            enemy.shineStartTime = 0;
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
    
    if (level11State.cutsceneStep === 0) {
        // Auto-walk player upward
        if (gameState.player.y > 5) {
            gameState.player.y -= 0.03;
        }
        
        // After 3 seconds, show text
        if (elapsed > 3000) {
            level11State.cutsceneStep = 1;
        }
    }
    
    if (level11State.cutsceneStep === 1) {
        // Show final text
        level11State.noteOverlay = {
            text: 'EchoMaze 2\n\nRedeem Yourself from the Inside',
            visible: true
        };
        
        // After 5 more seconds, fade to credits
        if (elapsed > 8000) {
            level11State.cutsceneStep = 2;
            fadeToBlack(2.0);
        }
    }
    
    if (level11State.cutsceneStep === 2 && elapsed > 10000) {
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
