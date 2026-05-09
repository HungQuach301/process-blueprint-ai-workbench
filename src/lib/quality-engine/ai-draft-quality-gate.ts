import type { DraftProcessTaskRegister } from "@/lib/ai-intake";
import type { StructuredProcessBrief } from "@/lib/ai-intake/structured-process-brief";

const canonicalBpmnTypes = new Set([
  "none",
  "startEvent",
  "endEvent",
  "task",
  "userTask",
  "manualTask",
  "serviceTask",
  "sendTask",
  "scriptTask",
  "businessRuleTask",
  "exclusiveGateway",
  "parallelGateway",
  "inclusiveGateway",
  "dataObject",
  "dataStore"
]);
const canonicalRowTypes = new Set([
  "phase",
  "group",
  "task",
  "gateway",
  "start",
  "end",
  "event",
  "data",
  "annotation"
]);

export type QualityGateSeverity = "blocking" | "warning";

export type QualityGateIssue = {
  severity: QualityGateSeverity;
  code: string;
  messageVi: string;
};

export type QualityGateResult = {
  blockingErrors: QualityGateIssue[];
  warnings: QualityGateIssue[];
  canPreview: boolean;
  canApplyAfterReview: boolean;
};

function clean(value: string | undefined | null) {
  return value?.trim() ?? "";
}

function createResult(issues: QualityGateIssue[]): QualityGateResult {
  const blockingErrors = issues.filter((issue) => issue.severity === "blocking");
  const warnings = issues.filter((issue) => issue.severity === "warning");

  return {
    blockingErrors,
    warnings,
    canPreview: blockingErrors.length === 0,
    canApplyAfterReview: blockingErrors.length === 0
  };
}

function blocking(code: string, messageVi: string): QualityGateIssue {
  return {
    severity: "blocking",
    code,
    messageVi
  };
}

function warning(code: string, messageVi: string): QualityGateIssue {
  return {
    severity: "warning",
    code,
    messageVi
  };
}

export function runBriefQualityGate(
  brief: StructuredProcessBrief
): QualityGateResult {
  const issues: QualityGateIssue[] = [];
  const processName = clean(brief.processInfo?.processName);
  const startEvent = clean(brief.startEnd?.startEvent);
  const endEvent = clean(brief.startEnd?.endEvent);

  if (!processName || processName === "Draft process") {
    issues.push(blocking("missing_process_info", "Vui long nhap thong tin quy trinh."));
  }

  if (!clean(brief.businessObjective)) {
    issues.push(blocking("missing_business_objective", "Vui long nhap muc tieu nghiep vu."));
  }

  if (!clean(brief.scope)) {
    issues.push(blocking("missing_scope", "Vui long nhap pham vi quy trinh."));
  }

  if (
    !startEvent ||
    !endEvent ||
    startEvent === "Request received" ||
    endEvent === "Process completed"
  ) {
    issues.push(
      blocking("missing_start_end", "Vui long nhap diem bat dau va ket thuc quy trinh.")
    );
  }

  if (!brief.actors?.some((actor) => clean(actor.name))) {
    issues.push(blocking("missing_actors", "Vui long nhap it nhat mot actor tham gia."));
  }

  if (!brief.relatedSystems?.some((system) => clean(system.name))) {
    issues.push(
      warning(
        "missing_related_systems",
        "Chua co he thong lien quan. Draft co the can bo sung system/app khi review."
      )
    );
  }

  if (!brief.dataDocuments?.some((document) => clean(document.name))) {
    issues.push(
      warning(
        "missing_data_documents",
        "Chua co du lieu/chung tu. Draft co the can bo sung data object khi review."
      )
    );
  }

  return createResult(issues);
}

