import type { ProcessTask } from "@/lib/models/process-task";
import type { TemplateProfile } from "@/lib/models/template-profile";

export type AICodingPackInput = {
  processTasks: ProcessTask[];
  selectedD01Template: TemplateProfile;
  selectedD02Template: TemplateProfile;
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
  const phases = groupByPhase(processTasks);

  return Object.entries(phases)
    .map(([phase, tasks]) => [`### ${phase}`, ...tasks.map(renderTaskLine)].join("\n"))
    .join("\n\n");
}

function renderScope(input: AICodingPackInput) {
  const actors = unique(input.processTasks.map((task) => task.actor));
  const systems = unique(input.processTasks.map((task) => task.system));
  const dataObjects = unique(input.processTasks.map((task) => task.dataObject));

  return [
    `Generated at: ${input.generatedAt}`,
    "",
    input.projectContext ? `Project context:\n${input.projectContext}` : "Project context: not provided.",
    "",
    `Process task count: ${input.processTasks.length}`,
    `Actors: ${actors.join(", ") || "Not specified"}`,
    `Systems: ${systems.join(", ") || "Not specified"}`,
    `Data objects: ${dataObjects.join(", ") || "Not specified"}`,
    "",
    `Selected D01 template: ${input.selectedD01Template.name} (${input.selectedD01Template.id})`,
    `Selected D02 template: ${input.selectedD02Template.name} (${input.selectedD02Template.id})`
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
    input.projectContext || "No additional project context was provided.",
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
    `- D01 BPMN: ${input.selectedD01Template.name}`,
    `- D02 Service Blueprint: ${input.selectedD02Template.name}`
  ].join("\n");
}

function renderAcceptanceCriteria(input: AICodingPackInput) {
  const criteria = input.processTasks
    .filter((task) => task.rowType === "task" || task.rowType === "gateway")
    .map((task) => {
      const outcome = nonEmpty(task.output) || "expected output is produced";
      return `- [ ] ${task.stepId}: Given ${nonEmpty(task.input) || "valid input"}, when ${task.taskName}, then ${outcome}.`;
    });

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
    Object.entries(groupByPhase(input.processTasks))
      .map(([phase, tasks]) => [
        `### ${phase}`,
        ...tasks.map((task) => `- ${task.stepId}: Implement support for ${task.taskName}.`)
      ].join("\n"))
      .join("\n\n")
  ].join("\n");
}

function renderTestPlan(input: AICodingPackInput) {
  return [
    "# Test Plan",
    "",
    "## Functional Tests",
    "",
    ...input.processTasks.map((task) => `- [ ] ${task.stepId}: Verify ${task.taskName}.`),
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
      source: {
        processTaskRegister: {
          taskCount: input.processTasks.length,
          stepIds: input.processTasks.map((task) => task.stepId)
        },
        templates: {
          d01: {
            id: input.selectedD01Template.id,
            name: input.selectedD01Template.name,
            type: input.selectedD01Template.type,
            version: input.selectedD01Template.version
          },
          d02: {
            id: input.selectedD02Template.id,
            name: input.selectedD02Template.name,
            type: input.selectedD02Template.type,
            version: input.selectedD02Template.version
          }
        }
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
