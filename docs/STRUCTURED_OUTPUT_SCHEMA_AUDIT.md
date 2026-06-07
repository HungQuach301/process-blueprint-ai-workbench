# Structured Output Schema Audit

Date: 2026-05-23

Scope: Bài 3 - Structured Output & Schema Engineering audit for:

- `process-improvement-recommendation`
- `artifact-review`

Sources reviewed:

- `docs/AI_SKILL_CONTRACT_MATRIX.md`
- `docs/AI_SKILL_DESIGN_REVIEW.md`
- `docs/AI_SKILL_REDESIGN_PLAN.md`
- `src/lib/ai/output-schemas/draft-ptr-output-schema.ts`
- `src/lib/ai/skill-schemas.ts`
- `src/lib/ai/prompt-packs.ts`
- `src/app/api/ai/run-skill/route.ts`
- `src/lib/recommendation-engine/types.ts`
- `src/lib/recommendation-engine/qa-recommendation-schema.ts`
- `src/lib/template-recommendation-engine/template-recommendation-schema.ts`
- `src/lib/ai/ai-template-review-types.ts`
- `src/lib/models/process-task.ts`
- `src/lib/models/template-profile.ts`

## 1. Current Structured Output Architecture

Current provider-backed route flow:

1. Validate input with `validateAISkillInput`.
2. Build `AIModelRequest`.
3. Call configured provider server-side through `/api/ai/run-skill`.
4. Adapt raw provider response with `adaptProviderResponse`.
5. Parse extracted content as JSON.
6. Normalize provider output with `normalizeProviderOutput`.
7. Validate with `validateAISkillOutput`.
8. Run skill-specific quality gates where present.
9. Return previewable result and metadata.

Current structured-output state:

- Only `input-brief-to-ptr` has an output schema file: `src/lib/ai/output-schemas/draft-ptr-output-schema.ts`.
- Route structured output is currently gated by:

```ts
routeSkillId === INPUT_BRIEF_TO_PTR_SKILL_ID &&
getSupportsStructuredOutput(routeSkillId)
```

- The next schema work should replace this one-off branch with a small schema resolver.
- Validators remain the final authority even after OpenAI json_schema is enabled.

Important constraint:

- Structured output controls provider shape, but it cannot validate runtime references like whether `targetStepIds` exist in the current PTR. Those checks must remain in validators.

## 2. Existing `input-brief-to-ptr` json_schema Pattern

Current pattern:

- Schema is exported as a const object.
- Root uses `type: "object"`.
- Root has explicit `properties`.
- Root has a complete `required` array.
- Root has `additionalProperties: false`.
- Nested task item object also has `additionalProperties: false`.
- Nullable fields use `anyOf: [{ type: "string" }, { type: "null" }]`.
- Canonical enums are copied from `ProcessTask` model types.

Important enum examples from current schema/model:

- `rowType`: `phase`, `group`, `task`, `gateway`, `start`, `end`, `event`, `data`, `annotation`
- `bpmnType`: `none`, `startEvent`, `endEvent`, `task`, `userTask`, `manualTask`, `serviceTask`, `sendTask`, `scriptTask`, `businessRuleTask`, `exclusiveGateway`, `parallelGateway`, `inclusiveGateway`, `dataObject`, `dataStore`
- `taskNature`: `manual`, `automatic`, `semiAutomatic`, `system`, `decision`, `approval`, `integration`, `notification`, `control`, `data`
- `dataAction`: `none`, `pull`, `push`, `store`, `create`, `read`, `update`, `delete`, `validate`, `approve`, `reject`, `send`, `receive`
- `reviewStatus`: `draft`, `needsReview`, `approved`, `rejected`

Reusable design pattern:

- Keep schema files self-contained.
- Prefer strict object roots.
- Prefer existing validators over adding new runtime validation inside route.
- Keep schema strict enough to prevent provider prose, but not so complex that provider schema validation rejects it.

## 3. Required Schema for `process-improvement-recommendation`

Current failure:

- `schema_validation_failed`

Current output validator:

- `validateAISkillOutput` unwraps `value.recommendations` when the value is an object.
- It then validates the resulting array with `validateAIQARecommendations`.

Target schema file:

- `src/lib/ai/output-schemas/qa-recommendation-output-schema.ts`

