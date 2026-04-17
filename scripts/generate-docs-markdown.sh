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
    local_links_json=$(jq -c ".templates[$i].links // []" "$REGISTRY")
    local_maintainers_json=$(jq -c ".templates[$i].maintainers // []" "$REGISTRY")

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

    # Tags are rendered by the TemplateHeader component (with a "Tags:"
    # label), NOT via Docusaurus frontmatter. Removed from frontmatter to
    # avoid the duplicate tag list Docusaurus renders at the bottom of the
    # page.

    # Check whether the template has any environment-card content. The card
    # renders if any of the following are non-empty:
    #   - resolvedTools (from template-info.yaml `tools:`)
    #   - resolvedServices (from `requires:` or `provides.services:`)
    #   - resolvedInitFiles (from any service's `config.init`)
    #   - quickstart (run commands)
    #   - requires (legacy — drives the Configure section)
    local_has_tools=$(jq -r ".templates[$i].resolvedTools | if length > 0 then \"y\" else empty end" "$REGISTRY")
    local_has_services=$(jq -r ".templates[$i].resolvedServices | if length > 0 then \"y\" else empty end" "$REGISTRY")
    local_has_init=$(jq -r ".templates[$i].resolvedInitFiles | if (. // {} | length) > 0 then \"y\" else empty end" "$REGISTRY")
    local_has_requires=$(jq -r ".templates[$i].requires // empty" "$REGISTRY")
    local_has_quickstart=$(jq -r ".templates[$i].quickstart // empty" "$REGISTRY")

    # Pass the abstract as a prop to TemplateHeader so it renders inside
    # the header card (below the description line) instead of as orphaned
    # prose between TemplateHeader and the Environment card. JSON-encoded
    # with jq so newlines and quotes inside the abstract are escaped
    # cleanly for a JSX string expression.
    local_abstract_json=$(jq -c ".templates[$i].abstract // null" "$REGISTRY")

    # Write MDX file (Phase 1 task 1.2: no separate ## Summary section —
    # the TemplateHeader description + abstract carry the content)
    cat > "$page_file" <<MDXEOF
---
title: $name
sidebar_label: $name
description: "$description"
---

import TemplateHeader from '@site/src/components/TemplateHeader';

<TemplateHeader
  logo="/img/templates/$logo"
  name="$name"
  version="$version"
  description="$description"
  abstract={$local_abstract_json}
  install="$local_install_cmd"
  links={$local_links_json}
  maintainers={$local_maintainers_json}
  tags={$local_tags_mdx}
  tools="$tools"
/>

MDXEOF

    # Emit the "Getting started" card: combines Prerequisites + Files +
    # Related templates into one card with the same .templateCard visual
    # language as the Environment and Architecture cards. Skipped entirely
    # if all three sub-sections are empty. Each sub-section is independently
    # conditional on its source data being present.
    local_prereqs_json=$(jq -c ".templates[$i].prerequisites // []" "$REGISTRY")
    local_prereqs_len=$(echo "$local_prereqs_json" | jq 'length')
    local_files_mdx=$(jq -r ".templates[$i].filesMdx // empty" "$REGISTRY")
    local_related_ids=$(jq -r ".templates[$i].related[]?" "$REGISTRY")
    local_related_len=0
    if [[ -n "$local_related_ids" ]]; then
        local_related_len=$(echo "$local_related_ids" | wc -l | tr -d ' ')
    fi
    if [[ "$local_prereqs_len" -gt 0 || -n "$local_files_mdx" || "$local_related_len" -gt 0 ]]; then
        {
            echo ""
            echo '<div className="templateCard">'
            echo '<div className="templateCardEyebrow">GETTING STARTED</div>'
            echo ""
        } >> "$page_file"

        if [[ "$local_prereqs_len" -gt 0 ]]; then
            {
                echo "### Prerequisites"
                echo ""
            } >> "$page_file"
            echo "$local_prereqs_json" | jq -r '.[] | if .url then "- [ ] [" + .text + "](" + .url + ")" else "- [ ] " + .text end' >> "$page_file"
            echo "" >> "$page_file"
        fi

        # Files dropdown (PLAN-template-files-dropdown). The TS emitter
        # (buildFilesMdx in scripts/lib/build-files-mdx.ts) pre-rendered the
        # entire ### Files block — heading, <details>, <summary>, tree — so
        # this is a pure pass-through.
        if [[ -n "$local_files_mdx" ]]; then
            echo "$local_files_mdx" >> "$page_file"
        fi

        if [[ "$local_related_len" -gt 0 ]]; then
            {
                echo "### Related templates"
                echo ""
            } >> "$page_file"
            while IFS= read -r rel_id; do
                [[ -z "$rel_id" ]] && continue
                rel_name=$(jq -r ".templates[] | select(.id == \"$rel_id\") | .name" "$REGISTRY")
                rel_cat=$(jq -r ".templates[] | select(.id == \"$rel_id\") | .category" "$REGISTRY")
                if [[ -n "$rel_name" && "$rel_name" != "null" ]]; then
                    rel_cat_dir=$(echo "$rel_cat" | tr '[:upper:]' '[:lower:]' | tr '_' '-')
                    echo "- [$rel_name](../$rel_cat_dir/$rel_id)" >> "$page_file"
                else
                    echo "- $rel_id" >> "$page_file"
                fi
            done <<< "$local_related_ids"
            echo "" >> "$page_file"
        fi

        echo '</div>' >> "$page_file"
        echo "" >> "$page_file"
    fi

    # Emit Environment card if any environment content is present.
    # The component is a dumb renderer — every value is pre-resolved by
    # generate-registry.ts and passed as JSON props. JSX accepts JSON literals
    # because `null`/`{}`/`[]` are all valid JS expressions, so propName={$jq_compact}
    # works directly. (See PLAN-environment-card.md task 1.0 for the pattern doc.)
    if [[ -n "$local_has_tools" || -n "$local_has_services" || -n "$local_has_init" || -n "$local_has_requires" || -n "$local_has_quickstart" ]]; then
        local_requires_json=$(jq -c ".templates[$i].requires // null" "$REGISTRY")
        local_params_json=$(jq -c ".templates[$i].params // null" "$REGISTRY")
        local_quickstart_json=$(jq -c ".templates[$i].quickstart // null" "$REGISTRY")
        local_tools_json=$(jq -c ".templates[$i].resolvedTools // null" "$REGISTRY")
        local_services_json=$(jq -c ".templates[$i].resolvedServices // null" "$REGISTRY")
        local_template_kind_json=$(jq -c ".templates[$i].templateKind // null" "$REGISTRY")
        local_init_files_json=$(jq -c ".templates[$i].resolvedInitFiles // null" "$REGISTRY")
        local_configure_command_json=$(jq -c ".templates[$i].configureCommand // null" "$REGISTRY")
        # templateInfoYaml + expectedOutputBlock: raw strings embedded as JSX
        # attribute expressions. Escape `<` and `>` to \u003c / \u003e so MDX's
        # JSX parser doesn't mis-interpret angle-bracket patterns inside the
        # JSON-encoded string (e.g., `<id>` or `<name>` in yaml comments) as
        # unclosed JSX tags. React renders the unicode escapes as `<` / `>`
        # at runtime — no visual difference.
        local_template_info_yaml_json=$(jq -c ".templates[$i].templateInfoYaml // null" "$REGISTRY" | sed -e 's/</\\u003c/g' -e 's/>/\\u003e/g')
        local_expected_output_json=$(jq -c ".templates[$i].expectedOutputBlock // null" "$REGISTRY" | sed -e 's/</\\u003c/g' -e 's/>/\\u003e/g')

        cat >> "$page_file" <<MDXEOF
