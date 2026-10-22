import type { TripLeg } from "./types";

export const tripPhase: Record<
  string,
  { label: string; badge: string; leg: TripLeg }
> = {
  IDA_AGENDADA: { label: "Ida agendada", badge: "bg-amber-100 text-amber-800", leg: "IDA" },
  IDA_EM_ROTA: { label: "Ida em rota", badge: "bg-indigo-100 text-indigo-800", leg: "IDA" },
  IDA_CONCLUIDA: { label: "Aguardando volta", badge: "bg-sky-100 text-sky-800", leg: "IDA" },
  VOLTA_EM_ROTA: { label: "Volta em rota", badge: "bg-violet-100 text-violet-800", leg: "VOLTA" },
  CONCLUIDA: { label: "Concluída", badge: "bg-emerald-100 text-emerald-800", leg: "VOLTA" },
};

export const tripLeg: Record<string, { label: string; badge: string }> = {
  IDA: { label: "Ida", badge: "bg-teal-100 text-teal-800" },
  VOLTA: { label: "Volta", badge: "bg-violet-100 text-violet-800" },
};

export function legOf(phase: string): TripLeg {
  return tripPhase[phase]?.leg ?? "IDA";
}

export function isFinalPhase(phase: string): boolean {
  return phase === "CONCLUIDA";
}

export function legCities<
  T extends { originCity: string; destinationCity: string; phase: string },
>(trip: T): { from: string; to: string; leg: TripLeg } {
  const leg = legOf(trip.phase);
  return leg === "VOLTA"
    ? { from: trip.destinationCity, to: trip.originCity, leg }
    : { from: trip.originCity, to: trip.destinationCity, leg };
}
