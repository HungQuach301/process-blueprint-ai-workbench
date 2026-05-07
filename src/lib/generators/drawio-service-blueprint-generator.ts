import type { ProcessTask } from "@/lib/models/process-task";
import type { TemplateProfile } from "@/lib/models/template-profile";

type BlueprintRow =
  | "STEPS"
  | "PHASE"
  | "TIME"
  | "EVIDENCE"
  | "CUSTOMER ACTIONS"
  | "FRONT-STAGE INTERACTIONS — PEOPLE"
  | "FRONT-STAGE INTERACTIONS — SYSTEM / CHANNEL"
  | "BACK-STAGE INTERACTIONS — SYSTEM / TOOLS"
  | "BACK-STAGE INTERACTIONS — PEOPLE"
  | "SUPPORT PROCESSES"
  | "DATA / CONTROL";

type BlueprintCell = {
  id: string;
  value: string;
  style: string;
  parent?: string;
  vertex?: boolean;
  edge?: boolean;
  source?: string;
  target?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  points?: Array<{ x: number; y: number }>;
};

type CardPosition = {
  task: ProcessTask;
  containerId: string;
  middleId: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

const DEFAULT_ROWS: BlueprintRow[] = [
  "STEPS",
  "PHASE",
  "TIME",
  "EVIDENCE",
  "CUSTOMER ACTIONS",
  "FRONT-STAGE INTERACTIONS — PEOPLE",
  "FRONT-STAGE INTERACTIONS — SYSTEM / CHANNEL",
  "BACK-STAGE INTERACTIONS — SYSTEM / TOOLS",
  "BACK-STAGE INTERACTIONS — PEOPLE",
  "SUPPORT PROCESSES",
  "DATA / CONTROL"
];

const ROW_LABEL_WIDTH = 250;
const PHASE_HEADER_HEIGHT = 54;
const ROW_HEIGHT = 190;
const CARD_WIDTH = 300;
const CARD_HEIGHT = 132;
const CARD_GAP_X = 24;
const CARD_GAP_Y = 18;
const HEADER_HEIGHT = 32;
const FOOTER_HEIGHT = 30;
const layout = {
  cardWidth: CARD_WIDTH,
  cardHeight: CARD_HEIGHT,
  cardGapX: CARD_GAP_X,
  cardGapY: CARD_GAP_Y,
  minPhaseWidth: 430,
  maxCardsPerLine: 4,
  rowPadding: 18,
  phasePadding: 24
};

const rowColors: Record<BlueprintRow, string> = {
  STEPS: "#f8fafc",
  PHASE: "#eef2ff",
  TIME: "#f8fafc",
  EVIDENCE: "#f8fafc",
  "CUSTOMER ACTIONS": "#ecfeff",
  "FRONT-STAGE INTERACTIONS — PEOPLE": "#f0f9ff",
  "FRONT-STAGE INTERACTIONS — SYSTEM / CHANNEL": "#eff6ff",
  "BACK-STAGE INTERACTIONS — SYSTEM / TOOLS": "#f5f3ff",
  "BACK-STAGE INTERACTIONS — PEOPLE": "#faf5ff",
  "SUPPORT PROCESSES": "#f8fafc",
  "DATA / CONTROL": "#f1f5f9"
};

const cardColors = {
  header: "#e2e8f0",
  middle: "#ffffff",
  footer: "#f8fafc",
  border: "#64748b"
};

type ActorGroup = "customer" | "rm" | "ops" | "approver" | "system" | "dataControl";

type CardElementType = "task" | "gateway" | "dataControl" | "startEvent" | "endEvent" | "send";

type CardNotation = {
  containerFill: string;
  borderColor: string;
  strokeWidth: number;
  dashed?: boolean;
  rounded?: number;
  headerFill: string;
  middleFill: string;
  footerFill: string;
  middleExtras?: string;
  footerExtras?: string;
};

const actorHeaderColors: Record<ActorGroup, string> = {
  customer: "#ccfbf1",
  rm: "#dbeafe",
  ops: "#ede9fe",
  approver: "#fef3c7",
  system: "#e0f2fe",
  dataControl: "#f1f5f9"
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalize(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function lower(value: string | null | undefined) {
  return normalize(value).toLowerCase();
}

function sanitizeId(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/^([^a-zA-Z_])/, "_$1");
}

function hasAny(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

function isCustomerActor(actor: string) {
  return hasAny(actor, ["customer", "khách hàng", "khach hang", "sme customer"]);
}

function isBankHumanActor(actor: string) {
  return hasAny(actor, [
    "rm",
    "ops",
    "ops support",
    "credit approver",
    "approver",
    "bank user",
    "credit"
  ]);
}

function isSystemActor(actor: string) {
  return actor === "system" || hasAny(actor, ["system", "hệ thống", "he thong"]);
}

function isCustomerFacingNotification(task: ProcessTask) {
  const text = lower(`${task.taskName} ${task.output} ${task.actor} ${task.system} ${task.comment}`);

  return (
    lower(task.bpmnType) === "sendtask" &&
    hasAny(text, [
      "customer",
      "khách hàng",
      "khach hang",
      "notification",
      "notify",
      "thông báo",
      "thong bao"
    ])
  );
}

function isDataOrControlArtifact(task: ProcessTask) {
  const actor = lower(task.actor);
  const bpmnType = lower(task.bpmnType);
  const rowType = lower(task.rowType);
  const taskName = lower(task.taskName);
  const taskNature = lower(task.taskNature);

  return (
    (rowType === "data" ||
      bpmnType === "dataobject" ||
      bpmnType === "datastore" ||
      taskNature === "data" ||
      taskNature === "control" ||
      hasAny(taskName, ["stores", "store", "updates", "update", "persists", "audit"])) &&
    !isCustomerActor(actor) &&
    !isBankHumanActor(actor)
  );
}

function mapCustomerInteractionTypeToRow(task: ProcessTask): BlueprintRow | null {
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
    default:
      return null;
  }
}

function getActorGroup(task: ProcessTask): ActorGroup {
  const actor = lower(`${task.actor} ${task.actorLane}`);
  const bpmnType = lower(task.bpmnType).replace(/[^a-z0-9]/g, "");
  const rowType = lower(task.rowType);

  if (isDataOrControlArtifact(task) || rowType.includes("data") || ["dataobject", "datastore"].includes(bpmnType)) {
    return "dataControl";
  }

  if (isCustomerActor(actor)) {
    return "customer";
  }

  if (hasAny(actor, ["ops", "ops support"])) {
    return "ops";
  }

  if (hasAny(actor, ["credit approver", "approver", "credit"])) {
    return "approver";
  }

  if (hasAny(actor, ["rm", "bank user"])) {
    return "rm";
  }

  if (isSystemActor(actor)) {
    return "system";
  }

  return "rm";
}

function getCardElementType(task: ProcessTask): CardElementType {
  const bpmnType = lower(task.bpmnType);
  const compactBpmnType = bpmnType.replace(/[^a-z0-9]/g, "");
  const rowType = lower(task.rowType);

  if (rowType === "gateway" || bpmnType.includes("gateway")) {
    return "gateway";
  }

  if (isDataOrControlArtifact(task) || rowType.includes("data") || ["dataobject", "datastore"].includes(compactBpmnType)) {
    return "dataControl";
  }

  if (compactBpmnType === "startevent") {
    return "startEvent";
  }

  if (compactBpmnType === "endevent") {
    return "endEvent";
  }

  if (compactBpmnType === "sendtask" || isCustomerFacingNotification(task)) {
    return "send";
  }

  return "task";
}

function getCardNotation(task: ProcessTask): CardNotation {
  const actorGroup = getActorGroup(task);
  const elementType = getCardElementType(task);
  const base: CardNotation = {
    containerFill: "#ffffff",
    borderColor: cardColors.border,
    strokeWidth: 1,
    rounded: 1,
    headerFill: actorHeaderColors[actorGroup],
    middleFill: cardColors.middle,
    footerFill: cardColors.footer
  };

  if (elementType === "gateway") {
    return {
      ...base,
      containerFill: "#fffbeb",
      borderColor: "#d97706",
      strokeWidth: 2,
      middleFill: "#fef3c7",
      footerFill: "#fff7ed",
      middleExtras: "fontStyle=1"
    };
  }

  if (elementType === "dataControl") {
    return {
      ...base,
      containerFill: "#f8fafc",
      borderColor: "#64748b",
      strokeWidth: 2,
      dashed: true,
      middleFill: "#f1f5f9",
      footerFill: "#e2e8f0"
    };
  }

  if (elementType === "startEvent") {
    return {
      ...base,
      containerFill: "#f0fdf4",
      borderColor: "#16a34a",
      strokeWidth: 2,
      rounded: 1,
      middleFill: "#dcfce7",
      footerFill: "#f0fdf4",
      middleExtras: "fontStyle=1"
    };
  }

  if (elementType === "endEvent") {
    return {
      ...base,
      containerFill: "#fef2f2",
      borderColor: "#b91c1c",
      strokeWidth: 3,
      rounded: 1,
      middleFill: "#fee2e2",
      footerFill: "#fef2f2",
      middleExtras: "fontStyle=1"
    };
  }

  if (elementType === "send") {
    return {
      ...base,
      containerFill: "#eff6ff",
      borderColor: "#2563eb",
      strokeWidth: 2,
      middleFill: "#dbeafe",
      footerFill: "#eff6ff",
      footerExtras: "fontStyle=2"
    };
  }

  return base;
}

function getTemplateRows(templateProfile: TemplateProfile): BlueprintRow[] {
  const configuredRows = templateProfile.rowRules.rows;

  if (
    Array.isArray(configuredRows) &&
    configuredRows.every((row) => typeof row === "string")
  ) {
    return configuredRows.flatMap((row) =>
      row === "FRONT-STAGE INTERACTIONS"
        ? [
            "FRONT-STAGE INTERACTIONS — PEOPLE",
            "FRONT-STAGE INTERACTIONS — SYSTEM / CHANNEL"
          ]
        : [row]
    ) as BlueprintRow[];
  }

  return DEFAULT_ROWS;
}

function getPhases(tasks: ProcessTask[]) {
  const phases = [...new Set(tasks.map((task) => normalize(task.phase)).filter(Boolean))];

  return phases.length > 0 ? phases : ["Process"];
}

function mapTaskToRow(task: ProcessTask): BlueprintRow {
  const explicitRow = mapCustomerInteractionTypeToRow(task);

  if (explicitRow) {
    return explicitRow;
  }

  const actor = lower(task.actor);
  const bpmnType = lower(task.bpmnType);
  const taskNature = lower(task.taskNature);
  const taskName = lower(task.taskName);
  const riskControl = lower(task.riskControl);
  const sla = lower(task.sla);

  if (task.rowType === "gateway" || hasAny(bpmnType, ["gateway"])) {
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

  if (isSystemActor(actor) && bpmnType === "servicetask") {
    return "BACK-STAGE INTERACTIONS — SYSTEM / TOOLS";
  }

  if (isCustomerFacingNotification(task)) {
    return "FRONT-STAGE INTERACTIONS — SYSTEM / CHANNEL";
  }

  if (isDataOrControlArtifact(task)) {
    return "DATA / CONTROL";
  }

  if (
    normalize(task.riskControl) ||
    normalize(task.sla) ||
    hasAny(`${taskName} ${riskControl} ${sla}`, ["policy", "config", "control", "sla"])
  ) {
    return "SUPPORT PROCESSES";
  }

  return "BACK-STAGE INTERACTIONS — PEOPLE";
}

function getRowIndex(rows: BlueprintRow[], row: BlueprintRow) {
  const index = rows.indexOf(row);

  return index >= 0 ? index : rows.indexOf("SUPPORT PROCESSES");
}

function uniqueConcise(values: string[], limit = 3) {
  const uniqueValues = [...new Set(values.map(normalize).filter(Boolean))];

  return uniqueValues.slice(0, limit);
}

function truncateText(value: string, maxLength = 120) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function joinOrTbd(values: string[], maxLength = 120) {
  const text = values.length > 0 ? values.join(" | ") : "TBD";

  return truncateText(text, maxLength);
}

function getContextCellValue(row: BlueprintRow, phase: string, tasks: ProcessTask[]) {
  if (!["STEPS", "PHASE", "TIME", "EVIDENCE"].includes(row)) {
    return "";
  }

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
    ),
    140
  );
}

function makeCell(cell: BlueprintCell) {
  const attrs = [
    `id="${escapeXml(cell.id)}"`,
    `value="${escapeXml(cell.value)}"`,
    `style="${escapeXml(cell.style)}"`,
    `parent="${escapeXml(cell.parent ?? "1")}"`
  ];

  if (cell.vertex) {
    attrs.push('vertex="1"');
  }

  if (cell.edge) {
    attrs.push('edge="1"');
  }

  if (cell.source) {
    attrs.push(`source="${escapeXml(cell.source)}"`);
  }

  if (cell.target) {
    attrs.push(`target="${escapeXml(cell.target)}"`);
  }

  if (cell.edge) {
    const points = cell.points ?? [];

    return [
      `    <mxCell ${attrs.join(" ")}>`,
      "      <mxGeometry relative=\"1\" as=\"geometry\">",
      points.length > 0
        ? `        <Array as="points">${points
            .map((point) => `<mxPoint x="${point.x}" y="${point.y}" />`)
            .join("")}</Array>`
        : "",
      "      </mxGeometry>",
      "    </mxCell>"
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `    <mxCell ${attrs.join(" ")}>`,
    `      <mxGeometry x="${cell.x ?? 0}" y="${cell.y ?? 0}" width="${
      cell.width ?? 0
    }" height="${cell.height ?? 0}" as="geometry" />`,
    "    </mxCell>"
  ].join("\n");
}

function textStyle(fillColor: string, extras = "") {
  return [
    "rounded=0",
    "whiteSpace=wrap",
    "html=1",
    "align=center",
    "verticalAlign=middle",
    `fillColor=${fillColor}`,
    "strokeColor=#cbd5e1",
    "fontColor=#0f172a",
    extras
  ]
    .filter(Boolean)
    .join(";");
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

function cardBadges(task: ProcessTask) {
  return [getBpmnBadge(task), getNatureBadge(task), getDataActionBadge(task)]
    .filter(Boolean)
    .join(" ");
}

function cardText(task: ProcessTask) {
  const elementType = getCardElementType(task);
  const title = normalize(task.taskName) || "(Chưa có tên task)";
  const elementLabels: Record<CardElementType, string> = {
    task: title,
    gateway: `Decision: ${title}`,
    dataControl: `Data / Control: ${title}`,
    startEvent: `Start Event: ${title}`,
    endEvent: `End Event: ${title}`,
    send: `Message / Notification: ${title}`
  };

  return elementLabels[elementType];
}

function cardFooterText(task: ProcessTask) {
  const system = normalize(task.system) || "No system/app";
  const channel = normalize(task.channel);

  return channel && channel !== "Other" ? `${system}\nChannel: ${channel}` : system;
}

function buildCardCells(task: ProcessTask, x: number, y: number) {
  const safeStepId = sanitizeId(task.stepId || task.id);
  const containerId = `card_${safeStepId}`;
  const headerId = `${containerId}_header`;
  const middleId = `${containerId}_middle`;
  const footerId = `${containerId}_footer`;
  const notation = getCardNotation(task);
  const containerStyle = [
    `rounded=${notation.rounded ?? 1}`,
    "whiteSpace=wrap",
    "html=1",
    `fillColor=${notation.containerFill}`,
    `strokeColor=${notation.borderColor}`,
    `strokeWidth=${notation.strokeWidth}`,
    notation.dashed ? "dashed=1" : "",
    "shadow=0"
  ]
    .filter(Boolean)
    .join(";");

  const cells: BlueprintCell[] = [
    {
      id: containerId,
      value: "",
      style: containerStyle,
      vertex: true,
      x,
      y,
      width: layout.cardWidth,
      height: layout.cardHeight
    },
    {
      id: headerId,
      value: `${normalize(task.actor) || "No actor"} ${cardBadges(task)}`,
      style: textStyle(notation.headerFill, "fontStyle=1"),
      parent: containerId,
      vertex: true,
      x: 0,
      y: 0,
      width: layout.cardWidth,
      height: HEADER_HEIGHT
    },
    {
      id: middleId,
      value: cardText(task),
      style: textStyle(notation.middleFill, notation.middleExtras),
      parent: containerId,
      vertex: true,
      x: 0,
      y: HEADER_HEIGHT,
      width: layout.cardWidth,
      height: layout.cardHeight - HEADER_HEIGHT - FOOTER_HEIGHT
    },
    {
      id: footerId,
      value: cardFooterText(task),
      style: textStyle(notation.footerFill, notation.footerExtras),
      parent: containerId,
      vertex: true,
      x: 0,
      y: layout.cardHeight - FOOTER_HEIGHT,
      width: layout.cardWidth,
      height: FOOTER_HEIGHT
    }
  ];

  return { cells, position: { task, containerId, middleId, x, y, width: layout.cardWidth, height: layout.cardHeight } };
}

function buildSequenceConnector(source: CardPosition, target: CardPosition) {
  const sourceRight = source.x + source.width;
  const sourceMiddleY = source.y + source.height / 2;
  const targetLeft = target.x;
  const targetMiddleY = target.y + target.height / 2;
  const midX = sourceRight + (targetLeft - sourceRight) / 2;

  return {
    id: `connector_${sanitizeId(source.task.stepId)}_${sanitizeId(target.task.stepId)}`,
    value: "",
    style:
      "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#64748b;endArrow=block;endFill=1",
    edge: true,
    source: source.containerId,
    target: target.containerId,
    points: [
      { x: midX, y: sourceMiddleY },
      { x: midX, y: targetMiddleY }
    ]
  } satisfies BlueprintCell;
}

function buildDataAssociation(source: CardPosition, target: CardPosition) {
  return {
    id: `association_${sanitizeId(source.task.stepId)}_${sanitizeId(target.task.stepId)}`,
    value: "",
    style:
      "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#94a3b8;dashed=1;endArrow=open;endFill=0",
    edge: true,
    source: source.containerId,
    target: target.containerId
  } satisfies BlueprintCell;
}

function isCriticalExceptionLink(task: ProcessTask, target: CardPosition) {
  const text = lower(
    `${task.taskName} ${task.exception} ${task.exceptionHandling} ${task.comment} ${target.task.taskName} ${target.task.group}`
  );

  return hasAny(text, [
    "reject",
    "rejected",
    "rejection",
    "decline",
    "timeout",
    "sla",
    "supplement",
    "exception",
    "closed",
    "close",
    "từ chối",
    "bo sung",
    "bổ sung"
  ]);
}

function buildSeparatorCells(
  id: string,
  label: string,
  y: number,
  x: number,
  width: number,
  strokeColor: string,
  strokeWidth: number,
  dashed = false
) {
  return [
    {
      id: `${id}_label`,
      value: label,
      style:
        "text;html=1;strokeColor=none;fillColor=#ffffff;align=left;verticalAlign=middle;spacingLeft=12;fontStyle=1;fontSize=11;fontColor=#334155",
      vertex: true,
      x: 0,
      y: y - 16,
      width: ROW_LABEL_WIDTH,
      height: 32
    },
    {
      id,
      value: "",
      style: [
        "shape=line",
        "html=1",
        `strokeColor=${strokeColor}`,
        `strokeWidth=${strokeWidth}`,
        dashed ? "dashed=1" : "",
        "endArrow=none"
      ]
        .filter(Boolean)
        .join(";"),
      vertex: true,
      x,
      y,
      width,
      height: 1
    }
  ] satisfies BlueprintCell[];
}

export function generateServiceBlueprintDrawioXml(
  processTasks: ProcessTask[],
  templateProfile: TemplateProfile
) {
  const rows = getTemplateRows(templateProfile);
  const phases = getPhases(processTasks);
  const phaseIndexByName = new Map(phases.map((phase, index) => [phase, index]));
  const rowPhaseTotals = new Map<string, number>();

  processTasks.forEach((task) => {
    const phase = normalize(task.phase) || phases[0];
    const phaseIndex = phaseIndexByName.get(phase) ?? 0;
    const rowIndex = getRowIndex(rows, mapTaskToRow(task));
    const countKey = `${phaseIndex}:${rowIndex}`;

    rowPhaseTotals.set(countKey, (rowPhaseTotals.get(countKey) ?? 0) + 1);
  });

  const cardsPerLineByPhase = phases.map((_, phaseIndex) => {
    const maxCardsInPhaseRow = Math.max(
      1,
      ...rows.map((_, rowIndex) => rowPhaseTotals.get(`${phaseIndex}:${rowIndex}`) ?? 0)
    );

    return Math.min(layout.maxCardsPerLine, maxCardsInPhaseRow);
  });
  const phaseWidths = cardsPerLineByPhase.map((cardsPerLine) =>
    Math.max(
      layout.minPhaseWidth,
      layout.phasePadding * 2 +
        cardsPerLine * layout.cardWidth +
        (cardsPerLine - 1) * layout.cardGapX
    )
  );
  const phaseX = (phaseIndex: number) =>
    ROW_LABEL_WIDTH + phaseWidths.slice(0, phaseIndex).reduce((total, width) => total + width, 0);
  const rowHeights = rows.map((_, rowIndex) => {
    const maxLinesNeeded = Math.max(
      1,
      ...phases.map((_, phaseIndex) => {
        const count = rowPhaseTotals.get(`${phaseIndex}:${rowIndex}`) ?? 0;
        const cardsPerLine = cardsPerLineByPhase[phaseIndex] ?? 1;

        return Math.max(1, Math.ceil(count / cardsPerLine));
      })
    );

    return Math.max(
      ROW_HEIGHT,
      layout.rowPadding * 2 +
        maxLinesNeeded * layout.cardHeight +
        (maxLinesNeeded - 1) * layout.cardGapY
    );
  });
  const rowY = (rowIndex: number) =>
    PHASE_HEADER_HEIGHT + rowHeights.slice(0, rowIndex).reduce((total, height) => total + height, 0);
  const cells: BlueprintCell[] = [];
  const cardPositions: CardPosition[] = [];
  const rowPhaseCounts = new Map<string, number>();
  const diagramWidth = ROW_LABEL_WIDTH + phaseWidths.reduce((total, width) => total + width, 0) + 80;
  const diagramHeight =
    PHASE_HEADER_HEIGHT + rowHeights.reduce((total, height) => total + height, 0) + 60;

  cells.push({
    id: "title",
    value: `D02 Service Blueprint - ${templateProfile.name}`,
    style: textStyle("#ffffff", "fontStyle=1;fontSize=16;strokeColor=none"),
    vertex: true,
    x: 0,
    y: 0,
    width: ROW_LABEL_WIDTH,
    height: PHASE_HEADER_HEIGHT
  });

  phases.forEach((phase, index) => {
    cells.push({
      id: `phase_${sanitizeId(phase)}`,
      value: phase,
      style: textStyle("#e0f2fe", "fontStyle=1"),
      vertex: true,
      x: phaseX(index),
      y: 0,
      width: phaseWidths[index],
      height: PHASE_HEADER_HEIGHT
    });
  });

  rows.forEach((row, index) => {
    cells.push({
      id: `row_label_${sanitizeId(row)}`,
      value: row,
      style: textStyle(rowColors[row] ?? "#f8fafc", "fontStyle=1;align=left;spacingLeft=12"),
      vertex: true,
      x: 0,
      y: rowY(index),
      width: ROW_LABEL_WIDTH,
      height: rowHeights[index]
    });

    phases.forEach((phase, phaseIndex) => {
      cells.push({
        id: `row_${sanitizeId(row)}_${sanitizeId(phase)}`,
        value: getContextCellValue(row, phase, processTasks),
        style: `rounded=0;whiteSpace=wrap;html=1;fillColor=${
          rowColors[row] ?? "#ffffff"
        };strokeColor=#e2e8f0`,
        vertex: true,
        x: phaseX(phaseIndex),
        y: rowY(index),
        width: phaseWidths[phaseIndex],
        height: rowHeights[index]
      });
    });
  });

  const firstPhaseX = phaseX(0);
  const allPhaseWidth = phaseWidths.reduce((total, width) => total + width, 0);
  const separatorDefinitions = [
    {
      id: "separator_line_of_interaction",
      label: "Line of Interaction",
      row: "CUSTOMER ACTIONS" as BlueprintRow,
      strokeColor: "#0f172a",
      strokeWidth: 2,
      dashed: false
    },
    {
      id: "separator_line_of_visibility",
      label: "Line of Visibility",
      row: "FRONT-STAGE INTERACTIONS — SYSTEM / CHANNEL" as BlueprintRow,
      strokeColor: "#dc2626",
      strokeWidth: 3,
      dashed: false
    },
    {
      id: "separator_line_of_internal_interaction",
      label: "Line of Internal Interaction",
      row: "BACK-STAGE INTERACTIONS — SYSTEM / TOOLS" as BlueprintRow,
      strokeColor: "#475569",
      strokeWidth: 2,
      dashed: true
    }
  ];

  separatorDefinitions.forEach((separator) => {
    const rowIndex =
      rows.indexOf(separator.row) >= 0
        ? rows.indexOf(separator.row)
        : rows.findIndex(
            (row) =>
              separator.id === "separator_line_of_internal_interaction" &&
              row.includes("BACK-STAGE INTERACTIONS") &&
              row.includes("PEOPLE")
          );

    if (rowIndex < 0) {
      return;
    }

    cells.push(
      ...buildSeparatorCells(
        separator.id,
        separator.label,
        rowY(rowIndex) + rowHeights[rowIndex],
        firstPhaseX,
        allPhaseWidth,
        separator.strokeColor,
        separator.strokeWidth,
        separator.dashed
      )
    );
  });

  processTasks.forEach((task) => {
    const phase = normalize(task.phase) || phases[0];
    const phaseIndex = phaseIndexByName.get(phase) ?? 0;
    const row = mapTaskToRow(task);
    const rowIndex = getRowIndex(rows, row);
    const countKey = `${phaseIndex}:${rowIndex}`;
    const count = rowPhaseCounts.get(countKey) ?? 0;
    const cardsPerLine = cardsPerLineByPhase[phaseIndex] ?? 1;
    const localColumn = count % cardsPerLine;
    const localRow = Math.floor(count / cardsPerLine);
    const x =
      phaseX(phaseIndex) +
      layout.phasePadding +
      localColumn * (layout.cardWidth + layout.cardGapX);
    const y = rowY(rowIndex) + layout.rowPadding + localRow * (layout.cardHeight + layout.cardGapY);
    const { cells: cardCells, position } = buildCardCells(task, x, y);

    cells.push(...cardCells);
    cardPositions.push(position);
    rowPhaseCounts.set(countKey, count + 1);
  });

  const cardByStepId = new Map(
    cardPositions.map((position) => [position.task.stepId, position])
  );
  const connectors: BlueprintCell[] = [];
  const connectorPairs = new Set<string>();

  function pushConnectorOnce(source: CardPosition, target: CardPosition, connector: BlueprintCell) {
    const pairKey = `${source.containerId}->${target.containerId}`;

    if (connectorPairs.has(pairKey)) {
      return;
    }

    connectorPairs.add(pairKey);
    connectors.push(connector);
  }

  processTasks.forEach((task) => {
    const source = cardByStepId.get(task.stepId);

    if (!source) {
      return;
    }

    const defaultTarget = cardByStepId.get(normalize(task.defaultNextStep));

    if (defaultTarget) {
      pushConnectorOnce(source, defaultTarget, buildSequenceConnector(source, defaultTarget));
    }

    [task.yesNextStep, task.noNextStep].forEach((stepId) => {
      const target = cardByStepId.get(normalize(stepId));

      if (target && isCriticalExceptionLink(task, target)) {
        pushConnectorOnce(source, target, buildSequenceConnector(source, target));
      }
    });

    if (normalize(task.dataObject) || task.rowType === "data") {
      const nextTask = processTasks.find(
        (candidate) => candidate.stepId === normalize(task.defaultNextStep)
      );
      const target = nextTask ? cardByStepId.get(nextTask.stepId) : undefined;

      if (target && target.containerId !== source.containerId) {
        pushConnectorOnce(source, target, buildDataAssociation(source, target));
      }
    }
  });

  return [
    '<mxfile host="app.diagrams.net" modified="2026-05-06T00:00:00.000Z" agent="Process Blueprint AI Workbench" version="24.7.17" type="device">',
    `  <diagram id="D02_Service_Blueprint" name="${escapeXml(templateProfile.name)}">`,
    `    <mxGraphModel dx="${diagramWidth}" dy="${diagramHeight}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${diagramWidth}" pageHeight="${diagramHeight}" math="0" shadow="0">`,
    "      <root>",
    '        <mxCell id="0" />',
    '        <mxCell id="1" parent="0" />',
    [...cells, ...connectors].map(makeCell).join("\n"),
    "      </root>",
    "    </mxGraphModel>",
    "  </diagram>",
    "</mxfile>"
  ].join("\n");
}
