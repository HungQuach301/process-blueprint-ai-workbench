import type { AIJsonSchema } from "@/lib/ai/schemas/json-schema-validator";
import { processTaskJsonSchema } from "@/lib/ai/schemas/process-task-schema";

export const draftProcessTaskRegisterJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "draftProcessTasks",
    "assumptions",
    "openQuestions",
    "sourceSummary",
    "confidence",
    "inputLanguage",
    "outputLanguage"
  ],
  properties: {
    draftProcessTasks: {
      type: "array",
      minItems: 1,
      items: processTaskJsonSchema
    },
    assumptions: {
      type: "array",
      items: { type: "string" }
    },
    openQuestions: {
      type: "array",
      items: { type: "string" }
    },
    qualityGateWarnings: {
      type: "array",
      items: { type: "string" }
    },
    sourceSummary: { type: "string" },
    confidence: { enum: ["low", "medium", "high"] },
    inputLanguage: { enum: ["vi", "en"] },
    outputLanguage: { enum: ["vi", "en", "bilingual"] }
  }
} satisfies AIJsonSchema;

export const inputBriefToPtrOutputSchema = draftProcessTaskRegisterJsonSchema;
