"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
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
  sourceSkillId: "ptr-to-brd" | "notes-to-brd";
  brd: BRD;
};

type SRSPreview = {
  timestamp: string;
  sourceSkillId: "brd-to-srs" | "notes-to-srs";
  srs: SRS;
};

type UserStoryPreview = {
  timestamp: string;
  sourceSkillId: "srs-to-user-stories" | "brd-to-user-stories";
  userStorySet: UserStorySet;
};

type AcceptanceCriteriaPreview = {
  timestamp: string;
  sourceSkillId: "user-stories-to-acceptance-criteria";
  acceptanceCriteria: AcceptanceCriteriaSet;
};

type ProductScopeReviewPreview = {
  timestamp: string;
  sourceSkillId: "product-scope-review" | "mvp-slicing";
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

const compareProviders: Array<{ id: CompareProviderId; label: string }> = [
  { id: "product-ai", label: "Product AI" },
  { id: "openai", label: "OpenAI" },
  { id: "claude", label: "Claude" },
  { id: "mock", label: "Local/Mock" }
];

const exportCenterText = {
  vi: {
    title: "Trung tâm xuất dữ liệu",
    description:
      "Tạo và đóng gói D01 BPMN, D02 Service Blueprint, JSON dữ liệu, báo cáo QA và audit metadata từ Process Task Register.",
    generateAllArtifacts: "Tạo tất cả artifact",
    generatingZip: "Đang tạo ZIP...",
    downloadZip: "Tải ZIP",
    productDelivery: "Hồ sơ sản phẩm",
    productDeliveryDescription:
      "Tạo bản nháp Product Delivery từ Process Task Register và context đã review. Tất cả output đều preview trước, chưa lưu vào Artifact Graph.",
    optionalProjectContext: "Context dự án tùy chọn",
    generateProductDeliveryDraft: "Tạo bản nháp Product Delivery",
    downloadProductDeliveryMarkdown: "Tải Product Delivery Markdown",
    aiDevelopmentHandoffPack: "Gói bàn giao phát triển bằng AI",
    aiDevelopmentHandoffDescription:
      "Gửi gói này cho đội phát triển hoặc dùng với Codex, Claude Code, Cursor. Gói biến PTR và Product Delivery đã review thành handoff có preview trước khi tải ZIP.",
    previewPtrHandoffPack: "Preview gói handoff từ PTR",
    previewProductDeliveryHandoffPack: "Preview gói handoff từ Product Delivery",
    downloadHandoffPack: "Tải ZIP handoff",
    generatingHandoffPack: "Đang tạo gói handoff...",
    includedFiles: "File bao gồm",
    localAuditLog: "Nhật ký audit local",
    aiRunHistory: "Lịch sử chạy AI"
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
    optionalProjectContext: "Optional project context",
    generateProductDeliveryDraft: "Generate Product Delivery Draft",
    downloadProductDeliveryMarkdown: "Download Product Delivery Markdown",
    aiDevelopmentHandoffPack: "AI Development Handoff Pack",
    aiDevelopmentHandoffDescription:
      "Send this package to your development team or use it with Codex, Claude Code, Cursor. It turns the Process Task Register and reviewed Product Delivery artifacts into a previewed handoff before ZIP download.",
    previewPtrHandoffPack: "Preview PTR Handoff Pack",
    previewProductDeliveryHandoffPack: "Preview Product Delivery Handoff Pack",
    downloadHandoffPack: "Download Handoff Pack ZIP",
    generatingHandoffPack: "Creating handoff pack...",
    includedFiles: "Included files",
    localAuditLog: "Local Audit Log",
    aiRunHistory: "AI Run History"
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
    throw new Error(`${key} khÃ´ng pháº£i lÃ  danh sÃ¡ch há»£p lá»‡.`);
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
        ? "Review the preview before applying or exporting."
        : validationErrors?.length
          ? "Review validation issues, adjust the source context, then rerun the skill."
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
          ? "Thêm ghi chú, context, tóm tắt nguồn hoặc text trích xuất từ file trước khi so sánh BRD từ ghi chú."
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
          ? "Hãy tạo Product Delivery artifacts hoặc bảo đảm PTR có dòng trước khi so sánh AI Coding Pack."
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
            ? "Đã hủy so sánh provider. Không thay đổi preview."
            : "Provider Compare cancelled. No preview was changed."
        );
        return;
      }
    }

    if (!confirmRealAICallIfNeeded(usesCloudProvider)) {
      setMessage(
        locale === "vi"
          ? "Đã hủy so sánh provider do chưa xác nhận gọi cloud AI."
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
        ? "Đã hoàn tất so sánh provider. Chọn một output để xem tiếp."
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
      setMessage("ÄÃ£ generate fresh Ä‘á»§ 5 artifacts cho output package.");
    } catch (error) {
      setArtifacts(null);
      setExportPackageStatus("not_generated");
      setMessage(
        error instanceof Error
          ? `KhÃ´ng thá»ƒ generate output package: ${error.message}`
          : "KhÃ´ng thá»ƒ generate output package. Vui lÃ²ng kiá»ƒm tra dá»¯ liá»‡u."
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
      setMessage("ÄÃ£ táº¡o ZIP output package.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `KhÃ´ng thá»ƒ download ZIP: ${error.message}`
          : "KhÃ´ng thá»ƒ download ZIP. Vui lÃ²ng thá»­ láº¡i."
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
    setMessage("ÄÃ£ export audit log JSON.");
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
          ? "Đã tạo preview Product Delivery draft deterministic."
          : "Created deterministic Product Delivery draft preview."
      );
    } catch (error) {
      setProductDeliveryDraft(null);
      setMessage(
        error instanceof Error
          ? locale === "vi"
            ? `Không thể tạo Product Delivery draft: ${error.message}`
            : `Could not create Product Delivery draft: ${error.message}`
          : locale === "vi"
            ? "Không thể tạo Product Delivery draft. Vui lòng kiểm tra dữ liệu."
            : "Could not create Product Delivery draft. Please check the data."
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
          ? "Đã export Product Delivery draft markdown."
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
          ? "Đã tạo preview AI Coding Pack từ Product Delivery artifacts."
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

  return (
    <section className="surface-card overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50/70 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="status-badge status-badge-success">
              {isProductDeliveryView ? text.productDelivery : text.title}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">
              {isProductDeliveryView
                ? locale === "vi"
                  ? "Hồ sơ sản phẩm"
                  : "Product Delivery Core"
                : locale === "vi"
                  ? "Gói ZIP đầu ra"
                  : "Output Package ZIP"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {isProductDeliveryView ? text.productDeliveryDescription : text.description}
            </p>
          </div>

          {isExportView ? (
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
                Export Audit Log JSON
              </button>
            </div>
          ) : null}
        </div>

        {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
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
          <div className="rounded border border-slate-200 p-3" key={String(label)}>
            <p className="text-sm font-semibold text-slate-950">{label}</p>
            <p
              className={`mt-1 text-sm ${
                status === "fresh"
                  ? "text-emerald-700"
                  : status === "stale"
                    ? "text-amber-700"
                    : "text-slate-500"
              }`}
            >
              {status === "fresh"
                ? "Fresh"
                : status === "stale"
                  ? "Stale"
                  : "Not generated"}
            </p>
          </div>
        ))}
      </div>

      <details className="border-t border-slate-200 bg-slate-50/60">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">
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
              Shows safe metadata for AI skill runs only. Prompt text and full
              model output are not stored in this local history.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn btn-secondary"
              onClick={refreshAIRunHistory}
              type="button"
            >
              Refresh history
            </button>
            <button
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={downloadAIRunHistory}
              type="button"
            >
              {locale === "vi" ? "Export lịch sử JSON" : "Export history JSON"}
            </button>
          </div>
        </div>

        {aiRunHistory.length ? (
          <div className="mt-4 overflow-x-auto rounded border border-slate-200">
            <table className="min-w-[72rem] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Skill</th>
                  <th className="px-3 py-2 font-semibold">Provider</th>
                  <th className="px-3 py-2 font-semibold">Model</th>
                  <th className="px-3 py-2 font-semibold">
                    {locale === "vi" ? "Trạng thái" : "Status"}
                  </th>
                  <th className="px-3 py-2 font-semibold">
                    {locale === "vi" ? "Validation" : "Validation"}
                  </th>
                  <th className="px-3 py-2 font-semibold">Latency</th>
                  <th className="px-3 py-2 font-semibold">External</th>
                  <th className="px-3 py-2 font-semibold">Tokens</th>
                  <th className="px-3 py-2 font-semibold">Timestamp</th>
                  <th className="px-3 py-2 font-semibold">
                    {locale === "vi" ? "Chi tiết" : "Details"}
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
                          {run.externalApiCalled ? "yes" : "no"}
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
                              {isExpanded ? "Hide" : "Details"}
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
                                <span className="font-semibold">Error type:</span>{" "}
                                {run.errorType || "not applicable"}
                              </p>
                              <p>
                                <span className="font-semibold">Request id:</span>{" "}
                                {run.requestId || "not available"}
                              </p>
                              <p className="md:col-span-2">
                                <span className="font-semibold">
                                  Safe message:
                                </span>{" "}
                                {run.safeErrorMessage || "No safe error message recorded."}
                              </p>
                              <p className="md:col-span-2">
                                <span className="font-semibold">
                                  Validation summary:
                                </span>{" "}
                                {run.validationErrorSummary ||
                                  (run.validationStatus === "valid"
                                    ? "Valid."
                                    : "No validation summary recorded.")}
                              </p>
                              <p className="md:col-span-2">
                                <span className="font-semibold">Warnings:</span>{" "}
                                {run.warnings.length
                                  ? run.warnings.join("; ")
                                  : "None"}
                              </p>
                              <p className="md:col-span-2">
                                <span className="font-semibold">
                                  Suggested next action:
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
      <div className="border-t border-slate-200 p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)]">
          <div>
            <p className="text-sm font-medium uppercase text-slate-500">
              {text.productDelivery}
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">
              {locale === "vi"
                ? "Bản nháp BRD, SRS, user stories và acceptance criteria"
                : "Draft BRD, SRS, user stories, and acceptance criteria"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {text.productDeliveryDescription}
            </p>
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
                  {locale === "vi" ? "Text trích xuất từ file tùy chọn" : "Optional uploaded file text"}
                </span>
                <textarea
                  className="mt-2 min-h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800"
                  onChange={(event) => setProductDeliveryFileText(event.target.value)}
                  placeholder={
                    locale === "vi"
                      ? "Dán text đã trích xuất từ PDF/DOCX khi có. Trình duyệt không gọi trực tiếp provider AI bên ngoài."
                      : "Paste extracted PDF/DOCX text when available. Browser does not call external AI providers directly."
                  }
                  value={productDeliveryFileText}
                />
              </label>
            </div>
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              {[
                { vi: "BRD", en: "BRD" },
                { vi: "SRS", en: "SRS" },
                { vi: "User story", en: "User Stories" },
                { vi: "Acceptance Criteria", en: "Acceptance Criteria" },
                { vi: "Review phạm vi", en: "Scope Review" },
                { vi: "Cắt MVP", en: "MVP Slicing" },
                { vi: "Gói bàn giao phát triển", en: "AI Development Handoff Pack" }
              ].map((capability) => (
                <div
                  className="rounded border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700"
                  key={capability.en}
                >
                  {capability[locale]}
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <div className="rounded border border-blue-100 bg-blue-50/60 p-3">
                <p className="text-sm font-semibold text-blue-950">
                  {locale === "vi" ? "Tạo" : "Generate"}
                </p>
                <p className="mt-1 text-xs leading-5 text-blue-900/80">
                  {locale === "vi"
                    ? "Tạo bản nháp BRD, SRS, user stories, acceptance criteria và MVP slicing để xem trước."
                    : "Create preview-first BRD, SRS, user stories, acceptance criteria, and MVP slicing drafts."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
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
                    className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                    disabled={isGeneratingBRD}
                    onClick={() => void generateBRDPreview("notes-to-brd")}
                    type="button"
                  >
                    {locale === "vi" ? "Tạo BRD từ ghi chú" : "Generate BRD from Notes"}
                  </button>
                  <button
                    className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                    disabled={isGeneratingSRS}
                    onClick={() => void generateSRSPreview("brd-to-srs")}
                    type="button"
                  >
                    {isGeneratingSRS
                      ? locale === "vi"
                        ? "Đang tạo SRS..."
                        : "Generating SRS..."
                      : locale === "vi"
                        ? "Tạo SRS từ BRD/PTR"
                        : "Generate SRS from BRD/PTR"}
                  </button>
                  <button
                    className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                    disabled={isGeneratingSRS}
                    onClick={() => void generateSRSPreview("notes-to-srs")}
                    type="button"
                  >
                    {locale === "vi" ? "Tạo SRS từ ghi chú" : "Generate SRS from Notes"}
                  </button>
                  <button
                    className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                    disabled={isGeneratingUserStories}
                    onClick={() => void generateUserStoryPreview("srs-to-user-stories")}
                    type="button"
                  >
                    {isGeneratingUserStories
                      ? locale === "vi"
                        ? "Đang tạo user story..."
                        : "Generating Stories..."
                      : locale === "vi"
                        ? "Tạo user story từ SRS"
                        : "Generate Stories from SRS"}
                  </button>
                  <button
                    className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                    disabled={isGeneratingUserStories}
                    onClick={() => void generateUserStoryPreview("brd-to-user-stories")}
                    type="button"
                  >
                    {locale === "vi" ? "Tạo user story từ BRD" : "Generate Stories from BRD"}
                  </button>
                  <button
                    className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                    disabled={isGeneratingAcceptanceCriteria}
                    onClick={() => void generateAcceptanceCriteriaPreview()}
                    type="button"
                  >
                    {isGeneratingAcceptanceCriteria
                      ? locale === "vi"
                        ? "Đang tạo Acceptance Criteria..."
                        : "Generating AC..."
                      : locale === "vi"
                        ? "Tạo Acceptance Criteria"
                        : "Generate Acceptance Criteria"}
                  </button>
                  <button
                    className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                    disabled={isGeneratingProductScopeReview}
                    onClick={() => void generateProductScopeReviewPreview("mvp-slicing")}
                    type="button"
                  >
                    {locale === "vi" ? "Tạo MVP Slicing" : "Generate MVP Slicing"}
                  </button>
                </div>
              </div>

              <div className="rounded border border-purple-100 bg-purple-50/60 p-3">
                <p className="text-sm font-semibold text-purple-950">
                  {locale === "vi" ? "Review" : "Review"}
                </p>
                <p className="mt-1 text-xs leading-5 text-purple-900/80">
                  {locale === "vi"
                    ? "Chạy scope review và Requirement QA như finding/recommendation draft; không tự áp dụng."
                    : "Run scope review and Requirement QA as draft findings/recommendations; nothing is auto-applied."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                    disabled={isGeneratingProductScopeReview}
                    onClick={() => void generateProductScopeReviewPreview("product-scope-review")}
                    type="button"
                  >
                    {isGeneratingProductScopeReview
                      ? locale === "vi"
                        ? "Đang review scope..."
                        : "Reviewing Scope..."
                      : locale === "vi"
                        ? "Review Product Scope"
                        : "Review Product Scope"}
                  </button>
                  <button
                    className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
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
              </div>

              <div className="rounded border border-emerald-100 bg-emerald-50/60 p-3">
                <p className="text-sm font-semibold text-emerald-950">
                  {locale === "vi" ? "Xuất" : "Export"}
                </p>
                <p className="mt-1 text-xs leading-5 text-emerald-900/80">
                  {locale === "vi"
                    ? "Tải JSON/Markdown sau khi đã có preview; gói handoff nằm ở phần bên dưới."
                    : "Download JSON/Markdown after previews exist; the handoff pack is below."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="btn btn-primary"
                    disabled={!brdPreview}
                    onClick={downloadBRDJson}
                    type="button"
                  >
                    {locale === "vi" ? "Tải BRD JSON" : "Download BRD JSON"}
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={!srsPreview}
                    onClick={downloadSRSJson}
                    type="button"
                  >
                    {locale === "vi" ? "Tải SRS JSON" : "Download SRS JSON"}
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={!userStoryPreview}
                    onClick={downloadUserStoriesJson}
                    type="button"
                  >
                    {locale === "vi" ? "Tải Stories JSON" : "Download Stories JSON"}
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={!acceptanceCriteriaPreview}
                    onClick={downloadAcceptanceCriteriaJson}
                    type="button"
                  >
                    {locale === "vi" ? "Tải AC JSON" : "Download AC JSON"}
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={!productScopeReviewPreview}
                    onClick={downloadProductScopeReviewJson}
                    type="button"
                  >
                    {locale === "vi" ? "Tải Scope JSON" : "Download Scope JSON"}
                  </button>
                  <button
                    className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    onClick={previewProductDeliveryDraft}
                    type="button"
                  >
                    {text.generateProductDeliveryDraft}
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={!productDeliveryDraft}
                    onClick={downloadProductDeliveryMarkdown}
                    type="button"
                  >
                    {text.downloadProductDeliveryMarkdown}
                  </button>
                </div>
              </div>
            </div>
            <details className="mt-4 rounded border border-slate-200 bg-slate-50">
              <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-slate-700">
                {locale === "vi" ? "Nâng cao / So sánh provider" : "Advanced / Provider Compare"}
              </summary>
              <div className="border-t border-slate-200 p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {locale === "vi" ? "So sánh provider" : "Provider Compare"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    {locale === "vi"
                      ? "Tùy chọn và mặc định tắt. So sánh các provider đã chọn cho BRD, User Stories hoặc AI Coding Pack, sau đó chọn một output để xem tiếp."
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
                        {provider.label}
                      </label>
                    ))}
                    {compareProviderIds.length > 1 ? (
                      <span className="text-xs text-amber-700">
                        {locale === "vi"
                          ? "Nhiều provider có thể làm tăng chi phí AI."
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
                      {locale === "vi" ? "Dùng output này" : "Use this output"}
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
              </div>
            </details>
          </div>

          <div className="rounded border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-950">
              {locale === "vi" ? "Bản nháp bao gồm" : "Draft includes"}
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
              <li>{locale === "vi" ? "Phạm vi sản phẩm" : "Product scope"}</li>
              <li>{locale === "vi" ? "Dàn ý BRD" : "BRD outline"}</li>
              <li>{locale === "vi" ? "Dàn ý SRS" : "SRS outline"}</li>
              <li>{locale === "vi" ? "User stories" : "User stories"}</li>
              <li>{locale === "vi" ? "Acceptance criteria" : "Acceptance criteria"}</li>
              <li>{locale === "vi" ? "Review product scope và MVP slicing" : "Product scope review and MVP slicing"}</li>
              <li>{locale === "vi" ? "Requirement QA và trace coverage" : "Requirement QA and trace coverage"}</li>
              <li>{locale === "vi" ? "Giả định và câu hỏi mở" : "Assumptions and open questions"}</li>
            </ul>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              {locale === "vi"
                ? "MVP1 chưa tạo Artifact Graph. User stories và acceptance criteria được tạo qua AI skill route server-side và chỉ ở trạng thái preview/export."
                : "No Artifact Graph is created in MVP1. User stories and acceptance criteria are generated through server-side AI skill routes and remain preview/export only."}
            </p>
          </div>
        </div>

        {productDeliveryDraft ? (
          <div className="mt-4 rounded border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-950">
                {locale === "vi" ? "Preview: bản nháp Product Delivery" : "Preview: Product Delivery draft"}
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
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap p-4 text-xs leading-5 text-slate-700">
              {productDeliveryDraft.draft.combinedMarkdown}
            </pre>
          </div>
        ) : null}

        {brdPreview ? (
          <div className="mt-4 rounded border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-950">
                {locale === "vi" ? "Preview: bản nháp BRD có cấu trúc" : "Preview: Structured BRD draft"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {locale === "vi"
                  ? `Đã tạo lúc ${brdPreview.timestamp} qua ${brdPreview.sourceSkillId}. Chỉ preview; chưa lưu vào Artifact Graph.`
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
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap p-4 text-xs leading-5 text-slate-700">
              {JSON.stringify(brdPreview.brd, null, 2)}
            </pre>
          </div>
        ) : null}

        {srsPreview ? (
          <div className="mt-4 rounded border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-950">
                {locale === "vi" ? "Preview: bản nháp SRS có cấu trúc" : "Preview: Structured SRS draft"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {locale === "vi"
                  ? `Đã tạo lúc ${srsPreview.timestamp} qua ${srsPreview.sourceSkillId}. Chỉ preview; chưa lưu vào Artifact Graph.`
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
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap p-4 text-xs leading-5 text-slate-700">
              {JSON.stringify(srsPreview.srs, null, 2)}
            </pre>
          </div>
        ) : null}

        {userStoryPreview ? (
          <div className="mt-4 rounded border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-950">
                {locale === "vi" ? "Preview: bản nháp user stories có cấu trúc" : "Preview: Structured user stories draft"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {locale === "vi"
                  ? `Đã tạo lúc ${userStoryPreview.timestamp} qua ${userStoryPreview.sourceSkillId}. Chỉ preview; chưa lưu vào Artifact Graph.`
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
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap p-4 text-xs leading-5 text-slate-700">
              {JSON.stringify(userStoryPreview.userStorySet, null, 2)}
            </pre>
          </div>
        ) : null}

        {acceptanceCriteriaPreview ? (
          <div className="mt-4 rounded border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-950">
                {locale === "vi" ? "Preview: bản nháp acceptance criteria có cấu trúc" : "Preview: Structured acceptance criteria draft"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {locale === "vi"
                  ? `Đã tạo lúc ${acceptanceCriteriaPreview.timestamp} qua ${acceptanceCriteriaPreview.sourceSkillId}. Chỉ preview; chưa lưu vào Artifact Graph.`
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
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap p-4 text-xs leading-5 text-slate-700">
              {JSON.stringify(
                acceptanceCriteriaPreview.acceptanceCriteria,
                null,
                2
              )}
            </pre>
          </div>
        ) : null}

        {productScopeReviewPreview ? (
          <div className="mt-4 rounded border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-950">
                {locale === "vi" ? "Preview: review phạm vi sản phẩm và MVP slicing" : "Preview: Product scope review and MVP slicing"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {locale === "vi"
                  ? `Đã tạo lúc ${productScopeReviewPreview.timestamp} qua ${productScopeReviewPreview.sourceSkillId}. Chỉ preview; chưa lưu vào Artifact Graph.`
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
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap p-4 text-xs leading-5 text-slate-700">
              {JSON.stringify(productScopeReviewPreview.scopeReview, null, 2)}
            </pre>
          </div>
        ) : null}

        {requirementQAPreview ? (
          <div className="mt-4 rounded border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-950">
                {locale === "vi" ? "Preview: Requirement QA và trace coverage" : "Preview: Requirement QA and trace coverage"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {locale === "vi"
                  ? `Đã tạo lúc ${requirementQAPreview.timestamp} qua ${requirementQAPreview.sourceSkillId}. Finding chỉ là recommendation draft; chưa áp dụng hoặc lưu.`
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
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap p-4 text-xs leading-5 text-slate-700">
              {JSON.stringify(requirementQAPreview.requirementQA, null, 2)}
            </pre>
          </div>
        ) : null}
      </div>

      <div className="border-t border-slate-200 p-4">
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
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={previewAICodingPack}
                type="button"
              >
                {text.previewPtrHandoffPack}
              </button>
              <button
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
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

          <div className="rounded border border-slate-200 bg-slate-50 p-3">
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
            <p className="mt-3 text-xs leading-5 text-slate-500">
              {locale === "vi"
                ? "Chi tiết nâng cao cho người dùng kỹ thuật: AGENTS.md, CLAUDE.md, cursor rules và spec.json được giữ trong gói. Product Delivery dùng `user-stories-to-ai-coding-pack` qua `/api/ai/run-skill`, có fallback mock/local và schema validation."
                : "Advanced details for technical users: AGENTS.md, CLAUDE.md, cursor rules, and spec.json are kept in the package. Product Delivery generation uses `user-stories-to-ai-coding-pack` through `/api/ai/run-skill`, with mock/local fallback and schema validation."}
            </p>
          </div>
        </div>

        {aiCodingPack ? (
          <div className="mt-4 rounded border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-950">
                Preview: spec.json
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
            <pre className="max-h-96 overflow-auto p-4 text-xs leading-5 text-slate-700">
              {aiCodingPack.files.specJson}
            </pre>
          </div>
        ) : null}
      </div>
      </div>
    </section>
  );
}

