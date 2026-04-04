#!/bin/bash
# generate-registry.sh — Generate template-registry.json from YAML source files
#
# Wrapper that runs the TypeScript generation script via tsx.
# Requires: node, tsx, js-yaml (in website/node_modules)
#
# Usage: bash scripts/generate-registry.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

# tsx is available globally in the devcontainer and via npx in CI
if command -v tsx &>/dev/null; then
  tsx "$SCRIPT_DIR/generate-registry.ts"
else
  npx --prefix "$REPO_ROOT/website" tsx "$SCRIPT_DIR/generate-registry.ts"
fi
