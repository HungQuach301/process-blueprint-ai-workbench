"use client";

import { useEffect, useRef, useState } from "react";
import NavigatedViewer from "bpmn-js/lib/NavigatedViewer";
import { SessionFrame } from "@/components/layout/SessionFrame";

type BpmnPreviewProps = {
  xml: string;
};

type CanvasService = {
  zoom: (mode: "fit-viewport") => void;
};

export function BpmnPreview({ xml }: BpmnPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<NavigatedViewer | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

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

        viewer.get<CanvasService>("canvas").zoom("fit-viewport");
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

    viewer.get<CanvasService>("canvas").zoom("fit-viewport");
  }

  return (
    <SessionFrame
      actions={
        <button
          className="w-fit rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={fitToViewport}
          type="button"
        >
          Fit to viewport
        </button>
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

      <div className="h-[560px] w-full bg-white" ref={containerRef} />
    </SessionFrame>
  );
}
