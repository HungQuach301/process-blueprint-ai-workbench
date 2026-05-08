import type { PromptTemplate } from "@/lib/prompt-engine/prompt-types";

export const inputBriefToPtrPromptTemplate: PromptTemplate = {
  id: "input-brief-to-ptr",
  version: "0.1.0",
  sections: {
    system:
      "You transform a structured process brief into a draft Process Task Register. Do not apply changes automatically.",
    domain:
      "The product models enterprise and banking process flows. The Process Task Register remains the source of truth.",
    task:
      "Create a draft ProcessTask[] from StructuredProcessBrief, using clear steps, actor/system/data traceability, and review status.",
    format:
      "Return structured output matching DraftProcessTaskRegister: draft ProcessTask rows, assumptions, openQuestions, sourceSummary, and confidence.",
    constraints:
      "Keep internal enum values canonical. Require human approval before apply. Do not call external tools or send data outside the app."
  }
};

export const promptRegistry: PromptTemplate[] = [
  inputBriefToPtrPromptTemplate
];

export function getPromptTemplate(promptId: string) {
  return promptRegistry.find((prompt) => prompt.id === promptId);
}
