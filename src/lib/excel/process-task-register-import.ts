import JSZip from "jszip";
import type { ProcessTask } from "@/lib/models/process-task";
import { optionLists, processTaskFields } from "@/lib/excel/process-task-register-template";

export type ImportIssue = {
  row?: number;
  field?: keyof ProcessTask;
  message: string;
};

export type ProcessTaskImportPreview = {
  tasks: ProcessTask[];
  errors: ImportIssue[];
  warnings: ImportIssue[];
};

const REQUIRED_COLUMNS: Array<keyof ProcessTask> = [
  "stepId",
  "rowType",
  "bpmnType",
  "taskNature",
  "actor",
  "taskName"
];

const NEXT_STEP_FIELDS: Array<keyof ProcessTask> = [
  "defaultNextStep",
  "yesNextStep",
  "noNextStep"
];

const BPMN_TYPE_OPTIONS_BY_ROW_TYPE: Record<string, string[]> = {
  task: [
    "userTask",
    "manualTask",
    "serviceTask",
    "sendTask",
    "businessRuleTask",
    "scriptTask",
    "task"
  ],
  gateway: ["exclusiveGateway", "parallelGateway", "inclusiveGateway"],
  start: ["startEvent"],
  end: ["endEvent"],
  event: ["startEvent", "endEvent", "none"],
  data: ["dataObject", "dataStore", "none"],
  phase: ["none"],
  group: ["none"],
  annotation: ["none"]
};

function parseXml(xml: string) {
  return new DOMParser().parseFromString(xml, "application/xml");
}

function getText(node: Element | null) {
  return node?.textContent ?? "";
}

function columnIndexFromName(name: string) {
  return name.split("").reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0);
}

function parseCellRef(ref: string) {
  const match = /^([A-Z]+)(\d+)$/i.exec(ref);

  if (!match) {
    return { columnIndex: 0, rowIndex: 0 };
  }

  return {
    columnIndex: columnIndexFromName(match[1].toUpperCase()),
    rowIndex: Number(match[2])
  };
}

function normalizeHeader(value: string) {
  return value.split(/\r?\n/)[0].trim();
}

function normalizeValue(value: string) {
  return value.trim();
}

function readSharedStrings(zip: JSZip) {
  const sharedStringsFile = zip.file("xl/sharedStrings.xml");

  if (!sharedStringsFile) {
    return Promise.resolve<string[]>([]);
  }

  return sharedStringsFile.async("string").then((xml) => {
    const document = parseXml(xml);

    return Array.from(document.getElementsByTagName("si")).map((item) =>
      Array.from(item.getElementsByTagName("t"))
        .map((textNode) => textNode.textContent ?? "")
        .join("")
    );
  });
}

function readCellValue(cell: Element, sharedStrings: string[]) {
  const type = cell.getAttribute("t");

  if (type === "inlineStr") {
    return getText(cell.getElementsByTagName("t")[0] ?? null);
  }

  const rawValue = getText(cell.getElementsByTagName("v")[0] ?? null);

  if (type === "s") {
    return sharedStrings[Number(rawValue)] ?? "";
  }

  return rawValue;
}

function readRows(worksheetXml: string, sharedStrings: string[]) {
  const document = parseXml(worksheetXml);

  return Array.from(document.getElementsByTagName("row")).map((row) => {
    const values: string[] = [];

    Array.from(row.getElementsByTagName("c")).forEach((cell) => {
      const ref = cell.getAttribute("r") ?? "";
      const { columnIndex } = parseCellRef(ref);

      if (columnIndex > 0) {
        values[columnIndex - 1] = readCellValue(cell, sharedStrings);
      }
    });

    return values.map((value) => value ?? "");
  });
}

