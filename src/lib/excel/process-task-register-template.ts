import JSZip from "jszip";
import type { ProcessTask } from "@/lib/models/process-task";
import { sampleProcessTasks } from "@/lib/sample-data/sme-online-loan";

export type ProcessTaskField = {
  key: keyof ProcessTask;
  label: string;
  required: "Có" | "Không";
  description: string;
  example: string;
  width: number;
};

type WorksheetDefinition = {
  name: string;
  rows: string[][];
  widths?: number[];
  freezeHeader?: boolean;
  validations?: DataValidation[];
};

type DataValidation = {
  columnIndex: number;
  fromRow: number;
  toRow: number;
  optionColumnIndex: number;
  optionStartRow: number;
  optionEndRow: number;
};

export const processTaskFields: ProcessTaskField[] = [
  { key: "id", label: "ID", required: "Có", description: "Mã kỹ thuật duy nhất của dòng.", example: "task-001", width: 22 },
  { key: "stepId", label: "Mã bước", required: "Có", description: "Mã bước nghiệp vụ, dùng để nối luồng.", example: "S001", width: 14 },
  { key: "parentStepId", label: "Mã bước cha", required: "Không", description: "Bước cha nếu dòng thuộc nhánh hoặc nhóm con.", example: "S010", width: 16 },
  { key: "rowType", label: "Loại dòng", required: "Có", description: "Phân loại dòng trong register.", example: "task", width: 18 },
  { key: "bpmnType", label: "Loại BPMN", required: "Có", description: "Loại phần tử BPMN tương ứng.", example: "userTask", width: 20 },
  { key: "taskNature", label: "Tính chất công việc", required: "Có", description: "Cách công việc được thực hiện.", example: "manual", width: 22 },
  { key: "phase", label: "Giai đoạn", required: "Có", description: "Giai đoạn hoặc cột thời gian của quy trình.", example: "Application Intake", width: 24 },
  { key: "group", label: "Nhóm", required: "Không", description: "Nhóm hoặc stage nhỏ trong phase.", example: "Application", width: 20 },
  { key: "actor", label: "Người thực hiện", required: "Có", description: "Actor chịu trách nhiệm chính.", example: "Customer", width: 22 },
  { key: "actorLane", label: "Lane người dùng", required: "Không", description: "Lane BPMN/service blueprint cho actor.", example: "Customer", width: 22 },
  { key: "system", label: "Hệ thống", required: "Không", description: "Hệ thống/app/công cụ liên quan.", example: "Digital Lending Portal", width: 28 },
  { key: "systemLane", label: "Lane hệ thống", required: "Không", description: "Lane BPMN cho hệ thống.", example: "Digital Channel / Loan Portal", width: 30 },
  { key: "dataObject", label: "Đối tượng dữ liệu", required: "Không", description: "Dữ liệu chính được đọc/ghi/cập nhật.", example: "Borrower profile", width: 28 },
  { key: "dataAction", label: "Thao tác dữ liệu", required: "Có", description: "Hành động với dữ liệu.", example: "store", width: 20 },
  { key: "taskName", label: "Tên công việc", required: "Có", description: "Tên task/gateway/event rõ nghĩa.", example: "Customer submits loan application", width: 36 },
  { key: "input", label: "Đầu vào", required: "Không", description: "Thông tin hoặc artifact đầu vào.", example: "Loan request details", width: 32 },
  { key: "output", label: "Đầu ra", required: "Không", description: "Kết quả hoặc artifact đầu ra.", example: "Application submitted", width: 32 },
  { key: "defaultNextStep", label: "Bước tiếp theo mặc định", required: "Không", description: "Bước kế tiếp mặc định.", example: "S002", width: 24 },
  { key: "conditionQuestion", label: "Câu hỏi điều kiện", required: "Không", description: "Câu hỏi cho gateway hoặc quyết định.", example: "Application eligible?", width: 32 },
  { key: "yesNextStep", label: "Bước tiếp theo nếu Có", required: "Không", description: "Bước tiếp theo cho nhánh Yes.", example: "S006", width: 24 },
  { key: "noNextStep", label: "Bước tiếp theo nếu Không", required: "Không", description: "Bước tiếp theo cho nhánh No.", example: "S030", width: 24 },
  { key: "exception", label: "Ngoại lệ", required: "Không", description: "Tình huống ngoại lệ.", example: "Missing documents", width: 28 },
  { key: "exceptionHandling", label: "Xử lý ngoại lệ", required: "Không", description: "Cách xử lý ngoại lệ.", example: "Request supplement", width: 30 },
  { key: "sla", label: "SLA", required: "Không", description: "Thời gian xử lý hoặc cam kết.", example: "2 business days", width: 20 },
  { key: "riskControl", label: "Rủi ro/Kiểm soát", required: "Không", description: "Risk/control/policy liên quan.", example: "KYC required", width: 28 },
  { key: "sourceRef", label: "Nguồn tham chiếu", required: "Không", description: "Nguồn nghiệp vụ hoặc tài liệu tham chiếu.", example: "BRD-001", width: 22 },
  { key: "reviewStatus", label: "Trạng thái review", required: "Có", description: "Trạng thái rà soát dòng.", example: "draft", width: 22 },
  { key: "comment", label: "Ghi chú", required: "Không", description: "Ghi chú cho reviewer.", example: "Needs business review", width: 32 },
  { key: "customerInteractionType", label: "Loại tương tác khách hàng", required: "Không", description: "Gợi ý row/layer cho D02 Service Blueprint.", example: "Customer Action", width: 30 },
  { key: "channel", label: "Kênh", required: "Không", description: "Kênh tương tác hoặc hệ thống chính.", example: "Portal", width: 22 }
];

