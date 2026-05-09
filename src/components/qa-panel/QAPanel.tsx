"use client";

import { useEffect, useMemo, useState } from "react";
import { SessionFrame } from "@/components/layout/SessionFrame";
import {
  confirmRealAICallIfNeeded,
  logAICallAudit
} from "@/lib/ai/ai-governance";
import type { ProcessTask } from "@/lib/models/process-task";
import type { TemplateProfile } from "@/lib/models/template-profile";
import {
  sampleBpmnTemplateProfile,
  sampleServiceBlueprintTemplateProfile
} from "@/lib/sample-data/sme-online-loan";
import {
  getRecommendationChangePreview
} from "@/lib/qa/apply-recommendation";
import {
  isGraphChangingRecommendation,
  isSafeRecommendation,
  normalizeRecommendationOperations,
  previewRecommendationBatch
} from "@/lib/recommendation-engine/apply-operations";
import {
  clearRecommendationFeedback,
  exportRecommendationFeedbackJson,
  saveRecommendationFeedback,
  type RecommendationFeedbackEntry,
  type RecommendationUserAction
} from "@/lib/recommendation-engine/feedback-store";
import type {
  QARecommendation,
  QaIssue,
  QaSeverity
} from "@/lib/qa/task-register-rules";

const TEMPLATES_STORAGE_KEY =
  "process-blueprint-ai-workbench:template-profiles";
const D01_STORAGE_KEY = "process-blueprint-ai-workbench:selected-d01-template";
const D02_STORAGE_KEY = "process-blueprint-ai-workbench:selected-d02-template";
const AI_PROCESS_QA_SKILL_ID = "ai-process-qa";

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

function createTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function getRecommendationId(recommendation: QARecommendation) {
  return recommendation.id ?? `${recommendation.issueId ?? "issue"}-${recommendation.type ?? "recommendation"}`;
}

function getAffectedStepIds(recommendation: QARecommendation) {
  const stepIds = new Set(recommendation.targetStepIds);
  const addStepId = (stepId: string | null | undefined) => {
    if (stepId) {
      stepIds.add(stepId);
    }
  };

  normalizeRecommendationOperations(recommendation).forEach((operation) => {
    if ("stepId" in operation) {
      addStepId(operation.stepId);
    }

    if ("targetStepId" in operation) {
      addStepId(operation.targetStepId);
    }

    if ("anchorStepId" in operation) {
      addStepId(operation.anchorStepId);
    }

    if ("sourceStepId" in operation) {
      addStepId(operation.sourceStepId);
    }

    if ("targetStepId" in operation) {
      addStepId(operation.targetStepId);
    }

    if ("gatewayStepId" in operation) {
      addStepId(operation.gatewayStepId);
    }
  });

  return Array.from(stepIds).filter(Boolean).sort();
}

function createRecommendationFeedback(
  recommendation: QARecommendation,
  userAction: RecommendationUserAction,
  reason?: string
): RecommendationFeedbackEntry {
  return {
    recordType: "recommendation",
    recommendationId: getRecommendationId(recommendation),
    issueCode: recommendation.issueCode,
    source: recommendation.source ?? "rule",
    userAction,
    reason,
    originalRecommendation: recommendation,
    finalAppliedOperations:
      userAction === "accepted" ? normalizeRecommendationOperations(recommendation) : [],
    affectedStepIds: getAffectedStepIds(recommendation),
    timestamp: new Date().toISOString()
  };
}

