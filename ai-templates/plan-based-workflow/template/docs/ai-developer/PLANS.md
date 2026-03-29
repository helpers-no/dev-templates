# Implementation Plans

How we plan, track, and implement features and fixes.

**Related:** [WORKFLOW.md](WORKFLOW.md) — End-to-end flow from idea to implementation

---

## Folder Structure

```
plans/
├── backlog/      # Approved plans waiting for implementation
├── active/       # Currently being worked on (max 1-2 at a time)
└── completed/    # Done - kept for reference
```

### Flow

```
Idea/Problem → INVESTIGATE file (if unclear) → PLAN file in backlog/ → active/ → completed/
```

---

## File Types

### INVESTIGATE-*.md

For work that **needs research first**. The problem exists but the solution is unclear.

**This is the most important part of the workflow.** The developer should spend most of their time here. A thorough investigation leads to a good plan, which leads to clean implementation. A rushed investigation leads to rework.

**When to create:**
- Complex work where options need evaluation
- Bug with unknown root cause
- Feature requiring design decisions or architectural choices
- New tool or library selection

**Naming:** `INVESTIGATE-<topic>.md`

Examples:
- `INVESTIGATE-authentication-options.md`
- `INVESTIGATE-performance-issues.md`

**What makes a good investigation:**

- **Research best practices** — use web search to find how others have solved similar problems, what patterns exist, what pitfalls to avoid
- **Find tools and libraries** — and critically, verify they are actively maintained, recently updated, and have healthy community adoption. AI knowledge has a cutoff date and can recommend abandoned projects.
- **Analyse options** — document pros and cons of each approach with clear reasoning
- **Check for gaps** — after drafting, ask "are there gaps?" or "what could go wrong?" This catches missing steps, overlooked dependencies, and edge cases.
- **Verify findings** — AI can hallucinate tools, libraries, or best practices that don't exist. Ask it to verify its recommendations against current sources.
- **Iterate** — investigations improve through multiple rounds of questions and analysis. The first draft is rarely complete.

The investigation file is a **living document** — it captures decisions, rejected options, and the reasoning behind choices. When someone asks "why did we do it this way?" months later, the investigation has the answer.

**After investigation:** Create one or more PLAN files with the chosen approach.

### PLAN-*.md

For work that is **ready to implement**. The scope is clear, the approach is known.

**When to create:**
- Bug fix with known solution
- Feature request with clear requirements
- Work scoped by a completed investigation

**Naming Conventions:**

| Format | Use Case | Example |
|--------|----------|---------|
| `PLAN-<short-name>.md` | Standalone plan, no specific order | `PLAN-fix-mobile-nav.md` |
| `PLAN-<nnn>-<short-name>.md` | Ordered sequence, indicates execution order | `PLAN-001-data-migration.md` |

#### Ordered Plans (PLAN-nnn-*)

When an investigation produces multiple related plans that should be executed in a specific order, use **three-digit numbering** to indicate the sequence:

```
PLAN-001-data-migration.md        # Must be done first (foundation)
PLAN-002-schema-update.md         # Depends on 001
PLAN-003-ui-components.md         # Depends on 002
PLAN-004-integration-tests.md     # Depends on 003
```

**When to use ordered numbering:**
- Investigation produces 3+ related plans
- Plans have sequential dependencies
- Work is part of a larger initiative

**When NOT to use ordered numbering:**
- Standalone bug fix or small feature
- Plans can be executed in any order
- Single plan from an investigation

### Splitting Investigations into Multiple Plans

When an investigation covers a large initiative, split it into separate ordered plans rather than one monolithic plan. Each plan should be independently completable and deliverable.

**How to split:**

1. **Group by dependency and risk** — phases that need different prerequisites should be separate plans
2. **Group by completeness** — each plan should deliver something useful on its own
3. **Keep optional/deferred work separate** — don't mix required work with nice-to-haves

Each plan references the investigation and the previous plan in its header:

```markdown
**Investigation**: [INVESTIGATE-xyz.md](../backlog/INVESTIGATE-xyz.md)
**Prerequisites**: PLAN-001 must be complete first
```

---

## Plan Structure

Every plan has these sections:

### 1. Header (Required)

```markdown
# Plan Title

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Backlog | Active | Blocked | Completed

**Goal**: One sentence describing what this achieves.

**Last Updated**: YYYY-MM-DD
```

The **IMPLEMENTATION RULES** blockquote ensures the AI reads the workflow and plan guidelines before starting work.

### 2. Dependencies (If applicable)

```markdown
**Prerequisites**: PLAN-001 must be complete first
**Blocks**: PLAN-003 cannot start until this is done
**Priority**: High | Medium | Low
```

For ordered plans, dependencies are often implicit in the number order. Only add explicit dependency notes when the relationship is non-obvious.

### 3. Problem Summary (Required)

What's wrong or what's needed. Be specific.

### 4. Phases with Tasks (Required)

Break work into phases. Each phase has:
- Numbered tasks
- A validation step at the end

