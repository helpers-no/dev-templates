# Talk — AI-to-AI Testing Protocol

Talk is a file-based communication protocol that enables two separate AI coding sessions to collaborate on testing. One session develops and builds, the other tests as a fresh user. They communicate by appending messages to a shared `talk.md` file.

---

## Why

Automated tests verify that code works mechanically. Talk sessions verify that the **user experience** works — that commands produce sensible output, that UIs show the right data, and that documentation matches reality. The tester operates as a new user would, following instructions without knowledge of the implementation.

---

## Participants

| Role | What they do |
|------|-------------|
| **Contributor** | Maintains the codebase, builds the container, writes test instructions, fixes issues |
| **Tester** | Follows instructions exactly, reports results, suggests improvements |

The contributor works in the main repo. The tester works in a separate directory with only the tools needed to test. They never share an AI session — the `talk.md` file is their only communication channel.

---

## Where the Talk Folder Lives

The `talk/` folder is located in the **tester's directory, outside the main repo**. This is critical because talk sessions routinely exchange sensitive information — passwords, secrets, API tokens, and service credentials that the tester needs to verify deployments. Keeping the talk folder outside the repo ensures this sensitive data is never accidentally committed or pushed.

```
testing/tester1/              # tester's working directory
├── talk/                     # talk folder (NOT in the repo)
│   ├── README.md             # protocol documentation
│   ├── talk.md               # active session
│   ├── talk1.md              # archived session 1
│   ├── talk2.md              # archived session 2
│   └── ...
└── [test tools]              # whatever the tester needs
```

Both the contributor and the tester have access to this folder. The contributor writes test instructions and reads results. The tester reads instructions and appends results.

---

## How It Works

```
Contributor                              Tester
    │                                       │
    ├── builds/deploys changes              │
    ├── writes test instructions ──────────►│
    │                                       ├── reads instructions
    │                                       ├── runs commands
    │◄────────────── reports results ───────┤
    ├── reviews results                     │
    ├── fixes issues if needed              │
    ├── rebuilds/redeploys                  │
    ├── writes next round ─────────────────►│
    │                                       ├── tests again
    │◄────────────── reports results ───────┤
    └── all tests pass → done               │
```

---

## Session Lifecycle

1. Contributor archives the previous `talk.md` by renaming it to `talk<N>.md` (next number)
2. Contributor creates a fresh `talk.md` with a header and test instructions
3. Tester reads, executes, appends results
4. Contributor reviews, fixes issues, appends next round
5. Repeat until all tests pass

---

## File Format

### Session Header

```markdown
# Talk - [Feature Name]

**Date**: YYYY-MM-DD
**Previous**: [talk<N>.md](talk<N>.md) — Previous session title
**Plan**: [PLAN-xyz.md](path/to/plan)

**What changed**:
- Summary of changes being tested

---
```

### Messages

Messages are numbered sequentially. The contributor writes test steps with expected output. The tester reports actual results.

```markdown
## Contributor Message 1

Instructions with numbered steps and expected output.

### Step 1: Run the setup command

\`\`\`bash
some-command --flag
\`\`\`

Expected: Output shows "Setup complete" with no errors.

### Step 2: Check the result

Open http://localhost:8080 and verify the dashboard loads.

---

## Tester - Message 2

### Step 1: Run the setup command

**Result:** PASS — Output shows "Setup complete".

### Step 2: Check the result

**Result:** FAIL — Dashboard shows "Connection refused". Error in console:
\`\`\`
Error: ECONNREFUSED 127.0.0.1:5432
\`\`\`

---
```

---

## Contributor Checklist

Before writing test instructions:

1. **Build and deploy** — ensure the tester gets the updated code
2. **Tell the tester to restart** if the environment changed
3. **Write specific expected output** for each step so the tester knows what to compare against
4. **Include browser tests** when testing UI changes (with exact URLs and what should appear)

---

## Rules

1. Always append to `talk.md` — never delete previous messages
2. Include full command output when reporting results
3. Report both successes and failures with exact error messages
4. Wait for the other party to respond before continuing
5. The tester may suggest improvements — these often catch real UX issues

---

## What Gets Caught

Talk sessions have caught issues that automated tests miss:

- **Wrong URLs** in documentation or configuration
- **Rendering errors** in UIs that work mechanically but look wrong
- **Missing steps** in deployment workflows
- **Confusing output** from CLI commands
- **Permission errors** that only appear for non-admin users
- **Missing configuration** that the developer's environment already has

These are the kinds of problems a real user would hit but unit tests would never find.

---

## Example Session

This is a simplified example showing the full cycle: test instructions, results, a bug discovered, a fix applied, and a tester suggestion.

```markdown
# Talk - Dashboard Deployment

**Date**: 2026-03-15
**Previous**: [talk3.md](talk3.md) — API endpoints
**Plan**: PLAN-dashboard-deployment.md

**What changed**:
- Added dashboard service with health check endpoint
- Configured reverse proxy routing

---

## Contributor Message 1

### Step 1: Restart the environment

\`\`\`bash
./deploy restart
\`\`\`

Expected: Services restart successfully.

### Step 2: Check the dashboard

Open http://dashboard.localhost

Expected: Dashboard loads with "System Status" heading.

---

## Tester - Message 2

### Step 1: Restart the environment

**Result:** PASS — All services restarted.

### Step 2: Check the dashboard

**Result:** FAIL — Page shows "502 Bad Gateway".

The health check endpoint responds:
\`\`\`
curl http://localhost:3000/health
{"status":"ok"}
\`\`\`

But the reverse proxy route returns 502.

---

## Contributor Message 3

Fixed — the proxy was routing to port 8080 instead of 3000. Rebuilt.

### Verify:
1. Restart
2. Open http://dashboard.localhost
3. Expected: "System Status" heading with green indicators

---

## Tester - Message 4

**Result:** PASS — Dashboard loads correctly. "System Status" heading
with 3 green indicators.

### Suggestion:
The page title in the browser tab says "React App" instead of
"Dashboard". Minor but confusing for users.

---

## Contributor Message 5

Good catch — fixed the page title. Rebuilt. Please verify.

---

## Tester - Message 6

**Result:** PASS — Browser tab now shows "System Dashboard".
All tests passing.
```

Notice how the session caught two issues:
1. **Wrong proxy port** — routing to 8080 instead of 3000
2. **Wrong page title** — tester suggestion led to a fix

Neither would have been caught by automated tests.
