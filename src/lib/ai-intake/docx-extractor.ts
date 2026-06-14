import JSZip from "jszip";

export type DocxExtractionResult = {
  rawText: string;
  detectedActors: string[];
  detectedSystems: string[];
  detectedDataObjects: string[];
  detectedSteps: string[];
  assumptions: string[];
  openQuestions: string[];
};

function parseXml(xml: string) {
  return new DOMParser().parseFromString(xml, "application/xml");
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values.map(cleanText).filter(Boolean)));
}

function splitList(value: string) {
  return value
    .split(/[,;|]/)
    .map((item) => item.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter(Boolean);
}

function extractLabeledValues(lines: string[], labels: RegExp[]) {
  return unique(
    lines.flatMap((line) => {
      const matchedLabel = labels.find((label) => label.test(line));

      if (!matchedLabel) {
        return [];
      }

      const [, value = ""] = line.split(/[:：]/);
      return splitList(value || line.replace(matchedLabel, ""));
    })
  );
}

function detectSteps(lines: string[]) {
  const stepLikeLines = lines.filter((line) => {
    const normalized = line.toLowerCase();

    return (
      /^\s*(step|bước|\d+[.)-])\s+/i.test(line) ||
      /\b(receive|check|review|approve|reject|create|update|send|notify|validate|record|submit)\b/i.test(
        normalized
      ) ||
      /\b(nhận|kiểm tra|rà soát|phê duyệt|từ chối|tạo|cập nhật|gửi|thông báo|xác thực|ghi nhận|nộp)\b/i.test(
        normalized
      )
    );
  });

  return unique(stepLikeLines).slice(0, 30);
}

function buildOpenQuestions(result: Omit<DocxExtractionResult, "openQuestions">) {
  const questions: string[] = [];

  if (result.detectedActors.length === 0) {
    questions.push("Which actors or departments participate in this process?");
  }

  if (result.detectedSystems.length === 0) {
    questions.push("Which systems or applications support this process?");
  }

  if (result.detectedSteps.length === 0) {
    questions.push("Which process steps should be included in the draft PTR?");
  }

  if (result.detectedDataObjects.length === 0) {
    questions.push("Which documents, data objects, or records are used?");
  }

  return questions.length > 0
    ? questions
    : ["Review extracted content before generating a Draft PTR."];
}

function extractParagraphs(documentXml: string) {
  const document = parseXml(documentXml);

  return Array.from(document.getElementsByTagName("w:p"))
    .map((paragraph) =>
      Array.from(paragraph.getElementsByTagName("w:t"))
        .map((textNode) => textNode.textContent ?? "")
        .join("")
    )
    .map(cleanText)
    .filter(Boolean);
}

export async function extractTextFromDocx(
  file: File
): Promise<DocxExtractionResult> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const documentXml = await zip.file("word/document.xml")?.async("string");

  if (!documentXml) {
    throw new Error("DOCX document.xml was not found.");
  }

  const lines = extractParagraphs(documentXml);
  const rawText = lines.join("\n");
  const partialResult = {
    rawText,
    detectedActors: extractLabeledValues(lines, [
      /\b(actor|actors|role|roles|owner|owners|department|departments)\b/i,
      /\b(người thực hiện|vai trò|bộ phận|phòng ban)\b/i
    ]),
    detectedSystems: extractLabeledValues(lines, [
      /\b(system|systems|application|applications|app|platform)\b/i,
      /\b(hệ thống|ứng dụng|nền tảng)\b/i
    ]),
    detectedDataObjects: extractLabeledValues(lines, [
      /\b(data|document|documents|record|records|form|forms)\b/i,
      /\b(dữ liệu|tài liệu|hồ sơ|biểu mẫu)\b/i
    ]),
    detectedSteps: detectSteps(lines),
    assumptions: [
      "DOCX extraction is local and rule-based.",
      "Detected entities are inferred from labels and action-like lines.",
      "Generated Draft PTR must be reviewed before Apply."
    ]
  };

  return {
    ...partialResult,
    openQuestions: buildOpenQuestions(partialResult)
  };
}
