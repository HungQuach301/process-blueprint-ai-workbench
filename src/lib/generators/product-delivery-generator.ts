import type { ProcessTask } from "@/lib/models/process-task";
import type {
  AcceptanceCriteriaSet,
  AcceptanceCriteriaGenerationInput,
  ActorRole,
  Assumption,
  BRD,
  BRDGenerationInput,
  BusinessRequirement,
  DataRequirement,
  InterfaceIntegrationRequirement,
  NonFunctionalRequirement,
  OpenQuestion,
  ProductDeliveryDraft,
  ProductDeliveryInput,
  ProductScope,
  ProductScopeReview,
  ProductScopeReviewInput,
  ProductScopeReviewItem,
  RiskDependency,
  SRS,
  SRSConstraint,
  SRSGenerationInput,
  SystemComponent,
  UserStoryGenerationInput,
  UserStory,
  UserStorySet
} from "@/lib/models/product-delivery";
import {
  runAcceptanceCriteriaQualityGate,
  runBRDQualityGate,
  runProductScopeReviewQualityGate,
  runSRSQualityGate,
  runUserStoryQualityGate,
  validateBRD,
  validateAcceptanceCriteriaSet,
  validateProductDeliveryDraft,
  validateProductScopeReview,
  validateSRS,
  validateUserStorySet
} from "@/lib/models/product-delivery";

export type {
  BRD,
  BRDGenerationInput,
  ProductDeliveryDraft,
  ProductDeliveryInput,
  SRS,
  SRSGenerationInput,
  UserStoryGenerationInput,
  UserStorySet,
  AcceptanceCriteriaGenerationInput,
  AcceptanceCriteriaSet,
  ProductScopeReviewInput,
  ProductScopeReview
};

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

function createSRSInputFromProductDraft(
  input: ProductDeliveryInput,
  brd?: BRD
): SRSGenerationInput {
  return {
    ...input,
    brd,
    source: "brd-draft"
  };
}

function buildActorRoles(input: SRSGenerationInput): ActorRole[] {
  const processTasks = input.processTasks ?? [];
  const roles = new Map<string, ActorRole>();

  processTasks.forEach((task) => {
    const actor = nonEmpty(task.actor);

    if (!actor) {
      return;
    }

    const existing = roles.get(actor);
    const sourceStepIds = Array.from(
      new Set([...(existing?.sourceStepIds ?? []), task.stepId])
    );

    roles.set(actor, {
      id: existing?.id ?? `ROLE-${String(roles.size + 1).padStart(3, "0")}`,
      name: actor,
      responsibilities: Array.from(
        new Set([...(existing?.responsibilities ?? []), task.taskName])
      ),
      sourceStepIds
    });
  });

  input.brd?.stakeholders.forEach((stakeholder) => {
    const name = stakeholder.trim();

    if (!name || roles.has(name)) {
      return;
    }

    roles.set(name, {
      id: `ROLE-${String(roles.size + 1).padStart(3, "0")}`,
      name,
      responsibilities: ["Review and validate relevant software requirements."],
      sourceRequirementIds: input.brd?.businessRequirements.map(
        (requirement) => requirement.id
      )
    });
  });

  return Array.from(roles.values());
}

function buildSystemComponents(input: SRSGenerationInput): SystemComponent[] {
  const processTasks = input.processTasks ?? [];
  const components = new Map<string, SystemComponent>();

  processTasks.forEach((task) => {
    const system = nonEmpty(task.system);

    if (!system) {
      return;
    }

    const existing = components.get(system);

    components.set(system, {
      id: existing?.id ?? `SYS-${String(components.size + 1).padStart(3, "0")}`,
      name: system,
      description: `System or component supporting PTR step ${task.stepId}: ${task.taskName}.`,
      sourceStepIds: Array.from(
        new Set([...(existing?.sourceStepIds ?? []), task.stepId])
      )
    });
  });

  return Array.from(components.values());
}

