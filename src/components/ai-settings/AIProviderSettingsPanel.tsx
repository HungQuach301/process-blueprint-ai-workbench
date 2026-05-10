"use client";

import { useEffect, useState } from "react";
import { SessionFrame } from "@/components/layout/SessionFrame";
import {
  AI_PROVIDER_SETTINGS_STORAGE_KEY,
  defaultAIProviderSettings,
  readAIProviderSettings
} from "@/lib/ai/ai-governance";
import type {
  AIProviderSettings,
  DataUsageMode,
  DefaultModelCapability,
  ModelProvider
} from "@/lib/ai/model-provider-types";
import { getLocale, type Locale } from "@/lib/i18n";

const LOCALE_EVENT = "process-blueprint-locale-change";

const modelProviderOptions: Array<{
  value: ModelProvider;
  label: string;
}> = [
  { value: "product-ai", label: "Product AI" },
  { value: "openai-byok", label: "OpenAI" },
  { value: "claude-byok", label: "Claude" },
  { value: "azure-openai", label: "Azure OpenAI" },
  { value: "local-model", label: "Local / Enterprise AI" },
  { value: "no-ai", label: "No-AI" }
];

const dataUsageModeOptions: Array<{
  value: DataUsageMode;
  label: string;
}> = [
  { value: "local-only", label: "Local only" },
  { value: "cloud-processing", label: "Cloud processing" },
  { value: "no-training", label: "No training" },
  {
    value: "organization-private-learning",
    label: "Organization-private learning"
  }
];

const modelCapabilityOptions: Array<{
  value: DefaultModelCapability;
  label: string;
}> = [
  { value: "basic", label: "Basic" },
  { value: "advanced", label: "Advanced" },
  { value: "reasoning", label: "Reasoning" }
];

const usageModeCards: Array<{
  providerMode: ModelProvider;
  title: string;
  description: Record<Locale, string>;
  status: "available" | "coming-soon";
}> = [
  {
    providerMode: "product-ai",
    title: "Product AI",
    description: {
      vi: "Chế độ AI do sản phẩm quản lý cho workflow hosted trong tương lai.",
      en: "Managed product AI mode for future hosted workflows."
    },
    status: "coming-soon"
  },
  {
    providerMode: "openai-byok",
    title: "OpenAI",
    description: {
      vi: "Kết nối OpenAI qua server-side route, được kiểm soát bằng feature flag hiện có.",
      en: "Server-side OpenAI provider path controlled by existing feature flags."
    },
    status: "available"
  },
  {
    providerMode: "claude-byok",
    title: "Claude",
    description: {
      vi: "Chế độ Claude BYOK được chuẩn bị cho provider adapter ở phase sau.",
      en: "Claude BYOK mode is planned for a later provider adapter."
    },
    status: "coming-soon"
  },
  {
    providerMode: "local-model",
    title: "Local / Enterprise AI",
    description: {
      vi: "Chế độ model local hoặc endpoint doanh nghiệp cho triển khai có governance.",
      en: "Local model or enterprise endpoint mode for future governed deployments."
    },
    status: "coming-soon"
  }
];

