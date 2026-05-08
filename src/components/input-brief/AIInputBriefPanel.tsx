"use client";

import { useEffect, useMemo, useState } from "react";
import { SessionFrame } from "@/components/layout/SessionFrame";
import { runMockInputBriefExtraction } from "@/lib/ai/ai-input-brief-service";
import type { StructuredInputBrief } from "@/lib/ai/ai-input-brief-types";
import type { ProcessTask } from "@/lib/models/process-task";

const BRIEF_STORAGE_KEY = "process-blueprint-ai-workbench:input-brief";
const TASKS_STORAGE_KEY = "process-blueprint-ai-workbench:process-tasks";
const PROCESS_TASKS_EVENT = "process-blueprint-process-tasks-change";
const D01_GENERATED_STATUS_KEY =
  "process-blueprint-ai-workbench:generated-d01-bpmn-status";
const D02_GENERATED_STATUS_KEY =
  "process-blueprint-ai-workbench:generated-d02-service-blueprint-status";
const ARTIFACT_STATUS_EVENT = "process-blueprint-artifact-status-change";

const emptyBrief: StructuredInputBrief = {
  processName: "",
  businessObjective: "",
  scope: "",
  startEvent: "",
  endEvent: "",
  actors: "",
  systems: "",
  dataDocuments: "",
  happyPath: "",
  exceptions: "",
  slaControl: "",
  desiredOutputs: ""
};

const briefFields: Array<{
  key: keyof StructuredInputBrief;
  label: string;
  placeholder: string;
  rows?: number;
}> = [
  {
    key: "processName",
    label: "Process name",
    placeholder: "Corporate account opening"
  },
  {
    key: "businessObjective",
    label: "Business objective",
    placeholder: "Mục tiêu nghiệp vụ của quy trình",
    rows: 3
  },
  {
    key: "scope",
    label: "Scope",
    placeholder: "Trong phạm vi / ngoài phạm vi",
    rows: 3
  },
  {
    key: "startEvent",
    label: "Start event",
    placeholder: "Khách hàng gửi yêu cầu"
  },
  {
    key: "endEvent",
    label: "End event",
    placeholder: "Tài khoản được mở hoặc yêu cầu bị từ chối"
  },
  {
    key: "actors",
    label: "Actors",
    placeholder: "Customer, RM, Ops, Approver",
    rows: 3
  },
  {
    key: "systems",
    label: "Systems",
    placeholder: "CRM, Core Banking, Document Store",
    rows: 3
  },
  {
    key: "dataDocuments",
    label: "Data/documents",
    placeholder: "Application form, KYC documents, approval record",
    rows: 3
  },
  {
    key: "happyPath",
    label: "Happy path",
    placeholder: "Các bước chính khi quy trình đi đúng luồng",
    rows: 5
  },
  {
    key: "exceptions",
    label: "Exceptions",
    placeholder: "Thiếu hồ sơ, fail validation, cần bổ sung",
    rows: 4
  },
  {
    key: "slaControl",
    label: "SLA/control",
    placeholder: "SLA, maker-checker, approval control",
    rows: 3
  },
  {
    key: "desiredOutputs",
    label: "Desired outputs",
    placeholder: "D01 BPMN, D02 Service Blueprint, QA Report",
    rows: 3
  }
];

function markGeneratedArtifactsStale() {
  window.localStorage.setItem(D01_GENERATED_STATUS_KEY, "stale");
  window.localStorage.setItem(D02_GENERATED_STATUS_KEY, "stale");
  window.dispatchEvent(new Event(ARTIFACT_STATUS_EVENT));
}

function createBriefText(brief: StructuredInputBrief) {
  return briefFields
    .map((field) => `${field.label}: ${brief[field.key]}`)
    .join("\n\n");
}