function buildDataRequirements(input: SRSGenerationInput): DataRequirement[] {
  const processTasks = input.processTasks ?? [];
  const requirements = new Map<string, DataRequirement>();

  processTasks.forEach((task) => {
    [task.dataObject, task.input, task.output].forEach((candidate) => {
      const name = nonEmpty(candidate);

      if (!name) {
        return;
      }

      const existing = requirements.get(name);

      requirements.set(name, {
        id: existing?.id ?? `DATA-${String(requirements.size + 1).padStart(3, "0")}`,
        name,
        description: `Data required or produced by PTR step ${task.stepId}: ${task.taskName}.`,
        sourceStepIds: Array.from(
          new Set([...(existing?.sourceStepIds ?? []), task.stepId])
        )
      });
    });
  });

  return Array.from(requirements.values());
}

function buildInterfaceRequirements(
  input: SRSGenerationInput,
  systemsComponents: SystemComponent[]
): InterfaceIntegrationRequirement[] {
  return systemsComponents.map((component, index) => ({
    id: `INT-${String(index + 1).padStart(3, "0")}`,
    name: `${component.name} integration`,
    description: `The solution should integrate with ${component.name} for the traced process steps.`,
    systems: [component.name],
    sourceStepIds: component.sourceStepIds
  }));
}

function buildSRSConstraints(input: SRSGenerationInput): SRSConstraint[] {
  const risksDependencies = input.brd?.risksDependencies ?? [];
  const constraints = risksDependencies.map((item, index) => ({
    id: `CON-${String(index + 1).padStart(3, "0")}`,
    description: item.description,
    sourceStepIds: item.sourceStepIds,
    sourceRequirementIds: input.brd?.businessRequirements
      .filter((requirement) =>
        requirement.sourceStepIds?.some((stepId) =>
          item.sourceStepIds?.includes(stepId)
        )
      )
      .map((requirement) => requirement.id)
  }));

  return constraints.length > 0
    ? constraints
    : [
        {
          id: "CON-001",
          description:
            "Security, audit, retention, and release constraints require stakeholder confirmation."
        }
      ];
}

function buildFunctionalRequirements(
  input: SRSGenerationInput,
  actorsRoles: ActorRole[],
  systemsComponents: SystemComponent[],
  dataRequirements: DataRequirement[]
) {
  if (input.brd?.businessRequirements.length) {
    return input.brd.businessRequirements.map((requirement, index) => {
      const sourceStepIds = requirement.sourceStepIds ?? [];
      const actorRoleIds = actorsRoles
        .filter((role) =>
          role.sourceStepIds?.some((stepId) => sourceStepIds.includes(stepId))
        )
        .map((role) => role.id);
      const systemComponentIds = systemsComponents
        .filter((component) =>
          component.sourceStepIds?.some((stepId) => sourceStepIds.includes(stepId))
        )
        .map((component) => component.id);
      const dataRequirementIds = dataRequirements
        .filter((dataRequirement) =>
          dataRequirement.sourceStepIds?.some((stepId) =>
            sourceStepIds.includes(stepId)
          )
        )
        .map((dataRequirement) => dataRequirement.id);

      return {
        id: `FR-${String(index + 1).padStart(3, "0")}`,
        title: requirement.title,
        description: `The solution must support business requirement ${requirement.id}: ${requirement.description}`,
        sourceStepIds,
        sourceRequirementIds: [requirement.id],
        actorRoleIds,
        systemComponentIds,
        dataRequirementIds
      };
    });
  }

  const rows = getDeliveryRows(input.processTasks ?? []);
  const rowRequirements = rows.map((task, index) => ({
    id: `FR-${String(index + 1).padStart(3, "0")}`,
    title: task.taskName,
    description: [
      `The solution should support process step ${task.stepId}: ${task.taskName}.`,
      nonEmpty(task.system) ? `Primary system: ${task.system}.` : "Primary system: to be confirmed.",
      nonEmpty(task.input) ? `Input: ${task.input}.` : "Input: to be confirmed.",
      nonEmpty(task.output) ? `Output: ${task.output}.` : "Output: to be confirmed."
    ].join(" "),
    sourceStepIds: [task.stepId],
    actorRoleIds: actorsRoles
      .filter((role) => role.sourceStepIds?.includes(task.stepId))
      .map((role) => role.id),
    systemComponentIds: systemsComponents
      .filter((component) => component.sourceStepIds?.includes(task.stepId))
      .map((component) => component.id),
    dataRequirementIds: dataRequirements
      .filter((dataRequirement) => dataRequirement.sourceStepIds?.includes(task.stepId))
      .map((dataRequirement) => dataRequirement.id)
  }));

  if (rowRequirements.length > 0) {
    return rowRequirements;
  }

  const notes = [input.notes, input.projectContext, input.sourceSummary, input.uploadedFileText]
    .filter(Boolean)
    .join("\n")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 12)
    .slice(0, 6);

  return notes.map((line, index) => ({
    id: `FR-${String(index + 1).padStart(3, "0")}`,
    title: line.slice(0, 80),
    description: `The solution should support this requirement candidate: ${line}`,
    sourceRequirementIds: input.brd?.businessRequirements.map(
      (requirement) => requirement.id
    )
  }));
}

