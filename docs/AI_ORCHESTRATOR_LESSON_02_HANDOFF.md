# AI Orchestrator Lesson 02 Handoff

Date: 2026-05-23

Lesson: Bài 2 - AI Skill Design

Source documents:

- `docs/AI_SKILL_CONTRACT_MATRIX.md`
- `docs/AI_SKILL_DESIGN_REVIEW.md`
- `docs/AI_SKILL_REDESIGN_PLAN.md`
- `docs/AI_ORCHESTRATOR_SESSION_HANDOFF.md`
- `docs/SESSION_HANDOFF.md`

## 1. Lesson 02 Summary

Bài 2 moved the work from fixing one provider response bug into designing reliable AI skill contracts.

The key conclusion is:

> A skill is not a prompt. A production skill is an input contract, output contract, provider/runtime policy,
> schema validation, quality gate, risk classification, apply behavior, and eval criteria.

Current state after Bài 2:

- `input-brief-to-ptr` is the strongest skill. It works with OpenAI json_schema and route-level validation.
- `process-improvement-recommendation` is the next highest priority because it fails `schema_validation_failed`.
- `artifact-review` is riskier and broader because it fails `provider_output_normalization_failed` and consumes high tokens.
- The next implementation should not start by adding more prompt text. It should add native structured output schemas,
  tighter route schema selection, evals, and minimal context.

## 2. What Was Learned

### Skill Design Lessons

- Prompt-only JSON is not reliable enough for provider-backed skills that feed UI preview/apply flows.
- Native structured output should be the first control layer when the provider supports it.
- Normalizers are useful for wrapper extraction and minor aliases, but should not be the main safety net.
- Validation catches shape and enum errors, while eval catches product usefulness.
- A schema-valid result can still be a poor process model.

### Orchestrator Lessons

- Provider output should be transformed once into an internal format before parsing/normalization.
- Every skill needs a narrow output contract that maps directly to existing validators.
- Risk and apply behavior are part of the skill contract, not UI afterthoughts.
- Token and latency budgets should influence skill boundaries. Large context often means the skill is too broad.

### Product Lessons

- The Process Task Register remains the source of truth for process artifacts.
- AI should produce drafts, findings, recommendations, and review warnings, not direct mutations.
- Human-in-the-loop is a product feature, not a blocker.
- Business users need useful process quality, not only valid JSON.

## 3. Product Findings

### Production-Ready Enough for Controlled Use

- Server-side-only AI route.
- No browser API keys.
- Provider adapter layer.
- Mock/local fallback.
- `input-brief-to-ptr` OpenAI json_schema.
- Friendly UI handling for AI validation failures.
- Draft / Preview / Approve governance.

### Still Lab-Grade

- `process-improvement-recommendation` under real provider mode.
- `artifact-review` under real provider mode.
- Most non-Draft-PTR AI skills still rely on prompt-only JSON.
- Eval coverage exists only for `input-brief-to-ptr`.
- Token/latency controls are not yet skill-level release gates.

### Real Demo Risks

- `input-brief-to-ptr` may pass schema but fail semantic expectations such as gateways, actors, confidence, and exception paths.
- `process-improvement-recommendation` may fail before reaching preview because output is not a valid `QARecommendation[]`.
- `artifact-review` may consume too many tokens and still fail normalization.

## 4. Skill Design Decisions

| Skill | Decision | Reason |
|---|---|---|
| `input-brief-to-ptr` | Keep current architecture | OpenAI json_schema path is working; remaining issue is semantic process quality |
| `process-improvement-recommendation` | Keep skill, add strict schema next | Output scope is clear if constrained to `QARecommendation[]` |
| `artifact-review` | Keep current compatibility skill, design toward split | BPMN and Service Blueprint review have different context, checks, and eval criteria |

Structured output priority:

1. `process-improvement-recommendation`
2. `ai-process-qa` as a likely reuse of the same recommendation schema
3. `artifact-review` narrowed MVP schema
4. Future split: `bpmn-artifact-review`, `service-blueprint-artifact-review`

## 5. `input-brief-to-ptr` Redesign Notes

Current status:

- Working with OpenAI Structured Outputs.
- Validates as `DraftProcessTaskRegister`.
- Uses `DRAFT_PTR_OUTPUT_SCHEMA`.
- Has eval dataset and runner.

