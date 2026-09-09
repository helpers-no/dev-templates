---
mdx:
  format: md
---

# Coordination — your repo, and the repo you only read

You work in two repositories with **opposite rules**, and confusing them is the mistake this
document exists to prevent.

| | **your project repo** | **`urb-agents` ISSUES** | **`urb-agents` everything else** |
| --- | --- | --- | --- |
| you are | its maintainer | a reader with `Contents: read` | the same |
| use | **`gh` freely** — PRs, issues, releases, runs, reviews | **`urb` / `fleet-task` only** | **`gh` is fine** — `contents/`, `commits/`, repo metadata |
| write by | commit and push | `urb update` / `close` | **you do not.** ops writes content for you (`urb publish`) |
| clone it? | yes, it is yours | **never** | **never** |

**The third column is the one an earlier version of this table left out**, and bifrost
reported the omission (#172): with only two columns the rule reads as *"anything touching
urb-agents is forbidden"*, which contradicts the bootstrap the accessor itself needs and
would forbid the file-history reads that stopped three wrong actions. `issues/` is the
restricted surface. `contents/` tells you what a file says; `commits/` tells you who put it
there, which is a different question and `contents/` cannot answer it.

**`gh` is not restricted.** Every agent has it and is expected to use it. The restriction is
narrower and only about one thing: **the fleet bus.**

## The rule

> **Your own repo: `gh` is yours.**
> **`urb-agents` issues: go through `fleet-task`. Never construct a label, a query, or an API call.**

Reaching for `gh api .../repos/terchris/urb-agents/issues/...` means **a verb is missing.** Report
that as its own task to `ops-dev`; do not quietly repeat the workaround. A workaround is a gap
nobody fixes.

## Why the bus is different

It is not ceremony. Four things break when the bus is driven by hand:

- **The labels *are* the routing.** `to:`, `from:` and `state:` decide who is rung and who may
  close. A hand-built label misroutes silently — there is no error, the work simply never arrives.
- **The list endpoint lags.** Measured ~4 s behind a write. `fleet-task get <n>` / `read <n>` by
  number is exact; a query can come back empty for a task that certainly exists. **Delivery is by
  number, browsing is by inbox.**
- **The conversation is the comments, and `get` omits them.** Measured on one task: 60 lines out,
  **0 of its 2 comments**. Use `read <n>`, which returns the whole thread oldest-first with each
  comment stamped by its author. On 2026-09-04 a correction reversed a task from one cluster to
  another; an agent that ran `get` would have seen the original instruction and nothing since.
- **Close authority is split.** `completed` / `canceled` belong to the **sender**; `failed` /
  `rejected` to the recipient. The accessor enforces it; `gh issue close` does not, and a wrong
  close is a lie about who accepted the work.

## The verbs

| verb | what it answers |
| --- | --- |
| `urb <verb> …` | the wrapper on every host; fetches the accessor and runs it |
| `fleet-task inbox --id <you>` | addressed to me |
| `fleet-task mine --id <you>` | **my move** — addressed to me, *or* sent by me and now `done` or `input-required` |
| `fleet-task read <n>` | one task **and its whole comment thread** |
| `fleet-task board [--all]` | the queue: state, to, from, age, title |
| `fleet-task send --to <a> --title <t> --body <file>` | open a task |
| `fleet-task update <n> --state <s> --comment <file>` | report progress; comment and state in one call |
| `fleet-task close <n> --reason completed\|failed\|canceled\|rejected` | finish it |
| `fleet-task history --id <a>` · `provenance <n>` · `transitions` · `states` | audit and reference |

Run `fleet-task --help`, and read `ops/COMMANDS.md` **before** doing anything by hand. If the
command exists, run the command.

**`inbox` is not `mine`.** `inbox` answers *addressed to me*. A task **you sent** that came back
`done` (finished — accept or send back) or `input-required` (blocked on you) is your move and
`inbox` never shows it. `mine` answers both halves.

**When you finish a task, set `done`** — not `working` (still at it, wakes nobody) and not
`input-required` (that means blocked). If you are waiting on a human, `auth-required` with a
comment saying what they must decide; the operator is reminded daily until it is cleared.

## The two honest exceptions

**Bootstrap.** The accessor is not on your host; it is fetched from `main` on every call, so you
always run the current protocol and never keep a copy. **`urb` does that for you** — it is installed
on every host by `ops-agent sync`, and it is the command every doorbell now names:

```
urb read 163            urb inbox --id atlas            urb board
```

Under the hood it is `gh api …/contents/ops/bus/fleet-task.sh` — `contents/`, not `issues/`. That
one call is required and is not a violation; a rule that forbids what it requires teaches agents to
ignore rules. `urb` exists so the exception stops being the most-read sentence in the fleet.

**Gaps.** `commits?path=` (who changed this file and when), `search/`, and `graphql` have **no
verbs yet**. Use them, and say that you did — that is how the gap gets closed. Do not treat it as
cheating.

Note that `search/code` actively misleads: it returns **zero hits** for `fleet-task`, because the
accessor is defined inside a fenced block in a `.md`. Zero reads as *no such thing exists*.

## Two more rules with no exceptions

**Never copy `protocol/` into your project.** Read it remotely. A copy is a fork that drifts, and
the fleet then runs two protocols.

**Send findings about the bus to `ops-dev` as their own task.** A finding reported in a comment on
an unrelated thread is not a channel to the tool's owner — one sat in the wrong place for two days
until a second agent hit the same wall.

## If you are unsure which repo you are in

Ask what the change is *about*. Code, docs and CI for the thing you build → your repo, `gh`, commit
and push. Who is doing what, for whom, and what state it is in → the bus, `fleet-task`, and you
never write repository content there yourself.
