import { db } from "../../lib/prisma";
import { priorityScore } from "../../lib/domain";
import { spStartOfDay } from "../notifications/service";

type TripForSuggestions = {
  id: string;
  destinationCity: string;
  departureAt: Date;
  capacity: number;
  seats: { number: number }[];
};

function normalizeCity(city: string): string {
  return city
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export type Suggestion = {
  id: string;
  patientId: string;
  kind: string;
  specialty: string | null;
  destinationCity: string;
  destinationUnit: string;
  urgency: string;
  status: string;
  queueSince: Date;
  preferredDate: Date | null;
  notes: string | null;
  patient: {
    id: string;
    name: string;
    phone: string;
    healthPost: string;
    birthDate: Date | null;
    mobility: string;
  };
  priority: number;
  suggestionScore: number;
  sameCity: boolean;
  reasons: string[];
};

export async function getTripSuggestions(
  trip: TripForSuggestions,
  limit = 12,
): Promise<{ freeSeats: number; suggestions: Suggestion[] }> {
  const freeSeats = Math.max(0, trip.capacity - trip.seats.length);
  if (trip.departureAt < spStartOfDay()) return { freeSeats, suggestions: [] };
  const waiting = await db.referral.findMany({
    where: { status: "AGUARDANDO_VAGA" },
    include: { patient: true },
    orderBy: { queueSince: "asc" },
    take: 300,
  });

  const tripCity = normalizeCity(trip.destinationCity);
  const tripDay = new Date(trip.departureAt);
  tripDay.setHours(23, 59, 59, 999);

  const suggestions: Suggestion[] = waiting
    .filter((r) => normalizeCity(r.destinationCity) === tripCity)
    .map((r) => {
      const priority = priorityScore(r);
      const reasons: string[] = ["Mesmo destino"];

      let bonus = 100;

      if (r.preferredDate) {
        if (new Date(r.preferredDate) <= tripDay) {
          bonus += 8;
          reasons.push("Data desejada até a viagem");
        } else {
          bonus -= 8;
          reasons.push("Data desejada depois da viagem");
        }
      }

      if (r.urgency === "CRITICA") reasons.push("Urgência crítica");
      else if (r.urgency === "ALTA") reasons.push("Urgência alta");
      if (r.patient.mobility === "CADEIRANTE") reasons.push("Cadeirante");

      return {
        ...r,
        priority,
        suggestionScore: priority + bonus,
        sameCity: true,
        reasons,
      };
    });

  suggestions.sort((a, b) => {
    if (b.suggestionScore !== a.suggestionScore) return b.suggestionScore - a.suggestionScore;
    return new Date(a.queueSince).getTime() - new Date(b.queueSince).getTime();
  });

  return { freeSeats, suggestions: suggestions.slice(0, limit) };
}

export async function countSuggestionsByCity(): Promise<Map<string, number>> {
  const waiting = await db.referral.findMany({
    where: { status: "AGUARDANDO_VAGA" },
    select: { destinationCity: true },
  });
  const counts = new Map<string, number>();
  for (const { destinationCity } of waiting) {
    const key = normalizeCity(destinationCity);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

export function suggestionsForTripCity(
  counts: Map<string, number>,
  destinationCity: string,
): number {
  return counts.get(normalizeCity(destinationCity)) || 0;
}
