"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";

type CustomerRow = {
  id: string;
  code: string | null;
  name: string | null;
  status: string;
  payload?: {
    taxNumber?: string;
    phone?: string;
    email?: string;
    group?: string;
  };
};

type CustomerEnvelope = {
  success: boolean;
  data?: CustomerRow[];
  error?: { message?: string };
};

const columns: ColumnDef<CustomerRow>[] = [
  { accessorKey: "code", header: "Müşteri Kodu" },
  { accessorKey: "name", header: "Müşteri Ünvanı" },
  {
    id: "taxNumber",
    header: "Vergi No / TCKN",
    cell: ({ row }) => row.original.payload?.taxNumber ?? "-",
  },
  {
    id: "phone",
    header: "Telefon",
    cell: ({ row }) => row.original.payload?.phone ?? "-",
  },
  {
    id: "email",
    header: "E-posta",
    cell: ({ row }) => row.original.payload?.email ?? "-",
  },
  {
    id: "group",
    header: "Grup",
    cell: ({ row }) => row.original.payload?.group ?? "-",
  },
  { accessorKey: "status", header: "Durum" },
];

export function CustomersClient() {
  const [rows, setRows] = React.useState<CustomerRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tenant/customers?limit=300", { cache: "no-store" });
      const body = (await response.json()) as CustomerEnvelope;
      if (!response.ok || !body.success || !body.data) {
        throw new Error(body.error?.message ?? "Müşteri listesi alınamadı.");
      }
      setRows(body.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Müşteri listesi alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-2">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/panel/musteriler/yeni-musteri-karti"
            className="rounded-md border border-cyan-300/40 bg-cyan-800/80 px-3 py-2 text-sm font-semibold text-white"
          >
            Yeni Müşteri Kartı
          </Link>
          <Button variant="secondary" onClick={() => void load()} disabled={loading}>
            Yenile
          </Button>
        </div>
        <p className="text-xs font-semibold text-[color:var(--mx-text-muted)]">Toplam kayıt: {rows.length}</p>
      </div>

      {error ? <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {loading ? <p className="text-sm text-[color:var(--mx-text-muted)]">Müşteriler yükleniyor...</p> : null}
      {!loading ? <DataTable columns={columns} data={rows} globalFilterPlaceholder="Müşteri kodu, ünvanı veya telefon ara..." /> : null}
    </div>
  );
}
