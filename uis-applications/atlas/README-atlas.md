# Atlas Data

Atlas serves **Norway's civil-society sector as a REST API** — municipality-level indicators
of humanitarian need, and the NGOs and local chapters that respond to them.

The data is an open semantic layer over Norwegian public sources: SSB statistics, FHI
public-health and living-conditions indicators, Bufdir child-poverty figures and the
Brønnøysund business register, joined to NGO supply data, so that need and the organisations
responding to it can be queried together at kommune level.

Installing it with UIS brings up the whole application under one name:

- a **PostgreSQL** database with its migrations applied,
- a **Dagster code location** for the ingestion pipelines,
- a **PostgREST** API over the resulting `api_v1` views,
- and an exported **`api-url`** other applications can consume.

## What Atlas holds

The catalogue used to describe how Atlas refreshes and **not one word about what it refreshes.** The
pinned definition now carries a `data:` block:

| | |
|---|---|
| sources | **44** |
| publishers | **5** — Folkehelseinstituttet (21), Statistisk sentralbyrå (17), Brønnøysundregistrene (3), Norges Røde Kors (2), Bufdir |
| public relations | **19** |
| licence | NLOD for 42 of 44 |

**Norwegian public data at kommune level, joined into one semantic layer.**

🔵 **The live API is the authority, not these counts.** They are regenerated from the repository with
a CI check that fails on drift, so they cannot silently rot against the code — but they describe the
build, and what is *served* is a separate question:

```
GET /meta_endpoints     what is queryable
GET /meta_sources       every upstream, its freshness, and served_as — the
                        relations it actually reaches (empty = nothing
                        published depends on it)
GET /meta_dimensions    what each coded column MEANS — read it before
                        interpreting a code
GET /indicator_summary  every published series
```

⚠️ **A count here has exceeded what was actually served.** On **2026-09-21**, at pin
`v20260921-2d88589`, the block said `public_relations: 19` while the live API was reported serving
**16** — three relations 404ing during an unrelated `transform_and_publish`, not caused by that tag.
Whether that is still true is **not something this page can know**: it is rendered from a published
artifact, not from a running install, and this repository cannot reach the API to check.
**Ask the endpoints above.**

### 🔴 Pinning is not deploying

**A pin moves what an install would fetch. It does not move data.** The image carries the dbt models
for the newest sources; **their rows arrive on a separate `transform_and_publish`.** Pin and run are
two actions, and this catalogue only performs the first.

## Install

```bash
uis template install atlas
```

### ⚠️ A fresh install serves an empty API until the first pipeline run

This is correct behaviour, not a broken install. The schema and grants exist from install; the
data arrives on the first pipeline run, which **an operator has to start** — see the next section.
The API answers and returns zero rows until then.

Stated here because it is the state most likely to be read as failure by someone installing for
the first time.

The API is also self-describing — `meta_sources`, `meta_endpoints` and `meta_dimensions` let a
consumer discover what is available without any out-of-band documentation.

### What happens after you install

**Installing starts nothing.** The Dagster **schedules and sensors** ship **stopped**. No data is
fetched, and no external service is contacted, until an operator turns them on. Turning them on is the
go-live decision.

⚠️ **Turning them on never backfills — no history is replayed, ever.** But the *timing* differs
between the two halves, and **only one of them waits**:

| what you enable | when it starts |
|---|---|
| the **schedules** — `transform_and_publish` at 05:00, `brreg_transform` at `:10`/`:40` | at their next scheduled time |
| the **automation sensor**, which drives all ~40 ingest sources | **within about a minute** |

**The sensor does not wait for a cron.** It evaluates on its own tick: an asset becomes eligible when
its cron tick has passed *and* its dependencies updated since that tick — and on a fresh install every
tick is already in the past and nothing has run, so both are trivially true. **Enabling at 16:55 on a
Friday starts work at 16:55.**

Concurrency is bounded by `ATLAS_MAX_CONCURRENT_INGESTS`, so it is a bounded start rather than 40
simultaneous writers.

> ### ⚠️ When those six jobs finish, the install is LOADED but NOT VALIDATED
>
> Finishing the first-data sequence means the data is in. **It does not mean the data has been
> checked.** Run the checks before treating the install as good.
>
> ✅ **The installer now says this too, and that condition is met.** As of the pinned build the
> sentence appears in the install summary itself — between the endpoints block and the load-data
> instructions, no scrolling, no `template info` needed. It took four mechanisms and three premature
> declarations of "delivered" to get one sentence onto a screen, including a truncation this page
> once described that did not exist.
>
> 🔵 **Kept anyway, as corroboration rather than as the only source.** One operator has seen that line
> on one host. **This box costs a reader nothing and stops costing the moment a second person confirms
> it** — so it stands until then, not because the condition failed.

