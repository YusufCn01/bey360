import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { fail, ok } from "@/lib/http/response";
import { simulatePaymentStatus } from "@/modules/payment/application/payment-service";

const simulateSchema = z.object({
  status: z.enum(["pending", "succeeded", "failed", "cancelled", "refunded", "partial_refunded"]),
});

type RouteContext = {
  params: Promise<{
    reference: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const { reference } = await context.params;
    const parsed = simulateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Simülasyon formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const result = await simulatePaymentStatus({
      tenantId: access.tenantId,
      reference,
      status: parsed.data.status,
    });

    return ok(result);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Ödeme linki simülasyonu sırasında hata oluştu.", "PAYMENT_LINK_SIMULATION_ERROR", 500);
  }
}
