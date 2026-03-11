import type { Prisma } from "@prisma/client";
import { asRecord } from "@/lib/json";

const SMS_SETTINGS_SCOPE = "sms_settings";

type SmsSettings = {
  saleNotificationEnabled: boolean;
  senderName: string;
};

function readText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function maskPhone(value: string): string {
  const phone = normalizePhone(value);
  if (phone.length < 6) {
    return phone;
  }
  return `${phone.slice(0, 3)}*****${phone.slice(-2)}`;
}

function formatTry(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export async function readSmsSettings(
  tx: Prisma.TransactionClient,
  tenantId: string,
): Promise<SmsSettings> {
  const row = await tx.tenantSettings.findFirst({
    where: {
      tenantId,
      deletedAt: null,
      code: SMS_SETTINGS_SCOPE,
    },
    orderBy: { createdAt: "desc" },
  });

  const payload = asRecord(row?.payload);
  return {
    saleNotificationEnabled: payload.saleNotificationEnabled === true,
    senderName: readText(payload.senderName, "Bey360"),
  };
}

export async function queueSaleSmsNotification(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    saleCode: string;
    customerCode?: string;
    customerName?: string;
    phone?: string | null;
    netTotal: number;
    outstanding: number;
  },
) {
  const phone = normalizePhone(input.phone ?? "");
  if (phone.length < 10) {
    return null;
  }

  const message = [
    `${input.customerName ?? "Sayin Musteri"},`,
    `fis no ${input.saleCode} ile ${formatTry(input.netTotal)} tutarinda satis kaydi olusturuldu.`,
    input.outstanding > 0 ? `Kalan borc: ${formatTry(input.outstanding)}.` : "Odeme tamamlandi.",
    "Tesekkur ederiz.",
  ].join(" ");

  return tx.smsLogs.create({
    data: {
      tenantId: input.tenantId,
      code: "pos.sale.notification",
      name: input.customerCode ?? input.customerName ?? "Musteri",
      status: "queued",
      payload: {
        to: phone,
        maskedTo: maskPhone(phone),
        channel: "application",
        purpose: "sale_notification",
        saleCode: input.saleCode,
        customerCode: input.customerCode,
        customerName: input.customerName,
        netTotal: input.netTotal,
        outstanding: input.outstanding,
        message,
      } as Prisma.InputJsonValue,
      occurredAt: new Date(),
    },
  });
}
