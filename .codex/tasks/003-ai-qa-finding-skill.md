# Task ID: 003-ai-qa-finding-skill

## Task name

Add AI QA finding skill

## Estimated effort

Medium / 2-4 hours

## Dependencies

- 001-qafinding-schema
- 002-rule-qa-to-findings

## Goal

Add a new AI skill `ai-process-qa-finding` that returns `QAFinding` / `QAFindingSet` as review findings only, while keeping existing `ai-process-qa` recommendation behavior unchanged.

## Definition of Done

- [ ] `ai-process-qa-finding` is registered in `src/lib/ai/skill-registry-v2.ts`.
- [ ] Prompt pack exists in `src/lib/ai/prompt-packs.ts`.
- [ ] Output schema validation accepts `QAFindingSet` or wrapped `QAFinding[]`.
- [ ] Mock/local route support exists in `src/app/api/ai/run-skill/route.ts`.
- [ ] Existing `ai-process-qa` skill still returns `QARecommendation[]`.
- [ ] No apply behavior is introduced for findings.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- docs/CODE_AUDIT_REPORT.md
- src/lib/qa/qa-finding.ts
- src/lib/qa/rule-qa-to-findings.ts
- src/lib/ai/skill-registry-v2.ts
- src/lib/ai/skill-schemas.ts
- src/lib/ai/prompt-packs.ts
- src/app/api/ai/run-skill/route.ts
- src/lib/ai/ai-qa-service.ts
- src/lib/ai/ai-qa-types.ts

## Files expected to change

- src/lib/ai/skill-registry-v2.ts
- src/lib/ai/skill-schemas.ts
- src/lib/ai/prompt-packs.ts
- src/app/api/ai/run-skill/route.ts
- docs/SESSION_HANDOFF.md

## Implementation instructions

1. Add schema helper for `QAFindingSet` validation using `validateQAFinding`.
2. Add registry entry `ai-process-qa-finding`.
3. Add provider-neutral prompt instructions that forbid recommendations/apply operations.
4. Add deterministic mock/local response that derives findings from rule QA context where possible.
5. Route response should expose findings only and metadata; it must not include apply operations.
6. Keep `ai-process-qa` constants, schema path, and route behavior unchanged.

## Edge cases to handle

- Empty process task register.
- AI returns recommendations instead of findings.
- AI returns invalid severity/category.
- Missing affected step ids.

## Constraints

- Do not remove or change `ai-process-qa`.
- Do not change recommendation apply behavior.
- Do not auto-apply findings.
- Do not expose provider API keys in browser code.
- Do not add dependencies.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Call `/api/ai/run-skill` with mock/local `ai-process-qa-finding` payload.
2. Confirm response contains findings and no apply operations.
3. Confirm existing `ai-process-qa` still returns recommendations.

## Rollback

If the task fails before commit:

git status --short
git restore src/lib/ai/skill-registry-v2.ts src/lib/ai/skill-schemas.ts src/lib/ai/prompt-packs.ts src/app/api/ai/run-skill/route.ts

## Docs to update

- docs/SESSION_HANDOFF.md

## Suggested commit message

Add AI QA finding skill

