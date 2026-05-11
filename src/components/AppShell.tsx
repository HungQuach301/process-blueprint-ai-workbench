"use client";

import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { AIProviderSettingsPanel } from "@/components/ai-settings/AIProviderSettingsPanel";
import { D01BpmnOutput } from "@/components/bpmn-output/D01BpmnOutput";
import { D02ServiceBlueprintOutput } from "@/components/service-blueprint-output/D02ServiceBlueprintOutput";
import { ExportCenter } from "@/components/export-center/ExportCenter";
import { AIInputBriefPanel } from "@/components/input-brief/AIInputBriefPanel";
import { ProductDeliveryCore } from "@/components/product-delivery/ProductDeliveryCore";
import { ProcessTaskRegister } from "@/components/task-register/ProcessTaskRegister";
import { TemplateLibraryEditor } from "@/components/template-library/TemplateLibraryEditor";
import { getLocale, setLocale, t, type Locale } from "@/lib/i18n";
import { navigationSections } from "@/lib/sample-data/navigation-sections";

const releaseNavigationSections = navigationSections.filter(
  (section) => section.id !== "workspace" && section.id !== "qa-panel"
);

type AIStatusResponse = {
  realAIEnabled?: boolean;
  realAIQAEnabled?: boolean;
  realAITemplateReviewEnabled?: boolean;
  provider?: string;
  effectiveProvider?: string;
  fallbackActive?: boolean;
  dataUsageMode?: string;
};

const moduleTabs: Array<{
  id: string;
  label: Record<Locale, string>;
  href: string;
}> = [
  { id: "workspace", label: { vi: "Không gian làm việc", en: "Workspace" }, href: "#ai-settings" },
  { id: "process-modeling", label: { vi: "Mô hình quy trình", en: "Process Modeling" }, href: "#input-brief" },
  { id: "product-delivery", label: { vi: "Hồ sơ sản phẩm", en: "Product Delivery" }, href: "#product-delivery" },
  { id: "templates", label: { vi: "Mẫu", en: "Templates" }, href: "#template-library" },
  { id: "export-audit", label: { vi: "Xuất & kiểm toán", en: "Export & Audit" }, href: "#export-center" }
];

function hasRealAI(status: AIStatusResponse) {
  return (
    status.realAIEnabled === true ||
    status.realAIQAEnabled === true ||
    status.realAITemplateReviewEnabled === true
  );
}

function getAIStatusLabel(status: AIStatusResponse, locale: Locale) {
  const effectiveProvider = status.effectiveProvider ?? status.provider ?? "mock";

  if (status.fallbackActive) {
    return locale === "vi" ? "AI: fallback local/mock" : "AI: local/mock fallback";
  }

  if (!hasRealAI(status) || effectiveProvider === "mock") {
    return locale === "vi" ? "AI: local/mock" : "AI: local/mock";
  }

  return `AI: ${effectiveProvider}`;
}

function getAIModeValue(status: AIStatusResponse, locale: Locale) {
  if (!hasRealAI(status)) {
    return locale === "vi"
      ? "Local/mock, xem trước trước khi áp dụng"
      : "Local/mock, preview first";
  }

  return locale === "vi"
    ? "AI server-side, xem trước trước khi áp dụng"
    : "Server-side AI, preview first";
}

