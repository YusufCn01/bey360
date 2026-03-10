"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";

type AuditLogRow = {
  id: string;
  module: string;
  entityName: string;
  entityId: string | null;
  action: string;
  severity: string;
  createdAt: string;
  userId: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  payload?: unknown;
};

type AuditEnvelope = {
  success: boolean;
  data?: AuditLogRow[];
  error?: { message?: string };
};

function toDateTimeLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString("tr-TR");
}

function toDateFromInput(value: string, endOfDay = false): string | null {
  if (!value) {
    return null;
  }
  const suffix = endOfDay ? "T23:59:59.999" : "T00:00:00.000";
  const date = new Date(`${value}${suffix}`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function asPrettyJson(value: unknown): string {
  if (value === null || value === undefined) {
    return "{}";
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
}

function csvSafe(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const escaped = text.replace(/"/g, "\"\"");
  return `"${escaped}"`;
}

function downloadAuditCsv(rows: AuditLogRow[]) {
  const header = [
    "id",
    "module",
    "entityName",
    "entityId",
    "action",
    "severity",
    "userId",
    "ipAddress",
    "userAgent",
    "createdAt",
    "payload",
  ];

  const lines = [
    header.join(";"),
    ...rows.map((row) =>
      [
        csvSafe(row.id),
        csvSafe(row.module),
        csvSafe(row.entityName),
        csvSafe(row.entityId ?? ""),
        csvSafe(row.action),
        csvSafe(row.severity),
        csvSafe(row.userId ?? ""),
        csvSafe(row.ipAddress ?? ""),
        csvSafe(row.userAgent ?? ""),
        csvSafe(row.createdAt),
        csvSafe(row.payload ?? {}),
      ].join(";"),
    ),
  ];

  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  anchor.href = url;
  anchor.download = `audit-kayitlari-${stamp}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function AuditClient() {
  const [rows, setRows] = React.useState<AuditLogRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [moduleFilter, setModuleFilter] = React.useState("");
  const [actionFilter, setActionFilter] = React.useState("");
  const [searchFilter, setSearchFilter] = React.useState("");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [refreshTick, setRefreshTick] = React.useState(0);
  const [selectedRow, setSelectedRow] = React.useState<AuditLogRow | null>(null);

  const columns = React.useMemo<ColumnDef<AuditLogRow>[]>(
    () => [
      { accessorKey: "module", header: "Modül" },
      { accessorKey: "entityName", header: "Varlık" },
      { accessorKey: "entityId", header: "Kayıt" },
      { accessorKey: "action", header: "İşlem" },
      { accessorKey: "severity", header: "Seviye" },
      { accessorKey: "userId", header: "Kullanıcı" },
      {
        accessorKey: "createdAt",
        header: "Tarih",
        cell: ({ row }) => toDateTimeLabel(row.original.createdAt),
      },
      {
        id: "detail",
        header: "Detay",
        cell: ({ row }) => (
          <Button size="sm" variant="secondary" onClick={() => setSelectedRow(row.original)}>
            Gör
          </Button>
        ),
      },
    ],
    [],
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "300");
      if (moduleFilter.trim()) {
        params.set("module", moduleFilter.trim());
      }
      if (actionFilter.trim()) {
        params.set("action", actionFilter.trim());
      }
      if (searchFilter.trim()) {
        params.set("q", searchFilter.trim());
      }

      const dateFromIso = toDateFromInput(fromDate, false);
      if (fromDate && dateFromIso) {
        params.set("dateFrom", dateFromIso);
      }
      const dateToIso = toDateFromInput(toDate, true);
      if (toDate && dateToIso) {
        params.set("dateTo", dateToIso);
      }

      const response = await fetch(`/api/tenant/audit/logs?${params.toString()}`, {
        cache: "no-store",
      });
      const body = (await response.json()) as AuditEnvelope;
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? "İşlem geçmişi alınamadı.");
      }

      setRows(Array.isArray(body.data) ? body.data : []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "İşlem geçmişi alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [actionFilter, fromDate, moduleFilter, searchFilter, toDate]);

  React.useEffect(() => {
    void load();
  }, [load, refreshTick]);

  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        <input
          value={moduleFilter}
          onChange={(event) => setModuleFilter(event.target.value)}
          placeholder="Modül (örn: pos, settings)"
        />
        <input
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value)}
          placeholder="İşlem (örn: settings.updated)"
        />
        <input
          value={searchFilter}
          onChange={(event) => setSearchFilter(event.target.value)}
          placeholder="Serbest arama"
        />
        <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
        <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => setRefreshTick((prev) => prev + 1)} disabled={loading}>
          Yenile
        </Button>
        <Button variant="secondary" onClick={() => downloadAuditCsv(rows)} disabled={loading || rows.length === 0}>
          CSV İndir
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setModuleFilter("");
            setActionFilter("");
            setSearchFilter("");
            setFromDate("");
            setToDate("");
            setRefreshTick((prev) => prev + 1);
          }}
          disabled={loading}
        >
          Filtreyi Temizle
        </Button>
      </div>

      {loading ? <p className="text-sm text-slate-500">İşlem geçmişi yükleniyor...</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {!loading && !error ? (
        <DataTable columns={columns} data={rows} globalFilterPlaceholder="Tabloda ara..." />
      ) : null}

      {selectedRow ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/65 p-3">
          <div className="w-full max-w-3xl rounded-xl border border-[color:var(--mx-border)] bg-[color:var(--mx-surface)] p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-base font-bold">Audit Detayı</p>
                <p className="text-sm text-[color:var(--mx-text-muted)]">{selectedRow.module} / {selectedRow.action}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setSelectedRow(null)}>
                Kapat
              </Button>
            </div>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <p><strong>Varlık:</strong> {selectedRow.entityName}</p>
              <p><strong>Kayıt:</strong> {selectedRow.entityId || "-"}</p>
              <p><strong>Kullanıcı:</strong> {selectedRow.userId || "-"}</p>
              <p><strong>Seviye:</strong> {selectedRow.severity}</p>
              <p><strong>IP:</strong> {selectedRow.ipAddress || "-"}</p>
              <p><strong>Tarih:</strong> {toDateTimeLabel(selectedRow.createdAt)}</p>
              <p className="md:col-span-2"><strong>User-Agent:</strong> {selectedRow.userAgent || "-"}</p>
            </div>
            <div className="mt-3">
              <p className="mb-1 text-sm font-semibold">Payload</p>
              <pre className="max-h-[46vh] overflow-auto rounded-lg border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-2 text-xs">
                {asPrettyJson(selectedRow.payload)}
              </pre>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
