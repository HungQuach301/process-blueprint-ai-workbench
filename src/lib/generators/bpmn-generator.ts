import type { ProcessTask } from "@/lib/models/process-task";
import type { TemplateProfile } from "@/lib/models/template-profile";

type BpmnNode = {
  task: ProcessTask;
  id: string;
  tagName: string;
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

type Association = {
  id: string;
  sourceRef: string;
  targetRef: string;
};

type DataReference = {
  id: string;
  objectId: string;
  name: string;
  sourceNodeId: string;
  x: number;
  y: number;
};

type Lane = {
  id: string;
  name: string;
  type: "actor" | "system" | "data";
  y: number;
};

const LANE_HEIGHT = 170;
const LANE_WIDTH_PADDING = 260;
const START_X = 120;
const NODE_Y_OFFSET = 55;
const HORIZONTAL_GAP = 250;

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

function unique(values: string[]) {
  return [...new Set(values.map(normalize).filter(Boolean))];
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

function buildLanes(tasks: ProcessTask[]) {
  const actorLaneNames = unique(tasks.map((task) => task.actorLane));
  const systemLaneNames = unique(tasks.map((task) => task.systemLane));
  const dataLaneNames = unique(
    tasks
      .filter((task) => task.rowType === "data" || normalize(task.dataObject))
      .map(() => "Data")
  );

  return [
    ...actorLaneNames.map((name) => ({ name, type: "actor" as const })),
    ...systemLaneNames
      .filter((name) => !actorLaneNames.includes(name))
      .map((name) => ({ name, type: "system" as const })),
    ...dataLaneNames
      .filter((name) => !actorLaneNames.includes(name) && !systemLaneNames.includes(name))
      .map((name) => ({ name, type: "data" as const }))
  ].map<Lane>((lane, index) => ({
    id: `Lane_${sanitizeId(lane.name)}`,
    name: lane.name,
    type: lane.type,
    y: index * LANE_HEIGHT
  }));
}

function getLaneName(task: ProcessTask) {
  if (task.rowType === "data") {
    return "Data";
  }

  if (normalize(task.actorLane)) {
    return task.actorLane;
  }

  if (normalize(task.systemLane)) {
    return task.systemLane;
  }

  return "Unassigned";
}

function buildNodes(tasks: ProcessTask[], lanes: Lane[]) {
  const laneByName = new Map(lanes.map((lane) => [lane.name, lane]));

  return tasks.map<BpmnNode>((task, index) => {
    const tagName = getBpmnTag(task);
    const size = getNodeSize(tagName);
    const lane = laneByName.get(getLaneName(task)) ?? lanes[0];

    return {
      task,
      id: `Activity_${sanitizeId(task.stepId || task.id)}`,
      tagName,
      laneId: lane?.id ?? "Lane_Unassigned",
      x: START_X + index * HORIZONTAL_GAP,
      y: (lane?.y ?? 0) + NODE_Y_OFFSET,
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

function buildDataReferences(nodes: BpmnNode[]) {
  const references: DataReference[] = [];
  const associations: Association[] = [];

  nodes.forEach((node) => {
    const dataObjectName = normalize(node.task.dataObject);

    if (!dataObjectName || node.task.dataAction === "none") {
      return;
    }

    const referenceId = `DataRef_${sanitizeId(node.task.stepId)}_${sanitizeId(dataObjectName)}`;
    const objectId = `DataObject_${sanitizeId(node.task.stepId)}_${sanitizeId(dataObjectName)}`;

    references.push({
      id: referenceId,
      objectId,
      name: dataObjectName,
      sourceNodeId: node.id,
      x: node.x,
      y: node.y + node.height + 35
    });

    associations.push({
      id: `Association_${sanitizeId(node.task.stepId)}_${sanitizeId(dataObjectName)}`,
      sourceRef: node.id,
      targetRef: referenceId
    });
  });

  return { references, associations };
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

function renderNode(node: BpmnNode, flows: SequenceFlow[]) {
  const incoming = getIncomingFlows(node.id, flows)
    .map((flowId) => `      <bpmn:incoming>${flowId}</bpmn:incoming>`)
    .join("\n");
  const outgoing = getOutgoingFlows(node.id, flows)
    .map((flowId) => `      <bpmn:outgoing>${flowId}</bpmn:outgoing>`)
    .join("\n");
  const children = [incoming, outgoing].filter(Boolean).join("\n");
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

function renderSequenceFlow(flow: SequenceFlow) {
  const name = flow.label ? ` name="${escapeXml(flow.label)}"` : "";

  if (!flow.branch) {
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
  const refs = nodes
    .filter((node) => node.laneId === lane.id)
    .map((node) => `        <bpmn:flowNodeRef>${node.id}</bpmn:flowNodeRef>`)
    .join("\n");

  return `      <bpmn:lane id="${lane.id}" name="${escapeXml(lane.name)}">\n${refs}\n      </bpmn:lane>`;
}

function renderDataObject(reference: DataReference) {
  return [
    `    <bpmn:dataObject id="${reference.objectId}" name="${escapeXml(reference.name)}" />`,
    `    <bpmn:dataObjectReference id="${reference.id}" name="${escapeXml(reference.name)}" dataObjectRef="${reference.objectId}" />`
  ].join("\n");
}

function renderAssociation(association: Association) {
  return `    <bpmn:association id="${association.id}" sourceRef="${association.sourceRef}" targetRef="${association.targetRef}" />`;
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

function getAssociationWaypoints(source: BpmnNode, target: DataReference) {
  return [
    { x: source.x + source.width / 2, y: source.y + source.height },
    { x: target.x + 18, y: target.y }
  ];
}

export function generateBpmnXml(
  processTasks: ProcessTask[],
  templateProfile: TemplateProfile
) {
  const processId = `Process_${sanitizeId(templateProfile.id || "D01_BPMN")}`;
  const collaborationId = `Collaboration_${sanitizeId(templateProfile.id || "D01_BPMN")}`;
  const participantId = `Participant_${sanitizeId(templateProfile.id || "D01_BPMN")}`;
  const diagramId = `Diagram_${sanitizeId(templateProfile.id || "D01_BPMN")}`;
  const planeId = `Plane_${sanitizeId(templateProfile.id || "D01_BPMN")}`;
  const lanes = buildLanes(processTasks);
  const nodes = buildNodes(processTasks, lanes);
  const nodeByStepId = new Map(nodes.map((node) => [node.task.stepId, node]));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const sequenceFlows = buildSequenceFlows(processTasks, nodeByStepId);
  const { references: dataReferences, associations } = buildDataReferences(nodes);
  const diagramWidth =
    START_X + Math.max(processTasks.length - 1, 0) * HORIZONTAL_GAP + LANE_WIDTH_PADDING;
  const diagramHeight = Math.max(lanes.length, 1) * LANE_HEIGHT;

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_D01_BPMN" targetNamespace="https://process-blueprint-ai-workbench.local/bpmn">',
    `  <bpmn:collaboration id="${collaborationId}">`,
    `    <bpmn:participant id="${participantId}" name="${escapeXml(templateProfile.name)}" processRef="${processId}" />`,
    "  </bpmn:collaboration>",
    `  <bpmn:process id="${processId}" name="${escapeXml(templateProfile.name)}" isExecutable="false">`,
    '    <bpmn:laneSet id="LaneSet_D01_BPMN">',
    lanes.map((lane) => renderLane(lane, nodes)).join("\n"),
    "    </bpmn:laneSet>",
    nodes.map((node) => renderNode(node, sequenceFlows)).join("\n"),
    sequenceFlows.map(renderSequenceFlow).join("\n"),
    dataReferences.map(renderDataObject).join("\n"),
    associations.map(renderAssociation).join("\n"),
    "  </bpmn:process>",
    `  <bpmndi:BPMNDiagram id="${diagramId}">`,
    `    <bpmndi:BPMNPlane id="${planeId}" bpmnElement="${collaborationId}">`,
    renderShape(
      `${participantId}_di`,
      participantId,
      60,
      0,
      diagramWidth,
      diagramHeight
    ),
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
    sequenceFlows
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
    associations
      .map((association) => {
        const source = nodeById.get(association.sourceRef);
        const target = dataReferences.find(
          (reference) => reference.id === association.targetRef
        );

        if (!source || !target) {
          return "";
        }

        return renderEdge(
          `${association.id}_di`,
          association.id,
          getAssociationWaypoints(source, target)
        );
      })
      .filter(Boolean)
      .join("\n"),
    "    </bpmndi:BPMNPlane>",
    "  </bpmndi:BPMNDiagram>",
    "</bpmn:definitions>"
  ];

  return xml.filter(Boolean).join("\n");
}
