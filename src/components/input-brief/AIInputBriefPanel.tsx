"use client";

import { useEffect, useMemo, useState } from "react";
import { SessionFrame } from "@/components/layout/SessionFrame";
import {
  confirmRealAICallIfNeeded,
  logAICallAudit
} from "@/lib/ai/ai-governance";
import { saveAuditLogEntry } from "@/lib/audit/audit-log";
import type { StructuredInputBrief } from "@/lib/ai/ai-input-brief-types";
import {
  createIntakeFileMetadata,
  extractDraftTasksFromExcel,
  extractTextFromDocx,
  extractTextFromPdf,
  generateDraftProcessTaskRegister,
  parseStructuredProcessBriefFromForm,
  validateDraftProcessTaskRegister,
  type DocxExtractionResult,
  type DraftPTRGenerationResult,
  type ExcelExtractionPreview,
  type IntakeFileMetadata,
  type PdfExtractionResult
} from "@/lib/ai-intake";
import type { StructuredProcessBrief } from "@/lib/ai-intake";
import { getLocale, t, type Locale } from "@/lib/i18n";
import type { ProcessTask } from "@/lib/models/process-task";
import {
  createSourceCoverageAdvisory,
  formatQualityGateErrorsVi,
  formatQualityGateWarningsVi,
  runBriefQualityGate,
  runDraftPtrGateV1,
  runDraftProcessTaskRegisterQualityGate
} from "@/lib/quality-engine";
import type {
  GateVerdictStatus,
  SourceCoverageAdvisoryStatus
} from "@/lib/quality-engine";

const BRIEF_STORAGE_KEY = "process-blueprint-ai-workbench:input-brief";
const FILE_METADATA_STORAGE_KEY =
  "process-blueprint-ai-workbench:input-brief-file-metadata";
const TASKS_STORAGE_KEY = "process-blueprint-ai-workbench:process-tasks";
const PROCESS_TASKS_EVENT = "process-blueprint-process-tasks-change";
const D01_GENERATED_STATUS_KEY =
  "process-blueprint-ai-workbench:generated-d01-bpmn-status";
const D02_GENERATED_STATUS_KEY =
  "process-blueprint-ai-workbench:generated-d02-service-blueprint-status";
const ARTIFACT_STATUS_EVENT = "process-blueprint-artifact-status-change";
const LOCALE_EVENT = "process-blueprint-locale-change";
const INPUT_BRIEF_TO_PTR_SKILL_ID = "input-brief-to-ptr";
const FILE_TO_PTR_DRAFT_SKILL_ID = "file-to-ptr-draft";
const CHAT_TO_PTR_DRAFT_SKILL_ID = "chat-to-ptr-draft";

const fileStatusStyles: Record<IntakeFileMetadata["status"], string> = {
  selected: "border-slate-200 bg-slate-50 text-slate-700",
  "pending-extraction": "border-amber-200 bg-amber-50 text-amber-800",
  extracted: "border-emerald-200 bg-emerald-50 text-emerald-800",
  unsupported: "border-red-200 bg-red-50 text-red-800",
  failed: "border-red-200 bg-red-50 text-red-800"
};

const gateVerdictStyles: Record<GateVerdictStatus, string> = {
  pass: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  fail: "border-red-200 bg-red-50 text-red-800",
  "not-applicable": "border-slate-200 bg-slate-50 text-slate-700"
};

const sourceCoverageStyles: Record<SourceCoverageAdvisoryStatus, string> = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-800",
  review: "border-amber-200 bg-amber-50 text-amber-800",
  missing: "border-slate-200 bg-slate-50 text-slate-700"
};

const previewLabels = {
  vi: {
    sourceSummary: "Tóm tắt nguồn",
    confidence: "Độ tin cậy",
    assumptions: "Giả định",
    openQuestions: "Câu hỏi cần làm rõ",
    qualityGateWarnings: "Canh bao Quality Gate",
    qualityIssues: "Van de chat luong",
    gateVerdict: "Draft PTR Gate",
    gateBlockers: "Blockers",
    gateWarnings: "Warnings",
    gateAdvanced: "Advanced gate details",
    gateScore: "Score",
    gateNoIssues: "No blockers or warnings.",
    sourceCoverage: "Source coverage",
    sourceCoverageNonBlocking: "Advisory only - does not block Apply",
    sourceCoverageMode: "Source mode",
    sourceCoverageRows: "Rows with sourceRef",
    sourceCoverageWarnings: "Coverage warnings",
    sourceCoverageNoWarnings: "No source coverage warnings.",
    replaceCurrentPtr: "Thay PTR hiện tại",
    appendToCurrentPtr: "Thêm vào PTR hiện tại",
    cancelDraft: "Hủy draft",
    stepId: "Mã bước",
    bpmnType: "Loại BPMN",
    actor: "Actor",
    system: "Hệ thống",
    taskName: "Tên task",
    input: "Input",
    output: "Output",
    defaultNextStep: "Bước tiếp theo",
    reviewStatus: "Trạng thái review"
  },
  en: {
    sourceSummary: "Source summary",
    confidence: "Confidence",
    assumptions: "Assumptions",
    openQuestions: "Open questions",
    qualityGateWarnings: "Quality Gate warnings",
    qualityIssues: "Quality issues",
    gateVerdict: "Draft PTR Gate",
    gateBlockers: "Blockers",
    gateWarnings: "Warnings",
    gateAdvanced: "Advanced gate details",
    gateScore: "Score",
    gateNoIssues: "No blockers or warnings.",
    sourceCoverage: "Source coverage",
    sourceCoverageNonBlocking: "Advisory only - does not block Apply",
    sourceCoverageMode: "Source mode",
    sourceCoverageRows: "Rows with sourceRef",
    sourceCoverageWarnings: "Coverage warnings",
    sourceCoverageNoWarnings: "No source coverage warnings.",
    replaceCurrentPtr: "Replace current PTR",
    appendToCurrentPtr: "Append to current PTR",
    cancelDraft: "Cancel Draft",
    stepId: "Step ID",
    bpmnType: "BPMN Type",
    actor: "Actor",
    system: "System",
    taskName: "Task Name",
    input: "Input",
    output: "Output",
    defaultNextStep: "Default Next Step",
    reviewStatus: "Review Status"
  }
} satisfies Record<Locale, Record<string, string>>;

const inputBriefUiText = {
  vi: {
    generateWithAI: "Tạo bằng AI",
    generating: "Đang tạo...",
    manualInput: "Nhập thủ công",
    importFile: "Nhập file",
    voiceInputComingSoon: "Nhập giọng nói - sắp có",
    relatedSystems: "Hệ thống liên quan",
    relatedSystemsHelper: "Kênh khách hàng, hệ thống nội bộ và bên thứ ba được nhập riêng.",
    dataDocuments: "Dữ liệu và tài liệu",
    dataDocumentsHelper: "Giữ dữ liệu, tài liệu, biểu mẫu và hồ sơ tách khỏi hệ thống.",
    voiceComingSoon: "Tính năng nhập giọng nói sắp có. MVP1 chưa ghi âm, upload hoặc xử lý bên ngoài.",
    fileIntake: "Nhập file",
    fileIntakeHelper: "File được xử lý local để tạo draft PTR preview trước khi Apply.",
    clearFiles: "Xóa file",
    selectLocalFiles: "Chọn file local",
    reselectAfterRefresh: "Vui lòng chọn lại file sau khi refresh trình duyệt để thực hiện trích xuất.",
    fileName: "Tên file",
    type: "Loại",
    size: "Dung lượng",
    lastModified: "Sửa lần cuối",
    status: "Trạng thái",
    action: "Thao tác",
    extract: "Trích xuất",
    generateDraftPtr: "Tạo Draft PTR",
    unsupportedImage: "OCR/Image chưa hỗ trợ trong MVP1",
    unsupportedFile: "Loại file chưa hỗ trợ",
    remove: "Xóa",
    unsupportedSummary: "Phát hiện file chưa hỗ trợ. MVP1 hỗ trợ .xlsx, .docx và .pdf. Voice/OCR/Image chưa được hỗ trợ.",
    other: "Khác",
    realAIMode: "Real AI qua provider",
    mockMode: "Local/mock, không gọi provider bên ngoài",
    checkingAIMode: "Đang kiểm tra chế độ AI...",
    cloudWarning: "Dữ liệu có thể được xử lý trên cloud theo cấu hình server.",
    aiCancelled: "Đã hủy gọi Real AI. Bản nháp chưa được tạo.",
    realAIRunning: "Real AI: đang gọi provider qua route server-side...",
    mockRunning: "Local/mock: đang tạo bản nháp, không gọi provider bên ngoài.",
    mockDone: "Local/mock: đã tạo bản nháp PTR. Không gọi provider bên ngoài.",
    draftBlocked: "Không thể tạo bản nháp PTR",
    draftRows: "dòng"
  },
  en: {
    generateWithAI: "Generate with AI",
    generating: "Generating...",
    manualInput: "Manual Input",
    importFile: "Import File",
    voiceInputComingSoon: "Voice Input - Coming soon",
    relatedSystems: "Related systems",
    relatedSystemsHelper: "Customer-facing, internal, and third-party systems are captured separately.",
    dataDocuments: "Data and documents",
    dataDocumentsHelper: "Keep data, documents, forms, and records separate from systems.",
    voiceComingSoon: "Voice Input is coming soon. No recording, upload, or external processing is implemented in this step.",
    fileIntake: "File Intake",
    fileIntakeHelper: "Files are processed locally for Draft PTR preview before Apply.",
    supportedFormatsTitle: "Supported formats",
    supportedFormats: "Text-based PDF, DOCX, and XLSX are supported for local Draft PTR generation.",
    comingSoonFormats: "Image/OCR/Voice intake is coming soon.",
    nextStep: "Next step",
    clearFiles: "Clear files",
    selectLocalFiles: "Select local files",
    reselectAfterRefresh: "Please select the file again after browser refresh to run extraction.",
    fileName: "File name",
    type: "Type",
    size: "Size",
    lastModified: "Last modified",
    status: "Status",
    action: "Action",
    extract: "Extract",
    generateDraftPtr: "Generate Draft PTR",
    chatNotes: "Chat / notes",
    chatNotesHelper: "Paste chat, workshop notes, or manual text to generate a Draft PTR preview.",
    chatNotesPlaceholder: "Example: Customer submits account opening request. RM checks documents. Ops creates CIF...",
    generateFromChatNotes: "Generate Draft PTR from notes",
    unsupportedImage: "OCR/Image unsupported in MVP1",
    unsupportedFile: "Unsupported file type",
    remove: "Remove",
    unsupportedSummary: "Unsupported file type detected. Supported formats are .xlsx, .docx, and .pdf. Voice/OCR/Image extraction is not supported yet.",
    other: "Other",
    realAIMode: "Real AI via provider",
    mockMode: "Local/mock, no external provider call",
    checkingAIMode: "Checking AI mode...",
    cloudWarning: "Data may be processed in the cloud according to server configuration.",
    aiCancelled: "Real AI call cancelled. No draft was created.",
    realAIRunning: "Real AI: calling the provider through the server-side route...",
    mockRunning: "Local/mock: generating a draft with no external provider call.",
    mockDone: "Local/mock: generated Draft PTR. No external provider call.",
    draftBlocked: "Cannot generate Draft PTR",
    draftRows: "row(s)"
  }
} satisfies Record<Locale, Record<string, string>>;

