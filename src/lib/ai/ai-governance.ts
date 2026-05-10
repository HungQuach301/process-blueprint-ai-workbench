import { saveAuditLogEntry } from "@/lib/audit/audit-log";
import type {
  AIProviderSettings,
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
  modelName: "",
  organizationId: "",
  tenantId: ""
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
      provider: undefined
    };
  } catch {
    return defaultAIProviderSettings;
  }
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
  extraMetadata
}: {
  skillId: string;
  success: boolean;
  errorMessage?: string;
  realAIEnabled: boolean;
  externalApiCalled?: boolean;
  extraMetadata?: Record<string, string | number | boolean | null | undefined>;
}) {
  const settings = readAIProviderSettings();
  const aiMode = realAIEnabled ? "Real AI" : "Mock AI";

  saveAuditLogEntry({
    action: "ai_call",
    status: success ? "success" : "failure",
    summary: `${aiMode} call ${success ? "succeeded" : "failed"} for ${skillId}.`,
    metadata: {
      skillId,
      provider: settings.providerMode,
      providerMode: settings.providerMode,
      dataMode: settings.dataUsageMode,
      dataUsageMode: settings.dataUsageMode,
      defaultModelCapability: settings.defaultModelCapability,
      allowCloudAI: settings.allowCloudAI,
      requireApprovalForAIOutput: settings.requireApprovalForAIOutput,
      aiMode,
      externalApiCalled: externalApiCalled === true,
      errorMessage,
      ...extraMetadata
    }
  });
}
