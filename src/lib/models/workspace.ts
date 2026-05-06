export interface Workspace {
  id: string;
  name: string;
  description: string;
  scope: string;
  selectedBpmnTemplateId: string | null;
  selectedServiceBlueprintTemplateId: string | null;
  createdAt: string;
  updatedAt: string;
}
