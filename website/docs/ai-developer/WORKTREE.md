---
mdx:
  format: md
---

# Running Two Claude Sessions in the Same Repo

Running multiple Claude Code (or Claude VS Code) sessions against the same
working directory causes branch collisions: they share one `HEAD`, one index,
and one set of files. The moment one session checks out a different branch,
the other session's files mutate underneath it.

The fix is **git worktrees** — one repo, multiple working directories,
each on its own branch, all sharing a single `.git` object database.

## Setup

From your repo root (example: `~/code/<repo>` on `main`):

```bash
cd ..
git -C <repo> worktree add <repo>-featA -b featA
git -C <repo> worktree add <repo>-featB -b featB
```

You now have three sibling folders:

```
~/code/<repo>         # main
~/code/<repo>-featA    # featA
~/code/<repo>-featB    # featB
```

Each folder has an independent `HEAD`, working tree, and index. Git refuses
to check out the same branch in two worktrees at once — exactly the
collision you are avoiding.

## Without devcontainer (VS Code + Claude extension)

Open each worktree as its own VS Code window:

```bash
code ~/code/urbalurba-featA
code ~/code/urbalurba-featB
```

Each window runs its own Claude extension session, its own source control
panel, its own terminal. Two Claudes, two folders, zero branch conflicts.

## With devcontainer

Each worktree is a separate folder on the host, so each becomes its own
devcontainer:

1. Open `~/code/urbalurba-featA` in VS Code → **Reopen in Container**.
2. Open `~/code/urbalurba-featB` in a second VS Code window → **Reopen in Container**.

Each container is independent: its own `node_modules`, its own
`.devcontainer.extend/` state, its own Claude Code process. Commits,
fetches, and pushes all flow through the shared `.git` database on the
host, so no duplication of git history.

## Managing worktrees

```bash
git worktree list                          # show all worktrees
git worktree remove ../urbalurba-featA     # remove when done
git branch -d featA                        # delete the branch too
git worktree prune                         # clean up stale entries
```

## Gotchas

- **Untracked files do not follow.** `.env`, local secrets, `node_modules`,
  `.venv`, and build artifacts live only in the worktree where they were
  created. Copy `.env` files manually, or keep a `.env.example` committed
  and a small hydration script.
- **Same branch, two worktrees — not allowed.** Git will block it. Create a
  new branch for the second worktree.
- **Submodules** need re-initialization per worktree
  (`git submodule update --init`).
- **Name your VS Code windows** (or rely on folder names in the title bar)
  so you do not mix up which Claude is working on which feature.