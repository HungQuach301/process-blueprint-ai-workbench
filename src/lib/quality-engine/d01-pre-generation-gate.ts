import type { ProcessTask } from "@/lib/models/process-task";
import type { TemplateProfile } from "@/lib/models/template-profile";
import {
  createGateVerdict,
  type GateIssue,
  type GateScoreBreakdown,
  type GateScoreDimension,
  type GateVerdict
} from "@/lib/quality-engine/gate-verdict";

export const D01_PRE_GENERATION_GATE_ID = "d01-pre-generation";

const BPMN_READY_TYPES = new Set([
  "startEvent",
  "endEvent",
  "task",
  "userTask",
  "manualTask",
  "serviceTask",
  "sendTask",
  "scriptTask",
  "businessRuleTask",
  "exclusiveGateway",
  "parallelGateway",
  "inclusiveGateway"
]);

function normalize(value: string | null | undefined) {
  return (value ?? "").trim();
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
    affectedArtifact: "D01 BPMN",
    affectedIds,
    evidence,
    metadata
  };
}

function checkTemplateReadiness(templateProfile: TemplateProfile) {
  const issues: GateIssue[] = [];

  if (templateProfile.type !== "bpmn") {
    issues.push(
      createIssue({
        code: "d01_template_not_bpmn",
        severity: "blocker",
        title: "Selected template is not a BPMN template",
        description:
          "D01 generation expects a BPMN template profile before creating BPMN XML.",
        affectedIds: [templateProfile.id],
        evidence: [`type=${templateProfile.type}`]
      })
    );
  }

  if (templateProfile.outputType && templateProfile.outputType !== "BPMN") {
    issues.push(
      createIssue({
        code: "d01_template_output_not_bpmn",
        severity: "blocker",
        title: "Selected template output type is not BPMN",
        description:
          "The selected D01 template should declare outputType=BPMN.",
        affectedIds: [templateProfile.id],
        evidence: [`outputType=${templateProfile.outputType}`]
      })
    );
  }

  if (
    templateProfile.notationStandard &&
    templateProfile.notationStandard !== "BPMN 2.0"
  ) {
    issues.push(
      createIssue({
        code: "d01_template_notation_not_bpmn20",
        severity: "warning",
        title: "Template notation is not BPMN 2.0",
        description:
          "D01 output is BPMN 2.0 XML, so a different notation standard should be reviewed before generation.",
        affectedIds: [templateProfile.id],
        evidence: [`notationStandard=${templateProfile.notationStandard}`]
      })
    );
  }

  if (
    Array.isArray(templateProfile.mandatoryFields) &&
    templateProfile.mandatoryFields.length > 0
  ) {
    const missingFoundationalFields = ["stepId", "bpmnType", "taskName"].filter(
      (field) => !templateProfile.mandatoryFields.includes(field)
    );

    if (missingFoundationalFields.length > 0) {
      issues.push(
        createIssue({
          code: "d01_template_missing_foundational_fields",
          severity: "warning",
          title: "Template mandatory fields may be too light for BPMN",
          description:
            "D01 generation can run, but the selected template does not mark all foundational BPMN fields as mandatory.",
          affectedIds: [templateProfile.id],
          evidence: missingFoundationalFields
        })
      );
    }
  }

  return issues;
}

