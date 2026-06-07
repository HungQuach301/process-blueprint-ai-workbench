import type {
  TemplateQualityScore,
  TemplateRecommendation
} from "@/lib/ai/ai-template-review-types";
import type { TemplateProfile } from "@/lib/models/template-profile";

const recommendationTypes = new Set([
  "UpdateMetadata",
  "UpdateRules",
  "AddMandatoryField",
  "ImproveTemplateFit",
  "MarkForReview"
]);
const confidenceValues = new Set(["low", "medium", "high"]);
const riskValues = new Set(["low", "medium", "high"]);

export type TemplateReviewValidationResult =
  | {
      ok: true;
      recommendations: TemplateRecommendation[];
      qualityScore?: TemplateQualityScore;
      warnings: string[];
      assumptions: string[];
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

function validateRecommendation(
  recommendation: unknown,
  index: number,
  templateId: string,
  errors: string[]
) {
  if (!isObject(recommendation)) {
    errors.push(`recommendations[${index}] must be an object.`);
    return;
  }

  ["id", "templateId", "title", "description"].forEach((field) => {
    if (!isString(recommendation[field])) {
      errors.push(`recommendations[${index}].${field} must be a string.`);
    }
  });

  if (recommendation.templateId !== templateId) {
    errors.push(`recommendations[${index}].templateId must match selected template.`);
  }

  if (recommendation.source !== undefined && recommendation.source !== "ai") {
    errors.push(`recommendations[${index}].source must be ai.`);
  }

  if (!recommendationTypes.has(String(recommendation.type))) {
    errors.push(`recommendations[${index}].type is invalid.`);
  }

  if (!confidenceValues.has(String(recommendation.confidence))) {
    errors.push(`recommendations[${index}].confidence is invalid.`);
  }

  if (!riskValues.has(String(recommendation.riskLevel))) {
    errors.push(`recommendations[${index}].riskLevel is invalid.`);
  }

  if (
    !Array.isArray(recommendation.affectedFields) ||
    recommendation.affectedFields.some((field) => !isString(field))
  ) {
    errors.push(`recommendations[${index}].affectedFields must be a string array.`);
  }

  if (recommendation.requiresConfirmation !== true) {
    errors.push(`recommendations[${index}].requiresConfirmation must be true.`);
  }
}

function validateQualityScore(
  value: unknown,
  templateId: string,
  errors: string[]
) {
  if (value === undefined) {
    return;
  }

  if (!isObject(value)) {
    errors.push("qualityScore must be an object.");
    return;
  }

  if (value.templateId !== templateId) {
    errors.push("qualityScore.templateId must match selected template.");
  }

  if (typeof value.score !== "number" || value.score < 0) {
    errors.push("qualityScore.score must be a non-negative number.");
  }

  if (typeof value.maxScore !== "number" || value.maxScore <= 0) {
    errors.push("qualityScore.maxScore must be a positive number.");
  }

  if (!isString(value.summary)) {
    errors.push("qualityScore.summary must be a string.");
  }

  if (!Array.isArray(value.strengths) || value.strengths.some((item) => !isString(item))) {
    errors.push("qualityScore.strengths must be a string array.");
  }

  if (!Array.isArray(value.gaps) || value.gaps.some((item) => !isString(item))) {
    errors.push("qualityScore.gaps must be a string array.");
  }
}

function validateOptionalStringArray(
  value: unknown,
  fieldName: string,
  errors: string[]
) {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value) || value.some((item) => !isString(item))) {
    errors.push(`${fieldName} must be a string array when provided.`);
  }
}

export function validateTemplateReviewOutput(
  value: unknown,
  selectedTemplate: TemplateProfile
): TemplateReviewValidationResult {
  const errors: string[] = [];
  const output = isObject(value) ? value : { recommendations: value };
  const recommendations = output.recommendations;

  if (!Array.isArray(recommendations)) {
    errors.push("Template review output must include recommendations array.");
  } else {
    recommendations.forEach((recommendation, index) =>
      validateRecommendation(recommendation, index, selectedTemplate.id, errors)
    );
  }

  validateQualityScore(output.qualityScore, selectedTemplate.id, errors);
  validateOptionalStringArray(output.warnings, "warnings", errors);
  validateOptionalStringArray(output.assumptions, "assumptions", errors);

  if (errors.length > 0) {
    return {
      ok: false,
      errors
    };
  }

  return {
    ok: true,
    recommendations: (recommendations as TemplateRecommendation[]).map(
      (recommendation) => ({
        ...recommendation,
        source: "ai",
        requiresConfirmation: true
      })
    ),
    qualityScore: output.qualityScore as TemplateQualityScore | undefined,
    warnings: Array.isArray(output.warnings)
      ? (output.warnings as string[])
      : [],
    assumptions: Array.isArray(output.assumptions)
      ? (output.assumptions as string[])
      : [],
    errors: []
  };
}
