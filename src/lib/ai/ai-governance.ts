import { saveAuditLogEntry } from "@/lib/audit/audit-log";
import type {
  AIProviderSettings,
  DataUsageMode,
  ModelProvider
} from "@/lib/ai/model-provider-types";

export const AI_PROVIDER_SETTINGS_STORAGE_KEY =
  "process-blueprint-ai-workbench:ai-provider-settings";

export const AI_GOVERNANCE_NOTICE =
  "Dữ liệu có thể được gửi tới AI provider đã cấu hình. Vui lòng kiểm tra chính sách dữ liệu trước khi tiếp tục.";

export const defaultAIProviderSettings: AIProviderSettings = {
  provider: "no-ai",
  dataUsageMode: "local-only",
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

function isModelProvider(value: unknown): value is ModelProvider {
  return modelProviders.includes(value as ModelProvider);
}

function isDataUsageMode(value: unknown): value is DataUsageMode {
  return dataUsageModes.includes(value as DataUsageMode);
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

    return {
      ...defaultAIProviderSettings,
      ...parsedSettings,
      provider: isModelProvider(parsedSettings.provider)
        ? parsedSettings.provider
        : defaultAIProviderSettings.provider,
      dataUsageMode: isDataUsageMode(parsedSettings.dataUsageMode)
        ? parsedSettings.dataUsageMode
        : defaultAIProviderSettings.dataUsageMode
    };
  } catch {
    return defaultAIProviderSettings;
  }
}

export function confirmRealAICallIfNeeded(realAIEnabled: boolean) {
  if (!realAIEnabled) {
    return true;
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
      provider: settings.provider,
      dataMode: settings.dataUsageMode,
      aiMode,
      externalApiCalled: externalApiCalled === true,
      errorMessage,
      ...extraMetadata
    }
  });
}
