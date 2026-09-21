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

APP=""; TAG=""; EXPECT=""; RELEASE_REPO=""; OUT="/tmp/artifact-template-info.yaml"; DRIFT=""; AWAIT=""; AWAIT_TIMEOUT=600
while [ $# -gt 0 ]; do
  case "$1" in
    --app) APP="${2:?}"; shift 2 ;;
    --tag) TAG="${2:?}"; shift 2 ;;
    --expect-digest) EXPECT="${2:?}"; shift 2 ;;
    --release-repo) RELEASE_REPO="${2:?}"; shift 2 ;;
    --out) OUT="${2:?}"; shift 2 ;;
    --drift) DRIFT=1; shift ;;
    --await) AWAIT="${2:?}"; shift 2 ;;
    --await-timeout) AWAIT_TIMEOUT="${2:?}"; shift 2 ;;
    -h|--help)
      printf 'usage: %s --app <id> --tag <tag> [--expect-digest sha256:...] [--release-repo owner/name] [--out path]\n' "$0"; exit 0 ;;
    *) printf 'unknown argument: %s\n' "$1" >&2; exit 2 ;;
  esac
done
[ -n "$APP" ] || { printf 'need --app\n' >&2; exit 2; }
[ -n "$TAG" ] || [ -n "$DRIFT" ] || [ -n "$AWAIT" ] || { printf 'need --tag (or --drift / --await)\n' >&2; exit 2; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
INFO="$REPO_ROOT/uis-applications/$APP/template-info.yaml"
[ -f "$INFO" ] || { printf 'no committed entry at %s\n' "$INFO" >&2; exit 2; }

tok_for_early() {
  curl -s "https://ghcr.io/token?scope=repository%3A$(printf '%s' "$1" | sed 's#/#%2F#g')%3Apull&service=ghcr.io" \
    | python3 -c 'import json,sys
try: print(json.load(sys.stdin)["token"])
except Exception: print("")'
}

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

# ── await: wait until the PUBLISHED catalogue actually serves a tag ────────────────
#
# raw.githubusercontent.com caches for five minutes (max-age=300), so a push is not
# visible to UIS immediately. Telling an installer to clear its cache inside that
# window makes it re-fetch the STALE pin and hold it for an hour.
#
# 🔴 Why this is a command and not a one-liner: the obvious loop —
#     until [ "$(curl -s URL | jq -r .…tag)" = "$TAG" ]; do sleep 15; done
# is SATISFIED BY A 404. A wrong path and an un-propagated push look identical to it,
# so it waits forever on a typo. imac hit exactly that (urb-agents #776). This asserts
# valid JSON containing an entry for the app whose tag matches, and says WHICH of those
# failed.
if [ -n "$AWAIT" ]; then
  RAW_URL="https://raw.githubusercontent.com/helpers-no/dev-templates/main/website/src/data/template-registry.json"
  printf '\nWaiting for the published catalogue to serve %s (timeout %ss)\n' "$AWAIT" "$AWAIT_TIMEOUT"
  printf '  %s\n\n' "$RAW_URL"
  _waited=0
  while :; do
    BODY="$(curl -s --max-time 20 -w '\n%{http_code}' "$RAW_URL")"
    CODE="$(printf '%s' "$BODY" | tail -1)"
    JSON="$(printf '%s' "$BODY" | sed '$d')"
    STATE="$(printf '%s' "$JSON" | CODE="$CODE" APP="$APP" WANT="$AWAIT" python3 -c '
import json,sys,os
code=os.environ["CODE"]
if code!="200":
    print("HTTP "+code); sys.exit()
try: d=json.load(sys.stdin)
except Exception as e:
    print("NOTJSON "+str(e)[:40]); sys.exit()
ts=[t for t in d.get("templates",[]) if t.get("id")==os.environ["APP"]]
if not ts: print("NOENTRY"); sys.exit()
tag=(ts[0].get("source") or {}).get("tag","")
print("MATCH" if tag==os.environ["WANT"] else "OLDTAG "+tag)')"
    case "$STATE" in
      MATCH) ok "catalogue now serves $AWAIT (after ${_waited}s)"; exit 0 ;;
      "OLDTAG "*) printf '  ...still serving %s (%ss)\n' "${STATE#OLDTAG }" "$_waited" ;;
      "HTTP "*)
        bad "the URL returned ${STATE#HTTP } — that is a BROKEN URL, not a slow CDN"
        note "a 404 and an un-propagated push are indistinguishable if you only watch the tag"
        exit 1 ;;
      NOTJSON*)
        bad "the URL did not return JSON (${STATE#NOTJSON }) — broken URL or a partial response"
        exit 1 ;;
      NOENTRY)
        bad "valid JSON, but it contains no entry with id '$APP'"
        note "wrong registry, or the entry was dropped — either way not a propagation delay"
        exit 1 ;;
    esac
    _waited=$((_waited + 15))
    [ "$_waited" -ge "$AWAIT_TIMEOUT" ] && { bad "still not serving $AWAIT after ${_waited}s"; exit 1; }
    sleep 15
  done