Why schema pass is not enough:

- The eval checks business-process behavior, not only JSON shape.
- Known gaps include:
  - missing `allStepsHaveActor`
  - missing `hasGateway`
  - missing `confidenceLow`
  - missing `gatewayCount`

Likely root causes:

- Schema enforces required fields but not enough semantic modeling rules.
- Prompt asks for gateways but does not force exception-driven decision modeling.
- Quality gate is not yet strict enough on actor completeness, service task use, gateway creation, and low confidence for weak briefs.

Recommended follow-up after failing skills are fixed:

- Add semantic warnings for exception paths without gateways.
- Add semantic warnings for multiple systems without service tasks.
- Add low-confidence rule for minimal briefs.
- Expand eval criteria for source coverage, next-step integrity, actor/system consistency, and task nature.

## 6. `process-improvement-recommendation` Next Schema Task

Goal:

- Stop `schema_validation_failed` by constraining provider output to a strict `QARecommendationResponse` shape.

Proposed file:

- `src/lib/ai/output-schemas/qa-recommendation-output-schema.ts`

Proposed export:

```ts
export const QA_RECOMMENDATION_OUTPUT_SCHEMA = { ... } as const;
```

Target output:

```ts
{
  recommendations: QARecommendation[];
}
```

Required schema fields:

- `title`
- `description`
- `confidence`
- `impact`
- `riskLevel`
- `targetStepIds`
- `previewText`
- `requiresConfirmation`

Important enum values:

- `source`: `ai`, `hybrid`
- `confidence`: `low`, `medium`, `high`
- `impact`: `low`, `medium`, `high`
- `riskLevel`: `low`, `medium`, `high`
- `recommendationType`: `UpdateField`, `SplitTask`, `CreateTask`, `CreateLane`, `AssignSystem`, `AssignActor`, `ChangeBpmnType`, `ChangeRowType`, `SetInteractionType`, `MarkReviewStatus`, `AddGatewayBranch`
- `operation.kind`: `UpdateTaskField`, `CreateTaskAfter`, `CreateTaskBefore`, `InsertTaskBetween`, `SplitTask`, `CreateGateway`, `AddGatewayBranch`, `UpdateConnection`, `CreateLane`, `AssignActor`, `AssignSystem`, `SetInteractionType`, `MarkReviewStatus`

Route task:

- Replace the one-off `input-brief-to-ptr` structured output toggle with a schema resolver.
- Enable `QA_RECOMMENDATION_OUTPUT_SCHEMA` for `process-improvement-recommendation` when provider is OpenAI.
- Keep `validateAIQARecommendations` as the final validator.

Eval task:

- Add `evals/process-improvement-recommendation/dataset.json`.
- Add `evals/process-improvement-recommendation/run-eval.ts`.
- Cover missing actor, missing system, missing input/output, complex task split, missing gateway, and duplicate rule recommendation.

## 7. `artifact-review` Next Schema/Context Optimization Task

Current failure:

- `provider_output_normalization_failed`

Current concern:

- Token baseline is high: 12251 input tokens, 2218 output tokens, 29.6 seconds in the orchestrator handoff.

Decision:

- Do not immediately rewrite all artifact review architecture.
- First add a compatible narrow schema for the current skill.
- Then split into BPMN and Service Blueprint review contracts in a follow-up slice.

Proposed file:

- `src/lib/ai/output-schemas/artifact-review-output-schema.ts`

MVP target output:

```ts
{
  recommendations: QARecommendation[];
  templateRecommendations: TemplateRecommendation[];
  warnings: string[];
}
```

Minimal context strategy:

- Send `artifactType`.
- Send compact PTR summary, not full workspace.
- Send post-generation gate result.
- Send selected template metadata and relevant rules.
- Send XML summaries and small excerpts only.
- Do not send full XML by default.

Prompt task:

- Require object form with `recommendations`, `templateRecommendations`, and `warnings`.
- Forbid XML rewrite.
- Put artifact-only concerns in `warnings`.
- Use `QARecommendation` only for process fixes targeting existing stepIds.
- Use `TemplateRecommendation` only for selected template fixes.

Eval task:

