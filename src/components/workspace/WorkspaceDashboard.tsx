"use client";

import { useEffect, useMemo, useState } from "react";
import { loadAuditLog } from "@/lib/audit/audit-log";
import type { Locale } from "@/lib/i18n";
import type { ProcessTask } from "@/lib/models/process-task";
import { validateProcessTasks } from "@/lib/qa/task-register-rules";
import { sampleProcessTasks } from "@/lib/sample-data/sme-online-loan";

type AIStatusResponse = {
  realAIEnabled?: boolean;
  realAIQAEnabled?: boolean;
  realAITemplateReviewEnabled?: boolean;
  provider?: string;
  effectiveProvider?: string;
  fallbackActive?: boolean;
  dataUsageMode?: string;
};

type ArtifactStatus = "fresh" | "stale" | "not_generated";

type WorkspaceDashboardProps = {
  aiStatus: AIStatusResponse;
  locale: Locale;
};

const TASKS_STORAGE_KEY = "process-blueprint-ai-workbench:process-tasks";
const D01_GENERATED_STATUS_KEY =
  "process-blueprint-ai-workbench:generated-d01-bpmn-status";
const D02_GENERATED_STATUS_KEY =
  "process-blueprint-ai-workbench:generated-d02-service-blueprint-status";
const ARTIFACT_STATUS_EVENT = "process-blueprint-artifact-status-change";
const PROCESS_TASKS_EVENT = "process-blueprint-process-tasks-change";

const productDeliveryActions = new Set([
  "generate_brd_preview",
  "generate_srs_preview",
  "generate_user_stories_preview",
  "generate_acceptance_criteria_preview",
  "generate_product_scope_review_preview",
  "generate_requirement_qa_preview",
  "generate_product_delivery_ai_coding_pack",
  "export_product_delivery_draft",
  "export_brd_draft",
  "export_srs_draft",
  "export_user_stories_draft",
  "export_acceptance_criteria_draft",
  "export_product_scope_review_draft",
  "export_product_delivery_ai_coding_pack"
]);

const text = {
  vi: {
    eyebrow: "Bảng điều khiển",
    statusOverview: "Trạng thái workspace",
    aiStatus: "AI / provider",
    ptrStatus: "Dữ liệu PTR",
    qaStatus: "Chất lượng quy trình",
    artifactStatus: "D01/D02",
    productDeliveryStatus: "Product Delivery",
    exportPackageStatus: "Gói xuất / handoff",
    localMock: "Local/mô phỏng",
    localFallback: "Fallback local/mô phỏng",
    serverSideAI: "AI phía máy chủ",
    noBrowserKeys: "Không dùng API key trong trình duyệt",
    ptrSaved: "Đã có PTR",
    ptrSample: "Đang dùng dữ liệu mẫu",
    ptrRows: "dòng",
    qaClear: "Không có vấn đề nổi bật",
    qaNeedsReview: "Cần rà soát QA",
    critical: "nghiêm trọng",
    warnings: "cảnh báo",
    artifactsFresh: "Đã cập nhật",
    artifactsStale: "Cần tạo lại",
    artifactsMissing: "Chưa tạo",
    productReady: "Đã có hoạt động",
    productNotStarted: "Chưa bắt đầu",
    exportReady: "Đã xuất gần đây",
    exportNeedsRefresh: "Cần xuất lại",
    exportNotStarted: "Chưa xuất"
  },
  en: {
    eyebrow: "Dashboard",
    statusOverview: "Workspace status",
    aiStatus: "AI / provider",
    ptrStatus: "PTR data",
    qaStatus: "Process quality",
    artifactStatus: "D01/D02",
    productDeliveryStatus: "Product Delivery",
    exportPackageStatus: "Export / handoff package",
    localMock: "Local/mock",
    localFallback: "Local/mock fallback",
    serverSideAI: "Server-side AI",
    noBrowserKeys: "No browser API keys",
    ptrSaved: "PTR saved",
    ptrSample: "Using sample data",
    ptrRows: "rows",
    qaClear: "No prominent issues",
    qaNeedsReview: "QA review needed",
    critical: "critical",
    warnings: "warnings",
    artifactsFresh: "Up to date",
    artifactsStale: "Regenerate needed",
    artifactsMissing: "Not generated",
    productReady: "Activity exists",
    productNotStarted: "Not started",
    exportReady: "Recently exported",
    exportNeedsRefresh: "Export refresh needed",
    exportNotStarted: "Not exported"
  }
} satisfies Record<Locale, Record<string, string>>;

