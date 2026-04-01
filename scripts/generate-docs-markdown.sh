#!/bin/bash
# generate-docs-markdown.sh - Generate Docusaurus template pages (MDX)
#
# Scans TEMPLATE_INFO files and generates MDX detail pages with
# TemplateHeader component and embedded README content.
# Also generates category index pages and templates overview.
# Compatible with bash 3.x (macOS default).
#
# Usage: bash scripts/generate-docs-markdown.sh [--force]
#
# Output:
#   website/docs/templates/<category>/<template-id>.mdx
#   website/docs/templates/<category>/index.md
#   website/docs/templates/index.md

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
# Find README file for a template
#------------------------------------------------------------------------------
_find_readme() {
    local info_file="$1"
    local template_dir
    template_dir="$(dirname "$info_file")"

    # Check if this is an ai-template (has template/ subdirectory)
    if [[ -f "$template_dir/template/$T_README" ]]; then
        echo "$template_dir/template/$T_README"
        return 0
    fi

    # App template — README is in the same directory
    if [[ -f "$template_dir/$T_README" ]]; then
        echo "$template_dir/$T_README"
        return 0
    fi

    return 1
}

#------------------------------------------------------------------------------
# Get README content (strip first # heading line)
#------------------------------------------------------------------------------
_get_readme_content() {
    local readme_file="$1"
    # Skip the first line if it starts with #
    awk 'NR==1 && /^# /{next} {print}' "$readme_file"
}

#------------------------------------------------------------------------------
# Resolve related template ID to link path and name
#------------------------------------------------------------------------------
_resolve_related() {
    local rel_id="$1"

    # Search app templates
    for info_file in "$REPO_ROOT"/templates/*/TEMPLATE_INFO; do
        [[ -f "$info_file" ]] || continue
        local saved_id="$T_ID" saved_name="$T_NAME" saved_cat="$T_CATEGORY"

        extract_template_metadata "$info_file"
        if [[ "$T_ID" == "$rel_id" ]]; then
            local cat_dir
            cat_dir=$(echo "$T_CATEGORY" | tr '[:upper:]' '[:lower:]' | tr '_' '-')
            echo "[$T_NAME](../$cat_dir/$T_ID)"

            T_ID="$saved_id" T_NAME="$saved_name" T_CATEGORY="$saved_cat"
            return 0
        fi
        T_ID="$saved_id" T_NAME="$saved_name" T_CATEGORY="$saved_cat"
    done

    # Search ai templates
    for info_file in "$REPO_ROOT"/ai-templates/*/TEMPLATE_INFO; do
        [[ -f "$info_file" ]] || continue
        local saved_id="$T_ID" saved_name="$T_NAME" saved_cat="$T_CATEGORY"

        extract_template_metadata "$info_file"
        if [[ "$T_ID" == "$rel_id" ]]; then
            local cat_dir
            cat_dir=$(echo "$T_CATEGORY" | tr '[:upper:]' '[:lower:]' | tr '_' '-')
            echo "[$T_NAME](../$cat_dir/$T_ID)"

            T_ID="$saved_id" T_NAME="$saved_name" T_CATEGORY="$saved_cat"
            return 0
        fi
        T_ID="$saved_id" T_NAME="$saved_name" T_CATEGORY="$saved_cat"
    done

    # Not found — return plain text
    echo "$rel_id"
}

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

    # Determine category folder name
    cat_dir=$(echo "$T_CATEGORY" | tr '[:upper:]' '[:lower:]' | tr '_' '-')
    page_dir="$DOCS_DIR/$cat_dir"
    page_file="$page_dir/$T_ID.mdx"

    mkdir -p "$page_dir"

    # Also remove old .md file if it exists (we now generate .mdx)
    [[ -f "$page_dir/$T_ID.md" ]] && rm "$page_dir/$T_ID.md"

    if [[ -f "$page_file" && "$FORCE" != "true" ]]; then
        log_info "Skipping $T_ID (exists, use --force to overwrite)"
        continue
    fi

    # Determine install command
    local_install_cmd="dev-template $T_ID"
    if [[ "$(dirname "$(dirname "$info_file")")" == *"ai-templates"* || "$(dirname "$info_file")" == *"ai-templates"* ]]; then
        local_install_cmd="dev-template-ai $T_ID"
    fi

    # Build tags array for MDX
    local_tags_mdx="["
    local_tags_first=true
    for tag in $T_TAGS; do
        [[ "$local_tags_first" != "true" ]] && local_tags_mdx+=", "
        local_tags_first=false
        local_tags_mdx+="\"$tag\""
    done
    local_tags_mdx+="]"

    # Build tags list for frontmatter
    local_tags_yaml=""
    for tag in $T_TAGS; do
        local_tags_yaml+="  - $tag
