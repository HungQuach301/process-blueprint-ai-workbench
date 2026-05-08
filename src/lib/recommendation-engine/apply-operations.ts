import type { ProcessTask } from "@/lib/models/process-task";
import type {
  QAConnectionField,
  QARecommendation,
  QARecommendationOperation
} from "@/lib/recommendation-engine/types";
import { normalizeRecommendation } from "@/lib/recommendation-engine/recommendation-factory";

const connectionFields: QAConnectionField[] = [
  "defaultNextStep",
  "yesNextStep",
  "noNextStep"
];

const safeOperationKinds = new Set<QARecommendationOperation["kind"]>([
  "UpdateTaskField",
  "AssignActor",
  "AssignSystem",
  "SetInteractionType",
  "MarkReviewStatus"
]);

function cloneTask(task: ProcessTask) {
  return { ...task };
}

function stringifyValue(value: unknown) {
  if (value == null) {
    return "";
  }

  return String(value);
}

export function normalizeRecommendationOperations(
  recommendation: QARecommendation
): QARecommendationOperation[] {
  const normalizedRecommendation = normalizeRecommendation(recommendation);

  if (normalizedRecommendation.operations?.length) {
    return normalizedRecommendation.operations;
  }

  const operations: QARecommendationOperation[] = [];

  if (normalizedRecommendation.patch) {
    normalizedRecommendation.targetStepIds.forEach((stepId) => {
      Object.entries(normalizedRecommendation.patch ?? {}).forEach(([field, value]) => {
        operations.push({
          kind: "UpdateTaskField",
          stepId,
          field: field as keyof typeof normalizedRecommendation.patch,
          value
        });
      });
    });
  }

  if (
    normalizedRecommendation.recommendationType === "SplitTask" &&
    normalizedRecommendation.newTasks?.length
  ) {
    operations.push({
      kind: "SplitTask",
      targetStepId: normalizedRecommendation.targetStepIds[0],
      newTasks: normalizedRecommendation.newTasks
    });
  }

  return operations;
}

function updateTaskField(
  tasks: ProcessTask[],
  stepId: string,
  field: keyof ProcessTask,
  value: unknown
) {
  return tasks.map((task) =>
    task.stepId === stepId
      ? ({
          ...task,
          [field]: value
        } as ProcessTask)
      : task
  );
}

function updateConnectionReferences(
  tasks: ProcessTask[],
  fromStepId: string,
  toStepId: string
) {
  return tasks.map((task) => {
    let changed = false;
    const nextTask = { ...task };

    connectionFields.forEach((field) => {
      if (nextTask[field] === fromStepId) {
        nextTask[field] = toStepId;
        changed = true;
      }
    });

    return changed ? nextTask : task;
  });
}

function connectTaskAfter(
  tasks: ProcessTask[],
  anchorStepId: string,
  taskToInsert: ProcessTask,
  connect = true
) {
  const anchorIndex = tasks.findIndex((task) => task.stepId === anchorStepId);

  if (anchorIndex < 0) {
    return tasks;
  }

  const anchorTask = tasks[anchorIndex];
  const newTask = cloneTask(taskToInsert);

  if (connect) {
    newTask.defaultNextStep = newTask.defaultNextStep ?? anchorTask.defaultNextStep;
    tasks = updateTaskField(tasks, anchorStepId, "defaultNextStep", newTask.stepId);
  }

  return [
    ...tasks.slice(0, anchorIndex + 1),
    newTask,
    ...tasks.slice(anchorIndex + 1)
  ];
}

function connectTaskBefore(
  tasks: ProcessTask[],
  anchorStepId: string,
  taskToInsert: ProcessTask,
  connect = true
) {
  const anchorIndex = tasks.findIndex((task) => task.stepId === anchorStepId);

  if (anchorIndex < 0) {
    return tasks;
  }

  const newTask = cloneTask(taskToInsert);

  if (connect) {
    newTask.defaultNextStep = newTask.defaultNextStep ?? anchorStepId;
    tasks = updateConnectionReferences(tasks, anchorStepId, newTask.stepId);
  }

  return [
    ...tasks.slice(0, anchorIndex),
    newTask,
    ...tasks.slice(anchorIndex)
  ];
}

