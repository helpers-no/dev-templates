#!/bin/bash
# logging.sh - Logging Utilities
#
# Provides colored output functions for consistent logging across scripts.
# Adapted from UIS (helpers-no/urbalurba-infrastructure).
#
# Usage:
#   source /path/to/logging.sh
#   log_info "Processing templates..."
#   log_success "Done"
#   log_warn "Missing optional field"
#   log_error "Validation failed"

# Guard against multiple sourcing
[[ -n "${_LOGGING_LOADED:-}" ]] && return 0
_LOGGING_LOADED=1

# Colors
readonly LOG_RED='\033[0;31m'
readonly LOG_GREEN='\033[0;32m'
readonly LOG_YELLOW='\033[0;33m'
readonly LOG_BLUE='\033[0;34m'
readonly LOG_BOLD='\033[1m'
readonly LOG_NC='\033[0m'

log_info() {
    echo -e "${LOG_BLUE}ℹ${LOG_NC} $*"
}

log_success() {
    echo -e "${LOG_GREEN}✓${LOG_NC} $*"
}

log_warn() {
    echo -e "${LOG_YELLOW}⚠${LOG_NC} $*"
}

log_error() {
    echo -e "${LOG_RED}✗${LOG_NC} $*" >&2
}

log_debug() {
    [[ -n "${DEBUG:-}" ]] && echo -e "${LOG_BLUE}[DEBUG]${LOG_NC} $*"
}

print_section() {
    echo ""
    echo -e "${LOG_BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${LOG_NC}"
    echo -e "${LOG_BOLD}$*${LOG_NC}"
    echo -e "${LOG_BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${LOG_NC}"
}

print_subsection() {
    echo ""
    echo -e "${LOG_BOLD}── $* ──${LOG_NC}"
}
