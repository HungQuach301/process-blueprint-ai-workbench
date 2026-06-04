import type { ProcessTask } from "@/lib/models/process-task";
import type { TemplateProfile } from "@/lib/models/template-profile";

type BpmnNode = {
  task: ProcessTask;
  id: string;
  tagName: string;
  processId: string;
  poolId: string;
  laneId: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type SequenceFlow = {
  id: string;
  sourceRef: string;
  targetRef: string;
  label?: string;
  sourceStepId: string;
  branch?: "Yes" | "No";
  conditionQuestion?: string;
};

type DataReference = {
  id: string;
  objectId: string;
  name: string;
  sourceNodeId: string;
  processId: string;
  associationType: "input" | "output" | "none";
  x: number;
  y: number;
};

type DataObjectDefinition = {
  id: string;
  name: string;
  processId: string;
};

type Lane = {
  id: string;
  name: string;
  processId: string;
  y: number;
};

type Pool = {
  participantId: string;
  processId?: string;
  name: string;
  y: number;
  height: number;
};

type MessageFlow = {
  id: string;
  sourceRef: string;
  targetRef: string;
  label?: string;
};

const LANE_HEIGHT = 170;
const LANE_WIDTH_PADDING = 260;
const START_X = 120;
const NODE_Y_OFFSET = 55;
const HORIZONTAL_GAP = 250;
const CUSTOMER_PROCESS_ID = "Process_SME_Customer";
const BANK_PROCESS_ID = "Process_Bank_Financial_Institution";
const CUSTOMER_PARTICIPANT_ID = "Participant_SME_Customer";
const BANK_PARTICIPANT_ID = "Participant_Bank_Financial_Institution";
const EXTERNAL_PARTICIPANT_ID = "Participant_External_Data_Providers";
const BANK_POOL_Y = LANE_HEIGHT + 50;
const BANK_LANE_NAMES = [
  "Digital Channel / Loan Portal",
  "RM",
  "Ops Support",
  "Credit Approver",
  "LOS / Workflow System",
  "Notification Service",
  "Document / OCR Service"
];
const EXTERNAL_POOL_Y = BANK_POOL_Y + BANK_LANE_NAMES.length * LANE_HEIGHT + 50;

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sanitizeId(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/^([^a-zA-Z_])/, "_$1");
}

