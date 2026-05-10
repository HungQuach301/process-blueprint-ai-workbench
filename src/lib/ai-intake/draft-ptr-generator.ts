import type {
  ActorSection,
  IntakeLanguage,
  IntakeOutputLanguage,
  StructuredProcessBrief
} from "@/lib/ai-intake/structured-process-brief";
import type { Channel, CustomerInteractionType, ProcessTask } from "@/lib/models/process-task";

export type DraftPTRConfidence = "low" | "medium" | "high";

export type DraftPTRGenerationInput = {
  brief: StructuredProcessBrief;
  currentLocale?: IntakeLanguage;
};

export type DraftPTRGenerationResult = {
  draftProcessTasks: ProcessTask[];
  assumptions: string[];
  openQuestions: string[];
  qualityIssues: string[];
  qualityGateWarnings?: string[];
  sourceSummary: string;
  confidence: DraftPTRConfidence;
  inputLanguage: IntakeLanguage;
  outputLanguage: IntakeOutputLanguage;
};

type DraftTaskInput = Omit<ProcessTask, "id" | "parentStepId" | "reviewStatus">;

function getDraftLabels(outputLanguage: IntakeOutputLanguage) {
  const useVietnamese = outputLanguage === "vi" || outputLanguage === "bilingual";

  if (!useVietnamese) {
    return {
      capturePrefix: "Capture",
      captureSuffix: "information",
      reviewPrefix: "Review",
      reviewSuffix: "request",
      validatePrefix: "Validate request in",
      recordPrefix: "Record",
      notifyOutcome: "Notify process outcome",
      informationCaptured: "Information captured",
      reviewResult: "Review result",
      systemValidationResult: "System validation result",
      processStarted: "Process started",
      processEnded: "Process ended",
      finalOutcome: "Final process outcome"
    };
  }

  return {
    capturePrefix: "Ghi nhận thông tin",
    captureSuffix: "",
    reviewPrefix: "Rà soát yêu cầu",
    reviewSuffix: "",
    validatePrefix: "Kiểm tra yêu cầu trên",
    recordPrefix: "Ghi nhận",
    notifyOutcome: "Thông báo kết quả quy trình",
    informationCaptured: "Thông tin đã được ghi nhận",
    reviewResult: "Kết quả rà soát",
    systemValidationResult: "Kết quả kiểm tra hệ thống",
    processStarted: "Quy trình đã bắt đầu",
    processEnded: "Quy trình đã kết thúc",
    finalOutcome: "Kết quả cuối cùng của quy trình"
  };
}

function clean(value: string | undefined) {
  return value?.trim() ?? "";
}

function firstSentence(value: string, fallback: string) {
  const sentence = value
    .split(/\r?\n|[.!?]/)
    .map((entry) => entry.trim())
    .find(Boolean);

  return sentence || fallback;
}

