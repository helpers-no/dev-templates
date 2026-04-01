#!/bin/bash
# create-social-card.sh - Generate social card image with text and logo
#
# Combines background image with title text, tagline, and logo+TMP branding.
# Adapted from UIS (helpers-no/urbalurba-infrastructure).
#
# IMPORTANT: Run this script inside the devcontainer where ImageMagick
# and rsvg-convert are available (dev-imagetools).
#
# Usage:
#   ./create-social-card.sh "Title" "Tagline"
#
# Examples:
#   ./create-social-card.sh $'Dev\nTemplates' $'Instant-start templates\nfor any service, any language'

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKGROUND="$SCRIPT_DIR/social-card-background.png"
LOGO_SVG="$SCRIPT_DIR/dev-templates-logo.svg"
OUTPUT="$SCRIPT_DIR/social-card-generated.png"

TITLE="${1:-Dev\nTemplates}"
TAGLINE="${2:-Instant-start templates\nfor any service, any language}"

TEXT_COLOR="#3a8f5e"
TITLE_SIZE=72
TAGLINE_SIZE=42

TITLE_X=750
TITLE_Y=200
TAGLINE_X=750
TAGLINE_Y=480

# Bottom branding position (logo + TMP text)
BRAND_X=150    # From right edge
BRAND_Y=40     # From bottom edge

if ! command -v convert &> /dev/null; then
    echo "Error: ImageMagick is required. Run this inside the devcontainer."
    echo "  Install: dev-setup > Image Processing Tools"
    exit 1
fi

if [[ ! -f "$BACKGROUND" ]]; then
    echo "Error: Background image not found: $BACKGROUND"
    echo "  Run ./remove-gemini-stars.sh first to create it."
    exit 1
fi

echo "Creating social card..."
echo "  Title: $TITLE"
echo "  Tagline: $TAGLINE"
echo "  Output: $OUTPUT"

TEMP_LOGO=$(mktemp /tmp/logo.XXXXXX.png)
TEMP_BRAND=$(mktemp /tmp/brand.XXXXXX.png)
trap "rm -f $TEMP_LOGO $TEMP_BRAND" EXIT

# Render logo icon at 45px height
if command -v rsvg-convert &> /dev/null; then
    rsvg-convert -h 45 "$LOGO_SVG" -o "$TEMP_LOGO"
else
    convert -background none -density 300 "$LOGO_SVG" -resize x45 "$TEMP_LOGO"
fi

# Create brand strip: logo icon + "TMP" text side by side
convert -background none \
    "$TEMP_LOGO" \
    \( -size 10x45 xc:none \) \
    \( -background none -fill "#4fb87b" -font "Helvetica-Bold" -pointsize 40 -size x45 label:"TMP" \) \
    +append "$TEMP_BRAND"

# Compose final social card
convert "$BACKGROUND" \
    -font "Helvetica-Bold" -pointsize $TITLE_SIZE -fill "$TEXT_COLOR" \
    -gravity NorthWest -annotate +${TITLE_X}+${TITLE_Y} "$TITLE" \
    -font "Helvetica" -pointsize $TAGLINE_SIZE -fill "$TEXT_COLOR" \
    -gravity NorthWest -annotate +${TAGLINE_X}+${TAGLINE_Y} "$TAGLINE" \
    "$TEMP_BRAND" -gravity SouthEast -geometry +${BRAND_X}+${BRAND_Y} -composite \
    "$OUTPUT"

echo "Done! Created: $OUTPUT"