async function findProcessTaskRegisterSheet(zip: JSZip) {
  const workbookFile = zip.file("xl/workbook.xml");
  const workbookRelsFile = zip.file("xl/_rels/workbook.xml.rels");

  if (!workbookFile || !workbookRelsFile) {
    throw new Error("File Excel không có cấu trúc workbook hợp lệ.");
  }

  const [workbookXml, relsXml] = await Promise.all([
    workbookFile.async("string"),
    workbookRelsFile.async("string")
  ]);
  const workbook = parseXml(workbookXml);
  const rels = parseXml(relsXml);
  const sheet = Array.from(workbook.getElementsByTagName("sheet")).find(
    (item) => item.getAttribute("name") === "Process Task Register"
  );

  if (!sheet) {
    throw new Error('Không tìm thấy sheet "Process Task Register".');
  }

  const relationId = sheet.getAttribute("r:id");
  const relationship = Array.from(rels.getElementsByTagName("Relationship")).find(
    (item) => item.getAttribute("Id") === relationId
  );
  const target = relationship?.getAttribute("Target");

  if (!target) {
    throw new Error('Không đọc được đường dẫn sheet "Process Task Register".');
  }

  const normalizedTarget = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
  const sheetFile = zip.file(normalizedTarget);

  if (!sheetFile) {
    throw new Error('Không đọc được nội dung sheet "Process Task Register".');
  }

  return sheetFile.async("string");
}

function buildHeaderMap(headerRow: string[]) {
  const labelToKey = new Map(
    processTaskFields.map((field) => [field.label, field.key] as const)
  );
  const fieldKeys = new Set(processTaskFields.map((field) => field.key));
  const headerMap = new Map<keyof ProcessTask, number>();

  headerRow.forEach((header, index) => {
    const normalizedHeader = normalizeHeader(header);
    const key =
      fieldKeys.has(normalizedHeader as keyof ProcessTask)
        ? (normalizedHeader as keyof ProcessTask)
        : labelToKey.get(normalizedHeader);

    if (key) {
      headerMap.set(key, index);
    }
  });

  return headerMap;
}

function cellValue(row: string[], headerMap: Map<keyof ProcessTask, number>, key: keyof ProcessTask) {
  const index = headerMap.get(key);

  return index == null ? "" : normalizeValue(row[index] ?? "");
}

function emptyToNull(value: string) {
  return value === "" ? null : value;
}

function isBlankRow(row: string[]) {
  return row.every((value) => normalizeValue(value) === "");
}

function createTaskFromRow(row: string[], headerMap: Map<keyof ProcessTask, number>, rowNumber: number): ProcessTask {
  const stepId = cellValue(row, headerMap, "stepId");

  return {
    id: cellValue(row, headerMap, "id") || `task-import-${stepId || rowNumber}`,
    stepId,
    parentStepId: emptyToNull(cellValue(row, headerMap, "parentStepId")),
    rowType: cellValue(row, headerMap, "rowType") as ProcessTask["rowType"],
    bpmnType: cellValue(row, headerMap, "bpmnType") as ProcessTask["bpmnType"],
    taskNature: cellValue(row, headerMap, "taskNature") as ProcessTask["taskNature"],
    phase: cellValue(row, headerMap, "phase"),
    group: cellValue(row, headerMap, "group"),
    actor: cellValue(row, headerMap, "actor"),
    actorLane: cellValue(row, headerMap, "actorLane"),
    system: cellValue(row, headerMap, "system"),
    systemLane: cellValue(row, headerMap, "systemLane"),
    dataObject: cellValue(row, headerMap, "dataObject"),
    dataAction: (cellValue(row, headerMap, "dataAction") || "none") as ProcessTask["dataAction"],
    taskName: cellValue(row, headerMap, "taskName"),
    input: cellValue(row, headerMap, "input"),
    output: cellValue(row, headerMap, "output"),
    defaultNextStep: emptyToNull(cellValue(row, headerMap, "defaultNextStep")),
    conditionQuestion: cellValue(row, headerMap, "conditionQuestion"),
    yesNextStep: emptyToNull(cellValue(row, headerMap, "yesNextStep")),
    noNextStep: emptyToNull(cellValue(row, headerMap, "noNextStep")),
    exception: cellValue(row, headerMap, "exception"),
    exceptionHandling: cellValue(row, headerMap, "exceptionHandling"),
    sla: cellValue(row, headerMap, "sla"),
    riskControl: cellValue(row, headerMap, "riskControl"),
    sourceRef: cellValue(row, headerMap, "sourceRef"),
    reviewStatus: (cellValue(row, headerMap, "reviewStatus") || "draft") as ProcessTask["reviewStatus"],
    comment: cellValue(row, headerMap, "comment"),
    customerInteractionType: (cellValue(row, headerMap, "customerInteractionType") || "None") as ProcessTask["customerInteractionType"],
    channel: (cellValue(row, headerMap, "channel") || "Other") as ProcessTask["channel"]
  };
}

