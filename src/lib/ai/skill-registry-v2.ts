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
    skillId: "notes-to-brd",
    version: "1.0.0",
    module: "module-3-product-delivery",
    status: "real-ai-ready",
    description:
      "Generate a structured BRD draft from notes/chat, AI Input Brief summary, and optional uploaded file text.",
    inputSchema: {
      id: "ProductDeliveryContext",
      description:
        "Notes/chat, optional project context, AI Input Brief source summary, and uploaded file text.",
      validatorId: "validateAISkillInput"
    },
    outputSchema: {
      id: "BRDResponse",
      description:
        "Structured BRD with objective, context, scope, stakeholders, requirements, risks, assumptions, open questions, quality issues, and trace links where available.",
      validatorId: "validateBRDResponse"
    },
    allowedProviders: allProviders,
    requiresApproval: true,
    dataSensitivity: "confidential",
    promptPackId: "product-delivery-brd-v1"
  },
  {
    skillId: "ptr-to-brd",
    version: "1.0.0",
    module: "module-3-product-delivery",
    status: "real-ai-ready",
    description:
      "Generate a structured BRD draft from Process Task Register and optional source context.",
    inputSchema: {
      id: "ProductDeliveryContext",
      description:
        "ProcessTask[] plus optional notes/chat, project context, AI Input Brief summary, and uploaded file text.",
      validatorId: "validateAISkillInput"
    },
    outputSchema: {
      id: "BRDResponse",
      description:
        "Structured BRD with objective, context, scope, stakeholders, business requirements, process references, risks/dependencies, assumptions, open questions, and quality issues.",
      validatorId: "validateBRDResponse"
    },
    allowedProviders: allProviders,
    requiresApproval: true,
    dataSensitivity: "confidential",
    promptPackId: "product-delivery-brd-v1"
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
    skillId: "brd-to-srs",
    version: "1.0.0",
    module: "module-3-product-delivery",
    status: "real-ai-ready",
    description:
      "Generate a structured SRS draft from BRD draft, Process Task Register, and optional source context.",
    inputSchema: {
      id: "ProductDeliveryContext",
      description:
        "BRD draft plus optional ProcessTask[], notes/chat, project context, AI Input Brief source summary, and uploaded file text.",
      validatorId: "validateAISkillInput"
    },
    outputSchema: {
      id: "SRSResponse",
      description:
        "Structured SRS with stable functional/non-functional requirement ids, actors/roles, systems/components, data requirements, interfaces, constraints, assumptions, open questions, quality issues, and trace links.",
      validatorId: "validateSRSResponse"
    },
    allowedProviders: allProviders,
    requiresApproval: true,
    dataSensitivity: "confidential",
    promptPackId: "product-delivery-srs-v1"
  },
  {
    skillId: "notes-to-srs",
    version: "1.0.0",
    module: "module-3-product-delivery",
    status: "real-ai-ready",
    description:
      "Generate a structured SRS draft from notes/chat and optional Product Delivery source context.",
    inputSchema: {
      id: "ProductDeliveryContext",
      description:
        "Notes/chat plus optional project context, ProcessTask[], AI Input Brief source summary, uploaded file text, and BRD draft.",
      validatorId: "validateAISkillInput"
    },
    outputSchema: {
      id: "SRSResponse",
      description:
        "Structured SRS with functional and non-functional requirements, source references, assumptions, open questions, and quality issues.",
      validatorId: "validateSRSResponse"
    },
    allowedProviders: allProviders,
    requiresApproval: true,
    dataSensitivity: "confidential",
    promptPackId: "product-delivery-srs-v1"
  },
  {
    skillId: "ptr-to-srs-outline",
    version: "1.0.0",
    module: "module-3-product-delivery",
    status: "implemented",
    description:
      "Legacy deterministic SRS outline from process, BRD, and constraint context.",
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
    skillId: "srs-to-user-stories",
    version: "1.0.0",
    module: "module-3-product-delivery",
    status: "real-ai-ready",
    description:
      "Generate user stories from structured SRS, BRD/PTR context, and optional notes.",
    inputSchema: {
      id: "ProductDeliveryContext",
      description: "SRS draft plus optional BRD, ProcessTask[], notes, and source context.",
      validatorId: "validateAISkillInput"
    },
    outputSchema: {
      id: "UserStorySetResponse",
      description:
        "Epics and user stories with stable ids, roles, goals, business value, acceptance criteria, dependencies, priority/complexity, quality issues, and source requirement refs.",
      validatorId: "validateUserStorySetResponse"
    },
    allowedProviders: allProviders,
    requiresApproval: true,
    dataSensitivity: "confidential",
    promptPackId: "product-delivery-user-stories-v1"
  },
  {
    skillId: "brd-to-user-stories",
    version: "1.0.0",
    module: "module-3-product-delivery",
    status: "real-ai-ready",
    description:
      "Generate user stories from structured BRD, PTR context, and optional notes.",
    inputSchema: {
      id: "ProductDeliveryContext",
      description: "BRD draft plus optional SRS, ProcessTask[], notes, and source context.",
      validatorId: "validateAISkillInput"
    },
    outputSchema: {
      id: "UserStorySetResponse",
      description:
        "Epics and user stories with stable ids, role, goal/action, business value, acceptance criteria, dependencies, priority/complexity, quality issues, and source requirement refs.",
      validatorId: "validateUserStorySetResponse"
    },
    allowedProviders: allProviders,
    requiresApproval: true,
    dataSensitivity: "confidential",
    promptPackId: "product-delivery-user-stories-v1"
  },
  {
    skillId: "brd-or-notes-to-user-stories",
    version: "1.0.0",
    module: "module-3-product-delivery",
    status: "implemented",
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
    status: "real-ai-ready",
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
    skillId: "product-scope-review",
    version: "1.0.0",
    module: "module-3-product-delivery",
    status: "real-ai-ready",
    description:
      "Review product scope boundaries and draft in-scope/out-of-scope recommendations from Product Delivery artifacts.",
    inputSchema: {
      id: "ProductDeliveryContext",
      description: "BRD, SRS, user stories, optional business objective, and PTR context.",
      validatorId: "validateAISkillInput"
    },
    outputSchema: {
      id: "ProductScopeReviewResponse",
      description:
        "In-scope items, out-of-scope items, assumptions, open questions, MVP slice, later phases, dependencies, risks, and quality issues.",
      validatorId: "validateProductScopeReviewResponse"
    },
    allowedProviders: allProviders,
    requiresApproval: true,
    dataSensitivity: "confidential",
    promptPackId: "product-delivery-scope-review-v1"
  },
  {
    skillId: "mvp-slicing",
    version: "1.0.0",
    module: "module-3-product-delivery",
    status: "real-ai-ready",
    description:
      "Recommend MVP, later, and out-of-scope slices from product delivery artifacts.",
    inputSchema: {
      id: "ProductDeliveryContext",
      description: "BRD/SRS/user stories with constraints and priority notes.",
      validatorId: "validateAISkillInput"
    },
    outputSchema: {
      id: "ProductScopeReviewResponse",
      description:
        "MVP slice, later phases, in-scope/out-of-scope boundaries, dependencies, risks, assumptions, and open questions.",
      validatorId: "validateProductScopeReviewResponse"
    },
    allowedProviders: allProviders,
    requiresApproval: true,
    dataSensitivity: "confidential",
    promptPackId: "product-delivery-scope-review-v1"
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
