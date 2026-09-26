"use client";

import { useState } from "react";
import { LoaderCircle, X } from "lucide-react";

type ActionConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

export default function ActionConfirmDialog({
  title,
  description,
  confirmLabel,
  destructive = false,
  onCancel,
  onConfirm,
}: ActionConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onCancel();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-[#172231]/35 p-4"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && !busy && onCancel()}
    >
      <section
        aria-labelledby="action-confirm-title"
        aria-modal="true"
        className="grid w-[min(100%,420px)] gap-5 rounded-2xl border border-white bg-white p-6 shadow-[0_24px_70px_rgba(31,50,72,0.25)]"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="action-confirm-title" className="m-0 text-lg font-semibold text-[#1c2c41]">
              {title}
            </h2>
            <p className="mb-0 text-sm leading-6 text-[#71839a]">{description}</p>
          </div>
          <button
            type="button"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-0 bg-[#f3f6f9] text-[#64778e] disabled:opacity-50"
            aria-label="Close confirmation"
            disabled={busy}
            onClick={onCancel}
          >
            <X size={17} />
          </button>
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="min-h-10 rounded-full border border-[#dfe8f1] bg-white px-4 text-sm font-semibold text-[#536780] disabled:opacity-60"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full border-0 px-4 text-sm font-semibold text-white disabled:opacity-60 ${
              destructive ? "bg-[#b74a4a]" : "bg-[#172231]"
            }`}
            disabled={busy}
            onClick={() => void confirm()}
          >
            {busy && <LoaderCircle className="animate-spin" size={15} />}
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
