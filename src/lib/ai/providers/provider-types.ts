export type AIProviderId = "mock" | "product-ai" | "openai" | "claude";

export type AIModelMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIProviderRuntimeOptions = {
  reasoningEffort?: "none" | "low" | "medium" | "high" | "xhigh";
  textVerbosity?: "low" | "medium" | "high";
  claudeThinkingType?: "disabled" | "adaptive" | "enabled";
  claudeThinkingEffort?: "low" | "medium" | "high" | "xhigh";
  claudeThinkingBudgetTokens?: number;
  claudeThinkingDisplay?: "summarized" | "omitted";
  maxOutputTokens?: number;
  temperature?: number;
};

export type AIModelRequest = {
  skillId: string;
  payload: unknown;
  model?: string;
  messages?: AIModelMessage[];
  requestId?: string;
  supportsStructuredOutput?: boolean;
  runtimeOptions?: AIProviderRuntimeOptions;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickEnum<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  optionName: string,
  warnings: string[]
): T | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (allowedValues.includes(value as T)) {
    return value as T;
  }

  warnings.push(`Ignored unsupported runtime option ${optionName}.`);
  return undefined;
}

function pickPositiveInteger(
  value: unknown,
  optionName: string,
  warnings: string[]
) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  warnings.push(`Ignored invalid runtime option ${optionName}.`);
  return undefined;
}

function pickTemperature(value: unknown, warnings: string[]) {
  if (value === undefined) {
    return undefined;
  }

  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 2
  ) {
    return value;
  }

  warnings.push("Ignored invalid runtime option temperature.");
  return undefined;
}

export function normalizeProviderRuntimeOptions(value: unknown): {
  runtimeOptions: AIProviderRuntimeOptions;
  warnings: string[];
} {
  const warnings: string[] = [];
  const runtimeOptions: AIProviderRuntimeOptions = {};

  if (value === undefined || value === null) {
    return { runtimeOptions, warnings };
  }

  if (!isRecord(value)) {
    return {
      runtimeOptions,
      warnings: ["Ignored runtimeOptions because it was not an object."]
    };
  }

  const knownKeys = new Set([
    "reasoningEffort",
    "textVerbosity",
    "claudeThinkingType",
    "claudeThinkingEffort",
    "claudeThinkingBudgetTokens",
    "claudeThinkingDisplay",
    "maxOutputTokens",
    "temperature"
  ]);

  for (const key of Object.keys(value)) {
    if (!knownKeys.has(key)) {
      warnings.push(`Ignored unknown runtime option ${key}.`);
    }
  }

  runtimeOptions.reasoningEffort = pickEnum(
    value.reasoningEffort,
    ["none", "low", "medium", "high", "xhigh"],
    "reasoningEffort",
    warnings
  );
  runtimeOptions.textVerbosity = pickEnum(
    value.textVerbosity,
    ["low", "medium", "high"],
    "textVerbosity",
    warnings
  );
  runtimeOptions.claudeThinkingType = pickEnum(
    value.claudeThinkingType,
    ["disabled", "adaptive", "enabled"],
    "claudeThinkingType",
    warnings
  );
  runtimeOptions.claudeThinkingEffort = pickEnum(
    value.claudeThinkingEffort,
    ["low", "medium", "high", "xhigh"],
    "claudeThinkingEffort",
    warnings
  );
  runtimeOptions.claudeThinkingBudgetTokens = pickPositiveInteger(
    value.claudeThinkingBudgetTokens,
    "claudeThinkingBudgetTokens",
    warnings
  );
  runtimeOptions.claudeThinkingDisplay = pickEnum(
    value.claudeThinkingDisplay,
    ["summarized", "omitted"],
    "claudeThinkingDisplay",
    warnings
  );
  runtimeOptions.maxOutputTokens = pickPositiveInteger(
    value.maxOutputTokens,
    "maxOutputTokens",
    warnings
  );
  runtimeOptions.temperature = pickTemperature(value.temperature, warnings);

  return { runtimeOptions, warnings };
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
