#!/bin/bash

# Script to generate PNG icons from SVG source
# Requires ImageMagick (magick command)

echo "Generating PNG icons from icon.svg..."

# Check if ImageMagick is installed
if ! command -v magick &> /dev/null; then
    echo "Error: ImageMagick not found. Please install ImageMagick first."
    echo "  macOS: brew install imagemagick"
    echo "  Ubuntu: sudo apt install imagemagick"
    exit 1
fi

# Check if source SVG files exist
if [ ! -f "icon.svg" ]; then
    echo "Error: icon.svg not found in current directory"
    exit 1
fi

if [ ! -f "icon-disabled.svg" ]; then
    echo "Error: icon-disabled.svg not found in current directory"
    exit 1
fi

# Create icons directory if it doesn't exist
mkdir -p icons

# Generate PNG icons at different sizes for enabled state
echo "Generating enabled state icons..."
echo "Generating 16x16 icon..."
magick icon.svg -resize 16x16 icons/icon16.png

echo "Generating 48x48 icon..."
magick icon.svg -resize 48x48 icons/icon48.png

echo "Generating 128x128 icon..."
magick icon.svg -resize 128x128 icons/icon128.png

# Generate PNG icons at different sizes for disabled state
echo "Generating disabled state icons..."
echo "Generating 16x16 disabled icon..."
magick icon-disabled.svg -resize 16x16 icons/icon16-disabled.png

echo "Generating 48x48 disabled icon..."
magick icon-disabled.svg -resize 48x48 icons/icon48-disabled.png

echo "Generating 128x128 disabled icon..."
magick icon-disabled.svg -resize 128x128 icons/icon128-disabled.png

echo "✅ Icons generated successfully!"
echo "Files created:"
echo "  Enabled state:"
echo "    - icons/icon16.png"
echo "    - icons/icon48.png" 
echo "    - icons/icon128.png"
echo "  Disabled state:"
echo "    - icons/icon16-disabled.png"
echo "    - icons/icon48-disabled.png" 
echo "    - icons/icon128-disabled.png"