function validateImport(tasks: ProcessTask[], headerMap: Map<keyof ProcessTask, number>) {
  const errors: ImportIssue[] = [];
  const warnings: ImportIssue[] = [];
  const stepIds = new Set(tasks.map((task) => task.stepId).filter(Boolean));
  const seenStepIds = new Map<string, number>();

  REQUIRED_COLUMNS.forEach((field) => {
    if (!headerMap.has(field)) {
      errors.push({
        field,
        message: `Thiếu cột bắt buộc "${field}". Vui lòng dùng đúng template hoặc thêm lại cột này.`
      });
    }
  });

  tasks.forEach((task, index) => {
    const rowNumber = index + 2;

    REQUIRED_COLUMNS.forEach((field) => {
      if (!String(task[field] ?? "").trim()) {
        errors.push({
          row: rowNumber,
          field,
          message: `Dòng ${rowNumber}: thiếu giá trị bắt buộc ở cột "${field}".`
        });
      }
    });

    Object.entries(optionLists).forEach(([fieldName, options]) => {
      const field = fieldName as keyof ProcessTask;
      const value = String(task[field] ?? "").trim();

      if (value && !options.includes(value)) {
        errors.push({
          row: rowNumber,
          field,
          message: `Dòng ${rowNumber}: giá trị "${value}" không hợp lệ cho cột "${fieldName}".`
        });
      }
    });

    const allowedBpmnTypes = BPMN_TYPE_OPTIONS_BY_ROW_TYPE[task.rowType] ?? optionLists.bpmnType;

    if (task.bpmnType && !allowedBpmnTypes.includes(task.bpmnType)) {
      errors.push({
        row: rowNumber,
        field: "bpmnType",
        message: `Dòng ${rowNumber}: bpmnType "${task.bpmnType}" không phù hợp với rowType "${task.rowType}".`
      });
    }

    if (task.stepId) {
      const firstRow = seenStepIds.get(task.stepId);

      if (firstRow) {
        errors.push({
          row: rowNumber,
          field: "stepId",
          message: `Dòng ${rowNumber}: stepId "${task.stepId}" bị trùng với dòng ${firstRow}.`
        });
      } else {
        seenStepIds.set(task.stepId, rowNumber);
      }
    }

    NEXT_STEP_FIELDS.forEach((field) => {
      const nextStep = task[field];

      if (typeof nextStep === "string" && nextStep && !stepIds.has(nextStep)) {
        errors.push({
          row: rowNumber,
          field,
          message: `Dòng ${rowNumber}: ${field} tham chiếu "${nextStep}" nhưng stepId này không tồn tại.`
        });
      }
    });

    if (!task.phase) {
      warnings.push({
        row: rowNumber,
        field: "phase",
        message: `Dòng ${rowNumber}: chưa có phase, D02 có thể khó xếp cột.`
      });
    }
  });

  if (tasks.length === 0) {
    errors.push({
      message: "Sheet Process Task Register không có dòng dữ liệu để import."
    });
  }

  return { errors, warnings };
}

export async function parseProcessTaskRegisterWorkbook(file: File): Promise<ProcessTaskImportPreview> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const [worksheetXml, sharedStrings] = await Promise.all([
    findProcessTaskRegisterSheet(zip),
    readSharedStrings(zip)
  ]);
  const rows = readRows(worksheetXml, sharedStrings);
  const [headerRow, ...dataRows] = rows;

  if (!headerRow) {
    return {
      tasks: [],
      errors: [{ message: "Sheet Process Task Register không có header." }],
      warnings: []
    };
  }

  const headerMap = buildHeaderMap(headerRow);
  const tasks = dataRows
    .filter((row) => !isBlankRow(row))
    .map((row, index) => createTaskFromRow(row, headerMap, index + 2));
  const { errors, warnings } = validateImport(tasks, headerMap);

  return {
    tasks,
    errors,
    warnings
  };
}
