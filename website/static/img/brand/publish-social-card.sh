#!/bin/bash
# publish-social-card.sh - Publish generated social card to website
#
# Takes the generated social card and creates an optimized JPG for Docusaurus.
# Adapted from UIS (helpers-no/urbalurba-infrastructure).
#
# IMPORTANT: Run this script inside the devcontainer where ImageMagick is available.
#
# Usage:
#   ./publish-social-card.sh [source.png]
#
# Output:
#   ../social-card.jpg - Optimized JPG for social media

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE="${1:-$SCRIPT_DIR/social-card-generated.png}"
DEST_DIR="$(dirname "$SCRIPT_DIR")"

if [[ ! -f "$SOURCE" ]]; then
    echo "Error: Source file not found: $SOURCE"
    echo ""
    echo "Generate a social card first with:"
    echo "  ./create-social-card.sh \$'Dev\nTemplates' \$'Instant-start templates\nfor any service, any language'"
    exit 1
fi

if ! command -v convert &> /dev/null; then
    echo "Error: ImageMagick is required. Run this inside the devcontainer."
    exit 1
fi

echo "Publishing social card..."
echo "  Source: $SOURCE"
echo "  Destination: $DEST_DIR/"

convert "$SOURCE" -quality 85 "$DEST_DIR/social-card.jpg"
echo "  Created: social-card.jpg ($(du -h "$DEST_DIR/social-card.jpg" | cut -f1))"

echo ""
echo "Done! Social card published to $DEST_DIR/social-card.jpg"
