const PDF_TEXT_EXTRACTION_FAILURE_MESSAGE =
  "Không thể trích xuất text từ file PDF này. Vui lòng paste nội dung, dùng Word/Excel, hoặc chờ tính năng OCR ở phiên bản sau.";

export type PdfExtractionResult = {
  rawText: string;
  warnings: string[];
};

function decodePdfEscapes(value: string) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\([0-7]{1,3})/g, (_, octalValue: string) =>
      String.fromCharCode(parseInt(octalValue, 8))
    );
}

function decodeHexPdfString(value: string) {
  const normalizedValue = value.replace(/\s+/g, "");
  const bytes: number[] = [];

  for (let index = 0; index < normalizedValue.length; index += 2) {
    const byte = parseInt(normalizedValue.slice(index, index + 2), 16);

    if (Number.isFinite(byte)) {
      bytes.push(byte);
    }
  }

  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    let text = "";

    for (let index = 2; index < bytes.length; index += 2) {
      text += String.fromCharCode((bytes[index] << 8) + (bytes[index + 1] ?? 0));
    }

    return text;
  }

  return new TextDecoder("latin1").decode(new Uint8Array(bytes));
}

function normalizeExtractedText(value: string) {
  return value
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractLiteralText(pdfSource: string) {
  const matches = Array.from(pdfSource.matchAll(/\((?:\\.|[^\\()])*\)\s*Tj/g));

  return matches.map((match) =>
    decodePdfEscapes(match[0].replace(/\s*Tj$/, "").slice(1, -1))
  );
}

function extractArrayText(pdfSource: string) {
  const arrayMatches = Array.from(pdfSource.matchAll(/\[([\s\S]*?)\]\s*TJ/g));

  return arrayMatches.flatMap((arrayMatch) => {
    const arrayContent = arrayMatch[1];
    const literalParts = Array.from(
      arrayContent.matchAll(/\((?:\\.|[^\\()])*\)/g)
    ).map((match) => decodePdfEscapes(match[0].slice(1, -1)));
    const hexParts = Array.from(arrayContent.matchAll(/<([0-9a-fA-F\s]+)>/g)).map(
      (match) => decodeHexPdfString(match[1])
    );

    return [...literalParts, ...hexParts];
  });
}

function extractHexText(pdfSource: string) {
  const matches = Array.from(pdfSource.matchAll(/<([0-9a-fA-F\s]+)>\s*Tj/g));

  return matches.map((match) => decodeHexPdfString(match[1]));
}

export async function extractTextFromPdf(
  file: File
): Promise<PdfExtractionResult> {
  const bytes = await file.arrayBuffer();
  const pdfSource = new TextDecoder("latin1").decode(bytes);
  const rawText = normalizeExtractedText(
    [
      ...extractLiteralText(pdfSource),
      ...extractArrayText(pdfSource),
      ...extractHexText(pdfSource)
    ].join("\n")
  );

  if (rawText.length < 20) {
    throw new Error(PDF_TEXT_EXTRACTION_FAILURE_MESSAGE);
  }

  return {
    rawText,
    warnings: [
      "PDF extraction is basic text-based parsing only.",
      "Scanned/image-based PDFs require OCR in a future version."
    ]
  };
}

export { PDF_TEXT_EXTRACTION_FAILURE_MESSAGE };
