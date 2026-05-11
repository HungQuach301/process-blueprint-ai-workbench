"use client";

import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import {
  AITrustStatus,
  getAITrustSummary,
  type AITrustStatusResponse
} from "@/components/ai-status/AITrustStatus";
import { AIProviderSettingsPanel } from "@/components/ai-settings/AIProviderSettingsPanel";
import { D01BpmnOutput } from "@/components/bpmn-output/D01BpmnOutput";
import { D02ServiceBlueprintOutput } from "@/components/service-blueprint-output/D02ServiceBlueprintOutput";
import { ExportCenter } from "@/components/export-center/ExportCenter";
import { AIInputBriefPanel } from "@/components/input-brief/AIInputBriefPanel";
import { ProductDeliveryCore } from "@/components/product-delivery/ProductDeliveryCore";
import { ProcessTaskRegister } from "@/components/task-register/ProcessTaskRegister";
import { TemplateLibraryEditor } from "@/components/template-library/TemplateLibraryEditor";
import { WorkspaceDashboard } from "@/components/workspace/WorkspaceDashboard";
import { getLocale, setLocale, t, type Locale, type TranslationKey } from "@/lib/i18n";
import { navigationSections } from "@/lib/sample-data/navigation-sections";

const moduleTabs: Array<{
  id: string;
  labelKey: TranslationKey;
  href: string;
}> = [
  { id: "workspace", labelKey: "shell.moduleDashboard", href: "#workspace" },
  { id: "ai-settings", labelKey: "shell.moduleAIConnectionCenter", href: "#ai-settings" },
  { id: "input-brief", labelKey: "shell.moduleAIInputBrief", href: "#input-brief" },
  { id: "process-task-register", labelKey: "shell.moduleProcessTaskRegister", href: "#process-task-register" },
  { id: "qa-panel", labelKey: "shell.moduleQAEngine", href: "#qa-panel" },
  { id: "d01-bpmn-preview", labelKey: "shell.moduleD01BpmnXml", href: "#d01-bpmn-preview" },
  { id: "d02-service-blueprint-preview", labelKey: "shell.moduleD02ServiceBlueprint", href: "#d02-service-blueprint-preview" },
  { id: "template-library", labelKey: "shell.moduleTemplateHub", href: "#template-library" },
  { id: "product-delivery", labelKey: "shell.moduleProductDelivery", href: "#product-delivery" },
  { id: "export-center", labelKey: "shell.moduleOutputPackageZip", href: "#export-center" }
];

const processModelingGuide = {
  vi: {
    title: "Cách làm Process Modeling",
    steps: [
      {
        title: "Thu thập đầu vào",
        body: "Bắt đầu từ brief, file, ghi chú hoặc mẫu ngân hàng."
      },
      {
        title: "Rà soát PTR có cấu trúc",
        body: "Kiểm tra bước, actor, system, phase và bước tiếp theo."
      },
      {
        title: "Tạo BPMN/D02/xuất gói",
        body: "Tạo D01 BPMN, D02 Service Blueprint và gói xuất sau khi rà soát."
      }
    ]
  },
  en: {
    title: "How Process Modeling works",
    steps: [
      {
        title: "Capture input",
        body: "Start from a brief, file, notes, or banking template."
      },
      {
        title: "Review structured PTR",
        body: "Check steps, actors, systems, phases, and next steps."
      },
      {
        title: "Generate BPMN/D02/export",
        body: "Generate D01 BPMN, D02 Service Blueprint, and exports after review."
      }
    ]
  }
} satisfies Record<Locale, { title: string; steps: Array<{ title: string; body: string }> }>;

export function AppShell() {
  const [locale, setActiveLocale] = useState<Locale>("vi");
  const [aiStatus, setAIStatus] = useState<AITrustStatusResponse>({});
  const processGuide = processModelingGuide[locale];
  const aiTrustSummary = getAITrustSummary(aiStatus, locale);

  useEffect(() => {
    setActiveLocale(getLocale());
  }, []);

  useEffect(() => {
    async function loadAIStatus() {
      try {
        const response = await fetch("/api/ai/run-skill", { method: "GET" });
        const data = (await response.json()) as AITrustStatusResponse;

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
      <header className="app-menubar sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 lg:px-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <a className="flex min-w-0 items-center gap-3" href="#workspace">
              <span className="product-mark">PB</span>
              <span className="min-w-0">
                <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t("shell.versionValue", locale)}
                </span>
                <span className="block truncate text-lg font-semibold text-slate-950">
                  {t("shell.productName", locale)}
                </span>
              </span>
            </a>

            <div className="flex flex-wrap items-center gap-2">
              <AITrustStatus compact locale={locale} status={aiStatus} />
              <label className="flex w-fit items-center gap-2 text-sm font-medium text-slate-700">
                {t("shell.language", locale)}
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
                {t(tab.labelKey, locale)}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl min-w-0 gap-6 px-4 py-6 lg:px-6">
        <Navigation locale={locale} sections={navigationSections} />

        <section className="min-w-0 max-w-full flex-1">
          <header className="surface-card mb-6 overflow-hidden">
            <div className="section-header p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="status-badge status-badge-primary">
                    {t("shell.heroEyebrow", locale)}
                  </p>
                  <h1 className="mt-3 max-w-3xl text-3xl font-semibold text-slate-950">
                    {t("shell.heroTitle", locale)}
                  </h1>
                  <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                    {t("shell.heroDescription", locale)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <AITrustStatus compact locale={locale} status={aiStatus} />
                </div>
              </div>
            </div>

            <div className="grid gap-3 bg-slate-50/80 p-4 sm:grid-cols-3">
              <div className="soft-panel p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t("shell.aiStatus", locale)}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {aiTrustSummary.modeLabel}
                </p>
              </div>
              <div className="soft-panel p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t("shell.sourceOfTruth", locale)}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  Process Task Register
                </p>
              </div>
              <div className="soft-panel p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t("shell.releaseScope", locale)}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {t("shell.versionValue", locale)}
                </p>
              </div>
            </div>
          </header>

          <div className="grid min-w-0 gap-5">
            <div className="min-w-0 max-w-full scroll-mt-36" id="workspace">
              <WorkspaceDashboard aiStatus={aiStatus} locale={locale} />
            </div>

            <div className="min-w-0 max-w-full scroll-mt-36" id="ai-settings">
              <AIProviderSettingsPanel />
            </div>

            <details className="rounded border border-blue-100 bg-blue-50/60 p-4 text-sm text-blue-950">
              <summary className="cursor-pointer font-semibold">
                {processGuide.title}
              </summary>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {processGuide.steps.map((step, index) => (
                  <div className="rounded border border-blue-100 bg-white/80 p-3" key={step.title}>
                    <p className="text-xs font-bold uppercase text-blue-700">
                      {index + 1}. {step.title}
                    </p>
                    <p className="mt-1 leading-5 text-blue-950/80">{step.body}</p>
                  </div>
                ))}
              </div>
            </details>

            <div className="min-w-0 max-w-full scroll-mt-36" id="input-brief">
              <AIInputBriefPanel />
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

            <div className="min-w-0 max-w-full scroll-mt-36" id="template-library">
              <TemplateLibraryEditor />
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
                  {t("shell.versionLabel", locale)}
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {t("shell.versionValue", locale)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t("shell.aiStatus", locale)}
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {aiTrustSummary.modeLabel}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t("shell.dataMode", locale)}
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {aiTrustSummary.dataModeLabel}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t("shell.privacy", locale)}
                </p>
                <p className="mt-1 leading-5">{t("shell.privacyNote", locale)}</p>
              </div>
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}
