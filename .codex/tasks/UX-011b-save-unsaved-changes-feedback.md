# Task ID: UX-011b-save-unsaved-changes-feedback

## Task name

Improve save success and unsaved changes feedback

## Estimated effort

Medium / 2-3 hours

## Dependencies

- UX-011a-ai-error-loading-retry-feedback

## Goal

Give users clear feedback after Save, Generate, and Apply actions, and reduce accidental loss of local changes without building a full undo/redo engine.

## Definition of Done

- [ ] Save/Generate/Apply success feedback is present where missing.
- [ ] Unsaved changes warning, discard, or restore-last-saved behavior is added where feasible.
- [ ] Existing persistence behavior remains unchanged.
- [ ] No full undo/redo engine is introduced.
- [ ] Artifact stale marking remains correct.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- `src/components/task-register/ProcessTaskRegister.tsx`
- `src/components/template-library/TemplateLibraryEditor.tsx`
- `src/components/input-brief/AIInputBriefPanel.tsx`
- `src/components/qa-panel/QAPanel.tsx`
- `src/components/export-center/ExportCenter.tsx`

## Files expected to change

- `src/components/task-register/ProcessTaskRegister.tsx`
- `src/components/template-library/TemplateLibraryEditor.tsx`
- Optional: `src/components/input-brief/AIInputBriefPanel.tsx`
- Optional: `src/components/qa-panel/QAPanel.tsx`
- Optional: `src/components/export-center/ExportCenter.tsx`
- `docs/SESSION_HANDOFF.md`

## Allowed changed files

- `src/components/task-register/ProcessTaskRegister.tsx`
- `src/components/template-library/TemplateLibraryEditor.tsx`
- `src/components/input-brief/AIInputBriefPanel.tsx`
- `src/components/qa-panel/QAPanel.tsx`
- `src/components/export-center/ExportCenter.tsx`
- `docs/SESSION_HANDOFF.md`

## Implementation instructions

1. Inspect current save/generate/apply messages.
2. Add missing success feedback with concise user-facing text.
3. Add unsaved changes warning or discard/restore-last-saved option where feasible.
4. Prefer minimal local state over broad persistence refactors.
5. Preserve localStorage keys and behavior.
6. Preserve artifact stale marking after source changes.
7. Update `docs/SESSION_HANDOFF.md`.

## Edge cases to handle

- User refreshes with unsaved PTR changes.
- User resets while unsaved template edits exist.
- AI recommendation apply may update PTR and mark artifacts stale.
- Avoid double-saving or duplicate messages.

## Constraints

- Do not build a full undo/redo engine.
- Do not change data schemas.
- Do not add dependencies.
- Do not change AI apply safety rules.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Edit PTR and observe unsaved/saved feedback.
2. Save, refresh, and confirm data persists.
3. Edit Template Library and confirm feedback.
4. Generate/apply a safe recommendation and confirm success message.
5. Confirm stale statuses update as before.

## Rollback

If the task fails before commit:

```powershell
git status --short
git restore src/components/task-register/ProcessTaskRegister.tsx src/components/template-library/TemplateLibraryEditor.tsx src/components/input-brief/AIInputBriefPanel.tsx src/components/qa-panel/QAPanel.tsx src/components/export-center/ExportCenter.tsx docs/SESSION_HANDOFF.md
```

## Suggested commit message

Improve save and unsaved changes feedback
