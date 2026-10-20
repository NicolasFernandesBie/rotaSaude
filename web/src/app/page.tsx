"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { darVaga } from "@/lib/actions";
import { api } from "@/lib/api";
import { daysSince, formatDate, formatTime } from "@/lib/format";
import { notificationStatus, referralKinds, tripKind, tripStatus, urgency } from "@/lib/status";
import { showToast } from "@/lib/toast";
import type { Dashboard, Referral, Suggestion, TripSuggestions } from "@/lib/types";
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

const HELP_KEY = "rota-saude-ajuda-v1";

const passos = [
  "Cadastre quem precisa",
  "A fila ordena por prioridade",
  "Dê vaga na próxima viagem",
  "O paciente recebe no WhatsApp",
];

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}

function departureLabel(departureAt: string, status: string, now: number | null) {
  if (status === "EM_ROTA") return "Em andamento";
  if (!now) return "Saída programada";
  const diff = new Date(departureAt).getTime() - now;
  if (diff <= 0) return "Horário de saída passou";
  const minutes = Math.round(diff / 60_000);
  if (minutes < 60) return `Sai em ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return `Sai em ${hours}h${rest ? ` ${rest}min` : ""}`;
  }
  const days = Math.floor(hours / 24);
  return `Sai em ${days} dia${days > 1 ? "s" : ""}`;
}

function BusIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 17V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11M4 13h16M7 17v2m10-2v2" />
      <circle cx="8" cy="15" r="0.8" fill="currentColor" />
      <circle cx="16" cy="15" r="0.8" fill="currentColor" />
    </svg>
  );
}

function Stat({
  label,
  value,
  hint,
  accent = "text-slate-900",
  tone = "bg-slate-50",
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
  tone?: string;
  href?: string;
}) {
  const content = (
    <div className={`h-full rounded-lg p-3 ${tone}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 text-2xl font-semibold tabular-nums ${accent}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );

  if (!href) return content;
  return (
    <Link href={href} className="block rounded-lg transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
      {content}
    </Link>
  );
}

