import { createMockAIResponseMeta } from "@/lib/ai/ai-orchestration-types";
import type { AIQARequest, AIQAResponse } from "@/lib/ai/ai-qa-types";

export function runMockAIQA(request: AIQARequest): AIQAResponse {
  return {
    recommendations: [],
    meta: createMockAIResponseMeta(request.context, [], [
      "Mock AI QA scaffold only; no external API call was made."
    ])
  };
}
