import { NextResponse } from "next/server";
import {
  createOpenAIProvider,
  type AIModelRequest
} from "@/lib/ai/providers/openai-provider";

export const runtime = "nodejs";

type RunSkillRequestBody = {
  skillId?: unknown;
  payload?: unknown;
};

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

function createMockResponse(skillId: string, payload: unknown) {
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
      realAIEnabled: false
    }
  };
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
  const enableRealAI = process.env.ENABLE_REAL_AI === "true";

  if (!enableRealAI) {
    return NextResponse.json(createMockResponse(skillId, body.payload));
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
      payload: body.payload
    };

    const result = await provider.run(aiRequest);

    return NextResponse.json({
      ok: true,
      mode: "provider-backed",
      skillId,
      result,
      meta: {
        externalApiCalled: result.externalApiCalled,
        realAIEnabled: true
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