type InputBriefFormState = {
  processInfo: string;
  businessObjective: string;
  scopeBoundary: string;
  actors: string;
  customerFacingSystems: string;
  internalSystems: string;
  thirdPartySystems: string;
  dataDocuments: string;
  happyPath?: string;
  exceptions?: string;
  slaControl?: string;
  desiredOutputs?: string;
};

type BriefField = {
  key: keyof Pick<
    InputBriefFormState,
    | "processInfo"
    | "businessObjective"
    | "scopeBoundary"
    | "actors"
    | "customerFacingSystems"
    | "internalSystems"
    | "thirdPartySystems"
    | "dataDocuments"
  >;
  label: Record<Locale, string>;
  helper: Record<Locale, string>;
  placeholder: Record<Locale, string>;
  suggestions: string[];
  rows: number;
};

type BriefMode = "manual" | "import-file" | "voice";

const emptyBrief: InputBriefFormState = {
  processInfo: "",
  businessObjective: "",
  scopeBoundary: "",
  actors: "",
  customerFacingSystems: "",
  internalSystems: "",
  thirdPartySystems: "",
  dataDocuments: "",
  happyPath: "",
  exceptions: "",
  slaControl: "",
  desiredOutputs: ""
};

const briefFields: BriefField[] = [
  {
    key: "processInfo",
    label: { vi: "Thông tin quy trình", en: "Process information" },
    helper: {
      vi: "Chọn hoặc nhập tên/mô tả ngắn về quy trình cần xây dựng.",
      en: "Select or enter the process name or a short process description."
    },
    placeholder: {
      vi: "Ví dụ: Mở tài khoản doanh nghiệp, phê duyệt khoản vay SME online...",
      en: "Example: Corporate account opening, SME online loan approval..."
    },
    suggestions: [
      "Mở tài khoản",
      "Đăng ký vay",
      "Bổ sung hồ sơ",
      "Phê duyệt tín dụng",
      "Giải ngân",
      "KYC / onboarding",
      "Dịch vụ sau bán",
      "Khác"
    ],
    rows: 3
  },
  {
    key: "businessObjective",
    label: { vi: "Mục tiêu nghiệp vụ", en: "Business objective" },
    helper: {
      vi: "Chọn hoặc nhập mục tiêu cần đạt được, kết quả kinh doanh hoặc trải nghiệm mong muốn.",
      en: "Select or enter the desired business outcome, process goal, or experience."
    },
    placeholder: {
      vi: "Ví dụ: giảm thời gian xử lý, tăng tỷ lệ hoàn tất hồ sơ, cải thiện trải nghiệm khách hàng...",
      en: "Example: reduce handling time, increase completed applications, improve customer experience..."
    },
    suggestions: [
      "Tự động hóa quy trình",
      "Giảm TAT",
      "Tăng trải nghiệm khách hàng",
      "Giảm lỗi vận hành",
      "Tăng kiểm soát rủi ro",
      "Chuẩn hóa quy trình",
      "Số hóa hồ sơ"
    ],
    rows: 4
  },
  {
    key: "scopeBoundary",
    label: { vi: "Phạm vi, bắt đầu và kết thúc", en: "Scope, start and end" },
    helper: {
      vi: "Chọn hoặc mô tả quy trình bắt đầu từ đâu, kết thúc khi nào, và phạm vi trong/ngoài.",
      en: "Select or describe where the process starts, where it ends, and what is in or out of scope."
    },
    placeholder: {
      vi: "Ví dụ: Từ lúc khách hàng bắt đầu yêu cầu đến khi nhận kết quả; không bao gồm hậu kiểm.",
      en: "Example: From customer request initiation to final result; excludes post-review."
    },
    suggestions: [
      "Từ lúc khách hàng bắt đầu yêu cầu đến khi nhận kết quả",
      "Từ lúc RM tạo yêu cầu đến khi hoàn tất xử lý",
      "Từ lúc hệ thống nhận hồ sơ đến khi phê duyệt/từ chối",
      "End-to-end toàn bộ hành trình",
      "Chỉ một sub-process"
    ],
    rows: 4
  },
  {
    key: "actors",
    label: { vi: "Người tham gia", en: "Participants" },
    helper: {
      vi: "Chọn hoặc nhập các vai trò, phòng ban, hệ thống hoặc bên liên quan tham gia quy trình.",
      en: "Select or enter roles, departments, systems, or stakeholders in the process."
    },
    placeholder: {
      vi: "Ví dụ: Khách hàng, RM, DVKH, Ops Support, Credit Approver...",
      en: "Example: Customer, RM, Customer Service, Ops Support, Credit Approver..."
    },
    suggestions: [
      "Khách hàng",
      "RM",
      "DVKH",
      "Ops Support",
      "Credit Officer",
      "Credit Approver",
      "System",
      "Third-party provider",
      "Admin"
    ],
    rows: 4
  },
  {
    key: "customerFacingSystems",
    label: {
      vi: "Kênh/hệ thống khách hàng sử dụng",
      en: "Customer-facing systems/channels"
    },
    helper: {
      vi: "Các kênh hoặc hệ thống khách hàng nhìn thấy hoặc tương tác trực tiếp.",
      en: "Channels or systems customers see or interact with directly."
    },
    placeholder: {
      vi: "Ví dụ: Mobile App, Website, Efast / Portal, Email, SMS...",
      en: "Example: Mobile App, Website, Efast / Portal, Email, SMS..."
    },
    suggestions: [
      "Website",
      "Mobile App",
      "Internet Banking",
      "Efast / Portal",
      "Email",
      "SMS",
      "Call Center",
      "Branch"
    ],
    rows: 3
  },
  {
    key: "internalSystems",
    label: { vi: "Hệ thống nội bộ", en: "Internal systems" },
    helper: {
      vi: "Các hệ thống nội bộ hỗ trợ xử lý, kiểm tra, lưu trữ hoặc workflow.",
      en: "Internal systems used for processing, validation, storage, or workflow."
    },
    placeholder: {
      vi: "Ví dụ: CRM, Core Banking, LOS, BPM/Workflow, ECM...",
      en: "Example: CRM, Core Banking, LOS, BPM/Workflow, ECM..."
    },
    suggestions: [
      "CRM",
      "Core Banking",
      "LOS",
      "BPM/Workflow",
      "ECM",
      "DMS",
      "S3 Bucket",
      "Notification Service"
    ],
    rows: 3
  },
  {
    key: "thirdPartySystems",
    label: {
      vi: "Hệ thống/nhà cung cấp bên thứ ba",
      en: "Third-party systems/providers"
    },
    helper: {
      vi: "Các bên ngoài tổ chức tham gia xác minh, dữ liệu, thanh toán hoặc tích hợp.",
      en: "External providers used for verification, data, payment, or integrations."
    },
    placeholder: {
      vi: "Ví dụ: CIC, eKYC provider, Tax authority, Business registry...",
      en: "Example: CIC, eKYC provider, Tax authority, Business registry..."
    },
    suggestions: [
      "CIC",
      "Blacklist provider",
      "eKYC provider",
      "Tax authority",
      "Business registry",
      "Payment gateway"
    ],
    rows: 3
  },
  {
    key: "dataDocuments",
    label: { vi: "Dữ liệu / hồ sơ / chứng từ", en: "Data / documents / records" },
    helper: {
      vi: "Các dữ liệu, hồ sơ, biểu mẫu, chứng từ hoặc kết quả xử lý dùng trong quy trình.",
      en: "Data, documents, forms, records, or process outputs used in the process."
    },
    placeholder: {
      vi: "Ví dụ: Hồ sơ khách hàng, CCCD/Hộ chiếu, báo cáo tài chính, kết quả CIC...",
      en: "Example: customer file, ID/passport, financial statement, CIC result..."
    },
    suggestions: [
      "Hồ sơ khách hàng",
      "Giấy đăng ký kinh doanh",
      "CCCD/Hộ chiếu",
      "Báo cáo tài chính",
      "Sao kê tài khoản",
      "Hồ sơ vay",
      "Kết quả CIC",
      "Thông báo kết quả"
    ],
    rows: 3
  }
];

const primaryBriefFields = briefFields.slice(0, 4);
const systemBriefFields = briefFields.slice(4, 7);
const dataDocumentBriefFields = briefFields.slice(7);
const OTHER_OPTION_LABEL = "Other";
const otherOptionLabels = new Set(["Khác", "Other", "Khác / Other"]);

function markGeneratedArtifactsStale() {
  window.localStorage.setItem(D01_GENERATED_STATUS_KEY, "stale");
  window.localStorage.setItem(D02_GENERATED_STATUS_KEY, "stale");
  window.dispatchEvent(new Event(ARTIFACT_STATUS_EVENT));
}

