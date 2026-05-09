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

const modelCapabilityOptions: Array<{
  value: DefaultModelCapability;
  label: string;
}> = [
  { value: "basic", label: "Basic" },
  { value: "advanced", label: "Advanced" },
  { value: "reasoning", label: "Reasoning" }
];

export function AIProviderSettingsPanel() {
  const [settings, setSettings] = useState<AIProviderSettings>(
    defaultAIProviderSettings
  );
  const [message, setMessage] = useState("");
  const [realAIEnabled, setRealAIEnabled] = useState(false);
  const [providerStatus, setProviderStatus] =
    useState<"configured" | "not configured" | "mock-only">("mock-only");

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
        };

        if (active) {
          setRealAIEnabled(
            data.realAIEnabled === true ||
              data.realAIQAEnabled === true ||
              data.realAITemplateReviewEnabled === true
          );
          setProviderStatus(data.providerStatus ?? "mock-only");
        }
      } catch {
        if (active) {
          setRealAIEnabled(false);
          setProviderStatus("mock-only");
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
    setMessage("Có thay đổi chưa lưu.");
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
    setMessage("Đã lưu AI provider settings vào localStorage. Chưa có API call nào được thực hiện.");
  }

  function resetSettings() {
    setSettings(defaultAIProviderSettings);
    window.localStorage.removeItem(AI_PROVIDER_SETTINGS_STORAGE_KEY);
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

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Current AI mode
          </p>
          <p className="mt-1 font-semibold text-slate-950">
            {realAIEnabled ? "Real AI" : "Mock AI"}
          </p>
        </div>
        <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Data usage mode
          </p>
          <p className="mt-1 font-semibold text-slate-950">
            {settings.dataUsageMode}
          </p>
        </div>
        <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Model provider mode
          </p>
          <p className="mt-1 font-semibold text-slate-950">
            {settings.providerMode}
          </p>
        </div>
        <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Environment status
          </p>
          <p className="mt-1 font-semibold text-slate-950">
            {providerStatus}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
        <p>{AI_GOVERNANCE_NOTICE}</p>
        <p className="mt-1">
          Do not enter production secrets in local MVP. API keys should be server-side only.
        </p>
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
              Cho phép workflow AI đã bật flag gửi dữ liệu tới provider server-side.
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
              Require approval for AI output
            </span>
            <span className="mt-1 block text-slate-600">
              AI output vẫn đi qua draft/recommendation/review trước khi Apply.
            </span>
          </span>
        </label>
      </div>

      <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        Current selection: provider{" "}
        <span className="font-semibold">{settings.providerMode}</span>, data mode{" "}
        <span className="font-semibold">{settings.dataUsageMode}</span>, capability{" "}
        <span className="font-semibold">{settings.defaultModelCapability}</span>. No API key is stored in localStorage.
      </div>

      {message ? (
        <p className="mt-3 text-sm text-slate-600">{message}</p>
      ) : null}
    </SessionFrame>
  );
}