"
    done

    # Write MDX file
    cat > "$page_file" <<MDXEOF
---
title: $T_NAME
sidebar_label: $T_NAME
description: "$T_DESCRIPTION"
tags:
$local_tags_yaml---

import TemplateHeader from '@site/src/components/TemplateHeader';

<TemplateHeader
  logo="/img/templates/$T_LOGO"
  name="$T_NAME"
  version="$T_VER"
  description="$T_DESCRIPTION"
  install="$local_install_cmd"
  website="$T_WEBSITE"
  docs="$T_DOCS"
  tags={$local_tags_mdx}
  tools="$T_TOOLS"
/>

## Summary

$(json_escape "$T_SUMMARY")

---

MDXEOF

    # Embed README content
    local_readme_file=""
    local_readme_file=$(_find_readme "$info_file") || true

    if [[ -n "$local_readme_file" && -f "$local_readme_file" ]]; then
        _get_readme_content "$local_readme_file" >> "$page_file"
        echo "" >> "$page_file"
    else
        log_warn "$T_ID: README file not found ($T_README)"
    fi

    # Add related templates
    if [[ -n "$T_RELATED" ]]; then
        echo "---" >> "$page_file"
        echo "" >> "$page_file"
        echo "## Related Templates" >> "$page_file"
        echo "" >> "$page_file"
        for rel_id in $T_RELATED; do
            local_resolved=$(_resolve_related "$rel_id")
            echo "- $local_resolved" >> "$page_file"
        done
        echo "" >> "$page_file"
    fi

    ((page_count++)) || true
    log_success "$T_ID → $cat_dir/$T_ID.mdx"
done

#------------------------------------------------------------------------------
# Second pass: generate category index pages
#------------------------------------------------------------------------------
print_subsection "Category index pages"

for cat_id in "${CATEGORY_ORDER[@]}"; do
    cat_dir=$(echo "$cat_id" | tr '[:upper:]' '[:lower:]' | tr '_' '-')
    index_file="$DOCS_DIR/$cat_dir/index.md"

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

| Template | Description | Install |
|----------|-------------|---------|
EOF

    while IFS='|' read -r _ local_info_file; do
        [[ -z "$local_info_file" || ! -f "$local_info_file" ]] && continue
        extract_template_metadata "$local_info_file"
        [[ -z "$T_ID" ]] && continue
        local_cmd="dev-template $T_ID"
        if [[ "$local_info_file" == *"ai-templates"* ]]; then
            local_cmd="dev-template-ai $T_ID"
        fi
        echo "| [$T_NAME]($T_ID) | $T_DESCRIPTION | \`$local_cmd\` |" >> "$index_file"
    done <<< "$cat_files"

    # Generate _category_.json for Docusaurus sidebar
    local_position=1
    case "$cat_id" in
        WEB_SERVER) local_position=1 ;;
        WEB_APP) local_position=2 ;;
        WORKFLOW) local_position=3 ;;
        *) local_position=9 ;;
    esac

    cat > "$DOCS_DIR/$cat_dir/_category_.json" <<CATEOF
{
  "label": "$cat_name",
  "position": $local_position,
  "link": {
    "type": "doc",
    "id": "templates/$cat_dir/index"
  }
}
CATEOF

    log_success "$cat_id → $cat_dir/index.md + _category_.json"
done

# Generate top-level _category_.json for Docusaurus
cat > "$DOCS_DIR/_category_.json" <<CATEOF
{
  "label": "Templates",
  "position": 10,
  "link": {
    "type": "generated-index",
    "description": "Project templates for the Urbalurba developer platform."
  }
}
CATEOF

log_success "Templates category config generated"

log_info "Generated $page_count template detail pages"
log_success "Done"
