import { NextResponse } from "next/server";
import {
  generateDraftProcessTaskRegister,
  parseStructuredProcessBriefFromForm,
  validateDraftProcessTaskRegister,
  validateStructuredProcessBrief
} from "@/lib/ai-intake";
import type { IntakeLanguage } from "@/lib/ai-intake";
import type { ProcessTask } from "@/lib/models/process-task";
import {
  generateAICodingPack,
  type AICodingPackFiles
} from "@/lib/generators/ai-coding-pack-generator";
import {
  generateAcceptanceCriteriaSet,
  generateBRD,
  generateProductScopeReview,
  generateSRS,
  generateUserStorySet
} from "@/lib/generators/product-delivery-generator";
import {
  runAcceptanceCriteriaQualityGate,
  runBRDQualityGate,
  runProductScopeReviewQualityGate,
  runRequirementQualityCheck,
  runSRSQualityGate,
  runUserStoryQualityGate,
  type AcceptanceCriteriaSet,
  type BRD,
  type ProductScopeReview,
  type RequirementQAResponse,
  type SRS,
  type UserStorySet
} from "@/lib/models/product-delivery";
import { runMockAIQA } from "@/lib/ai/ai-qa-service";
import type { AIQARequest } from "@/lib/ai/ai-qa-types";
import { runMockTemplateReview } from "@/lib/ai/ai-template-review-service";
import type {
  AITemplateReviewRequest,
  TemplateRecommendation
} from "@/lib/ai/ai-template-review-types";
import {
  createConfiguredAIProvider,
  getAIProviderStatus,
  getConfiguredAIModel,
  getConfiguredAIProviderId,
  isAIProviderConfigured
} from "@/lib/ai/providers/provider-factory";
import {
  extractJsonText,
  type AIModelMessage,
  type AIModelRequest,
  type AIProviderId,
  type AIProviderResponse
} from "@/lib/ai/providers/provider-types";
import {
  getAISkillDefinitionV2,
  getPromptPackForSkill,
  type AISkillDefinitionV2
} from "@/lib/ai/skill-registry-v2";
import {
  normalizeDeterministicCodingPack,
  runAICodingPackQualityGate,
  validateAISkillInput,
  validateAISkillOutput,
  type AICodingPackResponse,
  type AISkillValidationContext
} from "@/lib/ai/skill-schemas";
import {
  formatQualityGateErrorsVi,
  formatQualityGateWarningsVi,
  runBriefQualityGate,
  runDraftProcessTaskRegisterQualityGate
} from "@/lib/quality-engine";
import { validateAIQARecommendations } from "@/lib/recommendation-engine/qa-recommendation-schema";
import type { QARecommendation } from "@/lib/recommendation-engine/types";
import { validateTemplateReviewOutput } from "@/lib/template-recommendation-engine";

export const runtime = "nodejs";

type RunSkillRequestBody = {
  action?: unknown;
  skillId?: unknown;
  payload?: unknown;
  providerId?: unknown;
};

type DataUsageMode =
  | "local-only"
  | "cloud-processing"
  | "no-training"
  | "organization-private-learning";

const INPUT_BRIEF_TO_PTR_SKILL_ID = "input-brief-to-ptr";
const FILE_TO_PTR_DRAFT_SKILL_ID = "file-to-ptr-draft";
const LEGACY_FILE_TO_DRAFT_PTR_SKILL_ID = "file-to-draft-ptr";
const CHAT_TO_PTR_DRAFT_SKILL_ID = "chat-to-ptr-draft";
const LEGACY_CHAT_TO_DRAFT_PTR_SKILL_ID = "chat-to-draft-ptr";
const AI_PROCESS_QA_SKILL_ID = "ai-process-qa";
const PROCESS_IMPROVEMENT_RECOMMENDATION_SKILL_ID =
  "process-improvement-recommendation";
const ARTIFACT_REVIEW_SKILL_ID = "artifact-review";
const AI_TEMPLATE_REVIEW_SKILL_ID = "ai-template-review";
const TEMPLATE_REVIEW_REGISTRY_SKILL_ID = "template-review";
const NOTES_TO_BRD_SKILL_ID = "notes-to-brd";
const PTR_TO_BRD_SKILL_ID = "ptr-to-brd";
const LEGACY_PTR_TO_BRD_OUTLINE_SKILL_ID = "ptr-to-brd-outline";
const BRD_TO_SRS_SKILL_ID = "brd-to-srs";
const NOTES_TO_SRS_SKILL_ID = "notes-to-srs";
const SRS_TO_USER_STORIES_SKILL_ID = "srs-to-user-stories";
const BRD_TO_USER_STORIES_SKILL_ID = "brd-to-user-stories";
const LEGACY_BRD_OR_NOTES_TO_USER_STORIES_SKILL_ID =
  "brd-or-notes-to-user-stories";
const USER_STORIES_TO_ACCEPTANCE_CRITERIA_SKILL_ID =
  "user-stories-to-acceptance-criteria";
const PRODUCT_SCOPE_REVIEW_SKILL_ID = "product-scope-review";
const MVP_SLICING_SKILL_ID = "mvp-slicing";
const REQUIREMENT_QUALITY_CHECK_SKILL_ID = "requirement-quality-check";
const USER_STORIES_TO_AI_CODING_PACK_SKILL_ID =
  "user-stories-to-ai-coding-pack";
const ORCHESTRATION_VERSION = "2.0.0";
const DEFAULT_PROVIDER_TIMEOUT_MS = 45000;
const SERVER_PROVIDER_IDS: AIProviderId[] = ["product-ai", "openai", "claude", "mock"];

function isAIProviderId(value: unknown): value is AIProviderId {
  return SERVER_PROVIDER_IDS.includes(value as AIProviderId);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidRunSkillRequest(
  value: unknown
): value is RunSkillRequestBody & { skillId: string } {
  return (
    isObject(value) &&
    typeof value.skillId === "string" &&
    value.skillId.trim().length > 0 &&
    "payload" in value
  );
}

function getRegistrySkillId(routeSkillId: string) {
  if (routeSkillId === AI_TEMPLATE_REVIEW_SKILL_ID) {
    return TEMPLATE_REVIEW_REGISTRY_SKILL_ID;
  }

  if (routeSkillId === LEGACY_FILE_TO_DRAFT_PTR_SKILL_ID) {
    return FILE_TO_PTR_DRAFT_SKILL_ID;
  }

  if (routeSkillId === LEGACY_CHAT_TO_DRAFT_PTR_SKILL_ID) {
    return CHAT_TO_PTR_DRAFT_SKILL_ID;
  }

  if (routeSkillId === LEGACY_PTR_TO_BRD_OUTLINE_SKILL_ID) {
    return PTR_TO_BRD_SKILL_ID;
  }

  return routeSkillId;
}

function getProviderName() {
  return getConfiguredAIProviderId();
}

function getAnyRealAIEnabled() {
  return (
    process.env.ENABLE_REAL_AI === "true" ||
    process.env.ENABLE_REAL_AI_QA === "true" ||
    process.env.ENABLE_REAL_AI_TEMPLATE_REVIEW === "true"
  );
}

function getProviderDisplayStatus(providerId: AIProviderId) {
  if (providerId === "mock") {
    return "available";
  }

  if (!getAnyRealAIEnabled()) {
    return "disabled";
  }

  return isAIProviderConfigured(providerId) ? "configured" : "missing env";
}

function getProviderStatusSummary() {
  return SERVER_PROVIDER_IDS.map((providerId) => ({
    providerId,
    status: getProviderDisplayStatus(providerId),
    selected: providerId === getProviderName(),
    model: getConfiguredAIModel(providerId) || ""
  }));
}

function getProviderTimeoutMs() {
  const configuredTimeout = Number(process.env.AI_PROVIDER_TIMEOUT_MS);

  return Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : DEFAULT_PROVIDER_TIMEOUT_MS;
}

function getServerDataUsageMode(
  realAIEnabled: boolean,
  providerId: AIProviderId
): DataUsageMode {
  const value = (
    process.env.AI_DATA_USAGE_MODE ||
    process.env.AI_DATA_MODE ||
    ""
  ).trim();
  const validDataModes = new Set<DataUsageMode>([
    "local-only",
    "cloud-processing",
    "no-training",
    "organization-private-learning"
  ]);

  if (validDataModes.has(value as DataUsageMode)) {
    return value as DataUsageMode;
  }

  return realAIEnabled && providerId !== "mock" ? "no-training" : "local-only";
}

function isRealAIEnabledForSkill(routeSkillId: string) {
  if (routeSkillId === AI_PROCESS_QA_SKILL_ID) {
    return process.env.ENABLE_REAL_AI_QA === "true";
  }

  if (routeSkillId === AI_TEMPLATE_REVIEW_SKILL_ID) {
    return process.env.ENABLE_REAL_AI_TEMPLATE_REVIEW === "true";
  }

  return process.env.ENABLE_REAL_AI === "true";
}

function isRouteBackedByDeterministicMock(routeSkillId: string) {
  return [
    INPUT_BRIEF_TO_PTR_SKILL_ID,
    FILE_TO_PTR_DRAFT_SKILL_ID,
    LEGACY_FILE_TO_DRAFT_PTR_SKILL_ID,
    CHAT_TO_PTR_DRAFT_SKILL_ID,
    LEGACY_CHAT_TO_DRAFT_PTR_SKILL_ID,
    AI_PROCESS_QA_SKILL_ID,
    PROCESS_IMPROVEMENT_RECOMMENDATION_SKILL_ID,
    ARTIFACT_REVIEW_SKILL_ID,
    AI_TEMPLATE_REVIEW_SKILL_ID,
    NOTES_TO_BRD_SKILL_ID,
    PTR_TO_BRD_SKILL_ID,
    LEGACY_PTR_TO_BRD_OUTLINE_SKILL_ID,
    BRD_TO_SRS_SKILL_ID,
    NOTES_TO_SRS_SKILL_ID,
    SRS_TO_USER_STORIES_SKILL_ID,
    BRD_TO_USER_STORIES_SKILL_ID,
    LEGACY_BRD_OR_NOTES_TO_USER_STORIES_SKILL_ID,
    USER_STORIES_TO_ACCEPTANCE_CRITERIA_SKILL_ID,
    PRODUCT_SCOPE_REVIEW_SKILL_ID,
    MVP_SLICING_SKILL_ID,
    REQUIREMENT_QUALITY_CHECK_SKILL_ID,
    USER_STORIES_TO_AI_CODING_PACK_SKILL_ID
  ].includes(routeSkillId);
}

function isBRDGenerationSkill(routeSkillId: string) {
  return [
    NOTES_TO_BRD_SKILL_ID,
    PTR_TO_BRD_SKILL_ID,
    LEGACY_PTR_TO_BRD_OUTLINE_SKILL_ID
  ].includes(routeSkillId);
}

function isSRSGenerationSkill(routeSkillId: string) {
  return [BRD_TO_SRS_SKILL_ID, NOTES_TO_SRS_SKILL_ID].includes(routeSkillId);
}

function isUserStoryGenerationSkill(routeSkillId: string) {
  return [
    SRS_TO_USER_STORIES_SKILL_ID,
    BRD_TO_USER_STORIES_SKILL_ID,
    LEGACY_BRD_OR_NOTES_TO_USER_STORIES_SKILL_ID
  ].includes(routeSkillId);
}

function isAcceptanceCriteriaGenerationSkill(routeSkillId: string) {
  return routeSkillId === USER_STORIES_TO_ACCEPTANCE_CRITERIA_SKILL_ID;
}

function isProductScopeReviewSkill(routeSkillId: string) {
  return [
    PRODUCT_SCOPE_REVIEW_SKILL_ID,
    MVP_SLICING_SKILL_ID
  ].includes(routeSkillId);
}

function isAICodingPackGenerationSkill(routeSkillId: string) {
  return routeSkillId === USER_STORIES_TO_AI_CODING_PACK_SKILL_ID;
}

function isRequirementQualityCheckSkill(routeSkillId: string) {
  return routeSkillId === REQUIREMENT_QUALITY_CHECK_SKILL_ID;
}

function isDraftPtrGenerationSkill(routeSkillId: string) {
  return [
    INPUT_BRIEF_TO_PTR_SKILL_ID,
    FILE_TO_PTR_DRAFT_SKILL_ID,
    LEGACY_FILE_TO_DRAFT_PTR_SKILL_ID,
    CHAT_TO_PTR_DRAFT_SKILL_ID,
    LEGACY_CHAT_TO_DRAFT_PTR_SKILL_ID
  ].includes(routeSkillId);
}

function getOutputSchemaLabel(skill: AISkillDefinitionV2) {
  return `${skill.outputSchema.id}: ${skill.outputSchema.description}`;
}

function createProviderMessages({
  skill,
  routeSkillId,
  payload
}: {
  skill: AISkillDefinitionV2;
  routeSkillId: string;
  payload: unknown;
}): AIModelMessage[] {
  const promptPack = getPromptPackForSkill(skill.skillId);
  const promptMessages = promptPack?.messages ?? [];

  return [
    ...promptMessages,
    {
      role: "user",
      content: JSON.stringify(
        {
          skillId: routeSkillId,
          registrySkillId: skill.skillId,
          skillVersion: skill.version,
          module: skill.module,
          promptPackId: skill.promptPackId,
          promptPackVersion: promptPack?.version,
          inputSchema: skill.inputSchema,
          outputSchema: skill.outputSchema,
          requiredOutput: getOutputSchemaLabel(skill),
          requiresApproval: skill.requiresApproval,
          policy: {
            noAutoApply: true,
            returnStructuredJsonOnly: true,
            doNotExposeSecrets: true
          },
          payload
        },
        null,
        2
      )
    }
  ];
}

function parseProviderJson(result: AIProviderResponse) {
  if (result.parsedJson !== undefined) {
    return result.parsedJson;
  }

  if (result.rawJson !== undefined) {
    return result.rawJson;
  }

  if (!result.rawText) {
    throw new Error("AI provider output did not include text content.");
  }

  return JSON.parse(extractJsonText(result.rawText));
}

function createRepairMessages({
  skill,
  routeSkillId,
  malformedJson
}: {
  skill: AISkillDefinitionV2;
  routeSkillId: string;
  malformedJson: string;
}): AIModelMessage[] {
  return [
    {
      role: "system",
      content:
        "Repair the malformed model output into valid JSON only. Do not add new facts. Do not include markdown. The repaired JSON must match the requested output schema."
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          skillId: routeSkillId,
          outputSchema: skill.outputSchema,
          malformedJson
        },
        null,
        2
      )
    }
  ];
}

