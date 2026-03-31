#!/bin/bash
# generate-templates-json.sh - Generate templates.json and categories.json
#
# Scans all TEMPLATE_INFO files and generates JSON data files
# for the Docusaurus website.
#
# Usage: bash scripts/generate-templates-json.sh
#
# Output:
#   website/src/data/templates.json
#   website/src/data/categories.json

set -e

# Resolve script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Source libraries
source "$SCRIPT_DIR/lib/logging.sh"
source "$SCRIPT_DIR/lib/categories.sh"
source "$SCRIPT_DIR/lib/template-scanner.sh"

# Output directories
DATA_DIR="$REPO_ROOT/website/src/data"
mkdir -p "$DATA_DIR"

print_section "Generating templates.json and categories.json"

#------------------------------------------------------------------------------
# Generate templates.json
#------------------------------------------------------------------------------
log_info "Scanning TEMPLATE_INFO files..."

TEMPLATES_FILE="$DATA_DIR/templates.json"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date +"%Y-%m-%dT%H:%M:%SZ")

# Start JSON
cat > "$TEMPLATES_FILE" <<EOF
{
  "version": "1.0.0",
  "generated": "$TIMESTAMP",
  "templates": [
EOF

first=true
template_count=0

# Scan app templates
for info_file in "$REPO_ROOT"/templates/*/TEMPLATE_INFO; do
    [[ -f "$info_file" ]] || continue

    extract_template_metadata "$info_file"

    if [[ -z "$T_ID" || -z "$T_NAME" ]]; then
        log_warn "Skipping $(dirname "$info_file") — missing ID or NAME"
        continue
    fi

    [[ "$first" != "true" ]] && echo "," >> "$TEMPLATES_FILE"
    first=false

    local_tags=$(to_json_array "$T_TAGS")
    local_related=$(to_json_array "$T_RELATED")
    local_summary=$(json_escape "$T_SUMMARY")
    local_abstract=$(json_escape "$T_ABSTRACT")
    local_description=$(json_escape "$T_DESCRIPTION")

    cat >> "$TEMPLATES_FILE" <<EOF
    {
      "id": "$T_ID",
      "version": "$T_VER",
      "type": "app",
      "name": "$T_NAME",
      "description": "$local_description",
      "category": "$T_CATEGORY",
      "abstract": "$local_abstract",
      "tools": "$T_TOOLS",
      "readme": "$T_README",
      "tags": $local_tags,
      "logo": "$T_LOGO",
      "website": "$T_WEBSITE",
      "docs": "$T_DOCS",
      "summary": "$local_summary",
      "related": $local_related
    }
EOF
    ((template_count++))
    log_success "$T_ID"
done

# Scan AI templates
for info_file in "$REPO_ROOT"/ai-templates/*/TEMPLATE_INFO; do
    [[ -f "$info_file" ]] || continue

    extract_template_metadata "$info_file"

    if [[ -z "$T_ID" || -z "$T_NAME" ]]; then
        log_warn "Skipping $(dirname "$info_file") — missing ID or NAME"
        continue
    fi

    [[ "$first" != "true" ]] && echo "," >> "$TEMPLATES_FILE"
    first=false

    local_tags=$(to_json_array "$T_TAGS")
    local_related=$(to_json_array "$T_RELATED")
    local_summary=$(json_escape "$T_SUMMARY")
    local_abstract=$(json_escape "$T_ABSTRACT")
    local_description=$(json_escape "$T_DESCRIPTION")

    cat >> "$TEMPLATES_FILE" <<EOF
    {
      "id": "$T_ID",
      "version": "$T_VER",
      "type": "ai",
      "name": "$T_NAME",
      "description": "$local_description",
      "category": "$T_CATEGORY",
      "abstract": "$local_abstract",
      "tools": "$T_TOOLS",
      "readme": "$T_README",
      "tags": $local_tags,
      "logo": "$T_LOGO",
      "website": "$T_WEBSITE",
      "docs": "$T_DOCS",
      "summary": "$local_summary",
      "related": $local_related
    }
EOF
    ((template_count++))
    log_success "$T_ID (ai)"
done

# Close JSON
cat >> "$TEMPLATES_FILE" <<EOF

  ]
}
EOF

log_info "Generated $TEMPLATES_FILE ($template_count templates)"

#------------------------------------------------------------------------------
# Generate categories.json
#------------------------------------------------------------------------------
CATEGORIES_FILE="$DATA_DIR/categories.json"
generate_categories_json_internal > "$CATEGORIES_FILE"
log_info "Generated $CATEGORIES_FILE"

#------------------------------------------------------------------------------
# Validate JSON
#------------------------------------------------------------------------------
if command -v jq >/dev/null 2>&1; then
    print_subsection "Validating JSON"
    if jq . "$TEMPLATES_FILE" > /dev/null 2>&1; then
        log_success "templates.json is valid"
    else
        log_error "templates.json is INVALID"
        exit 1
    fi
    if jq . "$CATEGORIES_FILE" > /dev/null 2>&1; then
        log_success "categories.json is valid"
    else
        log_error "categories.json is INVALID"
        exit 1
    fi
else
    log_warn "jq not found — skipping JSON validation"
fi

log_success "Done"
