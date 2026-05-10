import type { ProcessTask } from "@/lib/models/process-task";
import type {
  DraftPTRConfidence,
  DraftPTRGenerationResult
} from "@/lib/ai-intake/draft-ptr-generator";
import type {
  IntakeLanguage,
  IntakeOutputLanguage,
  StructuredProcessBrief
} from "@/lib/ai-intake/structured-process-brief";

const rowTypes = new Set([
  "phase",
  "group",
  "task",
  "gateway",
  "start",
  "end",
  "event",
  "data",
  "annotation"
]);

const bpmnTypes = new Set([
  "none",
  "startEvent",
  "endEvent",
  "task",
  "userTask",
  "manualTask",
  "serviceTask",
  "sendTask",
  "scriptTask",
  "businessRuleTask",
  "exclusiveGateway",
  "parallelGateway",
  "inclusiveGateway",
  "dataObject",
  "dataStore"
]);

const taskNatures = new Set([
  "manual",
  "automatic",
  "semiAutomatic",
  "system",
  "decision",
  "approval",
  "integration",
  "notification",
  "control",
  "data"
]);

const dataActions = new Set([
  "none",
  "pull",
  "push",
  "store",
  "create",
  "read",
  "update",
  "delete",
  "validate",
  "approve",
  "reject",
  "send",
  "receive"
]);

const reviewStatuses = new Set(["draft", "needsReview", "approved", "rejected"]);
const confidenceValues = new Set(["low", "medium", "high"]);
const languages = new Set(["vi", "en"]);
const outputLanguages = new Set(["vi", "en", "bilingual"]);

export type DraftProcessTaskRegister = DraftPTRGenerationResult;

export type SchemaValidationResult<T> =
  | {
      ok: true;
      value: T;
      errors: [];
    }
  | {
      ok: false;
      errors: string[];
    };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown) {
  return typeof value === "string";
}

function isNullableString(value: unknown) {
  return value === null || typeof value === "string";
}

function validateStringArray(
  value: unknown,
  fieldName: string,
  errors: string[]
) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    errors.push(`${fieldName} must be a string array.`);
  }
}

function validateProcessTask(value: unknown, index: number, errors: string[]) {
  if (!isObject(value)) {
    errors.push(`draftProcessTasks[${index}] must be an object.`);
    return;
  }

  const stringFields: Array<keyof ProcessTask> = [
    "id",
    "stepId",
    "phase",
    "group",
    "actor",
    "actorLane",
    "system",
    "systemLane",
    "dataObject",
    "taskName",
    "input",
    "output",
    "conditionQuestion",
    "exception",
    "exceptionHandling",
    "sla",
    "riskControl",
    "sourceRef",
    "comment"
  ];

  stringFields.forEach((field) => {
    if (!isString(value[field])) {
      errors.push(`draftProcessTasks[${index}].${field} must be a string.`);
    }
  });

  if (!isNullableString(value.parentStepId)) {
    errors.push(`draftProcessTasks[${index}].parentStepId must be string or null.`);
  }

  if (!rowTypes.has(String(value.rowType))) {
    errors.push(`draftProcessTasks[${index}].rowType is invalid.`);
  }

  if (!bpmnTypes.has(String(value.bpmnType))) {
    errors.push(`draftProcessTasks[${index}].bpmnType is invalid.`);
  }

  if (!taskNatures.has(String(value.taskNature))) {
    errors.push(`draftProcessTasks[${index}].taskNature is invalid.`);
  }

  if (!dataActions.has(String(value.dataAction))) {
    errors.push(`draftProcessTasks[${index}].dataAction is invalid.`);
  }

  if (!reviewStatuses.has(String(value.reviewStatus))) {
    errors.push(`draftProcessTasks[${index}].reviewStatus is invalid.`);
  }

  if (!isNullableString(value.defaultNextStep)) {
    errors.push(`draftProcessTasks[${index}].defaultNextStep must be string or null.`);
  }

  if (!isNullableString(value.yesNextStep)) {
    errors.push(`draftProcessTasks[${index}].yesNextStep must be string or null.`);
  }

  if (!isNullableString(value.noNextStep)) {
    errors.push(`draftProcessTasks[${index}].noNextStep must be string or null.`);
  }
}

export function validateDraftProcessTaskRegister(
  value: unknown
): SchemaValidationResult<DraftProcessTaskRegister> {
  const errors: string[] = [];

  if (!isObject(value)) {
    return {
      ok: false,
      errors: ["DraftProcessTaskRegister must be an object."]
    };
  }

  if (!Array.isArray(value.draftProcessTasks) || value.draftProcessTasks.length === 0) {
    errors.push("draftProcessTasks must be a non-empty array.");
  } else {
    value.draftProcessTasks.forEach((task, index) =>
      validateProcessTask(task, index, errors)
    );

    const stepIds = value.draftProcessTasks
      .map((task) => (isObject(task) ? task.stepId : undefined))
      .filter(isString);
    const uniqueStepIds = new Set(stepIds);

    if (uniqueStepIds.size !== stepIds.length) {
      errors.push("draftProcessTasks stepId values must be unique.");
    }

    const nextStepRefs = value.draftProcessTasks.flatMap((task) => {
      if (!isObject(task)) {
        return [];
      }

      return [task.defaultNextStep, task.yesNextStep, task.noNextStep].filter(isString);
    });

    nextStepRefs.forEach((stepId) => {
      if (!uniqueStepIds.has(stepId)) {
        errors.push(`Next step reference ${stepId} does not exist.`);
      }
    });
  }

  validateStringArray(value.assumptions, "assumptions", errors);
  validateStringArray(value.openQuestions, "openQuestions", errors);
  validateStringArray(value.qualityIssues, "qualityIssues", errors);

  if (!isString(value.sourceSummary)) {
    errors.push("sourceSummary must be a string.");
  }

  if (!confidenceValues.has(String(value.confidence))) {
    errors.push("confidence must be low, medium, or high.");
  }

  if (!languages.has(String(value.inputLanguage))) {
    errors.push("inputLanguage must be vi or en.");
  }

  if (!outputLanguages.has(String(value.outputLanguage))) {
    errors.push("outputLanguage must be vi, en, or bilingual.");
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors
    };
  }

  return {
    ok: true,
    value: value as DraftProcessTaskRegister,
    errors: []
  };
}

export function validateStructuredProcessBrief(
  value: unknown
): SchemaValidationResult<StructuredProcessBrief> {
  const errors: string[] = [];

  if (!isObject(value)) {
    return {
      ok: false,
      errors: ["StructuredProcessBrief must be an object."]
    };
  }

  if (!isObject(value.processInfo) || !isString(value.processInfo.processName)) {
    errors.push("processInfo.processName must be a string.");
  }

  if (!isString(value.businessObjective)) {
    errors.push("businessObjective must be a string.");
  }

  if (!isString(value.scope)) {
    errors.push("scope must be a string.");
  }

  if (
    !isObject(value.startEnd) ||
    !isString(value.startEnd.startEvent) ||
    !isString(value.startEnd.endEvent)
  ) {
    errors.push("startEnd.startEvent and startEnd.endEvent must be strings.");
  }

  if (
    !Array.isArray(value.actors) ||
    value.actors.some((actor) => !isObject(actor) || !isString(actor.name))
  ) {
    errors.push("actors must be an array of objects with name.");
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors
    };
  }

  return {
    ok: true,
    value: value as StructuredProcessBrief,
    errors: []
  };
}
