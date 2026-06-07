# AI Skill Redesign Plan

Last updated: 2026-05-23

Scope: implementation plan for the two failing AI skills:

- `process-improvement-recommendation`
- `artifact-review`

This plan converts the Bài 2 findings in `docs/AI_SKILL_CONTRACT_MATRIX.md` and
`docs/AI_SKILL_DESIGN_REVIEW.md` into a small, implementation-ready sequence. It does not change app code by itself.

## 1. Implementation Principles

### Keep Changes Small

- Implement one skill contract at a time.
- Prefer adding one schema file and one route selection branch over refactoring provider plumbing.
- Reuse existing validators:
  - `validateAIQARecommendations`
  - `validateArtifactReviewResponse`
  - `validateTemplateReviewOutput`
- Keep `ProcessTask[]` as the source of truth for process changes.

### No Browser API Keys

- All provider calls must continue through `/api/ai/run-skill`.
- Browser settings may pass non-secret provider/model/runtime preferences only.
- No provider SDK or API key may be introduced into client components.

### No Auto-Apply

- AI output remains recommendation/review output.
- User must preview and approve before any PTR or template change is applied.
- Graph-changing recommendations must remain high risk and require explicit confirmation.

### Native Structured Output First

- For OpenAI, use native `json_schema` Structured Outputs before relying on prompt-only JSON.
- Claude and Product AI can remain prompt-constrained initially, but must still pass the same validators.
- Mock/local paths must keep validating through the same output contracts.

### Normalizer as Fallback Only

- Normalizer should handle wrapper shape and minor legacy aliases.
- Normalizer should not rescue broad malformed provider output as a primary strategy.
- If a provider can be constrained by native schema, do that first.

### Eval Before/After

- Add eval datasets before or in the same slice as schema wiring.
- Run failing baseline first when possible.
- Run provider-backed smoke tests after schema wiring.
- Store results to make contract changes measurable.

## 2. `process-improvement-recommendation` Implementation Plan

### Target Output Schema

Target internal output:

```ts
{
  recommendations: QARecommendation[];
}
```

The route may continue to unwrap this object before `validateAIQARecommendations`, but the provider should be
constrained to return the object form for consistency.

Required recommendation fields:

- `title`
- `description`
- `confidence`
- `impact`
- `riskLevel`
- `targetStepIds`
- `previewText`
- `requiresConfirmation`

Recommended fields:

- `id`
- `source`
- `rationale`
- `recommendationType`
- `operations`
- `warnings`
- `complianceTags`

Strict enum values from current validator:

- `source`: `ai`, `hybrid`
- `confidence`: `low`, `medium`, `high`
- `impact`: `low`, `medium`, `high`
- `riskLevel`: `low`, `medium`, `high`
- `recommendationType`: `UpdateField`, `SplitTask`, `CreateTask`, `CreateLane`, `AssignSystem`, `AssignActor`, `ChangeBpmnType`, `ChangeRowType`, `SetInteractionType`, `MarkReviewStatus`, `AddGatewayBranch`
- `operation.kind`: `UpdateTaskField`, `CreateTaskAfter`, `CreateTaskBefore`, `InsertTaskBetween`, `SplitTask`, `CreateGateway`, `AddGatewayBranch`, `UpdateConnection`, `CreateLane`, `AssignActor`, `AssignSystem`, `SetInteractionType`, `MarkReviewStatus`

Important limitation:

- json_schema cannot validate whether `targetStepIds` exist in the current PTR. Keep this in `validateAIQARecommendations`.

### Proposed File

Create in implementation slice:

`src/lib/ai/output-schemas/qa-recommendation-output-schema.ts`

Suggested export:

```ts
export const QA_RECOMMENDATION_OUTPUT_SCHEMA = { ... } as const;
```

Schema shape:

- Root object with `recommendations`.
- `recommendations.items.additionalProperties: false`.
- Required fields should match the validator.
- Operation variants should be represented with `anyOf` by `kind`.
- Graph-changing operation kinds should be allowed but not auto-selected by UI.
- `requiresConfirmation` should be constrained to `true`.

### Prompt Pack Changes

Update `process-modeling-qa-recommendation-v1` in `src/lib/ai/prompt-packs.ts`:

