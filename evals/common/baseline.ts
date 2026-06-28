import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { runJudge, JUDGE_VERSION, type JudgeResult } from "./judge.js";

// ---------------------------------------------------------------------------
// Skill config map
// ---------------------------------------------------------------------------

const SKILLS = {
  "input-brief-to-ptr": {
    folder: "input-brief-to-ptr",
    skillId: "input-brief-to-ptr",
  },
  "process-improvement-recommendation": {
    folder: "process-improvement-recommendation",
    skillId: "process-improvement-recommendation",
  },
  "artifact-review": {
    folder: "artifact-review",
    skillId: "artifact-review",
  },
} as const;
type SkillKey = keyof typeof SKILLS;

// ---------------------------------------------------------------------------
// API constants
// ---------------------------------------------------------------------------

const API_URL =
  process.env.EVAL_API_URL ?? "http://localhost:3000/api/ai/run-skill";
const PROVIDER_ID = process.env.EVAL_PROVIDER_ID ?? process.env.AI_PROVIDER ?? "openai";
const CASE_TIMEOUT_MS = 60_000;
const WAIT_BETWEEN_CASES_MS = 2_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DatasetCase = {
  id: string;
  name: string;
  input: unknown;
  [key: string]: unknown;
};

type CaseRecord = {
  id: string;
  input: unknown;
  output: unknown;
  verdict: "pass" | "partial" | "fail" | "error";
  overall: number;
  judgeNotes: {
    completeness: string;
    domainTerms: string;
    traceability: string;
    safety: string;
  };
};

// ---------------------------------------------------------------------------
// Degraded-provider detection
// ---------------------------------------------------------------------------

class DegradedProviderError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "DegradedProviderError";
  }
}

function detectDegraded(responseJson: unknown, result: unknown): string | null {
  if (responseJson && typeof responseJson === "object") {
    const resp = responseJson as Record<string, unknown>;

    // Check meta fields
    if (resp.meta && typeof resp.meta === "object") {
      const meta = resp.meta as Record<string, unknown>;
      if (meta.externalApiCalled === false) {
        return "meta.externalApiCalled is false";
      }
      if (typeof meta.provider === "string" && meta.provider.toLowerCase().includes("mock")) {
        return `meta.provider is "${meta.provider}"`;
      }
      if (typeof meta.mode === "string" && meta.mode.toLowerCase().includes("mock")) {
        return `meta.mode is "${meta.mode}"`;
      }
    }

    // Check top-level provider/mode
    if (typeof resp.provider === "string" && resp.provider.toLowerCase().includes("mock")) {
      return `response.provider is "${resp.provider}"`;
    }
    if (typeof resp.mode === "string" && resp.mode.toLowerCase().includes("mock")) {
      return `response.mode is "${resp.mode}"`;
    }
  }

  // Check output content
  if (JSON.stringify(result).includes("local mock")) {
    return 'output contains "local mock"';
  }

  // Check sourceRef
  if (result && typeof result === "object") {
    const r = result as Record<string, unknown>;
    if (typeof r.sourceRef === "string" && r.sourceRef.toLowerCase().includes("mock")) {
      return `sourceRef is "${r.sourceRef}"`;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// callSkill
// ---------------------------------------------------------------------------

async function callSkill(skillId: string, input: unknown): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CASE_TIMEOUT_MS);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skillId, providerId: PROVIDER_ID, payload: input }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => undefined);
      throw new Error(
        "API error HTTP " +
          response.status +
          ": " +
          JSON.stringify(errBody).slice(0, 200)
      );
    }

    const responseJson = await response.json();
    const result = responseJson.result;
    const degradedReason = detectDegraded(responseJson, result);
    if (degradedReason) {
      throw new DegradedProviderError(degradedReason);
    }
    return result;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// runSkillForCase
// ---------------------------------------------------------------------------

async function runSkillForCase(
  skillId: string,
  caseItem: DatasetCase
): Promise<{ output: unknown; error?: string }> {
  try {
    const output = await callSkill(skillId, caseItem.input);
    return { output };
  } catch (err) {
    if (err instanceof DegradedProviderError) throw err;
    const error = err instanceof Error ? err.message : String(err);
    return { output: null, error };
  }
}

// ---------------------------------------------------------------------------
// sleep
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// runBaseline
// ---------------------------------------------------------------------------