function checkTaskStructure(processTasks: ProcessTask[]) {
  const issues: GateIssue[] = [];

  if (processTasks.length === 0) {
    issues.push(
      createIssue({
        code: "d01_empty_process_tasks",
        severity: "blocker",
        title: "Process Task Register is empty",
        description:
          "D01 BPMN generation needs at least one Process Task row."
      })
    );
    return issues;
  }

  const stepIds = new Set<string>();
  const duplicateStepIds = new Set<string>();

  processTasks.forEach((task) => {
    const stepId = normalize(task.stepId);

    if (!stepId) {
      issues.push(
        createIssue({
          code: "d01_missing_step_id",
          severity: "blocker",
          title: "Task is missing stepId",
          description:
            "D01 BPMN nodes and sequence flows require stable stepId values.",
          affectedIds: [task.id]
        })
      );
      return;
    }

    if (stepIds.has(stepId)) {
      duplicateStepIds.add(stepId);
    }

    stepIds.add(stepId);
  });

  duplicateStepIds.forEach((stepId) => {
    issues.push(
      createIssue({
        code: "d01_duplicate_step_id",
        severity: "blocker",
        title: "Duplicate stepId",
        description:
          "D01 BPMN generation needs unique stepId values so nodes and flows can be traced safely.",
        affectedIds: [stepId],
        evidence: [`stepId=${stepId}`]
      })
    );
  });

  const hasStartEvent = processTasks.some(
    (task) => task.rowType === "start" || task.bpmnType === "startEvent"
  );
  const hasEndEvent = processTasks.some(
    (task) => task.rowType === "end" || task.bpmnType === "endEvent"
  );

  if (!hasStartEvent) {
    issues.push(
      createIssue({
        code: "d01_missing_start_event",
        severity: "blocker",
        title: "Missing start event",
        description:
          "D01 BPMN should include a start event before generation."
      })
    );
  }

  if (!hasEndEvent) {
    issues.push(
      createIssue({
        code: "d01_missing_end_event",
        severity: "blocker",
        title: "Missing end event",
        description:
          "D01 BPMN should include an end event before generation."
      })
    );
  }

  processTasks.forEach((task) => {
    const affectedIds = [task.stepId || task.id];

    if (!BPMN_READY_TYPES.has(task.bpmnType)) {
      issues.push(
        createIssue({
          code: "d01_unsupported_bpmn_type",
          severity: "warning",
          title: "BPMN type may not map directly to D01",
          description:
            "The D01 generator may fall back to a generic task mapping for this BPMN type.",
          affectedIds,
          evidence: [`bpmnType=${task.bpmnType}`]
        })
      );
    }

    if (!hasValue(task.taskName)) {
      issues.push(
        createIssue({
          code: "d01_missing_task_name",
          severity: "blocker",
          title: "Task name is missing",
          description:
            "D01 BPMN nodes need task names for readable diagram labels.",
          affectedIds
        })
      );
    }

    const nextRefs = [
      { field: "defaultNextStep", value: task.defaultNextStep },
      { field: "yesNextStep", value: task.yesNextStep },
      { field: "noNextStep", value: task.noNextStep }
    ];

    nextRefs.forEach((nextRef) => {
      const targetStepId = normalize(nextRef.value);

      if (!targetStepId) {
        return;
      }

      if (!stepIds.has(targetStepId)) {
        issues.push(
          createIssue({
            code: "d01_invalid_next_step_reference",
            severity: "blocker",
            title: "Next-step reference points to a missing step",
            description:
              "The D01 generator skips missing sequence-flow targets, so this should be fixed before generation.",
            affectedIds,
            evidence: [`${nextRef.field}=${targetStepId}`],
            metadata: {
              sourceStepId: task.stepId,
              field: nextRef.field,
              targetStepId
            }
          })
        );
      }
    });

    const isGateway =
      task.rowType === "gateway" ||
      task.bpmnType === "exclusiveGateway" ||
      task.bpmnType === "parallelGateway" ||
      task.bpmnType === "inclusiveGateway";

    if (isGateway) {
      if (!hasValue(task.conditionQuestion)) {
        issues.push(
          createIssue({
            code: "d01_gateway_missing_condition",
            severity: "warning",
            title: "Gateway condition is missing",
            description:
              "A gateway should have a clear condition question for BPMN review.",
            affectedIds
          })
        );
      }

      if (!hasValue(task.yesNextStep) || !hasValue(task.noNextStep)) {
        issues.push(
          createIssue({
            code: "d01_gateway_missing_branches",
            severity: "blocker",
            title: "Gateway branches are incomplete",
            description:
              "A D01 gateway should include both yesNextStep and noNextStep before generation.",
            affectedIds
          })
        );
      }
    }

    if (!hasValue(task.actor) && !hasValue(task.system)) {
      issues.push(
        createIssue({
          code: "d01_missing_actor_system_visibility",
          severity: "warning",
          title: "Actor/system visibility is missing",
          description:
            "D01 can still generate, but missing actor and system values reduce lane and ownership clarity.",
          affectedIds
        })
      );
    }
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
      id: "processStructure",
      label: "Process structure",
      maxScore: 40,
      score: Math.max(
        0,
        40 -
          issues.filter((issue) =>
            [
              "d01_empty_process_tasks",
              "d01_missing_start_event",
              "d01_missing_end_event",
              "d01_missing_step_id",
              "d01_duplicate_step_id",
              "d01_missing_task_name"
            ].includes(issue.code)
          ).length *
            10
      )
    },
    {
      id: "flowIntegrity",
      label: "Flow integrity",
      maxScore: 30,
      score: Math.max(
        0,
        30 -
          issues.filter((issue) =>
            [
              "d01_invalid_next_step_reference",
              "d01_gateway_missing_condition",
              "d01_gateway_missing_branches"
            ].includes(issue.code)
          ).length *
            10
      )
    },
    {
      id: "templateFit",
      label: "D01 template fit",
      maxScore: 20,
      score: Math.max(
        0,
        20 -
          issues.filter((issue) =>
            [
              "d01_template_not_bpmn",
              "d01_template_output_not_bpmn",
              "d01_template_notation_not_bpmn20",
              "d01_template_missing_foundational_fields"
            ].includes(issue.code)
          ).length *
            10
      )
    },
    {
      id: "visibility",
      label: "Actor/system visibility",
      maxScore: 10,
      score: Math.max(
        0,
        10 -
          issues.filter(
            (issue) => issue.code === "d01_missing_actor_system_visibility"
          ).length *
            2
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
          : "pass"
  }));

  return {
    score: dimensions.reduce((total, dimension) => total + (dimension.score ?? 0), 0),
    maxScore: dimensions.reduce(
      (total, dimension) => total + (dimension.maxScore ?? 0),
      0
    ),
    dimensions: dimensions.map((dimension) => ({
      ...dimension,
      notes:
        dimension.id === "processStructure"
          ? [`rows=${processTasks.length}`]
          : dimension.id === "templateFit"
            ? [`templateId=${templateProfile.id}`]
            : undefined
    }))
  };
}

export function runD01PreGenerationGate(
  processTasks: ProcessTask[],
  templateProfile: TemplateProfile
): GateVerdict {
  const issues = [
    ...checkTaskStructure(processTasks),
    ...checkTemplateReadiness(templateProfile)
  ];

  return createGateVerdict({
    gateId: D01_PRE_GENERATION_GATE_ID,
    gateName: "D01 BPMN Pre-generation Gate",
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

