import type { SkillDefinition } from "@/lib/skill-engine/skill-types";

export const inputBriefToPtrSkillDefinition: SkillDefinition = {
  id: "input-brief-to-ptr",
  version: "0.1.0",
  category: "transformation",
  requiredRegisters: [],
  inputSchema: {
    ref: "StructuredProcessBrief",
    description:
      "Simplified 7-section structured process brief from src/lib/ai-intake/structured-process-brief.ts."
  },
  outputSchema: {
    ref: "DraftProcessTaskRegister",
    description:
      "Draft ProcessTask[] plus assumptions, openQuestions, sourceSummary, and confidence."
  },
  modelRequirements: {
    minCapability: "basic",
    supportsStructuredOutput: true
  },
  humanApprovalRequired: true,
  dataClassification: "internal",
  auditLevel: "log",
  tier: "free"
};

export const skillRegistry: SkillDefinition[] = [
  inputBriefToPtrSkillDefinition
];

export function getSkillDefinition(skillId: string) {
  return skillRegistry.find((skill) => skill.id === skillId);
}
