export const QA_FINDING_SEVERITIES = [
  "critical",
  "warning",
  "suggestion",
  "info"
] as const;

export type QAFindingSeverity = (typeof QA_FINDING_SEVERITIES)[number];

export const QA_FINDING_CATEGORIES = [
  "missing-field",
  "invalid-reference",
  "decomposition",
  "wording",
  "template-mismatch",
  "governance-gap",
  "ambiguity",
  "inconsistency",
  "structural",
  "coverage-gap"
] as const;

export type QAFindingCategory = (typeof QA_FINDING_CATEGORIES)[number];

export type QAFindingSource = "rule" | "ai" | "gate" | "system";

const QA_FINDING_SOURCES = ["rule", "ai", "gate", "system"] as const;

export type QAFinding = {
  id?: string;
  issueCode: string;
  severity: QAFindingSeverity;
  category: QAFindingCategory;
  title: string;
  description: string;
  affectedArtifact: string;
  affectedStepIds: string[];
  source?: QAFindingSource;
  evidence?: string[];
  recommendationIds?: string[];
  metadata?: Record<string, unknown>;
};

export type QAFindingSummary = {
  total: number;
  bySeverity: Record<QAFindingSeverity, number>;
  byCategory: Record<QAFindingCategory, number>;
};

export type QAFindingSet = {
  findings: QAFinding[];
  summary: QAFindingSummary;
  source?: QAFindingSource;
  generatedAt?: string;
};

export type QAFindingValidationResult =
  | {
      ok: true;
      value: QAFinding;
    }
  | {
      ok: false;
      errors: string[];
    };

const severityRank: Record<QAFindingSeverity, number> = {
  critical: 0,
  warning: 1,
  suggestion: 2,
  info: 3
};

const severitySet = new Set<string>(QA_FINDING_SEVERITIES);
const categorySet = new Set<string>(QA_FINDING_CATEGORIES);
const sourceSet = new Set<string>(QA_FINDING_SOURCES);

function createEmptySeverityCounts(): Record<QAFindingSeverity, number> {
  return {
    critical: 0,
    warning: 0,
    suggestion: 0,
    info: 0
  };
}

function createEmptyCategoryCounts(): Record<QAFindingCategory, number> {
  return {
    "missing-field": 0,
    "invalid-reference": 0,
    decomposition: 0,
    wording: 0,
    "template-mismatch": 0,
    "governance-gap": 0,
    ambiguity: 0,
    inconsistency: 0,
    structural: 0,
    "coverage-gap": 0
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function requiredString(
  value: Record<string, unknown>,
  field: keyof QAFinding,
  errors: string[]
) {
  if (typeof value[field] !== "string" || !value[field].trim()) {
    errors.push(`${String(field)} is required.`);
  }
}

function findingDedupKey(finding: QAFinding) {
  return [
    finding.issueCode.trim(),
    [...finding.affectedStepIds].sort().join(","),
    finding.affectedArtifact.trim(),
    finding.category
  ].join("|");
}

function normalizeFindingSet(input: QAFindingSet | QAFinding[]) {
  return Array.isArray(input) ? input : input.findings;
}

function sortFindings(findings: QAFinding[]) {
  return [...findings].sort((left, right) => {
    const severityDiff = severityRank[left.severity] - severityRank[right.severity];

    if (severityDiff !== 0) {
      return severityDiff;
    }

    return findingDedupKey(left).localeCompare(findingDedupKey(right));
  });
}

function uniqueStrings(values: string[] | undefined) {
  return Array.from(new Set(values ?? []));
}

function mergeDuplicateFinding(existing: QAFinding, incoming: QAFinding): QAFinding {
  const strongerSeverity =
    severityRank[incoming.severity] < severityRank[existing.severity]
      ? incoming.severity
      : existing.severity;

  return {
    ...existing,
    severity: strongerSeverity,
    affectedStepIds: uniqueStrings([
      ...existing.affectedStepIds,
      ...incoming.affectedStepIds
    ]).sort(),
    evidence: uniqueStrings([...(existing.evidence ?? []), ...(incoming.evidence ?? [])]),
    recommendationIds: uniqueStrings([
      ...(existing.recommendationIds ?? []),
      ...(incoming.recommendationIds ?? [])
    ]),
    metadata: {
      ...existing.metadata,
      ...incoming.metadata
    }
  };
}

export function createFindingSummary(findings: QAFinding[]): QAFindingSummary {
  const summary: QAFindingSummary = {
    total: findings.length,
    bySeverity: createEmptySeverityCounts(),
    byCategory: createEmptyCategoryCounts()
  };

  findings.forEach((finding) => {
    summary.bySeverity[finding.severity] += 1;
    summary.byCategory[finding.category] += 1;
  });

  return summary;
}

export function validateQAFinding(finding: unknown): QAFindingValidationResult {
  const errors: string[] = [];

  if (!isObject(finding)) {
    return {
      ok: false,
      errors: ["QAFinding must be an object."]
    };
  }

  requiredString(finding, "issueCode", errors);
  requiredString(finding, "title", errors);
  requiredString(finding, "description", errors);
  requiredString(finding, "affectedArtifact", errors);

  if (typeof finding.severity !== "string" || !severitySet.has(finding.severity)) {
    errors.push("severity is invalid.");
  }

  if (typeof finding.category !== "string" || !categorySet.has(finding.category)) {
    errors.push("category is invalid.");
  }

  if (!isStringArray(finding.affectedStepIds)) {
    errors.push("affectedStepIds must be a string array.");
  }

  if (
    finding.source !== undefined &&
    (typeof finding.source !== "string" || !sourceSet.has(finding.source))
  ) {
    errors.push("source is invalid.");
  }

  if (finding.evidence !== undefined && !isStringArray(finding.evidence)) {
    errors.push("evidence must be a string array.");
  }

  if (
    finding.recommendationIds !== undefined &&
    !isStringArray(finding.recommendationIds)
  ) {
    errors.push("recommendationIds must be a string array.");
  }

  if (
    finding.metadata !== undefined &&
    (!isObject(finding.metadata) || Array.isArray(finding.metadata))
  ) {
    errors.push("metadata must be an object.");
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors
    };
  }

  return {
    ok: true,
    value: finding as QAFinding
  };
}

export function mergeFindingSets(
  ruleFindings: QAFindingSet | QAFinding[],
  aiFindings: QAFindingSet | QAFinding[]
): QAFindingSet {
  const findingsByKey = new Map<string, QAFinding>();

  [...normalizeFindingSet(ruleFindings), ...normalizeFindingSet(aiFindings)].forEach(
    (finding) => {
      const key = findingDedupKey(finding);
      const existingFinding = findingsByKey.get(key);

      findingsByKey.set(
        key,
        existingFinding
          ? mergeDuplicateFinding(existingFinding, finding)
          : {
              ...finding,
              affectedStepIds: uniqueStrings(finding.affectedStepIds).sort(),
              evidence: uniqueStrings(finding.evidence),
              recommendationIds: uniqueStrings(finding.recommendationIds)
            }
      );
    }
  );

  const findings = sortFindings(Array.from(findingsByKey.values()));

  return {
    findings,
    summary: createFindingSummary(findings),
    generatedAt: new Date().toISOString()
  };
}
