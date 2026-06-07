import type { DraftProcessTaskRegister } from "@/lib/ai-intake";
import type { ProcessTask } from "@/lib/models/process-task";
import type { GateVerdictStatus } from "@/lib/quality-engine/gate-verdict";
import { runDraftPtrGateV1 } from "@/lib/quality-engine/draft-ptr-gate-v1";
import {
  createSourceCoverageAdvisory,
  type SourceCoverageAdvisoryStatus
} from "@/lib/quality-engine/source-coverage-advisory";

type ExpectedGateResult = {
  status: GateVerdictStatus;
  blockerCount: number;
  warningCount: number;
  score: number;
  maxScore: number;
  issueCodes: string[];
};

type ExpectedSourceCoverageResult = {
  status: SourceCoverageAdvisoryStatus;
  nonBlocking: true;
  coveragePercent: number;
  warningCount: number;
};

export type DraftPtrGateGoldenFixture = {
  id: string;
  description: string;
  draft: DraftProcessTaskRegister;
  expectedGate: ExpectedGateResult;
  expectedSourceCoverage?: ExpectedSourceCoverageResult;
};

function createTask(overrides: Partial<ProcessTask>): ProcessTask {
  const stepId = overrides.stepId ?? "DRAFT-000";

  return {
    id: overrides.id ?? `golden-${stepId.toLowerCase()}`,
    stepId,
    parentStepId: overrides.parentStepId ?? null,
    rowType: overrides.rowType ?? "task",
    bpmnType: overrides.bpmnType ?? "userTask",
    taskNature: overrides.taskNature ?? "manual",
    phase: overrides.phase ?? "Process",
    group: overrides.group ?? "Golden Draft PTR",
    actor: overrides.actor ?? "Business User",
    actorLane: overrides.actorLane ?? overrides.actor ?? "Business User",
    system: overrides.system ?? "Core Workflow",
    systemLane: overrides.systemLane ?? overrides.system ?? "Core Workflow",
    dataObject: overrides.dataObject ?? "Request data",
    dataAction: overrides.dataAction ?? "none",
    taskName: overrides.taskName ?? "Handle process step",
    input: overrides.input ?? "Request",
    output: overrides.output ?? "Step completed",
    defaultNextStep: overrides.defaultNextStep ?? null,
    conditionQuestion: overrides.conditionQuestion ?? "",
    yesNextStep: overrides.yesNextStep ?? null,
    noNextStep: overrides.noNextStep ?? null,
    exception: overrides.exception ?? "",
    exceptionHandling: overrides.exceptionHandling ?? "",
    sla: overrides.sla ?? "To be confirmed",
    riskControl: overrides.riskControl ?? "Review before apply",
    sourceRef: overrides.sourceRef ?? "structured brief section",
    reviewStatus: overrides.reviewStatus ?? "needsReview",
    comment: overrides.comment ?? "",
    customerInteractionType: overrides.customerInteractionType,
    channel: overrides.channel
  };
}

function createDraft(
  draftProcessTasks: ProcessTask[],
  overrides: Partial<Omit<DraftProcessTaskRegister, "draftProcessTasks">> = {}
): DraftProcessTaskRegister {
  return {
    draftProcessTasks,
    assumptions: overrides.assumptions ?? ["Golden fixture for Draft PTR Gate v1."],
    openQuestions: overrides.openQuestions ?? [],
    qualityIssues: overrides.qualityIssues ?? [],
    qualityGateWarnings: overrides.qualityGateWarnings,
    sourceSummary:
      overrides.sourceSummary ??
      "Structured brief source for golden Draft PTR Gate fixture.",
    confidence: overrides.confidence ?? "high",
    inputLanguage: overrides.inputLanguage ?? "en",
    outputLanguage: overrides.outputLanguage ?? "en"
  };
}

const passingDraft = createDraft([
  createTask({
    stepId: "DRAFT-001",
    rowType: "start",
    bpmnType: "startEvent",
    taskNature: "manual",
    taskName: "Request received",
    defaultNextStep: "DRAFT-002",
    sourceRef: "structured brief start"
  }),
  createTask({
    stepId: "DRAFT-002",
    rowType: "task",
    bpmnType: "userTask",
    taskNature: "manual",
    taskName: "Review customer request",
    actor: "Relationship Manager",
    actorLane: "Relationship Manager",
    defaultNextStep: "DRAFT-003",
    sourceRef: "structured brief actor"
  }),
  createTask({
    stepId: "DRAFT-003",
    rowType: "task",
    bpmnType: "serviceTask",
    taskNature: "automatic",
    taskName: "Validate request in workflow system",
    actor: "System",
    actorLane: "System",
    system: "Workflow System",
    systemLane: "Workflow System",
    defaultNextStep: "DRAFT-004",
    sourceRef: "structured brief system"
  }),
  createTask({
    stepId: "DRAFT-004",
    rowType: "end",
    bpmnType: "endEvent",
    taskNature: "manual",
    taskName: "Request completed",
    sourceRef: "structured brief end"
  })
]);

const blockerDraft = createDraft([
  createTask({
    stepId: "DRAFT-001",
    rowType: "start",
    bpmnType: "startEvent",
    taskNature: "manual",
    taskName: "Request received",
    defaultNextStep: "DRAFT-002"
  }),
  createTask({
    stepId: "DRAFT-002",
    rowType: "task",
    bpmnType: "userTask",
    taskNature: "manual",
    taskName: "",
    defaultNextStep: "DRAFT-003"
  }),
  createTask({
    stepId: "DRAFT-003",
    rowType: "end",
    bpmnType: "endEvent",
    taskNature: "manual",
    taskName: "Request completed"
  })
]);

