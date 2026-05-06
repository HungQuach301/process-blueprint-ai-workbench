"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProcessTask } from "@/lib/models/process-task";
import { sampleProcessTasks } from "@/lib/sample-data/sme-online-loan";

const STORAGE_KEY = "process-blueprint-ai-workbench:process-tasks";

type EditableColumn = {
  key: keyof ProcessTask;
  label: string;
  minWidth: string;
};

const visibleColumns: EditableColumn[] = [
  { key: "stepId", label: "Mã bước", minWidth: "110px" },
  { key: "rowType", label: "Loại dòng", minWidth: "120px" },
  { key: "bpmnType", label: "Loại BPMN", minWidth: "150px" },
  { key: "taskNature", label: "Tính chất", minWidth: "150px" },
  { key: "phase", label: "Giai đoạn", minWidth: "170px" },
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

const nullableColumns: Array<keyof ProcessTask> = [
  "parentStepId",
  "defaultNextStep",
  "yesNextStep",
  "noNextStep"
];

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
  return task[key] ?? "";
}

function normalizeCellValue(key: keyof ProcessTask, value: string) {
  if (nullableColumns.includes(key) && value.trim() === "") {
    return null;
  }

  return value;
}

export function ProcessTaskRegister() {
  const [tasks, setTasks] = useState<ProcessTask[]>(() => cloneSampleTasks());
  const [saveMessage, setSaveMessage] = useState("");

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

  function updateCell(index: number, key: keyof ProcessTask, value: string) {
    setTasks((currentTasks) =>
      currentTasks.map((task, taskIndex) =>
        taskIndex === index
          ? ({
              ...task,
              [key]: normalizeCellValue(key, value)
            } as ProcessTask)
          : task
      )
    );
    setSaveMessage("Có thay đổi chưa lưu.");
  }

  function addRow() {
    setTasks((currentTasks) => [...currentTasks, createEmptyTask(currentTasks.length)]);
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

      return [
        ...currentTasks.slice(0, index + 1),
        duplicatedTask,
        ...currentTasks.slice(index + 1)
      ];
    });
    setSaveMessage("Đã nhân bản dòng. Bấm Lưu để giữ sau khi refresh.");
  }

  function deleteRow(index: number) {
    setTasks((currentTasks) =>
      currentTasks.filter((_, taskIndex) => taskIndex !== index)
    );
    setSaveMessage("Đã xóa dòng. Bấm Lưu để giữ sau khi refresh.");
  }

  function saveTasks() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    setSaveMessage("Đã lưu vào localStorage.");
  }

  function resetTasks() {
    const sampleTasks = cloneSampleTasks();

    setTasks(sampleTasks);
    window.localStorage.removeItem(STORAGE_KEY);
    setSaveMessage("Đã reset về dữ liệu mẫu.");
  }

  return (
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
              className="rounded bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              onClick={saveTasks}
              type="button"
            >
              Lưu
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
              <tr className="align-top odd:bg-white even:bg-slate-50" key={task.id}>
                <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-inherit px-3 py-2 font-medium text-slate-600">
                  {index + 1}
                </td>
                {visibleColumns.map((column) => (
                  <td
                    className="border-b border-r border-slate-200 p-1"
                    key={column.key}
                    style={{ minWidth: column.minWidth }}
                  >
                    <input
                      aria-label={`${column.label} dòng ${index + 1}`}
                      className="w-full rounded border border-transparent bg-transparent px-2 py-2 text-sm text-slate-800 outline-none hover:border-slate-300 focus:border-slate-500 focus:bg-white"
                      onChange={(event) =>
                        updateCell(index, column.key, event.target.value)
                      }
                      type="text"
                      value={String(getCellValue(task, column.key))}
                    />
                  </td>
                ))}
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
  );
}
