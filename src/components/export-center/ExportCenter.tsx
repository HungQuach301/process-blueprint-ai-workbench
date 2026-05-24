"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
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
  createAISkillRequestBody,
  logAICallAudit,
  readAIProviderSettings,
  resolveAISkillModelSelection
} from "@/lib/ai/ai-governance";
import { getAIValidationUserMessage } from "@/lib/ai/user-facing-ai-errors";
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
import {
  createLocalWorkspaceBackup,
  getLocalWorkspaceBackupFileName,
  parseLocalWorkspaceBackup,
  restoreLocalWorkspaceBackup
} from "@/lib/workspace/local-workspace-backup";

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
const PROCESS_TASKS_EVENT = "process-blueprint-process-tasks-change";

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
type ExportAIRetryAction =
  | "compare-brd-ptr"
  | "compare-brd-notes"
  | "compare-stories-srs"
  | "compare-stories-brd"
  | "compare-ai-coding-pack"
  | "brd-ptr"
  | "brd-notes"
  | "srs-brd"
  | "srs-notes"
  | "stories-srs"
  | "stories-brd"
  | "acceptance-criteria"
  | "scope-review"
  | "mvp-slicing"
  | "requirement-qa"
  | "product-ai-coding-pack";

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
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number | null;
  runtimeOptionsSummary?: Record<string, unknown>;
  contextSummary?: Record<string, unknown>;
  validationStatus?: "valid" | "invalid" | "skipped" | "not applicable";
  gateStatus?: string;
  qualityGate?: Record<string, unknown>;
  outputNormalizationSummary?: Record<string, unknown>;
  outputNormalization?: Record<string, unknown>;
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

type ProductDeliveryActionStatus = "idle" | "generated" | "running" | "error";

const compareProviders: Array<{ id: CompareProviderId; label: string }> = [
  { id: "product-ai", label: "Product AI" },
  { id: "openai", label: "OpenAI" },
  { id: "claude", label: "Claude" },
  { id: "mock", label: "Local analysis" }
];

function getFriendlyExportAIErrorMessage(
  error?: string,
  validationErrors?: string[]
) {
  if (validationErrors?.length) {
    return getAIValidationUserMessage(validationErrors);
  }

  const normalizedError = (error ?? "").toLowerCase();

  if (normalizedError.includes("timeout") || normalizedError.includes("timed out")) {
    return "AI generation timed out. No preview was changed; you can retry with the current context.";
  }

  if (
    normalizedError.includes("network") ||
    normalizedError.includes("fetch") ||
    normalizedError.includes("failed")
  ) {
    return "AI service could not be reached. No preview was changed; check the connection or retry.";
  }

  return "AI generation could not complete. No preview was changed; you can retry with the current context.";
}

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

function formatOptionalNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString()
    : "-";
}

function formatCost(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? `$${value.toFixed(4)}`
    : "-";
}

function formatSafeRecord(value: Record<string, unknown> | undefined) {
  if (!value) {
    return "Not recorded";
  }

  return Object.entries(value)
    .filter(([, entryValue]) => entryValue !== undefined && entryValue !== "")
    .map(([key, entryValue]) => `${key}: ${String(entryValue)}`)
    .join("; ") || "Not recorded";
}

