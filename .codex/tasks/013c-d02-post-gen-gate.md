# Task ID: 013c-d02-post-gen-gate

## Task name

Add D02 Service Blueprint post-generation gate

## Estimated effort

Medium / 2-4 hours

## Dependencies

- 013a-xml-parser-strategy

## Goal

Add a D02 post-generation gate that validates generated diagrams.net/draw.io XML without mutating the XML and without modifying the D02 generator core.

## Definition of Done

- [ ] D02 post-generation gate exists.
- [ ] Gate validates XML parseability using approved parser strategy.
- [ ] Gate checks draw.io compatible root structures.
- [ ] Gate checks card count and obvious overlap metadata where available.
- [ ] Gate returns `GateVerdict`.
- [ ] D02 generator core is unchanged.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- docs/XML_PARSER_STRATEGY.md
- src/lib/generators/drawio-service-blueprint-generator.ts
- src/lib/quality-engine/gate-verdict.ts
- src/components/service-blueprint-output/D02ServiceBlueprintOutput.tsx

## Files expected to change

- src/lib/quality-engine/d02-post-generation-gate.ts
- src/lib/quality-engine/index.ts
- docs/SESSION_HANDOFF.md

## Implementation instructions

1. Follow the approved XML parser strategy.
2. Validate generated draw.io XML after generation.
3. Check root diagram structures and expected task-card cell patterns.
4. Return blockers for invalid XML and warnings for layout risks.
5. Do not patch or rewrite XML.

## Edge cases to handle

- Empty XML.
- Malformed XML.
- Missing diagram/root cells.
- Large process with many cards.
- Potential card overlap.

## Constraints

- Do not modify D02 generator core.
- Do not use regex-only XML validation.
- Do not add dependencies unless already approved.
- Do not mutate generated XML.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Generate D02 draw.io XML.
2. Run post-gate on generated XML.
3. Confirm valid XML passes and malformed XML fails.

## Rollback

If the task fails before commit:

git status --short
git restore src/lib/quality-engine/d02-post-generation-gate.ts src/lib/quality-engine/index.ts

## Docs to update

- docs/SESSION_HANDOFF.md

## Suggested commit message

Add D02 post-generation gate
