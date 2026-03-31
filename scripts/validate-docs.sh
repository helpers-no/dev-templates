#!/bin/bash
# validate-docs.sh — Validate markdown files for MDX compatibility and structure
#
# Reads rules from validate-rules.conf and checks all markdown files.
# Also checks for broken internal markdown links.
#
# Usage: bash scripts/validate-docs.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RULES_FILE="$SCRIPT_DIR/validate-rules.conf"
DOCS_DIR="$REPO_ROOT/website/docs"

# Source logging if available
if [[ -f "$SCRIPT_DIR/lib/logging.sh" ]]; then
    source "$SCRIPT_DIR/lib/logging.sh"
else
    log_info() { echo "[INFO] $*"; }
    log_success() { echo "[OK] $*"; }
    log_warn() { echo "[WARN] $*"; }
    log_error() { echo "[ERROR] $*" >&2; }
    print_section() { echo "=== $* ==="; }
    print_subsection() { echo "--- $* ---"; }
fi

ERRORS=0
WARNINGS=0

# ============================================================
# Strip code fences from a file (returns content outside fences)
# This prevents false positives on patterns inside code blocks
# ============================================================
_strip_code_fences() {
    local file="$1"
    awk '
        /^```/ { in_fence = !in_fence; next }
        !in_fence { print }
    ' "$file"
}

# ============================================================
# Check: required_heading
# Verifies a ## heading exists (case-insensitive)
# ============================================================
_check_required_heading() {
    local file="$1"
    local heading="$2"
    local severity="$3"

    if ! grep -qi "^## .*${heading}" "$file"; then
        if [[ "$severity" == "error" ]]; then
            log_error "$(basename "$file"): missing required heading '## ${heading}'"
            ((ERRORS++)) || true
        else
            log_warn "$(basename "$file"): missing optional heading '## ${heading}'"
            ((WARNINGS++)) || true
        fi
        return 1
    fi
    return 0
}

# ============================================================
# Check: forbidden_pattern
# Verifies a regex pattern does NOT appear outside code fences
# ============================================================
_check_forbidden_pattern() {
    local file="$1"
    local pattern="$2"
    local severity="$3"

    local matches
    matches=$(_strip_code_fences "$file" | grep -n "$pattern" 2>/dev/null || true)

    if [[ -n "$matches" ]]; then
        while IFS= read -r match; do
            [[ -z "$match" ]] && continue
            if [[ "$severity" == "error" ]]; then
                log_error "$(basename "$file"):${match%%:*}: forbidden pattern '${pattern}' — ${match#*:}"
                ((ERRORS++)) || true
            else
                log_warn "$(basename "$file"):${match%%:*}: pattern '${pattern}' — ${match#*:}"
                ((WARNINGS++)) || true
            fi
        done <<< "$matches"
        return 1
    fi
    return 0
}

# ============================================================
# Check: broken internal links
# Finds [text](path.md) links and verifies the target exists
# ============================================================
_check_broken_links() {
    local file="$1"
    local file_dir
    file_dir="$(dirname "$file")"

    # Extract markdown links outside code fences and blockquotes: [text](path.md)
    # Also strip inline code (`...`) to avoid matching example links
    local links
    links=$(_strip_code_fences "$file" | grep -v "^>" | sed 's/`[^`]*`//g' | grep -oE '\]\([^)]+\.md\)' 2>/dev/null | sed 's/\](//' | sed 's/)//' || true)

    while IFS= read -r link; do
        [[ -z "$link" ]] && continue
        # Skip external links
        [[ "$link" == http* ]] && continue
        # Skip obvious example/placeholder links
        [[ "$link" == "path.md" ]] && continue
        # Skip links referencing target project paths (not our docs)
        [[ "$link" == docs/* ]] && continue

        # Resolve relative path
        local target="$file_dir/$link"
        if [[ ! -f "$target" ]]; then
            log_error "$(basename "$file"): broken link → $link"
            ((ERRORS++)) || true
        fi
    done <<< "$links"
}

# ============================================================
# Apply rules from config file
# ============================================================
_apply_rules() {
    local target_dir="$1"

    while IFS='|' read -r file_pattern rule_type value severity; do
        # Skip comments and empty lines
        [[ -z "$file_pattern" || "$file_pattern" == \#* ]] && continue
        # Trim whitespace
        file_pattern=$(echo "$file_pattern" | xargs)
        rule_type=$(echo "$rule_type" | xargs)
        value=$(echo "$value" | xargs)
        severity=$(echo "$severity" | xargs)

        [[ -z "$rule_type" ]] && continue

        # Find matching files
        while IFS= read -r file; do
            [[ -z "$file" || ! -f "$file" ]] && continue

            case "$rule_type" in
                required_heading)
                    _check_required_heading "$file" "$value" "$severity" || true
                    ;;
                forbidden_pattern)
                    _check_forbidden_pattern "$file" "$value" "$severity" || true
                    ;;
            esac
        done < <(find "$target_dir" -name "$file_pattern" -type f 2>/dev/null)

    done < "$RULES_FILE"
}

# ============================================================
# Main
# ============================================================

print_section "Validating documentation"

if [[ ! -f "$RULES_FILE" ]]; then
    log_error "Rules file not found: $RULES_FILE"
    exit 1
fi

if [[ ! -d "$DOCS_DIR" ]]; then
    log_error "Docs directory not found: $DOCS_DIR"
    exit 1
fi

# Apply config-based rules
print_subsection "Checking rules from validate-rules.conf"
_apply_rules "$DOCS_DIR"

# Also check template READMEs in templates/ and ai-templates/
_apply_rules "$REPO_ROOT/templates"
_apply_rules "$REPO_ROOT/ai-templates"

# Check broken links in all docs
print_subsection "Checking internal links"
link_errors_before=$ERRORS
while IFS= read -r file; do
    _check_broken_links "$file"
done < <(find "$DOCS_DIR" -name "*.md" -type f)

link_errors=$((ERRORS - link_errors_before))
if [[ $link_errors -eq 0 ]]; then
    log_success "All internal links valid"
fi

# Summary
echo ""
log_info "Errors: $ERRORS  Warnings: $WARNINGS"

if [[ $ERRORS -gt 0 ]]; then
    log_error "Validation failed with $ERRORS error(s)"
    exit 1
fi

log_success "All documentation valid"
