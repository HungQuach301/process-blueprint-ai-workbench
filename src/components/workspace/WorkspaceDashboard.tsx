"use client";

import { useEffect, useMemo, useState } from "react";
import {
  loadAIRunHistory,
  loadAuditLog,
  type AIRunRecord
} from "@/lib/audit/audit-log";
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
    title: "Workspace",
    eyebrow: "Bảng điều khiển",
    description:
      "Bắt đầu từ brief hoặc file, kiểm tra Process Task Register, tạo Product Delivery và xuất gói bàn giao trong một luồng có kiểm soát.",
    recommendedNextAction: "Hành động nên làm tiếp theo",
    overview: "Tổng quan workspace",
    startHere: "Bắt đầu tại đây",
    recentAIRuns: "Lần chạy AI gần đây",
    aiStatus: "Trạng thái AI",
    ptrStatus: "Trạng thái PTR",
    qaStatus: "Trạng thái QA",
    artifactStatus: "Trạng thái artifact",
    productDeliveryStatus: "Trạng thái Product Delivery",
    localMock: "Local/mock",
    localFallback: "Fallback local/mock",
    serverSideAI: "AI server-side",
    noBrowserKeys: "Không dùng API key trong browser",
    ptrSaved: "PTR đã có dữ liệu",
    ptrSample: "Đang dùng dữ liệu mẫu",
    ptrRows: "dòng",
    qaClear: "Không có issue nổi bật",
    qaNeedsReview: "Cần review QA",
    critical: "critical",
    warnings: "warning",
    artifactsFresh: "D01/D02 fresh",
    artifactsStale: "Có artifact stale",
    artifactsMissing: "Chưa tạo D01/D02",
    productReady: "Đã có hoạt động Product Delivery",
    productNotStarted: "Chưa bắt đầu Product Delivery",
    createFromBrief: "Create from brief",
    importFile: "Import file",
    reviewQA: "Review QA",
    generateProductDelivery: "Generate Product Delivery",
    exportPackage: "Export package",
    noRuns: "Chưa có lịch sử chạy AI.",
    external: "external",
    local: "local/mock",
    success: "success",
    failure: "failure",
    nextCreateBrief: "Tạo brief đầu tiên để sinh Draft PTR có preview trước khi apply.",
    nextReviewQA: "Review QA issue trước khi tạo artifact hoặc export.",
    nextGenerateProduct: "Tạo Product Delivery để chuyển quy trình thành BRD/SRS/user stories.",
    nextGenerateArtifacts: "Tạo lại D01/D02 hoặc output package để artifact fresh.",
    nextExport: "Workspace đã sẵn sàng. Xuất package khi bạn muốn bàn giao."
  },
  en: {
    title: "Workspace",
    eyebrow: "Dashboard",
    description:
      "Start from a brief or file, review the Process Task Register, generate Product Delivery, and export the handoff package through a controlled workflow.",
    recommendedNextAction: "Recommended next action",
    overview: "Workspace overview",
    startHere: "Start here",
    recentAIRuns: "Recent AI runs",
    aiStatus: "AI status",
    ptrStatus: "PTR status",
    qaStatus: "QA status",
    artifactStatus: "Artifact status",
    productDeliveryStatus: "Product Delivery status",
    localMock: "Local/mock",
    localFallback: "Local/mock fallback",
    serverSideAI: "Server-side AI",
    noBrowserKeys: "No browser API keys",
    ptrSaved: "PTR has saved data",
    ptrSample: "Using sample data",
    ptrRows: "rows",
    qaClear: "No prominent issues",
    qaNeedsReview: "QA review needed",
    critical: "critical",
    warnings: "warnings",
    artifactsFresh: "D01/D02 fresh",
    artifactsStale: "Some artifacts are stale",
    artifactsMissing: "D01/D02 not generated",
    productReady: "Product Delivery activity exists",
    productNotStarted: "Product Delivery not started",
    createFromBrief: "Create from brief",
    importFile: "Import file",
    reviewQA: "Review QA",
    generateProductDelivery: "Generate Product Delivery",
    exportPackage: "Export package",
    noRuns: "No AI run history yet.",
    external: "external",
    local: "local/mock",
    success: "success",
    failure: "failure",
    nextCreateBrief: "Create the first brief to generate a Draft PTR with preview before apply.",
    nextReviewQA: "Review QA issues before generating artifacts or exporting.",
    nextGenerateProduct: "Generate Product Delivery to turn the process into BRD/SRS/user stories.",
    nextGenerateArtifacts: "Regenerate D01/D02 or the output package so artifacts are fresh.",
    nextExport: "Workspace is ready. Export the package when you want to hand it off."
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

export function WorkspaceDashboard({ aiStatus, locale }: WorkspaceDashboardProps) {
  const [tasksState, setTasksState] = useState(() => ({
    hasSavedTasks: false,
    tasks: sampleProcessTasks
  }));
  const [d01Status, setD01Status] = useState<ArtifactStatus>("not_generated");
  const [d02Status, setD02Status] = useState<ArtifactStatus>("not_generated");
  const [aiRunHistory, setAIRunHistory] = useState<AIRunRecord[]>([]);
  const [productDeliveryEventCount, setProductDeliveryEventCount] = useState(0);
  const labels = text[locale];

  function refreshWorkspaceState() {
    setTasksState(readProcessTasks());
    setD01Status(readArtifactStatus(D01_GENERATED_STATUS_KEY));
    setD02Status(readArtifactStatus(D02_GENERATED_STATUS_KEY));
    setAIRunHistory(loadAIRunHistory());
    setProductDeliveryEventCount(
      loadAuditLog().filter((entry) => productDeliveryActions.has(entry.action)).length
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
  const recentAIRuns = aiRunHistory.slice(0, 3);

  const recommendedAction = useMemo(() => {
    if (!tasksState.hasSavedTasks) {
      return {
        label: labels.createFromBrief,
        href: "#input-brief",
        description: labels.nextCreateBrief
      };
    }

    if (criticalCount > 0 || warningCount > 0) {
      return {
        label: labels.reviewQA,
        href: "#process-task-register",
        description: labels.nextReviewQA
      };
    }

    if (!hasProductDeliveryActivity) {
      return {
        label: labels.generateProductDelivery,
        href: "#product-delivery",
        description: labels.nextGenerateProduct
      };
    }

    if (!hasFreshArtifacts || hasStaleArtifacts) {
      return {
        label: labels.exportPackage,
        href: "#export-center",
        description: labels.nextGenerateArtifacts
      };
    }

    return {
      label: labels.exportPackage,
      href: "#export-center",
      description: labels.nextExport
    };
  }, [
    criticalCount,
    hasFreshArtifacts,
    hasProductDeliveryActivity,
    hasStaleArtifacts,
    labels,
    tasksState.hasSavedTasks,
    warningCount
  ]);

  const overviewCards = [
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
      detail: `D01: ${d01Status} / D02: ${d02Status}`,
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
    }
  ];

  const startActions = [
    { label: labels.createFromBrief, href: "#input-brief" },
    { label: labels.importFile, href: "#input-brief" },
    { label: labels.reviewQA, href: "#process-task-register" },
    { label: labels.generateProductDelivery, href: "#product-delivery" },
    { label: labels.exportPackage, href: "#export-center" }
  ];

  return (
    <section className="surface-card overflow-hidden">
      <div className="border-b border-slate-200 bg-white p-6">
        <p className="status-badge status-badge-primary">{labels.eyebrow}</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">{labels.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {labels.description}
            </p>
          </div>
          <a className="btn btn-primary" href={recommendedAction.href}>
            {recommendedAction.label}
          </a>
        </div>
      </div>

      <div className="grid gap-4 bg-slate-50/70 p-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="soft-panel p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
            {labels.recommendedNextAction}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-950">
            {recommendedAction.label}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {recommendedAction.description}
          </p>
        </div>

        <div className="soft-panel p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {labels.recentAIRuns}
          </p>
          {recentAIRuns.length > 0 ? (
            <div className="mt-3 space-y-2">
              {recentAIRuns.map((run) => (
                <div
                  className="rounded border border-slate-200 bg-white p-3"
                  key={run.id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {run.skillId}
                    </p>
                    <span
                      className={`status-badge ${
                        run.status === "success"
                          ? "status-badge-success"
                          : "status-badge-danger"
                      }`}
                    >
                      {labels[run.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {run.provider || "unknown"} /{" "}
                    {run.externalApiCalled ? labels.external : labels.local}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">{labels.noRuns}</p>
          )}
        </div>
      </div>

      <div className="p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {labels.overview}
        </p>
      </div>
      <div className="grid gap-4 px-4 pb-4 lg:grid-cols-5">
        {overviewCards.map((card) => (
          <article className="rounded-md border border-slate-200 bg-white p-4" key={card.title}>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {card.title}
            </p>
            <p className={`mt-3 ${card.badgeClass}`}>{card.value}</p>
            <p className="mt-2 text-sm text-slate-600">{card.detail}</p>
          </article>
        ))}
      </div>

      <div className="border-t border-slate-200 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {labels.startHere}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {startActions.map((action, index) => (
            <a
              className={index === 0 ? "btn btn-primary" : "btn btn-secondary"}
              href={action.href}
              key={action.label}
            >
              {action.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
