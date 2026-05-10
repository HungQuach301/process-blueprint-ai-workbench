import type { AIProviderId } from "@/lib/ai/providers/provider-types";
import type { AISkillSchemaId } from "@/lib/ai/skill-schemas";
import { getAIPromptPack } from "@/lib/ai/prompt-packs";

export type AISkillModule =
  | "module-2-process-modeling"
  | "module-3-product-delivery"
  | "module-5-ai-coding-pack"
  | "cross-cutting-governance";

export type AISkillStatus =
  | "planned"
  | "implemented"
  | "mock"
  | "real-ai-ready";

export type AISkillDataSensitivity =
  | "internal"
  | "confidential"
  | "restricted";

export type AISkillSchemaReference = {
  id: AISkillSchemaId;
  description: string;
  validatorId: string;
};

export type AISkillDefinitionV2 = {
  skillId: string;
  version: string;
  module: AISkillModule;
  status: AISkillStatus;
  description: string;
  inputSchema: AISkillSchemaReference;
  outputSchema: AISkillSchemaReference;
  allowedProviders: AIProviderId[];
  requiresApproval: boolean;
  dataSensitivity: AISkillDataSensitivity;
  promptPackId: string;
};

const allProviders: AIProviderId[] = ["mock", "product-ai", "openai", "claude"];

