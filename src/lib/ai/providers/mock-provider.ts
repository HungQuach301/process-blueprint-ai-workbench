import {
  createRequestId,
  parseJsonIfPossible,
  type AIModelRequest,
  type AIProviderAdapter,
  type AIProviderResponse
} from "@/lib/ai/providers/provider-types";

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
      const rawText = JSON.stringify(rawJson);

      return {
        rawText,
        rawJson,
        parsedJson: parseJsonIfPossible(rawText),
        providerId: "mock",
        model: request.model || options.model || "mock-local",
        requestId,
        latencyMs: Date.now() - startedAt,
        warnings: ["Mock provider only. No external API call was made."],
        externalApiCalled: false
      };
    }
  };
}
