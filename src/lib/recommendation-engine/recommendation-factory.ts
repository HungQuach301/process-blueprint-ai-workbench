import type { ProcessTask } from "@/lib/models/process-task";
import type {
  QARecommendation,
  QARecommendationPatch,
  QARecommendationType,
  RecommendationContext,
  RecommendationRiskLevel,
  RecommendationSource
} from "@/lib/recommendation-engine/types";

type RecommendationFactoryInput = Omit<
  QARecommendation,
  "source" | "recommendationType" | "type" | "riskLevel" | "requiresConfirmation"
> & {
  source?: RecommendationSource;
  recommendationType?: QARecommendationType;
  type?: QARecommendationType;
  riskLevel?: RecommendationRiskLevel;
  requiresConfirmation?: boolean;
};

export function normalizeRecommendation(recommendation: QARecommendation): QARecommendation {
  const recommendationType = recommendation.recommendationType ?? recommendation.type ?? "UpdateField";

  return {
    source: recommendation.source ?? "rule",
    riskLevel: recommendation.riskLevel ?? "medium",
    complianceTags: recommendation.complianceTags ?? [],
    ...recommendation,
    recommendationType,
    type: recommendation.type ?? recommendationType,
    requiresConfirmation: recommendation.requiresConfirmation ?? true
  };
}

export function createQARecommendation(input: RecommendationFactoryInput): QARecommendation {
  return normalizeRecommendation({
    ...input,
    confidence: input.confidence,
    impact: input.impact,
    previewText: input.previewText,
    targetStepIds: input.targetStepIds,
    title: input.title,
    description: input.description,
    requiresConfirmation: input.requiresConfirmation ?? true
  });
}

export function createRuleRecommendation(input: RecommendationFactoryInput): QARecommendation {
  return createQARecommendation({
    ...input,
    source: "rule"
  });
}

type RuleRecommendationInput = {
  issueId: string;
  issueCode: string;
  task: ProcessTask;
  processTasks: ProcessTask[];
  context?: Partial<RecommendationContext>;
};

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function inferSystemFromTaskName(task: ProcessTask) {
  const text = normalize(`${task.taskName} ${task.system} ${task.systemLane}`);

  if (text.includes("portal")) {
    return "Digital Lending Portal";
  }

  if (text.includes("los") || text.includes("loan origination")) {
    return "LOS";
  }

  if (["notification", "sms", "email"].some((keyword) => text.includes(keyword))) {
    return "Notification Service";
  }

  if (text.includes("ocr")) {
    return "OCR Service";
  }

  if (text.includes("cic") || text.includes("blacklist")) {
    return text.includes("cic") ? "External Data Provider" : "Internal System";
  }

  return "TBD";
}

function getAllowedBpmnTypesForRowType(rowType: string) {
  switch (rowType) {
    case "task":
      return [
        "task",
        "usertask",
        "manualtask",
        "servicetask",
        "sendtask",
        "scripttask",
        "businessruletask"
      ];
    case "gateway":
      return ["exclusivegateway", "parallelgateway", "inclusivegateway"];
    case "start":
      return ["startevent"];
    case "end":
      return ["endevent"];
    case "event":
      return ["startevent", "endevent", "none"];
    case "data":
      return ["dataobject", "datastore", "none"];
    case "phase":
    case "group":
    case "annotation":
      return ["none"];
    default:
      return [];
  }
}

function validBpmnTypeForRowType(rowType: string) {
  const allowedTypes = getAllowedBpmnTypesForRowType(normalize(rowType));

  return allowedTypes[0] ?? "none";
}