function buildNonFunctionalRequirements(
  input: SRSGenerationInput
): NonFunctionalRequirement[] {
  const sourceRequirementIds = input.brd?.businessRequirements.map(
    (requirement) => requirement.id
  );

  return [
    {
      id: "NFR-001",
      category: "security",
      description:
        "The solution must protect sensitive business data with role-based access and secure processing controls.",
      sourceRequirementIds
    },
    {
      id: "NFR-002",
      category: "audit",
      description:
        "The solution should record review, approval, export, and AI generation events for auditability.",
      sourceRequirementIds
    },
    {
      id: "NFR-003",
      category: "performance",
      description:
        "The solution should meet agreed response-time and export-generation targets under expected MVP usage.",
      sourceRequirementIds
    }
  ];
}

function buildSRS(input: SRSGenerationInput): SRS {
  const processTasks = input.processTasks ?? [];
  const rows = getDeliveryRows(processTasks);
  const actorsRoles = buildActorRoles(input);
  const systemsComponents = buildSystemComponents(input);
  const dataRequirements = buildDataRequirements(input);
  const interfaceIntegrationRequirements = buildInterfaceRequirements(
    input,
    systemsComponents
  );
  const srs: SRS = {
    id: "SRS-PD-001",
    title: "SRS Draft",
    overview:
      "Draft SRS generated from BRD, notes/chat, and Process Task Register context where available.",
    actorsRoles,
    systemsComponents,
    functionalRequirements: buildFunctionalRequirements(
      input,
      actorsRoles,
      systemsComponents,
      dataRequirements
    ),
    nonFunctionalRequirements: buildNonFunctionalRequirements(input),
    dataRequirements,
    interfaceIntegrationRequirements,
    constraints: buildSRSConstraints(input),
    assumptions: buildAssumptions({
      processTasks,
      projectContext: input.projectContext,
      notes: input.notes,
      sourceSummary: input.sourceSummary,
      uploadedFileText: input.uploadedFileText,
      generatedAt: input.generatedAt,
      source: input.source === "notes-chat" ? "notes-chat" : "process-task-register"
    }),
    openQuestions: buildOpenQuestions({
      processTasks,
      projectContext: input.projectContext,
      notes: input.notes,
      sourceSummary: input.sourceSummary,
      uploadedFileText: input.uploadedFileText,
      generatedAt: input.generatedAt,
      source: input.source === "notes-chat" ? "notes-chat" : "process-task-register"
    }),
    qualityIssues: [],
    traceLinks: rows.map((task) => ({
      sourceStepIds: [task.stepId],
      targetId: "SRS-PD-001"
    }))
  };
  const qualityGate = runSRSQualityGate(srs);

  return {
    ...srs,
    qualityIssues: qualityGate.issues
  };
}

