import { NextResponse } from "next/server";
import {
  generateDraftProcessTaskRegister,
  parseStructuredProcessBriefFromForm,
  validateDraftProcessTaskRegister,
  validateStructuredProcessBrief
} from "@/lib/ai-intake";
import type { IntakeLanguage } from "@/lib/ai-intake";
import { runMockAIQA } from "@/lib/ai/ai-qa-service";
import type { AIQARequest } from "@/lib/ai/ai-qa-types";
import { runMockTemplateReview } from "@/lib/ai/ai-template-review-service";
import type { AITemplateReviewRequest } from "@/lib/ai/ai-template-review-types";
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
  validateAISkillInput,
  validateAISkillOutput,
  type AISkillValidationContext
} from "@/lib/ai/skill-schemas";
import {
  formatQualityGateErrorsVi,
  formatQualityGateWarningsVi,
  runBriefQualityGate,
  runDraftProcessTaskRegisterQualityGate
} from "@/lib/quality-engine";
import { validateAIQARecommendations } from "@/lib/recommendation-engine/qa-recommendation-schema";
import { validateTemplateReviewOutput } from "@/lib/template-recommendation-engine";

export const runtime = "nodejs";

type RunSkillRequestBody = {
  action?: unknown;
  skillId?: unknown;
  payload?: unknown;
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
const AI_TEMPLATE_REVIEW_SKILL_ID = "ai-template-review";
const TEMPLATE_REVIEW_REGISTRY_SKILL_ID = "template-review";
const ORCHESTRATION_VERSION = "2.0.0";
const DEFAULT_PROVIDER_TIMEOUT_MS = 45000;
const SERVER_PROVIDER_IDS: AIProviderId[] = ["product-ai", "openai", "claude", "mock"];

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
    AI_TEMPLATE_REVIEW_SKILL_ID
  ].includes(routeSkillId);
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

async function runConfiguredProviderWithTimeout(aiRequest: AIModelRequest) {
  const provider = createConfiguredAIProvider();

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
      const repairResult = await runConfiguredProviderWithTimeout({
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
      });

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

function isTemplateReviewPayload(
  value: unknown
): value is TemplateReviewPayload {
  return isObject(value) && isObject(value.selectedTemplate);
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

  if (isObject(payload) && Array.isArray(payload.processTasks)) {
    return {
      validStepIds: payload.processTasks
        .map((task) => (isObject(task) ? task.stepId : undefined))
        .filter((stepId): stepId is string => typeof stepId === "string")
    };
  }

  return {};
}

function normalizeValidatedResult(routeSkillId: string, value: unknown) {
  if (routeSkillId === AI_PROCESS_QA_SKILL_ID) {
    return {
      recommendations: value
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
      qualityScore: response.qualityScore
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
    provider: getProviderName(),
    model: process.env.AI_MODEL || "",
    skillId: AI_TEMPLATE_REVIEW_SKILL_ID,
    result: {
      recommendations: validation.recommendations,
      qualityScore: validation.qualityScore
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
    provider: getProviderName(),
    model: process.env.AI_MODEL || "",
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
    provider: getProviderName(),
    model: process.env.AI_MODEL || "",
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
    provider: getProviderName(),
    model: process.env.AI_MODEL || "",
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
    provider: getProviderName(),
    model: process.env.AI_MODEL || "",
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

  if (routeSkillId === AI_TEMPLATE_REVIEW_SKILL_ID) {
    return createMockTemplateReviewResponse({ skill, payload, dataUsageMode });
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

  const selectedProvider = getProviderName();
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
    const result = await runConfiguredProviderWithTimeout(aiRequest);
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
