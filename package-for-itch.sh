#!/bin/bash

# Script to create a browser-playable ZIP package for itch.io
# This flattens the structure so index.html is at root with all assets

echo "Creating Echo Maze 2.0 package for itch.io..."

# Define the output filename
OUTPUT_FILE="EchoMaze2.0-itch.io.zip"

# Remove old package if it exists
if [ -f "$OUTPUT_FILE" ]; then
    echo "Removing old package..."
    rm "$OUTPUT_FILE"
fi

# Create temporary directory for packaging
TEMP_DIR="itch_io_build"
if [ -d "$TEMP_DIR" ]; then
    rm -rf "$TEMP_DIR"
fi
mkdir -p "$TEMP_DIR"

echo "Copying game files to temporary build directory..."

# Copy the actual game index.html to root (not the redirect one)
cp game/index.html "$TEMP_DIR/index.html"

# Copy all other files from game directory
cp -r game/css "$TEMP_DIR/"
cp -r game/js "$TEMP_DIR/"
cp -r game/assets "$TEMP_DIR/"
cp game/favicon.* "$TEMP_DIR/" 2>/dev/null || true
cp game/*.html "$TEMP_DIR/" 2>/dev/null || true

# Copy README
cp ITCH_IO_README.txt "$TEMP_DIR/"

# Remove dev tools
rm -f "$TEMP_DIR/js/dev-tools.js" "$TEMP_DIR/js/dev-tools-backup.js"

echo "Creating ZIP file..."

# Create the ZIP from the temp directory
cd "$TEMP_DIR"
zip -r "../$OUTPUT_FILE" ./* -x "*.git*" -x "*.DS_Store"
cd ..

# Clean up temp directory
rm -rf "$TEMP_DIR"

# Check if successful
if [ -f "$OUTPUT_FILE" ]; then
    echo ""
    echo "✓ Package created successfully: $OUTPUT_FILE"
    echo ""
    echo "File size:"
    ls -lh "$OUTPUT_FILE" | awk '{print $5}'
    echo ""
    echo "This ZIP file is ready to upload to itch.io!"
    echo ""
    echo "IMPORTANT UPLOAD INSTRUCTIONS:"
    echo "================================"
    echo "1. Go to your itch.io dashboard"
    echo "2. Create a new project or edit existing"
    echo "3. Set 'Kind of project' to 'HTML'"
    echo "4. Upload this ZIP file"
    echo "5. Check 'This file will be played in the browser'"
    echo "6. Set 'index.html' as the entry point"
    echo "7. Set viewport: 800x800 or larger"
    echo ""
    echo "The game will now load properly in itch.io's iframe!"
else
    echo "✗ Error creating package"
    exit 1
fi
