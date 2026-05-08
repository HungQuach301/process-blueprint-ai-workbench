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
    description: "The main place where the process blueprint workflow will live.",
    status: "Placeholder"
  },
  {
    id: "ai-settings",
    label: "AI Settings",
    description: "Provider and data usage mode settings for future AI workflows.",
    status: "Scaffold"
  },
  {
    id: "input-brief",
    label: "Input Brief",
    description: "A future area for entering raw process notes and context.",
    status: "Placeholder"
  },
  {
    id: "template-library",
    label: "Template Library",
    description: "A future collection of reusable process blueprint templates.",
    status: "Placeholder"
  },
  {
    id: "process-task-register",
    label: "Process Task Register",
    description: "A future register for process steps, owners, inputs, and outputs.",
    status: "Placeholder"
  },
  {
    id: "qa-panel",
    label: "QA Panel",
    description: "A future review area for quality checks and missing information.",
    status: "Placeholder"
  },
  {
    id: "d01-bpmn-preview",
    label: "D01 BPMN Preview",
    description: "A future preview of the BPMN-style process diagram.",
    status: "Placeholder"
  },
  {
    id: "d02-service-blueprint-preview",
    label: "D02 Service Blueprint Preview",
    description: "A future preview of the service blueprint output.",
    status: "Placeholder"
  },
  {
    id: "export-center",
    label: "Export Center",
    description: "A future area for exporting completed blueprint deliverables.",
    status: "Placeholder"
  }
];
