"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  busy: boolean;
  torchEnabled: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onClose: () => void;
  onToggleTorch: () => void;
};

export function PosCameraScannerModal(props: Props) {
  const { open, busy, torchEnabled, videoRef, onClose, onToggleTorch } = props;

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-3">
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-white/20 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/20 px-3 py-2 text-white">
          <div>
            <p className="text-base font-black">Kamera Barkod Okuma</p>
            <p className="text-xs text-slate-300">Barkodu kare içine getiriniz.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={props.onClose}>
            Kapat
          </Button>
        </div>
        <div className="relative">
          <video ref={videoRef} autoPlay playsInline muted className="h-[60vh] w-full bg-black object-cover sm:h-[420px]" />
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="h-48 w-48 rounded-xl border-4 border-emerald-300/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 px-3 py-3">
          <Button variant="secondary" onClick={onToggleTorch}>
            {torchEnabled ? "Feneri Kapat" : "Feneri Aç"}
          </Button>
          <Button onClick={onClose} disabled={busy}>
            {busy ? "Hazırlanıyor..." : "Tarayıcıyı Kapat"}
          </Button>
        </div>
      </div>
    </div>
  );
}
