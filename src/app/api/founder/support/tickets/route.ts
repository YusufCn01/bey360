import { Prisma } from "@prisma/client";
import { z } from "zod";
import { NextRequest } from "next/server";
import { FounderAuthorizationError, requireFounderAccess } from "@/lib/auth/founder-session";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";
import {
  buildFirstResponseDueAt,
  calculateSupportSlaSnapshot,
  normalizeSupportPriority,
  normalizeSupportStatus,
  parseSupportTicketPayload,
  type SupportPriority,
  type SupportStatus,
} from "@/lib/support/ticket-utils";

const updateTicketSchema = z
  .object({
    ticketId: z.string().min(1),
    status: z.enum(["open", "pending", "closed"]).optional(),
    priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
    assignToMe: z.boolean().optional(),
    clearAssignment: z.boolean().optional(),
    note: z.string().max(600).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.status === undefined &&
      value.priority === undefined &&
      value.assignToMe === undefined &&
      value.clearAssignment === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Guncelleme icin en az bir alan gondermelisiniz.",
      });
    }
  });

function mapTicket(
  row: {
    id: string;
    tenantId: string;
    code: string | null;
    name: string | null;
    description: string | null;
    status: string;
    payload: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
    tenant: {
      slug: string;
      legalName: string;
      tradeName: string | null;
      status: string;
    };
  },
) {
  const payload = parseSupportTicketPayload(row.payload);
  const sla = calculateSupportSlaSnapshot(payload, row.createdAt);
  return {
    id: row.id,
    tenantId: row.tenantId,
    tenantSlug: row.tenant.slug,
    tenantName: row.tenant.tradeName || row.tenant.legalName,
    tenantStatus: row.tenant.status,
    code: row.code,
    subject: row.name || "-",
    description: row.description,
    status: normalizeSupportStatus(row.status),
    priority: payload.priority,
    unreadForTenant: payload.unreadForTenant,
    unreadForFounder: payload.unreadForFounder,
    messageCount: payload.messageCount,
    assignedFounderName: payload.assignedFounderName,
    assignedFounderId: payload.assignedFounderId,
    lastMessageAt: payload.lastMessageAt,
    lastMessagePreview: payload.lastMessagePreview,
    lastMessageAuthorType: payload.lastMessageAuthorType,
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
    await requireFounderAccess(request);
    const query = request.nextUrl.searchParams.get("q")?.trim();
    const tenantId = request.nextUrl.searchParams.get("tenantId")?.trim();
    const statusText = request.nextUrl.searchParams.get("status");
    const priorityText = request.nextUrl.searchParams.get("priority");
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "180");
    const safeLimit = Math.min(Math.max(limit, 1), 400);

    const status = statusText ? normalizeSupportStatus(statusText) : null;
    const priority = priorityText ? normalizeSupportPriority(priorityText) : null;

    const rows = await prisma.supportTickets.findMany({
      where: {
        deletedAt: null,
        ...(tenantId ? { tenantId } : {}),
        ...(status ? { status } : {}),
        ...(priority
          ? {
              payload: {
                path: ["priority"],
                equals: priority,
              },
            }
          : {}),
        ...(query
          ? {
              OR: [
                { code: { contains: query, mode: "insensitive" } },
                { name: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
                { tenant: { slug: { contains: query, mode: "insensitive" } } },
                { tenant: { legalName: { contains: query, mode: "insensitive" } } },
                { tenant: { tradeName: { contains: query, mode: "insensitive" } } },
              ],
            }
          : {}),
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
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: safeLimit,
    });

    const mapped = rows.map((row) => mapTicket(row));
    const summary = mapped.reduce(
      (acc, ticket) => {
        acc.total += 1;
        if (ticket.status === "open") {
          acc.open += 1;
        } else if (ticket.status === "pending") {
          acc.pending += 1;
        } else if (ticket.status === "closed") {
          acc.closed += 1;
        }
        if (ticket.unreadForFounder > 0) {
          acc.waitingFounder += 1;
        }
        if (ticket.unreadForTenant > 0) {
          acc.waitingTenant += 1;
        }
        if (ticket.slaBreached) {
          acc.slaBreached += 1;
        }
        return acc;
      },
      {
        total: 0,
        open: 0,
        pending: 0,
        closed: 0,
        waitingFounder: 0,
        waitingTenant: 0,
        slaBreached: 0,
      },
    );

    return ok({
      rows: mapped,
      summary,
    });
  } catch (error) {
    if (error instanceof FounderAuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    return fail("Destek talepleri alinamadi.", "FOUNDER_SUPPORT_TICKETS_ERROR", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const founder = await requireFounderAccess(request);
    const parsed = updateTicketSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Destek talep guncelleme formu gecersiz.", "VALIDATION_ERROR", 422);
    }

    const ticket = await prisma.supportTickets.findFirst({
      where: {
        id: parsed.data.ticketId,
        deletedAt: null,
      },
    });
    if (!ticket) {
      return fail("Destek talebi bulunamadi.", "SUPPORT_TICKET_NOT_FOUND", 404);
    }

    const currentPayload = parseSupportTicketPayload(ticket.payload);
    const status: SupportStatus = parsed.data.status ?? normalizeSupportStatus(ticket.status);
    const priority: SupportPriority = parsed.data.priority ?? currentPayload.priority;
    const assignToMe = parsed.data.assignToMe === true;
    const clearAssignment = parsed.data.clearAssignment === true;
    const assignedFounderId = clearAssignment ? null : assignToMe ? founder.sub : currentPayload.assignedFounderId;
    const assignedFounderName = clearAssignment
      ? null
      : assignToMe
        ? founder.fullName
        : currentPayload.assignedFounderName;
    const openedAtCandidate = currentPayload.openedAt ? new Date(currentPayload.openedAt) : ticket.createdAt;
    const openedAtDate = Number.isNaN(openedAtCandidate.getTime()) ? ticket.createdAt : openedAtCandidate;
    const shouldRebuildDueAt = !currentPayload.firstFounderResponseAt;
    const nextFirstResponseDueAt = shouldRebuildDueAt
      ? buildFirstResponseDueAt(openedAtDate, priority)
      : currentPayload.firstResponseDueAt;

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.supportTickets.update({
        where: { id: ticket.id },
        data: {
          status,
          payload: {
            ...currentPayload,
            priority,
            assignedFounderId,
            assignedFounderName,
            firstResponseDueAt: nextFirstResponseDueAt,
          } satisfies Prisma.InputJsonValue,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: ticket.tenantId,
          module: "support",
          entityName: "support_tickets",
          entityId: ticket.id,
          action: "support.ticket.founder.updated",
          payload: {
            founderId: founder.sub,
            founderEmail: founder.email,
            status,
            priority,
            assignedFounderId,
            note: parsed.data.note ?? null,
          },
        },
      });

      return row;
    });

    return ok({
      id: updated.id,
      status: normalizeSupportStatus(updated.status),
      priority,
      assignedFounderId,
      assignedFounderName,
    });
  } catch (error) {
    if (error instanceof FounderAuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    return fail("Destek talebi guncellenemedi.", "FOUNDER_SUPPORT_TICKET_UPDATE_ERROR", 500);
  }
}
