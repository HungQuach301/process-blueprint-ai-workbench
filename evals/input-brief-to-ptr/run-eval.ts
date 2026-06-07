import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type ExpectedCriteria = {
  hasStartEvent?: boolean;
  hasEndEvent?: boolean;
  minTasks?: number;
  maxTasks?: number;
  hasGateway?: boolean;
  hasServiceTask?: boolean;
  allStepsHaveActor?: boolean;
  confidenceLow?: boolean;
  gatewayCount?: number;
};

type EvalCase = {
  id: string;
  name: string;
  description: string;
  input: unknown;
  expectedCriteria: ExpectedCriteria;
};

type ProcessTaskLike = {
  bpmnType?: unknown;
  actor?: unknown;
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
  taskCount?: number;
};

const API_URL =
  process.env.EVAL_API_URL || "http://localhost:3000/api/ai/run-skill";
const CASE_TIMEOUT_MS = 60000;
const WAIT_BETWEEN_CASES_MS = 2000;
const PASS_RATE_THRESHOLD = 0.6;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getResultPayload(responseJson: unknown) {
  if (!isObject(responseJson)) {
    return undefined;
  }

  return responseJson.result;
}

function getTasks(resultPayload: unknown): ProcessTaskLike[] {
  if (!isObject(resultPayload) || !Array.isArray(resultPayload.draftProcessTasks)) {
    return [];
  }

  return resultPayload.draftProcessTasks.filter(isObject);
}

function getConfidence(resultPayload: unknown) {
  return isObject(resultPayload) && typeof resultPayload.confidence === "string"
    ? resultPayload.confidence
    : "";
}

function countCriteria(criteria: ExpectedCriteria) {
  return Object.keys(criteria).length;
}

function evaluateCriteria(
  criteria: ExpectedCriteria,
  tasks: ProcessTaskLike[],
  resultPayload: unknown
) {
  const missingCriteria: string[] = [];
  const gatewayCount = tasks.filter(
    (task) => task.bpmnType === "exclusiveGateway"
  ).length;
  const checks: Record<keyof ExpectedCriteria, boolean> = {
    hasStartEvent:
      criteria.hasStartEvent === undefined ||
      tasks.some((task) => task.bpmnType === "startEvent") ===
        criteria.hasStartEvent,
    hasEndEvent:
      criteria.hasEndEvent === undefined ||
      tasks.some((task) => task.bpmnType === "endEvent") === criteria.hasEndEvent,
    minTasks: criteria.minTasks === undefined || tasks.length >= criteria.minTasks,
    maxTasks: criteria.maxTasks === undefined || tasks.length <= criteria.maxTasks,
    hasGateway:
      criteria.hasGateway === undefined ||
      tasks.some((task) => task.bpmnType === "exclusiveGateway") ===
        criteria.hasGateway,
    hasServiceTask:
      criteria.hasServiceTask === undefined ||
      tasks.some((task) => task.bpmnType === "serviceTask") ===
        criteria.hasServiceTask,
    allStepsHaveActor:
      criteria.allStepsHaveActor === undefined ||
      tasks
        .filter(
          (task) =>
            task.bpmnType !== "startEvent" && task.bpmnType !== "endEvent"
        )
        .every(
          (task) =>
            typeof task.actor === "string" && task.actor.trim().length > 0
        ) === criteria.allStepsHaveActor,
    confidenceLow:
      criteria.confidenceLow === undefined ||
      (getConfidence(resultPayload) === "low") === criteria.confidenceLow,
    gatewayCount:
      criteria.gatewayCount === undefined || gatewayCount >= criteria.gatewayCount
  };

  (Object.keys(criteria) as Array<keyof ExpectedCriteria>).forEach((key) => {
    if (!checks[key]) {
      missingCriteria.push(key);
    }
  });

  return {
    missingCriteria,
    passedCriteria: countCriteria(criteria) - missingCriteria.length,
    totalCriteria: countCriteria(criteria)
  };
}

async function postWithTimeout(testCase: EvalCase) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CASE_TIMEOUT_MS);

  try {
    return await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        skillId: "input-brief-to-ptr",
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

    const resultPayload = getResultPayload(responseJson);
    const tasks = getTasks(resultPayload);
    const criteriaResult = evaluateCriteria(
      testCase.expectedCriteria,
      tasks,
      resultPayload
    );
    const status =
      criteriaResult.missingCriteria.length === 0 ? "PASS" : "PARTIAL";

    return {
      id: testCase.id,
      name: testCase.name,
      status,
      ...criteriaResult,
      taskCount: tasks.length
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
  const score = `(${result.passedCriteria}/${result.totalCriteria} criteria`;

  if (result.status === "PASS") {
    console.log(`${label} ${score})`);
    return;
  }

  if (result.status === "PARTIAL") {
    console.log(
      `${label} ${score} - missing: ${result.missingCriteria.join(", ")})`
    );
    return;
  }

  console.log(`${label} (${result.error || "API error"})`);
}

function printSummary(results: EvalResult[]) {
  const passCount = results.filter((result) => result.status === "PASS").length;
  const partialCount = results.filter(
    (result) => result.status === "PARTIAL"
  ).length;
  const failCount = results.filter((result) => result.status === "FAIL").length;
  const total = results.length;
  const percent = (count: number) => Math.round((count / total) * 100);

  console.log("");
  console.log(`Total: ${total} cases`);
  console.log(`Pass: ${passCount} (${percent(passCount)}%)`);
  console.log(`Partial: ${partialCount} (${percent(partialCount)}%)`);
  console.log(`Fail: ${failCount} (${percent(failCount)}%)`);
}

async function main() {
  const evalDir = path.resolve("evals/input-brief-to-ptr");
  const datasetPath = path.join(evalDir, "dataset.json");
  const dataset = JSON.parse(await readFile(datasetPath, "utf8")) as EvalCase[];
  const results: EvalResult[] = [];

  console.log(`Running ${dataset.length} input-brief-to-ptr eval cases.`);
  console.log(`API: ${API_URL}`);
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
