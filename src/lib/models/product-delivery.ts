import type { ProcessTask } from "@/lib/models/process-task";

export type ProductDeliveryTraceLink = {
  sourceStepIds: string[];
  targetId?: string;
};

export type ProductScope = {
  id: string;
  title: string;
  inScope: string[];
  outOfScope: string[];
  sourceStepIds: string[];
};

export type Assumption = {
  id: string;
  text: string;
  sourceStepIds?: string[];
};

export type OpenQuestion = {
  id: string;
  question: string;
  sourceStepIds?: string[];
};

export type BRDSection = {
  id: string;
  title: string;
  content: string;
  sourceStepIds?: string[];
};

export type BRD = {
  id: string;
  title: string;
  summary: string;
  sections: BRDSection[];
  scope: ProductScope;
  assumptions: Assumption[];
  openQuestions: OpenQuestion[];
  traceLinks?: ProductDeliveryTraceLink[];
};

export type FunctionalRequirement = {
  id: string;
  title: string;
  description: string;
  sourceStepIds: string[];
};

export type SRS = {
  id: string;
  title: string;
  overview: string;
  functionalRequirements: FunctionalRequirement[];
  nonFunctionalRequirements: string[];
  assumptions: Assumption[];
  openQuestions: OpenQuestion[];
  traceLinks?: ProductDeliveryTraceLink[];
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

export type UserStorySet = {
  id: string;
  title: string;
  stories: UserStory[];
  assumptions: Assumption[];
  openQuestions: OpenQuestion[];
  traceLinks?: ProductDeliveryTraceLink[];
};

export type AcceptanceCriterion = {
  id: string;
  storyId?: string;
  sourceStepIds: string[];
  given: string;
  when: string;
  then: string;
};

export type AcceptanceCriteriaSet = {
  id: string;
  title: string;
  criteria: AcceptanceCriterion[];
  assumptions: Assumption[];
  openQuestions: OpenQuestion[];
};

export type ProductDeliveryDraft = {
  id: string;
  generatedAt: string;
  source: "process-task-register";
  sourceStepIds: string[];
  brd: BRD;
  srs: SRS;
  userStorySet: UserStorySet;
  acceptanceCriteria: AcceptanceCriteriaSet;
  scope: ProductScope;
  assumptions: Assumption[];
  openQuestions: OpenQuestion[];
  brdOutlineMarkdown: string;
  srsOutlineMarkdown: string;
  userStoriesMarkdown: string;
  acceptanceCriteriaMarkdown: string;
  combinedMarkdown: string;
};

export type ProductDeliveryInput = {
  processTasks: ProcessTask[];
  projectContext?: string;
  notes?: string;
  sourceSummary?: string;
  generatedAt: string;
};

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

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function validateString(value: unknown, fieldName: string, errors: string[]) {
  if (!isString(value) || value.trim().length === 0) {
    errors.push(`${fieldName} must be a non-empty string.`);
  }
}

function validateStringArray(
  value: unknown,
  fieldName: string,
  errors: string[],
  requireNonEmpty = false
) {
  if (!Array.isArray(value) || value.some((item) => !isString(item))) {
    errors.push(`${fieldName} must be a string array.`);
    return;
  }

  if (requireNonEmpty && value.length === 0) {
    errors.push(`${fieldName} must contain at least one item.`);
  }
}

function validateAssumptions(value: unknown, errors: string[]) {
  if (!Array.isArray(value)) {
    errors.push("assumptions must be an array.");
    return;
  }

  value.forEach((assumption, index) => {
    if (!isObject(assumption)) {
      errors.push(`assumptions[${index}] must be an object.`);
      return;
    }

    validateString(assumption.id, `assumptions[${index}].id`, errors);
    validateString(assumption.text, `assumptions[${index}].text`, errors);

    if (assumption.sourceStepIds !== undefined) {
      validateStringArray(
        assumption.sourceStepIds,
        `assumptions[${index}].sourceStepIds`,
        errors
      );
    }
  });
}

function validateOpenQuestions(value: unknown, errors: string[]) {
  if (!Array.isArray(value)) {
    errors.push("openQuestions must be an array.");
    return;
  }

  value.forEach((question, index) => {
    if (!isObject(question)) {
      errors.push(`openQuestions[${index}] must be an object.`);
      return;
    }

    validateString(question.id, `openQuestions[${index}].id`, errors);
    validateString(question.question, `openQuestions[${index}].question`, errors);

    if (question.sourceStepIds !== undefined) {
      validateStringArray(
        question.sourceStepIds,
        `openQuestions[${index}].sourceStepIds`,
        errors
      );
    }
  });
}

function validateScope(value: unknown, errors: string[]) {
  if (!isObject(value)) {
    errors.push("scope must be an object.");
    return;
  }

  validateString(value.id, "scope.id", errors);
  validateString(value.title, "scope.title", errors);
  validateStringArray(value.inScope, "scope.inScope", errors, true);
  validateStringArray(value.outOfScope, "scope.outOfScope", errors);
  validateStringArray(value.sourceStepIds, "scope.sourceStepIds", errors);
}

function validateTraceLinks(value: unknown, errors: string[]) {
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

    validateStringArray(
      traceLink.sourceStepIds,
      `traceLinks[${index}].sourceStepIds`,
      errors,
      true
    );

    if (traceLink.targetId !== undefined) {
      validateString(traceLink.targetId, `traceLinks[${index}].targetId`, errors);
    }
  });
}

