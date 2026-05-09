import type {
  AIModelMessage,
  AIModelRequest,
  AIModelResponse,
  AIProviderAdapter,
  StructuredAIRequest,
  StructuredAIResponse
} from "@/lib/ai/provider-types";

type AnthropicProviderOptions = {
  apiKey?: string;
  model?: string;
};

const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-sonnet-latest";
const STRUCTURED_OUTPUT_TOOL_NAME = "return_structured_output";

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

function getApiKey(options: AnthropicProviderOptions) {
  return options.apiKey || process.env.ANTHROPIC_API_KEY || "";
}

function getModel(
  request: AIModelRequest,
  options: AnthropicProviderOptions
) {
  return (
    request.model ||
    options.model ||
    process.env.AI_MODEL_ANTHROPIC ||
    DEFAULT_ANTHROPIC_MODEL
  );
}

function getInputSchema(request: StructuredAIRequest) {
  return (
    request.outputSchema || {
      type: "object",
      additionalProperties: true
    }
  );
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
    getStatus() {
      return getApiKey(options) ? "configured" : "missing-key";
    },

    async run(request): Promise<AIModelResponse> {
      const apiKey = getApiKey(options);

      if (!apiKey) {
        throw new Error(
          "ANTHROPIC_API_KEY is required when Anthropic real AI is enabled."
        );
      }

      const model = getModel(request, options);

      if (!model) {
        throw new Error(
          "AI_MODEL_ANTHROPIC is required when Anthropic real AI is enabled."
        );
      }

      const { system, messages } = splitSystemMessage(buildMessages(request));
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
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
    },

    async generateStructured(
      request: StructuredAIRequest
    ): Promise<StructuredAIResponse> {
      const apiKey = getApiKey(options);
      const model = getModel(request, options);

      if (!apiKey) {
        return {
          ok: false,
          mode: "provider-backed",
          provider: "anthropic",
          model,
          skillId: request.skillId,
          error:
            "ANTHROPIC_API_KEY is required for Anthropic structured output.",
          meta: {
            externalApiCalled: false,
            realAIEnabled: true,
            validationPassed: false,
            outputSchemaProvided: request.outputSchema !== undefined,
            providerStatus: "missing-key"
          }
        };
      }

      try {
        const { system, messages } = splitSystemMessage(buildMessages(request));
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model,
            max_tokens: 4096,
            system,
            messages,
            tools: [
              {
                name: STRUCTURED_OUTPUT_TOOL_NAME,
                description:
                  "Return the final answer as structured JSON that matches the provided input schema.",
                input_schema: getInputSchema(request)
              }
            ],
            tool_choice: {
              type: "tool",
              name: STRUCTURED_OUTPUT_TOOL_NAME
            }
          })
        });

        if (!response.ok) {
          return {
            ok: false,
            mode: "provider-backed",
            provider: "anthropic",
            model,
            skillId: request.skillId,
            error: `Anthropic structured request failed with status ${response.status}.`,
            meta: {
              externalApiCalled: true,
              realAIEnabled: true,
              validationPassed: false,
              outputSchemaProvided: request.outputSchema !== undefined,
              providerStatus: "configured"
            }
          };
        }

        const raw = (await response.json()) as {
          content?: Array<{
            type?: string;
            name?: string;
            input?: unknown;
            text?: string;
          }>;
          error?: { message?: string };
        };

        if (raw.error?.message) {
          return {
            ok: false,
            mode: "provider-backed",
            provider: "anthropic",
            model,
            skillId: request.skillId,
            error: raw.error.message,
            meta: {
              externalApiCalled: true,
              realAIEnabled: true,
              validationPassed: false,
              outputSchemaProvided: request.outputSchema !== undefined,
              providerStatus: "configured"
            }
          };
        }

        const toolUse = raw.content?.find(
          (item) =>
            item.type === "tool_use" &&
            item.name === STRUCTURED_OUTPUT_TOOL_NAME &&
            item.input !== undefined
        );

        if (!toolUse) {
          return {
            ok: false,
            mode: "provider-backed",
            provider: "anthropic",
            model,
            skillId: request.skillId,
            error: "Anthropic response did not include structured tool_use output.",
            meta: {
              externalApiCalled: true,
              realAIEnabled: true,
              validationPassed: false,
              outputSchemaProvided: request.outputSchema !== undefined,
              providerStatus: "configured"
            }
          };
        }

        return {
          ok: true,
          mode: "provider-backed",
          provider: "anthropic",
          model,
          skillId: request.skillId,
          result: toolUse.input,
          meta: {
            externalApiCalled: true,
            realAIEnabled: true,
            validationPassed: true,
            outputSchemaProvided: request.outputSchema !== undefined,
            providerStatus: "configured"
          }
        };
      } catch (error) {
        return {
          ok: false,
          mode: "provider-backed",
          provider: "anthropic",
          model,
          skillId: request.skillId,
          error:
            error instanceof Error
              ? error.message
              : "Anthropic structured output request failed.",
          meta: {
            externalApiCalled: true,
            realAIEnabled: true,
            validationPassed: false,
            outputSchemaProvided: request.outputSchema !== undefined,
            providerStatus: "configured"
          }
        };
      }
    }
  };
}
