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
import { SectionPanel } from "@/components/SectionPanel";
import {
  getLocale,
  setLocale,
  t,
  type Locale
} from "@/lib/i18n";
import { navigationSections } from "@/lib/sample-data/navigation-sections";

export function AppShell() {
  const [locale, setActiveLocale] = useState<Locale>("vi");
  const sectionById = Object.fromEntries(
    navigationSections.map((section) => [section.id, section])
  );

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
        <Navigation sections={navigationSections} />

        <section className="min-w-0 max-w-full flex-1">
          <header className="mb-6 border-b border-slate-200 pb-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
                  {t("session.mvpSkeleton", locale)}
                </p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-950">
                  Process Blueprint AI Workbench
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                  {t("session.appDescription", locale)}
                </p>
              </div>

              <label className="flex w-fit items-center gap-2 text-sm font-medium text-slate-700">
                {t("common.language", locale)}
                <select
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                  onChange={(event) => switchLocale(event.target.value as Locale)}
                  value={locale}
                >
                  <option value="vi">{t("common.vietnamese", locale)}</option>
                  <option value="en">{t("common.english", locale)}</option>
                </select>
              </label>
            </div>
          </header>

          <div className="grid min-w-0 gap-4">
            {sectionById.workspace ? (
              <SectionPanel section={sectionById.workspace} />
            ) : null}

            <div id="ai-settings">
              <AIProviderSettingsPanel />
            </div>

            <div id="input-brief">
              <AIInputBriefPanel />
            </div>

            <div id="template-library">
              <TemplateLibraryEditor />
            </div>

            <div id="process-task-register">
              <ProcessTaskRegister />
            </div>

            {sectionById["qa-panel"] ? (
              <SectionPanel section={sectionById["qa-panel"]} />
            ) : null}

            <div id="d01-bpmn-preview">
              <D01BpmnOutput />
            </div>

            <div id="d02-service-blueprint-preview">
              <D02ServiceBlueprintOutput />
            </div>

            <div id="export-center">
              <ExportCenter />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
