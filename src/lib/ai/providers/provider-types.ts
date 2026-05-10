export type AIProviderId = "mock" | "product-ai" | "openai" | "claude";

export type AIModelMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIModelRequest = {
  skillId: string;
  payload: unknown;
  model?: string;
  messages?: AIModelMessage[];
  requestId?: string;
};

export type AITokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type AIProviderResponse = {
  rawText?: string;
  rawJson?: unknown;
  parsedJson?: unknown;
  providerId: AIProviderId;
  model: string;
  requestId: string;
  tokenUsage?: AITokenUsage;
  latencyMs: number;
  warnings: string[];
  externalApiCalled: boolean;
};

export interface AIProviderAdapter {
  providerId: AIProviderId;
  run(request: AIModelRequest): Promise<AIProviderResponse>;
}

export function createRequestId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function extractJsonText(value: string) {
  const trimmedValue = value.trim();
  const fencedJsonMatch = trimmedValue.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedJsonMatch?.[1]) {
    return fencedJsonMatch[1].trim();
  }

  return trimmedValue;
}

export function parseJsonIfPossible(rawText: string | undefined) {
  if (!rawText?.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(extractJsonText(rawText));
  } catch {
    return undefined;
  }
}

export function buildDefaultMessages(request: AIModelRequest): AIModelMessage[] {
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
