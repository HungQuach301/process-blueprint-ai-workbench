const STRING_ARRAY_SCHEMA = {
  type: "array",
  items: { type: "string" }
} as const;

const QA_RECOMMENDATION_TYPES = [
  "UpdateField",
  "SplitTask",
  "CreateTask",
  "CreateLane",
  "AssignSystem",
  "AssignActor",
  "ChangeBpmnType",
  "ChangeRowType",
  "SetInteractionType",
  "MarkReviewStatus",
  "AddGatewayBranch"
] as const;

const QA_OPERATION_KINDS = [
  "UpdateTaskField",
  "CreateTaskAfter",
  "CreateTaskBefore",
  "InsertTaskBetween",
  "SplitTask",
  "CreateGateway",
  "AddGatewayBranch",
  "UpdateConnection",
  "CreateLane",
  "AssignActor",
  "AssignSystem",
  "SetInteractionType",
  "MarkReviewStatus"
] as const;

const TEMPLATE_RECOMMENDATION_TYPES = [
  "UpdateMetadata",
  "UpdateRules",
  "AddMandatoryField",
  "ImproveTemplateFit",
  "MarkForReview"
] as const;

const QA_OPERATION_SCHEMA = {
  type: "object",
  properties: {
    kind: { type: "string", enum: QA_OPERATION_KINDS },
    stepId: { anyOf: [{ type: "string" }, { type: "null" }] },
    targetStepId: { anyOf: [{ type: "string" }, { type: "null" }] },
    sourceStepId: { anyOf: [{ type: "string" }, { type: "null" }] },
    anchorStepId: { anyOf: [{ type: "string" }, { type: "null" }] },
    gatewayStepId: { anyOf: [{ type: "string" }, { type: "null" }] },
    afterStepId: { anyOf: [{ type: "string" }, { type: "null" }] },
    beforeStepId: { anyOf: [{ type: "string" }, { type: "null" }] },
    field: { anyOf: [{ type: "string" }, { type: "null" }] },
    value: {
      anyOf: [
        { type: "string" },
        { type: "number" },
        { type: "boolean" },
        { type: "null" }
      ]
    },
    actor: { anyOf: [{ type: "string" }, { type: "null" }] },
    actorLane: { anyOf: [{ type: "string" }, { type: "null" }] },
    system: { anyOf: [{ type: "string" }, { type: "null" }] },
    systemLane: { anyOf: [{ type: "string" }, { type: "null" }] },
    laneName: { anyOf: [{ type: "string" }, { type: "null" }] },
    laneType: {
      anyOf: [
        { type: "string", enum: ["actor", "system", "data"] },
        { type: "null" }
      ]
    },
    branch: {
      anyOf: [
        { type: "string", enum: ["defaultNextStep", "yesNextStep", "noNextStep"] },
        { type: "null" }
      ]
    },
    targetStepIds: { anyOf: [STRING_ARRAY_SCHEMA, { type: "null" }] },
    reviewStatus: {
      anyOf: [
        { type: "string", enum: ["draft", "needsReview", "approved", "rejected"] },
        { type: "null" }
      ]
    },
    customerInteractionType: {
      anyOf: [
        {
          type: "string",
          enum: [
            "None",
            "Customer Action",
            "Front-stage People",
            "Front-stage System",
            "Back-stage People",
            "Back-stage System",
            "Support Process",
            "Data / Control"
          ]
        },
        { type: "null" }
      ]
    }
  },
  required: [
    "kind",
    "stepId",
    "targetStepId",
    "sourceStepId",
    "anchorStepId",
    "gatewayStepId",
    "afterStepId",
    "beforeStepId",
    "field",
    "value",
    "actor",
    "actorLane",
    "system",
    "systemLane",
    "laneName",
    "laneType",
    "branch",
    "targetStepIds",
    "reviewStatus",
    "customerInteractionType"
  ],
  additionalProperties: false
} as const;

const QA_RECOMMENDATION_ITEM_SCHEMA = {
  type: "object",
  properties: {
    id: { type: "string" },
    source: { type: "string", enum: ["ai", "hybrid"] },
    title: { type: "string" },
    description: { type: "string" },
    rationale: { type: "string" },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    impact: { type: "string", enum: ["low", "medium", "high"] },
    riskLevel: { type: "string", enum: ["low", "medium", "high"] },
    targetStepIds: STRING_ARRAY_SCHEMA,
    recommendationType: {
      type: "string",
      enum: QA_RECOMMENDATION_TYPES
    },
    operations: {
      type: "array",
      items: QA_OPERATION_SCHEMA
    },
    previewText: { type: "string" },
    warnings: STRING_ARRAY_SCHEMA,
    requiresConfirmation: { type: "boolean", enum: [true] }
  },
  required: [
    "id",
    "source",
    "title",
    "description",
    "rationale",
    "confidence",
    "impact",
    "riskLevel",
    "targetStepIds",
    "recommendationType",
    "operations",
    "previewText",
    "warnings",
    "requiresConfirmation"
  ],
  additionalProperties: false
} as const;

const TEMPLATE_RECOMMENDATION_ITEM_SCHEMA = {
  type: "object",
  properties: {
    id: { type: "string" },
    templateId: { type: "string" },
    source: { type: "string", enum: ["ai"] },
    type: { type: "string", enum: TEMPLATE_RECOMMENDATION_TYPES },
    title: { type: "string" },
    description: { type: "string" },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    riskLevel: { type: "string", enum: ["low", "medium", "high"] },
    affectedFields: STRING_ARRAY_SCHEMA,
    warnings: STRING_ARRAY_SCHEMA,
    requiresConfirmation: { type: "boolean", enum: [true] }
  },
  required: [
    "id",
    "templateId",
    "source",
    "type",
    "title",
    "description",
    "confidence",
    "riskLevel",
    "affectedFields",
    "warnings",
    "requiresConfirmation"
  ],
  additionalProperties: false
} as const;

export const ARTIFACT_REVIEW_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    recommendations: {
      type: "array",
      items: QA_RECOMMENDATION_ITEM_SCHEMA
    },
    templateRecommendations: {
      type: "array",
      items: TEMPLATE_RECOMMENDATION_ITEM_SCHEMA
    },
    artifactWarnings: STRING_ARRAY_SCHEMA,
    assumptions: STRING_ARRAY_SCHEMA,
    openQuestions: STRING_ARRAY_SCHEMA
  },
  required: [
    "recommendations",
    "templateRecommendations",
    "artifactWarnings",
    "assumptions",
    "openQuestions"
  ],
  additionalProperties: false
} as const;
