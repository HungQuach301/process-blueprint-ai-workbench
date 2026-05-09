export type SkillCategory =
  | "transformation"
  | "qa"
  | "recommendation"
  | "template-review"
  | "generation";

export type SkillCapability = "basic" | "advanced";

export type SkillDataClassification =
  | "public"
  | "internal"
  | "confidential"
  | "restricted";

export type SkillAuditLevel = "none" | "log" | "full";

export type SkillTier = "free" | "pro" | "enterprise";

export type SkillSchemaReference = {
  ref: string;
  description?: string;
};

export type SkillModelRequirements = {
  minCapability: SkillCapability;
  supportsStructuredOutput: boolean;
};

export type SkillDefinition = {
  id: string;
  version: string;
  category: SkillCategory;
  requiredRegisters: string[];
  inputSchema: SkillSchemaReference;
  outputSchema: SkillSchemaReference;
  modelRequirements: SkillModelRequirements;
  humanApprovalRequired: boolean;
  dataClassification: SkillDataClassification;
  auditLevel: SkillAuditLevel;
  tier: SkillTier;
};

export type SkillPipelineStepId =
  | "structured-brief-normalization"
  | "file-extraction"
  | "draft-ptr-generation"
  | "draft-ptr-qa"
  | "recommendation-generation"
  | "human-checkpoint";

export type SkillPipelineStep = {
  id: SkillPipelineStepId;
  description: string;
  optional?: boolean;
  humanCheckpoint?: boolean;
};

export type SkillPipelineDefinition = {
  id: string;
  version: string;
  description: string;
  steps: SkillPipelineStep[];
  appliesToSkillIds: string[];
  executesExternalAI: boolean;
};
