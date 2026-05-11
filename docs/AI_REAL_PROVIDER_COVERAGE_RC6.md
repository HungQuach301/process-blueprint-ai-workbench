# AI Real Provider Coverage RC6

## Audit Metadata

- Date: 2026-05-11
- Branch: `feature/mvp1-ai-rc6-final-ux-ai-hardening`
- Scope: RC6 Block 7 real AI integration coverage for OpenAI, Claude, Product AI, and mock/local fallback.

## Audited Code

- `src/app/api/ai/run-skill/route.ts`
- `src/lib/ai/skill-registry-v2.ts`
- `src/lib/ai/skill-schemas.ts`
- `src/lib/ai/providers/provider-factory.ts`
- `src/lib/ai/providers/openai-provider.ts`
- `src/lib/ai/providers/claude-provider.ts`
- `src/lib/ai/providers/product-ai-provider.ts`
- `src/lib/ai/providers/mock-provider.ts`
- `src/lib/ai/ai-governance.ts`
- `src/lib/audit/audit-log.ts`
- `src/components/input-brief/AIInputBriefPanel.tsx`
- `src/components/task-register/ProcessTaskRegister.tsx`
- `src/components/qa-panel/QAPanel.tsx`
- `src/components/bpmn-output/D01BpmnOutput.tsx`
- `src/components/service-blueprint-output/D02ServiceBlueprintOutput.tsx`
- `src/components/template-library/TemplateLibraryEditor.tsx`
- `src/components/export-center/ExportCenter.tsx`

## Coverage Legend

- `Ready`: Skill is registered and routed through `/api/ai/run-skill`; provider-backed execution can use OpenAI, Claude, or Product AI when the related feature flag, server env, provider config, and data mode allow it.
- `Fallback`: If real AI is disabled, data mode is `local-only`, provider is `mock`, or env is missing, the route returns mock/local output instead of calling an external provider.
- `Deterministic`: Local non-provider generation/export only.
- `Limited`: Supported through an alias, shared route, or preview/export-only workflow with a documented limitation.

## Provider Boundary Summary

| Area | Status |
| --- | --- |
| Browser API key exposure | No provider API key usage found in client components. Provider secrets are referenced only in server route/provider code. |
| Direct browser provider calls | No direct `api.openai.com` or Anthropic browser calls found. Client surfaces call `/api/ai/run-skill`. |
| OpenAI adapter | Server-side `openai-provider.ts`, configured by `AI_PROVIDER=openai`, `OPENAI_API_KEY`, and `OPENAI_MODEL` or `AI_MODEL`. |
| Claude adapter | Server-side `claude-provider.ts`, configured by `AI_PROVIDER=claude`, `ANTHROPIC_API_KEY`, and `CLAUDE_MODEL` or `AI_MODEL`. |
| Product AI adapter | Server-side `product-ai-provider.ts`, configured by `AI_PROVIDER=product-ai`, `PRODUCT_AI_ENDPOINT`, optional `PRODUCT_AI_API_KEY`, and `PRODUCT_AI_MODEL` or `AI_MODEL`. |
| Mock/local | Always available through the mock provider or deterministic route branches. |
| Output handling | Route validates structured JSON output before returning success. UI keeps outputs in draft/recommendation/review/preview surfaces. |
| Audit | Server route records safe audit metadata; browser surfaces log local `ai_call` metadata without full prompts or full model outputs. |

## Coverage Matrix

