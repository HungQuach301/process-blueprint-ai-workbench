"use client";

import { useEffect, useMemo, useState } from "react";
import { SessionFrame } from "@/components/layout/SessionFrame";
import { saveAuditLogEntry } from "@/lib/audit/audit-log";
import type { StructuredInputBrief } from "@/lib/ai/ai-input-brief-types";
import {
  generateDraftProcessTaskRegister,
  parseStructuredProcessBriefFromForm,
  type DraftPTRGenerationResult
} from "@/lib/ai-intake";
import { getLocale, t, type Locale, type TranslationKey } from "@/lib/i18n";
import type { ProcessTask } from "@/lib/models/process-task";

const BRIEF_STORAGE_KEY = "process-blueprint-ai-workbench:input-brief";
const TASKS_STORAGE_KEY = "process-blueprint-ai-workbench:process-tasks";
const PROCESS_TASKS_EVENT = "process-blueprint-process-tasks-change";
const D01_GENERATED_STATUS_KEY =
  "process-blueprint-ai-workbench:generated-d01-bpmn-status";
const D02_GENERATED_STATUS_KEY =
  "process-blueprint-ai-workbench:generated-d02-service-blueprint-status";
const ARTIFACT_STATUS_EVENT = "process-blueprint-artifact-status-change";
const LOCALE_EVENT = "process-blueprint-locale-change";

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

export function AIInputBriefPanel() {
  const [brief, setBrief] = useState<InputBriefFormState>(emptyBrief);
  const [draftTasks, setDraftTasks] = useState<ProcessTask[]>([]);
  const [draftMeta, setDraftMeta] = useState<DraftPTRGenerationResult | null>(null);
  const [message, setMessage] = useState("");
  const [locale, setActiveLocale] = useState<Locale>("vi");

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
    const response = generateDraftProcessTaskRegister({
      brief: structuredBrief,
      currentLocale: locale
    });

    setDraftTasks(response.draftProcessTasks);
    setDraftMeta(response);
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
    saveAuditLogEntry({
      action: "apply_ai_draft",
      status: "success",
      summary: "Applied draft Process Task Register from AI Input Brief workflow.",
      metadata: {
        rowCount: draftTasks.length
      }
    });
    setMessage("Đã apply draft PTR vào Process Task Register. QA sẽ chạy lại theo dữ liệu mới.");
  }

  function resetBrief() {
    setBrief(emptyBrief);
    setDraftTasks([]);
    setDraftMeta(null);
    window.localStorage.removeItem(BRIEF_STORAGE_KEY);
    setMessage("Đã reset brief local và draft preview.");
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
            className="rounded bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            onClick={generateDraftPtr}
            type="button"
          >
            {t("inputBrief.generateDraftProcessTaskRegister", locale)}
          </button>
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

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <span>
          {filledFieldCount}/{briefFields.length}{" "}
          {t("inputBrief.sectionsFilled", locale)}
        </span>
        {message ? <span>{message}</span> : null}
      </div>

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
            <button
              className="rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
              onClick={applyDraftPtr}
              type="button"
            >
              {t("inputBrief.applyDraft", locale)}
            </button>
          </div>
          {draftMeta ? (
            <div className="grid gap-4 border-b border-slate-200 bg-white px-4 py-4 text-sm md:grid-cols-2">
              <div>
                <p className="font-semibold text-slate-900">Source summary</p>
                <p className="mt-1 text-slate-600">{draftMeta.sourceSummary}</p>
                <p className="mt-3 text-slate-600">
                  Confidence:{" "}
                  <span className="font-semibold text-slate-900">
                    {draftMeta.confidence}
                  </span>
                </p>
              </div>
              <div className="grid gap-3">
                <div>
                  <p className="font-semibold text-slate-900">Assumptions</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">
                    {draftMeta.assumptions.map((assumption) => (
                      <li key={assumption}>{assumption}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Open questions</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">
                    {draftMeta.openQuestions.map((question) => (
                      <li key={question}>{question}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-white text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Step</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">System</th>
                  <th className="px-4 py-3">Task</th>
                  <th className="px-4 py-3">Review</th>
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
                      {task.reviewStatus}
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
