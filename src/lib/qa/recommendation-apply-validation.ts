import type { ProcessTask } from "@/lib/models/process-task";
import type { QAConnectionField } from "@/lib/recommendation-engine/types";

const connectionFields: QAConnectionField[] = [
  "defaultNextStep",
  "yesNextStep",
  "noNextStep"
];

export type RecommendationApplyValidationIssue = {
  code:
    | "DUPLICATE_STEP_ID"
    | "INVALID_NEXT_STEP"
    | "DISCONNECTED_TASK"
    | "GATEWAY_MISSING_YES_NO"
    | "ORPHAN_CREATED_TASK";
  key: string;
  message: string;
};

function isBlank(value: string | null | undefined) {
  return !value || value.trim().length === 0;
}

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function isFlowNode(task: ProcessTask) {
  return !["phase", "group", "annotation", "data"].includes(normalize(task.rowType));
}

function isStartNode(task: ProcessTask) {
  return normalize(task.rowType) === "start" || normalize(task.bpmnType) === "startevent";
}

function isEndNode(task: ProcessTask) {
  return normalize(task.rowType) === "end" || normalize(task.bpmnType) === "endevent";
}

function getIncomingStepIds(tasks: ProcessTask[]) {
  const incomingStepIds = new Set<string>();

  tasks.forEach((task) => {
    connectionFields.forEach((field) => {
      const nextStep = task[field];

      if (!isBlank(nextStep)) {
        incomingStepIds.add(nextStep ?? "");
      }
    });
  });

  return incomingStepIds;
}

function hasOutgoingConnection(task: ProcessTask) {
  return connectionFields.some((field) => !isBlank(task[field]));
}

function getValidationIssues(
  tasks: ProcessTask[],
  createdStepIds: Set<string>
): RecommendationApplyValidationIssue[] {
  const issues: RecommendationApplyValidationIssue[] = [];
  const stepIdCounts = new Map<string, number>();

  tasks.forEach((task) => {
    if (isBlank(task.stepId)) {
      return;
    }

    stepIdCounts.set(task.stepId, (stepIdCounts.get(task.stepId) ?? 0) + 1);
  });

  stepIdCounts.forEach((count, stepId) => {
    if (count > 1) {
      issues.push({
        code: "DUPLICATE_STEP_ID",
        key: `duplicate:${stepId}`,
        message: `Không thể apply recommendation vì stepId "${stepId}" bị trùng.`
      });
    }
  });

  const stepIds = new Set(tasks.map((task) => task.stepId).filter(Boolean));
  const incomingStepIds = getIncomingStepIds(tasks);

  tasks.forEach((task) => {
    connectionFields.forEach((field) => {
      const nextStep = task[field];

      if (!isBlank(nextStep) && !stepIds.has(nextStep ?? "")) {
        issues.push({
          code: "INVALID_NEXT_STEP",
          key: `invalid-next:${task.stepId}:${field}:${nextStep}`,
          message: `Không thể apply recommendation vì ${task.stepId}.${field} đang trỏ tới stepId không tồn tại "${nextStep}".`
        });
      }
    });

    if (normalize(task.rowType) === "gateway" && (isBlank(task.yesNextStep) || isBlank(task.noNextStep))) {
      issues.push({
        code: "GATEWAY_MISSING_YES_NO",
        key: `gateway-branch:${task.stepId}`,
        message: `Không thể apply recommendation vì gateway "${task.stepId}" thiếu nhánh yesNextStep hoặc noNextStep.`
      });
    }

    if (
      isFlowNode(task) &&
      !isStartNode(task) &&
      !isEndNode(task) &&
      !incomingStepIds.has(task.stepId) &&
      !hasOutgoingConnection(task)
    ) {
      issues.push({
        code: "DISCONNECTED_TASK",
        key: `disconnected:${task.stepId}`,
        message: `Không thể apply recommendation vì task "${task.stepId}" bị disconnected.`
      });
    }

    if (
      createdStepIds.has(task.stepId) &&
      isFlowNode(task) &&
      !isStartNode(task) &&
      !incomingStepIds.has(task.stepId)
    ) {
      issues.push({
        code: "ORPHAN_CREATED_TASK",
        key: `orphan-created:${task.stepId}`,
        message: `Không thể apply recommendation vì task mới "${task.stepId}" chưa được nối vào luồng quy trình.`
      });
    }
  });

  return issues;
}

export function validateRecommendationApplyResult(
  beforeTasks: ProcessTask[],
  afterTasks: ProcessTask[],
  createdStepIds: string[]
) {
  const createdStepIdSet = new Set(createdStepIds);
  const beforeIssueKeys = new Set(
    getValidationIssues(beforeTasks, new Set()).map((issue) => issue.key)
  );

  return getValidationIssues(afterTasks, createdStepIdSet).filter(
    (issue) => !beforeIssueKeys.has(issue.key)
  );
}
