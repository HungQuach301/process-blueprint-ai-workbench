"use client";

import { useEffect, useState } from "react";
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
  "product-delivery": "shell.moduleProductDelivery",
  "export-center": "nav.exportCenter"
};

export function Navigation({ locale, sections }: NavigationProps) {
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const updateActiveSection = () => {
      const visibleSection = sections
        .map((section) => {
          const element = document.getElementById(section.id);
          return element
            ? { id: section.id, top: Math.abs(element.getBoundingClientRect().top - 136) }
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
    <aside className="surface-card sticky top-28 hidden h-fit w-72 shrink-0 p-4 md:block">
      <div className="mb-5 border-b border-slate-200 pb-4">
        <p className="text-sm font-semibold text-slate-950">
          {t("shell.sidebarTitle", locale)}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {t("shell.sidebarHelper", locale)}
        </p>
      </div>

      <nav aria-label="Workbench sections">
        <ol className="space-y-1">
          {sections.map((section, index) => {
            const navKey = navKeyBySectionId[section.id];
            const isActive = activeSectionId === section.id;

            return (
              <li key={section.id}>
                <a
                  className={`sidebar-link ${isActive ? "sidebar-link-active" : ""}`}
                  href={`#${section.id}`}
                  onClick={() => setActiveSectionId(section.id)}
                >
                  <span className="mr-2 text-xs font-semibold text-slate-400">
                    {index + 1}
                  </span>
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
