import type { ProcessTask } from "@/lib/models/process-task";
import type { QARecommendation } from "@/lib/recommendation-engine/types";
import { normalizeRecommendationOperations } from "@/lib/recommendation-engine/apply-operations";

export type RecommendationChangePreview = {
  stepId: string;
  field: string;
  oldValue: string;
  newValue: string;
};

function stringifyValue(value: unknown) {
  if (value == null) {
    return "";
  }

  return String(value);
}

export function previewRecommendationOperations(
  tasks: ProcessTask[],
  recommendation: QARecommendation
) {
  const changes: RecommendationChangePreview[] = [];

  normalizeRecommendationOperations(recommendation).forEach((operation) => {
    if (operation.kind === "UpdateTaskField") {
      const task = tasks.find((item) => item.stepId === operation.stepId);

      changes.push({
        stepId: operation.stepId,
        field: String(operation.field),
        oldValue: stringifyValue(task?.[operation.field as keyof ProcessTask]),
        newValue: stringifyValue(operation.value)
      });
    }

    if (operation.kind === "UpdateConnection") {
      const task = tasks.find((item) => item.stepId === operation.stepId);

      changes.push({
        stepId: operation.stepId,
        field: operation.field,
        oldValue: stringifyValue(task?.[operation.field]),
        newValue: stringifyValue(operation.value)
      });
    }

    if (operation.kind === "AssignActor") {
      const task = tasks.find((item) => item.stepId === operation.stepId);
      changes.push({
        stepId: operation.stepId,
        field: "actor",
        oldValue: stringifyValue(task?.actor),
        newValue: operation.actor
      });
    }

    if (operation.kind === "AssignSystem") {
      const task = tasks.find((item) => item.stepId === operation.stepId);
      changes.push({
        stepId: operation.stepId,
        field: "system",
        oldValue: stringifyValue(task?.system),
        newValue: operation.system
      });
    }

    if (operation.kind === "SetInteractionType") {
      const task = tasks.find((item) => item.stepId === operation.stepId);
      changes.push({
        stepId: operation.stepId,
        field: "customerInteractionType",
        oldValue: stringifyValue(task?.customerInteractionType),
        newValue: stringifyValue(operation.customerInteractionType)
      });
    }

    if (operation.kind === "MarkReviewStatus") {
      const task = tasks.find((item) => item.stepId === operation.stepId);
      changes.push({
        stepId: operation.stepId,
        field: "reviewStatus",
        oldValue: stringifyValue(task?.reviewStatus),
        newValue: operation.reviewStatus
      });
    }

    if (
      operation.kind === "CreateTaskAfter" ||
      operation.kind === "CreateTaskBefore" ||
      operation.kind === "InsertTaskBetween"
    ) {
      changes.push({
        stepId: operation.task.stepId,
        field: "task",
        oldValue: "(new)",
        newValue: operation.task.taskName
      });
    }

    if (operation.kind === "CreateGateway") {
      changes.push({
        stepId: operation.gatewayTask.stepId,
        field: "gateway",
        oldValue: "(new)",
        newValue: operation.gatewayTask.taskName
      });
    }

    if (operation.kind === "AddGatewayBranch") {
      const task = tasks.find((item) => item.stepId === operation.gatewayStepId);
      changes.push({
        stepId: operation.gatewayStepId,
        field: operation.branch,
        oldValue: stringifyValue(task?.[operation.branch]),
        newValue: operation.newTask?.stepId ?? operation.targetStepId ?? ""
      });
    }
  });

  return changes;
}

export function getRecommendationChangePreview(
  tasks: ProcessTask[],
  recommendation: QARecommendation
) {
  return previewRecommendationOperations(tasks, recommendation);
}
