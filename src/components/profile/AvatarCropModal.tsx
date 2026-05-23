import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
  busy?: boolean;
};

const OUTPUT_SIZE = 512;
const VIEWPORT = 320;

/**
 * Simple square cropper. The image is rendered inside a square viewport.
 * Users pan with pointer drag and scale with a slider. On confirm we
 * draw the visible region to a 512×512 canvas and return a Blob in the
 * same MIME type as the source.
 */
export function AvatarCropModal({ file, onCancel, onConfirm, busy }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [scale, setScale] = useState(1); // multiplier on top of "cover" baseline
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Reset when image dimensions are known.
  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [natural?.w, natural?.h]);

  if (!src) return null;

  // Baseline "cover" size: shortest side fills the viewport.
  const cover = natural ? VIEWPORT / Math.min(natural.w, natural.h) : 1;
  const drawW = natural ? natural.w * cover * scale : 0;
  const drawH = natural ? natural.h * cover * scale : 0;

  // Clamp offset so the image always covers the viewport.
  const clamp = (x: number, y: number) => {
    const maxX = Math.max(0, (drawW - VIEWPORT) / 2);
    const maxY = Math.max(0, (drawH - VIEWPORT) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setOffset(clamp(dragRef.current.ox + dx, dragRef.current.oy + dy));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const handleConfirm = () => {
    if (!natural) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Convert viewport-space transform back to image-space crop.
      // Source pixel-per-viewport-pixel ratio:
      const ratio = 1 / (cover * scale);
      const cropSize = VIEWPORT * ratio;
      // The image is centred then translated by `offset` in viewport space.
      // Crop top-left in image space:
      const sx = natural.w / 2 - offset.x * ratio - cropSize / 2;
      const sy = natural.h / 2 - offset.y * ratio - cropSize / 2;
      ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      canvas.toBlob(
        (blob) => {
          if (blob) onConfirm(blob);
        },
        file.type,
        0.92,
      );
    };
    img.src = src;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Crop your photo"
    >
      <div className="w-full max-w-md border border-foreground bg-background p-6">
        <p className="eyebrow">Frame your photo</p>
        <h2 className="mt-2 font-serif text-2xl">Crop to square</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          Drag to reposition. Zoom with the slider.
        </p>

        <div
          className="relative mx-auto mt-6 overflow-hidden border border-foreground bg-muted"
          style={{ width: VIEWPORT, height: VIEWPORT, touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <img
            src={src}
            draggable={false}
            onLoad={(e) => {
              const im = e.currentTarget;
              setNatural({ w: im.naturalWidth, h: im.naturalHeight });
            }}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: drawW || "auto",
              height: drawH || "auto",
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              userSelect: "none",
              pointerEvents: "none",
            }}
          />
        </div>

        <div className="mt-5">
          <label className="flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={scale}
              onChange={(e) => {
                const next = Number(e.target.value);
                setScale(next);
                // Re-clamp with new size
                setOffset((o) => {
                  const newDrawW = natural ? natural.w * cover * next : 0;
                  const newDrawH = natural ? natural.h * cover * next : 0;
                  const maxX = Math.max(0, (newDrawW - VIEWPORT) / 2);
                  const maxY = Math.max(0, (newDrawH - VIEWPORT) / 2);
                  return {
                    x: Math.min(maxX, Math.max(-maxX, o.x)),
                    y: Math.min(maxY, Math.max(-maxY, o.y)),
                  };
                });
              }}
              className="flex-1 accent-foreground"
            />
          </label>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
          >
            Cancel
          </button>
          <Button
            onClick={handleConfirm}
            disabled={busy || !natural}
            className="h-11 rounded-none px-5 text-[11px] uppercase tracking-[0.18em]"
          >
            {busy ? "Saving…" : "Save photo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