function hasRealAI(status: AIStatusResponse) {
  return (
    status.realAIEnabled === true ||
    status.realAIQAEnabled === true ||
    status.realAITemplateReviewEnabled === true
  );
}

function readArtifactStatus(key: string): ArtifactStatus {
  const status = window.localStorage.getItem(key);

  return status === "fresh" || status === "stale" ? status : "not_generated";
}

function readProcessTasks() {
  const savedTasks = window.localStorage.getItem(TASKS_STORAGE_KEY);

  if (!savedTasks) {
    return {
      hasSavedTasks: false,
      tasks: sampleProcessTasks
    };
  }

  try {
    const parsedTasks = JSON.parse(savedTasks);

    return {
      hasSavedTasks: Array.isArray(parsedTasks),
      tasks: Array.isArray(parsedTasks) ? (parsedTasks as ProcessTask[]) : sampleProcessTasks
    };
  } catch {
    return {
      hasSavedTasks: false,
      tasks: sampleProcessTasks
    };
  }
}

function getAIStatusValue(status: AIStatusResponse, locale: Locale) {
  const labels = text[locale];
  const provider = status.effectiveProvider ?? status.provider ?? "mock";

  if (status.fallbackActive) {
    return `${labels.localFallback} (${provider})`;
  }

  if (!hasRealAI(status) || provider === "mock") {
    return labels.localMock;
  }

  return `${labels.serverSideAI}: ${provider}`;
}

function formatArtifactStatus(status: ArtifactStatus, locale: Locale) {
  const labels = text[locale];

  if (status === "fresh") {
    return labels.artifactsFresh;
  }

  if (status === "stale") {
    return labels.artifactsStale;
  }

  return labels.artifactsMissing;
}

