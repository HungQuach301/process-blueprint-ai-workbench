import type { ProcessTask } from "@/lib/models/process-task";
import type { TemplateProfile } from "@/lib/models/template-profile";
import type { Workspace } from "@/lib/models/workspace";
import type { QaIssue, QaSeverity } from "@/lib/qa/task-register-rules";

export type ArtifactReadiness = {
  d01BpmnXml?: boolean;
  d02ServiceBlueprintDrawio?: boolean;
  qaReport?: boolean;
};

type QaReportInput = {
  workspace: Workspace;
  processTasks: ProcessTask[];
  templateProfiles: TemplateProfile[];
  qaIssues: QaIssue[];
  artifactReadiness?: ArtifactReadiness;
};

function countBy<T extends string>(values: T[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    const key = value || "(blank)";

    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function renderCountTable(title: string, counts: Record<string, number>) {
  const rows = Object.entries(counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, count]) => `| ${label} | ${count} |`);

  return [`## ${title}`, "", "| Item | Count |", "| --- | ---: |", ...rows, ""].join(
    "\n"
  );
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean))] as string[];
}

function renderList(title: string, values: string[]) {
  return [
    `## ${title}`,
    "",
    values.length > 0 ? values.map((value) => `- ${value}`).join("\n") : "- None",
    ""
  ].join("\n");
}

function renderQaSection(title: string, issues: QaIssue[], severity: QaSeverity) {
  const filteredIssues = issues.filter((issue) => issue.severity === severity);

  if (filteredIssues.length === 0) {
    return [`## ${title}`, "", "No issues.", ""].join("\n");
  }

  return [
    `## ${title}`,
    "",
    "| Step | Task | Message | Suggested fix |",
    "| --- | --- | --- | --- |",
    ...filteredIssues.map(
      (issue) =>
        `| ${issue.stepId} | ${issue.taskName} | ${issue.message} | ${issue.suggestedFix} |`
    ),
    ""
  ].join("\n");
}

function renderTemplates(templates: TemplateProfile[]) {
  if (templates.length === 0) {
    return ["## Selected templates", "", "- None", ""].join("\n");
  }

  return [
    "## Selected templates",
    "",
    "| Name | Type | Version | Status |",
    "| --- | --- | --- | --- |",
    ...templates.map(
      (template) =>
        `| ${template.name} | ${template.type} | ${template.version} | ${template.status} |`
    ),
    ""
  ].join("\n");
}

function renderDataInteractions(tasks: ProcessTask[]) {
  const dataTasks = tasks.filter(
    (task) => task.dataAction !== "none" || task.dataObject.trim()
  );

  if (dataTasks.length === 0) {
    return ["## Data interactions", "", "- None", ""].join("\n");
  }

  return [
    "## Data interactions",
    "",
    "| Step | Action | Data object | System |",
    "| --- | --- | --- | --- |",
    ...dataTasks.map(
      (task) =>
        `| ${task.stepId} | ${task.dataAction} | ${task.dataObject || "(blank)"} | ${task.system || "(blank)"} |`
    ),
    ""
  ].join("\n");
}

function renderGateways(tasks: ProcessTask[]) {
  const gateways = tasks.filter((task) => task.rowType === "gateway");

  if (gateways.length === 0) {
    return ["## Gateway summary", "", "- None", ""].join("\n");
  }

  return [
    "## Gateway summary",
    "",
    "| Step | Question | Yes next | No next |",
    "| --- | --- | --- | --- |",
    ...gateways.map(
      (task) =>
        `| ${task.stepId} | ${task.conditionQuestion || "(blank)"} | ${
          task.yesNextStep || "(blank)"
        } | ${task.noNextStep || "(blank)"} |`
    ),
    ""
  ].join("\n");
}

function renderArtifactList(artifactReadiness?: ArtifactReadiness) {
  const readiness = artifactReadiness ?? {};

  return [
    "## Exported artifacts list",
    "",
    "| Artifact | Ready |",
    "| --- | --- |",
    `| D01 BPMN XML | ${readiness.d01BpmnXml ? "Yes" : "Not generated / unknown"} |`,
    `| D02 Service Blueprint draw.io | ${
      readiness.d02ServiceBlueprintDrawio ? "Yes" : "Not generated / unknown"
    } |`,
    `| QA Report | ${readiness.qaReport ? "Yes" : "This report"} |`,
    ""
  ].join("\n");
}

export function generateQaReportMarkdown({
  workspace,
  processTasks,
  templateProfiles,
  qaIssues,
  artifactReadiness
}: QaReportInput) {
  const bpmnTypeCounts = countBy(processTasks.map((task) => task.bpmnType));
  const actorCounts = countBy(processTasks.map((task) => task.actor || "(blank)"));

  return [
    `# QA Report - ${workspace.name}`,
    "",
    "## Workspace summary",
    "",
    `- Workspace ID: ${workspace.id}`,
    `- Name: ${workspace.name}`,
    `- Description: ${workspace.description}`,
    `- Created at: ${workspace.createdAt}`,
    `- Updated at: ${workspace.updatedAt}`,
    "",
    "## Process scope",
    "",
    workspace.scope || "(No scope provided)",
    "",
    renderTemplates(templateProfiles),
    renderCountTable("Task count by BPMN type", bpmnTypeCounts),
    renderCountTable("Task count by actor", actorCounts),
    renderList("Actor lanes", unique(processTasks.map((task) => task.actorLane))),
    renderList("System lanes", unique(processTasks.map((task) => task.systemLane))),
    renderDataInteractions(processTasks),
    renderGateways(processTasks),
    renderQaSection("QA errors", qaIssues, "error"),
    renderQaSection("QA warnings", qaIssues, "warning"),
    renderQaSection("QA suggestions", qaIssues, "suggestion"),
    "## Open questions / assumptions",
    "",
    "- Report is generated from the current in-browser Process Task Register state.",
    "- Artifact readiness is based on information available to the QA report UI at download time.",
    "- This step does not create Export ZIP.",
    "",
    renderArtifactList(artifactReadiness)
  ].join("\n");
}
