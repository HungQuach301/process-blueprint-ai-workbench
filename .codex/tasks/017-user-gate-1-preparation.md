# Task ID: 017-user-gate-1-preparation

## Task name

Prepare User Gate 1 demo and feedback guide

## Estimated effort

Small / 1-2 hours

## Dependencies

- 015-release-hardening

## Goal

Create a concise User Gate 1 demo and feedback guide for validating MVP1-AI Stable with real users.

## Definition of Done

- [ ] User Gate 1 guide exists.
- [ ] Demo script covers AI Input Brief, PTR, QA, D01, D02, and Export Center.
- [ ] Feedback questions cover usability, trust, traceability, and AI review safety.
- [ ] Known limitations are documented.
- [ ] No app source code is changed.
- [ ] `npx.cmd tsc --noEmit` passes.

## Files to inspect first

- docs/SESSION_HANDOFF.md
- docs/CURRENT_STATE.md
- docs/PRODUCT_CONTEXT.md
- docs/ROADMAP.md
- docs/CODE_AUDIT_REPORT.md

## Files expected to change

- docs/USER_GATE_1_GUIDE.md
- docs/SESSION_HANDOFF.md

## Implementation instructions

1. Create a practical demo guide for a 30-45 minute user session.
2. Include setup checklist, demo flow, tasks for the user, feedback prompts, and observation notes.
3. Include explicit human-in-the-loop and no-auto-apply messaging.
4. List known limitations and follow-up capture format.
5. Do not change app code.

## Edge cases to handle

- Real AI not configured; use mock/local mode.
- User is non-technical.
- User asks about sensitive data and cloud AI.
- D01/D02 external modelers not available.

## Constraints

- Documentation only.
- Do not add dependencies.
- Do not change AI behavior.
- Do not modify app source code.

## Commands to run

npx.cmd tsc --noEmit

## Manual test

1. Read the guide end to end.
2. Confirm a facilitator can run the demo without extra context.
3. Confirm feedback prompts are actionable.

## Rollback

If the task fails before commit:

git status --short
git restore docs/USER_GATE_1_GUIDE.md

## Docs to update

- docs/SESSION_HANDOFF.md

## Suggested commit message

Prepare User Gate 1 guide
