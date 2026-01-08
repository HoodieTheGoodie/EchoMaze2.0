#!/bin/bash

# Script to create a downloadable ZIP package for itch.io
# This creates a clean, playable package without development files

echo "Creating Echo Maze 2.0 package for itch.io..."

# Define the output filename
OUTPUT_FILE="EchoMaze2.0-itch.io.zip"

# Remove old package if it exists
if [ -f "$OUTPUT_FILE" ]; then
    echo "Removing old package..."
    rm "$OUTPUT_FILE"
fi

# Create the ZIP file with only necessary game files
echo "Packaging game files..."

zip -r "$OUTPUT_FILE" \
    index.html \
    ITCH_IO_README.txt \
    game/ \
    -x "*.git*" \
    -x "*node_modules*" \
    -x "*.DS_Store" \
    -x "*Later/*" \
    -x "*/dev-tools*.js" \
    -x "notes.txt" \
    -x "CNAME" \
    -x "LICENSE"

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
    echo "Instructions:"
    echo "1. Go to your itch.io dashboard"
    echo "2. Create a new project or edit existing"
    echo "3. Set 'Kind of project' to 'HTML'"
    echo "4. Upload this ZIP file"
    echo "5. Check 'This file will be played in the browser'"
    echo "6. Set index.html as the entry point"
    echo ""
    echo "For downloadable version:"
    echo "- Upload the same ZIP"
    echo "- Players can extract and play offline"
else
    echo "✗ Error creating package"
    exit 1
fi
