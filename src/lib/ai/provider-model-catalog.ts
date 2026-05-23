import type { ModelProvider } from "@/lib/ai/model-provider-types";

export type ModelRecommendation =
  | "fast"
  | "balanced"
  | "reasoning"
  | "coding"
  | "long-context"
  | "structured-output";

export type ReasoningEffort = "none" | "low" | "medium" | "high" | "xhigh";

export type ThinkingType = "none" | "auto" | "budgeted" | "extended";

export type ProviderModelStatus = "active" | "preview" | "deprecated";

export type ProviderModelMetadata = {
  id: string;
  provider: ModelProvider;
  label: string;
  description: string;
  recommendedFor: ModelRecommendation[];
  supportsStructuredOutput: boolean;
  supportsToolUse: boolean;
  supportsReasoningEffort: boolean;
  supportedReasoningEfforts: ReasoningEffort[];
  supportsThinking: boolean;
  supportedThinkingTypes: ThinkingType[];
  contextWindow?: number;
  maxOutputTokens?: number;
  status: ProviderModelStatus;
  custom?: boolean;
};

export const providerModelCatalog: ProviderModelMetadata[] = [
  {
    id: "product-ai-default",
    provider: "product-ai",
    label: "Product AI default",
    description: "Managed product AI endpoint configured on the server.",
    recommendedFor: ["balanced", "structured-output"],
    supportsStructuredOutput: true,
    supportsToolUse: false,
    supportsReasoningEffort: false,
    supportedReasoningEfforts: ["none"],
    supportsThinking: false,
    supportedThinkingTypes: ["none"],
    status: "active"
  },
  {
    id: "gpt-5.5",
    provider: "openai-byok",
    label: "GPT-5.5",
    description: "Frontier OpenAI model for deep reasoning and complex delivery work.",
    recommendedFor: ["reasoning", "coding", "structured-output"],
    supportsStructuredOutput: true,
    supportsToolUse: true,
    supportsReasoningEffort: true,
    supportedReasoningEfforts: ["low", "medium", "high", "xhigh"],
    supportsThinking: false,
    supportedThinkingTypes: ["none"],
    status: "preview"
  },
  {
    id: "gpt-5.4",
    provider: "openai-byok",
    label: "GPT-5.4",
    description: "Strong balanced OpenAI model for product and process work.",
    recommendedFor: ["balanced", "reasoning", "structured-output"],
    supportsStructuredOutput: true,
    supportsToolUse: true,
    supportsReasoningEffort: true,
    supportedReasoningEfforts: ["low", "medium", "high", "xhigh"],
    supportsThinking: false,
    supportedThinkingTypes: ["none"],
    status: "active"
  },
  {
    id: "gpt-5.4-mini",
    provider: "openai-byok",
    label: "GPT-5.4 Mini",
    description: "Cost-conscious OpenAI model for fast structured workflow tasks.",
    recommendedFor: ["fast", "balanced", "structured-output"],
    supportsStructuredOutput: true,
    supportsToolUse: true,
    supportsReasoningEffort: true,
    supportedReasoningEfforts: ["low", "medium", "high"],
    supportsThinking: false,
    supportedThinkingTypes: ["none"],
    status: "active"
  },
  {
    id: "gpt-5.4-nano",
    provider: "openai-byok",
    label: "GPT-5.4 Nano",
    description: "Small OpenAI model for quick classification and lightweight tasks.",
    recommendedFor: ["fast"],
    supportsStructuredOutput: true,
    supportsToolUse: false,
    supportsReasoningEffort: true,
    supportedReasoningEfforts: ["low", "medium"],
    supportsThinking: false,
    supportedThinkingTypes: ["none"],
    status: "active"
  },
  {
    id: "openai-custom",
    provider: "openai-byok",
    label: "Custom OpenAI model id",
    description: "Use a server-supported OpenAI-compatible model id.",
    recommendedFor: ["balanced"],
    supportsStructuredOutput: true,
    supportsToolUse: true,
    supportsReasoningEffort: true,
    supportedReasoningEfforts: ["none", "low", "medium", "high", "xhigh"],
    supportsThinking: false,
    supportedThinkingTypes: ["none"],
    status: "active",
    custom: true
  },
  {
    id: "claude-opus-4-7",
    provider: "claude-byok",
    label: "Claude Opus 4.7",
    description: "Claude model for highest quality reasoning and long-form analysis.",
    recommendedFor: ["reasoning", "coding", "long-context"],
    supportsStructuredOutput: false,
    supportsToolUse: true,
    supportsReasoningEffort: false,
    supportedReasoningEfforts: ["none"],
    supportsThinking: true,
    supportedThinkingTypes: ["auto", "budgeted", "extended"],
    status: "preview"
  },
  {
    id: "claude-sonnet-4-6",
    provider: "claude-byok",
    label: "Claude Sonnet 4.6",
    description: "Balanced Claude model for delivery artifact generation and review.",
    recommendedFor: ["balanced", "coding", "long-context"],
    supportsStructuredOutput: false,
    supportsToolUse: true,
    supportsReasoningEffort: false,
    supportedReasoningEfforts: ["none"],
    supportsThinking: true,
    supportedThinkingTypes: ["auto", "budgeted"],
    status: "active"
  },
  {
    id: "claude-haiku-4-5",
    provider: "claude-byok",
    label: "Claude Haiku 4.5",
    description: "Fast Claude model for lightweight analysis and drafting.",
    recommendedFor: ["fast", "balanced"],
    supportsStructuredOutput: false,
    supportsToolUse: true,
    supportsReasoningEffort: false,
    supportedReasoningEfforts: ["none"],
    supportsThinking: true,
    supportedThinkingTypes: ["auto"],
    status: "active"
  },
  {
    id: "claude-custom",
    provider: "claude-byok",
    label: "Custom Claude model id",
    description: "Use a server-supported Claude-compatible model id.",
    recommendedFor: ["balanced"],
    supportsStructuredOutput: false,
    supportsToolUse: true,
    supportsReasoningEffort: false,
    supportedReasoningEfforts: ["none"],
    supportsThinking: true,
    supportedThinkingTypes: ["none", "auto", "budgeted", "extended"],
    status: "active",
    custom: true
  },
  {
    id: "local-rules",
    provider: "local-model",
    label: "Local Rules Engine",
    description: "Deterministic local rules and mock-safe analysis with no external AI call.",
    recommendedFor: ["fast"],
    supportsStructuredOutput: true,
    supportsToolUse: false,
    supportsReasoningEffort: false,
    supportedReasoningEfforts: ["none"],
    supportsThinking: false,
    supportedThinkingTypes: ["none"],
    status: "active"
  }
];

export function getCatalogProvider(providerMode: ModelProvider) {
  if (providerMode === "azure-openai") {
    return "openai-byok";
  }

  if (providerMode === "no-ai") {
    return "local-model";
  }

  return providerMode;
}

export function getProviderModelCatalog(providerMode: ModelProvider) {
  const catalogProvider = getCatalogProvider(providerMode);

  return providerModelCatalog.filter(
    (model) => model.provider === catalogProvider
  );
}

export function getDefaultCatalogModelId(providerMode: ModelProvider) {
  const catalogProvider = getCatalogProvider(providerMode);

  if (catalogProvider === "openai-byok") {
    return "gpt-5.4-mini";
  }

  if (catalogProvider === "claude-byok") {
    return "claude-sonnet-4-6";
  }

  if (catalogProvider === "product-ai") {
    return "product-ai-default";
  }

  return "local-rules";
}

export function findProviderModel(
  providerMode: ModelProvider,
  modelId: string
) {
  return getProviderModelCatalog(providerMode).find(
    (model) => model.id === modelId
  );
}
