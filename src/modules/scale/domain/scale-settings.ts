export type ScaleBrandCode = "tem" | "cas" | "cas_cl3000_stream" | "dikomsan" | "hana" | "betsa" | "tess" | "custom";
export type ScaleTransport = "serial" | "tcp";
export type ScaleCommandMode = "none" | "text" | "hex";
export type ScaleReadMode = "poll" | "stream";

export type ScaleBrandPreset = {
  code: ScaleBrandCode;
  label: string;
  description: string;
  transport: ScaleTransport;
  tcpPort: number;
  baudRate: number;
  dataBits: 7 | 8;
  stopBits: 1 | 2;
  parity: "none" | "even" | "odd";
  commandMode: ScaleCommandMode;
  pollCommand: string;
  readMode: ScaleReadMode;
  responsePattern: string;
  stableTokens: string;
  unstableTokens: string;
  unit: "kg" | "g";
};

export type ScaleConnectionSettings = {
  enabled: boolean;
  brand: ScaleBrandCode;
  transport: ScaleTransport;
  host: string;
  port: number;
  serialPath: string;
  baudRate: number;
  dataBits: 7 | 8;
  stopBits: 1 | 2;
  parity: "none" | "even" | "odd";
  timeoutMs: number;
  commandMode: ScaleCommandMode;
  pollCommand: string;
  readMode: ScaleReadMode;
  responsePattern: string;
  stableTokens: string;
  unstableTokens: string;
  unit: "kg" | "g";
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

export const scaleBrandPresets: ScaleBrandPreset[] = [
  {
    code: "tem",
    label: "TEM",
    description: "TEM serisi teraziler icin seri port odakli canli agirlik akisi.",
    transport: "serial",
    tcpPort: 10001,
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: "none",
    commandMode: "text",
    pollCommand: "SI\\r\\n",
    readMode: "poll",
    responsePattern: "(?<stable>ST|US|GS)?[^0-9+-]*(?<weight>[+-]?\\d+(?:[.,]\\d{1,3})?)\\s*(?<unit>kg|g)?",
    stableTokens: "ST,GS",
    unstableTokens: "US,MOTION,UNSTABLE",
    unit: "kg",
  },
  {
    code: "cas",
    label: "CAS / CL3000",
    description: "CAS CL3000 ve benzeri modeller icin varsayilan sorgu profili. Gerekirse stream modu veya komut deseni ayardan degistirilebilir.",
    transport: "serial",
    tcpPort: 20304,
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: "none",
    commandMode: "text",
    pollCommand: "W\\r\\n",
    readMode: "poll",
    responsePattern: "(?<stable>ST|US)?[^0-9+-]*(?<weight>[+-]?\\d+(?:[.,]\\d{1,3})?)\\s*(?<unit>kg|g)?",
    stableTokens: "ST,GS",
    unstableTokens: "US,MOTION,OL",
    unit: "kg",
  },
  {
    code: "cas_cl3000_stream",
    label: "CAS / CL3000 (Stream)",
    description: "CAS CL3000 cihazinin surekli veri akisi modunda komut gondermeden okuma profili.",
    transport: "serial",
    tcpPort: 20304,
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: "none",
    commandMode: "none",
    pollCommand: "",
    readMode: "stream",
    responsePattern: "(?<stable>ST|US)?[^0-9+-]*(?<weight>[+-]?\\d+(?:[.,]\\d{1,3})?)\\s*(?<unit>kg|g)?",
    stableTokens: "ST,GS",
    unstableTokens: "US,MOTION,OL",
    unit: "kg",
  },
  {
    code: "dikomsan",
    label: "Dikomsan",
    description: "Dikomsan cihazlari icin seri port veya ethernet uzerinden agirlik sorgusu.",
    transport: "serial",
    tcpPort: 10001,
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: "none",
    commandMode: "text",
    pollCommand: "SI\\r\\n",
    readMode: "poll",
    responsePattern: "(?<stable>ST|US|OK)?[^0-9+-]*(?<weight>[+-]?\\d+(?:[.,]\\d{1,3})?)\\s*(?<unit>kg|g)?",
    stableTokens: "ST,OK",
    unstableTokens: "US,MOTION",
    unit: "kg",
  },
  {
    code: "hana",
    label: "Hana",
    description: "Hana terazilerde seri port ve TCP bridge ile canli agirlik okuma.",
    transport: "serial",
    tcpPort: 10001,
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: "none",
    commandMode: "text",
    pollCommand: "RW\\r\\n",
    readMode: "poll",
    responsePattern: "(?<stable>ST|US)?[^0-9+-]*(?<weight>[+-]?\\d+(?:[.,]\\d{1,3})?)\\s*(?<unit>kg|g)?",
    stableTokens: "ST",
    unstableTokens: "US,MOTION",
    unit: "kg",
  },
  {
    code: "betsa",
    label: "Betsa",
    description: "Betsa modelleri icin seri port sorgu profili.",
    transport: "serial",
    tcpPort: 10001,
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: "none",
    commandMode: "text",
    pollCommand: "P\\r\\n",
    readMode: "poll",
    responsePattern: "(?<stable>ST|US|OK)?[^0-9+-]*(?<weight>[+-]?\\d+(?:[.,]\\d{1,3})?)\\s*(?<unit>kg|g)?",
    stableTokens: "ST,OK",
    unstableTokens: "US,MOTION",
    unit: "kg",
  },
  {
    code: "tess",
    label: "TESS",
    description: "TESS tartim cihazlari icin seri port veya ethernet sorgu profili.",
    transport: "serial",
    tcpPort: 10001,
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: "none",
    commandMode: "text",
    pollCommand: "SI\\r\\n",
    readMode: "poll",
    responsePattern: "(?<stable>ST|US)?[^0-9+-]*(?<weight>[+-]?\\d+(?:[.,]\\d{1,3})?)\\s*(?<unit>kg|g)?",
    stableTokens: "ST,GS",
    unstableTokens: "US,MOTION",
    unit: "kg",
  },
  {
    code: "custom",
    label: "Ozel Profil",
    description: "Marka/model farklarinda komut ve regex deseni elle tanimlanir.",
    transport: "serial",
    tcpPort: 10001,
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: "none",
    commandMode: "text",
    pollCommand: "SI\\r\\n",
    readMode: "poll",
    responsePattern: "(?<stable>ST|US)?[^0-9+-]*(?<weight>[+-]?\\d+(?:[.,]\\d{1,3})?)\\s*(?<unit>kg|g)?",
    stableTokens: "ST",
    unstableTokens: "US,MOTION",
    unit: "kg",
  },
];

export const defaultScaleConnectionSettings: ScaleConnectionSettings = {
  enabled: false,
  brand: "tem",
  transport: "serial",
  host: "127.0.0.1",
  port: 10001,
  serialPath: "COM3",
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: "none",
  timeoutMs: 1800,
  commandMode: "text",
  pollCommand: "SI\\r\\n",
  readMode: "poll",
  responsePattern: "(?<stable>ST|US|GS)?[^0-9+-]*(?<weight>[+-]?\\d+(?:[.,]\\d{1,3})?)\\s*(?<unit>kg|g)?",
  stableTokens: "ST,GS",
  unstableTokens: "US,MOTION,UNSTABLE",
  unit: "kg",
};

export function getScaleBrandPreset(brand: ScaleBrandCode): ScaleBrandPreset {
  return scaleBrandPresets.find((item) => item.code === brand) ?? scaleBrandPresets[0];
}

export function applyScaleBrandPreset(
  brand: ScaleBrandCode,
  partial?: Partial<ScaleConnectionSettings>,
): ScaleConnectionSettings {
  const preset = getScaleBrandPreset(brand);
  return {
    ...defaultScaleConnectionSettings,
    ...partial,
    brand,
    transport: partial?.transport ?? preset.transport,
    port: partial?.port ?? preset.tcpPort,
    baudRate: partial?.baudRate ?? preset.baudRate,
    dataBits: partial?.dataBits ?? preset.dataBits,
    stopBits: partial?.stopBits ?? preset.stopBits,
    parity: partial?.parity ?? preset.parity,
    commandMode: partial?.commandMode ?? preset.commandMode,
    pollCommand: partial?.pollCommand ?? preset.pollCommand,
    readMode: partial?.readMode ?? preset.readMode,
    responsePattern: partial?.responsePattern ?? preset.responsePattern,
    stableTokens: partial?.stableTokens ?? preset.stableTokens,
    unstableTokens: partial?.unstableTokens ?? preset.unstableTokens,
    unit: partial?.unit ?? preset.unit,
  };
}

export function parseScaleConnectionSettings(payload: unknown): ScaleConnectionSettings {
  const row = asRecord(payload);
  const brandRaw = asText(row.brand, defaultScaleConnectionSettings.brand);
  const brand = (scaleBrandPresets.some((item) => item.code === brandRaw) ? brandRaw : defaultScaleConnectionSettings.brand) as ScaleBrandCode;
  const preset = getScaleBrandPreset(brand);
  const transportRaw = asText(row.transport, preset.transport);
  const transport = transportRaw === "tcp" ? "tcp" : "serial";
  const commandModeRaw = asText(row.commandMode, preset.commandMode);
  const commandMode: ScaleCommandMode =
    commandModeRaw === "hex" || commandModeRaw === "none" ? commandModeRaw : "text";
  const readModeRaw = asText(row.readMode, preset.readMode);
  const readMode: ScaleReadMode = readModeRaw === "stream" ? "stream" : "poll";
  const parityRaw = asText(row.parity, preset.parity);
  const parity = parityRaw === "even" || parityRaw === "odd" ? parityRaw : "none";
  const unitRaw = asText(row.unit, preset.unit);
  const unit = unitRaw === "g" ? "g" : "kg";

  return {
    enabled: asBoolean(row.enabled, defaultScaleConnectionSettings.enabled),
    brand,
    transport,
    host: asText(row.host, defaultScaleConnectionSettings.host),
    port: Math.max(1, Math.floor(asNumber(row.port, preset.tcpPort))),
    serialPath: asText(row.serialPath, defaultScaleConnectionSettings.serialPath),
    baudRate: Math.max(1200, Math.floor(asNumber(row.baudRate, preset.baudRate))),
    dataBits: asNumber(row.dataBits, preset.dataBits) === 7 ? 7 : 8,
    stopBits: asNumber(row.stopBits, preset.stopBits) === 2 ? 2 : 1,
    parity,
    timeoutMs: Math.max(500, Math.floor(asNumber(row.timeoutMs, defaultScaleConnectionSettings.timeoutMs))),
    commandMode,
    pollCommand: asText(row.pollCommand, preset.pollCommand),
    readMode,
    responsePattern: asText(row.responsePattern, preset.responsePattern),
    stableTokens: asText(row.stableTokens, preset.stableTokens),
    unstableTokens: asText(row.unstableTokens, preset.unstableTokens),
    unit,
  };
}
