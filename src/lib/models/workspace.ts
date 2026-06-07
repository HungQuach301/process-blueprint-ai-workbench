export type WorkspaceOwnerType = "individual" | "organization";

export type WorkspaceOrganizationType =
  | "bank"
  | "finance-company"
  | "consulting"
  | "other";

export type WorkspaceDataMode =
  | "local-only"
  | "cloud-processing"
  | "no-training"
  | "organization-private-learning";

export type WorkspaceModelProviderMode =
  | "product-ai"
  | "openai-byok"
  | "claude-byok"
  | "azure-openai"
  | "local-model"
  | "no-ai";

export type WorkspaceStatus = "draft" | "active" | "archived";

export interface Workspace {
  id: string;
  name: string;
  description: string;
  scope: string;
  selectedBpmnTemplateId: string | null;
  selectedServiceBlueprintTemplateId: string | null;
  createdAt: string;
  updatedAt: string;
  ownerType?: WorkspaceOwnerType;
  organizationType?: WorkspaceOrganizationType;
  dataMode?: WorkspaceDataMode;
  modelProviderMode?: WorkspaceModelProviderMode;
  createdBy?: string;
  version?: string;
  status?: WorkspaceStatus;
}