const aiConnectionText = {
  vi: {
    title: "Trung tâm kết nối AI",
    description: "Chọn cách kết nối AI cho draft, QA và template review. UI chỉ lưu cấu hình không nhạy cảm.",
    reset: "Reset",
    save: "Lưu thiết lập",
    available: "Khả dụng",
    comingSoon: "Sắp có",
    dataWarning: "Cảnh báo dữ liệu",
    dataWarningBody: "Dữ liệu có thể được gửi tới provider AI đã cấu hình khi bật xử lý cloud. Hãy kiểm tra chính sách dữ liệu trước khi tiếp tục.",
    noBrowserKeys: "Không nhập hoặc lưu API key trong giao diện trình duyệt. Key thật phải nằm ở server-side.",
    currentAiMode: "Chế độ AI hiện tại",
    realAIFlagsEnabled: "Real AI đang bật",
    mockLocalFallback: "Mock/local fallback",
    environmentStatus: "Trạng thái môi trường",
    serverProviderConfigured: "Provider server đã cấu hình",
    serverProviderNotConfigured: "Provider server chưa cấu hình",
    defaultModelCapability: "Năng lực model mặc định",
    advancedSettings: "Thiết lập nâng cao",
    hide: "Ẩn",
    show: "Hiện",
    providerMode: "Chế độ provider",
    dataUsageMode: "Chế độ dùng dữ liệu",
    status: "Trạng thái",
    provider: "Provider",
    model: "Model",
    notSet: "Chưa thiết lập",
    flags: "Feature flags",
    allowCloudAI: "Cho phép Cloud AI",
    allowCloudAIHelper: "Cho phép workflow AI đã bật gửi dữ liệu tới provider server-side đã cấu hình.",
    requireApproval: "Bắt buộc phê duyệt",
    requireApprovalHelper: "Output AI vẫn ở dạng draft, recommendation hoặc review trước khi Apply.",
    organizationNote: "Ghi chú tổ chức",
    organizationPlaceholder: "Ghi chú tổ chức hoặc tenant tùy chọn.",
    changed: "Có thay đổi chưa lưu.",
    saved: "Đã lưu cấu hình AI vào localStorage. Không lưu API key và không gọi external API.",
    resetDone: "Đã reset Trung tâm kết nối AI về No-AI và Local only."
  },
  en: {
    title: "AI Connection Center",
    description: "Choose how AI connects for draft, QA, and template review. This UI only stores non-secret preferences.",
    reset: "Reset",
    save: "Save settings",
    available: "Available",
    comingSoon: "Coming soon",
    dataWarning: "Data warning",
    dataWarningBody: "Data may be sent to the configured AI provider when cloud processing is enabled. Review your data policy before continuing.",
    noBrowserKeys: "Do not enter or store API keys in this browser UI. Real provider keys must remain server-side.",
    currentAiMode: "Current AI mode",
    realAIFlagsEnabled: "Real AI flags enabled",
    mockLocalFallback: "Mock/local fallback",
    environmentStatus: "Environment status",
    serverProviderConfigured: "Server provider configured",
    serverProviderNotConfigured: "Server provider not configured",
    defaultModelCapability: "Default model capability",
    advancedSettings: "Advanced Settings",
    hide: "Hide",
    show: "Show",
    providerMode: "Provider mode",
    dataUsageMode: "Data usage mode",
    status: "Status",
    provider: "Provider",
    model: "Model",
    notSet: "Not set",
    flags: "Flags",
    allowCloudAI: "Allow Cloud AI",
    allowCloudAIHelper: "Allow enabled AI workflows to send data to the configured server-side provider.",
    requireApproval: "Require approval",
    requireApprovalHelper: "AI output stays in draft, recommendation, or review before Apply.",
    organizationNote: "Organization note",
    organizationPlaceholder: "Optional organization or tenant note.",
    changed: "Unsaved changes.",
    saved: "Saved AI connection preferences to localStorage. No API key is stored and no external API is called.",
    resetDone: "Reset AI Connection Center to No-AI and Local only."
  }
} satisfies Record<Locale, Record<string, string>>;

type FeatureFlagState = {
  enableRealAI: boolean;
  enableRealAIQA: boolean;
  enableRealAITemplateReview: boolean;
};

