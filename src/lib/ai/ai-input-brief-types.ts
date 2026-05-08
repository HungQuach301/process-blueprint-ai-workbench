import type { ProcessTask } from "@/lib/models/process-task";
import type { TemplateProfile } from "@/lib/models/template-profile";
import type {
  AIOrchestrationContext,
  AIOrchestrationResponseMeta
} from "@/lib/ai/ai-orchestration-types";

export type AIInputBriefRequest = {
  context: AIOrchestrationContext;
  briefText: string;
  templateProfiles?: TemplateProfile[];
  sourceName?: string;
};

export type AIInputBriefResponse = {
  draftProcessTasks: ProcessTask[];
  meta: AIOrchestrationResponseMeta;
};
