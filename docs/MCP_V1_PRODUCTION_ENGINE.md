# SequrAI MCP V1 — The Production Engine

**Status:** Design only. Not implemented. Builder Edition V1 is product frozen — this document defines the target shape for the *next* MCP surface, to be built only after explicit approval.

**Pre-implementation cleanup (completed):** before this design is implemented, the current (V0) MCP surface was cleaned up to remove ADR-001 violations and confirmed duplicate tool names — `generate_blocker_fix` (duplicate of `explain_production_blocker`) and `review_before_commit` (duplicate of `get_production_readiness`) — and dead, undiscoverable switch cases (`get_today_priorities`, `get_coach_tip`, `get_timeline`, `run_production_check`, `explain_issue`). The V0 surface today registers exactly five tools plus `list_projects` infrastructure, matching the "exactly five questions" constraint below at the interim naming level. The rename/merge to the tool names in §4 below (`production_verdict`, `safe_fix_prompt`, `current_changes`, `production_history`, `deployment_confidence`) is still pending and is real MCP V1 implementation work, not cleanup. See `docs/ADR_001_ARCHITECTURE_CLEANUP_REPORT.md`.

**Owner posture for this document:** Head of Product / Founder, not engineer. Every decision below is justified against one sentence:

> **SequrAI is the last thing you ask before deploying.**

If a tool, field, mode, or word doesn't serve that sentence, it does not belong in V1.

---

## 1. MCP Philosophy

The MCP is not a feature. It is not "the Cursor integration" or "the Claude Code integration." It is the **transport layer** between AI-generated code and a production decision.

```
AI-generated code
        │
        ▼
SequrAI Production Engine   ← the product
        │
        ▼
Production decision
        │
        ▼
Deploy with confidence
```

The MCP protocol is invisible plumbing, the same way HTTP is invisible plumbing for a browser. Cursor, Claude Code, Windsurf, Lovable, Bolt, Replit, and Copilot are all just **doors into the same room**. Whichever door a builder walks through, the room — the verdict, the confidence number, the fix prompt — must be identical, word for word, number for number.

**Rule:** if two different editors ever show a different verdict for the same commit, that is a production incident for SequrAI, not a cosmetic bug.

The MCP has exactly one job: take a `projectId` (and occasionally a `findingId`), and return one of five fixed-shape answers. It has no memory of the conversation, no personality drift, no creativity. It is a deterministic API wearing a conversational interface, because that is what the editors require — not because SequrAI wants to "chat."

---

## 2. Product Philosophy

**SequrAI is not:**
an AI coding assistant, a code reviewer, a security chatbot, an autonomous agent, a software architect, a DevOps tool, an AI CTO, an AI Security Engineer.

**SequrAI is:**
the last checkpoint before `git push` becomes a production incident.

This distinction is not branding — it changes what the MCP is allowed to say. A code reviewer critiques craftsmanship. A security engineer chases every CVE. An assistant tries to be helpful in general. SequrAI does none of that. It answers one narrow, high-stakes question and refuses to wander from it, even when a builder tries to drag it into a broader conversation ("can you also refactor this?", "what do you think of my architecture?"). The correct MCP response to "refactor this for me" is a polite refusal that redirects back to the five questions — not a helpful attempt.

**Mission:** give AI Builders enough confidence to deploy AI-generated software safely. Not to make them better engineers. Not to teach them security. Confidence, in the moment right before they would otherwise deploy blind.

This means SequrAI's success metric is not "did the builder learn something" — it's **"did the builder deploy without a preventable incident, and did they feel sure of that decision in under 15 seconds."**

---

## 3. The Daily Habit Loop

```
Build feature
     │
     ▼
Ask SequrAI            ← MCP call, inside the editor, zero context switch
     │
     ▼
Production Verdict      (Question #1: Can I deploy this?)
     │
     ├─ READY TO SHIP ──────────────► Deploy
     │
     └─ NOT READY
          │
          ▼
     Safe Fix Prompt    (Question #2: How do I safely fix this?)
          │
          ▼
     Builder pastes prompt, fixes issue, pushes
          │
          ▼
     Continuous Review  (Question #3: What changed since my last review?)
          │
          ▼
     Updated Verdict ──────────────► Deploy
```

Two supporting questions run **around** this loop, not inside it:

- **Question #4 — How has my project evolved?** (weekly / retrospective checkpoint, not per-deploy)
- **Question #5 — Would you deploy this if it were your own SaaS?** (the gut-check a builder reaches for when the number alone isn't enough to decide)

The loop above is the only habit SequrAI is trying to build. Everything in the MCP either sits directly on this loop (Q1, Q2, Q3) or supports the builder's confidence in it (Q4, Q5). Nothing else qualifies for V1.

