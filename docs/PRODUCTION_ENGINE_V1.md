# SequrAI Production Engine — Architecture V1

**Status:** Design only. Not implemented. Builder Edition V1 is product frozen — this document defines the target architecture. No code changes ship from this document alone.

**Companion document:** `docs/MCP_V1_PRODUCTION_ENGINE.md` defines the five questions and the MCP surface. This document defines what sits *behind* that surface — the engine that makes the answers true, consistent, and agent-agnostic.

**Companion document:** `docs/ADR_001_SINGLE_SOURCE_OF_TRUTH.md` is the binding rule this architecture must satisfy. `docs/ADR_001_ARCHITECTURE_CLEANUP_REPORT.md` and `docs/SEVERITY_DOMAINS.md` record the pre-implementation cleanup that removed the violations of that rule found in the codebase prior to this architecture's approval.

---

## 1. Product Philosophy

SequrAI is not an MCP. The MCP is one door into the building. SequrAI is not a Cursor feature, a Claude Code feature, or a security tool. It is:

> **The independent production engine for AI-built software.**

The relationship is asymmetric and non-negotiable:

```
AI agents build software.
SequrAI decides if it is ready for production.
```

Ten different AI agents can write ten different commits to the same repository this week — Cursor on Monday, Claude Code on Tuesday, Bolt on Wednesday, a human on Thursday. SequrAI does not know or care which one wrote which line. It only ever looks at one thing: **the state of the repository right now**, compared to the state it last saw. This single fact — that the engine is anchored to *repository state*, never to *agent identity* — is the entire reason SequrAI can be agent-agnostic. It is not a policy SequrAI follows; it is a property of what the engine reads.

---

## 2. The Golden Rule of Engine Design

**Ratified as permanent, non-negotiable architecture in `docs/ADR_001_SINGLE_SOURCE_OF_TRUTH.md`.**

> **Only one engine computes. Every other engine translates.**

SequrAI has five capabilities, but it must never have five independent scoring systems. The moment two engines calculate a score, a confidence number, or a verdict independently, they will eventually disagree — and the instant they disagree, the entire product's premise (a single, trustworthy, deterministic authority) collapses.

```
                 ┌─────────────────────────────┐
                 │   PRODUCTION VERDICT ENGINE   │
                 │   (the only engine that       │
                 │    computes truth)            │
                 └───────────────┬───────────────┘
                                 │
                                 │ persisted verdict
                                 │ (production_verdicts)
                                 │
        ┌────────────┬──────────┼──────────┬─────────────┐
        ▼            ▼          ▼          ▼             ▼
   SAFE FIX     CONTINUOUS   PRODUCTION  DEPLOYMENT   (dashboard /
   ENGINE       REVIEWS      HISTORY     CONFIDENCE    GitHub status /
   (reads       ENGINE       ENGINE      ENGINE        any future
   blockers,    (diffs two   (reads      (reads        surface)
   projects     verdict      verdict     latest
   using same   snapshots)   timeline)   verdict +
   scoring                                trend)
   function)
```

Every box below the Production Verdict Engine is a **reader**, not a **calculator**. None of them are allowed to invent a number the Verdict Engine didn't already produce or wouldn't produce if asked. This is already the enforced rule for the existing verdict consumers (dashboard, GitHub status, brain builders) — this architecture simply extends the same law to all five capabilities, permanently, as a constraint on any future engine as well.

---

## 3. Engine Responsibilities

### 3.1 Production Verdict Engine

**The only engine that computes.** Everything else in this document exists to serve or read from this one engine.

Responsible for:
- Production score (0–100, deterministic function of findings — no LLM in the scoring path)
- Production blockers (critical/high severity findings that block shipping)
- Production confidence (`high` / `medium` / `low`, derived from evidence coverage, not vibes)
- Status (`ready_to_ship`, `almost_ready`, `needs_improvement`, `not_ready`, `insufficient_data`, `analysis_failed`)
- Deployment recommendation (`SHIP IT` / `DO NOT SHIP`, a direct mapping from status)

Input: scan findings from the static analysis pipeline, applied to the repository's current committed state.
Output: one immutable, versioned `ProductionVerdictV1` record, persisted once per scan, never recalculated in place.

