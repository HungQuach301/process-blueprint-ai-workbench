# Task ID: 006b-wire-draft-ptr-gate-ui

## Task name

Wire Draft PTR Gate v1 into preview UI

## Estimated effort

Medium / 2-4 hours

## Dependencies

- 006a-draft-ptr-gate-v1

## Goal

Show Draft PTR Gate v1 results in the Draft PTR preview UI while preserving explicit user apply behavior.

## Definition of Done

- [ ] Draft PTR preview shows verdict status.
- [ ] Default UI shows blockers and top warnings.
- [ ] Advanced UI shows score and dimension breakdown.
- [ ] Apply remains explicit user action.
- [ ] Existing schema/quality errors still block invalid output.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- src/components/input-brief/AIInputBriefPanel.tsx
- src/lib/quality-engine/draft-ptr-gate-v1.ts
- src/lib/quality-engine/gate-verdict.ts
- src/lib/ai-intake/draft-ptr-schema.ts

## Files expected to change

- src/components/input-brief/AIInputBriefPanel.tsx
- docs/SESSION_HANDOFF.md

## Implementation instructions

1. Locate Draft PTR preview rendering and apply buttons.
2. Run Draft PTR Gate v1 on previewed draft data.
3. Add compact verdict display near preview header.
4. Add advanced collapsible breakdown for score and dimensions.
5. Do not auto-apply or auto-save any AI output.

## Edge cases to handle

- No draft preview yet.
- Gate fail with blockers.
- Gate warning but no blockers.
- Existing route returns quality gate warnings.

## Constraints

- Do not change AI route.
- Do not change Draft PTR generation.
- Do not change apply behavior.
- Do not add dependencies.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Generate Draft PTR from AI Input Brief mock/local mode.
2. Confirm verdict, blockers, and warnings display.
3. Expand advanced details and confirm score/breakdown.
4. Confirm Apply requires explicit click.

## Rollback

If the task fails before commit:

git status --short
git restore src/components/input-brief/AIInputBriefPanel.tsx

## Docs to update

- docs/SESSION_HANDOFF.md

## Suggested commit message

Show Draft PTR Gate verdict in preview UI
