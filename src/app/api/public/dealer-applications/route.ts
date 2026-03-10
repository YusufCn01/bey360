import { Prisma } from "@prisma/client";
import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";
import {
  buildDealerApplicationNumber,
  normalizePhone,
  parseDealerApplicationStatus,
} from "@/lib/platform/dealer-application";

const createApplicationSchema = z.object({
  companyName: z.string().min(2).max(255),
  tradeName: z.string().max(255).optional(),
  taxNumber: z.string().min(8).max(20),
  contactFirstName: z.string().min(2).max(80),
  contactLastName: z.string().min(2).max(80),
  contactTitle: z.string().max(120).optional(),
  phone: z.string().min(10).max(20),
  email: z.string().email(),
  city: z.string().min(2).max(120),
  district: z.string().max(120).optional(),
  address: z.string().max(400).optional(),
  note: z.string().max(1000).optional(),
  requestedPlan: z.enum(["starter", "standard", "professional", "enterprise", "custom"]).default("starter"),
  branchCount: z.coerce.number().int().min(1).max(200).default(1),
  monthlySalesTarget: z.coerce.number().min(0).max(1_000_000_000).optional(),
});

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function POST(request: NextRequest) {
  try {
    const parsed = createApplicationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Başvuru formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const input = parsed.data;
    const normalizedTaxNumber = input.taxNumber.replace(/\D/g, "");
    const normalizedPhone = normalizePhone(input.phone);
    const normalizedEmail = input.email.trim().toLowerCase();
    const now = new Date();

    const tenant = await prisma.tenant.findUnique({
      where: { taxNumber: normalizedTaxNumber },
      select: { id: true, slug: true, legalName: true },
    });
    if (tenant) {
      return fail("Bu vergi numarası ile kayıtlı bir bayi zaten mevcut.", "DEALER_ALREADY_EXISTS", 409);
    }

    const openApplications = await prisma.appSettings.findMany({
      where: {
        deletedAt: null,
        code: "dealer_application",
        status: {
          in: ["pending", "reviewing"],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 250,
      select: {
        id: true,
        externalId: true,
        payload: true,
        createdAt: true,
      },
    });

    const duplicate = openApplications.find((row) => {
      const payload = asRecord(row.payload);
      const taxNumber = asText(payload.taxNumber).replace(/\D/g, "");
      const email = asText(payload.email).trim().toLowerCase();
      const phone = normalizePhone(asText(payload.phone));
      return (
        (taxNumber && taxNumber === normalizedTaxNumber) ||
        (email && email === normalizedEmail) ||
        (phone && phone === normalizedPhone)
      );
    });

    if (duplicate) {
      return fail(
        `Açık bir başvurunuz zaten var. Başvuru no: ${duplicate.externalId || "-"}`,
        "DUPLICATE_APPLICATION",
        409,
      );
    }

    const applicationNumber = buildDealerApplicationNumber(now);
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const row = await prisma.appSettings.create({
      data: {
        externalId: applicationNumber,
        code: "dealer_application",
        name: input.companyName.trim(),
        description: `${input.contactFirstName.trim()} ${input.contactLastName.trim()}`.trim(),
        status: "pending",
        payload: {
          companyName: input.companyName.trim(),
          tradeName: input.tradeName?.trim() || null,
          taxNumber: normalizedTaxNumber,
          contactFirstName: input.contactFirstName.trim(),
          contactLastName: input.contactLastName.trim(),
          contactTitle: input.contactTitle?.trim() || null,
          phone: normalizedPhone,
          email: normalizedEmail,
          city: input.city.trim(),
          district: input.district?.trim() || null,
          address: input.address?.trim() || null,
          note: input.note?.trim() || null,
          requestedPlan: input.requestedPlan,
          branchCount: input.branchCount,
          monthlySalesTarget: input.monthlySalesTarget ?? null,
          submittedAt: now.toISOString(),
          source: "public-form",
          timeline: [
            {
              status: "pending",
              at: now.toISOString(),
              by: "public-form",
              note: null,
            },
          ],
          metadata: {
            ipAddress,
            userAgent,
          },
        } as Prisma.InputJsonValue,
        occurredAt: now,
      },
      select: {
        id: true,
        externalId: true,
        status: true,
        createdAt: true,
      },
    });

    return ok(
      {
        applicationId: row.id,
        applicationNumber: row.externalId,
        status: parseDealerApplicationStatus(row.status),
        submittedAt: row.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch {
    return fail("Bayi başvurusu alınamadı.", "DEALER_APPLICATION_CREATE_ERROR", 500);
  }
}
