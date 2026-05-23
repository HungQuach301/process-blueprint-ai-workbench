import {
  buildDefaultMessages,
  createRequestId,
  parseJsonIfPossible,
  type AIModelRequest,
  type AIProviderAdapter,
  type AIProviderResponse
} from "@/lib/ai/providers/provider-types";
import { adaptProviderResponse } from "@/lib/ai/providers/response-adapter";

type ProductAIProviderOptions = {
  endpoint: string;
  apiKey?: string;
  model: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getProductAIParsedJson(rawJson: unknown, rawText: string) {
  if (isObject(rawJson) && "parsedJson" in rawJson) {
    return rawJson.parsedJson;
  }

  if (isObject(rawJson) && "rawJson" in rawJson) {
    return rawJson.rawJson;
  }

  return parseJsonIfPossible(rawText);
}

function getProductAIWarnings(rawJson: unknown) {
  if (
    isObject(rawJson) &&
    Array.isArray(rawJson.warnings) &&
    rawJson.warnings.every((warning) => typeof warning === "string")
  ) {
    return rawJson.warnings;
  }

  return [];
}

export function createProductAIProvider(
  options: ProductAIProviderOptions
): AIProviderAdapter {
  return {
    providerId: "product-ai",
    async run(request: AIModelRequest): Promise<AIProviderResponse> {
      if (!options.endpoint) {
        throw new Error("PRODUCT_AI_ENDPOINT is required when Product AI is enabled.");
      }

      const model = request.model || options.model;

      if (!model) {
        throw new Error("PRODUCT_AI_MODEL or AI_MODEL is required when Product AI is enabled.");
      }

      const requestId = request.requestId ?? createRequestId("product-ai");
      const startedAt = Date.now();
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };

      if (options.apiKey) {
        headers.Authorization = `Bearer ${options.apiKey}`;
      }

      const response = await fetch(options.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          requestId,
          skillId: request.skillId,
          model,
          messages: buildDefaultMessages(request),
          payload: request.payload,
          runtimeOptions: request.runtimeOptions
        })
      });

      if (!response.ok) {
        throw new Error(`Product AI request failed with status ${response.status}.`);
      }

      const rawJson = await response.json();
      const adapted = adaptProviderResponse(rawJson, "product-ai");
      const rawText = adapted.content;

      return {
        rawText,
        rawJson,
        parsedJson: getProductAIParsedJson(rawJson, rawText),
        providerId: "product-ai",
        model: adapted.model === "unknown" ? model : adapted.model,
        requestId,
        tokenUsage: {
          inputTokens: adapted.inputTokens,
          outputTokens: adapted.outputTokens,
          totalTokens: adapted.totalTokens
        },
        latencyMs: Date.now() - startedAt,
        warnings: getProductAIWarnings(rawJson),
        externalApiCalled: true
      };
    }
  };
}
