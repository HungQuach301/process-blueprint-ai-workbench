import type { AIJsonSchema } from "@/lib/ai/schemas/json-schema-validator";
import {
  processTaskJsonSchema,
  processTaskPatchJsonSchema,
  reviewStatusValues,
  customerInteractionTypeValues
} from "@/lib/ai/schemas/process-task-schema";

const stringSchema = { type: "string" } as const;
const stringArraySchema = {
  type: "array",
  items: stringSchema
} as const;
const nullableStringSchema = {
  type: ["string", "null"]
} as const;
const booleanSchema = { type: "boolean" } as const;

const recommendationTypeValues = [
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

const connectionFieldValues = [
  "defaultNextStep",
  "yesNextStep",
  "noNextStep"
] as const;

const updateTaskFieldOperationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "stepId", "field", "value"],
  properties: {
    kind: { const: "UpdateTaskField" },
    stepId: stringSchema,
    field: {
      enum: Object.keys(processTaskPatchJsonSchema.properties ?? {})
    },
    value: {
      anyOf: [
        stringSchema,
        nullableStringSchema,
        { type: "boolean" },
        { type: "number" }
      ]
    }
  }
} satisfies AIJsonSchema;

const createTaskAfterOperationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "anchorStepId", "task"],
  properties: {
    kind: { enum: ["CreateTaskAfter", "CreateTaskBefore"] },
    anchorStepId: stringSchema,
    task: processTaskJsonSchema,
    connect: booleanSchema
  }
} satisfies AIJsonSchema;

const insertTaskBetweenOperationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "sourceStepId", "targetStepId", "task"],
  properties: {
    kind: { const: "InsertTaskBetween" },
    sourceStepId: stringSchema,
    targetStepId: stringSchema,
    task: processTaskJsonSchema
  }
} satisfies AIJsonSchema;

const splitTaskOperationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "targetStepId", "newTasks"],
  properties: {
    kind: { const: "SplitTask" },
    targetStepId: stringSchema,
    newTasks: {
      type: "array",
      minItems: 1,
      items: processTaskJsonSchema
    }
  }
} satisfies AIJsonSchema;

const createGatewayOperationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "gatewayTask"],
  properties: {
    kind: { const: "CreateGateway" },
    gatewayTask: processTaskJsonSchema,
    afterStepId: stringSchema,
    beforeStepId: stringSchema
  }
} satisfies AIJsonSchema;

const addGatewayBranchOperationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "gatewayStepId", "branch"],
  properties: {
    kind: { const: "AddGatewayBranch" },
    gatewayStepId: stringSchema,
    branch: { enum: [...connectionFieldValues] },
    targetStepId: stringSchema,
    newTask: processTaskJsonSchema
  }
} satisfies AIJsonSchema;

const updateConnectionOperationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "stepId", "field", "value"],
  properties: {
    kind: { const: "UpdateConnection" },
    stepId: stringSchema,
    field: { enum: [...connectionFieldValues] },
    value: nullableStringSchema
  }
} satisfies AIJsonSchema;

const createLaneOperationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "laneName", "laneType"],
  properties: {
    kind: { const: "CreateLane" },
    laneName: stringSchema,
    laneType: { enum: ["actor", "system", "data"] },
    targetStepIds: stringArraySchema
  }
} satisfies AIJsonSchema;

const assignActorOperationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "stepId", "actor"],
  properties: {
    kind: { const: "AssignActor" },
    stepId: stringSchema,
    actor: stringSchema,
    actorLane: stringSchema
  }
} satisfies AIJsonSchema;

const assignSystemOperationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "stepId", "system"],
  properties: {
    kind: { const: "AssignSystem" },
    stepId: stringSchema,
    system: stringSchema,
    systemLane: stringSchema
  }
} satisfies AIJsonSchema;

const setInteractionTypeOperationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "stepId", "customerInteractionType"],
  properties: {
    kind: { const: "SetInteractionType" },
    stepId: stringSchema,
    customerInteractionType: { enum: [...customerInteractionTypeValues] }
  }
} satisfies AIJsonSchema;

const markReviewStatusOperationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "stepId", "reviewStatus"],
  properties: {
    kind: { const: "MarkReviewStatus" },
    stepId: stringSchema,
    reviewStatus: { enum: [...reviewStatusValues] }
  }
} satisfies AIJsonSchema;

export const qaRecommendationOperationJsonSchema = {
  anyOf: [
    updateTaskFieldOperationSchema,
    createTaskAfterOperationSchema,
    insertTaskBetweenOperationSchema,
    splitTaskOperationSchema,
    createGatewayOperationSchema,
    addGatewayBranchOperationSchema,
    updateConnectionOperationSchema,
    createLaneOperationSchema,
    assignActorOperationSchema,
    assignSystemOperationSchema,
    setInteractionTypeOperationSchema,
    markReviewStatusOperationSchema
  ]
} satisfies AIJsonSchema;

export const qaRecommendationJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "description",
    "confidence",
    "impact",
    "targetStepIds",
    "previewText",
    "requiresConfirmation"
  ],
  properties: {
    id: stringSchema,
    source: { enum: ["rule", "ai", "hybrid", "human-template"] },
    issueId: stringSchema,
    issueCode: stringSchema,
    title: stringSchema,
    description: stringSchema,
    rationale: stringSchema,
    confidence: { enum: ["low", "medium", "high"] },
    impact: { enum: ["low", "medium", "high"] },
    riskLevel: { enum: ["low", "medium", "high"] },
    targetStepIds: {
      type: "array",
      minItems: 1,
      items: stringSchema
    },
    recommendationType: { enum: [...recommendationTypeValues] },
    type: { enum: [...recommendationTypeValues] },
    operations: {
      type: "array",
      items: qaRecommendationOperationJsonSchema
    },
    previewText: stringSchema,
    patch: processTaskPatchJsonSchema,
    newTasks: {
      type: "array",
      items: processTaskJsonSchema
    },
    warnings: stringArraySchema,
    requiresConfirmation: booleanSchema,
    complianceTags: stringArraySchema
  }
} satisfies AIJsonSchema;

export const qaRecommendationArrayJsonSchema = {
  type: "array",
  items: qaRecommendationJsonSchema
} satisfies AIJsonSchema;

export const aiProcessQaOutputSchema = qaRecommendationArrayJsonSchema;
