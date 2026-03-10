import { Prisma } from "@prisma/client";
import { z } from "zod";
import { NextRequest } from "next/server";
import { FounderAuthorizationError, requireFounderAccess } from "@/lib/auth/founder-session";
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
    await requireFounderAccess(request);
    const { ticketId } = await context.params;

    const ticket = await prisma.supportTickets.findFirst({
      where: {
        id: ticketId,
        deletedAt: null,
      },
      include: {
        tenant: {
          select: {
            slug: true,
            legalName: true,
            tradeName: true,
            status: true,
          },
        },
      },
    });
    if (!ticket) {
      return fail("Destek talebi bulunamadi.", "SUPPORT_TICKET_NOT_FOUND", 404);
    }

    const ticketPayload = parseSupportTicketPayload(ticket.payload);
    const sla = calculateSupportSlaSnapshot(ticketPayload, ticket.createdAt);
    if (ticketPayload.unreadForFounder > 0) {
      await prisma.supportTickets.update({
        where: { id: ticket.id },
        data: {
          payload: {
            ...ticketPayload,
            unreadForFounder: 0,
          } satisfies Prisma.InputJsonValue,
        },
      });
    }

    const rows = await prisma.supportTicketMessages.findMany({
      where: {
        tenantId: ticket.tenantId,
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
        tenantId: ticket.tenantId,
        tenantSlug: ticket.tenant.slug,
        tenantName: ticket.tenant.tradeName || ticket.tenant.legalName,
        tenantStatus: ticket.tenant.status,
        code: ticket.code,
        subject: ticket.name || "-",
        status: normalizeSupportStatus(ticket.status),
        priority: ticketPayload.priority,
        assignedFounderId: ticketPayload.assignedFounderId,
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
    if (error instanceof FounderAuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    return fail("Destek talep mesajlari alinamadi.", "FOUNDER_SUPPORT_TICKET_MESSAGES_ERROR", 500);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const founder = await requireFounderAccess(request);
    const { ticketId } = await context.params;
    const parsed = createMessageSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Mesaj formu gecersiz.", "VALIDATION_ERROR", 422);
    }

    const ticket = await prisma.supportTickets.findFirst({
      where: {
        id: ticketId,
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
      const nextStatus: SupportStatus = ticket.status === "closed" ? "pending" : normalizeSupportStatus(ticket.status, "pending");

      await tx.supportTicketMessages.create({
        data: {
          tenantId: ticket.tenantId,
          code: buildSupportMessageCode(ticket.code, nextMessageCount),
          name: ticket.name,
          description: parsed.data.message,
          status: "active",
          payload: {
            ticketId: ticket.id,
            authorType: "founder",
            authorId: founder.sub,
            authorName: founder.fullName || founder.email,
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
            assignedFounderId: payload.assignedFounderId || founder.sub,
            assignedFounderName: payload.assignedFounderName || founder.fullName,
            firstFounderResponseAt: payload.firstFounderResponseAt || now.toISOString(),
            unreadForFounder: 0,
            unreadForTenant: payload.unreadForTenant + 1,
            messageCount: nextMessageCount,
            lastMessageAt: now.toISOString(),
            lastMessagePreview: preview,
            lastMessageAuthorType: "founder",
          } satisfies Prisma.InputJsonValue,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: ticket.tenantId,
          module: "support",
          entityName: "support_tickets",
          entityId: ticket.id,
          action: "support.ticket.founder.replied",
          payload: {
            founderId: founder.sub,
            founderEmail: founder.email,
            messagePreview: preview,
            status: nextStatus,
          },
        },
      });

      return row;
    });

    return ok({
      ticket: {
        id: updated.id,
        status: normalizeSupportStatus(updated.status),
      },
    });
  } catch (error) {
    if (error instanceof FounderAuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    return fail("Destek talebine cevap eklenemedi.", "FOUNDER_SUPPORT_TICKET_REPLY_ERROR", 500);
  }
}
