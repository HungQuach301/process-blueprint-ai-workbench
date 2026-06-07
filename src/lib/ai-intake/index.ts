export type {
  ActorSection,
  DataDocumentSection,
  IntakeLanguage,
  IntakeOutputLanguage,
  ProcessInfoSection,
  RelatedSystemSection,
  StartEndSection,
  StructuredProcessBrief
} from "@/lib/ai-intake/structured-process-brief";

export { AI_INTAKE_STORAGE_KEY } from "@/lib/ai-intake/structured-process-brief";

export type {
  DraftPTRConfidence,
  DraftPTRGenerationInput,
  DraftPTRGenerationResult
} from "@/lib/ai-intake/draft-ptr-generator";

export {
  generateDraftProcessTaskRegister,
  parseStructuredProcessBriefFromForm
} from "@/lib/ai-intake/draft-ptr-generator";

export type {
  DetectedProcessRegisterProfile,
  DetectProcessRegisterProfileInput,
  ProcessRegisterProfileId,
  RelatedSampleProcessId
} from "@/lib/ai-intake/detect-process-register-profile";

export {
  detectProcessRegisterProfile,
  GENERIC_PROCESS_REGISTER_PROFILE,
  PROCESS_REGISTER_PROFILE_EVENT,
  SELECTED_PROCESS_REGISTER_PROFILE_STORAGE_KEY
} from "@/lib/ai-intake/detect-process-register-profile";

export type {
  DraftProcessTaskRegister,
  SchemaValidationResult
} from "@/lib/ai-intake/draft-ptr-schema";

export {
  validateDraftProcessTaskRegister,
  validateStructuredProcessBrief
} from "@/lib/ai-intake/draft-ptr-schema";

export type {
  IntakeFileMetadata,
  IntakeFileStatus
} from "@/lib/ai-intake/file-intake";

export {
  createIntakeFileMetadata,
  isSupportedIntakeFile
} from "@/lib/ai-intake/file-intake";

export type { ExcelExtractionPreview } from "@/lib/ai-intake/excel-extractor";

export { extractDraftTasksFromExcel } from "@/lib/ai-intake/excel-extractor";

export type { DocxExtractionResult } from "@/lib/ai-intake/docx-extractor";

export { extractTextFromDocx } from "@/lib/ai-intake/docx-extractor";

export type { PdfExtractionResult } from "@/lib/ai-intake/pdf-extractor";

export {
  extractTextFromPdf,
  PDF_TEXT_EXTRACTION_FAILURE_MESSAGE
} from "@/lib/ai-intake/pdf-extractor";