**Non-negotiable constraint:** the Verdict Engine never re-scores retroactively and never produces two different scores for the same commit. A given `(repository, commit_sha)` pair has exactly one verdict, forever.

### 3.2 Production Safe Fix Engine

**Reads, never computes a new score.** Given a blocker from the persisted verdict, it:
- Generates a Safe Fix Prompt (deterministic template, no code execution, no file writes)
- Assigns a Safe Fix Confidence (how mechanical / low-risk the fix is — a property of the *category* of blocker, e.g. "add an auth check" is high-confidence, "redesign session handling" is low-confidence)
- Estimates fix time and scope (files, LOC) from historical category averages, not a guess per instance
- Produces a **Projected Verdict** — this is the critical constraint, formalized in `docs/ADR_001_SINGLE_SOURCE_OF_TRUTH.md`: the Safe Fix Engine contains **no scoring logic of its own, not even a shared or duplicated copy**. It calls the Production Verdict Engine's own projection capability and *retrieves* the projected score as an output, supplying only which blockers are hypothetically resolved — never a severity weight, penalty curve, or scoring formula. If the Safe Fix Engine's projection and the Verdict Engine's next real scan ever disagree by more than the engine's own stated uncertainty, that is a defect, not an acceptable variance.

The Safe Fix Engine never writes code, opens a PR, or modifies a file. It hands the builder a prompt; the builder (and their AI agent of choice) does the work. SequrAI stays out of the implementation entirely — that is the boundary that keeps it "the last thing you ask," not "the thing that did it for you."

### 3.3 Continuous Reviews Engine

**A scheduler and a differ, not a scorer.** Its job is to decide *when* the Verdict Engine should run again, and to describe the *delta* between two verdicts once it has.

Responsible for:
- Detecting changes (via GitHub webhook push events, or an on-demand MCP call)
- Triggering the Verdict Engine to produce a new persisted verdict for the new commit
- Diffing the new verdict against the immediately prior one for the same repository
- Classifying the diff into improvements (blockers resolved, score up) and regressions (blockers introduced, score down)

The Continuous Reviews Engine owns zero scoring logic. It calls the Verdict Engine, waits for a new persisted record, and reports the difference between two already-computed numbers. This is what makes "what changed since my last review" a safe question to answer instantly and consistently — it is arithmetic on two immutable records, not a fresh judgment call.

### 3.4 Production History Engine

**A read-only aggregator over time.** It never touches a single commit's scoring — it only reads the timeline of already-persisted verdicts for a repository.

Responsible for:
- Returning historical verdicts in order
- Computing production trend (`improving` / `declining` / `stable` / `insufficient_data`) via fixed, deterministic rules over the verdict timeline (already specified: minimum two valid verdicts, comparison of recent vs. prior windows, explicit handling of introduced-vs-resolved blockers)
- Describing production maturity as a function of trend stability over time, not a new metric requiring its own model

Null or failed scans are never plotted as zero and never contribute to trend — a scan that couldn't run says nothing about whether the code got better or worse, and the engine must never pretend otherwise.

### 3.5 Deployment Confidence Engine

**The thinnest engine in the system, by design.** It introduces no new data, no new score, and no new model call. It is a fixed mapping:

```
(latest verdict.status, latest verdict.score, history trend)
        │
        ▼
  first-person recommendation + confidence %
```

Its entire value is packaging — turning a status enum and a score into the one sentence a founder actually wants to hear before they click deploy: *"I would ship this today"* or *"I would not."* If this engine ever needs its own scoring rules that could disagree with the Verdict Engine, that is a sign the design has drifted and must be corrected back to a pure function of existing verdict + trend data.

---

## 4. MCP Architecture

The MCP is a **transport**, not an engine, and it is not the only transport. This is the architectural fact that makes agent-agnosticism real rather than aspirational:

