#!/bin/bash
# generate-docs-markdown.sh - Generate Docusaurus template pages (MDX)
#
# Reads template-registry.json and generates MDX detail pages with
# TemplateHeader component and embedded README content.
# Also generates category index pages.
#
# Usage: bash scripts/generate-docs-markdown.sh [--force]
#
# Output:
#   website/docs/templates/<category>/<template-id>.mdx
#   website/docs/templates/<category>/index.md

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

source "$SCRIPT_DIR/lib/logging.sh"

FORCE=false
[[ "${1:-}" == "--force" ]] && FORCE=true

REGISTRY="$REPO_ROOT/website/src/data/template-registry.json"
DOCS_DIR="$REPO_ROOT/website/docs/templates"
mkdir -p "$DOCS_DIR"

if [[ ! -f "$REGISTRY" ]]; then
    log_error "Registry not found: $REGISTRY"
    log_error "Run: bash scripts/generate-registry.sh"
    exit 1
fi

print_section "Generating template documentation pages"

#------------------------------------------------------------------------------
# Find README file for a template
#------------------------------------------------------------------------------
_find_readme() {
    local folder="$1"
    local readme="$2"
    local template_dir="$REPO_ROOT/$folder"

    # Check if this is an overlay template (has template/ subdirectory)
    if [[ -f "$template_dir/template/$readme" ]]; then
        echo "$template_dir/template/$readme"
        return 0
    fi

    # App template — README is in the same directory
    if [[ -f "$template_dir/$readme" ]]; then
        echo "$template_dir/$readme"
        return 0
    fi

    return 1
}

#------------------------------------------------------------------------------
# Get README content (strip first # heading line)
#------------------------------------------------------------------------------
_get_readme_content() {
    local readme_file="$1"
    awk 'NR==1 && /^# /{next} {print}' "$readme_file"
}

#------------------------------------------------------------------------------
# First pass: generate detail pages
#------------------------------------------------------------------------------
print_subsection "Template detail pages"

page_count=0
template_count=$(jq '.templates | length' "$REGISTRY")

for i in $(seq 0 $((template_count - 1))); do
    # Extract fields from registry
    tid=$(jq -r ".templates[$i].id" "$REGISTRY")
    folder=$(jq -r ".templates[$i].folder" "$REGISTRY")
    version=$(jq -r ".templates[$i].version" "$REGISTRY")
    name=$(jq -r ".templates[$i].name" "$REGISTRY")
    description=$(jq -r ".templates[$i].description" "$REGISTRY")
    category=$(jq -r ".templates[$i].category" "$REGISTRY")
    install_type=$(jq -r ".templates[$i].install_type" "$REGISTRY")
    context=$(jq -r ".templates[$i].context" "$REGISTRY")
    abstract=$(jq -r ".templates[$i].abstract" "$REGISTRY")
    tools=$(jq -r ".templates[$i].tools" "$REGISTRY")
    readme=$(jq -r ".templates[$i].readme" "$REGISTRY")
    logo=$(jq -r ".templates[$i].logo" "$REGISTRY")
    website=$(jq -r ".templates[$i].website" "$REGISTRY")
    docs=$(jq -r ".templates[$i].docs" "$REGISTRY")
    summary=$(jq -r ".templates[$i].summary" "$REGISTRY")

    [[ -z "$tid" || "$tid" == "null" ]] && continue

    # Category folder name
    cat_dir=$(echo "$category" | tr '[:upper:]' '[:lower:]' | tr '_' '-')
    page_dir="$DOCS_DIR/$cat_dir"
    page_file="$page_dir/$tid.mdx"

    mkdir -p "$page_dir"

    # Remove old .md file if it exists (we generate .mdx)
    [[ -f "$page_dir/$tid.md" ]] && rm "$page_dir/$tid.md"

    if [[ -f "$page_file" && "$FORCE" != "true" ]]; then
        log_info "Skipping $tid (exists, use --force to overwrite)"
        continue
    fi

    # Install command — route by template context (Phase 1 task 1.1)
    # context: dct → dev-template (DCT devcontainer command)
    # context: uis → uis template install (UIS provision-host command, available in DCT via the uis shim from DCT v1.7.34+)
    if [[ "$context" == "uis" ]]; then
        local_install_cmd="uis template install $tid"
    else
        local_install_cmd="dev-template $tid"
    fi

    # Build tags array for MDX component
    local_tags_mdx=$(jq -r ".templates[$i].tags | @json" "$REGISTRY")

    # Build tags list for frontmatter
    local_tags_yaml=""
    while IFS= read -r tag; do
        local_tags_yaml+="  - $tag
