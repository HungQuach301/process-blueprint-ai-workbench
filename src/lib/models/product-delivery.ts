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
  | "unclear-dependency"
  | "missing-role"
  | "missing-value"
  | "missing-ac"
  | "ac-not-testable"
  | "story-too-broad"
  | "no-source-trace"
  | "missing-mvp-slice"
  | "missing-risk"
  | "missing-constraints"
  | "missing-test-plan"
  | "missing-non-goals"
  | "brd-requirement-not-covered"
  | "srs-requirement-not-covered";

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
  role: string;
  goal: string;
  businessValue: string;
  persona: string;
  need: string;
  benefit: string;
  sourceStepIds?: string[];
  sourceRequirementIds?: string[];
  epicId?: string;
  dependencies?: string[];
  priority?: "must" | "should" | "could";
  complexity?: "low" | "medium" | "high";
  acceptanceCriteria?: string[];
};

export type Epic = {
  id: string;
  title: string;
  description: string;
  sourceStepIds?: string[];
  sourceRequirementIds?: string[];
};

export type UserStorySet = {
  id: string;
  title: string;
  epics: Epic[];
  stories: UserStory[];
  assumptions: Assumption[];
  openQuestions: OpenQuestion[];
  qualityIssues: ProductDeliveryQualityIssue[];
  traceLinks?: ProductDeliveryTraceLink[];
};

export type AcceptanceCriterion = {
  id: string;
  storyId?: string;
  sourceStepIds?: string[];
  sourceRequirementIds?: string[];
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
  qualityIssues: ProductDeliveryQualityIssue[];
};

export type ProductScopeReviewItem = {
  id: string;
  title: string;
  description: string;
  sourceStepIds?: string[];
  sourceRequirementIds?: string[];
  sourceStoryIds?: string[];
};

export type ProductDeliverySlice = {
  id: string;
  title: string;
  summary: string;
  items: ProductScopeReviewItem[];
};

export type ProductScopeReview = {
  id: string;
  title: string;
  inScope: ProductScopeReviewItem[];
  outOfScope: ProductScopeReviewItem[];
  assumptions: Assumption[];
  openQuestions: OpenQuestion[];
  mvpSlice: ProductDeliverySlice;
  laterPhases: ProductDeliverySlice[];
  dependencies: ProductScopeReviewItem[];
  risks: ProductScopeReviewItem[];
  qualityIssues: ProductDeliveryQualityIssue[];
  traceLinks?: ProductDeliveryTraceLink[];
};

export type RequirementQAArtifactType =
  | "brd"
  | "srs"
  | "user-story"
  | "acceptance-criteria"
  | "ai-coding-pack"
  | "trace-coverage";

export type RequirementQADraftPatch = {
  targetArtifactType: RequirementQAArtifactType;
  targetId?: string;
  fieldPath: string;
  suggestedValue: string;
  rationale: string;
};

export type RequirementQARecommendation = {
  id: string;
  title: string;
  description: string;
  artifactType: RequirementQAArtifactType;
  targetId?: string;
  confidence: "low" | "medium" | "high";
  riskLevel: "low" | "medium" | "high";
  draftPatch?: RequirementQADraftPatch;
  sourceRequirementIds?: string[];
  sourceStoryIds?: string[];
  sourceStepIds?: string[];
};

export type RequirementQAFinding = {
  id: string;
  artifactType: RequirementQAArtifactType;
  code: ProductDeliveryQualityIssueCode;
  severity: "error" | "warning";
  title: string;
  message: string;
  targetId?: string;
  sourceRequirementIds?: string[];
  sourceStoryIds?: string[];
  sourceStepIds?: string[];
  recommendationId?: string;
};

export type RequirementQACoverageSummary = {
  brdRequirementCount: number;
  brdCoveredBySrsCount: number;
  uncoveredBrdRequirementIds: string[];
  srsRequirementCount: number;
  srsCoveredByStoriesCount: number;
  uncoveredSrsRequirementIds: string[];
  userStoryCount: number;
  storiesWithAcceptanceCriteriaCount: number;
  storiesWithoutAcceptanceCriteriaIds: string[];
};

