"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { PANEL_MODULE_LABELS, resolvePanelModuleFromPath, type PanelModuleAccess } from "@/lib/subscription/module-access";

type DemoState = {
  label: string;
  dateLabel?: string;
  tone: "ok" | "warn" | "danger" | "neutral";
};

type MaintenanceState = {
  enabled: boolean;
  message: string;
} | null;

type UpdateNotice = {
  version: string;
  title: string;
  isForce: boolean;
  publishedAt?: string;
} | null;

type TenantAnnouncement = {
  id: string;
  title: string;
  message: string;
  tone: "info" | "success" | "warning" | "danger";
  buttonLabel?: string | null;
  buttonUrl?: string | null;
  publishAt?: string | null;
  isPinned?: boolean;
};

type PanelShellProps = {
  children: React.ReactNode;
  companyName: string;
  tenantSlug: string;
  userName: string;
  branchName: string;
  logoUrl?: string;
  demoState: DemoState;
  maintenanceState: MaintenanceState;
  updateNotice: UpdateNotice;
  announcements?: TenantAnnouncement[];
  moduleAccess: PanelModuleAccess;
};

export function PanelShell({
  children,
  companyName,
  tenantSlug,
  userName,
  branchName,
  logoUrl,
  demoState,
  maintenanceState,
  updateNotice,
  announcements = [],
  moduleAccess,
}: PanelShellProps) {
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  const blockedModuleCode = React.useMemo(() => {
    const moduleCode = resolvePanelModuleFromPath(pathname);
    if (!moduleCode) {
      return null;
    }
    if (moduleAccess[moduleCode]) {
      return null;
    }
    return moduleCode;
  }, [moduleAccess, pathname]);

  React.useEffect(() => {
    if (!mobileSidebarOpen) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileSidebarOpen]);

  return (
    <div className="mx-panel-shell flex min-h-screen">
      <div className="hidden lg:block">
        <Sidebar
          companyName={companyName}
          logoUrl={logoUrl}
          className="sticky top-0 h-screen w-72"
          moduleAccess={moduleAccess}
        />
      </div>

      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Panel menüsü">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/65"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Menüyü kapat"
          />
          <div className="absolute inset-y-0 left-0 w-[86vw] max-w-[340px]">
            <Sidebar
              companyName={companyName}
              logoUrl={logoUrl}
              className="h-full w-full"
              onNavigate={() => setMobileSidebarOpen(false)}
              moduleAccess={moduleAccess}
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          companyName={companyName}
          tenantSlug={tenantSlug}
          userName={userName}
          branchName={branchName}
          logoUrl={logoUrl}
          demoState={demoState}
          maintenanceState={maintenanceState}
          updateNotice={updateNotice}
          announcements={announcements}
          onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        />
        <main className="flex-1 overflow-y-auto p-2 sm:p-3 lg:p-4">
          {blockedModuleCode ? (
            <section className="mx-auto w-full max-w-2xl rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-900 shadow-sm">
              <h2 className="text-xl font-black">Modül Lisans Kapsamı Dışında</h2>
              <p className="mt-2 text-sm font-semibold">
                {PANEL_MODULE_LABELS[blockedModuleCode]} modülü mevcut lisans paketinde kapalı.
              </p>
              <p className="mt-1 text-xs text-amber-700">
                Kurucu panelinden modülü açabilir veya plan yükselterek bu ekrana erişimi aktif edebilirsiniz.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/panel/abonelik"
                  className="rounded-md border border-amber-400 bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-200"
                >
                  Abonelik ve Lisans
                </Link>
                <Link
                  href="/panel"
                  className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface)] px-3 py-2 text-sm font-semibold text-[color:var(--mx-text)]"
                >
                  Ana Panele Dön
                </Link>
              </div>
            </section>
          ) : (
            children
          )}
        </main>
        <footer
          className="border-t px-3 py-2 text-xs font-semibold sm:px-4 sm:text-sm"
          style={{
            borderColor: "var(--mx-border-strong)",
            backgroundColor: "color-mix(in srgb, var(--mx-topbar-to) 88%, black 12%)",
            color: "color-mix(in srgb, var(--mx-text) 90%, white 35%)",
          }}
        >
          Copyright (c) 2026 {companyName}
        </footer>
      </div>
    </div>
  );
}
