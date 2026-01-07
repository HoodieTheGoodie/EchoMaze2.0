#!/bin/bash
# Pre-launch testing script for Echo Maze
# Run this before submitting to catch critical issues

echo "🧪 Echo Maze Pre-Launch Test Suite"
echo "=================================="
echo ""

# Check if game files exist
echo "📁 Checking file structure..."

REQUIRED_FILES=(
    "index.html"
    "game/index.html"
    "game/level-builder.html"
    "game/help.html"
    "game/endless-menu.html"
    "game/js/main.js"
    "game/js/state.js"
    "game/js/renderer.js"
)

MISSING=0
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing: $file"
        MISSING=$((MISSING + 1))
    else
        echo "✅ Found: $file"
    fi
done

if [ $MISSING -eq 0 ]; then
    echo "✅ All required files present!"
else
    echo "⚠️  $MISSING files missing!"
fi

echo ""
echo "📦 Checking distribution package..."
if [ -d "dist" ] && [ -f "dist/echo-maze-v1.0-"*.zip ]; then
    ZIP_FILE=$(ls dist/echo-maze-v1.0-*.zip | head -n 1)
    SIZE=$(du -h "$ZIP_FILE" | cut -f1)
    echo "✅ Package found: $ZIP_FILE ($SIZE)"
else
    echo "⚠️  No package found. Run ./package-game.sh"
fi

echo ""
echo "🔍 Checking for common issues..."

# Check for console.log statements (optional cleanup)
LOG_COUNT=$(grep -r "console.log" game/js/*.js 2>/dev/null | wc -l)
if [ $LOG_COUNT -gt 0 ]; then
    echo "ℹ️  Found $LOG_COUNT console.log statements (optional to remove)"
else
    echo "✅ No console.log statements"
fi

# Check for debugger statements
DEBUGGER_COUNT=$(grep -r "debugger" game/js/*.js 2>/dev/null | wc -l)
if [ $DEBUGGER_COUNT -gt 0 ]; then
    echo "⚠️  Found $DEBUGGER_COUNT debugger statements - remove before publishing!"
else
    echo "✅ No debugger statements"
fi

# Check file sizes
echo ""
echo "📊 File size analysis..."
TOTAL_SIZE=$(du -sh game/ | cut -f1)
echo "   Total game size: $TOTAL_SIZE"

LARGE_FILES=$(find game/ -type f -size +500k 2>/dev/null)
if [ -n "$LARGE_FILES" ]; then
    echo "⚠️  Large files found (>500KB):"
    echo "$LARGE_FILES" | while read file; do
        SIZE=$(du -h "$file" | cut -f1)
        echo "   - $file ($SIZE)"
    done
else
    echo "✅ No unusually large files"
fi

echo ""
echo "🎮 Manual testing required:"
echo "   [ ] Open game/index.html in browser"
echo "   [ ] Complete Level 1"
echo "   [ ] Test Level 11 boss"
echo "   [ ] Try Endless Mode"
echo "   [ ] Use Level Builder"
echo "   [ ] Test on mobile device"
echo "   [ ] Check achievements"
echo "   [ ] Test skins panel"
echo ""

echo "📸 Screenshots checklist:"
echo "   [ ] Main menu"
echo "   [ ] Level 1 gameplay"
echo "   [ ] Action scene with enemies"
echo "   [ ] Boss battle"
echo "   [ ] Level builder"
echo "   [ ] Endless mode"
echo "   [ ] Achievements panel"
echo ""

echo "📝 Submission prep:"
echo "   [ ] Description ready (see MARKETING_MATERIALS.md)"
echo "   [ ] Controls documented"
echo "   [ ] Tags selected"
echo "   [ ] Platform account created"
echo ""

echo "✨ Pre-launch check complete!"
echo ""
echo "Next steps:"
echo "1. Complete manual testing above"
echo "2. Take screenshots"
echo "3. Choose platform (see QUICK_START_PUBLISHING.md)"
echo "4. Submit!"
echo ""
echo "Good luck! 🚀"
