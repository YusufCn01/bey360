"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type LabelElementType =
  | "productCode"
  | "productName"
  | "barcode"
  | "companyName"
  | "discountPrice"
  | "special1"
  | "special2"
  | "special3"
  | "special4"
  | "date"
  | "expiryDate"
  | "salePrice1"
  | "salePrice2"
  | "salePrice3"
  | "salePrice4"
  | "scaleBarcode"
  | "scaleWeight"
  | "scaleUnitPrice"
  | "custom";

type LabelElement = {
  id: string;
  type: LabelElementType;
  label: string;
  x: number;
  y: number;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: "left" | "center" | "right";
  color: string;
  rotate: number;
};

type LabelDesign = {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  wrapMode: "single" | "side-by-side";
  elements: LabelElement[];
  createdAt: string;
};

type Envelope<T> = {
  success: boolean;
  data?: T;
  error?: { message?: string };
};

const defaultPalette: Array<{ type: LabelElementType; label: string }> = [
  { type: "productCode", label: "Ürün Kodu" },
  { type: "productName", label: "Ürün Adı" },
  { type: "barcode", label: "Barkod" },
  { type: "companyName", label: "Firma Adı" },
  { type: "discountPrice", label: "İndirimli Fiyat" },
  { type: "special1", label: "Özel Kod 1" },
  { type: "special2", label: "Özel Kod 2" },
  { type: "special3", label: "Özel Kod 3" },
  { type: "special4", label: "Özel Kod 4" },
  { type: "date", label: "Tarih" },
  { type: "expiryDate", label: "Son Kullanım" },
  { type: "salePrice1", label: "Satış Fiyat 1" },
  { type: "salePrice2", label: "Satış Fiyat 2" },
  { type: "salePrice3", label: "Satış Fiyat 3" },
  { type: "salePrice4", label: "Satış Fiyat 4" },
  { type: "scaleBarcode", label: "Terazi Barkodu" },
  { type: "scaleWeight", label: "Terazi Gramaj" },
  { type: "scaleUnitPrice", label: "Birim Fiyat" },
];

const scopeCode = "urun_etiket_tasarimlari";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const body = (await response.json()) as Envelope<T>;
  if (!response.ok || !body.success) {
    throw new Error(body.error?.message ?? "İşlem başarısız.");
  }
  return body.data as T;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

async function loadDesigns(): Promise<LabelDesign[]> {
  const result = await request<{ payload?: Record<string, unknown> }>(`/api/tenant/settings?scope=${scopeCode}`);
  const payload = asRecord(result.payload);
  const items = Array.isArray(payload.items) ? payload.items : [];

  return items.map((item) => {
    const row = asRecord(item);
    const elementsRaw = Array.isArray(row.elements) ? row.elements : [];

    return {
      id: asText(row.id, crypto.randomUUID()),
      name: asText(row.name, "Etiket Tasarımı"),
      widthMm: asNumber(row.widthMm, 60),
      heightMm: asNumber(row.heightMm, 40),
      wrapMode: asText(row.wrapMode, "single") === "side-by-side" ? "side-by-side" : "single",
      createdAt: asText(row.createdAt, new Date().toISOString()),
      elements: elementsRaw.map((raw, index) => {
        const cell = asRecord(raw);
        return {
          id: asText(cell.id, `el-${index + 1}`),
          type: asText(cell.type, "custom") as LabelElementType,
          label: asText(cell.label, "Öğe"),
          x: asNumber(cell.x, 4),
          y: asNumber(cell.y, 4),
          fontFamily: asText(cell.fontFamily, "Arial"),
          fontSize: asNumber(cell.fontSize, 12),
          bold: Boolean(cell.bold),
          italic: Boolean(cell.italic),
          underline: Boolean(cell.underline),
          align: asText(cell.align, "left") as "left" | "center" | "right",
          color: asText(cell.color, "#111111"),
          rotate: asNumber(cell.rotate, 0),
        } satisfies LabelElement;
      }),
    } satisfies LabelDesign;
  });
}

async function saveDesigns(items: LabelDesign[]) {
  await request("/api/tenant/settings", {
    method: "POST",
    body: JSON.stringify({
      scope: scopeCode,
      payload: { items },
    }),
  });
}

