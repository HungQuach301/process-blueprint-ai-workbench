import type { ProcessTask } from "@/lib/models/process-task";
import type {
  AcceptanceCriteriaSet,
  Assumption,
  BRD,
  BRDGenerationInput,
  BusinessRequirement,
  OpenQuestion,
  ProductDeliveryDraft,
  ProductDeliveryInput,
  ProductScope,
  RiskDependency,
  SRS,
  UserStory,
  UserStorySet
} from "@/lib/models/product-delivery";
import {
  runBRDQualityGate,
  validateBRD,
  validateProductDeliveryDraft
} from "@/lib/models/product-delivery";

export type { BRD, BRDGenerationInput, ProductDeliveryDraft, ProductDeliveryInput };

function nonEmpty(value: string | null | undefined) {
  return value?.trim() || "";
}

function groupByPhase(processTasks: ProcessTask[]) {
  return processTasks.reduce<Record<string, ProcessTask[]>>((groups, task) => {
    const phase = nonEmpty(task.phase) || "Unassigned";
    groups[phase] = groups[phase] ?? [];
    groups[phase].push(task);
    return groups;
  }, {});
}

function getDeliveryRows(processTasks: ProcessTask[]) {
  return processTasks.filter(
    (task) => task.rowType === "task" || task.rowType === "gateway"
  );
}

function buildAssumptions(input: BRDGenerationInput | ProductDeliveryInput): Assumption[] {
  const processTasks = input.processTasks ?? [];
  const source = "source" in input ? input.source : "process-task-register";

  return [
    {
      id: "A-PD-001",
      text:
        source === "process-task-register"
          ? "BRD draft is generated from the current Process Task Register preview source."
          : "BRD draft is generated from notes/chat and optional source context.",
      sourceStepIds: processTasks.map((task) => task.stepId)
    },
    {
      id: "A-PD-002",
      text:
        "Detailed non-functional requirements, release constraints, and ownership require human confirmation."
    }
  ];
}

function buildOpenQuestions(
  input: BRDGenerationInput | ProductDeliveryInput
): OpenQuestion[] {
  const questions: OpenQuestion[] = [
    {
      id: "Q-PD-001",
      question: "Who is the final business owner and approval stakeholder?"
    },
    {
      id: "Q-PD-002",
      question:
        "Which non-functional requirements, audit, retention, and security constraints must be added?"
    }
  ];

  if (!nonEmpty(input.projectContext)) {
    questions.push({
      id: "Q-PD-003",
      question:
        "What project context, target users, and delivery constraints should shape the BRD/SRS?"
    });
  }

  return questions;
}

function buildScope(input: BRDGenerationInput): ProductScope {
  const processTasks = input.processTasks ?? [];
  const sourceStepIds = processTasks.map((task) => task.stepId);
  const phases = Object.keys(groupByPhase(processTasks));

  return {
    id: "SCOPE-PD-001",
    title: "Product delivery scope",
    inScope: [
      `Process steps from current PTR: ${processTasks.length}`,
      `Covered phases: ${phases.join(", ") || "Unassigned"}`,
      "BRD outline, SRS outline, user stories, and acceptance criteria draft"
    ],
    outOfScope: [
      "Full Artifact Graph persistence",
      "Jira synchronization",
      "Final legal, compliance, and security approval"
    ],
    sourceStepIds
  };
}

function renderContext(input: BRDGenerationInput) {
  return [
    input.projectContext ? `Project context:\n${input.projectContext}` : "Project context: not provided.",
    input.notes ? `Notes:\n${input.notes}` : "Notes: not provided.",
    input.sourceSummary ? `Source summary:\n${input.sourceSummary}` : "Source summary: derived from available source context.",
    input.uploadedFileText
      ? `Uploaded file text:\n${input.uploadedFileText.slice(0, 4000)}`
      : "Uploaded file text: not provided."
  ].join("\n\n");
}

