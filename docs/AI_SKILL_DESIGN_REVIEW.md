# AI Skill Design Review

Last updated: 2026-05-23

Scope: Master AI Orchestrator review for three core skills:

- `input-brief-to-ptr`
- `process-improvement-recommendation`
- `artifact-review`

This review is based on `docs/AI_SKILL_CONTRACT_MATRIX.md`, `docs/AI_ORCHESTRATOR_SESSION_HANDOFF.md`,
`src/lib/ai/skill-registry-v2.ts`, `src/lib/ai/prompt-packs.ts`, `src/lib/ai/skill-schemas.ts`,
`src/app/api/ai/run-skill/route.ts`, and the current `input-brief-to-ptr` eval dataset/runner.

## 1. Executive Summary

### Skill Stability

| Skill | Current condition | Reviewer verdict |
|---|---|---|
| `input-brief-to-ptr` | Contract-valid with OpenAI json_schema, provider adapter, parser, normalizer, validator, and Draft PTR quality gate | Stable enough for controlled demo, but not yet production-grade process modeling |
| `process-improvement-recommendation` | Provider-backed, prompt-only, currently fails `schema_validation_failed` | Highest priority schema fix |
| `artifact-review` | Provider-backed, prompt-only, currently fails `provider_output_normalization_failed` and has high token/latency footprint | Should be split before serious provider work |

### What Is Working

- Server-side-only AI route is in place.
- Provider adapter extracts actual model text from provider wrappers.
- `input-brief-to-ptr` has a strict OpenAI Structured Outputs schema.
- Route flow follows parse -> normalize -> validate -> quality gate -> preview response.
- Human-in-the-loop policy remains intact: no AI output is auto-applied.

### What Is Risky

- `process-improvement-recommendation` is allowed to return high-impact process edits but lacks a strict provider schema.
- `artifact-review` mixes BPMN review, Service Blueprint review, PTR recommendations, template recommendations, XML evidence, and warnings in one broad skill.
- Passing schema validation is being confused with process quality. The eval baseline proves this is not enough.

### Skill That Needs Splitting

`artifact-review` should be split into:

- `bpmn-artifact-review`
- `service-blueprint-artifact-review`

The current umbrella skill can remain as a compatibility surface, but implementation should move toward the split contracts.

### Skill That Needs Schema First

`process-improvement-recommendation` should receive the next json_schema. It directly affects PTR recommendations and user trust. The output contract is narrower than artifact review, so it is the fastest path to a useful Bài 2 win.

## 2. `input-brief-to-ptr` Review

### Current Contract

Registry:

- Input schema: `StructuredProcessBrief`
- Output schema: `DraftProcessTaskRegister`
- Prompt pack: `process-modeling-input-brief-to-ptr-v1`
- Providers: mock, product-ai, OpenAI, Claude
- Approval: required
- Sensitivity: confidential

Route behavior:

- Input is validated with `validateStructuredProcessBrief`.
- OpenAI Structured Outputs uses `DRAFT_PTR_OUTPUT_SCHEMA` for this skill.
- Provider output is adapted and content text is extracted before parsing.
- Parsed output is passed through `normalizeProviderOutput`.
- Output is validated with `validateDraftProcessTaskRegister`.
- Draft output is checked with `runDraftProcessTaskRegisterQualityGate`.

The contract is materially stronger than other skills because schema, prompt, route, normalizer, and validator now align.

### Why Schema Pass Is Not Enough

Schema validation confirms that the output is shaped like a `DraftProcessTaskRegister`. It does not prove that the generated process is business-useful.

Examples of what schema does not guarantee:

- A lending or KYC process has a meaningful decision gateway.
- A system-heavy payment process uses `serviceTask` appropriately.
- Non-event rows have usable actors.
- A minimal brief is marked `confidence: "low"`.
- Complex exception flows have enough gateways and branches.
- Generated tasks cover the user's stated happy path and exception paths.

This is the core lesson from the eval baseline: syntactic correctness is only the first gate.

### Eval Failures

The eval runner currently checks five cases and product-level criteria. Known missing criteria from the baseline include:

