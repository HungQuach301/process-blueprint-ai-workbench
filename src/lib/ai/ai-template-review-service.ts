import { createMockAIResponseMeta } from "@/lib/ai/ai-orchestration-types";
import type {
  AITemplateReviewRequest,
  AITemplateReviewResponse
} from "@/lib/ai/ai-template-review-types";

export function runMockTemplateReview(
  request: AITemplateReviewRequest
): AITemplateReviewResponse {
  return {
    recommendations: [],
    meta: createMockAIResponseMeta(request.context, [], [
      "Mock template review scaffold only; no external API call was made."
    ])
  };
}
