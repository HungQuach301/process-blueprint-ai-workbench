"use client";

import { useEffect, useMemo, useState } from "react";
import { SessionFrame } from "@/components/layout/SessionFrame";
import {
  AI_PROVIDER_SETTINGS_STORAGE_KEY,
  getDefaultModelForProvider,
  getModelOptionsForProvider,
  isModelValidForProvider,
  mapModelProviderToServerProvider,
  defaultAIProviderSettings,
  readAIProviderSettings
} from "@/lib/ai/ai-governance";
import { aiSkillRegistryV2 } from "@/lib/ai/skill-registry-v2";
import type {
  AIProviderSettings,
  AIRuntimeMode,
  AIRuntimeOptions,
  AISkillOverrideId,
  AIReasoningEffort,
  AIThinkingType,
  DataUsageMode,
  ModelProvider
} from "@/lib/ai/model-provider-types";
import {
  findProviderModel
} from "@/lib/ai/provider-model-catalog";
import { getLocale, type Locale } from "@/lib/i18n";

const LOCALE_EVENT = "process-blueprint-locale-change";

type ProviderCardId = "product-ai" | "openai-byok" | "claude-byok" | "local-model";
type ServerProviderId = "product-ai" | "openai" | "claude" | "mock";
type ProviderDisplayStatus = "configured" | "missing env" | "disabled" | "available";
type AdvancedTabId = "provider" | "models" | "skills" | "params";

type ProviderStatusItem = {
  providerId: ServerProviderId;
  status: ProviderDisplayStatus;
  selected: boolean;
  model: string;
};

type AIStatusResponse = {
  realAIEnabled?: boolean;
  realAIQAEnabled?: boolean;
  realAITemplateReviewEnabled?: boolean;
  providerStatus?: "configured" | "not configured" | "mock-only";
  displayStatus?: ProviderDisplayStatus;
  provider?: ServerProviderId;
  effectiveProvider?: ServerProviderId;
  fallbackActive?: boolean;
  providers?: ProviderStatusItem[];
  dataUsageMode?: DataUsageMode;
  model?: string;
};

type TestConnectionResponse = AIStatusResponse & {
  ok?: boolean;
  displayStatus?: ProviderDisplayStatus;
  message?: string;
};

const providerCards: Array<{
  id: ProviderCardId;
  serverProviderId: ServerProviderId;
  title: string;
  description: Record<Locale, string>;
}> = [
  {
    id: "product-ai",
    serverProviderId: "product-ai",
    title: "Product AI",
    description: {
      vi: "AI cua san pham, chay qua endpoint server-side cau hinh bang env.",
      en: "Managed product AI through the server-side endpoint configured by env."
    }
  },
  {
    id: "openai-byok",
    serverProviderId: "openai",
    title: "OpenAI",
    description: {
      vi: "OpenAI qua route server-side. Khong nhap API key trong trinh duyet.",
      en: "OpenAI through the server-side route. No browser API key entry."
    }
  },
  {
    id: "claude-byok",
    serverProviderId: "claude",
    title: "Claude",
    description: {
      vi: "Claude qua adapter server-side va bien moi truong rieng.",
      en: "Claude through the server-side adapter and server env."
    }
  },
  {
    id: "local-model",
    serverProviderId: "mock",
    title: "Local analysis",
    description: {
      vi: "Phan tich cuc bo, khong goi provider ben ngoai.",
      en: "Local analysis with no external provider call."
    }
  }
];

const modelProviderOptions: Array<{ value: ModelProvider; label: string }> = [
  { value: "product-ai", label: "Product AI" },
  { value: "openai-byok", label: "OpenAI" },
  { value: "claude-byok", label: "Claude" },
  { value: "local-model", label: "Local analysis" },
  { value: "no-ai", label: "No-AI" }
];

const dataUsageModeOptions: Array<{ value: DataUsageMode; label: string }> = [
  { value: "local-only", label: "Local only" },
  { value: "cloud-processing", label: "Cloud processing" },
  { value: "no-training", label: "No training" },
  { value: "organization-private-learning", label: "Organization-private learning" }
];

const runtimeModeOptions: Array<{ value: AIRuntimeMode; label: string }> = [
  { value: "fast", label: "Fast" },
  { value: "balanced", label: "Balanced" },
  { value: "reasoning", label: "Reasoning" },
  { value: "coding", label: "Coding" },
  { value: "long-context", label: "Long context" },
  { value: "structured-output", label: "Structured output" }
];

