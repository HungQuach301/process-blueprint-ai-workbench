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

function findTaskIndex(tasks: ProcessTask[], stepId: string) {
  return tasks.findIndex((task) => task.stepId === stepId);
}

function findLikelyNextTask(task: ProcessTask, tasks: ProcessTask[]) {
  const taskIndex = findTaskIndex(tasks, task.stepId);

  if (taskIndex < 0) {
    return undefined;
  }

  return tasks.slice(taskIndex + 1).find((candidate) => candidate.stepId && candidate.rowType !== "annotation");
}

function getInvalidConnectionField(issueId: string): "defaultNextStep" | "yesNextStep" | "noNextStep" {
  if (issueId.endsWith("-yesNextStep")) {
    return "yesNextStep";
  }

  if (issueId.endsWith("-noNextStep")) {
    return "noNextStep";
  }

  return "defaultNextStep";
}

function buildUniqueStepId(baseStepId: string, tasks: ProcessTask[]) {
  const existingStepIds = new Set(tasks.map((task) => task.stepId));
  let index = 1;
  let stepId = `${baseStepId}_N${index}`;

  while (existingStepIds.has(stepId)) {
    index += 1;
    stepId = `${baseStepId}_N${index}`;
  }

  return stepId;
}

function buildSplitStepId(baseStepId: string, index: number, usedStepIds: Set<string>) {
  const suffix = String.fromCharCode(65 + index);
  const preferredStepId = `${baseStepId}${suffix}`;

  if (!usedStepIds.has(preferredStepId)) {
    usedStepIds.add(preferredStepId);
    return preferredStepId;
  }

  let fallbackIndex = 1;
  let fallbackStepId = `${preferredStepId}_${fallbackIndex}`;

  while (usedStepIds.has(fallbackStepId)) {
    fallbackIndex += 1;
    fallbackStepId = `${preferredStepId}_${fallbackIndex}`;
  }

  usedStepIds.add(fallbackStepId);
  return fallbackStepId;
}

function inferNotificationChannel(task: ProcessTask): ProcessTask["channel"] {
  const text = normalize(`${task.taskName} ${task.system} ${task.channel}`);

  if (text.includes("email")) {
    return "Email";
  }

  return "SMS";
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
    .split(/\s+(?:and|then|after|parallel|và|sau đó|đồng thời)\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function inferCustomerInteractionType(task: ProcessTask): ProcessTask["customerInteractionType"] {
  const actor = normalize(task.actor);
  const system = normalize(task.system);
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

  if ((actor.includes("system") || system.length > 0) && bpmnType === "servicetask") {
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
        operations: [
          {
            kind: "AssignActor",
            stepId: task.stepId,
            actor: "System"
          }
        ],
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
        operations: [
          {
            kind: "AssignActor",
            stepId: task.stepId,
            actor: "Bank User"
          },
          {
            kind: "MarkReviewStatus",
            stepId: task.stepId,
            reviewStatus: "needsReview"
          }
        ],
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
      operations: [
        {
          kind: "AssignSystem",
          stepId: task.stepId,
          system
        },
        ...(system === "TBD"
          ? [
              {
                kind: "MarkReviewStatus" as const,
                stepId: task.stepId,
                reviewStatus: "needsReview" as const
              }
            ]
          : [])
      ],
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
  const { issueId, issueCode, task, processTasks } = input;
  const taskNames = splitTaskName(task.taskName);

  if (taskNames.length < 2) {
    return [];
  }

  if (task.rowType === "gateway" || task.yesNextStep || task.noNextStep) {
    return [
      createRuleRecommendation({
        id: `${issueId}-review-before-split`,
        issueId,
        issueCode,
        recommendationType: "MarkReviewStatus",
        title: "Review before splitting branched task",
        description: "This row is a gateway or has Yes/No branches, so it should not be split automatically.",
        rationale: "Auto-splitting a branched row can break gateway semantics and process connections.",
        confidence: "high",
        impact: "medium",
        riskLevel: "high",
        targetStepIds: [task.stepId],
        previewText: `${task.stepId}: reviewStatus = needsReview`,
        patch: { reviewStatus: "needsReview" },
        operations: [
          {
            kind: "MarkReviewStatus",
            stepId: task.stepId,
            reviewStatus: "needsReview"
          }
        ],
        warnings: ["Split this task manually after confirming branch semantics."],
        requiresConfirmation: true,
        complianceTags: ["process-integrity", "human-review"]
      })
    ];
  }

  const usedStepIds = new Set(processTasks.map((processTask) => processTask.stepId));
  const newTasks = taskNames.map((name, index) => ({
    ...task,
    id: `${task.id}-split-${index + 1}`,
    stepId: buildSplitStepId(task.stepId, index, usedStepIds),
    taskName: name,
    defaultNextStep: null,
    yesNextStep: null,
    noNextStep: null
  }));

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
      previewText: newTasks.map((newTask) => `${newTask.stepId}: ${newTask.taskName}`).join("\n"),
      newTasks,
      operations: [
        {
          kind: "SplitTask",
          targetStepId: task.stepId,
          newTasks
        }
      ],
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
      operations: [
        {
          kind: "SetInteractionType",
          stepId: task.stepId,
          customerInteractionType: interactionType
        }
      ],
      requiresConfirmation: true,
      complianceTags: ["service-blueprint"]
    })
  ];
}

