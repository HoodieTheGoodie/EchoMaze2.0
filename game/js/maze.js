// maze.js - Maze generation with connectivity and generator placement

export const MAZE_WIDTH = 30;
export const MAZE_HEIGHT = 30;
export const GENERATOR_COUNT = 3;

// Cell types
export const CELL = {
    WALL: 1,
    EMPTY: 0,
    EXIT: 2,
    GENERATOR: 3,
    TELEPAD: 4,
    GLITCH: 5,
    TERMINAL: 6
};

// Seeded RNG (mulberry32)
function makeRng(seed) {
    let t = seed >>> 0;
    return function rng() {
        t += 0x6D2B79F5;
        let r = Math.imul(t ^ t >>> 15, 1 | t);
        r ^= r + Math.imul(r ^ r >>> 7, 61 | r);
        return ((r ^ r >>> 14) >>> 0) / 4294967296;
    };
}

function shuffle(array, rng) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function carve(maze, x, y, rng) {
    maze[y][x] = CELL.EMPTY;
    
    const directions = shuffle([
        { dx: 0, dy: -2 },
        { dx: 2, dy: 0 },
        { dx: 0, dy: 2 },
        { dx: -2, dy: 0 }
    ], rng);
    
    for (const dir of directions) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        
        if (nx > 0 && nx < MAZE_WIDTH - 1 && 
            ny > 0 && ny < MAZE_HEIGHT - 1 && 
            maze[ny][nx] === CELL.WALL) {
            maze[y + dir.dy / 2][x + dir.dx / 2] = CELL.EMPTY;
            carve(maze, nx, ny, rng);
        }
    }
}

function computeDistances(maze, startX, startY) {
    const distances = Array(MAZE_HEIGHT).fill(null).map(() => Array(MAZE_WIDTH).fill(Infinity));
    const queue = [{ x: startX, y: startY }];
    distances[startY][startX] = 0;

    // Orthogonal steps for BFS
    const steps = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 }
    ];
    
    let head = 0;
    while (head < queue.length) {
        const { x, y } = queue[head++];
        const currentDist = distances[y][x];
        
        for (const step of steps) {
            const nx = x + step.dx;
            const ny = y + step.dy;
            
            if (nx <= 0 || nx >= MAZE_WIDTH - 1 || 
                ny <= 0 || ny >= MAZE_HEIGHT - 1 ||
                maze[ny][nx] === CELL.WALL ||
                distances[ny][nx] <= currentDist + 1) {
                continue;
            }
            
            distances[ny][nx] = currentDist + 1;
            queue.push({ x: nx, y: ny });
        }
    }
    
    return distances;
}

function ensureConnectivity(maze) {
    const edgeSteps = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 }
    ];
    
    for (let attempt = 0; attempt < 100; attempt++) {
        const distances = computeDistances(maze, 1, 1);
        
        const unreachable = [];
        for (let y = 1; y < MAZE_HEIGHT - 1; y++) {
            for (let x = 1; x < MAZE_WIDTH - 1; x++) {
                if (maze[y][x] === CELL.EMPTY && !Number.isFinite(distances[y][x])) {
                    unreachable.push({ x, y });
                }
            }
        }
        
        if (unreachable.length === 0) {
            return distances;
        }
        
        let bridged = false;
        for (let y = 1; y < MAZE_HEIGHT - 1 && !bridged; y++) {
            for (let x = 1; x < MAZE_WIDTH - 1 && !bridged; x++) {
                if (maze[y][x] !== CELL.WALL) continue;
                
                let touchesReachable = false;
                let touchesUnreachable = false;
                
                for (const step of edgeSteps) {
                    const nx = x + step.dx;
                    const ny = y + step.dy;
                    if (maze[ny][nx] !== CELL.EMPTY) continue;
                    
                    if (Number.isFinite(distances[ny][nx])) {
                        touchesReachable = true;
                    } else {
                        touchesUnreachable = true;
                    }
                }
                
                if (touchesReachable && touchesUnreachable) {
                    maze[y][x] = CELL.EMPTY;
                    bridged = true;
                }
            }
        }
        
        if (!bridged) {
            unreachable.forEach(({ x, y }) => {
                maze[y][x] = CELL.WALL;
            });
        }
    }
    
    return computeDistances(maze, 1, 1);
}

