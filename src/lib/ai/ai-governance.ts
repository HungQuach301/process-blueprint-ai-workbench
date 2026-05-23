import { saveAuditLogEntry } from "@/lib/audit/audit-log";
import type {
  AIProviderSettings,
  AISkillOverrideId,
  DataUsageMode,
  DefaultModelCapability,
  ModelProvider
} from "@/lib/ai/model-provider-types";

export const AI_PROVIDER_SETTINGS_STORAGE_KEY =
  "process-blueprint-ai-workbench:ai-provider-settings";

export const AI_GOVERNANCE_NOTICE =
  "Dữ liệu có thể được gửi tới AI provider đã cấu hình. Vui lòng kiểm tra chính sách dữ liệu trước khi tiếp tục.";

export const defaultAIProviderSettings: AIProviderSettings = {
  providerMode: "no-ai",
  dataUsageMode: "local-only",
  defaultModelCapability: "basic",
  allowCloudAI: false,
  requireApprovalForAIOutput: true,
  defaultModelName: "local-rules",
  modelName: "",
  organizationId: "",
  tenantId: ""
};

export type ServerAIProviderId = "product-ai" | "openai" | "claude" | "mock";

export const PROVIDER_MODELS: Record<
  string,
  Array<{ id: string; label: string; default?: boolean }>
> = {
  "product-ai": [
    { id: "product-ai-default", label: "Product AI default", default: true }
  ],
  openai: [
    { id: "gpt-4.1-mini", label: "GPT-4.1 Mini (nhanh, re)", default: true },
    { id: "gpt-4.1", label: "GPT-4.1 (can bang)" },
    { id: "gpt-4o", label: "GPT-4o (manh)" },
    { id: "o4-mini", label: "o4-mini (reasoning)" }
  ],
  claude: [
    {
      id: "claude-sonnet-4-20250514",
      label: "Claude Sonnet 4 (can bang)",
      default: true
    },
    { id: "claude-opus-4-20250514", label: "Claude Opus 4 (manh nhat)" }
  ],
  gemini: [
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (nhanh)", default: true },
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro (manh)" }
  ],
  local: [{ id: "local-rules", label: "Local Rules Engine", default: true }]
};

function getProviderModelKey(providerMode: ModelProvider) {
  if (providerMode === "product-ai") {
    return "product-ai";
  }

  if (providerMode === "openai-byok" || providerMode === "azure-openai") {
    return "openai";
  }

  if (providerMode === "claude-byok") {
    return "claude";
  }

  return "local";
}

export const aiModelOptionsByProvider: Record<
  ModelProvider,
  Array<{ value: string; label: string }>
> = {
  "product-ai": PROVIDER_MODELS["product-ai"].map((model) => ({
    value: model.id,
    label: model.label
  })),
  "openai-byok": PROVIDER_MODELS.openai.map((model) => ({
    value: model.id,
    label: model.label
  })),
  "claude-byok": PROVIDER_MODELS.claude.map((model) => ({
    value: model.id,
    label: model.label
  })),
  "azure-openai": PROVIDER_MODELS.openai.map((model) => ({
    value: model.id,
    label: model.label
  })),
  "local-model": PROVIDER_MODELS.local.map((model) => ({
    value: model.id,
    label: model.label
  })),
  "no-ai": PROVIDER_MODELS.local.map((model) => ({
    value: model.id,
    label: model.label
  }))
};

const modelProviders: ModelProvider[] = [
  "product-ai",
  "openai-byok",
  "claude-byok",
  "azure-openai",
  "local-model",
  "no-ai"
];

const dataUsageModes: DataUsageMode[] = [
  "local-only",
  "cloud-processing",
  "no-training",
  "organization-private-learning"
];

const defaultModelCapabilities: DefaultModelCapability[] = [
  "basic",
  "advanced",
  "reasoning"
];

function isModelProvider(value: unknown): value is ModelProvider {
  return modelProviders.includes(value as ModelProvider);
}

