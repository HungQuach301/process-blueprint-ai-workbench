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
  createAISkillRequestBody,
  resolveAISkillModelSelection
} from "@/lib/ai/ai-governance";
import {
  GENERIC_PROCESS_REGISTER_PROFILE,
  PROCESS_REGISTER_PROFILE_EVENT,
  SELECTED_PROCESS_REGISTER_PROFILE_STORAGE_KEY,
  type DetectedProcessRegisterProfile,
  type RelatedSampleProcessId
} from "@/lib/ai-intake";
import { getAIValidationUserMessage } from "@/lib/ai/user-facing-ai-errors";
import {
  type QaIssue,
  type QARecommendation,
  validateProcessTasks
} from "@/lib/qa/task-register-rules";
import {
  runD01PostGenerationGate,
  runD02PostGenerationGate
} from "@/lib/quality-engine";
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
const D01_GENERATED_XML_KEY =
  "process-blueprint-ai-workbench:generated-d01-bpmn-xml";
const D02_GENERATED_XML_KEY =
  "process-blueprint-ai-workbench:generated-d02-service-blueprint-xml";
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
    resetSample: "Reset mẫu",
    exportExcel: "Export Excel",
    importExcel: "Import Excel",
    downloadExcelTemplate: "Tải Excel template",
    exportJson: "Export JSON",
    sample: "Mẫu",
    autoSuggest: "Auto-suggest interaction fields",
    aiQaSuggest: "Kiểm tra & Đề xuất",
    aiAssistant: "AI Assistant",
    aiMoreActions: "Thêm tác vụ AI",
    aiNoSelection: "Chọn ít nhất một dòng trước khi chạy AI Assistant.",
    aiRunning: "Đang chạy AI Assistant...",
    aiNoRecommendations: "AI Assistant không trả recommendation nào cho các dòng đã chọn.",
    aiRecommendationsReady: "AI Assistant đã tạo recommendation trong QA Panel.",
    normalizeRows: "Normalize selected rows",
    inferActorSystemLane: "Infer missing actor/system/lane",
    improveTaskWording: "Improve task wording",
    suggestSplitTask: "Suggest split complex task",
    generateInputOutput: "Generate missing input/output",
    suggestInteractionChannel: "Suggest customerInteractionType/channel",
    clearSelection: "Bỏ chọn",
    selectedRowsCount: "Dòng đã chọn",
    bulkActions: "Hành động hàng loạt",
    rowActions: "Thao tác",
    duplicateRow: "Nhân bản",
    deleteRow: "Xóa",
    simpleMode: "Simple",
    advancedMode: "Advanced",
    saved: "Saved",
    unsaved: "Unsaved changes",
    saving: "Saving",
    restoreSaved: "Restore saved",
    readinessTitle: "Artifact readiness",
    ptrReadiness: "PTR",
    qaReadiness: "QA findings",
    d01Readiness: "D01",
    d02Readiness: "D02",
    exportReadiness: "Export ZIP",
    exportReady: "Ready",
    exportNotReady: "Not ready",
    gateLabel: "Gate",
    detectedProfile: "Profile phát hiện",
    profileConfidence: "Độ tin cậy",
    selectRows: "Chọn dòng",
    selectedRows: "dòng đã chọn",
    oneRow: "Một dòng = một task/gateway/event/data interaction.",
    gateway: "Gateway phải có câu hỏi điều kiện và đủ nhánh yes/no.",
    systemData: "System/data phải giữ liên kết với hành trình người dùng.",
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
    aiQaSuggest: "AI QA & Suggest",
    aiAssistant: "AI Assistant",
    aiMoreActions: "More AI actions",
    aiNoSelection: "Select at least one row before running AI Assistant.",
    aiRunning: "Running AI Assistant...",
    aiNoRecommendations: "AI Assistant did not return recommendations for the selected rows.",
    aiRecommendationsReady: "AI Assistant created recommendations in the QA Panel.",
    normalizeRows: "Normalize selected rows",
    inferActorSystemLane: "Infer missing actor/system/lane",
    improveTaskWording: "Improve task wording",
    suggestSplitTask: "Suggest split complex task",
    generateInputOutput: "Generate missing input/output",
    suggestInteractionChannel: "Suggest customerInteractionType/channel",
    clearSelection: "Clear selection",
    selectedRowsCount: "Selected rows",
    bulkActions: "Bulk actions",
    rowActions: "Actions",
    duplicateRow: "Duplicate",
    deleteRow: "Delete",
    simpleMode: "Simple",
    advancedMode: "Advanced",
    saved: "Saved",
    unsaved: "Unsaved changes",
    saving: "Saving",
    restoreSaved: "Restore saved",
    readinessTitle: "Artifact readiness",
    ptrReadiness: "PTR",
    qaReadiness: "QA findings",
    d01Readiness: "D01",
    d02Readiness: "D02",
    exportReadiness: "Export ZIP",
    exportReady: "Ready",
    exportNotReady: "Not ready",
    gateLabel: "Gate",
    detectedProfile: "Detected profile",
    profileConfidence: "Confidence",
    selectRows: "Select rows",
    selectedRows: "selected rows",
    oneRow: "One row = one task, gateway, event, or data interaction.",
    gateway: "Gateways must include a condition question and complete yes/no branches.",
    systemData: "System/data fields should stay linked to the user journey.",
    totalRows: "Total rows",
    gatewayCount: "Gateways"
  }
} satisfies Record<Locale, Record<string, string>>;

