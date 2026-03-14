"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/layout/logout-button";
import { panelNavSections } from "@/lib/navigation/panel-nav";
import type { PanelModuleAccess, PanelModuleCode } from "@/lib/subscription/module-access";

type SidebarProps = {
  companyName: string;
  logoUrl?: string;
  className?: string;
  onNavigate?: () => void;
  moduleAccess?: PanelModuleAccess;
  tenantSlug?: string;
  userName?: string;
};

type GroupConfig = {
  title: string;
  sectionIds: string[];
};

const GROUPS: GroupConfig[] = [
  { title: "ANA MENÜ", sectionIds: ["ana-ekran"] },
  {
    title: "OPERASYON",
    sectionIds: [
      "hizli-satis",
      "urunler",
      "stok",
      "musteriler",
      "tedarikciler",
      "irsaliye-fatura",
      "kasa-banka",
      "odeme-sistemi",
      "e-donusum",
      "raporlar",
    ],
  },
  {
    title: "SİSTEM",
    sectionIds: ["kullanicilar", "destek-merkezi", "lisans-abonelik", "islem-gecmisi", "ayarlar"],
  },
];

function iconForModule(moduleCode: PanelModuleCode): string {
  const map: Record<PanelModuleCode, string> = {
    dashboard: "▦",
    pos: "⚡",
    product: "◈",
    inventory: "▥",
    customer: "◎",
    supplier: "◉",
    invoice: "🧾",
    finance: "₺",
    payment: "⧉",
    einvoice: "✉",
    report: "◫",
    user: "👤",
    subscription: "★",
    history: "⏱",
    settings: "⚙",
    support: "✆",
  };
  return map[moduleCode] ?? "•";
}

function isPathActive(pathname: string, href: string) {
  if (href === "/panel") {
    return pathname === "/panel";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initialsFromName(name: string) {
  const chunks = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (chunks.length === 0) {
    return "OW";
  }
  return chunks
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Sidebar({
  companyName,
  logoUrl,
  className,
  onNavigate,
  moduleAccess,
  tenantSlug = "demo-market",
  userName = "Owner",
}: SidebarProps) {
  const pathname = usePathname();
  const initials = React.useMemo(() => initialsFromName(userName), [userName]);
  const [collapsedSectionIds, setCollapsedSectionIds] = React.useState<Set<string>>(new Set());

  const visibleSections = React.useMemo(() => panelNavSections, []);

  const activeSectionIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const section of visibleSections) {
      if (isPathActive(pathname, section.href)) {
        ids.add(section.id);
        continue;
      }

      if (section.children.some((child) => isPathActive(pathname, child.href))) {
        ids.add(section.id);
      }
    }
    return ids;
  }, [pathname, visibleSections]);

  function toggleSection(sectionId: string) {
    setCollapsedSectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }

  return (
    <aside className={cn("flex min-h-0 shrink-0 flex-col border-r border-[#1b2a42] bg-[#071326] text-slate-100", className)}>
      <div className="border-b border-[#1b2a42] px-4 py-4">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <div className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-cyan-300/35 bg-[#10253f]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt={`${companyName} logo`} className="h-full w-full object-contain" />
            </div>
          ) : (
            <div className="grid h-10 w-10 place-items-center rounded-md bg-[#1f7df4] text-base font-black text-white">B</div>
          )}
          <div className="min-w-0">
            <p className="truncate text-[30px] font-black leading-none text-white">{companyName}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-400">ERP PLATFORMU</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {GROUPS.map((group) => {
          const sections = group.sectionIds
            .map((id) => visibleSections.find((section) => section.id === id))
            .filter((section): section is NonNullable<typeof section> => Boolean(section));

          if (sections.length === 0) {
            return null;
          }

          return (
            <div key={group.title} className="mb-5">
              <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{group.title}</p>
              <div className="space-y-2">
                {sections.map((section) => {
                  const sectionActive = activeSectionIds.has(section.id);
                  const isCollapsed = collapsedSectionIds.has(section.id);
                  const expanded = sectionActive || !isCollapsed;
                  const allowed = moduleAccess ? moduleAccess[section.moduleCode] !== false : true;

                  return (
                    <div key={section.id} className="space-y-1">
                      <div
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-[15px] font-semibold",
                          sectionActive
                            ? "border-[#1f6ed8] bg-[#0f2e56] text-[#7cc8ff]"
                            : allowed
                              ? "border-[#1f3150] bg-[#0c1d35] text-slate-200"
                              : "border-[#3a2f44] bg-[#1b1827] text-slate-400",
                        )}
                      >
                        <Link href={section.href} onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="inline-flex w-4 items-center justify-center text-[13px]">{iconForModule(section.moduleCode)}</span>
                          <span className="truncate">{section.label}</span>
                          {!allowed ? <span className="ml-1 text-xs text-amber-300">🔒</span> : null}
                        </Link>
                        <button
                          type="button"
                          className="inline-flex h-6 w-6 items-center justify-center rounded text-xs text-slate-300 hover:bg-[#173a64]"
                          onClick={() => toggleSection(section.id)}
                          aria-label={`${section.label} alt menü`}
                        >
                          {expanded ? "▾" : "▸"}
                        </button>
                      </div>

                      {expanded ? (
                        <div className="space-y-1 pl-8">
                          {section.children.map((feature) => {
                            const active = isPathActive(pathname, feature.href);
                            return (
                              <Link
                                key={feature.href}
                                href={feature.href}
                                onClick={onNavigate}
                                className={cn(
                                  "flex items-center rounded-md px-2 py-1.5 text-[14px] font-medium transition",
                                  active
                                    ? "bg-[#143a66] text-cyan-200"
                                    : "text-slate-300 hover:bg-[#10243f] hover:text-white",
                                )}
                              >
                                {feature.label}
                              </Link>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-[#1b2a42] p-3">
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-[#1f3150] bg-[#0c1d35] px-2 py-2">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#3b5477] bg-[#1b2f4d] text-xs font-black text-slate-200">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-100">{userName}</p>
            <p className="truncate text-xs text-slate-400">{tenantSlug}</p>
          </div>
        </div>

        <LogoutButton
          endpoint="/api/auth/logout"
          redirectTo="/giris"
          label="Çıkış"
          className="w-full rounded-md border border-[#2a4568] bg-[#0f233d] px-3 py-2 text-left text-sm font-semibold text-slate-200 hover:bg-[#153056]"
        />
      </div>
    </aside>
  );
}
