"use client";

import { useMemo, useState } from "react";
import type { ProcessTask } from "@/lib/models/process-task";
import {
  getRecommendationChangePreview
} from "@/lib/qa/apply-recommendation";
import {
  isGraphChangingRecommendation,
  isSafeRecommendation,
  previewRecommendationBatch
} from "@/lib/recommendation-engine/apply-operations";
import type {
  QARecommendation,
  QaIssue,
  QaSeverity
} from "@/lib/qa/task-register-rules";

type QAPanelProps = {
  issues: QaIssue[];
  processTasks: ProcessTask[];
  onIssueClick: (stepId: string) => void;
  onDownloadReport: () => void;
  onApplyRecommendation: (recommendation: QARecommendation) => void;
  onApplyRecommendations: (recommendations: QARecommendation[]) => void;
};

const severityLabels: Record<QaSeverity, string> = {
  error: "Lỗi",
  warning: "Cảnh báo",
  suggestion: "Gợi ý"
};

const severityStyles: Record<QaSeverity, string> = {
  error: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  suggestion: "border-sky-200 bg-sky-50 text-sky-800"
};

const recommendationBoxStyles: Record<QaSeverity, string> = {
  error: "border-red-200 bg-red-50",
  warning: "border-amber-200 bg-amber-50",
  suggestion: "border-sky-200 bg-sky-50"
};

const recommendationCardStyles: Record<QaSeverity, string> = {
  error: "border-red-200 bg-white",
  warning: "border-amber-200 bg-white",
  suggestion: "border-sky-200 bg-white"
};

const severityOrder: QaSeverity[] = ["error", "warning", "suggestion"];

