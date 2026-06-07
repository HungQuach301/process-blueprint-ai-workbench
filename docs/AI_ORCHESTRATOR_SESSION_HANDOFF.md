# Session Handoff — AI Orchestrator Learning + Product

## Date: 2026-05-23

## AI Orchestrator Learning Status
- Bai 1: HOAN THANH
  - Exercise 1.1: Token audit, fix 4 bugs, Provider Response Adapter Layer
  - Exercise 1.2: OpenAI json_schema Structured Outputs for input-brief-to-ptr
  - Exercise 1.3: Eval dataset 5 cases, automated grading, baseline 20%
  - Exercise 1.4: Multi-skill latency/token baseline
- Bai 2-12: Chua bat dau
- Curriculum file: docs/AI_ORCHESTRATOR_CURRICULUM_OVERVIEW.md (trong Claude project knowledge)

## Product Status
- Branch: feature/quality-gate-overhaul
- input-brief-to-ptr: WORKING (json_schema, validation pass)
- process-improvement-recommendation: FAILING (schema_validation_failed, chua co json_schema)
- artifact-review: FAILING (provider_output_normalization_failed, chua co json_schema)
- Provider Adapter Layer: DONE (src/lib/ai/providers/response-adapter.ts)
- Output schema: DONE for input-brief-to-ptr (src/lib/ai/output-schemas/)
- P0 UI fixes: DONE
- P1 UI fixes: DONE
- Final UI adjustments: 6 Codex prompts written, NOT executed

## Key Files Modified
- src/app/api/ai/run-skill/route.ts (extraction fix, logging, adapter wire)
- src/lib/ai/providers/response-adapter.ts (NEW - adapter layer)
- src/lib/ai/output-schemas/draft-ptr-output-schema.ts (NEW - json_schema)
- src/lib/ai/prompt-packs.ts (schema instructions added)
- src/lib/ai/providers/openai-provider.ts (Responses API fix)
- evals/input-brief-to-ptr/dataset.json (NEW - eval dataset)
- evals/input-brief-to-ptr/run-eval.ts (NEW - eval runner)
- docs/TOKEN_USAGE_BASELINE.md (NEW)
- docs/LATENCY_TOKEN_BASELINE.md (NEW)

## Token Baseline
- input-brief-to-ptr: 2450 in / 1355 out / 3540 total / 15.8s / ~0.003 USD / PASS
- process-improvement-recommendation: 3248 in / 655 out / 11.5s / FAIL
- artifact-review: 12251 in / 2218 out / 29.6s / FAIL

## Next Steps (in order)
1. Execute 6 UI Codex prompts (A-F) from UI_ADJUSTMENTS_FINAL_CODEX_PROMPTS.md
2. Bai 2: AI Skill Design - create json_schema for failing skills
3. Continue Bai 3-12

## Key Architecture Decisions
- Provider Adapter Layer: unified extraction for all providers
- json_schema enforcement: required for all skills on OpenAI
- Prompt packs must include exact output schema
- Human-in-the-loop: AI output -> Draft -> Preview -> User approve -> Apply
- No API key in browser, server-side only
