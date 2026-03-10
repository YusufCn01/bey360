import { SeverityLevel } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type AuditInput = {
  tenantId: string;
  userId: string;
  module: string;
  entityName: string;
  entityId: string;
  action: string;
  severity?: SeverityLevel;
  payload: unknown;
  ipAddress?: string;
  userAgent?: string;
};

export async function writeAuditLog(input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      module: input.module,
      entityName: input.entityName,
      entityId: input.entityId,
      action: input.action,
      severity: input.severity ?? SeverityLevel.INFO,
      payload: input.payload as object | undefined,
      ipAddress: input.ipAddress ?? "",
      userAgent: input.userAgent ?? "",
    },
  });
}
