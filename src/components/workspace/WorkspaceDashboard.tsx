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
    heroTitle: "Bắt đầu biến ý định nghiệp vụ thành bộ hồ sơ bàn giao AI-ready.",
    heroSubtitle:
      "Đi từ tóm tắt, tệp hoặc mẫu ngân hàng sang Process Task Register, rồi tạo D01 BPMN/D02 Service Blueprint, hồ sơ Product Delivery và AI Development Handoff Pack.",
    journeyBrief: "Tóm tắt / tệp / mẫu",
    journeyPtr: "PTR",
    journeyProcess: "D01 BPMN / D02",
    journeyProduct: "Product Delivery",
    journeyHandoff: "AI Handoff",
    statusOverview: "Trạng thái workspace",
    recommendedNextAction: "Hành động nên làm tiếp theo",
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
    exportNotStarted: "Chưa xuất",
    startFromBrief: "Start from brief",
    importFile: "Import file",
    useBankingTemplate: "Use banking template",
    reviewProcessQuality: "Review process quality",
    generateProductDeliveryDraft: "Generate product delivery draft",
    exportAIHandoffPack: "Export AI handoff pack",
    nextCreateBrief: "Chưa có PTR đã lưu. Hãy bắt đầu từ tóm tắt hoặc nhập tệp để tạo bản nháp PTR.",
    nextReviewQA: "PTR đang có vấn đề/cảnh báo. Hãy rà soát QA trước khi tạo BPMN, D02 hoặc hồ sơ sản phẩm.",
    nextRegenerateArtifacts: "D01/D02 đang thiếu hoặc cần tạo lại. Hãy tạo lại artifact từ PTR hiện tại.",
    nextGenerateProduct: "Quy trình đã sẵn sàng. Hãy tạo bản nháp Product Delivery để chuyển sang BRD/SRS/user stories.",
    nextExportHandoff: "Đã có Product Delivery. Hãy preview và xuất AI Development Handoff Pack.",
    nextExportPackage: "Workspace đã sẵn sàng. Hãy xuất gói bàn giao/audit khi cần chia sẻ."
  },
  en: {
    eyebrow: "Dashboard",
    heroTitle: "Start turning business intent into AI-ready delivery artifacts.",
    heroSubtitle:
      "Move from a brief, file, or banking template into the Process Task Register, then generate D01 BPMN/D02 Service Blueprint, Product Delivery, and the AI Development Handoff Pack.",
    journeyBrief: "Brief / file / template",
    journeyPtr: "PTR",
    journeyProcess: "D01 BPMN / D02",
    journeyProduct: "Product Delivery",
    journeyHandoff: "AI Handoff",
    statusOverview: "Workspace status",
    recommendedNextAction: "Recommended next action",
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
    exportNotStarted: "Not exported",
    startFromBrief: "Start from brief",
    importFile: "Import file",
    useBankingTemplate: "Use banking template",
    reviewProcessQuality: "Review process quality",
    generateProductDeliveryDraft: "Generate product delivery draft",
    exportAIHandoffPack: "Export AI handoff pack",
    nextCreateBrief: "No saved PTR yet. Start from a brief or file to create a Draft PTR.",
    nextReviewQA: "PTR has issues or warnings. Review QA before creating BPMN, D02, or Product Delivery.",
    nextRegenerateArtifacts: "D01/D02 are missing or stale. Regenerate artifacts from the current PTR.",
    nextGenerateProduct: "The process is ready. Generate Product Delivery drafts for BRD/SRS/user stories.",
    nextExportHandoff: "Product Delivery exists. Preview and export the AI Development Handoff Pack.",
    nextExportPackage: "Workspace is ready. Export the handoff/audit package when needed."
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
  const hasMissingArtifacts = artifactStatuses.some((status) => status === "not_generated");
  const hasStaleArtifacts = artifactStatuses.some((status) => status === "stale");
  const hasProductDeliveryActivity = productDeliveryEventCount > 0;
  const hasExportPackage = exportPackageEventCount > 0;

  const exportPackageValue = hasExportPackage
    ? hasFreshArtifacts
      ? labels.exportReady
      : labels.exportNeedsRefresh
    : labels.exportNotStarted;

  const recommendedAction = useMemo(() => {
    if (!tasksState.hasSavedTasks) {
      return {
        label: labels.startFromBrief,
        href: "#input-brief",
        description: labels.nextCreateBrief
      };
    }

    if (criticalCount > 0 || warningCount > 0) {
      return {
        label: labels.reviewProcessQuality,
        href: "#qa-panel",
        description: labels.nextReviewQA
      };
    }

    if (hasMissingArtifacts || hasStaleArtifacts) {
      return {
        label: labels.exportPackageStatus,
        href: "#d01-bpmn-preview",
        description: labels.nextRegenerateArtifacts
      };
    }

    if (!hasProductDeliveryActivity) {
      return {
        label: labels.generateProductDeliveryDraft,
        href: "#product-delivery",
        description: labels.nextGenerateProduct
      };
    }

    if (!hasExportPackage) {
      return {
        label: labels.exportAIHandoffPack,
        href: "#product-delivery",
        description: labels.nextExportHandoff
      };
    }

    return {
      label: labels.exportPackageStatus,
      href: "#export-center",
      description: labels.nextExportPackage
    };
  }, [
    criticalCount,
    hasExportPackage,
    hasMissingArtifacts,
    hasProductDeliveryActivity,
    hasStaleArtifacts,
    labels,
    tasksState.hasSavedTasks,
    warningCount
  ]);

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
      <div className="section-header p-5">
        <p className="status-badge status-badge-primary">{labels.eyebrow}</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.45fr_0.85fr] lg:items-end">
          <div>
            <h2 className="max-w-4xl text-2xl font-semibold leading-tight text-slate-950">
              {labels.heroTitle}
            </h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
              {labels.heroSubtitle}
            </p>
          </div>
          <div className="compact-card bg-blue-50/70">
            <div className="grid gap-2 text-sm font-semibold text-blue-950">
              {[
                labels.journeyBrief,
                labels.journeyPtr,
                labels.journeyProcess,
                labels.journeyProduct,
                labels.journeyHandoff
              ].map((step, index, steps) => (
                <div className="flex items-center gap-2" key={step}>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs text-blue-700 shadow-sm">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                  {index < steps.length - 1 ? (
                    <span className="ml-auto text-blue-400">-&gt;</span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50/70 p-4">
        <div className="compact-card">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
            {labels.recommendedNextAction}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">
            {recommendedAction.label}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {recommendedAction.description}
          </p>
          <a className="btn btn-primary mt-4" href={recommendedAction.href}>
            {recommendedAction.label}
          </a>
        </div>
      </div>

      <div className="border-t border-slate-200 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {labels.statusOverview}
        </p>
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