export function generateSRS(input: SRSGenerationInput): SRS {
  const srs = buildSRS(input);
  const validation = validateSRS(srs);

  if (!validation.ok) {
    throw new Error(`SRS failed schema validation: ${validation.errors.join(" ")}`);
  }

  return validation.value;
}

function createProductDeliveryInputFallback(
  input:
    | UserStoryGenerationInput
    | AcceptanceCriteriaGenerationInput
    | ProductScopeReviewInput
): ProductDeliveryInput {
  return {
    processTasks: input.processTasks ?? [],
    projectContext: input.projectContext,
    notes: input.notes,
    sourceSummary: input.sourceSummary,
    uploadedFileText: input.uploadedFileText,
    generatedAt: input.generatedAt
  };
}

function createUserStoryInputFromProductDraft(
  input: ProductDeliveryInput,
  brd: BRD,
  srs: SRS
): UserStoryGenerationInput {
  return {
    ...input,
    brd,
    srs,
    source: "srs-draft"
  };
}

function buildUserStoryFromProcessTask(task: ProcessTask, index: number): UserStory {
  const role = nonEmpty(task.actor) || "process user";
  const output = nonEmpty(task.output) || "the expected process outcome is produced";
  const storyId = `US-${String(index + 1).padStart(3, "0")}`;

  return {
    id: storyId,
    title: task.taskName,
    role,
    goal: task.taskName,
    businessValue: output,
    persona: role,
    need: task.taskName,
    benefit: output,
    sourceStepIds: [task.stepId],
    dependencies: [task.defaultNextStep, task.yesNextStep, task.noNextStep]
      .filter((stepId): stepId is string => typeof stepId === "string" && stepId.length > 0),
    priority: task.reviewStatus === "approved" ? "must" : "should",
    complexity: task.rowType === "gateway" ? "medium" : "low",
    acceptanceCriteria: [
      `Given ${nonEmpty(task.input) || "valid process input exists"}`,
      `When ${task.taskName}`,
      `Then ${output}`
    ]
  };
}

function buildUserStoriesFromSRS(input: UserStoryGenerationInput): UserStory[] {
  const srs = input.srs;

  if (!srs?.functionalRequirements.length) {
    return [];
  }

  return srs.functionalRequirements.map((requirement, index) => {
    const role =
      srs.actorsRoles.find((actorRole) =>
        requirement.actorRoleIds?.includes(actorRole.id)
      )?.name || "product user";
    const businessValue = requirement.description;

    return {
      id: `US-${String(index + 1).padStart(3, "0")}`,
      title: requirement.title,
      role,
      goal: requirement.title,
      businessValue,
      persona: role,
      need: requirement.title,
      benefit: businessValue,
      sourceStepIds: requirement.sourceStepIds,
      sourceRequirementIds: [requirement.id, ...(requirement.sourceRequirementIds ?? [])],
      epicId: "EPIC-001",
      dependencies: requirement.systemComponentIds,
      priority: "must",
      complexity:
        (requirement.systemComponentIds ?? []).length > 1 ? "medium" : "low",
      acceptanceCriteria: [
        `Given source requirement ${requirement.id} is in scope`,
        `When ${role} performs ${requirement.title}`,
        `Then the solution should satisfy ${requirement.id}`
      ]
    };
  });
}

function buildUserStoriesFromBRD(input: UserStoryGenerationInput): UserStory[] {
  const brd = input.brd;

  if (!brd?.businessRequirements.length) {
    return [];
  }

  return brd.businessRequirements.map((requirement, index) => {
    const role = brd.stakeholders[index % Math.max(brd.stakeholders.length, 1)] || "business user";

    return {
      id: `US-${String(index + 1).padStart(3, "0")}`,
      title: requirement.title,
      role,
      goal: requirement.title,
      businessValue: requirement.description,
      persona: role,
      need: requirement.title,
      benefit: requirement.description,
      sourceStepIds: requirement.sourceStepIds,
      sourceRequirementIds: [requirement.id],
      epicId: "EPIC-001",
      dependencies: [],
      priority: requirement.priority,
      complexity: requirement.description.length > 180 ? "medium" : "low",
      acceptanceCriteria: [
        `Given business requirement ${requirement.id} is approved`,
        `When ${role} needs ${requirement.title}`,
        `Then the delivered behavior should satisfy ${requirement.id}`
      ]
    };
  });
}

