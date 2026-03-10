import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { asRecord } from "@/lib/json";

export const SERIAL_COUNT_STATUS_SCOPE = "seri_sayim_durum";
export const SERIAL_COUNT_SESSION_SCOPE = "seri_sayim_oturumu";
export const SERIAL_COUNT_HISTORY_SCOPE = "seri_sayim_kayitlari";

type SettingsClient = Prisma.TransactionClient | typeof prisma;

type ScopePayloadParams = {
  tenantId: string;
  scope: string;
  tx?: Prisma.TransactionClient;
};

type ScopeWriteParams = ScopePayloadParams & {
  payload: Record<string, unknown>;
};

type SerialCountStatus = {
  active: boolean;
  sessionId: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  startedBy: string | null;
  note: string | null;
};

function asText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNullableText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asBool(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function resolveClient(tx?: Prisma.TransactionClient): SettingsClient {
  return tx ?? prisma;
}

export class SerialCountLockedError extends Error {
  constructor(message = "Seri sayım aktifken satış, iade ve stok giriş/çıkış işlemleri geçici olarak durdurulur.") {
    super(message);
    this.name = "SerialCountLockedError";
  }
}

export async function readScopePayload(params: ScopePayloadParams): Promise<Record<string, unknown>> {
  const db = resolveClient(params.tx);
  const row = await db.tenantSettings.findFirst({
    where: {
      tenantId: params.tenantId,
      deletedAt: null,
      code: params.scope,
    },
    orderBy: { createdAt: "desc" },
  });
  return asRecord(row?.payload);
}

export async function writeScopePayload(params: ScopeWriteParams) {
  const db = resolveClient(params.tx);
  const now = new Date();
  const existing = await db.tenantSettings.findFirst({
    where: {
      tenantId: params.tenantId,
      deletedAt: null,
      code: params.scope,
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    await db.tenantSettings.update({
      where: { id: existing.id },
      data: {
        payload: params.payload as Prisma.InputJsonValue,
        occurredAt: now,
        name: params.scope,
      },
    });
    return;
  }

  await db.tenantSettings.create({
    data: {
      tenantId: params.tenantId,
      code: params.scope,
      name: params.scope,
      status: "active",
      payload: params.payload as Prisma.InputJsonValue,
      occurredAt: now,
    },
  });
}

export async function getSerialCountStatus(params: { tenantId: string; tx?: Prisma.TransactionClient }): Promise<SerialCountStatus> {
  const payload = await readScopePayload({
    tenantId: params.tenantId,
    scope: SERIAL_COUNT_STATUS_SCOPE,
    tx: params.tx,
  });

  return {
    active: asBool(payload.active, false),
    sessionId: asNullableText(payload.sessionId),
    startedAt: asNullableText(payload.startedAt),
    finishedAt: asNullableText(payload.finishedAt),
    startedBy: asNullableText(payload.startedBy),
    note: asNullableText(payload.note),
  };
}

export async function setSerialCountStatus(params: {
  tenantId: string;
  active: boolean;
  sessionId?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  startedBy?: string | null;
  note?: string | null;
  tx?: Prisma.TransactionClient;
}) {
  const current = await getSerialCountStatus({ tenantId: params.tenantId, tx: params.tx });
  await writeScopePayload({
    tenantId: params.tenantId,
    scope: SERIAL_COUNT_STATUS_SCOPE,
    tx: params.tx,
    payload: {
      active: params.active,
      sessionId: params.sessionId ?? current.sessionId ?? null,
      startedAt: params.startedAt ?? current.startedAt ?? null,
      finishedAt: params.finishedAt ?? current.finishedAt ?? null,
      startedBy: params.startedBy ?? current.startedBy ?? null,
      note: params.note ?? current.note ?? null,
      updatedAt: new Date().toISOString(),
    },
  });
}

export async function ensureSerialCountUnlocked(params: {
  tenantId: string;
  tx?: Prisma.TransactionClient;
  operationLabel?: string;
}) {
  const status = await getSerialCountStatus({ tenantId: params.tenantId, tx: params.tx });
  if (!status.active) {
    return;
  }

  const operation = asText(params.operationLabel, "Bu işlem");
  throw new SerialCountLockedError(`${operation} seri sayım devam ederken yapılamaz. Önce sayımı bitirin veya iptal edin.`);
}
