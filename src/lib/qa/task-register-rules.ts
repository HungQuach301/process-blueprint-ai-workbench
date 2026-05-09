import type { ProcessTask } from "@/lib/models/process-task";
import type {
  QARecommendation
} from "@/lib/recommendation-engine/types";
import { createRuleRecommendationsForIssue } from "@/lib/recommendation-engine/recommendation-factory";

export type QaSeverity = "error" | "warning" | "suggestion";

export type QaIssueCode =
  | "MISSING_ACTOR"
  | "MISSING_SYSTEM_FOR_SERVICE_TASK"
  | "MISSING_TASK_NAME"
  | "MISSING_INPUT_OUTPUT"
  | "GATEWAY_MISSING_CONDITION"
  | "GATEWAY_MISSING_YES_NO"
  | "INVALID_NEXT_STEP"
  | "STORE_WITHOUT_DATA_OBJECT"
  | "PULL_WITHOUT_INPUT_SOURCE"
  | "MULTI_ACTION_TASK"
  | "USER_TASK_MISSING_ACTOR_LANE"
  | "SERVICE_TASK_MISSING_SYSTEM_LANE"
  | "END_EVENT_MISSING_CLEAR_STATE"
  | "MISSING_CUSTOMER_NOTIFICATION_AFTER_REJECT_OR_PAUSE"
  | "ROWTYPE_BPMNTYPE_MISMATCH"
  | "MISSING_CUSTOMER_INTERACTION_TYPE"
  | "DISCONNECTED_TASK"
  | "SERVICE_BLUEPRINT_CARD_READINESS";

export type {
  QAConnectionField,
  QARecommendation,
  QARecommendationConfidence,
  QARecommendationImpact,
  QARecommendationOperation,
  QARecommendationPatch,
  QARecommendationType,
  RecommendationContext,
  RecommendationFeedback,
  RecommendationRiskLevel,
  RecommendationSkillProfile,
  RecommendationSource
} from "@/lib/recommendation-engine/types";

