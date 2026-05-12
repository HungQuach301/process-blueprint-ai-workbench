# AI Real Provider Coverage RC7

## Audit Metadata

- Date: 2026-05-12
- Branch: `feature/mvp1-ai-rc7-final-release-cleanup`
- Scope: RC7 Block 9 final OpenAI and Claude real AI coverage pass across active MVP1-AI entry points.

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

## Provider Boundary Summary

| Area | RC7 status |
| --- | --- |
| Server-side route | Active real AI entry points call `/api/ai/run-skill`; provider adapters are not imported by client components. |
| OpenAI | Server-side adapter in `src/lib/ai/providers/openai-provider.ts`; configured with `AI_DEFAULT_PROVIDER=openai`, `OPENAI_API_KEY`, and `OPENAI_DEFAULT_MODEL` or `AI_MODEL`. |
| Claude | Server-side adapter in `src/lib/ai/providers/claude-provider.ts`; configured with `AI_DEFAULT_PROVIDER=claude`, `ANTHROPIC_API_KEY`, and `CLAUDE_DEFAULT_MODEL` or `AI_MODEL`. |
| Product / Platform AI | Server-side adapter in `src/lib/ai/providers/product-ai-provider.ts`; configured with `AI_DEFAULT_PROVIDER=product-ai`, `PRODUCT_AI_BASE_URL`, optional `PRODUCT_AI_API_KEY`, and `PRODUCT_AI_DEFAULT_MODEL` or `AI_MODEL`. |
| Local / mock | Always available through mock provider or deterministic local fallback when real AI flags are off, data mode is `local-only`, selected provider is `mock`, or provider env is incomplete. |
| Browser API keys | No client component should read provider secrets. Audit search found provider secrets only in server/provider files, `.env.example`, and setup docs. |
| Direct browser provider calls | No OpenAI or Anthropic provider endpoint calls were found in browser components. |
| Output handling | Route-backed outputs are schema-validated before success. UI surfaces keep output as draft, recommendation, review finding, or preview. |
| Audit metadata | Route returns safe provider metadata; UI logs local `ai_call` / action metadata where current architecture supports it. Full prompts and full model outputs are not stored in local AI Run History. |

## Coverage Matrix

