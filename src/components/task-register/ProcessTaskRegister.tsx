"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SessionFrame } from "@/components/layout/SessionFrame";
import { saveAuditLogEntry } from "@/lib/audit/audit-log";
import { QAPanel } from "@/components/qa-panel/QAPanel";
import {
  parseProcessTaskRegisterWorkbook,
  type ProcessTaskImportPreview
} from "@/lib/excel/process-task-register-import";
import { createProcessTaskRegisterTemplateWorkbook } from "@/lib/excel/process-task-register-template";
import { generateQaReportMarkdown } from "@/lib/generators/qa-report-generator";
import type { ProcessTask } from "@/lib/models/process-task";
import type { TemplateProfile } from "@/lib/models/template-profile";
import { applyQARecommendation } from "@/lib/qa/apply-recommendation";
import {
  applyRecommendationBatch,
  RecommendationApplyValidationError,
  previewRecommendationBatch
} from "@/lib/recommendation-engine/apply-operations";
import {
  type QaIssue,
  type QARecommendation,
  validateProcessTasks
} from "@/lib/qa/task-register-rules";
import {
  inferChannel,
  inferCustomerInteractionType
} from "@/lib/utils/process-task-inference";
import { getLocale, type Locale } from "@/lib/i18n";
import {
  sampleBpmnTemplateProfile,
  sampleProcessTasks,
  sampleServiceBlueprintTemplateProfile,
  sampleWorkspace
} from "@/lib/sample-data/sme-online-loan";
import { corporateAccountOpeningProcessTasks } from "@/lib/sample-data/corporate-account-opening";

const STORAGE_KEY = "process-blueprint-ai-workbench:process-tasks";
const SAMPLE_PROCESS_STORAGE_KEY =
  "process-blueprint-ai-workbench:selected-sample-process";
const TEMPLATES_STORAGE_KEY =
  "process-blueprint-ai-workbench:template-profiles";
const D01_STORAGE_KEY = "process-blueprint-ai-workbench:selected-d01-template";
const D02_STORAGE_KEY = "process-blueprint-ai-workbench:selected-d02-template";
const D01_GENERATED_STATUS_KEY =
  "process-blueprint-ai-workbench:generated-d01-bpmn-status";
const D02_GENERATED_STATUS_KEY =
  "process-blueprint-ai-workbench:generated-d02-service-blueprint-status";
const ARTIFACT_STATUS_EVENT = "process-blueprint-artifact-status-change";
const PROCESS_TASKS_EVENT = "process-blueprint-process-tasks-change";
const LOCALE_EVENT = "process-blueprint-locale-change";

const ptrText = {
  vi: {
    title: "Process Task Register",
    description: "Dữ liệu có thể sửa trực tiếp trong bảng. Bấm Lưu để giữ lại sau khi refresh trình duyệt.",
    saveChanges: "Lưu thay đổi",
    more: "Thêm",
    addRow: "Thêm dòng",
    resetSample: "Đặt lại mẫu",
    exportExcel: "Xuất Excel",
    importExcel: "Nhập Excel",
    downloadExcelTemplate: "Tải mẫu Excel",
    exportJson: "Xuất JSON",
    sample: "Mẫu",
    autoSuggest: "Tự gợi ý trường tương tác",
    aiAssistant: "Trợ lý AI",
    aiNoRows: "Chưa có dòng nào trong Process Task Register để AI rà soát.",
    aiRunning: "Đang chạy AI Assistant...",
    aiNoRecommendations: "Trợ lý AI không trả đề xuất nào cho phạm vi đã rà soát.",
    aiRecommendationsReady: "Trợ lý AI đã tạo đề xuất trong bảng QA.",
    aiUsingLocalFallback: "Đang dùng local/mock fallback. Nếu muốn gọi provider ngoài, hãy cấu hình nhà cung cấp trong Trung tâm kết nối AI.",
    normalizeRows: "Chuẩn hóa dòng đã chọn",
    inferActorSystemLane: "Suy luận vai trò/hệ thống/lane còn thiếu",
    improveTaskWording: "Cải thiện cách viết công việc",
    suggestSplitTask: "Gợi ý tách công việc phức tạp",
    generateInputOutput: "Tạo đầu vào/đầu ra còn thiếu",
    suggestInteractionChannel: "Gợi ý customerInteractionType/channel",
    rowActions: "Thao tác",
    duplicateRow: "Nhân bản",
    deleteRow: "Xóa",
    simpleMode: "Đơn giản",
    advancedMode: "Nâng cao",
    simpleModeHelper: "Chế độ Đơn giản chỉ hiện các cột nghiệp vụ dễ đọc.",
    advancedModeHelper: "Chế độ Nâng cao hiện toàn bộ trường kỹ thuật của ProcessTask.",
    saved: "Đã lưu",
    unsaved: "Có thay đổi chưa lưu",
    saving: "Đang lưu",
    selectRows: "Chọn dòng",
    selectedRows: "dòng đã chọn",
    oneRow: "Một dòng = một công việc, gateway, event hoặc data interaction.",
    gateway: "Gateway phải có câu hỏi điều kiện và đủ nhánh yes/no.",
    systemData: "Hệ thống/dữ liệu phải giữ liên kết với hành trình người dùng.",
    totalRows: "Tổng dòng",
    gatewayCount: "Gateway"
  },
  en: {
    title: "Process Task Register",
    description: "Data can be edited directly in the table. Click Save to keep it after browser refresh.",
    saveChanges: "Save changes",
    more: "More",
    addRow: "Add row",
    resetSample: "Reset sample",
    exportExcel: "Export Excel",
    importExcel: "Import Excel",
    downloadExcelTemplate: "Download Excel template",
    exportJson: "Export JSON",
    sample: "Sample",
    autoSuggest: "Auto-suggest interaction fields",
    aiAssistant: "AI Assistant",
    aiNoRows: "There are no Process Task Register rows for AI to review.",
    aiRunning: "Running AI Assistant...",
    aiNoRecommendations: "AI Assistant did not return recommendations for the reviewed scope.",
    aiRecommendationsReady: "AI Assistant created recommendations in the QA Panel.",
    aiUsingLocalFallback: "Using local/mock fallback. Configure a provider in AI Connection Center to call an external provider.",
    normalizeRows: "Normalize selected rows",
    inferActorSystemLane: "Infer missing actor/system/lane",
    improveTaskWording: "Improve task wording",
    suggestSplitTask: "Suggest split complex task",
    generateInputOutput: "Generate missing input/output",
    suggestInteractionChannel: "Suggest customerInteractionType/channel",
    rowActions: "Actions",
    duplicateRow: "Duplicate",
    deleteRow: "Delete",
    simpleMode: "Simple",
    advancedMode: "Advanced",
    simpleModeHelper: "Simple mode shows business-readable columns only.",
    advancedModeHelper: "Advanced mode shows the full technical ProcessTask field set.",
    saved: "Saved",
    unsaved: "Unsaved changes",
    saving: "Saving",
    selectRows: "Select rows",
    selectedRows: "selected rows",
    oneRow: "One row = one task, gateway, event, or data interaction.",
    gateway: "Gateways must include a condition question and complete yes/no branches.",
    systemData: "System/data fields should stay linked to the user journey.",
    totalRows: "Total rows",
    gatewayCount: "Gateways"
  }
} satisfies Record<Locale, Record<string, string>>;

const ptrDetailText = {
  vi: {
    viewDetails: "Xem chi tiết",
    rowDetails: "Chi tiết dòng",
    rowDetailsDescription:
      "Xem toàn bộ trường của dòng này mà không cần chuyển sang chế độ Nâng cao.",
    closeDetails: "Đóng",
    emptyValue: "Chưa có dữ liệu"
  },
  en: {
    viewDetails: "Details",
    rowDetails: "Row details",
    rowDetailsDescription: "Review every field for this row without switching to Advanced mode.",
    closeDetails: "Close",
    emptyValue: "Not set"
  }
} satisfies Record<Locale, Record<string, string>>;

