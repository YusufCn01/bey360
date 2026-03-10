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
    <div className="space-y-2 rounded-xl border border-[color:var(--mx-border)] bg-white p-2">
      <div className="grid grid-cols-3 gap-2">
        <Button
          size="sm"
          className={`h-10 ${props.mode === "barcode" ? "bg-lime-400 text-emerald-950" : "bg-slate-700 text-white"}`}
          onClick={() => props.onModeChange("barcode")}
        >
          Barkod
        </Button>
        <Button
          size="sm"
          className={`h-10 ${props.mode === "quantity" ? "bg-lime-400 text-emerald-950" : "bg-slate-700 text-white"}`}
          onClick={() => props.onModeChange("quantity")}
        >
          Miktar
        </Button>
        <Button
          size="sm"
          className={`h-10 ${props.mode === "amount" ? "bg-lime-400 text-emerald-950" : "bg-slate-700 text-white"}`}
          onClick={() => props.onModeChange("amount")}
        >
          Tutar
        </Button>
      </div>

      <div className="rounded-md border border-[color:var(--mx-border)] bg-slate-900 px-2 py-2 text-right font-mono text-xl font-black text-lime-300">
        {props.buffer || "0"}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => props.onKey(key)}
            className="h-12 rounded-md border border-slate-300 bg-slate-50 text-lg font-bold text-slate-900 hover:bg-slate-100 active:scale-[0.98]"
          >
            {key}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button size="sm" variant="secondary" className="h-11" onClick={() => props.onKey("backspace")}>
          Sil
        </Button>
        <Button size="sm" variant="secondary" className="h-11" onClick={() => props.onKey("clear")}>
          Temizle
        </Button>
        <Button size="sm" className="h-11 bg-emerald-700 text-white hover:bg-emerald-600" onClick={() => props.onKey("enter")}>
          Enter
        </Button>
      </div>
    </div>
  );
}

