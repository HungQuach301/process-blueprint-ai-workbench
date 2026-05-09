"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  TemplateQualityScore,
  TemplateRecommendation
} from "@/lib/ai/ai-template-review-types";
import type {
  TemplateBusinessDomain,
  TemplateJourneyType,
  TemplateNotationStandard,
  TemplateOrganizationType,
  TemplateOutputType,
  TemplateProcessType,
  TemplateProfile,
  TemplateScopeType,
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
const D01_GENERATED_STATUS_KEY =
  "process-blueprint-ai-workbench:generated-d01-bpmn-status";
const D02_GENERATED_STATUS_KEY =
  "process-blueprint-ai-workbench:generated-d02-service-blueprint-status";
const ARTIFACT_STATUS_EVENT = "process-blueprint-artifact-status-change";
const AI_TEMPLATE_REVIEW_SKILL_ID = "ai-template-review";

type RuleField =
  | "laneRules"
  | "rowRules"
  | "taskCardRules"
  | "connectorRules"
  | "colorRules"
  | "layoutRules";

type ClassificationField =
  | "outputType"
  | "processType"
  | "journeyType"
  | "scopeType"
  | "businessDomain"
  | "notationStandard"
  | "organizationType";

type TemplateDraft = Omit<
  TemplateProfile,
  | "laneRules"
  | "rowRules"
  | "taskCardRules"
  | "connectorRules"
  | "colorRules"
  | "layoutRules"
  | "mandatoryFields"
  | "outputType"
  | "processType"
  | "journeyType"
  | "scopeType"
  | "businessDomain"
  | "notationStandard"
  | "organizationType"
  | "tags"
> & {
  outputType: string;
  processType: string;
  journeyType: string;
  scopeType: string;
  businessDomain: string;
  notationStandard: string;
  organizationType: string;
  tags: string;
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

const classificationFields: Array<{
  key: ClassificationField;
  label: string;
  options: string[];
}> = [
  {
    key: "outputType",
    label: "Output type",
    options: [
      "BPMN",
      "Service Blueprint",
      "App Flow",
      "Data Flow",
      "Capability Landscape",
      "Solution Architecture"
    ]
  },
  {
    key: "processType",
    label: "Process type",
    options: [
      "Lending",
      "Onboarding",
      "Servicing",
      "Approval",
      "Operation",
      "Support",
      "Generic"
    ]
  },
  {
    key: "journeyType",
    label: "Journey type",
    options: [
      "Customer Journey",
      "Internal Workflow",
      "System Workflow",
      "Integration Flow"
    ]
  },
  {
    key: "scopeType",
    label: "Scope type",
    options: ["End-to-end", "Sub-process", "Task-level"]
  },
  {
    key: "businessDomain",
    label: "Business domain",
    options: ["Banking", "Finance", "Insurance", "Generic"]
  },
  {
    key: "notationStandard",
    label: "Notation standard",
    options: ["BPMN 2.0", "Service Blueprint", "UML", "Custom"]
  },
  {
    key: "organizationType",
    label: "Organization type",
    options: ["Individual", "Bank", "Finance Company", "Consulting", "Enterprise"]
  }
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

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function profileToDraft(profile: TemplateProfile): TemplateDraft {
  return {
    id: profile.id,
    name: profile.name,
    type: profile.type,
    version: profile.version,
    status: profile.status,
    outputType: profile.outputType ?? "",
    processType: profile.processType ?? "",
    journeyType: profile.journeyType ?? "",
    scopeType: profile.scopeType ?? "",
    businessDomain: profile.businessDomain ?? "",
    notationStandard: profile.notationStandard ?? "",
    organizationType: profile.organizationType ?? "",
    tags: profile.tags?.join(", ") ?? "",
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
  const profile: TemplateProfile = {
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

  if (draft.outputType) {
    profile.outputType = draft.outputType as TemplateOutputType;
  }

  if (draft.processType) {
    profile.processType = draft.processType as TemplateProcessType;
  }

  if (draft.journeyType) {
    profile.journeyType = draft.journeyType as TemplateJourneyType;
  }

  if (draft.scopeType) {
    profile.scopeType = draft.scopeType as TemplateScopeType;
  }

  if (draft.businessDomain) {
    profile.businessDomain = draft.businessDomain as TemplateBusinessDomain;
  }

  if (draft.notationStandard) {
    profile.notationStandard = draft.notationStandard as TemplateNotationStandard;
  }

  if (draft.organizationType) {
    profile.organizationType = draft.organizationType as TemplateOrganizationType;
  }

  const tags = parseTags(draft.tags);

  if (tags.length > 0) {
    profile.tags = tags;
  }

  return profile;
}

function findTemplateName(drafts: TemplateDraft[], templateId: string) {
  return drafts.find((draft) => draft.id === templateId)?.name ?? "Chưa chọn";
}

function markGeneratedArtifactsStale() {
  window.localStorage.setItem(D01_GENERATED_STATUS_KEY, "stale");
  window.localStorage.setItem(D02_GENERATED_STATUS_KEY, "stale");
  window.dispatchEvent(new Event(ARTIFACT_STATUS_EVENT));
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
  const [templateReviewRecommendations, setTemplateReviewRecommendations] =
    useState<TemplateRecommendation[]>([]);
  const [templateQualityScore, setTemplateQualityScore] =
    useState<TemplateQualityScore | null>(null);
  const [realAITemplateReviewEnabled, setRealAITemplateReviewEnabled] =
    useState(false);
  const [isReviewingTemplate, setIsReviewingTemplate] = useState(false);

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

  useEffect(() => {
    let active = true;

    async function loadTemplateReviewMode() {
      try {
        const response = await fetch("/api/ai/run-skill", {
          method: "GET"
        });
        const data = (await response.json()) as {
          realAITemplateReviewEnabled?: boolean;
        };

        if (active) {
          setRealAITemplateReviewEnabled(
            data.realAITemplateReviewEnabled === true
          );
        }
      } catch {
        if (active) {
          setRealAITemplateReviewEnabled(false);
        }
      }
    }

    loadTemplateReviewMode();

    return () => {
      active = false;
    };
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
    markGeneratedArtifactsStale();
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
      markGeneratedArtifactsStale();
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
    markGeneratedArtifactsStale();
    setMessage("Đã reset về sample templates.");
  }

  function useForD01(templateId: string) {
    setSelectedD01TemplateId(templateId);
    window.localStorage.setItem(D01_STORAGE_KEY, templateId);
    markGeneratedArtifactsStale();
    setMessage("Đã chọn template cho D01 BPMN.");
  }

  function useForD02(templateId: string) {
    setSelectedD02TemplateId(templateId);
    window.localStorage.setItem(D02_STORAGE_KEY, templateId);
    markGeneratedArtifactsStale();
    setMessage("Đã chọn template cho D02 Service Blueprint.");
  }

  async function runTemplateReview() {
    if (!activeDraft) {
      setMessage("Khong co template de review.");
      return;
    }

    let selectedTemplate: TemplateProfile;

    try {
      selectedTemplate = draftToProfile(activeDraft);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Khong the review template: ${error.message}`
          : "Khong the review template vi JSON rule khong hop le."
      );
      return;
    }

    setIsReviewingTemplate(true);
    setTemplateReviewRecommendations([]);
    setTemplateQualityScore(null);
    setMessage(
      realAITemplateReviewEnabled
        ? "Dang chay real AI Template Review qua server route..."
        : "Dang chay mock AI Template Review."
    );

    try {
      const response = await fetch("/api/ai/run-skill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          skillId: AI_TEMPLATE_REVIEW_SKILL_ID,
          payload: {
            selectedTemplate,
            outputType: selectedTemplate.outputType,
            processType: selectedTemplate.processType,
            businessDomain: selectedTemplate.businessDomain
          }
        })
      });
      const data = (await response.json()) as {
        ok?: boolean;
        mode?: "mock" | "provider-backed";
        result?: {
          recommendations?: TemplateRecommendation[];
          qualityScore?: TemplateQualityScore;
        };
        error?: string;
        validationErrors?: string[];
        meta?: {
          externalApiCalled?: boolean;
        };
      };

      if (!response.ok || !data.ok) {
        setMessage(
          [data.error || "AI Template Review failed.", ...(data.validationErrors ?? [])].join(
            " "
          )
        );
        return;
      }

      setTemplateReviewRecommendations(data.result?.recommendations ?? []);
      setTemplateQualityScore(data.result?.qualityScore ?? null);
      setMessage(
        `${data.mode === "provider-backed" ? "Real" : "Mock"} AI Template Review returned ${
          data.result?.recommendations?.length ?? 0
        } recommendation(s). External API called: ${
          data.meta?.externalApiCalled === true ? "yes" : "no"
        }. Template changes were not auto-applied.`
      );
    } catch {
      setMessage("AI Template Review request failed. No template change was applied.");
    } finally {
      setIsReviewingTemplate(false);
    }
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
            <button
              className="rounded border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isReviewingTemplate}
              onClick={runTemplateReview}
              type="button"
            >
              {isReviewingTemplate
                ? "Reviewing..."
                : realAITemplateReviewEnabled
                  ? "Run real AI Template Review"
                  : "Run mock AI Template Review"}
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

        {templateQualityScore ? (
          <div className="mt-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <p className="font-semibold">
              Template quality score: {templateQualityScore.score}/
              {templateQualityScore.maxScore}
            </p>
            <p className="mt-1">{templateQualityScore.summary}</p>
          </div>
        ) : null}

        {templateReviewRecommendations.length > 0 ? (
          <div className="mt-4 rounded border border-indigo-200 bg-indigo-50 p-3">
            <p className="text-sm font-semibold text-indigo-950">
              AI Template Recommendations
            </p>
            <p className="mt-1 text-sm text-indigo-900">
              Human review required. No template change is auto-applied in this phase.
            </p>
            <div className="mt-3 grid gap-3">
              {templateReviewRecommendations.map((recommendation) => (
                <div
                  className="rounded border border-indigo-200 bg-white p-3 text-sm"
                  key={recommendation.id}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-900">
                      source: {recommendation.source ?? "ai"}
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {recommendation.type}
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      risk: {recommendation.riskLevel}
                    </span>
                  </div>
                  <p className="mt-2 font-semibold text-slate-950">
                    {recommendation.title}
                  </p>
                  <p className="mt-1 text-slate-700">{recommendation.description}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Affected fields: {recommendation.affectedFields.join(", ")}
                  </p>
                  {recommendation.warnings?.length ? (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-700">
                      {recommendation.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
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
                  {draft.outputType || draft.processType || draft.businessDomain ? (
                    <span className="mt-1 block text-xs text-slate-500">
                      {[draft.outputType, draft.processType, draft.businessDomain]
                        .filter(Boolean)
                        .join(" | ")}
                    </span>
                  ) : null}
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
                {classificationFields.map((field) => (
                  <label
                    className="grid gap-1 text-sm font-medium text-slate-700"
                    key={field.key}
                  >
                    {field.label}
                    <select
                      className="rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
                      onChange={(event) =>
                        updateDraft(field.key, event.target.value)
                      }
                      value={activeDraft[field.key]}
                    >
                      <option value="">Not classified</option>
                      {field.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}

                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Tags
                  <input
                    className="rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
                    onChange={(event) => updateDraft("tags", event.target.value)}
                    placeholder="SME lending, customer journey"
                    value={activeDraft.tags}
                  />
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
