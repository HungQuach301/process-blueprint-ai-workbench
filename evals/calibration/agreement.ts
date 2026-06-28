import * as fs from "fs";
import * as path from "path";

// Usage: npx tsx evals/calibration/agreement.ts [labels.json path]
const labelsPath =
  process.argv[2] ?? path.resolve(__dirname, "labels.json");
const DATASETS_DIR = path.resolve(__dirname, "..", "datasets");
const SKILLS = [
  "input-brief-to-ptr",
  "process-improvement-recommendation",
  "artifact-review",
] as const;

const VERDICT_SCORE: Record<string, number> = { fail: 0, partial: 1, pass: 2 };
const VERDICT_ORDER = ["fail", "partial", "pass"] as const;
type Verdict = (typeof VERDICT_ORDER)[number];

// ── Types ──────────────────────────────────────────────────────────────────────
type LabelEntry = {
  skillId: string;
  caseId: string;
  humanVerdict: string;
  notes?: string;
};

type BaselineCase = {
  id: string;
  verdict: string;
  [key: string]: unknown;
};

type BaselineFile = {
  skillId: string;
  judgeVersion: string;
  judgeModel: string;
  generatedAt: string;
  cases: BaselineCase[];
};

// ── Read labels ────────────────────────────────────────────────────────────────
if (!fs.existsSync(labelsPath)) {
  console.error(`[agreement] ERROR: labels file not found at ${labelsPath}`);
  console.error("Usage: npx tsx evals/calibration/agreement.ts [labels.json]");
  process.exit(1);
}

const labels: LabelEntry[] = JSON.parse(fs.readFileSync(labelsPath, "utf8"));

if (labels.length === 0) {
  console.error("[agreement] ERROR: labels.json is empty — nothing to compute.");
  process.exit(1);
}

// ── Read baselines ─────────────────────────────────────────────────────────────
type JudgeMap = Map<string, string>; // key = "skillId|caseId" → judgeVerdict
const judgeMap: JudgeMap = new Map();
let totalCases = 0;

let judgeVersion = "";
let judgeModel = "";
let generatedAt = "";
let firstMeta = true;

for (const skill of SKILLS) {
  const baselinePath = path.join(DATASETS_DIR, skill, "v1", "baseline.json");
  if (!fs.existsSync(baselinePath)) {
    console.error(`[agreement] ERROR: baseline not found at ${baselinePath}`);
    process.exit(1);
  }
  const baseline: BaselineFile = JSON.parse(
    fs.readFileSync(baselinePath, "utf8")
  );

  if (firstMeta) {
    judgeVersion = baseline.judgeVersion ?? "";
    judgeModel = baseline.judgeModel ?? "";
    generatedAt = baseline.generatedAt ?? "";
    firstMeta = false;
  }

  for (const c of baseline.cases) {
    judgeMap.set(`${skill}|${c.id}`, c.verdict);
    totalCases++;
  }
}

// ── Join & compute ─────────────────────────────────────────────────────────────
type JoinedEntry = {
  skillId: string;
  caseId: string;
  humanVerdict: string;
  judgeVerdict: string;
};

const joined: JoinedEntry[] = [];
let errorCount = 0;
for (const lbl of labels) {
  const key = `${lbl.skillId}|${lbl.caseId}`;
  const judgeVerdict = judgeMap.get(key);
  if (!judgeVerdict) {
    // Case not found in baseline — skip but warn
    console.warn(`[agreement] WARN: no baseline found for ${key}`);
    continue;
  }
  if (judgeVerdict === "error") {
    errorCount++;
    continue;
  }
  const normalizedHuman = lbl.humanVerdict.toLowerCase().trim();
  if (!VERDICT_ORDER.includes(normalizedHuman as Verdict)) {
    console.warn(`[agreement] WARN: unrecognised humanVerdict "${lbl.humanVerdict}" for ${key} — skipping`);
    continue;
  }
  joined.push({
    skillId: lbl.skillId,
    caseId: lbl.caseId,
    humanVerdict: normalizedHuman,
    judgeVerdict,
  });
}

const totalLabeled = joined.length;
const matches = joined.filter((j) => j.humanVerdict === j.judgeVerdict).length;
const matchRate = totalLabeled > 0 ? matches / totalLabeled : 0;

// Per-skill
const perSkill: Record<string, { match: number; total: number }> = {};
for (const skill of SKILLS) {
  perSkill[skill] = { match: 0, total: 0 };
}
for (const j of joined) {
  if (perSkill[j.skillId] === undefined) {
    perSkill[j.skillId] = { match: 0, total: 0 };
  }
  perSkill[j.skillId].total++;
  if (j.humanVerdict === j.judgeVerdict) perSkill[j.skillId].match++;
}

// Confusion matrix: rows=human, cols=judge
const confusion: Record<Verdict, Record<Verdict, number>> = {
  fail: { fail: 0, partial: 0, pass: 0 },
  partial: { fail: 0, partial: 0, pass: 0 },
  pass: { fail: 0, partial: 0, pass: 0 },
};

for (const j of joined) {
  const hv = j.humanVerdict as Verdict;
  const jv = j.judgeVerdict as Verdict;
  if (VERDICT_ORDER.includes(hv) && VERDICT_ORDER.includes(jv)) {
    confusion[hv][jv]++;
  }
}

// Mean absolute deviation
let madSum = 0;
for (const j of joined) {
  const hScore = VERDICT_SCORE[j.humanVerdict] ?? 0;
  const jScore = VERDICT_SCORE[j.judgeVerdict] ?? 0;
  madSum += Math.abs(hScore - jScore);
}
const mad = totalLabeled > 0 ? madSum / totalLabeled : 0;

// ── Print report ───────────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
const flagLine =
  matchRate >= 0.8
    ? `[ĐẠT] Tỉ lệ khớp ${(matchRate * 100).toFixed(1)}% ≥ 80% — rubric/judge aligned.`
    : `[CẢNH BÁO] Tỉ lệ khớp ${(matchRate * 100).toFixed(1)}% < 80% — rubric/judge cần chỉnh.`;

console.log("=== Calibration Agreement Report ===");
console.log(`Date: ${today}`);
console.log(`Judge version: ${judgeVersion} | Model: ${judgeModel}`);
console.log(`(Baselines generated: ${generatedAt})`);
console.log();
console.log(`Cases labeled: ${totalLabeled} / ${totalCases}`);
console.log(`Measurement errors (excluded): ${errorCount}`);
console.log();
console.log(`Overall match rate: ${matchRate.toFixed(2)}`);
console.log();
console.log("Per-skill match:");
for (const skill of SKILLS) {
  const s = perSkill[skill] ?? { match: 0, total: 0 };
  const rate = s.total > 0 ? (s.match / s.total).toFixed(2) : "—";
  const labeled = s.total < 10 ? ` (${s.match}/${s.total} labeled)` : ` (${s.match}/${s.total})`;
  console.log(`  ${skill.padEnd(40)}: ${rate}${labeled}`);
}
console.log();
console.log("Confusion matrix (rows=human, cols=judge):");
const colW = 8;
const header = "              " + VERDICT_ORDER.map((v) => v.padStart(colW)).join("");
console.log(header);
for (const hv of VERDICT_ORDER) {
  const row =
    ("human " + hv).padEnd(14) +
    VERDICT_ORDER.map((jv) => String(confusion[hv][jv]).padStart(colW)).join("");
  console.log(row);
}
console.log();
console.log(`Mean absolute deviation: ${mad.toFixed(2)}`);
console.log();
console.log(`Flag: ${flagLine}`);
