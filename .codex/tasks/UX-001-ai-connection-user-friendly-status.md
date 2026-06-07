# Task ID: UX-001-ai-connection-user-friendly-status

## Task name

Make AI Connection status business-friendly

## Estimated effort

Small / 1-2 hours

## Dependencies

- UX-010-mixed-language-and-mock-label-cleanup

## Goal

Make the AI Connection Center understandable for non-technical users while keeping technical provider/env details available in Advanced.

## Definition of Done

- [ ] AI provider status uses business-friendly language.
- [ ] Env, model, feature flag, and provider diagnostic details are moved to Advanced or visually demoted.
- [ ] Trust message explains that API keys are not stored or exposed in browser code.
- [ ] Not configured and local analysis modes are clear.
- [ ] Test Connection remains server-side.
- [ ] No secrets are exposed.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Files to inspect first

- `src/components/ai-settings/AIProviderSettingsPanel.tsx`
- `src/app/api/ai/run-skill/route.ts`
- `src/lib/ai/providers/provider-factory.ts`
- `docs/AI_CONNECTION_SETUP.md`
- `docs/USER_GATE_1_GUIDE.md`

## Files expected to change

- `src/components/ai-settings/AIProviderSettingsPanel.tsx`
- `docs/SESSION_HANDOFF.md`

## Allowed changed files

- `src/components/ai-settings/AIProviderSettingsPanel.tsx`
- `docs/SESSION_HANDOFF.md`

## Implementation instructions

1. Review the AI Connection UI labels, badges, and helper text.
2. Replace technical status language with user-facing labels such as Local analysis, Ready, Not configured, Disabled, or Needs setup.
3. Keep env/model/feature-flag details inside an Advanced area.
4. Keep an explicit trust message: provider API keys stay server-side and are not exposed in browser code.
5. Preserve the existing Test Connection route call.
6. Do not change provider selection, env interpretation, feature flags, or route behavior.
7. Update `docs/SESSION_HANDOFF.md`.

## Edge cases to handle

- Provider may be unavailable because env is missing, feature flag is disabled, or local-only mode is forced.
- Non-technical users should know what to do next.
- Technical users still need diagnostics in Advanced.

## Constraints

- Do not expose secrets.
- Do not change server-side AI behavior.
- Do not add dependencies.
- Do not change AI auto-apply behavior.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Open AI Connection Center.
2. Confirm each provider card has a clear user-facing status.
3. Confirm Advanced contains technical details without dominating the main UI.
4. Click Test Connection and confirm behavior is unchanged.

## Rollback

If the task fails before commit:

```powershell
git status --short
git restore src/components/ai-settings/AIProviderSettingsPanel.tsx docs/SESSION_HANDOFF.md
```

## Suggested commit message

Make AI connection status user friendly
