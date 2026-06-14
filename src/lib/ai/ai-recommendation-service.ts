import { createMockAIResponseMeta } from "@/lib/ai/ai-orchestration-types";
import type {
  AIRecommendationRequest,
  AIRecommendationResponse
} from "@/lib/ai/ai-recommendation-types";

export function runMockAIRecommendations(
  request: AIRecommendationRequest
): AIRecommendationResponse {
  return {
    recommendations: [],
    meta: createMockAIResponseMeta(request.context, [], [
      "Mock AI recommendation scaffold only; no external API call was made."
    ])
  };
}
