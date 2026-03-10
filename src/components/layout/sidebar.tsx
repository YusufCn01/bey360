"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { panelNavSections, type PanelIconKey } from "@/lib/navigation/panel-nav";
import { cn } from "@/lib/utils";

type SidebarProps = {
  companyName: string;
  logoUrl?: string;
};

function isPathActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function MenuIcon({ icon, className }: { icon: PanelIconKey; className: string }) {
  const sharedProps = {
    className: cn("h-4 w-4 shrink-0", className),
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  return (
    <svg {...sharedProps}>
      {icon === "dashboard" ? (
        <>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
        </>
      ) : null}
      {icon === "pos" ? (
        <>
          <path d="M4 5h16l-1.4 8.6a2 2 0 0 1-2 1.6H8a2 2 0 0 1-2-1.6L4.6 5" />
          <circle cx="9" cy="19" r="1.5" />
          <circle cx="16" cy="19" r="1.5" />
        </>
      ) : null}
      {icon === "product" ? (
        <>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M4 10h16M10 4v16" />
        </>
      ) : null}
      {icon === "warehouse" ? (
        <>
          <path d="M3 10l9-6 9 6v10H3z" />
          <path d="M9 20v-6h6v6" />
        </>
      ) : null}
      {icon === "customer" ? (
        <>
          <circle cx="12" cy="8" r="3" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </>
      ) : null}
      {icon === "supplier" ? (
        <>
          <path d="M4 19V7l8-3 8 3v12" />
          <path d="M9 19v-5h6v5" />
        </>
      ) : null}
      {icon === "invoice" ? (
        <>
          <path d="M7 3h10l3 3v15l-3-2-3 2-3-2-3 2-1-1V3z" />
          <path d="M9 9h6M9 13h6" />
        </>
      ) : null}
      {icon === "cash" ? (
        <>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M6 12h.01M18 12h.01" />
        </>
      ) : null}
      {icon === "payment" ? (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18M8 15h2" />
        </>
      ) : null}
      {icon === "einvoice" ? (
        <>
          <path d="M7 3h10l3 3v15H7z" />
          <path d="M10 12h7M10 16h7M10 8h2" />
          <circle cx="6" cy="16" r="2.5" />
        </>
      ) : null}
      {icon === "report" ? (
        <>
          <path d="M4 20V4M20 20H4" />
          <rect x="7" y="12" width="2.5" height="6" rx="0.5" />
          <rect x="11" y="9" width="2.5" height="9" rx="0.5" />
          <rect x="15" y="6" width="2.5" height="12" rx="0.5" />
        </>
      ) : null}
      {icon === "user" ? (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20a6 6 0 0 1 12 0" />
          <path d="M16 8h5M16 12h5M16 16h5" />
        </>
      ) : null}
      {icon === "subscription" ? (
        <>
          <path d="M3 8h18M6 4h12a2 2 0 0 1 2 2v14H4V6a2 2 0 0 1 2-2z" />
          <path d="M8 13h8M8 17h5" />
        </>
      ) : null}
      {icon === "history" ? (
        <>
          <path d="M4 11a8 8 0 1 1 2.3 5.6L4 19" />
          <path d="M12 7v5l3 2" />
        </>
      ) : null}
      {icon === "settings" ? (
        <>
          <circle cx="12" cy="12" r="3.2" />
          <path d="M19.5 12a7.5 7.5 0 0 0-.1-1l2-1.6-2-3.5-2.5.7a7 7 0 0 0-1.8-1L14.8 3h-5.6l-.3 2.6a7 7 0 0 0-1.8 1L4.6 5.9l-2 3.5 2 1.6a7.5 7.5 0 0 0 0 2l-2 1.6 2 3.5 2.5-.7a7 7 0 0 0 1.8 1l.3 2.6h5.6l.3-2.6a7 7 0 0 0 1.8-1l2.5.7 2-3.5-2-1.6c.1-.3.1-.6.1-1z" />
        </>
      ) : null}
    </svg>
  );
}

function getInitialSectionState(pathname: string) {
  const state: Record<string, boolean> = {};
  for (const section of panelNavSections) {
    const hasActiveItem = section.children.some((item) => isPathActive(pathname, item.href));
    state[section.id] = hasActiveItem || section.id === "ana-ekran";
  }
  return state;
}

export function Sidebar({ companyName, logoUrl }: SidebarProps) {
  const pathname = usePathname();
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>(() => getInitialSectionState(pathname));

  React.useEffect(() => {
    const activeStates = getInitialSectionState(pathname);
    setOpenSections((prev) => {
      const next = { ...prev };
      for (const [key, value] of Object.entries(activeStates)) {
        if (value) {
          next[key] = true;
        }
      }
      return next;
    });
  }, [pathname]);

  return (
    <aside
      className="sticky top-0 flex h-screen w-72 shrink-0 flex-col border-r text-white"
      style={{
        borderColor: "var(--mx-border-strong)",
        background: "linear-gradient(to bottom, var(--mx-sidebar-from), var(--mx-sidebar-to))",
      }}
    >
      <div className="border-b border-white/10 px-4 py-3">
        {logoUrl ? (
          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-cyan-300/35 bg-white/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt={`${companyName} logo`} className="h-full w-full object-contain" />
          </div>
        ) : null}
        <p className="text-3xl font-bold tracking-tight">{companyName}</p>
        <p className="text-xs uppercase tracking-[0.15em] text-cyan-200/80">Tek Marka ERP / POS</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-1">
        {panelNavSections.map((section) => {
          const sectionActive =
            isPathActive(pathname, section.href) || section.children.some((item) => isPathActive(pathname, item.href));
          const isOpen = openSections[section.id] ?? false;

          return (
            <div key={section.id} className="border-b border-white/10">
              <button
                type="button"
                onClick={() => setOpenSections((prev) => ({ ...prev, [section.id]: !isOpen }))}
                className={cn(
                  "flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold transition",
                  sectionActive ? "bg-white/16 text-cyan-100" : "text-white hover:bg-white/10",
                )}
              >
                <span className="flex items-center gap-3">
                  <MenuIcon icon={section.icon} className="text-cyan-200" />
                  {section.label}
                </span>
                <span className={cn("text-cyan-200 transition-transform", isOpen ? "rotate-180" : "rotate-0")}>▾</span>
              </button>

              <div className={cn("grid transition-all", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                <div className="overflow-hidden">
                  <div className="space-y-1 pb-2 pl-3 pr-2">
                    {section.children.map((item) => {
                      const itemActive = isPathActive(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition",
                            itemActive ? "bg-white/14 text-cyan-100" : "text-slate-200 hover:bg-white/10 hover:text-white",
                          )}
                        >
                          <MenuIcon icon={item.icon} className={itemActive ? "text-cyan-200" : "text-slate-300"} />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-white/10 px-4 py-4">
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="w-full rounded-sm border border-cyan-300/50 bg-slate-900/35 px-3 py-2 text-left text-sm font-semibold text-cyan-100 hover:bg-slate-900/55"
          >
            Çıkış
          </button>
        </form>
      </div>
    </aside>
  );
}