---

## 4. The Five Questions and The Five Tools

MCP V1 answers exactly five questions. No sixth question is in scope, regardless of how reasonable it sounds in a feature request.

| # | Question | Tool | Replaces (current V0 surface) |
|---|----------|------|-------------------------------|
| 1 | **Can I deploy this?** | `production_verdict` | `get_production_readiness` + `review_before_commit` (merged — same question, asked at two different moments) |
| 2 | **How do I safely fix this?** | `safe_fix_prompt` | `explain_production_blocker` + `generate_blocker_fix` (merged — these were always the same tool with two names) |
| 3 | **What changed since my last review?** | `current_changes` | `review_current_changes` (reframed: diff-first, not scan-first) |
| 4 | **How has my project evolved?** | `production_history` | *(new)* — surfaces the existing `production_verdicts` timeline and Production Journey trend that today are dashboard-only |
| 5 | **Would you deploy this if it were your own SaaS?** | `deployment_confidence` | *(new)* — a synthesis tool, not a new data source. Computed from the same verdict + trend data already produced by tools 1 and 4 |

**A note on `list_projects`:** it is not a sixth question. It answers no product question a builder asks about their code — it only resolves *which* project the other five tools should run against. It is plumbing required to make the five tools usable when a builder has more than one connected repository, the MCP equivalent of a dropdown. It ships as infrastructure, never as a "6th capability" in any changelog or marketing surface.

**Why exactly five and not four or six:**
- Fewer than five and the loop breaks — you cannot ship a "fix without a diagnosis" (no Q1) or "a diagnosis without a way to act on it" (no Q2) product.
- More than five and SequrAI drifts into being a general code assistant, which is explicitly the thing it refuses to be. Every additional tool is a temptation to answer a question outside "can I deploy this" — and the moment SequrAI answers a sixth question, builders will start asking it a seventh, and it slowly becomes ChatGPT with a security badge.

---

## 5. The Five SequrAI Modes

Every MCP response declares its mode in the first line. A builder should be able to tell which of the five questions was asked from the shape of the response alone, without reading a single sentence of prose.

### PRODUCTION REVIEW MODE
Triggered by: `production_verdict`
Answers: *Can I deploy this?*

```
SEQURAI
PRODUCTION REVIEW MODE

Production Confidence: 96%
Verdict: READY TO SHIP

Deployment Recommendation:
SHIP IT
```

### SAFE FIX MODE
Triggered by: `safe_fix_prompt`
Answers: *How do I safely fix this?*

```
SEQURAI
SAFE FIX MODE

Safe Fix Confidence: 98%
Estimated Fix Time: 6 minutes
Projected Verdict: READY TO SHIP

Next Action:
Copy Safe Fix Prompt
```

### CONTINUOUS REVIEW MODE
Triggered by: `current_changes`
Answers: *What changed since my last review?*

```
SEQURAI
CONTINUOUS REVIEW MODE

Production Score: 82 → 94

Improvements:
- Authentication improved
- API authorization fixed
```

### PRODUCTION HISTORY MODE
Triggered by: `production_history`
Answers: *How has my project evolved?*

```
SEQURAI
PRODUCTION HISTORY MODE

Production Trend: Improving
Current Production Score: 96

Historical Verdicts:
- READY TO SHIP
- NOT READY TO SHIP
- READY TO SHIP
```

### DEPLOYMENT CONFIDENCE MODE
Triggered by: `deployment_confidence`
Answers: *Would you deploy this if it were your own SaaS?*

```
SEQURAI
DEPLOYMENT CONFIDENCE MODE

If this were my own SaaS...
I WOULD DEPLOY IT TODAY.

Production Confidence: 98%
Deployment Recommendation:
SHIP IT
```

**Mode discipline:** a mode never bleeds into another. `PRODUCTION REVIEW MODE` never lists historical trend. `PRODUCTION HISTORY MODE` never gives a fix prompt. If a builder wants a different answer, they ask a different question — SequrAI does not pre-emptively volunteer information from a mode they didn't invoke. This is what makes each response readable in under 15 seconds: it contains only what was asked for.

---

## 6. Example Responses (Full Fidelity)

These are not mockups to inspire copywriting later — they are the literal contract for what V1 must render, in any MCP-compatible editor.

### NOT READY case (Production Review Mode)

```
SEQURAI
PRODUCTION REVIEW MODE

Production Confidence: 41%
Verdict: NOT READY TO SHIP

Deployment Recommendation:
DO NOT SHIP

Blocking issue:
Authentication is missing on 1 route.

Next step:
Ask "How do I safely fix this?"
```

