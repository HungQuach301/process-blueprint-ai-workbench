import type { ProcessTask } from "@/lib/models/process-task";
import type { TemplateProfile } from "@/lib/models/template-profile";
import {
  createGateVerdict,
  type GateIssue,
  type GateScoreBreakdown,
  type GateScoreDimension,
  type GateVerdict
} from "@/lib/quality-engine/gate-verdict";

export const D02_PRE_GENERATION_GATE_ID = "d02-pre-generation";

const EXPECTED_SERVICE_BLUEPRINT_ROWS = [
  "CUSTOMER ACTIONS",
  "FRONT-STAGE",
  "BACK-STAGE",
  "SUPPORT PROCESSES",
  "DATA / CONTROL",
  "OUTCOME / END STATE"
];

const MAX_REVIEWABLE_CARDS_PER_PHASE_ROW = 8;

function normalize(value: string | null | undefined) {
  return (value ?? "").trim();
}

function normalizeLower(value: string | null | undefined) {
  return normalize(value).toLowerCase();
}

function hasValue(value: string | null | undefined) {
  return normalize(value).length > 0;
}

function createIssue({
  code,
  severity,
  title,
  description,
  affectedIds,
  evidence,
  metadata
}: Omit<GateIssue, "affectedArtifact">): GateIssue {
  return {
    code,
    severity,
    title,
    description,
    affectedArtifact: "D02 Service Blueprint",
    affectedIds,
    evidence,
    metadata
  };
}

function getConfiguredRows(templateProfile: TemplateProfile) {
  const rows = templateProfile.rowRules.rows;

  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.filter((row): row is string => typeof row === "string");
}

function checkTemplateReadiness(templateProfile: TemplateProfile) {
  const issues: GateIssue[] = [];
  const configuredRows = getConfiguredRows(templateProfile);
  const configuredRowsText = configuredRows.join(" | ").toUpperCase();

  if (templateProfile.type !== "serviceBlueprint") {
    issues.push(
      createIssue({
        code: "d02_template_not_service_blueprint",
        severity: "blocker",
        title: "Selected template is not a Service Blueprint template",
        description:
          "D02 generation expects a serviceBlueprint template profile before creating draw.io XML.",
        affectedIds: [templateProfile.id],
        evidence: [`type=${templateProfile.type}`]
      })
    );
  }

  if (
    templateProfile.outputType &&
    templateProfile.outputType !== "Service Blueprint"
  ) {
    issues.push(
      createIssue({
        code: "d02_template_output_not_service_blueprint",
        severity: "blocker",
        title: "Selected template output type is not Service Blueprint",
        description:
          "The selected D02 template should declare outputType=Service Blueprint.",
        affectedIds: [templateProfile.id],
        evidence: [`outputType=${templateProfile.outputType}`]
      })
    );
  }

  if (
    templateProfile.notationStandard &&
    templateProfile.notationStandard !== "Service Blueprint"
  ) {
    issues.push(
      createIssue({
        code: "d02_template_notation_not_service_blueprint",
        severity: "warning",
        title: "Template notation is not Service Blueprint",
        description:
          "D02 output is a Service Blueprint draw.io artifact, so the selected notation should be reviewed.",
        affectedIds: [templateProfile.id],
        evidence: [`notationStandard=${templateProfile.notationStandard}`]
      })
    );
  }

  if (configuredRows.length === 0) {
    issues.push(
      createIssue({
        code: "d02_template_missing_row_rules",
        severity: "warning",
        title: "Template row rules are missing",
        description:
          "D02 can use default rows, but explicit service blueprint rows improve reviewability.",
        affectedIds: [templateProfile.id]
      })
    );
  } else {
    const missingExpectedRows = EXPECTED_SERVICE_BLUEPRINT_ROWS.filter(
      (expectedRow) => !configuredRowsText.includes(expectedRow)
    );

    if (missingExpectedRows.length > 0) {
      issues.push(
        createIssue({
          code: "d02_template_incomplete_row_coverage",
          severity: "warning",
          title: "Template row coverage may be incomplete",
          description:
            "The selected D02 template does not explicitly include all common Service Blueprint row groups.",
          affectedIds: [templateProfile.id],
          evidence: missingExpectedRows
        })
      );
    }
  }

  const missingFoundationalFields = ["actor", "system", "taskName"].filter(
    (field) => !templateProfile.mandatoryFields.includes(field)
  );

  if (missingFoundationalFields.length > 0) {
    issues.push(
      createIssue({
        code: "d02_template_missing_card_fields",
        severity: "warning",
        title: "Template mandatory fields may be too light for D02 cards",
        description:
          "D02 cards rely on actor, taskName, and system/app fields for the 3-box card layout.",
        affectedIds: [templateProfile.id],
        evidence: missingFoundationalFields
      })
    );
  }

  return issues;
}

