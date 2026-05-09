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
  source?: "ai" | "rule" | "hybrid";
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

export type TemplateQualityScore = {
  templateId: string;
  score: number;
  maxScore: number;
  summary: string;
  strengths: string[];
  gaps: string[];
};

export type AITemplateReviewRequest = {
  context: AIOrchestrationContext;
  templateProfiles: TemplateProfile[];
  outputType?: string;
  processType?: string;
  businessDomain?: string;
  processTasks?: AIOrchestrationContext["processTasks"];
};

export type AITemplateReviewResponse = {
  recommendations: TemplateRecommendation[];
  qualityScore?: TemplateQualityScore;
  meta: AIOrchestrationResponseMeta;
};
