import type { TenantPlanCode } from "@/lib/subscription/limits";

export const PANEL_MODULE_CODES = [
  "dashboard",
  "pos",
  "product",
  "inventory",
  "customer",
  "supplier",
  "invoice",
  "finance",
  "payment",
  "einvoice",
  "report",
  "user",
  "support",
  "subscription",
  "history",
  "settings",
] as const;

export type PanelModuleCode = (typeof PANEL_MODULE_CODES)[number];
export type PanelModuleAccess = Record<PanelModuleCode, boolean>;

export const PANEL_MODULE_LABELS: Record<PanelModuleCode, string> = {
  dashboard: "Gösterge Paneli",
  pos: "Hızlı Satış",
  product: "Ürünler",
  inventory: "Stok",
  customer: "Müşteriler",
  supplier: "Tedarikçiler",
  invoice: "İrsaliye / Fatura",
  finance: "Kasa / Banka",
  payment: "Ödeme Sistemi",
  einvoice: "e-Fatura / e-Arşiv",
  report: "Raporlar",
  user: "Kullanıcılar",
  support: "Destek Merkezi",
  subscription: "Lisans ve Abonelik",
  history: "İşlem Geçmişi",
  settings: "Ayarlar",
};

export const PLAN_MODULE_ACCESS: Record<TenantPlanCode, readonly PanelModuleCode[]> = {
  starter: ["dashboard", "pos", "product", "inventory", "customer", "report", "subscription", "settings"],
  standard: [
    "dashboard",
    "pos",
    "product",
    "inventory",
    "customer",
    "supplier",
    "invoice",
    "finance",
    "payment",
    "report",
    "subscription",
    "history",
    "settings",
  ],
  professional: [
    "dashboard",
    "pos",
    "product",
    "inventory",
    "customer",
    "supplier",
    "invoice",
    "finance",
    "payment",
    "einvoice",
    "report",
    "user",
    "support",
    "subscription",
    "history",
    "settings",
  ],
  enterprise: PANEL_MODULE_CODES,
  custom: PANEL_MODULE_CODES,
};

const CANCELLED_MODULE_ACCESS: readonly PanelModuleCode[] = ["dashboard", "subscription", "settings"];

export function normalizePlanCode(planCode: string | null | undefined): TenantPlanCode {
  if (
    planCode === "starter" ||
    planCode === "standard" ||
    planCode === "professional" ||
    planCode === "enterprise" ||
    planCode === "custom"
  ) {
    return planCode;
  }

  return "starter";
}

export function createModuleAccessMap(enabledModules: Iterable<PanelModuleCode>): PanelModuleAccess {
  const enabledSet = new Set(enabledModules);
  return PANEL_MODULE_CODES.reduce((acc, moduleCode) => {
    acc[moduleCode] = enabledSet.has(moduleCode);
    return acc;
  }, {} as PanelModuleAccess);
}

export function getPlanModuleAccess(planCode: string | null | undefined): PanelModuleAccess {
  return createModuleAccessMap(PLAN_MODULE_ACCESS[normalizePlanCode(planCode)]);
}

export function getCancelledModuleAccess(): PanelModuleAccess {
  return createModuleAccessMap(CANCELLED_MODULE_ACCESS);
}

export function mergeModuleAccessWithOverrides(
  base: PanelModuleAccess,
  overrides: Array<{ code: string; isEnabled: boolean }>,
): PanelModuleAccess {
  const next = { ...base };
  for (const override of overrides) {
    if (PANEL_MODULE_CODES.includes(override.code as PanelModuleCode)) {
      next[override.code as PanelModuleCode] = override.isEnabled;
    }
  }
  return next;
}

export function resolvePanelModuleFromPath(pathname: string): PanelModuleCode | null {
  if (pathname === "/panel" || pathname.startsWith("/panel?")) {
    return "dashboard";
  }

  if (pathname === "/pos" || pathname.startsWith("/pos/") || pathname.startsWith("/pos?")) {
    return "pos";
  }

  if (!pathname.startsWith("/panel/")) {
    return null;
  }

  const rest = pathname.slice("/panel/".length);
  const firstSegment = rest.split("/")[0]?.split("?")[0] ?? "";

  switch (firstSegment) {
    case "pos":
      return "pos";
    case "urunler":
      return "product";
    case "stok":
      return "inventory";
    case "musteriler":
      return "customer";
    case "tedarikciler":
      return "supplier";
    case "fatura":
      return "invoice";
    case "kasa":
      return "finance";
    case "odeme":
      return "payment";
    case "e-fatura":
      return "einvoice";
    case "raporlar":
      return "report";
    case "kullanicilar":
      return "user";
    case "destek":
      return "support";
    case "abonelik":
      return "subscription";
    case "islem-gecmisi":
      return "history";
    case "ayarlar":
      return "settings";
    default:
      return null;
  }
}
