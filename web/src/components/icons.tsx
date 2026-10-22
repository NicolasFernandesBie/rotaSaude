export function BusIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 17V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11M4 13h16M7 17v2m10-2v2" />
      <circle cx="8" cy="15" r="0.8" fill="currentColor" />
      <circle cx="16" cy="15" r="0.8" fill="currentColor" />
    </svg>
  );
}

export function ChevronIcon({ direction = "right" }: { direction?: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path
        fillRule="evenodd"
        d={
          direction === "left"
            ? "M12.78 4.22a.75.75 0 0 1 0 1.06L9.06 9l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
            : "M7.22 4.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L10.94 9 7.22 5.28a.75.75 0 0 1 0-1.06Z"
        }
        clipRule="evenodd"
      />
    </svg>
  );
}
