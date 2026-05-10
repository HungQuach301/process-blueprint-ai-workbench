import type { ProcessTask } from "@/lib/models/process-task";
import type {
  AcceptanceCriteriaSet,
  Assumption,
  BRD,
  OpenQuestion,
  ProductDeliveryDraft,
  ProductDeliveryInput,
  ProductScope,
  SRS,
  UserStory,
  UserStorySet
} from "@/lib/models/product-delivery";
import { validateProductDeliveryDraft } from "@/lib/models/product-delivery";

export type { ProductDeliveryDraft, ProductDeliveryInput };

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

function buildAssumptions(input: ProductDeliveryInput): Assumption[] {
  return [
    {
      id: "A-PD-001",
      text:
        "Product Delivery draft is generated deterministically from the current Process Task Register preview source.",
      sourceStepIds: input.processTasks.map((task) => task.stepId)
    },
    {
      id: "A-PD-002",
      text:
        "Detailed non-functional requirements, release constraints, and ownership require human confirmation."
    }
  ];
}

function buildOpenQuestions(input: ProductDeliveryInput): OpenQuestion[] {
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

function buildScope(input: ProductDeliveryInput): ProductScope {
  const sourceStepIds = input.processTasks.map((task) => task.stepId);
  const phases = Object.keys(groupByPhase(input.processTasks));

  return {
    id: "SCOPE-PD-001",
    title: "Product delivery scope",
    inScope: [
      `Process steps from current PTR: ${input.processTasks.length}`,
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

function renderContext(input: ProductDeliveryInput) {
  return [
    input.projectContext ? `Project context:\n${input.projectContext}` : "Project context: not provided.",
    input.notes ? `Notes:\n${input.notes}` : "Notes: not provided.",
    input.sourceSummary ? `Source summary:\n${input.sourceSummary}` : "Source summary: derived from Process Task Register."
  ].join("\n\n");
}

function buildBRD(input: ProductDeliveryInput, scope: ProductScope): BRD {
  const phases = groupByPhase(input.processTasks);
  const sourceStepIds = input.processTasks.map((task) => task.stepId);
  const controls = input.processTasks
    .filter((task) => nonEmpty(task.conditionQuestion) || nonEmpty(task.riskControl))
    .map(
      (task) =>
        `${task.stepId}: ${nonEmpty(task.conditionQuestion) || nonEmpty(task.riskControl)}`
    );
  const integrations = input.processTasks
    .filter((task) => nonEmpty(task.system) || nonEmpty(task.dataObject))
    .map(
      (task) =>
        `${task.stepId}: system=${nonEmpty(task.system) || "N/A"}; data=${nonEmpty(task.dataObject) || "N/A"}`
    );

  return {
    id: "BRD-PD-001",
    title: "BRD Outline",
    summary:
      "Draft BRD outline generated from Process Task Register and optional delivery context.",
    scope,
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
        content: controls.join("\n") || "To be confirmed.",
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
    traceLinks: sourceStepIds.map((stepId) => ({
      sourceStepIds: [stepId],
      targetId: "BRD-PD-001"
    }))
  };
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

function renderBrdOutline(brd: BRD) {
  return [
    "# BRD Outline",
    "",
    `## Summary`,
    "",
    brd.summary,
    "",
    "## Scope",
    "",
    "### In Scope",
    renderList(brd.scope.inScope),
    "",
    "### Out Of Scope",
    renderList(brd.scope.outOfScope),
    "",
    ...brd.sections.flatMap((section, index) => [
      `## ${index + 1}. ${section.title}`,
      "",
      section.content,
      ""
    ]),
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
  const scope = buildScope(input);
  const brd = buildBRD(input, scope);
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
