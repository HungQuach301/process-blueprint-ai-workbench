"use client";

import { useEffect, useRef, useState } from "react";
import NavigatedViewer from "bpmn-js/lib/NavigatedViewer";
import { SessionFrame } from "@/components/layout/SessionFrame";

type BpmnPreviewProps = {
  xml: string;
};

type CanvasService = {
  zoom: (mode?: "fit-viewport" | number) => number | void;
};

export function BpmnPreview({ xml }: BpmnPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<NavigatedViewer | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
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
            ? `Không thể hiển thị BPMN: ${error.message}`
            : "Không thể hiển thị BPMN. XML có thể chưa hợp lệ."
        );
      });

    return () => {
      isCurrent = false;
    };
  }, [xml]);

  function fitToViewport() {
    const viewer = viewerRef.current;

    if (!viewer || !xml.trim()) {
      setErrorMessage("Chưa có BPMN XML để fit vào khung nhìn.");
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
      setErrorMessage("Chưa có BPMN XML để zoom.");
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

  return (
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
          <button
            className="btn btn-secondary"
            onClick={() => zoomBy(0.1)}
            type="button"
          >
            Zoom +
          </button>
        </div>
      }
      description="Preview chỉ đọc từ XML đã generate. Chưa có chỉnh sửa trực quan ở bước này."
      title="Xem trước BPMN"
    >
      <p className="border-b border-slate-200 px-4 py-3 text-sm font-medium uppercase text-slate-500">
        BPMN Preview
      </p>
      {errorMessage ? (
        <p className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <div className="w-full max-w-full min-w-0 overflow-x-auto bg-white">
        <div className="h-[560px] min-w-[960px]" ref={containerRef} />
      </div>
    </SessionFrame>
  );
}