fi

# ── drift: is the PUBLISHED catalogue behind what the application has published? ──
#
# The chain's detection gap (urb-agents #764): nominations can be made on threads
# this agent is not on, so a ring may never arrive and a stale pin is silent. This
# asks the two registries directly and needs no ring, no thread and no nomination.
if [ -n "$DRIFT" ]; then
  LIVE_URL="https://raw.githubusercontent.com/helpers-no/dev-templates/main/website/src/data/template-registry.json"
  LIVE_TAG="$(curl -s --max-time 30 "$LIVE_URL" | python3 -c '
import json,sys
try:
    d=json.load(sys.stdin)
    print([t for t in d["templates"] if t["id"]==sys.argv[1]][0]["source"]["tag"])
except Exception: print("")' "$APP")"
  TOKD="$(tok_for_early "$REPO_PATH")"
  # ⚠️ tags/list SILENTLY TRUNCATES. Without ?n it returned exactly 100 tags for a
  # repository holding 118, and the 18 it dropped included the tag being nominated
  # (urb-agents #1323). A truncated list is indistinguishable from a complete one, so
  # "newest" was computed from a subset and could name the wrong tag — or miss a newer
  # one entirely and report the catalogue as current when it is behind.
  # Ask for more than we expect, and say so loudly if we hit the ceiling anyway.
  NEWEST="$(curl -s -H "Authorization: Bearer $TOKD" "https://ghcr.io/v2/$REPO_PATH/tags/list?n=1000" \
    | python3 -c '
import json,sys,subprocess
tags=json.load(sys.stdin).get("tags",[])
if len(tags) >= 1000:
    sys.stderr.write("TRUNCATED\n")
best=None
for t in tags:
    try:
        out=subprocess.run(["curl","-sL","--max-time","12",
            f"https://github.com/{sys.argv[1]}/releases/download/{t}/uis-artifact.json"],
            capture_output=True,text=True).stdout
        d=json.loads(out); p=d.get("published_at")
        if p and (best is None or p>best[1]): best=(t,p)
    except Exception: pass
print(best[0] if best else "")' "$RELEASE_REPO" 2>/tmp/_drift_trunc)"
  if grep -q TRUNCATED /tmp/_drift_trunc 2>/dev/null; then
    bad "the registry returned 1000 tags — the list may be TRUNCATED and 'newest' unreliable"
    note "raise ?n or page the listing before trusting this answer"
    rm -f /tmp/_drift_trunc; exit 1
  fi
  rm -f /tmp/_drift_trunc
  printf '\nDrift check for %s\n' "$APP"
  printf '  published catalogue pins  %s\n' "${LIVE_TAG:-<unreadable>}"
  printf '  newest published artifact %s\n\n' "${NEWEST:-<unreadable>}"
  HOLD_FILE="$REPO_ROOT/uis-applications/$APP/PIN-HOLD"
  HELD_TAG=""
  [ -f "$HOLD_FILE" ] && HELD_TAG="$(sed -n 's/^held_tag:[[:space:]]*//p' "$HOLD_FILE" | head -1)"

  if [ -z "$LIVE_TAG" ] || [ -z "$NEWEST" ]; then
    bad "could not read both sides; drift is UNKNOWN, not clean"
    exit 1
  elif [ "$LIVE_TAG" = "$NEWEST" ]; then
    if [ -n "$HELD_TAG" ]; then
      bad "a PIN-HOLD exists but the catalogue is already current — the hold is STALE"
      note "delete $HOLD_FILE"
      exit 1
    fi
    ok "catalogue is current"
    exit 0
  elif [ -n "$HELD_TAG" ] && [ "$HELD_TAG" = "$LIVE_TAG" ]; then
    # BEHIND is a true reading of a deliberate state. Say so rather than alarming,
    # because the agent reading this may be a fresh session with none of the context.
    printf '  \033[0;33m⏸\033[0m  behind on purpose — a PIN-HOLD names this exact tag\n'
    printf '     %s\n\n' "$HOLD_FILE"
    python3 - "$HOLD_FILE" <<'PYHOLD'
