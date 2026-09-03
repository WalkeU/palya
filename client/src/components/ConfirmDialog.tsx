import { useEscapeToClose } from "../hooks/useEscapeToClose";

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Megerősítés",
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEscapeToClose(onCancel);

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-night/30 animate-fade-in"
        onClick={onCancel}
      />
      <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
        <div className="w-full max-w-sm animate-rise-in rounded-2xl border border-ink-100 bg-surface p-6 shadow-panel">
          <h2 className="mb-2 font-display text-lg font-medium text-ink-950">{title}</h2>
          <p className="mb-5 text-sm text-ink-500">{message}</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-ink-500 transition hover:text-ink-900"
            >
              Mégse
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white transition"
              style={{ backgroundColor: danger ? "#c85a4a" : "rgb(var(--night))" }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
