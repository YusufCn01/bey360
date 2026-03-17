export type ScaleBarcodeMode = "weight" | "price";

export type ScaleSettings = {
  enabled: boolean;
  weightPrefix: string;
  pricePrefixPrimary: string;
  pricePrefixSecondary: string;
  productCodeDigits: number;
  valueDigits: number;
};

export type ScaleBarcodeParseResult = {
  productCode: string;
  quantity?: number;
  encodedAmount?: number;
  mode: ScaleBarcodeMode;
  raw: string;
};

export const defaultScaleSettings: ScaleSettings = {
  enabled: true,
  weightPrefix: "28",
  pricePrefixPrimary: "27",
  pricePrefixSecondary: "29",
  productCodeDigits: 5,
  valueDigits: 5,
};

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function parseScaleBarcode(raw: string, settings: ScaleSettings = defaultScaleSettings): ScaleBarcodeParseResult | null {
  if (!settings.enabled) {
    return null;
  }

  const digits = normalizeDigits(raw);
  const totalLength = 2 + settings.productCodeDigits + settings.valueDigits + 1;
  if (digits.length !== totalLength) {
    return null;
  }

  const prefix = digits.slice(0, 2);
  const supportedPrefixes = [
    normalizeDigits(settings.weightPrefix),
    normalizeDigits(settings.pricePrefixPrimary),
    normalizeDigits(settings.pricePrefixSecondary),
  ].filter(Boolean);
  if (!supportedPrefixes.includes(prefix)) {
    return null;
  }

  const productStart = 2;
  const productEnd = productStart + settings.productCodeDigits;
  const valueEnd = productEnd + settings.valueDigits;
  const productCode = digits.slice(productStart, productEnd);
  const encodedValue = Number(digits.slice(productEnd, valueEnd));
  if (!Number.isFinite(encodedValue) || encodedValue <= 0) {
    return null;
  }

  if (prefix === normalizeDigits(settings.weightPrefix)) {
    const quantity = Math.round((encodedValue / 1000) * 1000) / 1000;
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return null;
    }

    return {
      productCode,
      quantity,
      mode: "weight",
      raw: digits,
    };
  }

  return {
    productCode,
    encodedAmount: Math.round(encodedValue) / 100,
    mode: "price",
    raw: digits,
  };
}

export function buildScaleBarcode(params: {
  productCode: string;
  mode: ScaleBarcodeMode;
  quantity?: number;
  amount?: number;
  settings?: ScaleSettings;
}) {
  const settings = params.settings ?? defaultScaleSettings;
  const prefix =
    params.mode === "weight"
      ? normalizeDigits(settings.weightPrefix)
      : normalizeDigits(settings.pricePrefixPrimary);

  const productCode = normalizeDigits(params.productCode)
    .padStart(settings.productCodeDigits, "0")
    .slice(-settings.productCodeDigits);

  const encodedNumeric =
    params.mode === "weight"
      ? Math.round((params.quantity ?? 0) * 1000)
      : Math.round((params.amount ?? 0) * 100);

  const encodedValue = String(Math.max(0, encodedNumeric))
    .padStart(settings.valueDigits, "0")
    .slice(-settings.valueDigits);

  // Son basamak şu an kontrol hanesi yerine sabit tutuluyor.
  return `${prefix}${productCode}${encodedValue}0`;
}