import sys,re
d=open(sys.argv[1]).read()
m=re.search(r'^reason: >-\n((?:[ \t]+\S.*\n|\n)*)', d, re.M)
if m:
    body=" ".join(l.strip() for l in m.group(1).splitlines() if l.strip())
    import textwrap
    for line in textwrap.wrap(body, 88):
        print("     "+line)
PYHOLD
    printf '\n     DO NOT pin %s away. Read the file before acting.\n\n' "$NEWEST"
    exit 0
  elif [ -n "$HELD_TAG" ]; then
    bad "a PIN-HOLD names '$HELD_TAG' but the catalogue pins '$LIVE_TAG' — the hold is STALE"
    note "the hold no longer describes reality; delete or update $HOLD_FILE"
    exit 1
  else
    bad "CATALOGUE IS BEHIND — a nomination may never have reached this agent"
    note "pin it: scripts/verify-application-pin.sh --app $APP --tag $NEWEST"
    exit 1
  fi
fi

printf '\nVerifying %s at %s\n' "$APP" "$TAG"
printf '  artifact     %s\n  release repo %s\n\n' "$ARTIFACT" "$RELEASE_REPO"

# ── 1. the release asset ──────────────────────────────────────────────────────────
ASSET_URL="https://github.com/$RELEASE_REPO/releases/download/$TAG/uis-artifact.json"
ASSET_JSON="$(curl -sL --max-time 30 "$ASSET_URL")"
# From 2026-09-13 the asset carries `artifact_digest` and `image_digest` explicitly,
# alongside the original `digest` (atlas kept that name and value deliberately, because
# this consumer reads it -- urb-agents #836). Prefer the explicit field, fall back to the
# legacy one for artifacts published before it existed, and FAIL if both exist and
# disagree: that would be a producer inconsistency, and agreement between producers is
# exactly what failed to catch ce6d776b.
ASSET_PARSE="$(printf '%s' "$ASSET_JSON" | python3 -c '
import json,sys
try: d=json.load(sys.stdin)
except Exception: print("|||"); sys.exit()
a=d.get("artifact_digest",""); g=d.get("digest",""); i=d.get("image_digest","")
print("%s|%s|%s" % (a,g,i))' 2>/dev/null)"
ASSET_ARTIFACT_DIGEST="$(printf '%s' "$ASSET_PARSE" | cut -d'|' -f1)"
ASSET_LEGACY_DIGEST="$(printf '%s' "$ASSET_PARSE" | cut -d'|' -f2)"
ASSET_IMAGE_DIGEST="$(printf '%s' "$ASSET_PARSE" | cut -d'|' -f3)"
if [ -n "$ASSET_ARTIFACT_DIGEST" ] && [ -n "$ASSET_LEGACY_DIGEST" ] \
   && [ "$ASSET_ARTIFACT_DIGEST" != "$ASSET_LEGACY_DIGEST" ]; then
  bad "the release asset's artifact_digest and digest DISAGREE"
  note "artifact_digest $ASSET_ARTIFACT_DIGEST"
  note "digest          $ASSET_LEGACY_DIGEST"
  note "do not pin either until the producer explains which is correct."
fi
ASSET_DIGEST="${ASSET_ARTIFACT_DIGEST:-$ASSET_LEGACY_DIGEST}"