export function QAPanel({
  issues,
  processTasks,
  onIssueClick,
  onDownloadReport,
  onApplyRecommendation,
  onApplyRecommendations
}: QAPanelProps) {
  const [pendingRecommendation, setPendingRecommendation] = useState<{
    issue: QaIssue;
    recommendation: QARecommendation;
  } | null>(null);
  const [pendingBatchRecommendations, setPendingBatchRecommendations] = useState<QARecommendation[] | null>(null);
  const [selectedRecommendationKeys, setSelectedRecommendationKeys] = useState<Set<string>>(() => new Set());
  const [showOnlySafe, setShowOnlySafe] = useState(false);
  const [includeMediumConfidence, setIncludeMediumConfidence] = useState(false);
  const [includeGraphChanging, setIncludeGraphChanging] = useState(true);
  const recommendationEntries = useMemo(
    () =>
      issues.flatMap((issue) =>
        (issue.recommendations ?? []).map((recommendation, index) => ({
          issue,
          recommendation,
          key: `${issue.id}:${recommendation.id ?? recommendation.type ?? "recommendation"}:${index}`
        }))
      ),
    [issues]
  );
  const visibleRecommendationKeys = useMemo(() => {
    const keys = new Set<string>();

    recommendationEntries.forEach((entry) => {
      const isSafe = isSafeRecommendation(entry.recommendation);
      const isMediumLowRisk =
        includeMediumConfidence &&
        entry.recommendation.confidence === "medium" &&
        entry.recommendation.riskLevel === "low" &&
        !isGraphChangingRecommendation(entry.recommendation);
      const isGraphChanging = isGraphChangingRecommendation(entry.recommendation);

      if (!includeGraphChanging && isGraphChanging) {
        return;
      }

      if (showOnlySafe && !isSafe && !isMediumLowRisk) {
        return;
      }

      keys.add(entry.key);
    });

    return keys;
  }, [includeGraphChanging, includeMediumConfidence, recommendationEntries, showOnlySafe]);
  const selectedRecommendations = recommendationEntries
    .filter((entry) => selectedRecommendationKeys.has(entry.key))
    .map((entry) => entry.recommendation);
  const groupedIssues = severityOrder.map((severity) => ({
    severity,
    issues: issues.filter((issue) => issue.severity === severity)
  }));
  const pendingChanges = pendingRecommendation
    ? getRecommendationChangePreview(processTasks, pendingRecommendation.recommendation)
    : [];
  const pendingBatchPreview = pendingBatchRecommendations
    ? previewRecommendationBatch(processTasks, pendingBatchRecommendations)
    : null;

  function toggleRecommendation(key: string) {
    setSelectedRecommendationKeys((currentKeys) => {
      const nextKeys = new Set(currentKeys);

      if (nextKeys.has(key)) {
        nextKeys.delete(key);
      } else {
        nextKeys.add(key);
      }

      return nextKeys;
    });
  }

  function selectSafeRecommendations() {
    setSelectedRecommendationKeys(
      new Set(
        recommendationEntries
          .filter((entry) => isSafeRecommendation(entry.recommendation))
          .map((entry) => entry.key)
      )
    );
  }

  function clearSelection() {
    setSelectedRecommendationKeys(new Set());
  }

  function applySelectedRecommendations() {
    if (selectedRecommendations.length === 0) {
      return;
    }

    setPendingBatchRecommendations(selectedRecommendations);
  }

  function applyAllSafeRecommendations() {
    const safeRecommendations = recommendationEntries
      .filter((entry) => isSafeRecommendation(entry.recommendation))
      .map((entry) => entry.recommendation);

    if (safeRecommendations.length === 0) {
      return;
    }

    setPendingBatchRecommendations(safeRecommendations);
  }

  return (
    <section className="rounded border border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase text-slate-500">
              QA Engine
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
              Kiểm tra chất lượng Process Task Register
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              QA chạy lại tự động khi dữ liệu trong bảng thay đổi. Click vào
              issue để nhảy tới dòng liên quan nếu còn tồn tại.
            </p>
            <p className="mt-3 text-sm font-semibold text-slate-950">
              Tổng số issue: {issues.length}
            </p>
          </div>

          <button
            className="w-fit rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={onDownloadReport}
            type="button"
          >
            Download QA Report
          </button>
        </div>
        <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              onClick={selectSafeRecommendations}
              type="button"
            >
              Select safe high-confidence recommendations
            </button>
            <button
              className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              onClick={clearSelection}
              type="button"
            >
              Clear selection
            </button>
            <button
              className="rounded bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={selectedRecommendations.length === 0}
              onClick={applySelectedRecommendations}
              type="button"
            >
              Apply selected ({selectedRecommendations.length})
            </button>
            <button
              className="rounded bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
              onClick={applyAllSafeRecommendations}
              type="button"
            >
              Apply all safe recommendations
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
            <label className="flex items-center gap-2">
              <input
                checked={showOnlySafe}
                onChange={(event) => setShowOnlySafe(event.target.checked)}
                type="checkbox"
              />
              Show only safe recommendations
            </label>
            <label className="flex items-center gap-2">
              <input
                checked={includeMediumConfidence}
                onChange={(event) => setIncludeMediumConfidence(event.target.checked)}
                type="checkbox"
              />
              Include medium confidence
            </label>
            <label className="flex items-center gap-2">
              <input
                checked={includeGraphChanging}
                onChange={(event) => setIncludeGraphChanging(event.target.checked)}
                type="checkbox"
              />
              Include graph-changing recommendations
            </label>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4">
        {groupedIssues.map((group) => (
          <section className="rounded border border-slate-200" key={group.severity}>
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-950">
                {severityLabels[group.severity]}
              </h3>
              <span
                className={`rounded border px-2 py-1 text-xs font-semibold ${severityStyles[group.severity]}`}
              >
                {group.issues.length}
              </span>
            </div>

            {group.issues.length > 0 ? (
              <div className="divide-y divide-slate-200">
                {group.issues.map((issue) => (
                  <div
                    className="block w-full px-4 py-3 text-left hover:bg-slate-50"
                    key={issue.id}
                  >
                    <button
                      className="block w-full text-left"
                      onClick={() => onIssueClick(issue.stepId)}
                      type="button"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          {issue.stepId}
                        </span>
                        <span
                          className={`rounded border px-2 py-1 text-xs font-semibold ${severityStyles[issue.severity]}`}
                        >
                          {severityLabels[issue.severity]}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-950">
                        {issue.taskName}
                      </p>
                      <p className="mt-1 text-sm text-slate-700">{issue.message}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Cách sửa: {issue.suggestedFix}
                      </p>
                    </button>
                    <div
                      className={`mt-3 rounded border p-3 ${recommendationBoxStyles[issue.severity]}`}
                    >
                      <p className="text-xs font-semibold uppercase text-slate-600">
                        Gợi ý tự động
                      </p>
                      {issue.recommendations?.length ? (
                        <div className="mt-2 space-y-3">
                          {issue.recommendations.map((recommendation, index) => (
                            (() => {
                              const recommendationKey = `${issue.id}:${recommendation.id ?? recommendation.type ?? "recommendation"}:${index}`;

                              if (!visibleRecommendationKeys.has(recommendationKey)) {
                                return null;
                              }

                              return (
                            <div
                              className={`rounded border p-3 ${recommendationCardStyles[issue.severity]}`}
                              key={recommendationKey}
                            >
                              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                <label className="flex gap-2">
                                  <input
                                    checked={selectedRecommendationKeys.has(recommendationKey)}
                                    className="mt-1"
                                    onChange={() => toggleRecommendation(recommendationKey)}
                                    type="checkbox"
                                  />
                                  <span>
                                  <p className="text-sm font-semibold text-slate-800">
                                    {recommendation.title}
                                  </p>
                                  <p className="mt-1 text-sm text-slate-600">
                                    {recommendation.description}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    Confidence: {recommendation.confidence} | Impact:{" "}
                                    {recommendation.impact} | Risk: {recommendation.riskLevel ?? "medium"}
                                  </p>
                                  </span>
                                </label>
                                <button
                                  className="w-fit rounded bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                                  onClick={() =>
                                    setPendingRecommendation({
                                      issue,
                                      recommendation
                                    })
                                  }
                                  type="button"
                                >
                                  Apply
                                </button>
                              </div>
                              {recommendation.previewText ? (
                                <p className="mt-1 whitespace-pre-line text-xs text-slate-500">
                                  Preview: {recommendation.previewText}
                                </p>
                              ) : null}
                            </div>
                              );
                            })()
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-slate-600">
                          Chưa có gợi ý tự động.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-4 py-3 text-sm text-slate-500">
                Không có issue trong nhóm này.
              </p>
            )}
          </section>
        ))}
      </div>

      {pendingRecommendation ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded border border-slate-200 bg-white p-5 shadow-xl">
            <p className="text-sm font-medium uppercase text-slate-500">
              Confirm QA Recommendation
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">
              {pendingRecommendation.recommendation.title}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              {pendingRecommendation.recommendation.description}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Target: {pendingRecommendation.recommendation.targetStepIds.join(", ")}
            </p>

            {pendingChanges.length > 0 ? (
              <div className="mt-4 overflow-x-auto rounded border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="border-b border-r border-slate-200 px-3 py-2">
                        stepId
                      </th>
                      <th className="border-b border-r border-slate-200 px-3 py-2">
                        Field
                      </th>
                      <th className="border-b border-r border-slate-200 px-3 py-2">
                        Old value
                      </th>
                      <th className="border-b border-slate-200 px-3 py-2">
                        New value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingChanges.map((change, index) => (
                      <tr className="odd:bg-white even:bg-slate-50" key={`${change.stepId}-${change.field}-${index}`}>
                        <td className="border-b border-r border-slate-200 px-3 py-2">
                          {change.stepId}
                        </td>
                        <td className="border-b border-r border-slate-200 px-3 py-2">
                          {change.field}
                        </td>
                        <td className="border-b border-r border-slate-200 px-3 py-2">
                          {change.oldValue || "(trống)"}
                        </td>
                        <td className="border-b border-slate-200 px-3 py-2">
                          {change.newValue || "(trống)"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {pendingRecommendation.recommendation.newTasks?.length ? (
              <div className="mt-4 rounded border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-800">
                  New task rows to create
                </p>
                <div className="mt-2 space-y-2">
                  {pendingRecommendation.recommendation.newTasks.map((task) => (
                    <div className="rounded bg-slate-50 p-2 text-sm text-slate-700" key={task.id}>
                      <span className="font-semibold">{task.stepId}</span>:{" "}
                      {task.taskName}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {pendingRecommendation.recommendation.warnings?.length ? (
              <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-semibold text-amber-800">Warnings</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-700">
                  {pendingRecommendation.recommendation.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setPendingRecommendation(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                onClick={() => {
                  onApplyRecommendation(pendingRecommendation.recommendation);
                  setPendingRecommendation(null);
                }}
                type="button"
              >
                Confirm Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingBatchRecommendations && pendingBatchPreview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded border border-slate-200 bg-white p-5 shadow-xl">
            <p className="text-sm font-medium uppercase text-slate-500">
              Confirm Batch Recommendations
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">
              Apply selected recommendations
            </h3>
            <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
              <p>Selected: {pendingBatchPreview.selectedCount}</p>
              <p>Will apply: {pendingBatchPreview.applicableCount}</p>
              <p>Skipped due to conflicts: {pendingBatchPreview.skippedCount}</p>
              <p>Affected tasks: {pendingBatchPreview.affectedTaskCount}</p>
              <p>New tasks: {pendingBatchPreview.newTaskCount}</p>
              <p>Connection changes: {pendingBatchPreview.connectionChangeCount}</p>
            </div>

            {pendingBatchPreview.conflicts.length > 0 ? (
              <div className="mt-4 rounded border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-semibold text-red-800">Conflicts</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
                  {pendingBatchPreview.conflicts.map((conflict, index) => (
                    <li key={`${conflict.message}-${index}`}>{conflict.message}</li>
                  ))}
                </ul>
                <p className="mt-2 text-sm text-red-700">
                  Conflicting recommendations will be skipped.
                </p>
              </div>
            ) : null}

            {pendingBatchPreview.warnings.length > 0 ? (
              <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-semibold text-amber-800">Warnings</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-700">
                  {pendingBatchPreview.warnings.map((warning, index) => (
                    <li key={`${warning}-${index}`}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setPendingBatchRecommendations(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={pendingBatchPreview.applicableCount === 0}
                onClick={() => {
                  onApplyRecommendations(pendingBatchRecommendations);
                  setPendingBatchRecommendations(null);
                  clearSelection();
                }}
                type="button"
              >
                Confirm Apply Batch
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
