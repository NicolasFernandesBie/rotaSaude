"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { formatDateTime, formatPhone, formatTime, returnDepartureAt } from "@/lib/format";
import { referralKinds, referralStatus, seatStatus, tripKind, tripStatus, urgency } from "@/lib/status";
import { showToast } from "@/lib/toast";
import type { Suggestion, Trip, TripSuggestions } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorBox,
  PageHeader,
  Spinner,
} from "@/lib/ui";


const reasonStyles: Record<string, string> = {
  same: "bg-teal-100 text-teal-800",
  critical: "bg-rose-100 text-rose-800",
  high: "bg-orange-100 text-orange-800",
  wheelchair: "bg-indigo-100 text-indigo-800",
  dateLate: "bg-slate-200 text-slate-600",
  dateOk: "bg-emerald-100 text-emerald-800",
  other: "bg-slate-100 text-slate-600",
};

function reasonStyle(reason: string): string {
  if (reason.startsWith("Mesmo destino")) return reasonStyles.same;
  if (reason.includes("crítica")) return reasonStyles.critical;
  if (reason.includes("alta")) return reasonStyles.high;
  if (reason.includes("Cadeirante")) return reasonStyles.wheelchair;
  if (reason.includes("depois")) return reasonStyles.dateLate;
  if (reason.includes("até a viagem")) return reasonStyles.dateOk;
  return reasonStyles.other;
}

function firstName(name?: string | null): string {
  return name?.split(" ")[0] || "Paciente";
}

