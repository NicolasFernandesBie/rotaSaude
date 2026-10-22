import Link from "next/link";
import { Card } from "@/components/ui";
import { formatTime } from "@/lib/format";
import { notificationStatus } from "@/lib/status";
import type { Notification } from "@/features/notifications/types";

function statusDot(status: string): string {
  if (status === "ENVIADA") return "bg-emerald-500";
  if (status === "FALHA") return "bg-rose-500";
  return "bg-amber-400";
}

export function NotificationsCard({ notifications }: { notifications: Notification[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Mensagens</h2>
        <Link href="/notificacoes" className="text-xs font-medium text-teal-700 hover:underline">
          Ver todas
        </Link>
      </div>
      {notifications.length === 0 ? (
        <div className="p-5">
          <p className="text-sm text-slate-400">Nenhuma mensagem enviada ainda.</p>
          <Link
            href="/notificacoes"
            className="mt-2 inline-block text-xs font-medium text-teal-700 hover:underline"
          >
            Entenda os avisos automáticos
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {notifications.slice(0, 4).map((n) => (
            <li key={n.id} className="flex items-start gap-2.5 px-5 py-3">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${statusDot(n.status)}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-800">{n.patientName}</p>
                <p className="truncate text-[11px] text-slate-500">
                  {n.kindLabel || n.kind} · {notificationStatus[n.status]?.label}
                </p>
              </div>
              <span className="shrink-0 text-[11px] tabular-nums text-slate-400">
                {formatTime(n.sentAt || n.scheduledFor)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
