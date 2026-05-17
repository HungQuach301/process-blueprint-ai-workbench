# Task ID: UX-011a-ai-error-loading-retry-feedback

## Task name

Add AI loading, error, and retry feedback

## Estimated effort

Medium / 2-4 hours

## Dependencies

- UX-010-mixed-language-and-mock-label-cleanup

## Goal

Make AI actions feel reliable and recoverable by showing loading state, user-friendly errors, and retry affordances where feasible.

## Definition of Done

- [ ] AI actions show loading spinner/text or equivalent progress state.
- [ ] AI failures show user-friendly messages.
- [ ] Retry button is available where feasible.
- [ ] Stack traces, raw provider errors, and secrets are not shown in UI.
- [ ] Existing validation and no-auto-apply behavior remains unchanged.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- `src/components/input-brief/AIInputBriefPanel.tsx`
- `src/components/qa-panel/QAPanel.tsx`
- `src/components/template-library/TemplateLibraryEditor.tsx`
- `src/components/bpmn-output/D01BpmnOutput.tsx`
- `src/components/service-blueprint-output/D02ServiceBlueprintOutput.tsx`
- `src/components/export-center/ExportCenter.tsx`
- `src/app/api/ai/run-skill/route.ts`

## Files expected to change

- `src/components/input-brief/AIInputBriefPanel.tsx`
- `src/components/qa-panel/QAPanel.tsx`
- `src/components/template-library/TemplateLibraryEditor.tsx`
- `src/components/bpmn-output/D01BpmnOutput.tsx`
- `src/components/service-blueprint-output/D02ServiceBlueprintOutput.tsx`
- `src/components/export-center/ExportCenter.tsx`
- `docs/SESSION_HANDOFF.md`

## Allowed changed files

- `src/components/input-brief/AIInputBriefPanel.tsx`
- `src/components/qa-panel/QAPanel.tsx`
- `src/components/template-library/TemplateLibraryEditor.tsx`
- `src/components/bpmn-output/D01BpmnOutput.tsx`
- `src/components/service-blueprint-output/D02ServiceBlueprintOutput.tsx`
- `src/components/export-center/ExportCenter.tsx`
- `docs/SESSION_HANDOFF.md`

## Implementation instructions

1. Identify active AI action buttons and their loading/error states.
2. Add or improve loading text/spinner using existing UI patterns.
3. Convert technical errors into concise user-facing messages.
4. Add retry actions where the previous request payload is locally available and safe to re-run.
5. Do not display stack traces, provider raw output, full prompts, secrets, or sensitive payloads.
6. Preserve schema validation, quality gates, preview, confirmation, and apply behavior.
7. Update `docs/SESSION_HANDOFF.md`.

## Edge cases to handle

- Provider timeout.
- Mock/local fallback.
- Validation failure versus transport failure.
- User changes input after a failure; retry should use current safe state or be disabled.

## Constraints

- Do not change `/api/ai/run-skill` behavior unless a tiny response-display blocker requires it; stop and ask if route changes are needed.
- Do not expose secrets.
- Do not auto-apply AI output.
- Do not add dependencies.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Trigger AI Input Brief generation.
2. Trigger QA/template/artifact review actions where available.
3. Confirm loading state appears.
4. Simulate or observe an error and confirm friendly message/no stack trace.
5. Confirm retry is available where feasible and does not auto-apply.

## Rollback

If the task fails before commit:

```powershell
git status --short
git restore src/components/input-brief/AIInputBriefPanel.tsx src/components/qa-panel/QAPanel.tsx src/components/template-library/TemplateLibraryEditor.tsx src/components/bpmn-output/D01BpmnOutput.tsx src/components/service-blueprint-output/D02ServiceBlueprintOutput.tsx src/components/export-center/ExportCenter.tsx docs/SESSION_HANDOFF.md
```

## Suggested commit message

Improve AI loading error and retry feedback
