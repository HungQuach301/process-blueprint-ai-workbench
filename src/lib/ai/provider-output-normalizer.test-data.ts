import type { DraftProcessTaskRegister } from "@/lib/ai-intake";
import {
  normalizeProviderOutput,
  type ProviderOutputNormalizerContext,
  type ProviderOutputNormalizerIssue,
  type ProviderOutputNormalizerResult
} from "@/lib/ai/provider-output-normalizer";
import type { ProcessTask } from "@/lib/models/process-task";

type ExpectedNormalizerIssue = Pick<ProviderOutputNormalizerIssue, "code" | "path">;

type ExpectedNormalizerResult = {
  normalizedOutput: unknown;
  warningIssues: ExpectedNormalizerIssue[];
  errorIssues: ExpectedNormalizerIssue[];
  changedPaths: string[];
};

export type ProviderOutputNormalizerGoldenFixture = {
  id: string;
  description: string;
  input: unknown;
  context: ProviderOutputNormalizerContext;
  expected: ExpectedNormalizerResult;
};

function createTask(overrides: Partial<ProcessTask>): ProcessTask {
  const stepId = overrides.stepId ?? "NORM-001";

  return {
    id: overrides.id ?? `normalizer-${stepId.toLowerCase()}`,
    stepId,
    parentStepId: overrides.parentStepId ?? null,
    rowType: overrides.rowType ?? "task",
    bpmnType: overrides.bpmnType ?? "userTask",
    taskNature: overrides.taskNature ?? "manual",
    phase: overrides.phase ?? "Review",
    group: overrides.group ?? "Normalizer Fixture",
    actor: overrides.actor ?? "Business User",
    actorLane: overrides.actorLane ?? overrides.actor ?? "Business User",
    system: overrides.system ?? "Workflow System",
    systemLane: overrides.systemLane ?? overrides.system ?? "Workflow System",
    dataObject: overrides.dataObject ?? "Request",
    dataAction: overrides.dataAction ?? "none",
    taskName: overrides.taskName ?? "Review request",
    input: overrides.input ?? "Submitted request",
    output: overrides.output ?? "Reviewed request",
    defaultNextStep: overrides.defaultNextStep ?? null,
    conditionQuestion: overrides.conditionQuestion ?? "",
    yesNextStep: overrides.yesNextStep ?? null,
    noNextStep: overrides.noNextStep ?? null,
    exception: overrides.exception ?? "",
    exceptionHandling: overrides.exceptionHandling ?? "",
    sla: overrides.sla ?? "Same day",
    riskControl: overrides.riskControl ?? "Human review",
    sourceRef: overrides.sourceRef ?? "normalizer fixture",
    reviewStatus: overrides.reviewStatus ?? "needsReview",
    comment: overrides.comment ?? "",
    customerInteractionType: overrides.customerInteractionType,
    channel: overrides.channel
  };
}

const normalizedDraft: DraftProcessTaskRegister = {
  draftProcessTasks: [
    createTask({
      stepId: "NORM-001",
      rowType: "start",
      bpmnType: "startEvent",
      taskNature: "manual",
      taskName: "Request received",
      defaultNextStep: "NORM-002"
    }),
    createTask({
      stepId: "NORM-002",
      taskName: "Review request",
      defaultNextStep: "NORM-003"
    }),
    createTask({
      stepId: "NORM-003",
      rowType: "end",
      bpmnType: "endEvent",
      taskNature: "manual",
      taskName: "Request completed"
    })
  ],
  assumptions: ["Fixture uses generic process data."],
  openQuestions: [],
  qualityIssues: [],
  sourceSummary: "Generic process note.",
  confidence: "high",
  inputLanguage: "en",
  outputLanguage: "en"
};

const normalizedDraftWithBrokenReference: DraftProcessTaskRegister = {
  ...normalizedDraft,
  draftProcessTasks: normalizedDraft.draftProcessTasks.map((task) =>
    task.stepId === "NORM-002"
      ? {
          ...task,
          defaultNextStep: "NORM-MISSING"
        }
      : task
  )
};

