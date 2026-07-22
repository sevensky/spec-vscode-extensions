---
description: Review an OpenSpec change from five specialized perspectives before implementation.
---

$ARGUMENTS

You are reviewing an OpenSpec **change** (proposal + design + tasks + delta specs) — NOT reviewing implemented code. The goal is to catch problems in the **plan** before implementation begins, saving rework.

**Guardrails**
- Do NOT output chain-of-thought reasoning. Do the analysis internally; output only the structured review.
- Every finding MUST cite evidence: `file_path:line_number` for code claims, or quote the artifact text for plan-internal issues. Unverified assertions are worthless — if you cannot verify a "claimed fact" against code, say so explicitly ("UNVERIFIED — could not locate").
- When you mention file paths, ALWAYS prefix them with `<RepositoryName>/`.
- Do NOT modify any files. This is a read-only review. Output the report in chat only.
- Be specific and terse. No filler. Every sentence must carry information.

**Steps**

1. **Load all change artifacts.** Read `proposal.md`, `design.md` (if present), `tasks.md`, and every delta spec under `openspec/changes/<change-id>/specs/**/spec.md`. You cannot review what you have not read.

2. **Verify claimed facts against code.** Proposals often assert "already verified" facts (e.g., "HandleX deletes TOS but not ba_id", "table Y has columns Z", "reconciler runs every 60s"). For EACH such claim: locate the actual code and confirm or refute it. A proposal built on a false premise must be flagged as CRITICAL. Record what you verified vs. what you could not locate.

3. **Run the five-perspective review** below. For each perspective, answer its specific questions — do NOT substitute one perspective's framing for another (e.g., don't answer PM questions with UX framing). If a perspective has no findings, say "No blocking issues" — do not pad.

4. **Classify every finding** into exactly one tier:
   - **🔴 必修 (Blocking)** — internal contradiction, false premise, missing index/constraint that breaks production, or a requirement the plan cannot satisfy. Must fix before implementation.
   - **🟡 建议 (Strong)** — real risk or missed work that will likely cause rework, but not a hard blocker.
   - **🟢 可选 (Optional)** — nice-to-have, edge case, or future consideration.

5. **Output the report** in the format specified at the end.

---

## Perspective 1: 架构师 (Architect)

**Core question**: Are responsibilities placed correctly, are failure boundaries honest, and is the plan internally consistent?

**Checklist — answer each**:
- **Cross-module coupling**: Does the plan add the fewest possible cross-boundary dependencies? If a new table/endpoint is introduced, is it in the domain that owns its consumers (minimal cross-DB/cross-service calls)?
- **Failure boundary honesty**: Where the plan says "best-effort", is that matched by a real fallback (reconciler, TTL, retry)? Or does it claim MUST-level guarantees that the implementation can't deliver? Flag any strength mismatch (e.g., spec says MUST but design says best-effort).
- **Internal consistency**: Do proposal / design / tasks / spec agree? Flag any v1→v2→v3 convergence residue (e.g., tasks still verify a field that design explicitly removed). This is the most common defect.
- **Single-point coverage**: If logic is added at a "choke point" (one handler, one gateway), verify ALL upstream paths actually flow through it. Trace the call chain in code — do not assume.

## Perspective 2: DB Manager

**Core question**: Does the schema support the query patterns, and will it survive production data volume?

**Checklist — answer each**:
- **Index/query alignment**: For every new query the plan introduces, is there an index that serves it? A query on `WHERE content_hash = X` with no index on `content_hash` is a 🔴. Service-role queries that bypass RLS/project filters CANNOT reuse project-scoped indexes — they need their own.
- **Migration safety**: Does adding a column with a DEFAULT backfill all existing rows correctly? Does any new timestamp column risk TTL misfiring on historical rows? Are NULL semantics defined?
- **Concurrency**: Where the plan accepts redundancy ("no UNIQUE, multiple rows OK"), is the cleanup path (TTL/reconciler) actually safe? E.g., deleting a shared TOS file when one of N referencing rows expires — does it scan cross-row before delete?
- **Encoding/normalization**: If a hash/ID is the dedup key, is its string representation normalized (case, encoding) end-to-end? A hex-uppercase store vs hex-lowercase query = silent miss.