function createProviderMeta(
  result: AIProviderResponse,
  additionalMeta: Record<string, unknown>
  ) {
  return {
    orchestrationVersion: ORCHESTRATION_VERSION,
    externalApiCalled: result.externalApiCalled,
    providerId: result.providerId,
    model: result.model,
    requestId: result.requestId,
    tokenUsage: result.tokenUsage,
    latencyMs: result.latencyMs,
    warnings: result.warnings,
    ...additionalMeta
  };
}

function createSafeAuditMetadata({
  skill,
  routeSkillId,
  providerId,
  dataUsageMode,
  mode,
  validationPassed,
  requestId,
  latencyMs,
  externalApiCalled,
  outputRepairAttempted,
  errorCode
}: {
  skill: AISkillDefinitionV2;
  routeSkillId: string;
  providerId: AIProviderId;
  dataUsageMode: DataUsageMode;
  mode: "mock" | "provider-backed";
  validationPassed: boolean;
  requestId?: string;
  latencyMs?: number;
  externalApiCalled: boolean;
  outputRepairAttempted?: boolean;
  errorCode?: string;
}) {
  return {
    action: "ai_call",
    orchestrationVersion: ORCHESTRATION_VERSION,
    skillId: routeSkillId,
    registrySkillId: skill.skillId,
    skillVersion: skill.version,
    module: skill.module,
    promptPackId: skill.promptPackId,
    inputSchema: skill.inputSchema.id,
    outputSchema: skill.outputSchema.id,
    providerId,
    dataUsageMode,
    mode,
    requiresApproval: skill.requiresApproval,
    dataSensitivity: skill.dataSensitivity,
    externalApiCalled,
    validationPassed,
    outputRepairAttempted: outputRepairAttempted === true,
    requestId,
    latencyMs,
    errorCode,
    timestamp: new Date().toISOString()
  };
}

function recordServerAudit(metadata: ReturnType<typeof createSafeAuditMetadata>) {
  console.info("ai_orchestration_audit", metadata);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeout = setTimeout(
      () => reject(new Error(`AI provider request timed out after ${timeoutMs}ms.`)),
      timeoutMs
    );
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function runConfiguredProviderWithTimeout(
  aiRequest: AIModelRequest,
  providerId = getProviderName()
) {
  const provider = createConfiguredAIProvider(providerId);

  return withTimeout(provider.run(aiRequest), getProviderTimeoutMs());
}

async function parseProviderJsonWithOptionalRepair({
  skill,
  routeSkillId,
  payload,
  result
}: {
  skill: AISkillDefinitionV2;
  routeSkillId: string;
  payload: unknown;
  result: AIProviderResponse;
}): Promise<{
  parsedResult?: unknown;
  providerResult: AIProviderResponse;
  repairAttempted: boolean;
  parseError?: string;
}> {
  try {
    return {
      parsedResult: parseProviderJson(result),
      providerResult: result,
      repairAttempted: false
    };
  } catch (error) {
    if (!result.rawText?.trim()) {
      return {
        providerResult: result,
        repairAttempted: false,
        parseError:
          error instanceof Error ? error.message : "AI output was not valid JSON."
      };
    }

    try {
      const repairResult = await runConfiguredProviderWithTimeout(
        {
          skillId: routeSkillId,
          payload: {
            repairOnly: true,
            sourceProviderRequestId: result.requestId,
            sourceOutputLength: result.rawText.length
          },
          model: result.model,
          messages: createRepairMessages({
            skill,
            routeSkillId,
            malformedJson: result.rawText.slice(0, 24000)
          })
        },
        result.providerId
      );

      return {
        parsedResult: parseProviderJson(repairResult),
        providerResult: {
          ...repairResult,
          warnings: [
            ...result.warnings,
            ...repairResult.warnings,
            "One malformed JSON repair attempt was used."
          ]
        },
        repairAttempted: true
      };
    } catch (repairError) {
      return {
        providerResult: result,
        repairAttempted: true,
        parseError:
          repairError instanceof Error
            ? repairError.message
            : "AI JSON repair attempt failed."
      };
    }
  }
}

function isAIQAPayload(value: unknown): value is Omit<AIQARequest, "context"> {
  return (
    isObject(value) &&
    Array.isArray(value.processTasks) &&
    (value.templateProfiles === undefined || Array.isArray(value.templateProfiles))
  );
}

type FileToPtrDraftPayload = {
  fileName: string;
  fileType: string;
  extractedText: string;
  extractionWarnings?: string[];
  detectedActors?: string[];
  detectedSystems?: string[];
  detectedDataObjects?: string[];
  detectedSteps?: string[];
  userContext?: string;
  inputLanguage?: IntakeLanguage;
  outputLanguage?: IntakeLanguage;
};

type ChatToPtrDraftPayload = {
  notes: string;
  userContext?: string;
  inputLanguage?: IntakeLanguage;
  outputLanguage?: IntakeLanguage;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isLocaleValue(value: unknown): value is IntakeLanguage {
  return value === "vi" || value === "en";
}

function getPayloadLocale(value: unknown, fallback: IntakeLanguage = "vi") {
  return isLocaleValue(value) ? value : fallback;
}

function isFileToPtrDraftPayload(value: unknown): value is FileToPtrDraftPayload {
  return (
    isObject(value) &&
    typeof value.fileName === "string" &&
    typeof value.fileType === "string" &&
    typeof value.extractedText === "string"
  );
}

function isChatToPtrDraftPayload(value: unknown): value is ChatToPtrDraftPayload {
  return isObject(value) && typeof value.notes === "string";
}

function getFirstNonEmptyLine(value: string, fallback: string) {
  return (
    value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) ?? fallback
  );
}

function getLastNonEmptyLine(value: string, fallback: string) {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines[lines.length - 1] ?? fallback;
}

function normalizeStringArray(value: unknown) {
  return isStringArray(value) ? value : [];
}

function createBriefFromFilePayload(payload: FileToPtrDraftPayload) {
  const text = payload.extractedText;
  const detectedSteps = normalizeStringArray(payload.detectedSteps);
  const inputLanguage = getPayloadLocale(payload.inputLanguage);
  const outputLanguage = getPayloadLocale(payload.outputLanguage, inputLanguage);

  return parseStructuredProcessBriefFromForm({
    processInfo:
      detectedSteps[0] || getFirstNonEmptyLine(text, payload.fileName || "File-derived process"),
    businessObjective: [payload.userContext, text].filter(Boolean).join("\n").slice(0, 1800),
    scope: text.slice(0, 1800),
    startEnd: [
      detectedSteps[0] || getFirstNonEmptyLine(text, "Request received"),
      detectedSteps[detectedSteps.length - 1] ||
        getLastNonEmptyLine(text, "Process completed")
    ].join("\n"),
    actors: normalizeStringArray(payload.detectedActors).join("\n"),
    relatedSystems: normalizeStringArray(payload.detectedSystems).join("\n"),
    dataDocuments: normalizeStringArray(payload.detectedDataObjects).join("\n"),
    inputLanguage,
    outputLanguage
  });
}

function createBriefFromChatPayload(payload: ChatToPtrDraftPayload) {
  const notes = payload.notes;
  const inputLanguage = getPayloadLocale(payload.inputLanguage);
  const outputLanguage = getPayloadLocale(payload.outputLanguage, inputLanguage);

  return parseStructuredProcessBriefFromForm({
    processInfo: getFirstNonEmptyLine(notes, "Chat-derived process"),
    businessObjective: [payload.userContext, notes].filter(Boolean).join("\n").slice(0, 1800),
    scope: notes.slice(0, 1800),
    startEnd: [
      getFirstNonEmptyLine(notes, "Request received"),
      getLastNonEmptyLine(notes, "Process completed")
    ].join("\n"),
    actors: "",
    relatedSystems: "",
    dataDocuments: "",
    inputLanguage,
    outputLanguage
  });
}

type TemplateReviewPayload = Omit<
  AITemplateReviewRequest,
  "context" | "templateProfiles"
> & {
  selectedTemplate?: unknown;
};

type ArtifactReviewPayload = {
  artifactType: "bpmn" | "service-blueprint";
  artifactXml: string;
  processTasks: ProcessTask[];
  selectedTemplate: unknown;
  qaIssues?: unknown;
};

type BRDGenerationPayload = {
  processTasks?: ProcessTask[];
  projectContext?: string;
  notes?: string;
  sourceSummary?: string;
  uploadedFileText?: string;
  generatedAt?: string;
};

type SRSGenerationPayload = BRDGenerationPayload & {
  brd?: BRD;
};

type UserStoryGenerationPayload = SRSGenerationPayload & {
  srs?: SRS;
};

type AcceptanceCriteriaGenerationPayload = BRDGenerationPayload & {
  userStorySet?: UserStorySet;
};

type ProductScopeReviewPayload = UserStoryGenerationPayload & {
  userStorySet?: UserStorySet;
  businessObjective?: string;
};

type AICodingPackGenerationPayload = ProductScopeReviewPayload & {
  acceptanceCriteria?: AcceptanceCriteriaSet;
  assumptions?: string[];
  openQuestions?: string[];
};

type RequirementQualityCheckPayload = {
  brd?: BRD;
  srs?: SRS;
  userStorySet?: UserStorySet;
  acceptanceCriteria?: AcceptanceCriteriaSet;
  aiCodingPack?: {
    files?: Array<{
      path: string;
      content: string;
    }>;
    qualityIssues?: string[];
  };
  generatedAt?: string;
};

function isTemplateReviewPayload(
  value: unknown
): value is TemplateReviewPayload {
  return isObject(value) && isObject(value.selectedTemplate);
}

function isArtifactReviewPayload(
  value: unknown
): value is ArtifactReviewPayload {
  return (
    isObject(value) &&
    (value.artifactType === "bpmn" ||
      value.artifactType === "service-blueprint") &&
    typeof value.artifactXml === "string" &&
    value.artifactXml.trim().length > 0 &&
    Array.isArray(value.processTasks) &&
    isObject(value.selectedTemplate)
  );
}

function isBRDGenerationPayload(value: unknown): value is BRDGenerationPayload {
  return isObject(value);
}

function isSRSGenerationPayload(value: unknown): value is SRSGenerationPayload {
  return isObject(value);
}

function isUserStoryGenerationPayload(
  value: unknown
): value is UserStoryGenerationPayload {
  return isObject(value);
}

function isAcceptanceCriteriaGenerationPayload(
  value: unknown
): value is AcceptanceCriteriaGenerationPayload {
  return isObject(value);
}

function isProductScopeReviewPayload(
  value: unknown
): value is ProductScopeReviewPayload {
  return isObject(value);
}

function isAICodingPackGenerationPayload(
  value: unknown
): value is AICodingPackGenerationPayload {
  return isObject(value);
}

function isRequirementQualityCheckPayload(
  value: unknown
): value is RequirementQualityCheckPayload {
  return isObject(value);
}

function hasEnoughBRDText(payload: BRDGenerationPayload) {
  return [
    payload.projectContext,
    payload.notes,
    payload.sourceSummary,
    payload.uploadedFileText
  ]
    .filter((item): item is string => typeof item === "string")
    .join("\n")
    .trim().length >= 20;
}

function hasEnoughSRSText(payload: SRSGenerationPayload) {
  return hasEnoughBRDText(payload) || isObject(payload.brd);
}

function hasEnoughUserStoryText(payload: UserStoryGenerationPayload) {
  return hasEnoughSRSText(payload) || isObject(payload.srs);
}

function hasScopeReviewContext(payload: ProductScopeReviewPayload) {
  return (
    Array.isArray(payload.processTasks) ||
    isObject(payload.brd) ||
    isObject(payload.srs) ||
    isObject(payload.userStorySet) ||
    hasEnoughBRDText(payload) ||
    typeof payload.businessObjective === "string"
  );
}

function hasAICodingPackContext(payload: AICodingPackGenerationPayload) {
  return (
    isObject(payload.userStorySet) ||
    isObject(payload.acceptanceCriteria) ||
    isObject(payload.brd) ||
    isObject(payload.srs) ||
    Array.isArray(payload.processTasks)
  );
}

function hasRequirementQualityContext(payload: RequirementQualityCheckPayload) {
  return (
    isObject(payload.brd) ||
    isObject(payload.srs) ||
    isObject(payload.userStorySet) ||
    isObject(payload.acceptanceCriteria) ||
    isObject(payload.aiCodingPack)
  );
}

function getValidationContext(
  routeSkillId: string,
  payload: unknown
): AISkillValidationContext {
  if (routeSkillId === AI_PROCESS_QA_SKILL_ID && isAIQAPayload(payload)) {
    return {
      validStepIds: payload.processTasks.map((task) => task.stepId)
    };
  }

  if (routeSkillId === AI_TEMPLATE_REVIEW_SKILL_ID && isTemplateReviewPayload(payload)) {
    return {
      selectedTemplate: payload.selectedTemplate as AITemplateReviewRequest["templateProfiles"][number]
    };
  }

  if (routeSkillId === ARTIFACT_REVIEW_SKILL_ID && isArtifactReviewPayload(payload)) {
    return {
      validStepIds: payload.processTasks.map((task) => task.stepId),
      selectedTemplate:
        payload.selectedTemplate as AITemplateReviewRequest["templateProfiles"][number]
    };
  }

  if (isObject(payload) && Array.isArray(payload.processTasks)) {
    return {
      validStepIds: payload.processTasks
        .map((task) => (isObject(task) ? task.stepId : undefined))
        .filter((stepId): stepId is string => typeof stepId === "string")
    };
  }

  return {};
}

function isGraphChangingQARecommendation(recommendation: QARecommendation) {
  return (recommendation.operations ?? []).some((operation) =>
    [
      "SplitTask",
      "CreateTaskAfter",
      "CreateTaskBefore",
      "InsertTaskBetween",
      "CreateGateway",
      "AddGatewayBranch",
      "UpdateConnection",
      "CreateLane"
    ].includes(operation.kind)
  );
}

function enforceGraphChangingRisk(recommendations: QARecommendation[]) {
  return recommendations.map((recommendation) =>
    isGraphChangingQARecommendation(recommendation)
      ? {
          ...recommendation,
          impact: "high" as const,
          riskLevel: "high" as const,
          requiresConfirmation: true,
          warnings: [
            ...(recommendation.warnings ?? []),
            "Graph-changing AI recommendation requires explicit human confirmation."
          ]
        }
      : recommendation
  );
}

function normalizeValidatedResult(routeSkillId: string, value: unknown) {
  if (routeSkillId === PROCESS_IMPROVEMENT_RECOMMENDATION_SKILL_ID) {
    return {
      recommendations: enforceGraphChangingRisk(value as QARecommendation[])
    };
  }

  if (routeSkillId === AI_PROCESS_QA_SKILL_ID) {
    return {
      recommendations: value
    };
  }

  if (routeSkillId === ARTIFACT_REVIEW_SKILL_ID && isObject(value)) {
    return {
      recommendations: enforceGraphChangingRisk(
        Array.isArray(value.recommendations)
          ? (value.recommendations as QARecommendation[])
          : []
      ),
      templateRecommendations: Array.isArray(value.templateRecommendations)
        ? value.templateRecommendations
        : [],
      warnings: Array.isArray(value.warnings) ? value.warnings : []
    };
  }

  return value;
}

function createMockTemplateReviewResponse({
  skill,
  payload,
  dataUsageMode
}: {
  skill: AISkillDefinitionV2;
  payload: unknown;
  dataUsageMode: DataUsageMode;
}) {
  if (!isTemplateReviewPayload(payload)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Template review request must include selectedTemplate."
      },
      { status: 400 }
    );
  }

  const selectedTemplate =
    payload.selectedTemplate as AITemplateReviewRequest["templateProfiles"][number];
  const response = runMockTemplateReview({
    context: {
      scope: "template-review",
      executionMode: "mock",
      providerSettings: {
        providerMode: "no-ai",
        dataUsageMode: "local-only",
        defaultModelCapability: "basic",
        allowCloudAI: false,
        requireApprovalForAIOutput: true
      },
      templateProfiles: [selectedTemplate],
      requestId: `mock-ai-template-review-${Date.now()}`
    },
    templateProfiles: [selectedTemplate],
    outputType: payload.outputType,
    processType: payload.processType,
    businessDomain: payload.businessDomain
  });
  const validation = validateTemplateReviewOutput(
    {
      recommendations: response.recommendations,
      qualityScore: response.qualityScore,
      warnings: response.warnings,
      assumptions: response.assumptions
    },
    selectedTemplate
  );

  if (!validation.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Mock template review output failed schema validation.",
        validationErrors: validation.errors
      },
      { status: 422 }
    );
  }

  const audit = createSafeAuditMetadata({
    skill,
    routeSkillId: AI_TEMPLATE_REVIEW_SKILL_ID,
    providerId: "mock",
    dataUsageMode,
    mode: "mock",
    validationPassed: true,
    externalApiCalled: false
  });
  recordServerAudit(audit);

  return NextResponse.json({
    ok: true,
    mode: "mock",
    provider: "mock",
    model: getConfiguredAIModel("mock"),
    skillId: AI_TEMPLATE_REVIEW_SKILL_ID,
    result: {
      recommendations: validation.recommendations,
      qualityScore: validation.qualityScore,
      warnings: validation.warnings,
      assumptions: validation.assumptions
    },
    meta: {
      orchestrationVersion: ORCHESTRATION_VERSION,
      externalApiCalled: false,
      realAITemplateReviewEnabled: false,
      validationPassed: true,
      promptPackId: skill.promptPackId,
      dataUsageMode,
      audit
    }
  });
}

