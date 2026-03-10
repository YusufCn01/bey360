import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { fail, ok } from "@/lib/http/response";
import { changeSubscriptionPlan } from "@/modules/subscription/application/subscription-service";

const changePlanSchema = z.object({
  planCode: z.enum(["starter", "standard", "professional", "enterprise", "custom"]),
  billingCycle: z.enum(["monthly", "yearly"]),
});

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const parsed = changePlanSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Plan değişiklik formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const result = await changeSubscriptionPlan({
      tenantId: access.tenantId,
      userId: access.userId,
      planCode: parsed.data.planCode,
      billingCycle: parsed.data.billingCycle,
    });

    return ok(result, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Plan değişikliği yapılırken hata oluştu.", "SUBSCRIPTION_CHANGE_ERROR", 500);
  }
}
