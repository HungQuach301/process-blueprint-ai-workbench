# Task ID: UX-004-ptr-simple-mode-business-columns

## Task name

Refine PTR Simple Mode business columns

## Estimated effort

Medium / 2-3 hours

## Dependencies

- UX-010-mixed-language-and-mock-label-cleanup

## Goal

Make Process Task Register Simple Mode easier for business users by showing only the most relevant business columns while keeping technical fields in Advanced Mode.

## Definition of Done

- [ ] Simple Mode shows only business-friendly columns.
- [ ] Advanced Mode keeps technical fields.
- [ ] Existing edit, add, duplicate, delete, save, refresh, reset, import/export behavior remains unchanged.
- [ ] AI Assistant selection behavior remains unchanged.
- [ ] No `ProcessTask` schema changes are introduced.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- `src/components/task-register/ProcessTaskRegister.tsx`
- `src/lib/models/process-task.ts`
- `docs/USER_GATE_1_GUIDE.md`

## Files expected to change

- `src/components/task-register/ProcessTaskRegister.tsx`
- `docs/SESSION_HANDOFF.md`

## Allowed changed files

- `src/components/task-register/ProcessTaskRegister.tsx`
- `docs/SESSION_HANDOFF.md`

## Implementation instructions

1. Review the current Simple/Advanced column definitions.
2. Keep Simple Mode focused on business columns such as step id, task name, phase, actor, system, input, output, next step, review status, risk/control where feasible.
3. Move technical fields such as raw BPMN type, row type, data action, lane ids, and low-level metadata to Advanced Mode where appropriate.
4. Preserve cell editing and validation behavior.
5. Keep table layout stable and usable on common desktop widths.
6. Update `docs/SESSION_HANDOFF.md`.

## Edge cases to handle

- Some technical fields may still be needed for BPMN/D02 debugging; keep them in Advanced.
- Avoid hiding fields that are required for basic process review.
- Existing saved localStorage rows must remain compatible.

## Constraints

- No schema changes.
- No broad refactor.
- Do not change AI recommendation apply behavior.
- Do not change D01/D02 generation behavior.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Open PTR in Simple Mode.
2. Confirm columns are understandable to a BA/PO user.
3. Switch to Advanced Mode and confirm technical fields remain available.
4. Edit a cell, save, refresh, duplicate, delete, and reset.

## Rollback

If the task fails before commit:

```powershell
git status --short
git restore src/components/task-register/ProcessTaskRegister.tsx docs/SESSION_HANDOFF.md
```

## Suggested commit message

Refine PTR simple business columns