function readSelectedTemplateProfiles() {
  let templateProfiles: TemplateProfile[] = [
    sampleBpmnTemplateProfile,
    sampleServiceBlueprintTemplateProfile
  ];

  try {
    const savedTemplates = window.localStorage.getItem(TEMPLATES_STORAGE_KEY);

    if (savedTemplates) {
      const parsedTemplates = JSON.parse(savedTemplates);

      if (Array.isArray(parsedTemplates)) {
        templateProfiles = parsedTemplates as TemplateProfile[];
      }
    }
  } catch {
    templateProfiles = [sampleBpmnTemplateProfile, sampleServiceBlueprintTemplateProfile];
  }

  const selectedD01TemplateId =
    window.localStorage.getItem(D01_STORAGE_KEY) ?? sampleBpmnTemplateProfile.id;
  const selectedD02TemplateId =
    window.localStorage.getItem(D02_STORAGE_KEY) ??
    sampleServiceBlueprintTemplateProfile.id;
  const selectedTemplates = templateProfiles.filter(
    (template) =>
      template.id === selectedD01TemplateId || template.id === selectedD02TemplateId
  );

  return selectedTemplates.length > 0 ? selectedTemplates : templateProfiles;
}

export function QAPanel({
  issues,
  processTasks,
  onIssueClick,
  onDownloadReport,
  onApplyRecommendation,
  onApplyRecommendations
}: QAPanelProps) {
  const [aiQaIssues, setAiQaIssues] = useState<QaIssue[]>([]);
  const [aiQaMessage, setAiQaMessage] = useState("");
  const [realAIQAEnabled, setRealAIQAEnabled] = useState(false);
  const [isRunningAIQA, setIsRunningAIQA] = useState(false);
  const [pendingRecommendation, setPendingRecommendation] = useState<{
    issue: QaIssue;
    recommendation: QARecommendation;
  } | null>(null);
  const [pendingBatchRecommendations, setPendingBatchRecommendations] = useState<QARecommendation[] | null>(null);
  const [selectedRecommendationIds, setSelectedRecommendationIds] = useState<Set<string>>(() => new Set());
  const [showOnlySafe, setShowOnlySafe] = useState(false);
  const [includeMediumConfidence, setIncludeMediumConfidence] = useState(false);
  const [includeGraphChanging, setIncludeGraphChanging] = useState(true);
  useEffect(() => {
    setAiQaIssues([]);
    setAiQaMessage("");
  }, [processTasks]);

  useEffect(() => {
    let active = true;

    async function loadAIQAMode() {
      try {
        const response = await fetch("/api/ai/run-skill", {
          method: "GET"
        });
        const data = (await response.json()) as {
          realAIQAEnabled?: boolean;
        };

        if (active) {
          setRealAIQAEnabled(data.realAIQAEnabled === true);
        }
      } catch {
        if (active) {
          setRealAIQAEnabled(false);
        }
      }
    }

    loadAIQAMode();

    return () => {
      active = false;
    };
  }, []);

  const displayIssues = useMemo(
    () => [...aiQaIssues, ...issues],
    [aiQaIssues, issues]
  );

  const recommendationEntries = useMemo(
    () =>
      displayIssues.flatMap((issue) =>
        (issue.recommendations ?? []).map((recommendation, index) => ({
          issue,
          recommendation,
          id: `${issue.id}:${recommendation.id ?? recommendation.type ?? "recommendation"}:${index}`
        }))
      ),
    [displayIssues]
  );
  const visibleRecommendationIds = useMemo(() => {
    const ids = new Set<string>();

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

      ids.add(entry.id);
    });

    return ids;
  }, [includeGraphChanging, includeMediumConfidence, recommendationEntries, showOnlySafe]);
  const selectedRecommendations = recommendationEntries
    .filter((entry) => selectedRecommendationIds.has(entry.id))
    .map((entry) => entry.recommendation);
  const safeRecommendationEntries = recommendationEntries.filter((entry) =>
    isSafeRecommendation(entry.recommendation)
  );
  const safeRecommendations = safeRecommendationEntries.map((entry) => entry.recommendation);
  const hasRecommendations = recommendationEntries.length > 0;
  const groupedIssues = severityOrder.map((severity) => ({
    severity,
    issues: displayIssues.filter((issue) => issue.severity === severity)
  }));
  const pendingChanges = pendingRecommendation
    ? getRecommendationChangePreview(processTasks, pendingRecommendation.recommendation)
    : [];
  const pendingBatchPreview = pendingBatchRecommendations
    ? previewRecommendationBatch(processTasks, pendingBatchRecommendations)
    : null;

  function toggleRecommendation(id: string) {
    setSelectedRecommendationIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(id)) {
        nextIds.delete(id);
      } else {
        nextIds.add(id);
      }

      return nextIds;
    });
  }

  function selectSafeRecommendations() {
    setSelectedRecommendationIds(
      new Set(
        recommendationEntries
          .filter((entry) => isSafeRecommendation(entry.recommendation))
          .map((entry) => entry.id)
      )
    );
  }

  function clearSelection() {
    setSelectedRecommendationIds(new Set());
  }

  function applySelectedRecommendations() {
    if (selectedRecommendations.length === 0) {
      return;
    }

    setPendingBatchRecommendations(selectedRecommendations);
  }

  function applyAllSafeRecommendations() {
    if (safeRecommendations.length === 0) {
      return;
    }

    setPendingBatchRecommendations(safeRecommendations);
  }

  function downloadFeedbackJson() {
    const blob = new Blob([exportRecommendationFeedbackJson()], {
      type: "application/json;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `Recommendation_Feedback_${createTimestamp()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function clearLocalFeedback() {
    clearRecommendationFeedback();
  }

  async function runAiQa() {
    if (!confirmRealAICallIfNeeded(realAIQAEnabled)) {
      setAiQaMessage("Da huy goi Real AI QA. Khong co recommendation nao duoc tao.");
      return;
    }

    setIsRunningAIQA(true);
    setAiQaMessage(
      realAIQAEnabled
        ? "Running real AI QA through the server route..."
        : "Running mock AI QA. Real AI QA is disabled."
    );

    try {
      const routeResponse = await fetch("/api/ai/run-skill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          skillId: AI_PROCESS_QA_SKILL_ID,
          payload: {
            processTasks,
            qaIssues: issues,
            templateProfiles: readSelectedTemplateProfiles()
          }
        })
      });
      const data = (await routeResponse.json()) as {
        ok?: boolean;
        mode?: "mock" | "provider-backed";
        result?: {
          recommendations?: QARecommendation[];
        };
        error?: string;
        validationErrors?: string[];
        meta?: {
          externalApiCalled?: boolean;
          realAIQAEnabled?: boolean;
        };
      };

      if (!routeResponse.ok || !data.ok) {
        const errorMessage = [
          data.error || "AI QA failed.",
          ...(data.validationErrors ?? [])
        ].join(" ");

        logAICallAudit({
          skillId: AI_PROCESS_QA_SKILL_ID,
          success: false,
          errorMessage,
          realAIEnabled: realAIQAEnabled,
          externalApiCalled: data.meta?.externalApiCalled ?? realAIQAEnabled
        });
        setAiQaIssues([]);
        setAiQaMessage(errorMessage);
        return;
      }

      const recommendations = (data.result?.recommendations ?? []).map(
        (recommendation) => ({
          ...recommendation,
          source: "ai" as const,
          requiresConfirmation: true
        })
      );

      setAiQaIssues(
        recommendations.length > 0
          ? [
              {
                id: `ai-process-qa-${Date.now()}`,
                issueCode: "SERVICE_BLUEPRINT_CARD_READINESS",
                stepId:
                  recommendations[0].targetStepIds[0] ??
                  processTasks[0]?.stepId ??
                  "AI",
                taskName:
                  data.mode === "provider-backed"
                    ? "AI QA recommendation"
                    : "Mock AI QA recommendation",
                severity: "suggestion",
                message:
                  "AI QA returned recommendation(s) using the existing Recommendation Engine schema.",
                suggestedFix:
                  "Review the AI recommendation, preview the operation, then apply only after confirmation.",
                recommendations
              }
            ]
          : []
      );
      setAiQaMessage(
        recommendations.length > 0
          ? `${data.mode === "provider-backed" ? "Real" : "Mock"} AI QA returned ${recommendations.length} recommendation(s). External API called: ${data.meta?.externalApiCalled === true ? "yes" : "no"}.`
          : "AI QA did not return recommendations for the current PTR."
      );
      logAICallAudit({
        skillId: AI_PROCESS_QA_SKILL_ID,
        success: true,
        realAIEnabled: data.mode === "provider-backed",
        externalApiCalled: data.meta?.externalApiCalled === true,
        extraMetadata: {
          recommendationCount: recommendations.length
        }
      });
    } catch {
      logAICallAudit({
        skillId: AI_PROCESS_QA_SKILL_ID,
        success: false,
        errorMessage: "AI QA request failed.",
        realAIEnabled: realAIQAEnabled,
        externalApiCalled: false
      });
      setAiQaIssues([]);
      setAiQaMessage("AI QA request failed. No recommendation was applied.");
    } finally {
      setIsRunningAIQA(false);
    }
  }

  function rejectSingleRecommendation(reason: string) {
    if (!pendingRecommendation) {
      return;
    }

    saveRecommendationFeedback(
      createRecommendationFeedback(pendingRecommendation.recommendation, "rejected", reason)
    );
    setPendingRecommendation(null);
  }

  function rejectBatchRecommendations(reason: string) {
    if (!pendingBatchRecommendations || !pendingBatchPreview) {
      return;
    }

    saveRecommendationFeedback([
      ...pendingBatchRecommendations.map((recommendation) =>
        createRecommendationFeedback(recommendation, "rejected", reason)
      ),
      {
        recordType: "batchSummary",
        batchId: `batch-${new Date().toISOString()}`,
        recommendationCount: pendingBatchPreview.selectedCount,
        appliedCount: 0,
        skippedCount: pendingBatchPreview.selectedCount,
        affectedStepIds: pendingBatchPreview.affectedStepIds,
        warnings: pendingBatchPreview.warnings,
        conflicts: pendingBatchPreview.conflicts.map((conflict) => conflict.message),
        timestamp: new Date().toISOString()
      }
    ]);
    setPendingBatchRecommendations(null);
  }

  function confirmSingleRecommendation() {
    if (!pendingRecommendation) {
      return;
    }

    saveRecommendationFeedback(
      createRecommendationFeedback(pendingRecommendation.recommendation, "accepted")
    );
    onApplyRecommendation(pendingRecommendation.recommendation);
    setPendingRecommendation(null);
  }

  function confirmBatchRecommendations() {
    if (!pendingBatchRecommendations || !pendingBatchPreview) {
      return;
    }

    const skippedIndexes = new Set(pendingBatchPreview.skippedRecommendationIndexes);
    const timestamp = new Date().toISOString();

    saveRecommendationFeedback([
      ...pendingBatchRecommendations.map((recommendation, index) =>
        createRecommendationFeedback(
          recommendation,
          skippedIndexes.has(index) ? "skipped" : "accepted",
          skippedIndexes.has(index) ? "conflict" : undefined
        )
      ),
      {
        recordType: "batchSummary",
        batchId: `batch-${timestamp}`,
        recommendationCount: pendingBatchPreview.selectedCount,
        appliedCount: pendingBatchPreview.applicableCount,
        skippedCount: pendingBatchPreview.skippedCount,
        affectedStepIds: pendingBatchPreview.affectedStepIds,
        warnings: pendingBatchPreview.warnings,
        conflicts: pendingBatchPreview.conflicts.map((conflict) => conflict.message),
        timestamp
      }
    ]);
    onApplyRecommendations(pendingBatchRecommendations);
    setPendingBatchRecommendations(null);
    clearSelection();
  }

  return (
    <>
    <SessionFrame
      actions={
        <div className="flex flex-wrap gap-2">
        <button
          className="w-fit rounded border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800 hover:bg-sky-100"
          disabled={isRunningAIQA}
          onClick={runAiQa}
          type="button"
        >
          {isRunningAIQA
            ? "Running AI QA..."
            : realAIQAEnabled
              ? "Run real AI QA"
              : "Run mock AI QA"}
        </button>
        <button
          className="w-fit rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={downloadFeedbackJson}
          type="button"
        >
          Export Recommendation Feedback JSON
        </button>
        <button
          className="w-fit rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={clearLocalFeedback}
          type="button"
        >
          Clear Local Feedback
        </button>
        <button
          className="w-fit rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={onDownloadReport}
          type="button"
        >
          Download QA Report
        </button>
        </div>
      }
      bodyClassName="p-4"
      description="QA chạy lại tự động khi dữ liệu trong bảng thay đổi. Click vào issue để nhảy tới dòng liên quan nếu còn tồn tại."
      title="Kiểm tra chất lượng Process Task Register"
    >
      {hasRecommendations ? (
        <div className="mb-4 max-w-full rounded border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase text-emerald-800">
                Batch recommendations
              </p>
              <p className="mt-1 text-sm text-emerald-900">
                {recommendationEntries.length} recommendations | {safeRecommendations.length} safe |{" "}
                {selectedRecommendations.length} selected
              </p>
              <p className="mt-1 text-xs text-emerald-800">
                Safe = high confidence, low risk, and simple field changes only. Graph-changing recommendations are not selected by default.
              </p>
            </div>

            <div className="flex max-w-full flex-wrap items-center gap-2">
              <button
                className="rounded border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={safeRecommendations.length === 0}
                onClick={selectSafeRecommendations}
                type="button"
              >
                Select safe recommendations
              </button>
              <button
                className="rounded border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={selectedRecommendations.length === 0}
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
                className="rounded bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-300"
                disabled={safeRecommendations.length === 0}
                onClick={applyAllSafeRecommendations}
                type="button"
              >
                Apply all safe recommendations
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-4 text-xs text-emerald-900">
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
      ) : null}

      {aiQaMessage ? (
        <p className="mb-4 rounded border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
          {aiQaMessage}
        </p>
      ) : null}

      <p className="mb-4 text-sm font-semibold text-slate-950">
        Tổng số issue: {displayIssues.length}
      </p>

      <div className="grid min-w-0 gap-4">
        {groupedIssues.map((group) => (
          <section className="min-w-0 rounded border border-slate-200" key={group.severity}>
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
                    className="block w-full max-w-full px-4 py-3 text-left hover:bg-slate-50"
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
                              const recommendationId = `${issue.id}:${recommendation.id ?? recommendation.type ?? "recommendation"}:${index}`;

                              if (!visibleRecommendationIds.has(recommendationId)) {
                                return null;
                              }

                              return (
                            <div
                              className={`rounded border p-3 ${recommendationCardStyles[issue.severity]}`}
                              key={recommendationId}
                            >
                              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                <label className="flex gap-2">
                                  <input
                                    checked={selectedRecommendationIds.has(recommendationId)}
                                    className="mt-1"
                                    onChange={() => toggleRecommendation(recommendationId)}
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
    </SessionFrame>

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
                onClick={() => rejectSingleRecommendation("user_cancelled")}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                onClick={confirmSingleRecommendation}
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
              <p>Recommendations: {pendingBatchPreview.selectedCount}</p>
              <p>Will apply: {pendingBatchPreview.applicableCount}</p>
              <p>Skipped due to conflicts: {pendingBatchPreview.skippedCount}</p>
              <p>Affected tasks: {pendingBatchPreview.affectedTaskCount}</p>
              <p>Field changes: {pendingBatchPreview.fieldChangeCount}</p>
              <p>New tasks: {pendingBatchPreview.newTaskCount}</p>
              <p>Connection changes: {pendingBatchPreview.connectionChangeCount}</p>
            </div>
            <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-800">Affected stepIds</p>
              <p className="mt-1 break-words text-sm text-slate-600">
                {pendingBatchPreview.affectedStepIds.length
                  ? pendingBatchPreview.affectedStepIds.join(", ")
                  : "None"}
              </p>
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
                onClick={() => rejectBatchRecommendations("user_cancelled")}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={pendingBatchPreview.applicableCount === 0}
                onClick={confirmBatchRecommendations}
                type="button"
              >
                Confirm Apply Batch
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
