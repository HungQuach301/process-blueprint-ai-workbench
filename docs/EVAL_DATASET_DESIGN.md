# Eval Dataset Design

Date: 2026-05-27

Scope:

- `input-brief-to-ptr`
- `process-improvement-recommendation`

Purpose:

Design the next evaluation datasets before changing eval code or dataset files. This document defines coverage, criteria, scoring, and what should stay out of scope for now.

## 1. Eval Dataset Principles

Eval datasets should measure product usefulness, not only schema validity.

Core principles:

- Use criteria-based eval first. Exact match is too brittle for AI-generated process wording.
- Keep every case tied to a concrete business scenario.
- Include both happy-path and failure-prone cases.
- Prefer measurable properties such as gateway presence, task count range, valid target step ids, and risk classification.
- Keep criteria business-relevant, for example KYC needs pass/fail logic and payment processing needs system/service task coverage.
- Include Vietnamese and English cases because the product must support both user groups.
- Keep banking and enterprise data synthetic. Do not include real customer, account, loan, policy, or internal system data.
- Use stable canonical internal keys and enum values.
- Separate validation criteria from semantic criteria so a schema pass is not mistaken for an eval pass.
- Do not make the dataset too narrow around one provider's wording style.
- Add regression cases for known baseline misses: `allStepsHaveActor`, `hasGateway`, `confidenceLow`, and `gatewayCount`.

Each eval case should include:

- A short id.
- A business-readable name.
- A scenario description.
- Input payload.
- Expected criteria.
- Optional notes explaining why the case exists.

## 2. Dataset Coverage Map - input-brief-to-ptr

Target size: 20 cases.

Current baseline: 5 Vietnamese cases covering SME lending, account opening KYC, payment processing, minimal brief, and complex secured lending.

The expanded dataset should cover the matrix below. One case can satisfy multiple coverage tags, but the final set should avoid overloading every case with too many goals.

| Coverage area | Target cases | Purpose | Candidate criteria |
|---|---:|---|---|
| Simple process | 2 | Confirm the skill can produce a small clean Draft PTR without over-modeling. | `hasStartEvent`, `hasEndEvent`, `minTasks`, `maxTasks`, `hasGateway: false` when no decision exists |
| Full process | 2 | Confirm rich briefs create enough traceable process detail. | `minTasks`, `maxTasks`, `allStepsHaveActor`, `hasDataObject`, `hasPhaseCoverage` |
| Minimal brief | 2 | Confirm weak input remains short, cautious, and review-heavy. | `confidenceLow`, `hasOpenQuestions`, `maxTasks`, `allRowsNeedReview` |
| Complex exception | 2 | Confirm exception paths become gateways or explicit review questions. | `hasGateway`, `gatewayCount`, `hasExceptionHandling`, `hasRejectPath` |
| Gateway required | 3 | Confirm decision-heavy domains create `exclusiveGateway`. | `hasGateway`, `gatewayCount`, `gatewayHasCondition`, `gatewayHasBranches` |
| Gateway not required | 2 | Confirm linear administrative processes do not invent unnecessary gateways. | `hasGateway: false`, `maxTasks`, `validNextStepReferences` |
| Multi-system | 2 | Confirm system-heavy flows use `serviceTask` and system fields. | `hasServiceTask`, `allServiceTasksHaveSystem`, `multiSystemCoverage` |
| Missing actor in input | 2 | Confirm the skill either infers actors carefully or raises open questions. | `allStepsHaveActor` or `hasActorOpenQuestion`, `confidenceNotHigh` |
| Vietnamese brief | 10+ | Protect Vietnamese-first user journeys. | `inputLanguage: vi`, criteria by case |
| English brief | 5+ | Ensure English users are supported. | `inputLanguage: en`, `outputLanguage` expectation, criteria by case |
| Banking lending | 4 | Cover secured lending, SME lending, approval, collateral, reject/resubmission. | `hasGateway`, `gatewayCount`, `allStepsHaveActor`, `hasRiskControl` |
| Onboarding | 3 | Cover account opening, KYC, customer onboarding, document checks. | `hasGateway`, `hasCustomerAction`, `hasKycDecision` |
| Payment | 3 | Cover payment initiation, fraud, balance, switch/third party, reconciliation. | `hasServiceTask`, `multiSystemCoverage`, `hasExceptionPath` |
| Servicing | 3 | Cover service request, complaint, card replacement, limit change, closure. | `minTasks`, `maxTasks`, `customerInteractionCoverage`, optional `hasGateway` by scenario |

