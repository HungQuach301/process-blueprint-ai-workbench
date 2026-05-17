import type { DraftProcessTaskRegister } from "@/lib/ai-intake";

export type SourceCoverageMode = "brief" | "file" | "chat" | "manual" | "unknown";

export type SourceCoverageAdvisoryStatus = "good" | "review" | "missing";

export type SourceCoverageSignal = {
  sourceMode: SourceCoverageMode;
  hasSourceSummary: boolean;
  totalDraftRows: number;
  rowsWithSourceRef: number;
  rowsWithoutSourceRef: number;
  coveragePercent: number;
  uniqueSourceRefs: string[];
};

export type SourceCoverageAdvisory = {
  advisoryId: "source-coverage-advisory";
  label: "Source coverage advisory";
  status: SourceCoverageAdvisoryStatus;
  nonBlocking: true;
  signals: SourceCoverageSignal;
  warnings: string[];
};

function clean(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function inferSourceMode(draft: DraftProcessTaskRegister): SourceCoverageMode {
  const sourceText = [
    draft.sourceSummary,
    ...draft.draftProcessTasks.map((task) => task.sourceRef)
  ]
    .join(" ")
    .toLowerCase();

  if (!sourceText.trim()) {
    return "unknown";
  }

  if (/\b(pdf|docx|excel|xlsx|file|extracted)\b/.test(sourceText)) {
    return "file";
  }

  if (/\b(chat|notes|pasted|transcript|workshop)\b/.test(sourceText)) {
    return "chat";
  }

  if (/\b(input brief|structured brief|brief)\b/.test(sourceText)) {
    return "brief";
  }

  if (/\b(manual|local mock)\b/.test(sourceText)) {
    return "manual";
  }

  return "unknown";
}

export function createSourceCoverageAdvisory(
  draft: DraftProcessTaskRegister
): SourceCoverageAdvisory {
  const totalDraftRows = draft.draftProcessTasks.length;
  const sourceRefs = draft.draftProcessTasks.map((task) => clean(task.sourceRef));
  const rowsWithSourceRef = sourceRefs.filter(Boolean).length;
  const rowsWithoutSourceRef = totalDraftRows - rowsWithSourceRef;
  const coveragePercent =
    totalDraftRows > 0 ? Math.round((rowsWithSourceRef / totalDraftRows) * 100) : 0;
  const uniqueSourceRefs = Array.from(new Set(sourceRefs.filter(Boolean)));
  const hasSourceSummary = clean(draft.sourceSummary).length > 0;
  const sourceMode = inferSourceMode(draft);
  const warnings: string[] = [];

  if (!hasSourceSummary) {
    warnings.push("No source summary was provided for this draft.");
  }

  if (totalDraftRows === 0) {
    warnings.push("No draft rows are available for source coverage review.");
  } else if (rowsWithSourceRef === 0) {
    warnings.push("Draft rows do not include per-row sourceRef values.");
  } else if (rowsWithoutSourceRef > 0) {
    warnings.push(`${rowsWithoutSourceRef} draft row(s) are missing sourceRef values.`);
  }

  if (sourceMode === "unknown") {
    warnings.push("Source mode could not be inferred from the draft metadata.");
  }

  if (coveragePercent >= 80 && uniqueSourceRefs.length <= 1 && totalDraftRows > 3) {
    warnings.push(
      "Most rows have sourceRef values, but they point to a single coarse source."
    );
  }

  const status: SourceCoverageAdvisoryStatus =
    coveragePercent === 0 || sourceMode === "unknown"
      ? "missing"
      : warnings.length > 0
        ? "review"
        : "good";

  return {
    advisoryId: "source-coverage-advisory",
    label: "Source coverage advisory",
    status,
    nonBlocking: true,
    signals: {
      sourceMode,
      hasSourceSummary,
      totalDraftRows,
      rowsWithSourceRef,
      rowsWithoutSourceRef,
      coveragePercent,
      uniqueSourceRefs
    },
    warnings
  };
}
