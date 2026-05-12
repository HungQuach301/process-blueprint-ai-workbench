"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AITrustStatus,
  formatAIProviderName,
  getAITrustSummary,
  type AITrustStatusResponse,
  type ProviderDisplayStatus,
  type ProviderStatusItem
} from "@/components/ai-status/AITrustStatus";
import { SessionFrame } from "@/components/layout/SessionFrame";
import {
  AI_PROVIDER_SETTINGS_STORAGE_KEY,
  defaultAIProviderSettings,
  readAIProviderSettings
} from "@/lib/ai/ai-governance";
import type {
  AIProviderSettings,
  AISkillOverrideId,
  DataUsageMode,
  DefaultModelCapability,
  ModelProvider
} from "@/lib/ai/model-provider-types";
import { getLocale, type Locale } from "@/lib/i18n";

const LOCALE_EVENT = "process-blueprint-locale-change";

type ProviderModeCardId = "platform-provided-ai" | "your-ai" | "local";

type TestConnectionResponse = AITrustStatusResponse & {
  ok?: boolean;
  displayStatus?: ProviderDisplayStatus;
  message?: string;
};

const providerCards: Array<{
  id: ProviderModeCardId;
  providerMode: ModelProvider;
  title: string;
  description: Record<Locale, string>;
  detail: Record<Locale, string>;
}> = [
  {
    id: "platform-provided-ai",
    providerMode: "product-ai",
    title: "Platform Provided AI",
    description: {
      vi: "AI do nền tảng cung cấp qua cấu hình server-side.",
      en: "AI provided by the platform through server-side configuration."
    },
    detail: {
      vi: "Provider và model thực tế được cấu hình ở server. Trình duyệt không nhận secret.",
      en: "The underlying provider and model are configured on the server. The browser never receives secrets."
    }
  },
  {
    id: "your-ai",
    providerMode: "openai-byok",
    title: "Your AI",
    description: {
      vi: "Dùng tài khoản/API/endpoint AI của bạn hoặc tổ chức bạn.",
      en: "Use your own organization or developer AI provider."
    },
    detail: {
      vi: "MVP cấu hình qua biến môi trường server. Secure BYOK UI sẽ bổ sung sau.",
      en: "Configure through server environment variables for MVP. Secure BYOK UI coming soon."
    }
  },
  {
    id: "local",
    providerMode: "local-model",
    title: "Local",
    description: {
      vi: "Fallback cục bộ/mô phỏng, không gọi nhà cung cấp bên ngoài.",
      en: "Mock/local fallback with no external provider call."
    },
    detail: {
      vi: "Phù hợp demo nhạy cảm, offline hoặc môi trường chưa duyệt cloud AI.",
      en: "Best for sensitive demos, offline work, or environments without cloud AI approval."
    }
  },
];

const modelProviderOptions: Array<{ value: ModelProvider; label: Record<Locale, string> }> = [
  { value: "product-ai", label: { vi: "Cổng AI sản phẩm", en: "Product gateway" } },
  { value: "openai-byok", label: { vi: "OpenAI qua biến môi trường máy chủ", en: "OpenAI through server env" } },
  { value: "claude-byok", label: { vi: "Claude qua biến môi trường máy chủ", en: "Claude through server env" } },
  { value: "azure-openai", label: { vi: "Endpoint doanh nghiệp", en: "Enterprise endpoint" } },
  { value: "local-model", label: { vi: "Cục bộ / mô phỏng", en: "Local / Mock" } },
  { value: "no-ai", label: { vi: "Không dùng AI", en: "No-AI" } }
];

const dataUsageModeOptions: Array<{ value: DataUsageMode; label: Record<Locale, string> }> = [
  { value: "local-only", label: { vi: "Chỉ lưu cục bộ", en: "Local only" } },
  { value: "cloud-processing", label: { vi: "Xử lý qua đám mây", en: "Cloud processing" } },
  { value: "no-training", label: { vi: "Không dùng để huấn luyện", en: "No training" } },
  {
    value: "organization-private-learning",
    label: { vi: "Học riêng theo tổ chức", en: "Organization-private learning" }
  }
];

const modelCapabilityOptions: Array<{
  value: DefaultModelCapability;
  label: Record<Locale, string>;
}> = [
  { value: "basic", label: { vi: "Nhanh", en: "Fast" } },
  { value: "advanced", label: { vi: "Chuẩn", en: "Standard" } },
  { value: "reasoning", label: { vi: "Suy luận", en: "Reasoning" } }
];

