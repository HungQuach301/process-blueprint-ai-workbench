# Task ID: UX-006-bpmn-preview-readability

## Task name

Improve D01 BPMN preview readability

## Estimated effort

Medium / 2-3 hours

## Dependencies

- UX-010-mixed-language-and-mock-label-cleanup

## Goal

Make generated BPMN easier to inspect during user demos without changing the BPMN generator core.

## Definition of Done

- [ ] BPMN preview readability is improved.
- [ ] Expand/full-screen and zoom-to-fit are added if feasible.
- [ ] Selected template name is visible near the preview.
- [ ] Post-generation gate status remains visible.
- [ ] Raw XML remains available but does not dominate the UI.
- [ ] Generator core is unchanged.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- `src/components/bpmn-output/D01BpmnOutput.tsx`
- `src/components/preview/BpmnPreview.tsx`
- `src/lib/generators/bpmn-generator.ts`
- `src/lib/quality-engine/d01-post-generation-gate.ts`
- `docs/USER_GATE_1_GUIDE.md`

## Files expected to change

- `src/components/bpmn-output/D01BpmnOutput.tsx`
- `src/components/preview/BpmnPreview.tsx`
- `docs/SESSION_HANDOFF.md`

## Allowed changed files

- `src/components/bpmn-output/D01BpmnOutput.tsx`
- `src/components/preview/BpmnPreview.tsx`
- `docs/SESSION_HANDOFF.md`

## Implementation instructions

1. Inspect current BPMN preview controls and container sizing.
2. Add or improve fit/zoom/expand controls using existing `bpmn-js` viewer capability where feasible.
3. Show selected D01 template name and status near the preview.
4. Keep raw XML in an Advanced or collapsed area.
5. Preserve download gating and post-generation gate behavior.
6. Do not modify `src/lib/generators/bpmn-generator.ts`.
7. Update `docs/SESSION_HANDOFF.md`.

## Edge cases to handle

- Preview may render before viewer is initialized.
- Generated XML may fail post-generation gate.
- Mobile/narrow viewport should not overlap controls.
- Full-screen/expand should have a safe fallback if not feasible.

## Constraints

- Do not change BPMN XML generation.
- Do not add dependencies.
- Do not change artifact review AI behavior.
- Do not auto-download.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Generate D01 BPMN.
2. Confirm template name is visible.
3. Confirm preview fit/zoom/expand controls work or graceful fallback is present.
4. Confirm download behavior and gate status remain correct.
5. Open XML advanced section if needed.

## Rollback

If the task fails before commit:

```powershell
git status --short
git restore src/components/bpmn-output/D01BpmnOutput.tsx src/components/preview/BpmnPreview.tsx docs/SESSION_HANDOFF.md
```

## Suggested commit message

Improve BPMN preview readability