const gatewaySafetyDraft = createDraft([
  createTask({
    stepId: "DRAFT-001",
    rowType: "start",
    bpmnType: "startEvent",
    taskNature: "manual",
    taskName: "Request received",
    defaultNextStep: "DRAFT-002"
  }),
  createTask({
    stepId: "DRAFT-002",
    rowType: "gateway",
    bpmnType: "exclusiveGateway",
    taskNature: "decision",
    taskName: "Is request complete?",
    conditionQuestion: "Is request complete?",
    yesNextStep: "DRAFT-003",
    noNextStep: null,
    defaultNextStep: null
  }),
  createTask({
    stepId: "DRAFT-003",
    rowType: "task",
    bpmnType: "userTask",
    taskNature: "manual",
    taskName: "Approve complete request",
    actor: "Approver",
    actorLane: "Approver",
    defaultNextStep: "DRAFT-004"
  }),
  createTask({
    stepId: "DRAFT-004",
    rowType: "end",
    bpmnType: "endEvent",
    taskNature: "manual",
    taskName: "Request completed"
  })
]);

const advisoryOnlyDraft = createDraft(
  passingDraft.draftProcessTasks.map((task) => ({
    ...task,
    sourceRef: ""
  })),
  {
    sourceSummary: "Draft generated from pasted chat/notes text.",
    confidence: "medium"
  }
);

export const draftPtrGateGoldenFixtures = [
  {
    id: "passing-draft-ptr",
    description: "Connected Draft PTR with required schema, actors, systems, and no gateway.",
    draft: passingDraft,
    expectedGate: {
      status: "pass",
      blockerCount: 0,
      warningCount: 0,
      score: 80,
      maxScore: 80,
      issueCodes: []
    },
    expectedSourceCoverage: {
      status: "good",
      nonBlocking: true,
      coveragePercent: 100,
      warningCount: 0
    }
  },
  {
    id: "blocker-draft-ptr",
    description: "Schema completeness blocker from an empty required taskName field.",
    draft: blockerDraft,
    expectedGate: {
      status: "fail",
      blockerCount: 1,
      warningCount: 0,
      score: 70,
      maxScore: 80,
      issueCodes: ["missing_taskName"]
    }
  },
  {
    id: "gateway-safety",
    description: "Gateway has a condition and yes branch, but missing no branch is blocking.",
    draft: gatewaySafetyDraft,
    expectedGate: {
      status: "fail",
      blockerCount: 1,
      warningCount: 0,
      score: 90,
      maxScore: 100,
      issueCodes: ["gateway_missing_yes_no_branch"]
    }
  },
  {
    id: "source-coverage-advisory-only",
    description: "Missing per-row sourceRef creates advisory warnings without gate blockers.",
    draft: advisoryOnlyDraft,
    expectedGate: {
      status: "pass",
      blockerCount: 0,
      warningCount: 0,
      score: 80,
      maxScore: 80,
      issueCodes: []
    },
    expectedSourceCoverage: {
      status: "missing",
      nonBlocking: true,
      coveragePercent: 0,
      warningCount: 1
    }
  }
] satisfies DraftPtrGateGoldenFixture[];

export function assertDraftPtrGateGoldenFixtures() {
  draftPtrGateGoldenFixtures.forEach((fixture) => {
    const verdict = runDraftPtrGateV1(fixture.draft);
    const issueCodes = verdict.issues.map((issue) => issue.code);

    if (verdict.status !== fixture.expectedGate.status) {
      throw new Error(`${fixture.id}: expected status ${fixture.expectedGate.status}.`);
    }

    if (verdict.summary.blockerCount !== fixture.expectedGate.blockerCount) {
      throw new Error(`${fixture.id}: unexpected blocker count.`);
    }

    if (verdict.summary.warningCount !== fixture.expectedGate.warningCount) {
      throw new Error(`${fixture.id}: unexpected warning count.`);
    }

    if (verdict.score?.score !== fixture.expectedGate.score) {
      throw new Error(`${fixture.id}: unexpected gate score.`);
    }

    if (verdict.score?.maxScore !== fixture.expectedGate.maxScore) {
      throw new Error(`${fixture.id}: unexpected max score.`);
    }

    fixture.expectedGate.issueCodes.forEach((code) => {
      if (!issueCodes.includes(code)) {
        throw new Error(`${fixture.id}: missing expected issue code ${code}.`);
      }
    });

    if (fixture.expectedSourceCoverage) {
      const advisory = createSourceCoverageAdvisory(fixture.draft);

      if (advisory.status !== fixture.expectedSourceCoverage.status) {
        throw new Error(`${fixture.id}: unexpected source coverage status.`);
      }

      if (advisory.nonBlocking !== fixture.expectedSourceCoverage.nonBlocking) {
        throw new Error(`${fixture.id}: source coverage must remain non-blocking.`);
      }

      if (
        advisory.signals.coveragePercent !==
        fixture.expectedSourceCoverage.coveragePercent
      ) {
        throw new Error(`${fixture.id}: unexpected source coverage percent.`);
      }

      if (advisory.warnings.length !== fixture.expectedSourceCoverage.warningCount) {
        throw new Error(`${fixture.id}: unexpected source coverage warning count.`);
      }
    }
  });
}

export const draftPtrGateGoldenResults = draftPtrGateGoldenFixtures.map(
  (fixture) => ({
    id: fixture.id,
    verdict: runDraftPtrGateV1(fixture.draft),
    sourceCoverage: createSourceCoverageAdvisory(fixture.draft)
  })
);
