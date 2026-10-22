export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
            value === opt.key
              ? "bg-teal-700 text-white"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          {opt.label}
          {opt.count !== undefined ? (
            <span className="ml-1.5 tabular-nums opacity-70">{opt.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
