import net from "node:net";
import {
  type ScaleConnectionSettings,
  type ScaleTransport,
  parseScaleConnectionSettings,
} from "@/modules/scale/domain/scale-settings";

type SerialPortLike = {
  isOpen?: boolean;
  on(event: string, listener: (...args: unknown[]) => void): unknown;
  once(event: string, listener: (...args: unknown[]) => void): unknown;
  write(data: Buffer, callback?: (error?: Error | null) => void): void;
  close(callback?: (error?: Error | null) => void): void;
  destroy?(): void;
};

type SerialPortModule = {
  SerialPort: {
    new (options: Record<string, unknown>): SerialPortLike;
    list(): Promise<
      Array<{
        path: string;
        manufacturer?: string;
        serialNumber?: string;
        friendlyName?: string;
        vendorId?: string;
        productId?: string;
      }>
    >;
  };
};

export type ScaleReadResult = {
  transport: ScaleTransport;
  stable: boolean | null;
  weightKg: number | null;
  weightText: string | null;
  unit: "kg" | "g";
  raw: string;
  latencyMs: number;
};

export type ScalePortSummary = {
  path: string;
  manufacturer: string;
  serialNumber: string;
  friendlyName: string;
  vendorId: string;
  productId: string;
};

function parseCommandBuffer(commandMode: ScaleConnectionSettings["commandMode"], command: string): Buffer | null {
  const normalizedCommand = command.trim();

  if (commandMode === "none" || normalizedCommand.length === 0) {
    return null;
  }

  if (commandMode === "hex") {
    const hex = normalizedCommand.replace(/[^a-fA-F0-9]/g, "");
    if (hex.length === 0 || hex.length % 2 !== 0) {
      return null;
    }
    return Buffer.from(hex, "hex");
  }

  return Buffer.from(
    normalizedCommand
      .replace(/\\r/g, "\r")
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t"),
    "utf8",
  );
}

