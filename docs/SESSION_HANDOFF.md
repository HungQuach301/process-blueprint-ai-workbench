# Session Handoff

## Last updated

2026-05-10

## Current branch

`feature/m2-m3-full-ai`

## Current product phase

Complete Module 2 + Module 3 with full real AI support.

## Release target

`v0.8.0-mvp1-ai`

## What was done in the last session

- Completed AI QA and AI Recommendation V2 hardening for Process Modeling Core.
- Updated QA Panel so AI QA receives `ProcessTask[]`, rule-based QA issues, existing rule recommendations, and selected D01/D02 template metadata.
- Hardened `QARecommendation[]` validation for AI output: source `ai`/`hybrid`, confidence/impact/risk, target step ids, operation kinds, operation step references, and graph-changing safety.
- Normalized graph-changing AI recommendations to high impact/high risk with explicit confirmation required.
- Updated mock AI QA to use rule issue/recommendation context and return hybrid recommendations when extending rule recommendations instead of duplicating them blindly.
- Preserved existing Select safe, Apply selected confirmation, and local feedback logging behavior.
- Updated `docs/AI_IMPLEMENTATION_MATRIX.md` for AI QA/Recommendation V2 behavior.
- Added PTR AI Assistant selected-row actions in Process Task Register.
- Added row selection checkboxes and an AI Assistant menu for normalize, infer actor/system/lane, improve wording, split complex task, generate input/output, and suggest interaction/channel.
- Wired PTR AI Assistant actions to `/api/ai/run-skill` with skill id `process-improvement-recommendation`.
- Returned AI Assistant output as `QARecommendation[]` surfaced through the existing QA Panel recommendation workflow.
- Preserved no direct mutation: recommendations still require QA Panel preview/confirmation before apply.
- Added deterministic mock/local route support for `process-improvement-recommendation` and allowed provider-backed Product AI/OpenAI/Claude execution through Orchestration V2.
- Kept split task recommendations high risk/graph-changing so they are not selected by Select safe.
- Updated `docs/AI_IMPLEMENTATION_MATRIX.md` for PTR AI Assistant route/UI support.
- Completed Module 2 route-backed Draft PTR generation from three sources: structured Manual Input, File Intake extracted text, and pasted Chat/Notes.
- Added route/registry support for `file-to-ptr-draft` and `chat-to-ptr-draft`, with legacy route aliases for `file-to-draft-ptr` and `chat-to-draft-ptr`.
- Added `qualityIssues` to the Draft PTR contract and validation path.
- Wired File Intake PDF/DOCX extracted text through `/api/ai/run-skill` for Product AI/OpenAI/Claude/Mock support; image/OCR remains unsupported.
- Added a Manual Input Chat/Notes card that generates a Draft PTR preview through `/api/ai/run-skill`.
- Kept Apply as explicit Replace/Append only and preserved artifact stale marking after apply.
- Updated `docs/AI_SKILL_REGISTRY.md` and `docs/AI_IMPLEMENTATION_MATRIX.md` for Module 2 draft PTR skills.
- Completed the AI Connection Center provider surface for Product AI, OpenAI, Claude, and Local/Mock.
- Added provider cards with server-derived statuses: `configured`, `missing env`, `disabled`, and `available`.
- Added a Test Connection action that calls `/api/ai/run-skill` server-side and never calls provider APIs directly from the browser.
- Added non-secret Advanced Settings for default provider, model/capability, allow cloud AI, require approval, data usage mode, and simple active-skill provider overrides.
- Updated `.env.example`, `docs/AI_CONNECTION_SETUP.md`, and `docs/AI_IMPLEMENTATION_MATRIX.md` for the completed AI Connection Center behavior.
- Upgraded `/api/ai/run-skill` to AI Orchestration V2 while keeping the same route path.
- Wired route execution to AI Skill Registry V2 for skill validation, prompt pack selection, allowed provider checks, and schema validation dispatch.
- Added route-level provider/data mode enforcement using feature flags, configured provider, allowed providers, provider config status, and optional server `AI_DATA_USAGE_MODE`.
- Added provider timeout handling with optional `AI_PROVIDER_TIMEOUT_MS`.
- Added one scoped malformed-JSON repair attempt for provider output; repaired output still must pass schema validation.
- Added server-safe audit metadata in route responses and server logs without logging full sensitive payloads or full model output.
- Preserved existing deterministic mock/local fallbacks for `input-brief-to-ptr`, `ai-process-qa`, and `ai-template-review`.
- Updated `docs/AI_CONNECTION_SETUP.md` and `docs/AI_IMPLEMENTATION_MATRIX.md` for Orchestration V2 behavior.
- Implemented AI Skill Registry V2 for MVP1-AI under `src/lib/ai/`.
- Added provider-neutral, process modeling, and product delivery prompt pack definitions.
- Added runtime schema helpers for Draft PTR, BRD, SRS, User Story Set, Acceptance Criteria, AI Coding Pack, QARecommendation, and TemplateRecommendation outputs.
- Reused existing canonical validators for StructuredProcessBrief, DraftProcessTaskRegister, QARecommendation, and TemplateRecommendation where available.
- Updated `docs/AI_SKILL_REGISTRY.md` and `docs/AI_IMPLEMENTATION_MATRIX.md` to document Registry V2, prompt packs, schema contracts, and remaining wiring gaps.
- Implemented AI Provider Adapter V2 for Mock, Product AI, OpenAI, and Claude.
- Added a normalized provider response shape with `rawText`, `rawJson`, `parsedJson`, `providerId`, `model`, `requestId`, `tokenUsage`, `latencyMs`, and `warnings`.
- Updated `/api/ai/run-skill` to select providers through a server-side provider factory while preserving existing mock fallback, validation, and preview-first behavior.
- Updated `.env.example`, `docs/AI_CONNECTION_SETUP.md`, and `docs/AI_IMPLEMENTATION_MATRIX.md` for Product AI/OpenAI/Claude/Mock provider support.
- Audited the current AI implementation across the AI skill route, provider types/adapters, AI intake, quality gates, recommendation validation, template review validation, audit log, AI settings UI, AI Input Brief, QA Panel, Template Hub, Product Delivery, and AI Coding Pack export.
- Created `docs/AI_IMPLEMENTATION_MATRIX.md` covering skill id, module, input/output schema, Mock/Product AI/OpenAI/Claude support, validation, UI surface, apply behavior, audit behavior, and gaps.
- Pivoted planning docs from an immediate MVP1 release to MVP1-AI after full Module 2 and Module 3 completion.
- Updated the next implementation plan with the new phase, branch, release target, and priority order.
- Updated the roadmap so MVP1-AI includes full Module 2 Process Modeling Core and Module 3 Product Delivery Core.
- Kept UI/Experience Generation, Business Architecture, and IT/Solution Architecture as future phases.
- Expanded the AI Skill Registry with MVP1-AI skills for Module 2 and Module 3, including status labels: `planned`, `implemented`, `mock`, and `real-ai-ready`.
- Added an ADR to delay release until M2/M3 full AI are complete.
- Did not change application code.

