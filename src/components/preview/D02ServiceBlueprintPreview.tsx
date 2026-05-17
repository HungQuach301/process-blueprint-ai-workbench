"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SessionFrame } from "@/components/layout/SessionFrame";
import type { ProcessTask } from "@/lib/models/process-task";
import type { TemplateProfile } from "@/lib/models/template-profile";
import {
  sampleBpmnTemplateProfile,
  sampleProcessTasks,
  sampleServiceBlueprintTemplateProfile
} from "@/lib/sample-data/sme-online-loan";

type BlueprintRow =
  | "STEPS"
  | "PHASE"
  | "TIME"
  | "EVIDENCE"
  | "CUSTOMER ACTIONS"
  | "FRONT-STAGE INTERACTIONS — PEOPLE"
  | "FRONT-STAGE INTERACTIONS — SYSTEM / CHANNEL"
  | "BACK-STAGE INTERACTIONS — PEOPLE"
  | "BACK-STAGE INTERACTIONS — SYSTEM / TOOLS"
  | "SUPPORT PROCESSES"
  | "DATA / CONTROL"
  | "OUTCOME / END STATE";

const TASKS_STORAGE_KEY = "process-blueprint-ai-workbench:process-tasks";
const TEMPLATES_STORAGE_KEY =
  "process-blueprint-ai-workbench:template-profiles";
const D02_STORAGE_KEY = "process-blueprint-ai-workbench:selected-d02-template";
const ARTIFACT_STATUS_EVENT = "process-blueprint-artifact-status-change";

type D02ServiceBlueprintPreviewProps = {
  artifactStatus?: string;
  gateStatus?: string;
  templateName?: string;
};

const defaultRows: BlueprintRow[] = [
  "STEPS",
  "PHASE",
  "TIME",
  "EVIDENCE",
  "CUSTOMER ACTIONS",
  "FRONT-STAGE INTERACTIONS — PEOPLE",
  "FRONT-STAGE INTERACTIONS — SYSTEM / CHANNEL",
  "BACK-STAGE INTERACTIONS — PEOPLE",
  "BACK-STAGE INTERACTIONS — SYSTEM / TOOLS",
  "SUPPORT PROCESSES",
  "DATA / CONTROL",
  "OUTCOME / END STATE"
];

const topContextRows: BlueprintRow[] = ["STEPS", "PHASE", "TIME", "EVIDENCE"];

const rowColors: Record<BlueprintRow, string> = {
  STEPS: "bg-slate-50",
  PHASE: "bg-indigo-50",
  TIME: "bg-slate-50",
  EVIDENCE: "bg-slate-50",
  "CUSTOMER ACTIONS": "bg-cyan-50",
  "FRONT-STAGE INTERACTIONS — PEOPLE": "bg-sky-50",
  "FRONT-STAGE INTERACTIONS — SYSTEM / CHANNEL": "bg-blue-50",
  "BACK-STAGE INTERACTIONS — PEOPLE": "bg-fuchsia-50",
  "BACK-STAGE INTERACTIONS — SYSTEM / TOOLS": "bg-violet-50",
  "SUPPORT PROCESSES": "bg-slate-50",
  "DATA / CONTROL": "bg-slate-100",
  "OUTCOME / END STATE": "bg-red-50"
};