export function validateBRD(value: unknown): SchemaValidationResult<BRD> {
  const errors: string[] = [];

  if (!isObject(value)) {
    return {
      ok: false,
      errors: ["BRD must be an object."]
    };
  }

  ["id", "title", "summary"].forEach((field) =>
    validateString(value[field], `brd.${field}`, errors)
  );

  if (!Array.isArray(value.sections) || value.sections.length === 0) {
    errors.push("brd.sections must be a non-empty array.");
  } else {
    value.sections.forEach((section, index) => {
      if (!isObject(section)) {
        errors.push(`brd.sections[${index}] must be an object.`);
        return;
      }

      ["id", "title", "content"].forEach((field) =>
        validateString(section[field], `brd.sections[${index}].${field}`, errors)
      );

      if (section.sourceStepIds !== undefined) {
        validateStringArray(
          section.sourceStepIds,
          `brd.sections[${index}].sourceStepIds`,
          errors
        );
      }
    });
  }

  validateScope(value.scope, errors);
  validateAssumptions(value.assumptions, errors);
  validateOpenQuestions(value.openQuestions, errors);
  validateTraceLinks(value.traceLinks, errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: value as BRD,
    errors: []
  };
}

export function validateSRS(value: unknown): SchemaValidationResult<SRS> {
  const errors: string[] = [];

  if (!isObject(value)) {
    return {
      ok: false,
      errors: ["SRS must be an object."]
    };
  }

  ["id", "title", "overview"].forEach((field) =>
    validateString(value[field], `srs.${field}`, errors)
  );

  if (
    !Array.isArray(value.functionalRequirements) ||
    value.functionalRequirements.length === 0
  ) {
    errors.push("srs.functionalRequirements must be a non-empty array.");
  } else {
    value.functionalRequirements.forEach((requirement, index) => {
      if (!isObject(requirement)) {
        errors.push(`srs.functionalRequirements[${index}] must be an object.`);
        return;
      }

      ["id", "title", "description"].forEach((field) =>
        validateString(
          requirement[field],
          `srs.functionalRequirements[${index}].${field}`,
          errors
        )
      );
      validateStringArray(
        requirement.sourceStepIds,
        `srs.functionalRequirements[${index}].sourceStepIds`,
        errors,
        true
      );
    });
  }

  validateStringArray(
    value.nonFunctionalRequirements,
    "srs.nonFunctionalRequirements",
    errors
  );
  validateAssumptions(value.assumptions, errors);
  validateOpenQuestions(value.openQuestions, errors);
  validateTraceLinks(value.traceLinks, errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: value as SRS,
    errors: []
  };
}