function readJsonArray<T>(key: string, fallback: T[]) {
  const savedValue = window.localStorage.getItem(key);

  if (!savedValue) {
    return fallback;
  }

  const parsedValue = JSON.parse(savedValue);

  if (!Array.isArray(parsedValue)) {
    throw new Error(`${key} is not a valid list.`);
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

export function ExportCenter() {
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
  const [productDeliveryInputsOpen, setProductDeliveryInputsOpen] =
    useState(false);
  const [productDeliveryAIIndicator, setProductDeliveryAIIndicator] = useState(
    "Phân tích cục bộ"
  );
  const [productDeliveryActionSuffix, setProductDeliveryActionSuffix] =
    useState("(Local)");
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
  const [isGeneratingProductAICodingPack, setIsGeneratingProductAICodingPack] =
    useState(false);
  const [aiRetryAction, setAiRetryAction] =
    useState<ExportAIRetryAction | null>(null);
  const [d01Status, setD01Status] = useState<ArtifactStatus>("not_generated");
  const [d02Status, setD02Status] = useState<ArtifactStatus>("not_generated");
  const [exportPackageStatus, setExportPackageStatus] =
    useState<ArtifactStatus>("not_generated");
  const workspaceImportInputRef = useRef<HTMLInputElement | null>(null);

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
    function handleArtifactStatusChange() {
      refreshArtifactStatuses();

      if (artifacts) {
        setExportPackageStatus("stale");
      }
    }

    refreshArtifactStatuses();
    refreshAIRunHistory();
    window.addEventListener(ARTIFACT_STATUS_EVENT, handleArtifactStatusChange);

    return () => {
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

  useEffect(() => {
    const settings = readAIProviderSettings();
    const selection = resolveAISkillModelSelection("ptr-to-brd");
    const usesRealAI =
      settings.allowCloudAI &&
      selection.providerId !== "mock" &&
      selection.providerMode !== "no-ai" &&
      selection.providerMode !== "local-model";
    const providerLabel =
      selection.providerId === "openai"
        ? "OpenAI"
        : selection.providerId === "claude"
          ? "Claude"
          : selection.providerId === "product-ai"
            ? "Product AI"
            : "Local";

    setProductDeliveryAIIndicator(
      usesRealAI
        ? `Sử dụng ${providerLabel} ${selection.model}`
        : "Phân tích cục bộ"
    );
    setProductDeliveryActionSuffix(usesRealAI ? "(AI)" : "(Local)");
  }, []);

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

  function getProductDeliveryActionStatus(
    isRunning: boolean,
    hasPreview: boolean,
    hasError = false
  ): ProductDeliveryActionStatus {
    if (isRunning) {
      return "running";
    }

    if (hasError && !hasPreview) {
      return "error";
    }

    return hasPreview ? "generated" : "idle";
  }

  function renderProductDeliveryStatusBadge(
    status: ProductDeliveryActionStatus
  ) {
    if (status === "running") {
      return (
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
          Đang tạo
        </span>
      );
    }

    if (status === "error") {
      return (
        <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
          ❌ Lỗi
        </span>
      );
    }

    if (status === "generated") {
      return (
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          ✅ Đã tạo
        </span>
      );
    }

    return (
      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
        Chưa tạo
      </span>
    );
  }

  function renderProductDeliveryRow({
    title,
    actions,
    status,
    summary,
    downloadAction,
    downloadDisabled = false
  }: {
    title: string;
    actions: ReactNode;
    status: ProductDeliveryActionStatus;
    summary?: string;
    downloadAction?: ReactNode;
    downloadDisabled?: boolean;
  }) {
    return (
      <div className="grid gap-3 rounded border border-slate-200 bg-white p-3 lg:grid-cols-[9rem_minmax(0,1fr)_auto_auto] lg:items-center">
        <div className="text-sm font-semibold text-slate-950">{title}</div>
        <div className="flex flex-wrap gap-2">{actions}</div>
        <div className="flex flex-wrap items-center gap-2">
          {renderProductDeliveryStatusBadge(status)}
          {summary ? (
            <span className="text-xs font-medium text-slate-500">
              {summary}
            </span>
          ) : null}
        </div>
        {downloadAction ? (
          <div className="flex justify-start lg:justify-end">
            <span
              className={
                downloadDisabled ? "pointer-events-none opacity-50" : undefined
              }
            >
              {downloadAction}
            </span>
          </div>
        ) : null}
      </div>
    );
  }

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
      tokenUsage: meta?.tokenUsage ?? {
        inputTokens: meta?.inputTokens,
        outputTokens: meta?.outputTokens,
        totalTokens: meta?.totalTokens
      },
      estimatedCostUsd: meta?.estimatedCostUsd,
      runtimeOptionsSummary: meta?.runtimeOptionsSummary,
      contextSummary: meta?.contextSummary,
      validationStatus: meta?.validationStatus,
      gateStatus: meta?.gateStatus,
      outputNormalizationSummary: meta?.outputNormalizationSummary,
      warnings: meta?.warnings,
      errorType: meta?.errorCode ?? meta?.audit?.errorCode,
      validationErrors,
      suggestedNextAction: success
        ? "Review the preview before applying or exporting."
        : validationErrors?.length
          ? "Review validation issues, adjust the source context, then rerun the skill."
          : "Check provider status or rerun with local analysis fallback.",
      extraMetadata: {
        contextSummary: meta?.contextSummary,
        runtimeOptionsSummary: meta?.runtimeOptionsSummary,
        outputNormalizationSummary: meta?.outputNormalizationSummary,
        outputNormalization: meta?.outputNormalization,
        gateStatus: meta?.gateStatus,
        qualityGate: meta?.qualityGate,
        estimatedCostUsd: meta?.estimatedCostUsd
      }
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

  function getCompareRetryAction(
    kind: ExportCompareKind,
    skillId: string
  ): ExportAIRetryAction {
    if (kind === "brd" && skillId === "notes-to-brd") {
      return "compare-brd-notes";
    }

    if (kind === "brd") {
      return "compare-brd-ptr";
    }

    if (kind === "userStories" && skillId === "brd-to-user-stories") {
      return "compare-stories-brd";
    }

    if (kind === "userStories") {
      return "compare-stories-srs";
    }

    return "compare-ai-coding-pack";
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
      setMessage("Choose at least one provider before running Provider Compare.");
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
      setMessage("Add notes, context, source summary, or uploaded file text before comparing BRD from notes.");
      return;
    }

    if (kind === "userStories" && !srsPreview && !brdPreview && readProcessTasks().length === 0) {
      setMessage("Generate SRS/BRD preview or ensure PTR has rows before comparing user stories.");
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
      setMessage("Generate Product Delivery artifacts or ensure PTR has rows before comparing AI Coding Pack.");
      return;
    }

    const usesCloudProvider = compareProviderIds.some((providerId) => providerId !== "mock");

    if (compareProviderIds.length > 1 && usesCloudProvider) {
      const confirmed = window.confirm(
        "Provider Compare will call multiple selected providers and may increase cost. Continue?"
      );

      if (!confirmed) {
        setMessage("Provider Compare cancelled. No preview was changed.");
        return;
      }
    }

    if (!confirmRealAICallIfNeeded(usesCloudProvider)) {
      setMessage("Provider Compare cancelled by cloud AI consent check.");
      return;
    }

    setIsRunningCompare(true);
    setAiRetryAction(getCompareRetryAction(kind, skillId));
    setCompareResults([]);
    setMessage("Running Provider Compare...");

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
          body: JSON.stringify(
            createAISkillRequestBody({
              skillId,
              providerId,
              payload: comparePayload.payload
            })
          )
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
        const friendlyErrorMessage = getFriendlyExportAIErrorMessage(
          data.error,
          data.validationErrors
        );

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
              : friendlyErrorMessage,
          validationStatus:
            data.meta?.validationPassed === false ||
            !response.ok ||
            !data.ok ||
            !data.result
              ? "failed"
              : "passed",
          result: response.ok && data.ok ? data.result : undefined,
          error: response.ok && data.ok ? undefined : friendlyErrorMessage
        });
        logRouteAIRun({
          skillId,
          success: response.ok && data.ok === true,
          meta: data.meta,
          errorMessage: response.ok && data.ok ? undefined : errorMessage,
          validationErrors: data.validationErrors
        });
      } catch (error) {
        const auditErrorMessage =
          error instanceof Error ? error.message : "Provider compare request failed.";
        const errorMessage = getFriendlyExportAIErrorMessage(auditErrorMessage);

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
          errorMessage: auditErrorMessage
        });
      }
    }

    setCompareResults(nextResults);
    setAiRetryAction(nextResults.some((result) => result.validationStatus === "failed") ? getCompareRetryAction(kind, skillId) : null);
    setIsRunningCompare(false);
    setMessage("Provider Compare finished. Choose one output to preview further.");
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
      setMessage("Prepared 5 fresh artifacts for the output package.");
    } catch (error) {
      setArtifacts(null);
      setExportPackageStatus("not_generated");
      setMessage(
        error instanceof Error
          ? `Could not prepare output package: ${error.message}`
          : "Could not prepare output package. Please check the data."
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
      setAiRetryAction(skillId === "ptr-to-brd" ? "brd-ptr" : "brd-notes");
      const response = await fetch("/api/ai/run-skill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(
          createAISkillRequestBody({
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
        )
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
          getFriendlyExportAIErrorMessage(data.error, data.validationErrors)
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
      setAiRetryAction(null);
      setMessage("Da tao preview BRD structured. Chua save/apply.");
    } catch (error) {
      setBRDPreview(null);
      logRouteAIRun({
        skillId,
        success: false,
        errorMessage:
          error instanceof Error ? error.message : "Unknown BRD generation error."
      });
      setMessage(
        getFriendlyExportAIErrorMessage(
          error instanceof Error ? error.message : undefined
        )
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
      setMessage("Generate BRD preview or ensure PTR has rows before generating SRS.");
      return;
    }

    if (skillId === "notes-to-srs" && sourceText.length < 20 && !brdPreview) {
      setMessage("Add notes, context, source summary, uploaded file text, or BRD preview before generating SRS from notes.");
      return;
    }

    try {
      setIsGeneratingSRS(true);
      setAiRetryAction(skillId === "brd-to-srs" ? "srs-brd" : "srs-notes");
      const response = await fetch("/api/ai/run-skill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(
          createAISkillRequestBody({
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
        )
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
          getFriendlyExportAIErrorMessage(data.error, data.validationErrors)
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
      setAiRetryAction(null);
      setMessage("Da tao preview SRS structured. Chua save/apply.");
    } catch (error) {
      setSRSPreview(null);
      logRouteAIRun({
        skillId,
        success: false,
        errorMessage:
          error instanceof Error ? error.message : "Unknown SRS generation error."
      });
      setMessage(
        getFriendlyExportAIErrorMessage(
          error instanceof Error ? error.message : undefined
        )
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
      setMessage("Generate SRS preview or ensure PTR has rows before generating user stories.");
      return;
    }

    if (skillId === "brd-to-user-stories" && !brdPreview && processTasks.length === 0) {
      setMessage("Generate BRD preview or ensure PTR has rows before generating user stories.");
      return;
    }

    try {
      setIsGeneratingUserStories(true);
      setAiRetryAction(
        skillId === "srs-to-user-stories" ? "stories-srs" : "stories-brd"
      );
      const response = await fetch("/api/ai/run-skill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(
          createAISkillRequestBody({
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
        )
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
          getFriendlyExportAIErrorMessage(data.error, data.validationErrors)
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
      setAiRetryAction(null);
      setMessage("Da tao preview User Stories structured. Chua save/apply.");
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
        getFriendlyExportAIErrorMessage(
          error instanceof Error ? error.message : undefined
        )
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
      setMessage("Generate user stories preview or ensure PTR has rows before generating acceptance criteria.");
      return;
    }

    try {
      setIsGeneratingAcceptanceCriteria(true);
      setAiRetryAction("acceptance-criteria");
      const response = await fetch("/api/ai/run-skill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(
          createAISkillRequestBody({
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
        )
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
          getFriendlyExportAIErrorMessage(data.error, data.validationErrors)
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
      setAiRetryAction(null);
      setMessage("Da tao preview Acceptance Criteria structured. Chua save/apply.");
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
        getFriendlyExportAIErrorMessage(
          error instanceof Error ? error.message : undefined
        )
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
      setMessage("Generate BRD/SRS/User Stories preview or add product context before scope review.");
      return;
    }

    try {
      setIsGeneratingProductScopeReview(true);
      setAiRetryAction(skillId === "product-scope-review" ? "scope-review" : "mvp-slicing");
      const response = await fetch("/api/ai/run-skill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(
          createAISkillRequestBody({
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
        )
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
          getFriendlyExportAIErrorMessage(data.error, data.validationErrors)
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
      setAiRetryAction(null);
      setMessage("Da tao preview Product Scope Review/MVP Slicing. Chua save/apply.");
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
        getFriendlyExportAIErrorMessage(
          error instanceof Error ? error.message : undefined
        )
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
      setMessage("Generate BRD/SRS/User Stories/AC or AI Coding Pack preview before Requirement QA.");
      return;
    }

    try {
      setIsGeneratingRequirementQA(true);
      setAiRetryAction("requirement-qa");
      const response = await fetch("/api/ai/run-skill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(
          createAISkillRequestBody({
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
        )
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
          getFriendlyExportAIErrorMessage(data.error, data.validationErrors)
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
      setAiRetryAction(null);
      setMessage("Da tao preview Requirement QA. Khong save/apply tu dong.");
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
        getFriendlyExportAIErrorMessage(
          error instanceof Error ? error.message : undefined
        )
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
      setMessage("Created ZIP output package.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Could not download ZIP: ${error.message}`
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
    setMessage("Exported audit log JSON.");
  }

  function exportLocalWorkspaceJson() {
    try {
      const backup = createLocalWorkspaceBackup();

      downloadBlob(
        JSON.stringify(backup, null, 2),
        getLocalWorkspaceBackupFileName(),
        "application/json;charset=utf-8"
      );
      setMessage(
        `Exported Local workspace backup with ${Object.keys(backup.storage).length} item(s).`
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Could not export Local workspace backup: ${error.message}`
          : "Could not export Local workspace backup."
      );
    }
  }

  async function importLocalWorkspaceJson(file?: File) {
    if (!file) {
      return;
    }

    try {
      const backup = parseLocalWorkspaceBackup(await file.text());
      const confirmed = window.confirm(
        `Restore Local workspace backup exported at ${backup.exportedAt}? This replaces browser local data for this workspace.`
      );

      if (!confirmed) {
        setMessage("Workspace restore cancelled. Current local data was not changed.");
        return;
      }

      const result = restoreLocalWorkspaceBackup(backup);

      if (!result.ok) {
        setMessage(result.error);
        return;
      }

      refreshArtifactStatuses();
      refreshAIRunHistory();
      window.dispatchEvent(new Event(ARTIFACT_STATUS_EVENT));
      window.dispatchEvent(new Event(PROCESS_TASKS_EVENT));
      setMessage(
        `Restored Local workspace backup (${result.restoredKeyCount} item(s)). Refresh the page to reload all panels.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not import Local workspace backup."
      );
    } finally {
      if (workspaceImportInputRef.current) {
        workspaceImportInputRef.current.value = "";
      }
    }
  }

  function downloadAIRunHistory() {
    downloadBlob(
      exportAIRunHistoryJson(),
      `AI_Run_History_${createTimestamp()}.json`,
      "application/json;charset=utf-8"
    );
    setMessage("Da export AI Run History JSON.");
  }

  function previewAICodingPack() {
    try {
      const nextPack = buildAICodingPack();

      setAICodingPack({
        ...nextPack,
        sourceSkillId: "ptr-to-ai-coding-pack"
      });
      setMessage("Da tao preview AI Coding Pack deterministic.");
    } catch (error) {
      setAICodingPack(null);
      setMessage(
        error instanceof Error
          ? `Khong the tao AI Coding Pack: ${error.message}`
          : "Khong the tao AI Coding Pack. Vui long kiem tra du lieu."
      );
    }
  }

  function previewProductDeliveryDraft() {
    try {
      const nextDraft = buildProductDeliveryDraft();

      setProductDeliveryDraft(nextDraft);
      setMessage("Da tao preview Product Delivery draft deterministic.");
    } catch (error) {
      setProductDeliveryDraft(null);
      setMessage(
        error instanceof Error
          ? `Khong the tao Product Delivery draft: ${error.message}`
          : "Khong the tao Product Delivery draft. Vui long kiem tra du lieu."
      );
    }
  }

  function downloadProductDeliveryMarkdown() {
    try {
      if (!productDeliveryDraft) {
        setMessage("Generate Product Delivery preview before downloading.");
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
      setMessage("Da export Product Delivery draft markdown.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Khong the export Product Delivery draft: ${error.message}`
          : "Khong the export Product Delivery draft. Vui long thu lai."
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
      setMessage("Generate BRD/SRS/User Stories/AC preview or ensure PTR has rows before AI Coding Pack.");
      return;
    }

    try {
      setIsGeneratingProductAICodingPack(true);
      setAiRetryAction("product-ai-coding-pack");
      const response = await fetch("/api/ai/run-skill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(
          createAISkillRequestBody({
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
        )
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
          getFriendlyExportAIErrorMessage(data.error, data.validationErrors)
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
      setAiRetryAction(null);
      setMessage("Da tao preview AI Coding Pack tu Product Delivery artifacts.");
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
        getFriendlyExportAIErrorMessage(
          error instanceof Error ? error.message : undefined
        )
      );
    } finally {
      setIsGeneratingProductAICodingPack(false);
    }
  }

  function retryExportAIAction() {
    switch (aiRetryAction) {
      case "compare-brd-ptr":
        void runExportProviderCompare({ kind: "brd", skillId: "ptr-to-brd" });
        break;
      case "compare-brd-notes":
        void runExportProviderCompare({ kind: "brd", skillId: "notes-to-brd" });
        break;
      case "compare-stories-srs":
        void runExportProviderCompare({
          kind: "userStories",
          skillId: "srs-to-user-stories"
        });
        break;
      case "compare-stories-brd":
        void runExportProviderCompare({
          kind: "userStories",
          skillId: "brd-to-user-stories"
        });
        break;
      case "compare-ai-coding-pack":
        void runExportProviderCompare({
          kind: "aiCodingPack",
          skillId: "user-stories-to-ai-coding-pack"
        });
        break;
      case "brd-ptr":
        void generateBRDPreview("ptr-to-brd");
        break;
      case "brd-notes":
        void generateBRDPreview("notes-to-brd");
        break;
      case "srs-brd":
        void generateSRSPreview("brd-to-srs");
        break;
      case "srs-notes":
        void generateSRSPreview("notes-to-srs");
        break;
      case "stories-srs":
        void generateUserStoryPreview("srs-to-user-stories");
        break;
      case "stories-brd":
        void generateUserStoryPreview("brd-to-user-stories");
        break;
      case "acceptance-criteria":
        void generateAcceptanceCriteriaPreview();
        break;
      case "scope-review":
        void generateProductScopeReviewPreview("product-scope-review");
        break;
      case "mvp-slicing":
        void generateProductScopeReviewPreview("mvp-slicing");
        break;
      case "requirement-qa":
        void generateRequirementQAPreview();
        break;
      case "product-ai-coding-pack":
        void previewProductDeliveryAICodingPack();
        break;
      default:
        break;
    }
  }

  function downloadBRDJson() {
    if (!brdPreview) {
      setMessage("Generate BRD preview before downloading.");
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
    setMessage("Da export BRD draft JSON.");
  }

  function downloadSRSJson() {
    if (!srsPreview) {
      setMessage("Generate SRS preview before downloading.");
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
    setMessage("Da export SRS draft JSON.");
  }

  function downloadUserStoriesJson() {
    if (!userStoryPreview) {
      setMessage("Generate User Stories preview before downloading.");
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
    setMessage("Da export User Stories draft JSON.");
  }

  function downloadAcceptanceCriteriaJson() {
    if (!acceptanceCriteriaPreview) {
      setMessage("Generate Acceptance Criteria preview before downloading.");
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
    setMessage("Da export Acceptance Criteria draft JSON.");
  }

  function downloadProductScopeReviewJson() {
    if (!productScopeReviewPreview) {
      setMessage("Generate Product Scope Review preview before downloading.");
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
    setMessage("Da export Product Scope Review draft JSON.");
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
      setMessage("Da tao ZIP AI Coding Pack.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Khong the download AI Coding Pack: ${error.message}`
          : "Khong the download AI Coding Pack. Vui long thu lai."
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
              Export Center
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">
              Output Package ZIP
            </h2>
            <p className="hidden">
              Legacy package description retained for compatibility.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Review artifact readiness, download the ZIP package, and keep
              audit evidence for controlled delivery. Generation work is kept
              in collapsed preparation sections below.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              accept="application/json,.json"
              className="hidden"
              onChange={(event) =>
                void importLocalWorkspaceJson(event.target.files?.[0])
              }
              ref={workspaceImportInputRef}
              type="file"
            />
            <button
              className="btn btn-primary"
              disabled={isDownloading}
              onClick={downloadZip}
              type="button"
            >
              {isDownloading ? "Äang táº¡o ZIP..." : "Download ZIP"}
            </button>
            <button
              className="btn btn-secondary"
              onClick={downloadAuditLog}
              type="button"
            >
              Export Audit Log JSON
            </button>
            <button
              className="btn btn-secondary"
              onClick={exportLocalWorkspaceJson}
              type="button"
            >
              Export Workspace JSON
            </button>
            <button
              className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
              onClick={() => workspaceImportInputRef.current?.click()}
              type="button"
            >
              Import Workspace JSON
            </button>
            <button
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={generateAllArtifacts}
              type="button"
            >
              Prepare package artifacts
            </button>
            <a
              className="rounded border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              href="#product-delivery-workspace"
            >
              Product Delivery
            </a>
          </div>
        </div>

        <div className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p className="font-semibold">Local workspace</p>
          <p className="mt-1">
            Workspace backup and restore use this browser's localStorage only.
            No server sync or database write is performed.
          </p>
        </div>

        {message ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
            <span>{message}</span>
            {aiRetryAction &&
            !isRunningCompare &&
            !isGeneratingBRD &&
            !isGeneratingSRS &&
            !isGeneratingUserStories &&
            !isGeneratingAcceptanceCriteria &&
            !isGeneratingProductScopeReview &&
            !isGeneratingRequirementQA &&
            !isGeneratingProductAICodingPack ? (
              <button
                className="rounded border border-sky-300 bg-white px-2 py-1 text-xs font-semibold text-sky-800 hover:bg-sky-100"
                onClick={retryExportAIAction}
                type="button"
              >
                Retry
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

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
          Advanced / AI Run History ({aiRunHistory.length})
        </summary>
      <div className="border-t border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase text-slate-500">
              Local Audit Log
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">
              AI Run History
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
              Export history JSON
            </button>
          </div>
        </div>

        {aiRunHistory.length ? (
          <div className="mt-4 overflow-x-auto rounded border border-slate-200">
            <table className="min-w-[92rem] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Skill</th>
                  <th className="px-3 py-2 font-semibold">Provider</th>
                  <th className="px-3 py-2 font-semibold">Model</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Validation</th>
                  <th className="px-3 py-2 font-semibold">Gate</th>
                  <th className="px-3 py-2 font-semibold">Latency</th>
                  <th className="px-3 py-2 font-semibold">External</th>
                  <th className="px-3 py-2 font-semibold">Input</th>
                  <th className="px-3 py-2 font-semibold">Output</th>
                  <th className="px-3 py-2 font-semibold">Total</th>
                  <th className="px-3 py-2 font-semibold">Cost</th>
                  <th className="px-3 py-2 font-semibold">Timestamp</th>
                  <th className="px-3 py-2 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                {aiRunHistory.slice(0, 8).map((run) => {
                  const isExpanded = expandedAIRunId === run.id;
                  const canExpand = true;

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
                        <td className="px-3 py-2">{run.gateStatus ?? "-"}</td>
                        <td className="px-3 py-2">
                          {run.latencyMs === undefined
                            ? "-"
                            : `${run.latencyMs}ms`}
                        </td>
                        <td className="px-3 py-2">
                          {run.externalApiCalled ? "yes" : "no"}
                        </td>
                        <td className="px-3 py-2">
                          {formatOptionalNumber(run.tokenUsage?.inputTokens)}
                        </td>
                        <td className="px-3 py-2">
                          {formatOptionalNumber(run.tokenUsage?.outputTokens)}
                        </td>
                        <td className="px-3 py-2">
                          {formatOptionalNumber(run.tokenUsage?.totalTokens)}
                        </td>
                        <td className="px-3 py-2">
                          {formatCost(run.estimatedCostUsd)}
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
                          <td className="bg-slate-50 px-3 py-3" colSpan={14}>
                            <div className="grid gap-3 text-xs text-slate-700 md:grid-cols-2">
                              <p>
                                <span className="font-semibold">Runtime:</span>{" "}
                                {formatSafeRecord(run.runtimeOptionsSummary)}
                              </p>
                              <p>
                                <span className="font-semibold">Cost:</span>{" "}
                                {formatCost(run.estimatedCostUsd)}
                              </p>
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
                                  Context summary:
                                </span>{" "}
                                {formatSafeRecord(run.contextSummary)}
                              </p>
                              <p className="md:col-span-2">
                                <span className="font-semibold">
                                  Output normalization:
                                </span>{" "}
                                {formatSafeRecord(run.outputNormalizationSummary)}
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
            No AI run records yet. Run a Module 2 or Module 3 AI skill to
            populate this local history.
          </div>
        )}
      </div>
      </details>

      <section
        className="border-t border-indigo-200 bg-indigo-50/40 p-4"
        id="product-delivery-workspace"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)]">
          <div>
            <p className="status-badge status-badge-ai">
              Product Delivery Workspace
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">
              Draft product delivery artifacts before export
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Generate and review BRD, SRS, user stories, acceptance criteria,
              scope review, requirement QA, and deterministic Product Delivery
              draft content from the current Process Task Register plus optional
              context. This workspace is preview-first; downloads require
              explicit user action.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-indigo-900">
              <span className="rounded border border-indigo-200 bg-white/80 px-2.5 py-1">
                Source: Process Task Register
              </span>
              <span className="rounded border border-indigo-200 bg-white/80 px-2.5 py-1">
                Flow: Preview before export
              </span>
              <span className="rounded border border-indigo-200 bg-white/80 px-2.5 py-1">
                Apply: No auto-apply or auto-export
              </span>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-500">
              {productDeliveryAIIndicator}
            </p>
            <div className="mt-4 rounded border border-indigo-200 bg-white/80">
              <button
                aria-expanded={productDeliveryInputsOpen}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-indigo-950"
                onClick={() =>
                  setProductDeliveryInputsOpen((isOpen) => !isOpen)
                }
                type="button"
              >
                <span>Thông tin bổ sung (tuỳ chọn)</span>
                <span className="text-xs text-indigo-700">
                  {productDeliveryInputsOpen ? "Thu gọn" : "Mở rộng"}
                </span>
              </button>
              {productDeliveryInputsOpen ? (
                <div className="border-t border-indigo-100 p-3">
                <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Optional project context
                </span>
                <textarea
                  className="mt-2 min-h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800"
                  onChange={(event) => setProductDeliveryContext(event.target.value)}
                  placeholder="Example: MVP scope, target users, business objective, delivery constraints..."
                  value={productDeliveryContext}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Optional notes
                </span>
                <textarea
                  className="mt-2 min-h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800"
                  onChange={(event) => setProductDeliveryNotes(event.target.value)}
                  placeholder="Paste workshop notes, BRD notes, assumptions, or stakeholder comments..."
                  value={productDeliveryNotes}
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-700">
                  Optional uploaded file text
                </span>
                <textarea
                  className="mt-2 min-h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800"
                  onChange={(event) => setProductDeliveryFileText(event.target.value)}
                  placeholder="Paste extracted PDF/DOCX text when available. Browser does not call external AI providers directly."
                  value={productDeliveryFileText}
                />
              </label>
            </div>
                </div>
              ) : null}
            </div>
            <div className="mt-4 space-y-2">
              {renderProductDeliveryRow({
                title: "BRD",
                status: getProductDeliveryActionStatus(
                  isGeneratingBRD,
                  Boolean(brdPreview),
                  aiRetryAction === "brd-ptr" || aiRetryAction === "brd-notes"
                ),
                summary: brdPreview
                  ? `${brdPreview.brd.businessRequirements.length} business requirements generated`
                  : undefined,
                actions: (
                  <>
                    <button
                      className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      disabled={isGeneratingBRD}
                      onClick={() => void generateBRDPreview("ptr-to-brd")}
                      type="button"
                    >
                      {isGeneratingBRD
                        ? "Generating BRD..."
                        : `Generate BRD from PTR ${productDeliveryActionSuffix}`}
                    </button>
                    <button
                      className="rounded border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                      disabled={isGeneratingBRD}
                      onClick={() => void generateBRDPreview("notes-to-brd")}
                      type="button"
                    >
                      Generate BRD from Notes {productDeliveryActionSuffix}
                    </button>
                  </>
                ),
                downloadAction: (
                  <button
                    className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                    disabled={!brdPreview}
                    onClick={downloadBRDJson}
                    type="button"
                  >
                    JSON ▼
                  </button>
                )
              })}
              {renderProductDeliveryRow({
                title: "SRS",
                status: getProductDeliveryActionStatus(
                  isGeneratingSRS,
                  Boolean(srsPreview),
                  aiRetryAction === "srs-brd" || aiRetryAction === "srs-notes"
                ),
                summary: srsPreview
                  ? `${
                      srsPreview.srs.functionalRequirements.length +
                      srsPreview.srs.nonFunctionalRequirements.length
                    } requirements generated`
                  : undefined,
                actions: (
                  <>
                    <button
                      className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      disabled={isGeneratingSRS}
                      onClick={() => void generateSRSPreview("brd-to-srs")}
                      type="button"
                    >
                      {isGeneratingSRS
                        ? "Generating SRS..."
                        : `Generate SRS from BRD/PTR ${productDeliveryActionSuffix}`}
                    </button>
                    <button
                      className="rounded border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                      disabled={isGeneratingSRS}
                      onClick={() => void generateSRSPreview("notes-to-srs")}
                      type="button"
                    >
                      Generate SRS from Notes {productDeliveryActionSuffix}
                    </button>
                  </>
                ),
                downloadAction: (
                  <button
                    className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                    disabled={!srsPreview}
                    onClick={downloadSRSJson}
                    type="button"
                  >
                    JSON ▼
                  </button>
                )
              })}
              {renderProductDeliveryRow({
                title: "User Stories",
                status: getProductDeliveryActionStatus(
                  isGeneratingUserStories,
                  Boolean(userStoryPreview),
                  aiRetryAction === "stories-srs" ||
                    aiRetryAction === "stories-brd"
                ),
                summary: userStoryPreview
                  ? `${userStoryPreview.userStorySet.stories.length} user stories generated`
                  : undefined,
                actions: (
                  <>
                    <button
                      className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      disabled={isGeneratingUserStories}
                      onClick={() =>
                        void generateUserStoryPreview("srs-to-user-stories")
                      }
                      type="button"
                    >
                      {isGeneratingUserStories
                        ? "Generating Stories..."
                        : `Generate Stories from SRS ${productDeliveryActionSuffix}`}
                    </button>
                    <button
                      className="rounded border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                      disabled={isGeneratingUserStories}
                      onClick={() =>
                        void generateUserStoryPreview("brd-to-user-stories")
                      }
                      type="button"
                    >
                      Generate Stories from BRD {productDeliveryActionSuffix}
                    </button>
                  </>
                ),
                downloadAction: (
                  <button
                    className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                    disabled={!userStoryPreview}
                    onClick={downloadUserStoriesJson}
                    type="button"
                  >
                    JSON ▼
                  </button>
                )
              })}
              {renderProductDeliveryRow({
                title: "AC",
                status: getProductDeliveryActionStatus(
                  isGeneratingAcceptanceCriteria,
                  Boolean(acceptanceCriteriaPreview),
                  aiRetryAction === "acceptance-criteria"
                ),
                summary: acceptanceCriteriaPreview
                  ? `${acceptanceCriteriaPreview.acceptanceCriteria.criteria.length} acceptance criteria generated`
                  : undefined,
                actions: (
                  <button
                    className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    disabled={isGeneratingAcceptanceCriteria}
                    onClick={() => void generateAcceptanceCriteriaPreview()}
                    type="button"
                  >
                    {isGeneratingAcceptanceCriteria
                      ? "Generating AC..."
                      : `Generate Acceptance Criteria ${productDeliveryActionSuffix}`}
                  </button>
                ),
                downloadAction: (
                  <button
                    className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                    disabled={!acceptanceCriteriaPreview}
                    onClick={downloadAcceptanceCriteriaJson}
                    type="button"
                  >
                    JSON ▼
                  </button>
                )
              })}
              {renderProductDeliveryRow({
                title: "Scope",
                status: getProductDeliveryActionStatus(
                  isGeneratingProductScopeReview,
                  Boolean(productScopeReviewPreview),
                  aiRetryAction === "scope-review" ||
                    aiRetryAction === "mvp-slicing"
                ),
                summary: productScopeReviewPreview
                  ? `${productScopeReviewPreview.scopeReview.inScope.length} in scope / ${productScopeReviewPreview.scopeReview.outOfScope.length} out of scope`
                  : undefined,
                actions: (
                  <>
                    <button
                      className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      disabled={isGeneratingProductScopeReview}
                      onClick={() =>
                        void generateProductScopeReviewPreview(
                          "product-scope-review"
                        )
                      }
                      type="button"
                    >
                      {isGeneratingProductScopeReview
                        ? "Reviewing Scope..."
                        : `Review Product Scope ${productDeliveryActionSuffix}`}
                    </button>
                    <button
                      className="rounded border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                      disabled={isGeneratingProductScopeReview}
                      onClick={() =>
                        void generateProductScopeReviewPreview("mvp-slicing")
                      }
                      type="button"
                    >
                      Generate MVP Slicing {productDeliveryActionSuffix}
                    </button>
                  </>
                ),
                downloadAction: (
                  <button
                    className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                    disabled={!productScopeReviewPreview}
                    onClick={downloadProductScopeReviewJson}
                    type="button"
                  >
                    JSON ▼
                  </button>
                )
              })}
              {renderProductDeliveryRow({
                title: "QA",
                status: getProductDeliveryActionStatus(
                  isGeneratingRequirementQA,
                  Boolean(requirementQAPreview),
                  aiRetryAction === "requirement-qa"
                ),
                summary: requirementQAPreview
                  ? `${requirementQAPreview.requirementQA.findings.length} findings / ${requirementQAPreview.requirementQA.recommendations.length} recommendations`
                  : undefined,
                actions: (
                  <button
                    className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    disabled={isGeneratingRequirementQA}
                    onClick={() => void generateRequirementQAPreview()}
                    type="button"
                  >
                    {isGeneratingRequirementQA
                      ? "Running Requirement QA..."
                      : `Run Requirement QA ${productDeliveryActionSuffix}`}
                  </button>
                )
              })}
              {renderProductDeliveryRow({
                title: "Package",
                status: getProductDeliveryActionStatus(
                  false,
                  Boolean(productDeliveryDraft)
                ),
                summary: productDeliveryDraft
                  ? `${productDeliveryDraft.draft.userStorySet.stories.length} stories packaged`
                  : undefined,
                actions: (
                  <>
                    <button
                      className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                      onClick={previewProductDeliveryDraft}
                      type="button"
                    >
                      Generate Product Delivery Draft
                    </button>
                    <button
                      className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                      disabled={!productDeliveryDraft}
                      onClick={downloadProductDeliveryMarkdown}
                      type="button"
                    >
                      Markdown ▼
                    </button>
                  </>
                )
              })}
            </div>
            <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    Provider Compare
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Optional and off by default. Compare selected providers for
                    BRD, User Stories, or AI Coding Pack, then choose one output
                    to preview further.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    checked={compareModeEnabled}
                    onChange={(event) => setCompareModeEnabled(event.target.checked)}
                    type="checkbox"
                  />
                  Enable compare mode
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
                        Multiple providers may increase AI cost.
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
                      Compare BRD from PTR
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
                      Compare BRD from Notes
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
                      Compare Stories from SRS
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
                      Compare Stories from BRD
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
                      {isRunningCompare ? "Comparing..." : "Compare AI Coding Pack"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
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
                      Confidence: {result.confidence} | Warnings:{" "}
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
                      Use this output
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-950">
              Draft includes
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
              <li>Product scope</li>
              <li>BRD outline</li>
              <li>SRS outline</li>
              <li>User stories</li>
              <li>Acceptance criteria</li>
              <li>Product scope review and MVP slicing</li>
              <li>Requirement QA and trace coverage</li>
              <li>Assumptions and open questions</li>
            </ul>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              No Artifact Graph is created in MVP1. User stories and acceptance
              criteria are generated through server-side AI skill routes and
              remain preview/export only.
            </p>
          </div>
        </div>

        {productDeliveryDraft ? (
          <div className="mt-4 rounded border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-950">
                Preview: Product Delivery draft
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Generated at {productDeliveryDraft.timestamp}. Step IDs are
                preserved in stories and acceptance criteria.
              </p>
            </div>
            <div className="grid gap-2 border-b border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-3">
              <div>
                <p className="font-medium text-slate-950">Source steps</p>
                <p className="mt-1 text-slate-600">
                  {productDeliveryDraft.draft.sourceStepIds.length}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">BRD sections</p>
                <p className="mt-1 text-slate-600">
                  {productDeliveryDraft.draft.brd.sections.length}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">SRS requirements</p>
                <p className="mt-1 text-slate-600">
                  {
                    productDeliveryDraft.draft.srs.functionalRequirements
                      .length
                  }
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">User stories</p>
                <p className="mt-1 text-slate-600">
                  {productDeliveryDraft.draft.userStorySet.stories.length}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">
                  Acceptance criteria
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
                  Assumptions / Questions
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
                Preview: Structured BRD draft
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Generated at {brdPreview.timestamp} via {brdPreview.sourceSkillId}.
                Preview only; not saved to an Artifact Graph.
              </p>
            </div>
            <div className="grid gap-2 border-b border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-4">
              <div>
                <p className="font-medium text-slate-950">Requirements</p>
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
                <p className="font-medium text-slate-950">Process refs</p>
                <p className="mt-1 text-slate-600">
                  {brdPreview.brd.processReferences.length}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">Quality issues</p>
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
                Preview: Structured SRS draft
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Generated at {srsPreview.timestamp} via {srsPreview.sourceSkillId}.
                Preview only; not saved to an Artifact Graph.
              </p>
            </div>
            <div className="grid gap-2 border-b border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-4">
              <div>
                <p className="font-medium text-slate-950">Functional reqs</p>
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
                <p className="font-medium text-slate-950">Systems</p>
                <p className="mt-1 text-slate-600">
                  {srsPreview.srs.systemsComponents.length}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">Quality issues</p>
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
                Preview: Structured user stories draft
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Generated at {userStoryPreview.timestamp} via{" "}
                {userStoryPreview.sourceSkillId}. Preview only; not saved to an
                Artifact Graph.
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
                <p className="font-medium text-slate-950">Source steps</p>
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
                <p className="font-medium text-slate-950">Quality issues</p>
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
                Preview: Structured acceptance criteria draft
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Generated at {acceptanceCriteriaPreview.timestamp} via{" "}
                {acceptanceCriteriaPreview.sourceSkillId}. Preview only; not
                saved to an Artifact Graph.
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
                <p className="font-medium text-slate-950">Source stories</p>
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
                <p className="font-medium text-slate-950">Source steps</p>
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
                <p className="font-medium text-slate-950">Quality issues</p>
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
                Preview: Product scope review and MVP slicing
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Generated at {productScopeReviewPreview.timestamp} via{" "}
                {productScopeReviewPreview.sourceSkillId}. Preview only; not
                saved to an Artifact Graph.
              </p>
            </div>
            <div className="grid gap-2 border-b border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-4">
              <div>
                <p className="font-medium text-slate-950">In scope</p>
                <p className="mt-1 text-slate-600">
                  {productScopeReviewPreview.scopeReview.inScope.length}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">Out of scope</p>
                <p className="mt-1 text-slate-600">
                  {productScopeReviewPreview.scopeReview.outOfScope.length}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">MVP items</p>
                <p className="mt-1 text-slate-600">
                  {
                    productScopeReviewPreview.scopeReview.mvpSlice.items
                      .length
                  }
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">Risks</p>
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
                Preview: Requirement QA and trace coverage
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Generated at {requirementQAPreview.timestamp} via{" "}
                {requirementQAPreview.sourceSkillId}. Findings are draft
                recommendations only; nothing is applied or saved.
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
                <p className="font-medium text-slate-950">Draft patches</p>
                <p className="mt-1 text-slate-600">
                  {requirementQAPreview.requirementQA.recommendations.length}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">BRD gaps</p>
                <p className="mt-1 text-slate-600">
                  {
                    requirementQAPreview.requirementQA.coverage
                      .uncoveredBrdRequirementIds.length
                  }
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-950">SRS/story gaps</p>
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
      </section>

      <div className="border-t border-slate-200 p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)]">
          <div>
            <p className="text-sm font-medium uppercase text-slate-500">
              AI Development Handoff Pack
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">
              Package reviewed requirements for development
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Send this package to your development team or use it with Codex,
              Claude Code, Cursor. It turns the Process Task Register and
              reviewed Product Delivery artifacts into a previewed handoff
              before ZIP download.
            </p>
            <label className="mt-4 block">
              <span className="text-sm font-medium text-slate-700">
                Optional project context
              </span>
              <textarea
                className="mt-2 min-h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800"
                onChange={(event) => setProjectContext(event.target.value)}
                placeholder="Example: Target repo, frontend/backend stack, coding constraints, team conventions..."
                value={projectContext}
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={previewAICodingPack}
                type="button"
              >
                Preview PTR Handoff Pack
              </button>
              <button
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                disabled={isGeneratingProductAICodingPack}
                onClick={() => void previewProductDeliveryAICodingPack()}
                type="button"
              >
                {isGeneratingProductAICodingPack
                  ? "Generating handoff pack..."
                  : "Preview Product Delivery Handoff Pack"}
              </button>
              <button
                className="btn btn-primary"
                disabled={isDownloadingAICodingPack}
                onClick={downloadAICodingPackZip}
                type="button"
              >
                {isDownloadingAICodingPack
                  ? "Dang tao handoff pack..."
                  : "Download Handoff Pack ZIP"}
              </button>
            </div>
          </div>

          <div className="rounded border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-950">
              Included files
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
              Advanced details for technical users: AGENTS.md, CLAUDE.md,
              cursor rules, and spec.json are kept in the package. Product
              Delivery generation uses `user-stories-to-ai-coding-pack` through
              `/api/ai/run-skill`, with mock/local fallback and schema
              validation.
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
                Generated at {aiCodingPack.timestamp}
                {aiCodingPack.sourceSkillId ? ` via ${aiCodingPack.sourceSkillId}` : ""}.
                Step, story, and requirement refs are preserved where available.
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
    </section>
  );
}

