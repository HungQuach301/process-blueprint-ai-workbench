export type RowType =
  | "phase"
  | "group"
  | "task"
  | "gateway"
  | "start"
  | "end"
  | "event"
  | "data"
  | "annotation";

export type BpmnType =
  | "none"
  | "startEvent"
  | "endEvent"
  | "task"
  | "userTask"
  | "manualTask"
  | "serviceTask"
  | "sendTask"
  | "scriptTask"
  | "businessRuleTask"
  | "exclusiveGateway"
  | "parallelGateway"
  | "inclusiveGateway"
  | "dataObject"
  | "dataStore";

export type TaskNature =
  | "manual"
  | "automatic"
  | "semiAutomatic"
  | "system"
  | "decision"
  | "approval"
  | "integration"
  | "notification"
  | "control"
  | "data";

export type DataAction =
  | "none"
  | "pull"
  | "push"
  | "store"
  | "create"
  | "read"
  | "update"
  | "delete"
  | "validate"
  | "approve"
  | "reject"
  | "send"
  | "receive";

export type ReviewStatus =
  | "draft"
  | "needsReview"
  | "approved"
  | "rejected";

export interface ProcessTask {
  id: string;
  stepId: string;
  parentStepId: string | null;
  rowType: RowType;
  bpmnType: BpmnType;
  taskNature: TaskNature;
  phase: string;
  group: string;
  actor: string;
  actorLane: string;
  system: string;
  systemLane: string;
  dataObject: string;
  dataAction: DataAction;
  taskName: string;
  input: string;
  output: string;
  defaultNextStep: string | null;
  conditionQuestion: string;
  yesNextStep: string | null;
  noNextStep: string | null;
  exception: string;
  exceptionHandling: string;
  sla: string;
  riskControl: string;
  sourceRef: string;
  reviewStatus: ReviewStatus;
  comment: string;
}
