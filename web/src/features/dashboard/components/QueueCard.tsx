import Link from "next/link";
import { Badge, Button, Card, Empty } from "@/components/ui";
import { daysSince } from "@/lib/format";
import { referralKinds, urgency } from "@/lib/status";
import type { Referral } from "@/features/referrals/types";

export function QueueCard({
  queue,
  busyId,
  onReserve,
}: {
  queue: Referral[];
  busyId: string | null;
  onReserve: (referral: Referral) => void;
}) {
  return (
    <Card className="overflow-hidden lg:col-span-2">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Fila de espera ({queue.length})
        </h2>
        <Link href="/encaminhamentos" className="text-xs font-medium text-teal-700 hover:underline">
          Ver fila completa
        </Link>
      </div>
      {queue.length === 0 ? (
        <div className="p-5">
          <Empty title="Ninguém na fila" hint="Cadastre um atendimento para montar a próxima viagem.">
            <Link href="/novo">
              <Button size="sm">+ Novo atendimento</Button>
            </Link>
          </Empty>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {queue.slice(0, 6).map((r, index) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/encaminhamentos/${r.id}`}
                    className="text-sm font-semibold text-slate-900 hover:text-teal-700"
                  >
                    {r.patient?.name}
                  </Link>
                  <Badge className={urgency[r.urgency]?.badge}>{urgency[r.urgency]?.label}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {referralKinds[r.kind]}
                  {r.specialty ? ` de ${r.specialty}` : ""} em {r.destinationCity} · esperando há{" "}
                  {daysSince(r.queueSince)} dia(s)
                </p>
              </div>
              <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-600 sm:inline">
                {Math.round(r.score ?? 0)} pts
              </span>
              <Button
                size="sm"
                disabled={busyId === r.id}
                onClick={() => onReserve(r)}
                title={r.seat ? undefined : "Reserva a próxima viagem com vaga para o destino"}
              >
                {busyId === r.id ? "Dando vaga..." : "Dar vaga"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