function loadCurrentProcessTasks() {
  const savedTasks = window.localStorage.getItem(TASKS_STORAGE_KEY);

  if (!savedTasks) {
    return [];
  }

  try {
    const parsedTasks = JSON.parse(savedTasks);
    return Array.isArray(parsedTasks) ? (parsedTasks as ProcessTask[]) : [];
  } catch {
    return [];
  }
}

function avoidStepIdConflicts(
  currentTasks: ProcessTask[],
  tasksToAppend: ProcessTask[]
) {
  const currentStepIds = new Set(currentTasks.map((task) => task.stepId));
  const hasConflict = tasksToAppend.some((task) => currentStepIds.has(task.stepId));

  if (!hasConflict) {
    return tasksToAppend;
  }

  const suffix = `A${Date.now()}`;
  const stepIdMap = new Map(
    tasksToAppend.map((task) => [task.stepId, `${task.stepId}-${suffix}`])
  );

  return tasksToAppend.map((task) => ({
    ...task,
    id: `${task.id}-${suffix}`,
    stepId: stepIdMap.get(task.stepId) ?? task.stepId,
    defaultNextStep: task.defaultNextStep
      ? stepIdMap.get(task.defaultNextStep) ?? task.defaultNextStep
      : null,
    yesNextStep: task.yesNextStep
      ? stepIdMap.get(task.yesNextStep) ?? task.yesNextStep
      : null,
    noNextStep: task.noNextStep
      ? stepIdMap.get(task.noNextStep) ?? task.noNextStep
      : null
  }));
}

function normalizeSavedBrief(value: unknown): InputBriefFormState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyBrief;
  }

  const savedBrief = value as Partial<
    InputBriefFormState &
      StructuredInputBrief & {
        scope?: string;
        startEnd?: string;
        relatedSystems?: string;
        systems?: string;
        processName?: string;
        startEvent?: string;
        endEvent?: string;
      }
  >;
  const startEnd =
    savedBrief.startEnd ??
    [savedBrief.startEvent, savedBrief.endEvent].filter(Boolean).join("\n");
  const relatedSystems = savedBrief.relatedSystems ?? savedBrief.systems ?? "";

  return {
    ...emptyBrief,
    ...savedBrief,
    processInfo: savedBrief.processInfo ?? savedBrief.processName ?? "",
    scopeBoundary:
      savedBrief.scopeBoundary ??
      [savedBrief.scope, startEnd].filter(Boolean).join("\n"),
    customerFacingSystems: savedBrief.customerFacingSystems ?? "",
    internalSystems: savedBrief.internalSystems ?? relatedSystems,
    thirdPartySystems: savedBrief.thirdPartySystems ?? "",
    dataDocuments: savedBrief.dataDocuments ?? ""
  };
}

function formatFileSize(fileSize: number) {
  if (fileSize < 1024) {
    return `${fileSize} B`;
  }

  if (fileSize < 1024 * 1024) {
    return `${(fileSize / 1024).toFixed(1)} KB`;
  }

  return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
}

function formatLastModified(lastModified: number) {
  return new Date(lastModified).toLocaleString();
}

function splitBriefLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isImageIntakeFile(file: Pick<IntakeFileMetadata, "fileName" | "fileType">) {
  const fileName = file.fileName.toLowerCase();
  const fileType = file.fileType.toLowerCase();

  return (
    fileType.startsWith("image/") ||
    [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".tiff"].some((extension) =>
      fileName.endsWith(extension)
    )
  );
}

function getFileDraftActionLabel(file: IntakeFileMetadata, generateLabel: string) {
  if (file.status === "unsupported") {
    return isImageIntakeFile(file)
      ? "Image/OCR intake is coming soon."
      : "This file type is not supported yet.";
  }

  if (file.status === "pending-extraction") {
    return "Processing locally...";
  }

  if (file.status === "extracted") {
    return "Draft PTR preview is ready for review.";
  }

  if (file.status === "failed") {
    return "Processing failed. Clear the file or choose another file.";
  }

  return `${generateLabel} to create a reviewable preview.`;
}

