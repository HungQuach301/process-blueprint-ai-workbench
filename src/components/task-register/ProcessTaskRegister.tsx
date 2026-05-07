"use client";

import { useEffect, useMemo, useState } from "react";
import { QAPanel } from "@/components/qa-panel/QAPanel";
import { createProcessTaskRegisterTemplateWorkbook } from "@/lib/excel/process-task-register-template";
import { generateQaReportMarkdown } from "@/lib/generators/qa-report-generator";
import type { ProcessTask } from "@/lib/models/process-task";
import type { TemplateProfile } from "@/lib/models/template-profile";
import { validateProcessTasks } from "@/lib/qa/task-register-rules";
import {
  inferChannel,
  inferCustomerInteractionType
} from "@/lib/utils/process-task-inference";
import {
  sampleBpmnTemplateProfile,
  sampleProcessTasks,
  sampleServiceBlueprintTemplateProfile,
  sampleWorkspace
} from "@/lib/sample-data/sme-online-loan";

const STORAGE_KEY = "process-blueprint-ai-workbench:process-tasks";
const TEMPLATES_STORAGE_KEY =
  "process-blueprint-ai-workbench:template-profiles";
const D01_STORAGE_KEY = "process-blueprint-ai-workbench:selected-d01-template";
const D02_STORAGE_KEY = "process-blueprint-ai-workbench:selected-d02-template";
const D01_GENERATED_STATUS_KEY =
  "process-blueprint-ai-workbench:generated-d01-bpmn-status";
const D02_GENERATED_STATUS_KEY =
  "process-blueprint-ai-workbench:generated-d02-service-blueprint-status";
const ARTIFACT_STATUS_EVENT = "process-blueprint-artifact-status-change";

type EditableColumn = {
  key: keyof ProcessTask;
  label: string;
  minWidth: string;
};

type SelectOption = {
  value: string;
  label: string;
};

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

function cloneSampleTasks() {
  return sampleProcessTasks.map((task) => ({ ...task }));
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

function isEmptyInteractionType(task: ProcessTask) {
  return !task.customerInteractionType || task.customerInteractionType === "None";
}

function isEmptyChannel(task: ProcessTask) {
  return !task.channel || task.channel === "Other";
}

export function ProcessTaskRegister() {
  const [tasks, setTasks] = useState<ProcessTask[]>(() => cloneSampleTasks());
  const [saveMessage, setSaveMessage] = useState("");
  const [highlightedStepId, setHighlightedStepId] = useState<string | null>(null);

  useEffect(() => {
    const savedTasks = window.localStorage.getItem(STORAGE_KEY);

    if (!savedTasks) {
      return;
    }

    try {
      const parsedTasks = JSON.parse(savedTasks);

      if (Array.isArray(parsedTasks)) {
        setTasks(parsedTasks as ProcessTask[]);
      }
    } catch {
      setSaveMessage("Dữ liệu đã lưu không hợp lệ. Đang dùng dữ liệu mẫu.");
    }
  }, []);

  const gatewayCount = useMemo(
    () => tasks.filter((task) => task.rowType === "gateway").length,
    [tasks]
  );

  const qaIssues = useMemo(() => validateProcessTasks(tasks), [tasks]);

  function focusIssueRow(stepId: string) {
    setHighlightedStepId(stepId);
    document
      .getElementById(`process-task-row-${stepId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
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
    setSaveMessage("Đã nhân bản dòng. Bấm Lưu để giữ sau khi refresh.");
  }

  function deleteRow(index: number) {
    setTasks((currentTasks) =>
      persistTasks(currentTasks.filter((_, taskIndex) => taskIndex !== index))
    );
    markGeneratedArtifactsStale();
    setSaveMessage("Đã xóa dòng. Bấm Lưu để giữ sau khi refresh.");
  }

  function saveTasks() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    markGeneratedArtifactsStale();
    setSaveMessage("Đã lưu vào localStorage.");
  }

  function resetTasks() {
    const sampleTasks = cloneSampleTasks();

    setTasks(sampleTasks);
    window.localStorage.removeItem(STORAGE_KEY);
    markGeneratedArtifactsStale();
    setSaveMessage("Đã reset về dữ liệu mẫu.");
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

  return (
    <>
      <QAPanel
        issues={qaIssues}
        onDownloadReport={downloadQaReport}
        onIssueClick={focusIssueRow}
      />

      <section className="rounded border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase text-slate-500">
                Process Task Register
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                Bảng công việc SME Online Loan
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Dữ liệu có thể sửa trực tiếp trong bảng. Bấm Lưu để giữ lại sau
                khi refresh trình duyệt.
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
                <li>Một dòng = một task/gateway/event/data interaction.</li>
                <li>Gateway phải có câu hỏi điều kiện và đủ nhánh yes/no.</li>
                <li>System/data phải giữ liên kết với hành trình người dùng.</li>
              </ul>
              <p className="mt-2 text-sm text-slate-500">
                Tổng dòng: {tasks.length} | Gateway: {gatewayCount}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={addRow}
                type="button"
              >
                Thêm dòng
              </button>
              <button
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={autoSuggestInteractionFields}
                type="button"
              >
                Auto-suggest interaction fields
              </button>
              <button
                className="rounded bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                onClick={saveTasks}
                type="button"
              >
                Lưu
              </button>
              <button
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={downloadExcelRegister}
                type="button"
              >
                Export Excel
              </button>
              <button
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={downloadExcelTemplate}
                type="button"
              >
                Download Excel Template
              </button>
              <button
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={resetTasks}
                type="button"
              >
                Reset mẫu
              </button>
            </div>
          </div>

          {saveMessage ? (
            <p className="mt-3 text-sm text-slate-600">{saveMessage}</p>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="sticky left-0 z-10 w-14 border-b border-r border-slate-200 bg-slate-100 px-3 py-3 font-semibold">
                  #
                </th>
                {visibleColumns.map((column) => (
                  <th
                    className="border-b border-r border-slate-200 px-3 py-3 font-semibold"
                    key={column.key}
                    style={{ minWidth: column.minWidth }}
                  >
                    {column.label}
                  </th>
                ))}
                <th className="sticky right-0 z-10 w-44 border-b border-l border-slate-200 bg-slate-100 px-3 py-3 font-semibold">
                  Thao tác
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
                  <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-inherit px-3 py-2 font-medium text-slate-600">
                    {index + 1}
                  </td>
                  {visibleColumns.map((column) => {
                    const cellValue = String(getCellValue(task, column.key));
                    const options = getSelectOptions(column.key, cellValue, task);
                    const hasInvalidValue = isInvalidSelectValue(column.key, cellValue, task);
                    const invalidMessage =
                      column.key === "bpmnType"
                        ? "BPMN type không phù hợp với loại dòng hiện tại."
                        : "Giá trị cũ không nằm trong danh sách chuẩn.";

                    return (
                      <td
                        className="border-b border-r border-slate-200 p-1"
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
                  <td className="sticky right-0 z-10 border-b border-l border-slate-200 bg-inherit p-2">
                    <div className="flex gap-2">
                      <button
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() => duplicateRow(index)}
                        type="button"
                      >
                        Nhân bản
                      </button>
                      <button
                        className="rounded border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                        onClick={() => deleteRow(index)}
                        type="button"
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
