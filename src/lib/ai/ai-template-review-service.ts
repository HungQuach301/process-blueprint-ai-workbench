import { createMockAIResponseMeta } from "@/lib/ai/ai-orchestration-types";
import type {
  AITemplateReviewRequest,
  AITemplateReviewResponse
} from "@/lib/ai/ai-template-review-types";

export function runMockTemplateReview(
  request: AITemplateReviewRequest
): AITemplateReviewResponse {
  const template = request.templateProfiles[0];

  return {
    recommendations: template
      ? [
          {
            id: `mock-template-review-${template.id}-metadata`,
            templateId: template.id,
            source: "ai",
            type: "MarkForReview",
            title: "Review template classification metadata",
            description:
              "Mock AI Template Review suggests checking output type, process type, and business domain before using this template for generation.",
            confidence: "medium",
            riskLevel: "low",
            affectedFields: ["outputType", "processType", "businessDomain"],
            requiresConfirmation: true,
            warnings: [
              "Mock template review only. No external API call was made."
            ]
          }
        ]
      : [],
    qualityScore: template
      ? {
          templateId: template.id,
          score: 70,
          maxScore: 100,
          summary:
            "Mock quality score. Template is usable but should be reviewed for classification completeness.",
          strengths: ["Template profile is available for review."],
          gaps: ["Confirm classification metadata and mandatory fields."]
        }
      : undefined,
    meta: createMockAIResponseMeta(request.context, [], [
      "Mock template review scaffold only; no external API call was made."
    ])
  };
}