function extractStakeholders(input: BRDGenerationInput) {
  const processTasks = input.processTasks ?? [];
  const actors = processTasks
    .map((task) => nonEmpty(task.actor))
    .filter(Boolean);
  const contextStakeholders = [
    input.projectContext,
    input.notes,
    input.sourceSummary,
    input.uploadedFileText
  ]
    .filter(Boolean)
    .join("\n")
    .split(/\r?\n|,|;/)
    .map((line) => line.trim())
    .filter((line) => /stakeholder|owner|approver|actor|user|team/i.test(line))
    .slice(0, 4);

  return Array.from(new Set([...actors, ...contextStakeholders])).slice(0, 8);
}

function buildBusinessObjective(input: BRDGenerationInput) {
  const candidate = [
    input.projectContext,
    input.sourceSummary,
    input.notes,
    input.uploadedFileText
  ]
    .filter(Boolean)
    .join("\n")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /objective|goal|purpose|muc tieu|mục tiêu/i.test(line));

  if (candidate) {
    return candidate;
  }

  if ((input.processTasks ?? []).length > 0) {
    return "Define business requirements for the current process scope in the Process Task Register.";
  }

  return "";
}

function buildBusinessRequirements(input: BRDGenerationInput): BusinessRequirement[] {
  const processTasks = input.processTasks ?? [];
  const rows = getDeliveryRows(processTasks);
  const sourceRequirements = rows.map((task, index) => ({
    id: `BR-${String(index + 1).padStart(3, "0")}`,
    title: task.taskName,
    description: [
      `The business must support ${task.taskName}.`,
      nonEmpty(task.actor) ? `Responsible stakeholder: ${task.actor}.` : "Responsible stakeholder requires confirmation.",
      nonEmpty(task.output) ? `Expected outcome: ${task.output}.` : "Expected outcome requires confirmation."
    ].join(" "),
    priority: "must" as const,
    sourceStepIds: [task.stepId]
  }));

  if (sourceRequirements.length > 0) {
    return sourceRequirements;
  }

  const notes = [input.notes, input.sourceSummary, input.uploadedFileText]
    .filter(Boolean)
    .join("\n")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 12)
    .slice(0, 5);

  return notes.map((line, index) => ({
    id: `BR-${String(index + 1).padStart(3, "0")}`,
    title: line.slice(0, 80),
    description: line,
    priority: index === 0 ? "must" : "should"
  }));
}

function buildRisksDependencies(input: BRDGenerationInput): RiskDependency[] {
  const processTasks = input.processTasks ?? [];
  const controls = processTasks
    .filter((task) => nonEmpty(task.conditionQuestion) || nonEmpty(task.riskControl))
    .map(
      (task) =>
        ({
          id: `RD-${task.stepId}`,
          type: "risk" as const,
          description: nonEmpty(task.conditionQuestion) || nonEmpty(task.riskControl),
          sourceStepIds: [task.stepId]
        })
    );

  return [
    ...controls,
    {
      id: "RD-PD-001",
      type: "dependency",
      description:
        "Final BRD approval depends on stakeholder confirmation of scope, ownership, controls, and non-functional requirements."
    }
  ];
}

