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
| Product AI | Implemented as V2 server-side adapter | Uses `src/lib/ai/providers/product-ai-provider.ts`, `AI_PROVIDER=product-ai`, `PRODUCT_AI_ENDPOINT`, optional `PRODUCT_AI_API_KEY`, and `PRODUCT_AI_MODEL` or `AI_MODEL`. |
| OpenAI | Implemented as V2 server-side adapter for active skills | Uses `src/lib/ai/providers/openai-provider.ts`, `AI_PROVIDER=openai`, `OPENAI_API_KEY`, and `OPENAI_MODEL` or `AI_MODEL`. |
| Claude | Implemented as V2 server-side adapter for active skills | Uses `src/lib/ai/providers/claude-provider.ts`, `AI_PROVIDER=claude`, `ANTHROPIC_API_KEY`, and `CLAUDE_MODEL` or `AI_MODEL`. |

Important finding:
- Browser components do not read provider API keys or send provider keys. Provider secrets are used only in server-side route/provider code.
- AI Connection Center stores only non-secret local preferences in browser `localStorage`.
- The current server route selects normalized V2 adapters through `provider-factory.ts` and falls back to mock/local output when the selected provider is not configured.

## Skill Registry V2 Layer

Added on 2026-05-10:

- `src/lib/ai/skill-registry-v2.ts`
- `src/lib/ai/prompt-packs.ts`
- `src/lib/ai/skill-schemas.ts`

This layer defines the MVP1-AI skill contract for Module 2 and Module 3 before every skill is wired to the route/UI. Each skill now has `skillId`, `module`, input/output schema references, allowed providers, approval requirement, data sensitivity, prompt pack id, version, and status.

Prompt packs are provider-neutral and split by domain:

| Prompt pack group | Scope |
| --- | --- |
| `provider-neutral-json-v1` | Shared JSON-only, no-auto-apply, no-browser-secret instructions. |
| `process-modeling-*` | Draft PTR, file-to-PTR, QA recommendation, and template review prompts. |
| `product-delivery-*` | BRD, SRS, user stories, acceptance criteria, and AI Coding Pack prompts. |

Runtime schema helpers now exist for `DraftProcessTaskRegister`, `BRDResponse`, `SRSResponse`, `UserStorySetResponse`, `AcceptanceCriteriaResponse`, `AICodingPackResponse`, `QARecommendationResponse`, and `TemplateRecommendationResponse`. Existing canonical validators are reused for active schemas where available.

## Implementation Matrix

