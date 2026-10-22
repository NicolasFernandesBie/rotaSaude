import Link from "next/link";

export function Stat({
  label,
  value,
  hint,
  accent = "text-slate-900",
  tone = "bg-slate-50",
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
  tone?: string;
  href?: string;
}) {
  const content = (
    <div className={`h-full rounded-lg p-3 ${tone}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 text-2xl font-semibold tabular-nums ${accent}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );

  if (!href) return content;
  return (
    <Link
      href={href}
      className="block rounded-lg transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
    >
      {content}
    </Link>
  );
}