function buildBRD(input: BRDGenerationInput, scope: ProductScope): BRD {
  const processTasks = input.processTasks ?? [];
  const phases = groupByPhase(processTasks);
  const sourceStepIds = processTasks.map((task) => task.stepId);
  const integrations = processTasks
    .filter((task) => nonEmpty(task.system) || nonEmpty(task.dataObject))
    .map(
      (task) =>
        `${task.stepId}: system=${nonEmpty(task.system) || "N/A"}; data=${nonEmpty(task.dataObject) || "N/A"}`
    );

  const brd: BRD = {
    id: "BRD-PD-001",
    title: "BRD Outline",
    summary:
      "Draft BRD outline generated from Process Task Register and optional delivery context.",
    businessObjective: buildBusinessObjective(input),
    backgroundContext: renderContext(input),
    scope,
    stakeholders: extractStakeholders(input),
    businessRequirements: buildBusinessRequirements(input),
    processReferences: processTasks.map((task) => ({
      stepId: task.stepId,
      taskName: task.taskName,
      phase: nonEmpty(task.phase) || undefined
    })),
    risksDependencies: buildRisksDependencies(input),
    sections: [
      {
        id: "BRD-SEC-001",
        title: "Business Context",
        content: renderContext(input),
        sourceStepIds
      },
      {
        id: "BRD-SEC-002",
        title: "Process Overview",
        content: Object.entries(phases)
          .map(([phase, tasks]) => [
            `${phase}`,
            ...tasks.map(
              (task) =>
                `- ${task.stepId}: ${task.taskName} (${task.rowType}/${task.bpmnType})`
            )
          ].join("\n"))
          .join("\n\n"),
        sourceStepIds
      },
      {
        id: "BRD-SEC-003",
        title: "Business Rules And Controls",
        content:
          buildRisksDependencies(input)
            .map((item) => `${item.id}: ${item.description}`)
            .join("\n") || "To be confirmed.",
        sourceStepIds
      },
      {
        id: "BRD-SEC-004",
        title: "Integrations And Data",
        content: integrations.join("\n") || "To be confirmed.",
        sourceStepIds
      }
    ],
    assumptions: buildAssumptions(input),
    openQuestions: buildOpenQuestions(input),
    qualityIssues: [],
    traceLinks: sourceStepIds.map((stepId) => ({
      sourceStepIds: [stepId],
      targetId: "BRD-PD-001"
    }))
  };
  const qualityGate = runBRDQualityGate(brd);

  return {
    ...brd,
    qualityIssues: qualityGate.issues
  };
}

export function generateBRD(input: BRDGenerationInput): BRD {
  const scope = buildScope(input);
  const brd = buildBRD(input, scope);
  const validation = validateBRD(brd);

  if (!validation.ok) {
    throw new Error(`BRD failed schema validation: ${validation.errors.join(" ")}`);
  }

  return validation.value;
}

function buildSRS(input: ProductDeliveryInput): SRS {
  const rows = getDeliveryRows(input.processTasks);

  return {
    id: "SRS-PD-001",
    title: "SRS Outline",
    overview:
      "Draft SRS outline derived from Process Task Register steps and system/data fields.",
    functionalRequirements: rows.map((task, index) => ({
      id: `FR-${String(index + 1).padStart(3, "0")}`,
      title: task.taskName,
      description: [
        `The solution should support process step ${task.stepId}: ${task.taskName}.`,
        nonEmpty(task.system) ? `Primary system: ${task.system}.` : "Primary system: to be confirmed.",
        nonEmpty(task.input) ? `Input: ${task.input}.` : "Input: to be confirmed.",
        nonEmpty(task.output) ? `Output: ${task.output}.` : "Output: to be confirmed."
      ].join(" "),
      sourceStepIds: [task.stepId]
    })),
    nonFunctionalRequirements: [
      "Security, audit logging, retention, and performance requirements must be confirmed.",
      "Role-based access and approval controls must be confirmed for enterprise/banking deployment."
    ],
    assumptions: buildAssumptions(input),
    openQuestions: buildOpenQuestions(input),
    traceLinks: rows.map((task) => ({
      sourceStepIds: [task.stepId],
      targetId: "SRS-PD-001"
    }))
  };
}

function buildUserStory(task: ProcessTask): UserStory {
  const actor = nonEmpty(task.actor) || "process user";
  const output = nonEmpty(task.output) || "the expected process outcome is produced";

  return {
    id: `US-${task.stepId}`,
    title: task.taskName,
    persona: actor,
    need: task.taskName,
    benefit: output,
    sourceStepIds: [task.stepId],
    acceptanceCriteria: [
      `Given ${nonEmpty(task.input) || "valid process input exists"}`,
      `When ${task.taskName}`,
      `Then ${output}`
    ]
  };
}

function buildUserStorySet(input: ProductDeliveryInput): UserStorySet {
  const rows = getDeliveryRows(input.processTasks);

  return {
    id: "USS-PD-001",
    title: "PTR-derived user stories",
    stories: rows.map(buildUserStory),
    assumptions: buildAssumptions(input),
    openQuestions: buildOpenQuestions(input),
    traceLinks: rows.map((task) => ({
      sourceStepIds: [task.stepId],
      targetId: `US-${task.stepId}`
    }))
  };
}

