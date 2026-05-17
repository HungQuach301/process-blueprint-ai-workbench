# Task ID: UX-005-qa-panel-user-facing-cleanup

## Task name

Clean up QA Panel for user-facing review

## Estimated effort

Medium / 2-3 hours

## Dependencies

- UX-010-mixed-language-and-mock-label-cleanup

## Goal

Make QA Panel easier to understand by clearly separating read-only findings from actionable recommendations and reducing repeated empty-state noise.

## Definition of Done

- [ ] Findings and Recommendations are visually distinct.
- [ ] Findings are read-only and have no apply action.
- [ ] Recommendations keep preview, confirmation, and apply behavior.
- [ ] Repeated empty recommendation noise is removed or consolidated.
- [ ] Existing safe selection and high-risk confirmation behavior remains unchanged.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- `src/components/qa-panel/QAPanel.tsx`
- `src/lib/qa/rule-qa-to-findings.ts`
- `src/lib/qa/qa-finding.ts`
- `src/lib/recommendation-engine/qa-recommendation-schema.ts`
- `docs/AI_QA_ENGINE_DESIGN.md`
- `docs/USER_GATE_1_GUIDE.md`

## Files expected to change

- `src/components/qa-panel/QAPanel.tsx`
- `docs/SESSION_HANDOFF.md`

## Allowed changed files

- `src/components/qa-panel/QAPanel.tsx`
- `docs/SESSION_HANDOFF.md`

## Implementation instructions

1. Review current Findings and Recommendations rendering.
2. Make section headings and visual treatments clearly different.
3. Ensure Findings are read-only and never show apply/preview actions.
4. Keep Recommendation preview/confirmation/apply behavior intact.
5. Reduce repeated empty states by showing one clear message per section.
6. Preserve provider compare and recommendation feedback logging.
7. Update `docs/SESSION_HANDOFF.md`.

## Edge cases to handle

- Rule QA may return findings but no recommendations.
- AI finding route may fail or return no findings.
- Recommendations may be hidden by advanced graph-change toggles.
- Do not confuse findings with operations.

## Constraints

- Do not change `QARecommendation` schema/types.
- Do not change Rule QA engine.
- Do not change recommendation apply behavior.
- Do not add dependencies.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Create a known QA issue.
2. Confirm Findings count and read-only list are clear.
3. Confirm Recommendations still preview and apply only after confirmation.
4. Confirm empty states are not repeated noisily.

## Rollback

If the task fails before commit:

```powershell
git status --short
git restore src/components/qa-panel/QAPanel.tsx docs/SESSION_HANDOFF.md
```

## Suggested commit message

Clarify QA findings and recommendations