function buildUserStoriesFromNotes(input: UserStoryGenerationInput): UserStory[] {
  const lines = [
    input.notes,
    input.projectContext,
    input.sourceSummary,
    input.uploadedFileText
  ]
    .filter(Boolean)
    .join("\n")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 12)
    .slice(0, 6);

  return lines.map((line, index) => ({
    id: `US-${String(index + 1).padStart(3, "0")}`,
    title: line.slice(0, 80),
    role: "product user",
    goal: line.slice(0, 120),
    businessValue: line,
    persona: "product user",
    need: line.slice(0, 120),
    benefit: line,
    epicId: "EPIC-001",
    dependencies: [],
    priority: index === 0 ? "must" : "should",
    complexity: "medium",
    acceptanceCriteria: [
      `Given the source note is confirmed`,
      `When product user performs ${line.slice(0, 80)}`,
      `Then the expected business outcome should be observable`
    ]
  }));
}

function buildUserStorySet(input: UserStoryGenerationInput): UserStorySet {
  const processTasks = input.processTasks ?? [];
  const rows = getDeliveryRows(processTasks);
  const stories =
    buildUserStoriesFromSRS(input).length > 0
      ? buildUserStoriesFromSRS(input)
      : buildUserStoriesFromBRD(input).length > 0
        ? buildUserStoriesFromBRD(input)
        : rows.length > 0
          ? rows.map(buildUserStoryFromProcessTask)
          : buildUserStoriesFromNotes(input);
  const epicSourceStepIds = Array.from(
    new Set(stories.flatMap((story) => story.sourceStepIds ?? []))
  );
  const epicSourceRequirementIds = Array.from(
    new Set(stories.flatMap((story) => story.sourceRequirementIds ?? []))
  );
  const userStorySet: UserStorySet = {
    id: "USS-PD-001",
    title: "Product Delivery user stories",
    epics: [
      {
        id: "EPIC-001",
        title: input.srs?.title || input.brd?.title || "Product delivery epic",
        description:
          input.srs?.overview ||
          input.brd?.summary ||
          "Epic generated from available Product Delivery source context.",
        sourceStepIds: epicSourceStepIds,
        sourceRequirementIds: epicSourceRequirementIds
      }
    ],
    stories,
    assumptions: buildAssumptions(createProductDeliveryInputFallback(input)),
    openQuestions: buildOpenQuestions(createProductDeliveryInputFallback(input)),
    qualityIssues: [],
    traceLinks: stories.flatMap((story) =>
      (story.sourceStepIds ?? []).map((stepId) => ({
        sourceStepIds: [stepId],
        targetId: story.id
      }))
    )
  };
  const qualityGate = runUserStoryQualityGate(userStorySet);

  return {
    ...userStorySet,
    qualityIssues: qualityGate.issues
  };
}

export function generateUserStorySet(input: UserStoryGenerationInput): UserStorySet {
  const userStorySet = buildUserStorySet(input);
  const validation = validateUserStorySet(userStorySet);

  if (!validation.ok) {
    throw new Error(
      `User Story Set failed schema validation: ${validation.errors.join(" ")}`
    );
  }

  return validation.value;
}

