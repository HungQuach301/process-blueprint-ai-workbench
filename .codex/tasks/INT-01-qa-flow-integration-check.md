# Task ID: INT-01-qa-flow-integration-check

## Task name

QA findings and recommendations integration check

## Estimated effort

Small / 1-2 hours

## Dependencies

- 002-rule-qa-to-findings
- 003-ai-qa-finding-skill
- 004-qa-panel-split

## Goal

Verify the QA flow end to end after findings are introduced, without adding new features.

## Definition of Done

- [ ] PTR issue flows through Rule QA to `QAFinding`.
- [ ] Rule findings display in QA Panel Findings.
- [ ] AI findings display in QA Panel Findings.
- [ ] Findings have no apply action.
- [ ] Recommendations still preview/apply through existing confirmation.
- [ ] No `QARecommendation` schema regression is found.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- src/components/qa-panel/QAPanel.tsx
- src/lib/qa/task-register-rules.ts
- src/lib/qa/qa-finding.ts
- src/lib/qa/rule-qa-to-findings.ts
- src/app/api/ai/run-skill/route.ts
- src/lib/recommendation-engine/qa-recommendation-schema.ts

## Files expected to change

- docs/SESSION_HANDOFF.md
- Optional: docs/QA_FLOW_CHECK.md if a written check report is useful

## Allowed changed files

- docs/SESSION_HANDOFF.md
- docs/QA_FLOW_CHECK.md

## Implementation instructions

1. Run TypeScript and build.
2. Inspect UI/data flow from PTR issue to Findings.
3. Verify AI finding route in mock/local mode.
4. Verify existing recommendations still use preview/confirmation.
5. Record only integration findings and any follow-up tasks.

## Edge cases to handle

- No findings.
- Duplicate findings.
- AI route returns validation error.
- Recommendation apply still works after findings are present.

## Constraints

- No new features.
- Do not change AI behavior unless fixing a bug found in this integration check.
- Do not change D01/D02 generators.
- Do not add dependencies.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Create a PTR missing-field issue.
2. Confirm Findings tab/section shows the issue.
3. Run mock AI findings and confirm read-only display.
4. Apply a safe recommendation only after preview.

## Rollback

If changes become necessary and unsafe:

git status --short
git restore docs/QA_FLOW_CHECK.md

## Docs to update

- docs/SESSION_HANDOFF.md

## Suggested commit message

Verify QA findings integration flow


