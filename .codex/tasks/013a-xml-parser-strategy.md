# Task ID: 013a-xml-parser-strategy

## Task name

Decide XML parser strategy

## Estimated effort

Small / 1-2 hours

## Dependencies

- 011-d01-pre-gate
- 012-d02-pre-gate

## Goal

Decide and document a safe XML parser strategy for D01 BPMN and D02 draw.io post-generation gates.

## Definition of Done

- [ ] XML parser strategy is documented.
- [ ] Existing dependencies are checked first.
- [ ] Regex-only XML validation is rejected.
- [ ] If a new dependency is needed, task stops and asks before adding it.
- [ ] Follow-up implementation task scope is clear.
- [ ] `npx.cmd tsc --noEmit` passes.

## Files to inspect first

- package.json
- src/lib/generators/bpmn-generator.ts
- src/lib/generators/drawio-service-blueprint-generator.ts
- src/components/bpmn-output/D01BpmnOutput.tsx
- src/components/service-blueprint-output/D02ServiceBlueprintOutput.tsx

## Files expected to change

- docs/XML_PARSER_STRATEGY.md
- docs/SESSION_HANDOFF.md

## Implementation instructions

1. Inspect current dependencies for XML parsing capability.
2. Assess browser/server compatibility needs.
3. Document chosen strategy and tradeoffs.
4. Explicitly state that regex-only XML validation is not acceptable.
5. If a dependency is required, stop and ask before adding it.

## Edge cases to handle

- BPMN namespace validation.
- draw.io XML root validation.
- Browser-only APIs unavailable in server checks.
- Large XML strings.

## Constraints

- Do not implement parser if dependency is needed.
- Do not add dependencies without asking.
- Do not use regex-only XML validation.
- Do not modify D01/D02 generators.

## Commands to run

npx.cmd tsc --noEmit

## Manual test

1. Read `docs/XML_PARSER_STRATEGY.md`.
2. Confirm it names allowed parser approach and rejected regex-only approach.
3. Confirm no app source changed unless strategy can use existing platform APIs safely.

## Rollback

If the task fails before commit:

git status --short
git restore docs/XML_PARSER_STRATEGY.md

## Docs to update

- docs/SESSION_HANDOFF.md

## Suggested commit message

Document XML parser strategy
