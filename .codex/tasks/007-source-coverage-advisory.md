# Task ID: 007-source-coverage-advisory

## Task name

Add source coverage advisory

## Estimated effort

Small / 1-2 hours

## Dependencies

- 006a-draft-ptr-gate-v1
- 006b-wire-draft-ptr-gate-ui

## Goal

Add a source coverage advisory for Draft PTR preview that helps users understand source trace coverage without affecting gate score or apply blocking.

## Definition of Done

- [ ] Source coverage advisory helper exists.
- [ ] Advisory reports coverage signals and warnings.
- [ ] Advisory does not affect `GateVerdict` score.
- [ ] Advisory does not block Apply.
- [ ] UI labels advisory as non-blocking.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- src/components/input-brief/AIInputBriefPanel.tsx
- src/lib/quality-engine/draft-ptr-gate-v1.ts
- src/lib/ai-intake/draft-ptr-schema.ts
- src/lib/quality-engine/gate-verdict.ts

## Files expected to change

- src/lib/quality-engine/source-coverage-advisory.ts
- src/lib/quality-engine/index.ts
- src/components/input-brief/AIInputBriefPanel.tsx
- docs/SESSION_HANDOFF.md

## Implementation instructions

1. Create a pure advisory helper under `src/lib/quality-engine`.
2. Compute simple source coverage signals from Draft PTR source metadata and task trace fields where available.
3. Display advisory separately from the GateVerdict UI.
4. Clearly mark it as advisory only.
5. Ensure apply blocking conditions remain based on schema/gate blockers, not coverage.

## Edge cases to handle

- No source metadata.
- Draft tasks without source references.
- File/chat/manual source modes.
- High coverage warnings without blockers.

## Constraints

- Source Coverage must not affect GateVerdict score.
- Source Coverage must not block Apply.
- Do not change AI route.
- Do not add dependencies.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Generate Draft PTR with minimal source data.
2. Confirm advisory appears.
3. Confirm Apply behavior is unchanged.
4. Confirm GateVerdict score is unchanged by advisory output.

## Rollback

If the task fails before commit:

git status --short
git restore src/lib/quality-engine/source-coverage-advisory.ts src/lib/quality-engine/index.ts src/components/input-brief/AIInputBriefPanel.tsx

## Docs to update

- docs/SESSION_HANDOFF.md

## Suggested commit message

Add non-blocking source coverage advisory
