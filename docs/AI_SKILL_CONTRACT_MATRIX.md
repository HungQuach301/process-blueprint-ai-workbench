# AI Skill Contract Matrix

Last updated: 2026-05-23

This document standardizes the contract for every AI skill registered in `src/lib/ai/skill-registry-v2.ts`.
It is the Bài 2 design baseline after the first AI Orchestrator implementation, where
`input-brief-to-ptr` is working with OpenAI Structured Outputs and several follow-up skills still need
stronger output contracts.

## 1. AI Skill Design Principles

### Skill != Prompt

An AI skill is a governed product capability, not only a prompt. A complete skill includes:

- Input contract: what data the UI may send to the server-side skill route.
- Prompt pack: provider-neutral instructions and output expectations.
- Provider/runtime policy: which providers and models may serve the skill.
- Output contract: the canonical response shape the product accepts.
- Normalizer: the adapter between provider output and internal output.
- Validation: schema validation before preview, apply, or export.
- Quality gate: product-level checks beyond schema correctness.
- Risk level: the expected blast radius of bad output.
- Apply behavior: how a human reviews and applies the output.
- Eval criteria: repeatable checks for product usefulness.

### Input Contract

Every skill input must be validated before provider execution. The input contract should identify:

- Required source object, such as `StructuredProcessBrief`, `ProcessTaskRegisterContext`, or `ProductDeliveryContext`.
- Minimum viable context.
- Sensitive data handling assumptions.
- Whether the skill can run on selected rows, the full Process Task Register, notes, files, or generated artifacts.

### Output Contract

Every provider-backed skill needs a canonical internal output schema. Prompt-only structure is not enough for
production reliability. OpenAI Structured Outputs should be used where the response must feed validation or
downstream artifact generation.

### Validation

All AI output must pass `validateAISkillOutput` or a more specific validation entry point before the UI can
present it as a draft, recommendation, finding, review result, or exportable artifact.

### Quality Gate

Validation checks shape. Quality gates check usefulness and governance. A valid response can still fail product
expectations, for example missing gateways, weak traceability, too few tasks, or unsafe recommendations.

### Risk Level

Risk level should guide UI and apply behavior:

- Low: read-only findings, copy suggestions, non-structural metadata.
- Medium: field edits that require preview and user approval.
- High: graph-changing recommendations, requirement changes, artifact package changes.
- Restricted: actions that should never auto-apply, such as generated code packs or broad artifact rewrites.

### Apply Behavior

AI output must go through Draft / Recommendation / Review Finding -> validation -> quality gate -> preview ->
user approval -> apply or export. No skill should auto-apply provider output.

### Eval Criteria

Each skill should have an eval dataset that checks both:

- Contract compliance: schema passes and no normalizer failure.
- Product usefulness: task counts, references, risk classification, actionability, traceability, and safe apply behavior.

### Provider and Runtime Policy

Provider calls stay server-side only. Browser code must never receive API keys. Runtime options such as model,
reasoning effort, thinking mode, max output tokens, and temperature are preferences, not trusted validation input.
Unsupported options should be ignored with warnings, not crash the skill.

## 2. Full Skill Contract Matrix

Legend:

- Structured output status:
  - `json_schema`: OpenAI Structured Outputs schema exists and is wired.
  - `prompt-only`: prompt asks for JSON, but provider is not constrained by json_schema.
  - `mock-only`: currently deterministic/mock provider only.
  - `planned`: registry entry exists but product flow is not complete.
- Provider support reflects registry support, not guaranteed quality.

