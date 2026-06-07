import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type ExpectedCriteria = {
  hasArtifactWarningsOrRecommendations?: boolean;
  noDirectXmlPatch?: boolean;
  templateRecommendationsValidShape?: boolean;
  ptrRecommendationsValidShape?: boolean;
  reviewOnlyBehavior?: boolean;
};

type EvalCase = {
  id: string;
  name: string;
  description: string;
  input: unknown;
  expectedCriteria: ExpectedCriteria;
};

type EvalStatus = "PASS" | "PARTIAL" | "FAIL";

type EvalResult = {
  id: string;
  name: string;
  status: EvalStatus;
  passedCriteria: number;
  totalCriteria: number;
  missingCriteria: string[];
  error?: string;
  warningCount?: number;
  ptrRecommendationCount?: number;
  templateRecommendationCount?: number;
};

const API_URL =
  process.env.EVAL_API_URL || "http://localhost:3000/api/ai/run-skill";
const PROVIDER_ID = process.env.EVAL_PROVIDER_ID || "mock";
const CASE_TIMEOUT_MS = 60000;
const WAIT_BETWEEN_CASES_MS = 2000;
const PASS_RATE_THRESHOLD = 0.6;

const FORBIDDEN_XML_FIELDS = new Set([
  "xml",
  "artifactXml",
  "bpmnXml",
  "drawioXml",
  "patchedXml",
  "replacementXml",
  "generatedXml",
  "xmlPatch"
]);

const SUPPORTED_OPERATION_KINDS = new Set([
  "UpdateTaskField",
  "CreateTaskAfter",
  "CreateTaskBefore",
  "InsertTaskBetween",
  "SplitTask",
  "CreateGateway",
  "AddGatewayBranch",
  "UpdateConnection",
  "CreateLane",
  "AssignActor",
  "AssignSystem",
  "SetInteractionType",
  "MarkReviewStatus"
]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function countCriteria(criteria: ExpectedCriteria) {
  return Object.keys(criteria).length;
}

function getResultPayload(responseJson: unknown) {
  return isObject(responseJson) ? responseJson.result : undefined;
}

function getArrayField(value: unknown, field: string) {
  return isObject(value) && Array.isArray(value[field])
    ? value[field].filter(isObject)
    : [];
}

function getStringArrayField(value: unknown, field: string) {
  return isObject(value) && Array.isArray(value[field])
    ? value[field].filter((item): item is string => typeof item === "string")
    : [];
}

function getInputStepIds(input: unknown) {
  if (!isObject(input) || !Array.isArray(input.processTasks)) {
    return new Set<string>();
  }

  return new Set(
    input.processTasks
      .filter(isObject)
      .map((task) => task.stepId)
      .filter((stepId): stepId is string => typeof stepId === "string")
  );
}

function getSelectedTemplateId(input: unknown) {
  if (!isObject(input) || !isObject(input.selectedTemplate)) {
    return "";
  }

  return typeof input.selectedTemplate.id === "string"
    ? input.selectedTemplate.id
    : "";
}

function hasForbiddenXmlField(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(hasForbiddenXmlField);
  }

  if (!isObject(value)) {
    return false;
  }

  return Object.entries(value).some(
    ([key, nestedValue]) =>
      FORBIDDEN_XML_FIELDS.has(key) || hasForbiddenXmlField(nestedValue)
  );
}

function getOperations(recommendation: Record<string, unknown>) {
  return Array.isArray(recommendation.operations)
    ? recommendation.operations.filter(isObject)
    : [];
}

