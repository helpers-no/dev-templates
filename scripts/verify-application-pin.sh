#!/bin/bash
# verify-application-pin.sh — check a proposed application pin before committing it.
#
# Turns the three-source digest check from RUNBOOK-application-pin-bump.md into a
# command, because the check was discipline rather than enforcement and discipline is
# what fails on the tenth bump at 03:00.
#
# What it asserts, exiting non-zero on any failure:
#   1. the release asset for <tag> exists and names a digest
#   2. GHCR's docker-content-digest for <tag> equals it
#   3. --expect-digest, if given, equals both        (what you are about to commit)
#   4. the artifact blob pulled AT that digest hashes to what the manifest declares
#   5. the decoded template-info.yaml says kind: application, id: <app>,
#      and its own tag: equals <tag>
#
# It also writes the artifact's template-info.yaml to a file, because re-deriving the
# prose from its `operational:` block is step 4 of the runbook and the step that gets
# forgotten.
#
# Read-only: touches no file in the repository and commits nothing.
#
# Usage:
#   scripts/verify-application-pin.sh --app atlas --tag v20260910-bfda7b6
#   scripts/verify-application-pin.sh --app atlas --tag <tag> --expect-digest sha256:...
#
# Needs curl and python3 only — no bun, no node, no oras.

set -uo pipefail

APP=""; TAG=""; EXPECT=""; RELEASE_REPO=""; OUT="/tmp/artifact-template-info.yaml"
while [ $# -gt 0 ]; do
  case "$1" in
    --app) APP="${2:?}"; shift 2 ;;
    --tag) TAG="${2:?}"; shift 2 ;;
    --expect-digest) EXPECT="${2:?}"; shift 2 ;;
    --release-repo) RELEASE_REPO="${2:?}"; shift 2 ;;
    --out) OUT="${2:?}"; shift 2 ;;
    -h|--help)
      printf 'usage: %s --app <id> --tag <tag> [--expect-digest sha256:...] [--release-repo owner/name] [--out path]\n' "$0"; exit 0 ;;
    *) printf 'unknown argument: %s\n' "$1" >&2; exit 2 ;;
  esac
