# Task ID: 010-normalizer-golden-tests

## Task name

Add normalizer golden tests

## Estimated effort

Medium / 2-4 hours

## Dependencies

- 009a-provider-normalizer
- 009b-wire-normalizer-route

## Goal

Add deterministic golden tests or fixtures for provider output normalizer behavior.

## Definition of Done

- [ ] Golden fixture for valid already-normalized output exists.
- [ ] Golden fixture for wrapped output exists.
- [ ] Golden fixture for unsafe broken references exists.
- [ ] Expected warnings/errors are documented.
- [ ] If executable runner dependency is missing, task stops and asks before adding it.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- package.json
- src/lib/ai/provider-output-normalizer.ts
- src/lib/ai/skill-schemas.ts
- src/lib/ai/providers/provider-types.ts

## Files expected to change

- src/lib/ai/provider-output-normalizer.test-data.ts
- Optional: scripts/test-provider-normalizer.ps1
- Optional: package.json only if user approves adding a test script/dependency
- docs/SESSION_HANDOFF.md

## Implementation instructions

1. Check existing scripts and dependencies first.
2. Prefer type-checkable golden fixture data if no runner exists.
3. If `tsx` or another runner is required and missing, stop and ask.
4. Include sample input, expected normalized output, expected warnings, and expected errors.
5. Keep fixtures free of sensitive data.

## Edge cases to handle

- Nested `result` wrapper.
- Alias fields.
- Broken references.
- Unknown schema.

## Constraints

- Do not add dependencies without asking.
- Do not change normalizer behavior casually.
- Do not modify AI route unless a real bug is found and scoped.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Inspect golden fixtures.
2. Run available script if present.
3. Confirm TypeScript and build pass.

## Rollback

If the task fails before commit:

git status --short
git restore src/lib/ai/provider-output-normalizer.test-data.ts scripts/test-provider-normalizer.ps1 package.json

## Docs to update

- docs/SESSION_HANDOFF.md

## Suggested commit message

Add provider normalizer golden fixtures
