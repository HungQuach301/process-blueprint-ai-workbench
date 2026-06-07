# Task ID: UX-007-blueprint-preview-scroll-affordance

## Task name

Improve D02 Service Blueprint preview scroll affordance

## Estimated effort

Small / 1-2 hours

## Dependencies

- UX-010-mixed-language-and-mock-label-cleanup

## Goal

Make wide Service Blueprint previews easier to understand and navigate without changing the draw.io generator core.

## Definition of Done

- [ ] Horizontal scroll affordance is clearer.
- [ ] Preview status and gate visibility are improved.
- [ ] Selected template name is visible if available.
- [ ] Users can tell when content continues off-screen.
- [ ] Generator core is unchanged.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- `src/components/service-blueprint-output/D02ServiceBlueprintOutput.tsx`
- `src/components/preview/D02ServiceBlueprintPreview.tsx`
- `src/lib/generators/drawio-service-blueprint-generator.ts`
- `src/lib/quality-engine/d02-post-generation-gate.ts`
- `docs/USER_GATE_1_GUIDE.md`

## Files expected to change

- `src/components/service-blueprint-output/D02ServiceBlueprintOutput.tsx`
- `src/components/preview/D02ServiceBlueprintPreview.tsx`
- `docs/SESSION_HANDOFF.md`

## Allowed changed files

- `src/components/service-blueprint-output/D02ServiceBlueprintOutput.tsx`
- `src/components/preview/D02ServiceBlueprintPreview.tsx`
- `docs/SESSION_HANDOFF.md`

## Implementation instructions

1. Inspect current D02 preview container and scroll behavior.
2. Add clear visual or text affordance that horizontal scrolling is available.
3. Improve gate/status placement so it remains discoverable.
4. Show selected D02 template name if available in the output panel.
5. Keep XML advanced/download behavior unchanged.
6. Do not modify `src/lib/generators/drawio-service-blueprint-generator.ts`.
7. Update `docs/SESSION_HANDOFF.md`.

## Edge cases to handle

- Small diagrams may not need horizontal scrolling.
- Wide diagrams should not create page-level layout overlap.
- Gate failure should remain obvious before download.

## Constraints

- Do not change draw.io XML generation.
- Do not add dependencies.
- Do not auto-download.
- Do not change artifact review AI behavior.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Generate D02 Service Blueprint.
2. Confirm horizontal scroll is discoverable.
3. Confirm template name and status/gate are visible.
4. Confirm `.drawio` download behavior remains correct.

## Rollback

If the task fails before commit:

```powershell
git status --short
git restore src/components/service-blueprint-output/D02ServiceBlueprintOutput.tsx src/components/preview/D02ServiceBlueprintPreview.tsx docs/SESSION_HANDOFF.md
```

## Suggested commit message

Improve Service Blueprint preview affordance