function splitLines(value: string) {
  return value
    .split(/\r?\n|,|;/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function splitStartEnd(value: string) {
  const lines = splitLines(value);
  const singleLine = lines[0] ?? "";
  const fromToMatch =
    singleLine.match(/từ lúc\s+(.+?)\s+đến khi\s+(.+)/i) ??
    singleLine.match(/tu luc\s+(.+?)\s+den khi\s+(.+)/i);
  const englishFromToMatch = singleLine.match(/from\s+(.+?)\s+to\s+(.+)/i);

  if (fromToMatch) {
    return {
      startEvent: fromToMatch[1].trim(),
      endEvent: fromToMatch[2].trim()
    };
  }

  if (englishFromToMatch) {
    return {
      startEvent: englishFromToMatch[1].trim(),
      endEvent: englishFromToMatch[2].trim()
    };
  }

  return {
    startEvent: lines[0] ?? "Request received",
    endEvent: lines[lines.length - 1] ?? lines[0] ?? "Process completed"
  };
}

function looksLikeSystem(value: string) {
  return /\b(crm|core|banking|los|bpm|workflow|ecm|dms|s3|notification|website|mobile|app|portal|email|sms|call|branch|cic|blacklist|ekyc|tax|registry|payment|provider|system)\b/i.test(
    value
  );
}

function splitSystemsAndDocuments(value: string) {
  const entries = splitLines(value);

  return {
    systems: entries.filter(looksLikeSystem),
    documents: entries.filter((entry) => !looksLikeSystem(entry))
  };
}

function formatStepId(index: number) {
  return `DRAFT-${String(index).padStart(3, "0")}`;
}

function createDraftTask(input: DraftTaskInput): ProcessTask {
  return {
    id: `mock-input-brief-${input.stepId.toLowerCase()}`,
    parentStepId: null,
    reviewStatus: "needsReview",
    ...input
  };
}

function getActorName(actor: ActorSection | undefined, fallback: string) {
  return clean(actor?.name) || fallback;
}

function inferCustomerInteraction(
  actor: ActorSection | undefined,
  fallback: CustomerInteractionType
): CustomerInteractionType {
  if (actor?.type === "customer") {
    return "Customer Action";
  }

  if (actor?.type === "system") {
    return "Back-stage System";
  }

  return fallback;
}

function inferChannel(text: string, fallback: Channel): Channel {
  const normalized = text.toLowerCase();

  if (normalized.includes("mobile") || normalized.includes("app")) {
    return "Mobile App";
  }

  if (normalized.includes("portal") || normalized.includes("online")) {
    return "Portal";
  }

  if (normalized.includes("email")) {
    return "Email";
  }

  if (normalized.includes("sms")) {
    return "SMS";
  }

  if (normalized.includes("phone") || normalized.includes("call")) {
    return "Phone Call";
  }

  if (normalized.includes("branch")) {
    return "Branch";
  }

  return fallback;
}

function shouldNotifyCustomer(brief: StructuredProcessBrief) {
  const text = [
    brief.processInfo.processName,
    brief.businessObjective,
    brief.scope,
    brief.startEnd.endEvent,
    brief.actors.map((actor) => actor.name).join(" ")
  ]
    .join(" ")
    .toLowerCase();

  return [
    "customer",
    "khach hang",
    "client",
    "notify",
    "notification",
    "thong bao",
    "approved",
    "rejected",
    "completed",
    "opened"
  ].some((keyword) => text.includes(keyword));
}

function buildSourceSummary(brief: StructuredProcessBrief) {
  const processName = clean(brief.processInfo.processName) || "Unnamed process";
  const objective = firstSentence(brief.businessObjective, "No business objective provided");
  const scope = firstSentence(brief.scope, "Scope not provided");

  return `${processName}. Objective: ${objective}. Scope: ${scope}.`;
}

function buildAssumptions(brief: StructuredProcessBrief) {
  const assumptions: string[] = [
    "Draft is generated locally from the structured Input Brief.",
    "All rows are marked Need Review before user apply."
  ];

  if (brief.actors.length === 0) {
    assumptions.push("Primary actor is assumed to be Business User.");
  }

  if (
    !brief.customerSystems?.length &&
    !brief.internalSystems?.length &&
    !brief.thirdPartySystems?.length &&
    (!brief.relatedSystems || brief.relatedSystems.length === 0)
  ) {
    assumptions.push("No related system was provided, so system work is kept minimal.");
  }

  if (!brief.dataDocuments || brief.dataDocuments.length === 0) {
    assumptions.push("No data/document list was provided, so data interaction is omitted.");
  }

  return assumptions;
}

function buildOpenQuestions(brief: StructuredProcessBrief) {
  const openQuestions: string[] = [];

  if (!clean(brief.processInfo.processName)) {
    openQuestions.push("What is the official process name?");
  }

  if (!clean(brief.startEnd.startEvent) || !clean(brief.startEnd.endEvent)) {
    openQuestions.push("What are the exact start trigger and final outcome?");
  }

  if (brief.actors.length === 0) {
    openQuestions.push("Which roles or departments participate in this process?");
  }

  if (
    !brief.customerSystems?.length &&
    !brief.internalSystems?.length &&
    !brief.thirdPartySystems?.length &&
    (!brief.relatedSystems || brief.relatedSystems.length === 0)
  ) {
    openQuestions.push("Which systems or applications support the process?");
  }

  if (!brief.dataDocuments || brief.dataDocuments.length === 0) {
    openQuestions.push("Which data, documents, forms, or records are used?");
  }

  return openQuestions.length > 0
    ? openQuestions
    : ["No major open questions detected from the current structured brief."];
}

function inferConfidence(brief: StructuredProcessBrief): DraftPTRConfidence {
  const filledCount = [
    clean(brief.processInfo.processName),
    clean(brief.businessObjective),
    clean(brief.scope),
    clean(brief.startEnd.startEvent),
    clean(brief.startEnd.endEvent),
    brief.actors.length > 0 ? "actors" : "",
    brief.customerSystems && brief.customerSystems.length > 0 ? "customer systems" : "",
    brief.internalSystems && brief.internalSystems.length > 0 ? "internal systems" : "",
    brief.thirdPartySystems && brief.thirdPartySystems.length > 0 ? "third-party systems" : "",
    brief.relatedSystems && brief.relatedSystems.length > 0 ? "systems" : "",
    brief.dataDocuments && brief.dataDocuments.length > 0 ? "data" : ""
  ].filter(Boolean).length;

  if (filledCount >= 7) {
    return "high";
  }

  if (filledCount >= 4) {
    return "medium";
  }

  return "low";
}

export function parseStructuredProcessBriefFromForm(input: {
  processInfo: string;
  businessObjective: string;
  scope?: string;
  startEnd?: string;
  scopeBoundary?: string;
  actors: string;
  relatedSystems?: string;
  systemsAndDocuments?: string;
  customerSystems?: string;
  customerFacingSystems?: string;
  internalSystems?: string;
  thirdPartySystems?: string;
  dataDocuments: string;
  inputLanguage?: IntakeLanguage;
  outputLanguage?: IntakeOutputLanguage;
}): StructuredProcessBrief {
  const actorNames = splitLines(input.actors);
  const combinedLegacy = splitSystemsAndDocuments(input.systemsAndDocuments ?? "");
  const customerSystemNames = unique([
    ...splitLines(input.customerSystems ?? ""),
    ...splitLines(input.customerFacingSystems ?? "")
  ]);
  const internalSystemNames = unique(splitLines(input.internalSystems ?? ""));
  const thirdPartySystemNames = unique(splitLines(input.thirdPartySystems ?? ""));
  const relatedSystemNames = unique([
    ...splitLines(input.relatedSystems ?? ""),
    ...combinedLegacy.systems
  ]);
  const systemNames = unique([
    ...customerSystemNames,
    ...internalSystemNames,
    ...thirdPartySystemNames,
    ...relatedSystemNames
  ]);
  const dataNames = unique([
    ...splitLines(input.dataDocuments),
    ...combinedLegacy.documents
  ]);
  const scope = clean(input.scope) || clean(input.scopeBoundary);
  const startEnd = splitStartEnd(clean(input.startEnd) || clean(input.scopeBoundary));

  return {
    processInfo: {
      processName: firstSentence(input.processInfo, "Draft process")
    },
    businessObjective: input.businessObjective,
    scopeBoundary: input.scopeBoundary,
    scope,
    startEnd: {
      startEvent: startEnd.startEvent,
      endEvent: startEnd.endEvent
    },
    actors: actorNames.map((name) => ({
      name,
      type: /customer|khach hang|client/i.test(name) ? "customer" : "internal"
    })),
    customerSystems: customerSystemNames.map((name) => ({
      name,
      category: "customer"
    })),
    internalSystems: internalSystemNames.map((name) => ({
      name,
      category: "internal"
    })),
    thirdPartySystems: thirdPartySystemNames.map((name) => ({
      name,
      category: "thirdParty"
    })),
    relatedSystems: systemNames.map((name) => ({ name })),
    systemsAndDocuments: input.systemsAndDocuments,
    dataDocuments: dataNames.map((name) => ({ name, type: "document" })),
    inputLanguage: input.inputLanguage,
    outputLanguage: input.outputLanguage
  };
}

export function generateDraftProcessTaskRegister(
  input: DraftPTRGenerationInput
): DraftPTRGenerationResult {
  const brief = input.brief;
  const inputLanguage = brief.inputLanguage ?? input.currentLocale ?? "vi";
  const outputLanguage = brief.outputLanguage ?? inputLanguage;
  const labels = getDraftLabels(outputLanguage);
  const processName = clean(brief.processInfo.processName) || "Draft process";
  const startEvent = clean(brief.startEnd.startEvent) || "Request received";
  const endEvent = clean(brief.startEnd.endEvent) || "Process completed";
  const actors = brief.actors.length > 0 ? brief.actors : [{ name: "Business User" }];
  const primaryActor = actors[0];
  const primaryActorName = getActorName(primaryActor, "Business User");
  const secondaryActor = actors[1];
  const customerSystems = brief.customerSystems ?? [];
  const internalSystems =
    brief.internalSystems && brief.internalSystems.length > 0
      ? brief.internalSystems
      : brief.relatedSystems ?? [];
  const thirdPartySystems = brief.thirdPartySystems ?? [];
  const primaryCustomerSystem = clean(customerSystems[0]?.name);
  const primaryInternalSystem = clean(internalSystems[0]?.name);
  const primaryThirdPartySystem = clean(thirdPartySystems[0]?.name);
  const primarySystem =
    primaryInternalSystem || primaryCustomerSystem || primaryThirdPartySystem || "";
  const primaryData = clean(brief.dataDocuments?.[0]?.name) || "";
  const defaultSystem = primarySystem || "Manual / TBD";
  const defaultData = primaryData || "Input brief";
  const defaultChannel = inferChannel(
    `${primaryCustomerSystem} ${brief.processInfo.processName} ${brief.scope} ${brief.startEnd.startEvent}`,
    "Other"
  );
  const taskInputs: DraftTaskInput[] = [];

  taskInputs.push({
    stepId: "",
    rowType: "start",
    bpmnType: "startEvent",
    taskNature: "manual",
    phase: "Initiate",
    group: processName,
    customerInteractionType: inferCustomerInteraction(primaryActor, "Customer Action"),
    channel: defaultChannel,
    actor: primaryActorName,
    actorLane: primaryActorName,
    system: primaryCustomerSystem || defaultSystem,
    systemLane: primaryCustomerSystem || defaultSystem,
    dataObject: defaultData,
    dataAction: "receive",
    taskName: startEvent,
    input: firstSentence(brief.scope, "Input brief"),
    output: labels.processStarted,
    defaultNextStep: null,
    conditionQuestion: "",
    yesNextStep: null,
    noNextStep: null,
    exception: "",
    exceptionHandling: "",
    sla: "To be confirmed",
    riskControl: "Review generated draft before apply",
    sourceRef: "AI Input Brief local mock",
    comment: `Source summary: ${buildSourceSummary(brief)}`
  });

  taskInputs.push({
    stepId: "",
    rowType: "task",
    bpmnType: "userTask",
    taskNature: "manual",
    phase: "Capture",
    group: processName,
    customerInteractionType: inferCustomerInteraction(primaryActor, "Front-stage People"),
    channel: defaultChannel,
    actor: primaryActorName,
    actorLane: primaryActorName,
    system: primaryCustomerSystem || defaultSystem,
    systemLane: primaryCustomerSystem || defaultSystem,
    dataObject: defaultData,
    dataAction: primaryData ? "create" : "none",
    taskName: `${labels.capturePrefix} ${processName} ${labels.captureSuffix}`.trim(),
    input: firstSentence(brief.businessObjective, "Business request"),
    output: labels.informationCaptured,
    defaultNextStep: null,
    conditionQuestion: "",
    yesNextStep: null,
    noNextStep: null,
    exception: "Information is incomplete or unclear",
    exceptionHandling: "Return for clarification",
    sla: "To be confirmed",
    riskControl: "Completeness check",
    sourceRef: "AI Input Brief local mock",
    comment: brief.businessObjective
  });

  if (secondaryActor) {
    const secondaryActorName = getActorName(secondaryActor, "Reviewer");
    taskInputs.push({
      stepId: "",
      rowType: "task",
      bpmnType: "userTask",
      taskNature: "manual",
      phase: "Review",
      group: processName,
      customerInteractionType: inferCustomerInteraction(secondaryActor, "Back-stage People"),
      channel: "Other",
      actor: secondaryActorName,
      actorLane: secondaryActorName,
      system: defaultSystem,
      systemLane: defaultSystem,
      dataObject: defaultData,
      dataAction: "validate",
      taskName: `${labels.reviewPrefix} ${processName} ${labels.reviewSuffix}`.trim(),
      input: labels.informationCaptured,
      output: labels.reviewResult,
      defaultNextStep: null,
      conditionQuestion: "",
      yesNextStep: null,
      noNextStep: null,
      exception: "Review cannot be completed",
      exceptionHandling: "Escalate for manual decision",
      sla: "To be confirmed",
      riskControl: "Maker-checker review",
      sourceRef: "AI Input Brief local mock",
      comment: ""
    });
  }

  if (primaryInternalSystem) {
    taskInputs.push({
      stepId: "",
      rowType: "task",
      bpmnType: "serviceTask",
      taskNature: "automatic",
      phase: "Validate",
      group: processName,
      customerInteractionType: "Back-stage System",
      channel: "Internal System",
      actor: "System",
      actorLane: "System",
      system: primaryInternalSystem,
      systemLane: primaryInternalSystem,
      dataObject: defaultData,
      dataAction: "validate",
      taskName: `${labels.validatePrefix} ${primaryInternalSystem}`,
      input: secondaryActor ? labels.reviewResult : labels.informationCaptured,
      output: labels.systemValidationResult,
      defaultNextStep: null,
      conditionQuestion: "",
      yesNextStep: null,
      noNextStep: null,
      exception: "System validation fails",
      exceptionHandling: "Route to manual review",
      sla: "To be confirmed",
      riskControl: "System validation control",
      sourceRef: "AI Input Brief local mock",
      comment: "Generated locally; no external API call."
    });
  }

  if (primaryThirdPartySystem) {
    taskInputs.push({
      stepId: "",
      rowType: "task",
      bpmnType: "serviceTask",
      taskNature: "integration",
      phase: "External Check",
      group: processName,
      customerInteractionType: "Support Process",
      channel: "Other",
      actor: "System",
      actorLane: "System",
      system: primaryThirdPartySystem,
      systemLane: primaryThirdPartySystem,
      dataObject: defaultData,
      dataAction: "send",
      taskName: `Exchange information with ${primaryThirdPartySystem}`,
      input: primaryInternalSystem
        ? labels.systemValidationResult
        : labels.informationCaptured,
      output: `${primaryThirdPartySystem} response received`,
      defaultNextStep: null,
      conditionQuestion: "",
      yesNextStep: null,
      noNextStep: null,
      exception: "Third-party provider is unavailable or rejects the request",
      exceptionHandling: "Retry, fallback, or route to manual review",
      sla: "To be confirmed",
      riskControl: "Third-party request/response audit trail",
      sourceRef: "AI Input Brief local mock",
      comment: "Generated locally; no external API call."
    });
  }

  if (primaryData) {
    taskInputs.push({
      stepId: "",
      rowType: "data",
      bpmnType: "dataObject",
      taskNature: "data",
      phase: "Data",
      group: processName,
      customerInteractionType: "Data / Control",
      channel: primarySystem ? "Document Store" : "Other",
      actor: primarySystem ? "System" : primaryActorName,
      actorLane: primarySystem ? "System" : primaryActorName,
      system: primarySystem || "Document Store",
      systemLane: primarySystem || "Document Store",
      dataObject: primaryData,
      dataAction: "store",
      taskName: `${labels.recordPrefix} ${primaryData}`,
      input: primaryThirdPartySystem
        ? `${primaryThirdPartySystem} response received`
        : primaryInternalSystem
          ? labels.systemValidationResult
          : labels.informationCaptured,
      output: `${primaryData} recorded`,
      defaultNextStep: null,
      conditionQuestion: "",
      yesNextStep: null,
      noNextStep: null,
      exception: "Data/document is missing",
      exceptionHandling: "Request correction or supporting evidence",
      sla: "To be confirmed",
      riskControl: "Data/document traceability",
      sourceRef: "AI Input Brief local mock",
      comment: ""
    });
  }

  if (shouldNotifyCustomer(brief)) {
    taskInputs.push({
      stepId: "",
      rowType: "task",
      bpmnType: "sendTask",
      taskNature: "notification",
      phase: "Notify",
      group: processName,
      customerInteractionType: "Front-stage System",
      channel: "Email",
      actor: "System",
      actorLane: "System",
      system: primaryInternalSystem || primaryCustomerSystem || "Notification Service",
      systemLane: primaryInternalSystem || primaryCustomerSystem || "Notification Service",
      dataObject: primaryData || "Notification message",
      dataAction: "send",
      taskName: labels.notifyOutcome,
      input: primaryData ? `${primaryData} recorded` : "Process outcome",
      output: "Outcome notification sent",
      defaultNextStep: null,
      conditionQuestion: "",
      yesNextStep: null,
      noNextStep: null,
      exception: "Notification cannot be delivered",
      exceptionHandling: "Retry or use alternate channel",
      sla: "To be confirmed",
      riskControl: "Notification audit trail",
      sourceRef: "AI Input Brief local mock",
      comment: ""
    });
  }

  taskInputs.push({
    stepId: "",
    rowType: "end",
    bpmnType: "endEvent",
    taskNature: "manual",
    phase: "Close",
    group: processName,
    customerInteractionType: inferCustomerInteraction(primaryActor, "Customer Action"),
    channel: defaultChannel,
    actor: primaryActorName,
    actorLane: primaryActorName,
    system: defaultSystem,
    systemLane: defaultSystem,
    dataObject: defaultData,
    dataAction: "none",
    taskName: endEvent,
      input: labels.finalOutcome,
      output: labels.processEnded,
    defaultNextStep: null,
    conditionQuestion: "",
    yesNextStep: null,
    noNextStep: null,
    exception: "",
    exceptionHandling: "",
    sla: "To be confirmed",
    riskControl: "Final state must be confirmed",
    sourceRef: "AI Input Brief local mock",
    comment: `Output language: ${outputLanguage}`
  });

  const draftProcessTasks = taskInputs.map((taskInput, index) => {
    const stepId = formatStepId(index + 1);
    const nextStepId = index < taskInputs.length - 1 ? formatStepId(index + 2) : null;

    return createDraftTask({
      ...taskInput,
      stepId,
      defaultNextStep: nextStepId
    });
  });

  return {
    draftProcessTasks,
    assumptions: buildAssumptions(brief),
    openQuestions: buildOpenQuestions(brief),
    qualityIssues: [],
    sourceSummary: buildSourceSummary(brief),
    confidence: inferConfidence(brief),
    inputLanguage,
    outputLanguage
  };
}