| Skill ID | Module | Purpose | UI surface | Input schema | Output schema | Provider support | Structured output status | Normalizer role | Validation entry point | Quality gate | Risk level | Apply behavior | Eval criteria | Current status | Known gap | Next action |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `input-brief-to-ptr` | Module 2 Process Modeling | Convert structured brief into Draft PTR | Input Brief, main generate button | `StructuredProcessBrief` | `DraftProcessTaskRegister` | mock, product-ai, OpenAI, Claude | `json_schema` for OpenAI | Extract provider content, parse JSON, normalize legacy PTR fields | `validateStructuredProcessBrief`, `validateDraftProcessTaskRegister`, `validateAISkillOutput` | Brief quality gate and Draft PTR quality gate | Medium | Draft preview, user applies to PTR | Start/end events, task count, gateway, actors, confidence | Working with OpenAI json_schema | Eval baseline is low despite schema pass | Improve prompt/eval targets and add regression fixtures |
| `file-to-ptr-draft` | Module 2 Process Modeling | Convert extracted file text into Draft PTR | Input Brief, Import File tab | `FileIntakeContext` | `DraftProcessTaskRegister` | mock, product-ai, OpenAI, Claude | prompt-only | Normalize extracted text result into Draft PTR | `validateFileIntakeContext`, `validateDraftProcessTaskRegister` | Draft PTR quality gate | Medium | Draft preview, user applies to PTR | File-derived start/end, task count, references to source file | Real AI ready | No dedicated json_schema or eval dataset | Reuse Draft PTR json_schema and build file evals |
| `chat-to-ptr-draft` | Module 2 Process Modeling | Convert chat or meeting notes into Draft PTR | Input Brief, Chat / Notes tab | `ChatNotesContext` | `DraftProcessTaskRegister` | mock, product-ai, OpenAI, Claude | prompt-only | Normalize notes output into Draft PTR | `validateChatNotesContext`, `validateDraftProcessTaskRegister` | Draft PTR quality gate | Medium | Draft preview, user applies to PTR | Notes coverage, assumptions, open questions, task count | Real AI ready | No structured schema enforcement | Reuse Draft PTR json_schema and add notes evals |
| `ai-process-qa` | Module 2 Process Modeling | Generate AI QA recommendations for PTR | QA Panel, PTR AI Assistant | `ProcessTaskRegisterContext` | `QARecommendationResponse` | mock, product-ai, OpenAI, Claude | prompt-only | Convert array or `{ recommendations }` to internal recommendations | `validateProcessTaskArrayInput`, `validateAIQARecommendations` | Recommendation preview and safety classification | Medium to High | Preview, select, apply with approval | Valid targetStepIds, safe flags, no duplicate rule findings | Real AI ready | Needs strict recommendation schema | Add `QARecommendationResponse` json_schema |
| `ai-process-qa-finding` | Module 2 Process Modeling | Generate read-only AI findings | QA Panel | `ProcessTaskRegisterContext` | `QAFindingSetResponse` | mock, product-ai, OpenAI, Claude | prompt-only | Normalize finding set | `validateProcessTaskArrayInput`, `validateQAFindingSetResponse` | Findings remain read-only | Low | Display only, no apply | Severity, row links, non-duplicative findings | Real AI ready | No eval dataset | Add finding eval set after recommendation schema |
| `process-improvement-recommendation` | Module 2 Process Modeling | Suggest PTR improvements | PTR AI Assistant, QA Panel | `ProcessTaskRegisterContext` | `QARecommendationResponse` | mock, product-ai, OpenAI, Claude | prompt-only | Should normalize recommendations only, not rewrite PTR | `validateProcessTaskArrayInput`, `validateAIQARecommendations` | Recommendation safety and preview checks | Medium to High | Preview selected rows or full PTR, apply after approval | Valid patch paths, valid targetStepIds, risk labels, requiresConfirmation | Failing: `schema_validation_failed` | Provider returns invalid recommendation shape | Make next json_schema target and tighten risk taxonomy |
| `artifact-review` | Module 2 Process Modeling | Review generated BPMN or Service Blueprint artifacts | D01/D02 output review, QA surface | `ProcessTaskRegisterContext` plus artifact context | `ArtifactReviewResponse` | mock, product-ai, OpenAI, Claude | prompt-only | Split artifact warnings, QA recommendations, and template recommendations | `validateProcessTaskArrayInput`, `validateArtifactReviewResponse` | Artifact gates plus recommendation validation | High | Preview recommendations only, no XML auto-rewrite | Artifact issue detection, valid step links, template suggestions | Failing: `provider_output_normalization_failed` | Skill is too broad and token-heavy | Split into BPMN and Service Blueprint review schemas |
| `template-review` | Module 2 Process Modeling | Recommend template adjustments | Template Hub, D01/D02 template review | `ProcessTaskRegisterContext` plus selected template | `TemplateRecommendationResponse` | mock, product-ai, OpenAI, Claude | prompt-only | Normalize template recommendation list | `validateProcessTaskArrayInput`, `validateTemplateReviewOutput` | Template recommendation preview | Medium | Preview and user applies template changes | Valid template field targets, rationale, no auto-apply | Real AI ready | Needs selectedTemplate context and schema enforcement | Add template json_schema after QA schemas |
| `template-recommendation` | Module 2 Process Modeling | Deterministic template recommendation | Template Hub, D01/D02 | `ProcessTaskRegisterContext` | `TemplateRecommendationResponse` | mock only | mock-only | Minimal normalization | `validateProcessTaskArrayInput`, `validateTemplateReviewOutput` | Template recommendation preview | Low to Medium | Preview only | Correct D01/D02 fit and no schema errors | Implemented | Not provider-backed | Keep as local fallback |
| `notes-to-brd` | Module 3 Product Delivery | Generate BRD from notes | Product Delivery Workspace | `ProductDeliveryContext` with notes | `BRDResponse` | mock, product-ai, OpenAI, Claude | prompt-only | Normalize BRD sections | Product input check, `validateBRDResponse` | BRD quality gate | Medium | Draft preview/export after user review | Required BRD sections, traceability, assumptions | Real AI ready | No structured schema or eval | Add BRD json_schema after process skills |
| `ptr-to-brd` | Module 3 Product Delivery | Generate BRD from PTR | Product Delivery Workspace | `ProductDeliveryContext` with processTasks | `BRDResponse` | mock, product-ai, OpenAI, Claude | prompt-only | Normalize BRD sections | Product input check, `validateBRDResponse` | BRD quality gate | Medium | Draft preview/export after review | PTR coverage, requirements count, trace links | Real AI ready | Prompt-only reliability risk | Add eval dataset and json_schema |
| `ptr-to-brd-outline` | Module 3 Product Delivery | Generate deterministic BRD outline | Product Delivery Workspace | `ProductDeliveryContext` | `BRDResponse` | mock, product-ai, OpenAI, Claude | prompt-only | Normalize outline response | Product input check, `validateBRDResponse` | BRD quality gate | Medium | Draft preview/export after review | Outline completeness and source coverage | Implemented | May not need real AI path first | Keep as fallback, evaluate later |
| `brd-to-srs` | Module 3 Product Delivery | Generate SRS from BRD/PTR | Product Delivery Workspace | `ProductDeliveryContext` with BRD or PTR | `SRSResponse` | mock, product-ai, OpenAI, Claude | prompt-only | Normalize SRS sections | Product input check, `validateSRSResponse` | SRS quality gate | Medium | Draft preview/export after review | Functional/non-functional coverage, traceability | Real AI ready | No json_schema | Add SRS eval and schema |
| `notes-to-srs` | Module 3 Product Delivery | Generate SRS from notes | Product Delivery Workspace | `ProductDeliveryContext` with notes | `SRSResponse` | mock, product-ai, OpenAI, Claude | prompt-only | Normalize SRS sections | Product input check, `validateSRSResponse` | SRS quality gate | Medium | Draft preview/export after review | Notes coverage, open questions, constraints | Real AI ready | Prompt-only output | Add SRS notes eval |
| `ptr-to-srs-outline` | Module 3 Product Delivery | Generate deterministic SRS outline | Product Delivery Workspace | `ProductDeliveryContext` with PTR | `SRSResponse` | mock, product-ai, OpenAI, Claude | prompt-only | Normalize SRS outline | Product input check, `validateSRSResponse` | SRS quality gate | Medium | Draft preview/export after review | PTR coverage and section completeness | Implemented | No dedicated eval | Add outline eval if used in UI |
| `srs-to-user-stories` | Module 3 Product Delivery | Generate stories from SRS | Product Delivery Workspace | `ProductDeliveryContext` with SRS | `UserStorySetResponse` | mock, product-ai, OpenAI, Claude | prompt-only | Normalize story set | Product input check, `validateUserStorySetResponse` | User story quality gate | Medium | Draft preview/export after review | Story count, AC readiness, trace links | Real AI ready | No json_schema | Add story schema and eval |
| `brd-to-user-stories` | Module 3 Product Delivery | Generate stories from BRD | Product Delivery Workspace | `ProductDeliveryContext` with BRD | `UserStorySetResponse` | mock, product-ai, OpenAI, Claude | prompt-only | Normalize story set | Product input check, `validateUserStorySetResponse` | User story quality gate | Medium | Draft preview/export after review | BRD requirement coverage, user roles | Real AI ready | No json_schema | Add story eval |
| `brd-or-notes-to-user-stories` | Module 3 Product Delivery | Generate stories from BRD or notes | Product Delivery Workspace | `ProductDeliveryContext` | `UserStorySetResponse` | mock, product-ai, OpenAI, Claude | prompt-only | Normalize story set | Product input check, `validateUserStorySetResponse` | User story quality gate | Medium | Draft preview/export after review | Source coverage, duplicate avoidance | Implemented | Mixed input makes eval harder | Split eval by source type |
| `ptr-to-user-stories` | Module 3 Product Delivery | Generate stories from PTR | Product Delivery Workspace | `ProductDeliveryContext` with PTR | `UserStorySetResponse` | mock, product-ai, OpenAI, Claude | prompt-only | Normalize story set | Product input check, `validateUserStorySetResponse` | User story quality gate | Medium | Draft preview/export after review | Task-to-story traceability | Implemented | No structured output | Add schema after BRD/SRS |
| `user-stories-to-acceptance-criteria` | Module 3 Product Delivery | Generate AC from user stories | Product Delivery Workspace | `ProductDeliveryContext` with userStorySet | `AcceptanceCriteriaResponse` | mock, product-ai, OpenAI, Claude | prompt-only | Normalize AC response | Product input check, `validateAcceptanceCriteriaResponse` | Acceptance criteria quality gate | Medium | Draft preview/export after review | Given/when/then quality, coverage | Real AI ready | No json_schema | Add AC schema and eval |
| `user-stories-to-jira-export` | Module 3 Product Delivery | Prepare Jira-ready story export | Export/Product Delivery | `ProductDeliveryContext` | `UserStorySetResponse` | mock, product-ai, OpenAI, Claude | planned | Normalize export-ready story set | Product input check, `validateUserStorySetResponse` | Export quality checks | Medium | Export preview only | Jira field completeness | Planned | UI and contract not finalized | Define export-specific schema before provider work |
| `product-scope-review` | Module 3 Product Delivery | Review product scope | Product Delivery Workspace | `ProductDeliveryContext` | `ProductScopeReviewResponse` | mock, product-ai, OpenAI, Claude | prompt-only | Normalize scope review | Product input check, `validateProductScopeReviewResponse` | Product scope quality gate | High | Review findings, no auto-apply | Scope/non-scope clarity, assumptions, risks | Real AI ready | Needs stronger risk taxonomy | Add eval and schema |
| `mvp-slicing` | Module 3 Product Delivery | Recommend MVP slicing | Product Delivery Workspace | `ProductDeliveryContext` | `ProductScopeReviewResponse` | mock, product-ai, OpenAI, Claude | prompt-only | Normalize scope recommendations | Product input check, `validateProductScopeReviewResponse` | Product scope quality gate | High | Preview only, user decides | MVP rationale, dependency ordering | Real AI ready | Can affect product roadmap | Add explicit safe/unsafe recommendation schema |
| `scope-nonscope-definition` | Module 3 Product Delivery | Define scope and non-scope | Product Delivery Workspace | `ProductDeliveryContext` | `BRDResponse` | mock, product-ai, OpenAI, Claude | planned | Normalize BRD-like scope response | Product input check, `validateBRDResponse` | BRD quality gate | Medium | Draft preview/export after review | In/out scope clarity | Planned | Output schema may be wrong fit | Consider dedicated scope schema |
| `requirement-quality-check` | Module 3 Product Delivery | QA generated requirements | Product Delivery Workspace | `ProductDeliveryContext` with artifacts | `RequirementQAResponse` | mock, product-ai, OpenAI, Claude | prompt-only | Normalize requirement QA report | Product input check, `validateRequirementQAResponse` | Requirement QA gate | Low to Medium | Display findings, no direct apply | Severity, artifact links, actionable fixes | Real AI ready | Needs eval dataset | Add requirement QA eval after artifact schemas |
| `ptr-to-ai-coding-pack` | Module 5 AI Coding Pack | Generate coding pack from PTR/Product artifacts | AI Coding Pack, Export Center | `ProductDeliveryContext` | `AICodingPackResponse` | mock, product-ai, OpenAI, Claude | prompt-only | Normalize coding pack sections | Product input check, `validateAICodingPackResponse` | AI Coding Pack quality gate | Restricted | Preview/export only, no execution | AC coverage, non-goals, test plan, open questions | Implemented | High governance risk if under-specified | Add schema and stronger eval before real usage |
| `user-stories-to-ai-coding-pack` | Module 5 AI Coding Pack | Generate coding pack from stories | AI Coding Pack, Export Center | `ProductDeliveryContext` with userStorySet | `AICodingPackResponse` | mock, product-ai, OpenAI, Claude | prompt-only | Normalize coding pack sections | Product input check, `validateAICodingPackResponse` | AI Coding Pack quality gate | Restricted | Preview/export only, no execution | Story coverage, coding brief completeness | Real AI ready | Prompt-only for high-risk output | Add json_schema after product delivery schemas |

