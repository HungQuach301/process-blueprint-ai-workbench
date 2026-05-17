import type {
  QaIssue,
  QaIssueCode,
  QaSeverity
} from "@/lib/qa/task-register-rules";
import {
  createFindingSummary,
  type QAFinding,
  type QAFindingCategory,
  type QAFindingSet,
  type QAFindingSeverity
} from "@/lib/qa/qa-finding";

const severityMap: Record<QaSeverity, QAFindingSeverity> = {
  error: "critical",
  warning: "warning",
  suggestion: "suggestion"
};

const categoryMap: Record<QaIssueCode, QAFindingCategory> = {
  MISSING_ACTOR: "missing-field",
  MISSING_SYSTEM_FOR_SERVICE_TASK: "missing-field",
  MISSING_TASK_NAME: "missing-field",
  MISSING_INPUT_OUTPUT: "missing-field",
  GATEWAY_MISSING_CONDITION: "structural",
  GATEWAY_MISSING_YES_NO: "structural",
  INVALID_NEXT_STEP: "invalid-reference",
  STORE_WITHOUT_DATA_OBJECT: "missing-field",
  PULL_WITHOUT_INPUT_SOURCE: "coverage-gap",
  MULTI_ACTION_TASK: "decomposition",
  USER_TASK_MISSING_ACTOR_LANE: "template-mismatch",
  SERVICE_TASK_MISSING_SYSTEM_LANE: "template-mismatch",
  END_EVENT_MISSING_CLEAR_STATE: "ambiguity",
  MISSING_CUSTOMER_NOTIFICATION_AFTER_REJECT_OR_PAUSE: "governance-gap",
  ROWTYPE_BPMNTYPE_MISMATCH: "template-mismatch",
  MISSING_CUSTOMER_INTERACTION_TYPE: "coverage-gap",
  DISCONNECTED_TASK: "structural",
  SERVICE_BLUEPRINT_CARD_READINESS: "template-mismatch"
};

function affectedStepIds(issue: QaIssue) {
  return issue.stepId.trim() ? [issue.stepId] : [];
}

function recommendationIds(issue: QaIssue) {
  return (issue.recommendations ?? [])
    .map((recommendation) => recommendation.id)
    .filter((id): id is string => Boolean(id?.trim()));
}

export function mapQaSeverityToFindingSeverity(
  severity: QaSeverity
): QAFindingSeverity {
  return severityMap[severity] ?? "info";
}

export function mapQaIssueCodeToFindingCategory(
  issueCode: QaIssueCode
): QAFindingCategory {
  return categoryMap[issueCode] ?? "structural";
}

export function qaIssueToFinding(issue: QaIssue): QAFinding {
  return {
    id: issue.id,
    issueCode: issue.issueCode,
    severity: mapQaSeverityToFindingSeverity(issue.severity),
    category: mapQaIssueCodeToFindingCategory(issue.issueCode),
    title: issue.message,
    description: issue.suggestedFix,
    affectedArtifact: "processTaskRegister",
    affectedStepIds: affectedStepIds(issue),
    source: "rule",
    evidence: [
      `stepId: ${issue.stepId || "unknown"}`,
      `taskName: ${issue.taskName || "(untitled)"}`
    ],
    recommendationIds: recommendationIds(issue),
    metadata: {
      qaIssueId: issue.id,
      qaSeverity: issue.severity,
      taskName: issue.taskName,
      recommendationCount: issue.recommendations?.length ?? 0
    }
  };
}

export function qaIssuesToFindingSet(issues: QaIssue[]): QAFindingSet {
  const findings = issues.map(qaIssueToFinding);

  return {
    findings,
    summary: createFindingSummary(findings),
    source: "rule",
    generatedAt: new Date().toISOString()
  };
}
