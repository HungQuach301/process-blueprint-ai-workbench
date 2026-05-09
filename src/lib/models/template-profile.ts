export type TemplateType = "bpmn" | "serviceBlueprint";

export type TemplateStatus = "draft" | "active" | "archived";

export type TemplateOutputType =
  | "BPMN"
  | "Service Blueprint"
  | "App Flow"
  | "Data Flow"
  | "Capability Landscape"
  | "Solution Architecture";

export type TemplateProcessType =
  | "Lending"
  | "Onboarding"
  | "Servicing"
  | "Approval"
  | "Operation"
  | "Support"
  | "Generic";

export type TemplateJourneyType =
  | "Customer Journey"
  | "Internal Workflow"
  | "System Workflow"
  | "Integration Flow";

export type TemplateScopeType = "End-to-end" | "Sub-process" | "Task-level";

export type TemplateBusinessDomain =
  | "Banking"
  | "Finance"
  | "Insurance"
  | "Generic";

export type TemplateNotationStandard =
  | "BPMN 2.0"
  | "Service Blueprint"
  | "UML"
  | "Custom";

export type TemplateOrganizationType =
  | "Individual"
  | "Bank"
  | "Finance Company"
  | "Consulting"
  | "Enterprise";

export interface TemplateProfile {
  id: string;
  name: string;
  type: TemplateType;
  version: string;
  status: TemplateStatus;
  outputType?: TemplateOutputType;
  processType?: TemplateProcessType;
  journeyType?: TemplateJourneyType;
  scopeType?: TemplateScopeType;
  businessDomain?: TemplateBusinessDomain;
  notationStandard?: TemplateNotationStandard;
  organizationType?: TemplateOrganizationType;
  tags?: string[];
  laneRules: Record<string, unknown>;
  rowRules: Record<string, unknown>;
  taskCardRules: Record<string, unknown>;
  connectorRules: Record<string, unknown>;
  colorRules: Record<string, unknown>;
  layoutRules: Record<string, unknown>;
  mandatoryFields: string[];
}
