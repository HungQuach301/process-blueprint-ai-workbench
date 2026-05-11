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
    <section className="surface-card w-full max-w-full min-w-0 overflow-hidden">
      {hasHeader ? (
        <div className="section-header w-full max-w-full min-w-0 overflow-hidden p-5">
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              {title ? (
                <h2 className="section-title">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="section-description mt-2">
                  {description}
                </p>
              ) : null}
            </div>

            {actions ? (
              <div className="section-actions lg:justify-end">
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