function insertTaskBetween(
  tasks: ProcessTask[],
  sourceStepId: string,
  targetStepId: string,
  taskToInsert: ProcessTask
) {
  const sourceIndex = tasks.findIndex((task) => task.stepId === sourceStepId);

  if (sourceIndex < 0 || !tasks.some((task) => task.stepId === targetStepId)) {
    return tasks;
  }

  const newTask = {
    ...taskToInsert,
    defaultNextStep: taskToInsert.defaultNextStep ?? targetStepId
  };
  const sourceTask = tasks[sourceIndex];
  const updatedSource = { ...sourceTask };

  connectionFields.forEach((field) => {
    if (updatedSource[field] === targetStepId) {
      updatedSource[field] = newTask.stepId;
    }
  });

  return [
    ...tasks.slice(0, sourceIndex),
    updatedSource,
    newTask,
    ...tasks.slice(sourceIndex + 1)
  ];
}

function splitTask(tasks: ProcessTask[], targetStepId: string, newTasks: ProcessTask[]) {
  const targetIndex = tasks.findIndex((task) => task.stepId === targetStepId);

  if (targetIndex < 0 || newTasks.length === 0) {
    return tasks;
  }

  const targetTask = tasks[targetIndex];
  const splitTasks = newTasks.map(cloneTask);
  const firstSplitTask = splitTasks[0];
  const lastSplitTask = splitTasks[splitTasks.length - 1];

  tasks = updateConnectionReferences(tasks, targetStepId, firstSplitTask.stepId);

  splitTasks.forEach((task, index) => {
    const nextTask = splitTasks[index + 1];

    if (nextTask) {
      task.defaultNextStep = nextTask.stepId;
      return;
    }

    task.defaultNextStep = task.defaultNextStep ?? targetTask.defaultNextStep;
    task.yesNextStep = task.yesNextStep ?? targetTask.yesNextStep;
    task.noNextStep = task.noNextStep ?? targetTask.noNextStep;
  });

  return [
    ...tasks.slice(0, targetIndex),
    ...splitTasks,
    ...tasks.slice(targetIndex + 1).filter((task) => task.stepId !== lastSplitTask.stepId)
  ];
}

function applyOperation(tasks: ProcessTask[], operation: QARecommendationOperation) {
  switch (operation.kind) {
    case "UpdateTaskField":
      return updateTaskField(tasks, operation.stepId, operation.field as keyof ProcessTask, operation.value);
    case "CreateTaskAfter":
      return connectTaskAfter(tasks, operation.anchorStepId, operation.task, operation.connect);
    case "CreateTaskBefore":
      return connectTaskBefore(tasks, operation.anchorStepId, operation.task, operation.connect);
    case "InsertTaskBetween":
      return insertTaskBetween(tasks, operation.sourceStepId, operation.targetStepId, operation.task);
    case "SplitTask":
      return splitTask(tasks, operation.targetStepId, operation.newTasks);
    case "CreateGateway":
      if (operation.afterStepId) {
        return connectTaskAfter(tasks, operation.afterStepId, operation.gatewayTask);
      }
      if (operation.beforeStepId) {
        return connectTaskBefore(tasks, operation.beforeStepId, operation.gatewayTask);
      }
      return [...tasks, cloneTask(operation.gatewayTask)];
    case "AddGatewayBranch":
      if (operation.newTask) {
        tasks = connectTaskAfter(tasks, operation.gatewayStepId, operation.newTask, false);
        return updateTaskField(tasks, operation.gatewayStepId, operation.branch, operation.newTask.stepId);
      }
      return updateTaskField(tasks, operation.gatewayStepId, operation.branch, operation.targetStepId ?? null);
    case "UpdateConnection":
      return updateTaskField(tasks, operation.stepId, operation.field, operation.value);
    case "AssignActor": {
      let nextTasks = updateTaskField(tasks, operation.stepId, "actor", operation.actor);
      if (operation.actorLane) {
        nextTasks = updateTaskField(nextTasks, operation.stepId, "actorLane", operation.actorLane);
      }
      return nextTasks;
    }
    case "AssignSystem": {
      let nextTasks = updateTaskField(tasks, operation.stepId, "system", operation.system);
      if (operation.systemLane) {
        nextTasks = updateTaskField(nextTasks, operation.stepId, "systemLane", operation.systemLane);
      }
      return nextTasks;
    }
    case "SetInteractionType":
      return updateTaskField(
        tasks,
        operation.stepId,
        "customerInteractionType",
        operation.customerInteractionType
      );
    case "MarkReviewStatus":
      return updateTaskField(tasks, operation.stepId, "reviewStatus", operation.reviewStatus);
    case "CreateLane":
      return tasks;
    default:
      return tasks;
  }
}

