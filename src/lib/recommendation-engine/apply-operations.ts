import type { ProcessTask } from "@/lib/models/process-task";
import type {
  QAConnectionField,
  QARecommendation,
  QARecommendationOperation
} from "@/lib/recommendation-engine/types";
import { normalizeRecommendation } from "@/lib/recommendation-engine/recommendation-factory";
import { validateRecommendationApplyResult } from "@/lib/qa/recommendation-apply-validation";

const connectionFields: QAConnectionField[] = [
  "defaultNextStep",
  "yesNextStep",
  "noNextStep"
];
const nextStepFields = [
  "defaultNextStep",
  "yesNextStep",
  "noNextStep"
] satisfies Array<keyof Pick<ProcessTask, "defaultNextStep" | "yesNextStep" | "noNextStep">>;

const safeOperationKinds = new Set<QARecommendationOperation["kind"]>([
  "UpdateTaskField",
  "AssignActor",
  "AssignSystem",
  "SetInteractionType",
  "MarkReviewStatus"
]);

export class RecommendationApplyValidationError extends Error {
  messages: string[];

  constructor(messages: string[]) {
    super(messages.join("\n"));
    this.name = "RecommendationApplyValidationError";
    this.messages = messages;
  }
}

function cloneTask(task: ProcessTask) {
  return { ...task };
}

function stringifyValue(value: unknown) {
  if (value == null) {
    return "";
  }

  return String(value);
}

type RequiredStepReference = {
  label: string;
  stepId: string | undefined;
};

function isPlaceholderStepId(stepId: string) {
  return stepId.trim().toLowerCase() === "tbd";
}

