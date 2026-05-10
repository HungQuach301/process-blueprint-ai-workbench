export type ModelProvider =
  | "product-ai"
  | "openai-byok"
  | "claude-byok"
  | "azure-openai"
  | "local-model"
  | "no-ai";

export type ModelProviderMode = ModelProvider;

export type DataUsageMode =
  | "local-only"
  | "cloud-processing"
  | "no-training"
  | "organization-private-learning";

export type DefaultModelCapability = "basic" | "advanced" | "reasoning";

export type ProviderStatus = "configured" | "not configured" | "mock-only";

export type AISkillOverrideId =
  | "input-brief-to-ptr"
  | "ai-process-qa"
  | "ai-template-review";

export type AIProviderSettings = {
  providerMode: ModelProviderMode;
  dataUsageMode: DataUsageMode;
  defaultModelCapability: DefaultModelCapability;
  allowCloudAI: boolean;
  requireApprovalForAIOutput: boolean;
  perSkillProviderOverrides?: Partial<Record<AISkillOverrideId, ModelProviderMode>>;
  provider?: ModelProvider;
  modelName?: string;
  organizationId?: string;
  tenantId?: string;
};
