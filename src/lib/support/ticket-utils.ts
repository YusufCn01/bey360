import { asRecord } from "@/lib/json";

export type SupportPriority = "low" | "normal" | "high" | "urgent";
export type SupportStatus = "open" | "pending" | "closed";
export type SupportMessageAuthorType = "tenant" | "founder";

export type SupportTicketPayload = {
  priority: SupportPriority;
  channel: "panel";
  openedAt: string | null;
  openedByUserId: string | null;
  openedByEmail: string | null;
  assignedFounderId: string | null;
  assignedFounderName: string | null;
  unreadForTenant: number;
  unreadForFounder: number;
  messageCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastMessageAuthorType: SupportMessageAuthorType | null;
  firstFounderResponseAt: string | null;
  firstResponseDueAt: string | null;
};

const supportPrioritySet = new Set<SupportPriority>(["low", "normal", "high", "urgent"]);
const supportStatusSet = new Set<SupportStatus>(["open", "pending", "closed"]);

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asInteger(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.trunc(parsed));
    }
  }
  return fallback;
}

export function normalizeSupportPriority(value: unknown, fallback: SupportPriority = "normal"): SupportPriority {
  return supportPrioritySet.has(value as SupportPriority) ? (value as SupportPriority) : fallback;
}

export function normalizeSupportStatus(value: unknown, fallback: SupportStatus = "open"): SupportStatus {
  return supportStatusSet.has(value as SupportStatus) ? (value as SupportStatus) : fallback;
}

export function parseSupportTicketPayload(value: unknown): SupportTicketPayload {
  const payload = asRecord(value);
  const lastMessageAuthorType = asText(payload.lastMessageAuthorType);

  return {
    priority: normalizeSupportPriority(payload.priority, "normal"),
    channel: "panel",
    openedAt: asText(payload.openedAt) || null,
    openedByUserId: asText(payload.openedByUserId) || null,
    openedByEmail: asText(payload.openedByEmail) || null,
    assignedFounderId: asText(payload.assignedFounderId) || null,
    assignedFounderName: asText(payload.assignedFounderName) || null,
    unreadForTenant: asInteger(payload.unreadForTenant),
    unreadForFounder: asInteger(payload.unreadForFounder),
    messageCount: Math.max(1, asInteger(payload.messageCount, 1)),
    lastMessageAt: asText(payload.lastMessageAt) || null,
    lastMessagePreview: asText(payload.lastMessagePreview) || null,
    lastMessageAuthorType:
      lastMessageAuthorType === "tenant" || lastMessageAuthorType === "founder"
        ? lastMessageAuthorType
        : null,
    firstFounderResponseAt: asText(payload.firstFounderResponseAt) || null,
    firstResponseDueAt: asText(payload.firstResponseDueAt) || null,
  };
}

export function toMessagePreview(message: string, maxLength = 220): string {
  const normalized = message.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 3)}...`;
}

export function buildSupportTicketCode(now = new Date()): string {
  const yyyy = now.getFullYear().toString();
  const mm = (now.getMonth() + 1).toString().padStart(2, "0");
  const dd = now.getDate().toString().padStart(2, "0");
  const hh = now.getHours().toString().padStart(2, "0");
  const min = now.getMinutes().toString().padStart(2, "0");
  const ss = now.getSeconds().toString().padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000)
    .toString()
    .padStart(4, "0");

  return `DST-${yyyy}${mm}${dd}-${hh}${min}${ss}-${random}`;
}

export function buildSupportMessageCode(ticketCode: string | null | undefined, messageCount: number): string {
  const safeTicketCode = ticketCode && ticketCode.trim().length > 0 ? ticketCode : "DST";
  return `${safeTicketCode}-${String(Math.max(1, Math.trunc(messageCount))).padStart(3, "0")}`;
}

export function getFirstResponseSlaMinutes(priority: SupportPriority): number {
  if (priority === "urgent") {
    return 30;
  }
  if (priority === "high") {
    return 120;
  }
  if (priority === "normal") {
    return 8 * 60;
  }
  return 24 * 60;
}

export function buildFirstResponseDueAt(openedAt: Date, priority: SupportPriority): string {
  const due = new Date(openedAt.getTime() + getFirstResponseSlaMinutes(priority) * 60 * 1000);
  return due.toISOString();
}

function parseIso(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export type SupportSlaSnapshot = {
  firstResponseDueAt: string | null;
  firstFounderResponseAt: string | null;
  firstResponseMinutes: number | null;
  slaBreached: boolean;
  slaRemainingMinutes: number | null;
};

export function calculateSupportSlaSnapshot(
  payload: SupportTicketPayload,
  createdAt: Date,
  now = new Date(),
): SupportSlaSnapshot {
  const openedAtDate = parseIso(payload.openedAt) ?? createdAt;
  const dueAtDate =
    parseIso(payload.firstResponseDueAt) ??
    new Date(openedAtDate.getTime() + getFirstResponseSlaMinutes(payload.priority) * 60 * 1000);
  const founderResponseDate = parseIso(payload.firstFounderResponseAt);

  const firstResponseMinutes = founderResponseDate
    ? Math.max(0, Math.ceil((founderResponseDate.getTime() - openedAtDate.getTime()) / (60 * 1000)))
    : null;

  if (founderResponseDate) {
    return {
      firstResponseDueAt: dueAtDate.toISOString(),
      firstFounderResponseAt: founderResponseDate.toISOString(),
      firstResponseMinutes,
      slaBreached: founderResponseDate.getTime() > dueAtDate.getTime(),
      slaRemainingMinutes: null,
    };
  }

  const remainingMinutes = Math.ceil((dueAtDate.getTime() - now.getTime()) / (60 * 1000));
  return {
    firstResponseDueAt: dueAtDate.toISOString(),
    firstFounderResponseAt: null,
    firstResponseMinutes: null,
    slaBreached: remainingMinutes < 0,
    slaRemainingMinutes: remainingMinutes,
  };
}
