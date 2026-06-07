# Task ID: 015-release-hardening

## Task name

Run MVP1-AI Stable release hardening

## Estimated effort

Medium / 2-4 hours

## Dependencies

- INT-01-qa-flow-integration-check
- INT-02-draft-ptr-gate-integration-check
- INT-03-ai-route-normalizer-integration-check
- 013d-wire-post-gates-ui
- 014-chain-resilience-types

## Goal

Run final verification for MVP1-AI Stable scope. This task is verification and hardening only; it should not introduce new features.

## Definition of Done

- [ ] TypeScript passes.
- [ ] Build passes.
- [ ] QA findings/recommendations flow is verified.
- [ ] Draft PTR gate/advisory flow is verified.
- [ ] AI route normalizer flow is verified.
- [ ] D01/D02 pre/post gates are verified.
- [ ] No new feature work is introduced.
- [ ] Release hardening notes are recorded.

## Files to inspect first

- docs/CODE_AUDIT_REPORT.md
- docs/SESSION_HANDOFF.md
- src/components/qa-panel/QAPanel.tsx
- src/components/input-brief/AIInputBriefPanel.tsx
- src/components/bpmn-output/D01BpmnOutput.tsx
- src/components/service-blueprint-output/D02ServiceBlueprintOutput.tsx
- src/components/export-center/ExportCenter.tsx

## Files expected to change

- docs/SESSION_HANDOFF.md
- Optional: docs/MVP1_AI_STABLE_RELEASE_CHECK.md

## Implementation instructions

1. Run required automated checks.
2. Perform manual regression from AGENTS checklist for changed areas.
3. Record pass/fail and follow-up issues.
4. Fix only scoped P0/P1 regressions found during hardening.
5. Do not add new features.

## Edge cases to handle

- Real AI env not configured.
- Build passes but manual flow fails.
- Existing untracked task files present.
- Browser-only manual checks cannot be completed.

## Constraints

- No new features.
- Do not change AI auto-apply behavior.
- Do not expose API keys.
- Do not modify generator core unless fixing scoped regression.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. QA findings/recommendations.
2. AI Input Brief to Draft PTR.
3. D01 BPMN generate/preview/download.
4. D02 Service Blueprint generate/preview/download.
5. Export Center Generate All and ZIP.

## Rollback

If hardening changes are unsafe:

git status --short
git restore docs/MVP1_AI_STABLE_RELEASE_CHECK.md

## Docs to update

- docs/SESSION_HANDOFF.md

## Suggested commit message

Run MVP1-AI stable release hardening
