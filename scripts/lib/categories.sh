#!/bin/bash
# categories.sh - Template Category Definitions
#
# Defines the categories used to organize templates.
# Adapted from UIS (helpers-no/urbalurba-infrastructure).
# Compatible with bash 3.x (macOS default) and bash 4.x+
#
# Usage:
#   source /path/to/categories.sh
#   get_category_name "WEB_SERVER"    # Returns "Web Server Templates"
#   is_valid_category "WEB_APP"       # Returns 0 (true)

# Guard against multiple sourcing
[[ -n "${_CATEGORIES_LOADED:-}" ]] && return 0
_CATEGORIES_LOADED=1

# Source the canonical category definitions
_CATEGORIES_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$_CATEGORIES_SCRIPT_DIR/TEMPLATE_CATEGORIES"

# Build indexed arrays from TEMPLATE_CATEGORY_TABLE (bash 3.x compatible)
_CATEGORY_DATA=()
CATEGORY_ORDER=()
while IFS='|' read -r _order _id _name _desc _tags _logo _emoji; do
    [[ -z "$_id" ]] && continue
    _CATEGORY_DATA+=("${_id}|${_name}|${_desc}|${_tags}|${_logo}|${_emoji}")
    CATEGORY_ORDER+=("$_id")
done <<< "$(echo "$TEMPLATE_CATEGORY_TABLE" | grep -v "^$")"

# Internal: Find category data by ID
_find_category_data() {
    local cat_id="$1"
    local entry
    for entry in "${_CATEGORY_DATA[@]}"; do
        local id="${entry%%|*}"
        if [[ "$id" == "$cat_id" ]]; then
            echo "$entry"
            return 0
        fi
    done
    return 1
}

# Get display name for a category
get_category_name() {
    local cat_id="$1"
    local data
    data=$(_find_category_data "$cat_id") || return 1
    local rest="${data#*|}"
    echo "${rest%%|*}"
}

# Get description for a category
get_category_description() {
    local cat_id="$1"
    local data
    data=$(_find_category_data "$cat_id") || return 1
    local rest="${data#*|}"
    rest="${rest#*|}"
    echo "${rest%%|*}"
}

# Get tags for a category
get_category_tags() {
    local cat_id="$1"
    local data
    data=$(_find_category_data "$cat_id") || return 1
    local rest="${data#*|}"
    rest="${rest#*|}"
    rest="${rest#*|}"
    echo "${rest%%|*}"
}

# Get icon for a category
get_category_icon() {
    local cat_id="$1"
    local data
    data=$(_find_category_data "$cat_id") || return 1
    local rest="${data#*|}"
    rest="${rest#*|}"
    rest="${rest#*|}"
    rest="${rest#*|}"
    echo "${rest%%|*}"
}

# Get logo filename for a category
# Format: ID|Name|Description|Tags|Logo|Emoji — logo is 5th field
get_category_logo() {
    local cat_id="$1"
    local data
    data=$(_find_category_data "$cat_id") || return 1
    local rest="${data#*|}"      # Remove ID|
    rest="${rest#*|}"            # Remove Name|
    rest="${rest#*|}"            # Remove Description|
    rest="${rest#*|}"            # Remove Tags|
    echo "${rest%%|*}"           # Get Logo (before Emoji|)
}

# Get emoji for a category
get_category_emoji() {
    local cat_id="$1"
    local data
    data=$(_find_category_data "$cat_id") || return 1
    echo "${data##*|}"
}

# Check if a category ID is valid
is_valid_category() {
    local cat_id="$1"
    _find_category_data "$cat_id" >/dev/null 2>&1
}

# List all category IDs in display order
list_categories() {
    local cat_id
    for cat_id in "${CATEGORY_ORDER[@]}"; do
        echo "$cat_id"
    done
}

# Generate JSON output for categories
generate_categories_json_internal() {
    echo '{"categories": ['
    local first=true
    local order=0
    local cat_id

    for cat_id in "${CATEGORY_ORDER[@]}"; do
        [[ "$first" != "true" ]] && echo ","
        first=false

        local name desc tags icon logo
        name=$(get_category_name "$cat_id")
        desc=$(get_category_description "$cat_id")
        tags=$(get_category_tags "$cat_id")
        icon=$(get_category_icon "$cat_id")
        logo=$(get_category_logo "$cat_id")

        cat <<EOF
    {
      "id": "$cat_id",
      "name": "$name",
      "order": $order,
      "description": "$desc",
      "tags": "$tags",
      "icon": "$icon",
      "logo": "$logo"
    }
EOF
        ((++order))
    done

    echo ']}'
}

# Print categories in a formatted table
print_categories_table() {
    printf "%-15s %-30s %s\n" "ID" "NAME" "DESCRIPTION"
    printf "%-15s %-30s %s\n" "───────────────" "──────────────────────────────" "───────────────────────────"

    local cat_id
    for cat_id in "${CATEGORY_ORDER[@]}"; do
        local name desc
        name=$(get_category_name "$cat_id")
        desc=$(get_category_description "$cat_id")
        printf "%-15s %-30s %s\n" "$cat_id" "$name" "$desc"
    done
}
