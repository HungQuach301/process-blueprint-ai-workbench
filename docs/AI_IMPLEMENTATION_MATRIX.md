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

## AI Connection Center Matrix

Updated on 2026-05-10.

| UI card | Server provider | Status source | Test behavior | Secret exposure |
| --- | --- | --- | --- | --- |
| Product AI | `product-ai` | `/api/ai/run-skill` GET provider summary | Browser calls server-side `test-connection`; server reports env readiness. | No API key displayed. |
| OpenAI | `openai` | `/api/ai/run-skill` GET provider summary | Browser calls server-side `test-connection`; no direct OpenAI browser call. | No API key displayed. |
| Claude | `claude` | `/api/ai/run-skill` GET provider summary | Browser calls server-side `test-connection`; no direct Claude browser call. | No API key displayed. |
| Local / Mock | `mock` | Always `available` | Server confirms local/mock fallback. | No secret required. |

Provider card statuses are:

- `configured`
- `missing env`
- `disabled`
- `available`

Advanced Settings now store non-secret local preferences for default provider,
model/capability, allow cloud AI, require approval, data usage mode, and a
small per-skill override map for active skills. These overrides are UI
preferences only in this slice; server-side execution remains governed by env,
feature flags, provider config, data mode, and Skill Registry V2.

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

Runtime schema helpers now exist for `DraftProcessTaskRegister`, `BRDResponse`, `SRSResponse`, `UserStorySetResponse`, `AcceptanceCriteriaResponse`, `AICodingPackResponse`, `QARecommendationResponse`, `TemplateRecommendationResponse`, and `ArtifactReviewResponse`. Existing canonical validators are reused for active schemas where available.

## AI Orchestration V2 Route

Added on 2026-05-10 in `src/app/api/ai/run-skill/route.ts`.

The route path is unchanged, but request execution now goes through an orchestration layer:

| Step | Behavior |
| --- | --- |
| Skill validation | `skillId` is checked against AI Skill Registry V2. `ai-template-review` is treated as a route alias for registry skill `template-review`. |
| Input validation | Uses `validateAISkillInput` plus route-specific checks for active QA and template review payloads. |
| Provider/data enforcement | Uses existing feature flags, server `AI_PROVIDER`, allowed providers from the registry, provider config status, and optional `AI_DATA_USAGE_MODE`. |
| Prompt selection | Uses the registered prompt pack from `src/lib/ai/prompt-packs.ts`. |
| Provider selection | Uses the V2 provider factory for Mock/Product AI/OpenAI/Claude. |
| Timeout handling | Provider calls are bounded by `AI_PROVIDER_TIMEOUT_MS` or `45000ms` default. |
| JSON parsing | Parses structured JSON from normalized provider output. |
| Safe repair | Performs one optional malformed-JSON repair attempt and still requires schema validation. |
| Output validation | Uses `validateAISkillOutput` plus active Draft PTR quality gates where applicable. |
| Response | Returns normalized metadata: orchestration version, provider, model, request id, prompt pack, schemas, data mode, latency, warnings, validation status, and safe audit metadata. |
| Audit | Records server-safe audit metadata through server logging and returns audit metadata to the UI; full payload/output content is not logged by the route. |

Invalid AI output returns `422` with reviewable validation errors and is blocked before any preview/apply/export flow can use it.

## Implementation Matrix