```
                    ┌──────────────────────────────┐
                    │   GitHub Webhook (push/PR)     │──┐
                    │   agent-independent — fires     │  │
                    │   no matter which AI wrote it   │  │
                    └──────────────────────────────┘  │
                                                        │
                    ┌──────────────────────────────┐  │
                    │   MCP tool call                 │  │
                    │   Cursor / Claude Code /        │  ├──► Continuous Reviews Engine
                    │   Windsurf / Lovable / Bolt /   │  │         │
                    │   Replit / Copilot / Codex /    │  │         ▼
                    │   v0 / any future MCP client     │──┘   Production Verdict Engine
                    └──────────────────────────────┘             │
                                                                  ▼
                                                     production_verdicts (persisted)
                                                                  │
                          ┌───────────────────┬───────────────────┼───────────────────┐
                          ▼                   ▼                   ▼                   ▼
                    Safe Fix Engine   History Engine   Deployment Confidence   Dashboard / GitHub
                                                              Engine              status check
```

Two independent paths converge on the same persisted verdict. A builder who used Cursor last week and switches to Claude Code this week does not start over — the Production History Engine reads the same `production_verdicts` timeline regardless of which door produced each entry. **The MCP tool call and the GitHub webhook are peers, not alternatives** — either can trigger a new verdict, and both feed the same single source of truth.

This is also why the MCP surface itself must stay exactly as thin as defined in `MCP_V1_PRODUCTION_ENGINE.md`: it has no logic of its own to keep agent-agnostic. It only has to forward a `projectId` (and occasionally a `findingId`) to the correct engine and format the response. Any logic added *inside* the MCP layer specific to how a particular editor calls it would immediately break the "identical experience everywhere" guarantee — so the MCP layer is architecturally forbidden from containing product logic, by construction, not by discipline alone.

---

## 5. User Journey

```
AI Builder uses Agent #1 (e.g. Cursor) to build a feature
        │
        ▼
Ask SequrAI ("can I deploy this?")
        │
        ▼
Production Verdict Engine returns verdict
        │
   ┌────┴────┐
   ▼         ▼
READY     NOT READY
   │         │
   │         ▼
   │    Safe Fix Engine → Safe Fix Prompt
   │         │
   │         ▼
   │    Builder fixes issue (with any agent — same or different)
   │         │
   │         ▼
   │    Push changes
   │         │
   │         ▼
   │    Continuous Reviews Engine detects the push, triggers new verdict
   │         │
   │         ▼
   │    Updated verdict returned
   │         │
   └────┬────┘
        ▼
   Deploy with confidence
```

Nothing in this journey depends on which agent is in the driver's seat at any given step. A builder could, in theory, ask the verdict from Claude Code, get the fix prompt copy-pasted into Cursor, apply the fix with GitHub Copilot's inline suggestions, and push from the terminal — SequrAI would never notice, because none of its five engines take "which agent" as an input.

---

## 6. Daily Habit Loop

```
Build
  ↓
Ask SequrAI          ← the moment of friction we are designing away
  ↓
Production Verdict
  ↓
Safe Fix Prompt (if needed)
  ↓
Fix
  ↓
Push
  ↓
Continuous Review
  ↓
Updated Verdict
  ↓
Deploy
```

The habit is not "use SequrAI." The habit is **"never deploy without this loop completing."** The loop is designed so that skipping it feels like skipping a compiler check — technically possible, but something a careful engineer doesn't do. That feeling is earned only if every step above returns the same answer regardless of which agent, which editor, or which day of the week asked.

---

## 7. Product Principles

1. **One engine computes; four engines translate.** No exceptions, no matter how small the "just this once" score adjustment seems.
2. **The engine is anchored to repository state, never to agent identity.** No engine, present or future, may take "which AI agent" as a scoring input. The moment it does, agent-agnosticism becomes a claim instead of a fact.
3. **Every verdict is immutable once persisted.** History is a ledger, not a cache. Re-running the same commit does not overwrite the past.
4. **Determinism is the entire trust model.** A less impressive but 100%-reproducible verdict beats a more insightful but inconsistent one, in every single case, without exception.
5. **The MCP (and any other transport) is not allowed to contain product logic.** It formats and forwards. If a rule needs to change, it changes in an engine, and every transport inherits it automatically.
6. **SequrAI never acts on the code.** No engine writes files, opens PRs, executes commands, or deploys. The boundary between "decide" and "do" is the boundary between SequrAI and every AI agent it sits alongside — crossing it turns SequrAI into a competitor to its own distribution channel.
7. **No engine is added unless it answers one of the five fixed questions.** A request for a new capability is answered by mapping it onto Verdict / Safe Fix / Continuous Review / History / Deployment Confidence — or rejected.

