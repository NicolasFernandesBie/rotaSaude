"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const icons: Record<string, React.ReactNode> = {
  agora: (
    <path d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />
  ),
  pessoas: (
    <path d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
  ),
  viagens: (
    <path d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h.375c.621 0 1.125-.504 1.125-1.125V11.25m0 0h-4.125c-.621 0-1.125-.504-1.125-1.125V6h6v4.125c0 .621-.504 1.125-1.125 1.125h-2.25c-.621 0-1.125-.504-1.125-1.125V6M3.75 6h-.75" />
  ),
};

const nav = [
  { href: "/", label: "Agora", icon: "agora" },
  { href: "/pacientes", label: "Pessoas", icon: "pessoas" },
  { href: "/transportes", label: "Viagens", icon: "viagens" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-900">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-sm font-bold text-white">
          RS
        </span>
        <div>
          <p className="text-sm font-semibold text-white">Rota Saúde</p>
          <p className="text-[11px] text-slate-400">Transporte de pacientes</p>
        </div>
      </div>

      <div className="px-3">
        <Link
          href="/novo"
          className="flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-teal-500"
        >
          + Novo atendimento
        </Link>
      </div>

      <nav className="mt-4 flex-1 space-y-1 px-3">
        {nav.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-teal-600/15 text-teal-300"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <svg
                className="h-5 w-5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.7}
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {icons[item.icon]}
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-slate-800 px-3 py-3 text-xs">
        <Link
          href="/notificacoes"
          className={`block rounded-md px-3 py-1.5 ${
            pathname.startsWith("/notificacoes")
              ? "text-teal-300"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Mensagens enviadas
        </Link>
        <Link
          href="/configuracoes"
          className={`block rounded-md px-3 py-1.5 ${
            pathname.startsWith("/configuracoes")
              ? "text-teal-300"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Configurações
        </Link>
      </div>
    </aside>
  );
}
