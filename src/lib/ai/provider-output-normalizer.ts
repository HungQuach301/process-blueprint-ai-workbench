import type { AISkillSchemaId } from "@/lib/ai/skill-schemas";

export type ProviderOutputNormalizerIssueLevel = "warning" | "error";

export type ProviderOutputNormalizerIssue = {
  level: ProviderOutputNormalizerIssueLevel;
  code:
    | "wrapped_payload_unwrapped"
    | "field_alias_normalized"
    | "missing_required_array"
    | "broken_reference"
    | "unknown_skill_or_schema";
  path: string;
  message: string;
};

export type ProviderOutputNormalizerContext = {
  skillId: string;
  outputSchemaId?: AISkillSchemaId | string;
  validStepIds?: string[];
};

export type ProviderOutputNormalizerResult<T = unknown> = {
  normalizedOutput: T;
  warnings: ProviderOutputNormalizerIssue[];
  errors: ProviderOutputNormalizerIssue[];
  changedPaths: string[];
};

type JsonObject = Record<string, unknown>;

const knownOutputSchemas = new Set<string>([
  "DraftProcessTaskRegister",
  "BRDResponse",
  "SRSResponse",
  "UserStorySetResponse",
  "AcceptanceCriteriaResponse",
  "ProductScopeReviewResponse",
  "RequirementQAResponse",
  "AICodingPackResponse",
  "QAFindingSetResponse",
  "QARecommendationResponse",
  "TemplateRecommendationResponse",
  "ArtifactReviewResponse"
]);

const knownSkillIds = new Set<string>([
  "input-brief-to-ptr",
  "file-to-ptr-draft",
  "file-to-draft-ptr",
  "chat-to-ptr-draft",
  "chat-to-draft-ptr",
  "ai-process-qa",
  "ai-process-qa-finding",
  "process-qa-recommendation",
  "process-improvement-recommendation",
  "artifact-review",
  "template-review",
  "ai-template-review",
  "template-recommendation",
  "notes-to-brd",
  "ptr-to-brd",
  "ptr-to-brd-outline",
  "brd-to-srs",
  "notes-to-srs",
  "ptr-to-srs-outline",
  "srs-to-user-stories",
  "brd-to-user-stories",
  "brd-or-notes-to-user-stories",
  "ptr-to-user-stories",
  "user-stories-to-acceptance-criteria",
  "product-scope-review",
  "mvp-slicing",
  "scope-nonscope-definition",
  "requirement-quality-check",
  "ptr-to-ai-coding-pack",
  "user-stories-to-ai-coding-pack"
]);

const aliasFieldsBySchema: Record<string, Record<string, string[]>> = {
  DraftProcessTaskRegister: {
    draftProcessTasks: ["draftTasks", "processTasks", "tasks", "rows"],
    assumptions: ["assumptionList"],
    openQuestions: ["questions", "open_questions", "openQuestionList"],
    sourceSummary: ["summary", "source_summary"],
    qualityIssues: ["issues", "qualityWarnings"]
  },
  QARecommendationResponse: {
    recommendations: ["items", "recommendationItems", "qaRecommendations"]
  },
  QAFindingSetResponse: {
    findings: ["items", "qaFindings"],
    generatedAt: ["createdAt"]
  },
  TemplateRecommendationResponse: {
    recommendations: ["items", "templateRecommendations"],
    qualityScore: ["score", "templateQualityScore"]
  },
  ArtifactReviewResponse: {
    recommendations: ["qaRecommendations"],
    templateRecommendations: ["templateFindings"],
    warnings: ["issues"]
  },
  AICodingPackResponse: {
    files: ["fileList"],
    assumptions: ["assumptionList"],
    openQuestions: ["questions", "open_questions", "openQuestionList"],
    qualityIssues: ["issues", "qualityWarnings"]
  },
  BRDResponse: {
    assumptions: ["assumptionList"],
    openQuestions: ["questions", "open_questions", "openQuestionList"],
    qualityIssues: ["issues", "qualityWarnings"]
  },
  SRSResponse: {
    assumptions: ["assumptionList"],
    openQuestions: ["questions", "open_questions", "openQuestionList"],
    qualityIssues: ["issues", "qualityWarnings"]
  },
  UserStorySetResponse: {
    epics: ["epicList"],
    userStories: ["stories", "items"],
    qualityIssues: ["issues", "qualityWarnings"]
  },
  AcceptanceCriteriaResponse: {
    criteria: ["acceptanceCriteria", "items"],
    qualityIssues: ["issues", "qualityWarnings"]
  },
  ProductScopeReviewResponse: {
    assumptions: ["assumptionList"],
    openQuestions: ["questions", "open_questions", "openQuestionList"],
    qualityIssues: ["issues", "qualityWarnings"]
  },
  RequirementQAResponse: {
    findings: ["items", "qualityFindings"],
    recommendations: ["patchRecommendations"]
  }
};

