"use client";

import * as React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

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
}: PanelShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

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
        <Sidebar companyName={companyName} logoUrl={logoUrl} className="sticky top-0 h-screen w-72" />
      </div>

      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Panel menusu">
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
          onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        />
        <main className="flex-1 overflow-y-auto p-2 sm:p-3 lg:p-4">{children}</main>
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