export function WorkspaceDashboard({ aiStatus, locale }: WorkspaceDashboardProps) {
  const [tasksState, setTasksState] = useState(() => ({
    hasSavedTasks: false,
    tasks: sampleProcessTasks
  }));
  const [d01Status, setD01Status] = useState<ArtifactStatus>("not_generated");
  const [d02Status, setD02Status] = useState<ArtifactStatus>("not_generated");
  const [productDeliveryEventCount, setProductDeliveryEventCount] = useState(0);
  const [exportPackageEventCount, setExportPackageEventCount] = useState(0);
  const labels = text[locale];

  function refreshWorkspaceState() {
    const auditLog = loadAuditLog();

    setTasksState(readProcessTasks());
    setD01Status(readArtifactStatus(D01_GENERATED_STATUS_KEY));
    setD02Status(readArtifactStatus(D02_GENERATED_STATUS_KEY));
    setProductDeliveryEventCount(
      auditLog.filter((entry) => productDeliveryActions.has(entry.action)).length
    );
    setExportPackageEventCount(
      auditLog.filter((entry) => entry.action === "export_zip").length
    );
  }

  useEffect(() => {
    refreshWorkspaceState();

    window.addEventListener(ARTIFACT_STATUS_EVENT, refreshWorkspaceState);
    window.addEventListener(PROCESS_TASKS_EVENT, refreshWorkspaceState);

    return () => {
      window.removeEventListener(ARTIFACT_STATUS_EVENT, refreshWorkspaceState);
      window.removeEventListener(PROCESS_TASKS_EVENT, refreshWorkspaceState);
    };
  }, []);

  const qaIssues = useMemo(
    () => validateProcessTasks(tasksState.tasks),
    [tasksState.tasks]
  );
  const criticalCount = qaIssues.filter((issue) => issue.severity === "error").length;
  const warningCount = qaIssues.filter((issue) => issue.severity === "warning").length;
  const artifactStatuses = [d01Status, d02Status];
  const hasFreshArtifacts = artifactStatuses.every((status) => status === "fresh");
  const hasStaleArtifacts = artifactStatuses.some((status) => status === "stale");
  const hasProductDeliveryActivity = productDeliveryEventCount > 0;
  const hasExportPackage = exportPackageEventCount > 0;

  const exportPackageValue = hasExportPackage
    ? hasFreshArtifacts
      ? labels.exportReady
      : labels.exportNeedsRefresh
    : labels.exportNotStarted;

  const statusCards = [
    {
      title: labels.aiStatus,
      value: getAIStatusValue(aiStatus, locale),
      detail: labels.noBrowserKeys,
      badgeClass: "status-badge status-badge-ai"
    },
    {
      title: labels.ptrStatus,
      value: tasksState.hasSavedTasks ? labels.ptrSaved : labels.ptrSample,
      detail: `${tasksState.tasks.length} ${labels.ptrRows}`,
      badgeClass: "status-badge status-badge-primary"
    },
    {
      title: labels.qaStatus,
      value: qaIssues.length > 0 ? labels.qaNeedsReview : labels.qaClear,
      detail:
        qaIssues.length > 0
          ? `${criticalCount} ${labels.critical} / ${warningCount} ${labels.warnings}`
          : labels.qaClear,
      badgeClass:
        criticalCount > 0
          ? "status-badge status-badge-danger"
          : qaIssues.length > 0
            ? "status-badge status-badge-warning"
            : "status-badge status-badge-success"
    },
    {
      title: labels.artifactStatus,
      value: hasFreshArtifacts
        ? labels.artifactsFresh
        : hasStaleArtifacts
          ? labels.artifactsStale
          : labels.artifactsMissing,
      detail: `D01: ${formatArtifactStatus(d01Status, locale)} / D02: ${formatArtifactStatus(d02Status, locale)}`,
      badgeClass: hasFreshArtifacts
        ? "status-badge status-badge-success"
        : hasStaleArtifacts
          ? "status-badge status-badge-warning"
          : "status-badge status-badge-primary"
    },
    {
      title: labels.productDeliveryStatus,
      value: hasProductDeliveryActivity ? labels.productReady : labels.productNotStarted,
      detail:
        locale === "vi"
          ? `${productDeliveryEventCount} sự kiện`
          : `${productDeliveryEventCount} events`,
      badgeClass: hasProductDeliveryActivity
        ? "status-badge status-badge-success"
        : "status-badge status-badge-primary"
    },
    {
      title: labels.exportPackageStatus,
      value: exportPackageValue,
      detail:
        locale === "vi"
          ? `${exportPackageEventCount} lần xuất`
          : `${exportPackageEventCount} exports`,
      badgeClass:
        hasExportPackage && hasFreshArtifacts
          ? "status-badge status-badge-success"
          : hasExportPackage
            ? "status-badge status-badge-warning"
            : "status-badge status-badge-primary"
    }
  ];

  return (
    <section className="surface-card overflow-hidden">
      <div className="p-4">
        <p className="status-badge status-badge-primary">{labels.eyebrow}</p>
        <h2 className="mt-3 text-xl font-semibold text-slate-950">
          {labels.statusOverview}
        </h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {statusCards.map((card) => (
            <article
              className="compact-card"
              key={card.title}
            >
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {card.title}
              </p>
              <p className={`mt-3 ${card.badgeClass}`}>{card.value}</p>
              <p className="mt-2 text-sm leading-5 text-slate-600">{card.detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
