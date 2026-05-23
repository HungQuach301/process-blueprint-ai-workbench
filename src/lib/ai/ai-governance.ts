import { saveAuditLogEntry } from "@/lib/audit/audit-log";
import type {
  AIProviderSettings,
  AIRuntimeOptions,
  AISkillOverrideId,
  DataUsageMode,
  DefaultModelCapability,
  ModelProvider
} from "@/lib/ai/model-provider-types";
import {
  findProviderModel,
  getDefaultCatalogModelId,
  getProviderModelCatalog
} from "@/lib/ai/provider-model-catalog";

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
  defaultRuntimeOptions: {
    mode: "balanced",
    reasoningEffort: "none",
    thinkingType: "none"
  },
  defaultModelName: "local-rules",
  modelName: "",
  organizationId: "",
  tenantId: ""
};

export type ServerAIProviderId = "product-ai" | "openai" | "claude" | "mock";

export const aiModelOptionsByProvider: Record<
  ModelProvider,
  Array<{ value: string; label: string }>
> = {
  "product-ai": getProviderModelCatalog("product-ai").map((model) => ({
    value: model.id,
    label: model.label
  })),
  "openai-byok": getProviderModelCatalog("openai-byok").map((model) => ({
    value: model.id,
    label: model.label
  })),
  "claude-byok": getProviderModelCatalog("claude-byok").map((model) => ({
    value: model.id,
    label: model.label
  })),
  "azure-openai": getProviderModelCatalog("azure-openai").map((model) => ({
    value: model.id,
    label: model.label
  })),
  "local-model": getProviderModelCatalog("local-model").map((model) => ({
    value: model.id,
    label: model.label
  })),
  "no-ai": getProviderModelCatalog("no-ai").map((model) => ({
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeRuntimeOptions(value: unknown): AIRuntimeOptions | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    mode:
      typeof value.mode === "string"
        ? (value.mode as AIRuntimeOptions["mode"])
        : undefined,
    reasoningEffort:
      typeof value.reasoningEffort === "string"
        ? (value.reasoningEffort as AIRuntimeOptions["reasoningEffort"])
        : undefined,
    thinkingType:
      typeof value.thinkingType === "string"
        ? (value.thinkingType as AIRuntimeOptions["thinkingType"])
        : undefined
  };
}

function normalizeRuntimeOverrides(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([skillId, runtimeOptions]) => [
        skillId,
        normalizeRuntimeOptions(runtimeOptions)
      ])
      .filter((entry): entry is [string, AIRuntimeOptions] =>
        Boolean(entry[1])
      )
  ) as Partial<Record<AISkillOverrideId, AIRuntimeOptions>>;
}

function normalizeCustomModelIds(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([providerMode, modelIds]) => [
        providerMode,
        Array.isArray(modelIds)
          ? modelIds.filter(
              (modelId): modelId is string =>
                typeof modelId === "string" && modelId.trim().length > 0
            )
          : []
      ])
      .filter(([, modelIds]) => modelIds.length > 0)
  ) as Partial<Record<ModelProvider, string[]>>;
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
      defaultRuntimeOptions:
        normalizeRuntimeOptions(parsedSettings.defaultRuntimeOptions) ??
        defaultAIProviderSettings.defaultRuntimeOptions,
      perSkillRuntimeOverrides: normalizeRuntimeOverrides(
        parsedSettings.perSkillRuntimeOverrides
      ),
      customModelIds: normalizeCustomModelIds(parsedSettings.customModelIds),
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
  return getDefaultCatalogModelId(providerMode);
}

export function getModelOptionsForProvider(
  providerMode: ModelProvider,
  customModelIds?: Partial<Record<ModelProvider, string[]>>
) {
  const catalogOptions =
    aiModelOptionsByProvider[providerMode] ??
    aiModelOptionsByProvider["local-model"];
  const customOptions = (customModelIds?.[providerMode] ?? []).map((modelId) => ({
    value: modelId,
    label: modelId
  }));

  return [...catalogOptions, ...customOptions].filter(
    (option, index, list) =>
      list.findIndex((item) => item.value === option.value) === index
  );
}

export function isModelValidForProvider(
  providerMode: ModelProvider,
  model: string,
  customModelIds?: Partial<Record<ModelProvider, string[]>>
) {
  return getModelOptionsForProvider(providerMode, customModelIds).some(
    (option) => option.value === model
  );
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
  const model = isModelValidForProvider(
    providerMode,
    configuredModel,
    settings.customModelIds
  )
    ? configuredModel
    : getDefaultModelForProvider(providerMode);
  const runtimeOptions = {
    ...(settings.defaultRuntimeOptions ?? {}),
    ...(settings.perSkillRuntimeOverrides?.[overrideKey] ?? {})
  };
  const modelMetadata = findProviderModel(providerMode, model);

  return {
    providerId,
    model,
    providerMode,
    runtimeOptions,
    modelMetadata
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
