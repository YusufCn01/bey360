"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { formatTry } from "@/lib/format/currency";
import {
  defaultPosParameters,
  parsePosParameters,
  POS_PARAMETERS_SCOPE,
  type PosParameters,
} from "@/modules/pos/domain/pos-parameters";
import {
  defaultScaleSettings,
  parseScaleBarcode,
  type ScaleBarcodeParseResult,
} from "@/modules/pos/domain/scale";
import {
  defaultScaleConnectionSettings,
  parseScaleConnectionSettings,
  type ScaleConnectionSettings,
} from "@/modules/scale/domain/scale-settings";
import { PosCameraScannerModal } from "@/modules/pos/ui/fast-sales/components/pos-camera-scanner-modal";
import { PosMixedPaymentModal } from "@/modules/pos/ui/fast-sales/components/pos-mixed-payment-modal";
import { PosMobileActionBar } from "@/modules/pos/ui/fast-sales/components/pos-mobile-action-bar";
import { PosNumpad } from "@/modules/pos/ui/fast-sales/components/pos-numpad";
import { PosSaleTabs } from "@/modules/pos/ui/fast-sales/components/pos-sale-tabs";
import type { MixedPaymentDraft, SaleTabSnapshot } from "@/modules/pos/ui/fast-sales/types";

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: { message?: string };
};

type SessionData = {
  userId: string;
  tenantId: string;
  roleCodes: string[];
  email: string;
  permissionKeys?: string[];
  permissionCatalog?: string[];
};

type ProductRow = {
  id: string;
  code: string;
  name: string;
  unit: string;
  barcode?: string;
  parallelBarcodes: string[];
  imageUrl?: string;
  vatRate: number;
  stock: number;
  expiryDate?: string;
  lockedForSale: boolean;
  prices: [number, number, number, number];
  isScaleProduct: boolean;
  scaleProductCode: string;
  scaleBarcodeMode: "weight" | "price";
  scaleTareGrams: number;
};

type ProductApiRow = {
  id: string;
  code: string;
  name: string;
  payload?: Record<string, unknown>;
};

type CustomerApiRow = {
  id?: string;
  code?: string;
  name?: string;
  payload?: Record<string, unknown>;
  riskLimit?: number;
  maturityDays?: number;
  currentBalance?: number;
  availableRisk?: number;
  riskUsageRate?: number;
  riskStatus?: "ok" | "warning" | "over_limit" | "no_limit";
};

type StockBalanceRow = {
  payload?: Record<string, unknown>;
};

type SettingsRow = {
  payload?: Record<string, unknown>;
};

type CartLine = {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
};

type PosSaleItem = {
  productId: string;
  productCode?: string;
  productName: string;
  quantity: number;
  returnedQuantity?: number;
  remainingQuantity?: number;
  unitPrice: number;
  taxRate: number;
  warehouseId?: string;
};

type PosPayment = {
  method: "nakit" | "kart" | "havale_eft" | "cari" | "cek" | "dekont";
  amount: number;
  reference?: string;
};

type PosSaleHistoryRow = {
  id: string;
  saleCode: string;
  registerId: string;
  registerName: string;
  customerCode?: string;
  customerName?: string;
  currency: string;
  total: number;
  occurredAt: string;
  items: PosSaleItem[];
  payments: PosPayment[];
};

type SuspendedCartRow = {
  id: string;
  code?: string;
  name?: string;
  payload?: Record<string, unknown>;
  createdAt?: string;
};

type SuspendedRestoreResult = {
  suspendedSaleId: string;
  registerId?: string;
  customerCode?: string;
  customerName?: string;
  items: PosSaleItem[];
};

type ReturnDraftLine = {
  key: string;
  productId: string;
  productCode?: string;
  productName: string;
  soldQuantity: number;
  maxReturnQuantity: number;
  returnQuantity: number;
  unitPrice: number;
  taxRate: number;
  warehouseId?: string;
  selected: boolean;
};

type SaleResult = {
  saleId: string;
  saleCode: string;
  netTotal: number;
  paidTotal: number;
  outstanding: number;
  changeAmount: number;
};

type PosSessionCurrentResponse = {
  registerId: string | null;
  openSession: null | {
    id: string;
    code: string;
    name: string;
    status: string;
    createdAt: string;
    occurredAt?: string;
    payload?: Record<string, unknown>;
  };
  openingCash: number;
  closingCash: number;
  todaysSalesCount: number;
  todaysSalesTotal: number;
  lastClosureReport: null | {
    closedAt: string | null;
    expectedClosingCash: number;
    countedClosingCash: number;
    cashVariance: number;
    varianceStatus: string;
  };
};

type CustomerScreenLine = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type CustomerScreenState = {
  registerName: string;
  customerName: string;
  total: number;
  totalQuantity: number;
  lines: CustomerScreenLine[];
  updatedAt: string;
};

type CariCustomerRow = {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  riskLimit: number;
  maturityDays: number;
  currentBalance: number;
  availableRisk: number;
  riskUsageRate: number;
  riskStatus: "ok" | "warning" | "over_limit" | "no_limit";
};

type QuickCreateCustomerResponse = {
  id: string;
  code?: string;
  name?: string;
  payload?: Record<string, unknown>;
};

type ConfirmDialogTone = "info" | "danger";

type ConfirmDialogState = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: ConfirmDialogTone;
};

type ReceiptPrinterSettings = {
  receiptPrinterName: string;
  receiptPaperMm: "58" | "80";
  receiptCopies: number;
  autoPrintReceipt: boolean;
  printPreviewEnabled: boolean;
};

const defaultReceiptPrinterSettings: ReceiptPrinterSettings = {
  receiptPrinterName: "",
  receiptPaperMm: "58",
  receiptCopies: 1,
  autoPrintReceipt: true,
  printPreviewEnabled: true,
};

type BarcodeDetectorResult = { rawValue?: string };
type BarcodeDetectorLike = { detect: (source: ImageBitmapSource) => Promise<BarcodeDetectorResult[]> };
type BarcodeDetectorClassLike = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

function isInputLikeElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
    return true;
  }

  if (target.isContentEditable) {
    return true;
  }

  return Boolean(target.closest("[data-shortcut-ignore='true']"));
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
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

function asText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asTextArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item, index, arr) => item.length > 0 && arr.indexOf(item) === index);
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function parseReceiptPrinterSettings(value: unknown): ReceiptPrinterSettings {
  const payload = asRecord(value);
  const paper = asText(payload.receiptPaperMm, defaultReceiptPrinterSettings.receiptPaperMm);
  return {
    receiptPrinterName: asText(payload.receiptPrinterName, defaultReceiptPrinterSettings.receiptPrinterName),
    receiptPaperMm: paper === "80" ? "80" : "58",
    receiptCopies: Math.max(1, Math.floor(asNumber(payload.receiptCopies, defaultReceiptPrinterSettings.receiptCopies))),
    autoPrintReceipt: asBoolean(payload.autoPrintReceipt, defaultReceiptPrinterSettings.autoPrintReceipt),
    printPreviewEnabled: asBoolean(payload.printPreviewEnabled, defaultReceiptPrinterSettings.printPreviewEnabled),
  };
}

function roundQuantity(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function normalizeQuantity(value: number, min = 0.001): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, roundQuantity(value));
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(roundQuantity(value));
}

function getQuantityStep(unit?: string): number {
  const normalized = (unit ?? "").trim().toLocaleUpperCase("tr");
  if (["KG", "KİLO", "KILO", "GR", "GRAM", "LT", "L", "LİTRE", "LITRE"].includes(normalized)) {
    return 0.001;
  }
  return 1;
}

function toDateOnly(value: string): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  date.setHours(0, 0, 0, 0);
  return date;
}

function isExpired(dateText?: string): boolean {
  if (!dateText) {
    return false;
  }

  const target = toDateOnly(dateText);
  if (!target) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return target < today;
}

function daysUntilExpiry(dateText?: string): number | null {
  const target = dateText ? toDateOnly(dateText) : null;
  if (!target) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = target.getTime() - today.getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

function matchesScaleProductCode(product: ProductRow, scaleProductCode: string): boolean {
  if (product.isScaleProduct && product.scaleProductCode) {
    return product.scaleProductCode.replace(/\D/g, "") === scaleProductCode.replace(/\D/g, "");
  }

  const targetText = scaleProductCode.toLocaleLowerCase("tr");
  const targetDigits = scaleProductCode.replace(/\D/g, "");

  const match = (candidate: string) => {
    if (!candidate) {
      return false;
    }

    const text = candidate.toLocaleLowerCase("tr");
    if (text === targetText) {
      return true;
    }

    const digits = candidate.replace(/\D/g, "");
    if (!digits || !targetDigits) {
      return false;
    }

    return digits === targetDigits || digits.endsWith(targetDigits);
  };

  if (match(product.code) || match(product.barcode ?? "")) {
    return true;
  }
  return product.parallelBarcodes.some((barcode) => match(barcode));
}

function hashColor(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `linear-gradient(145deg, hsl(${hue} 65% 36%), hsl(${(hue + 26) % 360} 72% 52%))`;
}

function productInitials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) {
    return "UR";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

async function requestApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !body.success) {
    throw new Error(body.error?.message ?? "İşlem başarısız oldu.");
  }

  return body.data;
}

function isSerialScaleSupportedInClient(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const host = window.location.hostname.toLowerCase();
  const isLocalHost =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".test");
  const hasDesktopBridge = Boolean(
    (window as Window & {
      bey360Desktop?: unknown;
    }).bey360Desktop,
  );

  return isLocalHost || hasDesktopBridge;
}