function createMockAIQAResponse({
  skill,
  payload,
  dataUsageMode
}: {
  skill: AISkillDefinitionV2;
  payload: unknown;
  dataUsageMode: DataUsageMode;
}) {
  if (!isAIQAPayload(payload)) {
    return NextResponse.json(
      {
        ok: false,
        error: "AI QA request must include processTasks and optional templateProfiles."
      },
      { status: 400 }
    );
  }

  const response = runMockAIQA({
    context: {
      scope: "qa",
      executionMode: "mock",
      providerSettings: {
        providerMode: "no-ai",
        dataUsageMode: "local-only",
        defaultModelCapability: "basic",
        allowCloudAI: false,
        requireApprovalForAIOutput: true
      },
      processTasks: payload.processTasks,
      templateProfiles: payload.templateProfiles,
      requestId: `mock-ai-process-qa-${Date.now()}`
    },
    processTasks: payload.processTasks,
    templateProfiles: payload.templateProfiles,
    qaIssues: payload.qaIssues,
    existingRecommendations: payload.existingRecommendations,
    targetStepIds: payload.targetStepIds,
    metadata: payload.metadata,
    issueCodes: payload.issueCodes
  });
  const validation = validateAIQARecommendations(
    response.recommendations,
    payload.processTasks.map((task) => task.stepId)
  );

  if (!validation.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Mock AI QA output failed schema validation.",
        validationErrors: validation.errors
      },
      { status: 422 }
    );
  }

  const audit = createSafeAuditMetadata({
    skill,
    routeSkillId: AI_PROCESS_QA_SKILL_ID,
    providerId: "mock",
    dataUsageMode,
    mode: "mock",
    validationPassed: true,
    externalApiCalled: false
  });
  recordServerAudit(audit);

  return NextResponse.json({
    ok: true,
    mode: "mock",
    provider: "mock",
    model: getConfiguredAIModel("mock"),
    skillId: AI_PROCESS_QA_SKILL_ID,
    result: {
      recommendations: validation.recommendations
    },
    meta: {
      orchestrationVersion: ORCHESTRATION_VERSION,
      externalApiCalled: false,
      realAIQAEnabled: false,
      validationPassed: true,
      promptPackId: skill.promptPackId,
      dataUsageMode,
      audit
    }
  });
}

function createMockArtifactReviewResponse({
  skill,
  payload,
  dataUsageMode
}: {
  skill: AISkillDefinitionV2;
  payload: unknown;
  dataUsageMode: DataUsageMode;
}) {
  if (!isArtifactReviewPayload(payload)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Artifact review request must include artifactType, artifactXml, processTasks, and selectedTemplate."
      },
      { status: 400 }
    );
  }

  const selectedTemplate =
    payload.selectedTemplate as AITemplateReviewRequest["templateProfiles"][number];
  const warnings = [
    payload.artifactType === "bpmn"
      ? "Mock artifact review checked generated BPMN as read-only output."
      : "Mock artifact review checked generated Service Blueprint draw.io XML as read-only output.",
    "AI artifact review does not modify generated XML directly; fixes must route back to PTR or template recommendations."
  ];
  const qaRecommendations: QARecommendation[] = [];
  const templateRecommendations: TemplateRecommendation[] = [];
  const validation = validateAISkillOutput(
    ARTIFACT_REVIEW_SKILL_ID,
    {
      recommendations: qaRecommendations,
      templateRecommendations,
      warnings
    },
    {
      validStepIds: payload.processTasks.map((task) => task.stepId),
      selectedTemplate
    }
  );

  if (!validation.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Mock artifact review output failed schema validation.",
        validationErrors: validation.errors
      },
      { status: 422 }
    );
  }

  const audit = createSafeAuditMetadata({
    skill,
    routeSkillId: ARTIFACT_REVIEW_SKILL_ID,
    providerId: "mock",
    dataUsageMode,
    mode: "mock",
    validationPassed: true,
    externalApiCalled: false
  });
  recordServerAudit(audit);

  return NextResponse.json({
    ok: true,
    mode: "mock",
    provider: "mock",
    model: getConfiguredAIModel("mock"),
    skillId: ARTIFACT_REVIEW_SKILL_ID,
    result: validation.value,
    meta: {
      orchestrationVersion: ORCHESTRATION_VERSION,
      externalApiCalled: false,
      validationPassed: true,
      promptPackId: skill.promptPackId,
      dataUsageMode,
      artifactType: payload.artifactType,
      artifactXmlLength: payload.artifactXml.length,
      audit
    }
  });
}

type PtrAIAssistantAction =
  | "normalize-selected-rows"
  | "infer-missing-actor-system-lane"
  | "improve-task-wording"
  | "suggest-split-complex-task"
  | "generate-missing-input-output"
  | "suggest-interaction-channel";

const ptrAIAssistantActionLabels: Record<PtrAIAssistantAction, string> = {
  "normalize-selected-rows": "Normalize selected rows",
  "infer-missing-actor-system-lane": "Infer missing actor/system/lane",
  "improve-task-wording": "Improve task wording",
  "suggest-split-complex-task": "Suggest split complex task",
  "generate-missing-input-output": "Generate missing input/output",
  "suggest-interaction-channel": "Suggest customer interaction/channel"
};

function isPtrAIAssistantAction(value: unknown): value is PtrAIAssistantAction {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(ptrAIAssistantActionLabels, value)
  );
}

function normalizeWords(value: string) {
  return value
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .join(" ");
}

