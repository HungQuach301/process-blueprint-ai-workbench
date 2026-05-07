import type { ProcessTask } from "@/lib/models/process-task";

export type QaSeverity = "error" | "warning" | "suggestion";

export type QaIssue = {
  id: string;
  stepId: string;
  taskName: string;
  severity: QaSeverity;
  message: string;
  suggestedFix: string;
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
  suggestedFix: string
) {
  issues.push({
    id: `${task.stepId}-${code}`,
    stepId: task.stepId,
    taskName: task.taskName || "(Chưa có tên công việc)",
    severity,
    message,
    suggestedFix
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
        task,
        "row-type-bpmn-type-mismatch",
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
        task,
        "missing-customer-interaction-type",
        "warning",
        "D02 Service Blueprint chưa có loại tương tác khách hàng cho dòng này.",
        "Bấm Auto-suggest interaction fields hoặc chọn customerInteractionType thủ công để D02 xếp đúng layer."
      );
    }

    if (isBlank(task.actor)) {
      addIssue(
        issues,
        task,
        "missing-actor",
        "error",
        "Thiếu người hoặc vai trò thực hiện.",
        "Điền actor, ví dụ Customer, RM, Ops Support, Credit Approver hoặc System."
      );
    }

    if (bpmnType === "servicetask" && isBlank(task.system)) {
      addIssue(
        issues,
        task,
        "missing-service-system",
        "error",
        "Service Task chưa có hệ thống xử lý.",
        "Điền system để biết Service Task do hệ thống nào thực hiện."
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
        "Cân nhắc tách thành nhiều dòng nếu đây là các bước riêng biệt."
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
