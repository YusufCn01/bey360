import { Prisma } from "@prisma/client";
import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";
import {
  buildSupportMessageCode,
  buildSupportTicketCode,
  calculateSupportSlaSnapshot,
  buildFirstResponseDueAt,
  normalizeSupportStatus,
  parseSupportTicketPayload,
  type SupportPriority,
  type SupportStatus,
  toMessagePreview,
} from "@/lib/support/ticket-utils";

const createTicketSchema = z.object({
  subject: z.string().min(3).max(255),
  message: z.string().min(2).max(4000),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
});

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function mapTicket(row: {
  id: string;
  code: string | null;
  name: string | null;
  description: string | null;
  status: string;
  payload: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const payload = parseSupportTicketPayload(row.payload);
  const sla = calculateSupportSlaSnapshot(payload, row.createdAt);
  return {
    id: row.id,
    code: row.code,
    subject: row.name || "-",
    description: row.description,
    status: normalizeSupportStatus(row.status),
    priority: payload.priority,
    unreadForTenant: payload.unreadForTenant,
    unreadForFounder: payload.unreadForFounder,
    messageCount: payload.messageCount,
    lastMessageAt: payload.lastMessageAt,
    lastMessagePreview: payload.lastMessagePreview,
    lastMessageAuthorType: payload.lastMessageAuthorType,
    assignedFounderName: payload.assignedFounderName,
    firstFounderResponseAt: sla.firstFounderResponseAt,
    firstResponseDueAt: sla.firstResponseDueAt,
    firstResponseMinutes: sla.firstResponseMinutes,
    slaBreached: sla.slaBreached,
    slaRemainingMinutes: sla.slaRemainingMinutes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const statusText = request.nextUrl.searchParams.get("status");
    const query = request.nextUrl.searchParams.get("q")?.trim();
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "120");
    const safeLimit = Math.min(Math.max(limit, 1), 300);
    const status = statusText ? normalizeSupportStatus(statusText, "open") : null;

    const rows = await prisma.supportTickets.findMany({
      where: {
        tenantId: access.tenantId,
        deletedAt: null,
        ...(status ? { status } : {}),
        ...(query
          ? {
              OR: [
                { code: { contains: query, mode: "insensitive" } },
                { name: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: safeLimit,
    });

    return ok(rows.map((row) => mapTicket(row)));
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    return fail("Destek talepleri alinamadi.", "SUPPORT_TICKET_LIST_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const parsed = createTicketSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Destek talep formu gecersiz.", "VALIDATION_ERROR", 422);
    }

    const now = new Date();
    const ticketCode = buildSupportTicketCode(now);
    const preview = toMessagePreview(parsed.data.message);
    const status: SupportStatus = "open";
    const priority: SupportPriority = parsed.data.priority;

    const created = await prisma.$transaction(async (tx) => {
      const ticketPayload: Prisma.InputJsonValue = {
        priority,
        channel: "panel",
        openedAt: now.toISOString(),
        openedByUserId: access.userId,
        openedByEmail: access.email,
        assignedFounderId: null,
        assignedFounderName: null,
        unreadForTenant: 0,
        unreadForFounder: 1,
        messageCount: 1,
        lastMessageAt: now.toISOString(),
        lastMessagePreview: preview,
        lastMessageAuthorType: "tenant",
        firstFounderResponseAt: null,
        firstResponseDueAt: buildFirstResponseDueAt(now, priority),
      };

      const ticket = await tx.supportTickets.create({
        data: {
          tenantId: access.tenantId,
          code: ticketCode,
          name: parsed.data.subject,
          description: preview,
          status,
          payload: ticketPayload,
          occurredAt: now,
        },
      });

      await tx.supportTicketMessages.create({
        data: {
          tenantId: access.tenantId,
          code: buildSupportMessageCode(ticket.code, 1),
          name: parsed.data.subject,
          description: parsed.data.message,
          status: "active",
          payload: {
            ticketId: ticket.id,
            authorType: "tenant",
            authorId: access.userId,
            authorName: access.email,
          },
          occurredAt: now,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: access.tenantId,
          userId: access.userId,
          module: "support",
          entityName: "support_tickets",
          entityId: ticket.id,
          action: "support.ticket.created",
          payload: {
            ticketCode: ticket.code,
            subject: ticket.name,
            priority,
          },
        },
      });

      return ticket;
    });

    return ok(mapTicket(created), { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    return fail("Destek talebi olusturulamadi.", "SUPPORT_TICKET_CREATE_ERROR", 500);
  }
}