"
    done < <(jq -r ".templates[$i].tags[]" "$REGISTRY")

    # Write MDX file (Phase 1 task 1.2: no separate ## Summary section —
    # the TemplateHeader description + README intro carry the content)
    cat > "$page_file" <<MDXEOF
---
title: $name
sidebar_label: $name
description: "$description"
tags:
$local_tags_yaml---

import TemplateHeader from '@site/src/components/TemplateHeader';

<TemplateHeader
  logo="/img/templates/$logo"
  name="$name"
  version="$version"
  description="$description"
  install="$local_install_cmd"
  website="$website"
  docs="$docs"
  tags={$local_tags_mdx}
  tools="$tools"
/>

MDXEOF

    # Embed README content
    local_readme_file=""
    local_readme_file=$(_find_readme "$folder" "$readme") || true

    if [[ -n "$local_readme_file" && -f "$local_readme_file" ]]; then
        _get_readme_content "$local_readme_file" >> "$page_file"
        echo "" >> "$page_file"
    else
        log_warn "$tid: README file not found ($readme)"
    fi

    # Add related templates
    local_related=$(jq -r ".templates[$i].related[]?" "$REGISTRY")
    if [[ -n "$local_related" ]]; then
        echo "---" >> "$page_file"
        echo "" >> "$page_file"
        echo "## Related Templates" >> "$page_file"
        echo "" >> "$page_file"
        while IFS= read -r rel_id; do
            [[ -z "$rel_id" ]] && continue
            # Look up related template name and category from registry
            rel_name=$(jq -r ".templates[] | select(.id == \"$rel_id\") | .name" "$REGISTRY")
            rel_cat=$(jq -r ".templates[] | select(.id == \"$rel_id\") | .category" "$REGISTRY")
            if [[ -n "$rel_name" && "$rel_name" != "null" ]]; then
                rel_cat_dir=$(echo "$rel_cat" | tr '[:upper:]' '[:lower:]' | tr '_' '-')
                echo "- [$rel_name](../$rel_cat_dir/$rel_id)" >> "$page_file"
            else
                echo "- $rel_id" >> "$page_file"
            fi
        done <<< "$local_related"
        echo "" >> "$page_file"
    fi

    ((page_count++)) || true
    log_success "$tid → $cat_dir/$tid.mdx"
done

#------------------------------------------------------------------------------
# Second pass: generate category index pages
#------------------------------------------------------------------------------
print_subsection "Category index pages"

cat_count=$(jq '.categories | length' "$REGISTRY")

for i in $(seq 0 $((cat_count - 1))); do
    cat_id=$(jq -r ".categories[$i].id" "$REGISTRY")
    cat_name=$(jq -r ".categories[$i].name" "$REGISTRY")
    cat_desc=$(jq -r ".categories[$i].description" "$REGISTRY")
    cat_order=$(jq -r ".categories[$i].order" "$REGISTRY")

    cat_dir=$(echo "$cat_id" | tr '[:upper:]' '[:lower:]' | tr '_' '-')

    # Check if any templates belong to this category
    tmpl_in_cat=$(jq -r ".templates[] | select(.category == \"$cat_id\") | .id" "$REGISTRY")
    [[ -z "$tmpl_in_cat" ]] && continue

    mkdir -p "$DOCS_DIR/$cat_dir"
    index_file="$DOCS_DIR/$cat_dir/index.md"

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

    while IFS= read -r tmpl_id; do
        [[ -z "$tmpl_id" ]] && continue
        tmpl_name=$(jq -r ".templates[] | select(.id == \"$tmpl_id\") | .name" "$REGISTRY")
        tmpl_desc=$(jq -r ".templates[] | select(.id == \"$tmpl_id\") | .description" "$REGISTRY")
        echo "| [$tmpl_name]($tmpl_id) | $tmpl_desc | \`dev-template $tmpl_id\` |" >> "$index_file"
    done <<< "$tmpl_in_cat"

    # Generate _category_.json for Docusaurus sidebar
    local_position=$((cat_order + 1))

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