const reasoningEffortOptions: Array<{ value: AIReasoningEffort; label: string }> = [
  { value: "none", label: "None" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "xhigh", label: "Extra high" }
];

const thinkingTypeOptions: Array<{ value: AIThinkingType; label: string }> = [
  { value: "none", label: "None" },
  { value: "auto", label: "Auto" },
  { value: "budgeted", label: "Budgeted" },
  { value: "extended", label: "Extended" }
];

const skillLabelOverrides: Partial<Record<AISkillOverrideId, string>> = {
  "input-brief-to-ptr": "Input Brief to PTR",
  "file-to-ptr-draft": "File to PTR",
  "chat-to-ptr-draft": "Chat / Notes to PTR",
  "ai-process-qa": "Process QA",
  "ai-process-qa-finding": "Process QA Findings",
  "process-improvement-recommendation": "PTR AI Assistant",
  "artifact-review": "Artifact Review",
  "ai-template-review": "Template Review",
  "notes-to-brd": "BRD Generation",
  "ptr-to-brd": "PTR to BRD",
  "brd-to-srs": "SRS Generation",
  "notes-to-srs": "Notes to SRS",
  "srs-to-user-stories": "User Story Generation",
  "brd-to-user-stories": "BRD to User Stories",
  "user-stories-to-acceptance-criteria": "Acceptance Criteria",
  "product-scope-review": "Product Scope Review",
  "mvp-slicing": "MVP Slicing",
  "requirement-quality-check": "Requirement Quality Check",
  "user-stories-to-ai-coding-pack": "AI Coding Pack"
};

const providerBackedSkillOptions: Array<{
  id: AISkillOverrideId;
  label: string;
}> = aiSkillRegistryV2
  .filter(
    (skill) =>
      skill.status === "real-ai-ready" &&
      skill.allowedProviders.some((provider) => provider !== "mock")
  )
  .map((skill) => ({
    id:
      skill.skillId === "template-review"
        ? "ai-template-review"
        : (skill.skillId as AISkillOverrideId),
    label:
      skillLabelOverrides[
        skill.skillId === "template-review"
          ? "ai-template-review"
          : (skill.skillId as AISkillOverrideId)
      ] ??
      skill.description
        .replace(/\.$/, "")
        .replace(/^Generate\s+/i, "")
        .replace(/^Review\s+/i, "Review ")
  }))
  .filter(
    (skill, index, list) =>
      list.findIndex((item) => item.id === skill.id) === index
  );