- `allStepsHaveActor`: non-event rows may have blank actor values.
- `hasGateway`: KYC/lending flows may be generated as linear task lists despite exception paths.
- `confidenceLow`: minimal input may still receive medium confidence.
- `gatewayCount`: complex lending flows may not create enough decision points.

These are semantic modeling failures, not JSON failures.

### Root Cause Hypothesis

1. The output schema is strict about fields but weak about business semantics.
2. The prompt tells the model to include gateways but does not force scenario-specific decision modeling.
3. The quality gate can block invalid drafts, but it does not yet score missing process modeling richness deeply enough.
4. The model optimizes for valid rows and safe sequential flow, which makes it under-produce gateways and service tasks.
5. The eval cases require process architecture judgment, not only contract obedience.

### Redesign Proposal

Keep the current contract and OpenAI json_schema. Do not redesign the core route path.

Improve in layers:

1. Prompt refinements:
   - Add explicit instructions for exception-driven gateway creation.
   - Add system-heavy examples that use `serviceTask`.
   - Add minimal-brief rule: if actors/systems/scope are weak, set `confidence` to `low`.
   - Require actor values on every non-event row unless truly unknown, then add open question.

2. Semantic quality gate:
   - Warn when exception paths exist but no `exclusiveGateway` exists.
   - Warn when multiple systems exist but no `serviceTask` exists.
   - Warn when non-event rows have blank actor values.
   - Warn when minimal input is not low confidence.

3. Eval upgrades:
   - Store per-case missing criteria history.
   - Add next-step reference checks.
   - Add source coverage checks for happyPath and exceptionPaths.
   - Add expected task nature checks for manual versus system work.

4. Product UX:
   - Show eval-style quality gaps as review warnings, not as raw schema errors.
   - Keep user approval before applying Draft PTR rows.

## 3. `process-improvement-recommendation` Review

### Expected Skill Purpose

This skill should suggest semantic improvements to the current Process Task Register. It should not replace the PTR. It should return reviewable recommendations that the user can preview, select, and apply through existing recommendation governance.

Expected use cases:

- Improve task wording.
- Infer missing actor/system/lane.
- Generate missing input/output.
- Suggest split for complex tasks.
- Suggest gateway or branch changes when needed.
- Extend deterministic Rule QA with better rationale or safer patches.

### Input Minimal Context

Minimum context should be:

- `processTasks`: current PTR rows.
- `selectedStepIds`: optional selected rows; if empty, evaluate full PTR.
- `qaIssues`: optional deterministic Rule QA findings.
- `existingRecommendations`: optional local recommendations to avoid duplicates.
- `metadata.ptrAiAction`: optional focused action such as normalize wording or infer missing fields.

Do not send D01/D02 XML, product delivery artifacts, or unrelated notes for this skill.

### Output as `QARecommendation[]`

The current validator expects either:

- A raw `QARecommendation[]`, or
- An object with `recommendations`, which is unwrapped before validation.

Each recommendation must satisfy the current validator:

- `title`: string
- `description`: string
- `previewText`: string
- `source`: `ai` or `hybrid` when provided
- `confidence`: `low` | `medium` | `high`
- `impact`: `low` | `medium` | `high`
- `riskLevel`: `low` | `medium` | `high`
- `targetStepIds`: non-empty string array using existing stepIds
- `recommendationType` or `type`: valid recommendation type when provided
- `operations`: valid operation array when provided
- `requiresConfirmation`: true

Valid recommendation types include:

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

Valid operation kinds include:

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

### Risk Classification

Recommended classification:

| Risk | Examples | Default selection |
|---|---|---|
| Low | Wording, actor/system/lane fill, input/output text, comments | Can be selected by default |
| Medium | SLA, risk/control, exception handling, review status, BPMN type correction | User review required |
| High | Split task, create task, create gateway, update connection, add branch, create lane | Not selected by default |

The current validator already upgrades graph-changing operations to high impact/high risk and forces confirmation. The schema should make this explicit so provider output is valid before normalization.

### Required Structured Output Fields

The next json_schema should require:

