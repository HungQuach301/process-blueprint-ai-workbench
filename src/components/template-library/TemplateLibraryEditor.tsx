"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SessionFrame } from "@/components/layout/SessionFrame";
import {
  confirmRealAICallIfNeeded,
  logAICallAudit
} from "@/lib/ai/ai-governance";
import { getAIValidationUserMessage } from "@/lib/ai/user-facing-ai-errors";
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
  bankingStarterTemplateProfiles,
  sampleBpmnTemplateProfile,
  sampleServiceBlueprintTemplateProfile
} from "@/lib/sample-data/sme-online-loan";
import { getLocale, type Locale } from "@/lib/i18n";

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
const LOCALE_EVENT = "process-blueprint-locale-change";

type CompareProviderId = "product-ai" | "openai" | "claude" | "mock";

type TemplateCompareResult = {
  id: string;
  providerId: CompareProviderId;
  model: string;
  confidence: string;
  warnings: string[];
  summary: string;
  validationStatus: string;
  recommendations: TemplateRecommendation[];
  qualityScore: TemplateQualityScore | null;
  assumptions: string[];
  error?: string;
};

const compareProviders: Array<{ id: CompareProviderId; label: string }> = [
  { id: "product-ai", label: "Product AI" },
  { id: "openai", label: "OpenAI" },
  { id: "claude", label: "Claude" },
  { id: "mock", label: "Local analysis" }
];

type TemplateAIRetryAction = "review" | "compare";
type TemplateSaveState = "saved" | "unsaved" | "saving";

function getFriendlyTemplateAIErrorMessage(
  error?: string,
  validationErrors?: string[]
) {
  if (validationErrors?.length) {
    return getAIValidationUserMessage(validationErrors);
  }

  const normalizedError = (error ?? "").toLowerCase();

  if (normalizedError.includes("timeout") || normalizedError.includes("timed out")) {
    return "Template QA timed out. Nothing was applied; you can retry with the current template.";
  }

  if (
    normalizedError.includes("network") ||
    normalizedError.includes("fetch") ||
    normalizedError.includes("failed")
  ) {
    return "Template QA could not reach the service. Nothing was applied; check the connection or retry.";
  }

  return "Template QA could not complete. Nothing was applied; you can retry with the current template.";
}

const templateHubText = {
  vi: {
    title: "Trung tâm template",
    description: "Quản lý template dùng lại cho D01 BPMN và D02 Service Blueprint. Template QA chỉ tạo recommendation, không auto-apply.",
    changeTemplate: "Đổi template",
    previewTemplate: "Xem template",
    runTemplateQA: "Chạy Template QA",
    running: "Đang chạy...",
    save: "Lưu",
    reset: "Reset",
    saved: "Saved",
    unsaved: "Unsaved changes",
    saving: "Saving",
    recommendations: "Recommendation từ Template QA",
    reviewRequired: "Cần người dùng review. Không có thay đổi template nào được auto-apply.",
    starterPack: "Banking Starter Pack và template đã lưu",
    outputType: "Loại output",
    businessDomain: "Domain nghiệp vụ",
    processType: "Loại quy trình",
    scope: "Phạm vi",
    status: "Trạng thái",
    all: "Tất cả",
    preview: "Xem trước",
    useD01: "Dùng cho D01",
    useD02: "Dùng cho D02",
    editor: "Template editor",
    editorHelper: "Basic mode chỉ hiển thị metadata. JSON rules nằm trong Advanced mode.",
    basicMode: "Chế độ cơ bản",
    advancedMode: "Chế độ nâng cao: JSON rules",
    hide: "Ẩn",
    show: "Hiện",
    notClassified: "Chưa phân loại",
    tags: "Tag",
    noTemplateSelected: "Chưa chọn template.",
    templatePreview: "Xem trước template",
    close: "Đóng",
    rulePreview: "Xem rules",
    rulePreviewBody: "JSON/rule details chỉ chỉnh sửa trong Advanced mode. Preview này không hiển thị raw JSON ở template card.",
    mandatoryFields: "Field bắt buộc",
    none: "Không có"
  },
  en: {
    title: "Template Hub",
    description: "Manage reusable profiles for D01 BPMN and D02 Service Blueprint. Template QA creates recommendations only; it never auto-applies changes.",
    changeTemplate: "Change template",
    previewTemplate: "Preview template",
    runTemplateQA: "Run Template QA",
    running: "Running...",
    save: "Save",
    reset: "Reset",
    saved: "Saved",
    unsaved: "Unsaved changes",
    saving: "Saving",
    recommendations: "Template QA Recommendations",
    aiTemplateReview: "AI Template Review",
    reviewWarnings: "Warnings",
    reviewAssumptions: "Assumptions",
    reviewRequired: "Human review required. No template change is auto-applied.",
    starterPack: "Banking Starter Pack and saved templates",
    outputType: "Output type",
    businessDomain: "Business domain",
    processType: "Process type",
    scope: "Scope",
    status: "Status",
    all: "All",
    preview: "Preview",
    useD01: "Use D01",
    useD02: "Use D02",
    editor: "Template editor",
    editorHelper: "Basic mode shows metadata. Advanced mode contains JSON rules.",
    basicMode: "Basic mode",
    advancedMode: "Advanced mode: JSON rules",
    hide: "Hide",
    show: "Show",
    notClassified: "Not classified",
    tags: "Tags",
    noTemplateSelected: "No template selected.",
    templatePreview: "Template preview",
    close: "Close",
    rulePreview: "Rule preview",
    rulePreviewBody: "JSON/rule details are editable only in Advanced mode. This preview intentionally avoids showing raw JSON in the template card.",
    mandatoryFields: "Mandatory fields",
    none: "None"
  }
} satisfies Record<Locale, Record<string, string>>;

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
  { key: "laneRules", label: "Lane rules" },
  { key: "rowRules", label: "Row rules" },
  { key: "taskCardRules", label: "Task card rules" },
  { key: "connectorRules", label: "Connector rules" },
  { key: "colorRules", label: "Color rules" },
  { key: "layoutRules", label: "Layout rules" }
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
    label: "Scope",
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