export type QaIssue = {
  id: string;
  issueCode: QaIssueCode;
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
  processTasks: ProcessTask[],
  task: ProcessTask,
  issueCode: QaIssueCode,
  severity: QaSeverity,
  message: string,
  suggestedFix: string,
  idSuffix?: string
) {
  const issueId = `${task.stepId}-${issueCode}${idSuffix ? `-${idSuffix}` : ""}`;

  issues.push({
    id: issueId,
    issueCode,
    stepId: task.stepId,
    taskName: task.taskName || "(Chưa có tên công việc)",
    severity,
    message,
    suggestedFix,
    recommendations: createRuleRecommendationsForIssue({
      issueId,
      issueCode,
      task,
      processTasks,
      context: {
        processTasks,
        issueId,
        issueCode
      }
    })
  });
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
        tasks,
        task,
        "ROWTYPE_BPMNTYPE_MISMATCH",
        "warning",
        "Loại dòng và BPMN type chưa khớp nhau.",
        "Chọn lại bpmnType phù hợp với rowType, ví dụ Task dùng User Task/Service Task, Gateway dùng Exclusive Gateway, Data Interaction dùng Data Object/Data Store/None."
      );
    }

    if (
      affectsServiceBlueprint(task) &&
      (!customerInteractionType || customerInteractionType === "none")
    ) {
      addIssue(
        issues,
        tasks,
        task,
        "MISSING_CUSTOMER_INTERACTION_TYPE",
        "warning",
        "D02 Service Blueprint chưa có loại tương tác khách hàng cho dòng này.",
        "Bấm Auto-suggest interaction fields hoặc chọn customerInteractionType thủ công để D02 xếp đúng layer."
      );
    }

    if (isBlank(task.actor)) {
      addIssue(
        issues,
        tasks,
        task,
        "MISSING_ACTOR",
        "error",
        "Thiếu người hoặc vai trò thực hiện.",
        "Điền actor, ví dụ Customer, RM, Ops Support, Credit Approver hoặc System."
      );
    }

    if (bpmnType === "servicetask" && isBlank(task.system)) {
      addIssue(
        issues,
        tasks,
        task,
        "MISSING_SYSTEM_FOR_SERVICE_TASK",
        "error",
        "Service Task chưa có hệ thống xử lý.",
        "Điền system để biết Service Task do hệ thống nào thực hiện."
      );
    }

    if (isBlank(task.taskName)) {
      addIssue(
        issues,
        tasks,
        task,
        "MISSING_TASK_NAME",
        "error",
        "Thiếu tên công việc.",
        "Điền taskName ngắn gọn, bắt đầu bằng động từ hành động."
      );
    }

    if (isProcessTask(task) && (isBlank(task.input) || isBlank(task.output))) {
      addIssue(
        issues,
        tasks,
        task,
        "MISSING_INPUT_OUTPUT",
        "warning",
        "Task chưa đủ đầu vào hoặc đầu ra.",
        "Điền input và output để biết task nhận gì và tạo ra gì."
      );
    }

    if (task.rowType === "gateway" && isBlank(task.conditionQuestion)) {
      addIssue(
        issues,
        tasks,
        task,
        "GATEWAY_MISSING_CONDITION",
        "error",
        "Gateway chưa có câu hỏi điều kiện.",
        "Điền conditionQuestion theo dạng câu hỏi Có/Không."
      );
    }

    if (task.rowType === "gateway" && (isBlank(task.yesNextStep) || isBlank(task.noNextStep))) {
      addIssue(
        issues,
        tasks,
        task,
        "GATEWAY_MISSING_YES_NO",
        "error",
        "Gateway chưa có đủ nhánh Có và Không.",
        "Điền yesNextStep và noNextStep bằng stepId hợp lệ."
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
          tasks,
          task,
          "INVALID_NEXT_STEP",
          "error",
          `${nextStep.label} đang trỏ tới stepId không tồn tại.`,
          "Sửa giá trị này thành một stepId có trong bảng hoặc để trống nếu là bước kết thúc.",
          nextStep.label
        );
      }
    });

    if (dataAction === "store" && isBlank(task.dataObject)) {
      addIssue(
        issues,
        tasks,
        task,
        "STORE_WITHOUT_DATA_OBJECT",
        "error",
        "Thao tác Store nhưng chưa có đối tượng dữ liệu.",
        "Điền dataObject để biết hệ thống đang lưu dữ liệu gì."
      );
    }

    if (dataAction === "pull" && isBlank(task.input) && isBlank(task.sourceRef)) {
      addIssue(
        issues,
        tasks,
        task,
        "PULL_WITHOUT_INPUT_SOURCE",
        "error",
        "Thao tác Pull nhưng chưa có input hoặc nguồn dữ liệu.",
        "Điền input hoặc sourceRef để biết dữ liệu được lấy từ đâu."
      );
    }

    if (multiActionKeywords.some((keyword) => taskName.includes(keyword))) {
      addIssue(
        issues,
        tasks,
        task,
        "MULTI_ACTION_TASK",
        "suggestion",
        "Tên công việc có thể đang chứa nhiều hành động.",
        "Cân nhắc tách thành nhiều dòng nếu đây là các bước riêng biệt."
      );
    }

    if (bpmnType === "usertask" && isBlank(task.actorLane)) {
      addIssue(
        issues,
        tasks,
        task,
        "USER_TASK_MISSING_ACTOR_LANE",
        "warning",
        "User Task chưa có lane người dùng.",
        "Điền actorLane để Service Blueprint và BPMN giữ đúng vai trò."
      );
    }

    if (bpmnType === "servicetask" && isBlank(task.systemLane)) {
      addIssue(
        issues,
        tasks,
        task,
        "SERVICE_TASK_MISSING_SYSTEM_LANE",
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
        tasks,
        task,
        "END_EVENT_MISSING_CLEAR_STATE",
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
        tasks,
        task,
        "MISSING_CUSTOMER_NOTIFICATION_AFTER_REJECT_OR_PAUSE",
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
        tasks,
        task,
        "SERVICE_BLUEPRINT_CARD_READINESS",
        "suggestion",
        "Task card cho Service Blueprint chưa đủ thông tin nền.",
        "Điền đủ actor, system, bpmnType và taskNature để card sẵn sàng dựng blueprint."
      );
    }
  });

  return issues;
}
