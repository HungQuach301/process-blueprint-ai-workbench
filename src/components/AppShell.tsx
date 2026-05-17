"use client";

import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { AIProviderSettingsPanel } from "@/components/ai-settings/AIProviderSettingsPanel";
import { D01BpmnOutput } from "@/components/bpmn-output/D01BpmnOutput";
import { D02ServiceBlueprintOutput } from "@/components/service-blueprint-output/D02ServiceBlueprintOutput";
import { ExportCenter } from "@/components/export-center/ExportCenter";
import { AIInputBriefPanel } from "@/components/input-brief/AIInputBriefPanel";
import { ProcessTaskRegister } from "@/components/task-register/ProcessTaskRegister";
import { TemplateLibraryEditor } from "@/components/template-library/TemplateLibraryEditor";
import {
  getLocale,
  setLocale,
  t,
  type Locale
} from "@/lib/i18n";
import { navigationSections } from "@/lib/sample-data/navigation-sections";

const releaseNavigationSections = navigationSections.filter(
  (section) => section.id !== "workspace" && section.id !== "qa-panel"
);

export function AppShell() {
  const [locale, setActiveLocale] = useState<Locale>("vi");
  const artifactCount = releaseNavigationSections.filter(
    (section) =>
      section.id === "d01-bpmn-preview" ||
      section.id === "d02-service-blueprint-preview" ||
      section.id === "export-center"
  ).length;
  const headerText = {
    aiStatus:
      locale === "vi"
        ? "AI: server route / mock an toàn"
        : "AI: server route / mock-safe",
    artifactSummary:
      locale === "vi"
        ? `${artifactCount} đầu ra artifact sẵn sàng`
        : `${artifactCount} artifact outputs ready`,
    aiModeLabel: locale === "vi" ? "Chế độ AI" : "AI mode",
    aiModeValue: locale === "vi" ? "Draft / Preview / Apply" : "Draft / Preview / Apply",
    sourceLabel: locale === "vi" ? "Nguồn dữ liệu chuẩn" : "Source of truth",
    releaseLabel: locale === "vi" ? "Phạm vi release" : "Release scope"
  };
  const gettingStartedText = {
    title: locale === "vi" ? "Bắt đầu từ đây" : "Getting Started",
    description:
      locale === "vi"
        ? "Đi theo 4 bước chính để biến ý định nghiệp vụ thành artifact có thể review và export."
        : "Follow these 4 core steps to turn business intent into reviewable and exportable artifacts.",
    actionLabel: locale === "vi" ? "Mở bước này" : "Open step"
  };
  const gettingStartedSteps = [
    {
      title: "Input Brief",
      href: "#input-brief",
      description:
        locale === "vi"
          ? "Nhập mục tiêu, phạm vi, actor, hệ thống và dữ liệu để tạo bản nháp đầu tiên."
          : "Capture the goal, scope, actors, systems, and data for the first draft."
    },
    {
      title: "Draft PTR",
      href: "#process-task-register",
      description:
        locale === "vi"
          ? "Review draft trong Process Task Register, nguồn chuẩn cho BPMN, Service Blueprint và export."
          : "Review the draft in Process Task Register, the source for BPMN, Service Blueprint, and exports."
    },
    {
      title: "Quality Check",
      href: "#process-task-register",
      description:
        locale === "vi"
          ? "Kiểm tra lỗi, cảnh báo và recommendation trong khu vực QA của Process Task Register."
          : "Check issues, warnings, and recommendations in the Process Task Register QA area."
    },
    {
      title: "Export",
      href: "#export-center",
      description:
        locale === "vi"
          ? "Xuất PTR, QA report, BPMN, Service Blueprint và ZIP sau khi đã review."
          : "Export PTR, QA report, BPMN, Service Blueprint, and ZIP after review."
    }
  ];

  useEffect(() => {
    setActiveLocale(getLocale());
  }, []);

  function switchLocale(nextLocale: Locale) {
    setLocale(nextLocale);
    setActiveLocale(nextLocale);
  }

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-7xl min-w-0 gap-6 px-6 py-6">
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

              <div className="flex flex-col gap-3 lg:items-end">
                <div className="flex flex-wrap gap-2">
                  <span className="status-badge status-badge-ai">
                    {headerText.aiStatus}
                  </span>
                  <span className="status-badge status-badge-success">
                    {headerText.artifactSummary}
                  </span>
                </div>

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
            </div>
            <div className="grid gap-3 bg-slate-50/80 p-4 sm:grid-cols-3">
              <div className="soft-panel p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{headerText.aiModeLabel}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{headerText.aiModeValue}</p>
              </div>
              <div className="soft-panel p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{headerText.sourceLabel}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Process Task Register</p>
              </div>
              <div className="soft-panel p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{headerText.releaseLabel}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">MVP1-AI RC2</p>
              </div>
            </div>
          </header>

          <section className="surface-card mb-6 overflow-hidden" id="getting-started">
            <div className="border-b border-slate-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                {gettingStartedText.title}
              </p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {gettingStartedText.description}
              </p>
            </div>

            <div className="grid gap-0 divide-y divide-slate-200 bg-white md:grid-cols-4 md:divide-x md:divide-y-0">
              {gettingStartedSteps.map((step, index) => (
                <a
                  className="group block p-4 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  href={step.href}
                  key={`${step.title}-${index}`}
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700 group-hover:bg-blue-100">
                    {index + 1}
                  </span>
                  <h2 className="mt-3 text-base font-semibold text-slate-950">
                    {step.title}
                  </h2>
                  <p className="mt-2 min-h-16 text-sm leading-6 text-slate-600">
                    {step.description}
                  </p>
                  <span className="mt-3 inline-flex text-sm font-semibold text-blue-700 group-hover:text-blue-900">
                    {gettingStartedText.actionLabel}
                  </span>
                </a>
              ))}
            </div>
          </section>

          <div className="grid min-w-0 gap-5">
            <div className="min-w-0 max-w-full" id="ai-settings">
              <AIProviderSettingsPanel />
            </div>

            <div className="min-w-0 max-w-full" id="input-brief">
              <AIInputBriefPanel />
            </div>

            <div className="min-w-0 max-w-full" id="template-library">
              <TemplateLibraryEditor />
            </div>

            <div className="min-w-0 max-w-full" id="process-task-register">
              <ProcessTaskRegister />
            </div>

            <div className="min-w-0 max-w-full" id="d01-bpmn-preview">
              <D01BpmnOutput />
            </div>

            <div className="min-w-0 max-w-full" id="d02-service-blueprint-preview">
              <D02ServiceBlueprintOutput />
            </div>

            <div className="min-w-0 max-w-full" id="export-center">
              <ExportCenter />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