## 3. Deep Dive - `input-brief-to-ptr`

### Current State

`input-brief-to-ptr` is the strongest AI skill in the system today:

- It is registered as provider-backed and real-AI-ready.
- OpenAI uses `DRAFT_PTR_OUTPUT_SCHEMA` through Structured Outputs.
- The provider response adapter extracts text from the OpenAI Responses API wrapper.
- The route parses provider output, normalizes it, validates it as `DraftProcessTaskRegister`, and runs a Draft PTR quality gate.
- The eval runner exists at `evals/input-brief-to-ptr/run-eval.ts` with five Vietnamese process cases.

### Why It Passes Validation

It passes validation because the skill now has aligned layers:

- Prompt pack explicitly describes the Draft PTR output contract.
- OpenAI json_schema constrains the root fields, task fields, enums, required fields, and `additionalProperties`.
- The normalizer no longer receives the full OpenAI Responses API wrapper as the business payload.
- The validator receives `draftProcessTasks`, language metadata, confidence, assumptions, open questions, and source summary in the expected shape.

### Why Eval Is Still Only 20%

The eval score is a product quality signal, not just a schema signal. A response can be schema-valid and still fail
criteria such as:

- Missing expected gateway behavior in business flows.
- Too few or too many tasks for the scenario.
- Weak actor completeness for non-event rows.
- Not using `serviceTask` when system-heavy payment processing expects it.
- Not setting `confidence` to `low` for minimal input.
- Insufficient exception paths in complex lending cases.