const draftAliasPayload = {
  draftTasks: normalizedDraft.draftProcessTasks,
  assumptionList: normalizedDraft.assumptions,
  questions: normalizedDraft.openQuestions,
  source_summary: normalizedDraft.sourceSummary,
  qualityWarnings: normalizedDraft.qualityIssues,
  confidence: normalizedDraft.confidence,
  inputLanguage: normalizedDraft.inputLanguage,
  outputLanguage: normalizedDraft.outputLanguage
};

const draftNormalizerContext: ProviderOutputNormalizerContext = {
  skillId: "input-brief-to-ptr",
  outputSchemaId: "DraftProcessTaskRegister"
};

export const providerOutputNormalizerGoldenFixtures = [
  {
    id: "already-normalized-draft-ptr",
    description:
      "Already-normalized Draft PTR output should pass through unchanged without warnings or errors.",
    input: normalizedDraft,
    context: draftNormalizerContext,
    expected: {
      normalizedOutput: normalizedDraft,
      warningIssues: [],
      errorIssues: [],
      changedPaths: []
    }
  },
  {
    id: "wrapped-draft-ptr-with-aliases",
    description:
      "Provider output wrapped in result with shallow aliases should unwrap and normalize canonical fields.",
    input: {
      result: draftAliasPayload
    },
    context: draftNormalizerContext,
    expected: {
      normalizedOutput: normalizedDraft,
      warningIssues: [
        { code: "wrapped_payload_unwrapped", path: "result" },
        { code: "field_alias_normalized", path: "draftProcessTasks" },
        { code: "field_alias_normalized", path: "assumptions" },
        { code: "field_alias_normalized", path: "openQuestions" },
        { code: "field_alias_normalized", path: "sourceSummary" },
        { code: "field_alias_normalized", path: "qualityIssues" }
      ],
      errorIssues: [],
      changedPaths: [
        "result",
        "draftProcessTasks",
        "assumptions",
        "openQuestions",
        "sourceSummary",
        "qualityIssues"
      ]
    }
  },
  {
    id: "nested-result-wrapper-is-not-deep-normalized",
    description:
      "Nested result wrappers are intentionally not deep-normalized; the shallow unwrap leaves required arrays missing.",
    input: {
      result: {
        result: normalizedDraft
      }
    },
    context: draftNormalizerContext,
    expected: {
      normalizedOutput: {
        result: normalizedDraft
      },
      warningIssues: [{ code: "wrapped_payload_unwrapped", path: "result" }],
      errorIssues: [
        { code: "missing_required_array", path: "draftProcessTasks" },
        { code: "missing_required_array", path: "assumptions" },
        { code: "missing_required_array", path: "openQuestions" }
      ],
      changedPaths: ["result"]
    }
  },
  {
    id: "unsafe-broken-step-reference",
    description:
      "Broken step references must be reported as errors and must not be nulled or repaired silently.",
    input: normalizedDraftWithBrokenReference,
    context: draftNormalizerContext,
    expected: {
      normalizedOutput: normalizedDraftWithBrokenReference,
      warningIssues: [],
      errorIssues: [
        { code: "broken_reference", path: "$.draftProcessTasks[1].defaultNextStep" }
      ],
      changedPaths: []
    }
  },
  {
    id: "unknown-output-schema",
    description:
      "Unknown schema context should return a structured error without changing the provider output.",
    input: normalizedDraft,
    context: {
      skillId: "input-brief-to-ptr",
      outputSchemaId: "UnknownSchema"
    },
    expected: {
      normalizedOutput: normalizedDraft,
      warningIssues: [],
      errorIssues: [{ code: "unknown_skill_or_schema", path: "$" }],
      changedPaths: []
    }
  },

  // ── Fixture A ──────────────────────────────────────────────────────────────
  // Regression lock: DraftProcessTaskRegister is NOT in STRIP_NULL_SCHEMAS.
  // Null values in task fields must be PRESERVED so downstream Zod can see them.
  {
    id: "null-preserved-draft-ptr",
    description:
      "DraftProcessTaskRegister: null values in task fields (defaultNextStep, yesNextStep, noNextStep, parentStepId) must be preserved — STRIP_NULL_SCHEMAS excludes this schema.",
    input: {
      draftProcessTasks: [
        {
          id: "task-001",
          stepId: "T001",
          parentStepId: null,
          rowType: "task",
          bpmnType: "userTask",
          taskNature: "manual",
          phase: "Phase 1",
          group: "Group A",
          actor: "Reviewer",
          actorLane: "Reviewer",
          system: "",
          systemLane: "",
          dataObject: "Request",
          dataAction: "none",
          taskName: "Review request",
          input: "Request form",
          output: "Reviewed form",
          defaultNextStep: null,
          conditionQuestion: "",
          yesNextStep: null,
          noNextStep: null,
          exception: "",
          exceptionHandling: "",
          sla: "",
          riskControl: "",
          sourceRef: "",
          reviewStatus: "draft",
          comment: ""
        }
      ],
      assumptions: [],
      openQuestions: []
    },
    context: {
      skillId: "input-brief-to-ptr",
      outputSchemaId: "DraftProcessTaskRegister"
    },
    expected: {
      normalizedOutput: {
        draftProcessTasks: [
          {
            id: "task-001",
            stepId: "T001",
            parentStepId: null,
            rowType: "task",
            bpmnType: "userTask",
            taskNature: "manual",
            phase: "Phase 1",
            group: "Group A",
            actor: "Reviewer",
            actorLane: "Reviewer",
            system: "",
            systemLane: "",
            dataObject: "Request",
            dataAction: "none",
            taskName: "Review request",
            input: "Request form",
            output: "Reviewed form",
            defaultNextStep: null,
            conditionQuestion: "",
            yesNextStep: null,
            noNextStep: null,
            exception: "",
            exceptionHandling: "",
            sla: "",
            riskControl: "",
            sourceRef: "",
            reviewStatus: "draft",
            comment: ""
          }
        ],
        assumptions: [],
        openQuestions: []
      },
      warningIssues: [],
      errorIssues: [],
      changedPaths: []
    }
  },

  // ── Fixture B ──────────────────────────────────────────────────────────────
  // Regression lock: QARecommendationResponse IS in STRIP_NULL_SCHEMAS.
  // Null fields DEEPLY NESTED inside task objects (newTasks[*]) must be STRIPPED
  // so downstream code that expects string|undefined (not null) does not fail.
  {
    id: "qa-recommendation-deep-null-strip",
    description:
      "QARecommendationResponse: null fields nested inside newTasks[*] (defaultNextStep, yesNextStep, noNextStep, parentStepId) are stripped; keys become absent in output.",
    input: {
      recommendations: [
        {
          id: "rec-B",
          operations: [
            {
              kind: "SplitTask",
              targetStepId: "S001",
              newTasks: [
                {
                  stepId: "NEW-A",
                  taskName: "New subtask",
                  defaultNextStep: null,
                  yesNextStep: null,
                  noNextStep: null,
                  parentStepId: null
                }
              ]
            }
          ]
        }
      ]
    },
    context: {
      skillId: "process-improvement-recommendation",
      outputSchemaId: "QARecommendationResponse"
    },
    expected: {
      normalizedOutput: {
        recommendations: [
          {
            id: "rec-B",
            operations: [
              {
                kind: "SplitTask",
                targetStepId: "S001",
                newTasks: [
                  {
                    stepId: "NEW-A",
                    taskName: "New subtask"
                    // defaultNextStep, yesNextStep, noNextStep, parentStepId stripped
                  }
                ]
              }
            ]
          }
        ]
      },
      warningIssues: [],
      errorIssues: [],
      changedPaths: []
    }
  },

  // ── Fixture C ──────────────────────────────────────────────────────────────
  // Regression lock: ArtifactReviewResponse IS in STRIP_NULL_SCHEMAS.
  // Null values in flat operation fields (stepId, value) are stripped.
  {
    id: "artifact-review-null-strip",
    description:
      "ArtifactReviewResponse: null fields in operation objects (stepId, value) are stripped; required top-level arrays are intact.",
    input: {
      recommendations: [
        {
          id: "art-rec-001",
          operations: [
            {
              kind: "UpdateTaskField",
              stepId: null,
              field: "actor",
              value: null
            }
          ]
        }
      ],
      templateRecommendations: [],
      warnings: [],
      assumptions: [],
      openQuestions: []
    },
    context: {
      skillId: "artifact-review",
      outputSchemaId: "ArtifactReviewResponse"
    },
    expected: {
      normalizedOutput: {
        recommendations: [
          {
            id: "art-rec-001",
            operations: [
              {
                kind: "UpdateTaskField",
                field: "actor"
                // stepId and value stripped
              }
            ]
          }
        ],
        templateRecommendations: [],
        warnings: [],
        assumptions: [],
        openQuestions: []
      },
      warningIssues: [],
      errorIssues: [],
      changedPaths: []
    }
  },

  // ── Fixture D (optional) ──────────────────────────────────────────────────
  // Confirms the strip-set boundary: BRDResponse is outside STRIP_NULL_SCHEMAS,
  // so any null values it contains are preserved unchanged.
  {
    id: "brd-response-nulls-not-stripped",
    description:
      "BRDResponse is not in STRIP_NULL_SCHEMAS — null values at any depth must be preserved unchanged.",
    input: {
      title: "Test BRD",
      executiveSummary: null,
      scope: null,
      nested: { key: null }
    },
    context: {
      skillId: "notes-to-brd",
      outputSchemaId: "BRDResponse"
    },
    expected: {
      normalizedOutput: {
        title: "Test BRD",
        executiveSummary: null,
        scope: null,
        nested: { key: null }
      },
      warningIssues: [],
      errorIssues: [],
      changedPaths: []
    }
  }
] satisfies ProviderOutputNormalizerGoldenFixture[];

