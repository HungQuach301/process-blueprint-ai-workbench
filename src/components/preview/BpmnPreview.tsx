"use client";

import { useEffect, useRef, useState } from "react";
import NavigatedViewer from "bpmn-js/lib/NavigatedViewer";
import { SessionFrame } from "@/components/layout/SessionFrame";

type BpmnPreviewProps = {
  gateStatus?: string;
  templateName?: string;
  xml: string;
};

type CanvasService = {
  zoom: (mode?: "fit-viewport" | number) => number | void;
};

export function BpmnPreview({ gateStatus, templateName, xml }: BpmnPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<NavigatedViewer | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const viewer = new NavigatedViewer({
      container: containerRef.current
    });

    viewerRef.current = viewer;

    return () => {
      viewer.destroy();
      viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;

    if (!viewer) {
      return;
    }

    if (!xml.trim()) {
      viewer.clear();
      setErrorMessage("");
      return;
    }

    let isCurrent = true;

    viewer
      .importXML(xml)
      .then(() => {
        if (!isCurrent) {
          return;
        }

        const nextZoom = viewer.get<CanvasService>("canvas").zoom("fit-viewport");
        if (typeof nextZoom === "number") {
          setZoomLevel(nextZoom);
        }
        setErrorMessage("");
      })
      .catch((error: unknown) => {
        if (!isCurrent) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? `Cannot display BPMN: ${error.message}`
            : "Cannot display BPMN. The XML may be invalid."
        );
      });

    return () => {
      isCurrent = false;
    };
  }, [xml]);

  useEffect(() => {
    if (!isExpanded || !xml.trim()) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      fitToViewport();
    }, 120);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isExpanded, xml]);

  function fitToViewport() {
    const viewer = viewerRef.current;

    if (!viewer || !xml.trim()) {
      setErrorMessage("Generate BPMN XML before fitting the preview.");
      return;
    }

    const nextZoom = viewer.get<CanvasService>("canvas").zoom("fit-viewport");
    if (typeof nextZoom === "number") {
      setZoomLevel(nextZoom);
    }
  }

  function zoomBy(delta: number) {
    const viewer = viewerRef.current;

    if (!viewer || !xml.trim()) {
      setErrorMessage("Generate BPMN XML before zooming the preview.");
      return;
    }

    const canvas = viewer.get<CanvasService>("canvas");
    const currentZoom = canvas.zoom();
    const nextZoom = Math.min(
      2,
      Math.max(0.25, (typeof currentZoom === "number" ? currentZoom : zoomLevel) + delta)
    );

    canvas.zoom(nextZoom);
    setZoomLevel(nextZoom);
  }

  const previewChromeClass = isExpanded
    ? "fixed inset-3 z-50 overflow-hidden rounded border border-slate-300 bg-white shadow-2xl"
    : "";
  const canvasHeightClass = isExpanded
    ? "h-[calc(100vh-220px)] min-h-[420px] min-w-[960px]"
    : "h-[620px] min-w-[960px]";

  return (
    <div className={previewChromeClass}>
      {isExpanded ? <div className="fixed inset-0 -z-10 bg-slate-950/40" /> : null}
      <SessionFrame
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="btn btn-secondary"
              onClick={fitToViewport}
              type="button"
            >
              Fit
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => zoomBy(-0.1)}
              type="button"
            >
              Zoom -
            </button>
            <span className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              className="btn btn-secondary"
              onClick={() => zoomBy(0.1)}
              type="button"
            >
              Zoom +
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setIsExpanded((currentValue) => !currentValue)}
              type="button"
            >
              {isExpanded ? "Collapse" : "Expand"}
            </button>
          </div>
        }
        description="Read-only preview from generated XML. Use Fit or Expand to inspect wide BPMN diagrams during review."
        title="BPMN Preview"
      >
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium uppercase text-slate-500">
              Visual preview
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="rounded border border-slate-200 bg-white px-2 py-1">
                Template: {templateName?.trim() || "Not selected"}
              </span>
              <span className="rounded border border-slate-200 bg-white px-2 py-1">
                Gate: {gateStatus?.trim() || "Not generated"}
              </span>
            </div>
          </div>
        </div>
        {errorMessage ? (
          <p className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="w-full max-w-full min-w-0 overflow-auto bg-white">
          <div className={canvasHeightClass} ref={containerRef} />
        </div>
      </SessionFrame>
    </div>
  );
}
