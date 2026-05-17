# Task ID: 014-chain-resilience-types

## Task name

Add chain resilience types

## Estimated effort

Small / 1-2 hours

## Dependencies

- 005-gateverdict-framework

## Goal

Add foundational `ChainStepResult` and `ChainConfig` types for future multi-artifact Product Delivery gate chains without fully wiring them.

## Definition of Done

- [ ] Chain resilience type file exists.
- [ ] `ChainStepResult` exists.
- [ ] `ChainConfig` exists.
- [ ] Types can reference `GateVerdict`.
- [ ] No Product Delivery gate chain is wired.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- src/lib/quality-engine/gate-verdict.ts
- src/lib/models/product-delivery.ts
- src/lib/generators/product-delivery-generator.ts

## Files expected to change

- src/lib/quality-engine/chain-resilience.ts
- src/lib/quality-engine/index.ts
- docs/SESSION_HANDOFF.md

## Implementation instructions

1. Create type-only helper file under `src/lib/quality-engine`.
2. Define `ChainStepResult` for step id, status, output summary, verdict, warnings, and errors.
3. Define `ChainConfig` for step ordering, continue-on-warning, and stop-on-fail behavior.
4. Export types from quality engine index.
5. Do not wire Product Delivery flows yet.

## Edge cases to handle

- Step skipped.
- Step failed.
- Step passed with warnings.
- Missing verdict.

## Constraints

- Types only.
- Do not fully wire Product Delivery Gates.
- Do not change Export Center.
- Do not add dependencies.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Confirm types export from quality engine.
2. Confirm Product Delivery behavior has no diff.

## Rollback

If the task fails before commit:

git status --short
git restore src/lib/quality-engine/chain-resilience.ts src/lib/quality-engine/index.ts

## Docs to update

- docs/SESSION_HANDOFF.md

## Suggested commit message

Add chain resilience types
