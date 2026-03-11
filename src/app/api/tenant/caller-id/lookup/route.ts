import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { prisma } from "@/lib/db/prisma";
import { asRecord } from "@/lib/json";
import { fail, ok } from "@/lib/http/response";

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function readText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const phoneRaw = request.nextUrl.searchParams.get("phone") ?? "";
    const phone = normalizePhone(phoneRaw);
    if (phone.length < 6) {
      return fail("Telefon numarasi gecersiz.", "VALIDATION_ERROR", 422);
    }

    const directMatches = await prisma.customers.findMany({
      where: {
        tenantId: access.tenantId,
        deletedAt: null,
        OR: [
          {
            payload: {
              path: ["phone"],
              equals: phoneRaw,
            },
          },
          {
            payload: {
              path: ["phone"],
              equals: phone,
            },
          },
        ],
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 5,
    });

    let matches = directMatches;
    if (matches.length === 0) {
      const fallbackPool = await prisma.customers.findMany({
        where: {
          tenantId: access.tenantId,
          deletedAt: null,
        },
        orderBy: [{ updatedAt: "desc" }],
        take: 500,
      });
      matches = fallbackPool.filter((row) => {
        const payload = asRecord(row.payload);
        const customerPhone = normalizePhone(readText(payload.phone));
        if (!customerPhone) {
          return false;
        }
        return customerPhone.endsWith(phone.slice(-10));
      });
    }

    const customer = matches[0];
    if (!customer) {
      await prisma.auditLog.create({
        data: {
          tenantId: access.tenantId,
          userId: access.userId,
          module: "caller_id",
          entityName: "customers",
          action: "caller_id.lookup.not_found",
          payload: {
            queryPhone: phone,
          },
        },
      });

      return ok({
        matched: false,
        customer: null,
        recentSales: [],
      });
    }

    const customerCode = readText(customer.code);
    const customerPayload = asRecord(customer.payload);

    const [balanceSnapshot, riskProfile, recentSales] = await Promise.all([
      customerCode
        ? prisma.balanceSnapshots.findFirst({
            where: {
              tenantId: access.tenantId,
              deletedAt: null,
              code: `SNAP:${customerCode}`,
            },
            orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
          })
        : null,
      customerCode
        ? prisma.customerRiskProfiles.findFirst({
            where: {
              tenantId: access.tenantId,
              deletedAt: null,
              code: customerCode,
            },
            orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
          })
        : null,
      customerCode
        ? prisma.sales.findMany({
            where: {
              tenantId: access.tenantId,
              deletedAt: null,
              status: "completed",
              payload: {
                path: ["customerCode"],
                equals: customerCode,
              },
            },
            orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
            take: 10,
          })
        : [],
    ]);

    const balancePayload = asRecord(balanceSnapshot?.payload);
    const riskPayload = asRecord(riskProfile?.payload);

    await prisma.auditLog.create({
      data: {
        tenantId: access.tenantId,
        userId: access.userId,
        module: "caller_id",
        entityName: "customers",
        entityId: customer.id,
        action: "caller_id.lookup.found",
        payload: {
          queryPhone: phone,
          customerCode,
        },
      },
    });

    return ok({
      matched: true,
      customer: {
        id: customer.id,
        code: customerCode,
        name: readText(customer.name),
        phone: readText(customerPayload.phone),
        currentBalance: readNumber(balancePayload.balance),
        riskLimit: readNumber(riskPayload.riskLimit),
        maturityDays: readNumber(riskPayload.maturityDays),
      },
      recentSales: recentSales.map((row) => {
        const payload = asRecord(row.payload);
        return {
          id: row.id,
          saleCode: readText(row.code),
          total: readNumber(payload.netTotal),
          occurredAt: (row.occurredAt ?? row.createdAt).toISOString(),
        };
      }),
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Cagri takip sorgusu sirasinda hata olustu.", "CALLER_ID_LOOKUP_ERROR", 500);
  }
}
