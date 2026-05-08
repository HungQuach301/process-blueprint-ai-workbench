"use client";

import { useEffect, useState } from "react";
import { SessionFrame } from "@/components/layout/SessionFrame";
import type {
  AIProviderSettings,
  DataUsageMode,
  ModelProvider
} from "@/lib/ai/model-provider-types";

const STORAGE_KEY = "process-blueprint-ai-workbench:ai-provider-settings";

const modelProviderOptions: Array<{
  value: ModelProvider;
  label: string;
}> = [
  { value: "product-ai", label: "Product AI" },
  { value: "openai-byok", label: "OpenAI BYOK" },
  { value: "claude-byok", label: "Claude BYOK" },
  { value: "azure-openai", label: "Azure OpenAI" },
  { value: "local-model", label: "Local Model" },
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

const defaultSettings: AIProviderSettings = {
  provider: "no-ai",
  dataUsageMode: "local-only",
  modelName: "",
  organizationId: "",
  tenantId: ""
};

function isModelProvider(value: unknown): value is ModelProvider {
  return modelProviderOptions.some((option) => option.value === value);
}

function isDataUsageMode(value: unknown): value is DataUsageMode {
  return dataUsageModeOptions.some((option) => option.value === value);
}

function readSavedSettings() {
  const savedSettings = window.localStorage.getItem(STORAGE_KEY);

  if (!savedSettings) {
    return defaultSettings;
  }

  try {
    const parsedSettings = JSON.parse(savedSettings);

    return {
      ...defaultSettings,
      ...parsedSettings,
      provider: isModelProvider(parsedSettings?.provider)
        ? parsedSettings.provider
        : defaultSettings.provider,
      dataUsageMode: isDataUsageMode(parsedSettings?.dataUsageMode)
        ? parsedSettings.dataUsageMode
        : defaultSettings.dataUsageMode
    };
  } catch {
    return defaultSettings;
  }
}

export function AIProviderSettingsPanel() {
  const [settings, setSettings] = useState<AIProviderSettings>(defaultSettings);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setSettings(readSavedSettings());
  }, []);

  function updateSettings(nextSettings: AIProviderSettings) {
    setSettings(nextSettings);
    setMessage("Có thay đổi chưa lưu.");
  }

  function saveSettings() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setMessage("Đã lưu AI provider settings vào localStorage. Chưa có API call nào được thực hiện.");
  }

  function resetSettings() {
    setSettings(defaultSettings);
    window.localStorage.removeItem(STORAGE_KEY);
    setMessage("Đã reset AI provider settings về No-AI / Local only.");
  }

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
      description="Scaffold cấu hình provider/data mode cho các AI workflow tương lai. Panel này chỉ lưu localStorage và không gọi external API."
      title="AI Provider Settings"
    >
      <div id="ai-settings" className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Do not enter production secrets in local MVP. API key thật chưa được hỗ trợ và không nên lưu trong localStorage.
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Model provider mode
          </span>
          <select
            className="mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
            onChange={(event) =>
              updateSettings({
                ...settings,
                provider: event.target.value as ModelProvider
              })
            }
            value={settings.provider}
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
            Model name placeholder
          </span>
          <input
            className="mt-2 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800"
            onChange={(event) =>
              updateSettings({
                ...settings,
                modelName: event.target.value
              })
            }
            placeholder="Example: local-mock-model"
            type="text"
            value={settings.modelName ?? ""}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Placeholder only, not an API key
          </span>
          <input
            className="mt-2 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800"
            onChange={(event) =>
              updateSettings({
                ...settings,
                organizationId: event.target.value
              })
            }
            placeholder="Optional organization/tenant note"
            type="text"
            value={settings.organizationId ?? ""}
          />
        </label>
      </div>

      <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        Current selection: provider <span className="font-semibold">{settings.provider}</span>, data mode{" "}
        <span className="font-semibold">{settings.dataUsageMode}</span>. No external API call is made by this settings scaffold.
      </div>

      {message ? (
        <p className="mt-3 text-sm text-slate-600">{message}</p>
      ) : null}
    </SessionFrame>
  );
}
