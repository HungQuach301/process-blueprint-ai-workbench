# AI Implementation Matrix

## Audit Scope

Audited on 2026-05-10.

Inspected areas:
- `src/app/api/ai/run-skill/route.ts`
- `src/lib/ai/`
- `src/lib/ai-intake/`
- `src/lib/quality-engine/`
- `src/lib/recommendation-engine/`
- `src/lib/template-recommendation-engine/`
- `src/lib/audit/`
- `src/lib/skill-engine/`
- `src/lib/generators/product-delivery-generator.ts`
- `src/lib/generators/ai-coding-pack-generator.ts`
- `src/components/ai-settings/AIProviderSettingsPanel.tsx`
- `src/components/input-brief/AIInputBriefPanel.tsx`
- `src/components/qa-panel/QAPanel.tsx`
- `src/components/template-library/TemplateLibraryEditor.tsx`
- `src/components/export-center/ExportCenter.tsx`

## Provider Implementation Summary

| Provider mode | Current support | Notes |
| --- | --- | --- |
| Mock / local | Implemented for active AI route skills and deterministic exports | Default behavior when feature flags are off or provider config is missing. |
| Product AI | UI/type placeholder only | `product-ai` exists in `ModelProvider`, AI Connection Center shows it as coming soon. No server adapter. |
| OpenAI | Implemented server-side for 3 active skills | Uses `src/lib/ai/providers/openai-provider.ts`, `AI_PROVIDER=openai`, `OPENAI_API_KEY`, `AI_MODEL`, and feature flags. |
| Claude | UI/type placeholder only | `claude-byok` exists in `ModelProvider`, AI Connection Center shows it as coming soon. No server adapter/env handling. |

Important finding:
- Browser components do not read `OPENAI_API_KEY` or send provider keys. The only `OPENAI_API_KEY` usage in `src/` is inside `src/app/api/ai/run-skill/route.ts` and `src/lib/ai/providers/openai-provider.ts`.
- AI Connection Center stores only non-secret local preferences in browser `localStorage`.
- The current server route only accepts external provider calls when `AI_PROVIDER` resolves to `openai`; other provider names return unsupported-provider errors for real AI paths.

## Implementation Matrix

