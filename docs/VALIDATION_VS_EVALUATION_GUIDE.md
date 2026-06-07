# Validation vs Evaluation Guide

Date: 2026-05-27

Audience: AI Orchestrator, product engineering, QA, and prompt/schema reviewers.

Scope: Process Blueprint AI Workbench AI skills, especially `input-brief-to-ptr` and `process-improvement-recommendation`.

## 1. Validation la gi

Validation answers this question:

```text
Is this input or output acceptable for the product contract?
```

Validation is a gate. It decides whether a payload can move to preview, recommendation review, apply, save, or export.

In this product, validation checks things such as:

- Required objects exist, for example `StructuredProcessBrief`, `ProcessTask[]`, or `{ recommendations: QARecommendation[] }`.
- Required fields are present and have the right type.
- Canonical enum values are used, for example `startEvent`, `userTask`, `serviceTask`, `exclusiveGateway`, and `endEvent`.
- `stepId` values are unique.
- `defaultNextStep`, `yesNextStep`, and `noNextStep` point to existing steps.
- Recommendation operations use supported operation kinds.
- `targetStepIds` reference existing Process Task Register rows.
- Artifact review output does not try to rewrite BPMN or draw.io XML directly.

Current examples in code:

- `validateStructuredProcessBrief` validates AI Input Brief input.
- `validateDraftProcessTaskRegister` validates Draft PTR output.
- `validateAISkillOutput` routes output validation by skill id.
- `validateAIQARecommendations` validates `QARecommendation[]`.
- `validateArtifactReviewResponse` validates artifact review output.

Validation is mandatory, but it is not the same as product quality.

## 2. Evaluation la gi

Evaluation answers a different question:

```text
Is this skill useful and reliable for the business outcome we need?
```

Evaluation is a measurement loop. It does not only ask whether JSON is valid. It checks whether the AI skill behaves like a good process modeling assistant, recommendation assistant, or artifact reviewer across representative cases.

Evaluation checks things such as:

- Did the generated process include a meaningful start and end?
- Did it create enough tasks, but not too many?
- Did exception-heavy input create gateways?
- Did system-heavy input create `serviceTask` rows?
- Did non-event rows have actors?
- Did a minimal brief produce `confidence: "low"` and useful open questions?
- Did recommendations target real step ids?
- Did graph-changing recommendations get high risk and confirmation?
- Did recommendations reduce real QA issues instead of creating new ambiguity?

Current example:

- `evals/input-brief-to-ptr/run-eval.ts` runs cases from `evals/input-brief-to-ptr/dataset.json` and scores expected criteria such as `hasGateway`, `allStepsHaveActor`, `hasServiceTask`, `confidenceLow`, and `gatewayCount`.

## 3. Vi sao schema pass nhung quality van fail

Schema validation proves that the output is structurally acceptable. It does not prove that the output is a good business artifact.

A Draft PTR can pass schema while still being weak because:

- It has valid rows, but models the process as a flat linear list.
- It has a start and end event, but misses the approval or reject gateway.
- It has valid `bpmnType` values, but uses generic tasks where `serviceTask` should represent system work.
- It has valid strings in `actor`, but assigns vague or wrong ownership.
- It has valid next-step references, but does not model exception paths.
- It uses `confidence: "medium"` even when the input is too thin.

For Process Blueprint AI Workbench, the safe mental model is:

```text
Validation = contract safety.
Quality gate = release/apply readiness.
Evaluation = skill usefulness over a dataset.
```

These layers complement each other. None replaces the others.

## 4. Vi du voi input-brief-to-ptr

Skill:

```text
input-brief-to-ptr
```

Validation input:

- The request payload must be a valid `StructuredProcessBrief`.
- Required sections include process info, business objective, scope, start/end, and actors.

Validation output:

- The response must be a valid `DraftProcessTaskRegister`.
- `draftProcessTasks` must be a non-empty `ProcessTask[]`.
- Required task fields must exist.
- `rowType`, `bpmnType`, `taskNature`, `dataAction`, and `reviewStatus` must use known enum values.
- Step ids must be unique.
- Next-step references must exist.
- Metadata such as `assumptions`, `openQuestions`, `qualityIssues`, `sourceSummary`, `confidence`, `inputLanguage`, and `outputLanguage` must be present and valid.

