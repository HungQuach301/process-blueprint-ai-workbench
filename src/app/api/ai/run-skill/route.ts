import { NextResponse } from "next/server";
import {
  generateDraftProcessTaskRegister,
  validateDraftProcessTaskRegister,
  validateStructuredProcessBrief
} from "@/lib/ai-intake";
import {
  type AIModelRequest,
  type AIProviderAdapter,
  type AIProviderId
} from "@/lib/ai/provider-types";
import { createAnthropicProvider } from "@/lib/ai/providers/anthropic-provider";
import { createMockProvider } from "@/lib/ai/providers/mock-provider";
import { createOpenAIProvider } from "@/lib/ai/providers/openai-provider";
import {
  aiProcessQaOutputSchema,
  inputBriefToPtrOutputSchema,
  validateAIOutputAgainstSchema
} from "@/lib/ai/schemas";
import { runMockAIQA } from "@/lib/ai/ai-qa-service";
import type { AIQARequest } from "@/lib/ai/ai-qa-types";
import { runMockTemplateReview } from "@/lib/ai/ai-template-review-service";
import type { AITemplateReviewRequest } from "@/lib/ai/ai-template-review-types";
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
  skillId?: unknown;
  provider?: unknown;
  payload?: unknown;
  outputSchema?: unknown;
};

const INPUT_BRIEF_TO_PTR_SKILL_ID = "input-brief-to-ptr";
const AI_PROCESS_QA_SKILL_ID = "ai-process-qa";
const AI_TEMPLATE_REVIEW_SKILL_ID = "ai-template-review";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAIProviderId(value: unknown): value is AIProviderId {
  return value === "mock" || value === "openai" || value === "anthropic";
}

function isRealAIEnabled() {
  return process.env.ENABLE_REAL_AI === "true";
}

function isSkillRealAIEnabled(skillId: string) {
  if (!isRealAIEnabled()) {
    return false;
  }

  if (skillId === INPUT_BRIEF_TO_PTR_SKILL_ID) {
    return process.env.ENABLE_REAL_AI_INPUT_BRIEF === "true";
  }

  if (skillId === AI_PROCESS_QA_SKILL_ID) {
    return process.env.ENABLE_REAL_AI_QA === "true";
  }

  if (skillId === AI_TEMPLATE_REVIEW_SKILL_ID) {
    return process.env.ENABLE_REAL_AI_TEMPLATE_REVIEW === "true";
  }

  return true;
}

function resolveProvider(requestedProvider: unknown): AIProviderId {
  if (!isRealAIEnabled()) {
    return "mock";
  }

  if (isAIProviderId(requestedProvider)) {
    return requestedProvider;
  }

  return isAIProviderId(process.env.AI_PROVIDER)
    ? process.env.AI_PROVIDER
    : "mock";
}

function getConfiguredModel(provider: AIProviderId) {
  if (provider === "openai") {
    return process.env.AI_MODEL_OPENAI || "gpt-4o-mini";
  }

  if (provider === "anthropic") {
    return process.env.AI_MODEL_ANTHROPIC || "claude-3-5-sonnet-latest";
  }

  return "mock";
}

function hasConfiguredProviderKey(provider: AIProviderId) {
  if (provider === "openai") {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  if (provider === "anthropic") {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  return false;
}

function createProviderAdapter(provider: AIProviderId): AIProviderAdapter {
  if (provider === "openai") {
    return createOpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY || "",
      model: getConfiguredModel("openai")
    });
  }

  if (provider === "anthropic") {
    return createAnthropicProvider({
      apiKey: process.env.ANTHROPIC_API_KEY || "",
      model: getConfiguredModel("anthropic")
    });
  }

  return createMockProvider();
}

function logServerAIAuditEvent({
  skillId,
  provider,
  success,
  externalApiCalled
}: {
  skillId: string;
  provider: AIProviderId;
  success: boolean;
  externalApiCalled: boolean;
}) {
  console.info("[ai-audit]", {
    action: "ai_call",
    skillId,
    provider,
    success,
    externalApiCalled,
    timestamp: new Date().toISOString()
  });
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

function extractJsonObject(value: string) {
  const trimmedValue = value.trim();
  const fencedJsonMatch = trimmedValue.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedJsonMatch?.[1]) {
    return fencedJsonMatch[1].trim();
  }

  return trimmedValue;
}