The current eval dataset intentionally checks whether the skill behaves like a process modeler, not only whether it
returns valid JSON.

### Input Contract Review

The current `StructuredProcessBrief` contract is adequate for MVP but should be tightened around:

- Minimum useful fields by source mode: manual brief, file, chat/notes.
- Actor and system normalization rules.
- Scope boundaries and exception notes.
- Language expectations for Vietnamese input and bilingual output.

### Output Contract Review

The Draft PTR output contract is strong enough for schema compliance. Remaining improvements should focus on
semantic rules:

- Enforce exactly one start event and one end event in quality gate.
- Require every next-step reference to exist.
- Penalize missing `actor` on task rows.
- Encourage `serviceTask` for system-executed steps.
- Require gateway rows for condition-heavy inputs.

### Eval Criteria Review

The current eval criteria are useful but should be expanded:

- Add invalid-next-step checks.
- Add phase coverage checks.
- Add actor/system consistency checks.
- Add source coverage checks for file and notes variants.
- Track token usage and latency by case.

### Redesign Recommendations

- Keep the current json_schema path.
- Add targeted prompt examples for gateway-heavy, system-heavy, and minimal-input cases.
- Add a post-validation semantic scoring report to explain eval failures.
- Reuse the same Draft PTR schema for `file-to-ptr-draft` and `chat-to-ptr-draft`.

