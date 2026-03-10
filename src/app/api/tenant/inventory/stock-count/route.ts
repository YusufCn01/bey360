import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { prisma } from "@/lib/db/prisma";
import { asRecord, numberOrZero } from "@/lib/json";
import { fail, ok } from "@/lib/http/response";
import { applyStockDelta } from "@/modules/catalog/application/stock-service";
import {
  getSerialCountStatus,
  readScopePayload,
  SERIAL_COUNT_HISTORY_SCOPE,
  SERIAL_COUNT_SESSION_SCOPE,
  setSerialCountStatus,
  writeScopePayload,
} from "@/modules/inventory/application/serial-count-lock";

type StockCountRow = {
  key: string;
  productId: string;
  productCode: string;
  productName: string;
  barcode: string;
  warehouseId: string;
  available: number;
  counted: number;
  scanned: boolean;
};

type StockCountSession = {
  id: string;
  startedAt: string;
  startedBy: string;
  rows: StockCountRow[];
};

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({
    action: z.literal("scan"),
    barcode: z.string().min(1).max(120),
  }),
  z.object({
    action: z.literal("resetRow"),
    rowKey: z.string().min(1).max(300),
  }),
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("finish") }),
]);

function asText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asBool(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function toRows(value: unknown): StockCountRow[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      const row = asRecord(item);
      const productId = asText(row.productId);
      if (!productId) {
        return null;
      }
      const warehouseId = asText(row.warehouseId, "main");
      const key = asText(row.key, `${productId}:${warehouseId}`);
      return {
        key,
        productId,
        productCode: asText(row.productCode),
        productName: asText(row.productName),
        barcode: asText(row.barcode),
        warehouseId,
        available: numberOrZero(row.available),
        counted: numberOrZero(row.counted),
        scanned: asBool(row.scanned),
      } satisfies StockCountRow;
    })
    .filter((row): row is StockCountRow => Boolean(row));
}

function parseSession(payload: Record<string, unknown>): StockCountSession | null {
  const id = asText(payload.id);
  const startedAt = asText(payload.startedAt);
  const startedBy = asText(payload.startedBy);
  if (!id || !startedAt) {
    return null;
  }
  return {
    id,
    startedAt,
    startedBy,
    rows: toRows(payload.rows),
  };
}

function normalizeSession(session: StockCountSession): StockCountSession {
  return {
    ...session,
    rows: [...session.rows].sort((a, b) => {
      if (a.productName !== b.productName) {
        return a.productName.localeCompare(b.productName, "tr");
      }
      if (a.productCode !== b.productCode) {
        return a.productCode.localeCompare(b.productCode, "tr");
      }
      return a.warehouseId.localeCompare(b.warehouseId, "tr");
    }),
  };
}

function summarize(rows: StockCountRow[]) {
  let notCounted = 0;
  let exact = 0;
  let missing = 0;
  let extra = 0;

  for (const row of rows) {
    if (!row.scanned) {
      notCounted += 1;
      continue;
    }
    if (row.counted === row.available) {
      exact += 1;
      continue;
    }
    if (row.counted < row.available) {
      missing += 1;
      continue;
    }
    extra += 1;
  }

  return {
    total: rows.length,
    notCounted,
    exact,
    missing,
    extra,
  };
}

async function loadSessionState(tenantId: string) {
  const status = await getSerialCountStatus({ tenantId });
  if (!status.active) {
    return {
      active: false,
      session: null as StockCountSession | null,
    };
  }

  const payload = await readScopePayload({
    tenantId,
    scope: SERIAL_COUNT_SESSION_SCOPE,
  });
  const session = parseSession(payload);
  if (!session) {
    await setSerialCountStatus({
      tenantId,
      active: false,
      finishedAt: new Date().toISOString(),
      note: "Aktif seri sayım kaydı bulunamadı, kilit otomatik kaldırıldı.",
    });
    return {
      active: false,
      session: null,
    };
  }

  return {
    active: true,
    session: normalizeSession(session),
  };
}

async function saveSession(params: { tenantId: string; session: StockCountSession; tx?: Prisma.TransactionClient }) {
  await writeScopePayload({
    tenantId: params.tenantId,
    scope: SERIAL_COUNT_SESSION_SCOPE,
    tx: params.tx,
    payload: {
      id: params.session.id,
      startedAt: params.session.startedAt,
      startedBy: params.session.startedBy,
      rows: params.session.rows,
      updatedAt: new Date().toISOString(),
    },
  });
}

