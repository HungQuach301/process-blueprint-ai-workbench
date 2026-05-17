# Task ID: 016-data-service-abstraction

## Task name

Add DataService abstraction

## Estimated effort

Medium / 2-4 hours

## Dependencies

- 015-release-hardening

## Goal

Add a small `DataService` interface and `LocalDataService` implementation as a foundation for future storage work. Do not refactor all localStorage usage at once.

## Definition of Done

- [ ] `DataService` interface exists.
- [ ] `LocalDataService` implementation exists.
- [ ] Interface covers get/set/remove JSON helpers.
- [ ] No database is introduced.
- [ ] Existing app behavior remains unchanged.
- [ ] Broad storage refactor is not performed.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- src/components/task-register/ProcessTaskRegister.tsx
- src/components/export-center/ExportCenter.tsx
- src/components/template-library/TemplateLibraryEditor.tsx
- src/lib/models/workspace.ts

## Files expected to change

- src/lib/data/data-service.ts
- Optional: src/lib/data/index.ts
- docs/SESSION_HANDOFF.md

## Implementation instructions

1. Create `src/lib/data/data-service.ts`.
2. Define interface for local JSON read/write/remove with typed generics.
3. Implement browser-safe `LocalDataService`.
4. Do not migrate existing components unless one tiny usage is needed as proof and explicitly scoped.
5. No database or server persistence.

## Edge cases to handle

- Window/localStorage unavailable.
- Invalid JSON in storage.
- Storage write failure.
- Default fallback values.

## Constraints

- No database.
- Do not refactor all storage at once.
- Do not change app behavior.
- Do not add dependencies.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Confirm existing task register save/refresh still works if touched.
2. Confirm TypeScript and build pass.
3. Confirm no broad component churn.

## Rollback

If the task fails before commit:

git status --short
git restore src/lib/data/data-service.ts src/lib/data/index.ts

## Docs to update

- docs/SESSION_HANDOFF.md

## Suggested commit message

Add local DataService abstraction
