export type PromptTemplateSection =
  | "system"
  | "domain"
  | "task"
  | "format"
  | "constraints";

export type PromptTemplate = {
  id: string;
  version: string;
  sections: Record<PromptTemplateSection, string>;
};