## 4. Deep Dive - `process-improvement-recommendation`

### Current Failure

The current failure is `schema_validation_failed`. This means provider output reaches parsing and normalization, but
the resulting object does not satisfy `QARecommendationResponse` validation.

Likely failure modes:

- Recommendations are missing required fields.
- `title`, `previewText`, `confidence`, or patch fields have the wrong type.
- `targetStepIds` reference missing steps.
- Graph-changing suggestions do not declare risk or confirmation behavior clearly.
- Provider returns explanatory prose instead of strict recommendation JSON.

### Expected Output Contract

The skill should return:

```json
{
  "recommendations": [
    {
      "id": "rec-001",
      "title": "Short recommendation title",
      "previewText": "What will change",
      "targetStepIds": ["S003"],
      "riskLevel": "low",
      "requiresConfirmation": true,
      "patches": []
    }
  ]
}
```

The exact field set should mirror the source `QARecommendation` type and validator, not a hand-written subset.

### Is `QARecommendation[]` Sufficient?

`QARecommendation[]` is sufficient for field-level and selected-row improvement suggestions. It is not sufficient by
itself for broad process redesign unless risk and graph-changing behavior are explicit.

Recommended rule:

- Keep `QARecommendationResponse` for normal improvements.
- Require graph-changing recommendations to be marked high risk and unselected by default.
- Do not allow the skill to return a full replacement PTR.