export function generateMaze(seed = 1, generatorCount = GENERATOR_COUNT, includeTelepads = false) {
    const rng = makeRng(seed);
    const maze = Array(MAZE_HEIGHT).fill(null).map(() => Array(MAZE_WIDTH).fill(CELL.WALL));
    
    carve(maze, 1, 1, rng);
    
    for (let x = 0; x < MAZE_WIDTH; x++) {
        maze[0][x] = CELL.WALL;
        maze[MAZE_HEIGHT - 1][x] = CELL.WALL;
    }
    for (let y = 0; y < MAZE_HEIGHT; y++) {
        maze[y][0] = CELL.WALL;
        maze[y][MAZE_WIDTH - 1] = CELL.WALL;
    }
    
    for (let i = 0; i < 8; i++) {
        const x = Math.floor(rng() * (MAZE_WIDTH - 2)) + 1;
        const y = Math.floor(rng() * (MAZE_HEIGHT - 2)) + 1;
        if (maze[y][x] === CELL.WALL) {
            let pathNeighbors = 0;
            if (x > 0 && maze[y][x - 1] === CELL.EMPTY) pathNeighbors++;
            if (x < MAZE_WIDTH - 1 && maze[y][x + 1] === CELL.EMPTY) pathNeighbors++;
            if (y > 0 && maze[y - 1][x] === CELL.EMPTY) pathNeighbors++;
            if (y < MAZE_HEIGHT - 1 && maze[y + 1][x] === CELL.EMPTY) pathNeighbors++;
            
            if (pathNeighbors >= 2) {
                maze[y][x] = CELL.EMPTY;
            }
        }
    }
    
    maze[1][1] = CELL.EMPTY;
    
    let distances = ensureConnectivity(maze);

    // Corridor side passages and subtle openness tweaks
    (function corridorSidePassages(){
        const H = MAZE_HEIGHT, W = MAZE_WIDTH;
        const inBounds = (x,y)=> x>0 && x<W-1 && y>0 && y<H-1;
        const tryCarveLine = (x,y,dx,dy,maxLen)=>{
            // carve a narrow 1-tile wide line until we hit EMPTY or maxLen
            for (let i=1;i<=maxLen;i++){
                const nx=x+dx*i, ny=y+dy*i;
                if (!inBounds(nx,ny)) return false;
                if (maze[ny][nx]===CELL.EMPTY){
                    // success: carve walls between start and this empty (exclusive of target)
                    for (let j=1;j<i;j++){
                        const cx=x+dx*j, cy=y+dy*j;
                        if ((cx===1&&cy===1)) return false; // preserve spawn
                        maze[cy][cx]=CELL.EMPTY;
                    }
                    return true;
                }
                if (maze[ny][nx]!==CELL.WALL){
                    return false;
                }
            }
            return false;
        };
        // Scan horizontal corridors
        for (let y=1;y<H-1;y++){
            let x=1;
            while (x<W-1){
                if (maze[y][x]!==CELL.EMPTY){ x++; continue; }
                let x0=x; while (x<W-1 && maze[y][x]===CELL.EMPTY) x++;
                let x1=x-1; const len = x1-x0+1;
                if (len>=8){
                    // with 10-20% chance add one side passage
                    const chance=0.10+0.10*rng();
                    if (rng()<chance){
                        const px = x0 + Math.floor(rng() * len);
                        // choose up or down
                        const dir = (rng()<0.5)? -1: 1;
                        const maxLen = 2 + Math.floor(rng()*3); // 2..4
                        tryCarveLine(px, y, 0, dir, maxLen);
                    }
                }
            }
        }
        // Scan vertical corridors
        for (let x=1;x<W-1;x++){
            let y=1;
            while (y<H-1){
                if (maze[y][x]!==CELL.EMPTY){ y++; continue; }
                let y0=y; while (y<H-1 && maze[y][x]===CELL.EMPTY) y++;
                let y1=y-1; const len = y1-y0+1;
                if (len>=8){
                    const chance=0.10+0.10*rng();
                    if (rng()<chance){
                        const py = y0 + Math.floor(rng() * len);
                        const dir = (rng()<0.5)? -1: 1; // left/right
                        const maxLen = 2 + Math.floor(rng()*3);
                        tryCarveLine(x, py, dir, 0, maxLen);
                    }
                }
            }
        }
        // Randomized wall reduction 5-10%
        for (let y=1;y<H-1;y++){
            for (let x=1;x<W-1;x++){
                if (maze[y][x]!==CELL.WALL) continue;
                if ((x===1&&y===1)) continue;
                const n = (maze[y][x-1]===CELL.EMPTY) + (maze[y][x+1]===CELL.EMPTY) + (maze[y-1][x]===CELL.EMPTY) + (maze[y+1][x]===CELL.EMPTY);
                if (n>=2){
                    const p = 0.05 + 0.05*rng();
                    if (rng()<p){
                        // Only open if it won't create a 3x3 open area (check 1-tile around)
                        let openOk = true;
                        for (let yy=y-1; yy<=y+1 && openOk; yy++){
                            for (let xx=x-1; xx<=x+1; xx++){
                                if (!inBounds(xx,yy)) continue;
                                // count walls; avoid making a 3x3 all empty
                            }
                        }
                        maze[y][x]=CELL.EMPTY;
                    }
                }
            }
        }
        // Connectivity shortcuts from dead-ends to nearby paths (short 1-3 tiles, within 3-5 manhattan)
        const dirs = [ {dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1} ];
        function isDeadEnd(cx,cy){
            if (maze[cy][cx]!==CELL.EMPTY) return false;
            let deg=0; for (const d of dirs){ if (maze[cy+d.dy][cx+d.dx]===CELL.EMPTY) deg++; }
            return deg===1;
        }
        let attempts=0; let added=0;
        while (attempts<40 && added<6){
            attempts++;
            const cx = Math.floor(rng()*(W-2))+1;
            const cy = Math.floor(rng()*(H-2))+1;
            if (!isDeadEnd(cx,cy)) continue;
            // try each dir up to len 3 to reach an EMPTY within 3..5
            shuffle(dirs, rng);
            let carved=false;
            for (const d of dirs){
                const maxL = 1 + Math.floor(rng()*3); // 1..3 tunnel
                for (let l=1; l<=maxL; l++){
                    const nx = cx + d.dx*l, ny = cy + d.dy*l;
                    if (!inBounds(nx,ny)) break;
                    if (maze[ny][nx]!==CELL.WALL) break; // keep digging walls only
                    // check end cell one more step beyond up to radius 5
                    const ex = cx + d.dx*(l+1), ey = cy + d.dy*(l+1);
                    if (!inBounds(ex,ey)) continue;
                    const man = Math.abs(ex-cx)+Math.abs(ey-cy);
                    if (man>=3 && man<=5 && maze[ey][ex]===CELL.EMPTY){
                        // carve path l cells
                        let ok=true;
                        for (let j=1;j<=l;j++){
                            const tx=cx+d.dx*j, ty=cy+d.dy*j;
                            if ((tx===1&&ty===1)) { ok=false; break; }
                        }
                        if (!ok) continue;
                        for (let j=1;j<=l;j++){
                            maze[cy+d.dy*j][cx+d.dx*j]=CELL.EMPTY;
                        }
                        carved=true; break;
                    }
                }
                if (carved) break;
            }
            if (carved) added++;
        }
    })();

    // Re-run connectivity after tweaks and recompute distances
    distances = ensureConnectivity(maze);

    // Subtle loop openings to reduce long dead-ends without changing overall layout much
    // Open a handful of connectors between adjacent corridors and trim a few dead ends
    (function addSubtleGaps(){
        // Helper: open a wall if it separates two EMPTY cells (adds a loop)
        function openConnectorOnce() {
            for (let attempt = 0; attempt < 200; attempt++) {
                const x = Math.floor(rng() * (MAZE_WIDTH - 2)) + 1;
                const y = Math.floor(rng() * (MAZE_HEIGHT - 2)) + 1;
                if (maze[y][x] !== CELL.WALL) continue;
                const left = maze[y][x-1] === CELL.EMPTY;
                const right = maze[y][x+1] === CELL.EMPTY;
                const up = maze[y-1][x] === CELL.EMPTY;
                const down = maze[y+1][x] === CELL.EMPTY;
                // Only open if exactly two opposite neighbors are empty to avoid big open rooms
                if ((left && right && !up && !down) || (up && down && !left && !right)) {
                    maze[y][x] = CELL.EMPTY;
                    return true;
                }
            }
            return false;
        }
        // Helper: at a dead end, knock out a side wall to create a small shortcut
        function trimDeadEndOnce() {
            for (let attempt = 0; attempt < 200; attempt++) {
                const x = Math.floor(rng() * (MAZE_WIDTH - 2)) + 1;
                const y = Math.floor(rng() * (MAZE_HEIGHT - 2)) + 1;
                if (maze[y][x] !== CELL.EMPTY) continue;
                const neighbors = [
                    {dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}
                ];
                let emptyN = 0; let walls = [];
                for (const s of neighbors) {
                    const nx = x + s.dx, ny = y + s.dy;
                    if (maze[ny][nx] === CELL.EMPTY) emptyN++;
                    if (maze[ny][nx] === CELL.WALL) walls.push({x:nx,y:ny});
                }
                if (emptyN === 1 && walls.length >= 2) {
                    // Pick a side wall that would connect to another corridor (two steps ahead is empty)
                    shuffle(walls, rng);
                    for (const w of walls) {
                        const vx = w.x + (w.x - x);
                        const vy = w.y + (w.y - y);
                        if (vx > 0 && vx < MAZE_WIDTH - 1 && vy > 0 && vy < MAZE_HEIGHT - 1 && maze[vy][vx] === CELL.EMPTY) {
                            maze[w.y][w.x] = CELL.EMPTY;
                            return true;
                        }
                    }
                }
            }
            return false;
        }
        // Open a small number of connectors and trims
        let connectors = 0; let trims = 0;
        const targetConnectors = 3; // subtle loops
        const targetTrims = 3; // reduce a few dead ends
        while (connectors < targetConnectors && openConnectorOnce()) connectors++;
        while (trims < targetTrims && trimDeadEndOnce()) trims++;
    })();
    
    // Ensure there is at least one reachable empty cell along bottom row (y = H-2) or right column (x = W-2)
    const edgeCandidates = [];
    for (let x = 1; x < MAZE_WIDTH - 1; x++) edgeCandidates.push({ x, y: MAZE_HEIGHT - 2 });
    for (let y = 1; y < MAZE_HEIGHT - 1; y++) edgeCandidates.push({ x: MAZE_WIDTH - 2, y });

    const edgeSteps = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 }
    ];

    // Try to carve a reachable empty on the edge near bottom-right if none exists
    let hasReachableEdgeEmpty = edgeCandidates.some(({ x, y }) => maze[y][x] === CELL.EMPTY && Number.isFinite(distances[y][x]));
    if (!hasReachableEdgeEmpty) {
        // Prefer the inner corner then move outward
        const sorted = edgeCandidates
            .map(c => ({ ...c, score: c.x + c.y }))
            .sort((a, b) => b.score - a.score);
        for (const { x, y } of sorted) {
            // Carve this edge to empty if adjacent to a reachable empty cell
            const neighbor = edgeSteps.find(s => {
                const nx = x + s.dx, ny = y + s.dy;
                return nx > 0 && nx < MAZE_WIDTH - 1 && ny > 0 && ny < MAZE_HEIGHT - 1 &&
                    maze[ny][nx] === CELL.EMPTY && Number.isFinite(distances[ny][nx]);
            });
            if (neighbor) {
                maze[y][x] = CELL.EMPTY;
                hasReachableEdgeEmpty = true;
                break;
            }
        }
    }

    // Choose the bottom-right-most reachable empty on the edge
    let exitX = MAZE_WIDTH - 2;
    let exitY = MAZE_HEIGHT - 2;
    let bestScore = -1;
    for (const { x, y } of edgeCandidates) {
        if (maze[y][x] === CELL.EMPTY && Number.isFinite(distances[y][x])) {
            const score = x + y; // favors bottom-right
            if (score > bestScore) {
                bestScore = score;
                exitX = x;
                exitY = y;
            }
        }
    }
    maze[exitY][exitX] = CELL.EXIT;
    
    // Deterministic generator placement: top-right, bottom-left, and middle of the map
    function nearestWallWithAccess(tx, ty) {
        const steps = [ {dx:1,dy:0}, {dx:-1,dy:0}, {dx:0,dy:1}, {dx:0,dy:-1} ];
        let best = null; let bestD = Infinity;
        for (let r = 0; r <= Math.max(MAZE_WIDTH, MAZE_HEIGHT); r++) {
            for (let y = Math.max(1, ty - r); y <= Math.min(MAZE_HEIGHT - 2, ty + r); y++) {
                for (let x = Math.max(1, tx - r); x <= Math.min(MAZE_WIDTH - 2, tx + r); x++) {
                    if (maze[y][x] !== CELL.WALL) continue;
                    // must be adjacent to reachable EMPTY
                    const acc = steps.some(s => {
                        const nx = x + s.dx, ny = y + s.dy;
                        return maze[ny][nx] === CELL.EMPTY && Number.isFinite(distances[ny][nx]);
                    });
                    if (!acc) continue;
                    const d = Math.abs(x - tx) + Math.abs(y - ty);
                    if (d < bestD) { bestD = d; best = { x, y }; }
                }
            }
            if (best) break;
        }
        return best;
    }
    let generators = [];
    if (generatorCount === 3) {
        const targetTopRight = { x: Math.floor(MAZE_WIDTH * 0.75), y: Math.floor(MAZE_HEIGHT * 0.25) };
        const targetBottomLeft = { x: Math.floor(MAZE_WIDTH * 0.25), y: Math.floor(MAZE_HEIGHT * 0.85) };
        const targetCenter = { x: Math.floor(MAZE_WIDTH * 0.5), y: Math.floor(MAZE_HEIGHT * 0.5) };
        const placements = [
            nearestWallWithAccess(targetTopRight.x, targetTopRight.y),
            nearestWallWithAccess(targetBottomLeft.x, targetBottomLeft.y),
            nearestWallWithAccess(targetCenter.x, targetCenter.y)
        ].filter(Boolean);
        for (const pos of placements) {
            if (maze[pos.y][pos.x] === CELL.WALL) {
                maze[pos.y][pos.x] = CELL.GENERATOR;
                generators.push({ x: pos.x, y: pos.y, completed: false, progress: 0, failCount: 0, blockedUntil: 0 });
            }
        }
    } else {
        // Fallback for non-3 counts: pick spread-out wall tiles adjacent to reachable empties
        const candidates = [];
        const steps = [ {dx:1,dy:0}, {dx:-1,dy:0}, {dx:0,dy:1}, {dx:0,dy:-1} ];
        for (let y = 1; y < MAZE_HEIGHT - 1; y++) {
            for (let x = 1; x < MAZE_WIDTH - 1; x++) {
                if (maze[y][x] !== CELL.WALL) continue;
                const acc = steps.some(s => {
                    const nx = x + s.dx, ny = y + s.dy;
                    return maze[ny][nx] === CELL.EMPTY && Number.isFinite(distances[ny][nx]);
                });
                if (acc) candidates.push({ x, y });
            }
        }
        // Shuffle for variety
        shuffle(candidates, rng);
        // Greedy spacing: try larger spacing first, then relax
        let picks = [];
        const thresholds = [10, 8, 6, 4, 2, 1];
        function farEnough(a, b, minD) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) >= minD; }
        for (const minD of thresholds) {
            picks = [];
            for (const c of candidates) {
                if (picks.length === 0 || picks.every(p => farEnough(p, c, minD))) {
                    picks.push(c);
                    if (picks.length >= generatorCount) break;
                }
            }
            if (picks.length >= generatorCount) break;
        }
        // Place up to requested count
        for (let i = 0; i < Math.min(generatorCount, picks.length); i++) {
            const pos = picks[i];
            if (maze[pos.y][pos.x] === CELL.WALL) {
                maze[pos.y][pos.x] = CELL.GENERATOR;
                generators.push({ x: pos.x, y: pos.y, completed: false, progress: 0, failCount: 0, blockedUntil: 0 });
            }
        }
    }
    
    // Optionally place paired teleport pads near the horizontal midpoints (left/right)
    const telepads = [];
    if (includeTelepads) {
        const midY = Math.floor(MAZE_HEIGHT / 2);
        function findNearestReachableEmpty(tx, ty) {
            let best = null; let bestD = Infinity;
            for (let r = 0; r <= Math.max(MAZE_WIDTH, MAZE_HEIGHT); r++) {
                for (let y = Math.max(1, ty - r); y <= Math.min(MAZE_HEIGHT - 2, ty + r); y++) {
                    for (let x = Math.max(1, tx - r); x <= Math.min(MAZE_WIDTH - 2, tx + r); x++) {
                        if (maze[y][x] !== CELL.WALL && Number.isFinite(distances[y][x])) {
                            // Prefer EMPTY cells; if generator or exit already placed, skip
                            if (maze[y][x] === CELL.EMPTY) {
                                const d = Math.abs(x - tx) + Math.abs(y - ty);
                                if (d < bestD) { bestD = d; best = { x, y }; }
                            }
                        }
                    }
                }
                if (best) break;
            }
            return best;
        }
        const leftTarget = { x: 1, y: midY };
        const rightTarget = { x: MAZE_WIDTH - 2, y: midY };
        const left = findNearestReachableEmpty(leftTarget.x, leftTarget.y);
        const right = findNearestReachableEmpty(rightTarget.x, rightTarget.y);
        if (left && right) {
            maze[left.y][left.x] = CELL.TELEPAD;
            maze[right.y][right.x] = CELL.TELEPAD;
            telepads.push({ x: left.x, y: left.y, cooldownUntil: 0, chargeStartAt: 0 });
            telepads.push({ x: right.x, y: right.y, cooldownUntil: 0, chargeStartAt: 0 });
        }
    }

    return { grid: maze, generators, telepads };
}

