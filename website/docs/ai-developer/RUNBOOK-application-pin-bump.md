# Runbook: bump an application pin

Follow this when an application (today only `atlas`) publishes a new install definition and the
catalogue must point at it.

**This is not automatic.** Nothing in this repository notices a publish: the pin is hand-authored and
committed on purpose, so that a re-pointed tag cannot be blessed by an unrelated docs build. See
`plans/backlog/INVESTIGATE-application-catalogue-entries.md`, Decision 2.

**Budget ~10-15 minutes.** The Docusaurus build is the long pole and is not skippable — it is the only
stage that catches broken links.

> Until phase 7 of [PLAN-application-catalogue.md](plans/backlog/PLAN-application-catalogue.md) lands,
> step 4 is **hand work** and is the step most likely to be forgotten. A pin bump alone leaves the
> page advertising the previous artifact's job list and row counts, silently.

---

## 0. Pre-flight

`/opt/homebrew/bin` is not on `PATH` in a non-interactive shell, and this host has no `node`/`docker`:

```bash
export PATH="/opt/homebrew/bin:/usr/bin:/bin"
cd /Users/tec/learn/helpers/dev-templates
git status --short          # expect clean
```

Set the two values you were given, and use them everywhere below:

```bash
TAG=v20260910-bfda7b6                                   # the tag you were told to pin
APP=atlas
IMG=terchris/atlas-data                                  # the image repo; artifact is $IMG/uis
```

---

## 1. Verify the digest — one command

```bash
bash scripts/verify-application-pin.sh --app atlas --tag "$TAG" --expect-digest sha256:...
```

Exits non-zero and writes nothing if anything disagrees. It asserts all five checks below, prints
`operational.first_data.jobs` **with its length and order** so step 4 has what it needs, and leaves
the decoded artifact at `/tmp/artifact-template-info.yaml`.

Falsified four ways when it was written: wrong expected digest, a tag that does not exist, an older
tag with the current digest expected, and an artifact published before release assets existed — each
rejected, the good pin still passing.

⚠️ **A missing release asset fails the script deliberately**, with a note rather than a verdict:
that artifact is *not adoptable by this check*, and you verify by hand below and say so on the bus.

The manual form follows, because a script you cannot reconstruct is a script you cannot trust when
it disagrees with you.

### The same thing by hand — three independent sources

Never pin a digest you were handed without checking it. All three must agree.

```bash
# (a) the release asset — one unauthenticated GET, no oras
curl -sL "https://github.com/terchris/atlas/releases/download/$TAG/uis-artifact.json" | tee /tmp/asset.json

# (b) GHCR's own answer for that tag
TOK=$(curl -s "https://ghcr.io/token?scope=repository%3A${IMG//\//%2F}%2Fuis%3Apull&service=ghcr.io" \
      | python3 -c 'import json,sys;print(json.load(sys.stdin)["token"])')
curl -sI -H "Authorization: Bearer $TOK" \
     -H "Accept: application/vnd.oci.image.manifest.v1+json" \
     "https://ghcr.io/v2/$IMG/uis/manifests/$TAG" | grep -i docker-content-digest

# (c) what the requesting agent told you, on the bus task
```

⚠️ **A missing release asset is "not adoptable yet", not an error** — artifacts published before the
asset existed have none.

### Then decode the artifact itself

Confirms you are pinning what you think, and gives you the `operational:` block for step 4:

```bash
DIG=$(python3 -c 'import json;print(json.load(open("/tmp/asset.json"))["digest"])')
curl -s -H "Authorization: Bearer $TOK" -H "Accept: application/vnd.oci.image.manifest.v1+json" \
     "https://ghcr.io/v2/$IMG/uis/manifests/$DIG" -o /tmp/man.json
BLOB=$(python3 -c '
import json;m=json.load(open("/tmp/man.json"))
print([l["digest"] for l in m["layers"]
       if l.get("annotations",{}).get("org.opencontainers.image.title")=="template-info.yaml"][0])')
curl -sL -H "Authorization: Bearer $TOK" "https://ghcr.io/v2/$IMG/uis/blobs/$BLOB" -o /tmp/ti.tar
python3 -c '
import tarfile,hashlib
raw=open("/tmp/ti.tar","rb").read()
print("blob sha256:", "sha256:"+hashlib.sha256(raw).hexdigest())   # must equal the manifest layer digest
try:
    t=tarfile.open("/tmp/ti.tar"); d=t.extractfile(t.getnames()[0]).read().decode()
except Exception:
    d=raw.decode("utf8","replace")
open("/tmp/artifact-template-info.yaml","w").write(d)
print(d)'
```

Check in the decoded file: **`kind: application`**, **`id: atlas`** (UIS refuses a mismatch against the
entry), and that its own **`tag:` equals `$TAG`**.

---

## 2. Decide whether this bump needs a cluster load first

**Hold the bump only when it moves a container image that no cluster has loaded.** A text-only bump
does not earn a round-trip.

The manifest digest is **not** the test — a non-reproducible build changes it without changing
anything that runs. Compare **layer contents**:

