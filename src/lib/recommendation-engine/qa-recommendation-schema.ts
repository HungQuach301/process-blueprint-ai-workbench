import { normalizeRecommendation } from "@/lib/recommendation-engine/recommendation-factory";
import type {
  QARecommendation,
  QARecommendationOperation
} from "@/lib/recommendation-engine/types";

const confidenceValues = new Set(["low", "medium", "high"]);
const impactValues = new Set(["low", "medium", "high"]);
const riskValues = new Set(["low", "medium", "high"]);
const recommendationTypes = new Set([
  "UpdateField",
  "SplitTask",
  "CreateTask",
  "CreateLane",
  "AssignSystem",
  "AssignActor",
  "ChangeBpmnType",
  "ChangeRowType",
  "SetInteractionType",
  "MarkReviewStatus",
  "AddGatewayBranch"
]);
const operationKinds = new Set<QARecommendationOperation["kind"]>([
  "UpdateTaskField",
  "CreateTaskAfter",
  "CreateTaskBefore",
  "InsertTaskBetween",
  "SplitTask",
  "CreateGateway",
  "AddGatewayBranch",
  "UpdateConnection",
  "CreateLane",
  "AssignActor",
  "AssignSystem",
  "SetInteractionType",
  "MarkReviewStatus"
]);

export type QARecommendationValidationResult =
  | {
      ok: true;
      recommendations: QARecommendation[];
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

function validateOperation(
  operation: unknown,
  index: number,
  operationIndex: number,
  errors: string[]
) {
  if (!isObject(operation)) {
    errors.push(`recommendations[${index}].operations[${operationIndex}] must be an object.`);
    return;
  }

  if (!operationKinds.has(operation.kind as QARecommendationOperation["kind"])) {
    errors.push(`recommendations[${index}].operations[${operationIndex}].kind is invalid.`);
  }
}

function validateRecommendation(
  recommendation: unknown,
  index: number,
  validStepIds: Set<string>,
  errors: string[]
) {
  if (!isObject(recommendation)) {
    errors.push(`recommendations[${index}] must be an object.`);
    return;
  }

  ["title", "description", "previewText"].forEach((field) => {
    if (!isString(recommendation[field])) {
      errors.push(`recommendations[${index}].${field} must be a string.`);
    }
  });

  if (recommendation.source !== undefined && recommendation.source !== "ai") {
    errors.push(`recommendations[${index}].source must be ai.`);
  }

  if (!confidenceValues.has(String(recommendation.confidence))) {
    errors.push(`recommendations[${index}].confidence is invalid.`);
  }

  if (!impactValues.has(String(recommendation.impact))) {
    errors.push(`recommendations[${index}].impact is invalid.`);
  }

  if (
    recommendation.riskLevel !== undefined &&
    !riskValues.has(String(recommendation.riskLevel))
  ) {
    errors.push(`recommendations[${index}].riskLevel is invalid.`);
  }

  const recommendationType = recommendation.recommendationType ?? recommendation.type;

  if (
    recommendationType !== undefined &&
    !recommendationTypes.has(String(recommendationType))
  ) {
    errors.push(`recommendations[${index}].recommendationType is invalid.`);
  }

  if (
    !Array.isArray(recommendation.targetStepIds) ||
    recommendation.targetStepIds.length === 0 ||
    recommendation.targetStepIds.some((stepId) => !isString(stepId))
  ) {
    errors.push(`recommendations[${index}].targetStepIds must be a non-empty string array.`);
  } else {
    recommendation.targetStepIds.forEach((stepId) => {
      if (!validStepIds.has(stepId)) {
        errors.push(`recommendations[${index}] targets missing stepId ${stepId}.`);
      }
    });
  }

  if (recommendation.operations !== undefined) {
    if (!Array.isArray(recommendation.operations)) {
      errors.push(`recommendations[${index}].operations must be an array.`);
    } else {
      recommendation.operations.forEach((operation, operationIndex) =>
        validateOperation(operation, index, operationIndex, errors)
      );
    }
  }
}

export function validateAIQARecommendations(
  value: unknown,
  validStepIds: string[]
): QARecommendationValidationResult {
  const errors: string[] = [];
  const validStepIdSet = new Set(validStepIds);

  if (!Array.isArray(value)) {
    return {
      ok: false,
      errors: ["AI QA output must be a QARecommendation array."]
    };
  }

  value.forEach((recommendation, index) =>
    validateRecommendation(recommendation, index, validStepIdSet, errors)
  );

  if (errors.length > 0) {
    return {
      ok: false,
      errors
    };
  }

  return {
    ok: true,
    recommendations: value.map((recommendation) =>
      normalizeRecommendation({
        ...(recommendation as QARecommendation),
        source: "ai",
        requiresConfirmation: true
      })
    ),
    errors: []
  };
}
