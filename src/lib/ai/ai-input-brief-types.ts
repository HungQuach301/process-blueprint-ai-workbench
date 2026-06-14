import type { ProcessTask } from "@/lib/models/process-task";
import type { TemplateProfile } from "@/lib/models/template-profile";
import type {
  AIOrchestrationContext,
  AIOrchestrationResponseMeta
} from "@/lib/ai/ai-orchestration-types";

export type StructuredInputBrief = {
  processName: string;
  businessObjective: string;
  scope: string;
  startEvent: string;
  endEvent: string;
  actors: string;
  systems: string;
  dataDocuments: string;
  happyPath: string;
  exceptions: string;
  slaControl: string;
  desiredOutputs: string;
};

export type AIInputBriefRequest = {
  context: AIOrchestrationContext;
  briefText: string;
  structuredBrief?: StructuredInputBrief;
  templateProfiles?: TemplateProfile[];
  sourceName?: string;
};

export type AIInputBriefResponse = {
  draftProcessTasks: ProcessTask[];
  meta: AIOrchestrationResponseMeta;
};
