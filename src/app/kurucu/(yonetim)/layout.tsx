import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getFounderSessionFromCookies } from "@/lib/auth/founder-session";
import { FounderNav } from "@/app/kurucu/(yonetim)/founder-nav";

export default async function FounderLayout({ children }: { children: ReactNode }) {
  const session = await getFounderSessionFromCookies();
  if (!session) {
    redirect("/kurucu/giris");
  }

  return (
    <div className="mx-panel-shell min-h-screen p-3">
      <header
        className="mb-4 rounded-xl border px-3 py-3 text-white shadow-[0_8px_26px_rgba(3,21,29,0.28)]"
        style={{
          borderColor: "var(--mx-border-strong)",
          background: "linear-gradient(115deg, var(--mx-topbar-from), var(--mx-topbar-mid), var(--mx-topbar-to))",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg border border-cyan-300/40 bg-slate-900/35 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/80">Kurucu Paneli</p>
              <p className="text-base font-bold">Bey360 Platform Yonetimi</p>
            </div>
            <Link
              href="/panel"
              className="rounded-lg border border-emerald-200/40 bg-emerald-300/15 px-3 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-300/25"
            >
              Musteri Paneline Don
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <ThemeToggle />
            <div className="rounded-lg border border-cyan-200/35 bg-slate-950/35 px-3 py-2">
              {session.fullName}
            </div>
            <div className="rounded-lg border border-cyan-200/35 bg-slate-950/35 px-3 py-2">{session.email}</div>
            <form action="/api/founder/auth/logout" method="post">
              <button
                type="submit"
                className="h-9 rounded-lg border border-cyan-200/35 bg-slate-950/30 px-3 text-sm font-semibold text-cyan-50 hover:bg-slate-950/45"
              >
                Cikis
              </button>
            </form>
          </div>
        </div>
      </header>

      <FounderNav />

      <main>{children}</main>

      <footer className="mt-4 rounded-lg border border-[color:var(--mx-border)] bg-[color:var(--mx-surface)] px-3 py-2 text-sm font-semibold text-[color:var(--mx-text-muted)]">
        Copyright (c) 2026 Bey360 Kurucu Paneli
      </footer>
    </div>
  );
}

