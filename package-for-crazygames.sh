#!/bin/bash
# Build a CrazyGames-ready folder (no archives required by CG upload)
# Output: crazygames-build/ (flattened, playable)

set -e

BUILD_DIR="crazygames-build"
ZIP_NAME="EchoMaze2.0-crazygames.zip"

echo "Preparing CrazyGames build..."

# Clean previous build
rm -rf "$BUILD_DIR" "$ZIP_NAME"
mkdir -p "$BUILD_DIR"

# Copy core game files (flattened structure)
cp game/index.html "$BUILD_DIR/index.html"
cp -r game/css "$BUILD_DIR/"
cp -r game/js "$BUILD_DIR/"
cp -r game/assets "$BUILD_DIR/"
cp game/favicon.* "$BUILD_DIR/" 2>/dev/null || true
cp game/*.html "$BUILD_DIR/" 2>/dev/null || true

# Remove dev tools from build
rm -f "$BUILD_DIR/js/dev-tools.js" "$BUILD_DIR/js/dev-tools-backup.js" 2>/dev/null || true

# Optional: include a short readme for CG team
cat > "$BUILD_DIR/CRAZYGAMES_README.txt" <<'EOF'
Echo Maze 2.0 - CrazyGames Upload
---------------------------------
- HTML5 game, no external links
- index.html is the main entry (no redirects)
- All assets are local (css/js/assets)
- Works offline; no analytics or tracking
EOF

# Also produce a ZIP for convenience (even if CG prefers folder)
( cd "$BUILD_DIR" && zip -r "../$ZIP_NAME" . -x "*.DS_Store" >/dev/null )

echo "Build ready in: $BUILD_DIR/"
[ -f "$ZIP_NAME" ] && echo "Optional ZIP: $ZIP_NAME"
