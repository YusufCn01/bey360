"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import type { SaleTabSnapshot } from "@/modules/pos/ui/fast-sales/types";

type Props = {
  tabs: SaleTabSnapshot[];
  activeTabId: string;
  onSelect: (tabId: string) => void;
  onCreate: () => void;
  onRename: (tabId: string) => void;
  onClose: (tabId: string) => void;
  canCloseTabs: boolean;
  compact?: boolean;
  minimal?: boolean;
};

export function PosSaleTabs(props: Props) {
  const compact = props.compact ?? false;
  const minimal = props.minimal ?? false;
  const activeTab = props.tabs.find((tab) => tab.id === props.activeTabId) ?? props.tabs[0];

  if (minimal && activeTab) {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-2 rounded-xl border border-emerald-200/60 bg-emerald-950/95 p-2 text-white">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-200/80">Aktif Satış</p>
          <select
            value={props.activeTabId}
            onChange={(event) => props.onSelect(event.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-emerald-200/30 bg-emerald-900 px-3 text-sm font-semibold text-white outline-none"
          >
            {props.tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => props.onRename(activeTab.id)}
          className="h-10 border border-emerald-200/60 bg-emerald-800 px-3 text-sm text-white hover:bg-emerald-700"
          title="Sekme adını değiştir"
        >
          Ad
        </Button>
        <Button
          size="sm"
          onClick={props.onCreate}
          className="h-10 border border-emerald-200/60 bg-emerald-700 px-3 text-sm text-white hover:bg-emerald-600"
        >
          + Yeni
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => props.onClose(activeTab.id)}
          disabled={!props.canCloseTabs}
          className="h-10 border border-emerald-200/60 bg-emerald-800 px-3 text-sm text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
          title={props.canCloseTabs ? "Sekmeyi kapat" : "En az bir satış sekmesi açık kalmalı"}
        >
          X
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {props.tabs.map((tab) => (
        <div key={tab.id} className="inline-flex items-center">
          <Button
            size="sm"
            onClick={() => props.onSelect(tab.id)}
            onDoubleClick={() => props.onRename(tab.id)}
            className={`${compact ? "h-10 min-w-[108px] text-sm" : "h-12 min-w-[128px] text-base"} rounded-r-none border-r-0 ${
              props.activeTabId === tab.id
                ? "border-lime-300 bg-lime-400 text-emerald-950 hover:bg-lime-300"
                : "border-emerald-200/60 bg-emerald-900 text-white hover:bg-emerald-800"
            }`}
            title="Çift tıklayıp sekme adını değiştirebilirsiniz"
          >
            {tab.label}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => props.onRename(tab.id)}
            className={`${compact ? "h-10 px-2.5 text-sm" : "h-12 px-3 text-base"} rounded-none border border-emerald-200/60 bg-emerald-800 text-white hover:bg-emerald-700`}
            title="Sekme adını değiştir"
            aria-label={`${tab.label} adını değiştir`}
          >
            Ad
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => props.onClose(tab.id)}
            disabled={!props.canCloseTabs}
            className={`${compact ? "h-10 px-2.5 text-sm" : "h-12 px-3 text-base"} rounded-l-none border border-emerald-200/60 bg-emerald-800 text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40`}
            title={props.canCloseTabs ? "Sekmeyi kapat" : "En az bir satış sekmesi açık kalmalı"}
            aria-label={`${tab.label} sekmesini kapat`}
          >
            X
          </Button>
        </div>
      ))}
      <Button
        size="sm"
        onClick={props.onCreate}
        className={`${compact ? "h-10 px-3 text-sm" : "h-12 px-4 text-base"} border border-emerald-200/60 bg-emerald-700 text-white hover:bg-emerald-600`}
      >
        + Yeni Satış
      </Button>
    </div>
  );
}
