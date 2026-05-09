"use client";

import { useEffect, useMemo, useState } from "react";
import { SessionFrame } from "@/components/layout/SessionFrame";
import { logAICallAudit } from "@/lib/ai/ai-governance";
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
import { getLocale, t, type Locale, type TranslationKey } from "@/lib/i18n";
import type { ProcessTask } from "@/lib/models/process-task";
import {
  formatQualityGateErrorsVi,
  formatQualityGateWarningsVi,
  runBriefQualityGate,
  runDraftProcessTaskRegisterQualityGate
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
type GenerationMode = "mock" | "real";

type AISkillStatus = {
  realAIEnabled: boolean;
  realAIInputBriefEnabled: boolean;
  providerStatus: "configured" | "missing-key" | "mock-only" | "not configured";
  provider: "mock" | "openai" | "anthropic";
  model: string;
};

const fileStatusStyles: Record<IntakeFileMetadata["status"], string> = {
  selected: "border-slate-200 bg-slate-50 text-slate-700",
  "pending-extraction": "border-amber-200 bg-amber-50 text-amber-800",
  extracted: "border-emerald-200 bg-emerald-50 text-emerald-800",
  unsupported: "border-red-200 bg-red-50 text-red-800",
  failed: "border-red-200 bg-red-50 text-red-800"
};

const previewLabels = {
  vi: {
    sourceSummary: "Tóm tắt nguồn",
    confidence: "Độ tin cậy",
    assumptions: "Giả định",
    openQuestions: "Câu hỏi cần làm rõ",
    qualityGateWarnings: "Canh bao Quality Gate",
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
  },
  en: {
    sourceSummary: "Source summary",
    confidence: "Confidence",
    assumptions: "Assumptions",
    openQuestions: "Open questions",
    qualityGateWarnings: "Quality Gate warnings",
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

type InputBriefFormState = {
  processInfo: string;
  businessObjective: string;
  scope: string;
  startEnd: string;
  actors: string;
  relatedSystems: string;
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
    | "scope"
    | "startEnd"
    | "actors"
    | "relatedSystems"
    | "dataDocuments"
  >;
  labelKey: TranslationKey;
  helperKey: TranslationKey;
  placeholderKey: TranslationKey;
  rows: number;
};

const emptyBrief: InputBriefFormState = {
  processInfo: "",
  businessObjective: "",
  scope: "",
  startEnd: "",
  actors: "",
  relatedSystems: "",
  dataDocuments: "",
  happyPath: "",
  exceptions: "",
  slaControl: "",
  desiredOutputs: ""
};

const briefFields: BriefField[] = [
  {
    key: "processInfo",
    labelKey: "inputBrief.processInfo",
    helperKey: "inputBrief.processInfoHelper",
    placeholderKey: "inputBrief.processInfoPlaceholder",
    rows: 3
  },
  {
    key: "businessObjective",
    labelKey: "inputBrief.businessObjective",
    helperKey: "inputBrief.businessObjectiveHelper",
    placeholderKey: "inputBrief.businessObjectivePlaceholder",
    rows: 4
  },
  {
    key: "scope",
    labelKey: "inputBrief.scope",
    helperKey: "inputBrief.scopeHelper",
    placeholderKey: "inputBrief.scopePlaceholder",
    rows: 4
  },
  {
    key: "startEnd",
    labelKey: "inputBrief.startEnd",
    helperKey: "inputBrief.startEndHelper",
    placeholderKey: "inputBrief.startEndPlaceholder",
    rows: 4
  },
  {
    key: "actors",
    labelKey: "inputBrief.actors",
    helperKey: "inputBrief.actorsHelper",
    placeholderKey: "inputBrief.actorsPlaceholder",
    rows: 4
  },
  {
    key: "relatedSystems",
    labelKey: "inputBrief.relatedSystems",
    helperKey: "inputBrief.relatedSystemsHelper",
    placeholderKey: "inputBrief.relatedSystemsPlaceholder",
    rows: 3
  },
  {
    key: "dataDocuments",
    labelKey: "inputBrief.dataDocuments",
    helperKey: "inputBrief.dataDocumentsHelper",
    placeholderKey: "inputBrief.dataDocumentsPlaceholder",
    rows: 3
  }
];

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
        systems?: string;
        processName?: string;
        startEvent?: string;
        endEvent?: string;
      }
  >;
  const startEnd =
    savedBrief.startEnd ??
    [savedBrief.startEvent, savedBrief.endEvent].filter(Boolean).join("\n");

  return {
    ...emptyBrief,
    ...savedBrief,
    processInfo: savedBrief.processInfo ?? savedBrief.processName ?? "",
    startEnd,
    relatedSystems: savedBrief.relatedSystems ?? savedBrief.systems ?? "",
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

function mergeUniqueMessages(...messageGroups: string[][]) {
  return Array.from(new Set(messageGroups.flat().filter(Boolean)));
}

export function AIInputBriefPanel() {
  const [brief, setBrief] = useState<InputBriefFormState>(emptyBrief);
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
  const [canApplyDraft, setCanApplyDraft] = useState(false);
  const [locale, setActiveLocale] = useState<Locale>("vi");
  const [aiStatus, setAIStatus] = useState<AISkillStatus>({
    realAIEnabled: false,
    realAIInputBriefEnabled: false,
    providerStatus: "mock-only",
    provider: "mock",
    model: "mock"
  });
  const [generationMode, setGenerationMode] = useState<GenerationMode>("mock");
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
          realAIInputBriefEnabled?: boolean;
          providerStatus?: AISkillStatus["providerStatus"];
          provider?: AISkillStatus["provider"];
          model?: string;
        };

        if (active) {
          setAIStatus({
            realAIEnabled: data.realAIEnabled === true,
            realAIInputBriefEnabled: data.realAIInputBriefEnabled === true,
            providerStatus: data.providerStatus ?? "mock-only",
            provider: data.provider ?? "mock",
            model: data.model ?? "mock"
          });
        }
      } catch {
        if (active) {
          setAIStatus({
            realAIEnabled: false,
            realAIInputBriefEnabled: false,
            providerStatus: "mock-only",
            provider: "mock",
            model: "mock"
          });
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

  const realAIInputBriefAvailable =
    aiStatus.realAIEnabled &&
    aiStatus.realAIInputBriefEnabled &&
    aiStatus.providerStatus === "configured";

  useEffect(() => {
    if (!realAIInputBriefAvailable && generationMode === "real") {
      setGenerationMode("mock");
    }
  }, [generationMode, realAIInputBriefAvailable]);

  const filledFieldCount = useMemo(
    () => briefFields.filter((field) => brief[field.key].trim()).length,
    [brief]
  );

  function updateBriefField(key: BriefField["key"], value: string) {
    setBrief((currentBrief) => ({
      ...currentBrief,
      [key]: value
    }));
    setMessage("Brief đã được lưu local.");
  }

  function saveBrief() {
    window.localStorage.setItem(BRIEF_STORAGE_KEY, JSON.stringify(brief));
    setMessage("Brief đã được lưu local.");
  }

  function handleFileSelection(files: FileList | null) {
    if (!files) {
      return;
    }

    const nextFiles = Array.from(files);
    const nextFileMetadata = nextFiles.map(createIntakeFileMetadata);
    const unsupportedCount = nextFileMetadata.filter(
      (file) => file.status === "unsupported"
    ).length;

    setSelectedFileObjects(nextFiles);
    setIntakeFiles(nextFileMetadata);
    setExcelPreview(null);
    setDocxExtraction(null);
    setPdfExtraction(null);
    setMessage(
      unsupportedCount > 0
        ? `${unsupportedCount} file khong duoc ho tro. Chi luu metadata, khong upload file.`
        : `Da chon ${nextFileMetadata.length} file. Chi luu metadata, khong upload file.`
    );
  }

  function clearSelectedFiles() {
    setSelectedFileObjects([]);
    setIntakeFiles([]);
    setExcelPreview(null);
    setDocxExtraction(null);
    setPdfExtraction(null);
    window.localStorage.removeItem(FILE_METADATA_STORAGE_KEY);
    setMessage("Da xoa file intake metadata local.");
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
      setCanApplyDraft(false);
      setMessage(
        error instanceof Error
          ? `Excel extraction failed: ${error.message}`
          : "Excel extraction failed."
      );
    }
  }

  async function extractDocxFile(file: File) {
    updateIntakeFileStatus(file, "pending-extraction");
    setMessage("Dang extract DOCX local trong browser. Khong upload file.");

    try {
      const result = await extractTextFromDocx(file);

      setDocxExtraction(result);
      setExcelPreview(null);
      updateIntakeFileStatus(file, "extracted");
      setMessage(
        `Da extract DOCX local: ${result.rawText.length} ky tu, ${result.detectedSteps.length} step goi y.`
      );
    } catch (error) {
      updateIntakeFileStatus(file, "failed");
      setDocxExtraction(null);
      setMessage(
        error instanceof Error
          ? `DOCX extraction failed: ${error.message}`
          : "DOCX extraction failed."
      );
    }
  }

  async function extractPdfFile(file: File) {
    updateIntakeFileStatus(file, "pending-extraction");
    setMessage("Dang extract PDF text local trong browser. Khong upload file.");

    try {
      const result = await extractTextFromPdf(file);

      setPdfExtraction(result);
      setExcelPreview(null);
      setDocxExtraction(null);
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

  function generateDraftPtrFromDocxExtraction() {
    if (!docxExtraction) {
      setMessage("Chua co DOCX extraction de tao Draft PTR.");
      return;
    }

    const structuredBrief = parseStructuredProcessBriefFromForm({
      processInfo:
        docxExtraction.detectedSteps[0] ||
        docxExtraction.rawText.split(/\r?\n/).find(Boolean) ||
        "DOCX extracted process",
      businessObjective: docxExtraction.rawText.slice(0, 1200),
      scope: docxExtraction.rawText.slice(0, 1200),
      startEnd: [
        docxExtraction.detectedSteps[0] || "Request received",
        docxExtraction.detectedSteps[docxExtraction.detectedSteps.length - 1] ||
          "Process completed"
      ].join("\n"),
      actors: docxExtraction.detectedActors.join("\n"),
      relatedSystems: docxExtraction.detectedSystems.join("\n"),
      dataDocuments: docxExtraction.detectedDataObjects.join("\n"),
      inputLanguage: locale,
      outputLanguage: locale
    });
    const response = generateDraftProcessTaskRegister({
      brief: structuredBrief,
      currentLocale: locale
    });
    const draftQualityGate = runDraftProcessTaskRegisterQualityGate(response);
    const nextResponse = {
      ...response,
      assumptions: mergeUniqueMessages(response.assumptions, docxExtraction.assumptions),
      openQuestions: docxExtraction.openQuestions,
      qualityGateWarnings: formatQualityGateWarningsVi(draftQualityGate),
      sourceSummary: "Draft generated locally from DOCX extracted text."
    };

    if (!draftQualityGate.canPreview) {
      const errors = formatQualityGateErrorsVi(draftQualityGate);

      setDraftTasks([]);
      setDraftMeta(null);
      setCanApplyDraft(false);
      setBlockingErrors(errors);
      setMessage("Draft PTR tu DOCX khong dat Quality Gate.");
      return;
    }

    setBlockingErrors([]);
    setDraftTasks(nextResponse.draftProcessTasks);
    setDraftMeta(nextResponse);
    setCanApplyDraft(draftQualityGate.canApplyAfterReview);
    setMessage(
      `Da tao draft PTR tu DOCX extraction: ${nextResponse.draftProcessTasks.length} dong. Hay review truoc khi Apply.`
    );
  }

  function generateDraftPtr() {
    const structuredBrief = parseStructuredProcessBriefFromForm({
      processInfo: brief.processInfo,
      businessObjective: brief.businessObjective,
      scope: brief.scope,
      startEnd: brief.startEnd,
      actors: brief.actors,
      relatedSystems: brief.relatedSystems,
      dataDocuments: brief.dataDocuments,
      inputLanguage: locale,
      outputLanguage: locale
    });
    const briefQualityGate = runBriefQualityGate(structuredBrief);

    if (!briefQualityGate.canPreview) {
      const errors = formatQualityGateErrorsVi(briefQualityGate);

      setDraftTasks([]);
      setDraftMeta(null);
      setCanApplyDraft(false);
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
      setCanApplyDraft(false);
      setBlockingErrors(errors);
      setMessage("Draft PTR khong dat Quality Gate.");
      return;
    }

    const nextResponse = {
      ...response,
      qualityGateWarnings: mergeUniqueMessages(
        formatQualityGateWarningsVi(briefQualityGate),
        formatQualityGateWarningsVi(draftQualityGate)
      )
    };

    setBlockingErrors([]);
    setDraftTasks(nextResponse.draftProcessTasks);
    setDraftMeta(nextResponse);
    setCanApplyDraft(draftQualityGate.canApplyAfterReview);
    setMessage(
      `Đã tạo draft PTR bằng mock local: ${response.draftProcessTasks.length} dòng. Không gọi external API.`
    );
  }

  async function generateDraftPtrWithAI(requestedMode: GenerationMode = generationMode) {
    const structuredBrief: StructuredProcessBrief = parseStructuredProcessBriefFromForm({
      processInfo: brief.processInfo,
      businessObjective: brief.businessObjective,
      scope: brief.scope,
      startEnd: brief.startEnd,
      actors: brief.actors,
      relatedSystems: brief.relatedSystems,
      dataDocuments: brief.dataDocuments,
      inputLanguage: locale,
      outputLanguage: locale
    });
    const useRealAI = requestedMode === "real" && realAIInputBriefAvailable;
    const auditMode = useRealAI ? "real-ai" : "mock";
    const briefQualityGate = runBriefQualityGate(structuredBrief);

    if (!briefQualityGate.canPreview) {
      const errors = formatQualityGateErrorsVi(briefQualityGate);

      setDraftTasks([]);
      setDraftMeta(null);
      setCanApplyDraft(false);
      setBlockingErrors(errors);
      setMessage("Brief chua du thong tin de tao Draft PTR.");
      return;
    }

    if (requestedMode === "real" && !realAIInputBriefAvailable) {
      setMessage("Real AI Input Brief is not enabled or provider is not configured.");
      return;
    }

    saveAuditLogEntry({
      action: "generate_ai_draft",
      status: "success",
      summary: `Started ${auditMode} draft generation from Input Brief.`,
      metadata: {
        mode: auditMode,
        realAIEnabled: useRealAI,
        provider: useRealAI ? aiStatus.provider : "mock",
        sectionsFilled: filledFieldCount
      }
    });

    if (!useRealAI) {
      const response = generateDraftProcessTaskRegister({
        brief: structuredBrief,
        currentLocale: locale
      });
      const draftQualityGate = runDraftProcessTaskRegisterQualityGate(response);

      if (!draftQualityGate.canPreview) {
        const errors = formatQualityGateErrorsVi(draftQualityGate);

        setDraftTasks([]);
        setDraftMeta(null);
        setCanApplyDraft(false);
        setBlockingErrors(errors);
        setMessage("Draft PTR khong dat Quality Gate.");
        return;
      }

      const nextResponse = {
        ...response,
        qualityGateWarnings: mergeUniqueMessages(
          formatQualityGateWarningsVi(briefQualityGate),
          formatQualityGateWarningsVi(draftQualityGate)
        )
      };

      setBlockingErrors([]);
      setDraftTasks(nextResponse.draftProcessTasks);
      setDraftMeta(nextResponse);
      setCanApplyDraft(draftQualityGate.canApplyAfterReview);
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
        `Mock mode: Ä‘Ã£ táº¡o draft PTR local ${response.draftProcessTasks.length} dÃ²ng. KhÃ´ng gá»i external API.`
      );
      return;
    }

    setIsGeneratingWithAI(true);
    setMessage("Real AI mode: Ä‘ang gá»i server-side AI provider...");

    try {
      const routeResponse = await fetch("/api/ai/run-skill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          skillId: INPUT_BRIEF_TO_PTR_SKILL_ID,
          provider: aiStatus.provider,
          payload: structuredBrief
        })
      });
      const data = (await routeResponse.json()) as {
        ok?: boolean;
        result?: unknown;
        error?: string;
        validationErrors?: string[];
        provider?: string;
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
            provider: data.provider ?? aiStatus.provider,
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
        setCanApplyDraft(false);
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
            provider: data.provider ?? aiStatus.provider,
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
        setCanApplyDraft(false);
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
            provider: data.provider ?? aiStatus.provider,
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
        setCanApplyDraft(false);
        setBlockingErrors(errors);
        setMessage("Draft PTR khong dat Quality Gate.");
        return;
      }

      const nextDraftMeta = {
        ...validation.value,
        qualityGateWarnings: mergeUniqueMessages(
          validation.value.qualityGateWarnings ?? [],
          formatQualityGateWarningsVi(draftQualityGate)
        )
      };

      setBlockingErrors([]);
      setDraftTasks(nextDraftMeta.draftProcessTasks);
      setDraftMeta(nextDraftMeta);
      setCanApplyDraft(draftQualityGate.canApplyAfterReview);
      saveAuditLogEntry({
        action: "generate_ai_draft",
        status: "success",
        summary: "Generated schema-valid draft PTR with real AI mode.",
        metadata: {
          mode: "real-ai",
          provider: data.provider ?? aiStatus.provider,
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
        `Real AI mode: Ä‘Ã£ táº¡o draft PTR há»£p lá»‡ ${validation.value.draftProcessTasks.length} dÃ²ng. HÃ£y review trÆ°á»›c khi Apply.`
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

    if (!canApplyDraft) {
      setMessage("Draft PTR dang co loi blocking Quality Gate. Khong the Apply.");
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
    setCanApplyDraft(false);
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
    setCanApplyDraft(false);
    window.localStorage.removeItem(BRIEF_STORAGE_KEY);
    window.localStorage.removeItem(FILE_METADATA_STORAGE_KEY);
    setMessage("Đã reset brief local và draft preview.");
  }

  const labels = previewLabels[locale];

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
          <div className="flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <label className="flex items-center gap-1">
              <input
                checked={generationMode === "mock"}
                name="input-brief-generation-mode"
                onChange={() => setGenerationMode("mock")}
                type="radio"
              />
              Mock generation
            </label>
            {realAIInputBriefAvailable ? (
              <label className="flex items-center gap-1">
                <input
                  checked={generationMode === "real"}
                  name="input-brief-generation-mode"
                  onChange={() => setGenerationMode("real")}
                  type="radio"
                />
                Real AI generation
              </label>
            ) : null}
          </div>
          <button
            className="rounded bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            disabled={generationMode === "real" && isGeneratingWithAI}
            onClick={() => {
              if (generationMode === "real") {
                void generateDraftPtrWithAI("real");
              } else {
                generateDraftPtr();
              }
            }}
            type="button"
          >
            {generationMode === "real"
              ? isGeneratingWithAI
                ? "Generating with Real AI..."
                : "Generate with Real AI"
              : t("inputBrief.generateDraftProcessTaskRegister", locale)}
          </button>
          {realAIInputBriefAvailable ? (
            <button
              className="rounded border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isGeneratingWithAI}
              onClick={() => {
                setGenerationMode("real");
                void generateDraftPtrWithAI("real");
              }}
              type="button"
            >
              {isGeneratingWithAI ? "Generating..." : "Generate with Real AI"}
            </button>
          ) : null}
        </>
      }
      bodyClassName="p-4"
      description={t("inputBrief.description", locale)}
      title={t("inputBrief.title", locale)}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {briefFields.map((field) => (
          <label
            className="block rounded border border-slate-200 bg-white p-4"
            key={field.key}
          >
            <span className="text-sm font-semibold text-slate-900">
              {t(field.labelKey, locale)}
            </span>
            <span className="mt-1 block text-sm leading-6 text-slate-600">
              {t(field.helperKey, locale)}
            </span>
            <textarea
              className="mt-3 min-h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
              onChange={(event) => updateBriefField(field.key, event.target.value)}
              placeholder={t(field.placeholderKey, locale)}
              rows={field.rows}
              value={brief[field.key]}
            />
          </label>
        ))}
      </div>

      <div className="mt-4 rounded border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">
              File Intake
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Current MVP keeps selected files local unless real AI/cloud mode is explicitly enabled.
              File content is not parsed or uploaded in this phase.
            </p>
          </div>
          <button
            className="w-fit rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={intakeFiles.length === 0}
            onClick={clearSelectedFiles}
            type="button"
          >
            Clear files
          </button>
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-700">
            Select local files
          </span>
          <input
            accept=".xlsx,.docx,.pdf,image/*"
            className="mt-2 block w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800"
            multiple
            onChange={(event) => handleFileSelection(event.target.files)}
            type="file"
          />
        </label>

        {intakeFiles.length > 0 ? (
          <div className="mt-4 overflow-x-auto rounded border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">File name</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Size</th>
                  <th className="px-3 py-2">Last modified</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Action</th>
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
                                "Please re-select the Excel file before extracting. Browser file objects are not persisted after refresh."
                              );
                            }
                          }}
                          type="button"
                        >
                          Extract
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
                              void extractDocxFile(selectedFile);
                            } else {
                              setMessage(
                                "Please re-select the DOCX file before extracting. Browser file objects are not persisted after refresh."
                              );
                            }
                          }}
                          type="button"
                        >
                          Extract
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
                              void extractPdfFile(selectedFile);
                            } else {
                              setMessage(
                                "Please re-select the PDF file before extracting. Browser file objects are not persisted after refresh."
                              );
                            }
                          }}
                          type="button"
                        >
                          Extract
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {excelPreview ? (
          <div className="mt-4 rounded border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
            <p className="font-semibold">Excel extraction preview</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <p>
                Detected sheet:{" "}
                <span className="font-semibold">{excelPreview.detectedSheet}</span>
              </p>
              <p>
                Sheets:{" "}
                <span className="font-semibold">
                  {excelPreview.sheetNames.join(", ")}
                </span>
              </p>
              <p>
                Detected columns:{" "}
                <span className="font-semibold">
                  {excelPreview.detectedColumns.join(", ") || "None"}
                </span>
              </p>
              <p>
                Unmapped columns:{" "}
                <span className="font-semibold">
                  {excelPreview.unmappedColumns.join(", ") || "None"}
                </span>
              </p>
            </div>
            <div className="mt-3">
              <p className="font-semibold">Mapped fields</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {Object.entries(excelPreview.mappedFields).map(
                  ([fieldName, columnName]) => (
                    <span
                      className="rounded border border-sky-200 bg-white px-2 py-1 text-xs font-medium text-sky-900"
                      key={fieldName}
                    >
                      {fieldName}: {columnName}
                    </span>
                  )
                )}
              </div>
            </div>
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
                className="w-fit rounded bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                onClick={generateDraftPtrFromDocxExtraction}
                type="button"
              >
                Generate Draft PTR
              </button>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded border border-violet-200 bg-white p-3">
                <p className="font-semibold">Structured extraction result</p>
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

            <div className="mt-3 rounded border border-violet-200 bg-white p-3">
              <p className="font-semibold">Extracted raw text</p>
              <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-700">
                {docxExtraction.rawText}
              </pre>
            </div>
          </div>
        ) : null}

        {pdfExtraction ? (
          <div className="mt-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
            <p className="font-semibold">PDF text extraction preview</p>
            <p className="mt-1 text-emerald-900">
              Basic text-based local extraction only. OCR is not implemented in this phase.
            </p>
            {pdfExtraction.warnings.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-emerald-900">
                {pdfExtraction.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
            <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded border border-emerald-200 bg-white p-3 text-xs leading-5 text-slate-700">
              {pdfExtraction.rawText}
            </pre>
          </div>
        ) : null}

        {intakeFiles.some((file) => file.status === "unsupported") ? (
          <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            Unsupported file type detected. Supported formats are .xlsx, .docx, .pdf, and image files.
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <span>
          {filledFieldCount}/{briefFields.length}{" "}
          {t("inputBrief.sectionsFilled", locale)}
        </span>
        <span className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700">
          {aiModeLoaded
            ? realAIInputBriefAvailable
              ? `Real AI ready (${aiStatus.provider})`
              : "Mock mode"
            : "Checking AI mode..."}
        </span>
        {message ? <span>{message}</span> : null}
      </div>

      {blockingErrors.length > 0 ? (
        <div className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-semibold">Khong the tao Draft PTR</p>
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
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
                disabled={!canApplyDraft}
                onClick={() => applyDraftPtr("replace")}
                type="button"
              >
                {labels.replaceCurrentPtr}
              </button>
              <button
                className="rounded border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800 hover:bg-sky-100"
                disabled={!canApplyDraft}
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
