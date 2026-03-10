"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: { message?: string };
};

type SupportStatus = "open" | "pending" | "closed";
type SupportPriority = "low" | "normal" | "high" | "urgent";

type FounderTicketRow = {
  id: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  tenantStatus: string;
  code: string | null;
  subject: string;
  description: string | null;
  status: SupportStatus;
  priority: SupportPriority;
  unreadForTenant: number;
  unreadForFounder: number;
  messageCount: number;
  assignedFounderName: string | null;
  assignedFounderId: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastMessageAuthorType: "tenant" | "founder" | null;
  firstFounderResponseAt: string | null;
  firstResponseDueAt: string | null;
  firstResponseMinutes: number | null;
  slaBreached: boolean;
  slaRemainingMinutes: number | null;
  createdAt: string;
  updatedAt: string;
};

type FounderMessageRow = {
  id: string;
  code: string | null;
  title: string;
  message: string;
  status: string;
  authorType: "tenant" | "founder";
  authorName: string;
  authorId: string | null;
  createdAt: string;
};

type FounderTicketDetailResponse = {
  ticket: {
    id: string;
    tenantId: string;
    tenantSlug: string;
    tenantName: string;
    tenantStatus: string;
    code: string | null;
    subject: string;
    status: SupportStatus;
    priority: SupportPriority;
    assignedFounderId: string | null;
    assignedFounderName: string | null;
    firstFounderResponseAt: string | null;
    firstResponseDueAt: string | null;
    firstResponseMinutes: number | null;
    slaBreached: boolean;
    slaRemainingMinutes: number | null;
  };
  messages: FounderMessageRow[];
};

type FounderTicketListResponse = {
  rows: FounderTicketRow[];
  summary: {
    total: number;
    open: number;
    pending: number;
    closed: number;
    waitingFounder: number;
    waitingTenant: number;
    slaBreached: number;
  };
};

async function requestApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !body.success || body.data === undefined) {
    throw new Error(body.error?.message ?? "Islem basarisiz.");
  }
  return body.data;
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusLabel(status: SupportStatus): string {
  if (status === "open") {
    return "Acik";
  }
  if (status === "pending") {
    return "Takipte";
  }
  return "Kapali";
}

function priorityLabel(priority: SupportPriority): string {
  if (priority === "low") {
    return "Dusuk";
  }
  if (priority === "normal") {
    return "Normal";
  }
  if (priority === "high") {
    return "Yuksek";
  }
  return "Kritik";
}

function statusClass(status: SupportStatus): string {
  if (status === "open") {
    return "border-emerald-300 bg-emerald-50 text-emerald-700";
  }
  if (status === "pending") {
    return "border-amber-300 bg-amber-50 text-amber-700";
  }
  return "border-slate-300 bg-slate-100 text-slate-700";
}

function formatSlaText(row: {
  firstFounderResponseAt: string | null;
  firstResponseMinutes: number | null;
  slaBreached: boolean;
  slaRemainingMinutes: number | null;
}): string {
  if (row.firstFounderResponseAt && row.firstResponseMinutes !== null) {
    return row.slaBreached ? `Ilk yanit: ${row.firstResponseMinutes} dk (Ihlal)` : `Ilk yanit: ${row.firstResponseMinutes} dk`;
  }
  if (row.slaRemainingMinutes === null) {
    return "SLA bekleniyor";
  }
  if (row.slaRemainingMinutes < 0) {
    return `SLA asildi (${Math.abs(row.slaRemainingMinutes)} dk)`;
  }
  return `SLA kalan: ${row.slaRemainingMinutes} dk`;
}

function messageBubbleClass(authorType: "tenant" | "founder"): string {
  return authorType === "founder"
    ? "ml-auto border-cyan-300 bg-cyan-50 text-cyan-900"
    : "mr-auto border-slate-300 bg-white text-slate-900";
}

