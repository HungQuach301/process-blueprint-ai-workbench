# Task ID: 009a-provider-normalizer

## Task name

Create provider output normalizer

## Estimated effort

Medium / 2-4 hours

## Dependencies

- 000-source-code-audit

## Goal

Create pure provider output normalization functions without wiring them into `/api/ai/run-skill` yet.

## Definition of Done

- [ ] Provider output normalizer file exists.
- [ ] Normalizer accepts parsed provider output and skill/schema context.
- [ ] Normalizer preserves safe values.
- [ ] Normalizer reports unsafe transformations.
- [ ] Normalizer does not silently null broken references.
- [ ] Route is not wired yet.
- [ ] Mock/local path is unchanged.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- docs/CODE_AUDIT_REPORT.md
- src/lib/ai/providers/provider-types.ts
- src/lib/ai/skill-schemas.ts
- src/app/api/ai/run-skill/route.ts
- src/lib/models/process-task.ts

## Files expected to change

- src/lib/ai/provider-output-normalizer.ts
- docs/SESSION_HANDOFF.md

## Implementation instructions

1. Create a pure normalizer module under `src/lib/ai`.
2. Define result type with normalized output, warnings, errors, and changed paths.
3. Normalize shallow structural issues only, such as wrapped JSON payloads or common field aliases.
4. Treat unsafe reference changes as errors.
5. Do not import or call the normalizer from the route in this task.

## Edge cases to handle

- Provider output wrapped in `{ result: ... }`.
- Provider output wrapped in `{ data: ... }`.
- Missing required arrays.
- Broken step references.
- Unknown skill id/schema.

## Constraints

- Pure functions only.
- Do not wire route yet.
- Do not silently null broken references.
- Do not add dependencies.
- Do not log sensitive output.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Inspect normalizer behavior for wrapped payload samples.
2. Confirm no diff in `/api/ai/run-skill/route.ts`.
3. Confirm TypeScript and build pass.

## Rollback

If the task fails before commit:

git status --short
git restore src/lib/ai/provider-output-normalizer.ts

## Docs to update

- docs/SESSION_HANDOFF.md

## Suggested commit message

Add provider output normalizer helpers
