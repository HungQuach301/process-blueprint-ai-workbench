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
import type { TemplateProfile } from "@/lib/models/template-profile";
import {
  getLocale,
  setLocale,
  t,
  type Locale
} from "@/lib/i18n";
import { navigationSections } from "@/lib/sample-data/navigation-sections";
import {
  bankingStarterTemplateProfiles,
  sampleBpmnTemplateProfile,
  sampleServiceBlueprintTemplateProfile
} from "@/lib/sample-data/sme-online-loan";

const releaseNavigationSections = navigationSections.filter(
  (section) =>
    section.id !== "workspace" &&
    section.id !== "qa-panel" &&
    section.id !== "template-library"
);
const TEMPLATES_STORAGE_KEY =
  "process-blueprint-ai-workbench:template-profiles";
const D01_STORAGE_KEY = "process-blueprint-ai-workbench:selected-d01-template";
const D02_STORAGE_KEY = "process-blueprint-ai-workbench:selected-d02-template";
const ARTIFACT_STATUS_EVENT = "process-blueprint-artifact-status-change";
const TEMPLATE_MANAGER_EVENT = "process-blueprint-open-template-manager";

type SelectedTemplateSummary = {
  d01: TemplateProfile;
  d02: TemplateProfile;
};

function getDefaultTemplates() {
  return [
    sampleBpmnTemplateProfile,
    sampleServiceBlueprintTemplateProfile,
    ...bankingStarterTemplateProfiles
  ];
}

function readTemplateProfiles() {
  if (typeof window === "undefined") {
    return getDefaultTemplates();
  }

  const savedTemplates = window.localStorage.getItem(TEMPLATES_STORAGE_KEY);

  if (!savedTemplates) {
    return getDefaultTemplates();
  }

  try {
    const parsedTemplates = JSON.parse(savedTemplates);

    if (Array.isArray(parsedTemplates)) {
      return parsedTemplates as TemplateProfile[];
    }
  } catch {
    return getDefaultTemplates();
  }

  return getDefaultTemplates();
}

function readSelectedTemplateSummary(): SelectedTemplateSummary {
  const templates = readTemplateProfiles();
  const selectedD01Id =
    typeof window === "undefined"
      ? sampleBpmnTemplateProfile.id
      : window.localStorage.getItem(D01_STORAGE_KEY) ??
        sampleBpmnTemplateProfile.id;
  const selectedD02Id =
    typeof window === "undefined"
      ? sampleServiceBlueprintTemplateProfile.id
      : window.localStorage.getItem(D02_STORAGE_KEY) ??
        sampleServiceBlueprintTemplateProfile.id;

  return {
    d01:
      templates.find((template) => template.id === selectedD01Id) ??
      sampleBpmnTemplateProfile,
    d02:
      templates.find((template) => template.id === selectedD02Id) ??
      sampleServiceBlueprintTemplateProfile
  };
}

