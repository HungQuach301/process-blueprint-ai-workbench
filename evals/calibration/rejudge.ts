import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { runJudge, JUDGE_VERSION_V2 } from "../common/judge.js";

// ---------------------------------------------------------------------------
// Skill config
// ---------------------------------------------------------------------------

const SKILLS = [
  "input-brief-to-ptr",
  "process-improvement-recommendation",
  "artifact-review",
] as const;
type SkillKey = (typeof SKILLS)[number];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type JudgeNotes = {
  completeness: string;
  domainTerms: string;
  traceability: string;
  safety: string;
};

type CaseRecord = {
  id: string;
  input: unknown;
  output: unknown;
  verdict: "pass" | "partial" | "fail" | "error";
  overall: number;
  judgeNotes: JudgeNotes;
  [key: string]: unknown;
};

type BaselineFile = {
  skillId: string;
  datasetVersion: string;
  judgeVersion: string;
  judgeModel: string;
  skillProvider: string;
  skillModel: string;
  generatedAt: string;
  summary: {
    pass: number;
    partial: number;
    fail: number;
    error?: number;
    passRate: number;
    avgOverall: number;
  };
  cases: CaseRecord[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// rejudgeSkill
// ---------------------------------------------------------------------------

async function rejudgeSkill(skillKey: SkillKey): Promise<void> {
  const baselinePath = path.resolve(
    "evals/datasets",
    skillKey,
    "v1/baseline.json"
  );
  const rubricPath = path.resolve(
    "evals/datasets",
    skillKey,
    "v1/rubric.md"
  );

  const rubricMarkdown = readFileSync(rubricPath, "utf8");
  const baseline: BaselineFile = JSON.parse(
    readFileSync(baselinePath, "utf8")
  );

  const cases = baseline.cases;
  const n = cases.length;

  if (n === 0) {
    console.error(`[rejudge] ERROR: baseline.cases is empty for skill "${skillKey}" — nothing to rejudge.`);
    process.exit(1);
  }

  console.log(`\nSkill: ${skillKey}  Cases: ${n}`);

  const updatedCases: CaseRecord[] = [];

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];

    const judgeResult = await runJudge({
      rubricMarkdown,
      input: c.input,
      output: c.output,
    });

    const updated: CaseRecord = {
      ...c,
      verdict: judgeResult.verdict,
      overall: judgeResult.overall,
      judgeNotes: {
        completeness: judgeResult.completeness.notes,
        domainTerms: judgeResult.domainTerms.notes,
        traceability: judgeResult.traceability.notes,
        safety: judgeResult.safety.notes,
      },
    };

    updatedCases.push(updated);

    console.log(
      `[${judgeResult.verdict}] ${c.id} — overall: ${judgeResult.overall.toFixed(2)}`
    );

    if (i < cases.length - 1) {
      await sleep(1_000);
    }
  }

  // -------------------------------------------------------------------------
  // Recompute summary
  // -------------------------------------------------------------------------

  const error = updatedCases.filter((r) => r.verdict === "error").length;
  const measuredCases = updatedCases.filter((r) => r.verdict !== "error");
  const pass = measuredCases.filter((r) => r.verdict === "pass").length;
  const partial = measuredCases.filter((r) => r.verdict === "partial").length;
  const fail = measuredCases.filter((r) => r.verdict === "fail").length;
  const measured = measuredCases.length;
  const passRate =
    measured > 0 ? Math.round((pass / measured) * 100) / 100 : 0;
  const avgOverall =
    measured > 0
      ? Math.round(
          (measuredCases.reduce((sum, r) => sum + r.overall, 0) / measured) *
            100
        ) / 100
      : 0;

  // -------------------------------------------------------------------------
  // Write updated baseline
  // -------------------------------------------------------------------------

  const updated: BaselineFile = {
    ...baseline,
    judgeVersion: JUDGE_VERSION_V2,
    judgeModel: process.env.CLAUDE_MODEL ?? "claude-haiku-4-5-20251001",
    generatedAt: new Date().toISOString(),
    summary: { pass, partial, fail, error, passRate, avgOverall },
    cases: updatedCases,
  };

  writeFileSync(baselinePath, JSON.stringify(updated, null, 2) + "\n");

  console.log(
    `Summary: pass=${pass} partial=${partial} fail=${fail} error=${error} passRate=${passRate} avgOverall=${avgOverall}`
  );
  console.log(`Baseline updated → evals/datasets/${skillKey}/v1/baseline.json`);
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ERROR: ANTHROPIC_API_KEY is not set. Load it via --env-file=.env.local.");
    process.exit(1);
  }

  const arg = process.argv[2] as SkillKey | undefined;

  if (arg !== undefined && !SKILLS.includes(arg)) {
    console.error(
      `Unknown skill: "${arg}". Valid options: ${SKILLS.join(", ")}`
    );
    process.exit(1);
  }

  const targets: SkillKey[] = arg ? [arg] : [...SKILLS];

  for (const skill of targets) {
    await rejudgeSkill(skill);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