- Require object form: `{ "recommendations": [...] }`.
- State that the skill must never return a full replacement PTR.
- Require existing `targetStepIds`.
- Require `requiresConfirmation: true`.
- Require risk rules:
  - low for wording and simple field completion
  - medium for SLA/risk/control/review status
  - high for graph-changing operations
- Require graph-changing operations to include warnings.
- Tell model to omit a recommendation if it cannot reference an existing stepId.

Keep prompt changes concise. The schema should carry most of the structural burden.

### Route Structured Output Toggle Changes

Current route only enables structured output when:

```ts
routeSkillId === INPUT_BRIEF_TO_PTR_SKILL_ID &&
getSupportsStructuredOutput(routeSkillId)
```

Implementation should replace this one-off check with a small resolver:

```ts
function getStructuredOutputSchemaForSkill(routeSkillId: string) {
  if (routeSkillId === INPUT_BRIEF_TO_PTR_SKILL_ID) return DRAFT_PTR_OUTPUT_SCHEMA;
  if (routeSkillId === PROCESS_IMPROVEMENT_RECOMMENDATION_SKILL_ID) return QA_RECOMMENDATION_OUTPUT_SCHEMA;
  if (routeSkillId === AI_PROCESS_QA_SKILL_ID) return QA_RECOMMENDATION_OUTPUT_SCHEMA;
  return undefined;
}
```

Then set `supportsStructuredOutput` and schema metadata only when:

- selected provider is OpenAI,
- skill supports structured output,
- schema resolver returns a schema.

Do not change provider adapter behavior.

### Validator Used

Keep the existing validator:

- Input: `validateAISkillInput`
- Output: `validateAISkillOutput`
- Recommendation detail: `validateAIQARecommendations`

Do not bypass the validator just because OpenAI json_schema is enabled.

### Eval Cases to Add

Create in implementation slice:

- `evals/process-improvement-recommendation/dataset.json`
- `evals/process-improvement-recommendation/run-eval.ts`

Minimum cases:

1. Missing actor:
   - Input: one task row without actor.
   - Expected: low-risk `AssignActor` or `UpdateTaskField`.

2. Missing system:
   - Input: service/system task without system.
   - Expected: low-risk `AssignSystem`.

3. Missing input/output:
   - Input: task with blank input/output.
   - Expected: low-risk `UpdateTaskField` operations.

4. Complex task wording:
   - Input: overloaded task name with multiple actions.
   - Expected: high-risk `SplitTask`, not safe-by-default.

5. Missing gateway:
   - Input: process with yes/no condition encoded as linear task text.
   - Expected: high-risk `CreateGateway` or `AddGatewayBranch`.

6. Duplicate rule recommendation guard:
   - Input includes `qaIssues` and `existingRecommendations`.
   - Expected: no duplicate unless `source: "hybrid"` and clearer rationale.

Eval pass checks:

- API returns 200.
- Output validates as recommendations.
- Every `targetStepIds` value exists.
- Every operation step reference exists.
- Graph-changing operations have `riskLevel: "high"`, `impact: "high"`, and `requiresConfirmation: true`.
- Low-risk recommendations include `previewText` and at least one actionable operation or patch.

### Acceptance Criteria

- OpenAI provider-backed call no longer fails `schema_validation_failed` for normal cases.
- Route returns `ok: true` with `mode: "provider-backed"` for at least one smoke test.
- Bad step references are still rejected by `validateAIQARecommendations`.
- Existing mock/local recommendation path remains unchanged.
- No recommendation is auto-applied.
- Eval runner reaches at least 60% pass rate before the skill is marked demo-ready.

## 3. `artifact-review` Implementation Plan

### Decision: Keep One Skill or Split

Recommendation: split implementation direction, keep compatibility surface.

- Keep `artifact-review` as the current registry/UI route for now.
- Implement a narrower schema that can support `artifactType: "bpmn" | "serviceBlueprint"`.
- In the next registry slice, introduce:
  - `bpmn-artifact-review`
  - `service-blueprint-artifact-review`

Reason:

- Splitting immediately may require UI/registry/route changes across D01 and D02.
- A narrowed `artifact-review` schema can fix normalization first.
- Split contracts should follow once eval and minimal context are defined.

### Target Output Schema

Current validator accepts:

