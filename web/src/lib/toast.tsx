"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type ToastItem = {
  id: number;
  message: string;
  type?: "success" | "error";
  action?: { label: string; href: string };
};

let counter = 0;
let listeners: Array<(toast: ToastItem) => void> = [];

export function showToast(toast: Omit<ToastItem, "id">) {
  const item = { ...toast, id: ++counter };
  listeners.forEach((listener) => listener(item));
}

export function ToastHost() {
  const [toast, setToast] = useState<ToastItem | null>(null);

  useEffect(() => {
    const listener = (item: ToastItem) => setToast(item);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <div className="fixed inset-x-0 bottom-16 z-50 flex justify-center px-4 md:bottom-6">
      <div
        className={`flex w-full max-w-lg items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${
          toast.type === "error"
            ? "border-rose-200 bg-rose-50 text-rose-800"
            : "border-emerald-200 bg-emerald-50 text-emerald-900"
        }`}
      >
        <span className="text-sm font-medium">{toast.message}</span>
        {toast.action ? (
          <Link
            href={toast.action.href}
            className="ml-auto shrink-0 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-teal-700 shadow-sm ring-1 ring-teal-200"
            onClick={() => setToast(null)}
          >
            {toast.action.label}
          </Link>
        ) : null}
        <button
          onClick={() => setToast(null)}
          className={`${toast.action ? "" : "ml-auto"} shrink-0 text-xs opacity-60 hover:opacity-100`}
          aria-label="Fechar aviso"
        >
          fechar
        </button>
      </div>
    </div>
  );
}
