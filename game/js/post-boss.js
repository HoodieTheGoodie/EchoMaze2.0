// post-boss.js - Level 11: "Redeem Yourself"

import { gameState, MAZE_WIDTH, MAZE_HEIGHT, fadeToBlack, fadeFromBlack } from './state.js';
import { CELL } from './maze.js';
import { playMusic, stopMusic } from './music.js';

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
            tiles: Array(9).fill(false), // 3x3 grid (false = red, true = green)
            solved: false,
            greenKeyTaken: false,
            loreRead: false
        },
        maze: {
            visited: false,
            yellowKeyTaken: false,
            yellowKeyPos: null, // {x, y}
            enemies: [] // [{x, y, vx, vy}]
        }
    },
    doorTransitioning: false,
    transitionTarget: null,
    cutsceneActive: false,
    cutsceneStep: 0,
    noteOverlay: null // {text, visible}
};

// Puzzle solution pattern (matches paper note)
const PUZZLE_SOLUTION = [
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
    level11State.rooms.maze = {
        visited: false,
        yellowKeyTaken: false,
        yellowKeyPos: { x: 5 + Math.floor(Math.random() * 20), y: 5 + Math.floor(Math.random() * 20) },
        enemies: [
            { x: 10, y: 10, vx: 0, vy: 0, nextMoveTime: 0 },
            { x: 20, y: 20, vx: 0, vy: 0, nextMoveTime: 0 }
        ]
    };
    
    // Set game mode
    gameState.mode = 'level11';
    gameState.isPaused = false;
    gameState.gameStatus = 'playing'; // Allow movement
    
    // CRITICAL: Clear all boss state to stop lava/collapse from Level 10
    gameState.boss = null;
    gameState.bazooka = null;
    gameState.bazookaPickup = null;
    gameState.projectiles = [];
    
    // Hide all UI elements - make it feel like a different game
    const mainMenu = document.getElementById('mainMenu');
    const devPanel = document.getElementById('devPanel');
    const gameContainer = document.getElementById('game-container');
    const uiPanel = document.getElementById('ui-panel');
    const overlay = document.getElementById('overlay');
    const bossHealthBarContainer = document.getElementById('bossHealthBarContainer');
    const pauseOverlay = document.getElementById('pauseOverlay');
    
    if (mainMenu) mainMenu.style.display = 'none';
    if (devPanel) devPanel.style.display = 'none';
    if (gameContainer) {
        gameContainer.style.display = 'block';
        gameContainer.classList.add('level11-active'); // Add class for CSS targeting
    }
    if (uiPanel) uiPanel.style.setProperty('display', 'none', 'important'); // Force hide
    if (overlay) overlay.style.display = 'none'; // Hide generator UI
    if (bossHealthBarContainer) bossHealthBarContainer.style.display = 'none'; // Hide boss bar
    if (pauseOverlay) pauseOverlay.style.display = 'none'; // Hide pause menu
    
    // Set yellow background outside canvas
    document.body.style.backgroundColor = '#ffcc00';
    
    gameState.inputLocked = false;
    
    // Initialize proper maze structure for Level 11
    gameState.maze = [];
    for (let y = 0; y < MAZE_HEIGHT; y++) {
        gameState.maze[y] = [];
        for (let x = 0; x < MAZE_WIDTH; x++) {
            gameState.maze[y][x] = CELL.WALL;
        }
    }
    
    // Stop all music
    stopMusic();
    
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
    
    // Create vertical hallway 3 tiles wide (horizontal)
    const cx = Math.floor(MAZE_WIDTH / 2);
    const hallwayHeight = 20;
    const startY = Math.floor((MAZE_HEIGHT - hallwayHeight) / 2);
    
    // Build hallway from bottom to top
    for (let y = startY; y < startY + hallwayHeight; y++) {
        grid[y][cx - 1] = CELL.EMPTY; // Left tile
        grid[y][cx] = CELL.EMPTY;     // Center tile
        grid[y][cx + 1] = CELL.EMPTY; // Right tile
    }
    
    // Green door at top of hallway - make sure there's space to walk to it
    const doorY = startY;
    grid[doorY][cx] = CELL.EXIT; // EXIT marker for green door
    
    // Player spawns at bottom of hallway (center)
    const spawnY = startY + hallwayHeight - 2;
    gameState.player.x = cx;
    gameState.player.y = spawnY;
    
    console.log(`[Level 11] Spawn room built: hallway from y=${startY} to y=${startY + hallwayHeight - 1}, door at y=${doorY}, player at (${cx}, ${spawnY})`);
    
    gameState.maze = grid;
    gameState.enemies = [];
    gameState.projectiles = [];
    gameState.generators = [];
    gameState.teleportPads = [];
}

/**
 * Build the central hub room
 */
