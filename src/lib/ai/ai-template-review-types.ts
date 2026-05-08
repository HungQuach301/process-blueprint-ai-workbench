import type { TemplateProfile } from "@/lib/models/template-profile";
import type {
  AIOrchestrationContext,
  AIOrchestrationResponseMeta
} from "@/lib/ai/ai-orchestration-types";

export type TemplateRecommendationType =
  | "UpdateMetadata"
  | "UpdateRules"
  | "AddMandatoryField"
  | "ImproveTemplateFit"
  | "MarkForReview";

export type TemplateRecommendation = {
  id: string;
  templateId: string;
  type: TemplateRecommendationType;
  title: string;
  description: string;
  confidence: "low" | "medium" | "high";
  riskLevel: "low" | "medium" | "high";
  patch?: Partial<TemplateProfile>;
  warnings?: string[];
  affectedFields: Array<keyof TemplateProfile>;
  requiresConfirmation: boolean;
};

export type AITemplateReviewRequest = {
  context: AIOrchestrationContext;
  templateProfiles: TemplateProfile[];
  processTasks?: AIOrchestrationContext["processTasks"];
};

export type AITemplateReviewResponse = {
  recommendations: TemplateRecommendation[];
  meta: AIOrchestrationResponseMeta;
};
