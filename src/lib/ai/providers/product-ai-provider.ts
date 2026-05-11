import "server-only";

import {
  buildDefaultMessages,
  createRequestId,
  parseJsonIfPossible,
  type AIModelRequest,
  type AIProviderAdapter,
  type AIProviderResponse,
  type AITokenUsage
} from "@/lib/ai/providers/provider-types";

type ProductAIProviderOptions = {
  endpoint: string;
  apiKey?: string;
  model: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getProductAIRawText(rawJson: unknown) {
  if (!isObject(rawJson)) {
    return "";
  }

  const candidates = [
    rawJson.rawText,
    rawJson.output_text,
    rawJson.outputText,
    rawJson.content,
    rawJson.text
  ];
  const textCandidate = candidates.find((value) => typeof value === "string");

  return typeof textCandidate === "string" ? textCandidate : "";
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

function getProductAITokenUsage(rawJson: unknown): AITokenUsage | undefined {
  if (!isObject(rawJson) || !isObject(rawJson.tokenUsage)) {
    return undefined;
  }

  const { inputTokens, outputTokens, totalTokens } = rawJson.tokenUsage;

  return {
    inputTokens: typeof inputTokens === "number" ? inputTokens : undefined,
    outputTokens: typeof outputTokens === "number" ? outputTokens : undefined,
    totalTokens: typeof totalTokens === "number" ? totalTokens : undefined
  };
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
          payload: request.payload
        })
      });

      if (!response.ok) {
        throw new Error(`Product AI request failed with status ${response.status}.`);
      }

      const rawJson = await response.json();
      const rawText = getProductAIRawText(rawJson);

      return {
        rawText,
        rawJson,
        parsedJson: getProductAIParsedJson(rawJson, rawText),
        providerId: "product-ai",
        model,
        requestId,
        tokenUsage: getProductAITokenUsage(rawJson),
        latencyMs: Date.now() - startedAt,
        warnings: getProductAIWarnings(rawJson),
        externalApiCalled: true
      };
    }
  };
}