| Skill / feature | UI surface | OpenAI status | Claude status | Product AI status | Mock status | Validation status | Known limitation | Test instruction |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `input-brief-to-ptr` | AI Input Brief manual input | Ready through server route with `ENABLE_REAL_AI=true`, `AI_PROVIDER=openai`, OpenAI env configured | Ready through server route with `ENABLE_REAL_AI=true`, `AI_PROVIDER=claude`, Claude env configured | Ready through server route with `ENABLE_REAL_AI=true`, Product AI env configured | Fallback local/mock Draft PTR | `validateStructuredProcessBrief`, brief quality gate, `validateDraftProcessTaskRegister`, draft quality gate | Requires cloud consent in UI settings before real provider call; output remains Draft PTR only | Fill required brief fields, enable real AI + provider env, click Generate Draft PTR with AI, confirm draft preview appears and is not applied |
| `file-to-ptr-draft` / legacy `file-to-draft-ptr` | File Intake in AI Input Brief | Ready through server route for extracted text | Ready through server route for extracted text | Ready through server route for extracted text | Fallback local/mock for PDF/DOCX text; Excel remains deterministic local extraction | File context validation, Draft PTR schema, draft quality gate | OCR/image intake not implemented; Excel path is not real AI | Upload text-based PDF/DOCX or extracted content, generate Draft PTR, verify preview and local audit metadata |
| `chat-to-ptr-draft` / legacy `chat-to-draft-ptr` | AI Input Brief notes/chat | Ready through server route | Ready through server route | Ready through server route | Fallback local/mock notes-to-draft | Chat/notes input validation, Draft PTR schema, draft quality gate | Pasted-text workflow only; no external chat connector/memory | Paste workshop notes, run notes/chat draft generation, verify stale draft clears after source edit |
| `ptr-ai-assistant` / PTR recommendations (`process-improvement-recommendation`) | Process Task Register AI Assistant | Ready through server route with `ENABLE_REAL_AI=true` | Ready through server route with `ENABLE_REAL_AI=true` | Ready through server route with `ENABLE_REAL_AI=true` | Fallback deterministic selected-row recommendations | `ProcessTask[]` input validation, `validateAIQARecommendations`, step/reference checks, graph-changing safety | UI name differs from route skill id; output is routed to QA recommendations | Select PTR rows, click AI Assistant, verify recommendations appear in QA Engine and require preview/confirm before apply |
| `ai-process-qa` | QA Engine | Ready with `ENABLE_REAL_AI_QA=true` | Ready with `ENABLE_REAL_AI_QA=true` | Ready with `ENABLE_REAL_AI_QA=true` | Fallback `runMockAIQA` | `validateAIQARecommendations`, target step checks, operation checks, graph-changing normalization | Uses separate QA feature flag; provider-backed quality depends on model JSON compliance | Run Generate AI recommendations, verify recommendations list, AI run history, and no direct apply |
| `bpmn-artifact-review` via `artifact-review` | Generate D01 BPMN XML | Ready through shared `artifact-review` with BPMN artifact type | Ready through shared `artifact-review` with BPMN artifact type | Ready through shared `artifact-review` with BPMN artifact type | Fallback deterministic artifact warnings | Artifact payload validation, `ArtifactReviewResponse`, `validateAIQARecommendations`, `validateTemplateReviewOutput` | Route skill is `artifact-review`, not a separate `bpmn-artifact-review` id; template findings are review-only | Generate BPMN, click Review BPMN with AI, verify QA Engine receives source-tagged recommendations and XML is unchanged |
| `service-blueprint-artifact-review` via `artifact-review` | Generate D02 Service Blueprint | Ready through shared `artifact-review` with service blueprint artifact type | Ready through shared `artifact-review` with service blueprint artifact type | Ready through shared `artifact-review` with service blueprint artifact type | Fallback deterministic artifact warnings | Artifact payload validation, `ArtifactReviewResponse`, `validateAIQARecommendations`, `validateTemplateReviewOutput` | Route skill is `artifact-review`, not a separate `service-blueprint-artifact-review` id; draw.io XML is not mutated | Generate Service Blueprint, click Review Service Blueprint with AI, verify QA Engine receives recommendations and draw.io XML is unchanged |
| `ai-template-review` / `template-review` | Template Hub | Ready with `ENABLE_REAL_AI_TEMPLATE_REVIEW=true` | Ready with `ENABLE_REAL_AI_TEMPLATE_REVIEW=true` | Ready with `ENABLE_REAL_AI_TEMPLATE_REVIEW=true` | Fallback `runMockTemplateReview` | Selected template validation, `validateTemplateReviewOutput` | Route alias is `ai-template-review`; registry id is `template-review`; recommendations are display/review-only | Run AI Template Review from Template Hub, verify score/recommendations display and no template auto-save occurs |
| BRD generation: `ptr-to-brd`, `notes-to-brd`, legacy `ptr-to-brd-outline` | Product Delivery Generate card / More actions | Ready through server route with `ENABLE_REAL_AI=true` | Ready through server route with `ENABLE_REAL_AI=true` | Ready through server route with `ENABLE_REAL_AI=true` | Fallback deterministic structured BRD | Product Delivery input validation, `validateBRDResponse`, BRD quality gate | Legacy outline id is supported but primary UI uses `ptr-to-brd` and `notes-to-brd` | Generate BRD from PTR and Notes; verify BRD preview/export JSON and AI run metadata |
| SRS generation: `brd-to-srs`, `notes-to-srs` | Product Delivery Generate card / More actions | Ready through server route | Ready through server route | Ready through server route | Fallback deterministic structured SRS | Product Delivery input validation, `validateSRSResponse`, SRS quality gate | `ptr-to-srs-outline` exists as registry legacy but is not the primary UI path | Generate SRS from BRD or notes, verify SRS preview/export JSON and no persistence |
| User story generation: `srs-to-user-stories`, `brd-to-user-stories` | Product Delivery Generate card / More actions | Ready through server route | Ready through server route | Ready through server route | Fallback deterministic UserStorySet | Product Delivery input validation, `validateUserStorySetResponse`, user story quality gate | Legacy `brd-or-notes-to-user-stories` exists but primary UI uses SRS/BRD routes | Generate stories from SRS and BRD, verify story preview/export JSON |
| Acceptance criteria generation: `user-stories-to-acceptance-criteria` | Product Delivery Generate card / More actions | Ready through server route | Ready through server route | Ready through server route | Fallback deterministic criteria | Product Delivery input validation, `validateAcceptanceCriteriaResponse`, acceptance criteria quality gate | Requires user stories or enough PTR context | Generate AC after stories, verify AC preview/export JSON |
| Product scope review: `product-scope-review` | Product Delivery Review card | Ready through server route | Ready through server route | Ready through server route | Fallback deterministic ProductScopeReview | Product Delivery input validation, `validateProductScopeReviewResponse`, scope quality gate | Preview/export only; no Artifact Graph persistence | Run Review Product Scope, verify scope/MVP preview and no save/apply |
| MVP slicing: `mvp-slicing` | Product Delivery Review card | Ready through server route | Ready through server route | Ready through server route | Fallback deterministic ProductScopeReview | Same Product Scope Review schema and quality gate | Preview/export only; not persisted as backlog | Run Generate MVP Slicing, verify MVP/later/out-of-scope preview |
| Requirement QA: `requirement-quality-check` | Product Delivery Review card | Ready through server route | Ready through server route | Ready through server route | Fallback deterministic Requirement QA | Product Delivery input validation, `validateRequirementQAResponse`; deterministic gates check BRD/SRS/story/AC/coding-pack coverage | Draft patch recommendations are not applied or saved automatically | Run Requirement QA after generating artifacts, verify findings/coverage preview |
| AI coding pack generation: `user-stories-to-ai-coding-pack` | Product Delivery AI Handoff card | Ready through server route | Ready through server route | Ready through server route | Fallback deterministic Product Delivery coding pack | Product Delivery input validation, `validateAICodingPackResponse`, coding pack quality gate | ZIP export remains preview/export only; `ptr-to-ai-coding-pack` is deterministic legacy | Preview Handoff Pack, inspect included files, then download ZIP |
| PTR AI coding pack: `ptr-to-ai-coding-pack` | Output/legacy AI Coding Pack preview | Limited/deterministic only in active UI | Limited/deterministic only in active UI | Limited/deterministic only in active UI | Deterministic generator | Normalized deterministic file shape and coding pack quality gate | Route-backed provider path is not the primary active workflow; use `user-stories-to-ai-coding-pack` for real AI Product Delivery handoff | Generate PTR-based coding pack preview/export; verify no provider call is claimed |