### Required json_schema Direction

This should be the next json_schema target after Draft PTR:

- Create a strict `QA_RECOMMENDATION_OUTPUT_SCHEMA`.
- Include canonical enum values for risk, confidence, source, operation type, and patch paths.
- Require `requiresConfirmation`.
- Require valid target step references in validation, because json_schema cannot know the current PTR stepIds.

### Risk Taxonomy

Recommended taxonomy:

- `low`: wording, missing actor/system/lane, missing input/output, comments.
- `medium`: SLA, risk/control, exception handling, review status changes.
- `high`: next-step changes, gateway changes, splitting tasks, adding/removing rows.
- `graph-changing`: any recommendation that changes process topology; never selected by default.

### Apply Behavior

The skill must keep the current governance model:

- Show recommendations in preview.
- Safe low-risk recommendations can be selected by default.
- Medium/high and graph-changing recommendations require explicit review.
- Never apply automatically after provider output.

## 5. Deep Dive - `artifact-review`

### Current Failure

The current failure is `provider_output_normalization_failed`. This suggests the provider output is not being converted
into the expected `ArtifactReviewResponse`:

```ts
{
  recommendations: QARecommendation[];
  templateRecommendations: TemplateRecommendation[];
  warnings: string[];
}
```

### Token and Latency Concern

Artifact review can be expensive because it may include:

- Full Process Task Register context.
- Generated BPMN XML or draw.io XML.
- Selected template profile.
- Existing QA findings and recommendations.

The orchestrator handoff already shows this skill consuming materially more tokens than process recommendation.
The product should avoid sending full artifacts unless the review objective requires it.

### Is This Skill Too Broad?

Yes, for reliable provider-backed execution. BPMN and Service Blueprint review have different failure modes:

- BPMN review checks XML validity, BPMN type mapping, sequence flows, lanes, DI shapes, and missing references.
- Service Blueprint review checks draw.io compatibility, row/phase layout, card overlap, service rows, and template rules.

One broad `artifact-review` skill makes the prompt, schema, and eval criteria too mixed.

### Decision: Split the Skill

