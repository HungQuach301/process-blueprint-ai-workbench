# Task ID: UX-create-user-facing-readiness-tasks

## Task name

Create User-Facing Readiness Sprint task files

## Estimated effort

Small / 30-60 minutes

## Dependencies

- 017-user-gate-1-preparation

## Goal

Create detailed Codex task files for Milestone 1.5 User-Facing Readiness Sprint based on the comprehensive product review and latest expert feedback.

## Definition of Done

- [ ] UX-000-milestone-1-technical-status-check.md exists.
- [ ] UX-008-product-delivery-module-separation.md exists.
- [ ] UX-009-export-center-simplification.md exists.
- [ ] UX-010-mixed-language-and-mock-label-cleanup.md exists.
- [ ] UX-001-ai-connection-user-friendly-status.md exists.
- [ ] UX-004-ptr-simple-mode-business-columns.md exists.
- [ ] UX-004b-technical-term-tooltips.md exists.
- [ ] UX-002-dashboard-getting-started.md exists.
- [ ] UX-003-input-brief-validation-behavior.md exists.
- [ ] UX-005-qa-panel-user-facing-cleanup.md exists.
- [ ] UX-006-bpmn-preview-readability.md exists.
- [ ] UX-007-blueprint-preview-scroll-affordance.md exists.
- [ ] UX-011a-ai-error-loading-retry-feedback.md exists.
- [ ] UX-011b-save-unsaved-changes-feedback.md exists.
- [ ] UX-011c-workspace-backup-restore.md exists.
- [ ] UX-012-user-facing-regression-check.md exists.
- [ ] .codex/TASK_QUEUE.md includes these tasks in the correct order.
- [ ] npx.cmd tsc --noEmit passes.

## Files to inspect first

- docs/SESSION_HANDOFF.md
- docs/CODE_AUDIT_REPORT.md
- docs/USER_GATE_1_GUIDE.md
- src/components/
- src/app/

## Files expected to change

- .codex/tasks/*
- .codex/TASK_QUEUE.md
- docs/SESSION_HANDOFF.md

## Allowed changed files

- .codex/tasks/*
- .codex/TASK_QUEUE.md
- docs/SESSION_HANDOFF.md

## Implementation instructions

Create detailed task files for the User-Facing Readiness Sprint in this exact order:

1. UX-000-milestone-1-technical-status-check
2. UX-008-product-delivery-module-separation
3. UX-009-export-center-simplification
4. UX-010-mixed-language-and-mock-label-cleanup
5. UX-001-ai-connection-user-friendly-status
6. UX-004-ptr-simple-mode-business-columns
7. UX-004b-technical-term-tooltips
8. UX-002-dashboard-getting-started
9. UX-003-input-brief-validation-behavior
10. UX-005-qa-panel-user-facing-cleanup
11. UX-006-bpmn-preview-readability
12. UX-007-blueprint-preview-scroll-affordance
13. UX-011a-ai-error-loading-retry-feedback
14. UX-011b-save-unsaved-changes-feedback
15. UX-011c-workspace-backup-restore
16. UX-012-user-facing-regression-check

Each task file must include:
- Task ID
- Task name
- Estimated effort
- Dependencies
- Goal
- Definition of Done
- Files to inspect first
- Files expected to change
- Allowed changed files
- Implementation instructions
- Edge cases to handle
- Constraints
- Commands to run
- Manual test
- Rollback
- Suggested commit message

Task-specific requirements:

UX-000:
- Create docs/MILESTONE_1_TECHNICAL_STATUS.md.
- Confirm tasks 000-017 are done, partial, or pending.
- Confirm dependencies for UX tasks.

UX-008:
- Separate Product Delivery generation from Export Center.
- Preferred: dedicated Product Delivery module/section.
- Fallback: visual separation into clear sections if route/component refactor is too large.
- Do not change generation behavior.
- Do not auto-export.

UX-009:
- Depends on UX-008.
- Export Center should focus on readiness, preview/download, ZIP, audit/export evidence.
- Remove or hide generation actions from Export Center.

UX-010:
- Replace user-facing Mock labels with Local analysis or Phân tích cục bộ.
- Replace Missing env with Chưa cấu hình or Not configured.
- Hide feature flags from main UI.
- Grep source for encoding artifacts: Ä, Ã, Â, �, â€, â€™.
- Fix obvious mixed language and encoding issues in main screens.

UX-001:
- Make AI Connection status business-friendly.
- Move env/model/feature-flag details to Advanced.
- Keep API key trust message.
- Do not expose secrets.

UX-004:
- Simple Mode shows only business columns.
- Advanced Mode keeps technical fields.

UX-004b:
- Add Vietnamese tooltips/help text for Exclusive Gateway, Data Interaction, Send Task, Service Task, User Task, rowType, bpmnType where visible.
- No broad i18n refactor.

UX-002:
- Add dashboard Getting Started / Bắt đầu từ đây section.
- Four steps: Input Brief, Draft PTR, Quality Check, Export.

UX-003:
- Validation errors should appear only after first Generate attempt.
- Progress is shown before validation attempt.

UX-005:
- Findings and Recommendations visually distinct.
- Findings read-only.
- Recommendations keep preview/confirmation/apply.
- Remove repeated empty recommendation noise.

UX-006:
- Improve BPMN preview readability.
- Add expand/full-screen/zoom-to-fit if feasible.
- Show template name.
- Do not change generator core.

UX-007:
- Improve Blueprint horizontal scroll affordance.
- Improve status/gate visibility.
- Do not change generator core.

UX-011a:
- Add loading spinner/text for AI actions.
- Add retry button for AI failures where feasible.
- Replace technical errors with user-friendly messages.
- No stack traces/secrets in UI.

UX-011b:
- Add success feedback for Save/Generate/Apply where missing.
- Add unsaved changes warning or discard/restore last saved if feasible.
- Do not build full undo/redo engine.

UX-011c:
- Add Local workspace label.
- Export workspace JSON.
- Import workspace JSON.
- User-friendly success/error feedback.
- No server/database required.

UX-012:
- Create docs/USER_FACING_READINESS_CHECK.md.
- Verify all UX readiness tasks.
- Run one full flow with real AI provider OpenAI if configured:
  Input Brief -> Draft PTR -> Normalizer -> Gate Verdict -> QA -> D01 -> D02 -> Export ZIP.
- If real AI is not configured, document skip reason.
- No new features unless fixing a tiny blocker.

## Edge cases to handle

- If a component path differs from audit docs, use real source paths.
- If a task would require broad refactor, scope it down and document follow-up.
- If a task would modify generator core, stop and ask.
- If a task requires dependency, stop and ask.

## Constraints

- Do not implement application changes in this meta-task.
- Only create Codex task files, update task queue, and update SESSION_HANDOFF.
- Do not add dependencies.
- Do not change AI behavior.

## Commands to run

npx.cmd tsc --noEmit

## Manual test

1. Confirm all UX task files exist.
2. Confirm .codex/TASK_QUEUE.md contains UX tasks in the required order.
3. Confirm each task has Allowed changed files section.

## Suggested commit message

Add User-Facing Readiness Sprint task definitions
