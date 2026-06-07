# Task ID: 009b-wire-normalizer-route

## Task name

Wire provider normalizer into AI route

## Estimated effort

Medium / 2-4 hours

## Dependencies

- 009a-provider-normalizer

## Goal

Wire the provider output normalizer into real provider-backed `/api/ai/run-skill` flow before schema validation. Mock/local behavior must remain unchanged.

## Definition of Done

- [ ] Normalizer runs only for provider-backed output.
- [ ] Normalizer runs after JSON parse/repair and before `validateAISkillOutput`.
- [ ] Unsafe normalization returns validation failure.
- [ ] Normalizer warnings appear in safe metadata.
- [ ] Mock/local path remains unchanged.
- [ ] Existing schema validation still blocks invalid output.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- src/lib/ai/provider-output-normalizer.ts
- src/app/api/ai/run-skill/route.ts
- src/lib/ai/skill-schemas.ts
- src/lib/ai/providers/provider-types.ts

## Files expected to change

- src/app/api/ai/run-skill/route.ts
- docs/SESSION_HANDOFF.md

## Implementation instructions

1. Locate provider-backed flow after `parseProviderJsonWithOptionalRepair`.
2. Call normalizer before `validateAISkillOutput`.
3. If normalizer returns errors, return safe 422 response without treating output as valid.
4. Include warning/error counts in metadata; do not include full model output.
5. Confirm `createMockResponse` path does not call normalizer.

## Edge cases to handle

- Normalizer changes output and validation passes.
- Normalizer detects unsafe reference change.
- Provider output malformed even after repair.
- Skill has no normalizer behavior.

## Constraints

- Mock/local path must remain unchanged.
- Unsafe normalization must not silently pass.
- Do not expose provider output in logs.
- Do not add dependencies.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Run mock/local skill and confirm metadata unchanged.
2. Simulate provider-backed normalized output if feasible.
3. Confirm invalid unsafe output is blocked.

## Rollback

If the task fails before commit:

git status --short
git restore src/app/api/ai/run-skill/route.ts

## Docs to update

- docs/SESSION_HANDOFF.md

## Suggested commit message

Wire provider output normalizer into AI route
