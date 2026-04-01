#!/bin/bash
# publish-favicon.sh - Create and publish favicon from SVG
#
# Takes the dev-templates logo SVG and creates a multi-size favicon.ico.
# Adapted from UIS (helpers-no/urbalurba-infrastructure).
#
# IMPORTANT: Run this script inside the devcontainer where ImageMagick
# and rsvg-convert are available.
#
# Usage:
#   ./publish-favicon.sh [source.svg]
#
# Output:
#   ../favicon.ico - Multi-size favicon (16x16, 32x32, 48x48)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE="${1:-$SCRIPT_DIR/dev-templates-logo.svg}"
DEST_DIR="$(dirname "$SCRIPT_DIR")"

if [[ ! -f "$SOURCE" ]]; then
    echo "Error: Source file not found: $SOURCE"
    exit 1
fi

if ! command -v convert &> /dev/null; then
    echo "Error: ImageMagick is required. Run this inside the devcontainer."
    echo "  Install: sudo apt-get install imagemagick librsvg2-bin"
    exit 1
fi

echo "Creating favicon..."
echo "  Source: $SOURCE"

TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

if command -v rsvg-convert &> /dev/null; then
    rsvg-convert -w 16 -h 16 "$SOURCE" -o "$TEMP_DIR/icon-16.png"
    rsvg-convert -w 32 -h 32 "$SOURCE" -o "$TEMP_DIR/icon-32.png"
    rsvg-convert -w 48 -h 48 "$SOURCE" -o "$TEMP_DIR/icon-48.png"
else
    convert -background none -density 300 "$SOURCE" -resize 16x16 "$TEMP_DIR/icon-16.png"
    convert -background none -density 300 "$SOURCE" -resize 32x32 "$TEMP_DIR/icon-32.png"
    convert -background none -density 300 "$SOURCE" -resize 48x48 "$TEMP_DIR/icon-48.png"
fi

convert "$TEMP_DIR/icon-16.png" "$TEMP_DIR/icon-32.png" "$TEMP_DIR/icon-48.png" "$DEST_DIR/favicon.ico"

echo "  Created: favicon.ico ($(du -h "$DEST_DIR/favicon.ico" | cut -f1))"
echo "Done! Favicon published to $DEST_DIR/favicon.ico"
