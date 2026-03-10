import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

type DemoStateTone = "ok" | "warn" | "danger" | "neutral";

type DemoState = {
  label: string;
  dateLabel?: string;
  tone: DemoStateTone;
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
};

const demoToneClassMap: Record<DemoStateTone, string> = {
  ok: "border-emerald-300/70 bg-emerald-500/15 text-emerald-100",
  warn: "border-amber-300/70 bg-amber-500/15 text-amber-100",
  danger: "border-rose-300/70 bg-rose-500/20 text-rose-100",
  neutral: "border-cyan-200/50 bg-cyan-400/10 text-cyan-100",
};

export function Topbar({
  companyName,
  tenantSlug = "demo-market",
  userName = "ADMIN",
  branchName = "MERKEZ",
  logoUrl,
  demoState,
  maintenanceState = null,
  updateNotice = null,
}: TopbarProps) {
  return (
    <header
      className="border-b text-white shadow-[0_6px_22px_rgba(5,18,24,0.35)]"
      style={{
        borderColor: "var(--mx-border-strong)",
        background: "linear-gradient(to right, var(--mx-topbar-from), var(--mx-topbar-mid), var(--mx-topbar-to))",
      }}
    >
      <div className="flex flex-col gap-3 px-3 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {logoUrl ? (
            <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-lg border border-cyan-200/40 bg-slate-900/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt={`${companyName} logo`} className="h-full w-full object-contain" />
            </div>
          ) : (
            <div className="grid h-9 w-9 place-items-center rounded-lg border border-cyan-200/40 bg-cyan-300/10 text-sm font-black tracking-widest text-cyan-100">
              MX
            </div>
          )}

          <div className="mr-2 rounded-lg border border-cyan-200/25 bg-slate-900/20 px-3 py-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100/80">Tek Marka Panel</p>
            <p className="text-sm font-bold">{companyName}</p>
          </div>

          <Link
            href="/panel"
            className="rounded-lg border border-cyan-200/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/20"
          >
            Gösterge Paneli
          </Link>
          <Link
            href="/panel/ayarlar"
            className="rounded-lg border border-amber-200/50 bg-amber-300/20 px-4 py-2 text-sm font-semibold text-amber-50 transition hover:bg-amber-300/30"
          >
            Firma Ayarları
          </Link>
          <Link
            href="/pos"
            className="rounded-lg border border-emerald-200/50 bg-emerald-300/20 px-4 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-300/30"
          >
            Tam Ekran POS
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          <ThemeToggle />
          <div className="rounded-lg border border-cyan-200/30 bg-slate-950/30 px-3 py-2 text-cyan-100/90">{tenantSlug}</div>
          <div className="rounded-lg border border-cyan-200/30 bg-slate-950/30 px-3 py-2">{userName}</div>
          <div className="rounded-lg border border-cyan-200/30 bg-slate-950/30 px-3 py-2">Şube: {branchName}</div>
          <div className="rounded-lg border border-amber-200/40 bg-amber-300/15 px-3 py-2 text-amber-50">Duyurular</div>
          <form action="/api/auth/logout" method="post">
            <Button
              type="submit"
              variant="ghost"
              className="h-9 rounded-lg border border-cyan-200/40 px-3 text-cyan-50 hover:bg-cyan-200/10"
            >
              Çıkış
            </Button>
          </form>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-cyan-200/20 bg-slate-950/35 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/75">Lisans ve Guncelleme</span>
        <div className="flex flex-wrap items-center gap-2">
          {updateNotice ? (
            <div
              className={`rounded-full border px-3 py-1 text-xs font-bold ${
                updateNotice.isForce
                  ? "border-rose-300/70 bg-rose-500/20 text-rose-100"
                  : "border-fuchsia-300/60 bg-fuchsia-500/20 text-fuchsia-100"
              }`}
            >
              {updateNotice.isForce ? "Zorunlu" : "Guncelleme"}: v{updateNotice.version} - {updateNotice.title}
              {updateNotice.publishedAt ? ` (${updateNotice.publishedAt})` : ""}
            </div>
          ) : null}
          {maintenanceState?.enabled ? (
            <div className="max-w-[42rem] rounded-full border border-rose-300/75 bg-rose-500/25 px-3 py-1 text-xs font-bold text-rose-100">
              Bakim Modu: {maintenanceState.message}
            </div>
          ) : null}
          <div className={`rounded-full border px-3 py-1 text-sm font-bold ${demoToneClassMap[demoState.tone]}`}>
            {demoState.label}
            {demoState.dateLabel ? ` - ${demoState.dateLabel}` : ""}
          </div>
        </div>
      </div>
    </header>
  );
}