Quality gate examples:

- `runDraftProcessTaskRegisterQualityGate` blocks invalid missing core fields, duplicate ids, invalid next steps, missing start, and missing end.
- It warns when confidence is low or rows are not all in `needsReview`.
- `runDraftPtrGateV1` adds dimensions for schema completeness, flow integrity, gateway safety, actor/system coverage, and decomposition quality.

Evaluation examples from `evals/input-brief-to-ptr/dataset.json`:

- Banking lending should have start, end, 8-25 tasks, gateway, and actors on all non-event rows.
- Account opening KYC should include a gateway for KYC pass/fail.
- Payment processing should include `serviceTask` because many systems participate.
- Minimal brief should produce low confidence.
- Complex secured lending should create at least two gateways.

This is why `input-brief-to-ptr` can be schema-valid and still receive a low eval score. It may satisfy the product contract but miss process modeling expectations.

## 5. Vi du voi process-improvement-recommendation

Skill:

```text
process-improvement-recommendation
```

Validation input:

- The request must include `processTasks`.
- Selected rows or action metadata can narrow the task, but the Process Task Register remains the source context.

Validation output:

- The output must be `QARecommendation[]` or `{ recommendations: QARecommendation[] }`.
- Each recommendation must have required fields such as title, description, confidence, impact, target step ids, preview text, risk level, and confirmation behavior.
- `targetStepIds` must exist in the current Process Task Register.
- Operation kinds must be supported, for example `UpdateTaskField`, `AssignActor`, `AssignSystem`, `SplitTask`, `CreateGateway`, or `AddGatewayBranch`.
- Graph-changing recommendations must be high risk and require explicit confirmation.

Evaluation should then ask:

- Did the skill recommend an actor when a task has missing ownership?
- Did it recommend input/output fixes when a task lacks traceable data?
- Did it avoid duplicating deterministic rule recommendations unless it adds better rationale?
- Did it classify split-task or gateway recommendations as high risk?
- Did it produce previewable operations instead of free-form advice?
- Did the recommendations reduce QA issues after user-approved apply?

Here again, schema pass is necessary but not sufficient. A recommendation can be valid JSON and still be unhelpful, too vague, duplicated, risky, or poorly prioritized.

## 6. Cac loai eval

### Exact Match

Exact match compares the output to an expected value exactly.

Good for:

- Stable ids in deterministic generators.
- Enum values.
- Small normalization functions.
- Known validation error codes.

Weakness:

- Too brittle for AI-generated process wording.
- Penalizes acceptable variants.
- Not ideal for business modeling tasks where many valid answers exist.

Example:

```text
Expected confidence = low
Actual confidence = low
Result = pass
```

### Criteria-Based

Criteria-based eval checks measurable properties rather than exact wording.

Good for:

- Process generation.
- Recommendation quality.
- Artifact review.
- Product-level regression checks.

Examples:

- `hasStartEvent`
- `hasEndEvent`
- `minTasks`
- `maxTasks`
- `hasGateway`
- `hasServiceTask`
- `allStepsHaveActor`
- `confidenceLow`
- `gatewayCount`
- `allTargetStepIdsExist`
- `graphChangesRequireConfirmation`

This is the best first eval style for this product because it is measurable, business-relevant, and not overly brittle.

### LLM-as-Judge

LLM-as-judge asks another model to score the output against a rubric.

Good for:

- Semantic quality where deterministic checks are too narrow.
- Reviewing rationale clarity.
- Evaluating whether exception paths are business-plausible.
- Comparing two candidate prompts or providers.

Risks:

- Higher cost.
- Less deterministic.
- Needs careful rubrics and calibration.
- Should not be the first release gate for banking-sensitive workflows.

LLM-as-judge should come after criteria-based eval has a stable baseline.

## 7. Product nen dung criteria-based eval truoc

Process Blueprint AI Workbench should use criteria-based eval first because the product needs repeatable, auditable quality signals.

Reasons:

- It is deterministic enough for CI and release gates.
- It maps directly to business expectations.
- It avoids brittle exact string comparisons.
- It is cheaper and safer than LLM-as-judge.
- It works with mock/local and real provider outputs.
- It gives clear missing criteria such as `hasGateway` or `allStepsHaveActor`.

