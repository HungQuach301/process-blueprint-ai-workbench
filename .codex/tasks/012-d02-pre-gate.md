# Task ID: 012-d02-pre-gate

## Task name

Add D02 Service Blueprint pre-generation gate

## Estimated effort

Medium / 2-4 hours

## Dependencies

- 005-gateverdict-framework

## Goal

Add a pre-generation gate for D02 Service Blueprint inputs without modifying the D02 generator core.

## Definition of Done

- [ ] D02 pre-generation gate helper exists.
- [ ] Gate validates `ProcessTask[]` readiness for service blueprint generation.
- [ ] Gate validates selected service blueprint `TemplateProfile` readiness.
- [ ] Gate returns `GateVerdict`.
- [ ] D02 generator core is unchanged.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- docs/CODE_AUDIT_REPORT.md
- src/lib/generators/drawio-service-blueprint-generator.ts
- src/components/service-blueprint-output/D02ServiceBlueprintOutput.tsx
- src/lib/models/process-task.ts
- src/lib/models/template-profile.ts
- src/lib/quality-engine/gate-verdict.ts

## Files expected to change

- src/lib/quality-engine/d02-pre-generation-gate.ts
- src/lib/quality-engine/index.ts
- Optional: src/components/service-blueprint-output/D02ServiceBlueprintOutput.tsx
- docs/SESSION_HANDOFF.md

## Implementation instructions

1. Create a pure D02 pre-generation gate.
2. Check required blueprint fields: actor, task name, phase, system/app where useful.
3. Check template type/output type and row rules.
4. Return blockers/warnings as `GateVerdict`.
5. Do not edit `src/lib/generators/drawio-service-blueprint-generator.ts`.

## Edge cases to handle

- Empty task list.
- Missing phase/actor/system.
- Non-service-blueprint template selected.
- Too many cards in a row/phase.

## Constraints

- Do not modify D02 generator core.
- Do not change draw.io XML generation behavior.
- Do not add dependencies.
- Do not auto-fix process tasks.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Run D02 generation with sample data.
2. Confirm pre-gate reports missing actor/system cases.
3. Confirm generator output remains unchanged for valid input.

## Rollback

If the task fails before commit:

git status --short
git restore src/lib/quality-engine/d02-pre-generation-gate.ts src/lib/quality-engine/index.ts src/components/service-blueprint-output/D02ServiceBlueprintOutput.tsx

## Docs to update

- docs/SESSION_HANDOFF.md

## Suggested commit message

Add D02 pre-generation gate
