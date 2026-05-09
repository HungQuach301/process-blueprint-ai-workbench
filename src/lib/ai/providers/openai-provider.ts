export type AIModelMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIModelRequest = {
  skillId: string;
  payload: unknown;
  model?: string;
  messages?: AIModelMessage[];
};

export type AIModelResponse = {
  provider: "openai";
  model: string;
  content: string;
  raw?: unknown;
  externalApiCalled: boolean;
};

export interface ModelProvider {
  run(request: AIModelRequest): Promise<AIModelResponse>;
}

type OpenAIProviderOptions = {
  apiKey: string;
  model: string;
};

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

export function createOpenAIProvider(
  options: OpenAIProviderOptions
): ModelProvider {
  return {
    async run(request) {
      if (!options.apiKey) {
        throw new Error("OPENAI_API_KEY is required when real AI is enabled.");
      }

      const model = request.model || options.model;

      if (!model) {
        throw new Error("AI_MODEL is required when real AI is enabled.");
      }

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
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
    }
  };
}
