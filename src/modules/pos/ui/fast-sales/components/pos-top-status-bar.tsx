"use client";

import * as React from "react";
import { posText } from "@/modules/pos/ui/fast-sales/turkish-text-map";

type Props = {
  companyName: string;
  branchName: string;
  registerName: string;
  cashierName: string;
  activeTabLabel: string;
  customerName: string;
  currencyCode: string;
  connectionOnline: boolean;
  clock: Date;
};

function StatusBadge(props: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/15 bg-black/20 px-2 py-1">
      <p className="text-[10px] uppercase tracking-wide text-emerald-200">{props.label}</p>
      <p className="text-sm font-semibold text-white">{props.value}</p>
    </div>
  );
}

export function PosTopStatusBar(props: Props) {
  return (
    <div className="grid gap-2 lg:grid-cols-[1.4fr_1fr]">
      <div className="rounded-lg border border-white/15 bg-black/20 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-200">POS Yönetim Bilgisi</p>
        <p className="mt-1 text-lg font-black text-white">{props.companyName || "Firma Adı"}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <StatusBadge label={posText.top.branch} value={props.branchName || "MERKEZ"} />
          <StatusBadge label={posText.top.register} value={props.registerName || "Kasa"} />
          <StatusBadge label={posText.top.cashier} value={props.cashierName || "-"} />
          <StatusBadge label={posText.top.activeSale} value={props.activeTabLabel} />
          <StatusBadge label={posText.top.currency} value={props.currencyCode || "TRY"} />
        </div>
      </div>
      <div className="rounded-lg border border-white/15 bg-black/20 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-200">
          {props.connectionOnline ? posText.top.connectionOnline : posText.top.connectionOffline}
        </p>
        <p className={`mt-1 text-sm font-bold ${props.connectionOnline ? "text-lime-300" : "text-rose-300"}`}>
          {props.connectionOnline ? "Senkronizasyon Hazır" : "Çevrimdışı Mod"}
        </p>
        <p className="mt-2 text-xs text-emerald-100">
          {props.clock.toLocaleDateString("tr-TR")} {props.clock.toLocaleTimeString("tr-TR")}
        </p>
        <p className="mt-2 rounded-md border border-white/15 bg-white/10 px-2 py-1 text-xs text-emerald-100">
          {posText.top.customer}: <span className="font-semibold text-white">{props.customerName || "Perakende Müşteri"}</span>
        </p>
      </div>
    </div>
  );
}