import TemplateEnvironment from '@site/src/components/TemplateEnvironment';

<TemplateEnvironment
  requires={$local_requires_json}
  params={$local_params_json}
  quickstart={$local_quickstart_json}
  tools={$local_tools_json}
  services={$local_services_json}
  templateKind={$local_template_kind_json}
  initFiles={$local_init_files_json}
  configureCommand={$local_configure_command_json}
  templateInfoYaml={$local_template_info_yaml_json}
  expectedOutputBlock={$local_expected_output_json}
/>

MDXEOF
    fi

    # Prerequisites previously emitted here as a standalone ## Prerequisites
    # section. Moved to the "Getting started" card above the Environment
    # card so it sits alongside Related templates in a single visual unit.

    # Emit auto-generated ## Architecture section (PLAN-template-architecture-diagram.md).
    # The full MDX block (headings + fenced mermaid code blocks) is pre-composed
    # by scripts/lib/build-architecture-mermaid.ts during registry generation
    # and stored as a single string on each template entry. Overlay templates
    # get null, so `jq -r … // empty` returns empty and the conditional skips.
    local_arch_mdx=$(jq -r ".templates[$i].architectureMdx // empty" "$REGISTRY")
    if [[ -n "$local_arch_mdx" ]]; then
        printf '\n%s\n' "$local_arch_mdx" >> "$page_file"
    fi

    # Embed README content
    local_readme_file=""
    local_readme_file=$(_find_readme "$folder" "$readme") || true

    if [[ -n "$local_readme_file" && -f "$local_readme_file" ]]; then
        {
            echo ""
            echo "## Template README"
            echo ""
        } >> "$page_file"
        _get_readme_content "$local_readme_file" >> "$page_file"
        echo "" >> "$page_file"
    else
        log_info "$tid: no README file — page is fully yaml-driven"
    fi

    # Related templates previously emitted here as a standalone
    # ## Related Templates section at the end of the page. Moved to the
    # "Getting started" card above the Environment card so it's
    # discoverable alongside Prerequisites without requiring the reader
    # to scroll to the very bottom.

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
    index_file="$DOCS_DIR/$cat_dir/index.mdx"

    cat > "$index_file" <<EOF
---
title: $cat_name
sidebar_label: $cat_name
---

import TemplateList from '@site/src/components/TemplateList';

# $cat_name

$cat_desc

<TemplateList categoryId="$cat_id" />
EOF

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
    "type": "doc",
    "id": "templates/index"
  }
}
CATEOF

log_success "Templates category config generated"

log_info "Generated $page_count template detail pages"
log_success "Done"