function buildAcceptanceCriteriaSet(
  input: AcceptanceCriteriaGenerationInput
): AcceptanceCriteriaSet {
  const processTasks = input.processTasks ?? [];
  const rows = getDeliveryRows(processTasks);
  const userStorySet =
    input.userStorySet ??
    buildUserStorySet({
      ...input,
      source: "notes-chat"
    });
  const criteria = userStorySet.stories.flatMap((story) => {
    const matchingTask = rows.find((task) =>
      story.sourceStepIds?.includes(task.stepId)
    );
    const sourceStepIds = story.sourceStepIds ?? (matchingTask ? [matchingTask.stepId] : undefined);
    const baseCriteria = story.acceptanceCriteria?.length
      ? story.acceptanceCriteria
      : [
          `Given ${matchingTask ? nonEmpty(matchingTask.input) || "valid process input exists" : "the story source context is confirmed"}`,
          `When ${story.role} performs ${story.goal}`,
          `Then ${story.businessValue}`
        ];

    if (baseCriteria.length >= 3) {
      return [
        {
          id: `AC-${story.id}-001`,
          storyId: story.id,
          sourceStepIds,
          sourceRequirementIds: story.sourceRequirementIds,
          given: baseCriteria[0].replace(/^Given\s+/i, ""),
          when: baseCriteria[1].replace(/^When\s+/i, ""),
          then: baseCriteria[2].replace(/^Then\s+/i, "")
        }
      ];
    }

    return [
      {
        id: `AC-${story.id}-001`,
        storyId: story.id,
        sourceStepIds,
        sourceRequirementIds: story.sourceRequirementIds,
        given: "the source context and user role are confirmed",
        when: `${story.role} performs ${story.goal}`,
        then: story.businessValue
      }
    ];
  });
  const criteriaSet: AcceptanceCriteriaSet = {
    id: "AC-PD-001",
    title: "Product Delivery acceptance criteria",
    criteria,
    assumptions: buildAssumptions(createProductDeliveryInputFallback(input)),
    openQuestions: buildOpenQuestions(createProductDeliveryInputFallback(input)),
    qualityIssues: []
  };
  const qualityGate = runAcceptanceCriteriaQualityGate(criteriaSet);

  return {
    ...criteriaSet,
    qualityIssues: qualityGate.issues
  };
}

export function generateAcceptanceCriteriaSet(
  input: AcceptanceCriteriaGenerationInput
): AcceptanceCriteriaSet {
  const criteriaSet = buildAcceptanceCriteriaSet(input);
  const validation = validateAcceptanceCriteriaSet(criteriaSet);

  if (!validation.ok) {
    throw new Error(
      `Acceptance Criteria Set failed schema validation: ${validation.errors.join(" ")}`
    );
  }

  return validation.value;
}

function createScopeItem(
  id: string,
  title: string,
  description: string,
  sourceStepIds?: string[],
  sourceRequirementIds?: string[],
  sourceStoryIds?: string[]
): ProductScopeReviewItem {
  return {
    id,
    title,
    description,
    sourceStepIds,
    sourceRequirementIds,
    sourceStoryIds
  };
}

function getScopeReviewSourceItems(input: ProductScopeReviewInput) {
  const srsRequirements = input.srs?.functionalRequirements ?? [];
  const brdRequirements = input.brd?.businessRequirements ?? [];
  const stories = input.userStorySet?.stories ?? [];
  const tasks = getDeliveryRows(input.processTasks ?? []);

  if (stories.length > 0) {
    return stories.map((story, index) =>
      createScopeItem(
        `SCOPE-US-${String(index + 1).padStart(3, "0")}`,
        story.title,
        story.businessValue,
        story.sourceStepIds,
        story.sourceRequirementIds,
        [story.id]
      )
    );
  }

  if (srsRequirements.length > 0) {
    return srsRequirements.map((requirement, index) =>
      createScopeItem(
        `SCOPE-FR-${String(index + 1).padStart(3, "0")}`,
        requirement.title,
        requirement.description,
        requirement.sourceStepIds,
        [requirement.id, ...(requirement.sourceRequirementIds ?? [])]
      )
    );
  }

  if (brdRequirements.length > 0) {
    return brdRequirements.map((requirement, index) =>
      createScopeItem(
        `SCOPE-BR-${String(index + 1).padStart(3, "0")}`,
        requirement.title,
        requirement.description,
        requirement.sourceStepIds,
        [requirement.id]
      )
    );
  }

  if (tasks.length > 0) {
    return tasks.map((task, index) =>
      createScopeItem(
        `SCOPE-STEP-${String(index + 1).padStart(3, "0")}`,
        task.taskName,
        nonEmpty(task.output) || `Deliver process step ${task.stepId}.`,
        [task.stepId]
      )
    );
  }

  return [
    createScopeItem(
      "SCOPE-NOTE-001",
      "Review product scope from notes",
      nonEmpty(input.notes) ||
        nonEmpty(input.projectContext) ||
        nonEmpty(input.sourceSummary) ||
        "Confirm product scope from available source context."
    )
  ];
}

