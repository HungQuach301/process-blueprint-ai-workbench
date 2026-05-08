import type { ProcessTask } from "@/lib/models/process-task";
import { inferCustomerInteractionType } from "@/lib/utils/process-task-inference";

export type QaSeverity = "error" | "warning" | "suggestion";

export type QARecommendationType =
  | "UpdateField"
  | "SplitTask"
  | "CreateTask"
  | "CreateLane"
  | "AssignSystem"
  | "AssignActor"
  | "ChangeBpmnType"
  | "ChangeRowType"
  | "SetInteractionType"
  | "MarkReviewStatus"
  | "AddGatewayBranch";

export type QARecommendationImpact = "low" | "medium" | "high";

export type QARecommendationConfidence = "low" | "medium" | "high";

export type QARecommendationPatch = Partial<
  Pick<
    ProcessTask,
    | "rowType"
    | "bpmnType"
    | "taskNature"
    | "phase"
    | "group"
    | "actor"
    | "actorLane"
    | "system"
    | "systemLane"
    | "dataObject"
    | "dataAction"
    | "taskName"
    | "input"
    | "output"
    | "defaultNextStep"
    | "conditionQuestion"
    | "yesNextStep"
    | "noNextStep"
    | "exception"
    | "exceptionHandling"
    | "sla"
    | "riskControl"
    | "sourceRef"
    | "reviewStatus"
    | "comment"
    | "customerInteractionType"
    | "channel"
  >
>;

export type QAConnectionField = "defaultNextStep" | "yesNextStep" | "noNextStep";

export type QARecommendationOperation =
  | {
      kind: "UpdateTaskField";
      stepId: string;
      field: keyof QARecommendationPatch;
      value: QARecommendationPatch[keyof QARecommendationPatch];
    }
  | {
      kind: "CreateTaskAfter";
      anchorStepId: string;
      task: ProcessTask;
      connect?: boolean;
    }
  | {
      kind: "CreateTaskBefore";
      anchorStepId: string;
      task: ProcessTask;
      connect?: boolean;
    }
  | {
      kind: "InsertTaskBetween";
      sourceStepId: string;
      targetStepId: string;
      task: ProcessTask;
    }
  | {
      kind: "SplitTask";
      targetStepId: string;
      newTasks: ProcessTask[];
    }
  | {
      kind: "CreateGateway";
      gatewayTask: ProcessTask;
      afterStepId?: string;
      beforeStepId?: string;
    }
  | {
      kind: "AddGatewayBranch";
      gatewayStepId: string;
      branch: QAConnectionField;
      targetStepId?: string;
      newTask?: ProcessTask;
    }
  | {
      kind: "UpdateConnection";
      stepId: string;
      field: QAConnectionField;
      value: string | null;
    }
  | {
      kind: "CreateLane";
      laneName: string;
      laneType: "actor" | "system" | "data";
      targetStepIds?: string[];
    }
  | {
      kind: "AssignActor";
      stepId: string;
      actor: string;
      actorLane?: string;
    }
  | {
      kind: "AssignSystem";
      stepId: string;
      system: string;
      systemLane?: string;
    }
  | {
      kind: "SetInteractionType";
      stepId: string;
      customerInteractionType: ProcessTask["customerInteractionType"];
    }
  | {
      kind: "MarkReviewStatus";
      stepId: string;
      reviewStatus: ProcessTask["reviewStatus"];
    };

export type QARecommendation = {
  id?: string;
  issueId?: string;
  type: QARecommendationType;
  title: string;
  description: string;
  confidence: QARecommendationConfidence;
  impact: QARecommendationImpact;
  targetStepIds: string[];
  previewText: string;
  operations?: QARecommendationOperation[];
  patch?: QARecommendationPatch;
  newTasks?: ProcessTask[];
  warnings?: string[];
  requiresConfirmation: boolean;
};

export type QaIssue = {
  id: string;
  stepId: string;
  taskName: string;
  severity: QaSeverity;
  message: string;
  suggestedFix: string;
  recommendations?: QARecommendation[];
};

const multiActionKeywords = ["and", "và", "sau đó", "đồng thời"];

function isBlank(value: string | null | undefined) {
  return !value || value.trim().length === 0;
}

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function isProcessTask(task: ProcessTask) {
  return task.rowType === "task" || task.bpmnType.toLowerCase().includes("task");
}