export function AIProviderSettingsPanel() {
  const [locale, setActiveLocale] = useState<Locale>("vi");
  const [settings, setSettings] = useState<AIProviderSettings>(
    defaultAIProviderSettings
  );
  const [message, setMessage] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [realAIEnabled, setRealAIEnabled] = useState(false);
  const [providerStatus, setProviderStatus] =
    useState<"configured" | "not configured" | "mock-only">("mock-only");
  const [environmentProvider, setEnvironmentProvider] = useState("");
  const [environmentModel, setEnvironmentModel] = useState("");
  const [featureFlags, setFeatureFlags] = useState<FeatureFlagState>({
    enableRealAI: false,
    enableRealAIQA: false,
    enableRealAITemplateReview: false
  });

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

  useEffect(() => {
    let active = true;

    async function loadAIMode() {
      try {
        const response = await fetch("/api/ai/run-skill", {
          method: "GET"
        });
        const data = (await response.json()) as {
          realAIEnabled?: boolean;
          realAIQAEnabled?: boolean;
          realAITemplateReviewEnabled?: boolean;
          providerStatus?: "configured" | "not configured" | "mock-only";
          provider?: string;
          model?: string;
        };

        if (active) {
          setRealAIEnabled(
            data.realAIEnabled === true ||
              data.realAIQAEnabled === true ||
              data.realAITemplateReviewEnabled === true
          );
          setProviderStatus(data.providerStatus ?? "mock-only");
          setEnvironmentProvider(data.provider ?? "");
          setEnvironmentModel(data.model ?? "");
          setFeatureFlags({
            enableRealAI: data.realAIEnabled === true,
            enableRealAIQA: data.realAIQAEnabled === true,
            enableRealAITemplateReview:
              data.realAITemplateReviewEnabled === true
          });
        }
      } catch {
        if (active) {
          setRealAIEnabled(false);
          setProviderStatus("mock-only");
          setEnvironmentProvider("");
          setEnvironmentModel("");
          setFeatureFlags({
            enableRealAI: false,
            enableRealAIQA: false,
            enableRealAITemplateReview: false
          });
        }
      }
    }

    loadAIMode();

    return () => {
      active = false;
    };
  }, []);

  function updateSettings(nextSettings: AIProviderSettings) {
    setSettings(nextSettings);
    setMessage(aiConnectionText[locale].changed);
  }

  function saveSettings() {
    const nonSecretSettings: AIProviderSettings = {
      providerMode: settings.providerMode,
      dataUsageMode: settings.dataUsageMode,
      defaultModelCapability: settings.defaultModelCapability,
      allowCloudAI: settings.allowCloudAI,
      requireApprovalForAIOutput: settings.requireApprovalForAIOutput,
      modelName: settings.modelName,
      organizationId: settings.organizationId,
      tenantId: settings.tenantId
    };

    window.localStorage.setItem(
      AI_PROVIDER_SETTINGS_STORAGE_KEY,
      JSON.stringify(nonSecretSettings)
    );
    setMessage(aiConnectionText[locale].saved);
  }

  function resetSettings() {
    setSettings(defaultAIProviderSettings);
    window.localStorage.removeItem(AI_PROVIDER_SETTINGS_STORAGE_KEY);
    setMessage(aiConnectionText[locale].resetDone);
  }

  function selectUsageMode(providerMode: ModelProvider) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      providerMode,
      dataUsageMode:
        providerMode === "no-ai" || providerMode === "local-model"
          ? "local-only"
          : currentSettings.dataUsageMode,
      allowCloudAI:
        providerMode === "openai-byok" ? currentSettings.allowCloudAI : false
    }));
    setMessage(aiConnectionText[locale].changed);
  }

  const text = aiConnectionText[locale];
  const configuredModelLabel =
    environmentModel ||
    settings.modelName ||
    (locale === "vi" ? "Theo năng lực / chưa thiết lập" : "Capability-based / not set");
  const environmentStatusLabel =
    providerStatus === "mock-only"
      ? text.mockLocalFallback
      : providerStatus === "configured"
        ? text.serverProviderConfigured
        : text.serverProviderNotConfigured;

  return (
    <SessionFrame
      actions={
        <>
          <button
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={resetSettings}
            type="button"
          >
            {text.reset}
          </button>
          <button
            className="rounded bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
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
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {usageModeCards.map((card) => {
          const isSelected = settings.providerMode === card.providerMode;
          const isDisabled = card.status === "coming-soon";

          return (
            <button
              className={`min-h-40 rounded border p-4 text-left transition ${
                isSelected
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-800 hover:border-slate-400"
              } ${isDisabled ? "cursor-not-allowed opacity-60" : ""}`}
              disabled={isDisabled}
              key={card.providerMode}
              onClick={() => selectUsageMode(card.providerMode)}
              type="button"
            >
              <span className="block text-sm font-semibold">{card.title}</span>
              <span
                className={`mt-2 inline-flex rounded border px-2 py-1 text-xs font-semibold ${
                  isSelected
                    ? "border-white/30 bg-white/10 text-white"
                    : card.status === "available"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                {card.status === "available" ? text.available : text.comingSoon}
              </span>
              <span
                className={`mt-3 block text-sm leading-6 ${
                  isSelected ? "text-slate-200" : "text-slate-600"
                }`}
              >
                {card.description[locale]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">{text.dataWarning}</p>
        <p className="mt-1">{text.dataWarningBody}</p>
        <p className="mt-1">{text.noBrowserKeys}</p>
      </div>

      <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-4">
        <div className="grid gap-3 text-sm md:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">
              {text.currentAiMode}
            </p>
            <p className="mt-1 font-semibold text-slate-950">
              {realAIEnabled ? text.realAIFlagsEnabled : text.mockLocalFallback}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">
              {text.environmentStatus}
            </p>
            <p className="mt-1 font-semibold text-slate-950">
              {environmentStatusLabel}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">
              {text.defaultModelCapability}
            </p>
            <p className="mt-1 font-semibold text-slate-950">
              {settings.defaultModelCapability}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded border border-slate-200 bg-white">
        <button
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-950 hover:bg-slate-50"
          onClick={() => setAdvancedOpen((isOpen) => !isOpen)}
          type="button"
        >
          <span>{text.advancedSettings}</span>
          <span className="text-xs text-slate-500">
            {advancedOpen ? text.hide : text.show}
          </span>
        </button>

        {advancedOpen ? (
          <div className="border-t border-slate-200 p-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  {text.providerMode}
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
                      {option.label} ({option.value})
                    </option>
                  ))}
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
                      {option.label} ({option.value})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  {text.defaultModelCapability}
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
                      {option.label} ({option.value})
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-semibold text-slate-900">
                  {text.environmentStatus}
                </p>
                <p className="mt-1 text-slate-600">
                  {text.status}: {environmentStatusLabel}
                </p>
                <p className="mt-1 text-slate-600">
                  {text.provider}: {environmentProvider || text.notSet}
                </p>
                <p className="mt-1 text-slate-600">
                  {text.model}: {configuredModelLabel}
                </p>
                <p className="mt-1 text-slate-600">
                  {text.flags}: ENABLE_REAL_AI={String(featureFlags.enableRealAI)}, ENABLE_REAL_AI_QA={String(featureFlags.enableRealAIQA)}, ENABLE_REAL_AI_TEMPLATE_REVIEW={String(featureFlags.enableRealAITemplateReview)}
                </p>
              </div>

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
                <span>
                  <span className="block font-medium text-slate-900">
                    {text.allowCloudAI}
                  </span>
                  <span className="mt-1 block text-slate-600">
                    {text.allowCloudAIHelper}
                  </span>
                </span>
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
                <span>
                  <span className="block font-medium text-slate-900">
                    {text.requireApproval}
                  </span>
                  <span className="mt-1 block text-slate-600">
                    {text.requireApprovalHelper}
                  </span>
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
          </div>
        ) : null}
      </div>

      {message ? (
        <p className="mt-3 text-sm text-slate-600">{message}</p>
      ) : null}
    </SessionFrame>
  );
}