function titleCaseTaskName(value: string) {
  const normalized = normalizeWords(value);

  if (!normalized) {
    return "";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function inferMockActor(task: ProcessTask) {
  if (task.actor?.trim()) {
    return "";
  }

  if (task.customerInteractionType === "Customer Action") {
    return "Customer";
  }

  if (task.bpmnType === "serviceTask" || task.taskNature === "automatic") {
    return "System";
  }

  if (/approve|approval|phe duyet/i.test(task.taskName)) {
    return "Approver";
  }

  return "Process Owner";
}

function inferMockSystem(task: ProcessTask) {
  if (task.system?.trim()) {
    return "";
  }

  if (task.bpmnType === "serviceTask" || task.taskNature === "automatic") {
    return "Core workflow system";
  }

  if (/document|ho so|file/i.test(`${task.taskName} ${task.input} ${task.output}`)) {
    return "Document management system";
  }

  return "";
}

function inferMockInteractionType(task: ProcessTask) {
  if (task.customerInteractionType && task.customerInteractionType !== "None") {
    return "";
  }

  if (/customer|khach hang/i.test(`${task.actor} ${task.taskName}`)) {
    return "Customer Action" as const;
  }

  if (task.bpmnType === "serviceTask" || task.taskNature === "automatic") {
    return "Back-stage System" as const;
  }

  if (task.system?.trim()) {
    return "Front-stage System" as const;
  }

  return "Back-stage People" as const;
}

function inferMockChannel(task: ProcessTask) {
  if (task.channel && task.channel !== "Other") {
    return "";
  }

  const text = `${task.taskName} ${task.system} ${task.input} ${task.output}`;

  if (/email/i.test(text)) {
    return "Email";
  }

  if (/sms|otp/i.test(text)) {
    return "SMS";
  }

  if (/mobile|app/i.test(text)) {
    return "Mobile App";
  }

  if (/portal|web/i.test(text)) {
    return "Portal";
  }

  return task.system?.trim() ? "Internal System" : "Other";
}

function createSplitTasks(task: ProcessTask, usedStepIds: Set<string>) {
  const baseStepId = task.stepId || `AI${Date.now()}`;
  const taskName = task.taskName || "Review and complete task";
  const parts = taskName
    .split(/\s+(?:and|then|va|sau do)\s+/i)
    .map(titleCaseTaskName)
    .filter(Boolean)
    .slice(0, 2);
  const names = parts.length >= 2 ? parts : [`Prepare ${taskName}`, `Complete ${taskName}`];

  return names.map((name, index) => {
    let suffixIndex = index + 1;
    let nextStepId = `${baseStepId}-${suffixIndex}`;

    while (usedStepIds.has(nextStepId)) {
      suffixIndex += 1;
      nextStepId = `${baseStepId}-${suffixIndex}`;
    }

    usedStepIds.add(nextStepId);

    return {
      ...task,
      id: `${task.id}-ai-split-${suffixIndex}`,
      stepId: nextStepId,
      taskName: name,
      reviewStatus: "needsReview" as const,
      comment: normalizeWords(
        `${task.comment ?? ""} AI Assistant split preview from ${task.stepId}.`
      )
    };
  });
}

function createPtrAIAssistantRecommendation({
  action,
  task,
  usedStepIds
}: {
  action: PtrAIAssistantAction;
  task: ProcessTask;
  usedStepIds: Set<string>;
}): QARecommendation | null {
  const base = {
    id: `ptr-ai-${action}-${task.stepId}-${Date.now()}`,
    source: "ai" as const,
    issueId: `ptr-ai-${action}-${task.stepId}`,
    issueCode: `PTR_AI_${action.replaceAll("-", "_").toUpperCase()}`,
    targetStepIds: [task.stepId],
    requiresConfirmation: true,
    complianceTags: ["ptr-ai-assistant", "human-review", "mock-safe"]
  };

  if (action === "normalize-selected-rows") {
    const operations: QARecommendation["operations"] = [];
    const normalizedTaskName = titleCaseTaskName(task.taskName);
    const normalizedPhase = titleCaseTaskName(task.phase);

    if (normalizedTaskName && normalizedTaskName !== task.taskName) {
      operations.push({
        kind: "UpdateTaskField",
        stepId: task.stepId,
        field: "taskName",
        value: normalizedTaskName
      });
    }

    if (normalizedPhase && normalizedPhase !== task.phase) {
      operations.push({
        kind: "UpdateTaskField",
        stepId: task.stepId,
        field: "phase",
        value: normalizedPhase
      });
    }

    if (!operations.length) {
      return null;
    }

    return {
      ...base,
      recommendationType: "UpdateField",
      type: "UpdateField",
      title: `Normalize ${task.stepId}`,
      description: "Normalize spacing/capitalization for the selected PTR row.",
      rationale: "The mock assistant only proposes field patches and does not apply them.",
      confidence: "high",
      impact: "low",
      riskLevel: "low",
      operations,
      previewText: `${task.stepId}: normalize task wording/phase formatting.`,
      warnings: ["Mock AI Assistant recommendation. Review before applying."]
    };
  }

  if (action === "infer-missing-actor-system-lane") {
    const operations: QARecommendation["operations"] = [];
    const actor = inferMockActor(task);
    const system = inferMockSystem(task);

    if (actor) {
      operations.push({
        kind: "AssignActor",
        stepId: task.stepId,
        actor,
        actorLane: actor
      });
    } else if (task.actor && !task.actorLane) {
      operations.push({
        kind: "UpdateTaskField",
        stepId: task.stepId,
        field: "actorLane",
        value: task.actor
      });
    }

    if (system) {
      operations.push({
        kind: "AssignSystem",
        stepId: task.stepId,
        system,
        systemLane: system
      });
    } else if (task.system && !task.systemLane) {
      operations.push({
        kind: "UpdateTaskField",
        stepId: task.stepId,
        field: "systemLane",
        value: task.system
      });
    }

    if (!operations.length) {
      return null;
    }

    return {
      ...base,
      recommendationType: actor ? "AssignActor" : "AssignSystem",
      type: actor ? "AssignActor" : "AssignSystem",
      title: `Infer ownership for ${task.stepId}`,
      description: "Infer missing actor, system, or lane values from the selected row context.",
      rationale: "Missing ownership fields reduce BPMN lane and Service Blueprint readiness.",
      confidence: "medium",
      impact: "medium",
      riskLevel: "low",
      operations,
      previewText: `${task.stepId}: fill missing actor/system/lane fields.`,
      warnings: ["Inference is mock/local and should be reviewed by the user."]
    };
  }

  if (action === "improve-task-wording") {
    const nextTaskName = titleCaseTaskName(task.taskName.replace(/^do\s+/i, ""));

    if (!nextTaskName || nextTaskName === task.taskName) {
      return null;
    }

    return {
      ...base,
      recommendationType: "UpdateField",
      type: "UpdateField",
      title: `Improve wording for ${task.stepId}`,
      description: "Make the task name more concise while preserving the current business meaning.",
      rationale: "Clear task wording improves PTR readability and downstream artifact quality.",
      confidence: "medium",
      impact: "low",
      riskLevel: "low",
      patch: {
        taskName: nextTaskName
      },
      operations: [
        {
          kind: "UpdateTaskField",
          stepId: task.stepId,
          field: "taskName",
          value: nextTaskName
        }
      ],
      previewText: `${task.stepId}: taskName -> ${nextTaskName}`,
      warnings: ["Review wording to ensure domain meaning is preserved."]
    };
  }

  if (action === "suggest-split-complex-task") {
    const newTasks = createSplitTasks(task, usedStepIds);

    return {
      ...base,
      recommendationType: "SplitTask",
      type: "SplitTask",
      title: `Split complex task ${task.stepId}`,
      description: "Suggest splitting this selected row into smaller reviewable tasks.",
      rationale:
        "The selected task may contain multiple actions. Splitting changes the process graph and must be reviewed carefully.",
      confidence: "medium",
      impact: "high",
      riskLevel: "high",
      operations: [
        {
          kind: "SplitTask",
          targetStepId: task.stepId,
          newTasks
        }
      ],
      newTasks,
      previewText: `${task.stepId}: split into ${newTasks.map((item) => item.stepId).join(", ")}.`,
      warnings: [
        "High risk graph-changing recommendation.",
        "Not selected by Select safe recommendations."
      ]
    };
  }

  if (action === "generate-missing-input-output") {
    const operations: QARecommendation["operations"] = [];

    if (!task.input?.trim()) {
      operations.push({
        kind: "UpdateTaskField",
        stepId: task.stepId,
        field: "input",
        value: `Inputs required to ${task.taskName || "complete this step"}`
      });
    }

    if (!task.output?.trim()) {
      operations.push({
        kind: "UpdateTaskField",
        stepId: task.stepId,
        field: "output",
        value: `Output of ${task.taskName || "this step"}`
      });
    }

    if (!operations.length) {
      return null;
    }

    return {
      ...base,
      recommendationType: "UpdateField",
      type: "UpdateField",
      title: `Generate input/output for ${task.stepId}`,
      description: "Draft missing input/output fields for the selected PTR row.",
      rationale: "Input/output fields improve traceability for process and product delivery artifacts.",
      confidence: "medium",
      impact: "medium",
      riskLevel: "low",
      operations,
      previewText: `${task.stepId}: draft missing input/output values.`,
      warnings: ["Generated text is a draft and should be adjusted to the real process."]
    };
  }

  const interactionType = inferMockInteractionType(task);
  const channel = inferMockChannel(task);
  const operations: QARecommendation["operations"] = [];

  if (interactionType) {
    operations.push({
      kind: "SetInteractionType",
      stepId: task.stepId,
      customerInteractionType: interactionType
    });
  }

  if (channel) {
    operations.push({
      kind: "UpdateTaskField",
      stepId: task.stepId,
      field: "channel",
      value: channel
    });
  }

  if (!operations.length) {
    return null;
  }

  return {
    ...base,
    recommendationType: "SetInteractionType",
    type: "SetInteractionType",
    title: `Suggest interaction/channel for ${task.stepId}`,
    description: "Suggest customer interaction type and channel for Service Blueprint readiness.",
    rationale: "D02 Service Blueprint requires customer interaction and channel context.",
    confidence: "medium",
    impact: "medium",
    riskLevel: "low",
    operations,
    previewText: `${task.stepId}: suggest customerInteractionType/channel.`,
    warnings: ["Review D02 layer fit before applying."]
  };
}

function createMockProcessImprovementResponse({
  skill,
  payload,
  dataUsageMode
}: {
  skill: AISkillDefinitionV2;
  payload: unknown;
  dataUsageMode: DataUsageMode;
}) {
  if (!isAIQAPayload(payload)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Process improvement request must include processTasks."
      },
      { status: 400 }
    );
  }

  const payloadRecord = payload as Omit<AIQARequest, "context"> & {
    metadata?: unknown;
    targetStepIds?: unknown;
  };
  const metadata = isObject(payloadRecord.metadata) ? payloadRecord.metadata : {};
  const action = isPtrAIAssistantAction(metadata.ptrAiAction)
    ? metadata.ptrAiAction
    : "normalize-selected-rows";
  const targetStepIds = Array.isArray(payloadRecord.targetStepIds)
    ? payloadRecord.targetStepIds.filter((stepId): stepId is string => typeof stepId === "string")
    : [];
  const selectedTasks =
    targetStepIds.length > 0
      ? payload.processTasks.filter((task) => targetStepIds.includes(task.stepId))
      : payload.processTasks.slice(0, 3);
  const usedStepIds = new Set(payload.processTasks.map((task) => task.stepId));
  const recommendations = selectedTasks
    .map((task) =>
      createPtrAIAssistantRecommendation({
        action,
        task,
        usedStepIds
      })
    )
    .filter((recommendation): recommendation is QARecommendation => recommendation !== null);
  const validation = validateAIQARecommendations(
    recommendations,
    payload.processTasks.map((task) => task.stepId)
  );

  if (!validation.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Mock process improvement output failed schema validation.",
        validationErrors: validation.errors
      },
      { status: 422 }
    );
  }

  const audit = createSafeAuditMetadata({
    skill,
    routeSkillId: PROCESS_IMPROVEMENT_RECOMMENDATION_SKILL_ID,
    providerId: "mock",
    dataUsageMode,
    mode: "mock",
    validationPassed: true,
    externalApiCalled: false
  });
  recordServerAudit(audit);

  return NextResponse.json({
    ok: true,
    mode: "mock",
    provider: "mock",
    model: getConfiguredAIModel("mock"),
    skillId: PROCESS_IMPROVEMENT_RECOMMENDATION_SKILL_ID,
    result: {
      recommendations: validation.recommendations
    },
    meta: {
      orchestrationVersion: ORCHESTRATION_VERSION,
      externalApiCalled: false,
      validationPassed: true,
      promptPackId: skill.promptPackId,
      dataUsageMode,
      ptrAiAction: action,
      ptrAiActionLabel: ptrAIAssistantActionLabels[action],
      audit
    }
  });
}

