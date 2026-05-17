# Task ID: UX-010-mixed-language-and-mock-label-cleanup

## Task name

Clean mixed language, mock labels, and encoding artifacts

## Estimated effort

Medium / 2-4 hours

## Dependencies

- UX-000-milestone-1-technical-status-check

## Goal

Make the main UI safer and clearer for real users by replacing technical/mock labels, hiding feature flags from primary UI, and fixing obvious encoding artifacts.

## Definition of Done

- [ ] User-facing `Mock` labels are replaced with `Local analysis` or `Phan tich cuc bo` / `Phân tích cục bộ` where appropriate.
- [ ] User-facing `Missing env` labels are replaced with `Not configured` or `Chưa cấu hình`.
- [ ] Feature flags are hidden from main UI and moved to Advanced if still needed.
- [ ] Source is checked for encoding artifacts: `Ä`, `Ã`, `Â`, `�`, `â€`, `â€™`.
- [ ] Obvious mixed-language and encoding issues in main screens are fixed.
- [ ] No AI behavior is changed.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- `src/components/`
- `src/app/`
- `src/lib/i18n`
- `docs/USER_GATE_1_GUIDE.md`

## Files expected to change

- `src/components/ai-settings/AIProviderSettingsPanel.tsx`
- `src/components/input-brief/AIInputBriefPanel.tsx`
- `src/components/qa-panel/QAPanel.tsx`
- `src/components/template-library/TemplateLibraryEditor.tsx`
- `src/components/export-center/ExportCenter.tsx`
- Optional: `src/components/Navigation.tsx`
- Optional: `src/components/AppShell.tsx`
- Optional: `src/lib/i18n/*`
- `docs/SESSION_HANDOFF.md`

## Allowed changed files

- `src/components/ai-settings/AIProviderSettingsPanel.tsx`
- `src/components/input-brief/AIInputBriefPanel.tsx`
- `src/components/qa-panel/QAPanel.tsx`
- `src/components/template-library/TemplateLibraryEditor.tsx`
- `src/components/export-center/ExportCenter.tsx`
- `src/components/Navigation.tsx`
- `src/components/AppShell.tsx`
- `src/lib/i18n/*`
- `docs/SESSION_HANDOFF.md`

## Implementation instructions

1. Use `rg "Mock|Missing env|ENABLE_|Ä|Ã|Â|�|â€|â€™" src/components src/app src/lib/i18n`.
2. Replace primary user-facing `Mock` with business-friendly local-mode wording.
3. Replace `Missing env` with `Not configured` or `Chưa cấu hình`.
4. Move feature flag and env details to Advanced surfaces where already available.
5. Fix obvious mojibake/encoding artifacts in main screens.
6. Keep internal ids, enum values, provider ids, and environment variable names unchanged.
7. Update `docs/SESSION_HANDOFF.md`.

## Edge cases to handle

- Do not rename provider ids or route payload values.
- Some technical strings may appear in JSON previews or advanced debug views; keep them if they are intentionally technical.
- Do not do a broad i18n refactor.
- Avoid changing tests or generated artifacts.

## Constraints

- No behavior changes.
- No dependency changes.
- Do not expose secrets.
- Do not change AI route behavior.
- Keep canonical internal keys in English.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Open the main app screens.
2. Confirm local/mock status is understandable to non-technical users.
3. Confirm not-configured provider states are clear.
4. Confirm no mojibake appears in main visible UI.
5. Confirm Advanced still exposes technical details where appropriate.

## Rollback

If the task fails before commit:

```powershell
git status --short
git restore src/components/ai-settings/AIProviderSettingsPanel.tsx src/components/input-brief/AIInputBriefPanel.tsx src/components/qa-panel/QAPanel.tsx src/components/template-library/TemplateLibraryEditor.tsx src/components/export-center/ExportCenter.tsx src/components/Navigation.tsx src/components/AppShell.tsx docs/SESSION_HANDOFF.md
```

## Suggested commit message

Clean user-facing AI labels and encoding artifacts
