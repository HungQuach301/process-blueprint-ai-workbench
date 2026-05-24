import type { ProcessTask } from "@/lib/models/process-task";

export const SELECTED_PROCESS_REGISTER_PROFILE_STORAGE_KEY =
  "process-blueprint-ai-workbench:selected-process-register-profile";

export const PROCESS_REGISTER_PROFILE_EVENT =
  "process-blueprint-process-register-profile-change";

export type ProcessRegisterProfileId =
  | "sme-loan-lending"
  | "account-opening"
  | "payment"
  | "servicing"
  | "generic";

export type RelatedSampleProcessId =
  | "sme-online-loan"
  | "corporate-account-opening";

export type DetectedProcessRegisterProfile = {
  id: ProcessRegisterProfileId;
  label: string;
  description: string;
  confidence: "low" | "medium" | "high";
  reason: string;
  relatedSampleProcessId?: RelatedSampleProcessId;
};

export type DetectProcessRegisterProfileInput = {
  draftMetadata?: unknown;
  sourceSummary?: string;
  processInfo?: unknown;
  draftProcessTasks?: ProcessTask[];
};

const profileDefinitions: Array<{
  id: ProcessRegisterProfileId;
  label: string;
  description: string;
  relatedSampleProcessId?: RelatedSampleProcessId;
  keywords: string[];
}> = [
  {
    id: "sme-loan-lending",
    label: "SME Loan / Lending profile",
    description: "Lending, credit, loan origination, collateral, and approval journeys.",
    relatedSampleProcessId: "sme-online-loan",
    keywords: [
      "lending",
      "credit",
      "loan",
      "collateral",
      "borrower",
      "facility",
      "disbursement approval",
      "vay",
      "tin dung",
      "tai san dam bao",
      "giai ngan khoan vay"
    ]
  },
  {
    id: "account-opening",
    label: "Account Opening profile",
    description: "Account opening, customer onboarding, KYC, and corporate profile setup.",
    relatedSampleProcessId: "corporate-account-opening",
    keywords: [
      "account opening",
      "onboarding",
      "kyc",
      "ekyc",
      "cif",
      "account setup",
      "mo tai khoan",
      "mở tài khoản",
      "dinh danh"
    ]
  },
  {
    id: "payment",
    label: "Payment profile",
    description: "Payment, transfer, settlement, and disbursement journeys.",
    keywords: [
      "payment",
      "transfer",
      "disbursement",
      "settlement",
      "remittance",
      "transaction",
      "thanh toan",
      "chuyen tien",
      "giai ngan"
    ]
  },
  {
    id: "servicing",
    label: "Servicing profile",
    description: "Servicing, renewal, maintenance, and KYC refresh journeys.",
    keywords: [
      "servicing",
      "renewal",
      "kyc refresh",
      "maintenance",
      "amendment",
      "after sales",
      "dich vu sau ban",
      "tai tuc",
      "cap nhat kyc"
    ]
  }
];

export const GENERIC_PROCESS_REGISTER_PROFILE: DetectedProcessRegisterProfile = {
  id: "generic",
  label: "Generic profile",
  description: "Generic process register profile for journeys without a stronger match.",
  confidence: "low",
  reason: "No journey-specific keyword was detected."
};

function normalizeText(value: unknown): string {
  if (typeof value === "string") {
    return value.toLowerCase();
  }

  if (Array.isArray(value)) {
    return value.map(normalizeText).join(" ");
  }

  if (typeof value === "object" && value !== null) {
    return Object.values(value).map(normalizeText).join(" ");
  }

  return "";
}

function collectDetectionText(input: DetectProcessRegisterProfileInput) {
  return [
    normalizeText(input.draftMetadata),
    normalizeText(input.sourceSummary),
    normalizeText(input.processInfo),
    normalizeText(
      input.draftProcessTasks?.map((task) => [
        task.taskName,
        task.phase,
        task.system,
        task.actor,
        task.dataObject,
        task.input,
        task.output
      ])
    )
  ].join(" ");
}

export function detectProcessRegisterProfile(
  input: DetectProcessRegisterProfileInput
): DetectedProcessRegisterProfile {
  const detectionText = collectDetectionText(input);
  let bestMatch: {
    definition: (typeof profileDefinitions)[number];
    matchedKeywords: string[];
  } | null = null;

  for (const definition of profileDefinitions) {
    const matchedKeywords = definition.keywords.filter((keyword) =>
      detectionText.includes(keyword.toLowerCase())
    );

    if (
      matchedKeywords.length > 0 &&
      (!bestMatch || matchedKeywords.length > bestMatch.matchedKeywords.length)
    ) {
      bestMatch = {
        definition,
        matchedKeywords
      };
    }
  }

  if (!bestMatch) {
    return GENERIC_PROCESS_REGISTER_PROFILE;
  }

  return {
    id: bestMatch.definition.id,
    label: bestMatch.definition.label,
    description: bestMatch.definition.description,
    confidence: bestMatch.matchedKeywords.length >= 2 ? "high" : "medium",
    reason: `Matched: ${bestMatch.matchedKeywords.slice(0, 4).join(", ")}`,
    relatedSampleProcessId: bestMatch.definition.relatedSampleProcessId
  };
}
