# Task ID: INT-03-ai-route-normalizer-integration-check

## Task name

AI route normalizer integration check

## Estimated effort

Small / 1-2 hours

## Dependencies

- 009a-provider-normalizer
- 009b-wire-normalizer-route
- 010-normalizer-golden-tests

## Goal

Verify provider-backed AI route parsing, repair, normalization, schema validation, and safe metadata behavior.

## Definition of Done

- [ ] Mock/local route behavior is unchanged.
- [ ] Provider-backed flow calls normalizer before schema validation.
- [ ] Unsafe normalization is blocked.
- [ ] Schema validation still blocks invalid output.
- [ ] Metadata does not include full prompt or full model output.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- src/app/api/ai/run-skill/route.ts
- src/lib/ai/provider-output-normalizer.ts
- src/lib/ai/skill-schemas.ts
- src/lib/ai/providers/provider-types.ts
- docs/CODE_AUDIT_REPORT.md

## Files expected to change

- docs/SESSION_HANDOFF.md
- Optional: docs/AI_ROUTE_NORMALIZER_CHECK.md

## Implementation instructions

1. Run TypeScript and build.
2. Inspect route ordering manually.
3. Exercise mock/local path.
4. Exercise provider-backed path only if safe env is available; otherwise document not run.
5. Record findings and follow-ups.

## Edge cases to handle

- No real provider configured.
- Provider output requires JSON repair.
- Normalizer detects unsafe output.
- Validation fails after normalization.

## Constraints

- No new features.
- Do not expose API keys or full provider output.
- Do not add dependencies.
- Do not change AI behavior except scoped bug fixes.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Confirm mock/local skill still succeeds.
2. Confirm route metadata is safe.
3. Confirm normalizer ordering in code.

## Rollback

If documentation-only changes are wrong:

git status --short
git restore docs/AI_ROUTE_NORMALIZER_CHECK.md

## Docs to update

- docs/SESSION_HANDOFF.md

## Suggested commit message

Verify AI route normalizer integration
