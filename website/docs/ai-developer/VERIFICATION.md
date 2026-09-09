---
mdx:
  format: md
---

# Can this round of verification be trusted?

**The failure this prevents: a check that reports the same verdict whatever the state it is meant to
tell apart — and reads as proof either way.**

A green run is what a working check and a broken check look like from outside. So is a red one. If
you take one thing from this page: before believing a verdict, ask what result the check would give
if the thing it measures were *not* true. If the answer is "the same one", the round proved nothing
and cost somebody a day.

## What this is not

- **Not a test-writing guide.** Nothing here is about assertions, fixtures, or coverage.
- **Not a CI document.** It applies equally to a shell command run by hand.
- **Not about who tests.** If your project separates the builder from the verifier, this is what
  makes that separation worth having; if it does not, everything here still applies to checking your
  own work, only with nobody to catch you.

It is about one question: **when a round of verification finishes, is its verdict evidence?**

## The core rule

> **After injecting a fault, read the value back from where the code will actually read it. Only
> then run the test.**

A falsification that does not actually break anything produces a passing run that reads as proof the
check works. That is worse than having no falsification at all: it manufactures confidence in both
directions.

The shape is always the same — **the injection happens at a layer the thing under test rewrites,
ignores, or never reaches.** Three real examples, anonymised, because the rule sounds too obvious to
need stating until you see how it hides:

| The injection | Why it was inert |
|---|---|
| An environment variable set outside a container, for code running inside it | The container did not inherit the caller's environment, so the value never crossed the boundary |
| The same variable, after that was fixed | The command short-circuited earlier — already configured — and never reached the code that reads it |
| A patched secret in a cluster, then the deploy command under test | The deploy re-applied secrets from a generated file *first*, reverting the patch inside the very command being tested against it |

All three went green. One was nearly filed as *"the check cannot detect the misconfiguration it
exists for"* — a false alarm on that service's most important assertion.

**Reading it back costs seconds** and needs no special access: print the value from inside the
boundary the code lives in, or query the cluster after the command has run. If what comes back is
not what you injected, the recipe is inert. Fix it before handing the round to anyone.

**Then write the confirmation into the dispatch**, so an inert injection cannot be mistaken for a
working check:

```markdown
**a. Confirm the fault is actually present, then test:**

    <read the value back from inside>     # must print the injected value
    <the command under test>              # only meaningful if the line above did

If the first command does not show the fault, the second proves nothing whatever it says.
```

## Eight ways a round proves nothing

The core rule covers falsifications. These are its siblings. Every one was found by a verifier, and
every one cost a round.

### 1. A falsification that cannot fail

The core rule above. The injected fault never arrives, so the check passes and the pass is read as
the check working.

### 2. A gate that cannot pass

A pre-flight said *refuse to start unless the artefact reports version X*, and read the version from
the wrong path inside the artefact. The file was not there, so the gate failed **whatever the build
state** — it could not discriminate the thing it existed to discriminate.

> **A gate that cannot pass is the mirror image of a falsification that cannot fail.** Both report
> the same verdict regardless of the state they are meant to tell apart.

This is the more dangerous direction, because **refusing looks like working**. A gate that wrongly
refuses gets thanked for being careful.

Two things follow:

- **Copy the command the product already uses.** In that case the correct pre-flight was sitting a
  few lines away in the file being edited. It was written from memory instead.
- **An error is not a negative result.** `No such file or directory` means *the gate is broken*, not
  *the wrong version*. A dispatch must say which of the two a non-zero exit is, or the verifier will
  grade the subject on a broken instrument.

### 3. The code under test must be the code doing the work

Testing a fix to a self-update mechanism, the verifier installed the **pre-fix** version to trigger
an update, ran it, saw the old behaviour, and was one step from filing *"the fix does not work"*.

The component that *performs* the update is the one that reports on it. Installing the old version to
trigger the new one meant the fix was what got **installed**, never what **ran**.

> **Confirming the fault is present is not enough. The code under test has to be the code doing the
> work.**