export function runDraftProcessTaskRegisterQualityGate(
  draft: DraftProcessTaskRegister
): QualityGateResult {
  const issues: QualityGateIssue[] = [];
  const tasks = draft.draftProcessTasks;
  const stepIds = new Set<string>();
  const ids = new Set<string>();
  let hasStart = false;
  let hasEnd = false;

  tasks.forEach((task, index) => {
    if (!clean(task.stepId)) {
      issues.push(blocking("missing_step_id", `Dong ${index + 1} thieu stepId.`));
    }

    if (!clean(task.id)) {
      issues.push(blocking("missing_id", `Dong ${index + 1} thieu id.`));
    }

    if (!clean(task.rowType)) {
      issues.push(blocking("missing_row_type", `Dong ${index + 1} thieu rowType.`));
    } else if (!canonicalRowTypes.has(task.rowType)) {
      issues.push(
        blocking(
          "invalid_row_type",
          `Dong ${index + 1} co rowType khong canonical: ${task.rowType}.`
        )
      );
    }

    if (!clean(task.bpmnType)) {
      issues.push(blocking("missing_bpmn_type", `Dong ${index + 1} thieu bpmnType.`));
    } else if (!canonicalBpmnTypes.has(task.bpmnType)) {
      issues.push(
        blocking(
          "invalid_bpmn_type",
          `Dong ${index + 1} co bpmnType khong canonical: ${task.bpmnType}.`
        )
      );
    }

    if (!clean(task.taskName)) {
      issues.push(blocking("missing_task_name", `Dong ${index + 1} thieu taskName.`));
    }

    if (!clean(task.actor) && task.bpmnType !== "serviceTask") {
      issues.push(
        warning(
          "missing_actor",
          `Dong ${index + 1} (${task.stepId || "chua co stepId"}) chua co actor. Vui long review ownership truoc khi Apply.`
        )
      );
    }

    if (!clean(task.system) && ["serviceTask", "sendTask", "scriptTask", "businessRuleTask"].includes(task.bpmnType)) {
      issues.push(
        warning(
          "missing_system",
          `Dong ${index + 1} (${task.stepId || "chua co stepId"}) chua co system/app. Vui long bo sung neu can.`
        )
      );
    }

    if (
      !clean(task.actor) &&
      !clean(task.system) &&
      task.reviewStatus !== "needsReview"
    ) {
      issues.push(
        blocking(
          "orphan_task_without_review",
          `Dong ${index + 1} (${task.stepId || "chua co stepId"}) co ve bi orphan va chua duoc danh dau needsReview.`
        )
      );
    }

    if (stepIds.has(task.stepId)) {
      issues.push(blocking("duplicate_step_id", `Trung stepId: ${task.stepId}.`));
    }

    if (ids.has(task.id)) {
      issues.push(blocking("duplicate_id", `Trung id: ${task.id}.`));
    }

    if (clean(task.stepId)) {
      stepIds.add(task.stepId);
    }

    if (clean(task.id)) {
      ids.add(task.id);
    }

    if (task.bpmnType === "startEvent" || task.rowType === "start") {
      hasStart = true;
    }

    if (task.bpmnType === "endEvent" || task.rowType === "end") {
      hasEnd = true;
    }
  });

  tasks.forEach((task) => {
    [task.defaultNextStep, task.yesNextStep, task.noNextStep].forEach((nextStep) => {
      if (nextStep && !stepIds.has(nextStep)) {
        issues.push(
          blocking(
            "invalid_next_step",
            `Step ${task.stepId} tro den next step khong ton tai: ${nextStep}.`
          )
        );
      }
    });
  });

  if (!hasStart) {
    issues.push(blocking("missing_start", "Draft phai co it nhat mot start event."));
  }

  if (!hasEnd) {
    issues.push(blocking("missing_end", "Draft phai co it nhat mot end event."));
  }

  if (draft.confidence === "low") {
    issues.push(
      warning(
        "low_confidence",
        "Do tin cay cua draft dang thap. Vui long review ky truoc khi Apply."
      )
    );
  }

  const needsReviewCount = tasks.filter(
    (task) => task.reviewStatus === "needsReview"
  ).length;

  if (needsReviewCount < tasks.length) {
    issues.push(
      warning(
        "not_all_rows_need_review",
        "Mot so dong khong o trang thai needsReview. Vui long kiem tra truoc khi Apply."
      )
    );
  }

  return createResult(issues);
}

export function formatQualityGateErrorsVi(result: QualityGateResult) {
  return result.blockingErrors.map((issue) => issue.messageVi);
}

export function formatQualityGateWarningsVi(result: QualityGateResult) {
  return result.warnings.map((issue) => issue.messageVi);
}