async function runBaseline(skillKey: SkillKey): Promise<void> {
  const config = SKILLS[skillKey];

  const rubricMarkdown = readFileSync(
    path.resolve("evals/datasets", config.folder, "v1/rubric.md"),
    "utf8"
  );

  const cases = JSON.parse(
    readFileSync(
      path.resolve("evals/datasets", config.folder, "v1/dataset.json"),
      "utf8"
    )
  ) as DatasetCase[];

  const n = cases.length;

  if (n === 0) {
    console.error(`Dataset is empty: evals/datasets/${config.folder}/v1/dataset.json`);
    process.exit(1);
  }

  console.log(`Skill: ${config.skillId}  Dataset: ${config.folder}/v1  Cases: ${n}`);
  console.log(`Estimated API calls: ${n} skill + ${n} judge = ${2 * n} total`);
  console.log(`API: ${API_URL}`);
  console.log("Press Ctrl+C to abort.");

  const caseRecords: CaseRecord[] = [];

  for (let i = 0; i < cases.length; i++) {
    const caseItem = cases[i];
    let skillResult: { output: unknown; error?: string };
    try {
      skillResult = await runSkillForCase(config.skillId, caseItem);
    } catch (err) {
      if (err instanceof DegradedProviderError) {
        console.error(`\n[ABORT] case "${caseItem.id}": ${err.message}`);
        console.error("Refusing to write baseline.json — mock/degraded output detected.");
        process.exit(1);
      }
      throw err;
    }
    const { output, error } = skillResult;

    let judgeResult: JudgeResult;

    if (error !== undefined) {
      judgeResult = {
        completeness: { score: 0, notes: error.slice(0, 120) },
        domainTerms: { score: 0, notes: "" },
        traceability: { score: 0, notes: "" },
        safety: { score: 0, notes: "" },
        overall: 0,
        verdict: "error" as const,
      };
    } else {
      judgeResult = await runJudge({
        rubricMarkdown,
        input: caseItem.input,
        output,
      });
    }

    caseRecords.push({
      id: caseItem.id,
      input: caseItem.input,
      output: error !== undefined ? null : output,
      verdict: judgeResult.verdict,
      overall: judgeResult.overall,
      judgeNotes: {
        completeness: judgeResult.completeness.notes,
        domainTerms: judgeResult.domainTerms.notes,
        traceability: judgeResult.traceability.notes,
        safety: judgeResult.safety.notes,
      },
    });

    console.log(
      `[${judgeResult.verdict}] ${caseItem.id} — overall: ${judgeResult.overall.toFixed(2)}`
    );

    if (i < cases.length - 1) {
      await sleep(WAIT_BETWEEN_CASES_MS);
    }
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------

  const pass = caseRecords.filter((r) => r.verdict === "pass").length;
  const partial = caseRecords.filter((r) => r.verdict === "partial").length;
  const fail = caseRecords.filter((r) => r.verdict === "fail").length;
  const error = caseRecords.filter((r) => r.verdict === "error").length;
  const measured = n - error;

  const passRate = measured > 0 ? Math.round((pass / measured) * 100) / 100 : 0;
  const measuredRecords = caseRecords.filter((r) => r.verdict !== "error");
  const avgOverall =
    measured > 0
      ? Math.round(
          (measuredRecords.reduce((sum, r) => sum + r.overall, 0) / measured) * 100
        ) / 100
      : 0;

  // -------------------------------------------------------------------------
  // Build and write baseline JSON
  // -------------------------------------------------------------------------

  const baseline = {
    skillId: config.skillId,
    datasetVersion: "v1",
    judgeVersion: JUDGE_VERSION,
    judgeModel: process.env.CLAUDE_MODEL ?? "claude-haiku-4-5-20251001",
    skillProvider: process.env.AI_PROVIDER ?? "unknown",
    skillModel: process.env.OPENAI_MODEL ?? "unknown",
    generatedAt: new Date().toISOString(),
    summary: { pass, partial, fail, error, passRate, avgOverall },
    cases: caseRecords,
  };

  const outPath = path.resolve(
    "evals/datasets",
    config.folder,
    "v1/baseline.json"
  );
  writeFileSync(outPath, JSON.stringify(baseline, null, 2) + "\n");

  console.log(
    `Baseline written → evals/datasets/${config.folder}/v1/baseline.json`
  );
  console.log(
    `Summary: pass=${pass} partial=${partial} fail=${fail} passRate=${passRate} avgOverall=${avgOverall}`
  );
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const arg = process.argv[2];

  if (!arg) {
    console.log("Usage:");
    console.log("  npm run eval:baseline -- <skill-folder>");
    console.log("  npm run eval:baseline -- all");
    console.log("");
    console.log("Skills:", Object.keys(SKILLS).join(", "));
    process.exit(0);
  }

  if (PROVIDER_ID === "mock") {
    console.error("Refusing to build a baseline with the mock provider.");
    console.error("Set EVAL_PROVIDER_ID or AI_PROVIDER to a real provider.");
    process.exit(1);
  }

  if (arg === "all") {
    for (const key of Object.keys(SKILLS) as SkillKey[]) {
      await runBaseline(key);
      console.log("");
    }
    return;
  }

  if (!(arg in SKILLS)) {
    console.error(
      `Unknown skill folder: "${arg}". Valid options: ${Object.keys(SKILLS).join(", ")}, all`
    );
    process.exit(1);
  }

  await runBaseline(arg as SkillKey);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
