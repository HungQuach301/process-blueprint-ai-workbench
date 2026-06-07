# Source Code Audit Report

## 1. Current Branch And Working Tree Status

- Audit date: 2026-05-17.
- Current branch: `feature/quality-gate-overhaul`.
- `git status --short` before audit:
  - `?? .codex/`
  - `?? scripts/`
- Note: `.codex/` and `scripts/` are untracked task-orchestration files present before this audit. No app source files were changed for this task.

## 2. ProcessTask Model File

- Primary model: `src/lib/models/process-task.ts`.
- Key exports:
  - `RowType` at line 1.
  - `BpmnType` at line 12.
  - `TaskNature` at line 29.
  - `ProcessTask` interface at line 87.
- This is the canonical process row model used by the task register, rule QA, D01 BPMN, D02 Service Blueprint, Product Delivery, and AI skill payloads.

## 3. TemplateProfile Model File

- Primary model: `src/lib/models/template-profile.ts`.
- Key exports:
  - Template enum-like types from line 1 onward.
  - `TemplateProfile` interface at line 49.
- Main consumers:
  - D01 BPMN generator: `src/lib/generators/bpmn-generator.ts`.
  - D02 Service Blueprint generator: `src/lib/generators/drawio-service-blueprint-generator.ts`.
  - Template Hub UI: `src/components/template-library/TemplateLibraryEditor.tsx`.

## 4. QARecommendation Schema File

- Runtime AI QA recommendation validation: `src/lib/recommendation-engine/qa-recommendation-schema.ts`.
- Canonical recommendation types: `src/lib/recommendation-engine/types.ts`.
- Key exports:
  - `QARecommendation` type at `src/lib/recommendation-engine/types.ts:150`.
  - `QARecommendationOperation` type at `src/lib/recommendation-engine/types.ts:72`.
  - `validateAIQARecommendations` at `src/lib/recommendation-engine/qa-recommendation-schema.ts:223`.
- Important behavior:
  - Graph-changing operation kinds are recognized in `qa-recommendation-schema.ts` around line 38.
  - AI recommendations are normalized in `normalizeAIRecommendation` around line 200.
  - Validation checks valid target step ids, operation shape, graph-changing risk, confidence, impact, and source constraints.

## 5. Rule QA Entry Point

- Primary rule QA entry point: `src/lib/qa/task-register-rules.ts`.
- Key exports:
  - `QaSeverity` at line 7.
  - `QaIssueCode` at line 9.
  - `QaIssue` at line 44.
  - `validateProcessTasks(tasks: ProcessTask[]): QaIssue[]` at line 157.
- Rule QA also creates rule recommendations through `createRuleRecommendationsForIssue` from `src/lib/recommendation-engine/recommendation-factory.ts`.

## 6. Draft PTR Quality Gate Entry Point

- Primary Draft PTR quality gate file: `src/lib/quality-engine/ai-draft-quality-gate.ts`.
- Barrel export: `src/lib/quality-engine/index.ts`.
- Key exports:
  - `QualityGateResult` at line 30.
  - `runBriefQualityGate` at line 69.
  - `runDraftProcessTaskRegisterQualityGate` at line 125.
- Draft PTR schema validation lives separately in `src/lib/ai-intake/draft-ptr-schema.ts`, with `validateDraftProcessTaskRegister` at line 182.

## 7. `/api/ai/run-skill/route.ts` Flow

- Route file: `src/app/api/ai/run-skill/route.ts`.
- Runtime: `nodejs`.
- Main route entry point: `POST(request: Request)` at line 2926.
- High-level flow:
  1. Parse request JSON.
  2. Handle `action === "test-connection"` without calling external providers.
  3. Validate `skillId` and `payload`.
  4. Map legacy route skill ids to Registry V2 ids through `getRegistrySkillId`.
  5. Load skill definition from `src/lib/ai/skill-registry-v2.ts`.
  6. Resolve selected provider from server env or request override.
  7. Run route-specific input checks.
  8. Run `validateAISkillInput` from `src/lib/ai/skill-schemas.ts`.
  9. Use mock/local response when real AI is disabled, provider is `mock`, data mode is `local-only`, or provider env is missing.
  10. For provider-backed execution, create provider messages, call the configured provider with timeout, parse/repair JSON, validate output schema, run quality gates, normalize result, and return previewable output.
  11. Record safe audit metadata with no full prompt or full model output.

## 8. Provider Output Parse / Validate / Repair Location

- Provider response type and helpers: `src/lib/ai/providers/provider-types.ts`.
  - `AIProviderResponse` at line 19.
  - `extractJsonText` at line 42.
  - `parseJsonIfPossible` at line 59.
- Provider factory: `src/lib/ai/providers/provider-factory.ts`.
  - `createConfiguredAIProvider` selects mock, Product AI, OpenAI, or Claude from server env.
- Route parsing and repair:
  - `parseProviderJson` in `src/app/api/ai/run-skill/route.ts` around line 357.
  - `createRepairMessages` around line 374.
  - `parseProviderJsonWithOptionalRepair` around line 501.
  - Repair is one scoped provider call that asks for valid JSON only and does not add facts.
- Schema validation:
  - `validateAISkillInput` in `src/lib/ai/skill-schemas.ts:446`.
  - `validateAISkillOutput` in `src/lib/ai/skill-schemas.ts:682`.

## 9. D01 Generator And UI Component

