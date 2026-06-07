# Task ID: 011-d01-pre-gate

## Task name

Add D01 BPMN pre-generation gate

## Estimated effort

Medium / 2-4 hours

## Dependencies

- 005-gateverdict-framework

## Goal

Add a pre-generation gate for D01 BPMN inputs without modifying the D01 BPMN generator core.

## Definition of Done

- [ ] D01 pre-generation gate helper exists.
- [ ] Gate validates `ProcessTask[]` readiness for BPMN generation.
- [ ] Gate validates selected BPMN `TemplateProfile` readiness.
- [ ] Gate returns `GateVerdict`.
- [ ] D01 generator core is unchanged.
- [ ] UI wiring is minimal or deferred clearly.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- docs/CODE_AUDIT_REPORT.md
- src/lib/generators/bpmn-generator.ts
- src/components/bpmn-output/D01BpmnOutput.tsx
- src/lib/models/process-task.ts
- src/lib/models/template-profile.ts
- src/lib/quality-engine/gate-verdict.ts

## Files expected to change

- src/lib/quality-engine/d01-pre-generation-gate.ts
- src/lib/quality-engine/index.ts
- Optional: src/components/bpmn-output/D01BpmnOutput.tsx
- docs/SESSION_HANDOFF.md

## Implementation instructions

1. Create a pure D01 pre-generation gate.
2. Check required process structure: start/end, valid BPMN types, missing next refs, actor/system visibility.
3. Check selected template type/output type for BPMN fit.
4. Return blockers/warnings as `GateVerdict`.
5. Do not edit `src/lib/generators/bpmn-generator.ts`.

## Edge cases to handle

- Empty task list.
- Missing start or end event.
- Invalid next-step references.
- Non-BPMN template selected.
- Gateway without branches.

## Constraints

- Do not modify D01 generator core.
- Do not change BPMN XML generation behavior.
- Do not add dependencies.
- Do not auto-fix process tasks.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Run D01 generation with sample data.
2. Confirm pre-gate can identify obvious missing input.
3. Confirm generator output remains unchanged for valid input.

## Rollback

If the task fails before commit:

git status --short
git restore src/lib/quality-engine/d01-pre-generation-gate.ts src/lib/quality-engine/index.ts src/components/bpmn-output/D01BpmnOutput.tsx

## Docs to update

- docs/SESSION_HANDOFF.md

## Suggested commit message

Add D01 pre-generation gate