function createActorLaneRecommendations(input: RuleRecommendationInput): QARecommendation[] {
  const { issueId, issueCode, task } = input;
  const actorLane = task.actor?.trim();

  if (!actorLane) {
    return [];
  }

  return [
    createRuleRecommendation({
      id: `${issueId}-set-actor-lane`,
      issueId,
      issueCode,
      recommendationType: "UpdateField",
      title: `Set actorLane = ${actorLane}`,
      description: "User Task should use actorLane = actor when no more specific lane is available.",
      rationale: "A User Task without actorLane can be placed in the wrong lane.",
      confidence: "high",
      impact: "medium",
      riskLevel: "low",
      targetStepIds: [task.stepId],
      previewText: `${task.stepId}: actorLane = ${actorLane}`,
      patch: { actorLane },
      operations: [
        {
          kind: "UpdateTaskField",
          stepId: task.stepId,
          field: "actorLane",
          value: actorLane
        }
      ],
      requiresConfirmation: true,
      complianceTags: ["traceability", "lane-quality"]
    })
  ];
}

function createSystemLaneRecommendations(input: RuleRecommendationInput): QARecommendation[] {
  const { issueId, issueCode, task } = input;
  const systemLane = task.system?.trim();

  if (!systemLane) {
    return [];
  }

  return [
    createRuleRecommendation({
      id: `${issueId}-set-system-lane`,
      issueId,
      issueCode,
      recommendationType: "UpdateField",
      title: `Set systemLane = ${systemLane}`,
      description: "Service Task should use systemLane = system when no more specific lane is available.",
      rationale: "A Service Task without systemLane can be placed in the wrong lane.",
      confidence: "high",
      impact: "medium",
      riskLevel: "low",
      targetStepIds: [task.stepId],
      previewText: `${task.stepId}: systemLane = ${systemLane}`,
      patch: { systemLane },
      operations: [
        {
          kind: "UpdateTaskField",
          stepId: task.stepId,
          field: "systemLane",
          value: systemLane
        }
      ],
      requiresConfirmation: true,
      complianceTags: ["traceability", "lane-quality"]
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
      operations: [
        {
          kind: "MarkReviewStatus",
          stepId: task.stepId,
          reviewStatus: "needsReview"
        }
      ],
      requiresConfirmation: true,
      complianceTags: ["human-review", "process-integrity"]
    }),
    createRuleRecommendation({
      id: `${issueId}-add-gateway-branch-tbd`,
      issueId,
      issueCode,
      recommendationType: "AddGatewayBranch",
      title: "Thêm giá trị TBD cho nhánh thiếu",
      description: "Tạo gợi ý bổ sung yesNextStep/noNextStep dạng TBD để người dùng điền sau.",
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
      warnings: ["Giá trị TBD chưa phải stepId hợp lệ, cần tạo hoặc chọn step thật."],
      requiresConfirmation: true,
      complianceTags: ["human-review", "process-integrity"]
    })
  ];
}

