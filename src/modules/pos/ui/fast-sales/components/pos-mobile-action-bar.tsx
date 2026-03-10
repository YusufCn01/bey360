"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  onSearchFocus: () => void;
  onCameraScan: () => void;
  onCashSale: () => void;
  onCardSale: () => void;
  onMixedPayment: () => void;
  busy: boolean;
};

export function PosMobileActionBar(props: Props) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--mx-border)] bg-[color:var(--mx-surface)] p-2 md:hidden">
      <div className="grid grid-cols-5 gap-2">
        <Button size="sm" variant="secondary" className="h-12" onClick={props.onSearchFocus}>
          Ara
        </Button>
        <Button size="sm" className="h-12 bg-sky-700 text-white hover:bg-sky-600" onClick={props.onCameraScan}>
          Barkod
        </Button>
        <Button size="sm" className="h-12 bg-emerald-700 text-white hover:bg-emerald-600" onClick={props.onCashSale} disabled={props.busy}>
          Nakit
        </Button>
        <Button size="sm" className="h-12 bg-emerald-700 text-white hover:bg-emerald-600" onClick={props.onCardSale} disabled={props.busy}>
          Kart
        </Button>
        <Button size="sm" className="h-12 bg-indigo-700 text-white hover:bg-indigo-600" onClick={props.onMixedPayment} disabled={props.busy}>
          Karma
        </Button>
      </div>
    </div>
  );
}

