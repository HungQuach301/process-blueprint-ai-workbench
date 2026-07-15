# SESSION HANDOFF — read this first

> Lean entry point so ANY session (Cowork / Dispatch / Claude Code) resumes with zero re-setup.
> Updated at the end of each slice (via `/close`). Keep ≤ ~20 lines — do NOT turn this back into an
> append-only changelog (full history lives in git log + CURRICULUM_STATUS "Done log").

## Current state (2026-07-14)
**Bài 9 catalog slice — DONE (merged, master @ 08c0c51).** `src/lib/ai/provider-model-catalog.ts`:
filled cost / cached / prompt-caching / `verifiedDate` / `deprecationStatus` on the 4 `openai-byok`
entries (`gpt-5.5` current, `gpt-5.4*` previous-generation) and added GPT-5.6 `sol`/`terra`/`luna` +
`claude-fable-5` (verified 2026-07-11). The §5 OpenAI-cost prereq that blocked slice 2 is now CLEARED.
Plan doc: `docs/PROVIDER_ROUTING_COST_OPTIMIZATION_PLAN.md`. (Bài 7-5b baseline still LOCKED.)

## Active task → next step
**Bài 9 slice 2** — run executor/advisor **both directions** on the 3 baseline skills
(`input-brief-to-ptr`, `process-improvement-recommendation`, `artifact-review`) vs the locked Bài 7
baseline; record the comparison. Now UNBLOCKED (OpenAI cost populated). Write the brief in
`docs/NEXT_BRIEF.md` when starting.

## Open decisions
- GPT-5.6 `contextWindow`/`maxOutputTokens` deferred (need per-variant provider docs); OpenAI default
  (`gpt-5.4-mini`) now `previous-generation` while `current` GPT-5.6 exists — bumping default = human call.
- `claude-opus-4-7`: `status:"preview"` vs `deprecationStatus:"previous-generation"` still inconsistent.

## How to resume
Read this + `docs/curriculum/CURRICULUM_STATUS.md`, then continue the active task. Rules of the road:
work-division (Cowork = docs/plans/review; Claude Code = code via dev subagent + human approval),
`docs/OPERATING_DISCIPLINE.md`, `docs/decisions/ADR-context-continuity-and-automation-boundary.md`.
