"use client";

import { useEffect, useState } from "react";
import { SessionFrame } from "@/components/layout/SessionFrame";
import {
  AI_GOVERNANCE_NOTICE,
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
  description: string;
  status: "available" | "coming-soon";
}> = [
  {
    providerMode: "product-ai",
    title: "Product AI",
    description: "Managed product AI mode for future hosted workflows.",
    status: "coming-soon"
  },
  {
    providerMode: "openai-byok",
    title: "OpenAI",
    description: "Server-side OpenAI provider path controlled by existing feature flags.",
    status: "available"
  },
  {
    providerMode: "claude-byok",
    title: "Claude",
    description: "Claude BYOK mode is planned for a later provider adapter.",
    status: "coming-soon"
  },
  {
    providerMode: "local-model",
    title: "Local / Enterprise AI",
    description: "Local model or enterprise endpoint mode for future governed deployments.",
    status: "coming-soon"
  }
];

type FeatureFlagState = {
  enableRealAI: boolean;
  enableRealAIQA: boolean;
  enableRealAITemplateReview: boolean;
};

export function AIProviderSettingsPanel() {
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
    setMessage("Co thay doi chua luu.");
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
    setMessage(
      "Da luu AI connection preferences vao localStorage. Khong luu API key va khong goi external API."
    );
  }

  function resetSettings() {
    setSettings(defaultAIProviderSettings);
    window.localStorage.removeItem(AI_PROVIDER_SETTINGS_STORAGE_KEY);
    setMessage("Da reset AI Connection Center ve No-AI / Local only.");
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
    setMessage("Co thay doi chua luu.");
  }

  const configuredModelLabel =
    environmentModel || settings.modelName || "Capability-based / not set";
  const environmentStatusLabel =
    providerStatus === "mock-only"
      ? "Mock/local fallback"
      : providerStatus === "configured"
        ? "Server provider configured"
        : "Server provider not configured";

  return (
    <SessionFrame
      actions={
        <>
          <button
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={resetSettings}
            type="button"
          >
            Reset
          </button>
          <button
            className="rounded bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            onClick={saveSettings}
            type="button"
          >
            Save Settings
          </button>
        </>
      }
      bodyClassName="p-4"
      description="Chon cach ket noi AI cho draft, QA va template review. API keys phai o server-side; UI nay chi hien thi trang thai va luu non-secret preferences."
      title="AI Connection Center / Trung tâm kết nối AI"
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
                {card.status === "available" ? "Available" : "Coming soon"}
              </span>
              <span
                className={`mt-3 block text-sm leading-6 ${
                  isSelected ? "text-slate-200" : "text-slate-600"
                }`}
              >
                {card.description}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">Data warning</p>
        <p className="mt-1">{AI_GOVERNANCE_NOTICE}</p>
        <p className="mt-1">
          Do not enter or store API keys in this browser UI. Real provider keys must remain server-side.
        </p>
      </div>

      <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-4">
        <div className="grid gap-3 text-sm md:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">
              Current AI mode
            </p>
            <p className="mt-1 font-semibold text-slate-950">
              {realAIEnabled ? "Real AI flags enabled" : "Mock/local fallback"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">
              Environment status
            </p>
            <p className="mt-1 font-semibold text-slate-950">
              {environmentStatusLabel}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">
              Default model capability
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
          <span>Advanced Settings</span>
          <span className="text-xs text-slate-500">
            {advancedOpen ? "Hide" : "Show"}
          </span>
        </button>

        {advancedOpen ? (
          <div className="border-t border-slate-200 p-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Provider mode
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
                  Data usage mode
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
                  Default model capability
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
                  Environment status
                </p>
                <p className="mt-1 text-slate-600">
                  Status: {environmentStatusLabel}
                </p>
                <p className="mt-1 text-slate-600">
                  Provider: {environmentProvider || "Not set"}
                </p>
                <p className="mt-1 text-slate-600">
                  Model: {configuredModelLabel}
                </p>
                <p className="mt-1 text-slate-600">
                  Flags: ENABLE_REAL_AI={String(featureFlags.enableRealAI)}, ENABLE_REAL_AI_QA={String(featureFlags.enableRealAIQA)}, ENABLE_REAL_AI_TEMPLATE_REVIEW={String(featureFlags.enableRealAITemplateReview)}
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
                    Allow Cloud AI
                  </span>
                  <span className="mt-1 block text-slate-600">
                    Allow enabled AI workflows to send data to the configured server-side provider.
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
                    Require approval
                  </span>
                  <span className="mt-1 block text-slate-600">
                    AI output stays in draft, recommendation, or review before Apply.
                  </span>
                </span>
              </label>

              <label className="block lg:col-span-2">
                <span className="text-sm font-medium text-slate-700">
                  Organization note
                </span>
                <input
                  className="mt-2 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800"
                  onChange={(event) =>
                    updateSettings({
                      ...settings,
                      organizationId: event.target.value
                    })
                  }
                  placeholder="Optional organization or tenant note. Do not enter API keys."
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
