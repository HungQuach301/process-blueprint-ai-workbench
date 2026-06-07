# Task ID: 013d-wire-post-gates-ui

## Task name

Wire D01/D02 post-generation gates into UI

## Estimated effort

Medium / 2-4 hours

## Dependencies

- 013b-d01-post-gen-gate
- 013c-d02-post-gen-gate

## Goal

Show D01/D02 post-generation gate verdicts in output UI and disable download when generated artifact verdict fails.

## Definition of Done

- [ ] D01 output UI shows post-generation verdict.
- [ ] D02 output UI shows post-generation verdict.
- [ ] Download is disabled when verdict fails.
- [ ] Warnings are visible without overwhelming primary preview.
- [ ] Generator core remains unchanged.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- src/components/bpmn-output/D01BpmnOutput.tsx
- src/components/service-blueprint-output/D02ServiceBlueprintOutput.tsx
- src/lib/quality-engine/d01-post-generation-gate.ts
- src/lib/quality-engine/d02-post-generation-gate.ts
- src/lib/quality-engine/gate-verdict.ts

## Files expected to change

- src/components/bpmn-output/D01BpmnOutput.tsx
- src/components/service-blueprint-output/D02ServiceBlueprintOutput.tsx
- docs/SESSION_HANDOFF.md

## Implementation instructions

1. Run post-generation gate immediately after XML generation in each UI component.
2. Store verdict alongside generated XML.
3. Show compact pass/warn/fail status.
4. Disable `.bpmn` or `.drawio` download when verdict status is fail.
5. Keep preview rendering behavior unchanged.

## Edge cases to handle

- No generated XML yet.
- Gate warning only.
- Gate fail after XML generated.
- Existing AI artifact review result present.

## Constraints

- Disable download only on fail verdict.
- Do not modify generator core.
- Do not mutate generated XML.
- Do not add dependencies.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Generate D01 BPMN and confirm verdict.
2. Generate D02 Service Blueprint and confirm verdict.
3. Confirm failed verdict disables download.
4. Confirm valid preview still renders.

## Rollback

If the task fails before commit:

git status --short
git restore src/components/bpmn-output/D01BpmnOutput.tsx src/components/service-blueprint-output/D02ServiceBlueprintOutput.tsx

## Docs to update

- docs/SESSION_HANDOFF.md

## Suggested commit message

Wire artifact post-generation gates into UI