function ptrRecommendationsValid(
  recommendations: Array<Record<string, unknown>>,
  input: unknown
) {
  const validStepIds = getInputStepIds(input);

  return recommendations.every(
    (recommendation) =>
      typeof recommendation.title === "string" &&
      typeof recommendation.description === "string" &&
      typeof recommendation.previewText === "string" &&
      recommendation.requiresConfirmation === true &&
      (recommendation.riskLevel === "low" ||
        recommendation.riskLevel === "medium" ||
        recommendation.riskLevel === "high") &&
      Array.isArray(recommendation.targetStepIds) &&
      recommendation.targetStepIds.length > 0 &&
      recommendation.targetStepIds.every(
        (stepId) => typeof stepId === "string" && validStepIds.has(stepId)
      ) &&
      getOperations(recommendation).every(
        (operation) =>
          typeof operation.kind === "string" &&
          SUPPORTED_OPERATION_KINDS.has(operation.kind)
      )
  );
}

function templateRecommendationsValid(
  recommendations: Array<Record<string, unknown>>,
  input: unknown
) {
  const selectedTemplateId = getSelectedTemplateId(input);

  return recommendations.every(
    (recommendation) =>
      recommendation.templateId === selectedTemplateId &&
      recommendation.source === "ai" &&
      typeof recommendation.title === "string" &&
      typeof recommendation.description === "string" &&
      recommendation.requiresConfirmation === true &&
      Array.isArray(recommendation.affectedFields) &&
      recommendation.affectedFields.every((field) => typeof field === "string")
  );
}

function evaluateCriteria(
  criteria: ExpectedCriteria,
  resultPayload: unknown,
  input: unknown
) {
  const ptrRecommendations = getArrayField(resultPayload, "recommendations");
  const templateRecommendations = getArrayField(
    resultPayload,
    "templateRecommendations"
  );
  const warnings = [
    ...getStringArrayField(resultPayload, "warnings"),
    ...getStringArrayField(resultPayload, "artifactWarnings")
  ];
  const hasReviewOutput =
    warnings.length > 0 ||
    ptrRecommendations.length > 0 ||
    templateRecommendations.length > 0;
  const checks: Record<keyof ExpectedCriteria, boolean> = {
    hasArtifactWarningsOrRecommendations:
      criteria.hasArtifactWarningsOrRecommendations === undefined ||
      hasReviewOutput === criteria.hasArtifactWarningsOrRecommendations,
    noDirectXmlPatch:
      criteria.noDirectXmlPatch === undefined ||
      !hasForbiddenXmlField(resultPayload) === criteria.noDirectXmlPatch,
    templateRecommendationsValidShape:
      criteria.templateRecommendationsValidShape === undefined ||
      templateRecommendationsValid(templateRecommendations, input) ===
        criteria.templateRecommendationsValidShape,
    ptrRecommendationsValidShape:
      criteria.ptrRecommendationsValidShape === undefined ||
      ptrRecommendationsValid(ptrRecommendations, input) ===
        criteria.ptrRecommendationsValidShape,
    reviewOnlyBehavior:
      criteria.reviewOnlyBehavior === undefined ||
      (!hasForbiddenXmlField(resultPayload) &&
        [...ptrRecommendations, ...templateRecommendations].every(
          (recommendation) => recommendation.requiresConfirmation === true
        )) === criteria.reviewOnlyBehavior
  };
  const missingCriteria = (Object.keys(criteria) as Array<keyof ExpectedCriteria>)
    .filter((key) => !checks[key]);

  return {
    missingCriteria,
    passedCriteria: countCriteria(criteria) - missingCriteria.length,
    totalCriteria: countCriteria(criteria),
    warningCount: warnings.length,
    ptrRecommendationCount: ptrRecommendations.length,
    templateRecommendationCount: templateRecommendations.length
  };
}

async function postWithTimeout(testCase: EvalCase) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CASE_TIMEOUT_MS);

  try {
    return await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        skillId: "artifact-review",
        providerId: PROVIDER_ID,
        payload: testCase.input
      }),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function getApiError(responseJson: unknown, status: number) {
  if (!isObject(responseJson)) {
    return `HTTP ${status}`;
  }

  const error = typeof responseJson.error === "string" ? responseJson.error : "";
  const validationErrors = Array.isArray(responseJson.validationErrors)
    ? ` ${responseJson.validationErrors.join("; ")}`
    : "";

  return `${error || `HTTP ${status}`}${validationErrors}`.trim();
}

