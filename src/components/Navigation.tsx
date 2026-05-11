"use client";

import { useEffect, useMemo, useState } from "react";
import type { NavigationSection } from "@/lib/sample-data/navigation-sections";
import { t, type Locale, type TranslationKey } from "@/lib/i18n";

type NavigationProps = {
  locale: Locale;
  sections: NavigationSection[];
};

type NavigationGroup =
  | "setup"
  | "process-modeling"
  | "product-delivery"
  | "export-audit";

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

const groupOrder: NavigationGroup[] = [
  "setup",
  "process-modeling",
  "product-delivery",
  "export-audit"
];

const groupLabelKey: Record<NavigationGroup, TranslationKey> = {
  setup: "shell.sidebarSetup",
  "process-modeling": "shell.sidebarProcessModeling",
  "product-delivery": "shell.sidebarProductDelivery",
  "export-audit": "shell.sidebarExportAudit"
};

const groupBySectionId: Record<string, NavigationGroup> = {
  workspace: "setup",
  "ai-settings": "setup",
  "input-brief": "process-modeling",
  "process-task-register": "process-modeling",
  "d01-bpmn-preview": "process-modeling",
  "d02-service-blueprint-preview": "process-modeling",
  "template-library": "process-modeling",
  "product-delivery": "product-delivery",
  "export-center": "export-audit"
};

export function Navigation({ locale, sections }: NavigationProps) {
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? "");

  const groupedSections = useMemo(() => {
    return sections.reduce<Record<NavigationGroup, NavigationSection[]>>(
      (groups, section) => {
        const group = groupBySectionId[section.id] ?? "export-audit";
        groups[group] = [...groups[group], section];
        return groups;
      },
      {
        setup: [],
        "process-modeling": [],
        "product-delivery": [],
        "export-audit": []
      }
    );
  }, [sections]);

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
        {groupOrder.map((group) => {
          const groupSections = groupedSections[group];

          if (groupSections.length === 0) {
            return null;
          }

          return (
            <div className="mb-5 last:mb-0" key={group}>
              <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                {t(groupLabelKey[group], locale)}
              </p>
              <ol className="space-y-1">
                {groupSections.map((section) => {
                  const navKey = navKeyBySectionId[section.id];
                  const isActive = activeSectionId === section.id;

                  return (
                    <li key={section.id}>
                      <a
                        className={`sidebar-link ${isActive ? "sidebar-link-active" : ""}`}
                        href={`#${section.id}`}
                        onClick={() => setActiveSectionId(section.id)}
                      >
                        {navKey ? t(navKey, locale) : section.label}
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