const textByLocale = {
  vi: {
    title: "Trung tam ket noi AI",
    description:
      "Chon provider, kiem tra ket noi va quan ly cau hinh AI khong nhay cam.",
    compactTitle: "Provider Capability Center",
    compactDescription: "Chon provider, model va che do runtime. Khong luu API key trong browser.",
    save: "Luu thiet lap",
    reset: "Dat lai",
    test: "Kiem tra ket noi",
    testing: "Dang kiem tra...",
    status: "Trang thai",
    selected: "Dang chon",
    configured: "San sang",
    missingEnv: "Chua cau hinh",
    disabled: "Dang tat",
    available: "Phan tich cuc bo",
    dataWarning: "Tin cay va an toan du lieu",
    dataWarningBody:
      "Test Connection va cac tac vu AI luon goi route server-side. API key cua provider khong duoc luu hoac hien thi trong browser.",
    localModeLabel: "Phan tich cuc bo",
    advanced: "Thiet lap nang cao",
    manageModels: "Quan ly models & modes",
    providerTab: "Provider",
    modelsTab: "Models",
    skillDefaultsTab: "Skill defaults",
    advancedParamsTab: "Advanced params",
    runtimeMode: "Mode",
    reasoningEffort: "Reasoning",
    thinkingType: "Thinking",
    customModelIds: "Custom model id",
    addCustomModel: "Them custom model",
    costWarning: "Reasoning/thinking cao hon co the tang latency va chi phi.",
    modelCapabilities: "Model capabilities",
    show: "Hien",
    hide: "An",
    defaultProvider: "Provider mac dinh",
    capability: "Model mac dinh",
    allowCloud: "Cho phep cloud AI",
    requireApproval: "Yeu cau phe duyet",
    dataUsageMode: "Che do su dung du lieu",
    organizationNote: "Ghi chu to chuc",
    organizationPlaceholder: "Ghi chu tenant/to chuc tuy chon",
    perSkillOverride: "Ghi de theo skill",
    inheritDefault: "Theo provider mac dinh",
    saved: "Da luu preference khong chua secret vao localStorage.",
    resetDone: "Da dat lai ve local analysis va local-only.",
    changed: "Co thay doi chua luu.",
    modelPlaceholder: "Chon model",
    fallbackActive: "Dang dung phan tich cuc bo vi provider da chon chua san sang.",
    localNextStep: "Co the tiep tuc demo hoac chay workflow ma khong goi provider ben ngoai.",
    readyNextStep: "Provider da san sang cho cac tac vu AI server-side khi duoc phep.",
    notConfiguredNextStep: "Can hoan tat cau hinh provider tren server truoc khi dung real AI.",
    disabledNextStep: "Real AI dang tat. Dung phan tich cuc bo hoac mo Advanced de xem cau hinh."
  },
  en: {
    title: "AI Connection Center",
    description:
      "Choose providers, test connection, and manage non-secret AI preferences.",
    compactTitle: "Provider Capability Center",
    compactDescription: "Choose provider, model, and runtime mode. Browser settings never store API keys.",
    save: "Save settings",
    reset: "Reset",
    test: "Test connection",
    testing: "Testing...",
    status: "Status",
    selected: "Selected",
    configured: "Ready",
    missingEnv: "Not configured",
    disabled: "Disabled",
    available: "Local analysis",
    dataWarning: "Trust and data safety",
    dataWarningBody:
      "Test Connection and AI tasks call the server-side route. Provider API keys are not stored or exposed in browser code.",
    localModeLabel: "Local analysis",
    advanced: "Advanced Settings",
    manageModels: "Manage models & modes",
    providerTab: "Provider",
    modelsTab: "Models",
    skillDefaultsTab: "Skill defaults",
    advancedParamsTab: "Advanced params",
    runtimeMode: "Mode",
    reasoningEffort: "Reasoning",
    thinkingType: "Thinking",
    customModelIds: "Custom model id",
    addCustomModel: "Add custom model",
    costWarning: "Higher reasoning/thinking may increase latency and cost.",
    modelCapabilities: "Model capabilities",
    show: "Show",
    hide: "Hide",
    defaultProvider: "Default provider",
    capability: "Default model",
    allowCloud: "Allow cloud AI",
    requireApproval: "Require approval",
    dataUsageMode: "Data usage mode",
    organizationNote: "Organization note",
    organizationPlaceholder: "Optional tenant or organization note",
    perSkillOverride: "Per-skill override",
    inheritDefault: "Use default provider",
    saved: "Saved non-secret preferences to localStorage.",
    resetDone: "Reset to local analysis and local-only.",
    changed: "Unsaved changes.",
    modelPlaceholder: "Choose a model",
    fallbackActive: "Local analysis fallback is active because the selected provider is not ready.",
    localNextStep: "You can keep demoing or running workflows without an external provider call.",
    readyNextStep: "The provider is ready for server-side AI tasks when a skill allows it.",
    notConfiguredNextStep: "Finish server-side provider setup before using real AI.",
    disabledNextStep: "Real AI is disabled. Use local analysis or open Advanced to inspect setup."
  }
} satisfies Record<Locale, Record<string, string>>;

function getCardStatus(
  card: (typeof providerCards)[number],
  providerStatuses: ProviderStatusItem[],
  realAIEnabled: boolean
): ProviderDisplayStatus {
  if (card.serverProviderId === "mock") {
    return "available";
  }

  return (
    providerStatuses.find((item) => item.providerId === card.serverProviderId)?.status ??
    (realAIEnabled ? "missing env" : "disabled")
  );
}

function getStatusText(status: ProviderDisplayStatus, locale: Locale) {
  const text = textByLocale[locale];

  if (status === "configured") {
    return text.configured;
  }

  if (status === "missing env") {
    return text.missingEnv;
  }

  if (status === "disabled") {
    return text.disabled;
  }

  return text.available;
}

