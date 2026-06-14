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

function createClaudeThinkingConfig({
  model,
  thinkingType,
  budgetTokens,
  warnings
}: {
  model: string;
  thinkingType?: "disabled" | "adaptive" | "enabled";
  budgetTokens?: number;
  warnings: string[];
}) {
  if (!thinkingType || thinkingType === "disabled") {
    return undefined;
  }

  if (model === "claude-opus-4-7") {
    if (budgetTokens) {
      warnings.push(
        "Ignored claudeThinkingBudgetTokens for claude-opus-4-7; adaptive thinking is used."
      );
    }

    return {
      type: "enabled"
    };
  }

  if (thinkingType === "adaptive") {
    return {
      type: "enabled"
    };
  }

  if (model === "claude-sonnet-4-6" && budgetTokens) {
    return {
      type: "enabled",
      budget_tokens: budgetTokens
    };
  }

  if (budgetTokens) {
    warnings.push(
      `Ignored claudeThinkingBudgetTokens because model ${model} is not configured for manual thinking budget.`
    );
  }

  return {
    type: "enabled"
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
      const runtimeWarnings: string[] = [];
      const runtimeOptions = request.runtimeOptions ?? {};
      const thinking = createClaudeThinkingConfig({
        model,
        thinkingType: runtimeOptions.claudeThinkingType,
        budgetTokens: runtimeOptions.claudeThinkingBudgetTokens,
        warnings: runtimeWarnings
      });
      const requestBody: Record<string, unknown> = {
        model,
        max_tokens: runtimeOptions.maxOutputTokens ?? 4096,
        system,
        messages
      };

      if (runtimeOptions.temperature !== undefined) {
        requestBody.temperature = runtimeOptions.temperature;
      }

      if (thinking) {
        requestBody.thinking = thinking;
      }

      if (runtimeOptions.reasoningEffort) {
        runtimeWarnings.push(
          "Ignored reasoningEffort because the selected provider is Claude; use Claude thinking options instead."
        );
      }

      if (runtimeOptions.textVerbosity) {
        runtimeWarnings.push(
          "Ignored textVerbosity because the selected provider is Claude."
        );
      }

      if (runtimeOptions.claudeThinkingEffort) {
        runtimeWarnings.push(
          "Ignored claudeThinkingEffort because this adapter only maps Claude thinking type and budget."
        );
      }

      if (runtimeOptions.claudeThinkingDisplay) {
        runtimeWarnings.push(
          "Ignored claudeThinkingDisplay because thinking display is handled server-side and not sent to Claude."
        );
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": options.apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
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
        warnings: [
          ...runtimeWarnings,
          ...(rawText ? [] : ["Claude response did not include text content."])
        ],
        externalApiCalled: true
      };
    }
  };
}
