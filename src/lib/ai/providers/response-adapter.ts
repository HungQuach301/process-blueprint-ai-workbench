export type ProviderType =
  | "openai-responses"
  | "openai-chat"
  | "claude"
  | "product-ai"
  | "mock"
  | "local";

export type AdapterResult = {
  content: string;
  provider: ProviderType;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  finishReason: string;
  raw: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asProviderType(value: string | undefined): ProviderType | undefined {
  switch (value) {
    case "openai-responses":
    case "openai-chat":
    case "claude":
    case "product-ai":
    case "mock":
    case "local":
      return value;
    case "openai":
      return "openai-responses";
    case "anthropic":
      return "claude";
    default:
      return undefined;
  }
}

function getString(value: unknown, fallback = "unknown") {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : fallback;
}

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringifyPreview(value: unknown, maxLength: number) {
  if (typeof value === "string") {
    return value.substring(0, maxLength);
  }

  return JSON.stringify(value ?? "").substring(0, maxLength);
}

export function detectProviderType(response: unknown): ProviderType {
  if (typeof response === "string") {
    return "mock";
  }

  if (!isObject(response)) {
    return "mock";
  }

  if (response.object === "response" && Array.isArray(response.output)) {
    return "openai-responses";
  }

  if (Array.isArray(response.choices)) {
    return "openai-chat";
  }

  if (Array.isArray(response.content) && response.role === "assistant") {
    return "claude";
  }

  if (
    "draftProcessTasks" in response ||
    "rawText" in response ||
    "outputText" in response ||
    "output_text" in response
  ) {
    return "mock";
  }

  return "mock";
}

export function extractFromOpenAIResponses(response: unknown): AdapterResult {
  const raw = isObject(response) ? response : {};
  const outputMessage = Array.isArray(raw.output)
    ? raw.output.find((item) => isObject(item) && item.type === "message")
    : undefined;
  const contentItems =
    isObject(outputMessage) && Array.isArray(outputMessage.content)
      ? outputMessage.content
      : [];
  const textContent = contentItems.find(
    (item) =>
      isObject(item) &&
      (item.type === "output_text" || item.type === "text") &&
      typeof item.text === "string"
  );
  const usage = isObject(raw.usage) ? raw.usage : {};
  const inputTokens =
    getNumber(usage.input_tokens) || getNumber(usage.prompt_tokens);
  const outputTokens =
    getNumber(usage.output_tokens) || getNumber(usage.completion_tokens);
  const totalTokens =
    getNumber(usage.total_tokens) || inputTokens + outputTokens;

  return {
    content: isObject(textContent) ? getString(textContent.text, "") : "",
    provider: "openai-responses",
    model: getString(raw.model),
    inputTokens,
    outputTokens,
    totalTokens,
    finishReason: getString(raw.status),
    raw: response
  };
}

export function extractFromOpenAIChat(response: unknown): AdapterResult {
  const raw = isObject(response) ? response : {};
  const firstChoice = Array.isArray(raw.choices) ? raw.choices[0] : undefined;
  const usage = isObject(raw.usage) ? raw.usage : {};
  const inputTokens = getNumber(usage.prompt_tokens);
  const outputTokens = getNumber(usage.completion_tokens);
  const totalTokens =
    getNumber(usage.total_tokens) || inputTokens + outputTokens;

  return {
    content:
      isObject(firstChoice) &&
      isObject(firstChoice.message) &&
      typeof firstChoice.message.content === "string"
        ? firstChoice.message.content
        : "",
    provider: "openai-chat",
    model: getString(raw.model),
    inputTokens,
    outputTokens,
    totalTokens,
    finishReason: isObject(firstChoice)
      ? getString(firstChoice.finish_reason)
      : "unknown",
    raw: response
  };
}

export function extractFromClaude(response: unknown): AdapterResult {
  const raw = isObject(response) ? response : {};
  const textContent = Array.isArray(raw.content)
    ? raw.content.find(
        (item) =>
          isObject(item) &&
          item.type === "text" &&
          typeof item.text === "string"
      )
    : undefined;
  const usage = isObject(raw.usage) ? raw.usage : {};
  const inputTokens = getNumber(usage.input_tokens);
  const outputTokens = getNumber(usage.output_tokens);

  return {
    content: isObject(textContent) ? getString(textContent.text, "") : "",
    provider: "claude",
    model: getString(raw.model),
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    finishReason: getString(raw.stop_reason),
    raw: response
  };
}

export function extractFromProductAI(response: unknown): AdapterResult {
  const raw = isObject(response) ? response : {};
  const contentCandidates = [
    raw.rawText,
    raw.output_text,
    raw.outputText,
    raw.content,
    raw.text
  ];
  const content =
    contentCandidates.find((value) => typeof value === "string") ?? "";
  const tokenUsage = isObject(raw.tokenUsage) ? raw.tokenUsage : {};
  const inputTokens =
    getNumber(tokenUsage.inputTokens) ||
    getNumber(tokenUsage.input_tokens) ||
    getNumber(tokenUsage.prompt_tokens);
  const outputTokens =
    getNumber(tokenUsage.outputTokens) ||
    getNumber(tokenUsage.output_tokens) ||
    getNumber(tokenUsage.completion_tokens);
  const totalTokens =
    getNumber(tokenUsage.totalTokens) ||
    getNumber(tokenUsage.total_tokens) ||
    inputTokens + outputTokens;

  return {
    content: typeof content === "string" ? content : "",
    provider: "product-ai",
    model: getString(raw.model),
    inputTokens,
    outputTokens,
    totalTokens,
    finishReason: getString(raw.finishReason ?? raw.finish_reason ?? raw.status),
    raw: response
  };
}

export function extractFromMock(response: unknown): AdapterResult {
  return {
    content: typeof response === "string" ? response : JSON.stringify(response),
    provider: "mock",
    model: "mock",
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    finishReason: "mock",
    raw: response
  };
}

export function adaptProviderResponse(
  rawResponse: unknown,
  providerHint?: string
): AdapterResult {
  const providerType = asProviderType(providerHint) ?? detectProviderType(rawResponse);
  let result: AdapterResult;

  switch (providerType) {
    case "openai-responses":
      result = extractFromOpenAIResponses(rawResponse);
      break;
    case "openai-chat":
      result = extractFromOpenAIChat(rawResponse);
      break;
    case "claude":
      result = extractFromClaude(rawResponse);
      break;
    case "product-ai":
      result = extractFromProductAI(rawResponse);
      break;
    case "local":
      result = {
        ...extractFromMock(rawResponse),
        provider: "local",
        model: "local",
        finishReason: "local"
      };
      break;
    case "mock":
    default:
      // TODO: Expand provider-specific extraction here when new provider contracts are added.
      result = extractFromMock(rawResponse);
      break;
  }

  console.log(
    JSON.stringify({
      event: "provider_adapter",
      detectedProvider: providerType,
      contentLength: result.content.length,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      model: result.model
    })
  );

  if (result.content.length === 0) {
    console.log(
      JSON.stringify({
        event: "provider_adapter_warning",
        message: "Extracted content is empty",
        providerType,
        rawResponsePreview: stringifyPreview(rawResponse, 300)
      })
    );
  }

  return result;
}
