import { z } from "zod";
import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http/response";
import { getPublicPaymentLink, simulatePaymentStatus } from "@/modules/payment/application/payment-service";

const statusSchema = z.object({
  status: z.enum(["succeeded", "failed", "cancelled"]),
});

type RouteContext = {
  params: Promise<{
    reference: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { reference } = await context.params;
  const parsed = statusSchema.safeParse(await request.json());
  if (!parsed.success) {
    return fail("Ödeme durumu formu geçersiz.", "VALIDATION_ERROR", 422);
  }

  const link = await getPublicPaymentLink(reference);
  if (!link) {
    return fail("Ödeme linki bulunamadı.", "PAYMENT_LINK_NOT_FOUND", 404);
  }

  const result = await simulatePaymentStatus({
    tenantId: link.tenantId,
    reference,
    status: parsed.data.status,
  });

  return ok(result);
}
