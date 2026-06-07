# Task ID: UX-011c-workspace-backup-restore

## Task name

Add local workspace backup and restore

## Estimated effort

Medium / 3-5 hours

## Dependencies

- UX-011b-save-unsaved-changes-feedback
- 016-data-service-abstraction if available

## Goal

Give local-first users a simple way to identify, export, and restore their local workspace without introducing a server or database.

## Definition of Done

- [ ] UI shows a clear Local workspace label.
- [ ] User can export workspace JSON.
- [ ] User can import workspace JSON.
- [ ] Import/export success and error feedback is user-friendly.
- [ ] No server/database persistence is added.
- [ ] Existing localStorage behavior remains compatible.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- `src/components/AppShell.tsx`
- `src/components/export-center/ExportCenter.tsx`
- `src/components/task-register/ProcessTaskRegister.tsx`
- `src/components/template-library/TemplateLibraryEditor.tsx`
- `src/lib/data/data-service.ts`
- `src/lib/models/workspace.ts`

## Files expected to change

- `src/components/AppShell.tsx`
- `src/components/export-center/ExportCenter.tsx`
- Optional: `src/lib/workspace/local-workspace-backup.ts`
- Optional: `src/lib/data/index.ts`
- `docs/SESSION_HANDOFF.md`

## Allowed changed files

- src/components/AppShell.tsx
- src/components/export-center/ExportCenter.tsx
- src/lib/workspace/*
- src/lib/data/index.ts
- docs/SESSION_HANDOFF.md

## Implementation instructions

1. Inspect current localStorage keys used by PTR, templates, selected templates, generated D01/D02 XML/status, input brief, and audit/export state.
2. Add a clear Local workspace label in a small, non-intrusive place.
3. Implement workspace JSON export using existing local data only.
4. Implement workspace JSON import with validation of expected shape and safe user confirmation.
5. Use `LocalDataService` if it helps keep storage access small and browser-safe.
6. Do not introduce server persistence, account features, database, or background sync.
7. Update `docs/SESSION_HANDOFF.md`.

## Edge cases to handle

- Invalid JSON import.
- Missing optional keys in backup.
- Import from older backup format.
- Browser localStorage unavailable or write failure.
- User should receive clear success/error feedback.

## Constraints

- Local-only backup/restore.
- No server/database.
- No dependencies.
- Do not change ProcessTask schema.
- Do not auto-send workspace data externally.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Open app and confirm Local workspace label is visible.
2. Export workspace JSON.
3. Modify PTR or templates.
4. Import the previous workspace JSON.
5. Confirm restored data appears after refresh.
6. Try invalid JSON and confirm friendly error.

## Rollback

If the task fails before commit:

```powershell
git status --short
git restore src/components/AppShell.tsx src/components/export-center/ExportCenter.tsx src/lib/data/index.ts docs/SESSION_HANDOFF.md
if (Test-Path src/lib/workspace/local-workspace-backup.ts) { Remove-Item -LiteralPath src/lib/workspace/local-workspace-backup.ts }
```

## Suggested commit message

Add local workspace backup and restore