type EditableColumn = {
  key: keyof ProcessTask;
  label: string;
  minWidth: string;
};

type SelectOption = {
  value: string;
  label: string;
};

const processTaskColumnLabels = {
  vi: {
    id: "ID",
    stepId: "Mã bước",
    parentStepId: "Mã bước cha",
    rowType: "Loại dòng",
    bpmnType: "Loại BPMN",
    taskNature: "Tính chất công việc",
    phase: "Giai đoạn",
    group: "Nhóm",
    customerInteractionType: "Loại tương tác khách hàng",
    channel: "Kênh",
    actor: "Người thực hiện",
    actorLane: "Làn người dùng",
    system: "Hệ thống",
    systemLane: "Làn hệ thống",
    dataObject: "Đối tượng dữ liệu",
    dataAction: "Thao tác dữ liệu",
    taskName: "Tên công việc",
    input: "Đầu vào",
    output: "Đầu ra",
    defaultNextStep: "Bước tiếp theo",
    conditionQuestion: "Câu hỏi điều kiện",
    yesNextStep: "Nếu Có",
    noNextStep: "Nếu Không",
    exception: "Ngoại lệ",
    exceptionHandling: "Xử lý ngoại lệ",
    sla: "SLA",
    riskControl: "Rủi ro/Kiểm soát",
    sourceRef: "Nguồn tham chiếu",
    reviewStatus: "Trạng thái rà soát",
    comment: "Ghi chú"
  },
  en: {
    id: "ID",
    stepId: "Step ID",
    parentStepId: "Parent step ID",
    rowType: "Row type",
    bpmnType: "BPMN type",
    taskNature: "Task nature",
    phase: "Phase",
    group: "Group",
    customerInteractionType: "Customer interaction type",
    channel: "Channel",
    actor: "Actor",
    actorLane: "Actor lane",
    system: "System",
    systemLane: "System lane",
    dataObject: "Data object",
    dataAction: "Data action",
    taskName: "Task name",
    input: "Input",
    output: "Output",
    defaultNextStep: "Next step",
    conditionQuestion: "Condition question",
    yesNextStep: "If Yes",
    noNextStep: "If No",
    exception: "Exception",
    exceptionHandling: "Exception handling",
    sla: "SLA",
    riskControl: "Risk/Control",
    sourceRef: "Source reference",
    reviewStatus: "Review status",
    comment: "Comment"
  }
} satisfies Record<Locale, Record<keyof ProcessTask, string>>;

type SampleProcessId = "sme-online-loan" | "corporate-account-opening";

type PtrAIAssistantActionId =
  | "normalize-selected-rows"
  | "infer-missing-actor-system-lane"
  | "improve-task-wording"
  | "suggest-split-complex-task"
  | "generate-missing-input-output"
  | "suggest-interaction-channel";

const PTR_AI_ASSISTANT_SKILL_ID = "process-improvement-recommendation";

const ptrAIAssistantActions: Array<{
  id: PtrAIAssistantActionId;
  textKey: keyof typeof ptrText.vi;
}> = [
  { id: "normalize-selected-rows", textKey: "normalizeRows" },
  { id: "infer-missing-actor-system-lane", textKey: "inferActorSystemLane" },
  { id: "improve-task-wording", textKey: "improveTaskWording" },
  { id: "suggest-split-complex-task", textKey: "suggestSplitTask" },
  { id: "generate-missing-input-output", textKey: "generateInputOutput" },
  { id: "suggest-interaction-channel", textKey: "suggestInteractionChannel" }
];

const DEFAULT_PTR_AI_ASSISTANT_ACTION_ID: PtrAIAssistantActionId =
  "improve-task-wording";

const visibleColumns: EditableColumn[] = [
  { key: "stepId", label: "Mã bước", minWidth: "110px" },
  { key: "rowType", label: "Loại dòng", minWidth: "120px" },
  { key: "bpmnType", label: "Loại BPMN", minWidth: "150px" },
  { key: "taskNature", label: "Tính chất", minWidth: "150px" },
  { key: "phase", label: "Giai đoạn", minWidth: "170px" },
  { key: "customerInteractionType", label: "Loại tương tác KH", minWidth: "210px" },
  { key: "channel", label: "Kênh", minWidth: "160px" },
  { key: "actor", label: "Người thực hiện", minWidth: "160px" },
  { key: "actorLane", label: "Lane người dùng", minWidth: "160px" },
  { key: "system", label: "Hệ thống", minWidth: "190px" },
  { key: "systemLane", label: "Lane hệ thống", minWidth: "150px" },
  { key: "taskName", label: "Tên công việc", minWidth: "280px" },
  { key: "input", label: "Đầu vào", minWidth: "260px" },
  { key: "output", label: "Đầu ra", minWidth: "260px" },
  { key: "dataAction", label: "Thao tác dữ liệu", minWidth: "150px" },
  { key: "dataObject", label: "Đối tượng dữ liệu", minWidth: "230px" },
  { key: "defaultNextStep", label: "Bước tiếp theo", minWidth: "150px" },
  { key: "conditionQuestion", label: "Câu hỏi điều kiện", minWidth: "260px" },
  { key: "yesNextStep", label: "Nếu Có", minWidth: "120px" },
  { key: "noNextStep", label: "Nếu Không", minWidth: "120px" },
  { key: "reviewStatus", label: "Trạng thái review", minWidth: "160px" },
  { key: "comment", label: "Ghi chú", minWidth: "220px" }
];

const simpleColumnKeys: Array<keyof ProcessTask> = [
  "stepId",
  "taskName",
  "actor",
  "system",
  "phase",
  "defaultNextStep",
  "reviewStatus"
];

type ColumnMode = "simple" | "advanced";
type SaveState = "saved" | "unsaved" | "saving";

const excelColumns: Array<Pick<EditableColumn, "key" | "label">> = [
  { key: "id", label: "ID" },
  { key: "stepId", label: "Mã bước" },
  { key: "parentStepId", label: "Mã bước cha" },
  { key: "rowType", label: "Loại dòng" },
  { key: "bpmnType", label: "Loại BPMN" },
  { key: "taskNature", label: "Tính chất công việc" },
  { key: "phase", label: "Giai đoạn" },
  { key: "group", label: "Nhóm" },
  { key: "actor", label: "Người thực hiện" },
  { key: "actorLane", label: "Lane người dùng" },
  { key: "system", label: "Hệ thống" },
  { key: "systemLane", label: "Lane hệ thống" },
  { key: "dataObject", label: "Đối tượng dữ liệu" },
  { key: "dataAction", label: "Thao tác dữ liệu" },
  { key: "taskName", label: "Tên công việc" },
  { key: "input", label: "Đầu vào" },
  { key: "output", label: "Đầu ra" },
  { key: "defaultNextStep", label: "Bước tiếp theo mặc định" },
  { key: "conditionQuestion", label: "Câu hỏi điều kiện" },
  { key: "yesNextStep", label: "Bước tiếp theo nếu Có" },
  { key: "noNextStep", label: "Bước tiếp theo nếu Không" },
  { key: "exception", label: "Ngoại lệ" },
  { key: "exceptionHandling", label: "Xử lý ngoại lệ" },
  { key: "sla", label: "SLA" },
  { key: "riskControl", label: "Rủi ro/Kiểm soát" },
  { key: "sourceRef", label: "Nguồn tham chiếu" },
  { key: "reviewStatus", label: "Trạng thái review" },
  { key: "comment", label: "Ghi chú" },
  { key: "customerInteractionType", label: "Loại tương tác khách hàng" },
  { key: "channel", label: "Kênh" }
];

const nullableColumns: Array<keyof ProcessTask> = [
  "parentStepId",
  "defaultNextStep",
  "yesNextStep",
  "noNextStep"
];