const skillOverrideOptions: Array<{ id: AISkillOverrideId; label: Record<Locale, string> }> = [
  { id: "input-brief-to-ptr", label: { vi: "Input Brief sang PTR", en: "Input Brief to PTR" } },
  { id: "ai-process-qa", label: { vi: "QA / gợi ý quy trình", en: "Process QA / Recommendations" } },
  { id: "artifact-review", label: { vi: "Rà soát artifact D01/D02", en: "Artifact Review D01/D02" } },
  { id: "ai-template-review", label: { vi: "Rà soát mẫu", en: "Template Review" } },
  { id: "product-delivery", label: { vi: "Product Delivery", en: "Product Delivery" } },
  { id: "ai-handoff-pack", label: { vi: "AI Handoff Pack", en: "AI Handoff Pack" } }
];

const textByLocale = {
  vi: {
    title: "Trung tâm kết nối AI",
    description:
      "Chọn chế độ AI, kiểm tra kết nối và quản lý cấu hình không chứa secret.",
    save: "Lưu thiết lập",
    reset: "Đặt lại",
    test: "Kiểm tra kết nối",
    testing: "Đang kiểm tra...",
    status: "Trạng thái",
    selected: "Đang chọn",
    configured: "Đã cấu hình",
    missingEnv: "Thiếu env",
    disabled: "Đang tắt",
    available: "Khả dụng",
    dataWarning: "Cảnh báo dữ liệu",
    dataWarningBody:
      "AI đám mây chỉ chạy qua route phía máy chủ. Không nhập hoặc hiển thị API key trong trình duyệt.",
    currentMode: "Chế độ hiện tại",
    flags: "Cờ tính năng",
    serverProvider: "Nhà cung cấp phía máy chủ",
    dataMode: "Chế độ dữ liệu phía máy chủ",
    model: "Model",
    advanced: "Thiết lập nâng cao",
    show: "Hiện",
    hide: "Ẩn",
    defaultProvider: "Nhà cung cấp model nền",
    capability: "Năng lực",
    allowCloud: "Cho phép AI đám mây",
    requireApproval: "Yêu cầu phê duyệt",
    dataUsageMode: "Chế độ sử dụng dữ liệu",
    organizationNote: "Ghi chú tổ chức",
    organizationPlaceholder: "Ghi chú tenant/tổ chức tùy chọn",
    perSkillOverride: "Ghi đè theo kỹ năng",
    perSkillOverrideHelp: "Chỉ dùng khi một nhóm AI cần provider khác với chế độ mặc định.",
    inheritDefault: "Theo nhà cung cấp mặc định",
    saved: "Đã lưu tùy chọn không chứa secret vào localStorage.",
    resetDone: "Đã đặt lại về local/mô phỏng và chỉ lưu cục bộ.",
    changed: "Có thay đổi chưa lưu.",
    mockModeSummary: "Cục bộ/mô phỏng, không gọi nhà cung cấp bên ngoài.",
    realModeSummary: "AI thật qua nhà cung cấp đã chọn. Dữ liệu có thể được xử lý trên đám mây theo cấu hình phía máy chủ.",
    modelPlaceholder: "Tên hiển thị tùy chọn",
    effectiveProvider: "Nhà cung cấp thực thi",
    fallbackActive: "Fallback cục bộ/mô phỏng đang hoạt động vì nhà cung cấp đã chọn chưa sẵn sàng.",
    selectedStatus: "Trạng thái nhà cung cấp đã chọn",
    setupCta: "Cấu hình trong .env.local / server env",
    setupHint: "Không nhập hoặc lưu API key trong trình duyệt. Nhà cung cấp thật chỉ chạy qua route phía máy chủ.",
    localPreference: "Lựa chọn trong trình duyệt",
    serverSelected: "Server đang chọn",
    currentProvider: "Nhà cung cấp hiện tại",
    selectedProvider: "Nhà cung cấp đã chọn",
    browserProvider: "Nhà cung cấp trong trình duyệt",
    featureFlags: "Cờ tính năng",
    platformAdvancedHint:
      "AI do nền tảng cung cấp chạy qua cấu hình phía máy chủ. Gemini đang ở trạng thái sắp ra mắt nếu chưa có adapter thật.",
    yourAIAdvancedHint:
      "Với MVP, hãy cấu hình qua biến môi trường máy chủ. Giao diện BYOK bảo mật sẽ bổ sung sau. Hỗ trợ OpenAI API key, Anthropic API key hoặc endpoint doanh nghiệp qua máy chủ.",
    localAdvancedHint: "Chế độ cục bộ giữ fallback mô phỏng và không gọi nhà cung cấp bên ngoài.",
    geminiComingSoon: "Gemini (sắp ra mắt)"
  },
  en: {
    title: "AI Connection Center",
    description:
      "Choose an AI mode, test connection, and manage non-secret AI preferences.",
    save: "Save settings",
    reset: "Reset",
    test: "Test connection",
    testing: "Testing...",
    status: "Status",
    selected: "Selected",
    configured: "Configured",
    missingEnv: "Missing env",
    disabled: "Disabled",
    available: "Available",
    dataWarning: "Data warning",
    dataWarningBody:
      "Cloud AI only runs through the server-side route. API keys are never entered or displayed in the browser.",
    currentMode: "Current mode",
    flags: "Feature flags",
    serverProvider: "Server provider",
    dataMode: "Server data mode",
    model: "Model",
    advanced: "Advanced Settings",
    show: "Show",
    hide: "Hide",
    defaultProvider: "Underlying model provider",
    capability: "Capability",
    allowCloud: "Allow cloud AI",
    requireApproval: "Require approval",
    dataUsageMode: "Data usage mode",
    organizationNote: "Organization note",
    organizationPlaceholder: "Optional tenant or organization note",
    perSkillOverride: "Per-skill override",
    perSkillOverrideHelp: "Use only when a skill group needs a provider different from the default mode.",
    inheritDefault: "Use default provider",
    saved: "Saved non-secret preferences to localStorage.",
    resetDone: "Reset to local/mock and local-only.",
    changed: "Unsaved changes.",
    mockModeSummary: "Local/mock mode, no external provider call.",
    realModeSummary: "Real AI via the selected provider. Data may be processed in the cloud according to server configuration.",
    modelPlaceholder: "Optional display name only",
    effectiveProvider: "Effective provider",
    fallbackActive: "Local/mock fallback is active because the selected provider is not ready.",
    selectedStatus: "Selected provider status",
    setupCta: "Configure .env.local / server env",
    setupHint: "Do not enter or store API keys in the browser. Real providers run only through the server-side route.",
    localPreference: "Browser preference",
    serverSelected: "Server selected",
    currentProvider: "Current provider",
    selectedProvider: "Selected provider",
    browserProvider: "Browser provider",
    featureFlags: "Feature flags",
    platformAdvancedHint:
      "Platform Provided AI runs through server-side configuration. Gemini is shown as coming soon until a real adapter is available.",
    yourAIAdvancedHint:
      "Configure through server environment variables for MVP. Secure BYOK UI coming soon. Supports OpenAI API key, Anthropic API key, or enterprise endpoint through server env.",
    localAdvancedHint: "Local keeps the mock/local fallback and makes no external provider call.",
    geminiComingSoon: "Gemini (coming soon)"
  }
} satisfies Record<Locale, Record<string, string>>;

