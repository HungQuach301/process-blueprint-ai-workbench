# User-Facing Readiness Check

## Summary

Date: 2026-05-17

Branch: `feature/quality-gate-overhaul`

Task: `UX-012-user-facing-regression-check`

Result: Ready for User Gate 1 with documented residual risks.

This check verifies the User-Facing Readiness Sprint after `UX-000` through
`UX-011c`. It is documentation-only and does not change application behavior,
AI behavior, D01/D02 generator core, schemas, dependencies, or storage keys.

## Inputs Reviewed

- `.codex/TASK_QUEUE.md`
- `.codex/tasks/UX-*.md`
- `docs/SESSION_HANDOFF.md`
- `docs/USER_GATE_1_GUIDE.md`
- `docs/MILESTONE_1_TECHNICAL_STATUS.md`
- `src/app/api/ai/run-skill/route.ts`
- `src/components/`
- Source evidence for Input Brief, provider normalizer, Gate Verdict, QA, D01,
  D02, Export Center, and Local workspace backup/restore paths.

## UX Readiness Task Status

| Task | Status | Check summary |
| --- | --- | --- |
| `UX-000-milestone-1-technical-status-check` | Pass | `docs/MILESTONE_1_TECHNICAL_STATUS.md` exists and summarizes Milestone 1 status, integration checks, dependencies, and risks. |
| `UX-001-ai-connection-user-friendly-status` | Pass | AI Connection Center was updated with business-friendly status and advanced diagnostics per handoff. |
| `UX-002-dashboard-getting-started` | Pass | App shell includes a Getting Started flow for Input Brief, Draft PTR, Quality Check, and Export. |
| `UX-003-input-brief-validation-behavior` | Pass | Input Brief delays blocking validation display until generation attempt and preserves draft preview/apply. |
| `UX-004-ptr-simple-mode-business-columns` | Pass | PTR Simple Mode focuses on business-review columns while Advanced Mode keeps technical fields. |
| `UX-004b-technical-term-tooltips` | Pass | Technical PTR terms have concise help text/tooltips where visible. |
| `UX-005-qa-panel-user-facing-cleanup` | Pass | QA Panel separates read-only Findings from actionable Recommendations. |
| `UX-006-bpmn-preview-readability` | Pass | D01 preview has readability controls and visible template/gate context. |
| `UX-007-blueprint-preview-scroll-affordance` | Pass | D02 preview has clearer horizontal navigation and status/gate context. |
| `UX-008-product-delivery-module-separation` | Pass with follow-up | Product Delivery is visually separated in Export Center; extraction into a dedicated component remains deferred. |
| `UX-009-export-center-simplification` | Pass | Export Center primary surface emphasizes readiness, ZIP, audit evidence, and collapsed preparation sections. |
| `UX-010-mixed-language-and-mock-label-cleanup` | Pass with follow-up | Primary mock/local wording was cleaned up; historical docs and some legacy strings still contain encoding artifacts. |
| `UX-011a-ai-error-loading-retry-feedback` | Pass | AI actions have loading/error/retry feedback where safe to rerun from current local payload. |
| `UX-011b-save-unsaved-changes-feedback` | Pass | PTR and Template Library have saved/unsaved feedback and discard/restore protections. |
| `UX-011c-workspace-backup-restore` | Pass | App shows Local workspace label; Export Center can export/import local workspace JSON with confirmation. |
| `UX-012-user-facing-regression-check` | Pass | This document captures the final readiness regression check. |

## Core Flow Check

Flow target:

```text
Input Brief
-> Draft PTR
-> Normalizer
-> Gate Verdict
-> QA
-> D01 BPMN
-> D02 Service Blueprint
-> Export ZIP
```

Check method:

- Source inspection for the full UI and generator path.
- Local HTTP check that `http://localhost:3000` responds with `200`.
- Server route smoke test for real OpenAI and mock/local fallback.
- Automated TypeScript/build checks.

### Flow Evidence

| Step | Evidence | Result |
| --- | --- | --- |
| Input Brief -> Draft PTR | `src/components/input-brief/AIInputBriefPanel.tsx` calls `/api/ai/run-skill`, stores draft preview, and requires explicit Replace/Append apply. | Pass |
| Draft PTR Gate Verdict | `AIInputBriefPanel.tsx` computes `runDraftPtrGateV1(draftMeta)` and `createSourceCoverageAdvisory(draftMeta)` for preview evidence. | Pass |
| Provider normalizer | `src/app/api/ai/run-skill/route.ts` normalizes provider output after JSON parse/repair and before schema validation. | Pass |
| QA | `src/components/task-register/ProcessTaskRegister.tsx` derives QA issues with `validateProcessTasks(tasks)` and renders `QAPanel`; findings stay read-only and recommendations keep preview/apply. | Pass |
| D01 BPMN | `src/components/bpmn-output/D01BpmnOutput.tsx` generates BPMN from `ProcessTask[]` and selected template, then runs `runD01PostGenerationGate`. | Pass |
| D02 Service Blueprint | `src/components/service-blueprint-output/D02ServiceBlueprintOutput.tsx` generates draw.io XML from `ProcessTask[]` and selected template, then runs `runD02PostGenerationGate`. | Pass |
| Export ZIP | `src/components/export-center/ExportCenter.tsx` builds artifacts from PTR/templates/QA, marks statuses fresh, and downloads ZIP through `downloadZip`. | Pass by source inspection |

