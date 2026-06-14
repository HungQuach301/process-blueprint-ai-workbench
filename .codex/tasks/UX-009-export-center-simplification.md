# Task ID: UX-009-export-center-simplification

## Task name

Simplify Export Center

## Estimated effort

Medium / 2-4 hours

## Dependencies

- UX-008-product-delivery-module-separation

## Goal

Simplify Export Center so it focuses on artifact readiness, preview/download, ZIP package, and audit/export evidence. Product Delivery generation actions should not dominate Export Center.

## Definition of Done

- [ ] Export Center no longer feels like a generation workspace.
- [ ] Generation actions are removed, hidden, collapsed, or clearly separated from export actions.
- [ ] Artifact readiness/status remains visible.
- [ ] Preview/download actions remain available.
- [ ] ZIP package download remains available.
- [ ] Optional project context and optional notes are collapsed or visually de-emphasized if they dominate the page.
- [ ] No Product Delivery generation behavior is changed.
- [ ] No auto-export behavior is added.
- [ ] npx.cmd tsc --noEmit passes.
- [ ] npm run build passes.

## Files to inspect first

- src/components/export-center/ExportCenter.tsx
- src/lib/generators/product-delivery-generator.ts
- src/lib/models/product-delivery.ts
- docs/SESSION_HANDOFF.md

## Files expected to change

- src/components/export-center/ExportCenter.tsx
- docs/SESSION_HANDOFF.md

## Allowed changed files

- src/components/export-center/ExportCenter.tsx
- docs/SESSION_HANDOFF.md

## Implementation instructions

1. Review current Export Center actions.
2. Identify generation actions that should now belong to Product Delivery or be visually de-emphasized.
3. Simplify Export Center around:
   - Artifact readiness/status.
   - Preview/download actions.
   - ZIP package / handoff package.
   - Audit/export evidence.
4. If full separation would require broad refactor, use visual separation or collapsed sections instead.
5. Do not move state management unless absolutely necessary.
6. Do not change generation behavior.
7. Do not change export/download behavior.
8. Do not add auto-export.
9. Update docs/SESSION_HANDOFF.md with the UX-009 result.

## Edge cases to handle

- Product Delivery artifacts not generated yet.
- Some artifacts stale or not generated.
- Existing ZIP download should still work.
- Existing preview actions should still work.
- Optional notes/context should remain available, but not dominate the page.

## Constraints

- Do not create a new ProductDeliveryPanel component unless the task scope explicitly requires it.
- Do not modify Product Delivery generator behavior.
- Do not modify AI skill behavior.
- Do not modify D01/D02 generator core.
- Do not add dependencies.
- Stop and report if simplification requires broad refactor.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Open Export Center.
2. Confirm generation actions are not visually overwhelming.
3. Confirm artifact readiness/status is still visible.
4. Confirm preview/download/ZIP actions still work.
5. Confirm no Product Delivery generation behavior changed.

## Rollback

If the task fails before commit:

git status --short
git restore src/components/export-center/ExportCenter.tsx
git restore docs/SESSION_HANDOFF.md

Do not use git reset --hard unless explicitly approved.

## Docs to update

- docs/SESSION_HANDOFF.md

## Suggested commit message

Simplify Export Center
