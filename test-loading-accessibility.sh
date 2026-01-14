#!/bin/bash
# Quick test script to verify loading screen and accessibility features

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "========================================="
echo "🧪 Testing Loading & Accessibility Features"
echo "========================================="
echo ""

# Check if files exist
echo "📁 Checking file existence..."
files=(
    "$ROOT_DIR/game/js/loading-screen.js"
    "$ROOT_DIR/game/js/accessibility.js"
    "$ROOT_DIR/game/index.html"
    "$ROOT_DIR/game/js/main.js"
    "$ROOT_DIR/game/js/theme-manager.js"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ ${file/#$ROOT_DIR\//}"
    else
        echo "  ❌ ${file/#$ROOT_DIR\//} (MISSING)"
    fi
done

echo ""
echo "🔍 Checking JavaScript imports..."
if grep -q "loading-screen.js" "$ROOT_DIR/game/index.html"; then
    echo "  ✅ loading-screen.js imported"
else
    echo "  ❌ loading-screen.js NOT imported"
fi

if grep -q "accessibility.js" "$ROOT_DIR/game/index.html"; then
    echo "  ✅ accessibility.js imported"
else
    echo "  ❌ accessibility.js NOT imported"
fi

echo ""
echo "🎮 Checking HTML elements..."
if grep -q 'id="loadingScreen"' "$ROOT_DIR/game/index.html"; then
    echo "  ✅ Loading overlay present"
else
    echo "  ❌ Loading overlay MISSING"
fi

if grep -q 'id="reducedMotionChk"' "$ROOT_DIR/game/index.html"; then
    echo "  ✅ Reduce Motion checkbox present"
else
    echo "  ❌ Reduce Motion checkbox MISSING"
fi

if grep -q 'id="highContrastChk"' "$ROOT_DIR/game/index.html"; then
    echo "  ✅ High Contrast checkbox present"
else
    echo "  ❌ High Contrast checkbox MISSING"
fi

if grep -q 'id="colorblindModeSelect"' "$ROOT_DIR/game/index.html"; then
    echo "  ✅ Colorblind Mode dropdown present"
else
    echo "  ❌ Colorblind Mode dropdown MISSING"
fi

echo ""
echo "🔧 Checking event handlers..."
if grep -q "reducedMotionChk.addEventListener" "$ROOT_DIR/game/js/main.js"; then
    echo "  ✅ Reduce Motion handler present"
else
    echo "  ❌ Reduce Motion handler MISSING"
fi

if grep -q "window.LOADING.show" "$ROOT_DIR/game/js/main.js"; then
    echo "  ✅ Loading screen integration present"
else
    echo "  ❌ Loading screen integration MISSING"
fi

if grep -q "window.ACCESSIBILITY.get" "$ROOT_DIR/game/js/theme-manager.js"; then
    echo "  ✅ Accessibility integration in themes"
else
    echo "  ❌ Accessibility integration in themes MISSING"
fi

echo ""
echo "✅ Testing complete! Check for any ❌ marks above."
echo ""
echo "📝 To test in browser:"
echo "  1. Open game/index.html in a browser"
echo "  2. Try starting a level - loading screen should appear"
echo "  3. Open Settings and check Accessibility section"
echo "  4. Enable 'Reduce Motion' and verify particles stop"
echo "  5. Try different colorblind modes"
echo "  6. Test text size buttons"
echo ""
