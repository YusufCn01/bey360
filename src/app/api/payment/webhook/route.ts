import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http/response";
import { getPaymentProvider } from "@/modules/payment/providers/registry";
import { processPaymentStatusUpdate } from "@/modules/payment/application/payment-service";

export async function POST(request: NextRequest) {
  const providerCode = request.nextUrl.searchParams.get("provider") || "mock-payment";
  const tenantId = request.nextUrl.searchParams.get("tenantId");
  const provider = getPaymentProvider(providerCode);

  if (!tenantId) {
    return fail("tenantId zorunludur", "VALIDATION_ERROR", 422);
  }

  const signature = request.headers.get("x-signature") || undefined;
  const rawBody = await request.text();

  const isValid = await provider.verifyWebhook(signature, rawBody);
  if (!isValid) {
    return fail("Webhook imzası geçersiz", "INVALID_SIGNATURE", 401);
  }

  const parsed = await provider.parseWebhook(rawBody);
  const result = await processPaymentStatusUpdate({
    tenantId,
    providerCode,
    providerReference: parsed.providerReference,
    status: parsed.status,
    rawPayload: parsed.rawPayload,
    source: "webhook",
  });

  return ok(result);
}
