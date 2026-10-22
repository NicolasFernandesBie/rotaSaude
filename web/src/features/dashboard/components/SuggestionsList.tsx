import Link from "next/link";
import { Badge, Button } from "@/components/ui";
import { daysSince } from "@/lib/format";
import { referralKinds, urgency } from "@/lib/status";
import type { Suggestion, TripSuggestions } from "@/features/referrals/types";

export function SuggestionsList({
  tripId,
  destinationCity,
  data,
  loading,
  filling,
  addingId,
  onAdd,
  onFill,
}: {
  tripId: string;
  destinationCity: string;
  data: TripSuggestions | null;
  loading: boolean;
  filling: boolean;
  addingId: string | null;
  onAdd: (suggestion: Suggestion) => void;
  onFill: () => void;
}) {
  return (
    <div className="mt-4 border-t border-slate-100 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Sugeridos para esta viagem
        </p>
        <div className="flex items-center gap-2">
          {data && data.freeSeats > 0 && data.suggestions.length > 0 ? (
            <Button size="sm" disabled={filling || addingId !== null} onClick={onFill}>
              {filling ? "Preenchendo..." : "Preencher vagas"}
            </Button>
          ) : null}
          <Link
            href={`/transportes/${tripId}`}
            className="text-xs font-medium text-teal-700 hover:underline"
          >
            Ver na viagem
          </Link>
        </div>
      </div>

      {loading || !data ? (
        <p className="mt-2 text-xs text-slate-400">Buscando sugestões...</p>
      ) : data.freeSeats === 0 ? (
        <p className="mt-2 text-xs text-slate-500">Viagem cheia.</p>
      ) : data.suggestions.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">
          Ninguém na fila para {destinationCity}.{" "}
          <Link href="/novo" className="font-medium text-teal-700 hover:underline">
            Cadastrar novo atendimento
          </Link>
        </p>
      ) : (
        <>
          <ul className="mt-1 divide-y divide-slate-100">
            {data.suggestions.slice(0, 4).map((s, index) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="w-4 shrink-0 text-center text-xs font-bold text-slate-400">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link
                      href={`/encaminhamentos/${s.id}`}
                      className="text-sm font-semibold text-slate-900 hover:text-teal-700"
                    >
                      {s.patient?.name}
                    </Link>
                    <Badge className={urgency[s.urgency]?.badge}>{urgency[s.urgency]?.label}</Badge>
                    {s.patient?.mobility === "CADEIRANTE" ? (
                      <Badge className="bg-indigo-100 text-indigo-800">Cadeirante</Badge>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {referralKinds[s.kind]}
                    {s.specialty ? ` de ${s.specialty}` : ""} · esperando há {daysSince(s.queueSince)}{" "}
                    dia(s) · {s.priority} pts
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={addingId !== null || filling}
                  onClick={() => onAdd(s)}
                >
                  {addingId === s.id ? "Adicionando..." : "Adicionar"}
                </Button>
              </li>
            ))}
          </ul>
          {data.suggestions.length > 4 ? (
            <Link
              href={`/transportes/${tripId}`}
              className="mt-1 inline-block text-[11px] font-medium text-teal-700 hover:underline"
            >
              + {data.suggestions.length - 4} sugerido(s) — ver todos
            </Link>
          ) : null}
        </>
      )}
    </div>
  );
}
