"use client";

import { useEffect, useMemo, useState } from "react";
import type { NavigationSection } from "@/lib/sample-data/navigation-sections";
import { t, type Locale, type TranslationKey } from "@/lib/i18n";

type NavigationProps = {
  locale: Locale;
  sections: NavigationSection[];
};

type NavigationGroup =
  | "workspace"
  | "process-modeling"
  | "product-delivery"
  | "templates"
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
  "export-center": "nav.exportCenter"
};

const helperByLocale: Record<Locale, string> = {
  vi: "Điều hướng theo module",
  en: "Contextual module navigation"
};

const groupOrder: NavigationGroup[] = [
  "workspace",
  "process-modeling",
  "product-delivery",
  "templates",
  "export-audit"
];

const groupLabels: Record<Locale, Record<NavigationGroup, string>> = {
  vi: {
    workspace: "Không gian làm việc",
    "process-modeling": "Mô hình quy trình",
    "product-delivery": "Hồ sơ sản phẩm",
    templates: "Mẫu",
    "export-audit": "Xuất & kiểm toán"
  },
  en: {
    workspace: "Workspace",
    "process-modeling": "Process Modeling",
    "product-delivery": "Product Delivery",
    templates: "Templates",
    "export-audit": "Export & Audit"
  }
};

const groupBySectionId: Record<string, NavigationGroup> = {
  "ai-settings": "workspace",
  "input-brief": "process-modeling",
  "process-task-register": "process-modeling",
  "d01-bpmn-preview": "process-modeling",
  "d02-service-blueprint-preview": "process-modeling",
  "template-library": "templates",
  "export-center": "export-audit"
};

const productDeliveryLinks = [
  {
    id: "product-delivery",
    label: {
      vi: "Luồng hồ sơ sản phẩm",
      en: "Product Delivery flows"
    },
    href: "#export-center"
  }
];

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
        workspace: [],
        "process-modeling": [],
        "product-delivery": [],
        templates: [],
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
          {locale === "vi" ? "Bản đồ module" : "Module map"}
        </p>
        <p className="mt-1 text-sm text-slate-500">{helperByLocale[locale]}</p>
      </div>

      <nav aria-label="Workbench sections">
        {groupOrder.map((group) => {
          const groupSections = groupedSections[group];
          const extraLinks = group === "product-delivery" ? productDeliveryLinks : [];

          if (groupSections.length === 0 && extraLinks.length === 0) {
            return null;
          }

          return (
            <div className="mb-5 last:mb-0" key={group}>
              <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                {groupLabels[locale][group]}
              </p>
              <ol className="space-y-1">
                {extraLinks.map((link) => (
                  <li key={link.id}>
                    <a
                      className={`block rounded-md border px-3 py-2 text-sm font-semibold transition ${
                        activeSectionId === "export-center"
                          ? "border-purple-200 bg-purple-50 text-purple-800 shadow-sm"
                          : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950"
                      }`}
                      href={link.href}
                      onClick={() => setActiveSectionId("export-center")}
                    >
                      {link.label[locale]}
                    </a>
                  </li>
                ))}
                {groupSections.map((section) => {
                  const navKey = navKeyBySectionId[section.id];
                  const isActive = activeSectionId === section.id;

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
