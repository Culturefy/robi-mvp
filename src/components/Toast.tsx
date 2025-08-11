"use client";

import React from "react";

export type ToastItem = {
  id: string;
  type?: "success" | "error" | "info";
  message: string;
};

type Props = {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
};

export default function ToastHost({ toasts, onDismiss }: Props) {
  return (
    <div className="fixed top-4 right-4 z-[60] space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`min-w-[280px] max-w-[360px] rounded-lg shadow-lg px-4 py-3 text-sm text-white flex items-start gap-3 ${
            t.type === "error"
              ? "bg-red-600"
              : t.type === "success"
              ? "bg-green-600"
              : "bg-gray-800"
          }`}
          role="status"
          aria-live="polite"
        >
          <span className="mt-0.5">{t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="ml-auto opacity-80 hover:opacity-100"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

