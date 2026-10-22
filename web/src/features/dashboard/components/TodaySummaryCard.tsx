import { Card } from "@/components/ui";
import type { Dashboard } from "../types";
import { Stat } from "./Stat";

export function TodaySummaryCard({ data }: { data: Dashboard }) {
  const faltasTotal = data.absenteism.atendidos30 + data.absenteism.faltas30;

  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Resumo de hoje
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Stat
          label="Na fila"
          value={data.counts.aguardando}
          accent="text-amber-700"
          tone="bg-amber-50"
          href="/encaminhamentos"
        />
        <Stat
          label="Com vaga"
          value={data.counts.confirmado}
          accent="text-sky-700"
          tone="bg-sky-50"
          href="/encaminhamentos"
        />
        <Stat label="Viagens hoje" value={data.tripsToday} tone="bg-slate-50" href="/transportes" />
        <Stat
          label="Faltas 30d"
          value={`${data.absenteism.rate}%`}
          hint={faltasTotal ? `${data.absenteism.faltas30} de ${faltasTotal}` : "sem histórico"}
          accent={data.absenteism.rate > 20 ? "text-rose-600" : "text-emerald-600"}
          tone="bg-slate-50"
        />
      </div>
      <div className="mt-3 rounded-lg border border-slate-100 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
        {data.counts.aguardando > 0
          ? `${data.counts.aguardando} pessoa(s) esperando vaga. Comece pela fila priorizada.`
          : "Fila vazia. Cadastre um atendimento para começar."}
      </div>
    </Card>
  );
}
