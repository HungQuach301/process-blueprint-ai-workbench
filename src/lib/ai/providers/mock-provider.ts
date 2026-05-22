import {
  createRequestId,
  parseJsonIfPossible,
  type AIModelRequest,
  type AIProviderAdapter,
  type AIProviderResponse
} from "@/lib/ai/providers/provider-types";
import { adaptProviderResponse } from "@/lib/ai/providers/response-adapter";

type MockProviderOptions = {
  model?: string;
};

export function createMockProvider(
  options: MockProviderOptions = {}
): AIProviderAdapter {
  return {
    providerId: "mock",
    async run(request: AIModelRequest): Promise<AIProviderResponse> {
      const requestId = request.requestId ?? createRequestId("mock");
      const startedAt = Date.now();
      const rawJson = {
        message:
          "Mock provider response. No external API call was made.",
        skillId: request.skillId,
        payload: request.payload
      };
      const adapted = adaptProviderResponse(rawJson, "mock");
      const rawText = adapted.content;

      return {
        rawText,
        rawJson,
        parsedJson: parseJsonIfPossible(rawText),
        providerId: "mock",
        model: request.model || options.model || adapted.model || "mock-local",
        requestId,
        tokenUsage: {
          inputTokens: adapted.inputTokens,
          outputTokens: adapted.outputTokens,
          totalTokens: adapted.totalTokens
        },
        latencyMs: Date.now() - startedAt,
        warnings: ["Mock provider only. No external API call was made."],
        externalApiCalled: false
      };
    }
  };
}
