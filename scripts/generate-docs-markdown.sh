#!/bin/bash
# generate-docs-markdown.sh - Generate Docusaurus template pages
#
# Scans TEMPLATE_INFO files and generates markdown detail pages
# and category index pages for the Docusaurus website.
# Compatible with bash 3.x (macOS default).
#
# Usage: bash scripts/generate-docs-markdown.sh [--force]
#
# Output:
#   website/docs/templates/<category>/<template-id>.md
#   website/docs/templates/<category>/index.md

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

source "$SCRIPT_DIR/lib/logging.sh"
source "$SCRIPT_DIR/lib/categories.sh"
source "$SCRIPT_DIR/lib/template-scanner.sh"

FORCE=false
[[ "${1:-}" == "--force" ]] && FORCE=true

DOCS_DIR="$REPO_ROOT/website/docs/templates"
mkdir -p "$DOCS_DIR"

# Temp file for collecting templates per category
TMPFILE=$(mktemp)
trap "rm -f $TMPFILE" EXIT

print_section "Generating template documentation pages"

#------------------------------------------------------------------------------
# First pass: generate detail pages and collect category membership
#------------------------------------------------------------------------------
print_subsection "Template detail pages"

page_count=0
for info_file in "$REPO_ROOT"/templates/*/TEMPLATE_INFO "$REPO_ROOT"/ai-templates/*/TEMPLATE_INFO; do
    [[ -f "$info_file" ]] || continue
    extract_template_metadata "$info_file"
    [[ -z "$T_ID" ]] && continue

    # Record category membership
    echo "$T_CATEGORY|$info_file" >> "$TMPFILE"

    # Determine category folder name (lowercase, hyphenated)
    cat_dir=$(echo "$T_CATEGORY" | tr '[:upper:]' '[:lower:]' | tr '_' '-')
    page_dir="$DOCS_DIR/$cat_dir"
    page_file="$page_dir/$T_ID.md"

    mkdir -p "$page_dir"

    if [[ -f "$page_file" && "$FORCE" != "true" ]]; then
        log_info "Skipping $T_ID (exists, use --force to overwrite)"
        continue
    fi

    cat > "$page_file" <<EOF
---
title: $T_NAME
sidebar_label: $T_NAME
---

# $T_NAME

$T_DESCRIPTION

| | |
|---|---|
| **Category** | $(get_category_name "$T_CATEGORY") |
| **Version** | $T_VER |
| **Tools** | ${T_TOOLS:-None} |
| **Website** | [$T_WEBSITE]($T_WEBSITE) |
| **Docs** | [$T_DOCS]($T_DOCS) |

## About

$T_SUMMARY

## Tags

$(for tag in $T_TAGS; do echo -n "\`$tag\` "; done)

EOF

    if [[ -n "$T_RELATED" ]]; then
        cat >> "$page_file" <<EOF
## Related Templates

$(for rel_id in $T_RELATED; do echo "- $rel_id"; done)
EOF
    fi

    ((page_count++)) || true
    log_success "$T_ID → $cat_dir/$T_ID.md"
done

#------------------------------------------------------------------------------
# Second pass: generate category index pages
#------------------------------------------------------------------------------
print_subsection "Category index pages"

for cat_id in "${CATEGORY_ORDER[@]}"; do
    cat_dir=$(echo "$cat_id" | tr '[:upper:]' '[:lower:]' | tr '_' '-')
    index_file="$DOCS_DIR/$cat_dir/index.md"

    # Check if any templates belong to this category
    cat_files=$(grep "^${cat_id}|" "$TMPFILE" 2>/dev/null || true)
    [[ -z "$cat_files" ]] && continue

    mkdir -p "$DOCS_DIR/$cat_dir"

    cat_name=$(get_category_name "$cat_id")
    cat_desc=$(get_category_description "$cat_id")

    cat > "$index_file" <<EOF
---
title: $cat_name
sidebar_label: $cat_name
---

# $cat_name

$cat_desc

| Template | Description |
|----------|-------------|
EOF

    while IFS='|' read -r _ info_file; do
        [[ -z "$info_file" || ! -f "$info_file" ]] && continue
        extract_template_metadata "$info_file"
        [[ -z "$T_ID" ]] && continue
        echo "| [$T_NAME]($T_ID.md) | $T_DESCRIPTION |" >> "$index_file"
    done <<< "$cat_files"

    log_success "$cat_id → $cat_dir/index.md"
done

#------------------------------------------------------------------------------
# Generate templates overview index
#------------------------------------------------------------------------------
OVERVIEW_FILE="$DOCS_DIR/index.md"
cat > "$OVERVIEW_FILE" <<EOF
---
title: Templates
sidebar_label: Templates
sidebar_position: 10
---

# Templates

Project templates for the Urbalurba developer platform.

EOF

for cat_id in "${CATEGORY_ORDER[@]}"; do
    cat_files=$(grep "^${cat_id}|" "$TMPFILE" 2>/dev/null || true)
    [[ -z "$cat_files" ]] && continue

    cat_dir=$(echo "$cat_id" | tr '[:upper:]' '[:lower:]' | tr '_' '-')
    cat_name=$(get_category_name "$cat_id")
    cat_desc=$(get_category_description "$cat_id")

    cat >> "$OVERVIEW_FILE" <<EOF
## [$cat_name]($cat_dir/)

$cat_desc

| Template | Description |
|----------|-------------|
EOF

    while IFS='|' read -r _ info_file; do
        [[ -z "$info_file" || ! -f "$info_file" ]] && continue
        extract_template_metadata "$info_file"
        [[ -z "$T_ID" ]] && continue
        echo "| [$T_NAME]($cat_dir/$T_ID.md) | $T_DESCRIPTION |" >> "$OVERVIEW_FILE"
    done <<< "$cat_files"
    echo "" >> "$OVERVIEW_FILE"
done

log_success "Templates overview → templates/index.md"

log_info "Generated $page_count template pages"
log_success "Done"
