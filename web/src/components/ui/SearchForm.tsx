"use client";

import { useState } from "react";

export function SearchForm({
  placeholder,
  initialValue = "",
  onSubmit,
  buttonLabel = "Buscar",
}: {
  placeholder: string;
  initialValue?: string;
  onSubmit: (term: string) => void;
  buttonLabel?: string;
}) {
  const [search, setSearch] = useState(initialValue);

  return (
    <form
      className="mb-4 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(search.trim());
      }}
    >
      <input
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
        placeholder={placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
      >
        {buttonLabel}
      </button>
    </form>
  );
}