```json
{
  "recommendations": [
    {
      "id": "rec-001",
      "source": "ai",
      "title": "Fill missing actor",
      "description": "Step S003 has no actor.",
      "rationale": "Non-event process rows need an accountable actor.",
      "confidence": "high",
      "impact": "low",
      "riskLevel": "low",
      "targetStepIds": ["S003"],
      "recommendationType": "AssignActor",
      "operations": [
        {
          "kind": "AssignActor",
          "stepId": "S003",
          "actor": "RM",
          "actorLane": "RM"
        }
      ],
      "previewText": "Set actor for S003 to RM.",
      "warnings": [],
      "requiresConfirmation": true,
      "complianceTags": []
    }
  ]
}
```

The schema should use `additionalProperties: false` and strict enums. Runtime validation should still check stepId existence because json_schema cannot know the current PTR.

### Validation Risks

Current failure `schema_validation_failed` is expected under prompt-only generation because the model may:

- Return object fields that look helpful but are not in the recommendation type.
- Use invalid `riskLevel`, `confidence`, or `impact`.
- Return `recommendations[0].title` as an object instead of string.
- Omit `previewText`.
- Omit `requiresConfirmation`.
- Reference missing stepIds.
- Return a full process rewrite instead of recommendations.

### Proposed Eval Criteria

Create `evals/process-improvement-recommendation/` with cases for:

- Missing actor/system/lane: expects low-risk `AssignActor` or `AssignSystem`.
- Poor task wording: expects low-risk `UpdateTaskField` on `taskName`.
- Missing input/output: expects low-risk field updates.
- Complex task split: expects high-risk `SplitTask`, not selected by default.
- Missing decision branch: expects high-risk gateway/connection operation.
- Duplicate rule recommendation: expects no duplicate unless `source: "hybrid"` adds better rationale.

Pass conditions:

- API returns 200.
- Output validates as `QARecommendation[]`.
- Every targetStepId exists.
- Graph-changing recommendations are high risk and require confirmation.
- Low-risk recommendations have preview text and valid operations.

## 4. `artifact-review` Review

### Why Token Usage Is High

Artifact review is naturally token-heavy because it may include:

- Full `ProcessTask[]`.
- Generated BPMN XML or draw.io XML.
- Selected template metadata and rules.
- Existing QA issues and recommendations.
- Artifact gate or preview status.

The AI Orchestrator handoff recorded `artifact-review` at 12251 input tokens, 2218 output tokens, and 29.6 seconds in the baseline. That is too large for a frequently used review action.

### Why Full XML Input May Be Too Much

Full XML is expensive and noisy:

- BPMN XML includes layout, DI shapes, namespaces, and generated ids that distract from process correctness.
- draw.io XML includes visual layout data that may swamp the actual service blueprint card semantics.
- Provider output may focus on XML rewrite suggestions, which the product explicitly does not want.
- Large XML increases latency and makes provider normalization failures more likely.

The reviewer should receive artifact evidence, not a blank check to rewrite generated files.

### Split BPMN vs Service Blueprint Review

Decision: split.

Reasons:

- BPMN review and Service Blueprint review have different quality dimensions.
- Each needs different eval criteria.
- Each can use a smaller context package.
- Each can have a cleaner output schema.
- Splitting reduces token usage and makes provider failure easier to diagnose.

Recommended direction:

- Keep `artifact-review` as an umbrella compatibility skill for UI routing during transition.
- Add or design `bpmn-artifact-review`.
- Add or design `service-blueprint-artifact-review`.

### Proposed Minimal Context

For both split skills, send:

- `artifactType`: `bpmn` or `serviceBlueprint`
- Source PTR summary:
  - stepId
  - taskName
  - rowType
  - bpmnType
  - actor
  - system
  - defaultNextStep
  - yesNextStep
  - noNextStep
- Post-generation gate result:
  - gate status
  - error/warning codes
  - affected stepIds when available
- Selected template metadata:
  - template id
  - output type
  - domain/process/scope
  - relevant rules only
- Sampled XML findings, not full XML by default:
  - XML tag counts
  - missing references
  - invalid ids
  - excerpt around failing node when a gate identifies one

Full XML should be opt-in for a narrow diagnostic mode, not the default review payload.

### Proposed Output Contract

For BPMN:

