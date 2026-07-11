# SESSION HANDOFF — read this first

> Lean entry point so ANY session (Cowork / Dispatch / Claude Code) resumes with zero re-setup.
> Updated at the end of each slice (via `/close`). Keep ≤ ~20 lines — do NOT turn this back into an
> append-only changelog (full history lives in git log + CURRICULUM_STATUS "Done log").

## Current state (2026-07-11)
**Bài 9 slice 1 — DONE (merged).** Model capability catalog hardened in
`src/lib/ai/provider-model-catalog.ts` with cost / cached-input cost / prompt-caching support /
`minCacheablePrefixTokens` / `verifiedDate` / `deprecationStatus` fields (catalog rule v7.1).
Claude entries verified 2026-07-11; OpenAI executor-path ids left un-costed on purpose.
Plan doc: `docs/PROVIDER_ROUTING_COST_OPTIMIZATION_PLAN.md`. (Bài 7-5b baseline still LOCKED.)

## Active task → next step
**Bài 9 slice 2** — run executor/advisor **both directions** on the 3 baseline skills
(`input-brief-to-ptr`, `process-improvement-recommendation`, `artifact-review`) vs the locked Bài 7
baseline; record the comparison. Prereq: fill OpenAI executor-model cost from the provider price sheet
(see plan §5). Dispatch the concrete brief in `docs/NEXT_BRIEF.md` when starting.

## Open decisions
- `claude-opus-4-7` catalog: `status:"preview"` vs new `deprecationStatus:"previous-generation"` reads
  slightly inconsistent — left `status` untouched (pre-existing). Revisit if it matters.

## How to resume
Read this + `docs/curriculum/CURRICULUM_STATUS.md`, then continue the active task. Rules of the road:
work-division (Cowork = docs/plans/review; Claude Code = code via dev subagent + human approval),
`docs/OPERATING_DISCIPLINE.md`, `docs/decisions/ADR-context-continuity-and-automation-boundary.md`.