type EditableColumn = {
  key: keyof ProcessTask;
  label: string;
  minWidth: string;
  helpText?: string;
};

type SelectOption = {
  value: string;
  label: string;
  helpText?: string;
};

type SampleProcessId = RelatedSampleProcessId;

type PtrAIAssistantActionId =
  | "normalize-selected-rows"
  | "infer-missing-actor-system-lane"
  | "improve-task-wording"
  | "suggest-split-complex-task"
  | "generate-missing-input-output"
  | "suggest-interaction-channel";

const PTR_AI_ASSISTANT_SKILL_ID = "process-improvement-recommendation";
const PTR_AI_DEFAULT_ACTION_ID: PtrAIAssistantActionId = "normalize-selected-rows";

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

const ptrAIAssistantSecondaryActions = ptrAIAssistantActions.filter(
  (action) => action.id !== PTR_AI_DEFAULT_ACTION_ID
);

const visibleColumns: EditableColumn[] = [
  { key: "stepId", label: "Step ID", minWidth: "110px" },
  {
    key: "rowType",
    label: "Row type",
    minWidth: "120px",
    helpText: "Loai dong: task, gateway, event, data interaction hoac ghi chu."
  },
  {
    key: "bpmnType",
    label: "BPMN type",
    minWidth: "150px",
    helpText: "Loai BPMN quy dinh cach buoc nay duoc ve trong D01 BPMN."
  },
  {
    key: "taskNature",
    label: "Work type",
    minWidth: "150px",
    helpText: "Tinh chat cong viec: thu cong, tu dong, phe duyet, tich hop..."
  },
  { key: "phase", label: "Phase", minWidth: "170px" },
  {
    key: "customerInteractionType",
    label: "Customer touchpoint",
    minWidth: "210px",
    helpText: "Vi tri cua buoc trong hanh trinh dich vu hoac service blueprint."
  },
  { key: "channel", label: "Channel", minWidth: "160px" },
  { key: "actor", label: "Actor", minWidth: "160px" },
  { key: "actorLane", label: "Actor lane", minWidth: "160px" },
  { key: "system", label: "System", minWidth: "190px" },
  { key: "systemLane", label: "System lane", minWidth: "150px" },
  { key: "taskName", label: "Task name", minWidth: "380px" },
  { key: "input", label: "Input", minWidth: "260px" },
  { key: "output", label: "Output", minWidth: "260px" },
  {
    key: "dataAction",
    label: "Data action",
    minWidth: "150px",
    helpText: "Hanh dong voi du lieu: tao, doc, cap nhat, gui, nhan, luu..."
  },
  {
    key: "dataObject",
    label: "Data object",
    minWidth: "230px",
    helpText: "Du lieu, ho so hoac tai lieu nghiep vu lien quan den buoc nay."
  },
  { key: "defaultNextStep", label: "Next step", minWidth: "150px" },
  {
    key: "conditionQuestion",
    label: "Gateway question",
    minWidth: "260px",
    helpText: "Cau hoi quyet dinh dung de tach nhanh yes/no cho gateway."
  },
  {
    key: "yesNextStep",
    label: "If yes",
    minWidth: "120px",
    helpText: "Step ID tiep theo khi cau tra loi la yes."
  },
  {
    key: "noNextStep",
    label: "If no",
    minWidth: "120px",
    helpText: "Step ID tiep theo khi cau tra loi la no."
  },
  { key: "riskControl", label: "Risk / control", minWidth: "240px" },
  { key: "reviewStatus", label: "Review status", minWidth: "160px" },
  { key: "comment", label: "Notes", minWidth: "220px" }
];
const simpleColumnKeys: Array<keyof ProcessTask> = [
  "stepId",
  "taskName",
  "phase",
  "actor",
  "system",
  "defaultNextStep",
  "reviewStatus"
];

type ColumnMode = "simple" | "advanced";
type SaveState = "saved" | "unsaved" | "saving";
type ArtifactStatus = "fresh" | "stale" | "not_generated";

