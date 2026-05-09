import type {
  AIModelMessage,
  AIModelRequest,
  AIModelResponse,
  AIProviderAdapter
} from "@/lib/ai/provider-types";

type AnthropicProviderOptions = {
  apiKey: string;
  model: string;
};

function buildMessages(request: AIModelRequest): AIModelMessage[] {
  if (request.messages?.length) {
    return request.messages;
  }

  return [
    {
      role: "user",
      content: JSON.stringify(
        {
          skillId: request.skillId,
          payload: request.payload,
          outputSchema: request.outputSchema
        },
        null,
        2
      )
    }
  ];
}

function splitSystemMessage(messages: AIModelMessage[]) {
  const systemMessage = messages.find((message) => message.role === "system");
  const nonSystemMessages = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content
    }));

  return {
    system: systemMessage?.content,
    messages: nonSystemMessages.length
      ? nonSystemMessages
      : [{ role: "user" as const, content: "Return structured JSON." }]
  };
}

export function createAnthropicProvider(
  options: AnthropicProviderOptions
): AIProviderAdapter {
  return {
    async run(request): Promise<AIModelResponse> {
      if (!options.apiKey) {
        throw new Error(
          "ANTHROPIC_API_KEY is required when Anthropic real AI is enabled."
        );
      }

      const model = request.model || options.model;

      if (!model) {
        throw new Error(
          "AI_MODEL_ANTHROPIC is required when Anthropic real AI is enabled."
        );
      }

      const { system, messages } = splitSystemMessage(buildMessages(request));
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
        throw new Error(
          `Anthropic request failed with status ${response.status}.`
        );
      }

      const raw = (await response.json()) as {
        content?: Array<{ type?: string; text?: string }>;
      };
      const content =
        raw.content
          ?.map((item) => (item.type === "text" ? item.text ?? "" : ""))
          .join("")
          .trim() ?? "";

      return {
        provider: "anthropic",
        model,
        content,
        raw,
        externalApiCalled: true
      };
    }
  };
}
