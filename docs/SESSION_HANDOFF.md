# SESSION HANDOFF — read this first

> Lean entry point so ANY session (Cowork / Dispatch / Claude Code) resumes with zero re-setup.
> Updated at the end of each slice (via `/close`). Keep ≤ ~20 lines — do NOT turn this back into an
> append-only changelog (full history lives in git log + CURRICULUM_STATUS "Done log").

## Current state (2026-06-28)
Bài 7-5b — judge calibration. Judge is now **reliable** (Claude tool-use structured output; measurement
errors are first-class `error`, excluded from metrics — `error=0`). Clean overall judge–human match is
**30%**, but the root cause is an **eval-design question**, not a judge/rubric bug.

## Active task → next step
**Decide the evaluation question:** does the judge measure **per-action** ("did the skill do the
requested `ptrAiAction` well?", what the current rubric scores) OR **whole-process** quality (the blanket
"needs more breakdown / gateways" lens the human labels used)? → then re-label the calibration set with
that question, or accept the judge. **Baseline NOT yet locked.**

## Open decisions
- Per-action vs whole-process evaluation question (blocks closing 7-5b).

## How to resume
Read this + `docs/curriculum/CURRICULUM_STATUS.md`, then continue the active task. Rules of the road:
work-division (Cowork = docs/plans/review; Claude Code = code via dev subagent + human approval),
`docs/OPERATING_DISCIPLINE.md`, `docs/decisions/ADR-context-continuity-and-automation-boundary.md`.
