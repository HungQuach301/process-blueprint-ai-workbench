import type { ProcessTask } from "@/lib/models/process-task";
import type { TemplateProfile } from "@/lib/models/template-profile";
import type { Workspace } from "@/lib/models/workspace";
import type {
  AIProviderSettings,
  DataUsageMode,
  ModelProvider
} from "@/lib/ai/model-provider-types";

export type AIScope =
  | "auto-generate"
  | "qa"
  | "recommendation"
  | "template-review"
  | "future-generation";

export type AIExecutionMode = "mock" | "disabled" | "provider-backed";

export type AIOrchestrationContext = {
  scope: AIScope;
  executionMode: AIExecutionMode;
  providerSettings: AIProviderSettings;
  workspace?: Workspace;
  processTasks?: ProcessTask[];
  templateProfiles?: TemplateProfile[];
  selectedD01Template?: TemplateProfile;
  selectedD02Template?: TemplateProfile;
  promptPackId?: string;
  promptPackVersion?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
};

export type AIOrchestrationAudit = {
  requestId: string;
  scope: AIScope;
  provider: ModelProvider;
  dataUsageMode: DataUsageMode;
  executionMode: AIExecutionMode;
  timestamp: string;
  externalApiCalled: false;
};

export type AIOrchestrationResponseMeta = {
  requestId: string;
  provider: ModelProvider;
  dataUsageMode: DataUsageMode;
  executionMode: AIExecutionMode;
  externalApiCalled: false;
  warnings: string[];
  assumptions: string[];
  audit: AIOrchestrationAudit;
};

export function createMockAIResponseMeta(
  context: AIOrchestrationContext,
  warnings: string[] = [],
  assumptions: string[] = []
): AIOrchestrationResponseMeta {
  const requestId = context.requestId ?? `mock-ai-${Date.now()}`;
  const timestamp = new Date().toISOString();

  return {
    requestId,
    provider: context.providerSettings.providerMode,
    dataUsageMode: context.providerSettings.dataUsageMode,
    executionMode: "mock",
    externalApiCalled: false,
    warnings,
    assumptions,
    audit: {
      requestId,
      scope: context.scope,
      provider: context.providerSettings.providerMode,
      dataUsageMode: context.providerSettings.dataUsageMode,
      executionMode: "mock",
      timestamp,
      externalApiCalled: false
    }
  };
}
