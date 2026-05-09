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
