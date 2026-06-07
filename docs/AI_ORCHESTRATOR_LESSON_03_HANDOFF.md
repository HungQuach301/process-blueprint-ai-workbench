# AI Orchestrator Lesson 03 Handoff

Date: 2026-05-24

Lesson: Bai 3 - Structured Output & Schema Engineering

Source documents and code reviewed:

- `AGENTS.md`
- `docs/SESSION_HANDOFF.md`
- `docs/AI_ORCHESTRATOR_LESSON_02_HANDOFF.md`
- `docs/STRUCTURED_OUTPUT_SCHEMA_AUDIT.md`
- `docs/AI_SKILL_CONTRACT_MATRIX.md`
- `docs/AI_SKILL_DESIGN_REVIEW.md`
- `docs/AI_SKILL_REDESIGN_PLAN.md`
- `src/app/api/ai/run-skill/route.ts`
- `src/lib/ai/providers/provider-types.ts`
- `src/lib/ai/providers/openai-provider.ts`
- `src/lib/ai/output-schemas/`
- `evals/input-brief-to-ptr/`
- `evals/process-improvement-recommendation/`
- `evals/artifact-review/`
- `package.json`

## 1. Lesson 03 Summary

Bai 3 moved the AI Orchestrator from prompt-only contracts toward provider-native structured output for the three core process-modeling skills.

The lesson goal was:

- Make provider output shape deterministic where OpenAI supports native `json_schema`.
- Keep validators as the final authority before preview, apply, or export.
- Reduce `schema_validation_failed` and `provider_output_normalization_failed` by constraining provider output earlier.
- Add repeatable eval smoke tests so schema work can be measured, not only inspected manually.

Product improvements completed:

- `input-brief-to-ptr` remains the reference structured-output path.
- `process-improvement-recommendation` now has a strict recommendation response schema.
- `artifact-review` now has a strict review response schema that forbids direct artifact rewrite.
- OpenAI schema selection is now skill-aware instead of hardcoded to one skill.
- Eval coverage now includes `process-improvement-recommendation` and `artifact-review`.

The most important lesson:

> Structured output is not a substitute for validation or eval. It is an earlier contract layer that makes validation failures less likely and easier to diagnose.

## 2. Completed Work

### Structured Output Coverage

- Added and verified existing structured output schema support for `input-brief-to-ptr` through `DRAFT_PTR_OUTPUT_SCHEMA`.
- Added `QA_RECOMMENDATION_OUTPUT_SCHEMA` for `process-improvement-recommendation`.
- Added `ARTIFACT_REVIEW_OUTPUT_SCHEMA` for `artifact-review`.
- Added `AIProviderStructuredOutputSchema` to provider request typing.
- Updated the OpenAI provider to use `request.structuredOutputSchema` when structured output is enabled.
- Updated `/api/ai/run-skill` to map structured schemas by skill:
  - `draft_process_task_register`
  - `qa_recommendation_response`
  - `artifact_review_response`

### Eval Coverage

- Added `evals/process-improvement-recommendation/dataset.json`.
- Added `evals/process-improvement-recommendation/run-eval.ts`.
- Added `evals/artifact-review/dataset.json`.
- Added `evals/artifact-review/run-eval.ts`.
- Added package scripts:
  - `npm run test:eval:process-improvement`
  - `npm run test:eval:artifact-review`

### Prompt and Compatibility Notes

- Prompt packs were tightened during implementation so each structured skill asks for the same object shape expected by schema and validators.
- `artifact-review` uses provider-facing `artifactWarnings` in the new schema, then route compatibility maps this to validator-facing `warnings`.
- No direct BPMN/draw.io XML patching was introduced.

## 3. Structured Output Architecture

Current route flow:

1. Validate input with `validateAISkillInput`.
2. Resolve selected provider and model.
3. Resolve structured output schema by skill and provider.
4. Build `AIModelRequest` with:
   - `supportsStructuredOutput`
   - `structuredOutputSchema`
   - runtime options
   - prompt messages
5. Call provider server-side.
6. Adapt provider response into extracted text/content.
7. Parse JSON.
8. Normalize provider output.
9. Validate with `validateAISkillOutput`.
10. Run quality gates where available.
11. Return draft/recommendation/review output for preview, approval, or export.

Architecture rule:

- The route selects schema by skill.
- The provider receives the selected `structuredOutputSchema`.
- OpenAI uses native Responses API `text.format.type = "json_schema"` where available.
- The normalizer remains a fallback after provider output, not the primary defense.
- Schema validation remains mandatory before preview/apply/export.

