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

