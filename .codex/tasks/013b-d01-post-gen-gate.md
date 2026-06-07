# Task ID: 013b-d01-post-gen-gate

## Task name

Add D01 BPMN post-generation gate

## Estimated effort

Medium / 2-4 hours

## Dependencies

- 013a-xml-parser-strategy

## Goal

Add a D01 BPMN post-generation gate that validates generated BPMN XML without mutating the XML and without modifying the D01 generator core.

## Definition of Done

- [ ] D01 post-generation gate exists.
- [ ] Gate validates XML parseability using approved parser strategy.
- [ ] Gate checks required BPMN structures: definitions, collaboration, participant, process, laneSet.
- [ ] Gate returns `GateVerdict`.
- [ ] Gate does not mutate XML.
- [ ] D01 generator core is unchanged.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- docs/XML_PARSER_STRATEGY.md
- src/lib/generators/bpmn-generator.ts
- src/lib/quality-engine/gate-verdict.ts
- src/components/bpmn-output/D01BpmnOutput.tsx

## Files expected to change

- src/lib/quality-engine/d01-post-generation-gate.ts
- src/lib/quality-engine/index.ts
- docs/SESSION_HANDOFF.md

## Implementation instructions

1. Follow the approved XML parser strategy.
2. Validate generated XML string after generation.
3. Check required BPMN tags and namespace-sensitive structures.
4. Return blockers for invalid XML or missing core structures.
5. Do not patch or rewrite XML.

## Edge cases to handle

- Empty XML.
- Malformed XML.
- Missing collaboration/participant/process/laneSet.
- XML with namespaces.

## Constraints

- Do not modify D01 generator core.
- Do not use regex-only XML validation.
- Do not add dependencies unless already approved.
- Do not mutate generated XML.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Generate D01 BPMN XML.
2. Run post-gate on generated XML.
3. Confirm valid XML passes and malformed XML fails.

## Rollback

If the task fails before commit:

git status --short
git restore src/lib/quality-engine/d01-post-generation-gate.ts src/lib/quality-engine/index.ts

## Docs to update

- docs/SESSION_HANDOFF.md

## Suggested commit message

Add D01 post-generation gate