| Skill id | Module | Input schema | Output schema | Mock support | Product AI support | OpenAI support | Claude support | Validation status | UI surface | Apply behavior | Audit behavior | Gaps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `input-brief-to-ptr` | Module 2 - AI Input Brief | `StructuredProcessBrief` from `src/lib/ai-intake/structured-process-brief.ts` | `DraftProcessTaskRegister`: draft `ProcessTask[]`, assumptions, open questions, source summary, confidence, language metadata, quality warnings | Yes. Local deterministic generation through `generateDraftProcessTaskRegister`; route mock path validates brief and draft. | Yes. Server-side `/api/ai/run-skill` with `ENABLE_REAL_AI=true`, `AI_PROVIDER=product-ai`, and Product AI env configured. | Yes. Server-side `/api/ai/run-skill` with `ENABLE_REAL_AI=true`, `AI_PROVIDER=openai`, and OpenAI env configured. | Yes. Server-side `/api/ai/run-skill` with `ENABLE_REAL_AI=true`, `AI_PROVIDER=claude`, and Claude env configured. | Strong. `validateStructuredProcessBrief`, `runBriefQualityGate`, `validateDraftProcessTaskRegister`, `runDraftProcessTaskRegisterQualityGate`; client re-validates provider output. | `AIInputBriefPanel` Manual Input and file intake action. | Draft preview first; user explicitly chooses replace or append. No auto-apply. | `generate_ai_draft` and `ai_call` entries in local audit log; records success/failure, real/mock mode, external API flag, validation metadata. | Server route skill id differs from registry wording for file/chat variants. Server route has no persistent server-side audit store. |
| `file-to-draft-ptr` | Module 2 - File Intake | File metadata plus local extracted content; PDF/DOCX converted to structured brief; Excel can extract draft tasks | Draft `ProcessTask[]` or file extraction preview metadata | Yes. Local-only PDF/DOCX/Excel extraction and deterministic draft generation. | No. | No dedicated real AI skill route. | No. | Partial. Draft output uses `validateDraftProcessTaskRegister` and quality gate when generated; image/OCR remains unsupported. | File Intake inside `AIInputBriefPanel`. | Draft preview first; user apply required. Upload/remove clears stale file-derived state in UI. | Draft generation and AI call audit for Input Brief path; file-only extraction has limited audit coverage. | No standalone `/api/ai/run-skill` skill id. No Product AI/OpenAI/Claude path for file understanding. OCR intentionally not implemented. |
| `chat-to-draft-ptr` | Module 2 - AI Input Brief | Planned chat transcript plus structured follow-up answers | Planned Draft `ProcessTask[]`, assumptions, open questions | No implemented chat flow. | No. | No. | No. | Not implemented. | No dedicated chat UI. | Planned preview/apply only. | None. | Skill is registry/planning only. Needs UI, schema, route, validation, and audit. |
| `ai-process-qa` | Module 2 - QA Panel | `ProcessTask[]`, optional `templateProfiles`, rule QA context from UI | `QARecommendation[]` | Yes. `runMockAIQA` produces local `QARecommendation[]`. | Yes. Server-side when `ENABLE_REAL_AI_QA=true` and Product AI env is configured. | Yes. Server-side when `ENABLE_REAL_AI_QA=true` and OpenAI env is configured. | Yes. Server-side when `ENABLE_REAL_AI_QA=true` and Claude env is configured. | Strong for recommendations. `validateAIQARecommendations` checks array shape, fields, enums, target step ids, operation kinds, then normalizes to source `ai` and `requiresConfirmation=true`. | `QAPanel` Run mock/real AI QA. | Recommendations enter existing preview/apply workflow; selected/apply requires confirmation; graph-changing recommendations are not selected by default. | `ai_call` local audit for request success/failure; recommendation feedback stored/exported separately in local feedback store. | No server-side audit persistence. Payload includes `qaIssues` from UI, but route type guard only requires processTasks/templateProfiles. |
| `process-improvement-recommendation` | Module 2 - Recommendation Engine | `AIRecommendationRequest`: context, `ProcessTask[]`, optional templates, target step ids, issue codes | `AIRecommendationResponse`: `QARecommendation[]`, meta | Minimal scaffold. `runMockAIRecommendations` returns empty recommendations. | No. | No routed provider path. | No. | Not active beyond types. | No dedicated UI beyond QA recommendations. | Planned recommendation preview/apply. | None for the scaffold unless called by future UI. | Not registered in `/api/ai/run-skill`. Needs generation logic, route, validation wiring, UI entry, and audit. |
| `template-review` / `ai-template-review` | Module 2 - Template Hub | Selected `TemplateProfile`, output type, process type, business domain | `{ recommendations: TemplateRecommendation[], qualityScore?: TemplateQualityScore }` | Yes. `runMockTemplateReview` returns local recommendation and score. | Yes. Server-side when `ENABLE_REAL_AI_TEMPLATE_REVIEW=true` and Product AI env is configured. | Yes. Server-side when `ENABLE_REAL_AI_TEMPLATE_REVIEW=true` and OpenAI env is configured. | Yes. Server-side when `ENABLE_REAL_AI_TEMPLATE_REVIEW=true` and Claude env is configured. | Strong for current schema. `validateTemplateReviewOutput` checks recommendation array, matching template id, source, type enum, confidence/risk, affected fields, confirmation, and quality score. | `TemplateLibraryEditor` / Template Hub Run Template QA. | Display/review only in current UI; no template change is auto-applied. User must edit/save template separately. | `ai_call` local audit for request success/failure and recommendation count; no apply audit because no auto-apply/apply action. | Route skill id is `ai-template-review` while registry also uses `template-review`. No server-side audit store. |
| `template-recommendation` | Module 2 - Template Hub | `ProcessTask[]` and template library metadata | Ranked or filtered template recommendations | Deterministic/local support exists in Template Hub/engine. | No. | No real AI provider path. | No. | Local engine/schema only; no AI provider validation path. | Template Hub filters/cards and selected D01/D02 template surfaces. | No auto-apply recommendation; user selects/saves template. | Template save/reset/stale marking exists; no AI call audit for deterministic template recommendation. | Needs explicit AI skill route if real AI template recommendation is required. |
| `ptr-to-brd-outline` | Module 3 - Product Delivery Core | `ProductDeliveryInput`: `ProcessTask[]`, optional project context, notes, source summary, generatedAt | V2 target schema: `BRDResponse`; current UI output: `ProductDeliveryDraft` markdown | Yes. Deterministic generator. | Planned through V2 registry; not routed yet. | Planned through V2 registry; not routed yet. | Planned through V2 registry; not routed yet. | V2 runtime validator exists as `validateBRDResponse`; current deterministic markdown generator is not converted to this schema yet. | Export Center Product Delivery section. | Preview first, then markdown download. No save/apply to Artifact Graph. | `export_product_delivery_draft` local audit on download. Preview is not audited. | Needs route wiring, prompt execution, schema conversion, audit for generation, and eventual Artifact Graph integration. |
| `ptr-to-srs-outline` | Module 3 - Product Delivery Core | Planned: `ProcessTask[]`, BRD draft, constraints | V2 target schema: `SRSResponse` | No. | Planned through V2 registry; not routed yet. | Planned through V2 registry; not routed yet. | Planned through V2 registry; not routed yet. | V2 runtime validator exists as `validateSRSResponse`; no UI/route yet. | No dedicated UI. | Planned preview/save/export only. | None. | Planned only. |
| `brd-or-notes-to-user-stories` | Module 3 - Product Delivery Core | Planned BRD draft or notes, optional persona/module/scope | V2 target schema: `UserStorySetResponse` | No direct skill. Current deterministic `ptr-to-brd-outline` output includes simple PTR-derived stories. | Planned through V2 registry; not routed yet. | Planned through V2 registry; not routed yet. | Planned through V2 registry; not routed yet. | V2 runtime validator exists as `validateUserStorySetResponse`; no UI/route yet. | Export Center text notes/context feed deterministic Product Delivery draft only. | Preview/export only in current deterministic Product Delivery slice. | Export audit only when Product Delivery markdown is downloaded. | Needs route, provider prompts, UI save/export model, and audit. |
| `ptr-to-user-stories` | Module 3 - Product Delivery Core | `ProcessTask[]`, optional context | V2 target schema: `UserStorySetResponse`; current output is markdown | Yes. Deterministic as part of `generateProductDeliveryDraft`. | Planned through V2 registry; not routed yet. | Planned through V2 registry; not routed yet. | Planned through V2 registry; not routed yet. | V2 runtime validator exists; deterministic markdown output still needs schema conversion. | Export Center Product Delivery preview. | Preview/export only. | `export_product_delivery_draft` local audit on download. | Needs route wiring or deterministic structured adapter. |
| `user-stories-to-acceptance-criteria` | Module 3 - Product Delivery Core | Current deterministic path uses `ProcessTask[]`; planned path uses user stories | V2 target schema: `AcceptanceCriteriaResponse`; current output is markdown | Yes. Deterministic as part of `generateProductDeliveryDraft`. | Planned through V2 registry; not routed yet. | Planned through V2 registry; not routed yet. | Planned through V2 registry; not routed yet. | V2 runtime validator exists as `validateAcceptanceCriteriaResponse`; deterministic markdown output still needs schema conversion. | Export Center Product Delivery preview. | Preview/export only. | `export_product_delivery_draft` local audit on download. | Needs route wiring or deterministic structured adapter. |
| `user-stories-to-jira-export` | Module 3 - Product Delivery Core | Planned user stories, acceptance criteria, labels, epic metadata | Planned Jira-ready markdown/CSV/JSON | No. | No. | No. | No. | Not implemented. | No dedicated UI. | Planned preview/download only. | None. | Planned only. |
| `mvp-slicing` | Module 3 - Product Delivery Core | Planned BRD/SRS/user stories, constraints, priority notes | Planned MVP slice recommendation | No. | No. | No. | No. | Not implemented. | No dedicated UI. | Planned recommendation only. | None. | Planned only. |
| `scope-nonscope-definition` | Module 3 - Product Delivery Core | Planned PTR, notes, BRD/SRS context | Planned scope/non-scope draft | No. | No. | No. | No. | Not implemented. | No dedicated UI. | Planned preview/save/export only. | None. | Planned only. |
| `requirement-quality-check` | Module 3 - Product Delivery Core | Planned Product Delivery artifacts and trace links | Planned requirement QA findings and recommendations | No. | No. | No. | No. | Not implemented. | No dedicated UI. | Planned recommendation only. | None. | Planned only. |
| `ptr-to-ai-coding-pack` | Module 5 thin slice supporting MVP1-AI | `AICodingPackInput`: `ProcessTask[]`, selected D01/D02 templates, optional project context, assumptions, open questions, generatedAt | V2 target schema: `AICodingPackResponse`; current output is `AICodingPackFiles` | Yes. Deterministic generator. | Planned through V2 registry; not routed yet. | Planned through V2 registry; not routed yet. | Planned through V2 registry; not routed yet. | V2 runtime validator exists as `validateAICodingPackResponse`; helper `normalizeDeterministicCodingPack` maps current files to schema shape. | Export Center AI Coding Pack section. | Preview `spec.json`, then ZIP download. No apply. | `export_ai_coding_pack` local audit on ZIP download. Preview is not audited. | Needs route wiring for optional real AI enhancement and structured audit for generation. |
| `user-stories-to-ai-coding-pack` | Module 5 future skill | Planned user stories, acceptance criteria, architecture constraints, test expectations | Planned AI Coding Pack files | No. Current coding pack is PTR-derived, not story-derived. | No. | No. | No. | Not implemented. | Export Center mentions this as future AI enhancement. | Planned export after review. | None. | Planned only. Needs Module 3 story artifacts first. |
| `audit-summary` | Cross-cutting governance | Local audit log entries from `src/lib/audit/audit-log.ts` | JSON export or UI-readable event list | Deterministic/local. | No. | No. | No. | Type-level only; localStorage parse fallback. | Export Center audit export. | Read/export only. | Local audit log records AI calls, draft generation, apply draft, exports, generated artifacts. | Audit is browser-local only. No server-side durable audit or tenant/user identity. |