function describeInvalidStepReference(
  reference: RequiredStepReference,
  existingStepIds: Set<string>
) {
  const rawStepId = reference.stepId ?? "";
  const stepId = rawStepId.trim();

  if (!stepId) {
    return `${reference.label} is empty.`;
  }

  if (isPlaceholderStepId(stepId)) {
    return `${reference.label} is TBD.`;
  }

  if (!existingStepIds.has(stepId)) {
    return `${reference.label} "${stepId}" does not exist in the current Process Task Register.`;
  }

  if (rawStepId !== stepId) {
    return `${reference.label} "${rawStepId}" contains leading or trailing spaces.`;
  }

  return null;
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

function assertOperationTargetsExist(
  tasks: ProcessTask[],
  operations: QARecommendationOperation[]
) {
  const stepIds = new Set(tasks.map((task) => task.stepId));
  const messages: string[] = [];

  operations.forEach((operation) => {
    collectRequiredExistingStepReferences(operation).forEach((reference) => {
      const invalidReason = describeInvalidStepReference(reference, stepIds);

      if (invalidReason) {
        messages.push(`Cannot apply recommendation because ${invalidReason}`);
      }
    });
  });

  if (messages.length > 0) {
    throw new RecommendationApplyValidationError(messages);
  }

  const requireStepId = (stepId: string | undefined, label: string) => {
    if (stepId && !stepIds.has(stepId)) {
      messages.push(
        `Không thể apply recommendation vì ${label} "${stepId}" không tồn tại trong Process Task Register.`
      );
    }
  };

  operations.forEach((operation) => {
    switch (operation.kind) {
      case "UpdateTaskField":
      case "UpdateConnection":
      case "AssignActor":
      case "AssignSystem":
      case "SetInteractionType":
      case "MarkReviewStatus":
        requireStepId(operation.stepId, "stepId");
        break;
      case "CreateTaskAfter":
      case "CreateTaskBefore":
        requireStepId(operation.anchorStepId, "anchorStepId");
        break;
      case "InsertTaskBetween":
        requireStepId(operation.sourceStepId, "sourceStepId");
        requireStepId(operation.targetStepId, "targetStepId");
        break;
      case "SplitTask":
        requireStepId(operation.targetStepId, "targetStepId");
        break;
      case "CreateGateway":
        requireStepId(operation.afterStepId, "afterStepId");
        requireStepId(operation.beforeStepId, "beforeStepId");
        break;
      case "AddGatewayBranch":
        requireStepId(operation.gatewayStepId, "gatewayStepId");
        requireStepId(operation.targetStepId, "targetStepId");
        break;
      case "CreateLane":
        operation.targetStepIds?.forEach((stepId) => requireStepId(stepId, "targetStepId"));
        break;
      default:
        break;
    }
  });

  if (messages.length > 0) {
    throw new RecommendationApplyValidationError(messages);
  }
}

function assertValidApplyResult(
  beforeTasks: ProcessTask[],
  afterTasks: ProcessTask[],
  operations: QARecommendationOperation[]
) {
  const validationIssues = validateRecommendationApplyResult(
    beforeTasks,
    afterTasks,
    operations.flatMap(collectCreatedStepIds)
  );

  if (validationIssues.length > 0) {
    throw new RecommendationApplyValidationError(
      validationIssues.map((issue) => issue.message)
    );
  }
}

export function applyRecommendationOperations(
  tasks: ProcessTask[],
  recommendation: QARecommendation
) {
  const operations = normalizeRecommendationOperations(recommendation);
  assertOperationTargetsExist(tasks, operations);

  const nextTasks = operations.reduce(
    (nextTasks, operation) => applyOperation(nextTasks, operation),
    tasks.map(cloneTask)
  );

  assertValidApplyResult(tasks, nextTasks, operations);
  return nextTasks;
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
  affectedStepIds: string[];
  fieldChangeCount: number;
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

function collectCreatedTasks(operation: QARecommendationOperation) {
  switch (operation.kind) {
    case "CreateTaskAfter":
    case "CreateTaskBefore":
    case "InsertTaskBetween":
      return [{ label: `${operation.kind}.task`, task: operation.task }];
    case "SplitTask":
      return operation.newTasks.map((task, index) => ({
        label: `SplitTask.newTasks[${index}]`,
        task
      }));
    case "CreateGateway":
      return [{ label: "CreateGateway.gatewayTask", task: operation.gatewayTask }];
    case "AddGatewayBranch":
      return operation.newTask
        ? [{ label: "AddGatewayBranch.newTask", task: operation.newTask }]
        : [];
    default:
      return [];
  }
}

function collectCreatedTaskNextStepReferences(
  operation: QARecommendationOperation
): RequiredStepReference[] {
  return collectCreatedTasks(operation).flatMap(({ label, task }) =>
    nextStepFields.flatMap((field) => {
      const stepId = task[field];

      if (stepId === null || stepId === undefined) {
        return [];
      }

      return [{ label: `${label}.${field}`, stepId }];
    })
  );
}

function collectRequiredExistingStepReferences(
  operation: QARecommendationOperation
): RequiredStepReference[] {
  switch (operation.kind) {
    case "UpdateTaskField":
      return [{ label: "UpdateTaskField.stepId", stepId: operation.stepId }];
    case "UpdateConnection":
      return [{ label: "UpdateConnection.stepId", stepId: operation.stepId }];
    case "AssignActor":
      return [{ label: "AssignActor.stepId", stepId: operation.stepId }];
    case "AssignSystem":
      return [{ label: "AssignSystem.stepId", stepId: operation.stepId }];
    case "SetInteractionType":
      return [{ label: "SetInteractionType.stepId", stepId: operation.stepId }];
    case "MarkReviewStatus":
      return [{ label: "MarkReviewStatus.stepId", stepId: operation.stepId }];
    case "CreateTaskAfter":
      return [{ label: "CreateTaskAfter.anchorStepId", stepId: operation.anchorStepId }];
    case "CreateTaskBefore":
      return [{ label: "CreateTaskBefore.anchorStepId", stepId: operation.anchorStepId }];
    case "InsertTaskBetween":
      return [
        { label: "InsertTaskBetween.sourceStepId", stepId: operation.sourceStepId },
        { label: "InsertTaskBetween.targetStepId", stepId: operation.targetStepId }
      ];
    case "SplitTask":
      return [{ label: "SplitTask.targetStepId", stepId: operation.targetStepId }];
    case "CreateGateway": {
      const references: RequiredStepReference[] = [];

      if (operation.afterStepId !== undefined) {
        references.push({
          label: "CreateGateway.afterStepId",
          stepId: operation.afterStepId
        });
      }

      if (operation.beforeStepId !== undefined) {
        references.push({
          label: "CreateGateway.beforeStepId",
          stepId: operation.beforeStepId
        });
      }

      return references;
    }
    case "AddGatewayBranch": {
      const references: RequiredStepReference[] = [
        { label: "AddGatewayBranch.gatewayStepId", stepId: operation.gatewayStepId }
      ];

      if (operation.targetStepId !== undefined) {
        references.push({
          label: "AddGatewayBranch.targetStepId",
          stepId: operation.targetStepId
        });
      }

      return references;
    }
    case "CreateLane":
      return (operation.targetStepIds ?? []).map((stepId, index) => ({
        label: `CreateLane.targetStepIds[${index}]`,
        stepId
      }));
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

function collectFieldChangeCount(operation: QARecommendationOperation) {
  switch (operation.kind) {
    case "UpdateTaskField":
    case "SetInteractionType":
    case "MarkReviewStatus":
      return 1;
    case "AssignActor":
      return operation.actorLane ? 2 : 1;
    case "AssignSystem":
      return operation.systemLane ? 2 : 1;
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
  let fieldChangeCount = 0;
  const skipRecommendation = (index: number, message: string) => {
    skippedRecommendationIndexes.add(index);
    conflicts.push({
      message,
      recommendationIndexes: [index]
    });
  };

  recommendations.forEach((recommendation, index) => {
    recommendation.warnings?.forEach((warning) => warnings.push(warning));

    normalizeRecommendationOperations(recommendation).forEach((operation) => {
      collectAffectedStepIds(operation).forEach((stepId) => affectedTaskIds.add(stepId));
      connectionChangeCount += collectConnectionChangeCount(operation);
      fieldChangeCount += collectFieldChangeCount(operation);

      collectRequiredExistingStepReferences(operation).forEach((reference) => {
        const invalidReason = describeInvalidStepReference(reference, existingStepIds);

        if (invalidReason) {
          skipRecommendation(
            index,
            `Recommendation "${recommendation.title}" skipped: ${invalidReason}`
          );
        }
      });

      collectCreatedStepIds(operation).forEach((stepId) => {
        newTaskCount += 1;

        if (existingStepIds.has(stepId)) {
          skipRecommendation(index, `Recommendation creates existing stepId ${stepId}.`);
          return;
        }

        const ownerIndex = createdStepOwners.get(stepId);

        if (ownerIndex !== undefined && ownerIndex !== index) {
          skippedRecommendationIndexes.add(ownerIndex);
          conflicts.push({
            message: `Two recommendations create the same stepId ${stepId}.`,
            recommendationIndexes: [ownerIndex, index]
          });
          skippedRecommendationIndexes.add(index);
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
        conflicts.push({
          message: `Conflicting updates for ${conflictTarget.key}.`,
          recommendationIndexes: [owner.index, index]
        });
        skippedRecommendationIndexes.add(index);
        return;
      }

      updateOwners.set(conflictTarget.key, {
        value: conflictTarget.value,
        index
      });
    });
  });

  let invalidInternalReferenceFound = true;

  while (invalidInternalReferenceFound) {
    invalidInternalReferenceFound = false;
    const availableStepIds = new Set(existingStepIds);

    createdStepOwners.forEach((ownerIndex, stepId) => {
      if (!skippedRecommendationIndexes.has(ownerIndex)) {
        availableStepIds.add(stepId);
      }
    });

    recommendations.forEach((recommendation, index) => {
      if (skippedRecommendationIndexes.has(index)) {
        return;
      }

      normalizeRecommendationOperations(recommendation).forEach((operation) => {
        collectCreatedTaskNextStepReferences(operation).forEach((reference) => {
          const invalidReason = describeInvalidStepReference(reference, availableStepIds);

          if (!invalidReason || skippedRecommendationIndexes.has(index)) {
            return;
          }

          skipRecommendation(
            index,
            `Recommendation "${recommendation.title}" skipped: ${invalidReason}`
          );
          invalidInternalReferenceFound = true;
        });
      });
    });
  }

  return {
    selectedCount: recommendations.length,
    applicableCount: recommendations.length - skippedRecommendationIndexes.size,
    skippedCount: skippedRecommendationIndexes.size,
    affectedTaskCount: affectedTaskIds.size,
    affectedStepIds: Array.from(affectedTaskIds).sort(),
    fieldChangeCount,
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
  const appliedOperations = recommendations.flatMap((recommendation, index) =>
    skippedIndexes.has(index) ? [] : normalizeRecommendationOperations(recommendation)
  );

  if (appliedOperations.length === 0) {
    throw new RecommendationApplyValidationError([
      "No applicable recommendations to apply."
    ]);
  }

  assertOperationTargetsExist(tasks, appliedOperations);

  const nextTasks = recommendations.reduce(
    (nextTasks, recommendation, index) =>
      skippedIndexes.has(index)
        ? nextTasks
        : normalizeRecommendationOperations(recommendation).reduce(
            (updatedTasks, operation) => applyOperation(updatedTasks, operation),
            nextTasks
          ),
    tasks.map(cloneTask)
  );

  assertValidApplyResult(tasks, nextTasks, appliedOperations);
  return nextTasks;
}