done
[ -n "$APP" ] && [ -n "$TAG" ] || { printf 'need --app and --tag\n' >&2; exit 2; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
INFO="$REPO_ROOT/uis-applications/$APP/template-info.yaml"
[ -f "$INFO" ] || { printf 'no committed entry at %s\n' "$INFO" >&2; exit 2; }

FAIL=0
ok()   { printf '  \033[0;32m✓\033[0m %s\n' "$1"; }
bad()  { printf '  \033[0;31m✗\033[0m %s\n' "$1"; FAIL=1; }
note() { printf '    %s\n' "$1"; }

# The artifact repo comes from the committed entry rather than a flag: the thing being
# verified should be named by the file that will carry the pin.
ARTIFACT="$(sed -n 's/^[[:space:]]*artifact:[[:space:]]*//p' "$INFO" | head -1)"
[ -n "$ARTIFACT" ] || { printf 'no source.artifact in %s\n' "$INFO" >&2; exit 2; }
REGISTRY="${ARTIFACT%%/*}"                 # ghcr.io
REPO_PATH="${ARTIFACT#*/}"                 # owner/image/uis
[ "$REGISTRY" = "ghcr.io" ] || { printf 'only ghcr.io is handled, got %s\n' "$REGISTRY" >&2; exit 2; }

# Release repo: default to the first github.com/<owner>/<repo> in the entry's links.
if [ -z "$RELEASE_REPO" ]; then
  RELEASE_REPO="$(sed -n 's#.*https://github.com/\([A-Za-z0-9_.-]\{1,\}/[A-Za-z0-9_.-]\{1,\}\).*#\1#p' "$INFO" | head -1)"
fi
[ -n "$RELEASE_REPO" ] || { printf 'could not determine the release repo; pass --release-repo\n' >&2; exit 2; }

printf '\nVerifying %s at %s\n' "$APP" "$TAG"
printf '  artifact     %s\n  release repo %s\n\n' "$ARTIFACT" "$RELEASE_REPO"

# ── 1. the release asset ──────────────────────────────────────────────────────────
ASSET_URL="https://github.com/$RELEASE_REPO/releases/download/$TAG/uis-artifact.json"
ASSET_JSON="$(curl -sL --max-time 30 "$ASSET_URL")"
ASSET_DIGEST="$(printf '%s' "$ASSET_JSON" | python3 -c '
import json,sys
try: print(json.load(sys.stdin).get("digest",""))
except Exception: print("")' 2>/dev/null)"

if [ -z "$ASSET_DIGEST" ]; then
  # A missing asset is "not adoptable yet", not a corrupt pin -- artifacts published
  # before the asset existed have none (tor-agent, urb-agents #479).
  bad "no release asset digest at $ASSET_URL"
  note "if this artifact predates the release asset, it is NOT ADOPTABLE by this check;"
  note "verify by hand per the runbook and say so on the bus."
else
  ok "release asset names $ASSET_DIGEST"
  ASSET_TAG="$(printf '%s' "$ASSET_JSON" | python3 -c 'import json,sys;print(json.load(sys.stdin).get("tag",""))')"
  [ "$ASSET_TAG" = "$TAG" ] && ok "asset tag matches" || bad "asset tag is '$ASSET_TAG', expected '$TAG'"
fi

# ── 2. GHCR's own answer for that tag ─────────────────────────────────────────────
scope_for() { printf '%s' "$1" | sed 's#/#%2F#g'; }
tok_for() {
  curl -s "https://ghcr.io/token?scope=repository%3A$(scope_for "$1")%3Apull&service=ghcr.io" \
    | python3 -c 'import json,sys
try: print(json.load(sys.stdin)["token"])
except Exception: print("")'
}
TOK="$(tok_for "$REPO_PATH")"
[ -n "$TOK" ] || { bad "could not get an anonymous pull token for $REPO_PATH"; printf '\nFAILED\n'; exit 1; }

GHCR_DIGEST="$(curl -sI -H "Authorization: Bearer $TOK" \
  -H "Accept: application/vnd.oci.image.manifest.v1+json" \
  -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
  "https://ghcr.io/v2/$REPO_PATH/manifests/$TAG" \
  | tr -d '\r' | sed -n 's/^[Dd]ocker-[Cc]ontent-[Dd]igest:[[:space:]]*//p' | head -1)"

if [ -z "$GHCR_DIGEST" ]; then
  bad "GHCR returned no digest for tag $TAG (does the tag exist?)"
elif [ -n "$ASSET_DIGEST" ] && [ "$GHCR_DIGEST" != "$ASSET_DIGEST" ]; then
  bad "GHCR and the release asset DISAGREE"
  note "ghcr  $GHCR_DIGEST"
  note "asset $ASSET_DIGEST"
  note "do not pin this. the tag may have been re-pointed since the asset was written."
else
  ok "GHCR docker-content-digest agrees"
fi

DIGEST="${ASSET_DIGEST:-$GHCR_DIGEST}"

# ── 3. what you are about to commit ───────────────────────────────────────────────
if [ -n "$EXPECT" ]; then
  [ "$EXPECT" = "$DIGEST" ] && ok "--expect-digest matches" \
    || { bad "--expect-digest does NOT match"; note "given    $EXPECT"; note "resolved $DIGEST"; }
fi

# ── 4 + 5. pull the artifact AT the digest and decode it ──────────────────────────
if [ -n "$DIGEST" ]; then
  MAN="$(curl -s -H "Authorization: Bearer $TOK" \
    -H "Accept: application/vnd.oci.image.manifest.v1+json" \
    "https://ghcr.io/v2/$REPO_PATH/manifests/$DIGEST")"
  BLOB="$(printf '%s' "$MAN" | python3 -c '
