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
  | "generate_product_delivery_ai_coding_pack"
  | "export_product_delivery_ai_coding_pack";

export type AuditLogEntry = {
  id: string;
  action: AuditAction;
  status: "success" | "failure";
  summary: string;
  timestamp: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
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

export function clearAuditLog() {
  window.localStorage.removeItem(STORAGE_KEY);
}
