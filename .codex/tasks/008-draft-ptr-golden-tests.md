# Task ID: 008-draft-ptr-golden-tests

## Task name

Add Draft PTR Gate golden tests

## Estimated effort

Medium / 2-4 hours

## Dependencies

- 006a-draft-ptr-gate-v1
- 007-source-coverage-advisory

## Goal

Add initial deterministic golden tests for Draft PTR Gate v1 and source coverage advisory.

## Definition of Done

- [ ] Golden fixture for passing Draft PTR exists.
- [ ] Golden fixture for blocker Draft PTR exists.
- [ ] Golden fixture for gateway safety exists.
- [ ] Golden fixture confirms source coverage is advisory only.
- [ ] Test command exists or a no-dependency runnable script is documented.
- [ ] If `tsx` or another dependency is needed, task stops and asks before adding it.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- package.json
- src/lib/quality-engine/draft-ptr-gate-v1.ts
- src/lib/quality-engine/source-coverage-advisory.ts
- src/lib/ai-intake/draft-ptr-schema.ts
- src/lib/generators/bpmn-generator.test-data.ts

## Files expected to change

- src/lib/quality-engine/draft-ptr-gate-v1.test-data.ts
- Optional: scripts/test-draft-ptr-gate.ps1
- Optional: package.json only if user approves adding a test script/dependency
- docs/SESSION_HANDOFF.md

## Allowed changed files

- src/lib/quality-engine/draft-ptr-gate-v1.test-data.ts
- scripts/test-draft-ptr-gate.ps1
- docs/SESSION_HANDOFF.md

## Implementation instructions

1. Check existing package scripts first.
2. Prefer no new dependency; use TypeScript type-checkable fixture data if executable tests are not available.
3. If an executable TypeScript runner such as `tsx` is required and missing, stop and ask before adding dependency.
4. Add clear golden inputs and expected verdict summaries.
5. Keep tests deterministic and local.

## Edge cases to handle

- Gate fail due to missing schema fields.
- Gateway missing yes/no branch.
- Missing actor/system coverage.
- Source coverage warning without blocking.

## Constraints

- Do not add dependencies without asking.
- Do not change gate logic casually to satisfy tests.
- Do not modify app UI.
- Do not change AI behavior.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Inspect golden fixture expected results.
2. Run available test command if one exists.
3. Confirm TypeScript and build pass.

## Rollback

If the task fails before commit:

git status --short
git restore src/lib/quality-engine/draft-ptr-gate-v1.test-data.ts scripts/test-draft-ptr-gate.ps1 package.json

## Docs to update

- docs/SESSION_HANDOFF.md

## Suggested commit message

Add Draft PTR Gate golden fixtures