export function applyRecommendationOperations(
  tasks: ProcessTask[],
  recommendation: QARecommendation
) {
  return normalizeRecommendationOperations(recommendation).reduce(
    (nextTasks, operation) => applyOperation(nextTasks, operation),
    tasks.map(cloneTask)
  );
}

export function applyQARecommendation(
  tasks: ProcessTask[],
  recommendation: QARecommendation
) {
  return applyRecommendationOperations(tasks, recommendation);
}

export type RecommendationBatchConflict = {
  message: string;
  recommendationIndexes: number[];
};

export type RecommendationBatchPreview = {
  selectedCount: number;
  applicableCount: number;
  skippedCount: number;
  affectedTaskCount: number;
  newTaskCount: number;
  connectionChangeCount: number;
  warnings: string[];
  conflicts: RecommendationBatchConflict[];
  skippedRecommendationIndexes: number[];
};

export function isGraphChangingRecommendation(recommendation: QARecommendation) {
  return normalizeRecommendationOperations(recommendation).some((operation) =>
    [
      "SplitTask",
      "CreateTaskAfter",
      "CreateTaskBefore",
      "InsertTaskBetween",
      "CreateGateway",
      "AddGatewayBranch",
      "UpdateConnection",
      "CreateLane"
    ].includes(operation.kind)
  );
}

export function isSafeRecommendation(recommendation: QARecommendation) {
  const normalizedRecommendation = normalizeRecommendation(recommendation);
  const operations = normalizeRecommendationOperations(normalizedRecommendation);

  return (
    normalizedRecommendation.confidence === "high" &&
    normalizedRecommendation.riskLevel === "low" &&
    operations.length > 0 &&
    operations.every((operation) => safeOperationKinds.has(operation.kind))
  );
}

function collectCreatedStepIds(operation: QARecommendationOperation) {
  switch (operation.kind) {
    case "CreateTaskAfter":
    case "CreateTaskBefore":
    case "InsertTaskBetween":
      return [operation.task.stepId];
    case "SplitTask":
      return operation.newTasks.map((task) => task.stepId);
    case "CreateGateway":
      return [operation.gatewayTask.stepId];
    case "AddGatewayBranch":
      return operation.newTask ? [operation.newTask.stepId] : [];
    default:
      return [];
  }
}

function collectAffectedStepIds(operation: QARecommendationOperation) {
  switch (operation.kind) {
    case "UpdateTaskField":
    case "UpdateConnection":
    case "AssignActor":
    case "AssignSystem":
    case "SetInteractionType":
    case "MarkReviewStatus":
      return [operation.stepId];
    case "CreateTaskAfter":
      return [operation.anchorStepId, operation.task.stepId];
    case "CreateTaskBefore":
      return [operation.anchorStepId, operation.task.stepId];
    case "InsertTaskBetween":
      return [operation.sourceStepId, operation.targetStepId, operation.task.stepId];
    case "SplitTask":
      return [operation.targetStepId, ...operation.newTasks.map((task) => task.stepId)];
    case "CreateGateway":
      return [operation.gatewayTask.stepId, operation.afterStepId, operation.beforeStepId].filter(Boolean) as string[];
    case "AddGatewayBranch":
      return [operation.gatewayStepId, operation.targetStepId, operation.newTask?.stepId].filter(Boolean) as string[];
    case "CreateLane":
      return operation.targetStepIds ?? [];
    default:
      return [];
  }
}

function collectConnectionChangeCount(operation: QARecommendationOperation) {
  switch (operation.kind) {
    case "UpdateConnection":
      return 1;
    case "CreateTaskAfter":
    case "CreateTaskBefore":
    case "InsertTaskBetween":
      return 1;
    case "SplitTask":
      return Math.max(0, operation.newTasks.length);
    case "AddGatewayBranch":
      return operation.newTask ? 1 : 1;
    default:
      return 0;
  }
}