function createGatewayBranchOperationRecommendations(input: RuleRecommendationInput): QARecommendation[] {
  const { issueId, issueCode, task } = input;
  const yesNextStep = task.yesNextStep || "TBD_YES";
  const noNextStep = task.noNextStep || "TBD_NO";

  return [
    createRuleRecommendation({
      id: `${issueId}-mark-review`,
      issueId,
      issueCode,
      recommendationType: "MarkReviewStatus",
      title: "Mark gateway as Need Review",
      description: "The gateway is missing one or more branches and needs business review.",
      rationale: "A gateway without Yes/No branches can break BPMN flow.",
      confidence: "high",
      impact: "medium",
      riskLevel: "medium",
      targetStepIds: [task.stepId],
      previewText: `${task.stepId}: reviewStatus = needsReview`,
      patch: { reviewStatus: "needsReview" },
      operations: [
        {
          kind: "MarkReviewStatus",
          stepId: task.stepId,
          reviewStatus: "needsReview"
        }
      ],
      requiresConfirmation: true,
      complianceTags: ["human-review", "process-integrity"]
    }),
    createRuleRecommendation({
      id: `${issueId}-add-gateway-branch-tbd`,
      issueId,
      issueCode,
      recommendationType: "AddGatewayBranch",
      title: "Add temporary gateway branches",
      description: "Add TBD yesNextStep/noNextStep values for user review.",
      rationale: "A gateway needs explicit branches before generation.",
      confidence: "low",
      impact: "medium",
      riskLevel: "high",
      targetStepIds: [task.stepId],
      previewText: `${task.stepId}: yesNextStep = ${yesNextStep}, noNextStep = ${noNextStep}`,
      patch: {
        yesNextStep,
        noNextStep,
        reviewStatus: "needsReview"
      },
      operations: [
        {
          kind: "UpdateConnection",
          stepId: task.stepId,
          field: "yesNextStep",
          value: yesNextStep
        },
        {
          kind: "UpdateConnection",
          stepId: task.stepId,
          field: "noNextStep",
          value: noNextStep
        },
        {
          kind: "MarkReviewStatus",
          stepId: task.stepId,
          reviewStatus: "needsReview"
        }
      ],
      warnings: ["TBD stepIds are not valid yet; create or select real target steps before final export."],
      requiresConfirmation: true,
      complianceTags: ["human-review", "process-integrity"]
    })
  ];
}

function createDisconnectedTaskRecommendations(input: RuleRecommendationInput): QARecommendation[] {
  const { issueId, issueCode, task, processTasks } = input;
  const likelyNextTask = findLikelyNextTask(task, processTasks);

  if (!likelyNextTask) {
    return [
      createRuleRecommendation({
        id: `${issueId}-mark-review`,
        issueId,
        issueCode,
        recommendationType: "MarkReviewStatus",
        title: "Mark disconnected task as Need Review",
        description: "No likely next step can be inferred, so this task should be reviewed manually.",
        rationale: "Disconnected tasks can break BPMN generation or create incomplete process flow.",
        confidence: "low",
        impact: "medium",
        riskLevel: "medium",
        targetStepIds: [task.stepId],
        previewText: `${task.stepId}: reviewStatus = needsReview`,
        patch: { reviewStatus: "needsReview" },
        operations: [
          {
            kind: "MarkReviewStatus",
            stepId: task.stepId,
            reviewStatus: "needsReview"
          }
        ],
        requiresConfirmation: true,
        complianceTags: ["process-integrity", "human-review"]
      })
    ];
  }

  return [
    createRuleRecommendation({
      id: `${issueId}-connect-likely-next`,
      issueId,
      issueCode,
      recommendationType: "UpdateField",
      title: `Connect to likely next step ${likelyNextTask.stepId}`,
      description: "Connect this disconnected task to the next nearby process row.",
      rationale: "The nearest following task is a deterministic, reviewable fallback for disconnected flow.",
      confidence: "medium",
      impact: "high",
      riskLevel: "medium",
      targetStepIds: [task.stepId],
      previewText: `${task.stepId}: defaultNextStep = ${likelyNextTask.stepId}`,
      patch: { defaultNextStep: likelyNextTask.stepId },
      operations: [
        {
          kind: "UpdateConnection",
          stepId: task.stepId,
          field: "defaultNextStep",
          value: likelyNextTask.stepId
        }
      ],
      warnings: ["Confirm this inferred connection before generating BPMN."],
      requiresConfirmation: true,
      complianceTags: ["process-integrity"]
    })
  ];
}

