import type { ProcessTask } from "@/lib/models/process-task";
import type { TemplateProfile } from "@/lib/models/template-profile";

type BlueprintRow =
  | "STEPS"
  | "PHASE"
  | "TIME"
  | "EVIDENCE"
  | "CUSTOMER ACTIONS"
  | "FRONT-STAGE INTERACTIONS"
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
  "FRONT-STAGE INTERACTIONS",
  "BACK-STAGE INTERACTIONS — SYSTEM / TOOLS",
  "BACK-STAGE INTERACTIONS — PEOPLE",
  "SUPPORT PROCESSES",
  "DATA / CONTROL"
];

const ROW_LABEL_WIDTH = 250;
const PHASE_WIDTH = 430;
const PHASE_HEADER_HEIGHT = 54;
const ROW_HEIGHT = 190;
const CARD_WIDTH = 300;
const CARD_HEIGHT = 132;
const CARD_GAP_X = 24;
const CARD_GAP_Y = 18;
const HEADER_HEIGHT = 32;
const FOOTER_HEIGHT = 30;

const rowColors: Record<BlueprintRow, string> = {
  STEPS: "#f8fafc",
  PHASE: "#eef2ff",
  TIME: "#f8fafc",
  EVIDENCE: "#f8fafc",
  "CUSTOMER ACTIONS": "#ecfeff",
  "FRONT-STAGE INTERACTIONS": "#eff6ff",
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

function getTemplateRows(templateProfile: TemplateProfile): BlueprintRow[] {
  const configuredRows = templateProfile.rowRules.rows;

  if (
    Array.isArray(configuredRows) &&
    configuredRows.every((row) => typeof row === "string")
  ) {
    return configuredRows as BlueprintRow[];
  }

  return DEFAULT_ROWS;
}

function getPhases(tasks: ProcessTask[]) {
  const phases = [...new Set(tasks.map((task) => normalize(task.phase)).filter(Boolean))];

  return phases.length > 0 ? phases : ["Process"];
}

function mapTaskToRow(task: ProcessTask): BlueprintRow {
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
    return "FRONT-STAGE INTERACTIONS";
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

function cardText(task: ProcessTask) {
  return [
    normalize(task.taskName) || "(Chưa có tên task)",
    `BPMN: ${normalize(task.bpmnType) || "n/a"}`,
    `Nature: ${normalize(task.taskNature) || "n/a"}`
  ].join("\n");
}

function buildCardCells(task: ProcessTask, x: number, y: number) {
  const safeStepId = sanitizeId(task.stepId || task.id);
  const containerId = `card_${safeStepId}`;
  const headerId = `${containerId}_header`;
  const middleId = `${containerId}_middle`;
  const footerId = `${containerId}_footer`;

  const cells: BlueprintCell[] = [
    {
      id: containerId,
      value: "",
      style:
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#334155;shadow=0",
      vertex: true,
      x,
      y,
      width: CARD_WIDTH,
      height: CARD_HEIGHT
    },
    {
      id: headerId,
      value: normalize(task.actor) || "No actor",
      style: textStyle(cardColors.header, "fontStyle=1"),
      parent: containerId,
      vertex: true,
      x: 0,
      y: 0,
      width: CARD_WIDTH,
      height: HEADER_HEIGHT
    },
    {
      id: middleId,
      value: cardText(task),
      style: textStyle(cardColors.middle),
      parent: containerId,
      vertex: true,
      x: 0,
      y: HEADER_HEIGHT,
      width: CARD_WIDTH,
      height: CARD_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT
    },
    {
      id: footerId,
      value: normalize(task.system) || "No system/app",
      style: textStyle(cardColors.footer),
      parent: containerId,
      vertex: true,
      x: 0,
      y: CARD_HEIGHT - FOOTER_HEIGHT,
      width: CARD_WIDTH,
      height: FOOTER_HEIGHT
    }
  ];

  return { cells, position: { task, containerId, middleId, x, y, width: CARD_WIDTH, height: CARD_HEIGHT } };
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

export function generateServiceBlueprintDrawioXml(
  processTasks: ProcessTask[],
  templateProfile: TemplateProfile
) {
  const rows = getTemplateRows(templateProfile);
  const phases = getPhases(processTasks);
  const phaseIndexByName = new Map(phases.map((phase, index) => [phase, index]));
  const columnCount = Math.max(1, Math.floor((PHASE_WIDTH - CARD_GAP_X) / (CARD_WIDTH + CARD_GAP_X)));
  const rowPhaseTotals = new Map<string, number>();

  processTasks.forEach((task) => {
    const phase = normalize(task.phase) || phases[0];
    const phaseIndex = phaseIndexByName.get(phase) ?? 0;
    const rowIndex = getRowIndex(rows, mapTaskToRow(task));
    const countKey = `${phaseIndex}:${rowIndex}`;

    rowPhaseTotals.set(countKey, (rowPhaseTotals.get(countKey) ?? 0) + 1);
  });

  const rowHeights = rows.map((_, rowIndex) => {
    const maxCardsInPhase = Math.max(
      0,
      ...phases.map((_, phaseIndex) => rowPhaseTotals.get(`${phaseIndex}:${rowIndex}`) ?? 0)
    );
    const neededRows = Math.max(1, Math.ceil(maxCardsInPhase / columnCount));

    return Math.max(
      ROW_HEIGHT,
      CARD_GAP_Y * 2 + neededRows * CARD_HEIGHT + (neededRows - 1) * CARD_GAP_Y
    );
  });
  const rowY = (rowIndex: number) =>
    PHASE_HEADER_HEIGHT + rowHeights.slice(0, rowIndex).reduce((total, height) => total + height, 0);
  const cells: BlueprintCell[] = [];
  const cardPositions: CardPosition[] = [];
  const rowPhaseCounts = new Map<string, number>();
  const diagramWidth = ROW_LABEL_WIDTH + phases.length * PHASE_WIDTH + 80;
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
      x: ROW_LABEL_WIDTH + index * PHASE_WIDTH,
      y: 0,
      width: PHASE_WIDTH,
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
        value: "",
        style: `rounded=0;whiteSpace=wrap;html=1;fillColor=${
          rowColors[row] ?? "#ffffff"
        };strokeColor=#e2e8f0`,
        vertex: true,
        x: ROW_LABEL_WIDTH + phaseIndex * PHASE_WIDTH,
        y: rowY(index),
        width: PHASE_WIDTH,
        height: rowHeights[index]
      });
    });
  });

  processTasks.forEach((task) => {
    const phase = normalize(task.phase) || phases[0];
    const phaseIndex = phaseIndexByName.get(phase) ?? 0;
    const row = mapTaskToRow(task);
    const rowIndex = getRowIndex(rows, row);
    const countKey = `${phaseIndex}:${rowIndex}`;
    const count = rowPhaseCounts.get(countKey) ?? 0;
    const localColumn = count % columnCount;
    const localRow = Math.floor(count / columnCount);
    const x =
      ROW_LABEL_WIDTH +
      phaseIndex * PHASE_WIDTH +
      CARD_GAP_X +
      localColumn * (CARD_WIDTH + CARD_GAP_X);
    const y = rowY(rowIndex) + CARD_GAP_Y + localRow * (CARD_HEIGHT + CARD_GAP_Y);
    const { cells: cardCells, position } = buildCardCells(task, x, y);

    cells.push(...cardCells);
    cardPositions.push(position);
    rowPhaseCounts.set(countKey, count + 1);
  });

  const cardByStepId = new Map(
    cardPositions.map((position) => [position.task.stepId, position])
  );
  const connectors: BlueprintCell[] = [];

  processTasks.forEach((task) => {
    const source = cardByStepId.get(task.stepId);

    if (!source) {
      return;
    }

    [task.defaultNextStep, task.yesNextStep, task.noNextStep].forEach((stepId) => {
      const target = cardByStepId.get(normalize(stepId));

      if (target) {
        connectors.push(buildSequenceConnector(source, target));
      }
    });

    if (normalize(task.dataObject) || task.rowType === "data") {
      const nextTask = processTasks.find(
        (candidate) => candidate.stepId === normalize(task.defaultNextStep)
      );
      const target = nextTask ? cardByStepId.get(nextTask.stepId) : undefined;

      if (target && target.containerId !== source.containerId) {
        connectors.push(buildDataAssociation(source, target));
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
