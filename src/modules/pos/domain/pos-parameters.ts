export const POS_PARAMETERS_SCOPE = "pos_settings";

export type ReceiptSize = "58" | "80";
export type ReceiptPrintMode = "ask" | "always" | "never";

export type PosParameters = {
  infoReceiptSize: ReceiptSize;
  infoReceiptPrintMode: ReceiptPrintMode;
  preventOutOfStockSale: boolean;
  enableTwoFactorAuth: boolean;
  warningSoundsEnabled: boolean;
  barcodeSoundsEnabled: boolean;
  preventExpiredProductSale: boolean;
  expiryWarningDays: number;
  requireChangeFlowOnSale: boolean;
  okcActive: boolean;
  okcDevice: string;
  okcIpAddress: string;
  okcPort: string;
  okcSerialNo: string;
  scaleBarcodeEnabled: boolean;
  scaleWeightPrefix: string;
  scalePricePrefixPrimary: string;
  scalePricePrefixSecondary: string;
  scaleProductCodeDigits: number;
  scaleValueDigits: number;
  lastProgramResetAt: string;
  lastMovementResetAt: string;
};

export const defaultPosParameters: PosParameters = {
  infoReceiptSize: "58",
  infoReceiptPrintMode: "ask",
  preventOutOfStockSale: false,
  enableTwoFactorAuth: false,
  warningSoundsEnabled: true,
  barcodeSoundsEnabled: true,
  preventExpiredProductSale: false,
  expiryWarningDays: 32,
  requireChangeFlowOnSale: false,
  okcActive: false,
  okcDevice: "",
  okcIpAddress: "",
  okcPort: "",
  okcSerialNo: "",
  scaleBarcodeEnabled: true,
  scaleWeightPrefix: "28",
  scalePricePrefixPrimary: "27",
  scalePricePrefixSecondary: "29",
  scaleProductCodeDigits: 5,
  scaleValueDigits: 5,
  lastProgramResetAt: "",
  lastMovementResetAt: "",
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export function parsePosParameters(value: unknown): PosParameters {
  const row = asRecord(value);
  const receiptSizeRaw = asText(row.infoReceiptSize, defaultPosParameters.infoReceiptSize);
  const receiptPrintModeRaw = asText(row.infoReceiptPrintMode, defaultPosParameters.infoReceiptPrintMode);

  return {
    infoReceiptSize: receiptSizeRaw === "80" ? "80" : "58",
    infoReceiptPrintMode:
      receiptPrintModeRaw === "always" || receiptPrintModeRaw === "never" ? receiptPrintModeRaw : "ask",
    preventOutOfStockSale: asBool(row.preventOutOfStockSale, defaultPosParameters.preventOutOfStockSale),
    enableTwoFactorAuth: asBool(row.enableTwoFactorAuth, defaultPosParameters.enableTwoFactorAuth),
    warningSoundsEnabled: asBool(row.warningSoundsEnabled, defaultPosParameters.warningSoundsEnabled),
    barcodeSoundsEnabled: asBool(row.barcodeSoundsEnabled, defaultPosParameters.barcodeSoundsEnabled),
    preventExpiredProductSale: asBool(
      row.preventExpiredProductSale,
      defaultPosParameters.preventExpiredProductSale,
    ),
    expiryWarningDays: Math.max(0, Math.floor(asNumber(row.expiryWarningDays, defaultPosParameters.expiryWarningDays))),
    requireChangeFlowOnSale: asBool(row.requireChangeFlowOnSale, defaultPosParameters.requireChangeFlowOnSale),
    okcActive: asBool(row.okcActive, defaultPosParameters.okcActive),
    okcDevice: asText(row.okcDevice, defaultPosParameters.okcDevice),
    okcIpAddress: asText(row.okcIpAddress, defaultPosParameters.okcIpAddress),
    okcPort: asText(row.okcPort, defaultPosParameters.okcPort),
    okcSerialNo: asText(row.okcSerialNo, defaultPosParameters.okcSerialNo),
    scaleBarcodeEnabled: asBool(row.scaleBarcodeEnabled, defaultPosParameters.scaleBarcodeEnabled),
    scaleWeightPrefix: asText(row.scaleWeightPrefix, defaultPosParameters.scaleWeightPrefix),
    scalePricePrefixPrimary: asText(row.scalePricePrefixPrimary, defaultPosParameters.scalePricePrefixPrimary),
    scalePricePrefixSecondary: asText(row.scalePricePrefixSecondary, defaultPosParameters.scalePricePrefixSecondary),
    scaleProductCodeDigits: Math.max(4, Math.floor(asNumber(row.scaleProductCodeDigits, defaultPosParameters.scaleProductCodeDigits))),
    scaleValueDigits: Math.max(4, Math.floor(asNumber(row.scaleValueDigits, defaultPosParameters.scaleValueDigits))),
    lastProgramResetAt: asText(row.lastProgramResetAt, defaultPosParameters.lastProgramResetAt),
    lastMovementResetAt: asText(row.lastMovementResetAt, defaultPosParameters.lastMovementResetAt),
  };
}