function inferBlueprintRowGroup(task: ProcessTask) {
  const actor = normalizeLower(`${task.actor} ${task.actorLane}`);
  const bpmnType = normalizeLower(task.bpmnType);
  const interaction = normalize(task.customerInteractionType);

  if (interaction && interaction !== "None") {
    return interaction;
  }

  if (task.rowType === "end" || bpmnType === "endevent") {
    return "Outcome";
  }

  if (actor.includes("customer") || actor.includes("khach hang")) {
    return "Customer";
  }

  if (actor === "system" || actor.includes("system") || bpmnType === "servicetask") {
    return "Back-stage System";
  }

  if (task.riskControl || task.sla) {
    return "Support";
  }

  return "Back-stage People";
}

function checkTaskReadiness(processTasks: ProcessTask[]) {
  const issues: GateIssue[] = [];

  if (processTasks.length === 0) {
    issues.push(
      createIssue({
        code: "d02_empty_process_tasks",
        severity: "blocker",
        title: "Process Task Register is empty",
        description:
          "D02 Service Blueprint generation needs at least one Process Task row."
      })
    );
    return issues;
  }

  const phaseRowCounts = new Map<string, number>();

  processTasks.forEach((task) => {
    const affectedIds = [task.stepId || task.id];
    const phase = normalize(task.phase);
    const inferredRow = inferBlueprintRowGroup(task);
    const phaseRowKey = `${phase || "Process"}::${inferredRow}`;

    phaseRowCounts.set(phaseRowKey, (phaseRowCounts.get(phaseRowKey) ?? 0) + 1);

    if (!hasValue(task.stepId)) {
      issues.push(
        createIssue({
          code: "d02_missing_step_id",
          severity: "blocker",
          title: "Task is missing stepId",
          description:
            "D02 card and connector generation needs stable stepId values.",
          affectedIds: [task.id]
        })
      );
    }

    if (!phase) {
      issues.push(
        createIssue({
          code: "d02_missing_phase",
          severity: "warning",
          title: "Task phase is missing",
          description:
            "D02 can fall back to a generic Process phase, but explicit phases make the blueprint easier to scan.",
          affectedIds
        })
      );
    }

    if (!hasValue(task.actor)) {
      issues.push(
        createIssue({
          code: "d02_missing_actor",
          severity: "blocker",
          title: "Task actor is missing",
          description:
            "D02 cards use actor in the card header, so missing actor creates low-value cards.",
          affectedIds
        })
      );
    }

    if (!hasValue(task.taskName)) {
      issues.push(
        createIssue({
          code: "d02_missing_task_name",
          severity: "blocker",
          title: "Task name is missing",
          description:
            "D02 cards use taskName in the middle card box and need readable labels.",
          affectedIds
        })
      );
    }

    const systemUseful =
      task.bpmnType === "serviceTask" ||
      task.taskNature === "automatic" ||
      task.taskNature === "system" ||
      task.customerInteractionType === "Front-stage System" ||
      task.customerInteractionType === "Back-stage System";

    if (systemUseful && !hasValue(task.system)) {
      issues.push(
        createIssue({
          code: "d02_missing_system_for_system_task",
          severity: "warning",
          title: "System/app is missing for system-oriented task",
          description:
            "D02 card footers use system/app details; system-oriented tasks should identify the system.",
          affectedIds,
          evidence: [`bpmnType=${task.bpmnType}`, `taskNature=${task.taskNature}`]
        })
      );
    }
  });

  phaseRowCounts.forEach((count, phaseRowKey) => {
    if (count <= MAX_REVIEWABLE_CARDS_PER_PHASE_ROW) {
      return;
    }

    const [phase, rowGroup] = phaseRowKey.split("::");

    issues.push(
      createIssue({
        code: "d02_too_many_cards_in_phase_row",
        severity: "warning",
        title: "Many cards in one phase/row",
        description:
          "D02 can generate dynamic row height, but this phase/row may become dense and should be reviewed.",
        evidence: [
          `phase=${phase}`,
          `rowGroup=${rowGroup}`,
          `cardCount=${count}`,
          `recommendedMax=${MAX_REVIEWABLE_CARDS_PER_PHASE_ROW}`
        ],
        metadata: {
          phase,
          rowGroup,
          cardCount: count
        }
      })
    );
  });

  return issues;
}