async function runCase(testCase: EvalCase): Promise<EvalResult> {
  try {
    const response = await postWithTimeout(testCase);
    const responseJson = await response.json().catch(() => undefined);

    if (!response.ok) {
      return {
        id: testCase.id,
        name: testCase.name,
        status: "FAIL",
        passedCriteria: 0,
        totalCriteria: countCriteria(testCase.expectedCriteria),
        missingCriteria: Object.keys(testCase.expectedCriteria),
        error: `API error: ${getApiError(responseJson, response.status)}`
      };
    }

    const criteriaResult = evaluateCriteria(
      testCase.expectedCriteria,
      getResultPayload(responseJson),
      testCase.input
    );

    return {
      id: testCase.id,
      name: testCase.name,
      status: criteriaResult.missingCriteria.length === 0 ? "PASS" : "PARTIAL",
      ...criteriaResult
    };
  } catch (error) {
    return {
      id: testCase.id,
      name: testCase.name,
      status: "FAIL",
      passedCriteria: 0,
      totalCriteria: countCriteria(testCase.expectedCriteria),
      missingCriteria: Object.keys(testCase.expectedCriteria),
      error:
        error instanceof Error
          ? `API error: ${error.message}`
          : "API error: request failed"
    };
  }
}

function printCaseResult(result: EvalResult) {
  const label = `[${result.status}] ${result.id} ${result.name}`;

  if (result.status === "FAIL") {
    console.log(`${label} (${result.error || "API error"})`);
    return;
  }

  const score = `(${result.passedCriteria}/${result.totalCriteria} criteria`;
  const missing = result.missingCriteria.length
    ? ` - missing: ${result.missingCriteria.join(", ")}`
    : "";
  console.log(`${label} ${score}${missing})`);
}

function printSummary(results: EvalResult[]) {
  const total = results.length;
  const count = (status: EvalStatus) =>
    results.filter((result) => result.status === status).length;
  const percent = (value: number) => Math.round((value / total) * 100);

  console.log("");
  console.log(`Total: ${total} cases`);
  console.log(`Pass: ${count("PASS")} (${percent(count("PASS"))}%)`);
  console.log(`Partial: ${count("PARTIAL")} (${percent(count("PARTIAL"))}%)`);
  console.log(`Fail: ${count("FAIL")} (${percent(count("FAIL"))}%)`);
}

async function main() {
  const evalDir = path.resolve("evals/artifact-review");
  const dataset = JSON.parse(
    await readFile(path.join(evalDir, "dataset.json"), "utf8")
  ) as EvalCase[];
  const results: EvalResult[] = [];

  console.log(`Running ${dataset.length} artifact-review eval cases.`);
  console.log(`API: ${API_URL}`);
  console.log(`Provider: ${PROVIDER_ID}`);
  console.log("Server must be running separately, for example: npm run dev");
  console.log("");

  for (const [index, testCase] of dataset.entries()) {
    const result = await runCase(testCase);
    results.push(result);
    printCaseResult(result);

    if (index < dataset.length - 1) {
      await sleep(WAIT_BETWEEN_CASES_MS);
    }
  }

  printSummary(results);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const resultsPath = path.join(evalDir, `results-${timestamp}.json`);
  await mkdir(evalDir, { recursive: true });
  await writeFile(
    resultsPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        apiUrl: API_URL,
        providerId: PROVIDER_ID,
        results
      },
      null,
      2
    ),
    "utf8"
  );
  console.log(`Results written to ${resultsPath}`);

  const passRate =
    results.filter((result) => result.status === "PASS").length / results.length;
  process.exit(passRate >= PASS_RATE_THRESHOLD ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
