export type IntakeFileStatus =
  | "selected"
  | "pending-extraction"
  | "extracted"
  | "unsupported"
  | "failed";

export type IntakeFileMetadata = {
  fileName: string;
  fileType: string;
  fileSize: number;
  lastModified: number;
  status: IntakeFileStatus;
};

const supportedExtensions = [".xlsx", ".docx", ".pdf"];

function getFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");

  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
}

export function isSupportedIntakeFile(file: Pick<File, "name" | "type">) {
  const extension = getFileExtension(file.name);

  return supportedExtensions.includes(extension) || file.type.startsWith("image/");
}

export function createIntakeFileMetadata(file: File): IntakeFileMetadata {
  const extension = getFileExtension(file.name);
  const fileType = file.type || extension || "unknown";

  return {
    fileName: file.name,
    fileType,
    fileSize: file.size,
    lastModified: file.lastModified,
    status: isSupportedIntakeFile(file) ? "selected" : "unsupported"
  };
}
