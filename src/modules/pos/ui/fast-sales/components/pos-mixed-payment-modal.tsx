"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { formatTry } from "@/lib/format/currency";
import type { MixedPaymentDraft } from "@/modules/pos/ui/fast-sales/types";

type Props = {
  open: boolean;
  totalAmount: number;
  rows: MixedPaymentDraft[];
  busy: boolean;
  onClose: () => void;
  onAddRow: () => void;
  onRemoveRow: (id: string) => void;
  onChangeRow: (id: string, field: "method" | "amount" | "reference", value: string) => void;
  onSubmit: () => void;
  onApplyCashExact: () => void;
  onApplyCardExact: () => void;
};

function parseAmount(value: string): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function PosMixedPaymentModal(props: Props) {
  if (!props.open) {
    return null;
  }

  const paidTotal = props.rows.reduce((sum, row) => sum + parseAmount(row.amount), 0);
  const remaining = Math.round((props.totalAmount - paidTotal) * 100) / 100;
  const change = Math.max(0, Math.round((paidTotal - props.totalAmount) * 100) / 100);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-3">
      <div className="w-full max-w-3xl rounded-xl border border-[color:var(--mx-border)] bg-[color:var(--mx-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[color:var(--mx-border)] px-4 py-3">
          <div>
            <p className="text-base font-black">Karma Ödeme</p>
            <p className="text-xs text-[color:var(--mx-text-muted)]">Nakit, kart, havale ve cari kalemlerini parçalı girin.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={props.onClose}>
            Kapat
          </Button>
        </div>

        <div className="space-y-3 p-4">
          <div className="grid gap-2 md:grid-cols-4">
            <div className="rounded-lg border border-[color:var(--mx-border)] bg-white px-3 py-2 text-sm">
              <p className="text-xs text-[color:var(--mx-text-muted)]">Toplam Tutar</p>
              <p className="font-black">{formatTry(props.totalAmount)}</p>
            </div>
            <div className="rounded-lg border border-[color:var(--mx-border)] bg-white px-3 py-2 text-sm">
              <p className="text-xs text-[color:var(--mx-text-muted)]">Tahsil Edilen</p>
              <p className="font-black text-emerald-700">{formatTry(paidTotal)}</p>
            </div>
            <div className="rounded-lg border border-[color:var(--mx-border)] bg-white px-3 py-2 text-sm">
              <p className="text-xs text-[color:var(--mx-text-muted)]">Kalan</p>
              <p className={`font-black ${remaining > 0 ? "text-rose-700" : "text-emerald-700"}`}>{formatTry(Math.max(0, remaining))}</p>
            </div>
            <div className="rounded-lg border border-[color:var(--mx-border)] bg-white px-3 py-2 text-sm">
              <p className="text-xs text-[color:var(--mx-text-muted)]">Para Üstü</p>
              <p className="font-black text-indigo-700">{formatTry(change)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={props.onApplyCashExact}>
              Tam Tutar Nakit
            </Button>
            <Button variant="secondary" onClick={props.onApplyCardExact}>
              Tam Tutar Kart
            </Button>
            <Button variant="secondary" onClick={props.onAddRow}>
              Ödeme Satırı Ekle
            </Button>
          </div>

          <div className="space-y-2">
            {props.rows.map((row) => {
              const currentRowAmount = parseAmount(row.amount);
              const remainingForRow = Math.max(0, Math.round((props.totalAmount - (paidTotal - currentRowAmount)) * 100) / 100);

              return (
                <div key={row.id} className="grid gap-2 rounded-lg border border-[color:var(--mx-border)] bg-white p-2 md:grid-cols-[160px_150px_1fr_auto_auto]">
                  <select
                    value={row.method}
                    onChange={(event) => props.onChangeRow(row.id, "method", event.target.value)}
                    className="h-10 rounded border border-[color:var(--mx-border)] px-2"
                  >
                    <option value="nakit">Nakit</option>
                    <option value="kart">Kart</option>
                    <option value="havale_eft">Havale/EFT</option>
                    <option value="cari">Cariye Yaz</option>
                    <option value="cek">Alışveriş Çeki</option>
                    <option value="dekont">Dekont</option>
                  </select>
                  <input
                    value={row.amount}
                    onChange={(event) => props.onChangeRow(row.id, "amount", event.target.value)}
                    inputMode="decimal"
                    placeholder="Tutar"
                    className="h-10 rounded border border-[color:var(--mx-border)] px-2"
                  />
                  <input
                    value={row.reference}
                    onChange={(event) => props.onChangeRow(row.id, "reference", event.target.value)}
                    placeholder="Slip / Referans / Not"
                    className="h-10 rounded border border-[color:var(--mx-border)] px-2"
                  />
                  <Button size="sm" variant="secondary" onClick={() => props.onChangeRow(row.id, "amount", remainingForRow.toFixed(2))}>
                    Kalanı Doldur
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => props.onRemoveRow(row.id)} disabled={props.rows.length <= 1}>
                    Sil
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={props.onSubmit} disabled={props.busy}>
              {props.busy ? "İşleniyor..." : "Satışı Tamamla"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
