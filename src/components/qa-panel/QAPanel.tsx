"use client";

import type { QaIssue, QaSeverity } from "@/lib/qa/task-register-rules";

type QAPanelProps = {
  issues: QaIssue[];
  onIssueClick: (stepId: string) => void;
  onDownloadReport: () => void;
};

const severityLabels: Record<QaSeverity, string> = {
  error: "Lỗi",
  warning: "Cảnh báo",
  suggestion: "Gợi ý"
};

const severityStyles: Record<QaSeverity, string> = {
  error: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  suggestion: "border-sky-200 bg-sky-50 text-sky-800"
};

const severityOrder: QaSeverity[] = ["error", "warning", "suggestion"];

export function QAPanel({
  issues,
  onIssueClick,
  onDownloadReport
}: QAPanelProps) {
  const groupedIssues = severityOrder.map((severity) => ({
    severity,
    issues: issues.filter((issue) => issue.severity === severity)
  }));

  return (
    <section className="rounded border border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase text-slate-500">
              QA Engine
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
              Kiểm tra chất lượng Process Task Register
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              QA chạy lại tự động khi dữ liệu trong bảng thay đổi. Click vào
              issue để nhảy tới dòng liên quan nếu còn tồn tại.
            </p>
            <p className="mt-3 text-sm font-semibold text-slate-950">
              Tổng số issue: {issues.length}
            </p>
          </div>

          <button
            className="w-fit rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={onDownloadReport}
            type="button"
          >
            Download QA Report
          </button>
        </div>
      </div>

      <div className="grid gap-4 p-4">
        {groupedIssues.map((group) => (
          <section className="rounded border border-slate-200" key={group.severity}>
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-950">
                {severityLabels[group.severity]}
              </h3>
              <span
                className={`rounded border px-2 py-1 text-xs font-semibold ${severityStyles[group.severity]}`}
              >
                {group.issues.length}
              </span>
            </div>

            {group.issues.length > 0 ? (
              <div className="divide-y divide-slate-200">
                {group.issues.map((issue) => (
                  <button
                    className="block w-full px-4 py-3 text-left hover:bg-slate-50"
                    key={issue.id}
                    onClick={() => onIssueClick(issue.stepId)}
                    type="button"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {issue.stepId}
                      </span>
                      <span
                        className={`rounded border px-2 py-1 text-xs font-semibold ${severityStyles[issue.severity]}`}
                      >
                        {severityLabels[issue.severity]}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {issue.taskName}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{issue.message}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Cách sửa: {issue.suggestedFix}
                    </p>
                    {issue.recommendations?.length ? (
                      <div className="mt-3 rounded border border-slate-200 bg-white p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">
                          Recommendation
                        </p>
                        <div className="mt-2 space-y-2">
                          {issue.recommendations.map((recommendation, index) => (
                            <div key={`${recommendation.type}-${index}`}>
                              <p className="text-sm font-semibold text-slate-800">
                                {recommendation.title}
                              </p>
                              <p className="mt-1 text-sm text-slate-600">
                                {recommendation.description}
                              </p>
                              {recommendation.previewText ? (
                                <p className="mt-1 whitespace-pre-line text-xs text-slate-500">
                                  Preview: {recommendation.previewText}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-4 py-3 text-sm text-slate-500">
                Không có issue trong nhóm này.
              </p>
            )}
          </section>
        ))}
      </div>
    </section>
  );
}