const requiredArrayFieldsBySchema: Record<string, string[]> = {
  DraftProcessTaskRegister: ["draftProcessTasks", "assumptions", "openQuestions"],
  QARecommendationResponse: ["recommendations"],
  QAFindingSetResponse: ["findings"],
  TemplateRecommendationResponse: ["recommendations"],
  ArtifactReviewResponse: ["recommendations", "templateRecommendations", "warnings"],
  AICodingPackResponse: ["files", "assumptions", "openQuestions"]
};

const referenceArrayFields = new Set(["targetStepIds", "affectedStepIds", "sourceStepIds"]);
const referenceStringFields = new Set(["defaultNextStep", "yesNextStep", "noNextStep"]);

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function addIssue(
  issues: ProviderOutputNormalizerIssue[],
  issue: Omit<ProviderOutputNormalizerIssue, "level"> & {
    level?: ProviderOutputNormalizerIssueLevel;
  }
) {
  issues.push({
    level: issue.level ?? "warning",
    code: issue.code,
    path: issue.path,
    message: issue.message
  });
}

function getSchemaId(context: ProviderOutputNormalizerContext) {
  if (context.outputSchemaId) {
    return context.outputSchemaId;
  }

  return undefined;
}

function unwrapProviderPayload(
  value: unknown,
  warnings: ProviderOutputNormalizerIssue[],
  changedPaths: string[]
) {
  if (!isObject(value)) {
    return value;
  }

  if ("result" in value && value.result !== undefined) {
    addIssue(warnings, {
      code: "wrapped_payload_unwrapped",
      path: "result",
      message: "Provider output was wrapped in result and was unwrapped."
    });
    changedPaths.push("result");
    return value.result;
  }

  if ("data" in value && value.data !== undefined) {
    addIssue(warnings, {
      code: "wrapped_payload_unwrapped",
      path: "data",
      message: "Provider output was wrapped in data and was unwrapped."
    });
    changedPaths.push("data");
    return value.data;
  }

  return value;
}

function normalizeFieldAliases(
  value: unknown,
  schemaId: string | undefined,
  warnings: ProviderOutputNormalizerIssue[],
  changedPaths: string[]
) {
  if (!schemaId || !isObject(value)) {
    return value;
  }

  const aliases = aliasFieldsBySchema[schemaId];
  if (!aliases) {
    return value;
  }

  const normalized: JsonObject = { ...value };

  Object.entries(aliases).forEach(([canonicalField, aliasFields]) => {
    if (normalized[canonicalField] !== undefined) {
      return;
    }

    const aliasField = aliasFields.find((field) => normalized[field] !== undefined);
    if (!aliasField) {
      return;
    }

    normalized[canonicalField] = normalized[aliasField];
    delete normalized[aliasField];
    changedPaths.push(canonicalField);
    addIssue(warnings, {
      code: "field_alias_normalized",
      path: canonicalField,
      message: `Provider field alias ${aliasField} was normalized to ${canonicalField}.`
    });
  });

  return normalized;
}

