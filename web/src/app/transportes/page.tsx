"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDateTime, formatTime } from "@/lib/format";
import { legCities, tripPhase } from "@/lib/status";
import type { Trip } from "@/features/trips/types";
import { useApi } from "@/lib/useApi";
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorBox,
  PageHeader,
  Spinner,
} from "@/components/ui";

const filters = [
  { key: "", label: "Todas" },
  { key: "agendada", label: "Agendadas" },
  { key: "ida", label: "Ida em rota" },
  { key: "volta", label: "Volta" },
  { key: "concluida", label: "Concluídas" },
];

function matchFilter(phase: string, filter: string) {
  if (!filter) return true;
  if (filter === "agendada") return phase === "IDA_AGENDADA";
  if (filter === "ida") return phase === "IDA_EM_ROTA" || phase === "IDA_CONCLUIDA";
  if (filter === "volta") return phase === "VOLTA_EM_ROTA";
  if (filter === "concluida") return phase === "CONCLUIDA";
  return true;
}

export default function TransportesPage() {
  const [status, setStatus] = useState("");
  const { data, error, loading } = useApi<Trip[]>(`/api/trips`);

  const trips = data || [];
  const now = Date.now();
  const ordered = [...trips]
    .filter((t) => matchFilter(t.phase, status))
    .sort((a, b) => {
      const aPast = new Date(a.departureAt).getTime() < now ? 1 : 0;
      const bPast = new Date(b.departureAt).getTime() < now ? 1 : 0;
      if (aPast !== bPast) return aPast - bPast;
      return aPast
        ? new Date(b.departureAt).getTime() - new Date(a.departureAt).getTime()
        : new Date(a.departureAt).getTime() - new Date(b.departureAt).getTime();
    });

  return (
    <div>
      <PageHeader
        title="Viagens"
        subtitle="Viagens do transporte sanitário, ocupação e embarque"
        actions={
          <Link href="/transportes/novo">
            <Button>Nova viagem</Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatus(f.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              status === f.key
                ? "bg-teal-700 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message={error} />
      ) : ordered.length === 0 ? (
        <Empty title="Nenhuma viagem encontrada" hint="Crie uma viagem para começar a dar vagas." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {ordered.map((t) => {
            const used = t.usedSeats ?? t.seats?.length ?? 0;
            const free = t.freeSeats ?? t.capacity - used;
            const past = new Date(t.departureAt).getTime() < now;
            return (
              <Link key={t.id} href={`/transportes/${t.id}`}>
                <Card className="h-full p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">
                        {legCities(t).from} → {legCities(t).to}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-600">
                        {formatDateTime(t.departureAt)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge className={tripPhase[t.phase]?.badge}>
                        {tripPhase[t.phase]?.label}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-500">
                    {t.vehicle} · {t.driver}
                  </p>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {used} de {t.capacity} vagas ocupadas
                      </span>
                      <span className="font-semibold text-slate-700">{free} livres</span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-slate-100">
                      <div
                        className={`h-2 rounded-full ${past && t.phase === "IDA_AGENDADA" ? "bg-rose-400" : "bg-teal-600"}`}
                        style={{ width: `${Math.min(100, (used / t.capacity) * 100)}%` }}
                      />
                    </div>
                  </div>
                  {t.suggestedCount ? (
                    <div className="mt-3">
                      <Badge className="bg-amber-100 text-amber-800">
                        {t.suggestedCount} paciente(s) na fila para este destino
                      </Badge>
                    </div>
                  ) : null}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
