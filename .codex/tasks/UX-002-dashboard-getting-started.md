# Task ID: UX-002-dashboard-getting-started

## Task name

Add dashboard Getting Started section

## Estimated effort

Small / 1-2 hours

## Dependencies

- UX-010-mixed-language-and-mock-label-cleanup

## Goal

Give first-time users a clear starting path through the core workflow.

## Definition of Done

- [ ] Dashboard or first screen includes a Getting Started / Bắt đầu từ đây section.
- [ ] Four steps are shown: Input Brief, Draft PTR, Quality Check, Export.
- [ ] Steps link or guide users to the relevant module where feasible.
- [ ] Copy is understandable for non-technical users.
- [ ] Existing navigation behavior remains unchanged unless a small scoped improvement is needed.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- `src/app/page.tsx`
- `src/components/AppShell.tsx`
- `src/components/Navigation.tsx`
- `src/components/layout/SessionFrame.tsx`
- `docs/USER_GATE_1_GUIDE.md`

## Files expected to change

- `src/app/page.tsx`
- Optional: `src/components/AppShell.tsx`
- Optional: `src/components/Navigation.tsx`
- `docs/SESSION_HANDOFF.md`

## Allowed changed files

- `src/app/page.tsx`
- `src/components/AppShell.tsx`
- `src/components/Navigation.tsx`
- `docs/SESSION_HANDOFF.md`

## Implementation instructions

1. Inspect how the app chooses the first visible screen.
2. Add a compact Getting Started / Bắt đầu từ đây section.
3. Show four steps: Input Brief, Draft PTR, Quality Check, Export.
4. Use clear, non-technical copy and avoid marketing-style hero content.
5. If module navigation callbacks already exist, wire step actions narrowly; otherwise use visual guidance only.
6. Update `docs/SESSION_HANDOFF.md`.

## Edge cases to handle

- The app may not have a separate dashboard route.
- Avoid creating a landing page that blocks the actual product workflow.
- Do not duplicate navigation if the sidebar already handles this clearly.

## Constraints

- Do not add dependencies.
- Do not change AI behavior.
- Do not change generation or export logic.
- Keep UI concise.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Open `http://localhost:3000`.
2. Confirm first-time path is clear.
3. Confirm users can still access all existing modules.
4. Confirm no layout overlap on desktop and narrow viewport.

## Rollback

If the task fails before commit:

```powershell
git status --short
git restore src/app/page.tsx src/components/AppShell.tsx src/components/Navigation.tsx docs/SESSION_HANDOFF.md
```

## Suggested commit message

Add dashboard getting started flow
