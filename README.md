# Maze Game (Canvas)

This repository now contains a standalone HTML5 Canvas game (no React / Vite).

The game lives under `game/` and can be opened directly in a browser via a simple static server. A root `index.html` redirects to `game/index.html` for convenience.

## Run locally

Use any static file server. For example, with Python installed:

```bash
cd /workspaces/codespaces-react
python3 -m http.server 8080
# then open http://localhost:8080/game/index.html
```

Alternatively, if your environment exposes `$BROWSER`:

```bash
$BROWSER http://localhost:8080/game/index.html
```

## Controls

- Arrow keys: move
- Shift: sprint through walls (drains stamina, 15s cooldown)
- Space then Arrow (within 2s): jump two tiles (triggers stamina cooldown)
- E next to yellow generator: start repair (complete 3 total)
- R: restart after win/lose
- Esc: cancel generator repair

## Project structure

- `game/index.html` — Canvas surface, UI elements, and overlay markup
- `game/js/maze.js` — Maze generation and generator placement
- `game/js/state.js` — Game state and rules (movement, stamina, jump, generators)
- `game/js/input.js` — Input handling, sprint, jump timing, and generator interactions
- `game/js/renderer.js` — Canvas rendering and UI updates
- `index.html` — Simple redirect to `/game/index.html`

## Notes

- All React/Vite code was removed to avoid conflicts. If you need the previous React version, recover it from version control history.
- The Canvas version is self-contained and does not require a build step.
