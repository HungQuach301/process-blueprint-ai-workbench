# Task ID: 004-qa-panel-split

## Task name

Split QA Panel findings and recommendations

## Estimated effort

Medium / 3-5 hours

## Dependencies

- 001-qafinding-schema
- 002-rule-qa-to-findings
- 003-ai-qa-finding-skill

## Goal

Update the QA Panel UI so findings and recommendations are visually separated. Findings are read-only review items; recommendations keep the existing preview/apply workflow.

## Definition of Done

- [ ] QA Panel has distinct Findings and Recommendations sections or tabs.
- [ ] Rule QA issues appear as `QAFinding` items in Findings.
- [ ] AI findings from `ai-process-qa-finding` appear in Findings.
- [ ] Findings have no apply buttons.
- [ ] Existing recommendation preview/apply confirmation still works.
- [ ] Existing safe-selection behavior is unchanged.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- docs/CODE_AUDIT_REPORT.md
- src/components/qa-panel/QAPanel.tsx
- src/lib/qa/task-register-rules.ts
- src/lib/qa/qa-finding.ts
- src/lib/qa/rule-qa-to-findings.ts
- src/lib/recommendation-engine/apply-operations.ts
- src/lib/recommendation-engine/preview-operations.ts

## Files expected to change

- src/components/qa-panel/QAPanel.tsx
- docs/SESSION_HANDOFF.md

## Implementation instructions

1. Read current `QAPanel.tsx` state and recommendation flow before editing.
2. Add a local derived findings list from rule QA adapter output.
3. Add a route-backed action for AI findings only if task `003` already exposes the skill.
4. Render Findings separately from Recommendations.
5. Ensure all apply buttons stay only in Recommendations.
6. Keep recommendation feedback logging and confirmation modals unchanged.

## Edge cases to handle

- No findings and no recommendations.
- Findings from the same issue duplicated by rule and AI sources.
- Graph-changing recommendation hidden in advanced section must remain unchanged.
- Locale text should avoid hardcoded mixed-language copy when possible.

## Constraints

- Findings must not apply changes.
- Do not change `QARecommendation` schema.
- Do not change recommendation apply behavior.
- Do not modify D01/D02 generators.
- Do not add dependencies.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Create a known PTR issue.
2. Confirm it appears in Findings.
3. Run AI findings in mock/local mode and confirm Findings update.
4. Confirm Recommendations still require preview/confirmation before apply.

## Rollback

If the task fails before commit:

git status --short
git restore src/components/qa-panel/QAPanel.tsx

## Docs to update

- docs/SESSION_HANDOFF.md

## Suggested commit message

Split QA Panel findings and recommendations

