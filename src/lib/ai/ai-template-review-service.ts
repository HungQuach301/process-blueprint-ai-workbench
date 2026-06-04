import { createMockAIResponseMeta } from "@/lib/ai/ai-orchestration-types";
import type {
  AITemplateReviewRequest,
  AITemplateReviewResponse,
  TemplateRecommendation
} from "@/lib/ai/ai-template-review-types";
import type { TemplateProfile } from "@/lib/models/template-profile";

const coreMandatoryFields = [
  "stepId",
  "rowType",
  "bpmnType",
  "taskName",
  "reviewStatus"
];
const bpmnMandatoryFields = ["actor", "actorLane", "system", "systemLane"];
const serviceBlueprintMandatoryFields = [
  "actor",
  "system",
  "taskName",
  "input",
  "output",
  "customerInteractionType",
  "channel"
];
const serviceBlueprintRows = [
  "CUSTOMER ACTIONS",
  "FRONT-STAGE INTERACTIONS - PEOPLE",
  "FRONT-STAGE INTERACTIONS - SYSTEM / CHANNEL",
  "BACK-STAGE INTERACTIONS - PEOPLE",
  "BACK-STAGE INTERACTIONS - SYSTEM / TOOLS",
  "SUPPORT PROCESSES",
  "DATA / CONTROL",
  "OUTCOME / END STATE"
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createRecommendation(input: {
  template: TemplateProfile;
  idSuffix: string;
  type: TemplateRecommendation["type"];
  title: string;
  description: string;
  confidence?: TemplateRecommendation["confidence"];
  riskLevel?: TemplateRecommendation["riskLevel"];
  affectedFields: TemplateRecommendation["affectedFields"];
  warnings?: string[];
}): TemplateRecommendation {
  return {
    id: `mock-template-review-${input.template.id}-${input.idSuffix}`,
    templateId: input.template.id,
    source: "ai",
    type: input.type,
    title: input.title,
    description: input.description,
    confidence: input.confidence ?? "high",
    riskLevel: input.riskLevel ?? "low",
    affectedFields: input.affectedFields,
    requiresConfirmation: true,
    warnings: input.warnings
  };
}

function getMissingFields(template: TemplateProfile, fields: string[]) {
  const currentFields = new Set(template.mandatoryFields);

  return fields.filter((field) => !currentFields.has(field));
}

function getRowRuleText(template: TemplateProfile) {
  return JSON.stringify(template.rowRules ?? {}).toUpperCase();
}

function hasAnyObjectContent(value: unknown) {
  return isObject(value) && Object.keys(value).length > 0;
}

function reviewBpmnFit(
  template: TemplateProfile,
  recommendations: TemplateRecommendation[],
  warnings: string[]
) {
  if (
    template.type !== "bpmn" ||
    template.outputType !== "BPMN" ||
    template.notationStandard !== "BPMN 2.0"
  ) {
    recommendations.push(
      createRecommendation({
        template,
        idSuffix: "bpmn-fit",
        type: "UpdateMetadata",
        title: "Review BPMN metadata fit",
        description:
          "BPMN templates should use type bpmn, outputType BPMN, and notationStandard BPMN 2.0.",
        affectedFields: ["type", "outputType", "notationStandard"]
      })
    );
  }

  const missingFields = getMissingFields(template, [
    ...coreMandatoryFields,
    ...bpmnMandatoryFields
  ]);

  if (missingFields.length > 0) {
    recommendations.push(
      createRecommendation({
        template,
        idSuffix: "bpmn-mandatory-fields",
        type: "AddMandatoryField",
        title: "Add BPMN mandatory fields",
        description: `BPMN artifact traceability is stronger when mandatoryFields include: ${missingFields.join(", ")}.`,
        affectedFields: ["mandatoryFields"]
      })
    );
  }

  if (!hasAnyObjectContent(template.laneRules)) {
    recommendations.push(
      createRecommendation({
        template,
        idSuffix: "bpmn-lane-rules",
        type: "UpdateRules",
        title: "Review BPMN lane rules",
        description:
          "Lane rules are empty or too thin. Review actor/system lane coverage before using this template for BPMN generation.",
        affectedFields: ["laneRules"]
      })
    );
  }

  if (!hasAnyObjectContent(template.connectorRules)) {
    warnings.push(
      "BPMN connector rules are empty or not structured; conditional and default flows may need manual review."
    );
  }
}

function reviewServiceBlueprintFit(
  template: TemplateProfile,
  recommendations: TemplateRecommendation[],
  warnings: string[]
) {
  if (
    template.type !== "serviceBlueprint" ||
    template.outputType !== "Service Blueprint" ||
    template.notationStandard !== "Service Blueprint"
  ) {
    recommendations.push(
      createRecommendation({
        template,
        idSuffix: "service-blueprint-fit",
        type: "UpdateMetadata",
        title: "Review Service Blueprint metadata fit",
        description:
          "Service Blueprint templates should use type serviceBlueprint, outputType Service Blueprint, and notationStandard Service Blueprint.",
        affectedFields: ["type", "outputType", "notationStandard"]
      })
    );
  }

  const missingFields = getMissingFields(template, serviceBlueprintMandatoryFields);

  if (missingFields.length > 0) {
    recommendations.push(
      createRecommendation({
        template,
        idSuffix: "service-blueprint-mandatory-fields",
        type: "AddMandatoryField",
        title: "Add Service Blueprint mandatory fields",
        description: `Service Blueprint cards are clearer when mandatoryFields include: ${missingFields.join(", ")}.`,
        affectedFields: ["mandatoryFields"]
      })
    );
  }

  const rowRuleText = getRowRuleText(template);
  const missingRows = serviceBlueprintRows.filter(
    (row) => !rowRuleText.includes(row)
  );

  if (missingRows.length > 0) {
    recommendations.push(
      createRecommendation({
        template,
        idSuffix: "service-blueprint-row-rules",
        type: "UpdateRules",
        title: "Review Service Blueprint row rules",
        description: `Row rules may be missing service blueprint layers: ${missingRows.slice(0, 4).join(", ")}${missingRows.length > 4 ? ", ..." : ""}.`,
        affectedFields: ["rowRules"],
        warnings: [
          "Do not merge multiple ProcessTask rows into one Service Blueprint card."
        ]
      })
    );
  }

  if (!hasAnyObjectContent(template.taskCardRules)) {
    warnings.push(
      "Task card rules are empty or not structured; confirm the 3-box card model before export."
    );
  }
}

function reviewCommonFit(
  template: TemplateProfile,
  recommendations: TemplateRecommendation[],
  warnings: string[],
  assumptions: string[]
) {
  if (!template.businessDomain || !template.processType) {
    recommendations.push(
      createRecommendation({
        template,
        idSuffix: "classification",
        type: "ImproveTemplateFit",
        title: "Complete business domain and process type",
        description:
          "Template review works better when businessDomain and processType are classified.",
        confidence: "medium",
        affectedFields: ["businessDomain", "processType"]
      })
    );
  }

  if (!hasAnyObjectContent(template.layoutRules)) {
    warnings.push(
      "Layout rules are empty or not structured; long processes may create readability or spacing risks."
    );
  }

  if (!hasAnyObjectContent(template.connectorRules)) {
    warnings.push(
      "Connector rules are empty or not structured; connector readability should be checked after generation."
    );
  }

  assumptions.push(
    "Mock Template QA reviews TemplateProfile metadata and rule structure only.",
    "Generated BPMN/draw.io artifacts are reviewed by the separate artifact review flow."
  );
}

function calculateQualityScore(
  template: TemplateProfile,
  recommendations: TemplateRecommendation[],
  warnings: string[]
) {
  const score = Math.max(
    40,
    100 - recommendations.length * 12 - warnings.length * 4
  );
  const strengths = [
    `Template ${template.name} is available for review.`,
    template.status === "active"
      ? "Template is marked active."
      : "Template can be reviewed before activation."
  ];
  const gaps = [
    ...recommendations.map((recommendation) => recommendation.title),
    ...warnings
  ];

  return {
    templateId: template.id,
    score,
    maxScore: 100,
    summary:
      score >= 90
        ? "Template appears ready for MVP1-AI use with minor review."
        : score >= 75
          ? "Template is usable but has review items before release."
          : score >= 60
            ? "Template needs review before relying on generated artifacts."
            : "Template has high review risk and should be improved before release.",
    strengths,
    gaps: gaps.length > 0 ? gaps : ["No major mock review gaps detected."]
  };
}

export function runMockTemplateReview(
  request: AITemplateReviewRequest
): AITemplateReviewResponse {
  const template = request.templateProfiles[0];
  const recommendations: TemplateRecommendation[] = [];
  const warnings = ["Mock template review only. No external API call was made."];
  const assumptions: string[] = [];

  if (!template) {
    return {
      recommendations: [],
      warnings,
      assumptions: ["No template profile was provided for review."],
      meta: createMockAIResponseMeta(request.context, warnings, assumptions)
    };
  }

  if (template.type === "bpmn" || template.outputType === "BPMN") {
    reviewBpmnFit(template, recommendations, warnings);
  }

  if (
    template.type === "serviceBlueprint" ||
    template.outputType === "Service Blueprint"
  ) {
    reviewServiceBlueprintFit(template, recommendations, warnings);
  }

  reviewCommonFit(template, recommendations, warnings, assumptions);

  return {
    recommendations,
    qualityScore: calculateQualityScore(template, recommendations, warnings),
    warnings,
    assumptions,
    meta: createMockAIResponseMeta(request.context, warnings, assumptions)
  };
}
