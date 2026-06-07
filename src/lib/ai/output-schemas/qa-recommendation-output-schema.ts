const QA_RECOMMENDATION_OPERATION_KINDS = [
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

const QA_PATCH_FIELDS = [
  "rowType",
  "bpmnType",
  "taskNature",
  "phase",
  "group",
  "actor",
  "actorLane",
  "system",
  "systemLane",
  "dataObject",
  "dataAction",
  "taskName",
  "input",
  "output",
  "defaultNextStep",
  "conditionQuestion",
  "yesNextStep",
  "noNextStep",
  "exception",
  "exceptionHandling",
  "sla",
  "riskControl",
  "sourceRef",
  "reviewStatus",
  "comment",
  "customerInteractionType",
  "channel"
] as const;

const PROCESS_TASK_FOR_OPERATION_SCHEMA = {
  type: "object",
  properties: {
    id: { type: "string" },
    stepId: { type: "string" },
    parentStepId: { anyOf: [{ type: "string" }, { type: "null" }] },
    rowType: {
      type: "string",
      enum: [
        "phase",
        "group",
        "task",
        "gateway",
        "start",
        "end",
        "event",
        "data",
        "annotation"
      ]
    },
    bpmnType: {
      type: "string",
      enum: [
        "none",
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
        "inclusiveGateway",
        "dataObject",
        "dataStore"
      ]
    },
    taskNature: {
      type: "string",
      enum: [
        "manual",
        "automatic",
        "semiAutomatic",
        "system",
        "decision",
        "approval",
        "integration",
        "notification",
        "control",
        "data"
      ]
    },
    phase: { type: "string" },
    group: { type: "string" },
    actor: { type: "string" },
    actorLane: { type: "string" },
    system: { type: "string" },
    systemLane: { type: "string" },
    dataObject: { type: "string" },
    dataAction: {
      type: "string",
      enum: [
        "none",
        "pull",
        "push",
        "store",
        "create",
        "read",
        "update",
        "delete",
        "validate",
        "approve",
        "reject",
        "send",
        "receive"
      ]
    },
    taskName: { type: "string" },
    input: { type: "string" },
    output: { type: "string" },
    defaultNextStep: { anyOf: [{ type: "string" }, { type: "null" }] },
    conditionQuestion: { type: "string" },
    yesNextStep: { anyOf: [{ type: "string" }, { type: "null" }] },
    noNextStep: { anyOf: [{ type: "string" }, { type: "null" }] },
    exception: { type: "string" },
    exceptionHandling: { type: "string" },
    sla: { type: "string" },
    riskControl: { type: "string" },
    sourceRef: { type: "string" },
    reviewStatus: {
      type: "string",
      enum: ["draft", "needsReview", "approved", "rejected"]
    },
    comment: { type: "string" },
    customerInteractionType: {
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
    channel: {
      type: "string",
      enum: [
        "Portal",
        "Mobile App",
        "Email",
        "SMS",
        "Phone Call",
        "RM Meeting",
        "Branch",
        "LOS",
        "OCR",
        "CIC",
        "Internal System",
        "Document Store",
        "Other"
      ]
    }
  },
  required: [
    "id",
    "stepId",
    "parentStepId",
    "rowType",
    "bpmnType",
    "taskNature",
    "phase",
    "group",
    "actor",
    "actorLane",
    "system",
    "systemLane",
    "dataObject",
    "dataAction",
    "taskName",
    "input",
    "output",
    "defaultNextStep",
    "conditionQuestion",
    "yesNextStep",
    "noNextStep",
    "exception",
    "exceptionHandling",
    "sla",
    "riskControl",
    "sourceRef",
    "reviewStatus",
    "comment",
    "customerInteractionType",
    "channel"
  ],
  additionalProperties: false
} as const;

const nullableStringSchema = {
  anyOf: [{ type: "string" }, { type: "null" }]
} as const;

const nullableProcessTaskSchema = {
  anyOf: [PROCESS_TASK_FOR_OPERATION_SCHEMA, { type: "null" }]
} as const;

const operationSchema = (
  kind: (typeof QA_RECOMMENDATION_OPERATION_KINDS)[number],
  properties: Record<string, unknown>,
  required: string[]
) =>
  ({
    type: "object",
    properties: {
      kind: { type: "string", enum: [kind] },
      ...properties
    },
    required: ["kind", ...required],
    additionalProperties: false
  }) as const;

const QA_RECOMMENDATION_OPERATION_SCHEMA = {
  anyOf: [
    operationSchema(
      "UpdateTaskField",
      {
        stepId: { type: "string" },
        field: { type: "string", enum: QA_PATCH_FIELDS },
        value: {
          anyOf: [
            { type: "string" },
            { type: "number" },
            { type: "boolean" },
            { type: "null" }
          ]
        }
      },
      ["stepId", "field", "value"]
    ),
    operationSchema(
      "CreateTaskAfter",
      {
        anchorStepId: { type: "string" },
        task: PROCESS_TASK_FOR_OPERATION_SCHEMA,
        connect: { type: "boolean" }
      },
      ["anchorStepId", "task", "connect"]
    ),
    operationSchema(
      "CreateTaskBefore",
      {
        anchorStepId: { type: "string" },
        task: PROCESS_TASK_FOR_OPERATION_SCHEMA,
        connect: { type: "boolean" }
      },
      ["anchorStepId", "task", "connect"]
    ),
    operationSchema(
      "InsertTaskBetween",
      {
        sourceStepId: { type: "string" },
        targetStepId: { type: "string" },
        task: PROCESS_TASK_FOR_OPERATION_SCHEMA
      },
      ["sourceStepId", "targetStepId", "task"]
    ),
    operationSchema(
      "SplitTask",
      {
        targetStepId: { type: "string" },
        newTasks: {
          type: "array",
          items: PROCESS_TASK_FOR_OPERATION_SCHEMA
        }
      },
      ["targetStepId", "newTasks"]
    ),
    operationSchema(
      "CreateGateway",
      {
        gatewayTask: PROCESS_TASK_FOR_OPERATION_SCHEMA,
        afterStepId: nullableStringSchema,
        beforeStepId: nullableStringSchema
      },
      ["gatewayTask", "afterStepId", "beforeStepId"]
    ),
    operationSchema(
      "AddGatewayBranch",
      {
        gatewayStepId: { type: "string" },
        branch: {
          type: "string",
          enum: ["defaultNextStep", "yesNextStep", "noNextStep"]
        },
        targetStepId: nullableStringSchema,
        newTask: nullableProcessTaskSchema
      },
      ["gatewayStepId", "branch", "targetStepId", "newTask"]
    ),
    operationSchema(
      "UpdateConnection",
      {
        stepId: { type: "string" },
        field: {
          type: "string",
          enum: ["defaultNextStep", "yesNextStep", "noNextStep"]
        },
        value: nullableStringSchema
      },
      ["stepId", "field", "value"]
    ),
    operationSchema(
      "CreateLane",
      {
        laneName: { type: "string" },
        laneType: { type: "string", enum: ["actor", "system", "data"] },
        targetStepIds: { type: "array", items: { type: "string" } }
      },
      ["laneName", "laneType", "targetStepIds"]
    ),
    operationSchema(
      "AssignActor",
      {
        stepId: { type: "string" },
        actor: { type: "string" },
        actorLane: { type: "string" }
      },
      ["stepId", "actor", "actorLane"]
    ),
    operationSchema(
      "AssignSystem",
      {
        stepId: { type: "string" },
        system: { type: "string" },
        systemLane: { type: "string" }
      },
      ["stepId", "system", "systemLane"]
    ),
    operationSchema(
      "SetInteractionType",
      {
        stepId: { type: "string" },
        customerInteractionType: {
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
        }
      },
      ["stepId", "customerInteractionType"]
    ),
    operationSchema(
      "MarkReviewStatus",
      {
        stepId: { type: "string" },
        reviewStatus: {
          type: "string",
          enum: ["draft", "needsReview", "approved", "rejected"]
        }
      },
      ["stepId", "reviewStatus"]
    )
  ]
} as const;

export const QA_RECOMMENDATION_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    recommendations: {
      type: "array",
      items: {
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
          targetStepIds: {
            type: "array",
            items: { type: "string" }
          },
          recommendationType: {
            type: "string",
            enum: QA_RECOMMENDATION_TYPES
          },
          operations: {
            type: "array",
            items: QA_RECOMMENDATION_OPERATION_SCHEMA
          },
          previewText: { type: "string" },
          warnings: {
            type: "array",
            items: { type: "string" }
          },
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
      }
    }
  },
  required: ["recommendations"],
  additionalProperties: false
} as const;