| Skill id | Module | Input schema | Output schema | Mock support | Product AI support | OpenAI support | Claude support | Validation status | UI surface | Apply behavior | Audit behavior | Gaps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `input-brief-to-ptr` | Module 2 - AI Input Brief | `StructuredProcessBrief` from `src/lib/ai-intake/structured-process-brief.ts` | `DraftProcessTaskRegister`: draft `ProcessTask[]`, assumptions, open questions, source summary, confidence, language metadata, quality issues and quality warnings | Yes. Local deterministic generation through `generateDraftProcessTaskRegister`; route mock path validates brief and draft. | Yes. Server-side `/api/ai/run-skill` with `ENABLE_REAL_AI=true`, `AI_PROVIDER=product-ai`, and Product AI env configured. | Yes. Server-side `/api/ai/run-skill` with `ENABLE_REAL_AI=true`, `AI_PROVIDER=openai`, and OpenAI env configured. | Yes. Server-side `/api/ai/run-skill` with `ENABLE_REAL_AI=true`, `AI_PROVIDER=claude`, and Claude env configured. | Strong. `validateStructuredProcessBrief`, `runBriefQualityGate`, `validateDraftProcessTaskRegister`, `runDraftProcessTaskRegisterQualityGate`; client re-validates provider output. | `AIInputBriefPanel` Manual Input. | Draft preview first; user explicitly chooses replace or append. No auto-apply. | `generate_ai_draft` and `ai_call` entries in local audit log; records success/failure, real/mock mode, external API flag, validation metadata. | Server route has no persistent server-side audit store. |
| `file-to-ptr-draft` | Module 2 - File Intake | `FileIntakeContext`: file metadata, local extracted text, extraction warnings, detected actors/systems/data/steps | `DraftProcessTaskRegister`: draft `ProcessTask[]`, assumptions, open questions, source summary, confidence, quality issues | Yes. Server route mock path converts local PDF/DOCX extraction into deterministic Draft PTR. Excel remains deterministic local extraction because it already produces PTR rows. | Yes. Server-side `/api/ai/run-skill` with `ENABLE_REAL_AI=true`, `AI_PROVIDER=product-ai`, and Product AI env configured. | Yes. Server-side `/api/ai/run-skill` with `ENABLE_REAL_AI=true`, `AI_PROVIDER=openai`, and OpenAI env configured. | Yes. Server-side `/api/ai/run-skill` with `ENABLE_REAL_AI=true`, `AI_PROVIDER=claude`, and Claude env configured. | Strong for PDF/DOCX text. Input validates file context, output validates Draft PTR, then quality gate blocks invalid preview. Image/OCR remains unsupported. | File Intake inside `AIInputBriefPanel`. | Draft preview first; user explicitly chooses Replace or Append. Upload/remove clears stale file-derived state. | `generate_ai_draft` and `ai_call` local audit entries for route-backed file draft generation. | OCR is intentionally not implemented; Excel path is still deterministic local extraction rather than real AI. Legacy alias `file-to-draft-ptr` is preserved in the route. |
| `chat-to-ptr-draft` | Module 2 - AI Input Brief | `ChatNotesContext`: pasted chat, notes, or manual text plus optional brief context | `DraftProcessTaskRegister`: draft `ProcessTask[]`, assumptions, open questions, source summary, confidence, quality issues | Yes. Server route mock path converts notes into a normalized structured brief and deterministic Draft PTR. | Yes. Server-side `/api/ai/run-skill` with `ENABLE_REAL_AI=true`, `AI_PROVIDER=product-ai`, and Product AI env configured. | Yes. Server-side `/api/ai/run-skill` with `ENABLE_REAL_AI=true`, `AI_PROVIDER=openai`, and OpenAI env configured. | Yes. Server-side `/api/ai/run-skill` with `ENABLE_REAL_AI=true`, `AI_PROVIDER=claude`, and Claude env configured. | Strong. Input validates notes length, output validates Draft PTR, then quality gate blocks invalid preview. | Manual Input mode in `AIInputBriefPanel`, Chat/notes card. | Draft preview first; user explicitly chooses Replace or Append. Text change clears stale draft. | `generate_ai_draft` and `ai_call` local audit entries for route-backed chat/notes draft generation. | Chat is pasted text only; no conversational agent memory or external chat connector yet. Legacy alias `chat-to-draft-ptr` is preserved in the route. |
| `ai-process-qa` | Module 2 - QA Panel | `ProcessTask[]`, rule-based `qaIssues`, `existingRecommendations`, and selected D01/D02 template metadata from UI | `QARecommendation[]` | Yes. `runMockAIQA` produces local `QARecommendation[]` and uses rule issue/recommendation context when available. | Yes. Server-side when `ENABLE_REAL_AI_QA=true` and Product AI env is configured. | Yes. Server-side when `ENABLE_REAL_AI_QA=true` and OpenAI env is configured. | Yes. Server-side when `ENABLE_REAL_AI_QA=true` and Claude env is configured. | Strong for recommendations. `validateAIQARecommendations` checks array shape, fields, source `ai`/`hybrid`, confidence/impact/risk, target step ids, operation kinds, operation step references, and graph-changing safety. Graph-changing AI recommendations are normalized to high impact/high risk and require confirmation. | `QAPanel` Run mock/real AI QA after rule QA has already produced issues and rule recommendations. | Recommendations enter existing preview/apply workflow; selected/apply requires confirmation; Select safe only selects high-confidence, low-risk, non-graph-changing operations. | `ai_call` local audit for request success/failure; recommendation feedback still stores accepted/rejected/batch records in the local feedback store. | No server-side durable audit persistence yet. Provider-backed quality depends on prompt compliance, but schema/safety validation blocks invalid output. |
| `process-improvement-recommendation` | Module 2 - PTR AI Assistant | `ProcessTask[]`, selected `targetStepIds`, optional templates, and `metadata.ptrAiAction` | `QARecommendation[]` for reviewable row patches or graph-changing previews | Yes. Route mock path creates deterministic selected-row recommendations for normalize, infer actor/system/lane, improve wording, split, input/output, and interaction/channel actions. | Yes. Server-side through `/api/ai/run-skill` with `ENABLE_REAL_AI=true`, `AI_PROVIDER=product-ai`, and Product AI env configured. | Yes. Server-side through `/api/ai/run-skill` with `ENABLE_REAL_AI=true`, `AI_PROVIDER=openai`, and OpenAI env configured. | Yes. Server-side through `/api/ai/run-skill` with `ENABLE_REAL_AI=true`, `AI_PROVIDER=claude`, and Claude env configured. | Strong for recommendations. Input validates `ProcessTask[]`; output uses the same QARecommendation validator, target step checks, operation checks, and graph-changing safety normalization as AI QA. | Process Task Register selected-row AI Assistant actions; recommendations appear in QA Panel. | No direct mutation. Recommendations reuse existing QA Panel preview/confirm/apply workflow. Split task is high risk/graph-changing and is not selected by Select safe. | Browser local audit logs request success/failure metadata; route records safe server audit metadata without full payload/output content. | Provider-backed quality depends on prompt compliance; no dedicated server-side durable audit store yet. |
| `artifact-review` | Module 2 - D01/D02 Artifact Review | `ProcessTask[]`, selected `TemplateProfile`, generated BPMN or draw.io XML, artifact type, and optional rule QA issues | `ArtifactReviewResponse`: `QARecommendation[]`, `TemplateRecommendation[]`, and artifact review warnings | Yes. Deterministic mock route returns a read-only review response with warnings and validates both PTR and template recommendation arrays. | Yes. Server-side through `/api/ai/run-skill` with `ENABLE_REAL_AI=true`, `AI_PROVIDER=product-ai`, and Product AI env configured. | Yes. Server-side through `/api/ai/run-skill` with `ENABLE_REAL_AI=true`, `AI_PROVIDER=openai`, and OpenAI env configured. | Yes. Server-side through `/api/ai/run-skill` with `ENABLE_REAL_AI=true`, `AI_PROVIDER=claude`, and Claude env configured. | Strong for current contract. Input requires generated XML, existing `ProcessTask[]`, and selected template. Output validates PTR recommendations against current step ids and template recommendations against the selected template id/schema. | D01 BPMN Output and D02 Service Blueprint Output actions: Review BPMN with AI and Review Service Blueprint with AI. | No direct artifact mutation. AI cannot patch BPMN/draw.io XML; fixes must route back to PTR recommendations or template recommendations for separate user review. | Browser local audit logs request success/failure metadata; route records safe server audit metadata without full artifact content in logs. | UI currently previews counts and warnings only; deeper apply integration should route PTR recs to QA Panel and template recs to Template Hub in a later slice. |
| `template-review` / `ai-template-review` | Module 2 - Template Hub | Selected `TemplateProfile`, output type, process type, business domain | `{ recommendations: TemplateRecommendation[], qualityScore?: TemplateQualityScore, warnings?: string[], assumptions?: string[] }` | Yes. `runMockTemplateReview` checks BPMN fit, Service Blueprint fit, mandatory fields, lane/row rules, connector/layout risks, and domain/process type fit, then returns local recommendations, score, warnings, and assumptions. | Yes. Server-side when `ENABLE_REAL_AI_TEMPLATE_REVIEW=true` and Product AI env is configured. | Yes. Server-side when `ENABLE_REAL_AI_TEMPLATE_REVIEW=true` and OpenAI env is configured. | Yes. Server-side when `ENABLE_REAL_AI_TEMPLATE_REVIEW=true` and Claude env is configured. | Strong for current schema. `validateTemplateReviewOutput` checks recommendation array, matching template id, source, type enum, confidence/risk, affected fields, confirmation, quality score, warnings, and assumptions. | `TemplateLibraryEditor` / Template Hub Run Template QA and AI Template Review result surface. | Display/review only in current UI; no template change is auto-applied. User must edit/save template separately. | `ai_call` local audit for request success/failure, recommendation count, warning count, assumption count, and quality score presence; no apply audit because no auto-apply/apply action. | Route skill id is `ai-template-review` while registry also uses `template-review`. No server-side durable audit store. |
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
| `input-brief-to-ptr` | Generates deterministic Draft PTR locally when `ENABLE_REAL_AI` is false, data mode is `local-only`, provider is `mock`, or selected provider config is missing. | `ENABLE_REAL_AI` | `mock`, `product-ai`, `openai`, and `claude` are selected through Orchestration V2 and the provider factory. | Skill registry input validation, brief schema, brief quality gate, draft schema, draft quality gate. |
| `file-to-ptr-draft` | Generates deterministic Draft PTR from file extraction context when `ENABLE_REAL_AI` is false, data mode is `local-only`, provider is `mock`, or selected provider config is missing. | `ENABLE_REAL_AI` | `mock`, `product-ai`, `openai`, and `claude` are selected through Orchestration V2 and the provider factory. | File context validation, draft schema, draft quality gate. |
| `chat-to-ptr-draft` | Generates deterministic Draft PTR from pasted chat/notes when `ENABLE_REAL_AI` is false, data mode is `local-only`, provider is `mock`, or selected provider config is missing. | `ENABLE_REAL_AI` | `mock`, `product-ai`, `openai`, and `claude` are selected through Orchestration V2 and the provider factory. | Chat notes validation, draft schema, draft quality gate. |
| `ai-process-qa` | Uses `runMockAIQA` when `ENABLE_REAL_AI_QA` is false, data mode is `local-only`, provider is `mock`, or selected provider config is missing. Mock uses rule QA context when available instead of blindly duplicating rule recommendations. | `ENABLE_REAL_AI_QA` | `mock`, `product-ai`, `openai`, and `claude` are selected through Orchestration V2 and the provider factory. | Skill registry input validation and `validateAIQARecommendations` against existing `stepId` values, operation references, confidence/risk, and graph-changing safety. |
| `process-improvement-recommendation` | Creates deterministic PTR AI Assistant recommendations for selected rows when `ENABLE_REAL_AI` is false, data mode is `local-only`, provider is `mock`, or selected provider config is missing. | `ENABLE_REAL_AI` | `mock`, `product-ai`, `openai`, and `claude` are selected through Orchestration V2 and the provider factory. | Skill registry input validation and `validateAIQARecommendations` against selected/current `stepId` values. |
| `artifact-review` | Returns deterministic read-only artifact review warnings when `ENABLE_REAL_AI` is false, data mode is `local-only`, provider is `mock`, or selected provider config is missing. | `ENABLE_REAL_AI` | `mock`, `product-ai`, `openai`, and `claude` are selected through Orchestration V2 and the provider factory. | Skill registry input validation, route-specific artifact payload validation, `ArtifactReviewResponse` validation, `validateAIQARecommendations`, and `validateTemplateReviewOutput`. |
| `ai-template-review` | Uses `runMockTemplateReview` when `ENABLE_REAL_AI_TEMPLATE_REVIEW` is false, data mode is `local-only`, provider is `mock`, or selected provider config is missing. Mock review covers template fit, mandatory fields, row/lane rules, connector/layout risks, and classification fit. | `ENABLE_REAL_AI_TEMPLATE_REVIEW` | `mock`, `product-ai`, `openai`, and `claude` are selected through Orchestration V2 and the provider factory. | Registry alias `template-review`, route-specific selected template validation, and `validateTemplateReviewOutput` against selected template id/schema, quality score, warnings, and assumptions. |