| Skill id | Module | Input schema | Output schema | Mock support | Product AI support | OpenAI support | Claude support | Validation status | UI surface | Apply behavior | Audit behavior | Gaps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `input-brief-to-ptr` | Module 2 - AI Input Brief | `StructuredProcessBrief` from `src/lib/ai-intake/structured-process-brief.ts` | `DraftProcessTaskRegister`: draft `ProcessTask[]`, assumptions, open questions, source summary, confidence, language metadata, quality warnings | Yes. Local deterministic generation through `generateDraftProcessTaskRegister`; route mock path validates brief and draft. | No. Product AI mode is UI/type placeholder only. | Yes. Server-side `/api/ai/run-skill` with `ENABLE_REAL_AI=true`, `AI_PROVIDER=openai`, `OPENAI_API_KEY`, `AI_MODEL`. | No. Claude mode is UI/type placeholder only. | Strong. `validateStructuredProcessBrief`, `runBriefQualityGate`, `validateDraftProcessTaskRegister`, `runDraftProcessTaskRegisterQualityGate`; client re-validates provider output. | `AIInputBriefPanel` Manual Input and file intake action. | Draft preview first; user explicitly chooses replace or append. No auto-apply. | `generate_ai_draft` and `ai_call` entries in local audit log; records success/failure, real/mock mode, external API flag, validation metadata. | Product AI and Claude adapters missing. Server route skill id differs from registry wording for file/chat variants. Server route has no persistent server-side audit store. |
| `file-to-draft-ptr` | Module 2 - File Intake | File metadata plus local extracted content; PDF/DOCX converted to structured brief; Excel can extract draft tasks | Draft `ProcessTask[]` or file extraction preview metadata | Yes. Local-only PDF/DOCX/Excel extraction and deterministic draft generation. | No. | No dedicated real AI skill route. | No. | Partial. Draft output uses `validateDraftProcessTaskRegister` and quality gate when generated; image/OCR remains unsupported. | File Intake inside `AIInputBriefPanel`. | Draft preview first; user apply required. Upload/remove clears stale file-derived state in UI. | Draft generation and AI call audit for Input Brief path; file-only extraction has limited audit coverage. | No standalone `/api/ai/run-skill` skill id. No Product AI/OpenAI/Claude path for file understanding. OCR intentionally not implemented. |
| `chat-to-draft-ptr` | Module 2 - AI Input Brief | Planned chat transcript plus structured follow-up answers | Planned Draft `ProcessTask[]`, assumptions, open questions | No implemented chat flow. | No. | No. | No. | Not implemented. | No dedicated chat UI. | Planned preview/apply only. | None. | Skill is registry/planning only. Needs UI, schema, route, validation, and audit. |
| `ai-process-qa` | Module 2 - QA Panel | `ProcessTask[]`, optional `templateProfiles`, rule QA context from UI | `QARecommendation[]` | Yes. `runMockAIQA` produces local `QARecommendation[]`. | No. | Yes. Server-side `/api/ai/run-skill` with `ENABLE_REAL_AI_QA=true`, `AI_PROVIDER=openai`, `OPENAI_API_KEY`, `AI_MODEL`. | No. | Strong for recommendations. `validateAIQARecommendations` checks array shape, fields, enums, target step ids, operation kinds, then normalizes to source `ai` and `requiresConfirmation=true`. | `QAPanel` Run mock/real AI QA. | Recommendations enter existing preview/apply workflow; selected/apply requires confirmation; graph-changing recommendations are not selected by default. | `ai_call` local audit for request success/failure; recommendation feedback stored/exported separately in local feedback store. | Product AI and Claude adapters missing. No server-side audit persistence. Payload includes `qaIssues` from UI, but route type guard only requires processTasks/templateProfiles. |
| `process-improvement-recommendation` | Module 2 - Recommendation Engine | `AIRecommendationRequest`: context, `ProcessTask[]`, optional templates, target step ids, issue codes | `AIRecommendationResponse`: `QARecommendation[]`, meta | Minimal scaffold. `runMockAIRecommendations` returns empty recommendations. | No. | No routed provider path. | No. | Not active beyond types. | No dedicated UI beyond QA recommendations. | Planned recommendation preview/apply. | None for the scaffold unless called by future UI. | Not registered in `/api/ai/run-skill`. Needs generation logic, route, validation wiring, UI entry, and audit. |
| `template-review` / `ai-template-review` | Module 2 - Template Hub | Selected `TemplateProfile`, output type, process type, business domain | `{ recommendations: TemplateRecommendation[], qualityScore?: TemplateQualityScore }` | Yes. `runMockTemplateReview` returns local recommendation and score. | No. | Yes. Server-side `/api/ai/run-skill` with `ENABLE_REAL_AI_TEMPLATE_REVIEW=true`, `AI_PROVIDER=openai`, `OPENAI_API_KEY`, `AI_MODEL`. | No. | Strong for current schema. `validateTemplateReviewOutput` checks recommendation array, matching template id, source, type enum, confidence/risk, affected fields, confirmation, and quality score. | `TemplateLibraryEditor` / Template Hub Run Template QA. | Display/review only in current UI; no template change is auto-applied. User must edit/save template separately. | `ai_call` local audit for request success/failure and recommendation count; no apply audit because no auto-apply/apply action. | Route skill id is `ai-template-review` while registry also uses `template-review`. Product AI/Claude adapters missing. No server-side audit store. |
| `template-recommendation` | Module 2 - Template Hub | `ProcessTask[]` and template library metadata | Ranked or filtered template recommendations | Deterministic/local support exists in Template Hub/engine. | No. | No real AI provider path. | No. | Local engine/schema only; no AI provider validation path. | Template Hub filters/cards and selected D01/D02 template surfaces. | No auto-apply recommendation; user selects/saves template. | Template save/reset/stale marking exists; no AI call audit for deterministic template recommendation. | Needs explicit AI skill route if real AI template recommendation is required. |
| `ptr-to-brd-outline` | Module 3 - Product Delivery Core | `ProductDeliveryInput`: `ProcessTask[]`, optional project context, notes, source summary, generatedAt | `ProductDeliveryDraft`: BRD outline markdown, user stories markdown, acceptance criteria markdown, combined markdown | Yes. Deterministic generator. | No. | No. | No. | Type-level only; no runtime schema validator or AI quality gate. | Export Center Product Delivery section. | Preview first, then markdown download. No save/apply to Artifact Graph. | `export_product_delivery_draft` local audit on download. Preview is not audited. | Needs real AI skill route, schema model for BRD/SRS/story artifacts, validation, audit for generation, and eventual Artifact Graph integration. |
| `ptr-to-srs-outline` | Module 3 - Product Delivery Core | Planned: `ProcessTask[]`, BRD draft, constraints | Planned SRS outline draft | No. | No. | No. | No. | Not implemented. | No dedicated UI. | Planned preview/save/export only. | None. | Planned only. |
| `brd-or-notes-to-user-stories` | Module 3 - Product Delivery Core | Planned BRD draft or notes, optional persona/module/scope | Planned `UserStorySet` draft, acceptance criteria, assumptions, open questions, trace links | No direct skill. Current deterministic `ptr-to-brd-outline` output includes simple PTR-derived stories. | No. | No. | No. | Not implemented as AI skill. | Export Center text notes/context feed deterministic Product Delivery draft only. | Preview/export only in current deterministic Product Delivery slice. | Export audit only when Product Delivery markdown is downloaded. | Needs schema, route, provider prompts, validation, UI save/export model, and audit. |
| `ptr-to-user-stories` | Module 3 - Product Delivery Core | `ProcessTask[]`, optional context | User stories markdown with `ProcessTask.stepId` references | Yes. Deterministic as part of `generateProductDeliveryDraft`. | No. | No. | No. | Type-level only; no runtime story schema. | Export Center Product Delivery preview. | Preview/export only. | `export_product_delivery_draft` local audit on download. | Needs structured `UserStorySet` schema and real AI path if this becomes a first-class skill. |
| `user-stories-to-acceptance-criteria` | Module 3 - Product Delivery Core | Current deterministic path uses `ProcessTask[]`; planned path uses user stories | Acceptance criteria markdown | Yes. Deterministic as part of `generateProductDeliveryDraft`. | No. | No. | No. | Type-level only; no runtime acceptance criteria schema. | Export Center Product Delivery preview. | Preview/export only. | `export_product_delivery_draft` local audit on download. | Needs structured acceptance criteria schema and real AI path. |
| `user-stories-to-jira-export` | Module 3 - Product Delivery Core | Planned user stories, acceptance criteria, labels, epic metadata | Planned Jira-ready markdown/CSV/JSON | No. | No. | No. | No. | Not implemented. | No dedicated UI. | Planned preview/download only. | None. | Planned only. |
| `mvp-slicing` | Module 3 - Product Delivery Core | Planned BRD/SRS/user stories, constraints, priority notes | Planned MVP slice recommendation | No. | No. | No. | No. | Not implemented. | No dedicated UI. | Planned recommendation only. | None. | Planned only. |
| `scope-nonscope-definition` | Module 3 - Product Delivery Core | Planned PTR, notes, BRD/SRS context | Planned scope/non-scope draft | No. | No. | No. | No. | Not implemented. | No dedicated UI. | Planned preview/save/export only. | None. | Planned only. |
| `requirement-quality-check` | Module 3 - Product Delivery Core | Planned Product Delivery artifacts and trace links | Planned requirement QA findings and recommendations | No. | No. | No. | No. | Not implemented. | No dedicated UI. | Planned recommendation only. | None. | Planned only. |
| `ptr-to-ai-coding-pack` | Module 5 thin slice supporting MVP1-AI | `AICodingPackInput`: `ProcessTask[]`, selected D01/D02 templates, optional project context, assumptions, open questions, generatedAt | `AICodingPackFiles`: `AGENTS.md`, `CLAUDE.md`, `cursor-rules.md`, `spec.json`, `acceptance-criteria.md`, `implementation-plan.md`, `test-plan.md` | Yes. Deterministic generator. | No. | No. | No. | Type-level only; generated `spec.json` is deterministic but not runtime-validated against a schema. | Export Center AI Coding Pack section. | Preview `spec.json`, then ZIP download. No apply. | `export_ai_coding_pack` local audit on ZIP download. Preview is not audited. | Needs first-class schema validation and optional real AI enhancement path. |
| `user-stories-to-ai-coding-pack` | Module 5 future skill | Planned user stories, acceptance criteria, architecture constraints, test expectations | Planned AI Coding Pack files | No. Current coding pack is PTR-derived, not story-derived. | No. | No. | No. | Not implemented. | Export Center mentions this as future AI enhancement. | Planned export after review. | None. | Planned only. Needs Module 3 story artifacts first. |
| `audit-summary` | Cross-cutting governance | Local audit log entries from `src/lib/audit/audit-log.ts` | JSON export or UI-readable event list | Deterministic/local. | No. | No. | No. | Type-level only; localStorage parse fallback. | Export Center audit export. | Read/export only. | Local audit log records AI calls, draft generation, apply draft, exports, generated artifacts. | Audit is browser-local only. No server-side durable audit or tenant/user identity. |

