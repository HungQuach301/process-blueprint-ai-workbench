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
  | "file-to-ptr-draft"
  | "chat-to-ptr-draft"
  | "ai-process-qa"
  | "ai-process-qa-finding"
  | "process-improvement-recommendation"
  | "artifact-review"
  | "ai-template-review"
  | "template-review"
  | "notes-to-brd"
  | "ptr-to-brd"
  | "brd-to-srs"
  | "notes-to-srs"
  | "srs-to-user-stories"
  | "brd-to-user-stories"
  | "user-stories-to-acceptance-criteria"
  | "product-scope-review"
  | "mvp-slicing"
  | "requirement-quality-check"
  | "user-stories-to-ai-coding-pack";

export type AIProviderSettings = {
  providerMode: ModelProviderMode;
  dataUsageMode: DataUsageMode;
  defaultModelCapability: DefaultModelCapability;
  allowCloudAI: boolean;
  requireApprovalForAIOutput: boolean;
  perSkillProviderOverrides?: Partial<Record<AISkillOverrideId, ModelProviderMode>>;
  defaultModelName?: string;
  perSkillModelOverrides?: Partial<Record<AISkillOverrideId, string>>;
  provider?: ModelProvider;
  modelName?: string;
  organizationId?: string;
  tenantId?: string;
};
