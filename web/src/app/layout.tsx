import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { ToastHost } from "@/lib/toast";

export const metadata: Metadata = {
  title: "Rota Saúde | Transporte de pacientes",
  description:
    "Controle simples de encaminhamentos e transporte sanitário de pacientes (TFD)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen text-slate-900 antialiased">
        <div className="flex min-h-screen">
          <div className="sticky top-0 hidden h-screen md:block">
            <Sidebar />
          </div>
          <div className="min-w-0 flex-1">
            <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
              <span className="text-sm font-semibold">Rota Saúde</span>
              <Link
                href="/novo"
                className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white"
              >
                + Novo atendimento
              </Link>
            </header>
            <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 md:px-8 md:pb-10 md:pt-8">
              {children}
            </div>
          </div>
        </div>
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white py-2 md:hidden">
          {[
            ["/", "Agora"],
            ["/pacientes", "Pessoas"],
            ["/novo", "+ Novo"],
            ["/transportes", "Viagens"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="py-1 text-center text-[11px] font-medium text-slate-600">
              {label}
            </Link>
          ))}
        </nav>
        <ToastHost />
      </body>
    </html>
  );
}
