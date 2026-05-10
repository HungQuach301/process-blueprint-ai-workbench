import type { AICodingPackFiles } from "@/lib/generators/ai-coding-pack-generator";
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
  | "ProcessTaskRegisterContext"
  | "ProductDeliveryContext"
  | "DraftProcessTaskRegister"
  | "BRDResponse"
  | "SRSResponse"
  | "UserStorySetResponse"
  | "AcceptanceCriteriaResponse"
  | "AICodingPackResponse"
  | "QARecommendationResponse"
  | "TemplateRecommendationResponse";

export type AISkillValidationContext = {
  validStepIds?: string[];
  selectedTemplate?: TemplateProfile;
};

export type TraceLink = {
  sourceStepIds: string[];
  targetId?: string;
};

export type BRDSection = {
  id: string;
  title: string;
  content: string;
  sourceStepIds?: string[];
};

export type BRDResponse = {
  title: string;
  summary: string;
  sections: BRDSection[];
  assumptions: string[];
  openQuestions: string[];
  traceLinks?: TraceLink[];
};

export type FunctionalRequirement = {
  id: string;
  title: string;
  description: string;
  sourceStepIds: string[];
};

export type SRSResponse = {
  title: string;
  overview: string;
  functionalRequirements: FunctionalRequirement[];
  nonFunctionalRequirements: string[];
  assumptions: string[];
  openQuestions: string[];
  traceLinks?: TraceLink[];
};

export type UserStory = {
  id: string;
  title: string;
  persona: string;
  need: string;
  benefit: string;
  sourceStepIds: string[];
  acceptanceCriteria?: string[];
};

export type UserStorySetResponse = {
  stories: UserStory[];
  assumptions: string[];
  openQuestions: string[];
  traceLinks?: TraceLink[];
};

export type AcceptanceCriterion = {
  id: string;
  storyId?: string;
  sourceStepIds: string[];
  given: string;
  when: string;
  then: string;
};

export type AcceptanceCriteriaResponse = {
  criteria: AcceptanceCriterion[];
  assumptions: string[];
  openQuestions: string[];
};

export type AICodingPackFile = {
  path: string;
  content: string;
};

