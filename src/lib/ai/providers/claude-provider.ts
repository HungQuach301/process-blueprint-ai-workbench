import {
  buildDefaultMessages,
  createRequestId,
  parseJsonIfPossible,
  type AIModelMessage,
  type AIModelRequest,
  type AIProviderAdapter,
  type AIProviderResponse
} from "@/lib/ai/providers/provider-types";
import { adaptProviderResponse } from "@/lib/ai/providers/response-adapter";

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
      const adapted = adaptProviderResponse(rawJson, "claude");
      const rawText = adapted.content;

      return {
        rawText,
        rawJson,
        parsedJson: parseJsonIfPossible(rawText),
        providerId: "claude",
        model: adapted.model === "unknown" ? model : adapted.model,
        requestId,
        tokenUsage: {
          inputTokens: adapted.inputTokens,
          outputTokens: adapted.outputTokens,
          totalTokens: adapted.totalTokens
        },
        latencyMs: Date.now() - startedAt,
        warnings: rawText ? [] : ["Claude response did not include text content."],
        externalApiCalled: true
      };
    }
  };
}