function createPromptForInputBriefToPtr(payload: unknown) {
  return [
    {
      role: "system" as const,
      content:
        "You convert a StructuredProcessBrief into a DraftProcessTaskRegister. Return only valid JSON. Do not include markdown. Every draftProcessTasks item must match the ProcessTask shape, use canonical enum values, set reviewStatus to needsReview, and keep output reviewable before user apply."
    },
    {
      role: "user" as const,
      content: JSON.stringify(
        {
          skillId: INPUT_BRIEF_TO_PTR_SKILL_ID,
          requiredOutputShape: {
            draftProcessTasks: "ProcessTask[]",
            assumptions: "string[]",
            openQuestions: "string[]",
            sourceSummary: "string",
            confidence: "low | medium | high",
            inputLanguage: "vi | en",
            outputLanguage: "vi | en | bilingual"
          },
          structuredBrief: payload
        },
        null,
        2
      )
    }
  ];
}

function createPromptForAIProcessQA(payload: unknown) {
  return [
    {
      role: "system" as const,
      content:
        "You review a Process Task Register and return only a JSON array of QARecommendation objects. Do not include markdown. Every recommendation must use source ai, existing targetStepIds, structured operations, previewText, confidence, impact, riskLevel, and requiresConfirmation true. Do not auto-apply anything."
    },
    {
      role: "user" as const,
      content: JSON.stringify(
        {
          skillId: AI_PROCESS_QA_SKILL_ID,
          requiredOutput: "QARecommendation[]",
          context: payload
        },
        null,
        2
      )
    }
  ];
}

function createPromptForAITemplateReview(payload: unknown) {
  return [
    {
      role: "system" as const,
      content:
        "You review one TemplateProfile and return only JSON with recommendations and optional qualityScore. Recommendations must be TemplateRecommendation objects, source ai, templateId matching the selected template, affectedFields, and requiresConfirmation true. Do not auto-apply template changes."
    },
    {
      role: "user" as const,
      content: JSON.stringify(
        {
          skillId: AI_TEMPLATE_REVIEW_SKILL_ID,
          requiredOutput: {
            recommendations: "TemplateRecommendation[]",
            qualityScore: "TemplateQualityScore optional"
          },
          context: payload
        },
        null,
        2
      )
    }
  ];
}

function isAIQAPayload(value: unknown): value is Omit<AIQARequest, "context"> {
  return (
    isObject(value) &&
    Array.isArray(value.processTasks) &&
    (value.templateProfiles === undefined || Array.isArray(value.templateProfiles))
  );
}

type TemplateReviewPayload = Omit<AITemplateReviewRequest, "context" | "templateProfiles"> & {
  selectedTemplate?: unknown;
};

function isTemplateReviewPayload(
  value: unknown
): value is TemplateReviewPayload {
  return isObject(value) && isObject(value.selectedTemplate);
}

function createMockTemplateReviewResponse(payload: unknown) {
  if (!isTemplateReviewPayload(payload)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Template review request must include selectedTemplate."
      },
      { status: 400 }
    );
  }

  const selectedTemplate = payload.selectedTemplate as AITemplateReviewRequest["templateProfiles"][number];
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

  return NextResponse.json({
    ok: true,
    mode: "mock",
    provider: "mock",
    model: "mock",
    skillId: AI_TEMPLATE_REVIEW_SKILL_ID,
    result: {
      recommendations: validation.recommendations,
      qualityScore: validation.qualityScore
    },
    meta: {
      externalApiCalled: false,
      realAITemplateReviewEnabled: false,
      validationPassed: true
    }
  });
}

function createMockAIQAResponse(payload: unknown) {
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

  return NextResponse.json({
    ok: true,
    mode: "mock",
    provider: "mock",
    model: "mock",
    skillId: AI_PROCESS_QA_SKILL_ID,
    result: {
      recommendations: validation.recommendations
    },
    meta: {
      externalApiCalled: false,
      realAIQAEnabled: false,
      validationPassed: true
    }
  });
}

