# Dev Templates

## How We Work

**ALL work follows the plan-based workflow.** Before writing any code:

1. Check `website/docs/ai-developer/plans/active/` for in-progress work
2. Create an INVESTIGATE-*.md or PLAN-*.md in `website/docs/ai-developer/plans/backlog/`
3. Wait for user approval before implementing
4. Update the active plan file as you work — mark each task `[x]` immediately after completing it, mark phase headings as DONE
5. Read [website/docs/ai-developer/WORKFLOW.md](website/docs/ai-developer/WORKFLOW.md) for the full process
6. Read [website/docs/ai-developer/PLANS.md](website/docs/ai-developer/PLANS.md) for plan structure

**Where commands run.** Project commands — package managers, builds, tests, tooling — run inside
the devcontainer; see [DEVCONTAINER.md](website/docs/ai-developer/DEVCONTAINER.md). Your own agent
session runs on the **host**, in tmux: reading files, `git`, and the bus client
(`~/.local/bin/urb`) are host commands and are not covered by that rule. Do not refuse fleet work
because of it.

## Fleet coordination

You are **`dev-templates`**, an agent on the URB fleet. Fleet work does not arrive in this repo.

- Your inbox is a **query, not a directory**: `~/.local/bin/urb inbox --id dev-templates`
  (open issues labelled `to:dev-templates` in `terchris/urb-agents`).
- The protocol is `protocol/communication.md` in `terchris/urb-agents`, read **remotely**.
  Do not clone that repository and do not copy `protocol/` here.
- See [COORDINATION.md](website/docs/ai-developer/COORDINATION.md) for where `gh` applies and
  where `urb` does.
- **There is no file bus.** The bus is GitHub issues; `talk/` and `mailboxes/` directories are not
  read by anything. Do not create one.

## Project Details

Read [website/docs/ai-developer/README.md](website/docs/ai-developer/README.md) for the complete AI developer guide.

Read [website/docs/ai-developer/project-dev-templates.md](website/docs/ai-developer/project-dev-templates.md) for project-specific setup, tools, and commands.
