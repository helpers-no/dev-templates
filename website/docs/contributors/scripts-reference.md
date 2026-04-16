---
sidebar_position: 5
---

# Scripts Reference

Script documentation lives at [`project-scripts.md`](../ai-developer/project-scripts.md) in the AI-developer section.

That page is the canonical source of truth for every script under `scripts/` — both for human contributors and for AI assistants. It has:

- A **runnable scripts** table with the exact command, a one-line purpose, and when to run each one
- A **library modules** table with each module's purpose and its importers
- The full **pre-push pipeline** sequence
- **Per-script detail sections** explaining what each script reads, writes, and how to extend
- **Conventions** — exit codes, logging, the "adding a new script" checklist

The redirect is intentional. The same script documentation needs to serve both a human contributor browsing the website and an AI assistant running a task, so it lives in one place (`ai-developer/project-scripts.md`) rather than being duplicated here.