type ArtifactReadiness = {
  d01Status: ArtifactStatus;
  d02Status: ArtifactStatus;
  d01GateStatus: string;
  d02GateStatus: string;
};

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
    {
      value: "gateway",
      label: "Gateway",
      helpText: "Diem quyet dinh trong quy trinh, thuong can cau hoi va nhanh yes/no."
    },
    { value: "start", label: "Start" },
    { value: "end", label: "End" },
    { value: "event", label: "Event" },
    {
      value: "data",
      label: "Data interaction",
      helpText: "Data interaction: dong the hien buoc tao, doc, cap nhat, gui, nhan hoac luu du lieu."
    },
    { value: "phase", label: "Phase" },
    { value: "group", label: "Group" },
    { value: "annotation", label: "Annotation" }
  ],
  bpmnType: [
    { value: "startEvent", label: "Start Event" },
    { value: "endEvent", label: "End Event" },
    {
      value: "userTask",
      label: "User Task",
      helpText: "User Task: cong viec do con nguoi thuc hien trong he thong."
    },
    { value: "manualTask", label: "Manual Task" },
    {
      value: "serviceTask",
      label: "Service Task",
      helpText: "Service Task: buoc he thong hoac service tu dong thuc hien."
    },
    {
      value: "sendTask",
      label: "Send Task",
      helpText: "Send Task: buoc gui thong bao, email, SMS hoac message ra ngoai."
    },
    { value: "businessRuleTask", label: "Business Rule Task" },
    { value: "scriptTask", label: "Script Task" },
    {
      value: "exclusiveGateway",
      label: "Exclusive Gateway",
      helpText: "Exclusive Gateway: diem re nhanh chi chon mot duong di theo dieu kien."
    },
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
    {
      value: "userTask",
      label: "User Task",
      helpText: "User Task: cong viec do con nguoi thuc hien trong he thong."
    },
    { value: "manualTask", label: "Manual Task" },
    {
      value: "serviceTask",
      label: "Service Task",
      helpText: "Service Task: buoc he thong hoac service tu dong thuc hien."
    },
    {
      value: "sendTask",
      label: "Send Task",
      helpText: "Send Task: buoc gui thong bao, email, SMS hoac message ra ngoai."
    },
    { value: "businessRuleTask", label: "Business Rule Task" },
    { value: "scriptTask", label: "Script Task" },
    { value: "task", label: "Generic Task" }
  ],
  gateway: [
    {
      value: "exclusiveGateway",
      label: "Exclusive Gateway",
      helpText: "Exclusive Gateway: diem re nhanh chi chon mot duong di theo dieu kien."
    },
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

function parseProcessRegisterProfile(
  value: string | null
): DetectedProcessRegisterProfile {
  if (!value) {
    return GENERIC_PROCESS_REGISTER_PROFILE;
  }

  try {
    const parsed = JSON.parse(value) as Partial<DetectedProcessRegisterProfile>;

    if (typeof parsed.id === "string" && typeof parsed.label === "string") {
      return {
        ...GENERIC_PROCESS_REGISTER_PROFILE,
        ...parsed,
        confidence: parsed.confidence ?? "low",
        description: parsed.description ?? GENERIC_PROCESS_REGISTER_PROFILE.description,
        reason: parsed.reason ?? GENERIC_PROCESS_REGISTER_PROFILE.reason
      };
    }
  } catch {
    return GENERIC_PROCESS_REGISTER_PROFILE;
  }

  return GENERIC_PROCESS_REGISTER_PROFILE;
}

function getProfileForSampleProcess(
  sampleId: SampleProcessId
): DetectedProcessRegisterProfile {
  if (sampleId === "sme-online-loan") {
    return {
      id: "sme-loan-lending",
      label: "SME Loan / Lending profile",
      description: "Lending, credit, loan origination, collateral, and approval journeys.",
      confidence: "high",
      reason: "Selected SME Online Loan sample.",
      relatedSampleProcessId: "sme-online-loan"
    };
  }

  return {
    id: "account-opening",
    label: "Account Opening profile",
    description: "Account opening, customer onboarding, KYC, and corporate profile setup.",
    confidence: "high",
    reason: "Selected Corporate Account Opening sample.",
    relatedSampleProcessId: "corporate-account-opening"
  };
}

function persistProcessRegisterProfile(profile: DetectedProcessRegisterProfile) {
  window.localStorage.setItem(
    SELECTED_PROCESS_REGISTER_PROFILE_STORAGE_KEY,
    JSON.stringify(profile)
  );
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

function readArtifactStatus(key: string): ArtifactStatus {
  const status = window.localStorage.getItem(key);

  return status === "fresh" || status === "stale" ? status : "not_generated";
}

function readArtifactGateStatus({
  xmlKey,
  runGate
}: {
  xmlKey: string;
  runGate: (xml: string) => { status: string };
}) {
  try {
    const xml = window.localStorage.getItem(xmlKey);

    if (!xml?.trim()) {
      return "not generated";
    }

    return runGate(xml).status;
  } catch {
    return "unknown";
  }
}

function readArtifactReadiness(): ArtifactReadiness {
  return {
    d01Status: readArtifactStatus(D01_GENERATED_STATUS_KEY),
    d02Status: readArtifactStatus(D02_GENERATED_STATUS_KEY),
    d01GateStatus: readArtifactGateStatus({
      xmlKey: D01_GENERATED_XML_KEY,
      runGate: runD01PostGenerationGate
    }),
    d02GateStatus: readArtifactGateStatus({
      xmlKey: D02_GENERATED_XML_KEY,
      runGate: runD02PostGenerationGate
    })
  };
}

function persistTasks(nextTasks: ProcessTask[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTasks));
  return nextTasks;
}

function formatRecommendationApplyError(error: unknown) {
  if (error instanceof RecommendationApplyValidationError) {
    return `Không apply recommendation. ${error.messages.join(" ")}`;
  }

  return "Không apply recommendation vì dữ liệu sau apply không hợp lệ.";
}

function formatProviderLabel(providerId: string) {
  const providerLabels: Record<string, string> = {
    openai: "OpenAI",
    claude: "Claude",
    "product-ai": "Product AI",
    mock: "Local"
  };

  return providerLabels[providerId] ?? providerId;
}

function isRawSchemaError(error?: string) {
  const normalizedError = (error ?? "").toLowerCase();

  return (
    normalizedError.includes("recommendations[") ||
    normalizedError.includes("must be a string") ||
    normalizedError.includes("must be an array") ||
    normalizedError.includes("is invalid") ||
    normalizedError.includes("schema") ||
    normalizedError.includes("validation")
  );
}

function getFriendlyPtrAIErrorMessage({
  error,
  validationErrors,
  locale
}: {
  error?: string;
  validationErrors?: string[];
  locale: Locale;
}) {
  if (validationErrors?.length) {
    return getAIValidationUserMessage(validationErrors);
  }

  if (isRawSchemaError(error)) {
    console.log(
      JSON.stringify({
        event: "ptr_ai_assistant_technical_error",
        error
      })
    );

    return locale === "vi"
      ? "Kết quả AI chưa đạt yêu cầu. Vui lòng thử lại."
      : "AI output did not meet quality requirements. Please try again.";
  }

  return locale === "vi"
    ? "AI Assistant chưa tạo được đề xuất. Vui lòng thử lại."
    : "AI Assistant could not create suggestions. Please try again.";
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
  const [selectedProcessRegisterProfile, setSelectedProcessRegisterProfile] =
    useState<DetectedProcessRegisterProfile>(GENERIC_PROCESS_REGISTER_PROFILE);
  const [saveMessage, setSaveMessage] = useState("");
  const [highlightedStepId, setHighlightedStepId] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<ProcessTaskImportPreview | null>(null);
  const [isRegisterMoreMenuOpen, setIsRegisterMoreMenuOpen] = useState(false);
  const [isPtrAIMenuOpen, setIsPtrAIMenuOpen] = useState(false);
  const [isRunningPtrAI, setIsRunningPtrAI] = useState(false);
  const [ptrAIRetryAction, setPtrAIRetryAction] =
    useState<PtrAIAssistantActionId | null>(null);
  const [realPtrAIEnabled, setRealPtrAIEnabled] = useState(false);
  const [ptrAISelection, setPtrAISelection] = useState<{
    providerId: string;
    model: string;
  } | null>(null);
  const [selectedStepIds, setSelectedStepIds] = useState<Set<string>>(() => new Set());
  const [columnMode, setColumnMode] = useState<ColumnMode>("simple");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [artifactReadiness, setArtifactReadiness] = useState<ArtifactReadiness>(
    () => ({
      d01Status: "not_generated",
      d02Status: "not_generated",
      d01GateStatus: "not generated",
      d02GateStatus: "not generated"
    })
  );
  const [openRowActionTaskId, setOpenRowActionTaskId] = useState<string | null>(null);
  const [ptrAiIssues, setPtrAiIssues] = useState<QaIssue[]>([]);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const saveStateTimeoutRef = useRef<number | null>(null);
  const lastSavedTasksRef = useRef<ProcessTask[]>(cloneSampleTasks());

  useEffect(() => {
    setActiveLocale(getLocale());

    function loadSavedTasks() {
      const savedSampleProcess = getSampleProcess(
        window.localStorage.getItem(SAMPLE_PROCESS_STORAGE_KEY)
      );
      setSelectedSampleProcessId(savedSampleProcess.id);
      setSelectedProcessRegisterProfile(
        parseProcessRegisterProfile(
          window.localStorage.getItem(SELECTED_PROCESS_REGISTER_PROFILE_STORAGE_KEY)
        )
      );

      const savedTasks = window.localStorage.getItem(STORAGE_KEY);

      if (!savedTasks) {
        return false;
      }

      try {
        const parsedTasks = JSON.parse(savedTasks);

        if (Array.isArray(parsedTasks)) {
          const nextTasks = parsedTasks as ProcessTask[];
          setTasks(nextTasks);
          lastSavedTasksRef.current = nextTasks.map((task) => ({ ...task }));
          markSaved();
          return true;
        }
      } catch {
        setSaveMessage("Dữ liệu đã lưu không hợp lệ. Đang dùng dữ liệu mẫu.");
      }

      return false;
    }

    const savedSampleProcess = getSampleProcess(
      window.localStorage.getItem(SAMPLE_PROCESS_STORAGE_KEY)
    );
    setSelectedSampleProcessId(savedSampleProcess.id);

    if (!loadSavedTasks()) {
      const sampleTasks = cloneSampleTasks(savedSampleProcess.id);
      setTasks(sampleTasks);
      lastSavedTasksRef.current = sampleTasks.map((task) => ({ ...task }));
    }

    window.addEventListener(PROCESS_TASKS_EVENT, loadSavedTasks);
    window.addEventListener(PROCESS_REGISTER_PROFILE_EVENT, loadSavedTasks);

    return () => {
      window.removeEventListener(PROCESS_TASKS_EVENT, loadSavedTasks);
      window.removeEventListener(PROCESS_REGISTER_PROFILE_EVENT, loadSavedTasks);
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
    let active = true;

    async function loadPtrAIMode() {
      try {
        const response = await fetch("/api/ai/run-skill", {
          method: "GET"
        });
        const data = (await response.json()) as {
          realAIEnabled?: boolean;
        };
        const selection = resolveAISkillModelSelection(
          PTR_AI_ASSISTANT_SKILL_ID
        );

        if (active) {
          setRealPtrAIEnabled(data.realAIEnabled === true);
          setPtrAISelection({
            providerId: selection.providerId,
            model: selection.model
          });
        }
      } catch {
        if (active) {
          setRealPtrAIEnabled(false);
          setPtrAISelection(null);
        }
      }
    }

    loadPtrAIMode();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function refreshArtifactReadiness() {
      setArtifactReadiness(readArtifactReadiness());
    }

    refreshArtifactReadiness();
    window.addEventListener(ARTIFACT_STATUS_EVENT, refreshArtifactReadiness);

    return () => {
      window.removeEventListener(ARTIFACT_STATUS_EVENT, refreshArtifactReadiness);
    };
  }, []);

  useEffect(() => {
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (saveState !== "unsaved") {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", warnBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
    };
  }, [saveState]);

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
    () =>
      columnMode === "simple"
        ? simpleColumnKeys
            .map((columnKey) =>
              visibleColumns.find((column) => column.key === columnKey)
            )
            .filter((column): column is EditableColumn => Boolean(column))
        : visibleColumns,
    [columnMode]
  );
  const activeSampleProcess = getSampleProcess(selectedSampleProcessId);
  const text = ptrText[locale];
  const ptrAIModeIndicator =
    realPtrAIEnabled && ptrAISelection
      ? locale === "vi"
        ? `Sử dụng ${formatProviderLabel(ptrAISelection.providerId)} ${ptrAISelection.model}`
        : `Using ${formatProviderLabel(ptrAISelection.providerId)} ${ptrAISelection.model}`
      : locale === "vi"
        ? "Phân tích cục bộ"
        : "Local analysis";
  const saveStateStyles: Record<SaveState, string> = {
    saved: "status-badge status-badge-success",
    unsaved: "status-badge status-badge-warning",
    saving: "status-badge status-badge-primary"
  };
  const exportZipReady =
    saveState === "saved" &&
    artifactReadiness.d01Status === "fresh" &&
    artifactReadiness.d02Status === "fresh" &&
    artifactReadiness.d01GateStatus !== "fail" &&
    artifactReadiness.d02GateStatus !== "fail";

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

  function confirmDiscardUnsavedChanges(actionLabel: string) {
    if (saveState !== "unsaved") {
      return true;
    }

    return window.confirm(
      `${actionLabel} will discard changes that have not been explicitly saved. Continue?`
    );
  }

  function restoreLastSavedTasks() {
    const lastSavedTasks = lastSavedTasksRef.current.map((task) => ({ ...task }));

    setTasks(persistTasks(lastSavedTasks));
    setImportPreview(null);
    setPtrAiIssues([]);
    setHighlightedStepId(null);
    markGeneratedArtifactsStale();
    markSaved();
    setSaveMessage("Restored the last explicitly saved Process Task Register.");
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

  async function runPtrAIAssistantAction(
    actionId: PtrAIAssistantActionId,
    actionLabel?: string
  ) {
    const targetTasks = selectedTasks.length > 0 ? selectedTasks : tasks;

    if (targetTasks.length === 0) {
      setSaveMessage("No Process Task Register rows are available for AI review.");
      return;
    }

    setIsRunningPtrAI(true);
    setIsPtrAIMenuOpen(false);
    setSaveMessage(text.aiRunning);

    try {
      const response = await fetch("/api/ai/run-skill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(
          createAISkillRequestBody({
            skillId: PTR_AI_ASSISTANT_SKILL_ID,
            payload: {
            processTasks: tasks,
            templateProfiles: readTemplateProfiles(),
            targetStepIds: targetTasks.map((task) => task.stepId),
            metadata: {
              ptrAiAction: actionId,
              selectedOnly: selectedTasks.length > 0,
              selectedRowCount: targetTasks.length
            }
          }
          })
        )
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
        setPtrAIRetryAction(actionId);
        setSaveMessage(
          getFriendlyPtrAIErrorMessage({
            error: data.error,
            validationErrors: data.validationErrors,
            locale
          })
        );
        saveAuditLogEntry({
          action: "ai_call",
          status: "failure",
          summary: "PTR AI Assistant request failed.",
          metadata: {
            skillId: PTR_AI_ASSISTANT_SKILL_ID,
            actionId,
            selectedRowCount: targetTasks.length,
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
        setPtrAIRetryAction(null);
        setSaveMessage(text.aiNoRecommendations);
        return;
      }

      const firstTargetTask = targetTasks[0];

      setPtrAiIssues([
        {
          id: `ptr-ai-assistant-${actionId}-${Date.now()}`,
          issueCode:
            actionId === "suggest-split-complex-task"
              ? "MULTI_ACTION_TASK"
              : "SERVICE_BLUEPRINT_CARD_READINESS",
          stepId: firstTargetTask.stepId,
          taskName: firstTargetTask.taskName || firstTargetTask.stepId,
          severity: "suggestion",
          message: `${text.aiAssistant}: ${
            actionLabel ??
            text[ptrAIAssistantActions.find((action) => action.id === actionId)?.textKey ?? "aiAssistant"]
          }`,
          suggestedFix:
            "Review the AI recommendations in this panel, then apply selected items only after confirmation.",
          recommendations
        }
      ]);
      setSaveMessage(
        `${text.aiRecommendationsReady} (${recommendations.length}; ${
          data.mode === "provider-backed" ? "provider-backed" : "mock/local"
        })`
      );
      setPtrAIRetryAction(null);
      saveAuditLogEntry({
        action: "ai_call",
        status: "success",
        summary: "PTR AI Assistant generated recommendations.",
        metadata: {
          skillId: PTR_AI_ASSISTANT_SKILL_ID,
          actionId,
          selectedRowCount: targetTasks.length,
          recommendationCount: recommendations.length,
          mode: data.mode ?? "mock",
          externalApiCalled: data.meta?.externalApiCalled === true
        }
      });
    } catch {
      setPtrAiIssues([]);
      setPtrAIRetryAction(actionId);
      setSaveMessage(
        locale === "vi"
          ? "AI Assistant chưa tạo được đề xuất. Vui lòng thử lại."
          : "AI Assistant could not create suggestions. Please try again."
      );
      saveAuditLogEntry({
        action: "ai_call",
        status: "failure",
        summary: "PTR AI Assistant network request failed.",
        metadata: {
          skillId: PTR_AI_ASSISTANT_SKILL_ID,
          actionId,
          selectedRowCount: targetTasks.length,
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
    setSaveMessage("Có thay đổi chưa lưu.");
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
    setSaveMessage("Đã thêm dòng mới. Bấm Lưu để giữ sau khi refresh.");
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
    setSaveMessage("Đã nhân bản dòng. Bấm Lưu để giữ sau khi refresh.");
  }

  function deleteRow(index: number) {
    setTasks((currentTasks) =>
      persistTasks(currentTasks.filter((_, taskIndex) => taskIndex !== index))
    );
    markGeneratedArtifactsStale();
    markUnsaved();
    setSaveMessage("Đã xóa dòng. Bấm Lưu để giữ sau khi refresh.");
  }

  function saveTasks() {
    if (saveStateTimeoutRef.current) {
      window.clearTimeout(saveStateTimeoutRef.current);
      saveStateTimeoutRef.current = null;
    }

    setSaveState("saving");
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    lastSavedTasksRef.current = tasks.map((task) => ({ ...task }));
    markGeneratedArtifactsStale();
    saveStateTimeoutRef.current = window.setTimeout(() => {
      setSaveState("saved");
      saveStateTimeoutRef.current = null;
    }, 350);
    setSaveMessage("Đã lưu vào localStorage.");
  }

  function resetTasks() {
    if (!confirmDiscardUnsavedChanges("Reset sample")) {
      setSaveMessage("Reset cancelled. Unsaved changes are still in the table.");
      return;
    }

    const sampleTasks = cloneSampleTasks(selectedSampleProcessId);

    setTasks(sampleTasks);
    lastSavedTasksRef.current = sampleTasks.map((task) => ({ ...task }));
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.setItem(SAMPLE_PROCESS_STORAGE_KEY, selectedSampleProcessId);
    setSelectedProcessRegisterProfile(getProfileForSampleProcess(selectedSampleProcessId));
    persistProcessRegisterProfile(getProfileForSampleProcess(selectedSampleProcessId));
    markGeneratedArtifactsStale();
    markSaved();
    setSaveMessage(`Đã reset về dữ liệu mẫu ${activeSampleProcess.label}.`);
  }

  function switchSampleProcess(sampleId: string) {
    const nextSampleProcess = getSampleProcess(sampleId);

    if (nextSampleProcess.id === selectedSampleProcessId) {
      return;
    }

    if (!confirmDiscardUnsavedChanges("Switch sample")) {
      setSaveMessage("Sample switch cancelled. Unsaved changes are still in the table.");
      return;
    }

    const shouldReplace = window.confirm(
      `Thay bảng hiện tại bằng dữ liệu mẫu ${nextSampleProcess.label}?`
    );

    if (!shouldReplace) {
      return;
    }

    const sampleTasks = cloneSampleTasks(nextSampleProcess.id);

    setSelectedSampleProcessId(nextSampleProcess.id);
    setSelectedProcessRegisterProfile(getProfileForSampleProcess(nextSampleProcess.id));
    persistProcessRegisterProfile(getProfileForSampleProcess(nextSampleProcess.id));
    setTasks(persistTasks(sampleTasks));
    lastSavedTasksRef.current = sampleTasks.map((task) => ({ ...task }));
    window.localStorage.setItem(SAMPLE_PROCESS_STORAGE_KEY, nextSampleProcess.id);
    setImportPreview(null);
    setHighlightedStepId(null);
    markGeneratedArtifactsStale();
    markSaved();
    setSaveMessage(`Đã chuyển sang dữ liệu mẫu ${nextSampleProcess.label}.`);
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
    setSaveMessage("Da export Process Task Register hien tai ra JSON.");
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
          ? "Excel import có lỗi. Vui lòng kiểm tra preview trước khi apply."
          : "Đã đọc file Excel. Kiểm tra preview rồi bấm Apply Import để cập nhật bảng."
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
      setSaveMessage("Không thể apply import khi còn lỗi.");
      return;
    }

    const nextTasks = persistTasks(importPreview.tasks);

    setTasks(nextTasks);
    lastSavedTasksRef.current = nextTasks.map((task) => ({ ...task }));
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
    setSaveMessage("Đã apply Excel import, lưu vào localStorage và đánh dấu D01/D02 stale.");
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
        `Đã apply recommendation "${recommendation.title}" và đánh dấu D01/D02 stale.`
      );
    } catch (error) {
      setSaveMessage(formatRecommendationApplyError(error));
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
        `Đã apply ${preview.applicableCount} recommendation(s), skip ${preview.skippedCount} conflict(s), và đánh dấu D01/D02 stale.`
      );
    } catch (error) {
      setSaveMessage(formatRecommendationApplyError(error));
    }
  }

  return (
    <>
      <QAPanel
        issues={displayQaIssues}
        processTasks={tasks}
        onApplyRecommendation={applyRecommendation}
        onApplyRecommendations={applyRecommendations}
        onDownloadReport={downloadQaReport}
        onIssueClick={focusIssueRow}
      />

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
            {saveState === "unsaved" ? (
              <button
                className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
                onClick={restoreLastSavedTasks}
                type="button"
              >
                {text.restoreSaved}
              </button>
            ) : null}
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
              <button
                className="btn btn-secondary"
                onClick={autoSuggestInteractionFields}
                type="button"
              >
                {text.autoSuggest}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-sky-950">
              <span className="text-xs font-bold uppercase tracking-wide text-sky-700">
                {text.detectedProfile}
              </span>
              <span className="rounded-full border border-sky-200 bg-white px-2 py-1 font-semibold">
                {selectedProcessRegisterProfile.label}
              </span>
              <span className="text-sky-800">
                {text.profileConfidence}: {selectedProcessRegisterProfile.confidence}
              </span>
              <span className="text-sky-700">
                {selectedProcessRegisterProfile.reason}
              </span>
            </div>
            <div className="mt-4 rounded-md border border-blue-100 bg-blue-50/70 p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                    {text.bulkActions}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {text.selectedRowsCount}: {selectedTasks.length}
                  </p>
                </div>
                <div className="relative flex flex-wrap gap-2">
                  <div className="flex flex-col">
                    <button
                      className="btn btn-ai"
                      disabled={isRunningPtrAI || tasks.length === 0}
                      onClick={() =>
                        void runPtrAIAssistantAction(
                          PTR_AI_DEFAULT_ACTION_ID,
                          text.aiQaSuggest
                        )
                      }
                      type="button"
                    >
                      {isRunningPtrAI ? text.aiRunning : text.aiQaSuggest}
                    </button>
                    <span className="mt-1 text-xs text-slate-500">
                      {ptrAIModeIndicator}
                    </span>
                  </div>
                  <button
                    aria-label={text.aiMoreActions}
                    className="rounded border border-blue-200 bg-white px-3 py-2 text-sm font-bold text-blue-800 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isRunningPtrAI || tasks.length === 0}
                    onClick={() => setIsPtrAIMenuOpen((isOpen) => !isOpen)}
                    title={text.aiMoreActions}
                    type="button"
                  >
                    ...
                  </button>
                  {isPtrAIMenuOpen ? (
                    <div className="absolute right-0 top-11 z-30 w-72 rounded border border-slate-200 bg-white p-1 text-sm shadow-lg">
                      {ptrAIAssistantSecondaryActions.map((action) => (
                        <button
                          className="block w-full rounded px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                          disabled={isRunningPtrAI}
                          key={action.id}
                          onClick={() => void runPtrAIAssistantAction(action.id)}
                          type="button"
                        >
                          {text[action.textKey]}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <button
                    className="btn btn-secondary"
                    disabled={selectedTasks.length === 0}
                    onClick={() => setSelectedStepIds(new Set())}
                    type="button"
                  >
                    {text.clearSelection}
                  </button>
                </div>
              </div>
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
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <p>{saveMessage}</p>
              {ptrAIRetryAction && !isRunningPtrAI ? (
                <button
                  className="btn btn-secondary"
                  onClick={() => void runPtrAIAssistantAction(ptrAIRetryAction)}
                  type="button"
                >
                  Retry
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="mb-4 rounded border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-900">
              {text.readinessTitle}
            </p>
            <div className="mt-3 grid gap-2 md:grid-cols-5">
              {[
                {
                  label: text.ptrReadiness,
                  value: text[saveState],
                  tone:
                    saveState === "saved"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : saveState === "saving"
                        ? "border-sky-200 bg-sky-50 text-sky-800"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                },
                {
                  label: text.qaReadiness,
                  value: String(displayQaIssues.length),
                  tone:
                    displayQaIssues.length === 0
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                },
                {
                  label: text.d01Readiness,
                  value: `${artifactReadiness.d01Status} | ${text.gateLabel}: ${artifactReadiness.d01GateStatus}`,
                  tone:
                    artifactReadiness.d01Status === "fresh" &&
                    artifactReadiness.d01GateStatus !== "fail"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                },
                {
                  label: text.d02Readiness,
                  value: `${artifactReadiness.d02Status} | ${text.gateLabel}: ${artifactReadiness.d02GateStatus}`,
                  tone:
                    artifactReadiness.d02Status === "fresh" &&
                    artifactReadiness.d02GateStatus !== "fail"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                },
                {
                  label: text.exportReadiness,
                  value: exportZipReady ? text.exportReady : text.exportNotReady,
                  tone: exportZipReady
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-600"
                }
              ].map((item) => (
                <div
                  className={`rounded border px-3 py-2 ${item.tone}`}
                  key={item.label}
                >
                  <p className="text-xs font-semibold uppercase">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

        {importPreview ? (
          <div className="mb-4 rounded border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-slate-950">
                  Preview Excel import
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Số dòng đọc được: {importPreview.tasks.length} | Lỗi:{" "}
                  {importPreview.errors.length} | Cảnh báo:{" "}
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
                  Apply Import
                </button>
                <button
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={cancelImport}
                  type="button"
                >
                  Cancel Import
                </button>
              </div>
            </div>

            {importPreview.errors.length > 0 ? (
              <div className="mt-4 rounded border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-semibold text-red-800">Lỗi import</p>
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
                  Cảnh báo import
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
                    <th
                      className="border-b border-r border-slate-200 px-3 py-2"
                      title="rowType: loai dong trong Process Task Register."
                    >
                      rowType
                    </th>
                    <th
                      className="border-b border-r border-slate-200 px-3 py-2"
                      title="bpmnType: loai BPMN duoc dung khi ve D01 BPMN."
                    >
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
                  Chỉ hiển thị 8 dòng đầu trong preview.
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
                      columnMode === "simple" && column.key === "stepId"
                        ? "sticky left-[6.5rem] top-0 z-40 bg-slate-100"
                        : columnMode === "simple" && column.key === "taskName"
                          ? "sticky left-[13.375rem] top-0 z-40 bg-slate-100"
                          : ""
                    }`}
                    key={column.key}
                    style={{ minWidth: column.minWidth }}
                    title={column.helpText}
                  >
                    <span className="inline-flex items-center gap-1">
                      {column.label}
                      {column.helpText ? (
                        <span
                          aria-hidden="true"
                          className="text-xs font-semibold text-slate-400"
                        >
                          ?
                        </span>
                      ) : null}
                    </span>
                  </th>
                ))}
                <th className="sticky right-0 top-0 z-40 w-24 border-b border-l border-slate-200 bg-slate-100 px-3 py-3 font-semibold">
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
                    const selectedOptionHelp = options.find(
                      (option) => option.value === cellValue
                    )?.helpText;
                    const hasInvalidValue = isInvalidSelectValue(column.key, cellValue, task);
                    const invalidMessage =
                      column.key === "bpmnType"
                        ? "BPMN type không phù hợp với loại dòng hiện tại."
                        : "Giá trị cũ không nằm trong danh sách chuẩn.";

                    return (
                      <td
                        className={`border-b border-r border-slate-200 p-1 ${
                          columnMode === "simple" && column.key === "stepId"
                            ? "sticky left-[6.5rem] z-20 bg-inherit"
                            : columnMode === "simple" && column.key === "taskName"
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
                            title={selectedOptionHelp ?? column.helpText}
                            value={cellValue}
                          >
                            {options.map((option) => (
                              <option
                                key={option.value}
                                title={option.helpText}
                                value={option.value}
                              >
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
                            title={column.helpText}
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
                    <div className="relative">
                      <button
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() =>
                          setOpenRowActionTaskId((currentTaskId) =>
                            currentTaskId === task.id ? null : task.id
                          )
                        }
                        type="button"
                      >
                        ...
                      </button>
                      {openRowActionTaskId === task.id ? (
                        <div className="absolute right-0 z-40 mt-2 w-32 rounded border border-slate-200 bg-white p-1 text-sm shadow-lg">
                          <button
                            className="block w-full rounded px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                            onClick={() => {
                              duplicateRow(index);
                              setOpenRowActionTaskId(null);
                            }}
                            type="button"
                          >
                            {text.duplicateRow}
                          </button>
                          <button
                            className="block w-full rounded px-3 py-2 text-left text-red-700 hover:bg-red-50"
                            onClick={() => {
                              deleteRow(index);
                              setOpenRowActionTaskId(null);
                            }}
                            type="button"
                          >
                            {text.deleteRow}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SessionFrame>
    </>
  );
}
