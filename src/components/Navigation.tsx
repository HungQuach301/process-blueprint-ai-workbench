import type { NavigationSection } from "@/lib/sample-data/navigation-sections";

type NavigationProps = {
  sections: NavigationSection[];
};

export function Navigation({ sections }: NavigationProps) {
  return (
    <aside className="sticky top-6 hidden h-fit w-72 shrink-0 rounded border border-slate-200 bg-white p-4 md:block">
      <div className="mb-4">
        <p className="text-sm font-semibold text-slate-950">Workbench</p>
        <p className="mt-1 text-sm text-slate-500">Navigation sections</p>
      </div>

      <nav aria-label="Workbench sections">
        <ol className="space-y-1">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                className="block rounded px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                href={`#${section.id}`}
              >
                {section.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </aside>
  );
}
