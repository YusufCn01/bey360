"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";

type SupplierRow = {
  id: string;
  code: string | null;
  name: string | null;
  status: string;
  payload: {
    taxNumber: string;
    phone: string;
  };
};

const columns: ColumnDef<SupplierRow>[] = [
  { accessorKey: "code", header: "Tedarikçi Kodu" },
  { accessorKey: "name", header: "Tedarikçi Ünvanı" },
  {
    id: "taxNumber",
    header: "Vergi No",
    cell: ({ row }) => row.original.payload.taxNumber ?? "-",
  },
  {
    id: "phone",
    header: "Telefon",
    cell: ({ row }) => row.original.payload.phone ?? "-",
  },
  { accessorKey: "status", header: "Durum" },
];

export function SuppliersClient() {
  const [rows, setRows] = React.useState<SupplierRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [taxNumber, setTaxNumber] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [riskLimit, setRiskLimit] = React.useState("0");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tenant/suppliers");
      const body = (await response.json()) as { success: boolean; data: SupplierRow[]; error: { message: string } };
      if (!response.ok || !body.success) {
        throw new Error(body.error.message ?? "Tedarikçi listesi alınamadı.");
      }
      setRows(body.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tedarikçi listesi alınamadı.");
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
      const response = await fetch("/api/tenant/suppliers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          taxNumber: taxNumber || undefined,
          phone: phone || undefined,
          riskLimit: Number(riskLimit),
        }),
      });
      const body = (await response.json()) as { success: boolean; error: { message: string } };
      if (!response.ok || !body.success) {
        throw new Error(body.error.message ?? "Tedarikçi kaydedilemedi.");
      }

      setName("");
      setTaxNumber("");
      setPhone("");
      setRiskLimit("0");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tedarikçi kaydedilemedi.");
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-5">
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-700">Tedarikçi Ünvanı</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Örn: Örnek Tedarik A.Ş."
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Vergi No</label>
          <input
            value={taxNumber}
            onChange={(event) => setTaxNumber(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Telefon</label>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Risk Limiti</label>
          <input
            value={riskLimit}
            onChange={(event) => setRiskLimit(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            type="number"
            min={0}
            step="0.01"
          />
        </div>
        <div className="md:col-span-5">
          <Button type="submit">Tedarikçi Ekle</Button>
        </div>
      </form>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">Tedarikçiler yükleniyor...</p> : null}
      {!loading ? (
        <DataTable columns={columns} data={rows} globalFilterPlaceholder="Tedarikçi kodu veya ünvanı ara..." />
      ) : null}
    </div>
  );
}
