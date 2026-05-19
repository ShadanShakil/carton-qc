"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "./ui/Button";
import { Sparkles, Loader2 } from "lucide-react";

export type Point = { x: number; y: number };

interface ScannerUIProps {
  file: File;
  onConfirm: (corners: Point[]) => void;
  onCancel: () => void;
}

const POINT_RADIUS = 8;

export function ScannerUI({ file, onConfirm, onCancel }: ScannerUIProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [corners, setCorners] = useState<Point[]>([
    { x: 50, y: 50 },
    { x: 250, y: 50 },
    { x: 250, y: 250 },
    { x: 50, y: 250 },
  ]);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [detecting, setDetecting] = useState(false);
  // Track the display dimensions of the canvas (CSS pixels)
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });

  async function handleAutoDetect() {
    setDetecting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/prints/detect-corners", {
        method: "POST",
        body: fd,
      });
      if (res.ok) {
        const { corners: newCorners } = await res.json();
        if (newCorners) setCorners(newCorners);
      }
    } catch (err) {
      console.error("Auto-detect failed:", err);
    } finally {
      setDetecting(false);
    }
  }

  // Load image
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImage(img);
      // Initialize corners to 10% padding inside the image boundaries
      const paddingX = img.width * 0.1;
      const paddingY = img.height * 0.1;
      setCorners([
        { x: paddingX, y: paddingY },
        { x: img.width - paddingX, y: paddingY },
        { x: img.width - paddingX, y: img.height - paddingY },
        { x: paddingX, y: img.height - paddingY },
      ]);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Calculate display size whenever image or container changes
  const updateDisplaySize = useCallback(() => {
    const container = containerRef.current;
    if (!container || !image) return;
    
    const containerW = container.clientWidth;
    const maxH = window.innerHeight * 0.6; // 60vh
    
    const imgAspect = image.width / image.height;
    
    let dw = containerW;
    let dh = containerW / imgAspect;
    
    if (dh > maxH) {
      dh = maxH;
      dw = maxH * imgAspect;
    }
    
    setDisplaySize({ width: Math.round(dw), height: Math.round(dh) });
  }, [image]);

  useEffect(() => {
    updateDisplaySize();
    window.addEventListener("resize", updateDisplaySize);
    return () => window.removeEventListener("resize", updateDisplaySize);
  }, [updateDisplaySize]);

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !image || !displaySize.width) return;

    // Set internal resolution to match image
    canvas.width = image.width;
    canvas.height = image.height;

    // Draw image
    ctx.drawImage(image, 0, 0);

    // Draw dimming overlay outside the crop area using 'evenodd' rule
    ctx.beginPath();
    ctx.rect(0, 0, image.width, image.height);
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fill("evenodd");

    // Draw polygon stroke
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();
    ctx.lineWidth = Math.max(2, image.width / 200);
    ctx.strokeStyle = "#10b981";
    ctx.stroke();
    
    ctx.fillStyle = "rgba(16, 185, 129, 0.1)";
    ctx.fill();

    // Draw corner handles
    const handleRadius = Math.max(POINT_RADIUS, image.width / 120);
    corners.forEach((pt, i) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, handleRadius, 0, 2 * Math.PI);
      ctx.fillStyle = i === draggingIdx ? "#059669" : "#10b981";
      ctx.fill();
      ctx.lineWidth = handleRadius / 4;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
    });
  }, [image, corners, draggingIdx, displaySize]);

  // Pointer → image coordinate mapping. 
  // We set the canvas CSS width/height explicitly so there's no letterboxing 
  // and the mapping is a simple ratio.
  const getPointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Since we explicitly set width/height via style (no object-contain), 
    // the canvas content fills the entire rect.
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pos = getPointerPos(e);
    const hitRadius = Math.max(25, image!.width / 20);
    
    const hitIdx = corners.findIndex(
      (pt) => Math.hypot(pt.x - pos.x, pt.y - pos.y) < hitRadius
    );
    if (hitIdx !== -1) {
      setDraggingIdx(hitIdx);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggingIdx === null) return;
    const pos = getPointerPos(e);
    
    pos.x = Math.max(0, Math.min(pos.x, image?.width ?? 0));
    pos.y = Math.max(0, Math.min(pos.y, image?.height ?? 0));

    const newCorners = [...corners];
    newCorners[draggingIdx] = pos;
    setCorners(newCorners);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setDraggingIdx(null);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  if (!image) {
    return <div className="flex h-64 items-center justify-center">Loading image...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm font-medium text-slate-700 text-center">
        Drag the corners to match the boundaries of the carton exactly.
      </div>
      
      <div 
        ref={containerRef} 
        className="relative mx-auto w-full overflow-hidden rounded-lg bg-slate-900 border border-slate-200 flex items-center justify-center"
        style={{ touchAction: "none", maxHeight: "60vh" }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="cursor-crosshair"
          style={{ 
            width: displaySize.width || "100%", 
            height: displaySize.height || "auto",
            display: "block",
          }}
        />
      </div>

      <div className="flex justify-between gap-4 mt-2">
        <Button variant="secondary" onClick={onCancel} disabled={detecting}>
          Cancel
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            onClick={handleAutoDetect} 
            disabled={detecting}
            iconLeft={detecting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          >
            {detecting ? "Detecting..." : "Auto-Detect"}
          </Button>
          <Button variant="success" onClick={() => onConfirm(corners)} disabled={detecting}>
            Confirm Crop
          </Button>
        </div>
      </div>
    </div>
  );
}