## Not In RC6 Coverage

| Skill | Status | Reason |
| --- | --- | --- |
| `template-recommendation` | Deterministic/local only | Current Template Hub recommendation/filtering is not a real AI provider route. No UI should describe it as OpenAI/Claude-backed. |
| `user-stories-to-jira-export` | Planned | No dedicated UI or route-backed implementation in this slice. |
| `scope-nonscope-definition` | Planned | Scope/non-scope behavior is currently covered by `product-scope-review` and `mvp-slicing`. |

## Verification Instructions

### Mock/local

1. Set `ENABLE_REAL_AI=false`, `ENABLE_REAL_AI_QA=false`, and `ENABLE_REAL_AI_TEMPLATE_REVIEW=false`.
2. Set `AI_PROVIDER=mock` or leave provider env incomplete.
3. Run each UI action listed in the matrix.
4. Expected result: `mode=mock`, `externalApiCalled=false`, preview/recommendation/review output appears, and no output is auto-applied.

### OpenAI

1. Set server env:
   - `ENABLE_REAL_AI=true`
   - `ENABLE_REAL_AI_QA=true`
   - `ENABLE_REAL_AI_TEMPLATE_REVIEW=true`
   - `AI_PROVIDER=openai`
   - `OPENAI_API_KEY=<server-side only>`
   - `OPENAI_MODEL=<model>` or `AI_MODEL=<model>`
   - `AI_DATA_USAGE_MODE=no-training` or approved cloud-processing mode