This survives the core rule: the fault really was present and really was read back correctly.

### 4. A pre-flight must not consume the state the acceptance measures

One dispatch asked for both:

- pre-flight: fetch the artefact, then check its version
- acceptance: the artefact's digest **must change** when the command under test fetches it

Performing the pre-flight satisfies the fetch, so the digest could not change afterwards and the
acceptance **could never pass on its own terms**.

> **Read the pre-flight and the acceptance together and ask whether performing the first destroys the
> evidence for the second.**

Prefer a pre-flight that **observes** — query a registry, inspect a manifest, read a label — over one
that **acts**. Anything the pre-flight does is state the acceptance no longer gets to measure.

### 5. A gate that skips is a gate that passes

A conditional check whose condition is not met does not run, and a check that does not run is
indistinguishable from one that passed. Exit code 0, nothing red, nothing said.

> **Read the task result, not the exit code.** A verdict of "all green" must mean every check ran,
> not that none of them complained.

This is worth an explicit criterion whenever a check is conditional: *confirm the check executed on
a healthy subject rather than being skipped into a pass.*

### 6. A check that samples a load-balanced resource has a failure rate, not a verdict

A check asked one question of an address backed by two different things and reasoned about the
answer. Sound while one thing was behind it; meaningless once two were. Measured on a single broken
state: **five runs gave four failures and one pass.** Anyone running it once had a one-in-five chance
of being told everything was fine.

> **If a check samples, it does not have a verdict — it has a probability.**

The fix is not to sample harder. It is to **refuse to characterise** what a single sample cannot
describe: detect the mixed state and say so. A refusal cannot itself be sampled wrong.

### 7. An unprovable assertion must not read as a successful one

A check could not make its comparison in one configuration, so it printed *NOT PROVEN* and **exited
0**. The run reported success while explicitly stating it had proved nothing — and the summary line
above it claimed the property held.

> **"I could not check" is a failure, not a pass.** If a check cannot be made, the run must fail, or
> the words "not proven" are decoration.

### 8. Verify the artefact, not the claim

A verifier graded a change, the change was merged, and the merge was reported as done. Three
separate times a check of *what actually landed* against *what was graded* was worth making — once
because a rebase would have changed it, once because a status file rode along in the same commit,
once because the branch had moved.

Related and cheaper: **a green run on the wrong commit looks identical to a green run on the right
one.** Read the revision the run executed against, not its timestamp. "It ran after the fix landed"
is not the same as "it ran on the fix".

> **Diff what shipped against what was graded. Do not trust the merge, including your own.**

## One more, about the subject rather than the check

A recovery action must not sit behind a recognition test. A teardown was gated on recognising a
component by a marker; components created before the marker existed were not recognised, so the
recovery silently did nothing and left the system worse than not trying. Nothing failed, nothing was
logged.

It is here because it was found by verification and it is the same shape as everything above: **a
conditional that quietly does nothing is indistinguishable from one that succeeded.**

## Merged is not shipped

**A "verify the fix" round graded an artefact that did not contain the fix.** Twice in two days, in
two repositories, by two different builders, with two different kinds of change:

- a test merged to the default branch, while the deployment ran an image built **twelve days
  earlier**. The run reported *"does not match any enabled nodes"* and **exit 0** — a silent success
  where it should have been the loudest red available.
- a configuration fix merged, while the container under test was built from an earlier commit. The
  fix was reported as **not working**.

Both would have sent the builder to debug **working code**, which is worse than a red. Both were
caught by a verifier checking the artefact's version *before* grading, rather than after a confusing
result — habit, not process.

One of the builders made it worse by reasoning about the wrong object: it told the verifier the
change was *"image-independent"* because the data it read was. The data was. **The test that reads it
ships inside the image.**

**The rule.** A declaration names the artefact under test — image tag, container version, commit.
The verifier confirms that artefact contains the change *before* grading it. A verifier handed a
version-pinned artefact is testing **that artefact**, not the branch.

