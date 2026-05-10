import type { AICodingPackFiles } from "@/lib/generators/ai-coding-pack-generator";
import {
  validateAcceptanceCriteriaSet,
  validateBRD,
  validateProductScopeReview,
  validateSRS,
  validateUserStorySet,
  type AcceptanceCriteriaSet,
  type AcceptanceCriterion,
  type BRD,
  type BRDSection,
  type FunctionalRequirement,
  type ProductDeliveryTraceLink,
  type ProductScopeReview,
  type SRS,
  type UserStory,
  type UserStorySet
} from "@/lib/models/product-delivery";
import type { ProcessTask } from "@/lib/models/process-task";
import type { TemplateProfile } from "@/lib/models/template-profile";
import type { QARecommendation } from "@/lib/recommendation-engine/types";
import type { TemplateRecommendation } from "@/lib/ai/ai-template-review-types";
import {
  validateDraftProcessTaskRegister,
  validateStructuredProcessBrief,
  type DraftProcessTaskRegister,
  type SchemaValidationResult
} from "@/lib/ai-intake/draft-ptr-schema";
import { validateAIQARecommendations } from "@/lib/recommendation-engine/qa-recommendation-schema";
import { validateTemplateReviewOutput } from "@/lib/template-recommendation-engine";

export type AISkillSchemaId =
  | "StructuredProcessBrief"
  | "FileIntakeContext"
  | "ChatNotesContext"
  | "ProcessTaskRegisterContext"
  | "ProductDeliveryContext"
  | "DraftProcessTaskRegister"
  | "BRDResponse"
  | "SRSResponse"
  | "UserStorySetResponse"
  | "AcceptanceCriteriaResponse"
  | "ProductScopeReviewResponse"
  | "AICodingPackResponse"
  | "QARecommendationResponse"
  | "TemplateRecommendationResponse"
  | "ArtifactReviewResponse";

export type AISkillValidationContext = {
  validStepIds?: string[];
  selectedTemplate?: TemplateProfile;
};

export type TraceLink = ProductDeliveryTraceLink;
export type { AcceptanceCriterion, BRDSection, FunctionalRequirement, UserStory };
export type BRDResponse = BRD;
export type SRSResponse = SRS;
export type UserStorySetResponse = UserStorySet;
export type AcceptanceCriteriaResponse = AcceptanceCriteriaSet;
export type ProductScopeReviewResponse = ProductScopeReview;

export type AICodingPackFile = {
  path: string;
  content: string;
};

export type AICodingPackResponse = {
  files: AICodingPackFile[];
  specJson?: unknown;
  assumptions: string[];
  openQuestions: string[];
  qualityIssues?: string[];
  traceLinks?: TraceLink[];
};

export type ArtifactReviewResponse = {
  recommendations: QARecommendation[];
  templateRecommendations: TemplateRecommendation[];
  warnings: string[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function validateStringArray(
  value: unknown,
  fieldName: string,
  errors: string[]
) {
  if (!Array.isArray(value) || value.some((item) => !isString(item))) {
    errors.push(`${fieldName} must be a string array.`);
  }
}

function validateOptionalTraceLinks(value: unknown, errors: string[]) {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    errors.push("traceLinks must be an array when provided.");
    return;
  }

  value.forEach((traceLink, index) => {
    if (!isObject(traceLink)) {
      errors.push(`traceLinks[${index}] must be an object.`);
      return;
    }

    validateStringArray(traceLink.sourceStepIds, `traceLinks[${index}].sourceStepIds`, errors);

    if (traceLink.targetId !== undefined && !isString(traceLink.targetId)) {
      errors.push(`traceLinks[${index}].targetId must be a string when provided.`);
    }
  });
}

function validateProcessTaskArrayInput(
  value: unknown
): SchemaValidationResult<{ processTasks: ProcessTask[] }> {
  if (!isObject(value) || !Array.isArray(value.processTasks)) {
    return {
      ok: false,
      errors: ["Input must include processTasks array."]
    };
  }

  return {
    ok: true,
    value: value as { processTasks: ProcessTask[] },
    errors: []
  };
}

function validateFileIntakeContext(value: unknown): SchemaValidationResult<unknown> {
  const errors: string[] = [];

  if (!isObject(value)) {
    return {
      ok: false,
      errors: ["FileIntakeContext must be an object."]
    };
  }

  ["fileName", "fileType", "extractedText"].forEach((field) => {
    if (!isString(value[field])) {
      errors.push(`${field} must be a string.`);
    }
  });

  if (isString(value.extractedText) && value.extractedText.trim().length < 20) {
    errors.push("extractedText must contain enough text to draft a process.");
  }

  [
    "extractionWarnings",
    "detectedActors",
    "detectedSystems",
    "detectedDataObjects",
    "detectedSteps"
  ].forEach((field) => {
    if (value[field] !== undefined) {
      validateStringArray(value[field], field, errors);
    }
  });

  if (errors.length > 0) {
    return {
      ok: false,
      errors
    };
  }

  return {
    ok: true,
    value,
    errors: []
  };
}

function validateChatNotesContext(value: unknown): SchemaValidationResult<unknown> {
  const errors: string[] = [];

  if (!isObject(value)) {
    return {
      ok: false,
      errors: ["ChatNotesContext must be an object."]
    };
  }

  if (!isString(value.notes)) {
    errors.push("notes must be a string.");
  } else if (value.notes.trim().length < 20) {
    errors.push("notes must contain enough text to draft a process.");
  }

  if (value.userContext !== undefined && !isString(value.userContext)) {
    errors.push("userContext must be a string when provided.");
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors
    };
  }

  return {
    ok: true,
    value,
    errors: []
  };
}

