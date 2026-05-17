# Task ID: 006a-draft-ptr-gate-v1

## Task name

Add Draft PTR Gate v1

## Estimated effort

Medium / 2-4 hours

## Dependencies

- 005-gateverdict-framework

## Goal

Add a Draft PTR Gate v1 that evaluates generated Draft PTR output across five core dimensions and returns a `GateVerdict`.

## Definition of Done

- [ ] Draft PTR Gate v1 exists.
- [ ] It evaluates `schemaCompleteness`.
- [ ] It evaluates `flowIntegrity`.
- [ ] It evaluates `gatewaySafety`.
- [ ] It evaluates `actorSystemCoverage`.
- [ ] It evaluates `decompositionQuality`.
- [ ] It does not implement extra dimensions beyond the five listed.
- [ ] Existing Draft PTR schema validation remains unchanged.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- docs/CODE_AUDIT_REPORT.md
- src/lib/quality-engine/gate-verdict.ts
- src/lib/quality-engine/ai-draft-quality-gate.ts
- src/lib/ai-intake/draft-ptr-schema.ts
- src/lib/models/process-task.ts

## Files expected to change

- src/lib/quality-engine/draft-ptr-gate-v1.ts
- src/lib/quality-engine/index.ts
- docs/SESSION_HANDOFF.md

## Implementation instructions

1. Create `src/lib/quality-engine/draft-ptr-gate-v1.ts`.
2. Accept validated `DraftProcessTaskRegister`.
3. Evaluate only the five required dimensions.
4. Return `GateVerdict` with blockers and warnings.
5. Keep source coverage out of score and blocking logic.
6. Do not replace `runDraftProcessTaskRegisterQualityGate` yet.

## Edge cases to handle

- Empty draft task array.
- Missing next-step references.
- Gateway missing yes/no branches.
- Missing actor/system on user/service tasks.
- Overly broad task names suggesting decomposition risk.

## Constraints

- Do not implement all 10 dimensions.
- Do not change route behavior in this task.
- Do not change UI.
- Do not add dependencies.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Run gate against sample valid Draft PTR.
2. Run gate against Draft PTR with bad next-step references.
3. Confirm source coverage does not affect score or apply blocking.

## Rollback

If the task fails before commit:

git status --short
git restore src/lib/quality-engine/draft-ptr-gate-v1.ts src/lib/quality-engine/index.ts

## Docs to update

- docs/SESSION_HANDOFF.md

## Suggested commit message

Add Draft PTR Gate v1