const filterOptions = {
  outputType: classificationFields.find((field) => field.key === "outputType")
    ?.options ?? [],
  businessDomain:
    classificationFields.find((field) => field.key === "businessDomain")
      ?.options ?? [],
  processType: classificationFields.find((field) => field.key === "processType")
    ?.options ?? [],
  scopeType: classificationFields.find((field) => field.key === "scopeType")
    ?.options ?? [],
  status: ["draft", "active", "archived"]
};

function cloneSampleTemplates() {
  return bankingStarterTemplateProfiles.map((profile) => ({ ...profile }));
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
    throw new Error(`${key} must be a JSON object.`);
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
  return drafts.find((draft) => draft.id === templateId)?.name ?? "Not selected";
}

function findTemplate(drafts: TemplateDraft[], templateId: string) {
  return drafts.find((draft) => draft.id === templateId);
}

function markGeneratedArtifactsStale() {
  window.localStorage.setItem(D01_GENERATED_STATUS_KEY, "stale");
  window.localStorage.setItem(D02_GENERATED_STATUS_KEY, "stale");
  window.dispatchEvent(new Event(ARTIFACT_STATUS_EVENT));
}

function TemplateSummary({ draft }: { draft: TemplateDraft }) {
  const tags = parseTags(draft.tags);

  return (
    <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
      <p>
        <span className="font-semibold text-slate-900">Output:</span>{" "}
        {draft.outputType || "Not classified"}
      </p>
      <p>
        <span className="font-semibold text-slate-900">Domain:</span>{" "}
        {draft.businessDomain || "Not classified"}
      </p>
      <p>
        <span className="font-semibold text-slate-900">Process:</span>{" "}
        {draft.processType || "Not classified"}
      </p>
      <p>
        <span className="font-semibold text-slate-900">Scope:</span>{" "}
        {draft.scopeType || "Not classified"}
      </p>
      <p>
        <span className="font-semibold text-slate-900">Status:</span>{" "}
        {draft.status}
      </p>
      <p>
        <span className="font-semibold text-slate-900">Fields:</span>{" "}
        {draft.mandatoryFields.split(/\r?\n/).filter(Boolean).length}
      </p>
      {tags.length > 0 ? (
        <p className="sm:col-span-2">
          <span className="font-semibold text-slate-900">Tags:</span>{" "}
          {tags.join(", ")}
        </p>
      ) : null}
    </div>
  );
}

