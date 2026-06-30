# SESSION HANDOFF — read this first

> Lean entry point so ANY session (Cowork / Dispatch / Claude Code) resumes with zero re-setup.
> Updated at the end of each slice (via `/close`). Keep ≤ ~20 lines — do NOT turn this back into an
> append-only changelog (full history lives in git log + CURRICULUM_STATUS "Done log").

## Current state (2026-06-30)
Bài 7-5b — judge calibration. Decision locked: judge measures **per-action** (did the skill do the
requested `ptrAiAction` well?). Labeling app now shows a per-action question banner at the top of each
case (with `ptrAiAction` displayed for PIR) to ensure re-labeling uses the correct lens.

## Active task → next step
**Re-label the calibration set** using the updated labeling app (`evals/calibration/labeling-app.html`,
rebuild with `npx tsx evals/calibration/build-labeling-app.ts`). After re-labeling, lock the baseline
and close Bài 7-5b.

## Open decisions
- None blocking — per-action question is decided.

## How to resume
Read this + `docs/curriculum/CURRICULUM_STATUS.md`, then continue the active task. Rules of the road:
work-division (Cowork = docs/plans/review; Claude Code = code via dev subagent + human approval),
`docs/OPERATING_DISCIPLINE.md`, `docs/decisions/ADR-context-continuity-and-automation-boundary.md`.
