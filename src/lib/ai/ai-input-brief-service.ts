import { createMockAIResponseMeta } from "@/lib/ai/ai-orchestration-types";
import type {
  AIInputBriefRequest,
  AIInputBriefResponse
} from "@/lib/ai/ai-input-brief-types";

export function runMockInputBriefExtraction(
  request: AIInputBriefRequest
): AIInputBriefResponse {
  return {
    draftProcessTasks: [],
    meta: createMockAIResponseMeta(request.context, [], [
      "Mock input brief extraction scaffold only; no external API call was made."
    ])
  };
}
