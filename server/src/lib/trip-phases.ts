export const TRIP_PHASES = [
  "IDA_AGENDADA",
  "IDA_EM_ROTA",
  "IDA_CONCLUIDA",
  "VOLTA_EM_ROTA",
  "CONCLUIDA",
] as const;

export type TripPhase = (typeof TRIP_PHASES)[number];

export const PHASE_META: Record<
  string,
  { label: string; badge: string; leg: "IDA" | "VOLTA"; done: boolean }
> = {
  IDA_AGENDADA: { label: "Ida agendada", badge: "bg-amber-100 text-amber-800", leg: "IDA", done: false },
  IDA_EM_ROTA: { label: "Ida em rota", badge: "bg-indigo-100 text-indigo-800", leg: "IDA", done: false },
  IDA_CONCLUIDA: { label: "Ida concluída · aguardando volta", badge: "bg-sky-100 text-sky-800", leg: "IDA", done: true },
  VOLTA_EM_ROTA: { label: "Volta em rota", badge: "bg-violet-100 text-violet-800", leg: "VOLTA", done: false },
  CONCLUIDA: { label: "Concluída", badge: "bg-emerald-100 text-emerald-800", leg: "VOLTA", done: true },
};

export function legOf(phase: string): "IDA" | "VOLTA" {
  return PHASE_META[phase]?.leg ?? "IDA";
}

export function isFinalPhase(phase: string): boolean {
  return phase === "CONCLUIDA";
}

export function nextPhase(phase: string): TripPhase | null {
  const idx = TRIP_PHASES.indexOf(phase as TripPhase);
  if (idx < 0 || idx >= TRIP_PHASES.length - 1) return null;
  return TRIP_PHASES[idx + 1];
}

export function displayLegCities(
  trip: { originCity: string; destinationCity: string; phase: string },
): { from: string; to: string } {
  if (legOf(trip.phase) === "VOLTA") {
    return { from: trip.destinationCity, to: trip.originCity };
  }
  return { from: trip.originCity, to: trip.destinationCity };
}
