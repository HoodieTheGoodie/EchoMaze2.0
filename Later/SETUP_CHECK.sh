#!/bin/bash
echo "=== ECHOMAZE 2.0 OFFLINE SETUP VERIFICATION ==="
echo ""

# Check critical files
files=(
  "index.html"
  "game/index.html"
  "game/favicon.svg"
  "game/favicon.png"
  "game/css/mobile-ui.css"
  "game/js/main.js"
  "game/js/state.js"
  "game/assets/cover.svg"
)

echo "✓ Checking critical files..."
missing=0
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ MISSING: $file"
    ((missing++))
  fi
done

echo ""
if [ $missing -eq 0 ]; then
  echo "✅ ALL FILES PRESENT - Game is ready to play offline!"
  echo ""
  echo "To play:"
  echo "  1. Open index.html in any web browser"
  echo "  2. Game will load completely offline"
  echo "  3. Progress is saved locally to your browser"
else
  echo "❌ $missing file(s) missing - game may not work correctly"
fi

echo ""
echo "File counts:"
echo "  JS modules: $(find game/js -name "*.js" | wc -l) files"
echo "  CSS files: $(find game/css -name "*.css" | wc -l) files"
echo "  Assets: $(find game/assets -type f | wc -l) files"
