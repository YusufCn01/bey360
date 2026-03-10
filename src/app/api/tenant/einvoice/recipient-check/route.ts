import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { fail, ok } from "@/lib/http/response";
import { getEInvoiceProvider } from "@/modules/einvoice/providers/registry";

const recipientCheckSchema = z.object({
  providerCode: z.string().min(1).default("mock-einvoice"),
  taxId: z.string().min(10).max(11),
});

export async function POST(request: NextRequest) {
  try {
    await requireTenantAccess(request, ["einvoice:view", "dashboard:view"]);
    const parsed = recipientCheckSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Alıcı kontrol formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const provider = getEInvoiceProvider(parsed.data.providerCode);
    await provider.authenticate();
    const result = await provider.checkRecipient({ taxId: parsed.data.taxId });

    return ok({
      taxId: parsed.data.taxId,
      providerCode: parsed.data.providerCode,
      ...result,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Alıcı kontrolü sırasında hata oluştu.", "EINVOICE_RECIPIENT_CHECK_ERROR", 500);
  }
}