export function AppShell() {
  const [locale, setActiveLocale] = useState<Locale>("vi");
  const [isTemplateHubOpen, setIsTemplateHubOpen] = useState(false);
  const [isTemplatePreviewOpen, setIsTemplatePreviewOpen] = useState(false);
  const [selectedTemplates, setSelectedTemplates] =
    useState<SelectedTemplateSummary>(() => ({
      d01: sampleBpmnTemplateProfile,
      d02: sampleServiceBlueprintTemplateProfile
    }));
  const artifactCount = releaseNavigationSections.filter(
    (section) =>
      section.id === "d01-bpmn-preview" ||
      section.id === "d02-service-blueprint-preview" ||
      section.id === "product-delivery-workspace" ||
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
  const workspaceText = {
    label: "Local workspace",
    value: "Browser local only"
  };
  const heroText = {
    positioning:
      locale === "vi"
        ? "Từ quy trình nghiệp vụ đến bộ artifact sẵn sàng cho AI delivery"
        : "From business process to AI-ready delivery artifacts",
    description:
      locale === "vi"
        ? "Tạo Process Task Register, QA, BPMN, Service Blueprint, BRD, SRS, User Stories và AI Coding Pack với validation, approval và traceability trong một workspace có kiểm soát."
        : "Create Process Task Register, QA, BPMN, Service Blueprint, BRD, SRS, User Stories, and AI Coding Pack with validation, approval, and traceability in one controlled workspace.",
    ctas: [
      {
        href: "#input-brief",
        label: locale === "vi" ? "Bắt đầu với Input Brief" : "Start with Input Brief"
      },
      {
        href: "#process-task-register",
        label:
          locale === "vi"
            ? "Review Process Register"
            : "Review Process Register"
      },
      {
        href: "#export-center",
        label: locale === "vi" ? "Export Package" : "Export Package"
      }
    ]
  };
  const governanceText = {
    title:
      locale === "vi"
        ? "Governance mặc định cho dữ liệu doanh nghiệp"
        : "Default governance for enterprise data",
    description:
      locale === "vi"
        ? "Workspace giữ luồng làm việc có kiểm soát: AI chỉ tạo draft hoặc recommendation, người dùng review trước khi apply hoặc export."
        : "The workspace keeps a controlled flow: AI creates drafts or recommendations, and users review before applying or exporting.",
    items:
      locale === "vi"
        ? [
            "Server-side AI calls",
            "Không có API key trong browser",
            "Draft / Preview / Approve",
            "Local workspace backup"
          ]
        : [
            "Server-side AI calls",
            "No browser API keys",
            "Draft / Preview / Approve",
            "Local workspace backup"
          ]
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
  const templateSummaryText = {
    title:
      locale === "vi"
        ? "Template đang dùng cho output"
        : "Selected output templates",
    description:
      locale === "vi"
        ? "Template Hub được giữ trong Settings. Workflow chính chỉ hiển thị template D01/D02 đang được chọn để giảm nhiễu khi tạo quy trình."
        : "Template Hub lives in Settings. The main workflow only shows the selected D01/D02 templates to keep process work focused.",
    d01Label: "D01 BPMN",
    d02Label: "D02 Service Blueprint",
    changeTemplate:
      locale === "vi" ? "Đổi template" : "Change template",
    previewTemplate:
      locale === "vi" ? "Xem template" : "Preview template",
    manageTemplates:
      locale === "vi" ? "Quản lý templates" : "Manage templates",
    closeManager:
      locale === "vi" ? "Đóng" : "Close",
    status:
      locale === "vi"
        ? "Không auto-apply recommendation từ Template QA."
        : "Template QA recommendations are not auto-applied.",
    outputType: locale === "vi" ? "Output" : "Output",
    domain: locale === "vi" ? "Domain" : "Domain",
    processType: locale === "vi" ? "Process" : "Process"
  };

  useEffect(() => {
    setActiveLocale(getLocale());
    setSelectedTemplates(readSelectedTemplateSummary());
  }, []);

  useEffect(() => {
    function refreshSelectedTemplates() {
      setSelectedTemplates(readSelectedTemplateSummary());
    }

    function handleHashChange() {
      if (window.location.hash === "#template-library") {
        setIsTemplateHubOpen(true);
        refreshSelectedTemplates();
      }
    }

    function handleOpenTemplateManager() {
      setIsTemplateHubOpen(true);
      refreshSelectedTemplates();
    }

    window.addEventListener("storage", refreshSelectedTemplates);
    window.addEventListener(ARTIFACT_STATUS_EVENT, refreshSelectedTemplates);
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener(TEMPLATE_MANAGER_EVENT, handleOpenTemplateManager);
    handleHashChange();

    return () => {
      window.removeEventListener("storage", refreshSelectedTemplates);
      window.removeEventListener(ARTIFACT_STATUS_EVENT, refreshSelectedTemplates);
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener(TEMPLATE_MANAGER_EVENT, handleOpenTemplateManager);
    };
  }, []);

  function switchLocale(nextLocale: Locale) {
    setLocale(nextLocale);
    setActiveLocale(nextLocale);
  }

  function openTemplateHub() {
    setIsTemplateHubOpen(true);
    setSelectedTemplates(readSelectedTemplateSummary());
  }

  function renderTemplateMetadata(template: TemplateProfile) {
    return (
      <div className="rounded border border-slate-200 bg-white p-3">
        <p className="text-sm font-semibold text-slate-950">{template.name}</p>
        <div className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
          <span>
            <span className="font-semibold text-slate-700">
              {templateSummaryText.outputType}:
            </span>{" "}
            {template.outputType}
          </span>
          <span>
            <span className="font-semibold text-slate-700">
              {templateSummaryText.domain}:
            </span>{" "}
            {template.businessDomain}
          </span>
          <span>
            <span className="font-semibold text-slate-700">
              {templateSummaryText.processType}:
            </span>{" "}
            {template.processType}
          </span>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-7xl min-w-0 gap-6 px-6 py-6">
        <Navigation locale={locale} sections={releaseNavigationSections} />

        <section className="min-w-0 max-w-full flex-1">
          <header className="surface-card mb-6 overflow-hidden">
            <div className="border-b border-slate-200 bg-white p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="status-badge status-badge-primary">
                    {t("session.mvpSkeleton", locale)}
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold text-slate-950">
                    Process Blueprint AI Workbench
                  </h1>
                  <p className="mt-3 text-sm font-bold uppercase tracking-wide text-blue-700">
                    {heroText.positioning}
                  </p>
                  <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                    {heroText.description}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {heroText.ctas.map((cta, index) => (
                      <a
                        className={
                          index === 0
                            ? "btn btn-primary"
                            : "btn btn-secondary"
                        }
                        href={cta.href}
                        key={cta.href}
                      >
                        {cta.label}
                      </a>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3 lg:items-end">
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <span className="status-badge status-badge-ai">
                      {headerText.aiStatus}
                    </span>
                    <span className="status-badge status-badge-success">
                      {headerText.artifactSummary}
                    </span>
                    <span className="status-badge status-badge-warning">
                      {workspaceText.label}
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
            <div className="grid gap-3 bg-slate-50/80 p-4 sm:grid-cols-4">
              <div className="soft-panel p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{headerText.aiModeLabel}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{headerText.aiModeValue}</p>
              </div>
              <div className="soft-panel p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{headerText.sourceLabel}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Process Task Register</p>
              </div>
              <div className="soft-panel p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{workspaceText.label}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{workspaceText.value}</p>
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

            <section className="surface-card overflow-hidden">
              <div className="border-b border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Settings summary
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-slate-950">
                      {templateSummaryText.title}
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                      {templateSummaryText.description}
                    </p>
                  </div>
                  <span className="status-badge status-badge-warning">
                    {templateSummaryText.status}
                  </span>
                </div>
              </div>
              <div className="grid gap-3 bg-slate-50/80 p-4 lg:grid-cols-2">
                <div className="soft-panel p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {templateSummaryText.d01Label}
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-950">
                    {selectedTemplates.d01.name}
                  </p>
                </div>
                <div className="soft-panel p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {templateSummaryText.d02Label}
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-950">
                    {selectedTemplates.d02.name}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-slate-200 bg-white p-4">
                <button
                  className="btn btn-secondary"
                  onClick={openTemplateHub}
                  type="button"
                >
                  {templateSummaryText.changeTemplate}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    setIsTemplatePreviewOpen((isOpen) => !isOpen)
                  }
                  type="button"
                >
                  {templateSummaryText.previewTemplate}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={openTemplateHub}
                  type="button"
                >
                  {templateSummaryText.manageTemplates}
                </button>
              </div>
              {isTemplatePreviewOpen ? (
                <div className="grid gap-3 border-t border-slate-200 bg-slate-50 p-4 lg:grid-cols-2">
                  {renderTemplateMetadata(selectedTemplates.d01)}
                  {renderTemplateMetadata(selectedTemplates.d02)}
                </div>
              ) : null}
            </section>

            {false ? (
            <div className="min-w-0 max-w-full" id="template-library">
              <section>
                <div className="surface-card flex flex-col gap-3 p-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Settings
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-slate-950">
                      Template Hub
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                      {locale === "vi"
                        ? "Quản lý template D01/D02 tại đây khi cần. Section này được thu gọn khỏi workflow mặc định."
                        : "Manage D01/D02 templates here when needed. This section stays collapsed outside the default workflow."}
                    </p>
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setIsTemplateHubOpen((isOpen) => !isOpen);
                      setSelectedTemplates(readSelectedTemplateSummary());
                    }}
                    type="button"
                  >
                    {isTemplateHubOpen
                      ? templateSummaryText.closeManager
                      : templateSummaryText.manageTemplates}
                  </button>
                </div>
                {isTemplateHubOpen ? (
                  <div className="mt-3">
                    <TemplateLibraryEditor />
                  </div>
                ) : null}
              </section>
            </div>
            ) : null}

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

          <footer className="surface-card mt-6 overflow-hidden">
            <div className="border-b border-slate-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Trust & Governance
              </p>
              <h2 className="mt-2 text-lg font-semibold text-slate-950">
                {governanceText.title}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {governanceText.description}
              </p>
            </div>
            <div className="grid gap-3 bg-slate-50/80 p-4 sm:grid-cols-2 lg:grid-cols-4">
              {governanceText.items.map((item) => (
                <div className="soft-panel p-3" key={item}>
                  <p className="text-sm font-semibold text-slate-900">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </footer>
        </section>
      </div>
      {isTemplateHubOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 p-3 backdrop-blur-sm"
          role="dialog"
        >
          <div className="flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Settings
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">
                  Template Hub
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {locale === "vi"
                    ? "Quản lý template D01/D02 tại đây khi cần. Template recommendation vẫn chỉ là đề xuất, không auto-apply."
                    : "Manage D01/D02 templates here when needed. Template recommendations remain suggestions and are not auto-applied."}
                </p>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setIsTemplateHubOpen(false);
                  setSelectedTemplates(readSelectedTemplateSummary());
                }}
                type="button"
              >
                {templateSummaryText.closeManager}
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4">
              <TemplateLibraryEditor />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
