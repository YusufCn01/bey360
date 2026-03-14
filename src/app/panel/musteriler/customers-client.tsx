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
  {
    accessorKey: "status",
    header: "Durum",
    cell: ({ row }) => (
      <span className="inline-flex rounded-full border border-cyan-400/40 bg-cyan-400/15 px-2 py-0.5 text-xs font-semibold text-cyan-200">
        {row.original.status}
      </span>
    ),
  },
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
      <div className="rounded-xl border border-[#1f3553] bg-[#0b1d35] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/panel/musteriler/yeni-musteri-karti"
              className="rounded-md border border-cyan-400/50 bg-cyan-500/15 px-3 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/25"
            >
              Yeni Müşteri Kartı
            </Link>
            <Link
              href="/panel/musteriler/cari-ekstre"
              className="rounded-md border border-[#29466b] bg-[#10243f] px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-[#153056]"
            >
              Cari Ekstre
            </Link>
            <Button variant="secondary" onClick={() => void load()} disabled={loading}>
              Yenile
            </Button>
          </div>
          <p className="text-xs font-semibold text-slate-400">Toplam kayıt: {rows.length}</p>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-rose-400/40 bg-rose-950/25 px-3 py-2 text-sm text-rose-100">{error}</p>
      ) : null}

      <div className="rounded-xl border border-[#1f3553] bg-[#0b1d35] p-3">
        {loading ? <p className="text-sm text-slate-400">Müşteriler yükleniyor...</p> : null}
        {!loading ? <DataTable columns={columns} data={rows} globalFilterPlaceholder="Müşteri kodu, ünvanı veya telefon ara..." /> : null}
      </div>
    </div>
  );
}