function createInvalidNextStepRecommendations(input: RuleRecommendationInput): QARecommendation[] {
  const { issueId, issueCode, task, processTasks } = input;
  const field = getInvalidConnectionField(issueId);
  const likelyNextTask = findLikelyNextTask(task, processTasks);

  if (likelyNextTask) {
    return [
      createRuleRecommendation({
        id: `${issueId}-connect-valid-step`,
        issueId,
        issueCode,
        recommendationType: "UpdateField",
        title: `Replace invalid ${field} with ${likelyNextTask.stepId}`,
        description: "Replace the invalid next-step reference with a nearby valid step.",
        rationale: "A valid stepId is required for connected process flow.",
        confidence: "medium",
        impact: "high",
        riskLevel: "medium",
        targetStepIds: [task.stepId],
        previewText: `${task.stepId}: ${field} = ${likelyNextTask.stepId}`,
        patch: { [field]: likelyNextTask.stepId },
        operations: [
          {
            kind: "UpdateConnection",
            stepId: task.stepId,
            field,
            value: likelyNextTask.stepId
          }
        ],
        warnings: ["Confirm this inferred next step before generating BPMN."],
        requiresConfirmation: true,
        complianceTags: ["process-integrity"]
      })
    ];
  }

  return [
    createRuleRecommendation({
      id: `${issueId}-clear-invalid-step`,
      issueId,
      issueCode,
      recommendationType: "UpdateField",
      title: `Clear invalid ${field} and mark Need Review`,
      description: "Clear the invalid reference because no safe replacement step can be inferred.",
      rationale: "Skipping an invalid reference is safer than preserving a broken BPMN connection.",
      confidence: "high",
      impact: "medium",
      riskLevel: "medium",
      targetStepIds: [task.stepId],
      previewText: `${task.stepId}: ${field} = blank, reviewStatus = needsReview`,
      patch: { [field]: null, reviewStatus: "needsReview" },
      operations: [
        {
          kind: "UpdateConnection",
          stepId: task.stepId,
          field,
          value: null
        },
        {
          kind: "MarkReviewStatus",
          stepId: task.stepId,
          reviewStatus: "needsReview"
        }
      ],
      requiresConfirmation: true,
      complianceTags: ["process-integrity", "human-review"]
    })
  ];
}