> **Running them costs 6–15 minutes and looks like a hang.** All 685 can be run on demand;
> `uis dagster run transform_checks` works, but measured launches took **364 s and 885 s just to
> start**. The run sits `NOT_STARTED` for that whole time and then runs.
>
> 🔴 **That is slow, not stuck — and re-launching because it looks hung is how you get duplicate
> runs.** Wait it out.
>
> ⚠️ **On a busy cluster it can genuinely time out**, and it will not look like a timeout: the 885 s
> measurement sits against a 900 s ceiling, so a slower start presents as an **image-pull or
> scheduling failure** rather than as what it is. A later UIS raises the ceiling.

### 🔴 On an off-catalogue host, `uis template info` describes the wrong software

**`info` renders the definition the *catalogue* pins, not the one your host installed.** If you
installed a specific version — `uis template install atlas --version …@sha256:…` — then `info` prints
a complete, well-formed, authoritative description of **a different build**.

It even says so and does not connect the two: the off-catalogue warning prints, and **the operational
block on the very next line comes from the other version, silently.** Everything in it is affected —
`deploys`, `automation`, the first-data list, the cadence table.

⚠️ **This page has the same limitation, for the same reason.** It mirrors the artifact **at the pinned
tag**. If you are running something else, this page describes the catalogue's build, not yours. **Read
your own definition** — pull the artifact at the digest you installed.

🔵 **Why this bites the person it bites:** anyone installing off-catalogue is by definition *ahead of*
the pin, which is exactly when they most need the description to be of what they installed.

> ⚠️ **And it disappears when you fix the pin.** Once the catalogue points at what the host is running,
> installed and catalogue agree and the symptom is gone — so re-running the test afterwards shows
> correct output and invites the conclusion that something merged fixed it. **A defect that vanishes
> when the thing it affects is corrected gets closed as fixed every time anyone looks.** It was caught
> here only because a blob had been pulled and kept while the two disagreed.

🔴 **Launch the first-data jobs BEFORE enabling automation.** Enable first and the *sensor* decides the
order: `brreg_change_feed` will start, find no watermark, and **fail loudly** until `brreg_bootstrap`
has run. That is by design rather than a fault — but it is noise nobody needs, and it is avoidable by
doing the two in the right order.

**First ingest loads roughly 4.1 million rows** across **52 `raw` BASE TABLEs and 81 `marts` BASE
TABLEs (plus 10 `marts` views)**, from about 41 sources. That is `imac`'s measured 2,906,194 plus the
1,173,878-record Enhetsregisteret bulk load, so the row count is arithmetic on two measured figures.
The combined wall time **is** measured — **~30 minutes, 1772 s end to end** — and is stated once, in
the cold-install table below, rather than repeated here.

A "table" here means a **BASE TABLE**; views are excluded and counted separately. That rule is stated
because two figures in the artifact used to disagree with each other *and* with the database while no
counting method was written down anywhere.

**Once schedules are on**, Atlas polls on this cadence (Europe/Oslo) — mirroring
`operational.cadence` in the artifact at pin `v20260921-a8d5d1a`:

**Every row names the job that owns it**, and that is not decoration — see the warning below the
table.

| when | job | what |
|---|---|---|
| Sunday 02:00 | `annual_sources_refresh` | ~37 annual public-sector sources — SSB, FHI, Bufdir |
| 1st of month, 01:00 | `klass_refresh` | SSB Klass classifications (kommune/fylke) |
| **Every 30 min** (:00, :30) | `brreg_change_feed` | Brønnøysundregistrene **change feed** — only what moved, ~114 records per cycle at the measured 3.8 changes a minute. **Appends to raw only; rebuilds nothing and cannot affect the public API** |
| **Every 30 min** (:10, :40) | `brreg_transform` | Brreg **reconciliation into marts** — ONE incremental model, ten minutes behind each poll. Rows are inserted and deleted, never the table replaced, so **no `api_v1` view is disturbed** |
| Daily 04:00 | `brreg_change_feed` | **Frivillighetsregisteret** — a full re-walk of ~72,800 organisations (~727 requests) |
| Daily 05:00 | `transform_and_publish` | dbt transform and publish — no external calls. ⚠️ **The only scheduled job that rebuilds marts**, and therefore the only one during which `api_v1` views are recreated — each restored immediately after its own mart, so the gap is milliseconds per view |

