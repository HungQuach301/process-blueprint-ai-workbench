import {
  createGateVerdict,
  type GateIssue,
  type GateScoreBreakdown,
  type GateScoreDimension,
  type GateVerdict
} from "@/lib/quality-engine/gate-verdict";

export const D01_POST_GENERATION_GATE_ID = "d01-post-generation";

const BPMN_MODEL_NAMESPACE = "http://www.omg.org/spec/BPMN/20100524/MODEL";
const D01_ARTIFACT_NAME = "D01 BPMN";

type ParsedXmlResult =
  | {
      ok: true;
      document: Document;
    }
  | {
      ok: false;
      issue: GateIssue;
    };

function createIssue({
  code,
  severity,
  title,
  description,
  evidence,
  metadata
}: Omit<GateIssue, "affectedArtifact">): GateIssue {
  return {
    code,
    severity,
    title,
    description,
    affectedArtifact: D01_ARTIFACT_NAME,
    evidence,
    metadata
  };
}

function parseXml(xml: string): ParsedXmlResult {
  const trimmedXml = xml.trim();

  if (!trimmedXml) {
    return {
      ok: false,
      issue: createIssue({
        code: "d01_post_empty_xml",
        severity: "blocker",
        title: "Generated BPMN XML is empty",
        description:
          "D01 post-generation validation needs a generated BPMN XML string before structural checks can run."
      })
    };
  }

  if (typeof DOMParser === "undefined") {
    return {
      ok: false,
      issue: createIssue({
        code: "d01_post_xml_parser_unavailable",
        severity: "blocker",
        title: "XML parser is unavailable",
        description:
          "The current runtime does not expose an XML parser for D01 post-generation validation. Add an approved shared XML parser before running this gate outside the browser.",
        metadata: {
          parser: "DOMParser"
        }
      })
    };
  }

  const document = new DOMParser().parseFromString(trimmedXml, "application/xml");
  const parserErrors = Array.from(document.getElementsByTagName("parsererror"));

  if (parserErrors.length > 0) {
    return {
      ok: false,
      issue: createIssue({
        code: "d01_post_malformed_xml",
        severity: "blocker",
        title: "Generated BPMN XML is malformed",
        description:
          "The generated D01 BPMN XML could not be parsed as XML and should not be exported or reviewed as a valid BPMN artifact.",
        evidence: parserErrors
          .map((parserError) => parserError.textContent?.trim())
          .filter((message): message is string => Boolean(message))
          .slice(0, 2)
      })
    };
  }

  return {
    ok: true,
    document
  };
}

function isBpmnElement(element: Element, localName: string) {
  return (
    element.localName === localName &&
    (element.namespaceURI === BPMN_MODEL_NAMESPACE ||
      element.tagName === `bpmn:${localName}`)
  );
}

function findBpmnElements(document: Document, localName: string) {
  return Array.from(document.getElementsByTagNameNS(BPMN_MODEL_NAMESPACE, localName));
}

function hasBpmnElement(document: Document, localName: string) {
  return findBpmnElements(document, localName).length > 0;
}

function checkRequiredStructure(document: Document) {
  const issues: GateIssue[] = [];
  const root = document.documentElement;

  if (!root || !isBpmnElement(root, "definitions")) {
    issues.push(
      createIssue({
        code: "d01_post_missing_definitions",
        severity: "blocker",
        title: "Missing BPMN definitions root",
        description:
          "D01 BPMN XML must use a BPMN definitions root element with the BPMN model namespace.",
        evidence: root
          ? [`root=${root.tagName}`, `namespace=${root.namespaceURI ?? ""}`]
          : undefined
      })
    );
  }

  const requiredElements = [
    {
      code: "d01_post_missing_collaboration",
      localName: "collaboration",
      title: "Missing BPMN collaboration",
      description:
        "D01 BPMN XML should include a collaboration so participants and message flows remain visible."
    },
    {
      code: "d01_post_missing_participant",
      localName: "participant",
      title: "Missing BPMN participant",
      description:
        "D01 BPMN XML should include at least one participant for pool visibility."
    },
    {
      code: "d01_post_missing_process",
      localName: "process",
      title: "Missing BPMN process",
      description:
        "D01 BPMN XML should include at least one process that contains generated process nodes and flows."
    },
    {
      code: "d01_post_missing_laneset",
      localName: "laneSet",
      title: "Missing BPMN laneSet",
      description:
        "D01 BPMN XML should include a laneSet so actor/system ownership remains visible in the diagram."
    }
  ];

  requiredElements.forEach((requiredElement) => {
    if (hasBpmnElement(document, requiredElement.localName)) {
      return;
    }

    issues.push(
      createIssue({
        code: requiredElement.code,
        severity: "blocker",
        title: requiredElement.title,
        description: requiredElement.description
      })
    );
  });

  return issues;
}

function createScoreBreakdown(issues: GateIssue[]): GateScoreBreakdown {
  const dimensions: GateScoreDimension[] = [
    {
      id: "xmlParseability",
      label: "XML parseability",
      maxScore: 40,
      score: issues.some((issue) =>
        [
          "d01_post_empty_xml",
          "d01_post_xml_parser_unavailable",
          "d01_post_malformed_xml"
        ].includes(issue.code)
      )
        ? 0
        : 40
    },
    {
      id: "bpmnCoreStructure",
      label: "BPMN core structure",
      maxScore: 60,
      score: Math.max(
        0,
        60 -
          issues.filter((issue) =>
            [
              "d01_post_missing_definitions",
              "d01_post_missing_collaboration",
              "d01_post_missing_participant",
              "d01_post_missing_process",
              "d01_post_missing_laneset"
            ].includes(issue.code)
          ).length *
            12
      )
    }
  ].map((dimension) => ({
    ...dimension,
    status:
      dimension.score === 0
        ? "fail"
        : dimension.score !== undefined &&
            dimension.maxScore !== undefined &&
            dimension.score < dimension.maxScore
          ? "warning"
          : "pass"
  }));

  return {
    score: dimensions.reduce((total, dimension) => total + (dimension.score ?? 0), 0),
    maxScore: dimensions.reduce(
      (total, dimension) => total + (dimension.maxScore ?? 0),
      0
    ),
    dimensions
  };
}

export function runD01PostGenerationGate(xml: string): GateVerdict {
  const parsedXml = parseXml(xml);
  const issues = parsedXml.ok ? checkRequiredStructure(parsedXml.document) : [parsedXml.issue];

  return createGateVerdict({
    gateId: D01_POST_GENERATION_GATE_ID,
    gateName: "D01 BPMN Post-generation Gate",
    issues,
    score: createScoreBreakdown(issues),
    metadata: {
      artifactType: "bpmn",
      xmlLength: xml.length,
      parser: "DOMParser",
      mutatesXml: false
    }
  });
}