function getCardStatus(
  card: (typeof providerCards)[number],
  providerStatuses: ProviderStatusItem[],
  realAIEnabled: boolean
): ProviderDisplayStatus {
  if (card.id === "local") {
    return "available";
  }

  if (!realAIEnabled) {
    return "disabled";
  }

  const cloudStatuses = providerStatuses.filter((item) => item.providerId !== "mock");
  const configuredStatus = cloudStatuses.find((item) => item.status === "configured");

  return configuredStatus?.status ?? (realAIEnabled ? "missing env" : "disabled");
}

function getSelectedModeCardId(providerMode: ModelProvider): ProviderModeCardId {
  if (providerMode === "local-model" || providerMode === "no-ai") {
    return "local";
  }

  if (providerMode === "product-ai") {
    return "platform-provided-ai";
  }

  return "your-ai";
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

export function AIProviderSettingsPanel() {
  const [locale, setActiveLocale] = useState<Locale>("vi");
  const [settings, setSettings] = useState<AIProviderSettings>(
    defaultAIProviderSettings
  );
  const [message, setMessage] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [serverStatus, setServerStatus] = useState<AITrustStatusResponse>({});
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
      const data = (await response.json()) as AITrustStatusResponse;

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
  const providerStatuses = useMemo(
    () => serverStatus.providers ?? [],
    [serverStatus.providers]
  );
  const aiTrustSummary = getAITrustSummary(serverStatus, locale);
  const selectedBrowserProvider =
    modelProviderOptions.find((option) => option.value === settings.providerMode)
      ?.label[locale] ?? settings.providerMode;
  const currentServerModel =
    serverStatus.model ??
    providerStatuses.find((provider) => provider.providerId === selectedServerProvider)
      ?.model ??
    settings.modelName ??
    "n/a";
  const selectedModeCardId = getSelectedModeCardId(settings.providerMode);

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
    updateSettings({
      ...settings,
      providerMode,
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
        error instanceof Error
          ? error.message
          : locale === "vi"
            ? "Kiểm tra kết nối thất bại."
            : "Connection test failed."
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

    updateSettings({
      ...settings,
      perSkillProviderOverrides: nextOverrides
    });
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
      <div className="grid gap-3 md:grid-cols-3">
        {providerCards.map((card) => {
          const status = getCardStatus(card, providerStatuses, realAIEnabled);
          const isSelected = selectedModeCardId === card.id;
          const selectedClass =
            status === "missing env"
              ? "border-amber-400 bg-amber-50 ring-2 ring-amber-100"
              : "border-violet-500 bg-violet-50 ring-2 ring-violet-100";
          const statusClass =
            status === "configured" || status === "available"
              ? "text-emerald-700"
              : status === "missing env"
                ? "text-amber-700"
                : "text-slate-500";

          return (
            <button
              className={`min-h-40 rounded border p-4 text-left transition ${
                isSelected
                  ? selectedClass
                  : "border-slate-200 bg-white hover:border-slate-400"
              }`}
              key={card.id}
              onClick={() => selectProvider(card.providerMode)}
              type="button"
            >
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-950">
                    {card.title}
                  </span>
                  {isSelected ? (
                    <span className="mt-1 block text-xs font-semibold text-violet-700">
                      ✓ {text.currentProvider}
                    </span>
                  ) : null}
                </span>
                <span className={`shrink-0 text-xs font-semibold ${statusClass}`}>
                  {getStatusText(status, locale)}
                </span>
              </span>
              <span className="mt-3 block text-sm leading-6 text-slate-600">
                {card.description[locale]}
              </span>
              <span className="mt-2 block text-xs leading-5 text-slate-500">
                {card.detail[locale]}
              </span>
              {isSelected ? (
                status === "missing env" ? (
                <span className="mt-3 block text-xs font-semibold text-amber-800">
                  {text.setupCta}
                </span>
                ) : null
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">{text.dataWarning}</p>
        <p className="mt-1">{text.dataWarningBody}</p>
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
          <div className="border-t border-slate-200 p-4">
            <div className="mb-4 rounded border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 text-sm md:grid-cols-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {text.currentMode}
                  </p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {aiTrustSummary.modeLabel}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {text.browserProvider}
                  </p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {selectedBrowserProvider}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {text.serverProvider}
                  </p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {formatAIProviderName(selectedServerProvider, locale)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {text.effectiveProvider}: {aiTrustSummary.effectiveProviderLabel}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {text.dataMode}
                  </p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {aiTrustSummary.dataModeLabel}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {text.model}
                  </p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {currentServerModel}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {text.featureFlags}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-700">
                    ENABLE_REAL_AI={String(serverStatus.realAIEnabled === true)}
                    <br />
                    ENABLE_REAL_AI_QA={String(serverStatus.realAIQAEnabled === true)}
                    <br />
                    ENABLE_REAL_AI_TEMPLATE_REVIEW={String(serverStatus.realAITemplateReviewEnabled === true)}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <AITrustStatus locale={locale} status={serverStatus} />
              </div>
              {serverStatus.displayStatus === "missing env" ? (
                <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                  {text.setupHint}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="lg:col-span-2 rounded border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                <p>{text.platformAdvancedHint}</p>
                <p className="mt-1">{text.yourAIAdvancedHint}</p>
                <p className="mt-1">{text.localAdvancedHint}</p>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  {text.defaultProvider}
                </span>
                <select
                  className="mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                  onChange={(event) =>
                    updateSettings({
                      ...settings,
                      providerMode: event.target.value as ModelProvider
                    })
                  }
                  value={settings.providerMode}
                >
                  {modelProviderOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label[locale]}
                    </option>
                  ))}
                  <option disabled value="gemini-coming-soon">
                    {text.geminiComingSoon}
                  </option>
                </select>
              </label>

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
                      {option.label[locale]}
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
                  onChange={(event) =>
                    updateSettings({
                      ...settings,
                      defaultModelCapability: event.target
                        .value as DefaultModelCapability
                    })
                  }
                  value={settings.defaultModelCapability}
                >
                  {modelCapabilityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label[locale]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  {text.model}
                </span>
                <input
                  className="mt-2 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800"
                  onChange={(event) =>
                    updateSettings({
                      ...settings,
                      modelName: event.target.value
                    })
                  }
                  aria-label={text.model}
                  placeholder={text.modelPlaceholder}
                  type="text"
                  value={settings.modelName ?? ""}
                />
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

              <details className="lg:col-span-2 rounded border border-slate-200 bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                  {text.perSkillOverride}
                </summary>
                <p className="mt-2 text-xs leading-5 text-slate-600">
                  {text.perSkillOverrideHelp}
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {skillOverrideOptions.map((skill) => (
                    <label className="block" key={skill.id}>
                      <span className="text-xs font-semibold text-slate-600">
                        {skill.label[locale]}
                      </span>
                      <select
                        className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
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
                            {option.label[locale]}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </details>
            </div>
          </div>
        ) : null}
      </div>

      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
    </SessionFrame>
  );
}