function sanitizeRawText(raw: string): string {
  return raw.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

function parseTokens(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter((item) => item.length > 0);
}

function inferStable(rawUpper: string, settings: ScaleConnectionSettings): boolean | null {
  const stableTokens = parseTokens(settings.stableTokens);
  const unstableTokens = parseTokens(settings.unstableTokens);

  if (unstableTokens.some((item) => rawUpper.includes(item))) {
    return false;
  }
  if (stableTokens.some((item) => rawUpper.includes(item))) {
    return true;
  }
  return null;
}

function parseWeightText(raw: string, settings: ScaleConnectionSettings): ScaleReadResult {
  const startedAt = Date.now();
  const cleanText = sanitizeRawText(raw);
  const rawUpper = cleanText.toUpperCase();
  const stable = inferStable(rawUpper, settings);
  const defaultUnit = settings.unit;
  let weightKg: number | null = null;
  let weightText: string | null = null;
  let resolvedUnit: "kg" | "g" = defaultUnit;

  const patterns = [settings.responsePattern, "(?<weight>[+-]?\\d+(?:[.,]\\d{1,3})?)\\s*(?<unit>kg|g)?"];

  for (const pattern of patterns) {
    if (!pattern || pattern.trim().length === 0) {
      continue;
    }

    try {
      const regex = new RegExp(pattern, "gi");
      const matches = Array.from(cleanText.matchAll(regex));
      const match = matches[matches.length - 1];
      if (!match) {
        continue;
      }

      const groups = match.groups ?? {};
      const rawWeight = typeof groups.weight === "string" ? groups.weight : match[1];
      const parsedWeight = Number(String(rawWeight ?? "").replace(",", "."));
      if (!Number.isFinite(parsedWeight)) {
        continue;
      }

      const unitRaw = typeof groups.unit === "string" ? groups.unit.toLowerCase() : defaultUnit;
      resolvedUnit = unitRaw === "g" ? "g" : "kg";
      weightText = `${parsedWeight}`.replace(".", ",");
      weightKg = resolvedUnit === "g" ? parsedWeight / 1000 : parsedWeight;
      break;
    } catch {
      continue;
    }
  }

  return {
    transport: settings.transport,
    stable,
    weightKg,
    weightText,
    unit: resolvedUnit,
    raw: cleanText,
    latencyMs: Date.now() - startedAt,
  };
}

function emptyScaleReadResult(settings: ScaleConnectionSettings, raw = "", latencyMs = 0): ScaleReadResult {
  return {
    transport: settings.transport,
    stable: null,
    weightKg: null,
    weightText: null,
    unit: settings.unit,
    raw: sanitizeRawText(raw),
    latencyMs,
  };
}

async function loadSerialPortModule(): Promise<SerialPortModule> {
  try {
    const loader = Function("return require")() as (moduleId: string) => unknown;
    return loader("serialport") as SerialPortModule;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Serial port modulu yuklenemedi: ${error.message}`
        : "Serial port modulu yuklenemedi.",
    );
  }
}

async function readFromTcp(settings: ScaleConnectionSettings): Promise<ScaleReadResult> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const socket = new net.Socket();
    const commandBuffer = parseCommandBuffer(settings.commandMode, settings.pollCommand);
    const chunks: Buffer[] = [];
    let settled = false;
    let idleTimer: NodeJS.Timeout | null = null;

    const clearIdleTimer = () => {
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
    };

    const scheduleIdleFinalize = (delayMs: number) => {
      clearIdleTimer();
      idleTimer = setTimeout(() => finalize(), delayMs);
    };

    const finalize = (error?: Error | null) => {
      if (settled) {
        return;
      }
      settled = true;
      clearIdleTimer();
      socket.destroy();

      if (error) {
        reject(error);
        return;
      }

      const raw = Buffer.concat(chunks).toString("utf8");
      const parsed = raw.trim().length > 0 ? parseWeightText(raw, settings) : emptyScaleReadResult(settings, raw);
      resolve({
        ...parsed,
        latencyMs: Date.now() - startedAt,
      });
    };

    socket.setNoDelay(true);
    socket.setTimeout(settings.timeoutMs);
    socket.once("timeout", () => finalize(new Error("Terazi baglanti zaman asimina ugradi.")));
    socket.once("error", (error) => finalize(error));
    socket.once("close", () => {
      if (!settled && chunks.length > 0) {
        finalize();
      }
    });
    socket.once("end", () => {
      if (!settled) {
        finalize();
      }
    });
    socket.once("connect", () => {
      if (commandBuffer) {
        socket.write(commandBuffer);
      }
      if (settings.readMode === "stream" || !commandBuffer) {
        scheduleIdleFinalize(Math.min(settings.timeoutMs, 900));
      }
    });
    socket.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk));
      const preview = parseWeightText(Buffer.concat(chunks).toString("utf8"), settings);
      if (preview.weightKg !== null) {
        finalize();
        return;
      }
      scheduleIdleFinalize(250);
    });

    socket.connect(settings.port, settings.host);
  });
}

async function readFromSerial(settings: ScaleConnectionSettings): Promise<ScaleReadResult> {
  const { SerialPort } = await loadSerialPortModule();

  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const commandBuffer = parseCommandBuffer(settings.commandMode, settings.pollCommand);
    const chunks: Buffer[] = [];
    let settled = false;

    const port = new SerialPort({
      path: settings.serialPath,
      baudRate: settings.baudRate,
      dataBits: settings.dataBits,
      stopBits: settings.stopBits,
      parity: settings.parity,
      autoOpen: true,
    });

    const finalize = (error?: Error | null) => {
      if (settled) {
        return;
      }
      settled = true;

      const done = () => {
        if (error) {
          reject(error);
          return;
        }

        const raw = Buffer.concat(chunks).toString("utf8");
        const parsed = parseWeightText(raw, settings);
        resolve({
          ...parsed,
          latencyMs: Date.now() - startedAt,
        });
      };

      try {
        if (port.isOpen) {
          port.close(() => done());
        } else {
          done();
        }
      } catch {
        done();
      }
    };

    const timer = setTimeout(() => {
      finalize(new Error("Terazi seri portundan veri okunamadi."));
    }, settings.timeoutMs);

    port.once("open", () => {
      if (commandBuffer) {
        port.write(commandBuffer, (error) => {
          if (error) {
            clearTimeout(timer);
            finalize(error);
          }
        });
      } else if (settings.readMode === "stream") {
        setTimeout(() => {
          clearTimeout(timer);
          finalize();
        }, Math.min(settings.timeoutMs, 900));
      }
    });

    port.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk as Buffer));
      const preview = parseWeightText(Buffer.concat(chunks).toString("utf8"), settings);
      if (preview.weightKg !== null) {
        clearTimeout(timer);
        finalize();
      }
    });

    port.once("error", (error) => {
      clearTimeout(timer);
      finalize(error as Error);
    });
  });
}

async function withHardTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timer = setTimeout(() => {
        clearTimeout(timer);
        reject(new Error(message));
      }, timeoutMs);
    }),
  ]);
}

export async function listScaleSerialPorts(): Promise<ScalePortSummary[]> {
  const { SerialPort } = await loadSerialPortModule();
  const ports = await SerialPort.list();

  return ports.map((item) => ({
    path: item.path,
    manufacturer: item.manufacturer ?? "",
    serialNumber: item.serialNumber ?? "",
    friendlyName: item.friendlyName ?? "",
    vendorId: item.vendorId ?? "",
    productId: item.productId ?? "",
  }));
}

export async function testScaleConnection(input: unknown): Promise<ScaleReadResult> {
  const settings = parseScaleConnectionSettings(input);
  const startedAt = Date.now();

  if (settings.transport === "tcp") {
    return await withHardTimeout(
      new Promise<ScaleReadResult>((resolve, reject) => {
        const socket = new net.Socket();
        let settled = false;

        const finalize = (error?: Error | null) => {
          if (settled) {
            return;
          }
          settled = true;
          socket.destroy();

          if (error) {
            reject(error);
            return;
          }

          resolve({
            ...emptyScaleReadResult(settings, "TCP baglantisi kuruldu.", Date.now() - startedAt),
            stable: true,
          });
        };

        socket.setNoDelay(true);
        socket.setTimeout(settings.timeoutMs);
        socket.once("timeout", () => finalize(new Error("Terazi baglanti zaman asimina ugradi.")));
        socket.once("error", (error) => finalize(error));
        socket.once("connect", () => {
          const commandBuffer = parseCommandBuffer(settings.commandMode, settings.pollCommand);
          if (commandBuffer) {
            socket.write(commandBuffer);
          }
          setTimeout(() => finalize(), 150);
        });
        socket.connect(settings.port, settings.host);
      }),
      Math.max(1000, settings.timeoutMs + 250),
      "Terazi baglanti istegi zaman asimina ugradi.",
    );
  }

  return await withHardTimeout(
    readFromSerial(settings),
    Math.max(1000, settings.timeoutMs + 250),
    "Terazi baglanti istegi zaman asimina ugradi.",
  );
}

export async function readScaleWeight(input: unknown): Promise<ScaleReadResult> {
  const settings = parseScaleConnectionSettings(input);
  return await withHardTimeout(
    settings.transport === "tcp" ? readFromTcp(settings) : readFromSerial(settings),
    Math.max(1000, settings.timeoutMs + 250),
    "Terazi okuma istegi zaman asimina ugradi.",
  );
}
