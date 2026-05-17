import type { DraftProcessTaskRegister } from "@/lib/ai-intake";
import type { ProcessTask } from "@/lib/models/process-task";
import {
  createGateVerdict,
  type GateIssue,
  type GateScoreDimension,
  type GateVerdict,
  type GateVerdictStatus
} from "@/lib/quality-engine/gate-verdict";

const DRAFT_PTR_GATE_V1_ID = "draft-ptr-gate-v1";
const DIMENSION_MAX_SCORE = 20;

const broadTaskNamePatterns = [
  " and ",
  " then ",
  " after that ",
  " simultaneously ",
  " dong thoi ",
  " sau do ",
  " va "
];

function clean(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function isGateway(task: ProcessTask) {
  return (
    task.rowType === "gateway" ||
    task.bpmnType === "exclusiveGateway" ||
    task.bpmnType === "parallelGateway" ||
    task.bpmnType === "inclusiveGateway"
  );
}

function isUserTask(task: ProcessTask) {
  return task.bpmnType === "userTask" || task.taskNature === "manual";
}

function isServiceTask(task: ProcessTask) {
  return (
    task.bpmnType === "serviceTask" ||
    task.taskNature === "automatic" ||
    task.taskNature === "system" ||
    task.taskNature === "integration"
  );
}

function issue({
  code,
  severity,
  title,
  description,
  task,
  evidence
}: {
  code: string;
  severity: GateIssue["severity"];
  title: string;
  description: string;
  task?: ProcessTask;
  evidence?: string[];
}): GateIssue {
  return {
    code,
    severity,
    title,
    description,
    affectedArtifact: "draftProcessTaskRegister",
    affectedIds: task?.stepId ? [task.stepId] : undefined,
    evidence
  };
}

function dimensionStatus(issues: GateIssue[]): GateVerdictStatus {
  if (issues.some((item) => item.severity === "blocker")) {
    return "fail";
  }

  if (issues.some((item) => item.severity === "warning")) {
    return "warning";
  }

  return "pass";
}

function scoreDimension(
  id: string,
  label: string,
  issues: GateIssue[],
  status: GateVerdictStatus = dimensionStatus(issues)
): GateScoreDimension {
  if (status === "not-applicable") {
    return {
      id,
      label,
      status,
      notes: ["No applicable rows were present for this dimension."]
    };
  }

  const penalty = issues.reduce(
    (total, item) => total + (item.severity === "blocker" ? 10 : 5),
    0
  );

  return {
    id,
    label,
    status,
    score: Math.max(0, DIMENSION_MAX_SCORE - penalty),
    maxScore: DIMENSION_MAX_SCORE
  };
}

function evaluateSchemaCompleteness(tasks: ProcessTask[]) {
  const issues: GateIssue[] = [];

  if (tasks.length === 0) {
    issues.push(
      issue({
        code: "draft_ptr_empty",
        severity: "blocker",
        title: "Draft PTR has no rows",
        description: "Draft PTR Gate v1 requires at least one draft ProcessTask row."
      })
    );
  }

  tasks.forEach((task, index) => {
    [
      ["id", task.id],
      ["stepId", task.stepId],
      ["rowType", task.rowType],
      ["bpmnType", task.bpmnType],
      ["taskNature", task.taskNature],
      ["taskName", task.taskName]
    ].forEach(([field, value]) => {
      if (!clean(value)) {
        issues.push(
          issue({
            code: `missing_${field}`,
            severity: "blocker",
            title: `Missing ${field}`,
            description: `Draft row ${index + 1} is missing ${field}.`,
            task
          })
        );
      }
    });
  });

  return {
    dimension: scoreDimension(
      "schemaCompleteness",
      "Schema completeness",
      issues
    ),
    issues
  };
}

function evaluateFlowIntegrity(tasks: ProcessTask[]) {
  const issues: GateIssue[] = [];
  const stepIds = new Set(tasks.map((task) => task.stepId).filter(Boolean));
  const hasStart = tasks.some(
    (task) => task.rowType === "start" || task.bpmnType === "startEvent"
  );
  const hasEnd = tasks.some(
    (task) => task.rowType === "end" || task.bpmnType === "endEvent"
  );

  if (!hasStart) {
    issues.push(
      issue({
        code: "missing_start_event",
        severity: "blocker",
        title: "Missing start event",
        description: "Draft PTR should include at least one start row or startEvent."
      })
    );
  }

  if (!hasEnd) {
    issues.push(
      issue({
        code: "missing_end_event",
        severity: "blocker",
        title: "Missing end event",
        description: "Draft PTR should include at least one end row or endEvent."
      })
    );
  }

  tasks.forEach((task) => {
    [
      ["defaultNextStep", task.defaultNextStep],
      ["yesNextStep", task.yesNextStep],
      ["noNextStep", task.noNextStep]
    ].forEach(([field, nextStep]) => {
      if (typeof nextStep === "string" && nextStep && !stepIds.has(nextStep)) {
        issues.push(
          issue({
            code: "invalid_next_step_reference",
            severity: "blocker",
            title: "Invalid next-step reference",
            description: `${field} points to stepId ${nextStep}, which does not exist in the draft PTR.`,
            task,
            evidence: [`${field}: ${nextStep}`]
          })
        );
      }
    });
  });

  return {
    dimension: scoreDimension("flowIntegrity", "Flow integrity", issues),
    issues
  };
}

function evaluateGatewaySafety(tasks: ProcessTask[]) {
  const issues: GateIssue[] = [];
  const gateways = tasks.filter(isGateway);

  gateways.forEach((task) => {
    if (!clean(task.conditionQuestion)) {
      issues.push(
        issue({
          code: "gateway_missing_condition",
          severity: "warning",
          title: "Gateway missing condition",
          description: "Gateway rows should include a clear conditionQuestion.",
          task
        })
      );
    }

    if (!clean(task.yesNextStep) || !clean(task.noNextStep)) {
      issues.push(
        issue({
          code: "gateway_missing_yes_no_branch",
          severity: "blocker",
          title: "Gateway missing yes/no branch",
          description: "Gateway rows should include both yesNextStep and noNextStep before apply.",
          task
        })
      );
    }
  });

  return {
    dimension: scoreDimension(
      "gatewaySafety",
      "Gateway safety",
      issues,
      gateways.length === 0 ? "not-applicable" : dimensionStatus(issues)
    ),
    issues
  };
}

function evaluateActorSystemCoverage(tasks: ProcessTask[]) {
  const issues: GateIssue[] = [];

  tasks.forEach((task) => {
    if (isUserTask(task) && !clean(task.actor)) {
      issues.push(
        issue({
          code: "user_task_missing_actor",
          severity: "warning",
          title: "User task missing actor",
          description: "User/manual tasks should identify the responsible actor.",
          task
        })
      );
    }

    if (isServiceTask(task) && !clean(task.system)) {
      issues.push(
        issue({
          code: "service_task_missing_system",
          severity: "warning",
          title: "Service task missing system",
          description: "Service/automatic tasks should identify the responsible system.",
          task
        })
      );
    }
  });

  return {
    dimension: scoreDimension(
      "actorSystemCoverage",
      "Actor/system coverage",
      issues
    ),
    issues
  };
}

function evaluateDecompositionQuality(tasks: ProcessTask[]) {
  const issues: GateIssue[] = [];

  tasks.forEach((task) => {
    const taskName = clean(task.taskName).toLowerCase();
    const looksBroad =
      taskName.length > 120 ||
      broadTaskNamePatterns.some((pattern) => taskName.includes(pattern));

    if (looksBroad && task.rowType === "task") {
      issues.push(
        issue({
          code: "task_may_need_decomposition",
          severity: "warning",
          title: "Task may need decomposition",
          description: "The task name suggests multiple actions or an overly broad step.",
          task,
          evidence: [`taskName: ${task.taskName}`]
        })
      );
    }
  });

  return {
    dimension: scoreDimension(
      "decompositionQuality",
      "Decomposition quality",
      issues
    ),
    issues
  };
}

function createScoreBreakdown(dimensions: GateScoreDimension[]) {
  const scoredDimensions = dimensions.filter(
    (dimension) =>
      typeof dimension.score === "number" &&
      typeof dimension.maxScore === "number"
  );

  return {
    score: scoredDimensions.reduce(
      (total, dimension) => total + (dimension.score ?? 0),
      0
    ),
    maxScore: scoredDimensions.reduce(
      (total, dimension) => total + (dimension.maxScore ?? 0),
      0
    ),
    dimensions
  };
}

export function runDraftPtrGateV1(
  draft: DraftProcessTaskRegister
): GateVerdict {
  const tasks = draft.draftProcessTasks;
  const results = [
    evaluateSchemaCompleteness(tasks),
    evaluateFlowIntegrity(tasks),
    evaluateGatewaySafety(tasks),
    evaluateActorSystemCoverage(tasks),
    evaluateDecompositionQuality(tasks)
  ];
  const dimensions = results.map((result) => result.dimension);
  const issues = results.flatMap((result) => result.issues);

  return createGateVerdict({
    gateId: DRAFT_PTR_GATE_V1_ID,
    gateName: "Draft PTR Gate v1",
    issues,
    score: createScoreBreakdown(dimensions),
    checkedAt: new Date().toISOString(),
    metadata: {
      dimensionIds: dimensions.map((dimension) => dimension.id),
      taskCount: tasks.length
    }
  });
}