function affectsServiceBlueprint(task: ProcessTask) {
  return !["phase", "group", "annotation"].includes(normalize(task.rowType));
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

function isRowTypeBpmnTypeMismatch(task: ProcessTask) {
  const allowedTypes = getAllowedBpmnTypesForRowType(normalize(task.rowType));

  return allowedTypes.length > 0 && !allowedTypes.includes(normalize(task.bpmnType));
}

function addIssue(
  issues: QaIssue[],
  task: ProcessTask,
  code: string,
  severity: QaSeverity,
  message: string,
  suggestedFix: string,
  recommendations?: QARecommendation[]
) {
  issues.push({
    id: `${task.stepId}-${code}`,
    stepId: task.stepId,
    taskName: task.taskName || "(Chưa có tên công việc)",
    severity,
    message,
    suggestedFix,
    recommendations
  });
}

function recommendationBase(task: ProcessTask) {
  return {
    targetStepIds: [task.stepId],
    requiresConfirmation: true
  };
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

function missingActorRecommendations(task: ProcessTask): QARecommendation[] {
  const bpmnType = normalize(task.bpmnType);

  if (bpmnType === "servicetask") {
    return [
      {
        type: "AssignActor",
        title: "Gán actor là System",
        description: "Service Task thường do hệ thống xử lý, nên actor có thể là System.",
        confidence: "high",
        impact: "medium",
        previewText: `${task.stepId}: actor = System`,
        patch: { actor: "System" },
        ...recommendationBase(task)
      }
    ];
  }

  if (bpmnType === "usertask") {
    return [
      {
        type: "AssignActor",
        title: "Gán tạm actor là Bank User và cần review",
        description: "User Task cần người thực hiện. Nếu chưa rõ vai trò, dùng Bank User và chuyển reviewStatus sang needsReview.",
        confidence: "medium",
        impact: "medium",
        previewText: `${task.stepId}: actor = Bank User, reviewStatus = needsReview`,
        patch: { actor: "Bank User", reviewStatus: "needsReview" },
        warnings: ["Cần business xác nhận lại vai trò thực hiện thật sự."],
        ...recommendationBase(task)
      }
    ];
  }

  return [];
}

function missingSystemRecommendations(task: ProcessTask): QARecommendation[] {
  const system = inferSystemFromTaskName(task);
  const patch: QARecommendationPatch = { system };

  if (system === "TBD") {
    patch.reviewStatus = "needsReview";
  }

  return [
    {
      type: "AssignSystem",
      title: system === "TBD" ? "Gán hệ thống tạm là TBD" : `Gán hệ thống là ${system}`,
      description:
        system === "TBD"
          ? "Không suy luận được hệ thống từ taskName, nên cần người dùng review."
          : "Hệ thống được suy luận từ taskName/system keywords hiện có.",
      confidence: system === "TBD" ? "low" : "medium",
      impact: "medium",
      previewText: `${task.stepId}: system = ${system}${system === "TBD" ? ", reviewStatus = needsReview" : ""}`,
      patch,
      warnings: system === "TBD" ? ["Cần xác nhận hệ thống xử lý thật sự."] : undefined,
      ...recommendationBase(task)
    }
  ];
}

function rowTypeBpmnTypeRecommendations(task: ProcessTask): QARecommendation[] {
  const nextBpmnType = validBpmnTypeForRowType(task.rowType);

  return [
    {
      type: "ChangeBpmnType",
      title: `Đổi BPMN type sang ${nextBpmnType}`,
      description: "Đề xuất BPMN type đầu tiên hợp lệ theo rowType hiện tại.",
      confidence: "medium",
      impact: "medium",
      previewText: `${task.stepId}: bpmnType ${task.bpmnType} -> ${nextBpmnType}`,
      patch: { bpmnType: nextBpmnType as ProcessTask["bpmnType"] },
      ...recommendationBase(task)
    }
  ];
}

function splitTaskRecommendations(task: ProcessTask): QARecommendation[] {
  const taskNames = splitTaskName(task.taskName);

  if (taskNames.length < 2) {
    return [];
  }

  return [
    {
      type: "SplitTask",
      title: `Tách thành ${taskNames.length} task riêng`,
      description: "Task name có nhiều hành động. Đề xuất tách thành các dòng riêng, giữ actor/system/phase/group hiện tại.",
      confidence: "medium",
      impact: "high",
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
      ...recommendationBase(task)
    }
  ];
}

function interactionTypeRecommendations(task: ProcessTask): QARecommendation[] {
  const interactionType = inferCustomerInteractionType(task);

  if (interactionType === "None") {
    return [];
  }

  return [
    {
      type: "SetInteractionType",
      title: `Gán customerInteractionType = ${interactionType}`,
      description: "Loại tương tác được suy luận bằng rule hiện có để D02 xếp đúng layer.",
      confidence: "medium",
      impact: "medium",
      previewText: `${task.stepId}: customerInteractionType = ${interactionType}`,
      patch: { customerInteractionType: interactionType },
      ...recommendationBase(task)
    }
  ];
}

function gatewayBranchRecommendations(task: ProcessTask): QARecommendation[] {
  return [
    {
      type: "MarkReviewStatus",
      title: "Đánh dấu gateway cần review",
      description: "Gateway thiếu nhánh nên cần business xác nhận trước khi generate.",
      confidence: "high",
      impact: "medium",
      previewText: `${task.stepId}: reviewStatus = needsReview`,
      patch: { reviewStatus: "needsReview" },
      ...recommendationBase(task)
    },
    {
      type: "AddGatewayBranch",
      title: "Thêm placeholder cho nhánh thiếu",
      description: "Tạo gợi ý bổ sung yesNextStep/noNextStep placeholder để người dùng điền sau.",
      confidence: "low",
      impact: "medium",
      previewText: `${task.stepId}: bổ sung nhánh Yes/No còn thiếu`,
      patch: {
        yesNextStep: task.yesNextStep || "TBD_YES",
        noNextStep: task.noNextStep || "TBD_NO"
      },
      warnings: ["Placeholder chưa phải stepId hợp lệ, cần tạo hoặc chọn step thật."],
      ...recommendationBase(task)
    }
  ];
}

function hasCustomerNotificationAfter(tasks: ProcessTask[], startIndex: number) {
  return tasks.slice(startIndex + 1, startIndex + 4).some((task) => {
    const text = normalize(`${task.taskName} ${task.actor} ${task.system}`);

    return (
      text.includes("customer") ||
      text.includes("khách hàng") ||
      text.includes("notification") ||
      text.includes("thông báo")
    );
  });
}

export function validateProcessTasks(tasks: ProcessTask[]): QaIssue[] {
  const issues: QaIssue[] = [];
  const stepIds = new Set(tasks.map((task) => task.stepId).filter(Boolean));

  tasks.forEach((task, index) => {
    const bpmnType = normalize(task.bpmnType);
    const dataAction = normalize(task.dataAction);
    const taskName = normalize(task.taskName);
    const customerInteractionType = normalize(task.customerInteractionType);

    if (isRowTypeBpmnTypeMismatch(task)) {
      addIssue(
        issues,
        task,
        "row-type-bpmn-type-mismatch",
        "warning",
        "Loại dòng và BPMN type chưa khớp nhau.",
        "Chọn lại bpmnType phù hợp với rowType, ví dụ Task dùng User Task/Service Task, Gateway dùng Exclusive Gateway, Data Interaction dùng Data Object/Data Store/None.",
        rowTypeBpmnTypeRecommendations(task)
      );
    }

    if (
      affectsServiceBlueprint(task) &&
      (!customerInteractionType || customerInteractionType === "none")
    ) {
      addIssue(
        issues,
        task,
        "missing-customer-interaction-type",
        "warning",
        "D02 Service Blueprint chưa có loại tương tác khách hàng cho dòng này.",
        "Bấm Auto-suggest interaction fields hoặc chọn customerInteractionType thủ công để D02 xếp đúng layer.",
        interactionTypeRecommendations(task)
      );
    }

    if (isBlank(task.actor)) {
      addIssue(
        issues,
        task,
        "missing-actor",
        "error",
        "Thiếu người hoặc vai trò thực hiện.",
        "Điền actor, ví dụ Customer, RM, Ops Support, Credit Approver hoặc System.",
        missingActorRecommendations(task)
      );
    }

    if (bpmnType === "servicetask" && isBlank(task.system)) {
      addIssue(
        issues,
        task,
        "missing-service-system",
        "error",
        "Service Task chưa có hệ thống xử lý.",
        "Điền system để biết Service Task do hệ thống nào thực hiện.",
        missingSystemRecommendations(task)
      );
    }

    if (isBlank(task.taskName)) {
      addIssue(
        issues,
        task,
        "missing-task-name",
        "error",
        "Thiếu tên công việc.",
        "Điền taskName ngắn gọn, bắt đầu bằng động từ hành động."
      );
    }

    if (isProcessTask(task) && (isBlank(task.input) || isBlank(task.output))) {
      addIssue(
        issues,
        task,
        "missing-input-output",
        "warning",
        "Task chưa đủ đầu vào hoặc đầu ra.",
        "Điền input và output để biết task nhận gì và tạo ra gì."
      );
    }

    if (task.rowType === "gateway" && isBlank(task.conditionQuestion)) {
      addIssue(
        issues,
        task,
        "gateway-missing-condition",
        "error",
        "Gateway chưa có câu hỏi điều kiện.",
        "Điền conditionQuestion theo dạng câu hỏi Có/Không."
      );
    }

    if (task.rowType === "gateway" && (isBlank(task.yesNextStep) || isBlank(task.noNextStep))) {
      addIssue(
        issues,
        task,
        "gateway-missing-yes-no",
        "error",
        "Gateway chưa có đủ nhánh Có và Không.",
        "Điền yesNextStep và noNextStep bằng stepId hợp lệ.",
        gatewayBranchRecommendations(task)
      );
    }

    const nextSteps = [
      { label: "defaultNextStep", value: task.defaultNextStep },
      { label: "yesNextStep", value: task.yesNextStep },
      { label: "noNextStep", value: task.noNextStep }
    ];

    nextSteps.forEach((nextStep) => {
      if (!isBlank(nextStep.value) && !stepIds.has(nextStep.value ?? "")) {
        addIssue(
          issues,
          task,
          `invalid-${nextStep.label}`,
          "error",
          `${nextStep.label} đang trỏ tới stepId không tồn tại.`,
          "Sửa giá trị này thành một stepId có trong bảng hoặc để trống nếu là bước kết thúc."
        );
      }
    });

    if (dataAction === "store" && isBlank(task.dataObject)) {
      addIssue(
        issues,
        task,
        "store-missing-data-object",
        "error",
        "Thao tác Store nhưng chưa có đối tượng dữ liệu.",
        "Điền dataObject để biết hệ thống đang lưu dữ liệu gì."
      );
    }

    if (dataAction === "pull" && isBlank(task.input) && isBlank(task.sourceRef)) {
      addIssue(
        issues,
        task,
        "pull-missing-input-source",
        "error",
        "Thao tác Pull nhưng chưa có input hoặc nguồn dữ liệu.",
        "Điền input hoặc sourceRef để biết dữ liệu được lấy từ đâu."
      );
    }

    if (multiActionKeywords.some((keyword) => taskName.includes(keyword))) {
      addIssue(
        issues,
        task,
        "possible-multi-action",
        "suggestion",
        "Tên công việc có thể đang chứa nhiều hành động.",
        "Cân nhắc tách thành nhiều dòng nếu đây là các bước riêng biệt.",
        splitTaskRecommendations(task)
      );
    }

    if (bpmnType === "usertask" && isBlank(task.actorLane)) {
      addIssue(
        issues,
        task,
        "user-task-missing-actor-lane",
        "warning",
        "User Task chưa có lane người dùng.",
        "Điền actorLane để Service Blueprint và BPMN giữ đúng vai trò."
      );
    }

    if (bpmnType === "servicetask" && isBlank(task.systemLane)) {
      addIssue(
        issues,
        task,
        "service-task-missing-system-lane",
        "warning",
        "Service Task chưa có lane hệ thống.",
        "Điền systemLane để biết task nằm ở lane hệ thống nào."
      );
    }

    if (
      bpmnType === "endevent" &&
      !["approved", "rejected", "ended", "closed", "phê duyệt", "từ chối", "kết thúc"].some(
        (keyword) =>
          taskName.includes(keyword) ||
          normalize(task.output).includes(keyword) ||
          normalize(task.comment).includes(keyword)
      )
    ) {
      addIssue(
        issues,
        task,
        "end-event-unclear-state",
        "warning",
        "End Event chưa nói rõ trạng thái kết thúc.",
        "Nêu rõ kết thúc là Approved, Rejected, Closed hoặc trạng thái nghiệp vụ tương đương."
      );
    }

    if (
      ["reject", "rejected", "pause", "paused", "supplement", "bổ sung", "tạm dừng", "từ chối"].some(
        (keyword) => taskName.includes(keyword)
      ) &&
      !hasCustomerNotificationAfter(tasks, index)
    ) {
      addIssue(
        issues,
        task,
        "missing-customer-notification",
        "warning",
        "Sau bước reject/pause/bổ sung chưa thấy bước thông báo cho khách hàng.",
        "Thêm hoặc kiểm tra một bước gửi thông báo cho Customer ngay sau đó."
      );
    }

    if (
      isBlank(task.actor) ||
      isBlank(task.system) ||
      isBlank(task.bpmnType) ||
      isBlank(task.taskNature)
    ) {
      addIssue(
        issues,
        task,
        "service-blueprint-card-readiness",
        "suggestion",
        "Task card cho Service Blueprint chưa đủ thông tin nền.",
        "Điền đủ actor, system, bpmnType và taskNature để card sẵn sàng dựng blueprint."
      );
    }
  });

  return issues;
}
