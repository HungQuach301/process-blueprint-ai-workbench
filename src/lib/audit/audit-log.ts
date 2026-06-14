const STORAGE_KEY = "process-blueprint-ai-workbench:audit-log";

export type AuditAction =
  | "import_excel"
  | "ai_call"
  | "generate_ai_draft"
  | "apply_recommendation"
  | "apply_ai_draft"
  | "generate_d01"
  | "generate_d02"
  | "export_zip"
  | "export_ai_coding_pack"
  | "export_product_delivery_draft"
  | "generate_brd_preview"
  | "export_brd_draft"
  | "generate_srs_preview"
  | "export_srs_draft"
  | "generate_user_stories_preview"
  | "export_user_stories_draft"
  | "generate_acceptance_criteria_preview"
  | "export_acceptance_criteria_draft"
  | "generate_product_scope_review_preview"
  | "export_product_scope_review_draft"
  | "generate_requirement_qa_preview"
  | "generate_product_delivery_ai_coding_pack"
  | "export_product_delivery_ai_coding_pack";

export type AuditLogEntry = {
  id: string;
  action: AuditAction;
  status: "success" | "failure";
  summary: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

export type AIRunRecord = {
  id: string;
  skillId: string;
  provider: string;
  model: string;
  runtimeOptionsSummary?: Record<string, unknown>;
  status: "success" | "failure";
  timestamp: string;
  latencyMs?: number;
  estimatedCostUsd?: number | null;
  validationPassed?: boolean;
  validationStatus: "valid" | "invalid" | "skipped" | "not applicable";
  gateStatus?: string;
  tokenUsage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  contextSummary?: Record<string, unknown>;
  outputNormalizationSummary?: Record<string, unknown>;
  externalApiCalled: boolean;
  warnings: string[];
  requestId?: string;
  errorType?: string;
  safeErrorMessage?: string;
  validationErrorSummary?: string;
  suggestedNextAction?: string;
};

function readEntries(): AuditLogEntry[] {
  const savedEntries = window.localStorage.getItem(STORAGE_KEY);

  if (!savedEntries) {
    return [];
  }

  try {
    const parsedEntries = JSON.parse(savedEntries);

    return Array.isArray(parsedEntries) ? (parsedEntries as AuditLogEntry[]) : [];
  } catch {
    return [];
  }
}

export function loadAuditLog() {
  return readEntries();
}

function metadataString(
  metadata: Record<string, unknown> | undefined,
  keys: string[],
  fallback = ""
) {
  for (const key of keys) {
    const value = metadata?.[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return fallback;
}

function metadataNumber(
  metadata: Record<string, unknown> | undefined,
  keys: string[]
) {
  for (const key of keys) {
    const value = metadata?.[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

function metadataBoolean(
  metadata: Record<string, unknown> | undefined,
  keys: string[]
) {
  for (const key of keys) {
    const value = metadata?.[key];

    if (typeof value === "boolean") {
      return value;
    }
  }

  return undefined;
}

function metadataStringArray(
  metadata: Record<string, unknown> | undefined,
  keys: string[]
) {
  for (const key of keys) {
    const value = metadata?.[key];

    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string");
    }

    if (typeof value === "string" && value.trim().length > 0) {
      return [value];
    }
  }

  return [];
}

function metadataRecord(
  metadata: Record<string, unknown> | undefined,
  keys: string[]
) {
  for (const key of keys) {
    const value = metadata?.[key];

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }

  return undefined;
}

function metadataTokenUsage(metadata: Record<string, unknown> | undefined) {
  const tokenUsage = metadata?.tokenUsage;
  const directInputTokens = metadataNumber(metadata, ["inputTokens"]);
  const directOutputTokens = metadataNumber(metadata, ["outputTokens"]);
  const directTotalTokens = metadataNumber(metadata, ["totalTokens"]);

  if (typeof tokenUsage !== "object" || tokenUsage === null) {
    if (
      directInputTokens !== undefined ||
      directOutputTokens !== undefined ||
      directTotalTokens !== undefined
    ) {
      return {
        inputTokens: directInputTokens,
        outputTokens: directOutputTokens,
        totalTokens: directTotalTokens
      };
    }

    return undefined;
  }

  const usage = tokenUsage as Record<string, unknown>;
  const inputTokens =
    typeof usage.inputTokens === "number" ? usage.inputTokens : directInputTokens;
  const outputTokens =
    typeof usage.outputTokens === "number" ? usage.outputTokens : directOutputTokens;
  const totalTokens =
    typeof usage.totalTokens === "number" ? usage.totalTokens : directTotalTokens;

  if (
    inputTokens === undefined &&
    outputTokens === undefined &&
    totalTokens === undefined
  ) {
    return undefined;
  }

  return {
    inputTokens,
    outputTokens,
    totalTokens
  };
}

function metadataCost(metadata: Record<string, unknown> | undefined) {
  const value = metadata?.estimatedCostUsd;

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function metadataGateStatus(metadata: Record<string, unknown> | undefined) {
  const gateStatus = metadataString(metadata, ["gateStatus"]);

  if (gateStatus) {
    return gateStatus;
  }

  const qualityGate = metadataRecord(metadata, ["qualityGate"]);
  const status = qualityGate?.status;

  return typeof status === "string" ? status : undefined;
}

function normalizeValidationStatus(
  metadata: Record<string, unknown> | undefined,
  entryStatus: AuditLogEntry["status"]
): AIRunRecord["validationStatus"] {
  const explicitStatus = metadataString(metadata, ["validationStatus"]);

  if (
    explicitStatus === "valid" ||
    explicitStatus === "invalid" ||
    explicitStatus === "skipped" ||
    explicitStatus === "not applicable"
  ) {
    return explicitStatus;
  }

  const validationPassed = metadataBoolean(metadata, ["validationPassed"]);

  if (validationPassed === true) {
    return "valid";
  }

  if (validationPassed === false) {
    return "invalid";
  }

  return entryStatus === "failure" ? "skipped" : "not applicable";
}

function summarizeValidationErrors(
  metadata: Record<string, unknown> | undefined
) {
  const validationErrors = metadataStringArray(metadata, [
    "validationErrors",
    "validationErrorSummary"
  ]);

  if (validationErrors.length === 0) {
    return "";
  }

  const visibleErrors = validationErrors.slice(0, 3).join("; ");
  const remainingCount = validationErrors.length - 3;

  return remainingCount > 0
    ? `${visibleErrors}; +${remainingCount} more`
    : visibleErrors;
}

function getSuggestedNextAction(
  metadata: Record<string, unknown> | undefined,
  entryStatus: AuditLogEntry["status"]
) {
  const explicitAction = metadataString(metadata, ["suggestedNextAction"]);

  if (explicitAction) {
    return explicitAction;
  }

  const errorType = metadataString(metadata, ["errorType", "errorCode"]);
  const validationStatus = normalizeValidationStatus(metadata, entryStatus);
  const provider = metadataString(metadata, ["providerId", "provider"]);
  const externalApiCalled =
    metadataBoolean(metadata, ["externalApiCalled"]) ?? false;

  if (entryStatus === "success") {
    return "Review the preview before applying or exporting.";
  }

  if (validationStatus === "invalid") {
    return "Review the validation summary, adjust source data or prompt context, then run the skill again.";
  }

  if (
    errorType.includes("provider") ||
    (!externalApiCalled && provider !== "mock")
  ) {
    return "Check server-side provider env and feature flags, or rerun with Local/Mock fallback.";
  }

  return "Retry after reviewing the safe error message and input context.";
}

export function loadAIRunHistory(): AIRunRecord[] {
  return loadAuditLog()
    .filter((entry) => entry.action === "ai_call")
    .map((entry) => {
      const externalApiCalled =
        metadataBoolean(entry.metadata, ["externalApiCalled"]) ?? false;
      const provider = metadataString(
        entry.metadata,
        ["providerId", "provider", "providerMode"],
        "unknown-provider"
      );
      const effectiveProvider =
        provider !== "mock" && !externalApiCalled ? `${provider} -> fallback/mock` : provider;
      const safeErrorMessage = metadataString(entry.metadata, [
        "safeErrorMessage",
        "errorMessage"
      ]);

      return {
        id: entry.id,
        skillId: metadataString(entry.metadata, ["skillId"], "unknown-skill"),
        provider: effectiveProvider,
        model: metadataString(entry.metadata, ["model"], ""),
        runtimeOptionsSummary: metadataRecord(entry.metadata, [
          "runtimeOptionsSummary",
          "runtimeOptions"
        ]),
        status: entry.status,
        timestamp: entry.timestamp,
        latencyMs: metadataNumber(entry.metadata, ["latencyMs"]),
        estimatedCostUsd: metadataCost(entry.metadata),
        validationPassed: metadataBoolean(entry.metadata, ["validationPassed"]),
        validationStatus: normalizeValidationStatus(entry.metadata, entry.status),
        gateStatus: metadataGateStatus(entry.metadata),
        tokenUsage: metadataTokenUsage(entry.metadata),
        contextSummary: metadataRecord(entry.metadata, ["contextSummary"]),
        outputNormalizationSummary: metadataRecord(entry.metadata, [
          "outputNormalizationSummary",
          "outputNormalization"
        ]),
        externalApiCalled,
        warnings: metadataStringArray(entry.metadata, ["warnings", "warning"]),
        requestId: metadataString(entry.metadata, ["requestId"]),
        errorType: metadataString(entry.metadata, ["errorType", "errorCode"]),
        safeErrorMessage,
        validationErrorSummary: summarizeValidationErrors(entry.metadata),
        suggestedNextAction: getSuggestedNextAction(entry.metadata, entry.status)
      };
    });
}

export function saveAuditLogEntry(
  entry: Omit<AuditLogEntry, "id" | "timestamp">
) {
  const timestamp = new Date().toISOString();
  const nextEntry: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp,
    ...entry
  };

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([nextEntry, ...readEntries()], null, 2)
  );

  return nextEntry;
}

export function exportAuditLogJson() {
  return JSON.stringify(loadAuditLog(), null, 2);
}

export function exportAIRunHistoryJson() {
  return JSON.stringify(loadAIRunHistory(), null, 2);
}

export function clearAuditLog() {
  window.localStorage.removeItem(STORAGE_KEY);
}
