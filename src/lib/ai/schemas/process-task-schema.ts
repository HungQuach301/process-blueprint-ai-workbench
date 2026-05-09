import type { AIJsonSchema } from "@/lib/ai/schemas/json-schema-validator";

export const rowTypeValues = [
  "phase",
  "group",
  "task",
  "gateway",
  "start",
  "end",
  "event",
  "data",
  "annotation"
] as const;

export const bpmnTypeValues = [
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
] as const;

export const taskNatureValues = [
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
] as const;

export const dataActionValues = [
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
] as const;

export const reviewStatusValues = [
  "draft",
  "needsReview",
  "approved",
  "rejected"
] as const;

export const customerInteractionTypeValues = [
  "None",
  "Customer Action",
  "Front-stage People",
  "Front-stage System",
  "Back-stage People",
  "Back-stage System",
  "Support Process",
  "Data / Control"
] as const;

export const channelValues = [
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
] as const;

const stringSchema = { type: "string" } as const;
const nullableStringSchema = {
  type: ["string", "null"]
} as const;

export const processTaskJsonSchema = {
  type: "object",
  additionalProperties: false,
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
    "comment"
  ],
  properties: {
    id: stringSchema,
    stepId: stringSchema,
    parentStepId: nullableStringSchema,
    rowType: { enum: [...rowTypeValues] },
    bpmnType: { enum: [...bpmnTypeValues] },
    taskNature: { enum: [...taskNatureValues] },
    phase: stringSchema,
    group: stringSchema,
    actor: stringSchema,
    actorLane: stringSchema,
    system: stringSchema,
    systemLane: stringSchema,
    dataObject: stringSchema,
    dataAction: { enum: [...dataActionValues] },
    taskName: stringSchema,
    input: stringSchema,
    output: stringSchema,
    defaultNextStep: nullableStringSchema,
    conditionQuestion: stringSchema,
    yesNextStep: nullableStringSchema,
    noNextStep: nullableStringSchema,
    exception: stringSchema,
    exceptionHandling: stringSchema,
    sla: stringSchema,
    riskControl: stringSchema,
    sourceRef: stringSchema,
    reviewStatus: { enum: [...reviewStatusValues] },
    comment: stringSchema,
    customerInteractionType: { enum: [...customerInteractionTypeValues] },
    channel: { enum: [...channelValues] }
  }
} satisfies AIJsonSchema;

export const processTaskPatchJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    rowType: { enum: [...rowTypeValues] },
    bpmnType: { enum: [...bpmnTypeValues] },
    taskNature: { enum: [...taskNatureValues] },
    phase: stringSchema,
    group: stringSchema,
    actor: stringSchema,
    actorLane: stringSchema,
    system: stringSchema,
    systemLane: stringSchema,
    dataObject: stringSchema,
    dataAction: { enum: [...dataActionValues] },
    taskName: stringSchema,
    input: stringSchema,
    output: stringSchema,
    defaultNextStep: nullableStringSchema,
    conditionQuestion: stringSchema,
    yesNextStep: nullableStringSchema,
    noNextStep: nullableStringSchema,
    exception: stringSchema,
    exceptionHandling: stringSchema,
    sla: stringSchema,
    riskControl: stringSchema,
    sourceRef: stringSchema,
    reviewStatus: { enum: [...reviewStatusValues] },
    comment: stringSchema,
    customerInteractionType: { enum: [...customerInteractionTypeValues] },
    channel: { enum: [...channelValues] }
  }
} satisfies AIJsonSchema;