function createMockInputBriefResponse({
  skill,
  payload,
  dataUsageMode
}: {
  skill: AISkillDefinitionV2;
  payload: unknown;
  dataUsageMode: DataUsageMode;
}) {
  const briefValidation = validateStructuredProcessBrief(payload);

  if (!briefValidation.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid StructuredProcessBrief.",
        validationErrors: briefValidation.errors
      },
      { status: 400 }
    );
  }

  const briefQualityGate = runBriefQualityGate(briefValidation.value);

  if (!briefQualityGate.canPreview) {
    return NextResponse.json(
      {
        ok: false,
        error: "Brief chua du thong tin de tao Draft PTR.",
        validationErrors: formatQualityGateErrorsVi(briefQualityGate),
        qualityGate: briefQualityGate
      },
      { status: 400 }
    );
  }

  const draft = generateDraftProcessTaskRegister({
    brief: briefValidation.value,
    currentLocale: briefValidation.value.inputLanguage
  });
  const draftValidation = validateDraftProcessTaskRegister(draft);

  if (!draftValidation.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Mock draft failed schema validation.",
        validationErrors: draftValidation.errors
      },
      { status: 422 }
    );
  }

  const draftQualityGate = runDraftProcessTaskRegisterQualityGate(
    draftValidation.value
  );

  if (!draftQualityGate.canPreview) {
    return NextResponse.json(
      {
        ok: false,
        error: "Draft PTR khong dat Quality Gate.",
        validationErrors: formatQualityGateErrorsVi(draftQualityGate),
        qualityGate: draftQualityGate
      },
      { status: 422 }
    );
  }

  const qualityGateWarnings = [
    ...formatQualityGateWarningsVi(briefQualityGate),
    ...formatQualityGateWarningsVi(draftQualityGate)
  ];
  const qualityIssues = qualityGateWarnings;
  const audit = createSafeAuditMetadata({
    skill,
    routeSkillId: INPUT_BRIEF_TO_PTR_SKILL_ID,
    providerId: "mock",
    dataUsageMode,
    mode: "mock",
    validationPassed: true,
    externalApiCalled: false
  });
  recordServerAudit(audit);

  return NextResponse.json({
    ok: true,
    mode: "mock",
    provider: "mock",
    model: getConfiguredAIModel("mock"),
    skillId: INPUT_BRIEF_TO_PTR_SKILL_ID,
    result: {
      ...draftValidation.value,
      qualityIssues,
      qualityGateWarnings
    },
    meta: {
      orchestrationVersion: ORCHESTRATION_VERSION,
      externalApiCalled: false,
      realAIEnabled: false,
      validationPassed: true,
      promptPackId: skill.promptPackId,
      dataUsageMode,
      qualityGate: draftQualityGate,
      audit
    }
  });
}

function createMockFileToPtrDraftResponse({
  routeSkillId,
  skill,
  payload,
  dataUsageMode
}: {
  routeSkillId: string;
  skill: AISkillDefinitionV2;
  payload: unknown;
  dataUsageMode: DataUsageMode;
}) {
  if (!isFileToPtrDraftPayload(payload)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "File-to-PTR request must include fileName, fileType, and extractedText."
      },
      { status: 400 }
    );
  }

  const brief = createBriefFromFilePayload(payload);
  const draft = generateDraftProcessTaskRegister({
    brief,
    currentLocale: brief.inputLanguage
  });
  const draftValidation = validateDraftProcessTaskRegister(draft);

  if (!draftValidation.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Mock file draft failed schema validation.",
        validationErrors: draftValidation.errors
      },
      { status: 422 }
    );
  }

  const draftQualityGate = runDraftProcessTaskRegisterQualityGate(
    draftValidation.value
  );

  if (!draftQualityGate.canPreview) {
    return NextResponse.json(
      {
        ok: false,
        error: "Draft PTR khong dat Quality Gate.",
        validationErrors: formatQualityGateErrorsVi(draftQualityGate),
        qualityGate: draftQualityGate
      },
      { status: 422 }
    );
  }

  const qualityIssues = [
    ...normalizeStringArray(payload.extractionWarnings),
    ...formatQualityGateWarningsVi(draftQualityGate)
  ];
  const audit = createSafeAuditMetadata({
    skill,
    routeSkillId,
    providerId: "mock",
    dataUsageMode,
    mode: "mock",
    validationPassed: true,
    externalApiCalled: false
  });
  recordServerAudit(audit);

  return NextResponse.json({
    ok: true,
    mode: "mock",
    provider: "mock",
    model: getConfiguredAIModel("mock"),
    skillId: routeSkillId,
    registrySkillId: FILE_TO_PTR_DRAFT_SKILL_ID,
    result: {
      ...draftValidation.value,
      assumptions: [
        ...draftValidation.value.assumptions,
        "Draft was generated from locally extracted file text.",
        "Image/OCR extraction is not implemented for MVP1."
      ],
      openQuestions:
        qualityIssues.length > 0
          ? qualityIssues
          : draftValidation.value.openQuestions,
      qualityIssues,
      qualityGateWarnings: formatQualityGateWarningsVi(draftQualityGate),
      sourceSummary: `Draft generated from extracted text in ${payload.fileName}.`
    },
    meta: {
      orchestrationVersion: ORCHESTRATION_VERSION,
      externalApiCalled: false,
      realAIEnabled: false,
      validationPassed: true,
      promptPackId: skill.promptPackId,
      dataUsageMode,
      qualityGate: draftQualityGate,
      audit
    }
  });
}

function createMockChatToPtrDraftResponse({
  routeSkillId,
  skill,
  payload,
  dataUsageMode
}: {
  routeSkillId: string;
  skill: AISkillDefinitionV2;
  payload: unknown;
  dataUsageMode: DataUsageMode;
}) {
  if (!isChatToPtrDraftPayload(payload)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Chat-to-PTR request must include notes."
      },
      { status: 400 }
    );
  }

  const brief = createBriefFromChatPayload(payload);
  const draft = generateDraftProcessTaskRegister({
    brief,
    currentLocale: brief.inputLanguage
  });
  const draftValidation = validateDraftProcessTaskRegister(draft);

  if (!draftValidation.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Mock chat/notes draft failed schema validation.",
        validationErrors: draftValidation.errors
      },
      { status: 422 }
    );
  }

  const draftQualityGate = runDraftProcessTaskRegisterQualityGate(
    draftValidation.value
  );

  if (!draftQualityGate.canPreview) {
    return NextResponse.json(
      {
        ok: false,
        error: "Draft PTR khong dat Quality Gate.",
        validationErrors: formatQualityGateErrorsVi(draftQualityGate),
        qualityGate: draftQualityGate
      },
      { status: 422 }
    );
  }

  const qualityIssues = formatQualityGateWarningsVi(draftQualityGate);
  const audit = createSafeAuditMetadata({
    skill,
    routeSkillId,
    providerId: "mock",
    dataUsageMode,
    mode: "mock",
    validationPassed: true,
    externalApiCalled: false
  });
  recordServerAudit(audit);

  return NextResponse.json({
    ok: true,
    mode: "mock",
    provider: "mock",
    model: getConfiguredAIModel("mock"),
    skillId: routeSkillId,
    registrySkillId: CHAT_TO_PTR_DRAFT_SKILL_ID,
    result: {
      ...draftValidation.value,
      assumptions: [
        ...draftValidation.value.assumptions,
        "Draft was generated from pasted chat/notes text.",
        "Unclear statements are kept as review questions before Apply."
      ],
      qualityIssues,
      qualityGateWarnings: qualityIssues,
      sourceSummary: "Draft generated from pasted chat/notes text."
    },
    meta: {
      orchestrationVersion: ORCHESTRATION_VERSION,
      externalApiCalled: false,
      realAIEnabled: false,
      validationPassed: true,
      promptPackId: skill.promptPackId,
      dataUsageMode,
      qualityGate: draftQualityGate,
      audit
    }
  });
}

function createMockBRDResponse({
  routeSkillId,
  skill,
  payload,
  dataUsageMode
}: {
  routeSkillId: string;
  skill: AISkillDefinitionV2;
  payload: unknown;
  dataUsageMode: DataUsageMode;
}) {
  if (!isBRDGenerationPayload(payload)) {
    return NextResponse.json(
      {
        ok: false,
        error: "BRD request must include ProductDeliveryContext."
      },
      { status: 400 }
    );
  }

  const source =
    routeSkillId === NOTES_TO_BRD_SKILL_ID ? "notes-chat" : "process-task-register";
  const brd = generateBRD({
    processTasks: Array.isArray(payload.processTasks) ? payload.processTasks : [],
    projectContext: payload.projectContext,
    notes: payload.notes,
    sourceSummary: payload.sourceSummary,
    uploadedFileText: payload.uploadedFileText,
    generatedAt: payload.generatedAt ?? new Date().toISOString(),
    source
  });
  const qualityGate = runBRDQualityGate(brd);

  if (!qualityGate.canPreview) {
    return NextResponse.json(
      {
        ok: false,
        error: "BRD draft failed quality gate.",
        validationErrors: qualityGate.issues
          .filter((issue) => issue.severity === "error")
          .map((issue) => issue.message),
        qualityGate
      },
      { status: 422 }
    );
  }

  const audit = createSafeAuditMetadata({
    skill,
    routeSkillId,
    providerId: "mock",
    dataUsageMode,
    mode: "mock",
    validationPassed: true,
    externalApiCalled: false
  });
  recordServerAudit(audit);

  return NextResponse.json({
    ok: true,
    mode: "mock",
    provider: "mock",
    model: getConfiguredAIModel("mock"),
    skillId: routeSkillId,
    registrySkillId: getRegistrySkillId(routeSkillId),
    result: {
      ...brd,
      qualityIssues: qualityGate.issues
    },
    meta: {
      orchestrationVersion: ORCHESTRATION_VERSION,
      externalApiCalled: false,
      realAIEnabled: false,
      validationPassed: true,
      promptPackId: skill.promptPackId,
      dataUsageMode,
      qualityGate,
      audit
    }
  });
}

function createMockSRSResponse({
  routeSkillId,
  skill,
  payload,
  dataUsageMode
}: {
  routeSkillId: string;
  skill: AISkillDefinitionV2;
  payload: unknown;
  dataUsageMode: DataUsageMode;
}) {
  if (!isSRSGenerationPayload(payload)) {
    return NextResponse.json(
      {
        ok: false,
        error: "SRS request must include ProductDeliveryContext."
      },
      { status: 400 }
    );
  }

  const source =
    routeSkillId === NOTES_TO_SRS_SKILL_ID ? "notes-chat" : "brd-draft";
  const srs = generateSRS({
    brd: payload.brd,
    processTasks: Array.isArray(payload.processTasks) ? payload.processTasks : [],
    projectContext: payload.projectContext,
    notes: payload.notes,
    sourceSummary: payload.sourceSummary,
    uploadedFileText: payload.uploadedFileText,
    generatedAt: payload.generatedAt ?? new Date().toISOString(),
    source
  });
  const qualityGate = runSRSQualityGate(srs);

  if (!qualityGate.canPreview) {
    return NextResponse.json(
      {
        ok: false,
        error: "SRS draft failed quality gate.",
        validationErrors: qualityGate.issues
          .filter((issue) => issue.severity === "error")
          .map((issue) => issue.message),
        qualityGate
      },
      { status: 422 }
    );
  }

  const audit = createSafeAuditMetadata({
    skill,
    routeSkillId,
    providerId: "mock",
    dataUsageMode,
    mode: "mock",
    validationPassed: true,
    externalApiCalled: false
  });
  recordServerAudit(audit);

  return NextResponse.json({
    ok: true,
    mode: "mock",
    provider: "mock",
    model: getConfiguredAIModel("mock"),
    skillId: routeSkillId,
    registrySkillId: getRegistrySkillId(routeSkillId),
    result: {
      ...srs,
      qualityIssues: qualityGate.issues
    },
    meta: {
      orchestrationVersion: ORCHESTRATION_VERSION,
      externalApiCalled: false,
      realAIEnabled: false,
      validationPassed: true,
      promptPackId: skill.promptPackId,
      dataUsageMode,
      qualityGate,
      audit
    }
  });
}

