import type { NavigationSection } from "@/lib/sample-data/navigation-sections";

type SectionPanelProps = {
  section: NavigationSection;
};

export function SectionPanel({ section }: SectionPanelProps) {
  return (
    <article
      className="rounded border border-slate-200 bg-white p-5"
      id={section.id}
    >
      <p className="text-sm font-medium text-slate-500">{section.status}</p>
      <h2 className="mt-2 text-xl font-semibold text-slate-950">
        {section.label}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {section.description}
      </p>
    </article>
  );
}
