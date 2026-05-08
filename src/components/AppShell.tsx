import { Navigation } from "@/components/Navigation";
import { AIProviderSettingsPanel } from "@/components/ai-settings/AIProviderSettingsPanel";
import { D01BpmnOutput } from "@/components/bpmn-output/D01BpmnOutput";
import { D02ServiceBlueprintOutput } from "@/components/service-blueprint-output/D02ServiceBlueprintOutput";
import { ExportCenter } from "@/components/export-center/ExportCenter";
import { AIInputBriefPanel } from "@/components/input-brief/AIInputBriefPanel";
import { ProcessTaskRegister } from "@/components/task-register/ProcessTaskRegister";
import { TemplateLibraryEditor } from "@/components/template-library/TemplateLibraryEditor";
import { SectionPanel } from "@/components/SectionPanel";
import { navigationSections } from "@/lib/sample-data/navigation-sections";

export function AppShell() {
  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-7xl min-w-0 gap-6 px-6 py-6">
        <Navigation sections={navigationSections} />

        <section className="min-w-0 max-w-full flex-1">
          <header className="mb-6 border-b border-slate-200 pb-5">
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              MVP Skeleton
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">
              Process Blueprint AI Workbench
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              A simple application shell for organizing the future process
              blueprint workflow. Business logic will be added later.
            </p>
          </header>

          <div className="grid min-w-0 gap-4">
            <AIProviderSettingsPanel />

            <AIInputBriefPanel />

            <TemplateLibraryEditor />

            <ProcessTaskRegister />

            <D01BpmnOutput />

            <D02ServiceBlueprintOutput />

            <ExportCenter />

            {navigationSections.map((section) => (
              <SectionPanel key={section.id} section={section} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
