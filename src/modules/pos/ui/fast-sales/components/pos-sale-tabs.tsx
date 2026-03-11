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
};

export function PosSaleTabs(props: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {props.tabs.map((tab) => (
        <div key={tab.id} className="inline-flex items-center">
          <Button
            size="sm"
            onClick={() => props.onSelect(tab.id)}
            onDoubleClick={() => props.onRename(tab.id)}
            className={`h-10 min-w-[108px] rounded-r-none border-r-0 ${
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
            className="h-10 rounded-none border border-emerald-200/60 bg-emerald-800 px-2 text-white hover:bg-emerald-700"
            title="Sekme adını değiştir"
            aria-label={`${tab.label} adını değiştir`}
          >
            ✎
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => props.onClose(tab.id)}
            disabled={!props.canCloseTabs}
            className="h-10 rounded-l-none border border-emerald-200/60 bg-emerald-800 px-2 text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
            title={props.canCloseTabs ? "Sekmeyi kapat" : "En az bir satış sekmesi açık kalmalı"}
            aria-label={`${tab.label} sekmesini kapat`}
          >
            ×
          </Button>
        </div>
      ))}
      <Button
        size="sm"
        onClick={props.onCreate}
        className="h-10 border border-emerald-200/60 bg-emerald-700 text-white hover:bg-emerald-600"
      >
        + Yeni Satış
      </Button>
    </div>
  );
}
