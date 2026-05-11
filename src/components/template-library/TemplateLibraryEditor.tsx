"use client";

import { useEffect, useMemo, useState } from "react";
import { SessionFrame } from "@/components/layout/SessionFrame";
import {
  confirmRealAICallIfNeeded,
  logAICallAudit
} from "@/lib/ai/ai-governance";
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
type TemplateHubTab = "current" | "browse" | "review" | "editor";

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

const compareProviders: Array<{ id: CompareProviderId; label: Record<Locale, string> }> = [
  { id: "product-ai", label: { vi: "Product AI", en: "Product AI" } },
  { id: "openai", label: { vi: "OpenAI", en: "OpenAI" } },
  { id: "claude", label: { vi: "Claude", en: "Claude" } },
  { id: "mock", label: { vi: "Local/mô phỏng", en: "Local/Mock" } }
];

const templateHubText = {
  vi: {
    title: "Trung tâm mẫu",
    description: "Quản lý mẫu dùng lại cho D01 BPMN và D02 Service Blueprint. QA mẫu chỉ tạo đề xuất, không tự áp dụng.",
    howItWorks: "Cách dùng Template Hub",
    guideStep1Title: "Chọn mẫu",
    guideStep1Body: "Xem mẫu hiện tại hoặc duyệt thư viện mẫu.",
    guideStep2Title: "Rà soát chất lượng",
    guideStep2Body: "Chạy Template QA và xem đề xuất trước.",
    guideStep3Title: "Gắn cho D01/D02",
    guideStep3Body: "Chọn mẫu phù hợp cho D01 hoặc D02, không tự tạo lại tài liệu đầu ra.",
    currentTemplates: "Mẫu hiện tại",
    browseTemplates: "Duyệt mẫu",
    templateReview: "Rà soát mẫu",
    currentTemplatesHelper: "Xem nhanh mẫu đang dùng cho D01 và D02 trước khi đổi.",
    browseTemplatesHelper: "Duyệt thư viện bằng thẻ gọn. Thông tin chi tiết nằm trong phần mở rộng.",
    templateReviewHelper: "Chạy rà soát và xem đề xuất. Không có đề xuất nào được áp dụng tự động.",
    editorTabHelper: "Chỉnh mẫu đã chọn. Quy tắc JSON chi tiết nằm trong chế độ nâng cao.",
    changeTemplate: "Đổi mẫu",
    previewTemplate: "Xem mẫu",
    runTemplateQA: "Chạy Template QA",
    running: "Đang chạy...",
    save: "Lưu",
    reset: "Đặt lại",
    recommendations: "Đề xuất từ Template QA",
    aiTemplateReview: "Rà soát mẫu bằng AI",
    reviewWarnings: "Cảnh báo",
    reviewAssumptions: "Giả định",
    reviewRequired: "Cần người dùng rà soát. Không có thay đổi mẫu nào được tự áp dụng.",
    starterPack: "Banking Starter Pack và mẫu đã lưu",
    outputType: "Loại đầu ra",
    businessDomain: "Lĩnh vực nghiệp vụ",
    processType: "Loại quy trình",
    scope: "Phạm vi",
    status: "Trạng thái",
    all: "Tất cả",
    preview: "Xem trước",
    useD01: "Dùng cho D01",
    useD02: "Dùng cho D02",
    details: "Chi tiết",
    recommendedFor: "Phù hợp cho",
    selected: "Đang chọn",
    notCompatibleD01: "Không tương thích D01",
    notCompatibleD02: "Không tương thích D02",
    advancedProviderCompare: "Nâng cao: So sánh provider",
    providerCompareHelper: "Tùy chọn và mặc định tắt. So sánh provider chỉ để chọn đầu ra rà soát; không tự áp dụng đề xuất.",
    enableCompareMode: "Bật chế độ so sánh",
    compareTemplateReview: "So sánh kết quả rà soát mẫu",
    comparing: "Đang so sánh...",
    costWarning: "Nhiều provider có thể làm tăng chi phí AI.",
    useThisOutput: "Dùng đầu ra này",
    qualityScore: "Điểm chất lượng mẫu",
    confidence: "Độ tin cậy",
    warnings: "Cảnh báo",
    assumptions: "Giả định",
    affectedFields: "Trường bị ảnh hưởng",
    editor: "Trình chỉnh mẫu",
    editorHelper: "Chế độ cơ bản chỉ hiển thị thông tin mô tả. Quy tắc JSON nằm trong chế độ nâng cao.",
    basicMode: "Chế độ cơ bản",
    advancedMode: "Chế độ nâng cao: quy tắc JSON",
    hide: "Ẩn",
    show: "Hiện",
    notClassified: "Chưa phân loại",
    tags: "Thẻ",
    noTemplateSelected: "Chưa chọn mẫu.",
    templatePreview: "Xem trước mẫu",
    close: "Đóng",
    rulePreview: "Xem quy tắc",
    rulePreviewBody: "Chi tiết JSON/quy tắc chỉ chỉnh sửa trong chế độ nâng cao. Bản xem trước này không hiển thị JSON thô trên thẻ mẫu.",
    mandatoryFields: "Trường bắt buộc",
    none: "Không có"
  },
  en: {
    title: "Template Hub",
    description: "Manage reusable profiles for D01 BPMN and D02 Service Blueprint. Template QA creates recommendations only; it never auto-applies changes.",
    howItWorks: "How Template Hub works",
    guideStep1Title: "Choose template",
    guideStep1Body: "Check current templates or browse the library.",
    guideStep2Title: "Review quality",
    guideStep2Body: "Run Template QA and inspect recommendations first.",
    guideStep3Title: "Apply to D01/D02",
    guideStep3Body: "Select a compatible D01 or D02 template; artifacts regenerate only when you choose.",
    currentTemplates: "Current templates",
    browseTemplates: "Browse templates",
    templateReview: "Template review",
    currentTemplatesHelper: "Quickly see the templates currently used for D01 and D02 before changing them.",
    browseTemplatesHelper: "Browse the library with simplified cards. Detailed metadata stays in expandable details.",
    templateReviewHelper: "Run review and inspect recommendations. Recommendations are never auto-applied.",
    editorTabHelper: "Edit the selected template. Detailed JSON/rules stay in Advanced mode.",
    changeTemplate: "Change template",
    previewTemplate: "Preview template",
    runTemplateQA: "Run Template QA",
    running: "Running...",
    save: "Save",
    reset: "Reset",
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
    details: "Details",
    recommendedFor: "Recommended for",
    selected: "Selected",
    notCompatibleD01: "Not D01-compatible",
    notCompatibleD02: "Not D02-compatible",
    advancedProviderCompare: "Advanced: Provider Compare",
    providerCompareHelper: "Optional and off by default. Compare providers only to choose a review output; no recommendation is auto-applied.",
    enableCompareMode: "Enable compare mode",
    compareTemplateReview: "Compare Template Review",
    comparing: "Comparing...",
    costWarning: "Multiple providers may increase AI cost.",
    useThisOutput: "Use this output",
    qualityScore: "Template quality score",
    confidence: "Confidence",
    warnings: "Warnings",
    assumptions: "Assumptions",
    affectedFields: "Affected fields",
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

function isBpmnCompatibleTemplate(draft: TemplateDraft) {
  return (
    draft.type === "bpmn" ||
    draft.outputType === "BPMN" ||
    draft.notationStandard === "BPMN 2.0"
  );
}

function isServiceBlueprintCompatibleTemplate(draft: TemplateDraft) {
  return (
    draft.type === "serviceBlueprint" ||
    draft.outputType === "Service Blueprint" ||
    draft.notationStandard === "Service Blueprint"
  );
}

function markGeneratedArtifactsStale() {
  window.localStorage.setItem(D01_GENERATED_STATUS_KEY, "stale");
  window.localStorage.setItem(D02_GENERATED_STATUS_KEY, "stale");
  window.dispatchEvent(new Event(ARTIFACT_STATUS_EVENT));
}

function TemplateSummary({
  draft,
  text
}: {
  draft: TemplateDraft;
  text: (typeof templateHubText)["vi"];
}) {
  const tags = parseTags(draft.tags);

  return (
    <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
      <p>
        <span className="font-semibold text-slate-900">{text.outputType}:</span>{" "}
        {draft.outputType || text.notClassified}
      </p>
      <p>
        <span className="font-semibold text-slate-900">{text.businessDomain}:</span>{" "}
        {draft.businessDomain || text.notClassified}
      </p>
      <p>
        <span className="font-semibold text-slate-900">{text.processType}:</span>{" "}
        {draft.processType || text.notClassified}
      </p>
      <p>
        <span className="font-semibold text-slate-900">{text.scope}:</span>{" "}
        {draft.scopeType || text.notClassified}
      </p>
      <p>
        <span className="font-semibold text-slate-900">{text.status}:</span>{" "}
        {draft.status}
      </p>
      <p>
        <span className="font-semibold text-slate-900">{text.mandatoryFields}:</span>{" "}
        {draft.mandatoryFields.split(/\r?\n/).filter(Boolean).length}
      </p>
      {tags.length > 0 ? (
        <p className="sm:col-span-2">
          <span className="font-semibold text-slate-900">{text.tags}:</span>{" "}
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
  const [advancedModeOpen, setAdvancedModeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TemplateHubTab>("current");
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
  const selectedD01Draft = findTemplate(drafts, selectedD01TemplateId);
  const selectedD02Draft = findTemplate(drafts, selectedD02TemplateId);
  const tabItems: Array<{
    id: TemplateHubTab;
    label: string;
    helper: string;
  }> = [
    {
      id: "current",
      label: text.currentTemplates,
      helper: text.currentTemplatesHelper
    },
    {
      id: "browse",
      label: text.browseTemplates,
      helper: text.browseTemplatesHelper
    },
    {
      id: "review",
      label: text.templateReview,
      helper: text.templateReviewHelper
    },
    {
      id: "editor",
      label: text.editor,
      helper: text.editorTabHelper
    }
  ];

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
    setMessage(
      locale === "vi"
        ? "Có thay đổi template chưa lưu."
        : "There are unsaved template changes."
    );
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
      setMessage(
        locale === "vi"
          ? "Đã lưu template profile và lựa chọn D01/D02."
          : "Saved template profiles and D01/D02 selections."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Cannot save: ${error.message}`
          : "Cannot save because advanced JSON rules are invalid."
      );
    }
  }

  function resetTemplates() {
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
    setMessage(
      locale === "vi"
        ? "Đã reset về sample và banking starter templates."
        : "Reset to sample and banking starter templates."
    );
  }

  function useForD01(templateId: string) {
    const targetDraft = findTemplate(drafts, templateId);

    if (!targetDraft || !isBpmnCompatibleTemplate(targetDraft)) {
      setMessage(
        locale === "vi"
          ? "Template này không tương thích với D01 BPMN."
          : "This template is not compatible with D01 BPMN."
      );
      return;
    }

    setSelectedD01TemplateId(templateId);
    window.localStorage.setItem(D01_STORAGE_KEY, templateId);
    markGeneratedArtifactsStale();
    setMessage(
      locale === "vi"
        ? "Đã chọn template cho D01 BPMN."
        : "Selected template for D01 BPMN."
    );
  }

  function useForD02(templateId: string) {
    const targetDraft = findTemplate(drafts, templateId);

    if (!targetDraft || !isServiceBlueprintCompatibleTemplate(targetDraft)) {
      setMessage(
        locale === "vi"
          ? "Template này không tương thích với D02 Service Blueprint."
          : "This template is not compatible with D02 Service Blueprint."
      );
      return;
    }

    setSelectedD02TemplateId(templateId);
    window.localStorage.setItem(D02_STORAGE_KEY, templateId);
    markGeneratedArtifactsStale();
    setMessage(
      locale === "vi"
        ? "Đã chọn template cho D02 Service Blueprint."
        : "Selected template for D02 Service Blueprint."
    );
  }

  function changeTemplate() {
    const target = document.getElementById("template-hub-list");

    setActiveTab("browse");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMessage(
      locale === "vi"
        ? "Chọn một template card, sau đó đặt cho D01 hoặc D02."
        : "Choose a template card, then set it for D01 or D02."
    );
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
      setMessage(
        locale === "vi"
          ? "Chưa chọn template để review."
          : "No template selected for review."
      );
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
    setActiveTab("review");
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

        logAICallAudit({
          skillId: AI_TEMPLATE_REVIEW_SKILL_ID,
          success: false,
          errorMessage,
          realAIEnabled: realAITemplateReviewEnabled,
          externalApiCalled:
            data.meta?.externalApiCalled ?? realAITemplateReviewEnabled
        });
        setMessage(errorMessage);
        return;
      }

      setTemplateReviewRecommendations(data.result?.recommendations ?? []);
      setTemplateQualityScore(data.result?.qualityScore ?? null);
      setTemplateReviewWarnings(data.result?.warnings ?? []);
      setTemplateReviewAssumptions(data.result?.assumptions ?? []);
      setMessage(
        `${
          data.mode === "provider-backed"
            ? `Real provider ${data.meta?.providerId ?? "AI"}`
            : "Mock/local"
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
      setMessage("Template QA request failed. No template change was applied.");
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
              : errorMessage || "Provider run failed.",
          validationStatus:
            data.meta?.validationPassed === false || !response.ok || !data.ok
              ? "failed"
              : "passed",
          recommendations: response.ok && data.ok ? recommendations : [],
          qualityScore: response.ok && data.ok ? data.result?.qualityScore ?? null : null,
          assumptions: response.ok && data.ok ? data.result?.assumptions ?? [] : [],
          error: response.ok && data.ok ? undefined : errorMessage
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
        const errorMessage =
          error instanceof Error ? error.message : "Provider compare request failed.";

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
    setMessage("Provider Compare finished. Choose one provider output to review further.");
    setIsRunningCompare(false);
  }

  function useCompareResult(result: TemplateCompareResult) {
    setTemplateReviewRecommendations(result.recommendations);
    setTemplateQualityScore(result.qualityScore);
    setTemplateReviewWarnings(result.warnings);
    setTemplateReviewAssumptions(result.assumptions);
    setMessage(`Selected ${result.providerId} Template Review output. No template change was auto-applied.`);
  }

  return (
    <SessionFrame
      actions={
        <>
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
      <div className="rounded border border-slate-200 bg-slate-50 p-1">
        <div className="grid gap-1 md:grid-cols-4">
          {tabItems.map((tab) => (
            <button
              className={`rounded px-3 py-2 text-left text-sm font-semibold ${
                activeTab === tab.id
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-600 hover:bg-white/70"
              }`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              <span className="block">{tab.label}</span>
              <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">
                {tab.helper}
              </span>
            </button>
          ))}
        </div>
      </div>

      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}

      <details className="mt-4 rounded border border-violet-100 bg-violet-50/60 p-4 text-sm text-violet-950">
        <summary className="cursor-pointer font-semibold">
          {text.howItWorks}
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {[
            { title: text.guideStep1Title, body: text.guideStep1Body },
            { title: text.guideStep2Title, body: text.guideStep2Body },
            { title: text.guideStep3Title, body: text.guideStep3Body }
          ].map((step, index) => (
            <div className="rounded border border-violet-100 bg-white/80 p-3" key={step.title}>
              <p className="text-xs font-bold uppercase text-violet-700">
                {index + 1}. {step.title}
              </p>
              <p className="mt-1 leading-5 text-violet-950/80">{step.body}</p>
            </div>
          ))}
        </div>
      </details>

      {activeTab === "current" ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            {
              label: "D01 BPMN",
              draft: selectedD01Draft,
              browseAction: () => setActiveTab("browse")
            },
            {
              label: "D02 Service Blueprint",
              draft: selectedD02Draft,
              browseAction: () => setActiveTab("browse")
            }
          ].map((item) => (
            <section className="rounded border border-slate-200 bg-white p-4" key={item.label}>
              <p className="text-xs font-semibold uppercase text-slate-500">
                {item.label}
              </p>
              <h3 className="mt-2 text-base font-semibold text-slate-950">
                {item.draft?.name ?? text.noTemplateSelected}
              </h3>
              {item.draft ? (
                <div className="mt-3">
                  <TemplateSummary draft={item.draft} text={text} />
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={item.browseAction}
                  type="button"
                >
                  {text.changeTemplate}
                </button>
                {item.draft ? (
                  <button
                    className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => setPreviewTemplateId(item.draft?.id ?? null)}
                    type="button"
                  >
                    {text.preview}
                  </button>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {activeTab === "browse" ? (
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
              const isSelectedD01 = draft.id === selectedD01TemplateId;
              const isSelectedD02 = draft.id === selectedD02TemplateId;
              const isD01Compatible = isBpmnCompatibleTemplate(draft);
              const isD02Compatible = isServiceBlueprintCompatibleTemplate(draft);
              const tags = parseTags(draft.tags).slice(0, 3);

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
                      <span className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                        <span className="rounded bg-slate-100 px-2 py-1">
                          {draft.outputType || text.notClassified}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-1">
                          {draft.businessDomain || text.notClassified}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-1">
                          {draft.processType || text.notClassified}
                        </span>
                        <span className="rounded bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">
                          {draft.status}
                        </span>
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
                      {isD01Compatible ? (
                        <button
                          className="rounded border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800 hover:bg-sky-100"
                          onClick={() => useForD01(draft.id)}
                          type="button"
                        >
                          {isSelectedD01 ? `${text.selected}: D01` : text.useD01}
                        </button>
                      ) : null}
                      {isD02Compatible ? (
                        <button
                          className="rounded border border-violet-300 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-800 hover:bg-violet-100"
                          onClick={() => useForD02(draft.id)}
                          type="button"
                        >
                          {isSelectedD02 ? `${text.selected}: D02` : text.useD02}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-slate-600">
                    <p>
                      <span className="font-semibold text-slate-900">
                        {text.recommendedFor}:
                      </span>{" "}
                      {tags.length > 0 ? tags.join(", ") : text.notClassified}
                    </p>
                  </div>

                  <details className="mt-3 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    <summary className="cursor-pointer font-semibold text-slate-950">
                      {text.details}
                    </summary>
                    <div className="mt-3">
                      <TemplateSummary draft={draft} text={text} />
                      <p className="mt-3 text-xs text-slate-500">
                        {draft.type} | v{draft.version} | {draft.notationStandard || text.notClassified}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        {text.mandatoryFields}:{" "}
                        {draft.mandatoryFields
                          .split(/\r?\n/)
                          .filter(Boolean)
                          .join(", ") || text.none}
                      </p>
                    </div>
                  </details>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}

      {activeTab === "review" ? (
        <div className="mt-4 grid gap-4">
          <div className="rounded border border-indigo-200 bg-indigo-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold text-indigo-950">
                  {text.templateReview}
                </p>
                <p className="mt-1 text-sm text-indigo-900">
                  {activeDraft?.name ?? text.noTemplateSelected}
                </p>
                <p className="mt-1 text-xs text-indigo-800">
                  {text.reviewRequired}
                </p>
              </div>
              <button
                className="btn btn-ai w-fit"
                disabled={isReviewingTemplate}
                onClick={runTemplateReview}
                type="button"
              >
                {isReviewingTemplate ? text.running : text.runTemplateQA}
              </button>
            </div>
          </div>

          <details className="rounded border border-slate-200 bg-slate-50 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-slate-950">
              {text.advancedProviderCompare}
            </summary>
            <div className="mt-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <p className="text-xs leading-5 text-slate-600">
                  {text.providerCompareHelper}
                </p>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    checked={compareModeEnabled}
                    onChange={(event) => setCompareModeEnabled(event.target.checked)}
                    type="checkbox"
                  />
                  {text.enableCompareMode}
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
                      {provider.label[locale]}
                    </label>
                  ))}
                  <button
                    className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isRunningCompare}
                    onClick={() => void runTemplateReviewCompare()}
                    type="button"
                  >
                    {isRunningCompare ? text.comparing : text.compareTemplateReview}
                  </button>
                  {compareProviderIds.length > 1 ? (
                    <span className="text-xs text-amber-700">
                      {text.costWarning}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </details>

          {compareResults.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
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
                    {text.confidence}: {result.confidence} | {text.warnings}:{" "}
                    {result.warnings.length}
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
                    {text.useThisOutput}
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {templateQualityScore ? (
            <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              <p className="text-xs font-semibold uppercase text-emerald-700">
                {text.aiTemplateReview}
              </p>
              <p className="font-semibold">
                {text.qualityScore}: {templateQualityScore.score}/
                {templateQualityScore.maxScore}
              </p>
              <p className="mt-1">{templateQualityScore.summary}</p>
            </div>
          ) : null}

          {templateReviewWarnings.length > 0 || templateReviewAssumptions.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {templateReviewWarnings.length > 0 ? (
                <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="font-semibold">{text.warnings}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {templateReviewWarnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {templateReviewAssumptions.length > 0 ? (
                <div className="rounded border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
                  <p className="font-semibold">{text.assumptions}</p>
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
            <div className="rounded border border-indigo-200 bg-indigo-50 p-3">
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
                      {text.affectedFields}: {recommendation.affectedFields.join(", ")}
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
      ) : null}

      {activeTab === "editor" ? (
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
      ) : null}

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
              <TemplateSummary draft={previewDraft} text={text} />
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
