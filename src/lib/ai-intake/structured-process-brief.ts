export type IntakeLanguage = "vi" | "en";

export type IntakeOutputLanguage = IntakeLanguage | "bilingual";

export type ProcessInfoSection = {
  processName: string;
  processOwner?: string;
  businessDomain?: string;
  organizationName?: string;
};

export type StartEndSection = {
  startEvent: string;
  endEvent: string;
};

export type ActorSection = {
  name: string;
  role?: string;
  type?: "customer" | "internal" | "external" | "system" | "other";
};

export type RelatedSystemSection = {
  name: string;
  purpose?: string;
};

export type DataDocumentSection = {
  name: string;
  type?: "data" | "document" | "record" | "other";
  description?: string;
};

export type StructuredProcessBrief = {
  processInfo: ProcessInfoSection;
  businessObjective: string;
  scope: string;
  startEnd: StartEndSection;
  actors: ActorSection[];
  relatedSystems?: RelatedSystemSection[];
  dataDocuments?: DataDocumentSection[];
  inputLanguage?: IntakeLanguage;
  outputLanguage?: IntakeOutputLanguage;
  happyPath?: string[];
  exceptionPaths?: string[];
  slaControls?: string[];
  riskControls?: string[];
  desiredOutputs?: string[];
  notes?: string;
};

export const AI_INTAKE_STORAGE_KEY =
  "process-blueprint-ai-workbench:structured-process-brief";
