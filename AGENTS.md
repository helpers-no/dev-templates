# AGENTS.md

This file is the entry point for Codex / OpenAI-family tooling and other agents. Same content as
[`CLAUDE.md`](CLAUDE.md) — see that file for the project orientation.

## Short version

- This repo is **`dev-templates`** — the URB template library: reusable project templates,
  the plan-based-workflow template, and the website that publishes them.
- Read [`website/docs/ai-developer/project-dev-templates.md`](website/docs/ai-developer/project-dev-templates.md)
  first; it is the authoritative project doc.
- Read [`website/docs/ai-developer/README.md`](website/docs/ai-developer/README.md) next for the
  AI-developer workflow.
- Plans live in [`website/docs/ai-developer/plans/`](website/docs/ai-developer/plans/).
- Fleet work arrives on the bus in `terchris/urb-agents`, not in this repo: the inbox is a query —
  `~/.local/bin/urb inbox --id dev-templates` (open issues labelled `to:dev-templates`).
  There is no mailbox directory.

## Where commands run — read this before your first command

This repo uses a devcontainer, and
[`DEVCONTAINER.md`](website/docs/ai-developer/DEVCONTAINER.md) says all commands run inside it.
That rule is about **project** commands — package managers, builds, tests, tooling.

Your own agent session runs on the **host**, in tmux. Reading files, `git`, and the bus client
(`~/.local/bin/urb`) are host commands and are not covered by that rule. Do not refuse fleet work
because of it.

For the always-critical rules and the full Start-Here reading order, see [`CLAUDE.md`](CLAUDE.md).
