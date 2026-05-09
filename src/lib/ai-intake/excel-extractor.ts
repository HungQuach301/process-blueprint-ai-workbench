import JSZip from "jszip";
import type {
  BpmnType,
  DataAction,
  ProcessTask,
  ReviewStatus,
  RowType,
  TaskNature
} from "@/lib/models/process-task";

export type ExcelExtractionPreview = {
  detectedSheet: string;
  detectedColumns: string[];
  mappedFields: Record<string, string>;
  unmappedColumns: string[];
  draftTasks: ProcessTask[];
  warnings: string[];
  sheetNames: string[];
};

type WorkbookSheet = {
  name: string;
  relationshipId: string;
};

type SheetRelationship = {
  id: string;
  target: string;
};

type CellValue = string | number | boolean | null;
type SheetRow = CellValue[];

const preferredSheetName = "Process Task Register";

const fieldAliases: Record<keyof Pick<
  ProcessTask,
  | "stepId"
  | "rowType"
  | "bpmnType"
  | "taskNature"
  | "phase"
  | "group"
  | "actor"
  | "actorLane"
  | "system"
  | "systemLane"
  | "dataObject"
  | "dataAction"
  | "taskName"
  | "input"
  | "output"
  | "defaultNextStep"
  | "conditionQuestion"
  | "yesNextStep"
  | "noNextStep"
  | "exception"
  | "exceptionHandling"
  | "sla"
  | "riskControl"
  | "sourceRef"
  | "reviewStatus"
  | "comment"
>, string[]> = {
  stepId: ["stepid", "step id", "id", "step", "ma buoc", "mã bước"],
  rowType: ["rowtype", "row type", "type", "loai dong", "loại dòng"],
  bpmnType: ["bpmntype", "bpmn type", "bpmn", "loai bpmn", "loại bpmn"],
  taskNature: ["tasknature", "task nature", "nature", "manual automatic"],
  phase: ["phase", "stage", "giai doan", "giai đoạn"],
  group: ["group", "process group", "nhom", "nhóm"],
  actor: ["actor", "role", "owner", "nguoi thuc hien", "người thực hiện"],
  actorLane: ["actorlane", "actor lane", "lane", "swimlane"],
  system: ["system", "application", "app", "he thong", "hệ thống"],
  systemLane: ["systemlane", "system lane"],
  dataObject: ["dataobject", "data object", "data", "document", "input data"],
  dataAction: ["dataaction", "data action", "crud", "action"],
  taskName: ["taskname", "task name", "activity", "activity name", "task", "ten buoc", "tên bước"],
  input: ["input", "inputs", "input artifact", "dau vao", "đầu vào"],
  output: ["output", "outputs", "output artifact", "dau ra", "đầu ra"],
  defaultNextStep: ["defaultnextstep", "default next step", "next", "next step"],
  conditionQuestion: ["conditionquestion", "condition question", "condition"],
  yesNextStep: ["yesnextstep", "yes next step", "yes"],
  noNextStep: ["nonextstep", "no next step", "no"],
  exception: ["exception", "exceptions"],
  exceptionHandling: ["exceptionhandling", "exception handling", "handling"],
  sla: ["sla", "service level"],
  riskControl: ["riskcontrol", "risk control", "control", "risk"],
  sourceRef: ["sourceref", "source ref", "source"],
  reviewStatus: ["reviewstatus", "review status", "status"],
  comment: ["comment", "comments", "note", "notes"]
};

const rowTypes: RowType[] = [
  "phase",
  "group",
  "task",
  "gateway",
  "start",
  "end",
  "event",
  "data",
  "annotation"
];

const bpmnTypes: BpmnType[] = [
  "none",
  "startEvent",
  "endEvent",
  "task",
  "userTask",
  "manualTask",
  "serviceTask",
  "sendTask",
  "scriptTask",
  "businessRuleTask",
  "exclusiveGateway",
  "parallelGateway",
  "inclusiveGateway",
  "dataObject",
  "dataStore"
];

const taskNatures: TaskNature[] = [
  "manual",
  "automatic",
  "semiAutomatic",
  "system",
  "decision",
  "approval",
  "integration",
  "notification",
  "control",
  "data"
];

