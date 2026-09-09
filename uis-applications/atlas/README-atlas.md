# Atlas Data

Atlas brings the Norwegian NGO sector together in one place, and serves it as a REST API
alongside the Dagster pipelines that build it.

Installing it with UIS brings up the whole application under one name:

- a **PostgreSQL** database with its migrations applied,
- a **Dagster code location** for the ingestion pipelines,
- a **PostgREST** API over the resulting `api_v1` views,
- and an exported **`api-url`** other applications can consume.

## Install

```bash
uis template install atlas
```

### Installing alongside an atlas that is already running

If a tenant is already deployed, installing under the same name configures the **same
database** and overwrites the running code location. To bring up a parallel tenant
instead, pass a different application name:

```bash
uis template install atlas --param app_name=atlas-t
```

`app_name` isolates everything — database, secret prefix, url prefix and code location —
so an existing tenant is untouched. Verified by `imac` on urb-agents #481.

## What this directory is, and is not

**This directory is a catalogue pointer, not the application.** There is no atlas source
code here. The install definition is the OCI artifact named in `template-info.yaml`:

```
ghcr.io/terchris/atlas-data/uis:v20260909-853c696
sha256:def7b9d2839180258f962555bd30ed5ca037fc42c52ebe0dd75f75c83d3a6c54
```

UIS pulls the **digest**. The tag is shown to people and never pulled by, because a tag can
be re-pointed at a registry and a digest cannot. Bumping atlas therefore means editing
`source.digest` in a reviewed change — that review is the only thing establishing that a
human approved this artifact.

The full reasoning lives in `uis-applications/README.md` in the `dev-templates` repository —
referenced as a path rather than a link, because this page is rendered on the documentation
site where a relative link to a repository file does not resolve.

`params:` and `provides:` are **not** listed here on purpose. They live in the artifact's
own `template-info.yaml`; there is one source of truth for what atlas installs and it is
not this repository.

## Provenance of this entry

The artifact coordinates above are atlas's published values as verified by `imac` against
the real registry (urb-agents #481) — the `853c696` artifact, which superseded `4b11f3f`
partway through that test round.

The three services listed above are not inferred: they are the plan
`uis template install atlas --dry-run` produces from this pin, as run by `tor-agent` against the
published registry (urb-agents #486) — `deploy postgresql`, `configure postgresql`,
`configure postgrest --schemas api_v1 --url-prefix api-atlas`, `deploy postgrest`, `deploy dagster`,
the `atlas-data` code location, then `deploy dagster` again.

⚠️ **The prose on this page was written by `dev-templates`, not by atlas**, and one earlier version
of it was wrong: it described atlas as "Norwegian business-register data", inferred from the
`brreg_enheter` table in the test records. `github.com/terchris/atlas` describes itself as *"the
Norwegian NGO sector, in one place"* — the business register is a source it draws on, not what it
is. Corrected here, but atlas still owns this text and should replace it.