function buildAcceptanceCriteriaSet(
  input: ProductDeliveryInput,
  userStorySet: UserStorySet
): AcceptanceCriteriaSet {
  const rows = getDeliveryRows(input.processTasks);

  return {
    id: "AC-PD-001",
    title: "PTR-derived acceptance criteria",
    criteria: rows.map((task) => {
      const storyId = `US-${task.stepId}`;
      const given = nonEmpty(task.input) || "valid process input exists";
      const outcome = nonEmpty(task.output) || "the step output is produced";
      const nextStep = task.defaultNextStep ?? task.yesNextStep ?? task.noNextStep;

      return {
        id: `AC-${task.stepId}`,
        storyId: userStorySet.stories.some((story) => story.id === storyId)
          ? storyId
          : undefined,
        sourceStepIds: [task.stepId],
        given,
        when: task.taskName,
        then: nextStep
          ? `${outcome}; the process can continue to ${nextStep}`
          : outcome
      };
    }),
    assumptions: buildAssumptions(input),
    openQuestions: buildOpenQuestions(input)
  };
}

function renderList(items: string[]) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None.";
}

function renderAssumptions(assumptions: Assumption[]) {
  return renderList(assumptions.map((assumption) => assumption.text));
}

function renderOpenQuestions(openQuestions: OpenQuestion[]) {
  return renderList(openQuestions.map((question) => question.question));
}

function renderBusinessRequirements(requirements: BusinessRequirement[]) {
  return requirements
    .map((requirement) =>
      [
        `### ${requirement.id} - ${requirement.title}`,
        "",
        requirement.description,
        "",
        `Priority: ${requirement.priority}`,
        requirement.sourceStepIds?.length
          ? `Source steps: ${requirement.sourceStepIds.join(", ")}`
          : "Source steps: not available"
      ].join("\n")
    )
    .join("\n\n");
}

function renderRisksDependencies(items: RiskDependency[]) {
  return items
    .map(
      (item) =>
        `- ${item.id} (${item.type}): ${item.description}${
          item.sourceStepIds?.length
            ? ` Source steps: ${item.sourceStepIds.join(", ")}.`
            : ""
        }`
    )
    .join("\n");
}

function renderProcessReferences(brd: BRD) {
  return brd.processReferences.length > 0
    ? brd.processReferences
        .map(
          (reference) =>
            `- ${reference.stepId}: ${reference.taskName}${
              reference.phase ? ` (${reference.phase})` : ""
            }`
        )
        .join("\n")
    : "- No Process Task Register references were provided.";
}

function renderBrdOutline(brd: BRD) {
  return [
    "# BRD Outline",
    "",
    `## Summary`,
    "",
    brd.summary,
    "",
    "## Business Objective",
    "",
    brd.businessObjective || "To be confirmed.",
    "",
    "## Background / Context",
    "",
    brd.backgroundContext,
    "",
    "## Scope",
    "",
    "### In Scope",
    renderList(brd.scope.inScope),
    "",
    "### Out Of Scope",
    renderList(brd.scope.outOfScope),
    "",
    "## Stakeholders",
    "",
    renderList(brd.stakeholders),
    "",
    "## Business Requirements",
    "",
    renderBusinessRequirements(brd.businessRequirements),
    "",
    "## Process References",
    "",
    renderProcessReferences(brd),
    "",
    "## Risks / Dependencies",
    "",
    renderRisksDependencies(brd.risksDependencies),
    "",
    ...brd.sections.flatMap((section, index) => [
      `## ${index + 1}. ${section.title}`,
      "",
      section.content,
      ""
    ]),
    "## Quality Issues",
    "",
    renderList(
      brd.qualityIssues.map(
        (issue) => `${issue.severity.toUpperCase()} ${issue.code}: ${issue.message}`
      )
    ),
    "",
    "## Assumptions",
    "",
    renderAssumptions(brd.assumptions),
    "",
    "## Open Questions",
    "",
    renderOpenQuestions(brd.openQuestions)
  ].join("\n");
}

