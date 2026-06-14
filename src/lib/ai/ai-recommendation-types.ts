import type { ProcessTask } from "@/lib/models/process-task";
import type { TemplateProfile } from "@/lib/models/template-profile";
import type { QARecommendation } from "@/lib/recommendation-engine/types";
import type {
  AIOrchestrationContext,
  AIOrchestrationResponseMeta
} from "@/lib/ai/ai-orchestration-types";

export type AIRecommendationRequest = {
  context: AIOrchestrationContext;
  processTasks: ProcessTask[];
  templateProfiles?: TemplateProfile[];
  targetStepIds?: string[];
  issueCodes?: string[];
};

export type AIRecommendationResponse = {
  recommendations: QARecommendation[];
  meta: AIOrchestrationResponseMeta;
};
