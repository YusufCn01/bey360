import type { Prisma } from "@prisma/client";

export type DealerApplicationStatus = "pending" | "reviewing" | "approved" | "rejected";

export type DealerApplicationTimelineItem = {
  status: DealerApplicationStatus;
  at: string;
  by: string;
  note: string | null;
};

export type DealerApplicationPayload = {
  companyName: string;
  tradeName: string | null;
  taxNumber: string;
  contactFirstName: string;
  contactLastName: string;
  contactTitle: string | null;
  phone: string;
  email: string;
  city: string;
  district: string | null;
  address: string | null;
  note: string | null;
  requestedPlan: "starter" | "standard" | "professional" | "enterprise" | "custom";
  branchCount: number;
  monthlySalesTarget: number | null;
  submittedAt: string;
  source: "public-form" | "manual";
  timeline: DealerApplicationTimelineItem[];
  tenantId?: string;
  tenantSlug?: string;
  ownerEmail?: string;
  ownerPasswordGeneratedAt?: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNullableText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return value;
}

function isPlanCode(value: string): value is DealerApplicationPayload["requestedPlan"] {
  return ["starter", "standard", "professional", "enterprise", "custom"].includes(value);
}

function isStatus(value: string): value is DealerApplicationStatus {
  return ["pending", "reviewing", "approved", "rejected"].includes(value);
}

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "").slice(-12);
}

export function maskPhone(value: string): string {
  const digits = normalizePhone(value);
  if (digits.length < 6) {
    return "***";
  }
  return `${digits.slice(0, 3)}****${digits.slice(-3)}`;
}

export function slugifyForTenant(value: string): string {
  const map: Record<string, string> = {
    ç: "c",
    Ç: "c",
    ğ: "g",
    Ğ: "g",
    ı: "i",
    İ: "i",
    ö: "o",
    Ö: "o",
    ş: "s",
    Ş: "s",
    ü: "u",
    Ü: "u",
  };

  return value
    .split("")
    .map((char) => map[char] ?? char)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

export function buildDealerApplicationNumber(now = new Date()): string {
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, "0");
  const d = `${now.getDate()}`.padStart(2, "0");
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `BASVURU-${y}${m}${d}-${random}`;
}

export function parseDealerApplicationStatus(value: string): DealerApplicationStatus {
  return isStatus(value) ? value : "pending";
}

export function parseDealerApplicationPayload(payload: Prisma.JsonValue | null | undefined): DealerApplicationPayload {
  const raw = asRecord(payload);
  const planText = asText(raw.requestedPlan);
  const timelineRaw = Array.isArray(raw.timeline) ? raw.timeline : [];
  const timeline: DealerApplicationTimelineItem[] = timelineRaw
    .map((item) => {
      const row = asRecord(item);
      const status = parseDealerApplicationStatus(asText(row.status));
      const at = asText(row.at);
      const by = asText(row.by);
      if (!at || !by) {
        return null;
      }
      return {
        status,
        at,
        by,
        note: asNullableText(row.note),
      };
    })
    .filter((item): item is DealerApplicationTimelineItem => item !== null);

  return {
    companyName: asText(raw.companyName),
    tradeName: asNullableText(raw.tradeName),
    taxNumber: asText(raw.taxNumber),
    contactFirstName: asText(raw.contactFirstName),
    contactLastName: asText(raw.contactLastName),
    contactTitle: asNullableText(raw.contactTitle),
    phone: asText(raw.phone),
    email: asText(raw.email),
    city: asText(raw.city),
    district: asNullableText(raw.district),
    address: asNullableText(raw.address),
    note: asNullableText(raw.note),
    requestedPlan: isPlanCode(planText) ? planText : "starter",
    branchCount: Math.max(1, Math.round(asNumber(raw.branchCount, 1))),
    monthlySalesTarget: raw.monthlySalesTarget == null ? null : Math.max(0, asNumber(raw.monthlySalesTarget, 0)),
    submittedAt: asText(raw.submittedAt),
    source: asText(raw.source) === "manual" ? "manual" : "public-form",
    timeline,
    tenantId: asNullableText(raw.tenantId) ?? undefined,
    tenantSlug: asNullableText(raw.tenantSlug) ?? undefined,
    ownerEmail: asNullableText(raw.ownerEmail) ?? undefined,
    ownerPasswordGeneratedAt: asNullableText(raw.ownerPasswordGeneratedAt) ?? undefined,
  };
}