function buildHubRoom() {
    const grid = Array(MAZE_HEIGHT).fill(null).map(() => Array(MAZE_WIDTH).fill(CELL.WALL));
    
    // Open central area
    const cx = Math.floor(MAZE_WIDTH / 2);
    const cy = Math.floor(MAZE_HEIGHT / 2);
    const roomSize = 8;
    
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
    
    // Top door (locked until yellow key)
    grid[cy - roomSize][cx] = level11State.inventory.yellowKey ? CELL.EXIT : CELL.GENERATOR;
    
    // Right door (puzzle room)
    grid[cy][cx + roomSize] = CELL.EXIT;
    
    // Left door (maze - locked until green key)
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
    const roomSize = 6; // Smaller room
    
    // Open main puzzle area (top half)
    for (let y = cy - roomSize; y <= cy + 2; y++) {
        for (let x = cx - roomSize; x <= cx + roomSize; x++) {
            if (x > 0 && x < MAZE_WIDTH - 1 && y > 0 && y < MAZE_HEIGHT - 1) {
                grid[y][x] = CELL.EMPTY;
            }
        }
    }
    
    // Green key area (bottom half) - initially blocked
    if (level11State.rooms.puzzle.solved) {
        // Open the barrier and bottom area
        for (let y = cy + 3; y <= cy + roomSize; y++) {
            for (let x = cx - roomSize; x <= cx + roomSize; x++) {
                if (x > 0 && x < MAZE_WIDTH - 1 && y > 0 && y < MAZE_HEIGHT - 1) {
                    grid[y][x] = CELL.EMPTY;
                }
            }
        }
        // Barrier turns green (open)
        for (let x = cx - roomSize; x <= cx + roomSize; x++) {
            grid[cy + 2][x] = CELL.EMPTY;
        }
    } else {
        // Red barrier blocks bottom area (use GENERATOR as red barrier)
        for (let x = cx - roomSize; x <= cx + roomSize; x++) {
            grid[cy + 2][x] = CELL.GENERATOR; // Red barrier
        }
    }
    
    // Player spawns near left edge (came from hub)
    gameState.player.x = cx - roomSize + 2;
    gameState.player.y = cy;
    
    // Back door to hub (left side)
    grid[cy][cx - roomSize] = CELL.EXIT;
    
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
    
    // Player spawns near center-right (came from hub)
    gameState.player.x = cx + 5;
    gameState.player.y = cy;
    grid[cy][cx + 8] = CELL.EMPTY; // Ensure spawn is clear
    
    // Back door to hub
    grid[cy][cx + 8] = CELL.EXIT;
    
    // Flashlight pickup near entrance
    if (!level11State.inventory.flashlight) {
        grid[cy - 1][cx + 6] = CELL.GENERATOR; // Use generator sprite as pickup marker
    }
    
    // Yellow key position (ensure not on wall)
    if (!level11State.rooms.maze.yellowKeyTaken) {
        const keyPos = level11State.rooms.maze.yellowKeyPos;
        grid[keyPos.y][keyPos.x] = CELL.EMPTY;
    }
    
    gameState.maze = grid;
    level11State.rooms.maze.visited = true;
}

/**
 * Build finale cutscene room
 */