export function validateUserStorySet(
  value: unknown
): SchemaValidationResult<UserStorySet> {
  const errors: string[] = [];

  if (!isObject(value)) {
    return {
      ok: false,
      errors: ["UserStorySet must be an object."]
    };
  }

  ["id", "title"].forEach((field) =>
    validateString(value[field], `userStorySet.${field}`, errors)
  );

  if (!Array.isArray(value.stories) || value.stories.length === 0) {
    errors.push("userStorySet.stories must be a non-empty array.");
  } else {
    value.stories.forEach((story, index) => {
      if (!isObject(story)) {
        errors.push(`userStorySet.stories[${index}] must be an object.`);
        return;
      }

      ["id", "title", "persona", "need", "benefit"].forEach((field) =>
        validateString(
          story[field],
          `userStorySet.stories[${index}].${field}`,
          errors
        )
      );
      validateStringArray(
        story.sourceStepIds,
        `userStorySet.stories[${index}].sourceStepIds`,
        errors,
        true
      );

      if (story.acceptanceCriteria !== undefined) {
        validateStringArray(
          story.acceptanceCriteria,
          `userStorySet.stories[${index}].acceptanceCriteria`,
          errors
        );
      }
    });
  }

  validateAssumptions(value.assumptions, errors);
  validateOpenQuestions(value.openQuestions, errors);
  validateTraceLinks(value.traceLinks, errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: value as UserStorySet,
    errors: []
  };
}

export function validateAcceptanceCriteriaSet(
  value: unknown
): SchemaValidationResult<AcceptanceCriteriaSet> {
  const errors: string[] = [];

  if (!isObject(value)) {
    return {
      ok: false,
      errors: ["AcceptanceCriteriaSet must be an object."]
    };
  }

  ["id", "title"].forEach((field) =>
    validateString(value[field], `acceptanceCriteria.${field}`, errors)
  );

  if (!Array.isArray(value.criteria) || value.criteria.length === 0) {
    errors.push("acceptanceCriteria.criteria must be a non-empty array.");
  } else {
    value.criteria.forEach((criterion, index) => {
      if (!isObject(criterion)) {
        errors.push(`acceptanceCriteria.criteria[${index}] must be an object.`);
        return;
      }

      ["id", "given", "when", "then"].forEach((field) =>
        validateString(
          criterion[field],
          `acceptanceCriteria.criteria[${index}].${field}`,
          errors
        )
      );
      validateStringArray(
        criterion.sourceStepIds,
        `acceptanceCriteria.criteria[${index}].sourceStepIds`,
        errors,
        true
      );

      if (criterion.storyId !== undefined) {
        validateString(
          criterion.storyId,
          `acceptanceCriteria.criteria[${index}].storyId`,
          errors
        );
      }
    });
  }

  validateAssumptions(value.assumptions, errors);
  validateOpenQuestions(value.openQuestions, errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: value as AcceptanceCriteriaSet,
    errors: []
  };
}

export function validateProductDeliveryDraft(
  value: unknown
): SchemaValidationResult<ProductDeliveryDraft> {
  const errors: string[] = [];

  if (!isObject(value)) {
    return {
      ok: false,
      errors: ["ProductDeliveryDraft must be an object."]
    };
  }

  ["id", "generatedAt", "source"].forEach((field) =>
    validateString(value[field], `productDeliveryDraft.${field}`, errors)
  );
  validateStringArray(
    value.sourceStepIds,
    "productDeliveryDraft.sourceStepIds",
    errors,
    true
  );
  validateScope(value.scope, errors);
  validateAssumptions(value.assumptions, errors);
  validateOpenQuestions(value.openQuestions, errors);

  const brdValidation = validateBRD(value.brd);
  const srsValidation = validateSRS(value.srs);
  const storyValidation = validateUserStorySet(value.userStorySet);
  const criteriaValidation = validateAcceptanceCriteriaSet(
    value.acceptanceCriteria
  );

  if (!brdValidation.ok) {
    errors.push(...brdValidation.errors);
  }
  if (!srsValidation.ok) {
    errors.push(...srsValidation.errors);
  }
  if (!storyValidation.ok) {
    errors.push(...storyValidation.errors);
  }
  if (!criteriaValidation.ok) {
    errors.push(...criteriaValidation.errors);
  }

  [
    "brdOutlineMarkdown",
    "srsOutlineMarkdown",
    "userStoriesMarkdown",
    "acceptanceCriteriaMarkdown",
    "combinedMarkdown"
  ].forEach((field) =>
    validateString(value[field], `productDeliveryDraft.${field}`, errors)
  );

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: value as ProductDeliveryDraft,
    errors: []
  };
}