import json,sys
try:
    m=json.load(sys.stdin)
    print([l["digest"] for l in m.get("layers",[])
           if l.get("annotations",{}).get("org.opencontainers.image.title")=="template-info.yaml"][0])
except Exception: print("")')"
  if [ -z "$BLOB" ]; then
    bad "no template-info.yaml layer in the manifest at $DIGEST"
  else
    curl -sL -H "Authorization: Bearer $TOK" "https://ghcr.io/v2/$REPO_PATH/blobs/$BLOB" -o /tmp/_pin_blob.tar
    python3 - "$BLOB" "$APP" "$TAG" "$OUT" <<'PY'
import sys,tarfile,hashlib,re
blob,app,tag,out=sys.argv[1:5]
raw=open('/tmp/_pin_blob.tar','rb').read()
actual="sha256:"+hashlib.sha256(raw).hexdigest()
fails=[]
if actual!=blob: fails.append(f"blob hash {actual} != manifest layer digest {blob}")
try:
    t=tarfile.open('/tmp/_pin_blob.tar')
    data=t.extractfile(t.getnames()[0]).read().decode()
except Exception:
    data=raw.decode('utf8','replace')
open(out,'w').write(data)
def top(key):
    m=re.search(rf'^{key}:[ \t]*(.+?)[ \t]*$', data, re.M)
    return m.group(1) if m else None
def nested(key):
    m=re.search(rf'^[ \t]+{key}:[ \t]*(.+?)[ \t]*$', data, re.M)
    return m.group(1) if m else None
kind=top('kind'); aid=top('id'); atag=top('tag') or nested('tag')
if kind!='application': fails.append(f"kind is {kind!r}, expected 'application'")
if aid!=app:           fails.append(f"artifact id is {aid!r}, expected {app!r} (UIS refuses a mismatch)")
if atag!=tag:          fails.append(f"artifact's own tag is {atag!r}, expected {tag!r}")
has_op = re.search(r'^operational:', data, re.M) is not None
# From atlas PR #250 the code_location block carries its own `digest:` beside `tag:`.
# That is the IMAGE digest and is NOT the artifact digest being pinned. The script
# never reads it -- this exists so a human reading the decoded file at 02:00 does not
# copy the wrong one. Two digests in one file is a trap worth labelling.
cl_digest = re.search(r'^[ \t]+digest:[ \t]*(\S+)', data, re.M)
jobs = re.search(r'^\s*jobs:\s*\[(.*?)\]', data, re.M|re.S)
for f in fails: print("FAIL "+f)
print("INFO blob hash matches manifest" if actual==blob else "")
print(f"INFO kind={kind} id={aid} tag={atag}")
print(f"INFO operational block present: {has_op}")
if cl_digest:
    print(f"NOTE the definition also carries a code-location IMAGE digest: {cl_digest.group(1)[:26]}…")
    print("NOTE that is NOT the artifact digest you pin. The artifact digest is the one")
    print("NOTE this script resolved and printed above.")
if jobs:
    js=[j.strip() for j in jobs.group(1).split(',') if j.strip()]
    print(f"INFO first_data.jobs ({len(js)}, order matters): {', '.join(js)}")
elif has_op:
    print("WARN operational present but first_data.jobs is not an inline sequence -- read it by hand;")
    print("WARN a scalar there yields one job name and no complaint from anything")
print(f"INFO decoded artifact written to {out}")
sys.exit(1 if fails else 0)
PY
    rc=$?
    [ $rc -eq 0 ] && ok "artifact decodes and identifies itself correctly" || bad "artifact self-identification failed (see FAIL lines above)"
  fi
fi

printf '\n'
if [ "$FAIL" -eq 0 ]; then
  printf '\033[0;32mPASS\033[0m — safe to pin %s\n' "$DIGEST"
  printf 'Next: runbook step 4 — re-derive the prose from operational: in %s\n\n' "$OUT"
  exit 0
fi
printf '\033[0;31mFAIL\033[0m — do not pin. Nothing was written to the repository.\n\n'
exit 1