function isDataUsageMode(value: unknown): value is DataUsageMode {
  return dataUsageModes.includes(value as DataUsageMode);
}

function isDefaultModelCapability(
  value: unknown
): value is DefaultModelCapability {
  return defaultModelCapabilities.includes(value as DefaultModelCapability);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function readAIProviderSettings(): AIProviderSettings {
  if (typeof window === "undefined") {
    return defaultAIProviderSettings;
  }

  const savedSettings = window.localStorage.getItem(
    AI_PROVIDER_SETTINGS_STORAGE_KEY
  );

  if (!savedSettings) {
    return defaultAIProviderSettings;
  }

  try {
    const parsedSettings = JSON.parse(savedSettings) as Partial<AIProviderSettings>;
    const parsedLegacyProvider = parsedSettings as Partial<AIProviderSettings> & {
      provider?: unknown;
    };
    const providerMode = isModelProvider(parsedSettings.providerMode)
      ? parsedSettings.providerMode
      : isModelProvider(parsedLegacyProvider.provider)
        ? parsedLegacyProvider.provider
        : defaultAIProviderSettings.providerMode;

    return {
      ...defaultAIProviderSettings,
      ...parsedSettings,
      providerMode,
      dataUsageMode: isDataUsageMode(parsedSettings.dataUsageMode)
        ? parsedSettings.dataUsageMode
        : defaultAIProviderSettings.dataUsageMode,
      defaultModelCapability: isDefaultModelCapability(
        parsedSettings.defaultModelCapability
      )
        ? parsedSettings.defaultModelCapability
        : defaultAIProviderSettings.defaultModelCapability,
      allowCloudAI: isBoolean(parsedSettings.allowCloudAI)
        ? parsedSettings.allowCloudAI
        : defaultAIProviderSettings.allowCloudAI,
      requireApprovalForAIOutput: isBoolean(
        parsedSettings.requireApprovalForAIOutput
      )
        ? parsedSettings.requireApprovalForAIOutput
        : defaultAIProviderSettings.requireApprovalForAIOutput,
      perSkillProviderOverrides:
        typeof parsedSettings.perSkillProviderOverrides === "object" &&
        parsedSettings.perSkillProviderOverrides !== null
          ? parsedSettings.perSkillProviderOverrides
          : undefined,
      defaultModelName:
        typeof parsedSettings.defaultModelName === "string"
          ? parsedSettings.defaultModelName
          : typeof parsedSettings.modelName === "string" && parsedSettings.modelName
            ? parsedSettings.modelName
            : getDefaultModelForProvider(providerMode),
      perSkillModelOverrides:
        typeof parsedSettings.perSkillModelOverrides === "object" &&
        parsedSettings.perSkillModelOverrides !== null
          ? parsedSettings.perSkillModelOverrides
          : undefined,
      provider: undefined
    };
  } catch {
    return defaultAIProviderSettings;
  }
}

export function getDefaultModelForProvider(providerMode: ModelProvider) {
  const providerModelKey = getProviderModelKey(providerMode);
  const modelOptions = PROVIDER_MODELS[providerModelKey] ?? PROVIDER_MODELS.local;

  return (
    modelOptions.find((model) => model.default)?.id ??
    modelOptions[0]?.id ??
    "local-rules"
  );
}

export function getModelOptionsForProvider(providerMode: ModelProvider) {
  return aiModelOptionsByProvider[providerMode] ?? aiModelOptionsByProvider["local-model"];
}

export function isModelValidForProvider(providerMode: ModelProvider, model: string) {
  return getModelOptionsForProvider(providerMode).some((option) => option.value === model);
}

export function mapModelProviderToServerProvider(
  providerMode: ModelProvider
): ServerAIProviderId {
  if (providerMode === "product-ai") {
    return "product-ai";
  }

  if (providerMode === "openai-byok" || providerMode === "azure-openai") {
    return "openai";
  }

  if (providerMode === "claude-byok") {
    return "claude";
  }

  return "mock";
}

export function mapServerProviderToModelProvider(
  providerId: ServerAIProviderId
): ModelProvider {
  if (providerId === "product-ai") {
    return "product-ai";
  }

  if (providerId === "openai") {
    return "openai-byok";
  }

  if (providerId === "claude") {
    return "claude-byok";
  }

  return "local-model";
}

export function resolveAISkillModelSelection(
  skillId: string,
  requestedProviderId?: ServerAIProviderId
) {
  const settings = readAIProviderSettings();
  const overrideKey = skillId as AISkillOverrideId;
  const providerMode = requestedProviderId
    ? mapServerProviderToModelProvider(requestedProviderId)
    : settings.perSkillProviderOverrides?.[overrideKey] ?? settings.providerMode;
  const providerId = mapModelProviderToServerProvider(providerMode);
  const configuredModel =
    settings.perSkillModelOverrides?.[overrideKey] ??
    settings.defaultModelName ??
    settings.modelName ??
    "";
  const model = isModelValidForProvider(providerMode, configuredModel)
    ? configuredModel
    : getDefaultModelForProvider(providerMode);

  return {
    providerId,
    model,
    providerMode
  };
}

export function createAISkillRequestBody({
  skillId,
  payload,
  providerId
}: {
  skillId: string;
  payload: unknown;
  providerId?: ServerAIProviderId;
}) {
  const selection = resolveAISkillModelSelection(skillId, providerId);

  return {
    skillId,
    payload,
    providerId: providerId ?? selection.providerId,
    model: selection.model
  };
}

export function confirmRealAICallIfNeeded(realAIEnabled: boolean) {
  if (!realAIEnabled) {
    return true;
  }

  const settings = readAIProviderSettings();

  if (!settings.allowCloudAI) {
    window.alert(
      "Cloud AI dang bi tat trong AI Provider Settings. Hay bat Allow Cloud AI neu muon goi Real AI."
    );
    return false;
  }

  return window.confirm(AI_GOVERNANCE_NOTICE);
}

export function logAICallAudit({
  skillId,
  success,
  errorMessage,
  realAIEnabled,
  externalApiCalled,
  provider,
  model,
  requestId,
  latencyMs,
  validationPassed,
  tokenUsage,
  warnings,
  errorType,
  validationErrors,
  suggestedNextAction,
  extraMetadata
}: {
  skillId: string;
  success: boolean;
  errorMessage?: string;
  realAIEnabled: boolean;
  externalApiCalled?: boolean;
  provider?: string;
  model?: string;
  requestId?: string;
  latencyMs?: number;
  validationPassed?: boolean;
  tokenUsage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  warnings?: string[];
  errorType?: string;
  validationErrors?: string[];
  suggestedNextAction?: string;
  extraMetadata?: Record<string, string | number | boolean | null | undefined>;
}) {
  const settings = readAIProviderSettings();
  const aiMode = realAIEnabled ? "Real AI" : "Mock AI";
  const resolvedProvider = provider || settings.providerMode;

  saveAuditLogEntry({
    action: "ai_call",
    status: success ? "success" : "failure",
    summary: `${aiMode} call ${success ? "succeeded" : "failed"} for ${skillId}.`,
    metadata: {
      skillId,
      provider: resolvedProvider,
      providerId: resolvedProvider,
      providerMode: settings.providerMode,
      dataMode: settings.dataUsageMode,
      dataUsageMode: settings.dataUsageMode,
      defaultModelCapability: settings.defaultModelCapability,
      allowCloudAI: settings.allowCloudAI,
      requireApprovalForAIOutput: settings.requireApprovalForAIOutput,
      aiMode,
      model,
      requestId,
      latencyMs,
      validationPassed,
      tokenUsage,
      warnings,
      externalApiCalled: externalApiCalled === true,
      errorType,
      safeErrorMessage: errorMessage,
      validationErrors,
      validationStatus:
        validationPassed === true
          ? "valid"
          : validationPassed === false
            ? "invalid"
            : success
              ? "not applicable"
              : "skipped",
      suggestedNextAction,
      errorMessage,
      ...extraMetadata
    }
  });
}
