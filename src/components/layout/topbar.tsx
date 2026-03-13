"use client";

import * as React from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LogoutButton } from "@/components/layout/logout-button";

type DemoStateTone = "ok" | "warn" | "danger" | "neutral";
type AnnouncementTone = "info" | "success" | "warning" | "danger";

type DemoState = {
  label: string;
  dateLabel?: string;
  tone: DemoStateTone;
};

type TenantAnnouncement = {
  id: string;
  title: string;
  message: string;
  tone: AnnouncementTone;
  buttonLabel?: string | null;
  buttonUrl?: string | null;
  publishAt?: string | null;
  isPinned?: boolean;
};

type TopbarProps = {
  companyName: string;
  tenantSlug?: string;
  userName?: string;
  branchName?: string;
  logoUrl?: string;
  demoState: DemoState;
  maintenanceState?: {
    enabled: boolean;
    message: string;
  } | null;
  updateNotice?: {
    version: string;
    title: string;
    isForce: boolean;
    publishedAt?: string;
  } | null;
  announcements?: TenantAnnouncement[];
  onToggleSidebar?: () => void;
};

const demoToneClassMap: Record<DemoStateTone, string> = {
  ok: "border-emerald-400/65 bg-emerald-500/20 text-emerald-100",
  warn: "border-amber-300/65 bg-amber-500/20 text-amber-100",
  danger: "border-rose-300/70 bg-rose-500/25 text-rose-100",
  neutral: "border-cyan-300/50 bg-cyan-500/15 text-cyan-100",
};

const announcementToneClassMap: Record<AnnouncementTone, string> = {
  info: "border-cyan-300/45 bg-cyan-500/10 text-cyan-100",
  success: "border-emerald-300/45 bg-emerald-500/12 text-emerald-100",
  warning: "border-amber-300/45 bg-amber-500/12 text-amber-100",
  danger: "border-rose-300/45 bg-rose-500/12 text-rose-100",
};