Target export:

```ts
export const QA_RECOMMENDATION_OUTPUT_SCHEMA = { ... } as const;
```

Recommended root schema:

```ts
{
  type: "object",
  properties: {
    recommendations: {
      type: "array",
      items: QA_RECOMMENDATION_ITEM_SCHEMA
    }
  },
  required: ["recommendations"],
  additionalProperties: false
}
```

Required recommendation fields:

- `title`: string
- `description`: string
- `confidence`: `low` | `medium` | `high`
- `impact`: `low` | `medium` | `high`
- `riskLevel`: `low` | `medium` | `high`
- `targetStepIds`: non-empty string array at validator level; json_schema can enforce array of strings but not existence
- `previewText`: string
- `requiresConfirmation`: boolean or const true

Recommended optional fields:

- `id`: string
- `source`: `ai` | `hybrid`
- `issueId`: string
- `issueCode`: string
- `rationale`: string
- `recommendationType`: known recommendation enum
- `operations`: operation array
- `warnings`: string array
- `complianceTags`: string array

Recommendation type enum:

- `UpdateField`
- `SplitTask`
- `CreateTask`
- `CreateLane`
- `AssignSystem`
- `AssignActor`
- `ChangeBpmnType`
- `ChangeRowType`
- `SetInteractionType`
- `MarkReviewStatus`
- `AddGatewayBranch`

Operation kind enum:

- `UpdateTaskField`
- `CreateTaskAfter`
- `CreateTaskBefore`
- `InsertTaskBetween`
- `SplitTask`
- `CreateGateway`
- `AddGatewayBranch`
- `UpdateConnection`
- `CreateLane`
- `AssignActor`
- `AssignSystem`
- `SetInteractionType`
- `MarkReviewStatus`

Recommended first implementation:

- Start with required recommendation metadata and a simple `operations` schema with `kind` plus permissive optional fields.
- Do not try to perfectly encode every operation union in the first pass.
- Keep step reference validation in `validateAIQARecommendations`.
- Keep graph-changing risk enforcement in existing normalization/validation flow.

Reason:

- A fully precise operation union can become a deeply nested `anyOf` schema. That may be harder for OpenAI Structured Outputs and harder to maintain.

## 4. Required Schema for `artifact-review`

Current failure:

- `provider_output_normalization_failed`

Current output validator:

- `validateArtifactReviewResponse`

Current expected type:

```ts
{
  recommendations: QARecommendation[];
  templateRecommendations: TemplateRecommendation[];
  warnings: string[];
}
```

Target schema file:

- `src/lib/ai/output-schemas/artifact-review-output-schema.ts`

Target export:

```ts
export const ARTIFACT_REVIEW_OUTPUT_SCHEMA = { ... } as const;
```

Recommended MVP root schema:

```ts
{
  type: "object",
  properties: {
    recommendations: {
      type: "array",
      items: QA_RECOMMENDATION_ITEM_SCHEMA
    },
    templateRecommendations: {
      type: "array",
      items: TEMPLATE_RECOMMENDATION_ITEM_SCHEMA
    },
    warnings: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: ["recommendations", "templateRecommendations", "warnings"],
  additionalProperties: false
}
```

MVP design rule:

- Match current validator first.
- Do not add `findings` or `artifactType` to the schema until validators and UI are ready.
- Keep artifact-only concerns in `warnings`.
- Do not allow replacement XML fields.

Potential later schema:

- Split into `BPMN_ARTIFACT_REVIEW_OUTPUT_SCHEMA` and `SERVICE_BLUEPRINT_ARTIFACT_REVIEW_OUTPUT_SCHEMA`.
- Add `artifactType`, `findings`, `affectedStepIds`, `severity`, `category`, and `evidence` only after validator support exists.

## 5. Shared Schema Fragments That Can Be Reused

Useful fragments:

### String Array

```ts
const STRING_ARRAY_SCHEMA = {
  type: "array",
  items: { type: "string" }
} as const;
```

### Nullable String

```ts
const NULLABLE_STRING_SCHEMA = {
  anyOf: [{ type: "string" }, { type: "null" }]
} as const;
```

### QA Recommendation Enums

