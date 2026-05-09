import type {
  Channel,
  CustomerInteractionType,
  ProcessTask
} from "@/lib/models/process-task";

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function hasAny(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

function isCustomerActor(actor: string) {
  return hasAny(actor, ["customer", "khách hàng", "khach hang", "sme customer"]);
}

function isBankHumanActor(actor: string) {
  return hasAny(actor, ["rm", "ops support", "ops", "credit approver", "approver"]);
}

function isRmCustomerFacing(task: ProcessTask) {
  const actor = normalize(task.actor);
  const taskName = normalize(task.taskName);

  return (
    actor.includes("rm") &&
    hasAny(taskName, ["customer", "supplement", "request", "call", "meeting", "notify", "khách hàng", "bo sung", "bổ sung"])
  );
}

export function inferCustomerInteractionType(task: ProcessTask): CustomerInteractionType {
  const actor = normalize(task.actor);
  const system = normalize(task.system);
  const taskName = normalize(task.taskName);
  const bpmnType = normalize(task.bpmnType);
  const rowType = normalize(task.rowType);

  if (isCustomerActor(actor)) {
    return "Customer Action";
  }

  if (isRmCustomerFacing(task)) {
    return "Front-stage People";
  }

  if (
    bpmnType === "sendtask" &&
    hasAny(system, ["notification", "email", "sms"])
  ) {
    return "Front-stage System";
  }

  if (rowType === "data" || bpmnType === "dataobject" || bpmnType === "datastore") {
    return "Data / Control";
  }

  if (hasAny(taskName, ["policy", "config", "rule", "control"])) {
    return "Support Process";
  }

  if (isBankHumanActor(actor)) {
    return "Back-stage People";
  }

  if (actor === "system" && bpmnType === "servicetask") {
    return "Back-stage System";
  }

  return "None";
}

export function inferChannel(task: ProcessTask): Channel | undefined {
  const actor = normalize(task.actor);
  const system = normalize(task.system);
  const taskName = normalize(task.taskName);
  const text = `${system} ${taskName}`;

  if (system.includes("portal")) {
    return "Portal";
  }

  if (system.includes("notification") || taskName.includes("sms") || taskName.includes("email")) {
    return taskName.includes("sms") ? "SMS" : "Email";
  }

  if (system.includes("los") || system.includes("loan origination")) {
    return "LOS";
  }

  if (system.includes("ocr")) {
    return "OCR";
  }

  if (hasAny(text, ["cic", "blacklist"])) {
    return taskName.includes("blacklist") ? "Internal System" : "CIC";
  }

  if (actor.includes("rm") && isRmCustomerFacing(task)) {
    return taskName.includes("meeting") ? "RM Meeting" : "Phone Call";
  }

  if (system.includes("document")) {
    return "Document Store";
  }

  return undefined;
}