- Generator: `src/lib/generators/bpmn-generator.ts`.
- Key functions:
  - `getBpmnTag` at line 132.
  - `buildNodes` at line 270.
  - `buildSequenceFlows` at line 298.
  - `generateBpmnXml` at line 798.
- UI component: `src/components/bpmn-output/D01BpmnOutput.tsx`.
- Key UI flow:
  - Reads `ProcessTask[]` from local storage or sample data.
  - Reads selected D01 `TemplateProfile`.
  - Calls `generateBpmnXml`.
  - Supports read-only AI artifact review via `/api/ai/run-skill` with `artifact-review`.

## 10. D02 Generator And UI Component

- Generator: `src/lib/generators/drawio-service-blueprint-generator.ts`.
- Key functions:
  - `getTemplateRows` at line 370.
  - `getPhases` at line 392.
  - `mapTaskToRow` at line 398.
  - `buildCardCells` at line 668.
  - `generateServiceBlueprintDrawioXml` at line 837.
- UI component: `src/components/service-blueprint-output/D02ServiceBlueprintOutput.tsx`.
- Key UI flow:
  - Reads `ProcessTask[]` and selected D02 `TemplateProfile`.
  - Calls `generateServiceBlueprintDrawioXml`.
  - Supports read-only AI artifact review via `/api/ai/run-skill` with `artifact-review`.

## 11. Product Delivery Generation / State File

- Canonical Product Delivery model and validators: `src/lib/models/product-delivery.ts`.
- Deterministic Product Delivery generator: `src/lib/generators/product-delivery-generator.ts`.
- Key generator exports:
  - `generateBRD` at line 342.
  - `generateSRS` at line 679.
  - `generateUserStorySet` at line 905.
  - `generateAcceptanceCriteriaSet` at line 984.
  - `generateProductScopeReview` at line 1189.
  - `generateProductDeliveryDraft` at line 1473.
- Key model quality gates:
  - `runUserStoryQualityGate` at `product-delivery.ts:634`.
  - `runAcceptanceCriteriaQualityGate` at `product-delivery.ts:702`.
  - `runProductScopeReviewQualityGate` at `product-delivery.ts:775`.
  - `runSRSQualityGate` at `product-delivery.ts:831`.
  - `runBRDQualityGate` at `product-delivery.ts:912`.
  - `runRequirementQualityCheck` at `product-delivery.ts:1083`.
- Primary UI state is in `src/components/export-center/ExportCenter.tsx`, including:
  - `productDeliveryDraft` state around line 310.
  - `productDeliveryContext`, `productDeliveryNotes`, and `productDeliveryFileText` state around lines 313-315.

## 12. Generate All Logic Location

- Main export center file: `src/components/export-center/ExportCenter.tsx`.
- Key functions:
  - `generateAllArtifacts` at line 821.
  - `downloadZip` at line 1499.
  - Product Delivery draft preview/export functions around lines 1570-1640.
  - Product Delivery AI Coding Pack preview/export functions around lines 1650-1915.
- `generateAllArtifacts` currently generates process artifacts from `ProcessTask[]` and selected templates, then generates deterministic Product Delivery draft state through `generateProductDeliveryDraft`.

## 13. Existing Test Framework

- `package.json` has scripts:
  - `dev`: `next dev`
  - `build`: `next build`
  - `start`: `next start`
- There is no dedicated `test`, `lint`, Jest, Vitest, or Playwright script in `package.json`.
- Current test-like source files are sample/golden data helpers, not executable test specs:
  - `src/lib/generators/bpmn-generator.test-data.ts`
  - `src/lib/generators/drawio-service-blueprint-generator.test-data.ts`
- Relevant required checks for this task:
  - `npx.cmd tsc --noEmit`
  - `npm run build`

## 14. Risks Before Implementing QAFinding / GateVerdict / Normalizer

- QA has multiple related shapes today:
  - `QaIssue` from rule QA.
  - `QARecommendation` from recommendation engine and AI QA.
  - Product Delivery requirement QA findings in `src/lib/models/product-delivery.ts`.
  A future `QAFinding` should avoid duplicating these without a migration or adapter plan.
- Quality gate types currently live in `src/lib/quality-engine/ai-draft-quality-gate.ts` and Product Delivery model gates. A future `GateVerdict` should account for both Draft PTR and Product Delivery gates.
- `/api/ai/run-skill/route.ts` is large and already handles legacy skill aliases, provider selection, mock fallback, repair, schema validation, quality gates, normalization, and audit. Normalizer work should be small and route-adjacent to avoid changing AI behavior accidentally.
- Provider adapters can return `rawText`, `rawJson`, or `parsedJson`. Any normalizer must preserve this contract and avoid logging full provider output.
- D01/D02 generators consume `ProcessTask[]` and `TemplateProfile`; gate work should validate inputs/outputs without changing generator behavior unless explicitly scoped.
- Product Delivery preview/export is stateful inside `ExportCenter.tsx`; Generate All changes can affect ZIP contents, artifact freshness, and preview-before-download behavior.
- No executable unit test framework is present, so early normalizer/gate work should include small deterministic helpers that can be checked by TypeScript/build first and later promoted to real tests.

## 15. Recommended Next Task

- Proceed to task `001-qafinding-schema`.
- Recommended scope:
  - Add a canonical `QAFinding` type or schema in a narrow library file.
  - Provide adapters from existing `QaIssue` and, if needed, Product Delivery requirement QA findings.
  - Do not replace `QARecommendation` yet.
  - Keep rule QA and AI QA behavior unchanged until integration tasks explicitly wire the new finding shape.