function createMockUserStoryResponse({
  routeSkillId,
  skill,
  payload,
  dataUsageMode
}: {
  routeSkillId: string;
  skill: AISkillDefinitionV2;
  payload: unknown;
  dataUsageMode: DataUsageMode;
}) {
  if (!isUserStoryGenerationPayload(payload)) {
    return NextResponse.json(
      {
        ok: false,
        error: "User story request must include ProductDeliveryContext."
      },
      { status: 400 }
    );
  }

  const source =
    routeSkillId === SRS_TO_USER_STORIES_SKILL_ID
      ? "srs-draft"
      : routeSkillId === BRD_TO_USER_STORIES_SKILL_ID
        ? "brd-draft"
        : "notes-chat";
  const userStorySet = generateUserStorySet({
    srs: payload.srs,
    brd: payload.brd,
    processTasks: Array.isArray(payload.processTasks) ? payload.processTasks : [],
    projectContext: payload.projectContext,
    notes: payload.notes,
    sourceSummary: payload.sourceSummary,
    uploadedFileText: payload.uploadedFileText,
    generatedAt: payload.generatedAt ?? new Date().toISOString(),
    source
  });
  const qualityGate = runUserStoryQualityGate(userStorySet);

  if (!qualityGate.canPreview) {
    return NextResponse.json(
      {
        ok: false,
        error: "User Story draft failed quality gate.",
        validationErrors: qualityGate.issues
          .filter((issue) => issue.severity === "error")
          .map((issue) => issue.message),
        qualityGate
      },
      { status: 422 }
    );
  }

  const audit = createSafeAuditMetadata({
    skill,
    routeSkillId,
    providerId: "mock",
    dataUsageMode,
    mode: "mock",
    validationPassed: true,
    externalApiCalled: false
  });
  recordServerAudit(audit);

  return NextResponse.json({
    ok: true,
    mode: "mock",
    provider: "mock",
    model: getConfiguredAIModel("mock"),
    skillId: routeSkillId,
    registrySkillId: getRegistrySkillId(routeSkillId),
    result: {
      ...userStorySet,
      qualityIssues: qualityGate.issues
    },
    meta: {
      orchestrationVersion: ORCHESTRATION_VERSION,
      externalApiCalled: false,
      realAIEnabled: false,
      validationPassed: true,
      promptPackId: skill.promptPackId,
      dataUsageMode,
      qualityGate,
      audit
    }
  });
}

function createMockAcceptanceCriteriaResponse({
  routeSkillId,
  skill,
  payload,
  dataUsageMode
}: {
  routeSkillId: string;
  skill: AISkillDefinitionV2;
  payload: unknown;
  dataUsageMode: DataUsageMode;
}) {
  if (!isAcceptanceCriteriaGenerationPayload(payload)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Acceptance criteria request must include ProductDeliveryContext."
      },
      { status: 400 }
    );
  }

  const criteriaSet = generateAcceptanceCriteriaSet({
    userStorySet: payload.userStorySet,
    processTasks: Array.isArray(payload.processTasks) ? payload.processTasks : [],
    projectContext: payload.projectContext,
    notes: payload.notes,
    sourceSummary: payload.sourceSummary,
    uploadedFileText: payload.uploadedFileText,
    generatedAt: payload.generatedAt ?? new Date().toISOString()
  });
  const qualityGate = runAcceptanceCriteriaQualityGate(criteriaSet);

  if (!qualityGate.canPreview) {
    return NextResponse.json(
      {
        ok: false,
        error: "Acceptance Criteria draft failed quality gate.",
        validationErrors: qualityGate.issues
          .filter((issue) => issue.severity === "error")
          .map((issue) => issue.message),
        qualityGate
      },
      { status: 422 }
    );
  }

  const audit = createSafeAuditMetadata({
    skill,
    routeSkillId,
    providerId: "mock",
    dataUsageMode,
    mode: "mock",
    validationPassed: true,
    externalApiCalled: false
  });
  recordServerAudit(audit);

  return NextResponse.json({
    ok: true,
    mode: "mock",
    provider: "mock",
    model: getConfiguredAIModel("mock"),
    skillId: routeSkillId,
    registrySkillId: getRegistrySkillId(routeSkillId),
    result: {
      ...criteriaSet,
      qualityIssues: qualityGate.issues
    },
    meta: {
      orchestrationVersion: ORCHESTRATION_VERSION,
      externalApiCalled: false,
      realAIEnabled: false,
      validationPassed: true,
      promptPackId: skill.promptPackId,
      dataUsageMode,
      qualityGate,
      audit
    }
  });
}

function createMockProductScopeReviewResponse({
  routeSkillId,
  skill,
  payload,
  dataUsageMode
}: {
  routeSkillId: string;
  skill: AISkillDefinitionV2;
  payload: unknown;
  dataUsageMode: DataUsageMode;
}) {
  if (!isProductScopeReviewPayload(payload)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Product scope review request must include ProductDeliveryContext."
      },
      { status: 400 }
    );
  }

  const scopeReview = generateProductScopeReview({
    brd: payload.brd,
    srs: payload.srs,
    userStorySet: payload.userStorySet,
    processTasks: Array.isArray(payload.processTasks) ? payload.processTasks : [],
    projectContext: payload.projectContext,
    notes: payload.notes,
    sourceSummary: payload.sourceSummary,
    uploadedFileText: payload.uploadedFileText,
    businessObjective: payload.businessObjective,
    generatedAt: payload.generatedAt ?? new Date().toISOString()
  });
  const qualityGate = runProductScopeReviewQualityGate(scopeReview);

  if (!qualityGate.canPreview) {
    return NextResponse.json(
      {
        ok: false,
        error: "Product Scope Review failed quality gate.",
        validationErrors: qualityGate.issues
          .filter((issue) => issue.severity === "error")
          .map((issue) => issue.message),
        qualityGate
      },
      { status: 422 }
    );
  }

  const audit = createSafeAuditMetadata({
    skill,
    routeSkillId,
    providerId: "mock",
    dataUsageMode,
    mode: "mock",
    validationPassed: true,
    externalApiCalled: false
  });
  recordServerAudit(audit);

  return NextResponse.json({
    ok: true,
    mode: "mock",
    provider: "mock",
    model: getConfiguredAIModel("mock"),
    skillId: routeSkillId,
    registrySkillId: getRegistrySkillId(routeSkillId),
    result: {
      ...scopeReview,
      qualityIssues: qualityGate.issues
    },
    meta: {
      orchestrationVersion: ORCHESTRATION_VERSION,
      externalApiCalled: false,
      realAIEnabled: false,
      validationPassed: true,
      promptPackId: skill.promptPackId,
      dataUsageMode,
      qualityGate,
      audit
    }
  });
}

function createMockAICodingPackResponse({
  routeSkillId,
  skill,
  payload,
  dataUsageMode
}: {
  routeSkillId: string;
  skill: AISkillDefinitionV2;
  payload: unknown;
  dataUsageMode: DataUsageMode;
}) {
  if (!isAICodingPackGenerationPayload(payload)) {
    return NextResponse.json(
      {
        ok: false,
        error: "AI Coding Pack request must include ProductDeliveryContext."
      },
      { status: 400 }
    );
  }

  const assumptions =
    Array.isArray(payload.assumptions) &&
    payload.assumptions.every((item) => typeof item === "string")
      ? payload.assumptions
      : [
          "AI Coding Pack is generated from reviewed Product Delivery artifacts."
        ];
  const openQuestions =
    Array.isArray(payload.openQuestions) &&
    payload.openQuestions.every((item) => typeof item === "string")
      ? payload.openQuestions
      : [
          "Confirm target repository architecture and implementation constraints before coding."
        ];
  const files: AICodingPackFiles = generateAICodingPack({
    brd: payload.brd,
    srs: payload.srs,
    userStorySet: payload.userStorySet,
    acceptanceCriteria: payload.acceptanceCriteria,
    processTasks: Array.isArray(payload.processTasks) ? payload.processTasks : [],
    projectContext: payload.projectContext,
    assumptions,
    openQuestions,
    generatedAt: payload.generatedAt ?? new Date().toISOString()
  });
  const qualityGate = runAICodingPackQualityGate({
    files,
    assumptions,
    openQuestions
  });

  if (!qualityGate.canPreview) {
    return NextResponse.json(
      {
        ok: false,
        error: "AI Coding Pack failed quality gate.",
        validationErrors: qualityGate.issues,
        qualityGate
      },
      { status: 422 }
    );
  }

  const result = normalizeDeterministicCodingPack(
    files,
    assumptions,
    openQuestions
  );
  const audit = createSafeAuditMetadata({
    skill,
    routeSkillId,
    providerId: "mock",
    dataUsageMode,
    mode: "mock",
    validationPassed: true,
    externalApiCalled: false
  });
  recordServerAudit(audit);

  return NextResponse.json({
    ok: true,
    mode: "mock",
    provider: "mock",
    model: getConfiguredAIModel("mock"),
    skillId: routeSkillId,
    registrySkillId: getRegistrySkillId(routeSkillId),
    result: {
      ...result,
      qualityIssues: qualityGate.issues
    },
    meta: {
      orchestrationVersion: ORCHESTRATION_VERSION,
      externalApiCalled: false,
      realAIEnabled: false,
      validationPassed: true,
      promptPackId: skill.promptPackId,
      dataUsageMode,
      qualityGate,
      audit
    }
  });
}

function createMockRequirementQAResponse({
  routeSkillId,
  skill,
  payload,
  dataUsageMode
}: {
  routeSkillId: string;
  skill: AISkillDefinitionV2;
  payload: unknown;
  dataUsageMode: DataUsageMode;
}) {
  if (!isRequirementQualityCheckPayload(payload)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Requirement QA request must include ProductDeliveryContext."
      },
      { status: 400 }
    );
  }

  const result = runRequirementQualityCheck({
    brd: payload.brd,
    srs: payload.srs,
    userStorySet: payload.userStorySet,
    acceptanceCriteria: payload.acceptanceCriteria,
    aiCodingPack: payload.aiCodingPack,
    generatedAt: payload.generatedAt ?? new Date().toISOString()
  });
  const audit = createSafeAuditMetadata({
    skill,
    routeSkillId,
    providerId: "mock",
    dataUsageMode,
    mode: "mock",
    validationPassed: true,
    externalApiCalled: false
  });
  recordServerAudit(audit);

  return NextResponse.json({
    ok: true,
    mode: "mock",
    provider: "mock",
    model: getConfiguredAIModel("mock"),
    skillId: routeSkillId,
    registrySkillId: getRegistrySkillId(routeSkillId),
    result,
    meta: {
      orchestrationVersion: ORCHESTRATION_VERSION,
      externalApiCalled: false,
      realAIEnabled: false,
      validationPassed: true,
      promptPackId: skill.promptPackId,
      dataUsageMode,
      audit
    }
  });
}

function createMockResponse({
  routeSkillId,
  skill,
  payload,
  dataUsageMode
}: {
  routeSkillId: string;
  skill: AISkillDefinitionV2;
  payload: unknown;
  dataUsageMode: DataUsageMode;
}) {
  if (routeSkillId === INPUT_BRIEF_TO_PTR_SKILL_ID) {
    return createMockInputBriefResponse({ skill, payload, dataUsageMode });
  }

  if (
    routeSkillId === FILE_TO_PTR_DRAFT_SKILL_ID ||
    routeSkillId === LEGACY_FILE_TO_DRAFT_PTR_SKILL_ID
  ) {
    return createMockFileToPtrDraftResponse({
      routeSkillId,
      skill,
      payload,
      dataUsageMode
    });
  }

  if (
    routeSkillId === CHAT_TO_PTR_DRAFT_SKILL_ID ||
    routeSkillId === LEGACY_CHAT_TO_DRAFT_PTR_SKILL_ID
  ) {
    return createMockChatToPtrDraftResponse({
      routeSkillId,
      skill,
      payload,
      dataUsageMode
    });
  }

  if (routeSkillId === AI_PROCESS_QA_SKILL_ID) {
    return createMockAIQAResponse({ skill, payload, dataUsageMode });
  }

  if (routeSkillId === PROCESS_IMPROVEMENT_RECOMMENDATION_SKILL_ID) {
    return createMockProcessImprovementResponse({ skill, payload, dataUsageMode });
  }

  if (routeSkillId === ARTIFACT_REVIEW_SKILL_ID) {
    return createMockArtifactReviewResponse({ skill, payload, dataUsageMode });
  }

  if (routeSkillId === AI_TEMPLATE_REVIEW_SKILL_ID) {
    return createMockTemplateReviewResponse({ skill, payload, dataUsageMode });
  }

  if (isBRDGenerationSkill(routeSkillId)) {
    return createMockBRDResponse({
      routeSkillId,
      skill,
      payload,
      dataUsageMode
    });
  }

  if (isSRSGenerationSkill(routeSkillId)) {
    return createMockSRSResponse({
      routeSkillId,
      skill,
      payload,
      dataUsageMode
    });
  }

  if (isUserStoryGenerationSkill(routeSkillId)) {
    return createMockUserStoryResponse({
      routeSkillId,
      skill,
      payload,
      dataUsageMode
    });
  }

  if (isAcceptanceCriteriaGenerationSkill(routeSkillId)) {
    return createMockAcceptanceCriteriaResponse({
      routeSkillId,
      skill,
      payload,
      dataUsageMode
    });
  }

  if (isProductScopeReviewSkill(routeSkillId)) {
    return createMockProductScopeReviewResponse({
      routeSkillId,
      skill,
      payload,
      dataUsageMode
    });
  }

  if (isAICodingPackGenerationSkill(routeSkillId)) {
    return createMockAICodingPackResponse({
      routeSkillId,
      skill,
      payload,
      dataUsageMode
    });
  }

  if (isRequirementQualityCheckSkill(routeSkillId)) {
    return createMockRequirementQAResponse({
      routeSkillId,
      skill,
      payload,
      dataUsageMode
    });
  }

  return NextResponse.json(
    {
      ok: false,
      error: `Skill ${routeSkillId} is registered but does not have a deterministic mock route yet.`,
      meta: {
        orchestrationVersion: ORCHESTRATION_VERSION,
        providerId: "mock",
        dataUsageMode,
        validationPassed: false,
        externalApiCalled: false,
        promptPackId: skill.promptPackId
      }
    },
    { status: 501 }
  );
}

