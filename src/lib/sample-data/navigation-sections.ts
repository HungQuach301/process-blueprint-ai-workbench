export type NavigationSection = {
  id: string;
  label: string;
  description: string;
  status: string;
};

export const navigationSections: NavigationSection[] = [
  {
    id: "workspace",
    label: "Dashboard",
    description: "Dashboard for workspace status and next actions.",
    status: "Ready"
  },
  {
    id: "ai-settings",
    label: "AI Connection Center",
    description: "Provider and data usage mode settings for AI workflows.",
    status: "Ready"
  },
  {
    id: "input-brief",
    label: "AI Input Brief",
    description: "Enter structured process notes and context.",
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
    label: "QA Engine",
    description: "Review process quality and AI recommendations.",
    status: "Ready"
  },
  {
    id: "d01-bpmn-preview",
    label: "Generate D01 BPMN XML",
    description: "Generate and preview the D01 BPMN XML output.",
    status: "Ready"
  },
  {
    id: "d02-service-blueprint-preview",
    label: "Generate D02 Service Blueprint",
    description: "Generate and preview the D02 Service Blueprint output.",
    status: "Ready"
  },
  {
    id: "template-library",
    label: "Template Hub",
    description: "Reusable process blueprint templates.",
    status: "Ready"
  },
  {
    id: "product-delivery",
    label: "Product Delivery",
    description: "Generate BRD, SRS, user stories, acceptance criteria, and AI handoff drafts.",
    status: "Ready"
  },
  {
    id: "export-center",
    label: "Output Package ZIP",
    description: "Export completed blueprint deliverables and audit history.",
    status: "Ready"
  }
];
