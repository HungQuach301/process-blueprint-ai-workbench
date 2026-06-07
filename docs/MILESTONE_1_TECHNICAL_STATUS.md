# Milestone 1 Technical Status

## Summary

Milestone 1 is technically complete enough to enter the User-Facing Readiness Sprint.

Evidence sources:

- `.codex/TASK_QUEUE.md`
- `.codex/tasks/`
- `docs/SESSION_HANDOFF.md`
- `docs/CODE_AUDIT_REPORT.md`
- `docs/USER_GATE_1_GUIDE.md`

Current branch:

- `feature/quality-gate-overhaul`

Release target:

- `v0.8.0-mvp1-ai`

Current product phase:

- Complete Module 2 + Module 3 with full real AI support.

## Status Legend

- `done`: Task is marked complete in the task queue and has handoff or artifact evidence.
- `partial`: Task has evidence gaps or known incomplete follow-up within the original scope.
- `pending`: Task has not been completed.

## Milestone 1 Task Status

| Task | Status | Evidence |
| --- | --- | --- |
| `000-source-code-audit` | done | `docs/CODE_AUDIT_REPORT.md` exists and identifies model, QA, AI route, generator, Product Delivery, Generate All, and test framework entry points. |
| `001-qafinding-schema` | done | `docs/SESSION_HANDOFF.md` records `src/lib/qa/qa-finding.ts` with `QAFinding`, `QAFindingSet`, validation, summary, and merge helpers. |
| `002-rule-qa-to-findings` | done | Handoff records `src/lib/qa/rule-qa-to-findings.ts` converting Rule QA `QaIssue[]` into `QAFindingSet` without changing Rule QA or recommendations. |
| `003-ai-qa-finding-skill` | done | Handoff records `ai-process-qa-finding` skill, prompt/schema support, and mock/local route support for findings only. |
| `004-qa-panel-split` | done | Handoff records QA Panel split between read-only Findings and actionable Recommendations with preview/apply preserved. |
| `005-gateverdict-framework` | done | Handoff records shared `GateVerdict` framework exported from the quality engine. |
| `006a-draft-ptr-gate-v1` | done | Handoff records Draft PTR Gate v1 across five dimensions: schema completeness, flow integrity, gateway safety, actor/system coverage, and decomposition quality. |
| `006b-wire-draft-ptr-gate-ui` | done | Handoff records Draft PTR preview UI showing GateVerdict status, blockers, warnings, and advanced breakdown while keeping explicit Apply. |
| `007-source-coverage-advisory` | done | Handoff records non-blocking Source Coverage advisory shown separately from GateVerdict. |
| `008-draft-ptr-golden-tests` | done | Handoff records deterministic Draft PTR gate/source coverage fixtures and `scripts/test-draft-ptr-gate.ps1`. |
| `009a-provider-normalizer` | done | Handoff records pure provider output normalizer helper with wrapped payload handling, aliases, warnings, and unsafe reference errors. |
| `009b-wire-normalizer-route` | done | Handoff records provider-backed `/api/ai/run-skill` normalizer wiring after parse/repair and before schema validation, with mock/local unchanged. |
| `010-normalizer-golden-tests` | done | Handoff records deterministic normalizer golden fixtures and `scripts/test-provider-normalizer.ps1`. |
| `011-d01-pre-gate` | done | Handoff records pure D01 pre-generation gate returning `GateVerdict`; UI wiring deferred and BPMN generator core unchanged. |
| `012-d02-pre-gate` | done | Handoff records pure D02 pre-generation gate returning `GateVerdict`; D02 generator core unchanged. |
| `013a-xml-parser-strategy` | done | Handoff records `docs/XML_PARSER_STRATEGY.md`, existing dependency review, and rejection of regex-only XML validation. |
| `013b-d01-post-gen-gate` | done | Handoff records pure D01 post-generation gate for BPMN XML structure without mutating XML or generator core. |
| `013c-d02-post-gen-gate` | done | Handoff records pure D02 post-generation gate for draw.io XML structure, card patterns, and layout risks without mutating XML or generator core. |
| `013d-wire-post-gates-ui` | done | Handoff records D01/D02 UI post-generation verdicts and download disabling only on fail. |
| `014-chain-resilience-types` | done | Handoff records type-only chain resilience foundations with no Product Delivery chain wiring. |
| `015-release-hardening` | done | Handoff records release hardening report, TypeScript/build/script checks, and scoped source inspection. |
| `016-data-service-abstraction` | done | Handoff records `DataService`, browser-safe `LocalDataService`, and stable data export path with no storage refactor. |
| `017-user-gate-1-preparation` | done | `docs/USER_GATE_1_GUIDE.md` exists with 30-45 minute demo flow, feedback prompts, known limitations, and human-in-the-loop messaging. |

## Integration Check Status

| Check | Status | Evidence |
| --- | --- | --- |
| `INT-01-qa-flow-integration-check` | done | Handoff records QA findings/recommendations flow verification and `docs/QA_FLOW_CHECK.md`. |
| `INT-02-draft-ptr-gate-integration-check` | done | Handoff records Draft PTR Gate + Source Coverage advisory verification and `docs/DRAFT_PTR_GATE_CHECK.md`. |
| `INT-03-ai-route-normalizer-integration-check` | done | Handoff records AI route normalizer source inspection, mock/local smoke test, and `docs/AI_ROUTE_NORMALIZER_CHECK.md`. |