## Files changed

- `src/components/task-register/ProcessTaskRegister.tsx`
- `src/components/qa-panel/QAPanel.tsx`
- `src/app/api/ai/run-skill/route.ts`
- `src/lib/ai/ai-qa-types.ts`
- `src/lib/ai/ai-qa-service.ts`
- `src/lib/ai/skill-registry-v2.ts`
- `src/lib/ai/prompt-packs.ts`
- `src/lib/recommendation-engine/qa-recommendation-schema.ts`
- `docs/AI_SKILL_REGISTRY.md`
- `docs/AI_IMPLEMENTATION_MATRIX.md`
- `docs/SESSION_HANDOFF.md`
- `src/components/input-brief/AIInputBriefPanel.tsx`
- `src/lib/ai-intake/draft-ptr-generator.ts`
- `src/lib/ai-intake/draft-ptr-schema.ts`
- `docs/AI_IMPLEMENTATION_MATRIX.md`
- `src/lib/ai/skill-schemas.ts`
- `src/lib/ai/prompt-packs.ts`
- `src/lib/ai/skill-registry-v2.ts`
- `src/lib/ai/providers/provider-types.ts`
- `src/lib/ai/providers/mock-provider.ts`
- `src/lib/ai/providers/product-ai-provider.ts`
- `src/lib/ai/providers/openai-provider.ts`
- `src/lib/ai/providers/claude-provider.ts`
- `src/lib/ai/providers/provider-factory.ts`
- `src/app/api/ai/run-skill/route.ts`
- `.env.example`
- `docs/AI_CONNECTION_SETUP.md`
- `docs/AI_IMPLEMENTATION_MATRIX.md`
- `docs/NEXT_IMPLEMENTATION_PLAN.md`
- `docs/ROADMAP.md`
- `docs/AI_SKILL_REGISTRY.md`
- `docs/DECISION_LOG.md`
- `docs/SESSION_HANDOFF.md`

## Important decisions made

