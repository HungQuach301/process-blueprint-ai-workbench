import type { ReactNode } from "react";

type SessionFrameProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  contentScroll?: "none" | "x" | "y" | "xy";
};

const scrollClasses: Record<NonNullable<SessionFrameProps["contentScroll"]>, string> = {
  none: "overflow-hidden",
  x: "overflow-x-auto",
  y: "overflow-y-auto",
  xy: "overflow-auto"
};

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function SessionFrame({
  title,
  description,
  actions,
  children,
  bodyClassName,
  contentScroll = "none"
}: SessionFrameProps) {
  const hasHeader = Boolean(title || description || actions);

  return (
    <section className="w-full max-w-full min-w-0 overflow-hidden rounded border border-slate-200 bg-white">
      {hasHeader ? (
        <div className="w-full max-w-full min-w-0 overflow-hidden border-b border-slate-200 p-4">
          <div className="flex min-w-0 flex-wrap gap-3 lg:items-start lg:justify-between">
            <div className="min-w-0">
              {title ? (
                <h2 className="text-2xl font-semibold text-slate-950">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {description}
                </p>
              ) : null}
            </div>

            {actions ? (
              <div className="flex min-w-0 max-w-full flex-wrap gap-2">
                {actions}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div
        className={joinClasses(
          "w-full max-w-full min-w-0",
          scrollClasses[contentScroll],
          bodyClassName
        )}
      >
        {children}
      </div>
    </section>
  );
}
