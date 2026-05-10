import type { AIModelMessage } from "@/lib/ai/providers/provider-types";

export type AIPromptPackDomain =
  | "provider-neutral"
  | "process-modeling"
  | "product-delivery";

export type AIPromptPack = {
  id: string;
  version: string;
  domain: AIPromptPackDomain;
  description: string;
  messages: AIModelMessage[];
  outputContract: string;
};

const providerNeutralSystemPrompt = [
  "You are a server-side AI skill for Process Blueprint AI Workbench.",
  "Return only structured JSON matching the requested schema.",
  "Do not include markdown fences unless a schema field explicitly asks for markdown content.",
  "Do not auto-apply, persist, or execute any generated output.",
  "Preserve source ProcessTask.stepId values wherever traceability is possible.",
  "Do not expose secrets or ask the browser for provider API keys."
].join(" ");

export const providerNeutralPromptPack: AIPromptPack = {
  id: "provider-neutral-json-v1",
  version: "1.0.0",
  domain: "provider-neutral",
  description:
    "Shared JSON-only and human-in-the-loop constraints for all MVP1-AI skills.",
  outputContract:
    "Structured JSON only; no auto-apply; include assumptions/openQuestions when the schema supports them.",
  messages: [
    {
      role: "system",
      content: providerNeutralSystemPrompt
    }
  ]
};

export const processModelingPromptPacks: AIPromptPack[] = [
  {
    id: "process-modeling-input-brief-to-ptr-v1",
    version: "1.0.0",
    domain: "process-modeling",
    description:
      "Convert a StructuredProcessBrief into a DraftProcessTaskRegister preview.",
    outputContract:
      "DraftProcessTaskRegister with draftProcessTasks, assumptions, openQuestions, sourceSummary, confidence, qualityIssues, inputLanguage, and outputLanguage.",
    messages: [
      ...providerNeutralPromptPack.messages,
      {
        role: "system",
        content:
          "Generate a draft Process Task Register from a structured business brief. Use canonical ProcessTask enum values and set uncertain rows to needsReview."
      }
    ]
  },
  {
    id: "process-modeling-file-to-draft-ptr-v1",
    version: "1.0.0",
    domain: "process-modeling",
    description:
      "Convert extracted document text and metadata into a DraftProcessTaskRegister preview.",
    outputContract:
      "DraftProcessTaskRegister with file-derived sourceSummary, qualityIssues, and explicit warnings for missing context.",
    messages: [
      ...providerNeutralPromptPack.messages,
      {
        role: "system",
        content:
          "Use extracted document content as source evidence. Do not claim OCR support when image text is unavailable."
      }
    ]
  },
  {
    id: "process-modeling-chat-to-ptr-v1",
    version: "1.0.0",
    domain: "process-modeling",
    description:
      "Convert pasted chat, notes, or manual text into a DraftProcessTaskRegister preview.",
    outputContract:
      "DraftProcessTaskRegister with draftProcessTasks, assumptions, openQuestions, sourceSummary, confidence, qualityIssues, inputLanguage, and outputLanguage.",
    messages: [
      ...providerNeutralPromptPack.messages,
      {
        role: "system",
        content:
          "Infer a draft process from pasted notes or chat transcript. Separate facts from assumptions, list unclear items as openQuestions, and keep all generated rows marked for review."
      }
    ]
  },
  {
    id: "process-modeling-qa-recommendation-v1",
    version: "1.0.0",
    domain: "process-modeling",
    description:
      "Review ProcessTask rows and return QARecommendation objects for user approval.",
    outputContract:
      "QARecommendation[] or { recommendations: QARecommendation[] } with existing targetStepIds and requiresConfirmation true.",
    messages: [
      ...providerNeutralPromptPack.messages,
      {
        role: "system",
        content:
          "Return process QA recommendations only. Rule QA runs first, so use qaIssues and existingRecommendations as context. Do not duplicate a rule recommendation unless you add clearer rationale, better prioritization, or a safer operation; use source hybrid when extending a rule recommendation. Use existing stepIds, explain the rationale, and never select graph-changing changes by default. When metadata.ptrAiAction is provided, focus only on that selected-row action and return QARecommendation[] patches or graph-changing previews for human approval."
      }
    ]
  },
  {
    id: "process-modeling-template-review-v1",
    version: "1.0.0",
    domain: "process-modeling",
    description:
      "Review TemplateProfile fit for D01 BPMN or D02 Service Blueprint.",
    outputContract:
      "{ recommendations: TemplateRecommendation[], qualityScore?: TemplateQualityScore, warnings?: string[], assumptions?: string[] } with matching templateId.",
    messages: [
      ...providerNeutralPromptPack.messages,
      {
        role: "system",
        content:
          "Review template metadata and rules only. Check BPMN template fit, Service Blueprint template fit, mandatory fields, lane or row rules, connector and layout risks, and business domain or process type fit. Return review-only TemplateRecommendation objects, qualityScore when possible, warnings, and assumptions. Do not modify D01/D02 generators and do not apply template patches automatically."
      }
    ]
  },
  {
    id: "process-modeling-artifact-review-v1",
    version: "1.0.0",
    domain: "process-modeling",
    description:
      "Review generated D01 BPMN or D02 Service Blueprint output without mutating artifact XML.",
    outputContract:
      "{ recommendations: QARecommendation[], templateRecommendations: TemplateRecommendation[], warnings: string[] }.",
    messages: [
      ...providerNeutralPromptPack.messages,
      {
        role: "system",
        content:
          "Review the generated BPMN or draw.io XML as an artifact quality check. Never rewrite or patch the XML directly. Any process fix must be returned as QARecommendation objects targeting existing ProcessTask.stepId values. Any template fix must be returned as TemplateRecommendation objects for the selected template. Put artifact-only concerns that cannot safely become a PTR or template fix into warnings."
      }
    ]
  }
];