export function TemplateLibraryEditor() {
  const [locale, setActiveLocale] = useState<Locale>("vi");
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
  const [templateReviewWarnings, setTemplateReviewWarnings] = useState<string[]>(
    []
  );
  const [templateReviewAssumptions, setTemplateReviewAssumptions] = useState<
    string[]
  >([]);
  const [realAITemplateReviewEnabled, setRealAITemplateReviewEnabled] =
    useState(false);
  const [isReviewingTemplate, setIsReviewingTemplate] = useState(false);
  const [compareModeEnabled, setCompareModeEnabled] = useState(false);
  const [compareProviderIds, setCompareProviderIds] = useState<CompareProviderId[]>([]);
  const [compareResults, setCompareResults] = useState<TemplateCompareResult[]>([]);
  const [isRunningCompare, setIsRunningCompare] = useState(false);
  const [aiRetryAction, setAiRetryAction] =
    useState<TemplateAIRetryAction | null>(null);
  const [saveState, setSaveState] = useState<TemplateSaveState>("saved");
  const [advancedModeOpen, setAdvancedModeOpen] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(
    null
  );
  const [filters, setFilters] = useState({
    outputType: "",
    businessDomain: "",
    processType: "",
    scopeType: "",
    status: ""
  });
  const saveStateTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setActiveLocale(getLocale());
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
          const sampleIds = new Set(savedDrafts.map((draft) => draft.id));
          const starterDrafts = sampleDrafts().filter(
            (draft) => !sampleIds.has(draft.id)
          );
          const nextDrafts = [...savedDrafts, ...starterDrafts];

          setDrafts(nextDrafts);
          setActiveTemplateId(nextDrafts[0]?.id ?? sampleBpmnTemplateProfile.id);
        }
      } catch {
        setMessage("Saved templates are invalid. Using sample templates.");
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
    return () => {
      if (saveStateTimeoutRef.current) {
        window.clearTimeout(saveStateTimeoutRef.current);
      }
    };
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

  const previewDraft = previewTemplateId
    ? findTemplate(drafts, previewTemplateId)
    : null;
  const text = templateHubText[locale];
  const saveStateStyles: Record<TemplateSaveState, string> = {
    saved: "status-badge status-badge-success",
    unsaved: "status-badge status-badge-warning",
    saving: "status-badge status-badge-primary"
  };

  const filteredDrafts = useMemo(
    () =>
      drafts.filter((draft) => {
        return (
          (!filters.outputType || draft.outputType === filters.outputType) &&
          (!filters.businessDomain ||
            draft.businessDomain === filters.businessDomain) &&
          (!filters.processType || draft.processType === filters.processType) &&
          (!filters.scopeType || draft.scopeType === filters.scopeType) &&
          (!filters.status || draft.status === filters.status)
        );
      }),
    [drafts, filters]
  );

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

  function confirmDiscardUnsavedTemplateChanges(actionLabel: string) {
    if (saveState !== "unsaved") {
      return true;
    }

    return window.confirm(
      `${actionLabel} will discard template edits that have not been saved. Continue?`
    );
  }

  function updateDraft(field: keyof TemplateDraft, value: string) {
    if (!activeDraft) {
      return;
    }

    setDrafts((currentDrafts) =>
      currentDrafts.map((draft) =>
        draft.id === activeDraft.id ? { ...draft, [field]: value } : draft
      )
    );
    markGeneratedArtifactsStale();
    markUnsaved();
    setMessage("There are unsaved template changes.");
  }

  function saveTemplates() {
    try {
      if (saveStateTimeoutRef.current) {
        window.clearTimeout(saveStateTimeoutRef.current);
        saveStateTimeoutRef.current = null;
      }

      setSaveState("saving");
      const profiles = drafts.map(draftToProfile);

      window.localStorage.setItem(
        TEMPLATES_STORAGE_KEY,
        JSON.stringify(profiles)
      );
      window.localStorage.setItem(D01_STORAGE_KEY, selectedD01TemplateId);
      window.localStorage.setItem(D02_STORAGE_KEY, selectedD02TemplateId);
      markGeneratedArtifactsStale();
      saveStateTimeoutRef.current = window.setTimeout(() => {
        setSaveState("saved");
        saveStateTimeoutRef.current = null;
      }, 350);
      setMessage("Saved template profiles and D01/D02 selections.");
    } catch (error) {
      setSaveState("unsaved");
      setMessage(
        error instanceof Error
          ? `Cannot save: ${error.message}`
          : "Cannot save because advanced JSON rules are invalid."
      );
    }
  }

  function resetTemplates() {
    if (!confirmDiscardUnsavedTemplateChanges("Reset templates")) {
      setMessage("Reset cancelled. Unsaved template edits are still in the editor.");
      return;
    }

    const nextDrafts = sampleDrafts();

    setDrafts(nextDrafts);
    setActiveTemplateId(sampleBpmnTemplateProfile.id);
    setSelectedD01TemplateId(sampleBpmnTemplateProfile.id);
    setSelectedD02TemplateId(sampleServiceBlueprintTemplateProfile.id);
    setTemplateReviewRecommendations([]);
    setTemplateQualityScore(null);
    setTemplateReviewWarnings([]);
    setTemplateReviewAssumptions([]);
    window.localStorage.removeItem(TEMPLATES_STORAGE_KEY);
    window.localStorage.removeItem(D01_STORAGE_KEY);
    window.localStorage.removeItem(D02_STORAGE_KEY);
    markGeneratedArtifactsStale();
    markSaved();
    setMessage("Reset to sample and banking starter templates.");
  }

  function useForD01(templateId: string) {
    setSelectedD01TemplateId(templateId);
    window.localStorage.setItem(D01_STORAGE_KEY, templateId);
    markGeneratedArtifactsStale();
    setMessage("Selected template for D01 BPMN.");
  }

  function useForD02(templateId: string) {
    setSelectedD02TemplateId(templateId);
    window.localStorage.setItem(D02_STORAGE_KEY, templateId);
    markGeneratedArtifactsStale();
    setMessage("Selected template for D02 Service Blueprint.");
  }

  function changeTemplate() {
    const target = document.getElementById("template-hub-list");

    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMessage("Choose a template card, then set it for D01 or D02.");
  }

  function previewActiveTemplate() {
    if (!activeDraft) {
      setMessage("No template selected for preview.");
      return;
    }

    setPreviewTemplateId(activeDraft.id);
  }

  async function runTemplateReview() {
    if (!activeDraft) {
      setMessage("No template selected for review.");
      return;
    }

    let selectedTemplate: TemplateProfile;

    try {
      selectedTemplate = draftToProfile(activeDraft);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Cannot review template: ${error.message}`
          : "Cannot review template because advanced JSON rules are invalid."
      );
      return;
    }

    setIsReviewingTemplate(true);
    setAiRetryAction("review");
    setTemplateReviewRecommendations([]);
    setTemplateQualityScore(null);
    setTemplateReviewWarnings([]);
    setTemplateReviewAssumptions([]);

    if (!confirmRealAICallIfNeeded(realAITemplateReviewEnabled)) {
      setIsReviewingTemplate(false);
      setMessage("Cancelled Template QA. No template change was applied.");
      return;
    }

    setMessage(
      realAITemplateReviewEnabled
        ? "Running real AI Template QA through the server route..."
        : "Running mock Template QA."
    );

    try {
      const response = await fetch("/api/ai/run-skill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          warnings?: string[];
          assumptions?: string[];
        };
        error?: string;
        validationErrors?: string[];
        meta?: { externalApiCalled?: boolean; providerId?: string };
      };

      if (!response.ok || !data.ok) {
        const errorMessage = [
          data.error || "AI Template QA failed.",
          ...(data.validationErrors ?? [])
        ].join(" ");
        const friendlyMessage = getFriendlyTemplateAIErrorMessage(
          data.error,
          data.validationErrors
        );

        logAICallAudit({
          skillId: AI_TEMPLATE_REVIEW_SKILL_ID,
          success: false,
          errorMessage,
          realAIEnabled: realAITemplateReviewEnabled,
          externalApiCalled:
            data.meta?.externalApiCalled ?? realAITemplateReviewEnabled
        });
        setMessage(friendlyMessage);
        return;
      }

      setTemplateReviewRecommendations(data.result?.recommendations ?? []);
      setTemplateQualityScore(data.result?.qualityScore ?? null);
      setTemplateReviewWarnings(data.result?.warnings ?? []);
      setTemplateReviewAssumptions(data.result?.assumptions ?? []);
      setAiRetryAction(null);
      setMessage(
        `${
          data.mode === "provider-backed"
            ? `Real provider ${data.meta?.providerId ?? "AI"}`
            : "Local analysis"
        } Template QA returned ${
          data.result?.recommendations?.length ?? 0
        } recommendation(s). No template change was auto-applied.`
      );
      logAICallAudit({
        skillId: AI_TEMPLATE_REVIEW_SKILL_ID,
        success: true,
        realAIEnabled: data.mode === "provider-backed",
        externalApiCalled: data.meta?.externalApiCalled === true,
        extraMetadata: {
          recommendationCount: data.result?.recommendations?.length ?? 0,
          hasQualityScore: Boolean(data.result?.qualityScore),
          warningCount: data.result?.warnings?.length ?? 0,
          assumptionCount: data.result?.assumptions?.length ?? 0
        }
      });
    } catch {
      logAICallAudit({
        skillId: AI_TEMPLATE_REVIEW_SKILL_ID,
        success: false,
        errorMessage: "Template QA request failed.",
        realAIEnabled: realAITemplateReviewEnabled,
        externalApiCalled: false
      });
      setMessage(getFriendlyTemplateAIErrorMessage("request failed"));
    } finally {
      setIsReviewingTemplate(false);
    }
  }

  function toggleCompareProvider(providerId: CompareProviderId) {
    setCompareProviderIds((currentIds) =>
      currentIds.includes(providerId)
        ? currentIds.filter((id) => id !== providerId)
        : [...currentIds, providerId]
    );
  }

  function summarizeTemplateReview({
    recommendations,
    qualityScore
  }: {
    recommendations: TemplateRecommendation[];
    qualityScore?: TemplateQualityScore | null;
  }) {
    return `${recommendations.length} recommendation(s)${
      qualityScore ? `, quality score ${qualityScore.score}/100` : ""
    }.`;
  }

  async function runTemplateReviewCompare() {
    if (!activeDraft) {
      setMessage("No template selected for Provider Compare.");
      return;
    }

    if (compareProviderIds.length === 0) {
      setMessage("Choose at least one provider before running Provider Compare.");
      return;
    }

    let selectedTemplate: TemplateProfile;

    try {
      selectedTemplate = draftToProfile(activeDraft);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Cannot compare template: ${error.message}`
          : "Cannot compare template because advanced JSON rules are invalid."
      );
      return;
    }

    const usesCloudProvider = compareProviderIds.some((providerId) => providerId !== "mock");

    if (compareProviderIds.length > 1 && usesCloudProvider) {
      const confirmed = window.confirm(
        "Provider Compare will call multiple selected providers and may increase cost. Continue?"
      );

      if (!confirmed) {
        setMessage("Provider Compare cancelled. No template change was applied.");
        return;
      }
    }

    if (!confirmRealAICallIfNeeded(realAITemplateReviewEnabled && usesCloudProvider)) {
      setMessage("Provider Compare cancelled by cloud AI consent check.");
      return;
    }

    setIsRunningCompare(true);
    setAiRetryAction("compare");
    setCompareResults([]);
    setMessage("Running Provider Compare for Template Review...");

    const nextResults: TemplateCompareResult[] = [];

    for (const providerId of compareProviderIds) {
      try {
        const response = await fetch("/api/ai/run-skill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            skillId: AI_TEMPLATE_REVIEW_SKILL_ID,
            providerId,
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
          provider?: string;
          model?: string;
          result?: {
            recommendations?: TemplateRecommendation[];
            qualityScore?: TemplateQualityScore;
            warnings?: string[];
            assumptions?: string[];
          };
          error?: string;
          validationErrors?: string[];
          meta?: {
            providerId?: string;
            model?: string;
            warnings?: string[];
            validationPassed?: boolean;
            externalApiCalled?: boolean;
          };
        };
        const recommendations = data.result?.recommendations ?? [];
        const errorMessage = [
          data.error,
          ...(data.validationErrors ?? [])
        ]
          .filter(Boolean)
          .join(" ");
        const friendlyErrorMessage = getFriendlyTemplateAIErrorMessage(
          data.error,
          data.validationErrors
        );

        nextResults.push({
          id: `${AI_TEMPLATE_REVIEW_SKILL_ID}-${providerId}-${Date.now()}`,
          providerId,
          model: data.meta?.model ?? data.model ?? "",
          confidence:
            recommendations.find((recommendation) => recommendation.confidence === "high")
              ? "high"
              : recommendations[0]?.confidence ?? "unknown",
          warnings: [...(data.meta?.warnings ?? []), ...(data.result?.warnings ?? [])],
          summary:
            response.ok && data.ok
              ? summarizeTemplateReview({
                  recommendations,
                  qualityScore: data.result?.qualityScore
                })
              : friendlyErrorMessage,
          validationStatus:
            data.meta?.validationPassed === false || !response.ok || !data.ok
              ? "failed"
              : "passed",
          recommendations: response.ok && data.ok ? recommendations : [],
          qualityScore: response.ok && data.ok ? data.result?.qualityScore ?? null : null,
          assumptions: response.ok && data.ok ? data.result?.assumptions ?? [] : [],
          error: response.ok && data.ok ? undefined : friendlyErrorMessage
        });
        logAICallAudit({
          skillId: AI_TEMPLATE_REVIEW_SKILL_ID,
          success: response.ok && data.ok === true,
          errorMessage: response.ok && data.ok ? undefined : errorMessage,
          realAIEnabled: data.mode === "provider-backed",
          externalApiCalled: data.meta?.externalApiCalled === true,
          provider: data.meta?.providerId ?? data.provider ?? providerId,
          model: data.meta?.model,
          warnings: data.meta?.warnings,
          validationPassed: data.meta?.validationPassed,
          extraMetadata: {
            compareMode: true,
            recommendationCount: recommendations.length,
            hasQualityScore: Boolean(data.result?.qualityScore)
          }
        });
      } catch (error) {
        const auditErrorMessage =
          error instanceof Error ? error.message : "Provider compare request failed.";
        const errorMessage = getFriendlyTemplateAIErrorMessage(auditErrorMessage);

        nextResults.push({
          id: `${AI_TEMPLATE_REVIEW_SKILL_ID}-${providerId}-${Date.now()}`,
          providerId,
          model: "",
          confidence: "unknown",
          warnings: [],
          summary: errorMessage,
          validationStatus: "failed",
          recommendations: [],
          qualityScore: null,
          assumptions: [],
          error: errorMessage
        });
      }
    }

    setCompareResults(nextResults);
    setAiRetryAction(nextResults.some((result) => result.validationStatus === "failed") ? "compare" : null);
    setMessage("Provider Compare finished. Choose one provider output to review further.");
    setIsRunningCompare(false);
  }

  function useCompareResult(result: TemplateCompareResult) {
    setTemplateReviewRecommendations(result.recommendations);
    setTemplateQualityScore(result.qualityScore);
    setTemplateReviewWarnings(result.warnings);
    setTemplateReviewAssumptions(result.assumptions);
    setAiRetryAction(null);
    setMessage(`Selected ${result.providerId} Template Review output. No template change was auto-applied.`);
  }

  function retryTemplateAIAction() {
    if (aiRetryAction === "review") {
      void runTemplateReview();
      return;
    }

    if (aiRetryAction === "compare") {
      void runTemplateReviewCompare();
    }
  }

  return (
    <SessionFrame
      actions={
        <>
          <span className={saveStateStyles[saveState]}>
            {text[saveState]}
          </span>
          <button
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={changeTemplate}
            type="button"
          >
            {text.changeTemplate}
          </button>
          <button
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={previewActiveTemplate}
            type="button"
          >
            {text.previewTemplate}
          </button>
          <button
            className="rounded border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isReviewingTemplate}
            onClick={runTemplateReview}
            type="button"
          >
            {isReviewingTemplate ? text.running : text.runTemplateQA}
          </button>
          <button
            className="btn btn-primary"
            onClick={saveTemplates}
            type="button"
          >
            {text.save}
          </button>
          <button
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={resetTemplates}
            type="button"
          >
            {text.reset}
          </button>
        </>
      }
      bodyClassName="p-4"
      description={text.description}
      title={text.title}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">
            D01 BPMN
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-950">
            {findTemplateName(drafts, selectedD01TemplateId)}
          </p>
        </div>
        <div className="rounded border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">
            D02 Service Blueprint
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-950">
            {findTemplateName(drafts, selectedD02TemplateId)}
          </p>
        </div>
      </div>

      {message ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
          <span>{message}</span>
          {aiRetryAction && !isReviewingTemplate && !isRunningCompare ? (
            <button
              className="rounded border border-sky-300 bg-white px-2 py-1 text-xs font-semibold text-sky-800 hover:bg-sky-100"
              onClick={retryTemplateAIAction}
              type="button"
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">
              Provider Compare
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Optional and off by default. Compare only selected providers; no
              template recommendation is auto-applied.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              checked={compareModeEnabled}
              onChange={(event) => setCompareModeEnabled(event.target.checked)}
              type="checkbox"
            />
            Enable compare mode
          </label>
        </div>
        {compareModeEnabled ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-700">
            {compareProviders.map((provider) => (
              <label className="flex items-center gap-2" key={provider.id}>
                <input
                  checked={compareProviderIds.includes(provider.id)}
                  onChange={() => toggleCompareProvider(provider.id)}
                  type="checkbox"
                />
                {provider.label}
              </label>
            ))}
            <button
              className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isRunningCompare}
              onClick={() => void runTemplateReviewCompare()}
              type="button"
            >
              {isRunningCompare ? "Comparing..." : "Compare Template Review"}
            </button>
            {compareProviderIds.length > 1 ? (
              <span className="text-xs text-amber-700">
                Multiple providers may increase AI cost.
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {compareResults.length > 0 ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {compareResults.map((result) => (
            <div className="rounded border border-slate-200 bg-white p-3" key={result.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {result.providerId}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Model: {result.model || "n/a"}
                  </p>
                </div>
                <span
                  className={`rounded px-2 py-1 text-xs font-semibold ${
                    result.validationStatus === "passed"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {result.validationStatus}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{result.summary}</p>
              <p className="mt-1 text-xs text-slate-500">
                Confidence: {result.confidence} | Warnings: {result.warnings.length}
              </p>
              {result.error ? (
                <p className="mt-2 text-xs text-rose-700">{result.error}</p>
              ) : null}
              <button
                className="btn btn-ai mt-3 text-xs"
                disabled={result.validationStatus !== "passed"}
                onClick={() => useCompareResult(result)}
                type="button"
              >
                Use this output
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {templateQualityScore ? (
        <div className="mt-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <p className="text-xs font-semibold uppercase text-emerald-700">
            AI Template Review
          </p>
          <p className="font-semibold">
            Template quality score: {templateQualityScore.score}/
            {templateQualityScore.maxScore}
          </p>
          <p className="mt-1">{templateQualityScore.summary}</p>
        </div>
      ) : null}

      {templateReviewWarnings.length > 0 || templateReviewAssumptions.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {templateReviewWarnings.length > 0 ? (
            <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">
                {locale === "vi" ? "Canh bao" : "Warnings"}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {templateReviewWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {templateReviewAssumptions.length > 0 ? (
            <div className="rounded border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
              <p className="font-semibold">
                {locale === "vi" ? "Giáº£ Ä‘á»‹nh" : "Assumptions"}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {templateReviewAssumptions.map((assumption) => (
                  <li key={assumption}>{assumption}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {templateReviewRecommendations.length > 0 ? (
        <div className="mt-4 rounded border border-indigo-200 bg-indigo-50 p-3">
          <p className="text-sm font-semibold text-indigo-950">
            {text.recommendations}
          </p>
          <p className="mt-1 text-sm text-indigo-900">
            {text.reviewRequired}
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
                <p className="mt-1 text-slate-700">
                  {recommendation.description}
                </p>
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

      <div id="template-hub-list" className="mt-4 rounded border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-950">
          {text.starterPack}
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-5">
          {[
            { key: "outputType", label: text.outputType, options: filterOptions.outputType },
            { key: "businessDomain", label: text.businessDomain, options: filterOptions.businessDomain },
            { key: "processType", label: text.processType, options: filterOptions.processType },
            { key: "scopeType", label: text.scope, options: filterOptions.scopeType },
            { key: "status", label: text.status, options: filterOptions.status }
          ].map((filter) => (
            <label className="grid gap-1 text-xs font-semibold text-slate-600" key={filter.key}>
              {filter.label}
              <select
                className="rounded border border-slate-300 bg-white px-2 py-2 text-sm font-normal text-slate-800"
                onChange={(event) =>
                  setFilters((currentFilters) => ({
                    ...currentFilters,
                    [filter.key]: event.target.value
                  }))
                }
                value={filters[filter.key as keyof typeof filters]}
              >
                <option value="">{text.all}</option>
                {filter.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {filteredDrafts.map((draft) => {
            const isActive = draft.id === activeTemplateId;

            return (
              <article
                className={`rounded border bg-white p-4 ${
                  isActive ? "border-slate-950" : "border-slate-200"
                }`}
                key={draft.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <button
                    className="min-w-0 text-left"
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
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      onClick={() => setPreviewTemplateId(draft.id)}
                      type="button"
                    >
                      {text.preview}
                    </button>
                    <button
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      onClick={() => useForD01(draft.id)}
                      type="button"
                    >
                      {text.useD01}
                    </button>
                    <button
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      onClick={() => useForD02(draft.id)}
                      type="button"
                    >
                      {text.useD02}
                    </button>
                  </div>
                </div>
                <div className="mt-3">
                  <TemplateSummary draft={draft} />
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="mt-4 rounded border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">
              {text.editor}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {text.editorHelper}
            </p>
          </div>
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
            {text.basicMode}
          </span>
        </div>

        {activeDraft ? (
          <div className="mt-4 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Template name
                <input
                  className="rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
                  onChange={(event) => updateDraft("name", event.target.value)}
                  value={activeDraft.name}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Template type
                <select
                  className="rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
                  onChange={(event) =>
                    updateDraft("type", event.target.value as TemplateType)
                  }
                  value={activeDraft.type}
                >
                  <option value="bpmn">BPMN</option>
                  <option value="serviceBlueprint">Service Blueprint</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Version
                <input
                  className="rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
                  onChange={(event) => updateDraft("version", event.target.value)}
                  value={activeDraft.version}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Status
                <select
                  className="rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
                  onChange={(event) =>
                    updateDraft("status", event.target.value as TemplateStatus)
                  }
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
                    <option value="">{text.notClassified}</option>
                    {field.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                {text.tags}
                <input
                  className="rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
                  onChange={(event) => updateDraft("tags", event.target.value)}
                  placeholder="SME lending, customer journey"
                  value={activeDraft.tags}
                />
              </label>
            </div>

            <div className="overflow-hidden rounded border border-slate-200">
              <button
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-950 hover:bg-slate-50"
                onClick={() => setAdvancedModeOpen((isOpen) => !isOpen)}
                type="button"
              >
                <span>{text.advancedMode}</span>
                <span className="text-xs text-slate-500">
                  {advancedModeOpen ? text.hide : text.show}
                </span>
              </button>
              {advancedModeOpen ? (
                <div className="grid gap-4 border-t border-slate-200 p-4 md:grid-cols-2">
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
                  <label className="grid gap-1 text-sm font-medium text-slate-700 md:col-span-2">
                    {text.mandatoryFields}
                    <textarea
                      className="min-h-28 rounded border border-slate-300 px-3 py-2 font-mono text-xs font-normal text-slate-900"
                      onChange={(event) =>
                        updateDraft("mandatoryFields", event.target.value)
                      }
                      value={activeDraft.mandatoryFields}
                    />
                  </label>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-600">{text.noTemplateSelected}</p>
        )}
      </div>

      {previewDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium uppercase text-slate-500">
                  {text.templatePreview}
                </p>
                <h3 className="mt-1 text-xl font-semibold text-slate-950">
                  {previewDraft.name}
                </h3>
              </div>
              <button
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setPreviewTemplateId(null)}
                type="button"
              >
                {text.close}
              </button>
            </div>
            <div className="mt-4">
              <TemplateSummary draft={previewDraft} />
            </div>
            <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-950">{text.rulePreview}</p>
              <p className="mt-2">
                {text.rulePreviewBody}
              </p>
              <p className="mt-2">
                {text.mandatoryFields}:{" "}
                {previewDraft.mandatoryFields
                  .split(/\r?\n/)
                  .filter(Boolean)
                  .join(", ") || text.none}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </SessionFrame>
  );
}
