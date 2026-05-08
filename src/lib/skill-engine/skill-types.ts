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