function getIssueSignatures(issues: ProviderOutputNormalizerIssue[]) {
  return issues.map((issue) => ({
    code: issue.code,
    path: issue.path
  }));
}

function assertJsonEqual(
  actual: unknown,
  expected: unknown,
  fixtureId: string,
  fieldName: string
) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${fixtureId}: unexpected ${fieldName}.`);
  }
}

function assertNormalizerResult(
  fixture: ProviderOutputNormalizerGoldenFixture,
  result: ProviderOutputNormalizerResult
) {
  assertJsonEqual(
    result.normalizedOutput,
    fixture.expected.normalizedOutput,
    fixture.id,
    "normalized output"
  );
  assertJsonEqual(
    getIssueSignatures(result.warnings),
    fixture.expected.warningIssues,
    fixture.id,
    "warning issues"
  );
  assertJsonEqual(
    getIssueSignatures(result.errors),
    fixture.expected.errorIssues,
    fixture.id,
    "error issues"
  );
  assertJsonEqual(
    result.changedPaths,
    fixture.expected.changedPaths,
    fixture.id,
    "changed paths"
  );
}

export function assertProviderOutputNormalizerGoldenFixtures() {
  providerOutputNormalizerGoldenFixtures.forEach((fixture) => {
    assertNormalizerResult(
      fixture,
      normalizeProviderOutput(fixture.input, fixture.context)
    );
  });
}

export const providerOutputNormalizerGoldenResults =
  providerOutputNormalizerGoldenFixtures.map((fixture) => ({
    id: fixture.id,
    result: normalizeProviderOutput(fixture.input, fixture.context)
  }));