function renderSrsOutline(srs: SRS) {
  return [
    "# SRS Outline",
    "",
    srs.overview,
    "",
    "## Functional Requirements",
    "",
    srs.functionalRequirements
      .map(
        (requirement) =>
          `### ${requirement.id} - ${requirement.title}\n\n${requirement.description}\n\nSource steps: ${requirement.sourceStepIds.join(", ")}`
      )
      .join("\n\n"),
    "",
    "## Non-Functional Requirements",
    "",
    renderList(srs.nonFunctionalRequirements),
    "",
    "## Assumptions",
    "",
    renderAssumptions(srs.assumptions),
    "",
    "## Open Questions",
    "",
    renderOpenQuestions(srs.openQuestions)
  ].join("\n");
}

function renderUserStories(userStorySet: UserStorySet) {
  return [
    "# User Stories",
    "",
    userStorySet.stories
      .map((story) =>
        [
          `### ${story.id} - ${story.title}`,
          "",
          `As a ${story.persona}, I want to ${story.need.toLowerCase()}, so that ${story.benefit}.`,
          "",
          `Source steps: ${story.sourceStepIds.join(", ")}`,
          "",
          "Acceptance criteria:",
          renderList(story.acceptanceCriteria ?? [])
        ].join("\n")
      )
      .join("\n\n") ||
      "No task or gateway rows were found in the Process Task Register."
  ].join("\n");
}

function renderAcceptanceCriteria(criteriaSet: AcceptanceCriteriaSet) {
  return [
    "# Acceptance Criteria",
    "",
    criteriaSet.criteria
      .map((criterion) =>
        [
          `## ${criterion.id}`,
          "",
          criterion.storyId ? `Story: ${criterion.storyId}` : "Story: to be confirmed",
          `Source steps: ${criterion.sourceStepIds.join(", ")}`,
          "",
          `- Given ${criterion.given}`,
          `- When ${criterion.when}`,
          `- Then ${criterion.then}`
        ].join("\n")
      )
      .join("\n\n") || "- [ ] Confirm acceptance criteria after process tasks are added.",
    "",
    "## Assumptions",
    "",
    renderAssumptions(criteriaSet.assumptions),
    "",
    "## Open Questions",
    "",
    renderOpenQuestions(criteriaSet.openQuestions)
  ].join("\n");
}

export function generateProductDeliveryDraft(
  input: ProductDeliveryInput
): ProductDeliveryDraft {
  const scope = buildScope({
    ...input,
    source: "process-task-register"
  });
  const brd = buildBRD(
    {
      ...input,
      source: "process-task-register"
    },
    scope
  );
  const srs = buildSRS(input);
  const userStorySet = buildUserStorySet(input);
  const acceptanceCriteria = buildAcceptanceCriteriaSet(input, userStorySet);
  const brdOutlineMarkdown = renderBrdOutline(brd);
  const srsOutlineMarkdown = renderSrsOutline(srs);
  const userStoriesMarkdown = renderUserStories(userStorySet);
  const acceptanceCriteriaMarkdown = renderAcceptanceCriteria(acceptanceCriteria);
  const combinedMarkdown = [
    brdOutlineMarkdown,
    "",
    "---",
    "",
    srsOutlineMarkdown,
    "",
    "---",
    "",
    userStoriesMarkdown,
    "",
    "---",
    "",
    acceptanceCriteriaMarkdown
  ].join("\n");
  const draft: ProductDeliveryDraft = {
    id: `PD-${input.generatedAt}`,
    generatedAt: input.generatedAt,
    source: "process-task-register",
    sourceStepIds: input.processTasks.map((task) => task.stepId),
    brd,
    srs,
    userStorySet,
    acceptanceCriteria,
    scope,
    assumptions: brd.assumptions,
    openQuestions: brd.openQuestions,
    brdOutlineMarkdown,
    srsOutlineMarkdown,
    userStoriesMarkdown,
    acceptanceCriteriaMarkdown,
    combinedMarkdown
  };
  const validation = validateProductDeliveryDraft(draft);

  if (!validation.ok) {
    throw new Error(
      `Product Delivery draft failed schema validation: ${validation.errors.join(" ")}`
    );
  }

  return validation.value;
}