function buildFinaleRoom() {
    const grid = Array(MAZE_HEIGHT).fill(null).map(() => Array(MAZE_WIDTH).fill(CELL.EMPTY));
    
    // Add border
    for (let x = 0; x < MAZE_WIDTH; x++) {
        grid[0][x] = CELL.WALL;
        grid[MAZE_HEIGHT - 1][x] = CELL.WALL;
    }
    for (let y = 0; y < MAZE_HEIGHT; y++) {
        grid[y][0] = CELL.WALL;
        grid[y][MAZE_WIDTH - 1] = CELL.WALL;
    }
    
    // Player spawns near bottom
    const cx = Math.floor(MAZE_WIDTH / 2);
    gameState.player.x = cx;
    gameState.player.y = MAZE_HEIGHT - 5;
    
    gameState.maze = grid;
    
    // Start cutscene
    level11State.cutsceneActive = true;
    level11State.cutsceneStep = 0;
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
 * Check puzzle solution
 */
export function checkPuzzleSolution() {
    const tiles = level11State.rooms.puzzle.tiles;
    const match = tiles.every((val, idx) => val === PUZZLE_SOLUTION[idx]);
    
    if (match && !level11State.rooms.puzzle.solved) {
        level11State.rooms.puzzle.solved = true;
        console.log('[Level 11] Puzzle solved!');
        // Rebuild room to show hidden door
        buildPuzzleRoom();
    }
}

/**
 * Toggle puzzle tile
 */
export function togglePuzzleTile(index) {
    if (index >= 0 && index < 9 && !level11State.rooms.puzzle.solved) {
        level11State.rooms.puzzle.tiles[index] = !level11State.rooms.puzzle.tiles[index];
        checkPuzzleSolution();
    }
}

/**
 * Reset puzzle
 */
export function resetPuzzle() {
    if (!level11State.rooms.puzzle.solved) {
        level11State.rooms.puzzle.tiles = Array(9).fill(false);
        console.log('[Level 11] Puzzle reset');
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
 * Update maze enemies (random wander)
 */
function updateMazeEnemies(currentTime) {
    const enemies = level11State.rooms.maze.enemies;
    
    for (const enemy of enemies) {
        if (currentTime > enemy.nextMoveTime) {
            // Move in current direction
            const newX = enemy.x + enemy.vx;
            const newY = enemy.y + enemy.vy;
            
            // Check if can move
            if (newX > 0 && newX < MAZE_WIDTH - 1 && newY > 0 && newY < MAZE_HEIGHT - 1 &&
                gameState.maze[newY][newX] !== CELL.WALL) {
                enemy.x = newX;
                enemy.y = newY;
            } else {
                // Change direction randomly
                const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                const dir = dirs[Math.floor(Math.random() * dirs.length)];
                enemy.vx = dir[0];
                enemy.vy = dir[1];
            }
            
            // Next move in 500-1000ms
            enemy.nextMoveTime = currentTime + 500 + Math.random() * 500;
        }
        
        // Check flashlight death
        if (level11State.inventory.flashlightOn) {
            const dx = enemy.x - gameState.player.x;
            const dy = enemy.y - gameState.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 5) {
                // Check if player is facing enemy
                const angle = Math.atan2(dy, dx);
                // If within flashlight cone and close enough for 1 second
                if (dist < 3 && Math.abs(angle) < Math.PI / 4) {
                    // Respawn player in hub
                    console.log('[Level 11] Caught by enemy! Respawning...');
                    // Randomize enemy positions
                    for (const e of enemies) {
                        e.x = 5 + Math.floor(Math.random() * 20);
                        e.y = 5 + Math.floor(Math.random() * 20);
                        e.nextMoveTime = currentTime + 1000;
                    }
                    transitionToRoom('hub');
                    break;
                }
            }
        }
    }
}

/**
 * Update finale cutscene
 */
function updateCutscene(currentTime) {
    if (!level11State.cutsceneActive) return;
    
    // Auto-walk player forward
    if (level11State.cutsceneStep === 0) {
        gameState.player.y -= 0.05;
        
        // After 3 seconds, show text
        if (!level11State.cutsceneStartTime) {
            level11State.cutsceneStartTime = currentTime;
        }
        
        if (currentTime - level11State.cutsceneStartTime > 3000) {
            level11State.cutsceneStep = 1;
        }
    }
    
    // Show text overlay
    if (level11State.cutsceneStep === 1) {
        level11State.noteOverlay = {
            text: 'EchoMaze 2\n\nRedeem Yourself from the Inside',
            visible: true
        };
        
        // After 5 seconds, fade to credits
        if (currentTime - level11State.cutsceneStartTime > 8000) {
            level11State.cutsceneStep = 2;
            fadeToBlack(2.0);
        }
    }
    
    // Go to credits
    if (level11State.cutsceneStep === 2) {
        if (currentTime - level11State.cutsceneStartTime > 10000) {
            exitLevel11ToCredits();
        }
    }
}

/**
 * Exit Level 11 and show credits
 */
function exitLevel11ToCredits() {
    console.log('[Level 11] Exiting to credits...');
    level11State.active = false;
    level11State.cutsceneActive = false;
    
    // Return to main game mode
    gameState.mode = 'level';
    gameState.isPaused = true;
    
    // CRITICAL: Restore all UI elements
    const mainMenu = document.getElementById('mainMenu');
    const gameContainer = document.getElementById('game-container');
    const uiPanel = document.getElementById('ui-panel');
    const overlay = document.getElementById('overlay');
    
    if (gameContainer) {
        gameContainer.style.display = 'none';
        gameContainer.classList.remove('level11-active'); // Remove Level 11 class
    }
    if (mainMenu) mainMenu.style.display = 'flex';
    if (uiPanel) uiPanel.style.display = 'flex';
    if (overlay) overlay.style.display = 'none'; // Don't show generator overlay
    
    // Restore normal background
    document.body.style.backgroundColor = '#0d0a0f';
    
    // Clean up Level 11 state completely
    gameState.enemies = [];
    gameState.projectiles = [];
    gameState.statusMessage = '';
    
    // Show credits overlay
    const creditsOverlay = document.getElementById('creditsOverlay');
    if (creditsOverlay) {
        creditsOverlay.style.display = 'block';
    }
}

/**
 * Show lore note overlay
 */
export function showLoreNote(text) {
    level11State.noteOverlay = { text, visible: true };
}

/**
 * Hide lore note overlay
 */
export function hideLoreNote() {
    if (level11State.noteOverlay) {
        level11State.noteOverlay.visible = false;
    }
}