## Route Support Matrix

| Route skill id | Mock/local behavior | Real AI flag | Provider behavior | Validation before returning success |
| --- | --- | --- | --- | --- |
| `input-brief-to-ptr` | Generates deterministic Draft PTR locally when `ENABLE_REAL_AI` is false or selected provider config is missing. | `ENABLE_REAL_AI` | `mock`, `product-ai`, `openai`, and `claude` are normalized through V2 provider factory. | Brief schema, brief quality gate, draft schema, draft quality gate. |
| `ai-process-qa` | Uses `runMockAIQA` when `ENABLE_REAL_AI_QA` is false or selected provider config is missing. | `ENABLE_REAL_AI_QA` | `mock`, `product-ai`, `openai`, and `claude` are normalized through V2 provider factory. | `validateAIQARecommendations` against existing `stepId` values. |
| `ai-template-review` | Uses `runMockTemplateReview` when `ENABLE_REAL_AI_TEMPLATE_REVIEW` is false or selected provider config is missing. | `ENABLE_REAL_AI_TEMPLATE_REVIEW` | `mock`, `product-ai`, `openai`, and `claude` are normalized through V2 provider factory. | `validateTemplateReviewOutput` against selected template id/schema. |

## Provider Gaps

1. Product AI adapter is generic and expects the configured endpoint to return `rawText`, `rawJson`, `parsedJson`, `content`, `text`, `outputText`, or `output_text`; contract tests are still needed.
2. Claude adapter is implemented through Anthropic Messages API using `fetch`, but schema retry/repair is not implemented.
3. The UI provider value for OpenAI is `openai-byok`, while the server env expects `AI_PROVIDER=openai`. This is acceptable for the current non-secret UI preferences, but should be clarified before wiring UI provider mode to server execution.
4. Server route audit is returned as response metadata but not persisted server-side; durable audit currently depends on browser-local UI logging.
5. Product Delivery and AI Coding Pack are deterministic exports, not AI route skills yet.
6. Runtime schemas now exist for Module 3 and AI Coding Pack target outputs, but current deterministic markdown outputs still need structured adapters or route wiring before real AI support.

## Security And Apply Behavior Findings

- No API key is exposed in client components.
- Browser UI only calls `/api/ai/run-skill`; it does not call OpenAI or Claude directly.
- `confirmRealAICallIfNeeded` blocks real AI calls unless `allowCloudAI` is enabled in local AI settings and the user confirms the data warning.
- Active AI outputs are draft/recommendation/review results first.
- Draft PTR requires explicit Replace or Append.
- QA recommendations require preview/confirmation before apply.
- Template QA recommendations are displayed and are not auto-applied.
- Deterministic Product Delivery and AI Coding Pack exports are preview/export workflows, not apply workflows.