function collectOutputStepIds(value: unknown) {
  if (!isObject(value) || !Array.isArray(value.draftProcessTasks)) {
    return [];
  }

  return value.draftProcessTasks
    .filter(isObject)
    .map((task) => task.stepId)
    .filter((stepId): stepId is string => typeof stepId === "string" && stepId.length > 0);
}

function getReferenceStepIds(value: unknown, context: ProviderOutputNormalizerContext) {
  const outputStepIds = collectOutputStepIds(value);
  return new Set([...(context.validStepIds ?? []), ...outputStepIds]);
}

function checkRequiredArrays(
  value: unknown,
  schemaId: string | undefined,
  errors: ProviderOutputNormalizerIssue[]
) {
  if (!schemaId || !isObject(value)) {
    return;
  }

  const requiredArrayFields = requiredArrayFieldsBySchema[schemaId] ?? [];
  requiredArrayFields.forEach((field) => {
    if (!Array.isArray(value[field])) {
      addIssue(errors, {
        level: "error",
        code: "missing_required_array",
        path: field,
        message: `${field} must be an array for ${schemaId}.`
      });
    }
  });
}

function checkBrokenReferences(
  value: unknown,
  knownStepIds: Set<string>,
  errors: ProviderOutputNormalizerIssue[],
  path = "$"
) {
  if (knownStepIds.size === 0) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      checkBrokenReferences(item, knownStepIds, errors, `${path}[${index}]`);
    });
    return;
  }

  if (!isObject(value)) {
    return;
  }

  Object.entries(value).forEach(([field, fieldValue]) => {
    const fieldPath = `${path}.${field}`;

    if (referenceStringFields.has(field)) {
      if (
        typeof fieldValue === "string" &&
        fieldValue.trim().length > 0 &&
        !knownStepIds.has(fieldValue)
      ) {
        addIssue(errors, {
          level: "error",
          code: "broken_reference",
          path: fieldPath,
          message: `${field} references unknown stepId ${fieldValue}.`
        });
      }
      return;
    }

    if (referenceArrayFields.has(field)) {
      if (Array.isArray(fieldValue)) {
        fieldValue.forEach((stepId, index) => {
          if (
            typeof stepId === "string" &&
            stepId.trim().length > 0 &&
            !knownStepIds.has(stepId)
          ) {
            addIssue(errors, {
              level: "error",
              code: "broken_reference",
              path: `${fieldPath}[${index}]`,
              message: `${field} contains unknown stepId ${stepId}.`
            });
          }
        });
      }
      return;
    }

    checkBrokenReferences(fieldValue, knownStepIds, errors, fieldPath);
  });
}

export function normalizeProviderOutput<T = unknown>(
  parsedProviderOutput: unknown,
  context: ProviderOutputNormalizerContext
): ProviderOutputNormalizerResult<T> {
  const warnings: ProviderOutputNormalizerIssue[] = [];
  const errors: ProviderOutputNormalizerIssue[] = [];
  const changedPaths: string[] = [];
  const schemaId = getSchemaId(context);

  if (
    !context.skillId ||
    !knownSkillIds.has(context.skillId) ||
    !schemaId ||
    !knownOutputSchemas.has(schemaId)
  ) {
    addIssue(errors, {
      level: "error",
      code: "unknown_skill_or_schema",
      path: "$",
      message:
        "Provider output normalizer requires a known skill id and output schema id."
    });
  }

  const unwrappedOutput = unwrapProviderPayload(
    parsedProviderOutput,
    warnings,
    changedPaths
  );
  const normalizedOutput = normalizeFieldAliases(
    unwrappedOutput,
    schemaId,
    warnings,
    changedPaths
  );

  checkRequiredArrays(normalizedOutput, schemaId, errors);
  checkBrokenReferences(normalizedOutput, getReferenceStepIds(normalizedOutput, context), errors);

  return {
    normalizedOutput: normalizedOutput as T,
    warnings,
    errors,
    changedPaths
  };
}
