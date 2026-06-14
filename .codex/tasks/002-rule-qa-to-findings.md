# Task ID: 002-rule-qa-to-findings

## Task name

Adapt Rule QA issues to QAFinding

## Estimated effort

Small / 1-2 hours

## Dependencies

- 000-source-code-audit
- 001-qafinding-schema

## Goal

Create a small adapter that converts existing Rule QA `QaIssue` objects into `QAFinding` / `QAFindingSet` without changing the Rule QA engine or QA Panel behavior.

## Definition of Done

- [ ] Adapter from `QaIssue` to `QAFinding` exists.
- [ ] Adapter uses real `QaIssue`, `QaIssueCode`, and `QaSeverity` from `src/lib/qa/task-register-rules.ts`.
- [ ] Adapter uses `QAFinding` types from `src/lib/qa/qa-finding.ts`.
- [ ] Existing `validateProcessTasks` output is unchanged.
- [ ] Existing `QARecommendation` schema is unchanged.
- [ ] No QA Panel UI change is made.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- docs/CODE_AUDIT_REPORT.md
- src/lib/qa/task-register-rules.ts
- src/lib/qa/qa-finding.ts
- src/lib/recommendation-engine/types.ts
- src/lib/recommendation-engine/qa-recommendation-schema.ts

## Files expected to change

- src/lib/qa/rule-qa-to-findings.ts
- docs/SESSION_HANDOFF.md

## Implementation instructions

1. Create `src/lib/qa/rule-qa-to-findings.ts`.
2. Add severity mapping: `error -> critical`, `warning -> warning`, `suggestion -> suggestion`.
3. Add category mapping from existing `QaIssueCode` values to closest `QAFindingCategory`.
4. Preserve `issue.code`, `issue.message`, `issue.task?.stepId`, and related artifact context where available.
5. Return a `QAFindingSet` with `createFindingSummary`.
6. Do not change `validateProcessTasks`; this adapter should consume its output only.

## Edge cases to handle

- Empty `QaIssue[]`.
- Issue without a task or `stepId`.
- Unknown future issue code.
- Issue containing existing recommendations.

## Constraints

- Do not modify Rule QA engine behavior.
- Do not modify QA Panel.
- Do not modify `QARecommendation` types or schema.
- Do not change recommendation apply behavior.
- Do not add dependencies.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Run `validateProcessTasks` mentally or with existing sample data and confirm the adapter can consume its `QaIssue[]`.
2. Confirm findings include stable `issueCode`, severity, category, affected artifact, and affected step ids.
3. Confirm existing recommendation preview/apply files have no diff.

## Rollback

If the task fails before commit:

git status --short
git restore src/lib/qa/rule-qa-to-findings.ts

## Docs to update

- docs/SESSION_HANDOFF.md

## Suggested commit message

Add Rule QA to QAFinding adapter

