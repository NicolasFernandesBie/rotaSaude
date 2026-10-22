import Link from "next/link";
import { Badge, Button, Card } from "@/components/ui";
import { BusIcon, ChevronIcon } from "@/components/icons";
import { formatDate, formatTime } from "@/lib/format";
import { departureLabel } from "@/features/trips/departure";
import { legCities, tripLeg, tripPhase } from "@/features/trips/phases";
import type { Seat, Trip } from "@/features/trips/types";
import type { Suggestion, TripSuggestions } from "@/features/referrals/types";
import { SuggestionsList } from "./SuggestionsList";

type TripWithSeats = Trip & { seats: Seat[] };

export function TripCarousel({
  trips,
  index,
  now,
  tripBusy,
  sugData,
  sugLoading,
  filling,
  addingId,
  onNavigate,
  onStart,
  onStartReturn,
  onAddSuggestion,
  onFill,
  createTripHref,
}: {
  trips: TripWithSeats[];
  index: number;
  now: number | null;
  tripBusy: boolean;
  sugData: TripSuggestions | null;
  sugLoading: boolean;
  filling: boolean;
  addingId: string | null;
  onNavigate: (delta: number) => void;
  onStart: (tripId: string, passengers: number) => void;
  onStartReturn: (tripId: string) => void;
  onAddSuggestion: (suggestion: Suggestion) => void;
  onFill: () => void;
  createTripHref: string;
}) {
  const trip = trips[index] ?? null;
  const freeSeats = trip ? Math.max(0, trip.capacity - trip.seats.length) : 0;
  const occupancy = trip
    ? Math.min(100, Math.round((trip.seats.length / trip.capacity) * 100))
    : 0;

  return (
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
              <Badge className={tripLeg[legCities(trip).leg]?.badge}>
                {tripLeg[legCities(trip).leg]?.label}
              </Badge>
              <Badge className={tripPhase[trip.phase]?.badge}>
                {tripPhase[trip.phase]?.label}
              </Badge>
            </>
          ) : null}
          {trips.length > 1 ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onNavigate(-1)}
                disabled={index === 0}
                aria-label="Viagem anterior"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronIcon direction="left" />
              </button>
              <span className="text-xs font-medium tabular-nums text-slate-500">
                {index + 1} de {trips.length}
              </span>
              <button
                type="button"
                onClick={() => onNavigate(1)}
                disabled={index === trips.length - 1}
                aria-label="Próxima viagem"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronIcon direction="right" />
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
                <span>{legCities(trip).from}</span>
                <span aria-hidden className="text-teal-600">
                  →
                </span>
                <span>{legCities(trip).to}</span>
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {trip.vehicle} · {trip.driver}
              </p>
            </div>
            <div className="rounded-xl bg-teal-50 px-4 py-2.5 text-right">
              <p className="text-sm font-semibold text-teal-900">
                {departureLabel(trip.departureAt, trip.phase, now)}
              </p>
              {trip.returnAt ? (
                <p className="mt-0.5 text-[11px] text-teal-700">
                  Volta às {formatTime(trip.returnAt)}
                </p>
              ) : null}
              <p className="mt-0.5 text-[11px] text-teal-700">
                {trip.seats.length} de {trip.capacity} assentos
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-2 rounded-full ${freeSeats === 0 ? "bg-slate-400" : "bg-teal-600"}`}
                style={{ width: `${occupancy}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
              <span>{trip.seats.length} passageiro(s) confirmado(s)</span>
              <span
                className={
                  freeSeats === 0 ? "font-medium text-slate-600" : "font-medium text-teal-700"
                }
              >
                {freeSeats === 0 ? "Lotada" : `${freeSeats} vaga(s) livre(s)`}
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/transportes/${trip.id}`}>
              <Button variant={trip.phase === "IDA_AGENDADA" ? "secondary" : "primary"}>
                {trip.phase === "IDA_EM_ROTA" || trip.phase === "VOLTA_EM_ROTA"
                  ? "Marcar presença e concluir"
                  : "Ver passageiros"}
              </Button>
            </Link>
            {trip.phase === "IDA_AGENDADA" && trip.seats.length > 0 ? (
              <Button disabled={tripBusy} onClick={() => onStart(trip.id, trip.seats.length)}>
                Iniciar ida
              </Button>
            ) : null}
            {trip.phase === "IDA_CONCLUIDA" ? (
              <Button disabled={tripBusy} onClick={() => onStartReturn(trip.id)}>
                Iniciar volta
              </Button>
            ) : null}
          </div>

          {trip.phase === "IDA_AGENDADA" ? (
            <SuggestionsList
              tripId={trip.id}
              destinationCity={trip.destinationCity}
              data={sugData}
              loading={sugLoading}
              filling={filling}
              addingId={addingId}
              onAdd={onAddSuggestion}
              onFill={onFill}
            />
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
              <Link href={createTripHref}>
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
  );
}