## User-Facing Readiness Sprint Dependencies

The next sprint should keep UX tasks small and scoped. The recommended order is already reflected in `.codex/TASK_QUEUE.md`.

| UX task | Dependency notes |
| --- | --- |
| `UX-000-milestone-1-technical-status-check` | Starts from completed Milestone 1 technical baseline. |
| `UX-008-product-delivery-module-separation` | Depends on Export Center/Product Delivery state identified in `docs/CODE_AUDIT_REPORT.md`; must not change generation behavior. |
| `UX-009-export-center-simplification` | Depends on UX-008 so Export Center can focus on readiness/downloads after Product Delivery is separated or visually isolated. |
| `UX-010-mixed-language-and-mock-label-cleanup` | Should run early because later UX tasks should use user-facing labels consistently. |
| `UX-001-ai-connection-user-friendly-status` | Depends on UX-010 cleanup; should keep API-key trust message and move env details to Advanced. |
| `UX-004-ptr-simple-mode-business-columns` | Depends on language cleanup; should preserve `ProcessTask` schema and existing PTR behavior. |
| `UX-004b-technical-term-tooltips` | Depends on UX-004 so help text is added where terms remain visible. |
| `UX-002-dashboard-getting-started` | Can be implemented after label cleanup; should guide users through Input Brief, Draft PTR, Quality Check, Export. |
| `UX-003-input-brief-validation-behavior` | Depends on UX-002 and should preserve Draft -> Preview -> explicit Apply behavior. |
| `UX-005-qa-panel-user-facing-cleanup` | Depends on the findings/recommendations split from task `004`; must keep recommendation apply safety unchanged. |
| `UX-006-bpmn-preview-readability` | Depends on D01 gates and current preview UI; must not change BPMN generator core. |
| `UX-007-blueprint-preview-scroll-affordance` | Depends on D02 gates and current preview UI; must not change draw.io generator core. |
| `UX-011a-ai-error-loading-retry-feedback` | Should happen after label cleanup so loading/error copy is user-facing and safe. |
| `UX-011b-save-unsaved-changes-feedback` | Depends on UX-011a; should improve feedback without building full undo/redo. |
| `UX-011c-workspace-backup-restore` | Can reuse the `DataService` foundation from task `016`; must remain local-only. |
| `UX-012-user-facing-regression-check` | Final verification task after all UX readiness tasks are complete. |

## Known Technical Risks And Blockers

### Real AI

- Real provider flows are scaffolded and route-backed, but actual provider configuration may be absent in local/demo environments.
- Product AI endpoint contract is generic and still needs integration testing with the hosted service.
- Provider-specific Claude/OpenAI schema repair and contract tests remain limited; route-level malformed JSON repair exists.
- AI Connection Center per-skill override is stored as local UI preference and is not wired to server execution.
- Real AI must remain server-side only, schema-validated, previewed, and user-approved.

### Product Delivery

- Product Delivery BRD/SRS/story/criteria/scope/AI Coding Pack flows are preview/export oriented.
- Full Artifact Graph persistence is intentionally not part of this baseline.
- Product Delivery UI/state is still largely in `src/components/export-center/ExportCenter.tsx`, which motivates UX-008.
- Module 3 Jira export and scope/non-scope definition aliasing still need scoped follow-up tasks.

### Export Center

- Export Center currently carries both process artifact packaging and Product Delivery preview/export responsibilities.
- Generate All and ZIP behavior are sensitive because they touch artifact freshness and package contents.
- UX-009 should simplify the user-facing surface only after UX-008 separates or visually isolates Product Delivery generation.

### QA

- QA now has separate concepts: deterministic Rule QA issues, `QAFinding`, AI findings, and `QARecommendation`.
- Findings must stay read-only; recommendations must keep preview/confirmation/apply.
- Artifact review recommendations currently surface counts/warnings in D01/D02 panels; full handoff into QA Panel/Template Hub remains a scoped follow-up.

### D01/D02

- D01/D02 pre/post gates exist and UI shows post-generation verdicts.
- Generator cores should remain unchanged during UX readiness work.
- External modelers such as Camunda Modeler and diagrams.net may be unavailable during demos; in-app preview must be sufficient.
- D02 wide diagrams still need better scroll affordance for user demos.

### User-Facing Language

- Handoff and older docs show mixed-language and encoding artifacts in some historical text.
- Main UI still needs cleanup of mock/local wording, missing-env wording, feature-flag exposure, and mojibake artifacts.
- Internal canonical keys, BPMN enum values, and provider ids should remain English and unchanged.

## Verification Notes

This task is documentation-only. It does not change application code, AI behavior, generator behavior, dependencies, localStorage behavior, or export behavior.

Required verification:

- Read this document end to end.
- Confirm tasks `000` through `017` are covered.
- Confirm UX sprint dependency notes are actionable.
- Run `npx.cmd tsc --noEmit`.
