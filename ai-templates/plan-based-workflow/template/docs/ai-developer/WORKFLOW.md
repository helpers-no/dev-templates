# Plan to Implementation Workflow

How ideas become implemented features.

**Related:**
- [PLANS.md](PLANS.md) — Plan structure, templates, and best practices
- [GIT.md](GIT.md) — Git safety rules and platform operations

---

## The Flow

**Note:** The AI always asks for confirmation before running git commands (add, commit, push, branch, merge). See [GIT.md](GIT.md).

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  1. USER: "I want to add feature X" or "Fix problem Y"              │
│                                                                     │
│  2. AI: Investigates the problem                                    │
│     - Researches best practices, tools, approaches                  │
│     - Creates INVESTIGATE-*.md or PLAN-*.md in plans/backlog/       │
│     - Asks user to review                                           │
│                                                                     │
│  3. USER: Reviews, asks AI to check for gaps, then confirms         │
│                                                                     │
│  4. AI: Implements phase by phase                                   │
│     - Moves plan to plans/active/                                   │
│     - Works through phases in order                                 │
│     - Asks user to confirm after each phase                         │
│     - Updates plan with progress                                    │
│                                                                     │
│  5. USER: Reviews result                                            │
│                                                                     │
│  6. AI: Completes                                                   │
│     - Moves plan to plans/completed/                                │
│     - Final commit and PR if on feature branch                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Describe What You Want

Tell the AI what you want to do:

```
"I want to add a search feature"
```

```
"Fix the broken navigation on mobile"
```

```
"We need to evaluate options for authentication"
```

---

## Step 2: AI Investigates and Plans

This is the **most important step**. The AI should spend the most time here.

### When the solution is clear:

The AI creates `PLAN-*.md` in `plans/backlog/` and asks you to review.

### When research is needed first:

The AI creates `INVESTIGATE-*.md` in `plans/backlog/`. During investigation, the AI should:

- **Research best practices** — use web search to find how others have solved similar problems
- **Find tools and libraries** — and verify they are actively maintained, recently updated, and have healthy community adoption
- **Analyse options** — document pros/cons of different approaches
- **Check its own findings** — AI can hallucinate tools or patterns that don't exist. Ask it to verify.

After investigation, the AI creates one or more PLAN files with the chosen approach.

### Review the investigation or plan:

- Are the phases in the right order?
- Are the tasks specific enough?
- Is anything missing?

**Ask the AI to check for gaps:** "Are there gaps in this plan?" or "What could go wrong?" This catches missing steps, overlooked dependencies, and edge cases.

Edit the file if needed. When satisfied:

```
"Plan approved, start implementation"
```

---

## Step 3: AI Implements

The AI will:

1. **Ask about feature branch** (recommended):

   > "Do you want to work on a feature branch? (recommended)
   >
   > This keeps your changes separate from the main code until you're ready.
   > When done, you'll create a Pull Request to merge your changes."

   **If yes:** AI creates a branch like `feature/add-search`
   **If no:** AI works directly on the current branch

2. **Move plan to active/**

3. **Work phase by phase**:
   - Complete tasks in order
   - Ask user to confirm each phase: "Phase 1 complete. Does this look good?"
   - Update the plan file (mark tasks complete)
   - Commit after user confirms
   - Stop if user has concerns

4. **Ask for help** if blocked or unclear

---

## Step 4: Review Result

Check the changes. If changes are needed, tell the AI what to fix.

If good:

```
"Looks good, complete it"
```

---

## Step 5: AI Completes

The AI will:

1. **Move plan to completed/**
2. **Update plan status**: `## Status: Completed`
3. **Push changes**

**If working on a feature branch**, the AI will also:

4. **Create a Pull Request**
5. **Explain next steps**:
   > "I've created a Pull Request. You can:
   > - Review it on GitHub/Azure DevOps
   > - Ask someone to review it
   > - Merge it when ready"

---

## Quick Reference

### Commands to give the AI:

| You say | AI does |
|---------|---------|
| "I want to add X" / "Fix Y" | Investigates, creates plan, asks for review |
| "Check this plan for gaps" | Analyses plan for missing steps and edge cases |
| "Plan approved" | Asks about feature branch, moves to active/, starts implementing |
| "Yes, use a feature branch" | Creates branch, works there |
| "No, work on current branch" | Works on current branch |
| "Looks good, complete it" | Moves to completed/, creates PR if on feature branch |
| "Stop" | Pauses and waits for instructions |

---

## Example Session

```
YOU: I want to add a caching layer for the API responses

AI:  This needs some research first. I'll investigate caching options.
     Created plans/backlog/INVESTIGATE-api-caching.md

     Please review the investigation and let me know if it looks good
     or needs changes.

YOU: [reviews file]
     Can you also check what Redis alternatives exist that are simpler?

AI:  [updates investigation with Redis alternatives analysis]
     Updated the investigation. Ready for your review.

YOU: Looks good. The plan looks solid.

AI:  Do you want to work on a feature branch? (recommended)

YOU: Yes

AI:  Created branch: feature/api-caching
     Moving plan to active/...
     Starting Phase 1...

     [works through phases, asking for confirmation after each]

     Phase 2 complete. All tests passing.
     Continuing to Phase 3...

     All phases complete. Please review the changes.

YOU: Looks good, complete it

AI:  Done! I've:
     - Moved plan to completed/
     - Pushed the feature branch
     - Created Pull Request #15

     Next steps:
     - Review the PR
     - Merge it when you're ready
```

---

## What is a Feature Branch?

*If you're new to git branches, this section explains the concept.*

### The Problem

Imagine you're writing a book with others. If everyone edits the same copy at the same time, it gets messy. Someone might overwrite your changes, or you might break something while experimenting.

### The Solution: Branches

A **branch** is like making a personal copy of the book to work on. You can:
- Make changes without affecting the original
- Experiment freely
- Share your copy when it's ready

```
main (the original)
  │
  └── feature/add-caching (your copy)
        │
        └── [you work here safely]
```

### The Workflow

1. **Create branch** — Make your personal copy
2. **Work on it** — Make changes, commit as you go
3. **Create Pull Request (PR)** — Ask to merge your changes back
4. **Review** — Others can look at your changes before merging
5. **Merge** — Your changes become part of the original

### Why It's Recommended

- **Safe**: Your experiments don't break the main code
- **Reviewable**: Others can check your work before it's merged
- **Reversible**: Easy to undo if something goes wrong
- **Collaborative**: Multiple people can work on different features

You don't need to memorize the git commands — the AI handles them for you. See [GIT.md](GIT.md) for details.

---

## Optional: Working with Issues

If you're using an issue tracker (GitHub Issues, Azure DevOps Work Items), tell the AI:

```
"Work on issue #42"
```

The AI will:
1. Read the issue
2. Create a plan based on the issue
3. Create a branch linked to the issue
4. Close the issue when complete