## Real AI Provider Check

OpenAI provider status:

- Server environment indicates `AI_PROVIDER=openai`.
- Real AI feature flag is enabled for general skills.
- OpenAI server key is present; the value was not documented.
- QA and Template Review real-AI flags are disabled, so those paths are expected to use local/mock fallback unless explicitly reconfigured.

Real OpenAI smoke test:

- Endpoint: `POST http://localhost:3000/api/ai/run-skill`
- Skill: `input-brief-to-ptr`
- Payload: non-sensitive demo SME onboarding brief.
- Result: external API was called, but the response returned `422`.
- Safe failure reason: provider output failed normalization before schema validation. The reported errors were missing required `DraftProcessTaskRegister` arrays: `draftProcessTasks`, `assumptions`, and `openQuestions`.
- Safety result: Pass. The app blocked invalid provider output instead of showing or applying it.
- Release risk: Medium. Real OpenAI prompt/output compliance needs a follow-up test/fix before presenting real AI as stable in User Gate 1.

Mock/local fallback smoke test:

- Endpoint: `POST http://localhost:3000/api/ai/run-skill`
- Skill: `input-brief-to-ptr`
- Provider override: `mock`
- Payload: same non-sensitive demo brief.
- Result: `ok=true`, `provider=mock`, `externalApiCalled=false`, `validationPassed=true`, `dataUsageMode=local-only`, `draftRows=7`.
- Fallback result: Pass.

## Manual UI Coverage

Completed:

- Confirmed app availability at `http://localhost:3000` with HTTP `200`.
- Source-inspected the full user-facing flow from Input Brief through Export Center.
- Verified route-level real AI safety behavior and mock/local fallback.

Limited or not completed in this run:

- No browser-driven click-through was performed for every UI control.
- D01 `.bpmn` was not opened in Camunda Modeler.
- D02 `.drawio` was not opened in diagrams.net.
- ZIP file contents were not manually unpacked in this run.

These are acceptable for this documentation task but should be repeated during User Gate 1 facilitation when external tools are available.

## Automated Checks

Required commands:

- `npx.cmd tsc --noEmit` - Pass
- `npm run build` - Pass

Build output confirmed the app compiles successfully and the route table includes
`/` and `/api/ai/run-skill`.

## Residual Risks

| Risk | Severity | Notes | Follow-up |
| --- | --- | --- | --- |
| OpenAI `input-brief-to-ptr` output failed normalization in smoke test. | Medium | Safety gate worked, but real provider output was not usable in this run. | Add a targeted provider prompt/normalizer regression task before real-AI User Gate demo. |
| Browser full-flow manual test was source-inspected, not fully clicked through. | Medium | App responded locally, but UI controls/downloads were not all exercised manually. | Run User Gate 1 checklist in a browser session before stakeholder demo. |
| External modelers unavailable in this run. | Low | In-app previews remain sufficient for initial gate, but external compatibility should still be checked. | Open `.bpmn` in Camunda Modeler and `.drawio` in diagrams.net when available. |
| Product Delivery remains visually separated but still implemented inside Export Center. | Low | UX-008 accepted the scoped fallback. | Extract a dedicated Product Delivery component in a future refactor. |
| Some historical docs and legacy strings contain encoding artifacts. | Low | Primary task outputs are usable; broader cleanup is outside UX-012. | Schedule a focused text/i18n cleanup pass. |
| Full Artifact Graph persistence is not implemented. | Medium | Product Delivery previews/exports are intentionally not durable graph nodes yet. | Keep this as a roadmap item for the Artifact Graph phase. |

## User Gate 1 Recommendation

Proceed with User Gate 1 in mock/local mode by default.

If demonstrating OpenAI:

- State that the current smoke test found provider-output compliance issues.
- Use only non-sensitive demo data.
- Keep the focus on server-side routing, validation, blocked invalid output, and no auto-apply behavior.
- Do not present real OpenAI generation quality as release-stable until the provider output issue is fixed.

Facilitator should use `docs/USER_GATE_1_GUIDE.md` and clearly repeat:

```text
AI creates drafts, recommendations, or review findings.
The user reviews and approves before apply or export.
Process Task Register remains the source of truth for process artifacts.
```

## Final Status

User-Facing Readiness Sprint is complete enough for controlled User Gate 1.

Primary recommended mode: mock/local.

Real AI status: server-side OpenAI path is configured and safely blocked invalid output in this run, but needs prompt/output compliance follow-up before being treated as stable demo behavior.
