# Task ID: 005-gateverdict-framework

## Task name

Add GateVerdict framework

## Estimated effort

Small / 1-2 hours

## Dependencies

- 000-source-code-audit
- 001-qafinding-schema

## Goal

Create a shared GateVerdict type framework that future gates can use, without replacing existing quality gates yet.

## Definition of Done

- [ ] Gate verdict type file exists.
- [ ] Verdict status supports pass, warning, fail, and not-applicable.
- [ ] Gate issue/blocker/warning structures exist.
- [ ] Score/breakdown shape exists.
- [ ] Helper to create a summary exists.
- [ ] Existing `runDraftProcessTaskRegisterQualityGate` is unchanged.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- docs/CODE_AUDIT_REPORT.md
- src/lib/quality-engine/ai-draft-quality-gate.ts
- src/lib/quality-engine/index.ts
- src/lib/qa/qa-finding.ts

## Files expected to change

- src/lib/quality-engine/gate-verdict.ts
- src/lib/quality-engine/index.ts
- docs/SESSION_HANDOFF.md

## Implementation instructions

1. Create `src/lib/quality-engine/gate-verdict.ts`.
2. Define framework types only: verdict status, issue severity, issue, score dimension, and `GateVerdict`.
3. Add small pure helpers if useful, such as summary/count builders.
4. Export from `src/lib/quality-engine/index.ts`.
5. Do not migrate existing gates in this task.

## Edge cases to handle

- Empty issue list.
- Gate without score.
- Not-applicable gate.
- Multiple dimensions with missing score.

## Constraints

- Do not replace existing gates yet.
- Do not modify AI route.
- Do not modify UI.
- Do not add dependencies.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Confirm TypeScript can import `GateVerdict` from `src/lib/quality-engine`.
2. Confirm existing Draft PTR quality gate behavior has no diff.

## Rollback

If the task fails before commit:

git status --short
git restore src/lib/quality-engine/gate-verdict.ts src/lib/quality-engine/index.ts

## Docs to update

- docs/SESSION_HANDOFF.md

## Suggested commit message

Add GateVerdict framework