```ts
const QA_CONFIDENCE_VALUES = ["low", "medium", "high"] as const;
const QA_IMPACT_VALUES = ["low", "medium", "high"] as const;
const QA_RISK_VALUES = ["low", "medium", "high"] as const;
const QA_SOURCE_VALUES = ["ai", "hybrid"] as const;
```

### ProcessTask Field Enums

Reuse enum lists from `draft-ptr-output-schema.ts` for:

- `rowType`
- `bpmnType`
- `taskNature`
- `dataAction`
- `reviewStatus`

### Template Recommendation Enums

```ts
const TEMPLATE_RECOMMENDATION_TYPES = [
  "UpdateMetadata",
  "UpdateRules",
  "AddMandatoryField",
  "ImproveTemplateFit",
  "MarkForReview"
] as const;
```

Recommendation:

- Keep fragments local inside schema files at first.
- Extract shared schema fragments only after two or more schema files use the same object and the duplication becomes noisy.

## 6. Risks with `QARecommendation` Operations

`QARecommendationOperation` is the most complex part of the schema.

Risks:

1. Deep `anyOf` complexity:
   - Each operation kind has different required fields.
   - Encoding the full union exactly can make the OpenAI schema large and brittle.

2. `ProcessTask` nesting:
   - `CreateTaskAfter`, `CreateTaskBefore`, `InsertTaskBetween`, `SplitTask`, and `CreateGateway` can contain full `ProcessTask` objects.
   - Requiring full `ProcessTask` in operation schemas repeats the entire Draft PTR task schema.

3. Runtime step references:
   - `stepId`, `targetStepId`, `sourceStepId`, `anchorStepId`, `gatewayStepId`, `afterStepId`, and `beforeStepId` must reference existing PTR rows.
   - json_schema cannot enforce this.

4. Risk semantics:
   - Graph-changing operations must be high risk/high impact and require confirmation.
   - Existing validator/normalizer already enforces graph-changing confirmation behavior after schema validation.

Recommended Bài 3 approach:

- First schema pass should allow operation objects with strict `kind` enum and common optional fields.
- Keep exact operation semantics in `validateAIQARecommendations`.
- Add stricter per-kind `anyOf` only after the simpler schema proves stable.

## 7. Risks with `TemplateRecommendation`

Template recommendation validation is strict in ways json_schema cannot fully know.

Current required fields:

- `id`
- `templateId`
- `title`
- `description`
- `type`
- `confidence`
- `riskLevel`
- `affectedFields`
- `requiresConfirmation`

Enums:

- `type`: `UpdateMetadata`, `UpdateRules`, `AddMandatoryField`, `ImproveTemplateFit`, `MarkForReview`
- `confidence`: `low`, `medium`, `high`
- `riskLevel`: `low`, `medium`, `high`
- `source`: `ai` when provided

Runtime risk:

- `templateId` must match `selectedTemplate.id`.
- `affectedFields` should correspond to keys of `TemplateProfile`, but json_schema cannot safely derive TypeScript keys without a maintained list.
- `patch` is `Partial<TemplateProfile>`, which can become broad and hard to encode strictly.

Recommended Bài 3 approach:

- For `artifact-review`, allow `templateRecommendations: []` as a valid default.
- If template recommendations are returned, require the core fields and `requiresConfirmation: true`.
- Keep `templateId` matching and deeper patch validation in `validateTemplateReviewOutput`.
- Avoid encouraging patch-heavy template recommendations in artifact review until a dedicated template review schema exists.

## 8. Should `artifact-review` Be One Schema or Split by Artifact Type?

Audit decision:

- MVP schema: one compatible `ARTIFACT_REVIEW_OUTPUT_SCHEMA`.
- Product direction: split by artifact type after MVP schema pass.

Why one schema first:

- Current route, registry, and UI use one `artifact-review` skill.
- Current validator expects one `ArtifactReviewResponse`.
- A compatible schema can fix `provider_output_normalization_failed` with minimal code changes.

Why split later:

- BPMN review checks BPMN semantics, sequence flows, lanes, DI shapes, and missing references.
- Service Blueprint review checks draw.io structure, phase/row layout, card overlap, and template row rules.
- Token budgets and eval criteria differ by artifact type.

Recommended sequence:

1. Add one compatible schema.
2. Reduce default artifact context.
3. Add artifact review evals with separate BPMN and Service Blueprint cases.
4. Split into `bpmn-artifact-review` and `service-blueprint-artifact-review` once the compatible schema is stable.

## 9. Exact Implementation Plan for Next Exercise

### Step 1: Add QA Recommendation Schema

Create:

- `src/lib/ai/output-schemas/qa-recommendation-output-schema.ts`

Export:

- `QA_RECOMMENDATION_OUTPUT_SCHEMA`

Use:

- Root `{ recommendations: [...] }`.
- Strict recommendation enums.
- Simple first-pass operation object schema.
- `additionalProperties: false` where practical.

### Step 2: Add Artifact Review Schema

Create:

- `src/lib/ai/output-schemas/artifact-review-output-schema.ts`

Export:

- `ARTIFACT_REVIEW_OUTPUT_SCHEMA`

Use:

- Root `{ recommendations, templateRecommendations, warnings }`.
- Reuse or locally duplicate the QA recommendation item schema.
- Locally define template recommendation item schema.

### Step 3: Add Route Schema Resolver

Modify:

- `src/app/api/ai/run-skill/route.ts`

Add a resolver similar to:

```ts
function getStructuredOutputSchemaForSkill(routeSkillId: string) {
  if (routeSkillId === INPUT_BRIEF_TO_PTR_SKILL_ID) {
    return {
      name: "draft_process_task_register",
      schema: DRAFT_PTR_OUTPUT_SCHEMA
    };
  }

  if (
    routeSkillId === PROCESS_IMPROVEMENT_RECOMMENDATION_SKILL_ID ||
    routeSkillId === AI_PROCESS_QA_SKILL_ID
  ) {
    return {
      name: "qa_recommendation_response",
      schema: QA_RECOMMENDATION_OUTPUT_SCHEMA
    };
  }

  if (routeSkillId === ARTIFACT_REVIEW_SKILL_ID) {
    return {
      name: "artifact_review_response",
      schema: ARTIFACT_REVIEW_OUTPUT_SCHEMA
    };
  }

  return undefined;
}
```

Then use it only for OpenAI structured output mode.

### Step 4: Update Prompt Packs

Modify:

- `src/lib/ai/prompt-packs.ts`

Update:

- `process-modeling-qa-recommendation-v1`
- `process-modeling-artifact-review-v1`

Keep changes concise and schema-aligned.

### Step 5: Add Evals

Add:

- `evals/process-improvement-recommendation/dataset.json`
- `evals/process-improvement-recommendation/run-eval.ts`
- `evals/artifact-review/dataset.json`
- `evals/artifact-review/run-eval.ts`

Use existing `input-brief-to-ptr` eval runner as the pattern.

### Step 6: Smoke Test

Run:

- Mock/local smoke test for each skill.
- OpenAI provider-backed smoke test for each skill.
- `npx.cmd tsc --noEmit`
- `npm run build`

## 10. Acceptance Criteria for Schema Pass

### General

- No browser API keys.
- No direct browser provider calls.
- No auto-apply.
- No validator bypass.
- No D01/D02 generator changes.
- Mock/local fallback remains available.
- Provider output still goes through parse, normalize, validate, preview.

### `process-improvement-recommendation`

Pass criteria:

- OpenAI response is constrained to `{ recommendations: [...] }`.
- Route no longer returns `schema_validation_failed` for normal cases.
- Every recommendation validates through `validateAIQARecommendations`.
- Missing or invalid step references still fail validation.
- Graph-changing operations remain high risk and require confirmation.
- UI receives previewable recommendations, not a full replacement PTR.

### `artifact-review`

Pass criteria:

- OpenAI response is constrained to `{ recommendations, templateRecommendations, warnings }`.
- Route no longer returns `provider_output_normalization_failed` for normal artifact review cases.
- Output validates through `validateArtifactReviewResponse`.
- Template recommendations validate only when `selectedTemplate` is present and matching.
- Warnings are string arrays.
- No replacement XML appears in the response.
- Default input context does not require full XML.

### Eval

- Each new eval runner writes timestamped results.
- Early pass threshold: 60%.
- Partial failures are recorded with missing criteria.
- Token/latency should be observed for provider-backed runs.