export function validateBRDResponse(
  value: unknown
): SchemaValidationResult<BRDResponse> {
  return validateBRD(value);
}

export function validateSRSResponse(
  value: unknown
): SchemaValidationResult<SRSResponse> {
  return validateSRS(value);
}

export function validateUserStorySetResponse(
  value: unknown
): SchemaValidationResult<UserStorySetResponse> {
  return validateUserStorySet(value);
}

export function validateAcceptanceCriteriaResponse(
  value: unknown
): SchemaValidationResult<AcceptanceCriteriaResponse> {
  return validateAcceptanceCriteriaSet(value);
}

export function validateProductScopeReviewResponse(
  value: unknown
): SchemaValidationResult<ProductScopeReviewResponse> {
  return validateProductScopeReview(value);
}

export function validateAICodingPackResponse(
  value: unknown
): SchemaValidationResult<AICodingPackResponse> {
  const errors: string[] = [];

  if (!isObject(value)) {
    return {
      ok: false,
      errors: ["AICodingPackResponse must be an object."]
    };
  }

  if (!Array.isArray(value.files) || value.files.length === 0) {
    errors.push("files must be a non-empty array.");
  } else {
    value.files.forEach((file, index) => {
      if (!isObject(file)) {
        errors.push(`files[${index}] must be an object.`);
        return;
      }

      ["path", "content"].forEach((field) => {
        if (!isString(file[field])) {
          errors.push(`files[${index}].${field} must be a string.`);
        }
      });
    });
  }

  validateStringArray(value.assumptions, "assumptions", errors);
  validateStringArray(value.openQuestions, "openQuestions", errors);
  if (value.qualityIssues !== undefined) {
    validateStringArray(value.qualityIssues, "qualityIssues", errors);
  }
  validateOptionalTraceLinks(value.traceLinks, errors);

  if (errors.length > 0) {
    return {
      ok: false,
      errors
    };
  }

  return {
    ok: true,
    value: value as AICodingPackResponse,
    errors: []
  };
}

export function normalizeDeterministicCodingPack(
  files: AICodingPackFiles,
  assumptions: string[] = [],
  openQuestions: string[] = []
): AICodingPackResponse {
  return {
    files: [
      { path: "AGENTS.md", content: files.agentsMd },
      { path: "CLAUDE.md", content: files.claudeMd },
      { path: "cursor-rules.md", content: files.cursorRulesMd },
      { path: "spec.json", content: files.specJson },
      { path: "acceptance-criteria.md", content: files.acceptanceCriteriaMd },
      { path: "implementation-plan.md", content: files.implementationPlanMd },
      { path: "test-plan.md", content: files.testPlanMd }
    ],
    specJson: files.specJson,
    assumptions,
    openQuestions,
    qualityIssues: runAICodingPackQualityGate({
      files,
      assumptions,
      openQuestions
    }).issues
  };
}

export function runAICodingPackQualityGate({
  files,
  assumptions,
  openQuestions
}: {
  files: AICodingPackFiles;
  assumptions?: string[];
  openQuestions?: string[];
}) {
  const issues: string[] = [];
  const acceptanceCriteria = files.acceptanceCriteriaMd.toLowerCase();
  const claudeMd = files.claudeMd.toLowerCase();
  const testPlan = files.testPlanMd.toLowerCase();

  if (!acceptanceCriteria.includes("- [ ]")) {
    issues.push("missing AC: acceptance-criteria.md must include checklist criteria.");
  }

  if (!claudeMd.includes("non-goals")) {
    issues.push("missing non-goals: CLAUDE.md must include a non-goals section.");
  }

  if (!testPlan.includes("functional tests") || !testPlan.includes("- [ ]")) {
    issues.push("missing test expectations: test-plan.md must include test checklist items.");
  }

  if ((openQuestions ?? []).length > 0) {
    issues.push("unresolved open questions: review open questions before implementation.");
  }

  if ((assumptions ?? []).length === 0) {
    issues.push("missing assumptions: include assumptions for reviewer context.");
  }

  return {
    canPreview: issues.length < 5,
    canExport: !issues.some((issue) => issue.startsWith("missing AC")),
    issues
  };
}

