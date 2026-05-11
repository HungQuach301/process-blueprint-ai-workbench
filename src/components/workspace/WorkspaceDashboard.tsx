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
    eyebrow: "Bảng điều khiển RC4",
    heroTitle: "Bắt đầu biến ý định nghiệp vụ thành bộ hồ sơ bàn giao AI-ready.",
    heroSubtitle:
      "Đi từ tóm tắt, tệp hoặc mẫu ngân hàng sang Process Task Register, rồi tạo D01 BPMN/D02 Service Blueprint, hồ sơ Product Delivery và AI Development Handoff Pack.",
    heroCta: "Bắt đầu từ tóm tắt",
    secondaryCta: "Xem mẫu ngân hàng",
    journeyBrief: "Tóm tắt / tệp / mẫu",
    journeyPtr: "PTR",
    journeyProcess: "D01 BPMN / D02",
    journeyProduct: "Product Delivery",
    journeyHandoff: "AI Handoff",
    quickStart: "Bắt đầu nhanh",
    quickStartHelper: "Chọn một việc để làm ngay. Mỗi bước vẫn giữ preview và phê duyệt của người dùng.",
    statusOverview: "Trạng thái workspace",
    recommendedNextAction: "Hành động nên làm tiếp theo",
    recentAIRuns: "Lần chạy AI gần đây",
    bankingStarterPack: "Banking Starter Pack",
    bankingStarterHelper:
      "Mẫu khởi đầu cho quy trình ngân hàng phổ biến. Dùng để demo nhanh hoặc làm điểm xuất phát trước khi chỉnh theo nghiệp vụ thật.",
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
    noRuns: "Chưa có lịch sử chạy AI.",
    external: "bên ngoài",
    local: "local/mô phỏng",
    success: "thành công",
    failure: "thất bại",
    startFromBrief: "Start from brief",
    importFile: "Import file",
    useBankingTemplate: "Use banking template",
    reviewProcessQuality: "Review process quality",
    generateProductDeliveryDraft: "Generate product delivery draft",
    exportAIHandoffPack: "Export AI handoff pack",
    startFromBriefBody: "Nhập 7 phần tóm tắt để tạo PTR nháp, xem trước rồi mới áp dụng.",
    importFileBody: "Dùng PDF dạng text, DOCX hoặc XLSX để tạo PTR nháp từ nội dung có sẵn.",
    useBankingTemplateBody: "Chọn mẫu D01/D02 hoặc domain banking để có cấu trúc chuẩn nhanh hơn.",
    reviewProcessQualityBody: "Kiểm tra actor, system, gateway, next step và các cảnh báo trước khi xuất.",
    generateProductDeliveryBody: "Tạo BRD, SRS, user stories, acceptance criteria và MVP slicing dạng nháp.",
    exportAIHandoffBody: "Đóng gói AGENTS.md, CLAUDE.md, cursor rules và spec.json cho đội dev.",
    preview: "Xem trước",
    useTemplate: "Dùng mẫu",
    nextCreateBrief: "Chưa có PTR đã lưu. Hãy bắt đầu từ tóm tắt hoặc nhập tệp để tạo bản nháp PTR.",
    nextReviewQA: "PTR đang có vấn đề/cảnh báo. Hãy rà soát QA trước khi tạo BPMN, D02 hoặc hồ sơ sản phẩm.",
    nextRegenerateArtifacts: "D01/D02 đang thiếu hoặc cần tạo lại. Hãy tạo lại artifact từ PTR hiện tại.",
    nextGenerateProduct: "Quy trình đã sẵn sàng. Hãy tạo bản nháp Product Delivery để chuyển sang BRD/SRS/user stories.",
    nextExportHandoff: "Đã có Product Delivery. Hãy preview và xuất AI Development Handoff Pack.",
    nextExportPackage: "Workspace đã sẵn sàng. Hãy xuất gói bàn giao/audit khi cần chia sẻ.",
    templateCorporateAccount: "Mở tài khoản doanh nghiệp",
    templateSmeLoan: "Vay SME online",
    templateKyc: "KYC / onboarding",
    templateDocumentReview: "Rà soát hồ sơ",
    templateApproval: "Phê duyệt tín dụng",
    templateHint: "PTR + D01/D02 + kiểm soát"
  },
  en: {
    eyebrow: "RC4 dashboard",
    heroTitle: "Start turning business intent into AI-ready delivery artifacts.",
    heroSubtitle:
      "Move from a brief, file, or banking template into the Process Task Register, then generate D01 BPMN/D02 Service Blueprint, Product Delivery, and the AI Development Handoff Pack.",
    heroCta: "Start from brief",
    secondaryCta: "View banking templates",
    journeyBrief: "Brief / file / template",
    journeyPtr: "PTR",
    journeyProcess: "D01 BPMN / D02",
    journeyProduct: "Product Delivery",
    journeyHandoff: "AI Handoff",
    quickStart: "Quick Start",
    quickStartHelper: "Pick one action to do now. Each step still keeps preview and user approval.",
    statusOverview: "Workspace status",
    recommendedNextAction: "Recommended next action",
    recentAIRuns: "Recent AI runs",
    bankingStarterPack: "Banking Starter Pack",
    bankingStarterHelper:
      "Starter templates for common banking workflows. Use them for a quick demo or as a starting point before tailoring the real process.",
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
    noRuns: "No AI run history yet.",
    external: "external",
    local: "local/mock",
    success: "success",
    failure: "failure",
    startFromBrief: "Start from brief",
    importFile: "Import file",
    useBankingTemplate: "Use banking template",
    reviewProcessQuality: "Review process quality",
    generateProductDeliveryDraft: "Generate product delivery draft",
    exportAIHandoffPack: "Export AI handoff pack",
    startFromBriefBody: "Fill the 7-section brief to create a Draft PTR with preview before apply.",
    importFileBody: "Use text-based PDF, DOCX, or XLSX to create a Draft PTR from existing content.",
    useBankingTemplateBody: "Choose D01/D02 or banking-domain templates to start with better structure.",
    reviewProcessQualityBody: "Check actor, system, gateway, next step, and warnings before export.",
    generateProductDeliveryBody: "Create draft BRD, SRS, user stories, acceptance criteria, and MVP slicing.",
    exportAIHandoffBody: "Package AGENTS.md, CLAUDE.md, cursor rules, and spec.json for the dev team.",
    preview: "Preview",
    useTemplate: "Use template",
    nextCreateBrief: "No saved PTR yet. Start from a brief or file to create a Draft PTR.",
    nextReviewQA: "PTR has issues or warnings. Review QA before creating BPMN, D02, or Product Delivery.",
    nextRegenerateArtifacts: "D01/D02 are missing or stale. Regenerate artifacts from the current PTR.",
    nextGenerateProduct: "The process is ready. Generate Product Delivery drafts for BRD/SRS/user stories.",
    nextExportHandoff: "Product Delivery exists. Preview and export the AI Development Handoff Pack.",
    nextExportPackage: "Workspace is ready. Export the handoff/audit package when needed.",
    templateCorporateAccount: "Corporate account opening",
    templateSmeLoan: "SME online loan",
    templateKyc: "KYC / onboarding",
    templateDocumentReview: "Document review",
    templateApproval: "Credit approval",
    templateHint: "PTR + D01/D02 + controls"
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
  const [aiRunHistory, setAIRunHistory] = useState<AIRunRecord[]>([]);
  const [productDeliveryEventCount, setProductDeliveryEventCount] = useState(0);
  const [exportPackageEventCount, setExportPackageEventCount] = useState(0);
  const labels = text[locale];

  function refreshWorkspaceState() {
    const auditLog = loadAuditLog();

    setTasksState(readProcessTasks());
    setD01Status(readArtifactStatus(D01_GENERATED_STATUS_KEY));
    setD02Status(readArtifactStatus(D02_GENERATED_STATUS_KEY));
    setAIRunHistory(loadAIRunHistory());
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
  const recentAIRuns = aiRunHistory.slice(0, 3);

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

  const quickStartCards = [
    {
      title: labels.startFromBrief,
      body: labels.startFromBriefBody,
      href: "#input-brief",
      tone: "blue"
    },
    {
      title: labels.importFile,
      body: labels.importFileBody,
      href: "#input-brief",
      tone: "slate"
    },
    {
      title: labels.useBankingTemplate,
      body: labels.useBankingTemplateBody,
      href: "#template-library",
      tone: "purple"
    },
    {
      title: labels.reviewProcessQuality,
      body: labels.reviewProcessQualityBody,
      href: "#qa-panel",
      tone: "amber"
    },
    {
      title: labels.generateProductDeliveryDraft,
      body: labels.generateProductDeliveryBody,
      href: "#product-delivery",
      tone: "green"
    },
    {
      title: labels.exportAIHandoffPack,
      body: labels.exportAIHandoffBody,
      href: "#product-delivery",
      tone: "slate"
    }
  ];

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

  const starterTemplates = [
    labels.templateCorporateAccount,
    labels.templateSmeLoan,
    labels.templateKyc,
    labels.templateDocumentReview,
    labels.templateApproval
  ];

  return (
    <section className="surface-card overflow-hidden">
      <div className="border-b border-slate-200 bg-white p-6">
        <p className="status-badge status-badge-primary">{labels.eyebrow}</p>
        <div className="mt-4 grid gap-5 lg:grid-cols-[1.45fr_0.9fr] lg:items-end">
          <div>
            <h2 className="max-w-4xl text-3xl font-semibold leading-tight text-slate-950">
              {labels.heroTitle}
            </h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
              {labels.heroSubtitle}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a className="btn btn-primary" href="#input-brief">
                {labels.heroCta}
              </a>
              <a className="btn btn-secondary" href="#template-library">
                {labels.secondaryCta}
              </a>
            </div>
          </div>
          <div className="rounded-md border border-blue-100 bg-blue-50/70 p-4">
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
                    <span className="ml-auto text-blue-400">→</span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 bg-slate-50/70 p-4 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="soft-panel p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                {labels.quickStart}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {labels.quickStartHelper}
              </p>
            </div>
            <a className="btn btn-ai" href={recommendedAction.href}>
              {recommendedAction.label}
            </a>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {quickStartCards.map((card) => (
              <a
                className={`rounded-md border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                  card.tone === "blue"
                    ? "border-blue-200"
                    : card.tone === "purple"
                      ? "border-purple-200"
                      : card.tone === "amber"
                        ? "border-amber-200"
                        : card.tone === "green"
                          ? "border-emerald-200"
                          : "border-slate-200"
                }`}
                href={card.href}
                key={card.title}
              >
                <p className="text-sm font-semibold text-slate-950">{card.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{card.body}</p>
              </a>
            ))}
          </div>
        </div>

        <div className="soft-panel p-4">
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
              className="rounded-md border border-slate-200 bg-white p-4"
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

      <div className="grid gap-4 border-t border-slate-200 bg-slate-50/60 p-4 lg:grid-cols-[1fr_0.72fr]">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {labels.bankingStarterPack}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {labels.bankingStarterHelper}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {starterTemplates.map((template) => (
              <div
                className="rounded-md border border-slate-200 bg-slate-50 p-3"
                key={template}
              >
                <p className="text-sm font-semibold text-slate-950">{template}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {labels.templateHint}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a className="btn btn-secondary" href="#template-library">
              {labels.preview}
            </a>
            <a className="btn btn-primary" href="#template-library">
              {labels.useTemplate}
            </a>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4">
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
    </section>
  );
}