function getNextStepText(status: ProviderDisplayStatus, locale: Locale) {
  const text = textByLocale[locale];

  if (status === "configured") {
    return text.readyNextStep;
  }

  if (status === "missing env") {
    return text.notConfiguredNextStep;
  }

  if (status === "disabled") {
    return text.disabledNextStep;
  }

  return text.localNextStep;
}

function getStatusForModelProvider(
  providerMode: ModelProvider,
  providerStatuses: ProviderStatusItem[],
  realAIEnabled: boolean
) {
  if (providerMode === "local-model" || providerMode === "no-ai") {
    return "available";
  }

  const serverProviderId = mapModelProviderToServerProvider(providerMode);

  return (
    providerStatuses.find((item) => item.providerId === serverProviderId)
      ?.status ?? (realAIEnabled ? "missing env" : "disabled")
  );
}

function isProviderModeConfigured(
  providerMode: ModelProvider,
  providerStatuses: ProviderStatusItem[],
  realAIEnabled: boolean
) {
  const status = getStatusForModelProvider(
    providerMode,
    providerStatuses,
    realAIEnabled
  );

  return (
    providerMode === "local-model" ||
    providerMode === "no-ai" ||
    status === "configured"
  );
}

function getRuntimeOptionsWithDefaults(
  runtimeOptions?: AIRuntimeOptions
): Required<AIRuntimeOptions> {
  return {
    mode: runtimeOptions?.mode ?? "balanced",
    reasoningEffort: runtimeOptions?.reasoningEffort ?? "none",
    thinkingType: runtimeOptions?.thinkingType ?? "none"
  };
}

function getModelDescription(providerMode: ModelProvider, modelId: string) {
  return (
    findProviderModel(providerMode, modelId)?.description ??
    "Custom model id configured as a non-secret browser preference."
  );
}