if [ -z "$ASSET_DIGEST" ]; then
  # A missing asset is "not adoptable yet", not a corrupt pin -- artifacts published
  # before the asset existed have none (tor-agent, urb-agents #479).
  bad "no release asset digest at $ASSET_URL"
  note "if this artifact predates the release asset, it is NOT ADOPTABLE by this check;"
  note "verify by hand per the runbook and say so on the bus."
else
  if [ -n "$ASSET_ARTIFACT_DIGEST" ]; then
    ok "release asset names artifact_digest $ASSET_DIGEST"
  else
    ok "release asset names $ASSET_DIGEST (legacy \`digest\`; no artifact_digest on this artifact)"
  fi
  # The asset's own image_digest is a second, independent statement of the value that must
  # NOT be pinned. Assert it differs from what we are about to pin -- cheap, and it is the
  # exact confusion that produced ce6d776b.
  if [ -n "$ASSET_IMAGE_DIGEST" ]; then
    if [ "$ASSET_IMAGE_DIGEST" = "$ASSET_DIGEST" ]; then
      bad "the asset's image_digest EQUALS its artifact digest — one of them is wrong"
    else
      ok "asset distinguishes image_digest ${ASSET_IMAGE_DIGEST:0:19}… from the artifact digest"
    fi
  fi
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
  if [ "$EXPECT" = "$DIGEST" ]; then
    ok "--expect-digest matches"
  else
    bad "--expect-digest does NOT match"
    note "given    $EXPECT"
    note "resolved $DIGEST"
    # Name the mistake when we can, instead of leaving it as two hex strings.
    if [ -n "$ASSET_IMAGE_DIGEST" ] && [ "$EXPECT" = "$ASSET_IMAGE_DIGEST" ]; then
      note "the value given is this artifact's IMAGE digest, not its artifact digest."
      note "that is the ce6d776b mistake (urb-agents #827). Pin the resolved value above."
    fi
  fi
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
# The template-info.yaml layer declares mediaType .tar but is RAW UTF-8 YAML, so
# tarfile.open raises. Falling back is not enough on its own: a verifier that trusts
# the declared type reads NOTHING, and "read nothing" is indistinguishable from "the
# field is absent" -- which is usually the thing being checked (tor-agent, #956).
# So say which path was taken, and refuse to continue on an empty read.
how=""
try:
    t=tarfile.open('/tmp/_pin_blob.tar')
    data=t.extractfile(t.getnames()[0]).read().decode()
    how="tar"
except Exception:
    data=raw.decode('utf8','replace')
    how="raw UTF-8 (the layer declares .tar but is not one)"
if not data.strip():
    fails.append("decoded content is EMPTY -- an empty read looks exactly like an absent field")
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
print(f"INFO decoded {len(data)} bytes via {how}")
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

    # Enumerate operational.* with a REAL PARSER, never from a diff.
    #
    # On 2026-09-13 this repo reported that eba547e "moves first_load inside first_data".
    # It does not -- it is operational.install.first_load, and there are two distinct
    # `takes` keys on different rendering paths. The claim came from reading a unified
    # diff of a structured file and inferring nesting from nearby context. Two other
    # agents had to enumerate the artifact to correct it (urb-agents #810).
    #
    # A diff shows you that a block moved. It does not show you where it landed.
    if command -v ruby >/dev/null 2>&1; then
      printf '  operational key paths (parsed, not inferred):\n'
      ruby -ryaml -e '
        d = YAML.load_file(ARGV[0]) rescue nil
        op = d && d["operational"]
        unless op.is_a?(Hash)
          puts "     (no operational: block)"; exit
        end
        walk = lambda do |h, pre|
          h.each do |k, v|
            path = pre.empty? ? k : "#{pre}.#{k}"
            case v
            when Hash  then puts "     #{path}"; walk.call(v, path)
            when Array then puts "     #{path}  (list #{v.length})"
            else            puts "     #{path}"
            end
          end
        end
        walk.call(op, "operational")' "$OUT"
    else
      printf '  \033[0;33m!\033[0m  no ruby: operational key paths NOT enumerated.\n'
      printf '     Do not describe this artifact\x27s structure from a diff — parse it.\n'
    fi
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
