#!/bin/bash
# Package Echo Maze for distribution to game portals

echo "🎮 Packaging Echo Maze for distribution..."

# Create dist directory
mkdir -p dist
cd dist

# Create package directory
rm -rf echo-maze
mkdir -p echo-maze

echo "📦 Copying game files..."

# Copy index.html
cp ../index.html echo-maze/

# Copy entire game directory
cp -r ../game echo-maze/

# Copy favicon
cp ../favicon.png echo-maze/ 2>/dev/null || echo "⚠️  favicon.png not found (optional)"
cp ../favicon.svg echo-maze/ 2>/dev/null || echo "⚠️  favicon.svg not found (optional)"

# Copy LICENSE
cp ../LICENSE echo-maze/ 2>/dev/null || echo "⚠️  LICENSE not found (optional)"

# Create README.txt for distributors
cat > echo-maze/README.txt << 'EOF'
ECHO MAZE
=========

A fast-paced puzzle maze game with abilities, enemies, and multiple game modes.

HOW TO RUN:
----------
1. Open index.html in a web browser
   OR
2. Serve via HTTP server (recommended):
   - Python 3: python -m http.server 8000
   - Node.js: npx http-server
   - Any static file server

3. Navigate to http://localhost:8000 in your browser

CONTROLS:
---------
Desktop:
- Arrow Keys or WASD: Move
- Space: Shield ability
- Shift (hold): Dash ability
- Escape: Pause menu

Mobile:
- Touch joystick for movement
- Touch buttons for abilities

FEATURES:
---------
- 11 story mode levels
- Endless procedural mode
- Full level builder/editor
- Achievement system
- Skin customization
- Boss battles
- Mobile + desktop support

TECHNICAL INFO:
---------------
- Platform: HTML5 (pure JavaScript, no dependencies)
- Resolution: 800x600px (responsive)
- File size: ~500KB
- Offline-capable: Yes (all assets included)
- Save system: localStorage only (no server required)
- Browser compatibility: All modern browsers

LICENSE:
--------
See LICENSE file for details.

CREDITS:
--------
Developed by HoodieTheGoodie
Website: https://echomaze2.me

For support or questions, see the included documentation.
EOF

# Create package info JSON for platforms
cat > echo-maze/game-info.json << 'EOF'
{
  "title": "Echo Maze",
  "version": "1.0.0",
  "description": "Navigate deadly mazes using Shield and Dash abilities. Race against time through 11 levels, endless mode, and custom level builder!",
  "genre": ["puzzle", "action", "skill"],
  "tags": ["maze", "speedrun", "timer", "dash", "shield", "enemies", "level-editor", "achievements", "endless-mode"],
  "platform": "html5",
  "technology": "javascript",
  "entryPoint": "index.html",
  "resolution": {
    "width": 800,
    "height": 600,
    "responsive": true
  },
  "controls": {
    "desktop": ["keyboard", "mouse"],
    "mobile": ["touch"]
  },
  "orientation": "landscape",
  "rating": "everyone",
  "features": [
    "11 story levels",
    "Endless procedural mode",
    "Level builder/editor",
    "Achievement system",
    "Skin customization",
    "Boss battles",
    "Save system",
    "Mobile support",
    "Speedrun timer"
  ],
  "fileSize": "~500KB",
  "offlineCapable": true,
  "externalDependencies": false
}
EOF

echo "🗜️  Creating ZIP archive..."

# Create timestamped ZIP
TIMESTAMP=$(date +%Y%m%d)
ZIP_NAME="echo-maze-v1.0-${TIMESTAMP}.zip"

# Remove old ZIPs
rm -f echo-maze-*.zip

# Create ZIP (cross-platform compatible)
if command -v zip &> /dev/null; then
    zip -r "$ZIP_NAME" echo-maze/ -x "*.DS_Store" -x "*__MACOSX*"
    echo "✅ Created: dist/$ZIP_NAME"
else
    echo "⚠️  'zip' command not found. Install zip or create archive manually."
    echo "   Package directory: dist/echo-maze/"
fi

# Calculate size
if [ -f "$ZIP_NAME" ]; then
    SIZE=$(du -h "$ZIP_NAME" | cut -f1)
    echo "📊 Package size: $SIZE"
fi

echo ""
echo "✨ Packaging complete!"
echo ""
echo "📦 Package contents:"
echo "   - index.html (entry point)"
echo "   - game/ (all game files)"
echo "   - README.txt (instructions)"
echo "   - game-info.json (metadata)"
echo ""
echo "🚀 Ready to submit to:"
echo "   - CrazyGames: https://developer.crazygames.com/"
echo "   - Poki: https://developers.poki.com/"
echo "   - Itch.io: https://itch.io/"
echo "   - Coolmath Games: https://www.coolmathgames.com/submit-a-game"
echo ""
echo "📖 See PUBLISHING_GUIDE.md for detailed submission instructions"
