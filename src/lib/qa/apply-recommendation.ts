import type { ProcessTask } from "@/lib/models/process-task";
import type {
  QAConnectionField,
  QARecommendation,
  QARecommendationOperation
} from "@/lib/qa/task-register-rules";

export type RecommendationChangePreview = {
  stepId: string;
  field: string;
  oldValue: string;
  newValue: string;
};

const connectionFields: QAConnectionField[] = [
  "defaultNextStep",
  "yesNextStep",
  "noNextStep"
];

function stringifyValue(value: unknown) {
  if (value == null) {
    return "";
  }

  return String(value);
}

function cloneTask(task: ProcessTask) {
  return { ...task };
}

function normalizeOperations(recommendation: QARecommendation): QARecommendationOperation[] {
  if (recommendation.operations?.length) {
    return recommendation.operations;
  }

  const operations: QARecommendationOperation[] = [];

  if (recommendation.patch) {
    recommendation.targetStepIds.forEach((stepId) => {
      Object.entries(recommendation.patch ?? {}).forEach(([field, value]) => {
        operations.push({
          kind: "UpdateTaskField",
          stepId,
          field: field as keyof typeof recommendation.patch,
          value
        });
      });
    });
  }

  if (recommendation.type === "SplitTask" && recommendation.newTasks?.length) {
    operations.push({
      kind: "SplitTask",
      targetStepId: recommendation.targetStepIds[0],
      newTasks: recommendation.newTasks
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

export function previewRecommendationOperations(
  tasks: ProcessTask[],
  recommendation: QARecommendation
) {
  const changes: RecommendationChangePreview[] = [];

  normalizeOperations(recommendation).forEach((operation) => {
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

export function applyRecommendationOperations(
  tasks: ProcessTask[],
  recommendation: QARecommendation
) {
  return normalizeOperations(recommendation).reduce(
    (nextTasks, operation) => applyOperation(nextTasks, operation),
    tasks.map(cloneTask)
  );
}

export function getRecommendationChangePreview(
  tasks: ProcessTask[],
  recommendation: QARecommendation
) {
  return previewRecommendationOperations(tasks, recommendation);
}

export function applyQARecommendation(
  tasks: ProcessTask[],
  recommendation: QARecommendation
) {
  return applyRecommendationOperations(tasks, recommendation);
}