function buildProductScopeReview(input: ProductScopeReviewInput): ProductScopeReview {
  const sourceItems = getScopeReviewSourceItems(input);
  const inScope = sourceItems.slice(0, Math.max(1, Math.ceil(sourceItems.length * 0.65)));
  const laterItems = sourceItems.slice(inScope.length);
  const brdOutOfScope = input.brd?.scope.outOfScope ?? [];
  const outOfScope = brdOutOfScope.length
    ? brdOutOfScope.map((item, index) =>
        createScopeItem(
          `OOS-${String(index + 1).padStart(3, "0")}`,
          item,
          "Explicitly listed as out of scope in the BRD/source context."
        )
      )
    : [
        createScopeItem(
          "OOS-001",
          "Full Artifact Graph persistence",
          "Keep MVP1-AI scope review as preview/export only until Artifact Graph persistence is intentionally added."
        ),
        createScopeItem(
          "OOS-002",
          "Production integration rollout",
          "Final integrations, tenant controls, and production cutover remain outside this draft slice."
        )
      ];
  const dependencies = [
    ...((input.brd?.risksDependencies ?? [])
      .filter((item) => item.type === "dependency")
      .map((item, index) =>
        createScopeItem(
          `DEP-BRD-${String(index + 1).padStart(3, "0")}`,
          item.description.slice(0, 80),
          item.description,
          item.sourceStepIds
        )
      )),
    ...((input.srs?.interfaceIntegrationRequirements ?? []).map((item, index) =>
      createScopeItem(
        `DEP-SRS-${String(index + 1).padStart(3, "0")}`,
        item.name,
        item.description,
        item.sourceStepIds,
        item.sourceRequirementIds
      )
    ))
  ].slice(0, 8);
  const risks = [
    ...((input.brd?.risksDependencies ?? [])
      .filter((item) => item.type === "risk")
      .map((item, index) =>
        createScopeItem(
          `RISK-BRD-${String(index + 1).padStart(3, "0")}`,
          item.description.slice(0, 80),
          item.description,
          item.sourceStepIds
        )
      )),
    createScopeItem(
      "RISK-001",
      "Scope requires human confirmation",
      "Generated scope and MVP slices must be reviewed by product and business stakeholders before delivery planning."
    )
  ].slice(0, 8);
  const laterPhaseItems = laterItems.length > 0 ? laterItems : outOfScope.slice(0, 1);
  const scopeReview: ProductScopeReview = {
    id: "PSR-PD-001",
    title: "Product Scope Review and MVP Slicing",
    inScope,
    outOfScope,
    assumptions: buildAssumptions(createProductDeliveryInputFallback(input)),
    openQuestions: buildOpenQuestions(createProductDeliveryInputFallback(input)),
    mvpSlice: {
      id: "MVP-PD-001",
      title: "MVP slice",
      summary:
        input.businessObjective ||
        input.brd?.businessObjective ||
        "MVP slice based on available BRD, SRS, user story, and process context.",
      items: inScope.slice(0, Math.max(1, Math.min(5, inScope.length)))
    },
    laterPhases: [
      {
        id: "PHASE-PD-002",
        title: "Later phase",
        summary: "Items that can follow after the MVP slice is validated.",
        items: laterPhaseItems
      }
    ],
    dependencies,
    risks,
    qualityIssues: [],
    traceLinks: sourceItems.flatMap((item) =>
      (item.sourceStepIds ?? []).map((stepId) => ({
        sourceStepIds: [stepId],
        targetId: item.id
      }))
    )
  };
  const qualityGate = runProductScopeReviewQualityGate(scopeReview);

  return {
    ...scopeReview,
    qualityIssues: qualityGate.issues
  };
}

