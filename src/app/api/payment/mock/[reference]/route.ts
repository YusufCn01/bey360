import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http/response";
import { getPublicPaymentLink } from "@/modules/payment/application/payment-service";
import { asRecord, numberOrZero } from "@/lib/json";

type RouteContext = {
  params: Promise<{
    reference: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { reference } = await context.params;
  const link = await getPublicPaymentLink(reference);
  if (!link) {
    return fail("Ödeme linki bulunamadı.", "PAYMENT_LINK_NOT_FOUND", 404);
  }

  const payload = asRecord(link.payload);
  return ok({
    reference,
    status: link.status,
    customerReference: link.name,
    amount: numberOrZero(payload.amount),
    currency: typeof payload.currency === "string" ? payload.currency : "TRY",
    description: typeof payload.description === "string" ? payload.description : "Ödeme",
    expiresAt: payload.expiresAt ?? null,
  });
}