function splitTaskName(taskName: string) {
  return taskName
    .split(/\s+(?:and|và|sau đó|đồng thời)\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function inferCustomerInteractionType(task: ProcessTask): ProcessTask["customerInteractionType"] {
  const actor = normalize(task.actor);
  const taskName = normalize(task.taskName);
  const bpmnType = normalize(task.bpmnType);
  const rowType = normalize(task.rowType);

  if (["customer", "khách hàng", "sme customer"].some((keyword) => actor.includes(keyword))) {
    return "Customer Action";
  }

  if (
    actor.includes("rm") &&
    ["customer", "supplement", "request", "call", "meeting", "notify"].some((keyword) =>
      taskName.includes(keyword)
    )
  ) {
    return "Front-stage People";
  }

  if (["rm", "ops support", "credit approver", "bank user"].some((keyword) => actor.includes(keyword))) {
    return "Back-stage People";
  }

  if (bpmnType === "sendtask") {
    return "Front-stage System";
  }

  if (actor.includes("system") && bpmnType === "servicetask") {
    return "Back-stage System";
  }

  if (rowType === "data" || ["dataobject", "datastore"].includes(bpmnType)) {
    return "Data / Control";
  }

  if (["policy", "config", "rule", "control"].some((keyword) => taskName.includes(keyword))) {
    return "Support Process";
  }

  return "None";
}

function createMissingActorRecommendations(input: RuleRecommendationInput): QARecommendation[] {
  const { issueId, issueCode, task } = input;
  const bpmnType = normalize(task.bpmnType);

  if (bpmnType === "servicetask") {
    return [
      createRuleRecommendation({
        id: `${issueId}-assign-actor-system`,
        issueId,
        issueCode,
        recommendationType: "AssignActor",
        title: "Gán actor là System",
        description: "Service Task thường do hệ thống xử lý, nên actor có thể là System.",
        rationale: "BPMN Service Task nên có performer là hệ thống hoặc service.",
        confidence: "high",
        impact: "medium",
        riskLevel: "low",
        targetStepIds: [task.stepId],
        previewText: `${task.stepId}: actor = System`,
        patch: { actor: "System" },
        requiresConfirmation: true,
        complianceTags: ["traceability"]
      })
    ];
  }

  if (bpmnType === "usertask") {
    return [
      createRuleRecommendation({
        id: `${issueId}-assign-actor-bank-user`,
        issueId,
        issueCode,
        recommendationType: "AssignActor",
        title: "Gán tạm actor là Bank User và cần review",
        description: "User Task cần người thực hiện. Nếu chưa rõ vai trò, dùng Bank User và chuyển reviewStatus sang needsReview.",
        rationale: "User Task không nên thiếu vai trò xử lý.",
        confidence: "medium",
        impact: "medium",
        riskLevel: "medium",
        targetStepIds: [task.stepId],
        previewText: `${task.stepId}: actor = Bank User, reviewStatus = needsReview`,
        patch: { actor: "Bank User", reviewStatus: "needsReview" },
        warnings: ["Cần business xác nhận lại vai trò thực hiện thật sự."],
        requiresConfirmation: true,
        complianceTags: ["human-review"]
      })
    ];
  }

  return [];
}

function createMissingSystemRecommendations(input: RuleRecommendationInput): QARecommendation[] {
  const { issueId, issueCode, task } = input;
  const system = inferSystemFromTaskName(task);
  const patch: QARecommendationPatch = { system };

  if (system === "TBD") {
    patch.reviewStatus = "needsReview";
  }

  return [
    createRuleRecommendation({
      id: `${issueId}-assign-system`,
      issueId,
      issueCode,
      recommendationType: "AssignSystem",
      title: system === "TBD" ? "Gán hệ thống tạm là TBD" : `Gán hệ thống là ${system}`,
      description:
        system === "TBD"
          ? "Không suy luận được hệ thống từ taskName, nên cần người dùng review."
          : "Hệ thống được suy luận từ taskName/system keywords hiện có.",
      rationale: "Service Task cần system để D01/D02 giữ được liên kết actor-system.",
      confidence: system === "TBD" ? "low" : "medium",
      impact: "medium",
      riskLevel: system === "TBD" ? "medium" : "low",
      targetStepIds: [task.stepId],
      previewText: `${task.stepId}: system = ${system}${system === "TBD" ? ", reviewStatus = needsReview" : ""}`,
      patch,
      warnings: system === "TBD" ? ["Cần xác nhận hệ thống xử lý thật sự."] : undefined,
      requiresConfirmation: true,
      complianceTags: ["traceability"]
    })
  ];
}

function createRowTypeBpmnTypeRecommendations(input: RuleRecommendationInput): QARecommendation[] {
  const { issueId, issueCode, task } = input;
  const nextBpmnType = validBpmnTypeForRowType(task.rowType);

  return [
    createRuleRecommendation({
      id: `${issueId}-change-bpmn-type`,
      issueId,
      issueCode,
      recommendationType: "ChangeBpmnType",
      title: `Đổi BPMN type sang ${nextBpmnType}`,
      description: "Đề xuất BPMN type đầu tiên hợp lệ theo rowType hiện tại.",
      rationale: "rowType và bpmnType cần khớp để generator hiểu đúng ý nghĩa dòng.",
      confidence: "medium",
      impact: "medium",
      riskLevel: "low",
      targetStepIds: [task.stepId],
      previewText: `${task.stepId}: bpmnType ${task.bpmnType} -> ${nextBpmnType}`,
      patch: { bpmnType: nextBpmnType as ProcessTask["bpmnType"] },
      requiresConfirmation: true,
      complianceTags: ["bpmn-quality"]
    })
  ];
}

function createSplitTaskRecommendations(input: RuleRecommendationInput): QARecommendation[] {
  const { issueId, issueCode, task } = input;
  const taskNames = splitTaskName(task.taskName);

  if (taskNames.length < 2) {
    return [];
  }

  return [
    createRuleRecommendation({
      id: `${issueId}-split-task`,
      issueId,
      issueCode,
      recommendationType: "SplitTask",
      title: `Tách thành ${taskNames.length} task riêng`,
      description: "Task name có nhiều hành động. Đề xuất tách thành các dòng riêng, giữ actor/system/phase/group hiện tại.",
      rationale: "Một dòng nên đại diện một task/gateway/event/data interaction.",
      confidence: "medium",
      impact: "high",
      riskLevel: "high",
      targetStepIds: [task.stepId],
      previewText: taskNames.map((name, index) => `${index + 1}. ${name}`).join("\n"),
      newTasks: taskNames.map((name, index) => ({
        ...task,
        id: `${task.id}-split-${index + 1}`,
        stepId: `${task.stepId}.${index + 1}`,
        taskName: name,
        defaultNextStep: null,
        yesNextStep: null,
        noNextStep: null
      })),
      warnings: ["Cần xác nhận lại thứ tự stepId và nextStep sau khi tách."],
      requiresConfirmation: true,
      complianceTags: ["process-integrity"]
    })
  ];
}

function createInteractionTypeRecommendations(input: RuleRecommendationInput): QARecommendation[] {
  const { issueId, issueCode, task } = input;
  const interactionType = inferCustomerInteractionType(task);

  if (interactionType === "None") {
    return [];
  }

  return [
    createRuleRecommendation({
      id: `${issueId}-set-interaction-type`,
      issueId,
      issueCode,
      recommendationType: "SetInteractionType",
      title: `Gán customerInteractionType = ${interactionType}`,
      description: "Loại tương tác được suy luận bằng rule hiện có để D02 xếp đúng layer.",
      rationale: "D02 cần interaction type để phân lớp customer/front-stage/back-stage/data rõ ràng.",
      confidence: "medium",
      impact: "medium",
      riskLevel: "low",
      targetStepIds: [task.stepId],
      previewText: `${task.stepId}: customerInteractionType = ${interactionType}`,
      patch: { customerInteractionType: interactionType },
      requiresConfirmation: true,
      complianceTags: ["service-blueprint"]
    })
  ];
}

function createGatewayBranchRecommendations(input: RuleRecommendationInput): QARecommendation[] {
  const { issueId, issueCode, task } = input;

  return [
    createRuleRecommendation({
      id: `${issueId}-mark-review`,
      issueId,
      issueCode,
      recommendationType: "MarkReviewStatus",
      title: "Đánh dấu gateway cần review",
      description: "Gateway thiếu nhánh nên cần business xác nhận trước khi generate.",
      rationale: "Gateway thiếu Yes/No có thể làm BPMN sai luồng.",
      confidence: "high",
      impact: "medium",
      riskLevel: "medium",
      targetStepIds: [task.stepId],
      previewText: `${task.stepId}: reviewStatus = needsReview`,
      patch: { reviewStatus: "needsReview" },
      requiresConfirmation: true,
      complianceTags: ["human-review", "process-integrity"]
    }),
    createRuleRecommendation({
      id: `${issueId}-add-gateway-branch-placeholder`,
      issueId,
      issueCode,
      recommendationType: "AddGatewayBranch",
      title: "Thêm placeholder cho nhánh thiếu",
      description: "Tạo gợi ý bổ sung yesNextStep/noNextStep placeholder để người dùng điền sau.",
      rationale: "Gateway cần đủ nhánh để luồng có thể generate ổn định.",
      confidence: "low",
      impact: "medium",
      riskLevel: "high",
      targetStepIds: [task.stepId],
      previewText: `${task.stepId}: bổ sung nhánh Yes/No còn thiếu`,
      patch: {
        yesNextStep: task.yesNextStep || "TBD_YES",
        noNextStep: task.noNextStep || "TBD_NO"
      },
      warnings: ["Placeholder chưa phải stepId hợp lệ, cần tạo hoặc chọn step thật."],
      requiresConfirmation: true,
      complianceTags: ["human-review", "process-integrity"]
    })
  ];
}

export function createRuleRecommendationsForIssue(input: RuleRecommendationInput): QARecommendation[] {
  const context: RecommendationContext = {
    processTasks: input.processTasks,
    issueId: input.issueId,
    issueCode: input.issueCode,
    ...input.context
  };
  void context;

  switch (input.issueCode) {
    case "MISSING_ACTOR":
      return createMissingActorRecommendations(input);
    case "MISSING_SYSTEM_FOR_SERVICE_TASK":
      return createMissingSystemRecommendations(input);
    case "ROWTYPE_BPMNTYPE_MISMATCH":
      return createRowTypeBpmnTypeRecommendations(input);
    case "MULTI_ACTION_TASK":
      return createSplitTaskRecommendations(input);
    case "MISSING_CUSTOMER_INTERACTION_TYPE":
      return createInteractionTypeRecommendations(input);
    case "GATEWAY_MISSING_YES_NO":
      return createGatewayBranchRecommendations(input);
    default:
      return [];
  }
}