2. In AI Connection Center, enable cloud AI consent before running real-provider UI actions.
3. Run representative skills: `input-brief-to-ptr`, `ai-process-qa`, `artifact-review`, `ai-template-review`, `ptr-to-brd`, `brd-to-srs`, `srs-to-user-stories`, `user-stories-to-acceptance-criteria`, `requirement-quality-check`, and `user-stories-to-ai-coding-pack`.
4. Expected result: browser calls only `/api/ai/run-skill`; route returns provider-backed metadata; output passes schema/quality validation before preview.

### Claude

1. Set server env:
   - `ENABLE_REAL_AI=true`
   - `ENABLE_REAL_AI_QA=true`
   - `ENABLE_REAL_AI_TEMPLATE_REVIEW=true`
   - `AI_PROVIDER=claude`
   - `ANTHROPIC_API_KEY=<server-side only>`
   - `CLAUDE_MODEL=<model>` or `AI_MODEL=<model>`
   - `AI_DATA_USAGE_MODE=no-training` or approved cloud-processing mode
2. Repeat the OpenAI representative skill checks.
3. Expected result: same route/validation behavior, with `providerId=claude`.

### Product AI

1. Set server env:
   - `ENABLE_REAL_AI=true`
   - `ENABLE_REAL_AI_QA=true`
   - `ENABLE_REAL_AI_TEMPLATE_REVIEW=true`
   - `AI_PROVIDER=product-ai`
   - `PRODUCT_AI_ENDPOINT=<server-side endpoint>`
   - Optional `PRODUCT_AI_API_KEY=<server-side only>`
   - `PRODUCT_AI_MODEL=<model>` or `AI_MODEL=<model>`
2. Run representative skills.
3. Expected result: provider-backed output if the endpoint returns a supported JSON/text shape; otherwise route returns a safe provider error or validation error without auto-apply.

### Missing env / fallback

1. Enable a real AI flag but omit the provider key/model or endpoint.
2. Run the same UI action.
3. Expected result: effective provider falls back to mock/local; UI/status should not imply an external API was called; `externalApiCalled=false`.

## RC6 Findings

1. The active AI-capable surfaces reviewed in this audit are routed through `/api/ai/run-skill` for provider-backed execution where implemented.
2. OpenAI and Claude support is adapter-level and skill-generic: once the skill is registered, allowed for all providers, and route-backed, the same validation/quality-gate flow applies.
3. Product AI support is present but depends on the configured endpoint contract returning parseable structured content.
4. `artifact-review` is the single route skill for both BPMN and Service Blueprint artifact reviews; UI source labels distinguish the review origin.
5. `ptr-to-ai-coding-pack` remains a deterministic legacy/PTR export path in the active UI. The route-backed real AI handoff path is `user-stories-to-ai-coding-pack`.
6. Planned skills remain documented as not covered by real provider execution in RC6.
7. No obvious browser API key exposure or direct browser provider call was found during code inspection.
8. No large integration fix was applied in this block because the audited implementation already routes the active real-AI-ready skills through the server-side provider adapter and validation path.