export const aiSkillRegistryV2: AISkillDefinitionV2[] = [
  {
    skillId: "input-brief-to-ptr",
    version: "1.0.0",
    module: "module-2-process-modeling",
    status: "real-ai-ready",
    description:
      "Generate Draft Process Task Register from structured AI Input Brief.",
    inputSchema: {
      id: "StructuredProcessBrief",
      description: "Structured seven-section process brief.",
      validatorId: "validateStructuredProcessBrief"
    },
    outputSchema: {
      id: "DraftProcessTaskRegister",
      description:
        "Draft ProcessTask rows plus assumptions, open questions, source summary, and confidence.",
      validatorId: "validateDraftProcessTaskRegister"
    },
    allowedProviders: allProviders,
    requiresApproval: true,
    dataSensitivity: "confidential",
    promptPackId: "process-modeling-input-brief-to-ptr-v1"
  },
  {
    skillId: "file-to-ptr-draft",
    version: "1.0.0",
    module: "module-2-process-modeling",
    status: "real-ai-ready",
    description:
      "Generate Draft Process Task Register from extracted file content.",
    inputSchema: {
      id: "FileIntakeContext",
      description: "File metadata, extracted text, and optional user context.",
      validatorId: "validateAISkillInput"
    },
    outputSchema: {
      id: "DraftProcessTaskRegister",
      description: "Draft ProcessTask rows derived from file intake.",
      validatorId: "validateDraftProcessTaskRegister"
    },
    allowedProviders: allProviders,
    requiresApproval: true,
    dataSensitivity: "confidential",
    promptPackId: "process-modeling-file-to-draft-ptr-v1"
  },
  {
    skillId: "chat-to-ptr-draft",
    version: "1.0.0",
    module: "module-2-process-modeling",
    status: "real-ai-ready",
    description:
      "Convert pasted chat, notes, or manual text into a Draft Process Task Register.",
    inputSchema: {
      id: "ChatNotesContext",
      description:
        "Pasted chat transcript, notes, or manual text with optional user context.",
      validatorId: "validateAISkillInput"
    },
    outputSchema: {
      id: "DraftProcessTaskRegister",
      description: "Draft ProcessTask rows from chat-derived brief.",
      validatorId: "validateDraftProcessTaskRegister"
    },
    allowedProviders: allProviders,
    requiresApproval: true,
    dataSensitivity: "confidential",
    promptPackId: "process-modeling-chat-to-ptr-v1"
  },
  {
    skillId: "ai-process-qa",
    version: "1.0.0",
    module: "module-2-process-modeling",
    status: "real-ai-ready",
    description:
      "Generate QA recommendations for Process Task Register issues.",
    inputSchema: {
      id: "ProcessTaskRegisterContext",
      description: "ProcessTask[] with optional template profiles and QA issue context.",
      validatorId: "validateAISkillInput"
    },
    outputSchema: {
      id: "QARecommendationResponse",
      description: "QARecommendation[] requiring user confirmation.",
      validatorId: "validateAIQARecommendations"
    },
    allowedProviders: allProviders,
    requiresApproval: true,
    dataSensitivity: "confidential",
    promptPackId: "process-modeling-qa-recommendation-v1"
  },
  {
    skillId: "process-improvement-recommendation",
    version: "1.0.0",
    module: "module-2-process-modeling",
    status: "real-ai-ready",
    description:
      "Suggest semantic process improvements beyond deterministic QA rules.",
    inputSchema: {
      id: "ProcessTaskRegisterContext",
      description: "ProcessTask[] plus issue/domain metadata.",
      validatorId: "validateAISkillInput"
    },
    outputSchema: {
      id: "QARecommendationResponse",
      description: "Reviewable process improvement recommendations.",
      validatorId: "validateAIQARecommendations"
    },
    allowedProviders: allProviders,
    requiresApproval: true,
    dataSensitivity: "confidential",
    promptPackId: "process-modeling-qa-recommendation-v1"
  },
  {
    skillId: "artifact-review",
    version: "1.0.0",
    module: "module-2-process-modeling",
    status: "real-ai-ready",
    description:
      "Review generated D01 BPMN or D02 Service Blueprint artifacts and route fixes back to PTR or template recommendations.",
    inputSchema: {
      id: "ProcessTaskRegisterContext",
      description:
        "ProcessTask[] plus selected TemplateProfile, artifact type, generated XML, and optional rule QA issues.",
      validatorId: "validateAISkillInput"
    },
    outputSchema: {
      id: "ArtifactReviewResponse",
      description:
        "PTR recommendations, template recommendations, and artifact review warnings for user review.",
      validatorId: "validateArtifactReviewResponse"
    },
    allowedProviders: allProviders,
    requiresApproval: true,
    dataSensitivity: "confidential",
    promptPackId: "process-modeling-artifact-review-v1"
  },
  {
    skillId: "template-review",
    version: "1.0.0",
    module: "module-2-process-modeling",
    status: "real-ai-ready",
    description:
      "Review D01/D02 TemplateProfile fit and quality without applying patches.",
    inputSchema: {
      id: "ProcessTaskRegisterContext",
      description: "Selected TemplateProfile with optional ProcessTask[] context.",
      validatorId: "validateAISkillInput"
    },
    outputSchema: {
      id: "TemplateRecommendationResponse",
      description:
        "TemplateRecommendation[] and optional TemplateQualityScore for user review.",
      validatorId: "validateTemplateReviewOutput"
    },
    allowedProviders: allProviders,
    requiresApproval: true,
    dataSensitivity: "confidential",
    promptPackId: "process-modeling-template-review-v1"
  },
  {
    skillId: "template-recommendation",
    version: "1.0.0",
    module: "module-2-process-modeling",
    status: "implemented",
    description:
      "Recommend suitable D01/D02 templates from process and template metadata.",
    inputSchema: {
      id: "ProcessTaskRegisterContext",
      description: "ProcessTask[] and template library metadata.",
      validatorId: "validateAISkillInput"
    },
    outputSchema: {
      id: "TemplateRecommendationResponse",
      description: "Ranked template recommendations; no auto-apply.",
      validatorId: "validateTemplateReviewOutput"
    },
    allowedProviders: ["mock"],
    requiresApproval: true,
    dataSensitivity: "internal",
    promptPackId: "process-modeling-template-review-v1"
  },
  {
    skillId: "ptr-to-brd-outline",
    version: "1.0.0",
    module: "module-3-product-delivery",
    status: "implemented",
    description:
      "Generate a traceable BRD outline from Process Task Register and context.",
    inputSchema: {
      id: "ProductDeliveryContext",
      description: "ProcessTask[] with optional project context and source summary.",
      validatorId: "validateAISkillInput"
    },
    outputSchema: {
      id: "BRDResponse",
      description: "BRD sections with assumptions, open questions, and trace links.",
      validatorId: "validateBRDResponse"
    },
    allowedProviders: allProviders,
    requiresApproval: true,
    dataSensitivity: "confidential",
    promptPackId: "product-delivery-brd-v1"
  },
  {
    skillId: "ptr-to-srs-outline",
    version: "1.0.0",
    module: "module-3-product-delivery",
    status: "planned",
    description:
      "Generate SRS outline from process, BRD, and constraint context.",
    inputSchema: {
      id: "ProductDeliveryContext",
      description: "ProcessTask[], BRD draft, constraints, and product context.",
      validatorId: "validateAISkillInput"
    },
    outputSchema: {
      id: "SRSResponse",
      description:
        "Functional requirements, non-functional requirements, assumptions, and trace links.",
      validatorId: "validateSRSResponse"
    },
    allowedProviders: allProviders,
    requiresApproval: true,
    dataSensitivity: "confidential",
    promptPackId: "product-delivery-srs-v1"
  },
  {
    skillId: "brd-or-notes-to-user-stories",
    version: "1.0.0",
    module: "module-3-product-delivery",
    status: "planned",
    description:
      "Generate user stories and acceptance criteria from BRD, notes, or structured requirements.",
    inputSchema: {
      id: "ProductDeliveryContext",
      description: "BRD draft or notes with optional persona/module/scope context.",
      validatorId: "validateAISkillInput"
    },
    outputSchema: {
      id: "UserStorySetResponse",
      description:
        "User stories with source traceability, assumptions, and open questions.",
      validatorId: "validateUserStorySetResponse"
    },
    allowedProviders: allProviders,
    requiresApproval: true,
    dataSensitivity: "confidential",
    promptPackId: "product-delivery-user-stories-v1"
  },
  {
    skillId: "ptr-to-user-stories",
    version: "1.0.0",
    module: "module-3-product-delivery",
    status: "implemented",
    description:
      "Generate user stories from Process Task Register with stepId traceability.",
    inputSchema: {
      id: "ProductDeliveryContext",
      description: "ProcessTask[] and optional project context.",
      validatorId: "validateAISkillInput"
    },
    outputSchema: {
      id: "UserStorySetResponse",
      description: "User stories with ProcessTask.stepId references.",
      validatorId: "validateUserStorySetResponse"
    },
    allowedProviders: allProviders,
    requiresApproval: true,
    dataSensitivity: "confidential",
    promptPackId: "product-delivery-user-stories-v1"
  },
  {
    skillId: "user-stories-to-acceptance-criteria",
    version: "1.0.0",
    module: "module-3-product-delivery",
    status: "implemented",
    description:
      "Generate reviewable acceptance criteria from user stories or PTR-derived stories.",
    inputSchema: {
      id: "ProductDeliveryContext",
      description: "User stories or ProcessTask[] with story traceability.",
      validatorId: "validateAISkillInput"
    },
    outputSchema: {
      id: "AcceptanceCriteriaResponse",
      description: "Given/When/Then acceptance criteria with sourceStepIds.",
      validatorId: "validateAcceptanceCriteriaResponse"
    },
    allowedProviders: allProviders,
    requiresApproval: true,
    dataSensitivity: "confidential",
    promptPackId: "product-delivery-acceptance-criteria-v1"
  },
  {
    skillId: "user-stories-to-jira-export",
    version: "1.0.0",
    module: "module-3-product-delivery",
    status: "planned",
    description:
      "Convert reviewed stories and acceptance criteria into Jira-ready export drafts.",
    inputSchema: {
      id: "ProductDeliveryContext",
      description: "Reviewed user stories, criteria, labels, and epic metadata.",
      validatorId: "validateAISkillInput"
    },
    outputSchema: {
      id: "UserStorySetResponse",
      description: "Jira-ready story set representation before download.",
      validatorId: "validateUserStorySetResponse"
    },
    allowedProviders: allProviders,
    requiresApproval: true,
    dataSensitivity: "internal",
    promptPackId: "product-delivery-user-stories-v1"
  },
  {
    skillId: "mvp-slicing",
    version: "1.0.0",
    module: "module-3-product-delivery",
    status: "planned",
    description:
      "Recommend MVP, later, and out-of-scope slices from product delivery artifacts.",
    inputSchema: {
      id: "ProductDeliveryContext",
      description: "BRD/SRS/user stories with constraints and priority notes.",
      validatorId: "validateAISkillInput"
    },
    outputSchema: {
      id: "BRDResponse",
      description: "Structured slice recommendation captured as reviewable sections.",
      validatorId: "validateBRDResponse"
    },
    allowedProviders: allProviders,
    requiresApproval: true,
    dataSensitivity: "confidential",
    promptPackId: "product-delivery-brd-v1"
  },
  {
    skillId: "scope-nonscope-definition",
    version: "1.0.0",
    module: "module-3-product-delivery",
    status: "planned",
    description:
      "Draft scope and non-scope from process and product notes.",
    inputSchema: {
      id: "ProductDeliveryContext",
      description: "PTR, notes, BRD/SRS context, and boundary assumptions.",
      validatorId: "validateAISkillInput"
    },
    outputSchema: {
      id: "BRDResponse",
      description: "Scope/non-scope sections with assumptions and open questions.",
      validatorId: "validateBRDResponse"
    },
    allowedProviders: allProviders,
    requiresApproval: true,
    dataSensitivity: "confidential",
    promptPackId: "product-delivery-brd-v1"
  },
  {
    skillId: "requirement-quality-check",
    version: "1.0.0",
    module: "module-3-product-delivery",
    status: "planned",
    description:
      "Review BRD, SRS, user stories, and criteria for ambiguity and trace gaps.",
    inputSchema: {
      id: "ProductDeliveryContext",
      description: "Product delivery artifacts and trace links.",
      validatorId: "validateAISkillInput"
    },
    outputSchema: {
      id: "QARecommendationResponse",
      description: "Requirement quality findings expressed as review recommendations.",
      validatorId: "validateAIQARecommendations"
    },
    allowedProviders: allProviders,
    requiresApproval: true,
    dataSensitivity: "confidential",
    promptPackId: "process-modeling-qa-recommendation-v1"
  },
  {
    skillId: "ptr-to-ai-coding-pack",
    version: "1.0.0",
    module: "module-5-ai-coding-pack",
    status: "implemented",
    description:
      "Export AI-ready coding context from Process Task Register and selected templates.",
    inputSchema: {
      id: "ProductDeliveryContext",
      description: "ProcessTask[], selected templates, and optional project context.",
      validatorId: "validateAISkillInput"
    },
    outputSchema: {
      id: "AICodingPackResponse",
      description: "AI coding context files and optional spec JSON.",
      validatorId: "validateAICodingPackResponse"
    },
    allowedProviders: allProviders,
    requiresApproval: true,
    dataSensitivity: "confidential",
    promptPackId: "product-delivery-ai-coding-pack-v1"
  },
  {
    skillId: "user-stories-to-ai-coding-pack",
    version: "1.0.0",
    module: "module-5-ai-coding-pack",
    status: "planned",
    description:
      "Generate AI Coding Pack from reviewed stories, criteria, architecture constraints, and test expectations.",
    inputSchema: {
      id: "ProductDeliveryContext",
      description: "User stories, acceptance criteria, constraints, and test expectations.",
      validatorId: "validateAISkillInput"
    },
    outputSchema: {
      id: "AICodingPackResponse",
      description: "AI coding context files after user review.",
      validatorId: "validateAICodingPackResponse"
    },
    allowedProviders: allProviders,
    requiresApproval: true,
    dataSensitivity: "confidential",
    promptPackId: "product-delivery-ai-coding-pack-v1"
  }
];

export function getAISkillDefinitionV2(skillId: string) {
  return aiSkillRegistryV2.find((skill) => skill.skillId === skillId);
}

export function listAISkillsByModule(module: AISkillModule) {
  return aiSkillRegistryV2.filter((skill) => skill.module === module);
}

export function getPromptPackForSkill(skillId: string) {
  const skill = getAISkillDefinitionV2(skillId);

  return skill ? getAIPromptPack(skill.promptPackId) : undefined;
}
