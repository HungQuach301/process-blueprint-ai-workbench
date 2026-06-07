# Task ID: UX-012-user-facing-regression-check

## Task name

Run User-Facing Readiness regression check

## Estimated effort

Medium / 2-4 hours

## Dependencies

- UX-000-milestone-1-technical-status-check
- UX-001-ai-connection-user-friendly-status
- UX-002-dashboard-getting-started
- UX-003-input-brief-validation-behavior
- UX-004-ptr-simple-mode-business-columns
- UX-004b-technical-term-tooltips
- UX-005-qa-panel-user-facing-cleanup
- UX-006-bpmn-preview-readability
- UX-007-blueprint-preview-scroll-affordance
- UX-008-product-delivery-module-separation
- UX-009-export-center-simplification
- UX-010-mixed-language-and-mock-label-cleanup
- UX-011a-ai-error-loading-retry-feedback
- UX-011b-save-unsaved-changes-feedback
- UX-011c-workspace-backup-restore

## Goal

Create a final readiness check that verifies the User-Facing Readiness Sprint and captures remaining release/user-gate risks.

## Definition of Done

- [ ] `docs/USER_FACING_READINESS_CHECK.md` exists.
- [ ] All UX readiness tasks are checked and summarized.
- [ ] One full flow is run or source-inspected: Input Brief -> Draft PTR -> Normalizer -> Gate Verdict -> QA -> D01 -> D02 -> Export ZIP.
- [ ] If OpenAI real AI provider is configured, a real provider flow is run and documented.
- [ ] If real AI is not configured, skip reason is documented.
- [ ] No new features are added unless fixing a tiny blocker.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- `.codex/TASK_QUEUE.md`
- `.codex/tasks/UX-*.md`
- `docs/SESSION_HANDOFF.md`
- `docs/USER_GATE_1_GUIDE.md`
- `docs/MILESTONE_1_TECHNICAL_STATUS.md`
- `src/app/api/ai/run-skill/route.ts`
- `src/components/`

## Files expected to change

- `docs/USER_FACING_READINESS_CHECK.md`
- `docs/SESSION_HANDOFF.md`

## Allowed changed files

- `docs/USER_FACING_READINESS_CHECK.md`
- `docs/SESSION_HANDOFF.md`

## Implementation instructions

1. Review all UX task outputs and task queue status.
2. Create `docs/USER_FACING_READINESS_CHECK.md`.
3. Document automated checks and manual flow results.
4. Run the full flow with OpenAI real AI if configured and safe to do so.
5. If real AI is not configured, document exact skip reason and verify mock/local flow instead.
6. Capture residual risks and follow-up items.
7. Do not add features except for a tiny blocker fix; if a blocker requires app source changes, stop and ask unless the task scope is updated.
8. Update `docs/SESSION_HANDOFF.md`.

## Edge cases to handle

- Real AI provider not configured.
- External BPMN/draw.io modelers unavailable.
- Browser manual testing limited.
- Some UX tasks may have scoped-down implementation; document follow-up.

## Constraints

- Documentation/check task by default.
- Do not add dependencies.
- Do not change AI behavior.
- Do not change D01/D02 generator core.
- Do not implement new features unless fixing a tiny blocker and explicitly documenting it.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Open `http://localhost:3000`.
2. Run Input Brief -> Draft PTR.
3. Confirm Normalizer/Gate Verdict behavior through UI or source evidence.
4. Run QA.
5. Generate D01 and D02.
6. Generate/download Export ZIP.
7. Document OpenAI real AI result or skip reason.

## Rollback

If the task fails before commit:

```powershell
git status --short
git restore docs/SESSION_HANDOFF.md
Remove-Item -LiteralPath docs/USER_FACING_READINESS_CHECK.md
```

## Suggested commit message

Document user-facing readiness regression check
