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
import { getLocale, type Locale } from "@/lib/i18n";

const TEMPLATES_STORAGE_KEY =
  "process-blueprint-ai-workbench:template-profiles";
const D01_STORAGE_KEY = "process-blueprint-ai-workbench:selected-d01-template";
const D02_STORAGE_KEY = "process-blueprint-ai-workbench:selected-d02-template";
const AI_PROCESS_QA_SKILL_ID = "ai-process-qa";
const LOCALE_EVENT = "process-blueprint-locale-change";

type CompareProviderId = "product-ai" | "openai" | "claude" | "mock";

type AIQACompareResult = {
  id: string;
  providerId: CompareProviderId;
  model: string;
  confidence: string;
  warnings: string[];
  summary: string;
  validationStatus: string;
  recommendations: QARecommendation[];
  error?: string;
};

const compareProviders: Array<{ id: CompareProviderId; label: string }> = [
  { id: "product-ai", label: "Product AI" },
  { id: "openai", label: "OpenAI" },
  { id: "claude", label: "Claude" },
  { id: "mock", label: "Local/Mock" }
];

const qaPanelText = {
  vi: {
    title: "Bảng kiểm tra QA",
    description: "QA tự chạy lại khi dữ liệu trong bảng thay đổi. Chọn issue để nhảy tới dòng liên quan nếu còn tồn tại.",
    downloadReport: "Tải báo cáo QA",
    recommendationToolbar: "Thanh đề xuất",
    recommendations: "đề xuất",
    selected: "đã chọn",
    safeHelper: "An toàn = độ tin cậy cao, rủi ro thấp và chỉ đổi trường đơn giản. Đề xuất đổi graph không được chọn mặc định.",
    selectSafe: "Chọn đề xuất an toàn",
    applySelected: "Áp dụng mục đã chọn",
    more: "Thêm",
    clearSelection: "Xóa lựa chọn",
    applyAllSafe: "Áp dụng tất cả đề xuất an toàn",
    exportFeedback: "Xuất feedback JSON",
    clearLocalFeedback: "Xóa feedback local",
    running: "Đang chạy AI QA...",
    runReal: "Chạy AI QA",
    runMock: "Chạy mock QA",
    showOnlySafe: "Chỉ hiện đề xuất an toàn",
    includeMedium: "Bao gồm mức trung bình",
    includeGraph: "Hiển thị thay đổi cấu trúc nâng cao",
    providerCompare: "So sánh provider",
    totalIssues: "Tổng số issue",
    noRecommendations: "Chưa có đề xuất tự động.",
    hiddenAdvanced: "Thay đổi cấu trúc nâng cao đang được ẩn.",
    automaticRecommendations: "Gợi ý tự động",
    suggestedFix: "Cách sửa",
    noIssuesInGroup: "Không có issue trong nhóm này.",
    critical: "Nghiêm trọng",
    warnings: "Cảnh báo",
    suggestions: "Gợi ý",
    advancedStructureChanges: "Thay đổi cấu trúc nâng cao",
    confidence: "Độ tin cậy",
    impact: "Tác động",
    risk: "Rủi ro",
    affectedSteps: "Bước bị ảnh hưởng",
    changeSummary: "Tóm tắt thay đổi",
    previewChange: "Xem trước thay đổi",
    none: "Không có"
  },
  en: {
    title: "QA Panel",
    description: "QA reruns automatically when table data changes. Click an issue to jump to the related row when it still exists.",
    downloadReport: "Download QA Report",
    recommendationToolbar: "Recommendation toolbar",
    recommendations: "recommendations",
    selected: "selected",
    safeHelper: "Safe = high confidence, low risk, and simple field changes only. Graph-changing recommendations are not selected by default.",
    selectSafe: "Select safe",
    applySelected: "Apply selected",
    more: "More",
    clearSelection: "Clear selection",
    applyAllSafe: "Apply all safe recommendations",
    exportFeedback: "Export feedback JSON",
    clearLocalFeedback: "Clear local feedback",
    running: "Running AI QA...",
    runReal: "Run AI QA",
    runMock: "Run mock QA",
    showOnlySafe: "Show only safe recommendations",
    includeMedium: "Include medium confidence/impact",
    includeGraph: "Show advanced structure changes",
    providerCompare: "Provider Compare",
    totalIssues: "Total issues",
    noRecommendations: "No automatic recommendations yet.",
    hiddenAdvanced: "Advanced structure changes are hidden.",
    automaticRecommendations: "Automatic recommendations",
    suggestedFix: "Suggested fix",
    noIssuesInGroup: "No issues in this group.",
    critical: "Critical",
    warnings: "Warnings",
    suggestions: "Suggestions",
    advancedStructureChanges: "Advanced structure changes",
    confidence: "Confidence",
    impact: "Impact",
    risk: "Risk",
    affectedSteps: "Affected steps",
    changeSummary: "Change summary",
    previewChange: "Preview change",
    none: "None"
  }
} satisfies Record<Locale, Record<string, string>>;

