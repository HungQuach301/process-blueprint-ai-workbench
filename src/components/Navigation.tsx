import type { NavigationSection } from "@/lib/sample-data/navigation-sections";
import { t, type Locale, type TranslationKey } from "@/lib/i18n";

type NavigationProps = {
  locale: Locale;
  sections: NavigationSection[];
};

const navKeyBySectionId: Partial<Record<NavigationSection["id"], TranslationKey>> = {
  workspace: "nav.workspace",
  "ai-settings": "nav.aiSettings",
  "input-brief": "nav.inputBrief",
  "template-library": "nav.templateLibrary",
  "process-task-register": "nav.processTaskRegister",
  "qa-panel": "nav.qaPanel",
  "d01-bpmn-preview": "nav.d01BpmnPreview",
  "d02-service-blueprint-preview": "nav.d02ServiceBlueprintPreview",
  "export-center": "nav.exportCenter"
};

const helperByLocale: Record<Locale, string> = {
  vi: "Các khu vực làm việc",
  en: "Navigation sections"
};

export function Navigation({ locale, sections }: NavigationProps) {
  return (
    <aside className="sticky top-6 hidden h-fit w-72 shrink-0 rounded border border-slate-200 bg-white p-4 md:block">
      <div className="mb-4">
        <p className="text-sm font-semibold text-slate-950">Workbench</p>
        <p className="mt-1 text-sm text-slate-500">{helperByLocale[locale]}</p>
      </div>

      <nav aria-label="Workbench sections">
        <ol className="space-y-1">
          {sections.map((section) => {
            const navKey = navKeyBySectionId[section.id];

            return (
              <li key={section.id}>
                <a
                  className="block rounded px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  href={`#${section.id}`}
                >
                  {navKey ? t(navKey, locale) : section.label}
                </a>
              </li>
            );
          })}
        </ol>
      </nav>
    </aside>
  );
}
