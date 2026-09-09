# `uis-applications/` — application entries

An **application** is a multi-service thing installed by `uis template install <id>` — a database
with migrations, a Dagster code location, a per-app REST API — under one name.

It differs from a stack in [`../uis-stack-templates/`](../uis-stack-templates/) in exactly one way,
and everything else here follows from it:

> A stack's install definition lives **in this repository**.
> An application's install definition is an **OCI artifact published beside the application's own
> image**.

So a directory here is **not a template**. It is a *pointer* to an artifact, plus the display
surface the documentation site needs. Nothing in this directory is installed into anyone's project.

---

## 🔴 Two files called `template-info.yaml`

This is the trap. There are two files with that name, in two repositories, validated by two
different validators, and they are **not the same file**:

| | this repository | the artifact |
|---|---|---|
| path | `uis-applications/<id>/template-info.yaml` | inside the published OCI artifact |
| written by | whoever adds the application to the catalogue | the application's own repository |
| validated by | `scripts/validate-metadata.sh` + `scripts/generate-registry.ts` | UIS, in `helpers-no/urbalurba-infrastructure` |
| carries | the pointer (`source:`) and the display fields | the real install definition |
| **must not carry** | `params:`, `provides:` | — |

**`params:` and `provides:` come from the artifact, never from here.** There is one source of truth
for what an application installs, and this repository is not it. A resolved copy may be inlined into
the registry for the website, but UIS reads the artifact.

Since UIS 1.6.26 both files accept `install_type: application`, so mirroring this shape inside an
artifact is legal — it was refused before, which is why this section exists.

---

## What a directory here contains

```
uis-applications/
  template-categories.yaml          # this tree's categories (context: uis)
  <id>/
    template-info.yaml              # pointer + display fields
    README-<id>.md                  # prose for the documentation site
```

The logo is **not** in this directory — it goes in
`website/static/img/templates/<id>-logo.svg`, like every other template's.

### `template-info.yaml`

`id` **must equal the directory name** — enforced here by `generate-registry.ts`, and since UIS
1.6.26 also enforced on the other side: an artifact whose own `id:` disagrees with the entry it was
fetched for is refused, naming both.

```yaml
id: <id>                            # == directory name
version: "1.0.0"
name: Human Readable Name
description: One line, shown by `uis template info`
category: APPLICATION               # any category whose context is "uis"
install_type: application
abstract: >
  A paragraph for the documentation site.
readme: README-<id>.md
tags:
  - example
logo: <id>-logo.svg
maintainers:
  - <github-username>
links:
  - url: https://github.com/<owner>/<repo>
    title: Source code
    icon: github
prerequisites:
  - text: "UIS provision-host container running"
    url: "https://uis.sovereignsky.no"

# Where the install definition actually lives.
source:
  artifact: ghcr.io/<owner>/<app>/uis   # convention: <image>/uis
  tag: v20260909-abc1234                # shown to a human, NEVER pulled by
  digest: "sha256:<64 hex>"             # what is actually pulled
  visibility: public                    # or private (needs credentials)
```

### 🔴 `source.digest` is a security boundary, not a version string

The artifact this points at is fed to `configure --init-file`, which applies SQL **as the database
owner**.

**The digest is committed here on purpose, and is never resolved at build time.** A tag is mutable
at a registry; a digest is not. If this repository resolved `tag → digest` during the catalogue
build, then re-pointing the tag would be silently blessed by the next unrelated documentation
build — and this catalogue rebuilds on every push to `main`:

```
t0  tag v1 -> digest A.  Registry records A.
t1  tag v1 re-pointed -> B.
t2  ANY docs build re-resolves v1, records B, publishes.
t3  UIS installs B, which runs as database owner.
```

Committing the digest removes step `t2`. Pulling by digest gives **integrity** — you get what the
digest names. Only authoring the digest gives **provenance** — that a human approved *this* artifact.
The reviewed diff is the provenance.

So: **bumping an application is a reviewed change to `source.digest`.** The build validates its
shape (allowlist, `sha256:` + 64 hex, tag not `latest`/`main`/`master`/`head`) entirely offline.

Rationale and the full discussion: urb-agents #479, and
[`PLAN-application-catalogue.md`](../website/docs/ai-developer/plans/backlog/PLAN-application-catalogue.md).

---

## Status

**The generator does not support `install_type: application` yet.** This tree and its category exist;
the code changes are phases 2-4 of `PLAN-application-catalogue.md`, and until they land, adding a
directory here will fail validation.

No application has been added yet: the first one (`atlas`) has not published its artifact.