```markdown
## Phase 1: Setup

### Tasks

- [ ] 1.1 Create the config file
- [ ] 1.2 Add validation rules
- [ ] 1.3 Test with sample data

### Validation

User confirms phase is complete.

---

## Phase 2: Implementation

### Tasks

- [ ] 2.1 Update the main component
- [ ] 2.2 Add error handling
- [ ] 2.3 Write tests

### Validation

User confirms implementation works correctly.
```

### 5. Acceptance Criteria (Required)

```markdown
## Acceptance Criteria

- [ ] Feature works correctly
- [ ] No regressions
- [ ] Documentation updated
```

### 6. Implementation Notes (Optional)

Technical details, gotchas, code patterns to follow.

### 7. Files to Modify (Optional but helpful)

```markdown
## Files to Modify

- `path/to/file.ext`
- `path/to/other.ext`
```

---

## Status Values

| Status | Meaning | Location |
|--------|---------|----------|
| `Backlog` | Approved, waiting to start | `plans/backlog/` |
| `Active` | Currently being worked on | `plans/active/` |
| `Blocked` | Waiting on something else | `plans/backlog/` or `plans/active/` |
| `Completed` | Done | `plans/completed/` |

---

## Updating Plans During Implementation

**Critical:** Plans are living documents. Update them as you work. **Mark each task `[x]` immediately after completing it, and mark each phase heading as DONE.** This is not optional — the plan file is the source of truth for progress. If the AI session is interrupted or context is lost, the plan shows exactly where work left off.

### When starting a phase:

```markdown
## Phase 2: Implementation — IN PROGRESS
```

### When completing a task:

```markdown
- [x] 2.1 Update the main component ✓
- [ ] 2.2 Add error handling
```

### When a phase is done:

```markdown
## Phase 2: Implementation — DONE
```

### When blocked:

```markdown
## Status: Blocked

**Blocked by**: Waiting for decision on approach
```

### When complete:

1. Update status: `## Status: Completed`
2. Add completion date: `**Completed**: YYYY-MM-DD`
3. Move file to `plans/completed/`

---

## Validation

Every phase ends with validation. The simplest form is asking the user to confirm.

### Default: User Confirmation

The AI asks: "Phase 1 complete. Does this look good to continue?"

In the plan, this can be written as:

```markdown
### Validation

User confirms phase is complete.
```

### Optional: Automated Check

When a command can verify the work, include it:

```markdown
### Validation

\`\`\`bash
# Command that verifies the work
some-check-command
\`\`\`

User confirms output is correct.
```

### Key Point

Don't force automated validation when it's impractical. User confirmation is valid and often the best approach.

---

## Plan Templates

### Simple Bug Fix

```markdown
# Fix: [Bug Description]

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Backlog

**Goal**: [One sentence]

**Last Updated**: YYYY-MM-DD

---

## Problem

[What's broken]

## Solution

[How to fix it]

---

## Phase 1: Fix

### Tasks

- [ ] 1.1 [Specific change]
- [ ] 1.2 [Another change]

### Validation

User confirms fix is correct.

---

## Acceptance Criteria

- [ ] Bug is fixed
- [ ] No regressions
```

### Feature Implementation

```markdown
# Feature: [Feature Name]

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Backlog

**Goal**: [One sentence]

**Last Updated**: YYYY-MM-DD

---

## Overview

[What this feature does and why]

---

## Phase 1: [Setup/Preparation]

### Tasks

- [ ] 1.1 [Task]
- [ ] 1.2 [Task]

### Validation

User confirms phase is complete.

---

## Phase 2: [Core Implementation]

### Tasks

- [ ] 2.1 [Task]
- [ ] 2.2 [Task]

### Validation

User confirms phase is complete.

---

## Acceptance Criteria

- [ ] [Criterion]
- [ ] [Criterion]
- [ ] Documentation updated

---

## Files to Modify

- `path/to/file.ext`
```

### Investigation

```markdown
# Investigate: [Topic]

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Backlog

**Goal**: Determine the best approach for [topic]

**Last Updated**: YYYY-MM-DD

---

## Questions to Answer

1. [Question 1]
2. [Question 2]

---

## Current State

[What exists now]

---

## Options

### Option A: [Name]

**Pros:**
-

**Cons:**
-

### Option B: [Name]

**Pros:**
-

**Cons:**
-

---

## Recommendation

[After investigation, what do we do?]

---

## Next Steps

- [ ] Create PLAN-xyz.md with chosen approach
  - For multiple related plans, use ordered naming: PLAN-001-*, PLAN-002-*, etc.
```

---

## Best Practices

1. **Investigate first** — spend time understanding the problem before planning the solution
2. **One active plan at a time** — finish before starting another
3. **Small phases** — easier to validate and recover from errors
4. **Specific tasks** — "Update the config in file.ext" not "Fix the thing"
5. **Update as you go** — the plan is the source of truth
6. **Keep completed plans** — they're documentation of what was done and why
7. **Ask for gap analysis** — "Are there gaps in this plan?" catches issues early
