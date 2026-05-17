# Task ID: UX-008-product-delivery-module-separation

## Task name

Separate Product Delivery from Export Center

## Estimated effort

Medium / 2-4 hours

## Dependencies

- UX-000-milestone-1-technical-status-check

## Goal

Make Product Delivery generation feel like a dedicated user workflow instead of being buried inside Export Center.

## Definition of Done

- [ ] Product Delivery generation is separated from Export Center as a dedicated module/section where feasible.
- [ ] Fallback visual separation is used if a route/component refactor is too large.
- [ ] Product Delivery preview/export behavior remains unchanged.
- [ ] Export Center still works after the separation.
- [ ] No generation behavior is changed.
- [ ] No product delivery artifact is auto-exported or auto-applied.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- `src/components/export-center/ExportCenter.tsx`
- `src/components/Navigation.tsx`
- `src/components/AppShell.tsx`
- `src/components/layout/SessionFrame.tsx`
- `src/lib/generators/product-delivery-generator.ts`
- `src/lib/models/product-delivery.ts`
- `docs/CODE_AUDIT_REPORT.md`
- `docs/USER_GATE_1_GUIDE.md`

## Files expected to change

- `src/components/export-center/ExportCenter.tsx`
- Optional: `src/components/product-delivery/ProductDeliveryPanel.tsx`
- Optional: `src/components/Navigation.tsx`
- Optional: `src/components/AppShell.tsx`
- `docs/SESSION_HANDOFF.md`

## Allowed changed files

- `src/components/export-center/ExportCenter.tsx`
- `src/components/product-delivery/ProductDeliveryPanel.tsx`
- `src/components/Navigation.tsx`
- `src/components/AppShell.tsx`
- `docs/SESSION_HANDOFF.md`

## Implementation instructions

1. Inspect Product Delivery state and actions currently inside `ExportCenter.tsx`.
2. Prefer extracting Product Delivery UI into `src/components/product-delivery/ProductDeliveryPanel.tsx`.
3. Wire the new panel through the existing app navigation only if it can be done narrowly.
4. If extraction is too broad, keep code in `ExportCenter.tsx` but add clear visual separation and headings so users understand Product Delivery is a separate workflow.
5. Preserve all existing preview-before-export behavior.
6. Do not change generator functions, schemas, provider route behavior, or artifact content.
7. Update `docs/SESSION_HANDOFF.md`.

## Edge cases to handle

- Product Delivery state may be tightly coupled to ZIP export.
- Navigation changes may affect section selection.
- Generated preview state must not be lost unexpectedly while moving between sections.
- Broad refactor risk should be avoided; document follow-up if extraction is deferred.

## Constraints

- Do not change generation behavior.
- Do not auto-export.
- Do not add dependencies.
- Do not modify D01/D02 generator core.
- Do not change AI auto-apply behavior.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Open the app at `http://localhost:3000`.
2. Confirm Product Delivery is visibly separate from Export Center.
3. Generate or preview Product Delivery artifacts.
4. Confirm exports still require explicit user action.
5. Confirm Export Center still generates/downloads process artifacts and ZIP.

## Rollback

If the task fails before commit:

```powershell
git status --short
git restore src/components/export-center/ExportCenter.tsx src/components/Navigation.tsx src/components/AppShell.tsx docs/SESSION_HANDOFF.md
if (Test-Path src/components/product-delivery/ProductDeliveryPanel.tsx) { Remove-Item -LiteralPath src/components/product-delivery/ProductDeliveryPanel.tsx }
```

## Suggested commit message

Separate Product Delivery workflow from Export Center
