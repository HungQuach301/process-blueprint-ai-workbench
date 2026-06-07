import { localDataService } from "@/lib/data";

const BACKUP_SCHEMA_VERSION = 1;

export const LOCAL_WORKSPACE_STORAGE_KEYS = [
  "process-blueprint-ai-workbench:process-tasks",
  "process-blueprint-ai-workbench:selected-sample-process",
  "process-blueprint-ai-workbench:template-profiles",
  "process-blueprint-ai-workbench:selected-d01-template",
  "process-blueprint-ai-workbench:selected-d02-template",
  "process-blueprint-ai-workbench:generated-d01-bpmn-xml",
  "process-blueprint-ai-workbench:generated-d02-service-blueprint-xml",
  "process-blueprint-ai-workbench:generated-d01-bpmn-status",
  "process-blueprint-ai-workbench:generated-d02-service-blueprint-status",
  "process-blueprint-ai-workbench:input-brief",
  "process-blueprint-ai-workbench:input-brief-file-metadata",
  "process-blueprint-ai-workbench:structured-process-brief",
  "process-blueprint-ai-workbench:audit-log",
  "process-blueprint-ai-workbench:ai-run-history",
  "process-blueprint-ai-workbench:ai-provider-settings",
  "process-blueprint-ai-workbench:locale",
  "process-blueprint-recommendation-feedback"
] as const;

type LocalWorkspaceStorageKey = (typeof LOCAL_WORKSPACE_STORAGE_KEYS)[number];

export type LocalWorkspaceBackup = {
  schemaVersion: number;
  appId: "process-blueprint-ai-workbench";
  exportedAt: string;
  workspaceLabel: string;
  storage: Partial<Record<LocalWorkspaceStorageKey, string>>;
};

export type LocalWorkspaceImportResult =
  | { ok: true; restoredKeyCount: number; missingKeyCount: number }
  | { ok: false; error: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLocalWorkspaceBackup(value: unknown): value is LocalWorkspaceBackup {
  if (!isObject(value)) {
    return false;
  }

  if (value.appId !== "process-blueprint-ai-workbench") {
    return false;
  }

  if (!isObject(value.storage)) {
    return false;
  }

  return true;
}

function getStorageValue(key: LocalWorkspaceStorageKey) {
  const result = localDataService.getJsonResult<unknown>(key);

  if (result.ok) {
    return window.localStorage.getItem(key);
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function createLocalWorkspaceBackup(): LocalWorkspaceBackup {
  const storage: LocalWorkspaceBackup["storage"] = {};

  for (const key of LOCAL_WORKSPACE_STORAGE_KEYS) {
    const value = getStorageValue(key);

    if (value !== null) {
      storage[key] = value;
    }
  }

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appId: "process-blueprint-ai-workbench",
    exportedAt: new Date().toISOString(),
    workspaceLabel: "Local workspace",
    storage
  };
}

export function parseLocalWorkspaceBackup(jsonText: string): LocalWorkspaceBackup {
  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(jsonText);
  } catch {
    throw new Error("Backup file is not valid JSON.");
  }

  if (!isLocalWorkspaceBackup(parsedValue)) {
    throw new Error("Backup file is not a Process Blueprint local workspace backup.");
  }

  return {
    ...parsedValue,
    schemaVersion:
      typeof parsedValue.schemaVersion === "number"
        ? parsedValue.schemaVersion
        : 0,
    exportedAt:
      typeof parsedValue.exportedAt === "string"
        ? parsedValue.exportedAt
        : "",
    workspaceLabel:
      typeof parsedValue.workspaceLabel === "string"
        ? parsedValue.workspaceLabel
        : "Local workspace"
  };
}

export function restoreLocalWorkspaceBackup(
  backup: LocalWorkspaceBackup
): LocalWorkspaceImportResult {
  let restoredKeyCount = 0;

  try {
    for (const key of LOCAL_WORKSPACE_STORAGE_KEYS) {
      const value = backup.storage[key];

      if (typeof value === "string") {
        window.localStorage.setItem(key, value);
        restoredKeyCount += 1;
      } else {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    return {
      ok: false,
      error: "Could not write workspace backup to browser localStorage."
    };
  }

  return {
    ok: true,
    restoredKeyCount,
    missingKeyCount: LOCAL_WORKSPACE_STORAGE_KEYS.length - restoredKeyCount
  };
}

export function getLocalWorkspaceBackupFileName() {
  return `Process_Blueprint_Local_Workspace_${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`;
}