export default function AgoraPage() {
  const { data, error, loading, reload } = useApi<Dashboard>("/api/dashboard");
  const upcoming = data?.upcomingTrips ?? [];
  const [tripIndex, setTripIndex] = useState(0);
  const clampedIndex = upcoming.length ? Math.min(tripIndex, upcoming.length - 1) : 0;
  const trip = upcoming[clampedIndex] ?? null;
  const tripId = trip?.id;
  const {
    data: sugData,
    loading: sugLoading,
    reload: reloadSug,
  } = useApi<TripSuggestions>(tripId ? `/api/trips/${tripId}/suggestions` : null);
  const [mostrarAjuda, setMostrarAjuda] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tripBusy, setTripBusy] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [filling, setFilling] = useState(false);
  const now = useNow();

  useEffect(() => {
    setMostrarAjuda(localStorage.getItem(HELP_KEY) !== "ok");
  }, []);

  function fecharAjuda() {
    localStorage.setItem(HELP_KEY, "ok");
    setMostrarAjuda(false);
  }

  function irParaViagem(delta: number) {
    setTripIndex((i) => Math.max(0, Math.min(upcoming.length - 1, i + delta)));
  }

  async function reservarVaga(referral: Referral) {
    setBusyId(referral.id);
    try {
      await darVaga(referral);
      reload();
    } finally {
      setBusyId(null);
    }
  }

  async function iniciarViagem(tripId: string, passageiros: number) {
    if (
      !window.confirm(
        `Iniciar a viagem com ${passageiros} passageiro(s)? Depois marque quem embarcou.`,
      )
    )
      return;
    setTripBusy(true);
    try {
      await api(`/api/trips/${tripId}/status`, { method: "POST", body: { status: "EM_ROTA" } });
      showToast({ message: "Viagem iniciada. Marque a presença dos passageiros." });
      reload();
    } catch (err) {
      showToast({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao iniciar viagem",
      });
    } finally {
      setTripBusy(false);
    }
  }

  async function adicionarSugerido(s: Suggestion) {
    if (!tripId) return;
    setAddingId(s.id);
    try {
      await api(`/api/referrals/${s.id}/assign`, {
        method: "POST",
        body: { tripId },
      });
      showToast({
        message: `${s.patient?.name.split(" ")[0] || "Paciente"} entrou na viagem. Aviso enviado.`,
      });
      await Promise.all([reload(), reloadSug()]);
    } catch (err) {
      showToast({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao adicionar passageiro",
      });
    } finally {
      setAddingId(null);
    }
  }

  async function preencherProximaViagem() {
    if (!tripId) return;
    const vagas = Math.min(sugData?.freeSeats || 0, sugData?.suggestions.length || 0);
    if (vagas === 0) return;
    if (
      !window.confirm(
        `Adicionar ${vagas} paciente(s) sugerido(s) por prioridade e avisar cada um?`,
      )
    )
      return;
    setFilling(true);
    try {
      const result = await api<{ assigned: unknown[] }>(`/api/trips/${tripId}/auto-fill`, {
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

  if (loading) return <Spinner label="Carregando..." />;
  if (error) return <ErrorBox message={error} />;
  if (!data) return null;

  const fila = data.queue;
  const freeSeats = trip ? Math.max(0, trip.capacity - trip.seats.length) : 0;
  const ocupacao = trip ? Math.min(100, Math.round((trip.seats.length / trip.capacity) * 100)) : 0;
  const primeiraCidade = fila[0]?.destinationCity;
  const criarViagemHref = primeiraCidade
    ? `/transportes/novo?city=${encodeURIComponent(primeiraCidade)}`
    : "/transportes/novo";
  const faltasTotal = data.absenteism.atendidos30 + data.absenteism.faltas30;

  return (
    <div>
      <PageHeader
        title="Agora"
        subtitle="O que precisa da sua atenção hoje"
        actions={
          <Link href="/novo">
            <Button>+ Novo atendimento</Button>
          </Link>
        }
      />

      {mostrarAjuda ? (
        <div className="mb-4 flex flex-col gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
          <p className="text-sm font-semibold text-teal-900">Como funciona</p>
          <ol className="flex flex-1 flex-wrap gap-x-4 gap-y-1 text-xs text-teal-800">
            {passos.map((texto, i) => (
              <li key={texto} className="flex items-center gap-1.5">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                {texto}
              </li>
            ))}
          </ol>
          <button
            onClick={fecharAjuda}
            className="self-start text-xs font-medium text-teal-700 hover:underline sm:self-auto"
          >
            Ocultar
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                <BusIcon className="h-4 w-4" />
              </span>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Próxima viagem
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {trip ? (
                <>
                  <Badge className={tripKind[trip.tripKind]?.badge}>
                    {tripKind[trip.tripKind]?.label}
                  </Badge>
                  <Badge className={tripStatus[trip.status]?.badge}>
                    {tripStatus[trip.status]?.label}
                  </Badge>
                </>
              ) : null}
              {upcoming.length > 1 ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => irParaViagem(-1)}
                    disabled={clampedIndex === 0}
                    aria-label="Viagem anterior"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M12.78 4.22a.75.75 0 0 1 0 1.06L9.06 9l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <span className="text-xs font-medium tabular-nums text-slate-500">
                    {clampedIndex + 1} de {upcoming.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => irParaViagem(1)}
                    disabled={clampedIndex === upcoming.length - 1}
                    aria-label="Próxima viagem"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M7.22 4.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L10.94 9 7.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {trip ? (
            <div className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {formatDate(trip.departureAt)} · saída às {formatTime(trip.departureAt)}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                    <span>{trip.originCity}</span>
                    <span aria-hidden className="text-teal-600">
                      →
                    </span>
                    <span>{trip.destinationCity}</span>
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {trip.vehicle} · {trip.driver}
                  </p>
                </div>
                <div className="rounded-xl bg-teal-50 px-4 py-2.5 text-right">
                  <p className="text-sm font-semibold text-teal-900">
                    {departureLabel(trip.departureAt, trip.status, now)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-teal-700">
                    {trip.seats.length} de {trip.capacity} assentos
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full ${freeSeats === 0 ? "bg-slate-400" : "bg-teal-600"}`}
                    style={{ width: `${ocupacao}%` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{trip.seats.length} passageiro(s) confirmado(s)</span>
                  <span className={freeSeats === 0 ? "font-medium text-slate-600" : "font-medium text-teal-700"}>
                    {freeSeats === 0 ? "Lotada" : `${freeSeats} vaga(s) livre(s)`}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/transportes/${trip.id}`}>
                  <Button variant={trip.status === "PLANEJADA" ? "secondary" : "primary"}>
                    {trip.status === "EM_ROTA" ? "Ver passageiros e concluir" : "Ver passageiros"}
                  </Button>
                </Link>
                {trip.status === "PLANEJADA" && trip.seats.length > 0 ? (
                  <Button disabled={tripBusy} onClick={() => iniciarViagem(trip.id, trip.seats.length)}>
                    Iniciar viagem
                  </Button>
                ) : null}
              </div>

              {trip.status === "PLANEJADA" ? (
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Sugeridos para esta viagem
                    </p>
                    <div className="flex items-center gap-2">
                      {sugData && sugData.freeSeats > 0 && sugData.suggestions.length > 0 ? (
                        <Button
                          size="sm"
                          disabled={filling || addingId !== null}
                          onClick={() => void preencherProximaViagem()}
                        >
                          {filling ? "Preenchendo..." : "Preencher vagas"}
                        </Button>
                      ) : null}
                      <Link
                        href={`/transportes/${trip.id}`}
                        className="text-xs font-medium text-teal-700 hover:underline"
                      >
                        Ver na viagem
                      </Link>
                    </div>
                  </div>

                  {sugLoading || !sugData ? (
                    <p className="mt-2 text-xs text-slate-400">Buscando sugestões...</p>
                  ) : sugData.freeSeats === 0 ? (
                    <p className="mt-2 text-xs text-slate-500">Viagem cheia.</p>
                  ) : sugData.suggestions.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Ninguém na fila para {trip.destinationCity}.{" "}
                      <Link href="/novo" className="font-medium text-teal-700 hover:underline">
                        Cadastrar novo atendimento
                      </Link>
                    </p>
                  ) : (
                    <ul className="mt-1 divide-y divide-slate-100">
                      {sugData.suggestions.slice(0, 4).map((s, index) => (
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
                              <Badge className={urgency[s.urgency]?.badge}>
                                {urgency[s.urgency]?.label}
                              </Badge>
                              {s.patient?.mobility === "CADEIRANTE" ? (
                                <Badge className="bg-indigo-100 text-indigo-800">Cadeirante</Badge>
                              ) : null}
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {referralKinds[s.kind]}
                              {s.specialty ? ` de ${s.specialty}` : ""} · esperando há{" "}
                              {daysSince(s.queueSince)} dia(s) · {s.priority} pts
                            </p>
                          </div>
                          <Button
                            size="sm"
                            disabled={addingId !== null || filling}
                            onClick={() => void adicionarSugerido(s)}
                          >
                            {addingId === s.id ? "Adicionando..." : "Adicionar"}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {sugData && sugData.suggestions.length > 4 ? (
                    <Link
                      href={`/transportes/${trip.id}`}
                      className="mt-1 inline-block text-[11px] font-medium text-teal-700 hover:underline"
                    >
                      + {sugData.suggestions.length - 4} sugerido(s) — ver todos
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="p-5">
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-teal-700 shadow-sm">
                  <BusIcon className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-medium text-slate-700">Nenhuma viagem planejada</p>
                <p className="mt-1 text-xs text-slate-500">
                  Crie a próxima viagem para começar a encaixar quem está na fila.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Link href={criarViagemHref}>
                    <Button>Criar viagem</Button>
                  </Link>
                  <Link href="/novo">
                    <Button variant="secondary">Novo atendimento</Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </Card>

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
            <Stat
              label="Viagens hoje"
              value={data.tripsToday}
              tone="bg-slate-50"
              href="/transportes"
            />
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
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Fila de espera ({fila.length})
            </h2>
            <Link href="/encaminhamentos" className="text-xs font-medium text-teal-700 hover:underline">
              Ver fila completa
            </Link>
          </div>
          {fila.length === 0 ? (
            <div className="p-5">
              <Empty title="Ninguém na fila" hint="Cadastre um atendimento para montar a próxima viagem.">
                <Link href="/novo">
                  <Button size="sm">+ Novo atendimento</Button>
                </Link>
              </Empty>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {fila.slice(0, 6).map((r, index) => (
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
                      <Badge className={urgency[r.urgency]?.badge}>
                        {urgency[r.urgency]?.label}
                      </Badge>
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
                    onClick={() => reservarVaga(r)}
                    title={r.seat ? undefined : "Reserva a próxima viagem com vaga para o destino"}
                  >
                    {busyId === r.id ? "Dando vaga..." : "Dar vaga"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Mensagens
            </h2>
            <Link href="/notificacoes" className="text-xs font-medium text-teal-700 hover:underline">
              Ver todas
            </Link>
          </div>
          {data.recentNotifications.length === 0 ? (
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
              {data.recentNotifications.slice(0, 4).map((n) => {
                const dot =
                  n.status === "ENVIADA"
                    ? "bg-emerald-500"
                    : n.status === "FALHA"
                      ? "bg-rose-500"
                      : "bg-amber-400";
                return (
                  <li key={n.id} className="flex items-start gap-2.5 px-5 py-3">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
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
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
