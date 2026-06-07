# QA Flow Integration Check

## Date

2026-05-17

## Scope

Task `INT-01-qa-flow-integration-check`.

This check verifies the integration between Rule QA issues, `QAFinding`, AI findings, and existing `QARecommendation` preview/apply behavior. No application behavior was changed.

## Checks Performed

- Ran `npx.cmd tsc --noEmit`: passed.
- Ran `npm run build`: passed.
- Inspected Rule QA to finding conversion in `src/lib/qa/rule-qa-to-findings.ts`.
- Inspected QA Panel finding derivation and rendering in `src/components/qa-panel/QAPanel.tsx`.
- Inspected mock/local AI finding route support in `src/app/api/ai/run-skill/route.ts`.
- Inspected `QARecommendation` validation entrypoint in `src/lib/recommendation-engine/qa-recommendation-schema.ts`.

## Findings

- Rule QA issues flow to `QAFinding` through `qaIssuesToFindingSet`.
- QA Panel derives rule findings from `issues` and merges AI findings with `mergeFindingSets`, so duplicate rule/AI findings are deduplicated by the canonical finding merge helper.
- QA Panel renders Findings in a separate read-only section.
- Findings section has no apply or preview/apply buttons. It only supports row navigation through affected step ids and running AI findings.
- AI findings are requested through skill `ai-process-qa-finding`; the mock/local route derives AI-source findings from existing rule QA context and validates the result as `QAFindingSet`.
- Existing recommendation entries still come from `displayIssues.flatMap(issue.recommendations)`.
- Existing recommendation preview/apply behavior still uses `setPendingRecommendation`, `previewRecommendationBatch`, confirmation modals, and `onApplyRecommendation` / `onApplyRecommendations`.
- No `QARecommendation` schema regression was found in the integration surface.

## Edge Cases Reviewed

- No findings and no recommendations: QA Panel has an empty-state message.
- Duplicate findings: merged through `mergeFindingSets`.
- AI route validation error: QA Panel displays route error and does not apply anything.
- Recommendation apply with findings present: Findings are separate from recommendation selection and confirmation state.

## Residual Risk

- Browser manual testing was not executed in this CLI-only pass. The code path and build checks passed, but a UI click-through should still be done before release for the manual checklist steps.
