// Level Builder for Echo Maze
// Provides a 30x30 tile editor that exports/imports custom levels compatible with game state
(() => {
    const SIZE = 30;
    const TILE = 20; // pixel size per cell in canvas

    // Tile legend matches runtime semantics; extra codes encode enemy spawners
    const Tiles = {
        EMPTY: 0,
        WALL: 1,
        START: 2,
        EXIT: 3,
        GENERATOR: 4,
        TELEPORT: 5,
        SPAWN_CHASER: 10,
        SPAWN_SEEKER: 11,
        SPAWN_BATTER: 12,
        SPAWN_PIG: 13,
        SPAWN_MORTAR: 14,
    };

    const palette = [
        { id: Tiles.WALL, label: 'Wall' },
        { id: Tiles.START, label: 'Spawn' },
        { id: Tiles.EXIT, label: 'Exit' },
        { id: Tiles.GENERATOR, label: 'Generator' },
        { id: Tiles.TELEPORT, label: 'Teleporter' },
        { id: Tiles.SPAWN_CHASER, label: 'Chaser' },
        { id: Tiles.SPAWN_SEEKER, label: 'Seeker' },
        { id: Tiles.SPAWN_BATTER, label: 'Batter' },
        { id: Tiles.SPAWN_PIG, label: 'Flying Pig' },
        { id: Tiles.SPAWN_MORTAR, label: 'Mortar' },
        { id: Tiles.EMPTY, label: 'Erase', isErase: true },
    ];

    const canvas = document.getElementById('builderCanvas');
    const ctx = canvas.getContext('2d');
    const paletteEl = document.getElementById('palette');
    const toastEl = document.getElementById('toast');
    const shareText = document.getElementById('shareText');
    const levelNameEl = document.getElementById('levelName');
    const authorNameEl = document.getElementById('authorName');

    const playTestBtn = document.getElementById('playTestBtn');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const copyBtn = document.getElementById('copyBtn');
    const loadJsonBtn = document.getElementById('loadJsonBtn');
    const backupBtn = document.getElementById('backupBtn');
    const featuredBtn = document.getElementById('featuredBtn');
    const backBtn = document.getElementById('backBtn');
    const resetBtn = document.getElementById('resetBtn');
    const sizeSlider = document.getElementById('sizeSlider');
    const sizeInput = document.getElementById('sizeInput');
    const canvasSizeDisplay = document.getElementById('canvasSize');
    // Tools toolbar
    const toolPaintBtn = document.getElementById('toolPaintBtn');
    const toolSelectBtn = document.getElementById('toolSelectBtn');
    const toolFillBtn = document.getElementById('toolFillBtn');
    const toolEyedropBtn = document.getElementById('toolEyedropBtn');
    const actionCopyBtn = document.getElementById('actionCopyBtn');
    const actionCutBtn = document.getElementById('actionCutBtn');
    const actionPasteBtn = document.getElementById('actionPasteBtn');
    const actionClearSelBtn = document.getElementById('actionClearSelBtn');
    const toolStatusEl = document.getElementById('toolStatus');
    const linkTeleportersBtn = document.getElementById('linkTeleportersBtn');
    const teleporterList = document.getElementById('teleporterList');
    const dirTwoWayBtn = document.getElementById('dirTwoWay');
    const dirOneWayBtn = document.getElementById('dirOneWay');
    const targetTeleporterBtn = document.getElementById('targetTeleporter');
    const targetCellBtn = document.getElementById('targetCell');
    const toggleLinkLinesBtn = document.getElementById('toggleLinkLinesBtn');
    const barrierModeBtn = document.getElementById('barrierModeBtn');
    const pickEnemyBtn = document.getElementById('pickEnemyBtn');
    const toggleBarriersBtn = document.getElementById('toggleBarriersBtn');
    const barrierList = document.getElementById('barrierList');

    const DRAFT_KEY = 'builderDraft';

    let activeTile = Tiles.WALL;
    let activeBoardSize = 30;
    let isMouseDown = false;
    const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(Tiles.EMPTY));
    let dirty = false;
    
    let linkMode = false;
    let pendingLink = null;
    let linkDirection = 'two-way'; // 'one-way' or 'two-way'
    let linkTarget = 'teleporter'; // 'teleporter' or 'cell'
    let showLinkLines = false;
    let linkIdCounter = 1;
    const linkRecords = [];
    const teleporterLinks = new Map(); // Maps teleporter key to Set of link IDs

    // Barrier mode state
    let barrierMode = false; // overall toggle to intercept canvas input
    let barrierStage = 'idle'; // 'idle' | 'pick' | 'draw'
    let barrierSelectedEnemy = null; // {x,y,type}
    let barrierDragStart = null; // {x,y}
    let barrierDragCurrent = null; // {x,y}
    let showBarriers = false;
    const enemyBarriers = []; // {id, enemy:{x,y,type}, rect:{x,y,w,h}}
    let barrierIdCounter = 1;

    // Tools state
    let toolMode = 'paint'; // 'paint' | 'select' | 'fill' | 'paste' | 'eyedropper'
    let selecting = false;
    let selectionStart = null; // {x,y}
    let selectionCurrent = null; // {x,y}
    let selectionRect = null; // {x,y,w,h}
    let clipboard = null; // 2D array of tiles
    let pasteHover = null; // {x,y}

    function showToast(msg, dur = 1800) {
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        setTimeout(() => toastEl.classList.remove('show'), dur);
    }

    function renderPalette() {
        paletteEl.innerHTML = '';
        palette.forEach(item => {
            const div = document.createElement('div');
            div.className = 'tile' + (activeTile === item.id ? ' active' : '');
            // icon + label
            const icon = createTileIcon(item.id);
            const label = document.createElement('div');
            label.textContent = item.label;
            label.style.marginTop = '6px';
            label.style.fontSize = '11px';
            label.style.fontWeight = '700';
            div.style.display = 'flex';
            div.style.flexDirection = 'column';
            div.style.alignItems = 'center';
            div.appendChild(icon);
            div.appendChild(label);
            div.addEventListener('click', () => {
                activeTile = item.id;
                renderPalette();
            });
            paletteEl.appendChild(div);
        });
    }

    function createTileIcon(value) {
        const c = document.createElement('canvas');
        c.width = 28; c.height = 28;
        const g = c.getContext('2d');
        // base
        g.fillStyle = '#1d2a44';
        g.fillRect(0, 0, 28, 28);
        // border
        g.strokeStyle = '#233456';
        g.strokeRect(0.5, 0.5, 27, 27);
        const color = tileColor(value);
        if (value === Tiles.EMPTY) {
            // eraser icon
            g.strokeStyle = '#a0b3d1';
            g.lineWidth = 2;
            g.beginPath();
            g.moveTo(6, 20); g.lineTo(22, 6);
            g.stroke();
        } else if (value === Tiles.TELEPORT) {
            g.fillStyle = color; g.beginPath(); g.arc(14, 14, 9, 0, Math.PI*2); g.fill();
            g.fillStyle = '#0b0f1a'; g.beginPath(); g.arc(14, 14, 4, 0, Math.PI*2); g.fill();
        } else if (value >= 10) {
            // enemy spawns as diamond
            g.fillStyle = color;
            g.beginPath();
            g.moveTo(14, 5); g.lineTo(23, 14); g.lineTo(14, 23); g.lineTo(5, 14); g.closePath();
            g.fill();
        } else {
            g.fillStyle = color;
            g.fillRect(4, 4, 20, 20);
        }
        return c;
    }

    function tileColor(value) {
        switch (value) {
            case Tiles.WALL: return '#1f3c88';
            case Tiles.START: return '#3bd671';
            case Tiles.EXIT: return '#ff9f1c';
            case Tiles.GENERATOR: return '#ff4d6d';
            case Tiles.TELEPORT: return '#4de1ff';
            case Tiles.SPAWN_CHASER: return '#cdb4ff';
            case Tiles.SPAWN_SEEKER: return '#bde0fe';
            case Tiles.SPAWN_BATTER: return '#ffc8dd';
            case Tiles.SPAWN_PIG: return '#ffafcc';
            case Tiles.SPAWN_MORTAR: return '#ffd166';
            default: return '#1d2a44';
        }
    }

    function drawCell(x, y, value) {
        const px = x * TILE;
        const py = y * TILE;
        ctx.fillStyle = '#1d2a44';
        ctx.fillRect(px, py, TILE, TILE);
        switch (value) {
            case Tiles.WALL: ctx.fillStyle = '#1f3c88'; break;
            case Tiles.START: ctx.fillStyle = '#3bd671'; break;
            case Tiles.EXIT: ctx.fillStyle = '#ff9f1c'; break;
            case Tiles.GENERATOR: ctx.fillStyle = '#ff4d6d'; break;
            case Tiles.TELEPORT: ctx.fillStyle = '#4de1ff'; break;
            case Tiles.SPAWN_CHASER: ctx.fillStyle = '#cdb4ff'; break;
            case Tiles.SPAWN_SEEKER: ctx.fillStyle = '#bde0fe'; break;
            case Tiles.SPAWN_BATTER: ctx.fillStyle = '#ffc8dd'; break;
            case Tiles.SPAWN_PIG: ctx.fillStyle = '#ffafcc'; break;
            case Tiles.SPAWN_MORTAR: ctx.fillStyle = '#ffd166'; break;
            default: return; // empty handled by base
        }
        ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
    }

    function redraw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let y = 0; y < SIZE; y++) {
            for (let x = 0; x < SIZE; x++) {
                drawCell(x, y, grid[y][x]);
            }
        }
        if (showLinkLines) drawLinks();
        if (showBarriers || barrierStage === 'draw') drawBarriers();
        if (selectionRect) drawSelectionOverlay();
        if (toolMode === 'paste' && clipboard && pasteHover) drawPastePreview();
    }

    function drawArrow(fromX, fromY, toX, toY) {
        const headlen = 6;
        const dx = toX - fromX;
        const dy = toY - fromY;
        const angle = Math.atan2(dy, dx);
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    }

    function drawLinks() {
        ctx.save();
        ctx.strokeStyle = '#ff4d6d';
        ctx.lineWidth = 2;
        linkRecords.forEach(link => {
            const fromCx = (link.from.x + 0.5) * TILE;
            const fromCy = (link.from.y + 0.5) * TILE;
            const toCx = (link.to.x + 0.5) * TILE;
            const toCy = (link.to.y + 0.5) * TILE;
            ctx.beginPath();
            drawArrow(fromCx, fromCy, toCx, toCy);
            if (link.bidirectional && link.targetType === 'teleporter') {
                drawArrow(toCx, toCy, fromCx, fromCy);
            }
            ctx.stroke();
        });
        ctx.restore();
    }

    function drawBarriers() {
        ctx.save();
        ctx.strokeStyle = '#cdb4ff';
        ctx.lineWidth = 2;
        // active drag rectangle preview
        if (barrierStage === 'draw' && barrierDragStart && barrierSelectedEnemy && barrierDragCurrent) {
            const cur = barrierDragCurrent;
            const minX = Math.min(barrierDragStart.x, cur.x);
            const minY = Math.min(barrierDragStart.y, cur.y);
            const maxX = Math.max(barrierDragStart.x, cur.x);
            const maxY = Math.max(barrierDragStart.y, cur.y);
            const x = minX * TILE;
            const y = minY * TILE;
            const w = (maxX - minX + 1) * TILE;
            const h = (maxY - minY + 1) * TILE;
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        }
        ctx.setLineDash([]);
        enemyBarriers.forEach(b => {
            const x = b.rect.x * TILE;
            const y = b.rect.y * TILE;
            const w = b.rect.w * TILE;
            const h = b.rect.h * TILE;
            ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        });
        ctx.restore();
    }

    function setCell(x, y, value) {
        if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
        grid[y][x] = value;
        redraw();
        markDirty();
    }

    function cellFromEvent(e) {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / rect.width * SIZE);
        const y = Math.floor((e.clientY - rect.top) / rect.height * SIZE);
        return { x, y };
    }

    function handlePaint(e) {
        if (linkMode) {
            handleCanvasClickLinkMode(e);
            return;
        }
        if (barrierMode) {
            const { x, y } = cellFromEvent(e);
            // Stage: pick enemy
            const isEnemyTile = (v) => [Tiles.SPAWN_CHASER, Tiles.SPAWN_SEEKER, Tiles.SPAWN_BATTER, Tiles.SPAWN_PIG, Tiles.SPAWN_MORTAR].includes(v);
            if (barrierStage === 'pick') {
                if (isEnemyTile(grid[y][x])) {
                    barrierSelectedEnemy = { x, y, type: grid[y][x] };
                    barrierStage = 'draw';
                    showToast(`Enemy selected at (${x},${y}). Draw area.`);
                    return;
                } else {
                    showToast('Click an enemy spawn to select.');
                    return;
                }
            }
            // Stage: draw rectangle
            if (barrierStage === 'draw') {
                if (!barrierSelectedEnemy) { showToast('Pick an enemy first.'); return; }
                if (!barrierDragStart) {
                    barrierDragStart = { x, y };
                    barrierDragCurrent = { x, y };
                    redraw();
                } else {
                    barrierDragCurrent = { x, y };
                    redraw();
                }
                return;
            }
            return;
        }
        const { x, y } = cellFromEvent(e);
        if (toolMode === 'select') {
            if (!selecting) {
                selecting = true;
                selectionStart = { x, y };
                selectionCurrent = { x, y };
            } else {
                selectionCurrent = { x, y };
            }
            selectionRect = normalizeRect(selectionStart, selectionCurrent);
            redraw();
            return;
        }

        if (toolMode === 'fill') {
            floodFill(x, y, grid[y][x], activeTile);
            redraw(); markDirty();
            return;
        }

        if (toolMode === 'eyedropper') {
            const picked = grid[y][x];
            activeTile = picked;
            renderPalette();
            setTool('paint');
            showToast('Picked tile');
            return;
        }

        if (toolMode === 'paste') {
            if (clipboard) {
                pasteAt(x, y, clipboard);
                redraw(); markDirty();
            }
            return;
        }

        // default: paint/erase
        if (e.button === 2) {
            setCell(x, y, Tiles.EMPTY);
            const key = `${x},${y}`;
            removeLinksForTeleporter(key);
            return;
        }
        setCell(x, y, activeTile);
        if (activeTile === Tiles.TELEPORT) {
            updateTeleporterList();
        }
    }

    function canvasListeners() {
        canvas.addEventListener('mousedown', e => {
            isMouseDown = true;
            handlePaint(e);
        });
        canvas.addEventListener('mousemove', e => {
            if (toolMode === 'paste' && clipboard) {
                pasteHover = cellFromEvent(e);
                redraw();
                return;
            }
            if (isMouseDown) handlePaint(e);
        });
        window.addEventListener('mouseup', () => {
            if (barrierMode && barrierStage === 'draw' && barrierDragStart && barrierDragCurrent) {
                const minX = Math.min(barrierDragStart.x, barrierDragCurrent.x);
                const minY = Math.min(barrierDragStart.y, barrierDragCurrent.y);
                const maxX = Math.max(barrierDragStart.x, barrierDragCurrent.x);
                const maxY = Math.max(barrierDragStart.y, barrierDragCurrent.y);
                const rect = { x: minX, y: minY, w: (maxX - minX + 1), h: (maxY - minY + 1) };
                // Convert tile code to enemy type string
                const enemyType = enemyTypeForTile(barrierSelectedEnemy.type);
                enemyBarriers.push({ id: `B${barrierIdCounter++}`, enemy: { x: barrierSelectedEnemy.x, y: barrierSelectedEnemy.y, type: enemyType }, rect });
                barrierDragStart = null;
                barrierDragCurrent = null;
                updateBarrierList();
                redraw();
                markDirty();
            }
            if (selecting) {
                selecting = false;
                selectionRect = normalizeRect(selectionStart, selectionCurrent);
                redraw();
            }
            isMouseDown = false;
        });
        canvas.addEventListener('contextmenu', e => e.preventDefault());
        canvas.addEventListener('touchstart', e => {
            e.preventDefault();
            const touch = e.touches[0];
            handlePaint({ clientX: touch.clientX, clientY: touch.clientY, button: 0 });
        }, { passive: false });
        canvas.addEventListener('touchmove', e => {
            e.preventDefault();
            const touch = e.touches[0];
            if (toolMode === 'paste' && clipboard) {
                pasteHover = cellFromEvent({ clientX: touch.clientX, clientY: touch.clientY });
                redraw();
                return;
            }
            handlePaint({ clientX: touch.clientX, clientY: touch.clientY, button: 0 });
        }, { passive: false });
    }

    function normalizeRect(a, b) {
        if (!a || !b) return null;
        const minX = Math.max(0, Math.min(a.x, b.x));
        const minY = Math.max(0, Math.min(a.y, b.y));
        const maxX = Math.min(SIZE - 1, Math.max(a.x, b.x));
        const maxY = Math.min(SIZE - 1, Math.max(a.y, b.y));
        return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
    }

    function drawSelectionOverlay() {
        if (!selectionRect) return;
        ctx.save();
        ctx.setLineDash([5, 3]);
        ctx.strokeStyle = '#4de1ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(selectionRect.x * TILE + 1, selectionRect.y * TILE + 1, selectionRect.w * TILE - 2, selectionRect.h * TILE - 2);
        ctx.restore();
    }

    function drawPastePreview() {
        if (!pasteHover || !clipboard) return;
        const startX = pasteHover.x;
        const startY = pasteHover.y;
        ctx.save();
        for (let y = 0; y < clipboard.length; y++) {
            for (let x = 0; x < clipboard[0].length; x++) {
                const gx = startX + x, gy = startY + y;
                if (gx < 0 || gy < 0 || gx >= SIZE || gy >= SIZE) continue;
                const color = tileColor(clipboard[y][x]);
                ctx.globalAlpha = 0.55;
                ctx.fillStyle = color;
                ctx.fillRect(gx * TILE + 1, gy * TILE + 1, TILE - 2, TILE - 2);
                ctx.globalAlpha = 1;
            }
        }
        ctx.restore();
    }

    function extractSelection(rect) {
        if (!rect) return null;
        const data = [];
        for (let y = 0; y < rect.h; y++) {
            const row = [];
            for (let x = 0; x < rect.w; x++) {
                row.push(grid[rect.y + y][rect.x + x]);
            }
            data.push(row);
        }
        return data;
    }

    function clearSelectionArea(rect) {
        for (let y = 0; y < rect.h; y++) {
            for (let x = 0; x < rect.w; x++) {
                grid[rect.y + y][rect.x + x] = Tiles.EMPTY;
            }
        }
    }

    function pasteAt(x, y, data) {
        for (let yy = 0; yy < data.length; yy++) {
            for (let xx = 0; xx < data[0].length; xx++) {
                const gx = x + xx, gy = y + yy;
                if (gx < 0 || gy < 0 || gx >= SIZE || gy >= SIZE) continue;
                const val = data[yy][xx];
                grid[gy][gx] = val;
            }
        }
    }

    function floodFill(sx, sy, target, replacement) {
        if (target === replacement) return;
        const inBounds = (x, y) => x >= 0 && y >= 0 && x < SIZE && y < SIZE;
        const q = [];
        q.push({ x: sx, y: sy });
        const seen = new Set();
        const key = (x, y) => `${x},${y}`;
        while (q.length) {
            const { x, y } = q.shift();
            const k = key(x, y);
            if (seen.has(k)) continue;
            seen.add(k);
            if (!inBounds(x, y)) continue;
            if (grid[y][x] !== target) continue;
            grid[y][x] = replacement;
            q.push({ x: x + 1, y });
            q.push({ x: x - 1, y });
            q.push({ x, y: y + 1 });
            q.push({ x, y: y - 1 });
        }
    }

    function setTool(mode) {
        toolMode = mode;
        const buttons = [toolPaintBtn, toolSelectBtn, toolFillBtn, toolEyedropBtn];
        buttons.forEach(b => {
            if (!b) return;
            if ((mode === 'paint' && b === toolPaintBtn) ||
                (mode === 'select' && b === toolSelectBtn) ||
                (mode === 'fill' && b === toolFillBtn) ||
                (mode === 'eyedropper' && b === toolEyedropBtn) ||
                (mode === 'paste' && b === actionPasteBtn)) {
                b.style.background = 'rgba(77,225,255,0.18)';
                b.style.color = 'var(--accent)';
            } else {
                b.style.background = 'var(--panel-strong)';
                b.style.color = 'var(--text)';
            }
        });
        toolStatusEl.textContent = `Active: ${mode[0].toUpperCase()}${mode.slice(1)}`;
        // Clear selection when switching away from select tool
        if (mode !== 'select') {
            selectionRect = null;
            selectionStart = null;
            selectionCurrent = null;
            selecting = false;
        }
        pasteHover = null;
        redraw();
    }

    function gridToData() {
        let start = null;
        let exit = null;
        const gens = [];
        const tele = [];
        const enemies = [];
        for (let y = 0; y < SIZE; y++) {
            for (let x = 0; x < SIZE; x++) {
                const v = grid[y][x];
                if (v === Tiles.START) start = { x, y };
                else if (v === Tiles.EXIT) exit = { x, y };
                else if (v === Tiles.GENERATOR) gens.push({ x, y });
                else if (v === Tiles.TELEPORT) tele.push({ x, y });
                else {
                    const enemyType = enemyTypeForTile(v);
                    if (enemyType) enemies.push({ x, y, type: enemyType });
                }
            }
        }
        return { grid, start, exit, gens, tele, enemies };
    }

    function enemyTypeForTile(v) {
        if (v === Tiles.SPAWN_CHASER) return 'chaser';
        if (v === Tiles.SPAWN_SEEKER) return 'seeker';
        if (v === Tiles.SPAWN_BATTER) return 'batter';
        if (v === Tiles.SPAWN_PIG) return 'flying_pig';
        if (v === Tiles.SPAWN_MORTAR) return 'mortar';
        return null;
    }

    function validate(data) {
        if (!data.start) return 'Place exactly one spawn.';
        if (!data.exit) return 'Place exactly one exit.';
        const starts = countTiles(Tiles.START);
        const exits = countTiles(Tiles.EXIT);
        if (starts !== 1) return 'Only one spawn allowed.';
        if (exits !== 1) return 'Only one exit allowed.';
        // Allow unlimited teleporters, but require each to be linked somewhere
        if (data.tele.length > 0) {
            const unlinked = data.tele.filter(t => {
                const key = `${t.x},${t.y}`;
                const links = teleporterLinks.get(key);
                return !links || links.size === 0;
            });
            if (unlinked.length) return 'Link all teleporters before exporting.';
        }
        return null;
    }

    function countTiles(tile) {
        let c = 0;
        for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (grid[y][x] === tile) c++;
        return c;
    }

    function exportJson() {
        const data = gridToData();
        const error = validate(data);
        if (error) { showToast(error); return null; }
        const payload = buildDraftPayload(data);
        const text = JSON.stringify(payload);
        shareText.value = text;
        saveDraft(payload);
        dirty = false;
        return payload;
    }

    function pairTeleporters(list) {
        const pairs = [];
        for (let i = 0; i < list.length; i += 2) {
            const a = list[i];
            const b = list[i + 1];
            if (a && b) pairs.push([a, b]);
        }
        return pairs;
    }

    function importJson(str) {
        try {
            const data = JSON.parse(str);
            if (!data.grid || !Array.isArray(data.grid) || data.grid.length !== SIZE) throw new Error('Invalid grid');
            for (let y = 0; y < SIZE; y++) {
                for (let x = 0; x < SIZE; x++) {
                    grid[y][x] = data.grid[y][x] ?? Tiles.EMPTY;
                }
            }
            loadLinksFromData(data);
            loadBarriersFromData(data);
            if (Array.isArray(data.enemies)) {
                data.enemies.forEach(e => {
                    const code = tileForEnemyType(e.type);
                    if (code != null && data.grid?.[e.y]?.[e.x] != null) {
                        grid[e.y][e.x] = code;
                    }
                });
            }
            levelNameEl.value = data.name || '';
            authorNameEl.value = data.author || '';
            redraw();
            saveDraft({ ...data, grid: grid });
            dirty = false;
            showToast('Level loaded');
        } catch (e) {
            showToast('Import failed: ' + e.message);
        }
    }

    function tileForEnemyType(type) {
        if (type === 'chaser') return Tiles.SPAWN_CHASER;
        if (type === 'seeker') return Tiles.SPAWN_SEEKER;
        if (type === 'batter') return Tiles.SPAWN_BATTER;
        if (type === 'flying_pig') return Tiles.SPAWN_PIG;
        if (type === 'mortar') return Tiles.SPAWN_MORTAR;
        return null;
    }

    function copyShare() {
        if (!shareText.value) { showToast('Nothing to copy'); return; }
        navigator.clipboard.writeText(shareText.value).then(() => showToast('Copied!')); 
    }

    // Tool button events
    if (toolPaintBtn) toolPaintBtn.addEventListener('click', () => setTool('paint'));
    if (toolSelectBtn) toolSelectBtn.addEventListener('click', () => setTool('select'));
    if (toolFillBtn) toolFillBtn.addEventListener('click', () => setTool('fill'));
    if (toolEyedropBtn) toolEyedropBtn.addEventListener('click', () => setTool('eyedropper'));
    if (actionCopyBtn) actionCopyBtn.addEventListener('click', () => {
        if (!selectionRect) { showToast('No selection'); return; }
        clipboard = extractSelection(selectionRect);
        showToast('Copied selection');
    });
    if (actionCutBtn) actionCutBtn.addEventListener('click', () => {
        if (!selectionRect) { showToast('No selection'); return; }
        clipboard = extractSelection(selectionRect);
        clearSelectionArea(selectionRect);
        redraw(); markDirty();
        showToast('Cut selection');
    });
    if (actionPasteBtn) actionPasteBtn.addEventListener('click', () => {
        if (!clipboard) { showToast('Clipboard empty'); return; }
        setTool('paste');
        showToast('Paste: click to place');
    });
    if (actionClearSelBtn) actionClearSelBtn.addEventListener('click', () => {
        selectionRect = null; selectionStart = null; selectionCurrent = null; pasteHover = null;
        redraw();
    });

    function playtest() {
        const payload = exportJson();
        if (!payload) return;
        localStorage.setItem('customLevel', JSON.stringify(payload));
        window.location.href = 'index.html?custom=1';
    }

    function saveDraft(payloadOverride) {
        const payload = payloadOverride || buildDraftPayload();
        if (!payload) return;
        const snapshot = {
            ...payload,
            name: levelNameEl.value || 'Custom Maze',
            author: authorNameEl.value || 'Anonymous',
            savedAt: Date.now()
        };
        try { localStorage.setItem(DRAFT_KEY, JSON.stringify(snapshot)); } catch {}
    }

    function restoreDraft() {
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);
            if (!data.grid || data.grid.length !== SIZE) return;
            for (let y = 0; y < SIZE; y++) {
                for (let x = 0; x < SIZE; x++) {
                    grid[y][x] = data.grid[y][x] ?? Tiles.EMPTY;
                }
            }
            loadLinksFromData(data);
            loadBarriersFromData(data);
            if (Array.isArray(data.enemies)) {
                data.enemies.forEach(e => {
                    const code = tileForEnemyType(e.type);
                    if (code != null && data.grid?.[e.y]?.[e.x] != null) {
                        grid[e.y][e.x] = code;
                    }
                });
            }
            levelNameEl.value = data.name || '';
            authorNameEl.value = data.author || '';
            redraw();
            dirty = false;
            showToast('Draft restored');
        } catch {}
    }

    function markDirty() {
        dirty = true;
        saveDraft(buildDraftPayload());
    }

    function syncLinkControls() {
        // direction
        const twoActive = linkDirection === 'two-way';
        dirTwoWayBtn.style.background = twoActive ? 'rgba(77,225,255,0.18)' : 'var(--panel-strong)';
        dirTwoWayBtn.style.color = twoActive ? 'var(--accent)' : 'var(--text)';
        dirOneWayBtn.style.background = twoActive ? 'var(--panel-strong)' : 'rgba(77,225,255,0.18)';
        dirOneWayBtn.style.color = twoActive ? 'var(--text)' : 'var(--accent)';

        // target
        const teleActive = linkTarget === 'teleporter';
        targetTeleporterBtn.style.background = teleActive ? 'rgba(77,225,255,0.18)' : 'var(--panel-strong)';
        targetTeleporterBtn.style.color = teleActive ? 'var(--accent)' : 'var(--text)';
        targetCellBtn.style.background = teleActive ? 'var(--panel-strong)' : 'rgba(77,225,255,0.18)';
        targetCellBtn.style.color = teleActive ? 'var(--text)' : 'var(--accent)';

        // link lines toggle
        toggleLinkLinesBtn.textContent = showLinkLines ? 'Hide Lines' : 'Show Lines';
        toggleLinkLinesBtn.style.background = showLinkLines ? 'rgba(255,77,109,0.25)' : 'var(--panel-strong)';
    }

    function clearLinks() {
        linkRecords.length = 0;
        teleporterLinks.clear();
        pendingLink = null;
        updateTeleporterList();
    }

    function indexLinkForTeleporter(key, linkId) {
        if (!teleporterLinks.has(key)) teleporterLinks.set(key, new Set());
        teleporterLinks.get(key).add(linkId);
    }

    function rebuildTeleporterIndex() {
        teleporterLinks.clear();
        linkRecords.forEach(link => {
            const fromKey = `${link.from.x},${link.from.y}`;
            indexLinkForTeleporter(fromKey, link.id);
            if (link.targetType === 'teleporter') {
                const toKey = `${link.to.x},${link.to.y}`;
                indexLinkForTeleporter(toKey, link.id);
            }
        });
    }

    function loadLinksFromData(data) {
        linkRecords.length = 0;
        teleporterLinks.clear();
        pendingLink = null;
        if (Array.isArray(data.teleporterLinksV2)) {
            data.teleporterLinksV2.forEach(l => {
                if (l?.from && l?.to && typeof l.from.x === 'number' && typeof l.to.x === 'number') {
                    linkRecords.push({
                        id: l.id || `L${linkIdCounter++}`,
                        from: { x: l.from.x, y: l.from.y },
                        to: { x: l.to.x, y: l.to.y },
                        bidirectional: !!l.bidirectional,
                        targetType: l.targetType === 'cell' ? 'cell' : 'teleporter'
                    });
                }
            });
        }
        rebuildTeleporterIndex();
        updateTeleporterList();
    }

    function loadBarriersFromData(data) {
        enemyBarriers.length = 0;
        if (Array.isArray(data.enemyBarriers)) {
            data.enemyBarriers.forEach(b => {
                if (b?.enemy && b?.rect) {
                    enemyBarriers.push({
                        id: b.id || `B${barrierIdCounter++}`,
                        enemy: { x: b.enemy.x|0, y: b.enemy.y|0, type: b.enemy.type },
                        rect: { x: b.rect.x|0, y: b.rect.y|0, w: b.rect.w|0, h: b.rect.h|0 }
                    });
                }
            });
        }
        updateBarrierList();
    }

    function updateBarrierList() {
        if (!barrierList) return;
        barrierList.innerHTML = '';
        if (enemyBarriers.length === 0) {
            const span = document.createElement('span');
            span.style.cssText = 'color: var(--muted); font-size:11px;';
            span.textContent = 'No barriers yet';
            barrierList.appendChild(span);
            return;
        }
        enemyBarriers.forEach(b => {
            const div = document.createElement('div');
            div.style.cssText = 'display:flex; align-items:center; gap:6px; padding:6px; background: rgba(205,180,255,0.12); border:1px solid var(--grid-line); border-radius:6px;';
            const label = document.createElement('span');
            label.style.cssText = 'flex:1; font-size:11px;';
            label.textContent = `${b.id}: enemy (${b.enemy.x},${b.enemy.y}) area (${b.rect.x},${b.rect.y}) ${b.rect.w}x${b.rect.h}`;
            const del = document.createElement('button');
            del.textContent = '✕';
            del.style.cssText = 'padding:2px 6px; background: rgba(255,77,109,0.2); border:1px solid var(--danger); color: var(--danger); border-radius:4px; font-size:10px; cursor:pointer;';
            del.onclick = () => {
                const idx = enemyBarriers.findIndex(x => x.id === b.id);
                if (idx >= 0) enemyBarriers.splice(idx, 1);
                updateBarrierList();
                redraw();
                markDirty();
            };
            div.appendChild(label);
            div.appendChild(del);
            barrierList.appendChild(div);
        });
    }

    function addLinkRecord(from, to, bidirectional, targetType) {
        const id = `L${linkIdCounter++}`;
        linkRecords.push({ id, from, to, bidirectional, targetType });
        rebuildTeleporterIndex();
        updateTeleporterList();
        markDirty();
    }

    function removeLinksForTeleporter(key) {
        const [x, y] = key.split(',').map(Number);
        const before = linkRecords.length;
        for (let i = linkRecords.length - 1; i >= 0; i--) {
            const l = linkRecords[i];
            const hitsFrom = l.from.x === x && l.from.y === y;
            const hitsTo = l.targetType === 'teleporter' && l.to.x === x && l.to.y === y;
            if (hitsFrom || hitsTo) linkRecords.splice(i, 1);
        }
        if (before !== linkRecords.length) {
            rebuildTeleporterIndex();
            updateTeleporterList();
            markDirty();
        }
    }

    function changeSize(newSize) {
        newSize = Math.max(1, Math.min(30, parseInt(newSize) || 30));
        if (newSize === activeBoardSize) return;
        if (dirty && !confirm(`Change to ${newSize}x${newSize}? Current layout will be replaced.`)) {
            sizeSlider.value = activeBoardSize;
            sizeInput.value = activeBoardSize;
            return;
        }
        activeBoardSize = newSize;
        
        // Clear and reinitialize grid
        for (let i = 0; i < SIZE; i++) {
            for (let j = 0; j < SIZE; j++) {
                grid[i][j] = Tiles.EMPTY;
            }
        }
        
        // Clear teleporter links since we're rebuilding
        clearLinks();
        
        // Calculate border size based on playable area
        const border = Math.floor((SIZE - newSize) / 2);
        
        // Fill in outer walls
        for (let y = 0; y < SIZE; y++) {
            for (let x = 0; x < SIZE; x++) {
                if (x < border || x >= SIZE - border || y < border || y >= SIZE - border) {
                    grid[y][x] = Tiles.WALL;
                }
            }
        }
        
        canvasSizeDisplay.textContent = `${newSize} x ${newSize}`;
        sizeSlider.value = newSize;
        sizeInput.value = newSize;
        redraw();
        markDirty();
        showToast(`Canvas changed to ${newSize}x${newSize}`);
    }

    function updateSizeFromSlider() {
        const newSize = parseInt(sizeSlider.value);
        sizeInput.value = newSize;
        changeSize(newSize);
    }

    function updateSizeFromInput() {
        const newSize = Math.max(1, Math.min(30, parseInt(sizeInput.value) || 30));
        sizeInput.value = newSize;
        sizeSlider.value = newSize;
        changeSize(newSize);
    }

    function resetBoard() {
        if (!confirm('Clear the entire board?')) return;
        for (let y = 0; y < SIZE; y++) {
            for (let x = 0; x < SIZE; x++) {
                grid[y][x] = Tiles.EMPTY;
            }
        }
        clearLinks();
        enemyBarriers = [];
        updateBarrierList();
        redraw();
        markDirty();
        showToast('Board cleared');
    }

    function buildDraftPayload(data) {
        const d = data || gridToData();
        return {
            version: 1,
            name: levelNameEl.value || 'Custom Maze',
            author: authorNameEl.value || 'Anonymous',
            grid: d.grid,
            start: d.start,
            exit: d.exit,
            generators: d.gens,
            telepads: pairTeleporters(d.tele),
            enemies: d.enemies,
            teleporterLinksV2: linkRecords,
            enemyBarriers: enemyBarriers,
        };
    }

    function getTeleporters() {
        const teles = [];
        for (let y = 0; y < SIZE; y++) {
            for (let x = 0; x < SIZE; x++) {
                if (grid[y][x] === Tiles.TELEPORT) {
                    teles.push({ x, y, key: `${x},${y}` });
                }
            }
        }
        return teles;
    }

    function updateTeleporterList() {
        const teles = getTeleporters();
        teleporterList.innerHTML = '';
        if (teles.length === 0) {
            teleporterList.innerHTML = '<span style="color: var(--muted); font-size: 11px;">No teleporters placed</span>';
            return;
        }

        if (linkRecords.length === 0) {
            teleporterList.innerHTML = '<span style="color: var(--muted); font-size: 11px;">No links yet</span>';
            return;
        }

        linkRecords.forEach(link => {
            const div = document.createElement('div');
            div.style.cssText = 'display: flex; flex-direction: column; gap: 4px; padding: 6px; background: rgba(77,225,255,0.08); border-radius: 6px;';
            const header = document.createElement('div');
            header.style.cssText = 'display:flex; align-items:center; gap:6px;';
            const label = document.createElement('span');
            label.style.cssText = 'flex:1; font-size: 11px;';
            label.textContent = `${link.id}: ${link.bidirectional ? '2-way' : '1-way'} → ${link.targetType === 'cell' ? 'cell' : 'teleporter'}`;
            header.appendChild(label);
            const unlinkBtn = document.createElement('button');
            unlinkBtn.textContent = '✕';
            unlinkBtn.style.cssText = 'padding: 2px 6px; background: rgba(255,77,109,0.2); border: 1px solid var(--danger); color: var(--danger); border-radius: 4px; font-size: 10px; cursor: pointer;';
            unlinkBtn.onclick = () => {
                const idx = linkRecords.findIndex(l => l.id === link.id);
                if (idx >= 0) linkRecords.splice(idx, 1);
                rebuildTeleporterIndex();
                updateTeleporterList();
                markDirty();
            };
            header.appendChild(unlinkBtn);
            div.appendChild(header);

            const detail = document.createElement('span');
            detail.style.cssText = 'font-size: 10px; color: var(--muted);';
            const dest = link.targetType === 'cell' ? `cell (${link.to.x},${link.to.y})` : `(${link.to.x},${link.to.y})`;
            detail.textContent = `from (${link.from.x},${link.from.y}) to ${dest}`;
            div.appendChild(detail);
            teleporterList.appendChild(div);
        });
    }

    // Featured Levels Data
    const FEATURED_LEVELS = [
        {
            id: 'teleport-challenge',
            name: 'Teleport Challenge!',
            author: 'Hoodie',
            description: 'A puzzle-filled maze with complex teleporter routes and multiple enemy types. Navigate through intricate grids while avoiding seekers, flying pigs, and mortars!',
            difficulty: 'Hard',
            data: {"version":1,"name":"Teleport Challenge!","author":"Hoodie","grid":[[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],[1,0,0,1,1,1,1,2,0,0,5,1,1,5,0,0,5,1,1,5,0,0,4,1,1,1,1,5,0,1],[1,0,0,1,1,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,1,1,0,0,1],[1,0,0,1,1,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,1,1,0,0,1],[1,0,0,1,1,1,1,5,0,0,5,1,1,5,0,0,5,1,1,5,0,0,5,1,1,1,1,0,0,1],[1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1],[1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1],[1,0,0,1,1,1,1,5,0,0,5,1,1,5,0,0,5,1,1,5,0,0,5,1,1,1,1,0,0,1],[1,11,11,1,1,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,1,1,0,0,1],[1,0,0,1,1,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,1,1,11,11,1],[1,0,0,1,1,1,1,5,0,0,5,1,1,5,0,0,5,1,1,5,0,0,5,1,1,1,1,0,0,1],[1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1],[1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1],[1,0,0,1,1,1,1,5,0,0,5,1,1,5,0,0,5,1,1,5,0,0,5,1,1,1,1,0,0,1],[1,13,0,1,1,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,1,1,0,13,1],[1,0,0,1,1,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,1,1,0,0,1],[1,0,0,1,1,1,1,5,0,0,5,1,1,5,0,0,5,1,1,5,0,0,5,1,1,1,1,0,0,1],[1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1],[1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1],[1,0,0,1,1,1,1,5,0,0,5,1,1,5,0,0,5,1,1,5,0,0,5,1,1,1,1,0,0,1],[1,0,0,1,1,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,1,1,0,0,1],[1,0,0,1,1,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,1,1,0,0,1],[1,0,0,1,1,1,1,4,0,0,5,1,1,5,0,0,5,1,1,5,0,0,5,1,1,1,1,0,0,1],[1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1],[1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1],[1,0,0,1,1,1,1,0,0,0,11,1,1,0,0,0,11,1,1,0,0,0,11,1,1,1,1,0,0,1],[1,0,0,1,1,1,1,5,0,0,5,1,1,5,0,0,5,1,1,5,0,0,5,1,1,1,1,0,0,1],[1,5,5,1,1,1,1,0,0,0,14,1,1,0,0,0,0,1,1,0,0,0,14,1,1,1,1,0,3,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]],"start":{"x":7,"y":1},"exit":{"x":28,"y":27},"generators":[{"x":22,"y":1},{"x":7,"y":22}],"telepads":[[{"x":10,"y":1},{"x":13,"y":1}],[{"x":16,"y":1},{"x":19,"y":1}],[{"x":27,"y":1},{"x":7,"y":4}],[{"x":10,"y":4},{"x":13,"y":4}],[{"x":16,"y":4},{"x":19,"y":4}],[{"x":22,"y":4},{"x":7,"y":7}],[{"x":10,"y":7},{"x":13,"y":7}],[{"x":16,"y":7},{"x":19,"y":7}],[{"x":22,"y":7},{"x":7,"y":10}],[{"x":10,"y":10},{"x":13,"y":10}],[{"x":16,"y":10},{"x":19,"y":10}],[{"x":22,"y":10},{"x":7,"y":13}],[{"x":10,"y":13},{"x":13,"y":13}],[{"x":16,"y":13},{"x":19,"y":13}],[{"x":22,"y":13},{"x":7,"y":16}],[{"x":10,"y":16},{"x":13,"y":16}],[{"x":16,"y":16},{"x":19,"y":16}],[{"x":22,"y":16},{"x":7,"y":19}],[{"x":10,"y":19},{"x":13,"y":19}],[{"x":16,"y":19},{"x":19,"y":19}],[{"x":22,"y":19},{"x":10,"y":22}],[{"x":13,"y":22},{"x":16,"y":22}],[{"x":19,"y":22},{"x":22,"y":22}],[{"x":7,"y":26},{"x":10,"y":26}],[{"x":13,"y":26},{"x":16,"y":26}],[{"x":19,"y":26},{"x":22,"y":26}],[{"x":1,"y":27},{"x":2,"y":27}]],"enemies":[{"x":1,"y":8,"type":"seeker"},{"x":2,"y":8,"type":"seeker"},{"x":27,"y":9,"type":"seeker"},{"x":28,"y":9,"type":"seeker"},{"x":1,"y":14,"type":"flying_pig"},{"x":28,"y":14,"type":"flying_pig"},{"x":10,"y":25,"type":"seeker"},{"x":16,"y":25,"type":"seeker"},{"x":22,"y":25,"type":"seeker"},{"x":10,"y":27,"type":"mortar"},{"x":22,"y":27,"type":"mortar"}],"teleporterLinksV2":[{"id":"L1","from":{"x":2,"y":27},"to":{"x":27,"y":1},"bidirectional":false,"targetType":"teleporter"},{"id":"L2","from":{"x":10,"y":1},"to":{"x":7,"y":26},"bidirectional":false,"targetType":"teleporter"},{"id":"L3","from":{"x":10,"y":26},"to":{"x":15,"y":26},"bidirectional":false,"targetType":"cell"},{"id":"L4","from":{"x":13,"y":26},"to":{"x":21,"y":14},"bidirectional":false,"targetType":"cell"},{"id":"L6","from":{"x":16,"y":26},"to":{"x":8,"y":14},"bidirectional":false,"targetType":"cell"},{"id":"L7","from":{"x":10,"y":4},"to":{"x":15,"y":8},"bidirectional":false,"targetType":"cell"},{"id":"L8","from":{"x":7,"y":4},"to":{"x":8,"y":8},"bidirectional":false,"targetType":"cell"},{"id":"L9","from":{"x":1,"y":27},"to":{"x":8,"y":2},"bidirectional":false,"targetType":"cell"},{"id":"L10","from":{"x":16,"y":4},"to":{"x":20,"y":2},"bidirectional":false,"targetType":"cell"},{"id":"L11","from":{"x":19,"y":4},"to":{"x":9,"y":2},"bidirectional":false,"targetType":"cell"},{"id":"L12","from":{"x":19,"y":1},"to":{"x":21,"y":9},"bidirectional":false,"targetType":"cell"},{"id":"L13","from":{"x":22,"y":4},"to":{"x":15,"y":20},"bidirectional":false,"targetType":"cell"},{"id":"L14","from":{"x":22,"y":19},"to":{"x":1,"y":1},"bidirectional":false,"targetType":"cell"},{"id":"L15","from":{"x":16,"y":1},"to":{"x":14,"y":14},"bidirectional":false,"targetType":"cell"},{"id":"L16","from":{"x":13,"y":13},"to":{"x":9,"y":20},"bidirectional":false,"targetType":"cell"},{"id":"L17","from":{"x":7,"y":19},"to":{"x":8,"y":2},"bidirectional":false,"targetType":"cell"},{"id":"L18","from":{"x":10,"y":19},"to":{"x":21,"y":20},"bidirectional":false,"targetType":"cell"},{"id":"L19","from":{"x":10,"y":22},"to":{"x":20,"y":14},"bidirectional":false,"targetType":"cell"},{"id":"L20","from":{"x":16,"y":13},"to":{"x":14,"y":9},"bidirectional":false,"targetType":"cell"},{"id":"L21","from":{"x":13,"y":16},"to":{"x":8,"y":14},"bidirectional":false,"targetType":"cell"},{"id":"L22","from":{"x":16,"y":16},"to":{"x":20,"y":14},"bidirectional":false,"targetType":"cell"},{"id":"L23","from":{"x":19,"y":19},"to":{"x":9,"y":2},"bidirectional":false,"targetType":"cell"},{"id":"L24","from":{"x":19,"y":22},"to":{"x":20,"y":25},"bidirectional":false,"targetType":"cell"},{"id":"L25","from":{"x":22,"y":26},"to":{"x":2,"y":1},"bidirectional":false,"targetType":"cell"},{"id":"L26","from":{"x":19,"y":26},"to":{"x":21,"y":3},"bidirectional":false,"targetType":"cell"},{"id":"L27","from":{"x":13,"y":4},"to":{"x":9,"y":8},"bidirectional":false,"targetType":"cell"},{"id":"L28","from":{"x":10,"y":7},"to":{"x":15,"y":8},"bidirectional":false,"targetType":"cell"},{"id":"L29","from":{"x":10,"y":10},"to":{"x":21,"y":15},"bidirectional":false,"targetType":"cell"},{"id":"L30","from":{"x":7,"y":10},"to":{"x":8,"y":21},"bidirectional":false,"targetType":"cell"},{"id":"L31","from":{"x":7,"y":7},"to":{"x":8,"y":26},"bidirectional":false,"targetType":"cell"},{"id":"L32","from":{"x":13,"y":7},"to":{"x":14,"y":4},"bidirectional":false,"targetType":"cell"},{"id":"L33","from":{"x":16,"y":7},"to":{"x":8,"y":2},"bidirectional":false,"targetType":"cell"},{"id":"L34","from":{"x":16,"y":10},"to":{"x":20,"y":21},"bidirectional":false,"targetType":"cell"},{"id":"L35","from":{"x":13,"y":10},"to":{"x":14,"y":21},"bidirectional":false,"targetType":"cell"},{"id":"L36","from":{"x":22,"y":22},"to":{"x":14,"y":25},"bidirectional":false,"targetType":"cell"},{"id":"L37","from":{"x":19,"y":7},"to":{"x":20,"y":4},"bidirectional":false,"targetType":"cell"},{"id":"L38","from":{"x":22,"y":10},"to":{"x":8,"y":21},"bidirectional":false,"targetType":"cell"},{"id":"L39","from":{"x":19,"y":10},"to":{"x":9,"y":3},"bidirectional":false,"targetType":"cell"},{"id":"L40","from":{"x":22,"y":7},"to":{"x":15,"y":21},"bidirectional":false,"targetType":"cell"},{"id":"L41","from":{"x":19,"y":13},"to":{"x":8,"y":9},"bidirectional":false,"targetType":"cell"},{"id":"L42","from":{"x":22,"y":13},"to":{"x":20,"y":26},"bidirectional":false,"targetType":"cell"},{"id":"L43","from":{"x":19,"y":16},"to":{"x":8,"y":13},"bidirectional":false,"targetType":"cell"},{"id":"L44","from":{"x":22,"y":16},"to":{"x":21,"y":19},"bidirectional":false,"targetType":"cell"},{"id":"L45","from":{"x":13,"y":19},"to":{"x":9,"y":14},"bidirectional":false,"targetType":"cell"},{"id":"L46","from":{"x":13,"y":22},"to":{"x":9,"y":25},"bidirectional":false,"targetType":"cell"},{"id":"L47","from":{"x":16,"y":19},"to":{"x":20,"y":15},"bidirectional":false,"targetType":"cell"},{"id":"L48","from":{"x":16,"y":22},"to":{"x":20,"y":26},"bidirectional":false,"targetType":"cell"},{"id":"L49","from":{"x":7,"y":13},"to":{"x":9,"y":2},"bidirectional":false,"targetType":"cell"},{"id":"L50","from":{"x":10,"y":13},"to":{"x":14,"y":2},"bidirectional":false,"targetType":"cell"},{"id":"L51","from":{"x":10,"y":16},"to":{"x":21,"y":2},"bidirectional":false,"targetType":"cell"},{"id":"L52","from":{"x":7,"y":16},"to":{"x":15,"y":15},"bidirectional":false,"targetType":"cell"},{"id":"L53","from":{"x":13,"y":1},"to":{"x":21,"y":21},"bidirectional":false,"targetType":"cell"}],"enemyBarriers":[{"id":"B6","enemy":{"x":1,"y":8,"type":"seeker"},"rect":{"x":1,"y":1,"w":1,"h":27}},{"id":"B7","enemy":{"x":2,"y":8,"type":"seeker"},"rect":{"x":2,"y":1,"w":1,"h":27}},{"id":"B8","enemy":{"x":27,"y":9,"type":"seeker"},"rect":{"x":27,"y":9,"w":1,"h":1}},{"id":"B9","enemy":{"x":27,"y":9,"type":"seeker"},"rect":{"x":27,"y":1,"w":1,"h":27}},{"id":"B10","enemy":{"x":28,"y":9,"type":"seeker"},"rect":{"x":28,"y":1,"w":1,"h":27}},{"id":"B1","enemy":{"x":1,"y":14,"type":"flying_pig"},"rect":{"x":1,"y":10,"w":1,"h":9}},{"id":"B2","enemy":{"x":28,"y":14,"type":"flying_pig"},"rect":{"x":28,"y":10,"w":1,"h":9}},{"id":"B1","enemy":{"x":10,"y":27,"type":"mortar"},"rect":{"x":10,"y":27,"w":1,"h":1}},{"id":"B2","enemy":{"x":22,"y":27,"type":"mortar"},"rect":{"x":22,"y":27,"w":1,"h":1}}]}
        }
    ];

    function showFeaturedLevelsDialog() {
        const backdrop = document.createElement('div');
        backdrop.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;';
        const dialog = document.createElement('div');
        dialog.style.cssText = 'background: rgba(10, 10, 20, 0.95); border: 2px solid #cdb4ff; border-radius: 12px; padding: 20px; max-width: 600px; max-height: 80vh; overflow-y: auto; box-shadow: 0 0 30px rgba(205, 180, 255, 0.3);';
        const title = document.createElement('h2');
        title.style.cssText = 'color: #cdb4ff; margin: 0 0 16px 0; font-size: 1.4rem;';
        title.textContent = '⭐ Featured Levels';
        dialog.appendChild(title);
        FEATURED_LEVELS.forEach(level => {
            const card = document.createElement('div');
            card.style.cssText = 'background: rgba(205, 180, 255, 0.08); border: 1px solid rgba(205, 180, 255, 0.3); border-radius: 8px; padding: 12px; margin-bottom: 12px;';
            const nameAuthor = document.createElement('div');
            nameAuthor.style.cssText = 'display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;';
            const name = document.createElement('span');
            name.style.cssText = 'font-size: 1.1rem; font-weight: bold; color: #fff;';
            name.textContent = level.name;
            const author = document.createElement('span');
            author.style.cssText = 'font-size: 0.85rem; color: #aaa;';
            author.textContent = `by ${level.author}`;
            nameAuthor.appendChild(name);
            nameAuthor.appendChild(author);
            card.appendChild(nameAuthor);
            const desc = document.createElement('p');
            desc.style.cssText = 'margin: 6px 0; font-size: 0.9rem; color: #bbb; line-height: 1.4;';
            desc.textContent = level.description;
            card.appendChild(desc);
            const difficulty = document.createElement('div');
            difficulty.style.cssText = 'font-size: 0.85rem; color: #f0a;';
            difficulty.textContent = `Difficulty: ${level.difficulty}`;
            card.appendChild(difficulty);
            const loadBtn = document.createElement('button');
            loadBtn.style.cssText = 'margin-top: 10px; padding: 6px 12px; background: rgba(205, 180, 255, 0.3); border: 1px solid #cdb4ff; color: #cdb4ff; border-radius: 6px; cursor: pointer; font-weight: bold;';
            loadBtn.textContent = 'Load Level';
            loadBtn.onclick = () => {
                if (dirty && !confirm('Loading will replace current layout. Continue?')) return;
                importJson(JSON.stringify(level.data));
                backdrop.remove();
                showToast(`Loaded: ${level.name}`);
            };
            card.appendChild(loadBtn);
            dialog.appendChild(card);
        });
        const closeBtn = document.createElement('button');
        closeBtn.style.cssText = 'width: 100%; margin-top: 12px; padding: 10px; background: rgba(255, 77, 109, 0.2); border: 1px solid rgba(255, 77, 109, 0.5); color: #ff4d6d; border-radius: 6px; cursor: pointer; font-weight: bold;';
        closeBtn.textContent = 'Close';
        closeBtn.onclick = () => backdrop.remove();
        dialog.appendChild(closeBtn);
        backdrop.appendChild(dialog);
        document.body.appendChild(backdrop);
    }

    function handleCanvasClickLinkMode(e) {
        const { x, y } = cellFromEvent(e);
        const key = `${x},${y}`;
        if (pendingLink === null) {
            if (grid[y][x] !== Tiles.TELEPORT) {
                showToast('Select a teleporter first');
                return;
            }
            pendingLink = { x, y };
            showToast(`Start set at (${x},${y}). Pick destination.`);
            return;
        }

        // Destination handling
        if (linkTarget === 'teleporter') {
            if (grid[y][x] !== Tiles.TELEPORT) {
                showToast('Destination must be a teleporter');
                return;
            }
            addLinkRecord({ ...pendingLink }, { x, y }, linkDirection === 'two-way', 'teleporter');
            pendingLink = null;
            showToast(linkDirection === 'two-way' ? 'Teleporters linked (2-way)!' : 'Teleporter linked (1-way)!');
        } else {
            // target cell
            addLinkRecord({ ...pendingLink }, { x, y }, false, 'cell');
            pendingLink = null;
            showToast('Teleporter linked to map spot');
        }
    }

    function init() {
        renderPalette();
        setTool('paint');
        redraw();
        restoreDraft();
        canvasListeners();
        exportBtn.addEventListener('click', exportJson);
        importBtn.addEventListener('click', () => {
            if (dirty && !confirm('Importing will replace the current layout. Continue?')) return;
            const text = prompt('Paste level JSON');
            if (text) importJson(text);
        });
        copyBtn.addEventListener('click', copyShare);
        loadJsonBtn.addEventListener('click', () => {
            if (dirty && !confirm('Loading will replace the current layout. Continue?')) return;
            importJson(shareText.value);
        });
        backupBtn.addEventListener('click', () => {
            const payload = buildDraftPayload(gridToData());
            const text = JSON.stringify(payload);
            shareText.value = text;
            try { navigator.clipboard.writeText(text); showToast('Backup copied'); }
            catch { showToast('Backup ready in text box'); }
        });
        playTestBtn.addEventListener('click', playtest);
        resetBtn.addEventListener('click', resetBoard);
        sizeSlider.addEventListener('input', updateSizeFromSlider);
        sizeInput.addEventListener('change', updateSizeFromInput);
        dirTwoWayBtn.addEventListener('click', () => {
            linkDirection = 'two-way';
            syncLinkControls();
        });
        dirOneWayBtn.addEventListener('click', () => {
            linkDirection = 'one-way';
            syncLinkControls();
        });
        targetTeleporterBtn.addEventListener('click', () => {
            linkTarget = 'teleporter';
            syncLinkControls();
        });
        targetCellBtn.addEventListener('click', () => {
            linkTarget = 'cell';
            syncLinkControls();
        });
        linkTeleportersBtn.addEventListener('click', () => {
            linkMode = !linkMode;
            pendingLink = null;
            linkTeleportersBtn.style.background = linkMode ? 'rgba(77,225,255,0.3)' : 'rgba(77,225,255,0.14)';
            linkTeleportersBtn.style.borderColor = linkMode ? 'var(--accent)' : 'var(--grid-line)';
            showToast(linkMode ? 'Link mode ON - Click teleporters to pair' : 'Link mode OFF');
        });
        toggleLinkLinesBtn.addEventListener('click', () => {
            showLinkLines = !showLinkLines;
            syncLinkControls();
            redraw();
        });
        // Barrier controls
        barrierModeBtn.addEventListener('click', () => {
            barrierMode = !barrierMode;
            if (barrierMode) { linkMode = false; }
            barrierStage = 'pick';
            pickEnemyBtn.disabled = !barrierMode;
            barrierModeBtn.style.background = barrierMode ? 'rgba(205,180,255,0.3)' : 'rgba(205,180,255,0.18)';
            showToast(barrierMode ? 'Barrier mode ON: pick an enemy' : 'Barrier mode OFF');
        });
        pickEnemyBtn.addEventListener('click', () => {
            barrierStage = 'pick';
            showToast('Click an enemy spawn to select');
        });
        toggleBarriersBtn.addEventListener('click', () => {
            showBarriers = !showBarriers;
            toggleBarriersBtn.textContent = showBarriers ? 'Hide Barriers' : 'Show Barriers';
            redraw();
        });
        featuredBtn.addEventListener('click', showFeaturedLevelsDialog);
        backBtn.addEventListener('click', () => {
            if (dirty && !confirm('Leave builder? Unsaved changes will be kept in draft but playtest/export to be safe.')) return;
            window.location.href = 'index.html';
        });
        window.addEventListener('beforeunload', (e) => {
            if (!dirty) return;
            e.preventDefault();
            e.returnValue = '';
        });

        // keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                selectionRect = null; selectionStart = null; selectionCurrent = null; pasteHover = null;
                if (toolMode === 'paste') setTool('paint');
                redraw();
                return;
            }
            if (e.ctrlKey || e.metaKey) {
                if (e.key.toLowerCase() === 'c') {
                    if (selectionRect) { clipboard = extractSelection(selectionRect); showToast('Copied selection'); }
                    e.preventDefault();
                } else if (e.key.toLowerCase() === 'x') {
                    if (selectionRect) { clipboard = extractSelection(selectionRect); clearSelectionArea(selectionRect); redraw(); markDirty(); showToast('Cut selection'); }
                    e.preventDefault();
                } else if (e.key.toLowerCase() === 'v') {
                    if (clipboard) { setTool('paste'); showToast('Paste: click to place'); }
                    e.preventDefault();
                }
            }
        });

        // initial visual sync
        syncLinkControls();
    }

    init();
})();
