# MVP1-AI Stable Release Check

## Scope

Task `015-release-hardening` verifies the MVP1-AI Stable scope without adding new features.

Checked areas:

- QA findings and recommendations flow.
- Draft PTR gate and source coverage advisory flow.
- AI route provider output normalizer flow.
- D01/D02 pre-generation and post-generation gates.
- D01/D02 output UI download blocking on failed post-generation verdicts.
- Export Center Generate All and ZIP source paths.

## Automated Checks

| Check | Result | Notes |
| --- | --- | --- |
| `npx.cmd tsc --noEmit` | Pass | TypeScript completed without errors. |
| `npm run build` | Pass | Next build completed successfully. |
| `scripts/test-draft-ptr-gate.ps1` | Pass | Golden fixture presence and type-check completed. |
| `scripts/test-provider-normalizer.ps1` | Pass | Golden fixture presence and type-check completed. |

## Source Inspection Results

### QA Findings And Recommendations

Result: Pass by source inspection.

- `src/components/qa-panel/QAPanel.tsx` derives read-only Rule QA findings via `qaIssuesToFindingSet`.
- AI findings are merged through `mergeFindingSets`.
- Findings remain separate from recommendations and have no apply buttons.
- Existing recommendation preview/apply and batch preview logic remains in place through `previewRecommendationBatch`, `confirmSingleRecommendation`, and `confirmBatchRecommendations`.

### Draft PTR Gate And Advisory

Result: Pass by source inspection and golden fixture check.

- `src/components/input-brief/AIInputBriefPanel.tsx` validates AI output with `validateDraftProcessTaskRegister`.
- Draft PTR Gate v1 is shown through `runDraftPtrGateV1`.
- Source coverage advisory is shown through `createSourceCoverageAdvisory`.
- Source coverage remains advisory-only and separate from gate blockers.
- Apply remains explicit through Replace or Append actions.

### AI Route Normalizer

Result: Pass by source inspection and golden fixture check.

- Prior integration documented provider-backed normalization after parse/repair and before schema validation.
- Golden fixtures for provider output normalizer are present and type-check successfully.
- Real provider execution was not run because release hardening should not call external providers without explicit runtime configuration and approval.

### D01/D02 Gates

Result: Pass by source inspection and build/type-check.

- D01 and D02 pre-generation gates remain exported from `src/lib/quality-engine/index.ts`.
- D01 and D02 post-generation gates remain exported from `src/lib/quality-engine/index.ts`.
- `D01BpmnOutput` runs `runD01PostGenerationGate` after XML generation and disables `.bpmn` download only when verdict is `fail`.
- `D02ServiceBlueprintOutput` runs `runD02PostGenerationGate` after XML generation and disables `.drawio` download only when verdict is `fail`.
- D01/D02 generator core files were not changed.

### Export Center

Result: Pass by source inspection and build/type-check.

- `ExportCenter` still generates process artifacts from `ProcessTask[]` and selected templates.
- D01 uses `generateBpmnXml`.
- D02 uses `generateServiceBlueprintDrawioXml`.
- QA Report uses `validateProcessTasks` and `generateQaReportMarkdown`.
- ZIP packaging still uses `JSZip`.
- Product Delivery draft generation remains deterministic through `generateProductDeliveryDraft`.

## Manual Browser Regression

Not executed in a live browser during this task.

Reason:

- This hardening pass used source inspection, TypeScript, Next build, and existing no-dependency verification scripts.
- No Playwright or browser automation script is configured in `package.json`.
- Real AI environment/provider execution was not attempted.

Recommended manual follow-up before tagging release:

1. Open `http://localhost:3000`.
2. QA: create a known issue, confirm issue count changes, click issue highlight, download QA Report.
3. AI Input Brief: generate Draft PTR in mock/local mode, confirm gate/advisory display, Replace/Append only after review.
4. D01: generate BPMN, confirm preview renders, confirm post-generation verdict, download `.bpmn` when verdict is not fail.
5. D02: generate Service Blueprint, confirm preview renders, confirm post-generation verdict, download `.drawio` when verdict is not fail.
6. Export Center: Generate All, confirm statuses, download ZIP, confirm expected files.

## Follow-Up Issues

No P0/P1 regression was found during this hardening pass.

Residual risks:

- Browser-only UI interactions still need hands-on verification before a release tag.
- Provider-backed Real AI paths require configured server-side provider env and explicit approval before live verification.