- Add BPMN missing reference case.
- Add BPMN gateway branch case.
- Add BPMN no-issue case.
- Add Service Blueprint overloaded row/phase case.
- Add template mismatch case.
- Add insufficient evidence case.

## 8. Eval Implications

Bài 2 changes the eval strategy:

- Eval is not just a smoke test.
- Eval must distinguish schema pass from product quality.
- Every provider-backed skill that can affect user preview/apply behavior needs an eval dataset.
- Pass rate should become a release gate.

Immediate eval backlog:

1. `process-improvement-recommendation`
2. `artifact-review`
3. `file-to-ptr-draft`
4. `chat-to-ptr-draft`
5. Later: BRD, SRS, User Stories, Acceptance Criteria, Requirement QA, AI Coding Pack

Suggested eval success threshold:

- Minimum 60% pass rate for early development.
- Raise threshold before external demo.
- Always inspect partial failures because they often reveal product quality gaps.

## 9. Bài 3 Entry Criteria

Bài 3 should start only after the Bài 2 handoff is accepted and the next implementation target is clear.

Entry criteria:

- `docs/AI_SKILL_CONTRACT_MATRIX.md` exists.
- `docs/AI_SKILL_DESIGN_REVIEW.md` exists.
- `docs/AI_SKILL_REDESIGN_PLAN.md` exists.
- This lesson handoff exists.
- Exact next implementation tasks are listed.
- No app code has been changed by the Bài 2 documentation work.

Recommended Bài 3 focus:

- Implement structured output schema handling for the next failing skill.
- Add schema edge-case tests.
- Add provider-specific structured output handling patterns.
- Start measuring eval before/after contract changes.

## 10. Exact Next Implementation Tasks

### Task 1: Add QA Recommendation Output Schema

Create:

- `src/lib/ai/output-schemas/qa-recommendation-output-schema.ts`

Then:

- Export `QA_RECOMMENDATION_OUTPUT_SCHEMA`.
- Include strict enums and `additionalProperties: false`.
- Keep final stepId validation in `validateAIQARecommendations`.

### Task 2: Wire OpenAI json_schema for Process Recommendations

Modify:

- `src/app/api/ai/run-skill/route.ts`

Then:

- Add structured schema resolver.
- Keep existing `DRAFT_PTR_OUTPUT_SCHEMA` behavior.
- Add `QA_RECOMMENDATION_OUTPUT_SCHEMA` for `process-improvement-recommendation`.
- Optionally reuse for `ai-process-qa`.
- Do not change provider adapter behavior.

### Task 3: Update QA Recommendation Prompt Pack

Modify:

- `src/lib/ai/prompt-packs.ts`

Then:

- Tighten `process-modeling-qa-recommendation-v1`.
- Require `{ "recommendations": [...] }`.
- Forbid full PTR replacement.
- Require existing stepIds and `requiresConfirmation: true`.

### Task 4: Add Process Recommendation Evals

Create:

- `evals/process-improvement-recommendation/dataset.json`
- `evals/process-improvement-recommendation/run-eval.ts`

Then:

- Run mock/local case.
- Run OpenAI provider-backed smoke case.
- Store timestamped results.

### Task 5: Add Artifact Review Output Schema

Create:

- `src/lib/ai/output-schemas/artifact-review-output-schema.ts`

Then:

- Match current `ArtifactReviewResponse`.
- Reuse or duplicate QA recommendation schema pieces carefully.
- Keep schema narrow first.

### Task 6: Optimize Artifact Review Context

Modify only after schema work:

- D01/D02 artifact review payload builder or route input preparation, depending on where current context is assembled.

Then:

- Send compact PTR summary.
- Send post-generation gate result.
- Send selected template metadata.
- Send XML summary/excerpts instead of full XML by default.

### Task 7: Add Artifact Review Evals

Create:

- `evals/artifact-review/dataset.json`
- `evals/artifact-review/run-eval.ts`

Then:

- Cover BPMN and Service Blueprint separately even if the skill id remains `artifact-review`.

### Task 8: Update Handoffs After Implementation

Update:

- `docs/SESSION_HANDOFF.md`
- `docs/AI_SKILL_CONTRACT_MATRIX.md`
- `docs/AI_SKILL_DESIGN_REVIEW.md` only if design decisions change
- This handoff only if Bài 2 summary changes