export function AppShell() {
  const [locale, setActiveLocale] = useState<Locale>("vi");
  const [aiStatus, setAIStatus] = useState<AIStatusResponse>({});
  const artifactCount = releaseNavigationSections.filter(
    (section) =>
      section.id === "d01-bpmn-preview" ||
      section.id === "d02-service-blueprint-preview" ||
      section.id === "export-center"
  ).length;
  const headerText = {
    artifactSummary:
      locale === "vi"
        ? `${artifactCount} đầu ra đã sẵn sàng`
        : `${artifactCount} artifact outputs ready`,
    aiModeLabel: locale === "vi" ? "Chế độ AI" : "AI mode",
    sourceLabel: locale === "vi" ? "Nguồn dữ liệu chuẩn" : "Source of truth",
    releaseLabel: locale === "vi" ? "Phạm vi phát hành" : "Release scope",
    dataModeLabel: locale === "vi" ? "Chế độ dữ liệu" : "Data mode",
    privacyLabel: locale === "vi" ? "Quyền riêng tư" : "Privacy",
    footerPrivacy:
      locale === "vi"
        ? "Local storage lưu tùy chọn và metadata bản nháp trong trình duyệt này; API key không được nhập hoặc hiển thị ở client."
        : "Local storage keeps preferences and draft metadata in this browser; API keys are never entered or displayed in the client."
  };

  useEffect(() => {
    setActiveLocale(getLocale());
  }, []);

  useEffect(() => {
    async function loadAIStatus() {
      try {
        const response = await fetch("/api/ai/run-skill", { method: "GET" });
        const data = (await response.json()) as AIStatusResponse;

        setAIStatus(data);
      } catch {
        setAIStatus({});
      }
    }

    void loadAIStatus();
  }, []);

  function switchLocale(nextLocale: Locale) {
    setLocale(nextLocale);
    setActiveLocale(nextLocale);
  }

  return (
    <main className="app-shell min-h-screen w-full max-w-full overflow-x-hidden">
      <header className="app-menubar sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 lg:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <a className="flex min-w-0 items-center gap-3" href="#ai-settings">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-600 text-sm font-black text-white shadow-sm">
                PB
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                  MVP1-AI RC3
                </span>
                <span className="block truncate text-lg font-semibold text-slate-950">
                  Process Blueprint AI Workbench
                </span>
              </span>
            </a>

            <div className="flex flex-wrap items-center gap-2">
              <span className="status-badge status-badge-ai">
                {getAIStatusLabel(aiStatus, locale)}
              </span>
              <span className="status-badge status-badge-success">
                {headerText.artifactSummary}
              </span>
              <label className="flex w-fit items-center gap-2 text-sm font-medium text-slate-700">
                {t("common.language", locale)}
                <select
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                  onChange={(event) => switchLocale(event.target.value as Locale)}
                  value={locale}
                >
                  <option value="vi">{t("common.vietnamese", locale)}</option>
                  <option value="en">{t("common.english", locale)}</option>
                </select>
              </label>
            </div>
          </div>

          <nav aria-label="Module tabs" className="flex gap-2 overflow-x-auto pb-1">
            {moduleTabs.map((tab) => (
              <a className="module-tab" href={tab.href} key={tab.id}>
                {tab.label[locale]}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl min-w-0 gap-6 px-4 py-6 lg:px-6">
        <Navigation locale={locale} sections={releaseNavigationSections} />

        <section className="min-w-0 max-w-full flex-1">
          <header className="surface-card mb-6 overflow-hidden">
            <div className="border-b border-slate-200 bg-white p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="status-badge status-badge-primary">
                    {t("session.mvpSkeleton", locale)}
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold text-slate-950">
                    Process Blueprint AI Workbench
                  </h1>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                    {t("session.appDescription", locale)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <span className="status-badge status-badge-ai">
                    {getAIStatusLabel(aiStatus, locale)}
                  </span>
                  <span className="status-badge status-badge-success">
                    {headerText.artifactSummary}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid gap-3 bg-slate-50/80 p-4 sm:grid-cols-3">
              <div className="soft-panel p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {headerText.aiModeLabel}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {getAIModeValue(aiStatus, locale)}
                </p>
              </div>
              <div className="soft-panel p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {headerText.sourceLabel}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  Process Task Register
                </p>
              </div>
              <div className="soft-panel p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {headerText.releaseLabel}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  MVP1-AI RC3
                </p>
              </div>
            </div>
          </header>

          <div className="grid min-w-0 gap-5">
            <div className="min-w-0 max-w-full scroll-mt-36" id="ai-settings">
              <AIProviderSettingsPanel />
            </div>

            <div className="min-w-0 max-w-full scroll-mt-36" id="input-brief">
              <AIInputBriefPanel />
            </div>

            <div className="min-w-0 max-w-full scroll-mt-36" id="template-library">
              <TemplateLibraryEditor />
            </div>

            <div className="min-w-0 max-w-full scroll-mt-36" id="process-task-register">
              <ProcessTaskRegister />
            </div>

            <div className="min-w-0 max-w-full scroll-mt-36" id="d01-bpmn-preview">
              <D01BpmnOutput />
            </div>

            <div className="min-w-0 max-w-full scroll-mt-36" id="d02-service-blueprint-preview">
              <D02ServiceBlueprintOutput />
            </div>

            <div className="min-w-0 max-w-full scroll-mt-36" id="product-delivery">
              <ProductDeliveryCore />
            </div>

            <div className="min-w-0 max-w-full scroll-mt-36" id="export-center">
              <ExportCenter />
            </div>
          </div>

          <footer className="surface-card mt-6 p-4 text-sm text-slate-600">
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Version
                </p>
                <p className="mt-1 font-semibold text-slate-900">MVP1-AI RC3</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {headerText.aiModeLabel}
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {getAIModeValue(aiStatus, locale)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {headerText.dataModeLabel}
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {aiStatus.dataUsageMode ?? "local-only"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {headerText.privacyLabel}
                </p>
                <p className="mt-1 leading-5">{headerText.footerPrivacy}</p>
              </div>
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}