| Skill / entry point | UI section | OpenAI status | Claude status | Product / Platform AI status | Local status | Validation status | Known limitations | Manual test steps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `input-brief-to-ptr` | Input with AI / Manual Input | Ready via `/api/ai/run-skill` with `ENABLE_REAL_AI=true` and OpenAI server env | Ready with Claude server env | Ready with Product AI endpoint env | Mock/local draft fallback | `validateStructuredProcessBrief`, brief quality gate, `validateDraftProcessTaskRegister`, draft quality gate | User must approve Replace/Append; cloud consent is required before provider-backed call | Fill Manual Input, click Generate Draft PTR with AI, verify draft preview appears and PTR is unchanged until explicit apply |
| `chat-to-ptr-draft` | Input with AI / Chat / Notes | Ready via server route | Ready via server route | Ready via server route | Mock/local notes-to-draft fallback | Chat/notes input validation, Draft PTR schema, draft quality gate | Pasted notes only; no persistent chat connector or memory | Paste workshop notes, generate draft, edit notes, confirm stale validation/draft is cleared |
| `file-to-ptr-draft` | Input with AI / Import File | Ready for local extracted file text via server route | Ready for local extracted file text | Ready for local extracted file text | Mock/local PDF/DOCX text fallback; Excel can remain deterministic import | File context validation, Draft PTR schema, draft quality gate | OCR/image extraction is unsupported; Excel import may bypass real AI because it already produces PTR rows | Import supported file text, generate draft PTR, verify preview and no auto-apply |
| `process-improvement-recommendation` | Process Task Register / AI Assistant | Ready via server route with `ENABLE_REAL_AI=true` | Ready via server route | Ready via server route | Deterministic recommendation fallback | `ProcessTask[]` input validation, `validateAIQARecommendations`, target step checks, graph-changing safety | UI label is AI Assistant; route skill id is shared for PTR improvements | Click AI Assistant with no row selected, verify full-table recommendations go to QA Engine and require preview/confirmation |
| `ai-process-qa` | QA Engine / Generate AI recommendations | Ready with `ENABLE_REAL_AI_QA=true` | Ready with `ENABLE_REAL_AI_QA=true` | Ready with `ENABLE_REAL_AI_QA=true` | `runMockAIQA` fallback | `validateAIQARecommendations`, operation refs, risk/confidence enums, graph-changing normalization | Uses QA-specific feature flag; provider output quality still depends on JSON compliance | Run Generate AI recommendations, verify recommendations list and no direct apply |
| `artifact-review` for BPMN | Generate D01 BPMN XML / Review BPMN with AI | Ready via shared `artifact-review` route | Ready via shared route | Ready via shared route | Deterministic artifact warning fallback | Artifact payload validation, `ArtifactReviewResponse`, PTR recommendation validation, template recommendation validation | No direct BPMN XML mutation; template findings are review-only | Generate BPMN, click Review BPMN with AI, verify QA Engine receives source `BPMN AI Review` recommendations |
| `artifact-review` for Service Blueprint | Generate D02 Service Blueprint / Review Service Blueprint with AI | Ready via shared `artifact-review` route | Ready via shared route | Ready via shared route | Deterministic artifact warning fallback | Same `ArtifactReviewResponse` validation path | No direct draw.io XML mutation | Generate Service Blueprint, click Review Service Blueprint with AI, verify QA Engine receives source `Service Blueprint AI Review` recommendations |
| `ai-template-review` / `template-review` | Template Hub / Review template with AI | Ready with `ENABLE_REAL_AI_TEMPLATE_REVIEW=true` | Ready with template review flag and Claude env | Ready with template review flag and Product AI env | `runMockTemplateReview` fallback | Selected template validation, `validateTemplateReviewOutput`, quality score/warnings/assumptions checks | Recommendations are review-only; user edits/saves template explicitly | Click Review template with AI, verify recommendations/score display and no template auto-save |
| Product Delivery Generate All | Product Delivery header | Ready after RC7 Block 9 wiring; calls `ptr-to-brd`, `brd-to-srs`, `srs-to-user-stories`, `user-stories-to-acceptance-criteria`, and `product-scope-review` through server route | Ready through the same route sequence | Ready through the same route sequence | Server mock/local fallback for each route-backed skill | Each step uses the skill-specific canonical validation and quality gate before preview state is updated | Does not generate/export AI Handoff Pack ZIP; user previews Handoff separately | Click Generate All Product Delivery, verify BRD/SRS/Stories/AC/Scope previews populate and no file is exported or applied |
| `ptr-to-brd` / `notes-to-brd` | Product Delivery / BRD card | Ready via server route | Ready via server route | Ready via server route | Deterministic BRD fallback | BRD schema validation and BRD quality gate | Preview/export only; no Artifact Graph persistence | Generate BRD from PTR and notes, verify JSON download is disabled until preview exists |
| `brd-to-srs` / `notes-to-srs` | Product Delivery / SRS card | Ready via server route | Ready via server route | Ready via server route | Deterministic SRS fallback | SRS schema validation and SRS quality gate | `ptr-to-srs-outline` remains a legacy/deterministic-style path, not the primary UI action | Generate SRS from BRD or notes, verify preview-only behavior |
| `srs-to-user-stories` / `brd-to-user-stories` | Product Delivery / User Stories card | Ready via server route | Ready via server route | Ready via server route | Deterministic UserStorySet fallback | User Story Set schema validation and user story quality gate | Legacy `brd-or-notes-to-user-stories` remains compatible but is not primary UI | Generate stories from SRS/BRD, verify preview and no persistence |
| `user-stories-to-acceptance-criteria` | Product Delivery / Acceptance Criteria card | Ready via server route | Ready via server route | Ready via server route | Deterministic AC fallback | Acceptance Criteria schema validation and AC quality gate | Requires user stories or enough PTR context | Generate AC, verify Given/When/Then-style preview and JSON export only after preview |
| `product-scope-review` / `mvp-slicing` | Product Delivery / Scope/MVP card | Ready via server route | Ready via server route | Ready via server route | Deterministic ProductScopeReview fallback | Product Scope Review schema validation and scope quality gate | Scope/MVP remains preview/export only; not persisted as backlog | Run Scope/MVP actions, verify in/out scope and MVP slice preview |
| `user-stories-to-ai-coding-pack` | Product Delivery / AI Handoff Pack card | Ready via server route | Ready via server route | Ready via server route | Deterministic Product Delivery coding pack fallback | AI Coding Pack response validation and coding pack quality gate | ZIP export remains separate after preview; no generated code is applied | Preview Handoff Pack, inspect included files, then download ZIP |
| `ptr-to-ai-coding-pack` | Output/legacy PTR Handoff Pack | Limited/deterministic in active UI | Limited/deterministic in active UI | Limited/deterministic in active UI | Deterministic generator | Normalized deterministic file shape and coding pack quality gate | Route-backed real provider path for handoff is `user-stories-to-ai-coding-pack` | Generate PTR handoff preview/export and verify no external provider call is claimed |

## Not In RC7 Real Provider Coverage