function normalize(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function normalizeKey(value: string) {
  return normalize(value).toLowerCase();
}

function hasHumanActor(task: ProcessTask) {
  const actor = normalize(task.actor).toLowerCase();
  const actorLane = normalize(task.actorLane).toLowerCase();

  return Boolean(actor || actorLane) && actor !== "system" && actorLane !== "system";
}

function isAutomaticOrSystemTask(task: ProcessTask) {
  const taskNature = normalize(task.taskNature).toLowerCase();
  const actor = normalize(task.actor).toLowerCase();
  const actorLane = normalize(task.actorLane).toLowerCase();

  return (
    taskNature === "automatic" ||
    taskNature === "system" ||
    actor === "system" ||
    actorLane === "system"
  );
}

function getBpmnTag(task: ProcessTask) {
  switch (task.bpmnType) {
    case "startEvent":
      return "bpmn:startEvent";
    case "endEvent":
      return "bpmn:endEvent";
    case "userTask":
      return "bpmn:userTask";
    case "serviceTask":
      return "bpmn:serviceTask";
    case "sendTask":
      return "bpmn:sendTask";
    case "exclusiveGateway":
      return "bpmn:exclusiveGateway";
    case "task":
      return "bpmn:task";
    default:
      if (isAutomaticOrSystemTask(task)) {
        return "bpmn:serviceTask";
      }

      if (hasHumanActor(task)) {
        return "bpmn:userTask";
      }

      return "bpmn:userTask";
  }
}

function getNodeSize(tagName: string) {
  if (tagName === "bpmn:startEvent" || tagName === "bpmn:endEvent") {
    return { width: 36, height: 36 };
  }

  if (tagName === "bpmn:exclusiveGateway") {
    return { width: 50, height: 50 };
  }

  return { width: 130, height: 80 };
}

function getNodeIdPrefix(tagName: string) {
  switch (tagName) {
    case "bpmn:startEvent":
      return "StartEvent";
    case "bpmn:endEvent":
      return "EndEvent";
    case "bpmn:exclusiveGateway":
      return "Gateway";
    case "bpmn:userTask":
      return "UserTask";
    case "bpmn:serviceTask":
      return "ServiceTask";
    case "bpmn:sendTask":
      return "SendTask";
    default:
      return "Activity";
  }
}

function buildPools() {
  return [
    {
      participantId: CUSTOMER_PARTICIPANT_ID,
      processId: CUSTOMER_PROCESS_ID,
      name: "SME Customer",
      y: 0,
      height: LANE_HEIGHT
    },
    {
      participantId: BANK_PARTICIPANT_ID,
      processId: BANK_PROCESS_ID,
      name: "Bank / Financial Institution",
      y: BANK_POOL_Y,
      height: BANK_LANE_NAMES.length * LANE_HEIGHT
    },
    {
      participantId: EXTERNAL_PARTICIPANT_ID,
      name: "External Data Providers",
      y: EXTERNAL_POOL_Y,
      height: LANE_HEIGHT
    }
  ] satisfies Pool[];
}

function buildLanes() {
  return BANK_LANE_NAMES.map<Lane>((name, index) => ({
    id: `Lane_Bank_${sanitizeId(name)}`,
    name,
    processId: BANK_PROCESS_ID,
    y: BANK_POOL_Y + index * LANE_HEIGHT
  }));
}

function isCustomerTask(task: ProcessTask) {
  const text = normalize(`${task.actor} ${task.actorLane}`).toLowerCase();

  return text.includes("customer") || text.includes("khách hàng");
}

function getProcessId(task: ProcessTask) {
  return isCustomerTask(task) ? CUSTOMER_PROCESS_ID : BANK_PROCESS_ID;
}

function getPoolId(task: ProcessTask) {
  return isCustomerTask(task) ? CUSTOMER_PARTICIPANT_ID : BANK_PARTICIPANT_ID;
}

function getBankLaneName(task: ProcessTask) {
  const text = normalize(`${task.actor} ${task.actorLane} ${task.system} ${task.systemLane}`).toLowerCase();

  if (text.includes("rm")) {
    return "RM";
  }

  if (text.includes("ops")) {
    return "Ops Support";
  }

  if (text.includes("approver") || text.includes("credit approver")) {
    return "Credit Approver";
  }

  if (text.includes("notification")) {
    return "Notification Service";
  }

  if (text.includes("document") || text.includes("ocr")) {
    return "Document / OCR Service";
  }

  if (text.includes("portal") || text.includes("digital channel")) {
    return "Digital Channel / Loan Portal";
  }

  return "LOS / Workflow System";
}

function buildNodes(tasks: ProcessTask[], lanes: Lane[]) {
  const laneByName = new Map(lanes.map((lane) => [lane.name, lane]));

  return tasks.map<BpmnNode>((task, index) => {
    const tagName = getBpmnTag(task);
    const size = getNodeSize(tagName);
    const processId = getProcessId(task);
    const poolId = getPoolId(task);
    const lane = processId === BANK_PROCESS_ID
      ? laneByName.get(getBankLaneName(task)) ?? lanes[0]
      : null;
    const poolY = processId === CUSTOMER_PROCESS_ID ? 0 : BANK_POOL_Y;

    return {
      task,
      id: `${getNodeIdPrefix(tagName)}_${sanitizeId(task.stepId || task.id)}`,
      tagName,
      processId,
      poolId,
      laneId: lane?.id ?? "",
      x: START_X + index * HORIZONTAL_GAP,
      y: (lane?.y ?? poolY) + NODE_Y_OFFSET,
      width: size.width,
      height: size.height
    };
  });
}

function buildSequenceFlows(tasks: ProcessTask[], nodeByStepId: Map<string, BpmnNode>) {
  const flows: SequenceFlow[] = [];

  tasks.forEach((task) => {
    const sourceNode = nodeByStepId.get(task.stepId);

    if (!sourceNode) {
      return;
    }

    const nextSteps = [
      { value: task.defaultNextStep, label: undefined },
      { value: task.yesNextStep, label: "Yes" as const },
      { value: task.noNextStep, label: "No" as const }
    ];

    nextSteps.forEach((nextStep) => {
      const targetStepId = normalize(nextStep.value);

      if (!targetStepId) {
        return;
      }

      const targetNode = nodeByStepId.get(targetStepId);

      if (!targetNode) {
        return;
      }

      flows.push({
        id: `Flow_${sanitizeId(task.stepId)}_${sanitizeId(targetStepId)}${
          nextStep.label ? `_${nextStep.label}` : ""
        }`,
        sourceRef: sourceNode.id,
        targetRef: targetNode.id,
        label: nextStep.label,
        sourceStepId: task.stepId,
        branch: nextStep.label,
        conditionQuestion: task.conditionQuestion
      });
    });
  });

  return flows;
}

function isExternalDataCheck(node: BpmnNode) {
  const text = normalize(
    `${node.task.taskName} ${node.task.group} ${node.task.system} ${node.task.dataObject} ${node.task.input}`
  ).toLowerCase();

  return text.includes("blacklist") || text.includes("cic") || text.includes("external data");
}

function getProcessSequenceFlows(
  flows: SequenceFlow[],
  processId: string,
  nodeById: Map<string, BpmnNode>
) {
  return flows.filter((flow) => {
    const source = nodeById.get(flow.sourceRef);
    const target = nodeById.get(flow.targetRef);

    return source?.processId === processId && target?.processId === processId;
  });
}

function buildMessageFlows(flows: SequenceFlow[], nodes: BpmnNode[], nodeById: Map<string, BpmnNode>) {
  const messageFlows: MessageFlow[] = [];

  flows.forEach((flow) => {
    const source = nodeById.get(flow.sourceRef);
    const target = nodeById.get(flow.targetRef);

    if (!source || !target || source.processId === target.processId) {
      return;
    }

    messageFlows.push({
      id: `MessageFlow_${sanitizeId(flow.id)}`,
      sourceRef: source.id,
      targetRef: target.id,
      label: flow.label
    });
  });

  nodes.filter(isExternalDataCheck).forEach((node) => {
    messageFlows.push(
      {
        id: `MessageFlow_${sanitizeId(node.task.stepId)}_External_Request`,
        sourceRef: node.id,
        targetRef: EXTERNAL_PARTICIPANT_ID,
        label: "Request data check"
      },
      {
        id: `MessageFlow_External_${sanitizeId(node.task.stepId)}_Response`,
        sourceRef: EXTERNAL_PARTICIPANT_ID,
        targetRef: node.id,
        label: "Return data result"
      }
    );
  });

  return messageFlows;
}

function buildDataReferences(nodes: BpmnNode[]) {
  const objectByName = new Map<string, DataObjectDefinition>();
  const objects: DataObjectDefinition[] = [];
  const references: DataReference[] = [];

  function findNearestPreviousTask(index: number) {
    for (let previousIndex = index - 1; previousIndex >= 0; previousIndex -= 1) {
      const previousNode = nodes[previousIndex];

      if (previousNode?.tagName.toLowerCase().endsWith("task")) {
        return previousNode;
      }
    }

    return null;
  }

  function resolveDataOwnerNode(node: BpmnNode, index: number) {
    if (node.tagName.toLowerCase().endsWith("task")) {
      return node;
    }

    if (node.tagName === "bpmn:exclusiveGateway") {
      return findNearestPreviousTask(index);
    }

    return null;
  }

  nodes.forEach((node, index) => {
    const dataObjectName = normalize(node.task.dataObject);
    const dataAction = normalize(node.task.dataAction).toLowerCase();

    if (!dataObjectName || dataAction === "none") {
      return;
    }

    const ownerNode = resolveDataOwnerNode(node, index);

    // Gateways and end events should not own data refs. If there is no safe
    // previous task to attach to, skip the data object to avoid orphan refs.
    if (!ownerNode) {
      return;
    }

    const canAttachToTask = ownerNode.tagName.toLowerCase().endsWith("task");
    const associationType =
      node.tagName === "bpmn:exclusiveGateway"
        ? "output"
        : canAttachToTask && (dataAction === "pull" || dataAction === "read")
          ? "input"
        : canAttachToTask &&
            (dataAction === "push" || dataAction === "store" || dataAction === "update")
          ? "output"
          : "none";

    if (associationType === "none") {
      return;
    }

    const objectKey = `${ownerNode.processId}:${normalizeKey(dataObjectName)}`;
    let dataObject = objectByName.get(objectKey);

    if (!dataObject) {
      dataObject = {
        id: `DataObject_${sanitizeId(ownerNode.processId)}_${sanitizeId(dataObjectName)}`,
        name: dataObjectName,
        processId: ownerNode.processId
      };
      objectByName.set(objectKey, dataObject);
      objects.push(dataObject);
    }

    const referenceId = `DataRef_${sanitizeId(ownerNode.task.stepId)}_${sanitizeId(
      dataObjectName
    )}_${sanitizeId(node.task.stepId)}`;

    references.push({
      id: referenceId,
      objectId: dataObject.id,
      name: dataObjectName,
      sourceNodeId: ownerNode.id,
      processId: ownerNode.processId,
      associationType,
      x: ownerNode.x,
      y: ownerNode.y + ownerNode.height + 35
    });
  });

  return { objects, references };
}

function getIncomingFlows(nodeId: string, flows: SequenceFlow[]) {
  return flows.filter((flow) => flow.targetRef === nodeId).map((flow) => flow.id);
}

function getOutgoingFlows(nodeId: string, flows: SequenceFlow[]) {
  return flows.filter((flow) => flow.sourceRef === nodeId).map((flow) => flow.id);
}

function getDefaultFlowId(node: BpmnNode, flows: SequenceFlow[]) {
  if (node.tagName !== "bpmn:exclusiveGateway") {
    return "";
  }

  const outgoingFlows = flows.filter((flow) => flow.sourceRef === node.id);
  const noFlow = outgoingFlows.find((flow) => flow.branch === "No");

  return noFlow?.id ?? outgoingFlows[0]?.id ?? "";
}

function getDataReferencesForNode(node: BpmnNode, dataReferences: DataReference[]) {
  return dataReferences.filter(
    (reference) => reference.sourceNodeId === node.id && reference.associationType !== "none"
  );
}

function renderIoSpecification(dataReferences: DataReference[]) {
  if (dataReferences.length === 0) {
    return "";
  }

  const dataInputs = dataReferences
    .filter((reference) => reference.associationType === "input")
    .map(
      (reference) =>
        `      <bpmn:dataInput id="DataInput_${reference.id}" name="${escapeXml(reference.name)}" />`
    );
  const dataOutputs = dataReferences
    .filter((reference) => reference.associationType === "output")
    .map(
      (reference) =>
        `      <bpmn:dataOutput id="DataOutput_${reference.id}" name="${escapeXml(reference.name)}" />`
    );
  const inputRefs = dataInputs.length
    ? dataReferences
        .filter((reference) => reference.associationType === "input")
        .map((reference) => `        <bpmn:dataInputRefs>DataInput_${reference.id}</bpmn:dataInputRefs>`)
    : [];
  const outputRefs = dataOutputs.length
    ? dataReferences
        .filter((reference) => reference.associationType === "output")
        .map((reference) => `        <bpmn:dataOutputRefs>DataOutput_${reference.id}</bpmn:dataOutputRefs>`)
    : [];

  return [
    "      <bpmn:ioSpecification>",
    ...dataInputs,
    ...dataOutputs,
    `        <bpmn:inputSet id="InputSet_${dataReferences[0].sourceNodeId}">`,
    ...inputRefs,
    "        </bpmn:inputSet>",
    `        <bpmn:outputSet id="OutputSet_${dataReferences[0].sourceNodeId}">`,
    ...outputRefs,
    "        </bpmn:outputSet>",
    "      </bpmn:ioSpecification>"
  ].join("\n");
}

function renderDataAssociations(dataReferences: DataReference[]) {
  return dataReferences
    .map((reference) => {
      if (reference.associationType === "input") {
        return [
          `      <bpmn:dataInputAssociation id="DataInputAssociation_${reference.id}">`,
          `        <bpmn:sourceRef>${reference.id}</bpmn:sourceRef>`,
          `        <bpmn:targetRef>DataInput_${reference.id}</bpmn:targetRef>`,
          "      </bpmn:dataInputAssociation>"
        ].join("\n");
      }

      if (reference.associationType === "output") {
        return [
          `      <bpmn:dataOutputAssociation id="DataOutputAssociation_${reference.id}">`,
          `        <bpmn:sourceRef>DataOutput_${reference.id}</bpmn:sourceRef>`,
          `        <bpmn:targetRef>${reference.id}</bpmn:targetRef>`,
          "      </bpmn:dataOutputAssociation>"
        ].join("\n");
      }

      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function renderNode(node: BpmnNode, flows: SequenceFlow[], dataReferences: DataReference[]) {
  const incoming = getIncomingFlows(node.id, flows)
    .map((flowId) => `      <bpmn:incoming>${flowId}</bpmn:incoming>`)
    .join("\n");
  const outgoing = getOutgoingFlows(node.id, flows)
    .map((flowId) => `      <bpmn:outgoing>${flowId}</bpmn:outgoing>`)
    .join("\n");
  const nodeDataReferences = getDataReferencesForNode(node, dataReferences);
  const children = [
    incoming,
    outgoing,
    renderIoSpecification(nodeDataReferences),
    renderDataAssociations(nodeDataReferences)
  ]
    .filter(Boolean)
    .join("\n");
  const name = escapeXml(node.task.taskName || node.task.stepId);
  const defaultFlowId = getDefaultFlowId(node, flows);
  const defaultAttribute = defaultFlowId
    ? ` default="${escapeXml(defaultFlowId)}"`
    : "";

  if (!children) {
    return `    <${node.tagName} id="${node.id}" name="${name}"${defaultAttribute} />`;
  }

  return `    <${node.tagName} id="${node.id}" name="${name}"${defaultAttribute}>\n${children}\n    </${node.tagName}>`;
}

function getConditionExpression(flow: SequenceFlow) {
  if (!flow.branch) {
    return "";
  }

  const question = normalize(flow.conditionQuestion) || "gateway condition";

  return `${question} = ${flow.branch}`;
}

function isDefaultSequenceFlow(
  flow: SequenceFlow,
  flows: SequenceFlow[],
  nodeById: Map<string, BpmnNode>
) {
  const sourceNode = nodeById.get(flow.sourceRef);

  if (!sourceNode || sourceNode.tagName !== "bpmn:exclusiveGateway") {
    return false;
  }

  return getDefaultFlowId(sourceNode, flows) === flow.id;
}

function renderSequenceFlow(
  flow: SequenceFlow,
  flows: SequenceFlow[],
  nodeById: Map<string, BpmnNode>
) {
  const name = flow.label ? ` name="${escapeXml(flow.label)}"` : "";

  if (!flow.branch || isDefaultSequenceFlow(flow, flows, nodeById)) {
    return `    <bpmn:sequenceFlow id="${flow.id}"${name} sourceRef="${flow.sourceRef}" targetRef="${flow.targetRef}" />`;
  }

  return [
    `    <bpmn:sequenceFlow id="${flow.id}"${name} sourceRef="${flow.sourceRef}" targetRef="${flow.targetRef}">`,
    `      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">${escapeXml(
      getConditionExpression(flow)
    )}</bpmn:conditionExpression>`,
    "    </bpmn:sequenceFlow>"
  ].join("\n");
}

function renderLane(lane: Lane, nodes: BpmnNode[]) {
  const nodeRefs = nodes
    .filter((node) => node.laneId === lane.id)
    .map((node) => `        <bpmn:flowNodeRef>${node.id}</bpmn:flowNodeRef>`);
  const refs = nodeRefs.join("\n");

  return `      <bpmn:lane id="${lane.id}" name="${escapeXml(lane.name)}">\n${refs}\n      </bpmn:lane>`;
}

function renderDataObject(object: DataObjectDefinition) {
  return `    <bpmn:dataObject id="${object.id}" name="${escapeXml(object.name)}" />`;
}

function renderDataObjectReference(reference: DataReference) {
  return [
    `    <bpmn:dataObjectReference id="${reference.id}" name="${escapeXml(reference.name)}" dataObjectRef="${reference.objectId}" />`
  ].join("\n");
}

function renderMessageFlow(flow: MessageFlow) {
  const name = flow.label ? ` name="${escapeXml(flow.label)}"` : "";

  return `    <bpmn:messageFlow id="${flow.id}"${name} sourceRef="${flow.sourceRef}" targetRef="${flow.targetRef}" />`;
}

function renderProcess(
  processId: string,
  name: string,
  nodes: BpmnNode[],
  lanes: Lane[],
  flows: SequenceFlow[],
  dataObjects: DataObjectDefinition[],
  dataReferences: DataReference[],
  nodeById: Map<string, BpmnNode>
) {
  const processNodes = nodes.filter((node) => node.processId === processId);
  const processLanes = lanes.filter((lane) => lane.processId === processId);
  const processFlows = getProcessSequenceFlows(flows, processId, nodeById);
  const processDataObjects = dataObjects.filter((object) => object.processId === processId);
  const processDataReferences = dataReferences.filter(
    (reference) => reference.processId === processId
  );
  const laneSet = processLanes.length
    ? [
        `    <bpmn:laneSet id="LaneSet_${sanitizeId(processId)}">`,
        processLanes.map((lane) => renderLane(lane, processNodes)).join("\n"),
        "    </bpmn:laneSet>"
      ].join("\n")
    : "";

  return [
    `  <bpmn:process id="${processId}" name="${escapeXml(name)}" isExecutable="false">`,
    laneSet,
    processNodes
      .map((node) => renderNode(node, processFlows, processDataReferences))
      .join("\n"),
    processFlows
      .map((flow) => renderSequenceFlow(flow, processFlows, nodeById))
      .join("\n"),
    processDataObjects.map(renderDataObject).join("\n"),
    processDataReferences.map(renderDataObjectReference).join("\n"),
    "  </bpmn:process>"
  ]
    .filter(Boolean)
    .join("\n");
}

function renderShape(id: string, bpmnElement: string, x: number, y: number, width: number, height: number) {
  return [
    `      <bpmndi:BPMNShape id="${id}" bpmnElement="${bpmnElement}">`,
    `        <dc:Bounds x="${x}" y="${y}" width="${width}" height="${height}" />`,
    "      </bpmndi:BPMNShape>"
  ].join("\n");
}

function renderEdge(id: string, bpmnElement: string, points: Array<{ x: number; y: number }>) {
  return [
    `      <bpmndi:BPMNEdge id="${id}" bpmnElement="${bpmnElement}">`,
    ...points.map((point) => `        <di:waypoint x="${point.x}" y="${point.y}" />`),
    "      </bpmndi:BPMNEdge>"
  ].join("\n");
}

function getSequenceWaypoints(source: BpmnNode, target: BpmnNode) {
  const sourceX = source.x + source.width;
  const sourceY = source.y + source.height / 2;
  const targetX = target.x;
  const targetY = target.y + target.height / 2;
  const midX = sourceX + (targetX - sourceX) / 2;

  return [
    { x: sourceX, y: sourceY },
    { x: midX, y: sourceY },
    { x: midX, y: targetY },
    { x: targetX, y: targetY }
  ];
}

function getPoolCenter(pool: Pool, diagramWidth: number) {
  return {
    x: 60 + diagramWidth / 2,
    y: pool.y + pool.height / 2
  };
}

function getMessageWaypoints(
  flow: MessageFlow,
  nodeById: Map<string, BpmnNode>,
  poolByParticipantId: Map<string, Pool>,
  diagramWidth: number
) {
  const sourceNode = nodeById.get(flow.sourceRef);
  const targetNode = nodeById.get(flow.targetRef);
  const sourcePool = poolByParticipantId.get(flow.sourceRef);
  const targetPool = poolByParticipantId.get(flow.targetRef);
  const source = sourceNode
    ? { x: sourceNode.x + sourceNode.width / 2, y: sourceNode.y + sourceNode.height / 2 }
    : sourcePool
      ? getPoolCenter(sourcePool, diagramWidth)
      : { x: 60, y: 0 };
  const target = targetNode
    ? { x: targetNode.x + targetNode.width / 2, y: targetNode.y + targetNode.height / 2 }
    : targetPool
      ? getPoolCenter(targetPool, diagramWidth)
      : { x: 60, y: 0 };
  const midY = source.y + (target.y - source.y) / 2;

  return [
    source,
    { x: source.x, y: midY },
    { x: target.x, y: midY },
    target
  ];
}

export function generateBpmnXml(
  processTasks: ProcessTask[],
  templateProfile: TemplateProfile
) {
  const collaborationId = `Collaboration_${sanitizeId(templateProfile.id || "D01_BPMN")}`;
  const diagramId = `Diagram_${sanitizeId(templateProfile.id || "D01_BPMN")}`;
  const planeId = `Plane_${sanitizeId(templateProfile.id || "D01_BPMN")}`;
  const pools = buildPools();
  const poolByParticipantId = new Map(pools.map((pool) => [pool.participantId, pool]));
  const lanes = buildLanes();
  const nodes = buildNodes(processTasks, lanes);
  const nodeByStepId = new Map(nodes.map((node) => [node.task.stepId, node]));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const sequenceFlows = buildSequenceFlows(processTasks, nodeByStepId);
  const processSequenceFlows = sequenceFlows.filter((flow) => {
    const source = nodeById.get(flow.sourceRef);
    const target = nodeById.get(flow.targetRef);

    return source?.processId === target?.processId;
  });
  const messageFlows = buildMessageFlows(sequenceFlows, nodes, nodeById);
  const { objects: dataObjects, references: dataReferences } = buildDataReferences(nodes);
  const diagramWidth =
    START_X + Math.max(processTasks.length - 1, 0) * HORIZONTAL_GAP + LANE_WIDTH_PADDING;
  const diagramHeight = EXTERNAL_POOL_Y + LANE_HEIGHT;

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_D01_BPMN" targetNamespace="https://process-blueprint-ai-workbench.local/bpmn">',
    `  <bpmn:collaboration id="${collaborationId}">`,
    `    <bpmn:participant id="${CUSTOMER_PARTICIPANT_ID}" name="SME Customer" processRef="${CUSTOMER_PROCESS_ID}" />`,
    `    <bpmn:participant id="${BANK_PARTICIPANT_ID}" name="Bank / Financial Institution" processRef="${BANK_PROCESS_ID}" />`,
    `    <bpmn:participant id="${EXTERNAL_PARTICIPANT_ID}" name="External Data Providers" />`,
    messageFlows.map(renderMessageFlow).join("\n"),
    "  </bpmn:collaboration>",
    renderProcess(
      CUSTOMER_PROCESS_ID,
      "SME Customer Process",
      nodes,
      lanes,
      sequenceFlows,
      dataObjects,
      dataReferences,
      nodeById
    ),
    renderProcess(
      BANK_PROCESS_ID,
      `${templateProfile.name} - Bank Process`,
      nodes,
      lanes,
      sequenceFlows,
      dataObjects,
      dataReferences,
      nodeById
    ),
    `  <bpmndi:BPMNDiagram id="${diagramId}">`,
    `    <bpmndi:BPMNPlane id="${planeId}" bpmnElement="${collaborationId}">`,
    pools
      .map((pool) =>
        renderShape(
          `${pool.participantId}_di`,
          pool.participantId,
          60,
          pool.y,
          diagramWidth,
          pool.height
        )
      )
      .join("\n"),
    lanes
      .map((lane) =>
        renderShape(`${lane.id}_di`, lane.id, 90, lane.y, diagramWidth - 30, LANE_HEIGHT)
      )
      .join("\n"),
    nodes
      .map((node) =>
        renderShape(`${node.id}_di`, node.id, node.x, node.y, node.width, node.height)
      )
      .join("\n"),
    dataReferences
      .map((reference) =>
        renderShape(`${reference.id}_di`, reference.id, reference.x, reference.y, 36, 50)
      )
      .join("\n"),
    processSequenceFlows
      .map((flow) => {
        const source = nodeById.get(flow.sourceRef);
        const target = nodeById.get(flow.targetRef);

        if (!source || !target) {
          return "";
        }

        return renderEdge(
          `${flow.id}_di`,
          flow.id,
          getSequenceWaypoints(source, target)
        );
      })
      .filter(Boolean)
      .join("\n"),
    messageFlows
      .map((flow) =>
        renderEdge(
          `${flow.id}_di`,
          flow.id,
          getMessageWaypoints(flow, nodeById, poolByParticipantId, diagramWidth)
        )
      )
      .join("\n"),
    "    </bpmndi:BPMNPlane>",
    "  </bpmndi:BPMNDiagram>",
    "</bpmn:definitions>"
  ];

  return xml.filter(Boolean).join("\n");
}