Provider behavior:

- OpenAI: native `json_schema` is wired for the covered skills.
- Claude: still prompt-constrained and validator-protected.
- Product AI: still provider-backed but must pass the same route/validator path.
- Mock/local: deterministic fallback remains available.

## 4. Skill Coverage

### `input-brief-to-ptr`

Current schema status:

- OpenAI `json_schema` exists and is wired.
- Schema: `DRAFT_PTR_OUTPUT_SCHEMA`.
- Schema name: `draft_process_task_register`.

Output contract:

```ts
{
  draftProcessTasks: ProcessTask[];
  assumptions: string[];
  openQuestions: string[];
  qualityIssues: string[];
  sourceSummary: string;
  confidence: "low" | "medium" | "high";
  inputLanguage: "vi" | "en";
  outputLanguage: "vi" | "en" | "bilingual";
}
```

Validation path:

- `validateStructuredProcessBrief`
- `validateDraftProcessTaskRegister`
- `runDraftProcessTaskRegisterQualityGate`

Eval status:

- Dataset and runner exist in `evals/input-brief-to-ptr/`.
- Existing `npm run test:eval` runs this eval.
- Latest known run in this shell failed because the local dev server was not running at `http://localhost:3000`.

Known limitations:

- Schema pass does not guarantee semantic process quality.
- Known eval gaps include actor completeness, gateway generation, low confidence for weak briefs, and gateway count for complex cases.

Next action:

- Run full eval with dev server running.
- Improve semantic prompt/quality gate after provider/schema reliability is stable.

### `process-improvement-recommendation`

Current schema status:

- OpenAI `json_schema` has been added.
- Schema: `QA_RECOMMENDATION_OUTPUT_SCHEMA`.
- Schema name: `qa_recommendation_response`.

Output contract:

```ts
{
  recommendations: QARecommendation[];
}
```

Each recommendation is constrained to reviewable fields such as:

- `id`
- `source`
- `title`
- `description`
- `rationale`
- `confidence`
- `impact`
- `riskLevel`
- `targetStepIds`
- `recommendationType`
- `operations`
- `previewText`
- `warnings`
- `requiresConfirmation`

Validation path:

- `validateProcessTaskArrayInput`
- `validateAISkillOutput`
- `validateAIQARecommendations`
- graph-changing risk enforcement remains in route/validator flow

Eval status:

- Dataset and runner exist in `evals/process-improvement-recommendation/`.
- Runner defaults to `EVAL_PROVIDER_ID=mock`.
- Script: `npm run test:eval:process-improvement`.

Known limitations:

- json_schema cannot know whether step references exist in the current PTR. Validator must keep checking this.
- Real provider behavior still needs smoke testing with OpenAI enabled.
- Operation schema is strict enough for smoke coverage, but complex graph-changing operations may need future edge-case tests.

Next action:

- Run mock eval with dev server running.
- Run one OpenAI provider-backed smoke test and inspect token/latency.
- Add negative fixtures for missing/invalid `targetStepIds`.

### `artifact-review`

Current schema status:

- OpenAI `json_schema` has been added.
- Schema: `ARTIFACT_REVIEW_OUTPUT_SCHEMA`.
- Schema name: `artifact_review_response`.

Output contract:

```ts
{
  recommendations: QARecommendation[];
  templateRecommendations: TemplateRecommendation[];
  artifactWarnings: string[];
  assumptions: string[];
  openQuestions: string[];
}
```

Runtime compatibility:

- Provider-facing `artifactWarnings` is mapped to validator-facing `warnings` in the route.
- Existing validator remains `validateArtifactReviewResponse`.

Validation path:

- `validateProcessTaskArrayInput`
- route payload check for artifact type, XML, process tasks, and selected template
- `normalizeProviderOutput`
- `validateArtifactReviewResponse`
- `validateAIQARecommendations`
- `validateTemplateReviewOutput` for template recommendations

Eval status:

- Dataset and runner exist in `evals/artifact-review/`.
- Runner defaults to `EVAL_PROVIDER_ID=mock`.
- Script: `npm run test:eval:artifact-review`.

Known limitations:

- The skill is still broad: BPMN review and Service Blueprint review share one compatibility skill.
- Artifact review may still be token-heavy if full XML is sent.
- A later split into `bpmn-artifact-review` and `service-blueprint-artifact-review` is still recommended.

Next action:

