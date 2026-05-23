export type NavigationSection = {
  id: string;
  label: string;
  description: string;
  status: string;
};

export const navigationSections: NavigationSection[] = [
  {
    id: "workspace",
    label: "Workspace",
    description: "Release workspace entry is hidden from the MVP1-AI navigation.",
    status: "Hidden"
  },
  {
    id: "ai-settings",
    label: "AI Connection Center",
    description: "Provider and data usage mode settings for AI workflows.",
    status: "Ready"
  },
  {
    id: "input-brief",
    label: "Input Brief",
    description: "Enter structured process notes and context.",
    status: "Ready"
  },
  {
    id: "template-library",
    label: "Template Hub",
    description: "Reusable process blueprint templates.",
    status: "Ready"
  },
  {
    id: "process-task-register",
    label: "Process Task Register",
    description: "Register for process steps, owners, inputs, and outputs.",
    status: "Ready"
  },
  {
    id: "qa-panel",
    label: "QA Panel",
    description: "QA review is embedded in Process Task Register.",
    status: "Hidden"
  },
  {
    id: "d01-bpmn-preview",
    label: "D01 BPMN Preview",
    description: "Preview of the BPMN process diagram.",
    status: "Ready"
  },
  {
    id: "d02-service-blueprint-preview",
    label: "D02 Service Blueprint Preview",
    description: "Preview of the service blueprint output.",
    status: "Ready"
  },
  {
    id: "product-delivery-workspace",
    label: "Product Delivery",
    description: "Product delivery drafts and handoff artifacts.",
    status: "Ready"
  },
  {
    id: "export-center",
    label: "Export Center",
    description: "Export completed blueprint deliverables.",
    status: "Ready"
  }
];