Note what is absent: no bullet list of 12 minor findings, no dimension breakdown, no "coverage methodology" disclaimer. That level of detail belongs in the dashboard, not in the 15-second MCP answer. The MCP gives a verdict and exactly one next action — it never dumps a report.

### Safe Fix Mode, high risk case

```
SEQURAI
SAFE FIX MODE

Safe Fix Confidence: 61%
Estimated Fix Time: 35 minutes
Projected Verdict: ALMOST READY

Risk Level: MEDIUM — touches session handling

Next Action:
Copy Safe Fix Prompt
```

Low confidence is shown as a number, not hidden. SequrAI never inflates confidence to look impressive — trust is the entire product, and one inflated number destroys it permanently.

### Deployment Confidence Mode, refusal case

```
SEQURAI
DEPLOYMENT CONFIDENCE MODE

If this were my own SaaS...
I WOULD NOT DEPLOY IT TODAY.

Production Confidence: 38%
Deployment Recommendation:
DO NOT SHIP

Reason:
Unresolved authentication blocker.
```

This is the single most important response in the entire product. It is the only moment SequrAI speaks in first person ("I would..."). Everywhere else it is a neutral instrument; here, once per session, it stakes a personal, staff-engineer-grade opinion. That contrast is deliberate — it is why Question #5 exists at all, and it must never be diluted by using this voice anywhere else.

---

## 7. The Cursor Experience

Cursor is the primary editor today and the reference implementation for tone. In Cursor, the five tools appear as agent tool calls with human-readable names. A builder finishing a feature types nothing more than "can I deploy this?" or "ask SequrAI" and the agent resolves it to `production_verdict`.

Nothing about the response format changes because it is Cursor. Cursor's own agent may add a one-line paraphrase around the SequrAI block ("Here's your production verdict:") but it must never rewrite, summarize, or soften the block itself. The `SEQURAI` block is treated as a verbatim quote, the same way a compiler error is never "improved" by the editor showing it.

## 8. The Claude Code Experience

Identical contract, different host. Claude Code renders the same MCP tool outputs in its own tool-result UI. There is no Claude-specific verdict logic, no Claude-specific confidence formula, no Claude-specific mode. The test for V1 launch readiness is literal: **run the same commit through Cursor and Claude Code, and the two `SEQURAI` blocks must be byte-identical except for timestamps.**

If Claude Code's tool-result rendering trims fields differently than Cursor's, that is a Claude Code rendering constraint to design *within*, never a reason to produce different numbers. The five response shapes in Section 6 are the lowest common denominator across every MCP-compatible surface — Windsurf, Lovable, Bolt, Replit, Copilot included — precisely because they contain nothing that any tool-result renderer could mangle: short labels, one number, one verdict word, one recommendation line.

---

## 9. MCP Architecture (Conceptual — No Implementation)

**Governed by `docs/ADR_001_SINGLE_SOURCE_OF_TRUTH.md`:** the MCP layer may only retrieve, compare, aggregate, format, or translate values already produced by the Production Verdict Engine. It contains zero product logic of its own — no scoring, no status derivation, no priority ordering, no client-specific branching by editor. Cursor, Claude Code, and every future MCP client are transports, never decision-makers.

```
Editor (Cursor / Claude Code / Windsurf / Lovable / Bolt / Replit / Copilot)
        │  MCP tool call (Bearer API key)
        ▼
┌─────────────────────────────────────────────┐
│  SequrAI MCP Surface (5 tools + 1 utility)   │
│                                               │
│  production_verdict        → Q1              │
│  safe_fix_prompt           → Q2              │
│  current_changes           → Q3               │
│  production_history        → Q4               │
│  deployment_confidence     → Q5               │
│  list_projects             (utility only)     │
└─────────────────────────────────────────────┘
        │
        ▼
Production Verdict Engine (existing, unchanged)
  production_verdicts table · Production Journey trend
  Safe Fix Prompt engine (brain/fix-prompt/)
        │
        ▼
Deterministic response formatter
  → renders SEQUENCE-mode block, same shape everywhere
```

Two architectural commitments fall directly out of the philosophy:

1. **No tool ever mutates state.** All five tools are reads (`current_changes` may *trigger* a scan, but the scan itself already exists as Continuous Review — the tool never writes code, never opens a PR, never touches a file). This is not a technical constraint, it is the product boundary: SequrAI provides decisions, never actions.
2. **No tool composes a second AI call to "write" the response.** Verdict, confidence, and recommendation are computed by the existing deterministic Production Verdict Engine and Safe Fix Prompt engine. An LLM inside the editor may *read* the SequrAI block and talk about it, but SequrAI itself never delegates its verdict to another model. Determinism is the trust mechanism — the same commit must always produce the same verdict, from any tool, on any day.