```bash
ITOK=$(curl -s "https://ghcr.io/token?scope=repository%3A${IMG//\//%2F}%3Apull&service=ghcr.io" \
       | python3 -c 'import json,sys;print(json.load(sys.stdin)["token"])')
# fetch both tags' image manifests, walk to the amd64 child, and diff the layer digests;
# for any layer that differs, pull both blobs and compare per-file SHA-256.
```

On `v20260910-bfda7b6` this showed 29/31 layers bit-identical and the two that differed holding
identical contents (1112 files, zero changes) — tar metadata, not code. So no hold was needed.

If a runtime layer really differs, ask `imac` to load the image and confirm the **code location**
comes up — `loadStatus = LOADED`, not pod phase. A module that fails to import sits in a `Running`
pod while the location is in error.

---

## 3. Edit the entry

`uis-applications/atlas/template-info.yaml`:

- `source.tag` → the new tag
- `source.digest` → the verified digest
- `version` → the new tag (deliberately the tag, not an invented semver: the artifact carries no
  version, and this way the number a human sees is what was published)
- update the comment above `source:` recording how the digest was verified

⚠️ **`visibility` is a top-level key, a sibling of `source`.** Nested inside `source` it reads as null
and UIS defaults to `public` — correct by accident for a public artifact, silently wrong for a private
one.

---

## 4. Re-derive the prose from `operational:` — the step that gets forgotten

Read `/tmp/artifact-template-info.yaml` from step 1 and bring `README-atlas.md` back into agreement:

| README section | artifact source |
|---|---|
| **Getting data on day one** — job table | `operational.first_data.jobs`, **in order**, plus `takes` |
| total time and row counts | `operational.first_data.takes`, `operational.first_load` |
| **What happens after you install** — cadence table | `operational.cadence[]` |
| external services, unscheduled sources | `operational.external_services`, `operational.unscheduled` |

`operational.first_data.jobs` is a **sequence whose order is meaningful**. A job missing from the list
is the dangerous failure: a user runs the rest, skips one, and nothing tells them — that is exactly
the defect that left `brreg_enheter` empty and the freshness test red (urb-agents #507).

Keep the ⚠️ note that names the pin these tables were copied from, so the next stale row is visible in
a diff.

---

## 5. Run the whole pipeline, in CI order

```bash
bash scripts/validate-metadata.sh
bun run scripts/generate-registry.ts
bash scripts/generate-docs-markdown.sh --force
bash scripts/generate-plan-indexes.sh
bash scripts/validate-docs.sh
bun test scripts/test/
cd website && bun run build && cd ..
```

⚠️ Check each exit code **without a pipe** — `$?` after `| tail` reports `tail`.

⚠️ `validate-docs.sh` passing is **not** sufficient. It has twice reported "All internal links valid"
for links the build then rejected. And **nothing checks external links at all** — verify any new
`links[]` URL by hand with `curl -o /dev/null -w '%{http_code}'`.

---

## 6. The invariant: nothing else moved

Two systems consume this repository — UIS reads the registry, devcontainer-toolbox installs the
templates. Every pre-existing entry must come out byte-identical:

```bash
git stash && bun run scripts/generate-registry.ts && cp website/src/data/template-registry.json /tmp/reg-before.json && git stash pop
bun run scripts/generate-registry.ts
python3 -c '
import json
b=json.load(open("/tmp/reg-before.json")); a=json.load(open("website/src/data/template-registry.json"))
bt={t["id"]:t for t in b["templates"]}; at={t["id"]:t for t in a["templates"]}
ch=[i for i in bt if json.dumps(bt[i],sort_keys=True)!=json.dumps(at[i],sort_keys=True)]
print("changed:", ch or "NONE"); print("added:", sorted(set(at)-set(bt)))'
```

Only the application you bumped may appear as changed.

Also confirm the shape UIS reads, and that the fall-through fields are empty:

```bash
jq '.templates[]|select(.id=="atlas")|{templateKind,visibility,source,category,
    templateRepoPath,filesMdx,files:(.files|length),architectureMdx,expectedOutputBlock,params,provides}' \
  website/src/data/template-registry.json
```

---

## 7. Push, then prove it propagated

```bash
git add -A && git commit && git push origin main
curl -s "https://raw.githubusercontent.com/helpers-no/dev-templates/main/website/src/data/template-registry.json" \
  | jq '.templates[]|select(.id=="atlas")|{version,source,visibility}'
```

Your local file is not the deliverable — the raw URL on `main` is what UIS reads.

---

## 8. 🔴 Tell the installer to clear the registry cache

```
REGISTRY_CACHE_TTL=3600
```

UIS caches the catalogue for an hour and pins no version of it, so a provision host that fetched
within the last hour **will not see the new pin** — and the failure is silent, reading as "the
catalogue has not been published" rather than as a cache.

```bash
docker exec uis-provision-host rm -f /tmp/uis-template-registry*.json
```

This has cost time twice (urb-agents #496, #520), once making a report quote a description that had
already been replaced. **Say it in the same message that announces the bump**, every time.

---

## What you cannot verify from here

That `uis template info <id>` **renders** the `operational` block. UIS shipped that in 1.6.44 and the
install completion summary in 1.6.45; there is no UIS on this host, so this repository has never
confirmed either. Only the tester can, with one grep. Do not record it as working on a maintainer's
report — this area exists because a field was verified correct and never checked for being displayed.