type QAPanelProps = {
  issues: QaIssue[];
  processTasks: ProcessTask[];
  onIssueClick: (stepId: string) => void;
  onDownloadReport: () => void;
  onApplyRecommendation: (recommendation: QARecommendation) => void;
  onApplyRecommendations: (recommendations: QARecommendation[]) => void;
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

const advancedGroupStyles = "border-violet-200 bg-violet-50 text-violet-800";
const advancedRecommendationBoxStyle = "border-violet-200 bg-violet-50";
const advancedRecommendationCardStyle = "border-violet-200 bg-white";

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

function isAdvancedStructureRecommendation(recommendation: QARecommendation) {
  return isGraphChangingRecommendation(recommendation);
}

function canSelectAsSafeRecommendation(
  recommendation: QARecommendation,
  includeMediumImpact: boolean
) {
  if (isAdvancedStructureRecommendation(recommendation)) {
    return false;
  }

  if (recommendation.riskLevel !== "low") {
    return false;
  }

  if (recommendation.impact === "high") {
    return false;
  }

  if (recommendation.impact === "medium" && !includeMediumImpact) {
    return false;
  }

  if (recommendation.confidence === "high") {
    return true;
  }

  return includeMediumImpact && recommendation.confidence === "medium";
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
  const [locale, setActiveLocale] = useState<Locale>("vi");
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
  const [includeGraphChanging, setIncludeGraphChanging] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [compareModeEnabled, setCompareModeEnabled] = useState(false);
  const [compareProviderIds, setCompareProviderIds] = useState<CompareProviderId[]>([]);
  const [compareResults, setCompareResults] = useState<AIQACompareResult[]>([]);
  const [isRunningCompare, setIsRunningCompare] = useState(false);
  useEffect(() => {
    setActiveLocale(getLocale());
    setAiQaIssues([]);
    setAiQaMessage("");
  }, [processTasks]);

  useEffect(() => {
    function handleLocaleChange(event: Event) {
      const localeDetail = (event as CustomEvent<{ locale?: Locale }>).detail;

      if (localeDetail?.locale) {
        setActiveLocale(localeDetail.locale);
      }
    }

    window.addEventListener(LOCALE_EVENT, handleLocaleChange);

    return () => {
      window.removeEventListener(LOCALE_EVENT, handleLocaleChange);
    };
  }, []);

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
      const isSafe = canSelectAsSafeRecommendation(
        entry.recommendation,
        includeMediumConfidence
      );
      const isGraphChanging = isAdvancedStructureRecommendation(entry.recommendation);

      if (!includeGraphChanging && isGraphChanging) {
        return;
      }

      if (showOnlySafe && !isSafe) {
        return;
      }

      ids.add(entry.id);
    });

    return ids;
  }, [includeGraphChanging, includeMediumConfidence, recommendationEntries, showOnlySafe]);
  const selectedRecommendations = recommendationEntries
    .filter(
      (entry) =>
        selectedRecommendationIds.has(entry.id) && visibleRecommendationIds.has(entry.id)
    )
    .map((entry) => entry.recommendation);
  const safeRecommendationEntries = recommendationEntries.filter((entry) =>
    canSelectAsSafeRecommendation(entry.recommendation, includeMediumConfidence)
  );
  const safeRecommendations = safeRecommendationEntries.map((entry) => entry.recommendation);
  const existingRuleRecommendations = useMemo(
    () => issues.flatMap((issue) => issue.recommendations ?? []),
    [issues]
  );
  const hasRecommendations = recommendationEntries.length > 0;
  const text = qaPanelText[locale];
  const localizedSeverityLabels: Record<QaSeverity, string> = {
    error: text.critical,
    warning: text.warnings,
    suggestion: text.suggestions
  };
  const groupedIssues = [
    {
      key: "error",
      label: localizedSeverityLabels.error,
      issues: displayIssues.filter(
        (issue) =>
          issue.severity === "error" &&
          !(
            includeGraphChanging &&
            issue.recommendations?.some(isAdvancedStructureRecommendation)
          )
      ),
      severity: "error" as QaSeverity
    },
    {
      key: "warning",
      label: localizedSeverityLabels.warning,
      issues: displayIssues.filter(
        (issue) =>
          issue.severity === "warning" &&
          !(
            includeGraphChanging &&
            issue.recommendations?.some(isAdvancedStructureRecommendation)
          )
      ),
      severity: "warning" as QaSeverity
    },
    {
      key: "suggestion",
      label: localizedSeverityLabels.suggestion,
      issues: displayIssues.filter(
        (issue) =>
          issue.severity === "suggestion" &&
          !(
            includeGraphChanging &&
            issue.recommendations?.some(isAdvancedStructureRecommendation)
          )
      ),
      severity: "suggestion" as QaSeverity
    },
    {
      key: "advanced",
      label: text.advancedStructureChanges,
      issues: includeGraphChanging
        ? displayIssues.filter((issue) =>
            issue.recommendations?.some(isAdvancedStructureRecommendation)
          )
        : [],
      severity: "suggestion" as QaSeverity,
      isAdvanced: true
    }
  ];
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
          .filter((entry) =>
            canSelectAsSafeRecommendation(entry.recommendation, includeMediumConfidence)
          )
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

  function toggleCompareProvider(providerId: CompareProviderId) {
    setCompareProviderIds((currentIds) =>
      currentIds.includes(providerId)
        ? currentIds.filter((id) => id !== providerId)
        : [...currentIds, providerId]
    );
  }

  function summarizeQARecommendations(recommendations: QARecommendation[]) {
    const highConfidenceCount = recommendations.filter(
      (recommendation) => recommendation.confidence === "high"
    ).length;
    const highRiskCount = recommendations.filter(
      (recommendation) => recommendation.riskLevel === "high"
    ).length;

    return `${recommendations.length} recommendation(s), ${highConfidenceCount} high confidence, ${highRiskCount} high risk.`;
  }

  async function runAiQaCompare() {
    if (!compareModeEnabled) {
      return;
    }

    if (compareProviderIds.length === 0) {
      setAiQaMessage("Choose at least one provider before running Provider Compare.");
      return;
    }

    const usesCloudProvider = compareProviderIds.some((providerId) => providerId !== "mock");

    if (compareProviderIds.length > 1 && usesCloudProvider) {
      const confirmed = window.confirm(
        "Provider Compare will call multiple selected providers and may increase cost. Continue?"
      );

      if (!confirmed) {
        setAiQaMessage("Provider Compare cancelled. No recommendation was applied.");
        return;
      }
    }

    if (!confirmRealAICallIfNeeded(realAIQAEnabled && usesCloudProvider)) {
      setAiQaMessage("Provider Compare cancelled by cloud AI consent check.");
      return;
    }

    setIsRunningCompare(true);
    setCompareResults([]);
    setAiQaMessage("Running Provider Compare for AI QA...");

    const nextResults: AIQACompareResult[] = [];

    for (const providerId of compareProviderIds) {
      try {
        const routeResponse = await fetch("/api/ai/run-skill", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            skillId: AI_PROCESS_QA_SKILL_ID,
            providerId,
            payload: {
              processTasks,
              qaIssues: issues,
              existingRecommendations: existingRuleRecommendations,
              templateProfiles: readSelectedTemplateProfiles()
            }
          })
        });
        const data = (await routeResponse.json()) as {
          ok?: boolean;
          mode?: "mock" | "provider-backed";
          provider?: string;
          model?: string;
          result?: {
            recommendations?: QARecommendation[];
          };
          error?: string;
          validationErrors?: string[];
          meta?: {
            providerId?: string;
            model?: string;
            warnings?: string[];
            validationPassed?: boolean;
            externalApiCalled?: boolean;
          };
        };
        const recommendations = (data.result?.recommendations ?? []).map(
          (recommendation) => ({
            ...recommendation,
            source:
              recommendation.source === "hybrid"
                ? ("hybrid" as const)
                : ("ai" as const),
            requiresConfirmation: true
          })
        );
        const errorMessage = [
          data.error,
          ...(data.validationErrors ?? [])
        ]
          .filter(Boolean)
          .join(" ");

        nextResults.push({
          id: `${AI_PROCESS_QA_SKILL_ID}-${providerId}-${Date.now()}`,
          providerId,
          model: data.meta?.model ?? data.model ?? "",
          confidence:
            recommendations.find((recommendation) => recommendation.confidence === "high")
              ? "high"
              : recommendations[0]?.confidence ?? "unknown",
          warnings: data.meta?.warnings ?? [],
          summary: routeResponse.ok && data.ok
            ? summarizeQARecommendations(recommendations)
            : errorMessage || "Provider run failed.",
          validationStatus:
            data.meta?.validationPassed === false || !routeResponse.ok || !data.ok
              ? "failed"
              : "passed",
          recommendations: routeResponse.ok && data.ok ? recommendations : [],
          error: routeResponse.ok && data.ok ? undefined : errorMessage
        });
        logAICallAudit({
          skillId: AI_PROCESS_QA_SKILL_ID,
          success: routeResponse.ok && data.ok === true,
          errorMessage: routeResponse.ok && data.ok ? undefined : errorMessage,
          realAIEnabled: data.mode === "provider-backed",
          externalApiCalled: data.meta?.externalApiCalled === true,
          provider: data.meta?.providerId ?? data.provider ?? providerId,
          model: data.meta?.model,
          warnings: data.meta?.warnings,
          validationPassed: data.meta?.validationPassed,
          extraMetadata: {
            compareMode: true,
            recommendationCount: recommendations.length
          }
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Provider compare request failed.";

        nextResults.push({
          id: `${AI_PROCESS_QA_SKILL_ID}-${providerId}-${Date.now()}`,
          providerId,
          model: "",
          confidence: "unknown",
          warnings: [],
          summary: errorMessage,
          validationStatus: "failed",
          recommendations: [],
          error: errorMessage
        });
        logAICallAudit({
          skillId: AI_PROCESS_QA_SKILL_ID,
          success: false,
          errorMessage,
          realAIEnabled: realAIQAEnabled && providerId !== "mock",
          externalApiCalled: false,
          provider: providerId,
          extraMetadata: {
            compareMode: true
          }
        });
      }
    }

    setCompareResults(nextResults);
    setAiQaMessage("Provider Compare finished. Choose one provider output to preview further.");
    setIsRunningCompare(false);
  }

  function useCompareResult(result: AIQACompareResult) {
    setAiQaIssues(
      result.recommendations.length > 0
        ? [
            {
              id: `ai-process-qa-compare-${Date.now()}`,
              issueCode: "SERVICE_BLUEPRINT_CARD_READINESS",
              stepId:
                result.recommendations[0].targetStepIds[0] ??
                processTasks[0]?.stepId ??
                "AI",
              taskName: `${result.providerId} AI QA recommendation`,
              severity: "suggestion",
              message:
                "Provider Compare output selected for the existing Recommendation Engine workflow.",
              suggestedFix:
                "Review the selected provider recommendation, preview the operation, then apply only after confirmation.",
              recommendations: result.recommendations
            }
          ]
        : []
    );
    clearSelection();
    setAiQaMessage(
      locale === "vi"
        ? `Đã chọn output từ ${result.providerId} để preview AI QA.`
        : `Selected ${result.providerId} output for AI QA preview.`
    );
  }

  async function runAiQa() {
    if (!confirmRealAICallIfNeeded(realAIQAEnabled)) {
      setAiQaMessage(
        locale === "vi"
          ? "Đã hủy gọi Real AI QA. Không có recommendation nào được tạo."
          : "Real AI QA call cancelled. No recommendation was created."
      );
      return;
    }

    setIsRunningAIQA(true);
    setAiQaMessage(
      realAIQAEnabled
        ? locale === "vi"
          ? "Đang chạy Real AI QA qua route server-side..."
          : "Running real AI QA through the server route..."
        : locale === "vi"
          ? "Đang chạy mock AI QA. Real AI QA đang tắt."
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
            existingRecommendations: existingRuleRecommendations,
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
          source: recommendation.source === "hybrid" ? ("hybrid" as const) : ("ai" as const),
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
          recommendationCount: recommendations.length,
          ruleIssueCount: issues.length,
          existingRecommendationCount: existingRuleRecommendations.length
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
            className="w-fit rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={onDownloadReport}
            type="button"
          >
            {text.downloadReport}
          </button>
        </div>
      }
      bodyClassName="p-4"
      description={text.description}
      title={text.title}
    >
      {hasRecommendations ? (
        <div className="mb-4 max-w-full rounded border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase text-emerald-800">
                {text.recommendationToolbar}
              </p>
              <p className="mt-1 text-sm text-emerald-900">
                {recommendationEntries.length} {text.recommendations} | {selectedRecommendations.length} {text.selected}
              </p>
              <p className="mt-1 text-xs text-emerald-800">
                {text.safeHelper}
              </p>
            </div>

            <div className="flex max-w-full flex-wrap items-center gap-2">
              <button
                className="rounded border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={safeRecommendations.length === 0}
                onClick={selectSafeRecommendations}
                type="button"
              >
                {text.selectSafe}
              </button>
              <button
                className="btn btn-success text-xs"
                disabled={selectedRecommendations.length === 0}
                onClick={applySelectedRecommendations}
                type="button"
              >
                {text.applySelected} ({selectedRecommendations.length})
              </button>
              <div className="relative">
                <button
                  className="rounded border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
                  onClick={() => setIsMoreMenuOpen((isOpen) => !isOpen)}
                  type="button"
                >
                  {text.more}
                </button>
                {isMoreMenuOpen ? (
                  <div className="absolute right-0 z-20 mt-2 w-64 rounded border border-slate-200 bg-white p-1 text-sm shadow-lg">
                    <button
                      className="block w-full rounded px-3 py-2 text-left text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={selectedRecommendations.length === 0}
                      onClick={() => {
                        clearSelection();
                        setIsMoreMenuOpen(false);
                      }}
                      type="button"
                    >
                      {text.clearSelection}
                    </button>
                    <button
                      className="block w-full rounded px-3 py-2 text-left text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={safeRecommendations.length === 0}
                      onClick={() => {
                        applyAllSafeRecommendations();
                        setIsMoreMenuOpen(false);
                      }}
                      type="button"
                    >
                      {text.applyAllSafe}
                    </button>
                    <button
                      className="block w-full rounded px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        downloadFeedbackJson();
                        setIsMoreMenuOpen(false);
                      }}
                      type="button"
                    >
                      {text.exportFeedback}
                    </button>
                    <button
                      className="block w-full rounded px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        clearLocalFeedback();
                        setIsMoreMenuOpen(false);
                      }}
                      type="button"
                    >
                      {text.clearLocalFeedback}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-emerald-900">
            <button
              className="rounded border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isRunningAIQA}
              onClick={runAiQa}
              type="button"
            >
              {isRunningAIQA
                ? text.running
                : realAIQAEnabled
                  ? text.runReal
                  : text.runMock}
            </button>
            <label className="flex items-center gap-2">
              <input
                checked={compareModeEnabled}
                onChange={(event) => setCompareModeEnabled(event.target.checked)}
                type="checkbox"
              />
              {text.providerCompare}
            </label>
            {compareModeEnabled ? (
              <>
                {compareProviders.map((provider) => (
                  <label className="flex items-center gap-1" key={provider.id}>
                    <input
                      checked={compareProviderIds.includes(provider.id)}
                      onChange={() => toggleCompareProvider(provider.id)}
                      type="checkbox"
                    />
                    {provider.label}
                  </label>
                ))}
                <button
                  className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isRunningCompare}
                  onClick={() => void runAiQaCompare()}
                  type="button"
                >
                  {isRunningCompare ? "Comparing..." : "Compare providers"}
                </button>
              </>
            ) : null}
            <label className="flex items-center gap-2">
              <input
                checked={showOnlySafe}
                onChange={(event) => setShowOnlySafe(event.target.checked)}
                type="checkbox"
              />
              {text.showOnlySafe}
            </label>
            <label className="flex items-center gap-2">
              <input
                checked={includeMediumConfidence}
                onChange={(event) => setIncludeMediumConfidence(event.target.checked)}
                type="checkbox"
              />
              {text.includeMedium}
            </label>
            <label className="flex items-center gap-2">
              <input
                checked={includeGraphChanging}
                onChange={(event) => setIncludeGraphChanging(event.target.checked)}
                type="checkbox"
              />
              {text.includeGraph}
            </label>
          </div>
        </div>
      ) : null}

      {compareResults.length > 0 ? (
        <div className="mb-4 grid gap-3 lg:grid-cols-2">
          {compareResults.map((result) => (
            <div
              className="rounded border border-slate-200 bg-white p-3"
              key={result.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {result.providerId}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Model: {result.model || "n/a"}
                  </p>
                </div>
                <span
                  className={`rounded px-2 py-1 text-xs font-semibold ${
                    result.validationStatus === "passed"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {result.validationStatus}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{result.summary}</p>
              <p className="mt-1 text-xs text-slate-500">
                Confidence: {result.confidence} | Warnings:{" "}
                {result.warnings.length}
              </p>
              {result.error ? (
                <p className="mt-2 text-xs text-rose-700">{result.error}</p>
              ) : null}
              <button
                className="btn btn-ai mt-3 text-xs"
                disabled={result.recommendations.length === 0}
                onClick={() => useCompareResult(result)}
                type="button"
              >
                Use this output
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {aiQaMessage ? (
        <p className="mb-4 rounded border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
          {aiQaMessage}
        </p>
      ) : null}

      <p className="mb-4 text-sm font-semibold text-slate-950">
        {text.totalIssues}: {displayIssues.length}
      </p>

      <div className="grid w-full max-w-full min-w-0 gap-4 overflow-x-auto">
        {groupedIssues.map((group) => (
          <section className="min-w-0 rounded border border-slate-200" key={group.key}>
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-950">
                {group.label}
              </h3>
              <span
                className={`rounded border px-2 py-1 text-xs font-semibold ${
                  group.isAdvanced ? advancedGroupStyles : severityStyles[group.severity]
                }`}
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
                          {localizedSeverityLabels[issue.severity]}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-950">
                        {issue.taskName}
                      </p>
                      <p className="mt-1 text-sm text-slate-700">{issue.message}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {text.suggestedFix}: {issue.suggestedFix}
                      </p>
                    </button>
                    <div
                      className={`mt-3 rounded border p-3 ${
                        group.isAdvanced
                          ? advancedRecommendationBoxStyle
                          : recommendationBoxStyles[issue.severity]
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase text-slate-600">
                        {text.automaticRecommendations}
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
                              className={`rounded border p-3 ${
                                group.isAdvanced
                                  ? advancedRecommendationCardStyle
                                  : recommendationCardStyles[issue.severity]
                              }`}
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
                                    {text.confidence}: {recommendation.confidence} | {text.impact}:{" "}
                                    {recommendation.impact} | {text.risk}: {recommendation.riskLevel ?? "medium"}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {text.affectedSteps}:{" "}
                                    {getAffectedStepIds(recommendation).length
                                      ? getAffectedStepIds(recommendation).join(", ")
                                      : text.none}
                                  </p>
                                  </span>
                                </label>
                                <button
                                  className="btn btn-ai w-fit text-xs"
                                  onClick={() =>
                                    setPendingRecommendation({
                                      issue,
                                      recommendation
                                    })
                                  }
                                  type="button"
                                >
                                  {text.previewChange}
                                </button>
                              </div>
                              {recommendation.previewText ? (
                                <p className="mt-1 whitespace-pre-line text-xs text-slate-500">
                                  {text.changeSummary}: {recommendation.previewText}
                                </p>
                              ) : null}
                            </div>
                              );
                            })()
                          ))}
                          {issue.recommendations.every((recommendation, index) => {
                            const recommendationId = `${issue.id}:${recommendation.id ?? recommendation.type ?? "recommendation"}:${index}`;

                            return !visibleRecommendationIds.has(recommendationId);
                          }) ? (
                            <p className="text-sm text-slate-600">
                              {text.hiddenAdvanced}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-slate-600">
                          {text.noRecommendations}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-4 py-3 text-sm text-slate-500">
                {text.noIssuesInGroup}
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
                className="btn btn-success"
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
                className="btn btn-success"
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