## Perspective 3: UX 体验 (User Experience)

**Core question**: What will the user FEEL at each step — especially the failure and waiting states?

**Checklist — answer each**:
- **Latency injection**: Does any new pre-check (e.g., a dedup query before upload) add wait time to a previously-instant action? For the MISS path (most common), is there a visible micro-state ("检查重复...") or does the UI freeze silently?
- **Error visibility**: When a best-effort operation fails silently (only logged), does the user have any way to notice? Is that acceptable for this feature, or will it generate support tickets?
- **Success feedback**: When the happy path hits (e.g., dedup match → zero upload), does the user KNOW it worked, or does it just silently succeed (leaving them uncertain)?
- **Edge-case feeling**: Empty states, very large files, slow networks, concurrent actions — what does the user experience?

## Perspective 4: 交互优化师 (Interaction Designer)

**Core question**: How many steps does the core task take, and can flows be consolidated or made mistake-proof?

**Checklist — answer each**:
- **Step count**: For the primary user task this change enables, count the steps. Can any be merged? Is there a faster path for power users?
- **Multi-entry consistency**: If the same capability is reachable from multiple UIs (e.g., canvas vs. workspace vs. sidebar), is the interaction consistent across them? Inconsistent flows cause user confusion.
- **Mistake-proofing (poka-yoke)**: Can the user do something irreversible by mistake? Is there a confirm/undo? For destructive actions, is the default safe?
- **Information architecture**: After this change, does the user's mental model still match the UI? E.g., if "delete" now only removes a reference (not the file), does the UI communicate that, or will the user assume the file is gone?

## Perspective 5: 产品经理 (Product Manager)

**Core question**: Is this worth building, and how will we know if it succeeded?

**WARNING — do NOT just restate technical risks in product language.** This perspective must add NEW thinking about value, not parrot the architect. If you can only rephrase architecture findings, say "No incremental product insight — technical perspectives above cover the risks" rather than padding.

**Checklist — answer each, with business context**:
- **Value hypothesis**: What concrete user/business pain does this solve? Is the pain frequency high enough to justify the work? (Estimate: how often does the problem occur per user per week?)
- **ROI measurability**: How will we prove this saved money/time after launch? Is there a metric instrumented (hit/miss count, bytes saved)? If not, the value is unprovable — flag it.
- **Sequencing**: Can 80% of the value ship in 20% of the work (P0 first)? Is there a low-value high-cost slice (P3) that could be deferred without losing the core benefit?
- **Competitive/contextual**: Do users have a workaround today? How painful is it? Does this change meaningfully change their behavior?

---

## Output Format

```
## Review Report: <change-id>

### Summary
| Perspective | Blocking | Strong | Optional |
|---|---|---|---|
| 架构师 | N | N | N |
| DB Manager | N | N | N |
| UX 体验 | N | N | N |
| 交互优化师 | N | N | N |
| 产品经理 | N | N | N |

### Fact Verification
(List each "claimed/verified" fact from the proposal, and your verification result: ✅ confirmed at `path:line` / ❌ refuted / ⚠️ unverified)

### Findings

#### 🔴 必修 (Blocking)
- **[Perspective]** <finding> — Evidence: `<path>:<line>`. Fix: <specific action>.

#### 🟡 建议 (Strong)
- **[Perspective]** <finding> — Evidence: `<path>:<line>`. Recommendation: <action>.

#### 🟢 可选 (Optional)
- **[Perspective]** <finding> — <note>.

### Verdict
<One paragraph: Is this change ready for implementation? What MUST be fixed first?>
```

**Final reminders**:
- Cite evidence for EVERY finding. No evidence = no finding.
- Verify claimed facts in code. This is the highest-value part of the review.
- Do not let one perspective's framing leak into another. Each role thinks differently.
