"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { findFeatureByPath } from "@/lib/navigation/panel-nav";

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

type ConnectionState = "ok" | "degraded" | "down";

type ConnectionStatusResponse = {
  success: boolean;
  data: {
    sql: {
      status: ConnectionState;
      source?: string;
      host?: string;
      error?: string;
    };
    cloud: {
      status: ConnectionState;
      url?: string;
      httpStatus?: number;
      error?: string;
    };
  };
};

function formatNow(value: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function toneBadgeClass(tone: AnnouncementTone) {
  if (tone === "success") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  }
  if (tone === "warning") {
    return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  }
  if (tone === "danger") {
    return "border-rose-400/30 bg-rose-400/10 text-rose-200";
  }
  return "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";
}

function resolveBreadcrumb(pathname: string) {
  if (pathname === "/panel" || pathname.startsWith("/panel?")) {
    return {
      root: "Dashboard",
      current: "KPI Özeti",
    };
  }

  if (pathname === "/pos" || pathname.startsWith("/pos")) {
    return {
      root: "Operasyon",
      current: "Hızlı Satış",
    };
  }

  const parts = pathname.split("/").filter(Boolean);
  if (parts.length >= 3 && parts[0] === "panel") {
    const feature = findFeatureByPath(parts[1], parts[2]);
    if (feature) {
      return {
        root: feature.section.label,
        current: feature.feature.label,
      };
    }
  }

  return {
    root: "Panel",
    current: "Genel Görünüm",
  };
}

function statusBadgeClass(status: ConnectionState) {
  if (status === "ok") {
    return "border-emerald-400/40 bg-emerald-400/15 text-emerald-200";
  }
  if (status === "degraded") {
    return "border-amber-400/40 bg-amber-400/15 text-amber-200";
  }
  return "border-rose-400/45 bg-rose-400/15 text-rose-200";
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
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-[#254062] bg-[#0a182c] text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1b3250] px-4 py-3">
          <h2 className="text-base font-black">Sistem Duyuruları</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#2a4568] bg-[#122844] px-3 py-1 text-xs font-semibold hover:bg-[#183459]"
          >
            Kapat
          </button>
        </div>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="rounded-lg border border-[#2a4568] bg-[#10243e] px-3 py-3 text-sm text-slate-300">
              Aktif duyuru bulunmuyor.
            </p>
          ) : null}
          {items.map((item) => (
            <article key={item.id} className="rounded-lg border border-[#2a4568] bg-[#0f2340] px-3 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-white">{item.title}</p>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase ${toneBadgeClass(item.tone)}`}>
                  {item.tone}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-300">{item.message}</p>
              {item.publishAt ? <p className="mt-2 text-xs text-slate-400">Yayın: {item.publishAt}</p> : null}
              {item.buttonLabel && item.buttonUrl ? (
                <a
                  href={item.buttonUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex rounded-md border border-cyan-500/60 px-2 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/10"
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
  tenantSlug = "demo-market",
  userName = "ADMIN",
  branchName = "MERKEZ",
  updateNotice,
  announcements = [],
  onToggleSidebar,
}: TopbarProps) {
  const pathname = usePathname();
  const [announcementModalOpen, setAnnouncementModalOpen] = React.useState(false);
  const [now, setNow] = React.useState(() => new Date());
  const [connectionStatus, setConnectionStatus] = React.useState<ConnectionStatusResponse["data"] | null>(null);
  const breadcrumb = React.useMemo(() => resolveBreadcrumb(pathname), [pathname]);

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const response = await fetch("/api/system/connection-status", { cache: "no-store" });
        const body = (await response.json()) as ConnectionStatusResponse;
        if (!cancelled && body?.data) {
          setConnectionStatus(body.data);
        }
      } catch {
        if (!cancelled) {
          setConnectionStatus({
            sql: {
              status: "down",
              source: "N/A",
              host: "-",
              error: "SQL durum bilgisi alinamadi",
            },
            cloud: {
              status: "down",
              error: "Bulut durum bilgisi alinamadi",
            },
          });
        }
      }
    }

    void loadStatus();
    const poll = window.setInterval(() => void loadStatus(), 20_000);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[#1b2f4a] bg-[#081527]/95 text-slate-100 backdrop-blur">
        <div className="flex min-h-[66px] items-center justify-between gap-3 px-3 md:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onToggleSidebar}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#29466b] bg-[#10243f] text-lg font-black text-slate-200 lg:hidden"
              aria-label="Menüyü aç"
            >
              ≡
            </button>
            <div className="hidden items-center gap-2 md:flex">
              <span className="text-sm font-semibold text-slate-400">{breadcrumb.root}</span>
              <span className="text-slate-600">›</span>
              <span className="text-sm font-black text-slate-100">{breadcrumb.current}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="hidden items-center gap-2 xl:flex">
              <div className="rounded-md border border-[#213a5c] bg-[#0f233d] px-2.5 py-1.5 text-xs text-slate-300">
                Firma: <span className="font-bold text-slate-100">{tenantSlug}</span>
              </div>
              <div className="rounded-md border border-[#213a5c] bg-[#0f233d] px-2.5 py-1.5 text-xs text-slate-300">
                Şube: <span className="font-bold text-slate-100">{branchName}</span>
              </div>
              <div className="rounded-md border border-[#213a5c] bg-[#0f233d] px-2.5 py-1.5 text-xs text-slate-300">
                {formatNow(now)}
              </div>
            </div>

            {connectionStatus ? (
              <div className="hidden items-center gap-2 md:flex">
                <div
                  className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold ${statusBadgeClass(connectionStatus.sql.status)}`}
                  title={connectionStatus.sql.error || connectionStatus.sql.host || "SQL baglantisi"}
                >
                  SQL: {connectionStatus.sql.status.toUpperCase()}
                </div>
                <div
                  className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold ${statusBadgeClass(connectionStatus.cloud.status)}`}
                  title={connectionStatus.cloud.error || connectionStatus.cloud.url || "Bulut baglantisi"}
                >
                  Bulut: {connectionStatus.cloud.status.toUpperCase()}
                </div>
              </div>
            ) : null}

            <ThemeToggle />

            <button
              type="button"
              onClick={() => setAnnouncementModalOpen(true)}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#213a5c] bg-[#0f233d] text-slate-300 hover:text-white"
              aria-label="Duyuruları aç"
              title="Duyurular"
            >
              🔔
              {announcements.length > 0 ? <span className="absolute right-1 top-1 inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" /> : null}
            </button>

            <div className="hidden rounded-md border border-[#213a5c] bg-[#0f233d] px-2 py-1 text-xs text-slate-300 lg:block">
              Kasiyer: <span className="font-bold text-slate-100">{userName}</span>
            </div>

            <Link
              href="/pos"
              className="inline-flex h-9 items-center rounded-md bg-[#0393e5] px-3 text-sm font-black text-white hover:bg-[#0283cb]"
            >
              POS Ekranı
            </Link>
          </div>
        </div>

        {updateNotice ? (
          <div className="border-t border-[#1b2f4a] bg-[#061327] px-3 py-2 md:px-5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-md bg-[#0197e8] px-2 py-1 font-black text-white">Lisans & Güncelleme</span>
              <span className="font-bold text-slate-100">v{updateNotice.version}</span>
              <span className="text-slate-300">{updateNotice.title}</span>
              {updateNotice.publishedAt ? <span className="text-slate-500">{updateNotice.publishedAt}</span> : null}
            </div>
          </div>
        ) : null}
      </header>

      <AnnouncementModal open={announcementModalOpen} onClose={() => setAnnouncementModalOpen(false)} items={announcements} />
    </>
  );
}
