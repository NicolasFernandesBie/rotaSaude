import type { ButtonHTMLAttributes, ReactNode } from "react";

const buttonVariants: Record<string, string> = {
  primary:
    "bg-teal-700 text-white hover:bg-teal-800 focus-visible:ring-teal-600 disabled:bg-teal-300",
  secondary:
    "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-400 disabled:opacity-50",
  danger:
    "bg-white text-rose-700 border border-rose-200 hover:bg-rose-50 focus-visible:ring-rose-400 disabled:opacity-50",
  ghost: "text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-300 disabled:opacity-50",
};

const buttonSizes: Record<string, string> = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3.5 py-2 text-sm",
  lg: "px-4 py-2.5 text-sm",
};

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