---

## 8. Data Flow (End to End)

```
1. Code changes land in the repository
   (any agent, any editor, or a human — irrelevant to the engine)

2. Trigger fires
   a. GitHub webhook (push/PR) → Continuous Reviews Engine, or
   b. MCP tool call ("what changed" / "can I deploy this") → Continuous Reviews Engine

3. Continuous Reviews Engine calls the scan pipeline
   → static analysis findings for the current commit

4. Production Verdict Engine consumes findings
   → computes score, blockers, confidence, status, recommendation
   → persists one immutable ProductionVerdictV1 row
      (repository_id, commit_sha, score, status, blockers, generated_at)

5. Continuous Reviews Engine diffs new verdict vs. prior verdict
   → improvements / regressions list

6. Any of the four downstream engines can now read the new verdict:
   - Safe Fix Engine reads blockers → generates prompt + projected verdict
   - Production History Engine appends to the timeline → recomputes trend
   - Deployment Confidence Engine reads (latest verdict, trend) → recommendation
   - Dashboard / GitHub status / MCP all render from the same persisted row

7. Builder receives the answer, through whichever door they knocked on
```

At no point does step 6 or 7 recompute anything from raw findings. They are all reading the single row written in step 4. This is what guarantees that Cursor, Claude Code, and a GitHub commit-status check all say the same thing about the same commit, forever.

---

## 9. Future Scalability (Without Adding Scope Today)

This section is not a roadmap of new features — it is an explanation of why this architecture does not need to change shape as usage grows, because the growth vectors are already absorbed by the "repository state, not agent identity" design:

- **More AI agents.** Each new MCP-compatible agent that appears is automatically supported the day it exists, because it only needs to speak MCP to the five-tool surface (`MCP_V1_PRODUCTION_ENGINE.md`). No engine change, no per-agent code path, ever.
- **More repositories per builder.** The engine already scopes every verdict by `repository_id` — nothing about "ten repositories" is architecturally different from "one repository," it is the same read pattern ten times.
- **More history.** The Production History Engine's trend rules are already defined over an unbounded timeline. A project with three years of verdicts uses the identical rule as a project with three.
- **A future non-MCP transport** (a CLI, a CI/CD step, a raw API call) plugs into the same diagram in Section 4 as a third peer alongside the GitHub webhook and the MCP call — because the architecture never assumed MCP was the only door, only that all doors lead to the same engine.

The explicit warning this section carries: none of the above justifies building anything now. It is evidence that the five-engine, single-source-of-truth design is already the right shape — the correct response to new scale is "the architecture already supports this," not "let's add an engine for this."

---

## 10. Final Recommendation

**Approve this five-engine architecture, built around one computing engine (Production Verdict) and four read-only translators (Safe Fix, Continuous Reviews, History, Deployment Confidence), with the MCP as one of at least two peer transports into it.**

### The test this document must pass

> If AI Builders use ten different AI agents to build their software, can SequrAI still act as the single independent production authority before deployment?

**Yes — by construction, not by policy.** Every engine in this document reads or writes exactly one thing: the state of a repository at a commit. None of the five engines has a code path that asks "which agent wrote this." The GitHub webhook path proves this today for continuous review — it already fires from a push regardless of which tool made the commit, because Git itself is agent-agnostic, and the entire engine is built on top of Git, not on top of any editor's session.

The one discipline this architecture demands going forward: **any future feature request that requires knowing which agent produced the code must be rejected outright**, because the day SequrAI's verdict depends on the identity of the tool that wrote the code, it stops being an independent authority and becomes a partisan of whichever agent it favors. Independence is not a marketing claim in this design — it is encoded as the literal absence of an "agent" field anywhere in the Production Verdict Engine's input.

**Recommendation: freeze this architecture alongside Builder Edition V1. Treat any proposed new engine, field, or capability as rejected by default unless it can be expressed as a pure reader of the existing `ProductionVerdictV1` record — never as a sixth computing path.**