export function AIInputBriefPanel() {
  const [brief, setBrief] = useState<InputBriefFormState>(emptyBrief);
  const [briefMode, setBriefMode] = useState<BriefMode>("manual");
  const [chatNotes, setChatNotes] = useState("");
  const [intakeFiles, setIntakeFiles] = useState<IntakeFileMetadata[]>([]);
  const [selectedFileObjects, setSelectedFileObjects] = useState<File[]>([]);
  const [excelPreview, setExcelPreview] = useState<ExcelExtractionPreview | null>(
    null
  );
  const [docxExtraction, setDocxExtraction] =
    useState<DocxExtractionResult | null>(null);
  const [pdfExtraction, setPdfExtraction] = useState<PdfExtractionResult | null>(
    null
  );
  const [draftTasks, setDraftTasks] = useState<ProcessTask[]>([]);
  const [draftMeta, setDraftMeta] = useState<DraftPTRGenerationResult | null>(null);
  const [message, setMessage] = useState("");
  const [blockingErrors, setBlockingErrors] = useState<string[]>([]);
  const [locale, setActiveLocale] = useState<Locale>("vi");
  const [realAIEnabled, setRealAIEnabled] = useState(false);
  const [aiProvider, setAiProvider] = useState("mock");
  const [aiModeLoaded, setAiModeLoaded] = useState(false);
  const [isGeneratingWithAI, setIsGeneratingWithAI] = useState(false);

  useEffect(() => {
    setActiveLocale(getLocale());

    function handleLocaleChange(event: Event) {
      const localeDetail = (event as CustomEvent<{ locale?: Locale }>).detail;

      if (localeDetail?.locale) {
        setActiveLocale(localeDetail.locale);
      }
    }

    window.addEventListener(LOCALE_EVENT, handleLocaleChange);
    return () => window.removeEventListener(LOCALE_EVENT, handleLocaleChange);
  }, []);

  useEffect(() => {
    const savedBrief = window.localStorage.getItem(BRIEF_STORAGE_KEY);

    if (!savedBrief) {
      return;
    }

    try {
      setBrief(normalizeSavedBrief(JSON.parse(savedBrief)));
    } catch {
      setMessage("Brief đã lưu không hợp lệ. Đang dùng form trống.");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(BRIEF_STORAGE_KEY, JSON.stringify(brief));
  }, [brief]);

  useEffect(() => {
    clearDraftPreview();
  }, [brief, chatNotes]);

  useEffect(() => {
    const savedFileMetadata = window.localStorage.getItem(
      FILE_METADATA_STORAGE_KEY
    );

    if (!savedFileMetadata) {
      return;
    }

    try {
      const parsedFileMetadata = JSON.parse(savedFileMetadata);

      if (Array.isArray(parsedFileMetadata)) {
        setIntakeFiles(parsedFileMetadata as IntakeFileMetadata[]);
      }
    } catch {
      setIntakeFiles([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      FILE_METADATA_STORAGE_KEY,
      JSON.stringify(intakeFiles)
    );
  }, [intakeFiles]);

  useEffect(() => {
    let active = true;

    async function loadAIMode() {
      try {
        const response = await fetch("/api/ai/run-skill", {
          method: "GET"
        });
        const data = (await response.json()) as {
          realAIEnabled?: boolean;
          provider?: string;
        };

        if (active) {
          setRealAIEnabled(data.realAIEnabled === true);
          setAiProvider(data.provider ?? "mock");
        }
      } catch {
        if (active) {
          setRealAIEnabled(false);
          setAiProvider("mock");
        }
      } finally {
        if (active) {
          setAiModeLoaded(true);
        }
      }
    }

    loadAIMode();

    return () => {
      active = false;
    };
  }, []);

  const filledFieldCount = useMemo(
    () =>
      [
        brief.processInfo,
        brief.businessObjective,
        brief.scopeBoundary,
        brief.actors,
        [
          brief.customerFacingSystems,
          brief.internalSystems,
          brief.thirdPartySystems,
          brief.dataDocuments
        ]
          .filter((value) => value.trim())
          .join("\n")
      ].filter((value) => value.trim()).length,
    [brief]
  );

  function getFieldOptions(field: BriefField) {
    return [
      ...field.suggestions.filter((suggestion) => !otherOptionLabels.has(suggestion)),
      OTHER_OPTION_LABEL
    ];
  }

  function getOptionDisplayLabel(option: string) {
    return option === OTHER_OPTION_LABEL ? inputBriefUiText[locale].other : option;
  }

  function getFieldSelection(field: BriefField) {
    const options = getFieldOptions(field);
    const optionSet = new Set(options);
    const currentValues = splitBriefLines(brief[field.key]);
    const otherText = currentValues
      .filter((entry) => !optionSet.has(entry) && !otherOptionLabels.has(entry))
      .join("\n");
    const selectedOptions = options.filter((option) => {
      if (option === OTHER_OPTION_LABEL) {
        return (
          currentValues.some((entry) => otherOptionLabels.has(entry)) ||
          otherText.trim().length > 0
        );
      }

      return currentValues.includes(option);
    });

    return {
      options,
      otherText,
      selectedOptions
    };
  }

  function saveFieldSelection(
    key: BriefField["key"],
    selectedOptions: string[],
    otherText: string
  ) {
    const nextValues = [
      ...selectedOptions.filter((option) => option !== OTHER_OPTION_LABEL),
      ...(selectedOptions.includes(OTHER_OPTION_LABEL) && !otherText.trim()
        ? [OTHER_OPTION_LABEL]
        : []),
      ...splitBriefLines(otherText)
    ];

    setBrief((currentBrief) => ({
      ...currentBrief,
      [key]: nextValues.join("\n")
    }));
    setMessage("Brief đã được lưu local.");
  }

  function toggleSuggestion(field: BriefField, suggestion: string) {
    const { otherText, selectedOptions } = getFieldSelection(field);
    const isSelected = selectedOptions.includes(suggestion);
    const nextSelectedOptions = isSelected
      ? selectedOptions.filter((option) => option !== suggestion)
      : [...selectedOptions, suggestion];

    saveFieldSelection(
      field.key,
      nextSelectedOptions,
      suggestion === OTHER_OPTION_LABEL && isSelected ? "" : otherText
    );
  }

  function updateOtherText(field: BriefField, value: string) {
    const { selectedOptions } = getFieldSelection(field);
    const nextSelectedOptions = selectedOptions.includes(OTHER_OPTION_LABEL)
      ? selectedOptions
      : [...selectedOptions, OTHER_OPTION_LABEL];

    saveFieldSelection(field.key, nextSelectedOptions, value);
  }

  function saveBrief() {
    window.localStorage.setItem(BRIEF_STORAGE_KEY, JSON.stringify(brief));
    setMessage("Brief đã được lưu local.");
  }

  function clearDraftPreview() {
    setDraftTasks([]);
    setDraftMeta(null);
    setBlockingErrors([]);
  }

  function clearFileExtractionPreviews() {
    setExcelPreview(null);
    setDocxExtraction(null);
    setPdfExtraction(null);
  }

  function handleFileSelection(files: FileList | null) {
    if (!files || files.length === 0) {
      clearSelectedFiles();
      return;
    }

    clearFileExtractionPreviews();
    clearDraftPreview();
    const nextFiles = Array.from(files);
    const nextFileMetadata = nextFiles.map(createIntakeFileMetadata);
    const unsupportedCount = nextFileMetadata.filter(
      (file) => file.status === "unsupported"
    ).length;
    const unsupportedImageCount = nextFileMetadata.filter(
      (file) => file.status === "unsupported" && isImageIntakeFile(file)
    ).length;

    setSelectedFileObjects(nextFiles);
    setIntakeFiles(nextFileMetadata);
    setMessage(
      unsupportedImageCount > 0
        ? `${unsupportedImageCount} image file không được hỗ trợ. OCR/Image extraction chưa có trong MVP1; không upload file.`
        : unsupportedCount > 0
        ? `${unsupportedCount} file không được hỗ trợ. Chỉ hỗ trợ .xlsx, .docx, .pdf. Không upload file.`
        : `Đã chọn ${nextFileMetadata.length} file. File chỉ xử lý local trong browser, không upload.`
    );
  }

  function clearSelectedFiles() {
    setSelectedFileObjects([]);
    setIntakeFiles([]);
    clearFileExtractionPreviews();
    clearDraftPreview();
    window.localStorage.removeItem(FILE_METADATA_STORAGE_KEY);
    setMessage("Da xoa file intake metadata local.");
  }

  function removeSelectedFile(fileToRemove: IntakeFileMetadata) {
    setSelectedFileObjects((currentFiles) =>
      currentFiles.filter(
        (file) =>
          !(
            file.name === fileToRemove.fileName &&
            file.lastModified === fileToRemove.lastModified
          )
      )
    );
    setIntakeFiles((currentFiles) =>
      currentFiles.filter(
        (file) =>
          !(
            file.fileName === fileToRemove.fileName &&
            file.lastModified === fileToRemove.lastModified
          )
      )
    );
    clearFileExtractionPreviews();
    clearDraftPreview();
    setMessage("Đã remove file và clear preview/draft liên quan.");
  }

  function updateIntakeFileStatus(
    file: File,
    status: IntakeFileMetadata["status"]
  ) {
    setIntakeFiles((currentFiles) =>
      currentFiles.map((currentFile) =>
        currentFile.fileName === file.name &&
        currentFile.lastModified === file.lastModified
          ? { ...currentFile, status }
          : currentFile
      )
    );
  }

  async function extractExcelFile(file: File) {
    updateIntakeFileStatus(file, "pending-extraction");
    clearFileExtractionPreviews();
    clearDraftPreview();
    setMessage("Dang extract Excel local trong browser. Khong upload file.");

    try {
      const preview = await extractDraftTasksFromExcel(file);

      setExcelPreview(preview);
      setDraftTasks(preview.draftTasks);
      setDraftMeta({
        draftProcessTasks: preview.draftTasks,
        assumptions: [
          "Draft was extracted locally from an Excel workbook.",
          "Rows are not applied until the user confirms Apply."
        ],
        openQuestions:
          preview.warnings.length > 0
            ? preview.warnings
            : ["Review extracted rows before applying to PTR."],
        qualityIssues: preview.warnings,
        qualityGateWarnings: preview.warnings,
        sourceSummary: `Excel extraction from ${file.name}, sheet ${preview.detectedSheet}.`,
        confidence: preview.warnings.length > 0 ? "medium" : "high",
        inputLanguage: locale,
        outputLanguage: locale
      });
      updateIntakeFileStatus(file, "extracted");
      setMessage(
        `Da extract ${preview.draftTasks.length} draft task tu sheet ${preview.detectedSheet}. Hay review truoc khi Apply.`
      );
    } catch (error) {
      updateIntakeFileStatus(file, "failed");
      setExcelPreview(null);
      setDraftTasks([]);
      setDraftMeta(null);
      setMessage(
        error instanceof Error
          ? `Excel extraction failed: ${error.message}`
          : "Excel extraction failed."
      );
    }
  }

  async function generateDraftPtrFromDocxFile(file: File) {
    updateIntakeFileStatus(file, "pending-extraction");
    clearFileExtractionPreviews();
    clearDraftPreview();
    setMessage("Dang extract DOCX local va tao Draft PTR. Khong upload file.");

    try {
      const result = await extractTextFromDocx(file);

      setDocxExtraction(result);
      updateIntakeFileStatus(file, "extracted");
      await generateDraftPtrViaSkill({
        skillId: FILE_TO_PTR_DRAFT_SKILL_ID,
        payload: {
          fileName: file.name,
          fileType:
            file.type ||
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          extractedText: result.rawText,
          extractionWarnings: [
            ...result.assumptions,
            ...result.openQuestions
          ],
          detectedActors: result.detectedActors,
          detectedSystems: result.detectedSystems,
          detectedDataObjects: result.detectedDataObjects,
          detectedSteps: result.detectedSteps,
          inputLanguage: locale,
          outputLanguage: locale
        },
        sourceLabel: `DOCX ${file.name}`
      });
    } catch (error) {
      updateIntakeFileStatus(file, "failed");
      setDocxExtraction(null);
      setDraftTasks([]);
      setDraftMeta(null);
      setBlockingErrors([]);
      setMessage(
        error instanceof Error
          ? `DOCX Draft PTR generation failed: ${error.message}`
          : "DOCX Draft PTR generation failed."
      );
    }
  }

  async function extractPdfFile(file: File) {
    updateIntakeFileStatus(file, "pending-extraction");
    clearFileExtractionPreviews();
    clearDraftPreview();
    setMessage("Dang extract PDF text local trong browser. Khong upload file.");

    try {
      const result = await extractTextFromPdf(file);

      setPdfExtraction(result);
      updateIntakeFileStatus(file, "extracted");
      setMessage(`Da extract PDF local: ${result.rawText.length} ky tu.`);
    } catch (error) {
      updateIntakeFileStatus(file, "failed");
      setPdfExtraction(null);
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể trích xuất text từ file PDF này. Vui lòng paste nội dung, dùng Word/Excel, hoặc chờ tính năng OCR ở phiên bản sau."
      );
    }
  }

  async function generateDraftPtrViaSkill({
    skillId,
    payload,
    sourceLabel
  }: {
    skillId: string;
    payload: unknown;
    sourceLabel: string;
  }) {
    const generationMode = realAIEnabled ? "real-ai" : "mock";

    if (realAIEnabled && !confirmRealAICallIfNeeded(true)) {
      setMessage(uiText.aiCancelled);
      return null;
    }

    setIsGeneratingWithAI(true);
    setMessage(realAIEnabled ? uiText.realAIRunning : uiText.mockRunning);
    saveAuditLogEntry({
      action: "generate_ai_draft",
      status: "success",
      summary: `Started ${generationMode} draft generation from ${sourceLabel}.`,
      metadata: {
        mode: generationMode,
        skillId,
        realAIEnabled
      }
    });

    try {
      const routeResponse = await fetch("/api/ai/run-skill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          skillId,
          payload
        })
      });
      const data = (await routeResponse.json()) as {
        ok?: boolean;
        result?: unknown;
        error?: string;
        validationErrors?: string[];
        meta?: {
          externalApiCalled?: boolean;
          validationPassed?: boolean;
        };
      };

      if (!routeResponse.ok || !data.ok) {
        const errorMessage = [
          data.error || "AI draft generation failed.",
          ...(data.validationErrors ?? [])
        ].join(" ");

        saveAuditLogEntry({
          action: "generate_ai_draft",
          status: "failure",
          summary: errorMessage,
          metadata: {
            mode: generationMode,
            skillId,
            externalApiCalled: data.meta?.externalApiCalled ?? realAIEnabled,
            validationPassed: data.meta?.validationPassed ?? false
          }
        });
        logAICallAudit({
          skillId,
          success: false,
          errorMessage,
          realAIEnabled,
          externalApiCalled: data.meta?.externalApiCalled ?? realAIEnabled
        });
        setDraftTasks([]);
        setDraftMeta(null);
        setBlockingErrors(data.validationErrors ?? [errorMessage]);
        setMessage(errorMessage);
        return null;
      }

      const validation = validateDraftProcessTaskRegister(data.result);

      if (!validation.ok) {
        const errorMessage = `AI output rejected: ${validation.errors.join(" ")}`;

        saveAuditLogEntry({
          action: "generate_ai_draft",
          status: "failure",
          summary: errorMessage,
          metadata: {
            mode: generationMode,
            skillId,
            externalApiCalled: data.meta?.externalApiCalled ?? realAIEnabled,
            validationPassed: false
          }
        });
        logAICallAudit({
          skillId,
          success: false,
          errorMessage,
          realAIEnabled,
          externalApiCalled: data.meta?.externalApiCalled ?? realAIEnabled
        });
        setDraftTasks([]);
        setDraftMeta(null);
        setBlockingErrors(validation.errors);
        setMessage(errorMessage);
        return null;
      }

      const draftQualityGate = runDraftProcessTaskRegisterQualityGate(validation.value);

      if (!draftQualityGate.canPreview) {
        const errors = formatQualityGateErrorsVi(draftQualityGate);

        saveAuditLogEntry({
          action: "generate_ai_draft",
          status: "failure",
          summary: "Draft PTR khong dat Quality Gate.",
          metadata: {
            mode: generationMode,
            skillId,
            externalApiCalled: data.meta?.externalApiCalled ?? realAIEnabled,
            validationPassed: true
          }
        });
        logAICallAudit({
          skillId,
          success: false,
          errorMessage: "Draft PTR khong dat Quality Gate.",
          realAIEnabled,
          externalApiCalled: data.meta?.externalApiCalled ?? realAIEnabled
        });
        setDraftTasks([]);
        setDraftMeta(null);
        setBlockingErrors(errors);
        setMessage("Draft PTR khong dat Quality Gate.");
        return null;
      }

      const qualityGateWarnings = formatQualityGateWarningsVi(draftQualityGate);
      const nextDraftMeta = {
        ...validation.value,
        qualityIssues: [
          ...validation.value.qualityIssues,
          ...qualityGateWarnings
        ],
        qualityGateWarnings: [
          ...(validation.value.qualityGateWarnings ?? []),
          ...qualityGateWarnings
        ]
      };

      setBlockingErrors([]);
      setDraftTasks(nextDraftMeta.draftProcessTasks);
      setDraftMeta(nextDraftMeta);
      saveAuditLogEntry({
        action: "generate_ai_draft",
        status: "success",
        summary: `Generated schema-valid draft PTR from ${sourceLabel}.`,
        metadata: {
          mode: generationMode,
          skillId,
          externalApiCalled: data.meta?.externalApiCalled ?? realAIEnabled,
          validationPassed: true,
          draftRowCount: validation.value.draftProcessTasks.length
        }
      });
      logAICallAudit({
        skillId,
        success: true,
        realAIEnabled,
        externalApiCalled: data.meta?.externalApiCalled ?? realAIEnabled,
        extraMetadata: {
          draftRowCount: validation.value.draftProcessTasks.length
        }
      });
      setMessage(
        `${generationMode}: da tao draft PTR ${validation.value.draftProcessTasks.length} dong tu ${sourceLabel}. Hay review truoc khi Apply.`
      );
      return nextDraftMeta;
    } catch {
      logAICallAudit({
        skillId,
        success: false,
        errorMessage: "AI draft generation request failed.",
        realAIEnabled,
        externalApiCalled: false
      });
      saveAuditLogEntry({
        action: "generate_ai_draft",
        status: "failure",
        summary: "AI draft generation request failed.",
        metadata: {
          mode: generationMode,
          skillId,
          externalApiCalled: false,
          validationPassed: false
        }
      });
      setMessage("AI draft generation request failed. Draft was not applied.");
      return null;
    } finally {
      setIsGeneratingWithAI(false);
    }
  }

  async function generateDraftPtrFromPdfFile(file: File) {
    updateIntakeFileStatus(file, "pending-extraction");
    clearFileExtractionPreviews();
    clearDraftPreview();
    setMessage("Đang extract PDF local và tạo Draft PTR. Không upload file.");

    try {
      const result = await extractTextFromPdf(file);
      setPdfExtraction(result);
      updateIntakeFileStatus(file, "extracted");
      await generateDraftPtrViaSkill({
        skillId: FILE_TO_PTR_DRAFT_SKILL_ID,
        payload: {
          fileName: file.name,
          fileType: file.type || "application/pdf",
          extractedText: result.rawText,
          extractionWarnings: result.warnings,
          inputLanguage: locale,
          outputLanguage: locale
        },
        sourceLabel: `PDF ${file.name}`
      });
      return;

    } catch (error) {
      updateIntakeFileStatus(file, "failed");
      setPdfExtraction(null);
      setDraftTasks([]);
      setDraftMeta(null);
      setBlockingErrors([]);
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể trích xuất PDF để tạo Draft PTR. OCR chưa được hỗ trợ trong MVP1."
      );
    }
  }

  function generateDraftPtrFromDocxExtraction() {
    if (!docxExtraction) {
      setMessage("Chua co DOCX extraction de tao Draft PTR.");
      return;
    }

    void generateDraftPtrViaSkill({
      skillId: FILE_TO_PTR_DRAFT_SKILL_ID,
      payload: {
        fileName: "DOCX extraction",
        fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        extractedText: docxExtraction.rawText,
        extractionWarnings: [
          ...docxExtraction.assumptions,
          ...docxExtraction.openQuestions
        ],
        detectedActors: docxExtraction.detectedActors,
        detectedSystems: docxExtraction.detectedSystems,
        detectedDataObjects: docxExtraction.detectedDataObjects,
        detectedSteps: docxExtraction.detectedSteps,
        inputLanguage: locale,
        outputLanguage: locale
      },
      sourceLabel: "DOCX extraction"
    });
    return;

  }

  function generateDraftPtrFromPdfExtraction() {
    if (!pdfExtraction) {
      setMessage("Chưa có PDF extraction để tạo Draft PTR.");
      return;
    }

    const activePdfExtraction = pdfExtraction;

    void generateDraftPtrViaSkill({
      skillId: FILE_TO_PTR_DRAFT_SKILL_ID,
      payload: {
        fileName: "PDF extraction",
        fileType: "application/pdf",
        extractedText: activePdfExtraction.rawText,
        extractionWarnings: activePdfExtraction.warnings,
        inputLanguage: locale,
        outputLanguage: locale
      },
      sourceLabel: "PDF extraction"
    });
    return;

  }

  async function generateDraftPtrFromChatNotes() {
    if (chatNotes.trim().length < 20) {
      setDraftTasks([]);
      setDraftMeta(null);
      setBlockingErrors(["Notes must contain enough text to generate a Draft PTR."]);
      setMessage("Chat/notes text is too short to generate Draft PTR.");
      return;
    }

    await generateDraftPtrViaSkill({
      skillId: CHAT_TO_PTR_DRAFT_SKILL_ID,
      payload: {
        notes: chatNotes,
        userContext: [
          brief.processInfo,
          brief.businessObjective,
          brief.scopeBoundary
        ]
          .filter((value) => value.trim())
          .join("\n"),
        inputLanguage: locale,
        outputLanguage: locale
      },
      sourceLabel: "chat/notes"
    });
  }

  function generateDraftPtr() {
    const structuredBrief = parseStructuredProcessBriefFromForm({
      processInfo: brief.processInfo,
      businessObjective: brief.businessObjective,
      scopeBoundary: brief.scopeBoundary,
      actors: brief.actors,
      customerSystems: brief.customerFacingSystems,
      internalSystems: brief.internalSystems,
      thirdPartySystems: brief.thirdPartySystems,
      dataDocuments: brief.dataDocuments,
      inputLanguage: locale,
      outputLanguage: locale
    });
    const briefQualityGate = runBriefQualityGate(structuredBrief);

    if (!briefQualityGate.canPreview) {
      const errors = formatQualityGateErrorsVi(briefQualityGate);

      setDraftTasks([]);
      setDraftMeta(null);
      setBlockingErrors(errors);
      setMessage("Brief chua du thong tin de tao Draft PTR.");
      return;
    }

    const response = generateDraftProcessTaskRegister({
      brief: structuredBrief,
      currentLocale: locale
    });
    const draftQualityGate = runDraftProcessTaskRegisterQualityGate(response);

    if (!draftQualityGate.canPreview) {
      const errors = formatQualityGateErrorsVi(draftQualityGate);

      setDraftTasks([]);
      setDraftMeta(null);
      setBlockingErrors(errors);
      setMessage("Draft PTR khong dat Quality Gate.");
      return;
    }

    const nextResponse = {
      ...response,
      qualityGateWarnings: [
        ...formatQualityGateWarningsVi(briefQualityGate),
        ...formatQualityGateWarningsVi(draftQualityGate)
      ]
    };

    setBlockingErrors([]);
    setDraftTasks(nextResponse.draftProcessTasks);
    setDraftMeta(nextResponse);
    setMessage(
      `Đã tạo draft PTR bằng mock local: ${response.draftProcessTasks.length} dòng. Không gọi external API.`
    );
  }

  async function generateDraftPtrWithAI() {
    const structuredBrief: StructuredProcessBrief = parseStructuredProcessBriefFromForm({
      processInfo: brief.processInfo,
      businessObjective: brief.businessObjective,
      scopeBoundary: brief.scopeBoundary,
      actors: brief.actors,
      customerSystems: brief.customerFacingSystems,
      internalSystems: brief.internalSystems,
      thirdPartySystems: brief.thirdPartySystems,
      dataDocuments: brief.dataDocuments,
      inputLanguage: locale,
      outputLanguage: locale
    });
    const generationMode = realAIEnabled ? "real-ai" : "mock";
    const briefQualityGate = runBriefQualityGate(structuredBrief);

    if (!briefQualityGate.canPreview) {
      const errors = formatQualityGateErrorsVi(briefQualityGate);

      setDraftTasks([]);
      setDraftMeta(null);
      setBlockingErrors(errors);
      setMessage("Brief chua du thong tin de tao Draft PTR.");
      return;
    }

    if (!confirmRealAICallIfNeeded(realAIEnabled)) {
      setMessage(uiText.aiCancelled);
      return;
    }

    saveAuditLogEntry({
      action: "generate_ai_draft",
      status: "success",
      summary: `Started ${generationMode} draft generation from Input Brief.`,
      metadata: {
        mode: generationMode,
        realAIEnabled,
        sectionsFilled: filledFieldCount
      }
    });

    if (!realAIEnabled) {
      const response = generateDraftProcessTaskRegister({
        brief: structuredBrief,
        currentLocale: locale
      });
      const draftQualityGate = runDraftProcessTaskRegisterQualityGate(response);

      if (!draftQualityGate.canPreview) {
        const errors = formatQualityGateErrorsVi(draftQualityGate);

        setDraftTasks([]);
        setDraftMeta(null);
        setBlockingErrors(errors);
        setMessage("Draft PTR khong dat Quality Gate.");
        return;
      }

      const nextResponse = {
        ...response,
        qualityGateWarnings: [
          ...formatQualityGateWarningsVi(briefQualityGate),
          ...formatQualityGateWarningsVi(draftQualityGate)
        ]
      };

      setBlockingErrors([]);
      setDraftTasks(nextResponse.draftProcessTasks);
      setDraftMeta(nextResponse);
      saveAuditLogEntry({
        action: "generate_ai_draft",
        status: "success",
        summary: "Generated draft PTR with local mock mode.",
        metadata: {
          mode: "mock",
          externalApiCalled: false,
          draftRowCount: response.draftProcessTasks.length
        }
      });
      logAICallAudit({
        skillId: INPUT_BRIEF_TO_PTR_SKILL_ID,
        success: true,
        realAIEnabled: false,
        externalApiCalled: false,
        extraMetadata: {
          draftRowCount: response.draftProcessTasks.length
        }
      });
      setMessage(
        `${uiText.mockDone} ${response.draftProcessTasks.length} ${uiText.draftRows}.`
      );
      return;
    }

    setIsGeneratingWithAI(true);
    setMessage(uiText.realAIRunning);

    try {
      const routeResponse = await fetch("/api/ai/run-skill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          skillId: INPUT_BRIEF_TO_PTR_SKILL_ID,
          payload: structuredBrief
        })
      });
      const data = (await routeResponse.json()) as {
        ok?: boolean;
        result?: unknown;
        error?: string;
        validationErrors?: string[];
        meta?: {
          externalApiCalled?: boolean;
          validationPassed?: boolean;
        };
      };

      if (!routeResponse.ok || !data.ok) {
        const errorMessage = [
          data.error || "AI draft generation failed.",
          ...(data.validationErrors ?? [])
        ].join(" ");

        saveAuditLogEntry({
          action: "generate_ai_draft",
          status: "failure",
          summary: errorMessage,
          metadata: {
            mode: "real-ai",
            externalApiCalled: data.meta?.externalApiCalled ?? true,
            validationPassed: data.meta?.validationPassed ?? false
          }
        });
        logAICallAudit({
          skillId: INPUT_BRIEF_TO_PTR_SKILL_ID,
          success: false,
          errorMessage,
          realAIEnabled: true,
          externalApiCalled: data.meta?.externalApiCalled ?? true
        });
        setDraftTasks([]);
        setDraftMeta(null);
        setBlockingErrors(data.validationErrors ?? [errorMessage]);
        setMessage(errorMessage);
        return;
      }

      const validation = validateDraftProcessTaskRegister(data.result);

      if (!validation.ok) {
        const errorMessage = `AI output rejected: ${validation.errors.join(" ")}`;

        saveAuditLogEntry({
          action: "generate_ai_draft",
          status: "failure",
          summary: errorMessage,
          metadata: {
            mode: "real-ai",
            externalApiCalled: data.meta?.externalApiCalled ?? true,
            validationPassed: false
          }
        });
        logAICallAudit({
          skillId: INPUT_BRIEF_TO_PTR_SKILL_ID,
          success: false,
          errorMessage,
          realAIEnabled: true,
          externalApiCalled: data.meta?.externalApiCalled ?? true
        });
        setDraftTasks([]);
        setDraftMeta(null);
        setBlockingErrors(validation.errors);
        setMessage(errorMessage);
        return;
      }

      const draftQualityGate = runDraftProcessTaskRegisterQualityGate(validation.value);

      if (!draftQualityGate.canPreview) {
        const errors = formatQualityGateErrorsVi(draftQualityGate);

        saveAuditLogEntry({
          action: "generate_ai_draft",
          status: "failure",
          summary: "Draft PTR khong dat Quality Gate.",
          metadata: {
            mode: "real-ai",
            externalApiCalled: data.meta?.externalApiCalled ?? true,
            validationPassed: true
          }
        });
        logAICallAudit({
          skillId: INPUT_BRIEF_TO_PTR_SKILL_ID,
          success: false,
          errorMessage: "Draft PTR khong dat Quality Gate.",
          realAIEnabled: true,
          externalApiCalled: data.meta?.externalApiCalled ?? true
        });
        setDraftTasks([]);
        setDraftMeta(null);
        setBlockingErrors(errors);
        setMessage("Draft PTR khong dat Quality Gate.");
        return;
      }

      const nextDraftMeta = {
        ...validation.value,
        qualityGateWarnings: [
          ...(validation.value.qualityGateWarnings ?? []),
          ...formatQualityGateWarningsVi(draftQualityGate)
        ]
      };

      setBlockingErrors([]);
      setDraftTasks(nextDraftMeta.draftProcessTasks);
      setDraftMeta(nextDraftMeta);
      saveAuditLogEntry({
        action: "generate_ai_draft",
        status: "success",
        summary: "Generated schema-valid draft PTR with real AI mode.",
        metadata: {
          mode: "real-ai",
          externalApiCalled: data.meta?.externalApiCalled ?? true,
          validationPassed: true,
          draftRowCount: validation.value.draftProcessTasks.length
        }
      });
      logAICallAudit({
        skillId: INPUT_BRIEF_TO_PTR_SKILL_ID,
        success: true,
        realAIEnabled: true,
        externalApiCalled: data.meta?.externalApiCalled ?? true,
        extraMetadata: {
          draftRowCount: validation.value.draftProcessTasks.length
        }
      });
      setMessage(
        `Real AI mode: created a valid Draft PTR with ${validation.value.draftProcessTasks.length} row(s). Review before Apply.`
      );
    } catch {
      logAICallAudit({
        skillId: INPUT_BRIEF_TO_PTR_SKILL_ID,
        success: false,
        errorMessage: "AI draft generation request failed.",
        realAIEnabled: true,
        externalApiCalled: false
      });
      saveAuditLogEntry({
        action: "generate_ai_draft",
        status: "failure",
        summary: "AI draft generation request failed.",
        metadata: {
          mode: "real-ai",
          externalApiCalled: false,
          validationPassed: false
        }
      });
      setMessage("AI draft generation request failed. Draft was not applied.");
    } finally {
      setIsGeneratingWithAI(false);
    }
  }

  function applyDraftPtr(mode: "replace" | "append") {
    if (draftTasks.length === 0) {
      setMessage("Chưa có draft PTR để apply.");
      return;
    }

    const actionLabel =
      mode === "replace" ? "thay thế" : "append vào cuối";
    const confirmed = window.confirm(
      `Apply draft PTR sẽ ${actionLabel} Process Task Register hiện tại. Bạn muốn tiếp tục?`
    );

    if (!confirmed) {
      return;
    }

    const currentTasks = mode === "append" ? loadCurrentProcessTasks() : [];
    const nextTasks =
      mode === "append"
        ? [...currentTasks, ...avoidStepIdConflicts(currentTasks, draftTasks)]
        : draftTasks;

    window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(nextTasks));
    window.dispatchEvent(new Event(PROCESS_TASKS_EVENT));
    markGeneratedArtifactsStale();
    saveAuditLogEntry({
      action: "apply_ai_draft",
      status: "success",
      summary: `Applied draft Process Task Register from AI Input Brief workflow with ${mode} mode.`,
      metadata: {
        mode,
        draftRowCount: draftTasks.length,
        finalRowCount: nextTasks.length
      }
    });
    setMessage("Đã apply draft PTR vào Process Task Register. QA sẽ chạy lại theo dữ liệu mới.");
  }

  function cancelDraft() {
    setDraftTasks([]);
    setDraftMeta(null);
    setBlockingErrors([]);
    setMessage("Đã hủy draft preview.");
  }

  function resetBrief() {
    setBrief(emptyBrief);
    setIntakeFiles([]);
    setSelectedFileObjects([]);
    setExcelPreview(null);
    setDocxExtraction(null);
    setPdfExtraction(null);
    setDraftTasks([]);
    setDraftMeta(null);
    setBlockingErrors([]);
    window.localStorage.removeItem(BRIEF_STORAGE_KEY);
    window.localStorage.removeItem(FILE_METADATA_STORAGE_KEY);
    setMessage("Đã reset brief local và draft preview.");
  }

  const draftPtrGateVerdict = useMemo(
    () => (draftMeta ? runDraftPtrGateV1(draftMeta) : null),
    [draftMeta]
  );
  const sourceCoverageAdvisory = useMemo(
    () => (draftMeta ? createSourceCoverageAdvisory(draftMeta) : null),
    [draftMeta]
  );
  const labels = previewLabels[locale];
  const uiText = inputBriefUiText[locale];

  function renderBriefField(field: BriefField) {
    const { options, otherText, selectedOptions } = getFieldSelection(field);
    const isOtherSelected = selectedOptions.includes(OTHER_OPTION_LABEL);

    return (
      <section
        className="grid w-full min-w-0 gap-4 rounded border border-slate-200 bg-white p-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]"
        key={field.key}
      >
        <div className="min-w-0">
          <span className="text-sm font-semibold text-slate-900">
            {field.label[locale]}
          </span>
          <span className="mt-1 block text-sm leading-6 text-slate-600">
            {field.helper[locale]}
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex max-w-full flex-wrap gap-2">
            {options.map((suggestion) => {
              const isSelected = selectedOptions.includes(suggestion);

              return (
                <button
                  className={`max-w-full whitespace-normal rounded-full border px-3 py-1 text-left text-xs font-medium ${
                    isSelected
                      ? "border-blue-300 bg-blue-600 text-white shadow-sm"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400"
                  }`}
                  key={suggestion}
                  onClick={(event) => {
                    event.preventDefault();
                    toggleSuggestion(field, suggestion);
                  }}
                  type="button"
                >
                  {getOptionDisplayLabel(suggestion)}
                </button>
              );
            })}
          </div>
          {isOtherSelected ? (
            <textarea
              className="mt-3 min-h-24 w-full min-w-0 resize-y rounded border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
              onChange={(event) => updateOtherText(field, event.target.value)}
              placeholder={field.placeholder[locale]}
              rows={field.rows}
              value={otherText}
            />
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <SessionFrame
      actions={
        <>
          <button
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={saveBrief}
            type="button"
          >
            {t("inputBrief.saveBrief", locale)}
          </button>
          <button
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={resetBrief}
            type="button"
          >
            {t("inputBrief.resetBrief", locale)}
          </button>
          <button
            className="btn btn-primary"
            onClick={generateDraftPtr}
            type="button"
          >
            {t("inputBrief.generateDraftProcessTaskRegister", locale)}
          </button>
          <button
            className="rounded border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isGeneratingWithAI}
            onClick={generateDraftPtrWithAI}
            type="button"
          >
            {isGeneratingWithAI ? uiText.generating : uiText.generateWithAI}
          </button>
        </>
      }
      bodyClassName="p-4"
      description={t("inputBrief.description", locale)}
      title={t("inputBrief.title", locale)}
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { id: "manual" as const, label: uiText.manualInput, disabled: false },
          { id: "import-file" as const, label: uiText.importFile, disabled: false },
          { id: "voice" as const, label: uiText.voiceInputComingSoon, disabled: false }
        ].map((mode) => (
          <button
            className={`rounded border px-3 py-2 text-sm font-semibold ${
              briefMode === mode.id
                ? "border-violet-300 bg-violet-600 text-white shadow-sm"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            } disabled:cursor-not-allowed disabled:opacity-50`}
            disabled={mode.disabled}
            key={mode.id}
            onClick={() => setBriefMode(mode.id)}
            type="button"
          >
            {mode.label}
          </button>
        ))}
      </div>

      {briefMode === "manual" ? (
        <div className="grid w-full min-w-0 gap-4">
          <div className="grid w-full min-w-0 gap-4">
            {primaryBriefFields.map(renderBriefField)}
          </div>
          <div className="w-full min-w-0 rounded border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-950">
                {uiText.relatedSystems}
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {uiText.relatedSystemsHelper}
              </p>
            </div>
            <div className="grid w-full min-w-0 gap-4">
              {systemBriefFields.map(renderBriefField)}
            </div>
          </div>
          <div className="w-full min-w-0 rounded border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-950">
                {uiText.dataDocuments}
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {uiText.dataDocumentsHelper}
              </p>
            </div>
            <div className="grid w-full min-w-0 gap-4">
              {dataDocumentBriefFields.map(renderBriefField)}
            </div>
          </div>
          <div className="w-full min-w-0 rounded border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">
                  {locale === "vi" ? "Chat / ghi chu" : "Chat / notes"}
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {locale === "vi"
                    ? "Paste noi dung trao doi, ghi chu workshop hoac manual text de tao Draft PTR preview."
                    : "Paste chat, workshop notes, or manual text to generate a Draft PTR preview."}
                </p>
              </div>
              <button
                className="w-fit rounded border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isGeneratingWithAI || chatNotes.trim().length < 20}
                onClick={() => void generateDraftPtrFromChatNotes()}
                type="button"
              >
                {locale === "vi"
                  ? "Tao Draft PTR tu ghi chu"
                  : "Generate Draft PTR from notes"}
              </button>
            </div>
            <textarea
              className="mt-3 min-h-32 w-full min-w-0 resize-y rounded border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
              onChange={(event) => setChatNotes(event.target.value)}
              placeholder={
                locale === "vi"
                  ? "Vi du: Khach hang gui yeu cau mo tai khoan. RM kiem tra ho so. Ops tao CIF..."
                  : "Example: Customer submits account opening request. RM checks documents. Ops creates CIF..."
              }
              value={chatNotes}
            />
          </div>
        </div>
      ) : null}

      {briefMode === "voice" ? (
        <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          {uiText.voiceComingSoon}
        </div>
      ) : null}

      {briefMode === "import-file" ? (
      <div className="rounded border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">
              {uiText.fileIntake}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {uiText.fileIntakeHelper}
            </p>
          </div>
          <button
            className="w-fit rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={intakeFiles.length === 0}
            onClick={clearSelectedFiles}
            type="button"
          >
            {uiText.clearFiles}
          </button>
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-700">
            {uiText.selectLocalFiles}
          </span>
          <input
            accept=".xlsx,.docx,.pdf,image/*"
            className="mt-2 block w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800"
            multiple
            onChange={(event) => handleFileSelection(event.target.files)}
            type="file"
          />
        </label>

        <div className="mt-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <p className="font-semibold">
            {"supportedFormatsTitle" in uiText
              ? uiText.supportedFormatsTitle
              : "Supported formats"}
          </p>
          <p className="mt-1">
            {"supportedFormats" in uiText
              ? uiText.supportedFormats
              : "Text-based PDF, DOCX, and XLSX are supported for local Draft PTR generation."}
          </p>
          <p className="mt-1 text-slate-500">
            {"comingSoonFormats" in uiText
              ? uiText.comingSoonFormats
              : "Image/OCR/Voice intake is coming soon."}
          </p>
        </div>

        {intakeFiles.length > 0 && selectedFileObjects.length === 0 ? (
          <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {uiText.reselectAfterRefresh}
          </p>
        ) : null}

        {intakeFiles.length > 0 ? (
          <div className="mt-4 overflow-x-auto rounded border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">{uiText.fileName}</th>
                  <th className="px-3 py-2">{uiText.type}</th>
                  <th className="px-3 py-2">{uiText.size}</th>
                  <th className="px-3 py-2">{uiText.lastModified}</th>
                  <th className="px-3 py-2">{uiText.status}</th>
                  <th className="px-3 py-2">{uiText.action}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {intakeFiles.map((file) => (
                  <tr key={`${file.fileName}-${file.lastModified}`}>
                    <td className="max-w-72 truncate px-3 py-2 font-medium text-slate-900">
                      {file.fileName}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{file.fileType}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                      {formatFileSize(file.fileSize)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                      {formatLastModified(file.lastModified)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span
                        className={`rounded border px-2 py-1 text-xs font-semibold ${fileStatusStyles[file.status]}`}
                      >
                        {file.status}
                      </span>
                      <p className="mt-1 max-w-72 whitespace-normal text-xs text-slate-500">
                        {"nextStep" in uiText ? `${uiText.nextStep}: ` : "Next step: "}
                        {getFileDraftActionLabel(file, uiText.generateDraftPtr)}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {file.fileName.toLowerCase().endsWith(".xlsx") &&
                      file.status !== "unsupported" ? (
                        <button
                          className="rounded border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={file.status === "pending-extraction"}
                          onClick={() => {
                            const selectedFile = selectedFileObjects.find(
                              (item) =>
                                item.name === file.fileName &&
                                item.lastModified === file.lastModified
                            );

                            if (selectedFile) {
                              void extractExcelFile(selectedFile);
                            } else {
                              setMessage(
                                uiText.reselectAfterRefresh
                              );
                            }
                          }}
                          type="button"
                        >
                          {uiText.generateDraftPtr}
                        </button>
                      ) : file.fileName.toLowerCase().endsWith(".docx") &&
                        file.status !== "unsupported" ? (
                        <button
                          className="rounded border border-violet-300 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-800 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={file.status === "pending-extraction"}
                          onClick={() => {
                            const selectedFile = selectedFileObjects.find(
                              (item) =>
                                item.name === file.fileName &&
                                item.lastModified === file.lastModified
                            );

                            if (selectedFile) {
                              void generateDraftPtrFromDocxFile(selectedFile);
                            } else {
                              setMessage(
                                uiText.reselectAfterRefresh
                              );
                            }
                          }}
                          type="button"
                        >
                          {uiText.generateDraftPtr}
                        </button>
                      ) : file.fileName.toLowerCase().endsWith(".pdf") &&
                        file.status !== "unsupported" ? (
                        <button
                          className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={file.status === "pending-extraction"}
                          onClick={() => {
                            const selectedFile = selectedFileObjects.find(
                              (item) =>
                                item.name === file.fileName &&
                                item.lastModified === file.lastModified
                            );

                            if (selectedFile) {
                              void generateDraftPtrFromPdfFile(selectedFile);
                            } else {
                              setMessage(
                                uiText.reselectAfterRefresh
                              );
                            }
                          }}
                          type="button"
                        >
                          {uiText.generateDraftPtr}
                        </button>
                      ) : file.status === "unsupported" ? (
                        <span className="text-xs font-semibold text-red-700">
                          {isImageIntakeFile(file)
                            ? uiText.unsupportedImage
                            : uiText.unsupportedFile}
                        </span>
                      ) : null}
                      <button
                        className="ml-2 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() => removeSelectedFile(file)}
                        type="button"
                      >
                        Clear file
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {excelPreview ? (
          <div className="mt-4 rounded border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
            <p className="font-semibold">Excel extraction summary</p>
            <p className="mt-1">
              Sheet {excelPreview.detectedSheet} produced{" "}
              <span className="font-semibold">
                {excelPreview.draftTasks.length}
              </span>{" "}
              draft PTR row(s). Draft Preview is shown below for review before Apply.
            </p>
            {excelPreview.warnings.length > 0 ? (
              <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-amber-900">
                <p className="font-semibold">Warnings</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {excelPreview.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {docxExtraction ? (
          <div className="mt-4 rounded border border-violet-200 bg-violet-50 p-3 text-sm text-violet-950">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-semibold">DOCX extraction preview</p>
                <p className="mt-1 text-violet-900">
                  Local text extraction only. No file upload or external AI call.
                </p>
              </div>
              <button
                className="btn btn-ai w-fit text-xs"
                onClick={() => void generateDraftPtrFromDocxExtraction()}
                type="button"
              >
                {uiText.generateDraftPtr}
              </button>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded border border-violet-200 bg-white p-3">
                <p className="font-semibold">Extraction summary</p>
                <p className="mt-2">
                  Extracted {docxExtraction.rawText.length} characters and{" "}
                  {docxExtraction.detectedSteps.length} likely step(s).
                </p>
                <p className="mt-2">
                  Actors: {docxExtraction.detectedActors.join(", ") || "None"}
                </p>
                <p className="mt-1">
                  Systems: {docxExtraction.detectedSystems.join(", ") || "None"}
                </p>
                <p className="mt-1">
                  Data objects:{" "}
                  {docxExtraction.detectedDataObjects.join(", ") || "None"}
                </p>
                <div className="mt-2">
                  <p className="font-semibold">Detected steps</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {docxExtraction.detectedSteps.slice(0, 10).map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                    {docxExtraction.detectedSteps.length === 0 ? (
                      <li>No step-like lines detected.</li>
                    ) : null}
                  </ul>
                </div>
              </div>

              <div className="rounded border border-violet-200 bg-white p-3">
                <p className="font-semibold">Assumptions</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {docxExtraction.assumptions.map((assumption) => (
                    <li key={assumption}>{assumption}</li>
                  ))}
                </ul>
                <p className="mt-3 font-semibold">Open questions</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {docxExtraction.openQuestions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}

        {pdfExtraction ? (
          <div className="mt-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-semibold">PDF extraction summary</p>
                <p className="mt-1 text-emerald-900">
                  {locale === "vi"
                    ? `Đã trích xuất ${pdfExtraction.rawText.length} ký tự bằng local text parsing. OCR chưa được hỗ trợ trong phase này.`
                    : `Extracted ${pdfExtraction.rawText.length} characters with local text parsing. OCR is not implemented in this phase.`}
                </p>
              </div>
              <button
                className="btn btn-success w-fit text-xs"
                onClick={() => void generateDraftPtrFromPdfExtraction()}
                type="button"
              >
                {uiText.generateDraftPtr}
              </button>
            </div>
            {pdfExtraction.warnings.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-emerald-900">
                {pdfExtraction.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {intakeFiles.some((file) => file.status === "unsupported") ? (
          <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {uiText.unsupportedSummary}
          </p>
        ) : null}
      </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <span>
          {filledFieldCount}/5{" "}
          {t("inputBrief.sectionsFilled", locale)}
        </span>
        <span className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700">
          {aiModeLoaded
            ? realAIEnabled
              ? `${uiText.realAIMode}: ${aiProvider}. ${uiText.cloudWarning}`
              : uiText.mockMode
            : uiText.checkingAIMode}
        </span>
        {message ? <span>{message}</span> : null}
      </div>

      {blockingErrors.length > 0 ? (
        <div className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-semibold">{uiText.draftBlocked}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {blockingErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {draftTasks.length > 0 ? (
        <div className="mt-5 rounded border border-slate-200">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">
                {t("inputBrief.draftPreview", locale)}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {draftTasks.length} dòng draft. {t("inputBrief.reviewBeforeApply", locale)}
              </p>
              {draftPtrGateVerdict ? (
                <span
                  className={`mt-2 inline-flex w-fit items-center rounded border px-2 py-1 text-xs font-semibold uppercase tracking-wide ${
                    gateVerdictStyles[draftPtrGateVerdict.status]
                  }`}
                >
                  {labels.gateVerdict}: {draftPtrGateVerdict.status}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
                onClick={() => applyDraftPtr("replace")}
                type="button"
              >
                {labels.replaceCurrentPtr}
              </button>
              <button
                className="rounded border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800 hover:bg-sky-100"
                onClick={() => applyDraftPtr("append")}
                type="button"
              >
                {labels.appendToCurrentPtr}
              </button>
              <button
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={cancelDraft}
                type="button"
              >
                {labels.cancelDraft}
              </button>
            </div>
          </div>
          {draftPtrGateVerdict ? (
            <div className="border-b border-slate-200 bg-white px-4 py-4 text-sm">
              {draftPtrGateVerdict.blockers.length > 0 ? (
                <div className="rounded border border-red-200 bg-red-50 p-3">
                  <p className="font-semibold text-red-900">{labels.gateBlockers}</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-red-800">
                    {draftPtrGateVerdict.blockers.map((blocker) => (
                      <li key={`${blocker.code}-${blocker.title}`}>
                        <span className="font-medium">{blocker.title}</span>:{" "}
                        {blocker.description}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {draftPtrGateVerdict.warnings.length > 0 ? (
                <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3">
                  <p className="font-semibold text-amber-900">{labels.gateWarnings}</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-amber-800">
                    {draftPtrGateVerdict.warnings.slice(0, 5).map((warning) => (
                      <li key={`${warning.code}-${warning.title}`}>
                        <span className="font-medium">{warning.title}</span>:{" "}
                        {warning.description}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {draftPtrGateVerdict.blockers.length === 0 &&
              draftPtrGateVerdict.warnings.length === 0 ? (
                <p className="rounded border border-emerald-200 bg-emerald-50 p-3 font-medium text-emerald-800">
                  {labels.gateNoIssues}
                </p>
              ) : null}
              <details className="mt-3 rounded border border-slate-200 bg-slate-50 p-3">
                <summary className="cursor-pointer font-semibold text-slate-900">
                  {labels.gateAdvanced}
                </summary>
                <div className="mt-3 space-y-3 text-slate-700">
                  <p>
                    {labels.gateScore}:{" "}
                    <span className="font-semibold text-slate-950">
                      {draftPtrGateVerdict.score?.score ?? "-"}
                    </span>
                  </p>
                  {draftPtrGateVerdict.score ? (
                    <div className="grid gap-2 md:grid-cols-2">
                      {draftPtrGateVerdict.score.dimensions.map((dimension) => (
                        <div
                          className="rounded border border-slate-200 bg-white p-3"
                          key={dimension.id}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-semibold text-slate-900">{dimension.label}</p>
                            <span
                              className={`rounded border px-2 py-1 text-xs font-semibold uppercase tracking-wide ${
                                gateVerdictStyles[dimension.status ?? "not-applicable"]
                              }`}
                            >
                              {dimension.status ?? "not-applicable"}
                            </span>
                          </div>
                          <p className="mt-1 text-slate-600">
                            {dimension.score ?? "-"}/{dimension.maxScore ?? "-"}
                          </p>
                          {dimension.notes && dimension.notes.length > 0 ? (
                            <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">
                              {dimension.notes.map((note) => (
                                <li key={note}>{note}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </details>
            </div>
          ) : null}
          {sourceCoverageAdvisory ? (
            <div className="border-b border-slate-200 bg-white px-4 py-4 text-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">
                      {labels.sourceCoverage}
                    </p>
                    <span
                      className={`rounded border px-2 py-1 text-xs font-semibold uppercase tracking-wide ${
                        sourceCoverageStyles[sourceCoverageAdvisory.status]
                      }`}
                    >
                      {sourceCoverageAdvisory.status}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-600">
                    {labels.sourceCoverageNonBlocking}
                  </p>
                </div>
                <div className="grid gap-2 text-slate-700 md:grid-cols-3">
                  <div className="rounded border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      {labels.sourceCoverageMode}
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {sourceCoverageAdvisory.signals.sourceMode}
                    </p>
                  </div>
                  <div className="rounded border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      {labels.sourceCoverage}
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {sourceCoverageAdvisory.signals.coveragePercent}%
                    </p>
                  </div>
                  <div className="rounded border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      {labels.sourceCoverageRows}
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {sourceCoverageAdvisory.signals.rowsWithSourceRef}/
                      {sourceCoverageAdvisory.signals.totalDraftRows}
                    </p>
                  </div>
                </div>
              </div>
              {sourceCoverageAdvisory.warnings.length > 0 ? (
                <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-amber-900">
                  <p className="font-semibold">{labels.sourceCoverageWarnings}</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {sourceCoverageAdvisory.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-3 font-medium text-emerald-800">
                  {labels.sourceCoverageNoWarnings}
                </p>
              )}
            </div>
          ) : null}
          {draftMeta ? (
            <div className="grid gap-4 border-b border-slate-200 bg-white px-4 py-4 text-sm md:grid-cols-2">
              <div>
                <p className="font-semibold text-slate-900">{labels.sourceSummary}</p>
                <p className="mt-1 text-slate-600">{draftMeta.sourceSummary}</p>
                <p className="mt-3 text-slate-600">
                  {labels.confidence}:{" "}
                  <span className="font-semibold text-slate-900">
                    {draftMeta.confidence}
                  </span>
                </p>
              </div>
              <div className="grid gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{labels.assumptions}</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">
                    {draftMeta.assumptions.map((assumption) => (
                      <li key={assumption}>{assumption}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{labels.openQuestions}</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">
                    {draftMeta.openQuestions.map((question) => (
                      <li key={question}>{question}</li>
                    ))}
                  </ul>
                </div>
                {draftMeta.qualityIssues.length > 0 ? (
                  <div className="rounded border border-amber-200 bg-amber-50 p-3">
                    <p className="font-semibold text-amber-900">
                      {labels.qualityIssues}
                    </p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-amber-800">
                      {draftMeta.qualityIssues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {draftMeta.qualityGateWarnings &&
                draftMeta.qualityGateWarnings.length > 0 ? (
                  <div className="rounded border border-amber-200 bg-amber-50 p-3">
                    <p className="font-semibold text-amber-900">
                      {labels.qualityGateWarnings}
                    </p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-amber-800">
                      {draftMeta.qualityGateWarnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-white text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">{labels.stepId}</th>
                  <th className="px-4 py-3">{labels.bpmnType}</th>
                  <th className="px-4 py-3">{labels.actor}</th>
                  <th className="px-4 py-3">{labels.system}</th>
                  <th className="px-4 py-3">{labels.taskName}</th>
                  <th className="px-4 py-3">{labels.input}</th>
                  <th className="px-4 py-3">{labels.output}</th>
                  <th className="px-4 py-3">{labels.defaultNextStep}</th>
                  <th className="px-4 py-3">{labels.reviewStatus}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {draftTasks.map((task) => (
                  <tr key={task.id}>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                      {task.stepId}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {task.bpmnType}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {task.actor}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {task.system}
                    </td>
                    <td className="min-w-72 px-4 py-3 text-slate-700">
                      {task.taskName}
                    </td>
                    <td className="min-w-56 px-4 py-3 text-slate-600">
                      {task.input}
                    </td>
                    <td className="min-w-56 px-4 py-3 text-slate-600">
                      {task.output}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {task.defaultNextStep ?? task.yesNextStep ?? "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {task.reviewStatus}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </SessionFrame>
  );
}
