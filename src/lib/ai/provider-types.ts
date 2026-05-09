export type AIProviderId = "mock" | "openai" | "anthropic";

export type AIProviderStatus = "configured" | "missing-key" | "mock-only";

export type AIModelMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIModelRequest = {
  skillId: string;
  payload: unknown;
  model?: string;
  messages?: AIModelMessage[];
  outputSchema?: unknown;
};

export type AIModelResponse = {
  provider: AIProviderId;
  model: string;
  content: string;
  raw?: unknown;
  externalApiCalled: boolean;
};

export type StructuredAIRequest = AIModelRequest & {
  provider?: AIProviderId;
};

export type StructuredAIResponse = {
  ok: boolean;
  mode: "mock" | "provider-backed";
  provider: AIProviderId;
  model: string;
  skillId: string;
  result?: unknown;
  error?: string;
  validationErrors?: string[];
  meta: {
    externalApiCalled: boolean;
    validationPassed?: boolean;
    realAIEnabled: boolean;
    outputSchemaProvided?: boolean;
    providerStatus?: AIProviderStatus;
  };
};

export interface AIProviderAdapter {
  run(request: AIModelRequest): Promise<AIModelResponse>;
  generateStructured(request: StructuredAIRequest): Promise<StructuredAIResponse>;
  getStatus(): AIProviderStatus;
}
