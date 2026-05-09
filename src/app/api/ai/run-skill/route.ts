import { NextResponse } from "next/server";
import {
  generateDraftProcessTaskRegister,
  validateDraftProcessTaskRegister,
  validateStructuredProcessBrief
} from "@/lib/ai-intake";
import {
  createOpenAIProvider,
  type AIModelRequest
} from "@/lib/ai/providers/openai-provider";
import { runMockAIQA } from "@/lib/ai/ai-qa-service";
import type { AIQARequest } from "@/lib/ai/ai-qa-types";
import {
  formatQualityGateErrorsVi,
  formatQualityGateWarningsVi,
  runBriefQualityGate,
  runDraftProcessTaskRegisterQualityGate
} from "@/lib/quality-engine";
import { validateAIQARecommendations } from "@/lib/recommendation-engine/qa-recommendation-schema";

export const runtime = "nodejs";

type RunSkillRequestBody = {
  skillId?: unknown;
  payload?: unknown;
};

const INPUT_BRIEF_TO_PTR_SKILL_ID = "input-brief-to-ptr";
const AI_PROCESS_QA_SKILL_ID = "ai-process-qa";

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

function isAIQAPayload(value: unknown): value is Omit<AIQARequest, "context"> {
  return (
    isObject(value) &&
    Array.isArray(value.processTasks) &&
    (value.templateProfiles === undefined || Array.isArray(value.templateProfiles))
  );
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
        provider: "no-ai",
        dataUsageMode: "local-only"
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
    provider: process.env.AI_PROVIDER || "openai",
    model: process.env.AI_MODEL || "",
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
      provider: process.env.AI_PROVIDER || "openai",
      model: process.env.AI_MODEL || "",
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
    provider: process.env.AI_PROVIDER || "openai",
    model: process.env.AI_MODEL || "",
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
  return NextResponse.json({
    ok: true,
    realAIEnabled: process.env.ENABLE_REAL_AI === "true",
    realAIQAEnabled: process.env.ENABLE_REAL_AI_QA === "true",
    provider: process.env.AI_PROVIDER || "openai",
    model: process.env.AI_MODEL || ""
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
  const enableRealAIQA = process.env.ENABLE_REAL_AI_QA === "true";

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

    const providerName = process.env.AI_PROVIDER || "openai";

    if (providerName !== "openai") {
      return NextResponse.json(
        {
          ok: false,
          error: `Unsupported AI_PROVIDER: ${providerName}`
        },
        { status: 400 }
      );
    }

    try {
      const provider = createOpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY || "",
        model: process.env.AI_MODEL || ""
      });
      const aiRequest: AIModelRequest = {
        skillId,
        payload: body.payload,
        messages: createPromptForAIProcessQA(body.payload)
      };
      const result = await provider.run(aiRequest);
      let parsedResult: unknown;

      try {
        parsedResult = JSON.parse(extractJsonObject(result.content));
      } catch {
        return NextResponse.json(
          {
            ok: false,
            error: "AI QA output was not valid JSON.",
            meta: {
              externalApiCalled: result.externalApiCalled,
              realAIQAEnabled: true,
              validationPassed: false
            }
          },
          { status: 422 }
        );
      }

      const recommendationsOutput = isObject(parsedResult)
        ? parsedResult.recommendations
        : parsedResult;
      const validation = validateAIQARecommendations(
        recommendationsOutput,
        body.payload.processTasks.map((task) => task.stepId)
      );

      if (!validation.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: "AI QA output failed QARecommendation schema validation.",
            validationErrors: validation.errors,
            meta: {
              externalApiCalled: result.externalApiCalled,
              realAIQAEnabled: true,
              validationPassed: false
            }
          },
          { status: 422 }
        );
      }

      return NextResponse.json({
        ok: true,
        mode: "provider-backed",
        skillId,
        result: {
          recommendations: validation.recommendations
        },
        meta: {
          externalApiCalled: result.externalApiCalled,
          realAIQAEnabled: true,
          validationPassed: true
        }
      });
    } catch (error) {
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

  const enableRealAI = process.env.ENABLE_REAL_AI === "true";

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

  const providerName = process.env.AI_PROVIDER || "openai";

  if (providerName !== "openai") {
    return NextResponse.json(
      {
        ok: false,
        error: `Unsupported AI_PROVIDER: ${providerName}`
      },
      { status: 400 }
    );
  }

  try {
    const provider = createOpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY || "",
      model: process.env.AI_MODEL || ""
    });

    const aiRequest: AIModelRequest = {
      skillId,
      payload: briefValidation.value,
      messages: createPromptForInputBriefToPtr(briefValidation.value)
    };

    const result = await provider.run(aiRequest);
    let parsedResult: unknown;

    try {
      parsedResult = JSON.parse(extractJsonObject(result.content));
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "AI output was not valid JSON.",
          meta: {
            externalApiCalled: result.externalApiCalled,
            realAIEnabled: true,
            validationPassed: false
          }
        },
        { status: 422 }
      );
    }

    const draftValidation = validateDraftProcessTaskRegister(parsedResult);

    if (!draftValidation.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "AI output failed DraftProcessTaskRegister schema validation.",
          validationErrors: draftValidation.errors,
          meta: {
            externalApiCalled: result.externalApiCalled,
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
            externalApiCalled: result.externalApiCalled,
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

    return NextResponse.json({
      ok: true,
      mode: "provider-backed",
      skillId,
      result: {
        ...draftValidation.value,
        qualityGateWarnings
      },
      meta: {
        externalApiCalled: result.externalApiCalled,
        realAIEnabled: true,
        validationPassed: true,
        qualityGate: draftQualityGate
      }
    });
  } catch (error) {
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
