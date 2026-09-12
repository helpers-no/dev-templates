#!/bin/bash
# emit-application-entry.sh — hand a tester the exact registry entry you intend to
# publish, before publishing it. And later, prove you published those same bytes.
#
# Why this exists (urb-agents #737): for a change whose blast radius is external,
# the tester verifies BEFORE the catalogue is updated. If it composes its own local
# entry, stage 2 tests the artifact and says nothing about the entry. Handing over
# the real entry collapses the residual risk from "is the entry correct?" to "did
# dev-templates publish the same bytes it handed over?" — a diff, not a judgement.
#
# Two modes:
#
#   emit    generate the entry from the working tree and write it out, plus a
#           complete one-entry registry a tester can point REGISTRY_URL_PRIMARY at
#           as a file:// URL
#
#   check   compare the entry now in the working tree against a previously emitted
#           file, so the diff at publish time is mechanical
#
# ⚠️ Emitting runs the generator, which rewrites website/src/data/template-registry.json
# in the working tree. That is expected mid-bump — but it means the tree carries an
# unpublished pin while the tester works. Do not push until the verdict is in.
#
# Usage:
#   scripts/emit-application-entry.sh --app atlas --out /tmp/atlas-entry
#   scripts/emit-application-entry.sh --app atlas --check /tmp/atlas-entry.entry.json

set -uo pipefail

APP=""; OUT=""; CHECK=""
while [ $# -gt 0 ]; do
  case "$1" in
    --app) APP="${2:?}"; shift 2 ;;
    --out) OUT="${2:?}"; shift 2 ;;
    --check) CHECK="${2:?}"; shift 2 ;;
    -h|--help) printf 'usage: %s --app <id> [--out <prefix> | --check <file>]\n' "$0"; exit 0 ;;
    *) printf 'unknown argument: %s\n' "$1" >&2; exit 2 ;;
  esac
done
[ -n "$APP" ] || { printf 'need --app\n' >&2; exit 2; }
[ -n "$OUT" ] || [ -n "$CHECK" ] || { printf 'need --out or --check\n' >&2; exit 2; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REGISTRY="$REPO_ROOT/website/src/data/template-registry.json"

command -v bun >/dev/null 2>&1 || command -v node >/dev/null 2>&1 || {
  printf 'need bun or node on PATH (try: export PATH="/opt/homebrew/bin:$PATH")\n' >&2; exit 2; }
RUNNER=bun; command -v bun >/dev/null 2>&1 || RUNNER="npx tsx"

# Regenerate so the entry reflects the working tree, not a stale committed file.
( cd "$REPO_ROOT" && $RUNNER run scripts/generate-registry.ts ) >/tmp/_emit_gen.log 2>&1 || {
  printf 'generate-registry.ts failed:\n' >&2; tail -20 /tmp/_emit_gen.log >&2; exit 1; }

ENTRY="$(jq -S --arg id "$APP" '.templates[] | select(.id==$id)' "$REGISTRY")"
[ -n "$ENTRY" ] || { printf 'no entry with id %s in the generated registry\n' "$APP" >&2; exit 1; }

if [ -n "$CHECK" ]; then
  [ -f "$CHECK" ] || { printf 'no such file: %s\n' "$CHECK" >&2; exit 2; }
  if diff -u <(jq -S . "$CHECK") <(printf '%s\n' "$ENTRY") >/tmp/_emit_diff.txt; then
    printf '\n\033[0;32mIDENTICAL\033[0m — the entry in the working tree is byte-for-byte what was handed over.\n'
    printf '  %s\n\n' "$CHECK"
    exit 0
  fi
  printf '\n\033[0;31mDIFFERS\033[0m — the working tree does NOT match what was handed over:\n\n'
  cat /tmp/_emit_diff.txt
  printf '\nDo not publish until this is explained. The tester verified the left-hand side.\n\n'
  exit 1
fi

printf '%s\n' "$ENTRY" > "$OUT.entry.json"

# A complete registry the tester can serve over file://, carrying only this entry and
# the categories it needs. UIS joins template.category to a category whose context is
# "uis", so the category must travel with it.
jq -S --arg id "$APP" '
  {generated, dctDocsBase, uisDocsBase,
   categories: [.categories[] | select(.context=="uis")],
   templates: [.templates[] | select(.id==$id)]}' "$REGISTRY" > "$OUT.registry.json"

TAG="$(printf '%s' "$ENTRY" | jq -r '.source.tag // "—"')"
DIG="$(printf '%s' "$ENTRY" | jq -r '.source.digest // "—"')"
printf '\nEntry for \033[1m%s\033[0m, generated from the working tree:\n' "$APP"
printf '  tag     %s\n  digest  %s\n\n' "$TAG" "$DIG"
printf '  entry only          %s\n' "$OUT.entry.json"
printf '  one-entry registry  %s\n' "$OUT.registry.json"
printf '\nHand the tester the registry file and have it point REGISTRY_URL_PRIMARY at it:\n'
printf '  REGISTRY_URL_PRIMARY="file:///path/to/%s"\n' "$(basename "$OUT.registry.json")"
printf '\nKeep %s. At publish time run --check against it: the difference\n' "$OUT.entry.json"
printf 'between what was verified and what shipped is then a diff, not a judgement.\n\n'
