"use client";

import type { Locale } from "@/lib/i18n";
import type { DataUsageMode } from "@/lib/ai/model-provider-types";

export type ProviderDisplayStatus =
  | "configured"
  | "missing env"
  | "disabled"
  | "available";

export type ServerProviderId = "product-ai" | "openai" | "claude" | "mock";

export type ProviderStatusItem = {
  providerId: ServerProviderId;
  status: ProviderDisplayStatus;
  selected: boolean;
  model: string;
};

export type AITrustStatusResponse = {
  realAIEnabled?: boolean;
  realAIQAEnabled?: boolean;
  realAITemplateReviewEnabled?: boolean;
  providerStatus?: "configured" | "not configured" | "mock-only";
  displayStatus?: ProviderDisplayStatus;
  provider?: ServerProviderId;
  effectiveProvider?: ServerProviderId;
  fallbackActive?: boolean;
  providers?: ProviderStatusItem[];
  dataUsageMode?: DataUsageMode | string;
  model?: string;
};

const textByLocale = {
  vi: {
    mode: "Chế độ",
    mockMode: "Mock / local",
    realMode: "Real AI",
    provider: "Provider",
    selectedProvider: "Provider đã chọn",
    effectiveProvider: "Provider thực thi",
    dataMode: "Data mode",
    externalCall: "Có thể gọi ra ngoài",
    yes: "Có",
    no: "Không",
    localOnly: "local-only",
    noTraining: "no-training",
    cloudProcessing: "cloud-processing",
    privateLearning: "organization-private-learning",
    fallback:
      "Đang fallback về Local Mock vì provider đã chọn chưa sẵn sàng hoặc real AI đang tắt.",
    missingEnv:
      "Provider đã chọn thiếu server env. Cấu hình trong .env.local/server env, không nhập API key trong browser.",
    disabled:
      "Real AI feature flags đang tắt. App dùng mock/local fallback.",
    externalSafe:
      "Không có external provider call trong trạng thái hiện tại.",
    externalPossible:
      "Dữ liệu có thể rời app nếu user xác nhận cloud AI và server provider đã cấu hình."
  },
  en: {
    mode: "Mode",
    mockMode: "Mock / local",
    realMode: "Real AI",
    provider: "Provider",
    selectedProvider: "Selected provider",
    effectiveProvider: "Effective provider",
    dataMode: "Data mode",
    externalCall: "External call possible",
    yes: "Yes",
    no: "No",
    localOnly: "local-only",
    noTraining: "no-training",
    cloudProcessing: "cloud-processing",
    privateLearning: "organization-private-learning",
    fallback:
      "Local Mock fallback is active because the selected provider is not ready or real AI is disabled.",
    missingEnv:
      "The selected provider is missing server env. Configure .env.local/server env; do not enter API keys in the browser.",
    disabled:
      "Real AI feature flags are disabled. The app uses mock/local fallback.",
    externalSafe:
      "No external provider call is possible in the current state.",
    externalPossible:
      "Data may leave the app only after cloud AI consent and a configured server provider."
  }
} satisfies Record<Locale, Record<string, string>>;

function hasRealAI(status: AITrustStatusResponse) {
  return (
    status.realAIEnabled === true ||
    status.realAIQAEnabled === true ||
    status.realAITemplateReviewEnabled === true
  );
}

export function formatAIProviderName(provider: string | undefined) {
  if (provider === "product-ai") {
    return "Product AI";
  }

  if (provider === "openai") {
    return "OpenAI";
  }

  if (provider === "claude") {
    return "Claude";
  }

  return "Local Mock";
}

export function getAITrustSummary(status: AITrustStatusResponse, locale: Locale) {
  const text = textByLocale[locale];
  const selectedProvider = status.provider ?? "mock";
  const effectiveProvider = status.effectiveProvider ?? selectedProvider;
  const realMode = hasRealAI(status) && !status.fallbackActive;
  const selectedStatus =
    status.displayStatus ??
    status.providers?.find((provider) => provider.providerId === selectedProvider)
      ?.status;
  const dataMode = status.dataUsageMode ?? "local-only";
  const externalCallPossible =
    realMode &&
    effectiveProvider !== "mock" &&
    selectedStatus === "configured" &&
    dataMode !== "local-only";

  return {
    modeLabel: realMode ? text.realMode : text.mockMode,
    selectedProviderLabel: formatAIProviderName(selectedProvider),
    effectiveProviderLabel: formatAIProviderName(effectiveProvider),
    dataModeLabel:
      dataMode === "cloud-processing"
        ? text.cloudProcessing
        : dataMode === "no-training"
          ? text.noTraining
          : dataMode === "organization-private-learning"
            ? text.privateLearning
            : text.localOnly,
    externalCallPossible,
    externalCallLabel: externalCallPossible ? text.yes : text.no,
    selectedStatus,
    note:
      status.fallbackActive
        ? text.fallback
        : selectedStatus === "missing env"
          ? text.missingEnv
          : selectedStatus === "disabled"
            ? text.disabled
            : externalCallPossible
              ? text.externalPossible
              : text.externalSafe
  };
}

type AITrustStatusProps = {
  status: AITrustStatusResponse;
  locale: Locale;
  compact?: boolean;
};

export function AITrustStatus({ status, locale, compact = false }: AITrustStatusProps) {
  const text = textByLocale[locale];
  const summary = getAITrustSummary(status, locale);
  const externalBadgeClass = summary.externalCallPossible
    ? "status-badge status-badge-warning"
    : "status-badge status-badge-success";

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="status-badge status-badge-ai">
          {text.mode}: {summary.modeLabel}
        </span>
        <span className="status-badge status-badge-primary">
          {text.provider}: {summary.effectiveProviderLabel}
        </span>
        <span className="status-badge status-badge-primary">
          {text.dataMode}: {summary.dataModeLabel}
        </span>
        <span className={externalBadgeClass}>
          {text.externalCall}: {summary.externalCallLabel}
        </span>
      </div>
    );
  }

  return (
    <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 text-sm md:grid-cols-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {text.mode}
          </p>
          <p className="mt-1 font-semibold text-slate-950">{summary.modeLabel}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {text.selectedProvider}
          </p>
          <p className="mt-1 font-semibold text-slate-950">
            {summary.selectedProviderLabel}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {text.effectiveProvider}: {summary.effectiveProviderLabel}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {text.dataMode}
          </p>
          <p className="mt-1 font-semibold text-slate-950">
            {summary.dataModeLabel}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {text.externalCall}
          </p>
          <p
            className={`mt-1 inline-flex rounded px-2 py-1 text-xs font-semibold ${
              summary.externalCallPossible
                ? "bg-amber-50 text-amber-800"
                : "bg-emerald-50 text-emerald-800"
            }`}
          >
            {summary.externalCallLabel}
          </p>
        </div>
      </div>
      <p className="mt-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
        {summary.note}
      </p>
    </section>
  );
}