const selectOptions: Partial<Record<keyof ProcessTask, SelectOption[]>> = {
  rowType: [
    { value: "task", label: "Task" },
    { value: "gateway", label: "Gateway" },
    { value: "start", label: "Start" },
    { value: "end", label: "End" },
    { value: "event", label: "Event" },
    { value: "data", label: "Data interaction" },
    { value: "phase", label: "Phase" },
    { value: "group", label: "Group" },
    { value: "annotation", label: "Annotation" }
  ],
  bpmnType: [
    { value: "startEvent", label: "Start Event" },
    { value: "endEvent", label: "End Event" },
    { value: "userTask", label: "User Task" },
    { value: "manualTask", label: "Manual Task" },
    { value: "serviceTask", label: "Service Task" },
    { value: "sendTask", label: "Send Task" },
    { value: "businessRuleTask", label: "Business Rule Task" },
    { value: "scriptTask", label: "Script Task" },
    { value: "exclusiveGateway", label: "Exclusive Gateway" },
    { value: "parallelGateway", label: "Parallel Gateway" },
    { value: "inclusiveGateway", label: "Inclusive Gateway" },
    { value: "dataObject", label: "Data Object" },
    { value: "dataStore", label: "Data Store" },
    { value: "task", label: "Generic Task" },
    { value: "none", label: "None" }
  ],
  taskNature: [
    { value: "manual", label: "Manual" },
    { value: "automatic", label: "Automatic" },
    { value: "semiAutomatic", label: "Semi-automatic" },
    { value: "system", label: "System" },
    { value: "decision", label: "Decision" },
    { value: "approval", label: "Approval" },
    { value: "integration", label: "Integration" },
    { value: "notification", label: "Notification" },
    { value: "control", label: "Control" },
    { value: "data", label: "Data" }
  ],
  dataAction: [
    { value: "none", label: "None" },
    { value: "pull", label: "Pull" },
    { value: "push", label: "Push" },
    { value: "store", label: "Store" },
    { value: "create", label: "Create" },
    { value: "read", label: "Read" },
    { value: "update", label: "Update" },
    { value: "delete", label: "Delete" },
    { value: "validate", label: "Validate" },
    { value: "approve", label: "Approve" },
    { value: "reject", label: "Reject" },
    { value: "send", label: "Send" },
    { value: "receive", label: "Receive" }
  ],
  reviewStatus: [
    { value: "draft", label: "Draft" },
    { value: "needsReview", label: "Needs review" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" }
  ],
  customerInteractionType: [
    { value: "None", label: "None" },
    { value: "Customer Action", label: "Customer Action" },
    { value: "Front-stage People", label: "Front-stage People" },
    { value: "Front-stage System", label: "Front-stage System" },
    { value: "Back-stage People", label: "Back-stage People" },
    { value: "Back-stage System", label: "Back-stage System" },
    { value: "Support Process", label: "Support Process" },
    { value: "Data / Control", label: "Data / Control" }
  ],
  channel: [
    { value: "Portal", label: "Portal" },
    { value: "Mobile App", label: "Mobile App" },
    { value: "Email", label: "Email" },
    { value: "SMS", label: "SMS" },
    { value: "Phone Call", label: "Phone Call" },
    { value: "RM Meeting", label: "RM Meeting" },
    { value: "Branch", label: "Branch" },
    { value: "LOS", label: "LOS" },
    { value: "OCR", label: "OCR" },
    { value: "CIC", label: "CIC" },
    { value: "Internal System", label: "Internal System" },
    { value: "Document Store", label: "Document Store" },
    { value: "Other", label: "Other" }
  ]
};

const bpmnTypeOptionsByRowType: Record<string, SelectOption[]> = {
  task: [
    { value: "userTask", label: "User Task" },
    { value: "manualTask", label: "Manual Task" },
    { value: "serviceTask", label: "Service Task" },
    { value: "sendTask", label: "Send Task" },
    { value: "businessRuleTask", label: "Business Rule Task" },
    { value: "scriptTask", label: "Script Task" },
    { value: "task", label: "Generic Task" }
  ],
  gateway: [
    { value: "exclusiveGateway", label: "Exclusive Gateway" },
    { value: "parallelGateway", label: "Parallel Gateway" },
    { value: "inclusiveGateway", label: "Inclusive Gateway" }
  ],
  start: [
    { value: "startEvent", label: "Start Event" }
  ],
  end: [
    { value: "endEvent", label: "End Event" }
  ],
  event: [
    { value: "startEvent", label: "Start Event" },
    { value: "endEvent", label: "End Event" },
    { value: "none", label: "None" }
  ],
  data: [
    { value: "dataObject", label: "Data Object" },
    { value: "dataStore", label: "Data Store" },
    { value: "none", label: "None" }
  ],
  phase: [
    { value: "none", label: "None" }
  ],
  group: [
    { value: "none", label: "None" }
  ],
  annotation: [
    { value: "none", label: "None" }
  ]
};

const sampleProcessOptions: Array<{
  id: SampleProcessId;
  label: string;
  tasks: ProcessTask[];
}> = [
  {
    id: "sme-online-loan",
    label: "SME Online Loan",
    tasks: sampleProcessTasks
  },
  {
    id: "corporate-account-opening",
    label: "Corporate Account Opening",
    tasks: corporateAccountOpeningProcessTasks
  }
];

function getSampleProcess(sampleId: string | null | undefined) {
  return (
    sampleProcessOptions.find((sampleProcess) => sampleProcess.id === sampleId) ??
    sampleProcessOptions[0]
  );
}

function cloneSampleTasks(sampleId?: string | null) {
  return getSampleProcess(sampleId).tasks.map((task) => ({ ...task }));
}

function createEmptyTask(index: number): ProcessTask {
  const stepNumber = String(index + 1).padStart(3, "0");

  return {
    id: `task-new-${Date.now()}`,
    stepId: `S${stepNumber}`,
    parentStepId: null,
    rowType: "task",
    bpmnType: "userTask",
    taskNature: "manual",
    phase: "",
    group: "",
    customerInteractionType: "None",
    channel: "Other",
    actor: "",
    actorLane: "",
    system: "",
    systemLane: "",
    dataObject: "",
    dataAction: "none",
    taskName: "",
    input: "",
    output: "",
    defaultNextStep: null,
    conditionQuestion: "",
    yesNextStep: null,
    noNextStep: null,
    exception: "",
    exceptionHandling: "",
    sla: "",
    riskControl: "",
    sourceRef: "",
    reviewStatus: "draft",
    comment: ""
  };
}

function getCellValue(task: ProcessTask, key: keyof ProcessTask) {
  if (key === "customerInteractionType") {
    return task.customerInteractionType ?? "None";
  }

  if (key === "channel") {
    return task.channel ?? "Other";
  }

  return task[key] ?? "";
}

function getBpmnTypeOptionsForRowType(rowType: string) {
  return bpmnTypeOptionsByRowType[rowType] ?? selectOptions.bpmnType ?? [];
}

function getSelectOptions(key: keyof ProcessTask, value: string, task: ProcessTask) {
  const options =
    key === "bpmnType"
      ? getBpmnTypeOptionsForRowType(String(getCellValue(task, "rowType")))
      : selectOptions[key];

  if (!options) {
    return [];
  }

  if (!value || options.some((option) => option.value === value)) {
    return options;
  }

  return [
    { value, label: `${value} (không hợp lệ)` },
    ...options
  ];
}

function isInvalidSelectValue(key: keyof ProcessTask, value: string, task: ProcessTask) {
  const options =
    key === "bpmnType"
      ? getBpmnTypeOptionsForRowType(String(getCellValue(task, "rowType")))
      : selectOptions[key];

  return Boolean(value && options && !options.some((option) => option.value === value));
}

function getDefaultBpmnTypeForRowType(rowType: string) {
  return getBpmnTypeOptionsForRowType(rowType)[0]?.value ?? "none";
}

function isBpmnTypeValidForRowType(rowType: string, bpmnType: string) {
  return getBpmnTypeOptionsForRowType(rowType).some((option) => option.value === bpmnType);
}

function normalizeCellValue(key: keyof ProcessTask, value: string) {
  if (nullableColumns.includes(key) && value.trim() === "") {
    return null;
  }

  return value;
}

function createTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function readTemplateProfiles() {
  const savedTemplates = window.localStorage.getItem(TEMPLATES_STORAGE_KEY);

  if (!savedTemplates) {
    return [sampleBpmnTemplateProfile, sampleServiceBlueprintTemplateProfile];
  }

  try {
    const parsedTemplates = JSON.parse(savedTemplates);

    if (Array.isArray(parsedTemplates)) {
      return parsedTemplates as TemplateProfile[];
    }
  } catch {
    return [sampleBpmnTemplateProfile, sampleServiceBlueprintTemplateProfile];
  }

  return [sampleBpmnTemplateProfile, sampleServiceBlueprintTemplateProfile];
}

function markGeneratedArtifactsStale() {
  window.localStorage.setItem(D01_GENERATED_STATUS_KEY, "stale");
  window.localStorage.setItem(D02_GENERATED_STATUS_KEY, "stale");
  window.dispatchEvent(new Event(ARTIFACT_STATUS_EVENT));
}

function persistTasks(nextTasks: ProcessTask[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTasks));
  return nextTasks;
}

