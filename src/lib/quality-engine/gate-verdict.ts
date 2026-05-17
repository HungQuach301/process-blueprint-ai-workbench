export const GATE_VERDICT_STATUSES = [
  "pass",
  "warning",
  "fail",
  "not-applicable"
] as const;

export type GateVerdictStatus = (typeof GATE_VERDICT_STATUSES)[number];

export const GATE_ISSUE_SEVERITIES = ["blocker", "warning", "info"] as const;

export type GateIssueSeverity = (typeof GATE_ISSUE_SEVERITIES)[number];

export type GateIssue = {
  id?: string;
  code: string;
  severity: GateIssueSeverity;
  title: string;
  description: string;
  affectedArtifact?: string;
  affectedIds?: string[];
  evidence?: string[];
  metadata?: Record<string, unknown>;
};

export type GateBlocker = GateIssue & {
  severity: "blocker";
};

export type GateWarning = GateIssue & {
  severity: "warning";
};

export type GateScoreDimension = {
  id: string;
  label: string;
  score?: number;
  maxScore?: number;
  status?: GateVerdictStatus;
  notes?: string[];
};

export type GateScoreBreakdown = {
  score?: number;
  maxScore?: number;
  dimensions: GateScoreDimension[];
};

export type GateVerdictSummary = {
  totalIssues: number;
  blockerCount: number;
  warningCount: number;
  infoCount: number;
};

export type GateVerdict = {
  gateId: string;
  gateName: string;
  status: GateVerdictStatus;
  summary: GateVerdictSummary;
  issues: GateIssue[];
  blockers: GateBlocker[];
  warnings: GateWarning[];
  score?: GateScoreBreakdown;
  checkedAt?: string;
  metadata?: Record<string, unknown>;
};

export function createGateVerdictSummary(
  issues: GateIssue[] = []
): GateVerdictSummary {
  return {
    totalIssues: issues.length,
    blockerCount: issues.filter((issue) => issue.severity === "blocker").length,
    warningCount: issues.filter((issue) => issue.severity === "warning").length,
    infoCount: issues.filter((issue) => issue.severity === "info").length
  };
}

export function splitGateIssues(issues: GateIssue[] = []) {
  return {
    blockers: issues.filter(
      (issue): issue is GateBlocker => issue.severity === "blocker"
    ),
    warnings: issues.filter(
      (issue): issue is GateWarning => issue.severity === "warning"
    )
  };
}

export function inferGateVerdictStatus(
  issues: GateIssue[] = [],
  fallbackStatus: GateVerdictStatus = "pass"
): GateVerdictStatus {
  if (fallbackStatus === "not-applicable") {
    return fallbackStatus;
  }

  if (issues.some((issue) => issue.severity === "blocker")) {
    return "fail";
  }

  if (issues.some((issue) => issue.severity === "warning")) {
    return "warning";
  }

  return fallbackStatus;
}

export function createGateVerdict({
  gateId,
  gateName,
  issues = [],
  score,
  status,
  checkedAt,
  metadata
}: {
  gateId: string;
  gateName: string;
  issues?: GateIssue[];
  score?: GateScoreBreakdown;
  status?: GateVerdictStatus;
  checkedAt?: string;
  metadata?: Record<string, unknown>;
}): GateVerdict {
  const splitIssues = splitGateIssues(issues);

  return {
    gateId,
    gateName,
    status: status ?? inferGateVerdictStatus(issues),
    summary: createGateVerdictSummary(issues),
    issues,
    blockers: splitIssues.blockers,
    warnings: splitIssues.warnings,
    score,
    checkedAt,
    metadata
  };
}