const dataActions: DataAction[] = [
  "none",
  "pull",
  "push",
  "store",
  "create",
  "read",
  "update",
  "delete",
  "validate",
  "approve",
  "reject",
  "send",
  "receive"
];

const reviewStatuses: ReviewStatus[] = [
  "draft",
  "needsReview",
  "approved",
  "rejected"
];

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\-./()]/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeCompact(value: string) {
  return normalizeHeader(value).replace(/\s+/g, "");
}

function textValue(value: CellValue | undefined) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function parseXml(xml: string) {
  return new DOMParser().parseFromString(xml, "application/xml");
}

function getAttribute(node: Element, name: string) {
  return node.getAttribute(name) ?? "";
}

function resolveWorkbookPath(target: string) {
  const normalizedTarget = target.replace(/^\//, "");

  return normalizedTarget.startsWith("xl/")
    ? normalizedTarget
    : `xl/${normalizedTarget}`;
}

function columnIndexFromCellRef(cellRef: string) {
  const letters = cellRef.match(/[A-Z]+/i)?.[0]?.toUpperCase() ?? "A";

  return letters.split("").reduce((total, letter) => {
    return total * 26 + letter.charCodeAt(0) - 64;
  }, 0) - 1;
}

async function readXmlFile(zip: JSZip, path: string) {
  return zip.file(path)?.async("string") ?? null;
}

function readWorkbookSheets(workbookXml: string): WorkbookSheet[] {
  const document = parseXml(workbookXml);

  return Array.from(document.getElementsByTagName("sheet")).map((sheet) => ({
    name: getAttribute(sheet, "name"),
    relationshipId: getAttribute(sheet, "r:id")
  }));
}

function readSheetRelationships(relationshipsXml: string): SheetRelationship[] {
  const document = parseXml(relationshipsXml);

  return Array.from(document.getElementsByTagName("Relationship")).map(
    (relationship) => ({
      id: getAttribute(relationship, "Id"),
      target: getAttribute(relationship, "Target")
    })
  );
}

function readSharedStrings(sharedStringsXml: string | null) {
  if (!sharedStringsXml) {
    return [];
  }

  const document = parseXml(sharedStringsXml);

  return Array.from(document.getElementsByTagName("si")).map((item) =>
    Array.from(item.getElementsByTagName("t"))
      .map((textNode) => textNode.textContent ?? "")
      .join("")
  );
}

function readCellValue(cell: Element, sharedStrings: string[]): CellValue {
  const cellType = getAttribute(cell, "t");
  const valueNode = cell.getElementsByTagName("v")[0];

  if (cellType === "inlineStr") {
    return Array.from(cell.getElementsByTagName("t"))
      .map((textNode) => textNode.textContent ?? "")
      .join("");
  }

  if (!valueNode?.textContent) {
    return "";
  }

  const rawValue = valueNode.textContent;

  if (cellType === "s") {
    return sharedStrings[Number(rawValue)] ?? "";
  }

  if (cellType === "b") {
    return rawValue === "1";
  }

  if (cellType === "str") {
    return rawValue;
  }

  const numericValue = Number(rawValue);
  return Number.isFinite(numericValue) ? numericValue : rawValue;
}

function readSheetRows(sheetXml: string, sharedStrings: string[]): SheetRow[] {
  const document = parseXml(sheetXml);

  return Array.from(document.getElementsByTagName("row")).map((row) => {
    const cells: SheetRow = [];

    Array.from(row.getElementsByTagName("c")).forEach((cell) => {
      const cellRef = getAttribute(cell, "r");
      cells[columnIndexFromCellRef(cellRef)] = readCellValue(cell, sharedStrings);
    });

    return cells;
  });
}

function findHeaderRow(rows: SheetRow[]) {
  const rowIndex = rows.findIndex(
    (row) => row.filter((cell) => textValue(cell)).length >= 2
  );

  return rowIndex >= 0 ? rowIndex : 0;
}

function mapColumns(headers: string[]) {
  const mappedFields: Record<string, string> = {};
  const usedIndexes = new Set<number>();

  Object.entries(fieldAliases).forEach(([fieldName, aliases]) => {
    const aliasSet = new Set([
      ...aliases.map(normalizeHeader),
      ...aliases.map(normalizeCompact)
    ]);
    const index = headers.findIndex((header, headerIndex) => {
      if (usedIndexes.has(headerIndex)) {
        return false;
      }

      return (
        aliasSet.has(normalizeHeader(header)) ||
        aliasSet.has(normalizeCompact(header))
      );
    });

    if (index >= 0) {
      mappedFields[fieldName] = headers[index];
      usedIndexes.add(index);
    }
  });

  const unmappedColumns = headers.filter((_, index) => !usedIndexes.has(index));

  return { mappedFields, unmappedColumns };
}

function getMappedValue(
  row: SheetRow,
  headers: string[],
  mappedFields: Record<string, string>,
  fieldName: keyof ProcessTask
) {
  const mappedHeader = mappedFields[fieldName];
  const index = mappedHeader ? headers.indexOf(mappedHeader) : -1;

  return index >= 0 ? textValue(row[index]) : "";
}

function normalizeEnum<T extends string>(
  value: string,
  allowedValues: T[],
  fallback: T
) {
  const compactValue = normalizeCompact(value);
  const matchedValue = allowedValues.find(
    (allowedValue) => normalizeCompact(allowedValue) === compactValue
  );

  return matchedValue ?? fallback;
}

function inferRowType(taskName: string, bpmnType: BpmnType): RowType {
  const normalizedTaskName = normalizeHeader(taskName);

  if (bpmnType === "startEvent" || normalizedTaskName.includes("start")) {
    return "start";
  }

  if (bpmnType === "endEvent" || normalizedTaskName.includes("end")) {
    return "end";
  }

  if (bpmnType.includes("Gateway")) {
    return "gateway";
  }

  if (bpmnType === "dataObject" || bpmnType === "dataStore") {
    return "data";
  }

  return "task";
}

function inferBpmnType(rowType: RowType, value: string): BpmnType {
  if (value) {
    return normalizeEnum(value, bpmnTypes, "userTask");
  }

  if (rowType === "start") {
    return "startEvent";
  }

  if (rowType === "end") {
    return "endEvent";
  }

  if (rowType === "gateway") {
    return "exclusiveGateway";
  }

  if (rowType === "data") {
    return "dataObject";
  }

  return "userTask";
}

function createDraftTaskFromRow(
  row: SheetRow,
  headers: string[],
  mappedFields: Record<string, string>,
  rowIndex: number
): ProcessTask | null {
  const taskName = getMappedValue(row, headers, mappedFields, "taskName");

  if (!taskName) {
    return null;
  }

  const stepId =
    getMappedValue(row, headers, mappedFields, "stepId") ||
    `XLSX-${String(rowIndex + 1).padStart(3, "0")}`;
  const rowTypeFromSheet = getMappedValue(row, headers, mappedFields, "rowType");
  const rowType = rowTypeFromSheet
    ? normalizeEnum(rowTypeFromSheet, rowTypes, "task")
    : inferRowType(
        taskName,
        normalizeEnum(
          getMappedValue(row, headers, mappedFields, "bpmnType"),
          bpmnTypes,
          "userTask"
        )
      );
  const bpmnType = inferBpmnType(
    rowType,
    getMappedValue(row, headers, mappedFields, "bpmnType")
  );
  const actor = getMappedValue(row, headers, mappedFields, "actor") || "TBD";
  const system =
    getMappedValue(row, headers, mappedFields, "system") || "Manual / TBD";

  return {
    id: `excel-intake-${stepId.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    stepId,
    parentStepId: null,
    rowType,
    bpmnType,
    taskNature: normalizeEnum(
      getMappedValue(row, headers, mappedFields, "taskNature"),
      taskNatures,
      bpmnType === "serviceTask" ? "automatic" : "manual"
    ),
    phase: getMappedValue(row, headers, mappedFields, "phase") || "Imported",
    group: getMappedValue(row, headers, mappedFields, "group") || "Excel intake",
    actor,
    actorLane: getMappedValue(row, headers, mappedFields, "actorLane") || actor,
    system,
    systemLane:
      getMappedValue(row, headers, mappedFields, "systemLane") || system,
    dataObject: getMappedValue(row, headers, mappedFields, "dataObject"),
    dataAction: normalizeEnum(
      getMappedValue(row, headers, mappedFields, "dataAction"),
      dataActions,
      "none"
    ),
    taskName,
    input: getMappedValue(row, headers, mappedFields, "input"),
    output: getMappedValue(row, headers, mappedFields, "output"),
    defaultNextStep:
      getMappedValue(row, headers, mappedFields, "defaultNextStep") || null,
    conditionQuestion: getMappedValue(
      row,
      headers,
      mappedFields,
      "conditionQuestion"
    ),
    yesNextStep: getMappedValue(row, headers, mappedFields, "yesNextStep") || null,
    noNextStep: getMappedValue(row, headers, mappedFields, "noNextStep") || null,
    exception: getMappedValue(row, headers, mappedFields, "exception"),
    exceptionHandling: getMappedValue(
      row,
      headers,
      mappedFields,
      "exceptionHandling"
    ),
    sla: getMappedValue(row, headers, mappedFields, "sla"),
    riskControl: getMappedValue(row, headers, mappedFields, "riskControl"),
    sourceRef:
      getMappedValue(row, headers, mappedFields, "sourceRef") ||
      "Excel file intake",
    reviewStatus: normalizeEnum(
      getMappedValue(row, headers, mappedFields, "reviewStatus"),
      reviewStatuses,
      "needsReview"
    ),
    comment: getMappedValue(row, headers, mappedFields, "comment")
  };
}

function buildWarnings(
  mappedFields: Record<string, string>,
  draftTasks: ProcessTask[]
) {
  const warnings: string[] = [];

  ["stepId", "rowType", "bpmnType", "taskName"].forEach((fieldName) => {
    if (!mappedFields[fieldName]) {
      warnings.push(`Missing or unmapped required column: ${fieldName}.`);
    }
  });

  if (draftTasks.length === 0) {
    warnings.push("No draft tasks could be mapped from this sheet.");
  }

  const duplicateStepIds = draftTasks
    .map((task) => task.stepId)
    .filter((stepId, index, stepIds) => stepIds.indexOf(stepId) !== index);

  if (duplicateStepIds.length > 0) {
    warnings.push(`Duplicate stepId detected: ${Array.from(new Set(duplicateStepIds)).join(", ")}.`);
  }

  return warnings;
}

export async function extractDraftTasksFromExcel(
  file: File
): Promise<ExcelExtractionPreview> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const workbookXml = await readXmlFile(zip, "xl/workbook.xml");
  const relationshipsXml = await readXmlFile(
    zip,
    "xl/_rels/workbook.xml.rels"
  );

  if (!workbookXml || !relationshipsXml) {
    throw new Error("Workbook structure is missing required XML files.");
  }

  const sheets = readWorkbookSheets(workbookXml);
  const relationships = readSheetRelationships(relationshipsXml);
  const selectedSheet =
    sheets.find((sheet) => sheet.name === preferredSheetName) ?? sheets[0];

  if (!selectedSheet) {
    throw new Error("Workbook does not contain any sheets.");
  }

  const relationship = relationships.find(
    (item) => item.id === selectedSheet.relationshipId
  );

  if (!relationship) {
    throw new Error(`Cannot resolve sheet path for ${selectedSheet.name}.`);
  }

  const sheetXml = await readXmlFile(zip, resolveWorkbookPath(relationship.target));

  if (!sheetXml) {
    throw new Error(`Cannot read sheet XML for ${selectedSheet.name}.`);
  }

  const sharedStrings = readSharedStrings(
    await readXmlFile(zip, "xl/sharedStrings.xml")
  );
  const rows = readSheetRows(sheetXml, sharedStrings);
  const headerRowIndex = findHeaderRow(rows);
  const headers = rows[headerRowIndex].map((cell) => textValue(cell));
  const dataRows = rows.slice(headerRowIndex + 1);
  const { mappedFields, unmappedColumns } = mapColumns(headers);
  const draftTasks = dataRows
    .map((row, index) =>
      createDraftTaskFromRow(row, headers, mappedFields, index)
    )
    .filter((task): task is ProcessTask => Boolean(task));

  return {
    detectedSheet: selectedSheet.name,
    detectedColumns: headers.filter(Boolean),
    mappedFields,
    unmappedColumns: unmappedColumns.filter(Boolean),
    draftTasks,
    warnings: buildWarnings(mappedFields, draftTasks),
    sheetNames: sheets.map((sheet) => sheet.name)
  };
}
