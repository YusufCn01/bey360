"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import type { SaleTabSnapshot } from "@/modules/pos/ui/fast-sales/types";

type Props = {
  tabs: SaleTabSnapshot[];
  activeTabId: string;
  onSelect: (tabId: string) => void;
  onCreate: () => void;
};

export function PosSaleTabs(props: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {props.tabs.map((tab) => (
        <Button
          key={tab.id}
          size="sm"
          onClick={() => props.onSelect(tab.id)}
          className={`h-10 min-w-[108px] border ${
            props.activeTabId === tab.id
              ? "border-lime-300 bg-lime-400 text-emerald-950 hover:bg-lime-300"
              : "border-emerald-200/60 bg-emerald-900 text-white hover:bg-emerald-800"
          }`}
        >
          {tab.label}
        </Button>
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

