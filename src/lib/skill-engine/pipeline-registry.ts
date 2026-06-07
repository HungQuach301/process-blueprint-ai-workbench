import type { SkillPipelineDefinition } from "@/lib/skill-engine/skill-types";

export const intakeToProcessTaskRegisterPipeline: SkillPipelineDefinition = {
  id: "intake-to-process-task-register",
  version: "0.1.0",
  description:
    "Lightweight metadata pipeline for turning structured brief and optional local file extraction into a reviewable Draft Process Task Register.",
  appliesToSkillIds: ["input-brief-to-ptr"],
  executesExternalAI: false,
  steps: [
    {
      id: "structured-brief-normalization",
      description:
        "Normalize the 7-section AI Input Brief into StructuredProcessBrief."
    },
    {
      id: "file-extraction",
      description:
        "Use local-only file extraction metadata/text when files are selected.",
      optional: true
    },
    {
      id: "draft-ptr-generation",
      description:
        "Generate DraftProcessTaskRegister using local mock/rule generation or a guarded provider path in future phases."
    },
    {
      id: "draft-ptr-qa",
      description:
        "Run schema validation and quality gates before showing the draft as reviewable."
    },
    {
      id: "recommendation-generation",
      description:
        "Generate QA/recommendation guidance for draft issues without applying changes."
    },
    {
      id: "human-checkpoint",
      description:
        "Require user review and explicit approval before applying the draft PTR.",
      humanCheckpoint: true
    }
  ]
};

export const skillPipelineRegistry: SkillPipelineDefinition[] = [
  intakeToProcessTaskRegisterPipeline
];

export function getSkillPipelineDefinition(pipelineId: string) {
  return skillPipelineRegistry.find((pipeline) => pipeline.id === pipelineId);
}