| Skill | Status | Reason |
| --- | --- | --- |
| `template-recommendation` | Deterministic/local only | Template filtering/recommendation is not currently a provider-backed AI route. |
| `user-stories-to-jira-export` | Planned | No dedicated UI or route-backed implementation in RC7. |
| `scope-nonscope-definition` | Planned | Current Scope/MVP behavior is covered by `product-scope-review` and `mvp-slicing`. |

## Verification Instructions

### Mock / Local

1. Set `ENABLE_REAL_AI=false`, `ENABLE_REAL_AI_QA=false`, and `ENABLE_REAL_AI_TEMPLATE_REVIEW=false`.
2. Set `AI_DEFAULT_PROVIDER=mock` or leave provider env incomplete.
3. Run each UI action in the coverage matrix.
4. Expected: `mode=mock` or local deterministic fallback, `externalApiCalled=false`, output appears only in draft/recommendation/review/preview surfaces, and no output is auto-applied.

### OpenAI

1. Set server env:
   - `ENABLE_REAL_AI=true`
   - `ENABLE_REAL_AI_QA=true`
   - `ENABLE_REAL_AI_TEMPLATE_REVIEW=true`
   - `AI_DEFAULT_PROVIDER=openai`
   - `OPENAI_API_KEY=<server-side only>`
   - `OPENAI_DEFAULT_MODEL=<approved OpenAI model>` or `AI_MODEL=<approved OpenAI model>`
   - `AI_ALLOW_CLOUD=true`
   - `AI_REQUIRE_APPROVAL=true`
   - `AI_DATA_USAGE_MODE=no-training` or another approved mode
2. In AI Connection Center, enable cloud AI consent.
3. Run representative actions: Input with AI, QA Engine, PTR AI Assistant, D01/D02 review, Template review, Product Delivery Generate All, Scope/MVP, and AI Handoff Pack.
4. Expected: browser calls only `/api/ai/run-skill`; returned metadata shows OpenAI/provider-backed execution; schema validation passes before preview.

### Claude

1. Set server env:
   - `ENABLE_REAL_AI=true`
   - `ENABLE_REAL_AI_QA=true`
   - `ENABLE_REAL_AI_TEMPLATE_REVIEW=true`
   - `AI_DEFAULT_PROVIDER=claude`
   - `ANTHROPIC_API_KEY=<server-side only>`
   - `CLAUDE_DEFAULT_MODEL=<approved Claude model>` or `AI_MODEL=<approved Claude model>`
   - `AI_ALLOW_CLOUD=true`
   - `AI_REQUIRE_APPROVAL=true`
   - `AI_DATA_USAGE_MODE=no-training` or another approved mode
2. Repeat the OpenAI representative checks.
3. Expected: same route, validation, and preview behavior, with `providerId=claude` metadata.

### Product / Platform AI

1. Set server env:
   - `ENABLE_REAL_AI=true`
   - `ENABLE_REAL_AI_QA=true`
   - `ENABLE_REAL_AI_TEMPLATE_REVIEW=true`
   - `AI_DEFAULT_PROVIDER=product-ai`
   - `PRODUCT_AI_BASE_URL=<server-side endpoint>`
   - `PRODUCT_AI_API_KEY=<server-side only, if required>`
   - `PRODUCT_AI_DEFAULT_MODEL=<approved Product AI model>` or `AI_MODEL=<approved Product AI model>`
   - `AI_ALLOW_CLOUD=true`
   - `AI_REQUIRE_APPROVAL=true`
2. Run representative actions.
3. Expected: provider-backed output if endpoint returns parseable structured content; otherwise safe provider/validation error without auto-apply.

### Missing Env / Fallback

1. Enable the relevant real AI flag but omit the provider key/model/endpoint.
2. Run the same UI action.
3. Expected: route falls back to mock/local output; UI must not imply an external API call; `externalApiCalled=false`.

## RC7 Findings

1. Active OpenAI and Claude coverage is adapter-generic: once a skill is registered, route-backed, and allowed for all providers, both providers use the same server-side orchestration, schema validation, quality gates, and preview behavior.
2. No client-side provider API key exposure or direct browser OpenAI/Claude provider call was found during code inspection.
3. `Product Delivery Generate All` was the main RC7 wiring gap. It is now route-backed and chains existing validated Product Delivery skills instead of creating all artifacts purely in browser deterministic code.
4. Product AI remains ready at adapter level but depends on the configured endpoint returning parseable structured content compatible with skill schemas.
5. Audit remains split between safe server metadata returned by `/api/ai/run-skill` and browser-local audit/AI Run History. Durable server-side audit is still future work.
6. AI output remains draft/recommendation/review/preview only. No audited entry point auto-applies AI output.