function Notice({ error, message }: { error: string | null; message: string | null }) {
  return (
    <>
      {message ? (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
      ) : null}
      {error ? <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
    </>
  );
}

export function LabelDesignerFeature() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const [designs, setDesigns] = React.useState<LabelDesign[]>([]);
  const [name, setName] = React.useState("");
  const [widthMm, setWidthMm] = React.useState("60");
  const [heightMm, setHeightMm] = React.useState("40");
  const [wrapMode, setWrapMode] = React.useState<"single" | "side-by-side">("single");
  const [elements, setElements] = React.useState<LabelElement[]>([]);
  const [selectedId, setSelectedId] = React.useState<string>("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [showList, setShowList] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [snapToGrid, setSnapToGrid] = React.useState(true);
  const [gridSizeMm, setGridSizeMm] = React.useState("1");
  const [draggingElementId, setDraggingElementId] = React.useState<string | null>(null);

  const scale = 6;
  const canvasRef = React.useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = React.useRef<{ x: number; y: number } | null>(null);

  const loadDesign = React.useCallback(
    (item: LabelDesign, updateUrl = true) => {
      setEditingId(item.id);
      setName(item.name);
      setWidthMm(String(item.widthMm));
      setHeightMm(String(item.heightMm));
      setWrapMode(item.wrapMode);
      setElements(item.elements);
      const firstId = item.elements[0]?.id ?? "";
      setSelectedId(firstId);
      setSelectedIds(firstId ? [firstId] : []);
      setShowList(false);
      if (updateUrl) {
        router.replace(`/panel/urunler/yeni-etiket-dizayni?edit=${item.id}`);
      }
    },
    [router],
  );

  React.useEffect(() => {
    async function run() {
      try {
        const rows = await loadDesigns();
        setDesigns(rows);

        if (editId) {
          const found = rows.find((item) => item.id === editId);
          if (found) {
            loadDesign(found, false);
          }
        }
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Etiket tasarımları yüklenemedi.");
      }
    }

    void run();
  }, [editId, loadDesign]);

  const selected = elements.find((item) => item.id === selectedId) ?? null;
  const selectedElementIds = React.useMemo(
    () => (selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : []),
    [selectedId, selectedIds],
  );
  const selectedElements = React.useMemo(
    () => elements.filter((item) => selectedElementIds.includes(item.id)),
    [elements, selectedElementIds],
  );
  const widthMmValue = asNumber(widthMm, 60);
  const heightMmValue = asNumber(heightMm, 40);
  const gridStepMm = Math.max(0.2, asNumber(gridSizeMm, 1));

  React.useEffect(() => {
    const available = new Set(elements.map((item) => item.id));
    setSelectedIds((prev) => prev.filter((id) => available.has(id)));
    if (selectedId && !available.has(selectedId)) {
      const fallback = elements[0]?.id ?? "";
      setSelectedId(fallback);
      setSelectedIds(fallback ? [fallback] : []);
    }
  }, [elements, selectedId]);

  const updateElementPosition = React.useCallback(
    (id: string, rawX: number, rawY: number) => {
      const maxX = Math.max(0, widthMmValue - 1);
      const maxY = Math.max(0, heightMmValue - 1);
      const nextX = Math.max(0, Math.min(rawX, maxX));
      const nextY = Math.max(0, Math.min(rawY, maxY));

      const x = snapToGrid ? Math.round(nextX / gridStepMm) * gridStepMm : nextX;
      const y = snapToGrid ? Math.round(nextY / gridStepMm) * gridStepMm : nextY;

      setElements((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                x: Math.max(0, Math.min(x, maxX)),
                y: Math.max(0, Math.min(y, maxY)),
              }
            : item,
        ),
      );
    },
    [gridStepMm, heightMmValue, snapToGrid, widthMmValue],
  );

  function selectElement(id: string, options?: { multi?: boolean; additive?: boolean }) {
    if (options?.multi) {
      setSelectedIds((prev) => {
        if (prev.includes(id)) {
          const next = prev.filter((cell) => cell !== id);
          if (selectedId === id) {
            setSelectedId(next[0] ?? "");
          }
          return next;
        }
        const next = [...prev, id];
        setSelectedId(id);
        return next;
      });
      return;
    }

    if (options?.additive) {
      setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setSelectedId(id);
      return;
    }

    setSelectedId(id);
    setSelectedIds(id ? [id] : []);
  }

  function startDrag(event: React.PointerEvent<HTMLButtonElement>, item: LabelElement) {
    if (!canvasRef.current) {
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;

    dragOffsetRef.current = {
      x: pointerX - item.x * scale,
      y: pointerY - item.y * scale,
    };

    setDraggingElementId(item.id);
    selectElement(item.id, {
      multi: event.metaKey || event.ctrlKey,
      additive: event.shiftKey,
    });
    event.preventDefault();
  }

  React.useEffect(() => {
    if (!draggingElementId) {
      return;
    }
    const activeId = draggingElementId;

    function onPointerMove(event: PointerEvent) {
      if (!canvasRef.current || !dragOffsetRef.current) {
        return;
      }

      const rect = canvasRef.current.getBoundingClientRect();
      const xPx = event.clientX - rect.left - dragOffsetRef.current.x;
      const yPx = event.clientY - rect.top - dragOffsetRef.current.y;
      updateElementPosition(activeId, xPx / scale, yPx / scale);
    }

    function onPointerUp() {
      setDraggingElementId(null);
      dragOffsetRef.current = null;
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [draggingElementId, updateElementPosition]);

  function addElement(type: LabelElementType, label: string) {
    const next: LabelElement = {
      id: crypto.randomUUID(),
      type,
      label,
      x: 6,
      y: 6 + elements.length * 4,
      fontFamily: "Arial",
      fontSize: 12,
      bold: true,
      italic: false,
      underline: false,
      align: "left",
      color: "#113327",
      rotate: 0,
    };
    setElements((prev) => [...prev, next]);
    setSelectedId(next.id);
    setSelectedIds([next.id]);
  }

  function patchSelected(patch: Partial<LabelElement>) {
    const targets = selectedElementIds;
    if (targets.length === 0) {
      return;
    }
    setElements((prev) => prev.map((item) => (targets.includes(item.id) ? { ...item, ...patch } : item)));
  }

  function clearDesign() {
    setEditingId(null);
    setName("");
    setWidthMm("60");
    setHeightMm("40");
    setWrapMode("single");
    setElements([]);
    setSelectedId("");
    setSelectedIds([]);
    setShowList(false);
    setMessage("Tasarım temizlendi.");
    setError(null);
    router.replace("/panel/urunler/yeni-etiket-dizayni");
  }

  function duplicateSelected() {
    if (selectedElements.length === 0) {
      setError("Kopyalama için en az bir eleman seçin.");
      return;
    }

    const maxX = Math.max(0, widthMmValue - 1);
    const maxY = Math.max(0, heightMmValue - 1);
    const clones = selectedElements.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
      x: Math.min(maxX, item.x + 2),
      y: Math.min(maxY, item.y + 2),
    }));

    setElements((prev) => [...prev, ...clones]);
    setSelectedId(clones[0]?.id ?? "");
    setSelectedIds(clones.map((item) => item.id));
    setMessage(`${clones.length} eleman kopyalandı.`);
    setError(null);
  }

  function alignSelected(axis: "x" | "y", mode: "start" | "center" | "end") {
    if (selectedElements.length < 2) {
      setError("Hizalama için en az 2 eleman seçin.");
      return;
    }

    const values = selectedElements.map((item) => (axis === "x" ? item.x : item.y));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const target =
      mode === "start"
        ? min
        : mode === "end"
          ? max
          : Math.round((((min + max) / 2) * 100)) / 100;

    const maxAxis = axis === "x" ? Math.max(0, widthMmValue - 1) : Math.max(0, heightMmValue - 1);
    setElements((prev) =>
      prev.map((item) =>
        selectedElementIds.includes(item.id)
          ? axis === "x"
            ? { ...item, x: Math.max(0, Math.min(target, maxAxis)) }
            : { ...item, y: Math.max(0, Math.min(target, maxAxis)) }
          : item,
      ),
    );
    setMessage("Seçili elemanlar hizalandı.");
    setError(null);
  }

  async function saveCurrent() {
    const targetId = editingId ?? crypto.randomUUID();
    const previous = designs.find((item) => item.id === targetId);
    const next: LabelDesign = {
      id: targetId,
      name: name || `Etiket ${designs.length + 1}`,
      widthMm: asNumber(widthMm, 60),
      heightMm: asNumber(heightMm, 40),
      wrapMode,
      elements,
      createdAt: previous?.createdAt ?? new Date().toISOString(),
    };

    const merged = [next, ...designs.filter((item) => item.id !== targetId)];

    try {
      await saveDesigns(merged);
      setDesigns(merged);
      setEditingId(targetId);
      setMessage(editingId ? "Etiket tasarımı güncellendi." : "Etiket tasarımı kaydedildi.");
      setError(null);
      router.replace(`/panel/urunler/yeni-etiket-dizayni?edit=${targetId}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Tasarım kaydedilemedi.");
    }
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle>Yeni Etiket Dizaynı - Studio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 lg:grid-cols-[1fr_1fr_1fr_auto_auto]">
            <input value={widthMm} onChange={(event) => setWidthMm(event.target.value)} placeholder="Genişlik (mm)" />
            <input value={heightMm} onChange={(event) => setHeightMm(event.target.value)} placeholder="Yükseklik (mm)" />
            <select value={wrapMode} onChange={(event) => setWrapMode(event.target.value as "single" | "side-by-side") }>
              <option value="single">Tekli etiket</option>
              <option value="side-by-side">Sarım (yan yana)</option>
            </select>
            <Button onClick={() => setMessage("Tasarım ölçüleri uygulandı.")}>Tasarıma Uygula</Button>
            <Button variant="secondary" onClick={() => setShowList((prev) => !prev)}>
              Liste
            </Button>
          </div>

          <div className="rounded-md border border-[color:var(--mx-border)] p-3">
            <p className="mb-2 text-sm font-semibold">Etiket Elemanları</p>
            <div className="flex flex-wrap gap-2">
              {defaultPalette.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => addElement(item.type, item.label)}
                  className="rounded-md bg-[color:var(--mx-brand-700)] px-3 py-2 text-xs font-semibold text-white"
                >
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => addElement("custom", `Özel Eleman ${elements.length + 1}`)}
                className="rounded-md border-2 border-dashed border-orange-400 bg-orange-100 px-3 py-2 text-xs font-bold text-orange-700"
              >
                + Özel Eleman
              </button>
            </div>
          </div>

          <div className="rounded-md border border-[color:var(--mx-border)] p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <input
                value={selected?.fontFamily ?? "Arial"}
                onChange={(event) => patchSelected({ fontFamily: event.target.value })}
                className="w-32"
                placeholder="Font"
              />
              <input
                value={String(selected?.fontSize ?? 12)}
                onChange={(event) => patchSelected({ fontSize: asNumber(event.target.value, 12) })}
                className="w-20"
                placeholder="Boyut"
              />
              <Button size="sm" variant="secondary" onClick={() => patchSelected({ bold: !selected?.bold })}>B</Button>
              <Button size="sm" variant="secondary" onClick={() => patchSelected({ italic: !selected?.italic })}>I</Button>
              <Button size="sm" variant="secondary" onClick={() => patchSelected({ underline: !selected?.underline })}>U</Button>
              <Button size="sm" variant="secondary" onClick={() => patchSelected({ x: Math.max(0, (selected?.x ?? 0) - 1) })}>&lt;</Button>
              <Button size="sm" variant="secondary" onClick={() => patchSelected({ x: (selected?.x ?? 0) + 1 })}>&gt;</Button>
              <Button size="sm" variant="secondary" onClick={() => patchSelected({ y: Math.max(0, (selected?.y ?? 0) - 1) })}>^</Button>
              <Button size="sm" variant="secondary" onClick={() => patchSelected({ y: (selected?.y ?? 0) + 1 })}>v</Button>
              <Button size="sm" variant="secondary" onClick={duplicateSelected}>Kopyala</Button>
              <Button size="sm" variant="secondary" onClick={() => alignSelected("x", "start")}>Sola</Button>
              <Button size="sm" variant="secondary" onClick={() => alignSelected("x", "center")}>X-Orta</Button>
              <Button size="sm" variant="secondary" onClick={() => alignSelected("x", "end")}>Sağa</Button>
              <Button size="sm" variant="secondary" onClick={() => alignSelected("y", "start")}>Üste</Button>
              <Button size="sm" variant="secondary" onClick={() => alignSelected("y", "center")}>Y-Orta</Button>
              <Button size="sm" variant="secondary" onClick={() => alignSelected("y", "end")}>Alta</Button>
              <Button size="sm" variant="secondary" onClick={() => { setSelectedIds(elements.map((item) => item.id)); setSelectedId(elements[0]?.id ?? ""); }}>Tümünü Seç</Button>
              <Button size="sm" variant="secondary" onClick={() => { setSelectedIds([]); setSelectedId(""); }}>Seçimi Temizle</Button>
              <input
                type="color"
                value={selected?.color ?? "#111111"}
                onChange={(event) => patchSelected({ color: event.target.value })}
                className="h-8 w-12"
              />
              <input
                value={String(selected?.rotate ?? 0)}
                onChange={(event) => patchSelected({ rotate: asNumber(event.target.value, 0) })}
                className="w-16"
                placeholder="0°"
              />
              <label className="inline-flex items-center gap-2 rounded-md border border-[color:var(--mx-border)] px-2 py-1 text-xs font-semibold">
                <input type="checkbox" className="h-4 w-4" checked={snapToGrid} onChange={(event) => setSnapToGrid(event.target.checked)} />
                Snap
              </label>
              <input value={gridSizeMm} onChange={(event) => setGridSizeMm(event.target.value)} className="w-20" placeholder="Grid mm" />
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  const targets = selectedElementIds;
                  if (targets.length === 0) {
                    return;
                  }
                  setElements((prev) => prev.filter((item) => !targets.includes(item.id)));
                  setSelectedId("");
                  setSelectedIds([]);
                }}
              >
                Sil
              </Button>
              <span className="text-xs text-[color:var(--mx-text-muted)]">
                {snapToGrid ? `Grid: ${gridStepMm} mm` : "Serbest taşıma"} | Seçili: {selectedElementIds.length}
              </span>
            </div>
          </div>

          <div className="rounded-md border border-[color:var(--mx-border)] p-3">
            <div className="mb-2 flex gap-6 text-sm font-semibold text-[color:var(--mx-text-muted)]">
              <span>0</span>
              <span>10</span>
              <span>20</span>
              <span>30</span>
              <span>40</span>
              <span>50</span>
              <span>60</span>
            </div>
            <p className="mb-2 text-xs text-[color:var(--mx-text-muted)]">
              Çoklu seçim: Ctrl/Cmd tıklama. Toplu hizalama ve kopyalama üst araç çubuğundan yapılır.
            </p>
            <div className="relative overflow-auto bg-[color:var(--mx-surface-soft)] p-4">
              <div
                ref={canvasRef}
                className="relative border border-[color:var(--mx-border)] bg-white shadow-sm"
                style={{
                  width: widthMmValue * scale,
                  height: heightMmValue * scale,
                  backgroundImage:
                    "linear-gradient(to right, rgba(31,60,47,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(31,60,47,0.12) 1px, transparent 1px)",
                  backgroundSize: `${gridStepMm * scale}px ${gridStepMm * scale}px`,
                }}
              >
                {elements.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={(event) =>
                      selectElement(item.id, {
                        multi: event.metaKey || event.ctrlKey,
                        additive: event.shiftKey,
                      })
                    }
                    onPointerDown={(event) => startDrag(event, item)}
                    className={`absolute rounded-sm px-1 text-left ${selectedElementIds.includes(item.id) ? "ring-2 ring-orange-400" : ""} ${selectedId === item.id ? "bg-orange-50/50" : ""}`}
                    style={{
                      left: item.x * scale,
                      top: item.y * scale,
                      fontFamily: item.fontFamily,
                      fontSize: item.fontSize,
                      fontWeight: item.bold ? 700 : 400,
                      fontStyle: item.italic ? "italic" : "normal",
                      textDecoration: item.underline ? "underline" : "none",
                      textAlign: item.align,
                      color: item.color,
                      transform: `rotate(${item.rotate}deg)`,
                      cursor: draggingElementId === item.id ? "grabbing" : "grab",
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Dizayn Adı" />
          <Notice error={error} message={message} />
          <div className="grid gap-2 md:grid-cols-2">
            <Button variant="secondary" onClick={clearDesign}>
              İptal
            </Button>
            <Button onClick={() => void saveCurrent()}>{editingId ? "Güncelle" : "Kaydet"}</Button>
          </div>
        </CardContent>
      </Card>

      {showList ? (
        <Card>
          <CardHeader>
            <CardTitle>Kayıtlı Tasarımlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {designs.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-md border border-[color:var(--mx-border)] px-3 py-2">
                <div>
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-[color:var(--mx-text-muted)]">
                    {item.widthMm}x{item.heightMm} mm - {item.wrapMode}
                  </p>
                </div>
                <Button size="sm" onClick={() => loadDesign(item)}>
                  Yükle
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export function LabelDesignListFeature() {
  const router = useRouter();
  const [designs, setDesigns] = React.useState<LabelDesign[]>([]);
  const [searchText, setSearchText] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function run() {
      try {
        setDesigns(await loadDesigns());
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Tasarımlar yüklenemedi.");
      }
    }
    void run();
  }, []);

  const filteredDesigns = React.useMemo(() => {
    const normalized = searchText.trim().toLocaleLowerCase("tr-TR");
    const sorted = [...designs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (!normalized) {
      return sorted;
    }
    return sorted.filter((item) => {
      const target = `${item.name} ${item.widthMm}x${item.heightMm} ${item.wrapMode}`.toLocaleLowerCase("tr-TR");
      return target.includes(normalized);
    });
  }, [designs, searchText]);

  async function remove(id: string) {
    try {
      const next = designs.filter((item) => item.id !== id);
      await saveDesigns(next);
      setDesigns(next);
      setMessage("Tasarım silindi.");
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Silme işlemi başarısız.");
    }
  }

  async function duplicate(item: LabelDesign) {
    try {
      const now = new Date().toISOString();
      const copy: LabelDesign = {
        ...item,
        id: crypto.randomUUID(),
        name: `${item.name} (Kopya)`,
        createdAt: now,
        elements: item.elements.map((cell) => ({
          ...cell,
          id: crypto.randomUUID(),
        })),
      };

      const next = [copy, ...designs];
      await saveDesigns(next);
      setDesigns(next);
      setMessage("Tasarım kopyalandı.");
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Kopyalama işlemi başarısız.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Etiket Dizaynları</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Notice error={error} message={message} />
        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Dizayn adı veya ölçü ara"
          />
          <div className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-2 text-sm font-semibold">
            Kayıt: {filteredDesigns.length}
          </div>
        </div>

        {filteredDesigns.length === 0 ? (
          <p className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-5 text-center text-sm text-[color:var(--mx-text-muted)]">
            Kriterinize uygun tasarım bulunamadı.
          </p>
        ) : (
          filteredDesigns.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-md border border-[color:var(--mx-border)] px-3 py-2">
              <div>
                <p className="text-sm font-semibold">{item.name}</p>
                <p className="text-xs text-[color:var(--mx-text-muted)]">
                  {item.widthMm}x{item.heightMm} mm, {item.elements.length} eleman
                </p>
                <p className="text-[11px] text-[color:var(--mx-text-muted)]">
                  Oluşturma: {new Date(item.createdAt).toLocaleString("tr-TR")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => router.push(`/panel/urunler/yeni-etiket-dizayni?edit=${item.id}`)}>
                  Düzenle
                </Button>
                <Button size="sm" onClick={() => void duplicate(item)}>
                  Kopyala
                </Button>
                <Button variant="danger" size="sm" onClick={() => void remove(item.id)}>
                  Sil
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
