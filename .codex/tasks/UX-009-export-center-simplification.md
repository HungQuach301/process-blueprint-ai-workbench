# Task ID: UX-009-export-center-simplification

## Task name

Simplify Export Center around readiness and downloads

## Estimated effort

Medium / 2-3 hours

## Dependencies

- UX-008-product-delivery-module-separation

## Goal

Make Export Center focus on artifact readiness, preview/download actions, ZIP packaging, and audit/export evidence instead of primary generation workflows.

## Definition of Done

- [ ] Export Center emphasizes artifact statuses and download readiness.
- [ ] Generation actions are removed, hidden, or visually demoted after Product Delivery separation.
- [ ] ZIP package flow remains available and explicit.
- [ ] Audit/export evidence remains visible or available.
- [ ] No artifact generation behavior is changed.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- `src/components/export-center/ExportCenter.tsx`
- `src/components/product-delivery/ProductDeliveryPanel.tsx`
- `src/components/Navigation.tsx`
- `docs/USER_GATE_1_GUIDE.md`

## Files expected to change

- `src/components/export-center/ExportCenter.tsx`
- Optional: `src/components/product-delivery/ProductDeliveryPanel.tsx`
- `docs/SESSION_HANDOFF.md`

## Allowed changed files

- `src/components/export-center/ExportCenter.tsx`
- `src/components/product-delivery/ProductDeliveryPanel.tsx`
- `docs/SESSION_HANDOFF.md`

## Implementation instructions

1. Review current Export Center actions and identify generation actions that now belong in Product Delivery or source modules.
2. Keep Export Center oriented around Fresh/Stale/Not generated status, preview/download, ZIP, and audit evidence.
3. Remove or hide duplicated generation buttons where doing so does not break existing workflows.
4. Keep download buttons explicit and user-triggered.
5. Preserve existing localStorage artifact status behavior.
6. Update `docs/SESSION_HANDOFF.md`.

## Edge cases to handle

- Some generation action may be required before ZIP can include fresh artifacts.
- If removing an action would break a flow, demote it or document a follow-up instead.
- Existing artifact status events should continue to work.

## Constraints

- Depends on UX-008.
- Do not change generator core.
- Do not auto-generate or auto-export.
- Do not add dependencies.
- Do not change AI behavior.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Open Export Center.
2. Confirm readiness/status is the primary focus.
3. Confirm ZIP download still works.
4. Confirm stale/fresh statuses still make sense after source changes.
5. Confirm Product Delivery generation is not duplicated as a primary Export Center action.

## Rollback

If the task fails before commit:

```powershell
git status --short
git restore src/components/export-center/ExportCenter.tsx src/components/product-delivery/ProductDeliveryPanel.tsx docs/SESSION_HANDOFF.md
```

## Suggested commit message

Simplify Export Center readiness flow
