"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: { message?: string };
};

type SupportStatus = "open" | "pending" | "closed";
type SupportPriority = "low" | "normal" | "high" | "urgent";

type TicketRow = {
  id: string;
  code: string | null;
  subject: string;
  description: string | null;
  status: SupportStatus;
  priority: SupportPriority;
  unreadForTenant: number;
  unreadForFounder: number;
  messageCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastMessageAuthorType: "tenant" | "founder" | null;
  assignedFounderName: string | null;
  firstFounderResponseAt: string | null;
  firstResponseDueAt: string | null;
  firstResponseMinutes: number | null;
  slaBreached: boolean;
  slaRemainingMinutes: number | null;
  createdAt: string;
  updatedAt: string;
};

type MessageRow = {
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

type TicketDetailResponse = {
  ticket: {
    id: string;
    code: string | null;
    subject: string;
    status: SupportStatus;
    priority: SupportPriority;
    assignedFounderName: string | null;
    firstFounderResponseAt: string | null;
    firstResponseDueAt: string | null;
    firstResponseMinutes: number | null;
    slaBreached: boolean;
    slaRemainingMinutes: number | null;
  };
  messages: MessageRow[];
};

type CreateTicketForm = {
  subject: string;
  priority: SupportPriority;
  message: string;
};

const initialForm: CreateTicketForm = {
  subject: "",
  priority: "normal",
  message: "",
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

function statusBadgeClass(status: SupportStatus): string {
  if (status === "open") {
    return "border-emerald-300 bg-emerald-50 text-emerald-700";
  }
  if (status === "pending") {
    return "border-amber-300 bg-amber-50 text-amber-700";
  }
  return "border-slate-300 bg-slate-100 text-slate-700";
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

function messageBubbleClass(authorType: "tenant" | "founder"): string {
  return authorType === "tenant"
    ? "ml-auto border-emerald-300 bg-emerald-50 text-emerald-900"
    : "mr-auto border-slate-300 bg-white text-slate-900";
}

function formatSlaText(row: {
  firstFounderResponseAt: string | null;
  firstResponseMinutes: number | null;
  slaBreached: boolean;
  slaRemainingMinutes: number | null;
}): string {
  if (row.firstFounderResponseAt && row.firstResponseMinutes !== null) {
    return row.slaBreached ? `Ilk yanit: ${row.firstResponseMinutes} dk (SLA asimi)` : `Ilk yanit: ${row.firstResponseMinutes} dk`;
  }
  if (row.slaRemainingMinutes === null) {
    return "SLA bekleniyor";
  }
  if (row.slaRemainingMinutes < 0) {
    return `SLA asildi (${Math.abs(row.slaRemainingMinutes)} dk)`;
  }
  return `Tahmini ilk yanit: ${row.slaRemainingMinutes} dk`;
}

export function SupportTicketsClient() {
  const [rows, setRows] = React.useState<TicketRow[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<"all" | SupportStatus>("all");
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [selectedTicketId, setSelectedTicketId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<TicketDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = React.useState(false);
  const [form, setForm] = React.useState<CreateTicketForm>(initialForm);
  const [replyText, setReplyText] = React.useState("");
  const [busyCreate, setBusyCreate] = React.useState(false);
  const [busyReply, setBusyReply] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const selectedTicket = React.useMemo(
    () => rows.find((row) => row.id === selectedTicketId) ?? null,
    [rows, selectedTicketId],
  );

  const loadTickets = React.useCallback(
    async (nextSelectedTicketId?: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (statusFilter !== "all") {
          params.set("status", statusFilter);
        }
        if (query.trim()) {
          params.set("q", query.trim());
        }
        params.set("limit", "250");

        const data = await requestApi<TicketRow[]>(`/api/tenant/support/tickets?${params.toString()}`);
        setRows(data);

        const preferredId =
          nextSelectedTicketId ??
          (selectedTicketId && data.some((row) => row.id === selectedTicketId) ? selectedTicketId : null) ??
          data[0]?.id ??
          null;
        setSelectedTicketId(preferredId);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Destek talepleri yuklenemedi.");
      } finally {
        setLoading(false);
      }
    },
    [query, selectedTicketId, statusFilter],
  );

  const loadDetail = React.useCallback(async (ticketId: string) => {
    setLoadingDetail(true);
    setError(null);
    try {
      const data = await requestApi<TicketDetailResponse>(`/api/tenant/support/tickets/${ticketId}/messages`);
      setDetail(data);
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

  function patchForm<K extends keyof CreateTicketForm>(key: K, value: CreateTicketForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function createTicket(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyCreate(true);
    setMessage(null);
    setError(null);
    try {
      const created = await requestApi<TicketRow>("/api/tenant/support/tickets", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm(initialForm);
      setMessage("Destek talebiniz olusturuldu.");
      await loadTickets(created.id);
      await loadDetail(created.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Destek talebi olusturulamadi.");
    } finally {
      setBusyCreate(false);
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
      await requestApi(`/api/tenant/support/tickets/${selectedTicketId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          message: replyText.trim(),
        }),
      });
      setReplyText("");
      await Promise.all([loadTickets(selectedTicketId), loadDetail(selectedTicketId)]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Mesaj gonderilemedi.");
    } finally {
      setBusyReply(false);
    }
  }

  return (
    <div className="space-y-4">
      {message ? (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      <form onSubmit={createTicket} className="space-y-3 rounded-xl border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-3">
        <p className="text-sm font-bold">Yeni Destek Talebi Olustur</p>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold">Konu</label>
            <input
              value={form.subject}
              onChange={(event) => patchForm("subject", event.target.value)}
              placeholder="Orn: POS ekraninda barkod gecikmesi"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">Oncelik</label>
            <select value={form.priority} onChange={(event) => patchForm("priority", event.target.value as SupportPriority)}>
              <option value="low">Dusuk</option>
              <option value="normal">Normal</option>
              <option value="high">Yuksek</option>
              <option value="urgent">Kritik</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" className="h-10 w-full" disabled={busyCreate}>
              {busyCreate ? "Kaydediliyor..." : "Talep Olustur"}
            </Button>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold">Detay Mesaji</label>
          <textarea
            rows={3}
            value={form.message}
            onChange={(event) => patchForm("message", event.target.value)}
            placeholder="Problemi adim adim yazin."
            required
          />
        </div>
      </form>

      <div className="grid gap-3 xl:grid-cols-[360px_1fr]">
        <section className="rounded-xl border border-[color:var(--mx-border)] bg-[color:var(--mx-surface)]">
          <div className="space-y-2 border-b border-[color:var(--mx-border)] p-3">
            <p className="text-sm font-bold">Destek Taleplerim</p>
            <div className="grid grid-cols-[1fr_120px_auto] gap-2">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Kod veya konu ara"
              />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | SupportStatus)}>
                <option value="all">Tum Durumlar</option>
                <option value="open">Acik</option>
                <option value="pending">Takipte</option>
                <option value="closed">Kapali</option>
              </select>
              <Button variant="secondary" onClick={() => void loadTickets()} disabled={loading}>
                Yenile
              </Button>
            </div>
          </div>

          <div className="max-h-[62vh] overflow-auto p-2">
            {loading ? (
              <p className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-4 text-center text-sm text-[color:var(--mx-text-muted)]">
                Talepler yukleniyor...
              </p>
            ) : rows.length === 0 ? (
              <p className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-4 text-center text-sm text-[color:var(--mx-text-muted)]">
                Filtreye uygun talep bulunamadi.
              </p>
            ) : (
              <div className="space-y-2">
                {rows.map((row) => {
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
                        <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(row.status)}`}>
                          {statusLabel(row.status)}
                        </span>
                      </div>
                      <p className="text-xs text-[color:var(--mx-text-muted)]">
                        {row.code || "-"} | {priorityLabel(row.priority)} | Mesaj: {row.messageCount}
                      </p>
                      <p className={`text-xs font-semibold ${row.slaBreached ? "text-rose-700" : "text-[color:var(--mx-text-muted)]"}`}>
                        {formatSlaText(row)}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-[color:var(--mx-text-muted)]">
                        {row.lastMessagePreview || row.description || "-"}
                      </p>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-[color:var(--mx-text-muted)]">
                        <span>{formatDateTime(row.lastMessageAt || row.updatedAt)}</span>
                        {row.unreadForTenant > 0 ? (
                          <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-white">{row.unreadForTenant} yeni</span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="flex min-h-[62vh] flex-col rounded-xl border border-[color:var(--mx-border)] bg-[color:var(--mx-surface)]">
          <div className="border-b border-[color:var(--mx-border)] p-3">
            <p className="text-sm font-bold">{detail?.ticket.subject || selectedTicket?.subject || "Talep Secin"}</p>
            <p className="text-xs text-[color:var(--mx-text-muted)]">
              {detail?.ticket.code || selectedTicket?.code || "-"} | Atanan: {detail?.ticket.assignedFounderName || "Beklemede"}
            </p>
            {detail ? (
              <p className={`text-xs font-semibold ${detail.ticket.slaBreached ? "text-rose-700" : "text-[color:var(--mx-text-muted)]"}`}>
                {formatSlaText(detail.ticket)}
              </p>
            ) : null}
          </div>

          <div className="flex-1 space-y-2 overflow-auto p-3">
            {loadingDetail ? (
              <p className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-4 text-center text-sm text-[color:var(--mx-text-muted)]">
                Konusma yukleniyor...
              </p>
            ) : detail && detail.messages.length > 0 ? (
              detail.messages.map((row) => (
                <article key={row.id} className={`max-w-[85%] rounded-lg border px-3 py-2 text-sm ${messageBubbleClass(row.authorType)}`}>
                  <p className="mb-1 text-[11px] font-semibold opacity-80">
                    {row.authorType === "tenant" ? "Siz" : row.authorName} - {formatDateTime(row.createdAt)}
                  </p>
                  <p className="whitespace-pre-wrap">{row.message}</p>
                </article>
              ))
            ) : (
              <p className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-4 text-center text-sm text-[color:var(--mx-text-muted)]">
                Secili talep icin henuz mesaj yok.
              </p>
            )}
          </div>

          <form onSubmit={sendReply} className="border-t border-[color:var(--mx-border)] p-3">
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <textarea
                rows={2}
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder={selectedTicketId ? "Cevabinizi yazin..." : "Mesaj yazmak icin soldan talep secin"}
                disabled={!selectedTicketId || busyReply}
              />
              <Button type="submit" disabled={!selectedTicketId || busyReply || !replyText.trim()}>
                {busyReply ? "Gonderiliyor..." : "Mesaj Gonder"}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
