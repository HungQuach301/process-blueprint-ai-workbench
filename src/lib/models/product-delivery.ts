import type { ProcessTask } from "@/lib/models/process-task";

export type ProductDeliveryTraceLink = {
  sourceStepIds: string[];
  targetId?: string;
};

export type ProductDeliveryQualityIssueCode =
  | "missing-objective"
  | "missing-scope"
  | "vague-requirement"
  | "missing-stakeholder"
  | "requirement-not-testable"
  | "missing-actor-system"
  | "missing-nfr"
  | "unclear-dependency";

export type ProductDeliveryQualityIssue = {
  code: ProductDeliveryQualityIssueCode;
  severity: "error" | "warning";
  message: string;
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

export type BusinessRequirement = {
  id: string;
  title: string;
  description: string;
  priority: "must" | "should" | "could";
  sourceStepIds?: string[];
};

export type ProcessReference = {
  stepId: string;
  taskName: string;
  phase?: string;
};

export type RiskDependency = {
  id: string;
  type: "risk" | "dependency";
  description: string;
  sourceStepIds?: string[];
};

export type BRD = {
  id: string;
  title: string;
  summary: string;
  businessObjective: string;
  backgroundContext: string;
  sections: BRDSection[];
  scope: ProductScope;
  stakeholders: string[];
  businessRequirements: BusinessRequirement[];
  processReferences: ProcessReference[];
  risksDependencies: RiskDependency[];
  assumptions: Assumption[];
  openQuestions: OpenQuestion[];
  qualityIssues: ProductDeliveryQualityIssue[];
  traceLinks?: ProductDeliveryTraceLink[];
};

export type FunctionalRequirement = {
  id: string;
  title: string;
  description: string;
  sourceStepIds?: string[];
  sourceRequirementIds?: string[];
  actorRoleIds?: string[];
  systemComponentIds?: string[];
  dataRequirementIds?: string[];
};

export type NonFunctionalRequirement = {
  id: string;
  category:
    | "security"
    | "performance"
    | "audit"
    | "usability"
    | "reliability"
    | "compliance"
    | "other";
  description: string;
  sourceStepIds?: string[];
  sourceRequirementIds?: string[];
};

export type ActorRole = {
  id: string;
  name: string;
  responsibilities: string[];
  sourceStepIds?: string[];
  sourceRequirementIds?: string[];
};

export type SystemComponent = {
  id: string;
  name: string;
  description: string;
  sourceStepIds?: string[];
  sourceRequirementIds?: string[];
};

export type DataRequirement = {
  id: string;
  name: string;
  description: string;
  sourceStepIds?: string[];
  sourceRequirementIds?: string[];
};

export type InterfaceIntegrationRequirement = {
  id: string;
  name: string;
  description: string;
  systems?: string[];
  sourceStepIds?: string[];
  sourceRequirementIds?: string[];
};

export type SRSConstraint = {
  id: string;
  description: string;
  sourceStepIds?: string[];
  sourceRequirementIds?: string[];
};

export type SRS = {
  id: string;
  title: string;
  overview: string;
  actorsRoles: ActorRole[];
  systemsComponents: SystemComponent[];
  functionalRequirements: FunctionalRequirement[];
  nonFunctionalRequirements: NonFunctionalRequirement[];
  dataRequirements: DataRequirement[];
  interfaceIntegrationRequirements: InterfaceIntegrationRequirement[];
  constraints: SRSConstraint[];
  assumptions: Assumption[];
  openQuestions: OpenQuestion[];
  qualityIssues: ProductDeliveryQualityIssue[];
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
  uploadedFileText?: string;
  generatedAt: string;
};

export type BRDGenerationInput = {
  processTasks?: ProcessTask[];
  projectContext?: string;
  notes?: string;
  sourceSummary?: string;
  uploadedFileText?: string;
  generatedAt: string;
  source: "process-task-register" | "notes-chat";
};

export type SRSGenerationInput = {
  brd?: BRD;
  processTasks?: ProcessTask[];
  projectContext?: string;
  notes?: string;
  sourceSummary?: string;
  uploadedFileText?: string;
  generatedAt: string;
  source: "brd-draft" | "notes-chat";
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

function validateOptionalStringArray(
  value: unknown,
  fieldName: string,
  errors: string[]
) {
  if (value !== undefined) {
    validateStringArray(value, fieldName, errors);
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

function validateQualityIssues(value: unknown, errors: string[]) {
  const validCodes = new Set<ProductDeliveryQualityIssueCode>([
    "missing-objective",
    "missing-scope",
    "vague-requirement",
    "missing-stakeholder",
    "requirement-not-testable",
    "missing-actor-system",
    "missing-nfr",
    "unclear-dependency"
  ]);
  const validSeverities = new Set(["error", "warning"]);

  if (!Array.isArray(value)) {
    errors.push("brd.qualityIssues must be an array.");
    return;
  }

  value.forEach((issue, index) => {
    if (!isObject(issue)) {
      errors.push(`brd.qualityIssues[${index}] must be an object.`);
      return;
    }

    if (!isString(issue.code) || !validCodes.has(issue.code as ProductDeliveryQualityIssueCode)) {
      errors.push(`brd.qualityIssues[${index}].code must be a valid quality issue code.`);
    }
    if (!isString(issue.severity) || !validSeverities.has(issue.severity)) {
      errors.push(`brd.qualityIssues[${index}].severity must be error or warning.`);
    }
    validateString(issue.message, `brd.qualityIssues[${index}].message`, errors);

    if (issue.targetId !== undefined) {
      validateString(issue.targetId, `brd.qualityIssues[${index}].targetId`, errors);
    }
  });
}

export function runSRSQualityGate(srs: SRS) {
  const issues: ProductDeliveryQualityIssue[] = [...srs.qualityIssues];
  const testableWords = [
    "must",
    "shall",
    "should",
    "allow",
    "support",
    "provide",
    "validate",
    "generate",
    "record",
    "display",
    "export"
  ];
  const unclearWords = ["to be confirmed", "tbd", "n/a", "unknown", "unclear"];

  if (srs.nonFunctionalRequirements.length === 0) {
    issues.push({
      code: "missing-nfr",
      severity: "warning",
      message: "SRS should include at least one non-functional requirement."
    });
  }

  srs.functionalRequirements.forEach((requirement) => {
    const description = requirement.description.trim().toLowerCase();
    const hasTestableVerb = testableWords.some((word) =>
      description.includes(word)
    );

    if (description.length < 24 || !hasTestableVerb) {
      issues.push({
        code: "requirement-not-testable",
        severity: "warning",
        message: `Functional requirement ${requirement.id} may not be testable enough.`,
        targetId: requirement.id
      });
    }

    if (
      (requirement.actorRoleIds ?? []).length === 0 &&
      (requirement.systemComponentIds ?? []).length === 0
    ) {
      issues.push({
        code: "missing-actor-system",
        severity: "warning",
        message: `Functional requirement ${requirement.id} should reference an actor/role or system/component.`,
        targetId: requirement.id
      });
    }
  });

  [...srs.interfaceIntegrationRequirements, ...srs.constraints].forEach((item) => {
    const description = item.description.toLowerCase();

    if (unclearWords.some((word) => description.includes(word))) {
      issues.push({
        code: "unclear-dependency",
        severity: "warning",
        message: `${item.id} includes an unclear dependency or constraint.`,
        targetId: item.id
      });
    }
  });

  const dedupedIssues = Array.from(
    new Map(
      issues.map((issue) => [
        `${issue.code}:${issue.targetId ?? ""}:${issue.message}`,
        issue
      ])
    ).values()
  );

  return {
    canPreview: !dedupedIssues.some((issue) => issue.severity === "error"),
    issues: dedupedIssues
  };
}

export function runBRDQualityGate(brd: BRD) {
  const issues: ProductDeliveryQualityIssue[] = [...brd.qualityIssues];
  const hasObjective = brd.businessObjective.trim().length > 0;
  const hasScope =
    brd.scope.inScope.some((item) => item.trim().length > 0) ||
    brd.scope.outOfScope.some((item) => item.trim().length > 0);
  const hasStakeholder = brd.stakeholders.some((item) => item.trim().length > 0);
  const vagueWords = ["to be confirmed", "tbd", "n/a", "unknown"];

  if (!hasObjective) {
    issues.push({
      code: "missing-objective",
      severity: "error",
      message: "BRD must include a business objective."
    });
  }

  if (!hasScope) {
    issues.push({
      code: "missing-scope",
      severity: "error",
      message: "BRD must include at least one scope or out-of-scope item."
    });
  }

  if (!hasStakeholder) {
    issues.push({
      code: "missing-stakeholder",
      severity: "warning",
      message: "BRD should identify at least one stakeholder."
    });
  }

  brd.businessRequirements.forEach((requirement) => {
    const description = requirement.description.trim().toLowerCase();

    if (
      description.length < 24 ||
      vagueWords.some((word) => description.includes(word))
    ) {
      issues.push({
        code: "vague-requirement",
        severity: "warning",
        message: `Business requirement ${requirement.id} is vague and needs review.`,
        targetId: requirement.id
      });
    }
  });

  const dedupedIssues = Array.from(
    new Map(
      issues.map((issue) => [
        `${issue.code}:${issue.targetId ?? ""}:${issue.message}`,
        issue
      ])
    ).values()
  );

  return {
    canPreview: !dedupedIssues.some((issue) => issue.severity === "error"),
    issues: dedupedIssues
  };
}

export function validateBRD(value: unknown): SchemaValidationResult<BRD> {
  const errors: string[] = [];

  if (!isObject(value)) {
    return {
      ok: false,
      errors: ["BRD must be an object."]
    };
  }

  ["id", "title", "summary", "backgroundContext"].forEach((field) =>
    validateString(value[field], `brd.${field}`, errors)
  );
  if (!isString(value.businessObjective)) {
    errors.push("brd.businessObjective must be a string.");
  }

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
  validateStringArray(value.stakeholders, "brd.stakeholders", errors);

  if (
    !Array.isArray(value.businessRequirements) ||
    value.businessRequirements.length === 0
  ) {
    errors.push("brd.businessRequirements must be a non-empty array.");
  } else {
    value.businessRequirements.forEach((requirement, index) => {
      if (!isObject(requirement)) {
        errors.push(`brd.businessRequirements[${index}] must be an object.`);
        return;
      }

      ["id", "title", "description", "priority"].forEach((field) =>
        validateString(
          requirement[field],
          `brd.businessRequirements[${index}].${field}`,
          errors
        )
      );

      if (
        isString(requirement.priority) &&
        !["must", "should", "could"].includes(requirement.priority)
      ) {
        errors.push(
          `brd.businessRequirements[${index}].priority must be must, should, or could.`
        );
      }

      if (requirement.sourceStepIds !== undefined) {
        validateStringArray(
          requirement.sourceStepIds,
          `brd.businessRequirements[${index}].sourceStepIds`,
          errors
        );
      }
    });
  }

  if (!Array.isArray(value.processReferences)) {
    errors.push("brd.processReferences must be an array.");
  } else {
    value.processReferences.forEach((reference, index) => {
      if (!isObject(reference)) {
        errors.push(`brd.processReferences[${index}] must be an object.`);
        return;
      }

      validateString(reference.stepId, `brd.processReferences[${index}].stepId`, errors);
      validateString(
        reference.taskName,
        `brd.processReferences[${index}].taskName`,
        errors
      );

      if (reference.phase !== undefined) {
        validateString(reference.phase, `brd.processReferences[${index}].phase`, errors);
      }
    });
  }

  if (!Array.isArray(value.risksDependencies)) {
    errors.push("brd.risksDependencies must be an array.");
  } else {
    value.risksDependencies.forEach((item, index) => {
      if (!isObject(item)) {
        errors.push(`brd.risksDependencies[${index}] must be an object.`);
        return;
      }

      validateString(item.id, `brd.risksDependencies[${index}].id`, errors);
      validateString(item.type, `brd.risksDependencies[${index}].type`, errors);
      validateString(
        item.description,
        `brd.risksDependencies[${index}].description`,
        errors
      );

      if (isString(item.type) && !["risk", "dependency"].includes(item.type)) {
        errors.push(`brd.risksDependencies[${index}].type must be risk or dependency.`);
      }

      if (item.sourceStepIds !== undefined) {
        validateStringArray(
          item.sourceStepIds,
          `brd.risksDependencies[${index}].sourceStepIds`,
          errors
        );
      }
    });
  }

  validateAssumptions(value.assumptions, errors);
  validateOpenQuestions(value.openQuestions, errors);
  validateQualityIssues(value.qualityIssues, errors);
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

  if (!Array.isArray(value.actorsRoles)) {
    errors.push("srs.actorsRoles must be an array.");
  } else {
    value.actorsRoles.forEach((role, index) => {
      if (!isObject(role)) {
        errors.push(`srs.actorsRoles[${index}] must be an object.`);
        return;
      }

      validateString(role.id, `srs.actorsRoles[${index}].id`, errors);
      validateString(role.name, `srs.actorsRoles[${index}].name`, errors);
      validateStringArray(
        role.responsibilities,
        `srs.actorsRoles[${index}].responsibilities`,
        errors
      );
      validateOptionalStringArray(
        role.sourceStepIds,
        `srs.actorsRoles[${index}].sourceStepIds`,
        errors
      );
      validateOptionalStringArray(
        role.sourceRequirementIds,
        `srs.actorsRoles[${index}].sourceRequirementIds`,
        errors
      );
    });
  }

  if (!Array.isArray(value.systemsComponents)) {
    errors.push("srs.systemsComponents must be an array.");
  } else {
    value.systemsComponents.forEach((component, index) => {
      if (!isObject(component)) {
        errors.push(`srs.systemsComponents[${index}] must be an object.`);
        return;
      }

      validateString(component.id, `srs.systemsComponents[${index}].id`, errors);
      validateString(component.name, `srs.systemsComponents[${index}].name`, errors);
      validateString(
        component.description,
        `srs.systemsComponents[${index}].description`,
        errors
      );
      validateOptionalStringArray(
        component.sourceStepIds,
        `srs.systemsComponents[${index}].sourceStepIds`,
        errors
      );
      validateOptionalStringArray(
        component.sourceRequirementIds,
        `srs.systemsComponents[${index}].sourceRequirementIds`,
        errors
      );
    });
  }

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
      validateOptionalStringArray(
        requirement.sourceStepIds,
        `srs.functionalRequirements[${index}].sourceStepIds`,
        errors
      );
      validateOptionalStringArray(
        requirement.sourceRequirementIds,
        `srs.functionalRequirements[${index}].sourceRequirementIds`,
        errors
      );
      validateOptionalStringArray(
        requirement.actorRoleIds,
        `srs.functionalRequirements[${index}].actorRoleIds`,
        errors
      );
      validateOptionalStringArray(
        requirement.systemComponentIds,
        `srs.functionalRequirements[${index}].systemComponentIds`,
        errors
      );
      validateOptionalStringArray(
        requirement.dataRequirementIds,
        `srs.functionalRequirements[${index}].dataRequirementIds`,
        errors
      );
    });
  }

  if (!Array.isArray(value.nonFunctionalRequirements)) {
    errors.push("srs.nonFunctionalRequirements must be an array.");
  } else {
    value.nonFunctionalRequirements.forEach((requirement, index) => {
      if (!isObject(requirement)) {
        errors.push(`srs.nonFunctionalRequirements[${index}] must be an object.`);
        return;
      }

      validateString(requirement.id, `srs.nonFunctionalRequirements[${index}].id`, errors);
      validateString(
        requirement.category,
        `srs.nonFunctionalRequirements[${index}].category`,
        errors
      );
      validateString(
        requirement.description,
        `srs.nonFunctionalRequirements[${index}].description`,
        errors
      );

      if (
        isString(requirement.category) &&
        ![
          "security",
          "performance",
          "audit",
          "usability",
          "reliability",
          "compliance",
          "other"
        ].includes(requirement.category)
      ) {
        errors.push(
          `srs.nonFunctionalRequirements[${index}].category must be a valid category.`
        );
      }

      validateOptionalStringArray(
        requirement.sourceStepIds,
        `srs.nonFunctionalRequirements[${index}].sourceStepIds`,
        errors
      );
      validateOptionalStringArray(
        requirement.sourceRequirementIds,
        `srs.nonFunctionalRequirements[${index}].sourceRequirementIds`,
        errors
      );
    });
  }

  if (!Array.isArray(value.dataRequirements)) {
    errors.push("srs.dataRequirements must be an array.");
  } else {
    value.dataRequirements.forEach((requirement, index) => {
      if (!isObject(requirement)) {
        errors.push(`srs.dataRequirements[${index}] must be an object.`);
        return;
      }

      ["id", "name", "description"].forEach((field) =>
        validateString(
          requirement[field],
          `srs.dataRequirements[${index}].${field}`,
          errors
        )
      );
      validateOptionalStringArray(
        requirement.sourceStepIds,
        `srs.dataRequirements[${index}].sourceStepIds`,
        errors
      );
      validateOptionalStringArray(
        requirement.sourceRequirementIds,
        `srs.dataRequirements[${index}].sourceRequirementIds`,
        errors
      );
    });
  }

  if (!Array.isArray(value.interfaceIntegrationRequirements)) {
    errors.push("srs.interfaceIntegrationRequirements must be an array.");
  } else {
    value.interfaceIntegrationRequirements.forEach((requirement, index) => {
      if (!isObject(requirement)) {
        errors.push(`srs.interfaceIntegrationRequirements[${index}] must be an object.`);
        return;
      }

      ["id", "name", "description"].forEach((field) =>
        validateString(
          requirement[field],
          `srs.interfaceIntegrationRequirements[${index}].${field}`,
          errors
        )
      );
      validateOptionalStringArray(
        requirement.systems,
        `srs.interfaceIntegrationRequirements[${index}].systems`,
        errors
      );
      validateOptionalStringArray(
        requirement.sourceStepIds,
        `srs.interfaceIntegrationRequirements[${index}].sourceStepIds`,
        errors
      );
      validateOptionalStringArray(
        requirement.sourceRequirementIds,
        `srs.interfaceIntegrationRequirements[${index}].sourceRequirementIds`,
        errors
      );
    });
  }

  if (!Array.isArray(value.constraints)) {
    errors.push("srs.constraints must be an array.");
  } else {
    value.constraints.forEach((constraint, index) => {
      if (!isObject(constraint)) {
        errors.push(`srs.constraints[${index}] must be an object.`);
        return;
      }

      validateString(constraint.id, `srs.constraints[${index}].id`, errors);
      validateString(
        constraint.description,
        `srs.constraints[${index}].description`,
        errors
      );
      validateOptionalStringArray(
        constraint.sourceStepIds,
        `srs.constraints[${index}].sourceStepIds`,
        errors
      );
      validateOptionalStringArray(
        constraint.sourceRequirementIds,
        `srs.constraints[${index}].sourceRequirementIds`,
        errors
      );
    });
  }
  validateAssumptions(value.assumptions, errors);
  validateOpenQuestions(value.openQuestions, errors);
  validateQualityIssues(value.qualityIssues, errors);
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
