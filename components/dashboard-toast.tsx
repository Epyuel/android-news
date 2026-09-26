"use client";

import { CircleAlert, CircleCheck, X } from "lucide-react";

type DashboardToastProps = {
  message: string;
  tone: "success" | "error";
  onDismiss: () => void;
};

export default function DashboardToast({ message, tone, onDismiss }: DashboardToastProps) {
  const success = tone === "success";

  return (
    <div
      className={`fixed right-4 bottom-4 left-4 z-[80] flex items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-[0_12px_30px_rgba(23,34,49,0.12)] md:right-8 md:bottom-8 md:left-auto md:max-w-[420px] ${
        success
          ? "border-[#c9ead5] bg-[#eaf7ef] text-[#28633d]"
          : "border-[#f2cccc] bg-[#fff0f0] text-[#963e3e]"
      }`}
      role={success ? "status" : "alert"}
      aria-live={success ? "polite" : "assertive"}
    >
      {success ? <CircleCheck className="shrink-0" size={18} /> : <CircleAlert className="shrink-0" size={18} />}
      <p className="m-0 min-w-0 flex-1">{message}</p>
      <button
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-0 bg-transparent text-current hover:bg-black/5"
        aria-label="Dismiss message"
        onClick={onDismiss}
      >
        <X size={15} />
      </button>
    </div>
  );
}
