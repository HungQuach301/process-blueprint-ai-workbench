# Task ID: UX-004b-technical-term-tooltips

## Task name

Add technical term help text and tooltips

## Estimated effort

Small / 1-2 hours

## Dependencies

- UX-004-ptr-simple-mode-business-columns

## Goal

Help Vietnamese and non-technical users understand visible process modeling terms without a broad i18n refactor.

## Definition of Done

- [ ] Visible technical terms have concise Vietnamese tooltip/help text where appropriate.
- [ ] Terms covered include Exclusive Gateway, Data Interaction, Send Task, Service Task, User Task, rowType, and bpmnType where visible.
- [ ] Tooltips do not clutter the primary workflow.
- [ ] No broad i18n refactor is introduced.
- [ ] Canonical enum values remain unchanged.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- `src/components/task-register/ProcessTaskRegister.tsx`
- `src/components/bpmn-output/D01BpmnOutput.tsx`
- `src/components/service-blueprint-output/D02ServiceBlueprintOutput.tsx`
- `src/lib/models/process-task.ts`

## Files expected to change

- `src/components/task-register/ProcessTaskRegister.tsx`
- Optional: `src/components/bpmn-output/D01BpmnOutput.tsx`
- Optional: `src/components/service-blueprint-output/D02ServiceBlueprintOutput.tsx`
- `docs/SESSION_HANDOFF.md`

## Allowed changed files

- `src/components/task-register/ProcessTaskRegister.tsx`
- `src/components/bpmn-output/D01BpmnOutput.tsx`
- `src/components/service-blueprint-output/D02ServiceBlueprintOutput.tsx`
- `docs/SESSION_HANDOFF.md`

## Implementation instructions

1. Identify where the listed technical terms are visible to users.
2. Add concise tooltip/help text near labels, headers, or badges.
3. Prefer existing UI patterns and browser-safe title/help text if no tooltip component exists.
4. Keep explanations short and action-oriented in Vietnamese, with English term retained only where useful.
5. Do not rename canonical enum values or stored data.
6. Update `docs/SESSION_HANDOFF.md`.

## Edge cases to handle

- Some terms may only appear in Advanced Mode.
- Tooltips must not break table layout or overflow badly.
- Avoid adding large explanatory text inside dense panels.

## Constraints

- No broad i18n refactor.
- No schema changes.
- No generation behavior changes.
- No dependency changes.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Open PTR Simple and Advanced modes.
2. Confirm technical terms have useful help text where visible.
3. Confirm table layout still fits and scrolls correctly.
4. Generate D01/D02 to confirm no behavior changes.

## Rollback

If the task fails before commit:

```powershell
git status --short
git restore src/components/task-register/ProcessTaskRegister.tsx src/components/bpmn-output/D01BpmnOutput.tsx src/components/service-blueprint-output/D02ServiceBlueprintOutput.tsx docs/SESSION_HANDOFF.md
```

## Suggested commit message

Add process modeling term help text