export default function ViagemDetalhePage() {
  const params = useParams<{ id: string }>();
  const { data, error, loading, reload } = useApi<Trip>(`/api/trips/${params.id}`);
  const { data: sugData, loading: sugLoading, reload: reloadSug } = useApi<TripSuggestions>(
    `/api/trips/${params.id}/suggestions`,
  );
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [filling, setFilling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>, mensagem?: string) {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      if (mensagem) showToast({ message: mensagem });
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro na ação");
      reload();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner label="Carregando viagem..." />;
  if (error) return <ErrorBox message={error} />;
  if (!data) return null;

  const trip = data;
  const seats = trip.seats || [];
  const used = seats.length;
  const free = trip.capacity - used;

  async function changeStatus(status: string) {
    await run(
      () => api(`/api/trips/${trip.id}/status`, { method: "POST", body: { status } }),
      status === "EM_ROTA"
        ? "Viagem iniciada. Passageiros avisados."
        : "Viagem concluída. Comparecimentos registrados.",
    );
  }

  async function markSeat(seatId: string, status: string) {
    await run(
      () => api(`/api/trips/${trip.id}/seats/${seatId}`, { method: "PATCH", body: { status } }),
      status === "FALTOU" ? "Falta registrada." : "Presença confirmada.",
    );
  }

  async function addSuggestion(suggestion: Suggestion) {
    setAdding(suggestion.id);
    try {
      await api(`/api/referrals/${suggestion.id}/assign`, {
        method: "POST",
        body: { tripId: trip.id },
      });
      showToast({
        message: `${firstName(suggestion.patient?.name)} entrou na viagem. Aviso enviado.`,
      });
      await Promise.all([reload(), reloadSug()]);
    } catch (err) {
      showToast({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao adicionar passageiro",
      });
    } finally {
      setAdding(null);
    }
  }

  async function fillAll() {
    const suggestions = sugData?.suggestions.filter((s) => s.sameCity) || [];
    const vagas = Math.min(sugData?.freeSeats || 0, suggestions.length);
    if (vagas === 0) return;
    if (
      !window.confirm(
        `Adicionar ${vagas} paciente(s) sugerido(s) por prioridade e avisar cada um?`,
      )
    )
      return;
    setFilling(true);
    try {
      const result = await api<{ assigned: unknown[] }>(`/api/trips/${trip.id}/auto-fill`, {
        method: "POST",
        body: {},
      });
      showToast({
        message: `${result.assigned.length} paciente(s) adicionados à viagem. Avisos enviados.`,
      });
      await Promise.all([reload(), reloadSug()]);
    } catch (err) {
      showToast({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao preencher vagas",
      });
    } finally {
      setFilling(false);
    }
  }

  async function removeSeat(referralId: string) {
    await run(
      () => api(`/api/referrals/${referralId}/unassign`, { method: "POST", body: {} }),
      "Passageiro removido. A vaga foi liberada e o aviso enviado.",
    );
  }

  return (
    <div>
      <PageHeader
        title={`${trip.originCity} → ${trip.destinationCity}`}
        subtitle={formatDateTime(trip.departureAt)}
        actions={
          <>
            <Badge className={tripKind[trip.tripKind]?.badge}>
              {tripKind[trip.tripKind]?.label}
            </Badge>
            <Badge className={tripStatus[trip.status]?.badge}>{tripStatus[trip.status]?.label}</Badge>
            {trip.status === "PLANEJADA" ? (
              <Button
                disabled={busy || used === 0}
                onClick={() => {
                  if (
                    window.confirm(
                      `Iniciar a viagem com ${used} passageiro(s)? O status mudará para "Em viagem".`,
                    )
                  ) {
                    void changeStatus("EM_ROTA");
                  }
                }}
              >
                Iniciar viagem
              </Button>
            ) : null}
            {trip.status === "EM_ROTA" ? (
              <Button
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "Concluir a viagem? Passageiros marcados como presente serão atendidos e os demais registrados como falta.",
                    )
                  ) {
                    void changeStatus("CONCLUIDA");
                  }
                }}
              >
                Concluir viagem
              </Button>
            ) : null}
          </>
        }
      />

      {actionError ? (
        <div className="mb-4">
          <ErrorBox message={actionError} />
        </div>
      ) : null}

      {trip.status === "PLANEJADA" ? (
        <Card className="mb-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Sugestões para esta viagem
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Ordenadas por prioridade, tempo de espera e destino
                {trip.destinationCity ? ` (${trip.destinationCity})` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={
                  sugData && sugData.freeSeats > 0
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-200 text-slate-600"
                }
              >
                {sugData?.freeSeats ?? free} vaga(s) livre(s)
              </Badge>
              {sugData && sugData.freeSeats > 0 && sugData.suggestions.some((s) => s.sameCity) ? (
                <Button size="sm" disabled={filling || adding !== null} onClick={() => void fillAll()}>
                  {filling ? "Preenchendo..." : "Preencher vagas"}
                </Button>
              ) : null}
            </div>
          </div>

          {sugLoading ? (
            <Spinner label="Buscando sugestões..." />
          ) : !sugData || sugData.freeSeats === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
              Viagem cheia — remova alguém ou aumente a capacidade para encaixar mais pacientes.
            </div>
          ) : sugData.suggestions.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
              Ninguém na fila para {trip.destinationCity}.{" "}
              <Link href="/novo" className="font-medium text-teal-700 hover:underline">
                Cadastrar novo atendimento
              </Link>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {sugData.suggestions.map((s, index) => {
                const espera = Math.max(
                  0,
                  Math.floor((Date.now() - new Date(s.queueSince).getTime()) / 86_400_000),
                );
                return (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="w-5 shrink-0 text-center text-sm font-bold text-slate-400">
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
                        {s.reasons.map((reason) => (
                          <Badge key={reason} className={reasonStyle(reason)}>
                            {reason}
                          </Badge>
                        ))}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {referralKinds[s.kind]}
                        {s.specialty ? ` de ${s.specialty}` : ""} · esperando há {espera} dia(s) ·
                        prioridade {s.priority} pts
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={adding !== null || filling}
                      onClick={() => void addSuggestion(s)}
                    >
                      {adding === s.id ? "Adicionando..." : "Adicionar"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="min-w-0 p-5 lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Dados da viagem
          </h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs text-slate-400">Saída</dt>
              <dd className="font-medium text-slate-800">{formatDateTime(trip.departureAt)}</dd>
            </div>
            {trip.tripKind === "VOLTA" && trip.parentTripId ? (
              <div>
                <dt className="text-xs text-slate-400">Viagem de ida</dt>
                <dd>
                  <Link
                    href={`/transportes/${trip.parentTripId}`}
                    className="font-medium text-teal-700 hover:underline"
                  >
                    Ver ida correspondente
                  </Link>
                </dd>
              </div>
            ) : null}
            {trip.tripKind === "IDA" ? (
              <div>
                <dt className="text-xs text-slate-400">Volta agendada</dt>
                <dd className="text-slate-600">
                  Mesma van retorna às {formatTime(returnDepartureAt(trip.departureAt))}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs text-slate-400">Veículo</dt>
              <dd className="font-medium text-slate-800">{trip.vehicle}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Motorista</dt>
              <dd className="font-medium text-slate-800">{trip.driver}</dd>
              {trip.phone ? <dd className="text-slate-500">{formatPhone(trip.phone)}</dd> : null}
            </div>
            {trip.notes ? (
              <div>
                <dt className="text-xs text-slate-400">Observações</dt>
                <dd className="text-slate-700">{trip.notes}</dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Ocupação</span>
              <span className="font-semibold text-slate-700">
                {used}/{trip.capacity} ({free} livres)
              </span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-teal-600"
                style={{ width: `${Math.min(100, (used / trip.capacity) * 100)}%` }}
              />
            </div>
          </div>
        </Card>

        <Card className="min-w-0 p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Passageiros ({used})
            </h2>
            {trip.status === "EM_ROTA" ? (
              <span className="text-xs text-slate-500">
                Marque a presença de cada passageiro ao embarcar
              </span>
            ) : null}
          </div>

          {seats.length === 0 ? (
            <Empty
              title="Nenhum passageiro nesta viagem"
              hint="Aloque vagas a partir da fila de encaminhamentos."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-2 py-2 font-semibold">Nº</th>
                    <th className="px-2 py-2 font-semibold">Paciente</th>
                    <th className="px-2 py-2 font-semibold">Encaminhamento</th>
                    <th className="px-2 py-2 font-semibold">Situação</th>
                    <th className="px-2 py-2 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {seats
                    .slice()
                    .sort((a, b) => a.number - b.number)
                    .map((seat) => {
                      const ref = seat.referral;
                      return (
                        <tr key={seat.id} className="hover:bg-slate-50">
                          <td className="px-2 py-3 tabular-nums text-slate-500">{seat.number}</td>
                          <td className="px-2 py-3">
                            <Link
                              href={`/pacientes/${ref?.patientId}`}
                              className="font-medium text-slate-900 hover:text-teal-700"
                            >
                              {ref?.patient?.name}
                            </Link>
                            <p className="text-xs text-slate-400">{ref?.patient?.healthPost}</p>
                          </td>
                          <td className="px-2 py-3 text-slate-700">
                            {ref ? referralKinds[ref.kind] : "—"}
                            {ref?.specialty ? (
                              <span className="text-slate-500"> · {ref.specialty}</span>
                            ) : null}
                            {ref ? (
                              <span className="mt-0.5 flex items-center gap-1.5">
                                <Badge className={urgency[ref.urgency]?.badge}>
                                  {urgency[ref.urgency]?.label}
                                </Badge>
                                <Link
                                  href={`/encaminhamentos/${ref.id}`}
                                  className="text-[11px] text-teal-700 hover:underline"
                                >
                                  abrir
                                </Link>
                              </span>
                            ) : null}
                          </td>
                          <td className="px-2 py-3">
                            <Badge className={seatStatus[seat.status]?.badge}>
                              {seatStatus[seat.status]?.label}
                            </Badge>
                            {ref ? (
                              <p className="mt-1 text-[11px] text-slate-400">
                                {referralStatus[ref.status]?.label}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-2 py-3">
                            <div className="flex justify-end gap-1.5">
                              {trip.status === "EM_ROTA" ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant={seat.status === "PRESENTE" ? "primary" : "secondary"}
                                    disabled={busy}
                                    onClick={() => markSeat(seat.id, "PRESENTE")}
                                  >
                                    Presente
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={seat.status === "FALTOU" ? "danger" : "secondary"}
                                    disabled={busy}
                                    onClick={() => markSeat(seat.id, "FALTOU")}
                                  >
                                    Faltou
                                  </Button>
                                </>
                              ) : null}
                              {trip.status === "PLANEJADA" && ref ? (
                                <Button
                                  size="sm"
                                  variant="danger"
                                  disabled={busy}
                                  onClick={() => {
                                    if (window.confirm("Remover este passageiro da viagem?")) {
                                      void removeSeat(ref.id);
                                    }
                                  }}
                                >
                                  Remover
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
