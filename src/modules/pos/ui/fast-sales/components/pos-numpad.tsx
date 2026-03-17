"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  mode: "barcode" | "quantity" | "amount";
  buffer: string;
  onModeChange: (mode: "barcode" | "quantity" | "amount") => void;
  onKey: (key: string) => void;
};

const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", "00", ","];

export function PosNumpad(props: Props) {
  return (
    <div className="space-y-1.5 rounded-lg border border-slate-300 bg-white p-1.5">
      <div className="grid grid-cols-3 gap-2">
        <Button
          size="sm"
          className={`h-[clamp(2.15rem,3.9vh,2.65rem)] text-sm ${props.mode === "barcode" ? "bg-sky-600 text-white" : "bg-slate-200 text-slate-800 hover:bg-slate-300"}`}
          onClick={() => props.onModeChange("barcode")}
        >
          Barkod
        </Button>
        <Button
          size="sm"
          className={`h-[clamp(2.15rem,3.9vh,2.65rem)] text-sm ${props.mode === "quantity" ? "bg-sky-600 text-white" : "bg-slate-200 text-slate-800 hover:bg-slate-300"}`}
          onClick={() => props.onModeChange("quantity")}
        >
          Miktar
        </Button>
        <Button
          size="sm"
          className={`h-[clamp(2.15rem,3.9vh,2.65rem)] text-sm ${props.mode === "amount" ? "bg-sky-600 text-white" : "bg-slate-200 text-slate-800 hover:bg-slate-300"}`}
          onClick={() => props.onModeChange("amount")}
        >
          Tutar
        </Button>
      </div>

      <div className="rounded-md border border-slate-300 bg-slate-100 px-2 py-1.5 text-right font-mono text-[clamp(1.2rem,3.1vh,1.55rem)] font-black text-slate-900">
        {props.buffer || "0"}
      </div>

      <div className="grid grid-cols-4 gap-1">
        {keys.slice(0, 3).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => props.onKey(key)}
            className="h-[clamp(2.35rem,4.8vh,3.15rem)] rounded-md border border-slate-300 bg-slate-100 text-[clamp(1.1rem,2.8vh,1.55rem)] font-black text-slate-900 hover:bg-slate-200 active:scale-[0.98]"
          >
            {key}
          </button>
        ))}
        <button
          type="button"
          onClick={() => props.onKey("clear")}
          className="h-[clamp(2.35rem,4.8vh,3.15rem)] rounded-md border border-rose-200 bg-rose-100 text-[clamp(1.1rem,2.8vh,1.55rem)] font-black text-rose-700 hover:bg-rose-200"
        >
          C
        </button>
        {keys.slice(3, 6).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => props.onKey(key)}
            className="h-[clamp(2.35rem,4.8vh,3.15rem)] rounded-md border border-slate-300 bg-slate-100 text-[clamp(1.1rem,2.8vh,1.55rem)] font-black text-slate-900 hover:bg-slate-200 active:scale-[0.98]"
          >
            {key}
          </button>
        ))}
        <button
          type="button"
          onClick={() => props.onModeChange("quantity")}
          className={`h-[clamp(2.35rem,4.8vh,3.15rem)] rounded-md border text-sm font-black ${
            props.mode === "quantity"
              ? "border-sky-500 bg-sky-100 text-sky-800"
              : "border-slate-300 bg-slate-200 text-slate-700 hover:bg-slate-300"
          }`}
        >
          Mktr
        </button>
        {keys.slice(6, 9).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => props.onKey(key)}
            className="h-[clamp(2.35rem,4.8vh,3.15rem)] rounded-md border border-slate-300 bg-slate-100 text-[clamp(1.1rem,2.8vh,1.55rem)] font-black text-slate-900 hover:bg-slate-200 active:scale-[0.98]"
          >
            {key}
          </button>
        ))}
        <button
          type="button"
          onClick={() => props.onKey("enter")}
          className="row-span-2 rounded-md border border-sky-700 bg-sky-600 text-[clamp(0.95rem,2.1vh,1.2rem)] font-black text-white hover:bg-sky-500"
        >
          Enter
        </button>
        {keys.slice(9, 12).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => props.onKey(key)}
            className="h-[clamp(2.35rem,4.8vh,3.15rem)] rounded-md border border-slate-300 bg-slate-100 text-[clamp(1.1rem,2.8vh,1.55rem)] font-black text-slate-900 hover:bg-slate-200 active:scale-[0.98]"
          >
            {key}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" variant="secondary" className="h-[clamp(2.15rem,3.9vh,2.65rem)] text-sm" onClick={() => props.onKey("backspace")}>
          Sil
        </Button>
        <Button size="sm" variant="secondary" className="h-[clamp(2.15rem,3.9vh,2.65rem)] text-sm" onClick={() => props.onKey("clear")}>
          Temizle
        </Button>
      </div>
    </div>
  );
}