function normalize(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function lower(value: string | null | undefined) {
  return normalize(value).toLowerCase();
}

function hasAny(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

function readJsonArray<T>(key: string, fallback: T[]) {
  const savedValue = window.localStorage.getItem(key);

  if (!savedValue) {
    return fallback;
  }

  const parsedValue = JSON.parse(savedValue);

  return Array.isArray(parsedValue) ? (parsedValue as T[]) : fallback;
}

function readProcessTasks() {
  return readJsonArray<ProcessTask>(TASKS_STORAGE_KEY, sampleProcessTasks);
}

function readSelectedD02Template() {
  const templates = readJsonArray<TemplateProfile>(TEMPLATES_STORAGE_KEY, [
    sampleServiceBlueprintTemplateProfile,
    sampleBpmnTemplateProfile
  ]);
  const selectedTemplateId =
    window.localStorage.getItem(D02_STORAGE_KEY) ??
    sampleServiceBlueprintTemplateProfile.id;

  return (
    templates.find((template) => template.id === selectedTemplateId) ??
    sampleServiceBlueprintTemplateProfile
  );
}

function getRows(templateProfile: TemplateProfile): BlueprintRow[] {
  const configuredRows = templateProfile.rowRules.rows;

  if (!Array.isArray(configuredRows)) {
    return defaultRows;
  }

  const rows = configuredRows.flatMap((row) =>
    row === "FRONT-STAGE INTERACTIONS"
      ? [
          "FRONT-STAGE INTERACTIONS — PEOPLE",
          "FRONT-STAGE INTERACTIONS — SYSTEM / CHANNEL"
        ]
      : [row]
  );
  const knownRows = rows.filter((row): row is BlueprintRow =>
    defaultRows.includes(row as BlueprintRow)
  );

  return [...new Set([...knownRows, ...defaultRows])];
}

function getPhases(tasks: ProcessTask[]) {
  const phases = [...new Set(tasks.map((task) => normalize(task.phase)).filter(Boolean))];

  return phases.length > 0 ? phases : ["Process"];
}

function isCustomerActor(actor: string) {
  return hasAny(actor, ["customer", "khách hàng", "khach hang", "sme customer"]);
}

function isBankHumanActor(actor: string) {
  return hasAny(actor, ["rm", "ops", "ops support", "credit approver", "approver", "bank user", "credit"]);
}

function isSystemActor(actor: string) {
  return actor === "system" || hasAny(actor, ["system", "hệ thống", "he thong"]);
}

function isCustomerFacingNotification(task: ProcessTask) {
  const text = lower(`${task.taskName} ${task.output} ${task.actor} ${task.system} ${task.comment}`);

  return (
    lower(task.bpmnType) === "sendtask" &&
    hasAny(text, ["customer", "khách hàng", "khach hang", "notification", "notify", "thông báo", "thong bao"])
  );
}

function isDataOrControlArtifact(task: ProcessTask) {
  const actor = lower(task.actor);
  const taskName = lower(task.taskName);

  return (
    (lower(task.rowType) === "data" ||
      lower(task.bpmnType) === "dataobject" ||
      lower(task.bpmnType) === "datastore" ||
      lower(task.taskNature) === "data" ||
      lower(task.taskNature) === "control" ||
      hasAny(taskName, ["stores", "store", "updates", "update", "persists", "audit"])) &&
    !isCustomerActor(actor) &&
    !isBankHumanActor(actor)
  );
}

function mapTaskToRow(task: ProcessTask): BlueprintRow {
  const bpmnType = lower(task.bpmnType);
  const compactBpmnType = bpmnType.replace(/[^a-z0-9]/g, "");

  if (compactBpmnType === "endevent") {
    return "OUTCOME / END STATE";
  }

  switch (normalize(task.customerInteractionType)) {
    case "Customer Action":
      return "CUSTOMER ACTIONS";
    case "Front-stage People":
      return "FRONT-STAGE INTERACTIONS — PEOPLE";
    case "Front-stage System":
      return "FRONT-STAGE INTERACTIONS — SYSTEM / CHANNEL";
    case "Back-stage People":
      return "BACK-STAGE INTERACTIONS — PEOPLE";
    case "Back-stage System":
      return "BACK-STAGE INTERACTIONS — SYSTEM / TOOLS";
    case "Support Process":
      return "SUPPORT PROCESSES";
    case "Data / Control":
      return "DATA / CONTROL";
  }

  const actor = lower(task.actor);

  if (lower(task.rowType) === "gateway" || bpmnType.includes("gateway")) {
    if (isCustomerActor(actor)) {
      return "CUSTOMER ACTIONS";
    }

    if (isSystemActor(actor)) {
      return "BACK-STAGE INTERACTIONS — SYSTEM / TOOLS";
    }

    if (isBankHumanActor(actor)) {
      return "BACK-STAGE INTERACTIONS — PEOPLE";
    }
  }

  if (isCustomerActor(actor)) {
    return "CUSTOMER ACTIONS";
  }

  if (isBankHumanActor(actor)) {
    return "BACK-STAGE INTERACTIONS — PEOPLE";
  }

  if (isCustomerFacingNotification(task)) {
    return "FRONT-STAGE INTERACTIONS — SYSTEM / CHANNEL";
  }

  if (isSystemActor(actor) && bpmnType === "servicetask") {
    return "BACK-STAGE INTERACTIONS — SYSTEM / TOOLS";
  }

  if (isDataOrControlArtifact(task)) {
    return "DATA / CONTROL";
  }

  return "BACK-STAGE INTERACTIONS — PEOPLE";
}

function uniqueConcise(values: string[], limit = 3) {
  return [...new Set(values.map(normalize).filter(Boolean))].slice(0, limit);
}

function joinOrTbd(values: string[]) {
  const text = values.length > 0 ? values.join(" | ") : "TBD";

  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
}

function getContextCellValue(row: BlueprintRow, phase: string, tasks: ProcessTask[]) {
  const phaseTasks = tasks.filter((task) => (normalize(task.phase) || phase) === phase);

  if (row === "STEPS") {
    return joinOrTbd(uniqueConcise(phaseTasks.map((task) => task.group || task.phase || task.taskName)));
  }

  if (row === "PHASE") {
    return normalize(phase) || "TBD";
  }

  if (row === "TIME") {
    return joinOrTbd(uniqueConcise(phaseTasks.map((task) => task.sla)));
  }

  if (row === "EVIDENCE") {
    return joinOrTbd(
      uniqueConcise(
        phaseTasks.flatMap((task) => [
          task.input,
          task.output,
          task.dataObject,
          task.system,
          task.channel ?? ""
        ]),
        4
      )
    );
  }

  return "";
}

function getBpmnBadge(task: ProcessTask) {
  const bpmnType = lower(task.bpmnType);
  const rowType = lower(task.rowType);

  if (rowType === "gateway" || bpmnType.includes("gateway")) {
    return "◇";
  }

  if (isDataOrControlArtifact(task) || bpmnType === "dataobject" || bpmnType === "datastore") {
    return "▣";
  }

  if (bpmnType === "startevent" || bpmnType === "endevent") {
    return "◎";
  }

  if (bpmnType === "sendtask") {
    return "✉";
  }

  if (bpmnType === "servicetask") {
    return "⚙";
  }

  return "👤";
}

function getNatureBadge(task: ProcessTask) {
  switch (lower(task.taskNature)) {
    case "automatic":
      return "A";
    case "semiautomatic":
    case "semi-automatic":
      return "S";
    case "manual":
      return "M";
    default:
      return "";
  }
}

function getDataActionBadge(task: ProcessTask) {
  switch (lower(task.dataAction)) {
    case "pull":
    case "read":
      return "↓";
    case "push":
    case "store":
    case "update":
      return "↑";
    default:
      return "";
  }
}

function taskBadges(task: ProcessTask) {
  return [getBpmnBadge(task), getNatureBadge(task), getDataActionBadge(task)].filter(Boolean);
}

function TaskCard({ task }: { task: ProcessTask }) {
  const footer = [normalize(task.system) || "No system/app", normalize(task.channel)]
    .filter(Boolean)
    .join("\n");
  const badges = taskBadges(task);

  return (
    <div className="w-72 shrink-0 overflow-hidden rounded border border-slate-400 bg-white text-xs shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-slate-300 bg-slate-200 px-3 py-2 font-semibold text-slate-950">
        <span>{normalize(task.actor) || "No actor"}</span>
        <span className="flex shrink-0 gap-1">
          {badges.map((badge) => (
            <span
              className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-700"
              key={badge}
            >
              {badge}
            </span>
          ))}
        </span>
      </div>
      <div className="min-h-24 border-b border-slate-300 bg-white px-3 py-2 text-slate-800">
        <p className="font-medium text-slate-950">
          {normalize(task.taskName) || "(Chưa có tên task)"}
        </p>
      </div>
      <div className="whitespace-pre-line bg-slate-50 px-3 py-2 text-slate-700">
        {footer}
      </div>
    </div>
  );
}

function MetadataLegend() {
  return (
    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
      {[
        "👤 User Task",
        "⚙ Service Task",
        "✉ Send Task",
        "◇ Gateway",
        "◎ Start/End",
        "▣ Data/Control",
        "M Manual",
        "A Automatic",
        "S Semi-auto",
        "↓ Pull/Read",
        "↑ Push/Store/Update"
      ].map((item) => (
        <span className="rounded border border-slate-200 bg-white px-2 py-1" key={item}>
          {item}
        </span>
      ))}
    </div>
  );
}

function SeparatorRow({ label, variant }: { label: string; variant: "solid" | "prominent" | "dashed" }) {
  const lineClass =
    variant === "prominent"
      ? "border-red-600 border-t-4"
      : variant === "dashed"
        ? "border-slate-500 border-t-2 border-dashed"
        : "border-slate-900 border-t-2";

  return (
    <>
      <div className="sticky left-0 z-10 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
        {label}
      </div>
      <div className={`col-span-full self-center ${lineClass}`} />
    </>
  );
}

export function D02ServiceBlueprintPreview({
  artifactStatus,
  gateStatus,
  templateName
}: D02ServiceBlueprintPreviewProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [tasks, setTasks] = useState<ProcessTask[]>([]);
  const [template, setTemplate] = useState<TemplateProfile>(sampleServiceBlueprintTemplateProfile);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function refreshPreviewData() {
    setTasks(readProcessTasks());
    setTemplate(readSelectedD02Template());
  }

  useEffect(() => {
    refreshPreviewData();
    window.addEventListener(ARTIFACT_STATUS_EVENT, refreshPreviewData);

    return () => {
      window.removeEventListener(ARTIFACT_STATUS_EVENT, refreshPreviewData);
    };
  }, []);

  const phases = useMemo(() => getPhases(tasks), [tasks]);
  const rows = useMemo(() => getRows(template), [template]);
  const resolvedTemplateName = templateName?.trim() || template.name;

  function updateScrollHints() {
    const container = scrollContainerRef.current;

    if (!container) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    setCanScrollLeft(container.scrollLeft > 4);
    setCanScrollRight(
      container.scrollLeft + container.clientWidth < container.scrollWidth - 4
    );
  }

  function scrollPreviewBy(delta: number) {
    const container = scrollContainerRef.current;

    if (!container) {
      return;
    }

    container.scrollBy({
      behavior: "smooth",
      left: delta
    });
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(updateScrollHints, 0);

    window.addEventListener("resize", updateScrollHints);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", updateScrollHints);
    };
  }, [phases.length, rows.length, tasks.length]);

  return (
    <SessionFrame
      bodyClassName="p-4"
      description={`Template: ${resolvedTemplateName} | Tasks: ${tasks.length}`}
      title="Service Blueprint read-only preview"
    >
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase text-slate-500">
              D02 Preview
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Scroll horizontally to review phases and task cards that continue off-screen.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="rounded border border-slate-200 bg-white px-2 py-1">
              Template: {resolvedTemplateName}
            </span>
            <span className="rounded border border-slate-200 bg-white px-2 py-1">
              Status: {artifactStatus ?? "Not generated"}
            </span>
            <span className="rounded border border-slate-200 bg-white px-2 py-1">
              Gate: {gateStatus ?? "Not generated"}
            </span>
          </div>
        </div>
        <MetadataLegend />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-t border border-b-0 border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span>
            {canScrollRight || canScrollLeft
              ? "More blueprint content is available horizontally."
              : "All visible content fits in the current preview width."}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="rounded border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canScrollLeft}
              onClick={() => scrollPreviewBy(-420)}
              type="button"
            >
              Scroll left
            </button>
            <button
              className="rounded border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canScrollRight}
              onClick={() => scrollPreviewBy(420)}
              type="button"
            >
              Scroll right
            </button>
          </div>
        </div>
        <div className="relative">
        {canScrollLeft ? (
          <div className="pointer-events-none absolute inset-y-0 left-0 z-30 w-10 bg-gradient-to-r from-white to-transparent" />
        ) : null}
        {canScrollRight ? (
          <div className="pointer-events-none absolute inset-y-0 right-0 z-30 w-10 bg-gradient-to-l from-white to-transparent" />
        ) : null}
        <div
          className="w-full max-w-full min-w-0 overflow-auto rounded-b border border-slate-200"
          onScroll={updateScrollHints}
          ref={scrollContainerRef}
        >
        <div
          className="grid min-w-max text-sm"
          style={{
            gridTemplateColumns: `240px repeat(${phases.length}, minmax(360px, 1fr))`
          }}
        >
          <div className="sticky left-0 z-20 border-b border-r border-slate-200 bg-slate-100 p-3 font-semibold text-slate-950">
            Layer
          </div>
          {phases.map((phase) => (
            <div
              className="border-b border-r border-slate-200 bg-sky-100 p-3 text-center font-semibold text-slate-950"
              key={phase}
            >
              {phase}
            </div>
          ))}

          {rows.map((row) => (
            <div className="contents" key={row}>
              <div className={`sticky left-0 z-10 border-b border-r border-slate-200 p-3 font-semibold text-slate-800 ${rowColors[row]}`}>
                {row}
              </div>
              {phases.map((phase) => {
                const phaseTasks = tasks.filter((task) => normalize(task.phase) === phase);
                const rowTasks = phaseTasks.filter((task) => mapTaskToRow(task) === row);

                return (
                  <div
                    className={`min-h-36 border-b border-r border-slate-200 p-3 ${rowColors[row]}`}
                    key={`${row}-${phase}`}
                  >
                    {topContextRows.includes(row) ? (
                      <p className="text-sm leading-6 text-slate-700">
                        {getContextCellValue(row, phase, tasks)}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {rowTasks.map((task) => (
                          <TaskCard key={task.id} task={task} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {row === "CUSTOMER ACTIONS" ? (
                <SeparatorRow label="Line of Interaction" variant="solid" />
              ) : null}
              {row === "FRONT-STAGE INTERACTIONS — SYSTEM / CHANNEL" ? (
                <SeparatorRow label="Line of Visibility" variant="prominent" />
              ) : null}
              {row === "BACK-STAGE INTERACTIONS — SYSTEM / TOOLS" ? (
                <SeparatorRow label="Line of Internal Interaction" variant="dashed" />
              ) : null}
            </div>
          ))}
        </div>
        </div>
        </div>
    </SessionFrame>
  );
}
