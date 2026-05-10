import type { ProcessTask } from "@/lib/models/process-task";
import type {
  AcceptanceCriteriaSet,
  BRD,
  SRS,
  UserStorySet
} from "@/lib/models/product-delivery";
import type { TemplateProfile } from "@/lib/models/template-profile";

export type AICodingPackInput = {
  processTasks: ProcessTask[];
  selectedD01Template?: TemplateProfile;
  selectedD02Template?: TemplateProfile;
  brd?: BRD;
  srs?: SRS;
  userStorySet?: UserStorySet;
  acceptanceCriteria?: AcceptanceCriteriaSet;
  projectContext?: string;
  assumptions?: string[];
  openQuestions?: string[];
  generatedAt: string;
};

export type AICodingPackFiles = {
  agentsMd: string;
  claudeMd: string;
  cursorRulesMd: string;
  specJson: string;
  acceptanceCriteriaMd: string;
  implementationPlanMd: string;
  testPlanMd: string;
};

function nonEmpty(value: string | null | undefined) {
  return value?.trim() || "";
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function groupByPhase(processTasks: ProcessTask[]) {
  return processTasks.reduce<Record<string, ProcessTask[]>>((groups, task) => {
    const phase = nonEmpty(task.phase) || "Unassigned";
    groups[phase] = groups[phase] ?? [];
    groups[phase].push(task);
    return groups;
  }, {});
}

function renderTaskLine(task: ProcessTask) {
  const actor = nonEmpty(task.actor) || "Unknown actor";
  const system = nonEmpty(task.system) || "No system";
  const nextStep = task.defaultNextStep ?? task.yesNextStep ?? task.noNextStep ?? "End/unspecified";

  return `- ${task.stepId}: ${task.taskName} (${task.rowType}/${task.bpmnType}) | actor: ${actor} | system: ${system} | next: ${nextStep}`;
}

function renderTraceability(processTasks: ProcessTask[]) {
  if (processTasks.length === 0) {
    return "No Process Task Register rows were provided.";
  }

  const phases = groupByPhase(processTasks);

  return Object.entries(phases)
    .map(([phase, tasks]) => [`### ${phase}`, ...tasks.map(renderTaskLine)].join("\n"))
    .join("\n\n");
}

function renderScope(input: AICodingPackInput) {
  const actors = unique(input.processTasks.map((task) => task.actor));
  const systems = unique(input.processTasks.map((task) => task.system));
  const dataObjects = unique(input.processTasks.map((task) => task.dataObject));
  const requirements = [
    ...(input.brd?.businessRequirements.map((requirement) => requirement.id) ?? []),
    ...(input.srs?.functionalRequirements.map((requirement) => requirement.id) ?? []),
    ...(input.srs?.nonFunctionalRequirements.map((requirement) => requirement.id) ?? [])
  ];

  return [
    `Generated at: ${input.generatedAt}`,
    "",
    input.projectContext ? `Project context:\n${input.projectContext}` : "Project context: not provided.",
    input.brd?.businessObjective
      ? `Project goal:\n${input.brd.businessObjective}`
      : "Project goal: derive from Product Delivery artifacts.",
    "",
    `Process task count: ${input.processTasks.length}`,
    `BRD requirements: ${input.brd?.businessRequirements.length ?? 0}`,
    `SRS requirements: ${(input.srs?.functionalRequirements.length ?? 0) + (input.srs?.nonFunctionalRequirements.length ?? 0)}`,
    `User stories: ${input.userStorySet?.stories.length ?? 0}`,
    `Acceptance criteria: ${input.acceptanceCriteria?.criteria.length ?? 0}`,
    `Traceable requirement ids: ${requirements.join(", ") || "Not specified"}`,
    `Actors: ${actors.join(", ") || "Not specified"}`,
    `Systems: ${systems.join(", ") || "Not specified"}`,
    `Data objects: ${dataObjects.join(", ") || "Not specified"}`,
    "",
    `Selected D01 template: ${input.selectedD01Template ? `${input.selectedD01Template.name} (${input.selectedD01Template.id})` : "Not provided"}`,
    `Selected D02 template: ${input.selectedD02Template ? `${input.selectedD02Template.name} (${input.selectedD02Template.id})` : "Not provided"}`
  ].join("\n");
}

function renderRequirements(input: AICodingPackInput) {
  const brdRequirements =
    input.brd?.businessRequirements.map(
      (requirement) =>
        `- ${requirement.id}: ${requirement.title} (${requirement.priority}) - ${requirement.description}`
    ) ?? [];
  const functionalRequirements =
    input.srs?.functionalRequirements.map(
      (requirement) =>
        `- ${requirement.id}: ${requirement.title} - ${requirement.description}`
    ) ?? [];
  const nonFunctionalRequirements =
    input.srs?.nonFunctionalRequirements.map(
      (requirement) =>
        `- ${requirement.id}: [${requirement.category}] ${requirement.description}`
    ) ?? [];

  return [
    "### Business Requirements",
    brdRequirements.length ? brdRequirements.join("\n") : "- None provided.",
    "",
    "### Functional Requirements",
    functionalRequirements.length ? functionalRequirements.join("\n") : "- None provided.",
    "",
    "### Non-Functional Requirements",
    nonFunctionalRequirements.length ? nonFunctionalRequirements.join("\n") : "- None provided."
  ].join("\n");
}

function renderUserStories(input: AICodingPackInput) {
  const stories = input.userStorySet?.stories ?? [];

  if (stories.length === 0) {
    return "- No user stories provided.";
  }

  return stories
    .map((story) =>
      [
        `- ${story.id}: ${story.title}`,
        `  - Role: ${story.role}`,
        `  - Goal: ${story.goal}`,
        `  - Value: ${story.businessValue}`,
        `  - Priority: ${story.priority ?? "not specified"}`,
        `  - Complexity: ${story.complexity ?? "not specified"}`,
        `  - Source refs: ${(story.sourceRequirementIds ?? []).join(", ") || "none"} ${(story.sourceStepIds ?? []).join(", ") || ""}`.trim()
      ].join("\n")
    )
    .join("\n");
}

function renderArchitectureConstraints(input: AICodingPackInput) {
  const systems = unique([
    ...input.processTasks.map((task) => task.system),
    ...(input.srs?.systemsComponents.map((system) => system.name) ?? [])
  ]);
  const integrations =
    input.srs?.interfaceIntegrationRequirements.map(
      (item) => `- ${item.id}: ${item.name} - ${item.description}`
    ) ?? [];

  return [
    "## Architecture Constraints",
    "",
    systems.length
      ? systems.map((system) => `- Preserve integration boundary for ${system}.`).join("\n")
      : "- Confirm target architecture and integration boundaries before implementation.",
    "",
    "## Interface And Integration Requirements",
    "",
    integrations.length ? integrations.join("\n") : "- None provided."
  ].join("\n");
}

function renderDataPrivacyConstraints(input: AICodingPackInput) {
  const dataRequirements =
    input.srs?.dataRequirements.map(
      (item) => `- ${item.id}: ${item.name} - ${item.description}`
    ) ?? [];
  const dataObjects = unique(input.processTasks.map((task) => task.dataObject));

  return [
    "## Data And Privacy Constraints",
    "",
    dataRequirements.length ? dataRequirements.join("\n") : "- No explicit SRS data requirements provided.",
    dataObjects.length ? `- Process data objects: ${dataObjects.join(", ")}` : "- Process data objects: not specified.",
    "- Do not log customer, banking, or internal process data unnecessarily.",
    "- Keep provider/API keys server-side only."
  ].join("\n");
}

function renderAgentsMd(input: AICodingPackInput) {
  return [
    "# AGENTS.md",
    "",
    "## Mission",
    "",
    "Implement software changes using the process context exported from Process Blueprint AI Workbench.",
    "",
    "## Source Of Truth",
    "",
    "- Treat `spec.json` as the structured source for process steps and traceability.",
    "- Preserve references to `ProcessTask.stepId` in code comments, tests, tickets, and implementation notes where useful.",
    "- Do not invent business rules that are not represented in the exported process context.",
    "",
    "## Project Context",
    "",
    renderScope(input),
    "",
    "## Process Trace",
    "",
    renderTraceability(input.processTasks),
    "",
    "## Requirements",
    "",
    renderRequirements(input),
    "",
    "## User Stories",
    "",
    renderUserStories(input),
    "",
    renderArchitectureConstraints(input),
    "",
    renderDataPrivacyConstraints(input),
    "",
    "## Working Rules",
    "",
    "- Ask for clarification when acceptance criteria conflict with the process trace.",
    "- Prefer small, reviewable changes.",
    "- Keep sensitive banking or enterprise data out of logs.",
    "- Update tests when behavior changes.",
    "- Do not call external AI or provider APIs from browser code unless the host project explicitly supports a safe server-side route."
  ].join("\n");
}

function renderClaudeMd(input: AICodingPackInput) {
  return [
    "# CLAUDE.md",
    "",
    "Use this coding context with Claude Code or similar agentic coding tools.",
    "",
    "## Implementation Intent",
    "",
    input.brd?.businessObjective || input.projectContext || "No additional project context was provided.",
    "",
    "## Non-Goals",
    "",
    input.brd?.scope.outOfScope.length
      ? input.brd.scope.outOfScope.map((item) => `- ${item}`).join("\n")
      : "- Confirm non-goals before implementation.",
    "",
    "## Process Steps To Preserve",
    "",
    renderTraceability(input.processTasks),
    "",
    "## Guardrails",
    "",
    "- Keep implementation traceable to the exported `stepId` values.",
    "- Use `acceptance-criteria.md` and `test-plan.md` as the main completion checklist.",
    "- Do not auto-apply generated code without user review."
  ].join("\n");
}

function renderCursorRules(input: AICodingPackInput) {
  return [
    "# cursor-rules.md",
    "",
    "- Use `spec.json` for structured process context.",
    "- Reference source `stepId` values when implementing process-specific behavior.",
    "- Keep changes scoped to the requested feature.",
    "- Add or update tests for behavior mapped to acceptance criteria.",
    "- Preserve data safety: avoid logging customer, banking, or internal process data.",
    "",
    "## Key Templates",
    "",
    `- D01 BPMN: ${input.selectedD01Template?.name ?? "Not provided"}`,
    `- D02 Service Blueprint: ${input.selectedD02Template?.name ?? "Not provided"}`
  ].join("\n");
}

function renderAcceptanceCriteria(input: AICodingPackInput) {
  const productCriteria =
    input.acceptanceCriteria?.criteria.map(
      (criterion) =>
        `- [ ] ${criterion.id}${criterion.storyId ? ` (${criterion.storyId})` : ""}: Given ${criterion.given}, when ${criterion.when}, then ${criterion.then}.`
    ) ?? [];
  const processCriteria = input.processTasks
    .filter((task) => task.rowType === "task" || task.rowType === "gateway")
    .map((task) => {
      const outcome = nonEmpty(task.output) || "expected output is produced";
      return `- [ ] ${task.stepId}: Given ${nonEmpty(task.input) || "valid input"}, when ${task.taskName}, then ${outcome}.`;
    });
  const criteria = productCriteria.length > 0 ? productCriteria : processCriteria;

  return [
    "# Acceptance Criteria",
    "",
    criteria.length > 0
      ? criteria.join("\n")
      : "- [ ] Confirm implementation behavior matches the exported Process Task Register.",
    "",
    "## Assumptions",
    "",
    input.assumptions?.length ? input.assumptions.map((item) => `- ${item}`).join("\n") : "- None provided.",
    "",
    "## Open Questions",
    "",
    input.openQuestions?.length ? input.openQuestions.map((item) => `- ${item}`).join("\n") : "- None provided."
  ].join("\n");
}

function renderImplementationPlan(input: AICodingPackInput) {
  return [
    "# Implementation Plan",
    "",
    "1. Review `spec.json` and confirm the target process scope.",
    "2. Identify affected modules, screens, APIs, and data contracts.",
    "3. Implement the smallest workflow slice first, preserving source `stepId` traceability.",
    "4. Add validation, error handling, and security controls for sensitive data.",
    "5. Update tests using `test-plan.md`.",
    "6. Review acceptance criteria and unresolved questions before release.",
    "",
    "## Phase Breakdown",
    "",
    input.userStorySet?.stories.length
      ? input.userStorySet.stories
          .map((story) => `- ${story.id}: Implement ${story.title}.`)
          .join("\n")
      : Object.entries(groupByPhase(input.processTasks))
          .map(([phase, tasks]) => [
            `### ${phase}`,
            ...tasks.map((task) => `- ${task.stepId}: Implement support for ${task.taskName}.`)
          ].join("\n"))
          .join("\n\n")
  ].join("\n");
}

function renderTestPlan(input: AICodingPackInput) {
  const storyTests =
    input.userStorySet?.stories.map((story) => `- [ ] ${story.id}: Verify ${story.title}.`) ?? [];
  const processTests = input.processTasks.map((task) => `- [ ] ${task.stepId}: Verify ${task.taskName}.`);

  return [
    "# Test Plan",
    "",
    "## Functional Tests",
    "",
    ...(storyTests.length ? storyTests : processTests),
    "",
    "## Regression Tests",
    "",
    "- [ ] Verify happy path from start event to end event.",
    "- [ ] Verify gateway branches and exception paths.",
    "- [ ] Verify actor/system/data handoffs.",
    "- [ ] Verify sensitive data is not logged unnecessarily.",
    "- [ ] Verify generated artifacts or downstream exports remain consistent where applicable."
  ].join("\n");
}

function renderSpecJson(input: AICodingPackInput) {
  return JSON.stringify(
    {
      packType: "ai-coding-pack",
      version: "mvp1-deterministic",
      generatedAt: input.generatedAt,
      projectContext: input.projectContext ?? "",
      projectGoal: input.brd?.businessObjective ?? "",
      nonGoals: input.brd?.scope.outOfScope ?? [],
      source: {
        processTaskRegister: {
          taskCount: input.processTasks.length,
          stepIds: input.processTasks.map((task) => task.stepId)
        },
        templates: {
          d01: {
            id: input.selectedD01Template?.id ?? "",
            name: input.selectedD01Template?.name ?? "",
            type: input.selectedD01Template?.type ?? "",
            version: input.selectedD01Template?.version ?? ""
          },
          d02: {
            id: input.selectedD02Template?.id ?? "",
            name: input.selectedD02Template?.name ?? "",
            type: input.selectedD02Template?.type ?? "",
            version: input.selectedD02Template?.version ?? ""
          }
        }
      },
      requirements: {
        business: input.brd?.businessRequirements ?? [],
        functional: input.srs?.functionalRequirements ?? [],
        nonFunctional: input.srs?.nonFunctionalRequirements ?? []
      },
      userStories: input.userStorySet?.stories ?? [],
      acceptanceCriteria: input.acceptanceCriteria?.criteria ?? [],
      architectureConstraints: {
        systems: input.srs?.systemsComponents ?? [],
        interfaces: input.srs?.interfaceIntegrationRequirements ?? []
      },
      dataPrivacyConstraints: {
        dataRequirements: input.srs?.dataRequirements ?? [],
        processDataObjects: unique(input.processTasks.map((task) => task.dataObject))
      },
      processTasks: input.processTasks.map((task) => ({
        stepId: task.stepId,
        rowType: task.rowType,
        bpmnType: task.bpmnType,
        taskNature: task.taskNature,
        phase: task.phase,
        actor: task.actor,
        system: task.system,
        dataObject: task.dataObject,
        taskName: task.taskName,
        input: task.input,
        output: task.output,
        defaultNextStep: task.defaultNextStep,
        yesNextStep: task.yesNextStep,
        noNextStep: task.noNextStep,
        reviewStatus: task.reviewStatus
      })),
      assumptions: input.assumptions ?? [],
      openQuestions: input.openQuestions ?? [],
      futureAIEnhancement:
        "Future skill: user-stories-to-ai-coding-pack can generate richer implementation details through the server-side AI skill route with schema validation."
    },
    null,
    2
  );
}

export function generateAICodingPack(input: AICodingPackInput): AICodingPackFiles {
  return {
    agentsMd: renderAgentsMd(input),
    claudeMd: renderClaudeMd(input),
    cursorRulesMd: renderCursorRules(input),
    specJson: renderSpecJson(input),
    acceptanceCriteriaMd: renderAcceptanceCriteria(input),
    implementationPlanMd: renderImplementationPlan(input),
    testPlanMd: renderTestPlan(input)
  };
}