function createRouteSpecificInputValidationError(
  routeSkillId: string,
  payload: unknown
) {
  if (routeSkillId === AI_PROCESS_QA_SKILL_ID && !isAIQAPayload(payload)) {
    return "AI QA request must include processTasks and optional templateProfiles.";
  }

  if (
    routeSkillId === AI_TEMPLATE_REVIEW_SKILL_ID &&
    !isTemplateReviewPayload(payload)
  ) {
    return "Template review request must include selectedTemplate.";
  }

  if (
    routeSkillId === ARTIFACT_REVIEW_SKILL_ID &&
    !isArtifactReviewPayload(payload)
  ) {
    return "Artifact review request must include artifactType, artifactXml, processTasks, and selectedTemplate.";
  }

  if (
    (routeSkillId === PTR_TO_BRD_SKILL_ID ||
      routeSkillId === LEGACY_PTR_TO_BRD_OUTLINE_SKILL_ID) &&
    (!isObject(payload) || !Array.isArray(payload.processTasks))
  ) {
    return "PTR-to-BRD request must include processTasks.";
  }

  if (
    routeSkillId === NOTES_TO_BRD_SKILL_ID &&
    (!isBRDGenerationPayload(payload) || !hasEnoughBRDText(payload))
  ) {
    return "Notes-to-BRD request must include notes, sourceSummary, projectContext, or uploadedFileText with enough content.";
  }

  if (
    routeSkillId === BRD_TO_SRS_SKILL_ID &&
    (!isSRSGenerationPayload(payload) ||
      (!isObject(payload.brd) && !Array.isArray(payload.processTasks)))
  ) {
    return "BRD-to-SRS request must include a BRD draft or Process Task Register context.";
  }

  if (
    routeSkillId === NOTES_TO_SRS_SKILL_ID &&
    (!isSRSGenerationPayload(payload) || !hasEnoughSRSText(payload))
  ) {
    return "Notes-to-SRS request must include notes, sourceSummary, projectContext, uploadedFileText, or BRD draft with enough content.";
  }

  if (
    routeSkillId === SRS_TO_USER_STORIES_SKILL_ID &&
    (!isUserStoryGenerationPayload(payload) ||
      (!isObject(payload.srs) && !Array.isArray(payload.processTasks)))
  ) {
    return "SRS-to-User-Stories request must include an SRS draft or Process Task Register context.";
  }

  if (
    routeSkillId === BRD_TO_USER_STORIES_SKILL_ID &&
    (!isUserStoryGenerationPayload(payload) ||
      (!isObject(payload.brd) && !Array.isArray(payload.processTasks)))
  ) {
    return "BRD-to-User-Stories request must include a BRD draft or Process Task Register context.";
  }

  if (
    routeSkillId === LEGACY_BRD_OR_NOTES_TO_USER_STORIES_SKILL_ID &&
    (!isUserStoryGenerationPayload(payload) || !hasEnoughUserStoryText(payload))
  ) {
    return "User Story request must include SRS, BRD, PTR, notes, sourceSummary, projectContext, or uploadedFileText with enough content.";
  }

  if (
    routeSkillId === USER_STORIES_TO_ACCEPTANCE_CRITERIA_SKILL_ID &&
    (!isAcceptanceCriteriaGenerationPayload(payload) ||
      (!isObject(payload.userStorySet) && !Array.isArray(payload.processTasks)))
  ) {
    return "Acceptance Criteria request must include userStorySet or Process Task Register context.";
  }

  if (
    isProductScopeReviewSkill(routeSkillId) &&
    (!isProductScopeReviewPayload(payload) || !hasScopeReviewContext(payload))
  ) {
    return "Product Scope Review request must include BRD, SRS, userStorySet, PTR, notes, sourceSummary, projectContext, uploadedFileText, or businessObjective.";
  }

  if (
    isAICodingPackGenerationSkill(routeSkillId) &&
    (!isAICodingPackGenerationPayload(payload) || !hasAICodingPackContext(payload))
  ) {
    return "AI Coding Pack request must include BRD, SRS, userStorySet, acceptanceCriteria, or Process Task Register context.";
  }

  if (
    isRequirementQualityCheckSkill(routeSkillId) &&
    (!isRequirementQualityCheckPayload(payload) ||
      !hasRequirementQualityContext(payload))
  ) {
    return "Requirement QA request must include BRD, SRS, userStorySet, acceptanceCriteria, or AI Coding Pack context.";
  }

  return "";
}

