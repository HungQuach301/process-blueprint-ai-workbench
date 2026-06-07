# Task ID: INT-02-draft-ptr-gate-integration-check

## Task name

Draft PTR gate integration check

## Estimated effort

Small / 1-2 hours

## Dependencies

- 006a-draft-ptr-gate-v1
- 006b-wire-draft-ptr-gate-ui
- 007-source-coverage-advisory
- 008-draft-ptr-golden-tests

## Goal

Verify Input Brief to Draft PTR to GateVerdict to Source Coverage advisory flow end to end.

## Definition of Done

- [ ] Input Brief can generate Draft PTR in mock/local mode.
- [ ] Draft PTR Gate verdict displays.
- [ ] Blockers and warnings display correctly.
- [ ] Source Coverage advisory displays separately.
- [ ] Source Coverage does not affect score or block Apply.
- [ ] Apply remains explicit.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- src/components/input-brief/AIInputBriefPanel.tsx
- src/lib/quality-engine/draft-ptr-gate-v1.ts
- src/lib/quality-engine/source-coverage-advisory.ts
- src/lib/ai-intake/draft-ptr-schema.ts

## Files expected to change

- docs/SESSION_HANDOFF.md
- Optional: docs/DRAFT_PTR_GATE_CHECK.md

## Allowed changed files

- docs/SESSION_HANDOFF.md
- docs/DRAFT_PTR_GATE_CHECK.md

## Implementation instructions

1. Run TypeScript and build.
2. Manually verify mock/local Input Brief to Draft PTR preview.
3. Confirm GateVerdict and advisory behavior.
4. Record issues or follow-ups only.

## Edge cases to handle

- Draft PTR cannot be generated.
- Gate fail with blockers.
- Advisory warning with pass verdict.
- Apply disabled/enabled state regression.

## Constraints

- No new features.
- Do not change AI auto-apply behavior.
- Do not add dependencies.
- Do not modify D01/D02 generators.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Fill simplified AI Input Brief.
2. Generate Draft PTR.
3. Inspect GateVerdict and advisory.
4. Apply only after explicit approval.

## Rollback

If documentation-only changes are wrong:

git status --short
git restore docs/DRAFT_PTR_GATE_CHECK.md

## Docs to update

- docs/SESSION_HANDOFF.md

## Suggested commit message

Verify Draft PTR gate integration