## Route Support Matrix

| Route skill id | Mock/local behavior | Real AI flag | Provider behavior | Validation before returning success |
| --- | --- | --- | --- | --- |
| `input-brief-to-ptr` | Generates deterministic Draft PTR locally when `ENABLE_REAL_AI` is false or OpenAI config is missing. | `ENABLE_REAL_AI` | Only `AI_PROVIDER=openai` is accepted for provider-backed mode. | Brief schema, brief quality gate, draft schema, draft quality gate. |
| `ai-process-qa` | Uses `runMockAIQA` when `ENABLE_REAL_AI_QA` is false or OpenAI config is missing. | `ENABLE_REAL_AI_QA` | Only `AI_PROVIDER=openai` is accepted for provider-backed mode. | `validateAIQARecommendations` against existing `stepId` values. |
| `ai-template-review` | Uses `runMockTemplateReview` when `ENABLE_REAL_AI_TEMPLATE_REVIEW` is false or OpenAI config is missing. | `ENABLE_REAL_AI_TEMPLATE_REVIEW` | Only `AI_PROVIDER=openai` is accepted for provider-backed mode. | `validateTemplateReviewOutput` against selected template id/schema. |

## Provider Gaps

1. Product AI has UX and type placeholders, but no server adapter, env contract, routing behavior, billing/usage metadata, or Product AI data policy enforcement.
2. OpenAI is the only implemented external provider. It is server-side only and uses the Responses API, but there is no provider abstraction beyond `createOpenAIProvider`.
3. Claude has UX and type placeholders, but no server adapter, env contract, model config, or schema retry behavior.
4. The UI provider value for OpenAI is `openai-byok`, while the server env expects `AI_PROVIDER=openai`. This is acceptable for the current non-secret UI preferences, but should be clarified before wiring UI provider mode to server execution.
5. Server route audit is returned as response metadata but not persisted server-side; durable audit currently depends on browser-local UI logging.
6. Product Delivery and AI Coding Pack are deterministic exports, not AI route skills yet.
7. Runtime schemas are strong for active AI route outputs, but Module 3 markdown outputs need structured schemas before real AI support.

## Security And Apply Behavior Findings

- No API key is exposed in client components.
- Browser UI only calls `/api/ai/run-skill`; it does not call OpenAI or Claude directly.
- `confirmRealAICallIfNeeded` blocks real AI calls unless `allowCloudAI` is enabled in local AI settings and the user confirms the data warning.
- Active AI outputs are draft/recommendation/review results first.
- Draft PTR requires explicit Replace or Append.
- QA recommendations require preview/confirmation before apply.
- Template QA recommendations are displayed and are not auto-applied.
- Deterministic Product Delivery and AI Coding Pack exports are preview/export workflows, not apply workflows.
