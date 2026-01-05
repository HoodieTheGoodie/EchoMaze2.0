// Level Builder for Echo Maze
// Provides a 30x30 tile editor that exports/imports custom levels compatible with game state
(() => {
    const SIZE = 30;
    const TILE = 30; // pixel size per cell in canvas

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
    const featuredBtn = document.getElementById('featuredBtn');
    const backBtn = document.getElementById('backBtn');

    const DRAFT_KEY = 'builderDraft';

    let activeTile = Tiles.WALL;
    let isMouseDown = false;
    const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(Tiles.EMPTY));
    let dirty = false;

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
            div.textContent = item.label;
            div.addEventListener('click', () => {
                activeTile = item.id;
                renderPalette();
            });
            paletteEl.appendChild(div);
        });
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
        ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
    }

    function redraw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let y = 0; y < SIZE; y++) {
            for (let x = 0; x < SIZE; x++) {
                drawCell(x, y, grid[y][x]);
            }
        }
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
        const { x, y } = cellFromEvent(e);
        if (e.button === 2) {
            setCell(x, y, Tiles.EMPTY);
            return;
        }
        setCell(x, y, activeTile);
    }

    function canvasListeners() {
        canvas.addEventListener('mousedown', e => {
            isMouseDown = true;
            handlePaint(e);
        });
        canvas.addEventListener('mousemove', e => {
            if (isMouseDown) handlePaint(e);
        });
        window.addEventListener('mouseup', () => { isMouseDown = false; });
        canvas.addEventListener('contextmenu', e => e.preventDefault());
        canvas.addEventListener('touchstart', e => {
            e.preventDefault();
            const touch = e.touches[0];
            handlePaint({ clientX: touch.clientX, clientY: touch.clientY, button: 0 });
        }, { passive: false });
        canvas.addEventListener('touchmove', e => {
            e.preventDefault();
            const touch = e.touches[0];
            handlePaint({ clientX: touch.clientX, clientY: touch.clientY, button: 0 });
        }, { passive: false });
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
        if (data.tele.length % 2 !== 0) return 'Teleporters must be in pairs.';
        if (data.tele.length > 4) return 'Max 2 teleporter pairs (4 pads).';
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
        saveDraft(gridToData());
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
        };
    }

    function init() {
        renderPalette();
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
        playTestBtn.addEventListener('click', playtest);
        featuredBtn.addEventListener('click', () => {
            showToast('Featured Levels coming soon.');
        });
        backBtn.addEventListener('click', () => {
            if (dirty && !confirm('Leave builder? Unsaved changes will be kept in draft but playtest/export to be safe.')) return;
            window.location.href = 'index.html';
        });
        window.addEventListener('beforeunload', (e) => {
            if (!dirty) return;
            e.preventDefault();
            e.returnValue = '';
        });
    }

    init();
})();