export function validateArtifactReviewResponse(
  value: unknown,
  context: AISkillValidationContext = {}
): SchemaValidationResult<ArtifactReviewResponse> {
  const errors: string[] = [];

  if (!isObject(value)) {
    return {
      ok: false,
      errors: ["ArtifactReviewResponse must be an object."]
    };
  }

  const recommendations = value.recommendations ?? [];
  const qaValidation = validateAIQARecommendations(
    recommendations,
    context.validStepIds ?? []
  );

  if (!qaValidation.ok) {
    errors.push(...qaValidation.errors);
  }

  let templateRecommendations: TemplateRecommendation[] = [];

  if (value.templateRecommendations !== undefined) {
    if (!context.selectedTemplate) {
      errors.push(
        "selectedTemplate is required to validate artifact template recommendations."
      );
    } else {
      const templateValidation = validateTemplateReviewOutput(
        { recommendations: value.templateRecommendations },
        context.selectedTemplate
      );

      if (!templateValidation.ok) {
        errors.push(...templateValidation.errors);
      } else {
        templateRecommendations = templateValidation.recommendations;
      }
    }
  }

  if (value.warnings !== undefined) {
    validateStringArray(value.warnings, "warnings", errors);
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors
    };
  }

  return {
    ok: true,
    value: {
      recommendations: qaValidation.ok ? qaValidation.recommendations : [],
      templateRecommendations,
      warnings: Array.isArray(value.warnings)
        ? (value.warnings as string[])
        : []
    },
    errors: []
  };
}

export function validateAISkillInput(
  skillId: string,
  value: unknown
): SchemaValidationResult<unknown> {
  if (skillId === "input-brief-to-ptr") {
    return validateStructuredProcessBrief(value);
  }

  if (skillId === "file-to-ptr-draft" || skillId === "file-to-draft-ptr") {
    return validateFileIntakeContext(value);
  }

  if (skillId === "chat-to-ptr-draft" || skillId === "chat-to-draft-ptr") {
    return validateChatNotesContext(value);
  }

  if (
    [
      "ai-process-qa",
      "process-qa-recommendation",
      "process-improvement-recommendation",
      "artifact-review",
      "template-recommendation",
      "ptr-to-brd",
      "ptr-to-brd-outline",
      "ptr-to-srs-outline",
      "ptr-to-user-stories",
      "requirement-quality-check",
      "ptr-to-ai-coding-pack",
      "user-stories-to-ai-coding-pack"
    ].includes(skillId)
  ) {
    if (skillId === "user-stories-to-ai-coding-pack") {
      if (!isObject(value)) {
        return {
          ok: false,
          errors: ["ProductDeliveryContext must be an object."]
        };
      }

      if (
        !isObject(value.userStorySet) &&
        !isObject(value.acceptanceCriteria) &&
        !isObject(value.brd) &&
        !isObject(value.srs) &&
        !Array.isArray(value.processTasks)
      ) {
        return {
          ok: false,
          errors: [
            "user-stories-to-ai-coding-pack requires userStorySet, acceptanceCriteria, BRD, SRS, or processTasks."
          ]
        };
      }

      return {
        ok: true,
        value,
        errors: []
      };
    }

    return validateProcessTaskArrayInput(value);
  }

  if (skillId === "notes-to-brd" || skillId === "notes-to-srs") {
    if (!isObject(value)) {
      return {
        ok: false,
        errors: ["ProductDeliveryContext must be an object."]
      };
    }

    const sourceText = [
      value.notes,
      value.projectContext,
      value.sourceSummary,
      value.uploadedFileText
    ]
      .filter((item): item is string => typeof item === "string")
      .join("\n")
      .trim();

    if (sourceText.length < 20) {
      return {
        ok: false,
        errors: [
          `${skillId} requires notes, projectContext, sourceSummary, or uploadedFileText with enough content.`
        ]
      };
    }

    return {
      ok: true,
      value,
      errors: []
    };
  }

  if (skillId === "brd-to-srs") {
    if (!isObject(value)) {
      return {
        ok: false,
        errors: ["ProductDeliveryContext must be an object."]
      };
    }

    if (
      !isObject(value.brd) &&
      !Array.isArray(value.processTasks) &&
      !isString(value.notes)
    ) {
      return {
        ok: false,
        errors: ["brd-to-srs requires brd, processTasks, or notes."]
      };
    }

    return {
      ok: true,
      value,
      errors: []
    };
  }

  if (
    skillId === "srs-to-user-stories" ||
    skillId === "brd-to-user-stories" ||
    skillId === "brd-or-notes-to-user-stories" ||
    skillId === "user-stories-to-acceptance-criteria" ||
    skillId === "product-scope-review" ||
    skillId === "mvp-slicing" ||
    skillId === "scope-nonscope-definition"
  ) {
    if (!isObject(value)) {
      return {
        ok: false,
        errors: ["ProductDeliveryContext must be an object."]
      };
    }

    if (
      skillId === "srs-to-user-stories" &&
      !isObject(value.srs) &&
      !Array.isArray(value.processTasks)
    ) {
      return {
        ok: false,
        errors: ["srs-to-user-stories requires srs or processTasks."]
      };
    }

    if (
      skillId === "brd-to-user-stories" &&
      !isObject(value.brd) &&
      !Array.isArray(value.processTasks)
    ) {
      return {
        ok: false,
        errors: ["brd-to-user-stories requires brd or processTasks."]
      };
    }

    if (
      skillId === "user-stories-to-acceptance-criteria" &&
      !isObject(value.userStorySet) &&
      !Array.isArray(value.processTasks)
    ) {
      return {
        ok: false,
        errors: [
          "user-stories-to-acceptance-criteria requires userStorySet or processTasks."
        ]
      };
    }

    if (
      (skillId === "product-scope-review" ||
        skillId === "mvp-slicing" ||
        skillId === "scope-nonscope-definition") &&
      !isObject(value.brd) &&
      !isObject(value.srs) &&
      !isObject(value.userStorySet) &&
      !Array.isArray(value.processTasks)
    ) {
      return {
        ok: false,
        errors: [
          `${skillId} requires BRD, SRS, userStorySet, or Process Task Register context.`
        ]
      };
    }

    return {
      ok: true,
      value,
      errors: []
    };
  }

  return {
    ok: true,
    value,
    errors: []
  };
}

