"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";

type PaymentLinkRow = {
  id: string;
  code: string | null;
  name: string | null;
  status: string;
  payload: {
    amount: number;
    currency: string;
    url: string;
  };
};

const columns: ColumnDef<PaymentLinkRow>[] = [
  { accessorKey: "code", header: "Referans" },
  { accessorKey: "name", header: "Müşteri Referansı" },
  {
    id: "amount",
    header: "Tutar",
    cell: ({ row }) => `${row.original.payload.amount ?? 0} ${row.original.payload.currency ?? "TRY"}`,
  },
  { accessorKey: "status", header: "Durum" },
  {
    id: "url",
    header: "Ödeme URL",
    cell: ({ row }) => {
      const url = row.original.payload.url;
      return url ? (
        <a className="text-sky-700 underline" href={url} target="_blank" rel="noreferrer">
          Link
        </a>
      ) : (
        "-"
      );
    },
  },
];

export function PaymentLinksClient() {
  const [rows, setRows] = React.useState<PaymentLinkRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [customerReference, setCustomerReference] = React.useState("");
  const [customerCode, setCustomerCode] = React.useState("");
  const [amount, setAmount] = React.useState("0");
  const [description, setDescription] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tenant/payment-links?limit=200");
      const body = (await response.json()) as { success: boolean; data: PaymentLinkRow[]; error: { message: string } };
      if (!response.ok || !body.success) {
        throw new Error(body.error.message ?? "Ödeme linkleri alınamadı.");
      }
      setRows(body.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ödeme linkleri alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      const response = await fetch("/api/tenant/payment-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          providerCode: "mock-payment",
          amount: Number(amount),
          currency: "TRY",
          customerReference,
          customerCode: customerCode || undefined,
          customerName: customerReference,
          description,
        }),
      });

      const body = (await response.json()) as { success: boolean; data: { url: string }; error: { message: string } };
      if (!response.ok || !body.success) {
        throw new Error(body.error.message ?? "Ödeme linki oluşturulamadı.");
      }

      setCustomerReference("");
      setCustomerCode("");
      setAmount("0");
      setDescription("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ödeme linki oluşturulamadı.");
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-5">
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-700">Müşteri Referansı</label>
          <input
            value={customerReference}
            onChange={(event) => setCustomerReference(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Örn: Sipariş 2026-001"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Cari Kodu</label>
          <input
            value={customerCode}
            onChange={(event) => setCustomerCode(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="MUS-..."
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Tutar</label>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            type="number"
            min={0}
            step="0.01"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Açıklama</label>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
        </div>
        <div className="md:col-span-5">
          <Button type="submit">Ödeme Linki Oluştur</Button>
        </div>
      </form>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">Ödeme linkleri yükleniyor...</p> : null}
      {!loading ? <DataTable columns={columns} data={rows} globalFilterPlaceholder="Referans veya müşteri ara..." /> : null}
    </div>
  );
}