### Proposed 20-Case Shape

| Case group | Count | Notes |
|---|---:|---|
| Existing baseline cases | 5 | Keep current five cases as regression anchors. |
| English cases | 5 | Add onboarding, payment, servicing, simple admin, and minimal brief in English. |
| Gateway-positive cases | 4 | Add decision-heavy lending, KYC, complaint escalation, and payment exception. |
| Gateway-negative cases | 2 | Add linear notification or document archive workflows. |
| Multi-system cases | 2 | Add payment/reconciliation and customer onboarding with CRM/Core/Document Store. |
| Missing-context cases | 2 | Add missing actor and missing system/data brief cases. |

### Candidate Criteria To Add Later

The current runner supports only a small criteria set. Future criteria should include:

- `validNextStepReferences`
- `hasOpenQuestions`
- `hasQualityIssues`
- `allRowsNeedReview`
- `hasDataObject`
- `hasPhaseCoverage`
- `hasExceptionHandling`
- `gatewayHasCondition`
- `gatewayHasBranches`
- `allServiceTasksHaveSystem`
- `confidenceNotHigh`
- `hasCustomerInteractionType`
- `hasRiskControl`
- `hasSourceCoverage`

These should be added only in a later eval-code step, not in this docs-only step.

## 3. Dataset Coverage Map - process-improvement-recommendation

Minimum target size: 10 cases.

Current baseline: 3 cases covering missing ownership, missing input/output, and complex task split.

The skill output must remain `QARecommendation[]` or `{ recommendations: QARecommendation[] }`. It must not return a full replacement Process Task Register.

| Coverage area | Target cases | Purpose | Candidate criteria |
|---|---:|---|---|
| Missing actor | 1 | Recommend `AssignActor` or `UpdateTaskField` safely. | `hasRecommendations`, `targetsExistingStepIds`, `hasAssignActorOrActorPatch`, `riskLowOrMedium` |
| Missing system | 1 | Recommend `AssignSystem` for service/system tasks. | `hasAssignSystemOrSystemPatch`, `targetsExistingStepIds`, `riskLowOrMedium` |
| Missing input/output | 1 | Recommend field updates for traceability. | `updatesInputOrOutput`, `safeFieldUpdate`, `previewTextPresent` |
| Ambiguous task wording | 1 | Improve vague task text without changing graph. | `updatesTaskNameOrComment`, `riskLow`, `noGraphChange` |
| Task should split | 1 | Produce high-risk split recommendation. | `hasSplitTask`, `riskHigh`, `requiresConfirmation`, `notSafeByDefault` |
| Gateway missing branch | 1 | Detect incomplete decision logic. | `hasAddGatewayBranchOrUpdateConnection`, `riskHigh`, `requiresConfirmation` |
| customerInteractionType missing | 1 | Suggest D02 readiness field. | `hasSetInteractionType`, `riskLow`, `targetsExistingStepIds` |
| High-risk graph change | 1 | Ensure topology changes are classified safely. | `hasGraphChangingOperation`, `riskHigh`, `requiresConfirmation` |
| Safe field update | 1 | Confirm simple low-risk recommendations remain apply-preview friendly. | `onlySafeOperations`, `riskLow`, `requiresConfirmation` |
| Conflicting recommendations | 1 | Check duplicate/conflict handling expectations. | `doesNotCreateConflictingUpdates`, `warningsPresentIfConflict`, `noDuplicateTargetFieldUpdates` |

### Proposed 10-Case Shape