export type RequirementQAResponse = {
  id: string;
  generatedAt: string;
  findings: RequirementQAFinding[];
  recommendations: RequirementQARecommendation[];
  coverage: RequirementQACoverageSummary;
  assumptions: string[];
  openQuestions: string[];
  warnings: string[];
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

export type UserStoryGenerationInput = {
  srs?: SRS;
  brd?: BRD;
  processTasks?: ProcessTask[];
  projectContext?: string;
  notes?: string;
  sourceSummary?: string;
  uploadedFileText?: string;
  generatedAt: string;
  source: "srs-draft" | "brd-draft" | "notes-chat";
};

export type AcceptanceCriteriaGenerationInput = {
  userStorySet?: UserStorySet;
  processTasks?: ProcessTask[];
  projectContext?: string;
  notes?: string;
  sourceSummary?: string;
  uploadedFileText?: string;
  generatedAt: string;
};

export type ProductScopeReviewInput = {
  brd?: BRD;
  srs?: SRS;
  userStorySet?: UserStorySet;
  processTasks?: ProcessTask[];
  projectContext?: string;
  notes?: string;
  sourceSummary?: string;
  uploadedFileText?: string;
  businessObjective?: string;
  generatedAt: string;
};

export type RequirementQualityCheckInput = {
  brd?: BRD;
  srs?: SRS;
  userStorySet?: UserStorySet;
  acceptanceCriteria?: AcceptanceCriteriaSet;
  aiCodingPack?: {
    files?: Array<{
      path: string;
      content: string;
    }>;
    qualityIssues?: string[];
  };
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
    "unclear-dependency",
    "missing-role",
    "missing-value",
    "missing-ac",
    "ac-not-testable",
    "story-too-broad",
    "no-source-trace",
    "missing-mvp-slice",
    "missing-risk",
    "missing-constraints",
    "missing-test-plan",
    "missing-non-goals",
    "brd-requirement-not-covered",
    "srs-requirement-not-covered"
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

export function runUserStoryQualityGate(userStorySet: UserStorySet) {
  const issues: ProductDeliveryQualityIssue[] = [...userStorySet.qualityIssues];

  userStorySet.stories.forEach((story) => {
    if (!story.role.trim() || story.role.toLowerCase() === "process user") {
      issues.push({
        code: "missing-role",
        severity: "warning",
        message: `User story ${story.id} should identify a specific role.`,
        targetId: story.id
      });
    }

    if (!story.businessValue.trim()) {
      issues.push({
        code: "missing-value",
        severity: "warning",
        message: `User story ${story.id} should include business value.`,
        targetId: story.id
      });
    }

    if ((story.acceptanceCriteria ?? []).length === 0) {
      issues.push({
        code: "missing-ac",
        severity: "warning",
        message: `User story ${story.id} should include acceptance criteria.`,
        targetId: story.id
      });
    }

    if ((story.sourceStepIds ?? []).length === 0 && (story.sourceRequirementIds ?? []).length === 0) {
      issues.push({
        code: "no-source-trace",
        severity: "warning",
        message: `User story ${story.id} should trace to PTR step ids or requirement ids.`,
        targetId: story.id
      });
    }

    if (
      story.goal.length > 160 ||
      /\band\b|\bthen\b|;/.test(story.goal.toLowerCase())
    ) {
      issues.push({
        code: "story-too-broad",
        severity: "warning",
        message: `User story ${story.id} may be too broad and should be split.`,
        targetId: story.id
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

export function runAcceptanceCriteriaQualityGate(
  criteriaSet: AcceptanceCriteriaSet
) {
  const issues: ProductDeliveryQualityIssue[] = [...criteriaSet.qualityIssues];
  const testableWords = [
    "is",
    "are",
    "must",
    "should",
    "display",
    "record",
    "create",
    "update",
    "reject",
    "approve",
    "export",
    "validate"
  ];

  if (criteriaSet.criteria.length === 0) {
    issues.push({
      code: "missing-ac",
      severity: "warning",
      message: "Acceptance Criteria Set should contain at least one criterion."
    });
  }

  criteriaSet.criteria.forEach((criterion) => {
    const statement = [
      criterion.given,
      criterion.when,
      criterion.then
    ].join(" ").toLowerCase();

    if (
      criterion.given.trim().length < 6 ||
      criterion.when.trim().length < 6 ||
      criterion.then.trim().length < 6 ||
      !testableWords.some((word) => statement.includes(word))
    ) {
      issues.push({
        code: "ac-not-testable",
        severity: "warning",
        message: `Acceptance criterion ${criterion.id} may not be testable enough.`,
        targetId: criterion.id
      });
    }

    if ((criterion.sourceStepIds ?? []).length === 0 && (criterion.sourceRequirementIds ?? []).length === 0) {
      issues.push({
        code: "no-source-trace",
        severity: "warning",
        message: `Acceptance criterion ${criterion.id} should trace to a source step or requirement.`,
        targetId: criterion.id
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

export function runProductScopeReviewQualityGate(
  scopeReview: ProductScopeReview
) {
  const issues: ProductDeliveryQualityIssue[] = [...scopeReview.qualityIssues];

  if (scopeReview.inScope.length === 0) {
    issues.push({
      code: "missing-scope",
      severity: "error",
      message: "Product scope review must include at least one in-scope item.",
      targetId: scopeReview.id
    });
  }

  if (scopeReview.outOfScope.length === 0) {
    issues.push({
      code: "missing-scope",
      severity: "warning",
      message: "Product scope review should include explicit out-of-scope items.",
      targetId: scopeReview.id
    });
  }

  if (scopeReview.mvpSlice.items.length === 0) {
    issues.push({
      code: "missing-mvp-slice",
      severity: "error",
      message: "MVP slicing must include at least one MVP item.",
      targetId: scopeReview.mvpSlice.id
    });
  }

  if (scopeReview.risks.length === 0) {
    issues.push({
      code: "missing-risk",
      severity: "warning",
      message: "Product scope review should include delivery risks.",
      targetId: scopeReview.id
    });
  }

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

function makeRequirementQARecommendation({
  id,
  artifactType,
  targetId,
  title,
  description,
  fieldPath,
  suggestedValue,
  sourceRequirementIds,
  sourceStoryIds,
  sourceStepIds
}: {
  id: string;
  artifactType: RequirementQAArtifactType;
  targetId?: string;
  title: string;
  description: string;
  fieldPath: string;
  suggestedValue: string;
  sourceRequirementIds?: string[];
  sourceStoryIds?: string[];
  sourceStepIds?: string[];
}): RequirementQARecommendation {
  return {
    id,
    title,
    description,
    artifactType,
    targetId,
    confidence: "medium",
    riskLevel: "low",
    draftPatch: {
      targetArtifactType: artifactType,
      targetId,
      fieldPath,
      suggestedValue,
      rationale: description
    },
    sourceRequirementIds,
    sourceStoryIds,
    sourceStepIds
  };
}

function makeRequirementQAFinding({
  id,
  artifactType,
  code,
  severity,
  title,
  message,
  targetId,
  recommendationId,
  sourceRequirementIds,
  sourceStoryIds,
  sourceStepIds
}: Omit<RequirementQAFinding, "severity"> & {
  severity: "error" | "warning";
}): RequirementQAFinding {
  return {
    id,
    artifactType,
    code,
    severity,
    title,
    message,
    targetId,
    recommendationId,
    sourceRequirementIds,
    sourceStoryIds,
    sourceStepIds
  };
}

function getAICodingPackFileContent(
  input: RequirementQualityCheckInput,
  path: string
) {
  return (
    input.aiCodingPack?.files?.find(
      (file) => file.path.toLowerCase() === path.toLowerCase()
    )?.content ?? ""
  );
}

function dedupeRequirementQAResponse(response: RequirementQAResponse) {
  return {
    ...response,
    findings: Array.from(
      new Map(
        response.findings.map((finding) => [
          `${finding.artifactType}:${finding.code}:${finding.targetId ?? ""}:${finding.message}`,
          finding
        ])
      ).values()
    ),
    recommendations: Array.from(
      new Map(
        response.recommendations.map((recommendation) => [
          recommendation.id,
          recommendation
        ])
      ).values()
    )
  };
}

export function runRequirementQualityCheck(
  input: RequirementQualityCheckInput
): RequirementQAResponse {
  const findings: RequirementQAFinding[] = [];
  const recommendations: RequirementQARecommendation[] = [];
  const generatedAt = input.generatedAt || new Date().toISOString();

  function addIssue(
    artifactType: RequirementQAArtifactType,
    issue: ProductDeliveryQualityIssue,
    title: string,
    fieldPath: string,
    suggestedValue: string,
    refs: {
      sourceRequirementIds?: string[];
      sourceStoryIds?: string[];
      sourceStepIds?: string[];
    } = {}
  ) {
    const sequence = findings.length + 1;
    const recommendationId = `req-rec-${sequence.toString().padStart(3, "0")}`;

    recommendations.push(
      makeRequirementQARecommendation({
        id: recommendationId,
        artifactType,
        targetId: issue.targetId,
        title,
        description: issue.message,
        fieldPath,
        suggestedValue,
        ...refs
      })
    );
    findings.push(
      makeRequirementQAFinding({
        id: `req-finding-${sequence.toString().padStart(3, "0")}`,
        artifactType,
        code: issue.code,
        severity: issue.severity,
        title,
        message: issue.message,
        targetId: issue.targetId,
        recommendationId,
        ...refs
      })
    );
  }

  if (input.brd) {
    runBRDQualityGate(input.brd).issues.forEach((issue) =>
      addIssue(
        "brd",
        issue,
        "Review BRD requirement quality",
        issue.targetId ? `businessRequirements.${issue.targetId}` : "brd",
        "Clarify objective, scope, stakeholder, or requirement wording before export."
      )
    );
  }

  if (input.srs) {
    runSRSQualityGate(input.srs).issues.forEach((issue) =>
      addIssue(
        "srs",
        issue,
        "Review SRS requirement quality",
        issue.targetId ? `requirements.${issue.targetId}` : "srs",
        "Make requirement testable and connect it to actor, system, NFR, or dependency context."
      )
    );
  }

  if (input.userStorySet) {
    runUserStoryQualityGate(input.userStorySet).issues.forEach((issue) =>
      addIssue(
        "user-story",
        issue,
        "Review user story quality",
        issue.targetId ? `stories.${issue.targetId}` : "userStorySet",
        "Clarify role, value, acceptance criteria, scope, or trace references.",
        {
          sourceStoryIds: issue.targetId ? [issue.targetId] : undefined
        }
      )
    );
  }

  if (input.acceptanceCriteria) {
    runAcceptanceCriteriaQualityGate(input.acceptanceCriteria).issues.forEach(
      (issue) =>
        addIssue(
          "acceptance-criteria",
          issue,
          "Review acceptance criteria quality",
          issue.targetId ? `criteria.${issue.targetId}` : "acceptanceCriteria",
          "Rewrite acceptance criteria as testable Given/When/Then conditions."
        )
    );
  }

  if (input.aiCodingPack) {
    const agentsMd = getAICodingPackFileContent(input, "AGENTS.md").toLowerCase();
    const claudeMd = getAICodingPackFileContent(input, "CLAUDE.md").toLowerCase();
    const testPlan = getAICodingPackFileContent(input, "test-plan.md").toLowerCase();
    const specJson = getAICodingPackFileContent(input, "spec.json").toLowerCase();

    [
      ...(input.aiCodingPack.qualityIssues ?? []).map((message) => ({
        code: "missing-test-plan" as ProductDeliveryQualityIssueCode,
        severity: "warning" as const,
        message
      }))
    ].forEach((issue) =>
      addIssue(
        "ai-coding-pack",
        issue,
        "Review AI Coding Pack quality",
        "aiCodingPack",
        "Fix the AI Coding Pack before handoff to coding tools."
      )
    );

    if (!agentsMd.includes("constraints") && !specJson.includes("constraints")) {
      addIssue(
        "ai-coding-pack",
        {
          code: "missing-constraints",
          severity: "warning",
          message:
            "AI Coding Pack should include architecture and data/privacy constraints."
        },
        "Add coding constraints",
        "AGENTS.md/spec.json",
        "Add architecture constraints and data/privacy constraints before export."
      );
    }

    if (!testPlan.includes("- [ ]") || !testPlan.includes("test")) {
      addIssue(
        "ai-coding-pack",
        {
          code: "missing-test-plan",
          severity: "warning",
          message:
            "AI Coding Pack should include a test plan with checklist expectations."
        },
        "Add test plan expectations",
        "test-plan.md",
        "Add functional, edge case, and regression test checklist items."
      );
    }

    if (!claudeMd.includes("non-goals")) {
      addIssue(
        "ai-coding-pack",
        {
          code: "missing-non-goals",
          severity: "warning",
          message: "AI Coding Pack should include explicit non-goals."
        },
        "Add non-goals",
        "CLAUDE.md",
        "Add explicit non-goals so coding tools do not expand scope silently."
      );
    }
  }

  const srsRequirementIds = new Set([
    ...(input.srs?.functionalRequirements ?? []).map((requirement) => requirement.id),
    ...(input.srs?.nonFunctionalRequirements ?? []).map((requirement) => requirement.id)
  ]);
  const srsSourceRequirementIds = new Set(
    [
      ...(input.srs?.functionalRequirements ?? []).flatMap(
        (requirement) => requirement.sourceRequirementIds ?? []
      ),
      ...(input.srs?.nonFunctionalRequirements ?? []).flatMap(
        (requirement) => requirement.sourceRequirementIds ?? []
      )
    ]
  );
  const storySourceRequirementIds = new Set(
    (input.userStorySet?.stories ?? []).flatMap(
      (story) => story.sourceRequirementIds ?? []
    )
  );
  const criteriaStoryIds = new Set(
    (input.acceptanceCriteria?.criteria ?? [])
      .map((criterion) => criterion.storyId)
      .filter((storyId): storyId is string => typeof storyId === "string")
  );

  const uncoveredBrdRequirementIds =
    input.brd?.businessRequirements
      .map((requirement) => requirement.id)
      .filter((requirementId) => !srsSourceRequirementIds.has(requirementId)) ?? [];
  const uncoveredSrsRequirementIds = Array.from(srsRequirementIds).filter(
    (requirementId) => !storySourceRequirementIds.has(requirementId)
  );
  const storiesWithoutAcceptanceCriteriaIds =
    input.userStorySet?.stories
      .filter(
        (story) =>
          (story.acceptanceCriteria ?? []).length === 0 &&
          !criteriaStoryIds.has(story.id)
      )
      .map((story) => story.id) ?? [];

  uncoveredBrdRequirementIds.forEach((requirementId) =>
    addIssue(
      "trace-coverage",
      {
        code: "brd-requirement-not-covered",
        severity: "warning",
        message: `BRD requirement ${requirementId} is not covered by SRS requirements.`,
        targetId: requirementId
      },
      "Cover BRD requirement in SRS",
      `srs.functionalRequirements[sourceRequirementIds=${requirementId}]`,
      "Add or link an SRS requirement that covers this BRD requirement.",
      {
        sourceRequirementIds: [requirementId]
      }
    )
  );

  uncoveredSrsRequirementIds.forEach((requirementId) =>
    addIssue(
      "trace-coverage",
      {
        code: "srs-requirement-not-covered",
        severity: "warning",
        message: `SRS requirement ${requirementId} is not covered by user stories.`,
        targetId: requirementId
      },
      "Cover SRS requirement with user story",
      `userStorySet.stories[sourceRequirementIds=${requirementId}]`,
      "Add or link a user story that implements this SRS requirement.",
      {
        sourceRequirementIds: [requirementId]
      }
    )
  );

  storiesWithoutAcceptanceCriteriaIds.forEach((storyId) =>
    addIssue(
      "trace-coverage",
      {
        code: "missing-ac",
        severity: "warning",
        message: `User story ${storyId} does not have acceptance criteria.`,
        targetId: storyId
      },
      "Add acceptance criteria for story",
      `acceptanceCriteria.criteria[storyId=${storyId}]`,
      "Add testable acceptance criteria for this story before export.",
      {
        sourceStoryIds: [storyId]
      }
    )
  );

  return dedupeRequirementQAResponse({
    id: `requirement-qa-${Date.parse(generatedAt) || Date.now()}`,
    generatedAt,
    findings,
    recommendations,
    coverage: {
      brdRequirementCount: input.brd?.businessRequirements.length ?? 0,
      brdCoveredBySrsCount:
        (input.brd?.businessRequirements.length ?? 0) -
        uncoveredBrdRequirementIds.length,
      uncoveredBrdRequirementIds,
      srsRequirementCount: srsRequirementIds.size,
      srsCoveredByStoriesCount:
        srsRequirementIds.size - uncoveredSrsRequirementIds.length,
      uncoveredSrsRequirementIds,
      userStoryCount: input.userStorySet?.stories.length ?? 0,
      storiesWithAcceptanceCriteriaCount:
        (input.userStorySet?.stories.length ?? 0) -
        storiesWithoutAcceptanceCriteriaIds.length,
      storiesWithoutAcceptanceCriteriaIds
    },
    assumptions: [
      "Requirement QA uses available preview artifacts only and does not persist changes."
    ],
    openQuestions:
      findings.length > 0
        ? ["Review findings and decide which draft patches should be applied manually."]
        : [],
    warnings: input.aiCodingPack
      ? []
      : ["AI Coding Pack checks were skipped because no coding pack preview was provided."]
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

  if (!Array.isArray(value.epics)) {
    errors.push("userStorySet.epics must be an array.");
  } else {
    value.epics.forEach((epic, index) => {
      if (!isObject(epic)) {
        errors.push(`userStorySet.epics[${index}] must be an object.`);
        return;
      }

      ["id", "title", "description"].forEach((field) =>
        validateString(epic[field], `userStorySet.epics[${index}].${field}`, errors)
      );
      validateOptionalStringArray(
        epic.sourceStepIds,
        `userStorySet.epics[${index}].sourceStepIds`,
        errors
      );
      validateOptionalStringArray(
        epic.sourceRequirementIds,
        `userStorySet.epics[${index}].sourceRequirementIds`,
        errors
      );
    });
  }

  if (!Array.isArray(value.stories) || value.stories.length === 0) {
    errors.push("userStorySet.stories must be a non-empty array.");
  } else {
    value.stories.forEach((story, index) => {
      if (!isObject(story)) {
        errors.push(`userStorySet.stories[${index}] must be an object.`);
        return;
      }

      [
        "id",
        "title",
        "role",
        "goal",
        "businessValue",
        "persona",
        "need",
        "benefit"
      ].forEach((field) =>
        validateString(
          story[field],
          `userStorySet.stories[${index}].${field}`,
          errors
        )
      );
      validateOptionalStringArray(
        story.sourceStepIds,
        `userStorySet.stories[${index}].sourceStepIds`,
        errors
      );
      validateOptionalStringArray(
        story.sourceRequirementIds,
        `userStorySet.stories[${index}].sourceRequirementIds`,
        errors
      );
      validateOptionalStringArray(
        story.dependencies,
        `userStorySet.stories[${index}].dependencies`,
        errors
      );

      if (story.acceptanceCriteria !== undefined) {
        validateStringArray(
          story.acceptanceCriteria,
          `userStorySet.stories[${index}].acceptanceCriteria`,
          errors
        );
      }

      if (story.epicId !== undefined) {
        validateString(story.epicId, `userStorySet.stories[${index}].epicId`, errors);
      }

      if (
        isString(story.priority) &&
        !["must", "should", "could"].includes(story.priority)
      ) {
        errors.push(`userStorySet.stories[${index}].priority must be must, should, or could.`);
      }

      if (
        isString(story.complexity) &&
        !["low", "medium", "high"].includes(story.complexity)
      ) {
        errors.push(`userStorySet.stories[${index}].complexity must be low, medium, or high.`);
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
      validateOptionalStringArray(
        criterion.sourceStepIds,
        `acceptanceCriteria.criteria[${index}].sourceStepIds`,
        errors
      );
      validateOptionalStringArray(
        criterion.sourceRequirementIds,
        `acceptanceCriteria.criteria[${index}].sourceRequirementIds`,
        errors
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
  validateQualityIssues(value.qualityIssues, errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: value as AcceptanceCriteriaSet,
    errors: []
  };
}

function validateProductScopeReviewItems(
  value: unknown,
  fieldName: string,
  errors: string[],
  requireNonEmpty = false
) {
  if (!Array.isArray(value)) {
    errors.push(`${fieldName} must be an array.`);
    return;
  }

  if (requireNonEmpty && value.length === 0) {
    errors.push(`${fieldName} must contain at least one item.`);
  }

  value.forEach((item, index) => {
    if (!isObject(item)) {
      errors.push(`${fieldName}[${index}] must be an object.`);
      return;
    }

    ["id", "title", "description"].forEach((field) =>
      validateString(item[field], `${fieldName}[${index}].${field}`, errors)
    );
    validateOptionalStringArray(
      item.sourceStepIds,
      `${fieldName}[${index}].sourceStepIds`,
      errors
    );
    validateOptionalStringArray(
      item.sourceRequirementIds,
      `${fieldName}[${index}].sourceRequirementIds`,
      errors
    );
    validateOptionalStringArray(
      item.sourceStoryIds,
      `${fieldName}[${index}].sourceStoryIds`,
      errors
    );
  });
}

function validateProductDeliverySlice(
  value: unknown,
  fieldName: string,
  errors: string[],
  requireItems = false
) {
  if (!isObject(value)) {
    errors.push(`${fieldName} must be an object.`);
    return;
  }

  ["id", "title", "summary"].forEach((field) =>
    validateString(value[field], `${fieldName}.${field}`, errors)
  );
  validateProductScopeReviewItems(
    value.items,
    `${fieldName}.items`,
    errors,
    requireItems
  );
}

export function validateProductScopeReview(
  value: unknown
): SchemaValidationResult<ProductScopeReview> {
  const errors: string[] = [];

  if (!isObject(value)) {
    return {
      ok: false,
      errors: ["ProductScopeReview must be an object."]
    };
  }

  ["id", "title"].forEach((field) =>
    validateString(value[field], `productScopeReview.${field}`, errors)
  );
  validateProductScopeReviewItems(value.inScope, "productScopeReview.inScope", errors, true);
  validateProductScopeReviewItems(value.outOfScope, "productScopeReview.outOfScope", errors);
  validateAssumptions(value.assumptions, errors);
  validateOpenQuestions(value.openQuestions, errors);
  validateProductDeliverySlice(value.mvpSlice, "productScopeReview.mvpSlice", errors, true);

  if (!Array.isArray(value.laterPhases)) {
    errors.push("productScopeReview.laterPhases must be an array.");
  } else {
    value.laterPhases.forEach((phase, index) =>
      validateProductDeliverySlice(
        phase,
        `productScopeReview.laterPhases[${index}]`,
        errors
      )
    );
  }

  validateProductScopeReviewItems(
    value.dependencies,
    "productScopeReview.dependencies",
    errors
  );
  validateProductScopeReviewItems(value.risks, "productScopeReview.risks", errors);
  validateQualityIssues(value.qualityIssues, errors);
  validateTraceLinks(value.traceLinks, errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: value as ProductScopeReview,
    errors: []
  };
}

function validateRequirementQAArtifactType(
  value: unknown,
  fieldName: string,
  errors: string[]
) {
  if (
    !isString(value) ||
    ![
      "brd",
      "srs",
      "user-story",
      "acceptance-criteria",
      "ai-coding-pack",
      "trace-coverage"
    ].includes(value)
  ) {
    errors.push(`${fieldName} must be a valid Requirement QA artifact type.`);
  }
}

function validateRequirementQARecommendations(
  value: unknown,
  errors: string[]
) {
  const validConfidence = new Set(["low", "medium", "high"]);

  if (!Array.isArray(value)) {
    errors.push("requirementQA.recommendations must be an array.");
    return;
  }

  value.forEach((recommendation, index) => {
    if (!isObject(recommendation)) {
      errors.push(`requirementQA.recommendations[${index}] must be an object.`);
      return;
    }

    ["id", "title", "description"].forEach((field) =>
      validateString(
        recommendation[field],
        `requirementQA.recommendations[${index}].${field}`,
        errors
      )
    );
    validateRequirementQAArtifactType(
      recommendation.artifactType,
      `requirementQA.recommendations[${index}].artifactType`,
      errors
    );

    if (
      !isString(recommendation.confidence) ||
      !validConfidence.has(recommendation.confidence)
    ) {
      errors.push(
        `requirementQA.recommendations[${index}].confidence must be low, medium, or high.`
      );
    }

    if (
      !isString(recommendation.riskLevel) ||
      !validConfidence.has(recommendation.riskLevel)
    ) {
      errors.push(
        `requirementQA.recommendations[${index}].riskLevel must be low, medium, or high.`
      );
    }

    if (recommendation.targetId !== undefined) {
      validateString(
        recommendation.targetId,
        `requirementQA.recommendations[${index}].targetId`,
        errors
      );
    }

    validateOptionalStringArray(
      recommendation.sourceRequirementIds,
      `requirementQA.recommendations[${index}].sourceRequirementIds`,
      errors
    );
    validateOptionalStringArray(
      recommendation.sourceStoryIds,
      `requirementQA.recommendations[${index}].sourceStoryIds`,
      errors
    );
    validateOptionalStringArray(
      recommendation.sourceStepIds,
      `requirementQA.recommendations[${index}].sourceStepIds`,
      errors
    );

    if (recommendation.draftPatch !== undefined) {
      if (!isObject(recommendation.draftPatch)) {
        errors.push(
          `requirementQA.recommendations[${index}].draftPatch must be an object.`
        );
      } else {
        const draftPatch = recommendation.draftPatch;
        validateRequirementQAArtifactType(
          draftPatch.targetArtifactType,
          `requirementQA.recommendations[${index}].draftPatch.targetArtifactType`,
          errors
        );
        ["fieldPath", "suggestedValue", "rationale"].forEach((field) =>
          validateString(
            draftPatch[field],
            `requirementQA.recommendations[${index}].draftPatch.${field}`,
            errors
          )
        );

        if (draftPatch.targetId !== undefined) {
          validateString(
            draftPatch.targetId,
            `requirementQA.recommendations[${index}].draftPatch.targetId`,
            errors
          );
        }
      }
    }
  });
}

export function validateRequirementQAResponse(
  value: unknown
): SchemaValidationResult<RequirementQAResponse> {
  const errors: string[] = [];
  const validCodes = new Set<ProductDeliveryQualityIssueCode>([
    "missing-objective",
    "missing-scope",
    "vague-requirement",
    "missing-stakeholder",
    "requirement-not-testable",
    "missing-actor-system",
    "missing-nfr",
    "unclear-dependency",
    "missing-role",
    "missing-value",
    "missing-ac",
    "ac-not-testable",
    "story-too-broad",
    "no-source-trace",
    "missing-mvp-slice",
    "missing-risk",
    "missing-constraints",
    "missing-test-plan",
    "missing-non-goals",
    "brd-requirement-not-covered",
    "srs-requirement-not-covered"
  ]);
  const validSeverities = new Set(["error", "warning"]);

  if (!isObject(value)) {
    return {
      ok: false,
      errors: ["RequirementQAResponse must be an object."]
    };
  }

  ["id", "generatedAt"].forEach((field) =>
    validateString(value[field], `requirementQA.${field}`, errors)
  );

  if (!Array.isArray(value.findings)) {
    errors.push("requirementQA.findings must be an array.");
  } else {
    value.findings.forEach((finding, index) => {
      if (!isObject(finding)) {
        errors.push(`requirementQA.findings[${index}] must be an object.`);
        return;
      }

      ["id", "title", "message"].forEach((field) =>
        validateString(
          finding[field],
          `requirementQA.findings[${index}].${field}`,
          errors
        )
      );
      validateRequirementQAArtifactType(
        finding.artifactType,
        `requirementQA.findings[${index}].artifactType`,
        errors
      );

      if (!isString(finding.code) || !validCodes.has(finding.code as ProductDeliveryQualityIssueCode)) {
        errors.push(`requirementQA.findings[${index}].code must be valid.`);
      }

      if (!isString(finding.severity) || !validSeverities.has(finding.severity)) {
        errors.push(
          `requirementQA.findings[${index}].severity must be error or warning.`
        );
      }

      if (finding.targetId !== undefined) {
        validateString(
          finding.targetId,
          `requirementQA.findings[${index}].targetId`,
          errors
        );
      }
      if (finding.recommendationId !== undefined) {
        validateString(
          finding.recommendationId,
          `requirementQA.findings[${index}].recommendationId`,
          errors
        );
      }
      validateOptionalStringArray(
        finding.sourceRequirementIds,
        `requirementQA.findings[${index}].sourceRequirementIds`,
        errors
      );
      validateOptionalStringArray(
        finding.sourceStoryIds,
        `requirementQA.findings[${index}].sourceStoryIds`,
        errors
      );
      validateOptionalStringArray(
        finding.sourceStepIds,
        `requirementQA.findings[${index}].sourceStepIds`,
        errors
      );
    });
  }

  validateRequirementQARecommendations(value.recommendations, errors);

  if (!isObject(value.coverage)) {
    errors.push("requirementQA.coverage must be an object.");
  } else {
    const coverage = value.coverage;
    [
      "brdRequirementCount",
      "brdCoveredBySrsCount",
      "srsRequirementCount",
      "srsCoveredByStoriesCount",
      "userStoryCount",
      "storiesWithAcceptanceCriteriaCount"
    ].forEach((field) => {
      if (typeof coverage[field] !== "number") {
        errors.push(`requirementQA.coverage.${field} must be a number.`);
      }
    });
    validateStringArray(
      coverage.uncoveredBrdRequirementIds,
      "requirementQA.coverage.uncoveredBrdRequirementIds",
      errors
    );
    validateStringArray(
      coverage.uncoveredSrsRequirementIds,
      "requirementQA.coverage.uncoveredSrsRequirementIds",
      errors
    );
    validateStringArray(
      coverage.storiesWithoutAcceptanceCriteriaIds,
      "requirementQA.coverage.storiesWithoutAcceptanceCriteriaIds",
      errors
    );
  }

  validateStringArray(value.assumptions, "requirementQA.assumptions", errors);
  validateStringArray(value.openQuestions, "requirementQA.openQuestions", errors);
  validateStringArray(value.warnings, "requirementQA.warnings", errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: value as RequirementQAResponse,
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
