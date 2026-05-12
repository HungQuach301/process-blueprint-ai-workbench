"use client";

import { Fragment, type ReactNode, useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import {
  exportAIRunHistoryJson,
  exportAuditLogJson,
  loadAIRunHistory,
  type AIRunRecord,
  saveAuditLogEntry
} from "@/lib/audit/audit-log";
import {
  confirmRealAICallIfNeeded,
  logAICallAudit
} from "@/lib/ai/ai-governance";
import {
  generateAICodingPack,
  type AICodingPackFiles
} from "@/lib/generators/ai-coding-pack-generator";
import { generateBpmnXml } from "@/lib/generators/bpmn-generator";
import { generateServiceBlueprintDrawioXml } from "@/lib/generators/drawio-service-blueprint-generator";
import {
  generateProductDeliveryDraft,
  generateProductScopeReview,
  type ProductDeliveryDraft
} from "@/lib/generators/product-delivery-generator";
import { generateQaReportMarkdown } from "@/lib/generators/qa-report-generator";
import type {
  AcceptanceCriteriaSet,
  BRD,
  ProductScopeReview,
  RequirementQAResponse,
  SRS,
  UserStorySet
} from "@/lib/models/product-delivery";
import type { ProcessTask } from "@/lib/models/process-task";
import type { TemplateProfile } from "@/lib/models/template-profile";
import { validateProcessTasks } from "@/lib/qa/task-register-rules";
import {
  sampleBpmnTemplateProfile,
  sampleProcessTasks,
  sampleServiceBlueprintTemplateProfile,
  sampleWorkspace
} from "@/lib/sample-data/sme-online-loan";
import { getLocale, type Locale } from "@/lib/i18n";

const TASKS_STORAGE_KEY = "process-blueprint-ai-workbench:process-tasks";
const BRIEF_STORAGE_KEY = "process-blueprint-ai-workbench:input-brief";
const TEMPLATES_STORAGE_KEY =
  "process-blueprint-ai-workbench:template-profiles";
const D01_STORAGE_KEY = "process-blueprint-ai-workbench:selected-d01-template";
const D02_STORAGE_KEY = "process-blueprint-ai-workbench:selected-d02-template";
const D01_GENERATED_XML_KEY =
  "process-blueprint-ai-workbench:generated-d01-bpmn-xml";
const D02_GENERATED_XML_KEY =
  "process-blueprint-ai-workbench:generated-d02-service-blueprint-xml";
const D01_GENERATED_STATUS_KEY =
  "process-blueprint-ai-workbench:generated-d01-bpmn-status";
const D02_GENERATED_STATUS_KEY =
  "process-blueprint-ai-workbench:generated-d02-service-blueprint-status";
const ARTIFACT_STATUS_EVENT = "process-blueprint-artifact-status-change";
const LOCALE_EVENT = "process-blueprint-locale-change";

type ArtifactStatus = "fresh" | "stale" | "not_generated";

type OutputArtifacts = {
  timestamp: string;
  d01BpmnXml: string;
  d02ServiceBlueprintXml: string;
  processTaskRegisterJson: string;
  templateProfileJson: string;
  qaReportMarkdown: string;
};

type AICodingPackPreview = {
  timestamp: string;
  files: AICodingPackFiles;
  sourceSkillId?: "ptr-to-ai-coding-pack" | "user-stories-to-ai-coding-pack";
  qualityIssues?: string[];
};

type ProductDeliveryPreview = {
  timestamp: string;
  draft: ProductDeliveryDraft;
};

type BRDPreview = {
  timestamp: string;
  sourceSkillId: "ptr-to-brd" | "notes-to-brd" | "product-delivery-draft";
  brd: BRD;
};

type SRSPreview = {
  timestamp: string;
  sourceSkillId: "brd-to-srs" | "notes-to-srs" | "product-delivery-draft";
  srs: SRS;
};

type UserStoryPreview = {
  timestamp: string;
  sourceSkillId:
    | "srs-to-user-stories"
    | "brd-to-user-stories"
    | "product-delivery-draft";
  userStorySet: UserStorySet;
};

type AcceptanceCriteriaPreview = {
  timestamp: string;
  sourceSkillId:
    | "user-stories-to-acceptance-criteria"
    | "product-delivery-draft";
  acceptanceCriteria: AcceptanceCriteriaSet;
};

type ProductScopeReviewPreview = {
  timestamp: string;
  sourceSkillId:
    | "product-scope-review"
    | "mvp-slicing"
    | "product-delivery-draft";
  scopeReview: ProductScopeReview;
};

type RequirementQAPreview = {
  timestamp: string;
  sourceSkillId: "requirement-quality-check";
  requirementQA: RequirementQAResponse;
};

type AICodingPackRouteResponse = {
  files: Array<{
    path: string;
    content: string;
  }>;
  specJson?: unknown;
  assumptions: string[];
  openQuestions: string[];
  qualityIssues?: string[];
};

type CompareProviderId = "product-ai" | "openai" | "claude" | "mock";
type ExportCompareKind = "brd" | "userStories" | "aiCodingPack";

type AIRunRouteMeta = {
  providerId?: string;
  provider?: string;
  model?: string;
  requestId?: string;
  latencyMs?: number;
  validationPassed?: boolean;
  tokenUsage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  externalApiCalled?: boolean;
  warnings?: string[];
  errorCode?: string;
  audit?: {
    errorCode?: string;
    requestId?: string;
  };
};

type AISkillRouteResponse<T> = {
  ok?: boolean;
  result?: T;
  error?: string;
  validationErrors?: string[];
  provider?: string;
  model?: string;
  mode?: "mock" | "provider-backed";
  meta?: AIRunRouteMeta;
};

type ProductDeliveryCardStatus = "not-created" | "draft" | "ready" | "stale";

type ExportCompareResult = {
  id: string;
  kind: ExportCompareKind;
  skillId: string;
  providerId: CompareProviderId;
  model: string;
  confidence: string;
  warnings: string[];
  summary: string;
  validationStatus: string;
  result?: BRD | UserStorySet | AICodingPackRouteResponse;
  error?: string;
};

type ExportCenterView = "export" | "product-delivery";

type ExportCenterProps = {
  view?: ExportCenterView;
};

const compareProviders: Array<{ id: CompareProviderId; label: Record<Locale, string> }> = [
  { id: "product-ai", label: { vi: "Product AI", en: "Product AI" } },
  { id: "openai", label: { vi: "OpenAI", en: "OpenAI" } },
  { id: "claude", label: { vi: "Claude", en: "Claude" } },
  { id: "mock", label: { vi: "Local/mô phỏng", en: "Local/Mock" } }
];

const exportCenterText = {
  vi: {
    title: "Trung tâm xuất",
    description:
      "Tạo và đóng gói D01 BPMN, D02 Service Blueprint, JSON dữ liệu, báo cáo QA và metadata kiểm toán từ Process Task Register.",
    generateAllArtifacts: "Tạo tất cả artifact",
    generatingZip: "Đang tạo ZIP...",
    downloadZip: "Tải ZIP",
    productDelivery: "Hồ sơ sản phẩm",
    productDeliveryDescription:
      "Tạo bản nháp hồ sơ sản phẩm từ Process Task Register và ngữ cảnh đã rà soát. Tất cả đầu ra đều xem trước trước, chưa lưu vào Artifact Graph.",
    productDeliveryHowItWorks: "Cách làm hồ sơ sản phẩm",
    productDeliveryStep1Title: "Tạo tài liệu nháp",
    productDeliveryStep1Body: "Tạo BRD, SRS, user stories, acceptance criteria và phạm vi/MVP để xem trước.",
    productDeliveryStep2Title: "Chạy kiểm tra chất lượng",
    productDeliveryStep2Body: "Rà soát requirement quality và trace trước khi chia sẻ.",
    productDeliveryStep3Title: "Xuất gói bàn giao phát triển",
    productDeliveryStep3Body: "Xem trước gói bàn giao phát triển AI rồi tải ZIP khi sẵn sàng.",
    optionalProjectContext: "Ngữ cảnh dự án tùy chọn",
    generateAllProductDelivery: "Tạo toàn bộ hồ sơ bàn giao",
    generateProductDeliveryDraft: "Tạo bản nháp hồ sơ sản phẩm",
    downloadProductDeliveryMarkdown: "Tải Markdown hồ sơ sản phẩm",
    notCreated: "Chưa tạo",
    draft: "Nháp",
    ready: "Sẵn sàng",
    stale: "Cần tạo lại",
    download: "Tải xuống",
    more: "Thêm",
    aiDevelopmentHandoffPack: "Gói bàn giao phát triển AI",
    aiDevelopmentHandoffDescription:
      "Gửi gói này cho đội phát triển hoặc dùng với Codex, Claude Code, Cursor. Gói biến PTR và hồ sơ sản phẩm đã rà soát thành bộ bàn giao có xem trước trước khi tải ZIP.",
    handoffHowItWorks: "Cách làm gói bàn giao phát triển AI",
    handoffStep1Title: "Chọn tài liệu nguồn",
    handoffStep1Body: "Dùng PTR hoặc hồ sơ sản phẩm đã rà soát.",
    handoffStep2Title: "Xem trước gói bàn giao",
    handoffStep2Body: "Kiểm tra spec.json và các file kỹ thuật trước.",
    handoffStep3Title: "Tải ZIP",
    handoffStep3Body: "Tải gói ZIP sau khi preview phù hợp.",
    previewPtrHandoffPack: "Xem trước gói bàn giao từ PTR",
    previewProductDeliveryHandoffPack: "Xem trước gói bàn giao từ hồ sơ sản phẩm",
    downloadHandoffPack: "Tải ZIP bàn giao",
    generatingHandoffPack: "Đang tạo gói bàn giao...",
    includedFiles: "Tệp bao gồm",
    localAuditLog: "Nhật ký kiểm toán cục bộ",
    aiRunHistory: "Lịch sử chạy AI",
    aiRunHistorySafeNote:
      "Chỉ hiển thị metadata an toàn của các lần chạy AI. Không lưu prompt đầy đủ hoặc đầu ra đầy đủ trong lịch sử cục bộ.",
    refreshHistory: "Làm mới lịch sử",
    exportHistoryJson: "Xuất JSON lịch sử",
    status: "Trạng thái",
    validation: "Kiểm tra hợp lệ",
    details: "Chi tiết",
    hideDetails: "Ẩn",
    showDetails: "Chi tiết",
    external: "Gọi ngoài",
    yes: "có",
    no: "không",
    errorType: "Loại lỗi",
    requestId: "Mã request",
    safeMessage: "Lý do an toàn",
    validationSummary: "Tóm tắt kiểm tra hợp lệ",
    warnings: "Cảnh báo",
    suggestedNextAction: "Hành động đề xuất",
    notApplicable: "không áp dụng",
    notAvailable: "không có",
    noSafeError: "Không ghi nhận thông báo lỗi an toàn.",
    valid: "Hợp lệ.",
    noValidationSummary: "Không có tóm tắt kiểm tra hợp lệ.",
    none: "Không có"
  },
  en: {
    title: "Export Center",
    description:
      "Generate and package D01 BPMN, D02 Service Blueprint, data JSON, QA report, and audit metadata from the Process Task Register.",
    generateAllArtifacts: "Generate all artifacts",
    generatingZip: "Creating ZIP...",
    downloadZip: "Download ZIP",
    productDelivery: "Product Delivery",
    productDeliveryDescription:
      "Generate preview-first Product Delivery drafts from the Process Task Register and reviewed context. Outputs are not saved to an Artifact Graph.",
    productDeliveryHowItWorks: "How Product Delivery works",
    productDeliveryStep1Title: "Generate draft artifacts",
    productDeliveryStep1Body: "Create preview-first BRD, SRS, user stories, acceptance criteria, and scope/MVP.",
    productDeliveryStep2Title: "Run quality checks",
    productDeliveryStep2Body: "Review requirement quality and trace before sharing.",
    productDeliveryStep3Title: "Export development handoff",
    productDeliveryStep3Body: "Preview the AI Development Handoff Pack, then download ZIP when ready.",
    optionalProjectContext: "Optional project context",
    generateAllProductDelivery: "Generate All Product Delivery",
    generateProductDeliveryDraft: "Generate Product Delivery Draft",
    downloadProductDeliveryMarkdown: "Download Product Delivery Markdown",
    notCreated: "Not created",
    draft: "Draft",
    ready: "Ready",
    stale: "Stale",
    download: "Download",
    more: "More",
    aiDevelopmentHandoffPack: "AI Development Handoff Pack",
    aiDevelopmentHandoffDescription:
      "Send this package to your development team or use it with Codex, Claude Code, Cursor. It turns the Process Task Register and reviewed Product Delivery artifacts into a previewed handoff before ZIP download.",
    handoffHowItWorks: "How AI Development Handoff works",
    handoffStep1Title: "Select source artifacts",
    handoffStep1Body: "Use PTR or reviewed Product Delivery artifacts.",
    handoffStep2Title: "Preview handoff pack",
    handoffStep2Body: "Check spec.json and the technical files first.",
    handoffStep3Title: "Download ZIP",
    handoffStep3Body: "Download the ZIP after the preview looks ready.",
    previewPtrHandoffPack: "Preview PTR Handoff Pack",
    previewProductDeliveryHandoffPack: "Preview Product Delivery Handoff Pack",
    downloadHandoffPack: "Download Handoff Pack ZIP",
    generatingHandoffPack: "Creating handoff pack...",
    includedFiles: "Included files",
    localAuditLog: "Local Audit Log",
    aiRunHistory: "AI Run History",
    aiRunHistorySafeNote:
      "Shows safe metadata for AI skill runs only. Full prompts and full model outputs are not stored in this local history.",
    refreshHistory: "Refresh history",
    exportHistoryJson: "Export history JSON",
    status: "Status",
    validation: "Validation",
    details: "Details",
    hideDetails: "Hide",
    showDetails: "Details",
    external: "External",
    yes: "yes",
    no: "no",
    errorType: "Error type",
    requestId: "Request id",
    safeMessage: "Safe reason",
    validationSummary: "Validation summary",
    warnings: "Warnings",
    suggestedNextAction: "Suggested next action",
    notApplicable: "not applicable",
    notAvailable: "not available",
    noSafeError: "No safe error message recorded.",
    valid: "Valid.",
    noValidationSummary: "No validation summary recorded.",
    none: "None"
  }
} satisfies Record<Locale, Record<string, string>>;

function mapCodingPackPreviewToRouteFiles(files: AICodingPackFiles) {
  return [
    { path: "AGENTS.md", content: files.agentsMd },
    { path: "CLAUDE.md", content: files.claudeMd },
    { path: "cursor-rules.md", content: files.cursorRulesMd },
    { path: "spec.json", content: files.specJson },
    { path: "acceptance-criteria.md", content: files.acceptanceCriteriaMd },
    { path: "implementation-plan.md", content: files.implementationPlanMd },
    { path: "test-plan.md", content: files.testPlanMd }
  ];
}

function createTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function readJsonArray<T>(key: string, fallback: T[]) {
  const savedValue = window.localStorage.getItem(key);

  if (!savedValue) {
    return fallback;
  }

  const parsedValue = JSON.parse(savedValue);

  if (!Array.isArray(parsedValue)) {
    throw new Error(`${key} không phải là danh sách hợp lệ.`);
  }

  return parsedValue as T[];
}

function readProcessTasks() {
  return readJsonArray<ProcessTask>(TASKS_STORAGE_KEY, sampleProcessTasks);
}

function readTemplateProfiles() {
  return readJsonArray<TemplateProfile>(TEMPLATES_STORAGE_KEY, [
    sampleBpmnTemplateProfile,
    sampleServiceBlueprintTemplateProfile
  ]);
}

function readInputBriefSourceSummary() {
  const savedBrief = window.localStorage.getItem(BRIEF_STORAGE_KEY);

  if (!savedBrief) {
    return "";
  }

  try {
    const parsedBrief = JSON.parse(savedBrief) as Record<string, unknown>;
    const summaryFields = [
      parsedBrief.processInfo,
      parsedBrief.businessObjective,
      parsedBrief.scopeBoundary,
      parsedBrief.actors
    ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

    return summaryFields.join("\n\n");
  } catch {
    return "";
  }
}

function findTemplate(
  templates: TemplateProfile[],
  templateId: string | null,
  fallback: TemplateProfile
) {
  return templates.find((template) => template.id === templateId) ?? fallback;
}

function downloadBlob(content: BlobPart, fileName: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getRouteFileContent(
  files: AICodingPackRouteResponse["files"],
  path: string
) {
  return files.find((file) => file.path === path)?.content ?? "";
}

function mapRouteCodingPackFiles(
  response: AICodingPackRouteResponse
): AICodingPackFiles {
  return {
    agentsMd: getRouteFileContent(response.files, "AGENTS.md"),
    claudeMd: getRouteFileContent(response.files, "CLAUDE.md"),
    cursorRulesMd:
      getRouteFileContent(response.files, "cursor-rules.md") ||
      getRouteFileContent(response.files, ".cursorrules"),
    specJson:
      typeof response.specJson === "string"
        ? response.specJson
        : getRouteFileContent(response.files, "spec.json"),
    acceptanceCriteriaMd: getRouteFileContent(
      response.files,
      "acceptance-criteria.md"
    ),
    implementationPlanMd: getRouteFileContent(
      response.files,
      "implementation-plan.md"
    ),
    testPlanMd: getRouteFileContent(response.files, "test-plan.md")
  };
}

export function ExportCenter({ view = "export" }: ExportCenterProps) {
  const [locale, setActiveLocale] = useState<Locale>("vi");
  const [artifacts, setArtifacts] = useState<OutputArtifacts | null>(null);
  const [aiCodingPack, setAICodingPack] = useState<AICodingPackPreview | null>(
    null
  );
  const [productDeliveryDraft, setProductDeliveryDraft] =
    useState<ProductDeliveryPreview | null>(null);
  const [projectContext, setProjectContext] = useState("");
  const [productDeliveryContext, setProductDeliveryContext] = useState("");
  const [productDeliveryNotes, setProductDeliveryNotes] = useState("");
  const [productDeliveryFileText, setProductDeliveryFileText] = useState("");
  const [aiRunHistory, setAIRunHistory] = useState<AIRunRecord[]>([]);
  const [expandedAIRunId, setExpandedAIRunId] = useState<string | null>(null);
  const [compareModeEnabled, setCompareModeEnabled] = useState(false);
  const [compareProviderIds, setCompareProviderIds] = useState<CompareProviderId[]>([]);
  const [compareResults, setCompareResults] = useState<ExportCompareResult[]>([]);
  const [isRunningCompare, setIsRunningCompare] = useState(false);
  const [brdPreview, setBRDPreview] = useState<BRDPreview | null>(null);
  const [srsPreview, setSRSPreview] = useState<SRSPreview | null>(null);
  const [userStoryPreview, setUserStoryPreview] =
    useState<UserStoryPreview | null>(null);
  const [acceptanceCriteriaPreview, setAcceptanceCriteriaPreview] =
    useState<AcceptanceCriteriaPreview | null>(null);
  const [productScopeReviewPreview, setProductScopeReviewPreview] =
    useState<ProductScopeReviewPreview | null>(null);
  const [requirementQAPreview, setRequirementQAPreview] =
    useState<RequirementQAPreview | null>(null);
  const [message, setMessage] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingAICodingPack, setIsDownloadingAICodingPack] =
    useState(false);
  const [isGeneratingBRD, setIsGeneratingBRD] = useState(false);
  const [isGeneratingSRS, setIsGeneratingSRS] = useState(false);
  const [isGeneratingUserStories, setIsGeneratingUserStories] = useState(false);
  const [isGeneratingAcceptanceCriteria, setIsGeneratingAcceptanceCriteria] =
    useState(false);
  const [isGeneratingProductScopeReview, setIsGeneratingProductScopeReview] =
    useState(false);
  const [isGeneratingRequirementQA, setIsGeneratingRequirementQA] =
    useState(false);
  const [d01Status, setD01Status] = useState<ArtifactStatus>("not_generated");
  const [d02Status, setD02Status] = useState<ArtifactStatus>("not_generated");
  const [exportPackageStatus, setExportPackageStatus] =
    useState<ArtifactStatus>("not_generated");
  const text = exportCenterText[locale];
  const isExportView = view === "export";
  const isProductDeliveryView = view === "product-delivery";
  const rawPreviewLabel =
    locale === "vi" ? "Nâng cao / Xem nội dung raw" : "Advanced / View raw content";
  const technicalDetailsLabel =
    locale === "vi" ? "Nâng cao / Chi tiết kỹ thuật" : "Advanced / Technical details";

  function readArtifactStatus(key: string): ArtifactStatus {
    const status = window.localStorage.getItem(key);

    return status === "fresh" || status === "stale" ? status : "not_generated";
  }

  function refreshArtifactStatuses() {
    setD01Status(readArtifactStatus(D01_GENERATED_STATUS_KEY));
    setD02Status(readArtifactStatus(D02_GENERATED_STATUS_KEY));
  }

  function refreshAIRunHistory() {
    setAIRunHistory(loadAIRunHistory());
  }

  useEffect(() => {
    setActiveLocale(getLocale());

    function handleLocaleChange(event: Event) {
      const localeDetail = (event as CustomEvent<{ locale?: Locale }>).detail;

      if (localeDetail?.locale) {
        setActiveLocale(localeDetail.locale);
      }
    }

    function handleArtifactStatusChange() {
      refreshArtifactStatuses();

      if (artifacts) {
        setExportPackageStatus("stale");
      }
    }

    refreshArtifactStatuses();
    refreshAIRunHistory();
    window.addEventListener(LOCALE_EVENT, handleLocaleChange);
    window.addEventListener(ARTIFACT_STATUS_EVENT, handleArtifactStatusChange);

    return () => {
      window.removeEventListener(LOCALE_EVENT, handleLocaleChange);
      window.removeEventListener(ARTIFACT_STATUS_EVENT, handleArtifactStatusChange);
    };
  }, [artifacts]);

  useEffect(() => {
    setBRDPreview(null);
    setSRSPreview(null);
    setUserStoryPreview(null);
    setAcceptanceCriteriaPreview(null);
    setProductScopeReviewPreview(null);
    setRequirementQAPreview(null);
  }, [productDeliveryContext, productDeliveryNotes, productDeliveryFileText]);

  const readiness = useMemo(
    () => ({
      d01Bpmn: d01Status,
      d02ServiceBlueprint: d02Status,
      qaReport: artifacts?.qaReportMarkdown ? exportPackageStatus : "not_generated",
      processTaskRegister: artifacts?.processTaskRegisterJson
        ? exportPackageStatus
        : "not_generated",
      templateProfile: artifacts?.templateProfileJson
        ? exportPackageStatus
        : "not_generated"
    }),
    [artifacts, d01Status, d02Status, exportPackageStatus]
  );

  function logRouteAIRun({
    skillId,
    success,
    meta,
    errorMessage,
    validationErrors
  }: {
    skillId: string;
    success: boolean;
    meta?: AIRunRouteMeta;
    errorMessage?: string;
    validationErrors?: string[];
  }) {
    logAICallAudit({
      skillId,
      success,
      errorMessage,
      realAIEnabled: meta?.externalApiCalled === true,
      externalApiCalled: meta?.externalApiCalled === true,
      provider: meta?.providerId ?? meta?.provider,
      model: meta?.model,
      requestId: meta?.requestId,
      latencyMs: meta?.latencyMs,
      validationPassed: meta?.validationPassed ?? success,
      tokenUsage: meta?.tokenUsage,
      warnings: meta?.warnings,
      errorType: meta?.errorCode ?? meta?.audit?.errorCode,
      validationErrors,
      suggestedNextAction: success
        ? locale === "vi"
          ? "Rà soát bản xem trước trước khi áp dụng hoặc xuất gói."
          : "Review the preview before applying or exporting."
        : validationErrors?.length
          ? locale === "vi"
            ? "Rà soát vấn đề kiểm tra, chỉnh ngữ cảnh nguồn, rồi chạy lại kỹ năng."
            : "Review validation issues, adjust the source context, then rerun the skill."
          : locale === "vi"
            ? "Kiểm tra trạng thái provider hoặc chạy lại bằng fallback local/mô phỏng."
            : "Check provider status or rerun with Local/Mock fallback."
    });
    refreshAIRunHistory();
  }

  function toggleCompareProvider(providerId: CompareProviderId) {
    setCompareProviderIds((currentIds) =>
      currentIds.includes(providerId)
        ? currentIds.filter((id) => id !== providerId)
        : [...currentIds, providerId]
    );
  }

  function summarizeExportCompareResult(
    kind: ExportCompareKind,
    result: BRD | UserStorySet | AICodingPackRouteResponse
  ) {
    if (kind === "brd") {
      const brd = result as BRD;

      return `${brd.businessRequirements.length} requirement(s), ${brd.stakeholders.length} stakeholder(s), ${brd.qualityIssues.length} quality issue(s).`;
    }

    if (kind === "userStories") {
      const userStorySet = result as UserStorySet;

      return `${userStorySet.stories.length} storie(s), ${userStorySet.epics.length} epic(s), ${userStorySet.qualityIssues.length} quality issue(s).`;
    }

    const codingPack = result as AICodingPackRouteResponse;

    return `${codingPack.files.length} file(s), ${codingPack.qualityIssues?.length ?? 0} quality issue(s).`;
  }

  function getCompareConfidence(result: BRD | UserStorySet | AICodingPackRouteResponse) {
    if ("qualityIssues" in result && Array.isArray(result.qualityIssues)) {
      return result.qualityIssues.some((issue) =>
        typeof issue === "object" &&
        issue !== null &&
        "severity" in issue &&
        issue.severity === "error"
      )
        ? "medium"
        : "high";
    }

    return "unknown";
  }

  function buildBRDComparePayload(skillId: "ptr-to-brd" | "notes-to-brd") {
    const timestamp = createTimestamp();
    const sourceSummary = readInputBriefSourceSummary();
    const processTasks = readProcessTasks();

    return {
      generatedAt: timestamp,
      payload: {
        processTasks: skillId === "ptr-to-brd" ? processTasks : undefined,
        projectContext: productDeliveryContext,
        notes: productDeliveryNotes,
        sourceSummary,
        uploadedFileText: productDeliveryFileText,
        generatedAt: timestamp
      }
    };
  }

  function buildUserStoryComparePayload(
    skillId: "srs-to-user-stories" | "brd-to-user-stories"
  ) {
    const timestamp = createTimestamp();

    return {
      generatedAt: timestamp,
      payload: {
        srs: srsPreview?.srs,
        brd: brdPreview?.brd,
        processTasks: readProcessTasks(),
        projectContext: productDeliveryContext,
        notes: productDeliveryNotes,
        sourceSummary: readInputBriefSourceSummary(),
        uploadedFileText: productDeliveryFileText,
        generatedAt: timestamp
      }
    };
  }

  function buildAICodingPackComparePayload() {
    const timestamp = createTimestamp();

    return {
      generatedAt: timestamp,
      payload: {
        brd: brdPreview?.brd,
        srs: srsPreview?.srs,
        userStorySet: userStoryPreview?.userStorySet,
        acceptanceCriteria: acceptanceCriteriaPreview?.acceptanceCriteria,
        processTasks: readProcessTasks(),
        projectContext: productDeliveryContext || projectContext,
        notes: productDeliveryNotes,
        sourceSummary: readInputBriefSourceSummary(),
        uploadedFileText: productDeliveryFileText,
        assumptions: [
          "AI Coding Pack is generated from reviewed Product Delivery artifacts."
        ],
        openQuestions: [
          "Confirm target repository architecture before implementation."
        ],
        generatedAt: timestamp
      }
    };
  }

  async function runExportProviderCompare({
    kind,
    skillId
  }: {
    kind: ExportCompareKind;
    skillId:
      | "ptr-to-brd"
      | "notes-to-brd"
      | "srs-to-user-stories"
      | "brd-to-user-stories"
      | "user-stories-to-ai-coding-pack";
  }) {
    if (!compareModeEnabled) {
      return;
    }

    if (compareProviderIds.length === 0) {
      setMessage(
        locale === "vi"
          ? "Chọn ít nhất một provider trước khi chạy so sánh provider."
          : "Choose at least one provider before running Provider Compare."
      );
      return;
    }

    if (
      kind === "brd" &&
      skillId === "notes-to-brd" &&
      [productDeliveryContext, productDeliveryNotes, readInputBriefSourceSummary(), productDeliveryFileText]
        .filter(Boolean)
        .join("\n")
        .trim().length < 20
    ) {
      setMessage(
        locale === "vi"
          ? "Thêm ghi chú, ngữ cảnh, tóm tắt nguồn hoặc text trích xuất từ tệp trước khi so sánh BRD từ ghi chú."
          : "Add notes, context, source summary, or uploaded file text before comparing BRD from notes."
      );
      return;
    }

    if (kind === "userStories" && !srsPreview && !brdPreview && readProcessTasks().length === 0) {
      setMessage(
        locale === "vi"
          ? "Tạo preview SRS/BRD hoặc bảo đảm PTR có dòng trước khi so sánh user stories."
          : "Generate SRS/BRD preview or ensure PTR has rows before comparing user stories."
      );
      return;
    }

    if (
      kind === "aiCodingPack" &&
      !brdPreview &&
      !srsPreview &&
      !userStoryPreview &&
      !acceptanceCriteriaPreview &&
      readProcessTasks().length === 0
    ) {
      setMessage(
        locale === "vi"
          ? "Hãy tạo artifact hồ sơ sản phẩm hoặc bảo đảm PTR có dòng trước khi so sánh AI Coding Pack."
          : "Generate Product Delivery artifacts or ensure PTR has rows before comparing AI Coding Pack."
      );
      return;
    }

    const usesCloudProvider = compareProviderIds.some((providerId) => providerId !== "mock");

    if (compareProviderIds.length > 1 && usesCloudProvider) {
      const confirmed = window.confirm(
        locale === "vi"
          ? "So sánh provider sẽ gọi nhiều provider đã chọn và có thể tăng chi phí AI. Tiếp tục?"
          : "Provider Compare will call multiple selected providers and may increase cost. Continue?"
      );

      if (!confirmed) {
        setMessage(
          locale === "vi"
            ? "Đã hủy so sánh provider. Không thay đổi bản xem trước."
            : "Provider Compare cancelled. No preview was changed."
        );
        return;
      }
    }

    if (!confirmRealAICallIfNeeded(usesCloudProvider)) {
      setMessage(
        locale === "vi"
          ? "Đã hủy so sánh provider do chưa xác nhận gọi AI đám mây."
          : "Provider Compare cancelled by cloud AI consent check."
      );
      return;
    }

    setIsRunningCompare(true);
    setCompareResults([]);
    setMessage(locale === "vi" ? "Đang chạy so sánh provider..." : "Running Provider Compare...");

    const comparePayload =
      kind === "brd"
        ? buildBRDComparePayload(skillId as "ptr-to-brd" | "notes-to-brd")
        : kind === "userStories"
          ? buildUserStoryComparePayload(
              skillId as "srs-to-user-stories" | "brd-to-user-stories"
            )
          : buildAICodingPackComparePayload();
    const nextResults: ExportCompareResult[] = [];

    for (const providerId of compareProviderIds) {
      try {
        const response = await fetch("/api/ai/run-skill", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            skillId,
            providerId,
            payload: comparePayload.payload
          })
        });
        const data =
          (await response.json()) as AISkillRouteResponse<
            BRD | UserStorySet | AICodingPackRouteResponse
          >;
        const errorMessage = [
          data.error,
          ...(data.validationErrors ?? [])
        ]
          .filter(Boolean)
          .join(" ");

        nextResults.push({
          id: `${skillId}-${providerId}-${Date.now()}`,
          kind,
          skillId,
          providerId,
          model: data.meta?.model ?? data.model ?? "",
          confidence: data.result ? getCompareConfidence(data.result) : "unknown",
          warnings: data.meta?.warnings ?? [],
          summary:
            response.ok && data.ok && data.result
              ? summarizeExportCompareResult(kind, data.result)
              : errorMessage || "Provider run failed.",
          validationStatus:
            data.meta?.validationPassed === false ||
            !response.ok ||
            !data.ok ||
            !data.result
              ? "failed"
              : "passed",
          result: response.ok && data.ok ? data.result : undefined,
          error: response.ok && data.ok ? undefined : errorMessage
        });
        logRouteAIRun({
          skillId,
          success: response.ok && data.ok === true,
          meta: data.meta,
          errorMessage: response.ok && data.ok ? undefined : errorMessage,
          validationErrors: data.validationErrors
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Provider compare request failed.";

        nextResults.push({
          id: `${skillId}-${providerId}-${Date.now()}`,
          kind,
          skillId,
          providerId,
          model: "",
          confidence: "unknown",
          warnings: [],
          summary: errorMessage,
          validationStatus: "failed",
          error: errorMessage
        });
        logRouteAIRun({
          skillId,
          success: false,
          errorMessage
        });
      }
    }

    setCompareResults(nextResults);
    setIsRunningCompare(false);
    setMessage(
      locale === "vi"
        ? "Đã hoàn tất so sánh provider. Chọn một đầu ra để xem tiếp."
        : "Provider Compare finished. Choose one output to preview further."
    );
  }

  function useExportCompareResult(result: ExportCompareResult) {
    if (!result.result) {
      return;
    }

    const timestamp = createTimestamp();

    if (result.kind === "brd") {
      setBRDPreview({
        timestamp,
        sourceSkillId: result.skillId as "ptr-to-brd" | "notes-to-brd",
        brd: result.result as BRD
      });
      setSRSPreview(null);
    }

    if (result.kind === "userStories") {
      setUserStoryPreview({
        timestamp,
        sourceSkillId: result.skillId as "srs-to-user-stories" | "brd-to-user-stories",
        userStorySet: result.result as UserStorySet
      });
      setAcceptanceCriteriaPreview(null);
      setProductScopeReviewPreview(null);
    }

    if (result.kind === "aiCodingPack") {
      const routeResult = result.result as AICodingPackRouteResponse;

      setAICodingPack({
        timestamp,
        files: mapRouteCodingPackFiles(routeResult),
        sourceSkillId: "user-stories-to-ai-coding-pack",
        qualityIssues: routeResult.qualityIssues
      });
    }

    setMessage(`Selected ${result.providerId} output for preview. No provider outputs were merged.`);
  }

  function buildArtifacts() {
    const timestamp = createTimestamp();
    const processTasks = readProcessTasks();
    const templateProfiles = readTemplateProfiles();
    const selectedD01TemplateId =
      window.localStorage.getItem(D01_STORAGE_KEY) ??
      sampleWorkspace.selectedBpmnTemplateId;
    const selectedD02TemplateId =
      window.localStorage.getItem(D02_STORAGE_KEY) ??
      sampleWorkspace.selectedServiceBlueprintTemplateId;
    const selectedD01Template = findTemplate(
      templateProfiles,
      selectedD01TemplateId,
      sampleBpmnTemplateProfile
    );
    const selectedD02Template = findTemplate(
      templateProfiles,
      selectedD02TemplateId,
      sampleServiceBlueprintTemplateProfile
    );
    const d01BpmnXml = generateBpmnXml(processTasks, selectedD01Template);
    const d02ServiceBlueprintXml = generateServiceBlueprintDrawioXml(
      processTasks,
      selectedD02Template
    );
    const selectedTemplates = [selectedD01Template, selectedD02Template];
    const qaIssues = validateProcessTasks(processTasks);
    const processTaskRegisterJson = JSON.stringify(processTasks, null, 2);
    const templateProfileJson = JSON.stringify(
      {
        selectedD01TemplateId,
        selectedD02TemplateId,
        templates: templateProfiles
      },
      null,
      2
    );
    const qaReportMarkdown = generateQaReportMarkdown({
      workspace: sampleWorkspace,
      processTasks,
      templateProfiles: selectedTemplates,
      qaIssues,
      artifactReadiness: {
        d01BpmnXml: true,
        d02ServiceBlueprintDrawio: true,
        qaReport: true
      }
    });

    window.localStorage.setItem(D01_GENERATED_XML_KEY, d01BpmnXml);
    window.localStorage.setItem(D02_GENERATED_XML_KEY, d02ServiceBlueprintXml);
    window.localStorage.setItem(D01_GENERATED_STATUS_KEY, "fresh");
    window.localStorage.setItem(D02_GENERATED_STATUS_KEY, "fresh");
    window.dispatchEvent(new Event(ARTIFACT_STATUS_EVENT));

    return {
      timestamp,
      d01BpmnXml,
      d02ServiceBlueprintXml,
      processTaskRegisterJson,
      templateProfileJson,
      qaReportMarkdown
    };
  }

  function generateAllArtifacts() {
    try {
      const nextArtifacts = buildArtifacts();

      setArtifacts(nextArtifacts);
      setExportPackageStatus("fresh");
      refreshArtifactStatuses();
      setMessage(locale === "vi" ? "Đã tạo mới đủ 5 artifact cho gói đầu ra." : "Generated fresh output package artifacts.");
    } catch (error) {
      setArtifacts(null);
      setExportPackageStatus("not_generated");
      setMessage(
        error instanceof Error
          ? locale === "vi"
            ? `Không thể tạo gói đầu ra: ${error.message}`
            : `Could not generate output package: ${error.message}`
          : locale === "vi"
            ? "Không thể tạo gói đầu ra. Vui lòng kiểm tra dữ liệu."
            : "Could not generate output package. Please check the data."
      );
    }
  }

  function buildAICodingPack() {
    const timestamp = createTimestamp();
    const processTasks = readProcessTasks();
    const templateProfiles = readTemplateProfiles();
    const selectedD01TemplateId =
      window.localStorage.getItem(D01_STORAGE_KEY) ??
      sampleWorkspace.selectedBpmnTemplateId;
    const selectedD02TemplateId =
      window.localStorage.getItem(D02_STORAGE_KEY) ??
      sampleWorkspace.selectedServiceBlueprintTemplateId;
    const selectedD01Template = findTemplate(
      templateProfiles,
      selectedD01TemplateId,
      sampleBpmnTemplateProfile
    );
    const selectedD02Template = findTemplate(
      templateProfiles,
      selectedD02TemplateId,
      sampleServiceBlueprintTemplateProfile
    );
    const files = generateAICodingPack({
      processTasks,
      selectedD01Template,
      selectedD02Template,
      projectContext,
      generatedAt: timestamp,
      assumptions: [
        "MVP1 AI Coding Pack is generated deterministically from Process Task Register and selected template metadata."
      ],
      openQuestions: [
        "Confirm target repository architecture before applying generated implementation steps."
      ]
    });

    return {
      timestamp,
      files
    };
  }

  function buildProductDeliveryDraft() {
    const timestamp = createTimestamp();
    const processTasks = readProcessTasks();
    const draft = generateProductDeliveryDraft({
      processTasks,
      projectContext: productDeliveryContext,
      notes: productDeliveryNotes,
      sourceSummary: readInputBriefSourceSummary(),
      generatedAt: timestamp
    });

    return {
      timestamp,
      draft
    };
  }

  async function generateBRDPreview(skillId: "ptr-to-brd" | "notes-to-brd") {
    const timestamp = createTimestamp();
    const sourceSummary = readInputBriefSourceSummary();
    const processTasks = readProcessTasks();
    const sourceText = [
      productDeliveryContext,
      productDeliveryNotes,
      sourceSummary,
      productDeliveryFileText
    ]
      .filter(Boolean)
      .join("\n")
      .trim();

    if (skillId === "notes-to-brd" && sourceText.length < 20) {
      setMessage("Add notes, context, source summary, or uploaded file text before generating BRD from notes.");
      return;
    }

    try {
      setIsGeneratingBRD(true);
      const response = await fetch("/api/ai/run-skill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          skillId,
          payload: {
            processTasks: skillId === "ptr-to-brd" ? processTasks : undefined,
            projectContext: productDeliveryContext,
            notes: productDeliveryNotes,
            sourceSummary,
            uploadedFileText: productDeliveryFileText,
            generatedAt: timestamp
          }
        })
      });
      const data = (await response.json()) as AISkillRouteResponse<BRD>;

      if (!response.ok || !data.ok || !data.result) {
        setBRDPreview(null);
        logRouteAIRun({
          skillId,
          success: false,
          meta: data.meta,
          errorMessage: data.error,
          validationErrors: data.validationErrors
        });
        setMessage(
          data.validationErrors?.length
            ? data.validationErrors.join(" ")
            : data.error || "Could not generate BRD preview."
        );
        return;
      }

      setBRDPreview({
        timestamp,
        sourceSkillId: skillId,
        brd: data.result
      });
      setSRSPreview(null);
      saveAuditLogEntry({
        action: "generate_brd_preview",
        status: "success",
        summary: "Generated structured BRD preview through AI skill route.",
        metadata: {
          timestamp,
          skillId,
          externalRoute: "/api/ai/run-skill",
          businessRequirementCount: data.result.businessRequirements.length,
          qualityIssueCount: data.result.qualityIssues.length
        }
      });
      logRouteAIRun({ skillId, success: true, meta: data.meta });
      setMessage(
        locale === "vi"
          ? "Đã tạo preview BRD structured. Chưa lưu hoặc áp dụng."
          : "Created structured BRD preview. Nothing was saved or applied."
      );
    } catch (error) {
      setBRDPreview(null);
      logRouteAIRun({
        skillId,
        success: false,
        errorMessage:
          error instanceof Error ? error.message : "Unknown BRD generation error."
      });
      setMessage(
        error instanceof Error
          ? locale === "vi"
            ? `Không thể tạo BRD preview: ${error.message}`
            : `Could not create BRD preview: ${error.message}`
          : locale === "vi"
            ? "Không thể tạo BRD preview. Vui lòng thử lại."
            : "Could not create BRD preview. Please try again."
      );
    } finally {
      setIsGeneratingBRD(false);
    }
  }

  async function generateSRSPreview(skillId: "brd-to-srs" | "notes-to-srs") {
    const timestamp = createTimestamp();
    const sourceSummary = readInputBriefSourceSummary();
    const processTasks = readProcessTasks();
    const sourceText = [
      productDeliveryContext,
      productDeliveryNotes,
      sourceSummary,
      productDeliveryFileText
    ]
      .filter(Boolean)
      .join("\n")
      .trim();

    if (skillId === "brd-to-srs" && !brdPreview && processTasks.length === 0) {
      setMessage(
        locale === "vi"
          ? "Tạo preview BRD hoặc bảo đảm PTR có dòng trước khi tạo SRS."
          : "Generate BRD preview or ensure PTR has rows before generating SRS."
      );
      return;
    }

    if (skillId === "notes-to-srs" && sourceText.length < 20 && !brdPreview) {
      setMessage(
        locale === "vi"
          ? "Thêm ghi chú, context, tóm tắt nguồn, text trích xuất từ file hoặc preview BRD trước khi tạo SRS từ ghi chú."
          : "Add notes, context, source summary, uploaded file text, or BRD preview before generating SRS from notes."
      );
      return;
    }

    try {
      setIsGeneratingSRS(true);
      const response = await fetch("/api/ai/run-skill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          skillId,
          payload: {
            brd: brdPreview?.brd,
            processTasks,
            projectContext: productDeliveryContext,
            notes: productDeliveryNotes,
            sourceSummary,
            uploadedFileText: productDeliveryFileText,
            generatedAt: timestamp
          }
        })
      });
      const data = (await response.json()) as AISkillRouteResponse<SRS>;

      if (!response.ok || !data.ok || !data.result) {
        setSRSPreview(null);
        logRouteAIRun({
          skillId,
          success: false,
          meta: data.meta,
          errorMessage: data.error,
          validationErrors: data.validationErrors
        });
        setMessage(
          data.validationErrors?.length
            ? data.validationErrors.join(" ")
            : data.error || "Could not generate SRS preview."
        );
        return;
      }

      setSRSPreview({
        timestamp,
        sourceSkillId: skillId,
        srs: data.result
      });
      setUserStoryPreview(null);
      setAcceptanceCriteriaPreview(null);
      setProductScopeReviewPreview(null);
      saveAuditLogEntry({
        action: "generate_srs_preview",
        status: "success",
        summary: "Generated structured SRS preview through AI skill route.",
        metadata: {
          timestamp,
          skillId,
          externalRoute: "/api/ai/run-skill",
          functionalRequirementCount: data.result.functionalRequirements.length,
          nonFunctionalRequirementCount:
            data.result.nonFunctionalRequirements.length,
          qualityIssueCount: data.result.qualityIssues.length
        }
      });
      logRouteAIRun({ skillId, success: true, meta: data.meta });
      setMessage(
        locale === "vi"
          ? "Đã tạo preview SRS structured. Chưa lưu hoặc áp dụng."
          : "Created structured SRS preview. Nothing was saved or applied."
      );
    } catch (error) {
      setSRSPreview(null);
      logRouteAIRun({
        skillId,
        success: false,
        errorMessage:
          error instanceof Error ? error.message : "Unknown SRS generation error."
      });
      setMessage(
        error instanceof Error
          ? locale === "vi"
            ? `Không thể tạo SRS preview: ${error.message}`
            : `Could not create SRS preview: ${error.message}`
          : locale === "vi"
            ? "Không thể tạo SRS preview. Vui lòng thử lại."
            : "Could not create SRS preview. Please try again."
      );
    } finally {
      setIsGeneratingSRS(false);
    }
  }

  async function generateUserStoryPreview(
    skillId: "srs-to-user-stories" | "brd-to-user-stories"
  ) {
    const timestamp = createTimestamp();
    const sourceSummary = readInputBriefSourceSummary();
    const processTasks = readProcessTasks();

    if (skillId === "srs-to-user-stories" && !srsPreview && processTasks.length === 0) {
      setMessage(
        locale === "vi"
          ? "Tạo preview SRS hoặc bảo đảm PTR có dòng trước khi tạo user stories."
          : "Generate SRS preview or ensure PTR has rows before generating user stories."
      );
      return;
    }

    if (skillId === "brd-to-user-stories" && !brdPreview && processTasks.length === 0) {
      setMessage(
        locale === "vi"
          ? "Tạo preview BRD hoặc bảo đảm PTR có dòng trước khi tạo user stories."
          : "Generate BRD preview or ensure PTR has rows before generating user stories."
      );
      return;
    }

    try {
      setIsGeneratingUserStories(true);
      const response = await fetch("/api/ai/run-skill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          skillId,
          payload: {
            srs: srsPreview?.srs,
            brd: brdPreview?.brd,
            processTasks,
            projectContext: productDeliveryContext,
            notes: productDeliveryNotes,
            sourceSummary,
            uploadedFileText: productDeliveryFileText,
            generatedAt: timestamp
          }
        })
      });
      const data = (await response.json()) as AISkillRouteResponse<UserStorySet>;

      if (!response.ok || !data.ok || !data.result) {
        setUserStoryPreview(null);
        setAcceptanceCriteriaPreview(null);
        logRouteAIRun({
          skillId,
          success: false,
          meta: data.meta,
          errorMessage: data.error,
          validationErrors: data.validationErrors
        });
        setMessage(
          data.validationErrors?.length
            ? data.validationErrors.join(" ")
            : data.error || "Could not generate user stories preview."
        );
        return;
      }

      setUserStoryPreview({
        timestamp,
        sourceSkillId: skillId,
        userStorySet: data.result
      });
      setAcceptanceCriteriaPreview(null);
      setProductScopeReviewPreview(null);
      saveAuditLogEntry({
        action: "generate_user_stories_preview",
        status: "success",
        summary: "Generated structured User Story Set preview through AI skill route.",
        metadata: {
          timestamp,
          skillId,
          externalRoute: "/api/ai/run-skill",
          epicCount: data.result.epics.length,
          storyCount: data.result.stories.length,
          qualityIssueCount: data.result.qualityIssues.length
        }
      });
      logRouteAIRun({ skillId, success: true, meta: data.meta });
      setMessage(
        locale === "vi"
          ? "Đã tạo preview User Stories structured. Chưa lưu hoặc áp dụng."
          : "Created structured User Stories preview. Nothing was saved or applied."
      );
    } catch (error) {
      setUserStoryPreview(null);
      setAcceptanceCriteriaPreview(null);
      logRouteAIRun({
        skillId,
        success: false,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Unknown user story generation error."
      });
      setMessage(
        error instanceof Error
          ? locale === "vi"
            ? `Không thể tạo User Stories preview: ${error.message}`
            : `Could not create User Stories preview: ${error.message}`
          : locale === "vi"
            ? "Không thể tạo User Stories preview. Vui lòng thử lại."
            : "Could not create User Stories preview. Please try again."
      );
    } finally {
      setIsGeneratingUserStories(false);
    }
  }

  async function generateAcceptanceCriteriaPreview() {
    const timestamp = createTimestamp();
    const sourceSummary = readInputBriefSourceSummary();
    const processTasks = readProcessTasks();

    if (!userStoryPreview && processTasks.length === 0) {
      setMessage(
        locale === "vi"
          ? "Tạo preview user stories hoặc bảo đảm PTR có dòng trước khi tạo acceptance criteria."
          : "Generate user stories preview or ensure PTR has rows before generating acceptance criteria."
      );
      return;
    }

    try {
      setIsGeneratingAcceptanceCriteria(true);
      const response = await fetch("/api/ai/run-skill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          skillId: "user-stories-to-acceptance-criteria",
          payload: {
            userStorySet: userStoryPreview?.userStorySet,
            processTasks,
            projectContext: productDeliveryContext,
            notes: productDeliveryNotes,
            sourceSummary,
            uploadedFileText: productDeliveryFileText,
            generatedAt: timestamp
          }
        })
      });
      const data =
        (await response.json()) as AISkillRouteResponse<AcceptanceCriteriaSet>;
      const skillId = "user-stories-to-acceptance-criteria";

      if (!response.ok || !data.ok || !data.result) {
        setAcceptanceCriteriaPreview(null);
        logRouteAIRun({
          skillId,
          success: false,
          meta: data.meta,
          errorMessage: data.error,
          validationErrors: data.validationErrors
        });
        setMessage(
          data.validationErrors?.length
            ? data.validationErrors.join(" ")
            : data.error || "Could not generate acceptance criteria preview."
        );
        return;
      }

      setAcceptanceCriteriaPreview({
        timestamp,
        sourceSkillId: "user-stories-to-acceptance-criteria",
        acceptanceCriteria: data.result
      });
      saveAuditLogEntry({
        action: "generate_acceptance_criteria_preview",
        status: "success",
        summary:
          "Generated structured Acceptance Criteria preview through AI skill route.",
        metadata: {
          timestamp,
          skillId: "user-stories-to-acceptance-criteria",
          externalRoute: "/api/ai/run-skill",
          criteriaCount: data.result.criteria.length,
          qualityIssueCount: data.result.qualityIssues.length
        }
      });
      logRouteAIRun({ skillId, success: true, meta: data.meta });
      setMessage(
        locale === "vi"
          ? "Đã tạo preview Acceptance Criteria structured. Chưa lưu hoặc áp dụng."
          : "Created structured Acceptance Criteria preview. Nothing was saved or applied."
      );
    } catch (error) {
      setAcceptanceCriteriaPreview(null);
      logRouteAIRun({
        skillId: "user-stories-to-acceptance-criteria",
        success: false,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Unknown acceptance criteria generation error."
      });
      setMessage(
        error instanceof Error
          ? locale === "vi"
            ? `Không thể tạo Acceptance Criteria preview: ${error.message}`
            : `Could not create Acceptance Criteria preview: ${error.message}`
          : locale === "vi"
            ? "Không thể tạo Acceptance Criteria preview. Vui lòng thử lại."
            : "Could not create Acceptance Criteria preview. Please try again."
      );
    } finally {
      setIsGeneratingAcceptanceCriteria(false);
    }
  }

  async function generateProductScopeReviewPreview(
    skillId: "product-scope-review" | "mvp-slicing"
  ) {
    const timestamp = createTimestamp();
    const sourceSummary = readInputBriefSourceSummary();
    const processTasks = readProcessTasks();

    if (
      !brdPreview &&
      !srsPreview &&
      !userStoryPreview &&
      processTasks.length === 0 &&
      !productDeliveryContext.trim() &&
      !productDeliveryNotes.trim() &&
      !productDeliveryFileText.trim()
    ) {
      setMessage(
        locale === "vi"
          ? "Tạo preview BRD/SRS/User Stories hoặc thêm product context trước khi review scope."
          : "Generate BRD/SRS/User Stories preview or add product context before scope review."
      );
      return;
    }

    try {
      setIsGeneratingProductScopeReview(true);
      const response = await fetch("/api/ai/run-skill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          skillId,
          payload: {
            brd: brdPreview?.brd,
            srs: srsPreview?.srs,
            userStorySet: userStoryPreview?.userStorySet,
            processTasks,
            projectContext: productDeliveryContext,
            notes: productDeliveryNotes,
            sourceSummary,
            uploadedFileText: productDeliveryFileText,
            businessObjective: brdPreview?.brd.businessObjective,
            generatedAt: timestamp
          }
        })
      });
      const data =
        (await response.json()) as AISkillRouteResponse<ProductScopeReview>;

      if (!response.ok || !data.ok || !data.result) {
        setProductScopeReviewPreview(null);
        logRouteAIRun({
          skillId,
          success: false,
          meta: data.meta,
          errorMessage: data.error,
          validationErrors: data.validationErrors
        });
        setMessage(
          data.validationErrors?.length
            ? data.validationErrors.join(" ")
            : data.error || "Could not generate product scope review preview."
        );
        return;
      }

      setProductScopeReviewPreview({
        timestamp,
        sourceSkillId: skillId,
        scopeReview: data.result
      });
      saveAuditLogEntry({
        action: "generate_product_scope_review_preview",
        status: "success",
        summary:
          "Generated structured Product Scope Review preview through AI skill route.",
        metadata: {
          timestamp,
          skillId,
          externalRoute: "/api/ai/run-skill",
          inScopeCount: data.result.inScope.length,
          outOfScopeCount: data.result.outOfScope.length,
          mvpItemCount: data.result.mvpSlice.items.length,
          laterPhaseCount: data.result.laterPhases.length,
          qualityIssueCount: data.result.qualityIssues.length
        }
      });
      logRouteAIRun({ skillId, success: true, meta: data.meta });
      setMessage(
        locale === "vi"
          ? "Đã tạo preview Product Scope Review/MVP Slicing. Chưa lưu hoặc áp dụng."
          : "Created Product Scope Review/MVP Slicing preview. Nothing was saved or applied."
      );
    } catch (error) {
      setProductScopeReviewPreview(null);
      logRouteAIRun({
        skillId,
        success: false,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Unknown product scope review generation error."
      });
      setMessage(
        error instanceof Error
          ? locale === "vi"
            ? `Không thể tạo Product Scope Review preview: ${error.message}`
            : `Could not create Product Scope Review preview: ${error.message}`
          : locale === "vi"
            ? "Không thể tạo Product Scope Review preview. Vui lòng thử lại."
            : "Could not create Product Scope Review preview. Please try again."
      );
    } finally {
      setIsGeneratingProductScopeReview(false);
    }
  }

  async function generateRequirementQAPreview() {
    const timestamp = createTimestamp();

    if (
      !brdPreview &&
      !srsPreview &&
      !userStoryPreview &&
      !acceptanceCriteriaPreview &&
      !aiCodingPack
    ) {
      setMessage(
        locale === "vi"
          ? "Tạo preview BRD/SRS/User Stories/AC hoặc AI Coding Pack trước khi chạy Requirement QA."
          : "Generate BRD/SRS/User Stories/AC or AI Coding Pack preview before Requirement QA."
      );
      return;
    }

    try {
      setIsGeneratingRequirementQA(true);
      const response = await fetch("/api/ai/run-skill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          skillId: "requirement-quality-check",
          payload: {
            brd: brdPreview?.brd,
            srs: srsPreview?.srs,
            userStorySet: userStoryPreview?.userStorySet,
            acceptanceCriteria: acceptanceCriteriaPreview?.acceptanceCriteria,
            aiCodingPack: aiCodingPack
              ? {
                  files: mapCodingPackPreviewToRouteFiles(aiCodingPack.files),
                  qualityIssues: aiCodingPack.qualityIssues
                }
              : undefined,
            generatedAt: new Date().toISOString()
          }
        })
      });
      const data =
        (await response.json()) as AISkillRouteResponse<RequirementQAResponse>;
      const skillId = "requirement-quality-check";

      if (!response.ok || !data.ok || !data.result) {
        setRequirementQAPreview(null);
        logRouteAIRun({
          skillId,
          success: false,
          meta: data.meta,
          errorMessage: data.error,
          validationErrors: data.validationErrors
        });
        setMessage(
          data.validationErrors?.length
            ? data.validationErrors.join(" ")
            : data.error || "Could not generate Requirement QA preview."
        );
        return;
      }

      setRequirementQAPreview({
        timestamp,
        sourceSkillId: "requirement-quality-check",
        requirementQA: data.result
      });
      saveAuditLogEntry({
        action: "generate_requirement_qa_preview",
        status: "success",
        summary:
          "Generated Product Delivery Requirement QA preview through AI skill route.",
        metadata: {
          timestamp,
          skillId: "requirement-quality-check",
          findingCount: data.result.findings.length,
          recommendationCount: data.result.recommendations.length,
          uncoveredBrdRequirementCount:
            data.result.coverage.uncoveredBrdRequirementIds.length,
          uncoveredSrsRequirementCount:
            data.result.coverage.uncoveredSrsRequirementIds.length,
          storiesWithoutAcceptanceCriteriaCount:
            data.result.coverage.storiesWithoutAcceptanceCriteriaIds.length
        }
      });
      logRouteAIRun({ skillId, success: true, meta: data.meta });
      setMessage(
        locale === "vi"
          ? "Đã tạo preview Requirement QA. Không tự động lưu hoặc áp dụng."
          : "Created Requirement QA preview. Nothing was saved or applied automatically."
      );
    } catch (error) {
      setRequirementQAPreview(null);
      logRouteAIRun({
        skillId: "requirement-quality-check",
        success: false,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Unknown requirement QA generation error."
      });
      setMessage(
        error instanceof Error
          ? locale === "vi"
            ? `Không thể tạo Requirement QA preview: ${error.message}`
            : `Could not create Requirement QA preview: ${error.message}`
          : locale === "vi"
            ? "Không thể tạo Requirement QA preview. Vui lòng thử lại."
            : "Could not create Requirement QA preview. Please try again."
      );
    } finally {
      setIsGeneratingRequirementQA(false);
    }
  }

  async function downloadZip() {
    try {
      setIsDownloading(true);
      const currentArtifacts = artifacts ?? buildArtifacts();
      const zip = new JSZip();
      const timestamp = currentArtifacts.timestamp;

      zip.file(`D01_BPMN_${timestamp}.bpmn`, currentArtifacts.d01BpmnXml);
      zip.file(
        `D02_Service_Blueprint_${timestamp}.drawio`,
        currentArtifacts.d02ServiceBlueprintXml
      );
      zip.file(
        `Process_Task_Register_${timestamp}.json`,
        currentArtifacts.processTaskRegisterJson
      );
      zip.file(
        `Template_Profile_${timestamp}.json`,
        currentArtifacts.templateProfileJson
      );
      zip.file(`QA_Report_${timestamp}.md`, currentArtifacts.qaReportMarkdown);

      const zipBlob = await zip.generateAsync({ type: "blob" });

      downloadBlob(
        zipBlob,
        `Output_Package_${timestamp}.zip`,
        "application/zip"
      );
      saveAuditLogEntry({
        action: "export_zip",
        status: "success",
        summary: "Exported output package ZIP.",
        metadata: {
          timestamp,
          fileCount: 5
        }
      });
      setArtifacts(currentArtifacts);
      setExportPackageStatus("fresh");
      refreshArtifactStatuses();
      setMessage(locale === "vi" ? "Đã tạo ZIP gói đầu ra." : "Created output package ZIP.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? locale === "vi"
            ? `Không thể tải ZIP: ${error.message}`
            : `Could not download ZIP: ${error.message}`
          : locale === "vi"
            ? "Không thể tải ZIP. Vui lòng thử lại."
            : "Could not download ZIP. Please try again."
      );
    } finally {
      setIsDownloading(false);
    }
  }

  function downloadAuditLog() {
    downloadBlob(
      exportAuditLogJson(),
      `Audit_Log_${createTimestamp()}.json`,
      "application/json;charset=utf-8"
    );
    setMessage(locale === "vi" ? "Đã xuất JSON nhật ký kiểm toán." : "Exported audit log JSON.");
  }

  function downloadAIRunHistory() {
    downloadBlob(
      exportAIRunHistoryJson(),
      `AI_Run_History_${createTimestamp()}.json`,
      "application/json;charset=utf-8"
    );
    setMessage(
      locale === "vi"
        ? "Đã export lịch sử chạy AI dạng JSON."
        : "Exported AI Run History JSON."
    );
  }

  function previewAICodingPack() {
    try {
      const nextPack = buildAICodingPack();

      setAICodingPack({
        ...nextPack,
        sourceSkillId: "ptr-to-ai-coding-pack"
      });
      setMessage(
        locale === "vi"
          ? "Đã tạo preview AI Coding Pack deterministic."
          : "Created deterministic AI Coding Pack preview."
      );
    } catch (error) {
      setAICodingPack(null);
      setMessage(
        error instanceof Error
          ? locale === "vi"
            ? `Không thể tạo AI Coding Pack: ${error.message}`
            : `Could not create AI Coding Pack: ${error.message}`
          : locale === "vi"
            ? "Không thể tạo AI Coding Pack. Vui lòng kiểm tra dữ liệu."
            : "Could not create AI Coding Pack. Please check the data."
      );
    }
  }

  function previewProductDeliveryDraft() {
    try {
      const nextDraft = buildProductDeliveryDraft();

      setProductDeliveryDraft(nextDraft);
      setMessage(
        locale === "vi"
          ? "Đã tạo bản xem trước nháp hồ sơ sản phẩm theo cách xác định."
          : "Created deterministic Product Delivery draft preview."
      );
    } catch (error) {
      setProductDeliveryDraft(null);
      setMessage(
        error instanceof Error
          ? locale === "vi"
            ? `Không thể tạo nháp hồ sơ sản phẩm: ${error.message}`
            : `Could not create Product Delivery draft: ${error.message}`
          : locale === "vi"
            ? "Không thể tạo nháp hồ sơ sản phẩm. Vui lòng kiểm tra dữ liệu."
            : "Could not create Product Delivery draft. Please check the data."
      );
    }
  }

  function generateAllProductDelivery() {
    try {
      const nextDraft = buildProductDeliveryDraft();
      const processTasks = readProcessTasks();
      const sourceSummary = readInputBriefSourceSummary();
      const scopeReview = generateProductScopeReview({
        brd: nextDraft.draft.brd,
        srs: nextDraft.draft.srs,
        userStorySet: nextDraft.draft.userStorySet,
        processTasks,
        projectContext: productDeliveryContext,
        notes: productDeliveryNotes,
        sourceSummary,
        uploadedFileText: productDeliveryFileText,
        businessObjective: nextDraft.draft.brd.businessObjective,
        generatedAt: nextDraft.timestamp
      });

      setProductDeliveryDraft(nextDraft);
      setBRDPreview({
        timestamp: nextDraft.timestamp,
        sourceSkillId: "product-delivery-draft",
        brd: nextDraft.draft.brd
      });
      setSRSPreview({
        timestamp: nextDraft.timestamp,
        sourceSkillId: "product-delivery-draft",
        srs: nextDraft.draft.srs
      });
      setUserStoryPreview({
        timestamp: nextDraft.timestamp,
        sourceSkillId: "product-delivery-draft",
        userStorySet: nextDraft.draft.userStorySet
      });
      setAcceptanceCriteriaPreview({
        timestamp: nextDraft.timestamp,
        sourceSkillId: "product-delivery-draft",
        acceptanceCriteria: nextDraft.draft.acceptanceCriteria
      });
      setProductScopeReviewPreview({
        timestamp: nextDraft.timestamp,
        sourceSkillId: "product-delivery-draft",
        scopeReview
      });
      setRequirementQAPreview(null);
      saveAuditLogEntry({
        action: "generate_ai_draft",
        status: "success",
        summary:
          "Generated preview-first Product Delivery draft artifacts without export or apply.",
        metadata: {
          timestamp: nextDraft.timestamp,
          brdRequirementCount: nextDraft.draft.brd.businessRequirements.length,
          srsRequirementCount:
            nextDraft.draft.srs.functionalRequirements.length +
            nextDraft.draft.srs.nonFunctionalRequirements.length,
          userStoryCount: nextDraft.draft.userStorySet.stories.length,
          acceptanceCriteriaCount:
            nextDraft.draft.acceptanceCriteria.criteria.length,
          scopeItemCount: scopeReview.inScope.length,
          mvpItemCount: scopeReview.mvpSlice.items.length
        }
      });
      setMessage(
        locale === "vi"
          ? "Đã tạo preview nháp cho BRD, SRS, User Stories, Acceptance Criteria và Scope/MVP. Chưa export hoặc áp dụng."
          : "Created draft previews for BRD, SRS, User Stories, Acceptance Criteria, and Scope/MVP. Nothing was exported or applied."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? locale === "vi"
            ? `Không thể tạo toàn bộ hồ sơ bàn giao: ${error.message}`
            : `Could not generate all Product Delivery drafts: ${error.message}`
          : locale === "vi"
            ? "Không thể tạo toàn bộ hồ sơ bàn giao. Vui lòng kiểm tra dữ liệu."
            : "Could not generate all Product Delivery drafts. Please check the data."
      );
    }
  }

  function downloadProductDeliveryMarkdown() {
    try {
      if (!productDeliveryDraft) {
        setMessage(
          locale === "vi"
            ? "Hãy tạo preview Product Delivery trước khi tải xuống."
            : "Generate Product Delivery preview before downloading."
        );
        return;
      }

      downloadBlob(
        productDeliveryDraft.draft.combinedMarkdown,
        `Product_Delivery_Draft_${productDeliveryDraft.timestamp}.md`,
        "text/markdown;charset=utf-8"
      );
      saveAuditLogEntry({
        action: "export_product_delivery_draft",
        status: "success",
        summary: "Exported deterministic Product Delivery draft markdown.",
        metadata: {
          timestamp: productDeliveryDraft.timestamp,
          brdSectionCount: productDeliveryDraft.draft.brd.sections.length,
          srsRequirementCount:
            productDeliveryDraft.draft.srs.functionalRequirements.length,
          userStoryCount: productDeliveryDraft.draft.userStorySet.stories.length,
          acceptanceCriteriaCount:
            productDeliveryDraft.draft.acceptanceCriteria.criteria.length
        }
      });
      setMessage(
        locale === "vi"
          ? "Đã xuất Markdown nháp hồ sơ sản phẩm."
          : "Exported Product Delivery draft markdown."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? locale === "vi"
            ? `Không thể export Product Delivery draft: ${error.message}`
            : `Could not export Product Delivery draft: ${error.message}`
          : locale === "vi"
            ? "Không thể export Product Delivery draft. Vui lòng thử lại."
            : "Could not export Product Delivery draft. Please try again."
      );
    }
  }

  async function previewProductDeliveryAICodingPack() {
    const timestamp = createTimestamp();
    const processTasks = readProcessTasks();
    const sourceSummary = readInputBriefSourceSummary();

    if (
      !brdPreview &&
      !srsPreview &&
      !userStoryPreview &&
      !acceptanceCriteriaPreview &&
      processTasks.length === 0
    ) {
      setMessage(
        locale === "vi"
          ? "Tạo preview BRD/SRS/User Stories/AC hoặc bảo đảm PTR có dòng trước khi tạo AI Coding Pack."
          : "Generate BRD/SRS/User Stories/AC preview or ensure PTR has rows before AI Coding Pack."
      );
      return;
    }

    try {
      const response = await fetch("/api/ai/run-skill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          skillId: "user-stories-to-ai-coding-pack",
          payload: {
            brd: brdPreview?.brd,
            srs: srsPreview?.srs,
            userStorySet: userStoryPreview?.userStorySet,
            acceptanceCriteria: acceptanceCriteriaPreview?.acceptanceCriteria,
            processTasks,
            projectContext: productDeliveryContext || projectContext,
            notes: productDeliveryNotes,
            sourceSummary,
            uploadedFileText: productDeliveryFileText,
            assumptions: [
              "AI Coding Pack is generated from reviewed Product Delivery artifacts."
            ],
            openQuestions: [
              "Confirm target repository architecture before implementation."
            ],
            generatedAt: timestamp
          }
        })
      });
      const data =
        (await response.json()) as AISkillRouteResponse<AICodingPackRouteResponse>;
      const skillId = "user-stories-to-ai-coding-pack";

      if (!response.ok || !data.ok || !data.result) {
        setAICodingPack(null);
        logRouteAIRun({
          skillId,
          success: false,
          meta: data.meta,
          errorMessage: data.error,
          validationErrors: data.validationErrors
        });
        setMessage(
          data.validationErrors?.length
            ? data.validationErrors.join(" ")
            : data.error || "Could not generate Product Delivery AI Coding Pack."
        );
        return;
      }

      const files = mapRouteCodingPackFiles(data.result);

      setAICodingPack({
        timestamp,
        files,
        sourceSkillId: "user-stories-to-ai-coding-pack",
        qualityIssues: data.result.qualityIssues
      });
      saveAuditLogEntry({
        action: "generate_product_delivery_ai_coding_pack",
        status: "success",
        summary:
          "Generated AI Coding Pack preview from Product Delivery artifacts.",
        metadata: {
          timestamp,
          skillId: "user-stories-to-ai-coding-pack",
          fileCount: data.result.files.length,
          qualityIssueCount: data.result.qualityIssues?.length ?? 0
        }
      });
      logRouteAIRun({ skillId, success: true, meta: data.meta });
      setMessage(
        locale === "vi"
          ? "Đã tạo bản xem trước AI Coding Pack từ artifact hồ sơ sản phẩm."
          : "Created AI Coding Pack preview from Product Delivery artifacts."
      );
    } catch (error) {
      setAICodingPack(null);
      logRouteAIRun({
        skillId: "user-stories-to-ai-coding-pack",
        success: false,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Unknown AI Coding Pack generation error."
      });
      setMessage(
        error instanceof Error
          ? locale === "vi"
            ? `Không thể tạo Product Delivery AI Coding Pack: ${error.message}`
            : `Could not create Product Delivery AI Coding Pack: ${error.message}`
          : locale === "vi"
            ? "Không thể tạo Product Delivery AI Coding Pack. Vui lòng thử lại."
            : "Could not create Product Delivery AI Coding Pack. Please try again."
      );
    }
  }

  function downloadBRDJson() {
    if (!brdPreview) {
      setMessage(locale === "vi" ? "Tạo preview BRD trước khi tải xuống." : "Generate BRD preview before downloading.");
      return;
    }

    downloadBlob(
      JSON.stringify(brdPreview.brd, null, 2),
      `BRD_Draft_${brdPreview.timestamp}.json`,
      "application/json;charset=utf-8"
    );
    saveAuditLogEntry({
      action: "export_brd_draft",
      status: "success",
      summary: "Exported structured BRD draft JSON.",
      metadata: {
        timestamp: brdPreview.timestamp,
        skillId: brdPreview.sourceSkillId,
        businessRequirementCount: brdPreview.brd.businessRequirements.length,
        qualityIssueCount: brdPreview.brd.qualityIssues.length
      }
    });
    setMessage(locale === "vi" ? "Đã export BRD draft JSON." : "Exported BRD draft JSON.");
  }

  function downloadSRSJson() {
    if (!srsPreview) {
      setMessage(locale === "vi" ? "Tạo preview SRS trước khi tải xuống." : "Generate SRS preview before downloading.");
      return;
    }

    downloadBlob(
      JSON.stringify(srsPreview.srs, null, 2),
      `SRS_Draft_${srsPreview.timestamp}.json`,
      "application/json;charset=utf-8"
    );
    saveAuditLogEntry({
      action: "export_srs_draft",
      status: "success",
      summary: "Exported structured SRS draft JSON.",
      metadata: {
        timestamp: srsPreview.timestamp,
        skillId: srsPreview.sourceSkillId,
        functionalRequirementCount:
          srsPreview.srs.functionalRequirements.length,
        nonFunctionalRequirementCount:
          srsPreview.srs.nonFunctionalRequirements.length,
        qualityIssueCount: srsPreview.srs.qualityIssues.length
      }
    });
    setMessage(locale === "vi" ? "Đã export SRS draft JSON." : "Exported SRS draft JSON.");
  }

  function downloadUserStoriesJson() {
    if (!userStoryPreview) {
      setMessage(locale === "vi" ? "Tạo preview User Stories trước khi tải xuống." : "Generate User Stories preview before downloading.");
      return;
    }

    downloadBlob(
      JSON.stringify(userStoryPreview.userStorySet, null, 2),
      `User_Stories_Draft_${userStoryPreview.timestamp}.json`,
      "application/json;charset=utf-8"
    );
    saveAuditLogEntry({
      action: "export_user_stories_draft",
      status: "success",
      summary: "Exported structured User Story Set draft JSON.",
      metadata: {
        timestamp: userStoryPreview.timestamp,
        skillId: userStoryPreview.sourceSkillId,
        epicCount: userStoryPreview.userStorySet.epics.length,
        storyCount: userStoryPreview.userStorySet.stories.length,
        qualityIssueCount: userStoryPreview.userStorySet.qualityIssues.length
      }
    });
    setMessage(locale === "vi" ? "Đã export User Stories draft JSON." : "Exported User Stories draft JSON.");
  }

  function downloadAcceptanceCriteriaJson() {
    if (!acceptanceCriteriaPreview) {
      setMessage(locale === "vi" ? "Tạo preview Acceptance Criteria trước khi tải xuống." : "Generate Acceptance Criteria preview before downloading.");
      return;
    }

    downloadBlob(
      JSON.stringify(acceptanceCriteriaPreview.acceptanceCriteria, null, 2),
      `Acceptance_Criteria_Draft_${acceptanceCriteriaPreview.timestamp}.json`,
      "application/json;charset=utf-8"
    );
    saveAuditLogEntry({
      action: "export_acceptance_criteria_draft",
      status: "success",
      summary: "Exported structured Acceptance Criteria draft JSON.",
      metadata: {
        timestamp: acceptanceCriteriaPreview.timestamp,
        skillId: acceptanceCriteriaPreview.sourceSkillId,
        criteriaCount:
          acceptanceCriteriaPreview.acceptanceCriteria.criteria.length,
        qualityIssueCount:
          acceptanceCriteriaPreview.acceptanceCriteria.qualityIssues.length
      }
    });
    setMessage(locale === "vi" ? "Đã export Acceptance Criteria draft JSON." : "Exported Acceptance Criteria draft JSON.");
  }

  function downloadProductScopeReviewJson() {
    if (!productScopeReviewPreview) {
      setMessage(locale === "vi" ? "Tạo preview Product Scope Review trước khi tải xuống." : "Generate Product Scope Review preview before downloading.");
      return;
    }

    downloadBlob(
      JSON.stringify(productScopeReviewPreview.scopeReview, null, 2),
      `Product_Scope_Review_Draft_${productScopeReviewPreview.timestamp}.json`,
      "application/json;charset=utf-8"
    );
    saveAuditLogEntry({
      action: "export_product_scope_review_draft",
      status: "success",
      summary: "Exported structured Product Scope Review draft JSON.",
      metadata: {
        timestamp: productScopeReviewPreview.timestamp,
        skillId: productScopeReviewPreview.sourceSkillId,
        inScopeCount: productScopeReviewPreview.scopeReview.inScope.length,
        outOfScopeCount: productScopeReviewPreview.scopeReview.outOfScope.length,
        mvpItemCount:
          productScopeReviewPreview.scopeReview.mvpSlice.items.length,
        qualityIssueCount:
          productScopeReviewPreview.scopeReview.qualityIssues.length
      }
    });
    setMessage(locale === "vi" ? "Đã export Product Scope Review draft JSON." : "Exported Product Scope Review draft JSON.");
  }

  async function downloadAICodingPackZip() {
    try {
      setIsDownloadingAICodingPack(true);
      const currentPack: AICodingPackPreview =
        aiCodingPack ?? {
          ...buildAICodingPack(),
          sourceSkillId: "ptr-to-ai-coding-pack"
        };
      const zip = new JSZip();
      const { files, timestamp } = currentPack;

      zip.file("AGENTS.md", files.agentsMd);
      zip.file("CLAUDE.md", files.claudeMd);
      zip.file("cursor-rules.md", files.cursorRulesMd);
      zip.file("spec.json", files.specJson);
      zip.file("acceptance-criteria.md", files.acceptanceCriteriaMd);
      zip.file("implementation-plan.md", files.implementationPlanMd);
      zip.file("test-plan.md", files.testPlanMd);

      const zipBlob = await zip.generateAsync({ type: "blob" });

      downloadBlob(
        zipBlob,
        `AI_Coding_Pack_${timestamp}.zip`,
        "application/zip"
      );
      saveAuditLogEntry({
        action:
          currentPack.sourceSkillId === "user-stories-to-ai-coding-pack"
            ? "export_product_delivery_ai_coding_pack"
            : "export_ai_coding_pack",
        status: "success",
        summary:
          currentPack.sourceSkillId === "user-stories-to-ai-coding-pack"
            ? "Exported Product Delivery AI Coding Pack ZIP."
            : "Exported deterministic AI Coding Pack ZIP.",
        metadata: {
          timestamp,
          fileCount: 7,
          skillId: currentPack.sourceSkillId ?? "ptr-to-ai-coding-pack",
          qualityIssueCount: currentPack.qualityIssues?.length ?? 0
        }
      });
      setAICodingPack(currentPack);
      setMessage(locale === "vi" ? "Đã tạo ZIP AI Coding Pack." : "Created AI Coding Pack ZIP.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? locale === "vi"
            ? `Không thể download AI Coding Pack: ${error.message}`
            : `Could not download AI Coding Pack: ${error.message}`
          : locale === "vi"
            ? "Không thể download AI Coding Pack. Vui lòng thử lại."
            : "Could not download AI Coding Pack. Please try again."
      );
    } finally {
      setIsDownloadingAICodingPack(false);
    }
  }

  function getProductDeliveryStatusLabel(status: ProductDeliveryCardStatus) {
    if (status === "ready") {
      return text.ready;
    }

    if (status === "draft") {
      return text.draft;
    }

    if (status === "stale") {
      return text.stale;
    }

    return text.notCreated;
  }

  function getProductDeliveryStatusClass(status: ProductDeliveryCardStatus) {
    if (status === "ready") {
      return "status-badge status-badge-success";
    }

    if (status === "draft") {
      return "status-badge status-badge-warning";
    }

    if (status === "stale") {
      return "status-badge status-badge-warning";
    }

    return "status-badge status-badge-neutral";
  }

  const productDeliveryCards = [
    {
      id: "brd",
      href: "#product-delivery-brd",
      title: "BRD",
      status: brdPreview ? "draft" : "not-created",
      summary: brdPreview
        ? `${brdPreview.brd.businessRequirements.length} ${
            locale === "vi" ? "yêu cầu" : "requirements"
          }`
        : locale === "vi"
          ? "Bản nháp yêu cầu nghiệp vụ."
          : "Business requirements draft.",
      primaryLabel: locale === "vi" ? "Tạo BRD" : "Generate BRD",
      primaryDisabled: isGeneratingBRD,
      onPrimary: () => void generateBRDPreview("ptr-to-brd"),
      downloadLabel: locale === "vi" ? "Tải BRD JSON" : "Download BRD JSON",
      downloadDisabled: !brdPreview,
      onDownload: downloadBRDJson,
      more: (
        <button
          className="btn btn-ai text-sm"
          disabled={isGeneratingBRD}
          onClick={() => void generateBRDPreview("notes-to-brd")}
          type="button"
        >
          {locale === "vi" ? "Tạo BRD từ ghi chú" : "Generate BRD from Notes"}
        </button>
      )
    },
    {
      id: "srs",
      href: "#product-delivery-srs",
      title: "SRS",
      status: srsPreview ? "draft" : "not-created",
      summary: srsPreview
        ? `${
            srsPreview.srs.functionalRequirements.length +
            srsPreview.srs.nonFunctionalRequirements.length
          } ${locale === "vi" ? "yêu cầu" : "requirements"}`
        : locale === "vi"
          ? "Đặc tả yêu cầu phần mềm."
          : "Software requirements draft.",
      primaryLabel: locale === "vi" ? "Tạo SRS" : "Generate SRS",
      primaryDisabled: isGeneratingSRS,
      onPrimary: () => void generateSRSPreview("brd-to-srs"),
      downloadLabel: locale === "vi" ? "Tải SRS JSON" : "Download SRS JSON",
      downloadDisabled: !srsPreview,
      onDownload: downloadSRSJson,
      more: (
        <button
          className="btn btn-ai text-sm"
          disabled={isGeneratingSRS}
          onClick={() => void generateSRSPreview("notes-to-srs")}
          type="button"
        >
          {locale === "vi" ? "Tạo SRS từ ghi chú" : "Generate SRS from Notes"}
        </button>
      )
    },
    {
      id: "stories",
      href: "#product-delivery-stories",
      title: "User Stories",
      status: userStoryPreview ? "draft" : "not-created",
      summary: userStoryPreview
        ? `${userStoryPreview.userStorySet.stories.length} ${
            locale === "vi" ? "story" : "stories"
          }`
        : locale === "vi"
          ? "Story có trace về nguồn."
          : "Traceable user stories.",
      primaryLabel: locale === "vi" ? "Tạo User Stories" : "Generate User Stories",
      primaryDisabled: isGeneratingUserStories,
      onPrimary: () => void generateUserStoryPreview("srs-to-user-stories"),
      downloadLabel:
        locale === "vi" ? "Tải Stories JSON" : "Download Stories JSON",
      downloadDisabled: !userStoryPreview,
      onDownload: downloadUserStoriesJson,
      more: (
        <button
          className="btn btn-ai text-sm"
          disabled={isGeneratingUserStories}
          onClick={() => void generateUserStoryPreview("brd-to-user-stories")}
          type="button"
        >
          {locale === "vi" ? "Tạo User Stories từ BRD" : "Generate User Stories from BRD"}
        </button>
      )
    },
    {
      id: "acceptance",
      href: "#product-delivery-acceptance",
      title: "Acceptance Criteria",
      status: acceptanceCriteriaPreview ? "draft" : "not-created",
      summary: acceptanceCriteriaPreview
        ? `${acceptanceCriteriaPreview.acceptanceCriteria.criteria.length} ${
            locale === "vi" ? "tiêu chí" : "criteria"
          }`
        : locale === "vi"
          ? "Tiêu chí kiểm thử có thể review."
          : "Reviewable test criteria.",
      primaryLabel:
        locale === "vi" ? "Tạo Acceptance Criteria" : "Generate Acceptance Criteria",
      primaryDisabled: isGeneratingAcceptanceCriteria,
      onPrimary: () => void generateAcceptanceCriteriaPreview(),
      downloadLabel: locale === "vi" ? "Tải AC JSON" : "Download AC JSON",
      downloadDisabled: !acceptanceCriteriaPreview,
      onDownload: downloadAcceptanceCriteriaJson,
      more: null
    },
    {
      id: "scope",
      href: "#product-delivery-scope",
      title: "Scope/MVP",
      status: productScopeReviewPreview ? "draft" : "not-created",
      summary: productScopeReviewPreview
        ? `${productScopeReviewPreview.scopeReview.mvpSlice.items.length} MVP ${
            locale === "vi" ? "mục" : "items"
          }`
        : locale === "vi"
          ? "Rà soát phạm vi và lát cắt MVP."
          : "Scope review and MVP slicing.",
      primaryLabel: locale === "vi" ? "Rà soát Scope/MVP" : "Review Scope/MVP",
      primaryDisabled: isGeneratingProductScopeReview,
      onPrimary: () => void generateProductScopeReviewPreview("product-scope-review"),
      downloadLabel:
        locale === "vi" ? "Tải Scope JSON" : "Download Scope JSON",
      downloadDisabled: !productScopeReviewPreview,
      onDownload: downloadProductScopeReviewJson,
      more: (
        <button
          className="btn btn-ai text-sm"
          disabled={isGeneratingProductScopeReview}
          onClick={() => void generateProductScopeReviewPreview("mvp-slicing")}
          type="button"
        >
          {locale === "vi" ? "Tạo MVP Slicing" : "Generate MVP Slicing"}
        </button>
      )
    },
    {
      id: "handoff",
      href: "#product-delivery-handoff",
      title: text.aiDevelopmentHandoffPack,
      status: aiCodingPack ? "ready" : "not-created",
      summary: aiCodingPack
        ? `${Object.keys(aiCodingPack.files).length} ${locale === "vi" ? "tệp" : "files"}`
        : locale === "vi"
          ? "Gói ZIP sau khi đã preview."
          : "ZIP package after preview.",
      primaryLabel:
        locale === "vi" ? "Xem trước Handoff Pack" : "Preview Handoff Pack",
      primaryDisabled: false,
      onPrimary: () => void previewProductDeliveryAICodingPack(),
      downloadLabel:
        locale === "vi" ? "Tải Handoff ZIP" : "Download Handoff ZIP",
      downloadDisabled: !aiCodingPack || isDownloadingAICodingPack,
      onDownload: downloadAICodingPackZip,
      more: (
        <button
          className="btn btn-secondary text-sm"
          onClick={previewAICodingPack}
          type="button"
        >
          {text.previewPtrHandoffPack}
        </button>
      )
    }
  ] satisfies Array<{
    id: string;
    href: string;
    title: string;
    status: ProductDeliveryCardStatus;
    summary: string;
    primaryLabel: string;
    primaryDisabled: boolean;
    onPrimary: () => void;
    downloadLabel: string;
    downloadDisabled: boolean;
    onDownload: () => void;
    more: ReactNode;
  }>;

  return (
    <section className="surface-card overflow-hidden">
      <div className="section-header p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="status-badge status-badge-success">
              {isProductDeliveryView ? text.productDelivery : text.title}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">
              {isProductDeliveryView
                ? locale === "vi"
                  ? "Bàn giao sản phẩm"
                  : "Product Delivery"
                : locale === "vi"
                  ? "Gói ZIP đầu ra"
                  : "Output Package ZIP"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {isProductDeliveryView ? text.productDeliveryDescription : text.description}
            </p>
          </div>

          {isProductDeliveryView ? (
            <div className="section-actions">
              <button
                className="btn btn-primary"
                onClick={generateAllProductDelivery}
                type="button"
              >
                {text.generateAllProductDelivery}
              </button>
            </div>
          ) : null}

          {isExportView ? (
            <div className="section-actions">
              <button
                className="btn btn-secondary"
                onClick={generateAllArtifacts}
                type="button"
              >
                {text.generateAllArtifacts}
              </button>
              <button
                className="btn btn-primary"
                disabled={isDownloading}
                onClick={downloadZip}
                type="button"
              >
                {isDownloading ? text.generatingZip : text.downloadZip}
              </button>
              <button
                className="btn btn-secondary"
                onClick={downloadAuditLog}
                type="button"
              >
                {locale === "vi" ? "Xuất JSON nhật ký kiểm toán" : "Export Audit Log JSON"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={downloadAIRunHistory}
                type="button"
              >
                {text.exportHistoryJson}
              </button>
            </div>
          ) : null}
        </div>

        {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}

        {isProductDeliveryView ? (
          <nav
            aria-label="Product Delivery sections"
            className="mt-4 flex gap-2 overflow-x-auto pb-1"
          >
            {[
              {
                href: "#product-delivery-overview",
                label: locale === "vi" ? "Tổng quan" : "Overview"
              },
              { href: "#product-delivery-brd", label: "BRD" },
              { href: "#product-delivery-srs", label: "SRS" },
              { href: "#product-delivery-stories", label: "User Stories" },
              { href: "#product-delivery-acceptance", label: "Acceptance Criteria" },
              { href: "#product-delivery-scope", label: "Scope/MVP" },
              { href: "#product-delivery-handoff", label: text.aiDevelopmentHandoffPack }
            ].map((section) => (
              <a
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
                href={section.href}
                key={section.href}
              >
                {section.label}
              </a>
            ))}
          </nav>
        ) : null}
      </div>

      <div className={isExportView ? "contents" : "hidden"}>
      <div className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-5">
        {[
          ["D01 BPMN", readiness.d01Bpmn],
          ["D02 Service Blueprint", readiness.d02ServiceBlueprint],
          ["QA Report", readiness.qaReport],
          ["Process Task Register", readiness.processTaskRegister],
          ["Template Profile", readiness.templateProfile]
        ].map(([label, status]) => (
          <div className="compact-card" key={String(label)}>
            <p className="text-sm font-semibold text-slate-950">{label}</p>
            <p
              className={`mt-2 status-badge ${
                status === "fresh"
                  ? "status-badge-success"
                  : status === "stale"
                    ? "status-badge-warning"
                    : "status-badge-neutral"
              }`}
            >
              {status === "fresh"
                ? locale === "vi"
                  ? "Mới nhất"
                  : "Fresh"
                : status === "stale"
                  ? locale === "vi"
                    ? "Cần tạo lại"
                    : "Stale"
                  : locale === "vi"
                    ? "Chưa tạo"
                    : "Not generated"}
            </p>
          </div>
        ))}
      </div>

      <details className="advanced-panel mx-4 mb-4">
        <summary>
          {locale === "vi" ? "Nâng cao / Lịch sử chạy AI" : "Advanced / AI Run History"} ({aiRunHistory.length})
        </summary>
      <div className="border-t border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase text-slate-500">
              {text.localAuditLog}
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">
              {text.aiRunHistory}
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {text.aiRunHistorySafeNote}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn btn-secondary"
              onClick={refreshAIRunHistory}
              type="button"
            >
              {text.refreshHistory}
            </button>
            <button
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={downloadAIRunHistory}
              type="button"
            >
              {text.exportHistoryJson}
            </button>
          </div>
        </div>

        {aiRunHistory.length ? (
          <div className="mt-4 overflow-x-auto rounded border border-slate-200">
            <table className="min-w-[72rem] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Skill</th>
                  <th className="px-3 py-2 font-semibold">
                    {locale === "vi" ? "Nhà cung cấp" : "Provider"}
                  </th>
                  <th className="px-3 py-2 font-semibold">Model</th>
                  <th className="px-3 py-2 font-semibold">
                    {text.status}
                  </th>
                  <th className="px-3 py-2 font-semibold">
                    {text.validation}
                  </th>
                  <th className="px-3 py-2 font-semibold">Latency</th>
                  <th className="px-3 py-2 font-semibold">{text.external}</th>
                  <th className="px-3 py-2 font-semibold">Tokens</th>
                  <th className="px-3 py-2 font-semibold">
                    {locale === "vi" ? "Thời điểm" : "Timestamp"}
                  </th>
                  <th className="px-3 py-2 font-semibold">
                    {text.details}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                {aiRunHistory.slice(0, 8).map((run) => {
                  const isExpanded = expandedAIRunId === run.id;
                  const canExpand =
                    run.status === "failure" ||
                    run.validationStatus === "invalid" ||
                    run.warnings.length > 0;

                  return (
                    <Fragment key={run.id}>
                      <tr key={run.id}>
                        <td className="px-3 py-2 font-medium text-slate-950">
                          {run.skillId}
                        </td>
                        <td className="px-3 py-2">{run.provider}</td>
                        <td className="px-3 py-2">{run.model || "-"}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded px-2 py-1 text-xs font-medium ${
                              run.status === "success"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {run.status}
                          </span>
                        </td>
                        <td className="px-3 py-2">{run.validationStatus}</td>
                        <td className="px-3 py-2">
                          {run.latencyMs === undefined
                            ? "-"
                            : `${run.latencyMs}ms`}
                        </td>
                        <td className="px-3 py-2">
                          {run.externalApiCalled ? text.yes : text.no}
                        </td>
                        <td className="px-3 py-2">
                          {run.tokenUsage?.totalTokens ?? "-"}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-500">
                          {new Date(run.timestamp).toLocaleString()}
                        </td>
                        <td className="px-3 py-2">
                          {canExpand ? (
                            <button
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              onClick={() =>
                                setExpandedAIRunId(isExpanded ? null : run.id)
                              }
                              type="button"
                            >
                              {isExpanded ? text.hideDetails : text.showDetails}
                            </button>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr key={`${run.id}-details`}>
                          <td className="bg-slate-50 px-3 py-3" colSpan={10}>
                            <div className="grid gap-3 text-xs text-slate-700 md:grid-cols-2">
                              <p>
                                <span className="font-semibold">{text.errorType}:</span>{" "}
                                {run.errorType || text.notApplicable}
                              </p>
                              <p>
                                <span className="font-semibold">{text.requestId}:</span>{" "}
                                {run.requestId || text.notAvailable}
                              </p>
                              <p className="md:col-span-2">
                                <span className="font-semibold">
                                  {text.safeMessage}:
                                </span>{" "}
                                {run.safeErrorMessage || text.noSafeError}
                              </p>
                              <p className="md:col-span-2">
                                <span className="font-semibold">
                                  {text.validationSummary}:
                                </span>{" "}
                                {run.validationErrorSummary ||
                                  (run.validationStatus === "valid"
                                    ? text.valid
                                    : text.noValidationSummary)}
                              </p>
                              <p className="md:col-span-2">
                                <span className="font-semibold">{text.warnings}:</span>{" "}
                                {run.warnings.length
                                  ? run.warnings.join("; ")
                                  : text.none}
                              </p>
                              <p className="md:col-span-2">
                                <span className="font-semibold">
                                  {text.suggestedNextAction}:
                                </span>{" "}
                                {run.suggestedNextAction}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 rounded border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            {locale === "vi"
              ? "Chưa có bản ghi chạy AI. Chạy AI skill ở Module 2 hoặc Module 3 để cập nhật lịch sử local này."
              : "No AI run records yet. Run a Module 2 or Module 3 AI skill to populate this local history."}
          </div>
        )}
      </div>
      </details>
      </div>

      <div className={isProductDeliveryView ? "contents" : "hidden"}>
      <div className="border-t border-slate-200 p-4" id="product-delivery-overview">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium uppercase text-slate-500">
              {text.productDelivery}
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">
              {locale === "vi"
                ? "Tổng quan hồ sơ bàn giao sản phẩm"
                : "Product Delivery overview"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {text.productDeliveryDescription}
            </p>
            <details className="mt-4 rounded border border-emerald-100 bg-emerald-50/60 p-4 text-sm text-emerald-950">
              <summary className="cursor-pointer font-semibold">
                {text.productDeliveryHowItWorks}
              </summary>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {[
                  { title: text.productDeliveryStep1Title, body: text.productDeliveryStep1Body },
                  { title: text.productDeliveryStep2Title, body: text.productDeliveryStep2Body },
                  { title: text.productDeliveryStep3Title, body: text.productDeliveryStep3Body }
                ].map((step, index) => (
                  <div className="rounded border border-emerald-100 bg-white/80 p-3" key={step.title}>
                    <p className="text-xs font-bold uppercase text-emerald-700">
                      {index + 1}. {step.title}
                    </p>
                    <p className="mt-1 leading-5 text-emerald-950/80">{step.body}</p>
                  </div>
                ))}
              </div>
            </details>
            <div className="hidden">
              {[
                {
                  label: "BRD",
                  value: brdPreview
                    ? locale === "vi"
                      ? "Đã có preview"
                      : "Preview ready"
                    : locale === "vi"
                      ? "Chưa tạo"
                      : "Not generated"
                },
                {
                  label: "SRS",
                  value: srsPreview
                    ? locale === "vi"
                      ? "Đã có preview"
                      : "Preview ready"
                    : locale === "vi"
                      ? "Chưa tạo"
                      : "Not generated"
                },
                {
                  label: "User Stories",
                  value: userStoryPreview
                    ? locale === "vi"
                      ? `${userStoryPreview.userStorySet.stories.length} story`
                      : `${userStoryPreview.userStorySet.stories.length} stories`
                    : locale === "vi"
                      ? "Chưa tạo"
                      : "Not generated"
                },
                {
                  label: "Acceptance Criteria",
                  value: acceptanceCriteriaPreview
                    ? `${acceptanceCriteriaPreview.acceptanceCriteria.criteria.length}`
                    : locale === "vi"
                      ? "Chưa tạo"
                      : "Not generated"
                },
                {
                  label: "Scope/MVP",
                  value: productScopeReviewPreview
                    ? locale === "vi"
                      ? "Đã có preview"
                      : "Preview ready"
                    : locale === "vi"
                      ? "Chưa tạo"
                      : "Not generated"
                },
                {
                  label: text.aiDevelopmentHandoffPack,
                  value: aiCodingPack
                    ? locale === "vi"
                      ? "Đã có preview"
                      : "Preview ready"
                    : locale === "vi"
                      ? "Chưa tạo"
                      : "Not generated"
                }
              ].map((status) => (
                <div className="compact-card px-3 py-2" key={status.label}>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {status.label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {status.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  {text.optionalProjectContext}
                </span>
                <textarea
                  className="mt-2 min-h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800"
                  onChange={(event) => setProductDeliveryContext(event.target.value)}
                  placeholder={
                    locale === "vi"
                      ? "Ví dụ: phạm vi MVP, người dùng mục tiêu, mục tiêu kinh doanh, ràng buộc delivery..."
                      : "Example: MVP scope, target users, business objective, delivery constraints..."
                  }
                  value={productDeliveryContext}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  {locale === "vi" ? "Ghi chú tùy chọn" : "Optional notes"}
                </span>
                <textarea
                  className="mt-2 min-h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800"
                  onChange={(event) => setProductDeliveryNotes(event.target.value)}
                  placeholder={
                    locale === "vi"
                      ? "Dán ghi chú workshop, ghi chú BRD, giả định hoặc nhận xét của stakeholder..."
                      : "Paste workshop notes, BRD notes, assumptions, or stakeholder comments..."
                  }
                  value={productDeliveryNotes}
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-700">
                  {locale === "vi" ? "Text trích xuất từ tệp tùy chọn" : "Optional uploaded file text"}
                </span>
                <textarea
                  className="mt-2 min-h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800"
                  onChange={(event) => setProductDeliveryFileText(event.target.value)}
                  placeholder={
                    locale === "vi"
                      ? "Dán văn bản đã trích xuất từ PDF/DOCX khi có. Trình duyệt không gọi trực tiếp nhà cung cấp AI bên ngoài."
                      : "Paste extracted PDF/DOCX text when available. Browser does not call external AI providers directly."
                  }
                  value={productDeliveryFileText}
                />
              </label>
            </div>
            <div className="hidden">
              {[
                { vi: "BRD", en: "BRD" },
                { vi: "SRS", en: "SRS" },
                { vi: "User story", en: "User Stories" },
                { vi: "Acceptance Criteria", en: "Acceptance Criteria" },
                { vi: "Rà soát phạm vi", en: "Scope Review" },
                { vi: "Cắt MVP", en: "MVP Slicing" },
                { vi: "Gói bàn giao phát triển", en: "AI Development Handoff Pack" }
              ].map((capability) => (
                <div
                  className="compact-card px-3 py-2 font-medium text-slate-700"
                  key={capability.en}
                >
                  {capability[locale]}
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {productDeliveryCards.map((card) => (
                <article
                  className="compact-card flex min-h-52 flex-col justify-between"
                  key={card.id}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <a
                          className="text-sm font-semibold text-slate-950 hover:text-blue-700"
                          href={card.href}
                        >
                          {card.title}
                        </a>
                        <p className="mt-2 text-sm leading-5 text-slate-600">
                          {card.summary}
                        </p>
                      </div>
                      <span className={getProductDeliveryStatusClass(card.status)}>
                        {getProductDeliveryStatusLabel(card.status)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      className="btn btn-primary text-sm"
                      disabled={card.primaryDisabled}
                      onClick={card.onPrimary}
                      type="button"
                    >
                      {card.primaryLabel}
                    </button>
                    {!card.downloadDisabled ? (
                      <button
                        className="btn btn-secondary text-sm"
                        onClick={card.onDownload}
                        type="button"
                      >
                        {card.downloadLabel}
                      </button>
                    ) : null}
                    {card.more ? (
                      <details className="w-full rounded border border-slate-200 bg-slate-50">
                        <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-slate-700">
                          {text.more}
                        </summary>
                        <div className="border-t border-slate-200 p-3">
                          {card.more}
                        </div>
                      </details>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>

            <details className="advanced-panel mt-4">
              <summary>
                {locale === "vi"
                  ? "Nâng cao / Tác vụ Product Delivery khác"
                  : "Advanced / More Product Delivery actions"}
              </summary>
              <div className="grid gap-3 border-t border-slate-200 p-3 md:grid-cols-2">
                <button
                  className="btn btn-secondary"
                  onClick={previewProductDeliveryDraft}
                  type="button"
                >
                  {text.generateProductDeliveryDraft}
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={!productDeliveryDraft}
                  onClick={downloadProductDeliveryMarkdown}
                  type="button"
                >
                  {text.downloadProductDeliveryMarkdown}
                </button>
                <button
                  className="btn btn-ai"
                  disabled={isGeneratingRequirementQA}
                  onClick={() => void generateRequirementQAPreview()}
                  type="button"
                >
                  {isGeneratingRequirementQA
                    ? locale === "vi"
                      ? "Đang chạy Requirement QA..."
                      : "Running Requirement QA..."
                    : locale === "vi"
                      ? "Chạy Requirement QA"
                      : "Run Requirement QA"}
                </button>
              </div>
            </details>

            <div className="hidden">
              <div className="action-card bg-slate-50">
                <p className="text-sm font-semibold text-slate-950">
                  {locale === "vi" ? "Tổng quan" : "Summary"}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {locale === "vi"
                    ? "Trạng thái preview của các artifact chính trong hồ sơ bàn giao."
                    : "Preview status for the main artifacts in the delivery pack."}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {[
                    {
                      label: "BRD",
                      value: brdPreview
                        ? locale === "vi"
                          ? "Đã có preview"
                          : "Preview ready"
                        : locale === "vi"
                          ? "Chưa tạo"
                          : "Not generated"
                    },
                    {
                      label: "SRS",
                      value: srsPreview
                        ? locale === "vi"
                          ? "Đã có preview"
                          : "Preview ready"
                        : locale === "vi"
                          ? "Chưa tạo"
                          : "Not generated"
                    },
                    {
                      label: "Stories",
                      value: userStoryPreview
                        ? `${userStoryPreview.userStorySet.stories.length}`
                        : locale === "vi"
                          ? "Chưa tạo"
                          : "Not generated"
                    },
                    {
                      label: "AC",
                      value: acceptanceCriteriaPreview
                        ? `${acceptanceCriteriaPreview.acceptanceCriteria.criteria.length}`
                        : locale === "vi"
                          ? "Chưa tạo"
                          : "Not generated"
                    },
                    {
                      label: "Scope/MVP",
                      value: productScopeReviewPreview
                        ? locale === "vi"
                          ? "Đã có preview"
                          : "Preview ready"
                        : locale === "vi"
                          ? "Chưa tạo"
                          : "Not generated"
                    },
                    {
                      label: "Handoff",
                      value: aiCodingPack
                        ? locale === "vi"
                          ? "Đã có preview"
                          : "Preview ready"
                        : locale === "vi"
                          ? "Chưa tạo"
                          : "Not generated"
                    }
                  ].map((status) => (
                    <div
                      className="rounded border border-slate-200 bg-white px-3 py-2"
                      key={status.label}
                    >
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        {status.label}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {status.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="action-card">
                <p className="text-sm font-semibold text-blue-950">
                  {locale === "vi" ? "Tạo" : "Generate"}
                </p>
                <p className="mt-1 text-xs leading-5 text-blue-900/80">
                  {locale === "vi"
                    ? "Tạo bản nháp Product Delivery để xem trước trước khi tải hoặc bàn giao."
                    : "Create a preview-first Product Delivery draft before download or handoff."}
                </p>
                <button
                  className="btn btn-primary mt-3 w-full justify-center"
                  onClick={previewProductDeliveryDraft}
                  type="button"
                >
                  {text.generateProductDeliveryDraft}
                </button>
                <details className="mt-3 rounded border border-blue-100 bg-white/80">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-blue-950">
                    {locale === "vi" ? "Tác vụ tạo khác" : "More generate actions"}
                  </summary>
                  <div className="button-list border-t border-blue-100 p-3">
                    <button
                      className="btn btn-ai text-sm"
                      disabled={isGeneratingBRD}
                      onClick={() => void generateBRDPreview("ptr-to-brd")}
                      type="button"
                    >
                      {isGeneratingBRD
                        ? locale === "vi"
                          ? "Đang tạo BRD..."
                          : "Generating BRD..."
                        : locale === "vi"
                          ? "Tạo BRD từ PTR"
                          : "Generate BRD from PTR"}
                    </button>
                    <button
                      className="btn btn-ai text-sm"
                      disabled={isGeneratingBRD}
                      onClick={() => void generateBRDPreview("notes-to-brd")}
                      type="button"
                    >
                      {locale === "vi" ? "Tạo BRD từ ghi chú" : "Generate BRD from Notes"}
                    </button>
                    <button
                      className="btn btn-ai text-sm"
                      disabled={isGeneratingSRS}
                      onClick={() => void generateSRSPreview("brd-to-srs")}
                      type="button"
                    >
                      {isGeneratingSRS
                        ? locale === "vi"
                          ? "Đang tạo SRS..."
                          : "Generating SRS..."
                        : locale === "vi"
                          ? "Tạo SRS"
                          : "Generate SRS"}
                    </button>
                    <button
                      className="btn btn-ai text-sm"
                      disabled={isGeneratingSRS}
                      onClick={() => void generateSRSPreview("notes-to-srs")}
                      type="button"
                    >
                      {locale === "vi" ? "Tạo SRS từ ghi chú" : "Generate SRS from Notes"}
                    </button>
                    <button
                      className="btn btn-ai text-sm"
                      disabled={isGeneratingUserStories}
                      onClick={() => void generateUserStoryPreview("srs-to-user-stories")}
                      type="button"
                    >
                      {isGeneratingUserStories
                        ? locale === "vi"
                          ? "Đang tạo User Stories..."
                          : "Generating User Stories..."
                        : locale === "vi"
                          ? "Tạo User Stories"
                          : "Generate User Stories"}
                    </button>
                    <button
                      className="btn btn-ai text-sm"
                      disabled={isGeneratingUserStories}
                      onClick={() => void generateUserStoryPreview("brd-to-user-stories")}
                      type="button"
                    >
                      {locale === "vi" ? "Tạo User Stories từ BRD" : "Generate User Stories from BRD"}
                    </button>
                    <button
                      className="btn btn-ai text-sm"
                      disabled={isGeneratingAcceptanceCriteria}
                      onClick={() => void generateAcceptanceCriteriaPreview()}
                      type="button"
                    >
                      {isGeneratingAcceptanceCriteria
                        ? locale === "vi"
                          ? "Đang tạo Acceptance Criteria..."
                          : "Generating Acceptance Criteria..."
                        : locale === "vi"
                          ? "Tạo Acceptance Criteria"
                          : "Generate Acceptance Criteria"}
                    </button>
                  </div>
                </details>
              </div>

              <div className="action-card action-card-ai">
                <p className="text-sm font-semibold text-purple-950">
                  {locale === "vi" ? "Rà soát" : "Review"}
                </p>
                <p className="mt-1 text-xs leading-5 text-purple-900/80">
                  {locale === "vi"
                    ? "Chạy QA, rà soát phạm vi và cắt MVP dưới dạng preview; không tự áp dụng."
                    : "Run QA, scope review, and MVP slicing as previews; nothing is auto-applied."}
                </p>
                <div className="button-list mt-3">
                  <button
                    className="btn btn-ai text-sm"
                    disabled={isGeneratingRequirementQA}
                    onClick={() => void generateRequirementQAPreview()}
                    type="button"
                  >
                    {isGeneratingRequirementQA
                      ? locale === "vi"
                        ? "Đang chạy Requirement QA..."
                        : "Running Requirement QA..."
                      : locale === "vi"
                        ? "Chạy Requirement QA"
                        : "Run Requirement QA"}
                  </button>
                  <button
                    className="btn btn-ai text-sm"
                    disabled={isGeneratingProductScopeReview}
                    onClick={() => void generateProductScopeReviewPreview("product-scope-review")}
                    type="button"
                  >
                    {isGeneratingProductScopeReview
                      ? locale === "vi"
                        ? "Đang rà soát phạm vi..."
                        : "Reviewing Scope..."
                      : locale === "vi"
                        ? "Rà soát phạm vi sản phẩm"
                        : "Review Product Scope"}
                  </button>
                  <button
                    className="btn btn-ai text-sm"
                    disabled={isGeneratingProductScopeReview}
                    onClick={() => void generateProductScopeReviewPreview("mvp-slicing")}
                    type="button"
                  >
                    {locale === "vi" ? "Tạo MVP Slicing" : "Generate MVP Slicing"}
                  </button>
                </div>
              </div>

              <div className="action-card">
                <p className="text-sm font-semibold text-emerald-950">
                  {locale === "vi" ? "Xuất" : "Export"}
                </p>
                <p className="mt-1 text-xs leading-5 text-emerald-900/80">
                  {locale === "vi"
                    ? "Tải artifact đã có preview dưới dạng JSON hoặc Markdown."
                    : "Download previewed artifacts as JSON or Markdown."}
                </p>
                <div className="button-list mt-3">
                  <button
                    className="btn btn-secondary"
                    disabled={!brdPreview}
                    onClick={downloadBRDJson}
                    type="button"
                  >
                    {locale === "vi" ? "Tải BRD JSON" : "Download BRD JSON"}
                  </button>
                  <button
                    className="btn btn-secondary"
                    disabled={!srsPreview}
                    onClick={downloadSRSJson}
                    type="button"
                  >
                    {locale === "vi" ? "Tải SRS JSON" : "Download SRS JSON"}
                  </button>
                  <button
                    className="btn btn-secondary"
                    disabled={!userStoryPreview}
                    onClick={downloadUserStoriesJson}
                    type="button"
                  >
                    {locale === "vi" ? "Tải Stories JSON" : "Download Stories JSON"}
                  </button>
                  <button
                    className="btn btn-secondary"
                    disabled={!acceptanceCriteriaPreview}
                    onClick={downloadAcceptanceCriteriaJson}
                    type="button"
                  >
                    {locale === "vi" ? "Tải AC JSON" : "Download AC JSON"}
                  </button>
                  <button
                    className="btn btn-secondary"
                    disabled={!productScopeReviewPreview}
                    onClick={downloadProductScopeReviewJson}
                    type="button"
                  >
                    {locale === "vi" ? "Tải Scope JSON" : "Download Scope JSON"}
                  </button>
                  <button
                    className="btn btn-secondary"
                    disabled={!productDeliveryDraft}
                    onClick={downloadProductDeliveryMarkdown}
                    type="button"
                  >
                    {text.downloadProductDeliveryMarkdown}
                  </button>
                </div>
              </div>

              <div className="action-card action-card-ai">
                <p className="text-sm font-semibold text-purple-950">
                  {text.aiDevelopmentHandoffPack}
                </p>
                <p className="mt-1 text-xs leading-5 text-purple-900/80">
                  {locale === "vi"
                    ? "Xem trước gói bàn giao, kiểm tra file bao gồm, rồi tải ZIP khi sẵn sàng."
                    : "Preview the handoff pack, check included files, then download ZIP when ready."}
                </p>
                <div className="button-list mt-3">
                  <button
                    className="btn btn-ai text-sm"
                    onClick={() => void previewProductDeliveryAICodingPack()}
                    type="button"
                  >
                    {locale === "vi" ? "Xem trước Handoff Pack" : "Preview Handoff Pack"}
                  </button>
                  <button
                    className="btn btn-secondary"
                    disabled={isDownloadingAICodingPack}
                    onClick={downloadAICodingPackZip}
                    type="button"
                  >
                    {isDownloadingAICodingPack
                      ? text.generatingHandoffPack
                      : locale === "vi"
                        ? "Tải AI Handoff Pack ZIP"
                        : "Download AI Handoff Pack ZIP"}
                  </button>
                </div>
                <details className="mt-3 rounded border border-purple-100 bg-white/80">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-purple-950">
                    {text.includedFiles}
                  </summary>
                  <ul className="border-t border-purple-100 p-3 text-xs leading-5 text-purple-900/80">
                    <li>AGENTS.md</li>
                    <li>CLAUDE.md</li>
                    <li>cursor-rules.md</li>
                    <li>spec.json</li>
                    <li>acceptance-criteria.md</li>
                    <li>implementation-plan.md</li>
                    <li>test-plan.md</li>
                  </ul>
                </details>
              </div>
            </div>
            <details className="advanced-panel mt-4">
              <summary>
                {locale === "vi" ? "Nâng cao / So sánh nhà cung cấp" : "Advanced / Provider Compare"}
              </summary>
              <div className="border-t border-slate-200 p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {locale === "vi" ? "So sánh nhà cung cấp" : "Provider Compare"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    {locale === "vi"
                      ? "Tùy chọn và mặc định tắt. So sánh các nhà cung cấp đã chọn cho BRD, User Stories hoặc AI Coding Pack, sau đó chọn một đầu ra để xem tiếp."
                      : "Optional and off by default. Compare selected providers for BRD, User Stories, or AI Coding Pack, then choose one output to preview further."}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    checked={compareModeEnabled}
                    onChange={(event) => setCompareModeEnabled(event.target.checked)}
                    type="checkbox"
                  />
                  {locale === "vi" ? "Bật chế độ so sánh" : "Enable compare mode"}
                </label>
              </div>
              {compareModeEnabled ? (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
                    {compareProviders.map((provider) => (
                      <label className="flex items-center gap-2" key={provider.id}>
                        <input
                          checked={compareProviderIds.includes(provider.id)}
                          onChange={() => toggleCompareProvider(provider.id)}
                          type="checkbox"
                        />
                        {provider.label[locale]}
                      </label>
                    ))}
                    {compareProviderIds.length > 1 ? (
                      <span className="text-xs text-amber-700">
                        {locale === "vi"
                          ? "Nhiều nhà cung cấp có thể làm tăng chi phí AI."
                          : "Multiple providers may increase AI cost."}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isRunningCompare}
                      onClick={() =>
                        void runExportProviderCompare({
                          kind: "brd",
                          skillId: "ptr-to-brd"
                        })
                      }
                      type="button"
                    >
                      {locale === "vi" ? "So sánh BRD từ PTR" : "Compare BRD from PTR"}
                    </button>
                    <button
                      className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isRunningCompare}
                      onClick={() =>
                        void runExportProviderCompare({
                          kind: "brd",
                          skillId: "notes-to-brd"
                        })
                      }
                      type="button"
                    >
                      {locale === "vi" ? "So sánh BRD từ ghi chú" : "Compare BRD from Notes"}
                    </button>
                    <button
                      className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isRunningCompare}
                      onClick={() =>
                        void runExportProviderCompare({
                          kind: "userStories",
                          skillId: "srs-to-user-stories"
                        })
                      }
                      type="button"
                    >
                      {locale === "vi" ? "So sánh Stories từ SRS" : "Compare Stories from SRS"}
                    </button>
                    <button
                      className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isRunningCompare}
                      onClick={() =>
                        void runExportProviderCompare({
                          kind: "userStories",
                          skillId: "brd-to-user-stories"
                        })
                      }
                      type="button"
                    >
                      {locale === "vi" ? "So sánh Stories từ BRD" : "Compare Stories from BRD"}
                    </button>
                    <button
                      className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isRunningCompare}
                      onClick={() =>
                        void runExportProviderCompare({
                          kind: "aiCodingPack",
                          skillId: "user-stories-to-ai-coding-pack"
                        })
                      }
                      type="button"
                    >
                      {isRunningCompare
                        ? locale === "vi"
                          ? "Đang so sánh..."
                          : "Comparing..."
                        : locale === "vi"
                        ? "So sánh AI Coding Pack"
                        : "Compare AI Coding Pack"}
                    </button>
                  </div>
                </div>
              ) : null}
            {compareResults.length > 0 ? (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
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
                          {result.skillId} | Model: {result.model || "n/a"}
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
                    <p className="mt-2 text-sm text-slate-700">
                      {result.summary}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {locale === "vi" ? "Độ tin cậy" : "Confidence"}: {result.confidence} |{" "}
                      {locale === "vi" ? "Cảnh báo" : "Warnings"}:{" "}
                      {result.warnings.length}
                    </p>
                    {result.error ? (
                      <p className="mt-2 text-xs text-rose-700">
                        {result.error}
                      </p>
                    ) : null}
                    <button
                      className="btn btn-ai mt-3 text-xs"
                      disabled={!result.result || result.validationStatus !== "passed"}
                      onClick={() => useExportCompareResult(result)}
                      type="button"
                    >
                      {locale === "vi" ? "Dùng đầu ra này" : "Use this output"}
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
              </div>
            </details>
          </div>

          <div className="hidden">
            <p className="text-sm font-semibold text-slate-950">
              {locale === "vi" ? "Bản nháp bao gồm" : "Draft includes"}
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
              <li>{locale === "vi" ? "Phạm vi sản phẩm" : "Product scope"}</li>
              <li>{locale === "vi" ? "Dàn ý BRD" : "BRD outline"}</li>
              <li>{locale === "vi" ? "Dàn ý SRS" : "SRS outline"}</li>
              <li>{locale === "vi" ? "User stories" : "User stories"}</li>
              <li>{locale === "vi" ? "Acceptance criteria" : "Acceptance criteria"}</li>
              <li>{locale === "vi" ? "Rà soát phạm vi sản phẩm và MVP slicing" : "Product scope review and MVP slicing"}</li>
              <li>{locale === "vi" ? "Requirement QA và độ phủ trace" : "Requirement QA and trace coverage"}</li>
              <li>{locale === "vi" ? "Giả định và câu hỏi mở" : "Assumptions and open questions"}</li>
            </ul>
            <details className="advanced-panel mt-3">
              <summary>{technicalDetailsLabel}</summary>
              <p className="border-t border-slate-200 p-3 text-xs leading-5 text-slate-500">
              {locale === "vi"
                ? "MVP1 chưa tạo Artifact Graph. User stories và acceptance criteria được tạo qua route kỹ năng AI phía máy chủ và chỉ ở trạng thái xem trước/xuất."
                : "No Artifact Graph is created in MVP1. User stories and acceptance criteria are generated through server-side AI skill routes and remain preview/export only."}
              </p>
            </details>
          </div>
        </div>

        {productDeliveryDraft ? (
          <div className="mt-4 rounded border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-950">
                {locale === "vi" ? "Xem trước: bản nháp hồ sơ sản phẩm" : "Preview: Product Delivery draft"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {locale === "vi"
                  ? `Đã tạo lúc ${productDeliveryDraft.timestamp}. Step ID được giữ trong stories và acceptance criteria.`
                  : `Generated at ${productDeliveryDraft.timestamp}. Step IDs are preserved in stories and acceptance criteria.`}
              </p>
            </div>
            <div className="grid gap-2 border-b border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-3">
              <div>
                <p className="font-medium text-slate-950">
                  {locale === "vi" ? "Bước nguồn" : "Source steps"}
                </p>
                <p className="mt-1 text-slate-600">
                  {productDeliveryDraft.draft.sourceStepIds.length}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">
                  {locale === "vi" ? "Mục BRD" : "BRD sections"}
                </p>
                <p className="mt-1 text-slate-600">
                  {productDeliveryDraft.draft.brd.sections.length}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">
                  {locale === "vi" ? "Yêu cầu SRS" : "SRS requirements"}
                </p>
                <p className="mt-1 text-slate-600">
                  {
                    productDeliveryDraft.draft.srs.functionalRequirements
                      .length
                  }
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">
                  {locale === "vi" ? "User stories" : "User stories"}
                </p>
                <p className="mt-1 text-slate-600">
                  {productDeliveryDraft.draft.userStorySet.stories.length}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">
                  {locale === "vi" ? "Acceptance criteria" : "Acceptance criteria"}
                </p>
                <p className="mt-1 text-slate-600">
                  {
                    productDeliveryDraft.draft.acceptanceCriteria.criteria
                      .length
                  }
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">
                  {locale === "vi" ? "Giả định / Câu hỏi" : "Assumptions / Questions"}
                </p>
                <p className="mt-1 text-slate-600">
                  {productDeliveryDraft.draft.assumptions.length} /{" "}
                  {productDeliveryDraft.draft.openQuestions.length}
                </p>
              </div>
            </div>
            <details className="advanced-panel">
              <summary>{rawPreviewLabel}</summary>
              <pre className="raw-preview">
                {productDeliveryDraft.draft.combinedMarkdown}
              </pre>
            </details>
          </div>
        ) : null}

        {!brdPreview ? (
          <div className="empty-state mt-4" id="product-delivery-brd">
            <p className="text-sm font-semibold text-slate-950">BRD</p>
            <p className="mt-1 text-sm text-slate-600">
              {locale === "vi"
                ? "Chưa có bản xem trước BRD. Dùng nhóm Tạo ở phần Tổng quan để tạo BRD từ PTR hoặc ghi chú."
                : "No BRD preview yet. Use the Generate action card in Overview to create BRD from PTR or notes."}
            </p>
          </div>
        ) : null}

        {brdPreview ? (
          <div className="mt-4 rounded border border-slate-200 bg-white" id="product-delivery-brd">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-950">
                {locale === "vi" ? "Xem trước: bản nháp BRD có cấu trúc" : "Preview: Structured BRD draft"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {locale === "vi"
                  ? `Đã tạo lúc ${brdPreview.timestamp} qua ${brdPreview.sourceSkillId}. Chỉ xem trước; chưa lưu vào Artifact Graph.`
                  : `Generated at ${brdPreview.timestamp} via ${brdPreview.sourceSkillId}. Preview only; not saved to an Artifact Graph.`}
              </p>
            </div>
            <div className="grid gap-2 border-b border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-4">
              <div>
                <p className="font-medium text-slate-950">
                  {locale === "vi" ? "Yêu cầu" : "Requirements"}
                </p>
                <p className="mt-1 text-slate-600">
                  {brdPreview.brd.businessRequirements.length}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">Stakeholders</p>
                <p className="mt-1 text-slate-600">
                  {brdPreview.brd.stakeholders.length}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">
                  {locale === "vi" ? "Tham chiếu process" : "Process refs"}
                </p>
                <p className="mt-1 text-slate-600">
                  {brdPreview.brd.processReferences.length}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">
                  {locale === "vi" ? "Vấn đề chất lượng" : "Quality issues"}
                </p>
                <p className="mt-1 text-slate-600">
                  {brdPreview.brd.qualityIssues.length}
                </p>
              </div>
            </div>
            <details className="advanced-panel">
              <summary>{rawPreviewLabel}</summary>
              <pre className="raw-preview">
                {JSON.stringify(brdPreview.brd, null, 2)}
              </pre>
            </details>
          </div>
        ) : null}

        {!srsPreview ? (
          <div className="empty-state mt-4" id="product-delivery-srs">
            <p className="text-sm font-semibold text-slate-950">SRS</p>
            <p className="mt-1 text-sm text-slate-600">
              {locale === "vi"
                ? "Chưa có preview SRS. Tạo BRD hoặc chuẩn bị PTR/ghi chú rồi chạy Generate SRS."
                : "No SRS preview yet. Generate BRD or prepare PTR/notes, then run Generate SRS."}
            </p>
          </div>
        ) : null}

        {srsPreview ? (
          <div className="mt-4 rounded border border-slate-200 bg-white" id="product-delivery-srs">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-950">
                {locale === "vi" ? "Xem trước: bản nháp SRS có cấu trúc" : "Preview: Structured SRS draft"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {locale === "vi"
                  ? `Đã tạo lúc ${srsPreview.timestamp} qua ${srsPreview.sourceSkillId}. Chỉ xem trước; chưa lưu vào Artifact Graph.`
                  : `Generated at ${srsPreview.timestamp} via ${srsPreview.sourceSkillId}. Preview only; not saved to an Artifact Graph.`}
              </p>
            </div>
            <div className="grid gap-2 border-b border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-4">
              <div>
                <p className="font-medium text-slate-950">
                  {locale === "vi" ? "Yêu cầu chức năng" : "Functional reqs"}
                </p>
                <p className="mt-1 text-slate-600">
                  {srsPreview.srs.functionalRequirements.length}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">NFRs</p>
                <p className="mt-1 text-slate-600">
                  {srsPreview.srs.nonFunctionalRequirements.length}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">
                  {locale === "vi" ? "Hệ thống" : "Systems"}
                </p>
                <p className="mt-1 text-slate-600">
                  {srsPreview.srs.systemsComponents.length}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">
                  {locale === "vi" ? "Vấn đề chất lượng" : "Quality issues"}
                </p>
                <p className="mt-1 text-slate-600">
                  {srsPreview.srs.qualityIssues.length}
                </p>
              </div>
            </div>
            <details className="advanced-panel">
              <summary>{rawPreviewLabel}</summary>
              <pre className="raw-preview">
                {JSON.stringify(srsPreview.srs, null, 2)}
              </pre>
            </details>
          </div>
        ) : null}

        {!userStoryPreview ? (
          <div className="empty-state mt-4" id="product-delivery-stories">
            <p className="text-sm font-semibold text-slate-950">User Stories</p>
            <p className="mt-1 text-sm text-slate-600">
              {locale === "vi"
                ? "Chưa có preview User Stories. Tạo từ SRS hoặc BRD khi đã có đủ ngữ cảnh."
                : "No User Stories preview yet. Generate them from SRS or BRD when enough context is ready."}
            </p>
          </div>
        ) : null}

        {userStoryPreview ? (
          <div className="mt-4 rounded border border-slate-200 bg-white" id="product-delivery-stories">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-950">
                {locale === "vi" ? "Xem trước: bản nháp user stories có cấu trúc" : "Preview: Structured user stories draft"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {locale === "vi"
                  ? `Đã tạo lúc ${userStoryPreview.timestamp} qua ${userStoryPreview.sourceSkillId}. Chỉ xem trước; chưa lưu vào Artifact Graph.`
                  : `Generated at ${userStoryPreview.timestamp} via ${userStoryPreview.sourceSkillId}. Preview only; not saved to an Artifact Graph.`}
              </p>
            </div>
            <div className="grid gap-2 border-b border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-4">
              <div>
                <p className="font-medium text-slate-950">Epics</p>
                <p className="mt-1 text-slate-600">
                  {userStoryPreview.userStorySet.epics.length}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">Stories</p>
                <p className="mt-1 text-slate-600">
                  {userStoryPreview.userStorySet.stories.length}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">
                  {locale === "vi" ? "Bước nguồn" : "Source steps"}
                </p>
                <p className="mt-1 text-slate-600">
                  {
                    new Set(
                      userStoryPreview.userStorySet.stories.flatMap(
                        (story) => story.sourceStepIds ?? []
                      )
                    ).size
                  }
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">
                  {locale === "vi" ? "Vấn đề chất lượng" : "Quality issues"}
                </p>
                <p className="mt-1 text-slate-600">
                  {userStoryPreview.userStorySet.qualityIssues.length}
                </p>
              </div>
            </div>
            <details className="advanced-panel">
              <summary>{rawPreviewLabel}</summary>
              <pre className="raw-preview">
                {JSON.stringify(userStoryPreview.userStorySet, null, 2)}
              </pre>
            </details>
          </div>
        ) : null}

        {!acceptanceCriteriaPreview ? (
          <div className="empty-state mt-4" id="product-delivery-acceptance">
            <p className="text-sm font-semibold text-slate-950">Acceptance Criteria</p>
            <p className="mt-1 text-sm text-slate-600">
              {locale === "vi"
                ? "Chưa có preview Acceptance Criteria. Tạo User Stories trước, sau đó tạo tiêu chí kiểm thử."
                : "No Acceptance Criteria preview yet. Generate User Stories first, then create testable criteria."}
            </p>
          </div>
        ) : null}

        {acceptanceCriteriaPreview ? (
          <div className="mt-4 rounded border border-slate-200 bg-white" id="product-delivery-acceptance">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-950">
                {locale === "vi" ? "Xem trước: bản nháp acceptance criteria có cấu trúc" : "Preview: Structured acceptance criteria draft"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {locale === "vi"
                  ? `Đã tạo lúc ${acceptanceCriteriaPreview.timestamp} qua ${acceptanceCriteriaPreview.sourceSkillId}. Chỉ xem trước; chưa lưu vào Artifact Graph.`
                  : `Generated at ${acceptanceCriteriaPreview.timestamp} via ${acceptanceCriteriaPreview.sourceSkillId}. Preview only; not saved to an Artifact Graph.`}
              </p>
            </div>
            <div className="grid gap-2 border-b border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-4">
              <div>
                <p className="font-medium text-slate-950">Criteria</p>
                <p className="mt-1 text-slate-600">
                  {
                    acceptanceCriteriaPreview.acceptanceCriteria.criteria
                      .length
                  }
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">
                  {locale === "vi" ? "Story nguồn" : "Source stories"}
                </p>
                <p className="mt-1 text-slate-600">
                  {
                    new Set(
                      acceptanceCriteriaPreview.acceptanceCriteria.criteria.map(
                        (criterion) => criterion.storyId
                      )
                    ).size
                  }
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">
                  {locale === "vi" ? "Bước nguồn" : "Source steps"}
                </p>
                <p className="mt-1 text-slate-600">
                  {
                    new Set(
                      acceptanceCriteriaPreview.acceptanceCriteria.criteria.flatMap(
                        (criterion) => criterion.sourceStepIds ?? []
                      )
                    ).size
                  }
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">
                  {locale === "vi" ? "Vấn đề chất lượng" : "Quality issues"}
                </p>
                <p className="mt-1 text-slate-600">
                  {
                    acceptanceCriteriaPreview.acceptanceCriteria.qualityIssues
                      .length
                  }
                </p>
              </div>
            </div>
            <details className="advanced-panel">
              <summary>{rawPreviewLabel}</summary>
              <pre className="raw-preview">
                {JSON.stringify(
                  acceptanceCriteriaPreview.acceptanceCriteria,
                  null,
                  2
                )}
              </pre>
            </details>
          </div>
        ) : null}

        {!productScopeReviewPreview ? (
          <div className="empty-state mt-4" id="product-delivery-scope">
            <p className="text-sm font-semibold text-slate-950">
              {locale === "vi" ? "Rà soát phạm vi / Cắt MVP" : "Scope Review / MVP Slicing"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {locale === "vi"
                ? "Chưa có bản xem trước phạm vi/MVP. Chạy Rà soát phạm vi sản phẩm hoặc Tạo MVP Slicing trong nhóm Rà soát."
                : "No Scope/MVP preview yet. Run Review Product Scope or Generate MVP Slicing from the Review/Generate cards."}
            </p>
          </div>
        ) : null}

        {productScopeReviewPreview ? (
          <div className="mt-4 rounded border border-slate-200 bg-white" id="product-delivery-scope">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-950">
                {locale === "vi" ? "Xem trước: rà soát phạm vi sản phẩm và cắt MVP" : "Preview: Product scope review and MVP slicing"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {locale === "vi"
                  ? `Đã tạo lúc ${productScopeReviewPreview.timestamp} qua ${productScopeReviewPreview.sourceSkillId}. Chỉ xem trước; chưa lưu vào Artifact Graph.`
                  : `Generated at ${productScopeReviewPreview.timestamp} via ${productScopeReviewPreview.sourceSkillId}. Preview only; not saved to an Artifact Graph.`}
              </p>
            </div>
            <div className="grid gap-2 border-b border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-4">
              <div>
                <p className="font-medium text-slate-950">
                  {locale === "vi" ? "Trong scope" : "In scope"}
                </p>
                <p className="mt-1 text-slate-600">
                  {productScopeReviewPreview.scopeReview.inScope.length}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">
                  {locale === "vi" ? "Ngoài scope" : "Out of scope"}
                </p>
                <p className="mt-1 text-slate-600">
                  {productScopeReviewPreview.scopeReview.outOfScope.length}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">
                  {locale === "vi" ? "Mục MVP" : "MVP items"}
                </p>
                <p className="mt-1 text-slate-600">
                  {
                    productScopeReviewPreview.scopeReview.mvpSlice.items
                      .length
                  }
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">
                  {locale === "vi" ? "Rủi ro" : "Risks"}
                </p>
                <p className="mt-1 text-slate-600">
                  {productScopeReviewPreview.scopeReview.risks.length}
                </p>
              </div>
            </div>
            <details className="advanced-panel">
              <summary>{rawPreviewLabel}</summary>
              <pre className="raw-preview">
                {JSON.stringify(productScopeReviewPreview.scopeReview, null, 2)}
              </pre>
            </details>
          </div>
        ) : null}

        {requirementQAPreview ? (
          <div className="mt-4 rounded border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-950">
                {locale === "vi" ? "Xem trước: QA yêu cầu và độ phủ truy vết" : "Preview: Requirement QA and trace coverage"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {locale === "vi"
                  ? `Đã tạo lúc ${requirementQAPreview.timestamp} qua ${requirementQAPreview.sourceSkillId}. Phát hiện chỉ là đề xuất nháp; chưa áp dụng hoặc lưu.`
                  : `Generated at ${requirementQAPreview.timestamp} via ${requirementQAPreview.sourceSkillId}. Findings are draft recommendations only; nothing is applied or saved.`}
              </p>
            </div>
            <div className="grid gap-2 border-b border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-4">
              <div>
                <p className="font-medium text-slate-950">Findings</p>
                <p className="mt-1 text-slate-600">
                  {requirementQAPreview.requirementQA.findings.length}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">
                  {locale === "vi" ? "Bản vá draft" : "Draft patches"}
                </p>
                <p className="mt-1 text-slate-600">
                  {requirementQAPreview.requirementQA.recommendations.length}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">
                  {locale === "vi" ? "Gap BRD" : "BRD gaps"}
                </p>
                <p className="mt-1 text-slate-600">
                  {
                    requirementQAPreview.requirementQA.coverage
                      .uncoveredBrdRequirementIds.length
                  }
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">
                  {locale === "vi" ? "Gap SRS/story" : "SRS/story gaps"}
                </p>
                <p className="mt-1 text-slate-600">
                  {
                    requirementQAPreview.requirementQA.coverage
                      .uncoveredSrsRequirementIds.length
                  }{" "}
                  /{" "}
                  {
                    requirementQAPreview.requirementQA.coverage
                      .storiesWithoutAcceptanceCriteriaIds.length
                  }
                </p>
              </div>
            </div>
            <details className="advanced-panel">
              <summary>{rawPreviewLabel}</summary>
              <pre className="raw-preview">
                {JSON.stringify(requirementQAPreview.requirementQA, null, 2)}
              </pre>
            </details>
          </div>
        ) : null}
      </div>

      <div className="border-t border-slate-200 p-4" id="product-delivery-handoff">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)]">
          <div>
            <p className="text-sm font-medium uppercase text-slate-500">
              {text.aiDevelopmentHandoffPack}
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">
              {locale === "vi"
                ? "Đóng gói yêu cầu đã review cho đội phát triển"
                : "Package reviewed requirements for development"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {text.aiDevelopmentHandoffDescription}
            </p>
            <details className="mt-4 rounded border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-indigo-950">
              <summary className="cursor-pointer font-semibold">
                {text.handoffHowItWorks}
              </summary>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {[
                  { title: text.handoffStep1Title, body: text.handoffStep1Body },
                  { title: text.handoffStep2Title, body: text.handoffStep2Body },
                  { title: text.handoffStep3Title, body: text.handoffStep3Body }
                ].map((step, index) => (
                  <div className="rounded border border-indigo-100 bg-white/80 p-3" key={step.title}>
                    <p className="text-xs font-bold uppercase text-indigo-700">
                      {index + 1}. {step.title}
                    </p>
                    <p className="mt-1 leading-5 text-indigo-950/80">{step.body}</p>
                  </div>
                ))}
              </div>
            </details>
            <label className="mt-4 block">
              <span className="text-sm font-medium text-slate-700">
                {text.optionalProjectContext}
              </span>
              <textarea
                className="mt-2 min-h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800"
                onChange={(event) => setProjectContext(event.target.value)}
                placeholder={
                  locale === "vi"
                    ? "Ví dụ: repo đích, stack frontend/backend, ràng buộc coding, quy ước team..."
                    : "Example: Target repo, frontend/backend stack, coding constraints, team conventions..."
                }
                value={projectContext}
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="btn btn-secondary"
                onClick={previewAICodingPack}
                type="button"
              >
                {text.previewPtrHandoffPack}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => void previewProductDeliveryAICodingPack()}
                type="button"
              >
                {text.previewProductDeliveryHandoffPack}
              </button>
              <button
                className="btn btn-primary"
                disabled={isDownloadingAICodingPack}
                onClick={downloadAICodingPackZip}
                type="button"
              >
                {isDownloadingAICodingPack
                  ? text.generatingHandoffPack
                  : text.downloadHandoffPack}
              </button>
            </div>
          </div>

          <div className="compact-card bg-slate-50">
            <p className="text-sm font-semibold text-slate-950">
              {text.includedFiles}
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
              <li>AGENTS.md</li>
              <li>CLAUDE.md</li>
              <li>cursor-rules.md</li>
              <li>spec.json</li>
              <li>acceptance-criteria.md</li>
              <li>implementation-plan.md</li>
              <li>test-plan.md</li>
            </ul>
            <details className="advanced-panel mt-3">
              <summary>{technicalDetailsLabel}</summary>
              <p className="border-t border-slate-200 p-3 text-xs leading-5 text-slate-500">
              {locale === "vi"
                ? "Chi tiết nâng cao cho người dùng kỹ thuật: AGENTS.md, CLAUDE.md, cursor rules và spec.json được giữ trong gói. Hồ sơ sản phẩm dùng `user-stories-to-ai-coding-pack` qua `/api/ai/run-skill`, có fallback cục bộ/mô phỏng và kiểm tra schema."
                : "Advanced details for technical users: AGENTS.md, CLAUDE.md, cursor rules, and spec.json are kept in the package. Product Delivery generation uses `user-stories-to-ai-coding-pack` through `/api/ai/run-skill`, with mock/local fallback and schema validation."}
              </p>
            </details>
          </div>
        </div>

        {aiCodingPack ? (
          <div className="mt-4 rounded border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-950">
                {locale === "vi" ? "Xem trước: spec.json" : "Preview: spec.json"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {locale === "vi"
                  ? `Đã tạo lúc ${aiCodingPack.timestamp}${
                      aiCodingPack.sourceSkillId ? ` qua ${aiCodingPack.sourceSkillId}` : ""
                    }. Step, story và requirement ref được giữ khi có.`
                  : `Generated at ${aiCodingPack.timestamp}${
                      aiCodingPack.sourceSkillId ? ` via ${aiCodingPack.sourceSkillId}` : ""
                    }. Step, story, and requirement refs are preserved where available.`}
              </p>
            </div>
            {aiCodingPack.qualityIssues?.length ? (
              <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
                {aiCodingPack.qualityIssues.map((issue) => (
                  <p key={issue}>{issue}</p>
                ))}
              </div>
            ) : null}
            <details className="advanced-panel">
              <summary>{rawPreviewLabel}</summary>
              <pre className="raw-preview">
                {aiCodingPack.files.specJson}
              </pre>
            </details>
          </div>
        ) : null}
      </div>
      </div>
    </section>
  );
}