export const optionLists: Record<string, string[]> = {
  rowType: ["phase", "group", "task", "gateway", "start", "end", "event", "data", "annotation"],
  bpmnType: [
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
  ],
  taskNature: [
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
  ],
  dataAction: [
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
  ],
  customerInteractionType: [
    "None",
    "Customer Action",
    "Front-stage People",
    "Front-stage System",
    "Back-stage People",
    "Back-stage System",
    "Support Process",
    "Data / Control"
  ],
  channel: [
    "Portal",
    "Mobile App",
    "Email",
    "SMS",
    "Phone Call",
    "RM Meeting",
    "Branch",
    "LOS",
    "OCR",
    "CIC",
    "Internal System",
    "Document Store",
    "Other"
  ],
  reviewStatus: ["draft", "needsReview", "approved", "rejected"]
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnName(index: number) {
  let dividend = index;
  let name = "";

  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    name = String.fromCharCode(65 + modulo) + name;
    dividend = Math.floor((dividend - modulo) / 26);
  }

  return name;
}

function taskValue(task: ProcessTask, key: keyof ProcessTask) {
  const value = task[key];

  return value == null ? "" : String(value);
}

function buildCell(value: string, rowIndex: number, columnIndex: number, styleId?: number) {
  const ref = `${columnName(columnIndex)}${rowIndex}`;
  const style = styleId ? ` s="${styleId}"` : "";

  return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function buildWorksheet(definition: WorksheetDefinition) {
  const cols = definition.widths
    ?.map(
      (width, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`
    )
    .join("");
  const sheetViews = definition.freezeHeader
    ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft"/></sheetView></sheetViews>`
    : "";
  const rows = definition.rows
    .map((row, rowIndex) => {
      const excelRowIndex = rowIndex + 1;
      const cells = row
        .map((value, columnIndex) =>
          buildCell(value, excelRowIndex, columnIndex + 1, excelRowIndex === 1 ? 1 : undefined)
        )
        .join("");

      return `<row r="${excelRowIndex}">${cells}</row>`;
    })
    .join("");
  const validations = definition.validations?.length
    ? `<dataValidations count="${definition.validations.length}">${definition.validations
        .map((validation) => {
          const column = columnName(validation.columnIndex);
          const optionColumn = columnName(validation.optionColumnIndex);

          return `<dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="${column}${validation.fromRow}:${column}${validation.toRow}"><formula1>'Option Lists'!$${optionColumn}$${validation.optionStartRow}:$${optionColumn}$${validation.optionEndRow}</formula1></dataValidation>`;
        })
        .join("")}</dataValidations>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  ${sheetViews}
  ${cols ? `<cols>${cols}</cols>` : ""}
  <sheetData>${rows}</sheetData>
  ${validations}
</worksheet>`;
}

function buildWorkbookXml(sheetNames: string[]) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${sheetNames
      .map(
        (name, index) =>
          `<sheet name="${escapeXml(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
      )
      .join("")}
  </sheets>
</workbook>`;
}

function buildWorkbookRels(sheetCount: number) {
  const sheetRels = Array.from({ length: sheetCount }, (_, index) => {
    const id = index + 1;

    return `<Relationship Id="rId${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${id}.xml"/>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetRels}
  <Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function buildContentTypes(sheetCount: number) {
  const sheetOverrides = Array.from({ length: sheetCount }, (_, index) => {
    const id = index + 1;

    return `<Override PartName="/xl/worksheets/sheet${id}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheetOverrides}
</Types>`;
}

function buildStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2"><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="49" fontId="1" fillId="1" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

function buildOptionListRows() {
  const optionEntries = Object.entries(optionLists);
  const maxLength = Math.max(...optionEntries.map(([, values]) => values.length));
  const header = optionEntries.map(([field]) => field);
  const rows = [header];

  for (let index = 0; index < maxLength; index += 1) {
    rows.push(optionEntries.map(([, values]) => values[index] ?? ""));
  }

  return rows;
}

function buildDataValidations(optionRows: string[][]): DataValidation[] {
  return Object.keys(optionLists).flatMap((fieldName) => {
    const fieldIndex = processTaskFields.findIndex((field) => field.key === fieldName);
    const optionColumnIndex = optionRows[0].findIndex((field) => field === fieldName);
    const optionEndRow = optionLists[fieldName].length + 1;

    if (fieldIndex < 0 || optionColumnIndex < 0) {
      return [];
    }

    return [{
      columnIndex: fieldIndex + 1,
      fromRow: 2,
      toRow: 500,
      optionColumnIndex: optionColumnIndex + 1,
      optionStartRow: 2,
      optionEndRow
    }];
  });
}

function buildRegisterHeader() {
  return processTaskFields.map((field) => `${field.key}\n${field.label}`);
}

function buildTaskRow(task: ProcessTask) {
  return processTaskFields.map((field) => taskValue(task, field.key));
}

export async function createProcessTaskRegisterTemplateWorkbook() {
  const optionRows = buildOptionListRows();
  const sheets: WorksheetDefinition[] = [
    {
      name: "Process Task Register",
      rows: [buildRegisterHeader(), processTaskFields.map(() => "")],
      widths: processTaskFields.map((field) => field.width),
      freezeHeader: true,
      validations: buildDataValidations(optionRows)
    },
    {
      name: "Field Guide",
      rows: [
        ["Field name", "Vietnamese label", "Required", "Description", "Example"],
        ...processTaskFields.map((field) => [
          field.key,
          field.label,
          field.required,
          field.description,
          field.example
        ])
      ],
      widths: [28, 30, 12, 54, 32],
      freezeHeader: true
    },
    {
      name: "Option Lists",
      rows: optionRows,
      widths: optionRows[0].map(() => 28),
      freezeHeader: true
    },
    {
      name: "Example SME Online Loan",
      rows: [buildRegisterHeader(), ...sampleProcessTasks.map(buildTaskRow)],
      widths: processTaskFields.map((field) => field.width),
      freezeHeader: true
    }
  ];
  const zip = new JSZip();

  zip.file("[Content_Types].xml", buildContentTypes(sheets.length));
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
  );
  zip.file("xl/workbook.xml", buildWorkbookXml(sheets.map((sheet) => sheet.name)));
  zip.file("xl/_rels/workbook.xml.rels", buildWorkbookRels(sheets.length));
  zip.file("xl/styles.xml", buildStylesXml());
  sheets.forEach((sheet, index) => {
    zip.file(`xl/worksheets/sheet${index + 1}.xml`, buildWorksheet(sheet));
  });

  return zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
}
