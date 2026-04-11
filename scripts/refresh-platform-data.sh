#!/bin/bash
# refresh-platform-data.sh - Vendor DCT and UIS data files
#
# Downloads the canonical tools/services/categories registries from DCT and UIS
# and writes them into website/src/data/ as committed, vendored dependencies.
#
# After download, each file is sanity-checked with `jq -e` to confirm the
# expected top-level shape and required fields exist. The script aborts on any
# failure (network, HTTP error, or schema drift) so we never overwrite a good
# vendored file with a broken one.
#
# Usage:
#   bash scripts/refresh-platform-data.sh
#
# Output:
#   website/src/data/dct-tools.json       (from helpers-no/devcontainer-toolbox)
#   website/src/data/uis-services.json    (from helpers-no/urbalurba-infrastructure)
#   website/src/data/uis-categories.json  (from helpers-no/urbalurba-infrastructure)
#
# When to run:
#   - First-time setup of the website on a new machine
#   - When DCT publishes a new tool, or its categories change
#   - When UIS publishes a new service, or its metadata changes
#   - The output files are committed; this script is run on demand, not in CI

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

source "$SCRIPT_DIR/lib/logging.sh"

DATA_DIR="$REPO_ROOT/website/src/data"
mkdir -p "$DATA_DIR"

DCT_TOOLS_URL="https://raw.githubusercontent.com/helpers-no/devcontainer-toolbox/refs/heads/main/.devcontainer/manage/tools.json"
UIS_SERVICES_URL="https://raw.githubusercontent.com/helpers-no/urbalurba-infrastructure/refs/heads/main/website/src/data/services.json"
UIS_CATEGORIES_URL="https://raw.githubusercontent.com/helpers-no/urbalurba-infrastructure/refs/heads/main/website/src/data/categories.json"

#------------------------------------------------------------------------------
# Download a URL to a temporary file, then validate shape, then move into place.
#
# Args:
#   $1 - source URL
#   $2 - destination file path (absolute)
#   $3 - jq sanity-check expression (must be truthy)
#   $4 - human label for log messages
#------------------------------------------------------------------------------
_fetch_and_validate() {
    local url="$1"
    local dest="$2"
    local jq_check="$3"
    local label="$4"

    local tmp
    tmp=$(mktemp)
    trap 'rm -f "$tmp"' RETURN

    log_info "Fetching $label..."
    log_info "  URL:  $url"

    if ! curl -fsSL "$url" -o "$tmp"; then
        log_error "$label: download failed (curl exit $?)"
        return 1
    fi

    # Validate it's parseable JSON
    if ! jq empty "$tmp" 2>/dev/null; then
        log_error "$label: downloaded file is not valid JSON"
        log_error "  First 200 bytes: $(head -c 200 "$tmp")"
        return 1
    fi

    # Validate the expected shape (catches upstream schema drift)
    if ! jq -e "$jq_check" "$tmp" >/dev/null 2>&1; then
        log_error "$label: schema sanity check failed"
        log_error "  Expected: $jq_check"
        log_error "  This usually means the upstream registry shape changed."
        log_error "  Inspect the file at $tmp and update this script if needed."
        # Keep tmp for inspection
        trap - RETURN
        log_error "  Temp file kept for inspection: $tmp"
        return 1
    fi

    mv "$tmp" "$dest"
    trap - RETURN

    local size
    size=$(wc -c < "$dest" | tr -d ' ')
    log_success "$label → $dest ($size bytes)"
}

#------------------------------------------------------------------------------

print_section "Refreshing vendored platform data"

# DCT tools.json
# Shape: {"version": "...", "generated": "...", "tools": [{id, name, category, ...}]}
_fetch_and_validate \
    "$DCT_TOOLS_URL" \
    "$DATA_DIR/dct-tools.json" \
    '.tools | type == "array" and length > 0 and (.[0] | .id and .name and .category)' \
    "DCT tools.json"

# UIS services.json
# Shape: {"services": [{id, name, description, ...}]}
_fetch_and_validate \
    "$UIS_SERVICES_URL" \
    "$DATA_DIR/uis-services.json" \
    '.services | type == "array" and length > 0 and (.[0] | .id and .name and .description)' \
    "UIS services.json"

# UIS categories.json
# Shape: {"categories": [{id, name, ...}]}
_fetch_and_validate \
    "$UIS_CATEGORIES_URL" \
    "$DATA_DIR/uis-categories.json" \
    '.categories | type == "array" and length > 0 and (.[0] | .id and .name)' \
    "UIS categories.json"

print_section "Done"
log_info "Vendored files are in $DATA_DIR"
log_info "Commit them with git when you're satisfied:"
log_info "  git add website/src/data/dct-tools.json website/src/data/uis-services.json website/src/data/uis-categories.json"
