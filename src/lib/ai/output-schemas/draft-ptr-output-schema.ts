const PROCESS_TASK_REQUIRED_FIELDS = [
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
  "comment"
] as const;

export const DRAFT_PTR_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    draftProcessTasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          stepId: { type: "string" },
          parentStepId: {
            anyOf: [{ type: "string" }, { type: "null" }]
          },
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
          defaultNextStep: {
            anyOf: [{ type: "string" }, { type: "null" }]
          },
          conditionQuestion: { type: "string" },
          yesNextStep: {
            anyOf: [{ type: "string" }, { type: "null" }]
          },
          noNextStep: {
            anyOf: [{ type: "string" }, { type: "null" }]
          },
          exception: { type: "string" },
          exceptionHandling: { type: "string" },
          sla: { type: "string" },
          riskControl: { type: "string" },
          sourceRef: { type: "string" },
          reviewStatus: {
            type: "string",
            enum: ["draft", "needsReview", "approved", "rejected"]
          },
          comment: { type: "string" }
        },
        required: PROCESS_TASK_REQUIRED_FIELDS,
        additionalProperties: false
      }
    },
    assumptions: {
      type: "array",
      items: { type: "string" }
    },
    openQuestions: {
      type: "array",
      items: { type: "string" }
    },
    qualityIssues: {
      type: "array",
      items: { type: "string" }
    },
    sourceSummary: { type: "string" },
    confidence: {
      type: "string",
      enum: ["low", "medium", "high"]
    },
    inputLanguage: {
      type: "string",
      enum: ["vi", "en"]
    },
    outputLanguage: {
      type: "string",
      enum: ["vi", "en", "bilingual"]
    }
  },
  required: [
    "draftProcessTasks",
    "assumptions",
    "openQuestions",
    "qualityIssues",
    "sourceSummary",
    "confidence",
    "inputLanguage",
    "outputLanguage"
  ],
  additionalProperties: false
} as const;
