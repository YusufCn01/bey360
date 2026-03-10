"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";

type EInvoiceRow = {
  id: string;
  code: string | null;
  name: string | null;
  status: string;
  scenario: string;
  profile: string;
  total: number;
  currency: string;
  providerCode: string;
  providerReference: string | null;
  createdAt: string;
  updatedAt: string;
};

const statusLabelMap: Record<string, string> = {
  draft: "Taslak",
  validated: "Doğrulandı",
  queued: "Kuyrukta",
  sending: "Gönderiliyor",
  sent: "Gönderildi",
  delivered: "Teslim Edildi",
  accepted: "Kabul Edildi",
  rejected: "Reddedildi",
  cancelled: "İptal Edildi",
  failed: "Başarısız",
  retrying: "Tekrar Deneniyor",
  archived: "Arşivlendi",
};

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("tr-TR");
}

export function EInvoiceClient() {
  const [rows, setRows] = React.useState<EInvoiceRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [busyKey, setBusyKey] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      query.set("limit", "200");
      if (statusFilter !== "all") {
        query.set("status", statusFilter);
      }

      const response = await fetch(`/api/tenant/einvoice/documents${query.toString()}`);
      const body = (await response.json()) as {
        success: boolean;
        data: EInvoiceRow[];
        error: { message: string };
      };

      if (!response.ok || !body.success) {
        throw new Error(body.error.message ?? "e-Fatura belgeleri alınamadı.");
      }

      setRows(body.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "e-Fatura belgeleri alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const sendDocument = React.useCallback(
    async (documentId: string) => {
      setBusyKey(`send:${documentId}`);
      setError(null);
      setMessage(null);
      try {
        const response = await fetch(`/api/tenant/einvoice/documents/${documentId}/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        const body = (await response.json()) as {
          success: boolean;
          error: { message: string };
        };

        if (!response.ok || !body.success) {
          throw new Error(body.error.message ?? "Belge kuyruğa alınamadı.");
        }

        setMessage("Belge kuyruğa alındı.");
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Belge kuyruğa alınamadı.");
      } finally {
        setBusyKey(null);
      }
    },
    [load],
  );

  const syncDocument = React.useCallback(
    async (documentId: string) => {
      setBusyKey(`sync:${documentId}`);
      setError(null);
      setMessage(null);
      try {
        const response = await fetch(`/api/tenant/einvoice/documents/${documentId}/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        const body = (await response.json()) as {
          success: boolean;
          error: { message: string };
        };

        if (!response.ok || !body.success) {
          throw new Error(body.error.message ?? "Belge durumu senkronize edilemedi.");
        }

        setMessage("Belge durumu senkronize edildi.");
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Belge durumu senkronize edilemedi.");
      } finally {
        setBusyKey(null);
      }
    },
    [load],
  );

  const columns = React.useMemo<ColumnDef<EInvoiceRow>[]>(
    () => [
      { accessorKey: "code", header: "Belge No" },
      { accessorKey: "name", header: "Cari Unvan" },
      {
        accessorKey: "scenario",
        header: "Senaryo",
      },
      {
        id: "amount",
        header: "Tutar",
        cell: ({ row }) => formatAmount(row.original.total ?? 0, row.original.currency ?? "TRY"),
      },
      {
        id: "status",
        header: "Durum",
        cell: ({ row }) => statusLabelMap[row.original.status] ?? row.original.status,
      },
      {
        id: "provider",
        header: "Sağlayıcı",
        cell: ({ row }) => row.original.providerCode,
      },
      {
        id: "updatedAt",
        header: "Son Güncelleme",
        cell: ({ row }) => formatDate(row.original.updatedAt),
      },
      {
        id: "actions",
        header: "İşlemler",
        cell: ({ row }) => {
          const sending = busyKey === `send:${row.original.id}`;
          const syncing = busyKey === `sync:${row.original.id}`;
          return (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => void sendDocument(row.original.id)} disabled={sending || syncing}>
                {sending ? "Kuyruğa Alınıyor..." : "Kuyruğa Gönder"}
              </Button>
              <Button size="sm" onClick={() => void syncDocument(row.original.id)} disabled={sending || syncing}>
                {syncing ? "Senkronize Ediliyor..." : "Durum Senkronize Et"}
              </Button>
            </div>
          );
        },
      },
    ],
    [busyKey, sendDocument, syncDocument],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Durum Filtresi</label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="draft">Taslak</option>
            <option value="queued">Kuyrukta</option>
            <option value="sending">Gönderiliyor</option>
            <option value="sent">Gönderildi</option>
            <option value="delivered">Teslim Edildi</option>
            <option value="accepted">Kabul Edildi</option>
            <option value="rejected">Reddedildi</option>
            <option value="failed">Başarısız</option>
            <option value="cancelled">İptal Edildi</option>
            <option value="archived">Arşivlendi</option>
          </select>
        </div>
        <Button variant="ghost" onClick={() => void load()}>
          Listeyi Yenile
        </Button>
      </div>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">e-Fatura belgeleri yükleniyor...</p> : null}

      {!loading ? <DataTable columns={columns} data={rows} globalFilterPlaceholder="Belge no veya cari ara..." /> : null}
    </div>
  );
}
