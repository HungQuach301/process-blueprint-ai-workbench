export type ModelProvider =
  | "product-ai"
  | "openai-byok"
  | "claude-byok"
  | "azure-openai"
  | "local-model"
  | "no-ai";

export type DataUsageMode =
  | "local-only"
  | "cloud-processing"
  | "no-training"
  | "organization-private-learning";

export type AIProviderSettings = {
  provider: ModelProvider;
  dataUsageMode: DataUsageMode;
  modelName?: string;
  organizationId?: string;
  tenantId?: string;
};
