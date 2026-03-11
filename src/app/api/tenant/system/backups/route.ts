import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { fail, ok } from "@/lib/http/response";
import { getBackupState, runTenantBackup, updateBackupPreferences } from "@/modules/ops/application/backup-service";

const updateSchema = z.object({
  action: z.enum(["run", "update_settings"]),
  autoEnabled: z.boolean().optional(),
  retentionDays: z.number().int().min(7).max(365).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const state = await getBackupState(access.tenantId);
    return ok(state);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    return fail("Yedekleme durumu alınırken hata oluştu.", "BACKUP_STATE_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "tenant:user.manage");
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Yedekleme formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    if (parsed.data.action === "run") {
      const summary = await runTenantBackup(access.tenantId, access.userId);
      return ok({ summary }, { status: 201 });
    }

    const state = await updateBackupPreferences(access.tenantId, access.userId, {
      autoEnabled: parsed.data.autoEnabled,
      retentionDays: parsed.data.retentionDays,
    });

    return ok(state);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    return fail("Yedekleme işlemi sırasında hata oluştu.", "BACKUP_ACTION_ERROR", 500);
  }
}