```json
{
  "artifactType": "bpmn",
  "findings": [
    {
      "id": "bpmn-finding-001",
      "severity": "warning",
      "category": "sequenceFlow",
      "title": "Gateway branch is missing",
      "message": "Gateway S004 has no noNextStep target.",
      "affectedStepIds": ["S004"],
      "evidence": "post-generation gate: missing-no-branch"
    }
  ],
  "recommendations": [],
  "templateRecommendations": [],
  "warnings": []
}
```

For Service Blueprint:

```json
{
  "artifactType": "serviceBlueprint",
  "findings": [
    {
      "id": "sb-finding-001",
      "severity": "warning",
      "category": "layout",
      "title": "Phase column may be overloaded",
      "message": "Phase Fulfillment contains many cards and may need row height adjustment.",
      "affectedStepIds": ["S006", "S007", "S008"],
      "evidence": "layout summary: 3 cards in same phase/row"
    }
  ],
  "recommendations": [],
  "templateRecommendations": [],
  "warnings": []
}
```

The current `ArtifactReviewResponse` can remain the MVP adapter shape:

```ts
{
  recommendations: QARecommendation[];
  templateRecommendations: TemplateRecommendation[];
  warnings: string[];
}
```

But split schemas should add `artifactType`, `findings`, severity/category, affected stepIds, and evidence. PTR or template changes still flow through recommendations and user approval.

## 5. Redesign Decisions

### Keep / Split / Defer

| Skill | Decision | Reason |
|---|---|---|
| `input-brief-to-ptr` | Keep | Contract path is sound; improve semantic quality and eval |
| `process-improvement-recommendation` | Keep, but add strict schema | Scope is right if output is constrained to recommendations |
| `artifact-review` | Split | Current scope is too broad, token-heavy, and has mixed output responsibilities |

### Next Implementation Order

1. Create `QA_RECOMMENDATION_OUTPUT_SCHEMA`.
2. Wire it for `process-improvement-recommendation` and optionally `ai-process-qa`.
3. Create eval dataset for `process-improvement-recommendation`.
4. Redesign artifact review context builder with minimal context.
5. Define split contracts for BPMN and Service Blueprint artifact review.
6. Add artifact review eval datasets.
7. Return to `input-brief-to-ptr` semantic quality improvements.

### What Belongs to Bài 2

Bài 2 should focus on skill design and contract hardening:

- Contract clarity.
- json_schema for failing high-value skills.
- Risk taxonomy.
- Minimal context design.
- Eval definitions.
- Split/keep decisions.

### What Belongs to Bài 3

Bài 3 should focus on broader orchestrator/runtime engineering:

- Provider-specific structured output patterns beyond OpenAI.
- Schema edge-case test harnesses.
- Multi-skill eval dashboard.
- Token/latency budget enforcement.
- Contract versioning and migration.
- Provider capability-aware routing.

## 6. Product Critique

### Production-Ready

- Server-side AI-only architecture.
- No browser API keys.
- Mock/local fallback.
- Provider adapter layer.
- `input-brief-to-ptr` OpenAI json_schema path.
- Human approval before apply/export.
- Friendly UI handling for validation failures.

### Still Lab-Grade

- `process-improvement-recommendation` under real provider mode.
- `artifact-review` under real provider mode.
- Prompt-only structured JSON for most real-ai-ready skills.
- Eval coverage beyond `input-brief-to-ptr`.
- Semantic process quality scoring.
- Token budget management for artifact-heavy reviews.

### Must Improve Before Real User Demo

Before a serious demo with real business users:

1. `input-brief-to-ptr` should pass more than schema validation. It needs better gateway, actor, confidence, and exception modeling behavior.
2. `process-improvement-recommendation` must stop failing schema validation under OpenAI and return previewable recommendations.
3. `artifact-review` should not send full XML by default and should be split or narrowed before being shown as reliable AI review.
4. UI should communicate AI output as draft/recommendation, not truth.
5. Eval results should be available as a release gate for AI skill changes.

Bottom line: the platform architecture is moving in the right direction. The next quality jump is not more prompt text; it is stricter contracts, narrower context, eval-driven iteration, and explicit risk governance per skill.