export function generateProductScopeReview(
  input: ProductScopeReviewInput
): ProductScopeReview {
  const scopeReview = buildProductScopeReview(input);
  const validation = validateProductScopeReview(scopeReview);

  if (!validation.ok) {
    throw new Error(
      `Product Scope Review failed schema validation: ${validation.errors.join(" ")}`
    );
  }

  return validation.value;
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
          `### ${requirement.id} - ${requirement.title}\n\n${requirement.description}\n\nSource steps: ${(requirement.sourceStepIds ?? []).join(", ") || "not available"}`
      )
      .join("\n\n"),
    "",
    "## Actors / Roles",
    "",
    renderList(
      srs.actorsRoles.map(
        (role) => `${role.id} - ${role.name}: ${role.responsibilities.join("; ")}`
      )
    ),
    "",
    "## Systems / Components",
    "",
    renderList(
      srs.systemsComponents.map(
        (component) => `${component.id} - ${component.name}: ${component.description}`
      )
    ),
    "",
    "## Non-Functional Requirements",
    "",
    renderList(
      srs.nonFunctionalRequirements.map(
        (requirement) =>
          `${requirement.id} (${requirement.category}): ${requirement.description}`
      )
    ),
    "",
    "## Data Requirements",
    "",
    renderList(
      srs.dataRequirements.map(
        (requirement) =>
          `${requirement.id} - ${requirement.name}: ${requirement.description}`
      )
    ),
    "",
    "## Interface / Integration Requirements",
    "",
    renderList(
      srs.interfaceIntegrationRequirements.map(
        (requirement) =>
          `${requirement.id} - ${requirement.name}: ${requirement.description}`
      )
    ),
    "",
    "## Constraints",
    "",
    renderList(
      srs.constraints.map(
        (constraint) => `${constraint.id}: ${constraint.description}`
      )
    ),
    "",
    "## Quality Issues",
    "",
    renderList(
      srs.qualityIssues.map(
        (issue) => `${issue.severity.toUpperCase()} ${issue.code}: ${issue.message}`
      )
    ),
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
    "## Epics",
    "",
    renderList(
      userStorySet.epics.map(
        (epic) => `${epic.id} - ${epic.title}: ${epic.description}`
      )
    ),
    "",
    "## Stories",
    "",
    userStorySet.stories
      .map((story) =>
        [
          `### ${story.id} - ${story.title}`,
          "",
          `As a ${story.role}, I want to ${story.goal.toLowerCase()}, so that ${story.businessValue}.`,
          "",
          `Priority: ${story.priority ?? "should"}`,
          `Complexity: ${story.complexity ?? "medium"}`,
          "",
          `Source steps: ${(story.sourceStepIds ?? []).join(", ") || "not available"}`,
          `Source requirements: ${(story.sourceRequirementIds ?? []).join(", ") || "not available"}`,
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
          `Source steps: ${(criterion.sourceStepIds ?? []).join(", ") || "not available"}`,
          `Source requirements: ${(criterion.sourceRequirementIds ?? []).join(", ") || "not available"}`,
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
  const srs = buildSRS(createSRSInputFromProductDraft(input, brd));
  const userStorySet = buildUserStorySet(
    createUserStoryInputFromProductDraft(input, brd, srs)
  );
  const acceptanceCriteria = buildAcceptanceCriteriaSet({
    ...input,
    userStorySet
  });
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