function formatDateTime(value: string | null | undefined): string {
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

function formatNow(value: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

function AnnouncementModal({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: TenantAnnouncement[];
}) {
  React.useEffect(() => {
    if (!open) {
      return;
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-slate-950/65 p-3 sm:items-center sm:p-6">
      <div className="w-full max-w-3xl rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <h2 className="text-base font-black text-cyan-100 sm:text-lg">Duyuru Merkezi</h2>
            <p className="text-xs font-medium text-cyan-100/70">Güncel sistem, kampanya ve operasyon bildirimleri</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/25 px-3 py-1.5 text-xs font-bold text-cyan-50 transition hover:bg-white/10"
          >
            Kapat
          </button>
        </div>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-4 py-4">
          {items.length === 0 ? (
            <div className="rounded-xl border border-white/12 bg-white/5 px-3 py-4 text-sm text-cyan-100/80">
              Aktif duyuru bulunmuyor.
            </div>
          ) : null}
          {items.map((item) => (
            <article key={item.id} className={`rounded-xl border p-3 ${announcementToneClassMap[item.tone]}`}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {item.isPinned ? (
                  <span className="rounded-full border border-white/30 bg-white/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em]">
                    Sabit
                  </span>
                ) : null}
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/75">
                  {formatDateTime(item.publishAt)}
                </span>
              </div>
              <h3 className="text-sm font-black sm:text-base">{item.title}</h3>
              <p className="mt-1 text-sm leading-6 text-white/85">{item.message}</p>
              {item.buttonLabel && item.buttonUrl ? (
                <a
                  href={item.buttonUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex rounded-lg border border-white/35 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
                >
                  {item.buttonLabel}
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Topbar({
  companyName,
  tenantSlug = "demo-market",
  userName = "ADMIN",
  branchName = "MERKEZ",
  logoUrl,
  demoState,
  maintenanceState = null,
  updateNotice = null,
  announcements = [],
  onToggleSidebar,
}: TopbarProps) {
  const [announcementModalOpen, setAnnouncementModalOpen] = React.useState(false);
  const [clock, setClock] = React.useState(() => new Date());
  const [isOnline, setIsOnline] = React.useState(true);
  const announcementCount = announcements.length;

  React.useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    const updateConnectionState = () => setIsOnline(window.navigator.onLine);
    updateConnectionState();
    window.addEventListener("online", updateConnectionState);
    window.addEventListener("offline", updateConnectionState);
    return () => {
      window.removeEventListener("online", updateConnectionState);
      window.removeEventListener("offline", updateConnectionState);
    };
  }, []);

  return (
    <>
      <header
        className="border-b text-white shadow-[0_6px_22px_rgba(5,18,24,0.35)]"
        style={{
          borderColor: "var(--mx-border-strong)",
          background: "linear-gradient(to right, var(--mx-topbar-from), var(--mx-topbar-mid), var(--mx-topbar-to))",
        }}
      >
        <div className="grid gap-3 px-3 py-3 xl:grid-cols-[1fr_auto]">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onToggleSidebar}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-200/35 bg-slate-900/25 text-cyan-100 lg:hidden"
              aria-label="Menüyü aç"
            >
              ☰
            </button>

            {logoUrl ? (
              <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-lg border border-cyan-200/40 bg-slate-900/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt={`${companyName} logo`} className="h-full w-full object-contain" />
              </div>
            ) : (
              <div className="grid h-10 w-10 place-items-center rounded-lg border border-cyan-200/40 bg-cyan-300/10 text-sm font-black tracking-widest text-cyan-100">
                B3
              </div>
            )}

            <div className="min-w-0 rounded-lg border border-cyan-200/25 bg-slate-900/20 px-3 py-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100/80">Bey360 Panel</p>
              <p className="truncate text-sm font-black sm:text-base">{companyName}</p>
            </div>

            <div className="hidden flex-wrap items-center gap-2 md:flex">
              <Link
                href="/panel"
                className="rounded-lg border border-cyan-200/30 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/20"
              >
                Gösterge Paneli
              </Link>
              <Link
                href="/panel/ayarlar"
                className="rounded-lg border border-amber-200/50 bg-amber-300/20 px-3 py-2 text-sm font-semibold text-amber-50 transition hover:bg-amber-300/30"
              >
                Firma Ayarları
              </Link>
              <Link
                href="/pos"
                className="rounded-lg border border-emerald-200/50 bg-emerald-300/20 px-3 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-300/30"
              >
                Tam Ekran POS
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold sm:text-sm">
            <ThemeToggle />
            <div className="rounded-lg border border-cyan-200/30 bg-slate-950/30 px-3 py-2">{tenantSlug}</div>
            <div className="rounded-lg border border-cyan-200/30 bg-slate-950/30 px-3 py-2">{userName}</div>
            <div className="rounded-lg border border-cyan-200/30 bg-slate-950/30 px-3 py-2">Şube: {branchName}</div>
            <div
              className={`rounded-lg border px-3 py-2 ${
                isOnline
                  ? "border-emerald-200/40 bg-emerald-300/15 text-emerald-50"
                  : "border-rose-200/45 bg-rose-300/20 text-rose-50"
              }`}
            >
              {isOnline ? "Çevrim içi" : "Çevrim dışı"}
            </div>
            <div className="rounded-lg border border-cyan-200/30 bg-slate-950/30 px-3 py-2">{formatNow(clock)}</div>
            <button
              type="button"
              onClick={() => setAnnouncementModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-200/40 bg-amber-300/15 px-3 py-2 text-amber-50 transition hover:bg-amber-300/25"
              aria-label="Duyuruları aç"
            >
              Duyurular
              <span className="rounded-md border border-amber-200/45 bg-amber-300/20 px-2 py-0.5 text-xs font-black">
                {announcementCount}
              </span>
            </button>
            <LogoutButton
              endpoint="/api/auth/logout"
              redirectTo="/giris"
              label="Çıkış"
              className="h-9 rounded-lg border border-cyan-200/40 px-3 text-cyan-50 hover:bg-cyan-200/10"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-cyan-200/20 bg-slate-950/35 px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/75">Lisans ve Güncelleme</span>
          <div className="flex flex-wrap items-center gap-2">
            {updateNotice ? (
              <div
                className={`rounded-full border px-3 py-1 text-xs font-bold ${
                  updateNotice.isForce
                    ? "border-rose-300/70 bg-rose-500/20 text-rose-100"
                    : "border-fuchsia-300/60 bg-fuchsia-500/20 text-fuchsia-100"
                }`}
              >
                {updateNotice.isForce ? "Zorunlu" : "Güncelleme"}: v{updateNotice.version} - {updateNotice.title}
                {updateNotice.publishedAt ? ` (${updateNotice.publishedAt})` : ""}
              </div>
            ) : null}
            {maintenanceState?.enabled ? (
              <div className="max-w-[42rem] rounded-full border border-rose-300/75 bg-rose-500/25 px-3 py-1 text-xs font-bold text-rose-100">
                Bakım Modu: {maintenanceState.message}
              </div>
            ) : null}
            <div className={`rounded-full border px-3 py-1 text-sm font-bold ${demoToneClassMap[demoState.tone]}`}>
              {demoState.label}
              {demoState.dateLabel ? ` - ${demoState.dateLabel}` : ""}
            </div>
          </div>
        </div>
      </header>

      <AnnouncementModal open={announcementModalOpen} onClose={() => setAnnouncementModalOpen(false)} items={announcements} />
    </>
  );
}
