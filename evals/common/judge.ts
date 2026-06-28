export type JudgeScore = { score: 0 | 1 | 2; notes: string };

export type JudgeResult = {
  completeness: JudgeScore;
  domainTerms: JudgeScore;
  traceability: JudgeScore;
  safety: JudgeScore;
  overall: number;
  verdict: "pass" | "partial" | "fail" | "error";
};

export type RunJudgeInput = {
  rubricMarkdown: string;
  input: unknown;
  output: unknown;
};

export const JUDGE_VERSION = "v1";
export const JUDGE_VERSION_V2 = "v2";

function isValidScore(v: unknown): v is 0 | 1 | 2 {
  return v === 0 || v === 1 || v === 2;
}

function isValidJudgeScore(v: unknown): v is JudgeScore {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  return isValidScore(obj.score) && typeof obj.notes === "string";
}

function errorResult(notes: string): JudgeResult {
  const errScore: JudgeScore = { score: 0, notes };
  return {
    completeness: errScore,
    domainTerms: errScore,
    traceability: errScore,
    safety: errScore,
    overall: 0,
    verdict: "error",
  };
}

const SUBMIT_VERDICT_TOOL = {
  name: "submit_verdict",
  description: "Submit rubric scores for the evaluated output.",
  input_schema: {
    type: "object",
    properties: {
      completeness: {
        type: "object",
        properties: {
          score: { type: "integer", enum: [0, 1, 2] },
          notes: { type: "string" },
        },
        required: ["score", "notes"],
      },
      domainTerms: {
        type: "object",
        properties: {
          score: { type: "integer", enum: [0, 1, 2] },
          notes: { type: "string" },
        },
        required: ["score", "notes"],
      },
      traceability: {
        type: "object",
        properties: {
          score: { type: "integer", enum: [0, 1, 2] },
          notes: { type: "string" },
        },
        required: ["score", "notes"],
      },
      safety: {
        type: "object",
        properties: {
          score: { type: "integer", enum: [0, 1, 2] },
          notes: { type: "string" },
        },
        required: ["score", "notes"],
      },
    },
    required: ["completeness", "domainTerms", "traceability", "safety"],
  },
};

function computeFromScores(
  c: JudgeScore,
  d: JudgeScore,
  t: JudgeScore,
  s: JudgeScore
): { overall: number; verdict: "pass" | "partial" | "fail" } {
  const overall = (c.score + d.score + t.score + s.score) / 8;
  const verdict: "pass" | "partial" | "fail" =
    overall >= 0.75 ? "pass" : overall >= 0.5 ? "partial" : "fail";
  return { overall, verdict };
}

async function callOnce(
  apiKey: string,
  model: string,
  userContent: string
): Promise<JudgeResult | null> {
  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        temperature: 0,
        tools: [SUBMIT_VERDICT_TOOL],
        tool_choice: { type: "tool", name: "submit_verdict" },
        messages: [{ role: "user", content: userContent }],
      }),
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const rawJson = (await response.json()) as {
    content: Array<{ type: string; name?: string; input?: unknown }>;
  };

  const toolBlock = Array.isArray(rawJson.content)
    ? rawJson.content.find(
        (b) => b.type === "tool_use" && b.name === "submit_verdict"
      )
    : undefined;

  if (!toolBlock) {
    return null;
  }

  const inp = toolBlock.input as Record<string, unknown> | undefined;
  if (!inp) return null;

  if (!isValidJudgeScore(inp.completeness)) return null;
  if (!isValidJudgeScore(inp.domainTerms)) return null;
  if (!isValidJudgeScore(inp.traceability)) return null;
  if (!isValidJudgeScore(inp.safety)) return null;

  const { overall, verdict } = computeFromScores(
    inp.completeness,
    inp.domainTerms,
    inp.traceability,
    inp.safety
  );

  return {
    completeness: inp.completeness,
    domainTerms: inp.domainTerms,
    traceability: inp.traceability,
    safety: inp.safety,
    overall,
    verdict,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runJudge(params: RunJudgeInput): Promise<JudgeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return errorResult("ANTHROPIC_API_KEY is not set");
  }

  const model = process.env.CLAUDE_MODEL ?? "claude-haiku-4-5-20251001";

  const { rubricMarkdown, input, output } = params;

  const userContent = `<rubric>
${rubricMarkdown}
</rubric>

<INPUT>
${JSON.stringify(input, null, 2)}
</INPUT>

<OUTPUT>
${JSON.stringify(output, null, 2)}
</OUTPUT>

Score this OUTPUT using the rubric. Call the submit_verdict tool with your scores.`;

  const first = await callOnce(apiKey, model, userContent);
  if (first !== null) return first;

  await sleep(1_000);

  const second = await callOnce(apiKey, model, userContent);
  if (second !== null) return second;

  return errorResult("No valid tool_use block after 2 attempts");
}
