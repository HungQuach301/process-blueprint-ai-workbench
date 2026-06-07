# Task ID: 001-qafinding-schema

## Task name

Add QAFinding schema

## Estimated effort

Small / 1-2 hours

## Dependencies

- 000-source-code-audit

## Goal

Create a separate QAFinding schema so QA findings are separated from QARecommendation.

## Definition of Done

- [ ] src/lib/qa/qa-finding.ts exists.
- [ ] QAFindingSeverity exists.
- [ ] QAFindingCategory exists.
- [ ] QAFinding exists.
- [ ] QAFindingSet exists.
- [ ] createFindingSummary exists.
- [ ] validateQAFinding exists.
- [ ] mergeFindingSets exists.
- [ ] QARecommendation schema is not changed.
- [ ] npx.cmd tsc --noEmit passes.
- [ ] npm run build passes.

## Files to inspect first

- docs/CODE_AUDIT_REPORT.md
- src/lib/qa/
- src/lib/recommendation-engine/

## Files expected to change

- src/lib/qa/qa-finding.ts
- docs/SESSION_HANDOFF.md

## Implementation instructions

Create src/lib/qa/qa-finding.ts.

Types:

QAFindingSeverity:
- critical
- warning
- suggestion
- info

QAFindingCategory:
- missing-field
- invalid-reference
- decomposition
- wording
- template-mismatch
- governance-gap
- ambiguity
- inconsistency
- structural
- coverage-gap

Create:
- QAFinding
- QAFindingSet
- createFindingSummary(findings)
- validateQAFinding(finding)
- mergeFindingSets(ruleFindings, aiFindings)

Dedup key:
issueCode + affectedStepIds + affectedArtifact + category

Sort order:
critical -> warning -> suggestion -> info

## Edge cases to handle

- Empty findings array.
- Finding with invalid severity.
- Finding with missing required field.
- Duplicate finding with same issueCode and affectedStepIds.

## Constraints

- Do not change QARecommendation.
- Do not change recommendation apply behavior.
- Do not modify UI in this task.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. TypeScript passes.
2. App build passes.
3. Existing QARecommendation schema is unchanged.

## Rollback

If task fails before commit:

git status --short
git restore src/lib/qa/qa-finding.ts

## Docs to update

- docs/SESSION_HANDOFF.md

## Suggested commit message

Add QAFinding schema
