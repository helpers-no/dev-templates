#!/bin/bash
# validate-metadata.sh - Validate all TEMPLATE_INFO files
#
# Checks that all mandatory fields are present and valid.
# Exits non-zero if any validation fails (blocks CI build).
#
# Usage: bash scripts/validate-metadata.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

source "$SCRIPT_DIR/lib/logging.sh"
source "$SCRIPT_DIR/lib/categories.sh"
source "$SCRIPT_DIR/lib/template-scanner.sh"

print_section "Validating template metadata"

ERRORS=0
TEMPLATES=0

#------------------------------------------------------------------------------
# Validate TEMPLATE_CATEGORIES
#------------------------------------------------------------------------------
print_subsection "Validating TEMPLATE_CATEGORIES"

CATEGORIES_SRC="$REPO_ROOT/scripts/lib/TEMPLATE_CATEGORIES"

# Check source file exists
if [[ ! -f "$CATEGORIES_SRC" ]]; then
    log_error "TEMPLATE_CATEGORIES source not found: $CATEGORIES_SRC"
    ((ERRORS++)) || true
else
    log_success "Source file exists: scripts/lib/TEMPLATE_CATEGORIES"

    # Validate each row has all 7 fields
    while IFS='|' read -r _order _id _name _desc _tags _logo _emoji; do
        [[ -z "$_id" ]] && continue
        local_has_error=false

        [[ -z "$_order" ]] && log_error "Category '$_id': missing ORDER" && local_has_error=true
        [[ -z "$_name" ]] && log_error "Category '$_id': missing NAME" && local_has_error=true
        [[ -z "$_desc" ]] && log_error "Category '$_id': missing DESCRIPTION" && local_has_error=true
        [[ -z "$_tags" ]] && log_error "Category '$_id': missing TAGS" && local_has_error=true
        [[ -z "$_logo" ]] && log_error "Category '$_id': missing LOGO" && local_has_error=true
        [[ -z "$_emoji" ]] && log_error "Category '$_id': missing EMOJI" && local_has_error=true

        if [[ "$local_has_error" == "true" ]]; then
            ((ERRORS++)) || true
        else
            log_success "Category '$_id' — all fields valid"
        fi
    done <<< "$(grep -v "^$" "$CATEGORIES_SRC" | grep -v "^#" | grep -v "^if " | grep -v "^fi" | grep -v "readonly" | grep "|")"

    # Check copies are in sync
    for dir in templates ai-templates; do
        local_copy="$REPO_ROOT/$dir/TEMPLATE_CATEGORIES"
        if [[ ! -f "$local_copy" ]]; then
            log_error "$dir/TEMPLATE_CATEGORIES missing — run CI sync or copy manually"
            ((ERRORS++)) || true
        else
            # Compare the TEMPLATE_CATEGORY_TABLE content only
            local_src_content=$(grep "|" "$CATEGORIES_SRC" || true)
            local_copy_content=$(grep "|" "$local_copy" || true)
            if [[ "$local_src_content" != "$local_copy_content" ]]; then
                log_error "$dir/TEMPLATE_CATEGORIES is out of sync with scripts/lib/TEMPLATE_CATEGORIES"
                ((ERRORS++)) || true
            else
                log_success "$dir/TEMPLATE_CATEGORIES in sync"
            fi
        fi
    done
fi

echo ""

# Mandatory fields — must be non-empty
MANDATORY_FIELDS="T_ID T_VER T_NAME T_DESCRIPTION T_CATEGORY T_ABSTRACT T_README T_TAGS T_LOGO T_DOCS T_SUMMARY"
# Fields that must exist but can be empty
OPTIONAL_VALUE_FIELDS="T_TOOLS T_RELATED T_WEBSITE"

validate_template() {
    local info_file="$1"
    local template_dir
    template_dir="$(dirname "$info_file")"
    local template_name
    template_name="$(basename "$template_dir")"

    extract_template_metadata "$info_file"

    local has_error=false

    # Check mandatory fields
    for field in $MANDATORY_FIELDS; do
        local value="${!field}"
        if [[ -z "$value" ]]; then
            log_error "$template_name: missing $field"
            has_error=true
        fi
    done

    # Validate category
    if [[ -n "$T_CATEGORY" ]] && ! is_valid_category "$T_CATEGORY"; then
        log_error "$template_name: invalid TEMPLATE_CATEGORY '$T_CATEGORY'"
        has_error=true
    fi

    # Validate ID matches directory name
    if [[ -n "$T_ID" && "$T_ID" != "$template_name" ]]; then
        log_warn "$template_name: TEMPLATE_ID '$T_ID' does not match directory name"
    fi

    # Validate README file exists
    if [[ -n "$T_README" ]]; then
        local readme_found=false
        # Check app template path
        if [[ -f "$template_dir/$T_README" ]]; then
            readme_found=true
        fi
        # Check ai template path (template/ subdirectory)
        if [[ -f "$template_dir/template/$T_README" ]]; then
            readme_found=true
        fi
        if [[ "$readme_found" != "true" ]]; then
            log_error "$template_name: README file '$T_README' not found"
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

# Scan app templates
for info_file in "$REPO_ROOT"/templates/*/TEMPLATE_INFO; do
    [[ -f "$info_file" ]] || continue
    validate_template "$info_file"
done

# Scan AI templates
for info_file in "$REPO_ROOT"/ai-templates/*/TEMPLATE_INFO; do
    [[ -f "$info_file" ]] || continue
    validate_template "$info_file"
done

echo ""
log_info "Validated $TEMPLATES templates"

if [[ $ERRORS -gt 0 ]]; then
    log_error "$ERRORS template(s) have validation errors"
    exit 1
fi

log_success "All templates valid"
