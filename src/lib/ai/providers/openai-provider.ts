import {
  buildDefaultMessages,
  createRequestId,
  parseJsonIfPossible,
  type AIModelRequest,
  type AIProviderAdapter,
  type AIProviderResponse
} from "@/lib/ai/providers/provider-types";
import { adaptProviderResponse } from "@/lib/ai/providers/response-adapter";

type OpenAIProviderOptions = {
  apiKey: string;
  model: string;
};

export function createOpenAIProvider(
  options: OpenAIProviderOptions
): AIProviderAdapter {
  return {
    providerId: "openai",
    async run(request: AIModelRequest): Promise<AIProviderResponse> {
      if (!options.apiKey) {
        throw new Error("OPENAI_API_KEY is required when OpenAI is enabled.");
      }

      const model = request.model || options.model;

      if (!model) {
        throw new Error("AI_MODEL or OPENAI_MODEL is required when OpenAI is enabled.");
      }

      const requestId = request.requestId ?? createRequestId("openai");
      const startedAt = Date.now();
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          input: buildDefaultMessages(request)
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI request failed with status ${response.status}.`);
      }

      const rawJson = await response.json();
      const adapted = adaptProviderResponse(rawJson, "openai-responses");
      const rawText = adapted.content;

      return {
        rawText,
        rawJson,
        parsedJson: parseJsonIfPossible(rawText),
        providerId: "openai",
        model: adapted.model === "unknown" ? model : adapted.model,
        requestId,
        tokenUsage: {
          inputTokens: adapted.inputTokens,
          outputTokens: adapted.outputTokens,
          totalTokens: adapted.totalTokens
        },
        latencyMs: Date.now() - startedAt,
        warnings: rawText ? [] : ["OpenAI response did not include output_text."],
        externalApiCalled: true
      };
    }
  };
}

export type { AIModelRequest, AIProviderResponse };
