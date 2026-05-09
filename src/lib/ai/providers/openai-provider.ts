import type {
  AIModelMessage,
  AIModelRequest,
  AIModelResponse,
  AIProviderAdapter,
  StructuredAIRequest,
  StructuredAIResponse
} from "@/lib/ai/provider-types";

type OpenAIProviderOptions = {
  apiKey?: string;
  model?: string;
};

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

function buildInput(request: AIModelRequest): AIModelMessage[] {
  if (request.messages?.length) {
    return request.messages;
  }

  return [
    {
      role: "system",
      content:
        "You are a server-side AI provider adapter. Return structured, reviewable output only."
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          skillId: request.skillId,
          payload: request.payload
        },
        null,
        2
      )
    }
  ];
}

function getApiKey(options: OpenAIProviderOptions) {
  return options.apiKey || process.env.OPENAI_API_KEY || "";
}

function getModel(request: AIModelRequest, options: OpenAIProviderOptions) {
  return (
    request.model ||
    options.model ||
    process.env.AI_MODEL_OPENAI ||
    DEFAULT_OPENAI_MODEL
  );
}

function createJsonSchemaFormat(request: StructuredAIRequest) {
  const schema = request.outputSchema || {
    type: "object",
    additionalProperties: true
  };

  return {
    type: "json_schema",
    name: `${request.skillId.replace(/[^a-zA-Z0-9_-]/g, "_")}_output`.slice(
      0,
      64
    ),
    schema,
    strict: false
  };
}

function parseStructuredJson(content: string) {
  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new Error("OpenAI structured output was not valid JSON.");
  }
}

function findOpenAIRefusal(raw: unknown): string | undefined {
  if (typeof raw !== "object" || raw === null) {
    return undefined;
  }

  const record = raw as Record<string, unknown>;

  if (typeof record.refusal === "string") {
    return record.refusal;
  }

  if (Array.isArray(record.output)) {
    for (const outputItem of record.output) {
      const refusal = findOpenAIRefusal(outputItem);

      if (refusal) {
        return refusal;
      }
    }
  }

  if (Array.isArray(record.content)) {
    for (const contentItem of record.content) {
      const refusal = findOpenAIRefusal(contentItem);

      if (refusal) {
        return refusal;
      }
    }
  }

  return undefined;
}

export function createOpenAIProvider(
  options: OpenAIProviderOptions
): AIProviderAdapter {
  return {
    getStatus() {
      return getApiKey(options) ? "configured" : "missing-key";
    },

    async run(request) {
      const apiKey = getApiKey(options);

      if (!apiKey) {
        throw new Error("OPENAI_API_KEY is required when real AI is enabled.");
      }

      const model = getModel(request, options);

      if (!model) {
        throw new Error("AI_MODEL_OPENAI is required when OpenAI real AI is enabled.");
      }

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          input: buildInput(request)
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI request failed with status ${response.status}.`);
      }

      const raw = (await response.json()) as {
        output_text?: string;
      };

      return {
        provider: "openai",
        model,
        content: raw.output_text ?? "",
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
          provider: "openai",
          model,
          skillId: request.skillId,
          error: "OPENAI_API_KEY is required for OpenAI structured output.",
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
        const response = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model,
            input: buildInput(request),
            text: {
              format: createJsonSchemaFormat(request)
            }
          })
        });

        if (!response.ok) {
          return {
            ok: false,
            mode: "provider-backed",
            provider: "openai",
            model,
            skillId: request.skillId,
            error: `OpenAI structured request failed with status ${response.status}.`,
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
          output_text?: string;
          error?: { message?: string };
        };

        if (raw.error?.message) {
          return {
            ok: false,
            mode: "provider-backed",
            provider: "openai",
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

        const refusal = findOpenAIRefusal(raw);

        if (refusal) {
          return {
            ok: false,
            mode: "provider-backed",
            provider: "openai",
            model,
            skillId: request.skillId,
            error: `OpenAI refused the structured output request: ${refusal}`,
            meta: {
              externalApiCalled: true,
              realAIEnabled: true,
              validationPassed: false,
              outputSchemaProvided: request.outputSchema !== undefined,
              providerStatus: "configured"
            }
          };
        }

        const result = parseStructuredJson(raw.output_text ?? "");

        return {
          ok: true,
          mode: "provider-backed",
          provider: "openai",
          model,
          skillId: request.skillId,
          result,
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
          provider: "openai",
          model,
          skillId: request.skillId,
          error:
            error instanceof Error
              ? error.message
              : "OpenAI structured output request failed.",
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