- AI QA V2 treats rule QA as the first-pass source of deterministic issues and recommendations.
- AI QA may return `source=hybrid` when it extends a rule recommendation with extra rationale/context.
- Graph-changing AI recommendations are always high risk/high impact and require explicit confirmation, regardless of provider output.
- PTR AI Assistant uses `process-improvement-recommendation` rather than adding six separate skill ids for this slice; the selected action is carried in `metadata.ptrAiAction`.
- PTR AI Assistant outputs `QARecommendation[]` so it can reuse existing QA Panel preview/apply/feedback behavior.
- PTR AI Assistant does not mutate `ProcessTask[]` directly.
- Module 2 Draft PTR source skills now use canonical route ids `input-brief-to-ptr`, `file-to-ptr-draft`, and `chat-to-ptr-draft`.
- `qualityIssues` is now part of the Draft PTR AI output contract alongside assumptions, open questions, source summary, confidence, and quality gate warnings.
- File Intake real AI support uses locally extracted text only; OCR/image extraction remains explicitly unsupported.
- AI Connection Center remains a non-secret browser preference UI; provider secrets stay in server env only.
- Test Connection reports server-side readiness and does not perform direct browser provider calls.
- Per-skill provider overrides are stored as local UI preferences in this slice; server execution remains governed by env/config and AI Orchestration V2.
- `/api/ai/run-skill` remains the controlled server-side AI entrypoint for MVP1-AI.
- Orchestration V2 blocks malformed or schema-invalid AI output and returns reviewable validation errors.
- `ai-template-review` remains the UI/route skill id, mapped internally to registry skill `template-review`.
- Server data mode can force local/mock behavior with `AI_DATA_USAGE_MODE=local-only`.
- AI Skill Registry V2 is now the contract layer for Module 2 and Module 3 real AI work.
- Prompt packs are provider-neutral and do not expose API keys or browser-only provider behavior.
- Module 3 and AI Coding Pack now have target structured response schemas, but route/UI wiring remains a later implementation slice.
- AI Provider Adapter V2 is now the server-side provider abstraction for active AI skill routes.
- Product AI, OpenAI, Claude, and Mock share the same normalized response shape.
- Product AI and Claude are now implemented as server-side adapters, but still require real environment configuration and provider contract testing before production use.
- Product Delivery and AI Coding Pack are deterministic export workflows, not real AI skills yet.
- MVP1 release is delayed until Module 2 Process Modeling Core and Module 3 Product Delivery Core are complete with safe real AI support.
- The active planning branch is now `feature/m2-m3-full-ai`.
- The release target is now `v0.8.0-mvp1-ai`.
- Real AI must remain server-side only, feature-flagged, schema-validated, previewed, and user-approved before apply/save/export.
- Mock/local fallback remains required.
- No API keys should be exposed in browser code.
- AI output must not be auto-applied.

## Current blockers

- Excel File Intake still uses deterministic local row extraction rather than the new real AI file-to-PTR route because it already produces PTR rows directly.
- Pasted Chat/Notes is a lightweight text-to-draft flow only; it is not a persistent conversational agent.
- The branch may still need to be created or switched in git if it does not already exist.
- Module 3 real AI UI flows and deterministic structured adapters still need scoped task breakdown using Registry V2.
- Product Delivery deterministic markdown output still needs structured adapters or route support for the new BRD/SRS/story/criteria schemas.
- Product AI endpoint contract is generic and needs integration testing with the actual hosted Product AI service.
- Provider-specific Claude/OpenAI schema repair and contract tests are not implemented yet; only route-level malformed JSON repair exists.
- AI Connection Center per-skill override is not wired to server execution yet.
- Full Artifact Graph is intentionally not part of MVP1-AI.

## Next recommended task

Verify Module 2 Draft PTR generation across Manual Input, PDF/DOCX File Intake, and Chat/Notes with Mock/Product AI/OpenAI/Claude provider modes, then add structured Module 3 adapters or route skills for BRD/SRS/user stories/acceptance criteria.

## Exact prompt for next ChatGPT session

Paste this:

"Day la phien tiep theo cua Process Blueprint AI Workbench. Hay doc context trong project/repo, dac biet PRODUCT_CONTEXT.md, CURRENT_STATE.md, NEXT_IMPLEMENTATION_PLAN.md, ROADMAP.md, AI_SKILL_REGISTRY.md, DECISION_LOG.md va SESSION_HANDOFF.md. Truoc tien hay tom tat trang thai hien tai, quyet dinh da chot, viec can lam tiep theo, sau do moi de xuat plan."

## Exact prompt for next Codex session

Paste this:

"Ban dang lam trong repo D:\AI_PRODUCTS\process-blueprint-ai-workbench. Hay doc AGENTS.md va cac tai lieu docs/CURRENT_STATE.md, docs/PRODUCT_CONTEXT.md, docs/NEXT_IMPLEMENTATION_PLAN.md, docs/ROADMAP.md, docs/AI_SKILL_REGISTRY.md, docs/DECISION_LOG.md, docs/SESSION_HANDOFF.md truoc khi code. Sau do chay git status --short. Neu can sua file, hay neu plan bang tieng Viet, liet ke file du kien sua, roi moi trien khai thay doi nho nhat can thiet. Current phase la Complete Module 2 + Module 3 with full real AI support, branch muc tieu la feature/m2-m3-full-ai, release target la v0.8.0-mvp1-ai."
