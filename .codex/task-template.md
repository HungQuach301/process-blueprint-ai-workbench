# Task ID: <ID>

## Task name

<Short task name>

## Estimated effort

<Small / Medium / Large, estimated hours>

## Dependencies

- <task-id or None>

## Goal

<Clear goal>

## Definition of Done

- [ ] ...
- [ ] ...

## Files to inspect first

- ...

## Files expected to change

- ...

## Allowed changed files

- ...

## Implementation instructions

1. ...
2. ...
3. ...

## Edge cases to handle

- ...
- ...

## Constraints

- Do not change AI auto-apply behavior.
- Do not expose API keys in browser code.
- Do not modify generator core unless explicitly required.
- Do not add dependencies without asking.
- Stop and report if source code does not match this task.
- Use exactly the paths listed in Allowed changed files.
- Do not create alternative filenames.
- If another file must be changed, stop and ask first.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. ...
2. ...
3. ...

## Rollback

If the task fails midway before commit:

git status --short
git restore <file>

If changes are broad and unsafe:

git restore .

Do not use git reset --hard unless explicitly approved.

## Docs to update

- docs/SESSION_HANDOFF.md
- docs/DECISION_LOG.md if ADR is needed

## Suggested commit message

<commit message>