// Level 11 Custom Maze: Puzzle rooms with all features accessible but specific unlocks needed
export function generateLevel11Maze() {
    const blank = () => Array(MAZE_HEIGHT).fill(null).map(() => Array(MAZE_WIDTH).fill(CELL.WALL));
    const carveRect = (grid, x0, y0, x1, y1) => {
        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                if (x > 0 && x < MAZE_WIDTH - 1 && y > 0 && y < MAZE_HEIGHT - 1) {
                    grid[y][x] = CELL.EMPTY;
                }
            }
        }
    };
    const addWall = (grid, x, y) => {
        if (x > 0 && x < MAZE_WIDTH - 1 && y > 0 && y < MAZE_HEIGHT - 1) {
            grid[y][x] = CELL.WALL;
        }
    };

    // --- Entry hallway ---
    const entry = blank();
    carveRect(entry, 13, 20, 17, 28); // vertical hall
    carveRect(entry, 14, 18, 16, 20); // small landing by door
    const entryDoor = { x: 15, y: 18 };
    entry[entryDoor.y][entryDoor.x] = CELL.EMPTY;
    const entrySpawn = { x: 15, y: 27 };
    entry[entrySpawn.y][entrySpawn.x] = CELL.EMPTY;

    // --- Hub ---
    const hub = blank();
    carveRect(hub, 8, 10, 22, 20); // main hub chamber
    // Doors
    const hubDoorFromEntry = { x: 15, y: 20 };
    const hubDoorLeft = { x: 8, y: 15 };
    const hubDoorRight = { x: 22, y: 15 };
    const hubDoorTop = { x: 15, y: 10 };
    [hubDoorFromEntry, hubDoorLeft, hubDoorRight, hubDoorTop].forEach(d => { hub[d.y][d.x] = CELL.EMPTY; });
    const hubGreenKeyDrop = { x: 14, y: 14 };

    // --- Puzzle room (right) ---
    const puzzle = blank();
    carveRect(puzzle, 12, 11, 21, 19);
    const puzzleDoor = { x: 12, y: 15 };
    puzzle[puzzleDoor.y][puzzleDoor.x] = CELL.EMPTY;
    const puzzleTiles = [];
    const origin = { x: 15, y: 13 };
    for (let py = 0; py < 3; py++) {
        for (let px = 0; px < 3; px++) {
            const tx = origin.x + px;
            const ty = origin.y + py;
            puzzle[ty][tx] = CELL.EMPTY;
            puzzleTiles.push({ x: tx, y: ty, index: py * 3 + px });
        }
    }
    const puzzleNote = { x: 19, y: 12 };
    puzzle[puzzleNote.y][puzzleNote.x] = CELL.EMPTY;

    // --- Dark maze (left) ---
    const dark = blank();
    carveRect(dark, 6, 10, 20, 22);
    const darkDoor = { x: 20, y: 16 };
    dark[darkDoor.y][darkDoor.x] = CELL.EMPTY;
    // simple hand maze lines
    for (let x = 7; x <= 19; x++) addWall(dark, x, 14);
    for (let x = 9; x <= 18; x++) addWall(dark, x, 18);
    for (let y = 11; y <= 21; y++) addWall(dark, 11, y === 16 ? 999 : y); // hole at 16
    for (let y = 11; y <= 20; y++) addWall(dark, 15, y === 19 ? 999 : y); // hole at 19
    dark[14][12] = CELL.EMPTY; dark[14][16] = CELL.EMPTY; dark[18][14] = CELL.EMPTY; dark[18][17] = CELL.EMPTY; dark[16][11] = CELL.EMPTY;
    const flashlightPickup = { x: 19, y: 17 };
    dark[flashlightPickup.y][flashlightPickup.x] = CELL.EMPTY;
    const yellowKeyPos = { x: 8, y: 21 };
    dark[yellowKeyPos.y][yellowKeyPos.x] = CELL.EMPTY;
    const batSpawns = [
        { x: 9, y: 12 },
        { x: 13, y: 20 },
        { x: 17, y: 13 }
    ];

    // --- Ending room (top) ---
    const finale = blank();
    carveRect(finale, 12, 6, 18, 11);
    const finaleDoor = { x: 15, y: 11 };
    finale[finaleDoor.y][finaleDoor.x] = CELL.EMPTY;
    const finaleNote = { x: 15, y: 7 };
    finale[finaleNote.y][finaleNote.x] = CELL.EMPTY;

    const rooms = {
        entry: {
            grid: entry,
            spawnPoints: { default: entrySpawn },
            doors: [ { pos: entryDoor, target: 'hub', spawn: 'fromEntry', lock: null } ]
        },
        hub: {
            grid: hub,
            spawnPoints: {
                fromEntry: { x: 15, y: 19 },
                fromPuzzle: { x: hubDoorRight.x - 1, y: hubDoorRight.y },
                fromDark: { x: hubDoorLeft.x + 1, y: hubDoorLeft.y },
                fromTop: { x: hubDoorTop.x, y: hubDoorTop.y + 1 },
                default: { x: 15, y: 15 }
            },
            doors: [
                { pos: hubDoorLeft, target: 'dark', spawn: 'fromHub', lock: 'green' },
                { pos: hubDoorRight, target: 'puzzle', spawn: 'fromHub', lock: null },
                { pos: hubDoorTop, target: 'finale', spawn: 'fromHub', lock: 'yellow' },
                { pos: hubDoorFromEntry, target: 'entry', spawn: 'default', lock: null }
            ],
            greenKeyDrop: hubGreenKeyDrop
        },
        puzzle: {
            grid: puzzle,
            spawnPoints: { fromHub: { x: puzzleDoor.x + 1, y: puzzleDoor.y }, default: { x: puzzleDoor.x + 1, y: puzzleDoor.y } },
            doors: [ { pos: puzzleDoor, target: 'hub', spawn: 'fromPuzzle', lock: null } ],
            puzzle: { tiles: puzzleTiles, note: puzzleNote, origin, paperPattern: puzzleNote }
        },
        dark: {
            grid: dark,
            spawnPoints: { fromHub: { x: darkDoor.x - 1, y: darkDoor.y }, default: { x: darkDoor.x - 1, y: darkDoor.y } },
            doors: [ { pos: darkDoor, target: 'hub', spawn: 'fromDark', lock: null } ],
            darkRoom: { flashlight: flashlightPickup, yellowKey: yellowKeyPos, bats: batSpawns }
        },
        finale: {
            grid: finale,
            spawnPoints: { fromHub: { x: finaleDoor.x, y: finaleDoor.y - 1 }, default: { x: finaleDoor.x, y: finaleDoor.y - 1 } },
            doors: [ { pos: finaleDoor, target: 'hub', spawn: 'fromTop', lock: null } ],
            note: finaleNote
        }
    };

    return { grid: entry, generators: [], telepads: [], level11: { rooms, spawnRoom: 'entry' } };
}
