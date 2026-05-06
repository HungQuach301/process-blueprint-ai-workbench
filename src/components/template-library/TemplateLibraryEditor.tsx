"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  TemplateProfile,
  TemplateStatus,
  TemplateType
} from "@/lib/models/template-profile";
import {
  sampleBpmnTemplateProfile,
  sampleServiceBlueprintTemplateProfile
} from "@/lib/sample-data/sme-online-loan";

const TEMPLATES_STORAGE_KEY =
  "process-blueprint-ai-workbench:template-profiles";
const D01_STORAGE_KEY = "process-blueprint-ai-workbench:selected-d01-template";
const D02_STORAGE_KEY = "process-blueprint-ai-workbench:selected-d02-template";

type RuleField =
  | "laneRules"
  | "rowRules"
  | "taskCardRules"
  | "connectorRules"
  | "colorRules"
  | "layoutRules";

type TemplateDraft = Omit<
  TemplateProfile,
  | "laneRules"
  | "rowRules"
  | "taskCardRules"
  | "connectorRules"
  | "colorRules"
  | "layoutRules"
  | "mandatoryFields"
> & {
  laneRules: string;
  rowRules: string;
  taskCardRules: string;
  connectorRules: string;
  colorRules: string;
  layoutRules: string;
  mandatoryFields: string;
};

const ruleFields: Array<{ key: RuleField; label: string }> = [
  { key: "laneRules", label: "Quy tắc lane" },
  { key: "rowRules", label: "Quy tắc dòng" },
  { key: "taskCardRules", label: "Quy tắc task card" },
  { key: "connectorRules", label: "Quy tắc connector" },
  { key: "colorRules", label: "Quy tắc màu" },
  { key: "layoutRules", label: "Quy tắc layout" }
];

function cloneSampleTemplates() {
  return [
    { ...sampleBpmnTemplateProfile },
    { ...sampleServiceBlueprintTemplateProfile }
  ];
}

function formatRule(value: Record<string, unknown>) {
  return JSON.stringify(value, null, 2);
}

function profileToDraft(profile: TemplateProfile): TemplateDraft {
  return {
    id: profile.id,
    name: profile.name,
    type: profile.type,
    version: profile.version,
    status: profile.status,
    laneRules: formatRule(profile.laneRules),
    rowRules: formatRule(profile.rowRules),
    taskCardRules: formatRule(profile.taskCardRules),
    connectorRules: formatRule(profile.connectorRules),
    colorRules: formatRule(profile.colorRules),
    layoutRules: formatRule(profile.layoutRules),
    mandatoryFields: profile.mandatoryFields.join("\n")
  };
}

function sampleDrafts() {
  return cloneSampleTemplates().map(profileToDraft);
}

function parseRuleField(draft: TemplateDraft, key: RuleField) {
  const value = JSON.parse(draft[key]);

  if (value === null || Array.isArray(value) || typeof value !== "object") {
    throw new Error(`${key} phải là JSON object.`);
  }

  return value as Record<string, unknown>;
}

function draftToProfile(draft: TemplateDraft): TemplateProfile {
  return {
    id: draft.id,
    name: draft.name,
    type: draft.type,
    version: draft.version,
    status: draft.status,
    laneRules: parseRuleField(draft, "laneRules"),
    rowRules: parseRuleField(draft, "rowRules"),
    taskCardRules: parseRuleField(draft, "taskCardRules"),
    connectorRules: parseRuleField(draft, "connectorRules"),
    colorRules: parseRuleField(draft, "colorRules"),
    layoutRules: parseRuleField(draft, "layoutRules"),
    mandatoryFields: draft.mandatoryFields
      .split(/\r?\n/)
      .map((field) => field.trim())
      .filter(Boolean)
  };
}

function findTemplateName(drafts: TemplateDraft[], templateId: string) {
  return drafts.find((draft) => draft.id === templateId)?.name ?? "Chưa chọn";
}

