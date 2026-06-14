import { createMockAIResponseMeta } from "@/lib/ai/ai-orchestration-types";
import type { ProcessTask } from "@/lib/models/process-task";
import type {
  AIInputBriefRequest,
  AIInputBriefResponse
} from "@/lib/ai/ai-input-brief-types";

function firstListItem(value: string | undefined, fallback: string) {
  const item = value
    ?.split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .find(Boolean);

  return item ?? fallback;
}

function createDraftTask(
  input: Omit<ProcessTask, "id" | "parentStepId" | "reviewStatus">
): ProcessTask {
  return {
    id: `mock-input-brief-${input.stepId.toLowerCase()}`,
    parentStepId: null,
    reviewStatus: "needsReview",
    ...input
  };
}

function createMockDraftProcessTasks(request: AIInputBriefRequest): ProcessTask[] {
  const brief = request.structuredBrief;
  const processName = brief?.processName || request.sourceName || "Draft process";
  const primaryActor = firstListItem(brief?.actors, "Business User");
  const primarySystem = firstListItem(brief?.systems, "Core System");
  const primaryData = firstListItem(brief?.dataDocuments, "Business documents");
  const startEvent = brief?.startEvent || "Request received";
  const endEvent = brief?.endEvent || "Process completed";
  const happyPath = firstListItem(brief?.happyPath, "Review request");
  const exception = firstListItem(brief?.exceptions, "Exception requires manual review");
  const slaControl = brief?.slaControl || "SLA/control to be confirmed";
  const desiredOutputs = brief?.desiredOutputs || "D01 BPMN, D02 Service Blueprint, QA Report";

  return [
    createDraftTask({
      stepId: "DRAFT-001",
      rowType: "start",
      bpmnType: "startEvent",
      taskNature: "manual",
      phase: "Initiate",
      group: processName,
      customerInteractionType: "Customer Action",
      channel: "Other",
      actor: primaryActor,
      actorLane: primaryActor,
      system: primarySystem,
      systemLane: primarySystem,
      dataObject: primaryData,
      dataAction: "receive",
      taskName: startEvent,
      input: brief?.scope || "Input brief",
      output: "Process started",
      defaultNextStep: "DRAFT-002",
      conditionQuestion: "",
      yesNextStep: null,
      noNextStep: null,
      exception: "",
      exceptionHandling: "",
      sla: slaControl,
      riskControl: "Review draft before apply",
      sourceRef: "AI Input Brief mock",
      comment: `Desired outputs: ${desiredOutputs}`
    }),
    createDraftTask({
      stepId: "DRAFT-002",
      rowType: "task",
      bpmnType: "userTask",
      taskNature: "manual",
      phase: "Capture",
      group: processName,
      customerInteractionType: "Front-stage People",
      channel: "Other",
      actor: primaryActor,
      actorLane: primaryActor,
      system: primarySystem,
      systemLane: primarySystem,
      dataObject: primaryData,
      dataAction: "create",
      taskName: happyPath,
      input: primaryData,
      output: "Draft information captured",
      defaultNextStep: "DRAFT-003",
      conditionQuestion: "",
      yesNextStep: null,
      noNextStep: null,
      exception,
      exceptionHandling: "Route exception to manual review",
      sla: slaControl,
      riskControl: "Check completeness",
      sourceRef: "AI Input Brief mock",
      comment: brief?.businessObjective || ""
    }),
    createDraftTask({
      stepId: "DRAFT-003",
      rowType: "task",
      bpmnType: "serviceTask",
      taskNature: "automatic",
      phase: "Validate",
      group: processName,
      customerInteractionType: "Back-stage System",
      channel: "Internal System",
      actor: "System",
      actorLane: "System",
      system: primarySystem,
      systemLane: primarySystem,
      dataObject: primaryData,
      dataAction: "validate",
      taskName: "Validate submitted data",
      input: "Draft information captured",
      output: "Validation result",
      defaultNextStep: "DRAFT-004",
      conditionQuestion: "",
      yesNextStep: null,
      noNextStep: null,
      exception,
      exceptionHandling: "Flag for review",
      sla: slaControl,
      riskControl: "System validation control",
      sourceRef: "AI Input Brief mock",
      comment: "Generated locally by mock function; no external API call."
    }),
    createDraftTask({
      stepId: "DRAFT-004",
      rowType: "gateway",
      bpmnType: "exclusiveGateway",
      taskNature: "decision",
      phase: "Decision",
      group: processName,
      customerInteractionType: "Back-stage People",
      channel: "Internal System",
      actor: primaryActor,
      actorLane: primaryActor,
      system: primarySystem,
      systemLane: primarySystem,
      dataObject: primaryData,
      dataAction: "none",
      taskName: "Decide if request can proceed",
      input: "Validation result",
      output: "Proceed or exception decision",
      defaultNextStep: null,
      conditionQuestion: "Can the process continue?",
      yesNextStep: "DRAFT-005",
      noNextStep: "DRAFT-006",
      exception,
      exceptionHandling: "Use no branch",
      sla: slaControl,
      riskControl: "Decision must be reviewed",
      sourceRef: "AI Input Brief mock",
      comment: ""
    }),
    createDraftTask({
      stepId: "DRAFT-005",
      rowType: "task",
      bpmnType: "sendTask",
      taskNature: "notification",
      phase: "Notify",
      group: processName,
      customerInteractionType: "Front-stage System",
      channel: "Email",
      actor: "System",
      actorLane: "System",
      system: primarySystem,
      systemLane: primarySystem,
      dataObject: primaryData,
      dataAction: "send",
      taskName: "Notify completion",
      input: "Proceed decision",
      output: "Completion notification sent",
      defaultNextStep: "DRAFT-007",
      conditionQuestion: "",
      yesNextStep: null,
      noNextStep: null,
      exception: "",
      exceptionHandling: "",
      sla: slaControl,
      riskControl: "Notification audit trail",
      sourceRef: "AI Input Brief mock",
      comment: ""
    }),
    createDraftTask({
      stepId: "DRAFT-006",
      rowType: "task",
      bpmnType: "userTask",
      taskNature: "manual",
      phase: "Exception",
      group: processName,
      customerInteractionType: "Back-stage People",
      channel: "Other",
      actor: primaryActor,
      actorLane: primaryActor,
      system: primarySystem,
      systemLane: primarySystem,
      dataObject: primaryData,
      dataAction: "update",
      taskName: exception,
      input: "Exception decision",
      output: "Exception handled",
      defaultNextStep: "DRAFT-007",
      conditionQuestion: "",
      yesNextStep: null,
      noNextStep: null,
      exception: "",
      exceptionHandling: "",
      sla: slaControl,
      riskControl: "Manual review control",
      sourceRef: "AI Input Brief mock",
      comment: ""
    }),
    createDraftTask({
      stepId: "DRAFT-007",
      rowType: "end",
      bpmnType: "endEvent",
      taskNature: "manual",
      phase: "Close",
      group: processName,
      customerInteractionType: "Customer Action",
      channel: "Other",
      actor: primaryActor,
      actorLane: primaryActor,
      system: primarySystem,
      systemLane: primarySystem,
      dataObject: primaryData,
      dataAction: "none",
      taskName: endEvent,
      input: "Completion or exception outcome",
      output: "Process ended",
      defaultNextStep: null,
      conditionQuestion: "",
      yesNextStep: null,
      noNextStep: null,
      exception: "",
      exceptionHandling: "",
      sla: slaControl,
      riskControl: "Final state must be explicit",
      sourceRef: "AI Input Brief mock",
      comment: `Scope: ${brief?.scope || "Not provided"}`
    })
  ];
}

export function runMockInputBriefExtraction(
  request: AIInputBriefRequest
): AIInputBriefResponse {
  return {
    draftProcessTasks: createMockDraftProcessTasks(request),
    meta: createMockAIResponseMeta(request.context, [], [
      "Mock input brief extraction scaffold only; no external API call was made."
    ])
  };
}
