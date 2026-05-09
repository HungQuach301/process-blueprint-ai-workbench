import type {
  AIModelRequest,
  AIModelResponse,
  AIProviderAdapter
} from "@/lib/ai/provider-types";

export function createMockProvider(): AIProviderAdapter {
  return {
    async run(request: AIModelRequest): Promise<AIModelResponse> {
      return {
        provider: "mock",
        model: request.model || "mock",
        content: JSON.stringify({
          message:
            "Mock AI response. Real AI is disabled by default and no external API call was made.",
          payload: request.payload
        }),
        externalApiCalled: false
      };
    }
  };
}
