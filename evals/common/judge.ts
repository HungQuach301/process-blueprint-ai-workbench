export type JudgeScore = { score: 0 | 1 | 2; notes: string };

export type JudgeResult = {
  completeness: JudgeScore;
  domainTerms: JudgeScore;
  traceability: JudgeScore;
  safety: JudgeScore;
  overall: number;
  verdict: "pass" | "partial" | "fail";
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

function isValidVerdict(v: unknown): v is "pass" | "partial" | "fail" {
  return v === "pass" || v === "partial" || v === "fail";
}

function errorResult(notes: string): JudgeResult {
  const errScore: JudgeScore = { score: 0, notes };
  return {
    completeness: errScore,
    domainTerms: errScore,
    traceability: errScore,
    safety: errScore,
    overall: 0,
    verdict: "fail",
  };
}

export async function runJudge(params: RunJudgeInput): Promise<JudgeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return errorResult("ANTHROPIC_API_KEY is not set");
  }

  const model =
    process.env.CLAUDE_MODEL ?? "claude-haiku-4-5-20251001";

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

Score this OUTPUT using the rubric above. Return ONLY a JSON object matching this exact schema — no markdown, no prose:
{"completeness":{"score":0,"notes":""},"domainTerms":{"score":0,"notes":""},"traceability":{"score":0,"notes":""},"safety":{"score":0,"notes":""},"overall":0.0,"verdict":"fail"}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
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
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return errorResult(
      `API error ${response.status}: ${text.slice(0, 200)}`
    );
  }

  const rawJson = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
  };

  if (
    !Array.isArray(rawJson.content) ||
    rawJson.content.length === 0 ||
    rawJson.content[0].type !== "text"
  ) {
    return errorResult(
      `Unexpected content shape: ${JSON.stringify(rawJson.content).slice(0, 120)}`
    );
  }

  const rawText: string = rawJson.content[0].text;

  // Strip whitespace and optional ```json fences
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  cleaned = cleaned.trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResult(`JSON.parse failed: ${msg}. Raw: ${cleaned.slice(0, 120)}`);
  }

  if (typeof parsed !== "object" || parsed === null) {
    return errorResult("Parsed result is not an object");
  }

  const obj = parsed as Record<string, unknown>;

  if (!isValidJudgeScore(obj.completeness)) {
    return errorResult("Invalid or missing 'completeness' axis");
  }
  if (!isValidJudgeScore(obj.domainTerms)) {
    return errorResult("Invalid or missing 'domainTerms' axis");
  }
  if (!isValidJudgeScore(obj.traceability)) {
    return errorResult("Invalid or missing 'traceability' axis");
  }
  if (!isValidJudgeScore(obj.safety)) {
    return errorResult("Invalid or missing 'safety' axis");
  }
  if (typeof obj.overall !== "number") {
    return errorResult("Invalid or missing 'overall' field");
  }
  if (!isValidVerdict(obj.verdict)) {
    return errorResult("Invalid or missing 'verdict' field");
  }

  return {
    completeness: obj.completeness,
    domainTerms: obj.domainTerms,
    traceability: obj.traceability,
    safety: obj.safety,
    overall: obj.overall,
    verdict: obj.verdict,
  };
}