Recommended priority:

1. Keep schema validation mandatory for every skill.
2. Add criteria-based evals for each high-value skill.
3. Track pass, partial, and fail over time.
4. Add LLM-as-judge only for semantic dimensions that deterministic criteria cannot cover.

## 8. Eval result interpretation

### Pass

Pass means the case satisfied all expected criteria and the API returned a valid response.

Interpretation:

- The skill behaved acceptably for this case.
- It can still need human review.
- Pass is not permission to auto-apply.

### Partial

Partial means the response was valid enough to inspect, but one or more quality criteria were missing.

Interpretation:

- This is often the most useful signal for AI skills.
- The provider did not crash and validation likely passed, but product quality was incomplete.
- Missing criteria should drive prompt, schema, quality gate, or context changes.

Examples:

- Missing `hasGateway`.
- Missing `allStepsHaveActor`.
- Missing `confidenceLow`.

### Fail

Fail means the case could not produce a valid evaluated result.

Common reasons:

- API unavailable.
- Provider error.
- JSON parse failure.
- Schema validation failure.
- Normalization failure.
- Response blocked before criteria could be measured.

Fail should be treated as reliability or contract breakage before semantic tuning.

## 9. Bai hoc tu baseline hien tai

The current baseline taught an important lesson:

```text
input-brief-to-ptr validation can pass while eval remains low.
```

Observed missing criteria include:

- `allStepsHaveActor`: non-event rows may miss responsible ownership.
- `hasGateway`: KYC, lending, or exception-heavy flows may become linear task lists.
- `confidenceLow`: thin briefs may be over-confident.
- `gatewayCount`: complex lending flows may not create enough decision points.

Meaning:

- The Draft PTR schema is useful and necessary.
- Structured output reduces malformed JSON risk.
- Validation catches contract problems.
- The eval dataset catches process modeling gaps.

The next improvement should not only add more fields to schema. It should improve semantic generation behavior and measure the improvement with criteria-based eval.

## 10. Quy tac viet eval criteria tot

Good eval criteria should be measurable.

Bad:

```text
The process should be good.
```

Better:

```text
The output has at least one exclusiveGateway when exceptionPaths are present.
```

Good eval criteria should be business-relevant.

Examples:

- Banking KYC needs a pass/fail decision.
- Payment processing with multiple systems should include system/service tasks.
- Recommendations that change process topology must be high risk.

Good eval criteria should not be too brittle.

Avoid overfitting to exact task names or exact row count unless the case is deterministic. Prefer ranges and semantic properties.

Good eval criteria should not be only schema-based.

Weak:

```text
draftProcessTasks is an array.
```

Better:

```text
All non-event rows have actor, system, or an explicit open question explaining the missing ownership.
```

Recommended criteria design checklist:

- Is it objectively measurable?
- Does it reflect real product value?
- Can multiple good outputs pass it?
- Does failure produce an actionable missing criterion?
- Does it test semantic quality beyond JSON shape?
- Does it respect human-in-the-loop governance?

## 11. Next steps cho Bai 5

Recommended Bai 5 focus: Criteria-Based Eval & Semantic Quality Hardening.

Suggested tasks:

1. Run the current eval suite with the local dev server running and record baseline results.
2. Add a compact eval result summary document or artifact that is not confused with schema validation.
3. Improve `input-brief-to-ptr` criteria coverage for next-step validity, source coverage, exception coverage, actor/system coverage, and service-task usage.
4. Add or extend criteria-based eval for `process-improvement-recommendation`:
   - valid recommendation contract,
   - existing target step ids,
   - correct risk classification,
   - graph-changing confirmation,
   - no full PTR rewrite.
5. Decide which quality gaps belong in prompt instructions, quality gates, or eval-only release signals.
6. Keep LLM-as-judge as a later layer after deterministic criteria have stabilized.
7. Track per-skill trend over time: validation pass rate, eval pass rate, partial reasons, fail reasons, latency, and token usage.

Product rule for Bai 5:

```text
Do not celebrate schema pass alone. Celebrate schema pass plus improving criteria-based quality.
```