export const productDeliveryPromptPacks: AIPromptPack[] = [
  {
    id: "product-delivery-brd-v1",
    version: "1.0.0",
    domain: "product-delivery",
    description:
      "Generate a traceable BRD response from ProcessTask rows and optional project context.",
    outputContract:
      "BRDResponse with businessObjective, backgroundContext, scope, stakeholders, businessRequirements, processReferences, risksDependencies, assumptions, openQuestions, qualityIssues, sections, and optional traceLinks.",
    messages: [
      ...providerNeutralPromptPack.messages,
      {
        role: "system",
        content:
          "Draft a structured BRD from the Process Task Register, notes/chat, AI Input Brief summary, and uploaded file text when provided. Include business objective, background/context, scope, out of scope, stakeholders, assumptions, open questions, business requirements, process references when PTR rows are provided, and risks/dependencies. Keep every process-derived statement traceable to sourceStepIds where possible. Add qualityIssues for missing objective, missing scope, vague requirement, or missing stakeholder instead of hiding uncertainty."
      }
    ]
  },
  {
    id: "product-delivery-srs-v1",
    version: "1.0.0",
    domain: "product-delivery",
    description:
      "Generate an SRS response from process, BRD, and constraint context.",
    outputContract:
      "SRSResponse with stable requirement ids, actorsRoles, systemsComponents, functionalRequirements, nonFunctionalRequirements, dataRequirements, interfaceIntegrationRequirements, constraints, assumptions, openQuestions, qualityIssues, and traceLinks.",
    messages: [
      ...providerNeutralPromptPack.messages,
      {
        role: "system",
        content:
          "Draft a structured SRS from BRD draft, notes/chat, and Process Task Register context. Include stable ids for functional requirements and non-functional requirements, actor/role references, system/component references, data requirements, interface/integration requirements, constraints, assumptions, open questions, and trace links where possible. Add qualityIssues for requirement-not-testable, missing-actor-system, missing-nfr, or unclear-dependency instead of hiding uncertainty. Do not invent implementation details not supported by the source."
      }
    ]
  },
  {
    id: "product-delivery-user-stories-v1",
    version: "1.0.0",
    domain: "product-delivery",
    description:
      "Generate user stories from PTR, BRD, notes, or structured requirement context.",
    outputContract:
      "UserStorySetResponse with epics, stories, stable ids, role, goal, businessValue, acceptanceCriteria, dependencies, priority/complexity, sourceRequirementIds, sourceStepIds, qualityIssues, assumptions, openQuestions, and traceLinks.",
    messages: [
      ...providerNeutralPromptPack.messages,
      {
        role: "system",
        content:
          "Create user stories from SRS, BRD, Process Task Register, notes, or chat context. Preserve actor intent, source ProcessTask.stepId values, and source requirement ids where possible. Include epics when useful, stable story ids, role, goal/action, business value, acceptance criteria, dependencies, priority or complexity if inferable, assumptions, open questions, and qualityIssues for missing-role, missing-value, missing-ac, story-too-broad, or no-source-trace. Do not auto-apply or persist anything."
      }
    ]
  },
  {
    id: "product-delivery-acceptance-criteria-v1",
    version: "1.0.0",
    domain: "product-delivery",
    description:
      "Generate Given/When/Then acceptance criteria for reviewed stories or PTR-derived stories.",
    outputContract:
      "AcceptanceCriteriaResponse with criteria, stable ids, storyId, Given/When/Then, sourceStepIds, sourceRequirementIds, qualityIssues, assumptions, and openQuestions.",
    messages: [
      ...providerNeutralPromptPack.messages,
      {
        role: "system",
        content:
          "Write testable Given/When/Then criteria from reviewed user stories. Preserve storyId, sourceStepIds, and sourceRequirementIds when available. Add qualityIssues for missing-ac, ac-not-testable, and no-source-trace instead of hiding uncertainty. Do not auto-apply or persist anything."
      }
    ]
  },
  {
    id: "product-delivery-scope-review-v1",
    version: "1.0.0",
    domain: "product-delivery",
    description:
      "Review product scope boundaries and propose MVP/later phase slicing from Product Delivery artifacts.",
    outputContract:
      "ProductScopeReviewResponse with inScope, outOfScope, assumptions, openQuestions, mvpSlice, laterPhases, dependencies, risks, qualityIssues, and traceLinks.",
    messages: [
      ...providerNeutralPromptPack.messages,
      {
        role: "system",
        content:
          "Review BRD, SRS, user stories, Process Task Register, notes, and optional business objective to produce a ProductScopeReviewResponse. Return only structured JSON. Include explicit in-scope and out-of-scope items, assumptions, open questions, MVP slice, later phases, dependencies, risks, qualityIssues, and source refs where possible. Keep output draft/preview only and do not auto-apply or persist anything."
      }
    ]
  },
  {
    id: "product-delivery-ai-coding-pack-v1",
    version: "1.0.0",
    domain: "product-delivery",
    description:
      "Generate AI Coding Pack files for Codex, Claude Code, Cursor, and similar tools.",
    outputContract:
      "AICodingPackResponse with files[], specJson, assumptions, openQuestions, qualityIssues, and optional traceLinks.",
    messages: [
      ...providerNeutralPromptPack.messages,
      {
        role: "system",
        content:
          "Generate coding-context files only from BRD, SRS, user stories, acceptance criteria, and Process Task Register context. Required files are AGENTS.md, CLAUDE.md, cursor-rules.md, spec.json, implementation-plan.md, acceptance-criteria.md, and test-plan.md. Include project goal, non-goals, requirements, user stories, acceptance criteria, architecture constraints, data/privacy constraints, testing expectations, and traceability refs. Add qualityIssues for missing AC, missing non-goals, missing test expectations, and unresolved open questions. Do not generate executable changes, do not call external tools, and keep source step/story/requirement traceability in spec.json."
      }
    ]
  },
  {
    id: "product-delivery-requirement-qa-v1",
    version: "1.0.0",
    domain: "product-delivery",
    description:
      "Review Product Delivery artifacts for requirement quality and trace coverage.",
    outputContract:
      "RequirementQAResponse with findings[], recommendations[], coverage, assumptions, openQuestions, and warnings.",
    messages: [
      ...providerNeutralPromptPack.messages,
      {
        role: "system",
        content:
          "Review BRD, SRS, user stories, acceptance criteria, and AI Coding Pack artifacts. Check vague BRD requirements, missing BRD scope/stakeholder/objective, non-testable SRS requirements, missing NFR, user stories missing role/value/AC, non-testable acceptance criteria, AI Coding Pack missing constraints/test plan/non-goals, and trace coverage from BRD to SRS to user stories to AC. Return findings and draftPatch recommendations only. Do not apply, save, export, mutate source artifacts, or invent hidden requirements."
      }
    ]
  }
];

export const aiPromptPacks: AIPromptPack[] = [
  providerNeutralPromptPack,
  ...processModelingPromptPacks,
  ...productDeliveryPromptPacks
];

export function getAIPromptPack(promptPackId: string) {
  return aiPromptPacks.find((promptPack) => promptPack.id === promptPackId);
}