## Provider Gaps

1. Product AI adapter is generic and expects the configured endpoint to return `rawText`, `rawJson`, `parsedJson`, `content`, `text`, `outputText`, or `output_text`; contract tests are still needed.
2. Claude adapter is implemented through Anthropic Messages API using `fetch`; route-level malformed JSON repair exists, but provider-specific schema retry/repair and contract tests are still needed.
3. The UI provider value for OpenAI is `openai-byok`, while the server env expects `AI_PROVIDER=openai`. This is acceptable for the current non-secret UI preferences, but should be clarified before wiring UI provider mode to server execution.
4. Server route audit metadata is returned and logged server-side without full payload/output content, but it is not persisted to a durable server audit store; durable audit currently depends on browser-local UI logging.
5. Product Delivery and AI Coding Pack are deterministic exports, not AI route skills yet.
6. Runtime schemas now exist for Module 3 and AI Coding Pack target outputs, but current deterministic markdown outputs still need structured adapters or route wiring before real AI support.

## Security And Apply Behavior Findings

- No API key is exposed in client components.
- Browser UI only calls `/api/ai/run-skill`; it does not call OpenAI or Claude directly.
- `confirmRealAICallIfNeeded` blocks real AI calls unless `allowCloudAI` is enabled in local AI settings and the user confirms the data warning.
- Active AI outputs are draft/recommendation/review results first.
- Draft PTR requires explicit Replace or Append.
- QA recommendations require preview/confirmation before apply.
- Select safe only selects high-confidence, low-risk, non-graph-changing recommendations with safe operation kinds.
- Template QA recommendations are displayed and are not auto-applied.
- Deterministic Product Delivery and AI Coding Pack exports are preview/export workflows, not apply workflows.
