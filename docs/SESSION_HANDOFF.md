# SESSION HANDOFF — read this first

> Lean entry point so ANY session (Cowork / Dispatch / Claude Code) resumes with zero re-setup.
> Updated at the end of each slice (via `/close`). Keep ≤ ~20 lines — do NOT turn this back into an
> append-only changelog (full history lives in git log + CURRICULUM_STATUS "Done log").

## Current state (2026-06-30)
**Bài 7-5b — DONE.** Judge calibrated for the **per-action** question (tool-use structured output;
measurement errors excluded from metrics) and **baseline LOCKED**. Judge–human within ±1 = 100%,
0 two-level (fail↔pass) disagreements, MAD 0.33. Acceptance gate = "0 two-level + MAD ≤ 0.5".

## Active task → next step
Start **Bài 9** — executor/advisor both directions + prompt caching + cost per attempt
(activates eval-runner against the locked baseline). See CURRICULUM_STATUS for the spine + ad-hoc backlog.
The concrete slice brief (when dispatched) lives in `docs/NEXT_BRIEF.md` — this file only summarizes.

## Open decisions
- None blocking. (Optional: ADR for judge acceptance criteria — rationale currently in `agreement.ts` comment.)

## How to resume
Read this + `docs/curriculum/CURRICULUM_STATUS.md`, then continue the active task. Rules of the road:
work-division (Cowork = docs/plans/review; Claude Code = code via dev subagent + human approval),
`docs/OPERATING_DISCIPLINE.md`, `docs/decisions/ADR-context-continuity-and-automation-boundary.md`.