export function TemplateLibraryEditor() {
  const [drafts, setDrafts] = useState<TemplateDraft[]>(() => sampleDrafts());
  const [activeTemplateId, setActiveTemplateId] = useState(
    sampleBpmnTemplateProfile.id
  );
  const [selectedD01TemplateId, setSelectedD01TemplateId] = useState(
    sampleBpmnTemplateProfile.id
  );
  const [selectedD02TemplateId, setSelectedD02TemplateId] = useState(
    sampleServiceBlueprintTemplateProfile.id
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const savedTemplates = window.localStorage.getItem(TEMPLATES_STORAGE_KEY);
    const savedD01 = window.localStorage.getItem(D01_STORAGE_KEY);
    const savedD02 = window.localStorage.getItem(D02_STORAGE_KEY);

    if (savedTemplates) {
      try {
        const parsedTemplates = JSON.parse(savedTemplates);

        if (Array.isArray(parsedTemplates)) {
          const savedDrafts = (parsedTemplates as TemplateProfile[]).map(
            profileToDraft
          );

          setDrafts(savedDrafts);
          setActiveTemplateId(savedDrafts[0]?.id ?? sampleBpmnTemplateProfile.id);
        }
      } catch {
        setMessage("Template đã lưu không hợp lệ. Đang dùng dữ liệu mẫu.");
      }
    }

    if (savedD01) {
      setSelectedD01TemplateId(savedD01);
    }

    if (savedD02) {
      setSelectedD02TemplateId(savedD02);
    }
  }, []);

  const activeDraft = useMemo(
    () => drafts.find((draft) => draft.id === activeTemplateId) ?? drafts[0],
    [activeTemplateId, drafts]
  );

  function updateDraft(field: keyof TemplateDraft, value: string) {
    if (!activeDraft) {
      return;
    }

    setDrafts((currentDrafts) =>
      currentDrafts.map((draft) =>
        draft.id === activeDraft.id
          ? {
              ...draft,
              [field]: value
            }
          : draft
      )
    );
    setMessage("Có thay đổi chưa lưu.");
  }

  function updateTemplateType(value: string) {
    updateDraft("type", value as TemplateType);
  }

  function updateTemplateStatus(value: string) {
    updateDraft("status", value as TemplateStatus);
  }

  function saveTemplates() {
    try {
      const profiles = drafts.map(draftToProfile);

      window.localStorage.setItem(
        TEMPLATES_STORAGE_KEY,
        JSON.stringify(profiles)
      );
      window.localStorage.setItem(D01_STORAGE_KEY, selectedD01TemplateId);
      window.localStorage.setItem(D02_STORAGE_KEY, selectedD02TemplateId);
      setMessage("Đã lưu template profile và lựa chọn D01/D02.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Không thể lưu: ${error.message}`
          : "Không thể lưu vì JSON rule không hợp lệ."
      );
    }
  }

  function resetTemplates() {
    const nextDrafts = sampleDrafts();

    setDrafts(nextDrafts);
    setActiveTemplateId(sampleBpmnTemplateProfile.id);
    setSelectedD01TemplateId(sampleBpmnTemplateProfile.id);
    setSelectedD02TemplateId(sampleServiceBlueprintTemplateProfile.id);
    window.localStorage.removeItem(TEMPLATES_STORAGE_KEY);
    window.localStorage.removeItem(D01_STORAGE_KEY);
    window.localStorage.removeItem(D02_STORAGE_KEY);
    setMessage("Đã reset về sample templates.");
  }

  function useForD01(templateId: string) {
    setSelectedD01TemplateId(templateId);
    window.localStorage.setItem(D01_STORAGE_KEY, templateId);
    setMessage("Đã chọn template cho D01 BPMN.");
  }

  function useForD02(templateId: string) {
    setSelectedD02TemplateId(templateId);
    window.localStorage.setItem(D02_STORAGE_KEY, templateId);
    setMessage("Đã chọn template cho D02 Service Blueprint.");
  }

  return (
    <section className="rounded border border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase text-slate-500">
              Template Library
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
              Thư viện template đầu ra
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Quản lý profile template cho D01 BPMN và D02 Service Blueprint.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              onClick={saveTemplates}
              type="button"
            >
              Lưu template
            </button>
            <button
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={resetTemplates}
              type="button"
            >
              Reset mẫu
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
          <p>
            D01 BPMN đang chọn:{" "}
            <span className="font-semibold">
              {findTemplateName(drafts, selectedD01TemplateId)}
            </span>
          </p>
          <p>
            D02 Service Blueprint đang chọn:{" "}
            <span className="font-semibold">
              {findTemplateName(drafts, selectedD02TemplateId)}
            </span>
          </p>
        </div>

        {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
      </div>

      <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
        <aside className="border-b border-slate-200 p-4 lg:border-b-0 lg:border-r">
          <p className="mb-3 text-sm font-semibold text-slate-950">
            Danh sách template
          </p>
          <div className="space-y-2">
            {drafts.map((draft) => (
              <div
                className={`rounded border p-3 ${
                  draft.id === activeTemplateId
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200 bg-white"
                }`}
                key={draft.id}
              >
                <button
                  className="block w-full text-left"
                  onClick={() => setActiveTemplateId(draft.id)}
                  type="button"
                >
                  <span className="block text-sm font-semibold text-slate-950">
                    {draft.name}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {draft.type} | v{draft.version} | {draft.status}
                  </span>
                </button>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => useForD01(draft.id)}
                    type="button"
                  >
                    Dùng cho D01 BPMN
                  </button>
                  <button
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => useForD02(draft.id)}
                    type="button"
                  >
                    Dùng cho D02 Service Blueprint
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="p-4">
          {activeDraft ? (
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Tên template
                  <input
                    className="rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
                    onChange={(event) => updateDraft("name", event.target.value)}
                    value={activeDraft.name}
                  />
                </label>

                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Loại template
                  <select
                    className="rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
                    onChange={(event) => updateTemplateType(event.target.value)}
                    value={activeDraft.type}
                  >
                    <option value="bpmn">BPMN</option>
                    <option value="serviceBlueprint">Service Blueprint</option>
                  </select>
                </label>

                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Phiên bản
                  <input
                    className="rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
                    onChange={(event) =>
                      updateDraft("version", event.target.value)
                    }
                    value={activeDraft.version}
                  />
                </label>

                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Trạng thái
                  <select
                    className="rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
                    onChange={(event) => updateTemplateStatus(event.target.value)}
                    value={activeDraft.status}
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {ruleFields.map((field) => (
                  <label
                    className="grid gap-1 text-sm font-medium text-slate-700"
                    key={field.key}
                  >
                    {field.label}
                    <textarea
                      className="min-h-36 rounded border border-slate-300 px-3 py-2 font-mono text-xs font-normal text-slate-900"
                      onChange={(event) =>
                        updateDraft(field.key, event.target.value)
                      }
                      value={activeDraft[field.key]}
                    />
                  </label>
                ))}
              </div>

              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Trường bắt buộc
                <textarea
                  className="min-h-28 rounded border border-slate-300 px-3 py-2 font-mono text-xs font-normal text-slate-900"
                  onChange={(event) =>
                    updateDraft("mandatoryFields", event.target.value)
                  }
                  value={activeDraft.mandatoryFields}
                />
              </label>
            </div>
          ) : (
            <p className="text-sm text-slate-600">Không có template để sửa.</p>
          )}
        </div>
      </div>
    </section>
  );
}
