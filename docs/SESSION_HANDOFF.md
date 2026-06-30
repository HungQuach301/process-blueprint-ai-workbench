# SESSION HANDOFF — read this first

> Lean entry point so ANY session (Cowork / Dispatch / Claude Code) resumes with zero re-setup.
> Updated at the end of each slice (via `/close`). Keep ≤ ~20 lines — do NOT turn this back into an
> append-only changelog (full history lives in git log + CURRICULUM_STATUS "Done log").

## Current state (2026-06-30)
Bài 7-5b — calibration tooling complete. Labeling app shows per-action question banner. Agreement gate
updated: PASS when **0 two-level disagreements (fail↔pass) + MAD ≤ 0.5** (not exact-3-class ≥ 0.8).
Labels + baselines in working tree are **dirty** (not yet committed) — they reflect in-progress re-labeling.

## Active task → next step
**Re-label the calibration set** using `evals/calibration/labeling-app.html` (rebuild: `npx tsx
evals/calibration/build-labeling-app.ts`), export `labels.json`, run `npx tsx evals/calibration/agreement.ts`
to verify gate passes, then lock the baseline and close Bài 7-5b.

## Open decisions
- None blocking.

## How to resume
Read this + `docs/curriculum/CURRICULUM_STATUS.md`, then continue the active task. Rules of the road:
work-division (Cowork = docs/plans/review; Claude Code = code via dev subagent + human approval),
`docs/OPERATING_DISCIPLINE.md`, `docs/decisions/ADR-context-continuity-and-automation-boundary.md`.
