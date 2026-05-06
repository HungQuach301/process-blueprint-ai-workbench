export type TemplateType = "bpmn" | "serviceBlueprint";

export type TemplateStatus = "draft" | "active" | "archived";

export interface TemplateProfile {
  id: string;
  name: string;
  type: TemplateType;
  version: string;
  status: TemplateStatus;
  laneRules: Record<string, unknown>;
  rowRules: Record<string, unknown>;
  taskCardRules: Record<string, unknown>;
  connectorRules: Record<string, unknown>;
  colorRules: Record<string, unknown>;
  layoutRules: Record<string, unknown>;
  mandatoryFields: string[];
}