```ts
{
  recommendations: QARecommendation[];
  templateRecommendations: TemplateRecommendation[];
  warnings: string[];
}
```

Implementation should start with this compatible root, then optionally include findings only if validator/normalizer is extended in a later slice. Because this plan must keep implementation small, the first schema should target the existing validator exactly.

Recommended MVP schema:

```json
{
  "recommendations": [],
  "templateRecommendations": [],
  "warnings": []
}
```

Rules:

- `recommendations` uses the same QA recommendation schema rules.
- `templateRecommendations` uses current template recommendation rules.
- `warnings` is a string array for artifact-only concerns that cannot safely become PTR or template changes.
- Do not include raw XML rewrite, replacement BPMN, replacement draw.io XML, or generated artifact text.

### Proposed File

Create in implementation slice:

`src/lib/ai/output-schemas/artifact-review-output-schema.ts`

Suggested exports:

```ts
export const ARTIFACT_REVIEW_OUTPUT_SCHEMA = { ... } as const;
```

If possible, share or duplicate narrowly from `QA_RECOMMENDATION_OUTPUT_SCHEMA` to avoid broad schema helpers in the first slice. A small amount of duplication is acceptable to keep the implementation local.

### Minimal Context Strategy

Do not send full product workspace context. Send only:

- `artifactType`: `bpmn` or `serviceBlueprint`
- compact PTR summary:
  - `stepId`
  - `taskName`
  - `rowType`
  - `bpmnType`
  - `actor`
  - `system`
  - `defaultNextStep`
  - `yesNextStep`
  - `noNextStep`
- post-generation gate result:
  - status
  - issue codes
  - affected stepIds
  - short messages
- selected template metadata:
  - id
  - name
  - output type
  - domain/process/scope
  - relevant rule summary
- XML summary or excerpts only.

Do not send:

- full notes/chat history,
- full Product Delivery artifacts,
- full XML by default,
- unrelated templates,
- browser secrets.

### XML Handling Strategy

Default mode:

- Do not send full XML.
- Send counts and summaries:
  - BPMN element counts
  - sequence flow count
  - missing reference list if known
  - lane/participant summary
  - draw.io card count
  - row/phase density summary
- Include short excerpts only around known gate failures.

Diagnostic mode, later:

- Allow bounded XML excerpts, not full artifact.
- Cap excerpt length.
- Log only preview length and token/latency, not full business XML.

### Prompt Pack Changes

Update `process-modeling-artifact-review-v1` in `src/lib/ai/prompt-packs.ts`:

- Require object form:
  - `recommendations`
  - `templateRecommendations`
  - `warnings`
- State that XML rewrite is forbidden.
- State that artifact-only concerns go to `warnings`.
- State that process fixes must be `QARecommendation` objects targeting existing stepIds.
- State that template fixes must be `TemplateRecommendation` objects for the selected template.
- State that if evidence is insufficient, return a warning instead of inventing a fix.

For future split prompts:

- `process-modeling-bpmn-artifact-review-v1`
- `process-modeling-service-blueprint-artifact-review-v1`

### Route Structured Output Changes

Extend the structured output resolver proposed above:

```ts
if (routeSkillId === ARTIFACT_REVIEW_SKILL_ID) {
  return ARTIFACT_REVIEW_OUTPUT_SCHEMA;
}
```

Only enable it for OpenAI initially.

Keep existing validation:

- `validateAISkillOutput(routeSkillId, normalizedOutput, validationContext)`
- `validateArtifactReviewResponse`
- `validateTemplateReviewOutput` for template recommendation checks when `selectedTemplate` is present.

If `selectedTemplate` is not available, prompt should avoid returning template recommendations. Route validation should continue to reject template recommendations without selected template.

### Eval Cases to Add

Create in implementation slice:

- `evals/artifact-review/dataset.json`
- `evals/artifact-review/run-eval.ts`

Minimum cases:

1. BPMN missing next-step reference:
   - Input includes gate result with missing reference.
   - Expected: warning or QA recommendation targeting affected stepId.

2. BPMN gateway branch issue:
   - Input includes gateway with incomplete yes/no branch.
   - Expected: high-risk recommendation or warning.

3. BPMN no issue:
   - Valid artifact summary.
   - Expected: empty recommendations and warnings or low-severity note.

