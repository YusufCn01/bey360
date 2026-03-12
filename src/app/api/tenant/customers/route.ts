import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { prisma } from "@/lib/db/prisma";
import { asRecord, numberOrZero } from "@/lib/json";
import { fail, ok } from "@/lib/http/response";
import { createCustomer, listCustomers } from "@/modules/crm/application/customer-service";

const createCustomerSchema = z.object({
  code: z.string().min(1).max(100).optional(),
  name: z.string().min(2).max(255),
  taxNumber: z.string().max(20).optional(),
  identityNumber: z.string().max(20).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  riskLimit: z.number().nonnegative().optional(),
  maturityDays: z.number().int().nonnegative().optional(),
  group: z.string().max(120).optional(),
  subgroup: z.string().max(120).optional(),
  notes: z.string().max(5000).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, ["dashboard:view", "sale:pos"]);
    const search = request.nextUrl.searchParams.get("q") ?? undefined;
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "100");
    const view = request.nextUrl.searchParams.get("view");
    const includeFinancial = request.nextUrl.searchParams.get("includeFinancial") === "1";

    if (view === "risk") {
      const rows = await prisma.customerRiskProfiles.findMany({
        where: {
          tenantId: access.tenantId,
          deletedAt: null,
        },
        orderBy: [{ createdAt: "desc" }],
        take: Math.min(Math.max(limit, 1), 500),
      });

      const mapped = rows.map((row) => {
        const payload = asRecord(row.payload);
        return {
          id: row.id,
          code: row.code,
          name: row.name,
          riskLimit: numberOrZero(payload.riskLimit),
          maturityDays: numberOrZero(payload.maturityDays),
          occurredAt: row.occurredAt ?? row.createdAt,
          status: row.status,
        };
      });

      return ok(mapped);
    }

    if (view === "balance") {
      const rows = await prisma.customerBalances.findMany({
        where: {
          tenantId: access.tenantId,
          deletedAt: null,
        },
        orderBy: [{ createdAt: "desc" }],
        take: Math.min(Math.max(limit, 1), 500),
      });

      const mapped = rows.map((row) => {
        const payload = asRecord(row.payload);
        return {
          id: row.id,
          code: row.code,
          name: row.name,
          balance: numberOrZero(payload.balance),
          currency: (payload.currency as string | undefined) ?? "TRY",
          occurredAt: row.occurredAt ?? row.createdAt,
          status: row.status,
        };
      });

      return ok(mapped);
    }

    const rows = await listCustomers({
      tenantId: access.tenantId,
      search,
      limit,
    });

    if (includeFinancial) {
      const customerCodes = rows
        .map((row) => row.code)
        .filter((code): code is string => typeof code === "string" && code.length > 0);
      if (customerCodes.length === 0) {
        return ok(rows);
      }

      const [riskRows, snapshotRows] = await Promise.all([
        prisma.customerRiskProfiles.findMany({
          where: {
            tenantId: access.tenantId,
            deletedAt: null,
            code: { in: customerCodes },
          },
          orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        }),
        prisma.balanceSnapshots.findMany({
          where: {
            tenantId: access.tenantId,
            deletedAt: null,
            code: { in: customerCodes.map((code) => `SNAP:${code}`) },
          },
        }),
      ]);

      const latestRiskByCode = new Map<string, number>();
      const latestMaturityByCode = new Map<string, number>();
      for (const row of riskRows) {
        const riskCode = row.code ?? "";
        if (!riskCode || latestRiskByCode.has(riskCode)) {
          continue;
        }
        const payload = asRecord(row.payload);
        latestRiskByCode.set(riskCode, numberOrZero(payload.riskLimit));
        latestMaturityByCode.set(riskCode, numberOrZero(payload.maturityDays));
      }

      const balanceByCode = new Map<string, number>();
      for (const row of snapshotRows) {
        const payload = asRecord(row.payload);
        const fallbackCode = row.code ?? "";
        const accountCode = typeof payload.accountCode === "string" ? payload.accountCode : fallbackCode.replace("SNAP:", "");
        if (!accountCode) {
          continue;
        }
        balanceByCode.set(accountCode, numberOrZero(payload.balance));
      }

      const enriched = rows.map((row) => {
        const code = row.code ?? "";
        const riskLimit = code ? latestRiskByCode.get(code) ?? 0 : 0;
        const maturityDays = code ? latestMaturityByCode.get(code) ?? 0 : 0;
        const currentBalance = code ? balanceByCode.get(code) ?? 0 : 0;
        const availableRisk = riskLimit > 0 ? Math.max(0, riskLimit - currentBalance) : 0;
        const riskUsageRate = riskLimit > 0 ? currentBalance / riskLimit : 0;
        const riskStatus = riskLimit <= 0
          ? "no_limit"
          : currentBalance > riskLimit
            ? "over_limit"
            : riskUsageRate >= 0.8
              ? "warning"
              : "ok";

        return {
          ...row,
          riskLimit,
          maturityDays,
          currentBalance,
          availableRisk,
          riskUsageRate,
          riskStatus,
        };
      });

      return ok(enriched);
    }

    return ok(rows);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Müşteri listesi alınırken hata oluştu.", "CUSTOMER_LIST_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "tenant:user.manage");
    const parsed = createCustomerSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Müşteri formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const customer = await createCustomer({
      tenantId: access.tenantId,
      userId: access.userId,
      ...parsed.data,
    });

    return ok(customer, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Müşteri oluşturulurken hata oluştu.", "CUSTOMER_CREATE_ERROR", 500);
  }
}