export function AIProviderSettingsPanel() {
  const [locale, setActiveLocale] = useState<Locale>("vi");
  const [settings, setSettings] = useState<AIProviderSettings>(
    defaultAIProviderSettings
  );
  const [message, setMessage] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [activeAdvancedTab, setActiveAdvancedTab] =
    useState<AdvancedTabId>("provider");
  const [customModelDraft, setCustomModelDraft] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [serverStatus, setServerStatus] = useState<AIStatusResponse>({});
  const text = textByLocale[locale];

  useEffect(() => {
    setSettings(readAIProviderSettings());
    setActiveLocale(getLocale());
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

  async function loadAIMode() {
    try {
      const response = await fetch("/api/ai/run-skill", { method: "GET" });
      const data = (await response.json()) as AIStatusResponse;

      setServerStatus(data);
    } catch {
      setServerStatus({});
    }
  }

  useEffect(() => {
    loadAIMode();
  }, []);

  const realAIEnabled =
    serverStatus.realAIEnabled === true ||
    serverStatus.realAIQAEnabled === true ||
    serverStatus.realAITemplateReviewEnabled === true;
  const selectedServerProvider = serverStatus.provider ?? "mock";
  const effectiveServerProvider =
    serverStatus.effectiveProvider ?? selectedServerProvider;
  const providerStatuses = useMemo(
    () => serverStatus.providers ?? [],
    [serverStatus.providers]
  );
  const selectedProviderCard =
    providerCards.find((card) => card.id === settings.providerMode) ??
    providerCards[3];
  const selectedConnectionStatus = getCardStatus(
    selectedProviderCard,
    providerStatuses,
    realAIEnabled
  );
  const isUsingLocalAnalysis =
    !realAIEnabled ||
    effectiveServerProvider === "mock" ||
    selectedProviderCard.serverProviderId === "mock";
  const visibleProviderCards = providerCards.filter((card) => {
    if (card.serverProviderId === "mock") {
      return true;
    }

    return getCardStatus(card, providerStatuses, realAIEnabled) === "configured";
  });
  const defaultModelDisabled = !isProviderModeConfigured(
    settings.providerMode,
    providerStatuses,
    realAIEnabled
  );
  const selectedDefaultModel = isModelValidForProvider(
    settings.providerMode,
    settings.defaultModelName ?? "",
    settings.customModelIds
  )
    ? settings.defaultModelName ?? getDefaultModelForProvider(settings.providerMode)
    : getDefaultModelForProvider(settings.providerMode);
  const defaultRuntimeOptions = getRuntimeOptionsWithDefaults(
    settings.defaultRuntimeOptions
  );
  const selectedModelMetadata = findProviderModel(
    settings.providerMode,
    selectedDefaultModel
  );
  const connectionBadge = isUsingLocalAnalysis
    ? `⚙ ${text.localModeLabel}`
    : selectedConnectionStatus === "configured"
      ? `✅ ${selectedProviderCard.title} Ready`
      : locale === "vi"
        ? "❌ Chua ket noi"
        : "❌ Not connected";

  function updateSettings(nextSettings: AIProviderSettings) {
    setSettings(nextSettings);
    setMessage(text.changed);
  }

  function saveSettings() {
    const nonSecretSettings: AIProviderSettings = {
      providerMode: settings.providerMode,
      dataUsageMode: settings.dataUsageMode,
      defaultModelCapability: settings.defaultModelCapability,
      allowCloudAI: settings.allowCloudAI,
      requireApprovalForAIOutput: settings.requireApprovalForAIOutput,
      perSkillProviderOverrides: settings.perSkillProviderOverrides,
      defaultRuntimeOptions: settings.defaultRuntimeOptions,
      perSkillRuntimeOverrides: settings.perSkillRuntimeOverrides,
      customModelIds: settings.customModelIds,
      defaultModelName: settings.defaultModelName,
      perSkillModelOverrides: settings.perSkillModelOverrides,
      modelName: settings.modelName,
      organizationId: settings.organizationId,
      tenantId: settings.tenantId
    };

    window.localStorage.setItem(
      AI_PROVIDER_SETTINGS_STORAGE_KEY,
      JSON.stringify(nonSecretSettings)
    );
    setMessage(text.saved);
  }

  function resetSettings() {
    setSettings(defaultAIProviderSettings);
    window.localStorage.removeItem(AI_PROVIDER_SETTINGS_STORAGE_KEY);
    setMessage(text.resetDone);
  }

  function selectProvider(providerMode: ModelProvider) {
    const defaultModelName = isModelValidForProvider(
      providerMode,
      settings.defaultModelName ?? "",
      settings.customModelIds
    )
      ? settings.defaultModelName
      : getDefaultModelForProvider(providerMode);

    updateSettings({
      ...settings,
      providerMode,
      defaultModelName,
      modelName: defaultModelName,
      dataUsageMode:
        providerMode === "local-model" || providerMode === "no-ai"
          ? "local-only"
          : settings.dataUsageMode
    });
  }

  async function testConnection() {
    setIsTesting(true);

    try {
      const response = await fetch("/api/ai/run-skill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "test-connection" })
      });
      const data = (await response.json()) as TestConnectionResponse;

      setServerStatus((current) => ({
        ...current,
        ...data
      }));
      setMessage(data.message ?? (data.ok ? text.available : text.missingEnv));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Connection test failed."
      );
    } finally {
      setIsTesting(false);
    }
  }

  function updateSkillOverride(
    skillId: AISkillOverrideId,
    providerMode: ModelProvider | ""
  ) {
    const nextOverrides = {
      ...(settings.perSkillProviderOverrides ?? {})
    };

    if (!providerMode) {
      delete nextOverrides[skillId];
    } else {
      nextOverrides[skillId] = providerMode;
    }

    const nextModelOverrides = {
      ...(settings.perSkillModelOverrides ?? {})
    };

    if (!providerMode) {
      delete nextModelOverrides[skillId];
    } else if (
      !isModelValidForProvider(
        providerMode,
        nextModelOverrides[skillId] ?? "",
        settings.customModelIds
      )
    ) {
      nextModelOverrides[skillId] = getDefaultModelForProvider(providerMode);
    }

    updateSettings({
      ...settings,
      perSkillProviderOverrides: nextOverrides,
      perSkillModelOverrides: nextModelOverrides
    });
  }

  function updateSkillModelOverride(skillId: AISkillOverrideId, model: string) {
    updateSettings({
      ...settings,
      perSkillModelOverrides: {
        ...(settings.perSkillModelOverrides ?? {}),
        [skillId]: model
      }
    });
  }

  function updateDefaultRuntimeOptions(nextRuntimeOptions: AIRuntimeOptions) {
    updateSettings({
      ...settings,
      defaultRuntimeOptions: {
        ...(settings.defaultRuntimeOptions ?? {}),
        ...nextRuntimeOptions
      }
    });
  }

  function updateSkillRuntimeOverride(
    skillId: AISkillOverrideId,
    runtimeOptions: AIRuntimeOptions
  ) {
    updateSettings({
      ...settings,
      perSkillRuntimeOverrides: {
        ...(settings.perSkillRuntimeOverrides ?? {}),
        [skillId]: {
          ...(settings.perSkillRuntimeOverrides?.[skillId] ?? {}),
          ...runtimeOptions
        }
      }
    });
  }

  function addCustomModelId() {
    const modelId = customModelDraft.trim();

    if (!modelId) {
      return;
    }

    const existingModelIds = settings.customModelIds?.[settings.providerMode] ?? [];
    updateSettings({
      ...settings,
      customModelIds: {
        ...(settings.customModelIds ?? {}),
        [settings.providerMode]: [...new Set([...existingModelIds, modelId])]
      },
      defaultModelName: modelId,
      modelName: modelId
    });
    setCustomModelDraft("");
  }

  return (
    <SessionFrame
      actions={
        <>
          <button
            className="btn btn-ai"
            onClick={testConnection}
            type="button"
          >
            {isTesting ? text.testing : text.test}
          </button>
          <button
            className="btn btn-secondary"
            onClick={resetSettings}
            type="button"
          >
            {text.reset}
          </button>
          <button
            className="btn btn-primary"
            onClick={saveSettings}
            type="button"
          >
            {text.save}
          </button>
        </>
      }
      bodyClassName="p-4"
      description={text.description}
      title={text.title}
    >
      <div className="rounded border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-violet-700">
                {text.compactTitle}
              </p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {text.compactDescription}
              </p>
            </div>
            <span
              className={`inline-flex w-fit rounded-full border px-3 py-1 text-sm font-semibold ${
                isUsingLocalAnalysis
                  ? "border-slate-300 bg-white text-slate-800"
                  : selectedConnectionStatus === "configured"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {connectionBadge}
            </span>
          </div>
        </div>
        <div className="grid gap-3 bg-slate-50/80 p-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="soft-panel p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Provider
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-950">
              {selectedProviderCard.title}
            </p>
          </div>
          <div className="soft-panel p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Model
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-950">
              {selectedDefaultModel}
            </p>
          </div>
          <div className="soft-panel p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {text.runtimeMode}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-950">
              {defaultRuntimeOptions.mode}
            </p>
          </div>
          <div className="soft-panel p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {text.dataUsageMode}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-950">
              {settings.dataUsageMode}
            </p>
          </div>
          <div className="soft-panel p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {text.requireApproval}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-950">
              {settings.requireApprovalForAIOutput ? "Required" : "Optional"}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm leading-6 text-slate-600">
            {getNextStepText(selectedConnectionStatus, locale)}
          </p>
          <button
            className="btn btn-secondary"
            onClick={() => setAdvancedOpen((isOpen) => !isOpen)}
            type="button"
          >
            {text.manageModels}
          </button>
        </div>
      </div>

      <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">{text.dataWarning}</p>
        <p className="mt-1">{text.dataWarningBody}</p>
        <p className="mt-2 text-xs font-semibold">{text.costWarning}</p>
      </div>

      <div className="mt-4 overflow-hidden rounded border border-slate-200 bg-white">
        <button
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-950 hover:bg-slate-50"
          onClick={() => setAdvancedOpen((isOpen) => !isOpen)}
          type="button"
        >
          <span>{text.advanced}</span>
          <span className="text-xs text-slate-500">
            {advancedOpen ? text.hide : text.show}
          </span>
        </button>

        {advancedOpen ? (
          <div className="border-t border-slate-200">
            <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 p-3">
              {[
                { id: "provider", label: text.providerTab },
                { id: "models", label: text.modelsTab },
                { id: "skills", label: text.skillDefaultsTab },
                { id: "params", label: text.advancedParamsTab }
              ].map((tab) => (
                <button
                  className={`rounded px-3 py-2 text-sm font-semibold ${
                    activeAdvancedTab === tab.id
                      ? "bg-violet-600 text-white"
                      : "bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                  key={tab.id}
                  onClick={() => setActiveAdvancedTab(tab.id as AdvancedTabId)}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeAdvancedTab === "provider" ? (
              <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
                {visibleProviderCards.map((card) => {
                  const status = getCardStatus(card, providerStatuses, realAIEnabled);
                  const isSelected = settings.providerMode === card.id;
                  const isServerSelected = selectedServerProvider === card.serverProviderId;

                  return (
                    <button
                      className={`min-h-36 rounded border p-4 text-left transition ${
                        isSelected
                          ? "border-violet-300 bg-violet-600 text-white shadow-md"
                          : "border-slate-200 bg-white text-slate-800 hover:border-slate-400"
                      }`}
                      key={card.id}
                      onClick={() => selectProvider(card.id)}
                      type="button"
                    >
                      <span className="block text-sm font-semibold">{card.title}</span>
                      <span
                        className={`mt-2 inline-flex rounded border px-2 py-1 text-xs font-semibold ${
                          isSelected
                            ? "border-white/30 bg-white/10 text-white"
                            : status === "configured" || status === "available"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : status === "missing env"
                                ? "border-amber-200 bg-amber-50 text-amber-800"
                                : "border-slate-200 bg-slate-100 text-slate-600"
                        }`}
                      >
                        {getStatusText(status, locale)}
                      </span>
                      {isServerSelected ? (
                        <span className="ml-2 inline-flex rounded border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800">
                          {text.selected}
                        </span>
                      ) : null}
                      <span className={`mt-3 block text-sm leading-6 ${isSelected ? "text-slate-200" : "text-slate-600"}`}>
                        {card.description[locale]}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {activeAdvancedTab === "models" ? (
              <div className="grid gap-4 p-4 lg:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    {text.defaultProvider}
                  </span>
                  <select
                    className="mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                    onChange={(event) =>
                      selectProvider(event.target.value as ModelProvider)
                    }
                    value={settings.providerMode}
                  >
                    {modelProviderOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    {text.capability}
                  </span>
                  <select
                    className="mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                    disabled={defaultModelDisabled}
                    onChange={(event) =>
                      updateSettings({
                        ...settings,
                        defaultModelName: event.target.value,
                        modelName: event.target.value
                      })
                    }
                    value={selectedDefaultModel}
                  >
                    {getModelOptionsForProvider(settings.providerMode, settings.customModelIds).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="rounded border border-slate-200 bg-slate-50 p-3 lg:col-span-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {text.modelCapabilities}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {getModelDescription(settings.providerMode, selectedDefaultModel)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {(selectedModelMetadata?.recommendedFor ?? ["balanced"]).map((tag) => (
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-600" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded border border-slate-200 bg-white p-3 lg:col-span-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">
                      {text.customModelIds}
                    </span>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <input
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800"
                        onChange={(event) => setCustomModelDraft(event.target.value)}
                        placeholder="provider-model-id"
                        type="text"
                        value={customModelDraft}
                      />
                      <button className="btn btn-secondary" onClick={addCustomModelId} type="button">
                        {text.addCustomModel}
                      </button>
                    </div>
                  </label>
                </div>
              </div>
            ) : null}

            {activeAdvancedTab === "skills" ? (
              <div className="p-4">
                <p className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                  {text.costWarning}
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  {providerBackedSkillOptions.map((skill) => {
                    const skillProviderMode =
                      settings.perSkillProviderOverrides?.[skill.id] ??
                      settings.providerMode;
                    const skillModel =
                      settings.perSkillModelOverrides?.[skill.id] ??
                      settings.defaultModelName ??
                      getDefaultModelForProvider(skillProviderMode);
                    const skillRuntime = getRuntimeOptionsWithDefaults({
                      ...settings.defaultRuntimeOptions,
                      ...settings.perSkillRuntimeOverrides?.[skill.id]
                    });
                    const skillModelDisabled = !isProviderModeConfigured(
                      skillProviderMode,
                      providerStatuses,
                      realAIEnabled
                    );

                    return (
                      <div className="rounded border border-slate-200 bg-slate-50 p-3" key={skill.id}>
                        <span className="text-sm font-semibold text-slate-900">
                          {skill.label}
                        </span>
                        <div className="mt-2 grid gap-2">
                          <select
                            className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                            onChange={(event) =>
                              updateSkillOverride(
                                skill.id,
                                event.target.value as ModelProvider | ""
                              )
                            }
                            value={settings.perSkillProviderOverrides?.[skill.id] ?? ""}
                          >
                            <option value="">{text.inheritDefault}</option>
                            {modelProviderOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <select
                            className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                            disabled={skillModelDisabled}
                            onChange={(event) =>
                              updateSkillModelOverride(skill.id, event.target.value)
                            }
                            value={
                              isModelValidForProvider(skillProviderMode, skillModel, settings.customModelIds)
                                ? skillModel
                                : getDefaultModelForProvider(skillProviderMode)
                            }
                          >
                            {getModelOptionsForProvider(skillProviderMode, settings.customModelIds).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <div className="grid gap-2 sm:grid-cols-3">
                            <select
                              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                              onChange={(event) =>
                                updateSkillRuntimeOverride(skill.id, {
                                  mode: event.target.value as AIRuntimeMode
                                })
                              }
                              value={skillRuntime.mode}
                            >
                              {runtimeModeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <select
                              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                              onChange={(event) =>
                                updateSkillRuntimeOverride(skill.id, {
                                  reasoningEffort: event.target.value as AIReasoningEffort
                                })
                              }
                              value={skillRuntime.reasoningEffort}
                            >
                              {reasoningEffortOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <select
                              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                              onChange={(event) =>
                                updateSkillRuntimeOverride(skill.id, {
                                  thinkingType: event.target.value as AIThinkingType
                                })
                              }
                              value={skillRuntime.thinkingType}
                            >
                              {thinkingTypeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {activeAdvancedTab === "params" ? (
              <div className="grid gap-4 p-4 lg:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    {text.dataUsageMode}
                  </span>
                  <select
                    className="mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                    onChange={(event) =>
                      updateSettings({
                        ...settings,
                        dataUsageMode: event.target.value as DataUsageMode
                      })
                    }
                    value={settings.dataUsageMode}
                  >
                    {dataUsageModeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    {text.runtimeMode}
                  </span>
                  <select
                    className="mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                    onChange={(event) =>
                      updateDefaultRuntimeOptions({
                        mode: event.target.value as AIRuntimeMode
                      })
                    }
                    value={defaultRuntimeOptions.mode}
                  >
                    {runtimeModeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    {text.reasoningEffort}
                  </span>
                  <select
                    className="mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                    onChange={(event) =>
                      updateDefaultRuntimeOptions({
                        reasoningEffort: event.target.value as AIReasoningEffort
                      })
                    }
                    value={defaultRuntimeOptions.reasoningEffort}
                  >
                    {reasoningEffortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    {text.thinkingType}
                  </span>
                  <select
                    className="mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                    onChange={(event) =>
                      updateDefaultRuntimeOptions({
                        thinkingType: event.target.value as AIThinkingType
                      })
                    }
                    value={defaultRuntimeOptions.thinkingType}
                  >
                    {thinkingTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-start gap-3 rounded border border-slate-200 bg-white p-3 text-sm text-slate-700">
                  <input
                    checked={settings.allowCloudAI}
                    className="mt-1"
                    onChange={(event) =>
                      updateSettings({
                        ...settings,
                        allowCloudAI: event.target.checked
                      })
                    }
                    type="checkbox"
                  />
                  <span className="font-medium text-slate-900">{text.allowCloud}</span>
                </label>
                <label className="flex items-start gap-3 rounded border border-slate-200 bg-white p-3 text-sm text-slate-700">
                  <input
                    checked={settings.requireApprovalForAIOutput}
                    className="mt-1"
                    onChange={(event) =>
                      updateSettings({
                        ...settings,
                        requireApprovalForAIOutput: event.target.checked
                      })
                    }
                    type="checkbox"
                  />
                  <span className="font-medium text-slate-900">
                    {text.requireApproval}
                  </span>
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-sm font-medium text-slate-700">
                    {text.organizationNote}
                  </span>
                  <input
                    className="mt-2 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800"
                    onChange={(event) =>
                      updateSettings({
                        ...settings,
                        organizationId: event.target.value
                      })
                    }
                    placeholder={text.organizationPlaceholder}
                    type="text"
                    value={settings.organizationId ?? ""}
                  />
                </label>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
    </SessionFrame>
  );
}
