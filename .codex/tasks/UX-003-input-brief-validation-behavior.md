# Task ID: UX-003-input-brief-validation-behavior

## Task name

Improve AI Input Brief validation timing

## Estimated effort

Small / 1-2 hours

## Dependencies

- UX-002-dashboard-getting-started

## Goal

Reduce first-use friction by showing progress and guidance before the first Generate attempt, while showing validation errors only after the user tries to generate.

## Definition of Done

- [ ] Validation errors appear only after the first Generate attempt.
- [ ] Progress or completion guidance is visible before validation attempt.
- [ ] Required field guidance remains discoverable.
- [ ] Draft generation, preview, quality gate, and explicit Apply behavior remain unchanged.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- `src/components/input-brief/AIInputBriefPanel.tsx`
- `src/lib/ai-intake/draft-ptr-schema.ts`
- `src/lib/quality-engine/ai-draft-quality-gate.ts`
- `docs/AI_INPUT_BRIEF_DESIGN.md`
- `docs/USER_GATE_1_GUIDE.md`

## Files expected to change

- `src/components/input-brief/AIInputBriefPanel.tsx`
- `docs/SESSION_HANDOFF.md`

## Allowed changed files

- `src/components/input-brief/AIInputBriefPanel.tsx`
- `docs/SESSION_HANDOFF.md`

## Implementation instructions

1. Inspect current validation state and Generate handler.
2. Add or reuse a `hasAttemptedGenerate` style state if needed.
3. Before first attempt, show progress/completion hints instead of error blocks.
4. After first attempt, show validation errors normally.
5. Preserve route calls, schema validation, gate verdict, draft preview, Replace/Append Apply, and stale marking behavior.
6. Update `docs/SESSION_HANDOFF.md`.

## Edge cases to handle

- Existing saved brief may already be valid.
- Clearing/resetting the form should reset validation attempt state if appropriate.
- File/chat draft flows should not be broken by manual brief validation changes.

## Constraints

- Do not change AI route behavior.
- Do not change schema validation rules.
- Do not auto-apply AI output.
- No dependencies.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Open AI Input Brief with empty fields.
2. Confirm no scary validation errors appear before Generate.
3. Click Generate and confirm required validation appears.
4. Fill valid data and confirm Draft PTR preview still works.
5. Confirm Apply remains explicit Replace/Append.

## Rollback

If the task fails before commit:

```powershell
git status --short
git restore src/components/input-brief/AIInputBriefPanel.tsx docs/SESSION_HANDOFF.md
```

## Suggested commit message

Improve Input Brief validation timing