🔴 **Two rows, one job — and reading them as one *thing* has already cost real time.** The 04:00
Frivillighetsregisteret row and the half-hourly feed row are **the same job**, `brreg_change_feed`,
with different sources and different automation conditions. Two agents independently read the Brreg
rows as a single job that both polled every half hour *and* rebuilt marts, and one of them costed a
public-API outage at 48× its real rate and nearly weighed a cadence rollback against it (urb-agents
#780, #786).

**The ten-minute offset is deliberate.** The reconciliation runs at `:10`/`:40` rather than alongside
the feed because firing on the same tick would reconcile data the feed had not yet written, leaving
the dimension permanently one cycle behind.

⚠️ **Frivillighetsregisteret is daily and did *not* move to the feed's cadence.** It has no change
feed, so every refresh is the whole register — ~727 requests. At half-hourly that would be ~35,000
requests a day against a public-sector API, a 48× increase on someone else's service. The two Brreg
ingests are on separate schedules for that reason and must stay that way.

**The external services Atlas calls** are SSB (Statistics Norway), FHI (Folkehelseinstituttet),
Bufdir and Brønnøysundregistrene. All are public-sector APIs. The cadence is deliberately
conservative — an annual statistical table is polled weekly, not nightly, because fetching annual
tables every night would be roughly 15,000 pointless requests a year against services Atlas depends
on staying welcome at.

**Two sources are deliberately unscheduled** (`redcross-branches`, `frr`) pending a credential. They
never self-trigger; invoking them by hand on a cluster without the private data repo fails, and that
is correct.

⚠️ **The cadence lives in the image, not in this entry.** It changes when the pinned tag changes,
with nothing here to review. If that matters to you, diff `cadence.py` between tags.

### Getting data on day one

Enabling the schedules does **not** backfill. Every schedule is `on_cron`, which means *next fire* —
so a Thursday install waits until Sunday 02:00 for raw data, and until the 1st for the monthly
sources. The API stays empty in the meantime, with nothing to explain why.

To get data immediately, launch these six jobs from the Dagster UI, **serially, in exactly this
order**:

| order | job | ~time |
|---|---|---|
| 1 | `annual_sources_refresh` | 474 s (7.9 min) |
| 2 | `klass_refresh` | 1.0 min |
| 3 | `seed_sources_refresh` | 0.8 min |
| 4 | `brreg_bootstrap` | 501 s (8.4 min) |
| 5 | `brreg_change_feed` | not stated |
| 6 | `transform_and_publish` | 484 s (8.1 min) |

**A cold install is ~30 minutes — 1772 s wall, measured end to end on a factory-reset cluster**
(urb-agents #1027). `brreg_bootstrap` is **no longer the unmeasured part**.

⚠️ **Rows 1, 4 and 6 are from that cold-install measurement; rows 2, 3 and 5 are carried from the
earlier four-job run and the artifact does not restate them.** They are left as they were rather
than rescaled, because a number invented to make a table look consistent is worse than a number
from a different run that says so. **The three measured jobs do not sum to the total** — the jobs
vary far more than the total suggests, which is the point of stating the total separately.

> ⚠️ **An earlier figure of ~11 minutes is still in circulation and understates a cold install by
> nearly 3x.** It was the measurement of the *first four* jobs (#507: 11.1 min, 2,906,194 rows) and
> it predates `brreg_bootstrap` entirely. A run that looks stalled at 8 minutes may be normal —
> run the check command rather than waiting, since it reports what has been pulled against what
> has been applied.

**The order is not arbitrary**, for two separate reasons:

- `seed_sources_refresh` contains `raw/_migrations` and runs third, so the migrations apply after two
  source jobs have already written. That is safe because they are idempotent, but reordering has not
  been tested.
- `brreg_change_feed` runs **immediately after** `brreg_bootstrap` because the bootstrap seeds the
  feed's watermark from the snapshot's own date. The feed has nothing to start from until the
  bootstrap has run — and run first, it **fails loudly** rather than silently walking history: it
  refuses to start without a watermark.

Together these produce **~4.1M rows** across **52 `raw` and 81 `marts` BASE TABLEs (plus 10 `marts`
views)** from ~41 sources — the 1,173,878-record Enhetsregisteret bulk load on top of `imac`'s
measured 2,906,194.

> ✅ **RESOLVED in `v20260921-a8d5d1a`, at the cause rather than the symptom.**
> Through `1a569dc` this field contradicted itself three ways: headline **81** marts against a
> counting rule reading *"46 + 16 = 62"*; *"**eight** models land in marts as views"* one clause
> after the **10** it was explaining; and a closing *"match `imac`'s live measurement exactly
> (61 / 5 / 66 / 52)"*. It now reads **models=63 plus seeds=18** — which is 81, agreeing with its
> own headline — **views=10** named once, and the exact-match claim retired with a sentence giving
> the reason: *"a stale claim of exact agreement is worse than no claim, because it invites the
> reader to stop checking."* **Every figure in the field is now written by
> `uis/generate-holdings.py`**, none by hand.

> 🔴 **That fix also corrected something THIS page was repeating.** This page said the
> figures were *"derived and gated by `uis/render-template-info.sh`"*. The artifact now states that
> credit was wrong — the generator is `uis/generate-holdings.py` — and the wrong name was on this
> page because it had been quoted faithfully from the field it described. **A quotation inherits the
> errors of its source**, and nothing available here could have caught it: verifying that a page
> matches an artifact says nothing about whether the artifact is right about itself.

> 🔴 **This page said 61 and 5 for three pins, and the caveat that stood here misquoted the
> artifact to do it.** It attributed *"61 marts BASE TABLEs (plus 6 marts views)"* and *"five"* to
> `install.first_load` — **strings that appear in none of `2d88589`, `fcf78e6` or `1a569dc`.** The
> headline has read 80, now 81, and 10 since at least `2d88589`. What this page had latched onto was
> the artifact's own stale closing line, `61 / 5 / 66 / 52`: a caveat written to flag a numeric
> disagreement was quoting the wrong side of it. ⚠️ **Found by parsing the field, not by
> grepping the file** — these are folded YAML scalars, so a phrase search across raw lines matches
> nothing and reads exactly like absence.

> ✅ **The two FIELDS in the artifact do agree, which is the part that used to be broken.**
> Earlier pins had `install.first_load` saying 60 marts while `first_data.takes` said 64, and this
> page used 64 with a note saying why. Both now say **81**, and both moved together from 80 in
> `fcf78e6` — so the cross-field disagreement really is fixed. The disagreement
> *inside* one of those fields outlived the one between them, and is resolved separately above. This
> box used to add *"matching `imac`'s live measurement exactly"*; that phrase was the artifact's own
> closing line — the one naming `61 / 5 / 66 / 52` — so repeating it here was repeating the
> contradiction rather than reporting it.

⚠️ **Do not read "~11 minutes" as the total.** That figure is `imac`'s measurement of the four jobs
that existed when it was taken — `annual_sources_refresh`, `klass_refresh`, `seed_sources_refresh`
and `transform_and_publish` — on a clean cluster (10.8 min, 2,906,194 rows, zero failures; urb-agents
#507, #520). It **predates both Brreg jobs**. ⚠️ **This paragraph used to end by calling the
combined wall time "unknown rather than estimated", fifty lines below a table stating it as 1772 s
measured end to end.** Both sentences were on this page at once for several pins. The total **is**
measured — ~30 minutes — and `brreg_bootstrap` is 501 s of it; what remains unmeasured is narrower
than the old sentence claimed: the bootstrap's *write* time separately from its 210 MB / 52 s
download, and `brreg_change_feed`, which the artifact still does not state.

(Stated by naming the four jobs rather than "the first four", because that phrase silently stopped
being true when the list grew from four to six.)

### 🔴 `brreg_bootstrap` is the one most likely to be skipped

It has **no schedule and no automation condition, on purpose.** Re-running a 1.17M-record bulk load
against a populated database is the only genuinely destructive-looking operation in this pipeline, so
nothing self-triggers it. **Run it once, here.**

- **Skipping it** leaves the organisation register empty, with nothing saying why.
- **Running it twice** is safe — it upserts and never truncates — but pointless.

It is deliberately *not* in the unscheduled list further down: that list means *cannot* run.
`brreg_bootstrap` is the opposite — it **must** run once, on day one, and then be left alone.


> **Maintainer note — do not trim the paragraph above as duplication.** It restates, in this page's
> own words, *why* nothing self-triggers `brreg_bootstrap`. That looks redundant with the artifact's
> `first_data.how`, and the redundancy is deliberate: `first_data.how` does **not** render at the end
> of an install — only `uis template info` shows it — so an operator about to run the chain may see
> this page's reason and nowhere else's (urb-agents #802).
>
> This is the opposite call to the troubleshooting block, which this page deliberately does **not**
> copy, and the difference is rot. A copied *remedy* goes stale silently when its source changes; a
> sentence in this page's own voice about a property that does not change — a 1.17M-record bulk load
> must not self-trigger — stays true whether or not the artifact still says it. **Copy nothing that
> has a current source; keep your own words for what would otherwise have none.**


### `brreg_change_feed` is different again — run it once here, then leave it to its schedule

Unlike the bootstrap, the change feed **is** scheduled: once automation is on it runs daily at 04:00.
You launch it by hand exactly once, in the sequence above, because a fresh install has no data for the
first nightly run to apply a delta to.

So the three kinds of job on this page are not interchangeable:

| | runs by itself? | run by hand on day one? |
|---|---|---|
| the four source/transform jobs | yes, on their crons | yes |
| `brreg_bootstrap` | **never** — no schedule, no automation condition | yes, exactly once |
| `brreg_change_feed` | yes, nightly at 04:00 | yes, once, after the bootstrap |
| `redcross-branches`, `frr` | no — parked, **cannot** run | no |

> ⚠️ **This list mirrors `operational.first_data` in the artifact at pin `v20260921-a8d5d1a`.** It is
> duplicated here, by hand, because as of that pin `uis template info` renders none of the artifact's
> `operational` block, so this page is the only place an operator can read it. It is therefore
> **capable of going stale on the next bump** — the artifact is the source of truth. Generating this
> section from the artifact at authoring time is the intended fix; see
> `PLAN-application-catalogue.md`.

### If a run fails, the artifact tells you what to do

The install definition carries a **`troubleshooting`** block, and **UIS renders it at install** as of
1.6.67 — so the remedy reaches the operator rather than living only on this page. It covers **four**
failure modes that have actually happened:

- **`brreg_bootstrap` reporting success while writing nothing** — re-run to repair the register, it
  and the transform both report success and the API still serves the old data;
- **the bootstrap terminating part-way through the download**, and retrying getting *less* far each
  time rather than more;
- a transform failing with a **dbt schema error naming `dim_brreg_enhet`**, after an upgrade adds a
  column to an incrementally-materialised model; and
- the **public API returning 404 even after the database has been repaired** and the view confirmed to
  exist with rows and grants.

⚠️ **One place where this page and the artifact currently disagree, and this page is the correct one.**
Both described the schema-change failure as *"the source and target schemas on this incremental model
are out of sync"*. `imac` ran the upgrade and the model's own watermark subquery hits the missing
column **before** dbt's schema-change handling runs, so dbt never emits that message. This page now
quotes what is actually printed; the artifact — and therefore what `uis template info` renders — still
carries the older wording until atlas corrects it. **If the product shows you the other sentence, the
remedy is the same one.**

**Otherwise the authoritative text is the artifact's, not this page's.** It is deliberately not copied here: it
is long, it is precise about which database user must run the rebuild and about the ordering that
people miss, and a stale copy of a 02:00 remedy is worse than a pointer to a current one. Read it from
`uis template info atlas`, or from the definition at the pinned digest.

### Installing alongside an atlas that is already running

If a tenant is already deployed, installing under the same name configures the **same
database** and overwrites the running code location. To bring up a parallel tenant
instead, pass a different application name:

```bash
uis template install atlas --param app_name=atlas-t
```

`app_name` isolates everything — database, secret prefix, url prefix and code location —
so an existing tenant is untouched. Verified by `imac` on urb-agents #481.

### Upgrading an existing install

An upgrade happens when this catalogue entry's pin moves and you re-install. **What that costs you
depends on the release, and it is not always nothing.**

#### ✅ What the recent pins add, and what is still missing

**`meta_sources.served_as`** (from `v20260921-1a569dc`) — the first published way to ask *what does
this source actually reach?* An empty array means nothing published depends on that source. It is
**named in `data.discover` as of `v20260921-a8d5d1a`**, so this page no longer hand-carries it: the
endpoint list above is the artifact's own. ✅ *This block previously warned that `served_as` appeared
nowhere in the install definition and would need re-checking. That was raised on urb-agents#1352 and
the artifact now documents it — the warning is retired because the condition was met, not because
it aged.*

🔴 **18 of 26 dead series recovered** (`v20260921-a8d5d1a`). Series reporting
`kommuner_with_value = 0` fell **26 → 8**. The `ssb-crime-tables` series moved from `latest_year`
**2025 → 2014** with coverage **0 → 64–83 kommuner** — and the reason is the useful part: SSB table
08487 carries **16 `LovbruddKrim` codes, 7 current and 9 legacy**, and the legacy vocabulary stopped
in 2013–14. **Those series were never empty.** They were being reported at a year they had stopped
covering, which reads identically to missing data from the outside. Verified at SSB by ops-dev.

**`served_as` is now computed from the corrected lineage seed**, which moved `unattributed_totals`
from 1 source to **32**; `served_as` empty is still **exactly 5**. A downstream consumer deleted a
hand-maintained list that had been wrong twice in five hours.

Earlier: **783,104 rows** recovered in `ssb-06913` from a regex that never matched, and an embedding
check kept as a standing invariant.

⚠️ **TWO GAPS REMAIN, and the pin does not close either.** Under Terje's rule — a release
claiming to add or fix a data source is not a successful deploy until each named source returns rows
— this is a **PARTIAL**, and ops-dev nominated it as one.

**1. `ssb-06913`: seven of eight series still return nothing, but the cause is now precise rather
than open.** `Dode`, `Levende`, `Fodselsoverskudd`, `Folketilvekst`, `Innflyttinger`, `Utflyttinger`
and `Nettoinnflytting` remain at `latest_year` 2026 with **0 of 357** kommuner. `Folkemengde` alone
delivers 357. The cause:
`coalesce(max(year) filter (where value is not null), max(year))` **does not restrict to the kommuner
the relation serves**, and SSB **zero-fills municipalities dissolved in 1957–59** — `Hopen
(1915-1959)` reports **0** deaths in 2026, and **a zero is not a null**, so the whole source sits at
2026. Measured at SSB and independently in the warehouse. 🔵 **This is why the page kept the
question instead of accepting the February/flow-series explanation**: that explanation was plausible,
consistent with everything observable, and not the cause.

**2. `ssb-12063`: a second, separate gap, and it is NOT exempt.** `KOSfritidredleie0000` returns 0,
while SSB holds **1,812 values for it across 2015–2018 — 408 kommuner in 2018 alone** — none of
which reached the fact table. That is a different defect from the `latest_year` one above and is not
explained by it.

Both are open with atlas on urb-agents#1351 and #1363. **Nothing regresses against `1a569dc`**: zero
check drift in either direction, and the inverse defect did not occur — `Folkemengde` held at 2026
with 357 kommuner, Oslo 728,714.

### 🔴 After upgrading to this pin, two things look broken and are not

Both self-heal, both are documented, and an upgrader who does not know them will think the upgrade
failed. **Item 1 was measured on a real upgrade over a loaded install, not a cold one. Item 2's exit
code is read from the script's source and has not been measured on this build** — the distinction
is kept because the last time this section blurred it, a single measurement was carried across four
pins as though it were current.

**1. The served documentation lags until you publish.** `COMMENT`s live in the database, so the
OpenAPI field docs track the last build that *published*. 🔴 **If you are coming from anything
older than `v20260921-fcf78e6`, this item is the whole point of taking the pin**: the window-year
descriptions arrived in `fcf78e6` and live in the DATABASE, so installing without running the publish
serves the OLD text with every signal green until the 05:00 publish — up to 24 hours. (That framing
said *"this pin is largely a descriptions release"* while pinned to `fcf78e6`, and was carried
unchanged into `1a569dc`, which is not one — the descriptions are inherited, not new here.) Immediately after installing, the `api_v1`
checks measured **2 pass / 2 fail**:

```bash
uis dagster run publish_api_v1      # ~67 s
```

After that, **4 of 4 succeeded**.

**2. Until the first transform runs, the check reports a fault — and it self-heals.**
`marts.mart_source_freshness` does not exist until a transform builds it, so the check has nothing to
read. Let one `transform_and_publish` run (~376 s) and it returns **exit 0** — measured at 29
bounded sources, 29 within cadence.

On an **upgrade**, where marts were built by an earlier build but the view is missing, that is
**WARN**, not `CANNOT`: a fault waiting on a transform is not a host where nothing has ever run. The
old code made no such distinction, resting on an assertion that a missing view *"means no transform
has ever run here"* — which is false on every upgrade. ⚠️ **Read the WARN as what the
source says, not as a measurement**: nobody has run the check on this build inside the pre-transform
window. The one live run available is `EXIT=0` on a **healthy** install, which does not exercise this
case, and the operator who produced it said so rather than offering it as the answer.

✅ **The "exit 2, NOTHING WAS CHECKED" claim that stood here is RETIRED — and it had been stale
for five days and four pins.** The check has had **three** states since **2026-09-16**: `OK`, `WARN`
and `CANNOT`, combined by a `worst()` rule — *"CANNOT dominates WARN dominates OK; not-asked is OK,
asked-and-unanswerable is CANNOT"* — with WARN reachable from six distinct sites in the script.

🔴 **How the claim went stale is the part worth keeping.** The `exit 2` figure was measured
**once**, on `v20260916-e439668`, and then carried unchanged through `1709934`, `6e10058`, `2d88589`
and `fcf78e6`, still introduced by the words *"on the currently pinned build only"* — false four
times over by the end. The tri-state rework landed **the same day**, in a later build, and **this page
documented one of its consequences while still saying the split had not demonstrably landed**: the
dark-Automation `exit 2` → `exit 0` described below **is** that rework. The contradiction sat in two
sections of this page for four pins. **A measurement carried forward is a quotation, not a
measurement, and it needs the build it was taken on written beside it.** The retirement finally came
from reading the script — which was possible the whole time, and dated in its own comment.

🔵 **Item 1's cause was established by intervention. Item 2's was established by reading the
script** — stronger than the behavioural test this page had been waiting for, and available five
days earlier than it was used.

### 🔴 Upgrading still needs TWO operations — unchanged by the current pin

⚠️ **The `--full-refresh` requirement below arrived with `v20260914-72999a4` and still applies.**
An operator who has not yet taken `72999a4` still needs everything in this section — **this pin does
not retire it.**

⚠️ **Whether a case of the same kind is now in play is STILL an open question, and the honest
answer is that this page does not know.** atlas described `v20260921-fcf78e6` as adding a
**`window_years` column**, and everything in `fcf78e6` is in the pin above — so an operator taking
`1a569dc` over a loaded install inherits that column whether or not they ever installed `fcf78e6`. A
column added to an incrementally-materialised model with `on_schema_change='fail'` is precisely the
failure documented below. The artifact says nothing about `window_years` in any of the three builds,
and *"atlas shipped no new upgrade instruction"* and *"no new instruction is needed"* look exactly
the same from here. **Asked on urb-agents#1341 and not yet answered** — carried rather than quietly
dropped, because an unanswered question that disappears at the next pin reads as an answer. **If you
are upgrading a loaded install, assume a full refresh may be needed and read the failure signature
below before concluding the release is broken.**

The pins through 2026-09-13 were text-only or additive — you re-installed and the data was untouched.
**This one is not.** It adds a column to an incrementally-materialised model, and `dim_brreg_enhet`
runs with `on_schema_change='fail'`.

**1. A full refresh.** Without it the transform fails with

```
Database Error in model dim_brreg_enhet
  column "snapshot_loaded_at" does not exist
  LINE 209: select coalesce(max(snapshot_loaded_at), '-infinity'…
```

which is the model doing exactly what it is configured to do, **not a broken release**.

```bash
dbt build --full-refresh --select dim_brreg_enhet+
```

⚠️ **Note the trailing `+`: descendants, not ancestors.** `dim_brreg_enhet+` rebuilds what depends on
the changed table, which is what you need. `+dim_brreg_enhet` is the opposite selector and does not.

⚠️ **Run it as the `atlas` database user, not as a superuser.** A full refresh drops and recreates, so
the tables take the running user's ownership — and a superuser leaves the *next* run with "permission
denied".

**Measured cost for this selector: 528 s dbt-reported, 536 s wall** (`imac`, on a real upgrade;
PASS=30 WARN=1 ERROR=0). ⚠️ **A figure of ~256 s or "about four minutes" refers to the model *alone*.**
`dim_brreg_enhet+` additionally runs 29 data tests and a view model, so it is roughly twice that. The
number and the selector have to travel together.

**2. A publish — and it is a different operation, not part of the refresh.** This release changes
`COMMENT`s, and comments live **in the database, not in the image**. Without a publish the served
OpenAPI field documentation stays as it was while the build that produced it has moved on.

🔴 **There is no CLI affordance for materialising a single asset.** `uis dagster run` takes **jobs**,
not assets, so `uis dagster run api_v1` answers *"No job named 'api_v1'"*. From the host you have two
options and neither is the one-liner you might expect:

- **`uis dagster run transform_and_publish`** — works, and rebuilds every mart rather than just
  publishing, so it costs more than the operation needs; or
- **materialise the `api_v1` asset in the Dagster UI**, which is the narrow operation.

**Both. A refresh is not a publish.**

### ⚠️ A UIS 1.6.84 floor, and what happens below it

The current pin declares `env_from_services`, which hands a consumer Atlas's API address **resolved
from the named service** rather than copied from a host-facing export.

```yaml
env_from_services:
  ATLAS_POSTGREST_URL: postgrest     # a SERVICE id, resolved in-cluster
```

**This is the fix for a real defect, and it was measured inside a running pod before being pinned:**

| | `ATLAS_POSTGREST_URL` | result |
|---|---|---|
| before | `http://api-atlas.localhost` | exit 2, **CANNOT** — `.localhost` is loopback (RFC 6761), so the pod dialled itself |
| after | `http://atlas-postgrest.postgrest.svc.cluster.local:3000` | script exit 0, `uis template check atlas` → **healthy** |

⚠️ **Port 3000 is the data API. 3001 is the admin server and 404s a table read.**

`exports.api-url` is unchanged and still host-facing — **correctly, because it is for hosts.**

### 🔴 What this makes worse for a host below 1.6.84

**`env_from_services` needs UIS 1.6.84 to be read at all, and the old `env_from_exports` key is
gone.** So an un-upgraded host loses the variable entirely rather than getting a wrong one:

| UIS | what the host gets |
|---|---|
| **1.6.84+** | the in-cluster address — **fixed** |
| 1.6.83 and below | key ignored, and there is no fallback key any more → `ATLAS_POSTGREST_URL` **unset** → the check reports **CANNOT, naming the variable** |

**For an un-upgraded host this is "wrong value, explained" becoming "no value, explained".** Both are
CANNOT, neither is a health regression, and the variable is named either way — which is why the
previous pin, a diagnostic and not a fix, was worth taking: **the "explained" half arrived with it.**

⚠️ **There is a population outside this fleet.** The registry is fetched unauthenticated and lists
atlas today; nobody can make those hosts upgrade. `./uis pull` moves a host to `latest`.

### ⚠️ What has not been observed

- **A run pod's rendered environment.** The value is declared correctly in the container context and
  has been read from a pod — but never from inside a *run* pod.
- **A plain install on a host that took this catalogue's word for the pin.** Until this pin moved that
  was impossible: `uis template install <id>` takes an id only, with no `--tag` or `--digest`, so a
  nominee cannot be installed through the supported surface until it is already pinned. The
  verification behind this pin used a locally repointed registry cache — **the install was real, the
  catalogue read was not** — and that was disclosed rather than glossed.
- **Scope.** One application, one cluster: k3s v1.25.16 on Rancher Desktop, zero IngressRoutes.

### What `uis template check atlas` actually reports

The check asks whether a deletion Brreg has published has been **applied** by the transform, not
whether one is merely **outstanding**:

| situation | verdict |
|---|---|
| deletions pending, awaiting the next transform at `:10`/`:40` | **OK** — *"not a fault"* |
| a deletion **applied** and the organisation **still served** by the API | **WARN** — a real fault, **at any age** |

It reports both at once when both are true, labelled differently, so a real fault is not hidden by
routine pending work. The question has no clock in it, so it cannot drift when the `:10`/`:40` offset
is tuned — and that offset is deliberate and therefore tunable.

> ### ✅ The check now tells you when nothing is running
>
> **This used to be a false all-clear.** With the pipeline switched off, the check reported healthy,
> exit 0, and said *"awaiting the next transform"* when no transform was scheduled — the reassuring
> half of the table above printed for the one reason it could not cover. **Fixed as of this pin**, and
> verified in both the total and the partial case:
>
> | state | what it says |
> |---|---|
> | all five instigators stopped | names them, `other instigators running 0`, **"Nothing is scheduled to reconcile the register"** |
> | **one** stopped, four running | *"…not yet applied — `brreg_transform_half_hourly` is STOPPED, nothing will apply them"*, `other instigators running 4` |
>
> ⚠️ **The partial case is the one a whole-fleet check would have missed** — it names the single
> stopped instigator while four others still run. That is the case that had no fix at all on the
> previous pin.
>
> Enable automation with `uis dagster automation --start`. `uis dagster automation` lists the
> instigators and their state.

### ⚠️ If you gate on the check's exit code, it changed — on 2026-09-16, not in this build

**A "dark" Automation block — where the check cannot reach Dagster to ask — returns `exit 0`.** It
returned `exit 2` up to and including `v20260916-e439668`. **This heading said "in this build" for
four pins after the change**, which is how a contract change reads as news long after anyone could
still act on it: if you are coming from any build from **2026-09-16** onward you already have this,
and if you are coming from an earlier one it is a change you have not yet absorbed.

The three states an exit code can carry, since that same rework:

| exit | state | means |
|---|---|---|
| 0 | `OK` | asked and answered, **or not asked at all** |
| 1 | `WARN` | a real fault, including one that self-heals on the next transform |
| 2 | `CANNOT` | asked and **unanswerable** — the check could not establish the answer |

**`CANNOT` dominates `WARN` dominates `OK`**, so one unanswerable block sets the whole exit code.

That is deliberate: **an exit code reporting the tool's own wiring is not a health gate.** But it is a
contract change, and anything of yours that treats non-zero as "unhealthy" will now pass where it
previously failed.

✅ **The build says so when it happens** — the printed output names the condition at the moment it
occurs, and the `EXIT CODES` docstring names the supported way to tighten it if you need the old
behaviour. **Check the printed phrase on the raw stream if you grep for it**; colour sequences can
break a naive match.

### ⚠️ The check is never proactive — it answers, it does not warn

| how you reach it | does it run? |
|---|---|
| `uis template check atlas` | **yes**, immediately |
| a shell in the pod | **yes** |
| anything on a schedule — Dagster, a log, a sweep | **no** |

**The only invoker is the check command.** Nothing runs it on a clock, so this is never "a log nobody
reads" — and it is also never something that tells you first. **Do not read "better diagnostics" as
"I will be told."** It reaches a human exactly when a human asks.

### Why the earlier releases being silent is the hazard

**Every atlas upgrade before this one required no operator action.** ⚠️ **That is a property of those
releases, not of atlas upgrades** — and it is the more dangerous half of this page, because three
silent upgrades in a row teach an expectation that the fourth violates. An operator who meets the
schema error without warning reads it as a broken release.

**Two surfaces answer two different questions, and this is the earlier one:**

| you are asking | read |
|---|---|
| *should I take this upgrade, and what will it cost?* | **this page**, before you re-install |
| *a run just failed — what now?* | `uis template info atlas`, which renders the artifact's `troubleshooting` block, and the install output itself |

**When a release needs operator action, this section will say so and name the cost**, because by the
time the install output tells you, you have already committed to it.

## What this directory is, and is not

**This directory is a catalogue pointer, not the application.** There is no atlas source
code here. The install definition is the OCI artifact named in `template-info.yaml`:

```
ghcr.io/terchris/atlas-data/uis:<tag>@<digest>
```

**The tag and digest are deliberately not repeated here.** They live in `source:` in
`template-info.yaml` and nowhere else on this page, because a second hand-maintained copy of a
digest is a second thing to forget: this block sat on `v20260909-853c696` for twelve days and
several releases, reading like the current pin to anyone who trusted it.

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

The entry's `description` and `abstract` are **atlas's own words**, supplied on urb-agents #489.
Change them only on atlas's word.

⚠️ **Two earlier versions of this description were wrong**, and the sequence is worth keeping:

1. `dev-templates` first wrote *"Norwegian business-register data"*, inferred from the
   `brreg_enheter` table in the install records.
2. Corrected to *"the Norwegian NGO sector, in one place"* from the repository's own one-liner —
   better, but still not the framing atlas uses.
3. atlas supplied the text above and explained why the first attempt was worst:
   **`brreg_enheter` is one raw table out of 47.** FHI contributes 21 and SSB 17. Brønnøysund
   supplies organisation *identity* — how an NGO gets a stable `orgnr` — so leading with it
   described the smallest source as though it were the subject.

The lesson recorded rather than the words: a domain inferred from a table name reads plausibly and
is not evidence. The prose in this repository is a stand-in until the owning application supplies
its own.
