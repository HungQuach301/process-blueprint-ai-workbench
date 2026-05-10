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

- The branch may still need to be created or switched in git if it does not already exist.
- Module 2 and Module 3 real AI route/UI wiring still needs scoped task breakdown using Registry V2.
- Product Delivery deterministic markdown output still needs structured adapters or route support for the new BRD/SRS/story/criteria schemas.
- Product AI endpoint contract is generic and needs integration testing with the actual hosted Product AI service.
- Claude/OpenAI schema repair and retry behavior are not implemented yet.
- Full Artifact Graph is intentionally not part of MVP1-AI.

## Next recommended task

Wire Registry V2 into `/api/ai/run-skill` for prompt selection and validation dispatch, then verify active skills against each provider mode with feature flags on/off.

## Exact prompt for next ChatGPT session

Paste this:

"Day la phien tiep theo cua Process Blueprint AI Workbench. Hay doc context trong project/repo, dac biet PRODUCT_CONTEXT.md, CURRENT_STATE.md, NEXT_IMPLEMENTATION_PLAN.md, ROADMAP.md, AI_SKILL_REGISTRY.md, DECISION_LOG.md va SESSION_HANDOFF.md. Truoc tien hay tom tat trang thai hien tai, quyet dinh da chot, viec can lam tiep theo, sau do moi de xuat plan."

## Exact prompt for next Codex session

Paste this:

"Ban dang lam trong repo D:\AI_PRODUCTS\process-blueprint-ai-workbench. Hay doc AGENTS.md va cac tai lieu docs/CURRENT_STATE.md, docs/PRODUCT_CONTEXT.md, docs/NEXT_IMPLEMENTATION_PLAN.md, docs/ROADMAP.md, docs/AI_SKILL_REGISTRY.md, docs/DECISION_LOG.md, docs/SESSION_HANDOFF.md truoc khi code. Sau do chay git status --short. Neu can sua file, hay neu plan bang tieng Viet, liet ke file du kien sua, roi moi trien khai thay doi nho nhat can thiet. Current phase la Complete Module 2 + Module 3 with full real AI support, branch muc tieu la feature/m2-m3-full-ai, release target la v0.8.0-mvp1-ai."
