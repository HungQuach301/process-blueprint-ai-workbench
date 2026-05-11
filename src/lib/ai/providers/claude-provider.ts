import "server-only";

import {
  buildDefaultMessages,
  createRequestId,
  parseJsonIfPossible,
  type AIModelMessage,
  type AIModelRequest,
  type AIProviderAdapter,
  type AIProviderResponse,
  type AITokenUsage
} from "@/lib/ai/providers/provider-types";

type ClaudeProviderOptions = {
  apiKey: string;
  model: string;
};

function splitClaudeMessages(messages: AIModelMessage[]) {
  const systemMessages = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const conversationMessages = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content
    }));

  return {
    system: systemMessages || undefined,
    messages:
      conversationMessages.length > 0
        ? conversationMessages
        : [
            {
              role: "user",
              content: "Return structured JSON for the requested skill."
            }
          ]
  };
}

function getClaudeOutputText(raw: unknown) {
  if (typeof raw !== "object" || raw === null || !("content" in raw)) {
    return "";
  }

  const content = raw.content;

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((item) => {
      if (
        typeof item === "object" &&
        item !== null &&
        "type" in item &&
        item.type === "text" &&
        "text" in item &&
        typeof item.text === "string"
      ) {
        return item.text;
      }

      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function getClaudeTokenUsage(raw: unknown): AITokenUsage | undefined {
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
    inputTokens !== undefined && outputTokens !== undefined
      ? inputTokens + outputTokens
      : undefined;

  return inputTokens !== undefined ||
    outputTokens !== undefined ||
    totalTokens !== undefined
    ? { inputTokens, outputTokens, totalTokens }
    : undefined;
}

export function createClaudeProvider(
  options: ClaudeProviderOptions
): AIProviderAdapter {
  return {
    providerId: "claude",
    async run(request: AIModelRequest): Promise<AIProviderResponse> {
      if (!options.apiKey) {
        throw new Error("ANTHROPIC_API_KEY is required when Claude is enabled.");
      }

      const model = request.model || options.model;

      if (!model) {
        throw new Error("CLAUDE_MODEL or AI_MODEL is required when Claude is enabled.");
      }

      const requestId = request.requestId ?? createRequestId("claude");
      const startedAt = Date.now();
      const { system, messages } = splitClaudeMessages(
        buildDefaultMessages(request)
      );
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": options.apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system,
          messages
        })
      });

      if (!response.ok) {
        throw new Error(`Claude request failed with status ${response.status}.`);
      }

      const rawJson = await response.json();
      const rawText = getClaudeOutputText(rawJson);

      return {
        rawText,
        rawJson,
        parsedJson: parseJsonIfPossible(rawText),
        providerId: "claude",
        model,
        requestId,
        tokenUsage: getClaudeTokenUsage(rawJson),
        latencyMs: Date.now() - startedAt,
        warnings: rawText ? [] : ["Claude response did not include text content."],
        externalApiCalled: true
      };
    }
  };
}