`deployment_confidence` deserves a specific note: it introduces no new engine. It is a fixed, deterministic mapping from `(verdict.status, verdict.score, trend)` to a first-person recommendation string and a confidence percentage already present in `ProductionVerdictV1`. It must never call any external model to "decide" what it would do — the appearance of a personal opinion is a UX choice, the substance is 100% the same deterministic score used in Question #1.

---

## 10. UX Principles

Every SequrAI response must:

- **Feel premium.** Short. Declarative. No hedging language ("it seems like", "you might want to consider").
- **Feel deterministic.** The same input always produces the same output, character for character. If a builder asks twice, the answer does not "sound different the second time."
- **Feel trustworthy.** Numbers are never rounded up to look better. Low confidence is stated plainly, not buried.
- **Be understood in under 15 seconds.** If a response requires scrolling to find the verdict, it has already failed.
- **Never feel like a chatbot.** No greetings, no "Great question!", no emoji, no exclamation marks used for enthusiasm rather than urgency.
- **Never feel playful.** SequrAI does not have a personality beyond "the engineer who has seen this fail before."

SequrAI's voice is a **Staff Software Engineer / Senior Production Engineer** reviewing a diff five minutes before an on-call handoff — calm, specific, unimpressed by cleverness, focused only on whether it is safe to ship. It is never Jarvis, never a co-pilot with a name and a wink, never an assistant that says "I". The single exception is `DEPLOYMENT CONFIDENCE MODE`, where speaking in first person is the entire point (Section 6) — and precisely because it is the only exception, it carries weight.

---

## 11. Product Principles

1. **The MCP exists to answer one question: "Should I deploy this application today?"** Every one of the five tools is a different angle on that same question. Nothing else is in scope.
2. **SequrAI never writes code, modifies files, executes commands, deploys, creates commits or pull requests, refactors architecture, or acts autonomously.** It provides decisions. The moment it takes an action, it becomes a coding agent, and coding agents already exist in every editor SequrAI lives inside of — competing with the host is a losing, off-mission move.
3. **Five tools, forever, until proven otherwise by usage data, not by feature requests.** A request for a sixth tool is answered by asking which of the five existing questions it actually is.
4. **No enterprise, no compliance, no multi-agent orchestration in V1.** These are expansions of scope that dilute "the last thing you ask before deploying" into "a platform." They may exist in V2+, but only after the five-tool loop has proven the habit at the individual-builder level.
5. **Determinism over intelligence.** A slightly less sophisticated but 100% reproducible verdict beats a smarter but inconsistent one, because the entire value proposition is confidence, and confidence cannot survive inconsistency.
6. **The dashboard can be rich. The MCP cannot.** Anything requiring more than 15 seconds to parse belongs in the web experience, never in the MCP response body.

---

## 12. Final Recommendation

**Ship MCP V1 with exactly five tools, mapped one-to-one to the five questions, and nothing else.**

Concretely, this means:

- Collapse `get_production_readiness` + `review_before_commit` → `production_verdict`.
- Collapse `explain_production_blocker` + `generate_blocker_fix` → `safe_fix_prompt` (they were already duplicates; V0 shipped two names for one tool).
- Reframe `review_current_changes` → `current_changes`, answering "what changed" rather than "run a scan" — same underlying Continuous Review engine, different question framing.
- Add `production_history`, surfacing existing `production_verdicts` + Production Journey trend data that today only lives in the dashboard.
- Add `deployment_confidence` as a pure synthesis layer over the existing verdict + trend — no new scoring logic, no new engine, no new AI call.
- Keep `list_projects` as unlisted utility plumbing, never marketed as a capability.

This is a **net reduction** from seven tools to five product tools plus one utility — consistent with "keep MCP V1 obsessively simple" — while adding the two missing questions (history, gut-check) that the current surface cannot answer at all today.

### The test this document must pass

> Would an AI Builder feel uncomfortable deploying software without asking SequrAI first?

Today, honestly: **no** — because the current MCP surface answers a fragmented, overlapping set of questions (readiness, blockers, changes, fixes) that require the builder to already know which tool to call and what a "finding" versus a "blocker" versus a "priority" means. That cognitive overhead is the opposite of a habit.

The five-question, five-mode design in this document exists specifically to move that answer to **yes**, by making the interaction so narrow and so consistent that asking becomes cheaper than not asking. If, after implementation, builders still don't feel that discomfort, the fix is never a sixth tool — it is removing whatever remaining friction stands between "finish a feature" and "ask SequrAI," until the answer is yes.

**Recommendation: approve this five-tool design as the MCP V1 target, freeze it the same way Builder Edition V1 is frozen, and treat any future tool proposal as a rejection by default unless it can prove it collapses two of the existing five rather than adding a sixth.**
