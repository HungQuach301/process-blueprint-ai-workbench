# FEEDBACK_RECORD_SCHEMA.md — turning user reports into code changes and guards

> **Deliverable of Bài 0E.** Authoritative spec: `docs/curriculum/CURRICULUM_V7_3.md` §Bài 0E.
> This defines the **structured intake record** and the **two feedback loops** that
> feed user feedback/bugs back into development.

## Purpose

A user report should never be free text that gets fixed once and forgotten. It becomes
a **structured, git-tracked record**, flows through a human-approved loop, and — when
confirmed — becomes a **permanent regression guard**.

This is the *dev-process* feedback loop. It is distinct from Bài 16 (the product's own
runtime AI learning from feedback).

## The record schema

Every report is captured as one record with these fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | stable unique id, e.g. `FB-2026-014` |
| `type` | enum | yes | `bug` \| `feedback` \| `feature` |
| `severity` | enum | yes | `critical` \| `high` \| `medium` \| `low` |
| `title` | string | yes | one-line summary |
| `repro` | string | bug → yes | steps to reproduce; expected vs actual |
| `affected` | string | yes | the affected **skill** or **artifact** (e.g. `skill:draft-ptr`, `artifact:D02-blueprint`) |
| `status` | enum | yes | `new` \| `triaged` \| `in-progress` \| `verifying` \| `released` \| `wont-fix` |
| `disposition` | enum | triage → yes | `fix-now` \| `backlog` \| `convert-to-eval-case` \| `ccr` |
| `reporter` | string | no | who reported (user id / channel) |
| `createdAt` | ISO 8601 | yes | capture timestamp |
| `updatedAt` | ISO 8601 | yes | last change |
| `links` | string[] | no | branch / PR / eval case / CCR / red-team case ids |
| `notes` | string | no | triage reasoning, dedupe pointers |

### Example record (JSON)

```json
{
  "id": "FB-2026-014",
  "type": "bug",
  "severity": "high",
  "title": "Draft PTR drops the last task row for >20-row inputs",
  "repro": "Upload a 23-row process register → generate Draft PTR → row 23 missing. Expected 23 rows, got 22.",
  "affected": "skill:draft-ptr",
  "status": "triaged",
  "disposition": "convert-to-eval-case",
  "reporter": "pilot-user-03",
  "createdAt": "2026-06-14T09:12:00Z",
  "updatedAt": "2026-06-14T10:40:00Z",
  "links": ["branch:fix/draft-ptr-row-cap", "eval:input-brief-to-ptr#case-118"],
  "notes": "Reproduced. Off-by-one in row cap. Becomes golden dataset v2 case."
}
```

Records are **git-tracked** — either as issues in the tracker, or as a log (e.g.
`docs/feedback/FB-*.json` or a single `FEEDBACK_LOG.md`). The store is a project
decision; the schema is fixed.

## Fast loop (days): user report → fix → release

```text
1. Capture  — report becomes a STRUCTURED record (fields above). Not free text.
2. Triage   — feedback-triager subagent: dedupe, classify, link to the affected
              skill/artifact, PROPOSE a disposition → human approves (HITL).
3. Fix      — dev / debug subagent on a feature branch (smallest diff).
4. Verify   — reviewer + eval-runner run regression; human approves the diff.
5. Release  — version bump + eval + changelog + rollback path (Bài 20).
```

The `feedback-triager` proposes; it never acts. The human approves the disposition and
every diff.

## Feedback → evidence rule (the high-value link)

A report is not fixed once and forgotten — it becomes a permanent guard:

- A **confirmed bug** → a **golden dataset case** (Bài 7 v2 = + failed production cases).
- A **security report** → a **red-team case** (Bài 7 / 17B v3).
- A **structural pattern** across several reports → a **CCR** (see slow loop).

Set the record's `disposition` to `convert-to-eval-case` and link the resulting case id
in `links`. Target: `escapedRegressions → 0` for any case once guarded.

## Slow loop (weeks): pattern → CCR → upgrade

If several reports reveal a structural gap, it does **not** become another patch. It
becomes a **CCR** (`docs/curriculum/CCR_LOG.md`, §3.7) and the curriculum/architecture
changes. This is the "later upgrade" path — the way the product matures rather than
accumulates patches.

## Metrics

`triageTurnaround` (capture → triaged) · `bugsConvertedToEvalCases` (Bài 7 v2/v3 growth)
· `escapedRegressions` (target → 0 for guarded cases).

## Done (definition)

A user report reliably becomes either a guarded eval case (fast loop) or a CCR (slow
loop) — so feedback provably improves the product over time. See
`docs/DEV_AGENT_LAYER.md` for the agents and hooks that execute this loop.