4. Service Blueprint overloaded phase/row:
   - Layout summary shows many cards in one phase/row.
   - Expected: template recommendation or warning.

5. Service Blueprint template mismatch:
   - Selected template metadata conflicts with process domain/scope.
   - Expected: template recommendation matching selected template id.

6. Insufficient XML evidence:
   - Minimal artifact summary only.
   - Expected: warning, no invented process fix.

Eval pass checks:

- API returns 200.
- Output validates as `ArtifactReviewResponse`.
- No replacement XML is returned.
- `recommendations[].targetStepIds` all exist.
- `templateRecommendations[].templateId` matches selected template.
- Warnings are strings.
- Token input stays below a defined budget for default mode.

### Acceptance Criteria

- OpenAI provider-backed artifact review no longer fails `provider_output_normalization_failed` for normal artifact summaries.
- Output validates with current `validateArtifactReviewResponse`.
- Full XML is not required for the default path.
- No artifact XML rewrite is returned or applied.
- D01/D02 generators remain unchanged.
- Existing UI can still show counts/warnings while deeper QA/template handoff remains a later slice.
- Eval runner reaches at least 60% pass rate before marking skill demo-ready.

## 4. Recommended Implementation Order

### Step 1: Add Output Schemas

Add:

- `src/lib/ai/output-schemas/qa-recommendation-output-schema.ts`
- `src/lib/ai/output-schemas/artifact-review-output-schema.ts`

Keep schema files self-contained and modeled after `draft-ptr-output-schema.ts`.

### Step 2: Wire OpenAI json_schema Selection

In `/api/ai/run-skill/route.ts`:

- Import new schemas.
- Add a small resolver for route skill id -> schema name/schema object.
- Replace the `input-brief-to-ptr` one-off structured output check.
- Log `structured_output_mode` with the selected schema name.

Do not change provider adapter behavior.

### Step 3: Update Prompt Packs

Update only the relevant prompt pack entries:

- `process-modeling-qa-recommendation-v1`
- `process-modeling-artifact-review-v1`

Keep prompt text short and contract-focused. Do not overfit to one provider.

### Step 4: Add/Extend Eval Dataset

Add:

- `evals/process-improvement-recommendation/`
- `evals/artifact-review/`

Pattern after `evals/input-brief-to-ptr/run-eval.ts`:

- Built-in fetch.
- No API key in script.
- Server must run separately.
- Timeout per case.
- Results file with timestamp.
- Exit code based on pass threshold.

### Step 5: Run Provider-Backed Smoke Test

For each skill:

- Run one mock/local case.
- Run one OpenAI case.
- Confirm route meta:
  - `mode: "provider-backed"`
  - `validationPassed: true`
  - structured schema name logged
  - token/latency captured
- Confirm no raw validation dump reaches main UI.

### Step 6: Update Handoff

Update:

- `docs/SESSION_HANDOFF.md`
- `docs/AI_SKILL_CONTRACT_MATRIX.md` if status changes
- `docs/AI_SKILL_DESIGN_REVIEW.md` only if a decision changes

## 5. Risks and Rollback

### What Can Break

- OpenAI json_schema may reject schemas that are too complex, especially deeply nested `anyOf` operation variants.
- Route structured-output resolver may accidentally affect skills that should remain prompt-only.
- Artifact review may still fail if prompt returns template recommendations without selected template.
- QA recommendation schema may be stricter than existing mock/provider outputs.
- Eval runner may expose existing UI payload differences between PTR Assistant and QA Panel.

### How to Roll Back

Rollback should be file-scoped:

1. Remove the structured schema branch for the failing skill from the route resolver.
2. Keep schema file in repo if useful, but stop wiring it.
3. Revert prompt pack changes for that skill if provider behavior worsens.
4. Keep validators unchanged.
5. Keep mock/local fallback enabled.

Safe rollback order:

- First disable json_schema selection for the skill.
- Then adjust prompt.
- Only delete schema files if they cause TypeScript/build issues.

### What Must Not Change

- No browser API keys.
- No direct browser provider calls.
- No auto-apply.
- No D01/D02 generator changes.
- No ProcessTask schema changes.
- No validator bypass.
- No full PTR replacement from `process-improvement-recommendation`.
- No XML rewrite from `artifact-review`.
- No dependency additions unless a separate implementation task explicitly approves them.