async function appendHistory(params: {
  tenantId: string;
  entry: Record<string, unknown>;
  tx?: Prisma.TransactionClient;
}) {
  const current = await readScopePayload({
    tenantId: params.tenantId,
    scope: SERIAL_COUNT_HISTORY_SCOPE,
    tx: params.tx,
  });
  const history = Array.isArray(current.history) ? current.history : [];

  await writeScopePayload({
    tenantId: params.tenantId,
    scope: SERIAL_COUNT_HISTORY_SCOPE,
    tx: params.tx,
    payload: {
      history: [params.entry, ...history].slice(0, 75),
      updatedAt: new Date().toISOString(),
    },
  });
}

async function clearSession(params: { tenantId: string; tx?: Prisma.TransactionClient }) {
  await writeScopePayload({
    tenantId: params.tenantId,
    scope: SERIAL_COUNT_SESSION_SCOPE,
    tx: params.tx,
    payload: {},
  });
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "product:view");
    const state = await loadSessionState(access.tenantId);

    return ok({
      active: state.active,
      session: state.session,
      summary: state.session ? summarize(state.session.rows) : null,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Seri sayım durumu alınırken hata oluştu.", "SERIAL_COUNT_READ_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "product:create");
    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Seri sayım işlemi geçersiz.", "VALIDATION_ERROR", 422);
    }

    if (parsed.data.action === "start") {
      const current = await loadSessionState(access.tenantId);
      if (current.active && current.session) {
        return ok({
          active: true,
          session: current.session,
          summary: summarize(current.session.rows),
          message: "Aktif seri sayım oturumu devam ediyor.",
        });
      }

      const balances = await prisma.stockBalances.findMany({
        where: {
          tenantId: access.tenantId,
          deletedAt: null,
        },
        take: 5000,
      });

      const map = new Map<string, StockCountRow>();
      for (const item of balances) {
        const payload = asRecord(item.payload);
        const productId = asText(payload.productId);
        if (!productId) {
          continue;
        }
        const warehouseId = asText(payload.warehouseId, "main");
        const key = `${productId}:${warehouseId}`;
        const available = numberOrZero(payload.available ?? payload.quantity);

        const existing = map.get(key);
        if (existing) {
          existing.available += available;
          continue;
        }

        map.set(key, {
          key,
          productId,
          productCode: "",
          productName: "",
          barcode: "",
          warehouseId,
          available,
          counted: 0,
          scanned: false,
        });
      }

      const productIds = [...new Set([...map.values()].map((row) => row.productId))];
      if (productIds.length > 0) {
        const products = await prisma.products.findMany({
          where: {
            tenantId: access.tenantId,
            deletedAt: null,
            id: { in: productIds },
          },
          select: {
            id: true,
            code: true,
            name: true,
            payload: true,
          },
        });
        const details = new Map(
          products.map((item) => [item.id, { code: item.code ?? "", name: item.name ?? "", barcode: asText(asRecord(item.payload).barcode) }]),
        );

        for (const row of map.values()) {
          const info = details.get(row.productId);
          row.productCode = info?.code ?? "";
          row.productName = info?.name ?? row.productId;
          row.barcode = info?.barcode ?? "";
        }
      }

      const session: StockCountSession = normalizeSession({
        id: crypto.randomUUID(),
        startedAt: new Date().toISOString(),
        startedBy: access.userId,
        rows: [...map.values()],
      });

      await saveSession({
        tenantId: access.tenantId,
        session,
      });
      await setSerialCountStatus({
        tenantId: access.tenantId,
        active: true,
        sessionId: session.id,
        startedAt: session.startedAt,
        startedBy: access.userId,
        finishedAt: null,
        note: "Seri sayım başlatıldı.",
      });

      return ok({
        active: true,
        session,
        summary: summarize(session.rows),
        message: "Seri sayım başlatıldı. Satış, iade ve stok hareketleri geçici olarak durduruldu.",
      });
    }

    const current = await loadSessionState(access.tenantId);
    if (!current.active || !current.session) {
      return fail("Aktif seri sayım bulunamadı. Önce sayımı başlatın.", "SERIAL_COUNT_NOT_ACTIVE", 409);
    }
    const activeSession = current.session;

    if (parsed.data.action === "scan") {
      const barcode = parsed.data.barcode.trim();
      const product = await prisma.products.findFirst({
        where: {
          tenantId: access.tenantId,
          deletedAt: null,
          OR: [
            { code: barcode },
            {
              payload: {
                path: ["barcode"],
                equals: barcode,
              },
            },
          ],
        },
        select: {
          id: true,
          code: true,
          name: true,
          payload: true,
        },
      });

      if (!product) {
        return fail("Okutulan barkoda ait ürün bulunamadı.", "PRODUCT_NOT_FOUND", 404);
      }

      const rows = [...activeSession.rows];
      const preferredIndex = rows.findIndex((row) => row.productId === product.id && row.warehouseId === "main");
      const rowIndex = preferredIndex >= 0 ? preferredIndex : rows.findIndex((row) => row.productId === product.id);
      const productPayload = asRecord(product.payload);
      const productCode = product.code ?? "";
      const productName = product.name ?? product.id;
      const productBarcode = asText(productPayload.barcode, barcode);

      if (rowIndex >= 0) {
        const row = rows[rowIndex];
        rows[rowIndex] = {
          ...row,
          productCode,
          productName,
          barcode: productBarcode,
          counted: row.counted + 1,
          scanned: true,
        };
      } else {
        rows.push({
          key: `${product.id}:main`,
          productId: product.id,
          productCode,
          productName,
          barcode: productBarcode,
          warehouseId: "main",
          available: 0,
          counted: 1,
          scanned: true,
        });
      }

      const session = normalizeSession({
        ...activeSession,
        rows,
      });
      await saveSession({
        tenantId: access.tenantId,
        session,
      });

      return ok({
        active: true,
        session,
        summary: summarize(session.rows),
        message: `${productName} ürünü sayıldı (+1).`,
      });
    }

    if (parsed.data.action === "resetRow") {
      const rowKey = (parsed.data as { action: "resetRow"; rowKey: string }).rowKey;
      const rows = activeSession.rows.map((row) => {
        if (row.key !== rowKey) {
          return row;
        }
        return {
          ...row,
          counted: 0,
          scanned: false,
        };
      });

      const session = {
        ...activeSession,
        rows,
      };
      await saveSession({
        tenantId: access.tenantId,
        session,
      });

      return ok({
        active: true,
        session,
        summary: summarize(session.rows),
        message: "Seçili ürün satırının sayımı sıfırlandı.",
      });
    }

    if (parsed.data.action === "cancel") {
      await prisma.$transaction(async (tx) => {
        await appendHistory({
          tenantId: access.tenantId,
          tx,
          entry: {
            id: activeSession.id,
            startedAt: activeSession.startedAt,
            finishedAt: new Date().toISOString(),
            cancelled: true,
            rows: activeSession.rows,
            summary: summarize(activeSession.rows),
          },
        });
        await clearSession({
          tenantId: access.tenantId,
          tx,
        });
        await setSerialCountStatus({
          tenantId: access.tenantId,
          tx,
          active: false,
          sessionId: null,
          finishedAt: new Date().toISOString(),
          note: "Seri sayım iptal edildi.",
        });
      });

      return ok({
        active: false,
        session: null,
        summary: null,
        message: "Sayım iptal edildi. Aktif sayım verisi sıfırlandı.",
      });
    }

    if (parsed.data.action === "finish") {
      const now = new Date();
      const finishedAt = now.toISOString();
      const session = activeSession;
      const rows = session.rows;

      await prisma.$transaction(async (tx) => {
        for (const row of rows) {
          const diff = row.counted - row.available;
          if (diff === 0) {
            continue;
          }

          await applyStockDelta({
            tx,
            tenantId: access.tenantId,
            productId: row.productId,
            warehouseId: row.warehouseId,
            deltaQuantity: diff,
            movementCode: diff > 0 ? "COUNT_ADJUST_IN" : "COUNT_ADJUST_OUT",
            movementName: "Seri Sayım Düzeltmesi",
            movementPayload: {
              serialCountSessionId: session.id,
              availableBefore: row.available,
              counted: row.counted,
              diff,
              barcode: row.barcode,
            },
            occurredAt: now,
            allowDuringSerialCount: true,
          });
        }

        await appendHistory({
          tenantId: access.tenantId,
          tx,
          entry: {
            id: session.id,
            startedAt: session.startedAt,
            finishedAt,
            cancelled: false,
            rows,
            summary: summarize(rows),
          },
        });

        await clearSession({
          tenantId: access.tenantId,
          tx,
        });
        await setSerialCountStatus({
          tenantId: access.tenantId,
          tx,
          active: false,
          sessionId: null,
          finishedAt,
          note: "Seri sayım tamamlandı.",
        });

        await tx.auditLog.create({
          data: {
            tenantId: access.tenantId,
            userId: access.userId,
            module: "inventory",
            entityName: "serial_stock_count",
            entityId: session.id,
            action: "inventory.serial_count.finished",
            payload: {
              rowCount: rows.length,
              finishedAt,
            },
          },
        });
      });

      return ok({
        active: false,
        session: null,
        summary: null,
        message: "Sayım tamamlandı ve stoklar sayım miktarına göre eşitlendi.",
      });
    }

    return fail("Desteklenmeyen seri sayım işlemi.", "UNSUPPORTED_ACTION", 400);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Seri sayım işlemi sırasında hata oluştu.", "SERIAL_COUNT_ACTION_ERROR", 500);
  }
}