function collectConflictKeyAndValue(operation: QARecommendationOperation) {
  switch (operation.kind) {
    case "UpdateTaskField":
      return {
        key: `field:${operation.stepId}:${String(operation.field)}`,
        value: stringifyValue(operation.value)
      };
    case "AssignActor":
      return {
        key: `field:${operation.stepId}:actor`,
        value: operation.actor
      };
    case "AssignSystem":
      return {
        key: `field:${operation.stepId}:system`,
        value: operation.system
      };
    case "SetInteractionType":
      return {
        key: `field:${operation.stepId}:customerInteractionType`,
        value: stringifyValue(operation.customerInteractionType)
      };
    case "MarkReviewStatus":
      return {
        key: `field:${operation.stepId}:reviewStatus`,
        value: operation.reviewStatus
      };
    case "UpdateConnection":
      return {
        key: `connection:${operation.stepId}:${operation.field}`,
        value: stringifyValue(operation.value)
      };
    default:
      return null;
  }
}

export function previewRecommendationBatch(
  tasks: ProcessTask[],
  recommendations: QARecommendation[]
): RecommendationBatchPreview {
  const affectedTaskIds = new Set<string>();
  const existingStepIds = new Set(tasks.map((task) => task.stepId));
  const createdStepOwners = new Map<string, number>();
  const updateOwners = new Map<string, { value: string; index: number }>();
  const skippedRecommendationIndexes = new Set<number>();
  const conflicts: RecommendationBatchConflict[] = [];
  const warnings: string[] = [];
  let newTaskCount = 0;
  let connectionChangeCount = 0;

  recommendations.forEach((recommendation, index) => {
    recommendation.warnings?.forEach((warning) => warnings.push(warning));

    normalizeRecommendationOperations(recommendation).forEach((operation) => {
      collectAffectedStepIds(operation).forEach((stepId) => affectedTaskIds.add(stepId));
      connectionChangeCount += collectConnectionChangeCount(operation);

      collectCreatedStepIds(operation).forEach((stepId) => {
        newTaskCount += 1;

        if (existingStepIds.has(stepId)) {
          skippedRecommendationIndexes.add(index);
          conflicts.push({
            message: `Recommendation creates existing stepId ${stepId}.`,
            recommendationIndexes: [index]
          });
          return;
        }

        const ownerIndex = createdStepOwners.get(stepId);

        if (ownerIndex !== undefined && ownerIndex !== index) {
          skippedRecommendationIndexes.add(ownerIndex);
          skippedRecommendationIndexes.add(index);
          conflicts.push({
            message: `Two recommendations create the same stepId ${stepId}.`,
            recommendationIndexes: [ownerIndex, index]
          });
          return;
        }

        createdStepOwners.set(stepId, index);
      });

      const conflictTarget = collectConflictKeyAndValue(operation);

      if (!conflictTarget) {
        return;
      }

      const owner = updateOwners.get(conflictTarget.key);

      if (owner && owner.value !== conflictTarget.value) {
        skippedRecommendationIndexes.add(owner.index);
        skippedRecommendationIndexes.add(index);
        conflicts.push({
          message: `Conflicting updates for ${conflictTarget.key}.`,
          recommendationIndexes: [owner.index, index]
        });
        return;
      }

      updateOwners.set(conflictTarget.key, {
        value: conflictTarget.value,
        index
      });
    });
  });

  return {
    selectedCount: recommendations.length,
    applicableCount: recommendations.length - skippedRecommendationIndexes.size,
    skippedCount: skippedRecommendationIndexes.size,
    affectedTaskCount: affectedTaskIds.size,
    newTaskCount,
    connectionChangeCount,
    warnings,
    conflicts,
    skippedRecommendationIndexes: Array.from(skippedRecommendationIndexes).sort((a, b) => a - b)
  };
}

export function applyRecommendationBatch(
  tasks: ProcessTask[],
  recommendations: QARecommendation[]
) {
  const preview = previewRecommendationBatch(tasks, recommendations);
  const skippedIndexes = new Set(preview.skippedRecommendationIndexes);

  return recommendations.reduce(
    (nextTasks, recommendation, index) =>
      skippedIndexes.has(index)
        ? nextTasks
        : applyRecommendationOperations(nextTasks, recommendation),
    tasks.map(cloneTask)
  );
}