export type AICodingPackResponse = {
  files: AICodingPackFile[];
  specJson?: unknown;
  assumptions: string[];
  openQuestions: string[];
  traceLinks?: TraceLink[];
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

export function validateBRDResponse(
  value: unknown
): SchemaValidationResult<BRDResponse> {
  const errors: string[] = [];

  if (!isObject(value)) {
    return {
      ok: false,
      errors: ["BRDResponse must be an object."]
    };
  }

  ["title", "summary"].forEach((field) => {
    if (!isString(value[field])) {
      errors.push(`${field} must be a string.`);
    }
  });

  if (!Array.isArray(value.sections) || value.sections.length === 0) {
    errors.push("sections must be a non-empty array.");
  } else {
    value.sections.forEach((section, index) => {
      if (!isObject(section)) {
        errors.push(`sections[${index}] must be an object.`);
        return;
      }

      ["id", "title", "content"].forEach((field) => {
        if (!isString(section[field])) {
          errors.push(`sections[${index}].${field} must be a string.`);
        }
      });

      if (section.sourceStepIds !== undefined) {
        validateStringArray(
          section.sourceStepIds,
          `sections[${index}].sourceStepIds`,
          errors
        );
      }
    });
  }

  validateStringArray(value.assumptions, "assumptions", errors);
  validateStringArray(value.openQuestions, "openQuestions", errors);
  validateOptionalTraceLinks(value.traceLinks, errors);

  if (errors.length > 0) {
    return {
      ok: false,
      errors
    };
  }

  return {
    ok: true,
    value: value as BRDResponse,
    errors: []
  };
}

export function validateSRSResponse(
  value: unknown
): SchemaValidationResult<SRSResponse> {
  const errors: string[] = [];

  if (!isObject(value)) {
    return {
      ok: false,
      errors: ["SRSResponse must be an object."]
    };
  }

  ["title", "overview"].forEach((field) => {
    if (!isString(value[field])) {
      errors.push(`${field} must be a string.`);
    }
  });

  if (
    !Array.isArray(value.functionalRequirements) ||
    value.functionalRequirements.length === 0
  ) {
    errors.push("functionalRequirements must be a non-empty array.");
  } else {
    value.functionalRequirements.forEach((requirement, index) => {
      if (!isObject(requirement)) {
        errors.push(`functionalRequirements[${index}] must be an object.`);
        return;
      }

      ["id", "title", "description"].forEach((field) => {
        if (!isString(requirement[field])) {
          errors.push(`functionalRequirements[${index}].${field} must be a string.`);
        }
      });
      validateStringArray(
        requirement.sourceStepIds,
        `functionalRequirements[${index}].sourceStepIds`,
        errors
      );
    });
  }

  validateStringArray(
    value.nonFunctionalRequirements,
    "nonFunctionalRequirements",
    errors
  );
  validateStringArray(value.assumptions, "assumptions", errors);
  validateStringArray(value.openQuestions, "openQuestions", errors);
  validateOptionalTraceLinks(value.traceLinks, errors);

  if (errors.length > 0) {
    return {
      ok: false,
      errors
    };
  }

  return {
    ok: true,
    value: value as SRSResponse,
    errors: []
  };
}

export function validateUserStorySetResponse(
  value: unknown
): SchemaValidationResult<UserStorySetResponse> {
  const errors: string[] = [];

  if (!isObject(value)) {
    return {
      ok: false,
      errors: ["UserStorySetResponse must be an object."]
    };
  }

  if (!Array.isArray(value.stories) || value.stories.length === 0) {
    errors.push("stories must be a non-empty array.");
  } else {
    value.stories.forEach((story, index) => {
      if (!isObject(story)) {
        errors.push(`stories[${index}] must be an object.`);
        return;
      }

      ["id", "title", "persona", "need", "benefit"].forEach((field) => {
        if (!isString(story[field])) {
          errors.push(`stories[${index}].${field} must be a string.`);
        }
      });
      validateStringArray(story.sourceStepIds, `stories[${index}].sourceStepIds`, errors);

      if (story.acceptanceCriteria !== undefined) {
        validateStringArray(
          story.acceptanceCriteria,
          `stories[${index}].acceptanceCriteria`,
          errors
        );
      }
    });
  }

  validateStringArray(value.assumptions, "assumptions", errors);
  validateStringArray(value.openQuestions, "openQuestions", errors);
  validateOptionalTraceLinks(value.traceLinks, errors);

  if (errors.length > 0) {
    return {
      ok: false,
      errors
    };
  }

  return {
    ok: true,
    value: value as UserStorySetResponse,
    errors: []
  };
}

export function validateAcceptanceCriteriaResponse(
  value: unknown
): SchemaValidationResult<AcceptanceCriteriaResponse> {
  const errors: string[] = [];

  if (!isObject(value)) {
    return {
      ok: false,
      errors: ["AcceptanceCriteriaResponse must be an object."]
    };
  }

  if (!Array.isArray(value.criteria) || value.criteria.length === 0) {
    errors.push("criteria must be a non-empty array.");
  } else {
    value.criteria.forEach((criterion, index) => {
      if (!isObject(criterion)) {
        errors.push(`criteria[${index}] must be an object.`);
        return;
      }

      ["id", "given", "when", "then"].forEach((field) => {
        if (!isString(criterion[field])) {
          errors.push(`criteria[${index}].${field} must be a string.`);
        }
      });
      validateStringArray(
        criterion.sourceStepIds,
        `criteria[${index}].sourceStepIds`,
        errors
      );

      if (criterion.storyId !== undefined && !isString(criterion.storyId)) {
        errors.push(`criteria[${index}].storyId must be a string when provided.`);
      }
    });
  }

  validateStringArray(value.assumptions, "assumptions", errors);
  validateStringArray(value.openQuestions, "openQuestions", errors);

  if (errors.length > 0) {
    return {
      ok: false,
      errors
    };
  }

  return {
    ok: true,
    value: value as AcceptanceCriteriaResponse,
    errors: []
  };
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
    openQuestions
  };
}

export function validateAISkillInput(
  skillId: string,
  value: unknown
): SchemaValidationResult<unknown> {
  if (skillId === "input-brief-to-ptr" || skillId === "chat-to-draft-ptr") {
    return validateStructuredProcessBrief(value);
  }

  if (
    [
      "ai-process-qa",
      "process-qa-recommendation",
      "process-improvement-recommendation",
      "template-recommendation",
      "ptr-to-brd-outline",
      "ptr-to-srs-outline",
      "ptr-to-user-stories",
      "mvp-slicing",
      "scope-nonscope-definition",
      "requirement-quality-check",
      "ptr-to-ai-coding-pack"
    ].includes(skillId)
  ) {
    return validateProcessTaskArrayInput(value);
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
    skillId === "file-to-draft-ptr" ||
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
        qualityScore: validation.qualityScore
      },
      errors: []
    };
  }

  if (skillId === "ptr-to-brd-outline") {
    return validateBRDResponse(value);
  }

  if (skillId === "ptr-to-srs-outline") {
    return validateSRSResponse(value);
  }

  if (
    skillId === "brd-or-notes-to-user-stories" ||
    skillId === "ptr-to-user-stories"
  ) {
    return validateUserStorySetResponse(value);
  }

  if (skillId === "user-stories-to-acceptance-criteria") {
    return validateAcceptanceCriteriaResponse(value);
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