| Case id idea | Scenario | Expected recommendation behavior |
|---|---|---|
| `pir-001-missing-actor` | Manual user task has empty `actor` and `actorLane`. | Recommend actor assignment or mark for review with low/medium risk. |
| `pir-002-missing-system` | `serviceTask` has empty `system` and `systemLane`. | Recommend system assignment or system-lane update. |
| `pir-003-missing-input-output` | Task has blank `input` and `output`. | Recommend `UpdateTaskField` operations for input/output. |
| `pir-004-ambiguous-wording` | Task name is vague, such as "Process request". | Recommend clearer wording without graph change. |
| `pir-005-split-task` | Task name contains multiple actions. | Recommend `SplitTask`, high risk, confirmation required. |
| `pir-006-gateway-missing-branch` | Gateway has `yesNextStep` but no `noNextStep`. | Recommend branch fix or new task/connection, high risk. |
| `pir-007-missing-interaction-type` | D02-relevant row lacks `customerInteractionType`. | Recommend `SetInteractionType`. |
| `pir-008-create-gateway` | Linear process contains explicit pass/fail rule in task text. | Recommend `CreateGateway` or `AddGatewayBranch`, high risk. |
| `pir-009-safe-field-update` | Review status or missing comment/source field needs low-risk update. | Recommend safe `UpdateTaskField` or `MarkReviewStatus`. |
| `pir-010-conflicting-context` | Existing recommendations already update same field differently. | Avoid duplicate/conflicting update or include warning. |

### Candidate Criteria To Add Later

Recommended future criteria:

- `hasRecommendations`
- `noFullPtrRewrite`
- `allRecommendationsHaveTargetSteps`
- `targetsExistingStepIds`
- `allRecommendationsRequireConfirmation`
- `riskLevelPresent`
- `confidencePresent`
- `previewTextPresent`
- `noUnsupportedOperations`
- `onlySafeOperations`
- `hasGraphChangingOperation`
- `graphChangesAreHighRisk`
- `graphChangesRequireConfirmation`
- `doesNotCreateConflictingUpdates`
- `warningsPresentIfConflict`
- `noDuplicateTargetFieldUpdates`

## 4. Criteria Design

Criteria should be grouped by purpose so failures are easy to interpret.

### Schema Criteria

Schema criteria confirm the product can parse and validate the response.

For `input-brief-to-ptr`:

- Output is `DraftProcessTaskRegister`.
- `draftProcessTasks` is non-empty.
- `ProcessTask` fields exist.
- Canonical enum values are used.
- Step ids are unique.
- Next-step references point to existing step ids.
- Metadata fields exist: assumptions, open questions, quality issues, source summary, confidence, input language, output language.

For `process-improvement-recommendation`:

- Output is `QARecommendation[]` or `{ recommendations: QARecommendation[] }`.
- Required recommendation fields exist.
- `targetStepIds` is non-empty.
- `confidence`, `impact`, and `riskLevel` are canonical.
- Operation kinds are supported.
- Patch fields target valid `ProcessTask` fields.

### Semantic Criteria

Semantic criteria measure whether the output understands the business scenario.

For `input-brief-to-ptr`:

- Gateway exists when the brief has approval, reject, KYC, pass/fail, fraud, or exception logic.
- Gateway is absent when the process is explicitly linear.
- System-heavy flows include `serviceTask`.
- Actor ownership exists or an open question explains missing ownership.
- Minimal brief produces low confidence and review questions.
- Rich brief produces enough process detail without excessive rows.

For `process-improvement-recommendation`:

- Missing actor leads to actor-related recommendation.
- Missing system in service task leads to system-related recommendation.
- Compound task leads to split-task recommendation.
- Ambiguous wording leads to wording improvement, not topology rewrite.
- Missing customer interaction type leads to D02-readiness recommendation.

### Process Integrity Criteria

Process integrity criteria protect the Process Task Register as source of truth.

For `input-brief-to-ptr`:

- Start and end events exist.
- Sequence references are valid.
- Gateways have condition questions when present.
- Gateways have yes/no branches where applicable.
- No orphaned core task rows.
- Generated rows preserve actor, system, data object, SLA, risk/control, and review status where inferable.

For `process-improvement-recommendation`:

- Recommendations do not reference missing step ids.
- New tasks use valid `ProcessTask` shape.
- Connection changes use `defaultNextStep`, `yesNextStep`, or `noNextStep`.
- Recommendation output does not mutate PTR directly.
- Recommendation output does not return raw replacement `processTasks`.