export function PosClient() {
  const [registerId, setRegisterId] = React.useState("KASA-01");
  const [registerName, setRegisterName] = React.useState("Merkez Kasa");
  const [companyName, setCompanyName] = React.useState("Bey360");
  const [branchName, setBranchName] = React.useState("MERKEZ");
  const [cashierName, setCashierName] = React.useState("Kasiyer");
  const [currencyCode, setCurrencyCode] = React.useState("TRY");
  const [connectionOnline, setConnectionOnline] = React.useState(true);
  const [customerCode, setCustomerCode] = React.useState("");
  const [customerName, setCustomerName] = React.useState("");
  const [searchText, setSearchText] = React.useState("");
  const [partialAmount, setPartialAmount] = React.useState("0");
  const [priceTier, setPriceTier] = React.useState<1 | 2 | 3 | 4>(1);
  const [cartNote, setCartNote] = React.useState("");
  const [saleTabs, setSaleTabs] = React.useState<SaleTabSnapshot[]>([
    { id: "tab-1", label: "Satış 1", cartLines: [], cartNote: "", customerCode: "", customerName: "", partialAmount: "0" },
    { id: "tab-2", label: "Satış 2", cartLines: [], cartNote: "", customerCode: "", customerName: "", partialAmount: "0" },
    { id: "tab-3", label: "Satış 3", cartLines: [], cartNote: "", customerCode: "", customerName: "", partialAmount: "0" },
  ]);
  const [activeSaleTabId, setActiveSaleTabId] = React.useState("tab-1");
  const [priceCheckMode, setPriceCheckMode] = React.useState(false);
  const [missingBarcode, setMissingBarcode] = React.useState("");
  const [showMissingBarcodeActions, setShowMissingBarcodeActions] = React.useState(false);
  const [numpadMode, setNumpadMode] = React.useState<"barcode" | "quantity" | "amount">("barcode");
  const [numpadBuffer, setNumpadBuffer] = React.useState("");
  const [showMixedPaymentModal, setShowMixedPaymentModal] = React.useState(false);
  const [mixedPaymentRows, setMixedPaymentRows] = React.useState<MixedPaymentDraft[]>([
    { id: "pay-1", method: "nakit", amount: "0", reference: "" },
  ]);
  const [showAdvancedPos, setShowAdvancedPos] = React.useState(true);
  const [kioskMode, setKioskMode] = React.useState(false);
  const [showCameraScanner, setShowCameraScanner] = React.useState(false);
  const [cameraBusy, setCameraBusy] = React.useState(false);
  const [torchEnabled, setTorchEnabled] = React.useState(false);

  const [showCustomPanel, setShowCustomPanel] = React.useState(false);
  const [customName, setCustomName] = React.useState("Muhtelif Ürün");
  const [customPrice, setCustomPrice] = React.useState("0");
  const [customVatRate, setCustomVatRate] = React.useState("20");
  const [posParameters, setPosParameters] = React.useState<PosParameters>(defaultPosParameters);
  const [scaleConnectionSettings, setScaleConnectionSettings] = React.useState<ScaleConnectionSettings>(defaultScaleConnectionSettings);
  const [printerSettings, setPrinterSettings] = React.useState<ReceiptPrinterSettings>(defaultReceiptPrinterSettings);

  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [quickCustomers, setQuickCustomers] = React.useState<Array<{ code: string; name: string }>>([]);
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [selectedLineId, setSelectedLineId] = React.useState<string | null>(null);
  const [exchangeTargetId, setExchangeTargetId] = React.useState<string | null>(null);

  const [busy, setBusy] = React.useState(false);
  const [loadingProducts, setLoadingProducts] = React.useState(true);
  const [sessionReady, setSessionReady] = React.useState(false);
  const [sessionSummary, setSessionSummary] = React.useState<PosSessionCurrentResponse>({
    registerId: null,
    openSession: null,
    openingCash: 0,
    closingCash: 0,
    todaysSalesCount: 0,
    todaysSalesTotal: 0,
    lastClosureReport: null,
  });
  const [loadingSessionSummary, setLoadingSessionSummary] = React.useState(false);
  const [openingCashInput, setOpeningCashInput] = React.useState("0");
  const [closingCashInput, setClosingCashInput] = React.useState("0");
  const [sessionCloseNote, setSessionCloseNote] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [readingScale, setReadingScale] = React.useState(false);
  const [autoScaleEnabled, setAutoScaleEnabled] = React.useState(true);
  const [lastScaleWeightKg, setLastScaleWeightKg] = React.useState<number | null>(null);
  const [lastScaleStable, setLastScaleStable] = React.useState<boolean | null>(null);
  const [lastScaleLatencyMs, setLastScaleLatencyMs] = React.useState<number | null>(null);
  const [lastScaleRaw, setLastScaleRaw] = React.useState<string>("");
  const [scaleReadLogs, setScaleReadLogs] = React.useState<string[]>([]);
  const [scaleConnectionState, setScaleConnectionState] = React.useState<"disabled" | "ready" | "connected" | "error">("disabled");
  const [showOperations, setShowOperations] = React.useState(false);
  const [suspendedCarts, setSuspendedCarts] = React.useState<SuspendedCartRow[]>([]);
  const [loadingOperations, setLoadingOperations] = React.useState(false);
  const [saleLookupCode, setSaleLookupCode] = React.useState("");
  const [saleLookupResult, setSaleLookupResult] = React.useState<PosSaleHistoryRow | null>(null);
  const [returnRefundMethod, setReturnRefundMethod] = React.useState<"nakit" | "kart" | "havale_eft" | "cari" | "cek" | "dekont">("nakit");
  const [returnReason, setReturnReason] = React.useState("");
  const [returnLines, setReturnLines] = React.useState<ReturnDraftLine[]>([]);
  const [processingReturn, setProcessingReturn] = React.useState(false);
  const [lastSaleReceipt, setLastSaleReceipt] = React.useState<PosSaleHistoryRow | null>(null);
  const [focusParam, setFocusParam] = React.useState("");
  const [showCariCustomerModal, setShowCariCustomerModal] = React.useState(false);
  const [cariCustomerQuery, setCariCustomerQuery] = React.useState("");
  const [cariCustomers, setCariCustomers] = React.useState<CariCustomerRow[]>([]);
  const [selectedCariCustomerId, setSelectedCariCustomerId] = React.useState("");
  const [loadingCariCustomers, setLoadingCariCustomers] = React.useState(false);
  const [showQuickCariForm, setShowQuickCariForm] = React.useState(false);
  const [creatingQuickCari, setCreatingQuickCari] = React.useState(false);
  const [quickCariCode, setQuickCariCode] = React.useState("");
  const [quickCariName, setQuickCariName] = React.useState("");
  const [quickCariPhone, setQuickCariPhone] = React.useState("");
  const [quickCariRiskLimit, setQuickCariRiskLimit] = React.useState("0");
  const [quickCariMaturityDays, setQuickCariMaturityDays] = React.useState("0");
  const [quickCariAutoCompleteSale, setQuickCariAutoCompleteSale] = React.useState(false);
  const [userPermissionKeys, setUserPermissionKeys] = React.useState<string[]>(["sale:pos"]);
  const [permissionCatalog, setPermissionCatalog] = React.useState<string[]>([]);
  const [confirmDialog, setConfirmDialog] = React.useState<ConfirmDialogState>({
    open: false,
    title: "",
    description: "",
    confirmLabel: "Onayla",
    cancelLabel: "Vazgeç",
    tone: "info",
  });

  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const customerScreenChannelRef = React.useRef<BroadcastChannel | null>(null);
  const customerScreenStateRef = React.useRef<CustomerScreenState | null>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const focusHandledRef = React.useRef<string | null>(null);
  const confirmDialogResolverRef = React.useRef<((accepted: boolean) => void) | null>(null);
  const saleTabsRef = React.useRef<SaleTabSnapshot[]>(saleTabs);
  const activeSaleTabRef = React.useRef<string>(activeSaleTabId);
  const cameraVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = React.useRef<MediaStream | null>(null);
  const cameraScanIntervalRef = React.useRef<number | null>(null);
  const readingScaleRef = React.useRef(false);
  const [clock, setClock] = React.useState(() => new Date());

  React.useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    saleTabsRef.current = saleTabs;
  }, [saleTabs]);

  React.useEffect(() => {
    activeSaleTabRef.current = activeSaleTabId;
  }, [activeSaleTabId]);

  React.useEffect(() => {
    readingScaleRef.current = readingScale;
  }, [readingScale]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const sync = () => setConnectionOnline(window.navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    setFocusParam(params.get("focus") ?? "");
    const kioskParam = params.get("kiosk");
    const storedKiosk = window.localStorage.getItem("pos:kiosk-mode");
    if (kioskParam === "1") {
      setKioskMode(true);
    } else if (kioskParam === "0") {
      setKioskMode(false);
    } else if (storedKiosk === "1") {
      setKioskMode(true);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("pos:kiosk-mode", kioskMode ? "1" : "0");
  }, [kioskMode]);

  React.useEffect(() => {
    if (!kioskMode) {
      return;
    }
    if (showOperations) {
      setShowOperations(false);
    }
    if (showAdvancedPos) {
      setShowAdvancedPos(false);
    }
  }, [kioskMode, showAdvancedPos, showOperations]);

  const openConfirmDialog = React.useCallback(
    (options: Omit<ConfirmDialogState, "open">) =>
      new Promise<boolean>((resolve) => {
        confirmDialogResolverRef.current = resolve;
        setConfirmDialog({
          open: true,
          title: options.title,
          description: options.description,
          confirmLabel: options.confirmLabel,
          cancelLabel: options.cancelLabel,
          tone: options.tone,
        });
      }),
    [],
  );

  const closeConfirmDialog = React.useCallback((accepted: boolean) => {
    const resolver = confirmDialogResolverRef.current;
    confirmDialogResolverRef.current = null;
    if (resolver) {
      resolver(accepted);
    }
    setConfirmDialog((prev) => ({
      ...prev,
      open: false,
    }));
  }, []);

  React.useEffect(() => {
    return () => {
      const resolver = confirmDialogResolverRef.current;
      confirmDialogResolverRef.current = null;
      if (resolver) {
        resolver(false);
      }
    };
  }, []);

  const playTone = React.useCallback(
    (kind: "barcode" | "warning") => {
      const enabled = kind === "barcode" ? posParameters.barcodeSoundsEnabled : posParameters.warningSoundsEnabled;
      if (!enabled || typeof window === "undefined") {
        return;
      }

      try {
        const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) {
          return;
        }
        const context = audioContextRef.current ?? new AudioContextClass();
        audioContextRef.current = context;

        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.connect(gain);
        gain.connect(context.destination);

        const now = context.currentTime;
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(kind === "barcode" ? 1040 : 320, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.09, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "barcode" ? 0.08 : 0.2));

        oscillator.start(now);
        oscillator.stop(now + (kind === "barcode" ? 0.09 : 0.22));
      } catch {
        // Ses üretimi desteklenmeyen tarayıcılar için sessizce devam et.
      }
    },
    [posParameters.barcodeSoundsEnabled, posParameters.warningSoundsEnabled],
  );

  React.useEffect(() => {
    if (error) {
      playTone("warning");
    }
  }, [error, playTone]);

  const selectedLine = React.useMemo(
    () => cart.find((line) => line.productId === selectedLineId) ?? null,
    [cart, selectedLineId],
  );
  const userPermissionKeySet = React.useMemo(() => new Set(userPermissionKeys), [userPermissionKeys]);
  const permissionCatalogSet = React.useMemo(() => new Set(permissionCatalog), [permissionCatalog]);

  const canUsePermission = React.useCallback(
    (permissionKey: string) => {
      if (permissionCatalogSet.has(permissionKey)) {
        return userPermissionKeySet.has(permissionKey);
      }
      return userPermissionKeySet.has("sale:pos");
    },
    [permissionCatalogSet, userPermissionKeySet],
  );

  const canReturnOperations = canUsePermission("sale:return");
  const canDiscountOperations = canUsePermission("sale:discount");

  const getProductPrice = React.useCallback((product: ProductRow, tier: 1 | 2 | 3 | 4) => {
    const idx = tier - 1;
    const base = product.prices[0] > 0 ? product.prices[0] : 0;
    const fromTier = product.prices[idx];
    return fromTier > 0 ? fromTier : base;
  }, []);

  const loadData = React.useCallback(async () => {
    setLoadingProducts(true);
    setError(null);
    try {
      const productRows = await requestApi<ProductApiRow[]>("/api/tenant/products?limit=1200");
      const [stockRows, customerRows, settingsRow, companySettings, printerSettingsRow, scaleSettingsRow] = await Promise.all([
        requestApi<StockBalanceRow[]>("/api/tenant/inventory/stock-balances?limit=3000").catch(() => []),
        requestApi<CustomerApiRow[]>("/api/tenant/customers?limit=3").catch(() => []),
        requestApi<SettingsRow>(`/api/tenant/settings?scope=${encodeURIComponent(POS_PARAMETERS_SCOPE)}`).catch(() => ({ payload: {} })),
        requestApi<SettingsRow>("/api/tenant/settings?scope=firma_ayarlari").catch(() => ({ payload: {} })),
        requestApi<SettingsRow>("/api/tenant/settings?scope=printer_settings").catch(() => ({ payload: {} })),
        requestApi<SettingsRow>("/api/tenant/settings?scope=scale_connection_settings").catch(() => ({ payload: {} })),
      ]);

      const stockMap = new Map<string, number>();
      for (const row of stockRows) {
        const payload = asRecord(row.payload);
        const productId = asText(payload.productId);
        if (!productId) {
          continue;
        }
        const quantity = asNumber(payload.available, asNumber(payload.quantity, 0));
        stockMap.set(productId, (stockMap.get(productId) ?? 0) + quantity);
      }

      const normalizedProducts = productRows
        .map((row) => {
          const payload = asRecord(row.payload);
          const p1 = asNumber(payload.salePrice, 0);
          const p2 = asNumber(payload.salePrice2, p1);
          const p3 = asNumber(payload.salePrice3, p1);
          const p4 = asNumber(payload.salePrice4, p1);

          return {
            id: row.id,
            code: row.code,
            name: row.name,
            unit: asText(payload.defaultUnit, "ADET"),
            barcode: asText(payload.barcode),
            parallelBarcodes: asTextArray(payload.parallelBarcodes),
            imageUrl: asText(payload.imageUrl),
            vatRate: asNumber(payload.vatRate, 20),
            stock: stockMap.get(row.id) ?? 0,
            expiryDate: asText(payload.expiryDate),
            lockedForSale: Boolean(payload.lockedForSale),
            prices: [p1, p2, p3, p4],
            isScaleProduct: asBoolean(payload.isScaleProduct, false),
            scaleProductCode: asText(payload.scaleProductCode),
            scaleBarcodeMode: asText(payload.scaleBarcodeMode, "weight") === "price" ? "price" : "weight",
            scaleTareGrams: asNumber(payload.scaleTareGrams, 0),
          } satisfies ProductRow;
        })
        .sort((a, b) => a.name.localeCompare(b.name, "tr"));

      const quick = customerRows
        .map((row) => ({ code: asText(row.code), name: asText(row.name) }))
        .filter((row) => row.code && row.name)
        .slice(0, 3);

      setProducts(normalizedProducts);
      setQuickCustomers(quick);
      setPosParameters(parsePosParameters(settingsRow.payload));
      const parsedScaleSettings = parseScaleConnectionSettings(scaleSettingsRow.payload);
      setScaleConnectionSettings(parsedScaleSettings);
      setScaleConnectionState(parsedScaleSettings.enabled ? "ready" : "disabled");
      setPrinterSettings(parseReceiptPrinterSettings(printerSettingsRow.payload));
      const companyPayload = asRecord(companySettings.payload);
      setCompanyName(asText(companyPayload.companyName, "Bey360"));
      setBranchName(asText(companyPayload.branchName, "MERKEZ"));
      setCurrencyCode(asText(companyPayload.currencyCode, "TRY"));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Veriler yüklenemedi.");
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const loadSessionSummary = React.useCallback(async () => {
    setLoadingSessionSummary(true);
    try {
      const summary = await requestApi<PosSessionCurrentResponse>(
        `/api/tenant/pos/session/current?registerId=${encodeURIComponent(registerId)}`,
      );
      setSessionSummary(summary);
      const sessionOpen = Boolean(summary.openSession);
      setSessionReady(sessionOpen);
      if (sessionOpen) {
        setOpeningCashInput(String(summary.openingCash.toFixed(2)));
      } else if (summary.lastClosureReport) {
        setClosingCashInput(String(summary.lastClosureReport.countedClosingCash.toFixed(2)));
      }
    } catch {
      // Oturum özeti alınamazsa POS akışını durdurma.
      setSessionSummary({
        registerId: registerId || null,
        openSession: null,
        openingCash: 0,
        closingCash: 0,
        todaysSalesCount: 0,
        todaysSalesTotal: 0,
        lastClosureReport: null,
      });
      setSessionReady(false);
    } finally {
      setLoadingSessionSummary(false);
    }
  }, [registerId]);

  React.useEffect(() => {
    void loadSessionSummary();
  }, [loadSessionSummary]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadSessionPermissions() {
      try {
        const data = await requestApi<SessionData>("/api/auth/session");
        if (cancelled) {
          return;
        }
        const nextPermissionKeys =
          Array.isArray(data.permissionKeys) && data.permissionKeys.length > 0
            ? data.permissionKeys
            : ["sale:pos"];
        const nextCatalog = Array.isArray(data.permissionCatalog) ? data.permissionCatalog : [];
        setUserPermissionKeys(nextPermissionKeys);
        setPermissionCatalog(nextCatalog);
        setCashierName(data.email || "Kasiyer");
      } catch {
        if (cancelled) {
          return;
        }
        // Oturum izinleri yüklenemezse POS temel yetkisiyle devam edilir.
        setUserPermissionKeys(["sale:pos"]);
      }
    }

    void loadSessionPermissions();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadCariCustomers = React.useCallback(async (query: string) => {
    setLoadingCariCustomers(true);
    try {
      const search = query.trim();
      const rows = await requestApi<CustomerApiRow[]>(
        `/api/tenant/customers?includeFinancial=1&limit=120${search ? `&q=${encodeURIComponent(search)}` : ""}`,
      );

      const mapped = rows
        .map((row, index) => {
          const payload = asRecord(row.payload);
          const riskLimit = asNumber(row.riskLimit, 0);
          const maturityDays = Math.max(0, Math.floor(asNumber(row.maturityDays, 0)));
          const currentBalance = asNumber(row.currentBalance, 0);
          const availableRisk = asNumber(row.availableRisk, Math.max(0, riskLimit - currentBalance));
          const riskUsageRate = riskLimit > 0 ? currentBalance / riskLimit : 0;
          const riskStatusRaw = asText(row.riskStatus);
          const riskStatus =
            riskStatusRaw === "over_limit" || riskStatusRaw === "warning" || riskStatusRaw === "ok" || riskStatusRaw === "no_limit"
              ? riskStatusRaw
              : riskLimit <= 0
                ? "no_limit"
                : currentBalance > riskLimit
                  ? "over_limit"
                  : riskUsageRate >= 0.8
                    ? "warning"
                    : "ok";

          return {
            id: row.id || `${asText(row.code)}-${index}`,
            code: asText(row.code),
            name: asText(row.name),
            phone: asText(payload.phone),
            email: asText(payload.email),
            riskLimit,
            maturityDays,
            currentBalance,
            availableRisk,
            riskUsageRate,
            riskStatus,
          } satisfies CariCustomerRow;
        })
        .filter((row) => row.code && row.name)
        .sort((a, b) => a.name.localeCompare(b.name, "tr"));

      setCariCustomers(mapped);
      const preferred = mapped.find((row) => row.code === customerCode) ?? mapped[0];
      setSelectedCariCustomerId(preferred?.id ?? "");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Cari müşteri listesi yüklenemedi.");
    } finally {
      setLoadingCariCustomers(false);
    }
  }, [customerCode]);

  React.useEffect(() => {
    if (!showCariCustomerModal) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadCariCustomers(cariCustomerQuery);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [showCariCustomerModal, cariCustomerQuery, loadCariCustomers]);

  React.useEffect(() => {
    if (!showCariCustomerModal && !confirmDialog.open) {
      return;
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      if (confirmDialog.open) {
        closeConfirmDialog(false);
        return;
      }
      if (showCariCustomerModal) {
        setShowCariCustomerModal(false);
      }
    }

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [showCariCustomerModal, confirmDialog.open, closeConfirmDialog]);

  const persistCurrentTabSnapshot = React.useCallback(() => {
    const activeId = activeSaleTabRef.current;
    setSaleTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeId
          ? {
              ...tab,
              cartLines: cart,
              customerCode,
              customerName,
              partialAmount,
              cartNote,
            }
          : tab,
      ),
    );
  }, [cart, cartNote, customerCode, customerName, partialAmount]);

  React.useEffect(() => {
    persistCurrentTabSnapshot();
  }, [persistCurrentTabSnapshot, cart, selectedLineId]);

  function switchSaleTab(tabId: string) {
    const currentId = activeSaleTabRef.current;
    if (tabId === currentId) {
      return;
    }

    const currentTab = saleTabsRef.current.find((tab) => tab.id === currentId);
    if (currentTab) {
      currentTab.cartLines = cart;
      currentTab.customerCode = customerCode;
      currentTab.customerName = customerName;
      currentTab.partialAmount = partialAmount;
      currentTab.cartNote = cartNote;
    }

    const target = saleTabsRef.current.find((tab) => tab.id === tabId);
    if (!target) {
      return;
    }

    setActiveSaleTabId(tabId);
    setCustomerCode(target.customerCode || "");
    setCustomerName(target.customerName || "");
    setPartialAmount(target.partialAmount || "0");
    setCartNote(target.cartNote || "");
    setCart(target.cartLines ?? []);
    setSelectedLineId(null);
    setExchangeTargetId(null);
    setMessage(`${target.label} açıldı.`);
    setError(null);
  }

  function createSaleTab() {
    if (saleTabs.length >= 8) {
      setError("En fazla 8 aktif satış sekmesi açabilirsiniz.");
      return;
    }
    const nextIndex = saleTabs.length + 1;
    const next: SaleTabSnapshot = {
      id: `tab-${Date.now()}`,
      label: `Satış ${nextIndex}`,
      cartLines: [],
      customerCode: "",
      customerName: "",
      partialAmount: "0",
      cartNote: "",
    };
    setSaleTabs((prev) => {
      const updated = [...prev, next];
      saleTabsRef.current = updated;
      return updated;
    });
    setActiveSaleTabId(next.id);
    setCart([]);
    setCustomerCode("");
    setCustomerName("");
    setPartialAmount("0");
    setCartNote("");
    setSelectedLineId(null);
    setExchangeTargetId(null);
    setMessage(`${next.label} oluşturuldu.`);
    setError(null);
  }

  function renameSaleTab(tabId: string) {
    const target = saleTabsRef.current.find((tab) => tab.id === tabId);
    if (!target || typeof window === "undefined") {
      return;
    }

    const nextLabel = window.prompt("Sekme adını girin", target.label)?.trim();
    if (!nextLabel) {
      return;
    }

    setSaleTabs((prev) => {
      const updated = prev.map((tab) => (tab.id === tabId ? { ...tab, label: nextLabel } : tab));
      saleTabsRef.current = updated;
      return updated;
    });
    setMessage(`Sekme adı güncellendi: ${nextLabel}`);
    setError(null);
  }

  async function closeSaleTab(tabId: string) {
    const tabs = saleTabsRef.current;
    if (tabs.length <= 1) {
      setError("En az bir satış sekmesi açık kalmalıdır.");
      return;
    }

    const target = tabs.find((tab) => tab.id === tabId);
    if (!target) {
      return;
    }

    const hasPendingData =
      target.cartLines.length > 0 || Boolean(target.customerCode.trim()) || Boolean(target.cartNote.trim());

    if (hasPendingData) {
      const accepted = await openConfirmDialog({
        title: `${target.label} Kapatılsın mı?`,
        description: "Bu sekmedeki sepet ve müşteri bilgileri silinecek.",
        confirmLabel: "Sekmeyi Kapat",
        cancelLabel: "Vazgeç",
        tone: "danger",
      });
      if (!accepted) {
        return;
      }
    }

    const updatedTabs = tabs.filter((tab) => tab.id !== tabId);
    saleTabsRef.current = updatedTabs;
    setSaleTabs(updatedTabs);

    if (activeSaleTabRef.current === tabId) {
      const fallback = updatedTabs[0];
      setActiveSaleTabId(fallback.id);
      setCustomerCode(fallback.customerCode || "");
      setCustomerName(fallback.customerName || "");
      setPartialAmount(fallback.partialAmount || "0");
      setCartNote(fallback.cartNote || "");
      setCart(fallback.cartLines ?? []);
      setSelectedLineId(null);
      setExchangeTargetId(null);
    }

    setMessage(`${target.label} kapatıldı.`);
    setError(null);
  }

  function openCariCustomerModal() {
    if (cart.length === 0) {
      setError("Cari satış için sepete ürün ekleyin.");
      return;
    }
    setError(null);
    setMessage(null);
    setCariCustomerQuery("");
    setShowQuickCariForm(false);
    setQuickCariCode("");
    setQuickCariName("");
    setQuickCariPhone("");
    setQuickCariRiskLimit("0");
    setQuickCariMaturityDays("0");
    setQuickCariAutoCompleteSale(false);
    setShowCariCustomerModal(true);
  }

  const stopCameraScanner = React.useCallback(() => {
    if (cameraScanIntervalRef.current !== null) {
      window.clearInterval(cameraScanIntervalRef.current);
      cameraScanIntervalRef.current = null;
    }
    const stream = cameraStreamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }
    cameraStreamRef.current = null;
    setTorchEnabled(false);
  }, []);

  const openCameraScanner = React.useCallback(() => {
    setShowCameraScanner(true);
    setCameraBusy(true);
    setError(null);
  }, []);

  const toggleCameraTorch = React.useCallback(async () => {
    const stream = cameraStreamRef.current;
    const track = stream?.getVideoTracks()[0];
    if (!track) {
      return;
    }
    try {
      const advanced = [{ torch: !torchEnabled }] as unknown as MediaTrackConstraintSet[];
      await track.applyConstraints({ advanced });
      setTorchEnabled((prev) => !prev);
    } catch {
      setError("Fener desteği bu cihazda kullanılamıyor.");
    }
  }, [torchEnabled]);

  React.useEffect(() => {
    if (!showCameraScanner) {
      return;
    }

    let cancelled = false;
    const BarcodeDetectorClass = (window as Window & { BarcodeDetector?: BarcodeDetectorClassLike }).BarcodeDetector;

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Kamera erişimi desteklenmiyor.");
        }
        if (!BarcodeDetectorClass) {
          throw new Error("Tarayıcı barkod algılama desteği sunmuyor.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          for (const track of stream.getTracks()) {
            track.stop();
          }
          return;
        }
        cameraStreamRef.current = stream;

        const video = cameraVideoRef.current;
        if (!video) {
          throw new Error("Kamera görüntüsü başlatılamadı.");
        }

        video.srcObject = stream;
        await video.play();

        const detector = new BarcodeDetectorClass({
          formats: ["ean_13", "ean_8", "code_128", "upc_a", "upc_e", "qr_code"],
        });

        cameraScanIntervalRef.current = window.setInterval(async () => {
          if (!cameraVideoRef.current) {
            return;
          }
          try {
            const results = await detector.detect(cameraVideoRef.current);
            const value = results[0]?.rawValue?.trim();
            if (!value) {
              return;
            }
            const scanned = tryScanAdd(value);
            if (scanned) {
              setSearchText("");
              setNumpadBuffer("");
              setShowCameraScanner(false);
              stopCameraScanner();
              setMessage(`Barkod okundu: ${value}`);
            }
          } catch {
            // Tarama hataları geçici olabilir, döngüyü kesmeden devam edilir.
          }
        }, 180);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Kamera açılamadı.");
        setShowCameraScanner(false);
        stopCameraScanner();
      } finally {
        setCameraBusy(false);
      }
    }

    void start();

    return () => {
      cancelled = true;
      stopCameraScanner();
    };
  }, [showCameraScanner, stopCameraScanner]);

  function ensureOperationPermission(permissionKey: "sale:return" | "sale:discount", operationLabel: string): boolean {
    if (canUsePermission(permissionKey)) {
      return true;
    }
    setError(`${operationLabel} için yetkiniz yok.`);
    setMessage(null);
    return false;
  }

  const filteredProducts = React.useMemo(() => {
    const q = searchText.trim().toLocaleLowerCase("tr");
    if (!q) {
      return products;
    }

    return products.filter((product) => {
      const inName = product.name.toLocaleLowerCase("tr").includes(q);
      const inCode = product.code.toLocaleLowerCase("tr").includes(q);
      const inBarcode = product.barcode?.toLocaleLowerCase("tr").includes(q) ?? false;
      const inParallelBarcode = product.parallelBarcodes.some((barcode) => barcode.toLocaleLowerCase("tr").includes(q));
      return inName || inCode || inBarcode || inParallelBarcode;
    });
  }, [products, searchText]);

  const exactProductLookup = React.useMemo(() => {
    const map = new Map<string, ProductRow>();
    const register = (value: string | undefined, product: ProductRow) => {
      const key = (value ?? "").trim().toLocaleLowerCase("tr");
      if (!key || map.has(key)) {
        return;
      }
      map.set(key, product);
    };

    for (const product of products) {
      register(product.code, product);
      register(product.barcode, product);
      for (const barcode of product.parallelBarcodes) {
        register(barcode, product);
      }
    }

    return map;
  }, [products]);

  const scaleCandidateProducts = React.useMemo(() => {
    return filteredProducts.filter((product) => product.isScaleProduct);
  }, [filteredProducts]);

  const selectedScaleProduct = React.useMemo(() => {
    if (!selectedLineId) {
      return null;
    }
    return products.find((product) => product.id === selectedLineId && product.isScaleProduct) ?? null;
  }, [products, selectedLineId]);

  const autoScaleTargetProduct = React.useMemo(() => {
    if (selectedScaleProduct) {
      return selectedScaleProduct;
    }

    const exact = exactProductLookup.get(searchText.trim().toLocaleLowerCase("tr"));
    if (exact?.isScaleProduct) {
      return exact;
    }

    if (scaleCandidateProducts.length === 1) {
      return scaleCandidateProducts[0];
    }

    return null;
  }, [exactProductLookup, scaleCandidateProducts, searchText, selectedScaleProduct]);

  const totals = React.useMemo(() => {
    const subTotal = cart.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    const taxTotal = cart.reduce((sum, line) => sum + (line.quantity * line.unitPrice * line.taxRate) / 100, 0);
    const grandTotal = subTotal + taxTotal;
    const totalQuantity = cart.reduce((sum, line) => sum + line.quantity, 0);

    return {
      subTotal,
      taxTotal,
      grandTotal: Math.round(grandTotal * 100) / 100,
      totalQuantity,
    };
  }, [cart]);

  React.useEffect(() => {
    setPartialAmount(totals.grandTotal.toFixed(2));
  }, [totals.grandTotal]);

  const paymentPreview = React.useMemo(() => {
    const collected = Math.max(0, asNumber(partialAmount, totals.grandTotal));
    const remaining = Math.max(0, roundCurrency(totals.grandTotal - collected));
    const change = Math.max(0, roundCurrency(collected - totals.grandTotal));
    return { collected, remaining, change };
  }, [partialAmount, totals.grandTotal]);

  const paymentShortcutValues = React.useMemo(() => {
    const presets = [5, 10, 20, 50, 100, 200, 500];
    const unique = new Set<number>();
    for (const value of presets) {
      if (value <= Math.max(500, totals.grandTotal * 2)) {
        unique.add(value);
      }
    }
    unique.add(roundCurrency(totals.grandTotal));
    return Array.from(unique.values()).sort((a, b) => a - b);
  }, [totals.grandTotal]);

  const scaleStatusMeta = React.useMemo(() => {
    switch (scaleConnectionState) {
      case "connected":
        return {
          label: "Terazi Bagli",
          className: "bg-emerald-900 text-emerald-100 border border-emerald-700",
          dotClassName: "bg-emerald-400",
        };
      case "error":
        return {
          label: "Terazi Hatasi",
          className: "bg-rose-900 text-rose-100 border border-rose-700",
          dotClassName: "bg-rose-400",
        };
      case "ready":
        return {
          label: "Terazi Hazir",
          className: "bg-amber-900 text-amber-100 border border-amber-700",
          dotClassName: "bg-amber-300",
        };
      default:
        return {
          label: "Terazi Pasif",
          className: "bg-slate-800 text-slate-100 border border-slate-600",
          dotClassName: "bg-slate-400",
        };
    }
  }, [scaleConnectionState]);

  const buildCustomerScreenState = React.useCallback((): CustomerScreenState => {
    return {
      registerName,
      customerName: customerName || "Perakende",
      total: totals.grandTotal,
      totalQuantity: totals.totalQuantity,
      lines: cart.map((line) => ({
        id: line.productId,
        name: line.productName,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        total: line.quantity * line.unitPrice * (1 + line.taxRate / 100),
      })),
      updatedAt: new Date().toISOString(),
    };
  }, [cart, customerName, registerName, totals.grandTotal, totals.totalQuantity]);

  const publishCustomerScreen = React.useCallback(
    (payload?: CustomerScreenState) => {
      const data = payload ?? buildCustomerScreenState();
      customerScreenStateRef.current = data;

      if (typeof window !== "undefined") {
        window.localStorage.setItem("pos:customer-screen", JSON.stringify(data));
      }

      customerScreenChannelRef.current?.postMessage({
        type: "state",
        payload: data,
      });
    },
    [buildCustomerScreenState],
  );

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
      return;
    }

    const channel = new BroadcastChannel("pos-customer-screen");
    customerScreenChannelRef.current = channel;

    const onMessage = (event: MessageEvent) => {
      const packet = asRecord(event.data);
      const packetType = asText(packet.type);
      if (packetType === "request-state") {
        const fallback = customerScreenStateRef.current ?? buildCustomerScreenState();
        publishCustomerScreen(fallback);
      }
    };

    channel.addEventListener("message", onMessage);
    return () => {
      channel.removeEventListener("message", onMessage);
      channel.close();
      customerScreenChannelRef.current = null;
    };
  }, [buildCustomerScreenState, publishCustomerScreen]);

  React.useEffect(() => {
    publishCustomerScreen();
  }, [publishCustomerScreen]);

  function openCustomerScreen() {
    const popup = window.open("/pos/musteri-ekrani", "_blank", "noopener,noreferrer,width=1280,height=720");
    if (!popup) {
      setError("Müşteri ekranı açılamadı. Tarayıcı popup engeli olabilir.");
      return;
    }
    publishCustomerScreen();
    setMessage("Müşteri ekranı açıldı ve canlı veri aktarımı başlatıldı.");
  }

  function calcLineTotal(line: PosSaleItem): number {
    return line.quantity * line.unitPrice * (1 + line.taxRate / 100);
  }

  function roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }

  function escapeHtml(input: string): string {
    return input
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function printSaleReceipt(sale: PosSaleHistoryRow, options?: { previewOnly?: boolean }) {
    if (typeof window === "undefined") {
      return;
    }

    const popup = window.open("about:blank", "_blank", "width=420,height=760");
    if (!popup) {
      setError("Yazdırma penceresi açılamadı. Popup engelini kontrol edin.");
      return;
    }

    const saleItems = Array.isArray(sale.items) ? sale.items : [];
    const salePayments = Array.isArray(sale.payments) ? sale.payments : [];

    const rowsHtml = saleItems
      .map(
        (line) => `
          <tr>
            <td>${escapeHtml(line.productName)}</td>
            <td style="text-align:right">${line.quantity.toFixed(2)}</td>
            <td style="text-align:right">${formatTry(line.unitPrice)}</td>
            <td style="text-align:right">${formatTry(calcLineTotal(line))}</td>
          </tr>
        `,
      )
      .join("");

    const paymentsHtml = salePayments
      .map(
        (payment) => `<li>${escapeHtml(payment.method.toUpperCase())}: <strong>${formatTry(payment.amount)}</strong></li>`,
      )
      .join("");

    const printRegisterName = sale.registerName || registerName;
    const paperWidthMm = (printerSettings.receiptPaperMm || posParameters.infoReceiptSize) === "80" ? 80 : 58;
    const receiptCopies = Math.max(1, printerSettings.receiptCopies);
    const printerName = printerSettings.receiptPrinterName.trim() || "Varsayılan Yazıcı";
    const copySections = Array.from({ length: receiptCopies }, (_, index) => {
      const copyTitle = receiptCopies > 1 ? `Kopya ${index + 1}/${receiptCopies}` : "Fiş";
      return `
        <section class="receipt-copy">
          <h1>${escapeHtml(printRegisterName)}</h1>
          <p class="muted">Yazıcı: ${escapeHtml(printerName)}</p>
          <p class="muted">${copyTitle}</p>
          <p class="muted">Fiş No: ${escapeHtml(sale.saleCode)}</p>
          <p class="muted">Tarih: ${new Date(sale.occurredAt).toLocaleString("tr-TR")}</p>
          <p class="muted">Müşteri: ${escapeHtml(sale.customerName || "Perakende")}</p>
          <table>
            <thead>
              <tr>
                <th>Ürün</th>
                <th>Miktar</th>
                <th>Birim</th>
                <th>Tutar</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="total">Toplam: ${formatTry(sale.total)}</div>
          <ul>${paymentsHtml}</ul>
        </section>
      `;
    }).join('<div class="page-break"></div>');

    const receiptHtml = `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <title>Fiş - ${escapeHtml(sale.saleCode)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 8px auto; color: #111; width: ${paperWidthMm}mm; }
      h1 { font-size: 18px; margin: 0 0 4px; }
      p { margin: 2px 0; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
      th, td { border-bottom: 1px dashed #aaa; padding: 6px 2px; }
      th { text-align: left; }
      .total { margin-top: 10px; font-size: 16px; font-weight: 700; text-align: right; }
      .muted { color: #444; }
      .page-break { page-break-before: always; height: 12px; }
      @media print { body { margin: 0; } }
    </style>
  </head>
  <body>${copySections}</body>
</html>`;

    try {
      const blob = new Blob([receiptHtml], { type: "text/html;charset=utf-8" });
      const blobUrl = URL.createObjectURL(blob);
      popup.location.replace(blobUrl);
      popup.focus();

      const finalizePrint = () => {
        if (options?.previewOnly) {
          return;
        }
        popup.print();
        if (!printerSettings.printPreviewEnabled) {
          setTimeout(() => {
            popup.close();
          }, 500);
        }
      };

      popup.onload = () => {
        finalizePrint();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      };
      return;
    } catch {
      // Blob açma başarısız olursa document.write ile devam et.
    }

    popup.document.open();
    popup.document.write(receiptHtml);
    popup.document.close();
    popup.focus();

    if (options?.previewOnly) {
      return;
    }

    popup.print();

    if (!printerSettings.printPreviewEnabled) {
      setTimeout(() => {
        popup.close();
      }, 500);
    }
  }

  function previewSaleReceipt(sale: PosSaleHistoryRow) {
    printSaleReceipt(sale, { previewOnly: true });
  }

  async function handlePostSaleReceiptFlow(sale: PosSaleHistoryRow) {
    if (posParameters.infoReceiptPrintMode === "never") {
      return;
    }

    if (posParameters.infoReceiptPrintMode === "ask" && printerSettings.autoPrintReceipt) {
      printSaleReceipt(sale);
      return;
    }

    if (posParameters.infoReceiptPrintMode === "always") {
      printSaleReceipt(sale);
      return;
    }
    const wantsPrint = await openConfirmDialog({
      title: "Bilgi Fişi",
      description: "Bilgi fişi yazdırmak istiyor musunuz?",
      confirmLabel: "Yazdır",
      cancelLabel: "Yazdırma",
      tone: "info",
    });
    if (wantsPrint) {
      printSaleReceipt(sale);
    } else if (printerSettings.printPreviewEnabled) {
      const wantsPreview = await openConfirmDialog({
        title: "Fiş Önizleme",
        description: "Yazdırma iptal edildi. Fiş önizlemesi açılsın mı?",
        confirmLabel: "Önizlemeyi Aç",
        cancelLabel: "Kapat",
        tone: "info",
      });
      if (wantsPreview) {
        previewSaleReceipt(sale);
      }
    }
  }

  async function loadSuspendedCarts() {
    setLoadingOperations(true);
    try {
      const rows = await requestApi<SuspendedCartRow[]>(
        `/api/tenant/pos/suspended?registerId=${encodeURIComponent(registerId)}&limit=80`,
      );
      setSuspendedCarts(rows);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Askı sepetler yüklenemedi.");
    } finally {
      setLoadingOperations(false);
    }
  }

  React.useEffect(() => {
    const focus = focusParam;
    if (!focus || focusHandledRef.current === focus) {
      return;
    }

    if (focus === "askidaki-sepetler" || focus === "iade-islemleri" || focus === "oturum-ve-kasa" || focus === "odeme-akislari") {
      focusHandledRef.current = focus;
      setShowOperations(true);
      void loadSuspendedCarts();

      if (focus === "askidaki-sepetler") {
        setMessage("Askı sepet operasyon ekranı açıldı.");
      } else if (focus === "iade-islemleri") {
        setMessage("Fiş bazlı iade operasyon ekranı açıldı.");
      } else if (focus === "oturum-ve-kasa") {
        setMessage("Oturum ve kasa operasyon ekranı açıldı.");
      } else if (focus === "odeme-akislari") {
        setMessage("Ödeme ve fiş operasyon ekranı açıldı.");
      }
    }
  }, [focusParam, loadSuspendedCarts]);

  async function toggleOperationsPanel() {
    const next = !showOperations;
    setShowOperations(next);
    if (next) {
      await loadSuspendedCarts();
    }
  }

  async function recallSuspendedCart(suspendedSaleId: string) {
    if (cart.length > 0) {
      const accepted = await openConfirmDialog({
        title: "Askı Sepet Geri Çağırma",
        description: "Mevcut sepet temizlenip askı sepet geri çağrılsın mı?",
        confirmLabel: "Evet, Geri Çağır",
        cancelLabel: "Vazgeç",
        tone: "danger",
      });
      if (!accepted) {
        return;
      }
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await requestApi<SuspendedRestoreResult>("/api/tenant/pos/suspended/restore", {
        method: "POST",
        body: JSON.stringify({ suspendedSaleId }),
      });

      setCart(
        result.items.map((line) => ({
          productId: line.productId,
          productCode: line.productCode ?? "",
          productName: line.productName,
          quantity: line.quantity,
          unit: "ADET",
          unitPrice: line.unitPrice,
          taxRate: line.taxRate,
        })),
      );
      setCustomerCode(result.customerCode ?? "");
      setCustomerName(result.customerName ?? "");
      setSelectedLineId(result.items[0]?.productId ?? null);
      setExchangeTargetId(null);
      setShowOperations(false);
      setMessage("Askı sepet geri çağrıldı.");
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Askı sepet geri çağrılamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function findSaleByCode() {
    const code = saleLookupCode.trim();
    if (!code) {
      setError("Fiş araması için satış kodu girin.");
      return;
    }

    setLoadingOperations(true);
    setError(null);
    setMessage(null);
    try {
      const rows = await requestApi<PosSaleHistoryRow[]>(
        `/api/tenant/pos/sales?saleCode=${encodeURIComponent(code)}&limit=20`,
      );
      const found = rows.find((item) => item.saleCode === code) ?? rows[0] ?? null;
      if (!found) {
        setSaleLookupResult(null);
        setError("Satış fişi bulunamadı.");
        return;
      }
      setSaleLookupResult(found);
      const returnable = found.items.reduce((sum, item) => sum + Math.max(0, item.remainingQuantity ?? item.quantity), 0);
      if (returnable <= 0) {
        setMessage(`Fiş bulundu: ${found.saleCode} (Bu fişte iade edilebilir miktar kalmadı)`);
      } else {
        setMessage(`Fiş bulundu: ${found.saleCode}`);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Fiş bilgisi alınamadı.");
    } finally {
      setLoadingOperations(false);
    }
  }

  React.useEffect(() => {
    if (!saleLookupResult) {
      setReturnLines([]);
      return;
    }

    setReturnLines(
      saleLookupResult.items.map((item, index) => ({
        key: `${saleLookupResult.id}-${item.productId}-${index}`,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        soldQuantity: item.quantity,
        maxReturnQuantity: Math.max(0, item.remainingQuantity ?? item.quantity),
        returnQuantity: Math.max(0, item.remainingQuantity ?? item.quantity),
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        warehouseId: item.warehouseId,
        selected: Math.max(0, item.remainingQuantity ?? item.quantity) > 0,
      })),
    );
  }, [saleLookupResult]);

  function updateReturnLineSelection(key: string, selected: boolean) {
    setReturnLines((prev) => prev.map((line) => (line.key === key ? { ...line, selected } : line)));
  }

  function updateReturnLineQuantity(key: string, rawValue: string) {
    const parsed = asNumber(rawValue, 0);
    setReturnLines((prev) =>
      prev.map((line) =>
        line.key === key
          ? { ...line, returnQuantity: Math.max(0, Math.min(line.maxReturnQuantity, parsed)) }
          : line,
      ),
    );
  }

  function selectAllReturnLines(selected: boolean) {
    setReturnLines((prev) => prev.map((line) => ({ ...line, selected: selected && line.maxReturnQuantity > 0 })));
  }

  const selectedReturnLines = React.useMemo(
    () => returnLines.filter((line) => line.selected && line.returnQuantity > 0 && line.maxReturnQuantity > 0),
    [returnLines],
  );
  const selectedReturnTotal = React.useMemo(
    () =>
      roundCurrency(
        selectedReturnLines.reduce(
          (sum, line) => sum + line.returnQuantity * line.unitPrice * (1 + line.taxRate / 100),
          0,
        ),
      ),
    [selectedReturnLines],
  );
  const selectedCariCustomer = React.useMemo(
    () => cariCustomers.find((row) => row.id === selectedCariCustomerId) ?? null,
    [cariCustomers, selectedCariCustomerId],
  );
  const selectedCariRisk = React.useMemo(() => {
    if (!selectedCariCustomer) {
      return null;
    }

    const projectedBalance = roundCurrency(selectedCariCustomer.currentBalance + totals.grandTotal);
    const riskLimit = selectedCariCustomer.riskLimit;
    const projectedUsageRate = riskLimit > 0 ? projectedBalance / riskLimit : 0;
    const willExceedLimit = riskLimit > 0 && projectedBalance > riskLimit + 0.000001;
    const willReachWarning = riskLimit > 0 && !willExceedLimit && projectedUsageRate >= 0.8;

    return {
      projectedBalance,
      projectedUsageRate,
      willExceedLimit,
      willReachWarning,
    };
  }, [selectedCariCustomer, totals.grandTotal]);
  const selectedCariBlockedByRisk = selectedCariRisk?.willExceedLimit ?? false;
  const activeSaleTabLabel = React.useMemo(
    () => saleTabs.find((tab) => tab.id === activeSaleTabId)?.label ?? "Satış",
    [saleTabs, activeSaleTabId],
  );

  async function createReturnFromLookup() {
    if (!ensureOperationPermission("sale:return", "Fiş iade")) {
      return;
    }

    if (!saleLookupResult) {
      setError("Önce fiş arayıp satış seçin.");
      return;
    }
    if (selectedReturnLines.length === 0) {
      setError("Fişte iade edilecek ürün bulunamadı.");
      return;
    }
    if (selectedReturnTotal <= 0) {
      setError("İade toplamı 0'dan büyük olmalıdır.");
      return;
    }
    const confirmed = await openConfirmDialog({
      title: "Fiş İade Onayı",
      description: `${saleLookupResult.saleCode} için seçili satırlar iade edilsin mi?`,
      confirmLabel: "İadeyi Onayla",
      cancelLabel: "Vazgeç",
      tone: "danger",
    });
    if (!confirmed) {
      return;
    }

    setProcessingReturn(true);
    setError(null);
    setMessage(null);
    try {
      const result = await requestApi<{ returnCode: string; refundTotal: number }>("/api/tenant/pos/returns", {
        method: "POST",
        body: JSON.stringify({
          registerId,
          registerName,
          originalSaleId: saleLookupResult.id,
          customerCode: saleLookupResult.customerCode || undefined,
          customerName: saleLookupResult.customerName || undefined,
          reason: returnReason || undefined,
          items: selectedReturnLines.map((item) => ({
            productId: item.productId,
            productCode: item.productCode,
            productName: item.productName,
            quantity: item.returnQuantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            warehouseId: item.warehouseId || undefined,
          })),
          refundPayments: [{ method: returnRefundMethod, amount: selectedReturnTotal }],
        }),
      });

      setMessage(`Fiş iadesi tamamlandı. Belge: ${result.returnCode} | Tutar: ${formatTry(result.refundTotal)}`);
      setReturnReason("");
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Fiş iadesi oluşturulamadı.");
    } finally {
      setProcessingReturn(false);
    }
  }

  function addProductToCart(product: ProductRow, quantity = 1): boolean {
    if (priceCheckMode) {
      const activePrice = getProductPrice(product, priceTier);
      setMessage(`Fiyat Gör | ${product.name} | ${formatTry(activePrice)} | Stok: ${product.stock.toFixed(0)} | KDV: %${product.vatRate}`);
      setError(null);
      return true;
    }

    if (product.lockedForSale) {
      setError(`${product.name} satışa kapalı.`);
      return false;
    }

    if (posParameters.preventExpiredProductSale && isExpired(product.expiryDate)) {
      setError(`${product.name} için son kullanım tarihi geçmiş.`);
      return false;
    }

    const sourceQty = normalizeQuantity(quantity, getQuantityStep(product.unit));
    if (posParameters.preventOutOfStockSale && !exchangeTargetId) {
      const currentQty = cart.find((line) => line.productId === product.id)?.quantity ?? 0;
      if (currentQty + sourceQty > Math.max(0, product.stock) + 0.000001) {
        setError(`${product.name} için stok yetersiz. Mevcut: ${formatQuantity(Math.max(0, product.stock))}`);
        return false;
      }
    }

    const unitPrice = getProductPrice(product, priceTier);
    setShowMissingBarcodeActions(false);
    setMissingBarcode("");

    setCart((prev) => {
      if (exchangeTargetId) {
        const exchangeLine = prev.find((line) => line.productId === exchangeTargetId);
        const targetQty = exchangeLine?.quantity ?? sourceQty;
        const cleaned = prev.filter((line) => line.productId !== exchangeTargetId);

        const existingInCleaned = cleaned.find((line) => line.productId === product.id);
        if (existingInCleaned) {
          return cleaned.map((line) =>
            line.productId === product.id
              ? { ...line, quantity: roundQuantity(line.quantity + targetQty), unitPrice, taxRate: product.vatRate }
              : line,
          );
        }

        return [
          ...cleaned,
          {
            productId: product.id,
            productCode: product.code,
            productName: product.name,
            quantity: targetQty,
            unit: product.unit,
            unitPrice,
            taxRate: product.vatRate,
          },
        ];
      }

      const existing = prev.find((line) => line.productId === product.id);
      if (existing) {
        return prev.map((line) =>
          line.productId === product.id
            ? { ...line, quantity: roundQuantity(line.quantity + sourceQty), unitPrice, taxRate: product.vatRate }
            : line,
        );
      }

      return [
        ...prev,
        {
          productId: product.id,
          productCode: product.code,
          productName: product.name,
          quantity: sourceQty,
          unit: product.unit,
          unitPrice,
          taxRate: product.vatRate,
        },
      ];
    });

    playTone("barcode");

    if (exchangeTargetId) {
      setMessage("Ürün değişimi tamamlandı.");
      setExchangeTargetId(null);
    }

    return true;
  }

  const applyScaleWeightToProduct = React.useCallback((product: ProductRow, weightKg: number): boolean => {
    const normalizedWeight = normalizeQuantity(weightKg, getQuantityStep(product.unit));
    const existingLine = cart.find((line) => line.productId === product.id);

    setSelectedLineId(product.id);
    setError(null);

    if (existingLine) {
      updateQuantity(product.id, normalizedWeight);
      setMessage(`Terazi okundu: ${product.name} miktari ${formatQuantity(normalizedWeight)} olarak guncellendi.`);
      return true;
    }

    const added = addProductToCart(product, normalizedWeight);
    if (added) {
      setMessage(`Terazi okundu: ${product.name} sepete ${formatQuantity(normalizedWeight)} olarak eklendi.`);
    }
    return added;
  }, [cart]);

  function resolveScaleTargetProduct(): ProductRow | null {
    return autoScaleTargetProduct;
  }

  const readWeightFromScaleAndApply = React.useCallback(async () => {
    if (!scaleConnectionSettings.enabled) {
      setError("Terazi entegrasyonu kapali. Ayarlar > Terazi Ayarlari ekranindan aktif edin.");
      setMessage(null);
      return;
    }

    if (scaleConnectionSettings.transport === "serial" && !isSerialScaleSupportedInClient()) {
      setScaleConnectionState("error");
      setError("Seri port teraziler bulut sunucuda okunamaz. Bey360 masaustu uygulamasinda veya local kurulumda deneyin ya da TCP/Ethernet terazi kullanin.");
      setMessage(null);
      return;
    }

    const targetProduct = resolveScaleTargetProduct();
    if (!targetProduct) {
      setError("Terazili bir urun secin veya arama alaninda tek bir terazili urun filtreleyin.");
      setMessage(null);
      return;
    }

    setReadingScale(true);
    setError(null);
    setMessage(null);
    setScaleConnectionState("ready");

    try {
      const result = await requestApi<{
        stable?: boolean | null;
        weightKg?: number | null;
        raw?: string;
        latencyMs?: number;
      }>("/api/tenant/scale/read", {
        method: "POST",
        body: JSON.stringify({
          settings: scaleConnectionSettings,
        }),
      });

      setLastScaleWeightKg(typeof result.weightKg === "number" ? result.weightKg : null);
      setLastScaleStable(typeof result.stable === "boolean" ? result.stable : null);
      setLastScaleLatencyMs(typeof result.latencyMs === "number" ? result.latencyMs : null);
      setLastScaleRaw(typeof result.raw === "string" ? result.raw : "");
      if (typeof result.raw === "string" && result.raw.trim().length > 0) {
        setScaleReadLogs((prev) => [`${new Date().toLocaleTimeString("tr-TR")} | ${result.raw}`, ...prev].slice(0, 12));
      }
      setScaleConnectionState("connected");

      if (typeof result.weightKg !== "number" || !Number.isFinite(result.weightKg) || result.weightKg <= 0) {
        setError("Teraziden gecerli bir agirlik okunamadi.");
        return;
      }

      if (result.stable === false) {
        setError("Terazi agirligi henuz stabil degil. Urunu sabitleyip tekrar deneyin.");
        return;
      }

      applyScaleWeightToProduct(targetProduct, result.weightKg);
    } catch (requestError) {
      setScaleConnectionState("error");
      setError(requestError instanceof Error ? requestError.message : "Teraziden veri okunamadi.");
      setMessage(null);
    } finally {
      setReadingScale(false);
    }
  }, [applyScaleWeightToProduct, autoScaleTargetProduct, scaleConnectionSettings]);

  React.useEffect(() => {
    if (!autoScaleEnabled || !scaleConnectionSettings.enabled || !autoScaleTargetProduct) {
      return;
    }

    const timer = window.setInterval(() => {
      if (readingScaleRef.current) {
        return;
      }
      void readWeightFromScaleAndApply();
    }, 1200);

    return () => {
      window.clearInterval(timer);
    };
  }, [autoScaleEnabled, autoScaleTargetProduct, readWeightFromScaleAndApply, scaleConnectionSettings.enabled]);

  function addCustomLine() {
    const unitPrice = asNumber(customPrice, 0);
    const taxRate = asNumber(customVatRate, 20);

    if (!customName.trim()) {
      setError("Muhtelif satır için ürün adı girmelisiniz.");
      return;
    }
    if (unitPrice <= 0) {
      setError("Muhtelif satır için fiyat 0'dan büyük olmalıdır.");
      return;
    }

    const manualId = `MHTL-${Date.now()}`;
    setCart((prev) => [
      ...prev,
      {
        productId: manualId,
        productCode: "MUHTELIF",
        productName: customName.trim(),
        quantity: 1,
        unit: "ADET",
        unitPrice,
        taxRate,
      },
    ]);

    setSelectedLineId(manualId);
    setShowCustomPanel(false);
    setMessage("Muhtelif satır sepete eklendi.");
    setError(null);
  }

  function tryScanAdd(input: string) {
    const q = input.trim().toLocaleLowerCase("tr");
    if (!q) {
      return false;
    }

    const scaleParsed = parseScaleBarcode(input.trim(), {
      ...defaultScaleSettings,
      enabled: posParameters.scaleBarcodeEnabled,
      weightPrefix: posParameters.scaleWeightPrefix,
      pricePrefixPrimary: posParameters.scalePricePrefixPrimary,
      pricePrefixSecondary: posParameters.scalePricePrefixSecondary,
      productCodeDigits: posParameters.scaleProductCodeDigits,
      valueDigits: posParameters.scaleValueDigits,
    });
    if (scaleParsed) {
      const weightedProduct = products.find((product) => matchesScaleProductCode(product, scaleParsed.productCode));
      if (weightedProduct) {
        setShowMissingBarcodeActions(false);
        if (scaleParsed.mode === "weight" && scaleParsed.quantity) {
          return addProductToCart(weightedProduct, scaleParsed.quantity);
        }

        const encodedAmount = scaleParsed.encodedAmount ?? 0;
        const unitPrice = getProductPrice(weightedProduct, priceTier);
        if (unitPrice <= 0) {
          setError(`${weightedProduct.name} için fiyat tanımlı değil. Terazi barkodu çözümlenemedi.`);
          return false;
        }
        const quantityFromAmount = roundQuantity(encodedAmount / unitPrice);
        if (!Number.isFinite(quantityFromAmount) || quantityFromAmount <= 0) {
          setError("Terazi barkodu çözümlendi fakat miktar hesaplanamadı.");
          return false;
        }
        return addProductToCart(weightedProduct, quantityFromAmount);
      }
    }

    const exact = exactProductLookup.get(q);

    if (exact) {
      if (priceCheckMode) {
        const activePrice = getProductPrice(exact, priceTier);
        setMessage(
          `Fiyat Gör | ${exact.name} | ${formatTry(activePrice)} | Stok: ${exact.stock.toFixed(0)} | KDV: %${exact.vatRate}`,
        );
        setError(null);
        return true;
      }
      setShowMissingBarcodeActions(false);
      return addProductToCart(exact);
    }

    if (filteredProducts.length === 1) {
      if (priceCheckMode) {
        const exactSingle = filteredProducts[0];
        const activePrice = getProductPrice(exactSingle, priceTier);
        setMessage(
          `Fiyat Gör | ${exactSingle.name} | ${formatTry(activePrice)} | Stok: ${exactSingle.stock.toFixed(0)} | KDV: %${exactSingle.vatRate}`,
        );
        setError(null);
        return true;
      }
      setShowMissingBarcodeActions(false);
      return addProductToCart(filteredProducts[0]);
    }

    setMissingBarcode(input.trim());
    setShowMissingBarcodeActions(true);
    setError(`Barkod bulunamadı: ${input.trim()}`);
    return false;
  }

  function handleMissingBarcodeAction(action: "new_product" | "manual_line" | "retry") {
    if (action === "new_product") {
      const encoded = encodeURIComponent(missingBarcode);
      window.location.href = `/panel/urunler?focus=new-product&barcode=${encoded}`;
      return;
    }
    if (action === "manual_line") {
      setShowCustomPanel(true);
      setCustomName(`Barkod(${missingBarcode}) Manuel Satış`);
      setCustomPrice("0");
      setSearchText("");
      setMessage("Manuel satış satırı paneli açıldı.");
      return;
    }
    searchInputRef.current?.focus();
    setMessage("Barkodu tekrar okutabilirsiniz.");
  }

  function handleNumpadKey(key: string) {
    if (key === "clear") {
      setNumpadBuffer("");
      return;
    }
    if (key === "backspace") {
      setNumpadBuffer((prev) => prev.slice(0, -1));
      return;
    }
    if (key === "enter") {
      if (numpadMode === "barcode") {
        const barcodeValue = (numpadBuffer || searchText || "").trim();
        if (barcodeValue) {
          const scanned = tryScanAdd(barcodeValue);
          if (scanned) {
            setSearchText("");
            setNumpadBuffer("");
          }
        }
        return;
      }
      if (numpadMode === "quantity") {
        const fallbackLine = selectedLine ?? (cart.length > 0 ? cart[cart.length - 1] : null);
        if (!fallbackLine) {
          setError("Miktar için önce sepet satırı seçin.");
          return;
        }
        if (!selectedLine) {
          setSelectedLineId(fallbackLine.productId);
        }
        const qty = normalizeQuantity(asNumber(numpadBuffer, fallbackLine.quantity), getQuantityStep(fallbackLine.unit));
        updateQuantity(fallbackLine.productId, qty);
        setNumpadBuffer("");
        setMessage(`Miktar güncellendi: ${fallbackLine.productName}`);
        return;
      }
      const amount = asNumber(numpadBuffer, 0);
      if (amount > 0) {
        setPartialAmount(amount.toFixed(2));
        setMessage(`Tahsilat tutarı güncellendi: ${formatTry(amount)}`);
      }
      setNumpadBuffer("");
      return;
    }

    const appendValue = key === "," ? "." : key;
    setNumpadBuffer((prev) => `${prev}${appendValue}`);
    if (numpadMode === "barcode") {
      if (key !== ",") {
        setSearchText((prev) => `${prev}${key}`);
      }
    }
  }

  const openMixedPaymentModal = React.useCallback(() => {
    if (cart.length === 0) {
      setError("Karma ödeme için sepete ürün ekleyin.");
      return;
    }
    setMixedPaymentRows([{ id: `pay-${Date.now()}`, method: "nakit", amount: totals.grandTotal.toFixed(2), reference: "" }]);
    setShowMixedPaymentModal(true);
  }, [cart.length, totals.grandTotal]);

  function applyCashExactMixedPayment() {
    setMixedPaymentRows([
      {
        id: `pay-${Date.now()}`,
        method: "nakit",
        amount: totals.grandTotal.toFixed(2),
        reference: "",
      },
    ]);
  }

  function applyCardExactMixedPayment() {
    setMixedPaymentRows([
      {
        id: `pay-${Date.now()}`,
        method: "kart",
        amount: totals.grandTotal.toFixed(2),
        reference: "",
      },
    ]);
  }

  function addMixedPaymentRow() {
    setMixedPaymentRows((prev) => [
      ...prev,
      {
        id: `pay-${Date.now()}-${prev.length}`,
        method: "kart",
        amount: "0",
        reference: "",
      },
    ]);
  }

  function removeMixedPaymentRow(id: string) {
    setMixedPaymentRows((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.id !== id)));
  }

  function updateMixedPaymentRow(id: string, field: "method" | "amount" | "reference", value: string) {
    setMixedPaymentRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  }

  function applyQuickPartialAmount(amount: number) {
    setPartialAmount(Math.max(0, roundCurrency(amount)).toFixed(2));
    setMessage(`Hızlı ödeme tutarı: ${formatTry(amount)}`);
    setError(null);
  }

  async function completeMixedPaymentSale() {
    const parsed = mixedPaymentRows
      .map((row) => ({
        method: row.method,
        amount: asNumber(row.amount, 0),
        reference: row.reference.trim() || undefined,
      }))
      .filter((row) => row.amount > 0);
    if (parsed.length === 0) {
      setError("En az bir ödeme satırı girin.");
      return;
    }
    const totalPayment = parsed.reduce((sum, row) => sum + row.amount, 0);
    if (totalPayment + 0.000001 < totals.grandTotal) {
      setError(`Karma ödemede tahsil edilen tutar yetersiz. Kalan: ${formatTry(totals.grandTotal - totalPayment)}`);
      return;
    }
    if (totalPayment > totals.grandTotal + 0.000001 && !parsed.some((row) => row.method === "nakit")) {
      setError("Para üstü oluşacak işlemlerde en az bir nakit ödeme satırı olmalıdır.");
      return;
    }

    await submitSale({
      modeLabel: "Karma ödeme satışı",
      payments: parsed,
      amount: totalPayment,
    });
    setShowMixedPaymentModal(false);
  }

  function updateQuantity(productId: string, quantity: number) {
    const line = cart.find((row) => row.productId === productId);
    const step = getQuantityStep(line?.unit);
    const nextQuantity = normalizeQuantity(quantity, step);
    setCart((prev) => prev.map((line) => (line.productId === productId ? { ...line, quantity: nextQuantity } : line)));
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((line) => line.productId !== productId));
    if (selectedLineId === productId) {
      setSelectedLineId(null);
    }
  }

  function applyQuickCustomer(index: number) {
    const row = quickCustomers[index];
    if (!row) {
      setError("Hızlı müşteri kaydı bulunamadı.");
      return;
    }

    setCustomerCode(row.code);
    setCustomerName(row.name);
    setMessage(`${row.name} seçildi.`);
    setError(null);
  }

  function showSelectedLinePrice() {
    if (!selectedLine) {
      setError("Önce sepetten bir satır seçin.");
      return;
    }

    const gross = selectedLine.unitPrice * (1 + selectedLine.taxRate / 100);
    setMessage(`${selectedLine.productName} | Birim: ${formatTry(selectedLine.unitPrice)} | KDV Dahil: ${formatTry(gross)}`);
    setError(null);
  }

  function quickReturnSelectedLine() {
    if (!ensureOperationPermission("sale:return", "Hızlı iade")) {
      return;
    }

    if (!selectedLine) {
      setError("Hızlı iade için sepetten bir satır seçin.");
      return;
    }

    const step = getQuantityStep(selectedLine.unit);
    if (selectedLine.quantity <= step + 0.000001) {
      removeLine(selectedLine.productId);
    } else {
      updateQuantity(selectedLine.productId, selectedLine.quantity - step);
    }

    setMessage("Seçili satır için iade düşümü uygulandı.");
    setError(null);
  }

  function quickExchangeSelectedLine() {
    if (!selectedLine) {
      setError("Hızlı değişim için sepetten bir satır seçin.");
      return;
    }

    setExchangeTargetId(selectedLine.productId);
    setSearchText(selectedLine.productName);
    searchInputRef.current?.focus();
    setMessage("Değişim modu aktif: Sağdan yeni ürünü seçin.");
    setError(null);
  }

  function setActivePriceTier(tier: 1 | 2 | 3 | 4) {
    setPriceTier(tier);

    if (!selectedLine) {
      return;
    }

    const product = products.find((item) => item.id === selectedLine.productId);
    if (!product) {
      return;
    }

    const nextPrice = getProductPrice(product, tier);
    if (nextPrice < selectedLine.unitPrice && !ensureOperationPermission("sale:discount", "İndirimli fiyat uygulama")) {
      return;
    }

    setCart((prev) => prev.map((line) => (line.productId === selectedLine.productId ? { ...line, unitPrice: nextPrice } : line)));
    setMessage(`Seçili satır Fiyat ${tier} listesine güncellendi.`);
  }

  function applyLineDiscount(percent: number) {
    if (!selectedLine) {
      setError("İskonto için sepetten satır seçin.");
      return;
    }
    if (!ensureOperationPermission("sale:discount", "İskonto")) {
      return;
    }
    const ratio = Math.max(0, Math.min(100, percent)) / 100;
    const nextPrice = roundCurrency(selectedLine.unitPrice * (1 - ratio));
    setCart((prev) =>
      prev.map((line) => (line.productId === selectedLine.productId ? { ...line, unitPrice: nextPrice } : line)),
    );
    setMessage(`Seçili satıra %${percent} iskonto uygulandı.`);
    setError(null);
  }

  async function ensurePosSession() {
    if (sessionReady && sessionSummary.openSession?.code === registerId) {
      return;
    }

    try {
      await requestApi("/api/tenant/pos/session/open", {
        method: "POST",
        body: JSON.stringify({ registerId, registerName, openingCash: asNumber(openingCashInput, 0) }),
      });
      setSessionReady(true);
      await loadSessionSummary();
    } catch (sessionError) {
      const text = sessionError instanceof Error ? sessionError.message : "POS oturumu açılamadı.";
      if (text.toLocaleLowerCase("tr").includes("zaten açık")) {
        setSessionReady(true);
        await loadSessionSummary();
        return;
      }
      throw sessionError;
    }
  }

  async function openPosSessionManually() {
    if (sessionSummary.openSession) {
      setError("Bu kasada zaten açık POS oturumu var.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await requestApi("/api/tenant/pos/session/open", {
        method: "POST",
        body: JSON.stringify({
          registerId,
          registerName,
          openingCash: Math.max(0, asNumber(openingCashInput, 0)),
        }),
      });
      await loadSessionSummary();
      setSessionReady(true);
      setMessage("POS oturumu açıldı.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "POS oturumu açılamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function closePosSessionManually() {
    const activeSession = sessionSummary.openSession;
    if (!activeSession) {
      setError("Kapatılacak açık POS oturumu bulunamadı.");
      return;
    }

    const accepted = await openConfirmDialog({
      title: "POS Oturum Kapanışı",
      description: "Kasa oturumunu kapatmak istediğinize emin misiniz?",
      confirmLabel: "Oturumu Kapat",
      cancelLabel: "Vazgeç",
      tone: "danger",
    });
    if (!accepted) {
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const closedSession = await requestApi<{ payload?: Record<string, unknown> }>("/api/tenant/pos/session/close", {
        method: "POST",
        body: JSON.stringify({
          sessionId: activeSession.id,
          closingCash: Math.max(0, asNumber(closingCashInput, 0)),
          note: sessionCloseNote.trim() || undefined,
        }),
      });
      const closedPayload = asRecord(closedSession.payload);
      const closureReport = asRecord(closedPayload.closureReport);
      const variance = asNumber(closureReport.cashVariance, 0);
      const expected = asNumber(closureReport.expectedClosingCash, 0);
      const counted = asNumber(closureReport.countedClosingCash, 0);
      const varianceText =
        variance > 0
          ? `+${formatTry(variance)} fazla`
          : variance < 0
            ? `${formatTry(Math.abs(variance))} eksik`
            : "Fark yok";
      setSessionReady(false);
      setSessionCloseNote("");
      await loadSessionSummary();
      setMessage(`POS oturumu kapatıldı. Beklenen: ${formatTry(expected)} | Sayılan: ${formatTry(counted)} | Fark: ${varianceText}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "POS oturumu kapatılamadı.");
    } finally {
      setBusy(false);
    }
  }

  function buildSaleItems(): PosSaleItem[] {
    return cart.map((line) => ({
      productId: line.productId,
      productCode: line.productCode,
      productName: line.productName,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      taxRate: line.taxRate,
    }));
  }

  async function submitSale(params: {
    paymentMethod?: "nakit" | "kart" | "havale_eft" | "cari" | "cek" | "dekont";
    amount?: number;
    modeLabel: string;
    payments?: Array<{ method: "nakit" | "kart" | "havale_eft" | "cari" | "cek" | "dekont"; amount: number; reference?: string }>;
    customerOverride?: { code: string; name: string };
  }) {
    if (cart.length === 0) {
      setError("Sepette ürün yok.");
      return;
    }

    const resolvedCustomerCode = params.customerOverride?.code ?? customerCode;
    const resolvedCustomerName = params.customerOverride?.name ?? customerName;

    const resolvedPayments =
      params.payments && params.payments.length > 0
        ? params.payments
        : [{ method: params.paymentMethod ?? "nakit", amount: params.amount ?? totals.grandTotal }];

    if (resolvedPayments.some((row) => row.method === "cari") && !resolvedCustomerCode.trim()) {
      setError("Cari satış için müşteri kodu girmelisiniz.");
      return;
    }

    const paymentAmount = resolvedPayments.reduce((sum, row) => sum + row.amount, 0);
    if (paymentAmount <= 0) {
      setError("Ödeme tutarı 0'dan büyük olmalıdır.");
      return;
    }
    if (
      resolvedPayments.length === 1 &&
      resolvedPayments[0].method === "nakit" &&
      posParameters.requireChangeFlowOnSale &&
      paymentAmount < totals.grandTotal
    ) {
      setError("Para üstü zorunlu ayarında nakit tutarı genel toplamdan küçük olamaz.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      await ensurePosSession();
      const saleItemsSnapshot = buildSaleItems();
      const result = await requestApi<SaleResult>("/api/tenant/pos/sales", {
        method: "POST",
        body: JSON.stringify({
          registerId,
          registerName,
          customerCode: resolvedCustomerCode || undefined,
          customerName: resolvedCustomerName || undefined,
          items: buildSaleItems(),
          payments: resolvedPayments,
          notes: cartNote || undefined,
        }),
      });

      setMessage(`${params.modeLabel} tamamlandı. Belge: ${result.saleCode} | Ödenen: ${formatTry(result.paidTotal)} | Kalan: ${formatTry(result.outstanding)}`);
      const receiptSnapshot: PosSaleHistoryRow = {
        id: result.saleId,
        saleCode: result.saleCode,
        registerId,
        registerName,
        customerCode: resolvedCustomerCode || undefined,
        customerName: resolvedCustomerName || undefined,
        currency: "TRY",
        total: result.netTotal,
        occurredAt: new Date().toISOString(),
        items: saleItemsSnapshot,
        payments: resolvedPayments.map((row) => ({ method: row.method, amount: row.amount, reference: row.reference })),
      };
      setLastSaleReceipt(receiptSnapshot);
      await handlePostSaleReceiptFlow(receiptSnapshot);
      setCart([]);
      setSelectedLineId(null);
      setExchangeTargetId(null);
      setCartNote("");
      playTone("barcode");
      await Promise.all([loadData(), loadSessionSummary()]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Satış işlemi başarısız oldu.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCariSaleWithSelectedCustomer() {
    const selected = cariCustomers.find((row) => row.id === selectedCariCustomerId);
    if (!selected) {
      setError("Cari satış için müşteri seçin.");
      return;
    }
    const projectedBalance = roundCurrency(selected.currentBalance + totals.grandTotal);
    if (selected.riskLimit > 0 && projectedBalance > selected.riskLimit + 0.000001) {
      setError(`Müşteri risk limiti aşılır. Yeni bakiye: ${formatTry(projectedBalance)} | Limit: ${formatTry(selected.riskLimit)}`);
      return;
    }

    setCustomerCode(selected.code);
    setCustomerName(selected.name);
    setShowCariCustomerModal(false);
    setMessage(`${selected.name} seçildi.`);

    await submitSale({
      paymentMethod: "cari",
      amount: totals.grandTotal,
      modeLabel: "Cari satış",
      customerOverride: {
        code: selected.code,
        name: selected.name,
      },
    });
  }

  async function createQuickCariCustomer() {
    const name = quickCariName.trim();
    if (name.length < 2) {
      setError("Hızlı cari oluşturmak için müşteri adı girin.");
      return;
    }

    const riskLimit = Math.max(0, asNumber(quickCariRiskLimit, 0));
    const maturityDays = Math.max(0, Math.floor(asNumber(quickCariMaturityDays, 0)));

    setCreatingQuickCari(true);
    setError(null);
    setMessage(null);

    try {
      const created = await requestApi<QuickCreateCustomerResponse>("/api/tenant/customers", {
        method: "POST",
        body: JSON.stringify({
          code: quickCariCode.trim() || undefined,
          name,
          phone: quickCariPhone.trim() || undefined,
          riskLimit,
          maturityDays,
        }),
      });

      const createdCode = asText(created.code);
      const createdName = asText(created.name) || name;
      if (createdCode) {
        setCustomerCode(createdCode);
      }
      setCustomerName(createdName);
      setMessage(`Yeni cari eklendi: ${createdName}`);

      const nextQuery = createdCode || name;
      setCariCustomerQuery(nextQuery);
      await loadCariCustomers(nextQuery);
      if (created.id) {
        setSelectedCariCustomerId(created.id);
      }

      setShowQuickCariForm(false);
      setQuickCariCode("");
      setQuickCariName("");
      setQuickCariPhone("");
      setQuickCariRiskLimit("0");
      setQuickCariMaturityDays("0");

      if (quickCariAutoCompleteSale && createdCode) {
        setShowCariCustomerModal(false);
        await submitSale({
          paymentMethod: "cari",
          amount: totals.grandTotal,
          modeLabel: "Cari satış",
          customerOverride: {
            code: createdCode,
            name: createdName,
          },
        });
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Hızlı cari oluşturulamadı.");
    } finally {
      setCreatingQuickCari(false);
    }
  }

  async function handlePartialSale() {
    const paid = asNumber(partialAmount, 0);
    if (!customerCode.trim()) {
      setError("Kısmi ödeme için müşteri kodu zorunludur.");
      return;
    }
    if (paid <= 0 || paid >= totals.grandTotal) {
      setError("Kısmi ödeme tutarı 0 ile genel toplam arasında olmalıdır.");
      return;
    }

    await submitSale({ paymentMethod: "nakit", amount: paid, modeLabel: "Kısmi ödeme satışı" });
  }

  async function suspendCart() {
    if (cart.length === 0) {
      setError("Askıya almak için sepete ürün ekleyin.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await ensurePosSession();
      await requestApi("/api/tenant/pos/suspended", {
        method: "POST",
        body: JSON.stringify({
          registerId,
          registerName,
          customerCode: customerCode || undefined,
          customerName: customerName || undefined,
          note: cartNote || undefined,
          items: buildSaleItems(),
        }),
      });

      setMessage("Sepet askıya alındı.");
      setCart([]);
      setSelectedLineId(null);
      setExchangeTargetId(null);
      setCartNote("");
      if (showOperations) {
        await loadSuspendedCarts();
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Sepet askıya alınamadı.");
    } finally {
      setBusy(false);
    }
  }

  function clearCart() {
    setCart([]);
    setSelectedLineId(null);
    setExchangeTargetId(null);
    setCartNote("");
    setShowMissingBarcodeActions(false);
    setMissingBarcode("");
    setMessage("Sepet iptal edildi.");
    setError(null);
  }

  async function requestClearCart() {
    if (busy) {
      return;
    }

    if (cart.length === 0) {
      clearCart();
      return;
    }

    const accepted = await openConfirmDialog({
      title: "Sepet İptal Onayı",
      description: "Mevcut sepet tamamen temizlenecek. Devam etmek istiyor musunuz?",
      confirmLabel: "Sepeti İptal Et",
      cancelLabel: "Vazgeç",
      tone: "danger",
    });

    if (!accepted) {
      return;
    }

    clearCart();
  }

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }
      if (event.repeat) {
        return;
      }
      if (showCariCustomerModal || confirmDialog.open) {
        return;
      }
      if (isInputLikeElement(event.target)) {
        return;
      }

      if (event.key === "F1") {
        event.preventDefault();
        if (busy) {
          return;
        }
        void submitSale({ paymentMethod: "nakit", amount: totals.grandTotal, modeLabel: "Nakit satış" });
      }
      if (event.key === "F2") {
        event.preventDefault();
        if (busy) {
          return;
        }
        void submitSale({ paymentMethod: "kart", amount: totals.grandTotal, modeLabel: "POS satış" });
      }
      if (event.key === "F3") {
        event.preventDefault();
        if (busy) {
          return;
        }
        void handlePartialSale();
      }
      if (event.key === "F4") {
        event.preventDefault();
        if (busy) {
          return;
        }
        openCariCustomerModal();
      }
      if (event.key === "F5") {
        event.preventDefault();
        void requestClearCart();
      }
      if (event.key === "F6") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if (event.key === "F7") {
        event.preventDefault();
        if (busy) {
          return;
        }
        openMixedPaymentModal();
      }
      if (event.key === "F8") {
        event.preventDefault();
        setPriceCheckMode((prev) => !prev);
      }
      if (event.key === "F9") {
        event.preventDefault();
        openCameraScanner();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    busy,
    cart.length,
    confirmDialog.open,
    customerCode,
    customerName,
    handlePartialSale,
    openCariCustomerModal,
    openCameraScanner,
    openMixedPaymentModal,
    partialAmount,
    posParameters.requireChangeFlowOnSale,
    priceTier,
    requestClearCart,
    selectedLineId,
    showCariCustomerModal,
    totals.grandTotal,
  ]);

  return (
    <div className={`grid h-[100dvh] grid-rows-[auto_auto_minmax(0,1fr)] gap-1 overflow-hidden bg-slate-100 text-[16px] xl:text-[17px] ${kioskMode ? "pb-0" : "pb-24 md:pb-0"}`}>
      <PosSaleTabs
        tabs={saleTabs}
        activeTabId={activeSaleTabId}
        onSelect={switchSaleTab}
        onCreate={createSaleTab}
        onRename={renameSaleTab}
        onClose={(tabId) => void closeSaleTab(tabId)}
        canCloseTabs={saleTabs.length > 1}
        compact={kioskMode}
        minimal={kioskMode}
      />

      <div className="overflow-hidden rounded-xl border border-slate-700 bg-[#17253c] text-slate-100 shadow-md">
        <div className={`flex items-center justify-between gap-2 ${kioskMode ? "" : "border-b border-slate-700"} ${kioskMode ? "px-2 py-1.5" : "px-3 py-2"}`}>
          <div className="flex min-w-0 items-center gap-2">
            <p className={`shrink-0 font-black leading-none text-white ${kioskMode ? "text-2xl" : "pr-2 text-4xl"}`}>{companyName || "Bey360"}</p>
            <Button size="sm" className={`${kioskMode ? "h-9 px-3 text-sm" : "h-12 px-5 text-lg"} bg-sky-700 text-white hover:bg-sky-600`} onClick={() => setSearchText("")}>
              Hızlı Satış
            </Button>
            {!kioskMode ? (
              <>
                <Button size="sm" className="h-12 bg-slate-700 px-5 text-lg text-white hover:bg-slate-600" onClick={openCustomerScreen}>
                  Müşteri Ekranı
                </Button>
                <Button
                  size="sm"
                  className={`h-12 px-5 text-lg ${showAdvancedPos ? "bg-indigo-600 text-white hover:bg-indigo-500" : "bg-slate-700 text-white hover:bg-slate-600"}`}
                  onClick={() => setShowAdvancedPos((prev) => !prev)}
                >
                  Gelişmiş Mod
                </Button>
                <Button
                  size="sm"
                  className="h-12 bg-amber-500 px-5 text-lg text-slate-900 hover:bg-amber-400"
                  onClick={() => (lastSaleReceipt ? printSaleReceipt(lastSaleReceipt) : setError("Yazdırmak için önce satış tamamlayın."))}
                >
                  Fiş Yazdır/Önizleme
                </Button>
              </>
            ) : null}
            <Button
              size="sm"
              className={`${kioskMode ? "h-9 px-3 text-sm" : "h-12 px-5 text-lg"} ${kioskMode ? "bg-cyan-700 hover:bg-cyan-600" : "bg-slate-700 hover:bg-slate-600"} text-white`}
              onClick={() => setKioskMode((prev) => !prev)}
            >
              {kioskMode ? "Kiosk Açık" : "Kiosk Modu"}
            </Button>
          </div>
          <div className={`flex shrink-0 items-center gap-2 font-semibold ${kioskMode ? "text-sm" : "text-lg"}`}>
            <span className={`inline-flex items-center gap-2 rounded-md ${kioskMode ? "px-2 py-1 text-[11px]" : "px-3 py-2 text-sm"} font-black ${scaleStatusMeta.className}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${scaleStatusMeta.dotClassName}`} />
              {scaleStatusMeta.label}
            </span>
            <span className={`rounded-md bg-slate-800 ${kioskMode ? "px-2 py-1 text-[11px]" : "px-3 py-2"}`}>{registerName}</span>
            {kioskMode ? <span className="text-xs tabular-nums">{clock.toLocaleTimeString("tr-TR")}</span> : <span>{clock.toLocaleDateString("tr-TR")} {clock.toLocaleTimeString("tr-TR")}</span>}
            <Button size="sm" variant="danger" className={`${kioskMode ? "h-9 px-3 text-sm" : "h-12 px-5 text-lg"}`} onClick={() => { window.location.href = "/giris"; }}>
              Çıkış
            </Button>
          </div>
        </div>
        {!kioskMode ? (
          <div className="grid gap-2 bg-[#1e2f49] px-3 py-2 md:grid-cols-[140px_1fr_120px_1fr_auto]">
            <input value={registerId} onChange={(event) => setRegisterId(event.target.value)} className="h-12 rounded border border-slate-500 bg-slate-100 px-3 text-lg text-slate-900" placeholder="Kasa Kodu" />
            <input value={searchText} onChange={(event) => setSearchText(event.target.value)} className="h-12 rounded border border-slate-500 bg-slate-100 px-3 text-lg text-slate-900" placeholder="Barkod / Ürün Adı Okutun..." />
            <Button size="sm" className="h-12 bg-slate-300 px-3 text-lg text-slate-900 hover:bg-slate-200" onClick={showSelectedLinePrice}>Fiyat Gör</Button>
            <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="h-12 rounded border border-slate-500 bg-slate-100 px-3 text-lg text-slate-900" placeholder="Müşteri Seçiniz..." />
            <Button size="sm" className="h-12 bg-slate-700 px-4 text-lg text-white hover:bg-slate-600" onClick={() => void loadData()} disabled={loadingProducts}>
              Yenile
            </Button>
          </div>
        ) : null}
      </div>

      <div className={`grid min-h-0 gap-1 ${kioskMode ? "xl:grid-cols-[minmax(0,1.28fr)_minmax(0,1fr)]" : "xl:grid-cols-[minmax(0,1.1fr)_332px_minmax(0,1.16fr)]"}`}>
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-300 bg-[#f8fafc] shadow-sm">
          <div className={`space-y-1 border-b border-slate-300 bg-slate-100 ${kioskMode ? "p-1.5" : "p-2"}`}>
            {kioskMode ? (
              <>
                <div className="grid gap-1 md:grid-cols-[auto_auto_repeat(4,minmax(0,1fr))]">
                  <Button size="sm" className="h-10 bg-sky-700 text-sm text-white hover:bg-sky-600" onClick={() => searchInputRef.current?.focus()}>Bul (F6)</Button>
                  <Button size="sm" className="h-10 bg-slate-300 text-sm text-slate-900 hover:bg-slate-200" onClick={showSelectedLinePrice}>Fiyat Gör</Button>
                  <Button size="sm" className={`h-10 text-sm ${priceTier === 1 ? "bg-sky-600 text-white" : "bg-slate-300 text-slate-900 hover:bg-slate-200"}`} onClick={() => setActivePriceTier(1)}>₺ Fyt1</Button>
                  <Button size="sm" className={`h-10 text-sm ${priceTier === 2 ? "bg-sky-600 text-white" : "bg-slate-300 text-slate-900 hover:bg-slate-200"}`} onClick={() => setActivePriceTier(2)}>₺ Fyt2</Button>
                  <Button size="sm" className={`h-10 text-sm ${priceTier === 3 ? "bg-sky-600 text-white" : "bg-slate-300 text-slate-900 hover:bg-slate-200"}`} onClick={() => setActivePriceTier(3)}>₺ Fyt3</Button>
                  <Button size="sm" className={`h-10 text-sm ${priceTier === 4 ? "bg-sky-600 text-white" : "bg-slate-300 text-slate-900 hover:bg-slate-200"}`} onClick={() => setActivePriceTier(4)}>₺ Fyt4</Button>
                </div>
                <div className="grid gap-1 md:grid-cols-[1fr_auto_auto_auto_auto]">
                  <div className="flex items-center gap-1 rounded-md bg-white/95 p-1">
                    <button type="button" className="inline-flex h-10 w-11 items-center justify-center rounded-md bg-sky-700 text-lg text-white" onClick={openCameraScanner}>📷</button>
                    <input
                      ref={searchInputRef}
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
                      placeholder="Barkod okutun veya ürün arayın"
                      className="h-10 flex-1 rounded border border-slate-300 px-3 text-sm"
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          if (tryScanAdd(searchText)) {
                            setSearchText("");
                          }
                        }
                      }}
                    />
                    <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-rose-300 bg-rose-50 text-base text-rose-700" onClick={() => setSearchText("")}>✕</button>
                  </div>
                  <Button size="sm" className="h-10 bg-indigo-100 px-4 text-sm text-indigo-800 hover:bg-indigo-200" onClick={openCariCustomerModal}>Cari Seç</Button>
                  <Button
                    size="sm"
                    className="h-10 bg-emerald-700 px-4 text-sm text-white hover:bg-emerald-600"
                    onClick={quickReturnSelectedLine}
                    disabled={!canReturnOperations}
                    title={!canReturnOperations ? "Hızlı iade için yetkiniz yok." : undefined}
                  >
                    H.İade
                  </Button>
                  <Button size="sm" className={`h-10 px-4 text-sm ${exchangeTargetId ? "bg-lime-400 text-emerald-950" : "bg-emerald-700 text-white"}`} onClick={quickExchangeSelectedLine}>Değişim</Button>
                  <Button
                    size="sm"
                    className="h-10 bg-amber-500 px-4 text-sm font-black text-slate-900 hover:bg-amber-400"
                    onClick={() => void readWeightFromScaleAndApply()}
                    disabled={readingScale}
                  >
                    {readingScale ? "Terazi..." : "Terazi Oku"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-1 md:grid-cols-7">
                  <Button size="sm" className="h-12 bg-sky-700 text-base text-white hover:bg-sky-600" onClick={() => searchInputRef.current?.focus()}>Bul (F6)</Button>
                  <Button size="sm" className="h-12 bg-slate-300 text-base text-slate-900 hover:bg-slate-200" onClick={showSelectedLinePrice}>Fiyat Gör</Button>
                  <Button size="sm" className="h-12 bg-slate-300 text-base text-slate-900 hover:bg-slate-200" onClick={() => setShowCustomPanel((prev) => !prev)}>Muhtelif</Button>
                  <Button size="sm" className={`h-12 text-base ${priceTier === 1 ? "bg-sky-600 text-white" : "bg-slate-300 text-slate-900 hover:bg-slate-200"}`} onClick={() => setActivePriceTier(1)}>₺ Fyt1</Button>
                  <Button size="sm" className={`h-12 text-base ${priceTier === 2 ? "bg-sky-600 text-white" : "bg-slate-300 text-slate-900 hover:bg-slate-200"}`} onClick={() => setActivePriceTier(2)}>₺ Fyt2</Button>
                  <Button size="sm" className={`h-12 text-base ${priceTier === 3 ? "bg-sky-600 text-white" : "bg-slate-300 text-slate-900 hover:bg-slate-200"}`} onClick={() => setActivePriceTier(3)}>₺ Fyt3</Button>
                  <Button size="sm" className={`h-12 text-base ${priceTier === 4 ? "bg-sky-600 text-white" : "bg-slate-300 text-slate-900 hover:bg-slate-200"}`} onClick={() => setActivePriceTier(4)}>₺ Fyt4</Button>
                </div>

                <div className="grid gap-1 md:grid-cols-[1fr_repeat(6,minmax(0,1fr))]">
                  <div className="flex items-center gap-1 rounded-md bg-white/95 p-1">
                    <button type="button" className="inline-flex h-11 w-12 items-center justify-center rounded-md bg-sky-700 text-xl text-white" onClick={openCameraScanner}>📷</button>
                    <input
                      ref={searchInputRef}
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
                      placeholder="Barkod / Ürün adı / Ürün kodu"
                      className="h-11 flex-1 rounded border border-slate-300 px-3 text-base"
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          if (tryScanAdd(searchText)) {
                            setSearchText("");
                          }
                        }
                      }}
                    />
                    <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-rose-300 bg-rose-50 text-lg text-rose-700" onClick={() => setSearchText("")}>✕</button>
                  </div>

                  <Button size="sm" className="h-12 bg-indigo-100 text-base text-indigo-800 hover:bg-indigo-200" onClick={() => applyQuickCustomer(0)}>{quickCustomers[0]?.name ?? "Müşteri 1"}</Button>
                  <Button size="sm" className="h-12 bg-indigo-100 text-base text-indigo-800 hover:bg-indigo-200" onClick={() => applyQuickCustomer(1)}>{quickCustomers[1]?.name ?? "Müşteri 2"}</Button>
                  <Button size="sm" className="h-12 bg-indigo-100 text-base text-indigo-800 hover:bg-indigo-200" onClick={() => applyQuickCustomer(2)}>{quickCustomers[2]?.name ?? "Müşteri 3"}</Button>
                  <Button
                    size="sm"
                    className="h-12 bg-emerald-700 text-base text-white hover:bg-emerald-600"
                    onClick={quickReturnSelectedLine}
                    disabled={!canReturnOperations}
                    title={!canReturnOperations ? "Hızlı iade için yetkiniz yok." : undefined}
                  >
                    H.İade
                  </Button>
                  <Button size="sm" className={`h-12 text-base ${exchangeTargetId ? "bg-lime-400 text-emerald-950" : "bg-emerald-700 text-white"}`} onClick={quickExchangeSelectedLine}>H.Değşm</Button>
                  <Button
                    size="sm"
                    className="h-12 bg-amber-500 text-base font-black text-slate-900 hover:bg-amber-400"
                    onClick={() => void readWeightFromScaleAndApply()}
                    disabled={readingScale}
                  >
                    {readingScale ? "Terazi..." : "Terazi Oku"}
                  </Button>
                </div>
              </>
            )}

            {showMissingBarcodeActions ? (
              <div className="grid gap-2 rounded-md border border-amber-300/50 bg-amber-100/90 p-2 text-slate-900 md:grid-cols-[1fr_auto_auto_auto]">
                <p className="self-center text-sm font-semibold">
                  Barkod bulunamadı: <span className="font-black">{missingBarcode}</span>
                </p>
                <Button size="sm" className="h-11 bg-slate-800 text-base text-white hover:bg-slate-700" onClick={() => handleMissingBarcodeAction("new_product")}>
                  Ürün Oluştur
                </Button>
                <Button size="sm" className="h-11 bg-slate-800 text-base text-white hover:bg-slate-700" onClick={() => handleMissingBarcodeAction("manual_line")}>
                  Manuel Satır
                </Button>
                <Button size="sm" className="h-11 bg-slate-800 text-base text-white hover:bg-slate-700" onClick={() => handleMissingBarcodeAction("retry")}>
                  Tekrar Dene
                </Button>
              </div>
            ) : null}

            {showCustomPanel ? (
              <div className="grid gap-1 rounded-md bg-white/10 p-1.5 md:grid-cols-[1fr_160px_120px_auto]">
                <input value={customName} onChange={(event) => setCustomName(event.target.value)} className="h-11 rounded border border-white/20 bg-white/90 px-3 text-base" placeholder="Muhtelif ürün adı" />
                <input value={customPrice} onChange={(event) => setCustomPrice(event.target.value)} className="h-11 rounded border border-white/20 bg-white/90 px-3 text-base" inputMode="decimal" placeholder="Fiyat" />
                <input value={customVatRate} onChange={(event) => setCustomVatRate(event.target.value)} className="h-11 rounded border border-white/20 bg-white/90 px-3 text-base" inputMode="decimal" placeholder="KDV %" />
                <Button size="sm" className="h-11 bg-lime-400 text-base text-emerald-950 hover:bg-lime-300" onClick={addCustomLine}>Satıra Ekle</Button>
              </div>
            ) : null}
          </div>

          <div className="flex-1 overflow-auto bg-white">
            <table className="min-w-full text-base">
              <thead className="sticky top-0 z-10 bg-[#e6edf5] text-slate-700">
                <tr>
                  <th className="w-14 px-2 py-3 text-left">Sıra</th>
                  <th className="w-40 px-2 py-3 text-left">Ürün Kodu</th>
                  <th className="px-2 py-3 text-left">Ürün Adı</th>
                  <th className="w-24 px-2 py-3 text-left">Miktar</th>
                  <th className="w-20 px-2 py-3 text-left">Birim</th>
                  <th className="w-28 px-2 py-3 text-left">Fiyat</th>
                  <th className="w-28 px-2 py-3 text-left">Tutar</th>
                  <th className="w-16 px-2 py-3 text-left">#</th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={`${kioskMode ? "h-[34vh] text-sm" : "h-[44vh]"} px-3 py-8 text-center text-[color:var(--mx-text-muted)]`}>Sepet boş. Sağ taraftan ürün seçin veya barkod okutun.</td>
                  </tr>
                ) : (
                  cart.map((line, index) => {
                    const rowTotal = line.quantity * line.unitPrice * (1 + line.taxRate / 100);
                    const isSelected = selectedLineId === line.productId;
                    const quantityStep = getQuantityStep(line.unit);
                    return (
                      <tr key={line.productId} className={`border-b border-slate-200 ${isSelected ? "bg-sky-100" : "hover:bg-slate-50"}`} onClick={() => setSelectedLineId(line.productId)}>
                        <td className="px-2 py-3">{index + 1}</td>
                        <td className="px-2 py-3">{line.productCode}</td>
                        <td className="px-2 py-3 font-medium">{line.productName}</td>
                        <td className="px-2 py-3">
                          <div className="inline-flex items-center gap-1 rounded border border-[color:var(--mx-border)] bg-white px-1 py-0.5">
                            <button type="button" className="h-10 w-10 rounded bg-slate-100 text-xl font-bold" onClick={(event) => { event.stopPropagation(); updateQuantity(line.productId, line.quantity - quantityStep); }}>-</button>
                            <span className="min-w-10 text-center font-semibold">{formatQuantity(line.quantity)}</span>
                            <button type="button" className="h-10 w-10 rounded bg-slate-100 text-xl font-bold" onClick={(event) => { event.stopPropagation(); updateQuantity(line.productId, line.quantity + quantityStep); }}>+</button>
                          </div>
                        </td>
                        <td className="px-2 py-3">{line.unit}</td>
                        <td className="px-2 py-3">{formatTry(line.unitPrice)}</td>
                        <td className="px-2 py-3 font-semibold">{formatTry(rowTotal)}</td>
                        <td className="px-2 py-3">
                          <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded bg-emerald-700 text-lg text-white hover:bg-emerald-600" onClick={(event) => { event.stopPropagation(); removeLine(line.productId); }}>✕</button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className={`shrink-0 space-y-2 border-t border-slate-300 bg-[#1c2a44] text-white ${kioskMode ? "p-1.5" : "p-2"}`}>
            {kioskMode ? (
              <>
                <div className="grid gap-1 md:grid-cols-[repeat(5,minmax(0,1fr))_1.15fr]">
                  <div className="rounded border border-[color:var(--mx-border)] bg-white px-2 py-1.5 text-sm"><p className="text-[11px] text-[color:var(--mx-text-muted)]">Miktar</p><p className="font-bold">{formatQuantity(totals.totalQuantity)}</p></div>
                  <div className="rounded border border-[color:var(--mx-border)] bg-white px-2 py-1.5 text-sm"><p className="text-[11px] text-[color:var(--mx-text-muted)]">Ara Toplam</p><p className="font-bold">{formatTry(totals.subTotal)}</p></div>
                  <div className="rounded border border-[color:var(--mx-border)] bg-white px-2 py-1.5 text-sm"><p className="text-[11px] text-[color:var(--mx-text-muted)]">KDV</p><p className="font-bold">{formatTry(totals.taxTotal)}</p></div>
                  <div className="rounded border border-[color:var(--mx-border)] bg-white px-2 py-1.5 text-sm"><p className="text-[11px] text-[color:var(--mx-text-muted)]">Tahsil</p><p className="font-bold text-emerald-700">{formatTry(paymentPreview.collected)}</p></div>
                  <div className="rounded border border-[color:var(--mx-border)] bg-white px-2 py-1.5 text-sm"><p className="text-[11px] text-[color:var(--mx-text-muted)]">Kalan</p><p className="font-bold text-rose-700">{formatTry(paymentPreview.remaining)}</p></div>
                  <div className="rounded border border-emerald-700 bg-emerald-800 px-2.5 py-1.5 text-white"><p className="text-[11px] text-emerald-100">Genel Toplam</p><p className="text-2xl font-extrabold">{formatTry(totals.grandTotal)}</p></div>
                </div>
                <div className="grid gap-1 md:grid-cols-4">
                  <Button onClick={() => void submitSale({ paymentMethod: "nakit", amount: totals.grandTotal, modeLabel: "Nakit satış" })} disabled={busy} className="h-12 bg-emerald-700 text-base font-black text-white hover:bg-emerald-600">Nakit (F1)</Button>
                  <Button onClick={() => void submitSale({ paymentMethod: "kart", amount: totals.grandTotal, modeLabel: "POS satış" })} disabled={busy} className="h-12 bg-blue-700 text-base font-black text-white hover:bg-blue-600">POS (F2)</Button>
                  <Button onClick={openCariCustomerModal} disabled={busy} className="h-12 bg-amber-600 text-base font-black text-white hover:bg-amber-500">Cari (F4)</Button>
                  <Button variant="danger" onClick={() => void requestClearCart()} disabled={busy} className="h-12 text-base font-black">Sepet İptal</Button>
                </div>
                <div className="grid gap-1 md:grid-cols-4">
                  <Button onClick={openMixedPaymentModal} disabled={busy} className="h-10 bg-teal-700 text-sm text-white hover:bg-teal-600">Karma Ödeme</Button>
                  <Button onClick={() => void suspendCart()} disabled={busy} className="h-10 bg-slate-700 text-sm text-white hover:bg-slate-600">Beklemeye Al</Button>
                  <Button onClick={() => void readWeightFromScaleAndApply()} disabled={busy || readingScale} className="h-10 bg-amber-500 text-sm font-black text-slate-900 hover:bg-amber-400">{readingScale ? "Terazi..." : "Terazi Oku"}</Button>
                  <Button onClick={() => setPriceCheckMode((prev) => !prev)} disabled={busy} className={`h-10 text-sm ${priceCheckMode ? "bg-lime-400 text-emerald-950 hover:bg-lime-300" : "bg-slate-700 text-white hover:bg-slate-600"}`}>{priceCheckMode ? "Fiyat Gör Açık" : "Fiyat Gör"}</Button>
                </div>
              </>
            ) : (
              <div className="grid gap-2 md:grid-cols-8">
                <div className="rounded border border-[color:var(--mx-border)] bg-white px-3 py-2 text-base"><p className="text-sm text-[color:var(--mx-text-muted)]">Toplam Miktar</p><p className="font-bold">{formatQuantity(totals.totalQuantity)}</p></div>
                <div className="rounded border border-[color:var(--mx-border)] bg-white px-3 py-2 text-base"><p className="text-sm text-[color:var(--mx-text-muted)]">Ara Toplam</p><p className="font-bold">{formatTry(totals.subTotal)}</p></div>
                <div className="rounded border border-[color:var(--mx-border)] bg-white px-3 py-2 text-base"><p className="text-sm text-[color:var(--mx-text-muted)]">KDV</p><p className="font-bold">{formatTry(totals.taxTotal)}</p></div>
                <div className="rounded border border-[color:var(--mx-border)] bg-white px-3 py-2 text-base"><p className="text-sm text-[color:var(--mx-text-muted)]">Genel İskonto</p><p className="font-bold">{formatTry(0)}</p></div>
                <div className="rounded border border-[color:var(--mx-border)] bg-white px-3 py-2 text-base"><p className="text-sm text-[color:var(--mx-text-muted)]">Tahsil Edilen</p><p className="font-bold text-emerald-700">{formatTry(paymentPreview.collected)}</p></div>
                <div className="rounded border border-[color:var(--mx-border)] bg-white px-3 py-2 text-base"><p className="text-sm text-[color:var(--mx-text-muted)]">Kalan</p><p className="font-bold text-rose-700">{formatTry(paymentPreview.remaining)}</p></div>
                <div className="rounded border border-[color:var(--mx-border)] bg-white px-3 py-2 text-base"><p className="text-sm text-[color:var(--mx-text-muted)]">Para Üstü</p><p className="font-bold text-indigo-700">{formatTry(paymentPreview.change)}</p></div>
                <div className="rounded border border-emerald-700 bg-emerald-800 px-3 py-2 text-base text-white"><p className="text-sm text-emerald-100">Genel Toplam</p><p className="text-xl font-extrabold">{formatTry(totals.grandTotal)}</p></div>
              </div>
            )}

            <div className="rounded border border-[color:var(--mx-border)] bg-white px-2 py-2 xl:hidden">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold text-[color:var(--mx-text-muted)]">Hızlı Tutar:</p>
                {paymentShortcutValues.map((amount) => (
                  <button
                    key={`shortcut-${amount}`}
                    type="button"
                    onClick={() => applyQuickPartialAmount(amount)}
                  className={`h-10 rounded border px-3 text-sm font-bold ${
                      amount === roundCurrency(totals.grandTotal)
                        ? "border-indigo-300 bg-indigo-100 text-indigo-700"
                        : "border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] text-[color:var(--mx-text)]"
                    }`}
                  >
                    {amount === roundCurrency(totals.grandTotal) ? "Tam Tutar" : formatTry(amount)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => applyQuickPartialAmount(asNumber(partialAmount, 0) + totals.grandTotal)}
                  className="h-10 rounded border border-emerald-300 bg-emerald-100 px-3 text-sm font-bold text-emerald-700"
                >
                  Tutar + Toplam
                </button>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-9 xl:hidden">
              <Button onClick={() => void submitSale({ paymentMethod: "nakit", amount: totals.grandTotal, modeLabel: "Nakit satış" })} disabled={busy} className="h-12 bg-emerald-700 text-white hover:bg-emerald-600">Nakit Satış (F1)</Button>
              <Button onClick={() => void submitSale({ paymentMethod: "kart", amount: totals.grandTotal, modeLabel: "POS satış" })} disabled={busy} className="h-12 bg-emerald-700 text-white hover:bg-emerald-600">POS Satış (F2)</Button>
              <Button onClick={openMixedPaymentModal} disabled={busy} className="h-12 bg-indigo-700 text-white hover:bg-indigo-600">Karma Ödeme</Button>
              <Button onClick={() => void handlePartialSale()} disabled={busy} className="h-12 bg-emerald-700 text-white hover:bg-emerald-600">Kısmi Ödeme (F3)</Button>
              <Button onClick={openCariCustomerModal} disabled={busy} className="h-12 bg-emerald-700 text-white hover:bg-emerald-600">Cari Satış (F4)</Button>
              <Button onClick={() => void readWeightFromScaleAndApply()} disabled={busy || readingScale} className="h-12 bg-amber-500 font-black text-slate-900 hover:bg-amber-400">{readingScale ? "Terazi..." : "Terazi Oku"}</Button>
              <Button onClick={() => void suspendCart()} disabled={busy} className="h-12 bg-sky-700 text-white hover:bg-sky-600">Beklemeye Al</Button>
              <Button onClick={() => void toggleOperationsPanel()} disabled={busy} className="h-12 bg-slate-700 text-white hover:bg-slate-600">{showOperations ? "İşlemleri Gizle" : "İşlemler"}</Button>
              <Button variant="danger" onClick={() => void requestClearCart()} disabled={busy} className="h-12">Sepet İptal (F5)</Button>
            </div>

            {showOperations ? (
              <div className="max-h-[34dvh] space-y-3 overflow-auto rounded-lg border border-[color:var(--mx-border)] bg-white p-3">
                <div className="rounded-lg border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold">Kasa Oturumu ve Vardiya Özeti</p>
                    <Button size="sm" variant="secondary" onClick={() => void loadSessionSummary()} disabled={loadingSessionSummary}>
                      {loadingSessionSummary ? "Yükleniyor..." : "Oturumu Yenile"}
                    </Button>
                  </div>

                  <div className="grid gap-2 md:grid-cols-4">
                    <div className="rounded border border-[color:var(--mx-border)] bg-white px-2 py-1.5 text-xs">
                      <p className="text-[color:var(--mx-text-muted)]">Kasa</p>
                      <p className="font-bold">{registerId} / {registerName}</p>
                    </div>
                    <div className="rounded border border-[color:var(--mx-border)] bg-white px-2 py-1.5 text-xs">
                      <p className="text-[color:var(--mx-text-muted)]">Durum</p>
                      <p className={`font-bold ${sessionSummary.openSession ? "text-emerald-700" : "text-rose-700"}`}>
                        {sessionSummary.openSession ? "Açık Oturum" : "Kapalı"}
                      </p>
                    </div>
                    <div className="rounded border border-[color:var(--mx-border)] bg-white px-2 py-1.5 text-xs">
                      <p className="text-[color:var(--mx-text-muted)]">Bugün Satış Adedi</p>
                      <p className="font-bold">{sessionSummary.todaysSalesCount}</p>
                    </div>
                    <div className="rounded border border-[color:var(--mx-border)] bg-white px-2 py-1.5 text-xs">
                      <p className="text-[color:var(--mx-text-muted)]">Bugün Ciro</p>
                      <p className="font-bold">{formatTry(sessionSummary.todaysSalesTotal)}</p>
                    </div>
                  </div>

                  <div className="mt-2 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                    <input
                      value={openingCashInput}
                      onChange={(event) => setOpeningCashInput(event.target.value)}
                      placeholder="Açılış nakit tutarı"
                      inputMode="decimal"
                    />
                    <input
                      value={closingCashInput}
                      onChange={(event) => setClosingCashInput(event.target.value)}
                      placeholder="Kapanış nakit tutarı"
                      inputMode="decimal"
                      disabled={!sessionSummary.openSession}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-10 bg-emerald-700 text-white hover:bg-emerald-600"
                        onClick={() => void openPosSessionManually()}
                        disabled={busy || Boolean(sessionSummary.openSession)}
                      >
                        Oturumu Aç
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => void closePosSessionManually()}
                        disabled={busy || !sessionSummary.openSession}
                      >
                        Oturumu Kapat
                      </Button>
                    </div>
                  </div>

                  <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto]">
                    <input
                      value={sessionCloseNote}
                      onChange={(event) => setSessionCloseNote(event.target.value)}
                      placeholder="Kapanış notu (opsiyonel)"
                      disabled={!sessionSummary.openSession}
                    />
                    <div className="text-xs text-[color:var(--mx-text-muted)] self-center">
                      {sessionSummary.openSession
                        ? `Açılış: ${formatTry(sessionSummary.openingCash)} | Oturum ID: ${sessionSummary.openSession.id}`
                        : sessionSummary.lastClosureReport
                          ? `Son kapanış farkı: ${formatTry(sessionSummary.lastClosureReport.cashVariance)} | Beklenen: ${formatTry(sessionSummary.lastClosureReport.expectedClosingCash)} | Sayılan: ${formatTry(sessionSummary.lastClosureReport.countedClosingCash)}`
                          : "Açık oturum yok"}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 xl:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold">Askıdaki Sepetler</p>
                      <Button size="sm" variant="secondary" onClick={() => void loadSuspendedCarts()} disabled={loadingOperations}>
                        Yenile
                      </Button>
                    </div>
                    <div className="max-h-52 overflow-auto rounded border border-[color:var(--mx-border)]">
                      <table className="min-w-full text-xs">
                        <thead className="bg-[color:var(--mx-surface-soft)]">
                          <tr>
                            <th className="px-2 py-2 text-left">Belge</th>
                            <th className="px-2 py-2 text-left">Müşteri</th>
                            <th className="px-2 py-2 text-left">İşlem</th>
                          </tr>
                        </thead>
                        <tbody>
                          {suspendedCarts.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-2 py-4 text-center text-[color:var(--mx-text-muted)]">
                                {loadingOperations ? "Yükleniyor..." : "Askıda sepet bulunamadı."}
                              </td>
                            </tr>
                          ) : (
                            suspendedCarts.map((row) => {
                              const payload = asRecord(row.payload);
                              const customer = asText(payload.customerName, "Perakende");
                              return (
                                <tr key={row.id} className="border-t border-[color:var(--mx-border)]">
                                  <td className="px-2 py-2">{row.code ?? row.id}</td>
                                  <td className="px-2 py-2">{customer}</td>
                                  <td className="px-2 py-2">
                                    <Button size="sm" onClick={() => void recallSuspendedCart(row.id)} disabled={busy}>
                                      Geri Çağır
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-bold">Fiş Bazlı İşlemler</p>
                    {!canReturnOperations ? (
                      <p className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                        İade işlemleri için yetkiniz bulunmuyor.
                      </p>
                    ) : null}
                    <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                      <input
                        value={saleLookupCode}
                        onChange={(event) => setSaleLookupCode(event.target.value)}
                        placeholder="Satış kodu (örn: SAT-...)"
                      />
                      <Button onClick={() => void findSaleByCode()} disabled={loadingOperations}>
                        Fiş Bul
                      </Button>
                    </div>

                    {saleLookupResult ? (
                      <div className="space-y-2 rounded border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-2">
                        <p className="text-xs font-semibold">
                          {saleLookupResult.saleCode} - {new Date(saleLookupResult.occurredAt).toLocaleString("tr-TR")}
                        </p>
                        <p className="text-xs text-[color:var(--mx-text-muted)]">
                          Müşteri: {saleLookupResult.customerName || "Perakende"} | Toplam: {formatTry(saleLookupResult.total)}
                        </p>
                        <div className="max-h-44 overflow-auto rounded border border-[color:var(--mx-border)] bg-white">
                          <table className="min-w-full text-xs">
                            <thead className="bg-[color:var(--mx-surface-soft)]">
                              <tr>
                                <th className="px-2 py-2 text-left">Seç</th>
                                <th className="px-2 py-2 text-left">Ürün</th>
                                <th className="px-2 py-2 text-left">Satılan</th>
                                <th className="px-2 py-2 text-left">Kalan</th>
                                <th className="px-2 py-2 text-left">İade Miktar</th>
                              </tr>
                            </thead>
                            <tbody>
                              {returnLines.map((line) => (
                                <tr key={line.key} className="border-t border-[color:var(--mx-border)]">
                                  <td className="px-2 py-2">
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4"
                                      checked={line.selected}
                                      onChange={(event) => updateReturnLineSelection(line.key, event.target.checked)}
                                      disabled={!canReturnOperations}
                                    />
                                  </td>
                                  <td className="px-2 py-2">
                                    <p className="font-semibold">{line.productName}</p>
                                    <p className="text-[10px] text-[color:var(--mx-text-muted)]">
                                      {line.productCode || line.productId}
                                    </p>
                                  </td>
                                  <td className="px-2 py-2">{line.soldQuantity.toFixed(2)}</td>
                                  <td className="px-2 py-2">{line.maxReturnQuantity.toFixed(2)}</td>
                                  <td className="px-2 py-2">
                                    <input
                                      type="number"
                                      min={0}
                                      max={line.maxReturnQuantity}
                                      step="0.01"
                                      value={line.returnQuantity}
                                      onChange={(event) => updateReturnLineQuantity(line.key, event.target.value)}
                                      className="h-8 w-24"
                                      disabled={!canReturnOperations}
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="secondary" onClick={() => selectAllReturnLines(true)} disabled={!canReturnOperations}>
                              Tümünü Seç
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => selectAllReturnLines(false)} disabled={!canReturnOperations}>
                              Seçimi Kaldır
                            </Button>
                          </div>
                          <p className="font-semibold">
                            Seçili Satır: {selectedReturnLines.length} | İade Toplamı: {formatTry(selectedReturnTotal)}
                          </p>
                        </div>
                        <div className="grid gap-2 md:grid-cols-[1fr_160px]">
                          <input
                            value={returnReason}
                            onChange={(event) => setReturnReason(event.target.value)}
                            placeholder="İade nedeni (opsiyonel)"
                            disabled={!canReturnOperations}
                          />
                          <select
                            value={returnRefundMethod}
                            onChange={(event) => setReturnRefundMethod(event.target.value as "nakit" | "kart" | "havale_eft" | "cari" | "cek" | "dekont")}
                            disabled={!canReturnOperations}
                          >
                            <option value="nakit">Nakit İade</option>
                            <option value="kart">Kart İade</option>
                            <option value="havale_eft">Havale/EFT İade</option>
                            <option value="cari">Cari İade</option>
                            <option value="cek">Çek İade</option>
                            <option value="dekont">Dekont İade</option>
                          </select>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            className="bg-slate-700 text-white hover:bg-slate-600"
                            onClick={() => printSaleReceipt(saleLookupResult)}
                          >
                            Tekrar Yazdır
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => previewSaleReceipt(saleLookupResult)}
                          >
                            Önizleme
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => void createReturnFromLookup()}
                            disabled={processingReturn || selectedReturnLines.length === 0 || !canReturnOperations}
                          >
                            {processingReturn ? "İade İşleniyor..." : "Kısmi / Tam İade"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-[color:var(--mx-text-muted)]">
                        Fiş kodu ile arama yapıp iade veya tekrar yazdırma işlemi başlatabilirsiniz.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {message ? <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-base text-emerald-700">{message}</p> : null}
            {error ? <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-base text-rose-700">{error}</p> : null}
          </div>
        </div>

        <div className={`h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-300 bg-[#eef2f6] shadow-sm ${kioskMode ? "hidden" : "hidden xl:flex"}`}>
          <div className={`border-b border-slate-300 bg-white ${kioskMode ? "p-1.5" : "p-2"}`}>
            <div className={`rounded-md border border-slate-300 bg-slate-50 text-right ${kioskMode ? "px-2.5 py-1" : "px-3 py-1"}`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tutar</p>
              <p className={`${kioskMode ? "text-[1.7rem]" : "text-3xl"} font-black text-slate-900`}>{formatTry(totals.grandTotal)}</p>
            </div>
            <div className={`mt-1.5 rounded-md border border-amber-300 bg-amber-50 ${kioskMode ? "px-2 py-1.5" : "px-2.5 py-2"}`}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-700">Canlı Terazi</p>
                  <p className="text-xs font-semibold text-slate-700">
                    {scaleConnectionSettings.brand.toUpperCase()} {scaleConnectionSettings.enabled ? "- Aktif" : "- Pasif"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 px-3 text-xs font-black"
                    onClick={() => setAutoScaleEnabled((prev) => !prev)}
                  >
                    {autoScaleEnabled ? "Canlı Akış Açık" : "Canlı Akış Kapalı"}
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 bg-amber-500 px-3 text-sm font-black text-slate-900 hover:bg-amber-400"
                    onClick={() => void readWeightFromScaleAndApply()}
                    disabled={readingScale}
                  >
                    {readingScale ? "Okunuyor..." : "Terazi Oku"}
                  </Button>
                </div>
              </div>
              <div className={`mt-1.5 grid grid-cols-3 gap-1.5 ${kioskMode ? "text-[10px]" : "text-[11px]"}`}>
                <div className={`rounded border border-amber-200 bg-white ${kioskMode ? "px-1.5 py-1" : "px-2 py-1.5"}`}>
                  <p className="text-slate-500">Son Ağırlık</p>
                  <p className={`${kioskMode ? "text-sm" : "text-base"} font-black text-slate-900`}>
                    {lastScaleWeightKg !== null ? `${lastScaleWeightKg.toFixed(3).replace(".", ",")} kg` : "-"}
                  </p>
                </div>
                <div className={`rounded border border-amber-200 bg-white ${kioskMode ? "px-1.5 py-1" : "px-2 py-1.5"}`}>
                  <p className="text-slate-500">Stabilite</p>
                  <p className={`${kioskMode ? "text-sm" : "text-base"} font-black text-slate-900`}>
                    {lastScaleStable === true ? "Stabil" : lastScaleStable === false ? "Hareketli" : "-"}
                  </p>
                </div>
                <div className={`rounded border border-amber-200 bg-white ${kioskMode ? "px-1.5 py-1" : "px-2 py-1.5"}`}>
                  <p className="text-slate-500">Gecikme</p>
                  <p className={`${kioskMode ? "text-sm" : "text-base"} font-black text-slate-900`}>{lastScaleLatencyMs !== null ? `${lastScaleLatencyMs} ms` : "-"}</p>
                </div>
              </div>
              {lastScaleRaw ? <p className="mt-1 truncate text-[11px] text-slate-500">Ham cevap: {lastScaleRaw}</p> : null}
              <p className="mt-0.5 text-[11px] text-slate-500">
                Ortam: {isSerialScaleSupportedInClient() ? "Masaustu / Local" : "Bulut"}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Hedef ürün: {autoScaleTargetProduct?.name ?? "Seçili değil"}
              </p>
              <div className={`mt-1 space-y-0.5 overflow-hidden rounded border border-amber-200 bg-white font-mono text-slate-600 ${kioskMode ? "max-h-12 p-1 text-[9px]" : "max-h-16 p-1.5 text-[10px]"}`}>
                {scaleReadLogs.length > 0 ? (
                  scaleReadLogs.map((line) => (
                    <div key={line} className="truncate">
                      {line}
                    </div>
                  ))
                ) : (
                  <div>Ham veri logu bekleniyor.</div>
                )}
              </div>
            </div>
          </div>
          <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${kioskMode ? "gap-1 p-1" : "gap-1.5 p-1.5"}`}>
            <PosNumpad
              mode={numpadMode}
              buffer={numpadBuffer}
              onModeChange={(mode) => {
                setNumpadMode(mode);
                setNumpadBuffer("");
              }}
              onKey={handleNumpadKey}
              compact={kioskMode}
            />
            <div className="grid grid-cols-2 gap-1">
              {paymentShortcutValues.slice(0, 6).map((amount) => (
                <button
                  key={`middle-shortcut-${amount}`}
                  type="button"
                  onClick={() => applyQuickPartialAmount(amount)}
                  className={`${kioskMode ? "h-[clamp(1.85rem,3vh,2.2rem)] text-xs" : "h-[clamp(2.1rem,3.8vh,2.55rem)] text-sm"} rounded border border-slate-300 bg-white font-bold text-slate-900 hover:bg-slate-100`}
                >
                  {formatTry(amount)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => applyQuickPartialAmount(totals.grandTotal)}
                className={`${kioskMode ? "h-[clamp(1.9rem,3vh,2.25rem)] text-xs" : "h-[clamp(2.1rem,3.8vh,2.55rem)] text-sm"} col-span-2 rounded border border-indigo-300 bg-indigo-100 font-bold text-indigo-800 hover:bg-indigo-200`}
              >
                Tam Tutar (Tutar+Top)
              </button>
            </div>
            <div className={`mt-auto ${kioskMode ? "space-y-1" : "space-y-1.5"}`}>
            <Button
              onClick={() => void submitSale({ paymentMethod: "nakit", amount: totals.grandTotal, modeLabel: "Nakit satış" })}
              disabled={busy}
              className={`${kioskMode ? "h-[clamp(2.55rem,5vh,3.15rem)] text-[clamp(1rem,1.85vh,1.2rem)]" : "h-[clamp(3rem,6.6vh,4rem)] text-[clamp(1.15rem,2.25vh,1.5rem)]"} w-full bg-emerald-700 font-black text-white hover:bg-emerald-600`}
            >
              Nakit Satış (F1)
            </Button>
            <Button
              onClick={() => void submitSale({ paymentMethod: "kart", amount: totals.grandTotal, modeLabel: "POS satış" })}
              disabled={busy}
              className={`${kioskMode ? "h-[clamp(2.55rem,5vh,3.15rem)] text-[clamp(1rem,1.85vh,1.2rem)]" : "h-[clamp(3rem,6.6vh,4rem)] text-[clamp(1.15rem,2.25vh,1.5rem)]"} w-full bg-blue-700 font-black text-white hover:bg-blue-600`}
            >
              POS Satış (F2)
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={openMixedPaymentModal} disabled={busy} className={`${kioskMode ? "h-[clamp(2rem,3.55vh,2.35rem)] text-xs" : "h-[clamp(2.35rem,4.3vh,2.85rem)] text-sm"} bg-teal-700 text-white hover:bg-teal-600`}>Kısmi / Karma (F3)</Button>
              <Button onClick={openCariCustomerModal} disabled={busy} className={`${kioskMode ? "h-[clamp(2rem,3.55vh,2.35rem)] text-xs" : "h-[clamp(2.35rem,4.3vh,2.85rem)] text-sm"} bg-amber-600 text-white hover:bg-amber-500`}>Cari Satış (F4)</Button>
              <Button onClick={() => void readWeightFromScaleAndApply()} disabled={busy || readingScale} className={`${kioskMode ? "h-[clamp(2rem,3.55vh,2.35rem)] text-xs" : "h-[clamp(2.35rem,4.3vh,2.85rem)] text-sm"} bg-amber-500 font-black text-slate-900 hover:bg-amber-400`}>{readingScale ? "Terazi..." : "Terazi Oku"}</Button>
              <Button onClick={() => void suspendCart()} disabled={busy} className={`${kioskMode ? "h-[clamp(2rem,3.55vh,2.35rem)] text-xs" : "h-[clamp(2.35rem,4.3vh,2.85rem)] text-sm"} bg-slate-700 text-white hover:bg-slate-600`}>Beklemeye Al</Button>
              <Button onClick={() => void toggleOperationsPanel()} disabled={busy} className={`${kioskMode ? "h-[clamp(2rem,3.55vh,2.35rem)] text-xs" : "h-[clamp(2.35rem,4.3vh,2.85rem)] text-sm"} bg-slate-700 text-white hover:bg-slate-600`}>{showOperations ? "İşlemler Açık" : "İşlemler"}</Button>
            </div>
            <Button variant="danger" onClick={() => void requestClearCart()} disabled={busy} className={`${kioskMode ? "h-[clamp(2rem,3.55vh,2.35rem)] text-xs" : "h-[clamp(2.35rem,4.3vh,2.85rem)] text-sm"} w-full font-black`}>
              Sepet İptal (F5)
            </Button>
            </div>
          </div>
        </div>

        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-300 bg-[#f3f5f8] shadow-sm">
          <div className={`space-y-2 border-b border-slate-300 bg-white ${kioskMode ? "p-1.5" : "p-2"}`}>
            <div className={`grid gap-2 ${kioskMode ? "md:grid-cols-[1fr_auto_auto_auto]" : "md:grid-cols-[1fr_auto_auto_auto_auto_auto]"}`}>
              <select className={`${kioskMode ? "h-10 text-sm" : "h-11 text-base"} rounded border border-slate-300 bg-white px-3 font-semibold`}>
                <option>₺ Fyt1</option>
                <option>₺ Fyt2</option>
                <option>₺ Fyt3</option>
                <option>₺ Fyt4</option>
              </select>
              <Button size="sm" className={`${kioskMode ? "h-10 text-sm" : "h-12 text-base"} ${priceTier === 1 ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-800 hover:bg-slate-200"}`} onClick={() => setActivePriceTier(1)}>₺ Fyt1</Button>
              {!kioskMode ? <Button size="sm" className={`h-12 text-base ${priceTier === 2 ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-800 hover:bg-slate-200"}`} onClick={() => setActivePriceTier(2)}>₺ Fyt2</Button> : null}
              {!kioskMode ? <Button size="sm" className={`h-12 text-base ${priceTier === 3 ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-800 hover:bg-slate-200"}`} onClick={() => setActivePriceTier(3)}>₺ Fyt3</Button> : null}
              <Button size="sm" className={`${kioskMode ? "h-10 text-sm" : "h-12 text-base"} bg-amber-100 text-amber-800 hover:bg-amber-200`} onClick={quickReturnSelectedLine} disabled={!canReturnOperations}>H. İade</Button>
              <Button size="sm" className={`${kioskMode ? "h-10 text-sm" : "h-12 text-base"} ${exchangeTargetId ? "bg-sky-600 text-white" : "bg-indigo-100 text-indigo-800 hover:bg-indigo-200"}`} onClick={quickExchangeSelectedLine}>H. Değişim</Button>
            </div>
            <div className="flex items-center gap-2">
              <select className={`${kioskMode ? "h-10 text-sm" : "h-12 text-base"} flex-1 rounded border border-slate-300 bg-white px-3 font-semibold`}>
                <option>Market & Tekel Büfe</option>
              </select>
              <Button size="sm" className={`${kioskMode ? "h-10 px-3 text-sm" : "h-12 px-3 text-base"} bg-emerald-700 text-white hover:bg-emerald-600`}>Yeni Kısayol</Button>
            </div>
          </div>

          {showAdvancedPos ? (
            <div className="space-y-2 border-b border-[color:var(--mx-border)] bg-white p-2 xl:hidden">
            <div className="grid gap-2 md:grid-cols-2">
              <Button size="sm" className="h-11 bg-emerald-700 text-white hover:bg-emerald-600" onClick={openCariCustomerModal}>
                Müşteri Seç
              </Button>
              <Button size="sm" className="h-11 bg-indigo-700 text-white hover:bg-indigo-600" onClick={openMixedPaymentModal}>
                Karma Ödeme
              </Button>
              <Button
                size="sm"
                className={`h-11 ${priceCheckMode ? "bg-lime-400 text-emerald-950" : "bg-slate-700 text-white hover:bg-slate-600"}`}
                onClick={() => setPriceCheckMode((prev) => !prev)}
              >
                {priceCheckMode ? "Fiyat Gör Açık" : "Fiyat Gör"}
              </Button>
              <Button size="sm" className="h-11 bg-sky-700 text-white hover:bg-sky-600" onClick={openCameraScanner}>
                Kamera ile Oku
              </Button>
            </div>
            <PosNumpad
              mode={numpadMode}
              buffer={numpadBuffer}
              onModeChange={(mode) => {
                setNumpadMode(mode);
                setNumpadBuffer("");
              }}
              onKey={handleNumpadKey}
            />
            <div className="grid grid-cols-4 gap-2">
              <Button size="sm" className="h-10 bg-slate-700 text-white hover:bg-slate-600" onClick={() => applyLineDiscount(5)} disabled={!canDiscountOperations}>
                %5 İsk.
              </Button>
              <Button size="sm" className="h-10 bg-slate-700 text-white hover:bg-slate-600" onClick={() => applyLineDiscount(10)} disabled={!canDiscountOperations}>
                %10 İsk.
              </Button>
              <Button size="sm" className="h-10 bg-slate-700 text-white hover:bg-slate-600" onClick={() => applyLineDiscount(20)} disabled={!canDiscountOperations}>
                %20 İsk.
              </Button>
              <Button size="sm" className="h-10 bg-slate-700 text-white hover:bg-slate-600" onClick={() => applyLineDiscount(50)} disabled={!canDiscountOperations}>
                %50 İsk.
              </Button>
            </div>
            </div>
          ) : null}

          <div className="flex-1 overflow-auto p-2">
            {loadingProducts ? (
              <p className="rounded-md border border-[color:var(--mx-border)] bg-white px-3 py-10 text-center text-base text-[color:var(--mx-text-muted)]">Ürünler yükleniyor...</p>
            ) : (
              <div className={`grid gap-2 ${kioskMode ? "grid-cols-2 2xl:grid-cols-3" : "grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"}`}>
                {filteredProducts.map((product) => {
                  const expiryDayCount = daysUntilExpiry(product.expiryDate);
                  const nearExpiry =
                    expiryDayCount !== null &&
                    expiryDayCount >= 0 &&
                    expiryDayCount <= Math.max(0, posParameters.expiryWarningDays);
                  const blockedByStock = posParameters.preventOutOfStockSale && product.stock <= 0;
                  const blockedByExpiry = posParameters.preventExpiredProductSale && isExpired(product.expiryDate);
                  const isBlocked = product.lockedForSale || blockedByStock || blockedByExpiry;

                  return (
                    <button
                      type="button"
                      key={product.id}
                      onClick={() => addProductToCart(product)}
                      disabled={isBlocked}
                      className={`rounded-md border border-slate-300 bg-white ${kioskMode ? "p-3" : "p-2"} text-left transition ${
                        isBlocked
                          ? "cursor-not-allowed opacity-60"
                          : "hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-sm"
                      }`}
                    >
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.imageUrl} alt={product.name} className={`mb-2 w-full rounded object-contain ${kioskMode ? "h-32" : "h-28"}`} />
                      ) : (
                        <div
                          className={`mb-2 grid place-items-center rounded font-black text-white ${kioskMode ? "h-32 text-4xl" : "h-28 text-3xl"}`}
                          style={{ background: hashColor(product.name) }}
                        >
                          {productInitials(product.name)}
                        </div>
                      )}
                      <p className={`line-clamp-2 font-semibold text-slate-800 ${kioskMode ? "text-lg" : "text-base"}`}>{product.name}</p>
                      <div className={`mt-1 flex items-center justify-between ${kioskMode ? "text-sm" : "text-base"}`}>
                        <span className={`${kioskMode ? "text-2xl" : "text-lg"} font-black text-emerald-700`}>{formatTry(getProductPrice(product, priceTier))}</span>
                        <span className="text-slate-500">Stok: {product.stock.toFixed(0)}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1 text-xs font-semibold">
                        {product.lockedForSale ? (
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-rose-700">Satışa Kapalı</span>
                        ) : null}
                        {blockedByExpiry ? (
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-rose-700">SKT Geçti</span>
                        ) : null}
                        {nearExpiry ? (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700">
                            SKT {expiryDayCount} gün
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmDialog.open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/65 p-3">
          <div className="w-full max-w-md rounded-xl border border-[color:var(--mx-border)] bg-[color:var(--mx-surface)] p-4 shadow-2xl">
            <div className="mb-3">
              <p className="text-base font-bold">{confirmDialog.title}</p>
              <p className="mt-1 text-sm text-[color:var(--mx-text-muted)]">{confirmDialog.description}</p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => closeConfirmDialog(false)}>
                {confirmDialog.cancelLabel}
              </Button>
              <Button
                variant={confirmDialog.tone === "danger" ? "danger" : "default"}
                onClick={() => closeConfirmDialog(true)}
              >
                {confirmDialog.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {showCariCustomerModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3">
          <div className="w-full max-w-4xl rounded-xl border border-[color:var(--mx-border)] bg-[color:var(--mx-surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[color:var(--mx-border)] px-4 py-3">
              <div>
                <p className="text-base font-bold">Cari Müşteri Seçimi</p>
                <p className="text-xs text-[color:var(--mx-text-muted)]">
                  Cari satış için müşteri seçin. Satış tutarı: <span className="font-semibold text-[color:var(--mx-text)]">{formatTry(totals.grandTotal)}</span>
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowCariCustomerModal(false)}
              >
                Kapat
              </Button>
            </div>

            <div className="space-y-3 p-4">
              <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto_auto]">
                <input
                  value={cariCustomerQuery}
                  onChange={(event) => setCariCustomerQuery(event.target.value)}
                  placeholder="Cari kodu veya adı ile ara"
                  autoFocus
                />
                <Button
                  variant="secondary"
                  onClick={() => void loadCariCustomers(cariCustomerQuery)}
                  disabled={loadingCariCustomers}
                >
                  Yenile
                </Button>
                <Button variant="secondary" onClick={() => setShowQuickCariForm((prev) => !prev)} disabled={creatingQuickCari}>
                  {showQuickCariForm ? "Formu Kapat" : "Hızlı Yeni Cari"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelectedCariCustomerId("");
                    setCustomerCode("");
                    setCustomerName("");
                    setShowCariCustomerModal(false);
                    setMessage("Perakende müşteri seçildi.");
                  }}
                >
                  Perakende Satış
                </Button>
                <Button
                  onClick={() => void submitCariSaleWithSelectedCustomer()}
                  disabled={busy || loadingCariCustomers || !selectedCariCustomer || selectedCariBlockedByRisk}
                >
                  Seçiliyle Cari Satış
                </Button>
              </div>

              {showQuickCariForm ? (
                <div className="rounded-lg border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-3">
                  <p className="mb-2 text-sm font-bold">Hızlı Yeni Cari Kartı</p>
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    <input value={quickCariCode} onChange={(event) => setQuickCariCode(event.target.value)} placeholder="Cari kodu (opsiyonel)" />
                    <input value={quickCariName} onChange={(event) => setQuickCariName(event.target.value)} placeholder="Cari adı *" />
                    <input value={quickCariPhone} onChange={(event) => setQuickCariPhone(event.target.value)} placeholder="Telefon" />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={quickCariRiskLimit}
                      onChange={(event) => setQuickCariRiskLimit(event.target.value)}
                      placeholder="Risk limiti"
                    />
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={quickCariMaturityDays}
                      onChange={(event) => setQuickCariMaturityDays(event.target.value)}
                      placeholder="Vade (gün)"
                    />
                    <label className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--mx-border)] bg-[color:var(--mx-surface)] px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={quickCariAutoCompleteSale}
                        onChange={(event) => setQuickCariAutoCompleteSale(event.target.checked)}
                      />
                      Kaydedince cari satışı tamamla
                    </label>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <Button variant="secondary" onClick={() => setShowQuickCariForm(false)} disabled={creatingQuickCari}>
                      Vazgeç
                    </Button>
                    <Button onClick={() => void createQuickCariCustomer()} disabled={creatingQuickCari}>
                      {creatingQuickCari ? "Kaydediliyor..." : "Kaydet ve Seç"}
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="max-h-[52vh] overflow-auto rounded-lg border border-[color:var(--mx-border)]">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-[color:var(--mx-surface-soft)]">
                    <tr>
                      <th className="px-2 py-2 text-left">Kod</th>
                      <th className="px-2 py-2 text-left">Cari Adı</th>
                      <th className="px-2 py-2 text-left">Bakiye</th>
                      <th className="px-2 py-2 text-left">Risk</th>
                      <th className="px-2 py-2 text-left">Vade</th>
                      <th className="px-2 py-2 text-left">Kullanım</th>
                      <th className="px-2 py-2 text-left">Telefon</th>
                      <th className="px-2 py-2 text-left">E-posta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cariCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-2 py-8 text-center text-[color:var(--mx-text-muted)]">
                          {loadingCariCustomers ? "Cari müşteriler yükleniyor..." : "Cari müşteri bulunamadı."}
                        </td>
                      </tr>
                    ) : (
                      cariCustomers.map((row) => {
                        const active = row.id === selectedCariCustomerId;
                        const usagePercent = row.riskLimit > 0 ? Math.round((row.currentBalance / row.riskLimit) * 100) : 0;
                        const usageTone =
                          row.riskStatus === "over_limit"
                            ? "text-rose-700"
                            : row.riskStatus === "warning"
                              ? "text-amber-700"
                              : "text-emerald-700";
                        return (
                          <tr
                            key={row.id}
                            onClick={() => setSelectedCariCustomerId(row.id)}
                            onDoubleClick={() => void submitCariSaleWithSelectedCustomer()}
                            className={`cursor-pointer border-t border-[color:var(--mx-border)] ${active ? "bg-emerald-100/70" : "hover:bg-emerald-50/60"}`}
                          >
                            <td className="px-2 py-2 font-semibold">{row.code}</td>
                            <td className="px-2 py-2">{row.name}</td>
                            <td className="px-2 py-2 font-semibold">{formatTry(row.currentBalance)}</td>
                            <td className="px-2 py-2">{row.riskLimit > 0 ? formatTry(row.riskLimit) : "Sınırsız"}</td>
                            <td className="px-2 py-2">{row.maturityDays > 0 ? `${row.maturityDays} gün` : "-"}</td>
                            <td className={`px-2 py-2 font-semibold ${usageTone}`}>
                              {row.riskLimit > 0 ? `%${usagePercent}` : "-"}
                            </td>
                            <td className="px-2 py-2">{row.phone || "-"}</td>
                            <td className="px-2 py-2">{row.email || "-"}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1 text-sm text-[color:var(--mx-text-muted)]">
                  <p>
                    Seçili Cari:{" "}
                    <span className="font-semibold text-[color:var(--mx-text)]">
                      {selectedCariCustomer ? `${selectedCariCustomer.code} - ${selectedCariCustomer.name}` : "Yok"}
                    </span>
                  </p>
                  {selectedCariCustomer && selectedCariRisk ? (
                    <p
                      className={`text-xs font-semibold ${
                        selectedCariRisk.willExceedLimit
                          ? "text-rose-700"
                          : selectedCariRisk.willReachWarning
                            ? "text-amber-700"
                            : "text-emerald-700"
                      }`}
                    >
                      Mevcut bakiye: {formatTry(selectedCariCustomer.currentBalance)} | Satış sonrası: {formatTry(selectedCariRisk.projectedBalance)}
                      {selectedCariCustomer.riskLimit > 0
                        ? ` | Limit: ${formatTry(selectedCariCustomer.riskLimit)} | Kullanım: %${Math.round(selectedCariRisk.projectedUsageRate * 100)}`
                        : " | Risk limiti: Sınırsız"}
                      {selectedCariCustomer.maturityDays > 0 ? ` | Vade: ${selectedCariCustomer.maturityDays} gün` : ""}
                    </p>
                  ) : null}
                  {selectedCariBlockedByRisk ? (
                    <p className="text-xs font-semibold text-rose-700">Bu satış risk limitini aştığı için tamamlanamaz.</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={() => setShowCariCustomerModal(false)}>
                    İptal
                  </Button>
                  <Button onClick={() => void submitCariSaleWithSelectedCustomer()} disabled={busy || !selectedCariCustomer || selectedCariBlockedByRisk}>
                    Cari Satışı Tamamla
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <PosMixedPaymentModal
        open={showMixedPaymentModal}
        totalAmount={totals.grandTotal}
        rows={mixedPaymentRows}
        busy={busy}
        onClose={() => setShowMixedPaymentModal(false)}
        onAddRow={addMixedPaymentRow}
        onRemoveRow={removeMixedPaymentRow}
        onChangeRow={updateMixedPaymentRow}
        onSubmit={() => void completeMixedPaymentSale()}
        onApplyCashExact={applyCashExactMixedPayment}
        onApplyCardExact={applyCardExactMixedPayment}
      />

      <PosCameraScannerModal
        open={showCameraScanner}
        busy={cameraBusy}
        torchEnabled={torchEnabled}
        videoRef={cameraVideoRef}
        onClose={() => {
          setShowCameraScanner(false);
          stopCameraScanner();
        }}
        onToggleTorch={() => void toggleCameraTorch()}
      />

      <PosMobileActionBar
        onSearchFocus={() => searchInputRef.current?.focus()}
        onCameraScan={openCameraScanner}
        onCashSale={() => void submitSale({ paymentMethod: "nakit", amount: totals.grandTotal, modeLabel: "Nakit satış" })}
        onCardSale={() => void submitSale({ paymentMethod: "kart", amount: totals.grandTotal, modeLabel: "POS satış" })}
        onMixedPayment={openMixedPaymentModal}
        busy={busy}
      />
    </div>
  );
}