export function SupportTicketsAdminClient() {
  const [rows, setRows] = React.useState<FounderTicketRow[]>([]);
  const [summary, setSummary] = React.useState<FounderTicketListResponse["summary"]>({
    total: 0,
    open: 0,
    pending: 0,
    closed: 0,
    waitingFounder: 0,
    waitingTenant: 0,
    slaBreached: 0,
  });
  const [statusFilter, setStatusFilter] = React.useState<"all" | SupportStatus>("all");
  const [priorityFilter, setPriorityFilter] = React.useState<"all" | SupportPriority>("all");
  const [query, setQuery] = React.useState("");
  const [selectedTicketId, setSelectedTicketId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<FounderTicketDetailResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingDetail, setLoadingDetail] = React.useState(false);
  const [busyTicketAction, setBusyTicketAction] = React.useState(false);
  const [busyReply, setBusyReply] = React.useState(false);
  const [replyText, setReplyText] = React.useState("");
  const [draftStatus, setDraftStatus] = React.useState<SupportStatus>("open");
  const [draftPriority, setDraftPriority] = React.useState<SupportPriority>("normal");
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const selectedTicket = React.useMemo(
    () => rows.find((row) => row.id === selectedTicketId) ?? null,
    [rows, selectedTicketId],
  );

  const loadTickets = React.useCallback(
    async (nextSelectedId?: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (statusFilter !== "all") {
          params.set("status", statusFilter);
        }
        if (priorityFilter !== "all") {
          params.set("priority", priorityFilter);
        }
        if (query.trim()) {
          params.set("q", query.trim());
        }
        params.set("limit", "350");

        const data = await requestApi<FounderTicketListResponse>(`/api/founder/support/tickets?${params.toString()}`);
        setRows(data.rows);
        setSummary(data.summary);

        const preferredId =
          nextSelectedId ??
          (selectedTicketId && data.rows.some((row) => row.id === selectedTicketId) ? selectedTicketId : null) ??
          data.rows[0]?.id ??
          null;
        setSelectedTicketId(preferredId);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Destek talepleri yuklenemedi.");
      } finally {
        setLoading(false);
      }
    },
    [priorityFilter, query, selectedTicketId, statusFilter],
  );

  const loadDetail = React.useCallback(async (ticketId: string) => {
    setLoadingDetail(true);
    setError(null);
    try {
      const data = await requestApi<FounderTicketDetailResponse>(`/api/founder/support/tickets/${ticketId}/messages`);
      setDetail(data);
      setDraftStatus(data.ticket.status);
      setDraftPriority(data.ticket.priority);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Talep detaylari yuklenemedi.");
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  React.useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  React.useEffect(() => {
    if (!selectedTicketId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedTicketId);
  }, [selectedTicketId, loadDetail]);

  async function applyTicketMeta(assignToMe = false) {
    if (!selectedTicketId) {
      return;
    }
    setBusyTicketAction(true);
    setMessage(null);
    setError(null);
    try {
      await requestApi("/api/founder/support/tickets", {
        method: "PATCH",
        body: JSON.stringify({
          ticketId: selectedTicketId,
          status: draftStatus,
          priority: draftPriority,
          assignToMe,
        }),
      });
      setMessage("Talep kaydi guncellendi.");
      await Promise.all([loadTickets(selectedTicketId), loadDetail(selectedTicketId)]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Talep guncellenemedi.");
    } finally {
      setBusyTicketAction(false);
    }
  }

  async function clearAssignee() {
    if (!selectedTicketId) {
      return;
    }
    setBusyTicketAction(true);
    setMessage(null);
    setError(null);
    try {
      await requestApi("/api/founder/support/tickets", {
        method: "PATCH",
        body: JSON.stringify({
          ticketId: selectedTicketId,
          clearAssignment: true,
        }),
      });
      setMessage("Atama temizlendi.");
      await Promise.all([loadTickets(selectedTicketId), loadDetail(selectedTicketId)]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Atama temizlenemedi.");
    } finally {
      setBusyTicketAction(false);
    }
  }

  async function sendReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTicketId || !replyText.trim()) {
      return;
    }

    setBusyReply(true);
    setMessage(null);
    setError(null);
    try {
      await requestApi(`/api/founder/support/tickets/${selectedTicketId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          message: replyText.trim(),
        }),
      });
      setReplyText("");
      await Promise.all([loadTickets(selectedTicketId), loadDetail(selectedTicketId)]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Cevap gonderilemedi.");
    } finally {
      setBusyReply(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Destek Talepleri</CardTitle>
            <p className="text-sm text-[color:var(--mx-text-muted)]">
              Tum bayilerden gelen talepleri merkezi olarak yonetin, atayin ve cevaplayin.
            </p>
          </div>
          <Button variant="secondary" onClick={() => void loadTickets()} disabled={loading}>
            Yenile
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
            <div className="rounded-lg border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--mx-text-muted)]">Toplam</p>
              <p className="mt-1 text-2xl font-black">{summary.total}</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
              <p className="text-xs font-semibold uppercase tracking-wide">Acik</p>
              <p className="mt-1 text-2xl font-black">{summary.open}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <p className="text-xs font-semibold uppercase tracking-wide">Takipte</p>
              <p className="mt-1 text-2xl font-black">{summary.pending}</p>
            </div>
            <div className="rounded-lg border border-slate-300 bg-slate-100 p-3 text-slate-900">
              <p className="text-xs font-semibold uppercase tracking-wide">Kapali</p>
              <p className="mt-1 text-2xl font-black">{summary.closed}</p>
            </div>
            <div className="rounded-lg border border-fuchsia-200 bg-fuchsia-50 p-3 text-fuchsia-900">
              <p className="text-xs font-semibold uppercase tracking-wide">Kurucu Bekleyen</p>
              <p className="mt-1 text-2xl font-black">{summary.waitingFounder}</p>
            </div>
            <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-cyan-900">
              <p className="text-xs font-semibold uppercase tracking-wide">Bayi Bekleyen</p>
              <p className="mt-1 text-2xl font-black">{summary.waitingTenant}</p>
            </div>
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-900">
              <p className="text-xs font-semibold uppercase tracking-wide">SLA Ihlali</p>
              <p className="mt-1 text-2xl font-black">{summary.slaBreached}</p>
            </div>
          </div>

          {message ? (
            <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
          ) : null}
          {error ? (
            <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-3 xl:grid-cols-[390px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Talep Listesi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-[1fr_130px_130px] gap-2">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Bayi, kod veya konu ara"
              />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | SupportStatus)}>
                <option value="all">Tum Durumlar</option>
                <option value="open">Acik</option>
                <option value="pending">Takipte</option>
                <option value="closed">Kapali</option>
              </select>
              <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as "all" | SupportPriority)}>
                <option value="all">Tum Oncelikler</option>
                <option value="low">Dusuk</option>
                <option value="normal">Normal</option>
                <option value="high">Yuksek</option>
                <option value="urgent">Kritik</option>
              </select>
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => void loadTickets()} disabled={loading}>
                Filtreyi Uygula
              </Button>
            </div>

            <div className="max-h-[60vh] space-y-2 overflow-auto pr-1">
              {loading ? (
                <p className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-4 text-center text-sm text-[color:var(--mx-text-muted)]">
                  Talepler yukleniyor...
                </p>
              ) : rows.length === 0 ? (
                <p className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-4 text-center text-sm text-[color:var(--mx-text-muted)]">
                  Filtreye uygun destek talebi bulunamadi.
                </p>
              ) : (
                rows.map((row) => {
                  const active = row.id === selectedTicketId;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => setSelectedTicketId(row.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                        active
                          ? "border-cyan-300 bg-cyan-50"
                          : "border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] hover:border-cyan-200"
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-semibold">{row.subject}</p>
                        <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold ${statusClass(row.status)}`}>
                          {statusLabel(row.status)}
                        </span>
                      </div>
                      <p className="text-xs text-[color:var(--mx-text-muted)]">
                        {row.tenantName} ({row.tenantSlug}) - {row.code || "-"}
                      </p>
                      <p className="text-xs text-[color:var(--mx-text-muted)]">
                        Oncelik: {priorityLabel(row.priority)} | Mesaj: {row.messageCount}
                      </p>
                      <p className={`text-xs font-semibold ${row.slaBreached ? "text-rose-700" : "text-[color:var(--mx-text-muted)]"}`}>
                        {formatSlaText(row)}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-[color:var(--mx-text-muted)]">
                        {row.lastMessagePreview || row.description || "-"}
                      </p>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-[color:var(--mx-text-muted)]">
                        <span>{formatDateTime(row.lastMessageAt || row.updatedAt)}</span>
                        {row.unreadForFounder > 0 ? (
                          <span className="rounded bg-fuchsia-600 px-1.5 py-0.5 text-white">{row.unreadForFounder} yeni</span>
                        ) : null}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="flex min-h-[70vh] flex-col">
          <CardHeader>
            <CardTitle className="text-base">
              {detail?.ticket.subject || selectedTicket?.subject || "Talep Secin"}
            </CardTitle>
            <p className="text-xs text-[color:var(--mx-text-muted)]">
              {detail?.ticket.tenantName || selectedTicket?.tenantName || "-"} | {detail?.ticket.code || selectedTicket?.code || "-"}
            </p>
            {detail ? (
              <p className={`text-xs font-semibold ${detail.ticket.slaBreached ? "text-rose-700" : "text-[color:var(--mx-text-muted)]"}`}>
                {formatSlaText(detail.ticket)}
              </p>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            <div className="grid gap-2 rounded-lg border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-3 md:grid-cols-[1fr_1fr_auto_auto_auto]">
              <select
                value={draftStatus}
                onChange={(event) => setDraftStatus(event.target.value as SupportStatus)}
                disabled={!selectedTicketId || busyTicketAction}
              >
                <option value="open">Acik</option>
                <option value="pending">Takipte</option>
                <option value="closed">Kapali</option>
              </select>
              <select
                value={draftPriority}
                onChange={(event) => setDraftPriority(event.target.value as SupportPriority)}
                disabled={!selectedTicketId || busyTicketAction}
              >
                <option value="low">Dusuk</option>
                <option value="normal">Normal</option>
                <option value="high">Yuksek</option>
                <option value="urgent">Kritik</option>
              </select>
              <Button
                size="sm"
                onClick={() => void applyTicketMeta(false)}
                disabled={!selectedTicketId || busyTicketAction}
              >
                {busyTicketAction ? "Kaydediliyor..." : "Kaydet"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void applyTicketMeta(true)}
                disabled={!selectedTicketId || busyTicketAction}
              >
                Bana Ata
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => void clearAssignee()}
                disabled={!selectedTicketId || busyTicketAction}
              >
                Atamayi Kaldir
              </Button>
            </div>

            <div className="flex-1 space-y-2 overflow-auto rounded-lg border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-3">
              {loadingDetail ? (
                <p className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface)] px-3 py-4 text-center text-sm text-[color:var(--mx-text-muted)]">
                  Konusma yukleniyor...
                </p>
              ) : detail && detail.messages.length > 0 ? (
                detail.messages.map((row) => (
                  <article key={row.id} className={`max-w-[85%] rounded-lg border px-3 py-2 text-sm ${messageBubbleClass(row.authorType)}`}>
                    <p className="mb-1 text-[11px] font-semibold opacity-80">
                      {row.authorType === "founder" ? "Kurucu" : row.authorName} - {formatDateTime(row.createdAt)}
                    </p>
                    <p className="whitespace-pre-wrap">{row.message}</p>
                  </article>
                ))
              ) : (
                <p className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface)] px-3 py-4 text-center text-sm text-[color:var(--mx-text-muted)]">
                  Secili talep icin mesaj bulunamadi.
                </p>
              )}
            </div>

            <form onSubmit={sendReply} className="grid gap-2 md:grid-cols-[1fr_auto]">
              <textarea
                rows={2}
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder={selectedTicketId ? "Bayiye iletilecek cevabi yazin..." : "Mesaj yazmak icin talep secin"}
                disabled={!selectedTicketId || busyReply}
              />
              <Button type="submit" disabled={!selectedTicketId || busyReply || !replyText.trim()}>
                {busyReply ? "Gonderiliyor..." : "Cevap Gonder"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