export function GET() {
  const realAIEnabled = getAnyRealAIEnabled();
  const providerName = getProviderName();
  const dataUsageMode = getServerDataUsageMode(realAIEnabled, providerName);
  const providerStatus = getAIProviderStatus(realAIEnabled, providerName);

  return NextResponse.json({
    ok: true,
    orchestrationVersion: ORCHESTRATION_VERSION,
    realAIEnabled: process.env.ENABLE_REAL_AI === "true",
    realAIQAEnabled: process.env.ENABLE_REAL_AI_QA === "true",
    realAITemplateReviewEnabled:
      process.env.ENABLE_REAL_AI_TEMPLATE_REVIEW === "true",
    providerStatus,
    providers: getProviderStatusSummary(),
    provider: providerName,
    dataUsageMode,
    model: getConfiguredAIModel(providerName)
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON request body."
      },
      { status: 400 }
    );
  }

  if (isObject(body) && body.action === "test-connection") {
    const realAIEnabled = getAnyRealAIEnabled();
    const providerName = getProviderName();
    const dataUsageMode = getServerDataUsageMode(realAIEnabled, providerName);
    const selectedProviderStatus = getProviderDisplayStatus(providerName);

    return NextResponse.json({
      ok: selectedProviderStatus === "configured" || selectedProviderStatus === "available",
      action: "test-connection",
      orchestrationVersion: ORCHESTRATION_VERSION,
      provider: providerName,
      providerStatus: getAIProviderStatus(realAIEnabled, providerName),
      displayStatus: selectedProviderStatus,
      providers: getProviderStatusSummary(),
      dataUsageMode,
      model: getConfiguredAIModel(providerName),
      externalApiCalled: false,
      message:
        selectedProviderStatus === "missing env"
          ? "Selected provider is missing required server environment variables."
          : selectedProviderStatus === "disabled"
            ? "Real AI feature flags are disabled; mock/local fallback is active."
            : "Server-side AI connection configuration is available."
    });
  }

  if (!isValidRunSkillRequest(body)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Request body must include a non-empty skillId and payload."
      },
      { status: 400 }
    );
  }

  const routeSkillId = body.skillId.trim();
  const registrySkillId = getRegistrySkillId(routeSkillId);
  const skill = getAISkillDefinitionV2(registrySkillId);

  if (!skill) {
    return NextResponse.json(
      {
        ok: false,
        error: `Unsupported skillId: ${routeSkillId}`,
        meta: {
          orchestrationVersion: ORCHESTRATION_VERSION,
          validationPassed: false,
          externalApiCalled: false
        }
      },
      { status: 400 }
    );
  }

  const selectedProvider = isAIProviderId(body.providerId)
    ? body.providerId
    : getProviderName();
  const realAIEnabled = isRealAIEnabledForSkill(routeSkillId);
  const dataUsageMode = getServerDataUsageMode(realAIEnabled, selectedProvider);
  const routeSpecificValidationError = createRouteSpecificInputValidationError(
    routeSkillId,
    body.payload
  );

  if (routeSpecificValidationError) {
    return NextResponse.json(
      {
        ok: false,
        error: routeSpecificValidationError
      },
      { status: 400 }
    );
  }

  const inputValidation = validateAISkillInput(registrySkillId, body.payload);

  if (!inputValidation.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: `Invalid ${skill.inputSchema.id}.`,
        validationErrors: inputValidation.errors,
        meta: {
          orchestrationVersion: ORCHESTRATION_VERSION,
          skillId: routeSkillId,
          registrySkillId,
          inputSchema: skill.inputSchema.id,
          validationPassed: false,
          externalApiCalled: false
        }
      },
      { status: 400 }
    );
  }

  if (routeSkillId === INPUT_BRIEF_TO_PTR_SKILL_ID) {
    const briefValidation = validateStructuredProcessBrief(body.payload);

    if (!briefValidation.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid StructuredProcessBrief.",
          validationErrors: briefValidation.errors
        },
        { status: 400 }
      );
    }

    const briefQualityGate = runBriefQualityGate(briefValidation.value);

    if (!briefQualityGate.canPreview) {
      return NextResponse.json(
        {
          ok: false,
          error: "Brief chua du thong tin de tao Draft PTR.",
          validationErrors: formatQualityGateErrorsVi(briefQualityGate),
          qualityGate: briefQualityGate
        },
        { status: 400 }
      );
    }
  }

  const selectedProviderAllowed = skill.allowedProviders.includes(selectedProvider);

  if (!selectedProviderAllowed && realAIEnabled) {
    return NextResponse.json(
      {
        ok: false,
        error: `Provider ${selectedProvider} is not allowed for skill ${routeSkillId}.`,
        meta: {
          orchestrationVersion: ORCHESTRATION_VERSION,
          skillId: routeSkillId,
          registrySkillId,
          allowedProviders: skill.allowedProviders,
          selectedProvider,
          requestedProvider: isAIProviderId(body.providerId) ? body.providerId : undefined,
          validationPassed: false,
          externalApiCalled: false
        }
      },
      { status: 400 }
    );
  }

  const mustUseMock =
    !realAIEnabled ||
    selectedProvider === "mock" ||
    dataUsageMode === "local-only" ||
    !isAIProviderConfigured(selectedProvider);

  if (mustUseMock) {
    return createMockResponse({
      routeSkillId,
      skill,
      payload: inputValidation.value,
      dataUsageMode
    });
  }

  if (!isRouteBackedByDeterministicMock(routeSkillId) && skill.status === "planned") {
    return NextResponse.json(
      {
        ok: false,
        error: `Skill ${routeSkillId} is registered but not ready for provider-backed execution yet.`,
        meta: {
          orchestrationVersion: ORCHESTRATION_VERSION,
          skillId: routeSkillId,
          registrySkillId,
          requestedProvider: isAIProviderId(body.providerId) ? body.providerId : undefined,
          skillStatus: skill.status,
          validationPassed: false,
          externalApiCalled: false
        }
      },
      { status: 501 }
    );
  }

  try {
    const aiRequest: AIModelRequest = {
      skillId: routeSkillId,
      payload: inputValidation.value,
      messages: createProviderMessages({
        skill,
        routeSkillId,
        payload: inputValidation.value
      })
    };
    const result = await runConfiguredProviderWithTimeout(aiRequest, selectedProvider);
    const parseResult = await parseProviderJsonWithOptionalRepair({
      skill,
      routeSkillId,
      payload: inputValidation.value,
      result
    });

    if (parseResult.parsedResult === undefined) {
      const audit = createSafeAuditMetadata({
        skill,
        routeSkillId,
        providerId: parseResult.providerResult.providerId,
        dataUsageMode,
        mode: "provider-backed",
        validationPassed: false,
        requestId: parseResult.providerResult.requestId,
        latencyMs: parseResult.providerResult.latencyMs,
        externalApiCalled: parseResult.providerResult.externalApiCalled,
        outputRepairAttempted: parseResult.repairAttempted,
        errorCode: "malformed_json"
      });
      recordServerAudit(audit);

      return NextResponse.json(
        {
          ok: false,
          error: "AI output was not valid JSON.",
          validationErrors: [parseResult.parseError ?? "Malformed JSON output."],
          meta: createProviderMeta(parseResult.providerResult, {
            skillId: routeSkillId,
            registrySkillId,
            promptPackId: skill.promptPackId,
            dataUsageMode,
            outputRepairAttempted: parseResult.repairAttempted,
            validationPassed: false,
            audit
          })
        },
        { status: 422 }
      );
    }

    const outputValidation = validateAISkillOutput(
      routeSkillId,
      parseResult.parsedResult,
      getValidationContext(routeSkillId, inputValidation.value)
    );

    if (!outputValidation.ok) {
      const audit = createSafeAuditMetadata({
        skill,
        routeSkillId,
        providerId: parseResult.providerResult.providerId,
        dataUsageMode,
        mode: "provider-backed",
        validationPassed: false,
        requestId: parseResult.providerResult.requestId,
        latencyMs: parseResult.providerResult.latencyMs,
        externalApiCalled: parseResult.providerResult.externalApiCalled,
        outputRepairAttempted: parseResult.repairAttempted,
        errorCode: "schema_validation_failed"
      });
      recordServerAudit(audit);

      return NextResponse.json(
        {
          ok: false,
          error: `AI output failed ${skill.outputSchema.id} schema validation.`,
          validationErrors: outputValidation.errors,
          resultPreview: {
            outputSchema: skill.outputSchema.id,
            reviewRequired: true
          },
          meta: createProviderMeta(parseResult.providerResult, {
            skillId: routeSkillId,
            registrySkillId,
            promptPackId: skill.promptPackId,
            dataUsageMode,
            outputRepairAttempted: parseResult.repairAttempted,
            validationPassed: false,
            audit
          })
        },
        { status: 422 }
      );
    }

    let normalizedResult = normalizeValidatedResult(
      routeSkillId,
      outputValidation.value
    );
    let additionalMeta: Record<string, unknown> = {};

    if (isBRDGenerationSkill(routeSkillId)) {
      const brd = outputValidation.value as BRD;
      const brdQualityGate = runBRDQualityGate(brd);

      if (!brdQualityGate.canPreview) {
        return NextResponse.json(
          {
            ok: false,
            error: "BRD draft failed quality gate.",
            validationErrors: brdQualityGate.issues
              .filter((issue) => issue.severity === "error")
              .map((issue) => issue.message),
            qualityGate: brdQualityGate,
            meta: createProviderMeta(parseResult.providerResult, {
              skillId: routeSkillId,
              registrySkillId,
              promptPackId: skill.promptPackId,
              dataUsageMode,
              outputRepairAttempted: parseResult.repairAttempted,
              validationPassed: true
            })
          },
          { status: 422 }
        );
      }

      normalizedResult = {
        ...brd,
        qualityIssues: brdQualityGate.issues
      };
      additionalMeta = {
        qualityGate: brdQualityGate
      };
    }

    if (isSRSGenerationSkill(routeSkillId)) {
      const srs = outputValidation.value as SRS;
      const srsQualityGate = runSRSQualityGate(srs);

      if (!srsQualityGate.canPreview) {
        return NextResponse.json(
          {
            ok: false,
            error: "SRS draft failed quality gate.",
            validationErrors: srsQualityGate.issues
              .filter((issue) => issue.severity === "error")
              .map((issue) => issue.message),
            qualityGate: srsQualityGate,
            meta: createProviderMeta(parseResult.providerResult, {
              skillId: routeSkillId,
              registrySkillId,
              promptPackId: skill.promptPackId,
              dataUsageMode,
              outputRepairAttempted: parseResult.repairAttempted,
              validationPassed: true
            })
          },
          { status: 422 }
        );
      }

      normalizedResult = {
        ...srs,
        qualityIssues: srsQualityGate.issues
      };
      additionalMeta = {
        qualityGate: srsQualityGate
      };
    }

    if (isUserStoryGenerationSkill(routeSkillId)) {
      const userStorySet = outputValidation.value as UserStorySet;
      const userStoryQualityGate = runUserStoryQualityGate(userStorySet);

      if (!userStoryQualityGate.canPreview) {
        return NextResponse.json(
          {
            ok: false,
            error: "User Story draft failed quality gate.",
            validationErrors: userStoryQualityGate.issues
              .filter((issue) => issue.severity === "error")
              .map((issue) => issue.message),
            qualityGate: userStoryQualityGate,
            meta: createProviderMeta(parseResult.providerResult, {
              skillId: routeSkillId,
              registrySkillId,
              promptPackId: skill.promptPackId,
              dataUsageMode,
              outputRepairAttempted: parseResult.repairAttempted,
              validationPassed: true
            })
          },
          { status: 422 }
        );
      }

      normalizedResult = {
        ...userStorySet,
        qualityIssues: userStoryQualityGate.issues
      };
      additionalMeta = {
        qualityGate: userStoryQualityGate
      };
    }

    if (isAcceptanceCriteriaGenerationSkill(routeSkillId)) {
      const criteriaSet = outputValidation.value as AcceptanceCriteriaSet;
      const criteriaQualityGate =
        runAcceptanceCriteriaQualityGate(criteriaSet);

      if (!criteriaQualityGate.canPreview) {
        return NextResponse.json(
          {
            ok: false,
            error: "Acceptance Criteria draft failed quality gate.",
            validationErrors: criteriaQualityGate.issues
              .filter((issue) => issue.severity === "error")
              .map((issue) => issue.message),
            qualityGate: criteriaQualityGate,
            meta: createProviderMeta(parseResult.providerResult, {
              skillId: routeSkillId,
              registrySkillId,
              promptPackId: skill.promptPackId,
              dataUsageMode,
              outputRepairAttempted: parseResult.repairAttempted,
              validationPassed: true
            })
          },
          { status: 422 }
        );
      }

      normalizedResult = {
        ...criteriaSet,
        qualityIssues: criteriaQualityGate.issues
      };
      additionalMeta = {
        qualityGate: criteriaQualityGate
      };
    }

    if (isProductScopeReviewSkill(routeSkillId)) {
      const scopeReview = outputValidation.value as ProductScopeReview;
      const scopeQualityGate = runProductScopeReviewQualityGate(scopeReview);

      if (!scopeQualityGate.canPreview) {
        return NextResponse.json(
          {
            ok: false,
            error: "Product Scope Review failed quality gate.",
            validationErrors: scopeQualityGate.issues
              .filter((issue) => issue.severity === "error")
              .map((issue) => issue.message),
            qualityGate: scopeQualityGate,
            meta: createProviderMeta(parseResult.providerResult, {
              skillId: routeSkillId,
              registrySkillId,
              promptPackId: skill.promptPackId,
              dataUsageMode,
              outputRepairAttempted: parseResult.repairAttempted,
              validationPassed: true
            })
          },
          { status: 422 }
        );
      }

      normalizedResult = {
        ...scopeReview,
        qualityIssues: scopeQualityGate.issues
      };
      additionalMeta = {
        qualityGate: scopeQualityGate
      };
    }

    if (isAICodingPackGenerationSkill(routeSkillId)) {
      const codingPack = outputValidation.value as AICodingPackResponse;
      const filesByPath = new Map(
        codingPack.files.map((file) => [file.path, file.content])
      );
      const files: AICodingPackFiles = {
        agentsMd: filesByPath.get("AGENTS.md") ?? "",
        claudeMd: filesByPath.get("CLAUDE.md") ?? "",
        cursorRulesMd:
          filesByPath.get("cursor-rules.md") ??
          filesByPath.get(".cursorrules") ??
          "",
        specJson:
          typeof codingPack.specJson === "string"
            ? codingPack.specJson
            : filesByPath.get("spec.json") ?? "",
        acceptanceCriteriaMd:
          filesByPath.get("acceptance-criteria.md") ?? "",
        implementationPlanMd:
          filesByPath.get("implementation-plan.md") ?? "",
        testPlanMd: filesByPath.get("test-plan.md") ?? ""
      };
      const codingPackQualityGate = runAICodingPackQualityGate({
        files,
        assumptions: codingPack.assumptions,
        openQuestions: codingPack.openQuestions
      });

      if (!codingPackQualityGate.canPreview) {
        return NextResponse.json(
          {
            ok: false,
            error: "AI Coding Pack failed quality gate.",
            validationErrors: codingPackQualityGate.issues,
            qualityGate: codingPackQualityGate,
            meta: createProviderMeta(parseResult.providerResult, {
              skillId: routeSkillId,
              registrySkillId,
              promptPackId: skill.promptPackId,
              dataUsageMode,
              outputRepairAttempted: parseResult.repairAttempted,
              validationPassed: true
            })
          },
          { status: 422 }
        );
      }

      normalizedResult = {
        ...codingPack,
        qualityIssues: codingPackQualityGate.issues
      };
      additionalMeta = {
        qualityGate: codingPackQualityGate
      };
    }

    if (isRequirementQualityCheckSkill(routeSkillId)) {
      const requirementQA = outputValidation.value as RequirementQAResponse;

      normalizedResult = requirementQA;
      additionalMeta = {
        findingCount: requirementQA.findings.length,
        recommendationCount: requirementQA.recommendations.length,
        coverage: requirementQA.coverage
      };
    }

    if (isDraftPtrGenerationSkill(routeSkillId)) {
      const draftValidation = validateDraftProcessTaskRegister(outputValidation.value);

      if (!draftValidation.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: "AI output failed DraftProcessTaskRegister schema validation.",
            validationErrors: draftValidation.errors,
            meta: createProviderMeta(parseResult.providerResult, {
              skillId: routeSkillId,
              registrySkillId,
              promptPackId: skill.promptPackId,
              dataUsageMode,
              outputRepairAttempted: parseResult.repairAttempted,
              validationPassed: false
            })
          },
          { status: 422 }
        );
      }

      const draftQualityGate = runDraftProcessTaskRegisterQualityGate(
        draftValidation.value
      );

      if (!draftQualityGate.canPreview) {
        return NextResponse.json(
          {
            ok: false,
            error: "Draft PTR khong dat Quality Gate.",
            validationErrors: formatQualityGateErrorsVi(draftQualityGate),
            qualityGate: draftQualityGate,
            meta: createProviderMeta(parseResult.providerResult, {
              skillId: routeSkillId,
              registrySkillId,
              promptPackId: skill.promptPackId,
              dataUsageMode,
              outputRepairAttempted: parseResult.repairAttempted,
              validationPassed: true
            })
          },
          { status: 422 }
        );
      }

      normalizedResult = {
        ...draftValidation.value,
        qualityIssues: [
          ...draftValidation.value.qualityIssues,
          ...formatQualityGateWarningsVi(draftQualityGate)
        ],
        qualityGateWarnings: formatQualityGateWarningsVi(draftQualityGate)
      };
      additionalMeta = {
        realAIEnabled: true,
        qualityGate: draftQualityGate
      };
    }

    const audit = createSafeAuditMetadata({
      skill,
      routeSkillId,
      providerId: parseResult.providerResult.providerId,
      dataUsageMode,
      mode: "provider-backed",
      validationPassed: true,
      requestId: parseResult.providerResult.requestId,
      latencyMs: parseResult.providerResult.latencyMs,
      externalApiCalled: parseResult.providerResult.externalApiCalled,
      outputRepairAttempted: parseResult.repairAttempted
    });
    recordServerAudit(audit);

    return NextResponse.json({
      ok: true,
      mode: "provider-backed",
      skillId: routeSkillId,
      registrySkillId,
      result: normalizedResult,
      meta: createProviderMeta(parseResult.providerResult, {
        skillVersion: skill.version,
        promptPackId: skill.promptPackId,
        promptPackVersion: getPromptPackForSkill(skill.skillId)?.version,
        inputSchema: skill.inputSchema.id,
        outputSchema: skill.outputSchema.id,
        dataUsageMode,
        requiresApproval: skill.requiresApproval,
        outputRepairAttempted: parseResult.repairAttempted,
        validationPassed: true,
        audit,
        ...additionalMeta
      })
    });
  } catch (error) {
    const audit = createSafeAuditMetadata({
      skill,
      routeSkillId,
      providerId: selectedProvider,
      dataUsageMode,
      mode: "provider-backed",
      validationPassed: false,
      externalApiCalled: true,
      errorCode: "provider_error"
    });
    recordServerAudit(audit);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "AI provider request failed.",
        meta: {
          orchestrationVersion: ORCHESTRATION_VERSION,
          skillId: routeSkillId,
          registrySkillId,
          providerId: selectedProvider,
          dataUsageMode,
          validationPassed: false,
          externalApiCalled: true,
          audit
        }
      },
      { status: 500 }
    );
  }
}