function createScoreBreakdown(
  processTasks: ProcessTask[],
  templateProfile: TemplateProfile,
  issues: GateIssue[]
): GateScoreBreakdown {
  const dimensions: GateScoreDimension[] = [
    {
      id: "cardReadiness",
      label: "Card readiness",
      maxScore: 40,
      score: Math.max(
        0,
        40 -
          issues.filter((issue) =>
            [
              "d02_empty_process_tasks",
              "d02_missing_step_id",
              "d02_missing_actor",
              "d02_missing_task_name"
            ].includes(issue.code)
          ).length *
            10
      )
    },
    {
      id: "blueprintContext",
      label: "Blueprint context",
      maxScore: 25,
      score: Math.max(
        0,
        25 -
          issues.filter((issue) =>
            [
              "d02_missing_phase",
              "d02_missing_system_for_system_task",
              "d02_too_many_cards_in_phase_row"
            ].includes(issue.code)
          ).length *
            5
      )
    },
    {
      id: "templateFit",
      label: "D02 template fit",
      maxScore: 25,
      score: Math.max(
        0,
        25 -
          issues.filter((issue) =>
            [
              "d02_template_not_service_blueprint",
              "d02_template_output_not_service_blueprint",
              "d02_template_notation_not_service_blueprint",
              "d02_template_missing_row_rules",
              "d02_template_incomplete_row_coverage",
              "d02_template_missing_card_fields"
            ].includes(issue.code)
          ).length *
            5
      )
    },
    {
      id: "layoutRisk",
      label: "Layout risk",
      maxScore: 10,
      score: Math.max(
        0,
        10 -
          issues.filter(
            (issue) => issue.code === "d02_too_many_cards_in_phase_row"
          ).length *
            5
      )
    }
  ].map((dimension) => ({
    ...dimension,
    status:
      dimension.score === 0
        ? "fail"
        : dimension.score !== undefined &&
            dimension.maxScore !== undefined &&
            dimension.score < dimension.maxScore
          ? "warning"
          : "pass",
    notes:
      dimension.id === "cardReadiness"
        ? [`rows=${processTasks.length}`]
        : dimension.id === "templateFit"
          ? [`templateId=${templateProfile.id}`]
          : undefined
  }));

  return {
    score: dimensions.reduce((total, dimension) => total + (dimension.score ?? 0), 0),
    maxScore: dimensions.reduce(
      (total, dimension) => total + (dimension.maxScore ?? 0),
      0
    ),
    dimensions
  };
}

export function runD02PreGenerationGate(
  processTasks: ProcessTask[],
  templateProfile: TemplateProfile
): GateVerdict {
  const issues = [
    ...checkTaskReadiness(processTasks),
    ...checkTemplateReadiness(templateProfile)
  ];

  return createGateVerdict({
    gateId: D02_PRE_GENERATION_GATE_ID,
    gateName: "D02 Service Blueprint Pre-generation Gate",
    issues,
    score: createScoreBreakdown(processTasks, templateProfile, issues),
    metadata: {
      processTaskCount: processTasks.length,
      templateId: templateProfile.id,
      templateType: templateProfile.type,
      outputType: templateProfile.outputType
    }
  });
}

