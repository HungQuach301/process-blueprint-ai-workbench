import type {
  AIModelRequest,
  AIModelResponse,
  AIProviderAdapter,
  StructuredAIRequest,
  StructuredAIResponse
} from "@/lib/ai/provider-types";

export function createMockProvider(): AIProviderAdapter {
  return {
    getStatus() {
      return "mock-only";
    },

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
    },

    async generateStructured(
      request: StructuredAIRequest
    ): Promise<StructuredAIResponse> {
      return {
        ok: true,
        mode: "mock",
        provider: "mock",
        model: request.model || "mock",
        skillId: request.skillId,
        result: {
          message:
            "Mock AI response. Real AI is disabled by default and no external API call was made.",
          payload: request.payload
        },
        meta: {
          externalApiCalled: false,
          realAIEnabled: false,
          validationPassed: true,
          outputSchemaProvided: request.outputSchema !== undefined,
          providerStatus: "mock-only"
        }
      };
    }
  };
}