export function validateAISkillOutput(
  skillId: string,
  value: unknown,
  context: AISkillValidationContext = {}
): SchemaValidationResult<unknown> {
  if (
    skillId === "input-brief-to-ptr" ||
    skillId === "file-to-ptr-draft" ||
    skillId === "file-to-draft-ptr" ||
    skillId === "chat-to-ptr-draft" ||
    skillId === "chat-to-draft-ptr"
  ) {
    return validateDraftProcessTaskRegister(value);
  }

  if (
    skillId === "ai-process-qa" ||
    skillId === "process-qa-recommendation" ||
    skillId === "process-improvement-recommendation"
  ) {
    const output = isObject(value) ? value.recommendations : value;
    const validation = validateAIQARecommendations(output, context.validStepIds ?? []);

    if (!validation.ok) {
      return validation;
    }

    return {
      ok: true,
      value: validation.recommendations satisfies QARecommendation[],
      errors: []
    };
  }

  if (skillId === "artifact-review") {
    return validateArtifactReviewResponse(value, context);
  }

  if (skillId === "template-review" || skillId === "ai-template-review") {
    if (!context.selectedTemplate) {
      return {
        ok: false,
        errors: ["selectedTemplate is required to validate template review output."]
      };
    }

    const validation = validateTemplateReviewOutput(value, context.selectedTemplate);

    if (!validation.ok) {
      return validation;
    }

    return {
      ok: true,
      value: {
        recommendations: validation.recommendations satisfies TemplateRecommendation[],
        qualityScore: validation.qualityScore,
        warnings: validation.warnings,
        assumptions: validation.assumptions
      },
      errors: []
    };
  }

  if (
    skillId === "notes-to-brd" ||
    skillId === "ptr-to-brd" ||
    skillId === "ptr-to-brd-outline"
  ) {
    return validateBRDResponse(value);
  }

  if (
    skillId === "brd-to-srs" ||
    skillId === "notes-to-srs" ||
    skillId === "ptr-to-srs-outline"
  ) {
    return validateSRSResponse(value);
  }

  if (
    skillId === "brd-or-notes-to-user-stories" ||
    skillId === "srs-to-user-stories" ||
    skillId === "brd-to-user-stories" ||
    skillId === "ptr-to-user-stories"
  ) {
    return validateUserStorySetResponse(value);
  }

  if (skillId === "user-stories-to-acceptance-criteria") {
    return validateAcceptanceCriteriaResponse(value);
  }

  if (
    skillId === "product-scope-review" ||
    skillId === "mvp-slicing" ||
    skillId === "scope-nonscope-definition"
  ) {
    return validateProductScopeReviewResponse(value);
  }

  if (
    skillId === "ptr-to-ai-coding-pack" ||
    skillId === "user-stories-to-ai-coding-pack"
  ) {
    return validateAICodingPackResponse(value);
  }

  return {
    ok: true,
    value,
    errors: []
  };
}

export type {
  DraftProcessTaskRegister,
  ProcessTask,
  QARecommendation,
  TemplateRecommendation
};
