import { Prisma } from "@prisma/client";
import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { prisma } from "@/lib/db/prisma";
import { asRecord } from "@/lib/json";
import { fail, ok } from "@/lib/http/response";
import {
  buildSupportMessageCode,
  calculateSupportSlaSnapshot,
  normalizeSupportStatus,
  parseSupportTicketPayload,
  toMessagePreview,
  type SupportStatus,
} from "@/lib/support/ticket-utils";

const createMessageSchema = z.object({
  message: z.string().min(2).max(4000),
});

type RouteContext = {
  params: Promise<{ ticketId: string }>;
};

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function mapMessage(row: {
  id: string;
  code: string | null;
  name: string | null;
  description: string | null;
  status: string;
  payload: Prisma.JsonValue | null;
  createdAt: Date;
}) {
  const payload = asRecord(row.payload);
  return {
    id: row.id,
    code: row.code,
    title: row.name || "",
    message: row.description || "",
    status: row.status,
    authorType: asText(payload.authorType) || "tenant",
    authorName: asText(payload.authorName) || "-",
    authorId: asText(payload.authorId) || null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const { ticketId } = await context.params;

    const ticket = await prisma.supportTickets.findFirst({
      where: {
        id: ticketId,
        tenantId: access.tenantId,
        deletedAt: null,
      },
    });

    if (!ticket) {
      return fail("Destek talebi bulunamadi.", "SUPPORT_TICKET_NOT_FOUND", 404);
    }

    const ticketPayload = parseSupportTicketPayload(ticket.payload);
    const sla = calculateSupportSlaSnapshot(ticketPayload, ticket.createdAt);
    if (ticketPayload.unreadForTenant > 0) {
      await prisma.supportTickets.update({
        where: { id: ticket.id },
        data: {
          payload: {
            ...ticketPayload,
            unreadForTenant: 0,
          } satisfies Prisma.InputJsonValue,
        },
      });
    }

    const rows = await prisma.supportTicketMessages.findMany({
      where: {
        tenantId: access.tenantId,
        deletedAt: null,
        payload: {
          path: ["ticketId"],
          equals: ticket.id,
        },
      },
      orderBy: [{ createdAt: "asc" }],
      take: 500,
    });

    return ok({
      ticket: {
        id: ticket.id,
        code: ticket.code,
        subject: ticket.name || "-",
        status: normalizeSupportStatus(ticket.status),
        priority: ticketPayload.priority,
        assignedFounderName: ticketPayload.assignedFounderName,
        firstFounderResponseAt: sla.firstFounderResponseAt,
        firstResponseDueAt: sla.firstResponseDueAt,
        firstResponseMinutes: sla.firstResponseMinutes,
        slaBreached: sla.slaBreached,
        slaRemainingMinutes: sla.slaRemainingMinutes,
      },
      messages: rows.map((row) => mapMessage(row)),
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    return fail("Destek talep mesajlari alinamadi.", "SUPPORT_TICKET_MESSAGES_ERROR", 500);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const { ticketId } = await context.params;
    const parsed = createMessageSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Mesaj formu gecersiz.", "VALIDATION_ERROR", 422);
    }

    const ticket = await prisma.supportTickets.findFirst({
      where: {
        id: ticketId,
        tenantId: access.tenantId,
        deletedAt: null,
      },
    });
    if (!ticket) {
      return fail("Destek talebi bulunamadi.", "SUPPORT_TICKET_NOT_FOUND", 404);
    }

    const now = new Date();
    const preview = toMessagePreview(parsed.data.message);

    const updated = await prisma.$transaction(async (tx) => {
      const payload = parseSupportTicketPayload(ticket.payload);
      const nextMessageCount = payload.messageCount + 1;
      const nextStatus: SupportStatus = ticket.status === "closed" ? "open" : normalizeSupportStatus(ticket.status);

      await tx.supportTicketMessages.create({
        data: {
          tenantId: access.tenantId,
          code: buildSupportMessageCode(ticket.code, nextMessageCount),
          name: ticket.name,
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

      const row = await tx.supportTickets.update({
        where: { id: ticket.id },
        data: {
          status: nextStatus,
          description: preview,
          occurredAt: now,
          payload: {
            ...payload,
            unreadForTenant: 0,
            unreadForFounder: payload.unreadForFounder + 1,
            messageCount: nextMessageCount,
            lastMessageAt: now.toISOString(),
            lastMessagePreview: preview,
            lastMessageAuthorType: "tenant",
          } satisfies Prisma.InputJsonValue,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: access.tenantId,
          userId: access.userId,
          module: "support",
          entityName: "support_tickets",
          entityId: ticket.id,
          action: "support.ticket.message.sent",
          payload: {
            ticketCode: ticket.code,
            messagePreview: preview,
            reopened: ticket.status === "closed",
          },
        },
      });

      return row;
    });

    return ok({
      ticket: {
        id: updated.id,
        code: updated.code,
        status: normalizeSupportStatus(updated.status),
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    return fail("Destek talebine mesaj eklenemedi.", "SUPPORT_TICKET_MESSAGE_CREATE_ERROR", 500);
  }
}