function formatRecommendationApplyError(error: unknown, locale: Locale) {
  if (error instanceof RecommendationApplyValidationError) {
    return locale === "vi"
      ? `Không thể áp dụng recommendation. ${error.messages.join(" ")}`
      : `Could not apply recommendation. ${error.messages.join(" ")}`;
  }

  return locale === "vi"
    ? "Không thể áp dụng recommendation vì dữ liệu sau khi áp dụng không hợp lệ."
    : "Could not apply recommendation because the data after applying is invalid.";
}

function isEmptyInteractionType(task: ProcessTask) {
  return !task.customerInteractionType || task.customerInteractionType === "None";
}

function isEmptyChannel(task: ProcessTask) {
  return !task.channel || task.channel === "Other";
}

export function ProcessTaskRegister() {
  const [locale, setActiveLocale] = useState<Locale>("vi");
  const [tasks, setTasks] = useState<ProcessTask[]>(() => cloneSampleTasks());
  const [selectedSampleProcessId, setSelectedSampleProcessId] =
    useState<SampleProcessId>("sme-online-loan");
  const [saveMessage, setSaveMessage] = useState("");
  const [highlightedStepId, setHighlightedStepId] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<ProcessTaskImportPreview | null>(null);
  const [isRegisterMoreMenuOpen, setIsRegisterMoreMenuOpen] = useState(false);
  const [isRunningPtrAI, setIsRunningPtrAI] = useState(false);
  const [selectedStepIds, setSelectedStepIds] = useState<Set<string>>(() => new Set());
  const [columnMode, setColumnMode] = useState<ColumnMode>("simple");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [ptrAiIssues, setPtrAiIssues] = useState<QaIssue[]>([]);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const saveStateTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setActiveLocale(getLocale());

    function loadSavedTasks() {
      const savedTasks = window.localStorage.getItem(STORAGE_KEY);

      if (!savedTasks) {
        return false;
      }

      try {
        const parsedTasks = JSON.parse(savedTasks);

        if (Array.isArray(parsedTasks)) {
          setTasks(parsedTasks as ProcessTask[]);
          markSaved();
          return true;
        }
      } catch {
        setSaveMessage(
          locale === "vi"
            ? "Dữ liệu đã lưu không hợp lệ. Đang dùng dữ liệu mẫu."
            : "Saved data is invalid. Sample data is being used."
        );
      }

      return false;
    }

    const savedSampleProcess = getSampleProcess(
      window.localStorage.getItem(SAMPLE_PROCESS_STORAGE_KEY)
    );
    setSelectedSampleProcessId(savedSampleProcess.id);

    if (!loadSavedTasks()) {
      setTasks(cloneSampleTasks(savedSampleProcess.id));
    }

    window.addEventListener(PROCESS_TASKS_EVENT, loadSavedTasks);

    return () => {
      window.removeEventListener(PROCESS_TASKS_EVENT, loadSavedTasks);
      if (saveStateTimeoutRef.current) {
        window.clearTimeout(saveStateTimeoutRef.current);
      }
    };
  }, []);

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
    setPtrAiIssues([]);
    setSelectedStepIds((currentStepIds) => {
      const validStepIds = new Set(tasks.map((task) => task.stepId));
      const nextStepIds = new Set(
        [...currentStepIds].filter((stepId) => validStepIds.has(stepId))
      );

      return nextStepIds.size === currentStepIds.size ? currentStepIds : nextStepIds;
    });
  }, [tasks]);

  useEffect(() => {
    if (detailTaskId && !tasks.some((task) => task.id === detailTaskId)) {
      setDetailTaskId(null);
    }
  }, [detailTaskId, tasks]);

  const gatewayCount = useMemo(
    () => tasks.filter((task) => task.rowType === "gateway").length,
    [tasks]
  );

  const qaIssues = useMemo(() => validateProcessTasks(tasks), [tasks]);
  const displayQaIssues = useMemo(
    () => [...ptrAiIssues, ...qaIssues],
    [ptrAiIssues, qaIssues]
  );
  const selectedTasks = useMemo(
    () => tasks.filter((task) => selectedStepIds.has(task.stepId)),
    [selectedStepIds, tasks]
  );
  const displayedColumns = useMemo(
    () => {
      const baseColumns =
        columnMode === "advanced"
          ? visibleColumns
          : simpleColumnKeys
              .map((key) => visibleColumns.find((column) => column.key === key))
              .filter((column): column is EditableColumn => Boolean(column));

      return baseColumns.map((column) => ({
        ...column,
        label: processTaskColumnLabels[locale][column.key]
      }));
    },
    [columnMode, locale]
  );
  const detailTask = useMemo(
    () => tasks.find((task) => task.id === detailTaskId) ?? null,
    [detailTaskId, tasks]
  );
  const activeSampleProcess = getSampleProcess(selectedSampleProcessId);
  const text = ptrText[locale];
  const detailText = ptrDetailText[locale];
  const modeHelper =
    columnMode === "simple" ? text.simpleModeHelper : text.advancedModeHelper;
  const saveStateStyles: Record<SaveState, string> = {
    saved: "status-badge status-badge-success",
    unsaved: "status-badge status-badge-warning",
    saving: "status-badge status-badge-primary"
  };

  function markUnsaved() {
    if (saveStateTimeoutRef.current) {
      window.clearTimeout(saveStateTimeoutRef.current);
      saveStateTimeoutRef.current = null;
    }

    setSaveState("unsaved");
  }

  function markSaved() {
    if (saveStateTimeoutRef.current) {
      window.clearTimeout(saveStateTimeoutRef.current);
      saveStateTimeoutRef.current = null;
    }

    setSaveState("saved");
  }

  function focusIssueRow(stepId: string) {
    setHighlightedStepId(stepId);
    document
      .getElementById(`process-task-row-${stepId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function toggleSelectedRow(stepId: string) {
    setSelectedStepIds((currentStepIds) => {
      const nextStepIds = new Set(currentStepIds);

      if (nextStepIds.has(stepId)) {
        nextStepIds.delete(stepId);
      } else {
        nextStepIds.add(stepId);
      }

      return nextStepIds;
    });
  }

  function toggleAllRows() {
    setSelectedStepIds((currentStepIds) =>
      currentStepIds.size === tasks.length
        ? new Set()
        : new Set(tasks.map((task) => task.stepId))
    );
  }

  function chooseDefaultPtrAIAssistantAction(): PtrAIAssistantActionId {
    const scopeTasks = selectedTasks.length > 0 ? selectedTasks : tasks;

    if (scopeTasks.length === 0) {
      return DEFAULT_PTR_AI_ASSISTANT_ACTION_ID;
    }

    if (
      scopeTasks.some(
        (task) =>
          !String(task.actor ?? "").trim() ||
          !String(task.system ?? "").trim() ||
          !String(task.actorLane ?? "").trim() ||
          !String(task.systemLane ?? "").trim()
      )
    ) {
      return "infer-missing-actor-system-lane";
    }

    if (
      scopeTasks.some(
        (task) => !String(task.input ?? "").trim() || !String(task.output ?? "").trim()
      )
    ) {
      return "generate-missing-input-output";
    }

    if (
      scopeTasks.some((task) => {
        const taskName = String(task.taskName ?? "");
        return taskName.length > 90 || /\b(and|then|và|rồi|sau đó)\b/i.test(taskName);
      })
    ) {
      return "suggest-split-complex-task";
    }

    if (
      scopeTasks.some(
        (task) => isEmptyInteractionType(task) || !String(task.channel ?? "").trim()
      )
    ) {
      return "suggest-interaction-channel";
    }

    return DEFAULT_PTR_AI_ASSISTANT_ACTION_ID;
  }

  async function runPtrAIAssistantAction(actionId: PtrAIAssistantActionId) {
    const scopeTasks = selectedTasks.length > 0 ? selectedTasks : tasks;
    const isSelectedScope = selectedTasks.length > 0;

    if (scopeTasks.length === 0) {
      setSaveMessage(text.aiNoRows);
      return;
    }

    setIsRunningPtrAI(true);
    setSaveMessage(text.aiRunning);

    try {
      const response = await fetch("/api/ai/run-skill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          skillId: PTR_AI_ASSISTANT_SKILL_ID,
          payload: {
            processTasks: tasks,
            templateProfiles: readTemplateProfiles(),
            targetStepIds: scopeTasks.map((task) => task.stepId),
            metadata: {
              ptrAiAction: actionId,
              selectedOnly: isSelectedScope,
              selectedRowCount: selectedTasks.length,
              scope: isSelectedScope ? "selected-rows" : "full-table",
              scopeRowCount: scopeTasks.length
            }
          }
        })
      });
      const data = (await response.json()) as {
        ok?: boolean;
        mode?: "mock" | "provider-backed";
        result?: {
          recommendations?: QARecommendation[];
        };
        error?: string;
        validationErrors?: string[];
        meta?: {
          externalApiCalled?: boolean;
        };
      };

      if (!response.ok || !data.ok) {
        setPtrAiIssues([]);
        setSaveMessage(
          [data.error ?? "PTR AI Assistant failed.", ...(data.validationErrors ?? [])].join(" ")
        );
        saveAuditLogEntry({
          action: "ai_call",
          status: "failure",
          summary: "PTR AI Assistant request failed.",
          metadata: {
            skillId: PTR_AI_ASSISTANT_SKILL_ID,
            actionId,
            selectedRowCount: selectedTasks.length,
            scope: isSelectedScope ? "selected-rows" : "full-table",
            scopeRowCount: scopeTasks.length,
            externalApiCalled: data.meta?.externalApiCalled === true
          }
        });
        return;
      }

      const recommendations = (data.result?.recommendations ?? []).map(
        (recommendation) => ({
          ...recommendation,
          source: "ai" as const,
          requiresConfirmation: true
        })
      );

      if (recommendations.length === 0) {
        setPtrAiIssues([]);
        setSaveMessage(text.aiNoRecommendations);
        return;
      }

      const firstScopeTask = scopeTasks[0];

      setPtrAiIssues([
        {
          id: `ptr-ai-assistant-${actionId}-${Date.now()}`,
          issueCode:
            actionId === "suggest-split-complex-task"
              ? "MULTI_ACTION_TASK"
              : "SERVICE_BLUEPRINT_CARD_READINESS",
          stepId: firstScopeTask.stepId,
          taskName: firstScopeTask.taskName || firstScopeTask.stepId,
          severity: "suggestion",
          message: `${text.aiAssistant}: ${text[ptrAIAssistantActions.find((action) => action.id === actionId)?.textKey ?? "aiAssistant"]}`,
          suggestedFix:
            locale === "vi"
              ? "Review đề xuất AI trong panel này, sau đó chỉ áp dụng các mục đã chọn sau khi xác nhận."
              : "Review the AI recommendations in this panel, then apply selected items only after confirmation.",
          recommendations
        }
      ]);
      setSaveMessage(
        `${text.aiRecommendationsReady} (${recommendations.length}; ${
          data.mode === "provider-backed" ? "provider-backed" : "mock/local"
        })${data.meta?.externalApiCalled === true ? "" : ` ${text.aiUsingLocalFallback}`}`
      );
      saveAuditLogEntry({
        action: "ai_call",
        status: "success",
        summary: "PTR AI Assistant generated recommendations.",
        metadata: {
          skillId: PTR_AI_ASSISTANT_SKILL_ID,
          actionId,
          selectedRowCount: selectedTasks.length,
          scope: isSelectedScope ? "selected-rows" : "full-table",
          scopeRowCount: scopeTasks.length,
          recommendationCount: recommendations.length,
          mode: data.mode ?? "mock",
          externalApiCalled: data.meta?.externalApiCalled === true
        }
      });
    } catch {
      setPtrAiIssues([]);
      setSaveMessage(
        locale === "vi"
          ? "Yêu cầu PTR AI Assistant thất bại. Chưa áp dụng thay đổi nào."
          : "PTR AI Assistant request failed. No change was applied."
      );
      saveAuditLogEntry({
        action: "ai_call",
        status: "failure",
        summary: "PTR AI Assistant network request failed.",
        metadata: {
          skillId: PTR_AI_ASSISTANT_SKILL_ID,
          actionId,
          selectedRowCount: selectedTasks.length,
          scope: isSelectedScope ? "selected-rows" : "full-table",
          scopeRowCount: scopeTasks.length,
          externalApiCalled: false
        }
      });
    } finally {
      setIsRunningPtrAI(false);
    }
  }

  function updateCell(index: number, key: keyof ProcessTask, value: string) {
    setTasks((currentTasks) =>
      persistTasks(
        currentTasks.map((task, taskIndex) => {
          if (taskIndex !== index) {
            return task;
          }

          const updatedTask = {
            ...task,
            [key]: normalizeCellValue(key, value)
          } as ProcessTask;

          if (
            key === "rowType" &&
            !isBpmnTypeValidForRowType(value, String(updatedTask.bpmnType))
          ) {
            updatedTask.bpmnType = getDefaultBpmnTypeForRowType(value) as ProcessTask["bpmnType"];
          }

          return updatedTask;
        })
      )
    );
    markGeneratedArtifactsStale();
    markUnsaved();
    setSaveMessage(text.unsaved);
  }

  function addRow() {
    setTasks((currentTasks) =>
      persistTasks([
        ...currentTasks,
        createEmptyTask(currentTasks.length)
      ])
    );
    markGeneratedArtifactsStale();
    markUnsaved();
    setSaveMessage(
      locale === "vi"
        ? "Đã thêm dòng mới. Bấm Lưu để giữ sau khi refresh."
        : "Added a new row. Click Save to keep it after refresh."
    );
  }

  function duplicateRow(index: number) {
    setTasks((currentTasks) => {
      const sourceTask = currentTasks[index];

      if (!sourceTask) {
        return currentTasks;
      }

      const duplicatedTask: ProcessTask = {
        ...sourceTask,
        id: `${sourceTask.id}-copy-${Date.now()}`,
        stepId: `${sourceTask.stepId}-copy`
      };

      return persistTasks([
        ...currentTasks.slice(0, index + 1),
        duplicatedTask,
        ...currentTasks.slice(index + 1)
      ]);
    });
    markGeneratedArtifactsStale();
    markUnsaved();
    setSaveMessage(
      locale === "vi"
        ? "Đã nhân bản dòng. Bấm Lưu để giữ sau khi refresh."
        : "Duplicated the row. Click Save to keep it after refresh."
    );
  }

  function deleteRow(index: number) {
    setTasks((currentTasks) =>
      persistTasks(currentTasks.filter((_, taskIndex) => taskIndex !== index))
    );
    markGeneratedArtifactsStale();
    markUnsaved();
    setSaveMessage(
      locale === "vi"
        ? "Đã xóa dòng. Bấm Lưu để giữ sau khi refresh."
        : "Deleted the row. Click Save to keep it after refresh."
    );
  }

  function saveTasks() {
    setSaveState("saving");
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    markGeneratedArtifactsStale();
    saveStateTimeoutRef.current = window.setTimeout(() => {
      setSaveState("saved");
      saveStateTimeoutRef.current = null;
    }, 350);
    setSaveMessage(
      locale === "vi" ? "Đã lưu vào localStorage." : "Saved to localStorage."
    );
  }

  function resetTasks() {
    const sampleTasks = cloneSampleTasks(selectedSampleProcessId);

    setTasks(sampleTasks);
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.setItem(SAMPLE_PROCESS_STORAGE_KEY, selectedSampleProcessId);
    markGeneratedArtifactsStale();
    markSaved();
    setSaveMessage(
      locale === "vi"
        ? `Đã reset về dữ liệu mẫu ${activeSampleProcess.label}.`
        : `Reset to sample data ${activeSampleProcess.label}.`
    );
  }

  function switchSampleProcess(sampleId: string) {
    const nextSampleProcess = getSampleProcess(sampleId);

    if (nextSampleProcess.id === selectedSampleProcessId) {
      return;
    }

    const shouldReplace = window.confirm(
      locale === "vi"
        ? `Thay bảng hiện tại bằng dữ liệu mẫu ${nextSampleProcess.label}?`
        : `Replace the current table with sample data ${nextSampleProcess.label}?`
    );

    if (!shouldReplace) {
      return;
    }

    const sampleTasks = cloneSampleTasks(nextSampleProcess.id);

    setSelectedSampleProcessId(nextSampleProcess.id);
    setTasks(persistTasks(sampleTasks));
    window.localStorage.setItem(SAMPLE_PROCESS_STORAGE_KEY, nextSampleProcess.id);
    setImportPreview(null);
    setHighlightedStepId(null);
    markGeneratedArtifactsStale();
    markSaved();
    setSaveMessage(
      locale === "vi"
        ? `Đã chuyển sang dữ liệu mẫu ${nextSampleProcess.label}.`
        : `Switched to sample data ${nextSampleProcess.label}.`
    );
  }

  function autoSuggestInteractionFields() {
    let updatedCount = 0;

    setTasks((currentTasks) =>
      persistTasks(
        currentTasks.map((task) => {
          const nextTask = { ...task };
          const suggestedInteractionType = inferCustomerInteractionType(task);
          const suggestedChannel = inferChannel(task);

          if (isEmptyInteractionType(nextTask) && suggestedInteractionType !== "None") {
            nextTask.customerInteractionType = suggestedInteractionType;
            updatedCount += 1;
          }

          if (isEmptyChannel(nextTask) && suggestedChannel) {
            nextTask.channel = suggestedChannel;
            updatedCount += 1;
          }

          return nextTask;
        })
      )
    );
    markGeneratedArtifactsStale();
    markUnsaved();
    setSaveMessage(
      updatedCount > 0
        ? `Đã auto-suggest ${updatedCount} interaction/channel field. Giá trị user đã chọn không bị ghi đè.`
        : "Không có field trống nào cần auto-suggest."
    );
  }

  function downloadQaReport() {
    const templateProfiles = readTemplateProfiles();
    const selectedD01TemplateId =
      window.localStorage.getItem(D01_STORAGE_KEY) ??
      sampleWorkspace.selectedBpmnTemplateId;
    const selectedD02TemplateId =
      window.localStorage.getItem(D02_STORAGE_KEY) ??
      sampleWorkspace.selectedServiceBlueprintTemplateId;
    const selectedTemplates = templateProfiles.filter(
      (template) =>
        template.id === selectedD01TemplateId || template.id === selectedD02TemplateId
    );
    const markdown = generateQaReportMarkdown({
      workspace: sampleWorkspace,
      processTasks: tasks,
      templateProfiles:
        selectedTemplates.length > 0 ? selectedTemplates : templateProfiles,
      qaIssues,
      artifactReadiness: {
        qaReport: true
      }
    });
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `QA_Report_${createTimestamp()}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function downloadExcelRegister() {
    const headerCells = excelColumns
      .map(
        (column) =>
          `<th style="background:#e2e8f0;border:1px solid #94a3b8;font-weight:700;padding:6px;text-align:left;">${escapeHtml(column.label)}</th>`
      )
      .join("");
    const bodyRows = tasks
      .map((task) => {
        const cells = excelColumns
          .map((column) => {
            const value = getCellValue(task, column.key);

            return `<td style="border:1px solid #cbd5e1;padding:6px;mso-number-format:'\\@';">${escapeHtml(String(value))}</td>`;
          })
          .join("");

        return `<tr>${cells}</tr>`;
      })
      .join("");
    const workbookHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
    th, td { vertical-align: top; white-space: normal; }
  </style>
</head>
<body>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`;
    const blob = new Blob([workbookHtml], {
      type: "application/vnd.ms-excel;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `Process_Task_Register_${createTimestamp()}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setSaveMessage("Đã export Process Task Register hiện tại ra Excel.");
  }

  function downloadJsonRegister() {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], {
      type: "application/json;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `Process_Task_Register_${createTimestamp()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setSaveMessage(
      locale === "vi"
        ? "Đã export Process Task Register hiện tại ra JSON."
        : "Exported the current Process Task Register to JSON."
    );
  }

  async function downloadExcelTemplate() {
    try {
      const blob = await createProcessTaskRegisterTemplateWorkbook();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `Process_Task_Register_Template_${createTimestamp()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setSaveMessage("Đã download Excel template cho Process Task Register.");
    } catch {
      setSaveMessage("Không thể tạo Excel template. Vui lòng thử lại.");
    }
  }

  async function importExcelFile(file: File | undefined) {
    if (!file) {
      return;
    }

    try {
      const preview = await parseProcessTaskRegisterWorkbook(file);

      setImportPreview(preview);
      setSaveMessage(
        preview.errors.length > 0
          ? locale === "vi"
            ? "Import Excel có lỗi. Vui lòng kiểm tra bản xem trước trước khi áp dụng."
            : "Excel import has errors. Review the preview before applying."
          : locale === "vi"
          ? "Đã đọc file Excel. Kiểm tra bản xem trước rồi bấm Apply Import để cập nhật bảng."
          : "Excel file loaded. Review the preview, then click Apply Import to update the table."
      );
    } catch (error) {
      setImportPreview({
        tasks: [],
        errors: [
          {
            message:
              error instanceof Error
                ? error.message
                : "Không thể đọc file Excel. Vui lòng kiểm tra đúng định dạng .xlsx."
          }
        ],
        warnings: []
      });
      setSaveMessage("Không thể đọc file Excel.");
    } finally {
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  }

  function applyImport() {
    if (!importPreview || importPreview.errors.length > 0) {
      setSaveMessage(
        locale === "vi"
          ? "Không thể áp dụng import khi còn lỗi."
          : "Cannot apply the import while errors remain."
      );
      return;
    }

    setTasks(persistTasks(importPreview.tasks));
    markGeneratedArtifactsStale();
    saveAuditLogEntry({
      action: "import_excel",
      status: "success",
      summary: "Applied Excel import to Process Task Register.",
      metadata: {
        rowCount: importPreview.tasks.length
      }
    });
    setImportPreview(null);
    markSaved();
    setSaveMessage(
      locale === "vi"
        ? "Đã áp dụng import Excel, lưu vào localStorage và đánh dấu D01/D02 stale."
        : "Applied the Excel import, saved to localStorage, and marked D01/D02 stale."
    );
  }

  function cancelImport() {
    setImportPreview(null);
    setSaveMessage("Đã hủy Excel import. Dữ liệu hiện tại không thay đổi.");
  }

  function applyRecommendation(recommendation: QARecommendation) {
    try {
      const nextTasks = applyQARecommendation(tasks, recommendation);

      setTasks(persistTasks(nextTasks));
      markGeneratedArtifactsStale();
      markUnsaved();
      saveAuditLogEntry({
        action: "apply_recommendation",
        status: "success",
        summary: "Applied one QA recommendation.",
        metadata: {
          recommendationId: recommendation.id ?? null,
          source: recommendation.source ?? "rule",
          targetStepCount: recommendation.targetStepIds.length
        }
      });
      setSaveMessage(
        locale === "vi"
          ? `Đã áp dụng recommendation "${recommendation.title}" và đánh dấu D01/D02 stale.`
          : `Applied recommendation "${recommendation.title}" and marked D01/D02 stale.`
      );
    } catch (error) {
      setSaveMessage(formatRecommendationApplyError(error, locale));
    }
  }

  function applyRecommendations(recommendations: QARecommendation[]) {
    const preview = previewRecommendationBatch(tasks, recommendations);

    try {
      const nextTasks = applyRecommendationBatch(tasks, recommendations);

      setTasks(persistTasks(nextTasks));
      markGeneratedArtifactsStale();
      markUnsaved();
      saveAuditLogEntry({
        action: "apply_recommendation",
        status: "success",
        summary: "Applied QA recommendation batch.",
        metadata: {
          recommendationCount: recommendations.length,
          applicableCount: preview.applicableCount,
          skippedCount: preview.skippedCount
        }
      });
      setSaveMessage(
        locale === "vi"
          ? `Đã áp dụng ${preview.applicableCount} recommendation, bỏ qua ${preview.skippedCount} conflict, và đánh dấu D01/D02 stale.`
          : `Applied ${preview.applicableCount} recommendation(s), skipped ${preview.skippedCount} conflict(s), and marked D01/D02 stale.`
      );
    } catch (error) {
      setSaveMessage(formatRecommendationApplyError(error, locale));
    }
  }

  return (
    <>
      <SessionFrame
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className={saveStateStyles[saveState]}>
              {text[saveState]}
            </span>
            <button
              className="btn btn-primary"
              onClick={saveTasks}
              type="button"
            >
              {text.saveChanges}
            </button>
            <input
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(event) => importExcelFile(event.target.files?.[0])}
              ref={importInputRef}
              type="file"
            />
            <div className="relative">
              <button
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setIsRegisterMoreMenuOpen((isOpen) => !isOpen)}
                type="button"
              >
                {text.more}
              </button>
              {isRegisterMoreMenuOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-60 rounded border border-slate-200 bg-white p-1 text-sm shadow-lg">
                  <button
                    className="block w-full rounded px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      addRow();
                      setIsRegisterMoreMenuOpen(false);
                    }}
                    type="button"
                  >
                    {text.addRow}
                  </button>
                  <button
                    className="block w-full rounded px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      resetTasks();
                      setIsRegisterMoreMenuOpen(false);
                    }}
                    type="button"
                  >
                    {text.resetSample}
                  </button>
                  <button
                    className="block w-full rounded px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      downloadExcelRegister();
                      setIsRegisterMoreMenuOpen(false);
                    }}
                    type="button"
                  >
                    {text.exportExcel}
                  </button>
                  <button
                    className="block w-full rounded px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      importInputRef.current?.click();
                      setIsRegisterMoreMenuOpen(false);
                    }}
                    type="button"
                  >
                    {text.importExcel}
                  </button>
                  <button
                    className="block w-full rounded px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      void downloadExcelTemplate();
                      setIsRegisterMoreMenuOpen(false);
                    }}
                    type="button"
                  >
                    {text.downloadExcelTemplate}
                  </button>
                  <button
                    className="block w-full rounded px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      downloadJsonRegister();
                      setIsRegisterMoreMenuOpen(false);
                    }}
                    type="button"
                  >
                    {text.exportJson}
                  </button>
                </div>
              ) : null}
            </div>
            <button
              className="btn btn-ai"
              disabled={isRunningPtrAI || tasks.length === 0}
              onClick={() => void runPtrAIAssistantAction(chooseDefaultPtrAIAssistantAction())}
              type="button"
            >
              {isRunningPtrAI ? text.aiRunning : text.aiAssistant}
            </button>
          </div>
        }
        bodyClassName="p-4"
        description={text.description}
        title="Process Task Register"
      >
          <div className="mb-4">
            <p className="text-sm font-medium uppercase text-slate-500">
              Process Task Register
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                {text.sample}
                <select
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                  onChange={(event) => switchSampleProcess(event.target.value)}
                  value={selectedSampleProcessId}
                >
                  {sampleProcessOptions.map((sampleProcess) => (
                    <option key={sampleProcess.id} value={sampleProcess.id}>
                      {sampleProcess.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex rounded-md border border-slate-200 bg-white p-1">
                <button
                  className={`rounded px-3 py-1.5 text-sm font-semibold ${
                    columnMode === "simple"
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                  onClick={() => setColumnMode("simple")}
                  type="button"
                >
                  {text.simpleMode}
                </button>
                <button
                  className={`rounded px-3 py-1.5 text-sm font-semibold ${
                    columnMode === "advanced"
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                  onClick={() => setColumnMode("advanced")}
                  type="button"
                >
                  {text.advancedMode}
                </button>
              </div>
              <p className="max-w-md text-sm text-slate-600">
                {modeHelper}
              </p>
              <button
                className="btn btn-secondary"
                onClick={autoSuggestInteractionFields}
                type="button"
              >
                {text.autoSuggest}
              </button>
            </div>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
              <li>{text.oneRow}</li>
              <li>{text.gateway}</li>
              <li>{text.systemData}</li>
            </ul>
            <p className="mt-2 text-sm text-slate-500">
              {text.totalRows}: {tasks.length} | {text.gatewayCount}: {gatewayCount} |{" "}
              {selectedTasks.length} {text.selectedRows}
            </p>
          </div>
          {saveMessage ? (
            <p className="mt-3 text-sm text-slate-600">{saveMessage}</p>
          ) : null}

        {importPreview ? (
          <div className="mb-4 rounded border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-slate-950">
                  {locale === "vi" ? "Xem trước nhập Excel" : "Preview Excel import"}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {locale === "vi" ? "Số dòng đọc được" : "Rows read"}:{" "}
                  {importPreview.tasks.length} | {locale === "vi" ? "Lỗi" : "Errors"}:{" "}
                  {importPreview.errors.length} | {locale === "vi" ? "Cảnh báo" : "Warnings"}:{" "}
                  {importPreview.warnings.length}
                </p>
              </div>
              <div className="flex max-w-full flex-wrap gap-2">
                <button
                  className="btn btn-success"
                  disabled={importPreview.errors.length > 0}
                  onClick={applyImport}
                  type="button"
                >
                  {locale === "vi" ? "Áp dụng nhập Excel" : "Apply Import"}
                </button>
                <button
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={cancelImport}
                  type="button"
                >
                  {locale === "vi" ? "Hủy nhập Excel" : "Cancel Import"}
                </button>
              </div>
            </div>

            {importPreview.errors.length > 0 ? (
              <div className="mt-4 rounded border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-semibold text-red-800">
                  {locale === "vi" ? "Lỗi nhập" : "Import errors"}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
                  {importPreview.errors.map((issue, index) => (
                    <li key={`${issue.message}-${index}`}>{issue.message}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {importPreview.warnings.length > 0 ? (
              <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-semibold text-amber-800">
                  {locale === "vi" ? "Cảnh báo nhập" : "Import warnings"}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-700">
                  {importPreview.warnings.map((issue, index) => (
                    <li key={`${issue.message}-${index}`}>{issue.message}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-4 w-full max-w-full overflow-x-auto rounded border border-slate-200 bg-white">
              <table className="w-max min-w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="border-b border-r border-slate-200 px-3 py-2">
                      #
                    </th>
                    <th className="border-b border-r border-slate-200 px-3 py-2">
                      stepId
                    </th>
                    <th className="border-b border-r border-slate-200 px-3 py-2">
                      rowType
                    </th>
                    <th className="border-b border-r border-slate-200 px-3 py-2">
                      bpmnType
                    </th>
                    <th className="border-b border-r border-slate-200 px-3 py-2">
                      actor
                    </th>
                    <th className="border-b border-r border-slate-200 px-3 py-2">
                      taskName
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2">
                      defaultNextStep
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.tasks.slice(0, 8).map((task, index) => (
                    <tr className="odd:bg-white even:bg-slate-50" key={`${task.id}-${index}`}>
                      <td className="border-b border-r border-slate-200 px-3 py-2">
                        {index + 1}
                      </td>
                      <td className="border-b border-r border-slate-200 px-3 py-2">
                        {task.stepId}
                      </td>
                      <td className="border-b border-r border-slate-200 px-3 py-2">
                        {task.rowType}
                      </td>
                      <td className="border-b border-r border-slate-200 px-3 py-2">
                        {task.bpmnType}
                      </td>
                      <td className="border-b border-r border-slate-200 px-3 py-2">
                        {task.actor}
                      </td>
                      <td className="border-b border-r border-slate-200 px-3 py-2">
                        {task.taskName}
                      </td>
                      <td className="border-b border-slate-200 px-3 py-2">
                        {task.defaultNextStep}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {importPreview.tasks.length > 8 ? (
                <p className="border-t border-slate-200 p-3 text-sm text-slate-500">
                  {locale === "vi" ? "Chỉ hiển thị 8 dòng đầu trong bản xem trước." : "Only the first 8 rows are shown in preview."}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div
          className="w-full max-w-full min-w-0 overflow-auto rounded border border-slate-200 bg-white"
          style={{ maxHeight: "70vh" }}
        >
          <table className="w-max min-w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-30 bg-slate-100 text-slate-700 shadow-sm">
              <tr>
                <th className="sticky left-0 top-0 z-50 w-12 border-b border-r border-slate-200 bg-slate-100 px-3 py-3 font-semibold">
                  <input
                    aria-label={text.selectRows}
                    checked={tasks.length > 0 && selectedStepIds.size === tasks.length}
                    className="h-4 w-4 rounded border-slate-300"
                    onChange={toggleAllRows}
                    type="checkbox"
                  />
                </th>
                <th className="sticky left-12 top-0 z-40 w-14 border-b border-r border-slate-200 bg-slate-100 px-3 py-3 font-semibold">
                  #
                </th>
                {displayedColumns.map((column) => (
                  <th
                    className={`border-b border-r border-slate-200 px-3 py-3 font-semibold ${
                      column.key === "stepId"
                        ? "sticky left-[6.5rem] top-0 z-40 bg-slate-100"
                        : column.key === "taskName"
                          ? "sticky left-[13.375rem] top-0 z-40 bg-slate-100"
                          : ""
                    }`}
                    key={column.key}
                    style={{ minWidth: column.minWidth }}
                  >
                    {column.label}
                  </th>
                ))}
                <th className="sticky right-0 top-0 z-40 w-56 border-b border-l border-slate-200 bg-slate-100 px-3 py-3 font-semibold">
                  {text.rowActions}
                </th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, index) => (
                <tr
                  className={`align-top ${
                    highlightedStepId === task.stepId
                      ? "bg-yellow-100"
                      : "odd:bg-white even:bg-slate-50"
                  }`}
                  id={`process-task-row-${task.stepId}`}
                  key={task.id}
                >
                  <td className="sticky left-0 z-20 border-b border-r border-slate-200 bg-inherit px-3 py-2">
                    <input
                      aria-label={`${text.selectRows}: ${task.stepId}`}
                      checked={selectedStepIds.has(task.stepId)}
                      className="h-4 w-4 rounded border-slate-300"
                      onChange={() => toggleSelectedRow(task.stepId)}
                      type="checkbox"
                    />
                  </td>
                  <td className="sticky left-12 z-10 border-b border-r border-slate-200 bg-inherit px-3 py-2 font-medium text-slate-600">
                    {index + 1}
                  </td>
                  {displayedColumns.map((column) => {
                    const cellValue = String(getCellValue(task, column.key));
                    const options = getSelectOptions(column.key, cellValue, task);
                    const hasInvalidValue = isInvalidSelectValue(column.key, cellValue, task);
                    const invalidMessage =
                      column.key === "bpmnType"
                        ? "BPMN type không phù hợp với loại dòng hiện tại."
                        : "Giá trị cũ không nằm trong danh sách chuẩn.";

                    return (
                      <td
                        className={`border-b border-r border-slate-200 p-1 ${
                          column.key === "stepId"
                            ? "sticky left-[6.5rem] z-20 bg-inherit"
                            : column.key === "taskName"
                              ? "sticky left-[13.375rem] z-20 bg-inherit shadow-[8px_0_12px_-12px_rgba(15,23,42,0.45)]"
                              : ""
                        }`}
                        key={column.key}
                        style={{ minWidth: column.minWidth }}
                      >
                        {options.length > 0 ? (
                          <select
                            aria-label={`${column.label} dòng ${index + 1}`}
                            className={`w-full rounded border bg-white px-2 py-2 text-sm text-slate-800 outline-none hover:border-slate-300 focus:border-slate-500 ${
                              hasInvalidValue
                                ? "border-amber-400 text-amber-800"
                                : "border-transparent"
                            }`}
                            onChange={(event) =>
                              updateCell(index, column.key, event.target.value)
                            }
                            value={cellValue}
                          >
                            {options.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            aria-label={`${column.label} dòng ${index + 1}`}
                            className="w-full rounded border border-transparent bg-transparent px-2 py-2 text-sm text-slate-800 outline-none hover:border-slate-300 focus:border-slate-500 focus:bg-white"
                            onChange={(event) =>
                              updateCell(index, column.key, event.target.value)
                            }
                            type="text"
                            value={cellValue}
                          />
                        )}
                        {hasInvalidValue ? (
                          <p className="mt-1 px-2 text-xs text-amber-700">
                            {invalidMessage}
                          </p>
                        ) : null}
                      </td>
                    );
                  })}
                  <td className="sticky right-0 z-20 border-b border-l border-slate-200 bg-inherit p-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() => setDetailTaskId(task.id)}
                        type="button"
                      >
                        {detailText.viewDetails}
                      </button>
                      <button
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() => duplicateRow(index)}
                        type="button"
                      >
                        {text.duplicateRow}
                      </button>
                      <button
                        className="rounded border border-red-200 bg-white px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                        onClick={() => deleteRow(index)}
                        type="button"
                      >
                        {text.deleteRow}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SessionFrame>

      <div className="mt-5 scroll-mt-36" id="qa-panel">
        <QAPanel
          issues={displayQaIssues}
          processTasks={tasks}
          onApplyRecommendation={applyRecommendation}
          onApplyRecommendations={applyRecommendations}
          onDownloadReport={downloadQaReport}
          onIssueClick={focusIssueRow}
        />
      </div>

      {detailTask ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/30"
          role="dialog"
        >
          <button
            aria-label={detailText.closeDetails}
            className="flex-1 cursor-default"
            onClick={() => setDetailTaskId(null)}
            type="button"
          />
          <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                  {detailTask.stepId}
                </p>
                <h3 className="mt-1 text-xl font-semibold text-slate-950">
                  {detailText.rowDetails}
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {detailTask.taskName || detailText.emptyValue}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {detailText.rowDetailsDescription}
                </p>
              </div>
              <button
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setDetailTaskId(null)}
                type="button"
              >
                {detailText.closeDetails}
              </button>
            </div>
            <dl className="mt-5 grid gap-3">
              {excelColumns.map((column) => {
                const value = String(getCellValue(detailTask, column.key)).trim();

                return (
                  <div
                    className="rounded border border-slate-200 bg-slate-50 p-3"
                    key={column.key}
                  >
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      {processTaskColumnLabels[locale][column.key]}
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium text-slate-900">
                      {value || detailText.emptyValue}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </aside>
        </div>
      ) : null}
    </>
  );
}