function createGatewayConditionRecommendations(input: RuleRecommendationInput): QARecommendation[] {
  const { issueId, issueCode, task } = input;
  const conditionQuestion = `Is ${task.taskName || task.stepId} true?`;

  return [
    createRuleRecommendation({
      id: `${issueId}-set-tbd-condition`,
      issueId,
      issueCode,
      recommendationType: "UpdateField",
      title: "Add TBD gateway condition",
      description: "Add a TBD condition question and mark the gateway for review.",
      rationale: "Exclusive gateways need a clear decision question before generation.",
      confidence: "medium",
      impact: "medium",
      riskLevel: "medium",
      targetStepIds: [task.stepId],
      previewText: `${task.stepId}: conditionQuestion = "${conditionQuestion}", reviewStatus = needsReview`,
      patch: { conditionQuestion, reviewStatus: "needsReview" },
      operations: [
        {
          kind: "UpdateTaskField",
          stepId: task.stepId,
          field: "conditionQuestion",
          value: conditionQuestion
        },
        {
          kind: "MarkReviewStatus",
          stepId: task.stepId,
          reviewStatus: "needsReview"
        }
      ],
      warnings: ["TBD condition must be reviewed by business before final export."],
      requiresConfirmation: true,
      complianceTags: ["process-integrity", "human-review"]
    })
  ];
}

function createMissingCustomerNotificationRecommendations(input: RuleRecommendationInput): QARecommendation[] {
  const { issueId, issueCode, task, processTasks } = input;
  const channel = inferNotificationChannel(task);
  const stepId = buildUniqueStepId(task.stepId, processTasks);
  const notificationTask: ProcessTask = {
    ...task,
    id: `${task.id}-notification`,
    stepId,
    parentStepId: task.stepId,
    rowType: "task",
    bpmnType: "sendTask",
    taskNature: "notification",
    actor: "System",
    actorLane: "System",
    system: "Notification Service",
    systemLane: "Notification Service",
    dataAction: "send",
    taskName: "Notify customer about application status",
    input: task.output || task.taskName || "Application status",
    output: "Customer notification sent",
    defaultNextStep: task.defaultNextStep,
    conditionQuestion: "",
    yesNextStep: null,
    noNextStep: null,
    customerInteractionType: "Front-stage System",
    channel,
    reviewStatus: "needsReview",
    comment: "Created from QA recommendation; review notification content and channel."
  };

  return [
    createRuleRecommendation({
      id: `${issueId}-create-customer-notification`,
      issueId,
      issueCode,
      recommendationType: "CreateTask",
      title: "Create customer notification Send Task",
      description: "Create a connected Send Task after the reject/pause/supplement step.",
      rationale: "Customer-impacting reject, pause, or supplement paths should notify the customer.",
      confidence: "medium",
      impact: "high",
      riskLevel: "medium",
      targetStepIds: [task.stepId],
      previewText: `${task.stepId} -> ${stepId}: Notify customer via ${channel}`,
      newTasks: [notificationTask],
      operations: [
        {
          kind: "CreateTaskAfter",
          anchorStepId: task.stepId,
          task: notificationTask,
          connect: true
        }
      ],
      warnings: ["Review message content, legal wording, and customer channel before final export."],
      requiresConfirmation: true,
      complianceTags: ["customer-communication", "process-integrity", "human-review"]
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
    case "USER_TASK_MISSING_ACTOR_LANE":
      return createActorLaneRecommendations(input);
    case "SERVICE_TASK_MISSING_SYSTEM_LANE":
      return createSystemLaneRecommendations(input);
    case "DISCONNECTED_TASK":
      return createDisconnectedTaskRecommendations(input);
    case "INVALID_NEXT_STEP":
      return createInvalidNextStepRecommendations(input);
    case "GATEWAY_MISSING_CONDITION":
      return createGatewayConditionRecommendations(input);
    case "ROWTYPE_BPMNTYPE_MISMATCH":
      return createRowTypeBpmnTypeRecommendations(input);
    case "MULTI_ACTION_TASK":
      return createSplitTaskRecommendations(input);
    case "MISSING_CUSTOMER_INTERACTION_TYPE":
      return createInteractionTypeRecommendations(input);
    case "GATEWAY_MISSING_YES_NO":
      return createGatewayBranchOperationRecommendations(input);
    case "MISSING_CUSTOMER_NOTIFICATION_AFTER_REJECT_OR_PAUSE":
      return createMissingCustomerNotificationRecommendations(input);
    default:
      return [];
  }
}
