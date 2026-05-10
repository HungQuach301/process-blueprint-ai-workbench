import type { ProcessTask } from "@/lib/models/process-task";

export type ProductDeliveryInput = {
  processTasks: ProcessTask[];
  projectContext?: string;
  notes?: string;
  sourceSummary?: string;
  generatedAt: string;
};

export type ProductDeliveryDraft = {
  generatedAt: string;
  brdOutlineMarkdown: string;
  userStoriesMarkdown: string;
  acceptanceCriteriaMarkdown: string;
  combinedMarkdown: string;
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

function renderContext(input: ProductDeliveryInput) {
  return [
    input.projectContext ? `Project context:\n${input.projectContext}` : "Project context: not provided.",
    input.notes ? `Notes:\n${input.notes}` : "Notes: not provided.",
    input.sourceSummary ? `Source summary:\n${input.sourceSummary}` : "Source summary: derived from Process Task Register."
  ].join("\n\n");
}

function renderProcessScope(processTasks: ProcessTask[]) {
  const actors = unique(processTasks.map((task) => task.actor));
  const systems = unique(processTasks.map((task) => task.system));
  const dataObjects = unique(processTasks.map((task) => task.dataObject));

  return [
    `- Process task count: ${processTasks.length}`,
    `- Actors: ${actors.join(", ") || "Not specified"}`,
    `- Systems: ${systems.join(", ") || "Not specified"}`,
    `- Data objects: ${dataObjects.join(", ") || "Not specified"}`
  ].join("\n");
}

function renderBrdOutline(input: ProductDeliveryInput) {
  const phases = groupByPhase(input.processTasks);

  return [
    "# BRD Outline",
    "",
    `Generated at: ${input.generatedAt}`,
    "",
    "## 1. Business Context",
    "",
    renderContext(input),
    "",
    "## 2. Scope",
    "",
    renderProcessScope(input.processTasks),
    "",
    "## 3. Process Overview",
    "",
    Object.entries(phases)
      .map(([phase, tasks]) => [
        `### ${phase}`,
        ...tasks.map(
          (task) =>
            `- ${task.stepId}: ${task.taskName} (${task.rowType}/${task.bpmnType})`
        )
      ].join("\n"))
      .join("\n\n"),
    "",
    "## 4. Business Rules And Controls",
    "",
    input.processTasks
      .filter((task) => nonEmpty(task.conditionQuestion) || nonEmpty(task.riskControl))
      .map(
        (task) =>
          `- ${task.stepId}: ${nonEmpty(task.conditionQuestion) || nonEmpty(task.riskControl)}`
      )
      .join("\n") || "- To be confirmed.",
    "",
    "## 5. Integrations And Data",
    "",
    input.processTasks
      .filter((task) => nonEmpty(task.system) || nonEmpty(task.dataObject))
      .map(
        (task) =>
          `- ${task.stepId}: system=${nonEmpty(task.system) || "N/A"}; data=${nonEmpty(task.dataObject) || "N/A"}`
      )
      .join("\n") || "- To be confirmed.",
    "",
    "## 6. Open Questions",
    "",
    "- Confirm final business owner and approval stakeholders.",
    "- Confirm non-functional requirements, audit, retention, and security constraints."
  ].join("\n");
}

function renderUserStory(task: ProcessTask) {
  const actor = nonEmpty(task.actor) || "process user";
  const output = nonEmpty(task.output) || "the expected process outcome is produced";

  return [
    `### ${task.stepId} - ${task.taskName}`,
    "",
    `As a ${actor}, I want to ${task.taskName.toLowerCase()}, so that ${output}.`,
    "",
    `Source step: ${task.stepId}`,
    `Phase: ${nonEmpty(task.phase) || "Unassigned"}`,
    `System: ${nonEmpty(task.system) || "Not specified"}`
  ].join("\n");
}

function renderUserStories(input: ProductDeliveryInput) {
  const storyTasks = input.processTasks.filter(
    (task) => task.rowType === "task" || task.rowType === "gateway"
  );

  return [
    "# User Stories",
    "",
    storyTasks.length > 0
      ? storyTasks.map(renderUserStory).join("\n\n")
      : "No task or gateway rows were found in the Process Task Register."
  ].join("\n");
}

function renderAcceptanceCriteria(input: ProductDeliveryInput) {
  const criteriaTasks = input.processTasks.filter(
    (task) => task.rowType === "task" || task.rowType === "gateway"
  );

  return [
    "# Acceptance Criteria",
    "",
    criteriaTasks
      .map((task) => {
        const given = nonEmpty(task.input) || "valid process input exists";
        const outcome = nonEmpty(task.output) || "the step output is produced";
        const nextStep = task.defaultNextStep ?? task.yesNextStep ?? task.noNextStep;

        return [
          `## ${task.stepId} - ${task.taskName}`,
          "",
          `- Given ${given}`,
          `- When ${task.taskName}`,
          `- Then ${outcome}`,
          nextStep ? `- And the process can continue to ${nextStep}` : "- And the process reaches the expected next state"
        ].join("\n");
      })
      .join("\n\n") || "- [ ] Confirm acceptance criteria after process tasks are added."
  ].join("\n");
}

export function generateProductDeliveryDraft(
  input: ProductDeliveryInput
): ProductDeliveryDraft {
  const brdOutlineMarkdown = renderBrdOutline(input);
  const userStoriesMarkdown = renderUserStories(input);
  const acceptanceCriteriaMarkdown = renderAcceptanceCriteria(input);
  const combinedMarkdown = [
    brdOutlineMarkdown,
    "",
    "---",
    "",
    userStoriesMarkdown,
    "",
    "---",
    "",
    acceptanceCriteriaMarkdown
  ].join("\n");

  return {
    generatedAt: input.generatedAt,
    brdOutlineMarkdown,
    userStoriesMarkdown,
    acceptanceCriteriaMarkdown,
    combinedMarkdown
  };
}
