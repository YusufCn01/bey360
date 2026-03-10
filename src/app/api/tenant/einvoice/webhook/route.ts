import { createHmac } from "crypto";
import type { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { fail, ok } from "@/lib/http/response";
import { asRecord } from "@/lib/json";
import { applyEInvoiceProviderStatus } from "@/modules/einvoice/application/einvoice-service";
import { getEInvoiceProvider } from "@/modules/einvoice/providers/registry";

function verifyWebhookSignature(rawBody: string, signature: string) {
  if (!signature || !env.EINVOICE_WEBHOOK_SIGNING_KEY) {
    return false;
  }

  const expected = createHmac("sha256", env.EINVOICE_WEBHOOK_SIGNING_KEY).update(rawBody).digest("hex");
  return signature === expected;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

export async function POST(request: NextRequest) {
  const providerCode = request.nextUrl.searchParams.get("providerCode") || "mock-einvoice";
  const tenantId = request.nextUrl.searchParams.get("tenantId");

  if (!tenantId) {
    return fail("tenantId zorunludur.", "VALIDATION_ERROR", 422);
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return fail("Webhook imzası geçersiz.", "INVALID_SIGNATURE", 401);
  }

  try {
    const provider = getEInvoiceProvider(providerCode);
    const parsedBody = JSON.parse(rawBody) as unknown;
    const result = await provider.processWebhook(parsedBody, signature);
    const parsedRecord = asRecord(parsedBody);
    const providerReference = result.providerReference ?? asString(parsedRecord.providerReference);

    await prisma.eInvoiceWebhookLogs.create({
      data: {
        tenantId,
        code: providerCode,
        name: "webhook",
        status: result.status,
        payload: {
          providerCode,
          providerReference,
          parsedBody,
          rawBody,
        } as Prisma.InputJsonValue,
        occurredAt: new Date(),
      },
    });

    const statusResult = await applyEInvoiceProviderStatus({
      tenantId,
      providerCode,
      providerReference,
      status: result.status,
      rawPayload: result.rawPayload ?? parsedBody,
      source: "webhook",
    });

    return ok({
      processed: true,
      status: result.status,
      providerReference,
      documentId: statusResult.documentId,
    });
  } catch {
    return fail("Webhook işlenirken hata oluştu.", "EINVOICE_WEBHOOK_ERROR", 500);
  }
}