function createMockResponse(skillId: string, payload: unknown) {
  if (skillId === INPUT_BRIEF_TO_PTR_SKILL_ID) {
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

    return NextResponse.json({
      ok: true,
      mode: "mock",
      provider: "mock",
      model: "mock",
      skillId,
      result: {
        ...draftValidation.value,
        qualityGateWarnings
      },
      meta: {
        externalApiCalled: false,
        realAIEnabled: false,
        validationPassed: true,
        qualityGate: draftQualityGate
      }
    });
  }

  return {
    ok: true,
    mode: "mock",
    provider: "mock",
    model: "mock",
    skillId,
    result: {
      message:
        "Mock AI response. Real AI is disabled by default and no external API call was made.",
      payload
    },
    meta: {
      externalApiCalled: false,
      realAIEnabled: false,
      validationPassed: false
    }
  };
}

export function GET() {
  const realAIEnabled = isRealAIEnabled();
  const provider = resolveProvider(undefined);
  const providerAdapter = createProviderAdapter(provider);
  const providerAdapterStatus = providerAdapter.getStatus();
  const providerStatus = !realAIEnabled || provider === "mock"
    ? "mock-only"
    : providerAdapterStatus;

  return NextResponse.json({
    ok: true,
    realAIEnabled,
    realAIInputBriefEnabled:
      realAIEnabled &&
      process.env.ENABLE_REAL_AI_INPUT_BRIEF === "true" &&
      providerStatus === "configured",
    realAIQAEnabled:
      realAIEnabled &&
      process.env.ENABLE_REAL_AI_QA === "true" &&
      providerStatus === "configured",
    realAITemplateReviewEnabled:
      realAIEnabled && process.env.ENABLE_REAL_AI_TEMPLATE_REVIEW === "true",
    providerStatus,
    provider,
    model: getConfiguredModel(provider)
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

  if (!isValidRunSkillRequest(body)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Request body must include a non-empty skillId and payload."
      },
      { status: 400 }
    );
  }

  const skillId = body.skillId.trim();
  const selectedProvider = resolveProvider(body.provider);
  const enableRealAITemplateReview =
    isSkillRealAIEnabled(AI_TEMPLATE_REVIEW_SKILL_ID);

  if (
    skillId === AI_TEMPLATE_REVIEW_SKILL_ID &&
    !enableRealAITemplateReview
  ) {
    return createMockTemplateReviewResponse(body.payload);
  }

  if (skillId === AI_TEMPLATE_REVIEW_SKILL_ID) {
    if (!isTemplateReviewPayload(body.payload)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Template review request must include selectedTemplate."
        },
        { status: 400 }
      );
    }

    const selectedTemplate = body.payload.selectedTemplate as AITemplateReviewRequest["templateProfiles"][number];
    if (selectedProvider === "mock") {
      return NextResponse.json(
        {
          ok: false,
          error: "Real AI provider must be openai or anthropic when enabled."
        },
        { status: 400 }
      );
    }

    try {
      const provider = createProviderAdapter(selectedProvider);
      const result = await provider.run({
        skillId,
        payload: body.payload,
        messages: createPromptForAITemplateReview(body.payload),
        outputSchema: body.outputSchema
      });
      let parsedResult: unknown;

      try {
        parsedResult = JSON.parse(extractJsonObject(result.content));
      } catch {
        return NextResponse.json(
          {
            ok: false,
            error: "AI template review output was not valid JSON.",
            meta: {
              externalApiCalled: result.externalApiCalled,
              realAITemplateReviewEnabled: true,
              validationPassed: false
            }
          },
          { status: 422 }
        );
      }

      const validation = validateTemplateReviewOutput(
        parsedResult,
        selectedTemplate
      );

      if (!validation.ok) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "AI template review output failed TemplateRecommendation schema validation.",
            validationErrors: validation.errors,
            meta: {
              externalApiCalled: result.externalApiCalled,
              realAITemplateReviewEnabled: true,
              validationPassed: false
            }
          },
          { status: 422 }
        );
      }

      logServerAIAuditEvent({
        skillId,
        provider: result.provider,
        success: true,
        externalApiCalled: result.externalApiCalled
      });

      return NextResponse.json({
        ok: true,
        mode: "provider-backed",
        provider: result.provider,
        model: result.model,
        skillId,
        result: {
          recommendations: validation.recommendations,
          qualityScore: validation.qualityScore
        },
        meta: {
          externalApiCalled: result.externalApiCalled,
          realAITemplateReviewEnabled: true,
          validationPassed: true
        }
      });
    } catch (error) {
      logServerAIAuditEvent({
        skillId,
        provider: selectedProvider,
        success: false,
        externalApiCalled: hasConfiguredProviderKey(selectedProvider)
      });
      return NextResponse.json(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "AI template review provider request failed."
        },
        { status: 500 }
      );
    }
  }

  const enableRealAIQA = isSkillRealAIEnabled(AI_PROCESS_QA_SKILL_ID);

  if (skillId === AI_PROCESS_QA_SKILL_ID && !enableRealAIQA) {
    return createMockAIQAResponse(body.payload);
  }

  if (skillId === AI_PROCESS_QA_SKILL_ID) {
    if (!isAIQAPayload(body.payload)) {
      return NextResponse.json(
        {
          ok: false,
          error: "AI QA request must include processTasks and optional templateProfiles."
        },
        { status: 400 }
      );
    }

    if (selectedProvider === "mock") {
      return NextResponse.json(
        {
          ok: false,
          error: "Real AI provider must be openai or anthropic when enabled."
        },
        { status: 400 }
      );
    }

    try {
      const provider = createProviderAdapter(selectedProvider);
      const aiRequest: AIModelRequest = {
        skillId,
        payload: body.payload,
        messages: createPromptForAIProcessQA(body.payload),
        outputSchema: aiProcessQaOutputSchema
      };
      const result = await provider.generateStructured(aiRequest);

      if (!result.ok) {
        logServerAIAuditEvent({
          skillId,
          provider: result.provider,
          success: false,
          externalApiCalled: result.meta.externalApiCalled
        });

        return NextResponse.json(
          {
            ok: false,
            error: result.error || "AI QA structured output request failed.",
            meta: {
              externalApiCalled: result.meta.externalApiCalled,
              realAIQAEnabled: true,
              validationPassed: false
            }
          },
          { status: 422 }
        );
      }

      const schemaValidation = validateAIOutputAgainstSchema(
        result.result,
        aiProcessQaOutputSchema
      );

      if (!schemaValidation.ok) {
        logServerAIAuditEvent({
          skillId,
          provider: result.provider,
          success: false,
          externalApiCalled: result.meta.externalApiCalled
        });

        return NextResponse.json(
          {
            ok: false,
            error: "AI QA output failed QARecommendation JSON schema validation.",
            validationErrors: schemaValidation.errors,
            meta: {
              externalApiCalled: result.meta.externalApiCalled,
              realAIQAEnabled: true,
              validationPassed: false
            }
          },
          { status: 422 }
        );
      }

      const validation = validateAIQARecommendations(
        result.result,
        body.payload.processTasks.map((task) => task.stepId)
      );

      if (!validation.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: "AI QA output failed QARecommendation schema validation.",
            validationErrors: validation.errors,
            meta: {
              externalApiCalled: result.meta.externalApiCalled,
              realAIQAEnabled: true,
              validationPassed: false
            }
          },
          { status: 422 }
        );
      }

      logServerAIAuditEvent({
        skillId,
        provider: result.provider,
        success: true,
        externalApiCalled: result.meta.externalApiCalled
      });

      return NextResponse.json({
        ok: true,
        mode: "provider-backed",
        provider: result.provider,
        model: result.model,
        skillId,
        result: {
          recommendations: validation.recommendations
        },
        meta: {
          externalApiCalled: result.meta.externalApiCalled,
          realAIQAEnabled: true,
          validationPassed: true
        }
      });
    } catch (error) {
      logServerAIAuditEvent({
        skillId,
        provider: selectedProvider,
        success: false,
        externalApiCalled: hasConfiguredProviderKey(selectedProvider)
      });
      return NextResponse.json(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "AI QA provider request failed."
        },
        { status: 500 }
      );
    }
  }

  const enableRealAI = isSkillRealAIEnabled(INPUT_BRIEF_TO_PTR_SKILL_ID);

  if (!enableRealAI) {
    const mockResponse = createMockResponse(skillId, body.payload);
    return mockResponse instanceof NextResponse
      ? mockResponse
      : NextResponse.json(mockResponse);
  }

  if (skillId !== INPUT_BRIEF_TO_PTR_SKILL_ID) {
    return NextResponse.json(
      {
        ok: false,
        error: `Unsupported skillId: ${skillId}`
      },
      { status: 400 }
    );
  }

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

  if (selectedProvider === "mock") {
    return NextResponse.json(
      {
        ok: false,
        error: "Real AI provider must be openai or anthropic when enabled."
      },
      { status: 400 }
    );
  }

  try {
    const provider = createProviderAdapter(selectedProvider);

    const aiRequest: AIModelRequest = {
      skillId,
      payload: briefValidation.value,
      messages: createPromptForInputBriefToPtr(briefValidation.value),
      outputSchema: inputBriefToPtrOutputSchema
    };

    const result = await provider.generateStructured(aiRequest);

    if (!result.ok) {
      logServerAIAuditEvent({
        skillId,
        provider: result.provider,
        success: false,
        externalApiCalled: result.meta.externalApiCalled
      });

      return NextResponse.json(
        {
          ok: false,
          error: result.error || "AI structured output request failed.",
          meta: {
            externalApiCalled: result.meta.externalApiCalled,
            realAIEnabled: true,
            validationPassed: false
          }
        },
        { status: 422 }
      );
    }

    const schemaValidation = validateAIOutputAgainstSchema(
      result.result,
      inputBriefToPtrOutputSchema
    );

    if (!schemaValidation.ok) {
      logServerAIAuditEvent({
        skillId,
        provider: result.provider,
        success: false,
        externalApiCalled: result.meta.externalApiCalled
      });

      return NextResponse.json(
        {
          ok: false,
          error: "AI output failed DraftProcessTaskRegister JSON schema validation.",
          validationErrors: schemaValidation.errors,
          meta: {
            externalApiCalled: result.meta.externalApiCalled,
            realAIEnabled: true,
            validationPassed: false
          }
        },
        { status: 422 }
      );
    }

    const draftValidation = validateDraftProcessTaskRegister(result.result);

    if (!draftValidation.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "AI output failed DraftProcessTaskRegister schema validation.",
          validationErrors: draftValidation.errors,
          meta: {
            externalApiCalled: result.meta.externalApiCalled,
            realAIEnabled: true,
            validationPassed: false
          }
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
          meta: {
            externalApiCalled: result.meta.externalApiCalled,
            realAIEnabled: true,
            validationPassed: true
          }
        },
        { status: 422 }
      );
    }

    const qualityGateWarnings = [
      ...formatQualityGateWarningsVi(briefQualityGate),
      ...formatQualityGateWarningsVi(draftQualityGate)
    ];

    logServerAIAuditEvent({
      skillId,
      provider: result.provider,
      success: true,
      externalApiCalled: result.meta.externalApiCalled
    });

    return NextResponse.json({
      ok: true,
      mode: "provider-backed",
      provider: result.provider,
      model: result.model,
      skillId,
      result: {
        ...draftValidation.value,
        qualityGateWarnings
      },
      meta: {
        externalApiCalled: result.meta.externalApiCalled,
        realAIEnabled: true,
        validationPassed: true,
        qualityGate: draftQualityGate
      }
    });
  } catch (error) {
    logServerAIAuditEvent({
      skillId,
      provider: selectedProvider,
      success: false,
      externalApiCalled: hasConfiguredProviderKey(selectedProvider)
    });
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "AI provider request failed."
      },
      { status: 500 }
    );
  }
}
