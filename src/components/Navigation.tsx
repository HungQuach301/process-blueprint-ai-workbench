"use client";

import { useEffect, useMemo, useState } from "react";
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

const fallbackLabelBySectionId: Record<string, Record<Locale, string>> = {
  "product-delivery-workspace": {
    vi: "Product Delivery",
    en: "Product Delivery"
  }
};

const helperByLocale: Record<Locale, string> = {
  vi: "Khu vực làm việc",
  en: "Navigation sections"
};

const groupLabels: Record<Locale, Record<"modeling" | "outputs" | "settings", string>> = {
  vi: {
    modeling: "Quy trình",
    outputs: "Outputs",
    settings: "Cấu hình"
  },
  en: {
    modeling: "Process modeling",
    outputs: "Outputs",
    settings: "Settings"
  }
};

const groupBySectionId: Record<string, keyof typeof groupLabels.en> = {
  "input-brief": "modeling",
  "process-task-register": "modeling",
  "qa-panel": "modeling",
  "d01-bpmn-preview": "outputs",
  "d02-service-blueprint-preview": "outputs",
  "product-delivery-workspace": "outputs",
  "export-center": "outputs",
  "ai-settings": "settings",
  "template-library": "settings"
};

export function Navigation({ locale, sections }: NavigationProps) {
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? "");

  const groupedSections = useMemo(() => {
    return sections.reduce<Record<string, NavigationSection[]>>((groups, section) => {
      const group = groupBySectionId[section.id] ?? "outputs";
      groups[group] = [...(groups[group] ?? []), section];
      return groups;
    }, {});
  }, [sections]);

  useEffect(() => {
    const updateActiveSection = () => {
      const visibleSection = sections
        .map((section) => {
          const element = document.getElementById(section.id);
          return element
            ? { id: section.id, top: Math.abs(element.getBoundingClientRect().top - 96) }
            : null;
        })
        .filter((section): section is { id: string; top: number } => Boolean(section))
        .sort((left, right) => left.top - right.top)[0];

      if (visibleSection?.id) {
        setActiveSectionId(visibleSection.id);
      }
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("hashchange", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("hashchange", updateActiveSection);
    };
  }, [sections]);

  return (
    <aside className="surface-card sticky top-6 hidden h-fit w-72 shrink-0 p-4 md:block">
      <div className="mb-5 border-b border-slate-200 pb-4">
        <p className="text-sm font-semibold text-slate-950">Workbench</p>
        <p className="mt-1 text-sm text-slate-500">{helperByLocale[locale]}</p>
      </div>

      <nav aria-label="Workbench sections">
        {(["modeling", "outputs", "settings"] as const).map((group) => {
          const groupSections = groupedSections[group] ?? [];

          if (groupSections.length === 0) {
            return null;
          }

          return (
            <div className="mb-5 last:mb-0" key={group}>
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {groupLabels[locale][group]}
              </p>
              <ol className="space-y-1">
                {groupSections.map((section) => {
                  const navKey = navKeyBySectionId[section.id];
                  const isActive = activeSectionId === section.id;
                  const fallbackLabel = fallbackLabelBySectionId[section.id]?.[locale];

                  return (
                    <li key={section.id}>
                      <a
                        className={`block rounded-md border px-3 py-2 text-sm font-semibold transition ${
                          isActive
                            ? "border-blue-200 bg-blue-50 text-blue-800 shadow-sm"
                            : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950"
                        }`}
                        href={`#${section.id}`}
                        onClick={() => setActiveSectionId(section.id)}
                      >
                        {fallbackLabel ?? (navKey ? t(navKey, locale) : section.label)}
                      </a>
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
