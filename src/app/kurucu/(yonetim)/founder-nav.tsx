"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/kurucu", label: "Genel Durum" },
  { href: "/kurucu/bayi-basvurulari", label: "Bayi Başvuruları" },
  { href: "/kurucu/bayilikler", label: "Bayilikler" },
  { href: "/kurucu/lisanslar", label: "Lisanslar" },
  { href: "/kurucu/duyurular", label: "Duyurular" },
  { href: "/kurucu/guncellemeler", label: "Güncellemeler" },
  { href: "/kurucu/bakim-modu", label: "Bakım Modu" },
];

function isActive(pathname: string, href: string) {
  if (href === "/kurucu") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function FounderNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[color:var(--mx-border)] bg-[color:var(--mx-surface)] p-2">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "rounded-lg border px-3 py-2 text-sm font-semibold transition",
            isActive(pathname, item.href)
              ? "border-cyan-300/60 bg-cyan-700/90 text-white"
              : "border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] text-[color:var(--mx-text)] hover:bg-[color:var(--mx-surface)]",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
