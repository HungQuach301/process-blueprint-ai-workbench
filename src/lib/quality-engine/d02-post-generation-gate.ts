import {
  createGateVerdict,
  type GateIssue,
  type GateScoreBreakdown,
  type GateScoreDimension,
  type GateVerdict
} from "@/lib/quality-engine/gate-verdict";

export const D02_POST_GENERATION_GATE_ID = "d02-post-generation";

const D02_ARTIFACT_NAME = "D02 Service Blueprint";
const LARGE_CARD_COUNT_WARNING_THRESHOLD = 80;

type ParsedXmlResult =
  | {
      ok: true;
      document: Document;
    }
  | {
      ok: false;
      issue: GateIssue;
    };

type CardBounds = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function createIssue({
  code,
  severity,
  title,
  description,
  affectedIds,
  evidence,
  metadata
}: Omit<GateIssue, "affectedArtifact">): GateIssue {
  return {
    code,
    severity,
    title,
    description,
    affectedArtifact: D02_ARTIFACT_NAME,
    affectedIds,
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
        code: "d02_post_empty_xml",
        severity: "blocker",
        title: "Generated draw.io XML is empty",
        description:
          "D02 post-generation validation needs a generated draw.io XML string before structural checks can run."
      })
    };
  }

  if (typeof DOMParser === "undefined") {
    return {
      ok: false,
      issue: createIssue({
        code: "d02_post_xml_parser_unavailable",
        severity: "blocker",
        title: "XML parser is unavailable",
        description:
          "The current runtime does not expose an XML parser for D02 post-generation validation. Add an approved shared XML parser before running this gate outside the browser.",
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
        code: "d02_post_malformed_xml",
        severity: "blocker",
        title: "Generated draw.io XML is malformed",
        description:
          "The generated D02 draw.io XML could not be parsed as XML and should not be exported or reviewed as a valid diagrams.net artifact.",
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

function firstElement(document: Document, tagName: string) {
  return document.getElementsByTagName(tagName)[0] ?? null;
}

function getCells(document: Document) {
  return Array.from(document.getElementsByTagName("mxCell"));
}

function checkDrawioStructure(document: Document) {
  const issues: GateIssue[] = [];
  const rootElement = document.documentElement;
  const diagram = firstElement(document, "diagram");
  const graphModel = firstElement(document, "mxGraphModel");
  const graphRoot = firstElement(document, "root");
  const cells = getCells(document);

  if (!rootElement || rootElement.tagName !== "mxfile") {
    issues.push(
      createIssue({
        code: "d02_post_missing_mxfile_root",
        severity: "blocker",
        title: "Missing draw.io mxfile root",
        description:
          "D02 draw.io XML must use an mxfile root so diagrams.net can open the artifact.",
        evidence: rootElement ? [`root=${rootElement.tagName}`] : undefined
      })
    );
  }

  if (!diagram) {
    issues.push(
      createIssue({
        code: "d02_post_missing_diagram",
        severity: "blocker",
        title: "Missing draw.io diagram",
        description:
          "D02 draw.io XML should include a diagram element containing the service blueprint graph."
      })
    );
  }

  if (!graphModel) {
    issues.push(
      createIssue({
        code: "d02_post_missing_mxgraphmodel",
        severity: "blocker",
        title: "Missing mxGraphModel",
        description:
          "D02 draw.io XML should include mxGraphModel so diagrams.net can render the blueprint canvas."
      })
    );
  }

  if (!graphRoot) {
    issues.push(
      createIssue({
        code: "d02_post_missing_root_cells",
        severity: "blocker",
        title: "Missing draw.io root cells",
        description:
          "D02 draw.io XML should include a root element containing base mxCell nodes and blueprint cells."
      })
    );
  }

  const hasBaseRootCell = cells.some((cell) => cell.getAttribute("id") === "0");
  const hasPageRootCell = cells.some(
    (cell) =>
      cell.getAttribute("id") === "1" && cell.getAttribute("parent") === "0"
  );

  if (!hasBaseRootCell || !hasPageRootCell) {
    issues.push(
      createIssue({
        code: "d02_post_missing_base_mxcells",
        severity: "blocker",
        title: "Missing base mxCell nodes",
        description:
          "D02 draw.io XML should include mxCell id=0 and mxCell id=1 parent=0 as the base diagrams.net graph structure.",
        evidence: [
          `hasCell0=${hasBaseRootCell}`,
          `hasCell1Parent0=${hasPageRootCell}`
        ]
      })
    );
  }

  return issues;
}

function getChildCardPartIds(cells: Element[], cardId: string) {
  return new Set(
    cells
      .filter((cell) => cell.getAttribute("parent") === cardId)
      .map((cell) => cell.getAttribute("id") ?? "")
  );
}

function parseNumberAttribute(element: Element, attributeName: string) {
  const value = Number(element.getAttribute(attributeName));

  return Number.isFinite(value) ? value : null;
}

function getCardBounds(cardCell: Element): CardBounds | null {
  const geometry = cardCell.getElementsByTagName("mxGeometry")[0];

  if (!geometry) {
    return null;
  }

  const x = parseNumberAttribute(geometry, "x");
  const y = parseNumberAttribute(geometry, "y");
  const width = parseNumberAttribute(geometry, "width");
  const height = parseNumberAttribute(geometry, "height");

  if (x === null || y === null || width === null || height === null) {
    return null;
  }

  return {
    id: cardCell.getAttribute("id") ?? "",
    x,
    y,
    width,
    height
  };
}

function boundsOverlap(a: CardBounds, b: CardBounds) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function findOverlappingCards(cardBounds: CardBounds[]) {
  const overlaps: string[] = [];

  for (let index = 0; index < cardBounds.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < cardBounds.length; nextIndex += 1) {
      const currentCard = cardBounds[index];
      const nextCard = cardBounds[nextIndex];

      if (currentCard && nextCard && boundsOverlap(currentCard, nextCard)) {
        overlaps.push(`${currentCard.id}<->${nextCard.id}`);
      }
    }
  }

  return overlaps;
}

function checkCardStructure(document: Document) {
  const issues: GateIssue[] = [];
  const cells = getCells(document);
  const cardCells = cells.filter((cell) => {
    const id = cell.getAttribute("id") ?? "";

    return (
      id.startsWith("card_") &&
      !id.endsWith("_header") &&
      !id.endsWith("_middle") &&
      !id.endsWith("_footer")
    );
  });
  const incompleteCards: string[] = [];
  const cardsMissingGeometry: string[] = [];
  const cardBounds: CardBounds[] = [];

  cardCells.forEach((cardCell) => {
    const cardId = cardCell.getAttribute("id") ?? "";
    const childPartIds = getChildCardPartIds(cells, cardId);
    const missingParts = ["header", "middle", "footer"].filter(
      (part) => !childPartIds.has(`${cardId}_${part}`)
    );
    const bounds = getCardBounds(cardCell);

    if (missingParts.length > 0) {
      incompleteCards.push(`${cardId}: missing ${missingParts.join(", ")}`);
    }

    if (!bounds) {
      cardsMissingGeometry.push(cardId);
    } else {
      cardBounds.push(bounds);
    }
  });

  if (cardCells.length === 0) {
    issues.push(
      createIssue({
        code: "d02_post_missing_task_cards",
        severity: "blocker",
        title: "Missing D02 task cards",
        description:
          "D02 draw.io XML should include task card containers generated from ProcessTask rows."
      })
    );
  }

  if (incompleteCards.length > 0) {
    issues.push(
      createIssue({
        code: "d02_post_incomplete_task_cards",
        severity: "blocker",
        title: "D02 task cards are incomplete",
        description:
          "Each generated D02 task card should keep the expected three-box structure: header, middle, and footer.",
        affectedIds: incompleteCards.map((entry) => entry.split(":")[0] ?? entry),
        evidence: incompleteCards.slice(0, 10),
        metadata: {
          incompleteCardCount: incompleteCards.length
        }
      })
    );
  }

  if (cardsMissingGeometry.length > 0) {
    issues.push(
      createIssue({
        code: "d02_post_card_geometry_missing",
        severity: "warning",
        title: "Some D02 task cards are missing geometry",
        description:
          "D02 card containers should include mxGeometry so diagrams.net can place them reliably.",
        affectedIds: cardsMissingGeometry.slice(0, 20),
        metadata: {
          missingGeometryCount: cardsMissingGeometry.length
        }
      })
    );
  }

  if (cardCells.length > LARGE_CARD_COUNT_WARNING_THRESHOLD) {
    issues.push(
      createIssue({
        code: "d02_post_large_card_count",
        severity: "warning",
        title: "D02 output contains many task cards",
        description:
          "The generated Service Blueprint is structurally valid, but a large card count can reduce readability and should be reviewed.",
        evidence: [
          `cardCount=${cardCells.length}`,
          `reviewThreshold=${LARGE_CARD_COUNT_WARNING_THRESHOLD}`
        ],
        metadata: {
          cardCount: cardCells.length,
          reviewThreshold: LARGE_CARD_COUNT_WARNING_THRESHOLD
        }
      })
    );
  }

  const overlappingCards = findOverlappingCards(cardBounds);

  if (overlappingCards.length > 0) {
    issues.push(
      createIssue({
        code: "d02_post_potential_card_overlap",
        severity: "warning",
        title: "Potential D02 card overlap detected",
        description:
          "Some generated task card containers have overlapping mxGeometry bounds and should be reviewed in diagrams.net.",
        evidence: overlappingCards.slice(0, 10),
        metadata: {
          overlapCount: overlappingCards.length
        }
      })
    );
  }

  return {
    issues,
    metadata: {
      cardCount: cardCells.length,
      cardsWithGeometryCount: cardBounds.length,
      incompleteCardCount: incompleteCards.length,
      missingGeometryCount: cardsMissingGeometry.length,
      overlapCount: overlappingCards.length
    }
  };
}

function createScoreBreakdown(issues: GateIssue[]): GateScoreBreakdown {
  const dimensions: GateScoreDimension[] = [
    {
      id: "xmlParseability",
      label: "XML parseability",
      maxScore: 35,
      score: issues.some((issue) =>
        [
          "d02_post_empty_xml",
          "d02_post_xml_parser_unavailable",
          "d02_post_malformed_xml"
        ].includes(issue.code)
      )
        ? 0
        : 35
    },
    {
      id: "drawioStructure",
      label: "draw.io root structure",
      maxScore: 35,
      score: Math.max(
        0,
        35 -
          issues.filter((issue) =>
            [
              "d02_post_missing_mxfile_root",
              "d02_post_missing_diagram",
              "d02_post_missing_mxgraphmodel",
              "d02_post_missing_root_cells",
              "d02_post_missing_base_mxcells"
            ].includes(issue.code)
          ).length *
            7
      )
    },
    {
      id: "cardLayout",
      label: "Task card layout",
      maxScore: 30,
      score: Math.max(
        0,
        30 -
          issues.filter((issue) =>
            [
              "d02_post_missing_task_cards",
              "d02_post_incomplete_task_cards",
              "d02_post_card_geometry_missing",
              "d02_post_large_card_count",
              "d02_post_potential_card_overlap"
            ].includes(issue.code)
          ).length *
            6
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

export function runD02PostGenerationGate(xml: string): GateVerdict {
  const parsedXml = parseXml(xml);
  const cardResult = parsedXml.ok
    ? checkCardStructure(parsedXml.document)
    : {
        issues: [],
        metadata: {
          cardCount: 0,
          cardsWithGeometryCount: 0,
          incompleteCardCount: 0,
          missingGeometryCount: 0,
          overlapCount: 0
        }
      };
  const issues = parsedXml.ok
    ? [...checkDrawioStructure(parsedXml.document), ...cardResult.issues]
    : [parsedXml.issue];

  return createGateVerdict({
    gateId: D02_POST_GENERATION_GATE_ID,
    gateName: "D02 Service Blueprint Post-generation Gate",
    issues,
    score: createScoreBreakdown(issues),
    metadata: {
      artifactType: "service-blueprint",
      xmlLength: xml.length,
      parser: "DOMParser",
      mutatesXml: false,
      ...cardResult.metadata
    }
  });
}

