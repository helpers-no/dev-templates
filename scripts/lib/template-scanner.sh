#!/bin/bash
# template-scanner.sh - Template Metadata Extraction Library
#
# Reads TEMPLATE_* fields from TEMPLATE_INFO files using safe line-by-line
# parsing (no sourcing). Adapted from UIS service-scanner.sh.
#
# Usage:
#   source /path/to/template-scanner.sh
#   extract_template_metadata "/path/to/TEMPLATE_INFO"
#   echo "$T_ID $T_NAME $T_CATEGORY"

# Guard against multiple sourcing
[[ -n "${_TEMPLATE_SCANNER_LOADED:-}" ]] && return 0
_TEMPLATE_SCANNER_LOADED=1

# Strip quotes from a value
_strip_quotes() {
    local val="$1"
    val="${val//\"/}"
    val="${val//\'/}"
    echo "$val"
}

# Extract all metadata from a TEMPLATE_INFO file
# Sets T_* variables in the caller's scope
# Usage: extract_template_metadata "/path/to/TEMPLATE_INFO"
extract_template_metadata() {
    local info_file="$1"

    # Reset all fields
    T_ID="" T_VER="" T_NAME="" T_DESCRIPTION="" T_CATEGORY=""
    T_ABSTRACT="" T_TOOLS="" T_README="" T_TAGS="" T_LOGO=""
    T_WEBSITE="" T_DOCS="" T_SUMMARY="" T_RELATED=""

    if [[ ! -f "$info_file" ]]; then
        return 1
    fi

    while IFS= read -r line; do
        case "$line" in
            TEMPLATE_ID=*)
                T_ID=$(_strip_quotes "${line#TEMPLATE_ID=}")
                ;;
            TEMPLATE_VER=*)
                T_VER=$(_strip_quotes "${line#TEMPLATE_VER=}")
                ;;
            TEMPLATE_NAME=*)
                T_NAME=$(_strip_quotes "${line#TEMPLATE_NAME=}")
                ;;
            TEMPLATE_DESCRIPTION=*)
                T_DESCRIPTION=$(_strip_quotes "${line#TEMPLATE_DESCRIPTION=}")
                ;;
            TEMPLATE_CATEGORY=*)
                T_CATEGORY=$(_strip_quotes "${line#TEMPLATE_CATEGORY=}")
                ;;
            TEMPLATE_ABSTRACT=*)
                T_ABSTRACT=$(_strip_quotes "${line#TEMPLATE_ABSTRACT=}")
                ;;
            TEMPLATE_TOOLS=*)
                T_TOOLS=$(_strip_quotes "${line#TEMPLATE_TOOLS=}")
                ;;
            TEMPLATE_README=*)
                T_README=$(_strip_quotes "${line#TEMPLATE_README=}")
                ;;
            TEMPLATE_TAGS=*)
                T_TAGS=$(_strip_quotes "${line#TEMPLATE_TAGS=}")
                ;;
            TEMPLATE_LOGO=*)
                T_LOGO=$(_strip_quotes "${line#TEMPLATE_LOGO=}")
                ;;
            TEMPLATE_WEBSITE=*)
                T_WEBSITE=$(_strip_quotes "${line#TEMPLATE_WEBSITE=}")
                ;;
            TEMPLATE_DOCS=*)
                T_DOCS=$(_strip_quotes "${line#TEMPLATE_DOCS=}")
                ;;
            TEMPLATE_SUMMARY=*)
                T_SUMMARY=$(_strip_quotes "${line#TEMPLATE_SUMMARY=}")
                ;;
            TEMPLATE_RELATED=*)
                T_RELATED=$(_strip_quotes "${line#TEMPLATE_RELATED=}")
                ;;
        esac
    done < "$info_file"

    return 0
}

# Convert space-separated string to JSON array
# Usage: to_json_array "tag1 tag2 tag3"  =>  ["tag1","tag2","tag3"]
to_json_array() {
    local input="$1"
    if [[ -z "$input" ]]; then
        echo "[]"
        return
    fi

    local result="["
    local first=true
    for item in $input; do
        [[ "$first" != "true" ]] && result+=","
        first=false
        result+="\"$item\""
    done
    result+="]"
    echo "$result"
}

# Escape string for JSON output
json_escape() {
    local str="$1"
    str="${str//\\/\\\\}"
    str="${str//\"/\\\"}"
    str="${str//$'\n'/\\n}"
    str="${str//$'\t'/\\t}"
    echo "$str"
}