The confirmation is usually one command: a `grep` for a string the fix introduces, or the build's own
manifest output. It costs seconds and it is the difference between "the fix does not work" and "the
fix is not here yet" — which look identical from the outside and lead in opposite directions.

## The object you measured, and the object that mattered

Three defects in one night, all the same error: **reasoning about a thing one level away from where
it actually lives.**

- A **metadata label** was read instead of the data rows it described. The label was accurate; the
  rows were twelve days old.
- A test was written, merged, and confirmed **present in the manifest**. Nothing ran it — it
  referenced no parent object, so the orchestrator attached it to nothing. Present is not reachable.
- A fix was verified **in the source repository** while the deployment ran an image built twelve days
  earlier. The reasoning was that the data being checked is image-independent. True, and irrelevant:
  the *check* ships inside the image.

Each time, the object reasoned about sat adjacent to the object that decided the outcome, and the
adjacency was invisible from where the reasoning happened. Every one of the three produced a
confident, well-argued, wrong conclusion.

Two were caught by guards their own author had written. One was caught by the second party. **None
were caught by rereading**, which is the part worth keeping: this failure is not carelessness and
attention does not fix it.

**The test.** Name the object your claim is about. Name the object the outcome depends on. If they
are not the same object, you have not verified what you think you have — "the label says refreshed"
is a claim about a label, and "the rows are recent" is a claim about rows.

## A guard that matches a name cannot see an unreachable flag

`ops-dev`, 2026-09-06. The accessor grew `read --body`, a boolean that prints an issue body and
nothing else. It was added above an existing `--body <file>` branch in the same flat argument
parser. A `case` takes the first branch that matches, so the boolean won for **every** verb and the
value branch became dead code. `send --body`, `publish --body`, `publish-status.sh --via-bus`,
`publish-host.sh` and both probes in `verify-token.sh` all died with `unknown argument`. Two of
those fetch the accessor from `main` at call time, so it was live fleet-wide, and it shipped in the
release announced to ten agents as *"the bus has the commands it was missing"*.

The selftest covering it was:

```sh
if grep -q 'BODY_ONLY' bus/fleet-task.sh; then ok_ "read --body emits the body and nothing else"
```

It stayed green the whole time, and it was right: `BODY_ONLY` was in the file. The name was present.
Only the flag was unreachable. **Presence of a symbol is not reachability of a behaviour**, and no
amount of grepping distinguishes them, because the string is identical in both worlds.

The replacement runs the parser and asserts on `unknown argument` specifically — so a missing token
in CI still passes, and only a parse failure fails. Each of the three new checks was confirmed to
fail against the broken copy before being trusted against the fixed one.

Two things generalise:

- **When you add a second meaning for an existing name, the question is not "does my new one work"
  but "which one wins".** Both had tests. Only the loser had no execution behind its test.
- **The blast radius of a shared entry point is its callers, not its verbs.** The defect looked like
  two broken subcommands and was actually five broken tools, three of them in other files that no
  one edited.

## The general form

Every item on this page is one sentence:

> **"I could not ask" and "the answer was no" must never be reported the same way.**

A health check that cannot reach a service must not report the service unhealthy. A configuration
step that cannot connect must not report the target missing. A falsification that injected nothing
must not report a working check. The failure is identical in all three: **an absent result read as a
negative result.**

## Before you hand over a round

- Would this check give a different answer if the property were false? Name the answer.
- If it injects a fault, is the fault readable from where the code reads it? Show the read-back.
- Does the pre-flight consume what the acceptance measures?
- Is the code under test the code doing the work?
- Can any check be *skipped* into a pass?
- Does anything sample something that might have more than one thing behind it?
- If a check cannot be made, does the run fail — or print a caveat and exit 0?
- After it merges, does what shipped match what was graded?

## A note on separated roles

If a project separates the agent that builds from the agent that verifies, this page is what makes
that separation load-bearing rather than ceremonial: the verifier's job is not to run the steps but
to establish that the steps *could have failed*. Several of the items above were found by a verifier
refusing a dispatch that could not have produced a valid result — which is the separation earning
its cost.
