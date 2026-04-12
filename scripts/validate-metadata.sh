#!/bin/bash
# validate-metadata.sh - Validate template-info.yaml and template-categories.yaml files
#
# Checks that all mandatory fields are present and valid.
# Exits non-zero if any validation fails (blocks CI build).
# Uses node + js-yaml from website/node_modules for YAML parsing.
#
# Usage: bash scripts/validate-metadata.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

source "$SCRIPT_DIR/lib/logging.sh"

print_section "Validating template metadata"

ERRORS=0
TEMPLATES=0
CATEGORIES=0

# Helper: read a YAML field using node + js-yaml
_yaml_field() {
    local file="$1"
    local field="$2"
    node -e "
        const yaml = require('$REPO_ROOT/website/node_modules/js-yaml');
        const fs = require('fs');
        const d = yaml.load(fs.readFileSync('$file', 'utf8'));
        const v = $field;
        if (Array.isArray(v)) { v.forEach(i => console.log(i)); }
        else { console.log(v === undefined || v === null ? '' : v); }
    " 2>/dev/null
}

# Helper: check YAML parses
_yaml_valid() {
    local file="$1"
    node -e "
        const yaml = require('$REPO_ROOT/website/node_modules/js-yaml');
        const fs = require('fs');
        yaml.load(fs.readFileSync('$file', 'utf8'));
    " 2>/dev/null
}

#------------------------------------------------------------------------------
# Validate template-categories.yaml files
#------------------------------------------------------------------------------
print_subsection "Validating template-categories.yaml files"

CATEGORY_IDS=()

for cat_file in "$REPO_ROOT"/*/template-categories.yaml; do
    [[ -f "$cat_file" ]] || continue
    local_dir="$(dirname "$cat_file")"
    local_name="$(basename "$local_dir")"

    if ! _yaml_valid "$cat_file"; then
        log_error "$local_name/template-categories.yaml: invalid YAML syntax"
        ((ERRORS++)) || true
        continue
    fi

    context=$(_yaml_field "$cat_file" "d.context")
    name=$(_yaml_field "$cat_file" "d.name")

    if [[ "$context" != "dct" && "$context" != "uis" ]]; then
        log_error "$local_name/template-categories.yaml: context must be 'dct' or 'uis', got '$context'"
        ((ERRORS++)) || true
    fi
    if [[ -z "$name" ]]; then
        log_error "$local_name/template-categories.yaml: missing name"
        ((ERRORS++)) || true
    fi

    # Validate each category
    cat_count=$(_yaml_field "$cat_file" "(d.categories || []).length")

    if [[ "$cat_count" == "0" ]]; then
        log_error "$local_name/template-categories.yaml: no categories defined"
        ((ERRORS++)) || true
    else
        ids=$(_yaml_field "$cat_file" "(d.categories || []).map(c => c.id)")
        while IFS= read -r cid; do
            [[ -z "$cid" ]] && continue
            for existing in "${CATEGORY_IDS[@]}"; do
                if [[ "$existing" == "$cid" ]]; then
                    log_error "Duplicate category ID '$cid' in $local_name/template-categories.yaml"
                    ((ERRORS++)) || true
                fi
            done
            CATEGORY_IDS+=("$cid")
            ((CATEGORIES++)) || true
        done <<< "$ids"

        log_success "$local_name/template-categories.yaml — $cat_count categories valid"
    fi
done

if [[ ${#CATEGORY_IDS[@]} -eq 0 ]]; then
    log_error "No template-categories.yaml files found"
    ((ERRORS++)) || true
fi

echo ""

#------------------------------------------------------------------------------
# Validate template-info.yaml files
#------------------------------------------------------------------------------
print_subsection "Validating template-info.yaml files"

MANDATORY_FIELDS="id version name description category install_type abstract readme logo maintainers links"

validate_template_yaml() {
    local info_file="$1"
    local template_dir
    template_dir="$(dirname "$info_file")"
    local template_name
    template_name="$(basename "$template_dir")"

    if ! _yaml_valid "$info_file"; then
        log_error "$template_name: invalid YAML syntax in template-info.yaml"
        ((ERRORS++)) || true
        return
    fi

    local has_error=false

    for field in $MANDATORY_FIELDS; do
        local value
        value=$(_yaml_field "$info_file" "d['$field']")
        if [[ -z "$value" ]]; then
            log_error "$template_name: missing $field"
            has_error=true
        fi
    done

    local tid category install_type readme
    tid=$(_yaml_field "$info_file" "d.id")
    category=$(_yaml_field "$info_file" "d.category")
    install_type=$(_yaml_field "$info_file" "d.install_type")
    readme=$(_yaml_field "$info_file" "d.readme")

    if [[ -n "$tid" && "$tid" != "$template_name" ]]; then
        log_error "$template_name: id '$tid' does not match directory name"
        has_error=true
    fi

    if [[ -n "$category" ]]; then
        local found=false
        for cid in "${CATEGORY_IDS[@]}"; do
            [[ "$cid" == "$category" ]] && found=true && break
        done
        if [[ "$found" != "true" ]]; then
            log_error "$template_name: category '$category' not defined in any template-categories.yaml"
            has_error=true
        fi
    fi

    if [[ -n "$install_type" && "$install_type" != "app" && "$install_type" != "overlay" && "$install_type" != "stack" ]]; then
        log_error "$template_name: install_type must be 'app', 'overlay', or 'stack', got '$install_type'"
        has_error=true
    fi

    local tags_type
    tags_type=$(_yaml_field "$info_file" "Array.isArray(d.tags) ? 'list' : typeof d.tags")
    if [[ "$tags_type" != "list" ]]; then
        log_error "$template_name: tags must be a YAML list"
        has_error=true
    fi

    if [[ -n "$readme" ]]; then
        local readme_found=false
        [[ -f "$template_dir/$readme" ]] && readme_found=true
        [[ -f "$template_dir/template/$readme" ]] && readme_found=true
        if [[ "$readme_found" != "true" ]]; then
            log_error "$template_name: README file '$readme' not found"
            has_error=true
        fi
    fi

    if [[ "$has_error" == "true" ]]; then
        ((ERRORS++)) || true
    else
        log_success "$template_name — all fields valid"
    fi

    ((TEMPLATES++)) || true
}

for cat_file in "$REPO_ROOT"/*/template-categories.yaml; do
    [[ -f "$cat_file" ]] || continue
    local_dir="$(dirname "$cat_file")"

    for info_file in "$local_dir"/*/template-info.yaml; do
        [[ -f "$info_file" ]] || continue
        validate_template_yaml "$info_file"
    done
done

echo ""
log_info "Validated $CATEGORIES categories, $TEMPLATES templates"

if [[ $ERRORS -gt 0 ]]; then
    log_error "$ERRORS validation error(s)"
    exit 1
fi

log_success "All metadata valid"