### Risk/Safety Criteria

Risk/safety criteria protect human-in-the-loop governance.

For both skills:

- Output remains draft/recommendation, not auto-applied.
- Low-risk recommendations are field-level only.
- Graph-changing operations are high risk.
- High-risk recommendations require explicit confirmation.
- Split task, create task, create gateway, add gateway branch, and update connection are never treated as safe default actions.
- Warnings are present when assumptions or conflicts exist.

## 5. Scoring Model

Use three statuses:

- `pass`
- `partial`
- `fail`

### Pass

A case passes when:

- API call succeeds.
- Output passes schema validation.
- All expected criteria pass.

Pass means the skill behaved acceptably for that eval case. It does not mean the output can be auto-applied.

### Partial

A case is partial when:

- API call succeeds.
- Output is valid enough to inspect.
- One or more expected quality criteria fail.

Partial is useful for semantic iteration. Missing criteria should be recorded and trended over time.

### Fail

A case fails when:

- API call fails.
- Provider output cannot be parsed.
- Schema validation fails.
- Normalization fails.
- The response cannot be evaluated.

Fail should be treated as reliability or contract breakage before semantic tuning.

### Weighted Criteria

The first implementation can keep unweighted criteria for simplicity. Weighted criteria can be introduced when criteria count grows.

Recommended future weights:

| Criteria group | Suggested weight |
|---|---:|
| Schema criteria | 30% |
| Semantic criteria | 35% |
| Process integrity criteria | 20% |
| Risk/safety criteria | 15% |

For `process-improvement-recommendation`, risk/safety may deserve a higher weight because a valid but unsafe recommendation can damage trust.

Important rule:

```text
Any schema failure or unsafe high-risk misclassification should force fail, even if other criteria pass.
```

## 6. Target Dataset Size

### input-brief-to-ptr

Target: 20 cases.

Rationale:

- 5 current baseline cases are too small for reliable prompt/provider comparison.
- 20 cases can cover language, domain, complexity, gateway-positive, gateway-negative, and missing-context scenarios without becoming expensive to run.
- Keep most cases compact to control provider cost and latency.

Suggested split:

- 10 Vietnamese cases.
- 5 English cases.
- 5 mixed edge/regression cases.

### process-improvement-recommendation

Target: 10 cases minimum.

Rationale:

- The skill has higher safety risk because it proposes edits to the Process Task Register.
- The first dataset should cover both low-risk field updates and high-risk graph changes.
- It should also test conflict handling before batch apply behavior is trusted.

Suggested split:

- 5 safe field/update cases.
- 3 high-risk graph-change cases.
- 1 conflict/duplicate case.
- 1 ambiguous/noisy-context case.

## 7. What Not To Evaluate Yet

Do not evaluate these areas in this dataset design slice:

- Full RAG faithfulness. The current target skills do not yet use retrieval-grounded source documents as a governed RAG pipeline.
- Full visual BPMN correctness. D01 visual/layout correctness belongs to BPMN artifact gate and artifact-review eval, not Input Brief or Process Improvement eval.
- Enterprise policy compliance. Deep policy compliance needs domain rule packs, tenant policy configuration, audit requirements, and approval workflows beyond this dataset.
- Full visual Service Blueprint correctness. D02 card overlap and row layout belong to D02 gates or service-blueprint artifact review.
- Provider cost optimization. Token/latency should be recorded later, but this document focuses on dataset coverage and criteria.
- LLM-as-judge scoring. It can be added after deterministic criteria-based eval is stable.

## 8. Recommended Next Implementation Slice

After this docs-only design:

1. Expand `evals/input-brief-to-ptr/dataset.json` toward 20 cases.
2. Expand `evals/process-improvement-recommendation/dataset.json` toward at least 10 cases.
3. Extend eval runners with grouped criteria only where needed.
4. Keep all eval outputs out of source control unless intentionally captured as release evidence.
5. Run evals with mock/local first, then compare real providers when server config is ready.
6. Track per-skill trend: pass rate, partial criteria, fail reasons, latency, and token usage.