- Run mock eval with dev server running.
- Run one OpenAI provider-backed smoke test.
- Optimize context to send XML summaries/excerpts rather than full XML by default.

## 5. Validation / Test Results

Latest known status from this workstream:

| Check | Latest known status | Notes |
|---|---|---|
| `npx.cmd tsc --noEmit` | Passed | Last run after eval/schema work passed. |
| `npm run build` | Passed | Last build completed successfully. |
| `npm run test:eval` | Failed in this shell | Input Brief eval runner executed, but `http://localhost:3000/api/ai/run-skill` was not running. |
| `npm run test:eval:process-improvement` | Not yet run with server | Requires local dev server. Defaults to mock provider. |
| `npm run test:eval:artifact-review` | Not yet run with server | Requires local dev server. Defaults to mock provider. |

Eval operating notes:

- Eval runners require a local server at `http://localhost:3000`.
- Start the app separately with `npm run dev` before running evals.
- `EVAL_API_URL` can override the API endpoint.
- `EVAL_PROVIDER_ID` can override provider, defaulting to `mock` for the new evals.
- Generated `results-*.json` files are execution artifacts and should not be committed.

## 6. Governance Confirmed

Bai 3 preserved the core product governance model:

- No browser API key.
- Server-side route only.
- No direct browser provider calls.
- No auto-apply.
- Mock/local fallback preserved.
- D01/D02 generators unchanged.
- Provider output remains draft/recommendation/review output before user action.
- AI output must pass parse, normalize, validation, and quality gates where relevant.
- Human preview and approval remain mandatory before process or template changes are applied.

## 7. Remaining Risks

### Schema Pass Is Not Product Quality

Eval quality may still be low even when schema validation passes. This is especially true for `input-brief-to-ptr`, where process semantics such as gateways, actors, and exception handling matter.

### Artifact Review Context Is Still Heavy

`artifact-review` may still be token-heavy. The current schema reduces output chaos, but it does not yet solve input context size. The next improvement should reduce artifact context and avoid full XML by default.

### Real Provider Behavior Still Needs Smoke Tests

Mock/local evals are necessary but not sufficient. OpenAI provider-backed runs should be tested for:

- schema acceptance,
- valid output,
- token usage,
- latency,
- warnings,
- validation pass rate.

### Normalizer Should Not Become Primary Defense

The normalizer should remain a fallback for minor provider aliases and wrappers. It should not be asked to rescue unconstrained provider output for high-risk skills.

### Schema Complexity Risk

Deep operation schemas can become hard to maintain. If OpenAI rejects a schema, rollback should disable schema selection for only the affected skill and keep validators intact.

## 8. Entry Criteria for Bai 4

Bai 4 should focus on Provider Routing & Cost Optimization.

Entry criteria:

- Structured output schema coverage exists for the three core skills:
  - `input-brief-to-ptr`
  - `process-improvement-recommendation`
  - `artifact-review`
- Route-level schema resolver exists.
- OpenAI provider can receive request-level `structuredOutputSchema`.
- Eval runners exist for the two newly covered skills.
- TypeScript and production build pass.
- Governance constraints remain intact.

Bai 4 should define:

- Provider routing policy.
- Cost tracker.
- Fallback chain.
- Skill x provider decision matrix.
- Token/cost baseline per skill.
- Provider capability policy for structured output, reasoning, thinking mode, context window, and latency.

## 9. Next Recommended Tasks

1. Run the full eval suite with local dev server running:
   - `npm run test:eval`
   - `npm run test:eval:process-improvement`
   - `npm run test:eval:artifact-review`
2. Confirm the new eval result files are reviewed but not committed.
3. Run one OpenAI smoke test for `process-improvement-recommendation`.
4. Run one OpenAI smoke test for `artifact-review`.
5. Capture token/latency baseline for all three covered skills.
6. Commit and push Bai 3 once eval smoke status is accepted.
7. Start Bai 4: Provider Routing & Cost Optimization.

## 10. Exact Bai 4 Starting Point

Recommended first Bai 4 document:

- `docs/PROVIDER_ROUTING_COST_OPTIMIZATION_PLAN.md`

Recommended first Bai 4 implementation questions:

- Which provider should serve each skill by default?
- Which skills require native structured output?
- Which skills are safe to run on local/mock fallback?
- When should the route fallback from OpenAI to local/mock?
- How should token usage and latency be recorded per skill?
- What is the cost ceiling per skill for demo, MVP, and enterprise modes?

The next orchestrator slice should treat provider choice as a governed runtime decision, not a UI preference alone.
