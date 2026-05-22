import {
  buildDefaultMessages,
  createRequestId,
  parseJsonIfPossible,
  type AIModelRequest,
  type AIProviderAdapter,
  type AIProviderResponse,
  type AITokenUsage
} from "@/lib/ai/providers/provider-types";

type OpenAIProviderOptions = {
  apiKey: string;
  model: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getOpenAIOutputText(raw: unknown) {
  if (isObject(raw) && Array.isArray(raw.output)) {
    const outputMessage = raw.output.find(
      (item) => isObject(item) && item.type === "message"
    );

    if (isObject(outputMessage) && Array.isArray(outputMessage.content)) {
      const textContent = outputMessage.content.find(
        (item) =>
          isObject(item) &&
          (item.type === "output_text" || item.type === "text") &&
          typeof item.text === "string"
      );

      if (isObject(textContent) && typeof textContent.text === "string") {
        return textContent.text;
      }
    }
  }

  if (
    isObject(raw) &&
    "output_text" in raw &&
    typeof raw.output_text === "string"
  ) {
    return raw.output_text;
  }

  if (isObject(raw) && Array.isArray(raw.choices)) {
    const firstChoice = raw.choices[0];

    if (
      isObject(firstChoice) &&
      isObject(firstChoice.message) &&
      typeof firstChoice.message.content === "string"
    ) {
      return firstChoice.message.content;
    }
  }

  return "";
}

function getOpenAITokenUsage(raw: unknown): AITokenUsage | undefined {
  if (typeof raw !== "object" || raw === null || !("usage" in raw)) {
    return undefined;
  }

  const usage = raw.usage;

  if (typeof usage !== "object" || usage === null) {
    return undefined;
  }

  const inputTokens =
    "input_tokens" in usage && typeof usage.input_tokens === "number"
      ? usage.input_tokens
      : undefined;
  const outputTokens =
    "output_tokens" in usage && typeof usage.output_tokens === "number"
      ? usage.output_tokens
      : undefined;
  const totalTokens =
    "total_tokens" in usage && typeof usage.total_tokens === "number"
      ? usage.total_tokens
      : inputTokens !== undefined && outputTokens !== undefined
        ? inputTokens + outputTokens
        : undefined;

  return inputTokens !== undefined ||
    outputTokens !== undefined ||
    totalTokens !== undefined
    ? { inputTokens, outputTokens, totalTokens }
    : undefined;
}

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
      const rawText = getOpenAIOutputText(rawJson);

      return {
        rawText,
        rawJson,
        parsedJson: parseJsonIfPossible(rawText),
        providerId: "openai",
        model,
        requestId,
        tokenUsage: getOpenAITokenUsage(rawJson),
        latencyMs: Date.now() - startedAt,
        warnings: rawText ? [] : ["OpenAI response did not include output_text."],
        externalApiCalled: true
      };
    }
  };
}

export type { AIModelRequest, AIProviderResponse };