Recommended Bài 2 decision:

- Keep `artifact-review` as a compatibility umbrella in the registry.
- Introduce separate contracts next:
  - `bpmn-artifact-review`
  - `service-blueprint-artifact-review`

This allows smaller prompts, narrower context, lower token usage, and clearer validation.

### Minimal Context Principle

Artifact review should receive only:

- Artifact type.
- Generated artifact summary or bounded XML excerpt when possible.
- ProcessTask fields needed to validate references.
- Selected template identity and relevant rules.
- Existing gate failures if available.

It should not receive unrelated product delivery context, full notes, or full prompt history.

### Output Contract Proposal

For split artifact review skills:

```json
{
  "artifactType": "bpmn",
  "findings": [
    {
      "id": "finding-001",
      "severity": "warning",
      "title": "Missing sequence flow",
      "affectedStepIds": ["S004"],
      "message": "Gateway branch does not point to an existing step."
    }
  ],
  "recommendations": [],
  "templateRecommendations": [],
  "warnings": []
}
```

The existing `ArtifactReviewResponse` can remain the MVP return type, but the next schema should make artifact type,
finding severity, affected stepIds, and recommendation risk explicit.

## 6. Bài 2 Decisions

### Skills That Need Redesign

- `process-improvement-recommendation`: redesign around strict `QARecommendationResponse` schema and risk taxonomy.
- `artifact-review`: split into BPMN and Service Blueprint review contracts.
- `scope-nonscope-definition`: consider a dedicated scope schema instead of `BRDResponse`.
- `user-stories-to-jira-export`: define export-specific output before provider work.

### Skills That Need json_schema Next

Priority order:

1. `process-improvement-recommendation`
2. `ai-process-qa`
3. `artifact-review` split schemas
4. `template-review`
5. `ptr-to-brd` and `notes-to-brd`
6. `brd-to-srs` and `notes-to-srs`
7. User story and acceptance criteria generation
8. AI Coding Pack skills

### Skills That Need Eval Dataset

Immediate:

- `process-improvement-recommendation`
- `artifact-review`
- `file-to-ptr-draft`
- `chat-to-ptr-draft`

Next:

- `ptr-to-brd`
- `brd-to-srs`
- `srs-to-user-stories`
- `user-stories-to-acceptance-criteria`
- `requirement-quality-check`
- `ptr-to-ai-coding-pack`

### Skills to Split or Keep

- Split `artifact-review` into `bpmn-artifact-review` and `service-blueprint-artifact-review`.
- Keep `process-improvement-recommendation` as one skill for now, but add action-specific metadata and strict schema.
- Keep `input-brief-to-ptr` as-is structurally, with semantic eval improvements.
- Keep deterministic `template-recommendation` as local fallback.

## 7. Bài 3 Backlog

### json_schema Implementation Backlog

- Create `QA_RECOMMENDATION_OUTPUT_SCHEMA`.
- Wire it for OpenAI when `skillId` is `process-improvement-recommendation` or `ai-process-qa`.
- Create split artifact review schemas after defining `bpmn-artifact-review` and `service-blueprint-artifact-review`.
- Add `TemplateRecommendationResponse` json_schema.
- Add BRD/SRS/UserStory/AcceptanceCriteria schemas only after product delivery validators are stable.

### Schema Edge Case Tests

- Missing required fields.
- Wrong enum values.
- Invalid `targetStepIds`.
- Empty recommendations.
- Graph-changing recommendation without confirmation.
- Full replacement PTR returned where recommendations are expected.
- Artifact review returning prose instead of JSON.
- Artifact review returning raw XML rewrite instead of findings/recommendations.

### Provider-Specific Structured Output Handling

- OpenAI: use `text.format.type = "json_schema"` for Responses API.
- Claude: keep prompt-constrained JSON until provider-specific structured output support is implemented.
- Mock/local: keep deterministic outputs, but validate them through the same schema paths.
- Product AI: treat as provider-backed and require the same adapter and validation contracts.
- All providers: log provider type, model, token usage, latency, and structured-output mode without logging full business data.

