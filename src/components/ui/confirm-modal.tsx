import { Button } from "@/components/ui/button";

export type ConfirmModalTone = "info" | "danger";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmModalTone;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Onayla",
  cancelLabel = "Vazgeç",
  tone = "info",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/65 p-3">
      <div className="w-full max-w-md rounded-xl border border-[color:var(--mx-border)] bg-[color:var(--mx-surface)] p-4 shadow-2xl">
        <div className="mb-3">
          <p className="text-base font-bold">{title}</p>
          <p className="mt-1 text-sm text-[color:var(--mx-text-muted)]">{description}</p>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "default"} onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