export function AIInputBriefPanel() {
  const [brief, setBrief] = useState<StructuredInputBrief>(emptyBrief);
  const [draftTasks, setDraftTasks] = useState<ProcessTask[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const savedBrief = window.localStorage.getItem(BRIEF_STORAGE_KEY);

    if (!savedBrief) {
      return;
    }

    try {
      const parsedBrief = JSON.parse(savedBrief);

      if (parsedBrief && typeof parsedBrief === "object") {
        setBrief({ ...emptyBrief, ...parsedBrief });
      }
    } catch {
      setMessage("Brief đã lưu không hợp lệ. Đang dùng form trống.");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(BRIEF_STORAGE_KEY, JSON.stringify(brief));
  }, [brief]);

  const filledFieldCount = useMemo(
    () => briefFields.filter((field) => brief[field.key].trim()).length,
    [brief]
  );

  function updateBriefField(key: keyof StructuredInputBrief, value: string) {
    setBrief((currentBrief) => ({
      ...currentBrief,
      [key]: value
    }));
    setMessage("Brief đã được lưu local.");
  }

  function generateDraftPtr() {
    const response = runMockInputBriefExtraction({
      context: {
        scope: "auto-generate",
        executionMode: "mock",
        providerSettings: {
          provider: "no-ai",
          dataUsageMode: "local-only"
        },
        requestId: `input-brief-${Date.now()}`
      },
      briefText: createBriefText(brief),
      structuredBrief: brief,
      sourceName: brief.processName || "Input Brief"
    });

    setDraftTasks(response.draftProcessTasks);
    setMessage(
      `Đã tạo draft PTR bằng mock local: ${response.draftProcessTasks.length} dòng. Không gọi external API.`
    );
  }

  function applyDraftPtr() {
    if (draftTasks.length === 0) {
      setMessage("Chưa có draft PTR để apply.");
      return;
    }

    const confirmed = window.confirm(
      "Apply draft PTR sẽ thay thế bảng Process Task Register hiện tại. Bạn muốn tiếp tục?"
    );

    if (!confirmed) {
      return;
    }

    window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(draftTasks));
    window.dispatchEvent(new Event(PROCESS_TASKS_EVENT));
    markGeneratedArtifactsStale();
    setMessage("Đã apply draft PTR vào Process Task Register. QA sẽ chạy lại theo dữ liệu mới.");
  }

  function clearBrief() {
    setBrief(emptyBrief);
    setDraftTasks([]);
    window.localStorage.removeItem(BRIEF_STORAGE_KEY);
    setMessage("Đã xoá brief local và draft preview.");
  }

  return (
    <SessionFrame
      actions={
        <>
          <button
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={clearBrief}
            type="button"
          >
            Clear Brief
          </button>
          <button
            className="rounded bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            onClick={generateDraftPtr}
            type="button"
          >
            Generate Draft PTR
          </button>
          <button
            className="rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={draftTasks.length === 0}
            onClick={applyDraftPtr}
            type="button"
          >
            Apply Draft
          </button>
        </>
      }
      bodyClassName="p-4"
      description="Nhập brief có cấu trúc để tạo draft Process Task Register bằng mock local. Chưa gọi AI/API thật và chưa parse file."
      title="AI Input Brief"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {briefFields.map((field) => (
          <label className="block" key={field.key}>
            <span className="text-sm font-medium text-slate-700">{field.label}</span>
            {field.rows ? (
              <textarea
                className="mt-2 min-h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
                onChange={(event) => updateBriefField(field.key, event.target.value)}
                placeholder={field.placeholder}
                rows={field.rows}
                value={brief[field.key]}
              />
            ) : (
              <input
                className="mt-2 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
                onChange={(event) => updateBriefField(field.key, event.target.value)}
                placeholder={field.placeholder}
                type="text"
                value={brief[field.key]}
              />
            )}
          </label>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <span>{filledFieldCount}/{briefFields.length} sections filled</span>
        {message ? <span>{message}</span> : null}
      </div>

      {draftTasks.length > 0 ? (
        <div className="mt-5 rounded border border-slate-200">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-950">
              Draft PTR Preview
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {draftTasks.length} dòng draft. Hãy review trước khi apply.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-white text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Step</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">System</th>
                  <th className="px-4 py-3">Task</th>
                  <th className="px-4 py-3">Next</th>
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
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {task.defaultNextStep ?? task.yesNextStep ?? "-"}
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
